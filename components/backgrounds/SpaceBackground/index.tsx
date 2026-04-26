'use client';

import React, { useCallback } from 'react';
import { StarField }    from '@/lib/backgrounds/space/StarField';
import { Nebula }       from '@/lib/backgrounds/space/Nebula';
import { Planets }      from '@/lib/backgrounds/space/Planets';
import { CommitComets } from '@/lib/backgrounds/space/CommitComets';
import { Aurora }       from '@/lib/backgrounds/space/Aurora';
import { useMouseParallax }    from '@/lib/backgrounds/space/hooks/useMouseParallax';
import { useReducedMotion }    from '@/lib/backgrounds/space/hooks/useReducedMotion';
import { useDeviceCapability } from '@/lib/backgrounds/space/hooks/useDeviceCapability';
import { buildConfig }         from '@/lib/backgrounds/space/space.config';
import type { SpaceVariant }   from '@/lib/backgrounds/space/space.config';
import type { GitCommit }      from '@/lib/backgrounds/space/hooks/useCommitStream';

interface SpaceBackgroundProps {
  variant?: SpaceVariant;
  seed?: number;
  sseUrl?: string;
  onCommitClick?: (commit: GitCommit) => void;
  children?: React.ReactNode;
}

export const SpaceBackground: React.FC<SpaceBackgroundProps> = ({
  variant  = 'deep_space',
  seed     = 42,
  sseUrl   = '/api/commits/stream',
  onCommitClick,
  children,
}) => {
  const config  = buildConfig(variant, seed);
  const mouseRef = useMouseParallax({ smoothing: 0.05, enabled: true });
  const reduced  = useReducedMotion();
  const device   = useDeviceCapability();

  const handleCometClick = useCallback(
    (commit: GitCommit) => onCommitClick?.(commit),
    [onCommitClick]
  );

  // Graceful degradation for prefers-reduced-motion
  if (reduced) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, #0a0e1a 0%, #000308 100%)',
        zIndex: 0,
      }}>
        <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 30%, #090d1a 0%, #000205 100%)',
        zIndex: 0,
      }}
    >
      {/* Layer 0 — WebGL Nebula */}
      {device.hasWebGL && config.nebula.enabled && (
        <Nebula config={config} mouseRef={mouseRef} />
      )}

      {/* Layer 1 — Canvas 2D Star Field */}
      <StarField config={config} mouseRef={mouseRef} visible />

      {/* Layer 2 — React Three Fiber Planets */}
      {device.estimatedTier !== 'low' && (
        <Planets planets={config.planets} />
      )}

      {/* Layer 3 — Commit Comets (SSE-driven) */}
      {config.comets.enabled && (
        <CommitComets
          config={config}
          sseUrl={sseUrl}
          visible
          onCometClick={handleCometClick}
        />
      )}

      {/* Layer 4 — Aurora */}
      {config.aurora.enabled && (
        <Aurora config={config.aurora} />
      )}

      {/* UI content */}
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </div>
  );
};

export default SpaceBackground;
