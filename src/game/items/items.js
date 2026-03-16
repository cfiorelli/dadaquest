const SLOT_IDS = [
  'head',
  'chest',
  'legs',
  'shoes',
  'cape',
  'backpack',
  'charm',
  'weaponPrimary',
  'weaponSecondary',
  'tool',
];

export const ITEM_DEFS = [
  {
    defId: 'scuba_tank',
    name: 'Scuba Tank',
    type: 'tool',
    slot: 'tool',
    rarity: 'starter',
    stats: {
      oxygenMax: 20,
      oxygenRefillRate: 6.5,
      oxygenDrainRate: 1,
      oxygenDamageInterval: 2,
    },
    visualTag: 'scuba',
  },
  {
    defId: 'bubble_wand',
    name: 'Bubble Wand',
    type: 'weapon',
    slot: 'weaponPrimary',
    rarity: 'starter',
    archetype: 'pistol',
    description: 'Accurate single-shot. 3 hits to kill.',
    stats: {
      weaponCooldown: 0.38,
      weaponProjectileSpeed: 12,
      weaponProjectileLife: 1.4,
      weaponStunSec: 1.2,
      weaponDamage: 1,
      weaponImpactStyle: 'puff',
    },
    visualTag: 'bubble',
  },
  {
    defId: 'wetsuit',
    name: 'Wetsuit',
    type: 'armor',
    slot: 'chest',
    rarity: 'starter',
    stats: {
      waterResist: 0.15,
    },
    visualTag: 'wetsuit',
  },
  {
    defId: 'fins',
    name: 'Fins',
    type: 'armor',
    slot: 'shoes',
    rarity: 'starter',
    stats: {
      moveSpeed: 0.12,
      waterMoveSpeed: 0.18,
    },
    visualTag: 'fins',
  },
  {
    defId: 'conveyor_boots',
    name: 'Conveyor Boots',
    type: 'tool',
    slot: 'tool',
    rarity: 'factory',
    stats: {
      beltPushResist: 0.6,
      oilTraction: 0.6,
      moveSpeed: 0.03,
    },
    visualTag: 'factory-boots',
  },
  {
    defId: 'foam_blaster',
    name: 'Foam Blaster',
    type: 'weapon',
    slot: 'weaponPrimary',
    rarity: 'factory',
    archetype: 'smg',
    description: 'Fast fire rate. Short range. 3 hits to kill.',
    stats: {
      weaponCooldown: 0.14,
      weaponProjectileSpeed: 16,
      weaponProjectileLife: 0.9,
      weaponStunSec: 0.7,
      weaponKnockback: 1.45,
      weaponDamage: 1,
      weaponImpactStyle: 'puff',
    },
    visualTag: 'foam',
  },
  {
    defId: 'hard_hat',
    name: 'Hard Hat',
    type: 'armor',
    slot: 'head',
    rarity: 'factory',
    stats: {
      electricResist: 0.2,
    },
    visualTag: 'hard-hat',
  },
  {
    defId: 'tool_belt',
    name: 'Tool Belt',
    type: 'armor',
    slot: 'backpack',
    rarity: 'factory',
    stats: {
      moveSpeed: 0.02,
      inventoryCapacity: 4,
    },
    visualTag: 'tool-belt',
  },
  {
    defId: 'kite_rig',
    name: 'Kite Rig',
    type: 'tool',
    slot: 'tool',
    rarity: 'storm',
    stats: {
      toolMeterMax: 8,
      toolMeterRefillRate: 3.5,
      toolMeterDrainRate: 3.4,
      toolDamageInterval: 2,
      glideMoveSpeed: 1.08,
      glideFallSpeed: 0.34,
      windResist: 0.12,
    },
    visualTag: 'kite-rig',
  },
  {
    defId: 'kite_string_whip',
    name: 'Sock Rocket',
    type: 'weapon',
    slot: 'weaponPrimary',
    rarity: 'storm',
    archetype: 'launcher',
    description: 'Slow heavy projectile. 1 hit kill. Big splash on impact.',
    stats: {
      weaponCooldown: 0.9,
      weaponProjectileSpeed: 8,
      weaponProjectileLife: 2.8,
      weaponStunSec: 0.4,
      weaponKnockback: 1.1,
      weaponDamage: 3,
      weaponSplashRadius: 1.4,
      weaponImpactStyle: 'splash',
    },
    visualTag: 'rocket',
  },
  {
    defId: 'raincoat',
    name: 'Raincoat',
    type: 'armor',
    slot: 'chest',
    rarity: 'storm',
    stats: {
      windResist: 0.2,
    },
    visualTag: 'raincoat',
  },
  {
    defId: 'rubber_boots',
    name: 'Rubber Boots',
    type: 'armor',
    slot: 'shoes',
    rarity: 'storm',
    stats: {
      electricResist: 0.2,
      moveSpeed: 0.03,
    },
    visualTag: 'rubber-boots',
  },
  {
    defId: 'lantern',
    name: 'Lantern',
    type: 'tool',
    slot: 'tool',
    rarity: 'library',
    stats: {
      toolMeterMax: 16,
      toolMeterRefillRate: 4.8,
      toolMeterDrainRate: 1.8,
      toolDamageInterval: 2,
      inkResist: 0.1,
    },
    visualTag: 'lantern',
  },
  {
    defId: 'bookmark_boomerang',
    name: 'Bookmark Boomerang',
    type: 'weapon',
    slot: 'weaponPrimary',
    rarity: 'library',
    archetype: 'bouncer',
    description: 'Returns to player. 2 damage per hit. Punishes at range.',
    stats: {
      weaponCooldown: 0.65,
      weaponProjectileSpeed: 11,
      weaponProjectileLife: 2.2,
      weaponStunSec: 1.4,
      weaponReturnSpeed: 10.5,
      weaponDamage: 2,
      weaponImpactStyle: 'crack',
    },
    visualTag: 'boomerang',
  },
  {
    defId: 'librarian_cloak',
    name: 'Librarian Cloak',
    type: 'armor',
    slot: 'cape',
    rarity: 'library',
    stats: {
      inkResist: 0.25,
    },
    visualTag: 'cloak',
  },
  {
    defId: 'reading_glasses',
    name: 'Reading Glasses',
    type: 'armor',
    slot: 'head',
    rarity: 'library',
    stats: {
      telegraphClarity: 1,
    },
    visualTag: 'glasses',
  },
  {
    defId: 'camp_lantern',
    name: 'Camp Lantern',
    type: 'tool',
    slot: 'tool',
    rarity: 'finale',
    stats: {
      toolMeterMax: 12,
      toolMeterRefillRate: 4.2,
      toolMeterDrainRate: 1.5,
      toolDamageInterval: 2,
      fireResist: 0.15,
    },
    visualTag: 'camp-lantern',
  },
  {
    defId: 'paper_fan',
    name: 'Petal Blaster',
    type: 'weapon',
    slot: 'weaponPrimary',
    rarity: 'finale',
    archetype: 'shotgun',
    description: '4 pellets per shot. Lethal at close range. Each pellet deals 1 damage.',
    stats: {
      weaponCooldown: 0.55,
      weaponProjectileSpeed: 13,
      weaponProjectileLife: 0.5,
      weaponStunSec: 0.6,
      weaponKnockback: 1.2,
      weaponDamage: 1,
      weaponPellets: 4,
      weaponSpreadRad: 0.18,
      weaponImpactStyle: 'puff',
    },
    visualTag: 'fan',
  },
  {
    defId: 'quilted_vest',
    name: 'Quilted Vest',
    type: 'armor',
    slot: 'chest',
    rarity: 'finale',
    stats: {
      fireResist: 0.22,
      shieldMax: 2,
    },
    visualTag: 'vest',
  },
  {
    defId: 'firefly_charm',
    name: 'Firefly Charm',
    type: 'armor',
    slot: 'charm',
    rarity: 'finale',
    stats: {
      moveSpeed: 0.03,
      jumpMultiplier: 0.06,
    },
    visualTag: 'firefly',
  },
];

const ITEM_DEF_MAP = new Map(ITEM_DEFS.map((def) => [def.defId, def]));

const STARTER_ITEMS = [
  { instanceId: 'starter-scuba-tank', defId: 'scuba_tank', level: 1, seed: 501 },
  { instanceId: 'starter-bubble-wand', defId: 'bubble_wand', level: 1, seed: 502 },
  { instanceId: 'starter-wetsuit', defId: 'wetsuit', level: 1, seed: 503 },
  { instanceId: 'starter-fins', defId: 'fins', level: 1, seed: 504 },
];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function emptyEquipped() {
  return SLOT_IDS.reduce((acc, slotId) => {
    acc[slotId] = null;
    return acc;
  }, {});
}

export function getItemDef(defId) {
  return ITEM_DEF_MAP.get(defId) || null;
}

export function getItemSlots() {
  return [...SLOT_IDS];
}

export function getStarterEra5Inventory() {
  return STARTER_ITEMS.map((item) => ({ ...item }));
}

export function createEra5ItemInstance(defId, seed = Date.now()) {
  const def = getItemDef(defId);
  if (!def) return null;
  const normalizedSeed = Number.isFinite(seed) ? Math.max(1, Math.floor(seed)) : 1;
  return {
    instanceId: `${defId}:${normalizedSeed}`,
    defId,
    level: 1,
    seed: normalizedSeed,
  };
}

export function normalizeItemInstance(raw) {
  if (!isObject(raw)) return null;
  const defId = typeof raw.defId === 'string' ? raw.defId : '';
  const def = getItemDef(defId);
  if (!def) return null;
  const instanceId = typeof raw.instanceId === 'string' && raw.instanceId
    ? raw.instanceId
    : `${defId}:${Number.isFinite(raw.seed) ? raw.seed : 1}`;
  return {
    instanceId,
    defId,
    level: Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1,
    seed: Number.isFinite(raw.seed) ? Math.floor(raw.seed) : 1,
  };
}

function autoEquipAvailableItems(inventory, equipped) {
  const nextEquipped = { ...equipped };
  for (const slotId of SLOT_IDS) {
    const current = nextEquipped[slotId];
    if (current && inventory.some((item) => item.instanceId === current)) continue;
    const candidate = inventory.find((item) => getItemDef(item.defId)?.slot === slotId);
    nextEquipped[slotId] = candidate?.instanceId || null;
  }
  return nextEquipped;
}

export function deriveEra5Stats(era5State) {
  const stats = {
    hpMax: 3,
    shieldMax: 1,
    oxygenMax: 0,
    oxygenRefillRate: 5.5,
    oxygenDrainRate: 1,
    oxygenDamageInterval: 2,
    toolMeterMax: 0,
    toolMeterRefillRate: 0,
    toolMeterDrainRate: 1,
    toolDamageInterval: 2,
    moveSpeed: 1,
    waterMoveSpeed: 1,
    jumpMultiplier: 1,
    gravityScale: 1,
    glideMoveSpeed: 1,
    glideFallSpeed: 1,
    waterResist: 0,
    electricResist: 0,
    windResist: 0,
    inkResist: 0,
    fireResist: 0,
    beltPushResist: 0,
    oilTraction: 0,
    telegraphClarity: 0,
    inventoryCapacity: 0,
    weaponCooldown: 0.35,
    weaponProjectileSpeed: 11.5,
    weaponProjectileLife: 1.6,
    weaponStunSec: 1.5,
    weaponKnockback: 1,
    weaponArcRange: 0,
    weaponReturnSpeed: 0,
    weaponDamage: 1,
    weaponPellets: 1,
    weaponSpreadRad: 0,
    weaponSplashRadius: 0,
  };

  const inventory = Array.isArray(era5State?.inventory) ? era5State.inventory : [];
  const equipped = isObject(era5State?.equipped) ? era5State.equipped : emptyEquipped();

  for (const slotId of SLOT_IDS) {
    const instanceId = equipped[slotId];
    if (!instanceId) continue;
    const instance = inventory.find((item) => item.instanceId === instanceId);
    const def = getItemDef(instance?.defId);
    if (!def || !isObject(def.stats)) continue;
    for (const [statKey, statValue] of Object.entries(def.stats)) {
      if (!Number.isFinite(statValue)) continue;
      if (
        statKey === 'moveSpeed'
        || statKey === 'waterMoveSpeed'
        || statKey === 'jumpMultiplier'
        || statKey === 'gravityScale'
        || statKey === 'glideMoveSpeed'
        || statKey === 'glideFallSpeed'
        || statKey === 'waterResist'
        || statKey === 'electricResist'
        || statKey === 'windResist'
        || statKey === 'inkResist'
        || statKey === 'fireResist'
        || statKey === 'beltPushResist'
        || statKey === 'oilTraction'
        || statKey === 'telegraphClarity'
        || statKey === 'inventoryCapacity'
      ) {
        stats[statKey] += statValue;
      } else {
        stats[statKey] = statValue;
      }
    }
  }

  if (stats.oxygenMax <= 0) {
    stats.oxygenRefillRate = 0;
  }
  if (stats.toolMeterMax <= 0) {
    stats.toolMeterRefillRate = 0;
  }
  stats.waterResist = Math.min(0.4, stats.waterResist);
  stats.electricResist = Math.min(0.4, stats.electricResist);
  stats.windResist = Math.min(0.4, stats.windResist);
  stats.inkResist = Math.min(0.4, stats.inkResist);
  stats.fireResist = Math.min(0.4, stats.fireResist);
  stats.beltPushResist = Math.min(0.9, stats.beltPushResist);
  stats.oilTraction = Math.min(0.9, stats.oilTraction);

  return stats;
}

export function addItemToEra5State(era5State, defId, {
  seed = Date.now(),
  instanceId = '',
  level = 1,
  autoEquip = true,
} = {}) {
  const def = getItemDef(defId);
  if (!def) {
    return { state: normalizeEra5State(era5State, { unlocked: !!era5State?.unlocked }), added: false, instance: null };
  }

  const normalized = normalizeEra5State(era5State, { unlocked: !!era5State?.unlocked });
  const existing = normalized.inventory.find((item) => item.defId === defId);
  if (existing) {
    if (autoEquip && def.slot) {
      normalized.equipped[def.slot] = existing.instanceId;
      normalized.stats = deriveEra5Stats(normalized);
    }
    return { state: normalized, added: false, instance: existing };
  }

  const nextInstance = normalizeItemInstance({
    instanceId: instanceId || `${defId}:${Math.max(1, Math.floor(seed || 1))}`,
    defId,
    level,
    seed,
  });
  if (!nextInstance) {
    return { state: normalized, added: false, instance: null };
  }

  normalized.inventory.push(nextInstance);
  if (autoEquip && def.slot) {
    normalized.equipped[def.slot] = nextInstance.instanceId;
  }
  normalized.stats = deriveEra5Stats(normalized);
  return { state: normalized, added: true, instance: nextInstance };
}

export function normalizeEra5State(rawEra5, { unlocked = false } = {}) {
  const raw = isObject(rawEra5) ? rawEra5 : {};
  const inventorySource = Array.isArray(raw.inventory) ? raw.inventory : [];
  let inventory = inventorySource
    .map(normalizeItemInstance)
    .filter(Boolean);

  if (unlocked && inventory.length === 0) {
    inventory = getStarterEra5Inventory();
  }

  const equipped = emptyEquipped();
  const rawEquipped = isObject(raw.equipped) ? raw.equipped : {};
  for (const slotId of SLOT_IDS) {
    const instanceId = typeof rawEquipped[slotId] === 'string' ? rawEquipped[slotId] : null;
    const instance = inventory.find((item) => item.instanceId === instanceId);
    const def = getItemDef(instance?.defId);
    equipped[slotId] = def?.slot === slotId ? instanceId : null;
  }

  const normalized = {
    unlocked: !!(raw.unlocked || unlocked),
    inventory,
    equipped: autoEquipAvailableItems(inventory, equipped),
    stats: {},
    currency: Number.isFinite(raw.currency) ? Math.max(0, Math.floor(raw.currency)) : 0,
  };
  normalized.stats = deriveEra5Stats(normalized);
  return normalized;
}
