# Level 5 Single-Bug Repair Example

You are working in the DaDaQuest repo.

Packet type: Repair

## Objective
- Fix one Level 5 truth bug class: hazard death respawns to the wrong place.

## Scope
- Level 5 respawn selection, explicit anchors, and the narrow tests/debug needed to prove the fix.

## Non-scope
- No shell redesign.
- No collision or walkable rewrite unless directly required for respawn correctness.
- No composition changes.

## Repro steps or current symptoms
- In Level 5, hazard death can respawn the player on unintended high or hidden geometry instead of a nearby authored recovery point.

## Suspected ownership/files
- `src/web3d/world/level5.js`
- `src/web3d/world/buildWorld5.js`
- `src/web3d/boot.js`
- `tests/runtime-levels.spec.js`

## Required outputs
- exact root cause
- exact respawn-anchor fix
- one targeted regression proving the intended anchor is selected

## Acceptance tests
- bad respawn reproduces at start
- bad respawn does not reproduce at end
- targeted respawn regression passes

## Commands to run
- `npm run build`
- targeted Level 5 respawn Playwright slice

## Stop condition
- Stop when hazard death respawns only to explicit intended anchors for the tested region.

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
