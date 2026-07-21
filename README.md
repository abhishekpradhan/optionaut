<p align="center">
  <img src="docs/banner.svg" alt="Optionaut — learn options by flying them" width="100%" />
</p>

# Optionaut

**Learn options by flying them.** A free, cinematic, full-screen instrument for
understanding trading — pick a stock, fly everything you could do with it (from buying
shares to iron condors), and *understand* it by dragging strikes, scrubbing time, and
crushing volatility while the profit picture responds. Every crash is free.

**Live at [optionaut.org](https://optionaut.org).**

> **Educational only.** Options involve a high degree of risk and are not suitable for
> all investors. Optionaut is not a brokerage and nothing in it is investment advice, a
> recommendation, or a solicitation. Several strategies are included specifically to
> demonstrate how money is lost.

## The instrument

One full-screen cockpit — no scrolling website. A chart fills the stage, the UI floats
at the edges, and three views morph in place:

- **HISTORY** — months of candles flowing into the options-implied *expected-move cone*.
- **PAYOFF** — the neon expiry/today diagram with draggable strike pills and three dials
  (price / time / volatility — which are secretly delta, theta, and vega).
- **MAP** — the price×time P/L heatmap; click any cell to jump the whole cockpit to that
  scenario.

Plus **TOUR mode** — six guided flights that drive the real instrument with action gates
("drag the time dial yourself…") — a concept-gated glossary behind every dotted term,
per-strategy "what can bite" guides, and a full keyboard map (`?` in the app).
12 strategies × 10 tickers, all on real captured option chains.

Built for **desktop and landscape tablets** (pinch-to-zoom included); phones get an
honest boarding-pass page with an "enter anyway" hatch.

## Quickstart

No API keys, no environment variables, no accounts — the data ships with the repo.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # options-math test suite (Vitest)
npm run lint
npm run build      # 147 static pages
```

## How the numbers are made

- **Market data** is a bundled snapshot of [Cboe's public delayed quotes](https://www.cboe.com/delayed_quotes/)
  (chains, IV, OI, volume, price history), captured by `scripts/capture-snapshot.mjs`
  into `public/snapshots/`. It refreshes itself every trading night via the
  [refresh-data workflow](.github/workflows/refresh-data.yml) (see Automation below);
  manual refresh works anytime with `node scripts/capture-snapshot.mjs`. Data is
  deliberately frozen and labeled as a dated snapshot in the UI — never live, never
  executable. Optionaut is not affiliated with Cboe.
- **All interactive math is computed client-side** by a hand-written Black-Scholes-Merton
  engine ([`src/lib/options/`](src/lib/options)) — pricing, analytic greeks, and implied
  vol via Newton-Raphson with bisection fallback. It is validated in
  [`blackScholes.test.ts`](src/lib/options/blackScholes.test.ts) against textbook golden
  values (Hull), put-call parity to 1e-9, finite-difference agreement on every greek, and
  IV round-trips across a wide moneyness/tenor grid. Known, disclosed idealizations:
  European-style model for American-style options; entries assume mid fills;
  probability-of-profit assumes risk-neutral lognormal dynamics.
- **Profit is blue, loss is red — deliberately not green/red.** Roughly 1 in 12 men
  can't reliably distinguish the pair finance defaults to. The diverging palette is
  validated for common color-vision deficiencies, and meaning is never carried by color
  alone.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Zustand · d3-scale/shape/interpolate · custom SVG + canvas charts · Vitest.
Fully static output — deploys anywhere that serves files (built for Vercel).

## Automation

Two GitHub Actions keep the project honest without anyone touching it:

- **[CI](.github/workflows/ci.yml)** — every push and pull request runs lint, the
  options-math test suite, and a full production build. (It uses `npm install`
  rather than `npm ci` deliberately: macOS-authored lockfiles omit Linux-only wasm
  optional dependencies that a clean Linux `npm ci` rejects.)
- **[Refresh market data](.github/workflows/refresh-data.yml)** — on trading nights
  (~10:23pm ET, plus manual dispatch from the Actions tab) it recaptures all ten
  tickers from Cboe, validates every snapshot (spot present, ≥200 history rows,
  ≥3 expirations, no thin chains, plausible IV), and commits only real changes. A
  failed or invalid capture keeps the previous good snapshot; if fewer than eight
  tickers come back fresh — or any ticker would disappear — the script exits nonzero
  and nothing ships. Bad nights become a red ✗ in the Actions tab, never a broken site.

Deployment is Vercel's Git integration: every commit to `main` (human or bot) deploys
to production automatically. One nuance worth knowing: pushes made by the data
workflow's `GITHUB_TOKEN` don't re-trigger CI (GitHub's loop protection) — Vercel's
own build still gates those deploys, and a failed build leaves the previous
deployment live.

## Project docs

- [`PLAN.md`](PLAN.md) — the living product plan: research findings, the decision log
  (D1–D10) that explains *why* the app is shaped this way, teaching principles, roadmap.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup, conventions, and how to refresh data.

## Credits

- Visual language inspired by [Universe Atlas](https://universeatlas.org/).
- Delayed market data from Cboe's public endpoints, used educationally with attribution.
- Built with [Next.js](https://nextjs.org), [shadcn/ui](https://ui.shadcn.com),
  [d3](https://d3js.org), and [Lucide](https://lucide.dev) icons.

## License

[MIT](LICENSE) © 2026 Abhishek Pradhan
