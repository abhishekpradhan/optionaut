"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { tourById } from "./tours";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

/** The caption card that flies the instrument: non-modal (the stage
 *  stays fully interactive — that's the point), bottom-center, with
 *  cognitive gates that hold Next until the learner does the thing. */
export function TourMode() {
  const tour = useCockpit((s) => s.tour);
  const setTour = useCockpit((s) => s.setTour);
  const setOverlay = useCockpit((s) => s.setOverlay);

  const def = tour ? tourById.get(tour.id) : null;
  const step = def?.steps[tour?.step ?? 0];

  // run the step's setup exactly once per (tour, step)
  const appliedRef = React.useRef<string>("");
  const stepKey = tour ? `${tour.id}:${tour.step}` : "";
  React.useEffect(() => {
    if (!tour || !step || appliedRef.current === stepKey) return;
    appliedRef.current = stepKey;
    step.setup?.(useCockpit.getState());
  }, [tour, step, stepKey]);

  // live gate check: the subscription records which step's gate passed;
  // render-time getState covers the already-satisfied case
  const [passedKey, setPassedKey] = React.useState("");
  React.useEffect(() => {
    if (!step?.gate) return;
    const unsub = useCockpit.subscribe((s) => {
      if (step.gate!.check(s)) setPassedKey(stepKey);
    });
    return unsub;
  }, [step, stepKey]);

  // Not gated on the snapshot: the caption is part of the page's
  // prerendered HTML, and the stage catches up when its data lands.
  if (!tour || !def || !step) return null;

  const gateOpen =
    !step.gate || passedKey === stepKey || step.gate.check(useCockpit.getState());
  const last = tour.step === def.steps.length - 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center px-4">
      <div className="panel pointer-events-auto w-full max-w-xl border-primary/30 p-4 shadow-[0_0_40px_-10px_rgba(57,135,229,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="hud !text-[9px] text-primary">
            tour · {def.title} · {tour.step + 1}/{def.steps.length}
          </div>
          <button
            onClick={() => setTour(null)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Exit tour (esc)"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-secondary-foreground/95">
          {step.caption}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={() => tour.step > 0 && setTour({ ...tour, step: tour.step - 1 })}
            disabled={tour.step === 0}
            className="hud flex items-center gap-1 !text-[9.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="size-3" aria-hidden /> back
          </button>
          {!gateOpen && step.gate ? (
            <span className="hud animate-pulse !text-[9.5px] text-primary">
              → {step.gate.hint}
            </span>
          ) : last ? (
            <button
              onClick={() => {
                setTour(null);
                setOverlay("tours");
              }}
              className="hud rounded-md border border-primary/50 px-3 py-1.5 !text-[9.5px] text-primary transition-colors hover:bg-accent"
            >
              finish · more tours
            </button>
          ) : (
            <button
              onClick={() => setTour({ ...tour, step: tour.step + 1 })}
              className="hud flex items-center gap-1 rounded-md border border-primary/50 px-3 py-1.5 !text-[9.5px] text-primary transition-colors hover:bg-accent"
            >
              next <ArrowRight className="size-3" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
