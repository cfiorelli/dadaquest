# Level 5 Truth Audit Example

You are working in the DaDaQuest repo.

Packet type: Audit

## Objective
- Determine whether the current Level 5 issue is shell pop, invisible blocker, visible-floor fall-through, or bad respawn anchor selection.

## Scope
- Inspect Level 5 authored files, shared Era 5 truth/debug hooks, and current proof screenshots.

## Non-scope
- No code changes.
- No layout or composition changes.
- No multi-bug fixes.

## Repro steps or current symptoms
- Walls pop while turning in place.
- Movement hits invisible blockers.
- Surfaces that look standable drop the player.
- Hazard death may respawn above the play space.

## Suspected ownership/files
- `src/web3d/world/level5.js`
- `src/web3d/world/buildWorld5.js`
- `src/web3d/world/buildEraAdventureWorld.js`
- `src/web3d/world/eraAuthoredLayout.js`
- `src/web3d/boot.js`

## Required outputs
- exact root cause for each reproduced truth bug
- owning file for each reproduced bug
- recommendation: repair packet or rebuild-slice packet

## Acceptance tests
- each symptom is reproduced or explicitly disproven
- file ownership is named
- next packet type is obvious

## Commands to run
- `npm run build`
- `npm run preview -- --host 127.0.0.1 --port 4173`
- `curl -I http://127.0.0.1:4173/`
- smallest relevant Playwright/runtime slice for Level 5 truth

## Stop condition
- Stop once each reproduced symptom has a named root cause and owning file.

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
