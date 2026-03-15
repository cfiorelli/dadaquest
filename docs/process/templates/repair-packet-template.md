# Repair Packet Template

You are working in the DaDaQuest repo.

Packet type: Repair

## Objective
- <fix one bug class>

## Scope
- <only the files/systems needed for this repair>

## Non-scope
- No layout redesign.
- No unrelated cleanup.
- No second bug class unless required to make this one coherent.

## Repro steps or current symptoms
- <exact repro for the single bug class>

## Suspected ownership/files
- <exact likely files>

## Required outputs
- exact root cause
- exact fix
- exact regression proof

## Acceptance tests
- bug reproduces at start
- bug does not reproduce at end
- targeted regression check passes

## Commands to run
- <repo-specific commands>

## Stop condition
- Stop when the single named bug class is green and its proof obligation passes.

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
