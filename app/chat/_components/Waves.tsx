"use client";

import { useEffect, useRef } from "react";

/**
 * Golden Hour Waves — océano interactivo con ciclo día/noche.
 * Adaptado de un canvas suelto a un componente React que rellena su
 * contenedor (no la ventana completa) y limpia sus listeners/RAF al
 * desmontar. Mueve el ratón para agitar el viento · click para una salpicadura.
 */
export default function Waves({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = 5; // capas de olas
    const CYCLE = 60; // segundos por día completo
    const U0 = 0.16; // arranca justo antes de la hora dorada
    const TAU = Math.PI * 2;

    let W = 0,
      H = 0,
      DPR = 1,
      horizon = 0;
    const layers: Array<{
      base: number;
      d: number;
      a1: number;
      f1: number;
      s1: number;
      a2: number;
      f2: number;
      s2: number;
      a3: number;
      f3: number;
      s3: number;
      ph: number;
    }> = [];
    let stars: Array<{ x: number; y: number; r: number; p: number }> = [];
    let clouds: Array<{ x: number; y: number; s: number; v: number }> = [];
    let birds: Array<{ x: number; y: number; v: number; p: number }> = [];
    const foam: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      r: number;
      glow: boolean;
    }> = [];
    const impulses: Array<{ x: number; t0: number; amp: number }> = [];
    let wind = 0,
      windTarget = 0,
      drift = 0,
      ampF = 1;
    let swellT = 4;
    let last = performance.now();
    let raf = 0;

    // paletas: día → atardecer → noche → amanecer
    const KF = [
      { top: [58, 148, 214], hor: [170, 216, 236], seaT: [64, 158, 188], seaB: [6, 64, 104], sun: [255, 250, 225], glow: [255, 236, 180] },
      { top: [56, 52, 110], hor: [255, 138, 84], seaT: [226, 118, 86], seaB: [18, 38, 78], sun: [255, 168, 86], glow: [255, 120, 60] },
      { top: [5, 9, 28], hor: [18, 32, 66], seaT: [16, 38, 72], seaB: [2, 8, 22], sun: [232, 240, 255], glow: [150, 190, 255] },
      { top: [66, 66, 128], hor: [255, 176, 140], seaT: [182, 130, 128], seaB: [14, 38, 72], sun: [255, 205, 150], glow: [255, 170, 120] },
    ] as const;
    type Pal = Record<keyof (typeof KF)[number], number[]>;
    const mix = (a: readonly number[], b: readonly number[], k: number) => [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k,
    ];
    const cssC = (c: number[], a = 1) =>
      `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const smooth = (k: number) => k * k * (3 - 2 * k);

    function palette(u: number): Pal {
      const p = u * 4,
        i = Math.floor(p) % 4,
        f = smooth(p - Math.floor(p));
      const A = KF[i],
        B = KF[(i + 1) % 4];
      const o = {} as Pal;
      (Object.keys(A) as Array<keyof Pal>).forEach((k) => {
        o[k] = mix(A[k], B[k], f);
      });
      return o;
    }

    function resize() {
      DPR = Math.min(devicePixelRatio || 1, 2);
      W = cv!.clientWidth;
      H = cv!.clientHeight;
      cv!.width = W * DPR;
      cv!.height = H * DPR;
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      horizon = H * 0.52;
      layers.length = 0;
      const gap = (H - horizon) / (N + 1.2);
      for (let i = 0; i < N; i++) {
        const d = i / (N - 1);
        layers.push({
          base: horizon + gap * (i + 0.55),
          d,
          a1: 5 + d * 15,
          f1: 0.0045 + d * 0.002,
          s1: 0.55 + d * 0.5,
          a2: 3 + d * 9,
          f2: 0.011 - d * 0.003,
          s2: 0.9 + d * 0.7,
          a3: 1.5 + d * 4,
          f3: 0.021,
          s3: 1.6,
          ph: i * 1.7,
        });
      }
      stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * W,
        y: Math.random() * horizon * 0.96,
        r: Math.random() * 1.3 + 0.3,
        p: Math.random() * TAU,
      }));
      clouds = Array.from({ length: 5 }, () => ({
        x: Math.random() * W,
        y: horizon * (0.12 + Math.random() * 0.45),
        s: 40 + Math.random() * 70,
        v: 4 + Math.random() * 7,
      }));
      birds = Array.from({ length: 3 }, () => ({
        x: Math.random() * W,
        y: horizon * (0.25 + Math.random() * 0.3),
        v: 18 + Math.random() * 14,
        p: Math.random() * TAU,
      }));
      if (reduced) draw(5.4, 0);
    }

    function waveY(L: number, x: number, t: number) {
      const l = layers[L];
      const xx = x + drift * (0.4 + l.d * 0.6);
      let y =
        l.base +
        Math.sin(xx * l.f1 + t * l.s1) * l.a1 * ampF +
        Math.sin(xx * l.f2 - t * l.s2 + l.ph) * l.a2 * ampF +
        Math.sin(xx * l.f3 + t * l.s3 + l.ph * 2) * l.a3;
      for (let i = 0; i < impulses.length; i++) {
        const im = impulses[i],
          age = t - im.t0,
          d = x - im.x;
        y +=
          im.amp *
          (0.3 + l.d * 0.7) *
          Math.exp(-age * 1.1) *
          Math.cos(d * 0.045 - age * 7) *
          Math.exp(-Math.abs(d) / (140 + age * 180));
      }
      return y;
    }

    function draw(t: number, dt: number) {
      const u = (U0 + t / CYCLE) % 1;
      const pal = palette(u);
      const alt = Math.cos(u * TAU);
      const day = Math.max(0, alt);
      const nf = Math.min(1, Math.max(0, -alt) * 1.6);
      ampF = 1 + Math.abs(wind) * 0.85;

      const sky = ctx!.createLinearGradient(0, 0, 0, horizon * 1.15);
      sky.addColorStop(0, cssC(pal.top));
      sky.addColorStop(1, cssC(pal.hor));
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, W, H);

      if (nf > 0.02) {
        ctx!.fillStyle = "#fff";
        for (const s of stars) {
          ctx!.globalAlpha =
            nf * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.6 + s.p)));
          ctx!.fillRect(s.x, s.y, s.r, s.r);
        }
        ctx!.globalAlpha = 1;
      }

      const sunX = W * 0.7;
      let sunY = 0;
      if (alt > -0.06) {
        sunY = horizon - alt * horizon * 0.86;
        const g = ctx!.createRadialGradient(sunX, sunY, 0, sunX, sunY, 170);
        g.addColorStop(0, cssC(pal.glow, 0.55));
        g.addColorStop(1, cssC(pal.glow, 0));
        ctx!.fillStyle = g;
        ctx!.fillRect(sunX - 170, sunY - 170, 340, 340);
        ctx!.fillStyle = cssC(pal.sun);
        ctx!.beginPath();
        ctx!.arc(sunX, sunY, 26 + (1 - Math.max(0, alt)) * 14, 0, TAU);
        ctx!.fill();
      }

      const moonX = W * 0.28;
      if (nf > 0.05) {
        const moonY = horizon - Math.max(0, -alt) * horizon * 0.8;
        ctx!.globalAlpha = nf;
        const mg = ctx!.createRadialGradient(moonX, moonY, 0, moonX, moonY, 90);
        mg.addColorStop(0, "rgba(180,210,255,.4)");
        mg.addColorStop(1, "rgba(180,210,255,0)");
        ctx!.fillStyle = mg;
        ctx!.fillRect(moonX - 90, moonY - 90, 180, 180);
        ctx!.fillStyle = "#e8f0ff";
        ctx!.beginPath();
        ctx!.arc(moonX, moonY, 18, 0, TAU);
        ctx!.fill();
        ctx!.fillStyle = cssC(pal.top, 0.9);
        ctx!.beginPath();
        ctx!.arc(moonX - 7, moonY - 4, 15, 0, TAU);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      const cloudA = 0.12 + day * 0.32;
      const cCol = mix([255, 255, 255], pal.hor, 0.35);
      for (const c of clouds) {
        c.x += c.v * dt * (1 + wind * 0.6);
        if (c.x - c.s * 2 > W) c.x = -c.s * 2;
        if (c.x + c.s * 2 < 0) c.x = W + c.s * 2;
        ctx!.fillStyle = cssC(cCol, cloudA);
        for (let k = 0; k < 4; k++) {
          ctx!.beginPath();
          ctx!.ellipse(
            c.x + (k - 1.5) * c.s * 0.5,
            c.y + (k % 2) * c.s * 0.1,
            c.s * (0.65 - Math.abs(k - 1.5) * 0.14),
            c.s * 0.26,
            0,
            0,
            TAU,
          );
          ctx!.fill();
        }
      }

      if (day > 0.12) {
        ctx!.strokeStyle = `rgba(30,40,60,${day * 0.8})`;
        ctx!.lineWidth = 1.6;
        for (const b of birds) {
          b.x += b.v * dt;
          if (b.x > W + 30) {
            b.x = -30;
            b.y = horizon * (0.2 + Math.random() * 0.35);
          }
          const f = Math.sin(t * 7 + b.p) * 4;
          ctx!.beginPath();
          ctx!.moveTo(b.x - 7, b.y - f * 0.6);
          ctx!.quadraticCurveTo(b.x - 3, b.y + f, b.x, b.y);
          ctx!.quadraticCurveTo(b.x + 3, b.y + f, b.x + 7, b.y - f * 0.6);
          ctx!.stroke();
        }
      }

      swellT -= dt;
      if (swellT < 0) {
        impulses.push({ x: Math.random() * W, t0: t, amp: 8 + Math.random() * 8 });
        swellT = 7 + Math.random() * 6;
      }

      for (let i = 0; i < N; i++) {
        const d = layers[i].d;
        const col = mix(pal.seaT, pal.seaB, Math.pow(d, 0.8));
        ctx!.beginPath();
        ctx!.moveTo(0, waveY(i, 0, t));
        for (let x = 4; x <= W + 4; x += 4) ctx!.lineTo(x, waveY(i, x, t));
        ctx!.lineTo(W, H);
        ctx!.lineTo(0, H);
        ctx!.closePath();
        ctx!.fillStyle = cssC(col);
        ctx!.fill();

        let crest = mix(col, [255, 255, 255], 0.3);
        if (nf > 0.05 && i >= N - 2) crest = mix(crest, [64, 255, 214], nf * 0.9);
        ctx!.beginPath();
        ctx!.moveTo(0, waveY(i, 0, t));
        for (let x = 4; x <= W + 4; x += 4) ctx!.lineTo(x, waveY(i, x, t));
        ctx!.strokeStyle = cssC(crest, 0.35 + (i === N - 1 ? nf * 0.5 : 0));
        ctx!.lineWidth = i === N - 1 ? 2 : 1.2;
        ctx!.stroke();

        if (i === 2 && alt > -0.02) {
          const sx = ((t * 55) % (W + 160)) - 80;
          const yA = waveY(2, sx - 8, t),
            yB = waveY(2, sx + 8, t);
          ctx!.save();
          ctx!.translate(sx, (yA + yB) / 2 - 13);
          ctx!.rotate(Math.atan2(yB - yA, 16) * 0.7);
          ctx!.font = "26px serif";
          ctx!.textAlign = "center";
          ctx!.globalAlpha = 0.4 + day * 0.6;
          ctx!.fillText("🏄", 0, 0);
          ctx!.restore();
        }
      }

      const gl =
        alt > 0.02
          ? { x: sunX, c: pal.sun, a: alt }
          : nf > 0.2
            ? { x: moonX, c: [170, 200, 255], a: nf * 0.55 }
            : null;
      if (gl) {
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        const span = (H - horizon) * 0.7;
        for (let y = horizon + 8; y < horizon + span; y += 7) {
          const k = (y - horizon) / span;
          const spread = 10 + k * 110;
          for (let j = 0; j < 2; j++) {
            const xx = gl.x + (Math.random() * 2 - 1) * spread;
            const len = 6 + Math.random() * 26 * (1.2 - k);
            ctx!.globalAlpha = (0.08 + 0.16 * Math.random()) * gl.a * (1 - k * 0.8);
            ctx!.fillStyle = cssC(gl.c);
            ctx!.fillRect(xx - len / 2, y, len, 1.6);
          }
        }
        ctx!.restore();
      }

      const front = N - 1;
      let tries = 2 + ((Math.abs(wind) * 3) | 0);
      while (tries--) {
        if (foam.length > 220) break;
        const x = Math.random() * W;
        const y = waveY(front, x, t);
        if (y < layers[front].base - 9 * ampF) {
          foam.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 30,
            vy: -10 - Math.random() * 30,
            life: 1,
            r: 0.8 + Math.random() * 1.8,
            glow: nf > 0.25 && Math.random() < nf,
          });
        }
      }
      for (let i = foam.length - 1; i >= 0; i--) {
        const p = foam[i];
        p.life -= dt * (p.glow ? 0.7 : 1.4);
        if (p.life <= 0) {
          foam.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 70 * dt;
        if (p.glow) {
          ctx!.save();
          ctx!.globalCompositeOperation = "lighter";
          ctx!.fillStyle = `rgba(80,255,220,${p.life * 0.8})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r * 1.6, 0, TAU);
          ctx!.fill();
          ctx!.restore();
        } else {
          ctx!.fillStyle = `rgba(255,255,255,${p.life * 0.85})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, TAU);
          ctx!.fill();
        }
      }

      for (let i = impulses.length - 1; i >= 0; i--)
        if (t - impulses[i].t0 > 6) impulses.splice(i, 1);
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      wind += (windTarget - wind) * 0.03;
      drift += wind * 90 * dt;
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const rect = cv!.getBoundingClientRect();
      windTarget = ((e.clientX - rect.left) / W - 0.5) * 2;
    }
    function onDown(e: PointerEvent) {
      const rect = cv!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = performance.now() / 1000;
      impulses.push({ x, t0: t, amp: 30 });
      const y = waveY(N - 1, x, t);
      for (let i = 0; i < 16; i++) {
        foam.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 240,
          vy: -60 - Math.random() * 200,
          life: 1,
          r: 1 + Math.random() * 2.5,
          glow: false,
        });
      }
    }

    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerdown", onDown);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    if (!reduced) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerdown", onDown);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
