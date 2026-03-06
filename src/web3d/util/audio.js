// Twangy G-major pentatonic loop (16 notes) for Level 1 banjo feel
const BANJO_NOTES = [
  392.00, // G4
  329.63, // E4
  293.66, // D4
  246.94, // B3
  196.00, // G3
  220.00, // A3
  246.94, // B3
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  493.88, // B4
  392.00, // G4
  293.66, // D4
  246.94, // B3
  196.00, // G3
];
const BANJO_RESTS = [
  false, false, false, true,
  false, false, false, false,
  false, true,  false, false,
  false, false, false, true,
];
const BANJO_VOL = 0.28;
const BANJO_MS = 820;  // slightly snappier than piano

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
const COUNTRY_BPM = 192;
const COUNTRY_STEP_SEC = 60 / COUNTRY_BPM / 2; // eighth-note feel
const COUNTRY_SCHEDULE_AHEAD_SEC = 0.45;
const COUNTRY_SCHEDULER_MS = 120;
const COUNTRY_LEAD = [
  392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 493.88, 440.0,
  392.0, 329.63, 293.66, 329.63, 392.0, 440.0, 493.88, 440.0,
];
const COUNTRY_BASS = [
  98.0, 98.0, 146.83, 146.83, 110.0, 110.0, 98.0, 98.0,
];
const COUNTRY_SNARE_STEPS = new Set([2, 6]);
const COUNTRY_KICK_STEPS = new Set([0, 4]);

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
    this._pianoRunning = false;
    this._plinkIndex = 0;
    this._beatIndex = 0;
    this._pianoScheduleId = null;
    this._birdChirpId = null;
    this._countrySchedulerId = null;
    this._countryNextNoteTime = 0;
    this._countryStep = 0;
    this._musicStyle = 'piano';
    this._noiseBuffer = null;
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

  // --- Piano plink metronome ---

  startMusic(fadeSec = 0.5, style = 'piano') {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.musicGain) return;
    if (this._pianoRunning) return;
    this._pianoRunning = true;
    this._musicStyle = style;
    this._plinkIndex = 0;
    this._beatIndex = 0;
    this._countryStep = 0;
    this._countryNextNoteTime = this.ctx.currentTime;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0.85, t + Math.max(0.02, fadeSec));
    if (style === 'country') {
      this._scheduleCountry();
    } else if (style === 'banjo') {
      this._scheduleBanjo();
    } else {
      this._schedulePlink();
    }
    if (style !== 'country') {
      this._scheduleBirdChirp();
    }
  }

  stopMusic(fadeSec = 0.5) {
    this._pianoRunning = false;
    clearTimeout(this._pianoScheduleId);
    clearTimeout(this._birdChirpId);
    clearTimeout(this._countrySchedulerId);
    this._pianoScheduleId = null;
    this._birdChirpId = null;
    this._countrySchedulerId = null;
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

  // --- Banjo twang ---

  _playBanjoNote() {
    if (!this.ctx || !this.musicGain) return;
    const freq = BANJO_NOTES[this._plinkIndex % BANJO_NOTES.length];
    this._plinkIndex++;
    const t = this.ctx.currentTime;
    // Sawtooth pluck — fast attack, quick decay for banjo character
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(BANJO_VOL, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.22);
    // Slightly detuned triangle for twang warmth
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 1.006;
    gain2.gain.setValueAtTime(0.0001, t);
    gain2.gain.linearRampToValueAtTime(BANJO_VOL * 0.4, t + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc2.connect(gain2);
    gain2.connect(this.musicGain);
    osc2.start(t);
    osc2.stop(t + 0.18);
  }

  _scheduleBanjo() {
    if (!this._pianoRunning) return;
    const shouldRest = BANJO_RESTS[this._beatIndex % BANJO_RESTS.length];
    if (!shouldRest) {
      this._playBanjoNote();
    } else {
      this._plinkIndex++;
    }
    this._beatIndex++;
    this._pianoScheduleId = window.setTimeout(() => this._scheduleBanjo(), BANJO_MS);
  }

  _scheduleCountry() {
    if (!this._pianoRunning || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    if (!this._countryNextNoteTime || this._countryNextNoteTime < now) {
      this._countryNextNoteTime = now + 0.02;
    }
    while (this._countryNextNoteTime < now + COUNTRY_SCHEDULE_AHEAD_SEC) {
      this._scheduleCountryStep(this._countryNextNoteTime, this._countryStep);
      this._countryNextNoteTime += COUNTRY_STEP_SEC;
      this._countryStep += 1;
    }
    this._countrySchedulerId = window.setTimeout(() => this._scheduleCountry(), COUNTRY_SCHEDULER_MS);
  }

  _scheduleCountryStep(time, stepIndex) {
    const leadFreq = COUNTRY_LEAD[stepIndex % COUNTRY_LEAD.length];
    const bassFreq = COUNTRY_BASS[Math.floor(stepIndex / 2) % COUNTRY_BASS.length];
    const stepInBar = stepIndex % 8;

    if (stepIndex % 2 === 0 || stepInBar === 3 || stepInBar === 7) {
      this._playCountryLeadAt(leadFreq, time);
    }
    if (stepInBar === 0 || stepInBar === 4) {
      this._playCountryBassAt(bassFreq, time);
    }
    if (COUNTRY_KICK_STEPS.has(stepInBar)) {
      this._playCountryKickAt(time);
    }
    if (COUNTRY_SNARE_STEPS.has(stepInBar)) {
      this._playCountrySnareAt(time);
    }
    if (stepInBar === 1 || stepInBar === 5) {
      this._playCountryHatAt(time);
    }
  }

  _playCountryLeadAt(freq, start) {
    if (!this.ctx || !this.musicGain || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + 0.18);

    const slapOsc = this.ctx.createOscillator();
    const slapGain = this.ctx.createGain();
    slapOsc.type = 'square';
    slapOsc.frequency.setValueAtTime(freq * 1.01, start + 0.12);
    slapGain.gain.setValueAtTime(0.0001, start + 0.12);
    slapGain.gain.linearRampToValueAtTime(0.04, start + 0.125);
    slapGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    slapOsc.connect(slapGain);
    slapGain.connect(this.musicGain);
    slapOsc.start(start + 0.12);
    slapOsc.stop(start + 0.24);
  }

  _playCountryBassAt(freq, start) {
    if (!this.ctx || !this.musicGain || this.muted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(start);
    osc.stop(start + 0.28);
  }

  _playCountryKickAt(start) {
    this._osc(96, 'sine', start, 0.16, 0.065, 48, this.musicGain);
  }

  _playCountrySnareAt(start) {
    this._playNoiseBurst(start, 0.075, 0.03, {
      type: 'bandpass',
      frequency: 1700,
      q: 0.7,
    }, this.musicGain);
  }

  _playCountryHatAt(start) {
    this._playNoiseBurst(start, 0.04, 0.018, {
      type: 'highpass',
      frequency: 3200,
      q: 0.6,
    }, this.musicGain);
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

  _createNoiseBuffer() {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2) - 1;
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
    let tail = gain;
    if (filterDef) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = filterDef.type;
      filter.frequency.setValueAtTime(filterDef.frequency, start);
      filter.Q.setValueAtTime(filterDef.q ?? 1, start);
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    tail.connect(destination || this.sfxGain || this.master);
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
