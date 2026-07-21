"use client";

import { create } from "zustand";
import type { Snapshot } from "@/lib/data/types";
import {
  strategyById,
  defaultExpIndex,
  strikeCandidates,
  buildPosition,
  type StrategyDef,
} from "@/lib/options/strategies";
import type { OptionKind } from "@/lib/options/types";

interface LabState {
  symbol: string | null;
  strategyId: string | null;
  expIndex: number;
  /** user-dragged strikes, keyed by leg role */
  overrides: Record<string, number>;
  /** null = at the snapshot spot */
  whatIfPrice: number | null;
  elapsedDays: number;
  ivScale: number;

  init: (symbol: string, strategyId: string, snapshot: Snapshot) => void;
  setExpIndex: (i: number) => void;
  setStrike: (
    role: string,
    strike: number,
    snapshot: Snapshot,
    def: StrategyDef,
  ) => void;
  setWhatIfPrice: (p: number | null) => void;
  setElapsedDays: (d: number) => void;
  setIvScale: (x: number) => void;
  resetDials: () => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  symbol: null,
  strategyId: null,
  expIndex: 0,
  overrides: {},
  whatIfPrice: null,
  elapsedDays: 0,
  ivScale: 1,

  init: (symbol, strategyId, snapshot) => {
    const def = strategyById(strategyId);
    set({
      symbol,
      strategyId,
      expIndex: def ? defaultExpIndex(snapshot, def) : 0,
      overrides: {},
      whatIfPrice: null,
      elapsedDays: 0,
      ivScale: 1,
    });
  },

  setExpIndex: (i) =>
    set({ expIndex: i, overrides: {}, elapsedDays: 0 }),

  setStrike: (role, strike, snapshot, def) => {
    const { expIndex, overrides } = get();
    const exp = snapshot.expirations[expIndex];
    const tmpl = def.legs.find((l) => (l.role === "atmPut" ? "atm" : l.role) === role);
    if (!tmpl || tmpl.kind === "stock") return;
    const candidates = strikeCandidates(exp, tmpl.kind as OptionKind);
    if (!candidates.includes(strike)) return;

    // Clamp against effective neighbor strikes (defaults included) so
    // short strikes stay inside wings and spreads never invert.
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
  resetDials: () => set({ whatIfPrice: null, elapsedDays: 0, ivScale: 1 }),
}));
