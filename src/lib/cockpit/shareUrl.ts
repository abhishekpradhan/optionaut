import type { Snapshot } from "@/lib/data/types";
import type { StrategyDef, LabLeg } from "@/lib/options/strategies";
import type { ViewMode } from "./store";

/**
 * The share codec (PLAN.md M5): a /lab URL can carry the entire setup —
 * expiry, every strike, and the three dials — so a link rebuilds exactly
 * what its sender was looking at.
 *
 *   ?e=45            expiry, in days-to-expiry (nearest one wins on load,
 *                    so links survive the monthly calendar regeneration)
 *   &k=370,390,460,470   strikes, positional in the strategy's strikeOrder;
 *                    blanks keep that leg's default (quiet URLs only write
 *                    the dragged ones)
 *   &p=430.5&d=12&v=1.2  price / time / volatility dials, only when moved
 *   &view=map        the map view (payoff is the /lab default)
 */

export interface ShareParams {
  e?: number;
  k?: Array<number | null>;
  p?: number;
  d?: number;
  v?: number;
  map?: boolean;
}

export function parseShareParams(search: string): ShareParams | null {
  const q = new URLSearchParams(search);
  if (![...q.keys()].some((key) => ["e", "k", "p", "d", "v", "view"].includes(key))) {
    return null;
  }
  const num = (s: string | null): number | undefined => {
    if (s == null || s === "") return undefined;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const k = q.get("k")
    ? q
        .get("k")!
        .split(",")
        .map((s) => {
          const n = parseFloat(s);
          return Number.isFinite(n) && n > 0 ? n : null;
        })
    : undefined;
  return {
    e: num(q.get("e")),
    k,
    p: num(q.get("p")),
    d: num(q.get("d")),
    v: num(q.get("v")),
    map: q.get("view") === "map",
  };
}

interface EncodeInput {
  def: StrategyDef;
  snapshot: Snapshot;
  expIndex: number;
  /** true when expIndex is the strategy's own default for this snapshot */
  expiryIsDefault: boolean;
  overrides: Record<string, number>;
  legs: LabLeg[];
  whatIfPrice: number | null;
  elapsedDays: number;
  ivScale: number;
  view: ViewMode;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

function dialParams(q: URLSearchParams, i: EncodeInput) {
  if (i.whatIfPrice != null) q.set("p", fmt(i.whatIfPrice));
  if (i.elapsedDays > 0) q.set("d", String(Math.round(i.elapsedDays)));
  if (i.ivScale !== 1) q.set("v", fmt(i.ivScale));
  if (i.view === "map") q.set("view", "map");
}

/** Quiet-sync params: only what deviates from the strategy's defaults. */
export function deviationParams(i: EncodeInput): URLSearchParams {
  const q = new URLSearchParams();
  if (i.def.strikeOrder.some((r) => i.overrides[r] != null)) {
    q.set("k", i.def.strikeOrder.map((r) => (i.overrides[r] != null ? fmt(i.overrides[r]) : "")).join(","));
  }
  const exp = i.snapshot.expirations[Math.min(i.expIndex, i.snapshot.expirations.length - 1)];
  if (exp && !i.expiryIsDefault) q.set("e", String(exp.dte));
  dialParams(q, i);
  return q;
}

/** Full-fidelity share link: expiry + every strike, defaults included, so
 *  the receiver sees the sender's exact setup even if defaults drift. */
export function buildShareUrl(i: EncodeInput, origin: string, ticker: string): string {
  if (i.view === "history") return `${origin}/t/${ticker}`;
  const q = new URLSearchParams();
  const exp = i.snapshot.expirations[Math.min(i.expIndex, i.snapshot.expirations.length - 1)];
  if (exp) q.set("e", String(exp.dte));
  if (i.def.strikeOrder.length) {
    const strikeOf = (role: string) =>
      i.legs.find((l) => (l.role === "atmPut" ? "atm" : l.role) === role)?.strike;
    q.set("k", i.def.strikeOrder.map((r) => (strikeOf(r) != null ? fmt(strikeOf(r)!) : "")).join(","));
  }
  dialParams(q, i);
  const qs = q.toString();
  return `${origin}/lab/${ticker}/${i.def.id}${qs ? `?${qs}` : ""}`;
}
