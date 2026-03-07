// buildWorld2.js — Level 2 "Condo Garden" world builder
import * as BABYLON from '@babylonjs/core';
import {
  LEVEL1_PALETTE as P,
  makeCardboard,
  makePlastic,
} from '../materials.js';
import { LEVEL2, LANE_Z2 } from './level2.js';
import {
  createCardboardPlatform,
  createCoin,
  createCheckpointMarker,
  createOnesiePickup,
  createCrumblePlatform,
  createWelcomeSign,
  setRenderingGroup,
} from './buildWorld.js';
import { createDad, createMom } from './characters.js';

const LANE_Z = LANE_Z2;

// Condo palette — cooler, indoor, pastel
const P2 = {
  ground:       [166, 156, 144],
  platformCard: [218, 198, 170],
  edgeDark:     [122, 104, 82],
};

const LEVEL2_DECOR_Z = 1.35;

function collectLevel2Nodes(node) {
  if (!node) return [];
  const nodes = [node];
  if (typeof node.getChildTransformNodes === 'function') {
    nodes.push(...node.getChildTransformNodes(false));
  }
  if (typeof node.getChildMeshes === 'function') {
    nodes.push(...node.getChildMeshes(false));
  }
  return nodes;
}

function prefixLevel2Gameplay(node) {
  for (const entry of collectLevel2Nodes(node)) {
    if (entry.name && !entry.name.startsWith('L2_')) {
      entry.name = `L2_${entry.name}`;
    }
    if (entry.id && !entry.id.startsWith('L2_')) {
      entry.id = `L2_${entry.id}`;
    }
    entry.metadata = {
      ...(entry.metadata || {}),
      level2Gameplay: true,
    };
  }
}

function tagLevel2Decor(node) {
  for (const entry of collectLevel2Nodes(node)) {
    if (entry.name && !entry.name.startsWith('L2_') && !entry.name.startsWith('L2_DECOR_')) {
      entry.name = `L2_DECOR_${entry.name}`;
    }
    if (entry.id && !entry.id.startsWith('L2_') && !entry.id.startsWith('L2_DECOR_')) {
      entry.id = `L2_DECOR_${entry.id}`;
    }
    entry.metadata = {
      ...(entry.metadata || {}),
      decor: true,
      level2Decor: true,
    };
    if (entry instanceof BABYLON.Mesh) {
      entry.isPickable = false;
      entry.checkCollisions = false;
      entry.metadata = {
        ...(entry.metadata || {}),
        decor: true,
        cameraIgnore: true,
        cameraBlocker: false,
        level2Decor: true,
      };
    }
  }
}

function markLevel2Cull(node) {
  for (const entry of collectLevel2Nodes(node)) {
    entry.metadata = {
      ...(entry.metadata || {}),
      level2Cull: true,
    };
  }
}

function createRoomPanel(scene, name, {
  x,
  y,
  z = 14.8,
  width,
  height,
  color = [228, 220, 208],
  trim = [170, 150, 128],
  windowCount = 0,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const wall = BABYLON.MeshBuilder.CreateBox(`${name}_wall`, {
    width,
    height,
    depth: 0.22,
  }, scene);
  wall.parent = root;
  wall.material = makeCardboard(scene, `${name}_wallMat`, ...color, { roughness: 0.96 });
  wall.receiveShadows = true;
  wall.visibility = 0.06;

  const crown = BABYLON.MeshBuilder.CreateBox(`${name}_crown`, {
    width: width + 0.18,
    height: 0.24,
    depth: 0.28,
  }, scene);
  crown.parent = root;
  crown.position.y = (height * 0.5) - 0.12;
  crown.material = makeCardboard(scene, `${name}_crownMat`, ...trim, { roughness: 0.9 });
  crown.visibility = 0.14;

  const baseTrim = BABYLON.MeshBuilder.CreateBox(`${name}_baseTrim`, {
    width: width + 0.12,
    height: 0.18,
    depth: 0.26,
  }, scene);
  baseTrim.parent = root;
  baseTrim.position.y = -(height * 0.5) + 0.09;
  baseTrim.material = crown.material;
  baseTrim.visibility = 0.14;

  for (let i = 0; i < windowCount; i++) {
    const offset = ((i - ((windowCount - 1) * 0.5)) * Math.max(1.8, width / (windowCount + 1)));
    const frame = BABYLON.MeshBuilder.CreateBox(`${name}_window_${i}`, {
      width: 1.25,
      height: 1.6,
      depth: 0.08,
    }, scene);
    frame.parent = root;
    frame.position.set(offset, 0.4, -0.11);
    frame.material = makeCardboard(scene, `${name}_windowMat_${i}`, 182, 198, 212, { roughness: 0.75 });
    frame.visibility = 0.18;

    const muntinV = BABYLON.MeshBuilder.CreateBox(`${name}_muntinV_${i}`, {
      width: 0.08,
      height: 1.5,
      depth: 0.10,
    }, scene);
    muntinV.parent = frame;
    muntinV.material = makeCardboard(scene, `${name}_muntinVMat_${i}`, ...trim, { roughness: 0.88 });

    const muntinH = BABYLON.MeshBuilder.CreateBox(`${name}_muntinH_${i}`, {
      width: 1.1,
      height: 0.08,
      depth: 0.10,
    }, scene);
    muntinH.parent = frame;
    muntinH.material = muntinV.material;
  }

  tagLevel2Decor(root);
  markLevel2Cull(root);
  return root;
}

function createCondoWallSegment(scene, name, {
  x,
  y,
  z = 9.8,
  width,
  height,
  color = [232, 224, 214],
  trim = [170, 148, 122],
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const wall = BABYLON.MeshBuilder.CreateBox(`${name}_wall`, {
    width,
    height,
    depth: 0.18,
  }, scene);
  wall.parent = root;
  wall.material = makeCardboard(scene, `${name}_wallMat`, ...color, { roughness: 0.96 });
  wall.material.backFaceCulling = false;
  wall.material.alpha = 0.24;
  wall.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const base = BABYLON.MeshBuilder.CreateBox(`${name}_base`, {
    width: width + 0.08,
    height: 0.16,
    depth: 0.22,
  }, scene);
  base.parent = root;
  base.position.y = -(height * 0.5) + 0.08;
  base.material = makeCardboard(scene, `${name}_baseMat`, ...trim, { roughness: 0.92 });
  base.material.backFaceCulling = false;
  base.material.alpha = 0.22;
  base.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const trimLine = BABYLON.MeshBuilder.CreateBox(`${name}_trim`, {
    width: width + 0.12,
    height: 0.12,
    depth: 0.2,
  }, scene);
  trimLine.parent = root;
  trimLine.position.y = (height * 0.5) - 0.12;
  trimLine.material = base.material;

  tagLevel2Decor(root);
  return root;
}

function createWindowDisplay(scene, name, {
  x,
  y,
  z = 9.62,
  width = 2.2,
  height = 1.8,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const tex = new BABYLON.DynamicTexture(`${name}_tex`, { width: 320, height: 240 }, scene, true);
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 240);
  grad.addColorStop(0, '#7fb0e8');
  grad.addColorStop(0.58, '#bfd6f2');
  grad.addColorStop(1, '#f4d8b2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = 'rgba(255,255,255,0.46)';
  ctx.fillRect(24, 24, 272, 18);
  ctx.fillStyle = 'rgba(104,120,148,0.32)';
  ctx.fillRect(18, 168, 284, 36);
  ctx.fillRect(52, 146, 18, 58);
  ctx.fillRect(88, 126, 20, 78);
  ctx.fillRect(136, 138, 18, 66);
  tex.update();

  const paneMat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  paneMat.diffuseTexture = tex;
  paneMat.emissiveTexture = tex;
  paneMat.specularColor = BABYLON.Color3.Black();

  const pane = BABYLON.MeshBuilder.CreatePlane(`${name}_pane`, {
    width,
    height,
  }, scene);
  pane.parent = root;
  pane.material = paneMat;

  const frameMat = makeCardboard(scene, `${name}_frameMat`, 188, 170, 150, { roughness: 0.9 });
  const frameParts = [
    { name: 'top', w: width + 0.18, h: 0.12, x: 0, y: height * 0.5 },
    { name: 'bottom', w: width + 0.18, h: 0.12, x: 0, y: -height * 0.5 },
    { name: 'left', w: 0.12, h: height + 0.18, x: -(width * 0.5), y: 0 },
    { name: 'right', w: 0.12, h: height + 0.18, x: width * 0.5, y: 0 },
    { name: 'midV', w: 0.08, h: height - 0.18, x: 0, y: 0 },
    { name: 'midH', w: width - 0.18, h: 0.08, x: 0, y: 0 },
  ];
  for (const part of frameParts) {
    const mesh = BABYLON.MeshBuilder.CreateBox(`${name}_${part.name}`, {
      width: part.w,
      height: part.h,
      depth: 0.08,
    }, scene);
    mesh.parent = root;
    mesh.position.set(part.x, part.y, -0.05);
    mesh.material = frameMat;
  }

  tagLevel2Decor(root);
  return root;
}

function createWallArt(scene, name, {
  x,
  y,
  z = 9.56,
  width = 1.5,
  height = 1.1,
  palette = ['#c86848', '#f3d07d', '#7390c8'],
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  const tex = new BABYLON.DynamicTexture(`${name}_tex`, { width: 256, height: 196 }, scene, true);
  const ctx = tex.getContext();
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, 256, 196);
  ctx.fillStyle = palette[0];
  ctx.fillRect(22, 26, 84, 58);
  ctx.fillStyle = palette[1];
  ctx.beginPath();
  ctx.arc(182, 70, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette[2];
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(34, 148);
  ctx.lineTo(210, 118);
  ctx.stroke();
  tex.update();

  const art = BABYLON.MeshBuilder.CreatePlane(`${name}_art`, { width, height }, scene);
  art.parent = root;
  const artMat = new BABYLON.StandardMaterial(`${name}_artMat`, scene);
  artMat.diffuseTexture = tex;
  artMat.emissiveTexture = tex;
  artMat.specularColor = BABYLON.Color3.Black();
  art.material = artMat;

  const frame = BABYLON.MeshBuilder.CreateBox(`${name}_frame`, {
    width: width + 0.14,
    height: height + 0.14,
    depth: 0.08,
  }, scene);
  frame.parent = root;
  frame.position.z = -0.04;
  frame.material = makeCardboard(scene, `${name}_frameMat`, 126, 102, 80, { roughness: 0.92 });

  tagLevel2Decor(root);
  return root;
}

function createStairsDirectionSign(scene, name, {
  x,
  y,
  z = -1.12,
  text = 'UPSTAIRS CONDO →',
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  const boardTex = new BABYLON.DynamicTexture(`${name}_tex`, { width: 512, height: 196 }, scene, true);
  const ctx = boardTex.getContext();
  ctx.fillStyle = '#ead4a6';
  ctx.fillRect(0, 0, 512, 196);
  ctx.strokeStyle = '#6d4b2f';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 180);
  ctx.fillStyle = '#50341f';
  ctx.font = 'bold 58px Avenir Next, Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 98);
  boardTex.update();

  const board = BABYLON.MeshBuilder.CreatePlane(`${name}_board`, {
    width: 3.6,
    height: 1.38,
  }, scene);
  board.parent = root;
  const boardMat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
  boardMat.diffuseTexture = boardTex;
  boardMat.emissiveTexture = boardTex;
  boardMat.specularColor = BABYLON.Color3.Black();
  board.material = boardMat;

  for (const px of [-1.42, 1.42]) {
    const post = BABYLON.MeshBuilder.CreateBox(`${name}_post${px}`, {
      width: 0.12,
      height: 1.6,
      depth: 0.12,
    }, scene);
    post.parent = root;
    post.position.set(px, -0.68, -0.03);
    post.material = makeCardboard(scene, `${name}_postMat${px}`, 118, 92, 68, { roughness: 0.9 });
  }

  tagLevel2Decor(root);
  return root;
}

function createWateringDecor(scene, name, { x, y, z = 2.2 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const hose = BABYLON.MeshBuilder.CreateCylinder(`${name}_hose`, {
    height: 1.7,
    diameter: 0.08,
    tessellation: 10,
  }, scene);
  hose.parent = root;
  hose.position.set(-0.42, 0.48, -0.18);
  hose.rotation.z = -0.9;
  hose.material = makePlastic(scene, `${name}_hoseMat`, 0.24, 0.56, 0.22, { roughness: 0.58 });

  const nozzle = BABYLON.MeshBuilder.CreateCylinder(`${name}_nozzle`, {
    height: 0.28,
    diameter: 0.18,
    tessellation: 12,
  }, scene);
  nozzle.parent = root;
  nozzle.position.set(0.14, 1.22, -0.04);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.material = makePlastic(scene, `${name}_nozzleMat`, 0.64, 0.70, 0.76, { roughness: 0.4 });

  const streamMat = new BABYLON.StandardMaterial(`${name}_streamMat`, scene);
  streamMat.diffuseColor = new BABYLON.Color3(0.56, 0.82, 0.98);
  streamMat.emissiveColor = new BABYLON.Color3(0.14, 0.30, 0.42);
  streamMat.specularColor = BABYLON.Color3.Black();
  streamMat.alpha = 0.32;
  streamMat.backFaceCulling = false;
  streamMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  for (const [index, offset] of [-0.22, 0, 0.22].entries()) {
    const stream = BABYLON.MeshBuilder.CreatePlane(`${name}_stream${index}`, {
      width: 0.34,
      height: 1.9,
    }, scene);
    stream.parent = root;
    stream.position.set(0.72 + (offset * 0.18), 0.34, offset);
    stream.rotation.z = -0.94 + (offset * 0.08);
    stream.material = streamMat;
  }

  tagLevel2Decor(root);
  return root;
}

function createCornPatchPlaceholder(scene, name, {
  x,
  y,
  z = 2.55,
  rows = 2,
  cols = 3,
  spacingX = 0.76,
  spacingZ = 0.72,
}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  const anchors = [];
  const halfCols = (cols - 1) * 0.5;
  const halfRows = (rows - 1) * 0.5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const anchor = new BABYLON.TransformNode(`${name}_anchor_${row}_${col}`, scene);
      anchor.parent = root;
      anchor.position.set(
        (col - halfCols) * spacingX,
        0,
        (row - halfRows) * spacingZ,
      );
      const stalk = BABYLON.MeshBuilder.CreateCylinder(`${name}_stalk_${row}_${col}`, {
        height: 1.12,
        diameter: 0.09,
        tessellation: 8,
      }, scene);
      stalk.parent = anchor;
      stalk.position.y = 0.56;
      stalk.material = makePlastic(scene, `${name}_stalkMat_${row}_${col}`, 0.34, 0.64, 0.24, { roughness: 0.7 });
      for (const side of [-1, 1]) {
        const leaf = BABYLON.MeshBuilder.CreatePlane(`${name}_leaf_${row}_${col}_${side}`, {
          width: 0.54,
          height: 0.20,
        }, scene);
        leaf.parent = anchor;
        leaf.position.set(side * 0.14, 0.54, 0.04 * side);
        leaf.rotation.z = side * 0.42;
        leaf.material = stalk.material;
      }
      const husk = BABYLON.MeshBuilder.CreateBox(`${name}_husk_${row}_${col}`, {
        width: 0.14,
        height: 0.34,
        depth: 0.12,
      }, scene);
      husk.parent = anchor;
      husk.position.set(0, 0.78, 0);
      husk.material = makePlastic(scene, `${name}_huskMat_${row}_${col}`, 0.93, 0.78, 0.26, { roughness: 0.52 });
      tagLevel2Decor(anchor);
      anchors.push(anchor);
    }
  }
  tagLevel2Decor(root);
  return { root, anchors };
}

function createHighchairPlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const seatMat = makePlastic(scene, `${name}_seatMat`, 0.95, 0.89, 0.72, { roughness: 0.52 });
  const frameMat = makeCardboard(scene, `${name}_frameMat`, 170, 138, 98, { roughness: 0.88 });

  const seat = BABYLON.MeshBuilder.CreateBox(`${name}_seat`, {
    width: 0.9,
    height: 0.14,
    depth: 0.76,
  }, scene);
  seat.parent = root;
  seat.position.y = 0.82;
  seat.material = seatMat;

  const back = BABYLON.MeshBuilder.CreateBox(`${name}_back`, {
    width: 0.9,
    height: 0.92,
    depth: 0.12,
  }, scene);
  back.parent = root;
  back.position.set(0, 1.24, -0.28);
  back.material = seatMat;

  const tray = BABYLON.MeshBuilder.CreateBox(`${name}_tray`, {
    width: 1.04,
    height: 0.10,
    depth: 0.46,
  }, scene);
  tray.parent = root;
  tray.position.set(0, 0.96, 0.28);
  tray.material = makePlastic(scene, `${name}_trayMat`, 0.86, 0.78, 0.64, { roughness: 0.42 });

  for (const lx of [-0.3, 0.3]) {
    for (const lz of [-0.22, 0.22]) {
      const leg = BABYLON.MeshBuilder.CreateBox(`${name}_leg_${lx}_${lz}`, {
        width: 0.08,
        height: 0.92,
        depth: 0.08,
      }, scene);
      leg.parent = root;
      leg.position.set(lx, 0.35, lz);
      leg.material = frameMat;
    }
  }

  tagLevel2Decor(root);
  return root;
}

function createBikePlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  const frameMat = makePlastic(scene, `${name}_frameMat`, 0.82, 0.33, 0.22, { roughness: 0.42 });
  const tireMat = makeCardboard(scene, `${name}_tireMat`, 58, 52, 48, { roughness: 0.92 });

  for (const side of [-0.42, 0.42]) {
    const wheel = BABYLON.MeshBuilder.CreateTorus(`${name}_wheel${side}`, {
      diameter: 0.6,
      thickness: 0.08,
      tessellation: 18,
    }, scene);
    wheel.parent = root;
    wheel.position.set(side, 0.3, 0);
    wheel.rotation.y = Math.PI / 2;
    wheel.material = tireMat;
  }

  const frame = BABYLON.MeshBuilder.CreateCylinder(`${name}_frame`, {
    height: 1.0,
    diameter: 0.08,
    tessellation: 10,
  }, scene);
  frame.parent = root;
  frame.position.set(0, 0.5, 0);
  frame.rotation.z = Math.PI / 2.8;
  frame.material = frameMat;

  const bar = BABYLON.MeshBuilder.CreateCylinder(`${name}_bar`, {
    height: 0.8,
    diameter: 0.08,
    tessellation: 10,
  }, scene);
  bar.parent = root;
  bar.position.set(0.15, 0.72, 0);
  bar.rotation.z = -Math.PI / 3;
  bar.material = frameMat;

  const seat = BABYLON.MeshBuilder.CreateBox(`${name}_seat`, {
    width: 0.28,
    height: 0.08,
    depth: 0.18,
  }, scene);
  seat.parent = root;
  seat.position.set(-0.05, 0.82, 0);
  seat.material = makeCardboard(scene, `${name}_seatMat`, 76, 58, 48, { roughness: 0.9 });

  tagLevel2Decor(root);
  return root;
}

function createPackPlaceholder(scene, name, { x, y, z = 0 }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  const body = BABYLON.MeshBuilder.CreateBox(`${name}_body`, {
    width: 0.74,
    height: 0.92,
    depth: 0.46,
  }, scene);
  body.parent = root;
  body.position.y = 0.46;
  body.material = makePlastic(scene, `${name}_bodyMat`, 0.47, 0.65, 0.42, { roughness: 0.68 });

  for (const side of [-0.2, 0.2]) {
    const strap = BABYLON.MeshBuilder.CreateCylinder(`${name}_strap${side}`, {
      height: 0.92,
      diameter: 0.06,
      tessellation: 8,
    }, scene);
    strap.parent = root;
    strap.position.set(side, 0.52, -0.16);
    strap.material = makeCardboard(scene, `${name}_strapMat${side}`, 124, 92, 70, { roughness: 0.92 });
  }

  const flap = BABYLON.MeshBuilder.CreateBox(`${name}_flap`, {
    width: 0.72,
    height: 0.18,
    depth: 0.18,
  }, scene);
  flap.parent = root;
  flap.position.set(0, 0.86, -0.13);
  flap.material = makePlastic(scene, `${name}_flapMat`, 0.36, 0.54, 0.32, { roughness: 0.72 });

  tagLevel2Decor(root);
  return root;
}

// ── Slip / hazard zone ────────────────────────────────────────────

function createHazardZone(scene, name, { x, y, z = 0, width, depth }) {
  const mat = new BABYLON.PBRMaterial(name + '_mat', scene);
  mat.albedoColor = new BABYLON.Color3(0.88, 0.28, 0.20);
  mat.roughness = 0.85;
  mat.metallic = 0.0;
  mat.alpha = 0.55;
  mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;

  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width,
    height: 0.04,
    depth,
  }, scene);
  mesh.position.set(x, y, z);
  mesh.material = mat;
  return mesh;
}

// ── Amanda patrol character ────────────────────────────────────────

function createAmandaMesh(scene, name, { x, y, z = 0, w, h, d, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.metadata = {
    ...(root.metadata || {}),
    cameraIgnore: true,
  };

  const mom = createMom(scene, {
    x: 0,
    y: 0,
    z: 0.02,
    pose: 'standing',
    shadowGen,
  });
  mom.root.parent = root;
  mom.root.position.set(0, -(h * 0.5) + 0.04, 0.02);
  mom.root.rotation.y = -0.16;

  const pianoAnchor = new BABYLON.TransformNode(`${name}_pianoAnchor`, scene);
  pianoAnchor.parent = root;
  pianoAnchor.position.set(-1.46, -0.12, LEVEL2_DECOR_Z - z);
  pianoAnchor.metadata = {
    ...(pianoAnchor.metadata || {}),
    decor: true,
    level2Decor: true,
    cameraIgnore: true,
  };

  const pianoFallback = createPianoVisual(scene, `${name}_piano`, {
    x: 0,
    y: 0,
    z: 0,
    shadowGen,
  });
  pianoFallback.parent = pianoAnchor;
  pianoFallback.position.set(0, 0, 0);
  pianoFallback.rotation.y = 0.12;

  for (const mesh of [root, ...root.getChildMeshes(false)]) {
    if (mesh instanceof BABYLON.Mesh) {
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.metadata = {
        ...(mesh.metadata || {}),
        cameraIgnore: true,
      };
    }
  }

  return { root, pianoAnchor, pianoFallback };
}

// ── Rocking horse visual ──────────────────────────────────────────

function createRockingHorseVisual(scene, name, { x, y, z = 0, shadowGen }) {
  // Simple stylized horse shape — cardboard aesthetic
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: 1.6, height: 0.8, depth: 0.6,
  }, scene);
  body.position.y = 0.6;
  body.parent = root;
  body.material = makeCardboard(scene, name + '_bodyMat', 195, 165, 120, { roughness: 0.78 });
  body.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(body);

  const neck = BABYLON.MeshBuilder.CreateBox(name + '_neck', {
    width: 0.32, height: 0.65, depth: 0.45,
  }, scene);
  neck.position.set(0.7, 1.1, 0);
  neck.rotation.z = -0.3;
  neck.parent = root;
  neck.material = makeCardboard(scene, name + '_neckMat', 185, 155, 110, { roughness: 0.82 });
  neck.receiveShadows = true;

  const head = BABYLON.MeshBuilder.CreateBox(name + '_head', {
    width: 0.48, height: 0.42, depth: 0.38,
  }, scene);
  head.position.set(0.92, 1.5, 0);
  head.parent = root;
  head.material = makeCardboard(scene, name + '_headMat', 200, 170, 125, { roughness: 0.75 });
  head.receiveShadows = true;

  // Rockers
  for (const side of [-0.25, 0.25]) {
    const rocker = BABYLON.MeshBuilder.CreateCylinder(name + '_rocker' + side, {
      height: 1.4, diameter: 0.12, tessellation: 10,
    }, scene);
    rocker.rotation.z = Math.PI / 2;
    rocker.position.set(0, 0.12, side);
    rocker.parent = root;
    rocker.material = makeCardboard(scene, name + `_rockerMat${side}`, 150, 120, 90, { roughness: 0.9 });
  }

  return root;
}

// ── Baby crib / bed visual ────────────────────────────────────────

function createBedVisual(scene, name, { x, y, z = 0, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const mattress = BABYLON.MeshBuilder.CreateBox(name + '_mat', {
    width: 2.8, height: 0.3, depth: 1.8,
  }, scene);
  mattress.position.y = 0.5;
  mattress.parent = root;
  mattress.material = makeCardboard(scene, name + '_matMat', 220, 200, 175, { roughness: 0.72 });
  mattress.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(mattress);

  // Four corner posts
  const postDef = [[-1.25, 0.7], [1.25, 0.7], [-1.25, -0.7], [1.25, -0.7]];
  for (let i = 0; i < postDef.length; i++) {
    const [px, pz] = postDef[i];
    const post = BABYLON.MeshBuilder.CreateBox(name + `_post${i}`, {
      width: 0.14, height: 1.6, depth: 0.14,
    }, scene);
    post.position.set(px, 0.9, pz);
    post.parent = root;
    post.material = makeCardboard(scene, name + `_postMat${i}`, 200, 175, 140, { roughness: 0.85 });
    if (shadowGen) shadowGen.addShadowCaster(post);
  }

  // Side rails
  const railMat = makeCardboard(scene, name + '_railMat', 210, 185, 150, { roughness: 0.82 });
  for (const pz of [-0.78, 0.78]) {
    const rail = BABYLON.MeshBuilder.CreateBox(name + `_rail${pz}`, {
      width: 2.4, height: 0.12, depth: 0.10,
    }, scene);
    rail.position.set(0, 1.6, pz);
    rail.parent = root;
    rail.material = railMat;
  }

  return root;
}

// ── Piano visual ──────────────────────────────────────────────────

function createPianoVisual(scene, name, { x, y, z = 0, shadowGen }) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);

  const body = BABYLON.MeshBuilder.CreateBox(name + '_body', {
    width: 2.8, height: 1.4, depth: 1.2,
  }, scene);
  body.position.y = 0;
  body.parent = root;
  body.material = makeCardboard(scene, name + '_bodyMat', 60, 50, 42, { roughness: 0.65 });
  body.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(body);

  // White key strip
  const keys = BABYLON.MeshBuilder.CreateBox(name + '_keys', {
    width: 2.2, height: 0.1, depth: 0.55,
  }, scene);
  keys.position.set(0, 0.72, 0.35);
  keys.parent = root;
  const keyMat = new BABYLON.PBRMaterial(name + '_keyMat', scene);
  keyMat.albedoColor = new BABYLON.Color3(0.96, 0.94, 0.90);
  keyMat.roughness = 0.40;
  keyMat.metallic = 0.0;
  keys.material = keyMat;

  // Lid
  const lid = BABYLON.MeshBuilder.CreateBox(name + '_lid', {
    width: 2.8, height: 0.08, depth: 1.2,
  }, scene);
  lid.position.y = 0.74;
  lid.parent = root;
  lid.material = makeCardboard(scene, name + '_lidMat', 48, 40, 34, { roughness: 0.55 });
  if (shadowGen) shadowGen.addShadowCaster(lid);

  return root;
}

// ── Main Level 2 world builder ────────────────────────────────────

export function buildWorld2(scene, options = {}) {
  const { animateGoal = true } = options;
  // Scene
  scene.clearColor = new BABYLON.Color4(0.84, 0.86, 0.90, 1.0);
  scene.ambientColor = new BABYLON.Color3(0.34, 0.33, 0.37);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0045;
  scene.fogColor = new BABYLON.Color3(0.84, 0.86, 0.90);

  // Lighting
  const keyLight = new BABYLON.DirectionalLight('keyLight2', new BABYLON.Vector3(-0.5, -0.9, 0.25), scene);
  keyLight.position = new BABYLON.Vector3(20, 28, -12);
  keyLight.intensity = 1.05;
  keyLight.diffuse = new BABYLON.Color3(1.0, 0.94, 0.86);
  keyLight.specular = new BABYLON.Color3(0.50, 0.44, 0.36);

  const fillLight = new BABYLON.HemisphericLight('fillLight2', new BABYLON.Vector3(0.1, 1, -0.15), scene);
  fillLight.intensity = 0.42;
  fillLight.diffuse = new BABYLON.Color3(0.68, 0.78, 0.96);
  fillLight.groundColor = new BABYLON.Color3(0.36, 0.34, 0.38);

  const rimLight = new BABYLON.PointLight('rimLight2', new BABYLON.Vector3(-8, 9, -14), scene);
  rimLight.intensity = 0.38;
  rimLight.diffuse = new BABYLON.Color3(0.82, 0.94, 1.0);
  rimLight.range = 44;

  // Goal hero light
  const goalX = LEVEL2.goal.x;
  const goalLight = new BABYLON.PointLight('goalLight2', new BABYLON.Vector3(goalX, 12, -6), scene);
  goalLight.intensity = 0.50;
  goalLight.diffuse = new BABYLON.Color3(1.0, 0.85, 0.52);
  goalLight.range = 22;

  const shadowGen = new BABYLON.ShadowGenerator(1024, keyLight);
  shadowGen.usePoissonSampling = true;
  shadowGen.bias = 0.0006;
  shadowGen.normalBias = 0.02;
  shadowGen.setDarkness(0.36);

  // === GROUND ===
  const groundDef = LEVEL2.ground;
  const groundVisual = createCardboardPlatform(scene, 'L2_ground', {
    x: groundDef.x, y: groundDef.y, z: groundDef.z,
    w: groundDef.w, h: groundDef.h, d: groundDef.d,
    slabColor: P2.ground,
    edgeColor: P2.edgeDark,
    shadowGen,
  });
  prefixLevel2Gameplay(groundVisual);

  const groundCollider = BABYLON.MeshBuilder.CreateBox('L2_groundCol', {
    width: groundDef.w, height: groundDef.h, depth: groundDef.d,
  }, scene);
  groundCollider.position.set(groundDef.x, groundDef.y, groundDef.z);
  groundCollider.visibility = 0;
  groundCollider.isPickable = false;
  prefixLevel2Gameplay(groundCollider);

  // === PLATFORMS ===
  const allPlatforms = [groundCollider];
  const platformColliders = {};  // name → collider mesh

  for (const def of LEVEL2.platforms) {
    const platformVisual = createCardboardPlatform(scene, `L2_${def.name}`, {
      x: def.x, y: def.y, z: LANE_Z,
      w: def.w, h: def.h, d: def.d,
      slabColor: P2.platformCard,
      edgeColor: P2.edgeDark,
      shadowGen,
    });
    prefixLevel2Gameplay(platformVisual);

    const col = BABYLON.MeshBuilder.CreateBox(`L2_${def.name}_col`, {
      width: def.w, height: def.h, depth: def.d,
    }, scene);
    col.position.set(def.x, def.y, LANE_Z);
    col.visibility = 0;
    col.isPickable = false;
    prefixLevel2Gameplay(col);
    allPlatforms.push(col);
    platformColliders[def.name] = col;
  }

  // === GOAL (DaDa) ===
  const goalDef = LEVEL2.goal;
  const dada = createDad(scene, {
    x: goalDef.x,
    y: goalDef.y,
    z: LANE_Z,
    outfit: 'level2',
    shadowGen,
    animate: animateGoal,
    goalVolume: { width: 2.8, height: 4.8, depth: 2.8, yOffset: 1.55 },
  });
  prefixLevel2Gameplay(dada.root);
  prefixLevel2Gameplay(dada.goal);
  setRenderingGroup(dada.root, 3);

  // === CHECKPOINTS ===
  const checkpoints = [];
  for (let i = 0; i < LEVEL2.checkpoints.length; i++) {
    const cp = LEVEL2.checkpoints[i];
    const marker = createCheckpointMarker(scene, `L2_cp2_${i}`, {
      x: cp.x, y: cp.y, z: 0.7, shadowGen,
    });
    prefixLevel2Gameplay(marker);
    setRenderingGroup(marker, 3);
    checkpoints.push({
      index: i + 1,
      label: cp.label || `Checkpoint ${i + 1}`,
      spawn: { x: cp.x, y: cp.y, z: cp.z },
      radius: 1.25,
      marker,
    });
  }

  // === PICKUPS ===
  const pickups = [];
  for (let i = 0; i < LEVEL2.pickups.length; i++) {
    const pick = LEVEL2.pickups[i];
    const node = createOnesiePickup(scene, `L2_pickup2_${i}`, {
      x: pick.x, y: pick.y, z: LANE_Z, shadowGen,
    });
    node.position.z = LANE_Z;
    prefixLevel2Gameplay(node);
    setRenderingGroup(node, 3);
    pickups.push({
      type: pick.type,
      radius: pick.radius,
      durationMs: pick.durationMs,
      jumpBoost: pick.jumpBoost,
      position: new BABYLON.Vector3(pick.x, pick.y, LANE_Z),
      node,
      collected: false,
    });
  }

  // === COINS ===
  const coins = [];
  for (let i = 0; i < LEVEL2.coins.length; i++) {
    const c = LEVEL2.coins[i];
    const node = createCoin(scene, `L2_coin2_${i}`, { x: c.x, y: c.y, z: LANE_Z });
    node.position.z = LANE_Z;
    prefixLevel2Gameplay(node);
    setRenderingGroup(node, 3);
    coins.push({
      position: new BABYLON.Vector3(c.x, c.y, LANE_Z),
      radius: 0.45,
      node,
      collected: false,
    });
  }

  // === HAZARDS ===
  const hazards = [];
  for (let i = 0; i < LEVEL2.hazards.length; i++) {
    const hz = LEVEL2.hazards[i];
    if (hz.type === 'slip') {
      const hazardMesh = createHazardZone(scene, `L2_hazard2_${i}`, {
        x: hz.x, y: hz.y, z: hz.z,
        width: hz.width, depth: hz.depth,
      });
      prefixLevel2Gameplay(hazardMesh);
      hazards.push({
        type: hz.type,
        minX: hz.x - hz.width / 2,
        maxX: hz.x + hz.width / 2,
        minY: hz.y - 0.35,
        maxY: hz.y + 0.35,
        accelMultiplier: hz.accelMultiplier,
        decelMultiplier: hz.decelMultiplier,
      });
    }
  }

  // === CRUMBLES ===
  const crumbles = [];
  for (let i = 0; i < (LEVEL2.crumbles || []).length; i++) {
    const cr = LEVEL2.crumbles[i];
    const { root: crRoot, colliderMesh: crCol } = createCrumblePlatform(scene, `L2_${cr.name}`, {
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h, d: cr.d,
      shadowGen,
    });
    crRoot.position.z = LANE_Z;
    prefixLevel2Gameplay(crRoot);
    prefixLevel2Gameplay(crCol);
    allPlatforms.push(crCol);
    setRenderingGroup(crRoot, 2);
    crumbles.push({
      root: crRoot,
      colliderMesh: crCol,
      x: cr.x, y: cr.y, z: LANE_Z,
      w: cr.w, h: cr.h,
    });
  }

  // === DECORATIVE BACKDROP / ROOM ZONES ===
  const backdrop = BABYLON.MeshBuilder.CreateBox('backdrop2', {
    width: 70, height: 22, depth: 0.5,
  }, scene);
  backdrop.position.set(9, 9, 13.8);
  const backdropMat = makeCardboard(scene, 'backdrop2Mat', 225, 220, 210, { roughness: 0.96 });
  backdrop.material = backdropMat;
  backdrop.receiveShadows = true;
  backdrop.visibility = 0.05;
  tagLevel2Decor(backdrop);
  markLevel2Cull(backdrop);

  const roomPanels = [
    createRoomPanel(scene, 'l2_bedroomPanel', {
      x: -11.0, y: 4.8, z: 15.2, width: 16, height: 10.5, color: [220, 214, 226], trim: [165, 152, 170], windowCount: 1,
    }),
    createRoomPanel(scene, 'l2_kitchenPanel', {
      x: 8.4, y: 4.5, z: 15.0, width: 12.5, height: 9.6, color: [217, 226, 214], trim: [165, 176, 154], windowCount: 1,
    }),
    createRoomPanel(scene, 'l2_stairsPanel', {
      x: 23.2, y: 6.4, z: 14.8, width: 10.8, height: 10.2, color: [224, 217, 206], trim: [171, 156, 138], windowCount: 0,
    }),
    createRoomPanel(scene, 'l2_loftPanel', {
      x: 36.8, y: 8.0, z: 14.6, width: 12.4, height: 9.4, color: [214, 228, 214], trim: [156, 170, 144], windowCount: 2,
    }),
  ];
  roomPanels.forEach((panel) => setRenderingGroup(panel, 1));

  const condoWalls = [
    createCondoWallSegment(scene, 'l2_condoWall_bedroom', {
      x: -11.2, y: 4.9, z: 8.9, width: 14.2, height: 10.0, color: [236, 226, 214], trim: [178, 156, 132],
    }),
    createCondoWallSegment(scene, 'l2_condoWall_kitchen', {
      x: 7.6, y: 4.6, z: 8.8, width: 11.6, height: 9.2, color: [231, 228, 214], trim: [172, 164, 146],
    }),
    createCondoWallSegment(scene, 'l2_condoWall_stairs', {
      x: 23.4, y: 6.0, z: 8.8, width: 9.6, height: 10.6, color: [233, 224, 214], trim: [176, 154, 134],
    }),
    createCondoWallSegment(scene, 'l2_condoWall_loft', {
      x: 36.1, y: 7.8, z: 8.7, width: 10.8, height: 8.8, color: [228, 232, 221], trim: [164, 168, 144],
    }),
  ];
  condoWalls.forEach((node) => setRenderingGroup(node, 1));

  const condoWindows = [
    createWindowDisplay(scene, 'l2_window_bedroom0', { x: -14.2, y: 5.9, z: 8.62, width: 2.6, height: 2.0 }),
    createWindowDisplay(scene, 'l2_window_bedroom1', { x: -8.0, y: 5.8, z: 8.62, width: 2.3, height: 1.9 }),
    createWindowDisplay(scene, 'l2_window_kitchen0', { x: 6.4, y: 5.6, z: 8.56, width: 2.2, height: 1.8 }),
    createWindowDisplay(scene, 'l2_window_loft0', { x: 34.3, y: 8.5, z: 8.52, width: 2.0, height: 1.7 }),
    createWindowDisplay(scene, 'l2_window_loft1', { x: 38.4, y: 8.45, z: 8.52, width: 2.0, height: 1.7 }),
  ];
  condoWindows.forEach((node) => setRenderingGroup(node, 1));

  const wallArt = [
    createWallArt(scene, 'l2_art_bedroom', {
      x: -17.2, y: 5.2, z: 8.52, width: 1.7, height: 1.2, palette: ['#d17d62', '#f1d7a5', '#7892c7'],
    }),
    createWallArt(scene, 'l2_art_kitchen', {
      x: 10.1, y: 5.0, z: 8.48, width: 1.5, height: 1.1, palette: ['#db8856', '#f0d078', '#83a776'],
    }),
    createWallArt(scene, 'l2_art_stairs', {
      x: 20.6, y: 6.9, z: 8.50, width: 1.35, height: 1.0, palette: ['#6e8ec3', '#f5d88a', '#d88767'],
    }),
    createWallArt(scene, 'l2_art_loft', {
      x: 40.0, y: 8.0, z: 8.46, width: 1.7, height: 1.2, palette: ['#7a9c5f', '#f0d090', '#d6765a'],
    }),
  ];
  wallArt.forEach((node) => setRenderingGroup(node, 1));

  const condoTrim = new BABYLON.TransformNode('l2_condoTrim', scene);
  condoTrim.position.set(0, 0, 0);
  tagLevel2Decor(condoTrim);
  for (const [index, def] of [
    { x: 9.0, y: 8.55, z: 8.32, width: 39.5, height: 0.18, depth: 0.12 },
    { x: 30.6, y: 7.2, z: 8.26, width: 12.0, height: 0.16, depth: 0.12 },
    { x: 30.6, y: 7.72, z: 8.16, width: 12.0, height: 0.12, depth: 0.10 },
  ].entries()) {
    const rail = BABYLON.MeshBuilder.CreateBox(`l2_condoTrim_${index}`, def, scene);
    rail.parent = condoTrim;
    rail.position.set(def.x, def.y, def.z);
    rail.material = makeCardboard(scene, `l2_condoTrimMat_${index}`, 176, 154, 132, { roughness: 0.92 });
  }
  setRenderingGroup(condoTrim, 1);

  const wateringDecor = createWateringDecor(scene, 'l2_loftWatering', {
    x: 33.7,
    y: LEVEL2.platforms.find((p) => p.name === 'platRoof').y + 0.42,
    z: 2.12,
  });
  setRenderingGroup(wateringDecor, 2);

  const cornPatch = createCornPatchPlaceholder(scene, 'l2_loftCornPatch', {
    x: 34.3,
    y: LEVEL2.platforms.find((p) => p.name === 'platRoof').y + 0.42,
    z: 1.58,
    rows: 2,
    cols: 3,
    spacingX: 0.82,
    spacingZ: 0.74,
  });
  cornPatch.root.scaling.setAll(1.18);
  setRenderingGroup(cornPatch.root, 2);

  // === AMANDA PATROL ===
  const amandaDef = LEVEL2.amanda;
  let amandaX = amandaDef.minX;
  let amandaDir = 1;
  const amanda = createAmandaMesh(scene, 'amanda', {
    x: amandaX, y: amandaDef.y, z: LANE_Z,
    w: amandaDef.w, h: amandaDef.h, d: amandaDef.d,
    shadowGen,
  });
  const amandaRoot = amanda.root;
  prefixLevel2Gameplay(amandaRoot);
  setRenderingGroup(amandaRoot, 3);

  // === ROCKING HORSE (MOVEABLE PLATFORM) ===
  const horseDef = LEVEL2.horse;
  let horseX = horseDef.startX;
  let horseSnapped = false;
  const horseVisualRoot = createRockingHorseVisual(scene, 'horseVisual', {
    x: horseX, y: LEVEL2.platforms.find((p) => p.name === 'platHorse').y, z: LEVEL2_DECOR_Z,
    shadowGen,
  });
  setRenderingGroup(horseVisualRoot, 2);
  tagLevel2Decor(horseVisualRoot);

  // horseCollider is the invisible platform box for platHorse
  const horseColliderMesh = platformColliders[horseDef.platformName];

  // === DECORATIVE PROP VISUALS (fallbacks; GLBs loaded by boot.js) ===
  const babyBedAnchor = new BABYLON.TransformNode('babyBedAnchor', scene);
  babyBedAnchor.position.set(
    LEVEL2.assetAnchors.babyBed.x,
    LEVEL2.assetAnchors.babyBed.y,
    LEVEL2_DECOR_Z,
  );
  tagLevel2Decor(babyBedAnchor);
  const babyBedVisual = createBedVisual(scene, 'babyBed', {
    x: LEVEL2.assetAnchors.babyBed.x,
    y: LEVEL2.assetAnchors.babyBed.y + 0.1,
    z: LEVEL2_DECOR_Z,
    shadowGen,
  });
  setRenderingGroup(babyBedVisual, 2);
  tagLevel2Decor(babyBedVisual);

  const pianoAnchor = amanda.pianoAnchor;
  pianoAnchor.rotation.y = Math.PI;
  tagLevel2Decor(pianoAnchor);
  const pianoVisual = amanda.pianoFallback;
  setRenderingGroup(pianoVisual, 2);
  tagLevel2Decor(pianoVisual);

  const landingColliderMesh = platformColliders.platLanding;
  landingColliderMesh?.computeWorldMatrix?.(true);
  const landingBounds = landingColliderMesh?.getBoundingInfo?.()?.boundingBox;
  const landingDecorSurface = landingBounds
    ? {
      topY: landingBounds.maximumWorld.y,
      baseY: landingBounds.maximumWorld.y + 0.02,
      minX: landingBounds.minimumWorld.x + 0.45,
      maxX: landingBounds.maximumWorld.x - 0.45,
      minZ: 0.72,
      maxZ: Math.min(1.68, landingBounds.maximumWorld.z - 0.36),
    }
    : {
      topY: LEVEL2.platforms.find((p) => p.name === 'platLanding').y + 0.4,
      baseY: LEVEL2.platforms.find((p) => p.name === 'platLanding').y + 0.42,
      minX: 16.2,
      maxX: 19.8,
      minZ: 0.72,
      maxZ: 1.52,
    };

  const biancaAnchor = new BABYLON.TransformNode('biancaAnchor', scene);
  biancaAnchor.position.set(
    19.3,
    landingDecorSurface.baseY,
    1.06,
  );
  biancaAnchor.rotation.y = Math.PI;
  biancaAnchor.metadata = {
    ...(biancaAnchor.metadata || {}),
    level2DecorSurface: landingDecorSurface,
  };
  tagLevel2Decor(biancaAnchor);

  const highchairAnchor = new BABYLON.TransformNode('highchairAnchor', scene);
  highchairAnchor.position.set(6.2, LEVEL2.platforms.find((p) => p.name === 'platKitchen').y + 0.4, LEVEL2_DECOR_Z - 0.05);
  tagLevel2Decor(highchairAnchor);
  const highchairPlaceholder = createHighchairPlaceholder(scene, 'highchairFallback', {
    x: highchairAnchor.position.x,
    y: highchairAnchor.position.y,
    z: highchairAnchor.position.z,
  });
  highchairPlaceholder.parent = highchairAnchor;
  highchairPlaceholder.position.set(0, 0, 0);
  setRenderingGroup(highchairPlaceholder, 2);
  tagLevel2Decor(highchairPlaceholder);

  const bikeAnchor = new BABYLON.TransformNode('bikeAnchor', scene);
  bikeAnchor.position.set(20.8, LEVEL2.platforms.find((p) => p.name === 'platLanding').y + 0.4, LEVEL2_DECOR_Z - 0.06);
  tagLevel2Decor(bikeAnchor);
  const bikePlaceholder = createBikePlaceholder(scene, 'bikeFallback', {
    x: bikeAnchor.position.x,
    y: bikeAnchor.position.y,
    z: bikeAnchor.position.z,
  });
  bikePlaceholder.parent = bikeAnchor;
  bikePlaceholder.position.set(0, 0, 0);
  setRenderingGroup(bikePlaceholder, 2);
  tagLevel2Decor(bikePlaceholder);

  const packAnchor = new BABYLON.TransformNode('packAnchor', scene);
  packAnchor.position.set(34.6, LEVEL2.platforms.find((p) => p.name === 'platLoft').y + 0.4, LEVEL2_DECOR_Z + 0.08);
  tagLevel2Decor(packAnchor);
  const packPlaceholder = createPackPlaceholder(scene, 'packFallback', {
    x: packAnchor.position.x,
    y: packAnchor.position.y,
    z: packAnchor.position.z,
  });
  packPlaceholder.parent = packAnchor;
  packPlaceholder.position.set(0, 0, 0);
  setRenderingGroup(packPlaceholder, 2);
  tagLevel2Decor(packPlaceholder);

  const loftGoatAnchor = new BABYLON.TransformNode('loftGoatAnchor', scene);
  loftGoatAnchor.position.set(36.0, LEVEL2.platforms.find((p) => p.name === 'platRoof').y + 0.4, LEVEL2_DECOR_Z - 0.14);
  tagLevel2Decor(loftGoatAnchor);

  const roofColliderMesh = platformColliders.platRoof;
  roofColliderMesh?.computeWorldMatrix?.(true);
  const roofBounds = roofColliderMesh?.getBoundingInfo?.()?.boundingBox;
  const roofDecorSurface = roofBounds
    ? {
      topY: roofBounds.maximumWorld.y,
      baseY: roofBounds.maximumWorld.y + 0.02,
      minX: roofBounds.minimumWorld.x + 0.55,
      maxX: roofBounds.maximumWorld.x - 0.55,
      minZ: 0.52,
      maxZ: Math.min(2.0, roofBounds.maximumWorld.z - 0.48),
    }
    : {
      topY: LEVEL2.platforms.find((p) => p.name === 'platRoof').y + 0.4,
      baseY: LEVEL2.platforms.find((p) => p.name === 'platRoof').y + 0.42,
      minX: 34.9,
      maxX: 39.8,
      minZ: 0.52,
      maxZ: 1.95,
    };
  loftGoatAnchor.metadata = {
    ...(loftGoatAnchor.metadata || {}),
    level2DecorSurface: roofDecorSurface,
  };

  const flowerScatter = [
    { x: 34.8, z: 0.78, kind: 'tulip' },
    { x: 35.5, z: 1.18, kind: 'yellow' },
    { x: 36.2, z: 1.58, kind: 'tulip' },
    { x: 36.9, z: 0.92, kind: 'yellow' },
    { x: 37.6, z: 1.42, kind: 'tulip' },
    { x: 38.3, z: 1.82, kind: 'yellow' },
    { x: 39.0, z: 0.74, kind: 'tulip' },
    { x: 39.5, z: 1.26, kind: 'yellow' },
    { x: 35.1, z: 1.78, kind: 'yellow' },
    { x: 35.9, z: 0.62, kind: 'tulip' },
    { x: 37.1, z: 1.92, kind: 'yellow' },
    { x: 38.7, z: 1.12, kind: 'tulip' },
  ];
  const roofTulipAnchors = [];
  const roofYellowAnchors = [];
  flowerScatter.forEach(({ x, z, kind }, index) => {
    const anchor = new BABYLON.TransformNode(`roof${kind === 'tulip' ? 'Tulip' : 'Yellow'}Anchor${index}`, scene);
    anchor.position.set(x, roofDecorSurface.baseY, z);
    anchor.metadata = {
      ...(anchor.metadata || {}),
      level2DecorSurface: roofDecorSurface,
    };
    tagLevel2Decor(anchor);
    if (kind === 'tulip') {
      roofTulipAnchors.push(anchor);
    } else {
      roofYellowAnchors.push(anchor);
    }
  });

  const bedroomTopY = LEVEL2.platforms.find((p) => p.name === 'platBedroom').y + (LEVEL2.platforms.find((p) => p.name === 'platBedroom').h * 0.5);
  const welcomeSign = createWelcomeSign(scene, {
    name: 'l2_welcomeSign',
    x: -19.4,
    y: bedroomTopY,
    z: 2.28,
    shadowGen,
    textLines: ['WELCOME TO', 'CONDO GARDEN'],
    width: 3.42,
    height: 1.46,
    postHeight: 2.82,
    boardName: 'l2_welcome',
    boardColor: [208, 180, 128],
    postColor: [118, 92, 68],
    fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
  });
  setRenderingGroup(welcomeSign, 3);
  tagLevel2Decor(welcomeSign);

  const horseHintSign = createWelcomeSign(scene, {
    name: 'l2_horseHint',
    x: -7.2,
    y: LEVEL2.platforms.find((p) => p.name === 'platBedroom').y + 0.4,
    z: 2.18,
    shadowGen,
    textLines: ['PUSH HORSE', '→'],
    width: 2.36,
    height: 1.0,
    postHeight: 2.15,
    boardName: 'l2_horseHint',
    boardColor: [224, 196, 140],
    postColor: [112, 86, 60],
    fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
    textInsetPx: 64,
  });
  setRenderingGroup(horseHintSign, 3);
  tagLevel2Decor(horseHintSign);

  const rooftopSign = createWelcomeSign(scene, {
    name: 'l2_rooftopSign',
    x: 21.6,
    y: LEVEL2.platforms.find((p) => p.name === 'platLanding').y + 0.4,
    z: -1.18,
    shadowGen,
    textLines: ['TO ROOFTOP GARDEN', '→→→'],
    width: 5.8,
    height: 1.62,
    postHeight: 2.48,
    boardName: 'l2_rooftop',
    boardColor: [232, 215, 172],
    postColor: [112, 86, 62],
    fontFamily: 'Avenir Next, Trebuchet MS, sans-serif',
    textEmissive: new BABYLON.Color3(0.44, 0.30, 0.18),
  });
  setRenderingGroup(rooftopSign, 3);
  tagLevel2Decor(rooftopSign);

  const horseSnapGlow = BABYLON.MeshBuilder.CreatePlane('L2_horseSnapGlow', {
    width: 2.4,
    height: 1.0,
  }, scene);
  horseSnapGlow.position.set(horseDef.snapX + 0.08, 0.03, -1.18);
  horseSnapGlow.rotation.x = Math.PI / 2;
  const horseSnapGlowMat = new BABYLON.StandardMaterial('L2_horseSnapGlowMat', scene);
  horseSnapGlowMat.diffuseColor = new BABYLON.Color3(1.0, 0.88, 0.48);
  horseSnapGlowMat.emissiveColor = new BABYLON.Color3(0.66, 0.54, 0.2);
  horseSnapGlowMat.alpha = 0.18;
  horseSnapGlowMat.backFaceCulling = false;
  horseSnapGlowMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  horseSnapGlow.material = horseSnapGlowMat;
  tagLevel2Decor(horseSnapGlow);
  setRenderingGroup(horseSnapGlow, 1);

  const rockingHorseAnchor = new BABYLON.TransformNode('rockingHorseAnchor', scene);
  rockingHorseAnchor.position.set(horseX, LEVEL2.platforms.find((p) => p.name === 'platHorse').y, LEVEL2_DECOR_Z);
  tagLevel2Decor(rockingHorseAnchor);

  const horseStepActive = {
    x: -1.55,
    y: 1.45,
    z: 0,
    w: 1.85,
    h: 0.60,
    d: 2.8,
  };
  const horseStepVisual = createCardboardPlatform(scene, 'L2_horseStep', {
    x: horseStepActive.x,
    y: horseStepActive.y,
    z: horseStepActive.z,
    w: horseStepActive.w,
    h: horseStepActive.h,
    d: horseStepActive.d,
    slabColor: P2.platformCard,
    edgeColor: P2.edgeDark,
    shadowGen,
  });
  prefixLevel2Gameplay(horseStepVisual);
  setRenderingGroup(horseStepVisual, 2);
  horseStepVisual.setEnabled(false);

  const horseStepCollider = BABYLON.MeshBuilder.CreateBox('L2_horseStep_col', {
    width: horseStepActive.w,
    height: horseStepActive.h,
    depth: horseStepActive.d,
  }, scene);
  horseStepCollider.position.set(horseStepActive.x, -1000, horseStepActive.z);
  horseStepCollider.visibility = 0;
  horseStepCollider.isPickable = false;
  prefixLevel2Gameplay(horseStepCollider);
  allPlatforms.push(horseStepCollider);

  // === LEVEL 2 RUNTIME LOGIC ===
  const PLAYER_HALF_W = 0.25;
  const PLAYER_HALF_H = 0.4;

  function updateAmanda(dt, { pos, triggerReset }) {
    amandaX += amandaDir * amandaDef.speed * dt;
    if (amandaX >= amandaDef.maxX) { amandaX = amandaDef.maxX; amandaDir = -1; }
    if (amandaX <= amandaDef.minX) { amandaX = amandaDef.minX; amandaDir = 1; }
    amandaRoot.position.x = amandaX;

    // Collision with player — simple AABB
    const halfW = amandaDef.w / 2 + PLAYER_HALF_W;
    const halfH = amandaDef.h / 2 + PLAYER_HALF_H;
    const dx = Math.abs(pos.x - amandaX);
    const dy = Math.abs(pos.y - amandaDef.y);
    if (dx < halfW && dy < halfH) {
      triggerReset('amanda', pos.x < amandaX ? -1 : 1);
    }
  }

  function updateHorse(dt, { pos, player }) {
    const colliderIndex = player && player.colliders ? allPlatforms.indexOf(horseColliderMesh) : -1;
    const collider = colliderIndex >= 0 ? player.colliders[colliderIndex] : null;
    const horseStepIndex = player && player.colliders ? allPlatforms.indexOf(horseStepCollider) : -1;
    const horseStepPlayerCollider = horseStepIndex >= 0 ? player.colliders[horseStepIndex] : null;
    if (collider) {
      const platDef = LEVEL2.platforms.find((p) => p.name === 'platHorse');
      const halfW2 = platDef.w / 2;
      collider.minX = horseX - halfW2;
      collider.maxX = horseX + halfW2;
      collider.minY = -1000;
      collider.maxY = -999;
    }
    if (horseStepPlayerCollider) {
      if (horseSnapped) {
        const ext = horseStepCollider.getBoundingInfo().boundingBox.extendSize;
        horseStepPlayerCollider.minX = horseStepActive.x - ext.x;
        horseStepPlayerCollider.maxX = horseStepActive.x + ext.x;
        horseStepPlayerCollider.minY = horseStepActive.y - ext.y;
        horseStepPlayerCollider.maxY = horseStepActive.y + ext.y;
      } else {
        horseStepPlayerCollider.minY = -1000;
        horseStepPlayerCollider.maxY = -999;
      }
    }
    if (horseSnapped) return;
    const inPushZone = pos.x >= horseDef.pushZoneMinX && pos.x <= horseDef.pushZoneMaxX
      && Math.abs(pos.y - (LEVEL2.platforms.find((p) => p.name === 'platHorse').y + 0.4)) < 1.2;
    if (!inPushZone) return;

    horseX = Math.min(horseDef.snapX, horseX + horseDef.speed * dt);
    if (horseX >= horseDef.snapX) {
      horseX = horseDef.snapX;
      horseSnapped = true;
      horseStepVisual.setEnabled(true);
      horseStepCollider.position.set(horseStepActive.x, horseStepActive.y, horseStepActive.z);
    }

    // Move visual
    horseVisualRoot.position.x = horseX;
    rockingHorseAnchor.position.x = horseX;

    // Update collision box position
    if (horseColliderMesh) {
      horseColliderMesh.position.x = horseX;
    }
  }

  const level2 = {
    update(dt, { pos, triggerReset, player }) {
      updateAmanda(dt, { pos, triggerReset });
      updateHorse(dt, { pos, player });
    },
    reset() {
      amandaX = amandaDef.minX;
      amandaDir = 1;
      amandaRoot.position.x = amandaX;

      horseX = horseDef.startX;
      horseSnapped = false;
      horseVisualRoot.position.x = horseX;
      rockingHorseAnchor.position.x = horseX;
      if (horseColliderMesh) {
        horseColliderMesh.position.x = horseX;
      }
      horseStepVisual.setEnabled(false);
      horseStepCollider.position.set(horseStepActive.x, -1000, horseStepActive.z);
    },
    isHorseSnapped() {
      return horseSnapped;
    },
    // Expose anchor nodes for GLB loading in boot.js
    anchors: {
      babyBed: babyBedAnchor,
      piano: pianoAnchor,
      bianca: biancaAnchor,
      rockingHorse: rockingHorseAnchor,
      highchair: highchairAnchor,
      bike: bikeAnchor,
      pack: packAnchor,
      goat: loftGoatAnchor,
      cornPatch: cornPatch.anchors,
      tulips: roofTulipAnchors,
      yellowFlowers: roofYellowAnchors,
    },
    // Expose fallback visuals so boot.js can hide them when GLBs load
    fallbackVisuals: {
      babyBed: babyBedVisual,
      piano: pianoVisual,
      highchair: highchairPlaceholder,
      bike: bikePlaceholder,
      pack: packPlaceholder,
    },
  };

  return {
    ground: groundCollider,
    platforms: allPlatforms,
    goal: dada.goal,
    goalRoot: dada.root,
    shadowGen,
    foregroundMeshes: [],
    extents: LEVEL2.extents,
    spawn: LEVEL2.spawn,
    checkpoints,
    pickups,
    coins,
    hazards,
    crumbles,
    level: LEVEL2,
    goalGuardMinX: goalDef.x - 4.5,
    signs: [],
    level2,
    goalMinBottomY: (LEVEL2.platforms.find((p) => p.name === 'platRoof').y + (LEVEL2.platforms.find((p) => p.name === 'platRoof').h * 0.5)) - 0.2,
    assetAnchors: {
      cribRail: null,    // Level 2 has no crib rail; null avoids truthy-array trap in boot.js
      toyBlocks: [],
      goalBanner: null,  // Level 2 has no goal banner; null avoids truthy-array trap in boot.js
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
      // Level 2 specific
      futureCribModel: [babyBedAnchor],
      futurePianoModel: [pianoAnchor],
      futureBiancaModel: [biancaAnchor],
      futureRockingHorseModel: [rockingHorseAnchor],
      futureHighchairModel: [highchairAnchor],
      futureBikeModel: [bikeAnchor],
      futurePackPropModel: [packAnchor],
      futureGoatPropModel: [loftGoatAnchor],
      futureCornPropModel: cornPatch.anchors,
      futureTulipFlowerPropModel: roofTulipAnchors,
      futureYellowFlowerPropModel: roofYellowAnchors,
    },
  };
}
