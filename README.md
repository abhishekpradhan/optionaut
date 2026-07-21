# Optionaut

**Learn options by flying them.** A free, cinematic, full-screen instrument for
understanding trading — pick a stock, fly everything you could do with it (from buying
shares to iron condors), and *understand* it by dragging strikes, scrubbing time, and
crushing volatility while the profit picture responds. Every crash is free.

**Free · no signup · educational only.** This app never places trades and never gives
investment advice. Product plan, research, and roadmap live in [PLAN.md](./PLAN.md).

## What's inside

**One full-screen instrument** (no scrolling website — inspired by universeatlas.org):
a chart-filled stage with HUD at the edges, chip rails for tickers/strategies, a giant
live P/L readout, and three view modes that morph in place:

- **HISTORY** — six months of candles flowing into the options-implied expected-move cone.
- **PAYOFF** — the neon expiry/today diagram with draggable strike pills and the three
  dials (price / time / volatility — secretly delta, theta, vega).
- **MAP** — the clickable price×time P/L heatmap; click any cell to jump the dials there.

Plus **TOUR mode** (guided flights of the real instrument with action gates), a
concept-gated glossary behind every dotted term, per-strategy "what can bite" guides,
and a full keyboard map (`?` in-app). 12 strategies × 10 tickers.

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
