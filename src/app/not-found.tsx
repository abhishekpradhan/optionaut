import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center p-4">
      <div className="panel stage-enter flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <div className="hud !text-[9.5px] text-primary">flight plan not found</div>
        <p className="figures text-5xl font-bold tracking-tight text-foreground">404</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          There&apos;s nothing at this address — like an option nobody wrote. The whole
          instrument lives on one screen, so you can&apos;t be far off course.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="hud rounded-md border border-primary/60 bg-accent px-3.5 py-2 !text-[9.5px] transition-colors hover:border-primary"
          >
            back to the cockpit
          </Link>
          <Link
            href="/learn"
            className="hud rounded-md border border-border px-3.5 py-2 !text-[9.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            ✦ take a tour
          </Link>
        </div>
      </div>
    </main>
  );
}
