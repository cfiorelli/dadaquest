# Level Visual Identity Spec — Corrective Pass 2

## Goal
Levels 5–9 must be distinguishable from screenshots alone, even with the UI cropped off.
Each must have a distinct visual identity through space shape, structural framing, color,
lighting, landmarks, and environmental density — not through palette swaps or darkness.

## Non-Goals
- Changing gameplay mechanics, hazard counts, or binky positions
- Changing Levels 1–4
- Adding new gameplay features

## Why Previous Pass Failed
1. **Darkness instead of identity**: clearColor was near-black for all era themes (L6 [34,24,16],
   L7 [14,20,38], L8 [20,13,10], L9 [8,11,20], L5 not set = black). Entire scenes read as
   dark voids with barely visible colored platforms.
2. **Flat transparent backdrops**: All environment FX used semi-transparent planes at Z=farZ+5
   (Z=21) as backdrops — barely opaque (alpha 0.26–0.34 on structural elements), invisible
   against near-black sky.
3. **No spatial enclosure**: Levels read as "a runway in a void" — no side walls framing the lane,
   no ceiling structure, no surrounding world volume.
4. **Shallow differentiation**: Theme differentiation limited to platform edge colors and small
   decor details, not composition, shape, or architectural language.

## Visual Identity Plan

### Level 5 — Aquarium (buildWorld5.js)
- **Space**: Glass-enclosed habitat tank. Visible blue-green sea-teal background.
- **Ceiling/overhead**: Caustic light patterns above (existing, more visible).
- **Near wall language**: Glass panels with neon aqua frame borders at Z=6.5 and Z=8.5,
  clearly visible as the tank sides.
- **Background**: Deep blue-green layered depth — fish silhouettes, depth columns.
- **Lighting**: Blue-green caustic, bright sea-teal clear color [0.04, 0.22, 0.38].
- **Signature**: You are inside an aquarium tank. Bubbles, fish shadows, glass panels.

### Level 6 — Factory (theme: 'factory')
- **Space**: Industrial processing bay. Warm amber glow. Enclosed with visible walls.
- **Near wall language (Z=13)**: Factory bay wall spanning full level — dark steel with
  glowing industrial window bays.
- **Background**: Tall smokestack silhouettes at far-Z, girder columns throughout.
- **Overhead**: Steam vents and industrial framing.
- **Lighting**: Warm amber sodium-vapor glow. clearColor [68, 48, 28].
- **Signature**: Factory machinery, amber glow, smokestacks, industrial architecture.

### Level 7 — Storm (theme: 'storm')
- **Space**: Open-air canyon ridge. Storm sky visible above. Rocky cliffs frame both sides.
- **Near wall language (Z=13)**: Rocky cliff face spanning level — strong blue-grey silhouette.
- **Background**: Dark cliff/tower shapes at far-Z. Dramatic storm clouds at Y=14–18.
- **Overhead**: Open stormy sky — visible storm cloud masses, kites, wind ribbons.
- **Lighting**: Cool blue-white storm light. clearColor [42, 64, 108].
- **Signature**: Open canyon, stormy blue sky, rocky cliffs, wind/rain effects.

### Level 8 — Library (theme: 'library')
- **Space**: Grand library hall. Warm amber candlelight. Bookcase walls visible.
- **Near wall language (Z=13)**: Bookcase wall spanning full level with visible shelf lines
  every 2.8 units — unmistakably a library.
- **Background**: Deep shelving, arches, moonbeam windows at far-Z.
- **Overhead**: Vaulted arch framing. Floating pages and dust motes.
- **Lighting**: Warm sepia amber reading light. clearColor [58, 38, 22].
- **Signature**: Bookshelves, warm amber, floating pages, library arch architecture.

### Level 9 — Camp (theme: 'camp')
- **Space**: Forest clearing amphitheater. Deep starlit night sky. Pine trees frame sides.
- **Near wall language (Z=13)**: Dense forest wall — nearly opaque dark tree silhouettes
  spanning the level. Individual tree trunks at Z=11 in front.
- **Background**: Mountain silhouettes at far-Z. Starfield above.
- **Overhead**: Star-filled canopy — highly visible twinkling stars.
- **Lighting**: Deep night blue-purple sky, warm orange campfire glow as contrast.
  clearColor [28, 40, 74].
- **Signature**: Forest night, stars, campfire glow, pine tree silhouettes.

## Structural Additions Per Level
Each level gains a "near wall" at Z=13 that spans the full level length. This eliminates
the runway-in-a-void look by placing a distinct, nearly-opaque architectural backdrop
immediately behind the gameplay lane. The near wall has a DIFFERENT design per theme:
- L6 Factory: Dark steel panels + glowing industrial windows
- L7 Storm: Rocky cliff face (grey-blue, rough)
- L8 Library: Wooden bookcase pattern with horizontal shelf lines
- L9 Camp: Dense forest silhouette (dark pine, varied heights)
- L5 Aquarium: Glass panels at Z=6.5 and Z=8.5 (smaller farZ=9.5)

## Lighting Changes
- All era levels: clearColor raised 2–4x brighter
- All era levels: fogStart moved further out (less aggressive fogging)
- All era levels: hemiIntensity increased for better ambient fill
- L5: clearColor set to sea-teal instead of default black

## Acceptance Criteria
1. Each of Levels 5–9 is immediately identifiable from a screenshot without UI.
2. No two levels share the same visual read or screenshot "signature."
3. All levels bright enough to read without brightness correction.
4. At least 3 of Levels 5–9 break the straight-lane read with overhead/side structure.
5. Every level has at least 2 large landmark silhouettes.
6. Gameplay elements (hazards, pickups, platforms, checkpoints) remain readable.
7. All tests pass for levels 5–9 progression.
