"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { HeroPayoff } from "./HeroPayoff";
import type { Leg } from "@/lib/options/types";

/** Landing hero: a slowly orbiting iron-condor terrain floating in the
 *  starfield. Falls back to the 2D SVG while loading or without WebGL. */

const PayoffTerrain = dynamic(() => import("@/components/three/PayoffTerrain"), {
  ssr: false,
  loading: () => <HeroPayoff />,
});

// Synthetic round-number condor: the same shape the lessons teach.
const CONDOR: Leg[] = [
  { kind: "put", side: 1, qty: 1, strike: 88, entryPrice: 0.9, iv: 0.3, dte: 30 },
  { kind: "put", side: -1, qty: 1, strike: 94, entryPrice: 2.1, iv: 0.29, dte: 30 },
  { kind: "call", side: -1, qty: 1, strike: 106, entryPrice: 2.1, iv: 0.29, dte: 30 },
  { kind: "call", side: 1, qty: 1, strike: 112, entryPrice: 0.9, iv: 0.3, dte: 30 },
];

export function HeroTerrain() {
  const [live, setLive] = React.useState(false);
  return (
    <div className="relative h-[340px] w-full max-w-xl" aria-hidden>
      {/* static condor stays until WebGL proves it's rendering */}
      {!live && (
        <div className="absolute inset-0 flex items-center justify-center">
          <HeroPayoff />
        </div>
      )}
      <PayoffTerrain
        hero
        legs={CONDOR}
        ctx={{ r: 0.04, q: 0 }}
        spot={100}
        iv={0.3}
        dte={30}
        className="h-full w-full"
        onFirstFrame={() => setLive(true)}
      />
    </div>
  );
}
