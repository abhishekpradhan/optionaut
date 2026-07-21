/** The learning path (PLAN.md §4.1). Units 1–6 are full lessons; 7–9
 *  hand off to the Lab's strategy guides (that's where those concepts
 *  live best); 10 is the risk talk. */

export interface UnitMeta {
  n: number;
  slug: string;
  title: string;
  tagline: string;
  kind: "lesson" | "lab";
  /** for kind: "lab" — where the card sends you */
  href?: string;
}

export const UNITS: UnitMeta[] = [
  { n: 1, slug: "own-a-share", title: "Own a share", tagline: "One honest line, and how to read every diagram in this app.", kind: "lesson" },
  { n: 2, slug: "the-contract", title: "The contract", tagline: "Calls, puts, strikes — and the kink that changes everything.", kind: "lesson" },
  { n: 3, slug: "what-an-option-costs", title: "What an option costs", tagline: "Intrinsic, extrinsic, and the gap between the two lines.", kind: "lesson" },
  { n: 4, slug: "time", title: "Time", tagline: "Watch value melt. Meet the force that never stops.", kind: "lesson" },
  { n: 5, slug: "volatility", title: "Volatility", tagline: "The price of drama — and the earnings-day ambush.", kind: "lesson" },
  { n: 6, slug: "the-greeks", title: "The greeks", tagline: "Surprise: you already know them. They're the dials.", kind: "lesson" },
  { n: 7, slug: "income", title: "Income strategies", tagline: "Covered calls and cash-secured puts — taught inside the Lab.", kind: "lab", href: "/lab/AAPL/covered-call" },
  { n: 8, slug: "spreads", title: "Defined-risk spreads", tagline: "Debit and credit spreads — taught inside the Lab.", kind: "lab", href: "/lab/AAPL/bull-call-spread" },
  { n: 9, slug: "neutral", title: "Trading 'nothing happens'", tagline: "Straddles, strangles, condors — taught inside the Lab.", kind: "lab", href: "/lab/AAPL/iron-condor" },
  { n: 10, slug: "staying-alive", title: "Staying alive", tagline: "Position sizing, 0DTE, liquidity — the boring stuff that decides everything.", kind: "lesson" },
];

export const unitBySlug = new Map(UNITS.map((u) => [u.slug, u]));
