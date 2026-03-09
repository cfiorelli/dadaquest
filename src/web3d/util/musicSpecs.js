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

const LEVEL5_MOTIF = ['D4', 'F4', 'G4', 'A4'];

const LEVEL5_PATTERN_LIBRARY = Object.freeze({
  Dm: {
    lead: [
      steps('D4', null, null, 'F4', null, null, 'A4', null),
      steps(null, 'D4', null, null, 'F4', null, 'G4', null),
      steps('A4', null, null, 'G4', null, 'F4', null, 'D4'),
    ],
    counter: [
      steps(null, 'D5', null, 'A4', null, 'D5', null, 'F5'),
      steps('A4', null, 'D5', null, 'F5', null, 'A4', null),
      steps(null, 'F5', null, 'D5', null, 'A4', null, 'D5'),
    ],
    bass: [
      steps('D2', null, null, null, 'A2', null, null, null),
      steps('D2', null, null, null, 'D3', null, null, null),
      steps('D2', null, 'A2', null, 'D3', null, null, null),
    ],
  },
  Dmadd9: {
    lead: [
      steps('D4', null, null, 'F4', null, null, 'A4', 'E5'),
      steps(null, 'D4', null, null, 'F4', null, 'G4', 'E5'),
      steps('A4', null, null, 'G4', null, 'F4', null, 'E5'),
    ],
    counter: [
      steps(null, 'D5', null, 'A4', null, 'E5', null, 'F5'),
      steps('A4', null, 'D5', null, 'E5', null, 'A4', null),
      steps(null, 'F5', null, 'E5', null, 'A4', null, 'D5'),
    ],
    bass: [
      steps('D2', null, null, null, 'A2', null, null, null),
      steps('D2', null, null, null, 'D3', null, null, null),
      steps('D2', null, 'A2', null, 'D3', null, null, null),
    ],
  },
  Bb: {
    lead: [
      steps('F4', null, null, 'A4', null, null, 'Bb4', null),
      steps(null, 'F4', null, null, 'A4', null, 'G4', null),
      steps('Bb4', null, 'A4', null, null, 'F4', null, null),
    ],
    counter: [
      steps(null, 'F5', null, 'Bb4', null, 'D5', null, 'F5'),
      steps('Bb4', null, 'D5', null, 'F5', null, 'Bb4', null),
      steps(null, 'D5', null, 'F5', null, 'Bb4', null, 'D5'),
    ],
    bass: [
      steps('Bb2', null, null, null, 'F3', null, null, null),
      steps('Bb2', null, null, null, 'Bb3', null, null, null),
      steps('Bb2', null, 'F3', null, 'Bb3', null, null, null),
    ],
  },
  Gm: {
    lead: [
      steps('D4', null, null, 'G4', null, null, 'A4', null),
      steps(null, 'D4', null, null, 'G4', null, 'Bb4', null),
      steps('G4', null, null, 'D4', null, 'A4', null, null),
    ],
    counter: [
      steps(null, 'G4', null, 'D5', null, 'G5', null, 'Bb5'),
      steps('D5', null, 'G5', null, 'Bb5', null, 'D5', null),
      steps(null, 'Bb5', null, 'G5', null, 'D5', null, 'G4'),
    ],
    bass: [
      steps('G2', null, null, null, 'D3', null, null, null),
      steps('G2', null, null, null, 'G3', null, null, null),
      steps('G2', null, 'D3', null, 'G3', null, null, null),
    ],
  },
  C: {
    lead: [
      steps('E4', null, null, 'G4', null, null, 'A4', null),
      steps(null, 'E4', null, null, 'G4', null, 'C5', null),
      steps('A4', null, 'G4', null, null, 'E4', null, null),
    ],
    counter: [
      steps(null, 'E5', null, 'G5', null, 'C6', null, 'G5'),
      steps('G5', null, 'C6', null, 'E6', null, 'G5', null),
      steps(null, 'C6', null, 'G5', null, 'E5', null, 'C5'),
    ],
    bass: [
      steps('C3', null, null, null, 'G2', null, null, null),
      steps('C3', null, null, null, 'C3', null, null, null),
      steps('C3', null, 'G2', null, 'C3', null, null, null),
    ],
  },
  A7: {
    lead: [
      steps('A4', null, null, 'C#5', null, null, 'E5', null),
      steps(null, 'A4', null, null, 'C#5', null, 'G4', null),
      steps('E5', null, 'C#5', null, null, 'A4', null, null),
    ],
    counter: [
      steps(null, 'A4', null, 'E5', null, 'G5', null, 'C#5'),
      steps('E5', null, 'A5', null, 'C#6', null, 'G5', null),
      steps(null, 'G5', null, 'E5', null, 'C#5', null, 'A4'),
    ],
    bass: [
      steps('A2', null, null, null, 'E3', null, null, null),
      steps('A2', null, null, null, 'A2', null, null, null),
      steps('A2', null, 'E3', null, 'A2', null, null, null),
    ],
  },
});

function getLevel5Pattern(role, chordName, index) {
  const chordPatterns = LEVEL5_PATTERN_LIBRARY[chordName] || LEVEL5_PATTERN_LIBRARY.Dm;
  const patterns = chordPatterns[role] || [steps()];
  return patterns[index % patterns.length];
}

function getLevel5PedalBass(index) {
  const patterns = [
    steps('D2', null, null, null, 'D2', null, null, null),
    steps('D2', null, 'A2', null, 'D3', null, null, null),
    steps('D2', null, null, null, 'A2', null, 'D3', null),
  ];
  return patterns[index % patterns.length];
}

function createLevel5Bar(chordName, index, {
  density = 'low',
  pedalD = false,
  accent = false,
} = {}) {
  const lead = getLevel5Pattern('lead', chordName, index);
  const counter = getLevel5Pattern('counter', chordName, index);
  const bass = pedalD ? getLevel5PedalBass(index) : getLevel5Pattern('bass', chordName, index);
  const accentPattern = accent
    ? steps(null, null, null, null, null, null, LEVEL5_MOTIF[index % LEVEL5_MOTIF.length], null)
    : steps();
  const kick = density === 'low' ? [0] : [0, 4];
  const snare = density === 'high' ? [4] : [];
  const hat = density === 'low' ? [3, 7] : [1, 3, 5, 7];
  const rim = density === 'low' ? [] : [2, 6];
  const shaker = density === 'high' ? [1, 3, 5, 7] : [];
  return bar(chordName, {
    lead,
    counter,
    accent: accentPattern,
    bass,
    kick,
    snare,
    hat,
    rim,
    shaker,
  });
}

function buildLevel5Section(name, progression, optionsForBar) {
  return {
    name,
    progression,
    bars: progression.map((chordName, index) => createLevel5Bar(chordName, index, optionsForBar(index, chordName))),
  };
}

const LEVEL5_SECTION_A = buildLevel5Section(
  'A',
  Array.from({ length: 24 }, (_, index) => ['Dm', 'Bb', 'Gm', 'A7'][index % 4]),
  (index) => ({
    density: index < 8 ? 'low' : 'mid',
    accent: index % 6 === 5,
  }),
);

const LEVEL5_SECTION_B = buildLevel5Section(
  'B',
  Array.from({ length: 24 }, (_, index) => ['Dm', 'C', 'Bb', 'Gm'][index % 4]),
  (index) => ({
    density: index < 12 ? 'mid' : 'high',
    accent: index % 4 === 3,
  }),
);

const LEVEL5_SECTION_C = buildLevel5Section(
  'C',
  Array.from({ length: 24 }, (_, index) => ['Dmadd9', 'Dm', 'Gm', 'Gm', 'Bb', 'Bb', 'A7', 'A7'][index % 8]),
  (index, chordName) => ({
    density: chordName === 'A7' ? 'high' : 'mid',
    accent: index % 8 === 0 || index % 8 === 7,
  }),
);

const LEVEL5_SECTION_D = buildLevel5Section(
  'D',
  [
    'Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A7',
    'Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A7',
    'Dm', 'Dm', 'Bb', 'Gm', 'Dm', 'A7', 'Dm', 'Dmadd9',
  ],
  (index) => ({
    density: index < 8 ? 'mid' : 'high',
    pedalD: true,
    accent: index % 2 === 1 || index >= 20,
  }),
);

/*
 * Level 5 — Neon Night Aquarium cinematic synth score
 * Tempo: 84 BPM
 * Key: D minor
 * Loop: 96 bars (A/B/C/D, 24 bars each)
 */
export const LEVEL5_MUSIC_SPEC = {
  levelId: 5,
  title: 'Cinematic synth aquarium score',
  explanation: 'A slower, floor-shaking aquarium cue built around an organ-like synth bed, pedal-point sub bass, gated Tron pulse, restrained drums, and sparse sonar calls so the level reads like a serious indie exploration setpiece rather than a toy-box loop.',
  tempo: 84,
  key: 'D minor',
  motif: LEVEL5_MOTIF,
  swing: 0.03,
  roles: {
    chord: 'organ-like analog pad with lowpass motion',
    lead: 'sparse sonar lead with gentle pitch bend',
    bass: 'sine-led sub bass with subtle saturation and kick dip',
    counter: 'gated Tron pulse',
    accent: 'shimmer accent tail',
    percussion: 'tight kick, rim-snare, and restrained hats',
    texture: 'quiet bubble hiss',
  },
  cuePalette: {
    checkpoint: 'swell + sonar ping',
    nearMiss: 'short sonar ping',
    collision: 'low whomp + pitch dip',
    levelComplete: 'shimmer cadence',
  },
  sections: [
    LEVEL5_SECTION_A,
    LEVEL5_SECTION_B,
    LEVEL5_SECTION_C,
    LEVEL5_SECTION_D,
  ],
  cues: {
    checkpoint: [
      { beat: 0, role: 'chord', notes: ['D4', 'F4', 'A4'], duration: 1.6, gain: 0.11 },
      { beat: 0.18, role: 'lead', note: 'A4', duration: 0.42, gain: 0.11, glideTo: 'D5' },
      { beat: 0.62, role: 'accent', note: 'F5', duration: 0.75, gain: 0.08 },
    ],
    nearMiss: [
      { beat: 0, role: 'lead', note: 'A4', duration: 0.26, gain: 0.09, glideTo: 'D5' },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'D2', duration: 0.78, gain: 0.12 },
      { beat: 0.12, role: 'lead', note: 'A4', duration: 0.46, gain: 0.07, glideTo: 'F4' },
      { beat: 0.2, role: 'counter', note: 'D5', duration: 0.36, gain: 0.06, glideTo: 'A4' },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['D4', 'F4', 'A4'], duration: 2.4, gain: 0.12 },
      { beat: 0.0, role: 'lead', note: 'A4', duration: 0.34, gain: 0.11 },
      { beat: 0.55, role: 'lead', note: 'D5', duration: 0.44, gain: 0.12 },
      { beat: 1.1, role: 'lead', note: 'F5', duration: 0.50, gain: 0.12 },
      { beat: 1.8, role: 'accent', note: 'A5', duration: 1.0, gain: 0.09 },
    ],
  },
};

function repeatProgression(pattern, repeats = 2) {
  return Array.from({ length: pattern.length * repeats }, (_, index) => pattern[index % pattern.length]);
}

function buildBassPattern(chordName, index, {
  pedal = '',
  sync = false,
} = {}) {
  const chord = CHORDS[chordName] || CHORDS.C;
  const root = pedal || chord[0];
  const fifth = chord[Math.min(2, chord.length - 1)] || root;
  const octave = chord[Math.min(1, chord.length - 1)] || root;
  const patterns = sync
    ? [
      steps(root, null, fifth, null, octave, null, fifth, null),
      steps(root, null, null, fifth, octave, null, null, fifth),
      steps(root, null, fifth, null, octave, null, null, null),
    ]
    : [
      steps(root, null, null, null, fifth, null, null, null),
      steps(root, null, null, null, octave, null, null, null),
      steps(root, null, fifth, null, octave, null, null, null),
    ];
  return patterns[index % patterns.length];
}

const LEVEL6_MOTIF = ['E4', 'G4', 'A4', 'B4'];
const LEVEL7_MOTIF = ['D4', 'F4', 'A4', 'G4'];
const LEVEL8_MOTIF = ['G4', 'A4', 'B4', 'D5'];
const LEVEL9_MOTIF = ['G4', 'A4', 'D5', 'B4'];

function createLevel6Bar(chordName, index, {
  density = 'mid',
  accent = false,
} = {}) {
  const leadPatterns = [
    steps('E4', null, 'G4', null, 'A4', null, 'B4', null),
    steps(null, 'B4', null, 'A4', null, 'G4', null, 'E4'),
    steps('E4', null, null, 'G4', null, 'A4', null, 'B4'),
    steps(null, null, 'G4', null, 'A4', null, 'E4', null),
  ];
  const counterPatterns = [
    steps('B4', null, 'E5', null, 'B4', null, 'G4', null),
    steps('E5', null, 'B4', null, 'E5', null, 'A4', null),
    steps(null, 'G4', null, 'B4', null, 'E5', null, 'B4'),
  ];
  return bar(chordName, {
    lead: leadPatterns[index % leadPatterns.length],
    counter: counterPatterns[index % counterPatterns.length],
    accent: accent ? steps(null, null, 'B5', null, null, null, LEVEL6_MOTIF[index % LEVEL6_MOTIF.length], null) : steps(),
    bass: buildBassPattern(chordName, index, { sync: density === 'high' }),
    kick: density === 'low' ? [0, 4] : density === 'high' ? [0, 3, 4, 6] : [0, 4, 6],
    snare: [4],
    hat: density === 'low' ? [2, 6] : [1, 2, 3, 5, 6, 7],
    rim: density === 'high' ? [2, 6] : [],
    shaker: density === 'high' ? [1, 3, 5, 7] : [3, 7],
  });
}

function createLevel7Bar(chordName, index, {
  density = 'mid',
  accent = false,
} = {}) {
  const leadPatterns = [
    steps('D4', null, null, 'F4', null, null, 'A4', null),
    steps(null, 'A4', null, 'G4', null, 'F4', null, 'D4'),
    steps('D4', null, 'F4', null, null, 'A4', null, 'G4'),
    steps(null, null, 'A4', null, 'F4', null, 'D4', null),
  ];
  const counterPatterns = [
    steps('D5', null, 'A4', null, 'D5', null, 'F5', null),
    steps(null, 'F5', null, 'D5', null, 'A4', null, 'D5'),
    steps('A4', null, 'D5', null, 'A4', null, 'G4', null),
  ];
  return bar(chordName, {
    lead: leadPatterns[index % leadPatterns.length],
    counter: counterPatterns[index % counterPatterns.length],
    accent: accent ? steps(null, null, null, 'A5', null, null, null, 'D6') : steps(),
    bass: buildBassPattern(chordName, index, { sync: density !== 'low' }),
    kick: density === 'low' ? [0, 4] : density === 'high' ? [0, 2, 4, 6] : [0, 4, 6],
    snare: [4],
    hat: density === 'low' ? [3, 7] : [1, 3, 5, 7],
    rim: density === 'high' ? [2, 6] : [6],
    shaker: density === 'high' ? [1, 2, 3, 5, 6, 7] : [1, 5],
  });
}

function createLevel8Bar(chordName, index, {
  density = 'mid',
  accent = false,
} = {}) {
  const leadPatterns = [
    steps('G4', null, null, 'A4', null, null, 'B4', null),
    steps(null, 'D5', null, 'B4', null, 'A4', null, 'G4'),
    steps('B4', null, 'A4', null, null, 'G4', null, 'D5'),
    steps(null, null, 'G4', null, 'B4', null, 'A4', null),
  ];
  const counterPatterns = [
    steps('G5', null, 'D5', null, 'B4', null, 'A4', null),
    steps(null, 'B4', null, 'D5', null, 'G5', null, 'D5'),
    steps('D5', null, 'G4', null, 'B4', null, 'D5', null),
  ];
  return bar(chordName, {
    lead: leadPatterns[index % leadPatterns.length],
    counter: counterPatterns[index % counterPatterns.length],
    accent: accent ? steps(null, null, null, null, LEVEL8_MOTIF[index % LEVEL8_MOTIF.length], null, null, null) : steps(),
    bass: buildBassPattern(chordName, index, { sync: false }),
    kick: density === 'low' ? [0] : [0, 4],
    snare: density === 'high' ? [4] : [],
    hat: density === 'low' ? [3, 7] : [2, 6],
    rim: density === 'high' ? [4] : [6],
    shaker: density === 'high' ? [1, 3, 5, 7] : [],
  });
}

function createLevel9Bar(chordName, index, {
  density = 'low',
  accent = false,
  pedal = '',
} = {}) {
  const leadPatterns = [
    steps('G4', null, null, 'A4', null, null, 'D5', null),
    steps(null, 'B4', null, 'D5', null, 'A4', null, 'G4'),
    steps('D5', null, null, 'B4', null, 'A4', null, 'G4'),
    steps(null, null, 'G4', null, 'A4', null, 'B4', null),
  ];
  const counterPatterns = [
    steps('D5', null, null, null, 'B4', null, null, null),
    steps(null, 'G4', null, null, 'D5', null, null, null),
    steps('B4', null, null, null, 'A4', null, null, null),
  ];
  return bar(chordName, {
    lead: leadPatterns[index % leadPatterns.length],
    counter: counterPatterns[index % counterPatterns.length],
    accent: accent ? steps(null, null, LEVEL9_MOTIF[index % LEVEL9_MOTIF.length], null, null, null, null, null) : steps(),
    bass: buildBassPattern(chordName, index, { pedal, sync: density === 'high' }),
    kick: density === 'low' ? [0, 4] : [0, 4, 6],
    snare: [],
    hat: density === 'low' ? [3, 7] : [1, 3, 5, 7],
    rim: density === 'high' ? [4] : [6],
    shaker: density === 'high' ? [1, 3, 5, 7] : [3, 7],
  });
}

function buildLevelSection(name, progression, factory, optionsForBar) {
  return {
    name,
    progression,
    bars: progression.map((chordName, index) => factory(chordName, index, optionsForBar(index, chordName))),
  };
}

const LEVEL6_SECTION_A = buildLevelSection(
  'A',
  repeatProgression(['Em', 'Em', 'C', 'C', 'Am7', 'Am7', 'B7', 'B7']),
  createLevel6Bar,
  (index) => ({ density: index < 6 ? 'low' : 'mid', accent: index % 4 === 3 }),
);
const LEVEL6_SECTION_B = buildLevelSection(
  'B',
  repeatProgression(['Em', 'G', 'C', 'Am7', 'Em', 'G', 'B7', 'B7']),
  createLevel6Bar,
  (index) => ({ density: index < 8 ? 'mid' : 'high', accent: index % 4 === 1 }),
);
const LEVEL6_SECTION_C = buildLevelSection(
  'C',
  repeatProgression(['Em', 'Em', 'Am7', 'Am7', 'C', 'C', 'D', 'B7']),
  createLevel6Bar,
  (index) => ({ density: index < 6 ? 'mid' : 'high', accent: index % 4 === 2 }),
);
const LEVEL6_SECTION_D = buildLevelSection(
  'D',
  repeatProgression(['Em', 'C', 'Am7', 'B7', 'Em', 'G', 'C', 'B7']),
  createLevel6Bar,
  (index) => ({ density: index < 4 ? 'mid' : 'high', accent: index % 2 === 1 }),
);

export const LEVEL6_MUSIC_SPEC = {
  levelId: 6,
  title: 'Mechanical synth groove',
  explanation: 'Warm industrial groove with a compressed pad bed, sidechained sub, clock pulse, tight drums, and short metallic hooks so the factory reads as polished mechanical motion instead of a toy jingle.',
  tempo: 112,
  key: 'E minor',
  motif: LEVEL6_MOTIF,
  swing: 0.02,
  roles: {
    chord: 'warm mechanical pad bed',
    lead: 'short metallic motif',
    bass: 'sidechained sub bass',
    counter: 'clock pulse gate',
    accent: 'gear chime accent',
    percussion: 'tight kick, snare, hat, and shaker',
    texture: 'steam hiss and dust',
  },
  cuePalette: {
    checkpoint: 'gear chime',
    nearMiss: 'servo chirp',
    collision: 'soft thud',
    levelComplete: 'rising cadence',
    setpiece: 'press slam warn stinger',
  },
  sections: [LEVEL6_SECTION_A, LEVEL6_SECTION_B, LEVEL6_SECTION_C, LEVEL6_SECTION_D],
  cues: {
    checkpoint: [
      { beat: 0, role: 'accent', note: 'B5', duration: 0.28, gain: 0.10 },
      { beat: 0.14, role: 'lead', note: 'E5', duration: 0.42, gain: 0.10 },
      { beat: 0.30, role: 'chord', notes: ['E4', 'G4', 'B4'], duration: 1.0, gain: 0.09 },
    ],
    nearMiss: [
      { beat: 0, role: 'counter', note: 'B4', duration: 0.18, gain: 0.07, glideTo: 'E5' },
      { beat: 0.16, role: 'accent', note: 'G5', duration: 0.16, gain: 0.05 },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'E2', duration: 0.42, gain: 0.11 },
      { beat: 0.10, drum: 'snare', gain: 0.6 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['E4', 'G4', 'B4'], duration: 1.8, gain: 0.11 },
      { beat: 0, role: 'lead', note: 'E5', duration: 0.32, gain: 0.10 },
      { beat: 0.45, role: 'lead', note: 'G5', duration: 0.36, gain: 0.10 },
      { beat: 0.9, role: 'lead', note: 'B5', duration: 0.44, gain: 0.11 },
      { beat: 1.5, role: 'accent', note: 'E6', duration: 0.8, gain: 0.08 },
    ],
    setpiece: [
      { beat: 0, role: 'bass', note: 'E2', duration: 0.55, gain: 0.11 },
      { beat: 0.08, drum: 'kick', gain: 0.8 },
      { beat: 0.16, role: 'accent', note: 'B4', duration: 0.24, gain: 0.07 },
    ],
  },
};

const LEVEL7_SECTION_A = buildLevelSection(
  'A',
  repeatProgression(['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'C', 'A7']),
  createLevel7Bar,
  (index) => ({ density: index < 6 ? 'low' : 'mid', accent: index % 4 === 3 }),
);
const LEVEL7_SECTION_B = buildLevelSection(
  'B',
  repeatProgression(['Dm', 'C', 'Bb', 'Gm', 'Dm', 'C', 'Bb', 'A7']),
  createLevel7Bar,
  (index) => ({ density: index < 8 ? 'mid' : 'high', accent: index % 4 === 1 }),
);
const LEVEL7_SECTION_C = buildLevelSection(
  'C',
  repeatProgression(['Dm', 'Dm', 'Gm', 'Gm', 'Bb', 'C', 'A7', 'A7']),
  createLevel7Bar,
  (index) => ({ density: index < 4 ? 'mid' : 'high', accent: index % 2 === 0 }),
);
const LEVEL7_SECTION_D = buildLevelSection(
  'D',
  repeatProgression(['Dm', 'Bb', 'Gm', 'C', 'Dm', 'Bb', 'A7', 'A7']),
  createLevel7Bar,
  (index) => ({ density: index < 6 ? 'mid' : 'high', accent: index % 4 === 2 }),
);

export const LEVEL7_MUSIC_SPEC = {
  levelId: 7,
  title: 'Storm chase score',
  explanation: 'Driving dusk-storm cue with pulse bass, storm pad, clipped breakbeat drums, and a spare heroic hook that cuts through gusts and lightning without getting cute.',
  tempo: 124,
  key: 'D minor',
  motif: LEVEL7_MOTIF,
  swing: 0.04,
  roles: {
    chord: 'storm pad bed',
    lead: 'sparse heroic hook',
    bass: 'driving pulse bass',
    counter: 'wind pulse synth',
    accent: 'lightning accent',
    percussion: 'breakbeat-lite kit',
    texture: 'rain and wind wash',
  },
  cuePalette: {
    checkpoint: 'wind chime',
    nearMiss: 'gust ping',
    collision: 'zap thud',
    levelComplete: 'bright resolve',
    setpiece: 'lightning warn stinger',
  },
  sections: [LEVEL7_SECTION_A, LEVEL7_SECTION_B, LEVEL7_SECTION_C, LEVEL7_SECTION_D],
  cues: {
    checkpoint: [
      { beat: 0, role: 'accent', note: 'A5', duration: 0.26, gain: 0.10 },
      { beat: 0.18, role: 'lead', note: 'D5', duration: 0.34, gain: 0.10 },
      { beat: 0.38, role: 'chord', notes: ['D4', 'F4', 'A4'], duration: 1.0, gain: 0.09 },
    ],
    nearMiss: [
      { beat: 0, role: 'lead', note: 'A4', duration: 0.18, gain: 0.07, glideTo: 'D5' },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'D2', duration: 0.36, gain: 0.10 },
      { beat: 0.08, role: 'accent', note: 'F5', duration: 0.20, gain: 0.06, glideTo: 'D5' },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['D4', 'F4', 'A4'], duration: 1.8, gain: 0.11 },
      { beat: 0, role: 'lead', note: 'D5', duration: 0.30, gain: 0.10 },
      { beat: 0.45, role: 'lead', note: 'F5', duration: 0.34, gain: 0.10 },
      { beat: 0.9, role: 'lead', note: 'A5', duration: 0.42, gain: 0.11 },
      { beat: 1.4, role: 'accent', note: 'D6', duration: 0.7, gain: 0.08 },
    ],
    setpiece: [
      { beat: 0, role: 'accent', note: 'A5', duration: 0.22, gain: 0.07 },
      { beat: 0.06, role: 'lead', note: 'D6', duration: 0.24, gain: 0.08, glideTo: 'A5' },
      { beat: 0.16, role: 'bass', note: 'D2', duration: 0.45, gain: 0.11 },
    ],
  },
};

const LEVEL8_SECTION_A = buildLevelSection(
  'A',
  repeatProgression(['G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D']),
  createLevel8Bar,
  (index) => ({ density: index < 8 ? 'low' : 'mid', accent: index % 4 === 3 }),
);
const LEVEL8_SECTION_B = buildLevelSection(
  'B',
  repeatProgression(['G', 'D', 'Em', 'C', 'G', 'D', 'Am7', 'D']),
  createLevel8Bar,
  (index) => ({ density: index < 8 ? 'mid' : 'high', accent: index % 4 === 1 }),
);
const LEVEL8_SECTION_C = buildLevelSection(
  'C',
  repeatProgression(['Em', 'Em', 'C', 'C', 'G', 'G', 'D', 'D']),
  createLevel8Bar,
  (index) => ({ density: index < 6 ? 'mid' : 'high', accent: index % 2 === 0 }),
);
const LEVEL8_SECTION_D = buildLevelSection(
  'D',
  repeatProgression(['G', 'G', 'C', 'C', 'Em', 'D', 'G', 'D']),
  createLevel8Bar,
  (index) => ({ density: index < 6 ? 'low' : 'mid', accent: index % 4 === 2 }),
);

export const LEVEL8_MUSIC_SPEC = {
  levelId: 8,
  title: 'Cozy spellbook groove',
  explanation: 'Warm library groove with soft pad, story pluck pulse, breathy lead, gentle drums, and page-like textures so the room feels magical and lived in rather than spooky.',
  tempo: 96,
  key: 'G major',
  motif: LEVEL8_MOTIF,
  swing: 0.03,
  roles: {
    chord: 'warm lamp pad',
    lead: 'breathy clarinet-ish lead',
    bass: 'soft round bass',
    counter: 'storybook pluck',
    accent: 'lantern sparkle',
    percussion: 'light kick, rim, and hat',
    texture: 'page flip air',
  },
  cuePalette: {
    checkpoint: 'warm ding',
    nearMiss: 'page flutter ping',
    collision: 'ink slurp',
    levelComplete: 'cozy cadence',
    setpiece: 'lantern reveal shimmer',
  },
  sections: [LEVEL8_SECTION_A, LEVEL8_SECTION_B, LEVEL8_SECTION_C, LEVEL8_SECTION_D],
  cues: {
    checkpoint: [
      { beat: 0, role: 'accent', note: 'D5', duration: 0.24, gain: 0.09 },
      { beat: 0.18, role: 'lead', note: 'G5', duration: 0.36, gain: 0.09 },
      { beat: 0.34, role: 'chord', notes: ['G4', 'B4', 'D5'], duration: 1.1, gain: 0.08 },
    ],
    nearMiss: [
      { beat: 0, role: 'counter', note: 'B4', duration: 0.14, gain: 0.06, glideTo: 'A4' },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'G2', duration: 0.36, gain: 0.10 },
      { beat: 0.10, role: 'counter', note: 'D5', duration: 0.24, gain: 0.06, glideTo: 'G4' },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['G4', 'B4', 'D5'], duration: 1.8, gain: 0.10 },
      { beat: 0, role: 'lead', note: 'G5', duration: 0.30, gain: 0.09 },
      { beat: 0.5, role: 'lead', note: 'B5', duration: 0.36, gain: 0.09 },
      { beat: 1.0, role: 'lead', note: 'D6', duration: 0.46, gain: 0.10 },
    ],
    setpiece: [
      { beat: 0, role: 'accent', note: 'D5', duration: 0.24, gain: 0.08 },
      { beat: 0.12, role: 'lead', note: 'G5', duration: 0.32, gain: 0.08 },
      { beat: 0.22, role: 'counter', note: 'B4', duration: 0.28, gain: 0.06 },
    ],
  },
};

const LEVEL9_SECTION_A = buildLevelSection(
  'A',
  repeatProgression(['G', 'G', 'Em', 'Em', 'C', 'C', 'D', 'D'], 3),
  createLevel9Bar,
  (index) => ({ density: index < 8 ? 'low' : 'mid', accent: index % 6 === 5 }),
);
const LEVEL9_SECTION_B = buildLevelSection(
  'B',
  repeatProgression(['G', 'D', 'Em', 'C', 'G', 'D', 'Am7', 'D'], 3),
  createLevel9Bar,
  (index) => ({ density: index < 10 ? 'mid' : 'high', accent: index % 4 === 1 }),
);
const LEVEL9_SECTION_C = buildLevelSection(
  'C',
  repeatProgression(['Em', 'Em', 'C', 'C', 'G', 'G', 'D', 'D'], 3),
  createLevel9Bar,
  (index) => ({ density: index < 8 ? 'mid' : 'high', accent: index % 4 === 2 }),
);
const LEVEL9_SECTION_D = buildLevelSection(
  'D',
  [
    'G', 'G', 'C', 'C', 'Em', 'D', 'G', 'D',
    'G', 'G', 'C', 'C', 'Em', 'D', 'G', 'D',
    'G', 'G', 'G', 'C', 'Em', 'D', 'G', 'G',
  ],
  createLevel9Bar,
  (index) => ({ density: index < 12 ? 'mid' : 'high', accent: index % 3 === 2, pedal: index >= 16 ? 'G2' : '' }),
);

export const LEVEL9_MUSIC_SPEC = {
  levelId: 9,
  title: 'Campfire night adventure',
  explanation: 'Long-form finale cue with warm pad bed, koto-like pluck motion, frame-drum pulse, sparse breathy lead, and faint fire crackle so the camp reads as a real closing scene instead of a loop.',
  tempo: 84,
  key: 'G major',
  motif: LEVEL9_MOTIF,
  swing: 0.02,
  roles: {
    chord: 'warm camp pad bed',
    lead: 'breathy adventure lead',
    bass: 'soft grounded bass',
    counter: 'koto-like pluck',
    accent: 'lantern sparkle',
    percussion: 'frame drum and shaker',
    texture: 'fire crackle and night air',
  },
  cuePalette: {
    checkpoint: 'lantern chime',
    nearMiss: 'firefly ping',
    collision: 'soft ember thud',
    levelComplete: 'warm cadence and sparkle',
    setpiece: 'paper flick warn',
  },
  sections: [LEVEL9_SECTION_A, LEVEL9_SECTION_B, LEVEL9_SECTION_C, LEVEL9_SECTION_D],
  cues: {
    checkpoint: [
      { beat: 0, role: 'accent', note: 'D5', duration: 0.24, gain: 0.08 },
      { beat: 0.20, role: 'lead', note: 'G5', duration: 0.36, gain: 0.08 },
      { beat: 0.40, role: 'chord', notes: ['G4', 'B4', 'D5'], duration: 1.2, gain: 0.08 },
    ],
    nearMiss: [
      { beat: 0, role: 'accent', note: 'B5', duration: 0.12, gain: 0.05 },
    ],
    collision: [
      { beat: 0, role: 'bass', note: 'G2', duration: 0.40, gain: 0.10 },
      { beat: 0.10, drum: 'rim', gain: 0.45 },
    ],
    levelComplete: [
      { beat: 0, role: 'chord', notes: ['G4', 'B4', 'D5'], duration: 2.2, gain: 0.10 },
      { beat: 0, role: 'lead', note: 'G5', duration: 0.34, gain: 0.09 },
      { beat: 0.55, role: 'lead', note: 'B5', duration: 0.40, gain: 0.09 },
      { beat: 1.1, role: 'lead', note: 'D6', duration: 0.55, gain: 0.10 },
      { beat: 1.9, role: 'accent', note: 'G6', duration: 0.9, gain: 0.07 },
    ],
    setpiece: [
      { beat: 0, role: 'accent', note: 'D5', duration: 0.18, gain: 0.06 },
      { beat: 0.10, role: 'counter', note: 'B4', duration: 0.22, gain: 0.05 },
      { beat: 0.18, role: 'bass', note: 'G2', duration: 0.42, gain: 0.08 },
    ],
  },
};

export const LEVEL_MUSIC_SPECS = {
  1: LEVEL1_MUSIC_SPEC,
  2: LEVEL2_MUSIC_SPEC,
  3: LEVEL3_MUSIC_SPEC,
  4: LEVEL4_MUSIC_SPEC,
  5: LEVEL5_MUSIC_SPEC,
  6: LEVEL6_MUSIC_SPEC,
  7: LEVEL7_MUSIC_SPEC,
  8: LEVEL8_MUSIC_SPEC,
  9: LEVEL9_MUSIC_SPEC,
};
