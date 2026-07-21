"use client";

import { useCockpit } from "@/lib/cockpit/store";
import type { Snapshot } from "@/lib/data/types";

/** Top-right: the honesty chip and the keyboard whisper. */
export function HintsBar({ snapshot }: { snapshot: Snapshot | null }) {
  const setOverlay = useCockpit((s) => s.setOverlay);
  const custom = snapshot?.source === "custom";
  return (
    <div className="pointer-events-auto flex select-none flex-col items-end gap-1 text-right">
      <button
        onClick={() => setOverlay("about")}
        className="hud max-w-[52vw] truncate rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:max-w-none"
        title="How the numbers are made"
      >
        {custom
          ? "educational · your data · this browser only · not advice"
          : "educational · simulated market · fictional securities · not advice"}
      </button>
      <button
        onClick={() => setOverlay("help")}
        className="hud hidden rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline md:block"
        title="All controls (?)"
      >
        h/p/m views · [ ] expiry · drag strikes · ? help
      </button>
    </div>
  );
}
