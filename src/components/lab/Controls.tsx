"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { CircleDollarSign, CalendarClock, Activity, RotateCcw } from "lucide-react";
import { useLabStore } from "@/lib/lab/store";
import type { Snapshot } from "@/lib/data/types";
import type { LabLeg } from "@/lib/options/strategies";
import { fmtUsd, fmtPct, fmtDate } from "@/lib/format";

interface Props {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
  expiryDate: string;
}

/** The three dials. They are, secretly, delta, theta, and vega — the app
 *  names them only after the user has felt them (PLAN.md §4). */
export function Controls({ snapshot, legs, dte, expiryDate }: Props) {
  const whatIfPrice = useLabStore((s) => s.whatIfPrice);
  const elapsedDays = useLabStore((s) => s.elapsedDays);
  const ivScale = useLabStore((s) => s.ivScale);
  const setWhatIfPrice = useLabStore((s) => s.setWhatIfPrice);
  const setElapsedDays = useLabStore((s) => s.setElapsedDays);
  const setIvScale = useLabStore((s) => s.setIvScale);
  const resetDials = useLabStore((s) => s.resetDials);

  const spot = snapshot.spot;
  const price = whatIfPrice ?? spot;
  const pctMove = ((price - spot) / spot) * 100;
  const priceStep = spot > 400 ? 1 : spot > 100 ? 0.5 : 0.25;

  const optionLegs = legs.filter((l) => l.kind !== "stock");
  const repIv =
    optionLegs.length > 0
      ? optionLegs.reduce((a, l) => a + l.iv, 0) / optionLegs.length
      : snapshot.iv30 ?? 0.3;

  const dirty = whatIfPrice != null || elapsedDays > 0 || ivScale !== 1;
  const daysLeft = dte - elapsedDays;

  return (
    <div className="panel p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-secondary-foreground">
          Twist the dials
        </h2>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={resetDials}
          >
            <RotateCcw className="size-3" aria-hidden />
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <Dial
          icon={<CircleDollarSign className="size-4" aria-hidden />}
          label="Stock price"
          value={
            <>
              <span className="figures">{fmtUsd(price)}</span>
              <span className={`ml-1.5 figures text-xs ${pctMove >= 0.05 ? "text-gain" : pctMove <= -0.05 ? "text-loss" : "text-muted-foreground"}`}>
                {pctMove >= 0 ? "+" : "−"}
                {Math.abs(pctMove).toFixed(1)}%
              </span>
            </>
          }
        >
          <Slider
            aria-label="What-if stock price"
            min={Math.round(spot * 0.65)}
            max={Math.round(spot * 1.35)}
            step={priceStep}
            value={[price]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : (v as number);
              setWhatIfPrice(Math.abs(val - spot) < priceStep / 2 ? null : val);
            }}
          />
        </Dial>

        <Dial
          icon={<CalendarClock className="size-4" aria-hidden />}
          label="Time travel"
          value={
            <span className="figures">
              {elapsedDays === 0
                ? "today"
                : daysLeft === 0
                  ? `expiry day (${fmtDate(expiryDate)})`
                  : `+${elapsedDays}d · ${daysLeft}d left`}
            </span>
          }
        >
          <Slider
            aria-label="Days into the future"
            min={0}
            max={dte}
            step={1}
            value={[elapsedDays]}
            onValueChange={(v) => setElapsedDays(Array.isArray(v) ? v[0] : (v as number))}
          />
        </Dial>

        <Dial
          icon={<Activity className="size-4" aria-hidden />}
          label="Volatility"
          value={
            <span className="figures">
              ×{ivScale.toFixed(2)}
              <span className="ml-1.5 text-xs text-muted-foreground">
                IV ≈ {fmtPct(repIv * ivScale, 0)}
              </span>
            </span>
          }
        >
          <Slider
            aria-label="Volatility multiplier"
            min={0.5}
            max={1.8}
            step={0.05}
            value={[ivScale]}
            onValueChange={(v) => setIvScale(Array.isArray(v) ? v[0] : (v as number))}
          />
        </Dial>
      </div>
    </div>
  );
}

function Dial({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="text-secondary-foreground/70">{icon}</span>
          {label}
        </span>
        <span className="text-[13px] text-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}
