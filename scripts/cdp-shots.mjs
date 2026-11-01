// CDP 截图：开场门 / 场景 / 整页 / 手机 / 夜间
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9337;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4323';

const shots = [
  { name: 'gate-desktop', mode: 'gate', width: 1440, height: 900, dpr: 2 },
  { name: 'scene-desktop', mode: 'scene', width: 1440, height: 900, dpr: 2 },
  { name: 'home-desktop-full', mode: 'full', width: 1440, height: 900, dpr: 1 },
  { name: 'scene-night', mode: 'scene-night', width: 1440, height: 900, dpr: 2 },
  { name: 'gate-mobile', mode: 'gate', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'scene-mobile', mode: 'scene', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'home-mobile-full', mode: 'full', width: 390, height: 844, dpr: 1.5, mobile: true },
];

await mkdir(OUT, { recursive: true });

const browser = spawn(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-cdp-home'),
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('devtools never came up');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function evaluate(cdp, sessionId, expression) {
  const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  return res.result?.value;
}

try {
  const wsUrl = await waitForDevtools();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  for (const shot of shots) {
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width: shot.width, height: shot.height, deviceScaleFactor: shot.dpr, mobile: Boolean(shot.mobile) },
      sessionId
    );
    await cdp.send(
      'Emulation.setEmulatedMedia',
      { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] },
      sessionId
    );

    // 清掉会话状态，保证每次都从开场门开始
    await cdp.send('Page.navigate', { url: BASE + '/' }, sessionId);
    await sleep(900);
    await evaluate(cdp, sessionId, `try { sessionStorage.clear(); localStorage.removeItem('mm333-theme'); } catch (e) {}`);
    await cdp.send('Page.reload', {}, sessionId);
    await evaluate(cdp, sessionId, `window.scrollTo(0, 0)`);
    await sleep(2200);

    if (shot.mode === 'gate') {
      await sleep(1200);
    } else {
      await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
      await sleep(1500);

      if (shot.mode === 'scene-night') {
        await evaluate(cdp, sessionId, `document.querySelector('[data-theme-toggle]')?.click()`);
        await sleep(900);
      }
    }

    // 整页截图：先把懒加载图片全部拉下来
    if (shot.mode === 'full') {
      await evaluate(
        cdp,
        sessionId,
        `(async () => {
          document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
          const step = window.innerHeight * 0.8;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 70));
          }
          window.scrollTo(0, 0);
          await Promise.all([...document.images].map((img) => img.decode?.().catch(() => {})));
          document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
          await new Promise((r) => setTimeout(r, 400));
        })()`
      );
      await sleep(600);
    }

    let clip;
    if (shot.mode === 'full') {
      const metrics = await cdp.send('Page.getLayoutMetrics', {}, sessionId);
      const size = metrics.cssContentSize ?? metrics.contentSize;
      clip = { x: 0, y: 0, width: Math.min(shot.width, Math.ceil(size.width)), height: Math.ceil(size.height), scale: 1 };
    } else {
      clip = { x: 0, y: 0, width: shot.width, height: shot.height, scale: 1 };
    }

    const { data } = await cdp.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: shot.mode === 'full', clip },
      sessionId
    );
    const file = path.join(OUT, `${shot.name}.png`);
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log(`saved ${shot.name}.png (${clip.width}x${clip.height})`);
  }

  ws.close();
} finally {
  browser.kill();
}
