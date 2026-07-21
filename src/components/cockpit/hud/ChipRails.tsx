"use client";

import { useCockpit, type ViewMode } from "@/lib/cockpit/store";
import { STRATEGIES } from "@/lib/options/strategies";
import manifest from "@/data/manifest.json";
import { useSnapshot } from "@/lib/data/snapshot";
import { TrendingUp, TrendingDown, MoveHorizontal, Zap } from "lucide-react";
import type { Outlook } from "@/lib/options/strategies";

/** Bottom rails: the Universe-Atlas place chips, but for markets.
 *  Upper rail = strategies (grouped by outlook), lower rail = tickers +
 *  view modes + TOUR. */

const OUTLOOK_ICON: Record<Outlook, React.ReactNode> = {
  bullish: <TrendingUp className="size-3" aria-hidden />,
  bearish: <TrendingDown className="size-3" aria-hidden />,
  sideways: <MoveHorizontal className="size-3" aria-hidden />,
  bigmove: <Zap className="size-3" aria-hidden />,
};
const OUTLOOK_COLOR: Record<Outlook, string> = {
  bullish: "var(--outlook-bullish)",
  bearish: "var(--outlook-bearish)",
  sideways: "var(--outlook-sideways)",
  bigmove: "var(--outlook-bigmove)",
};

function Chip({
  active,
  onClick,
  children,
  accent,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`hud shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1.5 !text-[9.5px] transition-all ${
        active
          ? "border-primary/70 bg-accent text-foreground shadow-[0_0_14px_-2px_rgba(57,135,229,0.5)]"
          : accent
            ? "border-primary/40 text-primary hover:border-primary hover:text-primary"
            : "border-border/80 bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ChipRails() {
  const ticker = useCockpit((s) => s.ticker);
  const strategyId = useCockpit((s) => s.strategyId);
  const view = useCockpit((s) => s.view);
  const setTicker = useCockpit((s) => s.setTicker);
  const setStrategy = useCockpit((s) => s.setStrategy);
  const setView = useCockpit((s) => s.setView);
  const setOverlay = useCockpit((s) => s.setOverlay);
  const mobilePanel = useCockpit((s) => s.mobilePanel);
  const setMobilePanel = useCockpit((s) => s.setMobilePanel);
  const { snapshot } = useSnapshot(ticker);

  return (
    <div className="pointer-events-auto flex select-none flex-col gap-1.5">
      {/* strategies */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {STRATEGIES.map((s) => (
          <Chip
            key={s.id}
            active={view !== "history" && s.id === strategyId}
            onClick={() => setStrategy(s.id, snapshot)}
            title={s.tagline}
          >
            <span className="mr-1 inline-block translate-y-px" style={{ color: OUTLOOK_COLOR[s.outlook] }}>
              {OUTLOOK_ICON[s.outlook]}
            </span>
            {s.name}
          </Chip>
        ))}
      </div>
      {/* tickers + views + tour */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
        {manifest.map((m) => (
          <Chip key={m.symbol} active={m.symbol === ticker} onClick={() => setTicker(m.symbol)} title={m.name}>
            {m.symbol}
          </Chip>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
        {(["history", "payoff", "map"] as ViewMode[]).map((v) => (
          <Chip key={v} active={view === v} onClick={() => setView(v)} title={`${v} view (${v[0]})`}>
            {v}
          </Chip>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
        <Chip accent onClick={() => setOverlay("tours")} title="Guided tours — learn by flying (t)">
          ✦ tour
        </Chip>
        <span className="lg:hidden">
          <Chip
            active={mobilePanel}
            onClick={() => setMobilePanel(!mobilePanel)}
            title="Dials and stats"
          >
            dials
          </Chip>
        </span>
      </div>
    </div>
  );
}
