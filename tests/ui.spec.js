// @ts-check
import { test, expect } from '@playwright/test';

const PROGRESS_KEY = 'dadaquest:progress:v1';

async function installCleanStorage(page) {
  await page.addInitScript((progressKey) => {
    try {
      if (!window.sessionStorage.getItem('__pw_storage_reset__')) {
        window.localStorage.removeItem(progressKey);
        window.sessionStorage.clear();
        window.sessionStorage.setItem('__pw_storage_reset__', '1');
      }
    } catch {}
  }, PROGRESS_KEY);
}

async function gotoDebugLevel(page, levelId = 1) {
  const url = levelId === 1
    ? 'http://127.0.0.1:4173/?debug=1'
    : `http://127.0.0.1:4173/?level=${levelId}&debug=1`;
  await page.goto(url);
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
}

async function startDebugLevel(page, levelId) {
  await page.evaluate((targetLevelId) => {
    window.__DADA_DEBUG__?.startLevel?.(targetLevelId);
  }, levelId);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 90_000 })
    .toBe('CribScene');
}

test.beforeEach(async ({ page }) => {
  await installCleanStorage(page);
});

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

  await page.evaluate(() => {
    document.getElementById('playAgainBtn')?.click();
  });

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
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.dada-menu-bg');
    return !!document.getElementById('menuResumeBtn')
      && !!overlay
      && !overlay.classList.contains('hidden');
  }, { timeout: 5_000 });

  await Promise.all([
    page.waitForURL((url) => !url.searchParams.has('level'), { timeout: 30_000 }),
    page.click('#menuLevelBtn1'),
  ]);
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'TitleScene', { timeout: 20_000 });
  await expect(page.locator('#titleSub')).toContainText('Level 1');
});

test('ui: escape menu can restart the current level', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(18, 5.2, 0);
  });
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.toggleGameplayMenu?.();
  });
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.menuVisible === true), { timeout: 10_000 })
    .toBe(true);
  await page.evaluate(() => {
    document.getElementById('menuRestartBtn')?.click();
  });

  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 20_000 })
    .toBe('CribScene');
  const after = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after - before)).toBeGreaterThan(8);
});

test('ui: level 2 floor route cannot trigger the dad goal', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

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

test('ui: buff HUD stays as a compact left column', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const box = await page.locator('.dada-buff').boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeLessThanOrEqual(240);
  expect(box.x).toBeLessThanOrEqual(24);
  expect(box.y).toBeLessThanOrEqual(28);

  await expect(page.locator('.dada-buff-note').last()).toHaveText('Locked. Collect all binkies in Level 1 to unlock');
});
