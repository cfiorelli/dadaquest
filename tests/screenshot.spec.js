// @ts-check
import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const SCENES = [
  { key: 'CribScene',    file: 'crib'     },
  { key: 'BedroomScene', file: 'bedroom'  },
  { key: 'KitchenScene', file: 'kitchen'  },
  { key: 'StairsScene',  file: 'stairs'   },
  { key: 'RooftopScene', file: 'rooftop'  },
];

test('capture scene screenshots', async ({ page }) => {
  await mkdir('docs/screenshots', { recursive: true });

  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto('http://127.0.0.1:4173/?test=1');

  for (const { key, file } of SCENES) {
    await page.waitForFunction(
      (k) => window.__DADA_DEBUG__?.sceneKey === k,
      key,
      { timeout: 20_000 }
    );
    // Let the scene render one full tick
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `docs/screenshots/${file}.png`,
      clip: { x: 0, y: 0, width: 800, height: 500 },
    });
  }
});
