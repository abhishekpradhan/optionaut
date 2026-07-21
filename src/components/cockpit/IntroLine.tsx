"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";

/** First-run invitation, Universe-Atlas style: one quiet centered line
 *  that dissolves the moment you touch anything. */
export function IntroLine() {
  const [show, setShow] = React.useState(false);
  const overlay = useCockpit((s) => s.overlay);
  const tour = useCockpit((s) => s.tour);

  React.useEffect(() => {
    if (localStorage.getItem("ol-intro-seen")) return;
    const reveal = setTimeout(() => setShow(true), 500);
    const dismiss = () => {
      localStorage.setItem("ol-intro-seen", "1");
      setShow(false);
    };
    const unsub = useCockpit.subscribe((s, prev) => {
      if (
        s.whatIfPrice !== prev.whatIfPrice ||
        s.elapsedDays !== prev.elapsedDays ||
        s.ivScale !== prev.ivScale ||
        s.strategyId !== prev.strategyId ||
        s.ticker !== prev.ticker ||
        s.tour !== prev.tour
      ) {
        dismiss();
      }
    });
    const t = setTimeout(dismiss, 30_000);
    return () => {
      unsub();
      clearTimeout(t);
      clearTimeout(reveal);
    };
  }, []);

  if (!show || overlay || tour) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex flex-col items-center gap-1.5 px-4 text-center">
      <div className="hud !text-[11px] !tracking-[0.3em] text-secondary-foreground">
        pick a ticker · twist the dials · name the forces
      </div>
      <div className="hud !text-[9.5px] text-muted-foreground/70">
        press <span className="text-primary">t</span> for the grand tour · <span className="text-primary">?</span> for controls
      </div>
    </div>
  );
}
