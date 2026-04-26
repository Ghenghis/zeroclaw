'use client';

import React, { useRef, useEffect } from 'react';

interface Column {
  y: number;
  speed: number;
  chars: string[];
  length: number;
  hue: number;
}

interface MatrixRainProps {
  color?: string;      // primary glyph color
  density?: number;    // columns per 100px width
  visible?: boolean;
}

const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*<>';

export const MatrixRain: React.FC<MatrixRainProps> = ({
  color   = '#00ff41',
  density = 1.4,
  visible = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const FONT_SIZE = 14;
    let cols: Column[] = [];

    const init = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const numCols = Math.floor((canvas.width / FONT_SIZE) * density);
      cols = Array.from({ length: numCols }, (_, i) => ({
        y:      Math.random() * -canvas.height,
        speed:  0.5 + Math.random() * 1.5,
        chars:  Array.from({ length: 30 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        length: 15 + Math.floor(Math.random() * 20),
        hue:    parseInt(color.replace('#', '').slice(0, 2), 16) > 200 ? 120 : 120,
      }));
    };
    init();
    window.addEventListener('resize', init);

    let lastMutation = 0;

    const draw = () => {
      if (!visible) { rafRef.current = requestAnimationFrame(draw); return; }

      // Fade with semi-transparent black for trail effect
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      // Mutate random characters occasionally
      const now = Date.now();
      if (now - lastMutation > 80) {
        cols.forEach(col => {
          if (Math.random() < 0.1) {
            const idx = Math.floor(Math.random() * col.chars.length);
            col.chars[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        });
        lastMutation = now;
      }

      cols.forEach((col, ci) => {
        const x = ci * FONT_SIZE + (ci / cols.length) * canvas.width / cols.length * (cols.length - 1);

        for (let j = 0; j < col.length; j++) {
          const charY = col.y - j * FONT_SIZE;
          if (charY < 0 || charY > canvas.height) continue;

          const progress = j / col.length;
          if (j === 0) {
            // Leading char — bright white
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = color;
            ctx.shadowBlur  = 12;
          } else {
            // Trail — fades to dark
            const alpha = 1 - progress;
            ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
            ctx.shadowBlur = 0;
          }
          ctx.fillText(col.chars[j % col.chars.length], x, charY);
        }
        ctx.shadowBlur = 0;

        col.y += col.speed * FONT_SIZE * 0.3;
        if (col.y - col.length * FONT_SIZE > canvas.height) {
          col.y = -(col.length * FONT_SIZE);
          col.speed = 0.5 + Math.random() * 1.5;
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    const vis = () => { if (document.hidden) cancelAnimationFrame(rafRef.current); else rafRef.current = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', vis);

    return () => {
      window.removeEventListener('resize', init);
      document.removeEventListener('visibilitychange', vis);
      cancelAnimationFrame(rafRef.current);
    };
  }, [color, density, visible]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#000' }}
      aria-hidden="true"
    />
  );
};
