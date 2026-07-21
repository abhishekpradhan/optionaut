export type OptionKind = "call" | "put";
export type LegKind = OptionKind | "stock";

/** One leg of a position. All prices are per share; options carry the
 *  standard 100-share multiplier, and a stock "lot" is 100 shares so P/L
 *  scales are comparable across leg kinds. */
export interface Leg {
  kind: LegKind;
  /** +1 long, -1 short */
  side: 1 | -1;
  /** contracts (options) or 100-share lots (stock) */
  qty: number;
  /** ignored for stock (use 0) */
  strike: number;
  /** per-share premium paid/received, or share price for stock */
  entryPrice: number;
  /** annualized implied vol at entry; 0 for stock */
  iv: number;
  /** calendar days to expiry at entry; 0 for stock */
  dte: number;
}

export interface MarketCtx {
  /** risk-free rate, continuous annualized (e.g. 0.043) */
  r: number;
  /** dividend yield, continuous annualized */
  q: number;
}

export interface PricingInputs {
  S: number;
  K: number;
  /** years to expiry */
  T: number;
  r: number;
  q: number;
  /** annualized volatility (0.25 = 25%) */
  sigma: number;
}

/** Raw analytic greeks: theta per year, vega per 1.00 vol, rho per 1.00
 *  rate. UI-facing conversions (per-day theta, per-point vega) live in the
 *  formatting layer, not here. */
export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}
