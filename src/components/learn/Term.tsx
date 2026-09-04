"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { glossaryById } from "@/lib/learn/glossary";
import { useCockpit } from "@/lib/cockpit/store";

/**
 * Inline jargon firewall: wraps a term with a tappable dotted underline
 * that opens a plain-English definition. Never gates reading — the
 * sentence must work without opening it.
 */
export function Term({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  // When the glossary sheet takes over, the popover must not hand focus
  // back to its trigger behind the modal.
  const jumpingRef = React.useRef(false);
  const openGlossaryAt = useCockpit((s) => s.openGlossaryAt);
  const entry = glossaryById.get(id);
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`<Term id="${id}"> has no glossary entry`);
    }
    return <>{children ?? id}</>;
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) jumpingRef.current = false;
        setOpen(next);
      }}
    >
      <PopoverTrigger className="inline cursor-help rounded-sm text-inherit underline decoration-[var(--flat)] decoration-dotted underline-offset-[3px] transition-colors hover:decoration-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {children ?? entry.term}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-72 border-border bg-popover p-3.5"
        finalFocus={() => !jumpingRef.current}
      >
        <div className="text-[13px] font-semibold text-foreground">{entry.term}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{entry.short}</p>
        <button
          onClick={() => {
            // the sheet takes over; a popover floating above it is noise
            jumpingRef.current = true;
            setOpen(false);
            openGlossaryAt(entry.id);
          }}
          className="mt-2 inline-block text-[11.5px] text-primary hover:underline"
        >
          glossary →
        </button>
      </PopoverContent>
    </Popover>
  );
}
