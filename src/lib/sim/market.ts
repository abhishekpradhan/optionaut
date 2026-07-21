import { bsPrice } from "../options/blackScholes.ts";
import type { Snapshot, Expiration, StrikeRow, Candle } from "../data/types";
import type { OptionKind } from "../options/types";

/**
 * The simulated market (PLAN.md D11): Optionaut's default securities
 * are FICTIONAL — authored volatility personalities priced by the same
 * Black-Scholes engine the cockpit uses, so every chain is internally
 * consistent by construction. No exchange data, no licenses, no
 * ambiguity: six-letter tickers that cannot collide with real listings,
 * loudly labeled simulated everywhere.
 *
 * The same generator powers the user's "quick build" custom securities
 * (their numbers, our math).
 */

export interface Archetype {
  symbol: string;
  name: string;
  blurb: string;
  spot: number;
  /** ATM implied vol, 30d */
  iv: number;
  /** put-skew strength (higher = more expensive downside) */
  skew: number;
  /** term-structure slope: >0 = far months richer, <0 = front elevated (event) */
  term: number;
  divYield: number;
  /** annualized realized vol for the price history */
  hv: number;
  /** annual drift for the history's personality */
  drift: number;
  seed: number;
}

export const ARCHETYPES: Archetype[] = [
  {
    symbol: "COSMOS", name: "Cosmos Composite Index Fund",
    blurb: "The broad market in one fund. Calm, diversified, the baseline everything else is measured against.",
    spot: 612, iv: 0.14, skew: 1.6, term: 0.10, divYield: 0.013, hv: 0.12, drift: 0.08, seed: 11,
  },
  {
    symbol: "AURION", name: "Aurion Systems",
    blurb: "The megacap everyone owns. Steady compounder; options are cheap because surprises are rare.",
    spot: 418, iv: 0.24, skew: 1.2, term: 0.05, divYield: 0.005, hv: 0.22, drift: 0.12, seed: 23,
  },
  {
    symbol: "HEARTH", name: "Hearth & Home Utilities",
    blurb: "A dividend blue-chip that moves like furniture. The covered-call classroom.",
    spot: 68, iv: 0.18, skew: 0.9, term: 0.04, divYield: 0.032, hv: 0.15, drift: 0.05, seed: 37,
  },
  {
    symbol: "VOLTRA", name: "Voltra Semiconductor",
    blurb: "AI-chip darling. Huge expectations, huge implied vol — drama is permanently priced in.",
    spot: 127, iv: 0.72, skew: 0.7, term: -0.08, divYield: 0, hv: 0.65, drift: 0.35, seed: 53,
  },
  {
    symbol: "NIMBUS", name: "Nimbus Motors",
    blurb: "Cult-favorite EV maker. Swings hard both ways; the strangle-and-condor playground.",
    spot: 262, iv: 0.52, skew: 0.8, term: 0.02, divYield: 0, hv: 0.48, drift: 0.10, seed: 71,
  },
  {
    symbol: "PULSAR", name: "Pulsar Biotherapeutics",
    blurb: "One drug, one trial, one binary date. Front-month IV is a fire alarm — the IV-crush lesson lives here.",
    spot: 46, iv: 0.95, skew: 0.5, term: -0.30, divYield: 0, hv: 0.70, drift: 0.02, seed: 89,
  },
];

export const SIM_RISK_FREE = 0.04;
const DTE_LADDER = [7, 14, 30, 45, 75, 110];
const HISTORY_DAYS = 260;

/** Deterministic PRNG (mulberry32) — fixtures are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  // Box-Muller
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const round2 = (x: number) => Math.round(x * 100) / 100;

function strikeStep(spot: number): number {
  if (spot < 25) return 0.5;
  if (spot < 60) return 1;
  if (spot < 120) return 2.5;
  if (spot < 350) return 5;
  return 10;
}

/** Smile + term structure: base ATM iv shaped by moneyness and tenor. */
export function smileIv(
  ivAtm: number, skew: number, term: number, spot: number, strike: number, dte: number,
): number {
  const m = Math.log(strike / spot);
  const tenor = Math.sqrt(30 / Math.max(dte, 5)) - 1; // 0 at 30d, + for shorter
  const atm = ivAtm * (1 - term * tenor);
  const curve = atm * (0.35 * m * m * (10 / Math.sqrt(Math.max(dte, 10))) - skew * 0.22 * m);
  return Math.min(Math.max(atm + curve, 0.05), 4);
}

function genHistory(a: Archetype, r: () => number, endDateIso: string): Candle[] {
  const candles: Candle[] = [];
  const dt = 1 / 252;
  // walk backwards from spot so the series ENDS exactly at the quoted spot
  const rets: number[] = [];
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const shock = gauss(r);
    // occasional gap days keep the chart honest-looking
    const gap = r() < 0.03 ? gauss(r) * 1.8 : 0;
    rets.push((a.drift - 0.5 * a.hv * a.hv) * dt + a.hv * Math.sqrt(dt) * (shock + gap) * 0.85);
  }
  let price = a.spot;
  const closes: number[] = new Array(HISTORY_DAYS);
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    closes[i] = price;
    price = price / Math.exp(rets[i]);
  }
  const end = new Date(`${endDateIso}T12:00:00Z`);
  // walk calendar backwards skipping weekends
  const dates: string[] = [];
  const d = new Date(end);
  while (dates.length < HISTORY_DAYS) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const c = closes[i];
    const o = i === 0 ? c * (1 + gauss(r) * a.hv * 0.01) : closes[i - 1] * (1 + gauss(r) * a.hv * 0.004);
    const hi = Math.max(o, c) * (1 + Math.abs(gauss(r)) * a.hv * 0.006);
    const lo = Math.min(o, c) * (1 - Math.abs(gauss(r)) * a.hv * 0.006);
    candles.push({
      d: dates[i], o: round2(o), h: round2(hi), l: round2(lo), c: round2(c),
      v: Math.round(2e6 * (1 + Math.abs(gauss(r)) * 2)),
    });
  }
  return candles;
}

function annualizedVol(closes: number[], window: number): number | null {
  if (closes.length < window + 1) return null;
  const rets: number[] = [];
  for (let i = closes.length - window; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = rets.reduce((x, y) => x + y, 0) / rets.length;
  const varSum = rets.reduce((x, y) => x + (y - mean) ** 2, 0);
  return Math.round(Math.sqrt((varSum / (rets.length - 1)) * 252) * 1e4) / 1e4;
}

function genChain(
  a: Pick<Archetype, "spot" | "iv" | "skew" | "term" | "divYield">,
  r: () => number,
  baseDateIso: string,
): Expiration[] {
  const out: Expiration[] = [];
  const base = new Date(`${baseDateIso}T16:00:00Z`);
  for (const dte of DTE_LADDER) {
    const exp = new Date(base);
    exp.setUTCDate(exp.getUTCDate() + dte);
    // land on a Friday for verisimilitude
    while (exp.getUTCDay() !== 5) exp.setUTCDate(exp.getUTCDate() + 1);
    const realDte = Math.round((exp.getTime() - base.getTime()) / 86_400_000);
    const step = strikeStep(a.spot);
    const lo = Math.ceil((a.spot * 0.72) / step) * step;
    const hi = Math.floor((a.spot * 1.28) / step) * step;
    const strikes: StrikeRow[] = [];
    for (let k = lo; k <= hi + 1e-9; k += step) {
      const K = round2(k);
      const T = realDte / 365;
      const row: StrikeRow = { k: K };
      for (const kind of ["call", "put"] as OptionKind[]) {
        const iv = smileIv(a.iv, a.skew, a.term, a.spot, K, realDte);
        const theo = bsPrice(kind, { S: a.spot, K, T, r: SIM_RISK_FREE, q: a.divYield, sigma: iv });
        if (theo < 0.015) continue;
        const half = Math.max(0.01, theo * 0.015 + 0.02 * Math.sqrt(theo));
        const atmness = Math.exp(-((Math.log(K / a.spot) / 0.15) ** 2));
        const oi = Math.round(40 + atmness * 4200 * (0.6 + r()) * (dte < 40 ? 1.5 : 0.7));
        const vol = Math.round(oi * (0.05 + r() * 0.25));
        row[kind === "call" ? "c" : "p"] = {
          b: round2(Math.max(theo - half, 0.01)),
          a: round2(theo + half),
          l: round2(theo + (r() - 0.5) * half),
          iv: Math.round(iv * 1e4) / 1e4,
          oi, vol,
        };
      }
      if (row.c || row.p) strikes.push(row);
    }
    out.push({ date: exp.toISOString().slice(0, 10), dte: realDte, strikes });
  }
  return out;
}

/** Build a full simulated Snapshot for an archetype. */
export function generateSnapshot(a: Archetype, baseDateIso: string): Snapshot {
  const r = rng(a.seed);
  const history = genHistory(a, r, baseDateIso);
  const closes = history.map((c) => c.c);
  const prevClose = history[history.length - 2]?.c ?? a.spot;
  return {
    symbol: a.symbol,
    name: a.name,
    capturedAt: `${baseDateIso}T00:00:00.000Z`,
    simulated: true,
    blurb: a.blurb,
    spot: round2(a.spot),
    prevClose: round2(prevClose),
    changePct: round2(((a.spot - prevClose) / prevClose) * 100),
    riskFreeRate: SIM_RISK_FREE,
    divYield: a.divYield,
    iv30: a.iv,
    hv20: annualizedVol(closes, 20),
    hv30: annualizedVol(closes, 30),
    hv252: annualizedVol(closes, 252),
    history,
    expirations: genChain(a, r, baseDateIso),
  };
}

/** Build a Snapshot from user-supplied numbers ("your numbers, our math"). */
export function buildCustomSnapshot(input: {
  symbol: string;
  name?: string;
  spot: number;
  iv: number;
  divYield?: number;
  skew?: number;
}): Snapshot {
  const a: Archetype = {
    symbol: input.symbol.toUpperCase().slice(0, 12),
    name: input.name || input.symbol.toUpperCase(),
    blurb: "Built from your numbers.",
    spot: input.spot,
    iv: input.iv,
    skew: input.skew ?? 1.0,
    term: 0.04,
    divYield: input.divYield ?? 0,
    hv: input.iv * 0.9,
    drift: 0.06,
    seed: Math.floor(input.spot * 97 + input.iv * 1000),
  };
  const todayIso = new Date().toISOString().slice(0, 10);
  const snap = generateSnapshot(a, todayIso);
  snap.simulated = true;
  snap.source = "custom";
  snap.capturedAt = new Date().toISOString();
  return snap;
}
