/** Formatting helpers. All money is USD; sign-aware variants render an
 *  explicit +/− so profit/loss never relies on color alone. */

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtUsd(x: number, opts?: { cents?: boolean }): string {
  const f = opts?.cents ?? Math.abs(x) < 1000 ? usd2 : usd0;
  return f.format(x);
}

/** "+$1,240" / "−$380" — uses a true minus sign. */
export function fmtSignedUsd(x: number, opts?: { cents?: boolean }): string {
  if (!Number.isFinite(x)) return x > 0 ? "Unlimited" : "Unlimited loss";
  const body = fmtUsd(Math.abs(x), opts);
  if (Math.abs(x) < 0.005) return body;
  return x > 0 ? `+${body}` : `−${body}`;
}

export function fmtPct(x: number, dp = 1): string {
  return `${(x * 100).toFixed(dp)}%`;
}

export function fmtSignedPct(x: number, dp = 1): string {
  const body = fmtPct(Math.abs(x), dp);
  return x >= 0 ? `+${body}` : `−${body}`;
}

/** A price as a signed percentage move from a base ("+15.0%", "−14.4%"). */
export function fmtSignedPctOf(v: number, base: number, dp = 1): string {
  return fmtSignedPct((v - base) / base, dp);
}

export function fmtNum(x: number, dp = 2): string {
  return x.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Compact axis money labels: $1.2K, $340, $1.5M. */
export function fmtUsdCompact(x: number): string {
  const abs = Math.abs(x);
  const sign = x < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function fmtDateLong(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
