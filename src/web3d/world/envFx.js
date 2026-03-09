import * as BABYLON from '@babylonjs/core';

export function markDecorNode(node, extraMetadata = {}) {
  if (!node) return;
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
    decor: true,
    ...extraMetadata,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
    if (!(mesh instanceof BABYLON.Mesh)) continue;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
      decor: true,
      ...extraMetadata,
    };
  }
}

function createCausticTexture(scene, name) {
  const texture = new BABYLON.DynamicTexture(name, { width: 512, height: 512 }, scene, true);
  const ctx = texture.getContext();
  ctx.fillStyle = '#06131d';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle = `rgba(110, 255, 240, ${(0.06 + ((i % 5) * 0.018)).toFixed(3)})`;
    ctx.lineWidth = 3 + (i % 4);
    ctx.beginPath();
    const startX = (i * 37) % 512;
    const startY = (i * 79) % 512;
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      (startX + 60 + ((i * 13) % 90)) % 512,
      (startY + 80 + ((i * 11) % 100)) % 512,
      (startX + 120 + ((i * 17) % 140)) % 512,
      (startY + 20 + ((i * 19) % 120)) % 512,
      (startX + 180 + ((i * 23) % 160)) % 512,
      (startY + 90 + ((i * 29) % 140)) % 512,
    );
    ctx.stroke();
  }
  texture.update();
  texture.hasAlpha = true;
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  return texture;
}

function createGradientTexture(scene, name, topColor, midColor, bottomColor) {
  const texture = new BABYLON.DynamicTexture(name, { width: 32, height: 256 }, scene, true);
  const ctx = texture.getContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(0.55, midColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 256);
  texture.update();
  texture.hasAlpha = true;
  return texture;
}

function createFishShadowTexture(scene, name) {
  const texture = new BABYLON.DynamicTexture(name, { width: 384, height: 128 }, scene, true);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 384, 128);
  ctx.fillStyle = 'rgba(12, 22, 34, 0.56)';
  ctx.beginPath();
  ctx.ellipse(168, 64, 92, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(250, 64);
  ctx.lineTo(330, 28);
  ctx.lineTo(330, 100);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(128, 48);
  ctx.lineTo(88, 20);
  ctx.lineTo(98, 58);
  ctx.closePath();
  ctx.fill();
  texture.update();
  texture.hasAlpha = true;
  return texture;
}

function createBubbleNode(scene, name, position, scale = 1) {
  const mesh = BABYLON.MeshBuilder.CreateSphere(name, {
    diameter: 0.22 * scale,
    segments: 8,
  }, scene);
  mesh.position.copyFrom(position);
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = new BABYLON.Color3(0.66, 0.94, 1.0);
  mat.emissiveColor = new BABYLON.Color3(0.06, 0.20, 0.24);
  mat.alpha = 0.34;
  mat.specularColor = new BABYLON.Color3(0.45, 0.82, 0.88);
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mesh.material = mat;
  markDecorNode(mesh);
  return mesh;
}

function createGlassFrame(scene, name, { width, height }) {
  const root = new BABYLON.TransformNode(name, scene);

  const panel = BABYLON.MeshBuilder.CreatePlane(`${name}_panel`, {
    width,
    height,
  }, scene);
  panel.parent = root;
  const panelMat = new BABYLON.StandardMaterial(`${name}_panelMat`, scene);
  panelMat.diffuseColor = new BABYLON.Color3(0.08, 0.28, 0.34);
  panelMat.emissiveColor = new BABYLON.Color3(0.03, 0.10, 0.12);
  panelMat.alpha = 0.12;
  panelMat.specularColor = new BABYLON.Color3(0.42, 0.72, 0.80);
  panelMat.backFaceCulling = false;
  panelMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  panel.material = panelMat;

  const frameMaterials = [];
  const pieces = [
    { name: 'top', w: width + 0.18, h: 0.12, y: (height * 0.5) + 0.04 },
    { name: 'bottom', w: width + 0.18, h: 0.12, y: -(height * 0.5) - 0.04 },
    { name: 'left', w: 0.12, h: height + 0.18, x: -(width * 0.5) - 0.04 },
    { name: 'right', w: 0.12, h: height + 0.18, x: (width * 0.5) + 0.04 },
  ];
  for (const piece of pieces) {
    const frame = BABYLON.MeshBuilder.CreatePlane(`${name}_${piece.name}`, {
      width: piece.w,
      height: piece.h,
    }, scene);
    frame.parent = root;
    frame.position.set(piece.x ?? 0, piece.y ?? 0, -0.02);
    const mat = new BABYLON.StandardMaterial(`${name}_${piece.name}Mat`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.44, 0.96, 1.0);
    mat.emissiveColor = new BABYLON.Color3(0.16, 0.46, 0.50);
    mat.alpha = 0.30;
    mat.specularColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    frame.material = mat;
    frameMaterials.push(mat);
  }

  markDecorNode(root);
  return { root, panelMat, frameMaterials };
}

export function createAquariumEnvironmentFx(scene, {
  extents = { minX: -20, maxX: 60 },
  floorY = -1.2,
  farZ = 16,
} = {}) {
  const root = new BABYLON.TransformNode('aquariumEnvFx', scene);
  root.position.set(0, 0, 0);
  markDecorNode(root);

  const fogPlane = BABYLON.MeshBuilder.CreatePlane('aquariumFogPlane', {
    width: Math.max(120, (extents.maxX - extents.minX) + 30),
    height: 52,
  }, scene);
  fogPlane.parent = root;
  fogPlane.position.set((extents.minX + extents.maxX) * 0.5, 11.5, farZ + 4);
  const fogMat = new BABYLON.StandardMaterial('aquariumFogMat', scene);
  fogMat.diffuseTexture = createGradientTexture(
    scene,
    'aquariumFogGradient',
    'rgba(12, 56, 88, 0.96)',
    'rgba(8, 82, 110, 0.78)',
    'rgba(0, 24, 40, 0.0)',
  );
  fogMat.emissiveTexture = fogMat.diffuseTexture;
  fogMat.opacityTexture = fogMat.diffuseTexture;
  fogMat.specularColor = BABYLON.Color3.Black();
  fogMat.disableLighting = true;
  fogMat.backFaceCulling = false;
  fogMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  fogPlane.material = fogMat;
  markDecorNode(fogPlane);

  const causticPlane = BABYLON.MeshBuilder.CreatePlane('aquariumCausticPlane', {
    width: Math.max(120, (extents.maxX - extents.minX) + 24),
    height: 38,
  }, scene);
  causticPlane.parent = root;
  causticPlane.position.set((extents.minX + extents.maxX) * 0.5, 10.5, farZ);
  const causticMat = new BABYLON.StandardMaterial('aquariumCausticMat', scene);
  causticMat.diffuseTexture = createCausticTexture(scene, 'aquariumCaustics');
  causticMat.emissiveTexture = causticMat.diffuseTexture;
  causticMat.opacityTexture = causticMat.diffuseTexture;
  causticMat.specularColor = BABYLON.Color3.Black();
  causticMat.disableLighting = true;
  causticMat.alpha = 0.34;
  causticMat.backFaceCulling = false;
  causticMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  causticPlane.material = causticMat;
  markDecorNode(causticPlane);

  const columns = [];
  for (let i = 0; i < 5; i++) {
    const column = BABYLON.MeshBuilder.CreatePlane(`aquariumDepthColumn_${i}`, {
      width: 10 + (i % 2) * 2,
      height: 28 + (i % 3) * 3,
    }, scene);
    column.parent = root;
    column.position.set(extents.minX + 12 + (i * 22), 8 + ((i % 2) * 2), farZ + 2 + (i % 3));
    const mat = new BABYLON.StandardMaterial(`aquariumDepthColumnMat_${i}`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.06, 0.30, 0.40);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.12, 0.16);
    mat.alpha = 0.52;
    mat.specularColor = BABYLON.Color3.Black();
    mat.disableLighting = true;
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    column.material = mat;
    columns.push(column);
    markDecorNode(column);
  }

  const fishShadows = [];
  for (let i = 0; i < 8; i++) {
    const shadow = BABYLON.MeshBuilder.CreatePlane(`aquariumFishShadow_${i}`, {
      width: 4.6 + ((i % 3) * 0.8),
      height: 1.6 + ((i % 2) * 0.36),
    }, scene);
    shadow.parent = root;
    shadow.position.set(
      extents.minX + 8 + (i * ((extents.maxX - extents.minX) / 7)),
      floorY + 10.5 + ((i % 3) * 1.2),
      farZ - 2.2 - ((i % 2) * 0.5),
    );
    const shadowMat = new BABYLON.StandardMaterial(`aquariumFishShadowMat_${i}`, scene);
    const shadowTex = createFishShadowTexture(scene, `aquariumFishShadowTex_${i}`);
    shadowMat.diffuseTexture = shadowTex;
    shadowMat.opacityTexture = shadowTex;
    shadowMat.emissiveTexture = shadowTex;
    shadowMat.specularColor = BABYLON.Color3.Black();
    shadowMat.disableLighting = true;
    shadowMat.alpha = 0.42;
    shadowMat.backFaceCulling = false;
    shadowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    shadow.material = shadowMat;
    markDecorNode(shadow);
    fishShadows.push({
      mesh: shadow,
      mat: shadowMat,
      baseX: shadow.position.x,
      baseY: shadow.position.y,
      speed: 0.55 + ((i % 4) * 0.12),
      drift: 1.8 + ((i % 3) * 0.34),
      phase: i * 0.8,
    });
  }

  const nearFrames = [];
  for (let i = 0; i < 4; i++) {
    const frame = createGlassFrame(scene, `aquariumNearFrame_${i}`, {
      width: 16 + ((i % 2) * 2),
      height: 12 + ((i % 3) * 1.4),
    });
    frame.root.parent = root;
    frame.root.position.set(extents.minX + 12 + (i * 30), floorY + 9.8 + ((i % 2) * 1.1), farZ - 0.8);
    nearFrames.push(frame);
  }

  // Near aquarium tank glass wall — Level 5 signature: you're inside a tank
  const nearTankWall = createGlassFrame(scene, 'aquariumNearTankWall', {
    width: Math.max(140, (extents.maxX - extents.minX) + 32),
    height: 26,
  });
  nearTankWall.root.parent = root;
  nearTankWall.root.position.set((extents.minX + extents.maxX) * 0.5, floorY + 11, farZ - 1.2);
  nearTankWall.panelMat.alpha = 0.14;
  for (const fm of nearTankWall.frameMaterials) {
    fm.alpha = 0.56;
    fm.emissiveColor = new BABYLON.Color3(0.18, 0.62, 0.72);
  }

  const bubbles = [];
  for (let i = 0; i < 28; i++) {
    const bubble = createBubbleNode(scene, `aquariumBubble_${i}`, new BABYLON.Vector3(
      extents.minX + ((i * 7.1) % (extents.maxX - extents.minX)),
      floorY + 1 + ((i * 1.4) % 18),
      7 + ((i * 1.1) % 9),
    ), 0.7 + ((i % 4) * 0.22));
    bubble.parent = root;
    bubbles.push({
      mesh: bubble,
      startX: bubble.position.x,
      baseY: bubble.position.y,
      speed: 0.55 + ((i % 5) * 0.12),
      sway: 0.22 + ((i % 3) * 0.08),
      phase: i * 0.9,
      resetOffset: i * 0.33,
    });
  }

  let time = 0;

  return {
    root,
    update(dt) {
      time += dt;
      const causticTexture = causticMat.diffuseTexture;
      if (causticTexture) {
        causticTexture.uOffset = (time * 0.012) % 1;
        causticTexture.vOffset = (time * 0.018) % 1;
      }
      causticMat.alpha = 0.28 + (Math.sin(time * 0.6) * 0.05);
      fogMat.alpha = 0.78 + (Math.sin(time * 0.18) * 0.04);
      for (let i = 0; i < columns.length; i++) {
        columns[i].position.y += Math.sin((time * 0.25) + i) * 0.0025;
      }
      for (let i = 0; i < fishShadows.length; i++) {
        const fish = fishShadows[i];
        fish.mesh.position.x += fish.speed * dt;
        fish.mesh.position.y = fish.baseY + Math.sin((time * 0.32) + fish.phase) * 0.42;
        fish.mesh.position.z = (farZ - 2.2 - ((i % 2) * 0.5)) + Math.sin((time * 0.28) + fish.phase) * 0.18;
        fish.mesh.rotation.z = Math.sin((time * 0.6) + fish.phase) * 0.08;
        fish.mat.alpha = 0.34 + (Math.sin((time * 0.5) + fish.phase) * 0.06);
        if (fish.mesh.position.x > extents.maxX + 10) {
          fish.mesh.position.x = extents.minX - fish.drift;
        }
      }
      for (let i = 0; i < nearFrames.length; i++) {
        const frame = nearFrames[i];
        frame.panelMat.alpha = 0.12 + (Math.sin((time * 0.22) + i) * 0.02);
        for (let j = 0; j < frame.frameMaterials.length; j++) {
          frame.frameMaterials[j].alpha = 0.48 + (Math.sin((time * 0.6) + i + (j * 0.4)) * 0.06);
        }
      }
      for (const bubble of bubbles) {
        bubble.mesh.position.y += bubble.speed * dt;
        bubble.mesh.position.x = bubble.startX + Math.sin((time * 0.8) + bubble.phase) * bubble.sway;
        bubble.mesh.position.z += Math.sin((time * 0.55) + bubble.phase) * 0.004;
        if (bubble.mesh.position.y > floorY + 22) {
          bubble.mesh.position.y = floorY + 0.6 + bubble.resetOffset;
        }
      }
    },
    reset() {
      time = 0;
      for (const bubble of bubbles) {
        bubble.mesh.position.x = bubble.startX;
        bubble.mesh.position.y = bubble.baseY;
      }
      for (let i = 0; i < fishShadows.length; i++) {
        const fish = fishShadows[i];
        fish.mesh.position.x = fish.baseX;
        fish.mesh.position.y = fish.baseY;
        fish.mesh.rotation.z = 0;
      }
      if (causticMat.diffuseTexture) {
        causticMat.diffuseTexture.uOffset = 0;
        causticMat.diffuseTexture.vOffset = 0;
      }
    },
  };
}

function createRectPlane(scene, name, {
  width,
  height,
  color = new BABYLON.Color3(0.2, 0.2, 0.2),
  emissive = new BABYLON.Color3(0.04, 0.04, 0.04),
  alpha = 0.3,
} = {}) {
  const plane = BABYLON.MeshBuilder.CreatePlane(name, { width, height }, scene);
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = emissive;
  mat.alpha = alpha;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  plane.material = mat;
  markDecorNode(plane);
  return { plane, mat };
}

function applyGradientPlaneMaterial(scene, plane, name, {
  top,
  mid,
  bottom,
  alpha = 1,
  emissiveScale = 0.1,
} = {}) {
  const tex = createGradientTexture(scene, `${name}_gradient`, top, mid, bottom);
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = tex;
  mat.emissiveTexture = tex;
  mat.opacityTexture = tex;
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  mat.specularColor = BABYLON.Color3.Black();
  mat.alpha = alpha;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mat.emissiveColor = new BABYLON.Color3(emissiveScale, emissiveScale, emissiveScale);
  plane.material = mat;
  markDecorNode(plane);
  return mat;
}

function createParticleSphere(scene, name, {
  diameter = 0.18,
  color = new BABYLON.Color3(0.9, 0.9, 0.9),
  emissive = new BABYLON.Color3(0.1, 0.1, 0.1),
  alpha = 0.3,
} = {}) {
  const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: 6 }, scene);
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = emissive;
  mat.alpha = alpha;
  mat.specularColor = BABYLON.Color3.Black();
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  mesh.material = mat;
  markDecorNode(mesh);
  return { mesh, mat };
}

function createFactoryEnvironmentFx(scene, {
  extents = { minX: -24, maxX: 140 },
  floorY = 0,
  farZ = 16,
} = {}) {
  const root = new BABYLON.TransformNode('factoryEnvFx', scene);
  markDecorNode(root);
  const span = Math.max(120, (extents.maxX - extents.minX) + 28);
  const cx = (extents.minX + extents.maxX) * 0.5;

  // Far amber backdrop — warm industrial glow
  const backdrop = createRectPlane(scene, 'factoryBackdrop', {
    width: span,
    height: 46,
    color: new BABYLON.Color3(0.38, 0.28, 0.16),  // brighter amber (was 0.18/0.14/0.10)
    emissive: new BABYLON.Color3(0.14, 0.08, 0.03),
    alpha: 0.97,
  });
  backdrop.plane.parent = root;
  backdrop.plane.position.set(cx, floorY + 10.5, farZ + 5);

  // Hazard warning stripe across mid-level
  const hazardStripe = createRectPlane(scene, 'factoryStripe', {
    width: span,
    height: 8,
    color: new BABYLON.Color3(0.80, 0.64, 0.18),
    emissive: new BABYLON.Color3(0.28, 0.16, 0.04),
    alpha: 0.16,  // was 0.08 — doubled
  });
  hazardStripe.plane.parent = root;
  hazardStripe.plane.position.set(cx, floorY + 6.8, farZ + 3.8);
  hazardStripe.plane.rotation.z = -0.08;

  // ── Near industrial bay wall at Z=13 — the signature factory backdrop ──
  // This puts a solid factory wall directly behind the gameplay lane,
  // eliminating the "void" and making the level unmistakably industrial.
  const nearWall = createRectPlane(scene, 'factoryNearWall', {
    width: span + 14,
    height: 36,
    color: new BABYLON.Color3(0.24, 0.18, 0.11),
    emissive: new BABYLON.Color3(0.08, 0.05, 0.02),
    alpha: 0.90,
  });
  nearWall.plane.parent = root;
  nearWall.plane.position.set(cx, floorY + 16, 13);

  // Industrial window bays on the near wall — warm amber glow through windows
  for (let i = 0; i < 8; i++) {
    const winGlow = createRectPlane(scene, `factoryWindowGlow_${i}`, {
      width: 5.2 + ((i % 2) * 1.0),
      height: 7.6 + ((i % 3) * 0.8),
      color: new BABYLON.Color3(0.76, 0.64, 0.28),
      emissive: new BABYLON.Color3(0.32, 0.20, 0.06),
      alpha: 0.30,
    });
    winGlow.plane.parent = root;
    winGlow.plane.position.set(extents.minX + 14 + (i * 20), floorY + 11.4 + ((i % 2) * 0.6), 12.7);
  }

  // Overhead factory truss — ceiling-like beam spanning the level
  const truss = createRectPlane(scene, 'factoryTruss', {
    width: span + 10,
    height: 3.2,
    color: new BABYLON.Color3(0.20, 0.14, 0.08),
    emissive: new BABYLON.Color3(0.06, 0.04, 0.01),
    alpha: 0.86,
  });
  truss.plane.parent = root;
  truss.plane.rotation.x = Math.PI / 2;
  truss.plane.position.set(cx, floorY + 15.5, 7);

  // Girder columns — brighter and more visible (alpha 0.68 was 0.34)
  const girders = [];
  for (let i = 0; i < 7; i++) {
    const girder = createRectPlane(scene, `factoryGirder_${i}`, {
      width: 2.4,
      height: 28,
      color: new BABYLON.Color3(0.38, 0.28, 0.16),  // was 0.26/0.18/0.10
      emissive: new BABYLON.Color3(0.12, 0.07, 0.02),
      alpha: 0.68,  // was 0.34 — doubled
    });
    girder.plane.parent = root;
    girder.plane.position.set(extents.minX + 10 + (i * 22), floorY + 12.0, farZ + 2.2 + (i % 2));
    girders.push(girder);
  }

  // Smokestack silhouettes — tall, dark, uniquely factory-landmark
  for (let i = 0; i < 5; i++) {
    const stack = createRectPlane(scene, `factoryStack_${i}`, {
      width: 3.0 + ((i % 2) * 0.6),
      height: 36 + ((i % 3) * 8),
      color: new BABYLON.Color3(0.22, 0.16, 0.09),
      emissive: new BABYLON.Color3(0.08, 0.05, 0.02),
      alpha: 0.86,
    });
    stack.plane.parent = root;
    stack.plane.position.set(extents.minX + 22 + (i * 28), floorY + 16, farZ + 1.5 + ((i % 2) * 0.5));
    // Stack cap
    const cap = createRectPlane(scene, `factoryStackCap_${i}`, {
      width: 5.0 + ((i % 2) * 1.0),
      height: 3.0,
      color: new BABYLON.Color3(0.30, 0.22, 0.12),
      emissive: new BABYLON.Color3(0.10, 0.06, 0.02),
      alpha: 0.82,
    });
    cap.plane.parent = root;
    cap.plane.position.set(
      extents.minX + 22 + (i * 28),
      floorY + 16 + (18 + ((i % 3) * 4)) * 0.5 + 1,
      farZ + 1.5 + ((i % 2) * 0.5),
    );
  }

  // Steam vents — more visible (alpha 0.28 was 0.16)
  const steam = [];
  for (let i = 0; i < 18; i++) {
    const puff = createParticleSphere(scene, `factorySteam_${i}`, {
      diameter: 0.40 + ((i % 3) * 0.10),
      color: new BABYLON.Color3(0.86, 0.82, 0.76),
      emissive: new BABYLON.Color3(0.14, 0.11, 0.08),
      alpha: 0.28,  // was 0.16
    });
    puff.mesh.parent = root;
    puff.mesh.position.set(
      extents.minX + 8 + ((i * 11.2) % (extents.maxX - extents.minX)),
      floorY + 2 + ((i * 1.2) % 12),
      farZ - 1.2 + ((i % 4) * 0.5),
    );
    steam.push({
      mesh: puff.mesh,
      mat: puff.mat,
      baseX: puff.mesh.position.x,
      baseY: puff.mesh.position.y,
      speed: 0.5 + ((i % 4) * 0.09),
      sway: 0.18 + ((i % 3) * 0.08),
      phase: i * 0.55,
    });
  }

  // Spark shower — more vivid (alpha 0.58 was 0.45)
  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const spark = createParticleSphere(scene, `factorySpark_${i}`, {
      diameter: 0.09,
      color: new BABYLON.Color3(1.0, 0.88, 0.38),
      emissive: new BABYLON.Color3(0.48, 0.26, 0.06),
      alpha: 0.58,  // was 0.45
    });
    spark.mesh.parent = root;
    spark.mesh.position.set(
      extents.minX + 14 + ((i * 15.0) % (extents.maxX - extents.minX - 20)),
      floorY + 3.5 + ((i % 4) * 1.1),
      farZ - 0.6,
    );
    sparks.push({ mesh: spark.mesh, mat: spark.mat, phase: i * 0.9 });
  }

  let time = 0;
  return {
    root,
    update(dt) {
      time += dt;
      for (const puff of steam) {
        puff.mesh.position.y += puff.speed * dt;
        puff.mesh.position.x = puff.baseX + (Math.sin((time * 0.8) + puff.phase) * puff.sway);
        puff.mat.alpha = 0.18 + (Math.sin((time * 0.6) + puff.phase) * 0.06);
        if (puff.mesh.position.y > floorY + 18) {
          puff.mesh.position.y = puff.baseY;
        }
      }
      for (const spark of sparks) {
        spark.mat.alpha = 0.36 + (Math.sin((time * 7.2) + spark.phase) * 0.20);
        spark.mesh.position.y += Math.sin((time * 2.4) + spark.phase) * 0.0025;
      }
    },
    reset() {
      time = 0;
      for (const puff of steam) {
        puff.mesh.position.x = puff.baseX;
        puff.mesh.position.y = puff.baseY;
      }
    },
  };
}

function createStormEnvironmentFx(scene, {
  extents = { minX: -24, maxX: 140 },
  floorY = 0,
  farZ = 16,
} = {}) {
  const root = new BABYLON.TransformNode('stormEnvFx', scene);
  markDecorNode(root);
  const span = Math.max(120, (extents.maxX - extents.minX) + 28);
  const cx = (extents.minX + extents.maxX) * 0.5;

  // Far stormy sky — readable blue-grey (was near-black)
  const sky = BABYLON.MeshBuilder.CreatePlane('stormBackdrop', { width: span, height: 54 }, scene);
  sky.parent = root;
  sky.position.set(cx, floorY + 12, farZ + 5);
  const skyMat = applyGradientPlaneMaterial(scene, sky, 'stormBackdrop', {
    top: 'rgba(44,68,108,0.98)',   // was rgba(10,16,34) — much brighter stormy blue
    mid: 'rgba(68,100,158,0.94)',  // was rgba(26,40,72)
    bottom: 'rgba(100,148,210,0.74)',
    alpha: 0.98,
    emissiveScale: 0.18,           // was 0.12
  });

  // Bright horizon glow (was barely visible at alpha 0.42)
  const horizon = BABYLON.MeshBuilder.CreatePlane('stormHorizonGlow', { width: span, height: 16 }, scene);
  horizon.parent = root;
  horizon.position.set(cx, floorY + 6.8, farZ + 4.3);
  const horizonMat = applyGradientPlaneMaterial(scene, horizon, 'stormHorizonGlow', {
    top: 'rgba(100,148,200,0.0)',
    mid: 'rgba(120,180,240,0.52)',  // was 0.28
    bottom: 'rgba(180,230,255,0.14)',
    alpha: 0.64,                    // was 0.42
    emissiveScale: 0.22,
  });

  // ── Near rocky cliff wall at Z=13 — defines this as a canyon/ridge level ──
  // Spans the full level behind the lane — unmistakably a rock cliff face.
  const nearCliff = createRectPlane(scene, 'stormNearCliff', {
    width: span + 14,
    height: 38,
    color: new BABYLON.Color3(0.16, 0.18, 0.22),
    emissive: new BABYLON.Color3(0.05, 0.07, 0.12),
    alpha: 0.84,
  });
  nearCliff.plane.parent = root;
  nearCliff.plane.position.set(cx, floorY + 16, 13);

  // Rocky strata lines across the near cliff face
  for (let s = 0; s < 6; s++) {
    const strata = createRectPlane(scene, `stormStrata_${s}`, {
      width: span + 10,
      height: 0.36 + ((s % 2) * 0.18),
      color: new BABYLON.Color3(0.24, 0.26, 0.32),
      emissive: new BABYLON.Color3(0.08, 0.10, 0.16),
      alpha: 0.62,
    });
    strata.plane.parent = root;
    strata.plane.position.set(cx, floorY + 3 + (s * 3.4) + ((s % 2) * 0.4), 12.7);
    strata.plane.rotation.z = ((s % 2 === 0) ? 0.01 : -0.01);
  }

  // Dramatic storm cloud masses — large, solid-ish, visually dominate upper half
  for (let i = 0; i < 5; i++) {
    const cloudMass = createRectPlane(scene, `stormCloudMass_${i}`, {
      width: 38 + ((i % 2) * 14),
      height: 18 + ((i % 3) * 5),
      color: new BABYLON.Color3(0.22, 0.28, 0.40),
      emissive: new BABYLON.Color3(0.06, 0.10, 0.18),
      alpha: 0.64,
    });
    cloudMass.plane.parent = root;
    cloudMass.plane.position.set(
      extents.minX + 20 + (i * 34),
      floorY + 14 + ((i % 2) * 2.4),
      farZ + 3 + ((i % 2) * 0.5),
    );
  }

  // Far cliff silhouettes — much brighter (alpha 0.72 was 0.34)
  const cliffs = [];
  for (let i = 0; i < 9; i++) {
    const cliff = createRectPlane(scene, `stormCliff_${i}`, {
      width: 12 + ((i % 3) * 5),
      height: 20 + ((i % 4) * 5),
      color: new BABYLON.Color3(0.12, 0.16, 0.22),  // was 0.06/0.10/0.16
      emissive: new BABYLON.Color3(0.04, 0.06, 0.10),
      alpha: 0.72,  // was 0.34 — doubled+
    });
    cliff.plane.parent = root;
    cliff.plane.position.set(extents.minX + 10 + (i * 20), floorY + 8 + ((i % 2) * 2), farZ + 3.2 + ((i % 2) * 0.4));
    cliff.plane.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.06;
    cliffs.push(cliff);
  }

  // Storm towers / lightning rods — more prominent (alpha 0.60 was 0.26)
  const towers = [];
  for (let i = 0; i < 4; i++) {
    const tower = createRectPlane(scene, `stormTower_${i}`, {
      width: 1.6,
      height: 18 + (i * 3),
      color: new BABYLON.Color3(0.20, 0.22, 0.30),  // was 0.12/0.14/0.20
      emissive: new BABYLON.Color3(0.06, 0.08, 0.14),
      alpha: 0.60,  // was 0.26
    });
    tower.plane.parent = root;
    tower.plane.position.set(extents.minX + 20 + (i * 34), floorY + 9.2, farZ + 1.5);
    towers.push(tower);
  }

  // Wind ribbons — more vivid (alpha 0.26 was 0.14)
  const windRibbons = [];
  for (let i = 0; i < 6; i++) {
    const ribbon = createRectPlane(scene, `stormRibbon_${i}`, {
      width: 26 + ((i % 2) * 8),
      height: 0.52,
      color: new BABYLON.Color3(0.72, 0.90, 1.0),
      emissive: new BABYLON.Color3(0.20, 0.34, 0.42),
      alpha: 0.26,  // was 0.14
    });
    ribbon.plane.parent = root;
    ribbon.plane.position.set(extents.minX + 16 + (i * 28), floorY + 8.6 + ((i % 3) * 2.2), farZ - 0.8);
    ribbon.plane.rotation.z = -0.18;
    windRibbons.push({
      plane: ribbon.plane,
      mat: ribbon.mat,
      baseX: ribbon.plane.position.x,
      baseY: ribbon.plane.position.y,
      phase: i * 0.8,
    });
  }

  // Rain streaks — more visible (alpha 0.26 was 0.18)
  const rain = [];
  for (let i = 0; i < 60; i++) {
    const streak = createRectPlane(scene, `stormRain_${i}`, {
      width: 0.09,
      height: 1.8 + ((i % 3) * 0.5),
      color: new BABYLON.Color3(0.80, 0.92, 1.0),
      emissive: new BABYLON.Color3(0.14, 0.20, 0.28),
      alpha: 0.26,  // was 0.18
    });
    streak.plane.parent = root;
    streak.plane.position.set(
      extents.minX + ((i * 4.1) % (extents.maxX - extents.minX)),
      floorY + 6 + ((i * 0.8) % 14),
      farZ - 1.0 + ((i % 3) * 0.3),
    );
    streak.plane.rotation.z = 0.22;
    rain.push({
      plane: streak.plane,
      baseX: streak.plane.position.x,
      speed: 10 + ((i % 4) * 2),
    });
  }

  // Kites — more vivid (alpha 0.44 was 0.22)
  const kites = [];
  for (let i = 0; i < 7; i++) {
    const kite = createRectPlane(scene, `stormKite_${i}`, {
      width: 2.2,
      height: 3.0,
      color: new BABYLON.Color3(0.34, 0.24, 0.46),
      emissive: new BABYLON.Color3(0.12, 0.08, 0.22),
      alpha: 0.44,  // was 0.22
    });
    kite.plane.parent = root;
    kite.plane.position.set(extents.minX + 12 + (i * 24), floorY + 10 + ((i % 3) * 2.4), farZ - 0.5);
    kite.plane.rotation.z = 0.25;
    const tail = createRectPlane(scene, `stormKiteTail_${i}`, {
      width: 0.12,
      height: 2.2,
      color: new BABYLON.Color3(0.76, 0.92, 1.0),
      emissive: new BABYLON.Color3(0.16, 0.26, 0.34),
      alpha: 0.30,  // was 0.16
    });
    tail.plane.parent = kite.plane;
    tail.plane.position.set(0, -2.2, 0);
    kites.push({ plane: kite.plane, tail: tail.plane, phase: i * 0.9, baseY: kite.plane.position.y });
  }

  // Lightning flash
  const flash = createRectPlane(scene, 'stormFlash', {
    width: span,
    height: 50,
    color: new BABYLON.Color3(0.76, 0.90, 1.0),
    emissive: new BABYLON.Color3(0.34, 0.40, 0.50),
    alpha: 0.02,
  });
  flash.plane.parent = root;
  flash.plane.position.set(cx, floorY + 12, farZ + 4.8);

  let time = 0;
  return {
    root,
    update(dt) {
      time += dt;
      skyMat.emissiveColor = new BABYLON.Color3(
        0.14 + (Math.sin(time * 0.7) * 0.02),
        0.14 + (Math.sin(time * 0.9) * 0.02),
        0.18 + (Math.sin(time * 0.5) * 0.03),
      );
      horizonMat.alpha = 0.56 + (Math.sin(time * 0.32) * 0.06);
      for (const ribbon of windRibbons) {
        ribbon.plane.position.x = ribbon.baseX + (Math.sin((time * 0.42) + ribbon.phase) * 4.2);
        ribbon.plane.position.y = ribbon.baseY + (Math.sin((time * 0.92) + ribbon.phase) * 0.42);
        ribbon.plane.rotation.z = -0.18 + (Math.sin((time * 0.76) + ribbon.phase) * 0.06);
        ribbon.mat.alpha = 0.18 + (Math.sin((time * 1.4) + ribbon.phase) * 0.06);
      }
      for (const streak of rain) {
        streak.plane.position.x += streak.speed * 0.10 * dt;
        streak.plane.position.y -= streak.speed * dt;
        if (streak.plane.position.y < floorY + 1.2) {
          streak.plane.position.x = streak.baseX;
          streak.plane.position.y = floorY + 18;
        }
      }
      for (const kite of kites) {
        kite.plane.position.y = kite.baseY + (Math.sin((time * 0.9) + kite.phase) * 0.5);
        kite.plane.rotation.z = 0.18 + (Math.sin((time * 1.3) + kite.phase) * 0.12);
        kite.tail.rotation.z = Math.sin((time * 1.6) + kite.phase) * 0.16;
      }
      flash.mat.alpha = 0.02 + Math.max(0, Math.sin((time * 0.52) + 0.8) - 0.88) * 0.52;
    },
    reset() {
      time = 0;
    },
  };
}

function createLibraryEnvironmentFx(scene, {
  extents = { minX: -24, maxX: 140 },
  floorY = 0,
  farZ = 16,
} = {}) {
  const root = new BABYLON.TransformNode('libraryEnvFx', scene);
  markDecorNode(root);
  const span = Math.max(120, (extents.maxX - extents.minX) + 26);
  const cx = (extents.minX + extents.maxX) * 0.5;

  // Far warm sepia backdrop — cozy library glow (was near-black)
  const backdrop = BABYLON.MeshBuilder.CreatePlane('libraryBackdrop', { width: span, height: 48 }, scene);
  backdrop.parent = root;
  backdrop.position.set(cx, floorY + 11, farZ + 5);
  const backdropMat = applyGradientPlaneMaterial(scene, backdrop, 'libraryBackdrop', {
    top: 'rgba(68,42,24,0.98)',    // was rgba(30,18,12) — much brighter warm sepia
    mid: 'rgba(108,68,36,0.96)',   // was rgba(72,42,22)
    bottom: 'rgba(172,128,78,0.70)',
    alpha: 0.98,
    emissiveScale: 0.14,           // was 0.08
  });

  // ── Near bookcase wall at Z=13 — the library signature backdrop ──
  // Solid warm wood wall immediately behind the lane — unmistakably a library.
  const bookcaseWall = createRectPlane(scene, 'libraryBookcaseWall', {
    width: span + 14,
    height: 36,
    color: new BABYLON.Color3(0.22, 0.14, 0.07),
    emissive: new BABYLON.Color3(0.08, 0.04, 0.02),
    alpha: 0.92,
  });
  bookcaseWall.plane.parent = root;
  bookcaseWall.plane.position.set(cx, floorY + 16, 13);

  // Horizontal shelf lines on the bookcase wall — clearly identifies as library
  for (let s = 0; s < 9; s++) {
    const shelfLine = createRectPlane(scene, `libraryNearShelf_${s}`, {
      width: span + 10,
      height: 0.20,
      color: new BABYLON.Color3(0.52, 0.36, 0.18),
      emissive: new BABYLON.Color3(0.16, 0.08, 0.02),
      alpha: 0.76,
    });
    shelfLine.plane.parent = root;
    shelfLine.plane.position.set(cx, floorY + 0.6 + (s * 2.8), 12.7);
  }

  // Book spine color blocks between shelf lines — warm amber/burgundy/green variety
  const spineColors = [
    [0.64, 0.24, 0.12], [0.28, 0.48, 0.22], [0.72, 0.56, 0.18],
    [0.48, 0.22, 0.44], [0.28, 0.36, 0.54],
  ];
  for (let row = 0; row < 8; row++) {
    for (let b = 0; b < 16; b++) {
      const sc = spineColors[(row + b) % spineColors.length];
      const spine = createRectPlane(scene, `librarySpine_${row}_${b}`, {
        width: (extents.maxX - extents.minX) / 16,
        height: 2.2,
        color: new BABYLON.Color3(sc[0], sc[1], sc[2]),
        emissive: new BABYLON.Color3(sc[0] * 0.06, sc[1] * 0.06, sc[2] * 0.06),
        alpha: 0.58,
      });
      spine.plane.parent = root;
      spine.plane.position.set(
        extents.minX + ((b + 0.5) * ((extents.maxX - extents.minX) / 16)),
        floorY + 1.4 + (row * 2.8),
        12.5,
      );
    }
  }

  // Moon window glows — brighter (alpha 0.42 was 0.22)
  const moonWindows = [];
  for (let i = 0; i < 4; i++) {
    const win = createRectPlane(scene, `libraryWindow_${i}`, {
      width: 9,
      height: 20,
      color: new BABYLON.Color3(0.34, 0.30, 0.22),
      emissive: new BABYLON.Color3(0.12, 0.08, 0.04),
      alpha: 0.42,  // was 0.22
    });
    win.plane.parent = root;
    win.plane.position.set(extents.minX + 18 + (i * 38), floorY + 11.5, farZ + 2.4);
    moonWindows.push(win);

    const beam = createRectPlane(scene, `libraryMoonbeam_${i}`, {
      width: 7.0,
      height: 20,
      color: new BABYLON.Color3(0.96, 0.88, 0.64),
      emissive: new BABYLON.Color3(0.24, 0.16, 0.08),
      alpha: 0.18,  // was 0.08
    });
    beam.plane.parent = root;
    beam.plane.position.set(win.plane.position.x, floorY + 6.6, farZ + 0.6);
    beam.plane.rotation.z = 0.06;
    moonWindows.push(beam);
  }

  // Bookcase columns — brighter (alpha 0.62 was 0.28)
  const shelves = [];
  for (let i = 0; i < 10; i++) {
    const shelf = createRectPlane(scene, `libraryShelf_${i}`, {
      width: 8 + ((i % 2) * 4),
      height: 22 + ((i % 3) * 5),
      color: new BABYLON.Color3(0.28, 0.16, 0.08),  // was 0.14/0.08/0.04
      emissive: new BABYLON.Color3(0.10, 0.05, 0.02),
      alpha: 0.62,  // was 0.28
    });
    shelf.plane.parent = root;
    shelf.plane.position.set(extents.minX + 10 + (i * 18), floorY + 10 + ((i % 2) * 0.8), farZ + 2.2 + ((i % 3) * 0.35));
    shelves.push(shelf);
  }

  // Gothic arches — more visible (alpha 0.28 was 0.10)
  const arches = [];
  for (let i = 0; i < 5; i++) {
    const arch = createRectPlane(scene, `libraryArch_${i}`, {
      width: 18,
      height: 24,
      color: new BABYLON.Color3(0.46, 0.28, 0.12),  // was 0.32/0.20/0.10
      emissive: new BABYLON.Color3(0.14, 0.06, 0.02),
      alpha: 0.28,  // was 0.10
    });
    arch.plane.parent = root;
    arch.plane.position.set(extents.minX + 18 + (i * 30), floorY + 11.2, farZ + 1.2);
    arches.push(arch);
  }

  // Lamp pools on floor — brighter (alpha 0.22 was 0.12)
  const lampPools = [];
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const pool = createRectPlane(scene, `libraryLampPool_${i}`, {
      width: 12,
      height: 5,
      color: new BABYLON.Color3(0.96, 0.86, 0.46),
      emissive: new BABYLON.Color3(0.28, 0.18, 0.06),
      alpha: 0.22,  // was 0.12
    });
    pool.plane.parent = root;
    pool.plane.position.set(extents.minX + 20 + (i * 34), floorY + 1.4, farZ - 0.6);
    pool.plane.rotation.x = Math.PI * 0.5;
    lampPools.push(pool);

    const lamp = createParticleSphere(scene, `libraryLampFx_${i}`, {
      diameter: 0.40,
      color: new BABYLON.Color3(1.0, 0.92, 0.68),
      emissive: new BABYLON.Color3(0.26, 0.18, 0.08),
      alpha: 0.52,  // was 0.38
    });
    lamp.mesh.parent = root;
    lamp.mesh.position.set(pool.plane.position.x, floorY + 11 + ((i % 2) * 1.2), farZ - 0.3);
    lamps.push({ mesh: lamp.mesh, mat: lamp.mat, baseY: lamp.mesh.position.y, phase: i * 0.9 });
  }

  // Floating pages — more visible (alpha 0.42 was 0.20)
  const pages = [];
  for (let i = 0; i < 18; i++) {
    const page = createRectPlane(scene, `libraryPage_${i}`, {
      width: 0.76,
      height: 0.98,
      color: new BABYLON.Color3(0.98, 0.95, 0.84),
      emissive: new BABYLON.Color3(0.14, 0.10, 0.05),
      alpha: 0.42,  // was 0.20
    });
    page.plane.parent = root;
    page.plane.position.set(
      extents.minX + 8 + ((i * 10.2) % (extents.maxX - extents.minX)),
      floorY + 4 + ((i * 0.8) % 12),
      farZ - 0.4 + ((i % 3) * 0.2),
    );
    page.plane.rotation.z = ((i % 2) ? 1 : -1) * 0.14;
    pages.push({
      plane: page.plane,
      baseX: page.plane.position.x,
      baseY: page.plane.position.y,
      phase: i * 0.6,
    });
  }

  // Dust motes — more visible (alpha 0.38 was 0.22)
  const motes = [];
  for (let i = 0; i < 28; i++) {
    const mote = createParticleSphere(scene, `libraryMote_${i}`, {
      diameter: 0.14 + ((i % 3) * 0.03),
      color: new BABYLON.Color3(0.96, 0.90, 0.78),
      emissive: new BABYLON.Color3(0.18, 0.12, 0.06),
      alpha: 0.38,  // was 0.22
    });
    mote.mesh.parent = root;
    mote.mesh.position.set(
      extents.minX + ((i * 7.7) % (extents.maxX - extents.minX)),
      floorY + 3 + ((i * 0.9) % 12),
      farZ - 0.8 + ((i % 4) * 0.22),
    );
    motes.push({
      mesh: mote.mesh,
      baseX: mote.mesh.position.x,
      baseY: mote.mesh.position.y,
      phase: i * 0.8,
    });
  }

  let time = 0;
  return {
    root,
    update(dt) {
      time += dt;
      backdropMat.emissiveColor = new BABYLON.Color3(
        0.12 + (Math.sin(time * 0.22) * 0.02),
        0.10 + (Math.sin(time * 0.28) * 0.01),
        0.08,
      );
      for (const pool of lampPools) {
        pool.mat.alpha = 0.18 + (Math.sin(time * 0.7) * 0.04);
      }
      for (const lamp of lamps) {
        lamp.mesh.position.y = lamp.baseY + (Math.sin((time * 0.9) + lamp.phase) * 0.14);
        lamp.mat.alpha = 0.40 + (Math.sin((time * 1.2) + lamp.phase) * 0.10);
      }
      for (const page of pages) {
        page.plane.position.x = page.baseX + (Math.sin((time * 0.36) + page.phase) * 0.42);
        page.plane.position.y = page.baseY + (Math.sin((time * 0.92) + page.phase) * 0.34);
        page.plane.rotation.z += dt * (0.16 + ((page.phase % 1) * 0.06));
      }
      for (const mote of motes) {
        mote.mesh.position.x = mote.baseX + (Math.sin((time * 0.5) + mote.phase) * 0.18);
        mote.mesh.position.y = mote.baseY + (Math.sin((time * 0.8) + mote.phase) * 0.24);
      }
    },
    reset() {
      time = 0;
    },
  };
}

function createCampEnvironmentFx(scene, {
  extents = { minX: -24, maxX: 140 },
  floorY = 0,
  farZ = 16,
} = {}) {
  const root = new BABYLON.TransformNode('campEnvFx', scene);
  markDecorNode(root);

  const cx = (extents.minX + extents.maxX) * 0.5;
  const span = Math.max(120, (extents.maxX - extents.minX) + 26);

  // Starlit night sky — readable deep blue-indigo (not black)
  const sky = BABYLON.MeshBuilder.CreatePlane('campBackdrop', { width: span, height: 52 }, scene);
  sky.parent = root;
  sky.position.set(cx, 12, farZ + 5);
  const skyMat = applyGradientPlaneMaterial(scene, sky, 'campBackdrop', {
    top: 'rgba(28,42,80,0.98)',
    mid: 'rgba(44,58,96,0.96)',
    bottom: 'rgba(72,52,28,0.64)',
    alpha: 0.98,
    emissiveScale: 0.14,
  });

  // Far mountain silhouettes — visible indigo-grey
  const mountains = [];
  for (let i = 0; i < 6; i++) {
    const ridge = createRectPlane(scene, `campMountain_${i}`, {
      width: 20 + ((i % 3) * 6),
      height: 12 + ((i % 2) * 4),
      color: new BABYLON.Color3(0.16, 0.18, 0.26),
      emissive: new BABYLON.Color3(0.06, 0.07, 0.10),
      alpha: 0.56,
    });
    ridge.plane.parent = root;
    ridge.plane.position.set(extents.minX + 12 + (i * 28), floorY + 5.8 + ((i % 2) * 1.0), farZ + 2.4);
    mountains.push(ridge);
  }

  // Mid-distance tree line — visible dark pine silhouettes
  const farTrees = [];
  for (let i = 0; i < 10; i++) {
    const tree = createRectPlane(scene, `campFarTree_${i}`, {
      width: 3.0 + ((i % 2) * 0.8),
      height: 12 + ((i % 3) * 2),
      color: new BABYLON.Color3(0.08, 0.12, 0.10),
      emissive: new BABYLON.Color3(0.03, 0.05, 0.04),
      alpha: 0.72,
    });
    tree.plane.parent = root;
    tree.plane.position.set(extents.minX + 8 + (i * 17), floorY + 6.0, farZ + 1.4 + ((i % 3) * 0.3));
    farTrees.push(tree);
  }

  // NEAR FOREST WALL at Z=13 — Level 9 signature: dense pine backdrop, nearly opaque
  const forestWall = createRectPlane(scene, 'campForestWall', {
    width: span,
    height: 28,
    color: new BABYLON.Color3(0.06, 0.10, 0.08),
    emissive: new BABYLON.Color3(0.02, 0.04, 0.03),
    alpha: 0.88,
  });
  forestWall.plane.parent = root;
  forestWall.plane.position.set(cx, floorY + 10, 13);

  // Moonlit sky glow at top of forest wall
  const moonGlow = createRectPlane(scene, 'campMoonGlow', {
    width: span * 0.45,
    height: 6,
    color: new BABYLON.Color3(0.62, 0.72, 0.88),
    emissive: new BABYLON.Color3(0.28, 0.34, 0.44),
    alpha: 0.38,
  });
  moonGlow.plane.parent = root;
  moonGlow.plane.position.set(cx + 18, floorY + 21, 12.8);

  // Close individual pine tree silhouettes at Z=11 — in front of forest wall
  const nearTrees = [];
  const treeSpacing = (extents.maxX - extents.minX + 22) / 14;
  for (let i = 0; i < 14; i++) {
    const h = 14 + ((i % 4) * 2.5);
    const w = 3.2 + ((i % 3) * 0.6);
    const tree = createRectPlane(scene, `campNearTree_${i}`, {
      width: w,
      height: h,
      color: new BABYLON.Color3(0.04, 0.08, 0.06),
      emissive: new BABYLON.Color3(0.01, 0.03, 0.02),
      alpha: 0.92,
    });
    tree.plane.parent = root;
    tree.plane.position.set(extents.minX + (i * treeSpacing), floorY + (h * 0.5) + 0.4, 11);
    nearTrees.push(tree);
  }

  // Stars — generous field, properly bright, twinkling
  const stars = [];
  for (let i = 0; i < 64; i++) {
    const star = createParticleSphere(scene, `campStar_${i}`, {
      diameter: 0.07 + ((i % 4) * 0.025),
      color: new BABYLON.Color3(1.0, 0.96, 0.82),
      emissive: new BABYLON.Color3(0.32, 0.26, 0.14),
      alpha: 0.62,
    });
    star.mesh.parent = root;
    star.mesh.position.set(
      extents.minX + ((i * 2.9) % (extents.maxX - extents.minX + 10)),
      floorY + 12 + ((i * 0.52) % 14),
      farZ + 2.2,
    );
    stars.push({ mesh: star.mesh, mat: star.mat, phase: i * 0.73 });
  }

  // Drifting clouds — night cloud masses, softly visible
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const cloud = createRectPlane(scene, `campCloud_${i}`, {
      width: 20 + ((i % 2) * 4),
      height: 5 + ((i % 3) * 1.5),
      color: new BABYLON.Color3(0.24, 0.28, 0.38),
      emissive: new BABYLON.Color3(0.08, 0.10, 0.14),
      alpha: 0.32,
    });
    cloud.plane.parent = root;
    cloud.plane.position.set(extents.minX + 16 + (i * 28), floorY + 16 + ((i % 2) * 1.6), farZ + 1.4);
    clouds.push({ plane: cloud.plane, baseX: cloud.plane.position.x, phase: i * 0.8 });
  }

  // Tents — warm canvas, clearly visible
  const tents = [];
  for (let i = 0; i < 3; i++) {
    const tent = createRectPlane(scene, `campTent_${i}`, {
      width: 9 + (i * 1.2),
      height: 6 + ((i % 2) * 1.6),
      color: new BABYLON.Color3(0.52, 0.34, 0.18),
      emissive: new BABYLON.Color3(0.14, 0.08, 0.03),
      alpha: 0.72,
    });
    tent.plane.parent = root;
    tent.plane.position.set(extents.maxX - 54 + (i * 10), floorY + 4.6 + ((i % 2) * 0.4), 12.4);
    tents.push(tent);
  }

  // Hanging lanterns — warm amber glow, Level 9 signature element
  const lanterns = [];
  for (let i = 0; i < 12; i++) {
    const lantern = createParticleSphere(scene, `campLanternFx_${i}`, {
      diameter: 0.46,
      color: new BABYLON.Color3(1.0, 0.76, 0.44),
      emissive: new BABYLON.Color3(0.38, 0.22, 0.08),
      alpha: 0.68,
    });
    lantern.mesh.parent = root;
    lantern.mesh.position.set(extents.minX + 12 + (i * 12), floorY + 9.6 + ((i % 2) * 0.8), 12.2);
    lanterns.push({ mesh: lantern.mesh, mat: lantern.mat, baseY: lantern.mesh.position.y, phase: i * 0.65 });
  }

  // Fireflies — close-in, clearly glowing chartreuse-gold
  const fireflies = [];
  for (let i = 0; i < 22; i++) {
    const fly = createParticleSphere(scene, `campFirefly_${i}`, {
      diameter: 0.12,
      color: new BABYLON.Color3(0.88, 1.0, 0.48),
      emissive: new BABYLON.Color3(0.30, 0.38, 0.08),
      alpha: 0.48,
    });
    fly.mesh.parent = root;
    fly.mesh.position.set(
      extents.minX + 10 + ((i * 7.8) % (extents.maxX - extents.minX - 10)),
      floorY + 2.4 + ((i * 0.72) % 7.2),
      9.4 + ((i % 4) * 0.5),
    );
    fireflies.push({
      mesh: fly.mesh,
      mat: fly.mat,
      baseX: fly.mesh.position.x,
      baseY: fly.mesh.position.y,
      phase: i * 0.7,
    });
  }

  let time = 0;
  return {
    root,
    update(dt) {
      time += dt;
      skyMat.emissiveColor = new BABYLON.Color3(
        0.14 + (Math.sin(time * 0.14) * 0.01),
        0.18 + (Math.sin(time * 0.18) * 0.01),
        0.24,
      );
      for (const star of stars) {
        star.mat.alpha = 0.42 + (Math.sin((time * 1.4) + star.phase) * 0.22);
      }
      for (const cloud of clouds) {
        cloud.plane.position.x = cloud.baseX + (Math.sin((time * 0.18) + cloud.phase) * 2.4);
      }
      for (const lantern of lanterns) {
        lantern.mesh.position.y = lantern.baseY + (Math.sin((time * 1.1) + lantern.phase) * 0.18);
        lantern.mat.alpha = 0.56 + (Math.sin((time * 1.4) + lantern.phase) * 0.12);
      }
      for (const fly of fireflies) {
        fly.mesh.position.x = fly.baseX + (Math.sin((time * 0.58) + fly.phase) * 0.44);
        fly.mesh.position.y = fly.baseY + (Math.sin((time * 1.1) + fly.phase) * 0.28);
        fly.mat.alpha = 0.28 + (Math.sin((time * 1.9) + fly.phase) * 0.22);
      }
    },
    reset() {
      time = 0;
    },
  };
}

export function createThemeEnvironmentFx(scene, theme, options = {}) {
  if (theme === 'factory') return createFactoryEnvironmentFx(scene, options);
  if (theme === 'storm') return createStormEnvironmentFx(scene, options);
  if (theme === 'library') return createLibraryEnvironmentFx(scene, options);
  if (theme === 'camp') return createCampEnvironmentFx(scene, options);
  return createAquariumEnvironmentFx(scene, options);
}

export {
  createFactoryEnvironmentFx,
  createStormEnvironmentFx,
  createLibraryEnvironmentFx,
  createCampEnvironmentFx,
};
