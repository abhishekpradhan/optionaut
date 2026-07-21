/** Shapes produced by scripts/generate-market.mjs and the user's own
 *  quick-builds/uploads — everything the cockpit consumes. */

export interface OptionQuote {
  /** bid */
  b: number | null;
  /** ask */
  a: number | null;
  /** last trade */
  l: number | null;
  /** implied vol (annualized), null when unquoted/zero */
  iv: number | null;
  /** open interest */
  oi: number;
  /** day volume */
  vol: number;
}

export interface StrikeRow {
  k: number;
  c?: OptionQuote;
  p?: OptionQuote;
}

export interface Expiration {
  /** ISO date */
  date: string;
  /** calendar days to expiry at capture */
  dte: number;
  strikes: StrikeRow[];
}

export interface Candle {
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Snapshot {
  symbol: string;
  name: string;
  capturedAt: string;
  /** true for Optionaut's fictional securities AND quick-built customs —
   *  anything priced by our engine rather than observed in a market */
  simulated?: boolean;
  /** "custom" when the data was supplied by the user (quick-build or
   *  upload); custom data lives only in their browser */
  source?: "custom";
  /** one-line personality, shown for fictional securities */
  blurb?: string;
  spot: number;
  prevClose: number;
  changePct: number;
  riskFreeRate: number;
  divYield: number;
  iv30: number | null;
  hv20: number | null;
  hv30: number | null;
  hv252: number | null;
  history: Candle[];
  expirations: Expiration[];
}

export interface ManifestEntry {
  symbol: string;
  name: string;
  spot: number;
  changePct: number;
  iv30: number | null;
  hv252: number | null;
  capturedAt: string;
  simulated?: boolean;
}
