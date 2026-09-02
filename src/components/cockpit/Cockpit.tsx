"use client";

import * as React from "react";
import { useCockpit, type ViewMode, type OverlayKind, type TourRef } from "@/lib/cockpit/store";
import { useSnapshot } from "@/lib/data/snapshot";
import manifest from "@/data/manifest.json";
import {
  strategyById,
  buildPosition,
  defaultExpIndex,
  strikeCandidates,
} from "@/lib/options/strategies";
import { parseShareParams, deviationParams } from "@/lib/cockpit/shareUrl";
import { payoffPriceDomain } from "@/lib/viz/domain";
import type { OptionKind } from "@/lib/options/types";
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
import { MobileGate } from "./MobileGate";

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

  const { snapshot, error } = useSnapshot(ticker);
  const def = strategyById(strategyId);

  const legs = React.useMemo(
    () => (snapshot && def ? buildPosition(def, snapshot, expIndex, overrides) : []),
    [snapshot, def, expIndex, overrides],
  );
  const exp = snapshot?.expirations[Math.min(expIndex, (snapshot?.expirations.length ?? 1) - 1)];
  const dte = exp?.dte ?? 30;

  // When a snapshot arrives (first load / ticker change), settle on the
  // strategy's pedagogical default expiry — unless the URL carried a
  // shared setup, which is restored wholesale exactly once.
  const symbol = snapshot?.symbol;
  // Read the share params during the first client render (state
  // initializers may touch window; refs may not) — the quiet URL sync
  // below rewrites the address before any effect could read it.
  const [sharedInit] = React.useState(() =>
    typeof window === "undefined" ? null : parseShareParams(window.location.search),
  );
  const sharedConsumed = React.useRef(false);
  React.useEffect(() => {
    if (!snapshot) return;
    const s = useCockpit.getState();
    const d = strategyById(s.strategyId);
    if (!d) return;
    // During a tour, the tour's own step setups drive the expiry —
    // don't fight them when a ticker switch lands its snapshot.
    if (s.tour) return;
    const shared = sharedConsumed.current ? null : sharedInit;
    sharedConsumed.current = true;
    const defIdx = defaultExpIndex(snapshot, d);
    if (!shared) {
      if (s.expIndex !== defIdx) setExpIndex(defIdx);
      return;
    }

    // expiry: nearest dte survives the monthly calendar regeneration
    let expIdx = defIdx;
    if (shared.e != null) {
      snapshot.expirations.forEach((e, idx) => {
        if (Math.abs(e.dte - shared.e!) < Math.abs(snapshot.expirations[expIdx].dte - shared.e!)) {
          expIdx = idx;
        }
      });
    }
    const exp = snapshot.expirations[expIdx];

    // strikes: positional in strikeOrder, snapped to this chain's candidates
    const overrides: Record<string, number> = {};
    if (shared.k && exp) {
      d.strikeOrder.forEach((role, idx) => {
        const raw = shared.k![idx];
        if (raw == null) return;
        const tmpl = d.legs.find((l) => (l.role === "atmPut" ? "atm" : l.role) === role);
        if (!tmpl || tmpl.kind === "stock") return;
        const ks = strikeCandidates(exp, tmpl.kind as OptionKind);
        if (!ks.length) return;
        overrides[role] = ks.reduce((p, c) => (Math.abs(c - raw) < Math.abs(p - raw) ? c : p));
      });
    }

    // dials, clamped to what the controls can actually reach
    const legs = buildPosition(d, snapshot, expIdx, overrides);
    const dom = payoffPriceDomain(
      snapshot.spot,
      snapshot.iv30 ?? 0.3,
      exp?.dte ?? 30,
      legs.map((l) => l.strike).filter((k) => k > 0),
      1,
    );
    useCockpit.getState().hydrateShared({
      expIndex: expIdx,
      overrides,
      whatIfPrice:
        shared.p != null ? Math.min(Math.max(shared.p, dom.lo), dom.hi) : null,
      elapsedDays:
        shared.d != null ? Math.min(Math.max(Math.round(shared.d), 0), exp?.dte ?? 0) : 0,
      ivScale: shared.v != null ? Math.min(Math.max(shared.v, 0.5), 1.8) : 1,
      view: shared.map ? "map" : s.view,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ——— quiet URL sync ———
  // The path names the flight; query params carry only what deviates from
  // defaults, so a refresh (or copied address) keeps your exact tweaks.
  const whatIfPrice = useCockpit((s) => s.whatIfPrice);
  const elapsedDays = useCockpit((s) => s.elapsedDays);
  const ivScale = useCockpit((s) => s.ivScale);
  React.useEffect(() => {
    const path = view === "history" ? `/t/${ticker}` : `/lab/${ticker}/${strategyId}`;
    let qs = "";
    if (view !== "history" && snapshot && def && snapshot.symbol === ticker) {
      qs = deviationParams({
        def,
        snapshot,
        expIndex,
        expiryIsDefault: expIndex === defaultExpIndex(snapshot, def),
        overrides,
        legs,
        whatIfPrice,
        elapsedDays,
        ivScale,
        view,
      }).toString();
    }
    const url = `${path}${qs ? `?${qs}` : ""}`;
    if (window.location.pathname + window.location.search !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [ticker, strategyId, view, snapshot, def, expIndex, overrides, legs, whatIfPrice, elapsedDays, ivScale]);

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
      // While a sheet is open, only escape and the sheet toggles work —
      // the stage shouldn't change under a modal.
      if (s.overlay && !["Escape", "t", "g", "i", "s", "?"].includes(e.key)) return;
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
        case "s": setOverlay(s.overlay === "sizing" ? null : "sizing"); return;
        case "?": setOverlay(s.overlay === "help" ? null : "help"); return;
        case "r": resetDials(); return;
        case "ArrowLeft":
        case "ArrowRight": {
          if (!e.shiftKey) return;
          e.preventDefault();
          const list = manifest.map((m) => m.symbol);
          const i = Math.max(list.indexOf(s.ticker), 0);
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
      const m = window.location.pathname.match(/^\/(t|lab)\/([A-Z0-9.]+)(?:\/([a-z-]+))?/);
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
        {/* safe-centered: centered when it fits, top-aligned when the
            viewport is short — plain justify-center overflows both ways
            and pushes the expiry pills up under the HUD */}
        {snapshot && (
          <aside className="hidden min-h-0 w-60 shrink-0 flex-col justify-center-safe gap-5 overflow-y-auto pr-1 lg:flex">
            {view !== "history" && <DialStack snapshot={snapshot} legs={legs} dte={dte} />}
            <StatStack snapshot={snapshot} legs={legs} dte={dte} />
          </aside>
        )}
      </div>

      {/* bottom: readout + rails (safe-area aware for notched phones) */}
      <div className="flex flex-col gap-2.5 px-4 pt-1 sm:px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Readout snapshot={snapshot} legs={legs} dte={dte} />
        <ChipRails />
      </div>

      {!snapshot &&
        (error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="panel stage-enter flex max-w-sm flex-col items-center gap-3 p-6 text-center">
              <div className="hud !text-[9.5px] text-primary">unknown callsign</div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                No data for{" "}
                <span className="figures font-semibold text-foreground">{ticker}</span>. The
                hangar stocks six simulated securities — for a real one, bring your own
                numbers.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOverlay("custom")}
                  className="hud rounded-md border border-primary/60 bg-accent px-3 py-1.5 !text-[9.5px] transition-colors hover:border-primary"
                >
                  + add your data
                </button>
                <button
                  onClick={() => setTicker(manifest[0].symbol)}
                  className="hud rounded-md border border-border px-3 py-1.5 !text-[9.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  fly {manifest[0].symbol}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hud absolute inset-0 flex items-center justify-center">
            loading snapshot…
          </div>
        ))}

      {/* small screens: the dials live in a slide-up sheet */}
      {snapshot && (
        <MobilePanel snapshot={snapshot} legs={legs} dte={dte} view={view} />
      )}

      <IntroLine />
      <Overlays snapshot={snapshot} />
      {tour && <TourMode snapshot={snapshot} />}
      <MobileGate />
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
          <button
            onClick={() => {
              setOpen(false);
              useCockpit.getState().setOverlay("help");
            }}
            className="hud flex items-center justify-center gap-1.5 rounded-md border border-border py-2 !text-[9.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            controls &amp; help
          </button>
        </div>
      </div>
    </div>
  );
}
