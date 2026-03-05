# Level 1 Design Spec — Da Da Quest

## Goal
The player (a baby) must reach DaDa, standing on the rooftop platform at the far-right
of the diorama. DaDa bobs and waves to signal the destination.

---

## 3 Beats

### Beat 1 — Tutorial (x: -20 → 5, ~10–20 s)
**Objective:** Learn to walk and jump. Collect first coins.

- **platStart** (-14.2): safe wide landing area with toy blocks nearby
- **platHop** (-8.1): a short upward hop — teaches jumping
- **platVert1** (-2.1): another step up — confirms jump timing
- **First checkpoint:** at platVert1 (~-2, beat 1 end / beat 2 start)
- **Coins:** 6 coins placed in gentle arcs along this stretch
- **Signpost:** arrow sign at -10.6 pointing right
- No hazards, no danger of falling (ground catches the player)

### Beat 2 — Challenge (x: 5 → 22, ~30–60 s)
**Objective:** Navigate risk — collect onesie buff, cross slip zone, avoid crumble.

- **platBuff** (7.0): onesie buff pickup on top — incentive to step here
- **platBridge** (11.2): narrow bridge leading to the midway checkpoint
- **Midway checkpoint** at (12.8, 5.1) — unlocks midway respawn
- **platSlipRun** (17.2): slip hazard zone — lower friction, easy to overshoot
  - Telegraphed by blue puddle decal visible from platBridge
- **Crumble platform** at the end of platSlipRun — shakes after step, falls after 0.6s
  - First instance: safe context (wide landing on platStepUp nearby)
- **Coins:** 4 coins here, including 1 risky coin above the slip zone
- **Signpost:** arrow sign at 0.6 pointing right

### Beat 3 — Victory (x: 22 → 33, ~10–20 s)
**Objective:** Final climb to DaDa.

- **platStepUp** (23.1): clear upward step
- **platRoof** (28.4): wide final platform — DaDa waits here
- **DaDa goal trigger:** extended trigger box — easy to activate
- **Coins:** 2 coins as "reward trail" up to the goal
- **Signpost:** arrow sign at 20.8 pointing right
- **Goal banner** visible from afar as a destination landmark
- **Win celebration:** camera pan to DaDa, sparkles, fanfare, end screen

---

## Mechanics (all active in Level 1)

| Mechanic | Status | Notes |
|---|---|---|
| Walk (A/D, ←/→) | Active | Ground accel 60, max speed 8 |
| Jump (Space) | Active | JUMP_VEL=14, coyote 100ms, buffer 100ms |
| Jump cut | Active | Release early → 40% vy remain |
| Coyote time | Active | 100ms window after leaving edge |
| Jump buffer | Active | 100ms pre-press buffer |
| Respawn / reset | Active | Fade 0.16s out, 0.22s in |
| Checkpoints | Active | 2 total (Start implicit + Midway) |
| Onesie buff | Active | +24% jump vel for 10s |
| Slip zone | Active | Lower accel/decel on ice-like surface |
| Crumble platform | Active | Falls 0.6s after first step, respawns 2.5s |
| Coin collection | Active | 12 coins, counter shown in HUD |
| Out-of-bounds reset | Active | Falls off world → respawn at last checkpoint |

---

## Hazards — Telegraphing

### Slip Zone (platSlipRun, x≈17.2)
- **Visual:** blue/teal puddle disc visible from approaching platform
- **Audio:** no special sound (movement feels different)
- **Effect:** `accelMultiplier=0.75`, `decelMultiplier=0.22` — hard to stop
- **Recovery:** Wide platform — player slides to a stop or falls; checkpoint not far

### Crumble Platform (between platSlipRun and platStepUp)
- **Visual:** cracked texture on top (lighter edge color) + subtle wobble when stepped on
- **Audio:** low rumble sound when shaking (0.4s), clunk on fall
- **Effect:** Collider disabled after 0.6s — player falls through
- **Recovery:** platStepUp is wide and directly below/adjacent; Midway checkpoint

---

## Items — Communication + Expiry

### Onesie Buff
- **Visual:** White plush onesie pickup prop, bobs slightly when not in shot mode
- **Collection:** Player overlaps 0.95 radius → pickup disappears, pop text shows
- **HUD:** Small onesie icon + countdown bar in bottom-left during buff
- **Expire:** Bar drains to zero → buff removes → status text "Onesie boost faded"

### Coin
- **Visual:** Small yellow star-like disc, slight glow
- **Collection:** Player overlaps 0.45 radius → coin disappears, sparkle, +1 counter
- **HUD:** ✦ count / total in top-left during gameplay
- **Completion:** All coins collected → brief "Nice!" pop text

---

## Checkpoints

| Index | Label | Position | Rationale |
|---|---|---|---|
| 0 | Start | (-15.2, 1.205) | Spawn position, always unlocked |
| 1 | Midway | (12.8, 5.1) | Between beats 1 and 2; mid-run safety net |

---

## Win Condition and Reset Rules

**Win:** Player enters `goalTrigger` volume (3×7×3 box centered on DaDa)
- Triggers `startGoalCelebration()`:
  1. Audio: win jingle
  2. Camera: smooth pan toward DaDa
  3. Sparkles around DaDa
  4. Pop text: "Da Da!"
  5. `finishRun()` → show end screen

**Reset (fall/hazard):**
1. `triggerReset()` called → player gets knockback + invuln
2. Fade out (0.16s) → respawn at last checkpoint → fade in (0.22s)
3. All pickups + crumble platforms stay in their current state

**Restart (Play Again):**
1. All state resets: coins uncollected, buff cleared, checkpoints back to 0
2. Player teleports to spawn
3. Camera returns to start position
4. Crumble platforms respawn

---

## Camera Rules

- **Type:** `BABYLON.FreeCamera`, game-controlled (no user input)
- **Follow X:** Smoothly tracks player X, clamped to `[worldExtents.minX+3.2, worldExtents.maxX-2.6]`
- **Follow Y:** Smoothly tracks player Y (smaller weight)
- **Start:** `(-18, 7, -14)` looking at `(-12, 2, 0)`
- **Angle:** Fixed perspective from front-left, looking right and slightly down
- **Occlusion fade:** Foreground meshes fade to 25% alpha when they occlude the player
- **Goal celebration:** Camera pans toward DaDa over `GOAL_CELEBRATION_SEC=0.48s`
- **Framing:** Player is horizontally centered when walking; camera leads slightly

---

## Out-of-Bounds Rule
World extents: `minX=-20, maxX=33`. Player below Y=-2 or outside X bounds → respawn.
