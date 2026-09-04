import { nearestStrike, stepStrike, type LabLeg } from "@/lib/options/strategies";
import { expectedMove } from "@/lib/options/position";
import type { Snapshot } from "@/lib/data/types";
import type { TourCtx } from "./tours";

/** Everything a step may need once the security's data has landed. A
 *  chain with no expirations (a thin custom market) still gets a usable
 *  context, so gates that never look at the chain keep working. */
export function buildCtx(snapshot: Snapshot, expIndex: number, legs: LabLeg[]): TourCtx {
  const exp = snapshot.expirations[Math.min(expIndex, snapshot.expirations.length - 1)] ?? {
    date: "",
    dte: 30,
    strikes: [],
  };
  return {
    snapshot,
    spot: snapshot.spot,
    dte: exp.dte,
    exp,
    legs,
    em: expectedMove(snapshot.spot, snapshot.iv30 ?? 0.3, exp.dte),
    market: { r: snapshot.riskFreeRate, q: snapshot.divYield },
    nearest: (kind, price) => nearestStrike(exp, kind, price),
    stepStrike: (kind, strike, n) => stepStrike(exp, kind, strike, n),
  };
}
