# Contributing to Optionaut

Thanks for looking under the hood. This document covers local setup, the project's
conventions, and the rules that keep the product honest.

## Setup

```bash
npm install
npm run dev        # dev server on :3000
npm test           # Vitest — options math, CSV parser, strategy suites stay green
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

## Writing a tour

Tours live in `src/components/cockpit/tour/tours.tsx`; the machinery around them is
small and worth knowing before you add a step.

- **Every step declares the scene it expects** — `scene: { ticker, strategy, view,
  expiry, overrides, reset, dials }` (see `scene.ts`). Scenes are *merged* from step 0
  up to the current step on every arrival (forward, back, resume, deep link), so a
  step never shows its caption over the wrong instrument and a learner's detour on
  the live stage heals at the next step. Naming a ticker or strategy clears the
  learner's dials and strikes; `reset: true` clears the dials only; everything else is
  left as the learner had it. The merge is pure and unit-tested (`scene.test.ts`).
- **Gates and reveals see live numbers.** `gate.check(s, ctx)` and `reveal(s, ctx)`
  receive the store plus a `TourCtx` built from the loaded chain (`spot`, `dte`, `em`,
  `legs`, `nearest`, `stepStrike`). Write thresholds relative to `ctx.spot` and
  `ctx.dte`, never as hard-coded dollars or days — the calendar workflow regenerates
  the market monthly. A gate always has a quiet "skip" beside it: the caption must
  read fine without the drag.
- **Point at the control.** `target: "price" | "time" | … ` (the `TourTarget` union in
  `scene.ts`) lights the matching `<Spot>` in the HUD. Add a target only if a `Spot`
  wraps it.
- **Captions are JSX; spell the space after an inline element as `{" "}`.** This
  toolchain drops a plain space right after `</em>`, `</strong>`, or `</Term>` in
  some caption text, so `<em>sold</em>{" "}put` is the house form. Every term of
  jargon is a `<Term>` (ground rule 3); `npm run dev` warns in the console for an
  unknown id.
- **Progress is the learner's.** Steps and completion persist per browser in
  `localStorage` (`src/lib/cockpit/tourProgress.ts`); reaching a tour's last caption
  counts as done. Keep step ids stable — a saved place is an index into `steps`.

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
change. The **refresh-calendar** workflow bumps `BASE_DATE` monthly and regenerates,
so expiry dates stay in the future without anyone touching it — expect occasional
fixture commits from `github-actions[bot]`. Two rules for new securities: symbols
must be **six letters or more** (real US listings max out at five — collisions stay
impossible), and personalities should earn their place by teaching something the
existing six don't.

User-added securities (the `+ data` chip) never touch the repo or any server: they
live in the visitor's localStorage only. Keep it that way — shipping or proxying real
quote data would put the project inside exchange licensing rules (again, D11).

## Commits

Present-tense summary line, body explaining *why*. CI (lint + tests + build) must
pass. Every commit to `main` deploys to production via Vercel's Git integration, so
treat `main` as live.
