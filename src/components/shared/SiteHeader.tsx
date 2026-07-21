import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1.5 font-bold tracking-tight">
          <span aria-hidden className="inline-block size-2 translate-y-[-1px] rounded-full bg-primary" />
          Options Lab
          <span className="hidden text-[10px] font-normal uppercase tracking-widest text-muted-foreground sm:inline">
            educational
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-5 text-[13px] text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Tickers
          </Link>
          <Link href="/learn" className="transition-colors hover:text-foreground">
            Learn
          </Link>
          <Link href="/glossary" className="transition-colors hover:text-foreground">
            Glossary
          </Link>
        </nav>
      </div>
    </header>
  );
}
