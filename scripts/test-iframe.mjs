import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9343;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4327';

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-iframe-' + Date.now()),
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
      } else if (m.method) {
        this.events.push(m);
      }
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
  await sleep(6000);

  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(1500);
  await evaluate(cdp, sessionId, `document.querySelector('[data-toggle-playlist]')?.click()`);
  await sleep(500);
  await evaluate(cdp, sessionId, `document.querySelector('[data-play-song="0"]')?.click()`);
  await sleep(6000);

  const state = await evaluate(cdp, sessionId, `(() => {
    const f = document.querySelector('[data-player-frame]');
    return {
      iframe: !!f,
      src: f ? f.src : null,
      rect: f ? (() => { const r = f.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; })() : null,
      bar: document.querySelector('.player-bar')?.className,
      title: document.querySelector('[data-player-title]')?.textContent,
      barRect: (() => { const b = document.querySelector('.player-bar').getBoundingClientRect(); return { top: Math.round(b.top), height: Math.round(b.height), bottom: Math.round(b.bottom) }; })(),
      barComputed: (() => { const c = getComputedStyle(document.querySelector('.player-bar')); return { flexWrap: c.flexWrap, alignItems: c.alignItems, height: c.height, position: c.position }; })(),
      active: document.querySelectorAll('.playlist__item.is-active').length,
    };
  })()`);
  console.log(JSON.stringify(state, null, 2));

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'iframe-player.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved iframe-player.png');

  const failures = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params);
  const logs = cdp.events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level !== 'info')
    .map((e) => `${e.params.entry.level}: ${e.params.entry.text}`.slice(0, 140));
  console.log('network failures:', failures.length ? JSON.stringify(failures.slice(0, 4)) : 'none');
  console.log('log warnings:', logs.length ? JSON.stringify(logs.slice(0, 4)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
