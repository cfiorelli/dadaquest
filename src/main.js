import { isTestMode } from './utils/testMode.js';
import { boot } from './web3d/boot.js';

// Read ?level=N from URL (default 1)
const _levelParam = new URLSearchParams(window.location.search).get('level');
const levelId = _levelParam === '2' ? 2 : 1;

// Boot Babylon.js engine
boot({ isTestMode, levelId }).catch((err) => {
  console.error('Failed to boot game:', err);
});
