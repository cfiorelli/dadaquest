# Continuous Depth Movement Plan (Scenes 2-5)

## Scope
- Keep `CribScene` (Scene 1) on existing `PlayerBaby` unchanged.
- Convert `BedroomScene`, `KitchenScene`, `StairsScene`, `RooftopScene` to continuous depth (`wx`, `wz`, `wy`) movement using a new `PlayerDepth`.
- Keep existing visuals/art assets as backdrop, no texture/art pipeline changes.
- Preserve deterministic `?test=1` route and `window.__DADA_DEBUG__.sceneKey` updates.

## New Files
- `src/utils/depth.js`
- `src/entities/PlayerDepth.js`

## Constants (exact values)
In `src/utils/depth.js`:
- `SHEAR_X = -0.22`
- `DEPTH_Y = -0.30`
- `BASE_Y = 470`
- `Z_MIN = 0`
- `Z_MAX = 220`
- `SCALE_NEAR = 1.22` (at `wz=Z_MIN`)
- `SCALE_FAR = 0.82` (at `wz=Z_MAX`)
- `PLAYER_RADIUS_X = 14`
- `PLAYER_RADIUS_Z = 8`
- `MOVE_SPEED = 120`
- `AIR_CONTROL = 0.7`
- `JUMP_VEL = 315`
- `GRAVITY = 840`
- `MAX_FALL = 640`
- `COYOTE_MS = 120`
- `JUMP_BUFFER_MS = 120`

Projection and scaling:
- `screenX = wx + wz * SHEAR_X`
- `screenY = BASE_Y + wz * DEPTH_Y - wy`
- `scale = lerp(SCALE_NEAR, SCALE_FAR, clamp01((wz - Z_MIN) / (Z_MAX - Z_MIN)))`

## PlayerDepth Behavior
- Own kinematic state (`wx,wz,wy`, `vx,vz,vy`) with keyboard input.
- `jump buffer` and `coyote` windows both `120ms`.
- Gravity integration each frame with scene `groundHeight(wx,wz)` hook.
- Resolve footprint collisions against colliders: axis-aligned depth rect + height band.
- Shadow sprite anchored at projected ground point (`wy=0`), with alpha/scale based on jump height.
- Depth sort by projected `y` (`sprite.depth = sprite.y`); shadow under player.
- Reuse stamina/nap rules from `PlayerBaby`:
  - Keep `STATE` usage (`CRAWL`, `AIR`, `NAP` used here).
  - Keep 30s checkpoint nap timer.
  - On nap end: set stamina to `1`.
- Debug overlay data from player:
  - `wx,wz,wy`
  - `vx,vz,vy`
  - `state`
  - `lastTransitions` ring buffer (last 6 state changes with ms timestamp).

## Collider Model
Per collider:
- `{ kind: 'solid' | 'hazard' | 'exit', x, z, w, d, minWy, maxWy, onTouch? }`
- Footprint overlap uses ellipse-vs-rect with player footprint radii.
- Height gate: collider active only when `wy` is within `[minWy, maxWy]`.

## Scene Footprint Layouts
All converted scenes use:
- Walk area `wx in [20, sceneWidth-20]`
- Walk area `wz in [12, 208]` except stairs where path narrows with ramp bounds.

### Bedroom (Scene 2)
- Mom hazard:
  - rect centered near piano: `{ x: 655, z: 100, w: 78, d: 46, minWy: -999, maxWy: 70 }`
- Exit:
  - right side lane: `{ x: 1070, z: 108, w: 44, d: 70, minWy: -999, maxWy: 90 }`
- Bed/cabinet are visual only in this pass (no blocking solids).

### Kitchen (Scene 3)
- Puddle hazard 1:
  - `{ x: 580, z: 118, w: 132, d: 34, minWy: -999, maxWy: 70 }`
- Puddle hazard 2:
  - `{ x: 820, z: 124, w: 102, d: 30, minWy: -999, maxWy: 70 }`
- Exit:
  - `{ x: 1170, z: 112, w: 44, d: 72, minWy: -999, maxWy: 90 }`

### Stairs (Scene 4)
- Dog hazard:
  - `{ x: 360, z: 110, w: 64, d: 44, minWy: -999, maxWy: 72 }`
- Exit (top-right landing):
  - `{ x: 758, z: 44, w: 52, d: 52, minWy: -999, maxWy: 110 }`

Stairs ramp ground:
- `zStart = 182`, `zEnd = 58`
- `xStart = 70`, `xEnd = 710`
- `maxRise = 238`
- `t = clamp01((wx - xStart) / (xEnd - xStart))`
- `laneCenter = lerp(zStart, zEnd, t)`
- `laneHalf = 26 + (1 - t) * 8`
- If `abs(wz - laneCenter) <= laneHalf`, then `groundHeight = t * maxRise`, else `0`.
- Top landing flat: if `wx > 690 && wz < 72`, `groundHeight = maxRise`.

### Rooftop (Scene 5)
- Horse solid footprint (for standing/riding):
  - `{ x: horseX, z: 136, w: 90, d: 42, minWy: -999, maxWy: 30 }`
  - Standing height contribution from horse top: `+52` via `groundHeight`.
- DaDa exit trigger:
  - `{ x: 520, z: 104, w: 82, d: 58, minWy: -999, maxWy: 120 }`
- Window sill helper zone (non-blocking, for messaging only):
  - `{ x: 400, z: 94, w: 72, d: 34, minWy: -999, maxWy: 120 }`

## HUD Integration
- Keep current stamina bubble/zzz UI.
- Extend `HUD.updateDebug(player)`:
  - If player exposes `getDebugInfo()`, render that object fields.
  - Else keep existing Arcade body debug path (for Scene 1 compatibility).
- Keep `D` key toggling unchanged in each scene.

## Test Mode Determinism
- Preserve `isTestMode` query handling in `src/utils/testMode.js`.
- Keep per-scene deterministic auto-advance for converted scenes using `scene.time.delayedCall(600, ...)`.
- In converted scenes, disable random/hazard side-effects while `isTestMode` is true:
  - Bedroom: mom catch disabled.
  - Kitchen: puddle slip disabled.
  - Stairs: dog wake disabled.
  - Rooftop: direct `EndScene` auto-advance unchanged.
- Keep `window.__DADA_DEBUG__.sceneKey = this.scene.key` in each scene `create()`.

## Milestones and Commits
1. Docs-only plan commit.
2. Depth core (`depth.js` + `PlayerDepth.js`) commit.
3. Bedroom conversion commit + `npm test`.
4. Kitchen conversion commit + `npm test`.
5. Stairs conversion commit + `npm test`.
6. Rooftop conversion commit + `npm test`.
7. Final verification: `npm run build`, `npm run test:smoke`, quick preview, confirm Scene 1 untouched.
