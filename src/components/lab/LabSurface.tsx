"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heatmap, HeatmapLegend } from "./Heatmap";
import type { LabLeg } from "@/lib/options/strategies";
import type { Snapshot } from "@/lib/data/types";

const PayoffTerrain = dynamic(() => import("@/components/three/PayoffTerrain"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="hud">loading terrain…</span>
    </div>
  ),
});

interface Props {
  snapshot: Snapshot;
  legs: LabLeg[];
  dte: number;
  ivScale: number;
  elapsedDays: number;
  whatIfPrice: number | null;
  onPick: (price: number, day: number) => void;
}

/** The scenario map in two projections: the orbitable 3D terrain and
 *  the flat heatmap. Same engine, same ramp — pick your camera. */
export function LabSurface(props: Props) {
  return (
    <Tabs defaultValue="terrain" className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-secondary-foreground">
            Every price, every day
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your P/L across the whole map — profit rises, loss sinks. Click anywhere on it to
            set the dials to that scenario.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HeatmapLegend />
          <TabsList className="h-8">
            <TabsTrigger value="terrain" className="hud !text-[9.5px] data-[state=active]:text-foreground">
              Terrain
            </TabsTrigger>
            <TabsTrigger value="map" className="hud !text-[9.5px] data-[state=active]:text-foreground">
              Map
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="terrain">
        <div className="relative h-[440px] w-full overflow-hidden rounded-lg">
          <PayoffTerrain
            legs={props.legs}
            ctx={{ r: props.snapshot.riskFreeRate, q: props.snapshot.divYield }}
            spot={props.snapshot.spot}
            iv={props.snapshot.iv30 ?? 0.3}
            dte={props.dte}
            ivScale={props.ivScale}
            elapsedDays={props.elapsedDays}
            whatIfPrice={props.whatIfPrice ?? props.snapshot.spot}
            onPick={props.onPick}
          />
          <div className="hud pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
            drag to orbit · scroll to zoom · click the surface to set the dials
          </div>
        </div>
      </TabsContent>
      <TabsContent value="map">
        <Heatmap
          snapshot={props.snapshot}
          legs={props.legs}
          dte={props.dte}
          ivScale={props.ivScale}
          elapsedDays={props.elapsedDays}
          whatIfPrice={props.whatIfPrice}
          onPick={props.onPick}
        />
      </TabsContent>
    </Tabs>
  );
}
