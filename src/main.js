import { isTestMode } from './utils/testMode.js';
import { boot } from './web3d/boot.js';

// Read ?level=N from URL (default 1)
const _levelParam = new URLSearchParams(window.location.search).get('level');
const levelId = _levelParam === '3' ? 3 : _levelParam === '2' ? 2 : 1;

function installDevErrorSurface() {
  if (!import.meta.env.DEV) return;
  if (window.__DADA_DEV_ERROR__) return;

  const overlay = document.createElement('div');
  overlay.id = 'dada-dev-error-overlay';
  overlay.style.cssText = [
    'position:fixed',
    'left:12px',
    'bottom:12px',
    'max-width:min(720px, calc(100vw - 24px))',
    'padding:10px 12px',
    'border-radius:10px',
    'background:rgba(36, 10, 10, 0.92)',
    'border:1px solid rgba(255, 132, 132, 0.48)',
    'color:#ffd9d9',
    'font:12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
    'white-space:pre-wrap',
    'z-index:2000',
    'pointer-events:none',
    'display:none',
  ].join(';');
  document.body.appendChild(overlay);

  const show = (errorLike) => {
    const message = errorLike instanceof Error
      ? (errorLike.stack || errorLike.message)
      : String(errorLike || 'Unknown runtime error');
    overlay.textContent = message;
    overlay.style.display = 'block';
    window.__DADA_DEBUG__ = window.__DADA_DEBUG__ || {};
    window.__DADA_DEBUG__.lastRuntimeError = message;
  };

  window.__DADA_DEV_ERROR__ = show;
  window.addEventListener('error', (event) => {
    if (event?.error) show(event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    show(event?.reason || 'Unhandled promise rejection');
  });
}

installDevErrorSurface();

// Boot Babylon.js engine
boot({ isTestMode, levelId }).catch((err) => {
  window.__DADA_DEV_ERROR__?.(err);
  console.error('Failed to boot game:', err);
});
