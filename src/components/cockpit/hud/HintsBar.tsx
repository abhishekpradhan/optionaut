"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { strategyById, buildPosition, defaultExpIndex } from "@/lib/options/strategies";
import { buildShareUrl } from "@/lib/cockpit/shareUrl";
import { GithubMark } from "@/components/shared/GithubMark";
import type { Snapshot } from "@/lib/data/types";
import { Link2, Check } from "lucide-react";

/** Top-right: the honesty chip, the keyboard whisper, and the share link. */
export function HintsBar({ snapshot }: { snapshot: Snapshot | null }) {
  const setOverlay = useCockpit((s) => s.setOverlay);
  const custom = snapshot?.source === "custom";
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const share = async () => {
    if (!snapshot) return;
    const s = useCockpit.getState();
    const def = strategyById(s.strategyId);
    if (!def) return;
    const legs = buildPosition(def, snapshot, s.expIndex, s.overrides);
    const url = buildShareUrl(
      {
        def,
        snapshot,
        expIndex: s.expIndex,
        expiryIsDefault: s.expIndex === defaultExpIndex(snapshot, def),
        overrides: s.overrides,
        legs,
        whatIfPrice: s.whatIfPrice,
        elapsedDays: s.elapsedDays,
        ivScale: s.ivScale,
        view: s.view,
      },
      window.location.origin,
      s.ticker,
    );
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2600);
    } catch {
      // clipboard denied — put the link in the address bar instead
      window.history.replaceState(null, "", url.slice(window.location.origin.length));
    }
  };

  return (
    <div className="pointer-events-auto flex select-none flex-col items-end gap-1 text-right">
      <button
        onClick={() => setOverlay("about")}
        className="hud max-w-[52vw] truncate rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:max-w-none"
        title="How the numbers are made"
      >
        {custom
          ? "educational · your data · this browser only · not advice"
          : "educational · simulated market · fictional securities · not advice"}
      </button>
      <button
        onClick={() => setOverlay("help")}
        className="hud hidden rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline md:block"
        title="All controls (?)"
      >
        h/p/m views · [ ] expiry · drag strikes · ? help
      </button>
      {snapshot && !custom && (
        <button
          onClick={share}
          className={`hud flex items-center gap-1 rounded !text-[9.5px] !tracking-[0.16em] underline-offset-2 transition-colors ${
            copied
              ? "text-primary"
              : "text-muted-foreground/60 hover:text-foreground hover:underline"
          }`}
          title="Copy a link that rebuilds this exact setup — strikes, expiry, dials"
        >
          {copied ? (
            <>
              <Check className="size-3" aria-hidden /> copied — link rebuilds this setup
            </>
          ) : (
            <>
              <Link2 className="size-3" aria-hidden /> share this setup
            </>
          )}
        </button>
      )}
      <a
        href="https://github.com/abhishekpradhan/optionaut"
        target="_blank"
        rel="noopener noreferrer"
        className="hud flex items-center gap-1 rounded !text-[9.5px] !tracking-[0.16em] text-muted-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
        title="Open source, MIT — read it, fork it, star it"
      >
        <GithubMark className="size-3" /> github
      </a>
    </div>
  );
}
