// Screenshot helper for the Leonida Trophy Guide: drives the installed
// Chromium over CDP (no dependency to install), seeds a demo checklist in
// localStorage the way a real reader's browser would hold it, then captures
// four JPEGs of the app served from app/ on localhost. Run from the repo root:
//   node serve.ts --port 8123 & node tools/shots.mjs
// Screenshots land in screenshots/ and replace the starter's.
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = 8123;
const BASE = 'file:///home/hatch/workspace/makefun-token-radar/campaign/gta6-trophy-guide-01/work/app/index.html';
const CHROME = '/opt/meta-chromium/chrome';
const SHOTS = 'screenshots/';
const SEED = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Trust', 'Cunning Stunts', 'Master of None', 'Earn Cash, Not Kudos', 'Stick Fiddler', 'Positive Mental Attitude', 'Whip It Good', 'The Goodtime State', 'Treat Yo Self', 'On the Spot'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:9222/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error('no CDP page target');
}

let messageId = 0;
const pending = new Map();
let ws;
function send(method, params = {}) {
  const id = ++messageId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function shot(name, setup) {
  await send('Page.navigate', { url: BASE });
  await sleep(1500);
  console.log(name, 'at', await evaluate(`location.href`));
  await evaluate(`localStorage.setItem('gta6-trophy-checklist-v2', JSON.stringify(${JSON.stringify(SEED)})); localStorage.setItem('gta6-trophy-spoiler', '0');`);
  await send('Page.navigate', { url: BASE });
  await sleep(900);
  if (setup) await evaluate(setup);
  await sleep(600);
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(SHOTS + name, Buffer.from(data, 'base64'));
  console.log('wrote', SHOTS + name);
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--remote-debugging-port=9222', '--window-size=1280,800', '--user-data-dir=/tmp/gta6-shot-profile',
  '--hatch-webgl-allowed-domains-file=/tmp/webgl-policy.txt',
  '--hatch-webgl-allowed-domains-sha256=c5c85869591ff8b3491450f49cfd62912c6dd41e5cecada4e831191d3185035e',
  'about:blank',
], { stdio: 'ignore' });

try {
  const target = await getTarget();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result);
      pending.delete(msg.id);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  await shot('1-checklist-guide.jpg', `document.querySelector('li[data-id="17"] button').click(); window.scrollTo(0,0);`);
  await shot('2-roadmap.jpg', `document.querySelector('button[data-view="roadmap"]').click(); window.scrollTo(0,0);`);
  await shot('3-missable.jpg', `document.querySelector('button[data-view="missable"]').click(); window.scrollTo(0,0);`);
  await shot('4-spoiler.jpg', `document.getElementById('spoiler').click(); window.scrollTo(0,0);`);
  console.log('all screenshots done');
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
