// @ts-check
import { test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const SHOT_SCENES = [
  { scene: 'title', key: 'TitleScene', file: 'title' },
  { scene: 'crib', key: 'CribScene', file: 'crib' },
  { scene: 'end', key: 'EndScene', file: 'end' },
];

async function gotoDebugLevel(page, levelId) {
  await page.goto(`http://127.0.0.1:4173/?level=${levelId}&debug=1`);
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
}

async function unlockThroughLevel(page, completedLevel = 5) {
  await page.evaluate((maxLevel) => {
    const levelCompleted = {};
    for (let levelId = 4; levelId <= maxLevel; levelId += 1) {
      levelCompleted[levelId] = true;
    }
    window.__DADA_DEBUG__?.setProgress?.({
      sourdoughUnlocked: true,
      levelCompleted,
    });
  }, completedLevel);
}

async function hideGameplayUi(page, { keepStatus = false } = {}) {
  await page.addStyleTag({
    content: `
      [data-era5-hud], #titleScreen, #titleOverlay, #gameplayHud, #gameplayMenu, #titleMenu,
      #loadingOverlay, #endOverlay, button, [role="button"], [data-title-screen], [data-title-preview],
      [data-title-level-grid], [data-controls-hint], [data-era5-buffs], [data-era5-inventory-hint],
      #era5DevOverlay,
      .dada-toast-layer, .dada-status-banner, .dada-toast {
        display: none !important;
      }
      ${keepStatus ? `
        #gameplayHud, [data-era5-hud], [data-controls-hint], [data-era5-buffs],
        [data-era5-inventory-hint], .dada-era5-reticle, .dada-pop, .dada-fade {
          display: none !important;
        }
      ` : '#uiRoot { display: none !important; }'}
      body { margin: 0; background: #000; }
    `,
  });
}

async function renderTopologySvg(browser, topology, {
  path,
  title,
  subtitle,
}) {
  const topoPage = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const sectors = topology.sectors;
  const connectors = topology.connectors;
  const bounds = sectors.reduce((acc, sector) => ({
    minX: Math.min(acc.minX, sector.x - sector.w * 0.5),
    maxX: Math.max(acc.maxX, sector.x + sector.w * 0.5),
    minZ: Math.min(acc.minZ, sector.z - sector.d * 0.5),
    maxZ: Math.max(acc.maxZ, sector.z + sector.d * 0.5),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  const pad = 70;
  const width = 1400;
  const height = 900;
  const scaleX = (width - (pad * 2)) / Math.max(1, bounds.maxX - bounds.minX);
  const scaleZ = (height - (pad * 2)) / Math.max(1, bounds.maxZ - bounds.minZ);
  const scale = Math.min(scaleX, scaleZ);
  const toX = (x) => pad + ((x - bounds.minX) * scale);
  const toY = (z) => height - pad - ((z - bounds.minZ) * scale);
  const lines = connectors.map((connector) => {
    const source = sectors.find((sector) => sector.id === connector.sourceSector);
    const dest = sectors.find((sector) => sector.id === connector.destinationSector);
    return `<line x1="${toX(source.x)}" y1="${toY(source.z)}" x2="${toX(dest.x)}" y2="${toY(dest.z)}" stroke="#f4aa46" stroke-width="8" stroke-linecap="round" opacity="0.9" />`;
  }).join('');
  const sectorRects = sectors.map((sector) => {
    const x = toX(sector.x - sector.w * 0.5);
    const y = toY(sector.z + sector.d * 0.5);
    const w = sector.w * scale;
    const h = sector.d * scale;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" ry="18" fill="#2f3945" stroke="#d6e3f0" stroke-width="4" />
        <text x="${x + 18}" y="${y + 34}" fill="#f6f7f1" font-family="Arial" font-size="26" font-weight="700">${sector.label}</text>
        <text x="${x + 18}" y="${y + 64}" fill="#8fb4d0" font-family="Arial" font-size="18">${sector.floorSurfaceType}</text>
      </g>`;
  }).join('');
  await topoPage.setContent(`<!doctype html>
    <html>
      <body style="margin:0;background:#10161d;display:flex;align-items:center;justify-content:center;min-height:100vh;">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#10161d" />
          <text x="70" y="66" fill="#f4f6ef" font-family="Arial" font-size="34" font-weight="700">${title}</text>
          <text x="70" y="102" fill="#8fb4d0" font-family="Arial" font-size="20">${subtitle}</text>
          ${lines}
          ${sectorRects}
        </svg>
      </body>
    </html>`);
  await topoPage.screenshot({
    path,
    clip: { x: 0, y: 0, width: 1400, height: 900 },
  });
  await topoPage.close();
}
test('capture scene screenshots', async ({ page }) => {
  test.setTimeout(120_000);
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

test('capture authored Level 6 gameplay and topology proof screenshots', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await gotoDebugLevel(page, 6);
  await unlockThroughLevel(page, 5);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(6);
  });
  await page.waitForFunction(
    () => window.__DADA_DEBUG__?.sceneKey === 'CribScene',
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 40,
      y: 1.64,
      z: -0.8,
      yaw: 1.36,
      cameraYaw: 1.36,
    });
  });
  await page.waitForTimeout(400);
  await hideGameplayUi(page);
  await page.screenshot({
    path: 'docs/screenshots/level6-authored-gameplay.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.());
  await renderTopologySvg(browser, topology, {
    path: 'docs/screenshots/level6-authored-topology.png',
    title: 'Level 6 Authored Topology',
    subtitle: 'Sectors, connectors, and non-linear rejoin path proof',
  });
});

test('capture Level 5 final-pass proof screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await gotoDebugLevel(page, 5);
  await unlockThroughLevel(page, 4);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1800);
  await hideGameplayUi(page);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('closer');
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -58.4,
      y: 1.30,
      z: -0.4,
      yaw: 0.30,
      cameraYaw: 0.30,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-start',
      position: { x: -61.8, y: 2.0, z: -2.2 },
      target: { x: -55.8, y: 1.6, z: -0.4 },
      fov: 0.54,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-start-view.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -49.6,
      y: 1.22,
      z: 0.0,
      yaw: 0.18,
      cameraYaw: 0.18,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-fork',
      position: { x: -52.4, y: 2.1, z: -0.8 },
      target: { x: -44.0, y: 1.6, z: 1.6 },
      fov: 0.58,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-first-fork.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -8.8,
      y: 1.40,
      z: 7.8,
      yaw: 0.42,
      cameraYaw: 0.42,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-chamber',
      position: { x: -9.6, y: 2.2, z: 6.2 },
      target: { x: 5.8, y: 2.6, z: 9.8 },
      fov: 0.50,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-hero-chamber.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -45.2,
      y: 1.18,
      z: 12.2,
      yaw: 0.56,
      cameraYaw: 0.56,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-public',
      position: { x: -48.4, y: 2.0, z: 10.4 },
      target: { x: -42.4, y: 1.8, z: 15.8 },
      fov: 0.50,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-public-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -31.4,
      y: 0.96,
      z: -10.8,
      yaw: 0.06,
      cameraYaw: 0.06,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-service',
      position: { x: -34.4, y: 1.8, z: -10.6 },
      target: { x: -27.2, y: 1.4, z: -10.4 },
      fov: 0.48,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-service-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 21.0,
      y: 0.86,
      z: -18.2,
      yaw: 2.88,
      cameraYaw: 2.88,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-maintenance',
      position: { x: 22.6, y: 1.5, z: -19.8 },
      target: { x: 17.6, y: 0.9, z: -18.2 },
      fov: 0.48,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-maintenance-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -44.8,
      y: 1.16,
      z: 8.8,
      yaw: 0.10,
      cameraYaw: 0.10,
    });
    const forward = window.__DADA_DEBUG__?.playerForward ?? { x: 1, z: 0 };
    window.__DADA_DEBUG__?.placeLevel5DebugJellyfish?.(forward);
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-enemy',
      position: { x: -46.2, y: 1.9, z: 7.2 },
      target: { x: -40.0, y: 1.7, z: 8.8 },
      fov: 0.46,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-enemy-pocket.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 14.8,
      y: 1.12,
      z: -3.2,
      yaw: 0.16,
      cameraYaw: 0.16,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-hazard',
      position: { x: 14.2, y: 1.9, z: -4.4 },
      target: { x: 20.8, y: 1.1, z: -1.2 },
      fov: 0.44,
    });
  });
  await page.waitForFunction(() => {
    const rails = window.__DADA_DEBUG__?.era5LevelState?.eelRails ?? [];
    return rails.some((hazard) => hazard.name === 'eel_spill_gate' && hazard.state === 'active');
  }, { timeout: 8_000 });
  await page.screenshot({
    path: 'docs/screenshots/level5-final-hazard-zone.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 54.6,
      y: 1.56,
      z: 18.8,
      yaw: 0.82,
      cameraYaw: 0.82,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-final-goal',
      position: { x: 54.4, y: 2.0, z: 19.0 },
      target: { x: 59.4, y: 2.0, z: 24.0 },
      fov: 0.46,
    });
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: 'docs/screenshots/level5-final-goal-payoff.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
});
