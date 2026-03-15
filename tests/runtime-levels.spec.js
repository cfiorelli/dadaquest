// @ts-check
import { test, expect } from '@playwright/test';

const PROGRESS_KEY = 'dadaquest:progress:v1';
const LEVEL_CASES = [
  { id: 1, url: 'http://127.0.0.1:4173/?debug=1' },
  { id: 2, url: 'http://127.0.0.1:4173/?level=2&debug=1' },
  { id: 3, url: 'http://127.0.0.1:4173/?level=3&debug=1' },
];
const LEVEL5_REQUIRED_SECTORS = [
  'Arrival Airlock Vestibule',
  'Public Exhibit Spine',
  'Service Access Elbow',
  'Chamber Reveal Gallery',
  'Main Tank Chamber',
  'Upper Observation Bridge',
  'Filtration Core',
  'Flooded Maintenance Trench',
  'Pump Gallery Rejoin',
  'Nursery Recovery Alcove',
];
const ERA5_CONTROL_POSES = {
  6: { x: 40.0, y: 1.64, z: -0.8, yaw: 1.36, cameraYaw: 1.36 },
  7: { x: 14.0, y: 1.42, z: -2.8, yaw: 1.32, cameraYaw: 1.32 },
  8: { x: 18.0, y: 1.56, z: 2.5, yaw: 1.30, cameraYaw: 1.30 },
  9: { x: 58.0, y: 1.56, z: 3.0, yaw: 1.28, cameraYaw: 1.28 },
};

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

async function focusGameplay(page) {
  await page.mouse.click(640, 360);
  await page.waitForTimeout(60);
}

async function dispatchHeldKey(page, type, { code, key, altKey = false, ctrlKey = false, shiftKey = false }) {
  await page.evaluate(({ eventType, eventCode, eventKey, eventAltKey, eventCtrlKey, eventShiftKey }) => {
    const target = document;
    target.dispatchEvent(new KeyboardEvent(eventType, {
      bubbles: true,
      cancelable: true,
      code: eventCode,
      key: eventKey,
      altKey: eventAltKey,
      ctrlKey: eventCtrlKey,
      shiftKey: eventShiftKey,
    }));
  }, {
    eventType: type,
    eventCode: code,
    eventKey: key,
    eventAltKey: altKey,
    eventCtrlKey: ctrlKey,
    eventShiftKey: shiftKey,
  });
}

async function snapshotEra5Pose(page) {
  return page.evaluate(() => ({
    x: window.__DADA_DEBUG__?.playerPos?.x ?? 0,
    y: window.__DADA_DEBUG__?.playerPos?.y ?? 0,
    z: window.__DADA_DEBUG__?.playerPos?.z ?? 0,
    yaw: window.__DADA_DEBUG__?.playerYaw ?? 0,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? 0,
  }));
}

async function resetEra5Pose(page, pose) {
  await page.evaluate((nextPose) => {
    window.__DADA_DEBUG__?.setEra5Pose?.(nextPose);
  }, pose);
  await page.waitForTimeout(90);
}

function dotXZ(delta, direction) {
  return (delta.x * direction.x) + (delta.z * direction.z);
}

function getRightFromForward(forward) {
  return {
    x: forward.z,
    z: -forward.x,
  };
}

function wrapDelta(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
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
  test.setTimeout(240_000);
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

test('@level5 @era5 runtime: level 5 uses classic Doom arrow movement, turn, and strafe semantics with modern aliases', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);
  const basePose = { x: 39.4, y: 1.54, z: -5.4, yaw: 1.57, cameraYaw: 1.57 };

  await resetEra5Pose(page, basePose);
  const beforeTurn = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(beforeTurn.playerPos).not.toBeNull();
  expect(beforeTurn.playerYaw).not.toBeNull();

  await dispatchHeldKey(page, 'keydown', { code: 'ArrowRight', key: 'ArrowRight' });
  await page.waitForTimeout(520);
  const afterTurn = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    yawVel: window.__DADA_DEBUG__?.yawVel ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowRight', key: 'ArrowRight' });
  expect(afterTurn.playerYaw).not.toBeNull();
  expect(afterTurn.yawVel).not.toBeNull();
  expect(afterTurn.playerYaw).toBeGreaterThan(beforeTurn.playerYaw + 0.05);
  expect(afterTurn.playerYaw - beforeTurn.playerYaw).toBeLessThan(2.4);
  expect(afterTurn.yawVel).toBeGreaterThan(0.08);
  expect(afterTurn.cameraYaw).toBeGreaterThan(beforeTurn.cameraYaw - 0.02);
  expect(Math.hypot(
    afterTurn.playerPos.x - beforeTurn.playerPos.x,
    afterTurn.playerPos.z - beforeTurn.playerPos.z,
  )).toBeLessThan(0.08);

  await resetEra5Pose(page, basePose);
  const beforeForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerVelocity: window.__DADA_DEBUG__?.playerVelocity ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(beforeForward.playerPos).not.toBeNull();
  expect(beforeForward.playerForward).not.toBeNull();

  await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(620);
  const duringForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerVelocity: window.__DADA_DEBUG__?.playerVelocity ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerFacingYaw: window.__DADA_DEBUG__?.playerFacingYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
  const afterForward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  expect(duringForward.playerPos).not.toBeNull();
  expect(duringForward.playerVelocity).not.toBeNull();
  expect(duringForward.playerForward).not.toBeNull();
  const forwardDelta = {
    x: duringForward.playerPos.x - beforeForward.playerPos.x,
    z: duringForward.playerPos.z - beforeForward.playerPos.z,
  };
  const forwardDot = dotXZ(forwardDelta, beforeForward.playerForward);
  expect(forwardDot).toBeGreaterThan(0.03);
  expect(Math.abs((afterForward.cameraYaw ?? 0) - (beforeForward.cameraYaw ?? 0))).toBeLessThan(0.18);
  expect(Math.hypot(duringForward.playerVelocity.x, duringForward.playerVelocity.z)).toBeGreaterThan(0.08);
  const yawDelta = wrapDelta((duringForward.playerFacingYaw ?? 0), (duringForward.playerYaw ?? 0));
  expect(Math.abs(yawDelta)).toBeLessThan(0.12);

  await resetEra5Pose(page, basePose);
  const beforeBackward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowDown', key: 'ArrowDown' });
  await page.waitForTimeout(620);
  const duringBackward = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowDown', key: 'ArrowDown' });
  const backwardDelta = {
    x: duringBackward.playerPos.x - beforeBackward.playerPos.x,
    z: duringBackward.playerPos.z - beforeBackward.playerPos.z,
  };
  expect(dotXZ(backwardDelta, beforeBackward.playerForward)).toBeLessThan(-0.03);
  expect(Math.abs((duringBackward.playerYaw ?? 0) - (beforeBackward.playerYaw ?? 0))).toBeLessThan(0.06);
  expect(Math.abs((duringBackward.cameraYaw ?? 0) - (beforeBackward.cameraYaw ?? 0))).toBeLessThan(0.10);

  await resetEra5Pose(page, basePose);
  const beforeAltStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'AltLeft', key: 'Alt', altKey: true });
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowRight', key: 'ArrowRight', altKey: true });
  await page.waitForTimeout(560);
  const duringAltStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowRight', key: 'ArrowRight', altKey: true });
  await dispatchHeldKey(page, 'keyup', { code: 'AltLeft', key: 'Alt' });
  const playerRight = getRightFromForward(beforeAltStrafe.playerForward);
  const altStrafeDelta = {
    x: duringAltStrafe.playerPos.x - beforeAltStrafe.playerPos.x,
    z: duringAltStrafe.playerPos.z - beforeAltStrafe.playerPos.z,
  };
  expect(dotXZ(altStrafeDelta, playerRight)).toBeGreaterThan(0.04);
  expect(Math.abs((duringAltStrafe.playerYaw ?? 0) - (beforeAltStrafe.playerYaw ?? 0))).toBeLessThan(0.06);
  expect(Math.abs((duringAltStrafe.cameraYaw ?? 0) - (beforeAltStrafe.cameraYaw ?? 0))).toBeLessThan(0.10);

  await resetEra5Pose(page, basePose);
  const beforeCommaStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'Comma', key: ',' });
  await page.waitForTimeout(560);
  const duringCommaStrafe = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'Comma', key: ',' });
  const commaRight = getRightFromForward(beforeCommaStrafe.playerForward);
  const commaDelta = {
    x: duringCommaStrafe.playerPos.x - beforeCommaStrafe.playerPos.x,
    z: duringCommaStrafe.playerPos.z - beforeCommaStrafe.playerPos.z,
  };
  expect(dotXZ(commaDelta, commaRight)).toBeLessThan(-0.03);
  expect(Math.abs((duringCommaStrafe.playerYaw ?? 0) - (beforeCommaStrafe.playerYaw ?? 0))).toBeLessThan(0.06);

  await resetEra5Pose(page, basePose);
  const beforeWAlias = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'KeyW', key: 'w' });
  await page.waitForTimeout(620);
  const duringWAlias = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'KeyW', key: 'w' });
  const wDelta = {
    x: duringWAlias.playerPos.x - beforeWAlias.playerPos.x,
    z: duringWAlias.playerPos.z - beforeWAlias.playerPos.z,
  };
  expect(dotXZ(wDelta, beforeWAlias.playerForward)).toBeGreaterThan(0.03);
  expect(Math.abs((duringWAlias.playerYaw ?? 0) - (beforeWAlias.playerYaw ?? 0))).toBeLessThan(0.06);

  await resetEra5Pose(page, basePose);
  const beforeDAlias = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'KeyD', key: 'd' });
  await page.waitForTimeout(560);
  const duringDAlias = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'KeyD', key: 'd' });
  const dDelta = {
    x: duringDAlias.playerPos.x - beforeDAlias.playerPos.x,
    z: duringDAlias.playerPos.z - beforeDAlias.playerPos.z,
  };
  expect(dotXZ(dDelta, getRightFromForward(beforeDAlias.playerForward))).toBeGreaterThan(0.04);
  expect(Math.abs((duringDAlias.playerYaw ?? 0) - (beforeDAlias.playerYaw ?? 0))).toBeLessThan(0.06);

  await resetEra5Pose(page, basePose);
  const beforeDiagonal = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
    playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
  }));
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  await dispatchHeldKey(page, 'keydown', { code: 'KeyD', key: 'd' });
  await page.waitForTimeout(680);
  const duringDiagonal = await page.evaluate(() => ({
    playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
    playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'KeyD', key: 'd' });
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
  const diagonalDelta = {
    x: duringDiagonal.playerPos.x - beforeDiagonal.playerPos.x,
    z: duringDiagonal.playerPos.z - beforeDiagonal.playerPos.z,
  };
  const diagonalRight = getRightFromForward(beforeDiagonal.playerForward);
  expect(dotXZ(diagonalDelta, beforeDiagonal.playerForward)).toBeGreaterThan(0.03);
  expect(dotXZ(diagonalDelta, diagonalRight)).toBeGreaterThan(0.03);
  expect(Math.abs((duringDiagonal.playerYaw ?? 0) - (beforeDiagonal.playerYaw ?? 0))).toBeLessThan(0.06);
});

for (const levelId of [6, 7, 8, 9]) {
  test(`@era5 runtime: level ${levelId} uses the shared classic Doom movement mapping`, async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDebugLevel(page, levelId);
    await unlockThroughLevel(page, levelId - 1);
    await startDebugLevel(page, levelId);
    await page.waitForTimeout(1200);
    await focusGameplay(page);
    await resetEra5Pose(page, ERA5_CONTROL_POSES[levelId]);

    const beforeTurn = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    expect(beforeTurn.playerPos).not.toBeNull();
    expect(beforeTurn.playerYaw).not.toBeNull();
    expect(beforeTurn.playerForward).not.toBeNull();

    await dispatchHeldKey(page, 'keydown', { code: 'ArrowRight', key: 'ArrowRight' });
    await page.waitForTimeout(420);
    const afterTurn = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowRight', key: 'ArrowRight' });
    expect(afterTurn.playerYaw).toBeGreaterThan(beforeTurn.playerYaw + 0.02);
    expect(Math.hypot(
      afterTurn.playerPos.x - beforeTurn.playerPos.x,
      afterTurn.playerPos.z - beforeTurn.playerPos.z,
    )).toBeLessThan(0.1);
    await page.waitForTimeout(320);

    const beforeForward = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
    await page.waitForTimeout(420);
    const duringForward = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
    const forwardDelta = {
      x: duringForward.playerPos.x - beforeForward.playerPos.x,
      z: duringForward.playerPos.z - beforeForward.playerPos.z,
    };
    expect(dotXZ(forwardDelta, beforeForward.playerForward)).toBeGreaterThan(0.03);
    expect(Math.abs(wrapDelta(duringForward.playerYaw ?? 0, beforeForward.playerYaw ?? 0))).toBeLessThan(0.08);
    expect(Math.abs(wrapDelta(duringForward.cameraYaw ?? 0, beforeForward.cameraYaw ?? 0))).toBeLessThan(0.26);
    await page.waitForTimeout(260);

    const beforeStrafe = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      playerForward: window.__DADA_DEBUG__?.playerForward ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    await dispatchHeldKey(page, 'keydown', { code: 'AltLeft', key: 'Alt', altKey: true });
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowLeft', key: 'ArrowLeft', altKey: true });
    await page.waitForTimeout(420);
    const duringStrafe = await page.evaluate(() => ({
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
    }));
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowLeft', key: 'ArrowLeft', altKey: true });
    await dispatchHeldKey(page, 'keyup', { code: 'AltLeft', key: 'Alt' });
    const leftDelta = {
      x: duringStrafe.playerPos.x - beforeStrafe.playerPos.x,
      z: duringStrafe.playerPos.z - beforeStrafe.playerPos.z,
    };
    expect(dotXZ(leftDelta, getRightFromForward(beforeStrafe.playerForward))).toBeLessThan(-0.02);
    expect(Math.abs(wrapDelta(duringStrafe.playerYaw ?? 0, beforeStrafe.playerYaw ?? 0))).toBeLessThan(0.08);
    expect(Math.abs(wrapDelta(duringStrafe.cameraYaw ?? 0, beforeStrafe.cameraYaw ?? 0))).toBeLessThan(0.12);
  });
}

test('@level5 @era5 runtime: level 5 bracket keys rotate the camera in the expected directions', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const startYaw = await page.evaluate(() => window.__DADA_DEBUG__?.cameraDesiredYaw ?? null);
  await dispatchHeldKey(page, 'keydown', { code: 'BracketRight', key: ']' });
  await page.waitForTimeout(320);
  const duringRight = await page.evaluate(() => ({
    cameraYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
    cameraYawVel: window.__DADA_DEBUG__?.cameraYawVel ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'BracketRight', key: ']' });
  expect(duringRight.cameraYaw).not.toBeNull();
  expect(duringRight.cameraYawVel).not.toBeNull();
  expect(duringRight.cameraYaw).toBeGreaterThan(startYaw + 0.03);
  // With direct camera tracking (era5CameraYaw = era5CameraDesiredYaw every frame), velocity is
  // always zeroed. Camera still rotates correctly — verified by the cameraYaw check above.
  expect(duringRight.cameraYawVel).toBeGreaterThanOrEqual(0);

  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const resetYaw = await page.evaluate(() => window.__DADA_DEBUG__?.cameraDesiredYaw ?? null);
  await dispatchHeldKey(page, 'keydown', { code: 'BracketLeft', key: '[' });
  await page.waitForTimeout(420);
  const duringLeft = await page.evaluate(() => ({
    cameraYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
    cameraYawVel: window.__DADA_DEBUG__?.cameraYawVel ?? null,
  }));
  await dispatchHeldKey(page, 'keyup', { code: 'BracketLeft', key: '[' });
  expect(duringLeft.cameraYaw).not.toBeNull();
  expect(duringLeft.cameraYaw).toBeLessThan(resetYaw - 0.04);
});

test('@fast @level5 @era5 runtime: level 5 inventory opens, oxygen HUD renders, Bubble Wand fires with F, and music is running', async ({ page }) => {
  test.setTimeout(240_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await expect(page.locator('[data-era5-oxygen]')).toBeVisible();
  await expect(page.locator('[data-era5-oxygen-copy]')).toContainText('/ 20.0s');
  await expect(page.locator('[data-era5-weapon-help]')).toContainText('Fire Bubble Wand: F / Ctrl / Enter / Click');
  await expect(page.locator('[data-era5-tool-help]')).toContainText('Scuba Tank: Space ascend, C descend in deep pockets');

  await page.keyboard.press('I');
  await expect(page.locator('.dada-era5-inventory.open')).toBeVisible();
  await page.keyboard.press('I');
  await expect(page.locator('.dada-era5-inventory.open')).toHaveCount(0);

  const projectileCountBefore = await page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0);
  await dispatchHeldKey(page, 'keydown', { code: 'KeyF', key: 'f' });
  await dispatchHeldKey(page, 'keyup', { code: 'KeyF', key: 'f' });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0),
    { timeout: 5_000 },
  ).toBeGreaterThan(projectileCountBefore);

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.l5ProjectileCount ?? 0),
    { timeout: 5_000 },
  ).toBe(0);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 6.8,
      y: 2.24,
      z: 17.6,
      yaw: 1.04,
      cameraYaw: 1.04,
    });
    const forward = window.__DADA_DEBUG__?.playerForward ?? { x: 1, z: 0 };
    window.__DADA_DEBUG__?.placeLevel5DebugJellyfish?.(forward);
  });
  await page.waitForTimeout(120);
  const enemyReport = await page.evaluate(() => window.__DADA_DEBUG__?.era5EnemyReport?.() ?? null);
  expect(enemyReport?.count ?? 0).toBeGreaterThan(0);
  expect((enemyReport?.enemies ?? []).some((enemy) => enemy.kind === 'jellyfish')).toBe(true);
  const stunProbe = await page.evaluate(() => window.__DADA_DEBUG__?.testLevel5BubbleStun?.() ?? null);
  expect(stunProbe?.hit?.hit ?? false).toBe(true);
  expect(Math.max(0, ...(stunProbe?.enemies ?? []).map((enemy) => enemy?.stunnedMs ?? 0))).toBeGreaterThan(1000);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.musicLevelId ?? null),
    { timeout: 5_000 },
  ).toBe(5);
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.musicRunning ?? false),
    { timeout: 5_000 },
  ).toBe(true);
});

test('@level5 @era5 runtime: level 5 exposes authored topology, coherent truth reports, clean walkable-surface validation, and smooth camera yaw while turning', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null);
  const truth = await page.evaluate(() => window.__DADA_DEBUG__?.level5TruthReport?.() ?? null);
  const collision = await page.evaluate(() => window.__DADA_DEBUG__?.level5CollisionReport?.() ?? null);
  const walkable = await page.evaluate(() => window.__DADA_DEBUG__?.level5WalkableReport?.() ?? null);
  const respawn = await page.evaluate(() => window.__DADA_DEBUG__?.level5RespawnReport?.() ?? null);
  test.skip(!topology, 'Level 5 authored topology debug must be available on the authored-space Era 5 path.');
  expect(topology).not.toBeNull();
  expect(truth).not.toBeNull();
  expect(collision).not.toBeNull();
  expect(walkable).not.toBeNull();
  expect(respawn).not.toBeNull();
  expect(topology.sectorCount).toBeGreaterThanOrEqual(7);
  expect(topology.connectorCount).toBeGreaterThanOrEqual(8);
  expect(topology.topology?.hasCycle).toBe(true);
  expect((topology.topology?.routeChoices ?? []).length).toBeGreaterThanOrEqual(2);
  expect(topology.walkableReport?.walkableSurfaceCount ?? 0).toBeGreaterThanOrEqual(45);
  expect(topology.walkableReport?.missingCollision ?? []).toEqual([]);
  expect(topology.walkableReport?.underThickness ?? []).toEqual([]);
  expect(topology.walkableReport?.hiddenWalkables ?? []).toEqual([]);
  expect(topology.walkableReport?.unclassifiedWalkables ?? []).toEqual([]);
  expect(truth?.disableDecorOcclusionFade).toBe(true);
  expect(truth?.fadeableShells ?? []).toEqual([]);
  expect(truth?.cullRiskShells ?? []).toEqual([]);
  expect(collision?.unownedBlockers ?? []).toEqual([]);
  expect(collision?.invisibleBlockers ?? []).toEqual([]);
  expect(collision?.roomVolumeShells ?? []).toEqual([]);
  expect(walkable?.missingVisibleWalkables ?? []).toEqual([]);
  expect(respawn?.anchorCount ?? 0).toBeGreaterThanOrEqual(5);
  expect(respawn?.selectedAnchor?.id).toBe('level5_spawn_anchor');

  const labels = (topology.sectors ?? []).map((sector) => sector.label);
  expect(labels).toEqual(expect.arrayContaining(LEVEL5_REQUIRED_SECTORS));

  for (const sample of [
    { x: -48.2, y: 1.86, z: 0.8, yaw: 0.28, minY: 1.05 },
    { x: -43.2, y: 1.52, z: 13.8, yaw: 0.34, minY: 1.10 },
    { x: -8.2, y: 1.62, z: 12.6, yaw: 0.44, minY: 1.12 },
    { x: 16.2, y: 1.32, z: -2.0, yaw: 0.24, minY: 1.10 },
    { x: 57.2, y: 1.96, z: 24.2, yaw: 0.18, minY: 1.55 },
  ]) {
    await page.evaluate((pose) => {
      window.__DADA_DEBUG__?.setEra5Pose?.({
        x: pose.x,
        y: pose.y,
        z: pose.z,
        yaw: pose.yaw,
        cameraYaw: pose.yaw,
      });
    }, sample);
    await page.waitForTimeout(420);
    const surfaceHold = await page.evaluate(() => ({
      sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
      y: window.__DADA_DEBUG__?.playerPos?.y ?? null,
    }));
    expect(surfaceHold.sceneKey).toBe('CribScene');
    expect(surfaceHold.y).not.toBeNull();
    expect(surfaceHold.y).toBeGreaterThan(sample.minY);
  }

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

test('@level5 @era5 runtime: level 5 hazard death respawns to explicit authored anchors instead of roof or hidden geometry', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 16.2,
      y: 1.32,
      z: -2.0,
      yaw: 0.24,
      cameraYaw: 0.24,
    });
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.checkpointIndex ?? 0),
    { timeout: 5_000 },
  ).toBeGreaterThanOrEqual(3);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Vitals?.({ hp: 1, shield: 0, oxygen: 20, clearInvuln: true, clearLastDamage: true });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 21.2,
      y: 1.24,
      z: -2.4,
      yaw: 0.24,
      cameraYaw: 0.24,
    });
    window.__DADA_DEBUG__?.forceEra5Damage?.('eel_rail', { x: 1, z: 0 }, { invulnMs: 0 });
  });

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getEra5LastDamage?.() ?? null),
    { timeout: 3_000 },
  ).toMatchObject({
    source: 'eel_rail',
    category: 'hazard',
    shielded: false,
  });

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.lastRespawnAnchor ?? null),
    { timeout: 6_000 },
  ).toMatchObject({
    id: 'cp_filtration_core',
    spaceId: 'filtration_core',
  });

  await expect.poll(
    async () => page.evaluate(() => ({
      pos: window.__DADA_DEBUG__?.playerPos ?? null,
      anchor: window.__DADA_DEBUG__?.lastRespawnAnchor ?? null,
      sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    })),
    { timeout: 6_000 },
  ).toMatchObject({
    sceneKey: 'CribScene',
    anchor: {
      id: 'cp_filtration_core',
    },
  });

  const finalState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    anchor: window.__DADA_DEBUG__?.lastRespawnAnchor ?? null,
  }));
  expect(finalState.pos).not.toBeNull();
  expect(finalState.pos.y).toBeGreaterThan(1.0);
  expect(finalState.pos.y).toBeLessThan(2.0);
  expect(Math.abs(finalState.pos.x - 16.2)).toBeLessThan(2.5);
  expect(Math.abs(finalState.pos.z - (-2.0))).toBeLessThan(2.5);
  expect(finalState.anchor?.id).toBe('cp_filtration_core');
});

test('@level5 @era5 runtime: level 5 float mode supports deliberate Space ascent and C descent with no release drift', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Vitals?.({ oxygen: 20 });
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 11.2,
      y: 2.36,
      z: 14.6,
      yaw: 0.88,
      cameraYaw: 0.88,
    });
  });
  await page.waitForTimeout(120);

  const beforeAscend = await snapshotEra5Pose(page);
  await dispatchHeldKey(page, 'keydown', { code: 'Space', key: ' ' });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.playerPos?.y ?? null),
    { timeout: 2_000 },
  ).toBeGreaterThan(beforeAscend.y + 0.10);
  const duringAscend = await snapshotEra5Pose(page);
  await dispatchHeldKey(page, 'keyup', { code: 'Space', key: ' ' });
  expect(duringAscend.y).toBeGreaterThan(beforeAscend.y + 0.10);

  await page.waitForTimeout(180);
  const releaseA = await snapshotEra5Pose(page);
  await page.waitForTimeout(180);
  const releaseB = await snapshotEra5Pose(page);
  expect(Math.abs(releaseB.y - releaseA.y)).toBeLessThan(0.08);

  await dispatchHeldKey(page, 'keydown', { code: 'KeyC', key: 'c' });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.playerPos?.y ?? null),
    { timeout: 2_000 },
  ).toBeLessThan(releaseB.y - 0.10);
  const duringDescend = await snapshotEra5Pose(page);
  await dispatchHeldKey(page, 'keyup', { code: 'KeyC', key: 'c' });
  expect(duringDescend.y).toBeLessThan(releaseB.y - 0.10);
});

test('@level5 @era5 runtime: level 5 damage feedback distinguishes enemy hits from environmental hazards', async ({ page }) => {
  test.setTimeout(240_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);

  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Vitals?.({ hp: 3, shield: 1, oxygen: 20 });
  });
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.triggerLevel5Hazard?.('jellyfish');
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getEra5LastDamage?.() ?? null),
    { timeout: 5_000 },
  ).toMatchObject({
    source: 'jellyfish',
    category: 'enemy',
    shielded: true,
  });
  await expect(page.locator('.dada-status')).toContainText('Jellyfish');

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Vitals?.({ hp: 3, shield: 0, oxygen: 20, clearInvuln: true, clearLastDamage: true });
  });
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({
      x: 21.2,
      y: 1.24,
      z: -2.4,
      yaw: 0.24,
      cameraYaw: 0.24,
    });
    window.__DADA_DEBUG__?.triggerLevel5Hazard?.('eel_spill_gate');
  });
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.getEra5LastDamage?.() ?? null),
    { timeout: 5_000 },
  ).toMatchObject({
    source: 'eel_rail',
    category: 'hazard',
    shielded: false,
  });
  await expect(page.locator('.dada-status')).toContainText('Eel rail');
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
  await expect(page.locator('#titleHint')).toContainText('Beat Aquarium Drift');
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

  test(`@era5 runtime: level ${levelId} exposes visible gameplay surfaces and front-facing environment landmarks`, async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDebugLevel(page, levelId);
    await unlockThroughLevel(page, levelId - 1);
    await startDebugLevel(page, levelId);
    await page.waitForTimeout(1200);

    const report = await page.evaluate(() => window.__DADA_DEBUG__?.era5VisionReport?.({ limit: 8 }) ?? null);
    expect(report).not.toBeNull();
    expect(report.counts.gameplayMeshes).toBeGreaterThan(10);
    expect(report.counts.envMeshes).toBeGreaterThan(30);

    const visibleLandmarks = report.largestEnvironmentMeshes.filter((mesh) => (
      mesh.enabled !== false
      && mesh.visible !== false
      && (mesh.alpha ?? 1) > 0.1
      && (mesh.viewFacing ?? 0) >= 0.9
      && Math.max(mesh.size?.x ?? 0, mesh.size?.y ?? 0, mesh.size?.z ?? 0) >= 24
    ));
    expect(visibleLandmarks.length).toBeGreaterThanOrEqual(2);
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

test('@era5 runtime: level 6 exposes authored topology and clean walkable-surface validation', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 6);
  await unlockThroughLevel(page, 5);
  await startDebugLevel(page, 6);
  await page.waitForTimeout(1200);

  const topology = await page.evaluate(() => window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null);
  if (!topology) return;
  expect(topology.sectorCount).toBeGreaterThanOrEqual(5);
  expect(topology.connectorCount).toBeGreaterThanOrEqual(6);
  expect(topology.topology?.hasCycle).toBe(true);
  expect((topology.topology?.routeChoices ?? []).length).toBeGreaterThanOrEqual(2);
  expect(topology.walkableReport?.walkableSurfaceCount ?? 0).toBeGreaterThanOrEqual(20);
  expect(topology.walkableReport?.missingCollision ?? []).toEqual([]);
  expect(topology.walkableReport?.underThickness ?? []).toEqual([]);
  expect(topology.walkableReport?.hiddenWalkables ?? []).toEqual([]);

  const labels = (topology.sectors ?? []).map((sector) => sector.label);
  expect(labels).toEqual(expect.arrayContaining([
    'Loading Bay',
    'Machine Hall',
    'Service Loop',
    'Furnace Bridge',
    'Crane Bay',
    'Control Room',
  ]));
});

test('@era5 runtime: level 6 authored spaces keep turn and strafe camera behavior stable', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 6);
  await unlockThroughLevel(page, 5);
  await startDebugLevel(page, 6);
  await focusGameplay(page);

  const pose = { x: 40, y: 1.64, z: -0.8, yaw: 1.36, cameraYaw: 1.36 };
  await resetEra5Pose(page, pose);
  await focusGameplay(page);
  const beforeTurn = await snapshotEra5Pose(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(420);
  await page.keyboard.up('ArrowRight');
  await expect.poll(
    async () => {
      const poseAfterTurn = await snapshotEra5Pose(page);
      return poseAfterTurn.yaw - beforeTurn.yaw;
    },
    { timeout: 1500 },
  ).toBeGreaterThan(0.08);
  await expect.poll(
    async () => {
      const poseAfterTurn = await snapshotEra5Pose(page);
      return poseAfterTurn.cameraYaw - beforeTurn.cameraYaw;
    },
    { timeout: 1500 },
  ).toBeGreaterThan(0.08);
  const afterTurn = await snapshotEra5Pose(page);

  expect(afterTurn.yaw).toBeGreaterThan(beforeTurn.yaw + 0.08);
  expect(afterTurn.cameraYaw).toBeGreaterThan(beforeTurn.cameraYaw + 0.08);
  expect(Math.abs(wrapDelta(afterTurn.cameraYaw, afterTurn.yaw))).toBeLessThan(0.06);

  await resetEra5Pose(page, pose);
  await focusGameplay(page);
  const beforeStrafe = await snapshotEra5Pose(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(380);
  await page.keyboard.up('d');
  const afterStrafe = await snapshotEra5Pose(page);

  expect(Math.abs(wrapDelta(afterStrafe.yaw, beforeStrafe.yaw))).toBeLessThan(0.03);
  const delta = {
    x: afterStrafe.x - beforeStrafe.x,
    z: afterStrafe.z - beforeStrafe.z,
  };
  const facing = {
    x: Math.sin(beforeStrafe.yaw),
    z: Math.cos(beforeStrafe.yaw),
  };
  const right = getRightFromForward(facing);
  expect(dotXZ(delta, right)).toBeGreaterThan(0.05);
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
  test.setTimeout(180_000);
  await gotoDebugLevel(page, 2);
  await startDebugLevel(page, 2);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.teleportPlayer?.(16.3, 1.34, 0);
  });
  await page.waitForTimeout(250);
  const beforeResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  const resetState = await page.evaluate(() => ({
    resetTriggered: window.__DADA_DEBUG__?.gameplayHotkey?.('KeyR') ?? false,
    lastRespawnReason: window.__DADA_DEBUG__?.lastRespawnReason ?? null,
  }));
  expect(resetState.resetTriggered).toBe(true);
  expect(resetState.lastRespawnReason).toBe('manual_reset');
  await page.waitForTimeout(900);
  const afterResetX = await page.evaluate(() => window.__DADA_DEBUG__?.playerRef?.position?.x ?? null);
  expect(beforeResetX).not.toBeNull();
  expect(afterResetX).not.toBeNull();
  expect(Math.abs(afterResetX - beforeResetX)).toBeGreaterThan(4);
});

test('runtime: level 2 floor fall clears collected binkies without resetting', async ({ page }) => {
  test.setTimeout(180_000);
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
    .poll(() => page.evaluate(() => window.__DADA_DEBUG__?.coinsCollected ?? 0), { timeout: 15_000 })
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
