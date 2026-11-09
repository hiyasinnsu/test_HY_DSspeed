// Headless smoke test: boots the real page in Chrome, plays a little, and
// captures screenshots. Runs from tests/browser.test.mjs.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './serve.mjs';

const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 8123;
const DEBUG_PORT = 9333;
export const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, timeout = 15000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      lastError = err;
    }
    await sleep(150);
  }
  throw new Error(`timeout waiting for ${url}: ${lastError}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.errors = [];
    ws.onmessage = (ev) => this.onMessage(ev);
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('websocket failed'));
    });
    return new Cdp(ws);
  }

  onMessage(ev) {
    const msg = JSON.parse(ev.data);
    if (msg.id && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      this.errors.push(`${d.text} ${d.exception?.description || ''}`.trim());
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      this.errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      this.errors.push(`${msg.params.entry.text} (${msg.params.entry.url || ''})`);
    }
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result.value;
  }

  async shot(file) {
    const res = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(OUT, file), Buffer.from(res.data, 'base64'));
  }
}

export async function runBrowserCheck() {
  const server = await createServer(PORT);
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-speed-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    '--window-size=430,900',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  const report = { ok: false };
  try {
    await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const target = await (await fetch(
      `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(`http://127.0.0.1:${PORT}/`)}`,
      { method: 'PUT' },
    )).json();
    await sleep(300);
    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 430, height: 900, deviceScaleFactor: 2, mobile: false,
    });
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(1800);

    report.title = await cdp.eval('document.title');
    report.boot = await cdp.eval('!!window.__dsDebug');
    report.canvas = await cdp.eval('(() => { const c = document.getElementById("game"); return { w: c.width, h: c.height, css: Math.round(c.getBoundingClientRect().width) }; })()');
    await cdp.shot('shot-title.png');

    await cdp.eval('document.getElementById("btn-start").click()');
    await sleep(1200);
    report.afterStart = await cdp.eval('({ mode: __dsDebug.mode, exists: !!__dsDebug.world, bullets: __dsDebug.world ? __dsDebug.world.bulletsE.count : -1 })');

    // Keep the test ship alive so the run exercises the game, not the death loop.
    await cdp.eval('__dsDebug.world.player.invuln = 1e9');

    const rect = await cdp.eval('(() => { const r = document.getElementById("game").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()');
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h * 0.8;
    const before = await cdp.eval('__dsDebug.world.player.x');
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1, pointerType: 'mouse' });
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + i * 10, y: cy, button: 'left', buttons: 1, pointerType: 'mouse' });
      await sleep(16);
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 80, y: cy, button: 'left', clickCount: 1, pointerType: 'mouse' });
    await sleep(300);
    report.dragMovedBy = await cdp.eval(`Math.round(__dsDebug.world.player.x - ${before})`);

    await sleep(10000);
    report.mid = await cdp.eval('({ mode: __dsDebug.mode, bullets: __dsDebug.world.bulletsE.count, enemies: __dsDebug.world.enemies.length, score: __dsDebug.world.score, time: +__dsDebug.world.time.toFixed(1), lives: __dsDebug.world.lives })');
    await cdp.shot('shot-play.png');

    report.fps = await cdp.eval(`new Promise((resolve) => {
      let frames = 0;
      const t0 = performance.now();
      const tick = () => {
        frames++;
        if (performance.now() - t0 > 1500) resolve(Math.round(frames / ((performance.now() - t0) / 1000)));
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    })`);

    await cdp.eval('document.getElementById("btn-bomb").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))');
    await sleep(500);
    await cdp.shot('shot-bomb.png');
    report.afterBomb = await cdp.eval('({ bombs: __dsDebug.world.bombs, bombActive: !!__dsDebug.world.bomb })');

    await cdp.eval('document.getElementById("btn-pause").click()');
    await sleep(300);
    report.paused = await cdp.eval('({ mode: __dsDebug.mode, pauseVisible: !document.getElementById("screen-pause").classList.contains("hidden") })');
    await cdp.shot('shot-pause.png');

    await cdp.eval('document.getElementById("btn-resume").click()');
    await sleep(500);
    report.resumed = await cdp.eval('__dsDebug.mode');
    await cdp.eval('__dsDebug.world.player.invuln = 1e9');

    await cdp.eval('__dsDebug.world.finish(true)');
    await sleep(2200);
    report.result = await cdp.eval('({ mode: __dsDebug.mode, visible: !document.getElementById("screen-result").classList.contains("hidden"), kicker: document.getElementById("result-kicker").textContent, score: document.getElementById("result-score").textContent })');
    await cdp.shot('shot-result.png');

    // Fast-forward a fresh run to the boss so the bar and spell card render.
    await cdp.eval('document.getElementById("btn-retry").click()');
    await sleep(400);
    report.boss = await cdp.eval(`(() => {
      const w = __dsDebug.world;
      for (let i = 0; i < 60 * 80 && w.state === 'playing'; i++) {
        w.player.invuln = 1e9;
        if (w.boss || w.midboss) w.player.x = (w.boss || w.midboss).x;
        w.tick();
        w.events.length = 0;
      }
      return { hasBoss: !!w.boss, state: w.boss ? w.boss.state : null, phase: w.boss ? w.boss.phase : -1, bullets: w.bulletsE.count, time: +w.time.toFixed(1) };
    })()`);
    await sleep(400);
    await cdp.shot('shot-boss.png');

    report.errors = cdp.errors;
    report.ok = Boolean(report.boot)
      && Boolean(report.afterStart && report.afterStart.exists)
      && report.dragMovedBy > 5
      && report.mid && report.mid.bullets > 0
      && report.afterBomb && report.afterBomb.bombActive === true
      && report.paused && report.paused.pauseVisible === true
      && report.resumed === 'playing'
      && report.result && report.result.visible === true
      && report.result.kicker === 'STAGE CLEAR'
      && report.boss && report.boss.hasBoss === true && report.boss.state === 'fight'
      && report.errors.length === 0
      && report.fps >= 40;
  } finally {
    chrome.kill();
    server.close();
    try {
      fs.rmSync(userDir, { recursive: true, force: true });
    } catch {
      /* chromium sometimes keeps a handle on its profile; harmless */
    }
  }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBrowserCheck().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
