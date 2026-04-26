'use client';

import React, { useRef, useEffect } from 'react';

interface Petal {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number; spin: number;
  size: number; alpha: number;
  swingPhase: number; swingSpeed: number;
  hue: number;
}

interface CherryBlossomsProps {
  count?: number;
  visible?: boolean;
}

function spawnPetal(w: number): Petal {
  return {
    x: Math.random() * w,
    y: -20,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 0.6 + Math.random() * 1.2,
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 3,
    size: 5 + Math.random() * 8,
    alpha: 0.6 + Math.random() * 0.4,
    swingPhase: Math.random() * Math.PI * 2,
    swingSpeed: 0.02 + Math.random() * 0.03,
    hue: 340 + Math.random() * 30, // pink
  };
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation * Math.PI / 180);
  ctx.globalAlpha = p.alpha;

  const col = `hsl(${p.hue}, 90%, 80%)`;
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 4;

  // Simple petal shape: two arcs
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo( p.size, -p.size * 0.5, 0, -p.size);
  ctx.quadraticCurveTo(-p.size,  -p.size * 0.5, 0, 0);
  ctx.fill();

  ctx.restore();
}

export const CherryBlossoms: React.FC<CherryBlossomsProps> = ({
  count = 80,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const petals    = useRef<Petal[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn staggered petals
    for (let i = 0; i < count; i++) {
      const p = spawnPetal(canvas.width);
      p.y = Math.random() * canvas.height; // pre-seed Y so screen isn't empty at start
      petals.current.push(p);
    }

    const spawnTimer = setInterval(() => {
      if (petals.current.length < count) {
        petals.current.push(spawnPetal(canvas.width));
      }
    }, 300);

    const draw = () => {
      if (!visible) { rafRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Soft sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,220,230,0.15)');
      grad.addColorStop(1, 'rgba(255,180,200,0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = petals.current.length - 1; i >= 0; i--) {
        const p = petals.current[i];
        p.swingPhase += p.swingSpeed;
        p.x  += p.vx + Math.sin(p.swingPhase) * 0.8;
        p.y  += p.vy;
        p.rotation += p.spin;

        if (p.y > canvas.height + 30) {
          petals.current.splice(i, 1);
          continue;
        }
        drawPetal(ctx, p);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(spawnTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [count, visible]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};
