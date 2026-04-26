/**
 * spaceThemeAgent.ts
 * Maps agent StyleSeed → SpaceVariant and applies fine-tuned overrides.
 * Used by DailyBriefGenerator when selecting space-themed backgrounds.
 */

import { buildConfig } from '@/lib/backgrounds/space/space.config';
import type { SpaceVariant, SpaceConfig } from '@/lib/backgrounds/space/space.config';

const SEED_VARIANT_MAP: Array<[number, number, SpaceVariant]> = [
  [0,   199, 'deep_space'],
  [200, 399, 'nebula_bloom'],
  [400, 599, 'galaxy_core'],
  [600, 799, 'binary_star'],
  [800, 999, 'supernova'],
];

export function deriveSpaceTheme(styleSeed: number): SpaceConfig {
  const normalized = ((styleSeed % 1000) + 1000) % 1000;
  const entry = SEED_VARIANT_MAP.find(([lo, hi]) => normalized >= lo && normalized <= hi);
  const variant: SpaceVariant = entry?.[2] ?? 'deep_space';

  const config = buildConfig(variant, styleSeed);

  // Fine-tune aurora colors from seed-derived palette (golden angle)
  const hue = (styleSeed * 137.508) % 360;
  config.aurora.colors = [
    `hsl(${hue}, 80%, 60%)`,
    `hsl(${(hue + 60) % 360}, 90%, 55%)`,
    `hsl(${(hue + 140) % 360}, 70%, 65%)`,
    `hsl(${(hue + 220) % 360}, 85%, 50%)`,
  ];

  // Star count scales with seed entropy (0.6 – 1.4×)
  const starScale = 0.6 + (styleSeed % 100) / 100 * 0.8;
  config.stars.totalCount = Math.round(config.stars.totalCount * starScale);

  // Comet speed drift
  config.comets.speedMultiplier = 0.7 + (styleSeed % 50) / 50 * 1.0;

  // Nebula opacity variation
  config.nebula.opacity = 0.35 + (styleSeed % 70) / 70 * 0.45;

  return config;
}

export interface SupernovaEvent {
  trigger: 'time' | 'user_action' | 'milestone';
  durationMs: number;
}

/** Dramatically intensifies config for supernova milestone events */
export function applySupernova(config: SpaceConfig, _event: SupernovaEvent): SpaceConfig {
  return {
    ...config,
    variant: 'supernova',
    comets: {
      ...config.comets,
      maxSimultaneous: 20,
      speedMultiplier: 4.0,
      fadeOutDuration: 600,
    },
    aurora: {
      ...config.aurora,
      position: 'both',
      opacity: 0.65,
      height: 40,
      colors: ['#ffffff', '#ffeeaa', '#ff6600', '#ff0000'],
      animationDuration: 2,
    },
    nebula: {
      ...config.nebula,
      opacity: 0.95,
      driftSpeed: 0.0008,
    },
  };
}
