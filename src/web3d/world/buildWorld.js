import * as BABYLON from '@babylonjs/core';

/**
 * Creates a paper/cardboard grain texture procedurally.
 */
function makePaperTexture(scene, name, baseR, baseG, baseB) {
  const size = 256;
  const tex = new BABYLON.DynamicTexture(name, size, scene, false);
  const ctx = tex.getContext();
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, size, size);

  // Paper grain noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 18;
    d[i] = Math.max(0, Math.min(255, d[i] + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);
  tex.update();
  tex.uScale = 4;
  tex.vScale = 4;
  return tex;
}

/**
 * Creates a cardboard-style StandardMaterial.
 */
function makeCardboardMat(scene, name, r, g, b) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseTexture = makePaperTexture(scene, name + '_tex', r, g, b);
  mat.specularColor = new BABYLON.Color3(0.08, 0.07, 0.06);
  mat.specularPower = 16;
  return mat;
}

/**
 * Creates a flat-colored matte material.
 */
function makeFlatMat(scene, name, r, g, b) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = new BABYLON.Color3(r, g, b);
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  return mat;
}

export function buildWorld(scene) {
  // Warm paper-white background
  scene.clearColor = new BABYLON.Color4(0.94, 0.91, 0.85, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.3, 0.28, 0.26);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.94, 0.91, 0.85);

  // === LIGHTING ===
  // Soft hemisphere fill
  const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0.2, 1, -0.3), scene);
  hemi.intensity = 0.55;
  hemi.groundColor = new BABYLON.Color3(0.65, 0.62, 0.58);

  // Key directional light + shadows
  const dirLight = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.6, -1, 0.4), scene);
  dirLight.intensity = 0.75;
  dirLight.position = new BABYLON.Vector3(10, 20, -10);

  const shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGen.useBlurExponentialShadowMap = true;
  shadowGen.blurKernel = 24;
  shadowGen.blurScale = 2;
  shadowGen.setDarkness(0.35);

  // Warm rim/back light for depth separation
  const rimLight = new BABYLON.PointLight('rim', new BABYLON.Vector3(5, 8, -14), scene);
  rimLight.intensity = 0.25;
  rimLight.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);
  rimLight.range = 50;

  // === DIORAMA BASE ===
  // Thick cardboard ground slab
  const ground = BABYLON.MeshBuilder.CreateBox('ground', { width: 50, height: 1.5, depth: 14 }, scene);
  ground.position.set(5, -0.75, 0);
  ground.material = makeCardboardMat(scene, 'groundMat', 200, 185, 155);
  ground.receiveShadows = true;
  shadowGen.addShadowCaster(ground);

  // Beveled top edge strip (lighter)
  const groundEdge = BABYLON.MeshBuilder.CreateBox('groundEdge', { width: 50, height: 0.15, depth: 14.2 }, scene);
  groundEdge.position.set(5, 0.07, 0);
  groundEdge.material = makeFlatMat(scene, 'edgeMat', 0.85, 0.80, 0.70);

  // === BACKDROP (far vertical card) ===
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop', { width: 60, height: 18, depth: 0.5 }, scene);
  backdrop.position.set(5, 8, 8);
  backdrop.material = makeCardboardMat(scene, 'backdropMat', 230, 225, 215);

  // Sky-ish gradient on backdrop via a second thin plane
  const skyPlane = BABYLON.MeshBuilder.CreatePlane('skyPlane', { width: 60, height: 18 }, scene);
  skyPlane.position.set(5, 8, 7.7);
  const skyMat = new BABYLON.StandardMaterial('skyMat', scene);
  skyMat.diffuseColor = new BABYLON.Color3(0.7, 0.82, 0.92);
  skyMat.alpha = 0.3;
  skyMat.specularColor = BABYLON.Color3.Black();
  skyPlane.material = skyMat;

  // === PARALLAX LAYERS ===
  // Far background hills (behind play lane)
  const bgHills = BABYLON.MeshBuilder.CreateBox('bgHills', { width: 55, height: 6, depth: 0.3 }, scene);
  bgHills.position.set(5, 3, 6);
  bgHills.material = makeCardboardMat(scene, 'bgHillsMat', 210, 205, 190);

  // Mid background trees/shapes
  const bgMid = BABYLON.MeshBuilder.CreateBox('bgMid', { width: 50, height: 4, depth: 0.25 }, scene);
  bgMid.position.set(3, 2.5, 4);
  bgMid.material = makeCardboardMat(scene, 'bgMidMat', 165, 190, 155);

  // Foreground cutout (closer to camera)
  const fgCutout1 = BABYLON.MeshBuilder.CreateBox('fgCutout1', { width: 12, height: 3, depth: 0.2 }, scene);
  fgCutout1.position.set(-15, 1.5, -6);
  fgCutout1.material = makeCardboardMat(scene, 'fgMat1', 180, 170, 140);
  shadowGen.addShadowCaster(fgCutout1);

  const fgCutout2 = BABYLON.MeshBuilder.CreateBox('fgCutout2', { width: 10, height: 2.5, depth: 0.2 }, scene);
  fgCutout2.position.set(25, 1.2, -7);
  fgCutout2.material = makeCardboardMat(scene, 'fgMat2', 175, 165, 135);
  shadowGen.addShadowCaster(fgCutout2);

  // === PLATFORMS (gameplay) ===
  const allPlatforms = [ground]; // ground is a collider too

  function addPlatform(name, w, h, d, x, y) {
    const box = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    box.position.set(x, y, 0);
    box.material = makeCardboardMat(scene, name + 'Mat',
      Math.round(175 + Math.random() * 20),
      Math.round(160 + Math.random() * 20),
      Math.round(125 + Math.random() * 20));
    box.receiveShadows = true;
    shadowGen.addShadowCaster(box);
    allPlatforms.push(box);
    return box;
  }

  // Start area — wide platform
  addPlatform('platStart', 8, 0.8, 5, -12, 0.4);

  // Stepping stones
  addPlatform('plat2', 5, 0.7, 4, -5, 1.5);
  addPlatform('plat3', 4, 0.6, 4, 0, 3.0);
  addPlatform('plat4', 5, 0.7, 4, 6, 2.0);
  addPlatform('plat5', 4, 0.8, 4, 11, 4.0);

  // Final area with goal
  addPlatform('platFinal', 8, 0.8, 5, 18, 2.5);

  // === GOAL OBJECT (Da Da) ===
  // Simple toy-dad: body + head
  const dadBody = BABYLON.MeshBuilder.CreateCylinder('dadBody', {
    height: 1.2, diameterTop: 0.5, diameterBottom: 0.7, tessellation: 12,
  }, scene);
  dadBody.position.set(20, 3.8, 0);
  dadBody.material = makeFlatMat(scene, 'dadBodyMat', 0.45, 0.75, 0.72);
  shadowGen.addShadowCaster(dadBody);

  const dadHead = BABYLON.MeshBuilder.CreateSphere('dadHead', { diameter: 0.7, segments: 12 }, scene);
  dadHead.position.set(20, 4.7, 0);
  dadHead.material = makeFlatMat(scene, 'dadHeadMat', 1.0, 0.85, 0.72);
  shadowGen.addShadowCaster(dadHead);

  // Goal collision trigger sphere (invisible)
  const goal = BABYLON.MeshBuilder.CreateSphere('goalTrigger', { diameter: 2.5, segments: 8 }, scene);
  goal.position.set(20, 3.8, 0);
  goal.visibility = 0;

  // Gentle bob animation on Da Da
  scene.registerBeforeRender(() => {
    const t = performance.now() / 1000;
    const bob = Math.sin(t * 2) * 0.15;
    dadBody.position.y = 3.8 + bob;
    dadHead.position.y = 4.7 + bob;
    goal.position.y = 3.8 + bob;
  });

  // === DECORATIONS ===
  // Small "felt" trees on the backdrop
  for (let i = 0; i < 5; i++) {
    const tx = -10 + i * 8;
    const trunk = BABYLON.MeshBuilder.CreateBox('trunk' + i, { width: 0.3, height: 1.5, depth: 0.25 }, scene);
    trunk.position.set(tx, 2.5, 4.5);
    trunk.material = makeFlatMat(scene, 'trunkMat' + i, 0.55, 0.4, 0.28);

    const foliage = BABYLON.MeshBuilder.CreateSphere('foliage' + i, { diameter: 1.8, segments: 8 }, scene);
    foliage.position.set(tx, 3.8, 4.5);
    foliage.material = makeFlatMat(scene, 'foliageMat' + i,
      0.35 + Math.random() * 0.15,
      0.55 + Math.random() * 0.15,
      0.3 + Math.random() * 0.1);
    foliage.scaling.y = 0.8;
    shadowGen.addShadowCaster(foliage);
  }

  // Small cloud cutouts in background
  for (let i = 0; i < 4; i++) {
    const cx = -12 + i * 10;
    const cloud = BABYLON.MeshBuilder.CreateSphere('cloud' + i, { diameter: 2 + Math.random(), segments: 8 }, scene);
    cloud.position.set(cx, 10 + Math.random() * 2, 6.5);
    cloud.scaling.set(1.5, 0.6, 0.3);
    cloud.material = makeFlatMat(scene, 'cloudMat' + i, 1, 1, 1);
    cloud.material.alpha = 0.7;
  }

  return {
    ground,
    platforms: allPlatforms,
    goal,
    shadowGen,
  };
}
