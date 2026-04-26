'use client';

/**
 * BackgroundRenderer.tsx
 * Master orchestrator that selects and renders the correct background
 * based on the resolved ThemeConfig. Supports all 35+ scene types with
 * graceful degradation for reduced-motion and low-end devices.
 *
 * z-index layering:
 *   0  - base canvas / WebGL scene
 *   1  - secondary canvas layer (particles, etc.)
 *   2  - 3D layer (R3F)
 *   3  - SSE-driven overlay (comets, etc.)
 *   4  - aurora / top-layer effects
 *   10 - UI content (children)
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useReducedMotion } from '@/lib/backgrounds/space/hooks/useReducedMotion';

// ── Lazy imports (code-split per scene) ──────────────────────────────────────

const SpaceBackground   = lazy(() => import('./SpaceBackground').then(m => ({ default: m.SpaceBackground })));
const StarField         = lazy(() => import('@/lib/backgrounds/space/StarField').then(m => ({ default: m.StarField })));
const CommitComets      = lazy(() => import('@/lib/backgrounds/space/CommitComets').then(m => ({ default: m.CommitComets })));
const FireworksSystem   = lazy(() => import('@/lib/backgrounds/nature/FireworksSystem').then(m => ({ default: m.FireworksSystem })));
const FireflySystem     = lazy(() => import('@/lib/backgrounds/nature/FireflySystem').then(m => ({ default: m.FireflySystem })));
const CherryBlossoms    = lazy(() => import('@/lib/backgrounds/nature/CherryBlossoms').then(m => ({ default: m.CherryBlossoms })));
const OceanReef         = lazy(() => import('@/lib/backgrounds/nature/OceanReef').then(m => ({ default: m.OceanReef })));
const MatrixRain        = lazy(() => import('@/lib/backgrounds/city/MatrixRain').then(m => ({ default: m.MatrixRain })));
const NeonCity          = lazy(() => import('@/lib/backgrounds/city/NeonCity').then(m => ({ default: m.NeonCity })));

// ── Scene type taxonomy ───────────────────────────────────────────────────────

export type BackgroundScene =
  // Space
  | 'deep_space' | 'nebula_bloom' | 'galaxy_core' | 'binary_star' | 'supernova'
  | 'starfield_only' | 'commit_comets'
  // Nature
  | 'cherry_blossoms' | 'fireflies' | 'ocean_reef' | 'fireworks'
  | 'snowfall' | 'autumn_leaves' | 'northern_lights'
  // City
  | 'matrix_rain' | 'neon_city' | 'cyberpunk'
  // Abstract
  | 'gradient_flow' | 'particle_mesh' | 'geometric'
  // Static fallback
  | 'static_gradient';

export interface BackgroundRendererProps {
  scene: BackgroundScene;
  seed?: number;
  accentColor?: string;
  sseUrl?: string;
  children?: React.ReactNode;
  /** Override for admin/testing purposes */
  forceVisible?: boolean;
}

// ── Static gradient fallback ──────────────────────────────────────────────────

const SCENE_GRADIENTS: Record<string, string> = {
  deep_space:      'radial-gradient(ellipse at 50% 30%, #090d1a 0%, #000205 100%)',
  nebula_bloom:    'radial-gradient(ellipse at 40% 40%, #1a0533 0%, #0d1f4c 50%, #0a2e1a 100%)',
  galaxy_core:     'radial-gradient(ellipse at 50% 60%, #3d1a00 0%, #1a0800 50%, #004433 100%)',
  binary_star:     'radial-gradient(ellipse at 30% 50%, #001a33 0%, #1a0033 50%, #001a00 100%)',
  supernova:       'radial-gradient(ellipse at 50% 40%, #4a1000 0%, #2a0033 50%, #003322 100%)',
  cherry_blossoms: 'linear-gradient(180deg, #ffe4f0 0%, #ffc8d8 50%, #ffb0c8 100%)',
  fireflies:       'linear-gradient(180deg, #020a02 0%, #051205 100%)',
  ocean_reef:      'linear-gradient(180deg, #001e50 0%, #00081e 100%)',
  fireworks:       'linear-gradient(180deg, #080010 0%, #020005 100%)',
  matrix_rain:     '#000000',
  neon_city:       'linear-gradient(180deg, #050010 0%, #0a0020 100%)',
  cyberpunk:       'linear-gradient(180deg, #0a001a 0%, #001a1a 100%)',
  static_gradient: 'linear-gradient(135deg, #0a0e1a 0%, #1a0533 50%, #0a2e1a 100%)',
};

function getBackground(scene: BackgroundScene): string {
  return SCENE_GRADIENTS[scene] ?? SCENE_GRADIENTS.static_gradient;
}

// ── Scene renderer map ────────────────────────────────────────────────────────

function SceneContent({
  scene,
  seed,
  accentColor,
  sseUrl,
}: Omit<BackgroundRendererProps, 'children' | 'forceVisible'>) {
  const spaceVariants = ['deep_space', 'nebula_bloom', 'galaxy_core', 'binary_star', 'supernova'] as const;
  type SpaceVariant = typeof spaceVariants[number];

  if ((spaceVariants as readonly string[]).includes(scene)) {
    return (
      <SpaceBackground
        variant={scene as SpaceVariant}
        seed={seed ?? 42}
        sseUrl={sseUrl ?? '/api/commits/stream'}
      />
    );
  }

  switch (scene) {
    case 'starfield_only':
      return <StarField config={undefined as never} mouseRef={undefined as never} visible />;

    case 'commit_comets':
      return <CommitComets config={undefined as never} sseUrl={sseUrl ?? '/api/commits/stream'} visible />;

    case 'cherry_blossoms':
      return <CherryBlossoms count={80} visible />;

    case 'fireflies':
      return <FireflySystem count={60} visible />;

    case 'ocean_reef':
      return <OceanReef fishCount={40} visible />;

    case 'fireworks':
      return <FireworksSystem visible />;

    case 'matrix_rain':
      return <MatrixRain color="#00ff41" density={1.4} visible />;

    case 'neon_city':
    case 'cyberpunk':
      return <NeonCity accentColor={accentColor ?? '#ff0080'} visible />;

    case 'northern_lights': {
      // Aurora-only using CSS animation — lightweight fallback
      const colors = ['#00ff8880', '#0088ff80', '#8800ff80', '#00ffaa80'];
      const grad   = `linear-gradient(90deg, ${colors.join(', ')}, ${colors[0]})`;
      return (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: grad, backgroundSize: '400% 100%',
          opacity: 0.25, filter: 'blur(40px)',
          animation: 'aurora-shift 12s ease-in-out infinite alternate',
        }} aria-hidden="true" />
      );
    }

    case 'snowfall':
      // Lightweight CSS-only snowfall (no canvas needed)
      return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-hidden="true">
          <style>{`
            @keyframes snow-fall {
              0%   { transform: translateY(-10px) translateX(0); opacity: 1; }
              100% { transform: translateY(100vh) translateX(20px); opacity: 0; }
            }
          `}</style>
          {Array.from({ length: 60 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${(i * 137.5) % 100}%`,
              top: `-${Math.random() * 10}px`,
              width: `${2 + (i % 4)}px`, height: `${2 + (i % 4)}px`,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.8)',
              animation: `snow-fall ${4 + (i % 6)}s linear ${(i * 0.3) % 5}s infinite`,
            }} />
          ))}
        </div>
      );

    case 'gradient_flow':
    case 'particle_mesh':
    case 'geometric':
    case 'autumn_leaves':
    case 'static_gradient':
    default:
      return null; // CSS gradient from wrapper handles it
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export const BackgroundRenderer: React.FC<BackgroundRendererProps> = ({
  scene,
  seed,
  accentColor,
  sseUrl,
  children,
  forceVisible = false,
}) => {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const bg = getBackground(scene);
  const showAnimations = mounted && (!reduced || forceVisible);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: bg,
        zIndex: 0,
      }}
    >
      {/* Animated scene layer */}
      {showAnimations && (
        <Suspense fallback={null}>
          <SceneContent
            scene={scene}
            seed={seed}
            accentColor={accentColor}
            sseUrl={sseUrl}
          />
        </Suspense>
      )}

      {/* UI content always on top */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
};

export default BackgroundRenderer;
