# Contributing to Optionaut

Thanks for looking under the hood. This document covers local setup, the project's
conventions, and the rules that keep the product honest.

## Setup

```bash
npm install
npm run dev        # dev server on :3000
npm test           # Vitest — options math + CSV parser suites must stay green
npm run lint       # ESLint (React Compiler rules enabled)
npm run build      # static build with no type errors
```

No environment variables or API keys are needed. Node ≥ 20.9.

## Layout

```
src/app/                  # routes — every page renders the full-screen <Cockpit/>
src/components/cockpit/   # the instrument: stage, HUD, overlays, tours
src/components/charts/    # PayoffChart, Heatmap, PriceCone (pure SVG/canvas)
src/lib/options/          # Black-Scholes engine, position math, strategy definitions
src/lib/sim/market.ts     # the simulated market: archetypes, histories, chain generator
src/lib/data/             # snapshot loading, custom (user-added) markets, Cboe CSV parser
src/lib/cockpit/store.ts  # the one Zustand store driving everything
src/lib/learn/            # glossary + per-strategy guides (the teaching copy)
scripts/generate-market.mjs   # regenerates the bundled simulated market
public/snapshots/         # the generated fixtures (the app's bundled data)
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

## The simulated market

The bundled securities are fictional by design — see decision D11 in `PLAN.md` for
the licensing research behind that call. The archetypes (spot, IV, skew, term
structure, dividend, drift, seed) live in `src/lib/sim/market.ts`; the fixtures in
`public/snapshots/` are generated from them:

```bash
node --experimental-strip-types scripts/generate-market.mjs
```

Generation is seeded and deterministic — same archetypes in, same market out. If you
change an archetype or the generator, regenerate and commit the fixtures in the same
change. Two rules for new securities: symbols must be **six letters or more** (real
US listings max out at five — collisions stay impossible), and personalities should
earn their place by teaching something the existing six don't.

User-added securities (the `+ data` chip) never touch the repo or any server: they
live in the visitor's localStorage only. Keep it that way — shipping or proxying real
quote data would put the project inside exchange licensing rules (again, D11).

## Commits

Present-tense summary line, body explaining *why*. CI (lint + tests + build) must
pass. Every commit to `main` deploys to production via Vercel's Git integration, so
treat `main` as live.
