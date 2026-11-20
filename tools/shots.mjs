// Screenshot helper for the Leonida Trophy Guide: serves app/ on localhost
// with serve.ts, drives the Playwright headless_shell Chromium already on
// this VM (the Hatch-patched chrome needs a WebGL domain policy file this
// machine no longer holds, and this app uses no WebGL), seeds a demo
// checklist in localStorage the way a real reader's browser would hold it,
// then captures four JPEGs of the app. Run from the repo root:
//   node tools/shots.mjs
// Screenshots land in screenshots/ and replace the starter's.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire('/home/hatch/workspace/tmp-shot-tools/package.json');
const { chromium } = require('playwright');

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}/`;
const EXE = '/home/hatch/workspace/tmp-shot-tools/pw-browsers/chrome-linux/headless_shell';
const SEED = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Trust', 'Cunning Stunts', 'Master of None', 'Earn Cash, Not Kudos', 'Stick Fiddler', 'Positive Mental Attitude', 'Whip It Good', 'The Goodtime State', 'Treat Yo Self', 'On the Spot'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error('serve.ts did not answer on ' + BASE);
}

const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { stdio: 'ignore' });
await waitForServer();

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate((seed) => {
    localStorage.setItem('gta6-trophy-checklist-v2', JSON.stringify(seed));
    localStorage.setItem('gta6-trophy-spoiler', '0');
  }, SEED);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  await page.locator('li[data-id="17"] button').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/1-checklist-guide.jpg', type: 'jpeg', quality: 82 });
  console.log('wrote screenshots/1-checklist-guide.jpg');

  await page.locator('button[data-view="roadmap"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/2-roadmap.jpg', type: 'jpeg', quality: 82 });
  console.log('wrote screenshots/2-roadmap.jpg');

  await page.locator('button[data-view="missable"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/3-missable.jpg', type: 'jpeg', quality: 82 });
  console.log('wrote screenshots/3-missable.jpg');

  await page.locator('button[data-view="checklist"]').click();
  await page.locator('#spoiler').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/4-spoiler.jpg', type: 'jpeg', quality: 82 });
  console.log('wrote screenshots/4-spoiler.jpg');

  console.log('all screenshots done');
} finally {
  await browser.close();
  server.kill();
}
