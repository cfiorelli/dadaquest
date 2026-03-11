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

test('capture Level 5 rebuild proof screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  await gotoDebugLevel(page, 5);
  await unlockThroughLevel(page, 4);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(
    () => window.__DADA_DEBUG__?.sceneKey === 'CribScene',
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1800);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('standard');
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -39.2,
      y: 1.92,
      z: 6.8,
      yaw: 0.48,
      cameraYaw: 0.48,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-start-review',
      position: { x: -52.0, y: 9.4, z: -6.0 },
      target: { x: -30.0, y: 2.4, z: 8.2 },
      fov: 0.80,
    });
  });
  await page.waitForTimeout(500);
  await hideGameplayUi(page);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-start-view.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('standard');
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 10.8,
      y: 2.18,
      z: 14.0,
      yaw: 0.72,
      cameraYaw: 0.72,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-hero-review',
      position: { x: -4.0, y: 10.2, z: -1.0 },
      target: { x: 9.8, y: 2.8, z: 18.8 },
      fov: 0.82,
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-hero-chamber.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('standard');
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -12.2,
      y: 1.86,
      z: 20.8,
      yaw: 0.74,
      cameraYaw: 0.74,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-public-review',
      position: { x: -28.0, y: 7.2, z: 28.0 },
      target: { x: -6.0, y: 2.4, z: 18.0 },
      fov: 0.80,
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-public-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -16.2,
      y: 1.42,
      z: -9.6,
      yaw: 1.48,
      cameraYaw: 1.48,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-service-review',
      position: { x: -30.0, y: 6.4, z: -18.0 },
      target: { x: -12.0, y: 1.6, z: -9.0 },
      fov: 0.82,
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-service-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 17.6,
      y: 1.18,
      z: -11.0,
      yaw: 1.20,
      cameraYaw: 1.20,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-maintenance-review',
      position: { x: 4.0, y: 5.6, z: -19.0 },
      target: { x: 24.0, y: 1.4, z: -8.0 },
      fov: 0.84,
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-maintenance-route.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 48.0,
      y: 2.06,
      z: 2.2,
      yaw: 0.76,
      cameraYaw: 0.76,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'level5-goal-review',
      position: { x: 34.0, y: 7.2, z: -8.0 },
      target: { x: 54.6, y: 2.8, z: 3.0 },
      fov: 0.82,
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'docs/screenshots/level5-rebuild-goal-approach.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.reload();
  await gotoDebugLevel(page, 5);
  await unlockThroughLevel(page, 4);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.startLevel?.(5);
  });
  await page.waitForFunction(() => window.__DADA_DEBUG__?.sceneKey === 'CribScene', { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await hideGameplayUi(page, { keepStatus: true });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 8.8,
      y: 2.0,
      z: 16.2,
      yaw: 1.06,
      cameraYaw: 1.06,
    });
    const forward = window.__DADA_DEBUG__?.playerForward ?? { x: 1, z: 0 };
    window.__DADA_DEBUG__?.placeLevel5DebugJellyfish?.(forward);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Vitals?.({ hp: 3, shield: 1, oxygen: 20 });
    window.__DADA_DEBUG__?.triggerLevel5Hazard?.('jellyfish');
  });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: 'docs/screenshots/level5-impact-enemy-hit.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 8.4,
      y: 1.92,
      z: 18.0,
      yaw: 1.12,
      cameraYaw: 1.12,
    });
    window.__DADA_DEBUG__?.setEra5Vitals?.({ hp: 3, shield: 0, oxygen: 20 });
    window.__DADA_DEBUG__?.triggerLevel5Hazard?.('eel_viewing_north');
  });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: 'docs/screenshots/level5-impact-hazard-hit.png',
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
});
