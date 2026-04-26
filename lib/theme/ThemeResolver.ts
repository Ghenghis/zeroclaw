// lib/theme/ThemeResolver.ts
// Priority-based theme resolver: admin(10) > user(8) > holiday(6) > season(4) > weekend(3) > daily(2)

import type { SceneType, UserThemePreferences } from './ThemeConfig'

export interface ResolvedTheme {
  scene: SceneType
  variant: string
  source: 'admin_lock' | 'user_override' | 'holiday' | 'season' | 'weekend' | 'daily' | 'random'
  priority: number
}

export function resolveTheme(prefs?: UserThemePreferences): ResolvedTheme {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat

  // Priority 10 — admin lock via env var
  const adminLock = process.env.FORCE_BACKGROUND as SceneType | undefined
  if (adminLock) {
    return { scene: adminLock, variant: 'default', source: 'admin_lock', priority: 10 }
  }

  // Priority 8 — user override stored in preferences
  if (prefs?.overrideScene) {
    return {
      scene: prefs.overrideScene,
      variant: prefs.overrideVariant ?? 'default',
      source: 'user_override',
      priority: 8,
    }
  }

  // Priority 6 — holiday detection (dynamic import safe for server)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { detectActiveHolidays } = require('@/lib/backgrounds/holidayDetector')
    const holidays = detectActiveHolidays(now)
    if (holidays.length > 0) {
      const h = holidays[0]
      return {
        scene: h.backgroundKey as SceneType,
        variant: 'default',
        source: 'holiday',
        priority: 6,
      }
    }
  } catch { /* holiday detector not yet available */ }

  // Priority 4 — seasonal background
  const season = getSeasonScene(now)
  if (season) {
    return { scene: season, variant: 'default', source: 'season', priority: 4 }
  }

  // Priority 3 — weekend mode
  if (day === 6) return { scene: 'neon_grid',   variant: 'arcade',      source: 'weekend', priority: 3 }
  if (day === 0) return { scene: 'ocean_calm',  variant: 'relaxation',  source: 'weekend', priority: 3 }

  // Priority 2 — daily seeded (reproducible per date)
  return { scene: getDailyScene(now), variant: 'default', source: 'daily', priority: 2 }
}

function getSeasonScene(date: Date): SceneType | null {
  const month = date.getMonth() + 1
  if (month === 12 || month <= 2) return 'northern_lights'
  if (month >= 3 && month <= 5)  return 'spring_flowers'
  if (month >= 6 && month <= 8)  return 'ocean_calm'
  if (month >= 9 && month <= 11) return 'autumn_leaves'
  return null
}

const DAILY_POOL: SceneType[] = [
  'starfield_parallax', 'nebula_bloom', 'coral_reef', 'forest_dawn',
  'aurora_curtain', 'ocean_deep', 'mountain_mist', 'crystal_cave',
  'galaxy_core', 'bioluminescent', 'forest_rain', 'rainy_cafe',
  'binary_star', 'zen_garden', 'circuit_pulse', 'matrix_rain',
]

// Seeded by date — same scene all day, different every day
function getDailyScene(date: Date): SceneType {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  return DAILY_POOL[seed % DAILY_POOL.length]
}
