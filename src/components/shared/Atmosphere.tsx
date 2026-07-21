"use client";

import * as React from "react";

/**
 * The void the app lives in: a slow-drifting starfield with nebula
 * washes, vignette, and film grain. Fixed behind all content, cheap
 * (one 2d canvas, ~220 points), paused when the tab is hidden, and
 * static under prefers-reduced-motion.
 */

interface Star {
  x: number; // 0..1
  y: number;
  r: number;
  a: number; // base alpha
  tw: number; // twinkle speed
  ph: number; // phase
  drift: number;
}

function makeStars(n: number, seed = 7): Star[] {
  // deterministic LCG so SSR/CSR agree if ever needed
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: n }, () => {
    const big = rnd() > 0.92;
    return {
      x: rnd(),
      y: rnd(),
      r: big ? 1.1 + rnd() * 0.9 : 0.4 + rnd() * 0.7,
      a: big ? 0.5 + rnd() * 0.35 : 0.12 + rnd() * 0.3,
      tw: 0.2 + rnd() * 0.9,
      ph: rnd() * Math.PI * 2,
      drift: 0.002 + rnd() * 0.006,
    };
  });
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export function Atmosphere() {
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = makeStars(220);
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        const tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 0.001 * st.tw + st.ph);
        const x = reduce ? st.x : (st.x + t * 0.00001 * st.drift) % 1;
        ctx.globalAlpha = st.a * tw;
        ctx.fillStyle = "#cfe0f7";
        ctx.beginPath();
        ctx.arc(x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (reduce) {
      draw(0);
    } else {
      const loop = (t: number) => {
        if (!running) return;
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    const onVis = () => {
      running = !document.hidden;
      if (running && !reduce) raf = requestAnimationFrame((t) => {
        const loop = (tt: number) => {
          if (!running) return;
          draw(tt);
          raf = requestAnimationFrame(loop);
        };
        loop(t);
      });
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

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
      {/* stars */}
      <canvas ref={ref} className="absolute inset-0" />
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
