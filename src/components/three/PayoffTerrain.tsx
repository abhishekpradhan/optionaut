"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html, Grid } from "@react-three/drei";
import { markToMarket, expectedMove } from "@/lib/options/position";
import type { Leg, MarketCtx } from "@/lib/options/types";
import { fmtUsd } from "@/lib/format";

/**
 * The position's P/L as a landscape you orbit: x = calendar days,
 * z = underlying price, height & color = profit/loss (the heatmap,
 * extruded). Same engine, same diverging ramp — profit mountains glow
 * blue, loss valleys glow red, and the two bright rails are the lines
 * from the 2D chart: blue = today, white = expiry.
 */

const COLS = 40;
const ROWS = 52;
const W = 4.4; // world width (time)
const D = 3.1; // world depth (price)
const H = 1.05; // max |height|

const GAIN = new THREE.Color("#3987e5");
const LOSS = new THREE.Color("#e66767");
const NEUTRAL = new THREE.Color("#20242e");

export interface TerrainProps {
  legs: Leg[];
  ctx: MarketCtx;
  spot: number;
  iv: number;
  dte: number;
  ivScale?: number;
  elapsedDays?: number;
  whatIfPrice?: number | null;
  onPick?: (price: number, day: number) => void;
  /** decorative mode: gentle permanent auto-rotate, no labels/marker */
  hero?: boolean;
  className?: string;
  /** fires once after the first WebGL frame actually renders — lets
   *  hosts keep a static fallback up until the scene is truly live */
  onFirstFrame?: () => void;
}

function FirstFrame({ onFirstFrame }: { onFirstFrame?: () => void }) {
  const fired = React.useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onFirstFrame?.();
    }
  });
  return null;
}

function priceDomain(spot: number, iv: number, dte: number): [number, number] {
  const em = expectedMove(spot, iv, Math.max(dte, 7));
  const span = Math.min(Math.max((2.2 * em) / spot, 0.14), 0.42);
  return [spot * (1 - span), spot * (1 + span)];
}

function Surface({
  legs, ctx, spot, iv, dte, ivScale = 1, elapsedDays = 0, whatIfPrice, onPick, hero,
}: TerrainProps) {
  const [pLo, pHi] = priceDomain(spot, iv, dte);

  const dayAt = (i: number) => (dte * i) / (COLS - 1);
  const priceAt = (j: number) => pHi - ((pHi - pLo) * j) / (ROWS - 1);
  const xAt = (i: number) => (i / (COLS - 1) - 0.5) * W;
  const zAt = (j: number) => (j / (ROWS - 1) - 0.5) * D;

  // One shared geometry (topology built once); both the solid surface
  // and the wireframe overlay render it, so height/color updates flow
  // through a single set of attributes.
  const geo = React.useMemo(() => {
    const g = new THREE.BufferGeometry();
    const idx: number[] = [];
    for (let j = 0; j < ROWS - 1; j++) {
      for (let i = 0; i < COLS - 1; i++) {
        const a = j * COLS + i;
        const b = a + 1;
        const c = a + COLS;
        const d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const uvArr = new Float32Array(ROWS * COLS * 2);
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        uvArr[(j * COLS + i) * 2] = i / (COLS - 1);
        uvArr[(j * COLS + i) * 2 + 1] = j / (ROWS - 1);
      }
    }
    g.setIndex(idx);
    g.setAttribute("uv", new THREE.BufferAttribute(uvArr, 2));
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(ROWS * COLS * 3), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(ROWS * COLS * 3), 3),
    );
    return g;
  }, []);
  React.useEffect(() => () => geo.dispose(), [geo]);

  // heights + colors, recomputed when the position changes
  const { maxAbs, plGrid } = React.useMemo(() => {
    const grid: number[][] = [];
    let m = 1;
    for (let j = 0; j < ROWS; j++) {
      const row: number[] = [];
      for (let i = 0; i < COLS; i++) {
        const v = markToMarket(legs, priceAt(j), dayAt(i), ctx, ivScale);
        row.push(v);
        m = Math.max(m, Math.abs(v));
      }
      grid.push(row);
    }
    return { maxAbs: m, plGrid: grid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, ivScale, dte, spot, ctx.r, ctx.q]);

  React.useEffect(() => {
    // Imperative Three.js buffer updates — standard r3f practice; the
    // geometry is a stable GPU resource, not React-managed state.
    /* eslint-disable react-hooks/immutability */
    const positions = geo.attributes.position.array as Float32Array;
    const colors = geo.attributes.color.array as Float32Array;
    const c = new THREE.Color();
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const k = j * COLS + i;
        const pl = plGrid[j][i];
        positions[k * 3] = xAt(i);
        positions[k * 3 + 1] = (pl / maxAbs) * H;
        positions[k * 3 + 2] = zAt(j);
        const t = Math.sqrt(Math.min(Math.abs(pl) / maxAbs, 1));
        c.copy(NEUTRAL).lerp(pl >= 0 ? GAIN : LOSS, t);
        colors[k * 3] = c.r;
        colors[k * 3 + 1] = c.g;
        colors[k * 3 + 2] = c.b;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeBoundingSphere();
    /* eslint-enable react-hooks/immutability */
     
  }, [geo, plGrid, maxAbs]);

  // the two rails: today (blue) and expiry (white)
  const rail = React.useCallback(
    (i: number): [number, number, number][] =>
      Array.from({ length: ROWS }, (_, j) => [
        xAt(i),
        (plGrid[j][i] / maxAbs) * H + 0.012,
        zAt(j),
      ]),
    [plGrid, maxAbs],
  );

  // click-vs-drag disambiguation for picking
  const down = React.useRef<{ x: number; y: number } | null>(null);

  const marker = React.useMemo(() => {
    if (hero || whatIfPrice == null) return null;
    const day = Math.min(Math.max(elapsedDays, 0), dte);
    const i = ((COLS - 1) * day) / dte;
    const j = ((pHi - whatIfPrice) / (pHi - pLo)) * (ROWS - 1);
    if (j < 0 || j > ROWS - 1) return null;
    const pl = markToMarket(legs, whatIfPrice, day, ctx, ivScale);
    return {
      pos: [
        (i / (COLS - 1) - 0.5) * W,
        (pl / maxAbs) * H,
        (j / (ROWS - 1) - 0.5) * D,
      ] as [number, number, number],
      gain: pl >= 0,
    };
  }, [hero, whatIfPrice, elapsedDays, dte, pHi, pLo, legs, ctx, ivScale, maxAbs]);

  return (
    <group>
      {/* zero plane grid — the sea level of P/L */}
      <Grid
        position={[0, 0, 0]}
        args={[W + 0.6, D + 0.6]}
        cellSize={0.28}
        cellColor="#232a38"
        cellThickness={0.6}
        sectionSize={1.12}
        sectionColor="#3a4356"
        sectionThickness={1}
        fadeDistance={16}
        fadeStrength={2}
      />

      {/* the terrain */}
      <mesh
        geometry={geo}
        onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          if (!onPick || hero || !down.current) return;
          const moved =
            Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 6;
          down.current = null;
          if (moved || !e.uv) return;
          const day = Math.round(dte * e.uv.x);
          const price = pHi - (pHi - pLo) * e.uv.y;
          onPick(price, day);
        }}
      >
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.88} />
      </mesh>
      {/* holographic wireframe overlay */}
      <mesh geometry={geo} renderOrder={2}>
        <meshBasicMaterial
          vertexColors
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* rails: the 2D chart's two lines, living in the terrain */}
      <Line points={rail(0)} color="#3987e5" lineWidth={2.5} transparent opacity={0.95} />
      <Line points={rail(COLS - 1)} color="#edf1f7" lineWidth={2.5} transparent opacity={0.95} />

      {/* scenario marker */}
      {marker && (
        <group position={marker.pos}>
          <mesh>
            <sphereGeometry args={[0.045, 20, 20]} />
            <meshBasicMaterial color={marker.gain ? "#5598e7" : "#e66767"} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.09, 20, 20]} />
            <meshBasicMaterial
              color={marker.gain ? "#3987e5" : "#e66767"}
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <Line
            points={[
              [0, -marker.pos[1], 0],
              [0, 0, 0],
            ]}
            color={marker.gain ? "#3987e5" : "#e66767"}
            lineWidth={1.5}
            transparent
            opacity={0.5}
          />
        </group>
      )}

      {/* HUD labels */}
      {!hero && (
        <>
          <Html position={[-W / 2 - 0.15, 0.02, D / 2 + 0.22]} center className="hud whitespace-nowrap">
            today
          </Html>
          <Html position={[W / 2 + 0.15, 0.02, D / 2 + 0.28]} center className="hud whitespace-nowrap">
            expiry
          </Html>
          <Html position={[-W / 2 - 0.3, 0.02, -D / 2]} center className="hud figures whitespace-nowrap">
            {fmtUsd(pHi, { cents: false })}
          </Html>
          <Html position={[-W / 2 - 0.3, 0.02, D / 2]} center className="hud figures whitespace-nowrap">
            {fmtUsd(pLo, { cents: false })}
          </Html>
        </>
      )}
    </group>
  );
}

function AutoRotate({ hero }: { hero?: boolean }) {
  const [interacted, setInteracted] = React.useState(false);
  const { gl } = useThree();
  React.useEffect(() => {
    if (hero) return;
    const el = gl.domElement;
    const stop = () => setInteracted(true);
    el.addEventListener("pointerdown", stop, { once: true });
    return () => el.removeEventListener("pointerdown", stop);
  }, [gl, hero]);
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={2.6}
      maxDistance={8}
      minPolarAngle={0.12 * Math.PI}
      maxPolarAngle={0.46 * Math.PI}
      autoRotate={hero || !interacted}
      autoRotateSpeed={hero ? 0.55 : 0.4}
    />
  );
}

class WebGLBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function PayoffTerrain(props: TerrainProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);
  // ssr:false component — window exists at first render
  const [reduce] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={props.className ?? "h-full w-full"} aria-hidden>
      <WebGLBoundary fallback={<div className="h-full w-full" />}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [3.2, 2.3, 3.8], fov: 40 }}
          frameloop={visible && !reduce ? "always" : "demand"}
          style={{ background: "transparent" }}
        >
          <Surface {...props} />
          <AutoRotate hero={props.hero} />
          <FirstFrame onFirstFrame={props.onFirstFrame} />
        </Canvas>
      </WebGLBoundary>
    </div>
  );
}
