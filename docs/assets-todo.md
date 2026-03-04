# Asset Pipeline TODOs

This repo now supports optional GLB imports through `src/web3d/util/assets.js` and
`public/assets/glb/manifest.json`.

No authored `.glb` assets are currently checked in. Primitive diorama meshes are
used as the active fallback.

## Next assets to add

1. `public/assets/glb/dad-goal.glb`
   - Hero DaDa goal model for rooftop ending.
2. `public/assets/glb/checkpoint-sign.glb`
   - Crafted checkpoint marker prop.
3. `public/assets/glb/onesie-pickup.glb`
   - Onesie pickup hero prop.

## How to activate a model

1. Place `.glb` in `public/assets/glb/`.
2. Add its filename to `public/assets/glb/manifest.json` under `models`.
3. Loader will auto-attempt import in normal mode and fall back safely if missing.
