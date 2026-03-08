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

  // Level 4 — D minor / "slow bubbly tron"
  Dm:     ['D3', 'F3', 'A3'],
  Bb:     ['Bb2', 'D3', 'F3'],
  Dmadd9: ['D3', 'F3', 'A3', 'E4'],
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

/*
 * Level 4 — Slow Bubbly Tron (Super Sourdough bakery)
 * Tempo: 80 BPM
 * Key: D minor (with one add9 "tron color" chord in Section C)
 * Motif: D4 F4 A4 C5  (rising D minor arp cell)
 * Roles:
 * - chord:   neon pad  (soft sawtooth + lowpass, slow attack)
 * - lead:    bubbly pluck / arp  (triangle + sine, short decay)
 * - bass:    sub bass  (pure sine, downbeat root notes)
 * - counter: sparkle top  (high sine bell ticks)
 * - accent:  ultra-quiet sparkle accent
 * Cue palette:
 * - checkpoint:   bright "bloop" + small chord stab
 * - nearMiss:     tiny "pew" blip with gliss
 * - collision:    soft down-gliss "whoop"
 * - levelComplete: cute neon cadence + sparkle
 * 24-bar form A/B/C (8 bars each):
 * A: i  | i  | VI | VI | iv | iv | VII | VII
 *    Dm    Dm   Bb   Bb   Gm   Gm   C     C
 * B: i  | VII | VI | iv | i  | VII | iv | VII
 *    Dm   C     Bb   Gm   Dm   C     Gm   C
 * C: i  | i(add9) | iv | iv | VI | VII | iv | VII
 *    Dm   Dmadd9    Gm   Gm   Bb   C     Gm   C
 */
export const LEVEL4_MUSIC_SPEC = {
  levelId: 4,
  title: 'Slow bubbly tron',
  explanation: 'Atmospheric neon arp loop with sub bass, bubbly pluck lead, sparkle top, and slow pad — surreal bakery tron feel.',
  tempo: 80,
  key: 'D minor',
  motif: ['D4', 'F4', 'A4', 'C5'],
  roles: {
    chord:    'neon pad (soft saw + lowpass, slow attack)',
    lead:     'bubbly pluck arp (triangle + sine, short decay)',
    bass:     'sub bass (sine, downbeat roots)',
    counter:  'sparkle top (high sine bell ticks)',
    accent:   'ultra-quiet sparkle accent',
    percussion: 'sub kick + tron hi-hat tick',
  },
  cuePalette: {
    checkpoint:   'Bright bloop + small chord stab',
    nearMiss:     'Tiny pew blip with downward gliss',
    collision:    'Soft down-gliss whoop',
    levelComplete: 'Cute neon cadence + sparkle',
  },
  sections: [
    {
      name: 'A',
      progression: ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'C', 'C'],
      bars: [
        // Bar 1 — Dm ascending arp
        bar('Dm', {
          lead:  steps('D4', null, 'F4', null, 'A4', null, 'C5', null),
          bass:  steps('D2', null, null, null, 'D3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 2 — Dm descend + counter sparkle
        bar('Dm', {
          lead:    steps(null, null, 'C5', null, 'A4', null, 'F4', null),
          counter: steps(null, null, null, null, null, null, null, 'F5'),
          bass:    steps('D2', null, null, null, 'D3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 3 — Bb ascending
        bar('Bb', {
          lead:  steps('Bb3', null, 'D4', null, 'F4', null, 'Bb4', null),
          bass:  steps('Bb1', null, null, null, 'Bb2', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 4 — Bb descend
        bar('Bb', {
          lead:  steps(null, null, 'Bb4', null, 'F4', null, 'D4', null),
          bass:  steps('Bb1', null, null, null, 'Bb2', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 5 — Gm ascending
        bar('Gm', {
          lead:  steps('G3', null, 'Bb3', null, 'D4', null, 'G4', null),
          bass:  steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 6 — Gm descend + counter sparkle
        bar('Gm', {
          lead:    steps(null, null, 'G4', null, 'D4', null, 'Bb3', null),
          counter: steps(null, null, null, null, null, null, null, 'G5'),
          bass:    steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 7 — C ascending
        bar('C', {
          lead:  steps('C4', null, 'E4', null, 'G4', null, 'C5', null),
          bass:  steps('C2', null, null, null, 'C3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 8 — C descend (resolves back to Dm)
        bar('C', {
          lead:    steps(null, null, 'C5', null, 'G4', null, 'E4', null),
          counter: steps(null, null, null, null, null, null, 'G5', null),
          bass:    steps('C2', null, null, null, 'C3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
      ],
    },
    {
      name: 'B',
      progression: ['Dm', 'C', 'Bb', 'Gm', 'Dm', 'C', 'Gm', 'C'],
      bars: [
        // Bar 9 — Dm slightly busier arp
        bar('Dm', {
          lead:  steps('D4', null, 'F4', 'A4', null, 'C5', null, 'A4'),
          bass:  steps('D2', null, null, null, 'D3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 10 — C ascending with echo
        bar('C', {
          lead:    steps('E4', null, 'G4', null, 'C5', null, 'G4', null),
          counter: steps(null, null, null, null, null, null, null, 'C5'),
          bass:    steps('C2', null, null, null, 'C3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 11 — Bb inner voice movement
        bar('Bb', {
          lead:  steps('D4', null, 'F4', null, 'Bb4', null, 'F4', null),
          bass:  steps('Bb1', null, null, null, 'Bb2', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 12 — Gm with sparkle
        bar('Gm', {
          lead:    steps('D4', null, 'G4', null, 'Bb4', null, 'G4', null),
          counter: steps(null, null, null, null, null, null, 'D5', null),
          bass:    steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 13 — Dm higher register
        bar('Dm', {
          lead:  steps('A4', null, 'C5', null, 'D5', null, 'C5', null),
          bass:  steps('D2', null, null, null, 'D3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 14 — C descend
        bar('C', {
          lead:  steps('C5', null, 'G4', null, 'E4', null, 'G4', null),
          bass:  steps('C2', null, null, null, 'C3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 15 — Gm descend with counter
        bar('Gm', {
          lead:    steps('G4', null, 'D4', null, 'Bb3', null, 'D4', null),
          counter: steps(null, null, null, null, 'G4', null, null, null),
          bass:    steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 16 — C rising (anticipates Section C)
        bar('C', {
          lead:    steps('E4', null, 'G4', null, 'C5', null, 'E5', null),
          counter: steps(null, null, null, null, null, null, null, 'G5'),
          bass:    steps('C2', null, null, null, 'C3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
      ],
    },
    {
      name: 'C',
      progression: ['Dm', 'Dmadd9', 'Gm', 'Gm', 'Bb', 'C', 'Gm', 'C'],
      bars: [
        // Bar 17 — Dm strong ascent with accent sparkle
        bar('Dm', {
          lead:   steps('D4', null, 'F4', null, 'A4', null, 'D5', null),
          accent: steps(null, null, null, null, null, null, null, 'F5'),
          bass:   steps('D2', null, null, null, 'D3', null, null, null),
          hat:    [1, 2, 3, 5, 6, 7],
          kick:   [0, 4],
        }),
        // Bar 18 — Dmadd9 (tasteful add9 "tron color" — E is the 9th)
        bar('Dmadd9', {
          lead:    steps('E4', null, 'A4', null, 'D5', null, 'A4', null),
          counter: steps(null, null, null, null, null, null, 'E5', null),
          bass:    steps('D2', null, null, null, 'D3', null, null, null),
          hat:     [1, 2, 3, 5, 6, 7],
          kick:    [0, 4],
        }),
        // Bar 19 — Gm high
        bar('Gm', {
          lead:  steps('G4', null, 'Bb4', null, 'D5', null, 'Bb4', null),
          bass:  steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 20 — Gm descend
        bar('Gm', {
          lead:  steps(null, null, 'G4', null, 'D4', null, 'Bb3', null),
          bass:  steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 21 — Bb
        bar('Bb', {
          lead:  steps('Bb3', null, 'D4', null, 'F4', null, 'D4', null),
          bass:  steps('Bb1', null, null, null, 'Bb2', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 22 — C with sparkle counter
        bar('C', {
          lead:    steps('C4', null, 'G4', null, 'E4', null, 'G4', null),
          counter: steps(null, null, null, null, null, 'G5', null, null),
          bass:    steps('C2', null, null, null, 'C3', null, null, null),
          hat:     [1, 2, 3, 5, 6, 7],
          kick:    [0, 4],
        }),
        // Bar 23 — Gm wide reach
        bar('Gm', {
          lead:  steps('G3', null, 'D4', null, 'G4', null, 'D4', null),
          bass:  steps('G2', null, null, null, 'G3', null, null, null),
          hat:   [1, 2, 3, 5, 6, 7],
          kick:  [0, 4],
        }),
        // Bar 24 — C final rising (loops cleanly back to Dm)
        bar('C', {
          lead:    steps('E4', null, 'G4', null, 'C5', null, 'E5', null),
          counter: steps(null, null, null, null, null, null, 'G5', null),
          bass:    steps('C2', null, null, null, 'C3', null, null, null),
          hat:     [1, 2, 3, 5, 6, 7],
          kick:    [0, 4],
        }),
      ],
    },
  ],
  cues: {
    // Bright "bloop" + small chord stab
    checkpoint: [
      { beat: 0,    role: 'lead',  note: 'D5',                              duration: 0.12, gain: 0.14 },
      { beat: 0.1,  role: 'lead',  note: 'A5',                              duration: 0.15, gain: 0.14 },
      { beat: 0.25, role: 'chord', notes: ['D4', 'F4', 'A4'],               duration: 0.65, gain: 0.09 },
      { beat: 0.35, role: 'counter', note: 'D6',                            duration: 0.28, gain: 0.1  },
    ],
    // Tiny "pew" blip with downward gliss
    nearMiss: [
      { beat: 0,    role: 'lead',  note: 'G5', duration: 0.10, gain: 0.11, glideTo: 'C5' },
    ],
    // Soft down-gliss "whoop"
    collision: [
      { beat: 0,    role: 'counter', note: 'A4', duration: 0.5, gain: 0.12, glideTo: 'D4' },
      { beat: 0.1,  role: 'bass',   note: 'D3', duration: 0.4, gain: 0.09 },
    ],
    // Cute neon cadence + sparkle
    levelComplete: [
      { beat: 0,    role: 'chord',   notes: ['D4', 'F4', 'A4'], duration: 1.4, gain: 0.10 },
      { beat: 0,    role: 'lead',    note: 'D5',                duration: 0.3, gain: 0.14 },
      { beat: 0.5,  role: 'lead',    note: 'F5',                duration: 0.3, gain: 0.14 },
      { beat: 1.0,  role: 'lead',    note: 'A5',                duration: 0.4, gain: 0.14 },
      { beat: 1.5,  role: 'counter', note: 'D6',                duration: 0.6, gain: 0.11 },
    ],
  },
};

/*
 * Level 5 — Neon underwater synthwave
 * Tempo: 96 BPM
 * Key: D Dorian
 * Loop: 48 bars (A/B/C/D, 12 bars each)
 */
export const LEVEL5_MUSIC_SPEC = {
  levelId: 5,
  title: 'Neon underwater synthwave',
  explanation: 'Glassy aquarium pulse with warm pad, bell lead, soft sub bass, light brushed hats, and a subtle bubbling arp that grows across the four-act run.',
  tempo: 96,
  key: 'D Dorian',
  motif: ['D5', 'F5', 'G5', 'A5'],
  roles: {
    chord: 'warm pad',
    lead: 'glassy bell lead',
    bass: 'soft sub bass',
    counter: 'bubbly arp',
    accent: 'shimmer layer',
    percussion: 'rim + brushed hat',
  },
  cuePalette: {
    checkpoint: 'Bubble chime',
    nearMiss: 'Short sonar ping',
    collision: 'Muted blorp',
    levelComplete: 'Shimmer cadence',
  },
  sections: [
    {
      name: 'A',
      progression: ['Dmadd9', 'Dmadd9', 'C', 'C', 'Gm', 'Gm', 'Am7', 'Am7', 'Dmadd9', 'C', 'Gm', 'Am7'],
      bars: [
        bar('Dmadd9', { lead: steps('D5', null, 'F5', null, 'A5', null, 'G5', null), counter: steps(null, 'A5', null, 'D6', null, 'A5', null, 'F5'), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Dmadd9', { lead: steps(null, null, 'D5', null, 'F5', null, 'G5', null), counter: steps('A5', null, 'D6', null, 'A5', null, 'F5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps('E5', null, 'G5', null, 'A5', null, 'G5', null), counter: steps(null, 'G5', null, 'C6', null, 'G5', null, 'E5'), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps(null, null, 'E5', null, 'G5', null, 'A5', null), counter: steps('G5', null, 'C6', null, 'G5', null, 'E5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', null, 'A5', null, 'G5', null), counter: steps(null, 'Bb5', null, 'D6', null, 'Bb5', null, 'G5'), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps(null, null, 'D5', null, 'G5', null, 'A5', null), counter: steps('Bb5', null, 'D6', null, 'Bb5', null, 'G5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', null, 'C6', null, 'A5', null), counter: steps(null, 'G5', null, 'C6', null, 'G5', null, 'E5'), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps(null, null, 'E5', null, 'A5', null, 'C6', null), counter: steps('G5', null, 'C6', null, 'G5', null, 'E5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Dmadd9', { lead: steps('D5', null, 'F5', null, 'A5', null, 'D6', null), counter: steps(null, 'A5', null, 'F5', null, 'A5', null, 'G5'), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps('E5', null, 'G5', null, 'A5', null, 'G5', null), counter: steps(null, null, 'C6', null, 'G5', null, 'E5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', null, 'Bb5', null, 'A5', null), counter: steps('D6', null, 'Bb5', null, 'G5', null, 'D5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', null, 'C6', null, 'A5', null), counter: steps('G5', null, 'C6', null, 'G5', null, 'E5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'B',
      progression: ['Dmadd9', 'C', 'Gm', 'Am7', 'Dmadd9', 'C', 'Gm', 'Am7', 'Dmadd9', 'C', 'Gm', 'Am7'],
      bars: [
        bar('Dmadd9', { lead: steps('A5', null, 'D6', null, 'F6', null, 'D6', null), counter: steps('F5', null, 'A5', null, 'D6', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('G5', null, 'C6', null, 'E6', null, 'C6', null), counter: steps('E5', null, 'G5', null, 'C6', null, 'G5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Gm',     { lead: steps('G5', null, 'Bb5', null, 'D6', null, 'Bb5', null), counter: steps('D5', null, 'G5', null, 'Bb5', null, 'G5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('A5', null, 'C6', null, 'E6', null, 'C6', null), counter: steps('E5', null, 'A5', null, 'C6', null, 'A5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Dmadd9', { lead: steps('F5', null, 'A5', null, 'D6', null, 'A5', null), counter: steps('D5', null, 'F5', null, 'A5', null, 'F5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('E5', null, 'G5', null, 'C6', null, 'G5', null), counter: steps('C5', null, 'E5', null, 'G5', null, 'E5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', null, 'Bb5', null, 'D6', null), counter: steps('G5', null, 'Bb5', null, 'D6', null, 'Bb5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', null, 'C6', null, 'E6', null), counter: steps('A5', null, 'C6', null, 'E6', null, 'C6', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Dmadd9', { lead: steps('D5', null, 'F5', null, 'A5', null, 'D6', null), counter: steps('A5', null, 'D6', null, 'F6', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('G5', null, 'A5', null, 'C6', null, 'G5', null), counter: steps('E5', null, 'G5', null, 'C6', null, 'G5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', null, 'Bb5', null, 'G5', null), counter: steps('Bb5', null, 'D6', null, 'Bb5', null, 'G5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', null, 'C6', null, 'A5', null), counter: steps('C6', null, 'E6', null, 'C6', null, 'A5', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
      ],
    },
    {
      name: 'C',
      progression: ['Dmadd9', 'Dmadd9', 'Am7', 'Am7', 'Gm', 'Gm', 'C', 'C', 'Dmadd9', 'Am7', 'Gm', 'C'],
      bars: [
        bar('Dmadd9', { lead: steps('D5', 'F5', 'A5', 'D6', 'A5', 'F5', 'D5', null), counter: steps(null, 'A5', null, 'F5', null, 'D5', null, 'A5'), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Dmadd9', { lead: steps('F5', 'A5', 'D6', 'F6', 'D6', 'A5', 'F5', null), counter: steps(null, 'D6', null, 'A5', null, 'F5', null, 'D5'), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps('E5', 'A5', 'C6', 'E6', 'C6', 'A5', 'E5', null), counter: steps(null, 'G5', null, 'C6', null, 'A5', null, 'E5'), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps('A5', 'C6', 'E6', 'G6', 'E6', 'C6', 'A5', null), counter: steps(null, 'E6', null, 'C6', null, 'A5', null, 'E5'), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('D5', 'G5', 'Bb5', 'D6', 'Bb5', 'G5', 'D5', null), counter: steps(null, 'Bb5', null, 'D6', null, 'G5', null, 'D5'), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('G5', 'Bb5', 'D6', 'G6', 'D6', 'Bb5', 'G5', null), counter: steps(null, 'D6', null, 'Bb5', null, 'G5', null, 'D5'), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps('E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', null), counter: steps(null, 'G5', null, 'C6', null, 'G5', null, 'E5'), bass: steps('C3', null, null, null, 'G2', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps('G5', 'A5', 'C6', 'E6', 'C6', 'A5', 'G5', null), counter: steps(null, 'C6', null, 'G5', null, 'E5', null, 'C5'), bass: steps('C3', null, null, null, 'G2', null, null, null), rim: [2, 6], hat: [1, 3, 5, 7] }),
        bar('Dmadd9', { lead: steps('D5', null, 'A5', 'D6', null, 'A5', 'F5', null), counter: steps('A5', null, 'D6', null, 'F6', null, 'A5', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', 'C6', null, 'A5', 'E5', null), counter: steps('G5', null, 'C6', null, 'E6', null, 'C6', null), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', 'Bb5', null, 'G5', 'D5', null), counter: steps('Bb5', null, 'D6', null, 'Bb5', null, 'G5', null), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
        bar('C',      { lead: steps('E5', null, 'G5', 'A5', null, 'G5', 'E5', null), counter: steps('C6', null, 'G5', null, 'E5', null, 'C5', null), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], hat: [1, 3, 5, 7] }),
      ],
    },
    {
      name: 'D',
      progression: ['Dmadd9', 'C', 'Gm', 'Am7', 'Dmadd9', 'C', 'Gm', 'Am7', 'Dmadd9', 'Dmadd9', 'C', 'Am7'],
      bars: [
        bar('Dmadd9', { lead: steps('D5', null, 'F5', 'A5', 'D6', null, 'A5', 'F5'), counter: steps('A5', 'D6', 'F6', 'A6', 'F6', 'D6', 'A5', 'F5'), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('E5', null, 'G5', 'A5', 'C6', null, 'G5', 'E5'), counter: steps('G5', 'C6', 'E6', 'G6', 'E6', 'C6', 'G5', 'E5'), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Gm',     { lead: steps('D5', null, 'G5', 'Bb5', 'D6', null, 'Bb5', 'G5'), counter: steps('Bb5', 'D6', 'G6', 'Bb6', 'G6', 'D6', 'Bb5', 'G5'), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('E5', null, 'A5', 'C6', 'E6', null, 'C6', 'A5'), counter: steps('C6', 'E6', 'G6', 'A6', 'G6', 'E6', 'C6', 'A5'), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Dmadd9', { lead: steps('F5', null, 'A5', 'D6', 'F6', null, 'D6', 'A5'), counter: steps('A5', 'D6', 'F6', 'A6', 'F6', 'D6', 'A5', 'F5'), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('G5', null, 'A5', 'C6', 'E6', null, 'C6', 'G5'), counter: steps('E5', 'G5', 'C6', 'E6', 'C6', 'G5', 'E5', 'C5'), bass: steps('C3', null, null, null, 'G2', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Gm',     { lead: steps('G5', null, 'Bb5', 'D6', 'G6', null, 'D6', 'Bb5'), counter: steps('D5', 'G5', 'Bb5', 'D6', 'Bb5', 'G5', 'D5', 'Bb4'), bass: steps('G2', null, null, null, 'D3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('A5', null, 'C6', 'E6', 'A6', null, 'E6', 'C6'), counter: steps('E5', 'A5', 'C6', 'E6', 'C6', 'A5', 'E5', 'C5'), bass: steps('A2', null, null, null, 'E3', null, null, null), kick: [0, 4], rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Dmadd9', { lead: steps('D5', 'F5', 'A5', 'D6', 'F6', 'A6', 'D7', null), counter: steps('A5', null, 'F5', null, 'D5', null, 'A4', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Dmadd9', { lead: steps('D7', null, 'A6', null, 'F6', null, 'D6', null), counter: steps('A5', null, 'F5', null, 'D5', null, 'A4', null), bass: steps('D2', null, null, null, 'A2', null, null, null), kick: [0, 4], hat: [1, 2, 3, 5, 6, 7] }),
        bar('C',      { lead: steps('C6', null, 'E6', null, 'G6', null, 'E6', null), counter: steps('G5', null, 'C6', null, 'E6', null, 'C6', null), bass: steps('C3', null, null, null, 'G2', null, null, null), rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
        bar('Am7',    { lead: steps('A5', null, 'C6', null, 'E6', null, 'A6', null), counter: steps('E5', null, 'A5', null, 'C6', null, 'E6', null), bass: steps('A2', null, null, null, 'E3', null, null, null), rim: [2, 6], hat: [1, 2, 3, 5, 6, 7] }),
      ],
    },
  ],
  cues: {
    checkpoint: [
      { beat: 0, role: 'lead', note: 'D6', duration: 0.16, gain: 0.16 },
      { beat: 0.15, role: 'lead', note: 'A6', duration: 0.2, gain: 0.16 },
      { beat: 0.4, role: 'accent', note: 'D7', duration: 0.45, gain: 0.09 },
    ],
    nearMiss: [
      { beat: 0, role: 'lead', note: 'A5', duration: 0.12, gain: 0.11 },
      { beat: 0.12, role: 'counter', note: 'D6', duration: 0.22, gain: 0.1 },
    ],
    collision: [
      { beat: 0, role: 'counter', note: 'D5', duration: 0.24, gain: 0.10, glideTo: 'A4' },
      { beat: 0.18, role: 'bass', note: 'D3', duration: 0.28, gain: 0.08 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['D4', 'F4', 'A4'], duration: 1.4, gain: 0.10 },
      { beat: 0.0, role: 'lead', note: 'D6', duration: 0.3, gain: 0.14 },
      { beat: 0.4, role: 'lead', note: 'F6', duration: 0.3, gain: 0.14 },
      { beat: 0.8, role: 'lead', note: 'A6', duration: 0.4, gain: 0.15 },
      { beat: 1.25, role: 'accent', note: 'D7', duration: 0.7, gain: 0.1 },
    ],
  },
};

export const LEVEL_MUSIC_SPECS = {
  1: LEVEL1_MUSIC_SPEC,
  2: LEVEL2_MUSIC_SPEC,
  3: LEVEL3_MUSIC_SPEC,
  4: LEVEL4_MUSIC_SPEC,
  5: LEVEL5_MUSIC_SPEC,
};
