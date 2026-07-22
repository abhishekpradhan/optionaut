/**
 * The void the app lives in: nebula washes, vignette, film grain. No
 * stars — point-shaped texture inside a charting instrument reads as
 * data, so the void stays pitch black with only broad, dim washes for
 * depth. Fully static; zero per-frame cost.
 */

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function Atmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
      {/* nebula washes */}
      <div
        className="absolute -left-1/4 -top-1/3 h-[80vh] w-[80vw] rounded-full opacity-[0.13]"
        style={{ background: "radial-gradient(closest-side, #1c5cab, transparent 70%)" }}
      />
      <div
        className="absolute -right-1/4 top-1/3 h-[70vh] w-[60vw] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(closest-side, #199e70, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-30vh] left-1/4 h-[60vh] w-[70vw] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(closest-side, #9085e9, transparent 70%)" }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 20%, transparent 55%, rgba(4,6,10,0.55) 100%)",
        }}
      />
      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
