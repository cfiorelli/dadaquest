// @ts-check
import { test, expect } from '@playwright/test';

const PROGRESS_KEY = 'dadaquest:progress:v1';
const LEVEL_CASES = [
  { id: 1, url: 'http://127.0.0.1:4173/?debug=1' },
  { id: 2, url: 'http://127.0.0.1:4173/?level=2&debug=1' },
  { id: 3, url: 'http://127.0.0.1:4173/?level=3&debug=1' },
];

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
}

async function unlockThroughLevel(page, completedLevel = 4, extraPatch = {}) {
  await page.evaluate(({ maxLevel, patch }) => {
    const levelCompleted = {};
    for (let levelId = 4; levelId <= maxLevel; levelId += 1) {
      levelCompleted[levelId] = true;
    }
    window.__DADA_DEBUG__?.setProgress?.({
      sourdoughUnlocked: true,
      levelCompleted,
      ...patch,
    });
  }, { maxLevel: completedLevel, patch: extraPatch });
}

async function unlockEra5(page, { completed5 = false } = {}) {
  await unlockThroughLevel(page, completed5 ? 5 : 4);
}

test.beforeEach(async ({ page }) => {
  await installCleanStorage(page);
});

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
    await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
    await startDebugLevel(page, levelCase.id);

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
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

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

test('runtime: gameplay hotkey F triggers backflip', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(6.5, 1.25, 0);
  });
  await page.waitForTimeout(150);

  const backflipBeforeCount = await page.evaluate(() => window.__DADA_DEBUG__?.backflip?.count ?? 0);
  const groundedAttempt = await page.evaluate(() => {
    const started = window.__DADA_DEBUG__?.gameplayHotkey?.('KeyF') ?? false;
    return {
      started,
      backflip: window.__DADA_DEBUG__?.backflip ?? null,
    };
  });
  expect(groundedAttempt.started).toBe(false);
  expect(groundedAttempt.backflip?.count ?? 0).toBe(backflipBeforeCount);

  const backflipTriggered = await page.evaluate(() => {
    const player = window.__DADA_DEBUG__?.playerController;
    if (player) {
      player.grounded = false;
      player.jumping = true;
      player.vy = 6;
    }
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
});

test('runtime: Cmd+R / Ctrl+R are not intercepted by checkpoint reset handling', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const result = await page.evaluate(() => {
    const before = window.__DADA_DEBUG__?.lastRespawnReason ?? null;
    const ctrlEvt = new KeyboardEvent('keydown', {
      key: 'r',
      code: 'KeyR',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const metaEvt = new KeyboardEvent('keydown', {
      key: 'r',
      code: 'KeyR',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(ctrlEvt);
    window.dispatchEvent(metaEvt);
    return {
      before,
      after: window.__DADA_DEBUG__?.lastRespawnReason ?? null,
      ctrlPrevented: ctrlEvt.defaultPrevented,
      metaPrevented: metaEvt.defaultPrevented,
    };
  });

  expect(result.after).toBe(result.before);
  expect(result.ctrlPrevented).toBe(false);
  if (browserName === 'chromium') {
    expect(result.metaPrevented).toBe(false);
  }
});

test('runtime: level 4 stays locked until progress unlocks it, then starts and finishes cleanly', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);

  const lockedState = await page.evaluate(() => ({
    menuText: document.getElementById('titleLevelLock')?.textContent ?? '',
    ariaDisabled: document.getElementById('levelBtn4')?.getAttribute('aria-disabled') ?? '',
  }));
  expect(lockedState.ariaDisabled).toBe('');

  const blocked = await page.evaluate(() => {
    history.replaceState(null, '', `${window.location.pathname}?level=4&debug=1`);
    window.__DADA_DEBUG__?.startLevel?.(4);
    return {
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      hint: document.getElementById('titleHint')?.textContent ?? '',
    };
  });
  expect(blocked.sceneKey).toBe('TitleScene');
  expect(blocked.hint).toContain('unlock Super Sourdough');

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await startDebugLevel(page, 4);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportToGoal?.();
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 20_000 },
  ).toBe('EndScene');
});

test('@level5 @era5 @progression runtime: level 5 stays locked until Level 4 is completed, then runs cleanly for 10 seconds', async ({ page }) => {
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

  await gotoDebugLevel(page, 1);

  const blocked = await page.evaluate(() => {
    history.replaceState(null, '', `${window.location.pathname}?level=5&debug=1`);
    window.__DADA_DEBUG__?.startLevel?.(5);
    return {
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      hint: document.getElementById('titleHint')?.textContent ?? '',
    };
  });
  expect(blocked.sceneKey).toBe('TitleScene');
  expect(blocked.hint).toContain('Beat Super Sourdough');

  await unlockEra5(page);

  await page.goto('http://127.0.0.1:4173/?level=5&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await startDebugLevel(page, 5);
  await page.waitForTimeout(10_000);

  const runtimeState = await page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError || null,
    musicLevelId: window.__DADA_DEBUG__?.musicLevelId ?? null,
  }));
  expect(runtimeState.sceneKey).toBe('CribScene');
  expect(runtimeState.lastRuntimeError).toBeNull();
  expect(runtimeState.musicLevelId).toBe(5);

  if (pageErrors.length > 0) {
    throw new Error(`Page errors on level 5: ${pageErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors on level 5: ${consoleErrors.join('\n')}`);
  }
});

test('@level5 @era5 runtime: level 5 uses Doom-style yaw turning, forward movement, and strafe without yaw drift', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const beforeTurn = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(beforeTurn.playerPos).not.toBeNull();
  expect(beforeTurn.playerYaw).not.toBeNull();

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  const afterTurn = await page.evaluate(() => ({
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    yawVel: window.__DADA_DEBUG__?.yawVel ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await page.keyboard.up('ArrowRight');
  expect(afterTurn.playerYaw).not.toBeNull();
  expect(afterTurn.yawVel).not.toBeNull();
  expect(afterTurn.playerYaw).toBeGreaterThan(beforeTurn.playerYaw + 0.18);
  expect(afterTurn.playerYaw - beforeTurn.playerYaw).toBeLessThan(2.4);
  expect(afterTurn.yawVel).toBeGreaterThan(0.2);
  expect(afterTurn.cameraYaw).toBeGreaterThan(beforeTurn.cameraYaw - 0.02);

  await page.waitForTimeout(900);

  const beforeForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerVelocity: window.__DADA_DEBUG__?.playerVelocity ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(beforeForward.playerPos).not.toBeNull();
  expect(beforeForward.playerForward).not.toBeNull();

  await page.keyboard.down('w');
  await page.waitForTimeout(450);
  const duringForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerVelocity: window.__DADA_DEBUG__?.playerVelocity ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerFacingYaw: window.__DADA_DEBUG__?.playerFacingYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await page.keyboard.up('w');
  const afterForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(duringForward.playerPos).not.toBeNull();
  expect(duringForward.playerVelocity).not.toBeNull();
  expect(duringForward.playerForward).not.toBeNull();
  const forwardDeltaX = duringForward.playerPos.x - beforeForward.playerPos.x;
  const forwardDeltaZ = duringForward.playerPos.z - beforeForward.playerPos.z;
  const forwardDot = (forwardDeltaX * beforeForward.playerForward.x) + (forwardDeltaZ * beforeForward.playerForward.z);
  expect(forwardDot).toBeGreaterThan(0.34);
  expect(Math.abs((afterForward.cameraYaw ?? 0) - (beforeForward.cameraYaw ?? 0))).toBeLessThan(0.18);
  expect(Math.hypot(duringForward.playerVelocity.x, duringForward.playerVelocity.z)).toBeGreaterThan(0.25);
  const yawDelta = Math.atan2(
    Math.sin((duringForward.playerFacingYaw ?? 0) - (duringForward.playerYaw ?? 0)),
    Math.cos((duringForward.playerFacingYaw ?? 0) - (duringForward.playerYaw ?? 0)),
  );
  expect(Math.abs(yawDelta)).toBeLessThan(0.12);

  const beforeStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await page.keyboard.down('a');
  await page.waitForTimeout(450);
  const duringStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await page.keyboard.up('a');
  expect(beforeStrafe.playerPos).not.toBeNull();
  expect(duringStrafe.playerPos).not.toBeNull();
  expect(duringStrafe.playerYaw).not.toBeNull();
  expect(Math.abs((duringStrafe.playerYaw ?? 0) - (beforeStrafe.playerYaw ?? 0))).toBeLessThan(0.06);
  expect(Math.abs((duringStrafe.cameraYaw ?? 0) - (beforeStrafe.cameraYaw ?? 0))).toBeLessThan(0.10);
  const strafeDelta = Math.hypot(
    duringStrafe.playerPos.x - beforeStrafe.playerPos.x,
    duringStrafe.playerPos.z - beforeStrafe.playerPos.z,
  );
  expect(strafeDelta).toBeGreaterThan(0.18);
});

test('@level5 @era5 runtime: level 5 bracket keys rotate the camera in the expected directions', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const startYaw = await page.evaluate(() => window.__DADA_DEBUG__?.cameraDesiredYaw ?? null);
  await page.keyboard.down('BracketRight');
  await page.waitForTimeout(320);
  const duringRight = await page.evaluate(() => ({
    cameraYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
    cameraYawVel: window.__DADA_DEBUG__?.cameraYawVel ?? null,
  }));
  await page.keyboard.up('BracketRight');
  expect(duringRight.cameraYaw).not.toBeNull();
  expect(duringRight.cameraYawVel).not.toBeNull();
  expect(duringRight.cameraYaw).toBeGreaterThan(startYaw + 0.03);
  expect(duringRight.cameraYawVel).toBeGreaterThan(0.04);

  await page.keyboard.down('BracketLeft');
  await page.waitForTimeout(420);
  const duringLeft = await page.evaluate(() => ({
    cameraYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
    cameraYawVel: window.__DADA_DEBUG__?.cameraYawVel ?? null,
  }));
  await page.keyboard.up('BracketLeft');
  expect(duringLeft.cameraYaw).not.toBeNull();
  expect(duringLeft.cameraYaw).toBeLessThan(duringRight.cameraYaw - 0.04);
});

test('@fast @level5 @era5 runtime: level 5 inventory opens, oxygen HUD renders, Bubble Wand fires with Enter, and music is running', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await expect(page.locator('[data-era5-oxygen]')).toBeVisible();
  await expect(page.locator('[data-era5-oxygen-copy]')).toContainText('/ 20.0s');
  await expect(page.locator('[data-era5-weapon-help]')).toContainText('Fire Bubble Wand: Ctrl / Enter / Click');

  await page.keyboard.press('I');
  await expect(page.locator('.dada-era5-inventory.open')).toBeVisible();
  await page.keyboard.press('I');
  await expect(page.locator('.dada-era5-inventory.open')).toHaveCount(0);

  const projectileCountBefore = await page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0);
  await page.keyboard.press('Enter');
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0),
    { timeout: 5_000 },
  ).toBeGreaterThan(projectileCountBefore);

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0),
    { timeout: 5_000 },
  ).toBe(0);
  await page.evaluate(() => {
    const forward = window.__DADA_DEBUG__?.playerForward ?? { x: 1, z: 0 };
    window.__DADA_DEBUG__?.placeLevel5DebugJellyfish?.(forward);
  });
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await expect.poll(
    () => page.evaluate(() => {
      const jelly = window.__DADA_DEBUG__?.level5State?.jellyfish?.[0];
      return jelly?.stunnedMs ?? 0;
    }),
    { timeout: 5_000 },
  ).toBeGreaterThan(1000);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.musicLevelId ?? null),
    { timeout: 5_000 },
  ).toBe(5);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.musicRunning ?? false),
    { timeout: 5_000 },
  ).toBe(true);
});

test('@level5 @era5 runtime: level 5 gameplay geometry stays visible and camera yaw stays smooth while turning', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const geometryState = await page.evaluate(() => {
    const visibleMeshes = (window.__DADA_DEBUG__?.sceneRef?.meshes ?? [])
      .filter((mesh) => (
        mesh?.isEnabled?.()
        && mesh?.isVisible !== false
        && (mesh?.visibility ?? 1) > 0.02
        && typeof mesh?.name === 'string'
        && mesh.name.startsWith('L5_GEO_')
      ))
      .map((mesh) => mesh.name);
    return {
      gameplayMeshes: window.__DADA_DEBUG__?.gameplayMeshes ?? 0,
      visibleMeshes,
      visibilityFailure: window.__DADA_DEBUG__?.era5VisibilityFailureReason ?? null,
    };
  });
  expect(geometryState.visibilityFailure).toBeNull();
  expect(geometryState.gameplayMeshes).toBeGreaterThan(20);
  expect(geometryState.visibleMeshes.length).toBeGreaterThan(20);

  await page.keyboard.down('ArrowRight');
  const yawSamples = [];
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(60);
    yawSamples.push(await page.evaluate(() => window.__DADA_DEBUG__?.cameraYaw ?? null));
  }
  await page.keyboard.up('ArrowRight');
  const deltas = yawSamples
    .map((value, index) => (
      index === 0
        ? null
        : Math.atan2(
          Math.sin(value - yawSamples[index - 1]),
          Math.cos(value - yawSamples[index - 1]),
        )
    ))
    .filter((value) => Number.isFinite(value));
  expect(deltas.length).toBeGreaterThan(8);
  expect(Math.max(...deltas)).toBeLessThan(0.32);
  expect(Math.min(...deltas)).toBeGreaterThan(-0.08);
});

test('@level5 @era5 runtime: level 5 binky magnet collects on a near miss instead of requiring exact overlap', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const targetCoin = await page.evaluate(() => {
    const candidates = window.__DADA_DEBUG__?.collectibles?.() ?? [];
    return candidates.find((coin) => !coin.collected) ?? null;
  });
  expect(targetCoin).not.toBeNull();

  const coinsBefore = await page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0);
  await page.evaluate((coin) => {
    window.__DADA_DEBUG__?.teleportPlayer?.(coin.x + 0.72, coin.y + 0.55, coin.z + 0.04);
  }, targetCoin);

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0),
    { timeout: 5_000 },
  ).toBe(coinsBefore + 1);
});

test('@fast @era5 @progression runtime: levels 6 through 9 appear as locked placeholders in the title menu', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);

  const lockState = await page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null);
  expect(lockState).not.toBeNull();
  expect(lockState[6]).toBe(true);
  expect(lockState[7]).toBe(true);
  expect(lockState[8]).toBe(true);
  expect(lockState[9]).toBe(true);

  await page.click('#levelBtn6');
  await expect(page.locator('#titleHint')).toContainText('Beat Neon Night Aquarium');
  await page.click('#levelBtn9');
  await expect(page.locator('#titleHint')).toContainText('Beat Haunted Library');
});

test('@era5 @progression runtime: levels 6 through 9 unlock sequentially from completed-level progress', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);
  await page.waitForTimeout(300);

  const initialLocks = await page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null);
  expect(initialLocks).not.toBeNull();
  expect(initialLocks[6]).toBe(true);
  expect(initialLocks[7]).toBe(true);
  expect(initialLocks[8]).toBe(true);
  expect(initialLocks[9]).toBe(true);

  await unlockThroughLevel(page, 5);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null),
    { timeout: 5_000 },
  ).toMatchObject({
    6: false,
    7: true,
    8: true,
    9: true,
  });

  await unlockThroughLevel(page, 6);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null),
    { timeout: 5_000 },
  ).toMatchObject({
    6: false,
    7: false,
    8: true,
    9: true,
  });

  await unlockThroughLevel(page, 7);
  await expect.poll(
    () => page.evaluate(() => ({
      locks: window.__DADA_DEBUG__?.getMenuLockState?.() ?? null,
      windGlideUnlocked: !!window.__DADA_DEBUG__?.progressState?.windGlideUnlocked,
    })),
    { timeout: 5_000 },
  ).toMatchObject({
    locks: {
      6: false,
      7: false,
      8: false,
      9: true,
    },
    windGlideUnlocked: true,
  });

  await unlockThroughLevel(page, 8);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null),
    { timeout: 5_000 },
  ).toMatchObject({
    6: false,
    7: false,
    8: false,
    9: false,
  });
});

for (const levelId of [6, 7, 8, 9]) {
  test(`@era5 runtime: level ${levelId} starts, keeps Era 5 HUD active, and runs cleanly for 10 seconds`, async ({ page }) => {
    test.setTimeout(120_000);
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await gotoDebugLevel(page, levelId);
    await unlockThroughLevel(page, levelId - 1);
    await startDebugLevel(page, levelId);
    await page.waitForTimeout(10_000);

    await expect(page.locator('[data-era5-hud]')).toBeVisible();
    await expect(page.locator('[data-era5-hearts]')).toBeVisible();
    await expect(page.locator('[data-era5-shields]')).toBeVisible();

    const runtimeState = await page.evaluate(() => ({
      sceneKey: window.__DADA_DEBUG__?.sceneKey,
      lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
      musicLevelId: window.__DADA_DEBUG__?.musicLevelId ?? null,
      musicRunning: !!window.__DADA_DEBUG__?.musicRunning,
    }));
    expect(runtimeState.sceneKey).toBe('CribScene');
    expect(runtimeState.lastRuntimeError).toBeNull();
    expect(runtimeState.musicLevelId).toBe(levelId);
    expect(runtimeState.musicRunning).toBe(true);

    if (pageErrors.length > 0) {
      throw new Error(`Page errors on level ${levelId}: ${pageErrors.join('\n')}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Console errors on level ${levelId}: ${consoleErrors.join('\n')}`);
    }
  });
}

test('@era5 runtime: level 6 conveyor zones push the player and expose conveyor debug state', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 6);
  await unlockThroughLevel(page, 5);
  await startDebugLevel(page, 6);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-8.0, 1.45, -0.4);
  });
  const before = await page.evaluate(() => window.__DADA_DEBUG__?.playerPos ?? null);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    velocity: window.__DADA_DEBUG__?.playerVelocity ?? null,
    levelState: window.__DADA_DEBUG__?.era5LevelState ?? null,
  }));

  expect(before).not.toBeNull();
  expect(after.playerPos).not.toBeNull();
  expect(after.velocity).not.toBeNull();
  expect(after.levelState?.lastConveyorPush ?? 0).toBeGreaterThan(0.1);
  expect(Math.hypot(
    after.velocity.x ?? 0,
    after.velocity.z ?? 0,
  )).toBeGreaterThan(0.01);
});

test('@era5 runtime: level 7 lightning hazards visibly cycle from warn to active', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 7);
  await unlockThroughLevel(page, 6);
  await startDebugLevel(page, 7);

  await expect.poll(
    () => page.evaluate(() => {
      const lightning = window.__DADA_DEBUG__?.era5LevelState?.lightning ?? [];
      return lightning.some((hazard) => hazard.state === 'warn');
    }),
    { timeout: 6_000 },
  ).toBe(true);

  await expect.poll(
    () => page.evaluate(() => {
      const lightning = window.__DADA_DEBUG__?.era5LevelState?.lightning ?? [];
      return lightning.some((hazard) => hazard.state === 'active');
    }),
    { timeout: 6_000 },
  ).toBe(true);
});

test('@era5 runtime: level 8 lantern tool reveals a hidden bridge', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 8);
  await unlockThroughLevel(page, 7);
  await startDebugLevel(page, 8);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-13.5, 1.7, 0.0);
  });
  await page.waitForTimeout(700);

  const initiallyVisible = await page.evaluate(() => {
    const bridges = window.__DADA_DEBUG__?.era5LevelState?.hiddenBridges ?? [];
    return bridges.find((bridge) => bridge.name === 'hiddenA')?.visible ?? null;
  });
  expect(initiallyVisible).toBe(false);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(25.0, 1.7, -4.9);
    window.__DADA_DEBUG__?.toggleEra5Tool?.();
  });

  await expect.poll(
    () => page.evaluate(() => {
      const bridges = window.__DADA_DEBUG__?.era5LevelState?.hiddenBridges ?? [];
      return bridges.find((bridge) => bridge.name === 'hiddenA')?.visible ?? false;
    }),
    { timeout: 5_000 },
  ).toBe(true);
});

test('@era5 runtime: level 9 puppet sweep exposes a moving warning band during its active window', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 9);
  await unlockThroughLevel(page, 8);
  await startDebugLevel(page, 9);

  await expect.poll(
    () => page.evaluate(() => {
      const sweeps = window.__DADA_DEBUG__?.era5LevelState?.sweepers ?? [];
      return sweeps.find((hazard) => hazard.name === 'puppetA')?.state ?? null;
    }),
    { timeout: 6_000 },
  ).toBe('warn');

  await expect.poll(
    () => page.evaluate(() => {
      const sweeps = window.__DADA_DEBUG__?.era5LevelState?.sweepers ?? [];
      return sweeps.find((hazard) => hazard.name === 'puppetA')?.state ?? null;
    }),
    { timeout: 6_000 },
  ).toBe('active');

  const firstBandX = await page.evaluate(() => {
    const sweeps = window.__DADA_DEBUG__?.era5LevelState?.sweepers ?? [];
    return sweeps.find((hazard) => hazard.name === 'puppetA')?.bandX ?? null;
  });
  await page.waitForTimeout(300);
  const secondBandX = await page.evaluate(() => {
    const sweeps = window.__DADA_DEBUG__?.era5LevelState?.sweepers ?? [];
    return sweeps.find((hazard) => hazard.name === 'puppetA')?.bandX ?? null;
  });

  expect(firstBandX).not.toBeNull();
  expect(secondBandX).not.toBeNull();
  expect(Math.abs(secondBandX - firstBandX)).toBeGreaterThan(0.2);
});

test('runtime: gameplay hotkey R resets to last checkpoint', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(6.5, 1.25, 0);
  });
  await page.waitForTimeout(1000);
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

test('runtime: level 2 floor fall clears collected binkies without resetting', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const firstCoin = await page.evaluate(() => {
    const list = window.__DADA_DEBUG__?.collectibles?.() || [];
    return list.find((coin) => !coin.collected) || null;
  });
  expect(firstCoin).not.toBeNull();

  await page.evaluate((coin) => {
    window.__DADA_DEBUG__?.teleportPlayer?.(coin.x, coin.y + 0.28, coin.z);
  }, firstCoin);
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0), { timeout: 4_000 })
    .toBeGreaterThanOrEqual(1);

  const beforeFallCoins = await page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(-2.0, 1.2, 0);
  });
  await page.waitForTimeout(250);
  const penaltyResult = await page.evaluate(() => window.__DADA_DEBUG__?.triggerFloorPenalty?.() ?? null);
  expect(penaltyResult).not.toBeNull();
  expect(penaltyResult.lastRespawnReason || '').toBe('');

  const afterFall = await page.evaluate(() => ({
    coins: window.__DADA_DEBUG__?.coinsCollected ?? 0,
    floorPenaltyLevel: window.__DADA_DEBUG__?.lastFloorPenaltyLevel ?? null,
    floorPenaltyCount: window.__DADA_DEBUG__?.floorPenaltyCount ?? 0,
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
  }));
  expect(beforeFallCoins).toBeGreaterThan(0);
  expect(afterFall.coins).toBe(0);
  expect(afterFall.floorPenaltyLevel).toBe(2);
  expect(afterFall.floorPenaltyCount).toBeGreaterThan(0);
  expect(afterFall.sceneKey).toBe('CribScene');
});

test('runtime: level 2 pong minigame can be triggered and shows its UI', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel2Pong?.() ?? false);
  expect(started).toBe(true);
  await expect(page.locator('#pongTitle')).toHaveText('PONG PANIC', { timeout: 3_000 });
  await expect(page.locator('.dada-pong').getByText('Win 5 points to bounce back into the condo.')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey), { timeout: 20_000 })
    .toBe('CribScene');
});

test('runtime: level 2 secret path debug data exposes floor reset pad and two secret binkies', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const secret = await page.evaluate(() => window.__DADA_DEBUG__?.level2Secret?.() ?? null);
  expect(secret).not.toBeNull();
  expect(Math.abs((secret.resetPadY ?? 999) - 0.02)).toBeLessThanOrEqual(0.06);
  expect(Array.isArray(secret.secretCoinPositions)).toBe(true);
  expect(secret.secretCoinPositions).toHaveLength(2);
  expect(Array.isArray(secret.vanishPlatforms)).toBe(true);
  expect(secret.vanishPlatforms).toHaveLength(3);
});

test('runtime: level 2 final stair is solid and the replacement loft coin exists', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const crumble = await page.evaluate(() => window.__DADA_DEBUG__?.level2LastCrumble?.() ?? null);
  expect(crumble).not.toBeNull();
  expect(crumble.name).toBe('crumbleStair5');

  const landingCoin = await page.evaluate(() => {
    const coins = window.__DADA_DEBUG__?.collectibles?.() ?? [];
    return coins.find((coin) => Math.abs(coin.x - 35.25) < 0.2 && Math.abs(coin.y - 9.86) < 0.2) ?? null;
  });
  expect(landingCoin).not.toBeNull();
  expect(typeof landingCoin.index).toBe('number');
});

// ── New tests for tasks 1–5 ──────────────────────────────────────────────────

test('runtime: onesie pickup shows ACTIVE in HUD and icon label is JUMP', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  // Teleport player onto the onesie pickup (x=15, y=4.70)
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(15.0, 5.0, 0);
  });
  // Wait for buff to become active
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.onesieBuffMs ?? 0),
    { timeout: 8_000 },
  ).toBeGreaterThan(0);

  // Buff panel must be visible and show ACTIVE
  const hudState = await page.evaluate(() => {
    const buffEl = document.querySelector('.dada-buff');
    const stateEl = document.querySelector('[data-buff="onesie"] .dada-buff-state');
    const iconEl = document.querySelector('.dada-buff-icon.onesie');
    return {
      buffVisible: buffEl ? getComputedStyle(buffEl).display !== 'none' : false,
      stateText: stateEl?.textContent ?? '',
      iconText: iconEl?.textContent ?? '',
    };
  });
  expect(hudState.buffVisible).toBe(true);
  expect(hudState.stateText).toBe('ACTIVE');
  expect(hudState.iconText).toBe('JUMP');
});

test('runtime: Reset Baby to New clears capeUnlocked and locks Level 4', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);
  await startDebugLevel(page, 1);

  // Grant progression via debug
  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.capeUnlocked = true;
    state.sourdoughUnlocked = true;
    state.unlocksShown = { cape: true, sourdough: true };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  // Confirm level 4 is now unlocked
  const beforeReset = await page.evaluate(() => ({
    capeUnlocked: window.__DADA_DEBUG__?.progressState?.capeUnlocked ?? false,
    sourdoughUnlocked: window.__DADA_DEBUG__?.progressState?.sourdoughUnlocked ?? false,
  }));
  expect(beforeReset.capeUnlocked).toBe(true);
  expect(beforeReset.sourdoughUnlocked).toBe(true);

  // Trigger Reset Baby to New via debug API
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.resetBabyToNew?.();
  });
  await page.waitForTimeout(300);

  const afterReset = await page.evaluate(() => ({
    capeUnlocked: window.__DADA_DEBUG__?.progressState?.capeUnlocked ?? null,
    sourdoughUnlocked: window.__DADA_DEBUG__?.progressState?.sourdoughUnlocked ?? null,
    level4AriaDisabled: document.querySelector('#menuLevelBtn4')?.getAttribute('aria-disabled') ?? 'absent',
    storageEmpty: (() => {
      try {
        const raw = localStorage.getItem('dadaquest:progress:v1');
        if (!raw) return true;
        const p = JSON.parse(raw);
        return !p?.capeUnlocked && !p?.sourdoughUnlocked;
      } catch { return false; }
    })(),
  }));

  expect(afterReset.capeUnlocked).toBe(false);
  expect(afterReset.sourdoughUnlocked).toBe(false);
  expect(afterReset.storageEmpty).toBe(true);
});

test('runtime: pong win to 5 points shows YOU WON and returns to Level 2', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel2Pong?.() ?? false);
  expect(started).toBe(true);

  // Force the player score to WIN_SCORE via internal state
  await page.evaluate(() => {
    const pong = window.__DADA_DEBUG__?._pongMinigame;
    if (pong) {
      // Jump score to 4, then trigger one final point
      pong.playerScore = 4;
      pong.cpuScore = 0;
      pong.scorePoint(true);  // triggers win
    }
  });

  // Check canvas shows win overlay text (rendered) or title changed
  await page.waitForTimeout(300);
  const titleText = await page.evaluate(() => document.getElementById('pongTitle')?.textContent ?? '');
  expect(titleText).toContain('WON');

  // After 1.5s the game should return to gameplay
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 5_000 },
  ).toBe('CribScene');
});

test('runtime: level 3 out-of-bounds triggers balloon roundup minigame', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  const started = await page.evaluate(() => window.__DADA_DEBUG__?.triggerLevel3Balloon?.() ?? false);
  expect(started).toBe(true);

  // Balloon minigame UI should be visible
  const balloonVisible = await page.evaluate(() => {
    const el = document.querySelector('.dada-balloon');
    return el ? el.style.display !== 'none' : false;
  });
  expect(balloonVisible).toBe(true);

  // sceneKey should be MinigameScene
  const sceneKey = await page.evaluate(() => window.__DADA_DEBUG__?.sceneKey ?? null);
  expect(sceneKey).toBe('MinigameScene');

  // ESC should abort and restart Level 3 (back to TitleScene then CribScene)
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true }));
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 20_000 },
  ).toBe('CribScene');
});

test('runtime: level 3 loads without runtime errors after grandma relocation', async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await gotoDebugLevel(page, 3);
  await startDebugLevel(page, 3);

  // Brief gameplay tick
  await page.waitForTimeout(500);

  expect(pageErrors).toHaveLength(0);
  const sceneKey = await page.evaluate(() => window.__DADA_DEBUG__?.sceneKey ?? null);
  expect(sceneKey).toBe('CribScene');
});

test('runtime: level 4 music starts with correct level id after user gesture', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await startDebugLevel(page, 4);

  // Simulate user gesture so AudioContext can unlock
  await page.mouse.click(400, 300);
  await page.waitForTimeout(2000);

  const musicLevelId = await page.evaluate(() => window.__DADA_DEBUG__?.musicLevelId ?? -1);
  expect(musicLevelId).toBe(4);
});

test('runtime: level 4 bread rain system spawns objects during gameplay', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://127.0.0.1:4173/?level=4&debug=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });

  await page.evaluate(() => {
    const state = structuredClone(window.__DADA_DEBUG__?.progressState || {});
    state.sourdoughUnlocked = true;
    state.unlocksShown = { ...(state.unlocksShown || {}) };
    window.__DADA_DEBUG__?.setProgressState?.(state);
  });

  await startDebugLevel(page, 4);

  // Let the rain update loop run for 2 seconds
  await page.waitForTimeout(2_000);

  const rainCount = await page.evaluate(() => window.__DADA_DEBUG__?.l4RainActiveCount ?? -1);
  expect(rainCount).toBeGreaterThan(0);
});
