import Link from "next/link";
import manifest from "@/data/manifest.json";
import { fmtUsd, fmtPct } from "@/lib/format";

// Temporary hub while the Lab is the only surface — the real landing page
// arrives in M4 (PLAN.md §9).
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Options Lab · working build
      </p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        See what a trade <span className="text-primary">really does</span>.
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Pick a stock, open the Strategy Lab, and touch the ideas: drag strikes, fast-forward
        time, crush volatility — and watch the profit curve respond. Free, educational, and
        deliberately not a brokerage.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {manifest.map((m) => {
          const up = m.changePct >= 0;
          return (
            <Link
              key={m.symbol}
              href={`/t/${m.symbol}`}
              className="panel group p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold tracking-tight">{m.symbol}</span>
                <span className={`figures text-xs ${up ? "text-gain" : "text-loss"}`}>
                  {up ? "▲" : "▼"} {Math.abs(m.changePct).toFixed(1)}%
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.name}</div>
              <div className="figures mt-3 text-lg font-semibold">{fmtUsd(m.spot)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                IV {m.iv30 ? fmtPct(m.iv30, 0) : "—"}
              </div>
              <div className="mt-3 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Explore →
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-14 border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Educational only — not investment advice. Prices are a delayed snapshot, not live markets.
      </p>
    </main>
  );
}
