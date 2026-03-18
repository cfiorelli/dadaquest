# Dada Quest — Claude Workflow

## Workflow Loop

Every task follows this sequence. Do not skip steps or merge them.

```
MAP → DISCUSS → PLAN → EXECUTE → VERIFY → COMMIT
```

| Step | What happens |
|------|-------------|
| **MAP** | Read the relevant files. Quote exact code. Do not assume prior state. |
| **DISCUSS** | State root cause and exact smallest patch before writing a line. |
| **PLAN** | Name the bead(s), files, invariants, and stop condition. |
| **EXECUTE** | Implement. One bead at a time. |
| **VERIFY** | Check invariants. Report what is and is not yet proven in live view. |
| **COMMIT** | One commit per bead. Push immediately after commit. |

---

## Bead Policy

- One bead per bounded goal.
- Two beads maximum per session, and only if the two goals are clearly separable with no shared state.
- One commit per bead. Do not batch beads into one commit.
- Push after every commit.

---

## 3D / Spatial Work Rules

### Auto-advance and parallelization

- **Auto-advance is OFF** for any task touching: 3D geometry, gameplay volumes, collision, camera, rendering groups, transparency, HUD state.
- **Parallelization is OFF** for 3D/spatial tasks. Spatial bugs interact; parallel edits mask root cause.

### Separate concerns before touching anything

Always treat these as distinct layers. Changes to one must not silently affect another:

1. **Visual geometry** — meshes, materials, render groups, transparency
2. **Collision geometry** — checkCollisions, invisible colliders, walkable surfaces
3. **Gameplay volumes** — trigger zones, contains(), water/hazard logic
4. **Camera interaction** — cameraBlocker, cameraFadeable, occlusion
5. **Render/transparency behavior** — renderingGroupId, needDepthPrePass, alphaIndex, ALPHABLEND

### Define invariants before coding

Before any 3D edit, state the invariants the patch must preserve. Example:

> *Invariant: water surface at group 3 renders after floor at group 2. Weapon at group 3 depth-sorts correctly against water.*

### Task completion

A 3D task is **not complete** until:
- All stated invariants are checked in live view (manual play or screenshot).
- The report includes the phrase **"not proven yet in live view"** for anything that has not been manually verified.

### Two-strike rule

After two failed geometry or collision patches on the same issue, stop patching. Rebuild from first principles: re-read all relevant code, re-state root cause, design a replacement, not another incremental fix.

### No adjacent-system drift

A task scoped to the pool does not touch HUD, oxygen, combat, inventory, or jellyfish unless explicitly listed in scope. State drift explicitly if it is necessary.

---

## Live View Outranks Code Reasoning

If live in-engine behavior contradicts a code-based conclusion, the live behavior is authoritative. Stop reasoning from code. Observe the actual result first.

---

## Reporting Format (3D tasks)

After each bead, report:

- Root cause (exact, quoted from code)
- Files changed and exact values changed
- Invariants checked (state each: ✓ or "not proven yet in live view")
- Adjacent systems confirmed untouched
- Anything not yet proven in live play

---

## Reference

Engineering discipline, test tiers, scope rules, truth standard, and beads issue tracking are in `AGENTS.md`.
