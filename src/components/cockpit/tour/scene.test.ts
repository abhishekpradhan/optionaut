import { describe, it, expect } from "vitest";
import { mergedScene, sceneDeclaresReset, type Scene } from "./scene";

const steps: Array<{ scene?: Scene }> = [
  { scene: { ticker: "PULSAR", strategy: "long-straddle", view: "payoff", expiry: "nearest" } },
  {},
  { scene: { dials: { pricePct: 0.15, days: 1, iv: 0.55 } } },
  {},
  { scene: { strategy: "iron-condor", view: "payoff", expiry: "nearest", overrides: { putShort: 41 } } },
  {},
];

describe("mergedScene", () => {
  it("carries the opening scene into steps that declare nothing", () => {
    expect(mergedScene(steps, 1)).toEqual({
      ticker: "PULSAR",
      strategy: "long-straddle",
      view: "payoff",
      expiry: "nearest",
      overrides: undefined,
      dials: undefined,
    });
  });

  it("layers dial settings over the opening scene", () => {
    expect(mergedScene(steps, 3)?.dials).toEqual({ pricePct: 0.15, days: 1, iv: 0.55 });
    expect(mergedScene(steps, 3)?.strategy).toBe("long-straddle");
  });

  it("a new strategy drops earlier dials and replaces strikes", () => {
    const sc = mergedScene(steps, 5)!;
    expect(sc.strategy).toBe("iron-condor");
    expect(sc.dials).toBeUndefined();
    expect(sc.overrides).toEqual({ putShort: 41 });
    expect(sc.ticker).toBe("PULSAR");
  });

  it("a reset step drops earlier dial values", () => {
    expect(mergedScene([{ scene: { dials: { days: 1 } } }, { scene: { reset: true } }], 1)?.dials).toBeUndefined();
    expect(
      mergedScene([{ scene: { dials: { days: 1 } } }, { scene: { reset: true, dials: { iv: 0.7 } } }], 1)?.dials,
    ).toEqual({ iv: 0.7 });
  });

  it("a strategy change implies the teaching expiry unless told otherwise", () => {
    expect(mergedScene([{ scene: { strategy: "long-call" } }], 0)?.expiry).toBe("default");
    expect(mergedScene([{ scene: { strategy: "long-call" } }, { scene: { expiry: "nearest" } }], 1)?.expiry).toBe("nearest");
    expect(mergedScene([{ scene: { strategy: "long-call" } }, { scene: { expiry: "nearest" } }], 0)?.expiry).toBe("default");
  });

  it("is empty for tours whose first steps declare nothing", () => {
    expect(mergedScene([{}, {}], 1)).toBeUndefined();
  });
});

describe("sceneDeclaresReset", () => {
  it("knows which steps ask for fresh dials", () => {
    expect(sceneDeclaresReset({ strategy: "long-call" })).toBe(true);
    expect(sceneDeclaresReset({ ticker: "PULSAR" })).toBe(true);
    expect(sceneDeclaresReset({ reset: true })).toBe(true);
    expect(sceneDeclaresReset({ dials: { days: 1 } })).toBe(false);
    expect(sceneDeclaresReset({ view: "map" })).toBe(false);
    expect(sceneDeclaresReset(undefined)).toBe(false);
  });
});
