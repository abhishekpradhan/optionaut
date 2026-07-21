import type { Metadata } from "next";
import Link from "next/link";
import manifest from "@/data/manifest.json";
import { fmtDateLong } from "@/lib/format";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Options Lab is, how its numbers are computed, where the data comes from, and the fine print — an educational options visualizer, not advice.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-bold tracking-tight">{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="my-3.5 text-[14.5px] leading-relaxed text-muted-foreground">{children}</p>;
}

export default function AboutPage() {
  const capturedAt = manifest[0]?.capturedAt?.slice(0, 10);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">About Options Lab</h1>
      <P>
        Options Lab is a free, no-signup playground for understanding how trading actually
        works — from buying a share to running an iron condor. Everything is built around one
        belief: you understand a financial instrument when you can <em>touch</em> it. So every
        concept here is a dial you drag while a picture responds.
      </P>
      <P>
        It is deliberately not a brokerage, connects to nothing, executes nothing, and sells
        nothing. Crashes in here are free — that&apos;s the product.
      </P>

      <H2>Where the numbers come from</H2>
      <P>
        Market data is a snapshot of Cboe&apos;s publicly available delayed quotes
        {capturedAt ? <> captured {fmtDateLong(capturedAt)}</> : null}, bundled with the app:
        real option chains, real prices, deliberately frozen in time and labeled as such.
        Nothing here is live, and no number is an executable price.
      </P>
      <P>
        All interactive math — option values, greeks, implied volatility, breakevens,
        probability estimates — is computed in your browser by our own Black-Scholes-Merton
        engine, solved so each position&apos;s entry matches its snapshot mid-price. That keeps
        every chart, dial, and stat internally consistent, at the cost of small, honest
        idealizations: US equity options are American-style while the model is European;
        entries assume mid-price fills; &quot;chance of profit&quot; assumes prices wander
        randomly at the current implied volatility. Good enough to build intuition on;
        not a settlement system.
      </P>

      <H2>Why profit is blue (not green)</H2>
      <P>
        About 1 in 12 men can&apos;t reliably tell red from green — the exact pair finance
        defaults to. Profit and loss here use a blue↔red pairing validated for common color
        vision deficiencies, and no meaning is ever carried by color alone: everything is also
        signed, labeled, and positioned.
      </P>

      <H2>The fine print, plainly</H2>
      <P>
        Options involve a high degree of risk and are not suitable for all investors. Options
        Lab is not an investment advisor, broker, or dealer. Nothing on this site is investment
        advice, a recommendation, or a solicitation to buy or sell any security or strategy.
        The strategies shown can and do lose money — several are designed to demonstrate
        exactly how. Before trading options for real, read your broker&apos;s copy of{" "}
        <em>Characteristics and Risks of Standardized Options</em> and assume real fills are
        worse than model fills.
      </P>

      <H2>Colophon</H2>
      <P>
        Built with Next.js and React, hand-rolled SVG and canvas visualizations, a hand-written
        options-math engine with a few dozen unit tests, and design tokens validated against
        color-vision-deficiency simulations. Start at the{" "}
        <Link href="/learn" className="text-primary hover:underline">
          learning path
        </Link>{" "}
        or jump straight into a{" "}
        <Link href="/t/AAPL" className="text-primary hover:underline">
          ticker
        </Link>
        .
      </P>
    </main>
  );
}
