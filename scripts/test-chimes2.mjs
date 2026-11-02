import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9346;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4333';
const VW = Number(process.env.VW ?? 1440);
const VH = Number(process.env.VH ?? 900);

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-chime2-' + Date.now()),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no devtools');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      } else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}, sid) {
    const id = ++this.id;
    this.ws.send(JSON.stringify(sid ? { id, method, params, sessionId: sid } : { id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const evaluate = (cdp, sid, expr) =>
  cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid).then((r) => r.result?.value);

try {
  const wsUrl = await waitForDevtools();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await cdp.send(`${domain}.enable`, {}, sessionId);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 700 }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
  await sleep(6500);

  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(4200);

  let auto = null;
  for (let i = 0; i < 24; i++) {
    auto = await evaluate(cdp, sessionId, `({
      ringing: document.querySelectorAll('[data-chime].is-ringing').length,
      chimes: document.querySelectorAll('[data-chime]').length,
      pointerEvents: getComputedStyle(document.querySelector('[data-chime]')).pointerEvents,
    })`);
    if (auto && auto.ringing > 0) break;
    await sleep(1000);
  }
  console.log('auto ring observed:', JSON.stringify(auto));

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'chimes.png'), Buffer.from(shot.data, 'base64'));

  await evaluate(cdp, sessionId, `document.querySelector('[data-toggle-playlist]')?.click()`);
  await sleep(500);
  const opened = await evaluate(cdp, sessionId, `document.querySelector('[data-playlist-pop]')?.className`);
  await evaluate(cdp, sessionId, `document.querySelector('[data-close-playlist]')?.click()`);
  await sleep(500);
  const closed = await evaluate(cdp, sessionId, `document.querySelector('[data-playlist-pop]')?.className`);
  console.log('popup open ->', opened, '| after close ->', closed);

  const exceptions = cdp.events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.text);
  console.log('exceptions:', exceptions.length ? JSON.stringify(exceptions.slice(0, 3)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
