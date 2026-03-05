// Gentle C-major melody loop (12 notes) at one note per second.
const PLINK_NOTES = [
  261.63, // C4
  329.63, // E4
  392.00, // G4
  329.63, // E4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  392.00, // G4
  329.63, // E4
  293.66, // D4
  261.63, // C4
];
// Occasional rests to break strict metronome feel: 1 rest every 16 beats.
const PLINK_RESTS = [
  false, false, false, false,
  false, false, false, false,
  false, false, false, true,
  false, false, false, false,
];
const PLINK_VOL = 0.22;   // pluck volume through musicGain
const PLINK_MS = 1000;    // one plink per second

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
    this._plinkIndex = 0;
    this._beatIndex = 0;
    this._pianoScheduleId = null;
    this._birdChirpId = null;
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

  // --- Piano plink metronome ---

  startMusic(fadeSec = 0.5) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.musicGain) return;
    if (this._pianoRunning) return;
    this._pianoRunning = true;
    this._plinkIndex = 0;
    this._beatIndex = 0;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0.85, t + Math.max(0.02, fadeSec));
    this._schedulePlink();
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

  _playPlinkNote() {
    if (!this.ctx || !this.musicGain) return;
    const freq = PLINK_NOTES[this._plinkIndex % PLINK_NOTES.length];
    this._plinkIndex++;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(PLINK_VOL, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  _schedulePlink() {
    if (!this._pianoRunning) return;
    const shouldRest = PLINK_RESTS[this._beatIndex % PLINK_RESTS.length];
    if (!shouldRest) {
      this._playPlinkNote();
    } else {
      this._plinkIndex++;
    }
    this._beatIndex++;
    this._pianoScheduleId = window.setTimeout(() => this._schedulePlink(), PLINK_MS);
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
