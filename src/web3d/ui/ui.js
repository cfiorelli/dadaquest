const CSS = `
.dada-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  font-family: 'Georgia', serif;
  color: #fff;
  transition: opacity 0.4s ease;
  pointer-events: auto;
}
.dada-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}
.dada-title-bg {
  background: radial-gradient(ellipse at center, rgba(26,26,46,0.8) 0%, rgba(0,0,0,0.6) 100%);
}
.dada-end-bg {
  background: radial-gradient(ellipse at center, rgba(40,100,60,0.85) 0%, rgba(0,0,0,0.7) 100%);
}
.dada-h1 {
  font-size: clamp(36px, 6vw, 64px);
  color: #ffd93d;
  text-shadow: 3px 3px 0 #aa6600, 0 0 20px rgba(255,200,0,0.3);
  margin-bottom: 12px;
  letter-spacing: 2px;
}
.dada-sub {
  font-size: clamp(16px, 2.5vw, 24px);
  color: #e0e0e0;
  margin: 8px 0;
}
.dada-hint {
  font-size: clamp(12px, 1.8vw, 16px);
  color: #aaffaa;
  margin-top: 32px;
  animation: dadaPulse 1.4s ease-in-out infinite;
}
@keyframes dadaPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.dada-controls {
  font-size: clamp(11px, 1.5vw, 14px);
  color: #bbb;
  margin-top: 20px;
  line-height: 1.6;
}
.dada-controls span {
  color: #ffd93d;
  font-family: monospace;
}
.dada-btn {
  margin-top: 24px;
  padding: 14px 32px;
  font-size: 18px;
  font-family: 'Georgia', serif;
  background: linear-gradient(135deg, #4a9eff, #2970c0);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}
.dada-btn:hover {
  background: linear-gradient(135deg, #5ab0ff, #3580d0);
  transform: scale(1.05);
}
.dada-end-msg {
  font-size: clamp(18px, 3vw, 28px);
  color: #ffffff;
  margin: 8px 0;
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
  font-family: 'Georgia', serif;
  font-size: 15px;
  color: #fff;
  background: rgba(20, 30, 20, 0.52);
  border: 1px solid rgba(255,255,255,0.25);
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
    <div class="dada-h1">DA DA QUEST</div>
    <div class="dada-sub">A baby's epic journey</div>
    <div class="dada-controls">
      <span>A/D</span> or <span>\u2190 \u2192</span> Move &nbsp;\u00b7&nbsp;
      <span>Space</span> Jump &nbsp;\u00b7&nbsp;
      <span>M</span> Mute
    </div>
    <div class="dada-hint">Press SPACE or ENTER to start</div>
  `;
  uiRoot.appendChild(titleEl);

  // End overlay
  const endEl = document.createElement('div');
  endEl.className = 'dada-overlay dada-end-bg hidden';
  endEl.innerHTML = `
    <div class="dada-h1">DA DA!</div>
    <div class="dada-end-msg">You found Da Da!</div>
    <div class="dada-sub">Great job, baby.</div>
    <button class="dada-btn" id="playAgainBtn">Play Again</button>
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
