# DaDaQuest

Crafted 3D diorama platformer built with Babylon.js, with deterministic test/shot modes and a manifest-driven model pipeline.

## Live

https://cfiorelli.github.io/dadaquest/

## Local Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://127.0.0.1:5173`).

## Controls

- `A / D` or `Left / Right`: move
- `Space`: jump
- `Shift`: sprint
- `Enter` or `Space` on title: start
- `M`: mute/unmute

## Level 1 Objective

Reach DaDa on the rooftop.

Path beats:
- Safe tutorial start + first hop
- Vertical stack section
- Onesie pickup jump boost
- Slip-zone hazard section
- Rooftop finish

## Test Commands

```bash
npm run test:fast
npm run test:level5
npm run test:era5
npm run test:full
npm run test:screenshot
```

Testing workflow details live in [TESTING.md](./TESTING.md).

## Process Packets

Use the repo task-packet system for future Codex work:

- [AGENTS.md](./AGENTS.md)
- [docs/process/CODEX_TASK_PACKETS.md](./docs/process/CODEX_TASK_PACKETS.md)
- [docs/process/PHASE_GATES.md](./docs/process/PHASE_GATES.md)
- [docs/process/templates/](./docs/process/templates/)

## Deterministic Modes

- `?test=1`
  - Fast smoke path.
  - Skips Babylon/WebGL.
  - Deterministically advances to `EndScene`.

- `?shot=1`
  - Deterministic render path for screenshots.
  - Uses fixed frame capture and sets `window.__DADA_DEBUG__.shotReady = true`.

## Debug Mode

- `?debug=1` enables debug-only runtime helpers on `window.__DADA_DEBUG__` (lane/collectible audits, actor state, build SHA).

## Assets

Runtime-served assets:
- `public/assets/models/characters/`
- `public/assets/models/props/`
- `public/assets/models/platforms/`
- `public/assets/packs/kenney/`
- `public/assets/packs/quaternius/`
- `public/assets/audio/`
- `public/assets/hdr/`
- `public/assets/ui/`

Manifest source of truth:
- `public/assets/manifest.json`
- Role-driven loading: `src/web3d/util/assets.js`

Local staging/source (not required by runtime):
- `assets/`
- `assets-src/`
