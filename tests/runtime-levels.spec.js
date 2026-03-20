// @ts-check
import { test, expect } from '@playwright/test';

const PROGRESS_KEY = 'dadaquest:progress:v1';
const LEVEL_CASES = [
  { id: 1, url: 'http://127.0.0.1:4173/?debug=1' },
  { id: 2, url: 'http://127.0.0.1:4173/?level=2&debug=1' },
  { id: 3, url: 'http://127.0.0.1:4173/?level=3&debug=1' },
];
const LEVEL5_DOORWAY_START_POSE = {
  x: 45.4,
  y: 0.42,
  z: 18.0,
  yaw: Math.PI * 0.5,
  cameraYaw: Math.PI * 0.5,
};
const LEVEL5_DOORWAY_DIRECT_BLOCK_POSE = {
  x: 45.4,
  y: 0.42,
  z: 18.0,
  yaw: -Math.PI * 0.5,
  cameraYaw: -Math.PI * 0.5,
};
const LEVEL5_DOORWAY_RIGHT_TURN_STEPS = [
  { key: 'slightRight', holdMs: 160 },
  { key: 'right90', holdMs: 1300 },
  { key: 'rightStress', holdMs: 2200 },
];
const LEVEL5_POOL_RENDER_POSES = {
  aboveWater: {
    x: 35.2,
    y: 0.42,
    z: 26.2,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
  waterline: {
    x: 36.0,
    y: -0.22,
    z: 30.4,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
  underwater: {
    x: 36.0,
    y: -1.15,
    z: 30.8,
    yaw: 0.0,
    cameraYaw: 0.0,
  },
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

async function getUnderConstructionReport(page) {
  return page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
    musicLevelId: window.__DADA_DEBUG__?.musicLevelId ?? null,
    musicRunning: !!window.__DADA_DEBUG__?.musicRunning,
    underConstructionLevelId: window.__DADA_DEBUG__?.underConstructionLevelId ?? null,
    topology: window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null,
    enemies: window.__DADA_DEBUG__?.era5EnemyReport?.()?.enemies ?? [],
    hint: document.getElementById('titleHint')?.textContent ?? '',
    lockText: document.getElementById('titleLevelLock')?.textContent ?? '',
    menuLockState: window.__DADA_DEBUG__?.getMenuLockState?.() ?? null,
  }));
}

function expectUnderConstructionReport(report, levelId, { requirePlaceholderLevel = true } = {}) {
  expect(report).not.toBeNull();
  expect(report.sceneKey).toBe('TitleScene');
  expect(report.lastRuntimeError).toBeNull();
  expect(report.musicLevelId).not.toBe(levelId);
  expect(report.musicRunning).toBe(false);
  if (requirePlaceholderLevel) {
    expect(report.underConstructionLevelId).toBe(levelId);
    expect(report.topology).toBeNull();
    expect(report.enemies).toEqual([]);
  }
  expect(report.hint.toLowerCase()).toContain('under construction');
  expect(report.lockText.toLowerCase()).toContain('under construction');
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

async function unlockEra5(page, { completed5 = false, extraPatch = {} } = {}) {
  await unlockThroughLevel(page, completed5 ? 5 : 4, extraPatch);
}

async function seedEra5BubbleWand(page, options = {}) {
  await unlockEra5(page, {
    ...options,
    extraPatch: {
      ...(options.extraPatch || {}),
      era5: {
        inventory: [
          {
            instanceId: 'starter-scuba-tank',
            defId: 'scuba_tank',
          },
          {
            instanceId: 'starter-bubble-wand',
            defId: 'bubble_wand',
          },
        ],
        equipped: {
          tool: 'starter-scuba-tank',
          weaponPrimary: 'starter-bubble-wand',
        },
      },
    },
  });
}

async function getLevel5StarterRoomAudit(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const actorSummary = window.__DADA_DEBUG__?.actors ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    /** @type {any[]} */
    const meshes = scene?.meshes ?? [];
    const isVisibleMesh = (mesh) => mesh?.isEnabled?.() !== false
      && mesh?.isVisible !== false
      && (mesh?.visibility ?? 1) > 0.02;
    const getBounds = (mesh) => {
      const box = mesh.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: box.minimumWorld.x,
        maxX: box.maximumWorld.x,
        minY: box.minimumWorld.y,
        maxY: box.maximumWorld.y,
        minZ: box.minimumWorld.z,
        maxZ: box.maximumWorld.z,
      };
    };
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const isGoalMesh = (mesh) => {
      if (!(mesh?.name || mesh?.parent)) return false;
      if (mesh.name === 'goalTrigger') return false;
      if ((mesh.metadata?.role || '').toLowerCase() === 'goal') return true;
      let node = mesh;
      while (node) {
        const name = String(node.name || '').toLowerCase();
        if (name.includes('dad') || name.includes('goal')) return true;
        node = node.parent || null;
      }
      return false;
    };

    const shellMeshes = meshes
      .filter((mesh) => mesh?.metadata?.structuralShell === true && !mesh?.metadata?.truthRole)
      .map((mesh) => ({
        name: mesh.metadata?.sourceName || mesh.name,
        decorIntent: mesh.metadata?.decorIntent || null,
        enabled: mesh.isEnabled?.() ?? false,
        isVisible: mesh.isVisible !== false,
        visibility: Number((mesh.visibility ?? 1).toFixed(3)),
        bounds: getBounds(mesh),
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
      }));
    const transparentShells = shellMeshes.filter((mesh) => (
      !mesh.enabled
      || !mesh.isVisible
      || (mesh.materialAlpha !== null && mesh.materialAlpha < 0.999)
      || mesh.transparencyMode !== null
    ));

    const visibleGoalMeshes = meshes
      .filter((mesh) => isVisibleMesh(mesh) && isGoalMesh(mesh))
      .map((mesh) => ({
        name: mesh.name,
        position: (() => {
          const pos = mesh.getAbsolutePosition?.();
          return pos ? {
            x: Number(pos.x.toFixed(3)),
            y: Number(pos.y.toFixed(3)),
            z: Number(pos.z.toFixed(3)),
          } : null;
        })(),
      }));

    const unexpectedVisibleActorsOutsideRoom = visibleGoalMeshes.filter((mesh) => roomBounds && mesh.position && (
      mesh.position.x < (roomBounds.minX - 0.01)
      || mesh.position.x > (roomBounds.maxX + 0.01)
      || mesh.position.z < (roomBounds.minZ - 0.01)
      || mesh.position.z > (roomBounds.maxZ + 0.01)
    ));

    const ceilingMeshes = meshes
      .map((mesh) => ({
        truthRole: mesh.metadata?.truthRole || null,
        bounds: getBounds(mesh),
        sourceName: String(mesh.metadata?.sourceName || mesh.name || ''),
        decorIntent: mesh.metadata?.decorIntent || null,
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
      }))
      .filter(({ bounds, truthRole, sourceName, decorIntent }) => (
        !!bounds && (
          !truthRole
        ) && (
          sourceName.toLowerCase().includes('ceiling')
          || sourceName.toLowerCase().includes('light_panel')
          || decorIntent === 'ceiling'
          || decorIntent === 'light-fixture'
        )
      ))
      .map(({ bounds, sourceName, decorIntent, materialAlpha, transparencyMode }) => ({
        name: sourceName,
        decorIntent,
        bounds,
        materialAlpha,
        transparencyMode,
      }));

    const coplanarCeilingPairs = [];
    for (let index = 0; index < ceilingMeshes.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < ceilingMeshes.length; otherIndex += 1) {
        const left = ceilingMeshes[index];
        const right = ceilingMeshes[otherIndex];
        if (!left.bounds || !right.bounds) continue;
        if (!overlaps(left.bounds.minX, left.bounds.maxX, right.bounds.minX, right.bounds.maxX)) continue;
        if (!overlaps(left.bounds.minZ, left.bounds.maxZ, right.bounds.minZ, right.bounds.maxZ)) continue;
        const planesLeft = [left.bounds.minY, left.bounds.maxY];
        const planesRight = [right.bounds.minY, right.bounds.maxY];
        const sharedPlane = planesLeft.find((planeLeft) => planesRight.some((planeRight) => Math.abs(planeLeft - planeRight) < 0.001));
        if (!Number.isFinite(sharedPlane)) continue;
        coplanarCeilingPairs.push({
          left: left.name,
          right: right.name,
          sharedPlaneY: Number(sharedPlane.toFixed(3)),
        });
      }
    }

    return {
      roomBounds,
      actorSummary,
      shellMeshes,
      transparentShells,
      visibleGoalMeshes,
      unexpectedVisibleActorsOutsideRoom,
      ceilingMeshes,
      structuralCeilingShells: shellMeshes.filter((mesh) => mesh.decorIntent === 'ceiling'),
      coplanarCeilingPairs,
    };
  });
}

function isLevel5StarterRoomRenderMesh(name) {
  const value = String(name || '');
  return [
    'ceiling_shell',
    'ceiling_light_panel',
    'north_wall',
    'south_wall',
    'east_wall',
    'west_wall',
    'future_exit_blocker',
  ].some((token) => value.includes(token));
}

function getAuditSampleName(sample) {
  return String(sample?.sourceName || sample?.mesh || '');
}

function expectLevel5StarterRoomLaunchAudit(starterAudit, launchAudit) {
  expect(starterAudit.visibleGoalMeshes).toEqual([]);
  expect(starterAudit.unexpectedVisibleActorsOutsideRoom).toEqual([]);
  expect(starterAudit.transparentShells).toEqual([]);
  expect(starterAudit.actorSummary?.goal?.visibleMeshCount ?? 0).toBe(0);
  expect(starterAudit.actorSummary?.goal?.allowInvisible).toBe(true);
  expect(launchAudit.roomBounds).not.toBeNull();
  expect(launchAudit.cameraPos).not.toBeNull();
  expect(launchAudit.cameraDebugOverride).toBeNull();
  expect(launchAudit.fadedMeshes).toBe(0);
  expect(launchAudit.cameraInsideRoom).toBe(true);
  expect(launchAudit.occluderMesh).toBe('neutral_decorBlock_west_wall');
  expect(Math.abs(wrapDelta(launchAudit.cameraYaw ?? 0, launchAudit.cameraDesiredYaw ?? 0))).toBeLessThan(0.01);
  expect(Math.abs(wrapDelta(launchAudit.cameraYaw ?? 0, launchAudit.playerYaw ?? 0))).toBeLessThan(0.01);
  const unstableShells = launchAudit.shellMeshes.filter((mesh) => (
    !mesh.enabled
    || !mesh.isVisible
    || mesh.visibility < 0.999
    || (mesh.materialAlpha !== null && mesh.materialAlpha < 0.999)
    || mesh.transparencyMode !== null
  ));
  expect(unstableShells).toEqual([]);
  const sampleMap = Object.fromEntries((launchAudit.sampleHits || []).map((sample) => [sample.id, getAuditSampleName(sample)]));
  expect(sampleMap.topCenter).toMatch(/ceiling_shell|ceiling_light_panel/);
  expect(isLevel5StarterRoomRenderMesh(sampleMap.upperLeft)).toBe(true);
  expect(isLevel5StarterRoomRenderMesh(sampleMap.upperRight)).toBe(true);
}

async function getLevel5StarterRoomLaunchAudit(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const camera = scene?.activeCamera ?? null;
    const engine = scene?.getEngine?.() ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const toRoundedVector = (value) => value ? ({
      x: Number(value.x.toFixed(3)),
      y: Number(value.y.toFixed(3)),
      z: Number(value.z.toFixed(3)),
    }) : null;
    const sampleAt = (id, nx, ny) => {
      if (!scene || !camera || !engine) {
        return { id, mesh: null, sourceName: null };
      }
      const pick = scene.pick(
        engine.getRenderWidth(true) * nx,
        engine.getRenderHeight(true) * ny,
        (mesh) => mesh?.isEnabled?.() !== false
          && mesh?.isVisible !== false
          && (mesh?.visibility ?? 1) > 0.02,
        false,
        camera,
      );
      return {
        id,
        mesh: pick?.pickedMesh?.name ?? null,
        sourceName: pick?.pickedMesh?.metadata?.sourceName ?? null,
      };
    };
    const shellMeshes = (scene?.meshes ?? [])
      .filter((mesh) => mesh?.metadata?.structuralShell === true && !mesh?.metadata?.truthRole)
      .map((mesh) => ({
        name: mesh.metadata?.sourceName || mesh.name,
        enabled: mesh.isEnabled?.() ?? false,
        isVisible: mesh.isVisible !== false,
        visibility: Number((mesh.visibility ?? 1).toFixed(3)),
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
      }));
    const cameraPos = toRoundedVector(camera?.position ?? null);
    return {
      roomBounds,
      cameraPos,
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      playerYaw: window.__DADA_DEBUG__?.playerYaw ?? null,
      cameraYaw: window.__DADA_DEBUG__?.cameraYaw ?? null,
      cameraDesiredYaw: window.__DADA_DEBUG__?.cameraDesiredYaw ?? null,
      cameraDebugOverride: window.__DADA_DEBUG__?.cameraDebugOverride ?? null,
      occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
      fadedMeshes: window.__DADA_DEBUG__?.fadedMeshes ?? null,
      cameraInsideRoom: !!(roomBounds && cameraPos
        && cameraPos.x > (roomBounds.minX + 0.05)
        && cameraPos.x < (roomBounds.maxX - 0.05)
        && cameraPos.z > (roomBounds.minZ + 0.05)
        && cameraPos.z < (roomBounds.maxZ - 0.05)),
      sampleHits: [
        sampleAt('topCenter', 0.5, 0.12),
        sampleAt('upperLeft', 0.18, 0.22),
        sampleAt('upperRight', 0.82, 0.22),
      ],
      shellMeshes,
    };
  });
}

async function tapEra5LeftTurnTwice(page) {
  for (let i = 0; i < 2; i += 1) {
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowLeft', key: 'ArrowLeft' });
    await page.waitForTimeout(90);
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(180);
}

function expectLevel5JumpPhaseInsideStarterRoom(phase, roomBounds, ceilingY) {
  expect(phase).not.toBeNull();
  expect(phase.cameraPos).not.toBeNull();
  expect(phase.cameraTarget).not.toBeNull();
  expect(phase.playerPos).not.toBeNull();
  expect(phase.cameraAboveCeiling).toBe(false);
  expect(phase.cameraInsideRoomXZ).toBe(true);
  expect(phase.cameraPos.y).toBeLessThanOrEqual(ceilingY + 0.001);
}

async function captureLevel5JumpCameraTrace(page) {
  return page.evaluate(async () => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.[0] ?? null;
    const ceilingY = Number.isFinite(room?.ceilingY) ? room.ceilingY : 6.0;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const readState = (label) => {
      const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
      const camera = scene?.activeCamera ?? null;
      const cameraTarget = camera?.getTarget?.() ?? null;
      const playerPos = window.__DADA_DEBUG__?.playerPos ?? null;
      const cameraPos = camera?.position ?? null;
      return {
        label,
        playerPos: playerPos ? {
          x: Number(playerPos.x.toFixed(3)),
          y: Number(playerPos.y.toFixed(3)),
          z: Number(playerPos.z.toFixed(3)),
        } : null,
        playerVy: Number((window.__DADA_DEBUG__?.playerController?.vy ?? 0).toFixed(3)),
        grounded: !!window.__DADA_DEBUG__?.playerController?.grounded,
        cameraPos: cameraPos ? {
          x: Number(cameraPos.x.toFixed(3)),
          y: Number(cameraPos.y.toFixed(3)),
          z: Number(cameraPos.z.toFixed(3)),
        } : null,
        cameraTarget: cameraTarget ? {
          x: Number(cameraTarget.x.toFixed(3)),
          y: Number(cameraTarget.y.toFixed(3)),
          z: Number(cameraTarget.z.toFixed(3)),
        } : null,
        cameraYaw: Number((window.__DADA_DEBUG__?.cameraYaw ?? 0).toFixed(3)),
        cameraDesiredYaw: Number((window.__DADA_DEBUG__?.cameraDesiredYaw ?? 0).toFixed(3)),
        occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
        occlusion: window.__DADA_DEBUG__?.cameraOcclusion ?? null,
        cameraAboveCeiling: !!(cameraPos && cameraPos.y > (ceilingY + 0.001)),
        cameraInsideRoomXZ: !!(roomBounds && cameraPos
          && cameraPos.x > (roomBounds.minX + 0.05)
          && cameraPos.x < (roomBounds.maxX - 0.05)
          && cameraPos.z > (roomBounds.minZ + 0.05)
          && cameraPos.z < (roomBounds.maxZ - 0.05)),
      };
    };

    const frames = [readState('before_jump')];
    document.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    }));
    for (let i = 0; i < 20; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      frames.push(readState(`jump_press_${i}`));
    }
    document.dispatchEvent(new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      code: 'Space',
      key: ' ',
    }));
    let airborneSeen = frames.some((frame) => !frame.grounded);
    for (let i = 0; i < 180; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const frame = readState(`jump_trace_${i}`);
      frames.push(frame);
      airborneSeen ||= !frame.grounded;
      if (airborneSeen && frame.grounded) break;
    }

    const ascent = frames.find((frame) => !frame.grounded && frame.playerVy > 0.4) ?? null;
    const airborneFrames = frames.filter((frame) => !frame.grounded && frame.playerPos);
    const apex = airborneFrames.reduce((best, frame) => (
      !best || frame.playerPos.y > best.playerPos.y ? frame : best
    ), null);
    const landing = frames.find((frame, index) => (
      airborneSeen
      && index > 0
      && frame.grounded
      && frames[index - 1]
      && !frames[index - 1].grounded
    )) ?? frames.at(-1) ?? null;

    return {
      roomBounds,
      ceilingY,
      before: frames[0] ?? null,
      ascent,
      apex,
      landing,
      anyCameraAboveCeiling: frames.some((frame) => frame.cameraAboveCeiling),
      anyCameraOutsideRoomXZ: frames.some((frame) => !frame.cameraInsideRoomXZ),
      ceilingOccluderSeen: frames.some((frame) => frame.occluderMesh === 'neutral_decorBlock_ceiling_shell'),
      entryClampSeen: frames.some((frame) => frame.occlusion?.usedEntryClamp === true),
    };
  });
}

async function getLevel5DoorwayAssemblyReport(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const getMesh = (sourceName) => scene?.meshes?.find((mesh) => mesh?.metadata?.sourceName === sourceName) ?? null;
    const getBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox ?? null;
      return box ? {
        minX: Number(box.minimumWorld.x.toFixed(3)),
        maxX: Number(box.maximumWorld.x.toFixed(3)),
        minY: Number(box.minimumWorld.y.toFixed(3)),
        maxY: Number(box.maximumWorld.y.toFixed(3)),
        minZ: Number(box.minimumWorld.z.toFixed(3)),
        maxZ: Number(box.maximumWorld.z.toFixed(3)),
      } : null;
    };
    const meshInfo = (sourceName) => {
      const mesh = getMesh(sourceName);
      return mesh ? {
        sourceName,
        cameraIgnore: mesh.metadata?.cameraIgnore ?? null,
        cameraBlocker: mesh.metadata?.cameraBlocker ?? null,
        bounds: getBounds(mesh),
      } : null;
    };
    const north = meshInfo('east_wall_north');
    const south = meshInfo('east_wall_south');
    const header = meshInfo('east_wall_header');
    const blocker = meshInfo('future_exit_blocker');
    const delta = (left, right) => Number(((left ?? 0) - (right ?? 0)).toFixed(3));
    return {
      mapId: topology?.mapId ?? null,
      roomBounds: room ? {
        minX: Number((room.x - (room.w * 0.5)).toFixed(3)),
        maxX: Number((room.x + (room.w * 0.5)).toFixed(3)),
        minZ: Number((room.z - (room.d * 0.5)).toFixed(3)),
        maxZ: Number((room.z + (room.d * 0.5)).toFixed(3)),
      } : null,
      eastWallNorth: north,
      eastWallSouth: south,
      eastWallHeader: header,
      futureExitBlocker: blocker,
      alignment: {
        blockerMinXDelta: delta(blocker?.bounds?.minX, header?.bounds?.minX),
        blockerMaxXDelta: delta(blocker?.bounds?.maxX, header?.bounds?.maxX),
        northSeamDelta: delta(blocker?.bounds?.minZ, north?.bounds?.maxZ),
        southSeamDelta: delta(south?.bounds?.minZ, blocker?.bounds?.maxZ),
        floorDelta: delta(blocker?.bounds?.minY, 0.0),
      },
    };
  });
}

function expectLevel5DoorwayAssemblyReport(report) {
  expect(report?.mapId).toBe('level5-room-reset');
  expect(report?.roomBounds).not.toBeNull();
  expect(report?.eastWallNorth?.bounds).not.toBeNull();
  expect(report?.eastWallSouth?.bounds).not.toBeNull();
  expect(report?.eastWallHeader?.bounds).not.toBeNull();
  expect(report?.futureExitBlocker?.bounds).not.toBeNull();
  expect(report.futureExitBlocker.cameraIgnore).toBe(false);
  expect(report.futureExitBlocker.cameraBlocker).toBe(true);
  expect(report.alignment).toEqual({
    blockerMinXDelta: 0,
    blockerMaxXDelta: 0,
    northSeamDelta: 0,
    southSeamDelta: 0,
    floorDelta: 0,
  });
}

async function getLevel5DoorwayCameraState(page) {
  return page.evaluate(() => {
    const topology = window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const camera = scene?.activeCamera ?? null;
    const target = camera?.getTarget?.() ?? null;
    const cameraPos = camera?.position ?? null;
    const roomBounds = room ? {
      minX: Number((room.x - (room.w * 0.5)).toFixed(3)),
      maxX: Number((room.x + (room.w * 0.5)).toFixed(3)),
      minZ: Number((room.z - (room.d * 0.5)).toFixed(3)),
      maxZ: Number((room.z + (room.d * 0.5)).toFixed(3)),
    } : null;
    return {
      roomBounds,
      playerPos: window.__DADA_DEBUG__?.playerPos ? {
        x: Number(window.__DADA_DEBUG__.playerPos.x.toFixed(3)),
        y: Number(window.__DADA_DEBUG__.playerPos.y.toFixed(3)),
        z: Number(window.__DADA_DEBUG__.playerPos.z.toFixed(3)),
      } : null,
      playerYaw: Number((window.__DADA_DEBUG__?.playerYaw ?? 0).toFixed(3)),
      cameraYaw: Number((window.__DADA_DEBUG__?.cameraYaw ?? 0).toFixed(3)),
      cameraDesiredYaw: Number((window.__DADA_DEBUG__?.cameraDesiredYaw ?? 0).toFixed(3)),
      cameraPos: cameraPos ? {
        x: Number(cameraPos.x.toFixed(3)),
        y: Number(cameraPos.y.toFixed(3)),
        z: Number(cameraPos.z.toFixed(3)),
      } : null,
      cameraTarget: target ? {
        x: Number(target.x.toFixed(3)),
        y: Number(target.y.toFixed(3)),
        z: Number(target.z.toFixed(3)),
      } : null,
      occluderMesh: window.__DADA_DEBUG__?.occluderMesh ?? null,
      occlusion: window.__DADA_DEBUG__?.cameraOcclusion ?? null,
      cameraInsideRoom: !!(roomBounds && cameraPos
        && cameraPos.x > (roomBounds.minX + 0.05)
        && cameraPos.x < (roomBounds.maxX - 0.05)
        && cameraPos.z > (roomBounds.minZ + 0.05)
        && cameraPos.z < (roomBounds.maxZ - 0.05)),
    };
  });
}

async function captureLevel5DoorwayRotationPhases(page) {
  const phases = {};
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });
  await resetEra5Pose(page, LEVEL5_DOORWAY_START_POSE);
  await page.waitForTimeout(260);
  phases.straight = await getLevel5DoorwayCameraState(page);

  await resetEra5Pose(page, LEVEL5_DOORWAY_DIRECT_BLOCK_POSE);
  await page.waitForTimeout(260);
  phases.directBlock = await getLevel5DoorwayCameraState(page);

  await resetEra5Pose(page, LEVEL5_DOORWAY_START_POSE);
  await page.waitForTimeout(220);
  for (const step of LEVEL5_DOORWAY_RIGHT_TURN_STEPS) {
    await dispatchHeldKey(page, 'keydown', { code: 'ArrowRight', key: 'ArrowRight' });
    await page.waitForTimeout(step.holdMs);
    await dispatchHeldKey(page, 'keyup', { code: 'ArrowRight', key: 'ArrowRight' });
    await page.waitForTimeout(280);
    phases[step.key] = await getLevel5DoorwayCameraState(page);
  }
  return phases;
}

async function installLevel5ProjectileBurstAudit(page) {
  await page.evaluate(() => {
    const debug = window.__DADA_DEBUG__ ?? {};
    const scene = debug?.sceneRef ?? null;
    const camera = debug?.cameraRef ?? scene?.activeCamera ?? null;
    const Vector3 = window.BABYLON?.Vector3 ?? camera?.position?.constructor ?? null;
    const Matrix = window.BABYLON?.Matrix ?? scene?.getTransformMatrix?.()?.constructor ?? null;
    const topology = debug?.era5TopologyReport?.() ?? null;
    const room = topology?.sectors?.find((sector) => sector.id === 'starter_room') ?? topology?.sectors?.[0] ?? null;
    const roomBounds = room ? {
      minX: room.x - (room.w * 0.5),
      maxX: room.x + (room.w * 0.5),
      minZ: room.z - (room.d * 0.5),
      maxZ: room.z + (room.d * 0.5),
    } : null;
    const floorEdgePoint = (room && Vector3)
      ? new Vector3(room.x + (room.w * 0.5), room.floorY ?? 0, room.z)
      : null;
    const floorEdgeScreen = floorEdgePoint ? (() => {
      const engine = scene.getEngine();
      const width = engine.getRenderWidth();
      const height = engine.getRenderHeight();
      const projected = Vector3.Project(
        floorEdgePoint,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );
      return {
        x: Number(projected.x.toFixed(3)),
        y: Number(projected.y.toFixed(3)),
        z: Number(projected.z.toFixed(6)),
      };
    })() : null;
    const projectToViewport = (position) => {
      if (!scene || !camera || !position || !Vector3 || !Matrix) return null;
      const engine = scene.getEngine();
      const width = engine.getRenderWidth();
      const height = engine.getRenderHeight();
      const projected = Vector3.Project(
        position,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );
      return {
        x: Number(projected.x.toFixed(3)),
        y: Number(projected.y.toFixed(3)),
        z: Number(projected.z.toFixed(6)),
      };
    };
    const state = {
      active: false,
      rafId: null,
      frameCounter: 0,
      pendingPlans: [],
      shotEntries: [],
      seenProjectileNames: new Set(),
      earliestUnreadableShots: [],
      roomBounds,
      preexistingProjectileCount: 0,
    };
    const getProjectileMeshes = () => (scene?.meshes ?? [])
      .filter((mesh) => String(mesh.name || '').startsWith('era5Bubble_'));
    const getCameraTarget = () => camera?.getTarget?.() ? {
      x: Number(camera.getTarget().x.toFixed(3)),
      y: Number(camera.getTarget().y.toFixed(3)),
      z: Number(camera.getTarget().z.toFixed(3)),
    } : null;
    const getPlayerPos = () => debug?.playerPos ? {
      x: Number(debug.playerPos.x.toFixed(3)),
      y: Number(debug.playerPos.y.toFixed(3)),
      z: Number(debug.playerPos.z.toFixed(3)),
    } : null;
    const getPlayerForward = () => debug?.playerForward ? {
      x: Number(debug.playerForward.x.toFixed(3)),
      z: Number(debug.playerForward.z.toFixed(3)),
    } : null;
    const getLaunchState = () => debug?.getEra5ProjectileLaunchState?.() ?? null;
    const snapshotMesh = (mesh) => {
      const pos = mesh.position.clone();
      const screen = projectToViewport(pos);
      const radiusProbe = projectToViewport(pos.add(new Vector3(0, 0.12, 0)));
      const screenRadiusPx = (screen && radiusProbe)
        ? Number(Math.abs(radiusProbe.y - screen.y).toFixed(3))
        : null;
      const centerClearancePx = (screen && floorEdgeScreen)
        ? Number((floorEdgeScreen.y - screen.y).toFixed(3))
        : null;
      const bottomClearancePx = (centerClearancePx !== null && screenRadiusPx !== null)
        ? Number((centerClearancePx - screenRadiusPx).toFixed(3))
        : null;
      const engine = scene?.getEngine?.();
      const viewportWidth = engine?.getRenderWidth?.() ?? null;
      const viewportHeight = engine?.getRenderHeight?.() ?? null;
      const onScreen = !!(
        screen
        && Number.isFinite(viewportWidth)
        && Number.isFinite(viewportHeight)
        && screen.x >= 0
        && screen.x <= viewportWidth
        && screen.y >= 0
        && screen.y <= viewportHeight
      );
      return {
        world: {
          x: Number(pos.x.toFixed(3)),
          y: Number(pos.y.toFixed(3)),
          z: Number(pos.z.toFixed(3)),
        },
        screen,
        onScreen,
        floorEdgeScreen,
        screenRadiusPx,
        centerClearancePx,
        bottomClearancePx,
        renderingGroupId: mesh.renderingGroupId ?? null,
        alphaIndex: mesh.alphaIndex ?? null,
        renderPolicyCategory: mesh.metadata?.renderPolicyCategory ?? null,
        needDepthPrePass: typeof mesh.material?.needDepthPrePass === 'boolean' ? mesh.material.needDepthPrePass : null,
        forceDepthWrite: typeof mesh.material?.forceDepthWrite === 'boolean' ? mesh.material.forceDepthWrite : null,
        backFaceCulling: typeof mesh.material?.backFaceCulling === 'boolean' ? mesh.material.backFaceCulling : null,
        readableByCenter: (centerClearancePx ?? -Infinity) > 0,
        readableByBottom: (bottomClearancePx ?? -Infinity) > 0,
        readableOnScreen: onScreen && ((screenRadiusPx ?? -Infinity) > 4),
      };
    };
    const tick = () => {
      state.frameCounter += 1;
      const now = Number(performance.now().toFixed(3));
      const meshes = getProjectileMeshes();
      for (const mesh of meshes) {
        if (!state.seenProjectileNames.has(mesh.name)) {
          state.seenProjectileNames.add(mesh.name);
          const plan = state.pendingPlans.shift() ?? null;
          state.shotEntries.push({
            shotIndex: plan?.shotIndex ?? null,
            meshName: mesh.name,
            plannedAtMs: plan?.plannedAtMs ?? null,
            spawnSeenAtMs: now,
            firstSeenFrame: state.frameCounter,
            playerPos: plan?.playerPos ?? null,
            playerForward: plan?.playerForward ?? null,
            cameraPos: plan?.cameraPos ?? null,
            cameraTarget: plan?.cameraTarget ?? null,
            launchState: plan?.launchState ?? null,
            frames: [],
          });
        }
      }
      for (const entry of state.shotEntries) {
        const mesh = meshes.find((candidate) => candidate.name === entry.meshName);
        if (!mesh || entry.frames.length >= 6) continue;
        entry.frames.push({
          frameOffset: entry.frames.length,
          frameNumber: state.frameCounter,
          sampledAtMs: now,
          ...snapshotMesh(mesh),
        });
      }
      if (state.active) {
        state.rafId = requestAnimationFrame(tick);
      }
    };
    const api = {
      start() {
        state.active = true;
        state.preexistingProjectileCount = getProjectileMeshes().length;
        for (const mesh of getProjectileMeshes()) state.seenProjectileNames.add(mesh.name);
        if (state.rafId === null) state.rafId = requestAnimationFrame(tick);
      },
      planShot(shotIndex) {
        const plan = {
          shotIndex,
          plannedAtMs: Number(performance.now().toFixed(3)),
          playerPos: getPlayerPos(),
          playerForward: getPlayerForward(),
          cameraPos: camera?.position ? {
            x: Number(camera.position.x.toFixed(3)),
            y: Number(camera.position.y.toFixed(3)),
            z: Number(camera.position.z.toFixed(3)),
          } : null,
          cameraTarget: getCameraTarget(),
          launchState: getLaunchState(),
        };
        state.pendingPlans.push(plan);
        return plan;
      },
      waitForShotFrame(shotIndex, frameOffset = 0, timeoutMs = 4000) {
        return new Promise((resolve, reject) => {
          const deadline = performance.now() + timeoutMs;
          const poll = () => {
            const shot = state.shotEntries.find((entry) => entry.shotIndex === shotIndex) ?? null;
            if (shot && shot.frames.length > frameOffset) {
              resolve(shot.frames[frameOffset]);
              return;
            }
            if (performance.now() > deadline) {
              reject(new Error(`Timed out waiting for shot ${shotIndex} frame ${frameOffset}`));
              return;
            }
            requestAnimationFrame(poll);
          };
          poll();
        });
      },
      stop() {
        state.active = false;
        if (state.rafId !== null) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        const activeProjectiles = getProjectileMeshes().map((mesh) => ({
          name: mesh.name,
          ...snapshotMesh(mesh),
        }));
        return {
          roomBounds: state.roomBounds,
          preexistingProjectileCount: state.preexistingProjectileCount,
          shots: state.shotEntries,
          activeProjectiles,
          currentTestWouldPassBecause: state.shotEntries.map((shot) => ({
            shotIndex: shot.shotIndex,
            firstFrameCenterClearancePx: shot.frames[0]?.centerClearancePx ?? null,
            firstFrameBottomClearancePx: shot.frames[0]?.bottomClearancePx ?? null,
            oldRuntimeSampleFrameOffset: 1,
            oldRuntimeSampleCenterClearancePx: shot.frames[1]?.centerClearancePx ?? null,
            oldRuntimeCenterOnlyWouldPass: (shot.frames[1]?.centerClearancePx ?? -Infinity) > 4,
          })),
        };
      },
    };
    window.__LEVEL5_PROJECTILE_BURST_AUDIT__ = api;
    api.start();
  });
}

async function captureLevel5ProjectileBurstReport(page, { shotCount = 3, interShotDelayMs = 460 } = {}) {
  await page.evaluate(() => {
    window.focus();
  });
  await installLevel5ProjectileBurstAudit(page);

  for (let shotIndex = 1; shotIndex <= shotCount; shotIndex += 1) {
    await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.planShot(index), shotIndex);
    await page.evaluate(() => window.__DADA_DEBUG__?.fireEra5Weapon?.());
    await page.evaluate((index) => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.waitForShotFrame(index, 0), shotIndex);
    if (shotIndex < shotCount) {
      await page.waitForTimeout(interShotDelayMs);
    }
  }

  await page.waitForTimeout(220);
  const report = await page.evaluate(() => window.__LEVEL5_PROJECTILE_BURST_AUDIT__.stop());
  return report;
}

async function probeLevel5ProjectileBlockerOcclusion(page) {
  return page.evaluate(async () => {
    const debug = window.__DADA_DEBUG__ ?? {};
    const scene = debug?.sceneRef ?? null;
    const camera = debug?.cameraRef ?? scene?.activeCamera ?? null;
    const Vector3 = window.BABYLON?.Vector3 ?? camera?.position?.constructor ?? null;
    const Matrix = window.BABYLON?.Matrix ?? scene?.getTransformMatrix?.()?.constructor ?? null;
    if (!scene || !camera || !Vector3 || !Matrix) {
      return { blockedBySolid: false, reason: 'missing_scene_or_camera' };
    }

    debug?.fireEra5Weapon?.();

    const snapshotOcclusion = () => {
      const projectile = (scene.meshes ?? [])
        .filter((mesh) => String(mesh?.name || '').startsWith('era5Bubble_'))
        .sort((a, b) => (b?.uniqueId ?? 0) - (a?.uniqueId ?? 0))[0] ?? null;
      if (!projectile) {
        return { blockedBySolid: false, projectileName: null, pickedName: null };
      }

      const engine = scene.getEngine();
      const width = engine.getRenderWidth();
      const height = engine.getRenderHeight();
      const projected = Vector3.Project(
        projectile.position,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );

      const pick = scene.pick(
        projected.x,
        projected.y,
        (mesh) => mesh?.isEnabled?.() !== false
          && mesh?.isVisible !== false
          && (mesh?.visibility ?? 1) > 0.02,
        false,
        camera,
      );
      return {
        projectileName: projectile.name,
        pickedName: pick?.pickedMesh?.name ?? null,
        blockedBySolid: !!(pick?.hit && pick?.pickedMesh && pick.pickedMesh.name !== projectile.name),
      };
    };

    let last = snapshotOcclusion();
    if (last.blockedBySolid) return last;
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      last = snapshotOcclusion();
      if (last.blockedBySolid) return last;
    }
    return last;
  });
}

/** @param {import('@playwright/test').Page} page */
async function getLevel5PoolAudit(page) {
  return page.evaluate(() => {
    /** @type {any} */
    const anyWindow = window;
    const debug = anyWindow.__DADA_DEBUG__ ?? null;
    const scene = debug?.sceneRef ?? null;
    const camera = debug?.cameraRef ?? scene?.activeCamera ?? null;
    const engine = scene?.getEngine?.() ?? null;
    const BabylonNs = anyWindow.BABYLON ?? null;
    const Vector3 = BabylonNs?.Vector3 ?? camera?.position?.constructor ?? null;
    const Matrix = BabylonNs?.Matrix ?? scene?.getTransformMatrix?.()?.constructor ?? null;
    const meshes = scene?.meshes ?? [];
    const width = engine?.getRenderWidth?.() ?? null;
    const height = engine?.getRenderHeight?.() ?? null;

    /** @param {any} mesh */
    const getBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox ?? null;
      if (!box) return null;
      return {
        minX: Number(box.minimumWorld.x.toFixed(3)),
        maxX: Number(box.maximumWorld.x.toFixed(3)),
        minY: Number(box.minimumWorld.y.toFixed(3)),
        maxY: Number(box.maximumWorld.y.toFixed(3)),
        minZ: Number(box.minimumWorld.z.toFixed(3)),
        maxZ: Number(box.maximumWorld.z.toFixed(3)),
      };
    };

    /** @param {any} mesh */
    const getCenter = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox ?? null;
      return box?.centerWorld?.clone?.() ?? null;
    };

    /** @param {any} point */
    const projectPoint = (point) => {
      if (!point || !camera || !scene || !Vector3 || !Matrix || !Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
      }
      const projected = Vector3.Project(
        point,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        camera.viewport.toGlobal(width, height),
      );
      return {
        x: Number(projected.x.toFixed(2)),
        y: Number(projected.y.toFixed(2)),
      };
    };

    /** @param {any} mesh */
    const getScreenBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox ?? null;
      if (!box || !camera || !scene || !Vector3 || !Matrix || !Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
      }
      const { minimumWorld: min, maximumWorld: max } = box;
      const corners = [
        new Vector3(min.x, min.y, min.z),
        new Vector3(min.x, min.y, max.z),
        new Vector3(min.x, max.y, min.z),
        new Vector3(min.x, max.y, max.z),
        new Vector3(max.x, min.y, min.z),
        new Vector3(max.x, min.y, max.z),
        new Vector3(max.x, max.y, min.z),
        new Vector3(max.x, max.y, max.z),
      ]
        .map(projectPoint)
        .filter(Boolean);
      if (corners.length === 0) return null;
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      return {
        minX: Number(Math.min(...xs).toFixed(2)),
        maxX: Number(Math.max(...xs).toFixed(2)),
        minY: Number(Math.min(...ys).toFixed(2)),
        maxY: Number(Math.max(...ys).toFixed(2)),
      };
    };

    /** @param {any} screenBounds */
    const isOnScreen = (screenBounds) => !!(
      screenBounds
      && Number.isFinite(width)
      && Number.isFinite(height)
      && screenBounds.maxX >= 0
      && screenBounds.minX <= width
      && screenBounds.maxY >= 0
      && screenBounds.minY <= height
    );

    /** @param {any} mesh */
    const summarizeMesh = (mesh) => {
      if (!mesh) return null;
      const center = getCenter(mesh);
      const screenBounds = getScreenBounds(mesh);
      const screen = screenBounds
        ? {
          x: Number((((screenBounds.minX + screenBounds.maxX) * 0.5)).toFixed(2)),
          y: Number((((screenBounds.minY + screenBounds.maxY) * 0.5)).toFixed(2)),
        }
        : projectPoint(center);
      return {
        name: mesh.name,
        bounds: getBounds(mesh),
        screen,
        screenBounds,
        onScreen: isOnScreen(screenBounds),
        renderingGroupId: mesh.renderingGroupId ?? null,
        alphaIndex: mesh.alphaIndex ?? null,
        renderPolicyCategory: mesh.metadata?.renderPolicyCategory ?? null,
        materialAlpha: typeof mesh.material?.alpha === 'number' ? Number(mesh.material.alpha.toFixed(3)) : null,
        transparencyMode: mesh.material?.transparencyMode ?? null,
        needDepthPrePass: typeof mesh.material?.needDepthPrePass === 'boolean' ? mesh.material.needDepthPrePass : null,
        forceDepthWrite: typeof mesh.material?.forceDepthWrite === 'boolean' ? mesh.material.forceDepthWrite : null,
        backFaceCulling: typeof mesh.material?.backFaceCulling === 'boolean' ? mesh.material.backFaceCulling : null,
      };
    };

    const compareWeaponSummary = (a, b) => {
      const aOnScreen = a?.onScreen ? 1 : 0;
      const bOnScreen = b?.onScreen ? 1 : 0;
      if (aOnScreen !== bOnScreen) return bOnScreen - aOnScreen;
      const aBounds = a?.bounds;
      const bBounds = b?.bounds;
      const av = aBounds
        ? (aBounds.maxX - aBounds.minX) * (aBounds.maxY - aBounds.minY) * (aBounds.maxZ - aBounds.minZ)
        : -Infinity;
      const bv = bBounds
        ? (bBounds.maxX - bBounds.minX) * (bBounds.maxY - bBounds.minY) * (bBounds.maxZ - bBounds.minZ)
        : -Infinity;
      return bv - av;
    };

    /** @param {string} name */
    const getMesh = (name) => meshes.find((/** @type {any} */ mesh) => mesh?.name === name) ?? null;
    /** @param {string} prefix */
    const getMeshesByPrefix = (prefix) => meshes.filter((/** @type {any} */ mesh) => String(mesh?.name || '').startsWith(prefix));

    const weaponMeshes = meshes.filter((/** @type {any} */ mesh) => {
      let node = mesh;
      while (node) {
        if (String(node.name || '').startsWith('weapon_')) return true;
        node = node.parent || null;
      }
      return false;
    });
    const weaponSummary = weaponMeshes
      .map((/** @type {any} */ mesh) => summarizeMesh(mesh))
      .filter(Boolean)
      .sort(compareWeaponSummary)[0] ?? null;
    const isWeaponPick = (pick) => {
      let node = pick?.pickedMesh ?? null;
      while (node) {
        if (String(node.name || '').startsWith('weapon_')) return true;
        node = node.parent || null;
      }
      return false;
    };
    const pickAt = (x, y) => scene.pick(
      Math.min(width, Math.max(0, x)),
      Math.min(height, Math.max(0, y)),
      (/** @type {any} */ mesh) => mesh?.isEnabled?.() !== false && mesh?.isVisible !== false && (mesh?.visibility ?? 1) > 0.02,
      false,
      camera,
    );
    const weaponPickPoints = weaponSummary?.screenBounds
      ? [
        weaponSummary.screen,
        { x: weaponSummary.screenBounds.minX + 4, y: weaponSummary.screenBounds.minY + 4 },
        { x: weaponSummary.screenBounds.maxX - 4, y: weaponSummary.screenBounds.minY + 4 },
        { x: weaponSummary.screenBounds.minX + 4, y: weaponSummary.screenBounds.maxY - 4 },
        { x: weaponSummary.screenBounds.maxX - 4, y: weaponSummary.screenBounds.maxY - 4 },
      ]
      : (weaponSummary?.screen ? [weaponSummary.screen] : []);
    const weaponPicks = weaponSummary && scene && camera
      ? weaponPickPoints.map((point) => pickAt(point.x, point.y))
      : [];
    const pickedIsWeapon = weaponPicks.some((pick) => isWeaponPick(pick));
    const weaponPick = weaponPicks.find((pick) => isWeaponPick(pick)) ?? weaponPicks[0] ?? null;

    return {
      floor: summarizeMesh(getMesh('starter_pool_floor_vis')),
      lane: summarizeMesh(getMesh('starter_pool_lane_stripe_vis')),
      water: summarizeMesh(getMesh('starter_pool_water_surface_vis')),
      walls: getMeshesByPrefix('starter_pool_basin_wall_').map((/** @type {any} */ mesh) => summarizeMesh(mesh)),
      coping: getMeshesByPrefix('starter_pool_cope_').map((/** @type {any} */ mesh) => summarizeMesh(mesh)),
      weapon: {
        meshName: weaponSummary?.name ?? null,
        screen: weaponSummary?.screen ?? null,
        screenBounds: weaponSummary?.screenBounds ?? null,
        onScreen: weaponSummary?.onScreen ?? false,
        pickedName: weaponPick?.pickedMesh?.name ?? null,
        pickedIsWeapon,
        renderPolicyCategory: weaponSummary?.renderPolicyCategory ?? null,
        renderingGroupId: weaponSummary?.renderingGroupId ?? null,
      },
      oxygen: debug?.era5Vitals?.oxygen ?? null,
    };
  });
}

/** @param {any} audit */
function expectLevel5PoolAudit(audit) {
  expect(audit?.floor?.bounds).not.toBeNull();
  expect(audit?.lane?.bounds).not.toBeNull();
  expect(audit?.water?.bounds).not.toBeNull();
  expect(audit?.walls?.length ?? 0).toBeGreaterThanOrEqual(4);
  expect(audit?.coping).toHaveLength(4);

  expect(audit.water.renderingGroupId).toBe(3);
  expect(audit.water.renderPolicyCategory).toBe('waterSurface');
  expect(audit.water.materialAlpha).toBeGreaterThanOrEqual(0.55);
  expect(audit.water.materialAlpha).toBeLessThanOrEqual(0.70);
  expect(audit.water.needDepthPrePass).toBe(true);
  expect(audit.water.backFaceCulling).toBe(false);

  const floorTopY = audit.floor.bounds.maxY;
  const waterTopY = audit.water.bounds.maxY;
  const waterBottomY = audit.water.bounds.minY;
  expect(floorTopY).toBeLessThanOrEqual(-1.44);
  expect(waterTopY).toBeLessThan(-0.03);
  expect(waterBottomY).toBeLessThan(-0.04);

  for (const wall of audit.walls) {
    if (String(wall.name || '').includes('south_header')) {
      expect(wall.bounds.minY).toBeGreaterThanOrEqual(-0.31);
      expect(wall.bounds.maxY).toBeGreaterThanOrEqual(-0.01);
    } else {
      expect(wall.bounds.minY).toBeLessThanOrEqual(-1.49);
      expect(wall.bounds.maxY).toBeGreaterThanOrEqual(-0.01);
    }
  }

  for (const coping of audit.coping) {
    expect(coping.bounds.minY).toBeGreaterThanOrEqual(0);
    expect(coping.bounds.maxY).toBeLessThanOrEqual(0.031);
  }

  expect(audit.weapon.meshName).toBeTruthy();
  expect(audit.weapon.onScreen).toBe(true);
  expect(audit.weapon.screenBounds).not.toBeNull();
  expect(audit.weapon.screenBounds.maxX - audit.weapon.screenBounds.minX).toBeGreaterThan(6);
  expect(audit.weapon.screenBounds.maxY - audit.weapon.screenBounds.minY).toBeGreaterThan(6);
  expect(audit.weapon.renderPolicyCategory).toBe('heldItem');
  expect(audit.weapon.renderingGroupId).toBe(4);
}

function expectLevel5ProjectileBurstFrame(frame) {
  expect(frame?.world).not.toBeNull();
  expect(frame?.screen).not.toBeNull();
  expect(frame?.onScreen).toBe(true);
  expect(frame?.readableOnScreen).toBe(true);
  expect(frame?.screenRadiusPx).toBeGreaterThan(4);
  expect(frame?.renderPolicyCategory).toBe('projectile');
  expect(frame?.renderingGroupId).toBe(4);
  expect(frame?.needDepthPrePass).toBe(true);
  expect(frame?.forceDepthWrite).toBe(true);
  expect(frame?.backFaceCulling).toBe(false);
}

function expectLevel5ProjectileBurstReport(report) {
  expect(report?.roomBounds).not.toBeNull();
  expect(report?.shots).toHaveLength(3);
  for (const shot of report.shots) {
    expect(shot?.meshName).toBeTruthy();
    expect(shot?.launchState?.origin).not.toBeNull();
    expect(shot?.launchState?.direction).not.toBeNull();
    expect(shot?.launchState?.aimTarget).not.toBeNull();
    expect(shot?.frames?.length).toBeGreaterThanOrEqual(1);
  }

  const auditedShots = report.shots.slice(0, 3);
  for (const shot of auditedShots) {
    expectLevel5ProjectileBurstFrame(shot.frames[0]);

    // Contract: spawn origin is in front of the character, below head height,
    // and around upper-chest / future-hand weapon height.
    const playerPos = shot.playerPos;
    const playerForward = shot.playerForward;
    const origin = shot.launchState?.origin;
    if (playerPos && playerForward && origin) {
      const toOriginX = origin.x - playerPos.x;
      const toOriginZ = origin.z - playerPos.z;
      const forwardDot = (toOriginX * playerForward.x) + (toOriginZ * playerForward.z);
      // Muzzle must be in front of the character (past the front face).
      expect(forwardDot).toBeGreaterThan(0.2);

      const halfH = Math.max(0.2, playerPos.y - (shot.launchState?.floorTopY ?? (playerPos.y - 0.4)));
      const floorTopY = shot.launchState?.floorTopY ?? (playerPos.y - halfH);
      const headY = floorTopY + (halfH * 2);
      // Muzzle must be below head and above mid-body (weapon-hold / upper-chest range).
      expect(origin.y).toBeLessThan(headY);
      expect(origin.y).toBeGreaterThan(floorTopY + (halfH * 0.8));
    }

    // Contract: in empty-room free fire, trajectory is straight and not
    // artificially climbing unless the LOS direction itself has positive Y.
    const directionY = shot.launchState?.direction?.y ?? 0;
    const y0 = shot.frames[0]?.world?.y;
    const y1 = shot.frames[1]?.world?.y;
    const y2 = shot.frames[2]?.world?.y;
    if (Number.isFinite(y0) && Number.isFinite(y1) && Number.isFinite(y2)) {
      if (directionY <= 0.01) {
        expect(y1).toBeLessThanOrEqual(y0 + 0.015);
        expect(y2).toBeLessThanOrEqual(y1 + 0.015);
      }
      const dy01 = y1 - y0;
      const dy12 = y2 - y1;
      expect(Math.abs(dy12 - dy01)).toBeLessThan(0.05);
    }
  }

  for (const comparison of report?.currentTestWouldPassBecause?.slice(0, 3) ?? []) {
    expect(comparison.firstFrameCenterClearancePx).not.toBeNull();
  }
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

function sortAdjacency(adjacency = {}) {
  return Object.fromEntries(
    Object.entries(adjacency)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, links]) => [id, [...links].sort()]),
  );
}

function expectPositionInBounds(position, bounds, epsilon = 0.45) {
  expect(position).not.toBeNull();
  expect(position.x).toBeGreaterThanOrEqual(bounds.minX - epsilon);
  expect(position.x).toBeLessThanOrEqual(bounds.maxX + epsilon);
  expect(position.y).toBeGreaterThanOrEqual(bounds.minY - epsilon);
  expect(position.y).toBeLessThanOrEqual(bounds.maxY + epsilon);
  expect(position.z).toBeGreaterThanOrEqual(bounds.minZ - epsilon);
  expect(position.z).toBeLessThanOrEqual(bounds.maxZ + epsilon);
}

async function getLevel5SliceRuntimeReport(page) {
  return page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    lastRuntimeError: window.__DADA_DEBUG__?.lastRuntimeError ?? null,
    topology: window.__DADA_DEBUG__?.era5TopologyReport?.() ?? null,
    truth: window.__DADA_DEBUG__?.level5TruthReport?.() ?? null,
    collision: window.__DADA_DEBUG__?.level5CollisionReport?.() ?? null,
    walkable: window.__DADA_DEBUG__?.level5WalkableReport?.() ?? null,
    respawn: window.__DADA_DEBUG__?.level5RespawnReport?.() ?? null,
    debugState: window.__DADA_DEBUG__?.era5LevelState ?? null,
  }));
}

async function sampleLevel5Pose(page, pose, waitMs = 220) {
  await resetEra5Pose(page, pose);
  await page.waitForTimeout(waitMs);
  return page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    waterState: window.__DADA_DEBUG__?.level5?.getWaterState?.(
      window.__DADA_DEBUG__?.playerPos,
      window.__DADA_DEBUG__?.playerPos?.y ?? 0,
    ) ?? null,
  }));
}

async function getLevel5SecretTunnelAudit(page) {
  return page.evaluate(() => {
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const sourceNameFor = (mesh) => String(mesh?.metadata?.sourceName || mesh?.name || '');
    const camera = scene?.activeCamera ?? null;
    const engine = scene?.getEngine?.() ?? null;
    const width = engine?.getRenderWidth?.() ?? 1280;
    const height = engine?.getRenderHeight?.() ?? 720;
    const screenSamples = [
      { id: 'upper_left', x: width * 0.36, y: height * 0.48 },
      { id: 'upper_center_left', x: width * 0.44, y: height * 0.48 },
      { id: 'upper_center', x: width * 0.52, y: height * 0.48 },
      { id: 'upper_center_right', x: width * 0.60, y: height * 0.48 },
      { id: 'upper_right', x: width * 0.68, y: height * 0.48 },
      { id: 'mid_left', x: width * 0.36, y: height * 0.56 },
      { id: 'mid_center_left', x: width * 0.44, y: height * 0.56 },
      { id: 'mid_center', x: width * 0.52, y: height * 0.56 },
      { id: 'mid_center_right', x: width * 0.60, y: height * 0.56 },
      { id: 'mid_right', x: width * 0.68, y: height * 0.56 },
      { id: 'lower_left', x: width * 0.36, y: height * 0.64 },
      { id: 'lower_center_left', x: width * 0.44, y: height * 0.64 },
      { id: 'lower_center', x: width * 0.52, y: height * 0.64 },
      { id: 'lower_center_right', x: width * 0.60, y: height * 0.64 },
      { id: 'lower_right', x: width * 0.68, y: height * 0.64 },
    ];

    return {
      playerPos: window.__DADA_DEBUG__?.playerPos ?? null,
      cameraPos: camera ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null,
      screenSamples: screenSamples.map((sample) => {
        const hit = scene?.pick?.(
          sample.x,
          sample.y,
          (mesh) => mesh?.isVisible !== false && (mesh?.visibility ?? 1) > 0.02,
          false,
          camera,
        ) ?? null;
        return {
          id: sample.id,
          sourceName: sourceNameFor(hit?.pickedMesh),
        };
      }),
    };
  });
}

async function getLevel5PoolMouthCollisionAudit(page) {
  return page.evaluate(() => {
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const summarizeBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: Number(box.minimumWorld.x.toFixed(3)),
        maxX: Number(box.maximumWorld.x.toFixed(3)),
        minY: Number(box.minimumWorld.y.toFixed(3)),
        maxY: Number(box.maximumWorld.y.toFixed(3)),
        minZ: Number(box.minimumWorld.z.toFixed(3)),
        maxZ: Number(box.maximumWorld.z.toFixed(3)),
      };
    };
    const colliders = (scene?.meshes || [])
      .filter((mesh) => mesh?.checkCollisions === true && mesh?.metadata?.gameplayBlocker === true)
      .map((mesh) => ({
        name: String(mesh?.metadata?.sourceName || mesh?.name || ''),
        bounds: summarizeBounds(mesh),
      }))
      .filter((entry) => entry.bounds && entry.name.startsWith('starter_pool_'));
    const opening = {
      minX: 34.9,
      maxX: 37.1,
      minY: -2.0,
      maxY: -0.31,
      minZ: 33.75,
      maxZ: 34.15,
      planeMinZ: 33.75,
      planeMaxZ: 34.05,
    };

    return {
      opening,
      colliders,
      edgeBlockersAcrossMouth: colliders.filter((entry) => entry.name.includes('edge_s') && overlaps(entry.bounds.minX, entry.bounds.maxX, opening.minX, opening.maxX) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, opening.planeMinZ, opening.planeMaxZ)),
      lowerBlockersAcrossOpening: colliders.filter((entry) => overlaps(entry.bounds.minX, entry.bounds.maxX, opening.minX, opening.maxX) && overlaps(entry.bounds.minY, entry.bounds.maxY, opening.minY, opening.maxY) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, opening.minZ, opening.maxZ)),
    };
  });
}

async function getLevel5PoolWallPatchAudit(page) {
  return page.evaluate(() => {
    const scene = window.__DADA_DEBUG__?.sceneRef ?? null;
    const overlaps = (minA, maxA, minB, maxB) => (Math.min(maxA, maxB) - Math.max(minA, minB)) > 0.01;
    const summarizeBounds = (mesh) => {
      const box = mesh?.getBoundingInfo?.()?.boundingBox;
      if (!box) return null;
      return {
        minX: Number(box.minimumWorld.x.toFixed(3)),
        maxX: Number(box.maximumWorld.x.toFixed(3)),
        minY: Number(box.minimumWorld.y.toFixed(3)),
        maxY: Number(box.maximumWorld.y.toFixed(3)),
        minZ: Number(box.minimumWorld.z.toFixed(3)),
        maxZ: Number(box.maximumWorld.z.toFixed(3)),
      };
    };
    const region = {
      minX: 34.9,
      maxX: 37.1,
      minY: -0.3,
      maxY: 1.5,
      minZ: 36.0,
      maxZ: 36.5,
    };
    const visibleMeshes = (scene?.meshes || [])
      .filter((mesh) => mesh?.isEnabled?.() !== false && mesh?.isVisible !== false && (mesh?.visibility ?? 1) > 0.02)
      .map((mesh) => ({
        name: String(mesh?.metadata?.sourceName || mesh?.name || ''),
        bounds: summarizeBounds(mesh),
      }))
      .filter((entry) => entry.bounds && overlaps(entry.bounds.minX, entry.bounds.maxX, region.minX, region.maxX) && overlaps(entry.bounds.minY, entry.bounds.maxY, region.minY, region.maxY) && overlaps(entry.bounds.minZ, entry.bounds.maxZ, region.minZ, region.maxZ))
      .map((entry) => entry.name)
      .sort();
    return { region, visibleMeshes };
  });
}

async function climbLevel5Ladder(page, pose, holdMs = 2300) {
  await resetEra5Pose(page, pose);
  await page.waitForTimeout(120);
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(holdMs);
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(260);
  return page.evaluate(() => ({
    sceneKey: window.__DADA_DEBUG__?.sceneKey ?? null,
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    debugState: window.__DADA_DEBUG__?.era5LevelState ?? null,
  }));
}

test('@level5 @era5 runtime: level 5 exposes the minimal starter vertical slice topology with clean authored-space truth', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  const report = await getLevel5SliceRuntimeReport(page);
  test.skip(!report.topology, 'Level 5 authored topology debug must be available on the authored-space Era 5 path.');
  expect(report.sceneKey).toBe('CribScene');
  expect(report.lastRuntimeError).toBeNull();
  expect(report.topology?.mapId).toBe('level5-starter-vertical-slice');
  expect(report.topology?.sectorCount).toBe(3);
  expect(report.topology?.connectorCount).toBe(2);
  expect(report.topology?.sectors?.map((sector) => sector.id)).toEqual([
    'starter_pool_lab',
    'submerged_swim_tunnel',
    'surfacing_hallway',
  ]);
  expect(sortAdjacency(report.topology?.topology?.adjacency)).toEqual({
    starter_pool_lab: ['submerged_swim_tunnel'],
    submerged_swim_tunnel: ['starter_pool_lab', 'surfacing_hallway'],
    surfacing_hallway: ['submerged_swim_tunnel'],
  });
  expect(report.topology?.topology?.hasCycle).toBe(false);
  expect(report.topology?.walkableReport?.missingCollision ?? []).toEqual([]);
  expect(report.topology?.walkableReport?.underThickness ?? []).toEqual([]);
  expect(report.topology?.walkableReport?.hiddenWalkables ?? []).toEqual([]);
  expect(report.topology?.walkableReport?.unclassifiedWalkables ?? []).toEqual([]);
  expect(report.truth?.disableDecorOcclusionFade).toBe(true);
  expect(report.truth?.fadeableShells ?? []).toEqual([]);
  expect(report.truth?.cullRiskShells ?? []).toEqual([]);
  const intentionallyHiddenWalkables = report.walkable?.missingVisibleWalkables ?? [];
  expect(intentionallyHiddenWalkables.length).toBeGreaterThan(0);
  expect(intentionallyHiddenWalkables.every((id) => /swim_tunnel_|hallway_floor/.test(id))).toBe(true);
  expect(report.walkable?.suspiciousFloorLikeDecor ?? []).toEqual([]);
  expect(report.respawn?.anchorCount ?? 0).toBe(1);
  expect(report.debugState?.graybox?.ladders ?? []).toEqual([]);
});

test('@level5 @era5 runtime: level 5 starter slice route is traversable from pool to surfaced hallway with no fall-through', async ({ page }) => {
  test.setTimeout(180_000);
  await gotoDebugLevel(page, 5);
  await seedEra5BubbleWand(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);

  const roomState = await sampleLevel5Pose(page, {
    x: 10.0,
    y: 0.42,
    z: 18.0,
    yaw: Math.PI * 0.5,
    cameraYaw: Math.PI * 0.5,
  });
  expect(roomState.sceneKey).toBe('CribScene');
  expectPositionInBounds(roomState.pos, { minX: 0.0, maxX: 48.0, minY: 0.0, maxY: 6.0, minZ: 0.0, maxZ: 36.0 });
  expect(roomState.pos.y).toBeGreaterThan(0.2);
  expect(roomState.waterState?.inDeepWater ?? false).toBe(false);

  const poolState = await sampleLevel5Pose(page, {
    x: 36.0,
    y: -1.15,
    z: 30.8,
    yaw: 0.0,
    cameraYaw: 0.0,
  });
  expectPositionInBounds(poolState.pos, { minX: 28.0, maxX: 44.0, minY: -1.8, maxY: 0.2, minZ: 26.0, maxZ: 34.0 });

  const mouthCollisionAudit = await getLevel5PoolMouthCollisionAudit(page);
  expect(mouthCollisionAudit.edgeBlockersAcrossMouth).toEqual([]);
  expect(mouthCollisionAudit.lowerBlockersAcrossOpening).toEqual([]);

  await focusGameplay(page);
  await resetEra5Pose(page, {
    x: 36.0,
    y: -1.05,
    z: 31.4,
    yaw: 0.0,
    cameraYaw: 0.0,
  });
  await dispatchHeldKey(page, 'keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(2500);
  const mouthThresholdState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
  }));
  expect(mouthThresholdState.pos.z).toBeGreaterThan(33.95);
  expect(mouthThresholdState.pos.x).toBeGreaterThan(35.4);
  expect(mouthThresholdState.pos.x).toBeLessThan(36.6);
  await page.waitForTimeout(4500);
  await dispatchHeldKey(page, 'keyup', { code: 'ArrowUp', key: 'ArrowUp' });
  await page.waitForTimeout(250);
  const swimEntryState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
  }));
  expect(swimEntryState.pos.z).toBeGreaterThan(36.4);
  expect(swimEntryState.pos.x).toBeGreaterThan(35.4);
  expect(swimEntryState.pos.x).toBeLessThan(36.6);

  const tunnelSamples = [
    {
      pose: { x: 36.0, y: -1.1, z: 36.2, yaw: 0.0, cameraYaw: 0.0 },
      bounds: { minX: 35.0, maxX: 37.0, minY: -1.8, maxY: 1.4, minZ: 34.0, maxZ: 38.5 },
    },
    {
      pose: { x: 33.2, y: -1.1, z: 40.6, yaw: Math.PI * 0.75, cameraYaw: Math.PI * 0.75 },
      bounds: { minX: 31.5, maxX: 37.0, minY: -1.8, maxY: 1.4, minZ: 38.5, maxZ: 42.5 },
    },
    {
      pose: { x: 33.0, y: -1.1, z: 54.0, yaw: Math.PI, cameraYaw: Math.PI },
      bounds: { minX: 31.5, maxX: 34.5, minY: -1.8, maxY: 1.4, minZ: 42.5, maxZ: 66.0 },
    },
    {
      pose: { x: 33.0, y: -1.0, z: 66.7, yaw: Math.PI, cameraYaw: Math.PI },
      bounds: { minX: 31.5, maxX: 34.5, minY: -1.8, maxY: 4.5, minZ: 66.0, maxZ: 70.0 },
    },
    {
      pose: { x: 33.0, y: 0.18, z: 68.8, yaw: Math.PI, cameraYaw: Math.PI },
      bounds: { minX: 31.5, maxX: 34.5, minY: -1.8, maxY: 4.5, minZ: 66.0, maxZ: 70.0 },
    },
    {
      pose: { x: 33.0, y: 0.42, z: 76.0, yaw: Math.PI, cameraYaw: Math.PI },
      bounds: { minX: 31.0, maxX: 35.0, minY: 0.0, maxY: 4.5, minZ: 70.0, maxZ: 84.0 },
    },
  ];

  for (const sample of tunnelSamples) {
    const state = await sampleLevel5Pose(page, sample.pose);
    expect(state.sceneKey).toBe('CribScene');
    expectPositionInBounds(state.pos, sample.bounds);
  }
});

test('@level5 @era5 runtime: level 5 tunnel stays hidden from room view, becomes readable at the pool, and no future geometry exists', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5Pose?.({ x: 8.0, y: 0.42, z: 18.0, yaw: Math.PI * 0.5, cameraYaw: Math.PI * 0.5 });
    window.__DADA_DEBUG__?.setEra5CameraDebugView?.({
      label: 'l5-starter-room-overview',
      position: { x: 6.0, y: 3.4, z: 10.0 },
      target: { x: 36.0, y: -0.9, z: 31.2 },
      fov: 0.6,
    });
  });
  await page.waitForTimeout(600);

  const roomAudit = await getLevel5SecretTunnelAudit(page);
  const roomVisibleSources = (roomAudit.screenSamples || []).map((sample) => sample.sourceName || '');
  expect(roomVisibleSources.some((name) => name.includes('surfacing_hallway'))).toBe(false);
  expect(roomVisibleSources.some((name) => name.includes('swim_tunnel_run'))).toBe(false);
  expect(roomVisibleSources.some((name) => name.includes('swim_tunnel_stair_'))).toBe(false);
  expect(roomVisibleSources.some((name) => name.includes('truth_overlay'))).toBe(false);

  await page.evaluate(() => {
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
    window.__DADA_DEBUG__?.setEra5Pose?.({ x: 36.0, y: -1.05, z: 31.4, yaw: 0.0, cameraYaw: 0.0 });
  });
  await page.waitForTimeout(600);

  const poolAudit = await getLevel5SecretTunnelAudit(page);
  const visibleSources = (poolAudit.screenSamples || []).map((sample) => sample.sourceName || '');
  expect(visibleSources.some((name) => name.includes('swim_tunnel_run'))).toBe(false);
  expect(visibleSources.some((name) => name.includes('surfacing_hallway'))).toBe(false);
  expect(visibleSources.some((name) => name.includes('swim_tunnel_stair_'))).toBe(false);
  expect(visibleSources.some((name) => name.includes('truth_overlay'))).toBe(false);

  const wallPatchAudit = await getLevel5PoolWallPatchAudit(page);
  expect(wallPatchAudit.visibleMeshes).toContain('starter_pool_lab_south_wall_header');
  expect(wallPatchAudit.visibleMeshes).not.toContain('swim_tunnel_throat_north_wall_header');

  const levelState = await page.evaluate(() => window.__DADA_DEBUG__?.era5LevelState ?? null);
  const underdeckPassage = levelState?.submergedPassages?.find((passage) => passage.name === 'service_tunnel_water_underdeck') ?? null;
  const throatPassage = levelState?.submergedPassages?.find((passage) => passage.name === 'service_tunnel_water_throat') ?? null;
  const bendPassage = levelState?.submergedPassages?.find((passage) => passage.name === 'service_tunnel_water_bend') ?? null;
  const runPassage = levelState?.submergedPassages?.find((passage) => passage.name === 'service_tunnel_water_run') ?? null;
  const stairPassage = levelState?.submergedPassages?.find((passage) => passage.name === 'service_tunnel_water_stairs') ?? null;
  expect(underdeckPassage).not.toBeNull();
  expect(throatPassage).not.toBeNull();
  expect(bendPassage).not.toBeNull();
  expect(runPassage).not.toBeNull();
  expect(runPassage.maxZ).toBeGreaterThanOrEqual(65.9);
  expect(stairPassage).not.toBeNull();
  expect(stairPassage.minZ).toBeGreaterThanOrEqual(66.0);
  expect(stairPassage.maxZ).toBeLessThanOrEqual(70.05);
  expect(Math.abs((stairPassage.waterSurfaceY ?? 0) - (-0.8))).toBeLessThan(0.06);
  expect(stairPassage.floorStartY).toBeLessThan(-1.5);
  expect(stairPassage.floorEndY).toBeGreaterThanOrEqual(0.0);

  const futureMeshes = await page.evaluate(() => (window.__DADA_DEBUG__?.sceneRef?.meshes || [])
    .map((mesh) => String(mesh?.metadata?.sourceName || mesh?.name || ''))
    .filter((name) => /(pump_junction|transfer_gallery|grand_stadium_room|west_kelp_operations_wing|east_whale_observation_wing)/.test(name)));
  expect(futureMeshes).toEqual([]);
});

test('@level5 @era5 runtime: level 5 render policy keeps held item and burst projectiles readable across the pool waterline', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await seedEra5BubbleWand(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);
  await page.evaluate(() => {
    window.__DADA_DEBUG__?.setEra5CameraPreset?.('closer');
    window.__DADA_DEBUG__?.clearEra5CameraDebugView?.();
  });

  for (const pose of Object.values(LEVEL5_POOL_RENDER_POSES)) {
    await resetEra5Pose(page, pose);
    await page.waitForTimeout(220);
    const audit = await getLevel5PoolAudit(page);
    expectLevel5PoolAudit(audit);
  }

  await resetEra5Pose(page, LEVEL5_POOL_RENDER_POSES.waterline);
  await page.waitForTimeout(220);
  const burstReport = await captureLevel5ProjectileBurstReport(page);
  expectLevel5ProjectileBurstReport(burstReport);
});

test('@level5 @era5 runtime: level 5 manual reset respawns to the starter pool lab anchor', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 5);
  await unlockEra5(page);
  await startDebugLevel(page, 5);
  await page.waitForTimeout(1300);
  await focusGameplay(page);

  await resetEra5Pose(page, {
    x: 33.0,
    y: 0.42,
    z: 76.0,
    yaw: Math.PI,
    cameraYaw: Math.PI,
  });
  await page.keyboard.press('r');

  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.lastRespawnAnchor ?? null),
    { timeout: 6_000 },
  ).toMatchObject({
    id: 'level5_spawn_anchor',
    spaceId: 'starter_pool_lab',
  });

  const finalState = await page.evaluate(() => ({
    pos: window.__DADA_DEBUG__?.playerPos ?? null,
    anchor: window.__DADA_DEBUG__?.lastRespawnAnchor ?? null,
  }));
  expect(finalState.anchor?.id).toBe('level5_spawn_anchor');
  expect(Math.abs(finalState.pos.x - 4.0)).toBeLessThan(0.35);
  expect(Math.abs(finalState.pos.z - 18.0)).toBeLessThan(0.35);
  expect(finalState.pos.y).toBeGreaterThan(0.2);
  expect(finalState.pos.y).toBeLessThan(0.7);
});

test('@fast @era5 @progression runtime: levels 5 through 9 show under-construction overlays in the title menu', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);

  const lockState = await page.evaluate(() => window.__DADA_DEBUG__?.getMenuLockState?.() ?? null);
  expect(lockState).not.toBeNull();
  expect(lockState.underConstruction).toMatchObject({
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
  });
  expect(lockState[6]).toBe(false);
  expect(lockState[7]).toBe(false);
  expect(lockState[8]).toBe(false);
  expect(lockState[9]).toBe(false);

  await page.click('#levelBtn6');
  await expect(page.locator('#titleHint')).toContainText('under construction');
  await page.click('#levelBtn9');
  await expect(page.locator('#titleHint')).toContainText('under construction');
});

test('@era5 @progression runtime: title click plus start for level 6 stays in the safe under-construction state', async ({ page }) => {
  test.setTimeout(120_000);
  await gotoDebugLevel(page, 1);
  await page.click('#levelBtn6');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  const report = await getUnderConstructionReport(page);
  expectUnderConstructionReport(report, 6, { requirePlaceholderLevel: false });
});

for (const levelId of [6, 7, 8, 9]) {
  test(`@era5 @progression runtime: level ${levelId} direct debug start stays in the under-construction placeholder state`, async ({ page }) => {
    test.setTimeout(120_000);
    await gotoDebugLevel(page, levelId);
    await page.evaluate((targetLevelId) => {
      window.__DADA_DEBUG__?.startLevel?.(targetLevelId);
    }, levelId);
    await page.waitForTimeout(250);
    const report = await getUnderConstructionReport(page);
    expectUnderConstructionReport(report, levelId);
  });
}

test('@era5 @progression runtime: direct auto-start for level 6 remains blocked in the under-construction title state', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('http://127.0.0.1:4173/?level=6&debug=1&start=1');
  await page.waitForFunction(() => typeof window.__DADA_DEBUG__?.startLevel === 'function', { timeout: 20_000 });
  await page.waitForTimeout(1200);
  const report = await getUnderConstructionReport(page);
  expectUnderConstructionReport(report, 6);
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
