"use client";

import * as React from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { glossaryById } from "@/lib/learn/glossary";

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
  const entry = glossaryById.get(id);
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`<Term id="${id}"> has no glossary entry`);
    }
    return <>{children ?? id}</>;
  }
  return (
    <Popover>
      <PopoverTrigger className="inline cursor-help rounded-sm text-inherit underline decoration-[var(--flat)] decoration-dotted underline-offset-[3px] transition-colors hover:decoration-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        {children ?? entry.term}
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 border-border bg-popover p-3.5">
        <div className="text-[13px] font-semibold text-foreground">{entry.term}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{entry.short}</p>
        <Link
          href={`/glossary#${entry.id}`}
          className="mt-2 inline-block text-[11.5px] text-primary hover:underline"
        >
          glossary →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
