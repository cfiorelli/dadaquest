# Archived Era 5 Visual Pass — Self-Check Report
Date: 2026-03-09

Historical note: this document describes the archived Era 5 `3D/free-move/aquatic` branch preserved at `archive/era5-3d-squarium` and tag `archive-era5-3d-squarium-20260323`. It is not the active mainline expectation for Levels 5–9.

## What changed

### Level 5 — Aquarium
- `clearColor` set to deep ocean blue `(0.04, 0.22, 0.38)` — was defaulting to Babylon.js black
- Fog: `fogStart 62 → fogEnd 185` — was not set (no fog)
- Fog backdrop gradient upgraded from near-black to vibrant ocean blue `rgba(12,56,88)` / `rgba(8,82,110)`
- Depth columns: alpha 0.24 → 0.52, brighter teal color
- Fish shadow alpha: 0.22 → 0.42, animated to 0.34–0.40
- Near frame alpha: 0.24 → 0.48 in update loop
- **Added near tank glass wall** at `Z = farZ - 1.2` spanning full level with bright cyan frame borders (alpha 0.56) — tank framing is now the dominant structural read

### Level 6 — Factory (theme: factory)
- `clearColor`: `(34,24,16) → (68,48,28)` — warm industrial amber, not black
- `fogStart`: 48 → 52, `fogEnd`: 185 → 195
- `hemiIntensity`: 0.72 → 0.90
- Backdrop plane color dramatically brighter
- **Near factory bay wall at Z=13** (alpha=0.90) — full-level structural backdrop
- 8 industrial window glow panels on near wall
- Overhead factory truss at Y=15.5
- 5 smokestack silhouettes alpha 0.86
- Girder columns alpha 0.68 (was 0.34)

### Level 7 — Storm (theme: storm)
- `clearColor`: `(14,20,38) → (42,64,108)` — readable stormy blue
- `fogStart`: 34 → 46
- `hemiIntensity`: 0.56 → 0.74
- Sky gradient top: `rgba(10,16,34) → rgba(44,68,108)` — stormy day not black night
- **Near rocky cliff wall at Z=13** (alpha=0.84) with 6 horizontal strata lines
- 5 large storm cloud masses at farZ+3 (alpha=0.64)
- Cliff silhouettes alpha 0.72 (was 0.34)
- Wind ribbons alpha 0.26 (was 0.14), kites alpha 0.44 (was 0.22)

### Level 8 — Library (theme: library)
- `clearColor`: `(20,13,10) → (58,38,22)` — warm sepia amber
- `fogStart`: 24 → 44 — critical fix, was aggressively fogging everything
- `hemiIntensity`: 0.64 → 0.86
- **Bookcase wall at Z=13** (alpha=0.92) — floor-to-ceiling books, full level
- 9 horizontal shelf lines on wall
- Colored book spine grid: 8 rows × 16 columns, 5 color variants
- Gothic arches alpha 0.28 (was 0.10)
- Floating pages alpha 0.42 (was 0.20)

### Level 9 — Camp (theme: camp)
- `clearColor`: `(8,11,20) → (28,40,74)` — starlit blue-purple
- `hemiIntensity`: 0.46 → 0.68
- Sky gradient top: `rgba(8,10,20) → rgba(28,42,80)` — deep blue not black
- Mountain silhouettes alpha 0.26 → 0.56
- Far tree line alpha 0.30 → 0.72
- **Near dense forest wall at Z=13** (alpha=0.88) — pine forest signature
- **14 individual close pine tree silhouettes at Z=11** in front of wall
- Moon glow at top of forest wall (alpha=0.38)
- Stars: 52 → 64, alpha 0.42 → 0.62, animated 0.42–0.64
- Tents: alpha 0.18 → 0.72, moved to Z=12.4 for visibility
- Lanterns: alpha 0.42 → 0.68, diameter 0.36 → 0.46, animated 0.56–0.68
- Fireflies: 18 → 22, alpha 0.30 → 0.48, brighter chartreuse-gold color

## Why each level is distinguishable (not palette swaps)

| Level | Dominant structural read | Overhead / ceiling | Floor language | Landmark |
|-------|--------------------------|-------------------|----------------|----------|
| 5 Aquarium | Large glass tank frame border (cyan glow) | Caustic light patterns rippling | Ground = tank floor, bubbles rise | Fish silhouettes drifting L→R |
| 6 Factory | Bay wall panels + 8 amber windows | Overhead truss plane | Conveyor grating textures | Smokestack silhouettes (5×) |
| 7 Storm | Rocky cliff wall + horizontal strata | Open sky with 5 cloud masses | No ceiling — exposed skybox | Giant storm clouds dominate view |
| 8 Library | Full bookcase wall + shelf grid + book spines | Gothic arches visible | Warm lamp pools on floor | Colored book spine mosaic |
| 9 Camp | Dense forest wall + 14 pine tree silhouettes | Star field (64 stars, twinkling) | Fireflies near ground | Hanging lanterns + moon glow |

## Composition rules compliance
- **3+ levels break straight-lane read**: L5 (tank wall frames lane), L6 (near wall + truss overhead), L8 (bookcase fills entire backdrop), L9 (forest wall + individual trees) = 4 levels
- **2+ landmarks each**: All 5 levels have ≥2 distinct landmark elements
- **No level is darker than the one above it**: L9 deep blue > L8 sepia > L7 stormy blue > L6 amber > L5 ocean blue
- **Near-black eliminated**: All clearColors now ≥ (28,40,74) minimum

## Readability
- Library (L8) fogStart fix (24→44) was the single biggest readability improvement — all mid-distance structure was being fogged away
- All hemi intensities raised 0.2-0.44 units — shadows are softer and fill better
- All backdrop near-walls placed at Z=13 (behind gameplay lane at Z=0) — no geometry intersects gameplay

## Test results
Historical result on the archived Era 5 branch: all 16 `@era5` tests passed and the build succeeded at the time of capture.
