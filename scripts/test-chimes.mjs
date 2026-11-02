import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9344;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4328';
const VW = Number(process.env.VW ?? 1440);
const VH = Number(process.env.VH ?? 900);

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-chime-' + Date.now()),
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
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (() => {
        const Orig = window.AudioContext || window.webkitAudioContext;
        window.__audioContexts = [];
        if (!Orig) return;
        const Wrapped = function (...args) {
          const instance = new Orig(...args);
          window.__audioContexts.push(instance);
          return instance;
        };
        Wrapped.prototype = Orig.prototype;
        window.AudioContext = Wrapped;
        window.webkitAudioContext = Wrapped;
      })();
    `,
  }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 700 }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
  await sleep(6500);

  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(1800);

  const before = await evaluate(cdp, sessionId, `({
    chimes: document.querySelectorAll('[data-chime]').length,
    rects: [...document.querySelectorAll('[data-chime]')].map(el => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }),
    contexts: window.__audioContexts ? window.__audioContexts.length : -1,
  })`);
  console.log('before click:', JSON.stringify(before));

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'chimes.png'), Buffer.from(shot.data, 'base64'));

  await evaluate(cdp, sessionId, `document.querySelector('[data-chime]')?.click()`);
  await sleep(500);

  const after = await evaluate(cdp, sessionId, `({
    contexts: window.__audioContexts ? window.__audioContexts.length : -1,
    states: window.__audioContexts ? window.__audioContexts.map(c => c.state) : [],
    ringing: document.querySelectorAll('[data-chime].is-ringing').length,
  })`);
  console.log('after click:', JSON.stringify(after));

  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'chimes-ring.png'), Buffer.from(shot.data, 'base64'));

  const failures = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params);
  const logs = cdp.events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    .map((e) => e.params.entry.text.slice(0, 140));
  console.log('network failures:', failures.length ? JSON.stringify(failures.slice(0, 3)) : 'none');
  console.log('errors:', logs.length ? JSON.stringify(logs.slice(0, 3)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
