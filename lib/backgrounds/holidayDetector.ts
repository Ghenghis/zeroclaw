// lib/backgrounds/holidayDetector.ts
// Detects active holidays and returns appropriate background keys
// Supports 18 holidays including floating holidays (Easter, Mother's Day, etc.)

import type { ActiveHoliday, SceneType } from '@/lib/theme/ThemeConfig'

// ── Easter (Gregorian algorithm) ─────────────────────────────────────
export function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// ── Nth weekday helper (for floating holidays) ────────────────────────
// e.g. getNthWeekday(2026, 5, 2, 0) = 2nd Sunday of May 2026
export function getNthWeekday(year: number, month: number, n: number, weekday: number): Date {
  const date = new Date(year, month - 1, 1)
  let count = 0
  while (date.getMonth() === month - 1) {
    if (date.getDay() === weekday) {
      count++
      if (count === n) return new Date(date)
    }
    date.setDate(date.getDate() + 1)
  }
  return date
}

// ── Last weekday of month ─────────────────────────────────────────────
function getLastWeekday(year: number, month: number, weekday: number): Date {
  const date = new Date(year, month, 0) // last day of month
  while (date.getDay() !== weekday) date.setDate(date.getDate() - 1)
  return date
}

// ── Hanukkah lookup (Hebrew calendar varies) ─────────────────────────
const HANUKKAH_STARTS: Record<number, [number, number]> = {
  2024: [12, 26], 2025: [12, 15], 2026: [12,  5],
  2027: [12, 25], 2028: [12, 13], 2029: [12,  2], 2030: [12, 22],
}

// ── Diwali lookup ─────────────────────────────────────────────────────
const DIWALI_DATES: Record<number, [number, number]> = {
  2024: [11,  1], 2025: [10, 20], 2026: [11,  8],
  2027: [10, 29], 2028: [10, 17], 2029: [11,  5], 2030: [10, 26],
}

// ── Holiday definitions ───────────────────────────────────────────────
interface HolidayDef {
  key: string
  name: string
  backgroundKey: SceneType
  windowDays: number  // how many days the background is active (before + day)
  getDate: (year: number) => Date
}

function fixed(month: number, day: number) {
  return (year: number) => new Date(year, month - 1, day)
}

const HOLIDAYS: HolidayDef[] = [
  {
    key: 'new_year',
    name: "New Year's Day",
    backgroundKey: 'new_year',
    windowDays: 3,
    getDate: fixed(1, 1),
  },
  {
    key: 'valentine',
    name: "Valentine's Day",
    backgroundKey: 'valentine',
    windowDays: 3,
    getDate: fixed(2, 14),
  },
  {
    key: 'st_patricks',
    name: "St. Patrick's Day",
    backgroundKey: 'st_patricks',
    windowDays: 3,
    getDate: fixed(3, 17),
  },
  {
    key: 'easter',
    name: 'Easter',
    backgroundKey: 'easter',
    windowDays: 4,
    getDate: (year) => getEasterDate(year),
  },
  {
    key: 'mothers_day',
    name: "Mother's Day",
    backgroundKey: 'mothers_day',
    windowDays: 3,
    getDate: (year) => getNthWeekday(year, 5, 2, 0), // 2nd Sunday of May
  },
  {
    key: 'memorial_day',
    name: 'Memorial Day',
    backgroundKey: 'independence_4th',
    windowDays: 3,
    getDate: (year) => getLastWeekday(year, 5, 1), // last Monday of May
  },
  {
    key: 'fathers_day',
    name: "Father's Day",
    backgroundKey: 'fathers_day',
    windowDays: 3,
    getDate: (year) => getNthWeekday(year, 6, 3, 0), // 3rd Sunday of June
  },
  {
    key: 'independence_4th',
    name: 'Independence Day',
    backgroundKey: 'independence_4th',
    windowDays: 4,
    getDate: fixed(7, 4),
  },
  {
    key: 'labor_day',
    name: 'Labor Day',
    backgroundKey: 'independence_4th',
    windowDays: 3,
    getDate: (year) => getNthWeekday(year, 9, 1, 1), // 1st Monday of September
  },
  {
    key: 'back_to_school',
    name: 'Back to School',
    backgroundKey: 'back_to_school',
    windowDays: 7,
    getDate: fixed(9, 1), // Sept 1 window
  },
  {
    key: 'halloween',
    name: 'Halloween',
    backgroundKey: 'halloween',
    windowDays: 7,
    getDate: fixed(10, 31),
  },
  {
    key: 'diwali',
    name: 'Diwali',
    backgroundKey: 'diwali',
    windowDays: 5,
    getDate: (year) => {
      const d = DIWALI_DATES[year] ?? DIWALI_DATES[2025]
      return new Date(year, d[0] - 1, d[1])
    },
  },
  {
    key: 'thanksgiving',
    name: 'Thanksgiving',
    backgroundKey: 'thanksgiving',
    windowDays: 4,
    getDate: (year) => getNthWeekday(year, 11, 4, 4), // 4th Thursday of November
  },
  {
    key: 'hanukkah',
    name: 'Hanukkah',
    backgroundKey: 'hanukkah',
    windowDays: 8,
    getDate: (year) => {
      const d = HANUKKAH_STARTS[year] ?? HANUKKAH_STARTS[2025]
      return new Date(year, d[0] - 1, d[1])
    },
  },
  {
    key: 'christmas',
    name: 'Christmas',
    backgroundKey: 'christmas',
    windowDays: 7,
    getDate: fixed(12, 25),
  },
  {
    key: 'graduation',
    name: 'Graduation Season',
    backgroundKey: 'graduation',
    windowDays: 30,
    getDate: fixed(5, 15), // mid-May through mid-June
  },
  {
    key: 'new_year_eve',
    name: "New Year's Eve",
    backgroundKey: 'new_year',
    windowDays: 2,
    getDate: fixed(12, 31),
  },
  {
    key: 'martin_luther_king',
    name: 'Martin Luther King Jr. Day',
    backgroundKey: 'independence_4th',
    windowDays: 1,
    getDate: (year) => getNthWeekday(year, 1, 3, 1), // 3rd Monday of January
  },
]

// ── Main detector ─────────────────────────────────────────────────────
export function detectActiveHolidays(date: Date = new Date()): ActiveHoliday[] {
  const year = date.getFullYear()
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const active: ActiveHoliday[] = []

  for (const holiday of HOLIDAYS) {
    // Check this year and next year's occurrence (for year boundary holidays)
    for (const checkYear of [year - 1, year, year + 1]) {
      const holidayDate = holiday.getDate(checkYear)
      const holidayDay = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate())

      const diffMs = holidayDay.getTime() - today.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      // Active if within window (before or on the holiday date)
      if (diffDays <= 0 && diffDays > -holiday.windowDays) {
        active.push({
          key: holiday.key,
          name: holiday.name,
          backgroundKey: holiday.backgroundKey,
          daysUntil: diffDays,
          isToday: diffDays === 0,
          windowDays: holiday.windowDays,
        })
        break // don't double-count same holiday
      }
    }
  }

  // Sort: today's holidays first, then by recency
  return active.sort((a, b) => b.daysUntil - a.daysUntil)
}

// ── Upcoming holidays (for stats widget preview) ───────────────────────
export function getUpcomingHolidays(date: Date = new Date(), count = 3): ActiveHoliday[] {
  const year = date.getFullYear()
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const upcoming: ActiveHoliday[] = []

  for (const holiday of HOLIDAYS) {
    for (const checkYear of [year, year + 1]) {
      const holidayDate = holiday.getDate(checkYear)
      const holidayDay = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate())
      const diffMs = holidayDay.getTime() - today.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays > 0 && diffDays <= 60) {
        upcoming.push({
          key: holiday.key,
          name: holiday.name,
          backgroundKey: holiday.backgroundKey,
          daysUntil: diffDays,
          isToday: false,
          windowDays: holiday.windowDays,
        })
        break
      }
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, count)
}
