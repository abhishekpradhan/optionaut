"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="text-xl font-bold tracking-tight">Something broke — on us.</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        An unexpected error, and for once it isn&apos;t theta&apos;s fault. Try again; if it
        persists, a refresh usually clears it.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
