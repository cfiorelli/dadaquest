import { defineConfig } from '@playwright/test';

const SWIFT_SHADER_ARGS = [
  '--use-gl=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/screenshot.spec.js'],
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 800, height: 500 },
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
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
