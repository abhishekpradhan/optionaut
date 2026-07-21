import { describe, it, expect } from "vitest";
import { bsPrice, bsGreeks, impliedVol, normCdf } from "./blackScholes";
import type { OptionKind } from "./types";

describe("normCdf", () => {
  it("matches known values to near double precision", () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 12);
    expect(normCdf(1)).toBeCloseTo(0.841344746068543, 12);
    expect(normCdf(1.96)).toBeCloseTo(0.97500210485178, 12);
    expect(normCdf(-1.96)).toBeCloseTo(0.02499789514822, 12);
    expect(normCdf(2)).toBeCloseTo(0.977249868051821, 12);
    expect(normCdf(3)).toBeCloseTo(0.99865010196837, 12);
  });
  it("is symmetric: N(x) + N(-x) = 1 exactly", () => {
    for (const x of [0.1, 0.77, 1.5, 2.33, 4]) {
      expect(normCdf(x) + normCdf(-x)).toBeCloseTo(1, 12);
    }
  });
});

describe("bsPrice — textbook anchors", () => {
  // Hull, Options Futures and Other Derivatives: S=42, K=40, r=10%,
  // sigma=20%, T=6mo -> c=4.76, p=0.81.
  const hull = { S: 42, K: 40, T: 0.5, r: 0.1, q: 0, sigma: 0.2 };
  it("prices the Hull chapter example call/put", () => {
    expect(bsPrice("call", hull)).toBeCloseTo(4.7594, 3);
    expect(bsPrice("put", hull)).toBeCloseTo(0.8086, 3);
  });

  it("satisfies put-call parity across a grid (with dividends)", () => {
    for (const S of [80, 100, 125]) {
      for (const T of [0.05, 0.5, 2]) {
        for (const sigma of [0.1, 0.35, 0.8]) {
          for (const q of [0, 0.03]) {
            const inp = { S, K: 100, T, r: 0.045, q, sigma };
            const lhs = bsPrice("call", inp) - bsPrice("put", inp);
            const rhs =
              S * Math.exp(-q * T) - 100 * Math.exp(-0.045 * T);
            expect(lhs).toBeCloseTo(rhs, 9);
          }
        }
      }
    }
  });

  it("handles expiry and zero-vol edges", () => {
    expect(bsPrice("call", { S: 110, K: 100, T: 0, r: 0.05, q: 0, sigma: 0.2 })).toBe(10);
    expect(bsPrice("put", { S: 110, K: 100, T: 0, r: 0.05, q: 0, sigma: 0.2 })).toBe(0);
    // sigma -> 0 collapses to the discounted forward intrinsic
    const zeroVol = bsPrice("call", { S: 100, K: 90, T: 1, r: 0.05, q: 0, sigma: 0 });
    expect(zeroVol).toBeCloseTo(100 - 90 * Math.exp(-0.05), 9);
  });
});

describe("bsGreeks — Hull chapter-19 anchors (S=49, K=50, r=5%, sigma=20%, T=0.3846)", () => {
  const inp = { S: 49, K: 50, T: 0.3846, r: 0.05, q: 0, sigma: 0.2 };
  const g = bsGreeks("call", inp);
  it("delta", () => expect(g.delta).toBeCloseTo(0.522, 3));
  it("gamma", () => expect(g.gamma).toBeCloseTo(0.066, 3));
  it("theta (per year)", () => expect(g.theta).toBeCloseTo(-4.31, 2));
  it("vega (per 1.00 vol)", () => expect(g.vega).toBeCloseTo(12.1, 1));
  it("rho (per 1.00 rate)", () => expect(g.rho).toBeCloseTo(8.91, 2));
});

describe("bsGreeks — agrees with finite differences", () => {
  const cases: Array<[OptionKind, number, number, number, number]> = [
    ["call", 100, 100, 0.5, 0.25],
    ["put", 100, 100, 0.5, 0.25],
    ["call", 100, 120, 1.5, 0.4],
    ["put", 100, 80, 0.1, 0.6],
    ["call", 250, 240, 0.08, 0.3],
  ];
  for (const [type, S, K, T, sigma] of cases) {
    const base = { S, K, T, r: 0.045, q: 0.012, sigma };
    const g = bsGreeks(type, base);
    it(`${type} S=${S} K=${K} T=${T}`, () => {
      const hS = S * 1e-4;
      const dNum =
        (bsPrice(type, { ...base, S: S + hS }) -
          bsPrice(type, { ...base, S: S - hS })) /
        (2 * hS);
      expect(g.delta).toBeCloseTo(dNum, 5);

      const gNum =
        (bsPrice(type, { ...base, S: S + hS }) -
          2 * bsPrice(type, base) +
          bsPrice(type, { ...base, S: S - hS })) /
        (hS * hS);
      expect(g.gamma).toBeCloseTo(gNum, 5);

      const hV = 1e-5;
      const vNum =
        (bsPrice(type, { ...base, sigma: sigma + hV }) -
          bsPrice(type, { ...base, sigma: sigma - hV })) /
        (2 * hV);
      expect(g.vega).toBeCloseTo(vNum, 3);

      const hT = 1e-6;
      const tNum =
        -(
          bsPrice(type, { ...base, T: T + hT }) -
          bsPrice(type, { ...base, T: T - hT })
        ) /
        (2 * hT);
      expect(g.theta).toBeCloseTo(tNum, 3);

      const hR = 1e-6;
      const rNum =
        (bsPrice(type, { ...base, r: 0.045 + hR }) -
          bsPrice(type, { ...base, r: 0.045 - hR })) /
        (2 * hR);
      expect(g.rho).toBeCloseTo(rNum, 3);
    });
  }
});

describe("impliedVol", () => {
  it("round-trips price -> IV -> price across a wide grid", () => {
    for (const type of ["call", "put"] as const) {
      for (const K of [70, 85, 100, 115, 130]) {
        for (const T of [0.05, 0.25, 1, 2]) {
          for (const sigma of [0.1, 0.25, 0.5, 0.9]) {
            for (const q of [0, 0.02]) {
              const inp = { S: 100, K, T, r: 0.045, q, sigma };
              const price = bsPrice(type, inp);
              const lb = Math.max(
                type === "call"
                  ? 100 * Math.exp(-q * T) - K * Math.exp(-0.045 * T)
                  : K * Math.exp(-0.045 * T) - 100 * Math.exp(-q * T),
                0,
              );
              // Skip corners with no numerically recoverable IV: sub-cent
              // premiums and time value near float resolution.
              if (price < 1e-4 || price - lb < 1e-3) continue;
              const iv = impliedVol(type, price, inp);
              expect(iv).not.toBeNull();
              expect(iv!).toBeCloseTo(sigma, 5);
            }
          }
        }
      }
    }
  });

  it("returns null outside no-arbitrage bounds", () => {
    const inp = { S: 100, K: 100, T: 0.5, r: 0.045, q: 0 };
    expect(impliedVol("call", -1, inp)).toBeNull();
    expect(impliedVol("call", 101, inp)).toBeNull(); // above S*e^-qT
    // below European intrinsic lower bound
    const deep = { S: 200, K: 100, T: 0.5, r: 0.045, q: 0 };
    expect(impliedVol("call", 50, deep)).toBeNull();
  });

  it("survives the hard corners (deep ITM short-dated, small vega)", () => {
    const inp = { S: 100, K: 80, T: 0.05, r: 0.045, q: 0, sigma: 0.35 };
    const price = bsPrice("call", inp);
    const iv = impliedVol("call", price, inp);
    expect(iv).not.toBeNull();
    expect(iv!).toBeCloseTo(0.35, 2);
  });

  it("returns null when time value sits below float resolution", () => {
    // d1 ~ 10: N(d1) is 1.0 in doubles, price == intrinsic bound exactly
    const inp = { S: 100, K: 60, T: 0.02, r: 0.045, q: 0, sigma: 0.35 };
    const price = bsPrice("call", inp);
    expect(impliedVol("call", price, inp)).toBeNull();
  });
});
