#!/usr/bin/env node
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  
  const page = await browser.newPage();
  const jumpLogs = [];
  
  page.on('console', (msg) => {
    const txt = msg.text();
    if (txt.includes('[JUMP TRACE]')) {
      console.log(txt);
      jumpLogs.push(txt);
    }
  });
  
  console.log('Navigating to http://127.0.0.1:5173/?debug=1');
  await page.goto('http://127.0.0.1:5173/?debug=1');
  
  console.log('Waiting 1 second for page load...');
  await page.waitForTimeout(1000);
  
  console.log('Pressing Enter to start game...');
  await page.keyboard.press('Enter');
  
  console.log('Waiting 12 seconds idle (hands off keyboard)...');
  await page.waitForTimeout(12000);
  
  const lastJump = await page.evaluate(() => window.__DADA_DEBUG__?.lastJump);
  const playerY = await page.evaluate(() => window.__DADA_DEBUG__?.playerY);
  
  console.log('\n=== RESULTS ===');
  console.log('Jump logs captured:', jumpLogs.length);
  console.log('Player Y:', playerY);
  console.log('\n=== LAST JUMP DATA ===');
  console.log(JSON.stringify(lastJump, null, 2));
  
  await browser.close();
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
