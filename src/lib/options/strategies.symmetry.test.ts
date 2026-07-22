import { describe, it, expect } from "vitest";
import { buildPosition, strategyById } from "./strategies";
import { ARCHETYPES, generateSnapshot } from "../sim/market";
import type { Snapshot, StrikeRow } from "@/lib/data/types";

/** Iron-condor wings must default to equal widths (PLAN.md M5 rider):
 *  pure delta targeting picks lopsided wings on sparse chains. */

const condor = strategyById("iron-condor")!;

const wingWidths = (snapshot: Snapshot, expIndex: number) => {
  const legs = buildPosition(condor, snapshot, expIndex, {});
  const k = (role: string) => legs.find((l) => l.role === role)!.strike;
  return {
    put: k("putShort") - k("putWing"),
    call: k("callWing") - k("callShort"),
    legs,
  };
};

describe("iron condor wing symmetry", () => {
  it("defaults to equal widths on every simulated security and expiry", () => {
    for (const a of ARCHETYPES) {
      const snap = generateSnapshot(a, "2026-07-21");
      snap.expirations.forEach((_, i) => {
        const w = wingWidths(snap, i);
        expect(w.put, `${a.symbol} exp[${i}]`).toBeGreaterThan(0);
        expect(w.put, `${a.symbol} exp[${i}]`).toBe(w.call);
      });
    }
  });

  it("symmetrizes a hand-built lopsided chain", () => {
    const base = generateSnapshot(ARCHETYPES[1], "2026-07-21"); // AURION, spot 418
    const exp = base.expirations[3];
    // thin out the put side so delta targeting would overshoot downward
    const rows: StrikeRow[] = exp.strikes.filter(
      (r) => r.k >= base.spot || (r.k / 10) % 3 === 0,
    );
    const snap: Snapshot = { ...base, expirations: [{ ...exp, strikes: rows }] };
    const w = wingWidths(snap, 0);
    expect(w.put).toBe(w.call);
  });

  it("respects a user-dragged wing (no symmetrizing over overrides)", () => {
    const snap = generateSnapshot(ARCHETYPES[1], "2026-07-21");
    const legs0 = buildPosition(condor, snap, 3, {});
    const putWing0 = legs0.find((l) => l.role === "putWing")!.strike;
    // drag the put wing one strike further out
    const exp = snap.expirations[3];
    const lower = exp.strikes.map((s) => s.k).filter((k) => k < putWing0);
    const dragged = lower[lower.length - 1];
    const legs = buildPosition(condor, snap, 3, { putWing: dragged });
    expect(legs.find((l) => l.role === "putWing")!.strike).toBe(dragged);
  });
});
