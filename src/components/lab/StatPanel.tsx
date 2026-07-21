"use client";

import {
  netEntryCost,
  payoffExtremes,
  breakevens,
  probabilityOfProfit,
  markToMarket,
} from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtSignedUsd, fmtPct } from "@/lib/format";

interface Props {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
  elapsedDays: number;
  ivScale: number;
  whatIfPrice: number | null;
}

export function StatPanel({ snapshot, legs, dte, elapsedDays, ivScale, whatIfPrice }: Props) {
  const ctx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const spot = snapshot.spot;
  const price = whatIfPrice ?? spot;

  const cost = netEntryCost(legs);
  const ext = payoffExtremes(legs);
  const bes = breakevens(legs);
  const sigma = snapshot.iv30 ?? (legs.find((l) => l.iv > 0)?.iv ?? 0.3);
  const pop = probabilityOfProfit(legs, spot, sigma, dte, ctx);
  const current = markToMarket(legs, price, elapsedDays, ctx, ivScale);

  const scenario =
    whatIfPrice == null && elapsedDays === 0 && ivScale === 1
      ? "right now, as priced"
      : `if ${snapshot.symbol} is ${fmtUsd(price)}${elapsedDays > 0 ? ` in ${elapsedDays}d` : " today"}${ivScale !== 1 ? `, IV ×${ivScale.toFixed(2)}` : ""}`;

  const stockOnly = legs.every((l) => l.kind === "stock");

  return (
    <div className="flex flex-col gap-3">
      {/* hero: the scenario readout the dials drive */}
      <div className="panel p-4 sm:p-5">
        <div className="text-[13px] text-muted-foreground">Your P/L {scenario}</div>
        <div
          className={`mt-1 text-3xl font-semibold tracking-tight ${
            current > 0.5 ? "text-gain" : current < -0.5 ? "text-loss" : "text-foreground"
          }`}
        >
          {fmtSignedUsd(current, { cents: false })}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          per {legs.some((l) => l.kind !== "stock") ? "1-contract position" : "100 shares"} · snapshot pricing
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          label={cost >= 0 ? "You pay" : "You collect"}
          value={fmtUsd(Math.abs(cost), { cents: false })}
          sub={cost >= 0 ? "net debit" : "net credit"}
        />
        <Tile
          label="Est. chance of profit"
          value={stockOnly ? "—" : fmtPct(pop, 0)}
          sub={stockOnly ? "n/a for shares" : "model estimate"}
        />
        <Tile
          label="Max profit"
          value={Number.isFinite(ext.maxProfit) ? fmtSignedUsd(ext.maxProfit, { cents: false }) : "Unlimited"}
          sub={
            ext.maxProfitAt === "above"
              ? "keeps growing above"
              : ext.maxProfitAt != null
                ? `at ${fmtUsd(ext.maxProfitAt as number, { cents: false })}`
                : undefined
          }
          tone="gain"
        />
        <Tile
          label="Max loss"
          value={Number.isFinite(ext.maxLoss) ? fmtSignedUsd(ext.maxLoss, { cents: false }) : "Unlimited"}
          sub={
            ext.maxLossAt === "above"
              ? "grows above"
              : ext.maxLossAt != null
                ? `at ${fmtUsd(ext.maxLossAt as number, { cents: false })}`
                : undefined
          }
          tone="loss"
        />
        <Tile
          className="col-span-2"
          label={bes.length === 1 ? "Breakeven" : "Breakevens"}
          value={bes.length ? bes.map((b) => fmtUsd(b, { cents: false })).join("  ·  ") : "—"}
          sub={`stock is at ${fmtUsd(spot, { cents: false })} now`}
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "gain" | "loss";
  className?: string;
}) {
  return (
    <div className={`panel px-4 py-3 ${className}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`figures mt-1 text-[17px] font-semibold ${
          tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
