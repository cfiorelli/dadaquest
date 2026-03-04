/**
 * Dev-only rest stability self-test.
 * Measures maxDeltaY and maxAbsVy over ~3 seconds of idle.
 * Target: both < 0.01
 *
 * Usage (dev console):  window.__DADA_DEBUG__.runRestTest()
 */
export function installRestStabilityTest(player) {
  if (!window.__DADA_DEBUG__) window.__DADA_DEBUG__ = {};

  window.__DADA_DEBUG__.runRestTest = () => {
    const DURATION_MS = 3000;
    const startY = player.mesh.position.y;
    let maxDeltaY = 0;
    let maxAbsVy = 0;
    let frames = 0;
    const startTime = performance.now();

    console.log(`[rest-test] Starting ${DURATION_MS}ms idle stability test at y=${startY.toFixed(4)}...`);

    const check = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= DURATION_MS) {
        const pass = maxDeltaY < 0.01 && maxAbsVy < 0.01;
        const status = pass ? 'PASS' : 'FAIL';
        console.log(
          `[rest-test] ${status} after ${frames} frames: maxDeltaY=${maxDeltaY.toFixed(6)}, maxAbsVy=${maxAbsVy.toFixed(6)}`
        );
        window.__DADA_DEBUG__.restTestResult = { pass, maxDeltaY, maxAbsVy, frames };
        return;
      }

      const dy = Math.abs(player.mesh.position.y - startY);
      const avy = Math.abs(player.vy);
      if (dy > maxDeltaY) maxDeltaY = dy;
      if (avy > maxAbsVy) maxAbsVy = avy;
      frames++;
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  };
}
