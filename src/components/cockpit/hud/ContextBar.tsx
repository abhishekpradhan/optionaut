"use client";

import { useCockpit } from "@/lib/cockpit/store";
import { strategyById } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtDate } from "@/lib/format";
import { Info } from "lucide-react";

/** Top-left: who and where you are, Universe-Atlas corner style. */
export function ContextBar({ snapshot }: { snapshot: Snapshot | null }) {
  const ticker = useCockpit((s) => s.ticker);
  const strategyId = useCockpit((s) => s.strategyId);
  const view = useCockpit((s) => s.view);
  const expIndex = useCockpit((s) => s.expIndex);
  const setOverlay = useCockpit((s) => s.setOverlay);

  const def = strategyById(strategyId);
  const exp = snapshot?.expirations[Math.min(expIndex, (snapshot?.expirations.length ?? 1) - 1)];

  return (
    <div className="pointer-events-auto select-none">
      <div className="flex items-center gap-2.5">
        {/* status light, not decoration: pulses only while the snapshot
            loads, steady once data is live */}
        <span
          aria-hidden
          title={snapshot ? "snapshot loaded" : "loading snapshot"}
          className={`inline-block size-2 rounded-full bg-primary ${
            snapshot ? "dot-steady" : "dot-pulse"
          }`}
        />
        <span className="font-mono text-[13px] font-bold tracking-[0.22em] text-foreground">
          OPTIONS LAB
        </span>
      </div>
      <div className="hud mt-1.5 flex flex-wrap items-center gap-x-2 !text-[10.5px]">
        <span className="text-secondary-foreground">{ticker}</span>
        {snapshot && <span className="text-muted-foreground/60">{snapshot.name}</span>}
        {view !== "history" && def && (
          <>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span className="text-secondary-foreground">{def.name}</span>
            {exp && (
              <span className="text-muted-foreground/60">
                {fmtDate(exp.date)} · {exp.dte}d
              </span>
            )}
            <button
              onClick={() => setOverlay("guide")}
              className="ml-0.5 rounded p-0.5 text-muted-foreground transition-colors hover:text-primary"
              aria-label="How this strategy works"
              title="How this works (i)"
            >
              <Info className="size-3.5" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
