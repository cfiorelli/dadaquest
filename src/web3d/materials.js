import * as BABYLON from '@babylonjs/core';

// ── Centralized palette for Level 1 ──────────────────────────────
export const LEVEL1_PALETTE = {
  // Scene
  clearColor:   [0.94, 0.91, 0.85, 1.0],
  fogColor:     [0.94, 0.91, 0.85],
  ambientColor: [0.35, 0.32, 0.28],

  // Unified Level 1 palette keys
  backgroundSky:  [0.72, 0.83, 0.93],
  backdropCard:   [230, 225, 215],
  ground:         [200, 185, 155],
  platformCard:   [185, 170, 140],
  edgeDark:       [140, 125, 100],
  feltGreen:      [165, 190, 155],
  accentYellow:   [0.96, 0.78, 0.30],
  accentRed:      [0.92, 0.30, 0.24],
  characterBody:  [1.0, 0.82, 0.65],
  characterAccent:[0.92, 0.92, 0.96],

  // Ground / platforms
  groundTop:    [200, 185, 155],
  groundEdge:   [155, 140, 110],
  platform:     [185, 170, 140],
  platformEdge: [140, 125, 100],

  // Backdrop
  backdrop:     [230, 225, 215],
  sky:          [0.72, 0.83, 0.93],

  // Parallax layers
  bgHills:      [210, 205, 190],
  bgMid:        [165, 190, 155],
  fgCutout:     [180, 170, 140],

  // Decorations
  trunk:        [0.50, 0.38, 0.26],
  foliageBase:  [0.38, 0.58, 0.32],
  cloud:        [1.0, 1.0, 1.0],

  // Characters
  babyBody:     [1.0, 0.82, 0.65],
  babyDiaper:   [0.92, 0.92, 0.96],
  dadBody:      [0.42, 0.72, 0.68],
  dadHead:      [1.0, 0.85, 0.72],
  dadShirt:     [0.92, 0.30, 0.24],
};

// ── Texture cache ────────────────────────────────────────────────
const _texCache = new Map();

/**
 * Generates a paper/cardboard grain DynamicTexture with proper mipmaps.
 */
function grainTexture(scene, key, baseR, baseG, baseB, {
  size = 256,
  noiseAmt = 14,
  uScale = 3,
  vScale = 3,
} = {}) {
  if (_texCache.has(key)) return _texCache.get(key);

  // generateMipMaps = true (4th arg) to prevent banding/aliasing at distance
  const tex = new BABYLON.DynamicTexture(key, size, scene, true);
  const ctx = tex.getContext();

  // Base fill
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, size, size);

  // Grain noise (correlated RGB for natural paper look)
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * noiseAmt;
    d[i]     = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);
  tex.update(/* invertY */ false, /* premulAlpha */ false, /* allowGPUOptimization */ true);

  tex.uScale = uScale;
  tex.vScale = vScale;
  // Trilinear filtering to prevent banding
  tex.updateSamplingMode(BABYLON.Texture.TRILINEAR_SAMPLINGMODE);

  _texCache.set(key, tex);
  return tex;
}

// ── Material factories ───────────────────────────────────────────

/**
 * Matte paper material (PBR). Subtle grain, very rough, no specular.
 */
export function makePaper(scene, name, r, g, b, {
  grainScale = 3,
  roughness = 0.95,
  noiseAmt = 10,
} = {}) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoTexture = grainTexture(scene, name + '_grain', r, g, b, {
    uScale: grainScale, vScale: grainScale, noiseAmt,
  });
  mat.roughness = roughness;
  mat.metallic = 0;
  mat.environmentIntensity = 0.15;
  return mat;
}

/**
 * Cardboard material (PBR). Visible grain, slightly warm sheen.
 */
export function makeCardboard(scene, name, r, g, b, {
  grainScale = 3,
  roughness = 0.85,
  noiseAmt = 18,
} = {}) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoTexture = grainTexture(scene, name + '_grain', r, g, b, {
    uScale: grainScale, vScale: grainScale, noiseAmt,
  });
  mat.roughness = roughness;
  mat.metallic = 0;
  mat.reflectivityColor = new BABYLON.Color3(0.04, 0.04, 0.03);
  mat.environmentIntensity = 0.12;
  return mat;
}

/**
 * Felt material (PBR). Very rough, slightly fuzzy look, flat color.
 */
export function makeFelt(scene, name, r, g, b, {
  roughness = 0.98,
} = {}) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoColor = new BABYLON.Color3(r, g, b);
  mat.roughness = roughness;
  mat.metallic = 0;
  mat.environmentIntensity = 0.1;
  // Subtle sheen for felt-like quality
  mat.sheen.isEnabled = true;
  mat.sheen.intensity = 0.15;
  mat.sheen.color = new BABYLON.Color3(
    Math.min(1, r + 0.1),
    Math.min(1, g + 0.1),
    Math.min(1, b + 0.1),
  );
  return mat;
}

/**
 * Plastic/toy material (PBR). Smooth, slightly reflective.
 */
export function makePlastic(scene, name, r, g, b, {
  roughness = 0.35,
} = {}) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoColor = new BABYLON.Color3(r, g, b);
  mat.roughness = roughness;
  mat.metallic = 0;
  mat.reflectivityColor = new BABYLON.Color3(0.04, 0.04, 0.04);
  mat.environmentIntensity = 0.25;
  mat.clearCoat.isEnabled = true;
  mat.clearCoat.intensity = 0.3;
  mat.clearCoat.roughness = 0.4;
  return mat;
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Creates a blob shadow plane (radial gradient DynamicTexture).
 * Returns a Mesh facing up (billboardMode disabled).
 */
export function createBlobShadow(scene, name, {
  diameter = 1.0,
  opacity = 0.35,
} = {}) {
  const plane = BABYLON.MeshBuilder.CreatePlane(name, { size: diameter }, scene);
  plane.rotation.x = Math.PI / 2; // face up
  plane.bakeCurrentTransformIntoVertices();

  // Radial gradient texture
  const texSize = 64;
  const tex = new BABYLON.DynamicTexture(name + '_tex', texSize, scene, true);
  const ctx = tex.getContext();
  const cx = texSize / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
  grad.addColorStop(0.6, `rgba(0,0,0,${opacity * 0.5})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, texSize, texSize);
  tex.update();
  tex.hasAlpha = true;

  const mat = new BABYLON.StandardMaterial(name + '_mat', scene);
  mat.diffuseTexture = tex;
  mat.opacityTexture = tex;
  mat.specularColor = BABYLON.Color3.Black();
  mat.useAlphaFromDiffuseTexture = true;
  mat.disableLighting = true;
  mat.emissiveColor = BABYLON.Color3.Black();
  plane.material = mat;
  plane.receiveShadows = false;

  return plane;
}
