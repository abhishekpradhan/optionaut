import Link from "next/link";
import manifest from "@/data/manifest.json";
import { fmtUsd, fmtPct } from "@/lib/format";
import { HeroPayoff } from "@/components/shared/HeroPayoff";
import { MousePointerClick, SlidersHorizontal, Sigma } from "lucide-react";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      {/* hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Free · No signup · Educational
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            See what a trade <span className="text-primary">really does.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-muted-foreground">
            Pick a stock. Explore everything you could do with it — buying shares, calls,
            spreads, iron condors — by dragging strikes, fast-forwarding time, and crushing
            volatility while the profit picture responds. The jargon arrives only after
            you&apos;ve felt what it names.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/t/AAPL"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start with a stock
            </Link>
            <Link
              href="/learn"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              I&apos;m brand new — teach me
            </Link>
          </div>
        </div>
        <div className="hidden justify-center lg:flex">
          <HeroPayoff />
        </div>
      </section>

      {/* how it works */}
      <section className="border-y border-border bg-panel/40">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: <MousePointerClick className="size-4" aria-hidden />,
              title: "Pick a security",
              body: "Real snapshot chains for ten familiar names — and the range the options market is pricing, drawn right on the chart.",
            },
            {
              icon: <SlidersHorizontal className="size-4" aria-hidden />,
              title: "Twist the dials",
              body: "Price, time, volatility. Drag strikes on the diagram, click the heatmap, watch every number recompute instantly.",
            },
            {
              icon: <Sigma className="size-4" aria-hidden />,
              title: "Name the forces",
              body: "Delta, theta, vega — revealed as the dials you already used. Every term explained where it appears, every time.",
            },
          ].map((s, i) => (
            <div key={s.title} className="flex gap-3">
              <span className="figures mt-0.5 text-lg font-semibold text-muted-foreground/60">
                {i + 1}
              </span>
              <div>
                <h2 className="flex items-center gap-2 text-[14.5px] font-semibold tracking-tight">
                  <span className="text-primary">{s.icon}</span>
                  {s.title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* tickers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">Pick a stock</h2>
          <span className="text-xs text-muted-foreground">
            delayed snapshot · IV = 30-day implied volatility
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
      </section>

      {/* learn teaser */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Link
          href="/learn"
          className="panel group flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-primary/40"
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Completely new to this? Take the path.
            </h2>
            <p className="mt-1 max-w-xl text-[13.5px] text-muted-foreground">
              Ten short units from &quot;what is a share&quot; to iron condors — every concept
              taught by dragging it, with predictions before reveals and zero unexplained jargon.
            </p>
          </div>
          <span className="text-sm font-medium text-primary">
            Start unit 1 <span aria-hidden>→</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
