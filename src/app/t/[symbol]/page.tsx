import { notFound } from "next/navigation";
import type { Metadata } from "next";
import manifest from "@/data/manifest.json";
import { Cockpit } from "@/components/cockpit/Cockpit";

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
  if (!entry) {
    return {
      title: `${symbol.toUpperCase()} · your data`,
      description:
        "A security you added yourself — stored only in your browser, priced by our math.",
    };
  }
  return {
    title: `${entry.symbol} · ${entry.name}`,
    alternates: { canonical: `/t/${entry.symbol}` },
    description: `${entry.name} in the instrument: price history, the market's expected range, and twelve strategies to fly. Educational only.`,
  };
}

export default async function TickerPage({ params }: { params: Promise<Params> }) {
  const { symbol } = await params;
  const sym = symbol.toUpperCase();
  // Unknown symbols still render — they may live in the visitor's own
  // browser (custom markets); the cockpit shows its no-data state if not.
  if (!/^[A-Z0-9.]{1,12}$/.test(sym)) notFound();
  return <Cockpit initial={{ ticker: sym, view: "history" }} />;
}
