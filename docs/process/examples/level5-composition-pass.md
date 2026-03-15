# Level 5 Composition-pass Example

You are working in the DaDaQuest repo.

Packet type: Composition-pass

## Objective
- Improve aquarium identity and room readability in the current truthful Level 5 slice without reopening truth bugs.

## Scope
- Start threshold framing
- public vs service route readability
- hero chamber composition
- goal-room payoff framing
- screenshot/readability proof

## Non-scope
- No truth repair unless a regression is found.
- No large topology expansion.
- No unrelated mechanic changes.

## Repro steps or current symptoms
- The current truthful slice is stable but still reads too abstract or austere in representative screenshots.

## Suspected ownership/files
- `src/web3d/world/level5.js`
- `src/web3d/world/buildEraAdventureWorld.js`
- `tests/screenshot.spec.js`
- `docs/screenshots/`

## Required outputs
- improved proof screenshots
- explicit route-family and chamber-read evidence
- note confirming truth regressions remain green

## Acceptance tests
- representative screenshots read as aquarium/service spaces
- public/service/goal spaces read as different place types
- truth regressions still pass

## Commands to run
- `npm run build`
- screenshot proof slice
- targeted Level 5 truth/runtime slice

## Stop condition
- Stop when the named composition targets read correctly and the slice remains truthful.

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
