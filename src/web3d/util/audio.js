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
    this.musicPumpGain = null;
    this.musicCompressor = null;
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
    this.musicPumpGain = this.ctx.createGain();
    this.musicPumpGain.gain.value = 1;
    this.musicCompressor = this.ctx.createDynamicsCompressor();
    this.musicCompressor.threshold.value = -18;
    this.musicCompressor.knee.value = 18;
    this.musicCompressor.ratio.value = 2.1;
    this.musicCompressor.attack.value = 0.02;
    this.musicCompressor.release.value = 0.22;
    this.musicGain.connect(this.musicPumpGain);
    this._configureMusicRouting(0);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this._noiseBuffer = this._createNoiseBuffer();
  }

  _configureMusicRouting(levelId) {
    if (!this.musicPumpGain || !this.master) return;
    try { this.musicPumpGain.disconnect(); } catch {}
    try { this.musicCompressor?.disconnect(); } catch {}
    if (levelId >= 6 && this.musicCompressor) {
      this.musicPumpGain.connect(this.musicCompressor);
      this.musicCompressor.connect(this.master);
    } else {
      this.musicPumpGain.connect(this.master);
    }
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
      this._configureMusicRouting(levelId);
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
    if (this.musicPumpGain) {
      this.musicPumpGain.gain.cancelScheduledValues(t);
      this.musicPumpGain.gain.setValueAtTime(this.musicPumpGain.gain.value, t);
      this.musicPumpGain.gain.linearRampToValueAtTime(1, t + 0.04);
    }
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
      } else if (spec.levelId === 6) {
        this._playFactoryTexture6(start, beatSec * 4);
      } else if (spec.levelId === 7) {
        this._playStormTexture7(start, beatSec * 4);
      } else if (spec.levelId === 8) {
        this._playLibraryTexture8(start, beatSec * 4);
      } else if (spec.levelId === 9) {
        this._playCampTexture9(start, beatSec * 4);
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
    if (levelId === 5) return 0.46;
    if (levelId === 6) return 0.5;
    if (levelId === 7) return 0.52;
    if (levelId === 8) return 0.48;
    if (levelId === 9) return 0.46;
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
      if (spec.levelId === 5) return beatSec * 0.92;
      if (spec.levelId === 6) return beatSec * 0.62;
      if (spec.levelId === 7) return beatSec * 0.68;
      if (spec.levelId === 8) return beatSec * 0.86;
      if (spec.levelId === 9) return beatSec * 0.98;
      return beatSec * 0.78;
    }
    if (role === 'counter') {
      if (spec.levelId === 2) return beatSec * 0.92;
      if (spec.levelId === 4) return beatSec * 0.42;
      if (spec.levelId === 5) return beatSec * 0.48;
      if (spec.levelId === 6) return beatSec * 0.44;
      if (spec.levelId === 7) return beatSec * 0.52;
      if (spec.levelId === 8) return beatSec * 0.46;
      if (spec.levelId === 9) return beatSec * 0.58;
      return beatSec * 0.88;
    }
    if (role === 'accent') {
      if (spec.levelId === 5) return beatSec * 0.92;
      if (spec.levelId === 6) return beatSec * 0.52;
      if (spec.levelId === 7) return beatSec * 0.48;
      if (spec.levelId === 8) return beatSec * 0.72;
      if (spec.levelId === 9) return beatSec * 0.84;
      return beatSec * 0.34;
    }
    if (role === 'bass') {
      if (spec.levelId === 4) return beatSec * 0.80;
      if (spec.levelId === 5) return beatSec * 1.18;
      if (spec.levelId === 6) return beatSec * 0.92;
      if (spec.levelId === 7) return beatSec * 0.88;
      if (spec.levelId === 8) return beatSec * 1.08;
      if (spec.levelId === 9) return beatSec * 1.18;
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
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 6.6, 0.06);
      return;
    }
    if (spec.levelId === 6) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 4.8, 0.052);
      return;
    }
    if (spec.levelId === 7) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 5.2, 0.052);
      return;
    }
    if (spec.levelId === 8) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 5.6, 0.048);
      return;
    }
    if (spec.levelId === 9) {
      this._playRoleChord(spec.levelId, 'chord', bar.chord, start, beatSec * 6.8, 0.046);
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
    if (levelId === 6) {
      for (let i = 0; i < freqs.length; i++) {
        this._playFactoryPadTone6(freqs[i], start + (i * 0.016), duration, scaledGain / freqs.length);
      }
      return;
    }
    if (levelId === 7) {
      for (let i = 0; i < freqs.length; i++) {
        this._playStormPadTone7(freqs[i], start + (i * 0.014), duration, scaledGain / freqs.length);
      }
      return;
    }
    if (levelId === 8) {
      for (let i = 0; i < freqs.length; i++) {
        this._playLibraryPadTone8(freqs[i], start + (i * 0.012), duration, scaledGain / freqs.length);
      }
      return;
    }
    if (levelId === 9) {
      for (let i = 0; i < freqs.length; i++) {
        this._playCampPadTone9(freqs[i], start + (i * 0.02), duration, scaledGain / freqs.length);
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

    if (levelId === 6) {
      if (role === 'lead') {
        this._playMetalLead6(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playClockPulse6(freq, start, duration, scaledGain * 0.92, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playFactorySubBass6(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playGearAccent6(freq, start, duration, scaledGain * 0.82);
      }
      return;
    }

    if (levelId === 7) {
      if (role === 'lead') {
        this._playStormLead7(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playStormPulse7(freq, start, duration, scaledGain * 0.9, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playStormBass7(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playLightningAccent7(freq, start, duration, scaledGain * 0.8, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      }
      return;
    }

    if (levelId === 8) {
      if (role === 'lead') {
        this._playLibraryLead8(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playStoryPluck8(freq, start, duration, scaledGain * 0.88, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playLibraryBass8(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playLibraryAccent8(freq, start, duration, scaledGain * 0.82);
      }
      return;
    }

    if (levelId === 9) {
      if (role === 'lead') {
        this._playCampLead9(freq, start, duration, scaledGain, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'counter') {
        this._playCampPluck9(freq, start, duration, scaledGain * 0.88, extras.glideTo ? noteToFrequency(extras.glideTo) : 0);
      } else if (role === 'bass') {
        this._playCampBass9(freq, start, duration, scaledGain);
      } else if (role === 'accent') {
        this._playCampAccent9(freq, start, duration, scaledGain * 0.76);
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

  _playEchoedVoice(baseConfig, echoes = []) {
    this._playOscVoice(baseConfig);
    for (const echo of echoes) {
      this._playOscVoice({
        ...baseConfig,
        start: baseConfig.start + (echo.delay ?? 0.16),
        duration: Math.max(0.08, (baseConfig.duration ?? 0.2) * (echo.durationScale ?? 0.82)),
        peak: (baseConfig.peak ?? 0.05) * (echo.gainScale ?? 0.25),
        type: echo.type || baseConfig.type,
        filterType: echo.filterType || baseConfig.filterType,
        filterFreq: echo.filterFreq ?? baseConfig.filterFreq,
        q: echo.q ?? baseConfig.q,
        freq: echo.freq ?? baseConfig.freq,
        endFreq: echo.endFreq ?? baseConfig.endFreq,
      });
    }
  }

  _applyMusicPump(levelId, start) {
    if (!this.ctx || !this.musicPumpGain || levelId < 6 || this._musicLevelId !== levelId) return;
    const dip = levelId === 9 ? 0.95 : levelId === 8 ? 0.94 : 0.92;
    this.musicPumpGain.gain.setValueAtTime(1, start);
    this.musicPumpGain.gain.linearRampToValueAtTime(dip, start + 0.012);
    this.musicPumpGain.gain.linearRampToValueAtTime(1, start + 0.12);
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

  // Level 6 — mechanical factory groove voices

  _playFactoryPadTone6(freq, start, duration, gain) {
    const voiceDuration = Math.max(0.9, duration * 0.98);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.34,
      type: 'sawtooth',
      attack: 0.12,
      filterType: 'lowpass',
      filterFreq: 720,
      q: 0.62,
    });
    this._playOscVoice({
      freq: freq * 1.004,
      start: start + 0.03,
      duration: voiceDuration * 0.9,
      peak: gain * 0.16,
      type: 'triangle',
      attack: 0.14,
      filterType: 'lowpass',
      filterFreq: 940,
      q: 0.56,
    });
  }

  _playMetalLead6(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.12, duration * 0.9),
      peak: gain * 0.46,
      type: 'triangle',
      attack: 0.008,
      filterType: 'bandpass',
      filterFreq: 1600,
      q: 1.1,
      endFreq: glideTo || null,
    }, [
      { delay: 0.12, gainScale: 0.28, durationScale: 0.74, filterFreq: 1220, q: 0.8 },
    ]);
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.01,
      duration: Math.max(0.08, duration * 0.48),
      peak: gain * 0.12,
      type: 'square',
      attack: 0.004,
      filterType: 'highpass',
      filterFreq: 980,
      q: 0.6,
    });
  }

  _playClockPulse6(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.08, duration * 0.72),
      peak: gain * 0.36,
      type: 'square',
      attack: 0.006,
      filterType: 'lowpass',
      filterFreq: 980,
      q: 0.84,
      endFreq: glideTo || null,
    }, [
      { delay: 0.09, gainScale: 0.22, durationScale: 0.5, filterFreq: 760 },
    ]);
  }

  _playFactorySubBass6(freq, start, duration, gain) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.24, duration * 1.02),
      peak: gain * 0.74,
      type: 'sine',
      attack: 0.02,
      filterType: 'lowpass',
      filterFreq: 130,
      q: 0.84,
    });
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.02,
      duration: Math.max(0.18, duration * 0.68),
      peak: gain * 0.08,
      type: 'sawtooth',
      attack: 0.016,
      filterType: 'lowpass',
      filterFreq: 260,
      q: 0.7,
    });
  }

  _playGearAccent6(freq, start, duration, gain) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.16, duration * 0.8),
      peak: gain * 0.34,
      type: 'sine',
      attack: 0.01,
      filterType: 'bandpass',
      filterFreq: 2400,
      q: 0.68,
    }, [
      { delay: 0.18, gainScale: 0.22, durationScale: 0.8, filterFreq: 1800 },
    ]);
  }

  _playFactoryTexture6(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    const lp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(420, start);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2100, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0014 * (this._stemLevels.texture ?? 1), start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // Level 7 — storm chase score voices

  _playStormPadTone7(freq, start, duration, gain) {
    const voiceDuration = Math.max(1.0, duration * 1.02);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.34,
      type: 'sawtooth',
      attack: 0.16,
      filterType: 'lowpass',
      filterFreq: 680,
      q: 0.58,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start,
      duration: voiceDuration,
      peak: gain * 0.12,
      type: 'triangle',
      attack: 0.18,
      filterType: 'lowpass',
      filterFreq: 240,
      q: 0.72,
    });
  }

  _playStormLead7(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.16, duration * 0.92),
      peak: gain * 0.40,
      type: 'triangle',
      attack: 0.01,
      filterType: 'bandpass',
      filterFreq: 1240,
      q: 0.96,
      endFreq: glideTo || null,
    }, [
      { delay: 0.16, gainScale: 0.26, durationScale: 0.7, filterFreq: 920 },
    ]);
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.03,
      duration: Math.max(0.10, duration * 0.46),
      peak: gain * 0.08,
      type: 'sine',
      attack: 0.01,
      filterType: 'highpass',
      filterFreq: 1100,
      q: 0.58,
    });
  }

  _playStormPulse7(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.08, duration * 0.7),
      peak: gain * 0.34,
      type: 'square',
      attack: 0.004,
      filterType: 'lowpass',
      filterFreq: 860,
      q: 0.76,
      endFreq: glideTo || null,
    }, [
      { delay: 0.08, gainScale: 0.20, durationScale: 0.56, filterFreq: 680 },
    ]);
  }

  _playStormBass7(freq, start, duration, gain) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.2, duration * 0.96),
      peak: gain * 0.78,
      type: 'sine',
      attack: 0.015,
      filterType: 'lowpass',
      filterFreq: 144,
      q: 0.82,
    });
    this._playOscVoice({
      freq: freq * 1.99,
      start: start + 0.015,
      duration: Math.max(0.14, duration * 0.58),
      peak: gain * 0.08,
      type: 'triangle',
      attack: 0.01,
      filterType: 'lowpass',
      filterFreq: 240,
      q: 0.62,
    });
  }

  _playLightningAccent7(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.1, duration * 0.76),
      peak: gain * 0.32,
      type: 'sine',
      attack: 0.004,
      filterType: 'bandpass',
      filterFreq: 2800,
      q: 0.72,
      endFreq: glideTo || null,
    }, [
      { delay: 0.12, gainScale: 0.26, durationScale: 0.66, filterFreq: 2200 },
    ]);
  }

  _playStormTexture7(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(680, start);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1800, start);
    bp.Q.setValueAtTime(0.42, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0012 * (this._stemLevels.texture ?? 1), start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // Level 8 — cozy library groove voices

  _playLibraryPadTone8(freq, start, duration, gain) {
    const voiceDuration = Math.max(1.1, duration * 1.06);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.30,
      type: 'triangle',
      attack: 0.22,
      filterType: 'lowpass',
      filterFreq: 880,
      q: 0.52,
    });
    this._playOscVoice({
      freq: freq * 1.002,
      start: start + 0.02,
      duration: voiceDuration * 0.94,
      peak: gain * 0.14,
      type: 'sine',
      attack: 0.18,
      filterType: 'lowpass',
      filterFreq: 1020,
      q: 0.5,
    });
  }

  _playLibraryLead8(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.2, duration),
      peak: gain * 0.34,
      type: 'triangle',
      attack: 0.03,
      filterType: 'bandpass',
      filterFreq: 980,
      q: 0.84,
      endFreq: glideTo || null,
    }, [
      { delay: 0.18, gainScale: 0.20, durationScale: 0.74, filterFreq: 760 },
    ]);
  }

  _playStoryPluck8(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.10, duration * 0.72),
      peak: gain * 0.38,
      type: 'triangle',
      attack: 0.006,
      filterType: 'lowpass',
      filterFreq: 1800,
      q: 0.62,
      endFreq: glideTo || null,
    }, [
      { delay: 0.16, gainScale: 0.24, durationScale: 0.6, filterFreq: 1440 },
    ]);
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.01,
      duration: Math.max(0.08, duration * 0.40),
      peak: gain * 0.08,
      type: 'sine',
      attack: 0.004,
      filterType: 'highpass',
      filterFreq: 1200,
      q: 0.56,
    });
  }

  _playLibraryBass8(freq, start, duration, gain) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.24, duration * 1.06),
      peak: gain * 0.74,
      type: 'sine',
      attack: 0.03,
      filterType: 'lowpass',
      filterFreq: 154,
      q: 0.78,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start,
      duration: Math.max(0.2, duration * 0.92),
      peak: gain * 0.14,
      type: 'triangle',
      attack: 0.05,
      filterType: 'lowpass',
      filterFreq: 118,
      q: 0.72,
    });
  }

  _playLibraryAccent8(freq, start, duration, gain) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.16, duration * 0.8),
      peak: gain * 0.26,
      type: 'sine',
      attack: 0.01,
      filterType: 'bandpass',
      filterFreq: 2200,
      q: 0.64,
    }, [
      { delay: 0.14, gainScale: 0.18, durationScale: 0.82, filterFreq: 1760 },
    ]);
  }

  _playLibraryTexture8(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1320, start);
    bp.Q.setValueAtTime(0.28, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0009 * (this._stemLevels.texture ?? 1), start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // Level 9 — camp finale voices

  _playCampPadTone9(freq, start, duration, gain) {
    const voiceDuration = Math.max(1.3, duration * 1.08);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.26,
      type: 'triangle',
      attack: 0.26,
      filterType: 'lowpass',
      filterFreq: 720,
      q: 0.5,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start,
      duration: voiceDuration,
      peak: gain * 0.12,
      type: 'sine',
      attack: 0.3,
      filterType: 'lowpass',
      filterFreq: 180,
      q: 0.74,
    });
  }

  _playCampLead9(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.24, duration),
      peak: gain * 0.28,
      type: 'sine',
      attack: 0.03,
      filterType: 'bandpass',
      filterFreq: 860,
      q: 0.9,
      endFreq: glideTo || null,
    }, [
      { delay: 0.22, gainScale: 0.18, durationScale: 0.84, filterFreq: 680 },
    ]);
  }

  _playCampPluck9(freq, start, duration, gain, glideTo = 0) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.12, duration * 0.78),
      peak: gain * 0.30,
      type: 'triangle',
      attack: 0.008,
      filterType: 'lowpass',
      filterFreq: 1600,
      q: 0.58,
      endFreq: glideTo || null,
    }, [
      { delay: 0.18, gainScale: 0.22, durationScale: 0.72, filterFreq: 1320 },
    ]);
  }

  _playCampBass9(freq, start, duration, gain) {
    this._playOscVoice({
      freq,
      start,
      duration: Math.max(0.3, duration * 1.12),
      peak: gain * 0.70,
      type: 'sine',
      attack: 0.05,
      filterType: 'lowpass',
      filterFreq: 120,
      q: 0.82,
    });
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.02,
      duration: Math.max(0.18, duration * 0.56),
      peak: gain * 0.05,
      type: 'triangle',
      attack: 0.03,
      filterType: 'lowpass',
      filterFreq: 220,
      q: 0.64,
    });
  }

  _playCampAccent9(freq, start, duration, gain) {
    this._playEchoedVoice({
      freq,
      start,
      duration: Math.max(0.18, duration * 0.9),
      peak: gain * 0.20,
      type: 'sine',
      attack: 0.02,
      filterType: 'bandpass',
      filterFreq: 1880,
      q: 0.58,
    }, [
      { delay: 0.2, gainScale: 0.18, durationScale: 0.88, filterFreq: 1480 },
    ]);
  }

  _playCampTexture9(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    const hp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, start);
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(240, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0011 * (this._stemLevels.texture ?? 1), start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(this.musicGain);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  // Level 5 — cinematic aquarium synth score voices

  _playAbyssPadTone(freq, start, duration, gain) {
    const voiceDuration = Math.max(1.2, duration * 1.04);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.42,
      type: 'sawtooth',
      attack: 0.42,
      filterType: 'lowpass',
      filterFreq: 560,
      q: 0.66,
    });
    this._playOscVoice({
      freq: freq * 1.003,
      start: start + 0.06,
      duration: voiceDuration * 0.96,
      peak: gain * 0.24,
      type: 'sine',
      attack: 0.38,
      filterType: 'lowpass',
      filterFreq: 760,
      q: 0.52,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start,
      duration: voiceDuration,
      peak: gain * 0.18,
      type: 'triangle',
      attack: 0.46,
      filterType: 'lowpass',
      filterFreq: 180,
      q: 0.76,
    });
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.28,
      duration: Math.max(0.8, voiceDuration * 0.74),
      peak: gain * 0.06,
      type: 'triangle',
      attack: 0.20,
      filterType: 'bandpass',
      filterFreq: 1160,
      q: 0.56,
    });
  }

  _playSonarLead5(freq, start, duration, gain, glideTo = 0) {
    const voiceDuration = Math.max(0.30, duration * 1.08);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.46,
      type: 'triangle',
      attack: 0.028,
      filterType: 'bandpass',
      filterFreq: 980,
      q: 0.92,
      endFreq: glideTo || null,
    });
    this._playOscVoice({
      freq: freq * 0.5,
      start: start + 0.05,
      duration: voiceDuration * 0.88,
      peak: gain * 0.14,
      type: 'sine',
      attack: 0.08,
      filterType: 'lowpass',
      filterFreq: 260,
      q: 0.78,
    });
    this._playOscVoice({
      freq: glideTo || freq,
      start: start + 0.28,
      duration: Math.max(0.24, voiceDuration * 0.70),
      peak: gain * 0.14,
      type: 'sine',
      attack: 0.03,
      filterType: 'bandpass',
      filterFreq: 1240,
      q: 0.64,
    });
    this._playOscVoice({
      freq: glideTo || (freq * 0.99),
      start: start + 0.54,
      duration: Math.max(0.20, voiceDuration * 0.54),
      peak: gain * 0.08,
      type: 'triangle',
      attack: 0.02,
      filterType: 'highpass',
      filterFreq: 980,
      q: 0.48,
    });
  }

  _playGatedArp5(freq, start, duration, gain, glideTo = 0) {
    const voiceDuration = Math.max(0.16, duration * 0.76);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.46,
      type: 'square',
      attack: 0.012,
      filterType: 'lowpass',
      filterFreq: 760,
      q: 0.78,
      endFreq: glideTo || null,
    });
    this._playOscVoice({
      freq: freq * 1.002,
      start: start + 0.03,
      duration: Math.max(0.14, voiceDuration * 0.82),
      peak: gain * 0.14,
      type: 'triangle',
      attack: 0.02,
      filterType: 'lowpass',
      filterFreq: 620,
      q: 0.62,
    });
    this._playOscVoice({
      freq,
      start: start + 0.22,
      duration: Math.max(0.10, voiceDuration * 0.52),
      peak: gain * 0.10,
      type: 'square',
      attack: 0.01,
      filterType: 'lowpass',
      filterFreq: 940,
      q: 0.58,
    });
  }

  _playAbyssSubBass5(freq, start, duration, gain) {
    const voiceDuration = Math.max(0.54, duration * 1.18);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.70,
      type: 'sine',
      attack: 0.07,
      filterType: 'lowpass',
      filterFreq: 126,
      q: 0.86,
    });
    this._playOscVoice({
      freq: freq * 1.01,
      start: start + 0.05,
      duration: Math.max(0.44, voiceDuration * 0.92),
      peak: gain * 0.12,
      type: 'triangle',
      attack: 0.09,
      filterType: 'lowpass',
      filterFreq: 164,
      q: 0.70,
    });
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.09,
      duration: Math.max(0.24, voiceDuration * 0.68),
      peak: gain * 0.05,
      type: 'sawtooth',
      attack: 0.06,
      filterType: 'lowpass',
      filterFreq: 210,
      q: 0.72,
    });
  }

  _playShimmer5(freq, start, duration, gain) {
    const voiceDuration = Math.max(0.32, duration * 1.02);
    this._playOscVoice({
      freq,
      start,
      duration: voiceDuration,
      peak: gain * 0.34,
      type: 'sine',
      attack: 0.04,
      filterType: 'bandpass',
      filterFreq: 2100,
      q: 0.62,
    });
    this._playOscVoice({
      freq: freq * 2,
      start: start + 0.10,
      duration: Math.max(0.26, voiceDuration * 0.66),
      peak: gain * 0.09,
      type: 'triangle',
      attack: 0.03,
      filterType: 'highpass',
      filterFreq: 1500,
      q: 0.50,
    });
  }

  _playAbyssTexture5(start, duration) {
    if (!this.ctx || !this._noiseBuffer || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    const bp = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(980, start);
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1240, start);
    bp.Q.setValueAtTime(0.32, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.0017 * (this._stemLevels.texture ?? 1), start + 0.16);
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
        this._osc(48, 'sine', start, 0.34, 0.046 * drumGain, 28, this.musicGain);
        this._osc(78, 'triangle', start + 0.01, 0.12, 0.005 * drumGain, 44, this.musicGain);
        this._playNoiseBurst(start, 0.04, 0.0018 * drumGain, { type: 'lowpass', frequency: 180, q: 0.38 }, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.11, 0.009 * drumGain, { type: 'bandpass', frequency: 1380, q: 0.52 }, this.musicGain);
        this._osc(164, 'triangle', start + 0.01, 0.10, 0.0034 * drumGain, 118, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.055, 0.0022 * drumGain, { type: 'highpass', frequency: 3400, q: 0.42 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.06, 0.0042 * drumGain, { type: 'bandpass', frequency: 1560, q: 0.56 }, this.musicGain);
        this._osc(248, 'sine', start + 0.01, 0.06, 0.0024 * drumGain, 188, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.05, 0.0018 * drumGain, { type: 'highpass', frequency: 2800, q: 0.36 }, this.musicGain);
      }
      return;
    }

    if (levelId === 6) {
      if (drum === 'kick') {
        this._applyMusicPump(levelId, start);
        this._osc(58, 'sine', start, 0.22, 0.05 * drumGain, 34, this.musicGain);
        this._playNoiseBurst(start, 0.03, 0.003 * drumGain, { type: 'lowpass', frequency: 260, q: 0.42 }, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.09, 0.012 * drumGain, { type: 'bandpass', frequency: 1800, q: 0.66 }, this.musicGain);
        this._osc(214, 'triangle', start + 0.008, 0.08, 0.004 * drumGain, 140, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.028, 0.004 * drumGain, { type: 'highpass', frequency: 4600, q: 0.54 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.032, 0.0046 * drumGain, { type: 'bandpass', frequency: 2200, q: 0.82 }, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.04, 0.0028 * drumGain, { type: 'highpass', frequency: 3200, q: 0.42 }, this.musicGain);
      }
      return;
    }

    if (levelId === 7) {
      if (drum === 'kick') {
        this._applyMusicPump(levelId, start);
        this._osc(52, 'sine', start, 0.24, 0.052 * drumGain, 30, this.musicGain);
        this._playNoiseBurst(start, 0.026, 0.0032 * drumGain, { type: 'lowpass', frequency: 240, q: 0.48 }, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.085, 0.013 * drumGain, { type: 'bandpass', frequency: 1900, q: 0.74 }, this.musicGain);
        this._osc(236, 'triangle', start + 0.01, 0.09, 0.004 * drumGain, 154, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.03, 0.0042 * drumGain, { type: 'highpass', frequency: 5200, q: 0.52 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.028, 0.004 * drumGain, { type: 'bandpass', frequency: 2400, q: 0.84 }, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.038, 0.0026 * drumGain, { type: 'highpass', frequency: 3600, q: 0.48 }, this.musicGain);
      }
      return;
    }

    if (levelId === 8) {
      if (drum === 'kick') {
        this._applyMusicPump(levelId, start);
        this._osc(64, 'sine', start, 0.18, 0.036 * drumGain, 38, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.075, 0.008 * drumGain, { type: 'bandpass', frequency: 1600, q: 0.68 }, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.024, 0.0028 * drumGain, { type: 'highpass', frequency: 4400, q: 0.5 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.026, 0.0042 * drumGain, { type: 'bandpass', frequency: 2100, q: 0.78 }, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.03, 0.0022 * drumGain, { type: 'highpass', frequency: 3200, q: 0.46 }, this.musicGain);
      }
      return;
    }

    if (levelId === 9) {
      if (drum === 'kick') {
        this._applyMusicPump(levelId, start);
        this._osc(60, 'sine', start, 0.20, 0.034 * drumGain, 34, this.musicGain);
      } else if (drum === 'snare') {
        this._playNoiseBurst(start, 0.07, 0.006 * drumGain, { type: 'bandpass', frequency: 1500, q: 0.6 }, this.musicGain);
      } else if (drum === 'hat') {
        this._playNoiseBurst(start, 0.022, 0.0018 * drumGain, { type: 'highpass', frequency: 4000, q: 0.44 }, this.musicGain);
      } else if (drum === 'rim') {
        this._playNoiseBurst(start, 0.032, 0.0044 * drumGain, { type: 'bandpass', frequency: 1760, q: 0.72 }, this.musicGain);
      } else if (drum === 'shaker') {
        this._playNoiseBurst(start, 0.034, 0.0022 * drumGain, { type: 'highpass', frequency: 3000, q: 0.4 }, this.musicGain);
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
