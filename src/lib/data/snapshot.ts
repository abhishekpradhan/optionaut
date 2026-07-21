"use client";

import { useEffect, useState } from "react";
import type { Snapshot, OptionQuote } from "./types";

const cache = new Map<string, Promise<Snapshot>>();

export function fetchSnapshot(symbol: string): Promise<Snapshot> {
  const key = symbol.toUpperCase();
  if (!cache.has(key)) {
    const p = fetch(`/snapshots/${key}.json`).then((res) => {
      if (!res.ok) {
        cache.delete(key);
        throw new Error(`No snapshot for ${key}`);
      }
      return res.json() as Promise<Snapshot>;
    });
    cache.set(key, p);
  }
  return cache.get(key)!;
}

export function useSnapshot(symbol: string): {
  snapshot: Snapshot | null;
  error: string | null;
} {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setSnapshot(null);
    setError(null);
    fetchSnapshot(symbol)
      .then((s) => alive && setSnapshot(s))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [symbol]);
  return { snapshot, error };
}

/** Midpoint of bid/ask, falling back to last trade. */
export function midPrice(q: OptionQuote | undefined): number | null {
  if (!q) return null;
  if (q.b != null && q.a != null && q.a > 0) return (q.b + q.a) / 2;
  return q.l ?? null;
}
