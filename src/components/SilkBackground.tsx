import { useEffect, useRef } from "react";

interface Ember {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
  phase: number;
}

export const SilkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    tx: window.innerWidth / 2,
    ty: window.innerHeight / 2,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let isVisible = !document.hidden;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initEmbers();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.tx = e.clientX;
      mouseRef.current.ty = e.clientY;
    };

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      } else {
        cancelAnimationFrame(animId);
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    // Embers (Loki / Emerald temporal sparks)
    let embers: Ember[] = [];
    const initEmbers = () => {
      embers = [];
      const count = Math.min(45, Math.floor(width / 35));
      for (let i = 0; i < count; i++) {
        embers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * 0.8 + 0.2,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.7 + 0.2,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.5 - 0.2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    initEmbers();

    // Temporal Loom Ribbons definition (optimized count & performance)
    const ribbonCount = 9;
    const ribbons = Array.from({ length: ribbonCount }, (_, i) => ({
      baseY: (height / (ribbonCount + 1)) * (i + 1),
      amplitude: 30 + (i % 4) * 12,
      frequency: 0.0016 + (i % 3) * 0.0006,
      speed: 0.0006 + (i % 3) * 0.0003,
      phase: (i * Math.PI) / 3,
      width: 1.2 + (i % 3) * 0.6,
      color: i % 2 === 0 ? "52, 211, 153" : "16, 185, 129",
      alpha: 0.18 + (i % 3) * 0.08,
    }));

    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible) return;

      const delta = Math.min(32, time - lastTime);
      lastTime = time;

      // Smooth mouse tracking with lerp
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.06;

      // Base deep obsidian background
      ctx.fillStyle = "#030805";
      ctx.fillRect(0, 0, width, height);

      // 1. Ambient Volumetric Glow Orbs (GPU-friendly screen blend)
      ctx.globalCompositeOperation = "screen";

      const orb1X = width * 0.25 + Math.sin(time * 0.0003) * 100;
      const orb1Y = height * 0.35 + Math.cos(time * 0.00025) * 80;
      const rad1 = Math.max(width, height) * 0.4;
      const grad1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, rad1);
      grad1.addColorStop(0, "rgba(16, 110, 68, 0.3)");
      grad1.addColorStop(0.5, "rgba(8, 48, 30, 0.1)");
      grad1.addColorStop(1, "rgba(3, 8, 5, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const orb2X = width * 0.75 + Math.cos(time * 0.00028) * 120;
      const orb2Y = height * 0.65 + Math.sin(time * 0.00035) * 90;
      const rad2 = Math.max(width, height) * 0.45;
      const grad2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, rad2);
      grad2.addColorStop(0, "rgba(22, 130, 80, 0.24)");
      grad2.addColorStop(0.5, "rgba(10, 60, 38, 0.08)");
      grad2.addColorStop(1, "rgba(3, 8, 5, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Mouse interactive aura
      const mouseGrad = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        280
      );
      mouseGrad.addColorStop(0, "rgba(52, 211, 153, 0.14)");
      mouseGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.04)");
      mouseGrad.addColorStop(1, "rgba(3, 8, 5, 0)");
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. High-Performance Temporal Loom Ribbons (Zero-allocation direct path drawing)
      const step = 20;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let idx = 0; idx < ribbonCount; idx++) {
        const r = ribbons[idx];
        const t = time * r.speed;

        ctx.beginPath();
        let isFirst = true;

        for (let x = 0; x <= width; x += step) {
          const w1 = Math.sin(x * r.frequency + t + r.phase);
          const w2 = Math.cos(x * r.frequency * 1.6 - t * 0.5 + idx);

          const dx = x - mx;
          const dy = r.baseY - my;
          const distSq = dx * dx + dy * dy;
          let mouseWarp = 0;
          if (distSq < 78400 && distSq > 0) {
            const dist = Math.sqrt(distSq);
            mouseWarp = Math.sin(dist * 0.025 - time * 0.003) * (1 - dist / 280) * 32;
          }

          const y = r.baseY + (w1 + w2) * r.amplitude + mouseWarp;

          if (isFirst) {
            ctx.moveTo(x, y);
            isFirst = false;
          } else {
            ctx.lineTo(x, y);
          }
        }

        // Pass 1: Soft outer glow
        ctx.strokeStyle = `rgba(${r.color}, ${r.alpha * 0.35})`;
        ctx.lineWidth = r.width * 3.5;
        ctx.stroke();

        // Pass 2: Crisp core line
        ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
        ctx.lineWidth = r.width;
        ctx.stroke();
      }

      // 3. Floating Temporal Embers (lightweight 2-pass glow)
      const emberCount = embers.length;
      for (let i = 0; i < emberCount; i++) {
        const p = embers[i];
        p.y += p.vy * (delta / 16.6);
        p.x += p.vx * (delta / 16.6) + Math.sin(time * 0.001 + p.phase) * 0.25;

        if (p.y < -15) {
          p.y = height + 15;
          p.x = Math.random() * width;
        }

        const flicker = Math.sin(time * 0.003 + p.phase) * 0.25 + 0.75;
        const currentAlpha = p.alpha * flicker;

        // Outer halo
        ctx.fillStyle = `rgba(110, 231, 183, ${currentAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(240, 253, 244, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="silk-background-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="silk-canvas-viewport" />
      <div className="temporal-grid-mesh" />
      <div className="silk-radial-vignette" />
    </div>
  );
};
