/*
 * Deterministic level music specifications.
 *
 * Each level defines:
 * - tempo / key / motif / 24-bar A-B-C form
 * - instrument roles
 * - cue palette
 * - exact per-bar note and rhythm data on an 8th-note grid
 */

const CHORDS = {
  G: ['G3', 'B3', 'D4'],
  Em: ['E3', 'G3', 'B3'],
  C: ['C3', 'E3', 'G3'],
  D: ['D3', 'F#3', 'A3'],
  B7: ['B2', 'D#3', 'F#3', 'A3'],
  Cm: ['C3', 'Eb3', 'G3'],
  A7: ['A2', 'C#3', 'E3', 'G3'],

  Am7: ['A3', 'C4', 'E4', 'G4'],
  Fmaj7: ['F3', 'A3', 'C4', 'E4'],
  Dm7: ['D3', 'F3', 'A3', 'C4'],
  E7: ['E3', 'G#3', 'B3', 'D4'],
  Gadd9: ['G3', 'B3', 'D4', 'A4'],

  Bm: ['B2', 'D3', 'F#3'],
  A: ['A2', 'C#3', 'E3'],
  Gm: ['G2', 'Bb2', 'D3'],
  'F#m': ['F#2', 'A2', 'C#3'],
  E7home: ['E2', 'G#2', 'B2', 'D3'],
};

function steps(...values) {
  const out = values.slice(0, 8);
  while (out.length < 8) out.push(null);
  return out;
}

function bar(chordName, {
  lead = steps(),
  counter = steps(),
  accent = steps(),
  bass = steps(),
  kick = [],
  snare = [],
  hat = [],
  shaker = [],
  rim = [],
  vinyl = false,
} = {}) {
  return {
    chordName,
    chord: CHORDS[chordName],
    lead,
    counter,
    accent,
    bass,
    kick,
    snare,
    hat,
    shaker,
    rim,
    vinyl,
  };
}

/*
 * Level 1 — Toy-country storybook
 * Tempo: 112 BPM
 * Key: G major
 * Motif: G4 A4 B4 A4
 * Roles:
 * - chord: warm storybook pad
 * - lead: toy piano melody
 * - bass: soft upright / tuba-like footsteps
 * - counter: whistle / clarinet answer phrases
 * - accent: sparse banjo plucks
 * Cue palette:
 * - checkpoint: cheerful toy-piano ding + whistle answer
 * - near miss: quick whistle scoop
 * - collision: soft descending “oops”
 * - level complete: resolved cadence + sparkle
 */
export const LEVEL1_MUSIC_SPEC = {
  levelId: 1,
  title: 'Toy-country storybook',
  explanation: 'Playful daytime zoo loop with waddle rhythm, toy-piano lead, footstep bass, and tiny whistle/banjo answers.',
  tempo: 112,
  key: 'G major',
  motif: ['G4', 'A4', 'B4', 'A4'],
  roles: {
    chord: 'storybook pad',
    lead: 'toy piano',
    bass: 'upright/tuba bass',
    counter: 'whistle clarinet',
    accent: 'banjo pluck',
    percussion: 'rim click + shaker + soft kick',
  },
  cuePalette: {
    checkpoint: 'Cheerful ding with short whistle answer',
    nearMiss: 'Quick comedic scoop without alarm',
    collision: 'Soft descending oops cue',
    levelComplete: 'Cute cadence with sparkle',
  },
  sections: [
    {
      name: 'A',
      progression: ['G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D'],
      bars: [
        bar('G',  { lead: steps('G4', null, 'A4', 'B4', 'A4', null, 'G4', 'D4'), counter: steps(null, null, null, null, null, null, 'D5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('E4', null, 'G4', 'A4', 'B4', null, 'A4', 'G4'), counter: steps(null, null, null, null, null, 'B4', null, null), accent: steps(null, null, null, null, 'D4', null, null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Em', { lead: steps('E4', null, 'G4', 'B4', 'A4', null, 'G4', 'E4'), counter: steps(null, null, null, null, null, null, 'B4', null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Em', { lead: steps('G4', null, 'A4', 'B4', 'G4', null, 'E4', 'D4'), counter: steps(null, null, null, 'G5', null, null, null, null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('C',  { lead: steps('E4', null, 'G4', 'A4', 'G4', null, 'E4', 'D4'), counter: steps(null, null, null, null, null, 'G4', null, null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('C',  { lead: steps('E4', null, 'G4', 'A4', 'B4', 'A4', 'G4', 'E4'), counter: steps(null, null, null, null, 'C5', null, null, null), accent: steps(null, null, null, null, null, null, 'G4', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('F#4', null, 'A4', 'B4', 'A4', null, 'F#4', 'E4'), counter: steps(null, null, null, null, null, null, 'A4', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('A4', null, 'B4', 'A4', 'F#4', null, 'E4', 'D4'), counter: steps(null, null, null, null, 'D5', null, null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'B',
      progression: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
      bars: [
        bar('G',  { lead: steps('G4', null, 'B4', 'D5', 'B4', null, 'A4', 'G4'), counter: steps(null, null, null, null, null, 'D5', null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('A4', null, 'F#4', 'E4', 'D4', null, 'F#4', 'A4'), counter: steps(null, null, null, 'A4', null, null, null, null), accent: steps(null, null, null, null, 'D4', null, null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Em', { lead: steps('E4', null, 'G4', 'A4', 'B4', null, 'G4', 'E4'), counter: steps(null, null, null, null, 'B4', null, null, null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('C',  { lead: steps('E4', null, 'G4', 'E4', 'D4', null, 'G4', 'A4'), counter: steps(null, null, null, null, null, null, 'C5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('G4', null, 'A4', 'B4', 'D5', null, 'B4', 'A4'), counter: steps(null, null, 'D5', null, null, null, null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('A4', null, 'F#4', 'A4', 'B4', null, 'A4', 'F#4'), counter: steps(null, null, null, null, 'D5', null, null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('C',  { lead: steps('G4', null, 'E4', 'G4', 'A4', null, 'G4', 'E4'), counter: steps(null, null, null, 'C5', null, null, null, null), accent: steps(null, null, null, null, null, null, 'G4', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('F#4', null, 'A4', 'B4', 'A4', null, 'F#4', 'D4'), counter: steps(null, null, null, null, null, 'A4', null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'C',
      progression: ['G', 'B7', 'C', 'Cm', 'G', 'Em', 'A7', 'D'],
      bars: [
        bar('G',  { lead: steps('G4', 'A4', 'B4', 'D5', 'B4', 'A4', 'G4', 'D4'), counter: steps(null, null, null, null, null, null, 'D5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('B7', { lead: steps('B4', null, 'A4', 'F#4', 'D#4', null, 'F#4', 'A4'), counter: steps(null, null, null, null, 'B4', null, null, null), accent: steps(null, null, null, null, 'F#4', null, null, null), bass: steps('B2', null, null, null, 'F#2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('C',  { lead: steps('E4', null, 'G4', 'A4', 'G4', null, 'E4', 'D4'), counter: steps(null, null, null, null, null, null, 'C5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Cm', { lead: steps('Eb4', null, 'G4', 'Bb4', 'G4', null, 'Eb4', 'D4'), counter: steps(null, null, null, 'G4', null, null, null, null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('G4', null, 'A4', 'B4', 'D5', null, 'B4', 'A4'), counter: steps(null, null, 'D5', null, null, null, null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Em', { lead: steps('E4', null, 'G4', 'B4', 'A4', null, 'G4', 'E4'), counter: steps(null, null, null, null, 'B4', null, null, null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A7', { lead: steps('A4', null, 'C#5', 'E5', 'D5', null, 'C#5', 'A4'), counter: steps(null, null, null, null, null, 'E5', null, null), accent: steps(null, null, null, null, 'E4', null, null, null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('F#4', null, 'A4', 'B4', 'A4', null, 'F#4', 'D4'), counter: steps(null, null, null, null, 'A4', null, null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
  ],
  cues: {
    checkpoint: [
      { beat: 0, role: 'lead', note: 'D5', duration: 0.5, gain: 0.18 },
      { beat: 0.25, role: 'lead', note: 'G5', duration: 0.55, gain: 0.2 },
      { beat: 0.5, role: 'counter', note: 'B5', duration: 0.45, gain: 0.12 },
    ],
    nearMiss: [
      { beat: 0, role: 'counter', note: 'A5', duration: 0.18, gain: 0.1, glideTo: 'F#5' },
      { beat: 0.25, role: 'lead', note: 'G5', duration: 0.16, gain: 0.1 },
    ],
    collision: [
      { beat: 0, role: 'counter', note: 'B4', duration: 0.2, gain: 0.12 },
      { beat: 0.25, role: 'counter', note: 'G4', duration: 0.24, gain: 0.1 },
      { beat: 0.5, role: 'bass', note: 'D3', duration: 0.35, gain: 0.1 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['G4', 'B4', 'D5'], duration: 1.2, gain: 0.12 },
      { beat: 0, role: 'lead', note: 'G5', duration: 0.4, gain: 0.16 },
      { beat: 0.5, role: 'lead', note: 'A5', duration: 0.4, gain: 0.16 },
      { beat: 1.0, role: 'lead', note: 'B5', duration: 0.5, gain: 0.16 },
      { beat: 1.5, role: 'counter', note: 'D6', duration: 0.6, gain: 0.12 },
    ],
  },
};

/*
 * Level 2 — Lofi beats
 * Tempo: 84 BPM
 * Key: A minor
 * Motif: A4 C5 E5 D5
 * Roles:
 * - chord: Rhodes pad
 * - bass: sub bass
 * - lead: soft bell
 * - counter: muted synth answer
 * - percussion: kick, snare, hat, vinyl noise
 */
export const LEVEL2_MUSIC_SPEC = {
  levelId: 2,
  title: 'Lofi beats',
  explanation: 'Warm study-beat loop with Rhodes pad, sub bass, soft hats, and a sparse bell motif that stays out of the player’s way.',
  tempo: 84,
  key: 'A minor',
  motif: ['A4', 'C5', 'E5', 'D5'],
  roles: {
    chord: 'Rhodes pad',
    bass: 'sub bass',
    lead: 'soft bell',
    counter: 'muted synth answer',
    percussion: 'lofi kick + snare + hats + vinyl',
  },
  cuePalette: {
    checkpoint: 'Rhodes stab with tiny chime',
    nearMiss: 'Micro tape-stop dip with rim tick',
    collision: 'Soft thud with low chord',
    levelComplete: 'Resolved Rhodes chord with gentle arpeggio',
  },
  sections: [
    {
      name: 'A',
      progression: ['Am7', 'Am7', 'Fmaj7', 'Fmaj7', 'Dm7', 'Dm7', 'E7', 'E7'],
      bars: [
        bar('Am7',  { lead: steps('A4', null, 'C5', null, 'E5', null, 'D5', null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Am7',  { lead: steps(null, null, 'A4', null, 'C5', null, 'E5', null), counter: steps(null, null, null, null, null, 'G4', null, null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Fmaj7',{ lead: steps('A4', null, 'C5', null, 'E5', null, 'C5', null), bass: steps('F2', null, null, null, 'C3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Fmaj7',{ lead: steps(null, null, 'A4', null, 'C5', null, 'D5', null), counter: steps(null, null, null, null, null, 'E4', null, null), bass: steps('F2', null, null, null, 'C3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps('D5', null, 'F5', null, 'E5', null, 'C5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps(null, null, 'D5', null, 'F5', null, 'E5', null), counter: steps(null, null, null, null, 'C5', null, null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('E7',   { lead: steps('E5', null, 'G#5', null, 'B5', null, 'A5', null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('E7',   { lead: steps(null, null, 'E5', null, 'G#5', null, 'B5', null), counter: steps(null, null, null, null, null, 'D5', null, null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
      ],
    },
    {
      name: 'B',
      progression: ['Am7', 'Gadd9', 'Fmaj7', 'Dm7', 'Am7', 'Gadd9', 'Dm7', 'E7'],
      bars: [
        bar('Am7',  { lead: steps('A4', null, 'C5', null, 'E5', null, 'D5', null), counter: steps(null, null, null, null, 'G4', null, null, null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Gadd9',{ lead: steps('G4', null, 'A4', null, 'D5', null, 'B4', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Fmaj7',{ lead: steps('A4', null, 'C5', null, 'E5', null, 'D5', null), bass: steps('F2', null, null, null, 'C3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps('D5', null, 'F5', null, 'A5', null, 'E5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Am7',  { lead: steps('A4', null, 'C5', null, 'E5', null, 'D5', null), counter: steps(null, null, null, null, null, 'E4', null, null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Gadd9',{ lead: steps('G4', null, 'A4', null, 'D5', null, 'B4', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps('D5', null, 'F5', null, 'E5', null, 'C5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('E7',   { lead: steps('E5', null, 'G#5', null, 'B5', null, 'D5', null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
      ],
    },
    {
      name: 'C',
      progression: ['Am7', 'Am7', 'Dm7', 'Dm7', 'Fmaj7', 'E7', 'Dm7', 'E7'],
      bars: [
        bar('Am7',  { lead: steps('A4', null, 'C5', null, 'E5', null, 'A5', null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Am7',  { lead: steps(null, null, 'A4', null, 'C5', null, 'E5', null), counter: steps(null, null, null, null, 'G4', null, null, null), bass: steps('A2', null, null, null, 'E2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps('D5', null, 'F5', null, 'A5', null, 'F5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps(null, null, 'D5', null, 'F5', null, 'E5', null), counter: steps(null, null, null, null, null, 'C5', null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Fmaj7',{ lead: steps('A4', null, 'C5', null, 'E5', null, 'G5', null), bass: steps('F2', null, null, null, 'C3', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('E7',   { lead: steps('E5', null, 'G#5', null, 'B5', null, 'A5', null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('Dm7',  { lead: steps('D5', null, 'F5', null, 'E5', null, 'C5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
        bar('E7',   { lead: steps('E5', null, 'G#5', null, 'B5', null, 'D5', null), bass: steps('E2', null, null, null, 'B2', null, null, null), kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], vinyl: true }),
      ],
    },
  ],
  cues: {
    checkpoint: [
      { beat: 0, role: 'chord', notes: ['A4', 'C5', 'E5'], duration: 0.9, gain: 0.1 },
      { beat: 0.25, role: 'lead', note: 'E5', duration: 0.35, gain: 0.09 },
    ],
    nearMiss: [
      { beat: 0, role: 'lead', note: 'E5', duration: 0.16, gain: 0.08, glideTo: 'D5' },
      { beat: 0.15, drum: 'rim', gain: 0.05 },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'A2', duration: 0.35, gain: 0.1 },
      { beat: 0, role: 'chord', notes: ['A3', 'C4', 'E4'], duration: 0.5, gain: 0.06 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['A4', 'C5', 'E5'], duration: 1.4, gain: 0.11 },
      { beat: 0, role: 'lead', note: 'A5', duration: 0.35, gain: 0.1 },
      { beat: 0.5, role: 'lead', note: 'C6', duration: 0.35, gain: 0.1 },
      { beat: 1.0, role: 'lead', note: 'E6', duration: 0.45, gain: 0.11 },
    ],
  },
};

/*
 * Level 3 — Home family sound
 * Tempo: 104 BPM
 * Key: D major
 * Motif: D5 E5 F#5 E5
 * Roles:
 * - chord: warm home pad
 * - lead: toy piano / glock
 * - bass: soft upright / tuba
 * - counter: clarinet / whistle
 * - percussion: shaker + rim
 */
export const LEVEL3_MUSIC_SPEC = {
  levelId: 3,
  title: 'Home family sound',
  explanation: 'Cozy living-room loop with toy piano lead, warm bass, dry shaker, and a singable family-safe motif.',
  tempo: 104,
  key: 'D major',
  motif: ['D5', 'E5', 'F#5', 'E5'],
  roles: {
    chord: 'warm home pad',
    lead: 'toy piano glock',
    bass: 'upright / tuba bass',
    counter: 'clarinet whistle',
    percussion: 'dry shaker + rim',
  },
  cuePalette: {
    checkpoint: 'Cheerful ding with I chord',
    nearMiss: 'Quick oops grace note with whistle answer',
    collision: 'Soft bonk with passing tone',
    levelComplete: 'Cute cadence with sparkle',
  },
  sections: [
    {
      name: 'A',
      progression: ['D', 'D', 'Bm', 'Bm', 'G', 'G', 'A', 'A'],
      bars: [
        bar('D',  { lead: steps('D5', null, 'E5', null, 'F#5', null, 'E5', null), counter: steps(null, null, null, null, null, 'A5', null, null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps(null, null, 'D5', null, 'E5', null, 'F#5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Bm', { lead: steps('B4', null, 'D5', null, 'F#5', null, 'E5', null), counter: steps(null, null, null, null, 'A5', null, null, null), bass: steps('B1', null, null, null, 'F#2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Bm', { lead: steps(null, null, 'B4', null, 'D5', null, 'E5', null), bass: steps('B1', null, null, null, 'F#2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('G4', null, 'A4', null, 'B4', null, 'D5', null), counter: steps(null, null, null, null, null, 'G5', null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps(null, null, 'G4', null, 'A4', null, 'B4', null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',  { lead: steps('A4', null, 'C#5', null, 'E5', null, 'D5', null), counter: steps(null, null, null, null, 'E5', null, null, null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',  { lead: steps(null, null, 'A4', null, 'C#5', null, 'E5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'B',
      progression: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
      bars: [
        bar('D',  { lead: steps('D5', null, 'E5', null, 'F#5', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',  { lead: steps('A4', null, 'C#5', null, 'E5', null, 'F#5', null), counter: steps(null, null, null, null, 'A5', null, null, null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Bm', { lead: steps('B4', null, 'D5', null, 'F#5', null, 'E5', null), bass: steps('B1', null, null, null, 'F#2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('G4', null, 'A4', null, 'B4', null, 'D5', null), counter: steps(null, null, null, null, null, 'G5', null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',  { lead: steps('D5', null, 'E5', null, 'F#5', null, 'E5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',  { lead: steps('A4', null, 'C#5', null, 'E5', null, 'D5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',  { lead: steps('G4', null, 'A4', null, 'B4', null, 'D5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',  { lead: steps('A4', null, 'C#5', null, 'E5', null, 'F#5', null), counter: steps(null, null, null, null, 'C#6', null, null, null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'C',
      progression: ['D', 'F#m', 'G', 'Gm', 'D', 'Bm', 'E7home', 'A'],
      bars: [
        bar('D',      { lead: steps('D5', null, 'E5', null, 'F#5', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('F#m',    { lead: steps('F#4', null, 'A4', null, 'C#5', null, 'E5', null), counter: steps(null, null, null, null, 'A5', null, null, null), bass: steps('F#2', null, null, null, 'C#3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('G',      { lead: steps('G4', null, 'A4', null, 'B4', null, 'D5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('G4', null, 'Bb4', null, 'D5', null, 'C5', null), counter: steps(null, null, null, null, 'D5', null, null, null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('D',      { lead: steps('D5', null, 'E5', null, 'F#5', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('Bm',     { lead: steps('B4', null, 'D5', null, 'F#5', null, 'E5', null), bass: steps('B1', null, null, null, 'F#2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('E7home', { lead: steps('E5', null, 'G#5', null, 'B5', null, 'A5', null), counter: steps(null, null, null, null, 'D6', null, null, null), bass: steps('E2', null, null, null, 'B2', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
        bar('A',      { lead: steps('A4', null, 'C#5', null, 'E5', null, 'D5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], shaker: [1, 3, 5, 7] }),
      ],
    },
  ],
  cues: {
    checkpoint: [
      { beat: 0, role: 'lead', note: 'F#5', duration: 0.35, gain: 0.15 },
      { beat: 0.25, role: 'chord', notes: ['D5', 'F#5', 'A5'], duration: 0.8, gain: 0.1 },
    ],
    nearMiss: [
      { beat: 0, role: 'counter', note: 'E5', duration: 0.14, gain: 0.09 },
      { beat: 0.2, role: 'counter', note: 'D5', duration: 0.18, gain: 0.09 },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'D3', duration: 0.28, gain: 0.08 },
      { beat: 0.15, role: 'counter', note: 'C5', duration: 0.18, gain: 0.08 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['D5', 'F#5', 'A5'], duration: 1.2, gain: 0.12 },
      { beat: 0, role: 'lead', note: 'D6', duration: 0.35, gain: 0.14 },
      { beat: 0.5, role: 'lead', note: 'F#6', duration: 0.35, gain: 0.14 },
      { beat: 1.0, role: 'counter', note: 'A6', duration: 0.5, gain: 0.11 },
    ],
  },
};

export const LEVEL_MUSIC_SPECS = {
  1: LEVEL1_MUSIC_SPEC,
  2: LEVEL2_MUSIC_SPEC,
  3: LEVEL3_MUSIC_SPEC,
};
