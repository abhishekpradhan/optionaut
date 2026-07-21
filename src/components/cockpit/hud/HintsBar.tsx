"use client";

import { useCockpit } from "@/lib/cockpit/store";
import type { Snapshot } from "@/lib/data/types";
import { fmtDateLong } from "@/lib/format";

/** Top-right: the honesty chip and the keyboard whisper. */
export function HintsBar({ snapshot }: { snapshot: Snapshot | null }) {
  const setOverlay = useCockpit((s) => s.setOverlay);
  return (
    <div className="pointer-events-auto flex select-none flex-col items-end gap-1 text-right">
      <button
        onClick={() => setOverlay("about")}
        className="hud max-w-[52vw] truncate rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground sm:max-w-none"
        title="How the numbers are made"
      >
        educational · delayed snapshot
        {snapshot ? ` · ${fmtDateLong(snapshot.capturedAt.slice(0, 10))}` : ""} · not advice
      </button>
      <button
        onClick={() => setOverlay("help")}
        className="hud hidden rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground/60 transition-colors hover:text-foreground md:block"
        title="All controls (?)"
      >
        h/p/m views · [ ] expiry · drag strikes · ? help
      </button>
    </div>
  );
}
