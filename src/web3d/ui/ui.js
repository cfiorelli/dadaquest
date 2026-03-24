import {
  LEVEL_ORDER,
  getLevelConstructionLabel as getMetaLevelConstructionLabel,
  getLevelConstructionMessage as getMetaLevelConstructionMessage,
  getLevelDescriptor as getMetaLevelDescriptor,
  getLevelMechanic as getMetaLevelMechanic,
  getLevelRuntimeFamily as getMetaLevelRuntimeFamily,
  getLevelSubtitle as getMetaLevelSubtitle,
  getLevelTheme as getMetaLevelTheme,
  getLevelTitle as getMetaLevelTitle,
  isLevelLaunchable as getMetaIsLevelLaunchable,
  isLevelUnderConstruction as getMetaIsLevelUnderConstruction,
} from '../world/levelMeta.js';

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
.dada-menu-bg {
  background: radial-gradient(ellipse at center, rgba(48,58,52,0.56) 0%, rgba(20,18,16,0.64) 100%);
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
    0 24px 70px rgba(38, 24, 12, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(130, 102, 72, 0.22);
  backdrop-filter: blur(6px);
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
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
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
.dada-device-note {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #6a5642;
  letter-spacing: 0.02em;
}
.dada-loading-wrap {
  margin-top: 16px;
  display: none;
}
.dada-loading-wrap.visible {
  display: block;
}
.dada-loading-text {
  font-size: clamp(12px, 1.8vw, 15px);
  color: #4f3c2c;
  margin-bottom: 8px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.dada-loading-bar {
  width: min(320px, 72vw);
  height: 8px;
  margin: 0 auto;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(90, 68, 46, 0.14);
  border: 1px solid rgba(120, 88, 56, 0.18);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.24);
}
.dada-loading-fill {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #d86848, #e7b957);
  transition: width 0.12s ease;
}
.dada-level-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 18px;
}
.dada-level-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}
.dada-level-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 4px;
  min-height: 86px;
  padding: 10px 12px;
  font-size: clamp(12px, 1.8vw, 15px);
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  background: rgba(90,68,46,0.10);
  border: 1.5px solid rgba(120,88,56,0.35);
  border-radius: 8px;
  color: #5d4a36;
  cursor: pointer;
  font-weight: 600;
  letter-spacing: 0.04em;
  pointer-events: auto;
  transition: background 0.15s, transform 0.12s;
  text-decoration: none;
  text-align: left;
}
.dada-level-btn:hover {
  background: rgba(90,68,46,0.20);
  transform: scale(1.04);
}
.dada-level-btn.active {
  background: linear-gradient(135deg, #ce5739, #ad3d28);
  border-color: rgba(125,64,40,0.5);
  color: #fff;
}
.dada-level-btn.locked {
  background: rgba(72, 62, 52, 0.08);
  border-color: rgba(98, 84, 70, 0.20);
  color: rgba(93, 74, 54, 0.55);
  cursor: not-allowed;
}
.dada-level-btn.locked:hover {
  background: rgba(72, 62, 52, 0.08);
  transform: none;
}
.dada-level-btn-band {
  position: absolute;
  left: -22%;
  top: 50%;
  width: 150%;
  height: 24px;
  display: none;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, rgba(151, 15, 20, 0.94), rgba(217, 40, 46, 0.98), rgba(151, 15, 20, 0.94));
  border-top: 1px solid rgba(255, 216, 216, 0.55);
  border-bottom: 1px solid rgba(63, 0, 0, 0.48);
  box-shadow: 0 8px 16px rgba(76, 8, 10, 0.28);
  color: #fff4f4;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.18em;
  line-height: 1;
  pointer-events: none;
  text-transform: uppercase;
  transform: translateY(-50%) rotate(-17deg);
  text-shadow: 0 1px 0 rgba(70, 8, 10, 0.42);
  z-index: 2;
}
.dada-level-btn.under-construction .dada-level-btn-band {
  display: flex;
}
.dada-level-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8a6447;
}
.dada-level-title {
  font-size: 16px;
  line-height: 1.1;
  letter-spacing: 0.02em;
  color: #4f3c2c;
  font-weight: 800;
}
.dada-level-copy {
  font-size: 12px;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: #6a5642;
}
.dada-level-btn.active .dada-level-kicker,
.dada-level-btn.active .dada-level-title,
.dada-level-btn.active .dada-level-copy {
  color: #fff;
}
.dada-level-btn.locked .dada-level-kicker,
.dada-level-btn.locked .dada-level-title,
.dada-level-btn.locked .dada-level-copy {
  color: rgba(93, 74, 54, 0.6);
}
.dada-level-preview {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.34), rgba(111,88,64,0.08));
  border: 1px solid rgba(120, 88, 56, 0.2);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.38);
  text-align: left;
}
.dada-level-preview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.dada-level-preview-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #8a6447;
}
.dada-level-preview-state {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #245532;
}
.dada-level-preview-state.locked {
  color: #7a5a26;
}
.dada-level-preview-state.construction {
  color: #9c1d1d;
}
.dada-level-preview-title {
  margin-top: 6px;
  font-size: clamp(18px, 2.6vw, 26px);
  font-weight: 800;
  color: #3d2d20;
  letter-spacing: 0.01em;
}
.dada-level-preview-theme,
.dada-level-preview-mechanic {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #5c4734;
}
.dada-level-preview-mechanic span {
  display: inline-block;
  min-width: 92px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
  color: #8a6447;
}
.dada-level-lock {
  display: block;
  margin-top: 10px;
  min-height: 1.2em;
  font-size: 12px;
  font-weight: 700;
  color: #6a5642;
  letter-spacing: 0.02em;
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
.dada-btn-secondary {
  background: linear-gradient(135deg, #6f7d7b, #4f5d5b);
  border-color: rgba(56, 74, 72, 0.34);
}
.dada-btn-secondary:hover {
  background: linear-gradient(135deg, #7b8987, #586664);
}
.dada-btn-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.dada-menu-actions {
  margin-top: 18px;
}
.dada-menu-legend {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 8px 14px;
  text-align: left;
  font-size: 12px;
  color: #5d4a36;
}
.dada-menu-legend span {
  color: #b24733;
  font-family: monospace;
  font-weight: 700;
}
.dada-era5-weapon-help {
  margin-top: 6px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(214, 239, 255, 0.78);
  text-transform: uppercase;
}
.dada-era5-reticle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  border: 2px solid rgba(160, 244, 255, 0.8);
  box-shadow: 0 0 14px rgba(102, 214, 255, 0.45);
  background: rgba(12, 30, 48, 0.4);
  pointer-events: none;
  display: none;
  z-index: 1250;
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
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}
.dada-status.visible {
  opacity: 1;
  transform: translateY(0);
}
.dada-status.tone-enemy {
  color: #fff0fa;
  background: rgba(92, 34, 72, 0.80);
  border-color: rgba(255, 164, 220, 0.52);
  box-shadow: 0 10px 22px rgba(92, 34, 72, 0.28);
}
.dada-status.tone-hazard {
  color: #fff7e6;
  background: rgba(90, 56, 18, 0.82);
  border-color: rgba(255, 210, 136, 0.52);
  box-shadow: 0 10px 22px rgba(90, 56, 18, 0.26);
}
.dada-status.tone-water {
  color: #eefaff;
  background: rgba(24, 66, 102, 0.84);
  border-color: rgba(138, 224, 255, 0.52);
  box-shadow: 0 10px 22px rgba(24, 66, 102, 0.30);
}
.dada-status.tone-system {
  color: #f2fbff;
  background: rgba(34, 54, 78, 0.78);
  border-color: rgba(152, 214, 248, 0.42);
  box-shadow: 0 10px 22px rgba(18, 26, 34, 0.24);
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
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(4px);
}

/* Coin counter — top-left */
.dada-coins {
  top: 12px;
  left: 248px;
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

/* Buff column — left side */
.dada-buff {
  top: 16px;
  left: 16px;
  font-size: 14px;
  display: none;
  width: 220px;
  max-width: min(220px, calc(100vw - 32px));
  padding: 0;
  background: none;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}
.dada-buff-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dada-buff-card {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 10px;
  align-items: center;
  min-width: 200px;
  padding: 11px 12px;
  background: rgba(20, 18, 20, 0.76);
  border: 1px solid rgba(255, 230, 190, 0.24);
  border-radius: 12px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.26);
  opacity: 0.96;
  backdrop-filter: blur(5px);
}
.dada-buff-card.active {
  opacity: 1;
  border-color: rgba(255, 244, 196, 0.46);
}
.dada-buff-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgba(255, 250, 238, 0.92);
  background: rgba(92, 82, 74, 0.65);
  border: 1px solid rgba(255, 230, 190, 0.16);
}
.dada-buff-card.active .dada-buff-icon.onesie {
  background: linear-gradient(135deg, #406cf3, #2455d6);
}
.dada-buff-card.active .dada-buff-icon.cape {
  background: linear-gradient(135deg, #d86848, #a73cd6);
}
.dada-buff-card.active .dada-buff-icon.shield {
  background: linear-gradient(135deg, #4cd4ff, #2b79d7);
}
.dada-buff-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dada-buff-label {
  font-size: 13px;
  opacity: 0.96;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dada-buff-state {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgba(255, 250, 238, 1.0);
}
.dada-buff-note {
  font-size: 11px;
  line-height: 1.3;
  color: rgba(247, 239, 224, 0.84);
}
.dada-buff-track {
  height: 10px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 5px;
  overflow: hidden;
}
.dada-buff-fill {
  height: 100%;
  background: linear-gradient(90deg, #f5c842, #f0983a);
  border-radius: 5px;
  transition: width 0.12s linear;
}
.dada-buff-fill.cape {
  background: linear-gradient(90deg, #8c73ff, #45d4c8);
}
.dada-buff-fill.shield {
  background: linear-gradient(90deg, #8beaff, #4d8eff);
}
.dada-buff-fill.recharging {
  background: linear-gradient(90deg, #54a0ff, #5f27cd);
}
.dada-buff-cue {
  display: none;
  font-size: 12px;
  color: #fef7e7;
  background: rgba(58, 92, 220, 0.65);
  border: 1px solid rgba(224, 236, 255, 0.6);
  border-radius: 999px;
  padding: 2px 8px;
  letter-spacing: 0.02em;
}
.dada-ability-pill {
  left: 16px;
  top: 194px;
  display: none;
  min-width: 188px;
  padding: 9px 11px;
  background: rgba(20, 18, 20, 0.76);
}
.dada-ability-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
@media (max-width: 860px) {
  .dada-level-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dada-coins {
    left: 16px;
    top: 154px;
  }
  .dada-buff {
    width: min(220px, calc(100vw - 32px));
  }
  .dada-ability-pill {
    top: 332px;
  }
}
.dada-ability-state {
  font-size: 11px;
  opacity: 0.82;
}
.dada-ability-track {
  margin-top: 6px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.16);
}
.dada-ability-fill {
  width: 0%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f1d276, #f08d3c);
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
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
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
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
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
  backdrop-filter: blur(5px);
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
.dada-banner {
  position: absolute;
  left: 50%;
  top: 24%;
  transform: translate(-50%, -50%) scale(0.88);
  min-width: min(90vw, 860px);
  max-width: 92vw;
  padding: 18px 26px;
  border-radius: 16px;
  border: 2px solid rgba(255, 223, 154, 0.55);
  background: linear-gradient(135deg, rgba(198, 58, 30, 0.96), rgba(244, 156, 52, 0.92));
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.32), 0 0 32px rgba(255, 190, 80, 0.35);
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.2s ease;
  z-index: 8;
}
.dada-banner.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
.dada-banner-title {
  font-size: clamp(30px, 4.8vw, 62px);
  font-weight: 900;
  letter-spacing: 0.09em;
  color: #fff6e2;
  text-shadow: 0 3px 0 rgba(81, 26, 14, 0.42), 0 0 22px rgba(255, 230, 156, 0.35);
}
.dada-banner-sub {
  margin-top: 6px;
  font-size: clamp(14px, 2vw, 20px);
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(255, 244, 226, 0.92);
}
/* Onesie boost card — centered pop-up overlay */
.dada-boost-card {
  position: fixed;
  top: 16px; left: 50%;
  transform: translateX(-50%) scale(0.4);
  background: linear-gradient(145deg, #2b6dff, #1a4fcc);
  color: #fff;
  border-radius: 22px;
  padding: 22px 44px 18px;
  text-align: center;
  pointer-events: none;
  box-shadow: 0 14px 52px rgba(0,0,0,0.44), 0 28px 72px rgba(14, 48, 126, 0.18), inset 0 1px 0 rgba(255,255,255,0.22);
  opacity: 0;
  z-index: 2100;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
}
@keyframes boostCardIn {
  0%   { opacity: 0; transform: translateX(-50%) scale(0.4); }
  65%  { opacity: 1; transform: translateX(-50%) scale(1.06); }
  100% { opacity: 1; transform: translateX(-50%) scale(1.0); }
}
@keyframes boostCardOut {
  0%   { opacity: 1; transform: translateX(-50%) scale(1.0); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.78); }
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
.dada-era5-hud {
  position: absolute;
  top: 18px;
  right: 18px;
  width: min(320px, calc(100vw - 36px));
  display: none;
  z-index: 7;
}
.dada-era5-compass {
  position: absolute;
  bottom: 18px;
  left: 18px;
  z-index: 7;
  border-radius: 50%;
  pointer-events: none;
}
.dada-era5-panel {
  border-radius: 18px;
  border: 1px solid rgba(134, 233, 255, 0.24);
  background:
    linear-gradient(160deg, rgba(7, 23, 40, 0.88), rgba(4, 13, 26, 0.84));
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(188, 245, 255, 0.08);
  color: #ddfaff;
  padding: 14px 16px 12px;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  backdrop-filter: blur(8px);
}
.dada-era5-row {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.dada-era5-row + .dada-era5-row {
  margin-top: 12px;
}
.dada-era5-block {
  flex: 1 1 auto;
  min-width: 0;
}
.dada-era5-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(200, 244, 255, 0.72);
  margin-bottom: 5px;
}
.dada-era5-hearts,
.dada-era5-shields {
  display: flex;
  gap: 6px;
}
.dada-era5-hearts .locked {
  opacity: 0.2;
}
.dada-era5-heart,
.dada-era5-shield {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(190, 245, 255, 0.18);
}
.dada-era5-heart.filled {
  color: #ff8fa6;
  box-shadow: 0 0 18px rgba(255, 95, 140, 0.18);
}
.dada-era5-heart.empty,
.dada-era5-shield.empty {
  color: rgba(207, 236, 244, 0.38);
}
.dada-era5-shield.filled {
  color: #86f4ff;
  box-shadow: 0 0 18px rgba(104, 233, 255, 0.18);
}
.dada-era5-oxygen,
.dada-era5-weapon-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(188, 245, 255, 0.16);
}
.dada-era5-oxygen-fill,
.dada-era5-weapon-fill {
  height: 100%;
  width: 0%;
  transition: width 0.12s ease;
}
.dada-era5-oxygen-fill {
  background: linear-gradient(90deg, #69d3ff, #86fff2);
}
.dada-era5-weapon-fill {
  background: linear-gradient(90deg, #a26eff, #ff95df);
}
.dada-era5-meter-copy,
.dada-era5-weapon-copy {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 5px;
  font-size: 12px;
  color: rgba(227, 247, 255, 0.88);
}
.dada-era5-hint {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(204, 248, 255, 0.84);
  text-align: right;
}
.dada-era5-weapon-strip {
  display: flex;
  gap: 5px;
  margin-top: 6px;
}
.dada-era5-weapon-pip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 36px;
  padding: 3px 2px;
  border-radius: 4px;
  border: 1px solid rgba(120, 200, 255, 0.22);
  background: rgba(0, 30, 60, 0.45);
  font-size: 10px;
  color: rgba(180, 220, 255, 0.7);
  transition: border-color 0.1s, background 0.1s;
  opacity: 0.55;
}
.dada-era5-weapon-pip.active {
  border-color: rgba(120, 220, 255, 0.85);
  background: rgba(0, 70, 120, 0.65);
  color: #c8f0ff;
  opacity: 1;
}
.dada-era5-weapon-pip.empty {
  opacity: 0.2;
}
.dada-era5-weapon-pip-num {
  font-size: 9px;
  opacity: 0.7;
  margin-bottom: 1px;
}
.dada-era5-weapon-pip-name {
  font-size: 9px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 34px;
}
.dada-era5-inventory {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 1300;
}
.dada-era5-inventory.open {
  display: flex;
}
.dada-era5-sheet {
  margin: auto;
  width: min(1100px, 94vw);
  max-height: min(86vh, 900px);
  overflow: auto;
  border-radius: 24px;
  border: 1px solid rgba(138, 233, 255, 0.28);
  background:
    linear-gradient(155deg, rgba(6, 18, 34, 0.96), rgba(3, 10, 22, 0.94));
  color: #e7fbff;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.46), inset 0 1px 0 rgba(180, 245, 255, 0.09);
  padding: 24px;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
}
.dada-era5-sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}
.dada-era5-sheet-title {
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #8cf0ff;
}
.dada-era5-sheet-sub {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: rgba(212, 245, 255, 0.7);
}
.dada-era5-grid {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  gap: 18px;
}
.dada-era5-card {
  border-radius: 18px;
  border: 1px solid rgba(136, 233, 255, 0.18);
  background: rgba(12, 28, 44, 0.7);
  padding: 16px;
}
.dada-era5-section-title {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(197, 243, 255, 0.82);
  margin-bottom: 12px;
}
.dada-era5-slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.dada-era5-slot {
  border-radius: 14px;
  border: 1px solid rgba(122, 219, 246, 0.16);
  background: rgba(7, 18, 31, 0.88);
  padding: 10px;
}
.dada-era5-slot-name {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(172, 229, 242, 0.64);
}
.dada-era5-slot-item {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
}
.dada-era5-slot-empty {
  color: rgba(194, 235, 244, 0.44);
}
.dada-era5-slot-action,
.dada-era5-item-action,
.dada-era5-close {
  margin-top: 10px;
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #3db1e0, #1c7dbb);
  color: white;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
}
.dada-era5-close {
  margin-top: 0;
}
.dada-era5-item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}
.dada-era5-item {
  border-radius: 16px;
  border: 1px solid rgba(133, 229, 255, 0.16);
  background: rgba(8, 18, 32, 0.9);
  padding: 12px;
}
.dada-era5-item.rarity-starter {
  box-shadow: inset 0 0 0 1px rgba(141, 235, 255, 0.12);
}
.dada-era5-item-name {
  font-size: 15px;
  font-weight: 800;
  color: #f0fbff;
}
.dada-era5-item-desc {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(200, 238, 248, 0.72);
}
.dada-era5-item-badge {
  margin-left: 7px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(61, 177, 224, 0.22);
  border: 1px solid rgba(61, 177, 224, 0.38);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(160, 228, 248, 0.9);
  vertical-align: middle;
}
.dada-era5-item-group {
  margin-bottom: 18px;
}
.dada-era5-item-group:last-child {
  margin-bottom: 0;
}
.dada-era5-item-group-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(172, 229, 242, 0.52);
  margin-bottom: 8px;
}
.dada-era5-item-equipped {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #8cf0ff;
}
.dada-era5-teaser {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 1400;
}
.dada-era5-teaser.visible {
  display: flex;
}
.dada-era5-teaser-card {
  margin: auto;
  width: min(760px, 92vw);
  border-radius: 24px;
  border: 1px solid rgba(136, 233, 255, 0.34);
  background:
    radial-gradient(circle at top, rgba(24, 57, 96, 0.96), rgba(6, 18, 34, 0.94));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48), 0 0 42px rgba(95, 219, 255, 0.14);
  padding: 28px 24px 22px;
  text-align: center;
  color: #ebfbff;
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
}
.dada-era5-teaser-title {
  font-size: clamp(30px, 5vw, 60px);
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #97f2ff;
}
.dada-era5-teaser-sub {
  margin-top: 10px;
  font-size: 16px;
  letter-spacing: 0.08em;
  color: rgba(224, 247, 255, 0.82);
}
.dada-era5-icon-row {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.dada-era5-icon {
  border-radius: 16px;
  border: 1px solid rgba(145, 234, 255, 0.2);
  background: rgba(8, 24, 40, 0.78);
  padding: 16px 10px;
}
.dada-era5-icon-glyph {
  font-size: 20px;
  font-weight: 900;
  color: #97f2ff;
}
.dada-era5-icon-label {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.1em;
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
  uiRoot.style.pointerEvents = 'auto';

  // Detect current level from URL (mutable — updated when user clicks level buttons)
  const levelParam = new URLSearchParams(window.location.search).get('level');
  const requestedLevel = Number.parseInt(levelParam || '1', 10);
  let _selectedLevel = [1, 2, 3, 4, 5, 6, 7, 8, 9].includes(requestedLevel) ? requestedLevel : 1;
  let lockedLevels = {
    1: false,
    2: false,
    3: false,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
  };
  let underConstructionLevels = Object.fromEntries(
    LEVEL_ORDER.map((id) => [id, getMetaIsLevelUnderConstruction(id)]),
  );
  let blockedLevels = Object.fromEntries(
    LEVEL_ORDER.map((id) => [id, underConstructionLevels[id] && !getMetaIsLevelLaunchable(id)]),
  );
  let lockMessages = {
    4: 'Locked. Collect all binkies in Levels 1–3 to unlock Super Sourdough.',
    5: 'Locked. Beat Super Sourdough (Level 4) to unlock.',
    6: 'Locked. Beat Aquarium Drift (Level 5) to unlock.',
    7: 'Locked. Beat Pressure Works (Level 6) to unlock.',
    8: 'Locked. Beat Storm Cliffs (Level 7) to unlock.',
    9: 'Locked. Beat Haunted Library (Level 8) to unlock.',
  };
  let constructionMessages = Object.fromEntries(
    LEVEL_ORDER
      .map((id) => [id, getMetaLevelConstructionMessage(id)])
      .filter(([, message]) => !!message),
  );

  function getLevelSubtitle(id) {
    return getMetaLevelSubtitle(id);
  }

  function getLevelTitle(id) {
    return getMetaLevelTitle(id);
  }

  function getLevelDescriptor(id) {
    return getMetaLevelDescriptor(id);
  }

  function getLevelTheme(id) {
    return getMetaLevelTheme(id);
  }

  function getLevelMechanic(id) {
    return getMetaLevelMechanic(id);
  }

  function getLevelConstructionLabel(id) {
    return getMetaLevelConstructionLabel(id);
  }

  function getLevelCardMarkup(id, { menu = false } = {}) {
    const tag = menu ? 'a' : 'button';
    const href = menu ? ` href="${id === 1 ? window.location.pathname : `${window.location.pathname}?level=${id}`}"` : '';
    return `
      <${tag} class="dada-level-btn${_selectedLevel === id ? ' active' : ''}${underConstructionLevels[id] ? ' under-construction' : ''}" id="${menu ? `menuLevelBtn${id}` : `levelBtn${id}`}" tabindex="-1"${href}>
        <span class="dada-level-btn-band" aria-hidden="true">Under Construction</span>
        <span class="dada-level-kicker">Level ${id}</span>
        <span class="dada-level-title">${getLevelTitle(id)}</span>
        <span class="dada-level-copy">${getLevelDescriptor(id)}</span>
      </${tag}>
    `;
  }

  // Title overlay
  const titleEl = document.createElement('div');
  titleEl.className = 'dada-overlay dada-title-bg';
  titleEl.innerHTML = `
    <div class="dada-card">
      <div class="dada-h1">DA DA QUEST</div>
      <div class="dada-sub" id="titleSub"></div>
      <div class="dada-controls">
        <span>A/D</span> or <span>\u2190 \u2192</span> Move &nbsp;\u00b7&nbsp;
        <span>Space</span> Jump &nbsp;\u00b7&nbsp;
        <span>M</span> Mute
      </div>
      <div class="dada-device-note">Desktop only. Not built for phones.</div>
      <div class="dada-level-grid">
        ${LEVEL_ORDER.map((id) => getLevelCardMarkup(id)).join('')}
      </div>
      <div class="dada-level-preview">
        <div class="dada-level-preview-head">
          <div class="dada-level-preview-kicker" id="titlePreviewKicker"></div>
          <div class="dada-level-preview-state" id="titlePreviewState"></div>
        </div>
        <div class="dada-level-preview-title" id="titlePreviewTitle"></div>
        <div class="dada-level-preview-theme" id="titlePreviewTheme"></div>
        <div class="dada-level-preview-mechanic"><span>Key Mechanic</span><span id="titlePreviewMechanic"></span></div>
      </div>
      <div class="dada-level-lock" id="titleLevelLock"></div>
      <div class="dada-loading-wrap" id="titleLoadingWrap">
        <div class="dada-loading-text" id="titleLoadingText">Loading Level 1… 0%</div>
        <div class="dada-loading-bar"><div class="dada-loading-fill" id="titleLoadingFill"></div></div>
      </div>
      <div class="dada-hint" id="titleHint">Press SPACE or ENTER to start</div>
      <div id="titleDebug" style="font:10px/1.6 monospace;color:rgba(80,60,40,0.55);margin-top:8px;letter-spacing:0.03em;min-height:1.2em"></div>
    </div>
  `;
  uiRoot.appendChild(titleEl);

  let levelSelectHandler = null;
  let gameplayMenuHandler = null;
  let gameplayResumeHandler = null;
  const titleSubEl = titleEl.querySelector('#titleSub');
  const titleHintEl = titleEl.querySelector('#titleHint');
  const titleDebugEl = titleEl.querySelector('#titleDebug');
  const titleLoadingWrapEl = titleEl.querySelector('#titleLoadingWrap');
  const titleLoadingTextEl = titleEl.querySelector('#titleLoadingText');
  const titleLoadingFillEl = titleEl.querySelector('#titleLoadingFill');
  const titleLevelLockEl = titleEl.querySelector('#titleLevelLock');
  const titlePreviewKickerEl = titleEl.querySelector('#titlePreviewKicker');
  const titlePreviewStateEl = titleEl.querySelector('#titlePreviewState');
  const titlePreviewTitleEl = titleEl.querySelector('#titlePreviewTitle');
  const titlePreviewThemeEl = titleEl.querySelector('#titlePreviewTheme');
  const titlePreviewMechanicEl = titleEl.querySelector('#titlePreviewMechanic');
  const btn1 = titleEl.querySelector('#levelBtn1');
  const btn2 = titleEl.querySelector('#levelBtn2');
  const btn3 = titleEl.querySelector('#levelBtn3');
  const btn4 = titleEl.querySelector('#levelBtn4');
  const btn5 = titleEl.querySelector('#levelBtn5');
  const btn6 = titleEl.querySelector('#levelBtn6');
  const btn7 = titleEl.querySelector('#levelBtn7');
  const btn8 = titleEl.querySelector('#levelBtn8');
  const btn9 = titleEl.querySelector('#levelBtn9');
  let titleErrorVisible = false;
  let menuBtn1 = null;
  let menuBtn2 = null;
  let menuBtn3 = null;
  let menuBtn4 = null;
  let menuBtn5 = null;
  let menuBtn6 = null;
  let menuBtn7 = null;
  let menuBtn8 = null;
  let menuBtn9 = null;
  let menuSubEl = null;
  let menuLockEl = null;
  let menuLegendEl = null;
  let menuPreviewKickerEl = null;
  let menuPreviewStateEl = null;
  let menuPreviewTitleEl = null;
  let menuPreviewThemeEl = null;
  let menuPreviewMechanicEl = null;
  let gameplayRestartHandler = null;
  let resetBabyHandler = null;

  function getLevelLockMessage(id) {
    if (!lockedLevels[id]) return '';
    return lockMessages[id] || '';
  }

  function getLevelConstructionMessage(id) {
    if (!underConstructionLevels[id]) return '';
    return constructionMessages[id] || '';
  }

  function getLevelStatusMessage(id) {
    if (lockedLevels[id]) return getLevelLockMessage(id);
    if (underConstructionLevels[id]) return getLevelConstructionMessage(id);
    return '';
  }

  function isEra5UiLevel(levelId) {
    return getMetaLevelRuntimeFamily(levelId) === 'era5';
  }

  function getEra5WeaponHelp(levelId) {
    if (levelId === 9) return 'Fire Paper Fan: Click / F';
    if (levelId === 8) return 'Throw Boomerang: Click / F';
    if (levelId === 7) return 'Fire Sock Rocket: Click / F';
    if (levelId === 6) return 'Fire Foam Blaster: Click / F';
    return 'Fire Bubble Wand: Click / F';
  }

  function getEra5ToolHelp(levelId) {
    if (levelId === 9) return 'Camp Lantern safe glow: E';
    if (levelId === 8) return 'Lantern beam toggle / boost: E';
    if (levelId === 7) return 'Kite Rig glide: hold Jump in air';
    if (levelId === 6) return 'Conveyor Boots traction: passive';
    return 'Scuba Tank: Space ascend, C descend in deep pockets';
  }

  function getGameplayLegendMarkup(levelId) {
    if (isEra5UiLevel(levelId)) {
      return `
        <div><span>↑ / ↓</span> Move forward / back</div>
        <div><span>← / →</span> Turn left / right</div>
        <div><span>Alt + ← / →</span> Strafe left / right</div>
        <div><span>, / .</span> Strafe left / right</div>
        <div><span>W / S</span> Forward / back alias</div>
        <div><span>A / D</span> Strafe alias</div>
        <div><span>Space</span> Jump / ascend in float</div>
        <div><span>C</span> Descend in float</div>
        <div><span>Shift</span> Run</div>
        <div>${getEra5WeaponHelp(levelId)}</div>
        <div>${getEra5ToolHelp(levelId)}</div>
        <div><span>[</span> / <span>]</span> Camera yaw</div>
        <div><span>\\</span> Recenter camera</div>
        <div><span>I</span> Inventory</div>
        <div><span>R</span> Reset checkpoint</div>
        <div><span>G</span> Glide (when unlocked)</div>
        <div><span>M</span> Mute</div>
        <div><span>ESC</span> Menu</div>
      `;
    }
    return `
      <div><span>A/D</span> or <span>← →</span> Move</div>
      <div><span>Space</span> Jump</div>
      <div><span>Shift</span> Run</div>
      <div><span>M</span> Mute</div>
      <div><span>R</span> Reset checkpoint</div>
      <div><span>F</span> Flip / cape float</div>
      <div><span>E</span> Flour puff (L4)</div>
      <div><span>ESC</span> Menu</div>
    `;
  }

  function getControlHintMarkup(era5 = false, levelId = 1) {
    if (era5) {
      return `<span>↑ ↓</span>/<span>W S</span> Move &nbsp; <span>← →</span> Turn &nbsp; <span>Alt+← →</span> or <span>A D</span>/<span>, .</span> Strafe &nbsp; <span>Click</span>/<span>F</span> Fire &nbsp; <span>Space/C</span> Float &nbsp; <span>E</span> Tool`;
    }
    return `<span>A</span>/<span>D</span> Move &nbsp; <span>Space</span> Jump &nbsp; <span>Shift</span> Sprint`;
  }

  function updateLevelPreview({
    levelId,
    kickerEl,
    stateEl,
    titleEl: previewTitleEl,
    themeEl,
    mechanicEl,
  }) {
    if (kickerEl) kickerEl.textContent = `Level ${levelId} Preview`;
    if (stateEl) {
      const locked = !!lockedLevels[levelId];
      const underConstruction = !!underConstructionLevels[levelId];
      const launchBlocked = !!blockedLevels[levelId];
      stateEl.textContent = underConstruction
        ? (launchBlocked ? 'Under Construction' : getLevelConstructionLabel(levelId) || 'Under Construction')
        : locked
          ? 'Locked'
          : 'Unlocked';
      stateEl.classList.toggle('locked', locked);
      stateEl.classList.toggle('construction', underConstruction);
    }
    if (previewTitleEl) previewTitleEl.textContent = getLevelTitle(levelId);
    if (themeEl) themeEl.textContent = getLevelTheme(levelId);
    if (mechanicEl) mechanicEl.textContent = getLevelMechanic(levelId);
  }

  function resetTitleCopy() {
    if (titleSubEl) titleSubEl.textContent = getLevelSubtitle(_selectedLevel);
    if (titleLevelLockEl) titleLevelLockEl.textContent = getLevelStatusMessage(_selectedLevel);
    updateLevelPreview({
      levelId: _selectedLevel,
      kickerEl: titlePreviewKickerEl,
      stateEl: titlePreviewStateEl,
      titleEl: titlePreviewTitleEl,
      themeEl: titlePreviewThemeEl,
      mechanicEl: titlePreviewMechanicEl,
    });
    if (titleHintEl && !titleErrorVisible) {
      titleHintEl.style.color = '';
      titleHintEl.style.animation = '';
      titleHintEl.textContent = lockedLevels[_selectedLevel]
        ? getLevelLockMessage(_selectedLevel)
        : blockedLevels[_selectedLevel]
          ? getLevelConstructionMessage(_selectedLevel)
        : 'Press SPACE or ENTER to start';
    }
  }

  function updateMenuCopy(levelId) {
    if (menuSubEl) {
      menuSubEl.textContent = `Selected: ${getLevelSubtitle(levelId)}`;
    }
    if (menuLockEl) menuLockEl.textContent = getLevelStatusMessage(levelId);
    if (menuLegendEl) menuLegendEl.innerHTML = getGameplayLegendMarkup(levelId);
    updateLevelPreview({
      levelId,
      kickerEl: menuPreviewKickerEl,
      stateEl: menuPreviewStateEl,
      titleEl: menuPreviewTitleEl,
      themeEl: menuPreviewThemeEl,
      mechanicEl: menuPreviewMechanicEl,
    });
    menuBtn1?.classList.toggle('active', levelId === 1);
    menuBtn2?.classList.toggle('active', levelId === 2);
    menuBtn3?.classList.toggle('active', levelId === 3);
    menuBtn4?.classList.toggle('active', levelId === 4);
    menuBtn5?.classList.toggle('active', levelId === 5);
    menuBtn6?.classList.toggle('active', levelId === 6);
    menuBtn7?.classList.toggle('active', levelId === 7);
    menuBtn8?.classList.toggle('active', levelId === 8);
    menuBtn9?.classList.toggle('active', levelId === 9);
  }

  function applyLockState(button, locked) {
    if (!button) return;
    button.classList.toggle('locked', !!locked);
    button.toggleAttribute('aria-disabled', !!locked);
  }

  function applyConstructionState(button, underConstruction) {
    if (!button) return;
    button.classList.toggle('under-construction', !!underConstruction);
  }

  function refreshLockState() {
    applyLockState(btn1, lockedLevels[1]);
    applyLockState(btn2, lockedLevels[2]);
    applyLockState(btn3, lockedLevels[3]);
    applyLockState(btn4, lockedLevels[4]);
    applyLockState(btn5, lockedLevels[5]);
    applyLockState(btn6, lockedLevels[6]);
    applyLockState(btn7, lockedLevels[7]);
    applyLockState(btn8, lockedLevels[8]);
    applyLockState(btn9, lockedLevels[9]);
    applyLockState(menuBtn1, lockedLevels[1]);
    applyLockState(menuBtn2, lockedLevels[2]);
    applyLockState(menuBtn3, lockedLevels[3]);
    applyLockState(menuBtn4, lockedLevels[4]);
    applyLockState(menuBtn5, lockedLevels[5]);
    applyLockState(menuBtn6, lockedLevels[6]);
    applyLockState(menuBtn7, lockedLevels[7]);
    applyLockState(menuBtn8, lockedLevels[8]);
    applyLockState(menuBtn9, lockedLevels[9]);
    applyConstructionState(btn1, underConstructionLevels[1]);
    applyConstructionState(btn2, underConstructionLevels[2]);
    applyConstructionState(btn3, underConstructionLevels[3]);
    applyConstructionState(btn4, underConstructionLevels[4]);
    applyConstructionState(btn5, underConstructionLevels[5]);
    applyConstructionState(btn6, underConstructionLevels[6]);
    applyConstructionState(btn7, underConstructionLevels[7]);
    applyConstructionState(btn8, underConstructionLevels[8]);
    applyConstructionState(btn9, underConstructionLevels[9]);
    applyConstructionState(menuBtn1, underConstructionLevels[1]);
    applyConstructionState(menuBtn2, underConstructionLevels[2]);
    applyConstructionState(menuBtn3, underConstructionLevels[3]);
    applyConstructionState(menuBtn4, underConstructionLevels[4]);
    applyConstructionState(menuBtn5, underConstructionLevels[5]);
    applyConstructionState(menuBtn6, underConstructionLevels[6]);
    applyConstructionState(menuBtn7, underConstructionLevels[7]);
    applyConstructionState(menuBtn8, underConstructionLevels[8]);
    applyConstructionState(menuBtn9, underConstructionLevels[9]);
    resetTitleCopy();
    updateMenuCopy(_selectedLevel);
  }

  function selectLevel(id) {
    _selectedLevel = id;
    btn1.classList.toggle('active', id === 1);
    btn2.classList.toggle('active', id === 2);
    btn3.classList.toggle('active', id === 3);
    btn4.classList.toggle('active', id === 4);
    btn5.classList.toggle('active', id === 5);
    btn6.classList.toggle('active', id === 6);
    btn7.classList.toggle('active', id === 7);
    btn8.classList.toggle('active', id === 8);
    btn9.classList.toggle('active', id === 9);
    resetTitleCopy();
    if (id <= 9) {
      const url = id === 1 ? window.location.pathname : `${window.location.pathname}?level=${id}`;
      history.replaceState(null, '', url);
    }
    updateMenuCopy(id);
    if (lockedLevels[id] && titleHintEl) {
      titleHintEl.style.color = '#7a5a26';
      titleHintEl.style.animation = 'none';
      titleHintEl.textContent = getLevelLockMessage(id);
    } else if (blockedLevels[id] && titleHintEl) {
      titleHintEl.style.color = '#9c1d1d';
      titleHintEl.style.animation = 'none';
      titleHintEl.textContent = getLevelConstructionMessage(id);
    }
    if (typeof levelSelectHandler === 'function') levelSelectHandler(id);
  }

  // tabindex="-1" prevents buttons from capturing keyboard focus;
  // history.replaceState avoids page reload so Enter cannot loop back via click.
  // preventDefault+stopPropagation ensures no implicit form/button behavior on click.
  btn1?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(1); });
  btn2?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(2); });
  btn3?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(3); });
  btn4?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(4); });
  btn5?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(5); });
  btn6?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(6); });
  btn7?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(7); });
  btn8?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(8); });
  btn9?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); ev.currentTarget.blur(); selectLevel(9); });

  const menuEl = document.createElement('div');
  menuEl.className = 'dada-overlay dada-menu-bg hidden';
  menuEl.style.zIndex = '1200';
  menuEl.innerHTML = `
    <div class="dada-card">
      <div class="dada-h1" style="font-size:clamp(28px,4.8vw,50px)">MAIN MENU</div>
      <div class="dada-sub" id="menuSub">${getLevelSubtitle(_selectedLevel)}</div>
      <div class="dada-controls">
        Press <span>Esc</span> to resume, or switch levels below.
      </div>
      <div class="dada-device-note">Desktop only. Not built for phones.</div>
      <div class="dada-level-grid">
        ${LEVEL_ORDER.map((id) => getLevelCardMarkup(id, { menu: true })).join('')}
      </div>
      <div class="dada-level-preview">
        <div class="dada-level-preview-head">
          <div class="dada-level-preview-kicker" id="menuPreviewKicker"></div>
          <div class="dada-level-preview-state" id="menuPreviewState"></div>
        </div>
        <div class="dada-level-preview-title" id="menuPreviewTitle"></div>
        <div class="dada-level-preview-theme" id="menuPreviewTheme"></div>
        <div class="dada-level-preview-mechanic"><span>Key Mechanic</span><span id="menuPreviewMechanic"></span></div>
      </div>
      <div class="dada-level-lock" id="menuLevelLock"></div>
      <div class="dada-btn-row dada-menu-actions">
        <button class="dada-btn dada-btn-secondary" id="menuResumeBtn">Resume</button>
        <button class="dada-btn" id="menuRestartBtn">Restart Level</button>
        <button class="dada-btn dada-btn-secondary" id="menuResetBabyBtn">Reset Baby to New</button>
      </div>
      <div class="dada-menu-legend" id="menuLegend">${getGameplayLegendMarkup(_selectedLevel)}</div>
    </div>
  `;
  uiRoot.appendChild(menuEl);
  menuSubEl = menuEl.querySelector('#menuSub');
  menuLegendEl = menuEl.querySelector('#menuLegend');
  menuBtn1 = menuEl.querySelector('#menuLevelBtn1');
  menuBtn2 = menuEl.querySelector('#menuLevelBtn2');
  menuBtn3 = menuEl.querySelector('#menuLevelBtn3');
  menuBtn4 = menuEl.querySelector('#menuLevelBtn4');
  menuBtn5 = menuEl.querySelector('#menuLevelBtn5');
  menuBtn6 = menuEl.querySelector('#menuLevelBtn6');
  menuBtn7 = menuEl.querySelector('#menuLevelBtn7');
  menuBtn8 = menuEl.querySelector('#menuLevelBtn8');
  menuBtn9 = menuEl.querySelector('#menuLevelBtn9');
  menuLockEl = menuEl.querySelector('#menuLevelLock');
  menuPreviewKickerEl = menuEl.querySelector('#menuPreviewKicker');
  menuPreviewStateEl = menuEl.querySelector('#menuPreviewState');
  menuPreviewTitleEl = menuEl.querySelector('#menuPreviewTitle');
  menuPreviewThemeEl = menuEl.querySelector('#menuPreviewTheme');
  menuPreviewMechanicEl = menuEl.querySelector('#menuPreviewMechanic');
  const menuResumeBtn = menuEl.querySelector('#menuResumeBtn');
  const menuRestartBtn = menuEl.querySelector('#menuRestartBtn');
  const menuResetBabyBtn = menuEl.querySelector('#menuResetBabyBtn');
  menuBtn1?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(1);
  });
  menuBtn2?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(2);
  });
  menuBtn3?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(3);
  });
  menuBtn4?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[4]) {
      selectLevel(4);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(4);
  });
  menuBtn5?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[5]) {
      selectLevel(5);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(5);
  });
  menuBtn6?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[6]) {
      selectLevel(6);
      return;
    }
    if (blockedLevels[6]) {
      selectLevel(6);
      if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(6);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(6);
  });
  menuBtn7?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[7]) {
      selectLevel(7);
      return;
    }
    if (blockedLevels[7]) {
      selectLevel(7);
      if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(7);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(7);
  });
  menuBtn8?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[8]) {
      selectLevel(8);
      return;
    }
    if (blockedLevels[8]) {
      selectLevel(8);
      if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(8);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(8);
  });
  menuBtn9?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (lockedLevels[9]) {
      selectLevel(9);
      return;
    }
    if (blockedLevels[9]) {
      selectLevel(9);
      if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(9);
      return;
    }
    if (typeof gameplayMenuHandler === 'function') gameplayMenuHandler(9);
  });
  menuResumeBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof gameplayResumeHandler === 'function') gameplayResumeHandler();
  });
  menuRestartBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof gameplayRestartHandler === 'function') gameplayRestartHandler();
  });
  menuResetBabyBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.blur();
    if (typeof resetBabyHandler === 'function') resetBabyHandler();
  });

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

  const abilityEl = document.createElement('div');
  abilityEl.className = 'dada-hud-pill dada-ability-pill';
  abilityEl.innerHTML = `
    <div class="dada-ability-label">Flour Puff <span class="dada-ability-state">READY</span></div>
    <div class="dada-ability-track"><div class="dada-ability-fill"></div></div>
  `;
  uiRoot.appendChild(abilityEl);
  const abilityFill = abilityEl.querySelector('.dada-ability-fill');
  const abilityState = abilityEl.querySelector('.dada-ability-state');

  const buffEl = document.createElement('div');
  buffEl.className = 'dada-buff';
  buffEl.innerHTML = `
    <div class="dada-buff-col">
      <div class="dada-buff-card" data-buff="onesie">
        <div class="dada-buff-icon onesie">JUMP</div>
        <div class="dada-buff-copy">
          <div class="dada-buff-label">Onesie <span class="dada-buff-state">OFF</span></div>
          <div class="dada-buff-track"><div class="dada-buff-fill onesie" style="width:0%"></div></div>
          <span class="dada-buff-cue">x2 jump</span>
        </div>
      </div>
      <div class="dada-buff-card" data-buff="cape">
        <div class="dada-buff-icon cape">CAPE</div>
        <div class="dada-buff-copy">
          <div class="dada-buff-label">Antigravity Cape <span class="dada-buff-state">LOCKED</span></div>
          <div class="dada-buff-track"><div class="dada-buff-fill cape" style="width:0%"></div></div>
          <div class="dada-buff-note">Locked. Collect all binkies in Level 1 to unlock</div>
        </div>
      </div>
      <div class="dada-buff-card" data-buff="shield">
        <div class="dada-buff-icon shield">BUB</div>
        <div class="dada-buff-copy">
          <div class="dada-buff-label">Bubble Shield <span class="dada-buff-state">LOCKED</span></div>
          <div class="dada-buff-track"><div class="dada-buff-fill shield" style="width:0%"></div></div>
          <div class="dada-buff-note">Locked. Beat Level 5 to unlock</div>
        </div>
      </div>
    </div>
  `;
  uiRoot.appendChild(buffEl);
  const onesieCard = buffEl.querySelector('[data-buff="onesie"]');
  const capeCard = buffEl.querySelector('[data-buff="cape"]');
  const shieldCard = buffEl.querySelector('[data-buff="shield"]');
  const buffFill = onesieCard.querySelector('.dada-buff-fill.onesie');
  const buffCue = onesieCard.querySelector('.dada-buff-cue');
  const onesieState = onesieCard.querySelector('.dada-buff-state');
  const capeFill = capeCard.querySelector('.dada-buff-fill.cape');
  const capeState = capeCard.querySelector('.dada-buff-state');
  const capeNote = capeCard.querySelector('.dada-buff-note');
  const shieldFill = shieldCard.querySelector('.dada-buff-fill.shield');
  const shieldState = shieldCard.querySelector('.dada-buff-state');
  const shieldNote = shieldCard.querySelector('.dada-buff-note');


  const ctrlHintEl = document.createElement('div');
  ctrlHintEl.className = 'dada-ctrl-hint';
  ctrlHintEl.innerHTML = getControlHintMarkup(false);
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

  const bannerEl = document.createElement('div');
  bannerEl.className = 'dada-banner';
  bannerEl.innerHTML = `
    <div class="dada-banner-title" id="bannerTitle"></div>
    <div class="dada-banner-sub" id="bannerSub"></div>
  `;
  uiRoot.appendChild(bannerEl);
  const bannerTitleEl = bannerEl.querySelector('#bannerTitle');
  const bannerSubEl = bannerEl.querySelector('#bannerSub');

  const era5HudEl = document.createElement('div');
  era5HudEl.className = 'dada-era5-hud';
  era5HudEl.innerHTML = `
    <div class="dada-era5-panel" data-era5-hud>
      <div class="dada-era5-row">
        <div class="dada-era5-block">
          <div class="dada-era5-label">HP</div>
          <div class="dada-era5-hearts" data-era5-hearts></div>
        </div>
        <div class="dada-era5-block">
          <div class="dada-era5-label">Shield Gear</div>
          <div class="dada-era5-meter-copy"><span data-era5-shield-label>No Shield</span><span data-era5-shield-tier>0 / 3</span></div>
        </div>
      </div>
      <div class="dada-era5-row">
        <div class="dada-era5-block">
          <div class="dada-era5-label">Oxygen</div>
          <div class="dada-era5-oxygen" data-era5-oxygen><div class="dada-era5-oxygen-fill" data-era5-oxygen-fill></div></div>
          <div class="dada-era5-meter-copy"><span data-era5-tool-label>Scuba Tank</span><span data-era5-oxygen-copy>0 / 0</span></div>
        </div>
      </div>
      <div class="dada-era5-row">
        <div class="dada-era5-block">
          <div class="dada-era5-label">Weapon</div>
          <div class="dada-era5-weapon-track" data-era5-weapon><div class="dada-era5-weapon-fill" data-era5-weapon-fill></div></div>
          <div class="dada-era5-weapon-copy"><span data-era5-weapon-label>Bubble Wand</span><span data-era5-weapon-copy>READY</span></div>
          <div class="dada-era5-weapon-help" data-era5-weapon-help>Fire Bubble Wand: Click / F</div>
          <div class="dada-era5-weapon-help" data-era5-tool-help>Scuba Tank: Space ascend, C descend in deep pockets</div>
          <div class="dada-era5-weapon-strip" data-era5-weapon-strip></div>
        </div>
        <div class="dada-era5-hint" data-era5-hint>I Inventory</div>
      </div>
    </div>
  `;
  uiRoot.appendChild(era5HudEl);

  // ── 3D XYZ compass ─────────────────────────────────────────────────────────
  const era5CompassEl = document.createElement('canvas');
  era5CompassEl.className = 'dada-era5-compass';
  era5CompassEl.width = 79;
  era5CompassEl.height = 79;
  era5CompassEl.setAttribute('aria-hidden', 'true');
  uiRoot.appendChild(era5CompassEl);
  const era5CompassCtx = era5CompassEl.getContext('2d');

  const era5HeartsEl = era5HudEl.querySelector('[data-era5-hearts]');
  const era5ShieldLabelEl = era5HudEl.querySelector('[data-era5-shield-label]');
  const era5ShieldTierEl = era5HudEl.querySelector('[data-era5-shield-tier]');
  const era5ShieldBlockEl = era5ShieldLabelEl?.closest('.dada-era5-block') ?? null;
  const era5OxygenFillEl = era5HudEl.querySelector('[data-era5-oxygen-fill]');
  const era5OxygenCopyEl = era5HudEl.querySelector('[data-era5-oxygen-copy]');
  const era5OxygenRowEl = era5OxygenFillEl?.closest('.dada-era5-row') ?? null;
  const era5ToolLabelEl = era5HudEl.querySelector('[data-era5-tool-label]');
  const era5WeaponFillEl = era5HudEl.querySelector('[data-era5-weapon-fill]');
  const era5WeaponLabelEl = era5HudEl.querySelector('[data-era5-weapon-label]');
  const era5WeaponCopyEl = era5HudEl.querySelector('[data-era5-weapon-copy]');
  const era5WeaponHelpEl = era5HudEl.querySelector('[data-era5-weapon-help]');
  const era5ToolHelpEl = era5HudEl.querySelector('[data-era5-tool-help]');
  const era5HintEl = era5HudEl.querySelector('[data-era5-hint]');
  const era5WeaponStripEl = era5HudEl.querySelector('[data-era5-weapon-strip]');

  const era5ReticleEl = document.createElement('div');
  era5ReticleEl.className = 'dada-era5-reticle';
  era5ReticleEl.setAttribute('aria-hidden', 'true');
  uiRoot.appendChild(era5ReticleEl);

  const era5InventoryEl = document.createElement('div');
  era5InventoryEl.className = 'dada-era5-inventory';
  era5InventoryEl.innerHTML = `
    <div class="dada-era5-sheet" data-era5-inventory>
      <div class="dada-era5-sheet-head">
        <div>
          <div class="dada-era5-sheet-title">Inventory</div>
        </div>
        <button class="dada-era5-close" data-era5-close>Close</button>
      </div>
      <div class="dada-era5-grid">
        <div class="dada-era5-card">
          <div class="dada-era5-section-title">Equipped</div>
          <div class="dada-era5-slots" data-era5-slots></div>
        </div>
        <div class="dada-era5-card">
          <div class="dada-era5-section-title">Backpack</div>
          <div class="dada-era5-item-grid" data-era5-items></div>
        </div>
      </div>
    </div>
  `;
  uiRoot.appendChild(era5InventoryEl);
  const era5SlotsEl = era5InventoryEl.querySelector('[data-era5-slots]');
  const era5ItemsEl = era5InventoryEl.querySelector('[data-era5-items]');

  const era5TeaserEl = document.createElement('div');
  era5TeaserEl.className = 'dada-era5-teaser';
  era5TeaserEl.innerHTML = `
    <div class="dada-era5-teaser-card" data-era5-teaser>
      <div class="dada-era5-teaser-title">NEW ERA UNLOCKED</div>
      <div class="dada-era5-teaser-sub">Vehicles, Inventory, Gear, Shields, Tools</div>
      <div class="dada-era5-icon-row">
        <div class="dada-era5-icon"><div class="dada-era5-icon-glyph">V</div><div class="dada-era5-icon-label">Vehicles</div></div>
        <div class="dada-era5-icon"><div class="dada-era5-icon-glyph">I</div><div class="dada-era5-icon-label">Inventory</div></div>
        <div class="dada-era5-icon"><div class="dada-era5-icon-glyph">G</div><div class="dada-era5-icon-label">Gear</div></div>
        <div class="dada-era5-icon"><div class="dada-era5-icon-glyph">S</div><div class="dada-era5-icon-label">Shields</div></div>
        <div class="dada-era5-icon"><div class="dada-era5-icon-glyph">T</div><div class="dada-era5-icon-label">Tools</div></div>
      </div>
      <div class="dada-era5-teaser-sub" style="margin-top:18px">COMING SOON</div>
      <button class="dada-era5-close" data-era5-teaser-close style="margin-top:18px">Close</button>
    </div>
  `;
  uiRoot.appendChild(era5TeaserEl);

  let boostCardTimer1 = null, boostCardTimer2 = null;
  let bannerTimer = null;
  let era5TeaserTimer = null;
  let era5EquipHandler = null;
  let era5UnequipHandler = null;
  let era5InventoryCloseHandler = null;
  let era5InventoryState = {
    slots: [],
    items: [],
  };

  function renderPips(targetEl, count, maxCount, filledClass, filledText) {
    if (!targetEl) return;
    targetEl.innerHTML = '';
    for (let i = 0; i < maxCount; i++) {
      const pip = document.createElement('span');
      pip.className = `${filledClass} ${i < count ? 'filled' : 'empty'}`;
      pip.textContent = filledText;
      targetEl.appendChild(pip);
    }
  }

  function renderEra5Inventory() {
    if (!era5SlotsEl || !era5ItemsEl) return;
    era5SlotsEl.innerHTML = era5InventoryState.slots.map((slot) => `
      <div class="dada-era5-slot">
        <div class="dada-era5-slot-name">${slot.label}</div>
        <div class="dada-era5-slot-item${slot.itemName ? '' : ' dada-era5-slot-empty'}">
          ${slot.itemName || 'Empty'}${slot.archetype ? `<span class="dada-era5-item-badge">${slot.archetype.toUpperCase()}</span>` : ''}
        </div>
        ${slot.canUnequip ? `<button class="dada-era5-slot-action" data-era5-unequip="${slot.slotId}">Unequip</button>` : ''}
      </div>
    `).join('');
    const BAG_GROUPS = [
      { label: 'Weapons', type: 'weapon' },
      { label: 'Tools', type: 'tool' },
      { label: 'Wearables', type: 'armor' },
    ];
    era5ItemsEl.innerHTML = BAG_GROUPS.map(({ label, type }) => {
      const groupItems = era5InventoryState.items.filter((item) => item.type === type);
      if (groupItems.length === 0) return '';
      const cards = groupItems.map((item) => `
        <div class="dada-era5-item rarity-${item.rarity || 'common'}">
          <div class="dada-era5-item-name">
            ${item.name}${item.archetype ? `<span class="dada-era5-item-badge">${item.archetype.toUpperCase()}</span>` : ''}
          </div>
          ${item.description ? `<div class="dada-era5-item-desc">${item.description}</div>` : ''}
          ${item.equipped
            ? '<div class="dada-era5-item-equipped">Active</div>'
            : `<button class="dada-era5-item-action" data-era5-equip="${item.instanceId}">Equip</button>`}
        </div>
      `).join('');
      return `<div class="dada-era5-item-group"><div class="dada-era5-item-group-label">${label}</div>${cards}</div>`;
    }).join('');
  }

  const canvasEl = document.getElementById('renderCanvas');

  function setCanvasInputEnabled(enabled) {
    if (!canvasEl) return;
    canvasEl.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  setCanvasInputEnabled(true);

  function canShowEra5Reticle() {
    return titleEl.classList.contains('hidden')
      && endEl.classList.contains('hidden')
      && menuEl.classList.contains('hidden')
      && !era5InventoryEl.classList.contains('open')
      && !era5TeaserEl.classList.contains('visible')
      && era5HudEl.style.display !== 'none';
  }

  function setEra5ReticleVisible(visible) {
    era5ReticleEl.style.display = visible && canShowEra5Reticle() ? 'block' : 'none';
  }

  era5InventoryEl.addEventListener('click', (ev) => {
    const closeBtn = ev.target.closest('[data-era5-close]');
    if (closeBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof era5InventoryCloseHandler === 'function') era5InventoryCloseHandler();
      return;
    }
    const equipBtn = ev.target.closest('[data-era5-equip]');
    if (equipBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      era5EquipHandler?.(equipBtn.getAttribute('data-era5-equip'));
      return;
    }
    const unequipBtn = ev.target.closest('[data-era5-unequip]');
    if (unequipBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      era5UnequipHandler?.(unequipBtn.getAttribute('data-era5-unequip'));
    }
  });
  era5TeaserEl.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-era5-teaser-close]')) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (era5TeaserTimer) clearTimeout(era5TeaserTimer);
    era5TeaserEl.classList.remove('visible');
    if (endEl.classList.contains('hidden') && menuEl.classList.contains('hidden') && !era5InventoryEl.classList.contains('open')) {
      setEra5ReticleVisible(true);
      setCanvasInputEnabled(true);
    }
  });

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

  function showBanner(title, subtitle = '', durationMs = 2400) {
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTitleEl.textContent = title;
    bannerSubEl.textContent = subtitle;
    bannerEl.classList.add('visible');
    bannerTimer = setTimeout(() => {
      bannerEl.classList.remove('visible');
    }, durationMs);
  }

  // Coin pulse animation
  let pulseCancelTimer = null;
  const toastTimers = new Map();
  function pulseCoin() {
    coinsEl.classList.add('pulse');
    if (pulseCancelTimer) clearTimeout(pulseCancelTimer);
    pulseCancelTimer = setTimeout(() => coinsEl.classList.remove('pulse'), 130);
  }

  function setCoinCount(collected, { pulse = false } = {}) {
    const safeCollected = Number.isFinite(collected)
      ? Math.max(0, Math.min(coinTotal, collected))
      : 0;
    coinsEl.textContent = `🍼 ${safeCollected} / ${coinTotal}`;
    if (pulse) pulseCoin();
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

  refreshLockState();

  return {
    showTitle() {
      if (!titleVisible) {
        titleEl.classList.remove('hidden');
        titleVisible = true;
      }
      setEra5ReticleVisible(false);
    },
    hideTitle() {
      if (titleVisible) {
        titleEl.classList.add('hidden');
        titleVisible = false;
      }
    },
    showEnd() {
      endEl.classList.remove('hidden');
      setEra5ReticleVisible(false);
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
    setLevelSelectHandler(cb) {
      levelSelectHandler = cb;
    },
    setGameplayMenuHandler(cb) {
      gameplayMenuHandler = cb;
    },
    setGameplayResumeHandler(cb) {
      gameplayResumeHandler = cb;
    },
    setGameplayRestartHandler(cb) {
      gameplayRestartHandler = cb;
    },
    setSelectedLevel(levelId) {
      selectLevel(levelId);
      return _selectedLevel;
    },
    moveSelectedLevel(delta = 1) {
      const currentIndex = LEVEL_ORDER.indexOf(_selectedLevel);
      const nextIndex = Math.max(0, Math.min(LEVEL_ORDER.length - 1, currentIndex + delta));
      selectLevel(LEVEL_ORDER[nextIndex]);
      return _selectedLevel;
    },
    getSelectedLevel() {
      return _selectedLevel;
    },
    setResetBabyHandler(cb) {
      resetBabyHandler = cb;
    },
    setLockedLevels(nextLockedLevels = {}, nextLockMessages = {}) {
      lockedLevels = {
        ...lockedLevels,
        ...nextLockedLevels,
      };
      lockMessages = {
        ...lockMessages,
        ...nextLockMessages,
      };
      refreshLockState();
    },
    setUnderConstructionLevels(nextUnderConstructionLevels = {}, nextMessages = {}, nextBlockedLevels = {}) {
      underConstructionLevels = {
        ...underConstructionLevels,
        ...nextUnderConstructionLevels,
      };
      constructionMessages = {
        ...constructionMessages,
        ...nextMessages,
      };
      blockedLevels = {
        ...blockedLevels,
        ...nextBlockedLevels,
      };
      refreshLockState();
    },
    showLoading(levelId) {
      const percent = arguments.length > 1 ? arguments[1] : 0;
      titleErrorVisible = false;
      if (titleSubEl) titleSubEl.textContent = `Loading Level ${levelId}… ${percent}%`;
      if (titleLoadingTextEl) titleLoadingTextEl.textContent = `Loading Level ${levelId}… ${percent}%`;
      if (titleLoadingFillEl) titleLoadingFillEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
      if (titleLoadingWrapEl) titleLoadingWrapEl.classList.add('visible');
      if (titleHintEl) {
        titleHintEl.style.color = '#245532';
        titleHintEl.style.animation = 'none';
        titleHintEl.textContent = percent >= 100 ? 'Starting…' : 'Preparing diorama…';
      }
    },
    clearLoading() {
      if (titleLoadingFillEl) titleLoadingFillEl.style.width = '0%';
      if (titleLoadingWrapEl) titleLoadingWrapEl.classList.remove('visible');
      resetTitleCopy();
    },
    showStartError(msg) {
      titleErrorVisible = true;
      if (titleLoadingWrapEl) titleLoadingWrapEl.classList.remove('visible');
      if (titleHintEl) {
        titleHintEl.style.color = '#c84f34';
        titleHintEl.style.animation = 'none';
        titleHintEl.textContent = `Error: ${msg}`;
      }
      if (titleSubEl) titleSubEl.textContent = getLevelSubtitle(_selectedLevel);
    },
    updateTitleDebug({ selectedLevel, currentLevel, titleState, lastKey } = {}) {
      if (!titleDebugEl) return;
      titleDebugEl.textContent = `sel:${selectedLevel ?? '?'} cur:${currentLevel ?? '?'} s:${titleState ?? '?'} k:${lastKey ?? '\u2014'}`;
    },
    showGameplayMenu(levelId = _selectedLevel) {
      updateMenuCopy(levelId);
      menuEl.classList.remove('hidden');
      if (isEra5UiLevel(levelId)) setEra5ReticleVisible(false);
      setCanvasInputEnabled(false);
    },
    hideGameplayMenu() {
      menuEl.classList.add('hidden');
      if (isEra5UiLevel(_selectedLevel) && endEl.classList.contains('hidden') && !era5InventoryEl.classList.contains('open')) {
        setEra5ReticleVisible(true);
      }
      if (endEl.classList.contains('hidden')) {
        setCanvasInputEnabled(true);
      }
    },
    isGameplayMenuVisible() {
      return !menuEl.classList.contains('hidden');
    },
    showPopText(text, durationMs = 760) {
      if (popTimer) clearTimeout(popTimer);
      popEl.textContent = text;
      popEl.classList.add('visible');
      popTimer = setTimeout(() => {
        popEl.classList.remove('visible');
      }, durationMs);
    },
    showStatus(text, durationMs = 1600, options = {}) {
      if (statusTimer) clearTimeout(statusTimer);
      const tone = options?.tone ? `tone-${String(options.tone)}` : '';
      statusEl.className = `dada-status${tone ? ` ${tone}` : ''}`;
      statusEl.dataset.tone = options?.tone || '';
      statusEl.textContent = text;
      statusEl.classList.add('visible');
      statusTimer = setTimeout(() => {
        statusEl.classList.remove('visible');
        statusEl.className = 'dada-status';
        statusEl.dataset.tone = '';
      }, durationMs);
    },
    setFade(alpha) {
      fadeEl.style.opacity = String(Math.max(0, Math.min(1, alpha)));
    },

    // ── Gameplay HUD methods ─────────────────────────────────────

    /** Show gameplay HUD elements (coin counter, objective, control hints). */
    showGameplayHud(total, { era5 = false, levelId = _selectedLevel } = {}) {
      coinTotal = total;
      setCoinCount(0);
      coinsEl.style.display = 'block';
      objectiveEl.style.display = 'block';
      buffEl.style.display = 'block';
      abilityEl.style.display = era5 ? 'none' : 'none';
      era5HudEl.style.display = era5 ? 'block' : 'none';
      ctrlHintEl.innerHTML = getControlHintMarkup(era5, levelId);
      setEra5ReticleVisible(era5);
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
      abilityEl.style.display = 'none';
      ctrlHintEl.style.display = 'none';
      era5HudEl.style.display = 'none';
      era5InventoryEl.classList.remove('open');
      setEra5ReticleVisible(false);
    },

    /** Update coin counter; provide collected count. */
    updateCoins(collected) {
      setCoinCount(collected, { pulse: true });
    },
    setCoins(collected) {
      setCoinCount(collected, { pulse: false });
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

    /** Update onesie buff bar. phase: 'IDLE' | 'ACTIVE' | 'RECHARGING' */
    updateBuff(remainingMs, totalMs, phase = 'IDLE') {
      if (phase === 'IDLE') {
        onesieCard.style.display = 'none';
        return;
      }
      onesieCard.style.display = '';
      buffEl.style.display = 'block';
      const isActiveOrRecharge = phase === 'ACTIVE' || phase === 'RECHARGING';
      onesieCard.classList.toggle('active', isActiveOrRecharge);
      if (phase === 'ACTIVE') {
        onesieState.textContent = 'ACTIVE';
      } else if (phase === 'RECHARGING') {
        onesieState.textContent = 'RECHARGING';
      } else {
        onesieState.textContent = 'OFF';
      }
      const pct = Math.max(0, Math.min(100, (remainingMs / (totalMs || 1)) * 100));
      buffFill.style.width = `${pct}%`;
      buffFill.classList.toggle('recharging', phase === 'RECHARGING');
      buffCue.style.display = phase === 'ACTIVE' ? 'inline-block' : 'none';
    },
    hideBuffContainer() {
      buffEl.style.display = 'none';
    },
    updateDoubleJumpCue(available) {
      buffCue.style.display = available ? 'inline-block' : 'none';
    },
    updateCapeBuff({ unlocked = false, active = false, remainingMs = 0, totalMs = 4000, used = false } = {}) {
      if (!unlocked || !active) {
        capeCard.style.display = 'none';
        return;
      }
      capeCard.style.display = '';
      buffEl.style.display = 'block';
      const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
      capeFill.style.width = `${pct}%`;
      capeCard.classList.toggle('active', true);
      capeState.textContent = `${Math.ceil(remainingMs / 1000)}s`;
      if (capeNote) capeNote.textContent = 'Float mode active';
    },
    updateBubbleShieldBuff({ unlocked = false, used = false } = {}) {
      if (!unlocked || used) {
        shieldCard.style.display = 'none';
        return;
      }
      shieldCard.style.display = '';
      buffEl.style.display = 'block';
      shieldCard.classList.toggle('active', true);
      shieldFill.style.width = '100%';
      shieldState.textContent = 'READY';
      if (shieldNote) shieldNote.textContent = 'Auto-pops on the first hazard hit each run';
    },
    updateWindGlideBuff(_opts = {}) {
      // WND/Glide not yet active in Level 5+; kept as no-op until Level 7 contract ships.
    },
    updateFlourPuff({ visible = false, remainingMs = 0, totalMs = 6000 } = {}) {
      if (!visible) {
        abilityEl.style.display = 'none';
        abilityFill.style.width = '0%';
        abilityState.textContent = 'READY';
        return;
      }
      abilityEl.style.display = 'block';
      if (remainingMs <= 0) {
        abilityFill.style.width = '100%';
        abilityState.textContent = 'READY';
        return;
      }
      const pct = totalMs > 0 ? Math.max(0, Math.min(100, 100 - ((remainingMs / totalMs) * 100))) : 0;
      abilityFill.style.width = `${pct}%`;
      abilityState.textContent = `${Math.ceil(remainingMs / 1000)}s`;
    },
    showEra5Hud() {
      era5HudEl.style.display = 'block';
      setEra5ReticleVisible(true);
    },
    hideEra5Hud() {
      era5HudEl.style.display = 'none';
      setEra5ReticleVisible(false);
    },
    updateEra5Hud({
      hp = 3,
      hpMax = 3,
      shield = 1,
      shieldMax = 1,
      shieldLabel = 'No Shield',
      oxygen = 0,
      oxygenMax = 0,
      showOxygen = false,
      toolLabel = 'Scuba Tank',
      weaponLabel = 'Bubble Wand',
      weaponCooldownMs = 0,
      weaponCooldownMaxMs = 350,
      inventoryHint = 'I Inventory',
      weaponHelp = 'Fire Bubble Wand: Click / F',
      toolHelp = 'Scuba Tank: Space ascend, C descend in deep pockets',
      weaponSlots = [],
      hasTool = false,
      hasShield = false,
    } = {}) {
      era5HudEl.style.display = 'block';
      if (era5ToolLabelEl) era5ToolLabelEl.textContent = toolLabel;
      if (era5ToolHelpEl) era5ToolHelpEl.textContent = toolHelp;
      if (era5HeartsEl) {
        era5HeartsEl.innerHTML = '';
        const hpSlots = Math.max(3, Math.round(hpMax));
        const shieldSlots = 3;
        for (let i = 0; i < hpSlots; i += 1) {
          const pip = document.createElement('span');
          pip.className = `dada-era5-heart ${i < hp ? 'filled' : 'empty'}`;
          pip.textContent = '♥';
          era5HeartsEl.appendChild(pip);
        }
        const shieldCapacity = Math.max(0, Math.min(shieldSlots, Math.round(shieldMax)));
        for (let i = 0; i < shieldSlots; i += 1) {
          const pip = document.createElement('span');
          const filled = i < Math.max(0, Math.round(shield));
          const unlocked = i < shieldCapacity;
          pip.className = `dada-era5-shield ${filled ? 'filled' : 'empty'}${unlocked ? '' : ' locked'}`;
          pip.textContent = '◈';
          era5HeartsEl.appendChild(pip);
        }
      }
      if (era5ShieldBlockEl) era5ShieldBlockEl.style.display = 'block';
      if (era5ShieldLabelEl) era5ShieldLabelEl.textContent = shieldLabel;
      if (era5ShieldTierEl) era5ShieldTierEl.textContent = `${Math.max(0, Math.min(3, Math.round(shieldMax)))} / 3`;
      if (era5OxygenRowEl) {
        era5OxygenRowEl.style.display = showOxygen ? 'block' : 'none';
        if (showOxygen && era5OxygenFillEl) {
          const oxyPct = oxygenMax > 0 ? Math.max(0, Math.min(100, (oxygen / oxygenMax) * 100)) : 0;
          era5OxygenFillEl.style.width = `${oxyPct}%`;
        }
        if (showOxygen && era5OxygenCopyEl) {
          era5OxygenCopyEl.textContent = `${Math.ceil(oxygen)} / ${Math.round(oxygenMax)}`;
        }
      }
      if (era5WeaponHelpEl) era5WeaponHelpEl.style.display = 'none';
      if (era5ToolHelpEl) era5ToolHelpEl.style.display = 'none';
      era5HintEl.style.display = 'none';
      const weaponPct = weaponCooldownMaxMs > 0
        ? Math.max(0, Math.min(100, 100 - ((weaponCooldownMs / weaponCooldownMaxMs) * 100)))
        : 100;
      era5WeaponFillEl.style.width = `${weaponPct}%`;
      era5WeaponLabelEl.textContent = weaponLabel;
      era5WeaponCopyEl.textContent = weaponCooldownMs > 0
        ? `${(weaponCooldownMs / 1000).toFixed(2)}s`
        : 'READY';
      if (era5WeaponStripEl && weaponSlots.length > 0) {
        era5WeaponStripEl.innerHTML = weaponSlots.map((slot, i) => `
          <div class="dada-era5-weapon-pip${slot.active ? ' active' : ''}${!slot.name ? ' empty' : ''}">
            <div class="dada-era5-weapon-pip-num">${i + 1}</div>
            <div class="dada-era5-weapon-pip-name">${slot.abbr || ''}</div>
          </div>
        `).join('');
      }
    },
    updateEra5Compass(cameraRight, cameraUp) {
      if (!era5CompassCtx) return;
      const ctx = era5CompassCtx;
      const w = era5CompassEl.width;
      const h = era5CompassEl.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const len = 26;
      ctx.clearRect(0, 0, w, h);
      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fill();
      // Axis definitions: +X=east(red), +Y=up(green), +Z=south(blue), negatives dimmer
      const axes = [
        { v: [-1, 0, 0], color: '#a33', label: 'W' },
        { v: [0, -1, 0], color: '#3a3', label: 'D' },
        { v: [0, 0, -1], color: '#33a', label: 'N' },
        { v: [1,  0, 0], color: '#f55', label: 'E' },
        { v: [0,  1, 0], color: '#5f5', label: 'U' },
        { v: [0,  0, 1], color: '#55f', label: 'S' },
      ];
      // Sort by depth (dot with -cameraForward) so near axes draw on top
      const withDepth = axes.map((ax) => {
        const px = ax.v[0] * cameraRight.x + ax.v[1] * cameraRight.y + ax.v[2] * cameraRight.z;
        const py = -(ax.v[0] * cameraUp.x + ax.v[1] * cameraUp.y + ax.v[2] * cameraUp.z);
        return { ...ax, px, py };
      });
      withDepth.sort((a, b) => (a.px * a.px + a.py * a.py) - (b.px * b.px + b.py * b.py));
      for (const ax of withDepth) {
        const ex = cx + ax.px * len;
        const ey = cy + ax.py * len;
        ctx.beginPath();
        ctx.strokeStyle = ax.color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = ax.color;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ax.label, ex + ax.px * 8, ey + ax.py * 8);
      }
    },
    setEra5InventoryHandlers({
      onEquip = null,
      onUnequip = null,
      onClose = null,
    } = {}) {
      era5EquipHandler = onEquip;
      era5UnequipHandler = onUnequip;
      era5InventoryCloseHandler = onClose;
    },
    setEra5InventoryData({
      slots = [],
      items = [],
    } = {}) {
      era5InventoryState = { slots, items };
      renderEra5Inventory();
    },
    showEra5Inventory() {
      era5InventoryEl.classList.add('open');
      setEra5ReticleVisible(false);
      setCanvasInputEnabled(false);
      renderEra5Inventory();
    },
    hideEra5Inventory() {
      era5InventoryEl.classList.remove('open');
      if (endEl.classList.contains('hidden') && menuEl.classList.contains('hidden') && !era5TeaserEl.classList.contains('visible')) {
        setEra5ReticleVisible(true);
        setCanvasInputEnabled(true);
      }
    },
    isEra5InventoryVisible() {
      return era5InventoryEl.classList.contains('open');
    },
    showEra5Teaser(durationMs = 3200) {
      if (era5TeaserTimer) clearTimeout(era5TeaserTimer);
      era5TeaserEl.classList.add('visible');
      setEra5ReticleVisible(false);
      setCanvasInputEnabled(false);
      era5TeaserTimer = setTimeout(() => {
        era5TeaserEl.classList.remove('visible');
        if (endEl.classList.contains('hidden') && menuEl.classList.contains('hidden') && !era5InventoryEl.classList.contains('open')) {
          setEra5ReticleVisible(true);
          setCanvasInputEnabled(true);
        }
      }, durationMs);
    },

    /** Reset all gameplay HUD to initial state for restart. */
    resetGameplayHud() {
      this.hideGameplayHud();
      this.resetControlHints();
      this.updateBuff(0, 1);
      this.updateCapeBuff({ unlocked: false, active: false, remainingMs: 0, used: false });
      this.updateBubbleShieldBuff({ unlocked: false, used: false });
      this.updateWindGlideBuff({ unlocked: false, used: false, active: false, remainingMs: 0 });
      this.updateFlourPuff({ visible: false, remainingMs: 0, totalMs: 6000 });
      this.hideEra5Hud();
      this.hideEra5Inventory();
      this.setEra5InventoryData({ slots: [], items: [] });
      setEra5ReticleVisible(false);
    },
    showBanner,
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
