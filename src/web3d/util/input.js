export class InputManager {
  constructor() {
    this.held = {};
    this.pressId = {};
    this.consumedPressId = {};
    this._nextPressId = 1;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const code = e.code;
      if (!this.held[code]) {
        this.held[code] = true;
        this.pressId[code] = this._nextPressId++;
      }
    });
    document.addEventListener('keyup', (e) => {
      const code = e.code;
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
    return !!this.held['Space'];
  }

  /** Returns jump press edge + id for de-duping. */
  consumeJumpPress() {
    const code = 'Space';
    const isHeld = !!this.held[code];
    const pressId = this.pressId[code] || 0;
    const alreadyConsumed = this.consumedPressId[code] === pressId;
    const isNewPress = isHeld && pressId > 0 && !alreadyConsumed;
    
    if (isNewPress) {
      this.consumedPressId[code] = pressId;
    }
    
    return {
      edge: isNewPress,
      pressId,
    };
  }

  /** True only once per Enter press. */
  consumeEnter() {
    return !!this.held['Enter'];
  }

  /** True only once per M press. */
  consumeMuteToggle() {
    return !!this.held['KeyM'];
  }

  consumeAll() {
    // Clear all press IDs and consumed tracking to prevent stale presses
    this.pressId = {};
    this.consumedPressId = {};
  }
}
