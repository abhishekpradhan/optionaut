"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, MoveHorizontal, Zap, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  STRATEGIES,
  buildPosition,
  defaultExpIndex,
  type StrategyDef,
  type Outlook,
} from "@/lib/options/strategies";
import { payoffAtExpiry } from "@/lib/options/position";
import type { Snapshot } from "@/lib/data/types";

const SECTIONS: Array<{ outlook: Outlook; title: string; blurb: string; icon: React.ReactNode; color: string }> = [
  {
    outlook: "bullish",
    title: "If you think it's going up",
    blurb: "From simply owning shares to defined-risk bets that pay on a rise.",
    icon: <TrendingUp className="size-4" aria-hidden />,
    color: "var(--outlook-bullish)",
  },
  {
    outlook: "bearish",
    title: "If you think it's going down",
    blurb: "Ways to profit from a fall — without ever borrowing a share.",
    icon: <TrendingDown className="size-4" aria-hidden />,
    color: "var(--outlook-bearish)",
  },
  {
    outlook: "sideways",
    title: "If you think it's going nowhere",
    blurb: "The counterintuitive ones: get paid for time passing quietly.",
    icon: <MoveHorizontal className="size-4" aria-hidden />,
    color: "var(--outlook-sideways)",
  },
  {
    outlook: "bigmove",
    title: "If you expect drama, either way",
    blurb: "Direction-agnostic bets that pay only if something big happens.",
    icon: <Zap className="size-4" aria-hidden />,
    color: "var(--outlook-bigmove)",
  },
];

export function Gallery({ snapshot }: { snapshot: Snapshot }) {
  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((sec) => (
        <section key={sec.outlook} aria-label={sec.title}>
          <div className="mb-1 flex items-center gap-2">
            <span style={{ color: sec.color }}>{sec.icon}</span>
            <h2 className="text-[15px] font-semibold tracking-tight">{sec.title}</h2>
          </div>
          <p className="mb-3 text-[13px] text-muted-foreground">{sec.blurb}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STRATEGIES.filter((s) => s.outlook === sec.outlook).map((def) => (
              <StrategyCard key={def.id} def={def} snapshot={snapshot} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StrategyCard({ def, snapshot }: { def: StrategyDef; snapshot: Snapshot }) {
  return (
    <Link
      href={`/lab/${snapshot.symbol}/${def.id}`}
      className="panel group flex flex-col p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold tracking-tight">{def.name}</div>
          <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{def.tagline}</div>
        </div>
        <PayoffThumb def={def} snapshot={snapshot} />
      </div>
      <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {def.risk === "defined" ? (
            <ShieldCheck className="size-3.5" style={{ color: "var(--good)" }} aria-hidden />
          ) : (
            <AlertTriangle className="size-3.5" style={{ color: "var(--warn)" }} aria-hidden />
          )}
          {def.risk === "defined" ? "Defined risk" : "Uncapped risk"}
        </span>
        <span className="flex items-center gap-1" aria-label={`Complexity ${def.complexity} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block size-1.5 rounded-full"
              style={{
                background: i <= def.complexity ? "var(--muted-foreground)" : "var(--flat)",
                opacity: i <= def.complexity ? 0.9 : 0.5,
              }}
            />
          ))}
        </span>
        <span className="ml-auto text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open →
        </span>
      </div>
    </Link>
  );
}

/** Tiny real payoff shape for this strategy on this snapshot — the same
 *  engine as the Lab, normalized into a 104×44 sparkline. */
function PayoffThumb({ def, snapshot }: { def: StrategyDef; snapshot: Snapshot }) {
  const pts = React.useMemo(() => {
    const legs = buildPosition(def, snapshot, defaultExpIndex(snapshot, def));
    if (!legs.length) return null;
    const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
    const spot = snapshot.spot;
    const spread = strikes.length
      ? Math.max(Math.max(...strikes) - Math.min(...strikes), spot * 0.08)
      : spot * 0.2;
    const lo = (strikes.length ? Math.min(...strikes) : spot) - spread * 0.9;
    const hi = (strikes.length ? Math.max(...strikes) : spot) + spread * 0.9;
    const N = 48;
    const ys: number[] = [];
    for (let i = 0; i < N; i++) {
      ys.push(payoffAtExpiry(legs, lo + ((hi - lo) * i) / (N - 1)));
    }
    const yAbs = Math.max(...ys.map(Math.abs), 1);
    return ys.map((v, i) => ({
      x: (i / (N - 1)) * 104,
      y: 22 - (v / yAbs) * 18,
      v,
    }));
  }, [def, snapshot]);

  if (!pts) return null;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const gain = pts.map((p) => `${p.x.toFixed(1)},${Math.min(p.y, 22).toFixed(1)}`);
  const loss = pts.map((p) => `${p.x.toFixed(1)},${Math.max(p.y, 22).toFixed(1)}`);

  return (
    <svg width={104} height={44} viewBox="0 0 104 44" aria-hidden className="shrink-0">
      <polygon points={`0,22 ${gain.join(" ")} 104,22`} fill="var(--gain)" opacity={0.14} />
      <polygon points={`0,22 ${loss.join(" ")} 104,22`} fill="var(--loss)" opacity={0.12} />
      <line x1={0} x2={104} y1={22} y2={22} stroke="var(--axis-line)" strokeWidth={1} />
      <path d={path} fill="none" stroke="var(--foreground)" strokeWidth={1.75}
        strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}
