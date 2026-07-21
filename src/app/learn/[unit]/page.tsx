import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Cockpit } from "@/components/cockpit/Cockpit";
import { TOURS } from "@/components/cockpit/tour/tours";

/** Tours deep links. Old lesson slugs from the pre-cockpit era redirect
 *  into the tour that absorbed them, so shared links keep working. */
const LEGACY: Record<string, string> = {
  "own-a-share": "read-the-diagram",
  "the-contract": "read-the-diagram",
  "what-an-option-costs": "the-price-of-possibility",
};

interface Params {
  unit: string;
}

export function generateStaticParams(): Params[] {
  return [...TOURS.map((t) => ({ unit: t.id })), ...Object.keys(LEGACY).map((unit) => ({ unit }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { unit } = await params;
  const tour = TOURS.find((t) => t.id === (LEGACY[unit] ?? unit));
  if (!tour) return {};
  return { title: `${tour.title} — Tour`, description: tour.tagline };
}

export default async function TourPage({ params }: { params: Promise<Params> }) {
  const { unit } = await params;
  const id = LEGACY[unit] ?? unit;
  if (!TOURS.some((t) => t.id === id)) notFound();
  return <Cockpit initial={{ tour: { id, step: 0 } }} />;
}
