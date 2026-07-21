import { describe, it, expect } from "vitest";
import {
  payoffAtExpiry,
  markToMarket,
  netEntryCost,
  breakevens,
  payoffExtremes,
  probabilityOfProfit,
  netGreeks,
  expectedMove,
} from "./position";
import type { Leg, MarketCtx } from "./types";

const ctx: MarketCtx = { r: 0.045, q: 0 };

const leg = (partial: Partial<Leg>): Leg => ({
  kind: "call",
  side: 1,
  qty: 1,
  strike: 100,
  entryPrice: 5,
  iv: 0.25,
  dte: 30,
  ...partial,
});

describe("long call (K=100, premium 5)", () => {
  const legs = [leg({})];
  it("expiry payoff", () => {
    expect(payoffAtExpiry(legs, 120)).toBe(1500);
    expect(payoffAtExpiry(legs, 100)).toBe(-500);
    expect(payoffAtExpiry(legs, 50)).toBe(-500);
  });
  it("breakeven at K + premium exactly", () => {
    expect(breakevens(legs)).toEqual([105]);
  });
  it("extremes: capped loss, unlimited profit", () => {
    const e = payoffExtremes(legs);
    expect(e.maxLoss).toBe(-500);
    expect(e.maxProfit).toBe(Infinity);
    expect(e.maxProfitAt).toBe("above");
  });
});

describe("bull call spread (long 100 @6, short 110 @2)", () => {
  const legs = [
    leg({ entryPrice: 6 }),
    leg({ side: -1, strike: 110, entryPrice: 2 }),
  ];
  it("net debit 400", () => expect(netEntryCost(legs)).toBe(400));
  it("breakeven 104, max profit 600 at/above 110, max loss -400", () => {
    expect(breakevens(legs)).toEqual([104]);
    const e = payoffExtremes(legs);
    expect(e.maxProfit).toBe(600);
    expect(e.maxLoss).toBe(-400);
  });
});

describe("iron condor (P90 +1, P95 -2, C105 -2, C110 +1)", () => {
  const legs = [
    leg({ kind: "put", strike: 90, entryPrice: 1 }),
    leg({ kind: "put", side: -1, strike: 95, entryPrice: 2 }),
    leg({ kind: "call", side: -1, strike: 105, entryPrice: 2 }),
    leg({ kind: "call", strike: 110, entryPrice: 1 }),
  ];
  it("net credit 200", () => expect(netEntryCost(legs)).toBe(-200));
  it("breakevens at 93 and 107", () => {
    expect(breakevens(legs)).toEqual([93, 107]);
  });
  it("max profit 200 in the body, max loss -300 in the wings", () => {
    const e = payoffExtremes(legs);
    expect(e.maxProfit).toBe(200);
    expect(e.maxLoss).toBe(-300);
    expect(payoffAtExpiry(legs, 100)).toBe(200);
    expect(payoffAtExpiry(legs, 80)).toBe(-300);
    expect(payoffAtExpiry(legs, 130)).toBe(-300);
  });
});

describe("covered call (100 shares @100, short call 105 @3)", () => {
  const legs = [
    leg({ kind: "stock", strike: 0, entryPrice: 100, iv: 0, dte: 0 }),
    leg({ kind: "call", side: -1, strike: 105, entryPrice: 3 }),
  ];
  it("breakeven 97, capped profit 800, stock-to-zero loss", () => {
    expect(breakevens(legs)).toEqual([97]);
    const e = payoffExtremes(legs);
    expect(e.maxProfit).toBe(800);
    expect(e.maxLoss).toBe(-9700);
  });
});

describe("markToMarket", () => {
  const legs = [leg({})];
  it("converges to expiry payoff as time runs out", () => {
    const atExpiry = markToMarket(legs, 112, 30, ctx);
    expect(atExpiry).toBeCloseTo(payoffAtExpiry(legs, 112), 6);
  });
  it("time decay hurts a long call, all else equal", () => {
    const now = markToMarket(legs, 100, 0, ctx);
    const later = markToMarket(legs, 100, 15, ctx);
    expect(later).toBeLessThan(now);
  });
  it("vol crush hurts a long call, all else equal", () => {
    const base = markToMarket(legs, 100, 0, ctx, 1);
    const crushed = markToMarket(legs, 100, 0, ctx, 0.6);
    expect(crushed).toBeLessThan(base);
  });
});

describe("probabilityOfProfit", () => {
  it("stays in [0,1] and behaves directionally", () => {
    const longCall = [leg({})];
    const p = probabilityOfProfit(longCall, 100, 0.25, 30, ctx);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.5); // OTM breakeven above spot

    // near-guaranteed: long stock bought at 1
    const freeStock = [leg({ kind: "stock", strike: 0, entryPrice: 1, iv: 0, dte: 0 })];
    const p2 = probabilityOfProfit(freeStock, 100, 0.25, 30, ctx);
    expect(p2).toBeGreaterThan(0.999);
  });
  it("condor PoP is the chance of staying between the breakevens", () => {
    const legs = [
      leg({ kind: "put", strike: 90, entryPrice: 1 }),
      leg({ kind: "put", side: -1, strike: 95, entryPrice: 2 }),
      leg({ kind: "call", side: -1, strike: 105, entryPrice: 2 }),
      leg({ kind: "call", strike: 110, entryPrice: 1 }),
    ];
    const p = probabilityOfProfit(legs, 100, 0.2, 30, ctx);
    expect(p).toBeGreaterThan(0.5);
    expect(p).toBeLessThan(0.95);
  });
});

describe("netGreeks", () => {
  it("stock lot is exactly 100 delta, nothing else", () => {
    const g = netGreeks(
      [leg({ kind: "stock", strike: 0, entryPrice: 100, iv: 0, dte: 0 })],
      100,
      0,
      ctx,
    );
    expect(g.delta).toBe(100);
    expect(g.gamma).toBe(0);
    expect(g.theta).toBe(0);
  });
  it("long ATM call: positive delta/gamma/vega, negative theta", () => {
    const g = netGreeks([leg({})], 100, 0, ctx);
    expect(g.delta).toBeGreaterThan(30);
    expect(g.delta).toBeLessThan(80);
    expect(g.gamma).toBeGreaterThan(0);
    expect(g.vega).toBeGreaterThan(0);
    expect(g.theta).toBeLessThan(0);
  });
  it("short call flips every sign", () => {
    const long = netGreeks([leg({})], 100, 0, ctx);
    const short = netGreeks([leg({ side: -1 })], 100, 0, ctx);
    expect(short.delta).toBeCloseTo(-long.delta, 9);
    expect(short.theta).toBeCloseTo(-long.theta, 9);
  });
});

describe("expectedMove", () => {
  it("scales with sqrt(time)", () => {
    const em30 = expectedMove(100, 0.3, 30);
    const em120 = expectedMove(100, 0.3, 120);
    expect(em120 / em30).toBeCloseTo(2, 6);
    expect(em30).toBeCloseTo(100 * 0.3 * Math.sqrt(30 / 365), 9);
  });
});
