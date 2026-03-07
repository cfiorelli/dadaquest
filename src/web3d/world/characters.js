import * as BABYLON from '@babylonjs/core';
import {
  makeCardboard,
  makePlastic,
  LEVEL1_PALETTE as P,
} from '../materials.js';

function tagActorNode(node) {
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
  };
  if (node instanceof BABYLON.Mesh) {
    node.isPickable = false;
    node.checkCollisions = false;
    return;
  }
  for (const mesh of node.getChildMeshes?.(false) || []) {
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      cameraIgnore: true,
    };
  }
}

function makeFlatStandard(scene, name, hex) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(hex);
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

function makeDecalTexture(scene, name, drawFn) {
  const tex = new BABYLON.DynamicTexture(name, { width: 256, height: 256 }, scene, true);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 256, 256);
  drawFn(ctx, 256, 256);
  tex.update();
  tex.hasAlpha = true;
  const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = tex;
  mat.opacityTexture = tex;
  mat.useAlphaFromDiffuseTexture = true;
  mat.specularColor = BABYLON.Color3.Black();
  mat.backFaceCulling = false;
  return mat;
}

function dadOutfitSpec(outfit) {
  if (outfit === 'level2') {
    return {
      torso: '#3a4a63',
      jacket: '#2a3343',
      pants: '#334c71',
      shoes: '#2d251f',
      hair: '#2b241f',
      beard: '#2b241f',
      accent: '#d4c2aa',
      decal: null,
    };
  }
  if (outfit === 'level3') {
    return {
      torso: '#e7f0ea',
      jacket: '#f2efe8',
      pants: '#5c4b40',
      shoes: '#5d3b24',
      hair: '#38281e',
      beard: '#38281e',
      accent: '#d79e63',
      decal: 'chef',
    };
  }
  return {
    torso: '#f4d86c',
    jacket: '#f1f0eb',
    pants: '#34517a',
    shoes: '#332620',
    hair: '#2f241e',
    beard: '#2f241e',
    accent: '#ff8f4d',
    decal: 'burger',
  };
}

function addDadTorsoDecal(scene, parent, outfit, accentHex) {
  if (outfit === 'level3') {
    const strapMat = makeFlatStandard(scene, 'dadChefApronStrapMat', accentHex);
    const apronBodyMat = makeFlatStandard(scene, 'dadChefApronBodyMat', '#f6f0df');
    const apronBorderMat = makeFlatStandard(scene, 'dadChefApronBorderMat', '#d6c4aa');

    const apron = BABYLON.MeshBuilder.CreateBox('dadChefApron', {
      width: 0.54,
      height: 0.78,
      depth: 0.04,
    }, scene);
    apron.position.set(0, 1.44, -0.34);
    apron.parent = parent;
    apron.material = apronBodyMat;

    const hem = BABYLON.MeshBuilder.CreateBox('dadChefApronHem', {
      width: 0.58,
      height: 0.08,
      depth: 0.05,
    }, scene);
    hem.position.set(0, 1.09, -0.34);
    hem.parent = parent;
    hem.material = apronBorderMat;

    for (const side of [-1, 1]) {
      const strap = BABYLON.MeshBuilder.CreateBox(`dadChefApronStrap${side}`, {
        width: 0.08,
        height: 0.68,
        depth: 0.04,
      }, scene);
      strap.position.set(side * 0.16, 1.78, -0.18);
      strap.rotation.z = side * 0.18;
      strap.parent = parent;
      strap.material = strapMat;
    }

    const pocket = BABYLON.MeshBuilder.CreateBox('dadChefApronPocket', {
      width: 0.24,
      height: 0.16,
      depth: 0.03,
    }, scene);
    pocket.position.set(0, 1.28, -0.35);
    pocket.parent = parent;
    pocket.material = strapMat;
    return;
  }

  if (outfit === 'level2') {
    const panel = BABYLON.MeshBuilder.CreateBox('dadJacketPanel', {
      width: 0.16,
      height: 0.72,
      depth: 0.04,
    }, scene);
    panel.position.set(0, 1.52, -0.34);
    panel.parent = parent;
    panel.material = makeFlatStandard(scene, 'dadJacketPanelMat', accentHex);
    return;
  }

  const mat = makeDecalTexture(scene, 'dadBurgerDecal', (ctx, w, h) => {
    ctx.fillStyle = '#f1f0eb';
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.fillStyle = '#c77a2f';
    ctx.ellipse(w * 0.5, h * 0.34, 60, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#69361a';
    ctx.fillRect(w * 0.28, h * 0.38, w * 0.44, 20);
    ctx.fillStyle = '#f0c233';
    ctx.beginPath();
    ctx.moveTo(w * 0.33, h * 0.41);
    ctx.lineTo(w * 0.67, h * 0.41);
    ctx.lineTo(w * 0.58, h * 0.51);
    ctx.lineTo(w * 0.42, h * 0.51);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6b9c42';
    ctx.fillRect(w * 0.3, h * 0.34, w * 0.4, 12);
    ctx.fillStyle = '#f0bf72';
    ctx.ellipse(w * 0.5, h * 0.58, 58, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  const decal = BABYLON.MeshBuilder.CreatePlane('dadBurgerDecalPlane', {
    width: 0.64,
    height: 0.72,
  }, scene);
  decal.position.set(0, 1.5, -0.35);
  decal.parent = parent;
  decal.material = mat;
}

export function createDad(scene, {
  x,
  y,
  z = 0,
  outfit = 'level1',
  shadowGen = null,
  animate = true,
  goalVolume = { width: 3.0, height: 7.0, depth: 3.0, yOffset: -1.8 },
} = {}) {
  const outfitSpec = dadOutfitSpec(outfit);
  const root = new BABYLON.TransformNode(`dad_${outfit}`, scene);
  root.position.set(x, y, z);
  const visualRoot = new BABYLON.TransformNode(`dad_${outfit}_visual`, scene);
  visualRoot.parent = root;

  const skinMat = makePlastic(scene, `dad_${outfit}_skin`, ...P.characterBody, { roughness: 0.52 });
  const torsoMat = makeFlatStandard(scene, `dad_${outfit}_torso`, outfitSpec.torso);
  const jacketMat = makeFlatStandard(scene, `dad_${outfit}_jacket`, outfitSpec.jacket);
  const pantsMat = makeFlatStandard(scene, `dad_${outfit}_pants`, outfitSpec.pants);
  const shoeMat = makeFlatStandard(scene, `dad_${outfit}_shoes`, outfitSpec.shoes);
  const hairMat = makeFlatStandard(scene, `dad_${outfit}_hair`, outfitSpec.hair);
  const beardMat = makeFlatStandard(scene, `dad_${outfit}_beard`, outfitSpec.beard);
  const armMeshes = [];

  const torso = BABYLON.MeshBuilder.CreateCapsule(`dad_${outfit}_torso`, {
    height: 1.55,
    radius: 0.32,
    tessellation: 12,
  }, scene);
  torso.position.y = 1.5;
  torso.parent = visualRoot;
  torso.material = torsoMat;

  const jacket = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_jacket`, {
    width: 0.72,
    height: 1.1,
    depth: 0.42,
  }, scene);
  jacket.position.set(0, 1.48, -0.02);
  jacket.parent = visualRoot;
  jacket.material = jacketMat;

  const neck = BABYLON.MeshBuilder.CreateCylinder(`dad_${outfit}_neck`, {
    height: 0.16,
    diameter: 0.18,
  }, scene);
  neck.position.y = 2.33;
  neck.parent = visualRoot;
  neck.material = skinMat;

  const head = BABYLON.MeshBuilder.CreateSphere(`dad_${outfit}_head`, {
    diameter: 0.66,
    segments: 16,
  }, scene);
  head.position.y = 2.72;
  head.parent = visualRoot;
  head.material = skinMat;

  const hairTop = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_hairTop`, {
    width: 0.62,
    height: 0.22,
    depth: 0.56,
  }, scene);
  hairTop.position.set(0, 2.98, -0.02);
  hairTop.parent = visualRoot;
  hairTop.material = hairMat;

  const sideburnL = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_sideL`, {
    width: 0.08,
    height: 0.22,
    depth: 0.18,
  }, scene);
  sideburnL.position.set(-0.28, 2.7, -0.12);
  sideburnL.parent = visualRoot;
  sideburnL.material = hairMat;

  const sideburnR = sideburnL.clone(`dad_${outfit}_sideR`);
  sideburnR.position.x = 0.28;
  sideburnR.parent = visualRoot;

  const beard = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_beard`, {
    width: 0.34,
    height: 0.18,
    depth: 0.08,
  }, scene);
  beard.position.set(0, 2.55, -0.31);
  beard.parent = visualRoot;
  beard.material = beardMat;

  if (outfit === 'level3') {
    const hatBand = BABYLON.MeshBuilder.CreateCylinder(`dad_${outfit}_chefBand`, {
      height: 0.20,
      diameter: 0.56,
      tessellation: 18,
    }, scene);
    hatBand.position.set(0, 3.12, -0.02);
    hatBand.parent = visualRoot;
    hatBand.material = makeFlatStandard(scene, `dad_${outfit}_chefBandMat`, '#f5f4f0');

    const hatPuffMat = makeFlatStandard(scene, `dad_${outfit}_chefPuffMat`, '#fffaf0');
    for (const def of [
      { x: 0, y: 3.34, z: -0.02, d: 0.40 },
      { x: -0.18, y: 3.28, z: -0.08, d: 0.28 },
      { x: 0.18, y: 3.28, z: -0.08, d: 0.28 },
      { x: 0, y: 3.24, z: 0.14, d: 0.24 },
    ]) {
      const puff = BABYLON.MeshBuilder.CreateSphere(`dad_${outfit}_chefPuff_${def.x}_${def.y}`, {
        diameter: def.d,
        segments: 10,
      }, scene);
      puff.position.set(def.x, def.y, def.z);
      puff.parent = visualRoot;
      puff.material = hatPuffMat;
    }
  }

  for (const side of [-1, 1]) {
    const arm = BABYLON.MeshBuilder.CreateCylinder(`dad_${outfit}_arm${side}`, {
      height: 1.08,
      diameter: 0.16,
      tessellation: 10,
    }, scene);
    arm.position.set(side * 0.52, 1.63, 0);
    arm.rotation.z = side * 0.14;
    arm.parent = visualRoot;
    arm.material = jacketMat;
    armMeshes.push({ mesh: arm, side });

    const hand = BABYLON.MeshBuilder.CreateSphere(`dad_${outfit}_hand${side}`, {
      diameter: 0.18,
      segments: 10,
    }, scene);
    hand.position.set(side * 0.59, 1.08, 0);
    hand.parent = visualRoot;
    hand.material = skinMat;

    const leg = BABYLON.MeshBuilder.CreateCylinder(`dad_${outfit}_leg${side}`, {
      height: 1.24,
      diameter: 0.2,
      tessellation: 10,
    }, scene);
    leg.position.set(side * 0.18, 0.62, 0);
    leg.parent = visualRoot;
    leg.material = pantsMat;

    const shoe = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_shoe${side}`, {
      width: 0.26,
      height: 0.1,
      depth: 0.46,
    }, scene);
    shoe.position.set(side * 0.18, 0.03, -0.04);
    shoe.parent = visualRoot;
    shoe.material = shoeMat;
  }

  const faceTex = new BABYLON.DynamicTexture(`dad_${outfit}_faceTex`, { width: 128, height: 128 }, scene, true);
  const ctx = faceTex.getContext();
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#1d1a18';
  ctx.beginPath();
  ctx.arc(42, 48, 7, 0, Math.PI * 2);
  ctx.arc(86, 48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1d1a18';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 70, 20, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  faceTex.update();
  faceTex.hasAlpha = true;
  const face = BABYLON.MeshBuilder.CreatePlane(`dad_${outfit}_face`, {
    width: 0.34,
    height: 0.34,
  }, scene);
  face.position.set(0, 2.73, -0.34);
  face.parent = visualRoot;
  const faceMat = new BABYLON.StandardMaterial(`dad_${outfit}_faceMat`, scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  faceMat.emissiveColor = new BABYLON.Color3(0.14, 0.12, 0.10);
  face.material = faceMat;

  addDadTorsoDecal(scene, visualRoot, outfit, outfitSpec.accent);

  root.scaling.setAll(1.18);
  tagActorNode(root);

  const goal = BABYLON.MeshBuilder.CreateBox(`dad_${outfit}_goalTrigger`, {
    width: goalVolume.width,
    height: goalVolume.height,
    depth: goalVolume.depth,
  }, scene);
  goal.position.y = goalVolume.yOffset;
  goal.parent = root;
  goal.visibility = 0;
  goal.isPickable = false;
  goal.checkCollisions = false;
  goal.metadata = { ...(goal.metadata || {}), cameraIgnore: true };

  if (shadowGen) {
    for (const mesh of root.getChildMeshes(false)) {
      if (mesh.name.includes('goalTrigger')) continue;
      shadowGen.addShadowCaster(mesh);
    }
  }

  if (animate) {
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.001;
      const breathe = Math.sin(t * 1.18);
      visualRoot.rotation.z = breathe * 0.028;
      visualRoot.rotation.y = Math.sin(t * 0.75) * 0.035;
      visualRoot.position.y = breathe * 0.03;
      visualRoot.scaling.y = 1 + (breathe * 0.012);
      visualRoot.scaling.x = 1 - (breathe * 0.006);
      visualRoot.scaling.z = 1 - (breathe * 0.006);
      for (const { mesh, side } of armMeshes) {
        mesh.rotation.z = (side * 0.14) + (Math.sin(t * 1.35 + (side * 0.8)) * 0.04);
      }
    });
  }

  return { root, goal, height: 3.22 };
}

export function createMom(scene, {
  x,
  y,
  z = 0,
  pose = 'standing',
  shadowGen = null,
  animate = true,
} = {}) {
  const root = new BABYLON.TransformNode(`mom_${pose}`, scene);
  root.position.set(x, y, z);
  const visualRoot = new BABYLON.TransformNode(`mom_${pose}_visual`, scene);
  visualRoot.parent = root;

  const skinMat = makePlastic(scene, 'mom_skin', 0.94, 0.78, 0.66, { roughness: 0.56 });
  const hoodieMat = makeFlatStandard(scene, 'mom_hoodie', '#4d7aa0');
  const pantsMat = makeFlatStandard(scene, 'mom_pants', '#556173');
  const hairMat = makeFlatStandard(scene, 'mom_hair', '#5d3f2f');
  const shoeMat = makeFlatStandard(scene, 'mom_shoes', '#d8d3ca');
  const armMeshes = [];

  const torso = BABYLON.MeshBuilder.CreateCapsule('mom_torso', {
    height: 1.28,
    radius: 0.28,
    tessellation: 12,
  }, scene);
  torso.parent = visualRoot;
  torso.position.y = pose === 'sitting' ? 1.0 : 1.38;
  torso.material = hoodieMat;

  const hood = BABYLON.MeshBuilder.CreateTorus('mom_hood', {
    diameter: 0.74,
    thickness: 0.12,
    tessellation: 18,
  }, scene);
  hood.rotation.x = Math.PI / 2;
  hood.position.set(0, pose === 'sitting' ? 1.62 : 2.0, 0.08);
  hood.parent = visualRoot;
  hood.material = hoodieMat;

  const head = BABYLON.MeshBuilder.CreateSphere('mom_head', {
    diameter: 0.62,
    segments: 16,
  }, scene);
  head.position.y = pose === 'sitting' ? 1.74 : 2.2;
  head.parent = visualRoot;
  head.material = skinMat;

  const hairCap = BABYLON.MeshBuilder.CreateBox('mom_hairCap', {
    width: 0.64,
    height: 0.24,
    depth: 0.52,
  }, scene);
  hairCap.position.set(0, pose === 'sitting' ? 1.98 : 2.44, -0.02);
  hairCap.parent = visualRoot;
  hairCap.material = hairMat;

  for (const side of [-1, 1]) {
    const sideHair = BABYLON.MeshBuilder.CreateBox(`mom_sideHair${side}`, {
      width: 0.12,
      height: 0.42,
      depth: 0.18,
    }, scene);
    sideHair.position.set(side * 0.25, pose === 'sitting' ? 1.72 : 2.08, -0.08);
    sideHair.parent = visualRoot;
    sideHair.material = hairMat;

    const arm = BABYLON.MeshBuilder.CreateCylinder(`mom_arm${side}`, {
      height: 0.9,
      diameter: 0.14,
      tessellation: 10,
    }, scene);
    arm.parent = visualRoot;
    arm.material = hoodieMat;
    armMeshes.push({ mesh: arm, side });

    const hand = BABYLON.MeshBuilder.CreateSphere(`mom_hand${side}`, {
      diameter: 0.16,
      segments: 10,
    }, scene);
    hand.parent = visualRoot;
    hand.material = skinMat;

    if (pose === 'sitting') {
      arm.position.set(side * 0.46, 1.18, 0.12);
      arm.rotation.z = side * 0.22;
      arm.rotation.x = Math.PI * 0.3;
      hand.position.set(side * 0.52, 0.84, 0.42);
    } else {
      arm.position.set(side * 0.45, 1.46, 0);
      arm.rotation.z = side * 0.1;
      hand.position.set(side * 0.52, 0.98, 0);
    }

    const upperLeg = BABYLON.MeshBuilder.CreateCylinder(`mom_upperLeg${side}`, {
      height: 0.72,
      diameter: 0.18,
      tessellation: 10,
    }, scene);
    upperLeg.parent = visualRoot;
    upperLeg.material = pantsMat;

    const lowerLeg = BABYLON.MeshBuilder.CreateCylinder(`mom_lowerLeg${side}`, {
      height: 0.64,
      diameter: 0.16,
      tessellation: 10,
    }, scene);
    lowerLeg.parent = visualRoot;
    lowerLeg.material = pantsMat;

    const shoe = BABYLON.MeshBuilder.CreateBox(`mom_shoe${side}`, {
      width: 0.22,
      height: 0.1,
      depth: 0.34,
    }, scene);
    shoe.parent = visualRoot;
    shoe.material = shoeMat;

    if (pose === 'sitting') {
      upperLeg.position.set(side * 0.16, 0.68, 0.34);
      upperLeg.rotation.z = Math.PI / 2;
      upperLeg.rotation.y = side * 0.04;
      lowerLeg.position.set(side * 0.48, 0.34, 0.34);
      shoe.position.set(side * 0.48, 0.02, 0.30);
    } else {
      upperLeg.position.set(side * 0.16, 0.78, 0);
      lowerLeg.position.set(side * 0.16, 0.22, 0);
      shoe.position.set(side * 0.16, -0.12, -0.04);
    }
  }

  const faceTex = new BABYLON.DynamicTexture('mom_faceTex', { width: 128, height: 128 }, scene, true);
  const ctx = faceTex.getContext();
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#1f1a18';
  ctx.beginPath();
  ctx.arc(42, 48, 7, 0, Math.PI * 2);
  ctx.arc(86, 48, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1f1a18';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 72, 18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  faceTex.update();
  faceTex.hasAlpha = true;
  const face = BABYLON.MeshBuilder.CreatePlane('mom_face', { width: 0.32, height: 0.32 }, scene);
  face.parent = visualRoot;
  face.position.set(0, pose === 'sitting' ? 1.74 : 2.2, -0.33);
  const faceMat = new BABYLON.StandardMaterial('mom_faceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  face.material = faceMat;

  tagActorNode(root);
  if (shadowGen) {
    for (const mesh of root.getChildMeshes(false)) {
      shadowGen.addShadowCaster(mesh);
    }
  }
  if (animate) {
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.001;
      const breathe = Math.sin(t * 1.06);
      visualRoot.position.y = breathe * (pose === 'sitting' ? 0.02 : 0.03);
      visualRoot.rotation.z = breathe * (pose === 'sitting' ? 0.018 : 0.024);
      visualRoot.scaling.y = 1 + (breathe * 0.01);
      visualRoot.scaling.x = 1 - (breathe * 0.005);
      visualRoot.scaling.z = 1 - (breathe * 0.005);
      for (const { mesh, side } of armMeshes) {
        const baseRot = pose === 'sitting' ? side * 0.22 : side * 0.1;
        mesh.rotation.z = baseRot + (Math.sin(t * 1.24 + (side * 0.6)) * (pose === 'sitting' ? 0.02 : 0.035));
      }
    });
  }
  return { root };
}

export function createGrandma(scene, {
  x,
  y,
  z = 0,
  shadowGen = null,
  animate = true,
} = {}) {
  const root = new BABYLON.TransformNode('grandma', scene);
  root.position.set(x, y, z);
  const visualRoot = new BABYLON.TransformNode('grandma_visual', scene);
  visualRoot.parent = root;

  const skinMat = makePlastic(scene, 'grandma_skin', 0.95, 0.82, 0.74, { roughness: 0.6 });
  const cardiganMat = makeFlatStandard(scene, 'grandma_cardigan', '#b08aa5');
  const skirtMat = makeFlatStandard(scene, 'grandma_skirt', '#67727d');
  const shoeMat = makeFlatStandard(scene, 'grandma_shoes', '#5b4d46');
  const hairMat = makeFlatStandard(scene, 'grandma_hair', '#d6d8dc');
  const glassesMat = makeFlatStandard(scene, 'grandma_glasses', '#5e4f4a');
  const armMeshes = [];

  const torso = BABYLON.MeshBuilder.CreateCapsule('grandma_torso', {
    height: 1.22,
    radius: 0.28,
    tessellation: 12,
  }, scene);
  torso.parent = visualRoot;
  torso.position.y = 1.34;
  torso.material = cardiganMat;

  const cardiganFront = BABYLON.MeshBuilder.CreateBox('grandma_cardiganFront', {
    width: 0.56,
    height: 1.0,
    depth: 0.08,
  }, scene);
  cardiganFront.parent = visualRoot;
  cardiganFront.position.set(0, 1.34, -0.22);
  cardiganFront.material = makeFlatStandard(scene, 'grandma_cardiganFrontMat', '#d9bf95');

  const head = BABYLON.MeshBuilder.CreateSphere('grandma_head', {
    diameter: 0.6,
    segments: 16,
  }, scene);
  head.parent = visualRoot;
  head.position.y = 2.12;
  head.material = skinMat;

  const hairCap = BABYLON.MeshBuilder.CreateBox('grandma_hairCap', {
    width: 0.60,
    height: 0.22,
    depth: 0.54,
  }, scene);
  hairCap.parent = visualRoot;
  hairCap.position.set(0, 2.36, -0.02);
  hairCap.material = hairMat;

  const bun = BABYLON.MeshBuilder.CreateSphere('grandma_bun', {
    diameter: 0.26,
    segments: 10,
  }, scene);
  bun.parent = visualRoot;
  bun.position.set(0, 2.26, 0.24);
  bun.material = hairMat;

  for (const side of [-1, 1]) {
    const sideHair = BABYLON.MeshBuilder.CreateBox(`grandma_sideHair${side}`, {
      width: 0.10,
      height: 0.28,
      depth: 0.16,
    }, scene);
    sideHair.parent = visualRoot;
    sideHair.position.set(side * 0.22, 2.02, -0.06);
    sideHair.material = hairMat;

    const arm = BABYLON.MeshBuilder.CreateCylinder(`grandma_arm${side}`, {
      height: 0.92,
      diameter: 0.14,
      tessellation: 10,
    }, scene);
    arm.parent = visualRoot;
    arm.position.set(side * 0.44, 1.42, 0);
    arm.rotation.z = side * 0.12;
    arm.material = cardiganMat;
    armMeshes.push({ mesh: arm, side });

    const hand = BABYLON.MeshBuilder.CreateSphere(`grandma_hand${side}`, {
      diameter: 0.15,
      segments: 10,
    }, scene);
    hand.parent = visualRoot;
    hand.position.set(side * 0.50, 0.96, 0);
    hand.material = skinMat;

    const leg = BABYLON.MeshBuilder.CreateCylinder(`grandma_leg${side}`, {
      height: 1.08,
      diameter: 0.16,
      tessellation: 10,
    }, scene);
    leg.parent = visualRoot;
    leg.position.set(side * 0.16, 0.58, 0);
    leg.material = skirtMat;

    const shoe = BABYLON.MeshBuilder.CreateBox(`grandma_shoe${side}`, {
      width: 0.22,
      height: 0.10,
      depth: 0.34,
    }, scene);
    shoe.parent = visualRoot;
    shoe.position.set(side * 0.16, -0.02, -0.05);
    shoe.material = shoeMat;
  }

  const skirt = BABYLON.MeshBuilder.CreateBox('grandma_skirt', {
    width: 0.62,
    height: 0.72,
    depth: 0.42,
  }, scene);
  skirt.parent = visualRoot;
  skirt.position.set(0, 0.78, 0);
  skirt.material = skirtMat;

  const glassesBridge = BABYLON.MeshBuilder.CreateBox('grandma_glassesBridge', {
    width: 0.18,
    height: 0.03,
    depth: 0.02,
  }, scene);
  glassesBridge.parent = visualRoot;
  glassesBridge.position.set(0, 2.14, -0.30);
  glassesBridge.material = glassesMat;

  for (const side of [-1, 1]) {
    const lens = BABYLON.MeshBuilder.CreateTorus(`grandma_glassesLens${side}`, {
      diameter: 0.14,
      thickness: 0.02,
      tessellation: 18,
    }, scene);
    lens.parent = visualRoot;
    lens.position.set(side * 0.12, 2.14, -0.31);
    lens.rotation.x = Math.PI / 2;
    lens.material = glassesMat;
  }

  const faceTex = new BABYLON.DynamicTexture('grandma_faceTex', { width: 128, height: 128 }, scene, true);
  const ctx = faceTex.getContext();
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#201a18';
  ctx.beginPath();
  ctx.arc(42, 50, 6, 0, Math.PI * 2);
  ctx.arc(86, 50, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#201a18';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 74, 17, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();
  faceTex.update();
  faceTex.hasAlpha = true;
  const face = BABYLON.MeshBuilder.CreatePlane('grandma_face', {
    width: 0.30,
    height: 0.30,
  }, scene);
  face.parent = visualRoot;
  face.position.set(0, 2.12, -0.32);
  const faceMat = new BABYLON.StandardMaterial('grandma_faceMat', scene);
  faceMat.diffuseTexture = faceTex;
  faceMat.opacityTexture = faceTex;
  faceMat.useAlphaFromDiffuseTexture = true;
  faceMat.specularColor = BABYLON.Color3.Black();
  face.material = faceMat;

  tagActorNode(root);
  if (shadowGen) {
    for (const mesh of root.getChildMeshes(false)) {
      shadowGen.addShadowCaster(mesh);
    }
  }
  if (animate) {
    scene.registerBeforeRender(() => {
      const t = performance.now() * 0.001;
      const breathe = Math.sin(t * 0.92);
      visualRoot.position.y = breathe * 0.024;
      visualRoot.rotation.z = breathe * 0.018;
      for (const { mesh, side } of armMeshes) {
        mesh.rotation.z = (side * 0.12) + (Math.sin(t * 1.1 + (side * 0.4)) * 0.02);
      }
    });
  }
  return { root };
}

export function createSimpleChair(scene, {
  x,
  y,
  z = 0,
  shadowGen = null,
  seatColor = '#d4b28a',
  legColor = '#7a5a3d',
} = {}) {
  const root = new BABYLON.TransformNode('simpleChair', scene);
  root.position.set(x, y, z);
  const seatMat = makeFlatStandard(scene, 'chairSeatMat', seatColor);
  const legMat = makeFlatStandard(scene, 'chairLegMat', legColor);

  const seat = BABYLON.MeshBuilder.CreateBox('chairSeat', {
    width: 1.05,
    height: 0.12,
    depth: 1.0,
  }, scene);
  seat.parent = root;
  seat.position.y = 0.78;
  seat.material = seatMat;

  const back = BABYLON.MeshBuilder.CreateBox('chairBack', {
    width: 1.05,
    height: 1.0,
    depth: 0.12,
  }, scene);
  back.parent = root;
  back.position.set(0, 1.26, -0.42);
  back.material = seatMat;

  for (const lx of [-0.38, 0.38]) {
    for (const lz of [-0.34, 0.34]) {
      const leg = BABYLON.MeshBuilder.CreateBox(`chairLeg_${lx}_${lz}`, {
        width: 0.1,
        height: 0.78,
        depth: 0.1,
      }, scene);
      leg.parent = root;
      leg.position.set(lx, 0.33, lz);
      leg.material = legMat;
    }
  }

  tagActorNode(root);
  if (shadowGen) {
    for (const mesh of root.getChildMeshes(false)) {
      shadowGen.addShadowCaster(mesh);
    }
  }
  return root;
}
