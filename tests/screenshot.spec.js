// @ts-check
import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const GAMEPLAY_SCENES = [
  { key: 'CribScene',    file: 'crib'     },
  { key: 'BedroomScene', file: 'bedroom'  },
  { key: 'KitchenScene', file: 'kitchen'  },
  { key: 'StairsScene',  file: 'stairs'   },
  { key: 'RooftopScene', file: 'rooftop'  },
  { key: 'EndScene',     file: 'end'      },
];

test('capture scene screenshots', async ({ page }) => {
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 800, height: 500 });

  // --- Title scene: navigate without ?test=1 so it doesn't auto-advance ---
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(
    () => window.__DADA_DEBUG__?.sceneKey === 'TitleScene',
    { timeout: 10_000 }
  );
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'docs/screenshots/title.png',
    clip: { x: 0, y: 0, width: 800, height: 500 },
  });

  // --- Gameplay scenes: test mode auto-advances through them all ---
  await page.goto('http://127.0.0.1:4173/?test=1');

  for (const { key, file } of GAMEPLAY_SCENES) {
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
