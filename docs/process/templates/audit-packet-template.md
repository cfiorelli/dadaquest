# Audit Packet Template

You are working in the DaDaQuest repo.

Packet type: Audit

## Objective
- <state the diagnostic objective>

## Scope
- <list what may be inspected>

## Non-scope
- No code changes unless explicitly allowed.
- No fixes.
- No unrelated cleanup.

## Repro steps or current symptoms
- <exact repro or observed symptoms>

## Suspected ownership/files
- <exact likely files or systems>

## Required outputs
- exact root cause or ranked candidates
- exact owning files/systems
- recommended next packet type

## Acceptance tests
- symptom reproduced or explicitly disproven
- owning files identified
- next packet can be written without guesswork

## Commands to run
- <repo-specific commands>

## Stop condition
- Stop when the root cause and ownership are clear enough for a bounded repair or rebuild packet.

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
