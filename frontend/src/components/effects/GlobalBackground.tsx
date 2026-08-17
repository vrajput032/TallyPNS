import { useCallback, useEffect, useRef, useState } from "react";

export function useMousePosition() {
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });

  const handleMove = useCallback((e: MouseEvent) => {
    setPos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [handleMove]);

  return pos;
}

type Point = { x: number; y: number };

function generateLine(width: number, height: number, seed: number): Point[] {
  const pts: Point[] = [];
  const segments = 5 + Math.floor(seed * 4);
  const baseY = height * (0.2 + seed * 0.6);
  for (let i = 0; i <= segments; i++) {
    pts.push({
      x: (width / segments) * i,
      y: baseY + Math.sin((i / segments) * Math.PI * 2 + seed) * height * 0.12
        + (Math.random() - 0.5) * height * 0.06,
    });
  }
  return pts;
}

export function GlobalBackground() {
  const { x, y } = useMousePosition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<{ pts: Point[]; seed: number; hue: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      linesRef.current = [0.15, 0.35, 0.55, 0.75].map((sy, i) => ({
        pts: generateLine(canvas.width, canvas.height, i * 1.7 + 0.3),
        seed: i * 1.7 + 0.3,
        hue: 210 + i * 30 + (sy * 40),
        alpha: 0.06 + i * 0.02,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // --- Mouse-following glow ---
      const gx = x * W;
      const gy = y * H;
      const g1 = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.4);
      g1.addColorStop(0, "rgba(59, 130, 246, 0.15)");
      g1.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);

      // Secondary warm glow
      const g2 = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.25);
      g2.addColorStop(0, "rgba(244, 114, 182, 0.07)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);

      // --- Animated floating orbs ---
      const t = Date.now() * 0.001;
      const drawOrb = (ox: number, oy: number, r: number, color: string, a: number) => {
        const ax = W * ox + Math.sin(t * 0.6) * 50;
        const ay = H * oy + Math.cos(t * 0.4) * 35;
        const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
        g.addColorStop(0, color.replace("1)", `${a})`));
        g.addColorStop(1, color.replace("1)", "0)"));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      drawOrb(0.2, 0.15, 200, "rgba(96,165,250,1)", 0.1);
      drawOrb(0.75, 0.7, 250, "rgba(167,139,250,1)", 0.07);
      drawOrb(0.5, 0.5, 300, "rgba(244,114,182,1)", 0.04);

      // --- 3D animated perspective lines ---
      const vanishX = x * W;
      const vanishY = H * 0.15;

      // Horizontal flow lines
      for (let i = 0; i < 6; i++) {
        const baseY = H * (0.3 + i * 0.1) + Math.sin(t * 0.5 + i) * 15;
        const hue = 210 + i * 25;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        for (let px = 0; px <= W; px += 4) {
          const perspective = (px - vanishX) / (W * 0.6);
          const wave = Math.sin(px * 0.008 + t * 1.2 + i * 0.8) * (20 + Math.abs(perspective) * 30);
          ctx.lineTo(px, baseY + wave + perspective * 40);
        }
        ctx.strokeStyle = `hsla(${hue}, 70%, 65%, 0.08)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Radiating 3D lines from vanishing point
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 0.15) + (i / 10) * Math.PI * 0.7;
        const endX = vanishX + Math.cos(angle) * W * 1.5;
        const endY = vanishY + Math.sin(angle) * H * 2;
        const hue = 200 + i * 15;

        ctx.beginPath();
        ctx.moveTo(vanishX, vanishY);

        const cpx1 = vanishX + (endX - vanishX) * 0.25 + Math.sin(t + i) * 30;
        const cpy1 = vanishY + (endY - vanishY) * 0.25;
        const cpx2 = vanishX + (endX - vanishX) * 0.6 + Math.cos(t * 0.8 + i) * 20;
        const cpy2 = vanishY + (endY - vanishY) * 0.6;
        ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, endX, endY);

        const grad = ctx.createLinearGradient(vanishX, vanishY, endX, endY);
        grad.addColorStop(0, `hsla(${hue}, 70%, 65%, 0.18)`);
        grad.addColorStop(0.4, `hsla(${hue}, 70%, 65%, 0.04)`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Moving particles along the lines
      for (let i = 0; i < 12; i++) {
        const px = ((t * 40 + i * 97) % (W + 200)) - 100;
        const baseLineY = H * (0.25 + (i % 6) * 0.1);
        const py =
          baseLineY +
          Math.sin(px * 0.008 + t * 1.2 + (i % 6) * 0.8) * (20 + Math.abs((px - vanishX) / (W * 0.6)) * 30) +
          Math.cos(t * 2 + i) * 8;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 3);
        glow.addColorStop(0, `hsla(${210 + i * 20}, 80%, 70%, 0.5)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [x, y]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 1 }}
    />
  );
}
