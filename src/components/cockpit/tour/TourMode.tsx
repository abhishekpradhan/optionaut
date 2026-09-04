"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { TOURS, tourById } from "./tours";
import { buildCtx } from "./ctx";
import { goToStep, startTour, settleStep, leaveTour } from "./navigate";
import { markTourStep, markTourDone } from "@/lib/cockpit/tourProgress";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

/**
 * The caption card that flies the instrument. It lives in its own lane
 * between the stage and the readout — never over the pills, axis labels,
 * or numbers a caption is pointing at — and the stage stays fully
 * interactive: that is the point. Cognitive gates hold Next until the
 * learner does the thing (a quiet "skip" keeps the thread readable
 * without it); reveals answer the step's own question from the live
 * numbers; the control a step names lights up in the HUD.
 */
export function TourMode({ snapshot, legs }: { snapshot: Snapshot | null; legs: LabLeg[] }) {
  const tour = useCockpit((s) => s.tour);
  const ticker = useCockpit((s) => s.ticker);
  const expIndex = useCockpit((s) => s.expIndex);
  const setTour = useCockpit((s) => s.setTour);
  const setOverlay = useCockpit((s) => s.setOverlay);

  const def = tour ? tourById.get(tour.id) : null;
  const step = def?.steps[tour?.step ?? 0];
  const stepKey = tour ? `${tour.id}:${tour.step}` : "";
  const live = !!(step?.gate || step?.reveal);

  // Only steps with a gate or a reveal follow the dials; the rest of the
  // card stays out of the per-frame render loop of a drag.
  useCockpit((s) =>
    live ? `${s.whatIfPrice}|${s.elapsedDays}|${s.ivScale}|${s.strategyId}|${Object.keys(s.overrides).join(",")}` : "",
  );

  // ——— scene: a cold arrival gets phase 1 here; phase 2 lands with the chain ———
  React.useEffect(() => {
    if (tour) settleStep(tour, snapshot);
  }, [tour, snapshot]);
  React.useEffect(() => () => leaveTour(), []);

  // ——— remember the place; reaching the last caption counts as done ———
  React.useEffect(() => {
    if (!tour || !def) return;
    if (tour.step === def.steps.length - 1) markTourDone(tour.id, def.steps.length);
    else markTourStep(tour.id, tour.step, def.steps.length);
  }, [tour, def]);

  // ——— gate + reveal, from the live numbers ———
  const ctx = React.useMemo(
    () => (snapshot && snapshot.symbol === ticker ? buildCtx(snapshot, expIndex, legs) : null),
    [snapshot, ticker, expIndex, legs],
  );
  const state = useCockpit.getState();
  const passesNow = !!(step?.gate && ctx && step.gate.check(state, ctx));
  // Latched during render (the "adjust state while rendering" pattern):
  // once a gate has opened it stays open even if the dial drifts back —
  // and every arrival at a step re-arms it.
  const [latch, setLatch] = React.useState({ key: "", open: false });
  if (latch.key !== stepKey) setLatch({ key: stepKey, open: false });
  else if (passesNow && !latch.open) setLatch({ key: stepKey, open: true });
  const gateOpen = !!step && (!step.gate || passesNow || (latch.key === stepKey && latch.open));

  // ——— navigation ———
  const back = React.useCallback(() => {
    const t = useCockpit.getState().tour;
    if (t && t.step > 0) goToStep({ ...t, step: t.step - 1 });
  }, []);
  const advance = React.useCallback(() => {
    const t = useCockpit.getState().tour;
    const d = t ? tourById.get(t.id) : null;
    if (!t || !d) return;
    if (t.step < d.steps.length - 1) {
      goToStep({ ...t, step: t.step + 1 });
      return;
    }
    markTourDone(d.id, d.steps.length);
    const nt = TOURS[TOURS.findIndex((x) => x.id === d.id) + 1];
    if (nt) startTour(nt.id);
    else {
      setTour(null);
      setOverlay("tours");
    }
  }, [setTour, setOverlay]);

  // Arrow keys walk the steps (Enter too, unless a button already has
  // focus — it would fire twice). Sliders, pills, popovers and sheets
  // keep their own keys.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useCockpit.getState();
      if (!s.tour || s.overlay) return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [role=slider], [data-slot=popover-content], [role=dialog]")) return;
      if (e.key === "ArrowRight" || (e.key === "Enter" && !t.closest("button, a"))) {
        if (gateOpen) {
          e.preventDefault();
          advance();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gateOpen, advance, back]);

  // The caption is part of the page's prerendered HTML (deep links), so
  // the card renders before the security's data lands; gates simply wait.
  if (!tour || !def || !step) return null;

  const tourIdx = TOURS.findIndex((t) => t.id === def.id);
  const nextTour = TOURS[tourIdx + 1];
  const last = tour.step === def.steps.length - 1;
  const revealNode = step.reveal && ctx && gateOpen ? step.reveal(state, ctx) : null;

  return (
    <div className="px-4 pt-2 sm:px-5" role="region" aria-label="Tour">
      <div className="panel stage-enter border-primary/30 px-4 py-3 shadow-[0_0_40px_-10px_rgba(57,135,229,0.35)]">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1" aria-live="polite">
            <div className="hud !text-[9px] text-primary">
              tour {tourIdx + 1} of {TOURS.length} · {def.title} · step {tour.step + 1}/{def.steps.length}
            </div>
            <p className="mt-1.5 max-w-[88ch] text-[13.5px] leading-relaxed text-secondary-foreground/95">
              {step.caption}
            </p>
            {revealNode && (
              <p className="figures mt-1.5 max-w-[88ch] text-[12.5px] leading-relaxed text-primary">
                {revealNode}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end justify-between gap-2.5 self-stretch">
            <button
              onClick={() => setTour(null)}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Leave the tour (esc) — your place is saved"
              title="Leave the tour — your place is saved"
            >
              <X className="size-3.5" aria-hidden />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={back}
                disabled={tour.step === 0}
                className="hud flex items-center gap-1 !text-[9.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                <ArrowLeft className="size-3" aria-hidden /> back
              </button>
              {!gateOpen && step.gate ? (
                <>
                  <span className="hud animate-pulse !text-[9.5px] text-primary" aria-live="polite">
                    → {step.gate.hint}
                  </span>
                  <button
                    onClick={advance}
                    className="hud !text-[9.5px] text-muted-foreground/60 transition-colors hover:text-foreground"
                    title="Move on without doing it"
                  >
                    skip
                  </button>
                </>
              ) : (
                <button
                  onClick={advance}
                  className="hud flex items-center gap-1 whitespace-nowrap rounded-md border border-primary/50 px-3 py-1.5 !text-[9.5px] text-primary transition-colors hover:bg-accent"
                >
                  {last
                    ? nextTour
                      ? `next tour · ${nextTour.title}`
                      : "finish · back to the tours"
                    : "next"}
                  <ArrowRight className="size-3" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
