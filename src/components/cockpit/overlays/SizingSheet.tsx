"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { strategyById, buildPosition } from "@/lib/options/strategies";
import { payoffAtExpiry, payoffExtremes } from "@/lib/options/position";
import { rng } from "@/lib/sim/market";
import { Slider } from "@/components/ui/slider";
import { fmtUsd, fmtSignedUsd, fmtPct } from "@/lib/format";
import type { Snapshot } from "@/lib/data/types";

/**
 * Position-sizing trials: the same setup, run through hundreds of
 * simulated expiries at the current implied volatility, sized against a
 * real account number. Sizing is the one lever a trader fully controls;
 * this sheet makes its consequences visible before the fact.
 *
 * Honest assumptions, stated in the UI: outcomes are sampled with zero
 * drift (no edge assumed) from a lognormal at the position's own IV,
 * held to expiry, mid fills, no early management.
 */

const TRIALS = 500;
const ACCOUNT_KEY = "opt-sizing-account";

const quantile = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

export function SizingSheet({ snapshot }: { snapshot: Snapshot | null }) {
  const strategyId = useCockpit((s) => s.strategyId);
  const expIndex = useCockpit((s) => s.expIndex);
  const overrides = useCockpit((s) => s.overrides);

  const [account, setAccount] = React.useState(() => {
    if (typeof window === "undefined") return 10_000;
    const n = parseFloat(localStorage.getItem(ACCOUNT_KEY) ?? "");
    return Number.isFinite(n) && n > 0 ? n : 10_000;
  });
  const [lots, setLots] = React.useState(1);
  const saveAccount = (n: number) => {
    setAccount(n);
    if (Number.isFinite(n) && n > 0) localStorage.setItem(ACCOUNT_KEY, String(n));
  };

  const def = strategyById(strategyId);
  const sim = React.useMemo(() => {
    if (!snapshot || !def) return null;
    const legs = buildPosition(def, snapshot, expIndex, overrides);
    if (!legs.length) return null;
    const exp = snapshot.expirations[Math.min(expIndex, snapshot.expirations.length - 1)];
    const dte = exp?.dte ?? 30;
    const T = dte / 365;
    const optionLegs = legs.filter((l) => l.kind !== "stock");
    const sigma =
      optionLegs.length > 0
        ? optionLegs.reduce((a, l) => a + l.iv, 0) / optionLegs.length
        : snapshot.iv30 ?? 0.3;

    // deterministic per setup: same strikes + expiry → same trials
    let seed = 2166136261;
    for (const ch of `${snapshot.symbol}:${def.id}:${dte}:${legs.map((l) => l.strike).join("/")}`) {
      seed = ((seed ^ ch.charCodeAt(0)) * 16777619) >>> 0;
    }
    const r = rng(seed);
    const gauss = () => {
      const u = Math.max(r(), 1e-12);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
    };
    const outcomes: number[] = [];
    for (let i = 0; i < TRIALS; i++) {
      const ST = snapshot.spot * Math.exp(-0.5 * sigma * sigma * T + sigma * Math.sqrt(T) * gauss());
      outcomes.push(payoffAtExpiry(legs, ST));
    }
    outcomes.sort((a, b) => a - b);
    const extremes = payoffExtremes(legs);
    return { legs, dte, sigma, outcomes, extremes };
  }, [snapshot, def, expIndex, overrides]);

  if (!snapshot || !def || !sim) {
    return (
      <>
        <div className="mb-4">
          <div className="hud !text-[9.5px] text-primary">the first risk decision</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Position sizing</h2>
        </div>
        <p className="text-[13px] text-muted-foreground">Pick a strategy first — then come back.</p>
      </>
    );
  }

  const { outcomes, extremes, dte } = sim;
  const median = quantile(outcomes, 0.5) * lots;
  const p10 = quantile(outcomes, 0.1) * lots;
  const p90 = quantile(outcomes, 0.9) * lots;
  const winRate = outcomes.filter((o) => o > 0).length / outcomes.length;

  const definedRisk = Number.isFinite(extremes.maxLoss);
  const worstPerLot = definedRisk ? extremes.maxLoss : quantile(outcomes, 0.005);
  const worst = worstPerLot * lots;
  const worstPct = account > 0 ? Math.abs(worst) / account : 0;
  const ruinTrials = outcomes.filter((o) => Math.abs(Math.min(o * lots, 0)) > account * 0.1).length;
  const safeLots = Math.abs(worstPerLot) > 0 ? Math.floor((account * 0.05) / Math.abs(worstPerLot)) : 0;

  // histogram: clip the 1% tails so one freak trial doesn't flatten it
  const lo = quantile(outcomes, 0.01);
  const hi = quantile(outcomes, 0.99);
  const BUCKETS = 26;
  const counts = new Array(BUCKETS).fill(0) as number[];
  for (const o of outcomes) {
    if (o < lo || o > hi) continue;
    counts[Math.min(BUCKETS - 1, Math.floor(((o - lo) / (hi - lo || 1)) * BUCKETS))]++;
  }
  const maxCount = Math.max(...counts, 1);
  const W = 560;
  const H = 96;
  const zeroX = hi > lo ? ((0 - lo) / (hi - lo)) * W : W / 2;

  const input =
    "rounded-md border border-input bg-background/60 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <>
      <div className="mb-4">
        <div className="hud !text-[9.5px] text-primary">the first risk decision</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Position sizing</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Your {def.name.toLowerCase()} on {snapshot.symbol}, run through {TRIALS} simulated
          expiries ({dte}d out) at its own implied volatility — then sized against a real
          account number. Assumes no edge: prices wander with zero drift, positions ride to
          expiry, fills at mid.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className="hud !text-[9px] text-muted-foreground">account</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-muted-foreground">$</span>
            <input
              className={`${input} w-28`}
              inputMode="numeric"
              value={account}
              aria-label="Account size in dollars"
              onChange={(e) => saveAccount(parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
            />
          </div>
        </label>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <span className="hud flex items-baseline justify-between !text-[9px] text-muted-foreground">
            <span>contracts (lots)</span>
            <span className="figures text-[12px] text-foreground">×{lots}</span>
          </span>
          <Slider
            aria-label="Number of lots"
            min={1}
            max={25}
            step={1}
            value={[lots]}
            onValueChange={(v) => setLots(Array.isArray(v) ? v[0] : v)}
          />
        </div>
      </div>

      {/* the trials, drawn */}
      <svg
        viewBox={`0 0 ${W} ${H + 22}`}
        className="mt-5 w-full"
        role="img"
        aria-label={`Histogram of ${TRIALS} simulated outcomes for this position`}
      >
        {counts.map((c, i) => {
          const x = (i / BUCKETS) * W;
          const bw = W / BUCKETS - 2;
          const h = (c / maxCount) * H;
          const center = lo + ((i + 0.5) / BUCKETS) * (hi - lo);
          return (
            <rect
              key={i}
              x={x + 1}
              y={H - h}
              width={bw}
              height={Math.max(h, c > 0 ? 2 : 0)}
              rx={1.5}
              fill={center >= 0 ? "var(--gain)" : "var(--loss)"}
              opacity={0.75}
            />
          );
        })}
        <line x1={zeroX} x2={zeroX} y1={0} y2={H + 6} stroke="var(--secondary-foreground)" strokeDasharray="3 3" strokeWidth={1} />
        <text x={zeroX} y={H + 18} textAnchor="middle" fontSize={10} className="figures" fill="var(--muted-foreground)">
          $0
        </text>
        <text x={2} y={H + 18} fontSize={10} className="figures" fill="var(--loss)">
          {fmtSignedUsd(lo * lots, { cents: false })}
        </text>
        <text x={W - 2} y={H + 18} textAnchor="end" fontSize={10} className="figures" fill="var(--gain)">
          {fmtSignedUsd(hi * lots, { cents: false })}
        </text>
      </svg>

      <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-[13px] sm:grid-cols-3">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">median trial</dt>
          <dd className={`figures ${median >= 0 ? "text-gain" : "text-loss"}`}>{fmtSignedUsd(median, { cents: false })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">bad decile (p10)</dt>
          <dd className="figures text-loss">{fmtSignedUsd(p10, { cents: false })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">good decile (p90)</dt>
          <dd className="figures text-gain">{fmtSignedUsd(p90, { cents: false })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">trials ending green</dt>
          <dd className="figures">{fmtPct(winRate, 0)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">{definedRisk ? "true max loss" : "modeled bad tail"}</dt>
          <dd className="figures text-loss">{fmtSignedUsd(worst, { cents: false })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">…as % of account</dt>
          <dd className={`figures ${worstPct > 0.1 ? "text-loss" : worstPct > 0.05 ? "" : "text-gain"}`}>
            {fmtPct(worstPct, 1)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 rounded-md border border-border/70 bg-background/40 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
        {definedRisk ? (
          <>
            At ×{lots}, one full worst case costs{" "}
            <span className="figures text-loss">{fmtUsd(Math.abs(worst), { cents: false })}</span> —{" "}
            <span className="text-secondary-foreground">{fmtPct(worstPct, 1)}</span> of this
            account. A common discipline is keeping that under 5%, which here means{" "}
            <span className="figures text-secondary-foreground">
              {safeLots >= 1 ? `×${safeLots}` : "×0 — this account is too small for even one lot"}
            </span>
            {safeLots >= 1 ? " at most" : ""}. {ruinTrials > 0 && (
              <>In these {TRIALS} trials, {ruinTrials} ended worse than −10% of the account.{" "}</>
            )}
            Losing streaks are a certainty, not a risk — sizing decides whether they&apos;re a
            bruise or an ejection.
          </>
        ) : (
          <>
            This position&apos;s risk is <span className="text-loss">undefined</span> — the
            modeled bad tail above is a percentile, not a floor, and a real gap can sail
            through it. Undefined-risk positions are sized against imagination, not
            arithmetic; most beginners shouldn&apos;t size them at all.
          </>
        )}{" "}
        Educational arithmetic, not advice.
      </p>
    </>
  );
}
