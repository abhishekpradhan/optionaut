"use client";

import { useSnapshot } from "@/lib/data/snapshot";
import { TickerHeader } from "@/components/shared/TickerHeader";
import { PriceCone } from "./PriceCone";
import { VolPanel } from "./VolPanel";
import { Gallery } from "./Gallery";

export function TickerOverview({ symbol }: { symbol: string }) {
  const { snapshot, error } = useSnapshot(symbol);

  if (error) {
    return (
      <Shell>
        <p className="pt-10 text-muted-foreground">No snapshot data for {symbol}.</p>
      </Shell>
    );
  }
  if (!snapshot) {
    return (
      <Shell>
        <div className="animate-pulse space-y-4 pt-10">
          <div className="h-6 w-52 rounded bg-muted" />
          <div className="h-[380px] rounded-xl bg-muted/60" />
          <div className="h-24 rounded-xl bg-muted/60" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TickerHeader snapshot={snapshot} backHref="/" backLabel="All tickers" />

      <div className="panel mt-6 p-4 sm:p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-secondary-foreground">
            Where it&apos;s been — and the range the market is pricing
          </h2>
          <span className="text-xs text-muted-foreground">
            cone = options-implied expected range · hover it
          </span>
        </div>
        <PriceCone snapshot={snapshot} />
      </div>

      <div className="mt-4">
        <VolPanel snapshot={snapshot} />
      </div>

      <div className="mt-10">
        <div className="mb-5">
          <h2 className="text-xl font-bold tracking-tight">
            Everything you could do with {snapshot.symbol}
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Twelve strategies, grouped by the view they express. Every card opens the same
            interactive Lab — real snapshot prices, draggable strikes, no account.
          </p>
        </div>
        <Gallery snapshot={snapshot} />
      </div>

      <p className="mt-10 border-t border-border pt-4 text-center text-xs leading-relaxed text-muted-foreground">
        Educational only. Options involve a high degree of risk and are not suitable for all
        investors. Nothing here is investment advice or a recommendation of any security or
        strategy. Prices are a delayed snapshot, not live markets.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>;
}
