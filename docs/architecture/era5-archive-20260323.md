# Era 5 3D Archive Inventory

Date: 2026-03-23

Archive refs:
- branch: `archive/era5-3d-squarium`
- tag: `archive-era5-3d-squarium-20260323`
- archived source commit: `899cb18`

Purpose:
- Preserve the full Era 5 3D/free-move/aquatic experiment before removing it from the active `main` progression path.
- Keep historical work recoverable without leaving hybrid 2.5D/Era 5 runtime behavior active on `main`.

## Theme Mapping Used For The Pivot

Authoritative source order:
1. [LEVEL_VISUAL_SPEC.md](/Users/lolm/dadaquest/docs/LEVEL_VISUAL_SPEC.md)
2. [AGENTS.md](/Users/lolm/dadaquest/AGENTS.md) and project planning docs
3. [levelMeta.js](/Users/lolm/dadaquest/src/web3d/world/levelMeta.js)
4. tests only when aligned with the above

Resolved Level 5-9 theme mapping:
- Level 5: `Aquarium Drift`
- Level 6: `Pressure Works`
- Level 7: `Storm Cliffs`
- Level 8: `Haunted Library`
- Level 9: `Lantern Camp`

Known inconsistency:
- [level5.js](/Users/lolm/dadaquest/src/web3d/world/level5.js) currently labels the temporary slice with `theme: 'neutral'`.
- That file is lower-authority than the level spec and active level metadata, so the pivot uses the spec/metadata theme mapping above.

## Archive Entirely

These files or active paths exist to serve the Era 5 3D/free-move/aquatic progression and should not remain active on `main` after the pivot.

World builders and authored slices:
- [buildWorld5.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld5.js)
- [level5.js](/Users/lolm/dadaquest/src/web3d/world/level5.js)
- [buildWorld6.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld6.js)
- [buildWorld7.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld7.js)
- [buildWorld8.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld8.js)
- [buildWorld9.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld9.js)
- [buildEraAdventureWorld.js](/Users/lolm/dadaquest/src/web3d/world/buildEraAdventureWorld.js)
- [buildUnderConstructionWorld.js](/Users/lolm/dadaquest/src/web3d/world/buildUnderConstructionWorld.js) in its current Era 5 placeholder form

Era 5-specific active expectations and proof:
- [runtime-levels.spec.js](/Users/lolm/dadaquest/tests/runtime-levels.spec.js) sections tagged `@era5` and Level 5 authored-space topology expectations
- [screenshot.spec.js](/Users/lolm/dadaquest/tests/screenshot.spec.js) Level 5 / render-policy / under-construction proof slices tied to the Era 5 route
- Era 5 proof screenshots under [docs/screenshots](/Users/lolm/dadaquest/docs/screenshots) and [docs/proof](/Users/lolm/dadaquest/docs/proof) that describe the archived pool/tunnel/chamber or under-construction 3D path

Era 5-only runtime behavior currently mixed into shared files:
- `boot.js` free-move, underwater, Era 5 camera, oxygen, projectile, interact, inventory, and authored-space debug/report paths
- `ui.js` Era 5 HUD, reticle, inventory, teaser, and `level >= 5` control-hint branches
- `progression.js` Era 5 unlock/teaser state
- `levelMeta.js` under-construction/non-playable assumptions for 5-9 as the 3D follow-on era

## Keep On Main Because It Is Generic Or Reusable

These systems are not inherently Era 5-specific and should stay if they continue to serve the active game.

Generic/shared runtime and content:
- [buildWorld.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld.js)
- [buildWorld2.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld2.js)
- [buildWorld3.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld3.js)
- [buildWorld4.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld4.js)
- [PlayerController.js](/Users/lolm/dadaquest/src/web3d/player/PlayerController.js) as the shared controller, provided active main no longer routes Levels 5-9 into free-move
- [renderPolicy.js](/Users/lolm/dadaquest/src/web3d/render/renderPolicy.js), [RENDER_POLICY.md](/Users/lolm/dadaquest/docs/RENDER_POLICY.md), and [check-render-policy.js](/Users/lolm/dadaquest/scripts/check-render-policy.js) because they are general rendering infrastructure
- shared UI/runtime helpers, audio, math, materials, item definitions, and tooling that do not require the archived Era 5 path

Potentially reusable authored data:
- [level6.js](/Users/lolm/dadaquest/src/web3d/world/level6.js)
- [level7.js](/Users/lolm/dadaquest/src/web3d/world/level7.js)
- [level8.js](/Users/lolm/dadaquest/src/web3d/world/level8.js)
- [level9.js](/Users/lolm/dadaquest/src/web3d/world/level9.js)

These files already contain theme-aligned level data and may inform later 2.5D content passes, but they must not remain routed through the active Era 5 builder path.

## Rewrite On Main Because They Are Mixed

These files currently mix generic mainline behavior with Era 5-specific routing and need a cutover rather than a simple delete.

- [boot.js](/Users/lolm/dadaquest/src/web3d/boot.js)
  - currently treats `levelId >= 5` as the Era 5 runtime family
  - must stop routing Levels 5-9 into free-move/aquatic/authored-space logic
- [ui.js](/Users/lolm/dadaquest/src/web3d/ui/ui.js)
  - currently treats `levelId >= 5` as the Era 5 UI family
  - must switch 5-9 back to 2.5D-compatible menu/HUD/control assumptions
- [progression.js](/Users/lolm/dadaquest/src/web3d/util/progression.js)
  - currently stores Era 5 unlock/showcase state
  - must keep sequential level unlocking while dropping active Era 5 teaser behavior
- [levelMeta.js](/Users/lolm/dadaquest/src/web3d/world/levelMeta.js)
  - currently marks 5-9 as under construction / non-playable follow-on Era 5 levels
  - must become the active source for 2.5D Level 5-9 metadata instead

## What The Archive Preserves

The archive refs preserve the complete historical Era 5 experiment, including:
- free-move Level 5+ gameplay behavior
- aquatic pool/tunnel/chamber slice work
- Era 5-specific authored-space world builders
- Era 5 local camera/occlusion/tunnel logic
- Era 5 oxygen/tool/projectile/inventory behavior
- Era 5 under-construction gating and proof assets
- all historical tests and debug hooks tied to that runtime family
