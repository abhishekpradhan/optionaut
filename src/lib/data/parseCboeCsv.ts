import type { Snapshot, Expiration, StrikeRow, OptionQuote } from "./types";
import { generateSnapshot, type Archetype } from "../sim/market";

/**
 * Parses the CSV a user downloads MANUALLY from Cboe's delayed-quotes
 * page (their terms permit personal use via manual ticker entry — the
 * app itself never fetches anything). Classic quotedata.csv layout:
 *
 *   AAPL (Apple Inc),327.06, ...          <- line 1: symbol + last
 *   "Jul 21 2026 @ 16:00 ET"              <- line 2: timestamp
 *   Expiration Date,Calls,Last Sale,Net,Bid,Ask,Volume,IV,Delta,Gamma,Open Interest,Strike,Puts,Last Sale,Net,Bid,Ask,Volume,IV,Delta,Gamma,Open Interest
 *   Fri Aug 21 2026,AAPL260821C00330000,...,330.000,AAPL...P...,...
 *
 * Tolerant: locates the header row by its column names and maps call
 * columns (before "Strike") and put columns (after) by name.
 */

const MAX_STRIKES_PER_EXPIRY = 44;
const WINDOW_PCT = 0.3;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const num = (s: string | undefined): number | null => {
  if (s == null) return null;
  const n = parseFloat(s.replace(/[$,%]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export interface ParsedChain {
  symbol: string | null;
  spot: number | null;
  expirations: Expiration[];
  rows: number;
}

export function parseCboeCsv(text: string, today = new Date()): ParsedChain {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let symbol: string | null = null;
  let spot: number | null = null;

  // line 1 usually: "AAPL (Apple Inc),327.06,..."
  if (lines.length) {
    const first = splitCsvLine(lines[0]);
    const m = /^([A-Z^.]{1,10})\b/.exec(first[0] ?? "");
    if (m) symbol = m[1].replace("^", "");
    const maybeSpot = num(first[1]);
    if (maybeSpot && maybeSpot > 0.5) spot = maybeSpot;
  }

  const headerIdx = lines.findIndex((l) => {
    const low = l.toLowerCase();
    return low.includes("strike") && low.includes("calls") && low.includes("puts");
  });
  if (headerIdx === -1) return { symbol, spot, expirations: [], rows: 0 };

  const header = splitCsvLine(lines[headerIdx]).map((h) => h.toLowerCase());
  const strikeCol = header.indexOf("strike");
  const col = (name: string, side: "call" | "put"): number => {
    const idx = header.findIndex(
      (h, i) => h === name && (side === "call" ? i < strikeCol : i > strikeCol),
    );
    return idx;
  };
  const cols = {
    call: {
      b: col("bid", "call"), a: col("ask", "call"), l: col("last sale", "call"),
      iv: col("iv", "call"), oi: col("open interest", "call"), vol: col("volume", "call"),
    },
    put: {
      b: col("bid", "put"), a: col("ask", "put"), l: col("last sale", "put"),
      iv: col("iv", "put"), oi: col("open interest", "put"), vol: col("volume", "put"),
    },
  };

  const byExpiry = new Map<string, Map<number, StrikeRow>>();
  let rows = 0;
  for (const line of lines.slice(headerIdx + 1)) {
    const f = splitCsvLine(line);
    if (f.length < header.length - 2) continue;
    const k = num(f[strikeCol]);
    if (!k || k <= 0) continue;
    const expDate = new Date(f[0]);
    if (isNaN(expDate.getTime())) continue;
    const iso = expDate.toISOString().slice(0, 10);
    if (!byExpiry.has(iso)) byExpiry.set(iso, new Map());
    const strikes = byExpiry.get(iso)!;
    const row: StrikeRow = strikes.get(k) ?? { k };
    for (const side of ["call", "put"] as const) {
      const c = cols[side];
      const bid = num(f[c.b]);
      const ask = num(f[c.a]);
      if (bid == null && ask == null) continue;
      const iv = num(f[c.iv]);
      const q: OptionQuote = {
        b: bid, a: ask, l: num(f[c.l]),
        iv: iv && iv > 0 ? (iv > 3 ? iv / 100 : iv) : null, // Cboe exports IV as % sometimes
        oi: Math.round(num(f[c.oi]) ?? 0),
        vol: Math.round(num(f[c.vol]) ?? 0),
      };
      if ((q.b ?? 0) > 0 || (q.a ?? 0) > 0) row[side === "call" ? "c" : "p"] = q;
    }
    if (row.c || row.p) {
      strikes.set(k, row);
      rows++;
    }
  }

  const refSpot = spot ?? inferSpot(byExpiry);
  const expirations: Expiration[] = [...byExpiry.entries()]
    .map(([date, strikes]) => {
      const dte = Math.max(
        1,
        Math.round((Date.parse(`${date}T16:00:00-05:00`) - today.getTime()) / 86_400_000),
      );
      let list = [...strikes.values()].sort((a, b) => a.k - b.k);
      if (refSpot) {
        list = list.filter((r) => Math.abs(r.k - refSpot) / refSpot <= WINDOW_PCT);
        if (list.length > MAX_STRIKES_PER_EXPIRY) {
          list = list
            .sort((a, b) => Math.abs(a.k - refSpot) - Math.abs(b.k - refSpot))
            .slice(0, MAX_STRIKES_PER_EXPIRY)
            .sort((a, b) => a.k - b.k);
        }
      }
      return { date, dte, strikes: list };
    })
    .filter((e) => e.dte > 0 && e.strikes.length >= 4)
    .sort((a, b) => a.dte - b.dte)
    .slice(0, 8);

  return { symbol, spot: refSpot, expirations, rows };
}

/** ATM guess when the header line didn't carry a price: the strike where
 *  call and put mids are closest. */
function inferSpot(byExpiry: Map<string, Map<number, StrikeRow>>): number | null {
  let best: { k: number; diff: number } | null = null;
  for (const strikes of byExpiry.values()) {
    for (const row of strikes.values()) {
      if (!row.c || !row.p) continue;
      const cm = ((row.c.b ?? 0) + (row.c.a ?? 0)) / 2;
      const pm = ((row.p.b ?? 0) + (row.p.a ?? 0)) / 2;
      if (cm <= 0 || pm <= 0) continue;
      const diff = Math.abs(cm - pm);
      if (!best || diff < best.diff) best = { k: row.k, diff };
    }
  }
  return best?.k ?? null;
}

/** Assemble a full Snapshot from a parsed chain + user-confirmed fields.
 *  Price history is illustrative (generated around the spot) and labeled
 *  as such — the chain itself is the user's own data. */
export function chainToSnapshot(input: {
  symbol: string;
  name?: string;
  spot: number;
  expirations: Expiration[];
  divYield?: number;
}): Snapshot {
  const ivs = input.expirations
    .flatMap((e) => e.strikes.flatMap((s) => [s.c?.iv, s.p?.iv]))
    .filter((v): v is number => v != null && v > 0);
  const ivMed = ivs.length ? ivs.sort((a, b) => a - b)[Math.floor(ivs.length / 2)] : 0.3;
  const arch: Archetype = {
    symbol: input.symbol.toUpperCase().slice(0, 12),
    name: input.name || input.symbol.toUpperCase(),
    blurb: "Uploaded from your own data.",
    spot: input.spot,
    iv: ivMed,
    skew: 1,
    term: 0,
    divYield: input.divYield ?? 0,
    hv: ivMed * 0.9,
    drift: 0.06,
    seed: Math.floor(input.spot * 131 + ivMed * 997),
  };
  const scaffold = generateSnapshot(arch, new Date().toISOString().slice(0, 10));
  return {
    ...scaffold,
    simulated: false,
    source: "custom",
    capturedAt: new Date().toISOString(),
    iv30: Math.round(ivMed * 1e4) / 1e4,
    expirations: input.expirations,
  };
}
