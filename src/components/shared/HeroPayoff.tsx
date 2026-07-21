/** Decorative hero: an iron condor drawing itself — the app's whole
 *  promise in one shape. CSS-animated (compositor-driven, survives rAF
 *  throttling; reduced-motion jumps straight to the final frame).
 *  Purely visual; hidden from screen readers. */
export function HeroPayoff() {
  return (
    <svg viewBox="0 0 368 190" className="w-full max-w-md" aria-hidden role="presentation">
      <polygon
        className="hero-fade"
        style={{ animationDelay: "0.9s", "--fade-to": 0.12 } as React.CSSProperties}
        points="56,150 118,52 250,52 312,150"
        fill="var(--gain)"
      />
      <polygon
        className="hero-fade"
        style={{ animationDelay: "1.1s", "--fade-to": 0.1 } as React.CSSProperties}
        points="8,190 8,150 56,150 40,190"
        fill="var(--loss)"
      />
      <polygon
        className="hero-fade"
        style={{ animationDelay: "1.1s", "--fade-to": 0.1 } as React.CSSProperties}
        points="312,150 360,150 368,190 328,190"
        fill="var(--loss)"
      />
      <line x1={0} x2={368} y1={110} y2={110} stroke="var(--axis-line)" strokeWidth={1} />
      <path
        className="hero-draw"
        style={{ animationDelay: "0.45s" }}
        pathLength={1}
        d="M8 132 C 90 130, 96 66, 184 62 C 272 66, 278 130, 360 132"
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        className="hero-draw"
        pathLength={1}
        d="M8 150 L56 150 L118 52 L250 52 L312 150 L360 150"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {[97, 271].map((x, i) => (
        <g
          key={x}
          className="hero-pop"
          style={{ animationDelay: `${1.3 + i * 0.12}s`, transformOrigin: `${x}px 110px` }}
        >
          <rect
            x={x - 4.5}
            y={105.5}
            width={9}
            height={9}
            transform={`rotate(45 ${x} 110)`}
            fill="var(--background)"
            stroke="var(--foreground)"
            strokeWidth={1.5}
          />
        </g>
      ))}
    </svg>
  );
}
