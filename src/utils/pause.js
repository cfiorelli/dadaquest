import Phaser from 'phaser';
import { isTestMode } from './testMode.js';

export function registerPauseHotkey(scene) {
  if (isTestMode) return;
  if (!scene?.input?.keyboard) return;

  const escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

  const onEsc = () => {
    if (!scene.scene?.isActive(scene.scene.key)) return;
    if (scene.scene.isActive('PauseScene')) return;
    if (scene.scene.key === 'PauseScene') return;

    scene.scene.pause(scene.scene.key);
    scene.scene.launch('PauseScene', { callerKey: scene.scene.key });
  };

  escKey.on('down', onEsc);
  scene.events.once('shutdown', () => escKey.off('down', onEsc));
  scene.events.once('destroy', () => escKey.off('down', onEsc));
}
