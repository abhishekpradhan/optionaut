import type { ReactNode } from "react";
import { Term } from "@/components/learn/Term";
import { useCockpit } from "@/lib/cockpit/store";
import type { Snapshot, Expiration } from "@/lib/data/types";
import type { LabLeg } from "@/lib/options/strategies";
import type { MarketCtx, OptionKind } from "@/lib/options/types";
import { markToMarket, netEntryCost, payoffAtExpiry } from "@/lib/options/position";
import { fmtUsd, fmtSignedUsd, fmtSignedPctOf } from "@/lib/format";
import type { Scene, TourTarget } from "./scene";

export type { Scene, TourTarget } from "./scene";

/**
 * Tours: the unit lessons (PLAN.md §4.1) reborn as guided flights of
 * the real instrument. Each step declares the scene it expects, can
 * gate progress on the learner actually doing the thing (Nicky Case's
 * cognitive gates), can reveal the answer to its own question from the
 * live numbers, and can name the control it is talking about so the
 * cockpit lights it up. Captions follow the house voice: phenomenon
 * first, name second, every term tappable.
 */

type S = ReturnType<typeof useCockpit.getState>;

/** Everything a step may need once the security's data has landed. */
export interface TourCtx {
  snapshot: Snapshot;
  spot: number;
  dte: number;
  exp: Expiration;
  legs: LabLeg[];
  /** one expected move (≈1σ) to the current expiry, in dollars */
  em: number;
  market: MarketCtx;
  /** the listed strike nearest a price, for one option kind */
  nearest: (kind: OptionKind, price: number) => number;
  /** n listed strikes away from a strike (negative = lower), clamped to the chain */
  stepStrike: (kind: OptionKind, strike: number, n: number) => number;
}

export interface TourStep {
  caption: ReactNode;
  /** the instrument state this step expects (see scene.ts) */
  scene?: Scene;
  /** the control this step talks about */
  target?: TourTarget;
  /** blocks Next until true; hint shows what to do */
  gate?: { check: (s: S, c: TourCtx) => boolean; hint: string };
  /** the answer to the step's own question, from live numbers — shown once the gate opens */
  reveal?: (s: S, c: TourCtx) => ReactNode;
}

export interface Tour {
  id: string;
  title: string;
  /** plain-English subtitle: what the tour is actually about */
  tagline: string;
  /** honest estimate for a first-timer who taps the terms */
  minutes: number;
  steps: TourStep[];
}

const usd = (x: number) => fmtUsd(x, { cents: false });
const susd = (x: number) => fmtSignedUsd(x, { cents: false });

export const TOURS: Tour[] = [
  {
    id: "read-the-diagram",
    title: "Read the diagram",
    tagline: "How to read a payoff picture, from plain shares to your first contracts.",
    minutes: 4,
    steps: [
      {
        scene: { strategy: "long-shares", view: "payoff" },
        caption: (
          <>
            Start with the honest baseline: owning 100 <Term id="share">shares</Term>. This is a{" "}
            <Term id="payoff-diagram">payoff diagram</Term>{" "}— stock price runs left to right, your{" "}
            <Term id="pl">profit or loss</Term>{" "}runs up and down. One picture, every outcome. Shares
            are a straight line: every dollar the stock moves, you make or lose a dollar per share.
            No kinks, no tricks, no deadline.
          </>
        ),
      },
      {
        target: "price",
        gate: { check: (s) => s.whatIfPrice != null, hint: "drag the price dial (right panel)" },
        caption: (
          <>
            Before you move anything: if the stock drops 10%, what do 100 shares lose? Commit to a
            number. Now drag the <strong>price dial</strong>{" "}on the right and watch the big readout
            bottom-left check your answer.
          </>
        ),
        reveal: (s, c) => {
          if (s.whatIfPrice == null) return null;
          const tenPct = markToMarket(c.legs, c.spot * 0.9, 0, c.market, 1);
          const yours = markToMarket(c.legs, s.whatIfPrice, 0, c.market, 1);
          return (
            <>
              The answer: a 10% drop is {susd(tenPct)} on 100 shares. You dragged to{" "}
              {fmtSignedPctOf(s.whatIfPrice, c.spot)}, which is {susd(yours)}.
            </>
          );
        },
      },
      {
        scene: { strategy: "long-call", view: "payoff" },
        caption: (
          <>
            Now the interesting distortion. Same stock — but instead of buying 100 shares, you pay
            a much smaller amount today for the right to buy them later at a fixed price. Look at
            the shape: flat on the left, rising on the right. However far the stock falls, the
            worst case is what you paid — and it&apos;s already paid.
          </>
        ),
      },
      {
        caption: (
          <>
            The names, now that you&apos;ve seen the thing. This contract is a{" "}
            <Term id="call">call</Term>. The fixed price is the <Term id="strike">strike</Term>; the
            deadline is <Term id="expiration">expiration</Term>; what you paid is the{" "}
            <Term id="premium">premium</Term>. Traders call the shape the hockey stick.
          </>
        ),
      },
      {
        target: "strikes",
        caption: (
          <>
            Find the diamond where the white line crosses zero. That&apos;s your{" "}
            <Term id="breakeven">breakeven</Term>{" "}— strike <em>plus</em>{" "}premium. &quot;The stock
            went up&quot; and &quot;I made money&quot; are different sentences, separated by what
            you paid. Drag the strike pill under the chart: the kink follows it, and the premium
            reprices.
          </>
        ),
      },
      {
        scene: { strategy: "long-put", view: "payoff" },
        caption: (
          <>
            Flip it. A <Term id="put">put</Term>{" "}is the right to <em>sell</em>{" "}100 shares at the
            strike — the same hockey stick, mirrored. It pays when the stock falls, which makes it
            both a bet on a drop and insurance for shares you already own.
          </>
        ),
      },
      {
        scene: { strategy: "cash-secured-put", view: "payoff" },
        target: "readout",
        caption: (
          <>
            Every contract has two ends. This is a <em>sold</em>{" "}put — you collect the premium (the
            readout bottom-left says you were paid) and take on the obligation. The shelf on the
            right is your capped win: keep the premium. The slope on the left is the promise you
            made. Seller and buyer are mirror images; neither is &quot;the smart side.&quot;
          </>
        ),
      },
    ],
  },
  {
    id: "the-price-of-possibility",
    title: "The price of possibility",
    tagline: "Why an option costs more than it is worth today.",
    minutes: 2,
    steps: [
      {
        scene: { strategy: "long-call", view: "payoff" },
        caption: (
          <>
            Two lines now. White is the option <em>at expiry</em>{" "}— pure cash-in value (
            <Term id="intrinsic">intrinsic</Term>). Blue is the option <em>today</em>. The vertical
            gap between them is <Term id="extrinsic">extrinsic value</Term>{" "}— the price of
            possibility, of every path the stock might still take.
          </>
        ),
      },
      {
        target: "price",
        gate: {
          check: (s, c) => Math.abs((s.whatIfPrice ?? c.spot) - c.spot) / c.spot >= 0.099,
          hint: "drag the price dial at least 10% either way",
        },
        caption: (
          <>
            Drag the price dial well away from today&apos;s price and watch the gap. It&apos;s
            fattest at the strike — where the future is most undecided — and thins toward the
            edges, where the ending feels already written. Options are priced uncertainty. Where
            uncertainty dies, so does the premium.
          </>
        ),
        reveal: (s, c) => {
          const p = s.whatIfPrice ?? c.spot;
          const gap = (S: number) =>
            Math.max(0, markToMarket(c.legs, S, s.elapsedDays, c.market, s.ivScale) - payoffAtExpiry(c.legs, S));
          return (
            <>
              The gap is {usd(gap(p))} at {usd(p)}, against {usd(gap(c.spot))} back at today&apos;s
              price.
            </>
          );
        },
      },
      {
        caption: (
          <>
            Buyers pay the gap hoping the stock outruns it. Sellers collect it hoping it melts on
            schedule. And melt it does — by expiry the gap is always exactly zero. That melt is the
            next tour.
          </>
        ),
      },
    ],
  },
  {
    id: "time",
    title: "Time",
    tagline: "What a quiet month does to a contract, from both sides.",
    minutes: 3,
    steps: [
      {
        scene: { strategy: "long-call", view: "payoff" },
        caption: (
          <>
            The stock is frozen. Only the calendar will move. Prediction time: if most of the month
            passes and the stock <em>doesn&apos;t move at all</em>, what happens to your call?
            Nothing? Small loss? Total loss? Commit.
          </>
        ),
      },
      {
        target: "time",
        gate: {
          check: (s, c) => s.elapsedDays >= Math.max(1, Math.round(c.dte * 0.6)),
          hint: "drag the time dial most of the way",
        },
        caption: (
          <>
            Now drag the <strong>time dial</strong>{" "}and watch the blue line sink onto the white
            one. Nothing went wrong — no bad news. Just <Term id="time-decay">time decay</Term>{" "}
            doing what both sides priced in. Traders call the daily melt{" "}
            <Term id="theta">theta</Term>; it&apos;s in the <Term id="greeks">greeks</Term>{" "}panel on
            the right, in dollars per day.
          </>
        ),
        reveal: (s, c) => {
          const pl = markToMarket(c.legs, c.spot, s.elapsedDays, c.market, s.ivScale);
          const cost = netEntryCost(c.legs);
          const melted = cost > 0 ? Math.round((Math.max(-pl, 0) / cost) * 100) : 0;
          return (
            <>
              {s.elapsedDays} quiet days, stock unchanged: {susd(pl)}. That is {melted}% of what you
              paid, melted, with {Math.max(c.dte - s.elapsedDays, 0)} days still to go.
            </>
          );
        },
      },
      {
        scene: { strategy: "cash-secured-put", view: "payoff" },
        target: "time",
        gate: {
          check: (s, c) => s.elapsedDays >= Math.max(1, Math.round(c.dte * 0.3)),
          hint: "drag the time dial forward",
        },
        caption: (
          <>
            The flip that reorganizes beginners&apos; heads: for the <em>seller</em>, the melt is
            the income. Same dial, same days — watch the readout climb as time passes. Half the
            strategy rail below is, at bottom, machines for standing on this side.
          </>
        ),
      },
      {
        target: "bite",
        caption: (
          <>
            Two warnings before you leave. The melt <em>accelerates</em>{" "}— the last two weeks are
            far steeper than the first two. And endgame mechanics are real: sellers of{" "}
            <Term id="itm-otm">in-the-money</Term>{" "}options get{" "}
            <Term id="assignment">assigned</Term>. Every strategy&apos;s &quot;what can bite&quot;
            panel (the button top-left, or press <span className="figures">i</span>) flags when
            this matters.
          </>
        ),
      },
    ],
  },
  {
    id: "volatility",
    title: "Volatility",
    tagline: "How much drama the market is pricing, and the earnings ambush.",
    minutes: 2,
    steps: [
      {
        scene: { view: "history", reset: true },
        target: "volpanel",
        caption: (
          <>
            This is the market&apos;s forecast made visible: the cone is the{" "}
            <Term id="expected-move">expected move</Term>{" "}— the range options prices give roughly
            2-in-3 odds of containing the stock. Wide cone = expensive drama. The number behind it
            is <Term id="iv">implied volatility</Term>, in the panel on the right, next to what
            the stock <em>actually</em>{" "}delivered (<Term id="hv">historical volatility</Term>).
          </>
        ),
      },
      {
        scene: { strategy: "long-call", view: "payoff" },
        target: "volatility",
        gate: { check: (s) => s.ivScale <= 0.7, hint: "crush the volatility dial to ×0.7 or below" },
        caption: (
          <>
            Now the ambush. You bought this call before <Term id="earnings">earnings</Term>. The
            news lands, uncertainty dies, and the drama premium deflates — that&apos;s{" "}
            <Term id="iv-crush">IV crush</Term>. Crush the <strong>volatility dial</strong>{" "}and
            watch the blue line sink with the stock standing still. Right about direction, wrong
            about the trade: entirely possible, entirely common.
          </>
        ),
      },
      {
        target: "greeks",
        caption: (
          <>
            The sensitivity has a name — <Term id="vega">vega</Term>, dollars per point of IV, on
            the right. <Term id="long-short">Long</Term>{" "}options are long drama; sellers are short
            it. Check the volatility panel in history view (<span className="figures">h</span>)
            before any trade around an event.
          </>
        ),
      },
    ],
  },
  {
    id: "the-greeks",
    title: "The greeks",
    tagline: "The dials you have been turning, given their names.",
    minutes: 2,
    steps: [
      {
        scene: { strategy: "long-call", view: "payoff" },
        target: "greeks",
        caption: (
          <>
            Confession: you already speak the scary language. The price dial is{" "}
            <Term id="delta">delta</Term>. The time dial is <Term id="theta">theta</Term>. The
            volatility dial is <Term id="vega">vega</Term>. And how fast delta itself bends is{" "}
            <Term id="gamma">gamma</Term>. The panel on the right does this arithmetic live for
            the whole position — in dollars, not abstractions.
          </>
        ),
      },
      {
        target: "greeks",
        gate: {
          check: (s) => s.whatIfPrice != null || s.elapsedDays > 0 || s.ivScale !== 1,
          hint: "move any dial and watch the greeks panel",
        },
        caption: (
          <>
            Move any dial and watch the greeks respond. Two extras worth knowing: delta doubles as
            share-equivalence (a 0.50-delta call behaves like 50 shares) and as rough odds — a
            0.16-delta option is priced like a 1-in-6 shot. When strategies here pick
            &quot;16-delta&quot; strikes, that&apos;s the dialect.
          </>
        ),
      },
      {
        scene: { strategy: "iron-condor", view: "payoff" },
        target: "greeks",
        caption: (
          <>
            Graduation: an <Term id="iron-condor">iron condor</Term>{" "}— four{" "}
            <Term id="leg">legs</Term>{" "}selling the middle, buying the <Term id="wing">wings</Term>.
            Look at the greeks: delta near zero (no direction), theta positive (time pays you),
            vega negative (drama hurts). You can now read any strategy on the rail this way. Fly.
          </>
        ),
      },
    ],
  },
  {
    id: "staying-alive",
    title: "Staying alive",
    tagline: "Sizing, the last days, and other seatbelts.",
    minutes: 2,
    steps: [
      {
        scene: { strategy: "iron-condor", view: "map" },
        target: "position",
        caption: (
          <>
            The seatbelt talk, over the map. First rule:{" "}
            <Term id="position-sizing">position sizing</Term>. The max-loss line in the position
            panel on the right is stated in dollars on purpose — read it as &quot;can I lose this
            and genuinely not care?&quot; A 70%-win strategy still loses three in a row eventually;
            sizing is what makes that survivable.
          </>
        ),
      },
      {
        scene: { expiry: "nearest" },
        target: "expiries",
        caption: (
          <>
            Second: respect the last days. This is the <em>nearest</em>{" "}expiry — notice how
            violently the map&apos;s colors swing near the strikes. That concentration is{" "}
            <Term id="gamma">gamma</Term>, and its industrial form is <Term id="0dte">0DTE</Term>{" "}
            trading: statistically the fastest wealth transfer from beginners to the professionals
            on the other side yet devised.
          </>
        ),
      },
      {
        target: "bite",
        caption: (
          <>
            Third: <Term id="liquidity">liquidity</Term>{" "}is a silent fee — every{" "}
            <Term id="leg">leg</Term>{" "}crosses the <Term id="bid-ask">bid–ask spread</Term>{" "}twice,
            and sleepy strikes tax you going both ways. Fourth: events reprice everything (tour 4).
            Fifth: know your exits before your entries — the &quot;what can bite&quot; panel is
            your pre-flight checklist. This instrument is a simulator; every crash in here is
            free. Spend them lavishly.
          </>
        ),
      },
    ],
  },
  {
    id: "earnings-night",
    title: "Earnings night",
    tagline: "Replay the IV crush from both sides of the trade.",
    minutes: 5,
    steps: [
      {
        scene: { ticker: "PULSAR", strategy: "long-straddle", view: "payoff", expiry: "nearest" },
        target: "readout",
        caption: (
          <>
            PULSAR: one drug, one trial, results tonight. <Term id="iv">Implied volatility</Term>{" "}
            is a fire alarm — the market is openly pricing a violent move, it just doesn&apos;t
            know the direction. Neither do you, so you&apos;ve bought the{" "}
            <Term id="straddle">straddle</Term>{" "}on the nearest expiry: call plus put, profit either
            way. Note what it costs bottom-left. That premium is mostly <em>event</em>, not time.
          </>
        ),
      },
      {
        target: "price",
        gate: {
          check: (s, c) => (s.whatIfPrice ?? c.spot) >= c.spot * 1.149,
          hint: "drag the price dial up ~15%",
        },
        caption: (
          <>
            Commit to a prediction first: the drug <em>works</em>, the stock gaps up 15–20%
            overnight, and the straddle prints money… right? Drag the{" "}
            <strong>price dial</strong>{" "}up about 15% and read the P/L. Remember that number —
            it&apos;s tonight&apos;s fantasy, priced at <em>tonight&apos;s</em>{" "}volatility.
          </>
        ),
        reveal: (s, c) => {
          const p = c.spot * 1.15;
          const pl = markToMarket(c.legs, p, s.elapsedDays, c.market, s.ivScale);
          return (
            <>
              Tonight&apos;s fantasy: at +15% ({usd(p)}) the straddle shows {susd(pl)}. Hold that
              number.
            </>
          );
        },
      },
      {
        scene: { dials: { pricePct: 0.15, days: 1, iv: 0.55 } },
        target: "volatility",
        caption: (
          <>
            Morning. The news is out — and <em>certainty killed the alarm</em>. One day passed and
            implied volatility collapsed (the dial now reads ×0.55, a normal-sized post-event
            crush). Same 15% gap, dramatically less profit. The difference between last
            night&apos;s fantasy and this number is the <Term id="iv-crush">IV crush</Term>: you
            were long <Term id="vega">vega</Term>{" "}through the one moment vega was guaranteed to
            fall.
          </>
        ),
      },
      {
        target: "volatility",
        gate: { check: (s) => s.ivScale <= 0.5, hint: "drag volatility to ×0.50" },
        caption: (
          <>
            The crush was <em>already in the price</em>{" "}— sellers demanded that fat premium
            precisely because they knew uncertainty dies at 8am. Feel the sensitivity yourself:
            drag <strong>volatility</strong>{" "}the last notch to ×0.50 and watch the readout sag
            further. Buying options into a known event means the move must beat the crush{" "}
            <em>and</em>{" "}the premium.
          </>
        ),
      },
      {
        scene: {
          strategy: "iron-condor",
          view: "payoff",
          expiry: "nearest",
          // park the shorts about one expected move out — the delta
          // defaults sit so far away at this IV that the credit gets thin
          overrides: (c) => {
            const putShort = c.nearest("put", c.spot - 0.7 * c.em);
            const callShort = c.nearest("call", c.spot + 0.7 * c.em);
            const putWing = c.stepStrike("put", putShort, -2);
            const callWing = c.stepStrike("call", callShort, 2);
            // a thin chain can run out of strikes; a wing on top of its
            // short is no wing at all, so that leg keeps its own default
            return {
              putShort,
              callShort,
              ...(putWing < putShort ? { putWing } : {}),
              ...(callWing > callShort ? { callWing } : {}),
            };
          },
        },
        target: "readout",
        caption: (
          <>
            Now fly the other side of the same night. The <em>iron condor sells</em>{" "}the drama —
            we&apos;ve parked the <Term id="long-short">short</Term>{" "}strikes about one{" "}
            <Term id="expected-move">expected move</Term>{" "}out. For promising PULSAR stays between
            them through expiry, you collect the <Term id="credit-debit">credit</Term>{" "}bottom-left
            — nearly half the width of the wings, because at this IV nobody believes in
            &quot;between&quot;.
          </>
        ),
      },
      {
        target: "time",
        gate: {
          check: (s) => s.elapsedDays >= 1 && s.ivScale <= 0.6,
          hint: "advance time +1d, crush vol to ≤ ×0.60",
        },
        caption: (
          <>
            Rerun the morning from the short side: push <strong>time</strong>{" "}forward one day and
            drag <strong>volatility</strong>{" "}down to ×0.60. The same crush that ate the straddle
            now <em>pays you</em>{" "}— blue before the stock even picks a direction. The crush is
            symmetric; only your side of it changes.
          </>
        ),
        reveal: (s, c) => {
          const pl = markToMarket(c.legs, c.spot, s.elapsedDays, c.market, s.ivScale);
          return (
            <>
              {susd(pl)} with the stock still at {usd(c.spot)} — the same crush, from the other
              side.
            </>
          );
        },
      },
      {
        target: "price",
        caption: (
          <>
            Before the condor feels like free money: drag the <strong>price dial</strong>{" "}to
            either edge. A real binary outcome can gap straight through your shorts, and the gap
            doesn&apos;t care what happened to volatility. That&apos;s the whole trade-off of{" "}
            <Term id="earnings">earnings</Term>{" "}night — buyers need the move to beat the crush,
            sellers need the crush to beat the move, and the premium is where the market votes.
            Neither side is free; now you&apos;ve flown both.
          </>
        ),
      },
    ],
  },
];

export const tourById = new Map(TOURS.map((t) => [t.id, t]));
/** honest end-to-end estimate for a first-timer who taps the terms */
export const TOTAL_MINUTES = TOURS.reduce((a, t) => a + t.minutes, 0);
