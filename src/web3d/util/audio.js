// Am – F – C – G chord progression; 1.5 s per chord, looping forever.
const PIANO_CHORDS = [
  [220.00, 261.63, 329.63],  // Am: A3 C4 E4
  [174.61, 220.00, 261.63],  // F:  F3 A3 C4
  [261.63, 329.63, 392.00],  // C:  C4 E4 G4
  [196.00, 246.94, 293.66],  // G:  G3 B3 D4
];
const PIANO_CHORD_DUR = 1.5;  // seconds per chord
const PIANO_NOTE_VOL = 0.08;  // per-note amplitude through musicGain

export class GameAudio {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.muted = !enabled;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.cooldowns = new Map();
    this._unlockBound = null;
    this._pianoRunning = false;
    this._pianoChordIndex = 0;
    this._pianoNextTime = 0;
    this._pianoScheduleId = null;
    this._birdChirpId = null;
  }

  _ensureContext() {
    if (!this.enabled || this.ctx) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.24;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
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
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.24, this.ctx.currentTime, 0.01);
    }
    return this.muted;
  }

  // --- Procedural piano loop ---

  startMusic(fadeSec = 0.5) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.musicGain) return;
    if (this._pianoRunning) return;
    this._pianoRunning = true;
    this._pianoChordIndex = 0;
    this._pianoNextTime = this.ctx.currentTime + 0.1;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0.55, t + Math.max(0.02, fadeSec));
    this._schedulePianoChunk();
    this._scheduleBirdChirp();
  }

  stopMusic(fadeSec = 0.5) {
    this._pianoRunning = false;
    clearTimeout(this._pianoScheduleId);
    clearTimeout(this._birdChirpId);
    this._pianoScheduleId = null;
    this._birdChirpId = null;
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fadeSec));
  }

  _schedulePianoNote(freq, startTime, duration) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(PIANO_NOTE_VOL, startTime + 0.06);
    gain.gain.setValueAtTime(PIANO_NOTE_VOL, startTime + duration - 0.18);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  _schedulePianoChunk() {
    if (!this._pianoRunning || !this.ctx) return;
    const LOOKAHEAD = 2.0; // seconds to schedule ahead
    while (this._pianoNextTime < this.ctx.currentTime + LOOKAHEAD) {
      const chord = PIANO_CHORDS[this._pianoChordIndex % PIANO_CHORDS.length];
      for (const freq of chord) {
        this._schedulePianoNote(freq, this._pianoNextTime, PIANO_CHORD_DUR - 0.05);
      }
      this._pianoNextTime += PIANO_CHORD_DUR;
      this._pianoChordIndex++;
    }
    this._pianoScheduleId = window.setTimeout(() => this._schedulePianoChunk(), 500);
  }

  // --- Occasional bird chirps ---

  _playBirdChirp() {
    if (!this.enabled || !this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const base = 2800 + Math.random() * 1400;
    const vol = 0.012 + Math.random() * 0.008;
    this._osc(base, 'sine', t, 0.07, vol, base * 1.14);
    this._osc(base * 1.2, 'sine', t + 0.08, 0.06, vol * 0.7, base * 1.32);
  }

  _scheduleBirdChirp() {
    if (!this._pianoRunning) return;
    const delayMs = 12000 + Math.random() * 13000; // 12–25 s between chirps
    this._birdChirpId = window.setTimeout(() => {
      this._playBirdChirp();
      this._scheduleBirdChirp();
    }, delayMs);
  }

  // --- Utilities ---

  _allow(key, cooldownMs) {
    const now = performance.now();
    const nextAt = this.cooldowns.get(key) || 0;
    if (now < nextAt) return false;
    this.cooldowns.set(key, now + cooldownMs);
    return true;
  }

  _osc(freq, type, start, duration, volume, endFreq = null) {
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
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // --- SFX ---

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

  playWin() {
    if (!this.enabled || !this._allow('win', 500)) return;
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._osc(523, 'sine', t, 0.16, 0.07);
    this._osc(659, 'sine', t + 0.12, 0.16, 0.07);
    this._osc(784, 'sine', t + 0.24, 0.26, 0.08);
  }
}
