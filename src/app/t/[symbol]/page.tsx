import { notFound } from "next/navigation";
import type { Metadata } from "next";
import manifest from "@/data/manifest.json";
import { TickerOverview } from "@/components/overview/TickerOverview";

interface Params {
  symbol: string;
}

export function generateStaticParams(): Params[] {
  return manifest.map((m) => ({ symbol: m.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const entry = manifest.find((m) => m.symbol === symbol.toUpperCase());
  if (!entry) return {};
  return {
    title: `${entry.symbol} · ${entry.name}`,
    description: `${entry.name}: price history, the market's expected move, volatility context, and twelve interactive option strategies to explore — educational only.`,
  };
}

export default async function TickerPage({ params }: { params: Promise<Params> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  if (!manifest.some((m) => m.symbol === sym)) notFound();
  return <TickerOverview symbol={sym} />;
}
