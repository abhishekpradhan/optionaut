"use client";

import * as React from "react";
import { interpolateRgb } from "d3-interpolate";
import { markToMarket, expectedMove } from "@/lib/options/position";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtSignedUsd } from "@/lib/format";

/**
 * The OptionStrat-signature view, made interactive: profit/loss over
 * every (price, day) pair, on the diverging blue-neutral-red ramp.
 * Clicking a cell drives the price and time dials — the heatmap and the
 * payoff chart are two views of the same machine.
 */
const ROWS = 46;
const CELL_H = 7;

interface Props {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
  ivScale: number;
  elapsedDays: number;
  whatIfPrice: number | null;
  onPick: (price: number, day: number) => void;
}

const NEUTRAL = "#20242e";
const toGain = interpolateRgb(NEUTRAL, "#3987e5");
const toLoss = interpolateRgb(NEUTRAL, "#e66767");

function useMeasure<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

export function Heatmap({ snapshot, legs, dte, ivScale, elapsedDays, whatIfPrice, onPick }: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = React.useState<{ c: number; r: number } | null>(null);

  const spot = snapshot.spot;
  const ctx = { r: snapshot.riskFreeRate, q: snapshot.divYield };
  const cols = Math.min(dte + 1, 44);
  const margin = { left: 56, right: 10, top: 8, bottom: 30 };
  const plotW = Math.max(width - margin.left - margin.right, 60);
  const plotH = ROWS * CELL_H;
  const height = plotH + margin.top + margin.bottom;

  const em = expectedMove(spot, snapshot.iv30 ?? 0.3, Math.max(dte, 7));
  const span = Math.min(Math.max((2.2 * em) / spot, 0.14), 0.42);
  const pLo = spot * (1 - span);
  const pHi = spot * (1 + span);

  const priceAt = React.useCallback(
    (r: number) => pHi - ((pHi - pLo) * r) / (ROWS - 1),
    [pLo, pHi],
  );
  const dayAt = React.useCallback(
    (c: number) => Math.round((dte * c) / (cols - 1)),
    [dte, cols],
  );

  // P/L grid + symmetric normalization so $0 is always the neutral color.
  const grid = React.useMemo(() => {
    const g: number[][] = [];
    let maxAbs = 1;
    for (let r = 0; r < ROWS; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        const v = markToMarket(legs, priceAt(r), dayAt(c), ctx, ivScale);
        row.push(v);
        maxAbs = Math.max(maxAbs, Math.abs(v));
      }
      g.push(row);
    }
    return { g, maxAbs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, ivScale, cols, priceAt, dayAt]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = plotW * dpr;
    canvas.height = plotH * dpr;
    const c2 = canvas.getContext("2d");
    if (!c2) return;
    c2.scale(dpr, dpr);
    const cw = plotW / cols;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid.g[r][c];
        const t = Math.min(Math.abs(v) / grid.maxAbs, 1);
        // sqrt eases small values into visibility without lying about sign
        const eased = Math.sqrt(t);
        c2.fillStyle = v >= 0 ? toGain(eased) : toLoss(eased);
        c2.fillRect(c * cw + 0.5, r * CELL_H + 0.5, cw - 1, CELL_H - 1);
      }
    }
  }, [grid, plotW, plotH, cols, width]);

  const hoverInfo = hover
    ? { price: priceAt(hover.r), day: dayAt(hover.c), v: grid.g[hover.r][hover.c] }
    : null;

  const cellFromEvent = (e: React.PointerEvent | React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * cols);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    if (c < 0 || c >= cols || r < 0 || r >= ROWS) return null;
    return { c, r };
  };

  // markers for the current dial state
  const dialC = Math.round(((cols - 1) * elapsedDays) / dte);
  const dialR = whatIfPrice != null
    ? Math.round(((pHi - whatIfPrice) / (pHi - pLo)) * (ROWS - 1))
    : null;

  const dayTicks = [0, Math.round(dte / 3), Math.round((2 * dte) / 3), dte];

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <>
          <div style={{ position: "absolute", left: margin.left, top: margin.top }}>
            <canvas
              ref={canvasRef}
              style={{ width: plotW, height: plotH, cursor: "pointer", display: "block", borderRadius: 6 }}
              onPointerMove={(e) => setHover(cellFromEvent(e))}
              onPointerLeave={() => setHover(null)}
              onClick={(e) => {
                const cell = cellFromEvent(e);
                if (cell) onPick(priceAt(cell.r), dayAt(cell.c));
              }}
              role="img"
              aria-label="Profit and loss for every price and date combination; click to set the dials"
            />
            {/* hover ring */}
            {hover && (
              <div
                className="pointer-events-none absolute rounded-[3px] ring-2 ring-foreground/80"
                style={{
                  left: (plotW / cols) * hover.c,
                  top: hover.r * CELL_H,
                  width: plotW / cols,
                  height: CELL_H,
                }}
              />
            )}
            {/* current dial marker */}
            {dialR != null && dialR >= 0 && dialR < ROWS && (
              <div
                className="pointer-events-none absolute rounded-full border-2 border-background bg-foreground"
                style={{
                  left: (plotW / cols) * dialC + plotW / cols / 2 - 4,
                  top: dialR * CELL_H + CELL_H / 2 - 4,
                  width: 8,
                  height: 8,
                }}
              />
            )}
          </div>

          {/* y axis: prices */}
          <svg width={margin.left} height={height} className="absolute left-0 top-0 figures">
            {[0, Math.round(ROWS * 0.25), Math.round(ROWS * 0.5), Math.round(ROWS * 0.75), ROWS - 1].map(
              (r) => (
                <text key={r} x={margin.left - 8} y={margin.top + r * CELL_H + CELL_H / 2}
                  dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--muted-foreground)">
                  {fmtUsd(priceAt(r), { cents: false })}
                </text>
              ),
            )}
            <line x1={margin.left - 2} x2={margin.left - 2}
              y1={margin.top + ((pHi - spot) / (pHi - pLo)) * plotH - 5}
              y2={margin.top + ((pHi - spot) / (pHi - pLo)) * plotH + 5}
              stroke="var(--foreground)" strokeWidth={2} />
          </svg>

          {/* x axis: days */}
          <svg width={width} height={margin.bottom} className="absolute bottom-0 left-0 figures">
            {dayTicks.map((d) => (
              <text key={d}
                x={margin.left + (plotW * (d / dte) * (cols - 1)) / cols + plotW / cols / 2}
                y={16} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
                {d === 0 ? "today" : d === dte ? "expiry" : `+${d}d`}
              </text>
            ))}
          </svg>
        </>
      )}

      {hoverInfo && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover/95 px-3 py-2 text-[12px] shadow-lg backdrop-blur"
          style={{
            left: Math.min(margin.left + (plotW / cols) * hover!.c + 18, width - 180),
            top: Math.max(margin.top + hover!.r * CELL_H - 14, 2),
          }}
        >
          <div className="figures font-semibold text-foreground">{fmtSignedUsd(hoverInfo.v, { cents: false })}</div>
          <div className="mt-0.5 text-muted-foreground">
            {fmtUsd(hoverInfo.price, { cents: false })} ·{" "}
            {hoverInfo.day === 0 ? "today" : hoverInfo.day === dte ? "at expiry" : `in ${hoverInfo.day}d`}
          </div>
          <div className="mt-1 text-[10.5px] text-muted-foreground/80">click to set the dials</div>
        </div>
      )}
    </div>
  );
}

/** Legend for the heatmap's diverging scale. */
export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span>loss</span>
      <span
        aria-hidden
        className="inline-block h-2 w-24 rounded-full"
        style={{
          background: `linear-gradient(90deg, #e66767, ${NEUTRAL} 50%, #3987e5)`,
        }}
      />
      <span>profit</span>
    </div>
  );
}

const NEUTRAL_EXPORT = NEUTRAL;
export { NEUTRAL_EXPORT as HEATMAP_NEUTRAL };
