"use client";

import { useCockpit, type TourRef } from "@/lib/cockpit/store";
import { tourById } from "./tours";
import type { TourTarget } from "./scene";

/** The control the active tour step is talking about — derived from the
 *  tour itself, so it can never point at the wrong thing. */
export function targetOf(tour: TourRef | null): TourTarget | null {
  if (!tour) return null;
  return tourById.get(tour.id)?.steps[tour.step]?.target ?? null;
}

/** Is this HUD element the active step's target? A boolean selector, so
 *  a wrapped element re-renders only when its own spotlight flips. */
export function useTourTarget(id: TourTarget): boolean {
  return useCockpit((s) => targetOf(s.tour) === id);
}
