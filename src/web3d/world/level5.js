import { normalizeCoinsOnSurfaces } from './eraLevelLayout.js';
import { compileAuthoredEraLayout } from './eraAuthoredLayout.js';

function surface(id, offsetX, offsetZ, w, d, surfaceType, extra = {}) {
  return {
    id,
    offsetX,
    offsetZ,
    w,
    d,
    h: extra.h ?? 0.64,
    surfaceType,
    ...extra,
  };
}

function block(name, offsetX, offsetZ, w, h, d, extra = {}) {
  return {
    name,
    offsetX,
    offsetZ,
    w,
    h,
    d,
    ...extra,
  };
}

function column(name, offsetX, offsetZ, diameter, height, extra = {}) {
  return {
    name,
    offsetX,
    offsetZ,
    diameter,
    height,
    ...extra,
  };
}

function platform(name, offsetX, offsetZ, w, h, d, extra = {}) {
  return {
    name,
    offsetX,
    offsetZ,
    w,
    h,
    d,
    ...extra,
  };
}

const LEVEL5_CAMERA_PRESETS = {
  standard: {
    id: 'standard',
    label: 'Standard',
    distance: 7.4,
    height: 3.8,
    focusHeight: 1.22,
    lookAhead: 3.9,
    fov: 0.92,
  },
  closer: {
    id: 'closer',
    label: 'Closer Over-Shoulder',
    distance: 6.2,
    height: 3.4,
    focusHeight: 1.16,
    lookAhead: 3.2,
    fov: 0.98,
  },
};

const BASE_LEVEL5 = compileAuthoredEraLayout({
  totalCollectibles: 18,
  spawnYaw: 0.62,
  defaultCameraPreset: 'standard',
  cameraPresets: LEVEL5_CAMERA_PRESETS,
  spawn: { x: -41.8, y: 1.30, z: 6.2 },
  goal: { x: 56.0, y: 2.24, z: 2.2 },
  theme: 'aquarium',
  showGroundVisual: false,
  showRouteRibbons: false,

  acts: [
    { id: 'A', label: 'Spawn Dock', range: [-48, -20] },
    { id: 'B', label: 'Viewing Approach', range: [-20, 10] },
    { id: 'C', label: 'Viewing Chamber Split', range: [10, 40] },
    { id: 'D', label: 'Final Exhibit', range: [40, 68] },
  ],

  authoredMap: {
    id: 'aquarium-drift-map02',
    startSector: 'spawn_dock',
    goalSector: 'final_exhibit_platform',
    sectors: [
      {
        id: 'spawn_dock',
        label: 'Spawn Dock',
        x: -38,
        z: 6,
        w: 20,
        d: 16,
        floorY: 0.84,
        ceilingY: 8.8,
        floorSurfaceType: 'wet_service_deck',
        wallLanguage: 'dock_lobby',
        landmarks: ['arrival tank', 'bulkhead fork'],
        shell: {
          rgb: [24, 70, 92],
          roughness: 0.80,
          openSides: ['south'],
          beamCount: 1,
          beamRgb: [74, 140, 158],
        },
        surfaces: [
          surface('spawn_lobby', -1.8, 0.0, 13.8, 9.8, 'wet_service_deck', {
            floorY: 0.84,
            walkableClassification: 'dock-floor',
          }),
          surface('spawn_public_nook', 4.6, 4.6, 6.0, 4.8, 'viewing_deck', {
            floorY: 0.88,
            walkableClassification: 'dock-nook',
          }),
          surface('spawn_service_nook', 4.2, -4.6, 6.4, 4.8, 'shell_service_deck', {
            floorY: 0.80,
            walkableClassification: 'dock-service',
          }),
        ],
        decorBlocks: [
          block('spawn_arrival_tank_wall', -0.8, 8.2, 16.2, 7.4, 1.2, {
            rgb: [42, 128, 150],
            emissiveScale: 0.07,
            roughness: 0.42,
            alpha: 0.50,
          }),
          block('spawn_arrival_tank_volume', -0.6, 11.4, 15.6, 6.8, 6.0, {
            rgb: [30, 104, 128],
            emissiveScale: 0.04,
            roughness: 0.34,
            alpha: 0.20,
            solid: true,
          }),
          block('spawn_east_bulkhead', 8.2, 0.2, 2.8, 6.8, 12.4, {
            rgb: [28, 76, 90],
            emissiveScale: 0.04,
            roughness: 0.84,
            solid: true,
          }),
          block('spawn_fork_baffle', 4.8, 2.8, 4.4, 5.8, 6.0, {
            rgb: [30, 82, 98],
            emissiveScale: 0.03,
            roughness: 0.82,
            rotationY: -0.24,
            solid: true,
          }),
          block('spawn_service_baffle', 4.2, -4.2, 3.8, 4.6, 5.6, {
            rgb: [32, 78, 90],
            emissiveScale: 0.03,
            roughness: 0.84,
            rotationY: 0.18,
            solid: true,
          }),
          block('spawn_filter_stack', -7.6, -5.4, 4.6, 5.2, 3.2, {
            rgb: [42, 84, 100],
            emissiveScale: 0.04,
            roughness: 0.78,
          }),
          block('spawn_turn_pod', -2.0, 2.6, 5.6, 3.8, 4.8, {
            rgb: [36, 86, 102],
            emissiveScale: 0.04,
            roughness: 0.80,
            rotationY: -0.14,
            solid: true,
          }),
          block('spawn_forward_bulkhead', 2.6, 5.8, 3.8, 5.6, 5.4, {
            rgb: [30, 78, 92],
            emissiveScale: 0.03,
            roughness: 0.84,
            rotationY: -0.12,
            solid: true,
          }),
          block('spawn_guest_gallery_wall', -8.8, 2.0, 1.8, 5.4, 9.2, {
            rgb: [34, 80, 98],
            emissiveScale: 0.04,
            roughness: 0.82,
          }),
          block('spawn_service_lockers', 7.6, -6.0, 2.6, 3.2, 4.6, {
            rgb: [34, 72, 86],
            emissiveScale: 0.03,
            roughness: 0.84,
          }),
          block('spawn_west_hull_mass', -10.0, 0.2, 4.8, 6.4, 12.8, {
            rgb: [26, 66, 78],
            emissiveScale: 0.03,
            roughness: 0.86,
            solid: true,
          }),
          block('spawn_guest_console', -7.0, 4.4, 3.4, 2.6, 2.2, {
            rgb: [70, 112, 122],
            emissiveScale: 0.03,
            roughness: 0.78,
          }),
        ],
        decorColumns: [
          column('spawn_tank_post_a', -8.2, 7.0, 0.9, 7.4, {
            rgb: [78, 146, 164],
            roughness: 0.62,
          }),
          column('spawn_tank_post_b', 6.8, 7.0, 0.9, 7.4, {
            rgb: [78, 146, 164],
            roughness: 0.62,
          }),
          column('spawn_tank_cluster', -2.8, 11.0, 2.4, 5.8, {
            rgb: [94, 196, 210],
            roughness: 0.36,
            alpha: 0.26,
          }),
        ],
        decorPlatforms: [
          platform('spawn_pipe_run', -0.4, 7.4, 14.0, 0.24, 1.2, {
            y: 5.8,
            rgb: [86, 162, 178],
          }),
          platform('spawn_overhead_frame', -1.2, -0.8, 17.6, 0.28, 1.0, {
            y: 6.6,
            rgb: [74, 144, 164],
          }),
          platform('spawn_guest_brow', 0.4, 5.6, 10.8, 0.24, 1.0, {
            y: 4.8,
            rgb: [102, 190, 206],
            surfaceType: 'viewing_deck',
          }),
          platform('spawn_ceiling_service_tray', 1.8, -3.8, 12.2, 0.22, 1.0, {
            y: 4.2,
            rgb: [80, 146, 164],
          }),
          platform('spawn_entry_lintel', 4.6, 0.4, 5.8, 0.26, 5.4, {
            y: 4.6,
            rgb: [88, 164, 184],
          }),
        ],
        signage: [
          { offsetX: -0.4, y: 5.6, offsetZ: -7.4, text: 'AQUARIUM SERVICE DOCK', width: 10.8, height: 1.9 },
        ],
      },
      {
        id: 'direct_chamber_approach',
        label: 'Direct Chamber Approach',
        x: -20,
        z: 20,
        w: 18,
        d: 16,
        floorY: 1.02,
        ceilingY: 8.2,
        floorSurfaceType: 'viewing_deck',
        wallLanguage: 'public_gallery',
        landmarks: ['public gallery turn', 'tank reveal'],
        shell: {
          rgb: [24, 78, 96],
          roughness: 0.76,
          openSides: ['south'],
          beamCount: 2,
          beamRgb: [84, 164, 182],
        },
        surfaces: [
          surface('approach_gallery', -4.6, -2.0, 6.2, 11.2, 'viewing_deck', {
            floorY: 1.02,
            walkableClassification: 'hall-floor',
          }),
          surface('approach_turn_landing', 2.2, 4.2, 11.8, 6.0, 'viewing_deck', {
            floorY: 1.08,
            walkableClassification: 'hall-floor',
          }),
          surface('approach_glass_bridge', 6.2, 0.4, 4.2, 5.0, 'glass_bridge', {
            floorY: 1.14,
            walkableClassification: 'bridge',
          }),
        ],
        checkpoints: [
          { id: 'cp_public_gallery', offsetX: 2.2, offsetZ: 3.8, label: 'Public Gallery' },
        ],
        decorBlocks: [
          block('approach_turn_bulkhead', -0.8, 2.0, 4.0, 6.0, 10.0, {
            rgb: [28, 78, 92],
            emissiveScale: 0.04,
            roughness: 0.82,
            rotationY: -0.18,
            solid: true,
          }),
          block('approach_tank_wall', 4.8, 7.2, 11.8, 6.8, 1.2, {
            rgb: [48, 132, 156],
            emissiveScale: 0.07,
            roughness: 0.44,
            alpha: 0.44,
          }),
          block('approach_tank_volume', 4.8, 10.4, 10.4, 6.2, 5.2, {
            rgb: [32, 108, 132],
            emissiveScale: 0.04,
            roughness: 0.34,
            alpha: 0.18,
            solid: true,
          }),
          block('approach_service_cabinet', -7.0, -5.0, 3.2, 3.0, 1.8, {
            rgb: [44, 84, 98],
            emissiveScale: 0.03,
            roughness: 0.82,
          }),
          block('approach_gallery_wall_north', -1.4, 6.8, 14.6, 5.8, 1.4, {
            rgb: [32, 84, 98],
            emissiveScale: 0.04,
            roughness: 0.82,
          }),
          block('approach_turn_pier', 2.4, -1.4, 4.2, 5.6, 5.8, {
            rgb: [32, 78, 94],
            emissiveScale: 0.03,
            roughness: 0.84,
            rotationY: 0.18,
            solid: true,
          }),
          block('approach_viewing_buttress', 7.0, 8.8, 4.2, 6.4, 4.8, {
            rgb: [34, 88, 102],
            emissiveScale: 0.05,
            roughness: 0.74,
            solid: true,
          }),
          block('approach_reveal_baffle', 7.6, -1.8, 2.0, 6.2, 7.2, {
            rgb: [28, 70, 86],
            emissiveScale: 0.03,
            roughness: 0.82,
            rotationY: 0.18,
            solid: true,
          }),
        ],
        decorColumns: [
          column('approach_rib_a', 6.6, 6.8, 0.56, 6.0, {
            rgb: [82, 156, 174],
            roughness: 0.56,
          }),
          column('approach_rib_b', 7.2, -4.2, 0.56, 5.8, {
            rgb: [82, 156, 174],
            roughness: 0.56,
          }),
        ],
        decorPlatforms: [
          platform('approach_pipe_arch', 1.4, 2.0, 12.6, 0.22, 1.0, {
            y: 5.2,
            rgb: [92, 174, 188],
          }),
          platform('approach_viewing_brow', 4.8, 6.8, 8.8, 0.24, 1.0, {
            y: 4.6,
            rgb: [108, 196, 210],
            surfaceType: 'viewing_deck',
          }),
          platform('approach_turn_lintel', -0.2, 1.8, 6.0, 0.22, 6.8, {
            y: 4.8,
            rgb: [90, 170, 186],
          }),
        ],
      },
      {
        id: 'side_service_catwalk',
        label: 'Side Service Catwalk',
        x: -20,
        z: -10,
        w: 28,
        d: 8,
        floorY: 0.82,
        ceilingY: 6.4,
        floorSurfaceType: 'catwalk_grate',
        wallLanguage: 'service_gallery',
        landmarks: ['service pipes', 'pump alcove'],
        shell: {
          rgb: [18, 58, 78],
          roughness: 0.84,
          openSides: ['west'],
          ceiling: false,
          beamCount: 1,
          beamRgb: [62, 126, 144],
        },
        surfaces: [
          surface('side_main', -1.2, 0.0, 21.0, 3.2, 'catwalk_grate', {
            floorY: 0.82,
            walkableClassification: 'catwalk',
          }),
          surface('side_lock_landing', -9.4, 2.0, 5.2, 3.4, 'drain_apron', {
            floorY: 0.88,
            walkableClassification: 'landing',
          }),
          surface('side_pump_alcove', 7.6, 2.2, 6.2, 3.6, 'maintenance_plate', {
            floorY: 0.96,
            walkableClassification: 'alcove',
          }),
        ],
        decorBlocks: [
          block('side_tank_wall', -0.6, -4.4, 25.0, 6.0, 1.2, {
            rgb: [36, 112, 136],
            emissiveScale: 0.06,
            roughness: 0.48,
            alpha: 0.44,
          }),
          block('side_tank_volume', -1.0, -7.4, 23.0, 5.8, 5.6, {
            rgb: [30, 100, 124],
            emissiveScale: 0.04,
            roughness: 0.34,
            alpha: 0.18,
            solid: true,
          }),
          block('side_pipe_bank', 0.8, 4.2, 18.0, 1.8, 1.6, {
            y: 1.5,
            rgb: [34, 70, 84],
            emissiveScale: 0.03,
            roughness: 0.86,
          }),
          block('side_service_bank', -9.2, 4.4, 5.8, 3.4, 1.8, {
            rgb: [36, 74, 90],
            emissiveScale: 0.03,
            roughness: 0.84,
          }),
          block('side_outer_service_wall_a', -4.2, 4.8, 10.8, 4.2, 1.6, {
            rgb: [28, 66, 80],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('side_outer_service_wall_b', 8.2, 4.8, 6.8, 4.6, 1.8, {
            rgb: [30, 68, 82],
            emissiveScale: 0.03,
            roughness: 0.84,
          }),
          block('side_catwalk_trough', -1.8, 1.8, 18.8, 0.8, 1.0, {
            y: 0.36,
            rgb: [24, 56, 64],
            emissiveScale: 0.02,
            roughness: 0.88,
          }),
          block('side_underdeck_support', -1.0, -0.2, 20.4, 2.8, 1.6, {
            y: -0.38,
            rgb: [20, 48, 58],
            emissiveScale: 0.02,
            roughness: 0.90,
          }),
          block('side_pump_niche', 9.2, 4.6, 4.8, 3.2, 1.8, {
            rgb: [38, 78, 94],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
        ],
        decorColumns: [
          column('side_post_a', -10.8, -3.8, 0.54, 4.6, { rgb: [64, 132, 150], roughness: 0.58 }),
          column('side_post_b', -2.2, -3.8, 0.54, 4.6, { rgb: [64, 132, 150], roughness: 0.58 }),
          column('side_post_c', 6.8, -3.8, 0.54, 4.6, { rgb: [64, 132, 150], roughness: 0.58 }),
        ],
        decorPlatforms: [
          platform('side_pipe_bundle_a', -1.2, 4.0, 18.2, 0.18, 0.28, {
            y: 2.6,
            rgb: [90, 170, 186],
          }),
          platform('side_pipe_bundle_b', -1.2, 4.4, 18.2, 0.18, 0.28, {
            y: 2.9,
            rgb: [76, 148, 166],
          }),
          platform('side_cable_tray', -1.8, -3.8, 22.2, 0.22, 0.8, {
            y: 4.8,
            rgb: [80, 150, 166],
          }),
          platform('side_roof_skin', -1.6, 1.6, 20.6, 0.22, 2.6, {
            y: 5.3,
            rgb: [54, 98, 116],
          }),
        ],
        signage: [
          { offsetX: 3.2, y: 4.4, offsetZ: 4.6, text: 'STAFF CATWALK', width: 6.2, height: 1.6 },
        ],
      },
      {
        id: 'central_viewing_chamber',
        label: 'Central Viewing Chamber',
        x: 8,
        z: 16,
        w: 36,
        d: 30,
        floorY: 1.26,
        ceilingY: 11.8,
        floorSurfaceType: 'viewing_deck',
        wallLanguage: 'hero_chamber',
        landmarks: ['giant viewing wall', 'cylinder cluster', 'filtration tower', 'overhead bridge'],
        shell: {
          rgb: [24, 74, 96],
          roughness: 0.78,
          openSides: ['west'],
          beamCount: 2,
          beamRgb: [78, 150, 170],
        },
        surfaces: [
          surface('chamber_entry_concourse', -11.2, 2.8, 12.8, 9.6, 'viewing_deck', {
            floorY: 1.22,
            walkableClassification: 'chamber-floor',
          }),
          surface('chamber_public_floor', 3.8, 7.2, 28.4, 17.2, 'viewing_deck', {
            floorY: 1.28,
            walkableClassification: 'chamber-floor',
          }),
          surface('chamber_east_gallery', 13.4, 2.8, 8.8, 11.0, 'exhibit_deck', {
            floorY: 1.34,
            walkableClassification: 'chamber-floor',
          }),
          surface('chamber_south_service', 3.4, -8.4, 20.4, 5.8, 'wet_service_deck', {
            floorY: 1.12,
            walkableClassification: 'service-floor',
          }),
        ],
        checkpoints: [
          { id: 'cp_viewing_ring', offsetX: -0.8, offsetZ: 0.8, label: 'Viewing Chamber' },
        ],
        decorBlocks: [
          block('chamber_entry_baffle', -16.2, 1.0, 2.2, 6.8, 10.6, {
            rgb: [28, 72, 88],
            emissiveScale: 0.03,
            roughness: 0.84,
            rotationY: -0.28,
            solid: true,
          }),
          block('chamber_entry_jamb_north', -16.8, 8.4, 2.8, 7.4, 7.2, {
            rgb: [28, 70, 84],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('chamber_entry_jamb_south', -15.6, -6.8, 3.4, 7.2, 8.0, {
            rgb: [28, 70, 84],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('chamber_entry_lintel_mass', -15.8, 1.2, 2.8, 2.0, 7.6, {
            y: 6.6,
            rgb: [38, 90, 104],
            emissiveScale: 0.04,
            roughness: 0.76,
          }),
          block('chamber_glass_wall', 2.4, 14.8, 31.8, 10.2, 1.4, {
            rgb: [48, 144, 168],
            emissiveScale: 0.08,
            roughness: 0.40,
            alpha: 0.46,
          }),
          block('chamber_viewing_volume', 3.0, 19.8, 30.4, 9.6, 10.4, {
            rgb: [28, 102, 128],
            emissiveScale: 0.04,
            roughness: 0.34,
            alpha: 0.18,
            solid: true,
          }),
          block('chamber_glass_frame_left', -13.6, 15.0, 1.6, 10.4, 10.0, {
            rgb: [28, 82, 98],
            emissiveScale: 0.04,
            roughness: 0.76,
            solid: true,
          }),
          block('chamber_glass_frame_right', 18.0, 15.2, 1.8, 10.6, 10.6, {
            rgb: [28, 82, 98],
            emissiveScale: 0.04,
            roughness: 0.76,
            solid: true,
          }),
          block('chamber_north_buttress_a', -7.6, 15.8, 5.0, 9.2, 8.4, {
            rgb: [28, 82, 98],
            emissiveScale: 0.04,
            roughness: 0.76,
            solid: true,
          }),
          block('chamber_north_buttress_b', 8.6, 15.8, 5.2, 9.2, 8.8, {
            rgb: [28, 82, 98],
            emissiveScale: 0.04,
            roughness: 0.76,
            solid: true,
          }),
          block('chamber_filtration_tower_core', -0.2, -0.4, 5.4, 10.0, 5.4, {
            rgb: [30, 78, 94],
            emissiveScale: 0.04,
            roughness: 0.80,
            solid: true,
          }),
          block('chamber_filtration_tower_base', -0.2, -0.4, 11.6, 2.2, 11.6, {
            rgb: [36, 84, 98],
            emissiveScale: 0.04,
            roughness: 0.82,
            solid: true,
          }),
          block('chamber_support_bank', 14.8, -10.4, 6.2, 5.2, 7.2, {
            rgb: [34, 82, 100],
            emissiveScale: 0.03,
            roughness: 0.82,
            solid: true,
          }),
          block('chamber_south_pump_hall', -5.4, -12.8, 11.2, 4.8, 5.2, {
            rgb: [26, 66, 78],
            emissiveScale: 0.03,
            roughness: 0.86,
            solid: true,
          }),
          block('chamber_lower_trench_housing', 2.8, -6.8, 18.4, 3.4, 3.8, {
            y: 0.34,
            rgb: [22, 52, 60],
            emissiveScale: 0.02,
            roughness: 0.90,
            solid: true,
          }),
          block('chamber_goal_occluder', 16.4, 0.8, 3.0, 7.0, 12.8, {
            rgb: [26, 70, 84],
            emissiveScale: 0.03,
            roughness: 0.84,
            rotationY: -0.32,
            solid: true,
          }),
          block('chamber_goal_portal_north', 17.0, 10.0, 3.8, 7.6, 8.0, {
            rgb: [28, 72, 88],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('chamber_goal_portal_south', 17.2, -7.2, 4.2, 7.2, 8.4, {
            rgb: [28, 72, 88],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('chamber_lower_aperture_wall', 0.8, -5.4, 18.0, 1.6, 1.2, {
            y: 0.84,
            rgb: [26, 60, 70],
            emissiveScale: 0.02,
            roughness: 0.88,
          }),
        ],
        decorColumns: [
          column('tank_cluster_a', 11.8, 10.6, 4.4, 9.2, {
            rgb: [96, 206, 220],
            roughness: 0.32,
            alpha: 0.42,
          }),
          column('tank_cluster_b', 16.0, 6.0, 3.4, 8.2, {
            rgb: [92, 196, 210],
            roughness: 0.32,
            alpha: 0.46,
          }),
          column('tank_cluster_c', 14.2, 13.8, 3.8, 9.4, {
            rgb: [96, 206, 220],
            roughness: 0.32,
            alpha: 0.42,
          }),
          column('tank_cluster_podium', 13.2, 9.6, 6.6, 1.8, {
            diameterTop: 5.8,
            diameterBottom: 7.8,
            y: 1.82,
            rgb: [42, 92, 104],
            roughness: 0.80,
            solid: true,
          }),
          column('chamber_bridge_support_a', -6.0, 1.8, 0.72, 7.8, {
            rgb: [84, 162, 180],
            roughness: 0.54,
          }),
          column('chamber_bridge_support_b', 10.8, 1.8, 0.72, 7.8, {
            rgb: [84, 162, 180],
            roughness: 0.54,
          }),
          column('chamber_filter_outer_ring', -0.2, -0.4, 10.2, 0.58, {
            diameterTop: 8.8,
            diameterBottom: 10.6,
            y: 4.8,
            rgb: [78, 160, 178],
            roughness: 0.42,
            alpha: 0.22,
          }),
        ],
        decorPlatforms: [
          platform('chamber_overhead_crossing', 2.0, 1.8, 24.0, 0.32, 2.4, {
            y: 5.8,
            rgb: [92, 178, 194],
            surfaceType: 'catwalk_grate',
          }),
          platform('chamber_pipe_run_north', -8.0, 13.4, 24.0, 0.26, 1.0, {
            y: 6.8,
            rgb: [84, 154, 170],
          }),
          platform('chamber_pipe_run_south', 6.6, -13.2, 22.0, 0.34, 1.6, {
            y: 7.2,
            rgb: [74, 140, 160],
          }),
          platform('chamber_lower_route_glimpse_a', -2.2, -5.8, 10.8, 0.32, 2.8, {
            y: 0.56,
            rgb: [50, 76, 84],
            surfaceType: 'maintenance_plate',
          }),
          platform('chamber_lower_route_glimpse_b', 8.6, -7.0, 9.8, 0.32, 2.6, {
            y: 0.64,
            rgb: [48, 72, 80],
            surfaceType: 'maintenance_plate',
          }),
          platform('chamber_viewing_lintel', 2.2, 15.2, 31.8, 0.28, 1.0, {
            y: 8.2,
            rgb: [92, 176, 192],
            surfaceType: 'viewing_deck',
          }),
          platform('chamber_entry_canopy', -12.6, 0.8, 8.6, 0.26, 8.8, {
            y: 5.2,
            rgb: [82, 152, 170],
          }),
          platform('chamber_tank_ring_walk', 13.2, 9.6, 9.2, 0.22, 9.2, {
            y: 3.7,
            rgb: [96, 182, 198],
            surfaceType: 'viewing_deck',
          }),
          platform('chamber_south_service_canopy', 4.2, -11.2, 17.2, 0.24, 4.6, {
            y: 4.8,
            rgb: [68, 126, 142],
          }),
        ],
        signage: [
          { offsetX: -1.0, y: 6.4, offsetZ: -14.4, text: 'CENTRAL VIEWING CHAMBER', width: 11.4, height: 2.0 },
        ],
      },
      {
        id: 'overhead_cross_bridge',
        label: 'Overhead Cross-Bridge',
        x: 28,
        z: 8,
        w: 18,
        d: 8,
        floorY: 3.02,
        ceilingY: 8.4,
        floorSurfaceType: 'overhead_bridge',
        wallLanguage: 'upper_bridge',
        landmarks: ['service bridge', 'bridge booth'],
        shell: {
          rgb: [18, 62, 82],
          roughness: 0.82,
          openSides: ['west'],
          ceiling: false,
          beamCount: 2,
          beamRgb: [88, 168, 186],
        },
        surfaces: [
          surface('bridge_main', 0.0, 0.0, 15.8, 3.8, 'catwalk_grate', {
            floorY: 3.02,
            h: 0.56,
            walkableClassification: 'bridge',
          }),
          surface('bridge_node', -5.8, -1.2, 5.4, 3.0, 'maintenance_plate', {
            floorY: 2.94,
            h: 0.54,
            walkableClassification: 'bridge-node',
          }),
        ],
        decorBlocks: [
          block('bridge_service_booth', 7.8, -2.4, 4.8, 2.8, 2.2, {
            rgb: [36, 82, 98],
            emissiveScale: 0.03,
            roughness: 0.82,
            solid: true,
          }),
          block('bridge_tank_support', -6.8, 2.4, 3.2, 4.8, 2.0, {
            rgb: [30, 72, 86],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
        ],
        decorPlatforms: [
          platform('bridge_lattice', 0.0, 0.0, 16.0, 0.18, 0.6, { y: 5.8, rgb: [94, 178, 198] }),
          platform('bridge_pipe_bundle_a', 0.0, 2.6, 15.2, 0.18, 0.28, { y: 3.8, rgb: [92, 168, 184] }),
          platform('bridge_pipe_bundle_b', 0.0, 3.0, 15.2, 0.18, 0.28, { y: 4.1, rgb: [76, 148, 168] }),
          platform('bridge_side_canopy', -0.8, -2.2, 15.4, 0.22, 1.4, { y: 5.0, rgb: [70, 132, 150] }),
        ],
      },
      {
        id: 'lower_maintenance_route',
        label: 'Lower Maintenance Route',
        x: 18,
        z: -10,
        w: 32,
        d: 14,
        floorY: 0.52,
        ceilingY: 5.8,
        floorSurfaceType: 'maintenance_channel',
        wallLanguage: 'pump_access',
        landmarks: ['pump manifold', 'drain trench'],
        shell: {
          rgb: [18, 54, 70],
          roughness: 0.86,
          openSides: ['west', 'east'],
          beamCount: 1,
          beamRgb: [60, 124, 144],
        },
        surfaces: [
          surface('maintenance_main', -1.6, 0.4, 20.8, 6.0, 'maintenance_plate', {
            floorY: 0.52,
            walkableClassification: 'maintenance-floor',
          }),
          surface('maintenance_pump_pad', -10.0, -3.2, 6.4, 3.6, 'maintenance_plate', {
            floorY: 0.68,
            walkableClassification: 'maintenance-pad',
          }),
          surface('maintenance_drain_shelf', 7.2, 2.4, 7.0, 3.6, 'drain_apron', {
            floorY: 0.80,
            walkableClassification: 'maintenance-shelf',
          }),
          surface('maintenance_east_track', 10.0, -2.8, 6.4, 3.4, 'maintenance_channel', {
            floorY: 0.64,
            walkableClassification: 'maintenance-track',
          }),
        ],
        decorBlocks: [
          block('maintenance_pump_bank', -11.2, -4.8, 6.2, 3.4, 1.8, {
            rgb: [34, 78, 92],
            emissiveScale: 0.04,
            roughness: 0.82,
            solid: true,
          }),
          block('maintenance_north_wall', -0.4, 6.2, 24.8, 4.0, 1.6, {
            rgb: [24, 58, 68],
            emissiveScale: 0.02,
            roughness: 0.88,
            solid: true,
          }),
          block('maintenance_south_wall', -1.0, -6.2, 25.4, 4.8, 1.8, {
            rgb: [20, 50, 58],
            emissiveScale: 0.02,
            roughness: 0.90,
            solid: true,
          }),
          block('maintenance_manifold_stack', 10.0, -4.8, 5.2, 3.6, 2.2, {
            rgb: [36, 76, 90],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('maintenance_pipe_wall', 11.0, 5.2, 8.0, 2.8, 1.8, {
            y: 2.0,
            rgb: [42, 96, 112],
            emissiveScale: 0.04,
            roughness: 0.78,
          }),
          block('maintenance_sludge_trough', 0.8, 5.0, 14.0, 0.86, 1.4, {
            y: 0.38,
            rgb: [28, 56, 64],
            emissiveScale: 0.02,
            roughness: 0.90,
          }),
          block('maintenance_backwash_glass', -13.2, 4.8, 7.6, 5.8, 1.2, {
            rgb: [44, 122, 146],
            emissiveScale: 0.05,
            roughness: 0.44,
            alpha: 0.32,
          }),
          block('maintenance_trench_wall', -2.6, 5.0, 12.2, 1.4, 1.0, {
            y: 0.86,
            rgb: [24, 52, 58],
            emissiveScale: 0.02,
            roughness: 0.90,
          }),
          block('maintenance_shell_bank', 11.8, -4.8, 4.0, 0.72, 3.0, {
            y: 0.44,
            rgb: [90, 126, 118],
            emissiveScale: 0.02,
            roughness: 0.90,
          }),
          block('maintenance_underwalk_mass', -1.4, 0.0, 20.8, 1.8, 5.8, {
            y: -0.18,
            rgb: [18, 44, 50],
            emissiveScale: 0.02,
            roughness: 0.90,
            solid: true,
          }),
        ],
        decorColumns: [
          column('maintenance_coral_a', -2.8, 4.0, 0.72, 1.2, {
            diameterTop: 0.18,
            diameterBottom: 0.72,
            y: 1.22,
            rgb: [108, 146, 136],
            roughness: 0.80,
          }),
          column('maintenance_coral_b', 2.8, 3.6, 0.66, 1.0, {
            diameterTop: 0.16,
            diameterBottom: 0.66,
            y: 1.12,
            rgb: [122, 154, 138],
            roughness: 0.80,
          }),
        ],
        decorPlatforms: [
          platform('maintenance_ceiling_bundle_a', -1.8, 5.2, 18.8, 0.18, 0.28, { y: 4.2, rgb: [76, 142, 158] }),
          platform('maintenance_ceiling_bundle_b', -1.8, 5.6, 18.8, 0.18, 0.28, { y: 4.5, rgb: [64, 128, 144] }),
          platform('maintenance_cable_tray', 6.4, -5.0, 10.4, 0.22, 0.7, { y: 3.4, rgb: [78, 146, 162] }),
          platform('maintenance_ceiling_skin', -1.2, 0.2, 22.6, 0.24, 5.0, { y: 4.9, rgb: [46, 90, 104] }),
        ],
        signage: [
          { offsetX: 4.8, y: 4.2, offsetZ: 5.2, text: 'LOWER MAINTENANCE', width: 7.6, height: 1.8 },
        ],
      },
      {
        id: 'final_exhibit_platform',
        label: 'Final Exhibit Platform',
        x: 52,
        z: 4,
        w: 24,
        d: 18,
        floorY: 1.90,
        ceilingY: 9.2,
        floorSurfaceType: 'exhibit_deck',
        wallLanguage: 'final_exhibit',
        landmarks: ['final ring', 'goal viewing glass'],
        shell: {
          rgb: [22, 72, 94],
          roughness: 0.76,
          openSides: ['east'],
          beamCount: 1,
          beamRgb: [84, 160, 180],
        },
        surfaces: [
          surface('final_public_deck', -3.8, 0.2, 14.8, 11.6, 'exhibit_deck', {
            floorY: 1.88,
            h: 0.70,
            walkableClassification: 'final-floor',
          }),
          surface('final_ring_walk', 1.4, 5.2, 10.0, 6.0, 'viewing_deck', {
            floorY: 1.96,
            h: 0.64,
            walkableClassification: 'ring-floor',
          }),
          surface('goalDeck', 6.8, -1.0, 10.2, 6.2, 'exhibit_deck', {
            floorY: 2.14,
            h: 0.76,
            walkableClassification: 'goal-floor',
            name: 'goalDeck',
          }),
          surface('final_service_apron', -1.8, -5.6, 10.4, 3.6, 'shell_service_deck', {
            floorY: 1.74,
            h: 0.58,
            walkableClassification: 'final-apron',
          }),
        ],
        checkpoints: [
          { id: 'cp_final_ring', offsetX: -7.4, offsetZ: -0.8, label: 'Final Exhibit' },
        ],
        decorBlocks: [
          block('final_ring_base', -2.8, 5.0, 8.8, 4.4, 8.8, {
            rgb: [40, 88, 104],
            emissiveScale: 0.05,
            roughness: 0.76,
            solid: true,
          }),
          block('final_entry_bulkhead_north', -9.0, 6.2, 5.8, 6.8, 6.2, {
            rgb: [28, 76, 90],
            emissiveScale: 0.03,
            roughness: 0.82,
            solid: true,
          }),
          block('final_entry_bulkhead_south', -7.2, -6.4, 7.2, 6.4, 6.8, {
            rgb: [28, 74, 88],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
          block('final_tank_wall', 6.8, 6.2, 2.4, 8.6, 13.2, {
            rgb: [48, 136, 162],
            emissiveScale: 0.08,
            roughness: 0.42,
            alpha: 0.52,
          }),
          block('final_viewing_volume', 11.4, 6.0, 8.0, 7.8, 11.6, {
            rgb: [34, 110, 136],
            emissiveScale: 0.04,
            roughness: 0.34,
            alpha: 0.18,
            solid: true,
          }),
          block('final_goal_bulkhead', 9.0, -1.4, 2.6, 6.8, 8.4, {
            rgb: [28, 74, 90],
            emissiveScale: 0.03,
            roughness: 0.82,
            solid: true,
          }),
          block('final_service_kiosk', -0.6, -6.8, 3.8, 2.6, 2.4, {
            rgb: [54, 98, 112],
            emissiveScale: 0.03,
            roughness: 0.80,
          }),
          block('final_back_hull', 12.8, 0.4, 5.2, 7.4, 14.0, {
            rgb: [26, 70, 86],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
        ],
        decorColumns: [
          column('final_ring_column_a', -4.2, 5.2, 1.8, 6.0, {
            rgb: [92, 198, 214],
            roughness: 0.36,
            alpha: 0.50,
          }),
          column('final_ring_column_b', -0.8, 5.2, 1.8, 6.6, {
            rgb: [92, 198, 214],
            roughness: 0.36,
            alpha: 0.50,
          }),
        ],
        decorPlatforms: [
          platform('final_ring_cap', -2.6, 5.2, 6.2, 0.24, 6.2, {
            y: 5.2,
            rgb: [98, 184, 198],
            surfaceType: 'viewing_deck',
          }),
          platform('final_viewing_gantry', -1.2, 7.4, 14.2, 0.28, 1.2, {
            y: 5.8,
            rgb: [88, 170, 188],
          }),
          platform('final_public_canopy', -4.0, -0.8, 12.6, 0.26, 7.4, {
            y: 5.1,
            rgb: [78, 148, 166],
          }),
        ],
        signage: [
          { offsetX: -0.8, y: 6.0, offsetZ: 8.0, text: 'FINAL EXHIBIT', width: 7.0, height: 1.8 },
        ],
      },
    ],
    connectors: [
      {
        id: 'spawn_to_direct',
        sourceSector: 'spawn_dock',
        destinationSector: 'direct_chamber_approach',
        type: 'doorway',
        x: -29,
        z: 13,
        w: 10,
        d: 8,
        floorY: 0.94,
        ceilingY: 6.8,
        floorSurfaceType: 'threshold',
        wallLanguage: 'guest_turnstile',
        landmarks: ['gallery threshold'],
        shell: {
          rgb: [22, 72, 90],
          roughness: 0.82,
          openSides: ['west', 'east'],
          beamCount: 1,
          beamRgb: [84, 160, 178],
        },
        surfaces: [
          surface('direct_threshold_a', -2.2, -1.0, 4.2, 4.2, 'threshold', {
            floorY: 0.86,
            h: 0.56,
            walkableClassification: 'connector',
          }),
          surface('direct_threshold_b', 2.2, 1.0, 5.6, 4.4, 'viewing_deck', {
            floorY: 0.94,
            h: 0.56,
            walkableClassification: 'connector',
          }),
        ],
      },
      {
        id: 'spawn_to_side',
        sourceSector: 'spawn_dock',
        destinationSector: 'side_service_catwalk',
        type: 'stairs',
        x: -30,
        z: -1,
        w: 10,
        d: 7,
        floorY: 0.82,
        ceilingY: 6.4,
        floorSurfaceType: 'service_stair',
        wallLanguage: 'service_drop',
        landmarks: ['service stair'],
        shell: {
          rgb: [18, 62, 76],
          roughness: 0.84,
          openSides: ['west', 'east'],
          beamCount: 1,
          beamRgb: [72, 138, 156],
        },
        surfaces: [
          surface('side_step_a', -2.4, 0.6, 4.0, 3.8, 'step', {
            floorY: 0.88,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('side_step_b', 1.8, -0.8, 5.6, 3.8, 'landing', {
            floorY: 0.80,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
        ],
      },
      {
        id: 'direct_to_chamber',
        sourceSector: 'direct_chamber_approach',
        destinationSector: 'central_viewing_chamber',
        type: 'hall',
        x: -5,
        z: 20,
        w: 16,
        d: 8,
        floorY: 1.18,
        ceilingY: 7.4,
        floorSurfaceType: 'glass_hall',
        wallLanguage: 'guest_threshold',
        landmarks: ['chamber threshold'],
        shell: {
          rgb: [22, 74, 92],
          roughness: 0.76,
          openSides: ['west', 'east'],
          beamCount: 2,
          beamRgb: [80, 154, 172],
        },
        surfaces: [
          surface('hall_entry', -4.0, 0.0, 6.0, 4.2, 'glass_bridge', {
            floorY: 1.08,
            h: 0.56,
            walkableClassification: 'connector',
          }),
          surface('hall_merge', 2.2, 0.0, 8.4, 4.8, 'viewing_deck', {
            floorY: 1.18,
            h: 0.56,
            walkableClassification: 'connector',
          }),
        ],
        decorBlocks: [
          block('hall_fin', 4.8, 3.0, 1.6, 5.8, 5.8, {
            rgb: [44, 132, 156],
            emissiveScale: 0.05,
            roughness: 0.42,
            alpha: 0.18,
          }),
        ],
      },
      {
        id: 'side_to_chamber',
        sourceSector: 'side_service_catwalk',
        destinationSector: 'central_viewing_chamber',
        type: 'hall',
        x: -6,
        z: -4,
        w: 18,
        d: 8,
        floorY: 1.06,
        ceilingY: 6.8,
        floorSurfaceType: 'catwalk_hall',
        wallLanguage: 'service_link',
        landmarks: ['service link'],
        shell: {
          rgb: [18, 60, 76],
          roughness: 0.84,
          openSides: ['west', 'east'],
          beamCount: 2,
          beamRgb: [72, 142, 160],
        },
        surfaces: [
          surface('side_link_a', -4.4, 0.0, 8.0, 3.8, 'catwalk_grate', {
            floorY: 0.92,
            h: 0.54,
            walkableClassification: 'connector',
          }),
          surface('side_link_b', 3.0, 1.0, 9.0, 4.4, 'wet_service_deck', {
            floorY: 1.06,
            h: 0.54,
            walkableClassification: 'connector',
          }),
        ],
        decorBlocks: [
          block('side_link_wall_north', -1.2, 3.0, 15.0, 3.6, 1.2, {
            rgb: [26, 66, 78],
            emissiveScale: 0.03,
            roughness: 0.86,
          }),
          block('side_link_wall_south', -1.2, -3.2, 15.0, 3.8, 1.4, {
            rgb: [22, 58, 70],
            emissiveScale: 0.02,
            roughness: 0.88,
          }),
        ],
        decorPlatforms: [
          platform('side_link_bundle_a', -1.0, 2.8, 14.6, 0.18, 0.28, { y: 2.4, rgb: [86, 166, 182] }),
          platform('side_link_bundle_b', -1.0, 3.2, 14.6, 0.18, 0.28, { y: 2.7, rgb: [70, 144, 162] }),
        ],
      },
      {
        id: 'chamber_to_upper',
        sourceSector: 'central_viewing_chamber',
        destinationSector: 'overhead_cross_bridge',
        type: 'stairs',
        x: 24,
        z: 8,
        w: 14,
        d: 6,
        floorY: 3.02,
        ceilingY: 7.8,
        floorSurfaceType: 'bridge_rise',
        wallLanguage: 'upper_stair',
        landmarks: ['upper rise'],
        shell: {
          rgb: [22, 68, 82],
          roughness: 0.84,
          openSides: ['west', 'east'],
          beamCount: 2,
          beamRgb: [78, 150, 170],
        },
        surfaces: [
          surface('upper_step_a', -3.8, 0.0, 4.8, 4.0, 'step', {
            floorY: 1.56,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('upper_step_b', 1.0, 0.0, 5.0, 4.0, 'step', {
            floorY: 2.20,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('upper_step_c', 4.8, 0.0, 3.8, 4.0, 'landing', {
            floorY: 3.02,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
        ],
      },
      {
        id: 'chamber_to_lower',
        sourceSector: 'central_viewing_chamber',
        destinationSector: 'lower_maintenance_route',
        type: 'ramp',
        x: 24,
        z: -4,
        w: 14,
        d: 6,
        floorY: 0.56,
        ceilingY: 6.4,
        floorSurfaceType: 'maintenance_ramp',
        wallLanguage: 'maintenance_drop',
        landmarks: ['lower drop'],
        shell: {
          rgb: [18, 58, 72],
          roughness: 0.86,
          openSides: ['west', 'east'],
          beamCount: 2,
          beamRgb: [62, 122, 140],
        },
        surfaces: [
          surface('lower_step_a', -3.8, 0.0, 4.8, 4.0, 'step', {
            floorY: 1.00,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('lower_step_b', 1.0, 0.0, 5.0, 4.0, 'step', {
            floorY: 0.74,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('lower_step_c', 4.8, 0.0, 3.8, 4.0, 'landing', {
            floorY: 0.56,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
        ],
      },
      {
        id: 'upper_to_final',
        sourceSector: 'overhead_cross_bridge',
        destinationSector: 'final_exhibit_platform',
        type: 'bridge',
        x: 40,
        z: 8,
        w: 18,
        d: 6,
        floorY: 2.08,
        ceilingY: 7.2,
        floorSurfaceType: 'cross_bridge',
        wallLanguage: 'upper_final_link',
        landmarks: ['upper final link'],
        shell: {
          rgb: [20, 66, 84],
          roughness: 0.82,
          openSides: ['west', 'east'],
          ceiling: false,
          beamCount: 2,
          beamRgb: [88, 168, 186],
        },
        surfaces: [
          surface('upper_bridge_a', -5.0, 0.8, 7.0, 3.6, 'catwalk_grate', {
            floorY: 2.88,
            h: 0.54,
            walkableClassification: 'bridge',
          }),
          surface('upper_bridge_b', 1.4, -0.8, 8.0, 4.0, 'glass_bridge', {
            floorY: 2.42,
            h: 0.54,
            walkableClassification: 'bridge',
          }),
          surface('upper_bridge_c', 6.2, -0.2, 4.2, 4.0, 'viewing_deck', {
            floorY: 2.08,
            h: 0.54,
            walkableClassification: 'bridge',
          }),
        ],
        decorBlocks: [
          block('upper_final_baffle', 0.6, 2.0, 2.0, 5.6, 5.0, {
            rgb: [28, 72, 88],
            emissiveScale: 0.03,
            roughness: 0.82,
            rotationY: -0.20,
            solid: true,
          }),
        ],
      },
      {
        id: 'lower_to_final',
        sourceSector: 'lower_maintenance_route',
        destinationSector: 'final_exhibit_platform',
        type: 'ramp',
        x: 40,
        z: -4,
        w: 18,
        d: 6,
        floorY: 1.76,
        ceilingY: 6.4,
        floorSurfaceType: 'maintenance_rise',
        wallLanguage: 'maintenance_exit',
        landmarks: ['maintenance rise'],
        shell: {
          rgb: [20, 62, 76],
          roughness: 0.84,
          openSides: ['west', 'east'],
          beamCount: 1,
          beamRgb: [72, 136, 154],
        },
        surfaces: [
          surface('lower_bridge_a', -5.0, 0.0, 6.8, 4.0, 'maintenance_plate', {
            floorY: 0.76,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('lower_bridge_b', 0.8, 0.0, 7.0, 4.0, 'maintenance_plate', {
            floorY: 1.22,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
          surface('lower_bridge_c', 5.8, 0.0, 4.4, 4.0, 'shell_service_deck', {
            floorY: 1.76,
            h: 0.54,
            walkableClassification: 'stairs',
          }),
        ],
      },
      {
        id: 'upper_lower_link',
        sourceSector: 'overhead_cross_bridge',
        destinationSector: 'lower_maintenance_route',
        type: 'lift',
        x: 30,
        z: 0,
        w: 10,
        d: 10,
        floorY: 2.90,
        ceilingY: 8.4,
        floorSurfaceType: 'service_shaft',
        wallLanguage: 'vertical_service_link',
        landmarks: ['service shaft'],
        shell: {
          rgb: [18, 64, 80],
          roughness: 0.84,
          openSides: ['north', 'south'],
          beamCount: 2,
          beamRgb: [88, 164, 184],
        },
        surfaces: [
          surface('shaft_top', -1.2, 2.4, 4.2, 3.0, 'catwalk_grate', {
            floorY: 2.90,
            h: 0.54,
            walkableClassification: 'connector',
          }),
          surface('shaft_mid', 0.8, 0.0, 4.0, 3.0, 'maintenance_plate', {
            floorY: 1.88,
            h: 0.54,
            walkableClassification: 'connector',
          }),
          surface('shaft_bottom', 1.4, -2.4, 4.2, 3.0, 'maintenance_plate', {
            floorY: 0.82,
            h: 0.54,
            walkableClassification: 'connector',
          }),
        ],
        decorBlocks: [
          block('shaft_pipe_bank', -2.4, 0.0, 1.8, 5.2, 8.2, {
            rgb: [24, 62, 78],
            emissiveScale: 0.03,
            roughness: 0.84,
            solid: true,
          }),
        ],
      },
    ],
  },

  coins: [
    { x: -42.2, y: 0, z: 6.4 },
    { x: -37.0, y: 0, z: 10.2 },
    { x: -33.6, y: 0, z: -1.4 },
    { x: -24.6, y: 0, z: 17.2 },
    { x: -18.4, y: 0, z: 23.4 },
    { x: -18.2, y: 0, z: -9.6 },
    { x: -9.8, y: 0, z: -9.4 },
    { x: -0.8, y: 0, z: 16.4 },
    { x: 5.8, y: 0, z: 22.0 },
    { x: 12.6, y: 0, z: 17.2 },
    { x: 17.8, y: 0, z: 8.8 },
    { x: 22.4, y: 0, z: -10.4 },
    { x: 31.4, y: 0, z: -10.2 },
    { x: 29.6, y: 0, z: 8.4 },
    { x: 40.8, y: 0, z: 7.8 },
    { x: 42.0, y: 0, z: -4.4 },
    { x: 50.4, y: 0, z: 5.8 },
    { x: 56.2, y: 0, z: 2.2 },
  ],

  currents: [
    { name: 'current_chamber_cluster', x: 12.2, y: 2.46, z: 13.6, w: 10.2, h: 4.2, d: 8.2, pushX: 1.8, pushZ: -0.4 },
    { name: 'current_service_shaft', x: 30.0, y: 2.26, z: 0.0, w: 7.0, h: 5.8, d: 6.0, pushX: 0.6, pushZ: -2.4 },
    { name: 'current_final_arc', x: 51.8, y: 2.72, z: 6.0, w: 8.2, h: 4.2, d: 6.6, pushX: -1.8, pushZ: 0.8 },
  ],

  deepWaterPockets: [
    { name: 'viewing_pocket', x: 12.0, y: 2.42, z: 13.8, w: 12.4, h: 5.0, d: 10.2 },
    { name: 'service_shaft_pocket', x: 30.0, y: 2.28, z: 0.0, w: 7.2, h: 6.0, d: 6.4 },
    { name: 'final_tank_pocket', x: 53.0, y: 2.82, z: 5.8, w: 9.2, h: 4.8, d: 7.4 },
  ],

  airBubblePickups: [
    { name: 'bubble_viewing', x: 11.6, y: 2.48, z: 13.4, radius: 0.82, refill: 8 },
    { name: 'bubble_shaft', x: 30.0, y: 2.34, z: 0.0, radius: 0.82, refill: 10 },
    { name: 'bubble_final', x: 52.8, y: 2.86, z: 5.8, radius: 0.82, refill: 10 },
  ],

  eelRails: [
    { name: 'eel_viewing_north', x1: 1.6, y1: 1.28, x2: 16.8, y2: 1.48, z: 19.4, phaseOffset: 0.00 },
    { name: 'eel_upper_bridge', x1: 24.4, y1: 2.96, x2: 34.6, y2: 3.08, z: 8.2, phaseOffset: 0.30 },
    { name: 'eel_final_gate', x1: 46.8, y1: 1.92, x2: 55.8, y2: 2.20, z: -0.4, phaseOffset: 0.62 },
  ],

  vents: [
    { name: 'vent_lower_route', x: 22.8, y: 0.30, z: -10.0, w: 2.0, h: 3.6, liftVy: 15.8, phaseOffset: 0.12 },
    { name: 'vent_service_shaft', x: 30.2, y: 0.40, z: 0.0, w: 2.2, h: 4.2, liftVy: 16.4, phaseOffset: 0.48 },
    { name: 'vent_final_arc', x: 49.8, y: 1.56, z: 2.8, w: 2.0, h: 3.6, liftVy: 16.2, phaseOffset: 0.74 },
  ],

  jellyfish: [
    { name: 'jelly_approach', x: -2.2, y: 1.92, z: 17.2, bounds: { minX: -7.6, maxX: 3.2, minY: 1.1, maxY: 3.1, minZ: 14.0, maxZ: 20.8 }, speed: 0.86, turnSpeed: 2.4 },
    { name: 'jelly_viewing_a', x: 8.8, y: 2.48, z: 18.8, bounds: { minX: 3.4, maxX: 14.8, minY: 1.4, maxY: 4.0, minZ: 15.4, maxZ: 22.8 }, speed: 0.98, turnSpeed: 2.5 },
    { name: 'jelly_viewing_b', x: 15.8, y: 2.20, z: 10.0, bounds: { minX: 10.6, maxX: 20.8, minY: 1.3, maxY: 3.8, minZ: 6.0, maxZ: 14.4 }, speed: 1.04, turnSpeed: 2.6 },
    { name: 'jelly_lower_a', x: 21.8, y: 1.40, z: -10.0, bounds: { minX: 14.2, maxX: 28.4, minY: 0.8, maxY: 2.8, minZ: -13.8, maxZ: -6.6 }, speed: 1.06, turnSpeed: 2.7 },
    { name: 'jelly_lower_b', x: 30.2, y: 2.00, z: -0.8, bounds: { minX: 27.2, maxX: 33.6, minY: 1.0, maxY: 4.2, minZ: -3.8, maxZ: 2.2 }, speed: 1.08, turnSpeed: 2.8 },
    { name: 'jelly_final_a', x: 51.4, y: 2.78, z: 4.8, bounds: { minX: 46.0, maxX: 56.2, minY: 1.8, maxY: 4.6, minZ: 1.4, maxZ: 8.4 }, speed: 1.12, turnSpeed: 2.8 },
    { name: 'jelly_final_b', x: 56.2, y: 2.94, z: 1.2, bounds: { minX: 51.0, maxX: 60.0, minY: 2.0, maxY: 4.8, minZ: -1.6, maxZ: 4.2 }, speed: 1.10, turnSpeed: 2.7 },
  ],

  sharkSweep: {
    name: 'shark_final_sweep',
    xMin: 47.0,
    xMax: 59.0,
    y: 2.52,
    z: 3.2,
    width: 4.2,
    height: 2.8,
    phaseOffset: 0.35,
  },

  signage: [
    { x: -23.2, y: 5.8, z: 14.8, text: 'PUBLIC GALLERY →', width: 6.6, height: 1.7 },
    { x: -18.4, y: 4.8, z: -4.8, text: 'STAFF ONLY', width: 4.8, height: 1.5 },
    { x: 20.6, y: 5.0, z: -16.2, text: 'LOWER MAINTENANCE', width: 7.8, height: 1.8 },
    { x: 47.2, y: 6.0, z: 12.4, text: 'FINAL EXHIBIT', width: 6.8, height: 1.7 },
  ],

  decorPlanes: [
    { name: 'spawn_fish_shadow', x: -37.0, y: 6.4, z: 12.2, width: 11.8, height: 2.6, rotationY: 0.08, rgb: [10, 26, 36], emissiveScale: 0.03, alpha: 0.16 },
    { name: 'approach_fish_shadow', x: -16.4, y: 7.8, z: 24.2, width: 10.2, height: 2.2, rotationY: -0.14, rgb: [10, 28, 36], emissiveScale: 0.03, alpha: 0.16 },
    { name: 'chamber_creature_shadow', x: 9.8, y: 7.8, z: 20.0, width: 18.0, height: 4.0, rotationY: -0.08, rgb: [8, 22, 30], emissiveScale: 0.03, alpha: 0.12 },
    { name: 'chamber_fish_shadow_a', x: 14.8, y: 8.8, z: 20.8, width: 10.4, height: 2.4, rotationY: 0.10, rgb: [8, 24, 32], emissiveScale: 0.03, alpha: 0.20 },
    { name: 'chamber_fish_shadow_b', x: 5.4, y: 9.4, z: 18.8, width: 7.2, height: 1.8, rotationY: -0.12, rgb: [8, 24, 32], emissiveScale: 0.03, alpha: 0.18 },
    { name: 'chamber_caustic_band', x: 10.0, y: 10.2, z: 19.4, width: 30.0, height: 4.4, rgb: [126, 214, 226], emissiveScale: 0.12, alpha: 0.12 },
    { name: 'lower_warning_plane', x: 20.8, y: 2.6, z: -6.6, width: 2.4, height: 1.2, rotationY: 0.42, rgb: [228, 186, 94], emissiveScale: 0.14, alpha: 0.38 },
    { name: 'final_fish_shadow', x: 58.2, y: 7.0, z: 7.0, width: 7.4, height: 1.8, rotationY: 0.18, rgb: [10, 28, 36], emissiveScale: 0.03, alpha: 0.16 },
  ],

  decorBlocks: [
    { name: 'aquarium_outer_north_glass', x: 8.0, y: 5.2, z: 26.4, w: 64.0, h: 11.0, d: 1.4, rgb: [40, 126, 152], emissiveScale: 0.06, roughness: 0.42, alpha: 0.18 },
    { name: 'aquarium_outer_north_volume', x: 8.0, y: 5.0, z: 31.6, w: 62.0, h: 10.0, d: 8.8, rgb: [22, 82, 106], emissiveScale: 0.02, roughness: 0.34, alpha: 0.08, solid: true },
    { name: 'aquarium_outer_south_wall', x: 10.0, y: 4.8, z: -24.8, w: 70.0, h: 10.2, d: 3.8, rgb: [22, 62, 76], emissiveScale: 0.02, roughness: 0.88, solid: true },
    { name: 'aquarium_outer_west_hull', x: -46.2, y: 4.8, z: 5.6, w: 4.2, h: 10.6, d: 28.0, rgb: [24, 66, 82], emissiveScale: 0.03, roughness: 0.86, solid: true },
    { name: 'aquarium_goal_hull', x: 61.0, y: 4.8, z: 3.0, w: 6.0, h: 10.2, d: 18.0, rgb: [24, 68, 84], emissiveScale: 0.03, roughness: 0.86, solid: true },
    { name: 'aquarium_upper_service_gallery', x: 4.0, y: 7.0, z: 22.4, w: 36.0, h: 2.8, d: 3.2, rgb: [28, 78, 94], emissiveScale: 0.03, roughness: 0.84, solid: true },
    { name: 'aquarium_lower_machine_spine', x: 22.0, y: 3.0, z: -18.4, w: 38.0, h: 5.2, d: 2.2, rgb: [24, 68, 86], emissiveScale: 0.04, roughness: 0.82, solid: true },
    { name: 'aquarium_east_superstructure', x: 43.4, y: 5.0, z: 10.8, w: 8.2, h: 8.4, d: 18.0, rgb: [28, 76, 92], emissiveScale: 0.03, roughness: 0.84, solid: true },
    { name: 'aquarium_west_support_bank', x: -7.6, y: 4.0, z: 0.2, w: 5.8, h: 7.6, d: 16.0, rgb: [28, 74, 90], emissiveScale: 0.03, roughness: 0.84, solid: true },
    { name: 'aquarium_underdeck_mass_a', x: -18.0, y: -0.6, z: 7.6, w: 18.0, h: 3.4, d: 8.2, rgb: [18, 42, 50], emissiveScale: 0.02, roughness: 0.90, solid: true },
    { name: 'aquarium_underdeck_mass_b', x: 10.2, y: -0.8, z: 10.2, w: 28.0, h: 3.8, d: 12.0, rgb: [18, 42, 50], emissiveScale: 0.02, roughness: 0.90, solid: true },
    { name: 'aquarium_underdeck_mass_c', x: 28.0, y: -0.6, z: -10.0, w: 26.0, h: 3.2, d: 8.0, rgb: [18, 42, 50], emissiveScale: 0.02, roughness: 0.90, solid: true },
    { name: 'aquarium_underdeck_mass_d', x: 50.0, y: 0.2, z: 4.4, w: 16.0, h: 3.0, d: 8.4, rgb: [18, 42, 50], emissiveScale: 0.02, roughness: 0.90, solid: true },
  ],

  decorColumns: [
    { name: 'aquarium_pillar_a', x: -6.8, y: 3.8, z: 24.6, diameter: 2.0, height: 7.8, rgb: [82, 184, 204], emissiveScale: 0.08, roughness: 0.42, alpha: 0.36 },
    { name: 'aquarium_pillar_b', x: 37.6, y: 4.0, z: 18.8, diameter: 1.8, height: 8.0, rgb: [82, 184, 204], emissiveScale: 0.08, roughness: 0.42, alpha: 0.34 },
    { name: 'aquarium_filtration_tower', x: 9.2, y: 4.2, z: -15.6, diameter: 2.8, height: 7.6, rgb: [74, 156, 176], emissiveScale: 0.06, roughness: 0.48 },
  ],

  decorPlatforms: [
    { name: 'aquarium_pipe_spine', x: 8.0, y: 7.6, z: 18.6, w: 42.0, h: 0.42, d: 2.4, rgb: [80, 156, 176] },
    { name: 'aquarium_service_bundle_a', x: 6.0, y: 6.8, z: -15.0, w: 20.0, h: 0.30, d: 1.6, rgb: [74, 148, 166] },
    { name: 'aquarium_bridge_frame', x: 28.0, y: 6.0, z: 8.2, w: 12.0, h: 0.30, d: 1.6, rgb: [88, 170, 188] },
  ],
});

export const LEVEL5 = {
  ...BASE_LEVEL5,
  coins: normalizeCoinsOnSurfaces(BASE_LEVEL5, { defaultZ: 0 }),
};
