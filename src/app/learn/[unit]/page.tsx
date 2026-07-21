import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UNITS, unitBySlug } from "@/lib/learn/units";
import { LessonBody } from "@/components/learn/lessons";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Params {
  unit: string;
}

const lessonUnits = UNITS.filter((u) => u.kind === "lesson");

export function generateStaticParams(): Params[] {
  return lessonUnits.map((u) => ({ unit: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { unit } = await params;
  const meta = unitBySlug.get(unit);
  if (!meta) return {};
  return {
    title: `${meta.title} — Learn`,
    description: meta.tagline,
  };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { unit } = await params;
  const meta = unitBySlug.get(unit);
  if (!meta || meta.kind !== "lesson") notFound();

  const idx = lessonUnits.findIndex((u) => u.slug === unit);
  const prev = lessonUnits[idx - 1];
  const next = lessonUnits[idx + 1];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/learn"
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> The path
        </Link>
        <span className="figures text-xs text-muted-foreground">
          Unit {meta.n} of 10
        </span>
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">{meta.title}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{meta.tagline}</p>

      <article className="mt-4">
        <LessonBody slug={unit} />
      </article>

      <nav className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-5">
        {prev ? (
          <Link
            href={`/learn/${prev.slug}`}
            className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            <span>
              <span className="block text-[10px] uppercase tracking-wider">Previous</span>
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/learn/${next.slug}`}
            className="group flex items-center gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wider">Next</span>
              {next.title}
            </span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
        Educational only — not investment advice. Lesson widgets use synthetic round-number
        pricing from the same model as the Lab.
      </p>
    </main>
  );
}
