import { createPlaywrightConfig } from './playwright.shared.mjs';

export default createPlaywrightConfig({
  testMatch: ['**/screenshot.spec.js'],
  testIgnore: [],
  timeout: 60_000,
  use: {
    viewport: { width: 800, height: 500 },
  },
  webServerCommand: 'npm run build && npm run preview:test',
  webServerReuseExisting: false,
  webServerTimeout: 90_000,
});
