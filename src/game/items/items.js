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
    stats: {
      weaponCooldown: 0.35,
      weaponProjectileSpeed: 11.5,
      weaponProjectileLife: 1.6,
      weaponStunSec: 1.5,
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
    moveSpeed: 1,
    waterMoveSpeed: 1,
    waterResist: 0,
    weaponCooldown: 0.35,
    weaponProjectileSpeed: 11.5,
    weaponProjectileLife: 1.6,
    weaponStunSec: 1.5,
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
      if (statKey === 'moveSpeed' || statKey === 'waterMoveSpeed' || statKey === 'waterResist') {
        stats[statKey] += statValue;
      } else {
        stats[statKey] = statValue;
      }
    }
  }

  if (stats.oxygenMax <= 0) {
    stats.oxygenRefillRate = 0;
  }

  return stats;
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
