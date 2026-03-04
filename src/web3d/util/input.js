export class InputManager {
  constructor() {
    this.held = {};
    this.prevDown = {};
    this.pressedEdge = {};
    this.pressId = {};
    this._nextPressId = 1;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const code = e.code;
      const wasDown = !!this.held[code];
      this.prevDown[code] = wasDown;
      this.held[code] = true;
      if (!wasDown) {
        this.pressedEdge[code] = true;
        this.pressId[code] = this._nextPressId++;
      }
    });
    document.addEventListener('keyup', (e) => {
      const code = e.code;
      this.prevDown[code] = !!this.held[code];
      this.held[code] = false;
    });
  }

  /** Returns -1, 0, or 1. */
  getMoveX() {
    let x = 0;
    if (this.held['KeyA'] || this.held['ArrowLeft']) x -= 1;
    if (this.held['KeyD'] || this.held['ArrowRight']) x += 1;
    return x;
  }

  /** True while Space is held down. */
  isJumpHeld() {
    return !!this.held['Space'];
  }

  /** True only once per press (must be consumed each frame). */
  consumeJump() {
    return this.consumePressEdge('Space');
  }

  /** Returns jump press edge + id for de-duping. */
  consumeJumpPress() {
    const edge = this.consumePressEdge('Space');
    return {
      edge,
      pressId: edge ? (this.pressId.Space || 0) : 0,
    };
  }

  /** True only once per Enter press. */
  consumeEnter() {
    return this.consumePressEdge('Enter');
  }

  /** True only once per M press. */
  consumeMuteToggle() {
    return this.consumePressEdge('KeyM');
  }

  consumePressEdge(code) {
    const v = !!this.pressedEdge[code];
    this.pressedEdge[code] = false;
    return v;
  }

  consumeAll() {
    const keys = new Set([
      ...Object.keys(this.held),
      ...Object.keys(this.prevDown),
      ...Object.keys(this.pressedEdge),
      ...Object.keys(this.pressId),
    ]);

    for (const key of keys) {
      this.prevDown[key] = !!this.held[key];
      this.pressedEdge[key] = false;
    }
  }
}
