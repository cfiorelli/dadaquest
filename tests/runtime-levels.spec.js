// @ts-check
import { test, expect } from '@playwright/test';

const LEVEL_CASES = [
  { id: 1, url: 'http://127.0.0.1:4173/?debug=1' },
  { id: 2, url: 'http://127.0.0.1:4173/?level=2&debug=1' },
  { id: 3, url: 'http://127.0.0.1:4173/?level=3&debug=1' },
];

for (const levelCase of LEVEL_CASES) {
  test(`runtime: level ${levelCase.id} starts and can finish without uncaught exceptions`, async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(levelCase.url);
    await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 15_000 });

    await page.evaluate(() => {
      window.__DADA_DEBUG__?.startLevel?.();
    });

    await expect.poll(
      () => page.evaluate(() => ({
        sceneKey: window.__DADA_DEBUG__?.sceneKey,
        lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError || null,
      })),
      { timeout: 90_000 },
    ).toEqual({
      sceneKey: 'CribScene',
      lastRuntimeError: null,
    });

    if (levelCase.id === 3) {
      await page.evaluate(() => {
        window.__DADA_DEBUG__.restartRun();
      });
      await expect.poll(
        () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
        { timeout: 5_000 },
      ).toBe('TitleScene');

      await page.evaluate(() => {
        window.__DADA_DEBUG__.startLevel();
      });
      await expect.poll(
        () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
        { timeout: 10_000 },
      ).toBe('CribScene');
    }

    await page.evaluate(() => {
      window.__DADA_DEBUG__.teleportToGoal();
    });

    await expect.poll(
      () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
      { timeout: 10_000 },
    ).toBe('EndScene');

    if (pageErrors.length > 0) {
      throw new Error(`Page errors on level ${levelCase.id}: ${pageErrors.join('\n')}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors on level ${levelCase.id}: ${consoleErrors.join('\n')}`);
    }
  });
}

test('runtime: level 2 horse push keeps player near the lane', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('http://127.0.0.1:4173/?level=2&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 15_000 });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.();
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 60_000 });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-4.8, 1.25, 0.3);
  });
  await page.waitForTimeout(1800);

  const z = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.z ?? null);
  expect(z).not.toBeNull();
  expect(Math.abs(z)).toBeLessThanOrEqual(0.08);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 5_000 })
    .toBe('CribScene');
});

test('runtime: gameplay keybinds R reset to checkpoint and F triggers backflip', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('http://127.0.0.1:4173/?level=2&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.();
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 60_000 });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(6.5, 1.25, 0);
  });
  await page.waitForTimeout(150);

  const backflipBeforeCount = await page.evaluate(() => window.__DADA_DEBUG__?.backflip?.count ?? 0);
  const backflipTriggered = await page.evaluate(() => {
    const started = window.__DADA_DEBUG__?.gameplayHotkey?.('KeyF') ?? false;
    return {
      started,
      backflip: window.__DADA_DEBUG__?.backflip ?? null,
    };
  });
  expect(backflipTriggered.started).toBe(true);
  expect(backflipTriggered.backflip).not.toBeNull();
  expect(backflipTriggered.backflip.cooldownMs).toBeGreaterThan(0);
  expect(backflipTriggered.backflip.count).toBeGreaterThan(backflipBeforeCount);

  const beforeResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  const resetTriggered = await page.evaluate(() => window.__DADA_DEBUG__?.gameplayHotkey?.('KeyR') ?? false);
  expect(resetTriggered).toBe(true);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.lastRespawnReason), { timeout: 3_000 })
    .toBe('manual_reset');
  await page.waitForTimeout(900);
  const afterResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  expect(beforeResetX).not.toBeNull();
  expect(afterResetX).not.toBeNull();
  expect(Math.abs(afterResetX - beforeResetX)).toBeGreaterThan(4);
});
