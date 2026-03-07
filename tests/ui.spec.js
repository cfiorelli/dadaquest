// @ts-check
import { test, expect } from '@playwright/test';

test('ui: play again restarts from deterministic end scene', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto('http://127.0.0.1:4173/?shot=1&scene=end');

  await page.waitForFunction(
    () => window.__DADA_DEBUG__?.sceneKey === 'EndScene',
    { timeout: 10_000 }
  );
  await page.waitForFunction(() => {
    const end = document.querySelector('.dada-end-bg');
    const btn = document.getElementById('playAgainBtn');
    return !!btn && !!end && !end.classList.contains('hidden');
  }, { timeout: 5_000 });

  await page.click('#playAgainBtn', { force: true });

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 20_000 }
  ).toBe('TitleScene');

  const endHidden = await page.evaluate(
    () => document.querySelector('.dada-end-bg')?.classList.contains('hidden') === true
  );
  expect(endHidden).toBe(true);
});

test('ui: escape menu opens during gameplay and can switch levels', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:4173/?level=2&debug=1');

  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await page.evaluate(() => {
    window.__DADA_DEBUG__.startLevel();
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 60_000 });

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    }));
  });
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.dada-menu-bg');
    return !!document.getElementById('menuResumeBtn')
      && !!overlay
      && !overlay.classList.contains('hidden');
  }, { timeout: 5_000 });

  await Promise.all([
    page.waitForURL((url) => !url.searchParams.has('level'), { timeout: 30_000 }),
    page.evaluate(() => {
      window.__DADA_DEBUG__?.switchMenuLevel?.(1);
    }),
  ]);
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'TitleScene', { timeout: 20_000 });
  await expect(page.locator('#titleSub')).toContainText('Level 1');
});

test('ui: level 2 floor route cannot trigger the dad goal', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:4173/?level=2&debug=1');

  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await page.evaluate(() => {
    window.__DADA_DEBUG__.startLevel();
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 60_000 });

  await page.evaluate(() => {
    const floorTop = window.__DADA_DEBUG__?.floorTopY ?? 0;
    window.__DADA_DEBUG__?.teleportPlayer?.(37.5, floorTop + 0.405, 0);
  });
  await page.waitForTimeout(1200);

  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 15_000 })
    .toBe('CribScene');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportToGoal?.();
  });
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 20_000 })
    .toBe('EndScene');
});
