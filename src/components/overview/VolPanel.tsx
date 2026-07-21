"use client";

import type { Snapshot } from "@/lib/data/types";
import { expectedMove } from "@/lib/options/position";
import { fmtPct, fmtUsd, fmtDate } from "@/lib/format";

/** Volatility context: what the options market expects vs what the stock
 *  has actually done. Observation, never advice. */
export function VolPanel({ snapshot }: Props) {
  const iv = snapshot.iv30;
  const hv20 = snapshot.hv20;
  const hv252 = snapshot.hv252;

  const monthly = snapshot.expirations.reduce(
    (p, c) => (Math.abs(c.dte - 30) < Math.abs(p.dte - 30) ? c : p),
    snapshot.expirations[0],
  );
  const em = iv ? expectedMove(snapshot.spot, iv, monthly.dte) : null;

  let mood: string | null = null;
  if (iv && hv20) {
    const ratio = iv / hv20;
    if (ratio > 1.25)
      mood = `Options are pricing noticeably more movement (${fmtPct(iv, 0)} annualized) than ${snapshot.symbol} has actually delivered lately (${fmtPct(hv20, 0)}). Traders are paying up for protection or a coming event — sellers of premium are being paid richly for the risk.`;
    else if (ratio < 0.8)
      mood = `Options are pricing less movement (${fmtPct(iv, 0)}) than the stock has recently shown (${fmtPct(hv20, 0)}). Premium is comparatively cheap — buyers of options are getting in at quieter prices.`;
    else
      mood = `Options are pricing about as much movement (${fmtPct(iv, 0)}) as the stock has recently delivered (${fmtPct(hv20, 0)}) — no obvious drama premium in either direction.`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Options expect"
          value={iv ? fmtPct(iv, 0) : "—"}
          sub="implied vol, 30-day"
        />
        <Tile
          label="Stock delivered"
          value={hv20 ? fmtPct(hv20, 0) : "—"}
          sub="realized vol, 20-day"
        />
        <Tile
          label="Typical year"
          value={hv252 ? fmtPct(hv252, 0) : "—"}
          sub="realized vol, 1-year"
        />
        <Tile
          label={`Expected move by ${fmtDate(monthly.date)}`}
          value={em ? `±${fmtUsd(em, { cents: false })}` : "—"}
          sub={em ? `±${(((em ?? 0) / snapshot.spot) * 100).toFixed(1)}% · ≈68% odds` : "no IV data"}
        />
      </div>
      {mood && (
        <p className="panel px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          {mood}
        </p>
      )}
    </div>
  );
}

interface Props {
  snapshot: Snapshot;
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="figures mt-1 text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
