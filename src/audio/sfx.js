// WebAudio SFX — all procedural. Toybox-warm palette: low frequencies, soft attacks,
// triangle/sine oscillators, clamped peaks to avoid harsh transients.

import { isTestMode } from '../utils/testMode.js';

let ctx = null;
let masterGain = null;
let _muted = false;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.72; // headroom buffer — all voices sum through this
    masterGain.connect(ctx.destination);
    // Restore mute preference from localStorage
    try { _muted = localStorage.getItem('dada-muted') === '1'; } catch (e) {}
    if (_muted) masterGain.gain.value = 0;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, type, duration, volume = 0.3, attack = 0.01, decay = 0.1) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(Math.min(volume, 0.45), c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + attack + decay + duration + 0.05);
  } catch (e) {}
}

function playNoise(duration, volume = 0.1, highpass = 200) {
  try {
    const c = getCtx();
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    // Deterministic noise in test mode
    for (let i = 0; i < bufSize; i++) {
      data[i] = isTestMode() ? (((i * 12345) % 32768) / 16384 - 1) : (Math.random() * 2 - 1);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start();
    src.stop(c.currentTime + duration);
  } catch (e) {}
}

export const sfx = {
  init() {
    getCtx();
  },

  toggleMute() {
    _muted = !_muted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(_muted ? 0 : 0.72, ctx.currentTime);
    }
    try { localStorage.setItem('dada-muted', _muted ? '1' : '0'); } catch (e) {}
    return _muted;
  },

  isMuted() { return _muted; },

  // Soft fabric tap — randomised pitch, very quiet
  crawlTick() {
    const freq = isTestMode() ? 127.5 : (100 + Math.random() * 55);
    playTone(freq, 'sine', 0.02, 0.032, 0.004, 0.03);
  },

  // Muted thump — low freq, soft attack, short noise burst
  bonk() {
    playTone(130, 'triangle', 0.10, 0.11, 0.006, 0.12);
    playNoise(0.05, 0.016, 180);
  },

  // Warm 3-note chime: C4 → E4 → G4 (major triad, toy-piano feel)
  pickup() {
    playTone(262, 'triangle', 0.09, 0.13, 0.008, 0.12);
    setTimeout(() => playTone(330, 'triangle', 0.09, 0.13, 0.008, 0.12), 85);
    setTimeout(() => playTone(392, 'sine', 0.14, 0.14, 0.008, 0.18), 170);
  },

  // Soft puff + delayed hum — restful, not harsh
  nap() {
    playTone(155, 'sine', 0.45, 0.055, 0.14, 0.32);
    setTimeout(() => playTone(130, 'sine', 0.50, 0.048, 0.16, 0.38), 520);
    setTimeout(() => playNoise(0.26, 0.011, 320), 1050);
  },

  // Soft downward triangle sweep — gentler than sawtooth
  whoosh() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(85, c.currentTime + 0.28);
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, c.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.32);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.36);
    } catch (e) {}
  },

  // Rubbery grab + tiny jingle — non-fatiguing
  swing() {
    playTone(240, 'triangle', 0.04, 0.11, 0.003, 0.05);
    setTimeout(() => playTone(360, 'sine', 0.06, 0.07, 0.005, 0.08), 40);
  },

  // Rubbery grip — two-part thwump
  wallGrab() {
    playTone(185, 'triangle', 0.05, 0.13, 0.003, 0.06);
    setTimeout(() => playTone(130, 'sine', 0.06, 0.09, 0.003, 0.07), 42);
  },

  // Soft upward chirp — waking up
  wakeUp() {
    playTone(260, 'sine', 0.14, 0.14, 0.022, 0.13);
    setTimeout(() => playTone(390, 'triangle', 0.12, 0.16, 0.018, 0.14), 140);
  },

  // Toy-piano arpeggio: G4 C5 E5 G5 + sparkle — bright but not piercing
  victory() {
    const notes = [392, 523, 659, 784];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 'triangle', 0.18, 0.27, 0.006, 0.18), i * 130);
    });
    setTimeout(() => {
      playTone(1047, 'sine', 0.12, 0.11, 0.004, 0.14);
      setTimeout(() => playTone(1319, 'sine', 0.10, 0.08, 0.004, 0.12), 110);
    }, 620);
  },
};
