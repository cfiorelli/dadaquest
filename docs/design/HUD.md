# HUD Design Spec — Da Da Quest

## Principles
- **Minimal always-on:** Show only what matters every second.
- **Event-based:** Popup messages appear on significant events, then fade.
- **Never block the player:** All HUD elements stay near edges; center is clear.
- **Accessible:** High contrast; keyboard-only; readable at 800×500.

---

## Always-On Elements (during `gameplay` state)

### Coin Counter — Top-Left
```
✦ 3 / 12
```
- Small, 14px, warm white text on semi-transparent dark pill
- Updates on every coin collected
- Brief scale pulse (110% → 100%) on increment
- Hidden during `title` and `end` states

### Objective Indicator — Top-Right
```
Find DaDa →
```
- "Find DaDa" with directional arrow (← or →) based on `goalX - playerX`
- Arrow flips when player passes goal X (impossible in Level 1, but future-proof)
- Hidden once goal reached (after `startGoalCelebration`)
- 13px, warm white, semi-transparent dark pill

### Control Hint Strip — Bottom-Center
```
[A]/[D] Move   [Space] Jump
```
- Small, 12px, visible for the first 5 seconds or until first jump
- Fades out with CSS opacity transition (0.6s)
- Never reappears after fade; removed from DOM to avoid blocking

### Onesie Buff Bar — Bottom-Left (event-based)
```
🧸 ████████░░  8.2s
```
- Appears when onesie buff is active (`onesieBuffTimerMs > 0`)
- Bar fills from left, drains over 10s
- Disappears immediately when buff expires
- Warm yellow bar on dark pill, 11px text

---

## Event-Based Elements

### Status Toast — Top-Left (below coin counter)
```
Midway checkpoint
```
- Shown for 1.2–1.6s on events: checkpoint reached, buff collected, buff expired
- Fades in with CSS transition, fades out after duration
- Already implemented via `ui.showStatus(text, durationMs)`

### Pop Text — Center (large)
```
Da Da!
```
- Large celebratory text shown at goal reach
- Already implemented via `ui.showPopText(text, durationMs)`
- Used for: goal reached, "Nice!" on full coin collection

### Coin Sparkle — In-world at pickup position
- 3D sparkle burst at coin position using JuiceFx
- Gold-colored radial particles
- 0.4s lifespan

### Buff Pickup Flash — In-world
- Glow pulse on player visual (emissive color boost) for 0.3s
- Existing `ui.showStatus()` handles text notification

### Checkpoint Flash — On marker
- Checkpoint marker emissive color changes from base to warm orange
- Already implemented via `activateCheckpoint()` in boot.js

---

## Overlay Screens

### Title Screen
```
DA DA QUEST
A baby's epic journey

[A/D] or [← →] Move  · [Space] Jump  · [M] Mute

Press SPACE or ENTER to start
```
- Warm card over gradient backdrop
- Hint text pulses (dadaPulse animation)
- Input: Space or Enter starts the game

### End Screen
```
DA DA!
You found Da Da!
Great job, baby.

[Play Again]
```
- Appears after goal celebration completes
- Play Again button → restartRun('playAgain')
- Also accepts Space/Enter keyboard input

---

## Accessibility Notes

- **Contrast:** Dark pill backgrounds ensure text is legible on all backdrop colors
- **Size:** Minimum 12px for gameplay text; 13–14px for counters; 18px for buttons
- **Position:** Coin counter top-left; objective top-right; buff bottom-left; hints bottom-center
- **No color-only signals:** Buff bar uses both color + text timer; no status conveyed by color alone
- **Keyboard-only:** All interactions work without mouse (Enter/Space for menus)

---

## Implementation

All HUD elements use HTML/CSS overlays (`#uiRoot` div), consistent with the existing
title and end screens. This avoids Babylon.js GUI overhead and keeps styles in the same
`ui.js` module.

| Element | CSS class | Managed by |
|---|---|---|
| Coin counter | `.dada-coins` | `ui.updateCoins(count, total)` |
| Objective indicator | `.dada-objective` | `ui.showObjective() / updateObjectiveDir()` |
| Control hints | `.dada-controls-hint` | `ui.fadeControlHints()` |
| Buff bar | `.dada-buff` | `ui.updateBuff(ms, maxMs)` |
| Status toast | `.dada-status` | `ui.showStatus(text, ms)` |
| Pop text | `.dada-pop` | `ui.showPopText(text, ms)` |
| Fade overlay | `.dada-fade` | `ui.setFade(alpha)` |
