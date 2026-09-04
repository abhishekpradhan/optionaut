"use client";

import { useCockpit } from "@/lib/cockpit/store";
import { markToMarket, netEntryCost, expectedMove } from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtSignedUsd, fmtPct } from "@/lib/format";
import { Spot } from "@/components/cockpit/tour/Spot";

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
        <div
          className="figures font-semibold tracking-tight text-foreground"
          style={{ fontSize: "clamp(30px, 5.5vh, 52px)", lineHeight: 1.05 }}
        >
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
          {snapshot.source === "custom" && (
            <div className="text-muted-foreground/60">
              price history is illustrative — generated around your numbers
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
  const stockOnly = legs.length > 0 && legs.every((l) => l.kind === "stock");
  const pristine = whatIfPrice == null && elapsedDays === 0 && ivScale === 1;
  // The scenario line answers "under what assumptions is that number
  // true?" — phrased as the question a person would actually ask.
  const scenario = pristine
    ? "if you closed right now — nothing has moved yet"
    : `if the stock is ${fmtUsd(price, { cents: false })}${
        elapsedDays > 0 ? ` · after ${elapsedDays}d` : " · today"
      }${ivScale !== 1 && !stockOnly ? ` · vol ×${ivScale.toFixed(2)}` : ""}`;

  return (
    <Spot id="readout" className="pointer-events-none select-none">
      <div className="hud !text-[9px] text-muted-foreground/70">your profit / loss</div>
      <div
        className={`figures mt-0.5 font-semibold tracking-tight ${
          pl > 0.5
            ? "text-gain num-glow-gain"
            : pl < -0.5
              ? "text-loss num-glow-loss"
              : "text-foreground"
        }`}
        style={{ fontSize: "clamp(30px, 5.5vh, 52px)", lineHeight: 1.05 }}
      >
        {fmtSignedUsd(pl, { cents: false })}
      </div>
      <div className="hud mt-2 space-y-0.5 !text-[10.5px]">
        <div className="text-secondary-foreground">{scenario}</div>
        <div className="text-muted-foreground">
          {stockOnly ? (
            <>100 shares · {fmtUsd(snapshot.spot * 100, { cents: false })} of stock · no deadline, no decay</>
          ) : (
            <>
              you {cost >= 0 ? "paid" : "were paid"} {fmtUsd(Math.abs(cost), { cents: false })}{" "}
              {cost >= 0 ? "to open" : "up front"} · expires in {dte}d · one contract each
            </>
          )}
        </div>
      </div>
    </Spot>
  );
}
