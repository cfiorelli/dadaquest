import { defineConfig } from '@playwright/test';

export const PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4173';

const SWIFT_SHADER_ARGS = [
  '--use-gl=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

const DEFAULT_WORKERS = Math.max(1, Number.parseInt(process.env.PW_WORKERS || '1', 10) || 1);

export function createPlaywrightConfig({
  testMatch = ['**/*.spec.js'],
  testIgnore = ['**/screenshot.spec.js'],
  timeout = 30_000,
  workers = DEFAULT_WORKERS,
  use = {},
  webServerCommand,
  webServerReuseExisting = false,
  webServerTimeout = 60_000,
} = {}) {
  return defineConfig({
    testDir: './tests',
    testMatch,
    testIgnore,
    timeout,
    retries: 0,
    workers,
    use: {
      headless: true,
      baseURL: PLAYWRIGHT_BASE_URL,
      ...use,
    },
    projects: [
      {
        name: 'chromium',
        use: {
          browserName: 'chromium',
          launchOptions: {
            args: SWIFT_SHADER_ARGS,
          },
        },
      },
    ],
    webServer: webServerCommand ? {
      command: webServerCommand,
      url: PLAYWRIGHT_BASE_URL,
      reuseExistingServer: webServerReuseExisting,
      timeout: webServerTimeout,
      stdout: 'pipe',
      stderr: 'pipe',
    } : undefined,
  });
}
