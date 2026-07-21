"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line } from "d3-shape";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { payoffAtExpiry, markToMarket, breakevens } from "@/lib/options/position";
import type { Leg } from "@/lib/options/types";
import { fmtUsd, fmtSignedUsd } from "@/lib/format";

/**
 * The lessons' pocket laboratory: a compact payoff diagram over synthetic
 * round-number positions, with only the dials the current idea needs.
 * One concept per widget (PLAN.md §4.2) — every extra control is clutter.
 */

export type MiniDial = "price" | "time" | "iv" | "strike" | "side";

export interface MiniLeg {
  kind: "call" | "put" | "stock";
  side: 1 | -1;
  strike: number;
  entryPrice: number;
  iv: number;
  dte: number;
}

interface Props {
  legs: MiniLeg[];
  dials?: MiniDial[];
  showToday?: boolean;
  /** repriced premium when the strike dial moves (keeps the model honest) */
  premiumOfStrike?: (k: number) => number;
  strikeRange?: [number, number];
  height?: number;
  caption?: React.ReactNode;
}

const R = 0.04;
const GRID_N = 161;

export function MiniLab({
  legs: baseLegs,
  dials = ["price"],
  showToday = true,
  premiumOfStrike,
  strikeRange,
  height = 230,
  caption,
}: Props) {
  const anchor = baseLegs[0];
  const spot0 = anchor.kind === "stock" ? anchor.entryPrice : 100;
  const [spot, setSpot] = React.useState(spot0);
  const [elapsed, setElapsed] = React.useState(0);
  const [ivScale, setIvScale] = React.useState(1);
  const [strike, setStrike] = React.useState(anchor.strike || 100);
  const [flip, setFlip] = React.useState(false);

  const dte = Math.max(...baseLegs.map((l) => l.dte), 0);

  const legs: Leg[] = React.useMemo(
    () =>
      baseLegs.map((l) => ({
        kind: l.kind,
        side: (flip ? -l.side : l.side) as 1 | -1,
        qty: 1,
        strike: dials.includes("strike") && l.kind !== "stock" ? strike : l.strike,
        entryPrice:
          dials.includes("strike") && l.kind !== "stock" && premiumOfStrike
            ? premiumOfStrike(strike)
            : l.entryPrice,
        iv: l.iv,
        dte: l.dte,
      })),
    [baseLegs, flip, strike, dials, premiumOfStrike],
  );

  const ctx = { r: R, q: 0 };
  const xLo = spot0 * 0.72;
  const xHi = spot0 * 1.28;
  const margin = { top: 14, right: 64, bottom: 26, left: 8 };
  const [width, setWidth] = React.useState(0);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const innerW = Math.max(width - margin.left - margin.right, 40);
  const innerH = height - margin.top - margin.bottom;

  const { expiryPts, nowPts } = React.useMemo(() => {
    const e: Array<[number, number]> = [];
    const n: Array<[number, number]> = [];
    for (let i = 0; i < GRID_N; i++) {
      const S = xLo + ((xHi - xLo) * i) / (GRID_N - 1);
      e.push([S, payoffAtExpiry(legs, S)]);
      n.push([S, markToMarket(legs, S, elapsed, ctx, ivScale)]);
    }
    return { expiryPts: e, nowPts: n };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, elapsed, ivScale, xLo, xHi]);

  const ys = [...expiryPts, ...nowPts].map((p) => p[1]);
  const yAbs = Math.max(...ys.map(Math.abs), 100);
  const x = scaleLinear().domain([xLo, xHi]).range([0, innerW]);
  const y = scaleLinear().domain([-yAbs * 1.12, yAbs * 1.12]).range([innerH, 0]);
  const path = d3line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1]));

  const bes = breakevens(legs).filter((b) => b > xLo && b < xHi);
  const plNow = markToMarket(legs, spot, elapsed, ctx, ivScale);
  const plExp = payoffAtExpiry(legs, spot);
  const dirty = spot !== spot0 || elapsed > 0 || ivScale !== 1 || flip;

  const setFromSlider = (fn: (v: number) => void) => (v: number | readonly number[]) =>
    fn(Array.isArray(v) ? v[0] : (v as number));

  return (
    <div className="panel my-5 overflow-hidden">
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden>
            <g transform={`translate(${margin.left},${margin.top})`}>
              <line x1={0} x2={innerW} y1={y(0)} y2={y(0)} stroke="var(--axis-line)" />
              {/* gain / loss washes */}
              <polygon
                points={`${expiryPts.map(([px, py]) => `${x(px)},${y(Math.max(py, 0))}`).join(" ")} ${x(xHi)},${y(0)} ${x(xLo)},${y(0)}`}
                fill="var(--gain)" opacity={0.1}
              />
              <polygon
                points={`${expiryPts.map(([px, py]) => `${x(px)},${y(Math.min(py, 0))}`).join(" ")} ${x(xHi)},${y(0)} ${x(xLo)},${y(0)}`}
                fill="var(--loss)" opacity={0.1}
              />
              {/* spot marker */}
              <line x1={x(spot)} x2={x(spot)} y1={0} y2={innerH}
                stroke="var(--muted-foreground)" strokeDasharray="3 4" opacity={0.6} />
              <circle cx={x(spot)} cy={y(showToday ? plNow : plExp)} r={4.5}
                fill={showToday ? "var(--primary)" : "var(--foreground)"}
                stroke="var(--background)" strokeWidth={2} />
              {/* lines */}
              <path d={path(expiryPts) ?? undefined} fill="none" stroke="var(--foreground)"
                strokeWidth={5} opacity={0.09} strokeLinejoin="round" strokeLinecap="round" />
              <path d={path(expiryPts) ?? undefined} fill="none" stroke="var(--foreground)"
                strokeWidth={2} strokeLinejoin="round" />
              {showToday && (
                <>
                  <path d={path(nowPts) ?? undefined} fill="none" stroke="var(--primary)"
                    strokeWidth={7} opacity={0.14} strokeLinejoin="round" strokeLinecap="round" />
                  <path d={path(nowPts) ?? undefined} fill="none" stroke="var(--primary)"
                    strokeWidth={2.25} strokeLinejoin="round" />
                </>
              )}
              {/* breakevens */}
              {bes.map((b) => (
                <g key={b} transform={`translate(${x(b)},${y(0)})`}>
                  <rect x={-3.5} y={-3.5} width={7} height={7} transform="rotate(45)"
                    fill="var(--background)" stroke="var(--foreground)" strokeWidth={1.25} />
                </g>
              ))}
              {/* end labels */}
              {(() => {
                let yN = y(nowPts[GRID_N - 1][1]);
                let yE = y(expiryPts[GRID_N - 1][1]);
                if (showToday && Math.abs(yN - yE) < 13) {
                  const mid = (yN + yE) / 2;
                  const dir = yN <= yE ? -1 : 1;
                  yN = mid + dir * 6.5;
                  yE = mid - dir * 6.5;
                }
                return (
                  <g fontSize={10} fill="var(--muted-foreground)">
                    {showToday && <text x={innerW + 6} y={yN} dy="0.32em">today</text>}
                    <text x={innerW + 6} y={yE} dy="0.32em">expiry</text>
                  </g>
                );
              })()}
              {/* x ticks */}
              <g fontSize={10} fill="var(--muted-foreground)" className="figures">
                {x.ticks(5).map((t) => (
                  <text key={t} x={x(t)} y={innerH + 16} textAnchor="middle">
                    ${t}
                  </text>
                ))}
              </g>
            </g>
          </svg>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
          <span className="text-muted-foreground">
            Stock at <span className="figures text-foreground">{fmtUsd(spot, { cents: false })}</span>
            {elapsed > 0 && (
              <> · <span className="figures text-foreground">{elapsed}d</span> later</>
            )}
            {ivScale !== 1 && (
              <> · vol <span className="figures text-foreground">×{ivScale.toFixed(2)}</span></>
            )}
          </span>
          <span className="figures">
            {showToday && (
              <span className={plNow > 0.5 ? "text-gain" : plNow < -0.5 ? "text-loss" : "text-foreground"}>
                {fmtSignedUsd(plNow, { cents: false })} now
              </span>
            )}
            <span className="ml-3 text-muted-foreground">
              {fmtSignedUsd(plExp, { cents: false })} at expiry
            </span>
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {dials.includes("price") && (
            <MiniDialRow label="Stock price">
              <Slider min={Math.round(xLo)} max={Math.round(xHi)} step={1}
                value={[spot]} onValueChange={setFromSlider(setSpot)} aria-label="Stock price" />
            </MiniDialRow>
          )}
          {dials.includes("time") && (
            <MiniDialRow label={`Days passed (${elapsed}/${dte})`}>
              <Slider min={0} max={dte} step={1}
                value={[elapsed]} onValueChange={setFromSlider(setElapsed)} aria-label="Days passed" />
            </MiniDialRow>
          )}
          {dials.includes("iv") && (
            <MiniDialRow label={`Volatility ×${ivScale.toFixed(2)}`}>
              <Slider min={0.4} max={2} step={0.05}
                value={[ivScale]} onValueChange={setFromSlider(setIvScale)} aria-label="Volatility multiplier" />
            </MiniDialRow>
          )}
          {dials.includes("strike") && (
            <MiniDialRow label={`Strike $${strike}`}>
              <Slider min={strikeRange?.[0] ?? 85} max={strikeRange?.[1] ?? 115} step={5}
                value={[strike]} onValueChange={setFromSlider(setStrike)} aria-label="Strike price" />
            </MiniDialRow>
          )}
          {dials.includes("side") && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant={flip ? "outline" : "secondary"} className="h-7 text-xs"
                onClick={() => setFlip(false)}>
                You&apos;re the buyer
              </Button>
              <Button size="sm" variant={flip ? "secondary" : "outline"} className="h-7 text-xs"
                onClick={() => setFlip(true)}>
                You&apos;re the seller
              </Button>
            </div>
          )}
          {dirty && (
            <button
              onClick={() => { setSpot(spot0); setElapsed(0); setIvScale(1); setFlip(false); }}
              className="flex items-center gap-1 justify-self-start text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden /> reset
            </button>
          )}
        </div>
        {caption && <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground/90">{caption}</p>}
      </div>
    </div>
  );
}

function MiniDialRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11.5px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
