export class InputManager {
  constructor() {
    this.held = {};
    this._jumpJustPressed = false;
    this._enterJustPressed = false;
    this._muteJustPressed = false;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.held[e.code] = true;
      if (e.code === 'Space') this._jumpJustPressed = true;
      if (e.code === 'Enter') this._enterJustPressed = true;
      if (e.code === 'KeyM') this._muteJustPressed = true;
    });
    document.addEventListener('keyup', (e) => {
      this.held[e.code] = false;
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
    const v = this._jumpJustPressed;
    this._jumpJustPressed = false;
    return v;
  }

  /** True only once per Enter press. */
  consumeEnter() {
    const v = this._enterJustPressed;
    this._enterJustPressed = false;
    return v;
  }

  /** True only once per M press. */
  consumeMuteToggle() {
    const v = this._muteJustPressed;
    this._muteJustPressed = false;
    return v;
  }
}
