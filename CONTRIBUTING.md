# Contributing to Optionaut

Thanks for looking under the hood. This document covers local setup, the project's
conventions, and the rules that keep the product honest.

## Setup

```bash
npm install
npm run dev        # dev server on :3000
npm test           # Vitest — the options-math suite must stay green
npm run lint       # ESLint (React Compiler rules enabled)
npm run build      # static build; should produce ~147 pages with no type errors
```

No environment variables or API keys are needed. Node ≥ 20.9.

## Layout

```
src/app/                  # routes — every page renders the full-screen <Cockpit/>
src/components/cockpit/   # the instrument: stage, HUD, overlays, tours
src/components/charts/    # PayoffChart, Heatmap, PriceCone (pure SVG/canvas)
src/lib/options/          # Black-Scholes engine, position math, strategy definitions
src/lib/cockpit/store.ts  # the one Zustand store driving everything
src/lib/learn/            # glossary + per-strategy guides (the teaching copy)
scripts/capture-snapshot.mjs  # refreshes bundled market data
public/snapshots/         # captured chains + history (the app's only data source)
```

## Ground rules

1. **The math stays tested.** Anything touching `src/lib/options/` needs passing golden
   values, parity, finite-difference, and IV round-trip tests. If you add a pricing
   feature, add its validation.
2. **Educational only.** No brokerage links, no order flow, no "signals," no
   recommendations. Risk gets first-class placement ("what can bite"), not fine print.
3. **Phenomenon first, name second.** Teaching copy shows the behavior before naming the
   greek. Every term of jargon is a `<Term>` with a glossary entry — no unexplained
   vocabulary anywhere in the UI.
4. **Color never carries meaning alone.** The blue↔red diverging pair is
   CVD-validated; keep shape/label/sign redundancy when adding any colored element.
5. **Compositor-safe motion.** Entrances are CSS animations (they must complete even
   when rAF is throttled); respect `prefers-reduced-motion`.
6. **Full-screen instrument, no document scroll.** New surfaces are views, overlays, or
   HUD elements — not scrolling pages (PLAN.md decision D8).

## Refreshing market data

Normally you don't: the **Refresh market data** workflow
(`.github/workflows/refresh-data.yml`) recaptures and commits on trading nights, and
can be run on demand from the Actions tab (`workflow_dispatch`). Expect data commits
authored by `github-actions[bot]`.

Manual runs still work and use the exact same validation:

```bash
node scripts/capture-snapshot.mjs        # all 10 tickers + manifest
node scripts/capture-snapshot.mjs AAPL   # one ticker (manifest untouched)
```

The script refuses to ship bad data: each snapshot must pass sanity checks before its
file is written, a failed capture keeps the previous good snapshot, and the manifest
is only rewritten when all ten tickers resolve with at least eight fresh — otherwise
it exits nonzero (which is what turns the workflow red). If you touch the capture or
validation logic, run a full manual capture and eyeball the summary line before
pushing. Data comes from Cboe's public delayed endpoints; keep request volume polite.

## Commits

Present-tense summary line, body explaining *why*. CI (lint + tests + build) must
pass. Two pipeline facts to know: bot data commits skip CI (GitHub doesn't re-trigger
workflows for `GITHUB_TOKEN` pushes — Vercel's build still gates those deploys), and
every commit to `main` deploys to production via Vercel's Git integration, so treat
`main` as live.
