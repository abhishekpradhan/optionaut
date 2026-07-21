"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { strategyById } from "@/lib/options/strategies";
import { STRATEGY_GUIDES } from "@/lib/learn/strategyGuides";
import { GLOSSARY } from "@/lib/learn/glossary";
import { TOURS } from "../tour/tours";
import type { Snapshot } from "@/lib/data/types";
import { fmtDateLong } from "@/lib/format";
import { X, AlertTriangle, Search, Play } from "lucide-react";

/** Glass sheets summoned over the scene. One at a time; ESC or the
 *  backdrop dismisses (ESC handled by the cockpit's keymap). */
export function Overlays({ snapshot }: { snapshot: Snapshot | null }) {
  const overlay = useCockpit((s) => s.overlay);
  const setOverlay = useCockpit((s) => s.setOverlay);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (overlay) closeRef.current?.focus();
  }, [overlay]);
  if (!overlay) return null;

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOverlay(null);
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="panel stage-enter relative flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden">
        <button
          ref={closeRef}
          onClick={() => setOverlay(null)}
          className="absolute right-3 top-3 z-10 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close (esc)"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="overflow-y-auto p-6">
          {overlay === "guide" && <GuideSheet />}
          {overlay === "glossary" && <GlossarySheet />}
          {overlay === "about" && <AboutSheet snapshot={snapshot} />}
          {overlay === "help" && <HelpSheet />}
          {overlay === "tours" && <ToursSheet />}
        </div>
      </div>
    </div>
  );
}

function SheetTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="hud !text-[9.5px] text-primary">{kicker}</div>
      <h2 className="mt-1 text-xl font-bold tracking-tight">{children}</h2>
    </div>
  );
}

function GuideSheet() {
  const strategyId = useCockpit((s) => s.strategyId);
  const def = strategyById(strategyId);
  const guide = STRATEGY_GUIDES[strategyId];
  if (!def || !guide) return null;
  return (
    <>
      <SheetTitle kicker="how this works">{def.name}</SheetTitle>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">{guide.idea}</p>
      <h3 className="hud mt-5 !text-[9.5px]">reading the shape</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{guide.diagram}</p>
      <h3 className="mt-5 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
        <AlertTriangle className="size-4" style={{ color: "var(--warn)" }} aria-hidden />
        What can bite
      </h3>
      <ul className="mt-2 space-y-2.5">
        {guide.gotchas.map((g) => (
          <li key={g.title} className="text-[13px] leading-relaxed">
            <span className="font-medium text-secondary-foreground">{g.title}.</span>{" "}
            <span className="text-muted-foreground">{g.body}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function GlossarySheet() {
  const [q, setQ] = React.useState("");
  const focusTerm = useCockpit((s) => s.glossaryTerm);
  React.useEffect(() => {
    if (!focusTerm) return;
    // let the sheet paint, then bring the term into view
    const t = setTimeout(() => {
      document.getElementById(`gl-${focusTerm}`)?.scrollIntoView({ block: "center" });
    }, 60);
    return () => clearTimeout(t);
  }, [focusTerm]);
  const needle = q.trim().toLowerCase();
  const entries = needle
    ? GLOSSARY.filter(
        (g) => g.term.toLowerCase().includes(needle) || g.short.toLowerCase().includes(needle),
      )
    : GLOSSARY;
  return (
    <>
      <SheetTitle kicker="every term, in plain english">Glossary</SheetTitle>
      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          aria-label="Search glossary"
          className="w-full rounded-md border border-input bg-background/60 py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      <dl className="space-y-3">
        {entries.map((e) => (
          <div
            key={e.id}
            id={`gl-${e.id}`}
            className={
              focusTerm === e.id
                ? "rounded-md bg-accent/50 p-2 ring-1 ring-primary/40"
                : undefined
            }
          >
            <dt className="text-[13.5px] font-semibold">{e.term}</dt>
            <dd className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {e.short}
              {e.deep && <span className="mt-1 block text-muted-foreground/75">{e.deep}</span>}
            </dd>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing matches &quot;{q}&quot;.</p>
        )}
      </dl>
    </>
  );
}

function AboutSheet({ snapshot }: { snapshot: Snapshot | null }) {
  return (
    <>
      <SheetTitle kicker="what this is">Optionaut</SheetTitle>
      <div className="space-y-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
        <p>
          A free, no-signup instrument for understanding how trading actually works — from
          buying a share to running an iron condor. Every concept is a dial you move while the
          picture responds. It is deliberately not a brokerage: it connects to nothing,
          executes nothing, and sells nothing. Crashes in here are free.
        </p>
        <p>
          <span className="font-medium text-secondary-foreground">Where the numbers come from.</span>{" "}
          Market data is a snapshot of Cboe&apos;s public delayed quotes
          {snapshot ? ` captured ${fmtDateLong(snapshot.capturedAt.slice(0, 10))}` : ""}, bundled
          with the app — real chains, deliberately frozen, never live, never executable. All
          interactive math is computed in your browser by our own Black-Scholes-Merton engine,
          solved so each entry matches its snapshot mid. Honest idealizations: US equity options
          are American-style while the model is European; entries assume mid fills;
          &quot;win odds&quot; assume prices wander randomly at current implied volatility.
        </p>
        <p>
          <span className="font-medium text-secondary-foreground">Why profit is blue.</span>{" "}
          About 1 in 12 men can&apos;t reliably tell red from green — the exact pair finance
          defaults to. Profit/loss here is a blue↔red pairing validated for common color-vision
          deficiencies, and meaning is never carried by color alone.
        </p>
        <p>
          <span className="font-medium text-secondary-foreground">The fine print, plainly.</span>{" "}
          Options involve a high degree of risk and are not suitable for all investors.
          Optionaut is not an investment advisor, broker, or dealer. Nothing here is investment
          advice, a recommendation, or a solicitation to buy or sell any security. The
          strategies shown can and do lose money — several exist to demonstrate exactly how.
          Before trading for real, read your broker&apos;s{" "}
          <em>Characteristics and Risks of Standardized Options</em> and assume real fills are
          worse than model fills.
        </p>
      </div>
    </>
  );
}

function HelpSheet() {
  const rows: Array<[string, string]> = [
    ["h · p · m", "history / payoff / map view"],
    ["[ · ]", "previous / next expiry"],
    ["shift + ← →", "previous / next ticker"],
    ["drag pills", "move strikes on the payoff view"],
    ["hover / tap map", "inspect · set the dials to a scenario"],
    ["scroll · pinch stage", "zoom the price range"],
    ["r", "reset the dials"],
    ["i", "how this strategy works"],
    ["g", "glossary"],
    ["t", "tours"],
    ["esc", "close overlay / exit tour"],
  ];
  return (
    <>
      <SheetTitle kicker="fly it with the keyboard">Controls</SheetTitle>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-4">
            <dt className="figures w-28 shrink-0 text-[12px] text-primary">{k}</dt>
            <dd className="text-[13px] text-muted-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function ToursSheet() {
  const setTour = useCockpit((s) => s.setTour);
  return (
    <>
      <SheetTitle kicker="learn by flying — the instrument teaches itself">Tours</SheetTitle>
      <ol className="space-y-2">
        {TOURS.map((t, i) => (
          <li key={t.id}>
            <button
              onClick={() => setTour({ id: t.id, step: 0 })}
              className="group flex w-full items-center gap-3 rounded-lg border border-border/70 px-4 py-3 text-left transition-colors hover:border-primary/50"
            >
              <span className="figures w-5 text-right text-base font-semibold text-muted-foreground/60">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-tight">{t.title}</span>
                <span className="block truncate text-[12px] text-muted-foreground">{t.tagline}</span>
              </span>
              <Play className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
        Each tour drives the real instrument with real snapshot prices — captions guide, you fly.
        Ten minutes end to end. Start at 1 if options are new to you.
      </p>
    </>
  );
}
