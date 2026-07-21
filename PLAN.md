# Product Plan — Optionaut

**Status:** M0–M4 built and verified (2026-07-20) — ready for first Vercel deploy. v2 (M5) next.
**Last updated:** 2026-07-20
**Name:** Optionaut (decided D9) · repo `github.com/abhishekpradhan/optionaut`

---

## 1. Vision

**Pick a stock. See everything you could do with it — and actually understand it.**

A free, no-signup, visually stunning web app that teaches complete beginners how trading works — from buying shares to iron condors — by letting them *touch* the ideas: drag a strike, scrub time forward, crush volatility, and watch the profit curve respond, with plain-English explanation at every step.

**Target user:** someone who has heard of options, is curious or intimidated, and has little or no background. Secondary: intermediate self-taught traders who know the words but lack visual intuition.

**What this is NOT (hard boundaries):**
- Not a brokerage, and never connects to one. No order routing, no accounts.
- Not investment advice. It teaches *mechanics and trade-offs*, never "you should buy X." Every strategy view carries an educational disclaimer (see §10).
- Not a real-time analytics terminal. Data is delayed/illustrative and labeled as such.

---

## 2. Why this can win (research summary, 2026-07)

Four research streams (competitive landscape, pedagogy, market data, tech stack) converged on one insight:

> **Nobody pairs the best visuals with actual teaching.** OptionStrat has the category's best visualization (the price×time P/L heatmap) but paywalls probability/greeks and teaches nothing. tastylive and Option Alpha teach well but with utilitarian or login-gated tools and a jargon wall. Robinhood is beautiful but deliberately shallow (no heatmap, thin greeks, no IV context). thinkorswim is powerful and free but buries beginners in pro-grade density. The "explorable explanation" pedagogy style (Bret Victor / Nicky Case / Distill) is absent from the entire category.

Additional open space:
- **The middle rung is missing.** The canonical path is "read articles → get dumped into thinkorswim paperMoney." A sandbox between those — no account, no chain-reading required — barely exists (one small paywalled entrant, OptionsLabPro).
- **Freemium bait everywhere erodes trust.** Every incumbent monetizes brokerage flow, subscriptions, or ads. A tool with zero monetization pressure is uniquely credible for true novices.
- **Risk comprehension is under-served.** No broker-affiliated tool leads with "here is what losing looks like" (IV crush, theta bleed, assignment). A purely educational tool can.
- **No progressive jargon ramp.** Tools are either jargon-free-but-shallow or jargon-dense. None introduces vocabulary progressively, tied to the visual.

**Positioning:** *an explorable options playground* — OptionStrat-grade visuals wrapped in Nicky-Case-grade teaching, free, no signup, honest about risk.

---

## 3. The experience

### 3.1 Core loop (hero flow)

1. **Land** → short cinematic intro ("options, explained by touching them") → pick a security from a curated set (~10 liquid, familiar names: AAPL, NVDA, TSLA, SPY, QQQ, AMZN, MSFT, GOOGL, AMD, DIS) or search.
2. **Security overview** → price history chart, current volatility context (implied vs historical), the market's **expected move** drawn as a cone on the chart, plain-English "market mood" summary (e.g., "options are pricing a ±7% move by Aug 15 — that's calmer than usual for NVDA").
3. **Strategy gallery** → card grid of everything you can do, grouped by outlook — 📈 bullish / 📉 bearish / 😐 sideways / 🌪 big move either way — each card with a payoff-shape thumbnail, risk badge (defined vs undefined loss), and complexity level (1–4).
4. **Strategy Lab** (the hero screen) → full interactive visualization of the chosen strategy on the chosen security. See §3.2.
5. **Learn layer** → every term is explained in place, on first use, forever (see §5).

### 3.2 The Strategy Lab (hero screen)

Every strategy page always shows:

- **Interactive payoff diagram** — expiry line + **T+0 curve** overlaid. Drag strikes; the whole picture recomputes live. The gap between curve and kinked line *is* extrinsic value — we annotate it as such.
- **Three sliders: price, time, volatility** — the pedagogical core. Scrub days forward and watch the T+0 curve melt onto the expiry line (that's theta). Drop IV and watch the curve sink (that's vega / IV crush). These sliders *are* the greeks, experienced before they're named.
- **Stat panel** — max profit, max loss, breakeven(s), net debit/credit, probability of profit — each with a tap-to-explain.
- **Greeks strip** — delta/gamma/theta/vega as plain-English behavior ("loses ~$4/day to time right now"), linked back to the slider the user already moved.
- **Price×time P/L heatmap** — the OptionStrat-signature view, but *narrated* ("this green zone means: stock drifts up, you profit even before expiry").
- **Expected-move cone with strikes overlaid** — grounds strike selection in "the market thinks there's a ~68% chance it stays in here."
- **"What goes wrong" box** — the honest section: IV crush, assignment, gamma near expiry, liquidity/wide spreads, position-sizing math.
- **Sandbox mode** — free play at the end (Nicky Case pattern: *Start Small, Build Big*, end with a sandbox).

### 3.3 Strategy catalog

**v1 (12):** long shares · long call · long put · covered call · cash-secured put · bull call spread (debit) · bear put spread (debit) · bull put spread (credit) · bear call spread (credit) · long straddle · long strangle · iron condor
**v2:** iron butterfly · calendar spread · diagonal · collar · ratio spreads · short straddle/strangle (with loud undefined-risk warnings)

---

## 4. Teaching system

### 4.1 Concept progression (10 units — the app's dependency graph)

1. **Own a share** — price, P&L line for stock (the degenerate payoff diagram).
2. **The contract** — call, then put; buyer vs seller symmetry; strike/expiry; how to read a payoff diagram.
3. **Moneyness & value** — intrinsic vs extrinsic, shown as the T+0/expiry gap *before* naming theta.
4. **Time** — theta via animation (curve collapsing onto the kinked line); expiration mechanics & assignment.
5. **Volatility** — expected-move cone; IV vs HV; an IV-crush earnings replay.
6. **The greeks, formally** — each named as "the slider you already moved" (delta = price, theta = time, vega = IV).
7. **Income strategies** — covered call, cash-secured put (compositions of known pieces).
8. **Defined-risk spreads** — vertical debit → credit.
9. **Multi-leg neutral** — strangle/straddle → iron condor.
10. **Trade management & risk** — position sizing, rolling, the 0DTE/gamma warning, liquidity.

This mirrors the consensus ordering across tastylive, Option Alpha, OIC/OCC, and Cboe's Options Institute, adopting tastylive's stance of *early IV, experiential-then-formal greeks*.

### 4.2 Jargon rules (non-negotiable)

- **Phenomenon first, name second.** "The option bleeds value every day → traders call this *theta*."
- **Defined on first use, forever.** Every term is a tappable tooltip everywhere it appears (Distill's details-on-demand). Persistent glossary page.
- **Concept gating.** A page may only use terms its prerequisite units introduced (Nicky Case's *cognitive gates*). Enforced by a term→unit map in code, not by discipline.
- **Text stands alone; interaction deepens** (Ciechanowski rule). Never *require* an interaction to follow the thread.
- **Playful, honest microcopy.** "Your lottery ticket expired worthless — here's why most of them do."
- **Prediction prompts** where they count (Distill "You Draw It"): "Before you scrub time — sketch what you think happens to the curve."

### 4.3 Signature visualizations (ranked by teaching value)

1. Interactive expiry payoff diagram (drag strikes/premium)
2. T+0 curve overlaid on expiry line (extrinsic value made visible)
3. Time-decay animation (date slider; T+0 melts onto expiry)
4. Price×time P/L heatmap
5. Expected-move cone with strikes overlaid
6. IV-crush earnings replay (IV snaps down; right direction, still lost money)
7. Leverage/position-sizing simulator (same $ in shares vs options, repeated trials)
8. Greek curves vs spot (delta S-curve, gamma peak at ATM, theta vs DTE — the 0DTE lesson)
   - Honorable mention: HV vs IV time series with IV rank ("when are options expensive?")

---

## 5. Data strategy

### v1 — zero keys, zero rate limits, zero runtime dependencies

- **Bundled snapshots:** real option chains + price history for the ~10 curated tickers, captured from Cboe's delayed-quotes JSON endpoint (free, keyless, includes bid/ask, OI, volume, IV, greeks) via a small capture script we run manually; shipped as static JSON. Labeled clearly: "snapshot from <date> — educational, not live."
- **All options math computed client-side:** hand-written Black-Scholes module (~150 lines TS): pricing, analytic greeks, IV solve via Newton-Raphson (Corrado-Miller seed, bisection fallback), continuous dividend yield. Unit-tested against published values. This makes every slider instant and works offline.
  - Known, disclosed approximation: US equity options are American-style; BS is European. Fine for education; note it in the glossary. (Possible later: CRR binomial toggle as its own lesson.)
- **Risk-free rate:** bundled at capture time (Treasury 3-mo par yield; ±25bp barely moves greeks).

### v2 — live delayed data, still free

- **Primary: Alpaca Basic (free)** — 200 req/min; real-time IEX stock quotes + bars; options chain endpoint returns quotes **with greeks + IV** on the free plan. Server-side keys in Vercel env.
- **Never called from the client.** All market data flows through `app/api/market/*` route handlers with per-endpoint cache TTLs (quotes ~5 min, daily candles 24 h, metadata 7 d) + CDN `s-maxage`/`stale-while-revalidate`, so any burst of visitors collapses to ≤1 upstream call per TTL per symbol. Free-tier quotas and Vercel Hobby limits (1M invocations/mo) stay safe.
- **Fallbacks:** Tradier developer sandbox (60/min, 15-min-delayed chains, no greeks — our client-side BS covers that, which is a reason it exists in v1); Alpha Vantage `HISTORICAL_OPTIONS` (25/day, EOD chains with greeks) for a degraded end-of-day mode.
- **ToS reality (noted honestly):** no free tier formally licenses public redistribution; low-traffic educational display with attribution + "delayed — not for trading" labeling is common practice but technically grey. Bundled-snapshot mode remains the always-safe default; revisit licensing if the app ever grows.

---

## 6. Tech stack (verified current, 2026-07)

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.x (App Router, Turbopack) + React 19.2 + TypeScript 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui (CLI v4) for chrome; custom design tokens |
| Motion | Motion 12.x (`motion/react`); React 19 View Transitions for page-level; raw rAF + d3-interpolate on slider hot paths |
| Price charts | Hand-rolled SVG candles (decided during M2: the price chart and expected-move cone belong in one coherent picture, which lightweight-charts can't draw — and we don't need pan/zoom for teaching) |
| Teaching visuals | Hand-built React SVG using d3-scale / d3-shape / d3-interpolate (visx primitives optional); heatmap on `<canvas>` |
| Options math | Hand-written TS module (npm `black-scholes`/`greeks` packages are 2014-stale — do not use) |
| State | Zustand 5.x (one store per lab: legs, spot/vol/time inputs, UI prefs) |
| Data (v2) | Route-handler proxy + Next 16 opt-in caching (`next: { revalidate }`) + CDN cache headers |
| Hosting | Vercel Hobby (free): static-first, function budget protected by caching |
| Testing | Vitest for the math module (golden values) + a few Playwright smoke tests |

Notes: Next 16 caching is fully **opt-in** now — nothing caches implicitly. Vercel KV is dead (→ Upstash via Marketplace) — we don't need a DB at all for v1/v2; watchlist/progress live in `localStorage`.

---

## 7. Design direction

**Decided (D3): dark pro-terminal with a friendly voice.** Sleek dark fintech aesthetic — credible and aspirational, the OptionStrat/TradingView lane done more beautifully — paired with warm, plain-English copy. Concrete implications: dark-first design tokens, restrained accent palette on near-black, tabular/monospace numerals for prices, glassy panel chrome, and motion budget spent on the visualizations themselves rather than decorative UI.

Principles:
- Direct manipulation everywhere; immediate feedback (<16 ms recompute — client-side math makes this free).
- One idea per view; progressive disclosure (scrollytelling for lesson intros, sandbox at the end).
- Motion with meaning only (state transitions, causality) — never decorative confetti.
- Accessibility: never encode profit/loss by red/green alone (shape + label + colorblind-safe pair); full keyboard support on sliders; reduced-motion respected.
- Data-viz consistency: load the project's dataviz design system before building any chart.

---

## 8. Compliance & ethics stance

- **Educational only.** Persistent footer + per-strategy disclaimer, modeled on the category standard: *"Options involve a high degree of risk and are not suitable for all investors. [App] is not an investment advisor. The calculations, information, and opinions on this site are for educational purposes only and are not investment advice or a recommendation of any security or strategy."*
- Data labeled delayed/snapshot wherever shown. TradingView attribution on price charts. No personalized recommendations, no "top trades today," no performance promises, no dark patterns.
- We *lead* with risk: "what goes wrong" is a first-class section, not fine print.

---

## 9. Milestones (each ends demo-able)

- ✅ **M0 — Foundations** (2026-07-20): scaffold, dark tokens (palette CVD-validated), Black-Scholes engine w/ 37 tests, Cboe snapshot capture for 10 tickers.
- ✅ **M1 — The Lab** (2026-07-20): payoff engine (expiry + T+0), draggable/keyboard strike pills, three dials, stat panel, crosshair tooltip. Leg IVs solved from mids for exact internal consistency.
- ✅ **M2 — Breadth** (2026-07-20): overview page (candles→expected-move cone w/ dual-mode hover, vol tiles), gallery with live payoff sparklines, all 12 strategies, greeks strip. (Deviation: hand-rolled SVG candles; dropped lightweight-charts.)
- ✅ **M3 — Teaching layer** (2026-07-20): ~40-term gated glossary + Term popovers, guide bands ("The idea" / "What can bite") for all 12, clickable price×time heatmap, lessons for units 1–6 + 10 on the MiniLab widget, site nav.
- ✅ **M4 — Polish** (2026-07-20): landing page w/ animated hero, About (methodology + disclaimers), global footer, 404/error pages, favicon, skip-link + reduced-motion, OG metadata, README. Deploy handoff: user imports repo in Vercel (zero-config static).
- **M5 (v2) — Live mode, sims & sharing:** Alpaca proxy + caching, scenario simulators (IV-crush replay, position-sizing trials), shareable strategy URLs (Lab state encoded in the link), more strategies.

---

## 10. Decisions log

| # | Decision | Status |
|---|---|---|
| D1 | v1 data source | ✅ Bundled snapshots + client-side math (2026-07-20) |
| D2 | Product spine | ✅ Explorer-first, lessons woven in (2026-07-20) |
| D3 | Visual identity | ✅ Dark pro-terminal, friendly voice (2026-07-20) |
| D4 | Later-phase priorities | ✅ Scenario simulators + shareable strategy links; paper trading & quizzes parked (2026-07-20) |
| D5 | Repo: private on github.com/abhishekpradhan, name `trading-helper-app` | ✅ Done |
| D6 | Stack per §6 | ✅ Accepted alongside D1–D4 |
| D7 | Visual bar raised to "video-game quality" (2026-07-21), reference: universeatlas.org. First pass (V1–V3: atmosphere/glow/3D terrain) kept the scrolling-website shell — user feedback: wrong. The atmosphere/glow/HUD language stays; the 3D terrain is CUT (spectacle < clarity; the flat map view wins). | ✅ Revised by D8 |
| D8 | **The Cockpit** (2026-07-21, user-confirmed): the app is ONE full-screen instrument, no scrolling document anywhere. Center stage = an informative chart in three view modes (HISTORY candles+cone · PAYOFF diagram · MAP heatmap) that morph in place. HUD at the edges: top-left context line, top-right key hints + honesty chip, bottom-left giant live P/L readout, bottom chip rails (tickers, strategies, views, TOUR), right dial+stat stack (view-aware: vol context in history, position stats otherwise). Ticker/strategy switches morph the scene — never a page-load feel; URLs sync quietly (replaceState) so /t/SYM and /lab/SYM/STRAT deep links still work as static shells around the cockpit. Teaching = TOUR mode (caption cards + action gates driving the real instrument, adapted from the unit lessons); guides/glossary/about become glass overlays; persistent EDUCATIONAL·NOT ADVICE chip replaces the footer disclaimer. Lessons pages, MiniLab, card gallery, site header/footer, and three.js are removed. | ✅ Built & verified 2026-07-21 (all views, keyboard map, tours sheet, mobile dials sheet) |
| D9 | **Name: Optionaut** (2026-07-21, user-picked from four candidates) — option + astronaut; the learner is the pilot, matching the cockpit/tours/fly-it language. Repo renamed `optionaut`; package, metadata, wordmark, and docs updated. Check domain/trademark availability before public launch. | ✅ Done |
| D10 | **Mobile stance** (2026-07-21, user-directed): desktop is the intended experience. Phones (<700px wide or <450px tall) get the "boarding pass" — an on-brand gate with a mini instrument, share-the-link, glossary/about access, and an "enter anyway" hatch (session-scoped). Tablets in landscape get the full cockpit; portrait keeps the dials sheet. Touch parity: pinch-to-zoom on the stage mirrors wheel-zoom; dark theme-color + safe-area padding for mobile browser chrome. A first-class phone experience is deliberately out of scope for now. | ✅ Built |

---

## 11. Parking lot

- ~~Product name~~ → **Optionaut** (D9). ~~Domain~~ → **optionaut.org** registered via Vercel 2026-07-21, live with auto-TLS; `optionaut.vercel.app` remains as a secondary alias. Trademark search still recommended before heavy promotion.
- **Any-symbol search** (user-requested 2026-07-21, sequenced after shareable URLs): on-demand snapshot route (`/api/snapshot/[symbol]`) reusing the capture script's Cboe transform, CDN-cached ~15–30 min per symbol, same snapshot shape the cockpit already consumes — still zero keys. UI: search chip in the ticker rail (`/` key), recently-viewed symbols persisted locally alongside the bundled curated ten. Routing: `/t/*` and `/lab/*` gain a dynamic fallback (attempt on-demand load before 404) so shared links work for any ticker. Notes: ticker-only display for non-curated names; divYield defaults ~0 for unknowns (greeks barely care); this demotes the Alpaca live mode to optional (Cboe-on-demand covers breadth; Alpaca would only add intraday freshness).
- Paper-trading portfolio with fake money; quizzes/progress tracking (both deliberately parked per D4); historical crash replays (2008/2020) as deeper scenario sims; mobile-first pass; i18n
- CRR binomial pricing as an advanced lesson; futures/crypto later (explicitly out of scope for v1)

## Appendix — key sources

- OptionStrat features/pricing: optionstrat.com/membership · Options Profit Calculator: optionsprofitcalculator.com
- tastylive beginner course outline · Option Alpha courses: optionalpha.com/courses · OIC/OCC education: optionseducation.org · Cboe Options Institute
- Explorable-explanations patterns: blog.ncase.me/explorable-explanations · distill.pub/2020/communicating-with-interactive-articles · ciechanow.ski
- Alpaca free options data (chain incl. greeks/IV): docs.alpaca.markets/reference/optionchain · Cboe delayed quotes JSON: cdn.cboe.com/api/global/delayed_quotes/options/{TICKER}.json · FRED DGS3MO
- Next.js 16: nextjs.org/blog/next-16 · Vercel limits: vercel.com/docs/limits · lightweight-charts: github.com/tradingview/lightweight-charts · Motion: motion.dev
