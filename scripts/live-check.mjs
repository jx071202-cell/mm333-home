import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9342;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const URL = process.argv[3] ?? 'https://jx071202-cell.github.io/mm333-home/';

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-live-' + Date.now()),
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
  for (const domain of ['Page', 'Runtime', 'Network', 'Log']) {
    await cdp.send(`${domain}.enable`, {}, sessionId);
  }
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);

  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: URL }, sessionId);

  let state = null;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    state = await evaluate(cdp, sessionId, `(() => {
      const v = document.querySelector('[data-gate-video]');
      if (!v) return { video: false };
      return {
        video: true,
        readyState: v.readyState,
        currentTime: v.currentTime,
        duration: v.duration,
        muted: v.muted,
        paused: v.paused,
        w: v.videoWidth,
        h: v.videoHeight,
        buffered: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0,
        soundBtn: document.querySelector('[data-gate-sound]')?.className || null,
      };
    })()`);
    console.log(`t+${((Date.now() - t0) / 1000).toFixed(0)}s`, JSON.stringify(state));
    if (state.video && state.readyState >= 2 && state.currentTime > 1.5) break;
  }

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'live-gate.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved live-gate.png');

  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(1800);
  await evaluate(cdp, sessionId, `document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'))`);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'live-home.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved live-home.png');

  await evaluate(cdp, sessionId, `document.querySelector('[data-toggle-playlist]')?.click()`);
  await sleep(600);
  await evaluate(cdp, sessionId, `document.querySelector('[data-play-song="0"]')?.click()`);
  await sleep(4500);
  const playerState = await evaluate(cdp, sessionId, `(() => {
    const a = document.querySelector('[data-audio]');
    return {
      paused: a?.paused, currentTime: a?.currentTime, duration: a?.duration,
      error: a?.error ? a.error.code : null,
      title: document.querySelector('[data-player-title]')?.textContent,
      bar: document.querySelector('.player-bar')?.className,
    };
  })()`);
  console.log('player:', JSON.stringify(playerState));
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'live-player.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved live-player.png');

  const failures = cdp.events
    .filter((e) => e.method === 'Network.loadingFailed')
    .map((e) => e.params);
  const logs = cdp.events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level !== 'info')
    .map((e) => `${e.params.entry.level}: ${e.params.entry.text}`.slice(0, 160));
  console.log('network failures:', failures.length ? JSON.stringify(failures.slice(0, 5)) : 'none');
  console.log('console/log warnings:', logs.length ? JSON.stringify(logs.slice(0, 5)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
