# Render Policy

## Source Of Truth

All shared Babylon render-order and transparency settings for gameplay-visible translucent systems live in:

- `src/web3d/render/renderPolicy.js`

Direct assignment of the following properties anywhere else in active source is forbidden unless the file is in the documented legacy exception list enforced by the repo check:

- `renderingGroupId`
- `alphaIndex`
- `needDepthPrePass`
- `forceDepthWrite`
- `disableDepthWrite`
- `transparencyMode`
- `backFaceCulling`

Run the enforcement check with:

```bash
npm run check:render-policy
```

## Categories

| Category | Helper | Group | Alpha Index | Transparency | Depth Prepass | Depth Write | Backface Culling |
| --- | --- | ---: | ---: | --- | --- | --- | --- |
| World opaque | `applyWorldOpaqueRenderPolicy` | 1 | 0 | preserve | false | true | true |
| World alpha | `applyWorldAlphaRenderPolicy` | 2 | 200 | alpha blend | true | false | false |
| Water surface | `applyWaterSurfaceRenderPolicy` | 3 | 100 | alpha blend | true | false | false |
| Underwater overlay | `applyUnderwaterOverlayRenderPolicy` | 3 | 800 | alpha blend | false | false | false |
| Held item | `applyHeldItemRenderPolicy` | 4 | 1000 | alpha blend | true | true | false |
| Projectile | `applyProjectileRenderPolicy` | 4 | 900 | alpha blend | true | true | false |
| Enemy alpha | `applyEnemyAlphaRenderPolicy` | 3 | 250 | alpha blend | true | false | false |
| VFX | `applyVfxRenderPolicy` | 3 | 500 | alpha blend | false | false | false |
| Legacy decor opaque | `applyLegacyDecorOpaqueRenderPolicy` | 2 | 0 | preserve | preserve | preserve | preserve |
| Legacy overlay opaque | `applyLegacyOverlayOpaqueRenderPolicy` | 3 | 0 | preserve | preserve | preserve | preserve |
| Legacy backdrop cutout | `applyLegacyBackdropCutoutRenderPolicy` | 0 | 0 | alpha test | true | true | preserve |
| Legacy midground cutout | `applyLegacyMidgroundCutoutRenderPolicy` | 1 | 0 | alpha test | true | true | preserve |
| Legacy foreground cutout | `applyLegacyForegroundCutoutRenderPolicy` | 4 | 0 | alpha test | true | true | preserve |

The helper names above are the only approved path for future gameplay-visible translucent work.

## Current Legacy Exceptions

The enforcement check currently allows legacy direct render-property writes in these untouched files:

- `src/web3d/player/babyVisual.js`
- `src/web3d/world/characters.js`
- `src/web3d/world/cutouts.js`
- `src/web3d/world/buildEraAdventureWorld.js`
- `src/web3d/world/buildWorld.js`
- `src/web3d/world/buildWorld2.js`
- `src/web3d/world/buildWorld3.js`
- `src/web3d/world/buildWorld4.js`

These remain allowed only to preserve existing shipped behavior until they are migrated.

`src/web3d/boot.js` is no longer in the exception list. Its previous direct group/cutout/fade assignments now route through the shared policy module.

## Visibility Validation Matrix

Held item:
- visible above water
- visible underwater
- visible at waterline

Projectile:
- visible above water
- visible underwater
- visible against floor
- visible against wall
- visible crossing waterline

Enemy translucent meshes:
- visible against floor
- visible against wall
- visible near water

Water / overlay:
- does not incorrectly occlude held item
- does not incorrectly occlude projectile

## Current Live-Proof Status

Built-preview proof currently covers the Level 5 waterline path for held item and projectile readability. Enemy-alpha live proof is not complete yet because the current bounded Level 5 graybox slice does not spawn jellyfish in normal play.
