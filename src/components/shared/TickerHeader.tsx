"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtDateLong } from "@/lib/format";

export function TickerHeader({
  snapshot,
  backHref,
  backLabel,
}: {
  snapshot: Snapshot;
  backHref: string;
  backLabel: string;
}) {
  const up = snapshot.changePct >= 0;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> {backLabel}
        </Link>
        <div className="text-xs text-muted-foreground">
          Snapshot {fmtDateLong(snapshot.capturedAt.slice(0, 10))} · delayed data · educational
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xl font-bold tracking-tight">{snapshot.symbol}</span>
        <span className="text-sm text-muted-foreground">{snapshot.name}</span>
        <span className="figures text-xl font-semibold">{fmtUsd(snapshot.spot)}</span>
        <span className={`figures text-sm ${up ? "text-gain" : "text-loss"}`}>
          {up ? "▲" : "▼"} {Math.abs(snapshot.changePct).toFixed(1)}%
          <span className="ml-1 text-muted-foreground">today</span>
        </span>
      </div>
    </div>
  );
}
