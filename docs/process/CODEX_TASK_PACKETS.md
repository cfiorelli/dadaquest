# Codex Task Packets

## Purpose

Use bounded task packets instead of one-off rescue briefs.

Each packet type defines:

- when the packet is appropriate
- what evidence it must produce
- what it must not do
- when it must stop

## Common Schema

Every packet must use these headings exactly:

1. `Objective`
2. `Scope`
3. `Non-scope`
4. `Repro steps or current symptoms`
5. `Suspected ownership/files`
6. `Required outputs`
7. `Acceptance tests`
8. `Commands to run`
9. `Stop condition`
10. `Required final report fields`

### Required final report fields

Every packet report must include these evidence-first fields:

- `reproduced at start: yes/no`
- `reproduced at end: yes/no`
- `exact root cause`
- `exact files changed`
- `exact tests added/updated`
- `exact screenshot paths`
- `exact commands run`
- `exact commit hash`
- `remaining blockers`

If a field does not apply, state `none` or `n/a` explicitly.

## Packet Type A: Audit Packet

### When to use

- Root-cause finding
- Triage before choosing repair vs rebuild
- Scope definition when symptoms are real but ownership is unclear

### When not to use

- When the root cause is already known and the task is implementation
- When the task requires shipping a fix in the same bounded packet
- When the request is visual polish or broader map ambition

### Required sections

- Use the common schema exactly

### Forbidden behaviors

- No code changes unless the packet explicitly allows a tiny diagnostic helper
- No speculative fixes
- No redesign or map rewrite
- No “while I’m here” cleanup

### Required evidence outputs

- precise root-cause findings
- exact file ownership
- exact repro notes
- explicit recommendation: repair packet or rebuild-slice packet

### Stop condition

- Stop when the root cause and owning files are clear enough to write the next packet without guesswork

### Example acceptance checks

- The reported symptom reproduces or is explicitly disproven
- The exact failing system is named
- The likely fix surface is named
- The packet ends without unrelated code churn

### Copy/paste audit template

```md
You are working in the DaDaQuest repo.

Packet type: Audit

Objective
- <state the diagnostic objective>

Scope
- <what may be inspected>

Non-scope
- No code changes unless explicitly allowed below.
- No fixes.
- No unrelated cleanup.

Repro steps or current symptoms
- <exact repro or observed symptoms>

Suspected ownership/files
- <list likely files or systems>

Required outputs
- exact root cause or ranked root-cause candidates
- exact owning files/systems
- recommended next packet type
- any missing instrumentation needed

Acceptance tests
- symptom reproduced or explicitly disproven
- owning files identified
- next packet can be written without guesswork

Commands to run
- <repo-specific commands>

Stop condition
- stop when the root cause and ownership are clear enough for a bounded repair or rebuild packet

Required final report fields
- reproduced at start: yes/no
- reproduced at end: yes/no
- exact root cause
- exact files changed
- exact tests added/updated
- exact screenshot paths
- exact commands run
- exact commit hash
- remaining blockers
```

## Packet Type B: Repair Packet

### When to use

- One bug class
- One proof obligation
- Localized runtime or content repair after root cause is known

### When not to use

- Multiple independent bug classes
- Full map redesign
- Composition/polish work
- Cases where the map shell is broken enough that replacement is cheaper than repair

### Required sections

- Use the common schema exactly

### Forbidden behaviors

- Do not fix more than one primary bug class
- Do not expand scope into a rebuild
- Do not mask truth bugs with decor
- Do not add broad stylistic changes

### Required evidence outputs

- exact bug root cause
- exact fix
- exact targeted proof for that bug class
- exact regression test added or updated

### Stop condition

- Stop when the named bug class is green and the proof obligation passes

### Example acceptance checks

- One reproduced bug becomes non-reproducible
- One focused regression test covers it
- No unrelated layout or art drift

### Copy/paste repair template

```md
You are working in the DaDaQuest repo.

Packet type: Repair

Objective
- <fix one bug class>

Scope
- <only the files/systems needed for this repair>

Non-scope
- No layout redesign.
- No unrelated cleanup.
- No second bug class unless required to make this one coherent.

Repro steps or current symptoms
- <exact repro for the single bug class>

Suspected ownership/files
- <exact likely files>

Required outputs
- exact root cause
- exact fix
- exact regression proof

Acceptance tests
- bug reproduces at start
- bug does not reproduce at end
- targeted regression check passes

Commands to run
- <repo-specific commands>

Stop condition
- stop when the single named bug class is green and its targeted proof passes

Required final report fields
- reproduced at start: yes/no
- reproduced at end: yes/no
- exact root cause
- exact files changed
- exact tests added/updated
- exact screenshot paths
- exact commands run
- exact commit hash
- remaining blockers
```

## Packet Type C: Rebuild-slice Packet

### When to use

- The existing level or space is broken enough that patching is wasteful
- A small truthful vertical slice can replace a broken implementation
- The team needs a clean authored-space proof before broader ambition

### When not to use

- When one repair packet can fix the issue
- When truth is already green and the work is only composition or identity
- When the request is broad feature work outside one slice

### Required sections

- Use the common schema exactly

### Forbidden behaviors

- Do not rebuild the whole world first
- Do not chase impressive scale before truth is green
- Do not preserve broken shell geometry because it already exists
- Do not reintroduce legacy slab/path authoring

### Required evidence outputs

- delivered slice topology
- truth reports
- proof screenshots
- explicit respawn/collision/walkable truth

### Stop condition

- Stop when the small replacement slice is internally truthful and validated

### Example acceptance checks

- no invisible blockers on representative routes
- no shell popping in representative spaces
- no visible safe-looking floor fall-through
- no bad respawn
- representative screenshots read as rooms, not a giant box with props

### Copy/paste rebuild-slice template

```md
You are working in the DaDaQuest repo.

Packet type: Rebuild-slice

Objective
- <replace a broken level/space with a small truthful slice>

Scope
- <exact spaces/systems included in the slice>

Non-scope
- No broad map expansion.
- No composition pass until truth is green.
- No preservation of broken shell/layout just because it exists.

Repro steps or current symptoms
- <why replacement is justified>

Suspected ownership/files
- <exact authoring/runtime/test files>

Required outputs
- small authored-space slice
- truth/debug reports
- proof screenshots
- targeted regressions

Acceptance tests
- slice topology works
- truth checks are green
- representative screenshots show bounded spaces

Commands to run
- <repo-specific commands>

Stop condition
- stop when the replacement slice is small, clean, truthful, and validated

Required final report fields
- reproduced at start: yes/no
- reproduced at end: yes/no
- exact root cause
- exact files changed
- exact tests added/updated
- exact screenshot paths
- exact commands run
- exact commit hash
- remaining blockers
```

## Packet Type D: Composition-pass Packet

### When to use

- Truth is already green
- The remaining problem is place identity, chamber composition, route-family readability, or screenshot readability

### When not to use

- Any active invisible blocker, shell pop, fall-through, or bad respawn
- Any unresolved authored-space truth bug
- Any task that still needs a rebuild-slice first

### Required sections

- Use the common schema exactly

### Forbidden behaviors

- Do not reopen truth bugs
- Do not expand into broad map redesign unless the packet explicitly says so
- Do not substitute tint changes for structural differentiation
- Do not claim success from props alone

### Required evidence outputs

- proof screenshots
- route-family/readability proof
- note confirming truth regressions did not reopen

### Stop condition

- Stop when the specified spaces read correctly and truth regressions remain green

### Example acceptance checks

- representative screenshots identify the intended place type immediately
- public/service/maintenance read as different place types
- chamber and goal payoff read clearly from gameplay camera
- truth/collision/respawn regressions remain green

### Copy/paste composition-pass template

```md
You are working in the DaDaQuest repo.

Packet type: Composition-pass

Objective
- <improve place identity/readability after truth is green>

Scope
- <exact spaces or route families>

Non-scope
- No truth repair unless a regression is found.
- No broad rebuild.
- No unrelated mechanics changes.

Repro steps or current symptoms
- <what still reads poorly>

Suspected ownership/files
- <exact authoring/material/screenshot/test files>

Required outputs
- improved proof screenshots
- route/chamber/goal readability evidence
- confirmation that truth regressions stayed green

Acceptance tests
- screenshot read is improved
- truth regressions still pass
- no reopened blocker/fall-through/respawn bugs

Commands to run
- <repo-specific commands>

Stop condition
- stop when the named composition target reads correctly and truth remains green

Required final report fields
- reproduced at start: yes/no
- reproduced at end: yes/no
- exact root cause
- exact files changed
- exact tests added/updated
- exact screenshot paths
- exact commands run
- exact commit hash
- remaining blockers
```
