"use client";

import * as React from "react";
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
import { Term } from "@/components/learn/Term";

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
          [<Term key="iv" id="iv">options expect</Term>, snapshot.iv30 ? fmtPct(snapshot.iv30, 0) : "—"],
          [<Term key="hv" id="hv">stock delivered (20d)</Term>, snapshot.hv20 ? fmtPct(snapshot.hv20, 0) : "—"],
          ["typical year", snapshot.hv252 ? fmtPct(snapshot.hv252, 0) : "—"],
          [
            <Term key="em" id="expected-move">{`expected by ${fmtDate(monthly.date)}`}</Term>,
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
            <Term key="be" id="breakeven">{bes.length === 1 ? "breakeven" : "breakevens"}</Term>,
            bes.length ? bes.map((b) => fmtUsd(b, { cents: false })).join(" · ") : "—",
          ],
          [<Term key="pop" id="pop">est. win odds</Term>, stockOnly ? "—" : fmtPct(pop, 0)],
        ]}
      />
      {!stockOnly && (
        <Rows
          title="greeks · the dials, named"
          rows={[
            [<Term key="d" id="delta">Δ delta / $1</Term>, fmtSignedUsd(g.delta, { cents: false })],
            [<Term key="g" id="gamma">Γ gamma / $1</Term>, `${g.gamma >= 0 ? "+" : "−"}${Math.abs(g.gamma).toFixed(1)}Δ`],
            [<Term key="t" id="theta">Θ theta / day</Term>, fmtSignedUsd(g.theta / 365, { cents: false })],
            [<Term key="v" id="vega">V vega / 1pt</Term>, fmtSignedUsd(g.vega / 100, { cents: false })],
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
  rows: Array<[React.ReactNode, string, ("gain" | "loss")?]>;
}) {
  return (
    <div className="pointer-events-auto select-none">
      <div className="hud mb-1.5 !text-[9px] !tracking-[0.2em] text-muted-foreground/70">{title}</div>
      <dl className="space-y-1">
        {rows.map(([k, v, tone], i) => (
          <div key={i} className="flex items-baseline justify-between gap-4">
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
