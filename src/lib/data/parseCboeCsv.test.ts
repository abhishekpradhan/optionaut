import { describe, it, expect } from "vitest";
import { parseCboeCsv, chainToSnapshot } from "./parseCboeCsv";

/** A miniature quotedata.csv in Cboe's classic layout: symbol line,
 *  timestamp line, header, then call-columns | Strike | put-columns. */

const HEADER =
  "Expiration Date,Calls,Last Sale,Net,Bid,Ask,Volume,IV,Delta,Gamma,Open Interest," +
  "Strike,Puts,Last Sale,Net,Bid,Ask,Volume,IV,Delta,Gamma,Open Interest";

function row(exp: string, strike: number, callBid: number, putBid: number, iv = 28.5): string {
  const cb = callBid.toFixed(2);
  const pb = putBid.toFixed(2);
  return (
    `${exp},OPT${strike}C,${(callBid + 0.1).toFixed(2)},0.05,${cb},${(callBid + 0.2).toFixed(2)},120,${iv},0.55,0.02,900,` +
    `${strike.toFixed(3)},OPT${strike}P,${(putBid + 0.1).toFixed(2)},-0.05,${pb},${(putBid + 0.2).toFixed(2)},80,${iv + 0.6},-0.45,0.02,700`
  );
}

const TODAY = new Date("2026-07-21T12:00:00Z");

function fixture(): string {
  const strikes = [300, 310, 320, 330, 340];
  const lines = [
    "AAPL (Apple Inc),327.06,+2.15",
    '"Jul 21 2026 @ 16:00 ET"',
    HEADER,
    ...strikes.map((k, i) => row("Fri Aug 21 2026", k, 30 - i * 5, 2 + i * 2)),
    ...strikes.map((k, i) => row("Fri Sep 18 2026", k, 33 - i * 5, 3 + i * 2, 31)),
    // far outside the ±30% window around 327 — must be dropped
    row("Fri Aug 21 2026", 500, 0.1, 175),
  ];
  return lines.join("\n");
}

describe("parseCboeCsv", () => {
  it("reads symbol and spot from the first line", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    expect(p.symbol).toBe("AAPL");
    expect(p.spot).toBeCloseTo(327.06);
  });

  it("groups rows into sorted expirations with sane dte", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    expect(p.expirations).toHaveLength(2);
    const [aug, sep] = p.expirations;
    expect(aug.date).toBe("2026-08-21");
    expect(sep.date).toBe("2026-09-18");
    expect(aug.dte).toBeGreaterThan(25);
    expect(aug.dte).toBeLessThan(40);
    expect(sep.dte).toBeGreaterThan(aug.dte);
    expect(aug.strikes.map((s) => s.k)).toEqual([300, 310, 320, 330, 340]);
  });

  it("maps call and put columns by position around Strike", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    const atm = p.expirations[0].strikes.find((s) => s.k === 320)!;
    expect(atm.c?.b).toBeCloseTo(20); // 30 - 2*5
    expect(atm.p?.b).toBeCloseTo(6); // 2 + 2*2
    expect(atm.c?.oi).toBe(900);
    expect(atm.p?.oi).toBe(700);
  });

  it("normalizes percent-form IV to a decimal", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    const atm = p.expirations[0].strikes.find((s) => s.k === 320)!;
    expect(atm.c?.iv).toBeCloseTo(0.285);
    expect(atm.p?.iv).toBeCloseTo(0.291);
  });

  it("drops strikes outside the ±30% window", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    for (const e of p.expirations) {
      expect(e.strikes.some((s) => s.k === 500)).toBe(false);
    }
  });

  it("infers spot from call/put mid parity when the header lacks one", () => {
    const noSpot = fixture().split("\n").slice(2).join("\n"); // drop symbol+timestamp lines
    const p = parseCboeCsv(noSpot, TODAY);
    // call and put mids meet exactly at the 340 strike in this fixture
    expect(p.spot).toBe(340);
    expect(p.expirations.length).toBeGreaterThan(0);
  });

  it("returns empty on non-chain input instead of throwing", () => {
    const p = parseCboeCsv("just,some,random\ncsv,file,here", TODAY);
    expect(p.expirations).toEqual([]);
    expect(p.rows).toBe(0);
  });
});

describe("chainToSnapshot", () => {
  it("keeps the user's chain and marks the snapshot as custom", () => {
    const p = parseCboeCsv(fixture(), TODAY);
    const snap = chainToSnapshot({ symbol: "aapl", spot: 327.06, expirations: p.expirations });
    expect(snap.symbol).toBe("AAPL");
    expect(snap.simulated).toBe(false);
    expect(snap.source).toBe("custom");
    expect(snap.spot).toBeCloseTo(327.06);
    expect(snap.expirations).toBe(p.expirations); // untouched, not regenerated
    expect(snap.iv30).toBeGreaterThan(0.2);
    expect(snap.iv30).toBeLessThan(0.4);
    expect(snap.history.length).toBeGreaterThan(100); // illustrative history exists
  });
});
