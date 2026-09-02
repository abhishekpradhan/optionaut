/**
 * Records the README demo (docs/demo.gif + docs/demo.mp4) by flying the
 * real instrument in a headless Chrome over the DevTools protocol — no
 * screen recorder, no extra dependencies, same result every run.
 *
 *   npm run build && npm run start          # production server on :3000
 *   node scripts/record-demo.mjs            # → docs/demo.gif, docs/demo.mp4
 *
 * Needs Google Chrome in /Applications and ffmpeg on PATH. Frames are
 * captured from the page's own compositor (Page.screencast) with their
 * real timestamps, so holds and drags keep their true pacing.
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const OUT = path.resolve("docs");
const WIDTH = 1600;
const HEIGHT = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

async function launchChrome(profile, port = 9333) {
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--mute-audio",
      "--force-device-scale-factor=1",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let targets = null;
  for (let i = 0; i < 150 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(100);
    }
  }
  const page = targets?.find((t) => t.type === "page");
  if (!page) {
    proc.kill();
    throw new Error("Chrome did not expose a page target");
  }
  return { proc, wsUrl: page.webSocketDebuggerUrl };
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (!p) return;
        if (msg.error) p.rej(new Error(msg.error.message));
        else p.res(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
      }
    };
  }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error("websocket error"));
    });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
  async evaluate(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result.value;
  }
  mouse(type, x, y, extra = {}) {
    return this.send("Input.dispatchMouseEvent", { type, x, y, button: "left", ...extra });
  }
  async drag(from, to, { steps = 30, ms = 800 } = {}) {
    await this.mouse("mouseMoved", from.x, from.y, { button: "none" });
    await sleep(40);
    await this.mouse("mousePressed", from.x, from.y, { clickCount: 1, buttons: 1 });
    for (let i = 1; i <= steps; i++) {
      const t = easeInOut(i / steps);
      await this.mouse("mouseMoved", from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, { buttons: 1 });
      await sleep(ms / steps);
    }
    await this.mouse("mouseReleased", to.x, to.y, { clickCount: 1, buttons: 0 });
  }
  async key(key, code) {
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, text: key, unmodifiedText: key });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
  }
  /** navigate, then wait for the cockpit's snapshot (the dial thumbs appear) */
  async open(url) {
    await this.send("Page.navigate", { url });
    for (let i = 0; i < 200; i++) {
      const ready = await this.evaluate(
        "document.querySelectorAll('[data-slot=slider-thumb]').length >= 3",
      ).catch(() => false);
      if (ready) return;
      await sleep(50);
    }
    throw new Error("cockpit never settled");
  }
  /** strike pills on the payoff chart */
  pills() {
    return this.evaluate(`[...document.querySelectorAll('g[role=slider]')].map((g) => {
      const r = g.getBoundingClientRect();
      return { label: g.getAttribute('aria-label'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })`);
  }
  /** the three dials (price, time, volatility): range + geometry */
  dials() {
    return this.evaluate(`[...document.querySelectorAll('[data-slot=slider-thumb]')].map((t, i) => {
      const inp = t.querySelector('input'); const r = t.getBoundingClientRect();
      const tr = document.querySelectorAll('[data-slot=slider-track]')[i].getBoundingClientRect();
      return { min: +inp.min, max: +inp.max, x: r.x + r.width / 2, y: r.y + r.height / 2,
               w: r.width, left: tr.x, right: tr.x + tr.width };
    })`);
  }
  blur() {
    return this.evaluate("document.activeElement && document.activeElement.blur(), true");
  }
}

/** where a dial's thumb sits for a value (thumbAlignment="edge") */
const xFor = (d, v) => d.left + d.w / 2 + ((v - d.min) / (d.max - d.min)) * (d.right - d.left - d.w);

async function record(work) {
  const chrome = await launchChrome(path.join(work, "profile"));
  const frames = [];
  try {
    const c = await CDP.connect(chrome.wsUrl);
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await c.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
    });
    let n = 0;
    c.on("Page.screencastFrame", (p) => {
      const file = path.join(work, `f${String(++n).padStart(5, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(p.data, "base64"));
      frames.push({ file, ts: p.metadata.timestamp });
      c.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
    });

    await c.open(`${ORIGIN}/lab/AURION/iron-condor`);
    await c.send("Page.startScreencast", {
      format: "jpeg", quality: 95, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1,
    });
    const t0 = Date.now();
    const at = (ms) => sleep(Math.max(0, t0 + ms - Date.now()));

    // the cockpit settles; the intro mantra appears
    await at(2300);

    // drag strikes: pull the short call in, push the put wing out
    const pill = async (label) => (await c.pills()).find((p) => p.label.startsWith(label));
    let p = await pill("Short call");
    await c.drag(p, { x: p.x - 118, y: p.y }, { steps: 30, ms: 900 });
    await sleep(350);
    p = await pill("Long put");
    await c.drag(p, { x: p.x - 118, y: p.y }, { steps: 30, ms: 900 });
    await at(5000);

    // the dials: price up into the tent, volatility crushed, time to expiry
    let d = await c.dials();
    await c.drag(d[0], { x: xFor(d[0], 441), y: d[0].y }, { steps: 30, ms: 900 });
    await at(6600);
    d = await c.dials();
    await c.drag(d[2], { x: xFor(d[2], 0.6), y: d[2].y }, { steps: 30, ms: 900 });
    await at(8300);
    d = await c.dials();
    await c.drag(d[1], { x: xFor(d[1], d[1].max), y: d[1].y }, { steps: 70, ms: 3000 });
    await at(12300);

    // the other two views, then home to the payoff
    await c.blur();
    await c.key("m", "KeyM");
    await at(15200);
    await c.key("h", "KeyH");
    await at(18400);
    await c.key("p", "KeyP");
    await at(20200);
    await c.send("Page.stopScreencast");
    await sleep(300);
  } finally {
    chrome.proc.kill();
  }
  return frames.sort((a, b) => a.ts - b.ts);
}

function encode(frames, work) {
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i + 1 < frames.length ? frames[i + 1].ts - frames[i].ts : 0.8;
    list.push(`file '${frames[i].file}'`, `duration ${Math.max(dur, 0.001).toFixed(4)}`);
  }
  list.push(`file '${frames.at(-1).file}'`);
  const concat = path.join(work, "frames.txt");
  fs.writeFileSync(concat, list.join("\n") + "\n");
  const input = ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concat];
  execFileSync("ffmpeg", [
    ...input, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18",
    "-preset", "medium", "-movflags", "+faststart", path.join(OUT, "demo.mp4"),
  ]);
  execFileSync("ffmpeg", [
    ...input, "-vf",
    "fps=15,scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];" +
      "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
    "-loop", "0", path.join(OUT, "demo.gif"),
  ]);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "optionaut-demo-"));
const frames = await record(work);
const span = frames.at(-1).ts - frames[0].ts;
console.log(`${frames.length} frames over ${span.toFixed(1)}s`);
encode(frames, work);
fs.rmSync(work, { recursive: true, force: true });
for (const f of ["demo.gif", "demo.mp4"]) {
  console.log(`${f}: ${(fs.statSync(path.join(OUT, f)).size / 1024 / 1024).toFixed(1)} MB`);
}
