'use client';

import React, { useRef, useEffect } from 'react';

interface Firefly {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  targetAlpha: number;
  blinkSpeed: number;
  size: number;
  hue: number;
  glowRadius: number;
  wanderAngle: number;
}

interface FireflySystemProps {
  count?: number;
  visible?: boolean;
}

function createFirefly(w: number, h: number): Firefly {
  return {
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    alpha: 0, targetAlpha: 0.6 + Math.random() * 0.4,
    blinkSpeed: 0.01 + Math.random() * 0.02,
    size: 2 + Math.random() * 2,
    hue: 50 + Math.random() * 60,  // yellow-green
    glowRadius: 12 + Math.random() * 20,
    wanderAngle: Math.random() * Math.PI * 2,
  };
}

export const FireflySystem: React.FC<FireflySystemProps> = ({
  count = 60,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const flies     = useRef<Firefly[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      flies.current = Array.from({ length: count }, () =>
        createFirefly(canvas.width, canvas.height)
      );
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!visible) { rafRef.current = requestAnimationFrame(draw); return; }

      // Fade trail effect
      ctx.fillStyle = 'rgba(5,15,5,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      flies.current.forEach(f => {
        // Wander steering
        f.wanderAngle += (Math.random() - 0.5) * 0.3;
        f.vx += Math.cos(f.wanderAngle) * 0.04;
        f.vy += Math.sin(f.wanderAngle) * 0.04;

        // Clamp speed
        const speed = Math.hypot(f.vx, f.vy);
        if (speed > 1.2) { f.vx *= 1.2 / speed; f.vy *= 1.2 / speed; }

        f.x += f.vx;
        f.y += f.vy;

        // Wrap at edges
        if (f.x < 0) f.x = canvas.width;
        if (f.x > canvas.width)  f.x = 0;
        if (f.y < 0) f.y = canvas.height;
        if (f.y > canvas.height) f.y = 0;

        // Blink — alpha oscillates toward targetAlpha then flips
        if (Math.abs(f.alpha - f.targetAlpha) < 0.02) {
          f.targetAlpha = f.targetAlpha > 0.3
            ? Math.random() * 0.1
            : 0.5 + Math.random() * 0.5;
        }
        f.alpha += (f.targetAlpha - f.alpha) * f.blinkSpeed;

        if (f.alpha < 0.05) return;

        // Draw glow
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.glowRadius);
        grad.addColorStop(0, `hsla(${f.hue}, 100%, 80%, ${f.alpha})`);
        grad.addColorStop(1, `hsla(${f.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(
          f.x - f.glowRadius, f.y - f.glowRadius,
          f.glowRadius * 2,   f.glowRadius * 2
        );

        // Draw core dot
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${f.hue}, 100%, 95%, ${f.alpha})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const vis = () => { if (document.hidden) cancelAnimationFrame(rafRef.current); else rafRef.current = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', vis);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', vis);
      cancelAnimationFrame(rafRef.current);
    };
  }, [count, visible]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      aria-hidden="true"
    />
  );
};
