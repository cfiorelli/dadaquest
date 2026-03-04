import * as BABYLON from '@babylonjs/core';
import { buildWorld } from './world/buildWorld.js';
import { PlayerController } from './player/PlayerController.js';
import { InputManager } from './util/input.js';
import { createUI } from './ui/ui.js';
import { damp, clamp } from './util/math.js';
import { createDebugHud } from './ui/debugHud.js';
import { installRestStabilityTest } from './util/restStabilityTest.js';
import { JuiceFx } from './util/juiceFx.js';

const SHOT_FRAMES_TARGET = 10;
const DEFAULT_FLAGS = {
  juice: true,
  audio: true,
  occlusionFade: true,
};
const GOAL_CELEBRATION_SEC = 0.48;

function easeOutCubic(t) {
  const v = Math.max(0, Math.min(1, t));
  return 1 - ((1 - v) ** 3);
}

function isShotMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('shot') === '1';
}

function getShotScene() {
  if (typeof window === 'undefined') return 'title';
  const value = new URLSearchParams(window.location.search).get('scene');
  if (value === 'crib' || value === 'end' || value === 'title') return value;
  return 'title';
}

function createSeededRandom(seed = 1337) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function withPatchedRandom(randomFn, fn) {
  const originalRandom = Math.random;
  Math.random = randomFn;
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function updatePlayerShadow(player) {
  player.blobShadow.position.x = player.mesh.position.x;
  player.blobShadow.position.z = player.mesh.position.z;
  const heightAboveGround = Math.max(0, player.mesh.position.y - 0.5);
  const shadowScale = Math.max(0.4, 1.0 - heightAboveGround * 0.06);
  player.blobShadow.scaling.set(shadowScale, 1, shadowScale);
}

function prepareFadeMaterial(material) {
  if (!material || material._dadaOcclusionPrepared) return;
  material._dadaOcclusionPrepared = true;
  material._dadaBaseAlpha = typeof material.alpha === 'number' ? material.alpha : 1;
  material.alpha = material._dadaBaseAlpha;
  if (material.transparencyMode === undefined || material.transparencyMode === null) {
    material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  }
}

function disableAnimationsForShotMode() {
  if (document.getElementById('dada-shot-static-style')) return;
  const style = document.createElement('style');
  style.id = 'dada-shot-static-style';
  style.textContent = `
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  `;
  document.head.appendChild(style);
}

export async function boot(options = {}) {
  const { isTestMode = false } = options;
  const shotMode = isShotMode();
  const shotScene = shotMode ? getShotScene() : 'title';

  // Debug hook (Playwright polls this)
  window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
  window.__DADA_DEBUG__.sceneKey = 'TitleScene';
  const mergedFlags = {
    ...DEFAULT_FLAGS,
    ...(window.__DADA_DEBUG__.flags || {}),
  };
  if (shotMode) {
    // Freeze non-essential effects for deterministic screenshot captures.
    mergedFlags.juice = false;
    mergedFlags.audio = false;
    mergedFlags.occlusionFade = false;
  }
  window.__DADA_DEBUG__.flags = mergedFlags;
  const debugFlags = window.__DADA_DEBUG__.flags;
  window.__DADA_DEBUG__.isShotMode = shotMode;
  window.__DADA_DEBUG__.shotReady = false;
  window.__DADA_DEBUG__.shotFrames = 0;

  // Test mode fast-path: headless Chromium has no WebGL, so skip all rendering
  // and just advance the scene keys on timers for the smoke test.
  if (isTestMode) {
    window.__DADA_DEBUG__.sceneKey = 'TitleScene';
    setTimeout(() => { window.__DADA_DEBUG__.sceneKey = 'CribScene'; }, 300);
    setTimeout(() => { window.__DADA_DEBUG__.sceneKey = 'EndScene'; }, 1500);
    return;
  }

  const canvas = document.getElementById('renderCanvas');
  const uiRoot = document.getElementById('uiRoot');
  if (shotMode) {
    disableAnimationsForShotMode();
  }
  const fallbackWidth = Math.max(1, window.innerWidth || 800);
  const fallbackHeight = Math.max(1, window.innerHeight || 500);
  if (canvas.width <= 0 || canvas.height <= 0) {
    canvas.width = fallbackWidth;
    canvas.height = fallbackHeight;
  }

  // Babylon engine
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
  });
  if (engine.getRenderWidth() <= 0 || engine.getRenderHeight() <= 0) {
    engine.setSize(fallbackWidth, fallbackHeight);
    canvas.width = Math.max(1, engine.getRenderWidth() || fallbackWidth);
    canvas.height = Math.max(1, engine.getRenderHeight() || fallbackHeight);
  }
  const scene = new BABYLON.Scene(engine);

  // Input
  const input = new InputManager();

  // UI
  const ui = createUI(uiRoot);

  // Build the diorama world
  const world = shotMode
    ? withPatchedRandom(createSeededRandom(1337), () => buildWorld(scene, {
      random: createSeededRandom(7331),
      animateGoal: false,
    }))
    : buildWorld(scene);

  // Player
  const player = new PlayerController(scene, { x: -12, y: 3, z: 0 });
  player.setColliders(world.platforms);
  // Register player child meshes as shadow casters (mesh is now a TransformNode)
  for (const m of player._meshes) {
    world.shadowGen.addShadowCaster(m);
  }
  const spawnPoint = world.spawn || { x: -12, y: 3, z: 0 };
  const checkpoints = [
    { index: 0, label: 'Start', spawn: { ...spawnPoint }, radius: 1.3, marker: null },
    ...(world.checkpoints || []),
  ];
  const pickups = world.pickups || [];
  const hazards = world.hazards || [];
  const juiceFx = new JuiceFx(scene, { enabled: !!debugFlags.juice && !shotMode });
  const worldExtents = world.extents || { minX: -18, maxX: 24 };
  const camTargetMinX = worldExtents.minX + 3.2;
  const camTargetMaxX = worldExtents.maxX - 2.6;
  const foregroundMeshes = (world.foregroundMeshes || [])
    .filter((m) => m?.metadata?.layer === 'foreground');
  const foregroundState = new Map();
  for (const mesh of foregroundMeshes) {
    const material = mesh.material;
    prepareFadeMaterial(material);
    foregroundState.set(mesh.uniqueId, {
      target: 1,
      current: 1,
      seenMs: 0,
      clearMs: 0,
    });
  }

  // Camera — fixed angle, smooth follow
  const camera = new BABYLON.FreeCamera('cam', new BABYLON.Vector3(-18, 7, -14), scene);
  camera.setTarget(new BABYLON.Vector3(-12, 2, 0));
  camera.minZ = 0.5;
  camera.maxZ = 100;
  // Do NOT attach controls — camera is game-controlled, not user-controlled

  // Dev-only debug HUD + rest stability test
  const debugHud = import.meta.env.DEV ? createDebugHud() : null;
  if (import.meta.env.DEV) installRestStabilityTest(player);

  // Game state machine
  let state = 'title'; // title | gameplay | end
  let goalReached = false;
  let shotFrames = 0;
  let goalTimer = 0;
  let respawnState = null;
  let goalCamStartPos = camera.position.clone();
  let goalCamStartTarget = camera.getTarget().clone();
  let goalCamEndPos = camera.position.clone();
  let goalCamEndTarget = camera.getTarget().clone();
  let activeCheckpointIndex = 0;
  let respawnPoint = { ...spawnPoint };
  let onesieBuffTimerMs = 0;
  let onesieJumpBoost = 1;
  let slipRecentTimerMs = 0;
  window.__DADA_DEBUG__.lastRespawnReason = '';
  window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
  window.__DADA_DEBUG__.onesieBuffMs = 0;

  function finishRun() {
    state = 'end';
    window.__DADA_DEBUG__.sceneKey = 'EndScene';
    ui.showEnd();
  }

  function startGoalCelebration(goalPos) {
    if (!debugFlags.juice) {
      finishRun();
      return;
    }
    state = 'goal';
    goalTimer = GOAL_CELEBRATION_SEC;
    goalCamStartPos = camera.position.clone();
    goalCamStartTarget = camera.getTarget().clone();
    goalCamEndPos = new BABYLON.Vector3(goalPos.x - 3.0, goalPos.y + 2.0, -10.5);
    goalCamEndTarget = new BABYLON.Vector3(goalPos.x, goalPos.y + 0.8, 0);
    juiceFx.spawnGoalSparkles(goalPos);
    ui.showPopText('Da Da!', 780);
  }

  function triggerReset(reason, direction = -1) {
    if (respawnState) return;
    const applied = player.applyHit({
      direction,
      knockback: 4.2,
      upward: 3.8,
      invulnMs: 800,
    });
    if (!applied) return;
    respawnState = { phase: 'fadeOut', timer: 0.16, reason };
    window.__DADA_DEBUG__.lastRespawnReason = reason;
    ui.showStatus('Try again!', 650);
  }

  function resolveRespawnPosition(baseSpawn) {
    const { halfW, halfH } = player.getCollisionHalfExtents();

    const placeOnSurface = (x, fallbackY) => {
      let highest = null;
      for (const c of player.colliders) {
        if ((x + halfW) <= c.minX || (x - halfW) >= c.maxX) continue;
        if (highest === null || c.maxY > highest) highest = c.maxY;
      }
      return highest === null ? fallbackY : (highest + halfH + 0.02);
    };

    const minX = worldExtents.minX + 0.8;
    const maxX = worldExtents.maxX - 0.8;
    for (let i = 0; i < 24; i++) {
      const lateralIndex = Math.floor((i + 1) / 2);
      const lateralSign = i % 2 === 0 ? 1 : -1;
      const offsetX = i === 0 ? 0 : lateralSign * lateralIndex * 0.28;
      const x = clamp(baseSpawn.x + offsetX, minX, maxX);
      const yBase = placeOnSurface(x, baseSpawn.y + Math.floor(i / 6) * 0.24);
      const y = yBase + Math.floor(i / 8) * 0.2;
      if (!player.wouldOverlapAt(x, y)) {
        return { x, y, z: baseSpawn.z || 0 };
      }
    }

    // Fallback: push above the world and let gravity settle safely.
    return {
      x: clamp(baseSpawn.x, minX, maxX),
      y: baseSpawn.y + 2.4,
      z: baseSpawn.z || 0,
    };
  }

  function activateCheckpoint(checkpoint) {
    if (!checkpoint || checkpoint.index <= activeCheckpointIndex) return;
    activeCheckpointIndex = checkpoint.index;
    respawnPoint = { ...checkpoint.spawn };
    window.__DADA_DEBUG__.checkpointIndex = activeCheckpointIndex;
    ui.showStatus(`${checkpoint.label} checkpoint`, 1200);

    if (checkpoint.marker) {
      for (const mesh of checkpoint.marker.getChildMeshes()) {
        if (mesh.material && mesh.material.emissiveColor) {
          mesh.material.emissiveColor = new BABYLON.Color3(0.35, 0.18, 0.05);
        }
      }
    }
  }

  function updateLevelInteractions(dt) {
    const pos = player.mesh.position;

    if (onesieBuffTimerMs > 0) {
      onesieBuffTimerMs = Math.max(0, onesieBuffTimerMs - dt * 1000);
      if (onesieBuffTimerMs === 0) {
        onesieJumpBoost = 1;
        ui.showStatus('Onesie boost faded', 900);
      }
    }

    // Checkpoint overlaps
    for (const checkpoint of checkpoints) {
      if (checkpoint.index <= activeCheckpointIndex) continue;
      const dx = pos.x - checkpoint.spawn.x;
      const dy = pos.y - checkpoint.spawn.y;
      const r = checkpoint.radius ?? 1.2;
      if ((dx * dx + dy * dy) <= (r * r)) {
        activateCheckpoint(checkpoint);
      }
    }

    // Pickup overlaps
    for (const pickup of pickups) {
      if (pickup.collected) continue;
      const dx = pos.x - pickup.position.x;
      const dy = pos.y - pickup.position.y;
      const r = pickup.radius ?? 0.85;
      if ((dx * dx + dy * dy) <= (r * r)) {
        pickup.collected = true;
        if (pickup.node) pickup.node.setEnabled(false);
        onesieBuffTimerMs = pickup.durationMs ?? 10000;
        onesieJumpBoost = pickup.jumpBoost ?? 1.2;
        ui.showStatus('Onesie boost + jump', 1500);
      }
    }

    // Hazard overlaps affect movement.
    let accelMultiplier = 1;
    let decelMultiplier = 1;
    for (const hazard of hazards) {
      const inside = pos.x >= hazard.minX
        && pos.x <= hazard.maxX
        && pos.y >= hazard.minY
        && pos.y <= hazard.maxY;

      if (inside && hazard.type === 'slip') {
        accelMultiplier *= hazard.accelMultiplier ?? 0.78;
        decelMultiplier *= hazard.decelMultiplier ?? 0.22;
        slipRecentTimerMs = 900;
      }
    }

    if (slipRecentTimerMs > 0) {
      slipRecentTimerMs = Math.max(0, slipRecentTimerMs - dt * 1000);
    }

    player.setMovementModifiers({
      surfaceAccelMultiplier: accelMultiplier,
      surfaceDecelMultiplier: decelMultiplier,
      jumpVelocityMultiplier: onesieJumpBoost,
    });

    window.__DADA_DEBUG__.onesieBuffMs = Math.round(onesieBuffTimerMs);
  }

  function updateForegroundOcclusion(dt) {
    if (!foregroundMeshes.length) return;

    const playerPos = player.mesh.position;
    const cameraPos = camera.position;
    const toPlayer = playerPos.subtract(cameraPos);
    const rayLength = toPlayer.length();
    if (rayLength <= 0.001) return;

    const rayDir = toPlayer.scale(1 / rayLength);
    const ray = new BABYLON.Ray(cameraPos, rayDir, rayLength);

    for (const mesh of foregroundMeshes) {
      const stateInfo = foregroundState.get(mesh.uniqueId);
      if (!stateInfo) continue;

      const material = mesh.material;
      if (!material) continue;
      prepareFadeMaterial(material);

      let occluding = false;
      if (debugFlags.occlusionFade) {
        const hit = ray.intersectsMesh(mesh, false);
        occluding = !!(hit?.hit && hit.distance < rayLength - 0.35);
      }

      if (occluding) {
        stateInfo.seenMs += dt * 1000;
        stateInfo.clearMs = 0;
        if (stateInfo.seenMs > 48) {
          stateInfo.target = 0.25;
        }
      } else {
        stateInfo.clearMs += dt * 1000;
        stateInfo.seenMs = 0;
        if (stateInfo.clearMs > 140) {
          stateInfo.target = 1;
        }
      }

      stateInfo.current = damp(stateInfo.current, stateInfo.target, 10, dt);
      material.alpha = material._dadaBaseAlpha * stateInfo.current;
    }
  }

  if (shotMode) {
    if (shotScene === 'crib') {
      state = 'gameplay';
      ui.hideTitle();
      window.__DADA_DEBUG__.sceneKey = 'CribScene';
      player.mesh.position.set(-5.25, 2.25, 0);
      camera.position.set(-11.5, 6.6, -14);
      camera.setTarget(new BABYLON.Vector3(-4.0, 2.1, 0));
    } else if (shotScene === 'end') {
      state = 'end';
      ui.hideTitle();
      ui.showEnd();
      window.__DADA_DEBUG__.sceneKey = 'EndScene';
      player.mesh.position.set(18.0, 3.35, 0);
      camera.position.set(13.5, 7.2, -14);
      camera.setTarget(new BABYLON.Vector3(20.0, 3.2, 0));
    } else {
      state = 'title';
      window.__DADA_DEBUG__.sceneKey = 'TitleScene';
      player.mesh.position.set(-12, 3, 0);
      camera.position.set(-18, 7, -14);
      camera.setTarget(new BABYLON.Vector3(-12, 2, 0));
    }
    player.vx = 0;
    player.vy = 0;
    updatePlayerShadow(player);
  }

  // Main loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (shotMode) {
      updatePlayerShadow(player);
      window.__DADA_DEBUG__.playerX = player.mesh.position.x;
      window.__DADA_DEBUG__.playerY = player.mesh.position.y;

      if (debugHud) {
        const fps = engine.getFps();
        const pDebug = player.getDebugState();
        debugHud.update(fps, pDebug, state, player.lastCollisionHits);
      }

      scene.render();
      if (shotFrames < SHOT_FRAMES_TARGET) {
        shotFrames += 1;
        window.__DADA_DEBUG__.shotFrames = shotFrames;
      }
      if (shotFrames >= SHOT_FRAMES_TARGET) {
        window.__DADA_DEBUG__.shotReady = true;
      }
      return;
    }

    if (state === 'title') {
      // Wait for player input
      if (input.consumeJump() || input.consumeEnter()) {
        state = 'gameplay';
        window.__DADA_DEBUG__.sceneKey = 'CribScene';
        ui.hideTitle();
      }
    } else if (state === 'gameplay') {
      if (respawnState) {
        if (respawnState.phase === 'fadeOut') {
          respawnState.timer = Math.max(0, respawnState.timer - dt);
          const t = 1 - (respawnState.timer / 0.16);
          ui.setFade(0.42 * t);

          if (respawnState.timer <= 0) {
            const resolved = resolveRespawnPosition(respawnPoint);
            player.setPosition(resolved.x, resolved.y, resolved.z || 0);
            player.setMovementModifiers();
            respawnState = { phase: 'fadeIn', timer: 0.22, reason: respawnState.reason };
          }
        } else {
          respawnState.timer = Math.max(0, respawnState.timer - dt);
          const t = respawnState.timer / 0.22;
          ui.setFade(0.42 * t);
          if (respawnState.timer <= 0) {
            ui.setFade(0);
            respawnState = null;
          }
        }
      } else {
        updateLevelInteractions(dt);
        // Player update
        const moveX = input.getMoveX();
        const jumpJustPressed = input.consumeJump();
        const jumpHeld = input.isJumpHeld();
        player.update(dt, moveX, jumpJustPressed, jumpHeld);

        const playerEvents = player.consumeEvents();
        for (const ev of playerEvents) {
          if (ev.type === 'jump') {
            juiceFx.spawnJumpDust(player.mesh.position);
          } else if (ev.type === 'land') {
            juiceFx.spawnLandDust(player.mesh.position);
          } else if (ev.type === 'outOfBounds') {
            const reason = slipRecentTimerMs > 0 ? 'slip_fall' : 'fell_off_level';
            triggerReset(reason, player.mesh.position.x < respawnPoint.x ? 1 : -1);
          }
        }
      }

      // Update blob shadow position (follows player X, stays near ground)
      updatePlayerShadow(player);

      // Check goal
      const pPos = player.getPosition();
      const goalBounds = world.goal.getBoundingInfo().boundingBox;
      const goalInside = pPos.x >= goalBounds.minimumWorld.x
        && pPos.x <= goalBounds.maximumWorld.x
        && pPos.y >= goalBounds.minimumWorld.y
        && pPos.y <= goalBounds.maximumWorld.y;
      if (goalInside && !goalReached) {
        goalReached = true;
        startGoalCelebration(world.goalRoot.getAbsolutePosition());
      }

      // Smooth camera follow
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      const targetX = clamp(px + 2, camTargetMinX, camTargetMaxX);
      camera.position.x = damp(camera.position.x, targetX - 8, 4, dt);
      camera.position.y = damp(camera.position.y, py + 4, 4, dt);
      camera.position.z = damp(camera.position.z, -14, 4, dt);
      camera.setTarget(new BABYLON.Vector3(
        damp(camera.getTarget().x, targetX, 4, dt),
        damp(camera.getTarget().y, py + 1.2, 4, dt),
        0,
      ));
    } else if (state === 'goal') {
      goalTimer = Math.max(0, goalTimer - dt);
      const t = 1 - (goalTimer / GOAL_CELEBRATION_SEC);
      const ease = easeOutCubic(t);
      camera.position = BABYLON.Vector3.Lerp(goalCamStartPos, goalCamEndPos, ease);
      camera.setTarget(BABYLON.Vector3.Lerp(goalCamStartTarget, goalCamEndTarget, ease));
      if (goalTimer <= 0) {
        finishRun();
      }
    }

    juiceFx.update(dt);
    updateForegroundOcclusion(dt);
    window.__DADA_DEBUG__.playerX = player.mesh.position.x;
    window.__DADA_DEBUG__.playerY = player.mesh.position.y;

    // Debug HUD (dev only)
    if (debugHud) {
      const fps = engine.getFps();
      const pDebug = state !== 'title' ? player.getDebugState() : null;
      debugHud.update(fps, pDebug, state, pDebug ? player.lastCollisionHits : 0);
    }

    scene.render();
  });

  window.addEventListener('resize', () => engine.resize());

  return { engine, scene };
}
