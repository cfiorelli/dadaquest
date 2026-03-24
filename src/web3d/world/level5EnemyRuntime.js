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
 * Enemy classes extend EnemyBase and are added via the Level 5 builder.
 * BEAD B.06: framework only — no enemy instances yet.
 * BEAD B.07+: each enemy type added as a class here.
 */

export class EnemyBase {
  constructor(id, def, scene) {
    this.id = id;
    this.def = def;
    this.scene = scene;
    this.active = true;
    this.hp = def.maxHp ?? 2;
    this.maxHp = def.maxHp ?? 2;
    this.invulnMs = 0;        // hit invuln after taking damage
    this.contactInvulnMs = 0; // contact invuln — prevents per-frame player damage
    this.state = 'idle';
    this.stateTimer = 0;
    this.root = null;         // BABYLON.TransformNode — set by subclass
    this.encounterId = def.encounterId ?? null;
  }

  /**
   * Per-frame AI update. Override in subclasses.
   * @param {number} dt - delta time in seconds
   * @param {BABYLON.Vector3} playerPos
   * @param {object} options - same options block from boot.js era5Level.update
   */
  // eslint-disable-next-line no-unused-vars
  update(dt, playerPos, options) {}

  /**
   * Check if a circle/sphere at `position` with `radius` intersects this enemy.
   * Used by tryHitByWeapon.
   */
  intersectsCircle(position, radius) {
    if (!this.active || !this.root) return false;
    const hitRadius = this.def.hitRadius ?? 0.55;
    const dx = position.x - this.root.position.x;
    const dy = position.y - this.root.position.y;
    const combinedR = hitRadius + radius;
    return (dx * dx + dy * dy) < (combinedR * combinedR);
  }

  /**
   * Check if the player (at playerPos with approx halfW/halfH) touches this enemy.
   */
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
      type: this.def.type ?? 'unknown',
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

export class Level5EnemyRuntime {
  /** @param {EnemyBase[]} enemies */
  constructor(enemies = []) {
    this.enemies = enemies;
  }

  /**
   * Called every gameplay frame by boot.js.
   * @param {number} dt
   * @param {{ pos, player, triggerDamage, stats }} options
   */
  update(dt, options) {
    const { pos, player, triggerDamage } = options;
    const { halfW, halfH } = player?.getCollisionHalfExtents?.() ?? { halfW: 0.36, halfH: 0.72 };

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      // Decay timers
      enemy.invulnMs = Math.max(0, enemy.invulnMs - dt * 1000);
      enemy.contactInvulnMs = Math.max(0, enemy.contactInvulnMs - dt * 1000);

      // Per-enemy AI
      enemy.update(dt, pos, options);

      // Contact damage — checked after AI update so position is fresh
      if (enemy.contactInvulnMs <= 0 && enemy.touchesPlayer(pos, halfW, halfH)) {
        const knockDir = pos.x <= (enemy.root?.position.x ?? enemy.def.x) ? -1 : 1;
        const hit = triggerDamage(`enemy_${enemy.def.type ?? 'contact'}`, { x: knockDir, z: 0 });
        if (hit) enemy.contactInvulnMs = 1200;
      }
    }
  }

  /**
   * Called by boot.js when a projectile hits something.
   * Returns { hit: boolean, enemyId?: string, hp?: number }
   */
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
    return {
      enemies: this.enemies.map((e) => e.getDebugInfo()),
    };
  }
}
