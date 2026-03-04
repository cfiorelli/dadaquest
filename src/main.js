import { isTestMode } from './utils/testMode.js';
import { boot } from './web3d/boot.js';

// Boot Babylon.js engine
boot({ isTestMode }).catch((err) => {
  console.error('Failed to boot game:', err);
});
