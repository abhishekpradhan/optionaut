# Options Lab (`trading-helper-app`)

An explorable, visual guide to trading — pick a stock, see everything you could do with it
(from buying shares to iron condors), and *understand* it by dragging strikes, scrubbing
time, and crushing volatility while the profit picture responds.

**Free · no signup · educational only.** This app never places trades and never gives
investment advice. Product plan, research, and roadmap live in [PLAN.md](./PLAN.md).

## What's inside

- **Strategy Lab** — interactive payoff diagram (expiry + T+0 curves), draggable strike
  pills, price/time/volatility dials, stat panel, plain-English greeks strip, and a
  clickable price×time P/L heatmap, for 12 strategies × 10 tickers.
- **Ticker overview** — six months of candles flowing into the options-implied
  expected-move cone, volatility context, and a strategy gallery with live payoff
  sparklines.
- **The path** — a 10-unit learning progression ("own a share" → iron condors) with
  interactive lesson widgets, predict-first prompts, and a concept-gated glossary
  (every term tappable, everywhere).

## How it works

- **Data**: bundled snapshots of Cboe's public delayed quotes (`public/snapshots/`),
  captured by `node scripts/capture-snapshot.mjs` — real chains, deliberately frozen,
  clearly labeled. No API keys, no rate limits, no live data.
- **Math**: hand-written Black-Scholes-Merton engine (`src/lib/options/`) — pricing,
  analytic greeks, Newton+bisection IV solving — unit-tested against textbook values,
  put-call parity, finite differences, and IV round-trips. Leg IVs are solved from entry
  mids so every displayed number is internally consistent.
- **Stack**: Next.js 16 (App Router, fully static output) · React 19 · Tailwind 4 ·
  shadcn/ui · Motion · hand-rolled SVG/canvas charts on d3 scales · Zustand.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # options-math test suite (Vitest)
npm run build      # static production build
node scripts/capture-snapshot.mjs   # refresh market-data snapshots
```

## Deploy

Push to `main` and import the repo in [Vercel](https://vercel.com/new) — zero config
(fully static, no env vars, no functions beyond static serving).

---

> Options involve a high degree of risk and are not suitable for all investors. Everything
> in this project is for educational purposes only and is not investment advice.
