import { createPlaywrightConfig } from './playwright.shared.mjs';

export default createPlaywrightConfig({
  webServerCommand: 'npm run dev:test',
  webServerReuseExisting: true,
  webServerTimeout: 45_000,
});
