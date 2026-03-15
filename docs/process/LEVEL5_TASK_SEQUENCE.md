# Level 5 Task Sequence

## Purpose

Use this sequence for current Level 5 work instead of one giant rescue brief.

## 1. Audit Packet — Truth Verification

### Objective

- Reproduce and classify one or more Level 5 truth failures.

### Success

- The exact bug class is named.
- Owning files are identified.
- The next bounded packet type is obvious.

### Evidence required before moving on

- reproduced yes/no
- exact root cause or ranked root-cause candidates
- exact owning files/systems
- recommendation: `repair` or `rebuild-slice`

## 2. Repair Packet — One Truth Bug Class

### Objective

- Fix one truth bug class at a time.

Examples:

- shell pop while turning in place
- invisible blocker collisions
- visible-floor fall-through
- bad respawn anchor selection

### Success

- The named bug class no longer reproduces.
- A targeted regression proves it.

### Evidence required before moving on

- reproduced at start: yes
- reproduced at end: no
- exact fix
- exact tests added/updated
- any proof screenshots needed for that bug

## 3. Rebuild-slice Packet — If Patching Is Wasteful

### Objective

- Replace the broken Level 5 area with a small truthful authored-space slice.

### Success

- The slice is internally coherent.
- Truth is green.
- Representative spaces read as bounded rooms.

### Evidence required before moving on

- exact slice topology delivered
- truth reports
- walkable/collision/respawn proof
- representative screenshots from built preview

## 4. Composition-pass Packet — Only After Truth Is Green

### Objective

- Improve aquarium identity, route-family readability, chamber composition, and payoff readability without reopening truth bugs.

### Success

- The spaces read correctly from gameplay camera.
- Public/service/maintenance feel like different place types.
- Chamber and goal screenshots are readable without debug context.

### Evidence required before moving on

- proof screenshots
- note confirming truth regressions stayed green
- exact files changed
- exact tests rerun
