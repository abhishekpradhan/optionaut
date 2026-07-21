"use client";

import * as React from "react";
import type { Snapshot } from "./types";

/**
 * The user's own securities — quick-builds and uploads. Stored ONLY in
 * this browser (localStorage): sharing uploaded market data through our
 * servers would make Optionaut a data redistributor, which is exactly
 * the licensing trap the simulated market exists to avoid (PLAN.md D11).
 */

const KEY = "opt-custom-markets";
export const CUSTOM_LIMIT = 4;
const EVENT = "opt-custom-changed";

export function listCustomMarkets(): Snapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Snapshot[]) : [];
    return Array.isArray(arr) ? arr.filter((s) => s && s.symbol && s.expirations) : [];
  } catch {
    return [];
  }
}

export function getCustomMarket(symbol: string): Snapshot | null {
  return listCustomMarkets().find((s) => s.symbol === symbol.toUpperCase()) ?? null;
}

export function saveCustomMarket(snap: Snapshot): { ok: true } | { ok: false; error: string } {
  const list = listCustomMarkets().filter((s) => s.symbol !== snap.symbol);
  if (list.length >= CUSTOM_LIMIT) {
    return { ok: false, error: `Limit of ${CUSTOM_LIMIT} saved securities — delete one first.` };
  }
  list.push(snap);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    return { ok: false, error: "This browser's storage is full — delete a saved security." };
  }
  window.dispatchEvent(new Event(EVENT));
  return { ok: true };
}

export function deleteCustomMarket(symbol: string): void {
  const list = listCustomMarkets().filter((s) => s.symbol !== symbol);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

/** Live list for React — re-renders on any save/delete. */
export function useCustomMarkets(): Snapshot[] {
  const subscribe = React.useCallback((cb: () => void) => {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener("storage", cb);
    };
  }, []);
  const getSnapshotFn = React.useCallback(() => {
    return typeof window === "undefined" ? "[]" : localStorage.getItem(KEY) ?? "[]";
  }, []);
  const raw = React.useSyncExternalStore(subscribe, getSnapshotFn, () => "[]");
  return React.useMemo(() => {
    try {
      const arr = JSON.parse(raw) as Snapshot[];
      return Array.isArray(arr) ? arr.filter((s) => s && s.symbol && s.expirations) : [];
    } catch {
      return [];
    }
  }, [raw]);
}
