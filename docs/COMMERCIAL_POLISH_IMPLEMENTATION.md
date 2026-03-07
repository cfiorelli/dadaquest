# Commercial Polish Implementation Plan

Persistent data stored in `localStorage`
- Key: `dadaquest:progress:v1`
- Shape:
  - `levels[levelId].collectedIds`: persistent binky ids seen across runs
  - `levels[levelId].total`: derived binky total for the level
  - `capeUnlocked`: unlocked by fully clearing Level 1 binkies
  - `sourdoughUnlocked`: unlocked by fully clearing Levels 1-3 binkies
  - `allBinkiesCollected`: true when every tracked level total is fully cleared
  - `unlocksShown`: one-shot banner guards (`cape`, `sourdough`)

Exact key bindings and when they work
- `Space`: jump
- `A/D` or arrows: move
- `Shift`: sprint
- `M`: mute
- `R`: gameplay only, no menu open, no `metaKey`/`ctrlKey`; reset to last checkpoint and refill onesie meter
- `F`: gameplay only, no menu open, airborne only
  - if cape is unlocked and unused this run: trigger 4s cape float
  - otherwise: trigger visual backflip
- `E`: Level 4 only, gameplay only, no menu open; Flour Puff if cooldown ready
- `Esc`: toggle gameplay menu
- `Cmd+R` / `Ctrl+R`: browser reload, never intercepted

Buff rules
- Onesie:
  - picked up in-level
  - grants jump boost and extra air jump while active
  - HUD icon + meter
  - `R` restores meter to full if the run has already collected the onesie
- Cape:
  - permanently unlocked by full Level 1 binky clear
  - visible on baby in all levels after unlock
  - activated by airborne `F`
  - 4 seconds of wobbly float movement
  - one use per run, restored only by Restart Level
  - Reset Baby to New clears current-run cape state and onesie state, but not persistent unlocks

Minigame triggers and return rules
- Level 1 out-of-bounds minigame triggers only when player falls below `floorTopY - 6`
- Landing on the normal floor does not trigger it
- Enter minigame:
  - save player position, checkpoint, per-run collectible state, and buff state
  - show fruit maze with aliens/cows and a temporary power-up
- Win:
  - restore saved state and return to Level 1 gameplay
- `Esc` in minigame:
  - full Restart Level 1
