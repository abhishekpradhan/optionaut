"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";

/**
 * The boarding pass (PLAN.md D10): Optionaut is built for big screens,
 * and phones get told so honestly — atmosphere intact, a taste of the
 * instrument, a link to send to a desk, and an "enter anyway" hatch.
 * Session-scoped dismissal; reading surfaces (glossary/about) stay
 * reachable because they work fine on a phone.
 */
export function MobileGate() {
  const [gated, setGated] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const overlay = useCockpit((s) => s.overlay);
  const setOverlay = useCockpit((s) => s.setOverlay);

  React.useEffect(() => {
    if (sessionStorage.getItem("opt-gate-dismissed")) return;
    const mq = window.matchMedia("(max-width: 699px), (max-height: 449px)");
    const update = () => setGated(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!gated || overlay) return null;

  const enter = () => {
    sessionStorage.setItem("opt-gate-dismissed", "1");
    setGated(false);
  };

  const share = async () => {
    const url = "https://optionaut.org";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Optionaut", url });
        return;
      }
    } catch {
      /* user cancelled the share sheet */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the URL is in the address bar anyway */
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/80 px-6 text-center backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="dot-steady inline-block size-2 rounded-full bg-primary" />
        <span className="font-mono text-[15px] font-bold tracking-[0.24em] text-foreground">
          OPTIONAUT
        </span>
      </div>

      {/* a taste of the instrument */}
      <svg viewBox="0 0 260 90" className="w-56" aria-hidden>
        <line x1="6" y1="52" x2="254" y2="52" stroke="var(--axis-line)" strokeWidth="1" />
        <polyline
          points="10,76 62,76 96,22 164,22 198,76 250,76"
          fill="none" stroke="var(--foreground)" strokeWidth="2"
          strokeLinejoin="round" className="hero-draw" pathLength={1}
        />
        <path
          d="M10,74 C64,70 78,32 130,30 C182,32 196,70 250,74"
          fill="none" stroke="var(--primary)" strokeWidth="5" opacity="0.16" strokeLinecap="round"
        />
        <path
          d="M10,74 C64,70 78,32 130,30 C182,32 196,70 250,74"
          fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round"
          className="hero-draw" pathLength={1} style={{ animationDelay: "0.2s" }}
        />
      </svg>

      <div>
        <h1 className="text-xl font-bold tracking-tight">A flight deck needs a windshield.</h1>
        <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">
          Optionaut is a full-screen instrument — draggable strikes, dials, maps — built for
          a desktop or a tablet in landscape. On a phone it flies… poorly.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          onClick={share}
          className="rounded-md border border-primary/60 bg-accent px-4 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary"
        >
          {copied ? "Link copied ✓" : "Send yourself the link"}
        </button>
        <button
          onClick={enter}
          className="rounded-md border border-border px-4 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Enter the cockpit anyway →
        </button>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          <button onClick={() => setOverlay("glossary")} className="hud !text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            glossary
          </button>
          <span aria-hidden className="h-3 w-px bg-border" />
          <button onClick={() => setOverlay("about")} className="hud !text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            about
          </button>
          <span aria-hidden className="h-3 w-px bg-border" />
          <a
            href="https://github.com/abhishekpradhan/optionaut"
            target="_blank"
            rel="noopener noreferrer"
            className="hud !text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            github
          </a>
          <span aria-hidden className="h-3 w-px bg-border" />
          <a
            href="https://buymeacoffee.com/abhishekpradhan"
            target="_blank"
            rel="noopener noreferrer"
            className="hud !text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            buy me a coffee
          </a>
        </div>
      </div>

      <p className="hud absolute bottom-4 !text-[9px] text-muted-foreground/60">
        educational · not investment advice
      </p>
    </div>
  );
}
