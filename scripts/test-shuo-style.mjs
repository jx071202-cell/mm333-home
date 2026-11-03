import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9350;
const OUT = path.resolve(process.argv[2] ?? 'shots');
const BASE = process.argv[3] ?? 'http://127.0.0.1:4346';

await mkdir(OUT, { recursive: true });

const browser = spawn(EDGE, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + path.join(process.env.TEMP ?? '.', 'edge-style-' + Date.now()),
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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1500, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: BASE + '/shuoshuo/' }, sessionId);
  await sleep(6000);
  await evaluate(cdp, sessionId, `document.querySelector('[data-gate]')?.click()`);
  await sleep(1800);

  const publish = async (title, body) => {
    const result = await evaluate(cdp, sessionId, `(() => {
      const t = document.querySelector('[data-shuo-title]');
      const b = document.querySelector('[data-shuo-text]');
      if (!t || !b) return 'no-editor';
      t.value = ${JSON.stringify(title)};
      b.value = ${JSON.stringify(body)};
      document.querySelector('[data-shuo-editor]').requestSubmit();
      return 'ok';
    })()`);
    await sleep(800);
    return result;
  };

  console.log('publish1:', await publish('今天的风铃', '今天风铃响了好几次，像是有人路过。\n\n**记一笔**'));
  console.log('publish2:', await publish('', '傍晚去便利店，外面的云是粉色的。'));
  console.log('publish3:', await publish('循环', '《浴室》单曲循环了一个下午，雨也没停。'));

  const state = await evaluate(cdp, sessionId, `({
    entries: document.querySelectorAll('.shuo-entry').length,
    firstTitle: document.querySelector('.shuo-entry__title')?.textContent,
    firstAvatar: document.querySelector('.shuo-entry__avatar')?.getAttribute('src')?.slice(0, 60),
    twoCols: getComputedStyle(document.querySelector('.shuo-list')).columnCount,
    titleColor: getComputedStyle(document.querySelector('.shuo-page__title')).color,
  })`);
  console.log('feed:', JSON.stringify(state));

  await evaluate(cdp, sessionId, `document.querySelector('[data-shuo-poke]')?.click()`);
  await sleep(350);
  const poke = await evaluate(cdp, sessionId, `({
    count: document.querySelector('[data-shuo-poke-count]')?.textContent,
    sparkles: document.querySelectorAll('.shuo-hero__sparkle').length,
    pokedClass: document.querySelector('[data-shuo-poke]')?.className,
  })`);
  console.log('poke:', JSON.stringify(poke));

  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
  await writeFile(path.join(OUT, 'shuo-styled.png'), Buffer.from(data, 'base64'));
  console.log('saved shuo-styled.png');

  const errors = cdp.events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params.exceptionDetails?.text + ' ' + (e.params.exceptionDetails?.exception?.description || '').slice(0, 120));
  console.log('exceptions:', errors.length ? JSON.stringify(errors.slice(0, 3)) : 'none');

  ws.close();
} finally {
  browser.kill();
}
