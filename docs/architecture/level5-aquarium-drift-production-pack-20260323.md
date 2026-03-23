# Level 5 Production Pack - Aquarium Drift

Date: 2026-03-23
Bead: `5.01`
Status: Locked production pack for Level 5 only

## Scope

This document is the build contract for Level 5 `Aquarium Drift`.

It exists to replace the active placeholder route in [buildWorld5Plus2d.js](/Users/lolm/dadaquest/src/web3d/world/buildWorld5Plus2d.js), which currently contains:
- `1` ground slab
- `5` named platforms
- `1` checkpoint
- `1` visible goal plinth
- no act structure
- no optional branches
- no real hazard or enemy ladder

This pack defines the full commercial-grade Level 5 route before any production implementation beads beyond `5.01`.

## Brief Resolution Notes

The locked campaign brief contains two internal Level 5 conflicts. This pack resolves them explicitly so later beads stay stable.

1. `E2` puddle timing versus bead order
- [levels5-9-commercial-production-brief-20260323.md](/Users/lolm/dadaquest/docs/architecture/levels5-9-commercial-production-brief-20260323.md) says `5.04` teaches slick deck in `E1` and `E2`.
- The same brief says `5.13` locks `E2` as the first puddle-timing teach.
- Resolution used here:
  - `E2` is authored as a public wet-lane teach space in `5.04`.
  - `5.06` upgrades that same geometry with the first low-stakes electrified puddle cycle.
  - The final locked version of `E2` is the first puddle-timing teach.

2. Act 4 encounter count
- The high-level distribution line implies `2 remix encounters + elite gate`.
- The exact bead ladder only names `E10` elite gate and `E11` remix space for Act 4.
- Resolution used here:
  - Act 4 mainline contains exactly `2` spaces: `E10` and `E11`.
  - This preserves the locked `14` mainline encounter count.

## A. Macro Route Map

### Mainline time budget

- Act 1 Public Entry Decks: `10` min
- Act 2 Broken Viewing Gallery: `12` min
- Act 3 Service Spine: `11` min
- Act 4 Pump and Filter Core: `8` min
- Act 5 Crown Tank Run: `11` min

Mainline first-clear target:
- `52` min

Completionist first-clear target with both optional branches:
- `59` to `60` min

### Route spine in order

#### Act 1 - Public Entry Decks

1. `L5-E1` Ticket Hall Drip Apron
2. `L5-E2` Voltage Mop Walk
3. `L5-E3` Stingrail Jet Bridge
4. `CP1` Ticketing Service Door

Act purpose:
- teach wet traction
- teach first safe timing read
- establish that public deck safety is unreliable

Timing challenge:
- `L5-E3` jet-bridge burst timing

Recognition/routing challenge:
- `L5-E2` identify safe dry lane versus pulsing puddle lane

#### Act 2 - Broken Viewing Gallery

5. `L5-E4` Cracked Panorama Gallery
6. `L5-E5` Eel Grate Crosswalk
7. `L5-E6` Rotunda Spray Bridge
8. `CP2` Rotunda Locker Rail

Act purpose:
- combine public-route failure with more hostile hazard layering
- introduce the first short moving bridge timing

Timing challenge:
- `L5-E6` short moving bridge under spray-bar cadence

Recognition/routing challenge:
- `L5-E4` choose safe jet/puddle lane based on cracked gallery state

#### Act 3 - Service Spine

9. `L5-E7` Drainage Spine Catwalk
10. `L5-E8` Filter Drop Gallery
11. `L5-OB1` Quarantine Pipe Loop
12. `L5-E9` Wet Relay Gantry
13. `CP3` Relay Tool Cage

Act purpose:
- shift trust to service space
- make routes tighter, meaner, and more technical
- introduce controlled drops as a deliberate route tool

Timing challenge:
- `L5-E7` spray-bar timing over crumble service catwalk

Recognition/routing challenge:
- `L5-E8` decide whether to stay high briefly or commit to the lower service drop

#### Act 4 - Pump and Filter Core

14. `L5-E10` Saw Ray Intake Chamber
15. `L5-E11` Pump Crown Bypass
16. `CP4` Upper Filter Lock

Act purpose:
- force true mastery with the elite gate
- remix previously learned hazards under higher stress

Timing challenge:
- `L5-E10` elite pressure plus jet/puddle windows

Recognition/routing challenge:
- `L5-E11` read the safe bypass cadence through pump-core machinery

#### Act 5 - Crown Tank Run

17. `L5-E12` Exterior Crown Rail
18. `L5-E13` Cracked Glass Traverse
19. `L5-OB2` Skylight Service Loop
20. `L5-E14` Overflow Crown Run
21. Goal: `Crown Evac Lock`

Act purpose:
- deliver the final mastery run
- combine public spectacle geometry with service-route survival logic

Timing challenge:
- `L5-E14` final chain of moving bridge, spray-bar, jet, and puddle windows

Recognition/routing challenge:
- `L5-E13` choose trustworthy glass sequence under enemy pressure

### Checkpoint positions

- `CP1 Ticketing Service Door`
  - after `L5-E3`
  - before the first broken-gallery descent
- `CP2 Rotunda Locker Rail`
  - after `L5-E6`
  - before the service route commits
- `CP3 Relay Tool Cage`
  - after `L5-E9`
  - before the elite gate
- `CP4 Upper Filter Lock`
  - after `L5-E11`
  - before the final mastery act

### Optional branch positions

- `L5-OB1 Quarantine Pipe Loop`
  - branches off the lower route exit of `L5-E8`
  - rejoins before `L5-E9`
  - shorter than the safe upper recovery walk, but more dangerous

- `L5-OB2 Skylight Service Loop`
  - branches off the midpoint of `L5-E13`
  - rejoins at the start of `L5-E14`
  - faster and more rewarding, but exposed to denser hazard stacking

## B. Encounter Inventory Table

| ID | Act | Space Name | Primary Mechanic | Hazards Used | Enemies Used | Special Role | Est. Clear |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `L5-E1` | 1 | Ticket Hall Drip Apron | Slick deck compare-and-contrast | Slick deck footing only | None | Teach | `2.5` min |
| `L5-E2` | 1 | Voltage Mop Walk | First puddle-timing read on public deck | Electrified puddle bands, slick deck | None | Teach / short breather exit | `3.0` min |
| `L5-E3` | 1 | Stingrail Jet Bridge | First true combine over a narrow bridge | Current jets | Shock Jelly | First combine | `4.5` min |
| `L5-E4` | 2 | Cracked Panorama Gallery | Route read through broken public gallery | Current jets, electrified puddles | None | Combine | `4.0` min |
| `L5-E5` | 2 | Eel Grate Crosswalk | Punish lane greed near wall grates | Electrified puddles | Moray Snapper | Combine | `4.0` min |
| `L5-E6` | 2 | Rotunda Spray Bridge | First short moving bridge timing | Rotating spray bars, current jets | Shock Jelly | Combine | `4.0` min |
| `L5-E7` | 3 | Drainage Spine Catwalk | Tight service-path footing under pressure | Rotating spray bars, crumbling glass floors | Service Skater Bot | Punish | `3.5` min |
| `L5-E8` | 3 | Filter Drop Gallery | Controlled drop choice into lower service line | Crumbling glass floors, electrified puddles | Moray Snapper | Punish / route split | `3.5` min |
| `L5-OB1` | 3 | Quarantine Pipe Loop | Harder short branch through sealed pipe service line | Current jets, crumbling glass floors, electrified puddles | Moray Snapper, Service Skater Bot | Optional / reward | `3.5` min |
| `L5-E9` | 3 | Wet Relay Gantry | Service-route combine under shove pressure | Current jets, slick deck, spray bars | Service Skater Bot | Punish / checkpoint lead-in | `4.0` min |
| `L5-E10` | 4 | Saw Ray Intake Chamber | Elite gate over intake lanes | Current jets, electrified puddles | Saw Ray, Shock Jelly | Elite gate | `4.5` min |
| `L5-E11` | 4 | Pump Crown Bypass | Remix all service skills in a dense bypass | Rotating spray bars, crumbling glass floors, slick deck | Service Skater Bot | Remix | `3.5` min |
| `L5-E12` | 5 | Exterior Crown Rail | Exposed final-act balance and bridge timing | Current jets, rotating spray bars | Shock Jelly | Mastery | `3.5` min |
| `L5-E13` | 5 | Cracked Glass Traverse | Trust/no-trust route reading on unsafe glass | Crumbling glass floors, electrified puddles | Moray Snapper | Mastery / branch split | `3.5` min |
| `L5-OB2` | 5 | Skylight Service Loop | High-risk fast line above the crown tank | Current jets, spray bars, crumble floors | Service Skater Bot, Shock Jelly | Optional / reward | `4.5` min |
| `L5-E14` | 5 | Overflow Crown Run | Final mastery chain and goal stretch | Current jets, electrified puddles, rotating spray bars, crumbling glass floors | Shock Jelly, Service Skater Bot | Final mastery / goal | `4.0` min |

## C. Geometry Kit Inventory

### Reusable kit

#### Platforms

- `public_deck_straight_10`
  - `10m x 4m`
  - broad public route slab
- `public_deck_straight_14`
  - `14m x 4m`
  - main gallery runway
- `service_catwalk_straight`
  - `8m x 2.8m`
  - narrow service traversal line
- `service_catwalk_narrow`
  - `6m x 1.8m`
  - punish-space catwalk
- `glass_walk_tile`
  - `3m x 3m`
  - supports crack and crumble variants
- `drop_receiver_pad`
  - `4m x 4m`
  - controlled-drop landing pocket

#### Bridges

- `inspection_bridge_short_mover`
  - `6m x 2m`
  - timed extension/retraction or timed shuttle bridge
- `jet_bridge_narrow`
  - `8m x 1.6m`
  - fixed narrow bridge used with current jets
- `crown_rail_bridge`
  - `7m x 1.8m`
  - exposed final-act bridge

#### Moving pieces

- `spray_bar_rotor_single`
  - `5m` sweep span
- `spray_bar_rotor_double`
  - mirrored pair for tighter cadence spaces
- `inspection_bridge_carrier`
  - short timing bridge mover
- `pump_shutter_gate`
  - visual rhythm gate for filter-core bypasses

#### Hazard volumes

- `current_jet_lane_short`
  - `8m x 2.5m`
- `current_jet_lane_long`
  - `12m x 2.5m`
- `puddle_band_single`
  - `3m x lane width`
- `puddle_band_double`
  - `6m x lane width`
- `spray_sweep_arc`
  - linked to spray-bar rotor
- `crumble_tile_cluster_2x2`
  - `4` tiles
- `crumble_tile_cluster_3x2`
  - `6` tiles

#### Background pieces

- `tank_window_frame_large`
- `tank_window_frame_small`
- `public_railing_straight`
- `public_railing_corner`
- `service_pipe_bundle_low`
- `service_pipe_bundle_tall`
- `maintenance_cabinet`
- `filter_grate_wall`
- `pump_column_stack`

#### Occluders

- `tank_bulkhead_block`
- `service_pipe_occluder`
- `filter_vat_occluder`
- `collapsed_gallery_wall`
- `pump_casing_occluder`

### Hero pieces

- `panorama_crack_wall_hero`
  - Act 2 gallery failure setpiece
- `rotunda_tank_ring`
  - Act 2 centerpiece
- `filter_drop_chasm`
  - Act 3 controlled-drop hero piece
- `saw_ray_intake_turbine`
  - Act 4 elite chamber hero piece
- `pump_core_crown_machine`
  - Act 4 to Act 5 transition hero piece
- `crown_tank_outer_shell`
  - Act 5 spectacle backdrop
- `overflow_crown_goal_lock`
  - final goal hero piece

## D. Enemy Roster Sheet

| Enemy | Role | Move Pattern | Pressure Pattern | Counterplay | First Introduced | Mastered |
| --- | --- | --- | --- | --- | --- | --- |
| `Shock Jelly` | Owns narrow bridge airspace and forces timing pauses | Hover in short lateral drifts, pulse in place, re-center over bridge lanes | Repeating pulse radius forces stop-and-go movement over jets and spray bars | Wait out pulse, bait from bridge lip, or burst past in safe window | `L5-E3` | `L5-E12` and `L5-E14` |
| `Moray Snapper` | Punishes wall-hugging and greedy close-lane routing | Hidden in grate or crack slot, snaps outward on proximity or lane commitment | Creates delayed ambush pressure that narrows the “safe” wall-side route | Read grate tell, bait the snap, then cross opposite lane | `L5-E5` | `L5-E13` and `L5-OB1` |
| `Service Skater Bot` | Shove pressure on maintenance lines and catwalks | Patrols a short route, bursts forward, rebounds, reacquires path | Forces the player off the comfortable line during service traversal | Interrupt between bursts, respect patrol rhythm, use wider pads to reset | `L5-E7` | `L5-E11` and `L5-E14` |
| `Saw Ray` | Elite route-denial gate that dominates a chamber | Wide sweeping charge arcs, hover resets, lane sweeps around intake geometry | Controls the player’s preferred path while hazards make stalling dangerous | Read charge windup, force angle changes, punish recovery windows after sweeps | `L5-E10` | `L5-E10` phased completion |

## E. Hazard Roster Sheet

| Hazard | Visual Tell | Active Window | Safe Window | Failure Mode | Acts Used In |
| --- | --- | --- | --- | --- | --- |
| `Current jets` | nozzle lights, floor arrows, bubble/fog push direction | `1.2s` hard push burst or sustained directional push during marked cycle | `1.0s` low-pressure recovery window | shoved into gap, enemy lane, or off narrow bridge | Acts `1`, `2`, `4`, `5` |
| `Electrified puddle bands` | floor strip lights, blue crackle, rising charge hum | `1.4s` active shock window | `1.6s` safe traversal window | health loss and route denial; forces retreat or alternate lane | Acts `1`, `2`, `3`, `4`, `5` |
| `Rotating spray bars` | motor chirp, visible nozzle sweep, pre-spray mist | `2.2s` sweep across the lane | `1.0s` clear pocket between sweeps | knockback, lost footing, or forced retreat into another hazard | Acts `2`, `3`, `5` |
| `Crumbling glass floors` | fracture glow, creak sound, spidering crack decal | `0.8s` warning then collapse | safe only if player commits off the tile before break | drop to damage lane or lower route; route trust loss | Acts `3`, `4`, `5` |

## F. Traversal Mechanic Sheet

### Level-specific traversal mechanic

`Trust Shift Routing`

Level 5’s traversal identity is not just “jump farther.”
It is the learned rule that:
- safe-looking public surfaces are often slick or trapped
- short service bridges are safer but timed
- the fastest survival route sometimes requires a deliberate controlled drop into service space

### Taught

- `L5-E1`
  - safe dry floor versus slick public floor
- `L5-E2`
  - first timing read on an unsafe public lane
- `L5-E6`
  - first short moving bridge timing
- `L5-E8`
  - first controlled drop to lower service path

### Combined

- `L5-E7`
  - slick recovery plus spray timing on a narrow service catwalk
- `L5-E8`
  - route recognition plus controlled drop
- `L5-E9`
  - service path timing under shove pressure
- `L5-E12`
  - public spectacle route with service-timing bridge logic

### Mastered

- `L5-E13`
  - route trust decisions over cracked glass
- `L5-E14`
  - final chain combining footing, moving bridge timing, hazard cadence, and route trust

## G. Pacing Sheet

### Expected time per act

- Act 1: `10` min
- Act 2: `12` min
- Act 3: `11` min
- Act 4: `8` min
- Act 5: `11` min

### Breather spaces

- after `L5-E2`
  - short overlook where the player sees the first broken gallery ahead
- after `CP2`
  - locker-rail reset pocket before service descent
- after `L5-E11` / `CP4`
  - quiet upper filter lock before the final mastery act

These are not empty rooms.
They are short visual and recovery pockets with immediate forward read.

### Elite gate

- `L5-E10 Saw Ray Intake Chamber`
- occupies the front half of Act 4
- must feel like the player’s preferred clean route has been seized by aquarium machinery and a hostile predator

### Final mastery run

- `L5-E12` -> `L5-E13` -> `L5-E14`
- no long dead stretch between them
- each space removes one fallback:
  - `E12` removes easy footing
  - `E13` removes route trust
  - `E14` removes spare timing margin

### Time-to-clear target summary

- mainline first clear: `52` min
- one optional branch: `55` to `56` min
- both optional branches: `59` to `60` min

### Dead-time removal rules for later beads

- no act may contain more than `12` seconds of unpressured traversal between authored decisions
- any traversal connector longer than that must carry:
  - enemy pressure, or
  - hazard pressure, or
  - route-recognition pressure

## Build Order Notes For Later Beads

- `5.02` must build the full route topology in the exact encounter order above.
- `5.03` must give every encounter space aquarium/public/service identity immediately; do not leave graybox anonymity.
- `5.04` through `5.12` install the mechanic families in the encounter slots defined above.
- `5.13` through `5.17` lock acts in order without reopening encounter count or act structure.
- `5.18` through `5.20` may tune density and pacing, but may not reduce the level back toward placeholder scale.

## Acceptance Check For Bead 5.01

- Macro route map exists: `yes`
- Encounter inventory table exists: `yes`
- Geometry kit inventory exists: `yes`
- Enemy roster sheet exists: `yes`
- Hazard roster sheet exists: `yes`
- Traversal mechanic sheet exists: `yes`
- Pacing sheet exists: `yes`
- `14` mainline encounter spaces named and ordered: `yes`
- `2` optional branches named and ordered: `yes`
- every act has a time budget: `yes`

