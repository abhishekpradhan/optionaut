import { bsGreeks, impliedVol } from "./blackScholes";
import { midPrice } from "@/lib/data/snapshot";
import type { Snapshot, Expiration, StrikeRow, OptionQuote } from "@/lib/data/types";
import type { Leg, LegKind, OptionKind } from "./types";

export type Outlook = "bullish" | "bearish" | "sideways" | "bigmove";

export type StrikePick =
  | { type: "atm" }
  | { type: "delta"; value: number } // absolute delta target
  | { type: "stock" };

export interface LegTemplate {
  role: string;
  label: string;
  kind: LegKind;
  side: 1 | -1;
  qty: number;
  pick: StrikePick;
}

export interface StrategyDef {
  id: string;
  name: string;
  /** one-breath description for cards and page headers */
  tagline: string;
  outlook: Outlook;
  complexity: 1 | 2 | 3 | 4;
  risk: "defined" | "undefined";
  legs: LegTemplate[];
  /** roles listed in strictly ascending strike order, for drag clamping */
  strikeOrder: string[];
  defaultDteTarget: number;
}

/** A position leg annotated with its strategy role for the UI. */
export interface LabLeg extends Leg {
  role: string;
  label: string;
}

export const STRATEGIES: StrategyDef[] = [
  {
    id: "long-shares",
    name: "Buy shares",
    tagline: "Own a piece of the company. The baseline every option is measured against.",
    outlook: "bullish",
    complexity: 1,
    risk: "defined",
    legs: [
      { role: "shares", label: "100 shares", kind: "stock", side: 1, qty: 1, pick: { type: "stock" } },
    ],
    strikeOrder: [],
    defaultDteTarget: 32,
  },
  {
    id: "long-call",
    name: "Long call",
    tagline: "Pay a premium for the right to buy at a set price. Upside uncapped, loss capped.",
    outlook: "bullish",
    complexity: 2,
    risk: "defined",
    legs: [
      { role: "call", label: "Long call", kind: "call", side: 1, qty: 1, pick: { type: "delta", value: 0.45 } },
    ],
    strikeOrder: ["call"],
    defaultDteTarget: 32,
  },
  {
    id: "long-put",
    name: "Long put",
    tagline: "Pay a premium for the right to sell at a set price. Profits when the stock falls.",
    outlook: "bearish",
    complexity: 2,
    risk: "defined",
    legs: [
      { role: "put", label: "Long put", kind: "put", side: 1, qty: 1, pick: { type: "delta", value: 0.45 } },
    ],
    strikeOrder: ["put"],
    defaultDteTarget: 32,
  },
  {
    id: "covered-call",
    name: "Covered call",
    tagline: "Own 100 shares and rent them out: collect premium, cap your upside.",
    outlook: "sideways",
    complexity: 2,
    risk: "defined",
    legs: [
      { role: "shares", label: "100 shares", kind: "stock", side: 1, qty: 1, pick: { type: "stock" } },
      { role: "shortCall", label: "Short call", kind: "call", side: -1, qty: 1, pick: { type: "delta", value: 0.3 } },
    ],
    strikeOrder: ["shortCall"],
    defaultDteTarget: 32,
  },
  {
    id: "cash-secured-put",
    name: "Cash-secured put",
    tagline: "Get paid today for promising to buy the stock cheaper. Income with an obligation.",
    outlook: "sideways",
    complexity: 2,
    risk: "defined",
    legs: [
      { role: "shortPut", label: "Short put", kind: "put", side: -1, qty: 1, pick: { type: "delta", value: 0.3 } },
    ],
    strikeOrder: ["shortPut"],
    defaultDteTarget: 32,
  },
  {
    id: "bull-call-spread",
    name: "Bull call spread",
    tagline: "Buy a call, sell a higher one. Cheaper than a call alone — profit capped, loss capped.",
    outlook: "bullish",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "long", label: "Long call", kind: "call", side: 1, qty: 1, pick: { type: "delta", value: 0.45 } },
      { role: "short", label: "Short call", kind: "call", side: -1, qty: 1, pick: { type: "delta", value: 0.25 } },
    ],
    strikeOrder: ["long", "short"],
    defaultDteTarget: 32,
  },
  {
    id: "bear-put-spread",
    name: "Bear put spread",
    tagline: "Buy a put, sell a lower one. A defined-risk bet on a move down.",
    outlook: "bearish",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "short", label: "Short put", kind: "put", side: -1, qty: 1, pick: { type: "delta", value: 0.25 } },
      { role: "long", label: "Long put", kind: "put", side: 1, qty: 1, pick: { type: "delta", value: 0.45 } },
    ],
    strikeOrder: ["short", "long"],
    defaultDteTarget: 32,
  },
  {
    id: "bull-put-spread",
    name: "Bull put spread",
    tagline: "Collect a credit that you keep if the stock stays up. Time works for you.",
    outlook: "bullish",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "long", label: "Long put", kind: "put", side: 1, qty: 1, pick: { type: "delta", value: 0.15 } },
      { role: "short", label: "Short put", kind: "put", side: -1, qty: 1, pick: { type: "delta", value: 0.3 } },
    ],
    strikeOrder: ["long", "short"],
    defaultDteTarget: 32,
  },
  {
    id: "bear-call-spread",
    name: "Bear call spread",
    tagline: "Collect a credit that you keep if the stock stays down. The bearish twin.",
    outlook: "bearish",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "short", label: "Short call", kind: "call", side: -1, qty: 1, pick: { type: "delta", value: 0.3 } },
      { role: "long", label: "Long call", kind: "call", side: 1, qty: 1, pick: { type: "delta", value: 0.15 } },
    ],
    strikeOrder: ["short", "long"],
    defaultDteTarget: 32,
  },
  {
    id: "long-straddle",
    name: "Long straddle",
    tagline: "Buy the call and the put at the same strike. You don't pick a direction — you bet on drama.",
    outlook: "bigmove",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "atm", label: "Long call + put", kind: "call", side: 1, qty: 1, pick: { type: "atm" } },
      { role: "atmPut", label: "Long put", kind: "put", side: 1, qty: 1, pick: { type: "atm" } },
    ],
    strikeOrder: ["atm"],
    defaultDteTarget: 32,
  },
  {
    id: "long-strangle",
    name: "Long strangle",
    tagline: "A cheaper straddle: out-of-the-money call and put. Needs a bigger move to pay.",
    outlook: "bigmove",
    complexity: 3,
    risk: "defined",
    legs: [
      { role: "put", label: "Long put", kind: "put", side: 1, qty: 1, pick: { type: "delta", value: 0.25 } },
      { role: "call", label: "Long call", kind: "call", side: 1, qty: 1, pick: { type: "delta", value: 0.25 } },
    ],
    strikeOrder: ["put", "call"],
    defaultDteTarget: 32,
  },
  {
    id: "iron-condor",
    name: "Iron condor",
    tagline: "Sell a range, buy the wings. Profit if the stock goes… nowhere much.",
    outlook: "sideways",
    complexity: 4,
    risk: "defined",
    legs: [
      { role: "putWing", label: "Long put (wing)", kind: "put", side: 1, qty: 1, pick: { type: "delta", value: 0.08 } },
      { role: "putShort", label: "Short put", kind: "put", side: -1, qty: 1, pick: { type: "delta", value: 0.16 } },
      { role: "callShort", label: "Short call", kind: "call", side: -1, qty: 1, pick: { type: "delta", value: 0.16 } },
      { role: "callWing", label: "Long call (wing)", kind: "call", side: 1, qty: 1, pick: { type: "delta", value: 0.08 } },
    ],
    strikeOrder: ["putWing", "putShort", "callShort", "callWing"],
    defaultDteTarget: 45,
  },
];

export const strategyById = (id: string): StrategyDef | undefined =>
  STRATEGIES.find((s) => s.id === id);

export function defaultExpIndex(snapshot: Snapshot, def: StrategyDef): number {
  let best = 0;
  snapshot.expirations.forEach((e, i) => {
    if (
      Math.abs(e.dte - def.defaultDteTarget) <
      Math.abs(snapshot.expirations[best].dte - def.defaultDteTarget)
    ) {
      best = i;
    }
  });
  return best;
}

function quoteFor(row: StrikeRow, kind: OptionKind): OptionQuote | undefined {
  return kind === "call" ? row.c : row.p;
}

/** Strikes usable for a leg of this kind: must have a priceable quote. */
export function strikeCandidates(exp: Expiration, kind: OptionKind): number[] {
  return exp.strikes
    .filter((row) => midPrice(quoteFor(row, kind)) != null)
    .map((row) => row.k);
}

export function legIv(
  snapshot: Snapshot,
  exp: Expiration,
  kind: OptionKind,
  strike: number,
): number {
  const row = exp.strikes.find((s) => s.k === strike);
  const q = row && quoteFor(row, kind);
  // Solve IV from the entry mid first: then BS(legIv) reproduces the entry
  // price exactly, the T+0 curve passes through $0 at the spot, and every
  // number in the lab is internally consistent. Chain IV is the fallback.
  const mid = midPrice(q);
  if (mid != null) {
    const iv = impliedVol(kind, mid, {
      S: snapshot.spot,
      K: strike,
      T: exp.dte / 365,
      r: snapshot.riskFreeRate,
      q: snapshot.divYield,
    });
    if (iv && iv > 0.01 && iv < 4) return iv;
  }
  if (q?.iv) return q.iv;
  return snapshot.iv30 ?? 0.3;
}

function deltaAt(
  snapshot: Snapshot,
  exp: Expiration,
  kind: OptionKind,
  strike: number,
): number {
  return bsGreeks(kind, {
    S: snapshot.spot,
    K: strike,
    T: exp.dte / 365,
    r: snapshot.riskFreeRate,
    q: snapshot.divYield,
    sigma: legIv(snapshot, exp, kind, strike),
  }).delta;
}

function pickStrike(
  snapshot: Snapshot,
  exp: Expiration,
  kind: OptionKind,
  pick: StrikePick,
): number {
  const candidates = strikeCandidates(exp, kind);
  if (pick.type === "atm" || pick.type === "stock") {
    return candidates.reduce((p, c) =>
      Math.abs(c - snapshot.spot) < Math.abs(p - snapshot.spot) ? c : p,
    );
  }
  let best = candidates[0];
  let bestErr = Infinity;
  for (const k of candidates) {
    const err = Math.abs(Math.abs(deltaAt(snapshot, exp, kind, k)) - pick.value);
    if (err < bestErr) {
      bestErr = err;
      best = k;
    }
  }
  return best;
}

/**
 * Build the concrete legs for a strategy on a snapshot expiration. Default
 * strikes come from delta targets (the way practitioners pick them);
 * `overrides` carries user-dragged strikes keyed by role. Entry prices are
 * chain mids — "if you opened this trade at the snapshot".
 */
export function buildPosition(
  def: StrategyDef,
  snapshot: Snapshot,
  expIndex: number,
  overrides: Record<string, number> = {},
): LabLeg[] {
  const exp = snapshot.expirations[Math.min(expIndex, snapshot.expirations.length - 1)];
  const legs: LabLeg[] = [];

  for (const t of def.legs) {
    if (t.kind === "stock") {
      legs.push({
        role: t.role,
        label: t.label,
        kind: "stock",
        side: t.side,
        qty: t.qty,
        strike: 0,
        entryPrice: snapshot.spot,
        iv: 0,
        dte: 0,
      });
      continue;
    }
    const kind = t.kind as OptionKind;
    // The straddle shares one draggable strike across both legs.
    const sharedRole = t.role === "atmPut" ? "atm" : t.role;
    const strike =
      overrides[sharedRole] ?? pickStrike(snapshot, exp, kind, t.pick);
    const row = exp.strikes.find((s) => s.k === strike);
    const entry = midPrice(row && quoteFor(row, kind));
    if (entry == null) continue;
    legs.push({
      role: t.role,
      label: t.label,
      kind,
      side: t.side,
      qty: t.qty,
      strike,
      entryPrice: entry,
      iv: legIv(snapshot, exp, kind, strike),
      dte: exp.dte,
    });
  }

  // Enforce the strategy's strict strike ordering (short strikes inside
  // wings, long below short in call spreads, …) by pushing later roles
  // outward to the next available strike when defaults collide.
  const byRole = new Map(legs.map((l) => [l.role, l]));
  for (let i = 1; i < def.strikeOrder.length; i++) {
    const prev = byRole.get(def.strikeOrder[i - 1]);
    const cur = byRole.get(def.strikeOrder[i]);
    if (!prev || !cur || cur.kind === "stock") continue;
    if (cur.strike <= prev.strike) {
      const kind = cur.kind as OptionKind;
      const above = strikeCandidates(exp, kind).filter((k) => k > prev.strike);
      if (above.length) {
        const k = above[0];
        const row = exp.strikes.find((s) => s.k === k);
        const entry = midPrice(row && quoteFor(row, kind));
        if (entry != null) {
          cur.strike = k;
          cur.entryPrice = entry;
          cur.iv = legIv(snapshot, exp, kind, k);
        }
      }
    }
  }
  return legs;
}
