import Link from "next/link";
import manifest from "@/data/manifest.json";
import { fmtDateLong } from "@/lib/format";

export function SiteFooter() {
  const capturedAt = manifest[0]?.capturedAt?.slice(0, 10);
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-[13px]">
          <div className="flex items-baseline gap-1.5 font-bold tracking-tight">
            <span aria-hidden className="inline-block size-2 translate-y-[-1px] rounded-full bg-primary" />
            Options Lab
          </div>
          <nav className="flex items-center gap-5 text-muted-foreground">
            <Link href="/learn" className="transition-colors hover:text-foreground">Learn</Link>
            <Link href="/glossary" className="transition-colors hover:text-foreground">Glossary</Link>
            <Link href="/about" className="transition-colors hover:text-foreground">About</Link>
          </nav>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-secondary-foreground">Educational purposes only.</span>{" "}
          Options involve a high degree of risk and are not suitable for all investors. Options Lab
          is not an investment advisor; nothing on this site is investment advice, a recommendation,
          or an offer to buy or sell any security or strategy. Values are model estimates built on{" "}
          {capturedAt ? (
            <>a delayed market-data snapshot captured {fmtDateLong(capturedAt)}</>
          ) : (
            <>delayed snapshot data</>
          )}{" "}
          — not live markets, and not executable prices. Read{" "}
          <Link href="/about" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
            how the numbers are made
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
