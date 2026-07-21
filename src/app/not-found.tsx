import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="figures text-5xl font-bold text-muted-foreground/50">404</p>
      <h1 className="mt-4 text-xl font-bold tracking-tight">Out of the money.</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        This page doesn&apos;t exist — it expired worthless. Your capital, however, is intact.
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">
          Home
        </Link>
        <Link href="/learn" className="rounded-lg border border-border px-4 py-2 text-secondary-foreground">
          The path
        </Link>
      </div>
    </main>
  );
}
