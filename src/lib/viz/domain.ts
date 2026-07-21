import { scaleLinear } from "d3-scale";
import { expectedMove } from "@/lib/options/position";

/**
 * The payoff view's price domain, snapped to the tick grid so plots
 * always end on labeled gridlines. Shared by the chart and the price
 * dial so the slider's range is exactly the visible plot — the what-if
 * marker can never walk off the chart.
 */
export function payoffPriceDomain(
  spot: number,
  iv: number,
  dte: number,
  strikes: number[],
  domainScale = 1,
): { lo: number; hi: number; step: number } {
  const em = expectedMove(spot, iv, Math.max(dte, 7));
  const span = Math.min(Math.max((2.6 * em) / spot, 0.16), 0.5) * domainScale;
  const rawLo = Math.min(spot * (1 - span), ...(strikes.length ? [Math.min(...strikes) * 0.96] : []));
  const rawHi = Math.max(spot * (1 + span), ...(strikes.length ? [Math.max(...strikes) * 1.04] : []));
  const probe = scaleLinear().domain([rawLo, rawHi]).ticks(6);
  const step = probe.length > 1 ? probe[1] - probe[0] : Math.max((rawHi - rawLo) / 6, 1);
  return {
    lo: Math.floor(rawLo / step) * step,
    hi: Math.ceil(rawHi / step) * step,
    step,
  };
}
