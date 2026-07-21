#!/usr/bin/env node
/**
 * Captures delayed option chains + daily price history from Cboe's public
 * delayed-quotes CDN into bundled snapshot JSON. Run manually to refresh:
 *
 *   node scripts/capture-snapshot.mjs            # all curated tickers
 *   node scripts/capture-snapshot.mjs AAPL SPY   # subset
 *
 * Output: public/snapshots/<SYM>.json  + src/data/manifest.json
 *
 * The app is deliberately snapshot-first (PLAN.md §5): data is labeled
 * "educational snapshot from <date>", never live. We keep Cboe's quotes,
 * IV, OI and volume, but drop their greeks — the app recomputes greeks
 * from IV with its own tested Black-Scholes engine so every displayed
 * number stays consistent with the interactive sliders.
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Approximate continuous dividend yields, refreshed at capture time by
// hand when materially off. Educational precision, not settlement-grade.
const CURATED = [
  { symbol: "AAPL", name: "Apple", divYield: 0.004 },
  { symbol: "MSFT", name: "Microsoft", divYield: 0.007 },
  { symbol: "NVDA", name: "NVIDIA", divYield: 0.0002 },
  { symbol: "TSLA", name: "Tesla", divYield: 0 },
  { symbol: "AMZN", name: "Amazon", divYield: 0 },
  { symbol: "GOOGL", name: "Alphabet", divYield: 0.005 },
  { symbol: "AMD", name: "Advanced Micro Devices", divYield: 0 },
  { symbol: "DIS", name: "Walt Disney", divYield: 0.009 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", divYield: 0.012, dense: true },
  { symbol: "QQQ", name: "Invesco QQQ Trust", divYield: 0.006, dense: true },
];

// Approximate 3-month T-bill yield at capture time. Greeks move by ~nothing
// over +-25bp, so a hand-set constant beats an API dependency here.
const RISK_FREE_RATE = 0.043;

const DTE_MIN = 5;
const DTE_MAX = 130;
const DTE_TARGETS = [7, 14, 30, 45, 75, 110];
const MAX_STRIKES_PER_EXPIRY = 44;
const HISTORY_DAYS = 260;

const round = (x, dp) => (x == null ? null : +x.toFixed(dp));

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "trading-helper-app snapshot capture (educational)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function parseOptionSymbol(sym) {
  const m = /^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(sym);
  if (!m) return null;
  return {
    expiry: `20${m[2]}-${m[3]}-${m[4]}`,
    kind: m[5] === "C" ? "call" : "put",
    strike: Number(m[6]) / 1000,
  };
}

function daysBetween(fromIso, toIso) {
  return Math.round(
    (Date.parse(`${toIso}T16:00:00-05:00`) - Date.parse(fromIso)) / 86_400_000,
  );
}

function annualizedVol(closes, window) {
  if (closes.length < window + 1) return null;
  const rets = [];
  for (let i = closes.length - window; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varSum = rets.reduce((a, b) => a + (b - mean) ** 2, 0);
  return Math.sqrt((varSum / (rets.length - 1)) * 252);
}

function buildChain(options, spot, capturedAt, dense) {
  const byExpiry = new Map();
  for (const o of options) {
    const parsed = parseOptionSymbol(o.option);
    if (!parsed) continue;
    const dte = daysBetween(capturedAt, parsed.expiry);
    if (dte < DTE_MIN || dte > DTE_MAX) continue;
    const windowPct = dense ? 0.12 : 0.28;
    if (Math.abs(parsed.strike - spot) / spot > windowPct) continue;
    if (!(o.bid > 0) && !(o.ask > 0)) continue;

    if (!byExpiry.has(parsed.expiry)) {
      byExpiry.set(parsed.expiry, { date: parsed.expiry, dte, strikes: new Map() });
    }
    const exp = byExpiry.get(parsed.expiry);
    if (!exp.strikes.has(parsed.strike)) exp.strikes.set(parsed.strike, { k: parsed.strike });
    exp.strikes.get(parsed.strike)[parsed.kind === "call" ? "c" : "p"] = {
      b: round(o.bid, 2),
      a: round(o.ask, 2),
      l: round(o.last_trade_price, 2),
      iv: o.iv > 0 ? round(o.iv, 4) : null,
      oi: Math.round(o.open_interest ?? 0),
      vol: Math.round(o.volume ?? 0),
    };
  }

  // Pick up to 6 expirations nearest the pedagogical DTE targets.
  const all = [...byExpiry.values()].sort((a, b) => a.dte - b.dte);
  const chosen = new Set();
  for (const target of DTE_TARGETS) {
    if (!all.length) break;
    const best = all.reduce((p, c) =>
      Math.abs(c.dte - target) < Math.abs(p.dte - target) ? c : p,
    );
    chosen.add(best);
  }

  return [...chosen]
    .sort((a, b) => a.dte - b.dte)
    .map((exp) => {
      let rows = [...exp.strikes.values()].sort((a, b) => a.k - b.k);
      if (rows.length > MAX_STRIKES_PER_EXPIRY) {
        rows = rows
          .sort((a, b) => Math.abs(a.k - spot) - Math.abs(b.k - spot))
          .slice(0, MAX_STRIKES_PER_EXPIRY)
          .sort((a, b) => a.k - b.k);
      }
      return { date: exp.date, dte: exp.dte, strikes: rows };
    });
}

async function capture(meta) {
  const base = "https://cdn.cboe.com/api/global/delayed_quotes";
  const [quotes, hist] = await Promise.all([
    fetchJson(`${base}/options/${meta.symbol}.json`),
    fetchJson(`${base}/charts/historical/${meta.symbol}.json`),
  ]);
  const d = quotes.data;
  const spot = d.current_price || d.close;
  const capturedAt = new Date().toISOString();

  const history = hist.data.slice(-HISTORY_DAYS).map((r) => ({
    d: r.date,
    o: round(r.open, 2),
    h: round(r.high, 2),
    l: round(r.low, 2),
    c: round(r.close, 2),
    v: Math.round(r.volume ?? 0),
  }));
  const closes = hist.data.map((r) => r.close);

  const snapshot = {
    symbol: meta.symbol,
    name: meta.name,
    capturedAt,
    spot: round(spot, 2),
    prevClose: round(d.prev_day_close, 2),
    changePct: round(d.price_change_percent, 2),
    riskFreeRate: RISK_FREE_RATE,
    divYield: meta.divYield,
    iv30: d.iv30 > 0 ? round(d.iv30 / 100, 4) : null,
    hv20: round(annualizedVol(closes, 20), 4),
    hv30: round(annualizedVol(closes, 30), 4),
    hv252: round(annualizedVol(closes, 252), 4),
    history,
    expirations: buildChain(d.options, spot, capturedAt, meta.dense),
  };

  const outDir = path.join(ROOT, "public/snapshots");
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${meta.symbol}.json`);
  await writeFile(file, JSON.stringify(snapshot));
  const kb = (JSON.stringify(snapshot).length / 1024).toFixed(0);
  console.log(
    `${meta.symbol.padEnd(6)} spot=${snapshot.spot} iv30=${snapshot.iv30} ` +
      `expirations=${snapshot.expirations.length} (${snapshot.expirations
        .map((e) => e.dte)
        .join("/")}d) ${kb}KB`,
  );
  return snapshot;
}

const requested = process.argv.slice(2).map((s) => s.toUpperCase());
const targets = requested.length
  ? CURATED.filter((t) => requested.includes(t.symbol))
  : CURATED;

const manifest = [];
for (const meta of targets) {
  try {
    const snap = await capture(meta);
    manifest.push({
      symbol: snap.symbol,
      name: snap.name,
      spot: snap.spot,
      changePct: snap.changePct,
      iv30: snap.iv30,
      hv252: snap.hv252,
      capturedAt: snap.capturedAt,
    });
  } catch (err) {
    console.error(`FAILED ${meta.symbol}:`, err.message);
  }
  await new Promise((res) => setTimeout(res, 400)); // be polite to the CDN
}

if (!requested.length && manifest.length) {
  const manifestPath = path.join(ROOT, "src/data/manifest.json");
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`manifest: ${manifest.length} tickers -> src/data/manifest.json`);
} else if (requested.length) {
  console.log("(partial capture: manifest not rewritten — run with no args to refresh it)");
}
