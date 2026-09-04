"use client";

import { useSyncExternalStore } from "react";

/**
 * Where the learner is in each tour, plus the first-run flags — kept in
 * this browser only. Leaving a tour never loses the place, the tour list
 * can say "resume", and the first-visit offer shows once. Storage can be
 * absent, full, or blocked (sandboxed frames), so every access is guarded
 * and a bad payload degrades to "nothing saved".
 */

export interface TourProgressEntry {
  step: number;
  total: number;
  done: boolean;
}
export type TourProgress = Record<string, TourProgressEntry>;

const KEY = "opt-tour-progress";
const WELCOME_KEY = "opt-welcomed";
const INTRO_KEY = "opt-intro-seen";
const EMPTY: TourProgress = {};
let cache: TourProgress | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): TourProgress {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: TourProgress = {};
    for (const [id, e] of Object.entries(v as Record<string, unknown>)) {
      const x = e as Partial<TourProgressEntry> | null;
      if (x && typeof x === "object" && typeof x.step === "number" && typeof x.total === "number") {
        out[id] = { step: x.step, total: x.total, done: !!x.done };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function load(): TourProgress {
  if (cache) return cache;
  let raw: string | null = null;
  try {
    raw = typeof window === "undefined" ? null : localStorage.getItem(KEY);
  } catch {
    // blocked storage — behave as if nothing was saved
  }
  cache = parse(raw);
  return cache;
}

function save(next: TourProgress) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode, quota — the session still works, it just forgets
  }
  listeners.forEach((l) => l());
}

export function getTourProgress(): TourProgress {
  return load();
}

/** The step to open a tour at: its saved place, unless it is finished. */
export function resumeStep(id: string, total: number): number {
  const p = load()[id];
  return p && !p.done && p.step > 0 && p.step < total ? p.step : 0;
}

/** Records the learner's place. A finished tour stays finished — re-flying
 *  it and leaving early should not demote it to "resume". */
export function markTourStep(id: string, step: number, total: number) {
  const cur = load();
  const prev = cur[id];
  if (prev && prev.step === step && prev.total === total) return;
  save({ ...cur, [id]: { step, total, done: prev?.done ?? false } });
}

export function markTourDone(id: string, total: number) {
  const prev = load()[id];
  if (prev?.done && prev.step === total - 1 && prev.total === total) return;
  save({ ...load(), [id]: { step: total - 1, total, done: true } });
}

function subscribe(l: () => void) {
  listeners.add(l);
  // progress made in another tab lands here too
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTourProgress(): TourProgress {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

// ——— first-run flags ———

function flag(area: "local" | "session", key: string): boolean {
  try {
    return !!(area === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return true; // no storage → never nag
  }
}
function setFlag(area: "local" | "session", key: string) {
  try {
    (area === "local" ? localStorage : sessionStorage).setItem(key, "1");
  } catch {
    // nothing to do
  }
}

/** The first-visit offer ("start the tour / just explore") shows until answered. */
export const isWelcomed = () => flag("local", WELCOME_KEY);
export const setWelcomed = () => setFlag("local", WELCOME_KEY);
/** The quiet invitation line shows once per session. */
export const isIntroSeen = () => flag("session", INTRO_KEY);
export const setIntroSeen = () => setFlag("session", INTRO_KEY);
