import { createPlaywrightConfig } from './playwright.shared.mjs';

export default createPlaywrightConfig({
  webServerCommand: 'npm run build && npm run preview:test',
  webServerReuseExisting: false,
  webServerTimeout: 90_000,
});
