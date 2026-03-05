// @ts-check
import { test, expect } from '@playwright/test';

test('ui: play again restarts from deterministic end scene', async ({ page }) => {
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
    { timeout: 5_000 }
  ).toBe('TitleScene');

  const endHidden = await page.evaluate(
    () => document.querySelector('.dada-end-bg')?.classList.contains('hidden') === true
  );
  expect(endHidden).toBe(true);
});
