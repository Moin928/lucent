import { useEffect, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let startTime = 0;
    const TOTAL_DURATION = 2600; // ms

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const finish = () => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      cancelAnimationFrame(animId);
      onComplete();
    };

    // Capture-phase event listeners to immediately intercept clicks/keys without leaking to DOM beneath
    const handleSkip = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      finish();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.stopPropagation();
        e.preventDefault();
        finish();
      }
    };

    window.addEventListener("pointerdown", handleSkip, { capture: true });
    window.addEventListener("click", handleSkip, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    // ── Particle system ──
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; life: number; maxLife: number;
      hue: number;
    }

    const particles: Particle[] = [];

    function spawnParticles(cx: number, cy: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 2,
          size: 1.5 + Math.random() * 2.5,
          life: 0,
          maxLife: 0.5 + Math.random() * 0.6,
          hue: 145 + Math.random() * 30,
        });
      }
    }

    // ── Lightning bolts ──
    interface LightningBolt {
      points: { x: number; y: number }[];
      life: number;
      maxLife: number;
      width: number;
    }

    const bolts: LightningBolt[] = [];

    function spawnBolt(w: number, h: number) {
      const sx = w * 0.2 + Math.random() * (w * 0.6);
      const sy = 0;
      const ex = sx + (Math.random() - 0.5) * (w * 0.4);
      const ey = h * 0.35 + Math.random() * (h * 0.3);
      const pts = [{ x: sx, y: sy }];
      let cx = sx; let cy = sy;
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        const tx = sx + (ex - sx) * t;
        const ty = sy + (ey - sy) * t;
        cx = tx + (Math.random() - 0.5) * 60;
        cy = ty + (Math.random() - 0.5) * 20;
        pts.push({ x: cx, y: cy });
      }
      pts.push({ x: ex, y: ey });
      bolts.push({ points: pts, life: 0, maxLife: 0.15, width: 1.5 });
    }

    const RUNE_CHARS = "✦✧⊕⊗⊘⊙◈◇◆❖✴✵✶✷✸✹✺";

    function drawFrame(ts: number) {
      if (!ctx) return;
      if (startTime === 0) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(elapsed / TOTAL_DURATION, 1);

      const W = canvas?.width ?? window.innerWidth;
      const H = canvas?.height ?? window.innerHeight;
      const cx = W / 2;
      const cy = H / 2;

      // Animation phases
      const phase1 = Math.min(t / 0.18, 1);
      const phase2 = Math.max(0, Math.min((t - 0.18) / 0.4, 1));
      const phase3 = Math.max(0, Math.min((t - 0.55) / 0.3, 1));
      const phase4 = Math.max(0, (t - 0.88) / 0.12);

      // Void background
      ctx.fillStyle = "#010503";
      ctx.fillRect(0, 0, W, H);

      // Vortex Glow
      if (phase1 > 0) {
        ctx.globalCompositeOperation = "screen";
        const r = 200 * phase1;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(52, 211, 153, ${0.4 * phase1})`);
        gradient.addColorStop(0.5, `rgba(16, 185, 129, ${0.15 * phase1})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
      }

      // Runic concentric rings
      if (phase1 > 0.1) {
        const rings = [
          { radius: 105, count: 12, speed: 0.35, size: 13, alpha: 0.65 },
          { radius: 165, count: 18, speed: -0.22, size: 11, alpha: 0.45 },
          { radius: 225, count: 24, speed: 0.16, size: 9, alpha: 0.3 },
        ];
        for (const ring of rings) {
          const rot = (elapsed / 1000) * ring.speed * Math.PI * 2;
          ctx.font = `${ring.size}px serif`;
          ctx.fillStyle = `rgba(110, 231, 183, ${ring.alpha * Math.min(phase1 * 2, 1)})`;
          for (let i = 0; i < ring.count; i++) {
            const a = rot + (i / ring.count) * Math.PI * 2;
            const rx = cx + Math.cos(a) * ring.radius;
            const ry = cy + Math.sin(a) * ring.radius;
            const char = RUNE_CHARS[i % RUNE_CHARS.length];
            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(a + Math.PI / 2);
            ctx.fillText(char, -ring.size / 2, ring.size / 2);
            ctx.restore();
          }
        }
      }

      // Concentric Dashed Arc Rings
      const arcCount = 4;
      for (let i = 0; i < arcCount; i++) {
        const r = 85 + i * 42;
        const angle = (elapsed / 1000) * (i % 2 === 0 ? 0.25 : -0.2) * Math.PI * 2;
        const dashLen = (Math.PI * 2 * r) / (8 + i * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(52, 211, 153, ${0.18 * phase1})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([dashLen, dashLen * 0.6]);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);

      // Radial Beams
      if (phase1 > 0.2) {
        const beamCount = 12;
        for (let i = 0; i < beamCount; i++) {
          const a = (i / beamCount) * Math.PI * 2 + (elapsed / 1000) * 0.1 * Math.PI * 2;
          const beamLen = 50 + 110 * phase2;
          const alpha = 0.25 * phase1 * (1 - phase4);
          const grad = ctx.createLinearGradient(
            cx, cy,
            cx + Math.cos(a) * beamLen,
            cy + Math.sin(a) * beamLen,
          );
          grad.addColorStop(0, `rgba(52, 211, 153, ${alpha})`);
          grad.addColorStop(1, "rgba(52, 211, 153, 0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * beamLen, cy + Math.sin(a) * beamLen);
          ctx.stroke();
        }
      }

      // Lightning Strikes
      if (phase2 > 0.1 && Math.random() < 0.12) {
        spawnBolt(W, H);
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life += 0.016 / b.maxLife;
        if (b.life > 1) { bolts.splice(i, 1); continue; }
        const bAlpha = Math.sin(b.life * Math.PI) * 0.9;
        ctx.strokeStyle = `rgba(167, 243, 208, ${bAlpha})`;
        ctx.lineWidth = b.width;
        ctx.beginPath();
        ctx.moveTo(b.points[0].x, b.points[0].y);
        for (let j = 1; j < b.points.length; j++) {
          ctx.lineTo(b.points[j].x, b.points[j].y);
        }
        ctx.stroke();
      }

      // Particles
      if (phase2 > 0.05) {
        spawnParticles(cx, cy, Math.floor(3 * phase2));
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.life += 0.016 / p.maxLife;
        if (p.life > 1) { particles.splice(i, 1); continue; }
        const alpha = Math.sin(p.life * Math.PI) * 0.85;
        ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // Cinematic Title Reveal
      if (phase3 > 0) {
        const titleAlpha = Math.min(phase3 * 1.8, 1);
        ctx.save();

        // LUCENT Main Title
        ctx.font = `bold ${Math.floor(68 * (0.8 + 0.2 * phase3))}px 'Cinzel Decorative', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Glow underlay
        ctx.fillStyle = `rgba(52, 211, 153, ${titleAlpha * 0.4})`;
        ctx.fillText("LUCENT", cx, cy + 2);

        // Crisp white/mint gradient core
        const gTitle = ctx.createLinearGradient(cx - 180, cy, cx + 180, cy);
        gTitle.addColorStop(0, `rgba(255, 255, 255, ${titleAlpha})`);
        gTitle.addColorStop(0.5, `rgba(167, 243, 208, ${titleAlpha})`);
        gTitle.addColorStop(1, `rgba(255, 255, 255, ${titleAlpha})`);
        ctx.fillStyle = gTitle;
        ctx.fillText("LUCENT", cx, cy);

        // Subtitle
        ctx.font = `${Math.floor(13 * phase3)}px 'Cinzel', serif`;
        ctx.fillStyle = `rgba(110, 231, 183, ${titleAlpha * 0.85})`;
        ctx.fillText("LOCAL NEURAL UPSCALER", cx, cy + 54);

        // Author attribution
        ctx.font = `11px 'Philosopher', serif`;
        ctx.fillStyle = `rgba(110, 231, 183, ${titleAlpha * 0.5})`;
        ctx.fillText("© 2025 Qureshi Mohammed Moin", cx, cy + 80);

        ctx.restore();
      }

      // Fade-out veil
      if (phase4 > 0) {
        ctx.fillStyle = `rgba(1, 5, 3, ${phase4})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) {
        animId = requestAnimationFrame(drawFrame);
      } else {
        finish();
      }
    }

    animId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", handleSkip, { capture: true });
      window.removeEventListener("click", handleSkip, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#010503",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
