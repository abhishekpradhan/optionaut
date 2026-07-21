"use client";

import { useCockpit } from "@/lib/cockpit/store";
import {
  payoffExtremes,
  breakevens,
  probabilityOfProfit,
  netGreeks,
  expectedMove,
} from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtSignedUsd, fmtPct, fmtDate } from "@/lib/format";

/** Right stack, lower — view-aware readouts. History view: volatility
 *  context. Payoff/map: position stats + a greeks micro-strip. */
export function StatStack({
  snapshot,
  legs,
  dte,
}: {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
}) {
  const view = useCockpit((s) => s.view);
  const whatIfPrice = useCockpit((s) => s.whatIfPrice);
  const elapsedDays = useCockpit((s) => s.elapsedDays);
  const ivScale = useCockpit((s) => s.ivScale);

  if (view === "history") {
    const monthly = snapshot.expirations.reduce(
      (p, c) => (Math.abs(c.dte - 30) < Math.abs(p.dte - 30) ? c : p),
      snapshot.expirations[0],
    );
    const em = snapshot.iv30 ? expectedMove(snapshot.spot, snapshot.iv30, monthly.dte) : null;
    return (
      <Rows
        title="volatility"
        rows={[
          ["options expect", snapshot.iv30 ? fmtPct(snapshot.iv30, 0) : "—"],
          ["stock delivered (20d)", snapshot.hv20 ? fmtPct(snapshot.hv20, 0) : "—"],
          ["typical year", snapshot.hv252 ? fmtPct(snapshot.hv252, 0) : "—"],
          [
            `expected by ${fmtDate(monthly.date)}`,
            em ? `±${fmtUsd(em, { cents: false })}` : "—",
          ],
        ]}
      />
    );
  }

  if (!legs.length) return null;
  const ctx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const ext = payoffExtremes(legs);
  const bes = breakevens(legs);
  const sigma = snapshot.iv30 ?? legs.find((l) => l.iv > 0)?.iv ?? 0.3;
  const pop = probabilityOfProfit(legs, snapshot.spot, sigma, dte, ctx);
  const g = netGreeks(legs, whatIfPrice ?? snapshot.spot, elapsedDays, ctx, ivScale);
  const stockOnly = legs.every((l) => l.kind === "stock");

  return (
    <div className="space-y-4">
      <Rows
        title="position"
        rows={[
          [
            "max profit",
            Number.isFinite(ext.maxProfit) ? fmtSignedUsd(ext.maxProfit, { cents: false }) : "unlimited",
            "gain",
          ],
          [
            "max loss",
            Number.isFinite(ext.maxLoss) ? fmtSignedUsd(ext.maxLoss, { cents: false }) : "unlimited",
            "loss",
          ],
          [
            bes.length === 1 ? "breakeven" : "breakevens",
            bes.length ? bes.map((b) => fmtUsd(b, { cents: false })).join(" · ") : "—",
          ],
          ["est. win odds", stockOnly ? "—" : fmtPct(pop, 0)],
        ]}
      />
      {!stockOnly && (
        <Rows
          title="greeks · the dials, named"
          rows={[
            ["Δ delta / $1", fmtSignedUsd(g.delta, { cents: false })],
            ["Γ gamma / $1", `${g.gamma >= 0 ? "+" : "−"}${Math.abs(g.gamma).toFixed(1)}Δ`],
            ["Θ theta / day", fmtSignedUsd(g.theta / 365, { cents: false })],
            ["V vega / 1pt", fmtSignedUsd(g.vega / 100, { cents: false })],
          ]}
        />
      )}
    </div>
  );
}

function Rows({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string, ("gain" | "loss")?]>;
}) {
  return (
    <div className="pointer-events-auto select-none">
      <div className="hud mb-1.5 !text-[9px] !tracking-[0.2em] text-muted-foreground/70">{title}</div>
      <dl className="space-y-1">
        {rows.map(([k, v, tone]) => (
          <div key={k} className="flex items-baseline justify-between gap-4">
            <dt className="text-[10.5px] text-muted-foreground">{k}</dt>
            <dd
              className={`figures text-[11.5px] ${
                tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-secondary-foreground"
              }`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
