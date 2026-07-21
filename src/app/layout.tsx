import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { Atmosphere } from "@/components/shared/Atmosphere";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // "Options Lab" is a working title — final product name is an open
  // decision in PLAN.md's parking lot.
  metadataBase: new URL("https://trading-helper-app.vercel.app"),
  title: {
    default: "Options Lab — see what a trade really does",
    template: "%s — Options Lab",
  },
  description:
    "A free, visual guide to trading. Pick a stock, explore every strategy from buying shares to iron condors, and understand the mechanics by touching them. Educational only — not investment advice.",
  openGraph: {
    title: "Options Lab — see what a trade really does",
    description:
      "Drag strikes, fast-forward time, crush volatility — an interactive, educational playground for options intuition. Free, no signup.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Atmosphere />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
