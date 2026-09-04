/**
 * Captures the README screenshots (docs/shot-payoff.webp, shot-history.webp,
 * shot-tours.webp) from a headless Chrome over the DevTools protocol — the
 * same approach as record-demo.mjs, so the shots never go stale by hand.
 *
 *   npm run dev            # or: npm run build && npm run start
 *   node scripts/shots.mjs             # → docs/shot-*.webp (1200×750 @2x)
 *   node scripts/shots.mjs tours       # just one of payoff · history · tours
 *
 * The profile is fresh, so the first-visit offer would appear; the flags
 * that silence it are set before each page runs. Chrome encodes the webp.
 * Needs Google Chrome in /Applications.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const OUT = path.resolve("docs");
const WIDTH = 1200;
const HEIGHT = 750;
const SCALE = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** the three shots: where to go, what "settled" looks like, what to do first */
const SHOTS = {
  payoff: {
    file: "shot-payoff.webp",
    url: "/lab/AURION/iron-condor",
    ready: "document.querySelectorAll('[data-slot=slider-thumb]').length >= 3",
    settle: 1800,
  },
  history: {
    file: "shot-history.webp",
    url: "/t/AURION",
    ready: "document.querySelectorAll('#main g.candle-in').length > 50",
    settle: 2200,
  },
  tours: {
    file: "shot-tours.webp",
    url: "/learn/time",
    ready: "document.querySelectorAll('[data-slot=slider-thumb]').length >= 3",
    // advance to the gated step so the spotlight and the hint are on screen
    prepare: "[...document.querySelectorAll('button')].find((b) => /^next/.test(b.textContent.trim()))?.click(), true",
    settle: 1200,
  },
};

async function launchChrome(profile, port = 9334) {
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

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let nextId = 0;
    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          const id = ++nextId;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        async evaluate(expression) {
          const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
          return r.result.value;
        },
      });
    ws.onerror = () => reject(new Error("websocket error"));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id == null) return;
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (!p) return;
      if (m.error) p.rej(new Error(m.error.message));
      else p.res(m.result);
    };
  });
}

async function shoot(c, shot) {
  await c.send("Page.navigate", { url: `${ORIGIN}${shot.url}` });
  let ok = false;
  for (let i = 0; i < 400 && !ok; i++) {
    ok = await c.evaluate(shot.ready).catch(() => false);
    if (!ok) await sleep(50);
  }
  if (!ok) throw new Error(`${shot.file}: the cockpit never settled`);
  if (shot.prepare) await c.evaluate(shot.prepare);
  await sleep(shot.settle);
  const shotResult = await c.send("Page.captureScreenshot", { format: "webp", quality: 88 });
  fs.writeFileSync(path.join(OUT, shot.file), Buffer.from(shotResult.data, "base64"));
  console.log(`wrote docs/${shot.file}`);
}

async function main() {
  const wanted = process.argv.slice(2);
  const shots = (wanted.length ? wanted : Object.keys(SHOTS)).map((k) => {
    if (!SHOTS[k]) throw new Error(`unknown shot "${k}" — one of ${Object.keys(SHOTS).join(" · ")}`);
    return SHOTS[k];
  });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "optionaut-shots-"));
  const chrome = await launchChrome(path.join(work, "profile"));
  try {
    const c = await connect(chrome.wsUrl);
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await c.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false,
    });
    // a returning visitor: no first-flight offer, no intro line
    await c.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "try { localStorage.setItem('opt-welcomed', '1'); sessionStorage.setItem('opt-intro-seen', '1'); } catch {}",
    });
    for (const shot of shots) await shoot(c, shot);
  } finally {
    chrome.proc.kill();
    await sleep(500);
    fs.rmSync(work, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
