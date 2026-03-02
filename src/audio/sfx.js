// WebAudio SFX - all generated procedurally
let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(freq, type, duration, volume = 0.3, attack = 0.01, decay = 0.1) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(volume, c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + attack + decay + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + attack + decay + duration + 0.05);
  } catch(e) {
    // Audio context not ready yet
  }
}

function playNoise(duration, volume = 0.1, highpass = 200) {
  try {
    const c = getCtx();
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
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
    gain.connect(c.destination);
    src.start();
    src.stop(c.currentTime + duration);
  } catch(e) {}
}

export const sfx = {
  init() {
    // Called on first user input
    getCtx();
  },

  crawlTick() {
    playTone(80, 'sine', 0.05, 0.08, 0.01, 0.04);
  },

  bonk() {
    playTone(120, 'square', 0.08, 0.25, 0.005, 0.1);
    setTimeout(() => playTone(80, 'square', 0.06, 0.15, 0.005, 0.08), 60);
  },

  pickup() {
    playTone(523, 'sine', 0.05, 0.3, 0.01, 0.05);
    setTimeout(() => playTone(659, 'sine', 0.05, 0.3, 0.01, 0.05), 80);
    setTimeout(() => playTone(784, 'sine', 0.1, 0.35, 0.01, 0.1), 160);
  },

  nap() {
    // Soft snore sound
    playTone(150, 'sine', 0.3, 0.1, 0.1, 0.2);
    setTimeout(() => playTone(120, 'sine', 0.4, 0.08, 0.1, 0.3), 500);
    setTimeout(() => playTone(150, 'sine', 0.3, 0.1, 0.1, 0.2), 1000);
  },

  whoosh() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.4);
    } catch(e) {}
  },

  swing() {
    playTone(200, 'sine', 0.05, 0.05, 0.01, 0.05);
  },

  // Distinct "grabbed wall" cue — short thwump
  wallGrab() {
    playTone(160, 'triangle', 0.06, 0.18, 0.005, 0.07);
    setTimeout(() => playTone(110, 'triangle', 0.04, 0.12, 0.005, 0.05), 50);
  },

  wakeUp() {
    playTone(300, 'triangle', 0.1, 0.2, 0.02, 0.1);
    setTimeout(() => playTone(400, 'triangle', 0.1, 0.25, 0.02, 0.15), 120);
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 'sine', 0.15, 0.4, 0.01, 0.15), i * 120);
    });
  },
};
