export class GameAudio {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled;
    this.muted = !enabled;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicElement = null;
    this.musicSource = null;
    this.cooldowns = new Map();
    this._unlockBound = null;
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

  _ensureMusicElement() {
    if (!this.enabled || this.musicElement) return;
    this.musicElement = new Audio('assets/audio/music/level1.ogg');
    this.musicElement.loop = true;
    this.musicElement.preload = 'auto';
    this.musicElement.crossOrigin = 'anonymous';
  }

  _ensureMusicSource() {
    if (!this.ctx || !this.musicGain || this.musicSource) return;
    this._ensureMusicElement();
    if (!this.musicElement) return;
    this.musicSource = this.ctx.createMediaElementSource(this.musicElement);
    this.musicSource.connect(this.musicGain);
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

  startMusic(fadeSec = 0.5) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.ctx || !this.musicGain) return;
    this._ensureMusicSource();
    if (!this.musicElement || !this.musicSource) return;
    if (this.musicElement.paused) {
      this.musicElement.play().catch(() => {});
    }
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0.55, t + Math.max(0.02, fadeSec));
  }

  stopMusic(fadeSec = 0.5) {
    if (!this.ctx || !this.musicGain || !this.musicElement) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fadeSec));
    window.setTimeout(() => {
      if (!this.musicElement) return;
      this.musicElement.pause();
      this.musicElement.currentTime = 0;
    }, Math.ceil(Math.max(0.02, fadeSec) * 1000) + 40);
  }

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
