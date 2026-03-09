import { LEVEL_MUSIC_SPECS } from './musicSpecs.js';

const MUSIC_SCHEDULE_AHEAD_SEC = 0.45;
const MUSIC_SCHEDULER_MS = 120;
const STEM_DEFAULTS = Object.freeze({
  chord: 1,
  lead: 1,
  bass: 1,
  counter: 1,
  accent: 1,
  percussion: 1,
  texture: 1,
  vinyl: 1,
});

const NOTE_OFFSETS = Object.freeze({
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function createSeededRandom(seed = 0x12345678) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function noteToFrequency(note) {
  if (typeof note !== 'string') return 0;
  const match = note.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!match) return 0;
  const [, name, accidental, octaveText] = match;
  let semitone = NOTE_OFFSETS[name];
  if (accidental === '#') semitone += 1;
  if (accidental === 'b') semitone -= 1;
  const octave = Number(octaveText);
  const midi = ((octave + 1) * 12) + semitone;
  return 440 * (2 ** ((midi - 69) / 12));
}

function getSpecBar(spec, barIndex) {
  const barsPerSection = spec.sections[0]?.bars?.length || 8;
  const totalBars = spec.sections.reduce((sum, section) => sum + section.bars.length, 0);
  const wrappedBar = ((barIndex % totalBars) + totalBars) % totalBars;
  const sectionIndex = Math.floor(wrappedBar / barsPerSection) % spec.sections.length;
  const withinSectionBar = wrappedBar % barsPerSection;
  return {
    bar: spec.sections[sectionIndex].bars[withinSectionBar],
    barIndex: wrappedBar,
    sectionIndex,
    withinSectionBar,
  };
}

export class GameAudio {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.muted = !enabled;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.cooldowns = new Map();
    this._unlockBound = null;
    this._noiseBuffer = null;
    this._musicRunning = false;
    this._musicLevelId = 0;
    this._musicSpec = null;
    this._musicStepIndex = 0;
    this._musicNextStepTime = 0;
    this._musicSchedulerId = null;
    this._stemLevels = { ...STEM_DEFAULTS };
  }

  _ensureContext() {
    if (!this.enabled || this.ctx) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.75;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this._noiseBuffer = this._createNoiseBuffer();
  }

  armOnFirstGesture() {
    if (!this.enabled || this._unlockBound) return;
    this._unlockBound = () => this.unlock();
    window.addEventListener('pointerdown', this._unlockBound, { passive: true, once: true });
    window.addEventListener('keydown', this._unlockBound, { passive: true, once: true });
  }

  unlock() {
    if (!this.enabled) return;
    this._ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this._ensureContext();
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.75, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  setStemLevel(role, value) {
    if (!Object.prototype.hasOwnProperty.call(this._stemLevels, role)) return;
    this._stemLevels[role] = clamp01(value);
  }

  startLevelMusic(levelId, fadeSec = 0.5) {
    const spec = LEVEL_MUSIC_SPECS[levelId];
    if (!spec) return false;

    if (typeof window !== 'undefined' && window.__DADA_DEBUG__) {
      window.__DADA_DEBUG__.musicLevelId = levelId;
    }

    if (!this.enabled) return false;

    try {
      this.unlock();
      if (!this.ctx || !this.musicGain) return false;
      if (this._musicRunning && this._musicLevelId === levelId) return true;

      this.stopLevelMusic(0.05);
      this._musicRunning = true;
      this._musicLevelId = levelId;
      if (typeof window !== 'undefined' && window.__DADA_DEBUG__) {
        window.__DADA_DEBUG__.musicLevelId = levelId;
      }
      this._musicSpec = spec;
      this._musicStepIndex = 0;
      this._musicNextStepTime = this.ctx.currentTime + 0.03;

      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(this._getMusicTargetGain(levelId), t + Math.max(0.02, fadeSec));
      this._scheduleLevelMusic();
      return true;
    } catch {
      return false;
    }
  }

  stopLevelMusic(fadeSec = 0.5) {
    this._musicRunning = false;
    this._musicLevelId = 0;
    this._musicSpec = null;
    if (typeof window !== 'undefined' && window.__DADA_DEBUG__) {
      window.__DADA_DEBUG__.musicLevelId = 0;
    }
    clearTimeout(this._musicSchedulerId);
    this._musicSchedulerId = null;
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fadeSec));
  }

  startMusic(fadeSec = 0.5, style = 'piano') {
    const levelId = style === 'country' || style === 'banjo' ? 1 : 2;
    return this.startLevelMusic(levelId, fadeSec);
  }

  stopMusic(fadeSec = 0.5) {
    this.stopLevelMusic(fadeSec);
  }

  playCue(levelId, cueName) {
    if (!this.enabled) return false;
    const spec = LEVEL_MUSIC_SPECS[levelId];
    const events = spec?.cues?.[cueName];
    if (!spec || !Array.isArray(events) || !events.length) return false;

    try {
      this.unlock();
      if (!this.ctx) return false;
      this._duckMusicForCue(levelId, cueName);
      const beatSec = 60 / spec.tempo;
      const startBase = this.ctx.currentTime + 0.02;
      for (const event of events) {
        const start = startBase + ((event.beat ?? 0) * beatSec);
        if (event.drum) {
          this._playMusicDrum(spec.levelId, event.drum, start, event.gain ?? 1);
          continue;
        }
        if (Array.isArray(event.notes)) {
          this._playRoleChord(spec.levelId, event.role || 'chord', event.notes, start, event.duration ?? (beatSec * 2), event.gain ?? 0.08);
          continue;
        }
        if (event.note) {
          this._playRoleNote(
            spec.levelId,
            event.role || 'lead',
            noteToFrequency(event.note),
            start,
            event.duration ?? (beatSec * 0.75),
            event.gain ?? 0.08,
            event,
          );
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  _scheduleLevelMusic() {
    if (!this._musicRunning || !this.ctx || !this.musicGain || !this._musicSpec) return;
    const spec = this._musicSpec;
    const stepSec = 60 / spec.tempo / 2;
    const now = this.ctx.currentTime;
    if (!this._musicNextStepTime || this._musicNextStepTime < now) {
      this._musicNextStepTime = now + 0.02;
    }

    while (this._musicNextStepTime < now + MUSIC_SCHEDULE_AHEAD_SEC) {
      this._scheduleMusicStep(spec, this._musicNextStepTime, this._musicStepIndex);
      this._musicNextStepTime += stepSec;
      this._musicStepIndex += 1;
    }

    this._musicSchedulerId = window.setTimeout(() => this._scheduleLevelMusic(), MUSIC_SCHEDULER_MS);
  }

  _scheduleMusicStep(spec, start, stepIndex) {
    const stepInBar = stepIndex % 8;
    const barIndex = Math.floor(stepIndex / 8);
    const { bar } = getSpecBar(spec, barIndex);
    const beatSec = 60 / spec.tempo;
    const swingOffset = stepInBar > 0 && (stepInBar % 2 === 1)
      ? ((spec.swing ?? 0) * beatSec * 0.5)
      : 0;
    const stepStart = start + swingOffset;

    if (stepInBar === 0) {
      this._playBarChord(spec, bar, start, beatSec);
      if (spec.levelId === 2 && bar.vinyl) {
        this._playVinylWash(start, beatSec * 4);
      }
      if (spec.levelId === 5) {
        this._playAbyssTexture5(start, beatSec * 4);
      }
    } else if (spec.levelId === 1 && stepInBar === 4) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 1.6, 0.032);
    }

    if (bar.lead[stepInBar]) {
      this._playRoleNote(spec.levelId, 'lead', noteToFrequency(bar.lead[stepInBar]), stepStart, this._roleDuration(spec, 'lead'), 0.078);
    }
    if (bar.counter[stepInBar]) {
      this._playRoleNote(spec.levelId, 'counter', noteToFrequency(bar.counter[stepInBar]), stepStart, this._roleDuration(spec, 'counter'), 0.055);
    }
    if (bar.accent[stepInBar]) {
      this._playRoleNote(spec.levelId, 'accent', noteToFrequency(bar.accent[stepInBar]), stepStart, this._roleDuration(spec, 'accent'), 0.04);
    }
    if (bar.bass[stepInBar]) {
      this._playRoleNote(spec.levelId, 'bass', noteToFrequency(bar.bass[stepInBar]), stepStart, this._roleDuration(spec, 'bass'), 0.07);
    }

    if (bar.kick.includes(stepInBar)) this._playMusicDrum(spec.levelId, 'kick', stepStart, 1);
    if (bar.snare.includes(stepInBar)) this._playMusicDrum(spec.levelId, 'snare', stepStart, 1);
    if (bar.hat.includes(stepInBar)) this._playMusicDrum(spec.levelId, 'hat', stepStart, 1);
    if (bar.rim.includes(stepInBar)) this._playMusicDrum(spec.levelId, 'rim', stepStart, 1);
    if (bar.shaker.includes(stepInBar)) this._playMusicDrum(spec.levelId, 'shaker', stepStart, 1);
  }

  _getMusicTargetGain(levelId) {
    if (levelId === 1) return 0.68;
    if (levelId === 2) return 0.56;
    if (levelId === 3) return 0.62;
    if (levelId === 4) return 0.52;
    if (levelId === 5) return 0.54;
    return 0.7;
  }

  _duckMusicForCue(levelId, cueName) {
    if (!this.ctx || !this.musicGain || !this._musicRunning || this._musicLevelId !== levelId) return;
    const t = this.ctx.currentTime;
    const baseGain = this._getMusicTargetGain(levelId);
    let duckTo = baseGain * 0.82;
    let release = 0.28;
    if (cueName === 'levelComplete') {
      duckTo = baseGain * 0.68;
      release = 0.55;
    } else if (cueName === 'collision') {
      duckTo = baseGain * 0.74;
      release = 0.38;
    }
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(duckTo, t + 0.04);
    this.musicGain.gain.linearRampToValueAtTime(baseGain, t + release);
  }

  _roleDuration(spec, role) {
    const beatSec = 60 / spec.tempo;
    if (role === 'lead') {
      if (spec.levelId === 2) return beatSec * 0.72;
      if (spec.levelId === 4) return beatSec * 0.55;
      if (spec.levelId === 5) return beatSec * 0.58;
      return beatSec * 0.78;
    }
    if (role === 'counter') {
      if (spec.levelId === 2) return beatSec * 0.92;
      if (spec.levelId === 4) return beatSec * 0.42;
      if (spec.levelId === 5) return beatSec * 0.52;
      return beatSec * 0.88;
    }
    if (role === 'accent') {
      if (spec.levelId === 5) return beatSec * 0.42;
      return beatSec * 0.34;
    }
    if (role === 'bass') {
      if (spec.levelId === 4) return beatSec * 0.80;
      if (spec.levelId === 5) return beatSec * 0.96;
      return beatSec * 0.95;
    }
    return beatSec * 0.9;
  }

  _stemGain(role) {
    return this._stemLevels[role] ?? 1;
  }

  _playBarChord(spec, bar, start, beatSec) {
    if (!Array.isArray(bar.chord) || !bar.chord.length) return;
    if (spec.levelId === 1) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 2.2, 0.05);
      return;
    }
    if (spec.levelId === 2) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 3.6, 0.046);
      return;
    }
    if (spec.levelId === 4) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 4.0, 0.038);
      return;
    }
    if (spec.levelId === 5) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 4.7, 0.05);
      return;
    }
    this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 3.0, 0.05);
  }

  _playRoleChord(levelId, role, notes, start, duration, gain) {
    if (!Array.isArray(notes) || !notes.length) return;
    const freqs = notes.map(noteToFrequency).filter((freq) => freq > 0);
    if (!freqs.length) return;
    const scaledGain = gain * this._stemGain(role);
    if (scaledGain <= 0.0001) return;

    if (levelId === 1) {
      for (let i = 0; i < freqs.length; i++) {
        this._playToyChordTone(freqs[i], start + (i * 0.01), duration, scaledGain / (freqs.length + 0.4));
      }
      return;
    }
    if (levelId === 2) {
      for (let i = 0; i < freqs.length; i++) {
        this._playRhodesChordTone(freqs[i], start, duration, scaledGain / freqs.length);
      }
      return;
    }
    if (levelId === 4) {
      for (let i = 0; i < freqs.length; i++) {
        this._playNeonPadTone(freqs[i], start + (i * 0.015), duration, scaledGain / freqs.length);
      }
      return;
    }
    if (levelId === 5) {
      for (let i = 0; i < freqs.length; i++) {
        this._playAbyssPadTone(freqs[i], start + (i * 0.018), duration, scaledGain / freqs.length);
      }
      return;
    }
    for (let i = 0; i < freqs.length; i++) {
      this._playHomeChordTone(freqs[i], start + (i * 0.008), duration, scaledGain / freqs.length);
    }
  }

  _playRoleNote(levelId, role, freq, start, duration, gain, extras = {}) {
    const scaledGain = gain * this._stemGain(role);
    if (!freq || scaledGain <= 0.0001) return;

    if (levelId === 1) {
      if (role === 'lead') {
        this._playToyLead(freq, start, duration, scaledGain);
      } else if (role === 'counter') {
        this._playWhistle(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'accent') {
        this._playBanjoAccent(freq, start, duration, scaledGain);
      } else if (role === 'bass') {
        this._playRoundedBass(freq, start, duration, scaledGain, 240);
      }
      return;
    }

    if (levelId === 2) {
      if (role === 'lead') {
        this._playMutedBell(freq, start, duration, scaledGain);
      } else if (role === 'counter') {
        this._playMutedSynth(freq, start, duration, scaledGain);
      } else if (role === 'bass') {
        this._playRoundedBass(freq, start, duration, scaledGain * 0.9, 180);
      } else if (role === 'accent') {
        this._playMutedBell(freq, start, duration * 0.75, scaledGain * 0.75);
      }
      return;
    }

    if (levelId === 4) {
      if (role === 'lead') {
        this._playBubblyPluck(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playSparkle4(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playSubBass4(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playSparkle4(freq, start, duration * 0.6, scaledGain * 0.6);
      }
      return;
    }

    if (levelId === 5) {
      if (role === 'lead') {
        this._playSonarLead5(freq, start, duration, scaledGain * 0.96, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playGatedArp5(freq, start, duration, scaledGain * 0.86, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playAbyssSubBass5(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playShimmer5(freq, start, duration, scaledGain * 0.82);
      }
      return;
    }

    if (role === 'lead') {
      this._playHomeLead(freq, start, duration, scaledGain);
    } else if (role === 'counter') {
      this._playClarinet(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
    } else if (role === 'bass') {
      this._playRoundedBass(freq, start, duration, scaledGain * 0.95, 220);
    } else if (role === 'accent') {
      this._playHomeLead(freq, start, duration * 0.7, scaledGain * 0.75);
    }
  }

  _playOscVoice({
    freq,
    start,
    duration,
    peak,
    type = 'sine',
    destination = null,
    attack = 0.01,
    filterType = '',
    filterFreq = 0,
    q = 0.7,
    detune = 0,
    endFreq = null,
  }) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (detune) osc.detune.setValueAtTime(detune, start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }

    let tail = osc;
    if (filterType) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, start);
      filter.Q.setValueAtTime(q, start);
      osc.connect(filter);
      tail = filter;
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + Math.min(attack, duration * 0.4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    tail.connect(gain);
    gain.connect(destination || this.musicGain || this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  _playToyLead(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.12, duration), peak: gain * 0.85, type: 'triangle', attack: 0.006, filterType: 'lowpass', filterFreq: 2600 });
    this._playOscVoice({ freq: freq * 2, start, duration: Math.max(0.08, duration * 0.58), peak: gain * 0.34, type: 'sine', attack: 0.004, filterType: 'highpass', filterFreq: 700 });
  }

  _playWhistle(freq, start, duration, gain, glideTo = 0) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.12, duration),
      peak: gain * 0.92,
      type: 'sine',
      attack: 0.006,
      filterType: 'bandpass',
      filterFreq: 1900,
      q: 0.9,
      endFreq: glideTo || null,
    });
  }

  _playBanjoAccent(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.1, duration * 0.55), peak: gain * 0.75, type: 'square', attack: 0.003, filterType: 'lowpass', filterFreq: 2200 });
    this._playOscVoice({ freq: freq * 1.01, start, duration: Math.max(0.08, duration * 0.42), peak: gain * 0.28, type: 'triangle', attack: 0.004, filterType: 'highpass', filterFreq: 500 });
  }

  _playRoundedBass(freq, start, duration, gain, lowpassFreq) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.18, duration),
      peak: gain,
      type: 'sine',
      attack: 0.012,
      filterType: 'lowpass',
      filterFreq: lowpassFreq,
      q: 0.8,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start,
      duration: Math.max(0.18, duration * 0.95),
      peak: gain * 0.22,
      type: 'triangle',
      attack: 0.015,
      filterType: 'lowpass',
      filterFreq: lowpassFreq * 0.7,
      q: 0.7,
    });
  }

  _playToyChordTone(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration, peak: gain * 0.9, type: 'triangle', attack: 0.02, filterType: 'lowpass', filterFreq: 1700 });
    this._playOscVoice({ freq: freq * 1.005, start: start + 0.01, duration: duration * 0.9, peak: gain * 0.24, type: 'square', attack: 0.015, filterType: 'lowpass', filterFreq: 1200 });
  }

  _playRhodesChordTone(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration, peak: gain * 0.88, type: 'triangle', attack: 0.02, filterType: 'lowpass', filterFreq: 1300, q: 0.8 });
    this._playOscVoice({ freq, start, duration: duration * 0.92, peak: gain * 0.34, type: 'sine', attack: 0.018, detune: 6, filterType: 'lowpass', filterFreq: 1500, q: 0.7 });
  }

  _playMutedBell(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.12, duration), peak: gain * 0.76, type: 'triangle', attack: 0.006, filterType: 'bandpass', filterFreq: 1600, q: 0.65 });
    this._playOscVoice({ freq: freq * 2, start, duration: Math.max(0.08, duration * 0.55), peak: gain * 0.22, type: 'sine', attack: 0.004, filterType: 'highpass', filterFreq: 850, q: 0.7 });
  }

  _playMutedSynth(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.16, duration * 1.05), peak: gain * 0.8, type: 'triangle', attack: 0.012, filterType: 'lowpass', filterFreq: 980, q: 0.7 });
    this._playOscVoice({ freq: freq * 0.5, start, duration: Math.max(0.14, duration), peak: gain * 0.16, type: 'sine', attack: 0.015, filterType: 'lowpass', filterFreq: 540 });
  }

  _playHomeLead(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.12, duration), peak: gain * 0.78, type: 'triangle', attack: 0.005, filterType: 'bandpass', filterFreq: 2000, q: 0.7 });
    this._playOscVoice({ freq: freq * 2, start, duration: Math.max(0.08, duration * 0.52), peak: gain * 0.3, type: 'sine', attack: 0.004, filterType: 'highpass', filterFreq: 1000 });
  }

  _playClarinet(freq, start, duration, gain, glideTo = 0) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.16, duration),
      peak: gain * 0.82,
      type: 'triangle',
      attack: 0.012,
      filterType: 'bandpass',
      filterFreq: 1200,
      q: 0.9,
      endFreq: glideTo || null,
    });
  }

  _playHomeChordTone(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration, peak: gain * 0.82, type: 'triangle', attack: 0.018, filterType: 'lowpass', filterFreq: 1500 });
    this._playOscVoice({ freq: freq * 1.002, start: start + 0.006, duration: duration * 0.92, peak: gain * 0.22, type: 'sine', attack: 0.015, filterType: 'lowpass', filterFreq: 1200 });
  }

  // Level 5 — post-cute neon underwater synthwave voices

  _playAbyssPadTone(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.42, duration), peak: gain * 0.56, type: 'sawtooth', attack: 0.16, filterType: 'lowpass', filterFreq: 680, q: 0.62 });
    this._playOscVoice({ freq: freq * 1.004, start: start + 0.02, duration: Math.max(0.38, duration * 0.94), peak: gain * 0.26, type: 'triangle', attack: 0.2, filterType: 'lowpass', filterFreq: 460, q: 0.58 });
    this._playOscVoice({ freq: freq * 0.5, start, duration: Math.max(0.34, duration * 0.98), peak: gain * 0.16, type: 'sine', attack: 0.18, filterType: 'lowpass', filterFreq: 190, q: 0.72 });
  }

  _playSonarLead5(freq, start, duration, gain, glideTo = 0) {
    this._playOscVoice({ freq, start, duration: Math.max(0.18, duration * 0.92), peak: gain * 0.58, type: 'triangle', attack: 0.01, filterType: 'bandpass', filterFreq: 1180, q: 0.88, endFreq: glideTo || null });
    this._playOscVoice({ freq: freq * 0.5, start: start + 0.028, duration: Math.max(0.16, duration * 0.78), peak: gain * 0.18, type: 'sine', attack: 0.02, filterType: 'lowpass', filterFreq: 320, q: 0.7 });
    this._playOscVoice({ freq: freq * 1.5, start: start + 0.09, duration: Math.max(0.12, duration * 0.44), peak: gain * 0.08, type: 'sine', attack: 0.008, filterType: 'highpass', filterFreq: 1600, q: 0.5 });
  }

  _playGatedArp5(freq, start, duration, gain, glideTo = 0) {
    this._playOscVoice({ freq, start, duration: Math.max(0.1, duration * 0.66), peak: gain * 0.54, type: 'square', attack: 0.004, filterType: 'lowpass', filterFreq: 980, q: 0.74, endFreq: glideTo || null });
    this._playOscVoice({ freq: freq * 1.002, start: start + 0.014, duration: Math.max(0.08, duration * 0.58), peak: gain * 0.18, type: 'triangle', attack: 0.006, filterType: 'lowpass', filterFreq: 720, q: 0.64 });
    this._playOscVoice({ freq: freq * 0.5, start, duration: Math.max(0.12, duration * 0.84), peak: gain * 0.08, type: 'sine', attack: 0.015, filterType: 'lowpass', filterFreq: 240, q: 0.74 });
  }

  _playAbyssSubBass5(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.3, duration * 1.08), peak: gain * 0.9, type: 'sine', attack: 0.04, filterType: 'lowpass', filterFreq: 132, q: 0.82 });
    this._playOscVoice({ freq: freq * 1.01, start: start + 0.012, duration: Math.max(0.24, duration * 0.94), peak: gain * 0.14, type: 'triangle', attack: 0.028, filterType: 'lowpass', filterFreq: 220, q: 0.68 });
    this._playOscVoice({ freq: freq * 0.5, start, duration: Math.max(0.3, duration), peak: gain * 0.16, type: 'sine', attack: 0.06, filterType: 'lowpass', filterFreq: 92, q: 0.72 });
  }

  _playShimmer5(freq, start, duration, gain) {
    this._playOscVoice({ freq, start, duration: Math.max(0.12, duration * 0.82), peak: gain * 0.46, type: 'sine', attack: 0.008, filterType: 'bandpass', filterFreq: 2550, q: 0.7 });
    this._playOscVoice({ freq: freq * 2, start: start + 0.018, duration: Math.max(0.08, duration * 0.44), peak: gain * 0.12, type: 'triangle', attack: 0.005, filterType: 'highpass', filterFreq: 1650, q: 0.58 });
  }

  _playAbyssTexture5(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(720, start);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850, start);
    bp.Q.setValueAtTime(0.45, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0028 * (this._stemLevels.texture ?? 1), start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // Level 4 — "slow bubbly tron" synth voices

  _playNeonPadTone(freq, start, duration, gain) {
    // Soft sawtooth + lowpass, slow attack = neon pad
    this._playOscVoice({ freq, start, duration, peak: gain * 0.68, type: 'sawtooth', attack: 0.09, filterType: 'lowpass', filterFreq: 780, q: 0.6 });
    this._playOscVoice({ freq: freq * 1.003, start, duration: duration * 0.94, peak: gain * 0.22, type: 'triangle', attack: 0.12, filterType: 'lowpass', filterFreq: 560, q: 0.5 });
  }

  _playBubblyPluck(freq, start, duration, gain, glideTo = 0) {
    // Triangle + sine harmonic, short decay = bubbly pluck
    this._playOscVoice({ freq, start, duration: Math.max(0.10, duration * 0.72), peak: gain * 0.82, type: 'triangle', attack: 0.004, filterType: 'lowpass', filterFreq: 2100, q: 0.7, endFreq: glideTo || null });
    this._playOscVoice({ freq: freq * 2, start, duration: Math.max(0.06, duration * 0.40), peak: gain * 0.26, type: 'sine', attack: 0.003, filterType: 'highpass', filterFreq: 620 });
  }

  _playSparkle4(freq, start, duration, gain, glideTo = 0) {
    // High sine bell tick = sparkle top
    this._playOscVoice({ freq, start, duration: Math.max(0.06, duration * 0.65), peak: gain * 0.72, type: 'sine', attack: 0.003, filterType: 'bandpass', filterFreq: 3200, q: 0.65, endFreq: glideTo || null });
  }

  _playSubBass4(freq, start, duration, gain) {
    // Pure sine, tight lowpass = sub bass
    this._playOscVoice({ freq, start, duration: Math.max(0.15, duration * 0.60), peak: gain, type: 'sine', attack: 0.008, filterType: 'lowpass', filterFreq: 150, q: 0.7 });
  }

  _playVinylWash(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted || this._stemLevels.vinyl <= 0.0001) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, start);
    filter.Q.setValueAtTime(0.35, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.003 * this._stemLevels.vinyl, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  _playMusicDrum(levelId, drum, start, gain = 1) {
    const drumGain = (this._stemLevels.percussion ?? 1) * gain;
    if (drumGain <= 0.0001) return;

    if (levelId === 1) {
      if (drum === 'kick') {
        this._osc(108, 'sine', start, 0.16, 0.055 * drumGain, 52, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.042, 0.014 * drumGain, { type: 'bandpass', frequency: 2100, q: 0.8 }, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.03, 0.0105 * drumGain, { type: 'highpass', frequency: 3600, q: 0.55 }, this.musicGain);
      }
      return;
    }

    if (levelId === 2) {
      if (drum === 'kick') {
        this._osc(78, 'sine', start, 0.19, 0.05 * drumGain, 42, this.musicGain);
        this._playNoiseBurst(start, 0.028, 0.006 * drumGain, { type: 'lowpass', frequency: 320, q: 0.5 }, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.085, 0.018 * drumGain, { type: 'bandpass', frequency: 1700, q: 0.7 }, this.musicGain);
        this._osc(170, 'triangle', start, 0.08, 0.01 * drumGain, 120, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.03, 0.008 * drumGain, { type: 'highpass', frequency: 4200, q: 0.6 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.025, 0.007 * drumGain, { type: 'bandpass', frequency: 2400, q: 0.8 }, this.musicGain);
      }
      return;
    }

    if (levelId === 4) {
      if (drum === 'kick') {
        this._osc(82, 'sine', start, 0.18, 0.042 * drumGain, 38, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.022, 0.003 * drumGain, { type: 'highpass', frequency: 5000, q: 0.5 }, this.musicGain);
      }
      return;
    }

    if (levelId === 5) {
      if (drum === 'kick') {
        this._osc(56, 'sine', start, 0.28, 0.038 * drumGain, 29, this.musicGain);
        this._osc(82, 'triangle', start, 0.1, 0.006 * drumGain, 52, this.musicGain);
        this._playNoiseBurst(start, 0.03, 0.003 * drumGain, { type: 'lowpass', frequency: 220, q: 0.45 }, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.09, 0.008 * drumGain, { type: 'bandpass', frequency: 1480, q: 0.58 }, this.musicGain);
        this._osc(178, 'triangle', start, 0.08, 0.0032 * drumGain, 132, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.045, 0.003 * drumGain, { type: 'highpass', frequency: 4200, q: 0.48 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.042, 0.0046 * drumGain, { type: 'bandpass', frequency: 2050, q: 0.62 }, this.musicGain);
        this._osc(320, 'sine', start, 0.05, 0.0022 * drumGain, 220, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.04, 0.0025 * drumGain, { type: 'highpass', frequency: 3100, q: 0.42 }, this.musicGain);
      }
      return;
    }

    if (drum === 'kick') {
      this._osc(92, 'sine', start, 0.15, 0.04 * drumGain, 54, this.musicGain);
    } else if (drum === 'rim') {
      this._playNoiseBurst(start, 0.036, 0.011 * drumGain, { type: 'bandpass', frequency: 2300, q: 0.85 }, this.musicGain);
    } else if (drum === 'shaker') {
      this._playNoiseBurst(start, 0.028, 0.009 * drumGain, { type: 'highpass', frequency: 3400, q: 0.55 }, this.musicGain);
    }
  }

  _allow(key, cooldownMs) {
    const now = performance.now();
    const nextAt = this.cooldowns.get(key) || 0;
    if (now < nextAt) return false;
    this.cooldowns.set(key, now + cooldownMs);
    return true;
  }

  _createNoiseBuffer() {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const random = createSeededRandom(0x5eadbabe);
    for (let i = 0; i < data.length; i++) {
      data[i] = (random() * 2) - 1;
    }
    return buffer;
  }

  _playNoiseBurst(start, duration, volume, filterDef = null, destination = null) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    let tail = src;
    if (filterDef) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterDef.type;
      filter.frequency.setValueAtTime(filterDef.frequency, start);
      filter.Q.setValueAtTime(filterDef.q ?? 1, start);
      src.connect(filter);
      tail = filter;
    }

    tail.connect(gain);
    gain.connect(destination || this.sfxGain || this.master);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  _osc(freq, type, start, duration, volume, endFreq = null, destination = null) {
    if (!this.ctx || !this.master || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(destination || this.sfxGain || this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  playJump() {
    if (!this.enabled || !this._allow('jump', 80)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(380, 'sine', t, 0.16, 0.08, 680);
    this._osc(190, 'triangle', t, 0.12, 0.035, 240);
  }

  playLand() {
    if (!this.enabled || !this._allow('land', 120)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(170, 'triangle', t, 0.14, 0.07, 85);
  }

  playCrumbleWarn() {
    if (!this.enabled || !this._allow('crumbleWarn', 400)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(110, 'triangle', t, 0.22, 0.04, 68);
    this._osc(88, 'square', t + 0.05, 0.16, 0.025, 55);
  }

  playCrumbleFall() {
    if (!this.enabled || !this._allow('crumbleFall', 300)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(140, 'square', t, 0.15, 0.055, 55);
  }

  playCoin() {
    if (!this.enabled || !this._allow('coin', 60)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(880, 'sine', t, 0.09, 0.055, 1200);
  }

  playPickup() {
    if (!this.enabled || !this._allow('pickup', 180)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(620, 'sine', t, 0.11, 0.07);
    this._osc(840, 'sine', t + 0.08, 0.12, 0.06);
  }

  playReset() {
    if (!this.enabled || !this._allow('reset', 260)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(240, 'square', t, 0.13, 0.045, 110);
    this._osc(120, 'triangle', t + 0.02, 0.18, 0.04, 70);
  }

  playSplash() {
    if (!this.enabled || !this._allow('splash', 180)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(230, 'triangle', t, 0.10, 0.028, 150);
    this._osc(140, 'sine', t + 0.02, 0.12, 0.02, 95);
  }

  playBubblePop() {
    if (!this.enabled || !this._allow('bubblePop', 180)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(520, 'sine', t, 0.08, 0.04, 320);
    this._osc(210, 'triangle', t + 0.02, 0.12, 0.025, 120);
  }

  playWin() {
    if (!this.enabled || !this._allow('win', 500)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(523, 'sine', t, 0.16, 0.07);
    this._osc(659, 'sine', t + 0.12, 0.16, 0.07);
    this._osc(784, 'sine', t + 0.24, 0.26, 0.08);
  }

  playAmbientMoo() {
    if (!this.enabled || !this._allow('ambientMoo', 2400)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    vibrato.type = 'sine';
    vibrato.frequency.value = 4.3;
    vibratoGain.gain.value = 6;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.master);
    vibrato.start(t);
    osc.start(t);
    vibrato.stop(t + 0.45);
    osc.stop(t + 0.45);
  }

  playAmbientBirds() {
    if (!this.enabled || !this._allow('ambientBirds', 1800)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = t + (i * 0.11);
      const freq = 2500 + (i * 260);
      this._osc(freq, 'sine', start, 0.08, 0.015, 4000 - (i * 150), this.sfxGain);
    }
  }
}
