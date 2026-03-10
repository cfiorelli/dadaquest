# Era 5 Corrective Pass — Spec
Date: 2026-03-09

## Goal
Fix three root-cause failures in Era 5 (Levels 5–9):
1. Camera spring/lag: turns feel rubbery, settle time too long
2. Player facing: character face looks at camera instead of away from it
3. Level layouts: all 5 levels share an identical straight-runway template — they look the same in any grayscale screenshot

## Non-goals
- Changing Levels 1–4 in any way
- Changing binky/collectible counts
- Changing hazard timing or gameplay mechanics
- Removing music differentiation

## Root causes

### A — Camera spring lag
`ERA5_CAMERA_YAW_SPRING = 8.8` is far too soft. The spring accumulates yaw velocity slowly, creating a 200–400ms rubber-band delay. When the player turns, the camera trails behind by a visible arc. When the player releases, the spring damps out over multiple frames (overshoot possible).

**Fix**: Replace the spring-accumulator system with direct camera yaw assignment. The camera desired yaw is already set to player yaw each frame when not in manual-look mode ([ ] keys). Setting `era5CameraYaw = era5CameraDesiredYaw` directly achieves 0ms lag, no overshoot, no rebound. This satisfies "max 3° offset while turning" and "settle under 80ms."

The manual camera recentering ([ ] and \ keys) still works because `era5CameraDesiredYaw` changes gradually and the camera tracks it immediately.

### B — Player facing
The baby visual mesh is built with the face at local -Z. With `visual.rotation.y = era5PlayerYaw` (currently PI/2), the face rotates to -X, which is exactly toward the camera (camera is at player.pos - cameraForward * 14.4 = player.pos - (+X * 14.4)). Result: camera sees the face, not the back.

**Fix**: `visual.rotation.y = explicitFacingYaw + Math.PI`. This flips the face to +X when yaw = PI/2, pointing away from the camera. Also update the reset-time visual rotation at boot.js line 3961 to apply the same PI offset.

### C — Level layout sameness
All levels (5–9) use the same structural template:
- Platforms placed at z = 0 ± 0.5 (straight lane)
- Platform widths 18–22 units, depths 9–11 units (uniform slabs)
- Sequential X positions with no bend, branch, or side zone
- Identical composition rhythm: spawn → small slab → small slab → ... → goal

A top-down screenshot of any level looks like a straight rectangle. A side-view screenshot looks like colored stairs. No level has a recognizable silhouette.

**Fix**: Redesign all five platform arrays to introduce:
- Z offsets ranging ±2.5 to ±5 from center (alternating zigzag)
- Width variety: narrow catwalks (w=8–12, d=3.5–5) alternating with wide chambers (w=20–28, d=11–16)
- Height variety: maintain progressive Y rise but accelerate on some platforms
- Named platforms that reflect the level identity

## Controls/camera fix plan

**boot.js lines 5316–5323**: Replace 8-line spring with 2-line direct track:
```
era5CameraYaw = era5CameraDesiredYaw;
era5CameraYawVel = 0;
```

**boot.js line 3961**: Update initial visual rotation at reset:
```
player.visual.rotation.set(0, isEra5Level ? era5InitialPlayerYaw + Math.PI : 0, 0);
```

**PlayerController.js line 655**: Add PI to facing:
```
this.visual.rotation.y = explicitFacingYaw + Math.PI;
```

## Player facing fix plan
See above. One-line change in PlayerController.js, one-line change in boot.js reset block.
Levels 1–4 are unaffected: they use velocity-based facing (not explicitFacingYaw), and the boot.js reset only applies the PI offset when `isEra5Level` is true.

## Level 5 — Aquarium layout plan
**Target**: Segmented aquarium service hall. Dock → glass bridge → tank chamber → kelp island → service catwalk → cylinder plaza → inner bridge → exhibit hall → goal dock.

Key structural reads:
- Tank chamber at z=-2.5: WIDE, clearly a room not a lane
- Service catwalk at z=-4: NARROW (d=3.5), clearly a catwalk
- Cylinder plaza at z=+2.5: medium, opposite side from catwalk
- Zigzag Z-sequence: -2, +1, -2.5, +2, -4, +2.5, -1, +0.5, 0

Floor language: aquatic service deck — wet grey-blue with caustic ripple marks.

## Level 6 — Factory layout plan
**Target**: Industrial bay network. Loading dock → belt bridge → press bay → furnace approach → crane platform → gear-lift deck → assembly hall → goal.

Key structural reads:
- Press bay at z=-3: clearly an interior bay
- Furnace approach at z=+2: wide, furnace-mouth side
- Crane platform at z=-3.5: NARROW (d=8), clearly elevated crane deck
- Zigzag Z-sequence: -2, +1.5, -3, +2, -3.5, +1.5, -2, 0

Floor language: industrial metal grating — dark steel with orange hazard stripes, grate bars, pipe fixtures.

## Level 7 — Storm/cliff layout plan
**Target**: Exposed cliff traversal. Cliff ledge → gap crossing → kite anchor → wind span → rock shelf → storm peak → summit approach → summit ledge → goal lookout.

Key structural reads:
- Rock shelf at z=-4: far -Z cliff shelf
- Wind span at z=+2.5: narrow, exposed
- Summit ledge at z=+3: WIDEST surface, destination feel
- Zigzag Z-sequence: -3, +1.5, -2, +2.5, -4, +2, -2, +3, 0

Floor language: weathered cliff path — rough stone/earth with crack lines, exposed at edges.

## Level 8 — Library layout plan
**Target**: Connected rooms and aisles. Archive entrance (wide) → reading hall → ink aisle (narrow) → gallery (wide) → upper gallery → stacks (wide) → goal gallery.

Key structural reads:
- Archive entrance at z=-2.5: widest surface (w=26, d=14), entrance "room"
- Ink aisle at z=-3: NARROW (w=12, d=6) — clearly an aisle
- Gallery at z=+3: WIDE (w=24, d=14), clearly a hall
- Zigzag Z-sequence: -2.5, +2.5, -3, +3, -2, +2.5, 0

Floor language: warm wood + rug runner — warm brown planks with center runner strips, lamp glow pools.

## Level 9 — Camp layout plan
**Target**: Outdoor clearing with branching boardwalks. Forest entry → lantern path → grove → bonfire approach → bonfire clearing (LANDMARK — widest, most open) → overlook rise → final overlook → goal.

Key structural reads:
- Bonfire clearing at z=-1: WIDEST surface (w=28, d=16) — the bonfire landmark
- Lantern path at z=+3: narrow boardwalk
- Final overlook at z=-1.5: wide, elevated final platform
- Zigzag Z-sequence: -2, +3, -3.5, +2.5, -1, +3.5, -1.5, 0

Floor language: forest earth + planks — dark soil brown, boardwalk seams, ember spots near bonfire.

## Validation plan
1. `npm run build` → must succeed, no TypeScript errors
2. `npx playwright test tests/runtime-levels.spec.js --project=chromium --grep "@era5"` → all 16 must pass
3. Manual spot-check of camera feel: turn left/right, verify no spring lag
4. Screenshot each level 5–9 from spawn and midpoint

## Acceptance criteria
- Hold Right Arrow 0.5s: player and camera rotate together, no visible lag
- Release Right Arrow: camera stops immediately, zero rebound
- A/D strafe without turning
- Player back visible to camera (face points forward)
- Level 5 top-down footprint: clear Z zigzag, not a straight lane
- Level 6 top-down footprint: clear Z zigzag with press bays and crane platform
- Level 7 top-down footprint: zigzag broken ledges, no indoor grammar
- Level 8 top-down footprint: alternating wide/narrow rooms and aisles
- Level 9 top-down footprint: meandering boardwalks, wide bonfire clearing
- Each level identifiable by floor language alone (grayscale test)
- 16/16 @era5 tests pass
- Build succeeds
