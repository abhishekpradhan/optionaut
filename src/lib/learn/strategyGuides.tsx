import type { ReactNode } from "react";
import { Term } from "@/components/learn/Term";

/**
 * The teaching layer for each strategy: a guided intro (the idea, in
 * human terms), how to read its diagram, and the honest list of ways it
 * bites. Phenomenon first, jargon second — every term is tappable.
 */
export interface StrategyGuide {
  /** the pitch: what deal you're actually making */
  idea: ReactNode;
  /** how to read this particular payoff shape */
  diagram: ReactNode;
  /** the honest section — specific, not fine print */
  gotchas: Array<{ title: string; body: ReactNode }>;
}

export const STRATEGY_GUIDES: Record<string, StrategyGuide> = {
  "long-shares": {
    idea: (
      <>
        Buying 100 <Term id="share">shares</Term> is the baseline every option gets measured
        against. No expiration, no decay, nothing clever: you own a slice of the company, and
        your <Term id="pl">P/L</Term> tracks the price dollar-for-dollar, forever.
      </>
    ),
    diagram: (
      <>
        The <Term id="payoff-diagram">payoff diagram</Term> is a single 45° line through your
        purchase price. Notice what&apos;s <em>missing</em>: no kinks, no curve, and the
        &quot;today&quot; and &quot;expiry&quot; lines are the same line — time doesn&apos;t
        touch shares. Every option you&apos;ll meet is a deliberate distortion of this line.
      </>
    ),
    gotchas: [
      {
        title: "It ties up real capital",
        body: "100 shares of a $326 stock is $32,600. Options exist partly because this number is large.",
      },
      {
        title: "The downside is the whole ride",
        body: "Defined risk, yes — but 'defined' means the stock can still go to zero with your money aboard.",
      },
      {
        title: "No leverage cuts both ways",
        body: "A 10% rally makes 10%. The same move on a call might make 100% — or the call might expire worthless while shares just sit there. That trade-off is the entire options story.",
      },
    ],
  },

  "long-call": {
    idea: (
      <>
        You pay a <Term id="premium">premium</Term> today for the right to buy 100 shares at
        the <Term id="strike">strike</Term> until <Term id="expiration">expiration</Term>. It
        is renting the stock&apos;s upside: your loss is capped at what you paid, your upside
        is open, and the rent is real.
      </>
    ),
    diagram: (
      <>
        Left of the strike the line is flat at −premium: the worst case, fully prepaid. Right
        of the strike it rises dollar-for-dollar. The line only crosses zero at your{" "}
        <Term id="breakeven">breakeven</Term> — strike <em>plus</em> premium — so &quot;the
        stock went up&quot; is not automatically &quot;you made money.&quot; The gap between
        the curved today-line and the kinked expiry-line is your{" "}
        <Term id="extrinsic">extrinsic value</Term>, and it is always shrinking.
      </>
    ),
    gotchas: [
      {
        title: "Time is the rent",
        body: (
          <>
            Drag the time dial and watch the curve sink with the stock standing still.
            That&apos;s <Term id="theta">theta</Term> — a quiet week costs you money even when
            you&apos;re &quot;right&quot; about direction eventually.
          </>
        ),
      },
      {
        title: "IV crush ambushes event trades",
        body: (
          <>
            Calls bought before earnings carry inflated <Term id="iv">implied volatility</Term>.
            After the announcement, <Term id="iv-crush">IV crush</Term> can shrink the option
            even if the stock gapped your way. Try it: cut the volatility dial to ×0.7.
          </>
        ),
      },
      {
        title: "Far-OTM calls are lottery tickets",
        body: "Cheap strikes look tempting because they're almost certainly worthless. A $0.30 call losing $0.05/day is bleeding 17% daily.",
      },
      {
        title: "Most of the time, you sell it",
        body: (
          <>
            You rarely <Term id="exercise">exercise</Term> — you sell the option back before
            expiry. The <Term id="bid-ask">bid–ask spread</Term> is a real cost both ways.
          </>
        ),
      },
    ],
  },

  "long-put": {
    idea: (
      <>
        The mirror of the long call: a <Term id="premium">premium</Term> buys you the right to{" "}
        <em>sell</em> 100 shares at the <Term id="strike">strike</Term>. Traders use it as a
        bet on a fall — or as insurance on shares they own, which is why puts get compared to
        buying a deductible.
      </>
    ),
    diagram: (
      <>
        Flat at −premium to the right of the strike (stock up = your put expires worthless,
        loss prepaid). Rising to the left, with <Term id="breakeven">breakeven</Term> at strike{" "}
        <em>minus</em> premium. Maximum profit isn&apos;t unlimited — a stock can only fall to
        zero — but it&apos;s usually many times the premium.
      </>
    ),
    gotchas: [
      {
        title: "Fear is often pre-priced",
        body: (
          <>
            Puts are the market&apos;s insurance product, and insurance costs most exactly when
            everyone wants it. High <Term id="iv">IV</Term> after a scary headline means
            you&apos;re buying protection at panic prices.
          </>
        ),
      },
      {
        title: "Theta doesn't care about your thesis",
        body: "A slow-motion decline can still lose you money: the stock drifts down slower than your extrinsic value melts.",
      },
      {
        title: "Direction ≠ timing",
        body: "Being right that 'it'll crash eventually' is worthless if eventually lands after expiration. The calendar is part of the bet.",
      },
    ],
  },

  "covered-call": {
    idea: (
      <>
        You own 100 shares and sell someone else a <Term id="call">call</Term> against them —
        renting out your upside above the strike for cash today. The short call is{" "}
        <Term id="covered">covered</Term>: if the buyer comes to collect, you already hold the
        shares to hand over.
      </>
    ),
    diagram: (
      <>
        Below the strike it behaves like shares, cushioned by the premium you collected (your{" "}
        <Term id="breakeven">breakeven</Term> sits below your purchase price — the one strategy
        here that starts ahead). Above the strike the line goes flat: that&apos;s your upside,
        sold. The flat shelf is the deal you made.
      </>
    ),
    gotchas: [
      {
        title: "The regret scenario is a rally",
        body: "If the stock rips through your strike, you still profit — but you watch the move you sold happen without you. Emotionally, capped upside costs more than it looks on paper.",
      },
      {
        title: "The premium is not a force field",
        body: "A $3 premium cushions the first $3 of a fall. The next $50 of a fall is all yours. This is still, overwhelmingly, a stock position.",
      },
      {
        title: "Assignment can arrive early",
        body: (
          <>
            American-style options mean <Term id="assignment">assignment</Term> can happen
            before expiry — most often right before a dividend. Your shares can leave without
            asking.
          </>
        ),
      },
    ],
  },

  "cash-secured-put": {
    idea: (
      <>
        You sell a <Term id="put">put</Term> below the current price and park enough cash to
        buy 100 shares at the strike — <Term id="cash-secured">cash-secured</Term>. In plain
        terms: you&apos;re paid today for a standing promise to buy the dip. Sellers think of
        it as a limit order that pays rent.
      </>
    ),
    diagram: (
      <>
        Flat at +premium to the right of the strike: stock stays up, you keep the cash, the
        promise expires. Sloping down to the left of it: below your{" "}
        <Term id="breakeven">breakeven</Term> (strike − premium) you&apos;re a buyer of a
        falling stock at yesterday&apos;s price. The shelf is small and certain; the slope is
        large and yours.
      </>
    ),
    gotchas: [
      {
        title: "You buy exactly when it's ugly",
        body: "Assignment only happens because the stock fell through your strike. The 'discount' price can still be above the new market price — sometimes far above.",
      },
      {
        title: "Small wins, occasional big hits",
        body: (
          <>
            High <Term id="pop">probability of profit</Term> is real, but so is the asymmetry:
            many small premiums can be undone by one bad assignment. Sizing matters more than
            win rate.
          </>
        ),
      },
      {
        title: "The cash is spoken for",
        body: "That collateral sits idle while the promise is open — the hidden cost is what it could have earned elsewhere.",
      },
    ],
  },

  "bull-call-spread": {
    idea: (
      <>
        Buy a call, then sell a higher-strike call to pay for part of it — a{" "}
        <Term id="spread">spread</Term>. You&apos;ve traded away the open-ended upside for a
        cheaper ticket and a defined maximum. It&apos;s the long call with a budget.
      </>
    ),
    diagram: (
      <>
        Three zones: flat loss (the net <Term id="credit-debit">debit</Term>) below the long
        strike, rising between the strikes, flat profit above the short strike. Max profit is
        the distance between strikes minus what you paid — visible as the height of the upper
        shelf.
      </>
    ),
    gotchas: [
      {
        title: "The cap is real",
        body: "A monster rally pays the same as a modest one. You will occasionally sell a moonshot for a fixed fee — that's the design, not a malfunction.",
      },
      {
        title: "Spreads move slowly",
        body: "The short leg drags against the long one: day-to-day the spread creeps even when the stock jumps. Full value only arrives near expiration.",
      },
      {
        title: "Two legs, two spreads to cross",
        body: (
          <>
            Each leg pays its own <Term id="bid-ask">bid–ask</Term> toll. On narrow spreads in
            illiquid names, the tolls can eat a surprising share of the edge.
          </>
        ),
      },
    ],
  },

  "bear-put-spread": {
    idea: (
      <>
        The bearish twin of the bull call spread: buy a put near the money, sell a lower-strike
        put against it. A defined-risk, defined-reward bet on a move <em>down</em> — cheaper
        than an outright put because you&apos;ve sold the tail of the crash to someone else.
      </>
    ),
    diagram: (
      <>
        Flat loss above the long strike, profit growing as the stock falls between the strikes,
        flat max profit below the short strike. You&apos;re paying for the slice of downside
        between the two strikes — no more, no less.
      </>
    ),
    gotchas: [
      {
        title: "Crashes overshoot your floor",
        body: "In a true collapse, profit stops at the short strike while the stock keeps falling. The scenario that most excites a bear is the one this structure deliberately sells off.",
      },
      {
        title: "High IV makes bears overpay",
        body: (
          <>
            Puts get expensive when fear is high. A spread softens that (you sell some rich{" "}
            <Term id="iv">IV</Term> too), but a calm-market entry still beats a panicked one.
          </>
        ),
      },
    ],
  },

  "bull-put-spread": {
    idea: (
      <>
        Sell a put below the market, buy a cheaper one further down as insurance, pocket the
        difference — a <Term id="credit-debit">credit</Term> spread. You win if the stock goes
        up, sideways, or even slightly down: you&apos;re not betting on a rally, you&apos;re
        betting <em>against</em> a plunge before expiry.
      </>
    ),
    diagram: (
      <>
        A shelf of max profit (the credit) everywhere above the short strike, a slide between
        the strikes, and a floor (the <Term id="wing">wing</Term>) capping the damage below.
        Time is on your side: watch the today-curve climb toward the shelf as you drag the time
        dial.
      </>
    ),
    gotchas: [
      {
        title: "Risk more to make less",
        body: "A typical setup risks $400 to make $100. The high win rate is honest; so is the occasional full loss. The math only works with sizing discipline.",
      },
      {
        title: "The last dollars are the slowest",
        body: "Most of the credit arrives early; the tail takes weeks while risk stays open. Many traders close at 50% of max profit rather than babysit the rest.",
      },
      {
        title: "Gamma bites near expiry",
        body: (
          <>
            Close to expiration, a stock hovering at your short strike makes the position whip
            violently — that&apos;s <Term id="gamma">gamma</Term>. The calm income trade gets
            loud in its final days.
          </>
        ),
      },
    ],
  },

  "bear-call-spread": {
    idea: (
      <>
        The bearish credit spread: sell a call above the market, buy a cheaper higher one as
        the <Term id="wing">wing</Term>, keep the difference if the stock stays below your
        short strike. You&apos;re paid to bet that a rally <em>doesn&apos;t</em> happen.
      </>
    ),
    diagram: (
      <>
        Max profit shelf below the short strike, a slide between the strikes, capped loss above
        the wing. Like all credit spreads, it starts at its best case and defends it — the
        today-curve just needs to drift down onto the shelf.
      </>
    ),
    gotchas: [
      {
        title: "Fighting uptrends is expensive",
        body: "Stocks grind upward more often than feels fair. Selling calls against a strong trend is the classic way to learn this.",
      },
      {
        title: "Early assignment around dividends",
        body: (
          <>
            A short call that&apos;s gone <Term id="itm-otm">in the money</Term> near an
            ex-dividend date is a candidate for early{" "}
            <Term id="assignment">assignment</Term>.
          </>
        ),
      },
    ],
  },

  "long-straddle": {
    idea: (
      <>
        Buy the <Term id="call">call</Term> and the <Term id="put">put</Term> at the same
        strike. You&apos;ve stopped betting on direction entirely — you&apos;re betting the
        move, whichever way, is <em>bigger</em> than the market expects. Both premiums are the
        price of that agnosticism.
      </>
    ),
    diagram: (
      <>
        The V shape: loss maxes at the strike (both options die worthless if nothing happens)
        and profit grows in both directions past the two{" "}
        <Term id="breakeven">breakevens</Term>. Note how far apart they sit — that distance is
        the <Term id="expected-move">expected move</Term> you must beat.
      </>
    ),
    gotchas: [
      {
        title: "Double the premium, double the melt",
        body: (
          <>
            Two long options means <Term id="theta">theta</Term> ×2. Every quiet day is the
            expensive kind of day.
          </>
        ),
      },
      {
        title: "The event is usually priced in",
        body: (
          <>
            Straddles into earnings look brilliant until <Term id="iv-crush">IV crush</Term>{" "}
            deflates both legs at once. The stock must move more than the market already
            charged — a high bar.
          </>
        ),
      },
      {
        title: "'Big move' is relative",
        body: "A 5% move that thrilled you as a shareholder can still land inside the breakevens and lose money here.",
      },
    ],
  },

  "long-strangle": {
    idea: (
      <>
        A straddle on a budget: buy an <Term id="itm-otm">out-of-the-money</Term> call and an
        out-of-the-money put. Cheaper entry, wider gap to profit — you&apos;re paying less for
        a bet that needs even more drama to pay.
      </>
    ),
    diagram: (
      <>
        A flat-bottomed valley between the two strikes (both options worthless there) with
        profit sloping away past breakevens that sit outside <em>both</em> strikes. Compare it
        to the straddle in the gallery: lower cost, longer runway to breakeven.
      </>
    ),
    gotchas: [
      {
        title: "Cheap has a reason",
        body: "The most likely single outcome is the entire flat bottom of the valley — a total loss of both premiums. The low price is the market quoting you those odds.",
      },
      {
        title: "All the straddle's problems, amplified",
        body: (
          <>
            <Term id="theta">Theta</Term> ×2, <Term id="iv-crush">IV crush</Term> exposure, and
            an even bigger required move. Handle with the volatility dial before real money.
          </>
        ),
      },
    ],
  },

  "iron-condor": {
    idea: (
      <>
        The flagship of &quot;nothing happens&quot; trading: sell a put spread below the market{" "}
        <em>and</em> a call spread above it. The two <Term id="wing">wings</Term> cap your risk
        on both sides; the double <Term id="credit-debit">credit</Term> is yours if the stock
        stays inside the range you sold. You are, functionally, the house selling movement
        insurance in both directions.
      </>
    ),
    diagram: (
      <>
        The tent: a flat roof of max profit between the short strikes, slopes through the two{" "}
        <Term id="breakeven">breakevens</Term>, flat floors of defined loss beyond the wings.
        Check where the breakevens sit against the{" "}
        <Term id="expected-move">expected move</Term> on the overview page — that comparison is
        the entire trade.
      </>
    ),
    gotchas: [
      {
        title: "One side always feels wrong",
        body: "The stock is forever drifting toward one of your short strikes. Living with a threatened side — and knowing your management plan in advance — is the actual skill.",
      },
      {
        title: "Max loss outweighs max profit",
        body: "Typical condors risk 2–4× their credit. The high win rate is real and so is the arithmetic: a few full losses erase many wins without sizing discipline.",
      },
      {
        title: "Gamma turns the tent into a trap",
        body: (
          <>
            Near expiry, a stock camped at a short strike makes P/L whip on every tick —{" "}
            <Term id="gamma">gamma</Term> risk. Many traders exit around 21{" "}
            <Term id="dte">DTE</Term> to skip that regime entirely.
          </>
        ),
      },
      {
        title: "Four legs, four tolls",
        body: (
          <>
            Every leg crosses a <Term id="bid-ask">bid–ask spread</Term> twice. On tight
            condors the round-trip friction is a meaningful slice of the credit.
          </>
        ),
      },
    ],
  },
};
