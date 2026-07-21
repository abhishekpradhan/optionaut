"use client";

import { useCockpit } from "@/lib/cockpit/store";
import { strategyById } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtDate } from "@/lib/format";
import { AlertTriangle } from "lucide-react";

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
          OPTIONAUT
        </span>
      </div>
      <div className="hud mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 !text-[10.5px]">
        <span className="text-secondary-foreground">{ticker}</span>
        {snapshot && snapshot.name !== snapshot.symbol && (
          <span className="text-muted-foreground/60">{snapshot.name}</span>
        )}
        {snapshot?.source === "custom" && (
          <span
            className="rounded border border-dashed border-border px-1.5 py-px !text-[8.5px] text-muted-foreground"
            title="Added by you — stored only in this browser"
          >
            yours
          </span>
        )}
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
              className="ml-1 flex shrink-0 items-center gap-1 rounded-md border border-border/80 bg-background/40 px-2 py-0.5 !text-[9.5px] transition-colors hover:border-[color:var(--warn)]/50 hover:text-foreground"
              title="How this strategy works — and how it bites (i)"
            >
              <AlertTriangle className="size-3" style={{ color: "var(--warn)" }} aria-hidden />
              what can bite?
            </button>
          </>
        )}
      </div>
      {/* who this security is — always on screen, never a hover secret */}
      {snapshot?.blurb && (
        <p
          className="mt-1 max-w-xl truncate text-[11.5px] leading-snug text-muted-foreground"
          title={snapshot.blurb}
        >
          <span className="text-secondary-foreground/80">
            {snapshot.simulated && snapshot.source !== "custom" ? "fictional" : "yours"}
          </span>
          {" — "}
          {snapshot.blurb}
        </p>
      )}
      {/* the strategy's WHY, below it in the flying views */}
      {view !== "history" && def && (
        <p
          className="mt-0.5 max-w-xl truncate text-[11.5px] leading-snug text-muted-foreground"
          title={def.tagline}
        >
          <span className="text-secondary-foreground/80">
            {def.outlook === "bigmove" ? "big move" : def.outlook} · {def.risk} risk
          </span>
          {" — "}
          {def.tagline}
        </p>
      )}
    </div>
  );
}
