"use client";

import { useCockpit } from "@/lib/cockpit/store";
import { markToMarket, netEntryCost, expectedMove } from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtSignedUsd, fmtPct } from "@/lib/format";

/** Bottom-left: the giant live number — the "85.4 billion ly" of this
 *  instrument. In history view it reads the market; otherwise it reads
 *  your position under the current scenario. */
export function Readout({
  snapshot,
  legs,
  dte,
}: {
  snapshot: Snapshot | null;
  legs: LabLeg[];
  dte: number;
}) {
  const view = useCockpit((s) => s.view);
  const whatIfPrice = useCockpit((s) => s.whatIfPrice);
  const elapsedDays = useCockpit((s) => s.elapsedDays);
  const ivScale = useCockpit((s) => s.ivScale);

  if (!snapshot) return <div className="h-24" />;

  if (view === "history") {
    const em = snapshot.iv30 ? expectedMove(snapshot.spot, snapshot.iv30, 30) : null;
    return (
      <div className="pointer-events-none select-none">
        <div className="figures text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {fmtUsd(snapshot.spot)}
        </div>
        <div className="hud mt-2 space-y-0.5 !text-[10.5px]">
          <div className={snapshot.changePct >= 0 ? "text-gain" : "text-loss"}>
            {snapshot.changePct >= 0 ? "▲" : "▼"} {Math.abs(snapshot.changePct).toFixed(1)}% on the day
          </div>
          {snapshot.iv30 && (
            <div className="text-muted-foreground">
              options expect ±{fmtPct(snapshot.iv30, 0)} / yr
              {em ? ` · ±${fmtUsd(em, { cents: false })} by 30d` : ""}
            </div>
          )}
        </div>
      </div>
    );
  }

  const ctx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const price = whatIfPrice ?? snapshot.spot;
  const pl = legs.length ? markToMarket(legs, price, elapsedDays, ctx, ivScale) : 0;
  const cost = legs.length ? netEntryCost(legs) : 0;
  const scenario =
    whatIfPrice == null && elapsedDays === 0 && ivScale === 1
      ? "as priced, right now"
      : `${fmtUsd(price, { cents: false })}${elapsedDays > 0 ? ` · +${elapsedDays}d` : " · today"}${
          ivScale !== 1 ? ` · iv ×${ivScale.toFixed(2)}` : ""
        }`;

  return (
    <div className="pointer-events-none select-none">
      <div
        className={`figures text-4xl font-semibold tracking-tight sm:text-5xl ${
          pl > 0.5
            ? "text-gain num-glow-gain"
            : pl < -0.5
              ? "text-loss num-glow-loss"
              : "text-foreground"
        }`}
      >
        {fmtSignedUsd(pl, { cents: false })}
      </div>
      <div className="hud mt-2 space-y-0.5 !text-[10.5px]">
        <div className="text-secondary-foreground">{scenario}</div>
        <div className="text-muted-foreground">
          {cost >= 0 ? "paid" : "collected"} {fmtUsd(Math.abs(cost), { cents: false })} ·{" "}
          {dte}d contract · per 1-lot
        </div>
      </div>
    </div>
  );
}
