import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeFelt,
  makePaper,
  makePlastic,
} from '../materials.js';

function createFaceTexture(scene) {
  const tex = new BABYLON.DynamicTexture('babyFaceTex', 128, scene, true);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 128, 128);

  // Cheeks
  ctx.fillStyle = 'rgba(238, 137, 124, 0.42)';
  ctx.beginPath();
  ctx.arc(36, 74, 12, 0, Math.PI * 2);
  ctx.arc(92, 74, 12, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1f1c20';
  ctx.beginPath();
  ctx.arc(42, 50, 12, 0, Math.PI * 2);
  ctx.arc(86, 50, 12, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(45, 46, 4, 0, Math.PI * 2);
  ctx.arc(89, 46, 4, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#4d2d26';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(64, 78, 16, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  tex.hasAlpha = true;
  tex.update();
  return tex;
}

function createSkinMaterial(scene) {
  const mat = makePlastic(scene, 'babySkinMat', ...P.characterBody, { roughness: 0.44 });
  mat.environmentIntensity = 0.22;
  mat.emissiveColor = new BABYLON.Color3(0.03, 0.02, 0.02);
  return mat;
}

export function createBabyVisual(scene) {
  const root = new BABYLON.TransformNode('babyVisualRig', scene);

  const bodyPivot = new BABYLON.TransformNode('babyBodyPivot', scene);
  bodyPivot.parent = root;
  bodyPivot.position.y = -0.07;

  const headPivot = new BABYLON.TransformNode('babyHeadPivot', scene);
  headPivot.parent = root;
  headPivot.position.y = 0.19;

  const armLPivot = new BABYLON.TransformNode('babyArmLPivot', scene);
  armLPivot.parent = root;
  armLPivot.position.set(-0.22, -0.02, -0.02);
  const armRPivot = new BABYLON.TransformNode('babyArmRPivot', scene);
  armRPivot.parent = root;
  armRPivot.position.set(0.22, -0.02, -0.02);

  const legLPivot = new BABYLON.TransformNode('babyLegLPivot', scene);
  legLPivot.parent = root;
  legLPivot.position.set(-0.09, -0.27, 0);
  const legRPivot = new BABYLON.TransformNode('babyLegRPivot', scene);
  legRPivot.parent = root;
  legRPivot.position.set(0.09, -0.27, 0);

  const skinMat = createSkinMaterial(scene);
  const bodyMat = makeFelt(scene, 'babyOnesieMat', ...P.characterAccent, { roughness: 0.9 });
  const diaperMat = makePaper(scene, 'babyDiaperMat', 245, 246, 250, {
    grainScale: 2.2,
    roughness: 0.95,
    noiseAmt: 8,
  });
  const trimMat = makePlastic(scene, 'babyDiaperTrimMat', 0.33, 0.56, 0.94, { roughness: 0.42 });

  const body = BABYLON.MeshBuilder.CreateCylinder('babyBody', {
    height: 0.39,
    diameterTop: 0.40,
    diameterBottom: 0.46,
    tessellation: 18,
  }, scene);
  body.parent = bodyPivot;
  body.material = bodyMat;

  const tummy = BABYLON.MeshBuilder.CreateSphere('babyTummy', { diameter: 0.38, segments: 18 }, scene);
  tummy.parent = bodyPivot;
  tummy.position.set(0, -0.05, -0.03);
  tummy.scaling.z = 0.86;
  tummy.material = bodyMat;

  const neck = BABYLON.MeshBuilder.CreateCylinder('babyNeck', {
    height: 0.06,
    diameterTop: 0.16,
    diameterBottom: 0.18,
    tessellation: 14,
  }, scene);
  neck.parent = root;
  neck.position.y = 0.01;
  neck.material = skinMat;

  const head = BABYLON.MeshBuilder.CreateSphere('babyHead', { diameter: 0.60, segments: 24 }, scene);
  head.parent = headPivot;
  head.material = skinMat;

  const hairCap = BABYLON.MeshBuilder.CreateSphere('babyHairCap', { diameter: 0.52, segments: 16 }, scene);
  hairCap.parent = headPivot;
  hairCap.position.y = 0.10;
  hairCap.scaling.y = 0.45;
  hairCap.material = makePaper(scene, 'babyHairMat', 110, 89, 77, {
    grainScale: 2.8,
    roughness: 0.92,
    noiseAmt: 9,
  });

  const curl = BABYLON.MeshBuilder.CreateTube('babyCurl', {
    path: [
      new BABYLON.Vector3(-0.02, 0.24, -0.18),
      new BABYLON.Vector3(0.02, 0.32, -0.20),
      new BABYLON.Vector3(0.07, 0.28, -0.17),
      new BABYLON.Vector3(0.03, 0.21, -0.14),
    ],
    radius: 0.012,
    tessellation: 10,
  }, scene);
  curl.parent = headPivot;
  curl.material = hairCap.material;

  const earL = BABYLON.MeshBuilder.CreateSphere('babyEarL', { diameter: 0.13, segments: 12 }, scene);
  earL.parent = headPivot;
  earL.position.set(-0.28, -0.02, 0.02);
  earL.material = skinMat;
  const earR = BABYLON.MeshBuilder.CreateSphere('babyEarR', { diameter: 0.13, segments: 12 }, scene);
  earR.parent = headPivot;
  earR.position.set(0.28, -0.02, 0.02);
  earR.material = skinMat;

  const diaper = BABYLON.MeshBuilder.CreateBox('babyDiaper', {
    width: 0.49,
    height: 0.20,
    depth: 0.34,
  }, scene);
  diaper.parent = root;
  diaper.position.y = -0.20;
  diaper.material = diaperMat;

  const diaperRoundL = BABYLON.MeshBuilder.CreateSphere('babyDiaperRoundL', { diameter: 0.2, segments: 12 }, scene);
  diaperRoundL.parent = root;
  diaperRoundL.position.set(-0.18, -0.24, 0.09);
  diaperRoundL.material = diaperMat;
  const diaperRoundR = BABYLON.MeshBuilder.CreateSphere('babyDiaperRoundR', { diameter: 0.2, segments: 12 }, scene);
  diaperRoundR.parent = root;
  diaperRoundR.position.set(0.18, -0.24, 0.09);
  diaperRoundR.material = diaperMat;

  const trim = BABYLON.MeshBuilder.CreateTorus('babyDiaperTrim', {
    diameter: 0.43,
    thickness: 0.03,
    tessellation: 20,
  }, scene);
  trim.parent = root;
  trim.position.y = -0.11;
  trim.rotation.x = Math.PI / 2;
  trim.scaling.z = 0.76;
  trim.material = trimMat;

  const armL = BABYLON.MeshBuilder.CreateCylinder('babyArmL', {
    height: 0.24,
    diameterTop: 0.10,
    diameterBottom: 0.09,
    tessellation: 14,
  }, scene);
  armL.parent = armLPivot;
  armL.rotation.z = Math.PI * 0.5;
  armL.position.x = -0.07;
  armL.material = skinMat;
  const armR = BABYLON.MeshBuilder.CreateCylinder('babyArmR', {
    height: 0.24,
    diameterTop: 0.10,
    diameterBottom: 0.09,
    tessellation: 14,
  }, scene);
  armR.parent = armRPivot;
  armR.rotation.z = Math.PI * 0.5;
  armR.position.x = 0.07;
  armR.material = skinMat;

  const handL = BABYLON.MeshBuilder.CreateSphere('babyHandL', { diameter: 0.10, segments: 10 }, scene);
  handL.parent = armLPivot;
  handL.position.x = -0.19;
  handL.material = skinMat;
  const handR = BABYLON.MeshBuilder.CreateSphere('babyHandR', { diameter: 0.10, segments: 10 }, scene);
  handR.parent = armRPivot;
  handR.position.x = 0.19;
  handR.material = skinMat;

  const legL = BABYLON.MeshBuilder.CreateCylinder('babyLegL', {
    height: 0.18,
    diameterTop: 0.12,
    diameterBottom: 0.11,
    tessellation: 14,
  }, scene);
  legL.parent = legLPivot;
  legL.position.y = -0.04;
  legL.material = skinMat;
  const legR = BABYLON.MeshBuilder.CreateCylinder('babyLegR', {
    height: 0.18,
    diameterTop: 0.12,
    diameterBottom: 0.11,
    tessellation: 14,
  }, scene);
  legR.parent = legRPivot;
  legR.position.y = -0.04;
  legR.material = skinMat;

  const footL = BABYLON.MeshBuilder.CreateSphere('babyFootL', { diameter: 0.14, segments: 10 }, scene);
  footL.parent = legLPivot;
  footL.position.set(0, -0.16, -0.05);
  footL.scaling.z = 1.3;
  footL.material = skinMat;
  const footR = BABYLON.MeshBuilder.CreateSphere('babyFootR', { diameter: 0.14, segments: 10 }, scene);
  footR.parent = legRPivot;
  footR.position.set(0, -0.16, -0.05);
  footR.scaling.z = 1.3;
  footR.material = skinMat;

  const facePlane = BABYLON.MeshBuilder.CreatePlane('babyFace', { width: 0.29, height: 0.29 }, scene);
  facePlane.parent = headPivot;
  facePlane.position.set(0, -0.01, -0.301);
  const faceTex = createFaceTexture(scene);
  const faceMat = new BABYLON.StandardMaterial('babyFaceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  faceMat.emissiveColor = new BABYLON.Color3(0.12, 0.09, 0.08);
  facePlane.material = faceMat;

  const cape = BABYLON.MeshBuilder.CreatePlane('babyCape', {
    width: 0.42,
    height: 0.54,
  }, scene);
  cape.parent = bodyPivot;
  cape.position.set(0, 0.02, 0.18);
  cape.rotation.x = -0.18;
  const capeMat = makeFelt(scene, 'babyCapeMat', 185, 62, 80, { roughness: 0.84 });
  capeMat.backFaceCulling = false;
  cape.material = capeMat;
  cape.setEnabled(false);

  const shadowMeshes = [
    body, tummy, neck, head, hairCap, earL, earR,
    diaper, diaperRoundL, diaperRoundR, trim,
    armL, armR, handL, handR, legL, legR, footL, footR, curl, cape,
  ];

  return {
    root,
    shadowMeshes,
    rig: {
      root,
      bodyPivot,
      headPivot,
      armLPivot,
      armRPivot,
      legLPivot,
      legRPivot,
      cape,
    },
  };
}
