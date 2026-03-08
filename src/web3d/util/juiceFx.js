import * as BABYLON from '@babylonjs/core';

function createRadialTexture(scene, name, stops) {
  const size = 64;
  const tex = new BABYLON.DynamicTexture(name, size, scene, true);
  const ctx = tex.getContext();
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const stop of stops) {
    grad.addColorStop(stop[0], stop[1]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.update();
  tex.hasAlpha = true;
  return tex;
}

function makeBillboardMaterial(scene, name, texture) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseTexture = texture;
  mat.opacityTexture = texture;
  mat.useAlphaFromDiffuseTexture = true;
  mat.specularColor = BABYLON.Color3.Black();
  mat.disableLighting = true;
  mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  return mat;
}

function makeParticleMesh(scene, name, material) {
  const mesh = BABYLON.MeshBuilder.CreatePlane(name, { size: 0.35 }, scene);
  mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.renderingGroupId = 2;
  mesh.setEnabled(false);
  return mesh;
}

const JUMP_DUST_OFFSETS = [
  [-0.20, 0.00],
  [0.20, 0.00],
  [0.00, 0.10],
];

const LAND_DUST_OFFSETS = [
  [-0.30, 0.00],
  [0.30, 0.00],
  [-0.14, 0.12],
  [0.14, 0.12],
];

const SPARKLE_RING = [
  [0.00, 0.00],
  [0.50, 0.10],
  [-0.50, 0.10],
  [0.32, 0.36],
  [-0.32, 0.36],
  [0.00, 0.52],
];
const RIPPLE_OFFSETS = [
  [0, 0],
  [0.18, 0.05],
  [-0.16, 0.03],
];

export class JuiceFx {
  constructor(scene, { enabled = true } = {}) {
    this.scene = scene;
    this.enabled = enabled;
    this.particles = [];

    const dustTex = createRadialTexture(scene, 'dustTex', [
      [0, 'rgba(210,180,135,0.85)'],
      [0.7, 'rgba(180,150,115,0.38)'],
      [1, 'rgba(180,150,115,0)'],
    ]);
    const sparkleTex = createRadialTexture(scene, 'sparkleTex', [
      [0, 'rgba(255,255,240,0.95)'],
      [0.45, 'rgba(255,225,145,0.65)'],
      [1, 'rgba(255,215,130,0)'],
    ]);

    this.dustMat = makeBillboardMaterial(scene, 'dustFxMat', dustTex);
    this.sparkleMat = makeBillboardMaterial(scene, 'sparkleFxMat', sparkleTex);
  }

  _alloc(material, idPrefix) {
    const free = this.particles.find(p => !p.active && p.material === material);
    if (free) return free;
    const mesh = makeParticleMesh(this.scene, `${idPrefix}_${this.particles.length}`, material);
    const particle = {
      mesh,
      material,
      active: false,
      age: 0,
      life: 0.4,
      startScale: 0.3,
      endScale: 0.9,
      vx: 0,
      vy: 0,
      vz: 0,
    };
    this.particles.push(particle);
    return particle;
  }

  _spawn(material, idPrefix, x, y, z, config = {}) {
    if (!this.enabled) return;
    const p = this._alloc(material, idPrefix);
    p.active = true;
    p.age = 0;
    p.life = config.life ?? 0.38;
    p.startScale = config.startScale ?? 0.24;
    p.endScale = config.endScale ?? 0.76;
    p.vx = config.vx ?? 0;
    p.vy = config.vy ?? 0.25;
    p.vz = config.vz ?? 0;
    p.mesh.position.set(x, y, z);
    p.mesh.scaling.set(p.startScale, p.startScale, p.startScale);
    p.mesh.visibility = 1;
    p.mesh.setEnabled(true);
  }

  spawnJumpDust(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < JUMP_DUST_OFFSETS.length; i++) {
      const [ox, oz] = JUMP_DUST_OFFSETS[i];
      this._spawn(this.dustMat, 'jumpDust', pos.x + ox, pos.y - 0.38, pos.z + oz, {
        life: 0.28,
        startScale: 0.18,
        endScale: 0.54,
        vx: ox * 0.6,
        vy: 0.45 + i * 0.05,
      });
    }
  }

  spawnLandDust(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < LAND_DUST_OFFSETS.length; i++) {
      const [ox, oz] = LAND_DUST_OFFSETS[i];
      this._spawn(this.dustMat, 'landDust', pos.x + ox, pos.y - 0.40, pos.z + oz, {
        life: 0.42,
        startScale: 0.20,
        endScale: 0.80,
        vx: ox * 0.55,
        vy: 0.28 + i * 0.02,
      });
    }
  }

  spawnCoinSparkle(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this._spawn(this.sparkleMat, 'coinSpark', pos.x + Math.cos(angle) * 0.18, pos.y + Math.sin(angle) * 0.18, pos.z, {
        life: 0.32,
        startScale: i === 0 ? 0.14 : 0.10,
        endScale: i === 0 ? 0.42 : 0.34,
        vx: Math.cos(angle) * 0.95,
        vy: Math.sin(angle) * 0.72 + 0.34,
      });
    }
    this._spawn(this.sparkleMat, 'coinSparkCenter', pos.x, pos.y + 0.02, pos.z - 0.02, {
      life: 0.24,
      startScale: 0.12,
      endScale: 0.28,
      vy: 0.18,
    });
  }

  spawnPickupSparkle(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < SPARKLE_RING.length; i++) {
      const [ox, oy] = SPARKLE_RING[i];
      this._spawn(this.sparkleMat, 'pickupSparkle', pos.x + ox * 0.6, pos.y + oy * 0.6, pos.z, {
        life: 0.38,
        startScale: 0.12,
        endScale: 0.40,
        vx: ox * 0.5,
        vy: 0.18 + i * 0.03,
      });
    }
    this._spawn(this.sparkleMat, 'pickupSparkleCore', pos.x, pos.y + 0.18, pos.z - 0.02, {
      life: 0.46,
      startScale: 0.18,
      endScale: 0.52,
      vy: 0.12,
    });
  }

  spawnGoalSparkles(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < SPARKLE_RING.length; i++) {
      const [ox, oy] = SPARKLE_RING[i];
      this._spawn(this.sparkleMat, 'goalSparkle', pos.x + ox, pos.y + oy, pos.z - 0.1, {
        life: 0.52,
        startScale: i === 0 ? 0.18 : 0.13,
        endScale: i === 0 ? 0.58 : 0.46,
        vy: 0.10 + i * 0.02,
      });
    }
    for (const offset of [[0.18, 0.68], [-0.18, 0.68], [0, 0.84]]) {
      this._spawn(this.sparkleMat, 'goalSparkleInner', pos.x + offset[0], pos.y + offset[1], pos.z - 0.08, {
        life: 0.44,
        startScale: 0.14,
        endScale: 0.36,
        vy: 0.16,
      });
    }
  }

  spawnSlipRipple(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < RIPPLE_OFFSETS.length; i++) {
      const [ox, oz] = RIPPLE_OFFSETS[i];
      this._spawn(this.dustMat, 'slipRipple', pos.x + ox, pos.y - 0.42, pos.z + oz, {
        life: 0.34,
        startScale: 0.16 + (i * 0.02),
        endScale: 0.62 + (i * 0.08),
        vx: ox * 0.28,
        vy: 0.08,
        vz: oz * 0.25,
      });
    }
  }

  spawnBubbleBurst(pos) {
    if (!this.enabled) return;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this._spawn(this.sparkleMat, 'bubbleBurst', pos.x + Math.cos(angle) * 0.12, pos.y + 0.2, pos.z + Math.sin(angle) * 0.08, {
        life: 0.36,
        startScale: 0.10,
        endScale: 0.42,
        vx: Math.cos(angle) * 0.74,
        vy: 0.22 + (Math.sin(angle) * 0.08),
        vz: Math.sin(angle) * 0.18,
      });
    }
  }

  update(dt) {
    if (!this.enabled) return;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        p.mesh.setEnabled(false);
        continue;
      }
      const t = p.age / p.life;
      const scale = p.startScale + (p.endScale - p.startScale) * t;
      p.mesh.scaling.set(scale, scale, scale);
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.visibility = 1 - t;
    }
  }

  clear() {
    for (const p of this.particles) {
      p.active = false;
      p.mesh.setEnabled(false);
    }
  }
}
