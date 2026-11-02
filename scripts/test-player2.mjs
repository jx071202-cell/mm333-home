import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9345;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4332';
const VW = Number(process.env.VW ?? 1440);
const VH = Number(process.env.VH ?? 900);

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-player2-' + Date.now()),
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 700 }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
  await sleep(6000);

  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(1500);

  await evaluate(cdp, sessionId, `document.querySelector('[data-toggle-playlist]')?.click()`);
  await sleep(400);
  const probe = await evaluate(cdp, sessionId, `({
    songs: document.querySelectorAll('[data-song]').length,
    playBtns: document.querySelectorAll('[data-play-song]').length,
    audio: !!document.querySelector('[data-audio]'),
    folia: !!document.querySelector('[data-folia]'),
    popClass: document.querySelector('[data-playlist-pop]')?.className,
  })`);
  console.log('probe:', JSON.stringify(probe));
  await evaluate(cdp, sessionId, `document.querySelector('[data-play-song="0"]')?.click()`);
  await sleep(9000);

  const state = await evaluate(cdp, sessionId, `(() => {
    const a = document.querySelector('[data-audio]');
    return {
      paused: a?.paused,
      currentTime: Math.round((a?.currentTime || 0) * 10) / 10,
      duration: Math.round((a?.duration || 0) * 10) / 10,
      src: a?.currentSrc?.slice(0, 80),
      error: a?.error ? a.error.code : null,
      title: document.querySelector('[data-player-title]')?.textContent,
      sub: document.querySelector('[data-player-sub]')?.textContent,
      cover: document.querySelector('[data-player-cover]')?.getAttribute('src')?.slice(0, 60),
      coverW: document.querySelector('[data-player-cover]')?.naturalWidth,
      foliaCoverW: document.querySelector('[data-folia-cover]')?.naturalWidth,
      barsPlaying: document.querySelector('[data-player]')?.className,
      lyricLines: document.querySelectorAll('.folia__line').length,
      activeLyric: document.querySelector('.folia__line.is-active')?.textContent,
      total: document.querySelector('[data-time-total]')?.textContent,
      cur: document.querySelector('[data-time-current]')?.textContent,
    };
  })()`);
  console.log('player:', JSON.stringify(state, null, 2));

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'bar.png'), Buffer.from(shot.data, 'base64'));

  await evaluate(cdp, sessionId, `document.querySelector('[data-folia-open]')?.click()`);
  await sleep(1200);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'folia.png'), Buffer.from(shot.data, 'base64'));

  const exceptions = cdp.events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails?.text + ' ' + (e.params.exceptionDetails?.exception?.description || '').slice(0, 200));
  console.log('exceptions:', exceptions.length ? JSON.stringify(exceptions.slice(0, 3)) : 'none');
  const failures = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params);
  const logs = cdp.events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    .map((e) => e.params.entry.text.slice(0, 160));
  console.log('network failures:', failures.length ? JSON.stringify(failures.slice(0, 4)) : 'none');
  console.log('errors:', logs.length ? JSON.stringify(logs.slice(0, 4)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
