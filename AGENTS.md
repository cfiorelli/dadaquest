# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

## Repo Execution Contract

### Default landing rule

- Land validated work directly on `main`.
- Push directly to `origin/main`.
- Do not open a PR unless the task explicitly requires one.

### Validation rule

- Use built preview for final validation.
- Do not treat HMR or dev-server behavior as final proof.
- Baseline final validation commands for repo work that changes behavior:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
curl -I http://127.0.0.1:4173/
```

- Add the smallest sensible Playwright slice for the task.
- Run `npx playwright test --project=chromium` when shared runtime behavior changes.

### Proof artifact rule

- Save review screenshots under `docs/screenshots/`.
- Copy final proof sets into `docs/proof/<pass-name>/`.
- Final reports should name exact artifact paths, not just describe the shots.

### Level integrity rules

- Levels `1` through `4` must remain unchanged in content, controls, camera feel, and music unless a task explicitly targets them.
- Era 5 work must stay on the authored-space system.
- Do not revert Era 5 levels to legacy slab/path authoring.

### Truth-first rule

The following must align before composition or polish work is considered complete:

- visible world
- collidable world
- walkable world
- hazard world
- respawn world

If those truths disagree, fix that before improving appearance.

### Central render-policy rule

Gameplay-visible render-order and transparency settings for held items, projectiles, enemies, water, overlays, VFX, and translucent world meshes must go through the central policy module in `src/web3d/render/renderPolicy.js`.

Do not directly assign:

- `renderingGroupId`
- `alphaIndex`
- `needDepthPrePass`
- `forceDepthWrite`
- `disableDepthWrite`
- `transparencyMode`
- `backFaceCulling`

outside the central render-policy module or its approved helper calls, unless a documented legacy exception is already listed in `docs/RENDER_POLICY.md`.

Run:

```bash
npm run check:render-policy
```

when touching render/transparency behavior, and use the visibility matrix in `docs/RENDER_POLICY.md` as the proof contract.

### Banned Era 5 fallback patterns

Do not ship Era 5 work that relies on:

- giant open container with slabs inside
- direct spawn-to-goal sightline
- fake chamber that is just a widened runway
- enemy on pad in void
- DaDa on pad in void
- dark floor as sole hazard telegraph
- recolor-only route differentiation
- helper/debug geometry leaking into normal play
- invisible blockers without explicit justification

### Phase-gate rule

Use bounded packets unless the task explicitly overrides this:

1. audit
2. repair
3. rebuild-slice
4. composition-pass

- Audit establishes evidence and root cause.
- Repair fixes one bug class with one proof obligation.
- Rebuild-slice replaces broken spaces with a small truthful slice before broader ambition.
- Composition-pass happens only after truth is green and must not reopen truth bugs.

Use the packet system in:

- `docs/process/CODEX_TASK_PACKETS.md`
- `docs/process/PHASE_GATES.md`
- `docs/process/templates/`

---

## Engineering Execution Discipline

### 1. Scope discipline

- Fix the smallest proven cause first.
- Do not broaden the task unless the current root cause proves a broader change is required.
- Prefer local fixes over shared runtime changes.
- When a bug is about one level, one room, one weapon, one UI state, or one camera path, stay inside that slice.

### 2. Repro-first rule

- Reproduce the exact current bug before editing code.
- State the exact repro path being used.
- Current live behavior and current user screenshots outrank prior green tests, prior proofs, and prior self-reports.

### 3. Test cost control

**Tier 1 — local iteration:**
- Use only the cheapest proof that answers the current question.
- Prefer one targeted Playwright test, one temporary debug script, or one manual built-preview repro.
- Do not run broad suites during small iteration.

**Tier 2 — task validation:**
- When the fix appears visually correct, run only the narrow regression slice relevant to the changed code path.

**Tier 3 — pre-commit validation:**
- Run the broader level/regression slice only once the behavior is visually correct and ready to land.
- Do not run whole-game or unrelated suites unless the changed code path clearly affects them.

### 4. Shared code caution

- Editing shared runtime code requires explicit justification.
- Before changing shared code, state which levels/systems may be affected.
- If shared code is changed for a local bug, widen validation only at the end, not on every edit.

### 5. Truth standard

A fix is **not done** because:
- telemetry looks right
- an entity exists
- one favorable screenshot passed
- one narrow test passed

A fix is **done only when:**
- the real gameplay path matches the expected player-visible result
- the latest live repro or screenshot is resolved
- the relevant narrow regression slice passes

### 6. Push behavior

- When asked to push, do not automatically run preview servers, full builds, or broad validation unless explicitly requested.
- Run only the requested git action unless a required precondition is missing.
- State what command will be run before running anything broader than the git action itself.

### 7. Reporting format

For each meaningful task, report:
- exact root cause
- exact files changed
- exact validation run
- what was not retested
- remaining risks

### 8. Temporary debug artifacts

- Temporary test files and debug scripts must be deleted before final commit unless explicitly requested to keep them.

### 9. Small bug policy

For small visual/gameplay bugs, default to:

1. reproduce
2. isolate
3. patch
4. run one targeted test
5. visually verify
6. widen validation only after that

### 10. DadaQuest / Level 5 cost-control rule

- For Era5 / Level 5 rebuild work, do not run the full game suite on every edit.
- Default to one targeted Level 5 repro while iterating.
- Run broader Level 5 regression only before commit.
- Run Levels 1–4 only if the changed shared code plausibly affects them.

### 11. Contradiction rule

- If live behavior contradicts a passing test or prior proof artifact, treat the live behavior as authoritative.
- Stop claiming success.
- Audit why the test passed incorrectly before making more fixes.

### 12. Ownership rule

- Do not wait for the user to prescribe basic engineering hygiene.
- Default to scope control, cheapest valid repro, narrow iteration, and explicit risk reporting.

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Version-controlled: Built on Dolt with cell-level merge
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update <id> --claim --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push origin main
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- END BEADS INTEGRATION -->
