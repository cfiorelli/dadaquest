import { isDebugMode } from '../../utils/modes.js';

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
        if (isDebugMode() && (code === 'Space' || code === 'Enter')) {
          console.log('[INPUT-DEBUG] keydown:', code, 'pressId:', this.pressId[code]);
        }
      }
    });
    document.addEventListener('keyup', (e) => {
      const code = e.code;
      this.held[code] = false;
    });
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const code = 'PointerMain';
      if (!this.held[code]) {
        this.held[code] = true;
        this.pressId[code] = this._nextPressId++;
      }
    });
    document.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      this.held.PointerMain = false;
    });
    // Clear all held keys when the window loses focus so keys don't get stuck.
    window.addEventListener('blur', () => {
      this.held = {};
    });
  }

  /** Returns -1, 0, or 1. */
  getMoveX() {
    let x = 0;
    if (this.held['KeyA'] || this.held['ArrowLeft']) x -= 1;
    if (this.held['KeyD'] || this.held['ArrowRight']) x += 1;
    return x;
  }

  getMoveY() {
    let y = 0;
    if (this.held['KeyW'] || this.held['ArrowUp']) y += 1;
    if (this.held['KeyS'] || this.held['ArrowDown']) y -= 1;
    return y;
  }

  getEra5MoveX() {
    let x = 0;
    if (this.held.ArrowLeft) x -= 1;
    if (this.held.ArrowRight) x += 1;
    return x;
  }

  getEra5MoveY() {
    let y = 0;
    if (this.held.ArrowUp) y += 1;
    if (this.held.ArrowDown) y -= 1;
    return y;
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
    
    if (isNewPress && isDebugMode()) {
      console.log('[INPUT-DEBUG] consumeJumpPress: new press detected', { isHeld, pressId, alreadyConsumed });
    }
    if (isNewPress) this.consumedPressId[code] = pressId;
    
    return {
      edge: isNewPress,
      pressId,
    };
  }

  /** True only once per Enter press. */
  consumeEnter() {
    return !!this.held['Enter'];
  }

  getCameraYawInput() {
    let x = 0;
    if (this.held.BracketLeft) x -= 1;
    if (this.held.BracketRight) x += 1;
    return x;
  }

  /** True only once per M press. */
  consumeMuteToggle() {
    return !!this.held['KeyM'];
  }

  isSprintHeld() {
    return !!this.held['ShiftLeft'] || !!this.held['ShiftRight'];
  }

  consumeAbilityPress(code = 'KeyE') {
    const pressId = this.pressId[code] || 0;
    const alreadyConsumed = this.consumedPressId[code] === pressId;
    const isNewPress = pressId > 0 && !alreadyConsumed;
    if (isNewPress) this.consumedPressId[code] = pressId;
    return isNewPress;
  }

  consumeAttackPress() {
    return this.consumeAbilityPress('Enter')
      || this.consumeAbilityPress('NumpadEnter')
      || this.consumeAbilityPress('KeyA')
      || this.consumeAbilityPress('PointerMain');
  }

  consumeCameraRecenter() {
    return this.consumeAbilityPress('Backslash');
  }

  consumeAll() {
    if (isDebugMode()) {
      console.log('[INPUT-DEBUG] consumeAll() called - clearing all press IDs');
    }
    // Clear all press IDs and consumed tracking to prevent stale presses
    this.pressId = {};
    this.consumedPressId = {};
  }
}
