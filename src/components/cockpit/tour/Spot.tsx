"use client";

import * as React from "react";
import { useTourTarget } from "./target";
import type { TourTarget } from "./scene";

/** Wraps a HUD element a tour step can point at. Layout-neutral: it
 *  sets no display of its own (the caller keeps owning that) and the
 *  ring is an outline plus a glow, both ink — nothing shifts, nothing
 *  scrolls. Lit only while the active step names this target. */
export function Spot({
  id,
  className = "",
  inline = false,
  children,
}: {
  id: TourTarget;
  className?: string;
  /** render a span (for a control that sits in a line of others) */
  inline?: boolean;
  children: React.ReactNode;
}) {
  const on = useTourTarget(id);
  const Tag = inline ? "span" : "div";
  return (
    <Tag data-tour-target={id} className={`rounded-md ${on ? "tour-spot" : ""} ${className}`}>
      {children}
    </Tag>
  );
}
