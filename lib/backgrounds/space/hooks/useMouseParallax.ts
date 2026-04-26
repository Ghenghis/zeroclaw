'use client';

import { useEffect, useRef } from 'react';

export interface MouseState {
  x: number;  // -0.5 to 0.5 normalized
  y: number;
}

interface UseMouseParallaxOptions {
  smoothing?: number;  // 0-1, lower = smoother
  enabled?: boolean;
}

/**
 * Returns a stable ref (not state) so canvas loops can read it
 * without triggering React re-renders on every mouse move.
 */
export function useMouseParallax(
  options: UseMouseParallaxOptions = {}
): React.MutableRefObject<MouseState> {
  const { smoothing = 0.05, enabled = true } = options;

  const mouseRef = useRef<MouseState>({ x: 0, y: 0 });
  const targetRef = useRef<MouseState>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = {
        x: (e.clientX / window.innerWidth)  - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      targetRef.current = {
        x: (t.clientX / window.innerWidth)  - 0.5,
        y: (t.clientY / window.innerHeight) - 0.5,
      };
    };

    // Lerp loop — runs independently of render
    const lerp = () => {
      mouseRef.current = {
        x: mouseRef.current.x + (targetRef.current.x - mouseRef.current.x) * smoothing,
        y: mouseRef.current.y + (targetRef.current.y - mouseRef.current.y) * smoothing,
      };
      rafRef.current = requestAnimationFrame(lerp);
    };
    rafRef.current = requestAnimationFrame(lerp);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [smoothing, enabled]);

  return mouseRef;
}
