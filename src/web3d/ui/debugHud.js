/**
 * Dev-only debug HUD. Toggle with ` (backtick) key.
 * Displays FPS, player state, collision info, and game state.
 */
export function createDebugHud() {
  const el = document.createElement('pre');
  Object.assign(el.style, {
    position: 'fixed',
    top: '8px',
    left: '8px',
    background: 'rgba(0,0,0,0.7)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '8px 10px',
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    lineHeight: '1.4',
    borderRadius: '4px',
    display: 'none',
  });
  document.body.appendChild(el);

  let visible = false;

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
      visible = !visible;
      el.style.display = visible ? 'block' : 'none';
    }
  });

  return {
    /** Call each frame with current debug data. */
    update(fps, playerDebug, gameState, collisionHits) {
      if (!visible) return;
      const p = playerDebug || {};
      const lines = [
        `FPS: ${fps.toFixed(0)}`,
        `pos: (${p.x}, ${p.y})`,
        `vel: (${p.vx}, ${p.vy})`,
        `grounded: ${p.grounded}  jumping: ${p.jumping}`,
        `coyote: ${p.coyoteMs}ms  buffer: ${p.bufferMs}ms`,
        `collisions: ${collisionHits ?? '-'}`,
        `state: ${gameState}`,
      ];
      el.textContent = lines.join('\n');

      // Also update global debug object
      if (window.__DADA_DEBUG__) {
        window.__DADA_DEBUG__.player = p;
      }
    },
  };
}
