# Level 5 Rebuild-slice Example

You are working in the DaDaQuest repo.

Packet type: Rebuild-slice

## Objective
- Replace the broken Level 5 shell/layout with a small truthful aquarium/service opening slice.

## Scope
- Arrival threshold
- one public route
- one service route
- one hero chamber
- one hazard room
- one goal room
- explicit respawn anchors and proof screenshots

## Non-scope
- No full-map ambition.
- No composition pass until truth is green.
- No preserving broken shell geometry because it is already wired.

## Repro steps or current symptoms
- Existing Level 5 shell/collision/walkable/respawn truth is broken enough that incremental patching is wasteful.

## Suspected ownership/files
- `src/web3d/world/level5.js`
- `src/web3d/world/buildWorld5.js`
- `src/web3d/world/buildEraAdventureWorld.js`
- `src/web3d/world/eraAuthoredLayout.js`
- `tests/runtime-levels.spec.js`
- `tests/screenshot.spec.js`

## Required outputs
- small truthful authored-space slice
- explicit truth reports
- restart proof screenshots
- targeted runtime regressions

## Acceptance tests
- no shell popping in representative spaces
- no invisible blockers on representative routes
- no visible-floor fall-through on representative surfaces
- no bad respawn
- representative screenshots read as bounded spaces

## Commands to run
- `npm run build`
- `npm run preview -- --host 127.0.0.1 --port 4173`
- `curl -I http://127.0.0.1:4173/`
- targeted Level 5 truth/runtime slice
- screenshot proof slice

## Stop condition
- Stop when the replacement slice is small, coherent, truthful, and validated.

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
