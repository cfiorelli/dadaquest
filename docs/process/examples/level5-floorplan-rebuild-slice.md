# Level 5 Floorplan-first Rebuild-slice Example

You are working in the DaDaQuest repo.

Packet type: Rebuild-slice

## Objective
- Replace the current Level 5 restart slice with a bounded authored-space slice where the approved Level 5 floorplan is the only topology source of truth for sectors, connectors, thresholds, walkable surfaces, hazard surfaces, and respawn anchors.

## Scope
- Rebuild one bounded Level 5 slice in `src/web3d/world/level5.js`.
- Include exactly one start room, one floorplan-defined fork, one rejoin/hero chamber, one hazard room, and one goal room.
- Remap the current Level 5 semantic spaces (`arrival_vestibule`, `public_exhibit_hall`, `service_elbow`, `hero_tank_chamber`, `filtration_hazard_room`, `nursery_goal_room`) to the approved floorplan, or update runtime and screenshot expectations in lockstep if the floorplan requires different stable IDs or labels.
- Keep truth, topology, respawn, and screenshot proof wiring coherent across `src/web3d/world/buildWorld5.js`, `src/web3d/world/buildEraAdventureWorld.js`, `src/web3d/world/eraAuthoredLayout.js`, `tests/runtime-levels.spec.js`, and `tests/screenshot.spec.js`.
- Record floorplan intake notes before authoring starts: room names, room bounds, doorways, blocked thresholds, walkable surfaces, non-walkable surfaces, hazard zones, and elevation changes.

## Non-scope
- No Level 1-4 changes.
- No Level 5 composition, landmark, or material pass beyond what is required for truthful room and threshold read.
- No broad Era 5 refactor or new generic topology authoring system.
- No preserving existing `authoredMap` sector bounds, connector coordinates, respawn anchors, checkpoint placements, or proof camera poses just because they already exist.
- No invented rooms, loops, shortcuts, visual-only catwalks, or service spaces that are not present on the approved floorplan.

## Repro steps or current symptoms
- The current Level 5 slice in `src/web3d/world/level5.js` is a hand-authored restart/composition slice, with sector bounds, connector locations, respawn anchors, checkpoints, and proof cameras encoded directly in code.
- Incoming work requires the floorplan to become the topology authority. Incrementally patching the current slice risks carrying forward stale room boundaries, route choices, or thresholds that are not on the floorplan.
- Until the floorplan-driven slice replaces the current topology, visible world, collidable world, walkable world, hazard world, and respawn world cannot be guaranteed to match the source layout.

## Suspected ownership/files
- `src/web3d/world/level5.js`
- `src/web3d/world/eraAuthoredLayout.js`
- `src/web3d/world/buildEraAdventureWorld.js`
- `src/web3d/world/buildWorld5.js`
- `tests/runtime-levels.spec.js`
- `tests/screenshot.spec.js`
- `docs/screenshots/`
- `docs/proof/`

## Required outputs
- One bounded Level 5 rebuild slice derived from the approved floorplan instead of the current restart slice topology.
- One explicit floorplan-to-sector mapping table covering sector IDs or labels, doorway or threshold mappings, blocked edges, and elevation changes.
- Updated topology, truth, walkable, collision, hazard, and respawn debug outputs that reflect only the floorplan-driven slice.
- Updated Level 5 runtime assertions for required sectors, route choice and rejoin behavior, walkable truth, collision truth, hazard truth, and respawn anchor selection.
- A dedicated screenshot proof set saved under:
- `docs/screenshots/level5-floorplan-rebuild-start.png`
- `docs/screenshots/level5-floorplan-rebuild-fork-public.png`
- `docs/screenshots/level5-floorplan-rebuild-fork-service.png`
- `docs/screenshots/level5-floorplan-rebuild-hero-chamber.png`
- `docs/screenshots/level5-floorplan-rebuild-hazard-room.png`
- `docs/screenshots/level5-floorplan-rebuild-goal-room.png`
- `docs/screenshots/level5-floorplan-rebuild-respawn-anchor.png`
- `docs/screenshots/level5-floorplan-rebuild-walkable-overlay.png`
- `docs/screenshots/level5-floorplan-rebuild-collision-overlay.png`
- Copy of the final proof set under `docs/proof/level5-floorplan-rebuild/`.

## Acceptance tests
- The approved floorplan source is named before implementation starts.
- Every sector and connector in the shipped slice maps to a room or threshold on the approved floorplan.
- No extra room, loop, shortcut, or threshold remains from the previous restart or composition slice unless it exists on the floorplan.
- The topology report shows one start, one fork, one rejoin, one hazard room, one hero chamber, and one goal room.
- `LEVEL5_REQUIRED_SECTORS` or its replacement matches the shipped floorplan-driven slice.
- No invisible blockers reproduce on representative routes.
- No shell pop reproduces while turning in place in representative spaces.
- No visible safe-looking floor drops the player.
- Hazard death respawns only to explicit floorplan-aligned anchors.
- Representative screenshots read as bounded rooms and thresholds from gameplay camera.

## Commands to run
- `npm run build`
- `npm run preview -- --host 127.0.0.1 --port 4173`
- `curl -I http://127.0.0.1:4173/`
- `npm run test:level5`
- `npx playwright test --config playwright.screenshot.config.mjs --project=chromium tests/screenshot.spec.js --grep "Level 5"`
- `npx playwright test --config playwright.dev.config.mjs --project=chromium` if shared authored-layout or shared Era 5 runtime files change

## Stop condition
- Stop when the floorplan-driven slice is small, coherent, truthful, and validated.
- Stop before any composition or landmark pass once truth is green for the bounded slice.
- Stop and resolve floorplan intake if doorway, walkability, hazard, or elevation semantics are missing instead of inferring topology from decor or the old Level 5 layout.

## Required final report fields
- reproduced at start: yes/no
- reproduced at end: yes/no
- exact root cause
- exact files changed
- exact tests added/updated
- exact screenshot paths
- exact commands run
- exact commit hash
- remaining blockers
- floorplan source path or external reference
- exact floorplan-to-sector mapping
- excluded floorplan areas
- doorway and threshold interpretation notes
- walkable vs non-walkable interpretation notes
- elevation handling notes
