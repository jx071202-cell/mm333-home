import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9341;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4326';
const W = Number(process.argv[4] ?? 1440);
const H = Number(process.argv[5] ?? 900);

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-cdp-gate-' + Date.now()),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wait() {
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
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
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
  const wsUrl = await wait();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
  await sleep(7000);

  const info = await evaluate(cdp, sessionId, `(() => {
    const v = document.querySelector('[data-gate-video]');
    const m = document.querySelector('.gate__mask');
    const r = m ? m.getBoundingClientRect() : null;
    return {
      videoW: v?.videoWidth, videoH: v?.videoHeight,
      readyState: v?.readyState, muted: v?.muted,
      maskRect: r ? { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width) } : null,
      viewport: { w: innerWidth, h: innerHeight },
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));

  await evaluate(cdp, sessionId, `(() => { const v = document.querySelector('[data-gate-video]'); if (v) { v.pause(); v.currentTime = 5; } })()`);
  await sleep(1500);
  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'gate-t5.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved gate-t5.png');

  await evaluate(cdp, sessionId, `(() => { const v = document.querySelector('[data-gate-video]'); if (v) v.currentTime = 25; })()`);
  await sleep(1500);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'gate-t25.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved gate-t25.png');

  await evaluate(cdp, sessionId, `(() => { const v = document.querySelector('[data-gate-video]'); if (v) v.currentTime = 70; })()`);
  await sleep(1500);
  shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'gate-t70.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved gate-t70.png');

  ws.close();
} finally {
  browser.kill();
}
