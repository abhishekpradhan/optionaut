"use client";

import * as React from "react";
import Link from "next/link";
import { Term } from "./Term";
import { MiniLab, type MiniLeg } from "./MiniLab";
import { bsPrice } from "@/lib/options/blackScholes";

/**
 * Units 1–6 + 10. Written to the house rules (PLAN.md §4.2): phenomenon
 * first, name second; every term tappable; text stands alone, dragging
 * deepens. All widgets use round synthetic numbers ($100 stock), priced
 * honestly by the same Black-Scholes engine as the Lab.
 */

const T30 = 30 / 365;
const RQ = { r: 0.04, q: 0 };
const px = (kind: "call" | "put", K: number, dte = 30, sigma = 0.3) =>
  +bsPrice(kind, { S: 100, K, T: dte / 365, ...RQ, sigma }).toFixed(2);

const CALL_ATM: MiniLeg = { kind: "call", side: 1, strike: 100, entryPrice: px("call", 100), iv: 0.3, dte: 30 };
const STOCK: MiniLeg = { kind: "stock", side: 1, strike: 0, entryPrice: 100, iv: 0, dte: 0 };

// ————— building blocks —————

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-4 text-[15px] leading-relaxed text-secondary-foreground/90">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-lg font-bold tracking-tight text-foreground">{children}</h2>;
}

function Predict({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-5 rounded-lg border border-primary/25 bg-accent/40 px-4 py-3 text-[13.5px] leading-relaxed text-accent-foreground">
      <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-primary">
        Predict first
      </span>
      {children}
    </aside>
  );
}

function TryReal({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="my-6 text-[13.5px]">
      <Link href={href} className="font-medium text-primary hover:underline">
        {children} →
      </Link>
    </div>
  );
}

// ————— Unit 1 · Own a share —————

function U1() {
  return (
    <>
      <P>
        Every complicated thing in this app is a variation on one simple picture, so let&apos;s
        earn that picture first. You buy one hundred <Term id="share">shares</Term> of a $100
        stock: $10,000. No contracts, no deadlines, no fine print — you own a slice of a
        company, and its price will do what prices do.
      </P>
      <P>
        The chart below is a <Term id="payoff-diagram">payoff diagram</Term>, the x-ray machine
        we&apos;ll point at every trade from here on. Left-to-right is where the stock{" "}
        <em>could</em> go. Up-and-down is your <Term id="pl">profit or loss</Term> if it does.
        One picture, every outcome at once.
      </P>
      <Predict>
        Before you touch the slider: if the stock drops to $85, what does your position lose?
        Say a number out loud. Then drag and check yourself.
      </Predict>
      <MiniLab
        legs={[STOCK]}
        dials={["price"]}
        showToday={false}
        caption={
          <>
            100 shares bought at $100. The line is a perfect 45° — every $1 of stock is $100 of
            P/L, up or down, forever. Boring is the point: this is the baseline.
          </>
        }
      />
      <P>
        Three reading habits to build now: find where the line crosses zero (here, exactly at
        your $100 purchase price — shares have no fee to overcome). Check the ends (no caps —
        the line runs off both edges; your gain is open and your loss runs all the way to a
        stock price of zero). And notice there&apos;s only <em>one</em> line here. Options will
        add a second one, and the space between them is where all the secrets live.
      </P>
      <P>
        Everything that follows — calls, spreads, condors — is someone taking scissors and tape
        to this line: capping a piece, flipping a piece, selling a piece to someone else. If a
        diagram ever confuses you, come back to this one.
      </P>
    </>
  );
}

// ————— Unit 2 · The contract —————

function U2() {
  const prem = px("call", 100);
  return (
    <>
      <P>
        Now the interesting distortion. An <Term id="option">option</Term> is a contract about
        the <em>future</em>: for a price today, you get the right — never the obligation — to
        trade 100 shares at a fixed price, until a fixed date. Like putting a small,
        non-refundable deposit on a house at today&apos;s price while you decide.
      </P>
      <P>
        A <Term id="call">call</Term> is the right to <em>buy</em> at the{" "}
        <Term id="strike">strike</Term> price before <Term id="expiration">expiration</Term>.
        The deposit is called the <Term id="premium">premium</Term> — here ${prem.toFixed(2)}{" "}
        per share, and since one <Term id="contract-multiplier">contract</Term>{" "}covers 100
        shares, that&apos;s ${(prem * 100).toFixed(0)} of real money.
      </P>
      <Predict>
        The stock finishes at $110 and your strike is $100. The right to buy at $100 something
        worth $110 must be worth about… what, per share? Now — what if the stock finishes at
        $99? Drag and check both.
      </Predict>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["price", "strike"]}
        showToday={false}
        premiumOfStrike={(k) => px("call", k)}
        strikeRange={[85, 115]}
        caption={
          <>
            The famous hockey stick. Flat on the left: below the strike the option dies
            worthless and you lose exactly the premium — no more, ever. Rising on the right:
            above the strike it&apos;s worth a dollar per dollar. Move the strike dial and
            watch the kink follow it — and watch the premium reprice: rights that are easier to
            cash in cost more.
          </>
        }
      />
      <P>
        Notice where the line crosses zero: not at the strike, but at strike <em>plus</em>{" "}
        premium — your <Term id="breakeven">breakeven</Term>. &quot;The stock went up&quot; and
        &quot;I made money&quot; are different sentences, separated by the premium you paid.
      </P>
      <P>
        A <Term id="put">put</Term> is the mirror image — the right to <em>sell</em> at the
        strike, so it pays when the stock falls. Same kink, same logic, flipped left-for-right.
      </P>

      <H2>Every contract has two ends</H2>
      <P>
        Your premium didn&apos;t vanish — someone pocketed it, and took on the obligation that
        backs your right. Flip the switch below and feel the deal from their side: their profit
        is your loss, mirror-exact. Neither side is &quot;the smart side.&quot; They&apos;re
        just different bets, <Term id="long-short">long and short</Term>.
      </P>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["price", "side"]}
        showToday={false}
        caption={
          <>
            The seller keeps the premium if the stock stays put — and pays out dollar-for-dollar
            above the strike, without a cap. Remember this picture when a strategy later
            says &quot;sell a call&quot;: this shape is what you&apos;re signing.
          </>
        }
      />
      <TryReal href="/lab/AAPL/long-call">Open a real long call in the Lab</TryReal>
    </>
  );
}

// ————— Unit 3 · What an option costs —————

function U3() {
  return (
    <>
      <P>
        Here&apos;s a puzzle. A call struck at $100 on a $100 stock has, right now, zero
        cash-in value — using it today buys you nothing. Yet it trades for real money. Why?
      </P>
      <P>
        Because an option&apos;s price has two ingredients.{" "}
        <Term id="intrinsic">Intrinsic value</Term> is what using it today would collect: a
        $100-strike call on a $105 stock has $5 of it. Whether an option has any is what
        traders mean by <Term id="itm-otm">in or out of the money</Term>. Everything else is{" "}
        <Term id="extrinsic">extrinsic value</Term> — the price of <em>possibility</em>, of
        every path the stock might still take before expiration.
      </P>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["price"]}
        caption={
          <>
            Two lines now. White is the option at expiry — pure intrinsic value. Blue is the
            option <em>today</em>. The vertical gap between them is extrinsic value, made
            visible. Drag the price and watch the gap: it&apos;s fattest right at the strike,
            where the future is most undecided, and thins out deep in either direction, where
            the ending feels already written.
          </>
        }
      />
      <Predict>
        Park the slider far right, at $128. The blue line has almost merged with the white one.
        Why would the market charge almost nothing beyond cash-in value there? What
        uncertainty is left to pay for?
      </Predict>
      <P>
        This gap is the heart of the whole game. Buyers pay it, hoping the stock outruns it.
        Sellers collect it, hoping it melts on schedule. And melt it does — by expiration,
        extrinsic value is always exactly zero. The blue line doesn&apos;t just sit above the
        white one; it is falling toward it, every day. That melt is the next lesson.
      </P>
      <P>
        One practical footnote while we&apos;re pricing things: quotes come as a{" "}
        <Term id="bid-ask">bid and an ask</Term>, and this app fills you at the{" "}
        <Term id="mid">mid</Term> — halfway between. Real fills land a shade worse, and on
        sleepy strikes with little <Term id="open-interest">open interest</Term>, a lot worse.
        The spread is a toll booth you pass twice.
      </P>
      <TryReal href="/lab/NVDA/long-call">See the two lines on a real ticker</TryReal>
    </>
  );
}

// ————— Unit 4 · Time —————

function U4() {
  return (
    <>
      <P>
        Last lesson ended on a threat: the blue line is falling toward the white one. Let&apos;s
        watch it happen. The widget below has a new dial — it moves the calendar.
      </P>
      <Predict>
        Set the stock slider dead on $100 and leave it. If thirty days pass and the stock{" "}
        <em>doesn&apos;t move at all</em>, what happens to your call? Nothing? Small loss?
        Total loss? Commit to an answer, then drag the days.
      </Predict>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["time", "price"]}
        caption={
          <>
            The melt. With the stock frozen, the blue line sinks day by day until it lies flat
            on the white one — and an at-the-money call rides that line to zero. Nothing went
            wrong. No bad news. Just <Term id="time-decay">time decay</Term> doing exactly what
            both sides priced in.
          </>
        }
      />
      <P>
        Traders call the speed of this melt <Term id="theta">theta</Term>: dollars lost per
        quiet day. Two things make it dangerous to underestimate. It&apos;s relentless —
        weekends and holidays melt too. And it <em>accelerates</em>: the melt in the final two
        weeks is far steeper than in the first two, because possibility runs out fastest at the
        end. (Notice the <Term id="dte">DTE</Term> counter on every strategy page — days to
        expiration is a vital sign.)
      </P>
      <P>
        Now the flip that reorganizes most beginners&apos; heads: for the seller, this exact
        melt is the <em>income</em>. Try the buyer/seller switch with the time dial — as the
        buyer bleeds, the seller collects. Half the strategies in the gallery are, at bottom,
        machines for being on the receiving end of theta.
      </P>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["time", "side"]}
        caption={<>Same melt, opposite bank accounts.</>}
      />
      <P>
        Endgame mechanics, briefly: if your option finishes worth something, you can{" "}
        <Term id="exercise">exercise</Term>{" "}it — but mostly you&apos;ll just sell it before
        expiry. If you&apos;re the <em>seller</em> of an in-the-money option, expect{" "}
        <Term id="assignment">assignment</Term>: the shares change hands at the strike, and on
        American-style options that can even happen early. Every strategy page&apos;s
        &quot;What can bite&quot; box flags when this matters.
      </P>
      <TryReal href="/lab/TSLA/long-call">Race theta on a real ticker</TryReal>
    </>
  );
}

// ————— Unit 5 · Volatility —————

function U5() {
  return (
    <>
      <P>
        Two stocks both trade at $100. One is a utility that moves 0.3% on a wild day; the
        other routinely swings 4% before lunch. Should a one-month $105 call cost the same on
        both?
      </P>
      <P>
        Obviously not — the swingy one has a real shot at $110 and the sleepy one doesn&apos;t.
        The size of a stock&apos;s typical wiggle is its{" "}
        <Term id="volatility">volatility</Term>, and it is the third great force in option
        pricing, after price and time. The market&apos;s <em>forecast</em> of future wiggle,
        extracted from what options cost right now, is called{" "}
        <Term id="iv">implied volatility</Term> — IV. What the stock actually did lately is{" "}
        <Term id="hv">historical volatility</Term>. The gap between them is the market&apos;s
        opinion, in numbers.
      </P>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["iv", "price"]}
        caption={
          <>
            The volatility dial re-prices possibility itself. Crank it and the blue line
            inflates — more imaginable futures, more extrinsic value. Crush it and the line
            deflates toward the white skeleton. The stock price never moved.
          </>
        }
      />
      <P>
        That inflation has a per-point price tag traders call{" "}
        <Term id="vega">vega</Term> — but feel it first: a long option is a bet on drama, and
        drama has a market price that rises and falls like any other.
      </P>

      <H2>The earnings-day ambush</H2>
      <P>
        Here is the most expensive lesson in beginner options, free of charge. Before a known
        event — earnings, above all — IV inflates: everyone knows a jump is coming, so
        possibility costs extra. The moment the news lands, the uncertainty is spent, and IV
        collapses. That collapse is <Term id="iv-crush">IV crush</Term>.
      </P>
      <Predict>
        Simulate it: you bought this call before &quot;earnings.&quot; The stock obliges and
        gaps from $100 up to $106 — but the event is over, so drag volatility from ×1.0 down
        to ×0.6. Right about the direction. What happened to your money?
      </Predict>
      <MiniLab
        legs={[{ ...CALL_ATM, iv: 0.45, entryPrice: +bsPrice("call", { S: 100, K: 100, T: T30, r: 0.04, q: 0, sigma: 0.45 }).toFixed(2) }]}
        dials={["iv", "price"]}
        caption={
          <>
            Bought at 45% IV for ${bsPrice("call", { S: 100, K: 100, T: T30, r: 0.04, q: 0, sigma: 0.45 }).toFixed(2)} — event pricing. A six-dollar rally can still
            lose money once the drama premium deflates. Direction right, trade wrong: entirely
            possible, entirely common.
          </>
        }
      />
      <P>
        One more place you&apos;ve already met IV: the cone on every ticker&apos;s overview
        page is IV drawn as a picture — the{" "}
        <Term id="expected-move">expected move</Term>, the range the market gives roughly 2-in-3
        odds of containing the stock. Strategies that <em>sell</em> premium are bets the stock
        stays inside the cone; strategies that buy it need the stock to escape.
      </P>
      <TryReal href="/t/AMD">AMD&apos;s IV is wild right now — go look at its cone</TryReal>
    </>
  );
}

// ————— Unit 6 · The greeks —————

function U6() {
  return (
    <>
      <P>
        Time for a confession: you already speak the scary language. Every dial you&apos;ve
        dragged in these lessons has a formal name — the{" "}
        <Term id="greeks">greeks</Term>, the standard sensitivities every trading platform
        displays and every beginner dreads. You learned them backwards, which is to say: the
        right way around.
      </P>
      <div className="my-5 overflow-x-auto">
        <table className="w-full min-w-105 border-separate border-spacing-0 text-[13.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="border-b border-border px-3 py-2 font-medium">You dragged</th>
              <th className="border-b border-border px-3 py-2 font-medium">Its name</th>
              <th className="border-b border-border px-3 py-2 font-medium">It answers</th>
            </tr>
          </thead>
          <tbody className="text-secondary-foreground/90">
            {[
              ["The stock-price dial", "delta", "How much do I make per $1 of stock move?"],
              ["(how delta itself bent)", "gamma", "How fast does that answer change?"],
              ["The time dial", "theta", "What does one quiet day cost — or pay?"],
              ["The volatility dial", "vega", "What does one point of IV do to me?"],
            ].map(([a, b, c]) => (
              <tr key={b as string}>
                <td className="border-b border-border/60 px-3 py-2.5">{a}</td>
                <td className="figures border-b border-border/60 px-3 py-2.5 font-semibold text-foreground">{b}</td>
                <td className="border-b border-border/60 px-3 py-2.5 text-muted-foreground">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        <Term id="delta">Delta</Term>{" "}deserves two extra sentences. First: it&apos;s
        share-equivalence — a 0.50-delta call behaves like 50 shares, which is how a $350
        option &quot;feels like&quot; a $17,000 stock position. Second: traders also read
        delta as rough odds — a 0.16-delta option is priced like a one-in-six shot of
        finishing in the money. When strategy pages here pick &quot;16-delta&quot; strikes,
        that&apos;s the dialect being spoken.
      </P>
      <P>
        <Term id="gamma">Gamma</Term>{" "}is the sleeper. It says how violently delta itself
        swings, it concentrates at the strike as expiration approaches, and it is the entire
        reason last-day options behave like live wires. You&apos;ll meet it properly in the
        risk lesson.
      </P>
      <MiniLab
        legs={[CALL_ATM]}
        dials={["price", "time", "iv"]}
        caption={
          <>
            All three dials, one option — the full instrument panel. Watch the readout as you
            fly it. In the Lab, the greeks strip under every strategy does this arithmetic for
            the whole position and phrases each number as behavior.
          </>
        }
      />
      <P>
        That&apos;s the core curriculum. From here the best classroom is the Lab itself: every
        strategy page teaches its own shape, its own greeks profile, and its own failure modes
        — with real prices and zero stakes.
      </P>
      <TryReal href="/lab/SPY/iron-condor">Graduate: open an iron condor and read its greeks strip</TryReal>
    </>
  );
}

// ————— Unit 10 · Staying alive —————

function U10() {
  return (
    <>
      <P>
        No widget this time. This is the seatbelt talk, and it&apos;s short because every rule
        is simple — just relentlessly easy to ignore.
      </P>
      <H2>Size like you expect to be wrong</H2>
      <P>
        The one non-negotiable. <Term id="position-sizing">Position sizing</Term> — risking a
        small fixed slice of your account per idea, a few percent at most — is what makes every
        other skill survivable. A 70%-win-rate strategy loses three times in a row eventually;
        the trader betting 5% a time shrugs, the one betting 50% is gone. Notice that the max-loss
        tile in the Lab is always stated in dollars: read it as &quot;can I lose this much and
        genuinely not care?&quot;
      </P>
      <H2>Respect the last days</H2>
      <P>
        Near expiration, <Term id="gamma">gamma</Term>{" "}concentrates and P/L starts whipping on
        every tick — the calm strategies get loud precisely when there&apos;s least time to
        react. The industrial-strength version is <Term id="0dte">0DTE</Term> trading, options
        expiring today: statistically the fastest wealth-transfer mechanism from beginners to
        market makers yet devised. Feel it safely instead: open any Lab strategy at the
        7-day expiry and compare its heatmap to the 88-day one.
      </P>
      <H2>Illiquidity is a silent fee</H2>
      <P>
        Every leg crosses the <Term id="bid-ask">bid–ask spread</Term>{" "}twice. On busy strikes
        that&apos;s pennies; on sleepy ones it can quietly eat half a strategy&apos;s edge.
        Check <Term id="open-interest">open interest</Term> and prefer boring, busy strikes —{" "}
        <Term id="liquidity">liquidity</Term>{" "}is the feature you only miss when it&apos;s gone.
      </P>
      <H2>Events reprice everything</H2>
      <P>
        Earnings inflate <Term id="iv">IV</Term>{" "}and the aftermath crushes it (unit 5). Selling
        premium into an event collects rich rent for real tail risk; buying premium into one
        pays drama prices for a move that&apos;s already half-expected. Neither is forbidden —
        both deserve to be done on purpose.
      </P>
      <H2>Know your exits before your entries</H2>
      <P>
        Sellers of in-the-money options get <Term id="assignment">assigned</Term>, sometimes
        early; spread traders often close around 21 <Term id="dte">DTE</Term> or at 50% of max
        profit rather than romance the last dollar. The specifics vary; having <em>a</em> plan
        before entry doesn&apos;t. The &quot;What can bite&quot; box on every strategy page is
        your pre-flight checklist.
      </P>
      <P>
        And the meta-rule that contains the others: this app is a flight simulator, not a
        brokerage — every crash in here is free. Spend them lavishly.
      </P>
      <TryReal href="/t/SPY">Back to the tickers — go break things safely</TryReal>
    </>
  );
}

const LESSONS: Record<string, React.ComponentType> = {
  "own-a-share": U1,
  "the-contract": U2,
  "what-an-option-costs": U3,
  "time": U4,
  "volatility": U5,
  "the-greeks": U6,
  "staying-alive": U10,
};

export const LESSON_SLUGS = Object.keys(LESSONS);

/** Server components can't index into a client module's exports (they
 *  only see opaque references), so the slug→component dispatch happens
 *  here, inside client land. */
export function LessonBody({ slug }: { slug: string }) {
  const C = LESSONS[slug];
  return C ? <C /> : null;
}
