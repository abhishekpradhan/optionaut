"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveLinear } from "d3-shape";
import { payoffAtExpiry, markToMarket, breakevens, expectedMove } from "@/lib/options/position";
import { strikeCandidates, type LabLeg, type StrategyDef } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import type { MarketCtx, OptionKind } from "@/lib/options/types";
import { fmtUsd, fmtUsdCompact, fmtSignedUsd } from "@/lib/format";

const GRID_N = 241;

interface Props {
  snapshot: Snapshot;
  def: StrategyDef;
  legs: LabLeg[];
  dte: number;
  elapsedDays: number;
  ivScale: number;
  whatIfPrice: number | null;
  onStrikeChange: (role: string, strike: number) => void;
}

function useMeasure<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

/** Insert exact zero crossings so profit/loss fills split cleanly. */
function withCrossings(pts: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      if ((y1 < 0 && y2 > 0) || (y1 > 0 && y2 < 0)) {
        out.push([x1 + ((0 - y1) * (x2 - x1)) / (y2 - y1), 0]);
      }
    }
    out.push(pts[i]);
  }
  return out;
}

export function PayoffChart({
  snapshot,
  def,
  legs,
  dte,
  elapsedDays,
  ivScale,
  whatIfPrice,
  onStrikeChange,
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const height = 420;
  const margin = { top: 26, right: 86, bottom: 66, left: 60 };
  const innerW = Math.max(width - margin.left - margin.right, 40);
  const innerH = height - margin.top - margin.bottom;
  const [hoverX, setHoverX] = React.useState<number | null>(null);
  const [dragRole, setDragRole] = React.useState<string | null>(null);

  const ctx: MarketCtx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const spot = snapshot.spot;

  // ----- domains ---------------------------------------------------------
  const strikes = legs.filter((l) => l.kind !== "stock").map((l) => l.strike);
  const em = expectedMove(spot, snapshot.iv30 ?? 0.3, Math.max(dte, 7));
  const span = Math.min(Math.max((2.6 * em) / spot, 0.16), 0.5);
  const xLo = Math.min(spot * (1 - span), ...(strikes.length ? [Math.min(...strikes) * 0.96] : []));
  const xHi = Math.max(spot * (1 + span), ...(strikes.length ? [Math.max(...strikes) * 1.04] : []));

  const { xs, expiryPts, nowPts } = React.useMemo(() => {
    const xs: number[] = [];
    const expiryPts: Array<[number, number]> = [];
    const nowPts: Array<[number, number]> = [];
    for (let i = 0; i < GRID_N; i++) {
      const S = xLo + ((xHi - xLo) * i) / (GRID_N - 1);
      xs.push(S);
      expiryPts.push([S, payoffAtExpiry(legs, S)]);
      nowPts.push([S, markToMarket(legs, S, elapsedDays, ctx, ivScale)]);
    }
    return { xs, expiryPts, nowPts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, elapsedDays, ivScale, xLo, xHi, snapshot]);

  const yVals = [...expiryPts, ...nowPts].map((p) => p[1]);
  const yMin = Math.min(...yVals, 0);
  const yMax = Math.max(...yVals, 0);
  const yPad = Math.max((yMax - yMin) * 0.12, 50);

  const x = scaleLinear().domain([xLo, xHi]).range([0, innerW]);
  const y = scaleLinear()
    .domain([yMin - yPad, yMax + yPad])
    .range([innerH, 0])
    .nice();

  const linePath = d3line<[number, number]>()
    .x((d) => x(d[0]))
    .y((d) => y(d[1]))
    .curve(curveLinear);

  const zeroArea = d3area<[number, number]>()
    .x((d) => x(d[0]))
    .y0(() => y(0))
    .y1((d) => y(d[1]))
    .curve(curveLinear);

  const expiryWithCross = withCrossings(expiryPts);
  const gainPath = zeroArea(expiryWithCross.map(([px, py]) => [px, Math.max(py, 0)]));
  const lossPath = zeroArea(expiryWithCross.map(([px, py]) => [px, Math.min(py, 0)]));

  const bes = React.useMemo(() => breakevens(legs).filter((b) => b >= xLo && b <= xHi), [legs, xLo, xHi]);

  // ----- interaction -----------------------------------------------------
  const nearestIndex = (clientX: number, el: SVGElement) => {
    const rect = el.closest("svg")!.getBoundingClientRect();
    const px = clientX - rect.left - margin.left;
    const S = x.invert(Math.min(Math.max(px, 0), innerW));
    return Math.round(((S - xLo) / (xHi - xLo)) * (GRID_N - 1));
  };

  const handlePointer = (e: React.PointerEvent<SVGRectElement>) => {
    const i = nearestIndex(e.clientX, e.currentTarget);
    setHoverX(Math.min(Math.max(i, 0), GRID_N - 1));
  };

  const dragInfo = React.useRef<{ role: string; kind: OptionKind } | null>(null);
  const exp = snapshot.expirations.find((e) => e.dte === dte) ?? snapshot.expirations[0];

  const startDrag = (role: string, kind: OptionKind) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragInfo.current = { role, kind };
    setDragRole(role);
  };
  const moveDrag = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragInfo.current) return;
    const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
    const S = x.invert(Math.min(Math.max(e.clientX - rect.left - margin.left, 0), innerW));
    const candidates = strikeCandidates(exp, dragInfo.current.kind);
    if (!candidates.length) return;
    const k = candidates.reduce((p, c) => (Math.abs(c - S) < Math.abs(p - S) ? c : p));
    onStrikeChange(dragInfo.current.role, k);
  };
  const endDrag = () => {
    dragInfo.current = null;
    setDragRole(null);
  };

  const stepStrike = (role: string, kind: OptionKind, dir: 1 | -1, current: number) => {
    const candidates = strikeCandidates(exp, kind);
    const i = candidates.indexOf(current);
    const next = candidates[i + dir];
    if (next != null) onStrikeChange(role, next);
  };

  // Draggable strike handles, stacked when strikes coincide (straddle).
  const handles = legs
    .filter((l) => l.kind !== "stock")
    .map((l) => ({
      role: l.role === "atmPut" ? "atm" : l.role,
      label: l.label,
      kind: l.kind as OptionKind,
      strike: l.strike,
      side: l.side,
    }))
    .filter((h, i, arr) => arr.findIndex((o) => o.role === h.role) === i);

  const hover = hoverX != null
    ? { S: xs[hoverX], now: nowPts[hoverX][1], exp: expiryPts[hoverX][1] }
    : null;

  const whatIfIdx = whatIfPrice != null
    ? Math.round(((whatIfPrice - xLo) / (xHi - xLo)) * (GRID_N - 1))
    : null;
  const whatIf = whatIfIdx != null && whatIfIdx >= 0 && whatIfIdx < GRID_N
    ? { S: xs[whatIfIdx], now: nowPts[whatIfIdx][1], exp: expiryPts[whatIfIdx][1] }
    : null;

  const daysLeft = Math.max(dte - elapsedDays, 0);
  const nowLabel = elapsedDays <= 0 ? "Today" : daysLeft === 0 ? "At expiry" : `In ${elapsedDays}d`;

  const ticksX = x.ticks(innerW < 460 ? 3 : 6);
  const ticksY = y.ticks(5);

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img"
          aria-label={`Profit and loss diagram for ${def.name} on ${snapshot.symbol}`}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* grid */}
            {ticksY.map((t) => (
              <line key={`gy${t}`} x1={0} x2={innerW} y1={y(t)} y2={y(t)}
                stroke="var(--grid-line)" strokeWidth={1} />
            ))}
            {ticksX.map((t) => (
              <line key={`gx${t}`} x1={x(t)} x2={x(t)} y1={0} y2={innerH}
                stroke="var(--grid-line)" strokeWidth={1} />
            ))}

            {/* profit / loss washes under the expiry line */}
            <path d={gainPath ?? undefined} fill="var(--gain)" opacity={0.11} />
            <path d={lossPath ?? undefined} fill="var(--loss)" opacity={0.1} />

            {/* zero line */}
            <line x1={0} x2={innerW} y1={y(0)} y2={y(0)}
              stroke="var(--axis-line)" strokeWidth={1} />

            {/* spot reference */}
            <line x1={x(spot)} x2={x(spot)} y1={-6} y2={innerH}
              stroke="var(--muted-foreground)" strokeWidth={1}
              strokeDasharray="3 4" opacity={0.55} />
            <text x={x(spot)} y={-10} textAnchor="middle"
              className="figures" fontSize={10.5} fill="var(--muted-foreground)">
              now {fmtUsd(spot)}
            </text>

            {/* strike guides */}
            {handles.map((h) => (
              <line key={`kg-${h.role}`} x1={x(h.strike)} x2={x(h.strike)}
                y1={0} y2={innerH} stroke="var(--flat)" strokeWidth={1}
                opacity={dragRole === h.role ? 0.9 : 0.45} />
            ))}

            {/* expiry payoff (the skeleton) — soft halo under a crisp core */}
            <path d={linePath(expiryPts) ?? undefined} fill="none"
              stroke="var(--foreground)" strokeWidth={6} opacity={0.1}
              strokeLinejoin="round" strokeLinecap="round" />
            <path className="hero-draw" pathLength={1}
              d={linePath(expiryPts) ?? undefined}
              fill="none" stroke="var(--foreground)" strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
            {/* value now (the living line) — neon stack */}
            <path d={linePath(nowPts) ?? undefined} fill="none"
              stroke="var(--primary)" strokeWidth={11} opacity={0.07}
              strokeLinejoin="round" strokeLinecap="round" />
            <path d={linePath(nowPts) ?? undefined} fill="none"
              stroke="var(--primary)" strokeWidth={5} opacity={0.18}
              strokeLinejoin="round" strokeLinecap="round" />
            <path className="hero-draw" pathLength={1}
              style={{ animationDelay: "0.12s" }}
              d={linePath(nowPts) ?? undefined}
              fill="none" stroke="var(--primary)" strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" />

            {/* direct end labels with line keys (text wears ink, not data
                color); nudged apart when the series converge at the edge */}
            {(() => {
              let yNow = y(nowPts[GRID_N - 1][1]);
              let yExp = y(expiryPts[GRID_N - 1][1]);
              const MIN_GAP = 14;
              if (Math.abs(yNow - yExp) < MIN_GAP) {
                const mid = (yNow + yExp) / 2;
                const dir = yNow <= yExp ? -1 : 1;
                yNow = mid + (dir * MIN_GAP) / 2;
                yExp = mid - (dir * MIN_GAP) / 2;
              }
              return (
                <g transform={`translate(${innerW + 8},0)`}>
                  <line x1={0} x2={14} y1={yNow} y2={yNow}
                    stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />
                  <text x={18} y={yNow} dy="0.32em" fontSize={11}
                    fill="var(--secondary-foreground)">{nowLabel}</text>
                  <line x1={0} x2={14} y1={yExp} y2={yExp}
                    stroke="var(--foreground)" strokeWidth={2} strokeLinecap="round" />
                  <text x={18} y={yExp} dy="0.32em" fontSize={11}
                    fill="var(--secondary-foreground)">Expiry</text>
                </g>
              );
            })()}

            {/* breakevens */}
            {bes.map((b) => (
              <g key={`be${b}`} transform={`translate(${x(b)},${y(0)})`}>
                <rect x={-4.5} y={-4.5} width={9} height={9} transform="rotate(45)"
                  fill="var(--background)" stroke="var(--foreground)" strokeWidth={1.5} />
                <text y={-10} textAnchor="middle" fontSize={10.5}
                  className="figures" fill="var(--muted-foreground)">
                  BE {fmtUsd(b, { cents: false })}
                </text>
              </g>
            ))}

            {/* what-if marker from the price dial */}
            {whatIf && Math.abs(whatIf.S - spot) > (xHi - xLo) / 400 && (
              <g>
                <line x1={x(whatIf.S)} x2={x(whatIf.S)} y1={0} y2={innerH}
                  stroke="var(--primary)" strokeWidth={1} opacity={0.5} />
                <circle cx={x(whatIf.S)} cy={y(whatIf.now)} r={10}
                  fill="var(--primary)" opacity={0.22} />
                <circle cx={x(whatIf.S)} cy={y(whatIf.now)} r={5}
                  fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
                <circle cx={x(whatIf.S)} cy={y(whatIf.exp)} r={4.5}
                  fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />
              </g>
            )}

            {/* hover crosshair */}
            {hover && (
              <g pointerEvents="none">
                <line x1={x(hover.S)} x2={x(hover.S)} y1={0} y2={innerH}
                  stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.7} />
                <circle cx={x(hover.S)} cy={y(hover.now)} r={4.5}
                  fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
                <circle cx={x(hover.S)} cy={y(hover.exp)} r={4}
                  fill="var(--foreground)" stroke="var(--background)" strokeWidth={2} />
              </g>
            )}

            {/* axes */}
            <g className="figures">
              {ticksY.map((t) => (
                <text key={`ty${t}`} x={-10} y={y(t)} dy="0.32em" textAnchor="end"
                  fontSize={10.5} fill="var(--muted-foreground)">
                  {fmtUsdCompact(t)}
                </text>
              ))}
              {ticksX.map((t) => (
                <text key={`tx${t}`} x={x(t)} y={innerH + 18} textAnchor="middle"
                  fontSize={10.5} fill="var(--muted-foreground)">
                  {fmtUsd(t, { cents: false })}
                </text>
              ))}
            </g>

            {/* hover capture */}
            <rect x={0} y={0} width={innerW} height={innerH} fill="transparent"
              onPointerMove={handlePointer} onPointerLeave={() => setHoverX(null)} />

            {/* strike handles (draggable, keyboard-steppable) */}
            <g onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
              {handles.map((h) => {
                const yPos = innerH + 44;
                const w = 58;
                return (
                  <g key={h.role} transform={`translate(${x(h.strike)},${yPos})`}
                    tabIndex={0} role="slider"
                    aria-label={`${h.label} strike`}
                    aria-valuenow={h.strike}
                    aria-valuetext={`${h.label} at ${fmtUsd(h.strike)}`}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight") { e.preventDefault(); stepStrike(h.role, h.kind, 1, h.strike); }
                      if (e.key === "ArrowLeft") { e.preventDefault(); stepStrike(h.role, h.kind, -1, h.strike); }
                    }}
                    onPointerDown={startDrag(h.role, h.kind)}
                    style={{ cursor: "ew-resize", outline: "none" }}
                    className="group focus-visible:[&>rect]:stroke-[var(--ring)]"
                  >
                    {/* generous hit target */}
                    <rect x={-w / 2 - 6} y={-14} width={w + 12} height={30} fill="transparent" />
                    <rect x={-w / 2} y={-11} width={w} height={22} rx={11}
                      fill={dragRole === h.role ? "var(--accent)" : "var(--panel-raised)"}
                      stroke={dragRole === h.role ? "var(--primary)" : "var(--border)"}
                      strokeWidth={1.25}
                    />
                    <text textAnchor="middle" dy="0.32em" fontSize={10.5} className="figures"
                      fill="var(--secondary-foreground)">
                      {`${h.side > 0 ? "+" : "−"}${h.kind === "call" ? "C" : "P"} ${h.strike}`}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      )}

      {/* hover tooltip — one readout, every series, values lead */}
      {hover && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur"
          style={{
            left: Math.min(Math.max(margin.left + x(hover.S) + 14, 8), width - 190),
            top: margin.top + 6,
            ...(margin.left + x(hover.S) > width - 220
              ? { left: margin.left + x(hover.S) - 190 }
              : {}),
          }}
        >
          <div className="figures text-[13px] font-semibold text-foreground">
            {fmtUsd(hover.S)}
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({fmtSignedPctOf(hover.S, spot)})
            </span>
          </div>
          <div className="mt-1.5 space-y-1 text-[12px]">
            <TooltipRow color="var(--primary)" value={fmtSignedUsd(hover.now)} label={nowLabel.toLowerCase()} />
            <TooltipRow color="var(--foreground)" value={fmtSignedUsd(hover.exp)} label="at expiry" />
          </div>
        </div>
      )}
    </div>
  );
}

function fmtSignedPctOf(v: number, base: number): string {
  const pct = ((v - base) / base) * 100;
  return `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`;
}

function TooltipRow({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: color }} />
      <span className="figures font-semibold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
