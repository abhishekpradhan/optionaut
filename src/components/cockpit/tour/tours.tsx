import type { ReactNode } from "react";
import { Term } from "@/components/learn/Term";
import { useCockpit } from "@/lib/cockpit/store";

/**
 * Tours: the unit lessons (PLAN.md §4.1) reborn as guided flights of
 * the real instrument. Each step can reconfigure the cockpit and can
 * gate progress on the learner actually doing the thing (Nicky Case's
 * cognitive gates). Captions follow the house voice: phenomenon first,
 * name second, every term tappable.
 */

type S = ReturnType<typeof useCockpit.getState>;

export interface TourStep {
  caption: ReactNode;
  /** applied on entering the step */
  setup?: (s: S) => void;
  /** blocks Next until true; hint shows what to do */
  gate?: { check: (s: S) => boolean; hint: string };
}

export interface Tour {
  id: string;
  title: string;
  tagline: string;
  steps: TourStep[];
}

const base = (s: S) => {
  s.setView("payoff");
  s.resetDials();
};

export const TOURS: Tour[] = [
  {
    id: "read-the-diagram",
    title: "Read the diagram",
    tagline: "Shares, calls, and the kink that changes everything.",
    steps: [
      {
        setup: (s) => { s.setStrategy("long-shares", null); base(s); },
        caption: (
          <>
            Start with the honest baseline: owning 100 <Term id="share">shares</Term>. This is a{" "}
            <Term id="payoff-diagram">payoff diagram</Term>{" "}— stock price runs left to right,
            your <Term id="pl">profit or loss</Term>{" "}runs up and down. One picture, every
            outcome. Shares are a perfect 45° line: no kinks, no tricks, no expiry.
          </>
        ),
      },
      {
        gate: { check: (s) => s.whatIfPrice != null, hint: "drag the price dial (right panel)" },
        caption: (
          <>
            Before you move anything: if the stock drops 10%, what do 100 shares lose? Commit to
            a number. Now drag the <strong>price dial</strong> and watch the big readout
            bottom-left check your answer.
          </>
        ),
      },
      {
        setup: (s) => { s.setStrategy("long-call", null); base(s); },
        caption: (
          <>
            Now the interesting distortion: a <Term id="call">call</Term>{" "}— the right to buy 100
            shares at the <Term id="strike">strike</Term>{" "}until{" "}
            <Term id="expiration">expiration</Term>, for a <Term id="premium">premium</Term>{" "}paid
            today. The famous hockey stick: flat on the left (worst case = the premium, fully
            prepaid), rising dollar-for-dollar on the right.
          </>
        ),
      },
      {
        caption: (
          <>
            Find the diamond where the white line crosses zero. That&apos;s your{" "}
            <Term id="breakeven">breakeven</Term>{" "}— strike <em>plus</em>{" "}premium.
            &quot;The stock went up&quot; and &quot;I made money&quot; are different sentences,
            separated by what you paid. Try dragging the strike pill under the chart: the kink
            follows it, and the entry price reprices.
          </>
        ),
      },
      {
        setup: (s) => { s.setStrategy("cash-secured-put", null); base(s); },
        caption: (
          <>
            Every contract has two ends. This is a <em>sold</em> <Term id="put">put</Term>{" "}— you
            collect the premium and take on the obligation. The shelf on the right is your
            capped win (keep the premium); the slope on the left is the promise you made. Seller
            and buyer are mirror images; neither is &quot;the smart side.&quot;
          </>
        ),
      },
    ],
  },
  {
    id: "the-price-of-possibility",
    title: "The price of possibility",
    tagline: "Two lines, and the gap that is the whole game.",
    steps: [
      {
        setup: (s) => { s.setStrategy("long-call", null); base(s); },
        caption: (
          <>
            Two lines now. White is the option <em>at expiry</em>{" "}— pure cash-in value
            (<Term id="intrinsic">intrinsic</Term>). Blue is the option <em>today</em>. The
            vertical gap between them is <Term id="extrinsic">extrinsic value</Term>{" "}— the price
            of possibility, of every path the stock might still take.
          </>
        ),
      },
      {
        gate: { check: (s) => s.whatIfPrice != null && Math.abs(s.whatIfPrice) > 0, hint: "drag the price dial far to one side" },
        caption: (
          <>
            Drag the price dial far in either direction and watch the gap. It&apos;s fattest at
            the strike — where the future is most undecided — and thins toward the edges, where
            the ending feels already written. Options are priced uncertainty. Where uncertainty
            dies, so does the premium.
          </>
        ),
      },
      {
        caption: (
          <>
            Buyers pay the gap hoping the stock outruns it. Sellers collect it hoping it melts
            on schedule. And melt it does — by expiry the gap is always exactly zero. That melt
            is the next tour.
          </>
        ),
      },
    ],
  },
  {
    id: "time",
    title: "Time",
    tagline: "Watch value melt — the force that never stops.",
    steps: [
      {
        setup: (s) => { s.setStrategy("long-call", null); base(s); },
        caption: (
          <>
            The stock is frozen. Only the calendar will move. Prediction time: if thirty days
            pass and the stock <em>doesn&apos;t move at all</em>, what happens to your call?
            Nothing? Small loss? Total loss? Commit.
          </>
        ),
      },
      {
        gate: { check: (s) => s.elapsedDays >= Math.max(20, 1), hint: "drag the time dial most of the way" },
        caption: (
          <>
            Now drag the <strong>time dial</strong> and watch the blue line sink onto the white
            one. Nothing went wrong — no bad news. Just <Term id="time-decay">time decay</Term>{" "}
            doing what both sides priced in. Traders call the daily melt{" "}
            <Term id="theta">theta</Term>; it&apos;s in the greeks panel on the right, in
            dollars per day.
          </>
        ),
      },
      {
        setup: (s) => { s.setStrategy("cash-secured-put", null); base(s); },
        gate: { check: (s) => s.elapsedDays >= 10, hint: "drag the time dial forward" },
        caption: (
          <>
            The flip that reorganizes beginners&apos; heads: for the <em>seller</em>, the melt
            is the income. Same dial, same days — watch the readout climb as time passes. Half
            the strategy rail below is, at bottom, machines for standing on this side.
          </>
        ),
      },
      {
        caption: (
          <>
            Two warnings before you leave. The melt <em>accelerates</em>{" "}— the last two weeks
            are far steeper than the first two. And endgame mechanics are real: sellers of
            in-the-money options get <Term id="assignment">assigned</Term>. Every strategy&apos;s
            &quot;what can bite&quot; panel (press <span className="figures">i</span>) flags when
            this matters.
          </>
        ),
      },
    ],
  },
  {
    id: "volatility",
    title: "Volatility",
    tagline: "The price of drama — and the earnings ambush.",
    steps: [
      {
        setup: (s) => { s.setView("history"); s.resetDials(); },
        caption: (
          <>
            This is the market&apos;s forecast made visible: the cone is the{" "}
            <Term id="expected-move">expected move</Term>{" "}— the range options prices give
            roughly 2-in-3 odds of containing the stock. Wide cone = expensive drama. The number
            behind it is <Term id="iv">implied volatility</Term>, in the panel on the right,
            next to what the stock <em>actually</em>{" "}delivered (<Term id="hv">historical volatility</Term>).
          </>
        ),
      },
      {
        setup: (s) => { s.setStrategy("long-call", null); base(s); },
        gate: { check: (s) => s.ivScale <= 0.7, hint: "crush the volatility dial to ×0.7 or below" },
        caption: (
          <>
            Now the ambush. You bought this call before &quot;earnings.&quot; The news lands,
            uncertainty dies, and the drama premium deflates — that&apos;s{" "}
            <Term id="iv-crush">IV crush</Term>. Crush the <strong>volatility dial</strong> and
            watch the blue line sink with the stock standing still. Right about direction,
            wrong about the trade: entirely possible, entirely common.
          </>
        ),
      },
      {
        caption: (
          <>
            The sensitivity has a name — <Term id="vega">vega</Term>, dollars per point of IV,
            on the right. Long options are long drama; sellers are short it. Check the
            volatility panel in history view (<span className="figures">h</span>) before any
            trade around an event.
          </>
        ),
      },
    ],
  },
  {
    id: "the-greeks",
    title: "The greeks",
    tagline: "Surprise: you already know them.",
    steps: [
      {
        setup: (s) => { s.setStrategy("long-call", null); base(s); },
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
        gate: {
          check: (s) => s.whatIfPrice != null || s.elapsedDays > 0 || s.ivScale !== 1,
          hint: "move any dial and watch the greeks panel",
        },
        caption: (
          <>
            Move any dial and watch the greeks respond. Two extras worth knowing: delta doubles
            as share-equivalence (a 0.50-delta call behaves like 50 shares) and as rough odds —
            a 0.16-delta option is priced like a 1-in-6 shot. When strategies here pick
            &quot;16-delta&quot; strikes, that&apos;s the dialect.
          </>
        ),
      },
      {
        setup: (s) => { s.setStrategy("iron-condor", null); base(s); },
        caption: (
          <>
            Graduation: an <span className="font-medium">iron condor</span> — four legs selling
            the middle, buying the <Term id="wing">wings</Term>. Look at the greeks: delta near
            zero (no direction), theta positive (time pays you), vega negative (drama hurts).
            You can now read any strategy on the rail this way. Fly.
          </>
        ),
      },
    ],
  },
  {
    id: "staying-alive",
    title: "Staying alive",
    tagline: "Sizing, the last days, and other seatbelts.",
    steps: [
      {
        setup: (s) => { s.setStrategy("iron-condor", null); base(s); s.setView("map"); },
        caption: (
          <>
            The seatbelt talk, over the map. First rule:{" "}
            <Term id="position-sizing">position sizing</Term>. The max-loss number bottom-left
            is stated in dollars on purpose — read it as &quot;can I lose this and genuinely
            not care?&quot; A 70%-win strategy still loses three in a row eventually; sizing is
            what makes that survivable.
          </>
        ),
      },
      {
        setup: (s) => { s.setExpIndex(0); },
        caption: (
          <>
            Second: respect the last days. This is the <em>nearest</em>{" "}expiry — notice how
            violently the map&apos;s colors swing near the strikes. That concentration is{" "}
            <Term id="gamma">gamma</Term>, and its industrial form is{" "}
            <Term id="0dte">0DTE</Term>{" "}trading: statistically the fastest wealth transfer from
            beginners to market makers yet devised.
          </>
        ),
      },
      {
        caption: (
          <>
            Third: <Term id="liquidity">liquidity</Term>{" "}is a silent fee — every leg crosses the{" "}
            <Term id="bid-ask">bid–ask spread</Term>{" "}twice, and sleepy strikes tax you going
            both ways. Fourth: events reprice everything (tour 4). Fifth: know your exits before
            your entries — the &quot;what can bite&quot; panel is your pre-flight checklist.
            This instrument is a simulator; every crash in here is free. Spend them lavishly.
          </>
        ),
      },
    ],
  },
  {
    id: "earnings-night",
    title: "Earnings night",
    tagline: "Replay the IV crush — from both sides of the trade.",
    steps: [
      {
        setup: (s) => {
          if (s.ticker !== "PULSAR") s.setTicker("PULSAR");
          s.setStrategy("long-straddle", null);
          base(s);
          s.setExpIndex(0);
        },
        caption: (
          <>
            PULSAR: one drug, one trial, results tonight. <Term id="iv">Implied volatility</Term>{" "}
            is a fire alarm — the market is openly pricing a violent move, it just doesn&apos;t
            know the direction. Neither do you, so you&apos;ve bought the{" "}
            <em>straddle</em>{" "}on the nearest expiry: call plus put, profit
            either way. Note what it costs bottom-left. That premium is mostly{" "}
            <em>event</em>, not time.
          </>
        ),
      },
      {
        gate: { check: (s) => (s.whatIfPrice ?? 0) >= 52.9, hint: "drag the price dial up ~15%" },
        caption: (
          <>
            Commit to a prediction first: the drug <em>works</em>, the stock gaps up 15–20%
            overnight, and the straddle prints money… right? Drag the{" "}
            <strong>price dial</strong>{" "}up about 15% and read the P/L. Remember that number —
            it&apos;s tonight&apos;s fantasy, priced at <em>tonight&apos;s</em>{" "}volatility.
          </>
        ),
      },
      {
        setup: (s) => { s.setElapsedDays(1); s.setIvScale(0.55); },
        caption: (
          <>
            Morning. The news is out — and <em>certainty killed the alarm</em>. One day passed
            and implied volatility collapsed (the dial now reads ×0.55, a normal-sized
            post-event crush). Same 15% gap, dramatically less profit. The difference between
            last night&apos;s fantasy and this number is the{" "}
            <Term id="iv-crush">IV crush</Term>: you were long{" "}
            <Term id="vega">vega</Term>{" "}through the one moment vega was guaranteed to fall.
          </>
        ),
      },
      {
        gate: { check: (s) => s.ivScale <= 0.5, hint: "drag volatility to ×0.50" },
        caption: (
          <>
            The crush was <em>already in the price</em>{" "}— sellers demanded that fat premium
            precisely because they knew uncertainty dies at 8am. Feel the sensitivity yourself:
            drag <strong>volatility</strong>{" "}the last notch to ×0.50 and watch the readout
            sag further. Buying options into a known event means the move must beat the crush{" "}
            <em>and</em>{" "}the premium.
          </>
        ),
      },
      {
        setup: (s) => {
          s.setStrategy("iron-condor", null);
          base(s);
          s.setExpIndex(0);
          // park the shorts about one expected move out — the delta
          // defaults sit so far away at this IV that the credit gets thin
          s.hydrateShared({
            overrides: { putWing: 39, putShort: 41, callShort: 51, callWing: 53 },
          });
        },
        caption: (
          <>
            Now fly the other side of the same night. The <em>iron condor sells</em>{" "}the
            drama — we&apos;ve parked the short strikes about one{" "}
            <Term id="expected-move">expected move</Term>{" "}out. For promising PULSAR stays
            between them through the readout, you collect the credit bottom-left — nearly
            half the width of the wings, because at this IV nobody believes in
            &quot;between&quot;.
          </>
        ),
      },
      {
        gate: {
          check: (s) => s.elapsedDays >= 1 && s.ivScale <= 0.6,
          hint: "advance time +1d, crush vol to ≤ ×0.60",
        },
        caption: (
          <>
            Rerun the morning from the short side: push <strong>time</strong>{" "}forward one day
            and drag <strong>volatility</strong>{" "}down to ×0.60. The same crush that ate the
            straddle now <em>pays you</em>{" "}— green before the stock even picks a direction.
            The crush is symmetric; only your side of it changes.
          </>
        ),
      },
      {
        caption: (
          <>
            Before the condor feels like free money: drag the <strong>price dial</strong>{" "}to
            either edge. A real binary outcome can gap straight through your shorts, and the
            gap doesn&apos;t care what happened to volatility. That&apos;s the whole trade-off
            of earnings night — buyers need the move to beat the crush, sellers need the crush
            to beat the move, and the premium is where the market votes. Neither side is free;
            now you&apos;ve flown both.
          </>
        ),
      },
    ],
  },
];

export const tourById = new Map(TOURS.map((t) => [t.id, t]));
