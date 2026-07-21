#!/usr/bin/env node --experimental-strip-types
/**
 * Regenerates the simulated market fixtures (PLAN.md D11).
 *
 *   node --experimental-strip-types scripts/generate-market.mjs
 *
 * Deterministic: each archetype has a fixed seed, so re-running produces
 * identical fixtures unless the archetypes themselves change. The base
 * date only anchors the fictional calendar (history end + expiry grid);
 * bump it occasionally so expiries stay in the future.
 */
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { ARCHETYPES, generateSnapshot } from "../src/lib/sim/market.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const BASE_DATE = "2026-07-21"; // fictional "today" the calendar hangs from

const outDir = path.join(ROOT, "public/snapshots");
await mkdir(outDir, { recursive: true });

// clear out any previous fixtures so retired symbols don't linger
for (const f of await readdir(outDir)) {
  if (f.endsWith(".json")) await unlink(path.join(outDir, f));
}

const manifest = [];
for (const a of ARCHETYPES) {
  const snap = generateSnapshot(a, BASE_DATE);
  await writeFile(path.join(outDir, `${a.symbol}.json`), JSON.stringify(snap));
  manifest.push({
    symbol: snap.symbol,
    name: snap.name,
    blurb: snap.blurb,
    spot: snap.spot,
    changePct: snap.changePct,
    iv30: snap.iv30,
    hv252: snap.hv252,
    capturedAt: snap.capturedAt,
    simulated: true,
  });
  console.log(
    `${a.symbol.padEnd(7)} spot=${snap.spot} iv=${snap.iv30} hv252=${snap.hv252} ` +
      `expirations=${snap.expirations.length} strikes[0]=${snap.expirations[0].strikes.length} ` +
      `${(JSON.stringify(snap).length / 1024).toFixed(0)}KB`,
  );
}

const manifestPath = path.join(ROOT, "src/data/manifest.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`manifest: ${manifest.length} simulated securities -> src/data/manifest.json`);
