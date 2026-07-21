"use client";

import { netGreeks } from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtSignedUsd } from "@/lib/format";

interface Props {
  snapshot: Snapshot;
  legs: LabLeg[];
  elapsedDays: number;
  ivScale: number;
  whatIfPrice: number | null;
}

/** Net position greeks, told as behavior first and jargon second — each
 *  one is the dial the user has already moved (PLAN.md §4). */
export function GreeksStrip({ snapshot, legs, elapsedDays, ivScale, whatIfPrice }: Props) {
  const ctx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const S = whatIfPrice ?? snapshot.spot;
  const g = netGreeks(legs, S, elapsedDays, ctx, ivScale);
  const stockOnly = legs.every((l) => l.kind === "stock");

  const thetaDay = g.theta / 365;
  const vegaPt = g.vega / 100;

  const rows = [
    {
      name: "Delta",
      dial: "the price dial",
      figure: fmtSignedUsd(g.delta, { cents: false }),
      unit: "per $1 stock move",
      detail: `Right now this behaves like ${Math.abs(g.delta).toFixed(0)} share${
        Math.abs(g.delta) >= 1.5 ? "s" : ""
      } of ${snapshot.symbol}${g.delta < 0 ? ", inverted" : ""}.`,
    },
    {
      name: "Gamma",
      dial: "how delta bends",
      figure: `${g.gamma >= 0 ? "+" : "−"}${Math.abs(g.gamma * 100).toFixed(1)}Δ`,
      unit: "delta shift per $1 move",
      detail:
        g.gamma >= 0
          ? "Moves help you faster as they grow."
          : "Moves hurt you faster as they grow — the short-option tax.",
    },
    {
      name: "Theta",
      dial: "the time dial",
      figure: fmtSignedUsd(thetaDay, { cents: false }),
      unit: "per calendar day",
      detail:
        thetaDay < -0.5
          ? "Each day that passes quietly costs you this much."
          : thetaDay > 0.5
            ? "Each quiet day pays you this much."
            : "Time barely touches this position.",
    },
    {
      name: "Vega",
      dial: "the volatility dial",
      figure: fmtSignedUsd(vegaPt, { cents: false }),
      unit: "per +1 pt of IV",
      detail:
        vegaPt > 0.5
          ? "You're long drama: rising IV helps, an IV crush hurts."
          : vegaPt < -0.5
            ? "You're short drama: calm markets pay you, panics hurt."
            : "Volatility barely touches this position.",
    },
  ];

  if (stockOnly) {
    return (
      <div className="panel p-4 text-[13px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-secondary-foreground">No greeks here.</span> Plain
        shares are the one position that time and volatility can&apos;t touch — delta is exactly
        100 and nothing decays. Every option strategy trades some of that simplicity away.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((r) => (
        <div key={r.name} className="panel px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {r.name}
            </span>
            <span className="text-[10px] text-muted-foreground/70">{r.dial}</span>
          </div>
          <div className="figures mt-1 text-[15px] font-semibold text-foreground">{r.figure}</div>
          <div className="text-[10.5px] text-muted-foreground">{r.unit}</div>
          <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">{r.detail}</p>
        </div>
      ))}
    </div>
  );
}
