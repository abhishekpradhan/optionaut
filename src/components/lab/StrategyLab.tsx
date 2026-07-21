"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, MoveHorizontal, Zap } from "lucide-react";
import { useSnapshot } from "@/lib/data/snapshot";
import { useLabStore } from "@/lib/lab/store";
import { strategyById, buildPosition, type Outlook } from "@/lib/options/strategies";
import { TickerHeader } from "@/components/shared/TickerHeader";
import { STRATEGY_GUIDES } from "@/lib/learn/strategyGuides";
import { PayoffChart } from "./PayoffChart";
import { Controls } from "./Controls";
import { StatPanel } from "./StatPanel";
import { GreeksStrip } from "./GreeksStrip";
import { LabSurface } from "./LabSurface";
import { fmtDate } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

const OUTLOOK: Record<Outlook, { label: string; icon: React.ReactNode; color: string }> = {
  bullish: { label: "Bullish", icon: <TrendingUp className="size-3.5" aria-hidden />, color: "var(--outlook-bullish)" },
  bearish: { label: "Bearish", icon: <TrendingDown className="size-3.5" aria-hidden />, color: "var(--outlook-bearish)" },
  sideways: { label: "Sideways", icon: <MoveHorizontal className="size-3.5" aria-hidden />, color: "var(--outlook-sideways)" },
  bigmove: { label: "Big move", icon: <Zap className="size-3.5" aria-hidden />, color: "var(--outlook-bigmove)" },
};

export function StrategyLab({ symbol, strategyId }: { symbol: string; strategyId: string }) {
  const { snapshot, error } = useSnapshot(symbol);
  const def = strategyById(strategyId);

  const expIndex = useLabStore((s) => s.expIndex);
  const overrides = useLabStore((s) => s.overrides);
  const whatIfPrice = useLabStore((s) => s.whatIfPrice);
  const elapsedDays = useLabStore((s) => s.elapsedDays);
  const ivScale = useLabStore((s) => s.ivScale);
  const init = useLabStore((s) => s.init);
  const setExpIndex = useLabStore((s) => s.setExpIndex);
  const setStrike = useLabStore((s) => s.setStrike);
  const setWhatIfPrice = useLabStore((s) => s.setWhatIfPrice);
  const setElapsedDays = useLabStore((s) => s.setElapsedDays);
  const ready = useLabStore((s) => s.symbol === symbol && s.strategyId === strategyId);

  React.useEffect(() => {
    if (snapshot && def) init(symbol, strategyId, snapshot);
  }, [snapshot, def, symbol, strategyId, init]);

  const legs = React.useMemo(
    () => (snapshot && def && ready ? buildPosition(def, snapshot, expIndex, overrides) : []),
    [snapshot, def, ready, expIndex, overrides],
  );

  if (!def) return <Shell><p className="text-muted-foreground">Unknown strategy.</p></Shell>;
  if (error) return <Shell><p className="text-muted-foreground">No snapshot data for {symbol}.</p></Shell>;
  if (!snapshot || !ready || legs.length === 0) return <Shell><Skeleton /></Shell>;

  const usesOptions = def.legs.some((l) => l.kind !== "stock");
  const exp = snapshot.expirations[Math.min(expIndex, snapshot.expirations.length - 1)];
  const outlook = OUTLOOK[def.outlook];

  return (
    <Shell>
      <TickerHeader
        snapshot={snapshot}
        backHref={`/t/${snapshot.symbol}`}
        backLabel={`${snapshot.symbol} overview`}
      />

      {/* strategy header */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{def.name}</h1>
        <span
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-secondary-foreground"
          style={{ borderColor: "var(--border)" }}
        >
          <span style={{ color: outlook.color }}>{outlook.icon}</span>
          {outlook.label}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{def.tagline}</p>

      {/* expiry selector */}
      {usesOptions && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted-foreground">Expiry</span>
          {snapshot.expirations.map((e, i) => (
            <button
              key={e.date}
              onClick={() => setExpIndex(i)}
              className={`figures rounded-full border px-3 py-1.5 text-xs transition-colors ${
                i === expIndex
                  ? "border-primary/60 bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
              aria-pressed={i === expIndex}
            >
              {fmtDate(e.date)} · {e.dte}d
            </button>
          ))}
        </div>
      )}

      {/* main grid */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <div className="panel p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-secondary-foreground">
                Profit &amp; loss
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <LegendKey color="var(--primary)" label={elapsedDays > 0 ? `In ${elapsedDays}d` : "Today"} />
                <LegendKey color="var(--foreground)" label="At expiry" />
              </div>
            </div>
            <PayoffChart
              snapshot={snapshot}
              def={def}
              legs={legs}
              dte={exp.dte}
              elapsedDays={elapsedDays}
              ivScale={ivScale}
              whatIfPrice={whatIfPrice}
              onStrikeChange={(role, k) => setStrike(role, k, snapshot, def)}
            />
            {usesOptions && (
              <p className="mt-1 text-center text-[11px] text-muted-foreground">
                Drag the strike pills. Hover the chart to inspect any price.
              </p>
            )}
          </div>
          <Controls snapshot={snapshot} legs={legs} dte={exp.dte} expiryDate={exp.date} />
        </div>
        <div className="flex flex-col gap-4">
          <StatPanel
            snapshot={snapshot}
            legs={legs}
            dte={exp.dte}
            elapsedDays={elapsedDays}
            ivScale={ivScale}
            whatIfPrice={whatIfPrice}
          />
          <GreeksStrip
            snapshot={snapshot}
            legs={legs}
            elapsedDays={elapsedDays}
            ivScale={ivScale}
            whatIfPrice={whatIfPrice}
          />
        </div>
      </div>

      {/* teaching layer: the idea, the shape, the honest part */}
      {STRATEGY_GUIDES[def.id] && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-sm font-semibold tracking-wide text-secondary-foreground">
              The idea
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {STRATEGY_GUIDES[def.id].idea}
            </p>
            <h3 className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reading the shape
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              {STRATEGY_GUIDES[def.id].diagram}
            </p>
          </div>
          <div className="panel p-5" style={{ borderColor: "color-mix(in oklab, var(--warn) 25%, transparent)" }}>
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-secondary-foreground">
              <AlertTriangle className="size-4" style={{ color: "var(--warn)" }} aria-hidden />
              What can bite
            </h2>
            <ul className="mt-2 space-y-3">
              {STRATEGY_GUIDES[def.id].gotchas.map((g) => (
                <li key={g.title} className="text-[13px] leading-relaxed">
                  <span className="font-medium text-secondary-foreground">{g.title}.</span>{" "}
                  <span className="text-muted-foreground">{g.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* every price, every day */}
      {usesOptions && (
        <div className="panel mt-4 p-4 sm:p-5">
          <LabSurface
            snapshot={snapshot}
            legs={legs}
            dte={exp.dte}
            ivScale={ivScale}
            elapsedDays={elapsedDays}
            whatIfPrice={whatIfPrice}
            onPick={(price, day) => {
              setWhatIfPrice(price);
              setElapsedDays(day);
            }}
          />
        </div>
      )}

    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="inline-block h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 pt-10">
      <div className="h-6 w-52 rounded bg-muted" />
      <div className="h-10 w-80 rounded bg-muted" />
      <div className="h-[400px] rounded-xl bg-muted/60" />
      <div className="h-24 rounded-xl bg-muted/60" />
    </div>
  );
}
