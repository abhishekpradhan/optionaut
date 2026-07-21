import type { OptionKind, PricingInputs, Greeks } from "./types";

/**
 * European Black-Scholes-Merton pricing, analytic greeks, and implied-vol
 * solving, hand-written (the npm options packages are unmaintained since
 * 2014). Validated in blackScholes.test.ts against textbook values,
 * put-call parity, finite differences, and IV round-trips.
 *
 * Conventions: T in years (ACT/365), sigma/r/q annualized continuous.
 * US single-name options are American-style; BSM is European. The gap
 * matters mainly for deep-ITM puts and calls near ex-dividend dates —
 * acceptable for an educational tool and disclosed in the UI glossary.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Hart's rational approximation (West 2005, "Better approximations to
 *  cumulative normal functions") — accurate to ~1e-15 across the full
 *  range, and symmetric by construction so parity holds exactly. */
export function normCdf(x: number): number {
  const z = Math.abs(x);
  let c: number;
  if (z > 37) {
    c = 0;
  } else {
    const e = Math.exp((-z * z) / 2);
    if (z < 7.07106781186547) {
      const n =
        (((((3.52624965998911e-2 * z + 0.700383064443688) * z +
          6.37396220353165) *
          z +
          33.912866078383) *
          z +
          112.079291497871) *
          z +
          221.213596169931) *
          z +
        220.206867912376;
      const d =
        ((((((8.83883476483184e-2 * z + 1.75566716318264) * z +
          16.064177579207) *
          z +
          86.7807322029461) *
          z +
          296.564248779674) *
          z +
          637.333633378831) *
          z +
          793.826512519948) *
          z +
        440.413735824752;
      c = (e * n) / d;
    } else {
      const f = z + 1 / (z + 2 / (z + 3 / (z + 4 / (z + 0.65))));
      c = e / (2.506628274631 * f);
    }
  }
  return x <= 0 ? c : 1 - c;
}

function d1d2({ S, K, T, r, q, sigma }: PricingInputs): [number, number] {
  const sqT = Math.sqrt(T);
  const d1 =
    (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqT);
  return [d1, d1 - sigma * sqT];
}

export function bsPrice(type: OptionKind, inp: PricingInputs): number {
  const { S, K, T, r, q, sigma } = inp;
  if (T <= 0) return Math.max(type === "call" ? S - K : K - S, 0);
  if (sigma <= 1e-9) {
    const f = S * Math.exp(-q * T) - K * Math.exp(-r * T);
    return Math.max(type === "call" ? f : -f, 0);
  }
  const [d1, d2] = d1d2(inp);
  if (type === "call") {
    return (
      S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2)
    );
  }
  return (
    K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1)
  );
}

export function bsGreeks(type: OptionKind, inp: PricingInputs): Greeks {
  const { S, K, T, r, q, sigma } = inp;
  if (T <= 0 || sigma <= 1e-9) {
    const price = bsPrice(type, inp);
    const itm = type === "call" ? S > K : S < K;
    return {
      price,
      delta: itm ? (type === "call" ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }
  const sqT = Math.sqrt(T);
  const [d1, d2] = d1d2(inp);
  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);
  const pdf = normPdf(d1);
  const gamma = (eqT * pdf) / (S * sigma * sqT);
  const vega = S * eqT * pdf * sqT;
  const timeBleed = -(S * eqT * pdf * sigma) / (2 * sqT);

  if (type === "call") {
    const nd1 = normCdf(d1);
    const nd2 = normCdf(d2);
    return {
      price: S * eqT * nd1 - K * erT * nd2,
      delta: eqT * nd1,
      gamma,
      theta: timeBleed - r * K * erT * nd2 + q * S * eqT * nd1,
      vega,
      rho: K * T * erT * nd2,
    };
  }
  const nmd1 = normCdf(-d1);
  const nmd2 = normCdf(-d2);
  return {
    price: K * erT * nmd2 - S * eqT * nmd1,
    delta: eqT * (normCdf(d1) - 1),
    gamma,
    theta: timeBleed + r * K * erT * nmd2 - q * S * eqT * nmd1,
    vega,
    rho: -K * T * erT * nmd2,
  };
}

/**
 * Solve for the volatility that reproduces a target price. Newton-Raphson
 * on the (monotone-increasing) BSM price with a Brenner-Subrahmanyam seed,
 * falling back to bisection whenever a Newton step leaves the bracket or
 * vega vanishes (deep ITM/OTM, near expiry). Returns null when the target
 * sits outside the no-arbitrage bounds, where no IV exists — common for
 * stale quotes whose mid drops below intrinsic value.
 */
export function impliedVol(
  type: OptionKind,
  target: number,
  inp: Omit<PricingInputs, "sigma">,
): number | null {
  const { S, K, T, r, q } = inp;
  if (T <= 0 || target <= 0 || S <= 0 || K <= 0) return null;
  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);
  const lowerBound = Math.max(
    type === "call" ? S * eqT - K * erT : K * erT - S * eqT,
    0,
  );
  const upperBound = type === "call" ? S * eqT : K * erT;
  if (target < lowerBound - 1e-9 || target > upperBound + 1e-9) return null;
  // Time value below float resolution: any tiny vol reproduces the price,
  // so no meaningful IV exists (deep ITM near expiry, stale intrinsic mids).
  if (target - lowerBound < 1e-9) return null;

  let lo = 1e-4;
  let hi = 5;
  let sigma = Math.min(
    3,
    Math.max(1e-3, (Math.sqrt((2 * Math.PI) / T) * target) / S),
  );
  for (let i = 0; i < 100; i++) {
    const price = bsPrice(type, { ...inp, sigma });
    const diff = price - target;
    if (Math.abs(diff) < 1e-10) return sigma;
    if (diff > 0) hi = Math.min(hi, sigma);
    else lo = Math.max(lo, sigma);

    const sqT = Math.sqrt(T);
    const [d1] = d1d2({ ...inp, sigma });
    const vega = S * eqT * normPdf(d1) * sqT;
    let next = vega > 1e-10 ? sigma - diff / vega : Number.NaN;
    if (!Number.isFinite(next) || next <= lo || next >= hi) {
      next = 0.5 * (lo + hi);
    }
    if (Math.abs(next - sigma) < 1e-10) return next;
    sigma = next;
  }
  return sigma;
}
