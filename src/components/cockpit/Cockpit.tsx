"use client";

import * as React from "react";
import { useCockpit, type ViewMode, type OverlayKind, type TourRef } from "@/lib/cockpit/store";
import { useSnapshot } from "@/lib/data/snapshot";
import { strategyById, buildPosition, defaultExpIndex } from "@/lib/options/strategies";
import { ContextBar } from "./hud/ContextBar";
import { HintsBar } from "./hud/HintsBar";
import { Readout } from "./hud/Readout";
import { ChipRails } from "./hud/ChipRails";
import { DialStack } from "./hud/DialStack";
import { StatStack } from "./hud/StatStack";
import { Stage } from "./Stage";
import { Overlays } from "./overlays/Overlays";
import { TourMode } from "./tour/TourMode";
import { IntroLine } from "./IntroLine";

export interface CockpitInitial {
  ticker?: string;
  strategyId?: string;
  view?: ViewMode;
  overlay?: OverlayKind;
  tour?: TourRef | null;
}

/** The one instrument (PLAN.md D8): a full-viewport stage with HUD at
 *  the edges. No document scroll, ever — navigation is the scene
 *  changing under you. */
export function Cockpit({ initial }: { initial?: CockpitInitial }) {
  const init = useCockpit((s) => s.init);
  const [seeded, setSeeded] = React.useState(false);
  if (!seeded) {
    init(initial ?? {});
    setSeeded(true);
  }

  const ticker = useCockpit((s) => s.ticker);
  const strategyId = useCockpit((s) => s.strategyId);
  const view = useCockpit((s) => s.view);
  const expIndex = useCockpit((s) => s.expIndex);
  const overrides = useCockpit((s) => s.overrides);
  const tour = useCockpit((s) => s.tour);
  const setView = useCockpit((s) => s.setView);
  const setExpIndex = useCockpit((s) => s.setExpIndex);
  const setTicker = useCockpit((s) => s.setTicker);
  const setOverlay = useCockpit((s) => s.setOverlay);
  const setTour = useCockpit((s) => s.setTour);
  const resetDials = useCockpit((s) => s.resetDials);

  const { snapshot } = useSnapshot(ticker);
  const def = strategyById(strategyId);

  const legs = React.useMemo(
    () => (snapshot && def ? buildPosition(def, snapshot, expIndex, overrides) : []),
    [snapshot, def, expIndex, overrides],
  );
  const exp = snapshot?.expirations[Math.min(expIndex, (snapshot?.expirations.length ?? 1) - 1)];
  const dte = exp?.dte ?? 30;

  // When a snapshot arrives (first load / ticker change), settle on the
  // strategy's pedagogical default expiry. Manual picks stick afterwards.
  const symbol = snapshot?.symbol;
  React.useEffect(() => {
    if (!snapshot) return;
    const s = useCockpit.getState();
    const d = strategyById(s.strategyId);
    if (!d) return;
    const i = defaultExpIndex(snapshot, d);
    if (s.expIndex !== i) setExpIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ——— quiet URL sync ———
  React.useEffect(() => {
    const path = view === "history" ? `/t/${ticker}` : `/lab/${ticker}/${strategyId}`;
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path);
    }
  }, [ticker, strategyId, view]);

  // ——— keyboard map ———
  const snapshotRef = React.useRef(snapshot);
  React.useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable], [role=slider]")) return;
      const s = useCockpit.getState();
      switch (e.key) {
        case "Escape":
          if (s.tour) setTour(null);
          else if (s.overlay) setOverlay(null);
          return;
        case "h": setView("history"); return;
        case "p": setView("payoff"); return;
        case "m": setView("map"); return;
        case "[": setExpIndex(Math.max(s.expIndex - 1, 0)); return;
        case "]": {
          const max = (snapshotRef.current?.expirations.length ?? 1) - 1;
          setExpIndex(Math.min(s.expIndex + 1, max));
          return;
        }
        case "t": setOverlay(s.overlay === "tours" ? null : "tours"); return;
        case "g": setOverlay(s.overlay === "glossary" ? null : "glossary"); return;
        case "i": setOverlay(s.overlay === "guide" ? null : "guide"); return;
        case "?": setOverlay(s.overlay === "help" ? null : "help"); return;
        case "r": resetDials(); return;
        case "ArrowLeft":
        case "ArrowRight": {
          if (!e.shiftKey) return;
          e.preventDefault();
          const list = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "AMD", "DIS", "SPY", "QQQ"];
          const i = list.indexOf(s.ticker);
          const next = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length];
          setTicker(next);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setView, setExpIndex, setTicker, setOverlay, setTour, resetDials]);

  // ——— back/forward support ———
  React.useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/(t|lab)\/([A-Z]+)(?:\/([a-z-]+))?/);
      if (!m) return;
      const st = useCockpit.getState();
      if (m[2] !== st.ticker) st.setTicker(m[2]);
      if (m[1] === "t") st.setView("history");
      else if (m[3] && m[3] !== st.strategyId) st.setStrategy(m[3], null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* top row */}
      <div className="flex items-start justify-between gap-4 px-4 pt-3 sm:px-5">
        <ContextBar snapshot={snapshot} />
        <HintsBar snapshot={snapshot} />
      </div>

      {/* middle: stage + right stack */}
      <div className="flex min-h-0 flex-1 gap-2 px-2 pt-1 sm:px-4">
        {snapshot ? (
          <Stage snapshot={snapshot} legs={legs} dte={dte} />
        ) : (
          <div className="flex-1" />
        )}
        {snapshot && (
          <aside className="hidden w-60 shrink-0 flex-col justify-center gap-6 pr-1 lg:flex">
            {view !== "history" && <DialStack snapshot={snapshot} legs={legs} dte={dte} />}
            <StatStack snapshot={snapshot} legs={legs} dte={dte} />
          </aside>
        )}
      </div>

      {/* bottom: readout + rails */}
      <div className="flex flex-col gap-2.5 px-4 pb-3 pt-1 sm:px-5">
        <Readout snapshot={snapshot} legs={legs} dte={dte} />
        <ChipRails />
      </div>

      {!snapshot && (
        <div className="hud absolute inset-0 flex items-center justify-center">
          loading snapshot…
        </div>
      )}

      {/* small screens: the dials live in a slide-up sheet */}
      {snapshot && (
        <MobilePanel snapshot={snapshot} legs={legs} dte={dte} view={view} />
      )}

      <IntroLine />
      <Overlays snapshot={snapshot} />
      {tour && <TourMode snapshot={snapshot} />}
    </div>
  );
}

function MobilePanel({
  snapshot,
  legs,
  dte,
  view,
}: {
  snapshot: NonNullable<ReturnType<typeof useSnapshot>["snapshot"]>;
  legs: ReturnType<typeof buildPosition>;
  dte: number;
  view: ViewMode;
}) {
  const open = useCockpit((s) => s.mobilePanel);
  const setOpen = useCockpit((s) => s.setMobilePanel);
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-background/50 lg:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="panel stage-enter mx-2 mb-24 max-h-[62vh] w-full overflow-y-auto p-4">
        <div className="flex flex-col gap-5">
          {view !== "history" && <DialStack snapshot={snapshot} legs={legs} dte={dte} />}
          <StatStack snapshot={snapshot} legs={legs} dte={dte} />
        </div>
      </div>
    </div>
  );
}
