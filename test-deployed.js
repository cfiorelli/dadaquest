#!/usr/bin/env node
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  
  const page = await browser.newPage();
  const jumpLogs = [];
  
  page.on('console', (msg) => {
    const txt = msg.text();
    console.log('[BROWSER]', txt);
    if (txt.includes('[JUMP TRACE]')) {
      jumpLogs.push(txt);
    }
  });
  
  console.log('Navigating to https://cfiorelli.github.io/dadaquest/?debug=1');
  await page.goto('https://cfiorelli.github.io/dadaquest/?debug=1');
  
  console.log('Waiting 2 seconds for page load...');
  await page.waitForTimeout(2000);
  
  console.log('Pressing Enter to start game...');
  await page.keyboard.press('Enter');
  
  console.log('Waiting 12 seconds idle (hands off keyboard)...');
  await page.waitForTimeout(12000);
  
  const lastJump = await page.evaluate(() => window.__DADA_DEBUG__?.lastJump);
  const playerY = await page.evaluate(() => window.__DADA_DEBUG__?.playerY);
  const sceneKey = await page.evaluate(() => window.__DADA_DEBUG__?.sceneKey);
  
  console.log('\n=== RESULTS ===');
  console.log('Scene:', sceneKey);
  console.log('Jump logs captured:', jumpLogs.length);
  console.log('Player Y:', playerY);
  console.log('\n=== ALL JUMP TRACES ===');
  jumpLogs.forEach((log, i) => console.log(`[${i+1}]`, log));
  console.log('\n=== LAST JUMP DATA ===');
  console.log(JSON.stringify(lastJump, null, 2));
  
  await browser.close();
})().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
