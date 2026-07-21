import { notFound } from "next/navigation";
import type { Metadata } from "next";
import manifest from "@/data/manifest.json";
import { STRATEGIES, strategyById } from "@/lib/options/strategies";
import { Cockpit } from "@/components/cockpit/Cockpit";

interface Params {
  symbol: string;
  strategy: string;
}

export function generateStaticParams(): Params[] {
  return manifest.flatMap((m) =>
    STRATEGIES.map((s) => ({ symbol: m.symbol, strategy: s.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { symbol, strategy } = await params;
  const def = strategyById(strategy);
  const entry = manifest.find((m) => m.symbol === symbol.toUpperCase());
  if (!def || !entry) return {};
  return {
    title: `${def.name} on ${entry.symbol}`,
    description: `${def.tagline} Fly it in the instrument: payoff, map, dials, greeks.`,
  };
}

export default async function LabPage({ params }: { params: Promise<Params> }) {
  const { symbol, strategy } = await params;
  const sym = symbol.toUpperCase();
  if (!strategyById(strategy) || !manifest.some((m) => m.symbol === sym)) {
    notFound();
  }
  return <Cockpit initial={{ ticker: sym, strategyId: strategy, view: "payoff" }} />;
}
