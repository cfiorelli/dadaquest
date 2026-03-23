# Levels 5-9 Commercial Production Brief

Date: 2026-03-23

Status:
- Active source of truth for Levels `5` through `9` production planning on `main`.
- Replaces the previous high-level placeholder-only plan.
- Mainline remains `2.5D`. Do not revive Era 5 `3D/free-move/aquatic` gameplay on `main`.

## Product target

Levels `5` through `9` must become full commercial-grade `2.5D` campaign levels.

Each level must be:
- approximately `5x` longer than the current placeholder state
- far more complex in authored geometry, traversal, hazard layering, enemy pressure, and routing
- readable, fair, and finishable
- dense with meaningful encounters
- mechanically distinct but still coherent with the game

## Locked themes

- Level `5` = `Aquarium Drift`
- Level `6` = `Pressure Works`
- Level `7` = `Storm Cliffs`
- Level `8` = `Haunted Library`
- Level `9` = `Lantern Camp`

## Global campaign bars

Every level must satisfy all of these:

1. `5`-act structure
- Act `1` = teach
- Act `2` = combine
- Act `3` = punish
- Act `4` = remix
- Act `5` = mastery

2. Minimum authored content per level
- `12` to `18` encounter spaces
- `4` checkpoints
- `2` optional branches
- `3` regular enemy families
- `1` elite/miniboss family
- `4` hazard families
- `1` level-specific traversal mechanic
- `1` final mastery run

3. Every act must include:
- one timing/execution challenge
- one recognition/routing/puzzle challenge

4. Every hazard must have:
- a tell
- an active window
- a safe window
- a clear failure consequence

5. Every enemy must have:
- one primary combat/traversal role
- one clear counterplay
- one readable telegraph

6. Every optional branch must be:
- mechanically harder than the main route
- shorter or more dangerous
- more rewarding
- never required

7. Forbidden fake complexity
- giant empty rooms
- copied jump chains
- long dead runs
- filler corridors
- repeated hazards without escalation
- “more platforms” used as substitute for authored design

## Mandatory bead format

Every production bead must include:

1. Goal
2. Non-goals
3. Exact gameplay purpose
4. Exact geometry scope
5. Exact authored content scope
6. Exact content contract
7. Failure states
8. Acceptance criteria
9. Stop condition

## Mandatory level production pack before coding

Before implementing any level, produce a Level Production Pack with:

- Macro route map
- Encounter inventory table
- Geometry kit inventory
- Enemy roster sheet
- Hazard roster sheet
- Traversal mechanic sheet
- Pacing sheet

Do not begin production beads until this pack exists.

## Level 5 - Aquarium Drift

Theme:
- public aquarium decks
- viewing galleries
- service bridges
- pump/filter infrastructure
- cracked tank glass
- wet maintenance routes

Player fantasy:
- the safe-looking public route keeps failing
- the player survives by learning when to trust the aquarium and when to cut through service space

Traversal mechanic:
- slick deck footing
- short moving bridge timing
- controlled drops to lower service paths

Hazard families:
1. Current jets
2. Electrified puddle bands
3. Rotating spray bars
4. Crumbling glass floors

Enemy families:
1. Shock Jelly
2. Moray Snapper
3. Service Skater Bot
4. Elite: Saw Ray

Acts:
- Act 1 Public Entry Decks
- Act 2 Broken Viewing Gallery
- Act 3 Service Spine
- Act 4 Pump and Filter Core
- Act 5 Crown Tank Run

Route metrics:
- `14` encounter spaces
- `4` checkpoints
- `2` optional branches
- `1` elite gate in Act `4`
- `1` final mastery run in Act `5`

Encounter distribution:
- Act `1`: `2` teach encounters + `1` short breather
- Act `2`: `3` combine encounters
- Act `3`: `3` service encounters + `1` optional branch
- Act `4`: `2` remix encounters + elite gate
- Act `5`: `2` mastery encounters + `1` optional branch + final goal stretch

Production beads:
- `5.01` Level 5 Production Pack
- `5.02` Aquarium structural graybox
- `5.03` Aquarium visual kit v1
- `5.04` Slick deck mechanic
- `5.05` Current jet hazard
- `5.06` Electrified puddle hazard
- `5.07` Spray-bar hazard
- `5.08` Crumbling glass floor
- `5.09` Shock Jelly
- `5.10` Moray Snapper
- `5.11` Service Skater Bot
- `5.12` Saw Ray elite
- `5.13` Act 1 lock
- `5.14` Act 2 lock
- `5.15` Act 3 lock
- `5.16` Act 4 lock
- `5.17` Act 5 lock
- `5.18` Optional branch rewards
- `5.19` Pacing and checkpoint tuning
- `5.20` Level 5 production lock

## Level 6 - Pressure Works

Theme:
- industrial machine floors
- conveyor belts
- press lanes
- boiler cores
- suspended cargo lines

Traversal mechanic:
- conveyor traction management
- press timing
- machine-floor routing

Hazard families:
1. Conveyor belts
2. Vertical press stamps
3. Steam burst pipes
4. Crane hook sweeps

Enemy families:
1. Rivet Rat
2. Boiler Hound
3. Welder Drone
4. Elite: Foreman Loader

Acts:
- Act 1 Loading Bay
- Act 2 Conveyor Hall
- Act 3 Press Gallery
- Act 4 Boiler Spine
- Act 5 Final Fulfillment Track

Route metrics:
- `15` encounter spaces
- `4` checkpoints
- `2` optional branches
- elite gate in Act `4`
- final multi-machine mastery in Act `5`

Production beads:
- `6.01` Level 6 Production Pack
- `6.02` Industrial structural graybox
- `6.03` Factory visual kit v1
- `6.04` Conveyor traction system
- `6.05` Vertical press hazard
- `6.06` Steam burst hazard
- `6.07` Crane hook sweep
- `6.08` Rivet Rat
- `6.09` Boiler Hound
- `6.10` Welder Drone
- `6.11` Foreman Loader elite
- `6.12` Act 1 lock
- `6.13` Act 2 lock
- `6.14` Act 3 lock
- `6.15` Act 4 lock
- `6.16` Act 5 lock
- `6.17` Optional branch A rewards
- `6.18` Optional branch B rewards
- `6.19` Pacing and checkpoint tuning
- `6.20` Level 6 production lock

## Level 7 - Storm Cliffs

Theme:
- storm-beaten cliff paths
- rope bridges
- ruined watchposts
- tower approaches
- summit traversal

Traversal mechanic:
- gust management
- recovery jumping
- exposed ledge routing

Hazard families:
1. Gust lanes
2. Lightning strike markers
3. Crumbling ledges
4. Rope bridge instability

Enemy families:
1. Storm Gull
2. Cliff Leaper
3. Kite Raider
4. Elite: Thunder Ram

Acts:
- Act 1 Lower Ridge
- Act 2 Broken Watchposts
- Act 3 Narrow Traverse
- Act 4 Storm Tower Base
- Act 5 Summit Crossing

Route metrics:
- `15` encounter spaces
- `4` checkpoints
- `2` optional storm-cache branches
- elite in Act `4`
- long final summit mastery run

Production beads:
- `7.01` Level 7 Production Pack
- `7.02` Cliff route graybox
- `7.03` Storm visual kit v1
- `7.04` Gust lane system
- `7.05` Lightning strikes
- `7.06` Crumbling ledges
- `7.07` Rope bridge instability
- `7.08` Storm Gull
- `7.09` Cliff Leaper
- `7.10` Kite Raider
- `7.11` Thunder Ram elite
- `7.12` Act 1 lock
- `7.13` Act 2 lock
- `7.14` Act 3 lock
- `7.15` Act 4 lock
- `7.16` Act 5 lock
- `7.17` Optional branch A
- `7.18` Optional branch B
- `7.19` Gust/jump fairness tuning
- `7.20` Level 7 production lock

## Level 8 - Haunted Library

Theme:
- reading halls
- shelf corridors
- lantern galleries
- archive rooms
- hidden reference vault

Traversal mechanic:
- light reveal
- shelf-route reconfiguration
- recognition under pressure

Hazard families:
1. Ink spills
2. Sliding shelf walls
3. Ghost-hand grabs
4. Light-out zones

Enemy families:
1. Book Mimic
2. Ink Wisp
3. Shelf Ghost
4. Elite: Bell Librarian

Acts:
- Act 1 Front Reading Hall
- Act 2 Gallery of Stacks
- Act 3 Hidden Archive
- Act 4 Bell Tower Annex
- Act 5 Grand Reference Vault

Route metrics:
- `16` encounter spaces
- `4` checkpoints
- `2` optional archive branches
- elite in Act `4`
- final vault mastery route

Production beads:
- `8.01` Level 8 Production Pack
- `8.02` Library structural graybox
- `8.03` Library visual kit v1
- `8.04` Lantern reveal system
- `8.05` Ink spills
- `8.06` Sliding shelf walls
- `8.07` Ghost-hand traps
- `8.08` Light-out threat zones
- `8.09` Book Mimic
- `8.10` Ink Wisp
- `8.11` Shelf Ghost
- `8.12` Bell Librarian elite
- `8.13` Act 1 lock
- `8.14` Act 2 lock
- `8.15` Act 3 lock
- `8.16` Act 4 lock
- `8.17` Act 5 lock
- `8.18` Optional archive branch A
- `8.19` Optional archive branch B
- `8.20` Level 8 production lock

## Level 9 - Lantern Camp

Theme:
- night forest
- lantern trails
- boardwalk camps
- bonfire basins
- dark overlooks

Traversal mechanic:
- chaining safe light pockets
- movement under darkness pressure

Hazard families:
1. Darkness threat zones
2. Ember geysers
3. Collapsing boardwalk planks
4. Tripwire/snare traps

Enemy families:
1. Ash Moth Swarm
2. Marionette Scout
3. Shadow Hound
4. Elite: Lantern Warden

Acts:
- Act 1 Outer Trail
- Act 2 Boardwalk Camp Edge
- Act 3 Bonfire Basin
- Act 4 Watchline Ascent
- Act 5 Final Lantern Overlook

Route metrics:
- `16` encounter spaces
- `4` checkpoints
- `2` optional mastery branches
- elite in Act `4`
- long final campaign mastery run in Act `5`

Production beads:
- `9.01` Level 9 Production Pack
- `9.02` Forest/camp structural graybox
- `9.03` Lantern-camp visual kit v1
- `9.04` Light-safe pocket system
- `9.05` Ember burst hazards
- `9.06` Collapsing boardwalk planks
- `9.07` Snare/tripwire traps
- `9.08` Ash Moth Swarm
- `9.09` Marionette Scout
- `9.10` Shadow Hound
- `9.11` Lantern Warden elite
- `9.12` Act 1 lock
- `9.13` Act 2 lock
- `9.14` Act 3 lock
- `9.15` Act 4 lock
- `9.16` Act 5 lock
- `9.17` Optional mastery branch A
- `9.18` Optional mastery branch B
- `9.19` Final pacing/light fairness tuning
- `9.20` Level 9 production lock

## Campaign-wide final pass

After all five levels are individually locked:

- `C.01` Enemy difficulty curve pass across `5`-`9`
- `C.02` Hazard readability and fairness pass across `5`-`9`
- `C.03` Checkpoint spacing and time-to-clear pass across `5`-`9`
- `C.04` Optional branch reward and collectible pass across `5`-`9`
- `C.05` Final campaign coherence and production lock pass

## Delivery order

1. Complete all `20` Level `5` beads
2. Then all `20` Level `6` beads
3. Then all `20` Level `7` beads
4. Then all `20` Level `8` beads
5. Then all `20` Level `9` beads
6. Then the campaign-wide pass
