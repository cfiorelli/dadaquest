# Levels 5-9 Active Pivot - 2026-03-23

## Active mainline state

- Levels `1` through `4` remain on their existing shipped `2.5D` path.
- Levels `5` through `9` now also run on the active `2.5D` path on `main`.
- The previous Era 5 `3D/free-move/aquatic` experiment is archived and no longer defines active gameplay routing on `main`.

## Archive references

- Branch: `archive/era5-3d-squarium`
- Tag: `archive-era5-3d-squarium-20260323`
- Inventory document: [era5-archive-20260323.md](/Users/lolm/dadaquest/docs/architecture/era5-archive-20260323.md)

## Theme mapping used on main

- Level 5: `Aquarium Drift` (`themeKey: aquarium`)
- Level 6: `Pressure Works` (`themeKey: factory`)
- Level 7: `Storm Cliffs` (`themeKey: storm`)
- Level 8: `Haunted Library` (`themeKey: library`)
- Level 9: `Lantern Camp` (`themeKey: camp`)

Source precedence used for this mapping:

1. [LEVEL_VISUAL_SPEC.md](/Users/lolm/dadaquest/docs/LEVEL_VISUAL_SPEC.md)
2. repo rules/planning docs
3. [levelMeta.js](/Users/lolm/dadaquest/src/web3d/world/levelMeta.js)

## Active implementation

- Metadata and progression live in [levelMeta.js](/Users/lolm/dadaquest/src/web3d/world/levelMeta.js).
- Runtime routing lives in [boot.js](/Users/lolm/dadaquest/src/web3d/boot.js).
- Levels `5` through `9` launch through [buildWorld5Plus2d.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld5Plus2d.js).
- Archived Era 5 proofs and tests remain as historical references only and are explicitly skipped on active mainline.

## Placeholder contract for now

Each of Levels `5` through `9` currently provides:

- coherent title/menu entry
- correct theme title and copy
- active `2.5D` runtime family
- simple scaffolded start/goal/platform layout
- no dependency on the archived pool/tunnel/chamber route

## Known inconsistency carried forward

- [level5.js](/Users/lolm/dadaquest/src/web3d/world/level5.js) still contains archived Era 5 authored data with `theme: 'neutral'`.
- Active mainline ignores that file for normal Level 5 launch routing.
- The authoritative active theme for Level 5 on `main` is `Aquarium Drift` from metadata/spec sources above.
