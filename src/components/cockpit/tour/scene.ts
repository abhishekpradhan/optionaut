import type { ViewMode } from "@/lib/cockpit/store";
import type { TourCtx } from "./tours";

/** HUD elements a tour step can point at — the cockpit rings the match. */
export const TOUR_TARGETS = [
  "price",
  "time",
  "volatility",
  "expiries",
  "strikes",
  "readout",
  "position",
  "greeks",
  "volpanel",
  "bite",
] as const;
export type TourTarget = (typeof TOUR_TARGETS)[number];

/**
 * The instrument state a tour step expects on arrival. Naming a ticker
 * or a strategy clears the learner's dials and strikes and settles on
 * the strategy's teaching expiry; everything else is left exactly as
 * the learner had it. Pure data so the merge below can be tested
 * without a DOM.
 */
export interface Scene {
  ticker?: string;
  strategy?: string;
  view?: ViewMode;
  /** "default" = the strategy's teaching expiry · "nearest" = the front month.
   *  Implied "default" whenever the ticker or strategy changes. */
  expiry?: "default" | "nearest";
  /** strike overrides by leg role — fixed, or computed from the loaded chain */
  overrides?: Record<string, number> | ((c: TourCtx) => Record<string, number>);
  /** clear the dials on arrival (a ticker or strategy change clears them anyway) */
  reset?: true;
  /** dial values to set on arrival (price as a fraction of spot: 0.15 = +15%) */
  dials?: { pricePct?: number; days?: number; iv?: number };
}

/** Does this step's own scene ask for fresh dials? */
export function sceneDeclaresReset(sc: Scene | undefined): boolean {
  return !!sc && (sc.strategy != null || sc.ticker != null || !!sc.reset);
}

/**
 * Fold the scenes of steps 0..upTo into the full scene step `upTo`
 * expects. This is the one code path for every arrival — forward, back,
 * resume, a deep link — so a caption never sits over the wrong
 * instrument, and a learner's detour on the live stage heals at the
 * next step.
 */
export function mergedScene(steps: Array<{ scene?: Scene }>, upTo: number): Scene | undefined {
  let out: Scene | undefined;
  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const sc = steps[i].scene;
    if (!sc) continue;
    const prev: Scene = out ?? {};
    const strat = sc.strategy != null || sc.ticker != null;
    const fresh = strat || !!sc.reset;
    out = {
      ticker: sc.ticker ?? prev.ticker,
      strategy: sc.strategy ?? prev.strategy,
      view: sc.view ?? prev.view,
      expiry: sc.expiry ?? (strat ? "default" : prev.expiry),
      overrides: strat ? sc.overrides : (sc.overrides ?? prev.overrides),
      dials: fresh ? sc.dials : sc.dials ? { ...prev.dials, ...sc.dials } : prev.dials,
    };
  }
  return out;
}
