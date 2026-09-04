"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { Term } from "@/components/learn/Term";
import { TOURS, TOTAL_MINUTES } from "./tour/tours";
import { startTour } from "./tour/navigate";
import {
  getTourProgress,
  isIntroSeen,
  isWelcomed,
  setIntroSeen,
  setWelcomed,
} from "@/lib/cockpit/tourProgress";

/**
 * First-run invitation. A first visit gets a real offer — start the
 * tour, or just explore — because the cockpit is a lot to land in cold.
 * Later visits get the quiet one-line mantra, session-scoped, Universe-
 * Atlas style: it dissolves the moment you touch anything.
 */
export function FirstRun() {
  const [mode, setMode] = React.useState<"none" | "welcome" | "line">("none");
  const overlay = useCockpit((s) => s.overlay);
  const tour = useCockpit((s) => s.tour);
  const view = useCockpit((s) => s.view);
  // the session-scoped dismissal, shared by the subscription and the buttons
  const dismissRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    // Someone deep-linked into a tour, or has flown one before, needs no
    // invitation — and must not get one on a later visit either.
    if (useCockpit.getState().tour || Object.keys(getTourProgress()).length > 0) {
      setWelcomed();
      return;
    }
    if (isIntroSeen()) return;
    const welcomed = isWelcomed();
    const reveal = setTimeout(() => setMode(welcomed ? "line" : "welcome"), 500);
    // Touching the instrument — a dial, a chip, a view, a tour — dismisses
    // the invitation for the session and detaches this listener; only an
    // explicit answer settles the first-visit offer for good.
    let unsub = () => {};
    const dismiss = () => {
      setIntroSeen();
      setMode("none");
      unsub();
    };
    dismissRef.current = dismiss;
    unsub = useCockpit.subscribe((s, prev) => {
      if (
        s.whatIfPrice !== prev.whatIfPrice ||
        s.elapsedDays !== prev.elapsedDays ||
        s.ivScale !== prev.ivScale ||
        s.strategyId !== prev.strategyId ||
        s.ticker !== prev.ticker ||
        s.view !== prev.view ||
        s.tour !== prev.tour
      ) {
        dismiss();
      }
    });
    const t = welcomed ? setTimeout(dismiss, 30_000) : null;
    return () => {
      unsub();
      if (t) clearTimeout(t);
      clearTimeout(reveal);
    };
  }, []);

  if (mode === "none" || overlay || tour) return null;

  if (mode === "line") {
    // Payoff view only: the mantra's verbs belong to that view, and it
    // collides with history's labels.
    if (view !== "payoff") return null;
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex flex-col items-center gap-1.5 px-4 text-center">
        <div className="hud !text-[11px] !tracking-[0.3em] text-secondary-foreground">
          pick a security · drag the pills under the chart · twist the dials
        </div>
        <div className="hud !text-[9.5px] text-muted-foreground/70">
          press <span className="text-primary">t</span> for the tours · <span className="text-primary">?</span> for controls
        </div>
      </div>
    );
  }

  const start = () => {
    setWelcomed();
    dismissRef.current();
    startTour(TOURS[0].id);
  };
  const explore = () => {
    setWelcomed();
    dismissRef.current();
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[24%] z-20 flex justify-center px-4">
      <div
        className="panel stage-enter pointer-events-auto w-full max-w-md border-primary/30 p-5 text-center shadow-[0_0_40px_-10px_rgba(57,135,229,0.35)]"
        role="dialog"
        aria-labelledby="first-run-title"
      >
        <div className="hud !text-[9.5px] text-primary">first flight</div>
        <h2 id="first-run-title" className="mt-1.5 text-lg font-semibold tracking-tight">
          New to <Term id="option">options</Term>?
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {TOURS.length} short tours fly this instrument one idea at a time: plain{" "}
          <Term id="share">shares</Term> first, then your first <Term id="option">option</Term>,
          then everything that can go wrong. About {TOTAL_MINUTES} minutes end to end; each tour
          stands alone, and your place is saved.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={start}
            autoFocus
            className="hud rounded-md border border-primary/60 bg-accent px-3.5 py-2 !text-[10px] text-foreground transition-colors hover:border-primary"
          >
            ✦ start the tour · {TOURS[0].minutes} min
          </button>
          <button
            onClick={explore}
            className="hud rounded-md border border-border px-3.5 py-2 !text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            just explore
          </button>
        </div>
      </div>
    </div>
  );
}
