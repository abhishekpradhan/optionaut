"use client";

import * as React from "react";
import { useCockpit } from "@/lib/cockpit/store";
import { buildCustomSnapshot } from "@/lib/sim/market";
import { parseCboeCsv, chainToSnapshot, type ParsedChain } from "@/lib/data/parseCboeCsv";
import {
  useCustomMarkets,
  saveCustomMarket,
  deleteCustomMarket,
  CUSTOM_LIMIT,
} from "@/lib/data/customMarkets";
import manifest from "@/data/manifest.json";
import { fmtUsd, fmtPct } from "@/lib/format";
import { Trash2, Upload, Wand2 } from "lucide-react";

/** "Your data" sheet: build a security from your own numbers, or upload
 *  a chain you fetched yourself. Everything stays in this browser. */
export function CustomSheet() {
  const setOverlay = useCockpit((s) => s.setOverlay);
  const setTicker = useCockpit((s) => s.setTicker);
  const ticker = useCockpit((s) => s.ticker);
  const customs = useCustomMarkets();

  // ——— quick build ———
  const [qSymbol, setQSymbol] = React.useState("");
  const [qSpot, setQSpot] = React.useState("");
  const [qIv, setQIv] = React.useState("");
  const [qYield, setQYield] = React.useState("");
  const [qError, setQError] = React.useState<string | null>(null);

  const quickBuild = () => {
    const spot = parseFloat(qSpot);
    const iv = parseFloat(qIv) / 100;
    const symbol = qSymbol.trim().toUpperCase();
    if (!symbol || !/^[A-Z0-9.]{1,12}$/.test(symbol)) return setQError("Give it a short symbol.");
    if (manifest.some((m) => m.symbol === symbol)) return setQError("That symbol is taken by a simulated security.");
    if (!(spot > 0)) return setQError("Spot price must be a positive number.");
    if (!(iv > 0.005 && iv < 4)) return setQError("IV should be a percentage, e.g. 35.");
    const snap = buildCustomSnapshot({
      symbol, spot, iv,
      divYield: qYield ? Math.max(parseFloat(qYield), 0) / 100 : 0,
    });
    const res = saveCustomMarket(snap);
    if (!res.ok) return setQError(res.error);
    setQError(null);
    setTicker(symbol);
    setOverlay(null);
  };

  // ——— upload ———
  const [parsed, setParsed] = React.useState<ParsedChain | null>(null);
  const [upSymbol, setUpSymbol] = React.useState("");
  const [upSpot, setUpSpot] = React.useState("");
  const [upError, setUpError] = React.useState<string | null>(null);

  const ingest = (text: string) => {
    try {
      const p = parseCboeCsv(text);
      if (!p.expirations.length) {
        setParsed(null);
        setUpError("Couldn't find an options table in that file — expected Cboe's quotedata CSV.");
        return;
      }
      setParsed(p);
      setUpSymbol(p.symbol ?? "");
      setUpSpot(p.spot ? String(p.spot) : "");
      setUpError(null);
    } catch {
      setUpError("That didn't parse. Is it the CSV from Cboe's options chain page?");
    }
  };

  const saveUpload = () => {
    if (!parsed) return;
    const symbol = upSymbol.trim().toUpperCase();
    const spot = parseFloat(upSpot);
    if (!symbol || !/^[A-Z0-9.]{1,12}$/.test(symbol)) return setUpError("Confirm the symbol.");
    if (!(spot > 0)) return setUpError("Confirm the spot price.");
    const snap = chainToSnapshot({ symbol, spot, expirations: parsed.expirations });
    const res = saveCustomMarket(snap);
    if (!res.ok) return setUpError(res.error);
    setParsed(null);
    setTicker(symbol);
    setOverlay(null);
  };

  const remove = (symbol: string) => {
    deleteCustomMarket(symbol);
    if (ticker === symbol) setTicker(manifest[0].symbol);
  };

  const input =
    "w-full rounded-md border border-input bg-background/60 px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <>
      <div className="mb-4">
        <div className="hud !text-[9.5px] text-primary">your numbers, our math</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">Your data</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Everything you add here is stored <span className="text-secondary-foreground">only in
          this browser</span>{" "}
          — it never touches our servers, which is also why we can&apos;t
          fetch market data for you: republishing exchange data requires licenses. You,
          personally, are allowed to look yours up.
        </p>
      </div>

      {/* quick build */}
      <h3 className="flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
        <Wand2 className="size-4 text-primary" aria-hidden /> Quick build
      </h3>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Type a symbol, a price, and an implied volatility (your broker shows IV on any chain) —
        we generate a full, internally consistent chain from your numbers.
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input className={input} placeholder="Symbol" value={qSymbol} aria-label="Symbol"
          onChange={(e) => setQSymbol(e.target.value)} />
        <input className={input} placeholder="Spot $" value={qSpot} aria-label="Spot price" inputMode="decimal"
          onChange={(e) => setQSpot(e.target.value)} />
        <input className={input} placeholder="IV %" value={qIv} aria-label="Implied volatility percent" inputMode="decimal"
          onChange={(e) => setQIv(e.target.value)} />
        <input className={input} placeholder="Div yield % (opt.)" value={qYield} aria-label="Dividend yield percent" inputMode="decimal"
          onChange={(e) => setQYield(e.target.value)} />
      </div>
      {qError && <p className="mt-2 text-[12px] text-loss">{qError}</p>}
      <button
        onClick={quickBuild}
        className="mt-2.5 rounded-md border border-primary/60 bg-accent px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-primary"
      >
        Build it
      </button>

      {/* upload */}
      <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-secondary-foreground">
        <Upload className="size-4 text-primary" aria-hidden /> Upload a real chain
      </h3>
      <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[12px] leading-relaxed text-muted-foreground">
        <li>
          Go to Cboe&apos;s delayed quotes page and <em>type the ticker yourself</em> —
          cboe.com → Delayed Quotes (manual lookup for personal use is what their terms allow).
        </li>
        <li>Open the options chain and use their <span className="text-secondary-foreground">Download CSV</span>.</li>
        <li>Drop the file here (or paste its contents). It stays on this device.</li>
      </ol>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-md border border-border px-3.5 py-1.5 text-[13px] transition-colors hover:border-primary/50">
          Choose CSV…
          <input
            type="file" accept=".csv,text/csv,text/plain" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              f.text().then(ingest);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-[11px] text-muted-foreground">or paste below</span>
      </div>
      <textarea
        className={`${input} mt-2 h-20 font-mono !text-[11px]`}
        placeholder="Expiration Date,Calls,Last Sale,…"
        aria-label="Paste CSV contents"
        onChange={(e) => {
          if (e.target.value.trim().length > 100) ingest(e.target.value);
        }}
      />
      {parsed && (
        <div className="mt-2.5 rounded-md border border-primary/40 bg-accent/40 p-3">
          <div className="text-[12.5px] text-secondary-foreground">
            Parsed {parsed.rows} rows · {parsed.expirations.length} expirations
            {parsed.spot ? ` · spot ≈ ${fmtUsd(parsed.spot)}` : ""}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className={`${input} !w-28`} placeholder="Symbol" value={upSymbol} aria-label="Confirm symbol"
              onChange={(e) => setUpSymbol(e.target.value)} />
            <input className={`${input} !w-28`} placeholder="Spot $" value={upSpot} aria-label="Confirm spot" inputMode="decimal"
              onChange={(e) => setUpSpot(e.target.value)} />
            <button
              onClick={saveUpload}
              className="rounded-md border border-primary/60 bg-accent px-3.5 py-1.5 text-[13px] font-medium transition-colors hover:border-primary"
            >
              Save &amp; open
            </button>
          </div>
        </div>
      )}
      {upError && <p className="mt-2 text-[12px] text-loss">{upError}</p>}

      {/* saved list */}
      {customs.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-secondary-foreground">
            Saved in this browser ({customs.length}/{CUSTOM_LIMIT})
          </h3>
          <ul className="mt-2 space-y-1.5">
            {customs.map((c) => (
              <li key={c.symbol} className="flex items-center gap-3 rounded-md border border-border/70 px-3 py-2">
                <button
                  onClick={() => { setTicker(c.symbol); setOverlay(null); }}
                  className="figures min-w-0 flex-1 truncate text-left text-[13px] font-semibold hover:text-primary"
                >
                  {c.symbol}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {fmtUsd(c.spot)} · IV {c.iv30 ? fmtPct(c.iv30, 0) : "—"} ·{" "}
                    {c.simulated ? "built from your numbers" : "your upload"}
                  </span>
                </button>
                <button
                  onClick={() => remove(c.symbol)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-loss"
                  aria-label={`Delete ${c.symbol}`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
