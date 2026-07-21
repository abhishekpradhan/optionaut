import Link from "next/link";
import type { Metadata } from "next";
import { UNITS } from "@/lib/learn/units";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "A ten-step path from 'what is a share' to iron condors — every concept taught by dragging it. Free and educational.",
};

export default function LearnIndex() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The path</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Zero to iron condor, one dial at a time
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Ten short units in a deliberate order — each one only uses ideas the ones before it
        taught. Read the words, drag the widgets, predict before you check. Units 7–9 hand you
        to the Lab, where the strategies teach themselves on real prices.
      </p>

      <ol className="mt-10 space-y-2.5">
        {UNITS.map((u) => (
          <li key={u.slug}>
            <Link
              href={u.kind === "lab" ? u.href! : `/learn/${u.slug}`}
              className="panel group flex items-center gap-4 px-4 py-3.5 transition-colors hover:border-primary/40"
            >
              <span className="figures w-7 shrink-0 text-right text-lg font-semibold text-muted-foreground/70">
                {u.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold tracking-tight">
                  {u.title}
                  {u.kind === "lab" && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                      in the Lab
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                  {u.tagline}
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-12 border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Educational only — not investment advice.
      </p>
    </main>
  );
}
