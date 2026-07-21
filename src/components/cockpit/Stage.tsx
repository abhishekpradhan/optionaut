"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { PayoffChart } from "@/components/lab/PayoffChart";
import { Heatmap } from "@/components/lab/Heatmap";
import { PriceCone } from "@/components/overview/PriceCone";
import { strategyById, type LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";

/** The center stage: one informative chart at a time, morphing in
 *  place. Wheel = zoom the price domain (payoff/map). */
export function Stage({
  snapshot,
  legs,
  dte,
}: {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
}) {
  const view = useCockpit((s) => s.view);
  const strategyId = useCockpit((s) => s.strategyId);
  const elapsedDays = useCockpit((s) => s.elapsedDays);
  const ivScale = useCockpit((s) => s.ivScale);
  const whatIfPrice = useCockpit((s) => s.whatIfPrice);
  const domainScale = useCockpit((s) => s.domainScale);
  const setDomainScale = useCockpit((s) => s.setDomainScale);
  const setStrike = useCockpit((s) => s.setStrike);
  const setWhatIfPrice = useCockpit((s) => s.setWhatIfPrice);
  const setElapsedDays = useCockpit((s) => s.setElapsedDays);

  const def = strategyById(strategyId);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [h, setH] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setH(e.contentRect.height));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    if (view === "history") return;
    e.preventDefault();
    setDomainScale(domainScale * (e.deltaY > 0 ? 1.07 : 0.93));
  };

  const chartH = Math.max(h - 8, 200);
  const pick = (price: number, day: number) => {
    setWhatIfPrice(price);
    setElapsedDays(day);
  };

  return (
    <div
      ref={ref}
      id="main"
      className="relative h-full w-full min-w-0"
      onWheel={onWheel}
      aria-label="Chart stage"
    >
      {h > 0 && def && (
        <div key={view} className="stage-enter absolute inset-0">
          {view === "history" && <PriceCone snapshot={snapshot} height={chartH} />}
          {view === "payoff" && (
            <>
              <div className="hud pointer-events-none absolute right-2 top-0 z-10 flex items-center gap-3 !text-[9.5px]">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-0.5 w-3.5 rounded-full bg-primary" />
                  {elapsedDays > 0 ? `in ${elapsedDays}d` : "today"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block h-0.5 w-3.5 rounded-full bg-foreground" />
                  at expiry
                </span>
              </div>
              <PayoffChart
                snapshot={snapshot}
                def={def}
                legs={legs}
                dte={dte}
                elapsedDays={elapsedDays}
                ivScale={ivScale}
                whatIfPrice={whatIfPrice}
                onStrikeChange={(role, k) => setStrike(role, k, snapshot)}
                height={chartH}
                domainScale={domainScale}
              />
            </>
          )}
          {view === "map" && (
            <Heatmap
              snapshot={snapshot}
              legs={legs}
              dte={dte}
              ivScale={ivScale}
              elapsedDays={elapsedDays}
              whatIfPrice={whatIfPrice}
              onPick={pick}
              cellH={Math.min(Math.max(Math.floor((chartH - 60) / 46), 7), 15)}
              domainScale={domainScale}
            />
          )}
        </div>
      )}
    </div>
  );
}
