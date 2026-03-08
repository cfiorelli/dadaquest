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
      if (causticMat.diffuseTexture) {
        causticMat.diffuseTexture.uOffset = 0;
        causticMat.diffuseTexture.vOffset = 0;
      }
    },
  };
}
