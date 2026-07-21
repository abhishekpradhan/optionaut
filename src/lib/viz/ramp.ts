import { interpolateRgb } from "d3-interpolate";

/** The app's diverging P/L ramp (blue gain ↔ neutral ↔ red loss),
 *  shared by the 2D heatmap and the 3D terrain so the two views can
 *  never disagree. Neutral sits near the panel surface so "zero" recedes. */
export const RAMP_NEUTRAL = "#20242e";
export const toGain = interpolateRgb(RAMP_NEUTRAL, "#3987e5");
export const toLoss = interpolateRgb(RAMP_NEUTRAL, "#e66767");

/** value → css color, normalized by maxAbs; sqrt-eased so small values
 *  stay visible without lying about sign. */
export function rampColor(v: number, maxAbs: number): string {
  const t = Math.sqrt(Math.min(Math.abs(v) / maxAbs, 1));
  return v >= 0 ? toGain(t) : toLoss(t);
}
