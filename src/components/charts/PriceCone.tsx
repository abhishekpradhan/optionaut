"use client";

import * as React from "react";
import { scaleLinear } from "d3-scale";
import type { Snapshot } from "@/lib/data/types";
import { fmtUsd, fmtDate } from "@/lib/format";

/**
 * Six months of real candles plus the market's forward-looking expected
 * move, drawn as a widening cone from today. The cone is the teaching
 * hero: implied volatility made visible as "the range the market is
 * pricing". 1σ ≈ 68% of outcomes, 2σ ≈ 95% — labeled as estimates.
 */
const PAST_DAYS = 140;

interface Props {
  snapshot: Snapshot;
  height?: number;
}

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

export function PriceCone({ snapshot, height = 380 }: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const margin = { top: 24, right: 92, bottom: 34, left: 14 };
  const innerW = Math.max(width - margin.left - margin.right, 40);
  const innerH = height - margin.top - margin.bottom;
  const [hover, setHover] = React.useState<number | null>(null); // x index

  const candles = snapshot.history.slice(-PAST_DAYS);
  const iv = snapshot.iv30 ?? snapshot.hv30 ?? 0.3;
  const spot = snapshot.spot;

  // Future axis in trading-day equivalents so per-pixel time flows evenly.
  const maxDte = Math.min(
    Math.max(...snapshot.expirations.map((e) => e.dte), 45),
    95,
  );
  const futureTd = Math.round((maxDte * 5) / 7);
  const totalX = candles.length + futureTd;

  const coneAt = (calDays: number, sd: number) =>
    spot * sd * iv * Math.sqrt(calDays / 365);

  const yLo = Math.min(...candles.map((c) => c.l), spot - coneAt(maxDte, 2));
  const yHi = Math.max(...candles.map((c) => c.h), spot + coneAt(maxDte, 2));
  const pad = (yHi - yLo) * 0.06;

  const x = scaleLinear().domain([0, totalX - 1]).range([0, innerW]);
  const y = scaleLinear().domain([yLo - pad, yHi + pad]).range([innerH, 0]);

  const step = innerW / (totalX - 1);
  const bodyW = Math.max(Math.min(step * 0.62, 7), 1.5);
  const todayX = x(candles.length - 1);

  // The right margin is shared by price ticks and the cone's ±$ labels;
  // a tick whose y lands inside a cone label block gets its text hidden
  // (the grid line stays) so the two never overprint.
  const coneLabelAnchors = [y(spot + coneAt(maxDte, 1)), y(spot + coneAt(maxDte, 2))];
  const tickLabelHidden = (ty: number) =>
    coneLabelAnchors.some((a) => ty > a - 14 && ty < a + 26);

  // Cone polygon points (in trading-day x units, calendar-day sigma).
  const conePts = (sd: number) => {
    const N = 32;
    const upper: string[] = [];
    const lower: string[] = [];
    for (let i = 0; i <= N; i++) {
      const cal = (maxDte * i) / N;
      const px = x(candles.length - 1 + (cal * 5) / 7 / 1); // td equivalent
      upper.push(`${px},${y(spot + coneAt(cal, sd))}`);
      lower.unshift(`${px},${y(spot - coneAt(cal, sd))}`);
    }
    return `${upper.join(" ")} ${lower.join(" ")}`;
  };

  // Month tick positions across the past region; thinned when narrow.
  const monthTicks: Array<{ i: number; label: string }> = [];
  let lastMonth = "";
  candles.forEach((c, i) => {
    const m = c.d.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      if (i > 4)
        monthTicks.push({
          i,
          label: new Date(`${c.d}T12:00:00`).toLocaleDateString("en-US", { month: "short" }),
        });
    }
  });
  const shownMonthTicks =
    innerW < 480 ? monthTicks.filter((_, idx) => idx % 2 === 0) : monthTicks;

  const hoverInfo = React.useMemo(() => {
    if (hover == null) return null;
    if (hover < candles.length) {
      const c = candles[hover];
      return { type: "past" as const, xPix: x(hover), c };
    }
    const td = hover - (candles.length - 1);
    const cal = Math.round((td * 7) / 5);
    if (cal <= 0) return null;
    return {
      type: "future" as const,
      xPix: x(hover),
      cal,
      s1: coneAt(cal, 1),
      s2: coneAt(cal, 2),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, candles, innerW]);

  const futureDateLabel = (cal: number) => {
    const d = new Date(`${candles[candles.length - 1].d}T12:00:00`);
    d.setDate(d.getDate() + cal);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img"
          aria-label={`${snapshot.symbol} price history with the market's expected range ahead`}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* y grid + right-side price labels */}
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--grid-line)" />
                {!tickLabelHidden(y(t)) && (
                  <text x={innerW + 8} y={y(t)} dy="0.32em" fontSize={10.5}
                    className="figures" fill="var(--muted-foreground)">
                    {fmtUsd(t, { cents: false })}
                  </text>
                )}
              </g>
            ))}

            {/* candles — rising in as a wave from the left */}
            {candles.map((c, i) => {
              const up = c.c >= c.o;
              const color = up ? "var(--gain)" : "var(--loss)";
              const cx = x(i);
              return (
                <g key={c.d} className="candle-in" style={{ animationDelay: `${i * 3}ms` }}>
                  <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} opacity={0.9} />
                  <rect
                    x={cx - bodyW / 2}
                    y={y(Math.max(c.o, c.c))}
                    width={bodyW}
                    height={Math.max(Math.abs(y(c.o) - y(c.c)), 1)}
                    fill={color}
                    rx={0.5}
                  />
                </g>
              );
            })}

            {/* the cone — uncertainty wears neutral ink, not gain/loss;
                it sweeps open from today once the candles have landed */}
            <g className="cone-sweep">
              <polygon points={conePts(2)} fill="var(--foreground)" opacity={0.05} />
              <polygon points={conePts(1)} fill="var(--foreground)" opacity={0.09} />
              <line x1={todayX} x2={innerW} y1={y(spot)} y2={y(spot)}
                stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="2 4" opacity={0.7} />
            </g>

            {/* today divider */}
            <line x1={todayX} x2={todayX} y1={-6} y2={innerH} stroke="var(--axis-line)" strokeWidth={1} />
            <text x={todayX} y={-10} textAnchor="middle" fontSize={10.5} fill="var(--muted-foreground)">
              today
            </text>

            {/* expiry markers on the centerline; labels skip when crowded */}
            <g className="fade-late">
            {(() => {
              const marks = snapshot.expirations
                .filter((e) => e.dte <= maxDte)
                .map((e) => ({ e, px: x(candles.length - 1 + (e.dte * 5) / 7) }));
              let lastLabelX = -Infinity;
              return marks.map(({ e, px }) => {
                const label = px - lastLabelX >= 30;
                if (label) lastLabelX = px;
                return (
                  <g key={e.date} transform={`translate(${px},${y(spot)})`}>
                    <rect x={-3} y={-3} width={6} height={6} transform="rotate(45)"
                      fill="var(--background)" stroke="var(--muted-foreground)" strokeWidth={1} />
                    {label && (
                      <text y={innerH - y(spot) + 16} textAnchor="middle" fontSize={9.5}
                        className="figures chart-label" fill="var(--muted-foreground)">
                        {e.dte}d
                      </text>
                    )}
                  </g>
                );
              });
            })()}
            </g>

            {/* cone edge labels */}
            <g fontSize={10.5} fill="var(--secondary-foreground)" className="chart-label fade-late">
              <text x={innerW + 8} y={y(spot + coneAt(maxDte, 1)) + 4}>
                ±{fmtUsd(coneAt(maxDte, 1), { cents: false })}
              </text>
              <text x={innerW + 8} y={y(spot + coneAt(maxDte, 1)) + 16} fill="var(--muted-foreground)" fontSize={9.5}>
                likely (≈68%)
              </text>
              <text x={innerW + 8} y={y(spot + coneAt(maxDte, 2)) + 4}>
                ±{fmtUsd(coneAt(maxDte, 2), { cents: false })}
              </text>
              <text x={innerW + 8} y={y(spot + coneAt(maxDte, 2)) + 16} fill="var(--muted-foreground)" fontSize={9.5}>
                rare beyond (≈95%)
              </text>
            </g>

            {/* month ticks */}
            {shownMonthTicks.map((m) => (
              <text key={m.i} x={x(m.i)} y={innerH + 18} textAnchor="middle" fontSize={10.5}
                fill="var(--muted-foreground)">
                {m.label}
              </text>
            ))}

            {/* hover crosshair */}
            {hoverInfo && (
              <line x1={hoverInfo.xPix} x2={hoverInfo.xPix} y1={0} y2={innerH}
                stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.7} pointerEvents="none" />
            )}

            <rect x={0} y={0} width={innerW} height={innerH} fill="transparent"
              onPointerMove={(e) => {
                const rect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
                const idx = Math.round(x.invert(e.clientX - rect.left - margin.left));
                setHover(Math.min(Math.max(idx, 0), totalX - 1));
              }}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        </svg>
      )}

      {hoverInfo && width > 0 && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover/95 px-3 py-2 text-[12px] shadow-lg backdrop-blur"
          style={{
            left: Math.min(Math.max(margin.left + hoverInfo.xPix + 14, 8), width - 210),
            top: margin.top + 4,
          }}
        >
          {hoverInfo.type === "past" ? (
            <>
              <div className="figures font-semibold text-foreground">{fmtDate(hoverInfo.c.d)}</div>
              <div className="figures mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                <span>O {fmtUsd(hoverInfo.c.o, { cents: false })}</span>
                <span>H {fmtUsd(hoverInfo.c.h, { cents: false })}</span>
                <span>C <span className="text-foreground">{fmtUsd(hoverInfo.c.c, { cents: false })}</span></span>
                <span>L {fmtUsd(hoverInfo.c.l, { cents: false })}</span>
              </div>
            </>
          ) : (
            <>
              <div className="figures font-semibold text-foreground">
                by {futureDateLabel(hoverInfo.cal)}
                <span className="ml-1 font-normal text-muted-foreground">(+{hoverInfo.cal}d)</span>
              </div>
              <div className="mt-1 space-y-0.5 text-muted-foreground">
                <div>
                  <span className="figures text-foreground">
                    {fmtUsd(spot - hoverInfo.s1, { cents: false })}–{fmtUsd(spot + hoverInfo.s1, { cents: false })}
                  </span>{" "}
                  likely (≈68%)
                </div>
                <div>
                  <span className="figures text-foreground">
                    {fmtUsd(spot - hoverInfo.s2, { cents: false })}–{fmtUsd(spot + hoverInfo.s2, { cents: false })}
                  </span>{" "}
                  ≈95% range
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
