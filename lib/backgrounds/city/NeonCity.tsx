'use client';

import React, { useRef, useEffect } from 'react';

interface Building {
  x: number; width: number; height: number;
  color: string; layer: number;
  windows: { x: number; y: number; on: boolean; blinkRate: number }[];
}

interface NeonCityProps {
  visible?: boolean;
  accentColor?: string;
}

const NEON_COLORS = ['#ff0080', '#00ffff', '#ff6600', '#8800ff', '#00ff88', '#ffff00'];

function buildCity(w: number, h: number): Building[] {
  const buildings: Building[] = [];
  for (let layer = 3; layer >= 1; layer--) {
    const buildW = layer === 3 ? 40 : layer === 2 ? 60 : 80;
    const maxH   = layer === 3 ? h * 0.6 : layer === 2 ? h * 0.45 : h * 0.3;

    for (let x = 0; x < w + buildW; x += buildW + Math.floor(Math.random() * 20)) {
      const bh = maxH * (0.4 + Math.random() * 0.6);
      const col = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      const winCols = Math.floor(buildW / 12);
      const winRows = Math.floor(bh / 16);
      const windows = [];
      for (let wr = 0; wr < winRows; wr++) {
        for (let wc = 0; wc < winCols; wc++) {
          windows.push({
            x: wc * 12 + 4,
            y: wr * 16 + 6,
            on: Math.random() > 0.3,
            blinkRate: Math.random() * 0.005,
          });
        }
      }
      buildings.push({ x, width: buildW, height: bh, color: col, layer, windows });
    }
  }
  return buildings;
}

export const NeonCity: React.FC<NeonCityProps> = ({
  visible = true,
  accentColor = '#ff0080',
}) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number>(0);
  const buildings  = useRef<Building[]>([]);
  const scrollX    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      buildings.current = buildCity(canvas.width * 2, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!visible) { rafRef.current = requestAnimationFrame(draw); return; }
      const w = canvas.width, h = canvas.height;

      // Night sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#050010');
      skyGrad.addColorStop(0.7, '#0a0020');
      skyGrad.addColorStop(1, '#150030');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 80; i++) {
        const sx = (i * 173.7) % w;
        const sy = (i * 97.3)  % (h * 0.5);
        const sz = 0.5 + (i % 3) * 0.5;
        ctx.fillRect(sx, sy, sz, sz);
      }

      // Ground reflection glow
      const glowGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      glowGrad.addColorStop(0, `${accentColor}00`);
      glowGrad.addColorStop(1, `${accentColor}22`);
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Buildings — back to front
      [3, 2, 1].forEach(layer => {
        const layerAlpha = layer === 3 ? 0.4 : layer === 2 ? 0.7 : 1.0;
        const layerScroll = scrollX.current * (layer === 3 ? 0.15 : layer === 2 ? 0.35 : 0.6);

        buildings.current
          .filter(b => b.layer === layer)
          .forEach(b => {
            const bx = b.x - layerScroll;
            if (bx + b.width < 0 || bx > w) return;
            const by = h - b.height;

            // Building silhouette
            ctx.fillStyle = `rgba(10,5,20,${layerAlpha})`;
            ctx.fillRect(bx, by, b.width, b.height);

            // Neon edge glow
            if (layer === 1) {
              ctx.strokeStyle = b.color;
              ctx.lineWidth = 1;
              ctx.shadowColor = b.color;
              ctx.shadowBlur  = 8;
              ctx.strokeRect(bx, by, b.width, b.height);
              ctx.shadowBlur = 0;
            }

            // Windows
            b.windows.forEach(win => {
              if (Math.random() < win.blinkRate) win.on = !win.on;
              if (!win.on) return;
              const alpha = 0.6 + Math.sin(Date.now() * 0.001 + win.x) * 0.2;
              ctx.fillStyle = layer === 1
                ? `rgba(255,220,100,${alpha * layerAlpha})`
                : `rgba(200,180,80,${alpha * layerAlpha * 0.5})`;
              ctx.fillRect(bx + win.x, by + win.y, 6, 8);
            });
          });
      });

      // Ground
      ctx.fillStyle = '#08001a';
      ctx.fillRect(0, h * 0.88, w, h * 0.12);

      // Ground neon reflection lines
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `${accentColor}${(30 - i * 5).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.89 + i * 4);
        ctx.lineTo(w, h * 0.89 + i * 4);
        ctx.stroke();
      }

      // Slow scroll
      scrollX.current += 0.4;
      if (scrollX.current > canvas.width) {
        scrollX.current = 0;
        buildings.current = buildCity(canvas.width * 2, canvas.height);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      aria-hidden="true"
    />
  );
};
