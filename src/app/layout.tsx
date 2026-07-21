import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://optionaut.org"),
  title: {
    default: "Optionaut — learn options by flying them",
    template: "%s — Optionaut",
  },
  description:
    "A free, cinematic instrument for understanding trading. Pick a stock, fly every strategy from buying shares to iron condors — drag strikes, fast-forward time, crush volatility. Educational only — not investment advice.",
  openGraph: {
    title: "Optionaut — learn options by flying them",
    description:
      "Drag strikes, fast-forward time, crush volatility — an interactive, educational cockpit for options intuition. Free, no signup, every crash is free.",
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
        {children}
      </body>
    </html>
  );
}
