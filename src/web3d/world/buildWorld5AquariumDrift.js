import * as BABYLON from '@babylonjs/core';
import {
  createCardboardPlatform,
  createCheckpointMarker,
  createDaDa,
  createWelcomeSign,
  setRenderingGroup,
} from './buildWorld.js';
import {
  applyWorldAlphaRenderPolicy,
  applyWorldOpaqueRenderPolicy,
} from '../render/renderPolicy.js';
import { getLevelMeta } from './levelMeta.js';

const LANE_Z = 0;
const PLATFORM_H = 0.72;
const STEP_H = 0.24;

const PROFILE = {
  clearColor: [0.08, 0.20, 0.27],
  publicGround: [168, 194, 202],
  publicEdge: [93, 124, 136],
  serviceGround: [132, 148, 156],
  serviceEdge: [74, 92, 104],
  glassGround: [132, 190, 206],
  glassEdge: [72, 104, 120],
  checkpointGround: [204, 192, 156],
  checkpointEdge: [128, 114, 82],
  goalGround: [208, 220, 182],
  goalEdge: [132, 144, 108],
  backdropPublic: [34, 84, 104],
  backdropService: [46, 58, 68],
  backMass: [76, 94, 106],
  support: [82, 102, 116],
  accent: [74, 170, 204],
  glassFrame: [178, 220, 232],
  glassPanel: [114, 210, 226],
  tankDeep: [20, 66, 84],
  tankGlow: [72, 156, 180],
  silhouette: [18, 40, 48],
  railMetal: [198, 208, 214],
  pipeLight: [108, 130, 146],
  pipeDark: [70, 86, 98],
  warning: [214, 176, 86],
  pumpCore: [112, 126, 138],
  pumpTrim: [72, 168, 196],
};

const ACTS = [
  { id: 1, name: 'Public Entry Decks', minutes: 10, kind: 'public' },
  { id: 2, name: 'Broken Viewing Gallery', minutes: 12, kind: 'public' },
  { id: 3, name: 'Service Spine', minutes: 11, kind: 'service' },
  { id: 4, name: 'Pump and Filter Core', minutes: 8, kind: 'service' },
  { id: 5, name: 'Crown Tank Run', minutes: 11, kind: 'public' },
];

const MAINLINE_ENCOUNTERS = [
  {
    id: 'L5-E1',
    act: 1,
    name: 'Ticket Hall Drip Apron',
    purpose: 'Teach slick footing with a safe high comparison strip.',
    decision: 'Stay on the wide wet apron or climb the short comparison strip.',
    xMin: -24,
    xMax: -8,
    sample: { x: -18.5, topY: 0.55 },
  },
  {
    id: 'L5-E2',
    act: 1,
    name: 'Voltage Mop Walk',
    purpose: 'Teach lane choice between the public floor and a tighter kiosk bypass.',
    decision: 'Use the floor lane or the upper kiosk bypass.',
    xMin: -8,
    xMax: 10,
    sample: { x: 1.0, topY: 0.75 },
  },
  {
    id: 'L5-E3',
    act: 1,
    name: 'Stingrail Jet Bridge',
    purpose: 'Introduce the first narrow bridge pocket with a lower maintenance shelf.',
    decision: 'Stay on the lower maintenance line or take the higher bridge.',
    xMin: 10,
    xMax: 34,
    sample: { x: 21.0, topY: 1.15 },
  },
  {
    id: 'L5-E4',
    act: 2,
    name: 'Cracked Panorama Gallery',
    purpose: 'Shift from public confidence into a broken gallery with a high-to-low drop read.',
    decision: 'Hold the higher public gallery or drop early to the service shelf.',
    xMin: 36,
    xMax: 52,
    sample: { x: 43.5, topY: 2.15 },
  },
  {
    id: 'L5-E5',
    act: 2,
    name: 'Eel Grate Crosswalk',
    purpose: 'Use parallel crosswalk lines that later support grate ambush pressure.',
    decision: 'Use the narrow center crosswalk or the lower side shelf.',
    xMin: 52,
    xMax: 66,
    sample: { x: 58.5, topY: 1.55 },
  },
  {
    id: 'L5-E6',
    act: 2,
    name: 'Rotunda Spray Bridge',
    purpose: 'Stage the first moving-bridge pocket in a wider public rotunda.',
    decision: 'Commit to the central rotunda hub or hug the outer wait pads.',
    xMin: 66,
    xMax: 82,
    sample: { x: 73.5, topY: 2.45 },
  },
  {
    id: 'L5-E7',
    act: 3,
    name: 'Drainage Spine Catwalk',
    purpose: 'Introduce the narrow service spine with upper and lower recovery lines.',
    decision: 'Hold the narrow upper spine or recover on the lower shelf.',
    xMin: 88,
    xMax: 104,
    sample: { x: 92.5, topY: 2.25 },
  },
  {
    id: 'L5-E8',
    act: 3,
    name: 'Filter Drop Gallery',
    purpose: 'Teach the controlled drop from the upper gallery to the lower receiver.',
    decision: 'Stay high a little longer or commit to the service drop.',
    xMin: 104,
    xMax: 120,
    sample: { x: 107.0, topY: 2.75 },
  },
  {
    id: 'L5-E9',
    act: 3,
    name: 'Wet Relay Gantry',
    purpose: 'Climb back out of service depth through stacked relay decks.',
    decision: 'Take the lower gantry line or climb into the higher relay tier.',
    xMin: 120,
    xMax: 138,
    sample: { x: 126.0, topY: 1.25 },
  },
  {
    id: 'L5-E10',
    act: 4,
    name: 'Saw Ray Intake Chamber',
    purpose: 'Reserve the elite chamber footprint with distinct side galleries and an intake floor.',
    decision: 'Move through the intake floor or hold the side galleries.',
    xMin: 154,
    xMax: 174,
    sample: { x: 156.5, topY: 3.15 },
  },
  {
    id: 'L5-E11',
    act: 4,
    name: 'Pump Crown Bypass',
    purpose: 'Build the pump bypass as a dense layered service read.',
    decision: 'Use the lower bypass or commit to the higher crown route.',
    xMin: 174,
    xMax: 194,
    sample: { x: 176.0, topY: 2.85 },
  },
  {
    id: 'L5-E12',
    act: 5,
    name: 'Exterior Crown Rail',
    purpose: 'Begin the final act on exposed upper rails.',
    decision: 'Stay on the lower crown rail or take the higher exposed rise.',
    xMin: 194,
    xMax: 208,
    sample: { x: 196.5, topY: 4.25 },
  },
  {
    id: 'L5-E13',
    act: 5,
    name: 'Cracked Glass Traverse',
    purpose: 'Use glass versus service-route trust reads before the finale.',
    decision: 'Trust the glass line or drop into the service-under route.',
    xMin: 208,
    xMax: 220,
    sample: { x: 210.5, topY: 4.75 },
  },
  {
    id: 'L5-E14',
    act: 5,
    name: 'Overflow Crown Run',
    purpose: 'Reserve the final mastery chain with alternating overflow decks.',
    decision: 'Take the first overflow deck directly or line up on the higher closing rise.',
    xMin: 220,
    xMax: 244,
    sample: { x: 222.5, topY: 5.15 },
  },
];

const OPTIONAL_BRANCHES = [
  {
    id: 'L5-OB1',
    act: 3,
    name: 'Quarantine Pipe Loop',
    purpose: 'A lower, shorter, riskier service shortcut after the filter drop.',
    decision: 'Drop into the pipe loop or stay on the main relay approach.',
    xMin: 112,
    xMax: 126,
    sample: { x: 116.0, topY: 0.55 },
  },
  {
    id: 'L5-OB2',
    act: 5,
    name: 'Skylight Service Loop',
    purpose: 'A faster exposed loop above the cracked glass line.',
    decision: 'Climb the skylight service loop or stay on the lower mainline.',
    xMin: 212,
    xMax: 228,
    sample: { x: 218.0, topY: 5.55 },
  },
];

const CHECKPOINTS = [
  { id: 'CP1', label: 'Ticketing Service Door', x: 36.5, topY: 1.85 },
  { id: 'CP2', label: 'Rotunda Locker Rail', x: 84.5, topY: 2.85 },
  { id: 'CP3', label: 'Relay Tool Cage', x: 151.5, topY: 3.05 },
  { id: 'CP4', label: 'Upper Filter Lock', x: 191.5, topY: 4.05 },
];

function makeColor(rgb) {
  return new BABYLON.Color3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

function createShadowLight(scene) {
  const light = new BABYLON.DirectionalLight('level5_aquarium_keyLight', new BABYLON.Vector3(-0.42, -1, 0.18), scene);
  light.position = new BABYLON.Vector3(40, 28, -18);
  light.intensity = 1.04;
  const shadowGen = new BABYLON.ShadowGenerator(1024, light);
  shadowGen.usePercentageCloserFiltering = true;
  return shadowGen;
}

function markDecor(node, extraMetadata = {}) {
  if (!node) return;
  node.metadata = {
    ...(node.metadata || {}),
    cameraIgnore: true,
    decor: true,
    ...extraMetadata,
  };
  const meshes = node instanceof BABYLON.Mesh ? [node] : node.getChildMeshes?.(false) || [];
  for (const mesh of meshes) {
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

function createOpaqueMaterial(scene, name, rgb) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = makeColor(rgb);
  mat.emissiveColor = makeColor(rgb).scale(0.1);
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

function createAlphaMaterial(scene, name, rgb, alpha = 0.48) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = makeColor(rgb);
  mat.emissiveColor = makeColor(rgb).scale(0.22);
  mat.specularColor = BABYLON.Color3.Black();
  mat.alpha = alpha;
  return mat;
}

function createDecorRoot(scene, name, {
  x = 0,
  y = 0,
  z = 0,
  rotY = 0,
  metadata = {},
} = {}) {
  const root = new BABYLON.TransformNode(name, scene);
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  markDecor(root, metadata);
  return root;
}

function createDecorBox(scene, name, {
  x,
  y,
  z,
  w,
  h,
  d,
  rgb,
  shadowGen,
  parent = null,
  metadata = {},
}) {
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width: w,
    height: h,
    depth: d,
  }, scene);
  if (parent) mesh.parent = parent;
  mesh.position.set(x, y, z);
  mesh.material = createOpaqueMaterial(scene, `${name}_mat`, rgb);
  mesh.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(mesh);
  applyWorldOpaqueRenderPolicy(mesh);
  markDecor(mesh, metadata);
  return mesh;
}

function createDecorCylinder(scene, name, {
  x,
  y,
  z,
  height,
  diameter,
  rgb,
  shadowGen,
  parent = null,
  rotation = null,
  metadata = {},
}) {
  const mesh = BABYLON.MeshBuilder.CreateCylinder(name, {
    height,
    diameter,
    tessellation: 16,
  }, scene);
  if (parent) mesh.parent = parent;
  mesh.position.set(x, y, z);
  if (rotation) {
    mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  }
  mesh.material = createOpaqueMaterial(scene, `${name}_mat`, rgb);
  mesh.receiveShadows = true;
  if (shadowGen) shadowGen.addShadowCaster(mesh);
  applyWorldOpaqueRenderPolicy(mesh);
  markDecor(mesh, metadata);
  return mesh;
}

function createAlphaPanel(scene, name, {
  x,
  y,
  z,
  w,
  h,
  rgb,
  alpha = 0.45,
  parent = null,
  metadata = {},
}) {
  const mesh = BABYLON.MeshBuilder.CreatePlane(name, {
    width: w,
    height: h,
  }, scene);
  if (parent) mesh.parent = parent;
  mesh.position.set(x, y, z);
  mesh.material = createAlphaMaterial(scene, `${name}_mat`, rgb, alpha);
  applyWorldAlphaRenderPolicy(mesh);
  markDecor(mesh, metadata);
  return mesh;
}

function createPlatformCollider(scene, name, def) {
  const collider = BABYLON.MeshBuilder.CreateBox(`${name}_col`, {
    width: def.w,
    height: def.h,
    depth: def.d,
  }, scene);
  collider.position.set(def.x, def.y, def.z ?? LANE_Z);
  collider.visibility = 0;
  collider.isPickable = false;
  return collider;
}

function topYToCenterY(topY, height) {
  return Number((topY - (height * 0.5)).toFixed(3));
}

function deckDef(name, xMin, xMax, topY, {
  depth = 4.6,
  height = PLATFORM_H,
  kind = 'public',
  encounterId = null,
  branchId = null,
} = {}) {
  const w = Number((xMax - xMin).toFixed(3));
  return {
    name,
    x: Number((((xMin + xMax) * 0.5)).toFixed(3)),
    y: topYToCenterY(topY, height),
    z: LANE_Z,
    w,
    h: height,
    d: depth,
    topY: Number(topY.toFixed(3)),
    xMin: Number(xMin.toFixed(3)),
    xMax: Number(xMax.toFixed(3)),
    kind,
    encounterId,
    branchId,
  };
}

function addStairRun(list, prefix, xMin, xMax, topYStart, topYEnd, {
  depth = 3.0,
  kind = 'service',
  encounterId = null,
  branchId = null,
  maxRise = 0.12,
} = {}) {
  const totalRise = topYEnd - topYStart;
  const steps = Math.max(2, Math.ceil(Math.abs(totalRise) / maxRise));
  const span = xMax - xMin;
  const stepW = span / steps;
  for (let index = 0; index < steps; index += 1) {
    const stepTopY = Number((topYStart + (totalRise * ((index + 1) / steps))).toFixed(3));
    const left = xMin + (stepW * index);
    const right = xMin + (stepW * (index + 1)) + (index === steps - 1 ? 0.04 : 0.12);
    list.push(deckDef(`${prefix}_${index + 1}`, left, right, stepTopY, {
      depth,
      height: STEP_H,
      kind,
      encounterId,
      branchId,
    }));
  }
}

function getKindColors(kind) {
  switch (kind) {
    case 'service':
      return { slabColor: PROFILE.serviceGround, edgeColor: PROFILE.serviceEdge };
    case 'glass':
      return { slabColor: PROFILE.glassGround, edgeColor: PROFILE.glassEdge };
    case 'checkpoint':
      return { slabColor: PROFILE.checkpointGround, edgeColor: PROFILE.checkpointEdge };
    case 'goal':
      return { slabColor: PROFILE.goalGround, edgeColor: PROFILE.goalEdge };
    default:
      return { slabColor: PROFILE.publicGround, edgeColor: PROFILE.publicEdge };
  }
}

function buildLayout() {
  const surfaces = [];
  const add = (def) => surfaces.push(def);

  const ground = deckDef('aquarium_drift_ground_start', -24, -12, 0.55, { encounterId: 'L5-E1' });
  add(deckDef('e1_compare_strip', -21, -13, 0.95, { depth: 2.8, kind: 'glass', encounterId: 'L5-E1' }));
  addStairRun(surfaces, 'e1_compare_steps', -23.4, -20.8, 0.55, 0.95, { depth: 2.8, kind: 'glass', encounterId: 'L5-E1' });
  add(deckDef('e1_exit_apron', -12, -6, 0.75, { encounterId: 'L5-E1' }));

  add(deckDef('e2_floor_lane', -6, 8, 0.75, { encounterId: 'L5-E2' }));
  add(deckDef('e2_kiosk_bypass', -2.5, 9.5, 1.35, { depth: 3.0, kind: 'glass', encounterId: 'L5-E2' }));
  addStairRun(surfaces, 'e2_kiosk_up', -6.2, -2.4, 0.75, 1.35, { depth: 2.8, kind: 'glass', encounterId: 'L5-E2' });
  addStairRun(surfaces, 'e2_kiosk_down', 8.2, 10.2, 1.35, 1.15, { depth: 2.8, kind: 'glass', encounterId: 'L5-E2' });
  addStairRun(surfaces, 'e2_merge_rise', 6.0, 10.0, 0.75, 1.15, { depth: 3.2, kind: 'public', encounterId: 'L5-E2' });
  add(deckDef('e2_merge_landing', 10, 14, 1.15, { encounterId: 'L5-E2' }));

  add(deckDef('e3_maintenance_line', 14, 22, 1.15, { depth: 3.2, kind: 'service', encounterId: 'L5-E3' }));
  add(deckDef('e3_bridge_high', 18, 26, 1.75, { depth: 1.9, kind: 'glass', encounterId: 'L5-E3' }));
  addStairRun(surfaces, 'e3_bridge_rise', 22, 26, 1.15, 1.55, { depth: 2.2, kind: 'service', encounterId: 'L5-E3' });
  add(deckDef('e3_bridge_exit', 26, 34, 1.55, { depth: 2.2, kind: 'public', encounterId: 'L5-E3' }));
  addStairRun(surfaces, 'cp1_rise', 34, 36.6, 1.55, 1.85, { depth: 3.4, kind: 'checkpoint', encounterId: 'L5-E3' });
  add(deckDef('cp1_pocket', 36.6, 40.4, 1.85, { depth: 4.8, kind: 'checkpoint', encounterId: 'L5-E3' }));

  addStairRun(surfaces, 'e4_gallery_entry', 40.4, 42.8, 1.85, 2.15, { depth: 3.6, encounterId: 'L5-E4' });
  add(deckDef('e4_public_gallery', 42.8, 50.0, 2.15, { depth: 4.8, encounterId: 'L5-E4' }));
  add(deckDef('e4_service_drop', 49.5, 56.5, 1.35, { depth: 3.2, kind: 'service', encounterId: 'L5-E4' }));
  addStairRun(surfaces, 'e4_exit_rise', 56.5, 60.0, 1.35, 1.55, { depth: 3.2, kind: 'service', encounterId: 'L5-E4' });
  add(deckDef('e5_crosswalk', 60.0, 67.0, 1.55, { depth: 2.2, kind: 'public', encounterId: 'L5-E5' }));
  add(deckDef('e5_side_shelf', 62.0, 70.5, 1.25, { depth: 3.0, kind: 'service', encounterId: 'L5-E5' }));
  add(deckDef('e5_upper_hatch', 66.5, 72.0, 1.85, { depth: 2.4, kind: 'glass', encounterId: 'L5-E5' }));

  addStairRun(surfaces, 'e6_rotunda_entry', 70.0, 73.0, 1.55, 2.15, { depth: 3.2, encounterId: 'L5-E6' });
  add(deckDef('e6_rotunda_hub', 73.0, 80.0, 2.45, { depth: 3.6, encounterId: 'L5-E6' }));
  add(deckDef('e6_rotunda_wait', 77.0, 82.0, 2.15, { depth: 2.0, kind: 'service', encounterId: 'L5-E6' }));
  add(deckDef('e6_rotunda_outer', 74.0, 82.0, 2.75, { depth: 1.9, kind: 'glass', encounterId: 'L5-E6' }));
  addStairRun(surfaces, 'cp2_rise', 82.0, 84.5, 2.45, 2.85, { depth: 3.4, kind: 'checkpoint', encounterId: 'L5-E6' });
  add(deckDef('cp2_pocket', 84.5, 88.5, 2.85, { depth: 4.8, kind: 'checkpoint', encounterId: 'L5-E6' }));

  add(deckDef('e7_spine_upper', 88.5, 96.5, 2.25, { depth: 1.9, kind: 'service', encounterId: 'L5-E7' }));
  add(deckDef('e7_spine_recovery', 90.0, 101.0, 1.65, { depth: 3.0, kind: 'service', encounterId: 'L5-E7' }));
  add(deckDef('e7_spine_highline', 92.0, 100.0, 2.95, { depth: 1.8, kind: 'glass', encounterId: 'L5-E7' }));
  addStairRun(surfaces, 'e7_exit_rise', 98.0, 104.0, 2.25, 2.55, { depth: 2.4, kind: 'service', encounterId: 'L5-E7' });

  add(deckDef('e8_gallery_high', 104.0, 110.0, 2.75, { depth: 3.0, encounterId: 'L5-E8' }));
  add(deckDef('e8_commit_shelf', 110.0, 114.0, 2.55, { depth: 2.4, kind: 'glass', encounterId: 'L5-E8' }));
  add(deckDef('e8_receiver_low', 114.0, 123.5, 1.05, { depth: 3.6, kind: 'service', encounterId: 'L5-E8' }));
  add(deckDef('ob1_pipe_a', 112.0, 118.0, 0.55, { depth: 1.8, kind: 'service', branchId: 'L5-OB1' }));
  add(deckDef('ob1_pipe_b', 118.0, 123.0, 0.85, { depth: 1.8, kind: 'service', branchId: 'L5-OB1' }));
  addStairRun(surfaces, 'ob1_rejoin_rise', 123.0, 126.0, 0.85, 1.25, { depth: 1.9, kind: 'service', branchId: 'L5-OB1' });
  add(deckDef('ob1_pipe_reward', 126.0, 128.5, 1.25, { depth: 1.8, kind: 'glass', branchId: 'L5-OB1' }));

  add(deckDef('e9_relay_low', 123.5, 131.0, 1.25, { depth: 3.2, kind: 'service', encounterId: 'L5-E9' }));
  addStairRun(surfaces, 'e9_relay_mid_rise', 131.0, 135.5, 1.25, 1.95, { depth: 2.8, kind: 'service', encounterId: 'L5-E9' });
  add(deckDef('e9_relay_mid', 135.5, 140.0, 1.95, { depth: 2.6, kind: 'service', encounterId: 'L5-E9' }));
  addStairRun(surfaces, 'e9_relay_high_rise', 140.0, 144.0, 1.95, 2.65, { depth: 2.6, kind: 'service', encounterId: 'L5-E9' });
  add(deckDef('e9_relay_high', 144.0, 147.0, 2.65, { depth: 2.2, kind: 'service', encounterId: 'L5-E9' }));
  addStairRun(surfaces, 'cp3_rise', 147.0, 149.5, 2.65, 3.05, { depth: 3.2, kind: 'checkpoint', encounterId: 'L5-E9' });
  add(deckDef('cp3_pocket', 149.5, 154.0, 3.05, { depth: 4.8, kind: 'checkpoint', encounterId: 'L5-E9' }));

  add(deckDef('e10_left_gallery', 154.0, 160.0, 3.15, { depth: 2.6, kind: 'service', encounterId: 'L5-E10' }));
  add(deckDef('e10_intake_floor', 160.0, 166.0, 2.35, { depth: 4.0, kind: 'service', encounterId: 'L5-E10' }));
  addStairRun(surfaces, 'e10_right_gallery_rise', 166.0, 170.0, 2.35, 3.25, { depth: 2.8, kind: 'service', encounterId: 'L5-E10' });
  add(deckDef('e10_right_gallery', 170.0, 174.0, 3.25, { depth: 2.6, kind: 'service', encounterId: 'L5-E10' }));

  add(deckDef('e11_bypass_low', 174.0, 180.0, 2.85, { depth: 3.0, kind: 'service', encounterId: 'L5-E11' }));
  add(deckDef('e11_bypass_high', 180.0, 186.0, 3.75, { depth: 2.2, kind: 'glass', encounterId: 'L5-E11' }));
  addStairRun(surfaces, 'cp4_rise', 186.0, 189.0, 3.75, 4.05, { depth: 3.4, kind: 'checkpoint', encounterId: 'L5-E11' });
  add(deckDef('cp4_pocket', 189.0, 194.0, 4.05, { depth: 4.8, kind: 'checkpoint', encounterId: 'L5-E11' }));

  add(deckDef('e12_crown_low', 194.0, 200.0, 4.25, { depth: 1.9, kind: 'glass', encounterId: 'L5-E12' }));
  addStairRun(surfaces, 'e12_crown_rise', 200.0, 204.0, 4.25, 4.65, { depth: 2.0, kind: 'glass', encounterId: 'L5-E12' });
  add(deckDef('e12_crown_high', 204.0, 208.0, 4.65, { depth: 1.9, kind: 'glass', encounterId: 'L5-E12' }));

  add(deckDef('e13_glass_line_a', 208.0, 214.0, 4.75, { depth: 2.0, kind: 'glass', encounterId: 'L5-E13' }));
  add(deckDef('e13_glass_line_b', 216.0, 220.0, 5.05, { depth: 2.0, kind: 'glass', encounterId: 'L5-E13' }));
  add(deckDef('e13_service_under', 210.0, 222.0, 4.05, { depth: 3.0, kind: 'service', encounterId: 'L5-E13' }));
  addStairRun(surfaces, 'ob2_climb', 212.0, 216.0, 4.75, 5.55, { depth: 1.8, kind: 'service', branchId: 'L5-OB2' });
  add(deckDef('ob2_skylight_a', 216.0, 222.0, 5.55, { depth: 1.8, kind: 'service', branchId: 'L5-OB2' }));
  addStairRun(surfaces, 'ob2_rejoin_rise', 222.0, 226.0, 5.55, 5.95, { depth: 1.8, kind: 'service', branchId: 'L5-OB2' });
  add(deckDef('ob2_skylight_b', 226.0, 228.5, 5.95, { depth: 1.8, kind: 'glass', branchId: 'L5-OB2' }));

  add(deckDef('e14_overflow_a', 220.0, 226.0, 5.15, { depth: 2.2, kind: 'glass', encounterId: 'L5-E14' }));
  addStairRun(surfaces, 'e14_overflow_rise', 226.0, 230.0, 5.15, 5.55, { depth: 2.2, kind: 'service', encounterId: 'L5-E14' });
  add(deckDef('e14_overflow_b', 230.0, 236.0, 5.55, { depth: 2.0, kind: 'glass', encounterId: 'L5-E14' }));
  addStairRun(surfaces, 'e14_goal_rise', 236.0, 239.0, 5.55, 5.95, { depth: 2.6, kind: 'goal', encounterId: 'L5-E14' });
  add(deckDef('e14_goal_lock', 239.0, 244.0, 5.95, { depth: 3.8, kind: 'goal', encounterId: 'L5-E14' }));

  const spawn = {
    x: -22.5,
    y: Number((ground.topY + 0.405).toFixed(3)),
    z: LANE_Z,
  };
  const goal = {
    x: 242.2,
    y: Number((5.95 + 0.12).toFixed(3)),
    z: LANE_Z,
  };

  const checkpoints = CHECKPOINTS.map((checkpoint, index) => ({
    ...checkpoint,
    index: index + 1,
    spawn: {
      x: checkpoint.x,
      y: Number((checkpoint.topY + 0.405).toFixed(3)),
      z: LANE_Z,
    },
  }));

  const distinctTopLevels = Array.from(new Set(surfaces.map((surface) => surface.topY.toFixed(2)))).map(Number);

  return {
    extents: { minX: -28, maxX: 248 },
    spawn,
    goal,
    ground,
    platforms: surfaces.filter((surface) => surface.name !== ground.name),
    checkpoints,
    encounters: MAINLINE_ENCOUNTERS,
    optionalBranches: OPTIONAL_BRANCHES,
    layoutReport: {
      levelId: 5,
      title: 'Aquarium Drift',
      themeKey: 'aquarium',
      runtimeFamily: '2.5d',
      actBudgets: ACTS.map((act) => ({ id: act.id, name: act.name, minutes: act.minutes })),
      encounters: MAINLINE_ENCOUNTERS.map((encounter) => ({
        ...encounter,
        safeSample: {
          x: encounter.sample.x,
          y: Number((encounter.sample.topY + 0.405).toFixed(3)),
          z: LANE_Z,
        },
      })),
      optionalBranches: OPTIONAL_BRANCHES.map((branch) => ({
        ...branch,
        safeSample: {
          x: branch.sample.x,
          y: Number((branch.sample.topY + 0.405).toFixed(3)),
          z: LANE_Z,
        },
      })),
      checkpoints: checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        label: checkpoint.label,
        spawn: checkpoint.spawn,
      })),
      encounterCount: MAINLINE_ENCOUNTERS.length,
      optionalBranchCount: OPTIONAL_BRANCHES.length,
      checkpointCount: checkpoints.length,
      eliteEncounterId: 'L5-E10',
      finalMasteryEncounterId: 'L5-E14',
      routeWidth: 276,
      platformCount: surfaces.length,
      distinctTopLevels,
      proofPoses: {
        act1: { x: 2.0, y: Number((1.35 + 0.405).toFixed(3)), z: LANE_Z },
        act2: { x: 74.0, y: Number((2.45 + 0.405).toFixed(3)), z: LANE_Z },
        act3: { x: 126.0, y: Number((1.25 + 0.405).toFixed(3)), z: LANE_Z },
        act4: { x: 156.5, y: Number((3.15 + 0.405).toFixed(3)), z: LANE_Z },
        act5: { x: 222.5, y: Number((5.15 + 0.405).toFixed(3)), z: LANE_Z },
      },
    },
  };
}

function buildVisualPlan(layout) {
  const spaces = [...layout.encounters, ...layout.optionalBranches];
  const moduleCounts = {
    glassWalls: 5,
    railings: 4,
    servicePipes: 4,
    tankBackgrounds: 3,
    pumpHeroes: 2,
  };
  const modules = {
    glassWalls: [
      { id: 'glass_entry_portal', encounterIds: ['L5-E1', 'L5-E2'], x: -2.0, y: 3.0, z: 5.62, w: 20.0, h: 4.8, variant: 'clean' },
      { id: 'glass_panorama_crack', encounterIds: ['L5-E4'], x: 44.0, y: 4.15, z: 5.66, w: 13.6, h: 5.2, variant: 'cracked' },
      { id: 'glass_rotunda_arc', encounterIds: ['L5-E6'], x: 74.5, y: 4.35, z: 5.7, w: 13.2, h: 5.0, variant: 'clean' },
      { id: 'glass_crown_shell_a', encounterIds: ['L5-E12'], x: 200.5, y: 6.0, z: 5.72, w: 12.5, h: 5.6, variant: 'clean' },
      { id: 'glass_crown_shell_b', encounterIds: ['L5-E13', 'L5-E14', 'L5-OB2'], x: 222.5, y: 6.35, z: 5.76, w: 22.8, h: 5.8, variant: 'cracked' },
    ],
    railings: [
      { id: 'rail_ticket_balcony', encounterIds: ['L5-E1'], x: -16.8, y: 1.18, z: 2.18, length: 8.6 },
      { id: 'rail_crosswalk_guard', encounterIds: ['L5-E5'], x: 61.8, y: 1.9, z: 1.2, length: 9.8 },
      { id: 'rail_relay_guard', encounterIds: ['L5-E9'], x: 136.2, y: 2.38, z: 1.35, length: 11.4 },
      { id: 'rail_crown_exterior', encounterIds: ['L5-E12'], x: 201.0, y: 5.12, z: 2.05, length: 12.4 },
    ],
    servicePipes: [
      { id: 'pipe_drainage_spine', encounterIds: ['L5-E7'], x: 96.0, y: 4.15, z: 5.34, width: 12.8, height: 3.6, variant: 'tall' },
      { id: 'pipe_quarantine_loop', encounterIds: ['L5-E8', 'L5-OB1'], x: 118.8, y: 2.4, z: 5.18, width: 15.6, height: 2.9, variant: 'low' },
      { id: 'pipe_intake_manifold', encounterIds: ['L5-E10'], x: 164.2, y: 4.55, z: 5.22, width: 14.0, height: 4.0, variant: 'tall' },
      { id: 'pipe_pump_bypass', encounterIds: ['L5-E11'], x: 183.8, y: 4.7, z: 5.24, width: 13.2, height: 3.8, variant: 'tall' },
    ],
    tankBackgrounds: [
      { id: 'tank_public_kelp', encounterIds: ['L5-E1', 'L5-E2', 'L5-E3'], x: 2.0, y: 2.8, z: 6.46, w: 34.0, h: 4.8, variant: 'kelp' },
      { id: 'tank_rotunda_drift', encounterIds: ['L5-E4', 'L5-E5', 'L5-E6'], x: 60.5, y: 3.6, z: 6.5, w: 46.0, h: 5.4, variant: 'shoal' },
      { id: 'tank_crown_deep', encounterIds: ['L5-E12', 'L5-E13', 'L5-E14', 'L5-OB2'], x: 218.5, y: 5.95, z: 6.54, w: 43.0, h: 6.2, variant: 'crown' },
    ],
    pumpHeroes: [
      { id: 'hero_saw_ray_intake', encounterIds: ['L5-E10'], x: 164.0, y: 3.2, z: 4.0, variant: 'intake_turbine' },
      { id: 'hero_pump_core_crown', encounterIds: ['L5-E11'], x: 184.0, y: 3.8, z: 4.14, variant: 'pump_crown' },
    ],
  };

  const coverage = new Map(spaces.map((space) => {
    const act = ACTS.find((candidate) => candidate.id === space.act) || ACTS[0];
    const visualProfile = act.kind === 'service'
      ? (space.id === 'L5-E10' || space.id === 'L5-E11' ? 'pump_core' : 'service_spine')
      : (space.id === 'L5-E12' || space.id === 'L5-E13' || space.id === 'L5-E14' || space.id === 'L5-OB2' ? 'crown_tank' : 'public_gallery');
    const genericTags = act.kind === 'service'
      ? ['service_bulkhead', 'maintenance_struts']
      : ['public_window_frame', 'visitor_fascia'];
    if (space.id === 'L5-E4') genericTags.push('cracked_gallery');
    if (space.id === 'L5-E8') genericTags.push('filter_drop');
    if (space.id === 'L5-OB1') genericTags.push('quarantine_loop');
    if (space.id === 'L5-E10') genericTags.push('intake_chamber');
    if (space.id === 'L5-E11') genericTags.push('pump_bypass');
    if (space.id === 'L5-OB2') genericTags.push('skylight_loop');
    return [space.id, {
      id: space.id,
      act: space.act,
      routeRead: act.kind,
      visualProfile,
      genericTags,
      moduleIds: [],
      moduleTypes: [],
    }];
  }));

  for (const [moduleType, list] of Object.entries(modules)) {
    for (const def of list) {
      for (const encounterId of def.encounterIds) {
        const entry = coverage.get(encounterId);
        if (!entry) continue;
        entry.moduleIds.push(def.id);
        if (!entry.moduleTypes.includes(moduleType)) entry.moduleTypes.push(moduleType);
      }
    }
  }

  return {
    ...modules,
    report: {
      moduleCounts,
      modules: [
        ...modules.glassWalls.map(({ id, encounterIds }) => ({ id, type: 'glassWall', encounterIds })),
        ...modules.railings.map(({ id, encounterIds }) => ({ id, type: 'railing', encounterIds })),
        ...modules.servicePipes.map(({ id, encounterIds }) => ({ id, type: 'servicePipe', encounterIds })),
        ...modules.tankBackgrounds.map(({ id, encounterIds }) => ({ id, type: 'tankBackground', encounterIds })),
        ...modules.pumpHeroes.map(({ id, encounterIds }) => ({ id, type: 'pumpHero', encounterIds })),
      ],
      encounterCoverage: Array.from(coverage.values()).map((entry) => ({
        ...entry,
        visualTags: [...entry.genericTags, ...entry.moduleTypes],
      })),
    },
  };
}

function buildBackdrops(scene, shadowGen, layout, visualPlan) {
  createDecorBox(scene, 'aquarium_void_floor_visual', {
    x: 110,
    y: -3.1,
    z: 0,
    w: 292,
    h: 3.8,
    d: 10.5,
    rgb: PROFILE.backMass,
    shadowGen,
  });

  for (const encounter of [...layout.encounters, ...layout.optionalBranches]) {
    const act = ACTS.find((candidate) => candidate.id === encounter.act) || ACTS[0];
    const backdropColor = act.kind === 'service' ? PROFILE.backdropService : PROFILE.backdropPublic;
    const centerX = (encounter.xMin + encounter.xMax) * 0.5;
    const width = (encounter.xMax - encounter.xMin) + 2.8;
    const midTop = encounter.sample.topY;

    createDecorBox(scene, `${encounter.id}_backwall`, {
      x: centerX,
      y: midTop + 1.8,
      z: 6.3,
      w: width,
      h: 6.8,
      d: 0.8,
      rgb: backdropColor,
      shadowGen,
      metadata: { encounterId: encounter.id, visualRole: 'backwall' },
    });

    createDecorBox(scene, `${encounter.id}_underdeck`, {
      x: centerX,
      y: midTop - 1.9,
      z: 1.6,
      w: width,
      h: 2.4,
      d: 2.8,
      rgb: PROFILE.backMass,
      shadowGen,
      metadata: { encounterId: encounter.id, visualRole: 'underdeck' },
    });

    if (act.kind === 'public') {
      createDecorBox(scene, `${encounter.id}_frame_left`, {
        x: centerX - ((width * 0.5) - 0.55),
        y: midTop + 1.9,
        z: 5.92,
        w: 0.8,
        h: 5.4,
        d: 0.42,
        rgb: PROFILE.glassFrame,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'public_frame' },
      });
      createDecorBox(scene, `${encounter.id}_frame_right`, {
        x: centerX + ((width * 0.5) - 0.55),
        y: midTop + 1.9,
        z: 5.92,
        w: 0.8,
        h: 5.4,
        d: 0.42,
        rgb: PROFILE.glassFrame,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'public_frame' },
      });
      createDecorBox(scene, `${encounter.id}_lintel`, {
        x: centerX,
        y: midTop + 4.2,
        z: 5.9,
        w: Math.max(4.0, width - 0.9),
        h: 0.44,
        d: 0.48,
        rgb: PROFILE.publicEdge,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'public_lintel' },
      });
      createDecorBox(scene, `${encounter.id}_window_band`, {
        x: centerX,
        y: midTop + 0.75,
        z: 5.78,
        w: Math.max(4.0, width - 1.4),
        h: 1.3,
        d: 0.22,
        rgb: PROFILE.accent,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'window_band' },
      });
      if (encounter.id === 'L5-E4') {
        createDecorBox(scene, `${encounter.id}_gallery_crack_block`, {
          x: centerX + 2.2,
          y: midTop + 1.4,
          z: 5.54,
          w: 2.6,
          h: 3.8,
          d: 0.58,
          rgb: PROFILE.publicEdge,
          shadowGen,
          metadata: { encounterId: encounter.id, visualRole: 'collapsed_gallery_wall' },
        });
      }
    } else {
      createDecorBox(scene, `${encounter.id}_bulkhead_left`, {
        x: centerX - ((width * 0.5) - 0.55),
        y: midTop + 1.85,
        z: 5.86,
        w: 0.9,
        h: 5.6,
        d: 0.54,
        rgb: PROFILE.pipeDark,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'service_bulkhead' },
      });
      createDecorBox(scene, `${encounter.id}_bulkhead_right`, {
        x: centerX + ((width * 0.5) - 0.55),
        y: midTop + 1.85,
        z: 5.86,
        w: 0.9,
        h: 5.6,
        d: 0.54,
        rgb: PROFILE.pipeDark,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'service_bulkhead' },
      });
      createDecorBox(scene, `${encounter.id}_service_lintel`, {
        x: centerX,
        y: midTop + 4.18,
        z: 5.82,
        w: Math.max(3.4, width - 1.0),
        h: 0.52,
        d: 0.56,
        rgb: PROFILE.warning,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'service_lintel' },
      });
      createDecorBox(scene, `${encounter.id}_pipe_bank`, {
        x: centerX,
        y: midTop + 0.7,
        z: 5.72,
        w: Math.max(3.2, width - 3.0),
        h: 0.7,
        d: 0.35,
        rgb: PROFILE.support,
        shadowGen,
        metadata: { encounterId: encounter.id, visualRole: 'pipe_bank' },
      });
      if (encounter.id === 'L5-E8') {
        createDecorBox(scene, `${encounter.id}_filter_well`, {
          x: centerX + 3.8,
          y: midTop - 0.3,
          z: 3.6,
          w: 3.8,
          h: 2.3,
          d: 2.4,
          rgb: PROFILE.pipeDark,
          shadowGen,
          metadata: { encounterId: encounter.id, visualRole: 'filter_drop_setpiece' },
        });
      }
    }
  }

  for (const checkpoint of layout.checkpoints) {
    createDecorBox(scene, `${checkpoint.id}_bulkhead`, {
      x: checkpoint.x,
      y: checkpoint.topY + 1.2,
      z: 4.4,
      w: 6.6,
      h: 4.8,
      d: 0.9,
      rgb: PROFILE.checkpointEdge,
      shadowGen,
      metadata: { checkpointId: checkpoint.id, visualRole: 'checkpoint_bulkhead' },
    });
  }

  for (const module of visualPlan.tankBackgrounds) {
    const root = createDecorRoot(scene, module.id, {
      x: module.x,
      y: module.y,
      z: module.z,
      metadata: {
        encounterIds: module.encounterIds,
        visualModuleId: module.id,
        visualModuleType: 'tankBackground',
      },
    });
    createAlphaPanel(scene, `${module.id}_water`, {
      parent: root,
      x: 0,
      y: 0,
      z: 0,
      w: module.w,
      h: module.h,
      rgb: PROFILE.tankGlow,
      alpha: 0.34,
      metadata: { encounterIds: module.encounterIds, visualRole: 'tank_water' },
    });
    createDecorBox(scene, `${module.id}_base`, {
      parent: root,
      x: 0,
      y: -(module.h * 0.45),
      z: 0.05,
      w: module.w,
      h: 0.45,
      d: 0.2,
      rgb: PROFILE.silhouette,
      shadowGen,
      metadata: { encounterIds: module.encounterIds, visualRole: 'tank_base' },
    });
    for (const [index, offset] of [-0.34, 0.0, 0.31].entries()) {
      createAlphaPanel(scene, `${module.id}_silhouette_${index}`, {
        parent: root,
        x: module.w * offset,
        y: (index === 1 ? 0.28 : -0.12) * module.h,
        z: -0.02,
        w: index === 1 ? 2.8 : 1.9,
        h: index === 1 ? 1.1 : 2.1,
        rgb: PROFILE.silhouette,
        alpha: 0.72,
        metadata: { encounterIds: module.encounterIds, visualRole: 'tank_silhouette' },
      });
    }
  }
}

function addSupportColumns(scene, shadowGen, def) {
  const undersideY = def.y - (def.h * 0.5);
  if (undersideY <= 0.35) return;
  const supportCount = def.w >= 8 ? 2 : 1;
  const offsets = supportCount === 2 ? [-0.28, 0.28] : [0];
  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index];
    createDecorBox(scene, `${def.name}_support_${index}`, {
      x: def.x + (def.w * offset),
      y: (undersideY - 1.6) * 0.5,
      z: def.z,
      w: 0.7,
      h: Math.max(1.0, undersideY + 1.6),
      d: Math.max(0.9, def.d * 0.22),
      rgb: PROFILE.support,
      shadowGen,
    });
  }
}

function createGlassWallModule(scene, shadowGen, def) {
  const metadata = {
    encounterIds: def.encounterIds,
    visualModuleId: def.id,
    visualModuleType: 'glassWall',
  };
  const root = createDecorRoot(scene, def.id, {
    x: def.x,
    y: def.y,
    z: def.z,
    metadata,
  });
  createDecorBox(scene, `${def.id}_frame_left`, {
    parent: root,
    x: -(def.w * 0.5) + 0.28,
    y: 0,
    z: 0.02,
    w: 0.56,
    h: def.h,
    d: 0.3,
    rgb: PROFILE.glassFrame,
    shadowGen,
    metadata,
  });
  createDecorBox(scene, `${def.id}_frame_right`, {
    parent: root,
    x: (def.w * 0.5) - 0.28,
    y: 0,
    z: 0.02,
    w: 0.56,
    h: def.h,
    d: 0.3,
    rgb: PROFILE.glassFrame,
    shadowGen,
    metadata,
  });
  createDecorBox(scene, `${def.id}_frame_top`, {
    parent: root,
    x: 0,
    y: (def.h * 0.5) - 0.22,
    z: 0.02,
    w: def.w,
    h: 0.44,
    d: 0.3,
    rgb: PROFILE.glassFrame,
    shadowGen,
    metadata,
  });
  createDecorBox(scene, `${def.id}_frame_bottom`, {
    parent: root,
    x: 0,
    y: -(def.h * 0.5) + 0.18,
    z: 0.02,
    w: def.w,
    h: 0.36,
    d: 0.32,
    rgb: PROFILE.glassFrame,
    shadowGen,
    metadata,
  });
  createAlphaPanel(scene, `${def.id}_panel`, {
    parent: root,
    x: 0,
    y: 0,
    z: -0.08,
    w: def.w - 0.92,
    h: def.h - 0.84,
    rgb: PROFILE.glassPanel,
    alpha: def.variant === 'cracked' ? 0.38 : 0.44,
    metadata,
  });
  if (def.variant === 'cracked') {
    for (const [index, slash] of [
      { x: -1.1, y: 0.6, w: 2.4, rotZ: 0.54 },
      { x: 1.2, y: -0.2, w: 1.9, rotZ: -0.42 },
    ].entries()) {
      const crack = createDecorBox(scene, `${def.id}_crack_${index}`, {
        parent: root,
        x: slash.x,
        y: slash.y,
        z: 0.06,
        w: slash.w,
        h: 0.08,
        d: 0.06,
        rgb: PROFILE.railMetal,
        shadowGen,
        metadata,
      });
      crack.rotation.z = slash.rotZ;
    }
  }
}

function createRailingModule(scene, shadowGen, def) {
  const metadata = {
    encounterIds: def.encounterIds,
    visualModuleId: def.id,
    visualModuleType: 'railing',
  };
  const root = createDecorRoot(scene, def.id, {
    x: def.x,
    y: def.y,
    z: def.z,
    metadata,
  });
  for (const ratio of [-0.5, -0.15, 0.2, 0.5]) {
    createDecorBox(scene, `${def.id}_post_${ratio}`, {
      parent: root,
      x: def.length * ratio,
      y: 0.42,
      z: 0,
      w: 0.16,
      h: 0.84,
      d: 0.16,
      rgb: PROFILE.railMetal,
      shadowGen,
      metadata,
    });
  }
  for (const y of [0.26, 0.62]) {
    createDecorBox(scene, `${def.id}_bar_${y}`, {
      parent: root,
      x: 0,
      y,
      z: 0,
      w: def.length,
      h: 0.1,
      d: 0.12,
      rgb: PROFILE.railMetal,
      shadowGen,
      metadata,
    });
  }
}

function createServicePipeModule(scene, shadowGen, def) {
  const metadata = {
    encounterIds: def.encounterIds,
    visualModuleId: def.id,
    visualModuleType: 'servicePipe',
  };
  const root = createDecorRoot(scene, def.id, {
    x: def.x,
    y: def.y,
    z: def.z,
    metadata,
  });
  const verticalOffsets = def.variant === 'tall'
    ? [-0.34, 0.0, 0.34]
    : [-0.26, 0.12, 0.42];
  for (const [index, offset] of verticalOffsets.entries()) {
    createDecorCylinder(scene, `${def.id}_tube_${index}`, {
      parent: root,
      x: def.width * offset,
      y: def.variant === 'tall' ? 0 : -0.18,
      z: 0,
      height: def.height,
      diameter: def.variant === 'tall' ? 0.42 : 0.34,
      rgb: index === 1 ? PROFILE.pipeLight : PROFILE.pipeDark,
      shadowGen,
      metadata,
    });
  }
  for (const [index, y] of [0.0, 0.66].entries()) {
    createDecorCylinder(scene, `${def.id}_cross_${index}`, {
      parent: root,
      x: 0,
      y,
      z: 0.06,
      height: def.width,
      diameter: 0.22,
      rgb: PROFILE.pipeLight,
      shadowGen,
      rotation: { z: Math.PI * 0.5 },
      metadata,
    });
  }
  createDecorBox(scene, `${def.id}_manifold`, {
    parent: root,
    x: 0,
    y: -(def.height * 0.5) + 0.36,
    z: 0.12,
    w: def.width + 0.6,
    h: 0.46,
    d: 0.56,
    rgb: PROFILE.warning,
    shadowGen,
    metadata,
  });
}

function createPumpHeroModule(scene, shadowGen, def) {
  const metadata = {
    encounterIds: def.encounterIds,
    visualModuleId: def.id,
    visualModuleType: 'pumpHero',
  };
  const root = createDecorRoot(scene, def.id, {
    x: def.x,
    y: def.y,
    z: def.z,
    metadata,
  });
  if (def.variant === 'intake_turbine') {
    createDecorCylinder(scene, `${def.id}_drum`, {
      parent: root,
      x: 0,
      y: 0,
      z: 0,
      height: 3.6,
      diameter: 3.0,
      rgb: PROFILE.pumpCore,
      shadowGen,
      rotation: { z: Math.PI * 0.5 },
      metadata,
    });
    for (const x of [-1.0, 1.0]) {
      createDecorBox(scene, `${def.id}_brace_${x}`, {
        parent: root,
        x,
        y: -0.4,
        z: 0,
        w: 0.42,
        h: 2.8,
        d: 1.3,
        rgb: PROFILE.pipeDark,
        shadowGen,
        metadata,
      });
    }
    createDecorBox(scene, `${def.id}_intake_mouth`, {
      parent: root,
      x: 0,
      y: 0,
      z: 0.92,
      w: 4.4,
      h: 1.0,
      d: 0.42,
      rgb: PROFILE.pumpTrim,
      shadowGen,
      metadata,
    });
  } else {
    createDecorBox(scene, `${def.id}_casing`, {
      parent: root,
      x: 0,
      y: 0.5,
      z: 0,
      w: 5.6,
      h: 3.4,
      d: 1.8,
      rgb: PROFILE.pumpCore,
      shadowGen,
      metadata,
    });
    createDecorCylinder(scene, `${def.id}_stack_left`, {
      parent: root,
      x: -1.6,
      y: 1.7,
      z: 0,
      height: 2.4,
      diameter: 0.7,
      rgb: PROFILE.pipeLight,
      shadowGen,
      metadata,
    });
    createDecorCylinder(scene, `${def.id}_stack_right`, {
      parent: root,
      x: 1.6,
      y: 1.7,
      z: 0,
      height: 2.4,
      diameter: 0.7,
      rgb: PROFILE.pipeLight,
      shadowGen,
      metadata,
    });
    createDecorBox(scene, `${def.id}_crown_band`, {
      parent: root,
      x: 0,
      y: 2.2,
      z: 0.22,
      w: 6.1,
      h: 0.42,
      d: 0.5,
      rgb: PROFILE.pumpTrim,
      shadowGen,
      metadata,
    });
  }
}

function buildVisualModules(scene, shadowGen, visualPlan) {
  for (const def of visualPlan.glassWalls) createGlassWallModule(scene, shadowGen, def);
  for (const def of visualPlan.railings) createRailingModule(scene, shadowGen, def);
  for (const def of visualPlan.servicePipes) createServicePipeModule(scene, shadowGen, def);
  for (const def of visualPlan.pumpHeroes) createPumpHeroModule(scene, shadowGen, def);
}

export function buildWorld5AquariumDrift(scene, { animateGoal = true } = {}) {
  const meta = getLevelMeta(5);
  const layout = buildLayout();
  const visualPlan = buildVisualPlan(layout);
  layout.layoutReport.visualKit = visualPlan.report;

  scene.clearColor = new BABYLON.Color4(...PROFILE.clearColor, 1);

  const hemi = new BABYLON.HemisphericLight('level5_aquarium_fillLight', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.92;
  hemi.groundColor = new BABYLON.Color3(0.16, 0.14, 0.12);
  const shadowGen = createShadowLight(scene);

  buildBackdrops(scene, shadowGen, layout, visualPlan);
  buildVisualModules(scene, shadowGen, visualPlan);

  const surfaceVisuals = {};
  const allColliders = [];

  const groundColors = getKindColors(layout.ground.kind);
  const groundVisual = createCardboardPlatform(scene, 'level5_aquarium_ground_visual', {
    x: layout.ground.x,
    y: layout.ground.y,
    z: layout.ground.z,
    w: layout.ground.w,
    h: layout.ground.h,
    d: layout.ground.d,
    slabColor: groundColors.slabColor,
    edgeColor: groundColors.edgeColor,
    shadowGen,
  });
  setRenderingGroup(groundVisual, 2);
  surfaceVisuals.floor = groundVisual;
  surfaceVisuals.ground = groundVisual;
  const groundCollider = createPlatformCollider(scene, layout.ground.name, layout.ground);
  allColliders.push(groundCollider);
  addSupportColumns(scene, shadowGen, layout.ground);

  for (const def of layout.platforms) {
    const colors = getKindColors(def.kind);
    const visual = createCardboardPlatform(scene, `level5_${def.name}`, {
      x: def.x,
      y: def.y,
      z: def.z,
      w: def.w,
      h: def.h,
      d: def.d,
      slabColor: colors.slabColor,
      edgeColor: colors.edgeColor,
      shadowGen,
    });
    setRenderingGroup(visual, 2);
    surfaceVisuals[def.name] = visual;
    allColliders.push(createPlatformCollider(scene, `level5_${def.name}`, def));
    addSupportColumns(scene, shadowGen, def);
  }

  const sign = createWelcomeSign(scene, {
    name: 'level5_theme_sign',
    x: -18.0,
    y: 0.02,
    z: 3.6,
    shadowGen,
    textLines: ['AQUARIUM', 'DRIFT'],
    width: 2.72,
    height: 1.24,
    boardColor: PROFILE.accent,
    postColor: PROFILE.publicEdge,
    boardName: 'level5_theme_sign',
  });
  setRenderingGroup(sign, 2);

  const dad = createDaDa(scene, layout.goal.x, layout.goal.y, shadowGen, { animate: animateGoal });
  setRenderingGroup(dad.root, 3);

  const checkpoints = layout.checkpoints.map((checkpoint) => {
    const marker = createCheckpointMarker(scene, `level5_${checkpoint.id}`, {
      x: checkpoint.x,
      y: checkpoint.topY,
      z: LANE_Z,
      shadowGen,
    });
    setRenderingGroup(marker, 3);
    return {
      index: checkpoint.index,
      id: checkpoint.id,
      label: checkpoint.label,
      radius: 1.35,
      spawn: checkpoint.spawn,
      marker,
    };
  });

  const finalDeck = layout.platforms.find((surface) => surface.name === 'e14_goal_lock') || layout.platforms[layout.platforms.length - 1];

  const level = {
    id: 5,
    runtimeFamily: '2.5d',
    theme: meta.theme,
    themeKey: 'aquarium',
    title: meta.title,
    subtitle: meta.subtitle,
    descriptor: meta.descriptor,
    totalCollectibles: meta.totalCollectibles ?? 0,
    extents: layout.extents,
    spawn: layout.spawn,
    goal: layout.goal,
    ground: layout.ground,
    platforms: layout.platforms,
    encounters: layout.encounters,
    optionalBranches: layout.optionalBranches,
    layoutReport: layout.layoutReport,
    goalPresentation: 'visible_dad',
  };

  return {
    ground: groundCollider,
    groundVisual,
    platforms: allColliders,
    goal: dad.goal,
    goalRoot: dad.root,
    goalPresentation: 'visible_dad',
    goalGuardMinX: 226.5,
    goalMinBottomY: Number((finalDeck.topY - 0.2).toFixed(3)),
    shadowGen,
    foregroundMeshes: [],
    extents: layout.extents,
    spawn: layout.spawn,
    checkpoints,
    pickups: [],
    coins: [],
    hazards: [],
    crumbles: [],
    level,
    signs: [sign],
    respawnAnchors: [],
    surfaceVisuals,
    assetAnchors: {
      cribRail: null,
      toyBlocks: [],
      goalBanner: null,
      backHills: [],
      midHedges: [],
      foregroundCutouts: [],
      treeDecor: [],
      cloudCutouts: [],
    },
    runtimeFamily: '2.5d',
    themeKey: 'aquarium',
  };
}
