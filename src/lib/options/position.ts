import { bsPrice, bsGreeks, normCdf } from "./blackScholes";
import type { Leg, MarketCtx, Greeks } from "./types";

/** Standard equity option multiplier; stock legs are expressed in
 *  100-share lots so every leg shares this scale. */
export const CONTRACT_MULT = 100;

const YEAR_DAYS = 365;

function legValueAtExpiry(leg: Leg, S: number): number {
  if (leg.kind === "stock") return S;
  if (leg.kind === "call") return Math.max(S - leg.strike, 0);
  return Math.max(leg.strike - S, 0);
}

/** Dollar P/L of the whole position if the underlying finishes at S. */
export function payoffAtExpiry(legs: Leg[], S: number): number {
  let pl = 0;
  for (const leg of legs) {
    pl +=
      leg.side *
      leg.qty *
      CONTRACT_MULT *
      (legValueAtExpiry(leg, S) - leg.entryPrice);
  }
  return pl;
}

/**
 * Dollar P/L marked `elapsedDays` after entry with the underlying at S.
 * Option legs are repriced with BSM at their remaining time; `ivScale`
 * multiplies every leg's entry IV (the volatility slider). At full
 * elapsed time this converges to payoffAtExpiry.
 */
export function markToMarket(
  legs: Leg[],
  S: number,
  elapsedDays: number,
  ctx: MarketCtx,
  ivScale = 1,
): number {
  let pl = 0;
  for (const leg of legs) {
    let value: number;
    if (leg.kind === "stock") {
      value = S;
    } else {
      const T = Math.max(leg.dte - elapsedDays, 0) / YEAR_DAYS;
      value = bsPrice(leg.kind, {
        S,
        K: leg.strike,
        T,
        r: ctx.r,
        q: ctx.q,
        sigma: Math.max(leg.iv * ivScale, 1e-4),
      });
    }
    pl += leg.side * leg.qty * CONTRACT_MULT * (value - leg.entryPrice);
  }
  return pl;
}

/** Net premium: positive = debit paid, negative = credit received. */
export function netEntryCost(legs: Leg[]): number {
  let cost = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") continue;
    cost += leg.side * leg.qty * CONTRACT_MULT * leg.entryPrice;
  }
  return cost;
}

function optionStrikes(legs: Leg[]): number[] {
  return [...new Set(legs.filter((l) => l.kind !== "stock").map((l) => l.strike))].sort(
    (a, b) => a - b,
  );
}

/** Payoff slope (in $ per $1 of underlying) for S above every strike. */
function slopeAbove(legs: Leg[]): number {
  let slope = 0;
  for (const leg of legs) {
    if (leg.kind === "stock" || leg.kind === "call") {
      slope += leg.side * leg.qty * CONTRACT_MULT;
    }
  }
  return slope;
}

/**
 * Exact breakevens of the expiry payoff. The payoff is piecewise linear
 * with kinks only at strikes, so each segment's zero crossing is solved
 * in closed form; the final upward/downward ray is handled via its slope.
 */
export function breakevens(legs: Leg[]): number[] {
  const kinks = optionStrikes(legs);
  const xs = [0, ...kinks];
  const out: number[] = [];
  const EPS = 1e-9;

  for (let i = 0; i < xs.length - 1; i++) {
    const [x1, x2] = [xs[i], xs[i + 1]];
    const [y1, y2] = [payoffAtExpiry(legs, x1), payoffAtExpiry(legs, x2)];
    if (Math.abs(y1) < EPS) out.push(x1);
    if ((y1 < -EPS && y2 > EPS) || (y1 > EPS && y2 < -EPS)) {
      out.push(x1 + ((0 - y1) * (x2 - x1)) / (y2 - y1));
    }
  }

  const lastX = xs[xs.length - 1];
  const lastY = payoffAtExpiry(legs, lastX);
  if (Math.abs(lastY) < EPS && lastX > 0) out.push(lastX);
  const ray = slopeAbove(legs);
  if (ray !== 0) {
    const cross = lastX - lastY / ray;
    if (cross > lastX + EPS) out.push(cross);
  }

  return [...new Set(out.map((x) => +x.toFixed(6)))].sort((a, b) => a - b);
}

export interface PayoffExtremes {
  /** Infinity when the upside is uncapped */
  maxProfit: number;
  /** -Infinity when the downside is uncapped (naked short calls) */
  maxLoss: number;
  maxProfitAt: number | "above" | null;
  maxLossAt: number | "above" | null;
}

/** Exact max profit/loss from the piecewise-linear expiry payoff. */
export function payoffExtremes(legs: Leg[]): PayoffExtremes {
  const kinks = optionStrikes(legs);
  const candidates = [0, ...kinks];
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  let maxProfitAt: number | "above" | null = null;
  let maxLossAt: number | "above" | null = null;

  for (const x of candidates) {
    const y = payoffAtExpiry(legs, x);
    if (y > maxProfit) {
      maxProfit = y;
      maxProfitAt = x;
    }
    if (y < maxLoss) {
      maxLoss = y;
      maxLossAt = x;
    }
  }
  const ray = slopeAbove(legs);
  if (ray > 0) {
    maxProfit = Infinity;
    maxProfitAt = "above";
  } else if (ray < 0) {
    maxLoss = -Infinity;
    maxLossAt = "above";
  }
  return { maxProfit, maxLoss, maxProfitAt, maxLossAt };
}

/** P(S_T <= x) under risk-neutral lognormal dynamics. */
function probBelow(
  x: number,
  spot: number,
  sigma: number,
  T: number,
  ctx: MarketCtx,
): number {
  if (x <= 0) return 0;
  const drift = (ctx.r - ctx.q - 0.5 * sigma * sigma) * T;
  return normCdf((Math.log(x / spot) - drift) / (sigma * Math.sqrt(T)));
}

/**
 * Probability the position expires profitable, integrating the lognormal
 * terminal distribution over the price intervals where the expiry payoff
 * is positive. `sigma` should be a representative (ATM-ish) IV. This is
 * the standard educational estimate, not a market-implied exact figure —
 * labeled as such in the UI.
 */
export function probabilityOfProfit(
  legs: Leg[],
  spot: number,
  sigma: number,
  dte: number,
  ctx: MarketCtx,
): number {
  const T = Math.max(dte, 0.5) / YEAR_DAYS;
  if (sigma <= 0) return payoffAtExpiry(legs, spot) > 0 ? 1 : 0;
  const bes = breakevens(legs).filter((b) => b > 0);
  const edges = [0, ...bes, Infinity];
  let pop = 0;
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i];
    const hi = edges[i + 1];
    const mid =
      hi === Infinity ? Math.max(lo * 1.5, lo + spot, spot * 4) : (lo + hi) / 2;
    if (payoffAtExpiry(legs, mid) > 0) {
      const pHi = hi === Infinity ? 1 : probBelow(hi, spot, sigma, T, ctx);
      pop += pHi - probBelow(lo, spot, sigma, T, ctx);
    }
  }
  return Math.min(Math.max(pop, 0), 1);
}

/** Position greeks: per-leg BSM greeks scaled by side, qty, and the
 *  100-share multiplier. Delta is in shares-equivalent. */
export function netGreeks(
  legs: Leg[],
  S: number,
  elapsedDays: number,
  ctx: MarketCtx,
  ivScale = 1,
): Greeks {
  const total: Greeks = { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  for (const leg of legs) {
    const scale = leg.side * leg.qty * CONTRACT_MULT;
    if (leg.kind === "stock") {
      total.price += scale * S;
      total.delta += scale;
      continue;
    }
    const T = Math.max(leg.dte - elapsedDays, 0) / YEAR_DAYS;
    const g = bsGreeks(leg.kind, {
      S,
      K: leg.strike,
      T,
      r: ctx.r,
      q: ctx.q,
      sigma: Math.max(leg.iv * ivScale, 1e-4),
    });
    total.price += scale * g.price;
    total.delta += scale * g.delta;
    total.gamma += scale * g.gamma;
    total.theta += scale * g.theta;
    total.vega += scale * g.vega;
    total.rho += scale * g.rho;
  }
  return total;
}

/** One-sigma expected move in dollars over `days`, from an annualized IV. */
export function expectedMove(spot: number, iv: number, days: number): number {
  return spot * iv * Math.sqrt(days / YEAR_DAYS);
}
