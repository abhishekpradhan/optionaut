"use client";

import { useCockpit } from "@/lib/cockpit/store";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
import type { Snapshot } from "@/lib/data/types";
import type { LabLeg } from "@/lib/options/strategies";
import { fmtUsd, fmtPct, fmtDate } from "@/lib/format";

/** Right stack, upper: expiry pills + the three dials, compact. */
export function DialStack({
  snapshot,
  legs,
  dte,
}: {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
}) {
  const expIndex = useCockpit((s) => s.expIndex);
  const whatIfPrice = useCockpit((s) => s.whatIfPrice);
  const elapsedDays = useCockpit((s) => s.elapsedDays);
  const ivScale = useCockpit((s) => s.ivScale);
  const setExpIndex = useCockpit((s) => s.setExpIndex);
  const setWhatIfPrice = useCockpit((s) => s.setWhatIfPrice);
  const setElapsedDays = useCockpit((s) => s.setElapsedDays);
  const setIvScale = useCockpit((s) => s.setIvScale);
  const resetDials = useCockpit((s) => s.resetDials);

  const spot = snapshot.spot;
  const price = whatIfPrice ?? spot;
  const pctMove = ((price - spot) / spot) * 100;
  const priceStep = spot > 400 ? 1 : spot > 100 ? 0.5 : 0.25;
  const optionLegs = legs.filter((l) => l.kind !== "stock");
  const repIv = optionLegs.length
    ? optionLegs.reduce((a, l) => a + l.iv, 0) / optionLegs.length
    : snapshot.iv30 ?? 0.3;
  const dirty = whatIfPrice != null || elapsedDays > 0 || ivScale !== 1;
  const oneOf = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number));

  return (
    <div className="pointer-events-auto select-none">
      {/* expiries */}
      <div className="mb-3 flex flex-wrap justify-end gap-1">
        {snapshot.expirations.map((e, i) => (
          <button
            key={e.date}
            onClick={() => setExpIndex(i)}
            aria-pressed={i === expIndex}
            className={`hud rounded border px-1.5 py-0.5 !text-[9px] transition-colors ${
              i === expIndex
                ? "border-primary/70 text-foreground"
                : "border-border/60 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {e.dte}d
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        <Dial
          label="price"
          value={
            <>
              {fmtUsd(price, { cents: false })}
              <span className={`ml-1 ${pctMove >= 0.05 ? "text-gain" : pctMove <= -0.05 ? "text-loss" : "text-muted-foreground"}`}>
                {pctMove >= 0 ? "+" : "−"}{Math.abs(pctMove).toFixed(1)}%
              </span>
            </>
          }
        >
          <Slider aria-label="What-if stock price"
            min={Math.round(spot * 0.65)} max={Math.round(spot * 1.35)} step={priceStep}
            value={[price]}
            onValueChange={(v) => {
              const val = oneOf(v);
              setWhatIfPrice(Math.abs(val - spot) < priceStep / 2 ? null : val);
            }}
          />
        </Dial>
        <Dial
          label="time"
          value={
            elapsedDays === 0 ? "today" : elapsedDays >= dte ? `expiry (${fmtDate(snapshot.expirations[expIndex]?.date ?? "")})` : `+${elapsedDays}d · ${dte - elapsedDays}d left`
          }
        >
          <Slider aria-label="Days into the future" min={0} max={dte} step={1}
            value={[elapsedDays]} onValueChange={(v) => setElapsedDays(oneOf(v))} />
        </Dial>
        <Dial label="volatility" value={<>×{ivScale.toFixed(2)} · iv ≈ {fmtPct(repIv * ivScale, 0)}</>}>
          <Slider aria-label="Volatility multiplier" min={0.5} max={1.8} step={0.05}
            value={[ivScale]} onValueChange={(v) => setIvScale(oneOf(v))} />
        </Dial>
      </div>

      {dirty && (
        <button
          onClick={resetDials}
          className="hud mt-3 flex items-center gap-1 !text-[9px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-2.5" aria-hidden /> reset (r)
        </button>
      )}
    </div>
  );
}

function Dial({ label, value, children }: { label: string; value: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="hud !text-[9px]">{label}</span>
        <span className="figures text-[11px] text-secondary-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}
