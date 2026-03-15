// @ts-check
import { test } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';

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

test('capture Level 5 restart proof screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5-restart', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5-restart/${path.split('/').pop()}`);
  }

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
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -40.0,
      y: 1.28,
      z: 0.0,
      yaw: 0.12,
      cameraYaw: 0.12,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-start',
      position: { x: -37.8, y: 1.9, z: -1.4 },
      target: { x: -31.6, y: 1.7, z: 0.0 },
      fov: 0.34,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-restart-start.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -24.8,
      y: 1.18,
      z: 7.6,
      yaw: 0.22,
      cameraYaw: 0.22,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-fork-public',
      position: { x: -21.6, y: 2.2, z: 6.4 },
      target: { x: -18.2, y: 1.9, z: 16.8 },
      fov: 0.34,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-restart-fork-public.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -24.6,
      y: 1.16,
      z: -4.0,
      yaw: 0.18,
      cameraYaw: 0.18,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-fork-service',
      position: { x: -22.4, y: 2.1, z: -7.0 },
      target: { x: -17.4, y: 1.8, z: -5.0 },
      fov: 0.34,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-restart-fork-service.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -1.6,
      y: 1.48,
      z: 9.4,
      yaw: 0.16,
      cameraYaw: 0.16,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-chamber',
      position: { x: -5.4, y: 2.7, z: 2.8 },
      target: { x: 6.4, y: 2.3, z: 13.8 },
      fov: 0.32,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-restart-hero-chamber.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 24.8,
      y: 1.34,
      z: -1.8,
      yaw: 0.20,
      cameraYaw: 0.20,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-hazard',
      position: { x: 21.8, y: 2.4, z: -4.4 },
      target: { x: 28.6, y: 1.7, z: -1.0 },
      fov: 0.44,
    });
  });
  await page.waitForFunction(() => {
    const rails = window.__DADA_DEBUG__?.era5LevelState?.eelRails ?? [];
    return rails.some((hazard) => hazard.name === 'eel_spill_gate' && hazard.state === 'active');
  }, { timeout: 8_000 });
  await page.waitForTimeout(800);
  await captureProof('docs/screenshots/level5-restart-hazard-room.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 41.2,
      y: 1.36,
      z: 5.6,
      yaw: 0.46,
      cameraYaw: 0.46,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-goal',
      position: { x: 41.0, y: 2.2, z: 4.0 },
      target: { x: 47.4, y: 2.4, z: 8.6 },
      fov: 0.32,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-restart-goal-room.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: true,
    });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 24.8,
      y: 1.36,
      z: -1.8,
      yaw: 0.20,
      cameraYaw: 0.20,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-respawn',
      position: { x: 21.8, y: 2.4, z: -4.8 },
      target: { x: 24.8, y: 1.5, z: -1.8 },
      fov: 0.48,
    });
  });
  await page.waitForTimeout(500);
  await captureProof('docs/screenshots/level5-restart-respawn-anchor.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: true,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 4.8,
      y: 1.44,
      z: 8.6,
      yaw: 0.28,
      cameraYaw: 0.28,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-walkable',
      position: { x: 0.8, y: 2.8, z: 6.2 },
      target: { x: 8.0, y: 1.9, z: 10.0 },
      fov: 0.54,
    });
  });
  await page.waitForTimeout(500);
  await captureProof('docs/screenshots/level5-restart-walkable-overlay.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: true,
      hazards: true,
      respawnAnchors: false,
    });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -29.0,
      y: 1.20,
      z: 1.8,
      yaw: 0.20,
      cameraYaw: 0.20,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-restart-collision',
      position: { x: -31.8, y: 2.6, z: 0.6 },
      target: { x: -25.2, y: 1.6, z: 2.2 },
      fov: 0.56,
    });
  });
  await page.waitForTimeout(500);
  await captureProof('docs/screenshots/level5-restart-collision-overlay.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
  });
});

test('capture Level 5 composition-pass proof screenshots', async ({ page }) => {
  test.setTimeout(300_000);
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('docs/proof/level5-composition-pass', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });

  async function captureProof(path) {
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
    await copyFile(path, `docs/proof/level5-composition-pass/${path.split('/').pop()}`);
  }

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
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -41.2,
      y: 1.28,
      z: -4.8,
      yaw: 0.18,
      cameraYaw: 0.18,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-start',
      position: { x: -41.2, y: 2.2, z: -3.0 },
      target: { x: -34.6, y: 2.1, z: 0.8 },
      fov: 0.64,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-composition-start.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -22.8,
      y: 1.16,
      z: 6.8,
      yaw: 1.12,
      cameraYaw: 1.12,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-public',
      position: { x: -19.6, y: 2.2, z: 8.2 },
      target: { x: -18.0, y: 2.2, z: 17.8 },
      fov: 0.58,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-composition-public.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -23.4,
      y: 1.08,
      z: -8.6,
      yaw: 0.18,
      cameraYaw: 0.18,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-service',
      position: { x: -20.6, y: 2.1, z: -8.2 },
      target: { x: -17.8, y: 2.0, z: -2.4 },
      fov: 0.58,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-composition-service.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: -9.8,
      y: 1.20,
      z: 0.8,
      yaw: 0.92,
      cameraYaw: 0.92,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-hero',
      position: { x: -6.4, y: 2.4, z: 3.0 },
      target: { x: 2.8, y: 2.4, z: 14.0 },
      fov: 0.60,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-composition-hero-chamber.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 20.0,
      y: 1.34,
      z: -5.4,
      yaw: 0.20,
      cameraYaw: 0.20,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-hazard',
      position: { x: 22.0, y: 2.1, z: -4.2 },
      target: { x: 28.0, y: 1.9, z: -1.0 },
      fov: 0.60,
    });
  });
  await page.waitForFunction(() => {
    const rails = window.__DADA_DEBUG__?.era5LevelState?.eelRails ?? [];
    return rails.some((hazard) => hazard.name === 'eel_spill_gate' && hazard.state === 'active');
  }, { timeout: 8_000 });
  await page.waitForTimeout(800);
  await captureProof('docs/screenshots/level5-composition-hazard-room.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 39.4,
      y: 1.28,
      z: 2.8,
      yaw: 0.86,
      cameraYaw: 0.86,
    });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-comp-goal',
      position: { x: 41.4, y: 2.2, z: 3.6 },
      target: { x: 46.2, y: 2.0, z: 8.0 },
      fov: 0.58,
    });
  });
  await page.waitForTimeout(1000);
  await captureProof('docs/screenshots/level5-composition-goal-room.png');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setLevel5TruthOverlay?.({
      walkables: false,
      colliders: false,
      hazards: false,
      respawnAnchors: false,
    });
  });
});
