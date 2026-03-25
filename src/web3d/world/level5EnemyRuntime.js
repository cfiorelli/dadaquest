/**
 * Level 5 Enemy Runtime
 *
 * Implements the era5Level interface expected by boot.js:
 *   update(dt, options)
 *   tryHitByWeapon(options)
 *   reset()
 *   getEnemyReport()
 *   getDebugState()
 *
 * B.06: EnemyBase + Level5EnemyRuntime framework
 * B.07: ShockJelly — bobs vertically, no horizontal patrol
 * B.08: ServiceSkaterBot — patrols left/right on a platform
 * B.09: MoraySnapper — lurks at anchor, lunges toward player
 */

import * as BABYLON from '@babylonjs/core';
import { applyEnemyAlphaRenderPolicy } from '../render/renderPolicy.js';

// ─── Color palette (mirrored from PROFILE in builder) ───────────────────────
const C = {
  shockBright: [108, 232, 255],
  shockDim: [76, 122, 148],
  glassPanel: [114, 210, 226],
  pipeDark: [70, 86, 98],
  pipeLight: [108, 130, 146],
  pumpTrim: [72, 168, 196],
  warning: [214, 176, 86],
  silhouette: [18, 40, 48],
  kelpDark: [34, 78, 74],
  kelpLight: [72, 124, 112],
  railMetal: [198, 208, 214],
  serviceGround: [132, 148, 156],
};

function rgb(arr) {
  return new BABYLON.Color3(arr[0] / 255, arr[1] / 255, arr[2] / 255);
}

function alphaMat(scene, name, colorArr, alpha) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = rgb(colorArr);
  mat.emissiveColor = rgb(colorArr).scale(0.3);
  mat.specularColor = BABYLON.Color3.Black();
  mat.alpha = alpha;
  return mat;
}

function opaqueMat(scene, name, colorArr) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = rgb(colorArr);
  mat.emissiveColor = rgb(colorArr).scale(0.12);
  mat.specularColor = BABYLON.Color3.Black();
  return mat;
}

// ─── Base ────────────────────────────────────────────────────────────────────
export class EnemyBase {
  constructor(id, def, scene) {
    this.id = id;
    this.def = def;
    this.scene = scene;
    this.active = true;
    this.hp = def.maxHp ?? 2;
    this.maxHp = def.maxHp ?? 2;
    this.invulnMs = 0;
    this.contactInvulnMs = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.root = null;
    this.encounterId = def.encounterId ?? null;
  }

  // eslint-disable-next-line no-unused-vars
  update(dt, playerPos, options) {}

  intersectsCircle(position, radius) {
    if (!this.active || !this.root) return false;
    const hitRadius = this.def.hitRadius ?? 0.55;
    const dx = position.x - this.root.position.x;
    const dy = position.y - this.root.position.y;
    const combinedR = hitRadius + radius;
    return (dx * dx + dy * dy) < (combinedR * combinedR);
  }

  touchesPlayer(playerPos, halfW = 0.36, halfH = 0.72) {
    if (!this.active || !this.root) return false;
    const hitRadius = this.def.hitRadius ?? 0.55;
    const dx = playerPos.x - this.root.position.x;
    const dy = playerPos.y - this.root.position.y;
    return Math.abs(dx) < (halfW + hitRadius) && Math.abs(dy) < (halfH + hitRadius);
  }

  takeDamage(amount, _direction) {
    if (this.invulnMs > 0 || !this.active) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnMs = 580;
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    this.active = false;
    this.hp = 0;
    if (this.root) this.root.setEnabled(false);
  }

  reset() {
    this.active = true;
    this.hp = this.maxHp;
    this.invulnMs = 0;
    this.contactInvulnMs = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    if (this.root) {
      this.root.setEnabled(true);
      this.root.position.set(this.def.x, this.def.y, this.def.z ?? 0);
    }
  }

  getDebugInfo() {
    return {
      id: this.id,
      type: this.def.type,
      encounterId: this.encounterId,
      hp: this.hp,
      maxHp: this.maxHp,
      state: this.state,
      active: this.active,
      x: Number((this.root?.position.x ?? this.def.x).toFixed(2)),
      y: Number((this.root?.position.y ?? this.def.y).toFixed(2)),
    };
  }
}

// ─── B.07: Shock Jelly ───────────────────────────────────────────────────────
// Translucent jellyfish that bobs vertically. No horizontal patrol.
// Placement: above E5 crosswalk and E9 relay sections.
export class ShockJelly extends EnemyBase {
  constructor(id, def, scene) {
    super(id, { type: 'shock_jelly', hitRadius: 0.52, maxHp: 2, ...def }, scene);
    this.baseY = def.y;
    this.bobAmp = def.bobAmp ?? 0.38;
    this.bobSpeed = def.bobSpeed ?? 1.05; // rad/s
    this.bobTimer = def.bobPhase ?? 0;
    this.root = this._buildVisual(scene, id);
    this.root.position.set(def.x, def.y, def.z ?? 0);
  }

  _buildVisual(scene, id) {
    const root = new BABYLON.TransformNode(`${id}_root`, scene);

    // Bell (body)
    const bell = BABYLON.MeshBuilder.CreateSphere(`${id}_bell`, { diameter: 0.88, segments: 8 }, scene);
    bell.parent = root;
    bell.position.y = 0;
    bell.material = alphaMat(scene, `${id}_bell_mat`, C.shockBright, 0.62);
    applyEnemyAlphaRenderPolicy(bell);

    // Inner glow core
    const core = BABYLON.MeshBuilder.CreateSphere(`${id}_core`, { diameter: 0.46, segments: 6 }, scene);
    core.parent = root;
    core.position.y = 0.04;
    core.material = alphaMat(scene, `${id}_core_mat`, C.glassPanel, 0.82);
    applyEnemyAlphaRenderPolicy(core);

    // Tentacles — 5 thin cylinders hanging below
    for (let ti = 0; ti < 5; ti++) {
      const angle = (ti / 5) * Math.PI * 2;
      const tx = Math.cos(angle) * 0.22;
      const tz = Math.sin(angle) * 0.22;
      const tentLen = 0.28 + (ti % 3) * 0.12;
      const tent = BABYLON.MeshBuilder.CreateCylinder(`${id}_tent_${ti}`, {
        height: tentLen, diameter: 0.06, tessellation: 6,
      }, scene);
      tent.parent = root;
      tent.position.set(tx, -0.44 - tentLen * 0.5, tz);
      tent.material = alphaMat(scene, `${id}_tent_mat_${ti}`, C.shockDim, 0.55);
      applyEnemyAlphaRenderPolicy(tent);
    }

    return root;
  }

  update(dt, _playerPos, _options) {
    this.bobTimer += dt * this.bobSpeed;
    this.root.position.y = this.baseY + Math.sin(this.bobTimer) * this.bobAmp;
    // Gentle spin for visual interest
    this.root.rotation.y += dt * 0.28;
  }

  reset() {
    super.reset();
    this.bobTimer = this.def.bobPhase ?? 0;
  }
}

// ─── B.08: Service Skater Bot ────────────────────────────────────────────────
// Compact maintenance robot that patrols left/right on a platform surface.
// Reverses direction at patrol bounds.
// Placement: E7 spine catwalk, E8 filter drop gallery.
export class ServiceSkaterBot extends EnemyBase {
  constructor(id, def, scene) {
    super(id, { type: 'skater_bot', hitRadius: 0.46, maxHp: 3, ...def }, scene);
    this.patrolMinX = def.patrolMinX ?? def.x - 2.0;
    this.patrolMaxX = def.patrolMaxX ?? def.x + 2.0;
    this.speed = def.speed ?? 1.8;
    this.dir = def.startDir ?? 1;
    this.root = this._buildVisual(scene, id);
    this.root.position.set(def.x, def.y, def.z ?? 0);
  }

  _buildVisual(scene, id) {
    const root = new BABYLON.TransformNode(`${id}_root`, scene);

    // Body chassis
    const body = BABYLON.MeshBuilder.CreateBox(`${id}_body`, { width: 0.66, height: 0.46, depth: 0.42 }, scene);
    body.parent = root;
    body.position.y = 0.24;
    body.material = opaqueMat(scene, `${id}_body_mat`, C.serviceGround);
    applyEnemyAlphaRenderPolicy(body);

    // Trim stripe
    const trim = BABYLON.MeshBuilder.CreateBox(`${id}_trim`, { width: 0.68, height: 0.08, depth: 0.44 }, scene);
    trim.parent = root;
    trim.position.y = 0.38;
    trim.material = opaqueMat(scene, `${id}_trim_mat`, C.pumpTrim);
    applyEnemyAlphaRenderPolicy(trim);

    // Visor eye
    const visor = BABYLON.MeshBuilder.CreateBox(`${id}_visor`, { width: 0.32, height: 0.12, depth: 0.08 }, scene);
    visor.parent = root;
    visor.position.set(0, 0.32, -0.26);
    visor.material = alphaMat(scene, `${id}_visor_mat`, C.shockBright, 0.88);
    applyEnemyAlphaRenderPolicy(visor);

    // Wheels (two pairs)
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        const wheel = BABYLON.MeshBuilder.CreateCylinder(`${id}_wheel_${side}_${end}`, {
          height: 0.08, diameter: 0.26, tessellation: 10,
        }, scene);
        wheel.parent = root;
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(side * 0.38, 0.08, end * 0.14);
        wheel.material = opaqueMat(scene, `${id}_wheel_mat_${side}_${end}`, C.pipeDark);
        applyEnemyAlphaRenderPolicy(wheel);
      }
    }

    return root;
  }

  update(dt, _playerPos, _options) {
    // Patrol
    this.root.position.x += this.dir * this.speed * dt;
    if (this.root.position.x >= this.patrolMaxX) {
      this.root.position.x = this.patrolMaxX;
      this.dir = -1;
    } else if (this.root.position.x <= this.patrolMinX) {
      this.root.position.x = this.patrolMinX;
      this.dir = 1;
    }
    // Face movement direction
    this.root.rotation.y = this.dir > 0 ? 0 : Math.PI;
  }

  reset() {
    super.reset();
    this.dir = this.def.startDir ?? 1;
  }
}

// ─── B.09: Moray Snapper ────────────────────────────────────────────────────
// Anchored eel that lurks at a fixed X, periodically lunges toward player.
// Returns to anchor after lunge. Placement: E8, E9.
const MORAY_LUNGE_DIST = 2.2;  // max lunge distance
const MORAY_LUNGE_SPEED = 5.5;
const MORAY_RETURN_SPEED = 2.2;
const MORAY_LUNGE_COOLDOWN = 2.8; // seconds between lunge attempts
const MORAY_DETECT_RANGE = 3.4;

export class MoraySnapper extends EnemyBase {
  constructor(id, def, scene) {
    super(id, { type: 'moray_snapper', hitRadius: 0.40, maxHp: 3, ...def }, scene);
    this.anchorX = def.x;
    this.anchorY = def.y;
    this.lungeDir = def.lungeDir ?? 1; // 1 = right, -1 = left
    this.cooldownTimer = 0;
    this.root = this._buildVisual(scene, id);
    this.root.position.set(def.x, def.y, def.z ?? 0);
  }

  _buildVisual(scene, id) {
    const root = new BABYLON.TransformNode(`${id}_root`, scene);

    // Eel body — elongated box
    const body = BABYLON.MeshBuilder.CreateBox(`${id}_body`, { width: 1.0, height: 0.26, depth: 0.28 }, scene);
    body.parent = root;
    body.position.set(0.3, 0, 0);  // offset so anchor is at the "mouth" end
    body.material = opaqueMat(scene, `${id}_body_mat`, C.kelpDark);
    applyEnemyAlphaRenderPolicy(body);

    // Head (wider)
    const head = BABYLON.MeshBuilder.CreateBox(`${id}_head`, { width: 0.38, height: 0.34, depth: 0.34 }, scene);
    head.parent = root;
    head.position.set(-0.28, 0.02, 0);
    head.material = opaqueMat(scene, `${id}_head_mat`, C.kelpLight);
    applyEnemyAlphaRenderPolicy(head);

    // Eye
    const eye = BABYLON.MeshBuilder.CreateSphere(`${id}_eye`, { diameter: 0.11, segments: 5 }, scene);
    eye.parent = root;
    eye.position.set(-0.38, 0.10, -0.12);
    eye.material = alphaMat(scene, `${id}_eye_mat`, C.warning, 0.92);
    applyEnemyAlphaRenderPolicy(eye);

    // Tail fin
    const tail = BABYLON.MeshBuilder.CreateBox(`${id}_tail`, { width: 0.24, height: 0.18, depth: 0.2 }, scene);
    tail.parent = root;
    tail.position.set(0.86, 0, 0);
    tail.material = opaqueMat(scene, `${id}_tail_mat`, C.kelpDark);
    applyEnemyAlphaRenderPolicy(tail);

    return root;
  }

  update(dt, playerPos, _options) {
    const px = this.root.position.x;
    const py = this.root.position.y;

    if (this.state === 'idle') {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
      const playerDist = Math.abs(playerPos.x - this.anchorX);
      const playerOnSide = this.lungeDir > 0
        ? playerPos.x > this.anchorX - 0.5
        : playerPos.x < this.anchorX + 0.5;
      if (
        this.cooldownTimer <= 0
        && playerDist < MORAY_DETECT_RANGE
        && playerOnSide
        && Math.abs(playerPos.y - py) < 1.2
      ) {
        this.state = 'lunging';
      }
    } else if (this.state === 'lunging') {
      const lungeTargetX = this.anchorX + this.lungeDir * MORAY_LUNGE_DIST;
      const targetDist = lungeTargetX - px;
      if (Math.abs(targetDist) < 0.08) {
        this.root.position.x = lungeTargetX;
        this.state = 'returning';
      } else {
        this.root.position.x += Math.sign(targetDist) * MORAY_LUNGE_SPEED * dt;
      }
    } else if (this.state === 'returning') {
      const anchorDist = this.anchorX - px;
      if (Math.abs(anchorDist) < 0.08) {
        this.root.position.x = this.anchorX;
        this.state = 'idle';
        this.cooldownTimer = MORAY_LUNGE_COOLDOWN;
      } else {
        this.root.position.x += Math.sign(anchorDist) * MORAY_RETURN_SPEED * dt;
      }
    }

    // Face the lunge direction during lunge, anchor side at rest
    const facingRight = this.state === 'lunging'
      ? this.lungeDir > 0
      : this.lungeDir < 0;  // mouth toward the lunge zone at rest
    this.root.rotation.y = facingRight ? 0 : Math.PI;
  }

  reset() {
    super.reset();
    this.cooldownTimer = 0;
  }
}

// ─── B.10: Saw Ray ───────────────────────────────────────────────────────────
// Elite flat stingray that patrols E10 and periodically surges (rapid burst).
// During a surge it doubles speed for a short window — the skill check is
// whether the player can avoid the larger hitbox at surge speed.
const SAW_RAY_SURGE_COOLDOWN = 4.2;
const SAW_RAY_SURGE_DURATION = 0.9;
const SAW_RAY_SURGE_SPEED_MULT = 2.2;

export class SawRay extends EnemyBase {
  constructor(id, def, scene) {
    super(id, { type: 'saw_ray', hitRadius: 0.78, maxHp: 5, ...def }, scene);
    this.patrolMinX = def.patrolMinX ?? def.x - 8.0;
    this.patrolMaxX = def.patrolMaxX ?? def.x + 8.0;
    this.speed = def.speed ?? 2.2;
    this.dir = def.startDir ?? 1;
    this.surgeTimer = 0;
    this.surgeCooldown = SAW_RAY_SURGE_COOLDOWN * 0.6; // first surge sooner
    this.sawBladeNode = null;
    this.root = this._buildVisual(scene, id);
    this.root.position.set(def.x, def.y, def.z ?? 0);
  }

  _buildVisual(scene, id) {
    const root = new BABYLON.TransformNode(`${id}_root`, scene);

    // Flat disc body (stingray silhouette)
    const body = BABYLON.MeshBuilder.CreateCylinder(`${id}_body`, {
      height: 0.22, diameter: 1.6, tessellation: 6,
    }, scene);
    body.parent = root;
    body.position.y = 0.1;
    body.material = opaqueMat(scene, `${id}_body_mat`, C.pipeDark);
    applyEnemyAlphaRenderPolicy(body);

    // Wing-fin extensions (elongated wing shape)
    for (const side of [-1, 1]) {
      const fin = BABYLON.MeshBuilder.CreateBox(`${id}_fin_${side}`, {
        width: 0.28, height: 0.14, depth: 0.9,
      }, scene);
      fin.parent = root;
      fin.position.set(side * 0.88, 0.1, 0);
      fin.material = opaqueMat(scene, `${id}_fin_mat_${side}`, C.pipeLight);
      applyEnemyAlphaRenderPolicy(fin);
    }

    // Central saw blade (spinning disc)
    const blade = BABYLON.MeshBuilder.CreateCylinder(`${id}_blade`, {
      height: 0.08, diameter: 0.52, tessellation: 8,
    }, scene);
    blade.parent = root;
    blade.position.y = 0.3;
    blade.material = alphaMat(scene, `${id}_blade_mat`, C.warning, 0.92);
    applyEnemyAlphaRenderPolicy(blade);
    this.sawBladeNode = blade;

    // Warning ring (outer glow)
    const ring = BABYLON.MeshBuilder.CreateTorus(`${id}_ring`, {
      diameter: 1.72, thickness: 0.08, tessellation: 20,
    }, scene);
    ring.parent = root;
    ring.position.y = 0.12;
    ring.material = alphaMat(scene, `${id}_ring_mat`, C.shockBright, 0.38);
    applyEnemyAlphaRenderPolicy(ring);

    // Tail
    const tail = BABYLON.MeshBuilder.CreateBox(`${id}_tail`, {
      width: 0.12, height: 0.1, depth: 1.1,
    }, scene);
    tail.parent = root;
    tail.position.set(0, 0.1, 0.78);
    tail.material = opaqueMat(scene, `${id}_tail_mat`, C.pipeDark);
    applyEnemyAlphaRenderPolicy(tail);

    return root;
  }

  update(dt, _playerPos, _options) {
    // Surge cooldown
    if (this.surgeTimer > 0) {
      this.surgeTimer = Math.max(0, this.surgeTimer - dt);
    } else {
      this.surgeCooldown = Math.max(0, this.surgeCooldown - dt);
      if (this.surgeCooldown <= 0) {
        this.state = 'surging';
        this.surgeTimer = SAW_RAY_SURGE_DURATION;
        this.surgeCooldown = SAW_RAY_SURGE_COOLDOWN;
      } else {
        this.state = 'patrol';
      }
    }

    const currentSpeed = this.state === 'surging'
      ? this.speed * SAW_RAY_SURGE_SPEED_MULT
      : this.speed;

    // Patrol
    this.root.position.x += this.dir * currentSpeed * dt;
    if (this.root.position.x >= this.patrolMaxX) {
      this.root.position.x = this.patrolMaxX;
      this.dir = -1;
    } else if (this.root.position.x <= this.patrolMinX) {
      this.root.position.x = this.patrolMinX;
      this.dir = 1;
    }

    // Spin blade faster during surge
    if (this.sawBladeNode) {
      const spinSpeed = this.state === 'surging' ? 6.0 : 2.5;
      this.sawBladeNode.rotation.y += spinSpeed * dt;
    }

    // Face movement direction
    this.root.rotation.y = this.dir > 0 ? 0 : Math.PI;
  }

  reset() {
    super.reset();
    this.surgeTimer = 0;
    this.surgeCooldown = SAW_RAY_SURGE_COOLDOWN * 0.6;
    this.dir = this.def.startDir ?? 1;
    this.state = 'patrol';
  }
}

// ─── Runtime ─────────────────────────────────────────────────────────────────
export class Level5EnemyRuntime {
  /** @param {EnemyBase[]} enemies */
  constructor(enemies = []) {
    this.enemies = enemies;
  }

  update(dt, options) {
    const { pos, player, triggerDamage } = options;
    const { halfW, halfH } = player?.getCollisionHalfExtents?.() ?? { halfW: 0.36, halfH: 0.72 };

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      enemy.invulnMs = Math.max(0, enemy.invulnMs - dt * 1000);
      enemy.contactInvulnMs = Math.max(0, enemy.contactInvulnMs - dt * 1000);
      enemy.update(dt, pos, options);
      if (enemy.contactInvulnMs <= 0 && enemy.touchesPlayer(pos, halfW, halfH)) {
        const knockDir = pos.x <= (enemy.root?.position.x ?? enemy.def.x) ? -1 : 1;
        const hit = triggerDamage(`enemy_${enemy.def.type ?? 'contact'}`, { x: knockDir, z: 0 });
        if (hit) enemy.contactInvulnMs = 1200;
      }
    }
  }

  tryHitByWeapon({ position, radius = 0.3, damage = 1 }) {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (enemy.intersectsCircle(position, radius)) {
        const hit = enemy.takeDamage(damage, null);
        if (hit) {
          return { hit: true, enemyId: enemy.id, hp: enemy.hp, died: enemy.hp <= 0 };
        }
      }
    }
    return { hit: false };
  }

  reset() {
    for (const enemy of this.enemies) enemy.reset();
  }

  getEnemyReport() {
    return {
      count: this.enemies.length,
      active: this.enemies.filter((e) => e.active).length,
      enemies: this.enemies.map((e) => e.getDebugInfo()),
    };
  }

  getDebugState() {
    return { enemies: this.enemies.map((e) => e.getDebugInfo()) };
  }
}
