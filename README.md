# DaDaQuest

Crafted 3D diorama platformer built with Babylon.js.

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
npm test
npx playwright test -g smoke --project=chromium
npx playwright test -g screenshot --project=chromium
```

## Deterministic Modes

- `?test=1`
  - Fast smoke path.
  - Skips Babylon/WebGL.
  - Deterministically advances to `EndScene`.

- `?shot=1`
  - Deterministic render path for screenshots.
  - Uses fixed frame capture and sets `window.__DADA_DEBUG__.shotReady = true`.

## Assets

Asset pipeline scaffolding is in place:
- `public/assets/glb/`
- `public/assets/audio/`
- `public/assets/textures/`

Optional GLB loading is handled by `src/web3d/util/assets.js` via
`public/assets/glb/manifest.json`. If no model is listed, the game cleanly falls
back to primitive diorama meshes.
