// lib/weekend/SundayRelaxation.ts
// Sunday = relaxation mode. Rotates through 5 calm scenes week by week.

import type { SceneType } from '@/lib/theme/ThemeConfig'

export const SUNDAY_SCENES: SceneType[] = [
  'ocean_calm',       // Jellyfish drifting, gentle waves
  'forest_dawn',      // Mist through trees, bird particles
  'zen_garden',       // Sand ripples, koi pond, lotus
  'northern_lights',  // Aurora borealis, slow curtain drift
  'rainy_cafe',       // Rain on window, warm interior glow
]

/**
 * Returns the calm scene for this Sunday.
 * Rotates weekly so each Sunday feels fresh.
 */
export function getSundayScene(): SceneType {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return SUNDAY_SCENES[weekNumber % SUNDAY_SCENES.length]
}

/**
 * Sunday relaxation config — lower opacity, no arcade portal
 */
export const SUNDAY_CONFIG = {
  showArcade: false,
  backgroundOpacity: 0.85,
  interactionEnabled: true,   // gentle mouse parallax still works
  particleCountMultiplier: 0.7, // fewer particles for calm feel
  ambientSoundEnabled: false,   // no audio unless user enables
}
