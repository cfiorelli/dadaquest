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
    'rgba(8, 24, 42, 0.96)',
    'rgba(7, 36, 58, 0.74)',
    'rgba(0, 10, 18, 0.0)',
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
    mat.diffuseColor = new BABYLON.Color3(0.05, 0.20, 0.26);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.10);
    mat.alpha = 0.24;
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
    shadowMat.alpha = 0.22;
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
        fish.mat.alpha = 0.16 + (Math.sin((time * 0.5) + fish.phase) * 0.04);
        if (fish.mesh.position.x > extents.maxX + 10) {
          fish.mesh.position.x = extents.minX - fish.drift;
        }
      }
      for (let i = 0; i < nearFrames.length; i++) {
        const frame = nearFrames[i];
        frame.panelMat.alpha = 0.10 + (Math.sin((time * 0.22) + i) * 0.02);
        for (let j = 0; j < frame.frameMaterials.length; j++) {
          frame.frameMaterials[j].alpha = 0.24 + (Math.sin((time * 0.6) + i + (j * 0.4)) * 0.04);
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

  const backdrop = createRectPlane(scene, 'factoryBackdrop', {
    width: Math.max(120, (extents.maxX - extents.minX) + 24),
    height: 46,
    color: new BABYLON.Color3(0.18, 0.14, 0.10),
    emissive: new BABYLON.Color3(0.08, 0.05, 0.03),
    alpha: 0.96,
  });
  backdrop.plane.parent = root;
  backdrop.plane.position.set((extents.minX + extents.maxX) * 0.5, 10.5, farZ + 5);

  const hazardStripe = createRectPlane(scene, 'factoryStripe', {
    width: Math.max(120, (extents.maxX - extents.minX) + 24),
    height: 8,
    color: new BABYLON.Color3(0.72, 0.58, 0.16),
    emissive: new BABYLON.Color3(0.20, 0.12, 0.02),
    alpha: 0.08,
  });
  hazardStripe.plane.parent = root;
  hazardStripe.plane.position.set((extents.minX + extents.maxX) * 0.5, floorY + 6.8, farZ + 3.8);
  hazardStripe.plane.rotation.z = -0.08;

  const girders = [];
  for (let i = 0; i < 7; i++) {
    const girder = createRectPlane(scene, `factoryGirder_${i}`, {
      width: 2.2,
      height: 24,
      color: new BABYLON.Color3(0.26, 0.18, 0.10),
      emissive: new BABYLON.Color3(0.08, 0.05, 0.02),
      alpha: 0.34,
    });
    girder.plane.parent = root;
    girder.plane.position.set(extents.minX + 10 + (i * 22), floorY + 10.0, farZ + 2.2 + (i % 2));
    girders.push(girder);
  }

  const steam = [];
  for (let i = 0; i < 18; i++) {
    const puff = createParticleSphere(scene, `factorySteam_${i}`, {
      diameter: 0.36 + ((i % 3) * 0.10),
      color: new BABYLON.Color3(0.82, 0.78, 0.72),
      emissive: new BABYLON.Color3(0.12, 0.10, 0.08),
      alpha: 0.16,
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

  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const spark = createParticleSphere(scene, `factorySpark_${i}`, {
      diameter: 0.08,
      color: new BABYLON.Color3(1.0, 0.82, 0.30),
      emissive: new BABYLON.Color3(0.44, 0.22, 0.04),
      alpha: 0.45,
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
        puff.mat.alpha = 0.10 + (Math.sin((time * 0.6) + puff.phase) * 0.03);
        if (puff.mesh.position.y > floorY + 16) {
          puff.mesh.position.y = puff.baseY;
        }
      }
      for (const spark of sparks) {
        spark.mat.alpha = 0.24 + (Math.sin((time * 7.2) + spark.phase) * 0.18);
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
  const sky = BABYLON.MeshBuilder.CreatePlane('stormBackdrop', { width: span, height: 50 }, scene);
  sky.parent = root;
  sky.position.set((extents.minX + extents.maxX) * 0.5, 12, farZ + 5);
  const skyMat = applyGradientPlaneMaterial(scene, sky, 'stormBackdrop', {
    top: 'rgba(10,16,34,0.98)',
    mid: 'rgba(26,40,72,0.94)',
    bottom: 'rgba(42,78,122,0.72)',
    alpha: 0.98,
    emissiveScale: 0.12,
  });

  const horizon = BABYLON.MeshBuilder.CreatePlane('stormHorizonGlow', { width: span, height: 16 }, scene);
  horizon.parent = root;
  horizon.position.set((extents.minX + extents.maxX) * 0.5, floorY + 6.8, farZ + 4.3);
  const horizonMat = applyGradientPlaneMaterial(scene, horizon, 'stormHorizonGlow', {
    top: 'rgba(92,132,186,0.0)',
    mid: 'rgba(106,168,224,0.28)',
    bottom: 'rgba(164,228,255,0.06)',
    alpha: 0.42,
    emissiveScale: 0.18,
  });

  const cliffs = [];
  for (let i = 0; i < 9; i++) {
    const cliff = createRectPlane(scene, `stormCliff_${i}`, {
      width: 10 + ((i % 3) * 4),
      height: 18 + ((i % 4) * 4),
      color: new BABYLON.Color3(0.06, 0.10, 0.16),
      emissive: new BABYLON.Color3(0.02, 0.04, 0.06),
      alpha: 0.34,
    });
    cliff.plane.parent = root;
    cliff.plane.position.set(extents.minX + 10 + (i * 20), floorY + 6 + ((i % 2) * 1.8), farZ + 3.2 + ((i % 2) * 0.4));
    cliff.plane.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.05;
    cliffs.push(cliff);
  }

  const towers = [];
  for (let i = 0; i < 4; i++) {
    const tower = createRectPlane(scene, `stormTower_${i}`, {
      width: 1.4,
      height: 16 + (i * 2.4),
      color: new BABYLON.Color3(0.12, 0.14, 0.20),
      emissive: new BABYLON.Color3(0.04, 0.06, 0.10),
      alpha: 0.26,
    });
    tower.plane.parent = root;
    tower.plane.position.set(extents.minX + 20 + (i * 34), floorY + 9.2, farZ + 1.5);
    towers.push(tower);
  }

  const windRibbons = [];
  for (let i = 0; i < 6; i++) {
    const ribbon = createRectPlane(scene, `stormRibbon_${i}`, {
      width: 22 + ((i % 2) * 6),
      height: 0.44,
      color: new BABYLON.Color3(0.66, 0.86, 1.0),
      emissive: new BABYLON.Color3(0.16, 0.28, 0.34),
      alpha: 0.14,
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

  const rain = [];
  for (let i = 0; i < 56; i++) {
    const streak = createRectPlane(scene, `stormRain_${i}`, {
      width: 0.08,
      height: 1.6 + ((i % 3) * 0.4),
      color: new BABYLON.Color3(0.78, 0.90, 1.0),
      emissive: new BABYLON.Color3(0.10, 0.16, 0.22),
      alpha: 0.18,
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

  const kites = [];
  for (let i = 0; i < 7; i++) {
    const kite = createRectPlane(scene, `stormKite_${i}`, {
      width: 2.0,
      height: 2.8,
      color: new BABYLON.Color3(0.26, 0.18, 0.34),
      emissive: new BABYLON.Color3(0.08, 0.05, 0.14),
      alpha: 0.22,
    });
    kite.plane.parent = root;
    kite.plane.position.set(extents.minX + 12 + (i * 24), floorY + 10 + ((i % 3) * 2), farZ - 0.5);
    kite.plane.rotation.z = 0.25;
    const tail = createRectPlane(scene, `stormKiteTail_${i}`, {
      width: 0.10,
      height: 2.0,
      color: new BABYLON.Color3(0.72, 0.88, 1.0),
      emissive: new BABYLON.Color3(0.12, 0.20, 0.26),
      alpha: 0.16,
    });
    tail.plane.parent = kite.plane;
    tail.plane.position.set(0, -2.0, 0);
    kites.push({ plane: kite.plane, tail: tail.plane, phase: i * 0.9, baseY: kite.plane.position.y });
  }

  const flash = createRectPlane(scene, 'stormFlash', {
    width: span,
    height: 48,
    color: new BABYLON.Color3(0.74, 0.88, 1.0),
    emissive: new BABYLON.Color3(0.30, 0.36, 0.44),
    alpha: 0.02,
  });
  flash.plane.parent = root;
  flash.plane.position.set((extents.minX + extents.maxX) * 0.5, 12, farZ + 4.8);

  let time = 0;
  return {
    root,
    update(dt) {
      time += dt;
      skyMat.emissiveColor = new BABYLON.Color3(
        0.10 + (Math.sin(time * 0.7) * 0.01),
        0.10 + (Math.sin(time * 0.9) * 0.01),
        0.12 + (Math.sin(time * 0.5) * 0.02),
      );
      horizonMat.alpha = 0.36 + (Math.sin(time * 0.32) * 0.04);
      for (const ribbon of windRibbons) {
        ribbon.plane.position.x = ribbon.baseX + (Math.sin((time * 0.42) + ribbon.phase) * 4.2);
        ribbon.plane.position.y = ribbon.baseY + (Math.sin((time * 0.92) + ribbon.phase) * 0.42);
        ribbon.plane.rotation.z = -0.18 + (Math.sin((time * 0.76) + ribbon.phase) * 0.06);
        ribbon.mat.alpha = 0.10 + (Math.sin((time * 1.4) + ribbon.phase) * 0.04);
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
      flash.mat.alpha = 0.02 + Math.max(0, Math.sin((time * 0.52) + 0.8) - 0.88) * 0.42;
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

  const span = Math.max(120, (extents.maxX - extents.minX) + 24);
  const backdrop = BABYLON.MeshBuilder.CreatePlane('libraryBackdrop', { width: span, height: 46 }, scene);
  backdrop.parent = root;
  backdrop.position.set((extents.minX + extents.maxX) * 0.5, 10.8, farZ + 5);
  const backdropMat = applyGradientPlaneMaterial(scene, backdrop, 'libraryBackdrop', {
    top: 'rgba(30,18,12,0.98)',
    mid: 'rgba(72,42,22,0.96)',
    bottom: 'rgba(146,112,72,0.62)',
    alpha: 0.98,
    emissiveScale: 0.08,
  });

  const moonWindows = [];
  for (let i = 0; i < 4; i++) {
    const window = createRectPlane(scene, `libraryWindow_${i}`, {
      width: 8,
      height: 18,
      color: new BABYLON.Color3(0.18, 0.16, 0.12),
      emissive: new BABYLON.Color3(0.06, 0.04, 0.02),
      alpha: 0.22,
    });
    window.plane.parent = root;
    window.plane.position.set(extents.minX + 18 + (i * 38), floorY + 11.5, farZ + 2.4);
    moonWindows.push(window);

    const beam = createRectPlane(scene, `libraryMoonbeam_${i}`, {
      width: 6.4,
      height: 18,
      color: new BABYLON.Color3(0.92, 0.84, 0.60),
      emissive: new BABYLON.Color3(0.18, 0.12, 0.06),
      alpha: 0.08,
    });
    beam.plane.parent = root;
    beam.plane.position.set(window.plane.position.x, floorY + 6.6, farZ + 0.6);
    beam.plane.rotation.z = 0.06;
    moonWindows.push(beam);
  }

  const shelves = [];
  for (let i = 0; i < 10; i++) {
    const shelf = createRectPlane(scene, `libraryShelf_${i}`, {
      width: 7 + ((i % 2) * 3),
      height: 18 + ((i % 3) * 4),
      color: new BABYLON.Color3(0.14, 0.08, 0.04),
      emissive: new BABYLON.Color3(0.05, 0.03, 0.02),
      alpha: 0.28,
    });
    shelf.plane.parent = root;
    shelf.plane.position.set(extents.minX + 10 + (i * 18), floorY + 9.8 + ((i % 2) * 0.8), farZ + 2.2 + ((i % 3) * 0.35));
    shelves.push(shelf);
  }

  const arches = [];
  for (let i = 0; i < 5; i++) {
    const arch = createRectPlane(scene, `libraryArch_${i}`, {
      width: 16,
      height: 22,
      color: new BABYLON.Color3(0.32, 0.20, 0.10),
      emissive: new BABYLON.Color3(0.08, 0.04, 0.02),
      alpha: 0.10,
    });
    arch.plane.parent = root;
    arch.plane.position.set(extents.minX + 18 + (i * 30), floorY + 11.2, farZ + 1.2);
    arches.push(arch);
  }

  const lampPools = [];
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const pool = createRectPlane(scene, `libraryLampPool_${i}`, {
      width: 10,
      height: 4,
      color: new BABYLON.Color3(0.92, 0.82, 0.42),
      emissive: new BABYLON.Color3(0.22, 0.14, 0.04),
      alpha: 0.12,
    });
    pool.plane.parent = root;
    pool.plane.position.set(extents.minX + 20 + (i * 34), floorY + 1.4, farZ - 0.6);
    pool.plane.rotation.x = Math.PI * 0.5;
    lampPools.push(pool);

    const lamp = createParticleSphere(scene, `libraryLampFx_${i}`, {
      diameter: 0.34,
      color: new BABYLON.Color3(1.0, 0.90, 0.64),
      emissive: new BABYLON.Color3(0.20, 0.14, 0.06),
      alpha: 0.38,
    });
    lamp.mesh.parent = root;
    lamp.mesh.position.set(pool.plane.position.x, floorY + 10.6 + ((i % 2) * 1.2), farZ - 0.3);
    lamps.push({ mesh: lamp.mesh, mat: lamp.mat, baseY: lamp.mesh.position.y, phase: i * 0.9 });
  }

  const pages = [];
  for (let i = 0; i < 16; i++) {
    const page = createRectPlane(scene, `libraryPage_${i}`, {
      width: 0.7,
      height: 0.9,
      color: new BABYLON.Color3(0.98, 0.94, 0.82),
      emissive: new BABYLON.Color3(0.10, 0.08, 0.04),
      alpha: 0.20,
    });
    page.plane.parent = root;
    page.plane.position.set(
      extents.minX + 8 + ((i * 10.2) % (extents.maxX - extents.minX)),
      floorY + 4 + ((i * 0.8) % 12),
      farZ - 0.4 + ((i % 3) * 0.2),
    );
    page.plane.rotation.z = ((i % 2) ? 1 : -1) * 0.12;
    pages.push({
      plane: page.plane,
      baseX: page.plane.position.x,
      baseY: page.plane.position.y,
      phase: i * 0.6,
    });
  }

  const motes = [];
  for (let i = 0; i < 26; i++) {
    const mote = createParticleSphere(scene, `libraryMote_${i}`, {
      diameter: 0.12 + ((i % 3) * 0.03),
      color: new BABYLON.Color3(0.94, 0.88, 0.76),
      emissive: new BABYLON.Color3(0.14, 0.10, 0.05),
      alpha: 0.22,
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
        0.08 + (Math.sin(time * 0.22) * 0.01),
        0.08 + (Math.sin(time * 0.28) * 0.01),
        0.08,
      );
      for (const pool of lampPools) {
        pool.mat.alpha = 0.10 + (Math.sin(time * 0.7) * 0.03);
      }
      for (const lamp of lamps) {
        lamp.mesh.position.y = lamp.baseY + (Math.sin((time * 0.9) + lamp.phase) * 0.14);
        lamp.mat.alpha = 0.28 + (Math.sin((time * 1.2) + lamp.phase) * 0.08);
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

  const span = Math.max(120, (extents.maxX - extents.minX) + 26);
  const sky = BABYLON.MeshBuilder.CreatePlane('campBackdrop', { width: span, height: 52 }, scene);
  sky.parent = root;
  sky.position.set((extents.minX + extents.maxX) * 0.5, 12, farZ + 5);
  const skyMat = applyGradientPlaneMaterial(scene, sky, 'campBackdrop', {
    top: 'rgba(8,10,20,0.98)',
    mid: 'rgba(18,24,42,0.96)',
    bottom: 'rgba(62,44,26,0.56)',
    alpha: 0.98,
    emissiveScale: 0.10,
  });

  const mountains = [];
  for (let i = 0; i < 6; i++) {
    const ridge = createRectPlane(scene, `campMountain_${i}`, {
      width: 20 + ((i % 3) * 6),
      height: 12 + ((i % 2) * 4),
      color: new BABYLON.Color3(0.08, 0.10, 0.14),
      emissive: new BABYLON.Color3(0.03, 0.04, 0.06),
      alpha: 0.26,
    });
    ridge.plane.parent = root;
    ridge.plane.position.set(extents.minX + 12 + (i * 28), floorY + 5.8 + ((i % 2) * 1.0), farZ + 2.4);
    mountains.push(ridge);
  }

  const trees = [];
  for (let i = 0; i < 10; i++) {
    const tree = createRectPlane(scene, `campTree_${i}`, {
      width: 3.0 + ((i % 2) * 0.8),
      height: 12 + ((i % 3) * 2),
      color: new BABYLON.Color3(0.06, 0.08, 0.08),
      emissive: new BABYLON.Color3(0.02, 0.03, 0.03),
      alpha: 0.30,
    });
    tree.plane.parent = root;
    tree.plane.position.set(extents.minX + 8 + (i * 17), floorY + 6.0, farZ + 1.4 + ((i % 3) * 0.3));
    trees.push(tree);
  }

  const stars = [];
  for (let i = 0; i < 52; i++) {
    const star = createParticleSphere(scene, `campStar_${i}`, {
      diameter: 0.06 + ((i % 3) * 0.02),
      color: new BABYLON.Color3(1.0, 0.96, 0.78),
      emissive: new BABYLON.Color3(0.20, 0.16, 0.08),
      alpha: 0.42,
    });
    star.mesh.parent = root;
    star.mesh.position.set(
      extents.minX + ((i * 3.7) % (extents.maxX - extents.minX)),
      floorY + 10 + ((i * 0.6) % 16),
      farZ + 2.2,
    );
    stars.push({ mesh: star.mesh, mat: star.mat, phase: i * 0.9 });
  }

  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const cloud = createRectPlane(scene, `campCloud_${i}`, {
      width: 20 + ((i % 2) * 4),
      height: 5 + ((i % 3) * 1.5),
      color: new BABYLON.Color3(0.18, 0.20, 0.24),
      emissive: new BABYLON.Color3(0.05, 0.06, 0.08),
      alpha: 0.18,
    });
    cloud.plane.parent = root;
    cloud.plane.position.set(extents.minX + 16 + (i * 28), floorY + 14 + ((i % 2) * 1.6), farZ + 1.4);
    clouds.push({ plane: cloud.plane, baseX: cloud.plane.position.x, phase: i * 0.8 });
  }

  const paperWall = createRectPlane(scene, 'campPaperWall', {
    width: Math.max(60, (extents.maxX - extents.minX) * 0.58),
    height: 22,
    color: new BABYLON.Color3(0.86, 0.80, 0.66),
    emissive: new BABYLON.Color3(0.12, 0.10, 0.06),
    alpha: 0.16,
  });
  paperWall.plane.parent = root;
  paperWall.plane.position.set(extents.minX + ((extents.maxX - extents.minX) * 0.62), floorY + 8.8, farZ - 0.2);

  const tents = [];
  for (let i = 0; i < 3; i++) {
    const tent = createRectPlane(scene, `campTent_${i}`, {
      width: 9 + (i * 1.2),
      height: 6 + ((i % 2) * 1.6),
      color: new BABYLON.Color3(0.34, 0.22, 0.14),
      emissive: new BABYLON.Color3(0.08, 0.04, 0.02),
      alpha: 0.18,
    });
    tent.plane.parent = root;
    tent.plane.position.set(extents.maxX - 54 + (i * 10), floorY + 4.6 + ((i % 2) * 0.4), farZ + 0.8);
    tents.push(tent);
  }

  const lanterns = [];
  for (let i = 0; i < 12; i++) {
    const lantern = createParticleSphere(scene, `campLanternFx_${i}`, {
      diameter: 0.36,
      color: new BABYLON.Color3(1.0, 0.72, 0.42),
      emissive: new BABYLON.Color3(0.24, 0.14, 0.05),
      alpha: 0.42,
    });
    lantern.mesh.parent = root;
    lantern.mesh.position.set(extents.minX + 12 + (i * 12), floorY + 8.8 + ((i % 2) * 0.8), farZ + 0.4);
    lanterns.push({ mesh: lantern.mesh, mat: lantern.mat, baseY: lantern.mesh.position.y, phase: i * 0.65 });
  }

  const fireflies = [];
  for (let i = 0; i < 18; i++) {
    const fly = createParticleSphere(scene, `campFirefly_${i}`, {
      diameter: 0.10,
      color: new BABYLON.Color3(1.0, 0.92, 0.56),
      emissive: new BABYLON.Color3(0.22, 0.14, 0.04),
      alpha: 0.30,
    });
    fly.mesh.parent = root;
    fly.mesh.position.set(
      extents.minX + 10 + ((i * 9.2) % (extents.maxX - extents.minX - 10)),
      floorY + 3 + ((i * 0.9) % 8),
      farZ - 0.4 + ((i % 3) * 0.16),
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
        0.10 + (Math.sin(time * 0.18) * 0.01),
        0.10 + (Math.sin(time * 0.22) * 0.01),
        0.10,
      );
      for (const star of stars) {
        star.mat.alpha = 0.26 + (Math.sin((time * 1.6) + star.phase) * 0.20);
      }
      for (const cloud of clouds) {
        cloud.plane.position.x = cloud.baseX + (Math.sin((time * 0.18) + cloud.phase) * 2.4);
      }
      for (const lantern of lanterns) {
        lantern.mesh.position.y = lantern.baseY + (Math.sin((time * 1.1) + lantern.phase) * 0.18);
        lantern.mat.alpha = 0.32 + (Math.sin((time * 1.6) + lantern.phase) * 0.08);
      }
      for (const fly of fireflies) {
        fly.mesh.position.x = fly.baseX + (Math.sin((time * 0.62) + fly.phase) * 0.38);
        fly.mesh.position.y = fly.baseY + (Math.sin((time * 1.2) + fly.phase) * 0.26);
        fly.mat.alpha = 0.20 + (Math.sin((time * 1.8) + fly.phase) * 0.10);
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
