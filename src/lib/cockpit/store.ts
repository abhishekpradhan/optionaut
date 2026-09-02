"use client";

import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";
import type { Snapshot } from "@/lib/data/types";
import {
  strategyById,
  defaultExpIndex,
  strikeCandidates,
  buildPosition,
} from "@/lib/options/strategies";
import type { OptionKind } from "@/lib/options/types";

/** The one instrument's brain (PLAN.md D8). Everything the cockpit
 *  shows derives from this + the loaded snapshot. */

export type ViewMode = "history" | "payoff" | "map";
export type OverlayKind =
  | "guide"
  | "glossary"
  | "about"
  | "help"
  | "tours"
  | "custom"
  | "sizing"
  | null;

export interface TourRef {
  id: string;
  step: number;
}

interface CockpitState {
  ticker: string;
  strategyId: string;
  view: ViewMode;
  expIndex: number;
  /** user-dragged strikes, keyed by leg role */
  overrides: Record<string, number>;
  whatIfPrice: number | null;
  elapsedDays: number;
  ivScale: number;
  /** wheel zoom on the stage's price domain */
  domainScale: number;
  overlay: OverlayKind;
  tour: TourRef | null;
  /** small screens: the slide-up dials/stats sheet */
  mobilePanel: boolean;
  /** term id to scroll to when the glossary sheet opens */
  glossaryTerm: string | null;

  init: (partial: Partial<Pick<CockpitState, "ticker" | "strategyId" | "view" | "overlay" | "tour">>) => void;
  /** Restore a shared setup in one atomic step (setExpIndex would wipe
   *  the overrides it arrives with). */
  hydrateShared: (
    partial: Partial<
      Pick<CockpitState, "expIndex" | "overrides" | "whatIfPrice" | "elapsedDays" | "ivScale" | "view">
    >,
  ) => void;
  setTicker: (t: string) => void;
  setStrategy: (id: string, snapshot: Snapshot | null) => void;
  setView: (v: ViewMode) => void;
  setExpIndex: (i: number) => void;
  setStrike: (role: string, strike: number, snapshot: Snapshot) => void;
  setWhatIfPrice: (p: number | null) => void;
  setElapsedDays: (d: number) => void;
  setIvScale: (x: number) => void;
  setDomainScale: (x: number) => void;
  resetDials: () => void;
  setOverlay: (o: OverlayKind) => void;
  setTour: (t: TourRef | null) => void;
  setMobilePanel: (v: boolean) => void;
  openGlossaryAt: (termId: string) => void;
}

type CockpitData = Pick<
  CockpitState,
  | "ticker"
  | "strategyId"
  | "view"
  | "expIndex"
  | "overrides"
  | "whatIfPrice"
  | "elapsedDays"
  | "ivScale"
  | "domainScale"
  | "overlay"
  | "tour"
  | "mobilePanel"
  | "glossaryTerm"
>;

/** Cold-start state. On the server `init` restores it before applying a
 *  page's own seed, so prerendered pages (which all share this module)
 *  never inherit each other's scene. */
const DEFAULTS: CockpitData = {
  ticker: "AURION",
  strategyId: "long-call",
  view: "payoff",
  expIndex: 0,
  overrides: {},
  whatIfPrice: null,
  elapsedDays: 0,
  ivScale: 1,
  domainScale: 1,
  overlay: null,
  tour: null,
  mobilePanel: false,
  glossaryTerm: null,
};

const store = createStore<CockpitState>((set, get) => ({
  ...DEFAULTS,

  init: (partial) =>
    set(typeof window === "undefined" ? { ...DEFAULTS, overrides: {}, ...partial } : { ...partial }),

  hydrateShared: (partial) => set({ ...partial }),

  setTicker: (t) =>
    set({
      ticker: t,
      overrides: {},
      whatIfPrice: null,
      elapsedDays: 0,
      domainScale: 1,
    }),

  setStrategy: (id, snapshot) => {
    const def = strategyById(id);
    set({
      strategyId: id,
      overrides: {},
      whatIfPrice: null,
      elapsedDays: 0,
      expIndex: def && snapshot ? defaultExpIndex(snapshot, def) : get().expIndex,
      view: get().view === "history" ? "payoff" : get().view,
    });
  },

  setView: (v) => set({ view: v }),

  setExpIndex: (i) => set({ expIndex: i, overrides: {}, elapsedDays: 0 }),

  setStrike: (role, strike, snapshot) => {
    const { expIndex, overrides, strategyId } = get();
    const def = strategyById(strategyId);
    if (!def) return;
    const exp = snapshot.expirations[Math.min(expIndex, snapshot.expirations.length - 1)];
    const tmpl = def.legs.find((l) => (l.role === "atmPut" ? "atm" : l.role) === role);
    if (!tmpl || tmpl.kind === "stock") return;
    const candidates = strikeCandidates(exp, tmpl.kind as OptionKind);
    if (!candidates.includes(strike)) return;

    // Clamp against effective neighbors so spreads never invert.
    const legs = buildPosition(def, snapshot, expIndex, overrides);
    const order = def.strikeOrder;
    const idx = order.indexOf(role);
    const strikeOf = (r: string) =>
      legs.find((l) => (l.role === "atmPut" ? "atm" : l.role) === r)?.strike;
    if (idx > 0) {
      const below = strikeOf(order[idx - 1]);
      if (below != null && strike <= below) return;
    }
    if (idx >= 0 && idx < order.length - 1) {
      const above = strikeOf(order[idx + 1]);
      if (above != null && strike >= above) return;
    }
    set({ overrides: { ...overrides, [role]: strike } });
  },

  setWhatIfPrice: (p) => set({ whatIfPrice: p }),
  setElapsedDays: (d) => set({ elapsedDays: d }),
  setIvScale: (x) => set({ ivScale: x }),
  setDomainScale: (x) => set({ domainScale: Math.min(Math.max(x, 0.55), 1.7) }),
  resetDials: () => set({ whatIfPrice: null, elapsedDays: 0, ivScale: 1 }),
  setOverlay: (o) => set({ overlay: o, glossaryTerm: o === "glossary" ? get().glossaryTerm : null }),
  setTour: (t) => set({ tour: t, overlay: null }),
  setMobilePanel: (v) => set({ mobilePanel: v }),
  openGlossaryAt: (termId) => set({ overlay: "glossary", glossaryTerm: termId }),
}));

/** The bound hook plus the store API (getState / subscribe), shaped like
 *  zustand's own `create` — with one difference: the server snapshot reads
 *  the live state instead of the initial one. That is what lets the state a
 *  page seeds through `init` during render reach its prerendered HTML (the
 *  glossary on /glossary, the right strategy on /lab/…). The client reads
 *  the same state during hydration, so the markup matches. */
function useCockpitState<T>(selector: (state: CockpitState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export const useCockpit = Object.assign(useCockpitState, store);
