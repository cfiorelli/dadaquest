import * as BABYLON from '@babylonjs/core';
import { makePaper, makeFelt } from '../materials.js';

export function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildExtrudedConvexMesh(scene, name, points, thickness) {
  const halfT = Math.max(0.01, thickness * 0.5);
  const positions = [];
  const indices = [];

  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    positions.push(p.x, p.y, halfT);
  }
  const frontCenterIndex = positions.length / 3;
  positions.push(0, 0, halfT);

  const backStart = positions.length / 3;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    positions.push(p.x, p.y, -halfT);
  }
  const backCenterIndex = positions.length / 3;
  positions.push(0, 0, -halfT);

  // Front face fan
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    indices.push(frontCenterIndex, i, next);
  }

  // Back face fan (reversed winding)
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    indices.push(backCenterIndex, backStart + next, backStart + i);
  }

  // Side faces (duplicate vertices for hard edges)
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const p0 = points[i];
    const p1 = points[next];
    const sideBase = positions.length / 3;

    positions.push(p0.x, p0.y, halfT);   // 0
    positions.push(p1.x, p1.y, halfT);   // 1
    positions.push(p0.x, p0.y, -halfT);  // 2
    positions.push(p1.x, p1.y, -halfT);  // 3

    indices.push(sideBase, sideBase + 2, sideBase + 1);
    indices.push(sideBase + 1, sideBase + 2, sideBase + 3);
  }

  const normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);

  const vertexData = new BABYLON.VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;

  const mesh = new BABYLON.Mesh(name, scene);
  vertexData.applyToMesh(mesh);
  mesh.isPickable = false;
  return mesh;
}

function makeIrregularConvexPoints({ seed, pointsCount, width, height, noise }) {
  const rand = seededRandom(seed);
  const count = Math.max(6, Math.floor(pointsCount));
  const points = [];
  const noiseAmp = Math.max(0, Math.min(0.35, noise ?? 0.2));

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const radial = 1 - noiseAmp + rand() * noiseAmp * 2;
    const rx = (width * 0.5) * radial;
    const ry = (height * 0.5) * radial;
    points.push(new BABYLON.Vector2(Math.cos(a) * rx, Math.sin(a) * ry));
  }

  return points;
}

function assignCutoutMaterial(scene, mesh, name, materialKind, color, options = {}) {
  const normalize = (c) => (c > 1 ? c / 255 : c);
  if (materialKind === 'felt') {
    mesh.material = makeFelt(
      scene,
      `${name}_feltMat`,
      normalize(color[0]),
      normalize(color[1]),
      normalize(color[2]),
      {
      roughness: options.roughness ?? 0.97,
      },
    );
  } else {
    mesh.material = makePaper(scene, `${name}_paperMat`, color[0], color[1], color[2], {
      grainScale: options.grainScale ?? 2.4,
      noiseAmt: options.noiseAmt ?? 12,
      roughness: options.roughness ?? 0.96,
    });
  }
}

export function makeCutoutPolygonMesh(scene, {
  name,
  seed = 1,
  pointsCount = 10,
  width = 4,
  height = 2,
  thickness = 0.08,
  x = 0,
  y = 0,
  z = 0,
  materialKind = 'paper',
  color = [220, 210, 190],
  noise = 0.2,
  materialOptions = {},
}) {
  const points = makeIrregularConvexPoints({ seed, pointsCount, width, height, noise });
  const mesh = buildExtrudedConvexMesh(scene, name, points, thickness);
  mesh.position.set(x, y, z);
  assignCutoutMaterial(scene, mesh, name, materialKind, color, materialOptions);
  return mesh;
}

export function makeCloudCutout(scene, {
  name,
  seed = 1,
  width = 3.5,
  height = 1.8,
  thickness = 0.06,
  x = 0,
  y = 0,
  z = 0,
  color = [245, 245, 242],
  alpha = 0.88,
}) {
  const rand = seededRandom(seed);
  const points = [];
  const count = 14;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const lobe = 0.76 + 0.16 * Math.sin(a * 3) + 0.08 * Math.sin(a * 5);
    const noise = 0.92 + rand() * 0.16;
    const radius = lobe * noise;
    const px = Math.cos(a) * width * 0.5 * radius;
    const py = Math.sin(a) * height * 0.5 * radius * 0.8 + height * 0.06;
    points.push(new BABYLON.Vector2(px, py));
  }

  const mesh = buildExtrudedConvexMesh(scene, name, points, thickness);
  mesh.position.set(x, y, z);
  assignCutoutMaterial(scene, mesh, name, 'paper', color, {
    grainScale: 2,
    noiseAmt: 6,
    roughness: 0.97,
  });
  mesh.material.alpha = alpha;
  mesh.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  return mesh;
}
