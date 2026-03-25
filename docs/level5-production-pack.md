# Level 5 — Aquarium Drift: Production Pack

**Status as of BEAD B.12** — all hazard families, enemies, pickups implemented

---

## Identity

- Theme: Aquarium Drift
- Runtime family: 2.5d
- Era5 systems: active (weapons, hearts, shield, inventory, oxygen)
- World extents: x=-28 to x=248 (276 units)
- Vertical range: topY 0.55 → 5.15 (5-act climb, ~4.6 units vertical)
- Spawn: x=-22.5, y=0.955 (ground topY=0.55)
- Goal: x=242.2, y=6.07 (e14_goal_lock topY=5.95)

---

## Encounter Map (14 mainline, 2 optional branches)

| ID | Act | xMin | xMax | topY range | Name | Hazard family |
|----|-----|------|------|------------|------|---------------|
| L5-E1  | 1 | -24 | -8  | 0.55–0.95 | Ticket Hall Drip Apron     | slick deck ✓ |
| L5-E2  | 1 | -8  | 10  | 0.75–1.35 | Voltage Mop Walk           | electrified puddles ✓ |
| L5-E3  | 1 | 10  | 34  | 1.15–1.75 | Stingrail Jet Bridge       | current jets ✓ |
| L5-E4  | 2 | 36  | 52  | 1.35–2.15 | Cracked Panorama Gallery   | current jets + puddles ✓ |
| L5-E5  | 2 | 52  | 66  | 1.25–1.85 | Eel Grate Crosswalk        | electrified puddles + Shock Jelly ✓ |
| L5-E6  | 2 | 66  | 82  | 2.15–2.45 | Rotunda Spray Bridge       | rotating spray bars ✓ |
| L5-E7  | 3 | 88  | 104 | 2.25      | Drainage Spine Catwalk     | Service Skater Bot ✓ |
| L5-E8  | 3 | 104 | 120 | 2.75      | Filter Drop Gallery        | Skater Bot + Moray Snapper ✓ |
| L5-E9  | 3 | 120 | 138 | 1.25      | Wet Relay Gantry           | Shock Jelly + Moray Snapper ✓ |
| L5-E10 | 4 | 154 | 174 | 3.15      | Saw Ray Intake Chamber     | Saw Ray elite ✓ |
| L5-E11 | 4 | 174 | 194 | 2.85      | Pump Crown Bypass          | (none — layered platforms) |
| L5-E12 | 5 | 194 | 208 | 4.25      | Exterior Crown Rail        | (none — exposed verticals) |
| L5-E13 | 5 | 208 | 220 | 4.75      | Cracked Glass Traverse     | crumbling glass tiles ✓ |
| L5-E14 | 5 | 220 | 244 | 5.15      | Overflow Crown Run         | finale mastery chain |

**Optional branches:**

| ID | Act | xMin | xMax | topY | Name |
|----|-----|------|------|------|------|
| L5-OB1 | 3 | 112 | 126 | 0.55 | Quarantine Pipe Loop (lower shortcut) |
| L5-OB2 | 5 | 212 | 228 | 5.55 | Skylight Service Loop (exposed upper) |

---

## Checkpoint Map

| ID | X | topY | Label |
|----|---|------|-------|
| CP1 | 36.5  | 1.85 | Ticketing Service Door |
| CP2 | 84.5  | 2.85 | Rotunda Locker Rail |
| CP3 | 151.5 | 3.05 | Relay Tool Cage |
| CP4 | 191.5 | 4.05 | Upper Filter Lock |

---

## Hazard Family Ownership

### Slick deck (E1–E2)
| ID | Encounter | xMin | xMax | topY | Severity | accelMult | decelMult |
|----|-----------|------|------|------|----------|-----------|-----------|
| L5-SLICK-01 | L5-E1 | -23.4 | -20.2 | 0.55 | low    | 0.64 | 0.16 |
| L5-SLICK-02 | L5-E2 | e2_floor | bounds | 0.75 | medium | 0.58 | 0.14 |
| L5-SLICK-03 | L5-E2 | e2_floor | bounds | 0.75 | medium | 0.54 | 0.12 |

### Current jets (E3–E4)
| ID | Encounter | xMin | xMax | topY | forceX | activeMs | safeMs | phaseMs |
|----|-----------|------|------|------|--------|----------|--------|---------|
| L5-JET-01 | L5-E3 | 19.1 | 22.8 | 1.15 | -58 | 1200 | 1000 | 0 |
| L5-JET-02 | L5-E3 | 28.0 | 33.4 | 1.15 | -62 | 1200 | 1000 | 680 |
| L5-JET-03 | L5-E4 | 46.2 | 49.2 | 2.15 | -56 | 1200 | 1000 | 340 |
| L5-JET-04 | L5-E4 | 51.0 | 55.6 | 2.85 | -52 | 1200 | 1000 | 1080 |

### Electrified puddles (E2, E4–E5)
| ID | Encounter | xMin | xMax | topY | phaseMs | warnMs | activeMs | safeMs |
|----|-----------|------|------|------|---------|--------|----------|--------|
| L5-PUD-01 | L5-E4 | 43.95 | 44.2  | 2.15 | 0    | 540 | 1400 | 2200 |
| L5-PUD-02 | L5-E4 | 46.8  | 48.2  | 2.15 | 760  | 580 | 1400 | 2200 |
| L5-PUD-03 | L5-E4 | 51.9  | 53.1  | 2.85 | 1560 | 620 | 1400 | 2200 |
| L5-PUD-04 | L5-E5 | 61.2  | 61.7  | 1.55 | 420  | 600 | 1400 | 2200 |
| L5-PUD-05 | L5-E5 | 65.35 | 67.45 | 1.55 | 1180 | 640 | 1400 | 2200 |

### Rotating spray bars (E6)
| ID | Encounter | pivotX | pivotY | barLength | hitRadius | rotationSpeedRad | startAngleRad |
|----|-----------|--------|--------|-----------|-----------|------------------|---------------|
| L5-SPRAY-01 | L5-E6 | 75.0 | 2.83 | 1.85 | 0.40 | 0.88 | 0 |
| L5-SPRAY-02 | L5-E6 | 78.2 | 2.83 | 1.85 | 0.40 | 0.88 | 2.26 |

### Crumbling glass tiles (E13)
| ID | Encounter | x | y | w | h | d |
|----|-----------|---|---|---|---|---|
| e13_glass_a_tile1 | L5-E13 | 209.0 | 4.39 | 2.0 | 0.72 | 2.0 |
| e13_glass_a_tile2 | L5-E13 | 211.0 | 4.39 | 2.0 | 0.72 | 2.0 |
| e13_glass_a_tile3 | L5-E13 | 213.0 | 4.39 | 2.0 | 0.72 | 2.0 |
| e13_glass_b_tile1 | L5-E13 | 217.0 | 4.69 | 2.0 | 0.72 | 2.0 |
| e13_glass_b_tile2 | L5-E13 | 219.0 | 4.69 | 2.0 | 0.72 | 2.0 |

---

## Enemy Slots

| ID | Encounter | Enemy | HP | Notes |
|----|-----------|-------|----|-------|
| jelly_e5_a | L5-E5 | Shock Jelly | 2 | bobs above crosswalk x=57.0, y=2.82 |
| jelly_e5_b | L5-E5 | Shock Jelly | 2 | bobs above side shelf x=64.8, y=2.65 |
| bot_e7_a | L5-E7 | Service Skater Bot | 3 | patrols 89.5–95.0 |
| bot_e7_b | L5-E7 | Service Skater Bot | 3 | patrols 95.0–101.0 |
| bot_e8_a | L5-E8 | Service Skater Bot | 3 | patrols 104.5–109.5 |
| moray_e8_a | L5-E8 | Moray Snapper | 3 | anchored x=113.5, lunges left |
| jelly_e9_a | L5-E9 | Shock Jelly | 2 | bobs above relay low x=127.5, y=2.52 |
| jelly_e9_b | L5-E9 | Shock Jelly | 2 | bobs above relay mid x=138.2, y=3.32 |
| moray_e9_a | L5-E9 | Moray Snapper | 3 | anchored x=136.0, lunges left |
| saw_ray_e10 | L5-E10 | Saw Ray (elite) | 5 | patrols 155–173, surges every 4.2s |

---

## Pickup / Reward Slots

| Type | x | y | Encounter | Teaching |
|------|---|---|-----------|---------|
| heart | -20.0 | 1.40 | E1 spawn area | Recovery exists |
| item: foam_blaster | -13.5 | 1.78 | E1 compare strip | Glass upper route rewards |
| item: hard_hat | 21.0 | 2.58 | E3 bridge high | Optional bridge route rewards |
| heart | 68.5 | 2.61 | E5 exit | Survive the grate zone |
| heart | 100.5 | 3.31 | E7 exit | Survive spine catwalk |
| shield | 151.5 | 3.41 | pre-E10 (CP3) | Before Saw Ray chamber |
| heart | 176.5 | 3.21 | post-E10 | Saw Ray evasion/defeat reward |
| shield | 203.5 | 4.81 | E12 crown | Before crumbling glass gauntlet |

---

## Hazard Families NOT YET IMPLEMENTED

All planned hazard families are now implemented. Remaining items:

- B.13: Ship gate (goal presentation / level completion gate)
- Not proven yet in live view: all enemy placements, spray bar feel, crumble tile collision registration

---

## Proof Camera List

| Shot | Description |
|------|-------------|
| spawn_wide | Spawn at x=-22.5 looking right toward E1 |
| e1_route_mid | E1 compare strip challenge |
| e2_route_mid | E2 voltage puddle lane choice |
| e3_route_mid | E3 current jet bridge |
| landmark_close | Glass entry portal background |
| e4_route_mid | E4 gallery overlook |
| cp1 | CP1 Ticketing Service Door |
| cp2 | CP2 Rotunda |
| finale | E14 Overflow Crown Run toward goal |

---

## Builder

`src/web3d/world/buildWorld5AquariumDrift.js` — primary builder
`src/web3d/world/buildWorld5Plus2d.js` — delegating entry point
`src/web3d/world/level5EnemyRuntime.js` — enemy classes and runtime
