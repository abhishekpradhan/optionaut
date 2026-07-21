import { interpolateRgb } from "d3-interpolate";

/** The app's diverging P/L ramp (blue gain ↔ neutral ↔ red loss),
 *  shared by the 2D heatmap and the 3D terrain so the two views can
 *  never disagree. Neutral sits near the panel surface so "zero" recedes. */
export const RAMP_NEUTRAL = "#20242e";
export const toGain = interpolateRgb(RAMP_NEUTRAL, "#3987e5");
export const toLoss = interpolateRgb(RAMP_NEUTRAL, "#e66767");
