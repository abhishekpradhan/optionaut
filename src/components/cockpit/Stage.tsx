"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { PayoffChart } from "@/components/charts/PayoffChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { PriceCone } from "@/components/charts/PriceCone";
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

  // Native non-passive wheel listener: React's synthetic onWheel is
  // passive, so preventDefault there is silently ignored.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const s = useCockpit.getState();
      if (s.view === "history") return;
      e.preventDefault();
      s.setDomainScale(s.domainScale * (e.deltaY > 0 ? 1.07 : 0.93));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Pinch = the touch twin of wheel-zoom: two pointers on the stage
  // scale the price domain around their spread.
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null);
  const pinchDist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { dist: pinchDist(), scale: useCockpit.getState().domainScale };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = useCockpit.getState();
    if (pinch.current && pointers.current.size === 2 && s.view !== "history") {
      const d = pinchDist();
      if (d > 12) s.setDomainScale(pinch.current.scale * (pinch.current.dist / d));
    }
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
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
      className="relative h-full w-full min-w-0 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      aria-label="Chart stage"
    >
      {h > 0 && def && (
        <div
          key={`${view}:${snapshot.symbol}:${strategyId}`}
          className="stage-enter absolute inset-0"
        >
          {view === "history" && <PriceCone snapshot={snapshot} height={chartH} />}
          {view === "payoff" && (
            <>
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
            <>
              <div className="hud pointer-events-none absolute right-2 top-0 z-10 flex items-center gap-2 !text-[9.5px]">
                <span>loss</span>
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-20 rounded-full"
                  style={{ background: "linear-gradient(90deg, #e66767, #20242e 50%, #3987e5)" }}
                />
                <span>profit</span>
              </div>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
