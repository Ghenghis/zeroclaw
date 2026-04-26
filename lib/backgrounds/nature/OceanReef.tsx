'use client';

import React, { useRef, useEffect } from 'react';
import { useBoids } from './useBoids';

interface OceanReefProps {
  fishCount?: number;
  visible?: boolean;
}

const FISH_COLORS = ['#00c8ff', '#ff6b35', '#ffd700', '#00ff88', '#ff88cc', '#aaffee'];

export const OceanReef: React.FC<OceanReefProps> = ({
  fishCount = 40,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const boids     = useBoids({ count: fishCount, width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      boids.resize(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Bubble system
    const bubbles: { x: number; y: number; r: number; vy: number; alpha: number }[] = [];
    const spawnBubble = () => {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        r: 2 + Math.random() * 6,
        vy: -(0.4 + Math.random() * 0.8),
        alpha: 0.5 + Math.random() * 0.4,
      });
    };
    const bubbleTimer = setInterval(spawnBubble, 400);

    const draw = () => {
      if (!visible) { rafRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ocean gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(0,30,80,0.9)');
      grad.addColorStop(1, 'rgba(0,8,30,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Caustics shimmer (simple sine overlay)
      const t = Date.now() * 0.001;
      for (let i = 0; i < 8; i++) {
        const cx = (Math.sin(t * 0.3 + i * 0.8) * 0.5 + 0.5) * canvas.width;
        const cy = (Math.sin(t * 0.2 + i * 1.1) * 0.5 + 0.5) * canvas.height * 0.7;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80 + Math.sin(t + i) * 30);
        cg.addColorStop(0, 'rgba(0,200,255,0.04)');
        cg.addColorStop(1, 'rgba(0,200,255,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Bubbles
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y += b.vy;
        b.x += Math.sin(Date.now() * 0.002 + i) * 0.3;
        b.alpha -= 0.002;
        if (b.y < -10 || b.alpha <= 0) { bubbles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,220,255,${b.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Fish (boids)
      boids.update();
      const bs = boids.getBoids();
      bs.forEach((fish, idx) => {
        const col = FISH_COLORS[idx % FISH_COLORS.length];
        const angle = Math.atan2(fish.vy, fish.vx);
        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(angle);

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur  = 6;
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-13, -5);
        ctx.lineTo(-13, 5);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();

        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      clearInterval(bubbleTimer);
    };
  }, [boids, visible]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      aria-hidden="true"
    />
  );
};
