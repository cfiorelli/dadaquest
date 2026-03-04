import * as BABYLON from '@babylonjs/core';
import { buildWorld } from './world/buildWorld.js';
import { PlayerController } from './player/PlayerController.js';
import { InputManager } from './util/input.js';
import { createUI } from './ui/ui.js';
import { damp } from './util/math.js';
import { createDebugHud } from './ui/debugHud.js';
import { installRestStabilityTest } from './util/restStabilityTest.js';

export async function boot(options = {}) {
  const { isTestMode = false } = options;

  // Debug hook (Playwright polls this)
  window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
  window.__DADA_DEBUG__.sceneKey = 'TitleScene';

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

  // Babylon engine
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
  });
  const scene = new BABYLON.Scene(engine);

  // Input
  const input = new InputManager();

  // UI
  const ui = createUI(uiRoot);

  // Build the diorama world
  const world = buildWorld(scene);

  // Player
  const player = new PlayerController(scene, { x: -12, y: 3, z: 0 });
  player.setColliders(world.platforms);
  // Register player child meshes as shadow casters (mesh is now a TransformNode)
  for (const m of player._meshes) {
    world.shadowGen.addShadowCaster(m);
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

  // Main loop
  engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000;

    if (state === 'title') {
      // Wait for player input
      if (input.consumeJump() || input.consumeEnter()) {
        state = 'gameplay';
        window.__DADA_DEBUG__.sceneKey = 'CribScene';
        ui.hideTitle();
      }
    } else if (state === 'gameplay') {
      // Player update
      const moveX = input.getMoveX();
      const jumpJustPressed = input.consumeJump();
      const jumpHeld = input.isJumpHeld();
      player.update(dt, moveX, jumpJustPressed, jumpHeld);

      // Update blob shadow position (follows player X, stays near ground)
      player.blobShadow.position.x = player.mesh.position.x;
      player.blobShadow.position.z = player.mesh.position.z;
      // Scale shadow slightly based on height above ground
      const heightAboveGround = Math.max(0, player.mesh.position.y - 0.5);
      const shadowScale = Math.max(0.4, 1.0 - heightAboveGround * 0.06);
      player.blobShadow.scaling.set(shadowScale, 1, shadowScale);

      // Check goal
      const pPos = player.getPosition();
      const gPos = world.goal.getAbsolutePosition();
      const dist = Math.sqrt(
        (pPos.x - gPos.x) ** 2 +
        (pPos.y - gPos.y) ** 2,
      );
      if (dist < 1.8 && !goalReached) {
        goalReached = true;
        state = 'end';
        window.__DADA_DEBUG__.sceneKey = 'EndScene';
        ui.showEnd();
      }

      // Smooth camera follow
      const px = player.mesh.position.x;
      const py = player.mesh.position.y;
      camera.position.x = damp(camera.position.x, px - 6, 4, dt);
      camera.position.y = damp(camera.position.y, py + 4, 4, dt);
      camera.position.z = damp(camera.position.z, -14, 4, dt);
      camera.setTarget(new BABYLON.Vector3(
        damp(camera.getTarget().x, px + 2, 4, dt),
        damp(camera.getTarget().y, py + 1.2, 4, dt),
        0,
      ));
    }

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
