const CSS = `
.dada-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  color: #fff;
  transition: opacity 0.4s ease;
  pointer-events: auto;
}
.dada-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}
.dada-title-bg {
  background: radial-gradient(ellipse at center, rgba(66,54,42,0.45) 0%, rgba(24,20,17,0.55) 100%);
}
.dada-end-bg {
  background: radial-gradient(ellipse at center, rgba(72,88,62,0.52) 0%, rgba(20,18,16,0.58) 100%);
}
.dada-card {
  min-width: min(88vw, 540px);
  max-width: 92vw;
  padding: 28px 32px 24px;
  border-radius: 16px;
  border: 1px solid rgba(110, 80, 50, 0.38);
  background:
    linear-gradient(170deg, rgba(249, 240, 221, 0.90), rgba(232, 218, 193, 0.84));
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(130, 102, 72, 0.22);
  color: #3a2c1f;
  pointer-events: auto;
}
.dada-h1 {
  font-size: clamp(36px, 6vw, 64px);
  color: #c84f34;
  text-shadow: 0 2px 0 rgba(255, 246, 214, 0.72);
  margin: 0 0 10px;
  letter-spacing: 0.08em;
  line-height: 1;
  font-weight: 800;
}
.dada-sub {
  font-size: clamp(16px, 2.5vw, 24px);
  color: #4f3c2c;
  margin: 8px 0 2px;
  letter-spacing: 0.02em;
}
.dada-hint {
  font-size: clamp(12px, 1.8vw, 16px);
  color: #245532;
  margin-top: 22px;
  font-weight: 700;
  letter-spacing: 0.05em;
  animation: dadaPulse 1.4s ease-in-out infinite;
}
@keyframes dadaPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.dada-controls {
  font-size: clamp(11px, 1.5vw, 14px);
  color: #5d4a36;
  margin-top: 16px;
  line-height: 1.6;
  letter-spacing: 0.02em;
}
.dada-controls span {
  color: #b24733;
  font-family: monospace;
  font-weight: 700;
}
.dada-btn {
  margin-top: 24px;
  padding: 14px 32px;
  font-size: 18px;
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  background: linear-gradient(135deg, #ce5739, #ad3d28);
  border: 2px solid rgba(125,64,40,0.34);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
  letter-spacing: 0.04em;
  font-weight: 700;
  pointer-events: auto;
}
.dada-btn:hover {
  background: linear-gradient(135deg, #db6948, #b64930);
  transform: scale(1.05);
}
.dada-end-msg {
  font-size: clamp(18px, 3vw, 28px);
  color: #3f2e20;
  margin: 8px 0;
  font-weight: 700;
}
.dada-pop {
  position: absolute;
  left: 50%;
  top: 18%;
  transform: translate(-50%, -50%) scale(0.86);
  font-family: 'Georgia', serif;
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 700;
  letter-spacing: 2px;
  color: #ffe680;
  text-shadow: 0 3px 0 #b57420, 0 0 20px rgba(255, 190, 80, 0.55);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease, transform 0.16s ease;
}
.dada-pop.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1.0);
}
.dada-status {
  position: absolute;
  left: 14px;
  top: 46px;
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  font-size: 13px;
  color: #fef7e7;
  background: rgba(62, 48, 34, 0.68);
  border: 1px solid rgba(255, 235, 202, 0.36);
  border-radius: 8px;
  padding: 5px 10px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}
.dada-status.visible {
  opacity: 1;
  transform: translateY(0);
}
.dada-fade {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  opacity: 0;
  pointer-events: none !important;
  transition: opacity 0.18s linear;
}

/* ── Gameplay HUD ──────────────────────────────────────────────── */
.dada-hud-pill {
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  background: rgba(40, 30, 20, 0.62);
  border: 1px solid rgba(255, 230, 190, 0.28);
  border-radius: 8px;
  padding: 5px 10px;
  pointer-events: none;
  color: #fef7e7;
  position: absolute;
}

/* Coin counter — top-left */
.dada-coins {
  top: 12px;
  left: 14px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  display: none;
  transition: transform 0.1s ease;
}
.dada-coins.pulse {
  transform: scale(1.14);
}

/* Objective indicator — top-right */
.dada-objective {
  top: 12px;
  right: 14px;
  font-size: 13px;
  letter-spacing: 0.02em;
  display: none;
  white-space: nowrap;
}

/* Buff bar — bottom-left */
.dada-buff {
  bottom: 14px;
  left: 14px;
  font-size: 12px;
  display: none;
  min-width: 110px;
}
.dada-buff-label {
  font-size: 11px;
  opacity: 0.78;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dada-buff-cue {
  display: none;
  font-size: 10px;
  color: #fef7e7;
  background: rgba(58, 92, 220, 0.65);
  border: 1px solid rgba(224, 236, 255, 0.6);
  border-radius: 999px;
  padding: 1px 6px;
  letter-spacing: 0.02em;
}
.dada-buff-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 2px;
}
.dada-buff-fill {
  height: 100%;
  background: linear-gradient(90deg, #f5c842, #f0983a);
  border-radius: 3px;
  transition: width 0.12s linear;
}

/* Control hints — bottom-center */
.dada-ctrl-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  font-size: 12px;
  color: rgba(254, 247, 231, 0.80);
  background: rgba(30, 22, 14, 0.56);
  border: 1px solid rgba(255, 220, 170, 0.20);
  border-radius: 6px;
  padding: 4px 14px;
  pointer-events: none;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.7s ease;
  display: none;
}
.dada-ctrl-hint span {
  color: #f5c842;
  font-family: monospace;
  font-weight: 700;
  font-size: 11px;
}
.dada-ctrl-hint.fading {
  opacity: 0;
}
.dada-toast-wrap {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  z-index: 5;
}
.dada-toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 160px;
  max-width: 260px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
  color: #fff;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  letter-spacing: 0.03em;
  font-size: 13px;
  font-weight: 700;
  opacity: 0;
  transform: translateY(-5px);
}
.dada-toast.visible {
  opacity: 1;
  transform: translateY(0);
}
.dada-toast.small {
  min-width: 124px;
  font-size: 12px;
  padding: 7px 10px;
}
.dada-toast-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex: none;
}
/* Onesie boost card — centered pop-up overlay */
.dada-boost-card {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) scale(0.4);
  background: linear-gradient(145deg, #2b6dff, #1a4fcc);
  color: #fff;
  border-radius: 22px;
  padding: 22px 44px 18px;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 14px 52px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.22);
  opacity: 0;
  z-index: 2100;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
}
@keyframes boostCardIn {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
  65%  { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
}
@keyframes boostCardOut {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(1.0); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.78); }
}
.dada-boost-card.bc-in {
  animation: boostCardIn 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.dada-boost-card.bc-out {
  animation: boostCardOut 0.22s ease-in forwards;
}
.dada-boost-card-icon {
  width: 56px; height: 56px;
  object-fit: contain;
  display: block;
  margin: 0 auto 10px;
}
.dada-boost-card-title {
  font-size: clamp(22px, 5vw, 40px);
  font-weight: 900;
  letter-spacing: 0.07em;
  margin: 0 0 6px;
  text-shadow: 0 2px 0 rgba(0,0,0,0.22);
}
.dada-boost-card-sub {
  font-size: clamp(13px, 2.2vw, 18px);
  opacity: 0.88;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0;
}
`;

export function createUI(uiRoot, options = {}) {
  const { disableToasts = false } = options;
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // Keep UI above canvas and allow overlays/buttons to manage pointer events.
  uiRoot.style.zIndex = '1000';
  uiRoot.style.pointerEvents = 'none';

  // Title overlay
  const titleEl = document.createElement('div');
  titleEl.className = 'dada-overlay dada-title-bg';
  titleEl.innerHTML = `
    <div class="dada-card">
      <div class="dada-h1">DA DA QUEST</div>
      <div class="dada-sub">A baby's epic journey</div>
      <div class="dada-controls">
        <span>A/D</span> or <span>\u2190 \u2192</span> Move &nbsp;\u00b7&nbsp;
        <span>Space</span> Jump &nbsp;\u00b7&nbsp;
        <span>M</span> Mute
      </div>
      <div class="dada-hint">Press SPACE or ENTER to start</div>
    </div>
  `;
  uiRoot.appendChild(titleEl);

  // End overlay
  const endEl = document.createElement('div');
  endEl.className = 'dada-overlay dada-end-bg hidden';
  endEl.innerHTML = `
    <div class="dada-card">
      <div class="dada-h1">DA DA!</div>
      <div class="dada-end-msg">You found Da Da!</div>
      <div class="dada-sub">Great job, baby.</div>
      <button class="dada-btn" id="playAgainBtn">Play Again</button>
    </div>
  `;
  uiRoot.appendChild(endEl);

  const popEl = document.createElement('div');
  popEl.className = 'dada-pop';
  popEl.textContent = 'Da Da!';
  uiRoot.appendChild(popEl);

  const statusEl = document.createElement('div');
  statusEl.className = 'dada-status';
  uiRoot.appendChild(statusEl);

  const fadeEl = document.createElement('div');
  fadeEl.className = 'dada-fade';
  uiRoot.appendChild(fadeEl);

  // ── Gameplay HUD ────────────────────────────────────────────────

  const coinsEl = document.createElement('div');
  coinsEl.className = 'dada-hud-pill dada-coins';
  coinsEl.textContent = '✦ 0 / 0';
  uiRoot.appendChild(coinsEl);

  const objectiveEl = document.createElement('div');
  objectiveEl.className = 'dada-hud-pill dada-objective';
  objectiveEl.textContent = 'Find DaDa →';
  uiRoot.appendChild(objectiveEl);

  const buffEl = document.createElement('div');
  buffEl.className = 'dada-hud-pill dada-buff';
  buffEl.innerHTML = `
    <div class="dada-buff-label">Onesie boost <span class="dada-buff-cue">x2 jump</span></div>
    <div class="dada-buff-track"><div class="dada-buff-fill" style="width:100%"></div></div>
  `;
  uiRoot.appendChild(buffEl);
  const buffFill = buffEl.querySelector('.dada-buff-fill');
  const buffCue = buffEl.querySelector('.dada-buff-cue');

  const ctrlHintEl = document.createElement('div');
  ctrlHintEl.className = 'dada-ctrl-hint';
  ctrlHintEl.innerHTML = `<span>A</span>/<span>D</span> Move &nbsp; <span>Space</span> Jump &nbsp; <span>Shift</span> Sprint`;
  uiRoot.appendChild(ctrlHintEl);

  const toastWrap = document.createElement('div');
  toastWrap.className = 'dada-toast-wrap';
  uiRoot.appendChild(toastWrap);

  const boostCardEl = document.createElement('div');
  boostCardEl.className = 'dada-boost-card';
  boostCardEl.innerHTML = `
    <img class="dada-boost-card-icon" src="assets/ui/cheeseburger.svg" alt="">
    <div class="dada-boost-card-title">ONESIE BOOST!</div>
    <div class="dada-boost-card-sub">Double jump unlocked ✦</div>
  `;
  document.body.appendChild(boostCardEl);

  let boostCardTimer1 = null, boostCardTimer2 = null;

  const canvasEl = document.getElementById('renderCanvas');

  function setCanvasInputEnabled(enabled) {
    if (!canvasEl) return;
    canvasEl.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  setCanvasInputEnabled(true);

  let playAgainHandler = null;
  const playAgainBtn = endEl.querySelector('#playAgainBtn');

  function triggerPlayAgain() {
    if (typeof playAgainHandler === 'function') {
      playAgainHandler();
      return;
    }
    location.reload();
  }

  playAgainBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    triggerPlayAgain();
  });

  document.addEventListener('keydown', (ev) => {
    if (endEl.classList.contains('hidden')) return;
    if (ev.code !== 'Enter' && ev.code !== 'Space') return;
    ev.preventDefault();
    triggerPlayAgain();
  });

  let titleVisible = true;
  let popTimer = null;
  let statusTimer = null;
  let ctrlHintTimer = null;
  let ctrlHintFaded = false;
  let coinTotal = 0;

  // Coin pulse animation
  let pulseCancelTimer = null;
  const toastTimers = new Map();
  function pulseCoin() {
    coinsEl.classList.add('pulse');
    if (pulseCancelTimer) clearTimeout(pulseCancelTimer);
    pulseCancelTimer = setTimeout(() => coinsEl.classList.remove('pulse'), 130);
  }

  function clearToast(id) {
    if (toastTimers.has(id)) {
      clearTimeout(toastTimers.get(id));
      toastTimers.delete(id);
    }
    const existing = toastWrap.querySelector(`[data-toast-id="${id}"]`);
    if (existing) existing.remove();
  }

  function showToast({
    id,
    title,
    iconSrc = '',
    bgColor = '#2B6DFF',
    durationMs = 1200,
    enterMs = 120,
    exitMs = 180,
    small = false,
  }) {
    if (disableToasts || !id) return;
    clearToast(id);
    const el = document.createElement('div');
    el.className = `dada-toast${small ? ' small' : ''}`;
    el.dataset.toastId = id;
    el.style.background = bgColor;
    el.style.transition = `opacity ${enterMs}ms ease, transform ${enterMs}ms ease`;
    if (iconSrc) {
      const icon = document.createElement('img');
      icon.className = 'dada-toast-icon';
      icon.src = iconSrc;
      icon.alt = '';
      el.appendChild(icon);
    }
    const text = document.createElement('span');
    text.textContent = title;
    el.appendChild(text);
    toastWrap.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('visible');
    });

    const hideAt = Math.max(0, durationMs - exitMs);
    const hideTimer = setTimeout(() => {
      el.style.transition = `opacity ${exitMs}ms ease, transform ${exitMs}ms ease`;
      el.classList.remove('visible');
      const removeTimer = setTimeout(() => {
        clearToast(id);
      }, exitMs + 16);
      toastTimers.set(id, removeTimer);
    }, hideAt);
    toastTimers.set(id, hideTimer);
  }

  return {
    showTitle() {
      if (!titleVisible) {
        titleEl.classList.remove('hidden');
        titleVisible = true;
      }
    },
    hideTitle() {
      if (titleVisible) {
        titleEl.classList.add('hidden');
        titleVisible = false;
      }
    },
    showEnd() {
      endEl.classList.remove('hidden');
      setCanvasInputEnabled(false);
    },
    hideEnd() {
      endEl.classList.add('hidden');
      setCanvasInputEnabled(true);
    },
    isEndVisible() {
      return !endEl.classList.contains('hidden');
    },
    setPlayAgainHandler(handler) {
      playAgainHandler = handler;
    },
    showPopText(text, durationMs = 760) {
      if (popTimer) clearTimeout(popTimer);
      popEl.textContent = text;
      popEl.classList.add('visible');
      popTimer = setTimeout(() => {
        popEl.classList.remove('visible');
      }, durationMs);
    },
    showStatus(text, durationMs = 1600) {
      if (statusTimer) clearTimeout(statusTimer);
      statusEl.textContent = text;
      statusEl.classList.add('visible');
      statusTimer = setTimeout(() => {
        statusEl.classList.remove('visible');
      }, durationMs);
    },
    setFade(alpha) {
      fadeEl.style.opacity = String(Math.max(0, Math.min(1, alpha)));
    },

    // ── Gameplay HUD methods ─────────────────────────────────────

    /** Show gameplay HUD elements (coin counter, objective, control hints). */
    showGameplayHud(total) {
      coinTotal = total;
      coinsEl.textContent = `🍼 0 / ${total}`;
      coinsEl.style.display = 'block';
      objectiveEl.style.display = 'block';
      // Show control hints; auto-fade after 5 s
      if (!ctrlHintFaded) {
        ctrlHintEl.style.display = 'block';
        if (ctrlHintTimer) clearTimeout(ctrlHintTimer);
        ctrlHintTimer = setTimeout(() => this.fadeControlHints(), 5000);
      }
    },

    /** Hide gameplay HUD (on title screen, end screen). */
    hideGameplayHud() {
      coinsEl.style.display = 'none';
      objectiveEl.style.display = 'none';
      buffEl.style.display = 'none';
      ctrlHintEl.style.display = 'none';
    },

    /** Update coin counter; provide collected count. */
    updateCoins(collected) {
      coinsEl.textContent = `🍼 ${collected} / ${coinTotal}`;
      pulseCoin();
    },

    /** Update objective arrow direction. playerX < goalX → '→', else '←'. */
    updateObjectiveDir(playerX, goalX) {
      const arrow = playerX < goalX ? '→' : '←';
      objectiveEl.textContent = `Find DaDa ${arrow}`;
    },

    /** Hide the objective indicator (goal reached). */
    hideObjective() {
      objectiveEl.style.display = 'none';
    },

    /** Fade and remove control hints (called on first jump or after timer). */
    fadeControlHints() {
      if (ctrlHintFaded) return;
      ctrlHintFaded = true;
      if (ctrlHintTimer) clearTimeout(ctrlHintTimer);
      ctrlHintEl.classList.add('fading');
      setTimeout(() => { ctrlHintEl.style.display = 'none'; }, 720);
    },

    /** Reset control hints for a new game. */
    resetControlHints() {
      ctrlHintFaded = false;
      ctrlHintEl.classList.remove('fading');
      ctrlHintEl.style.display = 'none';
    },

    /** Update onesie buff bar. remainingMs=0 → hide. */
    updateBuff(remainingMs, totalMs) {
      if (remainingMs <= 0) {
        buffEl.style.display = 'none';
        buffCue.style.display = 'none';
        return;
      }
      buffEl.style.display = 'block';
      const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
      buffFill.style.width = `${pct}%`;
    },
    updateDoubleJumpCue(available) {
      buffCue.style.display = available ? 'inline-block' : 'none';
    },

    /** Reset all gameplay HUD to initial state for restart. */
    resetGameplayHud() {
      this.hideGameplayHud();
      this.resetControlHints();
    },
    showToast,
    showOnesieBoostToast() {
      showToast({
        id: 'onesie-boost',
        title: 'ONESIE BOOST',
        iconSrc: 'assets/ui/cheeseburger.svg',
        bgColor: '#2B6DFF',
        durationMs: 3200,
        enterMs: 120,
        exitMs: 180,
      });
    },
    showOnesieBoostCard() {
      if (disableToasts) return;
      // Clear any in-flight card animation.
      if (boostCardTimer1) { clearTimeout(boostCardTimer1); boostCardTimer1 = null; }
      if (boostCardTimer2) { clearTimeout(boostCardTimer2); boostCardTimer2 = null; }
      // Force reflow so animation restarts cleanly.
      boostCardEl.classList.remove('bc-in', 'bc-out');
      void boostCardEl.offsetWidth; // reflow
      boostCardEl.classList.add('bc-in');
      // After hold time, exit animation.
      boostCardTimer1 = setTimeout(() => {
        boostCardEl.classList.replace('bc-in', 'bc-out');
        boostCardTimer2 = setTimeout(() => {
          boostCardEl.classList.remove('bc-out');
        }, 240);
      }, 2900);
    },
    showSlipperyToast() {
      showToast({
        id: 'slippery',
        title: 'SLIPPERY!',
        bgColor: '#E7B431',
        durationMs: 800,
        enterMs: 90,
        exitMs: 140,
        small: true,
      });
    },
  };
}
