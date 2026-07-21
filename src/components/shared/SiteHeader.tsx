import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-11 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span aria-hidden className="dot-pulse inline-block size-2 rounded-full bg-primary" />
          Options Lab
          <span className="hud hidden translate-y-px sm:inline">educational</span>
        </Link>
        <nav className="hud ml-auto flex items-center gap-6 !text-[10.5px]">
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
