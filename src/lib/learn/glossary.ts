/**
 * The glossary is the app's jargon firewall: every term is defined the
 * first time and every time (tap any underlined word). `unit` says which
 * learn unit introduces the concept — lesson pages should only lean on
 * terms from their own unit or earlier (PLAN.md §4.2 concept gating).
 */

export interface GlossaryEntry {
  id: string;
  term: string;
  /** plain-English definition, 1–3 sentences, no circular jargon */
  short: string;
  /** optional deeper note for the glossary page */
  deep?: string;
  /** learn unit that introduces it (1–10) */
  unit: number;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ——— Unit 1 · Own a share ———
  {
    id: "share",
    term: "share",
    short: "A small slice of ownership in a company. Its price is just what buyers and sellers last agreed it was worth.",
    unit: 1,
  },
  {
    id: "pl",
    term: "P/L",
    short: "Profit or loss: what you'd gain or lose versus what you paid, usually measured at some imagined future price.",
    unit: 1,
  },
  {
    id: "payoff-diagram",
    term: "payoff diagram",
    short: "A picture of every possible outcome at once: the stock's price runs left-to-right, your profit or loss runs up-and-down.",
    deep: "Every strategy in this app is drawn this way. Reading one is the single most useful options skill: find where the line crosses zero (breakeven), where it flattens (capped outcomes), and how steep it is (leverage).",
    unit: 1,
  },
  // ——— Unit 2 · The contract ———
  {
    id: "option",
    term: "option",
    short: "A contract that gives its buyer the right — not the obligation — to buy or sell 100 shares at a fixed price until a fixed date.",
    unit: 2,
  },
  {
    id: "call",
    term: "call",
    short: "An option giving the right to BUY 100 shares at the strike price. Buyers of calls want the stock to go up.",
    unit: 2,
  },
  {
    id: "put",
    term: "put",
    short: "An option giving the right to SELL 100 shares at the strike price. Buyers of puts want the stock to go down (or want insurance).",
    unit: 2,
  },
  {
    id: "strike",
    term: "strike",
    short: "The fixed price written into the option contract — the price you'd buy (call) or sell (put) the shares at if you use it.",
    unit: 2,
  },
  {
    id: "expiration",
    term: "expiration",
    short: "The date the contract ends. After it, the option either turns into shares/cash (if it's worth something) or disappears worthless.",
    unit: 2,
  },
  {
    id: "premium",
    term: "premium",
    short: "The price of the option itself — what the buyer pays the seller upfront. Quoted per share; one contract covers 100 shares, so a $2.50 premium costs $250.",
    unit: 2,
  },
  {
    id: "contract-multiplier",
    term: "contract",
    short: "One standard option contract covers 100 shares. Every per-share price you see gets multiplied by 100 in real money.",
    unit: 2,
  },
  {
    id: "long-short",
    term: "long / short",
    short: "Long = you bought it and profit when it gains value. Short = you sold it first (collecting the premium) and profit when it loses value.",
    unit: 2,
  },
  {
    id: "breakeven",
    term: "breakeven",
    short: "The stock price where your trade neither makes nor loses money at expiration — where the payoff line crosses zero.",
    unit: 2,
  },
  {
    id: "leg",
    term: "leg",
    short: "One component of a multi-part strategy. An iron condor has four legs; a covered call has two (the shares and the short call).",
    unit: 2,
  },
  // ——— Unit 3 · Moneyness & value ———
  {
    id: "itm-otm",
    term: "in / out of the money",
    short: "In the money (ITM): the option would be worth something if exercised right now. Out of the money (OTM): it wouldn't. At the money (ATM): the strike sits right at the stock price.",
    unit: 3,
  },
  {
    id: "intrinsic",
    term: "intrinsic value",
    short: "The part of an option's price you could collect by using it right now. A call struck at $100 on a $105 stock has $5 of intrinsic value.",
    unit: 3,
  },
  {
    id: "extrinsic",
    term: "extrinsic value",
    short: "Everything above intrinsic — the price of hope and time. It's what you pay for the chance that the stock moves your way before expiration. It always melts to zero by expiry.",
    deep: "On the payoff chart, extrinsic value is literally visible: it's the gap between the curved 'today' line and the kinked 'at expiry' line.",
    unit: 3,
  },
  {
    id: "mid",
    term: "mid price",
    short: "Halfway between the highest bid and lowest ask. This app prices entries at the mid; real fills usually land a little worse.",
    unit: 3,
  },
  {
    id: "bid-ask",
    term: "bid–ask spread",
    short: "The gap between what buyers offer (bid) and sellers want (ask). Wide spreads are a hidden cost — you cross the gap on the way in and out.",
    unit: 3,
  },
  {
    id: "liquidity",
    term: "liquidity",
    short: "How easily you can trade without moving the price. Options with high volume and open interest have tight spreads; illiquid ones quietly tax every trade.",
    unit: 3,
  },
  {
    id: "open-interest",
    term: "open interest",
    short: "How many contracts currently exist at that strike. A rough gauge of how busy (and therefore fairly priced) an option is.",
    unit: 3,
  },
  // ——— Unit 4 · Time ———
  {
    id: "theta",
    term: "theta",
    short: "The dollars an option position loses (or a seller collects) per day just from time passing, everything else frozen. Decay speeds up as expiration nears.",
    unit: 4,
  },
  {
    id: "dte",
    term: "DTE",
    short: "Days to expiration. A 30 DTE option expires in 30 calendar days.",
    unit: 4,
  },
  {
    id: "time-decay",
    term: "time decay",
    short: "The steady melt of extrinsic value as expiration approaches. It's not linear — the last weeks melt fastest.",
    unit: 4,
  },
  {
    id: "exercise",
    term: "exercise",
    short: "Actually using the option: buying (call) or selling (put) the 100 shares at the strike. Most options are sold rather than exercised.",
    unit: 4,
  },
  {
    id: "assignment",
    term: "assignment",
    short: "What sellers experience when a buyer exercises: you're on the hook to deliver or buy the shares at the strike. It can happen before expiration on American-style options.",
    unit: 4,
  },
  // ——— Unit 5 · Volatility ———
  {
    id: "volatility",
    term: "volatility",
    short: "How much a stock's price wiggles, stated as an annualized percentage. A 30% vol stock 'typically' drifts about 30% over a year, one standard deviation's worth.",
    unit: 5,
  },
  {
    id: "iv",
    term: "implied volatility",
    short: "The amount of future wiggle option prices are currently charging for. It's not measured from history — it's backed out of what traders are paying today. High IV = expensive options.",
    unit: 5,
  },
  {
    id: "hv",
    term: "historical volatility",
    short: "The wiggle the stock actually delivered, measured from past prices. Comparing it to implied volatility tells you whether options look rich or cheap.",
    unit: 5,
  },
  {
    id: "expected-move",
    term: "expected move",
    short: "The range the options market is pricing for a stock by some date — roughly a ±1 standard deviation band, so about a 68% chance of staying inside it.",
    unit: 5,
  },
  {
    id: "iv-crush",
    term: "IV crush",
    short: "The sudden collapse of implied volatility after a known event (earnings) resolves. Option prices deflate even if the stock moved your way — the classic beginner ambush.",
    unit: 5,
  },
  {
    id: "vega",
    term: "vega",
    short: "The dollars your position gains or loses when implied volatility rises by one percentage point. Long options are long vega; sellers are short it.",
    unit: 5,
  },
  {
    id: "earnings",
    term: "earnings",
    short: "A company's quarterly results announcement — a date the whole market knows in advance. Option prices swell with uncertainty before it and deflate the moment it is over.",
    unit: 5,
  },
  // ——— Unit 6 · Greeks ———
  {
    id: "greeks",
    term: "greeks",
    short: "The standard sensitivities of an option's price: delta (stock price), gamma (delta's change), theta (time), vega (volatility). They're the dials of this app, with formal names.",
    unit: 6,
  },
  {
    id: "delta",
    term: "delta",
    short: "How many dollars your position gains per $1 move in the stock — equivalently, roughly how many shares it behaves like. An ATM call has a delta near 0.50 (≈50 shares' worth).",
    deep: "Delta also doubles as a rough market-implied probability that the option finishes in the money — a 16-delta option is priced like a ~1-in-6 shot.",
    unit: 6,
  },
  {
    id: "gamma",
    term: "gamma",
    short: "How fast delta itself changes as the stock moves. Highest for at-the-money options near expiration — which is why 0DTE positions can flip from fine to disaster in minutes.",
    unit: 6,
  },
  // ——— Units 7–10 · Strategies & management ———
  {
    id: "covered",
    term: "covered",
    short: "A short option is 'covered' when you already hold the thing you might have to deliver — like owning 100 shares behind a short call. The opposite (naked) has open-ended risk.",
    unit: 7,
  },
  {
    id: "cash-secured",
    term: "cash-secured",
    short: "Backing a short put with the full cash to buy the shares if assigned. It turns 'scary obligation' into 'paid limit order'.",
    unit: 7,
  },
  {
    id: "spread",
    term: "spread",
    short: "Buying one option and selling another of the same type to cap both risk and reward. The sold leg finances the bought one.",
    unit: 8,
  },
  {
    id: "credit-debit",
    term: "credit / debit",
    short: "Debit: you pay to open (long spreads). Credit: you collect to open (short spreads) and hope to keep it. Neither is better — they're mirror images.",
    unit: 8,
  },
  {
    id: "straddle",
    term: "straddle",
    short: "Buying a call and a put at the same strike and expiry. You are not picking a direction — you are betting the stock moves further than the two premiums combined, either way.",
    unit: 9,
  },
  {
    id: "iron-condor",
    term: "iron condor",
    short: "Sell a put spread below the stock and a call spread above it: four legs that collect a credit if the stock stays between the short strikes. Profit is capped at the credit; loss is capped by the wings.",
    unit: 9,
  },
  {
    id: "wing",
    term: "wing",
    short: "The cheap far-out option bought purely as insurance in strategies like iron condors — it defines your worst case.",
    unit: 9,
  },
  {
    id: "pop",
    term: "probability of profit",
    short: "A model's estimate of the odds the position makes at least $0.01 by expiration, assuming prices wander randomly at the current implied volatility. An estimate, not a promise.",
    unit: 9,
  },
  {
    id: "position-sizing",
    term: "position sizing",
    short: "Deciding how much money one trade deserves. The classic guardrail: risk only a few percent of your account on any single idea, because even great odds lose sometimes.",
    unit: 10,
  },
  {
    id: "0dte",
    term: "0DTE",
    short: "Options expiring today. Maximum gamma, maximum theta, maximum adrenaline — statistically where beginners donate money fastest.",
    unit: 10,
  },
];

export const glossaryById = new Map(GLOSSARY.map((g) => [g.id, g]));
