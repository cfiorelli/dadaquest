// @ts-check
import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const SHOT_SCENES = [
  { scene: 'title', key: 'TitleScene', file: 'title' },
  { scene: 'crib', key: 'CribScene', file: 'crib' },
  { scene: 'end', key: 'EndScene', file: 'end' },
];

test('capture scene screenshots', async ({ page }) => {
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 800, height: 500 });

  for (const { scene, key, file } of SHOT_SCENES) {
    await page.goto(`http://127.0.0.1:4173/?shot=1&scene=${scene}`);
    await page.waitForFunction(
      (k) => window.__DADA_DEBUG__?.sceneKey === k,
      key,
      { timeout: 10_000 }
    );
    await page.waitForFunction(
      () => window.__DADA_DEBUG__?.shotReady === true,
      { timeout: 15_000 }
    );
    await page.waitForFunction(
      () => (window.__DADA_DEBUG__?.shotFrames ?? 0) >= 10,
      { timeout: 5_000 }
    );
    await page.screenshot({
      path: `docs/screenshots/${file}.png`,
      clip: { x: 0, y: 0, width: 800, height: 500 },
    });
  }
});
