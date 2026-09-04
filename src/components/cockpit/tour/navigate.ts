"use client";

import { useCockpit, type TourRef } from "@/lib/cockpit/store";
import { strategyById, defaultExpIndex } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { resumeStep } from "@/lib/cockpit/tourProgress";
import { tourById } from "./tours";
import { mergedScene, sceneDeclaresReset, type Scene } from "./scene";
import { buildCtx } from "./ctx";

/**
 * Moving between tour steps. Every arrival realizes the step's merged
 * scene in two phases. Phase 1 — ticker, strategy, view, dial reset —
 * runs synchronously before the step is shown, so a caption never
 * renders over the previous step's dials and a gate is never judged
 * against stale state. Phase 2 — expiry, strikes, dial values — needs
 * the security's chain and runs the moment it is in hand.
 */

const keyOf = (t: TourRef) => `${t.id}:${t.step}`;

/** the step whose phase 1 has run, and what it still needs from the chain */
let applied = "";
let pending: { key: string; scene: Scene; expiry: Scene["expiry"] } | null = null;

function applyImmediate(sc: Scene, own: Scene | undefined): Scene["expiry"] {
  const s = useCockpit.getState();
  let changed = false;
  if (sc.ticker && sc.ticker !== s.ticker) {
    s.setTicker(sc.ticker);
    changed = true;
  }
  if (sc.strategy && sc.strategy !== useCockpit.getState().strategyId) {
    useCockpit.getState().setStrategy(sc.strategy, null);
    changed = true;
  }
  // Fresh dials when the instrument actually changed, or when this step
  // asks for them; a learner's own dial work survives every other arrival.
  if (changed || sceneDeclaresReset(own)) useCockpit.getState().resetDials();
  if (changed || (own && (own.strategy != null || own.ticker != null))) {
    useCockpit.getState().hydrateShared({ overrides: {} });
  }
  if (sc.view) useCockpit.getState().setView(sc.view);
  return sc.expiry ?? (changed ? "default" : undefined);
}

function applyWithSnapshot(sc: Scene, expiry: Scene["expiry"], snapshot: Snapshot) {
  const s = useCockpit.getState();
  const def = strategyById(s.strategyId);
  if (expiry && def && snapshot.expirations.length) {
    const idx = expiry === "nearest" ? 0 : defaultExpIndex(snapshot, def);
    if (idx !== s.expIndex) s.setExpIndex(idx);
  }
  const st = useCockpit.getState();
  if (sc.overrides) {
    const ov =
      typeof sc.overrides === "function" ? sc.overrides(buildCtx(snapshot, st.expIndex, [])) : sc.overrides;
    st.hydrateShared({ overrides: ov });
  }
  if (sc.dials) {
    const d = sc.dials;
    useCockpit.getState().hydrateShared({
      ...(d.pricePct != null ? { whatIfPrice: snapshot.spot * (1 + d.pricePct) } : {}),
      ...(d.days != null ? { elapsedDays: d.days } : {}),
      ...(d.iv != null ? { ivScale: d.iv } : {}),
    });
  }
}

function arrive(ref: TourRef) {
  const def = tourById.get(ref.id);
  if (!def) return;
  const key = keyOf(ref);
  const scene = mergedScene(def.steps, ref.step);
  applied = key;
  pending = scene ? { key, scene, expiry: applyImmediate(scene, def.steps[ref.step]?.scene) } : null;
}

/** Realize the scene a step expects, then show the step. */
export function goToStep(ref: TourRef) {
  arrive(ref);
  useCockpit.getState().setTour(ref);
}

/** Open a tour at its saved place, or the top. */
export function startTour(id: string) {
  const def = tourById.get(id);
  if (!def) return;
  goToStep({ id, step: resumeStep(id, def.steps.length) });
}

/** The tour card calls this as it renders and whenever the chain lands:
 *  a cold arrival (a deep link) gets phase 1 here; every step gets its
 *  phase 2 as soon as the security's own data is present. */
export function settleStep(ref: TourRef, snapshot: Snapshot | null) {
  const key = keyOf(ref);
  if (applied !== key) arrive(ref);
  if (pending && pending.key === key && snapshot && snapshot.symbol === useCockpit.getState().ticker) {
    const p = pending;
    pending = null;
    applyWithSnapshot(p.scene, p.expiry, snapshot);
  }
}

/** Leaving a tour forgets which step was realized, so re-entering it
 *  later rebuilds the scene from scratch. */
export function leaveTour() {
  applied = "";
  pending = null;
}
