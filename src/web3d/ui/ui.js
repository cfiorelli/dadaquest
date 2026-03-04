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
  top: 12px;
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  font-size: 15px;
  color: #fef7e7;
  background: rgba(62, 48, 34, 0.68);
  border: 1px solid rgba(255, 235, 202, 0.36);
  border-radius: 8px;
  padding: 6px 10px;
  opacity: 0;
  transform: translateY(-6px);
  transition: opacity 0.2s ease, transform 0.2s ease;
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
  pointer-events: none;
  transition: opacity 0.18s linear;
}
`;

export function createUI(uiRoot) {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

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

  endEl.querySelector('#playAgainBtn').addEventListener('click', () => {
    location.reload();
  });

  let titleVisible = true;
  let popTimer = null;
  let statusTimer = null;

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
    },
    isEndVisible() {
      return !endEl.classList.contains('hidden');
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
  };
}
