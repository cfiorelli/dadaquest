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
