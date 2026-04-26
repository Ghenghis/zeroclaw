// lib/theme/ThemeConfig.ts
// Core types for the DaveAI theme and background system

export type SceneType =
  | 'starfield_parallax' | 'nebula_bloom' | 'galaxy_core' | 'binary_star' | 'supernova'
  | 'deep_space' | 'aurora_curtain'
  | 'coral_reef' | 'ocean_calm' | 'ocean_deep' | 'bioluminescent'
  | 'forest_dawn' | 'forest_rain' | 'autumn_leaves' | 'spring_flowers' | 'mountain_mist'
  | 'zen_garden' | 'northern_lights' | 'rainy_cafe' | 'crystal_cave'
  | 'halloween' | 'christmas' | 'new_year' | 'valentine' | 'st_patricks'
  | 'easter' | 'independence_4th' | 'thanksgiving' | 'hanukkah' | 'diwali'
  | 'mothers_day' | 'fathers_day' | 'graduation' | 'back_to_school'
  | 'matrix_rain' | 'circuit_pulse' | 'neon_grid' | 'binary_stream'
  | 'agent_generated'

export type ThemePriority = 1 | 2 | 3 | 4 | 6 | 8 | 10

export interface CommitVisualConfig {
  particleType: 'comet' | 'bubble' | 'leaf' | 'bat' | 'snowflake' | 'sparkle' | 'firework' | 'firefly'
  color: string
  size: number
  duration: number
  trailEffect: 'gradient_fade' | 'particle_burst' | 'ripple' | 'none'
}

export const DEFAULT_COMMIT_VISUALS: Partial<Record<SceneType, CommitVisualConfig>> = {
  starfield_parallax: { particleType: 'comet',     color: '#ffd700', size: 8,  duration: 3000, trailEffect: 'gradient_fade' },
  nebula_bloom:       { particleType: 'comet',     color: '#00bfff', size: 10, duration: 4000, trailEffect: 'gradient_fade' },
  coral_reef:         { particleType: 'bubble',    color: '#88ddff', size: 6,  duration: 2500, trailEffect: 'ripple' },
  ocean_calm:         { particleType: 'bubble',    color: '#aaffee', size: 5,  duration: 3000, trailEffect: 'ripple' },
  forest_dawn:        { particleType: 'leaf',      color: '#88cc44', size: 12, duration: 4000, trailEffect: 'none' },
  autumn_leaves:      { particleType: 'leaf',      color: '#cc6600', size: 14, duration: 5000, trailEffect: 'none' },
  halloween:          { particleType: 'bat',       color: '#330055', size: 16, duration: 3000, trailEffect: 'none' },
  christmas:          { particleType: 'snowflake', color: '#cce8ff', size: 10, duration: 6000, trailEffect: 'none' },
  independence_4th:   { particleType: 'firework',  color: '#ff0000', size: 20, duration: 2000, trailEffect: 'particle_burst' },
  new_year:           { particleType: 'firework',  color: '#ffd700', size: 22, duration: 2000, trailEffect: 'particle_burst' },
  diwali:             { particleType: 'sparkle',   color: '#ffa500', size: 8,  duration: 2000, trailEffect: 'none' },
  matrix_rain:        { particleType: 'sparkle',   color: '#00ff41', size: 4,  duration: 1000, trailEffect: 'gradient_fade' },
}

export interface BackgroundConfig {
  sceneType: SceneType
  variant?: string
  opacity?: number
  interactionEnabled?: boolean
  particleCount?: number
  commitVisual?: CommitVisualConfig
  customParams?: Record<string, unknown>
}

export interface ThemeConfig {
  id: string
  name: string
  description: string
  background: BackgroundConfig
  priority: ThemePriority
  activeFrom?: Date
  activeTo?: Date
}

export interface UserThemePreferences {
  overrideScene?: SceneType
  overrideVariant?: string
  reducedMotion: boolean
  interactionEnabled: boolean
  opacity: number
  savedAt: number
}

export interface ActiveHoliday {
  key: string
  name: string
  backgroundKey: SceneType
  daysUntil: number
  isToday: boolean
  windowDays: number
}
