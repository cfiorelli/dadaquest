# Phase Gates

## Purpose

Use phase gates to keep Era 5 and Level 5 work bounded.

## Gate 0: Audit

- Reproduce the problem or disprove it.
- Name the owning files/systems.
- Decide whether the next packet is `repair` or `rebuild-slice`.
- Do not roll into composition or expansion from the audit packet.

## Gate 1: Truth Repair

Truth bugs must be green before composition work.

This includes:

- shell/render stability
- collision truth
- walkable truth
- hazard truth
- respawn truth

If any of those are broken, repair them before pushing map ambition or polish.

## Gate 2: Rebuild Slice

Use rebuild-slice when patching is wasteful.

Requirements before advancing:

- shell/collision/walkable/respawn truth are green for the slice
- representative spaces are bounded and legible
- representative proof screenshots exist
- the slice is small and coherent, not a partial giant map

## Gate 3: Composition Pass

Composition work starts only after truth is green.

Composition work must not reopen:

- invisible blockers
- shell pop/disappear behavior
- visible-floor fall-through
- bad respawn selection

If it does, stop and return to repair.

## Stop-Ship Rules

For any active slice or proof level, these are stop-ship:

- reproduced invisible blocker
- reproduced shell pop while turning in place
- reproduced visible safe-looking floor fall-through
- reproduced respawn onto hidden, roof-like, or off-route geometry

Do not continue with broader map expansion or composition while those are active.

## Expansion Rule

- Rebuild-slice must be green before broader map ambition.
- Broader ambition means larger topology, more encounters, more route depth, or more visual layering beyond the truthful slice.

## Evidence Rule

Advancing a gate requires evidence, not only a claim:

- exact root cause
- exact files changed
- targeted tests updated or added
- proof screenshots
- final validation commands and results
