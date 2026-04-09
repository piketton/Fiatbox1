"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface Fish {
  id: number;
  x: number;
  baseY: number;       // centre lane
  phase: number;       // wave phase offset
  waveAmp: number;     // how much it bobs vertically
  waveFreq: number;    // how fast it bobs
  tailPhase: number;   // tail-flap phase
  speed: number;
  scale: number;
  opacity: number;
  direction: "ltr" | "rtl";
  color: string;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createFish(
  id: number,
  direction: "ltr" | "rtl",
  color: string,
  canvasW: number,
  canvasH: number,
  zone: "top" | "bottom"
): Fish {
  const isUpstream = direction === "rtl";
  const bandH = canvasH * 0.18; // height of each band
  const baseY = zone === "top"
    ? randomBetween(18, bandH)
    : randomBetween(canvasH - bandH, canvasH - 18);
  return {
    id,
    x: direction === "ltr" ? randomBetween(-200, -60) : randomBetween(canvasW + 60, canvasW + 220),
    baseY,
    phase: randomBetween(0, Math.PI * 2),
    waveAmp: isUpstream ? randomBetween(12, 22) : randomBetween(4, 10), // upstream fish fight harder
    waveFreq: isUpstream ? randomBetween(0.04, 0.07) : randomBetween(0.015, 0.03),
    tailPhase: randomBetween(0, Math.PI * 2),
    speed: isUpstream ? randomBetween(0.25, 0.55) : randomBetween(0.7, 1.4), // upstream slower
    scale: randomBetween(0.55, 1.25),
    opacity: randomBetween(0.22, 0.5),
    direction,
    color,
  };
}

export default function Landing() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<Fish[]>([]);
  const frameRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function spawnFish(forceDir?: "ltr" | "rtl", forceZone?: "top" | "bottom") {
      if (!canvas) return;
      const id = nextIdRef.current++;
      const ltrCount = fishRef.current.filter(f => f.direction === "ltr").length;
      const rtlCount = fishRef.current.filter(f => f.direction === "rtl").length;

      const dir = forceDir ?? (ltrCount < 12 ? "ltr" : rtlCount < 4 ? "rtl" : null);
      if (!dir) return;

      const zone = forceZone ?? (Math.random() < 0.5 ? "top" : "bottom");
      const color = dir === "ltr" ? "#4ade80" : "#facc15";
      fishRef.current.push(createFish(id, dir, color, canvas.width, canvas.height, zone));
    }

    // Stagger initial spawn spread across the screen
    for (let i = 0; i < 12; i++) {
      spawnFish("ltr", i < 6 ? "top" : "bottom");
      const f = fishRef.current[fishRef.current.length - 1];
      f.x = randomBetween(-100, canvas.width + 100);
    }
    for (let i = 0; i < 4; i++) {
      spawnFish("rtl", i < 2 ? "top" : "bottom");
      const f = fishRef.current[fishRef.current.length - 1];
      f.x = randomBetween(-100, canvas.width + 100);
    }

    function drawFish(fish: Fish, tick: number) {
      if (!ctx) return;
      ctx.save();

      const flip = fish.direction === "rtl";
      // Vertical sine wave — upstream fish wobble more (fighting current)
      const y = fish.baseY + Math.sin(fish.phase + tick * fish.waveFreq) * fish.waveAmp;

      // Slight body tilt following the wave direction
      const dyDt = Math.cos(fish.phase + tick * fish.waveFreq) * fish.waveAmp * fish.waveFreq;
      const tiltAngle = Math.atan(dyDt) * 0.5;

      ctx.translate(fish.x, y);
      ctx.rotate(tiltAngle * (flip ? -1 : 1));
      ctx.scale(fish.scale * (flip ? -1 : 1), fish.scale);
      ctx.globalAlpha = fish.opacity;

      // Tail flap — faster & wider for upstream fish
      const tailFlap = Math.sin(fish.tailPhase + tick * (fish.direction === "rtl" ? 0.18 : 0.12))
        * (fish.direction === "rtl" ? 11 : 7);

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = fish.color;
      ctx.fill();

      // Tail (flapping)
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-32, -8 + tailFlap);
      ctx.lineTo(-32, 8 + tailFlap);
      ctx.closePath();
      ctx.fillStyle = fish.color;
      ctx.fill();

      // Eye
      ctx.beginPath();
      ctx.arc(12, -2, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      ctx.restore();
    }

    function animate() {
      if (!ctx || !canvas) return;
      tickRef.current++;
      const tick = tickRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fishRef.current.forEach(fish => {
        if (fish.direction === "ltr") {
          fish.x += fish.speed;
        } else {
          fish.x -= fish.speed;
        }
        drawFish(fish, tick);
      });

      // Cull off-screen fish and respawn
      const before = fishRef.current.length;
      fishRef.current = fishRef.current.filter(fish => {
        if (fish.direction === "ltr") return fish.x < (canvas?.width ?? 2000) + 160;
        return fish.x > -160;
      });
      const removed = before - fishRef.current.length;
      for (let i = 0; i < removed; i++) spawnFish();

      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#eef4fb] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Fish canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center w-full">

        {/* Left: spacer */}
        <div className="flex-1" />

        {/* Center: original vertical stack */}
        <div className="flex flex-col items-center w-full max-w-sm">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold text-[#0d2948] tracking-tight">FIATBOX</h1>
            <p className="text-[#5a7a9f] mt-2 text-sm">Polygon · USDT · USDC · EURC</p>
          </div>

          {/* Card */}
          <div className="bg-white/90 border border-[#c9d9ee] rounded-2xl p-8 w-full shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold text-[#5a7a9f] uppercase tracking-widest mb-5 text-center">
              What would you like to do?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/fiat-in")}
                className="w-full bg-[#1a56a0] hover:bg-[#154491] text-white font-semibold py-4 px-6 rounded-xl transition-all text-base"
              >
                Receive stablecoin
              </button>

              <button
                onClick={() => router.push("/fiat-out")}
                className="w-full bg-white hover:bg-[#eef4fb] text-[#1a56a0] font-semibold py-4 px-6 rounded-xl border border-[#c9d9ee] transition-all text-base"
              >
                Cash out
              </button>
            </div>
          </div>

          <p className="text-xs text-[#5a7a9f] mt-8">Cash in. Stablecoins out. The P2P ATM for a digital world</p>
          <p className="text-xs text-[#5a7a9f] mt-1">Powered by Polygon Network</p>
        </div>

        {/* Right: spacer */}
        <div className="flex-1" />

      </div>
    </div>
  );
}
