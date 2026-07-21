"use client";

import * as React from "react";

/**
 * The void the app lives in: nebula washes, vignette, film grain, and a
 * faint static dust of stars. Deliberately dim and motionless — bright
 * or twinkling points inside a chart read as data, so the stars stay at
 * texture level, drawn once (zero per-frame cost).
 */

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
}

function makeStars(n: number, seed = 7): Star[] {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: n }, () => ({
    x: rnd(),
    y: rnd(),
    r: 0.3 + rnd() * 0.55,
    a: 0.05 + rnd() * 0.11,
  }));
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

    const stars = makeStars(140);
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#cfe0f7";
      for (const st of stars) {
        ctx.globalAlpha = st.a;
        ctx.beginPath();
        ctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
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
      {/* star dust */}
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
