"use client";

import * as React from "react";
import Link from "next/link";
import { GLOSSARY } from "@/lib/learn/glossary";
import { UNITS } from "@/lib/learn/units";
import { Search } from "lucide-react";

export default function GlossaryPage() {
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const entries = needle
    ? GLOSSARY.filter(
        (g) =>
          g.term.toLowerCase().includes(needle) || g.short.toLowerCase().includes(needle),
      )
    : GLOSSARY;

  const byUnit = new Map<number, typeof GLOSSARY>();
  for (const e of entries) {
    if (!byUnit.has(e.unit)) byUnit.set(e.unit, []);
    byUnit.get(e.unit)!.push(e);
  }
  const unitTitle = (n: number) => UNITS.find((u) => u.n === n)?.title ?? `Unit ${n}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
      <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground">
        Every term in the app, in plain English, grouped by the{" "}
        <Link href="/learn" className="text-primary hover:underline">
          learning path
        </Link>{" "}
        unit that introduces it.
      </p>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms…"
          aria-label="Search glossary"
          className="w-full rounded-lg border border-input bg-panel py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      {[...byUnit.keys()].sort((a, b) => a - b).map((unit) => (
        <section key={unit} className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Unit {unit} · {unitTitle(unit)}
          </h2>
          <dl className="space-y-3">
            {byUnit.get(unit)!.map((e) => (
              <div key={e.id} id={e.id} className="panel scroll-mt-20 px-4 py-3.5">
                <dt className="font-semibold tracking-tight">{e.term}</dt>
                <dd className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  {e.short}
                  {e.deep && (
                    <span className="mt-1.5 block text-[12.5px] text-muted-foreground/80">
                      {e.deep}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {entries.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          Nothing matches &quot;{q}&quot; — try a shorter fragment.
        </p>
      )}
    </main>
  );
}
