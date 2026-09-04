/**
 * Captures the README's TOUR-mode screenshot (docs/shot-tours.webp) from a
 * headless Chrome over the DevTools protocol — the same approach as
 * record-demo.mjs, so the shot never goes stale by hand.
 *
 *   npm run dev            # or: npm run build && npm run start
 *   node scripts/shot-tours.mjs        # → docs/shot-tours.webp (1200×750 @2x)
 *
 * Opens the Time tour, advances to its gated step so the spotlight and the
 * gate hint are on screen, and lets Chrome encode the webp itself. Needs
 * Google Chrome in /Applications.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3000";
const OUT = process.env.OUT ?? path.resolve("docs/shot-tours.webp");
const W = 1200, H = 750, SCALE = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shot-"));
const port = 9344;
const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  "--disable-extensions", "--mute-audio", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
let targets = null;
for (let i = 0; i < 150 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(100); } }
const page = targets?.find((t) => t.type === "page");
if (!page) { proc.kill(); throw new Error("no page target"); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws")); });
let nextId = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id == null) return;
  const p = pending.get(m.id);
  pending.delete(m.id);
  if (!p) return;
  if (m.error) p.rej(new Error(m.error.message));
  else p.res(m.result);
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++nextId; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval"); return r.result.value; };

try {
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await send("Page.navigate", { url: `${ORIGIN}/learn/time` });
  let ready = false;
  for (let i = 0; i < 400 && !ready; i++) { ready = await evaluate("document.querySelectorAll('[data-slot=slider-thumb]').length >= 3 && !!document.querySelector('[role=region][aria-label=Tour]')").catch(() => false); if (!ready) await sleep(50); }
  if (!ready) throw new Error("cockpit never settled");
  await sleep(1200);                                            // entrances finish
  await evaluate("[...document.querySelectorAll('button')].find(b => /^next/.test(b.textContent.trim()))?.click(); true");
  await sleep(900);
  await evaluate("document.querySelector('nextjs-portal')?.remove(); document.activeElement && document.activeElement.blur(); true");
  await sleep(200);
  const header = await evaluate("[...document.querySelectorAll('.hud')].map(e => e.textContent).find(t => t.startsWith('tour '))");
  const lit = await evaluate("[...document.querySelectorAll('.tour-spot')].map(e => e.getAttribute('data-tour-target')).join(',')");
  console.log("captured:", header, "| lit:", lit);
  // Chrome encodes webp itself — no external encoder needed
  const shot = await send("Page.captureScreenshot", { format: "webp", quality: 88, captureBeyondViewport: false });
  fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
  console.log("wrote", OUT, fs.statSync(OUT).size, "bytes");
} finally {
  proc.kill();
  await sleep(600);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
}
