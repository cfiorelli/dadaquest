// @ts-check
import { test, expect } from '@playwright/test';

test('@fast full run reaches EndScene in test mode without console errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('Console error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.log('Page error:', err.message);
  });

  await page.goto('http://127.0.0.1:4173/?test=1');

  // Wait for EndScene — poll window.__DADA_DEBUG__.sceneKey
  await expect.poll(
    () => page.evaluate(() => window.__DADA_DEBUG__?.sceneKey),
    { timeout: 15_000, message: 'Expected sceneKey to be EndScene within 15 s' }
  ).toBe('EndScene');

  // Assert no console errors or uncaught exceptions occurred
  if (pageErrors.length > 0) {
    throw new Error(`Page errors: ${pageErrors.join('\n')}`);
  }
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors: ${consoleErrors.join('\n')}`);
  }
});
