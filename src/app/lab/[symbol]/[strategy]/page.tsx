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
  if (!def) return {};
  return {
    title: `${def.name} on ${symbol.toUpperCase()}`,
    alternates: { canonical: `/lab/${symbol.toUpperCase()}/${def.id}` },
    description: `${def.tagline} Fly it in the instrument: payoff, map, dials, greeks.`,
  };
}

export default async function LabPage({ params }: { params: Promise<Params> }) {
  const { symbol, strategy } = await params;
  const sym = symbol.toUpperCase();
  // Strategy must be real; the symbol may be one of the visitor's own
  // custom markets, so let the cockpit resolve it client-side.
  if (!strategyById(strategy) || !/^[A-Z0-9.]{1,12}$/.test(sym)) {
    notFound();
  }
  return <Cockpit initial={{ ticker: sym, strategyId: strategy, view: "payoff" }} />;
}
