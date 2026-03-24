# Era5 Systems Migration Map

**Status:** All systems already on `main`. No code migration required.
**Blocker:** `isEra5Level` is gated to `runtimeFamily === 'era5'`; all current levels use `'2.5d'`.

---

## System Inventory

| System | File | Status on main | Action |
|--------|------|----------------|--------|
| Weapons (def, firing, mesh) | `src/web3d/boot.js` ~3140–3434 | PRESENT | None |
| Projectiles (spawn, physics, collision) | `src/web3d/boot.js` ~3702–4058 | PRESENT | None |
| Damage model (shield-first, knockback, invul) | `src/web3d/boot.js` ~3808–3920 | PRESENT | None |
| Health / Shield / Oxygen state | `src/web3d/boot.js` ~2613–2629 | PRESENT | None |
| Item definitions (18 items, 10 slots) | `src/game/items/items.js` | PRESENT | None |
| Item equipping / slot management | `src/web3d/boot.js` ~3434–3481 | PRESENT | None |
| Inventory UI (overlay, slot cards) | `src/web3d/ui/ui.js` ~1207–2800 | PRESENT | None |
| Era5 HUD (hearts, shields, weapon strip, compass) | `src/web3d/ui/ui.js` | PRESENT | None |
| Progression / unlock state | `src/web3d/util/progression.js` | PRESENT | None |
| Tools & meters (scuba, kite, lantern) | `src/web3d/boot.js` ~3140–3570 | PRESENT | None |
| Oxygen hazard system | `src/web3d/boot.js` ~4140–4220 | PRESENT | None |

---

## Activation Blocker

`isEra5Level = runtimeFamily === 'era5'` (boot.js:1081)

This single boolean gates:
- Era5 HUD display (`showGameplayHud`, `era5HudEl`)
- F key → weapon fire (vs airflip for non-era5)
- E key → tool/interact
- I key → inventory open
- Click → weapon fire
- Weapon slot switching (1–5 keys)
- Tool motion prep (oxygen drain, kite glide)

**NOT** gated by `isEra5Level`:
- Movement mode (`'lane'` for 2.5D — must stay `'lane'` on Level 5)
- Air flip on Space — fixed in BEAD A.02 (`levelId >= 5`)

---

## Activation Plan (BEAD A.04)

Introduce: `const hasEra5Systems = isEra5Level || levelId >= 5;`

Re-gate all combat/weapon/HUD/inventory code to `hasEra5Systems`.
Keep movement-mode code on `isEra5Level` (stays false — movement stays `'lane'`).

### Lines that need `isEra5Level` → `hasEra5Systems`:

| boot.js section | Code | Change |
|-----------------|------|--------|
| F key handler | `if (isEra5Level) return fireEra5Weapon()` | → `hasEra5Systems` |
| G key handler | `if (isEra5Level)` useWindGlide | stays `isEra5Level` (wind glide not available yet) |
| E key handler | `if (isEra5Level)` interact/tool | → `hasEra5Systems` |
| I key handler | `if (isEra5Level)` inventory | → `hasEra5Systems` |
| Click handler | `fireEra5Weapon()` gate | → `hasEra5Systems` |
| Weapon slot switch | `if (isEra5Level && ...)` | → `hasEra5Systems` |
| Tool motion prep | `if (isEra5Level)` | → `hasEra5Systems` |
| HUD call | `{ era5: isEra5Level }` in showGameplayHud | → `hasEra5Systems` |

### Lines that KEEP `isEra5Level` (movement only):

| boot.js section | Code |
|-----------------|------|
| Float move Y | `floatMoveY: isEra5Level ? era5FloatMoveY : rawMoveY` |
| Movement mode | `movementMode: isEra5Level ? 'free' : 'lane'` |
| Facing yaw | `facingYaw: isEra5Level ? era5PlayerYaw : null` |
| Camera/yaw logic | all era5 camera recenter code |

---

## Default Spawn Loadout

`getStarterEra5Inventory()` in `items.js` returns:
- `scuba_tank` (tool slot) — oxygen drain in water
- `bubble_wand` (weaponPrimary slot) — starting weapon

`normalizeEra5State()` + `autoEquipAvailableItems()` — called at level boot.
Player starts with 3 HP, 1 shield (base), full oxygen, bubble_wand equipped.

---

## Pickup Contract (BEAD A.05)

Heart pickups, shield refills, weapon/item pickups — these are BEAD A.05 scope.
Item drop trigger: `addItemToEra5State()` in `items.js`. HUD notification: `ui.showStatus()`.
