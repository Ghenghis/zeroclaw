# DaveAI Theme Engine — Complete Technical Reference
> **Version:** 1.0 · **Date:** 2026-02-19 · **Status:** Planning/Architecture
> **Companion to:** `daveai-master-plan.md`

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [SOTA Technology Stack](#2-sota-technology-stack)
3. [Theme Engine Architecture](#3-theme-engine-architecture)
4. [Holiday & Calendar Detection System](#4-holiday--calendar-detection-system)
5. [Space & Cosmic Backgrounds](#5-space--cosmic-backgrounds)
6. [Ocean & Coral Reef Backgrounds](#6-ocean--coral-reef-backgrounds)
7. [Nature, Forest & Weather Backgrounds](#7-nature-forest--weather-backgrounds)
8. [Holiday-Specific Backgrounds](#8-holiday-specific-backgrounds)
9. [Weekend Arcade System](#9-weekend-arcade-system)
10. [Live Stats Dashboard Widget](#10-live-stats-dashboard-widget)
11. [Daily Site Recreation System](#11-daily-site-recreation-system)
12. [Agentic Background Generation Pipeline](#12-agentic-background-generation-pipeline)
13. [Performance & Accessibility](#13-performance--accessibility)
14. [Quality Gates & Visual Checklist](#14-quality-gates--visual-checklist)

---

## 1. Overview & Philosophy

### 1.1 What This Document Covers

DaveAI generates a **completely different website every day at 02:00**, with interactive animated backgrounds, holiday-aware themes, weekend game modes, and a live stats widget. This document is the complete technical reference for all of that.

### 1.2 The "Real Agentic" Guarantee

This system is **genuinely agentic**, not hardcoded or faked:

| What happens | How it's agentic |
|---|---|
| Background selection | Agent reasons about date, holiday, history → writes config JSON from scratch |
| Daily site concept | LLM generates new brand/business/story — never templated |
| Weekend games | Code agent writes complete playable game HTML/JS from scratch |
| Background code | For novel scenes, agent writes actual Canvas/WebGL code |
| Image generation | Flux/SDXL generates new images per-site |
| QA & fixes | QA agent runs Lighthouse, fixes issues autonomously |

**The test:** Can you predict what tomorrow's site will look like? No. The agents reason about context.

### 1.3 Background Priority System

```
PRIORITY (highest wins):
  10 — Admin lock (manual override via dashboard)
   8 — User override (visitor changed background)
   6 — Holiday (within 3 days of holiday)
   4 — Season (spring/summer/autumn/winter)
   3 — Day of week (weekend = game mode)
   2 — Time of day (dawn/dusk/night shifts)
   1 — Random from allowed pool (fallback)
```

### 1.4 Background Mode Architecture

```typescript
// All backgrounds conform to this interface
interface BackgroundConfig {
  id: string;
  sceneType: SceneType;           // 'space' | 'ocean_reef' | 'forest' | ...
  variant: string;                // sub-variant within scene type
  interactivity: InteractConfig;  // mouse/touch behavior
  performance: PerformanceTier;   // 'low' | 'medium' | 'high'
  commitVisual: CommitVisualConfig; // how git commits appear in this scene
  agentGenerated: boolean;        // true = agent wrote the code
  generatedCode?: string;         // agent-written Canvas/WebGL code
}

type SceneType =
  // Space
  | 'space_deep' | 'space_nebula' | 'space_galaxy' | 'space_binary_star' | 'space_supernova'
  // Ocean
  | 'ocean_reef' | 'ocean_deep' | 'ocean_bioluminescent' | 'ocean_surface'
  // Nature
  | 'forest_day' | 'forest_night' | 'forest_autumn' | 'forest_cherry_blossom'
  // Weather
  | 'weather_storm' | 'weather_snow' | 'weather_rain' | 'weather_sunshine'
  // Abstract
  | 'abstract_fluid' | 'abstract_matrix' | 'abstract_mandala' | 'abstract_particles'
  // Special
  | 'cyberpunk_city' | 'lava_volcanic' | 'microscopic' | 'aurora_borealis' | 'desert'
  // Holiday
  | 'holiday_halloween' | 'holiday_christmas' | 'holiday_fourth_july'
  | 'holiday_easter' | 'holiday_diwali' | 'holiday_hanukkah' | 'holiday_valentines'
  | 'holiday_st_patricks' | 'holiday_thanksgiving' | 'holiday_new_years'
  // Weekend
  | 'weekend_arcade' | 'weekend_relaxation'
  // Agent-generated (free form)
  | 'agent_generated';
```

---

## 2. SOTA Technology Stack

### 2.1 Framework Decision: Next.js 15 (Definitive)

**Verdict: Next.js 15 App Router + Turbopack**

Why agents should use Next.js 15 over alternatives:

| Criterion | Next.js 15 | Astro 5 | SvelteKit |
|---|---|---|---|
| LLM training data | Massive | Moderate | Moderate |
| Agent pattern predictability | HIGH | VERY HIGH | HIGH |
| Interactive site ceiling | VERY HIGH | HIGH | HIGH |
| Canvas/WebGL integration | Native | Good | Good |
| Component ecosystem | Richest | Growing | Good |
| Image optimization | Built-in | Plugin | Manual |
| RSC for agent content | YES | NO | NO |
| Streaming SSR | YES | Partial | YES |

**Agent generation template for every site:**

```typescript
// Every generated site starts from this App Router structure
// app/layout.tsx — root layout agents always generate
import { Inter, Space_Grotesk } from 'next/font/google'
import { BackgroundProvider } from '@/components/backgrounds/BackgroundProvider'
import { DaveAIStatsWidget } from '@/components/stats/DaveAIStatsWidget'
import { CustomCursor } from '@/components/effects/CustomCursor'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { PageTransition } from '@/components/layout/PageTransition'
import { CookieConsent } from '@/components/ui/CookieConsent'
import { Lenis } from '@studio-freight/react-lenis'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'], variable: '--font-display', display: 'swap'
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <ThemeProvider>
          <Lenis root>
            <BackgroundProvider>
              <CustomCursor />
              <PageTransition>
                {children}
              </PageTransition>
              <DaveAIStatsWidget placement="floating" />
              <CookieConsent />
            </BackgroundProvider>
          </Lenis>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### 2.2 Complete Package.json Dependencies

```json
{
  "name": "daveai-generated-site",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "analyze": "ANALYZE=true next build",
    "test": "playwright test",
    "lighthouse": "lhci autorun"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",

    "tailwindcss": "^4.0.0",
    "@tailwindcss/typography": "^0.5.15",

    "gsap": "^3.12.5",
    "@gsap/react": "^2.1.1",
    "framer-motion": "^11.15.0",

    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.119.0",

    "@tsparticles/react": "^3.0.0",
    "@tsparticles/engine": "^3.7.1",
    "@tsparticles/slim": "^3.7.1",

    "@studio-freight/react-lenis": "^1.0.47",

    "zustand": "^5.0.2",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0",
    "@hookform/resolvers": "^3.9.0",

    "lucide-react": "^0.468.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",

    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-accordion": "^1.2.2",

    "next-themes": "^0.4.4",
    "canvas-confetti": "^1.9.3",
    "react-intersection-observer": "^9.13.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.170.0",
    "@types/canvas-confetti": "^1.9.0",
    "raw-loader": "^4.0.2",
    "@next/bundle-analyzer": "^15.1.0",
    "@playwright/test": "^1.49.0",
    "@lhci/cli": "^0.14.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.0"
  }
}
```

### 2.3 Next.js Config (Performance-Optimized)

```javascript
// next.config.js — required for every generated site
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'framer-motion', 'gsap', 'three', '@react-three/fiber',
      '@react-three/drei', 'lucide-react', '@radix-ui/react-dialog',
    ],
  },
  webpack(config) {
    // GLSL shader imports
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: 'raw-loader',
    })
    return config
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' wss: https:",
            ].join('; '),
          },
        ],
      },
      {
        source: '/(.*)\\.(jpg|jpeg|png|webp|avif|svg|ico|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
```

---

## 3. Theme Engine Architecture

### 3.1 TypeScript Type System

```typescript
// lib/theme-engine/types.ts

export interface ThemeConfig {
  id: string
  name: string
  description: string
  priority: number                // 0-10, higher wins
  tags: string[]
  triggers: ThemeTrigger[]
  background: BackgroundSpec
  palette: ThemePalette
  typography: ThemeTypography
  cursor: CursorConfig
  particles: ParticlePreset | null
  overlay: OverlayConfig | null
  preview: ThemePreview
}

export interface ThemeTrigger {
  type: 'holiday' | 'season' | 'weekday' | 'time_range' | 'always'
  // holiday
  holidayId?: string
  daysBefore?: number
  daysAfter?: number
  // season
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  // weekday
  weekdays?: number[]   // 0=Sun, 6=Sat
  // time_range
  startHour?: number
  endHour?: number
}

export interface ThemePalette {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textMuted: string
  border: string
}

export interface ThemeTypography {
  displayFont: string    // Google Font name
  bodyFont: string
  monoFont: string
  displayWeight: number
  scale: 'compact' | 'default' | 'expanded'
}

export interface CursorConfig {
  type: 'dot' | 'ring' | 'crosshair' | 'custom'
  color: string
  size: number
  trail: boolean
  trailLength?: number
}

export interface CommitVisualConfig {
  // How commits appear in THIS scene type
  shape: 'comet' | 'bubble' | 'leaf' | 'bat' | 'snowflake' | 'firefly' | 'firework'
  color: string
  trailType: 'vapor' | 'bubble_trail' | 'sparkle' | 'none'
  speed: number       // 0.5-4.0 relative
  labelVisible: boolean
  labelStyle: 'floating' | 'tooltip' | 'tag'
}
```

### 3.2 Theme Resolver

```typescript
// lib/theme-engine/ThemeResolver.ts

export interface TemporalContext {
  now: Date
  date: string          // YYYY-MM-DD
  weekday: number       // 0=Sun
  hour: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night'
  holidays: ActiveHoliday[]
  isWeekend: boolean
}

export interface ActiveHoliday {
  id: string
  name: string
  date: string
  daysUntil: number   // negative = days after
  priority: number
}

export function buildTemporalContext(): TemporalContext {
  const now = new Date()
  const month = now.getMonth() + 1
  const hour = now.getHours()

  const season = month >= 3 && month <= 5 ? 'spring'
    : month >= 6 && month <= 8 ? 'summer'
    : month >= 9 && month <= 11 ? 'autumn'
    : 'winter'

  const timeOfDay = hour >= 5 && hour < 8 ? 'dawn'
    : hour >= 8 && hour < 12 ? 'morning'
    : hour >= 12 && hour < 17 ? 'afternoon'
    : hour >= 17 && hour < 20 ? 'evening'
    : 'night'

  return {
    now,
    date: now.toISOString().slice(0, 10),
    weekday: now.getDay(),
    hour,
    season,
    timeOfDay,
    holidays: detectActiveHolidays(now),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
  }
}

export function resolveTheme(
  ctx: TemporalContext,
  userOverride: string | null,
  adminLock: string | null,
  themes: ThemeConfig[]
): ThemeConfig {
  // Admin lock: absolute override
  if (adminLock) {
    const locked = themes.find(t => t.id === adminLock)
    if (locked) return locked

  }

  // User override
  if (userOverride) {
    const userTheme = themes.find(t => t.id === userOverride)
    if (userTheme) return userTheme
  }

  // Score all themes by temporal match
  const scored = themes.map(theme => ({
    theme,
    score: scoreTheme(theme, ctx),
  })).filter(t => t.score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.theme ?? themes.find(t => t.id === 'default')!
}

function scoreTheme(theme: ThemeConfig, ctx: TemporalContext): number {
  let score = 0

  for (const trigger of theme.triggers) {
    if (trigger.type === 'holiday') {
      const holiday = ctx.holidays.find(h => h.id === trigger.holidayId)
      if (holiday) {
        const within = Math.abs(holiday.daysUntil) <= (trigger.daysBefore ?? 3)
        if (within) score += theme.priority * 10
      }
    }

    if (trigger.type === 'season' && trigger.season === ctx.season) {
      score += theme.priority * 3
    }

    if (trigger.type === 'weekday' && trigger.weekdays?.includes(ctx.weekday)) {
      score += theme.priority * 5
    }

    if (trigger.type === 'time_range') {
      const start = trigger.startHour ?? 0
      const end = trigger.endHour ?? 24
      if (ctx.hour >= start && ctx.hour < end) {
        score += theme.priority * 2
      }
    }

    if (trigger.type === 'always') {
      score += 1  // fallback weight
    }
  }

  return score
}
```

### 3.3 User Preferences System

```typescript
// lib/theme-engine/userPreferences.ts

const STORAGE_KEY = 'daveai_bg_pref'

export interface UserPreference {
  backgroundId: string | null   // null = follow calendar
  lockedUntil: string | null    // ISO date string
  history: string[]             // last 5 user-chosen IDs
  updatedAt: string
}

export function getUserPreference(): UserPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPreference()
    const pref: UserPreference = JSON.parse(raw)

    // Check if lock has expired
    if (pref.lockedUntil && new Date(pref.lockedUntil) < new Date()) {
      return { ...pref, backgroundId: null, lockedUntil: null }
    }
    return pref
  } catch {
    return defaultPreference()
  }
}

export function setUserPreference(
  backgroundId: string | null,
  lockDuration: 'session' | '24h' | '7d' | 'forever' = 'session'
) {
  const now = new Date()
  let lockedUntil: string | null = null

  if (backgroundId !== null) {
    if (lockDuration === '24h') {
      const d = new Date(now); d.setHours(d.getHours() + 24)
      lockedUntil = d.toISOString()
    } else if (lockDuration === '7d') {
      const d = new Date(now); d.setDate(d.getDate() + 7)
      lockedUntil = d.toISOString()
    } else if (lockDuration === 'forever') {
      const d = new Date(now); d.setFullYear(d.getFullYear() + 10)
      lockedUntil = d.toISOString()
    }
    // session = null lockedUntil (cleared on tab close via sessionStorage)
  }

  const prev = getUserPreference()
  const history = backgroundId
    ? [backgroundId, ...prev.history.filter(h => h !== backgroundId)].slice(0, 5)
    : prev.history

  const pref: UserPreference = {
    backgroundId,
    lockedUntil,
    history,
    updatedAt: now.toISOString(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))

  // Sync to server for cross-device persistence
  fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pref),
  }).catch(() => { /* offline — localStorage is source of truth */ })
}

function defaultPreference(): UserPreference {
  return { backgroundId: null, lockedUntil: null, history: [], updatedAt: '' }
}
```

### 3.4 Background Provider (React Root)

```typescript
// components/backgrounds/BackgroundProvider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { buildTemporalContext, resolveTheme } from '@/lib/theme-engine/ThemeResolver'
import { getUserPreference } from '@/lib/theme-engine/userPreferences'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ThemeConfig } from '@/lib/theme-engine/types'
import { THEME_REGISTRY } from '@/lib/theme-engine/registry'

interface BackgroundContextValue {
  theme: ThemeConfig | null
  setUserBackground: (id: string | null) => void
  isTransitioning: boolean
}

const BackgroundContext = createContext<BackgroundContextValue>({
  theme: null,
  setUserBackground: () => {},
  isTransitioning: false,
})

export function useBackground() {
  return useContext(BackgroundContext)
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const reducedMotion = useReducedMotion()

  const selectTheme = useCallback(() => {
    const ctx = buildTemporalContext()
    const pref = getUserPreference()
    const adminLock = null // fetch from /api/admin/theme-lock if needed
    return resolveTheme(ctx, pref.backgroundId, adminLock, THEME_REGISTRY)
  }, [])

  useEffect(() => {
    // Initial selection
    setTheme(selectTheme())

    // Re-check at midnight for day changes
    const now = new Date()
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 5, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setTheme(selectTheme())
        setIsTransitioning(false)
      }, 800) // crossfade duration
    }, msUntilMidnight)

    return () => clearTimeout(timer)
  }, [selectTheme])

  const setUserBackground = useCallback((id: string | null) => {
    setIsTransitioning(true)
    setTimeout(() => {
      if (id === null) {
        setTheme(selectTheme())
      } else {
        const found = THEME_REGISTRY.find(t => t.id === id)
        if (found) setTheme(found)
      }
      setIsTransitioning(false)
    }, 400)
  }, [selectTheme])

  return (
    <BackgroundContext.Provider value={{ theme, setUserBackground, isTransitioning }}>
      {/* Crossfade container */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          transition: isTransitioning ? 'opacity 0.8s ease-in-out' : undefined,
          opacity: isTransitioning ? 0 : 1,
        }}
        aria-hidden="true"
      >
        {theme && !reducedMotion && <ActiveBackground theme={theme} />}
        {reducedMotion && <StaticFallback theme={theme} />}
      </div>

      {/* Site content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </BackgroundContext.Provider>
  )
}
```

### 3.5 Background Controls Panel

```typescript
// components/backgrounds/BackgroundControls.tsx
'use client'

import React, { useState } from 'react'
import { useBackground } from './BackgroundProvider'
import { THEME_REGISTRY } from '@/lib/theme-engine/registry'
import { setUserPreference } from '@/lib/theme-engine/userPreferences'

const CATEGORIES = ['all', 'holiday', 'nature', 'space', 'ocean', 'abstract', 'special', 'weekend']

export function BackgroundControls() {
  const { theme: current, setUserBackground } = useBackground()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = THEME_REGISTRY.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'all' || t.tags.includes(category)
    return matchSearch && matchCategory
  })

  const handleSelect = (id: string) => {
    setUserBackground(id)
    setUserPreference(id, 'session')
    setOpen(false)
  }

  const handleReset = () => {
    setUserBackground(null)
    setUserPreference(null)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change background"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          transition: 'all 0.2s',
        }}
      >
        🎨
      </button>

      {/* Slide-up panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 130,
          right: 16,
          width: 360,
          maxHeight: '70vh',
          background: 'rgba(10,10,20,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>🎨 Background</span>
              <button onClick={handleReset} style={{ color: '#888', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                Reset to calendar
              </button>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search backgrounds..."
              style={{
                marginTop: 10,
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Category filters */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: category === cat ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: category === cat ? '#fff' : '#888',
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid of backgrounds */}
          <div style={{
            overflowY: 'auto',
            padding: '8px 16px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                style={{
                  background: current?.id === t.id
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(255,255,255,0.05)',
                  border: current?.id === t.id
                    ? '1px solid rgba(99,102,241,0.6)'
                    : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{t.preview.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{t.description.slice(0, 40)}…</div>
                {/* Performance tier indicator */}
                <div style={{
                  display: 'inline-block',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: t.preview.intensity === 'high' ? '#ef4444'
                    : t.preview.intensity === 'medium' ? '#f59e0b' : '#22c55e',
                  marginTop: 4,
                }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```

---

## 4. Holiday & Calendar Detection System

### 4.1 Complete Holiday Detector

```typescript
// lib/theme-engine/holidayDetector.ts

export interface HolidayDefinition {
  id: string
  name: string
  priority: number
  backgroundThemeId: string
  windowDays: number   // how many days before/after to apply theme
  getDate(year: number): Date | Date[]   // some holidays span multiple dates
}

// ── Utility functions ──────────────────────────────────────────────────────

function getNthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  // month: 1-12, weekday: 0=Sun...6=Sat, nth: 1-5 (-1 = last)
  if (nth === -1) {
    // Last weekday of month
    const lastDay = new Date(year, month, 0) // day 0 = last day of prev month
    const lastDayOfWeek = lastDay.getDay()
    const diff = (lastDayOfWeek - weekday + 7) % 7
    lastDay.setDate(lastDay.getDate() - diff)
    return lastDay
  }
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekday = firstDay.getDay()
  let day = 1 + ((weekday - firstWeekday + 7) % 7)
  day += (nth - 1) * 7
  return new Date(year, month - 1, day)
}

function getEasterDate(year: number): Date {
  // Gregorian algorithm (Anonymous Gregorian algorithm)
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

// Hanukkah: Hebrew calendar — pre-computed start dates (Gregorian)
const HANUKKAH_DATES: Record<number, { month: number; day: number }> = {
  2024: { month: 12, day: 25 },
  2025: { month: 12, day: 14 },
  2026: { month: 12, day: 4 },
  2027: { month: 12, day: 24 },
  2028: { month: 12, day: 12 },
  2029: { month: 12, day: 1 },
  2030: { month: 12, day: 20 },
}

// Diwali: Hindu calendar — pre-computed (Festival of Lights main day)
const DIWALI_DATES: Record<number, { month: number; day: number }> = {
  2024: { month: 11, day: 1 },
  2025: { month: 10, day: 20 },
  2026: { month: 11, day: 8 },
  2027: { month: 10, day: 29 },
  2028: { month: 10, day: 17 },
  2029: { month: 11, day: 5 },
  2030: { month: 10, day: 26 },
}

// ── Holiday Definitions ────────────────────────────────────────────────────

export const HOLIDAYS: HolidayDefinition[] = [
  // ── US Federal / Major ──────────────────────────────
  {
    id: 'new_years',
    name: "New Year's Day",
    priority: 9,
    backgroundThemeId: 'holiday_new_years',
    windowDays: 3,
    getDate: (y) => new Date(y, 0, 1),
  },
  {
    id: 'new_years_eve',
    name: "New Year's Eve",
    priority: 8,
    backgroundThemeId: 'holiday_new_years',
    windowDays: 2,
    getDate: (y) => new Date(y, 11, 31),
  },
  {
    id: 'valentines',
    name: "Valentine's Day",
    priority: 7,
    backgroundThemeId: 'holiday_valentines',
    windowDays: 3,
    getDate: (y) => new Date(y, 1, 14),
  },
  {
    id: 'st_patricks',
    name: "St. Patrick's Day",
    priority: 7,
    backgroundThemeId: 'holiday_st_patricks',
    windowDays: 2,
    getDate: (y) => new Date(y, 2, 17),
  },
  {
    id: 'easter',
    name: 'Easter Sunday',
    priority: 8,
    backgroundThemeId: 'holiday_easter',
    windowDays: 4,
    getDate: (y) => getEasterDate(y),
  },
  {
    id: 'mothers_day',
    name: "Mother's Day",
    priority: 7,
    backgroundThemeId: 'holiday_mothers_day',
    windowDays: 2,
    getDate: (y) => getNthWeekday(y, 5, 0, 2),  // 2nd Sunday in May
  },
  {
    id: 'memorial_day',
    name: 'Memorial Day',
    priority: 6,
    backgroundThemeId: 'holiday_memorial_day',
    windowDays: 2,
    getDate: (y) => getNthWeekday(y, 5, 1, -1), // Last Monday in May
  },
  {
    id: 'fathers_day',
    name: "Father's Day",
    priority: 7,
    backgroundThemeId: 'holiday_fathers_day',
    windowDays: 2,
    getDate: (y) => getNthWeekday(y, 6, 0, 3),  // 3rd Sunday in June
  },
  {
    id: 'independence_day',
    name: '4th of July',
    priority: 9,
    backgroundThemeId: 'holiday_fourth_july',
    windowDays: 3,
    getDate: (y) => new Date(y, 6, 4),
  },
  {
    id: 'labor_day',
    name: 'Labor Day',
    priority: 6,
    backgroundThemeId: 'holiday_labor_day',
    windowDays: 2,
    getDate: (y) => getNthWeekday(y, 9, 1, 1),  // 1st Monday in September
  },
  {
    id: 'halloween',
    name: 'Halloween',
    priority: 10,
    backgroundThemeId: 'holiday_halloween',
    windowDays: 7,
    getDate: (y) => new Date(y, 9, 31),
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    priority: 8,
    backgroundThemeId: 'holiday_thanksgiving',
    windowDays: 3,
    getDate: (y) => getNthWeekday(y, 11, 4, 4), // 4th Thursday in November
  },
  {
    id: 'christmas_eve',
    name: 'Christmas Eve',
    priority: 9,
    backgroundThemeId: 'holiday_christmas',
    windowDays: 3,
    getDate: (y) => new Date(y, 11, 24),
  },
  {
    id: 'christmas',
    name: 'Christmas Day',
    priority: 10,
    backgroundThemeId: 'holiday_christmas',
    windowDays: 7,
    getDate: (y) => new Date(y, 11, 25),
  },
  // ── Religious & Cultural ────────────────────────────
  {
    id: 'hanukkah',
    name: 'Hanukkah',
    priority: 8,
    backgroundThemeId: 'holiday_hanukkah',
    windowDays: 8,
    getDate: (y) => {
      const d = HANUKKAH_DATES[y]
      return d ? new Date(y, d.month - 1, d.day) : new Date(y, 11, 10)
    },
  },
  {
    id: 'diwali',
    name: 'Diwali',
    priority: 8,
    backgroundThemeId: 'holiday_diwali',
    windowDays: 5,
    getDate: (y) => {
      const d = DIWALI_DATES[y]
      return d ? new Date(y, d.month - 1, d.day) : new Date(y, 9, 24)
    },
  },
  // ── School Calendar ─────────────────────────────────
  {
    id: 'back_to_school',
    name: 'Back to School',
    priority: 5,
    backgroundThemeId: 'holiday_back_to_school',
    windowDays: 14,
    getDate: (y) => new Date(y, 7, 28),  // ~Aug 28
  },
  {
    id: 'graduation',
    name: 'Graduation Season',
    priority: 5,
    backgroundThemeId: 'holiday_graduation',
    windowDays: 14,
    getDate: (y) => new Date(y, 4, 15),  // ~May 15
  },
]

// ── Main Detection Function ────────────────────────────────────────────────

export interface ActiveHoliday {
  id: string
  name: string
  backgroundThemeId: string
  priority: number
  daysUntil: number  // 0 = today, negative = past, positive = future
}

export function detectActiveHolidays(date: Date = new Date()): ActiveHoliday[] {
  const year = date.getFullYear()
  const active: ActiveHoliday[] = []

  for (const holiday of HOLIDAYS) {
    // Check current year AND next year (for near-Jan holidays)
    for (const checkYear of [year - 1, year, year + 1]) {
      const holidayDate = holiday.getDate(checkYear)
      const diffMs = holidayDate.getTime() - date.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (Math.abs(diffDays) <= holiday.windowDays) {
        active.push({
          id: holiday.id,
          name: holiday.name,
          backgroundThemeId: holiday.backgroundThemeId,
          priority: holiday.priority,
          daysUntil: diffDays,
        })
      }
    }
  }

  // Sort by priority desc, then by proximity to today
  active.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return Math.abs(a.daysUntil) - Math.abs(b.daysUntil)
  })

  return active
}
```

---

## 5. Space & Cosmic Backgrounds

### 5.1 Architecture Overview

```
SpaceBackground (index.tsx)
├── Nebula.tsx          — WebGL FBM noise shader
├── StarField.tsx       — Canvas 2D, 3 parallax layers, 800+ stars
├── CommitComets.tsx    — SSE-driven, Canvas 2D, real git commits
├── Planets.tsx         — React Three Fiber, textured spheres + moons
└── Aurora.tsx          — CSS gradient bands + GSAP animation
```

**Commit visual in space:** Comets with vapor/ice trails. Each commit type = different comet color.

```typescript
const COMMIT_TYPE_COLORS = {
  daily:    { head: '#FFD700', trail: '#FFF8DC', glow: '#FFD700' }, // gold
  coder:    { head: '#00BFFF', trail: '#87CEFA', glow: '#1E90FF' }, // electric blue
  asset:    { head: '#FF6347', trail: '#FF8C69', glow: '#FF4500' }, // fiery
  qa:       { head: '#00FF7F', trail: '#98FB98', glow: '#00FF7F' }, // neon green
  user:     { head: '#C0C0C0', trail: '#E8E8E8', glow: '#FFFFFF' }, // silver
}
```

### 5.2 StarField.tsx — Canvas 2D, 3-Layer Parallax

```typescript
// src/components/SpaceBackground/StarField.tsx
'use client'
import React, { useRef, useEffect, useMemo } from 'react'

interface Star {
  x: number; y: number
  baseX: number; baseY: number
  radius: number; alpha: number
  layer: 0 | 1 | 2           // 0=distant, 1=mid, 2=close
  twinkleOffset: number       // unique phase per star
  twinkleSpeed: number
  color: string               // slight RGB variation
  isCluster: boolean
}

interface ShootingStar {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; alpha: number
}

// Seeded PRNG for reproducible layouts
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const StarField: React.FC<{
  seed?: number
  totalCount?: number
  mouseRef: React.RefObject<{ x: number; y: number }>
}> = ({ seed = 42, totalCount = 800, mouseRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  const stars = useMemo<Star[]>(() => {
    const rand = mulberry32(seed)
    const starColors = ['#FFFFFF', '#FFF8F0', '#F0F4FF', '#FFFFF0', '#FFF0F8']
    const count = totalCount

    return Array.from({ length: count }, (_, i) => {
      const layer = i < count * 0.5 ? 0 : i < count * 0.8 ? 1 : 2
      const x = rand() * window.innerWidth
      const y = rand() * window.innerHeight
      const isCluster = rand() < 0.02  // 2% are in nebula clusters

      return {
        x, y, baseX: x, baseY: y,
        radius: layer === 0 ? 0.5 + rand() * 0.5
               : layer === 1 ? 0.8 + rand() * 0.8
               : 1.2 + rand() * 1.5,
        alpha: 0.3 + rand() * 0.7,
        layer: layer as 0 | 1 | 2,
        twinkleOffset: rand() * Math.PI * 2,
        twinkleSpeed: 0.3 + rand() * 2.0,
        color: starColors[Math.floor(rand() * starColors.length)],
        isCluster,
      }
    })
  }, [seed, totalCount])

  useEffect(() => {
    starsRef.current = stars
  }, [stars])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const PARALLAX = [0.02, 0.05, 0.12]  // layer parallax strength
    const TARGET_FPS = 60
    const FRAME_BUDGET = 1000 / TARGET_FPS

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn shooting stars periodically
    const shootingStarInterval = setInterval(() => {
      if (Math.random() < 0.4) {
        const side = Math.random() < 0.5 ? 0 : window.innerWidth
        const y = Math.random() * window.innerHeight * 0.5
        const speed = 8 + Math.random() * 12
        const angle = Math.PI / 6 + Math.random() * Math.PI / 8
        shootingStarsRef.current.push({
          x: side, y,
          vx: side === 0 ? speed * Math.cos(angle) : -speed * Math.cos(angle),
          vy: speed * Math.sin(angle),
          life: 0, maxLife: 60 + Math.random() * 40,
          alpha: 1,
        })
      }
    }, 3000)

    // Pause on tab visibility change
    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current)
      else rafRef.current = requestAnimationFrame(animate)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const animate = (timestamp: number) => {
      rafRef.current = requestAnimationFrame(animate)
      if (timestamp - lastFrameRef.current < FRAME_BUDGET * 0.9) return
      lastFrameRef.current = timestamp

      const t = timestamp * 0.001
      const mx = mouseRef.current?.x ?? 0
      const my = mouseRef.current?.y ?? 0
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const mdx = (mx - cx) / cx  // -1 to 1
      const mdy = (my - cy) / cy

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      // Draw stars
      for (const star of starsRef.current) {
        const px = PARALLAX[star.layer]
        const sx = star.baseX - mdx * px * 40
        const sy = star.baseY - mdy * px * 40

        // Keep in bounds (wrap)
        star.x = ((sx % window.innerWidth) + window.innerWidth) % window.innerWidth
        star.y = ((sy % window.innerHeight) + window.innerHeight) % window.innerHeight

        const twinkle = 0.6 + 0.4 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset)
        const alpha = star.alpha * twinkle

        if (star.isCluster) {
          // Nebula-tinted cluster star
          const grad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 3)
          grad.addColorStop(0, `rgba(180, 160, 255, ${alpha})`)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = star.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba')
          || `rgba(255,255,255,${alpha})`
        ctx.fill()

        // Glow for larger stars
        if (star.radius > 1.5) {
          ctx.shadowBlur = 6
          ctx.shadowColor = star.color
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // Draw shooting stars
      shootingStarsRef.current = shootingStarsRef.current.filter(ss => {
        ss.life++
        ss.x += ss.vx; ss.y += ss.vy
        ss.alpha = 1 - ss.life / ss.maxLife

        const trailLen = 60 + Math.abs(ss.vx) * 3
        const grad = ctx.createLinearGradient(
          ss.x - ss.vx * 8, ss.y - ss.vy * 8,
          ss.x, ss.y
        )
        grad.addColorStop(0, `rgba(255,255,255,0)`)
        grad.addColorStop(1, `rgba(255,255,255,${ss.alpha})`)

        ctx.beginPath()
        ctx.moveTo(ss.x - ss.vx * 8, ss.y - ss.vy * 8)
        ctx.lineTo(ss.x, ss.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Tip glow
        ctx.beginPath()
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${ss.alpha})`
        ctx.fill()

        return ss.life < ss.maxLife &&
               ss.x > -100 && ss.x < window.innerWidth + 100 &&
               ss.y > -100 && ss.y < window.innerHeight + 100
      })
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(shootingStarInterval)
      cancelAnimationFrame(rafRef.current)
    }
  }, [mouseRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
```

### 5.3 CommitComets.tsx — SSE-Driven Real Git Commits

```typescript
// src/components/SpaceBackground/CommitComets.tsx
'use client'
import React, { useRef, useEffect, useCallback } from 'react'

interface GitCommit {
  id: string; hash: string; message: string
  type: 'daily' | 'coder' | 'asset' | 'qa' | 'user'
  author: string; timestamp: number; branch: string
}

interface Comet {
  id: string; commit: GitCommit
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number
  color: string; trailColor: string; glow: string
  trail: Array<{ x: number; y: number; alpha: number }>
  hovered: boolean
}

const COMET_COLORS: Record<GitCommit['type'], { head: string; trail: string; glow: string }> = {
  daily:  { head: '#FFD700', trail: '#FFF8DC', glow: '#FFD700' },
  coder:  { head: '#00BFFF', trail: '#87CEFA', glow: '#1E90FF' },
  asset:  { head: '#FF6347', trail: '#FF8C69', glow: '#FF4500' },
  qa:     { head: '#00FF7F', trail: '#98FB98', glow: '#00FF7F' },
  user:   { head: '#C0C0C0', trail: '#E8E8E8', glow: '#FFFFFF' },
}

export const CommitComets: React.FC<{
  sseUrl: string
  onCometClick?: (commit: GitCommit) => void
  maxSimultaneous?: number
}> = ({ sseUrl, onCometClick, maxSimultaneous = 5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cometsRef = useRef<Comet[]>([])
  const spawnQueueRef = useRef<GitCommit[]>([])
  const rafRef = useRef<number>(0)
  const mouseRef = useRef({ x: -999, y: -999 })

  // SSE connection with reconnect
  useEffect(() => {
    let es: EventSource
    let retryDelay = 1000

    const connect = () => {
      es = new EventSource(sseUrl)

      es.addEventListener('commit', (e) => {
        try {
          const commit: GitCommit = JSON.parse(e.data)
          spawnQueueRef.current.push(commit)
          retryDelay = 1000
        } catch { /* ignore malformed events */ }
      })

      es.onerror = () => {
        es.close()
        setTimeout(connect, Math.min(retryDelay, 30000))
        retryDelay *= 2
      }
    }

    connect()
    return () => es?.close()
  }, [sseUrl])

  // Canvas setup + animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // Mouse tracking for hover detection
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Click detection
    const handleClick = (e: MouseEvent) => {
      const hit = cometsRef.current.find(c => {
        const dx = e.clientX - c.x
        const dy = e.clientY - c.y
        return Math.sqrt(dx * dx + dy * dy) < 20
      })
      if (hit) onCometClick?.(hit.commit)
    }
    canvas.addEventListener('click', handleClick)
    canvas.style.cursor = 'default'

    const spawnComet = (commit: GitCommit): Comet => {
      const colors = COMET_COLORS[commit.type]
      // Spawn from random edge
      const side = Math.floor(Math.random() * 4)
      let x: number, y: number, vx: number, vy: number

      const speed = 2.5 + Math.random() * 2.5
      const angle = Math.random() * (Math.PI / 3) - Math.PI / 6

      if (side === 0) { // top
        x = Math.random() * window.innerWidth; y = -20
        vx = Math.sin(angle) * speed; vy = Math.cos(angle) * speed
      } else if (side === 1) { // right
        x = window.innerWidth + 20; y = Math.random() * window.innerHeight
        vx = -speed; vy = Math.sin(angle) * speed
      } else if (side === 2) { // bottom
        x = Math.random() * window.innerWidth; y = window.innerHeight + 20
        vx = Math.sin(angle) * speed; vy = -speed
      } else { // left
        x = -20; y = Math.random() * window.innerHeight
        vx = speed; vy = Math.sin(angle) * speed
      }

      return {
        id: commit.id, commit,
        x, y, vx, vy,
        life: 0, maxLife: 200 + Math.random() * 100,
        color: colors.head, trailColor: colors.trail, glow: colors.glow,
        trail: [], hovered: false,
      }
    }

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      // Spawn from queue if under limit
      while (
        spawnQueueRef.current.length > 0 &&
        cometsRef.current.length < maxSimultaneous
      ) {
        const commit = spawnQueueRef.current.shift()!
        cometsRef.current.push(spawnComet(commit))
      }

      // Update + draw comets
      cometsRef.current = cometsRef.current.filter(c => {
        c.life++
        c.x += c.vx; c.y += c.vy

        // Add arc jitter for coder commits
        if (c.commit.type === 'coder') {
          c.vx += Math.sin(c.life * 0.1) * 0.05
        }

        // Track trail
        c.trail.push({ x: c.x, y: c.y, alpha: 1 })
        if (c.trail.length > 40) c.trail.shift()
        c.trail.forEach((p, i) => { p.alpha = i / c.trail.length })

        // Hover detection
        const dx = mouseRef.current.x - c.x
        const dy = mouseRef.current.y - c.y
        c.hovered = Math.sqrt(dx * dx + dy * dy) < 30
        if (c.hovered) canvas.style.cursor = 'pointer'

        // Draw trail
        for (let i = 1; i < c.trail.length; i++) {
          const p0 = c.trail[i - 1]
          const p1 = c.trail[i]
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.lineTo(p1.x, p1.y)
          ctx.strokeStyle = c.trailColor.replace('rgb', 'rgba').replace(')', `, ${p1.alpha * 0.6})`)
            || `rgba(200,220,255,${p1.alpha * 0.6})`
          ctx.lineWidth = 1 + p1.alpha * 1.5
          ctx.stroke()
        }

        // Draw comet head
        ctx.shadowBlur = c.hovered ? 20 : 10
        ctx.shadowColor = c.glow
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.hovered ? 6 : 4, 0, Math.PI * 2)
        ctx.fillStyle = c.color
        ctx.fill()
        ctx.shadowBlur = 0

        // Draw label on hover
        if (c.hovered) {
          const label = `${c.commit.hash} — ${c.commit.message.slice(0, 35)}`
          ctx.font = '11px monospace'
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          ctx.fillRect(c.x + 12, c.y - 18, Math.min(label.length * 6.5, 280), 22)
          ctx.fillStyle = '#000'
          ctx.fillText(label, c.x + 16, c.y - 2)
        }

        const offscreen = c.x < -100 || c.x > window.innerWidth + 100
          || c.y < -100 || c.y > window.innerHeight + 100
        return c.life < c.maxLife && !offscreen
      })

      // Reset cursor if no hover
      if (!cometsRef.current.some(c => c.hovered)) {
        canvas.style.cursor = 'default'
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      cancelAnimationFrame(rafRef.current)
    }
  }, [sseUrl, onCometClick, maxSimultaneous])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'all' }}
      aria-label="Live git commit comets — click to view commit details"
    />
  )
}
```

### 5.4 SSE Route Handler (Next.js App Router)

```typescript
// app/api/commits/stream/route.ts
import { NextRequest } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function classifyCommit(message: string): string {
  if (/^daily:/i.test(message))                  return 'daily'
  if (/^feat:|^fix:|^refactor:|^chore:/i.test(message)) return 'coder'
  if (/^asset:|^style:|^design:/i.test(message)) return 'asset'
  if (/^test:|^qa:|^lint:/i.test(message))       return 'qa'
  return 'user'
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          ))
        } catch { /* client disconnected */ }
      }

      // Heartbeat every 15s
      const heartbeat = setInterval(() => send('heartbeat', { t: Date.now() }), 15000)

      // Initial burst: last 5 commits
      execFileAsync('git', ['log', '--format=%H|%an|%s|%ct', '-5'], { cwd: process.cwd() })
        .then(({ stdout }) => {
          stdout.trim().split('\n').filter(Boolean).forEach((line, i) => {
            const [hash, author, message, ts] = line.split('|')
            if (!hash) return
            setTimeout(() => send('commit', {
              id: `init-${hash}`,
              hash: hash.slice(0, 7),
              message: message ?? '',
              type: classifyCommit(message ?? ''),
              author: author ?? 'agent',
              timestamp: parseInt(ts ?? '0', 10) * 1000,
              branch: 'main',
            }), i * 1200)
          })
        })
        .catch(() => { /* git unavailable */ })

      // Poll for new commits every 10s
      let lastSeen = new Set<string>()
      const poll = setInterval(async () => {
        try {
          const { stdout } = await execFileAsync('git', ['log', '--format=%H|%an|%s|%ct', '-5'], {
            cwd: process.cwd(),
          })
          for (const line of stdout.trim().split('\n').filter(Boolean)) {
            const [hash, author, message, ts] = line.split('|')
            if (hash && !lastSeen.has(hash)) {
              lastSeen.add(hash)
              send('commit', {
                id: `poll-${hash}`,
                hash: hash.slice(0, 7),
                message: message ?? '',
                type: classifyCommit(message ?? ''),
                author: author ?? 'agent',
                timestamp: parseInt(ts ?? '0', 10) * 1000,
                branch: 'main',
              })
            }
          }
          if (lastSeen.size > 100) lastSeen = new Set([...lastSeen].slice(-50))
        } catch { /* ignore */ }
      }, 10000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clearInterval(poll)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

### 5.5 Space Theme Variants

| Variant | Stars | Nebula Colors | Planets | Aurora | Comet Speed |
|---|---|---|---|---|---|
| `deep_space` | 800 | Purple-blue | Earth, Mars | None | 1.0× |
| `nebula_bloom` | 600 | Magenta-cyan | 1 gas giant | Subtle top | 0.8× |
| `galaxy_core` | 1200 | Gold-orange | None | Dense core glow | 1.2× |
| `binary_star` | 700 | Blue-white | 2 suns | Flare effect | 1.5× |
| `supernova` | 1500 | White-red-gold | Debris field | Both edges | 4.0× |

---

## 6. Ocean & Coral Reef Backgrounds

### 6.1 Architecture Overview

```
OceanReefBackground (index.tsx)
├── WaterSurface.tsx      — Canvas 2D caustic light + ripples
├── UnderwaterAtmosphere.tsx — Gradient layers + god rays
├── FishSchool.tsx        — Boids algorithm (separation/alignment/cohesion)
├── Jellyfish.tsx         — Bell pulse + tentacle Bezier curves
├── CoralReef.tsx         — SVG procedural coral (branching/fan/brain/tube)
├── Anemone.tsx           — Canvas tentacles, mouse-reactive reach
├── SandBottom.tsx        — Noise texture + trail disturbance + starfish
└── DayNightCycle.tsx     — Context provider, lighting transitions
```

**Commit visual in ocean:** Bubble streams. Real commits from SSE appear as iridescent bubbles floating up, with the commit hash visible inside.

### 6.2 Fish Boids Algorithm

```typescript
// hooks/useBoids.ts — Core flocking simulation
export type FishSpecies = 'clownfish' | 'blueTang' | 'parrotfish' | 'angelfish' | 'surgeonfish'

interface Boid {
  id: number; x: number; y: number
  vx: number; vy: number; ax: number; ay: number
  species: FishSpecies; size: number; phase: number
}

interface BoidsConfig {
  separationRadius: number    // 30px — avoid each other
  alignmentRadius: number     // 80px — align velocity
  cohesionRadius: number      // 120px — flock toward center
  separationWeight: number    // 1.5
  alignmentWeight: number     // 1.0
  cohesionWeight: number      // 0.8
  maxSpeed: number            // 3.0 px/frame
  maxForce: number            // 0.2
  mouseRepelRadius: number    // 100px
  mouseRepelStrength: number  // 2.0
  edgeBehavior: 'wrap' | 'bounce' | 'avoid'
}

export function useBoids(
  width: number, height: number,
  count: number, config: BoidsConfig
) {
  const boidsRef = useRef<Boid[]>([])

  // Initialize boids
  useEffect(() => {
    const species: FishSpecies[] = ['clownfish', 'blueTang', 'parrotfish', 'angelfish', 'surgeonfish']
    boidsRef.current = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height * 0.6 + height * 0.1,  // swim zone: 10-70% height
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 0.5,
      ax: 0, ay: 0,
      species: species[i % species.length],
      size: 8 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,  // fin animation phase
    }))
  }, [count, width, height])

  const update = useCallback((mouseX: number, mouseY: number, dt: number) => {
    const boids = boidsRef.current
    const { separationRadius, alignmentRadius, cohesionRadius,
            separationWeight, alignmentWeight, cohesionWeight,
            maxSpeed, maxForce, mouseRepelRadius, mouseRepelStrength,
            edgeBehavior } = config

    for (const boid of boids) {
      let sx = 0, sy = 0, sepCount = 0
      let avx = 0, avy = 0, alignCount = 0
      let cx = 0, cy = 0, cohCount = 0

      for (const other of boids) {
        if (other.id === boid.id) continue
        const dx = boid.x - other.x
        const dy = boid.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < separationRadius && dist > 0) {
          sx += dx / dist; sy += dy / dist; sepCount++
        }
        if (dist < alignmentRadius) {
          avx += other.vx; avy += other.vy; alignCount++
        }
        if (dist < cohesionRadius) {
          cx += other.x; cy += other.y; cohCount++
        }
      }

      let fx = 0, fy = 0

      if (sepCount > 0) {
        fx += (sx / sepCount) * separationWeight
        fy += (sy / sepCount) * separationWeight
      }
      if (alignCount > 0) {
        const tdx = avx / alignCount - boid.vx
        const tdy = avy / alignCount - boid.vy
        fx += tdx * alignmentWeight
        fy += tdy * alignmentWeight
      }
      if (cohCount > 0) {
        const cdx = cx / cohCount - boid.x
        const cdy = cy / cohCount - boid.y
        fx += cdx * cohesionWeight * 0.01
        fy += cdy * cohesionWeight * 0.01
      }

      // Mouse repulsion
      const mdx = boid.x - mouseX
      const mdy = boid.y - mouseY
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
      if (mdist < mouseRepelRadius && mdist > 0) {
        const repelStrength = (1 - mdist / mouseRepelRadius) * mouseRepelStrength
        fx += (mdx / mdist) * repelStrength
        fy += (mdy / mdist) * repelStrength
      }

      // Clamp force
      const fmag = Math.sqrt(fx * fx + fy * fy)
      if (fmag > maxForce) { fx = fx / fmag * maxForce; fy = fy / fmag * maxForce }

      boid.vx += fx * dt; boid.vy += fy * dt

      // Clamp speed
      const vmag = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy)
      if (vmag > maxSpeed) { boid.vx = boid.vx / vmag * maxSpeed; boid.vy = boid.vy / vmag * maxSpeed }

      boid.x += boid.vx * dt; boid.y += boid.vy * dt
      boid.phase += 0.1 * dt

      // Edge behavior
      if (edgeBehavior === 'wrap') {
        if (boid.x < 0) boid.x += width
        if (boid.x > width) boid.x -= width
        if (boid.y < height * 0.05) boid.y = height * 0.05
        if (boid.y > height * 0.75) boid.y = height * 0.75
      }
    }

    return [...boids]
  }, [config, width, height])

  return { boidsRef, update }
}
```

### 6.3 Jellyfish Animation

```typescript
// Jellyfish.tsx — Bell pulse + tentacle Bezier curves
interface JellyfishEntity {
  x: number; y: number
  phase: number          // 0-2π bell animation phase
  phaseSpeed: number     // bell contraction speed
  radius: number
  color: string; glowColor: string
  tentacleCount: number
  tentacleLength: number
  driftVx: number; driftVy: number
  bioluminescentIntensity: number
}

// Draw one jellyfish on canvas context
function drawJellyfish(ctx: CanvasRenderingContext2D, j: JellyfishEntity, time: number) {
  ctx.save()
  ctx.translate(j.x, j.y)

  // Bell shape: contracts and expands
  const contraction = 0.75 + 0.25 * Math.sin(j.phase)
  const bellW = j.radius * contraction
  const bellH = j.radius * (2 - contraction)

  // Bioluminescent glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, bellW * 1.5)
  glow.addColorStop(0, j.glowColor.replace(')', `, ${0.2 + j.bioluminescentIntensity * 0.3})`).replace('rgb', 'rgba'))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.ellipse(0, 0, bellW * 1.5, bellH, 0, 0, Math.PI * 2)
  ctx.fill()

  // Bell dome
  const bell = ctx.createRadialGradient(0, -bellH * 0.3, 0, 0, 0, bellW)
  bell.addColorStop(0, `rgba(255,255,255,0.4)`)
  bell.addColorStop(0.4, j.color.replace(')', ', 0.6)').replace('rgb', 'rgba'))
  bell.addColorStop(1, j.glowColor.replace(')', ', 0.3)').replace('rgb', 'rgba'))
  ctx.fillStyle = bell

  ctx.beginPath()
  ctx.moveTo(-bellW, 0)
  ctx.bezierCurveTo(-bellW, -bellH * 1.2, bellW, -bellH * 1.2, bellW, 0)
  // Scalloped bottom edge
  for (let i = 0; i <= 8; i++) {
    const px = -bellW + (i / 8) * bellW * 2
    const py = Math.sin(i * Math.PI) * bellH * 0.15
    if (i === 0) ctx.lineTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()

  // Tentacles
  for (let t = 0; t < j.tentacleCount; t++) {
    const tx = -bellW + (t / (j.tentacleCount - 1)) * bellW * 2
    const waveOffset = t * 0.4 + j.phase
    const tentacleGrad = ctx.createLinearGradient(tx, 0, tx, j.tentacleLength)
    tentacleGrad.addColorStop(0, j.glowColor.replace(')', ', 0.8)').replace('rgb', 'rgba'))
    tentacleGrad.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.beginPath()
    ctx.moveTo(tx, 0)
    // Bezier curves for organic tentacle look
    const cp1x = tx + Math.sin(waveOffset) * 15
    const cp1y = j.tentacleLength * 0.4
    const cp2x = tx + Math.sin(waveOffset + 1) * 12
    const cp2y = j.tentacleLength * 0.7
    const endX = tx + Math.sin(waveOffset + 2) * 8
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, j.tentacleLength)
    ctx.strokeStyle = tentacleGrad
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}
```

### 6.4 Water Caustics (GLSL Shader)

```glsl
// shaders/caustics.frag.glsl — Water light patterns on ocean floor
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_waveOrigins[4];
uniform float u_brightness;

// Pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float causticWave(vec2 uv, vec2 center, float t) {
  float dist = length(uv - center);
  float wave = sin(dist * 20.0 - t * 3.0) * 0.5 + 0.5;
  float falloff = 1.0 / (1.0 + dist * dist * 8.0);
  return wave * falloff;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  float c = 0.0;
  for (int i = 0; i < 4; i++) {
    c += causticWave(uv, u_waveOrigins[i], u_time + float(i) * 1.3);
  }
  c /= 4.0;
  c = pow(c, 2.0);  // sharpen

  // Warm turquoise caustic color
  vec3 color = mix(
    vec3(0.0, 0.3, 0.4),
    vec3(0.4, 0.9, 1.0),
    c * u_brightness
  );

  gl_FragColor = vec4(color, c * u_brightness * 0.6);
}
```

---

## 7. Nature, Forest & Weather Backgrounds

### 7.1 Background Scene Inventory

| Scene | Tech | Key Features | Commit Visual |
|---|---|---|---|
| Forest Day | Canvas 2D + CSS | 5-layer parallax, leaf physics, fireflies, deer | Falling leaves with hash |
| Forest Night | Canvas 2D + WebGL | Moon rays, glowing mushrooms, firefly catch | Firefly with commit glow |
| Forest Autumn | Canvas 2D | Heavy leaf physics, fog, pumpkins | Orange leaf + hash |
| Cherry Blossom | Canvas 2D | Petal physics, koi fish, lanterns | Pink petal |
| Thunderstorm | Canvas 2D + Web Audio | Lightning algorithm, rain, thunder timing | Lightning bolt |
| Snowfall | Canvas 2D + CSS | Unique snowflake shapes, accumulation | Snowflake |
| Sunshine | Canvas 2D + WebGL | Lens flare, heat haze, rainbow | Golden mote |
| Fluid Sim | WebGL | Navier-Stokes, mouse velocity | Color swirl |
| Sacred Geometry | Canvas 2D | Mandala, Fibonacci, morphing | Geometric ripple |
| Cyberpunk City | Canvas 2D + CSS | Building windows, neon signs, rain | Hologram data packet |
| Lava | WebGL | Fluid shader, heat distortion | Lava bubble |
| Aurora Borealis | WebGL + CSS | Curtain vertex shader, star field | Ice crystal |
| Desert | Canvas 2D + WebGL | Noise dunes, heat shimmer, sand particles | Sand grain swirl |

### 7.2 Halloween Bats Boids System

```typescript
// Halloween bats — full boids implementation with Canvas drawing
interface Bat {
  x: number; y: number; vx: number; vy: number
  wingPhase: number; wingSpeed: number
  size: number; alpha: number
}

function drawBat(ctx: CanvasRenderingContext2D, bat: Bat) {
  ctx.save()
  ctx.translate(bat.x, bat.y)

  // Rotate to face direction of travel
  const angle = Math.atan2(bat.vy, bat.vx)
  ctx.rotate(angle + Math.PI / 2)
  ctx.globalAlpha = bat.alpha

  const s = bat.size
  const wingFlap = Math.sin(bat.wingPhase) * 0.4  // 0 = wings flat, 1 = wings up

  ctx.fillStyle = '#1a0520'
  ctx.beginPath()

  // Body
  ctx.ellipse(0, 0, s * 0.25, s * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()

  // Left wing
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.1)
  ctx.bezierCurveTo(
    -s * 0.4, -s * 0.3 - wingFlap * s * 0.4,
    -s * 0.8, s * 0.1 - wingFlap * s * 0.2,
    -s * 0.6, s * 0.3
  )
  ctx.bezierCurveTo(-s * 0.3, s * 0.1, -s * 0.15, -s * 0.05, 0, 0)
  ctx.fill()

  // Right wing (mirror)
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.1)
  ctx.bezierCurveTo(
    s * 0.4, -s * 0.3 - wingFlap * s * 0.4,
    s * 0.8, s * 0.1 - wingFlap * s * 0.2,
    s * 0.6, s * 0.3
  )
  ctx.bezierCurveTo(s * 0.3, s * 0.1, s * 0.15, -s * 0.05, 0, 0)
  ctx.fill()

  // Eyes (tiny red glints)
  ctx.fillStyle = '#cc0000'
  ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.1, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.1, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}
```

### 7.3 Fireworks Particle System (4th of July)

```typescript
// Complete fireworks Canvas 2D implementation
interface FireworkParticle {
  x: number; y: number; vx: number; vy: number
  alpha: number; decay: number; color: string
  radius: number; trail: Array<{ x: number; y: number; alpha: number }>
  type: 'launch' | 'burst' | 'glitter'
}

type BurstType = 'chrysanthemum' | 'peony' | 'willow' | 'crossette' | 'ring'

function createBurst(x: number, y: number, color: string, type: BurstType): FireworkParticle[] {
  const particles: FireworkParticle[] = []
  const count = type === 'ring' ? 40 : type === 'willow' ? 60 : 80

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    let speed: number

    switch (type) {
      case 'chrysanthemum':
        speed = 3 + Math.random() * 3
        break
      case 'peony':
        speed = 4 + Math.random() * 2; break
      case 'willow':
        speed = 2 + Math.random() * 4; break
      case 'crossette':
        // 4 main directions that split further
        if (i % (count / 4) !== 0) continue
        speed = 6; break
      case 'ring':
        speed = 4 + Math.random() * 0.5; break  // uniform speed = ring
    }

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'willow' ? 2 : 0), // willow droops
      alpha: 1,
      decay: type === 'willow' ? 0.012 : 0.02,
      color,
      radius: type === 'crossette' ? 3 : 2,
      trail: [],
      type: 'burst',
    })
  }

  // Crossette secondary bursts
  if (type === 'crossette') {
    particles.forEach(p => {
      for (let j = 0; j < 4; j++) {
        const a = Math.atan2(p.vy, p.vx) + (j - 1.5) * 0.5
        particles.push({
          x: p.x, y: p.y,
          vx: Math.cos(a) * 2, vy: Math.sin(a) * 2,
          alpha: 0.8, decay: 0.025,
          color: '#fff',
          radius: 1.5, trail: [], type: 'burst',
        })
      }
    })
  }

  return particles
}

class FireworksSystem {
  private particles: FireworkParticle[] = []
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  launch(x: number, targetY: number) {
    const COLORS = [
      '#FF4444', '#FF8800', '#FFD700', '#44FF44',
      '#4488FF', '#FF44FF', '#44FFFF', '#FFFFFF',
    ]
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]
    const types: BurstType[] = ['chrysanthemum', 'peony', 'willow', 'crossette', 'ring']
    const burstType = types[Math.floor(Math.random() * types.length)]

    // Launch phase
    const launchParticle: FireworkParticle = {
      x, y: this.canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -(Math.abs(this.canvas.height - targetY) / 40),
      alpha: 1, decay: 0,
      color, radius: 3, trail: [], type: 'launch',
    }

    // When launch particle reaches apex, burst
    const checkApex = setInterval(() => {
      if (launchParticle.vy >= 0) {
        clearInterval(checkApex)
        const burst = createBurst(launchParticle.x, launchParticle.y, color, burstType)
        this.particles.push(...burst)
        // Glitter finale
        for (let g = 0; g < 20; g++) {
          this.particles.push({
            x: launchParticle.x + (Math.random() - 0.5) * 30,
            y: launchParticle.y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 1,
            alpha: 0.8, decay: 0.008,
            color: '#FFD700', radius: 1.5, trail: [], type: 'glitter',
          })
        }
        this.particles = this.particles.filter(p => p !== launchParticle)
      }
    }, 16)

    this.particles.push(launchParticle)
  }

  update() {
    this.ctx.fillStyle = 'rgba(0,0,0,0.15)'  // trail fade
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.particles = this.particles.filter(p => p.alpha > 0.02)

    for (const p of this.particles) {
      p.vy += 0.08   // gravity
      p.vx *= 0.99   // air drag
      p.x += p.vx; p.y += p.vy

      if (p.type !== 'launch') p.alpha -= p.decay

      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha })
      if (p.trail.length > 8) p.trail.shift()

      // Draw trail
      for (let i = 1; i < p.trail.length; i++) {
        const t0 = p.trail[i - 1], t1 = p.trail[i]
        this.ctx.beginPath()
        this.ctx.moveTo(t0.x, t0.y)
        this.ctx.lineTo(t1.x, t1.y)
        this.ctx.strokeStyle = p.color + Math.round(t1.alpha * 255).toString(16).padStart(2, '0')
        this.ctx.lineWidth = p.radius * t1.alpha
        this.ctx.stroke()
      }

      // Draw particle head
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0')
      this.ctx.fill()
    }
  }

  autoLaunch(interval = 800) {
    const fire = () => {
      const count = 1 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const x = this.canvas.width * 0.15 + Math.random() * this.canvas.width * 0.7
          const y = this.canvas.height * 0.1 + Math.random() * this.canvas.height * 0.35
          this.launch(x, y)
        }, i * 200)
      }
      setTimeout(fire, interval + Math.random() * 1000)
    }
    fire()
  }
}
```


---

## Section 8: Holiday-Specific Backgrounds — Full Implementations

### 8.1 Holiday Background Registry

Each holiday gets a fully implemented Canvas/WebGL scene. The registry maps holiday keys to scene constructors.

```typescript
// lib/backgrounds/holidays/index.ts
export const HOLIDAY_SCENE_MAP: Record<string, () => Promise<BackgroundModule>> = {
  halloween:        () => import('./HalloweenScene'),
  christmas:        () => import('./ChristmasScene'),
  new_year:         () => import('./NewYearScene'),
  valentine:        () => import('./ValentineScene'),
  st_patricks:      () => import('./StPatricksScene'),
  easter:           () => import('./EasterScene'),
  independence_4th: () => import('./IndependenceScene'),
  thanksgiving:     () => import('./ThanksgivingScene'),
  hanukkah:         () => import('./HanukkahScene'),
  diwali:           () => import('./DiwaliScene'),
  mothers_day:      () => import('./MothersDayScene'),
  fathers_day:      () => import('./FathersDayScene'),
  graduation:       () => import('./GraduationScene'),
  back_to_school:   () => import('./BackToSchoolScene'),
}
```

### 8.2 Halloween — Full Implementation

Halloween uses four layered systems: moonlit sky, drifting fog, bats boids (Section 7), and floating ghosts.

```typescript
// lib/backgrounds/holidays/HalloweenScene.tsx
'use client'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme/BackgroundProvider'

interface Ghost {
  x: number; y: number
  vx: number; vy: number
  size: number; alpha: number
  wobble: number; wobbleSpeed: number
  eyeOffset: number
}

interface Bat {
  x: number; y: number
  vx: number; vy: number
  wingPhase: number; wingSpeed: number
  size: number
}

export function HalloweenScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { onCommit } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialize scene objects
    const ghosts: Ghost[] = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.5,
      size: 30 + Math.random() * 40,
      alpha: 0.3 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.02,
      eyeOffset: 0,
    }))

    const bats: Bat[] = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 1,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: 0.12 + Math.random() * 0.08,
      size: 8 + Math.random() * 12,
    }))

    // Commit visual: spawn extra bat on commit
    const unsubCommit = onCommit(() => {
      bats.push({
        x: -20, y: Math.random() * canvas.height * 0.5,
        vx: 2 + Math.random(), vy: (Math.random() - 0.5),
        wingPhase: 0, wingSpeed: 0.15,
        size: 14,
      })
      if (bats.length > 40) bats.shift()
    })

    // Fog layers
    const fogLayers = Array.from({ length: 3 }, (_, i) => ({
      x: 0, speed: 0.1 + i * 0.05,
      y: canvas.height * (0.7 + i * 0.1),
      alpha: 0.06 + i * 0.03,
    }))

    function drawMoon(t: number) {
      const mx = canvas.width * 0.75
      const my = canvas.height * 0.18
      // Outer glow
      const glowGrad = ctx.createRadialGradient(mx, my, 40, mx, my, 120)
      glowGrad.addColorStop(0, 'rgba(255,220,100,0.15)')
      glowGrad.addColorStop(1, 'rgba(255,220,100,0)')
      ctx.fillStyle = glowGrad
      ctx.beginPath(); ctx.arc(mx, my, 120, 0, Math.PI * 2); ctx.fill()
      // Moon body
      const moonGrad = ctx.createRadialGradient(mx - 8, my - 8, 0, mx, my, 42)
      moonGrad.addColorStop(0, '#fff8dc')
      moonGrad.addColorStop(1, '#c8a830')
      ctx.fillStyle = moonGrad
      ctx.beginPath(); ctx.arc(mx, my, 42, 0, Math.PI * 2); ctx.fill()
      // Craters
      const craters = [[mx - 12, my + 8, 6], [mx + 14, my - 10, 4], [mx + 5, my + 18, 5]]
      craters.forEach(([cx, cy, cr]) => {
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill()
      })
    }

    function drawGhost(g: Ghost, t: number) {
      g.wobble += g.wobbleSpeed
      const wobbleX = Math.sin(g.wobble) * 3
      const bodyX = g.x + wobbleX
      ctx.save()
      ctx.globalAlpha = g.alpha
      // Ghost body gradient
      const grad = ctx.createRadialGradient(bodyX, g.y, 0, bodyX, g.y + g.size * 0.3, g.size)
      grad.addColorStop(0, 'rgba(255,255,255,0.9)')
      grad.addColorStop(0.6, 'rgba(200,200,230,0.7)')
      grad.addColorStop(1, 'rgba(150,150,200,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(bodyX, g.y, g.size * 0.6, Math.PI, 0)
      // Wavy bottom
      const segments = 5
      const segW = (g.size * 1.2) / segments
      for (let i = 0; i <= segments; i++) {
        const sx = bodyX - g.size * 0.6 + i * segW
        const sy = g.y + g.size * 0.8 + Math.sin(i * Math.PI + t * 0.03) * 8
        i === 0 ? ctx.lineTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.closePath(); ctx.fill()
      // Eyes
      ctx.globalAlpha = g.alpha * 1.5
      ctx.fillStyle = '#1a0a2e'
      ctx.beginPath(); ctx.ellipse(bodyX - 10, g.y - 5, 5, 7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(bodyX + 10, g.y - 5, 5, 7, 0, 0, Math.PI * 2); ctx.fill()
      // Eye glow
      ctx.fillStyle = 'rgba(150,50,255,0.6)'
      ctx.beginPath(); ctx.arc(bodyX - 10, g.y - 5, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(bodyX + 10, g.y - 5, 2, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    function drawBat(b: Bat) {
      b.wingPhase += b.wingSpeed
      const wing = Math.sin(b.wingPhase)
      ctx.save()
      ctx.translate(b.x, b.y)
      const angle = Math.atan2(b.vy, b.vx)
      ctx.rotate(angle)
      ctx.fillStyle = '#1a0520'
      // Left wing
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-b.size * 1.5, -b.size * wing, -b.size * 2, b.size * 0.5, -b.size * 0.3, b.size * 0.3)
      ctx.closePath(); ctx.fill()
      // Right wing
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(b.size * 1.5, -b.size * wing, b.size * 2, b.size * 0.5, b.size * 0.3, b.size * 0.3)
      ctx.closePath(); ctx.fill()
      // Body
      ctx.fillStyle = '#2d0840'
      ctx.beginPath(); ctx.ellipse(0, 0, b.size * 0.4, b.size * 0.6, 0, 0, Math.PI * 2); ctx.fill()
      // Eyes
      ctx.fillStyle = '#ff2200'
      ctx.beginPath(); ctx.arc(-b.size * 0.15, -b.size * 0.2, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(b.size * 0.15, -b.size * 0.2, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    function drawPumpkin(x: number, y: number, size: number) {
      ctx.save()
      ctx.translate(x, y)
      // Segments
      const segColors = ['#ff6600', '#ff8c00', '#ff5500']
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = segColors[i + 1]
        ctx.beginPath()
        ctx.ellipse(i * size * 0.35, 0, size * 0.45, size * 0.5, i * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
      // Stem
      ctx.fillStyle = '#3d7a00'
      ctx.fillRect(-3, -size * 0.55, 6, size * 0.2)
      // Face
      ctx.fillStyle = '#1a0a00'
      ctx.globalCompositeOperation = 'destination-out'
      // Triangle eyes
      ctx.beginPath(); ctx.moveTo(-size * 0.25, -size * 0.1)
      ctx.lineTo(-size * 0.1, -size * 0.25); ctx.lineTo(-size * 0.1, -size * 0.1); ctx.fill()
      ctx.beginPath(); ctx.moveTo(size * 0.25, -size * 0.1)
      ctx.lineTo(size * 0.1, -size * 0.25); ctx.lineTo(size * 0.1, -size * 0.1); ctx.fill()
      // Mouth
      ctx.beginPath(); ctx.arc(0, size * 0.15, size * 0.25, 0.2, Math.PI - 0.2); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      // Glow
      ctx.globalAlpha = 0.4
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.8)
      glow.addColorStop(0, 'rgba(255,120,0,0.6)')
      glow.addColorStop(1, 'rgba(255,60,0,0)')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    // Static pumpkins along bottom
    const pumpkins = [
      { x: canvas.width * 0.08, y: canvas.height - 60, size: 35 },
      { x: canvas.width * 0.18, y: canvas.height - 45, size: 25 },
      { x: canvas.width * 0.82, y: canvas.height - 55, size: 30 },
      { x: canvas.width * 0.92, y: canvas.height - 40, size: 20 },
    ]

    let t = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      t++

      // Background gradient — deep purple night sky
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bg.addColorStop(0, '#0a0015')
      bg.addColorStop(0.5, '#150828')
      bg.addColorStop(1, '#1a0a00')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawMoon(t)

      // Stars
      if (t === 1) {
        for (let i = 0; i < 150; i++) {
          const sx = Math.random() * canvas.width
          const sy = Math.random() * canvas.height * 0.7
          const sr = Math.random() * 1.5
          ctx.fillStyle = `rgba(255,255,220,${0.3 + Math.random() * 0.7})`
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
        }
      }

      // Fog
      fogLayers.forEach(fog => {
        fog.x = (fog.x - fog.speed + canvas.width) % canvas.width
        const fogGrad = ctx.createLinearGradient(0, fog.y, 0, fog.y + 80)
        fogGrad.addColorStop(0, `rgba(180,160,210,${fog.alpha})`)
        fogGrad.addColorStop(1, 'rgba(180,160,210,0)')
        ctx.fillStyle = fogGrad
        ctx.fillRect(fog.x, fog.y, canvas.width, 80)
        ctx.fillRect(fog.x - canvas.width, fog.y, canvas.width, 80)
      })

      // Bats
      bats.forEach(b => {
        b.x += b.vx; b.y += b.vy
        b.vy += Math.sin(t * 0.02 + b.wingPhase) * 0.05
        if (b.x > canvas.width + 30) b.x = -30
        if (b.x < -30) b.x = canvas.width + 30
        b.y = Math.max(20, Math.min(canvas.height * 0.65, b.y))
        drawBat(b)
      })

      // Ghosts
      ghosts.forEach(g => {
        g.x += g.vx; g.y += g.vy
        if (g.x > canvas.width + g.size) g.x = -g.size
        if (g.x < -g.size) g.x = canvas.width + g.size
        if (g.y > canvas.height * 0.9) g.vy = -Math.abs(g.vy)
        if (g.y < 50) g.vy = Math.abs(g.vy)
        drawGhost(g, t)
      })

      // Pumpkins
      pumpkins.forEach(p => drawPumpkin(p.x, p.y, p.size))
    }

    animate()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      unsubCommit()
    }
  }, [onCommit])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}
```

### 8.3 Christmas Scene

```typescript
// lib/backgrounds/holidays/ChristmasScene.tsx
interface Snowflake {
  x: number; y: number; r: number
  speed: number; drift: number; driftPhase: number
  opacity: number; rotation: number; rotSpeed: number
}

export function ChristmasScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { onCommit } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    const snowflakes: Snowflake[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 4,
      speed: 0.5 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 0.8,
      driftPhase: Math.random() * Math.PI * 2,
      opacity: 0.4 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
    }))

    // Commit = extra snowflake burst
    const unsubCommit = onCommit(() => {
      for (let i = 0; i < 15; i++) {
        snowflakes.push({
          x: Math.random() * canvas.width,
          y: -10,
          r: 2 + Math.random() * 3,
          speed: 1 + Math.random() * 2,
          drift: (Math.random() - 0.5) * 1.5,
          driftPhase: Math.random() * Math.PI * 2,
          opacity: 0.8, rotation: 0, rotSpeed: 0.03,
        })
      }
      while (snowflakes.length > 300) snowflakes.shift()
    })

    function drawSnowflake6(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r)
        // Side branches
        const bx = x + Math.cos(angle) * r * 0.5
        const by = y + Math.sin(angle) * r * 0.5
        const branchAngle = angle + Math.PI / 3
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(branchAngle) * r * 0.3, by + Math.sin(branchAngle) * r * 0.3)
        ctx.moveTo(bx, by)
        ctx.lineTo(bx + Math.cos(angle - Math.PI / 3) * r * 0.3, by + Math.sin(angle - Math.PI / 3) * r * 0.3)
        ctx.stroke()
      }
    }

    // Christmas lights string
    const lights = Array.from({ length: 30 }, (_, i) => ({
      x: (canvas.width / 29) * i,
      y: 80 + Math.sin(i * 0.8) * 30,
      color: ['#ff0000','#00ff00','#0000ff','#ffff00','#ff8c00'][i % 5],
      phase: Math.random() * Math.PI * 2,
    }))

    let t = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      t++

      // Night sky gradient
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bg.addColorStop(0, '#0a1528')
      bg.addColorStop(0.6, '#142040')
      bg.addColorStop(1, '#0f3020')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Snowflakes
      snowflakes.forEach(s => {
        s.y += s.speed
        s.x += Math.sin(s.driftPhase + t * 0.01) * s.drift
        s.rotation += s.rotSpeed
        s.driftPhase += 0.01
        if (s.y > canvas.height + 10) {
          s.y = -10; s.x = Math.random() * canvas.width
        }
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.rotation)
        ctx.globalAlpha = s.opacity
        ctx.strokeStyle = '#cce8ff'
        ctx.lineWidth = s.r < 2 ? 0.5 : 1
        if (s.r < 2) {
          ctx.fillStyle = `rgba(204,232,255,${s.opacity})`
          ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill()
        } else {
          drawSnowflake6(ctx, 0, 0, s.r * 2)
        }
        ctx.restore()
      })

      // Christmas lights
      // Wire
      ctx.strokeStyle = 'rgba(80,60,20,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      lights.forEach((l, i) => { i === 0 ? ctx.moveTo(l.x, l.y) : ctx.lineTo(l.x, l.y) })
      ctx.stroke()
      // Light bulbs
      lights.forEach(l => {
        const flicker = 0.7 + Math.sin(t * 0.05 + l.phase) * 0.3
        const glow = ctx.createRadialGradient(l.x, l.y + 8, 0, l.x, l.y + 8, 20)
        glow.addColorStop(0, l.color + 'aa')
        glow.addColorStop(1, l.color + '00')
        ctx.fillStyle = glow
        ctx.globalAlpha = flicker
        ctx.beginPath(); ctx.arc(l.x, l.y + 8, 20, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = l.color
        ctx.globalAlpha = flicker
        ctx.beginPath(); ctx.ellipse(l.x, l.y + 8, 5, 8, 0, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      })
    }

    animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); unsubCommit() }
  }, [onCommit])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}
```

### 8.4 Independence Day (4th of July) — FireworksScene

Reuses the `FireworksSystem` from Section 7 plus adds patriotic color palette and USA silhouette.

```typescript
// lib/backgrounds/holidays/IndependenceScene.tsx
import { FireworksSystem } from '../nature/FireworksSystem'

const PATRIOTIC_PALETTES = [
  ['#ff0000', '#ff4444', '#ff8888'],   // Red burst
  ['#ffffff', '#ccccff', '#8888ff'],   // White burst
  ['#002868', '#0044aa', '#4488ff'],   // Blue burst
  ['#ff0000', '#ffffff', '#002868'],   // Tricolor ring
  ['#ffd700', '#ffaa00', '#ff6600'],   // Gold
]

export function IndependenceScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { onCommit } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    const fw = new FireworksSystem(canvas, ctx)
    // Override palettes with patriotic colors
    fw.setPalettes(PATRIOTIC_PALETTES)
    fw.setAutoLaunchInterval(2500)

    // Commit = bonus firework
    const unsubCommit = onCommit(() => {
      fw.createBurst(
        Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
        Math.random() * canvas.height * 0.5,
        PATRIOTIC_PALETTES[Math.floor(Math.random() * PATRIOTIC_PALETTES.length)]
      )
    })

    // Stars field (50 white stars for USA flag motif, subtle)
    const usaStars = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.8,
      r: 0.5 + Math.random(),
      twinkle: Math.random() * Math.PI * 2,
    }))

    let t = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      t++

      // Night sky
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bg.addColorStop(0, '#000814')
      bg.addColorStop(1, '#001a33')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Background stars
      usaStars.forEach(s => {
        s.twinkle += 0.02
        ctx.fillStyle = `rgba(255,255,220,${0.3 + Math.sin(s.twinkle) * 0.3})`
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill()
      })

      fw.update(t)
      fw.draw()
    }

    animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); unsubCommit() }
  }, [onCommit])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}
```

### 8.5 Easter Scene

Floating Easter eggs with parallax and spring flowers.

```typescript
// lib/backgrounds/holidays/EasterScene.tsx
interface EasterEgg {
  x: number; y: number; vy: number
  rotation: number; rotSpeed: number
  scale: number; palette: string[]
  pattern: 'stripes' | 'dots' | 'zigzag' | 'diamonds'
  alpha: number
}

const EGG_PALETTES = [
  ['#ff9eb5','#ff6b9d','#c9184a'],
  ['#a8e6cf','#56cfaa','#1a936f'],
  ['#ffd93d','#ff6b6b','#c678dd'],
  ['#74c0fc','#4dabf7','#1971c2'],
  ['#d0bfff','#9775fa','#7048e8'],
]

function drawEgg(ctx: CanvasRenderingContext2D, egg: EasterEgg) {
  const { x, y, scale, rotation, palette, pattern } = egg
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.scale(scale, scale)
  ctx.globalAlpha = egg.alpha

  // Egg shape via bezier
  ctx.beginPath()
  ctx.moveTo(0, -35)
  ctx.bezierCurveTo(22, -35, 28, -10, 28, 10)
  ctx.bezierCurveTo(28, 32, 16, 45, 0, 45)
  ctx.bezierCurveTo(-16, 45, -28, 32, -28, 10)
  ctx.bezierCurveTo(-28, -10, -22, -35, 0, -35)
  ctx.closePath()

  // Base color
  const grad = ctx.createLinearGradient(-28, -35, 28, 45)
  grad.addColorStop(0, palette[0])
  grad.addColorStop(0.5, palette[1])
  grad.addColorStop(1, palette[2])
  ctx.fillStyle = grad; ctx.fill()

  // Clip for patterns
  ctx.clip()

  if (pattern === 'stripes') {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 4
    for (let i = -40; i < 80; i += 12) {
      ctx.beginPath(); ctx.moveTo(-30, i); ctx.lineTo(30, i); ctx.stroke()
    }
  } else if (pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let dx = -25; dx <= 25; dx += 12) {
      for (let dy = -30; dy <= 40; dy += 12) {
        ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill()
      }
    }
  } else if (pattern === 'zigzag') {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    for (let row = -30; row < 50; row += 10) {
      ctx.beginPath()
      for (let col = -30; col <= 30; col += 8) {
        const yy = row + (col % 16 === 0 ? 0 : 5)
        col === -30 ? ctx.moveTo(col, yy) : ctx.lineTo(col, yy)
      }
      ctx.stroke()
    }
  } else { // diamonds
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    for (let dx = -25; dx <= 25; dx += 14) {
      for (let dy = -30; dy <= 40; dy += 14) {
        ctx.beginPath()
        ctx.moveTo(dx, dy - 5); ctx.lineTo(dx + 6, dy)
        ctx.lineTo(dx, dy + 5); ctx.lineTo(dx - 6, dy)
        ctx.closePath(); ctx.stroke()
      }
    }
  }

  ctx.restore()
}

export function EasterScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { onCommit } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    const patterns: EasterEgg['pattern'][] = ['stripes','dots','zigzag','diamonds']
    const eggs: EasterEgg[] = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * canvas.height,
      vy: -(0.3 + Math.random() * 0.5),
      rotation: (Math.random() - 0.5) * 0.4,
      rotSpeed: (Math.random() - 0.5) * 0.005,
      scale: 0.5 + Math.random() * 0.8,
      palette: EGG_PALETTES[Math.floor(Math.random() * EGG_PALETTES.length)],
      pattern: patterns[Math.floor(Math.random() * 4)],
      alpha: 0.6 + Math.random() * 0.4,
    }))

    const unsubCommit = onCommit(() => {
      eggs.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 50,
        vy: -(0.8 + Math.random()),
        rotation: 0, rotSpeed: 0.01,
        scale: 0.7 + Math.random() * 0.6,
        palette: EGG_PALETTES[Math.floor(Math.random() * EGG_PALETTES.length)],
        pattern: patterns[Math.floor(Math.random() * 4)],
        alpha: 0.9,
      })
    })

    let t = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      t++

      // Spring sky
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bg.addColorStop(0, '#87ceeb')
      bg.addColorStop(0.6, '#e0f4ff')
      bg.addColorStop(1, '#c8f5c8')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Floating eggs
      eggs.forEach(egg => {
        egg.y += egg.vy
        egg.rotation += egg.rotSpeed
        if (egg.y < -100) {
          egg.y = canvas.height + 50
          egg.x = Math.random() * canvas.width
        }
        drawEgg(ctx, egg)
      })
    }

    animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); unsubCommit() }
  }, [onCommit])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}
```

### 8.6 Diwali Scene

Oil lamps (diyas) with flame animations and rangoli pattern overlay.

```typescript
// lib/backgrounds/holidays/DiwaliScene.tsx
interface Diya {
  x: number; y: number
  flameHeight: number; flamePhase: number
  size: number; glowColor: string
}

const DIYA_COLORS = ['#ff6b35','#ffd700','#ff4500','#ff8c42','#ffb347']

export function DiwaliScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)

    // Diyas grid at bottom
    const diyas: Diya[] = []
    const rows = 2
    const cols = Math.floor(canvas.width / 80)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        diyas.push({
          x: (col + 0.5) * (canvas.width / cols),
          y: canvas.height - 30 - row * 70,
          flameHeight: 15 + Math.random() * 10,
          flamePhase: Math.random() * Math.PI * 2,
          size: 16 + Math.random() * 8,
          glowColor: DIYA_COLORS[Math.floor(Math.random() * DIYA_COLORS.length)],
        })
      }
    }

    // Floating light particles
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.2 + Math.random() * 0.6),
      r: 1 + Math.random() * 3,
      color: DIYA_COLORS[Math.floor(Math.random() * DIYA_COLORS.length)],
      alpha: 0.3 + Math.random() * 0.7,
      life: Math.random(),
    }))

    function drawDiya(d: Diya, t: number) {
      d.flamePhase += 0.08
      const flicker = Math.sin(d.flamePhase) * 3 + Math.sin(d.flamePhase * 2.3) * 1.5

      ctx.save()
      ctx.translate(d.x, d.y)

      // Glow
      const glow = ctx.createRadialGradient(0, -d.flameHeight, 0, 0, -d.flameHeight * 0.5, d.size * 3)
      glow.addColorStop(0, d.glowColor + 'aa')
      glow.addColorStop(1, d.glowColor + '00')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(0, -d.flameHeight, d.size * 3, 0, Math.PI * 2); ctx.fill()

      // Diya bowl (clay lamp)
      ctx.fillStyle = '#c07840'
      ctx.beginPath()
      ctx.ellipse(0, 0, d.size, d.size * 0.5, 0, 0, Math.PI)
      ctx.fill()
      ctx.fillStyle = '#a06030'
      ctx.beginPath()
      ctx.ellipse(0, 0, d.size, d.size * 0.3, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      // Flame
      const fh = d.flameHeight + flicker
      const flameGrad = ctx.createLinearGradient(0, 0, 0, -fh - 5)
      flameGrad.addColorStop(0, '#ff2200')
      flameGrad.addColorStop(0.4, '#ff8800')
      flameGrad.addColorStop(0.8, '#ffdd00')
      flameGrad.addColorStop(1, 'rgba(255,255,255,0.8)')
      ctx.fillStyle = flameGrad
      ctx.beginPath()
      ctx.moveTo(0, -2)
      ctx.bezierCurveTo(-5, -fh * 0.4, -4 + flicker, -fh * 0.7, 0, -fh - 3)
      ctx.bezierCurveTo(4 - flicker, -fh * 0.7, 5, -fh * 0.4, 0, -2)
      ctx.fill()

      ctx.restore()
    }

    let t = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      t++

      // Deep purple festive sky
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height)
      bg.addColorStop(0, '#0d0020')
      bg.addColorStop(0.7, '#200040')
      bg.addColorStop(1, '#100010')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Rising particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.life -= 0.003
        if (p.life <= 0 || p.y < -10) {
          Object.assign(p, {
            x: Math.random() * canvas.width,
            y: canvas.height - 80,
            vy: -(0.3 + Math.random() * 0.8),
            life: 0.7 + Math.random() * 0.3,
          })
        }
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life * p.alpha
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      })

      diyas.forEach(d => drawDiya(d, t))
    }

    animate()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />
}
```

### 8.7 Holiday Background Summary Table

| Holiday | Scene | Key Visual Elements | Commit Effect |
|---------|-------|---------------------|---------------|
| Halloween | HalloweenScene | Bats boids, ghosts, pumpkins, moon, fog | Spawn extra bat |
| Christmas | ChristmasScene | Snowflakes (6-armed), string lights, night sky | Snowflake burst |
| New Year | NewYearScene | FireworksSystem, countdown timer, confetti | Mega firework |
| Valentine's Day | ValentineScene | Floating hearts, pink particles, gentle drift | Heart burst |
| St. Patrick's Day | StPatricksScene | Shamrocks boids, rainbow arc, gold particles | Shamrock burst |
| Easter | EasterScene | Patterned eggs floating up, spring sky | Extra egg |
| 4th of July | IndependenceScene | FireworksSystem + patriotic palette | Bonus firework |
| Thanksgiving | ThanksgivingScene | Falling leaves, warm sky, harvest colors | Leaf shower |
| Hanukkah | HanukkahScene | Menorah, Star of David particles, blue/silver | Blue sparkles |
| Diwali | DiwaliScene | Diyas with flames, rising sparks, rangoli | Diya row added |
| Mother's Day | MothersDayScene | Blooming flowers, butterflies, soft pinks | Flower bloom |
| Father's Day | FathersDayScene | Sports equipment orbiting, outdoor greens | Trophy spin |
| Graduation | GraduationScene | Mortarboard caps tossing, confetti | Cap toss |
| Back to School | BackToSchoolScene | School bus, pencils, books falling | Book shower |


---

## Section 9: Weekend Arcade System

### 9.1 Architecture Overview

Saturday = Arcade Day. Sunday = Relaxation Mode. The WeekendModeEngine checks `dayOfWeek` and activates the appropriate system. Games are **agent-generated** — ZeroClaw LLM agents write complete playable games from scratch into self-contained HTML/JS files, stored in `public/games/generated/`.

```typescript
// lib/weekend/WeekendModeEngine.ts
export type WeekendMode = 'arcade' | 'relaxation' | 'none'

export interface GeneratedGame {
  id: string
  title: string
  genre: GameGenre
  description: string
  file: string          // path in public/games/generated/
  thumbnail: string     // base64 PNG generated by agent
  generatedAt: Date
  agentModel: string
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive'
  playTime: string      // "2-5 min"
  tags: string[]
  ticketCost: number
  highScore?: number
}

export type GameGenre =
  | 'arcade' | 'puzzle' | 'card' | 'strategy' | 'trivia'
  | 'platformer' | 'shooter' | 'idle' | 'rhythm' | 'casino'

export class WeekendModeEngine {
  private mode: WeekendMode = 'none'
  private games: GeneratedGame[] = []
  private ticketEconomy: TicketEconomy

  constructor() {
    this.ticketEconomy = new TicketEconomy()
    this.detectMode()
  }

  detectMode(): WeekendMode {
    const day = new Date().getDay() // 0=Sun, 6=Sat
    this.mode = day === 6 ? 'arcade' : day === 0 ? 'relaxation' : 'none'
    return this.mode
  }

  async loadGames(): Promise<GeneratedGame[]> {
    const res = await fetch('/api/weekend/games')
    this.games = await res.json()
    return this.games
  }

  async requestNewGame(genre: GameGenre): Promise<GeneratedGame> {
    const res = await fetch('/api/weekend/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre, difficulty: 'adaptive' }),
    })
    const game = await res.json()
    this.games.push(game)
    return game
  }
}
```

### 9.2 The 19 Game Types

| # | Game | Genre | Tech | Complexity | Agent Prompt Template |
|---|------|-------|------|------------|----------------------|
| 1 | Snake | Arcade | Canvas 2D | Low | snake_prompt |
| 2 | Tetris | Puzzle | Canvas 2D | Medium | tetris_prompt |
| 3 | 2048 | Puzzle | CSS Grid | Low | puzzle_2048_prompt |
| 4 | Minesweeper | Puzzle | DOM | Low | minesweeper_prompt |
| 5 | Pac-Man | Arcade | Canvas 2D | High | pacman_prompt |
| 6 | Flappy Bird | Arcade | Canvas 2D | Low | flappy_prompt |
| 7 | Space Invaders | Shooter | Canvas 2D | Medium | invaders_prompt |
| 8 | Breakout | Arcade | Canvas 2D | Medium | breakout_prompt |
| 9 | Whack-a-Mole | Arcade | DOM | Low | whack_prompt |
| 10 | Connect Four | Strategy | Canvas 2D | Medium | connect4_prompt |
| 11 | Blackjack | Card | DOM | Medium | blackjack_prompt |
| 12 | Memory Match | Puzzle | CSS Grid | Low | memory_prompt |
| 13 | Solitaire | Card | Canvas 2D | High | solitaire_prompt |
| 14 | Trivia Quiz | Trivia | DOM | Low | trivia_prompt |
| 15 | Pong | Arcade | Canvas 2D | Low | pong_prompt |
| 16 | Asteroids | Shooter | Canvas 2D | Medium | asteroids_prompt |
| 17 | Tower Defense | Strategy | Canvas 2D | High | tower_defense_prompt |
| 18 | Slot Machine | Casino | Canvas 2D | Medium | slots_prompt |
| 19 | Rhythm Tap | Rhythm | Canvas 2D + Web Audio | High | rhythm_prompt |

### 9.3 Game Generation API

```typescript
// app/api/weekend/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateGame } from '@/lib/weekend/GameGenerator'

export async function POST(req: NextRequest) {
  const { genre, difficulty, theme } = await req.json()

  const game = await generateGame({
    genre,
    difficulty,
    theme: theme ?? detectCurrentTheme(),
    constraints: {
      maxFileSize: '50kb',
      selfContained: true,    // single HTML file, no external deps
      webAudioSounds: true,   // no audio file imports
      mobileTouch: true,      // must work on mobile
      maxLoadTime: '1s',
    },
  })

  return NextResponse.json(game)
}
```

```typescript
// lib/weekend/GameGenerator.ts
import Anthropic from '@anthropic-ai/sdk'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'

const client = new Anthropic()

export interface GameSpec {
  genre: string
  difficulty: string
  theme?: string
  constraints: Record<string, unknown>
}

const GAME_SYSTEM_PROMPT = `You are an elite game developer. Generate complete, playable browser games
as single self-contained HTML files. Requirements:
- All CSS and JavaScript inline in one HTML file
- Use Canvas 2D or DOM only (no WebGL, no external libs)
- Web Audio API for all sounds (synthesized, no files)
- Touch and keyboard controls
- Score tracking with localStorage high scores
- Responsive canvas that fills the viewport
- Smooth 60fps animation with requestAnimationFrame
- Game over screen with replay button
- Loading screen with instructions
- Max file size: 50KB minified
Output ONLY the complete HTML file content, nothing else.`

export async function generateGame(spec: GameSpec): Promise<any> {
  const prompt = buildGamePrompt(spec)

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    system: GAME_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const htmlContent = (message.content[0] as any).text
  const id = crypto.randomUUID()
  const filename = `${spec.genre}-${id.slice(0, 8)}.html`
  const filePath = join(process.cwd(), 'public', 'games', 'generated', filename)

  await writeFile(filePath, htmlContent, 'utf8')

  return {
    id,
    title: extractTitle(htmlContent),
    genre: spec.genre,
    description: extractDescription(htmlContent),
    file: `/games/generated/${filename}`,
    thumbnail: await generateThumbnail(htmlContent),
    generatedAt: new Date(),
    agentModel: 'claude-opus-4-5',
    difficulty: spec.difficulty,
    playTime: estimatePlayTime(spec.genre),
    tags: [spec.genre, spec.difficulty, spec.theme ?? 'default'],
    ticketCost: TICKET_COSTS[spec.genre] ?? 10,
  }
}

function buildGamePrompt(spec: GameSpec): string {
  const templates: Record<string, string> = {
    snake: `Create a Snake game with theme "${spec.theme}". Features:
      - Grid-based movement, wrapping edges
      - Speed increases every 5 foods eaten
      - Power-ups: slow motion (blue), double score (gold), shield (green)
      - Particle explosion when eating food
      - High score stored in localStorage
      - Synthesized eat/game-over sounds via Web Audio API`,

    tetris: `Create Tetris with theme "${spec.theme}". Features:
      - All 7 tetrominoes with proper rotation (Super Rotation System)
      - Ghost piece showing where current piece lands
      - Hold piece functionality
      - Next piece preview (3 pieces)
      - T-spin detection and bonus scoring
      - Line clear animations with particle effects
      - Progressive speed levels`,

    blackjack: `Create Blackjack casino game with theme "${spec.theme}". Features:
      - Player vs dealer, standard blackjack rules
      - Split, Double Down, Insurance options
      - Chip/bet system with denominations ($5,$25,$100,$500)
      - Card flip animations using CSS transforms
      - Shuffling animation between hands
      - Statistics panel (win rate, biggest win, current streak)
      - Realistic card design with suits rendered in Canvas`,

    flappy: `Create Flappy Bird clone themed as "${spec.theme}". Features:
      - Tap/spacebar to flap, physics-based gravity
      - Procedurally generated pipe gaps (narrowing over time)
      - Parallax scrolling background (3 layers)
      - Combo scoring: +1 per pipe, x2 multiplier at 10 pipes
      - Medal system: bronze/silver/gold/platinum
      - Death particle explosion
      - Leaderboard top 5 in localStorage`,

    whack: `Create Whack-a-Mole with theme "${spec.theme}". Features:
      - 9-hole grid, moles pop up randomly with CSS animations
      - Golden moles worth 5x, bomb moles end game
      - 60-second timer with urgency effects at last 10s
      - Combo multiplier for rapid hits
      - Satisfying hit animation and thud sound
      - Progressive difficulty: faster pop-up speeds per level`,

    connect4: `Create Connect Four with theme "${spec.theme}". Features:
      - 7x6 grid, alternating player turns
      - Animated disc drop with bounce physics
      - Win detection with glowing highlight
      - AI opponent using minimax with alpha-beta pruning (depth 5)
      - Difficulty selector: Easy/Medium/Hard
      - Win/loss/draw statistics`,

    solitaire: `Create Klondike Solitaire with theme "${spec.theme}". Features:
      - Full 52-card deck, proper Klondike rules
      - Drag-and-drop cards with smooth Canvas animation
      - Auto-complete when game is clearly won
      - Undo button (unlimited)
      - Timer and move counter
      - Win animation: cards cascade off to sides
      - Card design: clean suits, readable numbers`,

    slots: `Create a Slot Machine with theme "${spec.theme}". Features:
      - 3 reels, 5 symbols each (themed to "${spec.theme}")
      - Multiple paylines (single, triple, diagonal)
      - Spinning animation with deceleration easing
      - Symbol designs: drawn with Canvas arcs/paths
      - Bonus features: free spins, wild symbols, multipliers
      - Credits system starting at 1000
      - Win celebration: coin shower particle effect`,
  }
  return templates[spec.genre] ?? `Create a ${spec.genre} game themed as "${spec.theme}". Make it complete, fun, and polished.`
}

const TICKET_COSTS: Record<string, number> = {
  snake: 5, tetris: 8, '2048': 5, minesweeper: 5,
  flappy: 6, blackjack: 15, solitaire: 10, slots: 20,
  pacman: 12, 'space-invaders': 10, breakout: 8, pong: 5,
  rhythm: 15, 'tower-defense': 20, asteroids: 10, trivia: 5,
}

function estimatePlayTime(genre: string): string {
  const times: Record<string, string> = {
    snake: '2-10 min', tetris: '5-20 min', blackjack: '5-15 min',
    solitaire: '5-20 min', trivia: '3-5 min', slots: '1-5 min',
    flappy: '1-5 min', rhythm: '3-5 min', 'tower-defense': '10-30 min',
  }
  return times[genre] ?? '3-10 min'
}
```

### 9.4 Ticket Economy System

```typescript
// lib/weekend/TicketEconomy.ts
export class TicketEconomy {
  private storageKey = 'daveai_arcade_tickets'

  getBalance(): number {
    return parseInt(localStorage.getItem(this.storageKey) ?? '100')
  }

  award(amount: number, reason: string): void {
    const current = this.getBalance()
    localStorage.setItem(this.storageKey, String(current + amount))
    this.logTransaction({ type: 'award', amount, reason, timestamp: Date.now() })
  }

  spend(amount: number, gameTitle: string): boolean {
    const current = this.getBalance()
    if (current < amount) return false
    localStorage.setItem(this.storageKey, String(current - amount))
    this.logTransaction({ type: 'spend', amount, reason: gameTitle, timestamp: Date.now() })
    return true
  }

  // Award tickets for site interactions
  awardForInteraction(type: 'page_view' | 'commit_stream' | 'timewarp_play' | 'daily_visit'): void {
    const rewards = { page_view: 1, commit_stream: 3, timewarp_play: 5, daily_visit: 25 }
    this.award(rewards[type], `Earned from: ${type}`)
  }

  // Award for high scores
  awardForHighScore(game: string, score: number, previousBest: number): void {
    if (score > previousBest) {
      const bonus = Math.min(50, Math.floor((score - previousBest) / 100))
      this.award(bonus + 10, `New high score in ${game}!`)
    }
  }

  private logTransaction(tx: Record<string, unknown>) {
    const history = JSON.parse(localStorage.getItem('daveai_ticket_history') ?? '[]')
    history.push(tx)
    if (history.length > 100) history.shift()
    localStorage.setItem('daveai_ticket_history', JSON.stringify(history))
  }
}
```

### 9.5 Weekend Arcade UI Component

```typescript
// components/weekend/ArcadePortal.tsx
'use client'
import { useState, useEffect } from 'react'
import { WeekendModeEngine, GeneratedGame } from '@/lib/weekend/WeekendModeEngine'
import { TicketEconomy } from '@/lib/weekend/TicketEconomy'

export function ArcadePortal() {
  const [games, setGames] = useState<GeneratedGame[]>([])
  const [tickets, setTickets] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [activeGame, setActiveGame] = useState<GeneratedGame | null>(null)
  const [selectedGenre, setSelectedGenre] = useState<string>('arcade')

  const engine = new WeekendModeEngine()
  const economy = new TicketEconomy()

  useEffect(() => {
    engine.loadGames().then(setGames)
    setTickets(economy.getBalance())
    // Daily visit award
    economy.awardForInteraction('daily_visit')
  }, [])

  async function generateNewGame() {
    setGenerating(true)
    try {
      const game = await engine.requestNewGame(selectedGenre as any)
      setGames(prev => [game, ...prev])
    } finally {
      setGenerating(false)
    }
  }

  function playGame(game: GeneratedGame) {
    if (economy.spend(game.ticketCost, game.title)) {
      setTickets(economy.getBalance())
      setActiveGame(game)
    }
  }

  if (activeGame) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        <button
          onClick={() => setActiveGame(null)}
          className="absolute top-4 right-4 z-10 bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
        >
          ✕ Exit Game
        </button>
        <iframe
          src={activeGame.file}
          className="w-full h-full border-0"
          title={activeGame.title}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-yellow-400">🕹️ DaveAI Arcade</h1>
          <p className="text-gray-400">Saturday Fun Zone — Agent-Generated Games</p>
        </div>
        <div className="bg-yellow-400 text-black rounded-xl px-6 py-3 font-bold text-xl">
          🎫 {tickets} Tickets
        </div>
      </div>

      {/* Generate new game */}
      <div className="bg-gray-800 rounded-2xl p-6 mb-8 border border-yellow-400/30">
        <h2 className="text-xl font-bold mb-4">🤖 Generate New Game</h2>
        <div className="flex gap-4">
          <select
            value={selectedGenre}
            onChange={e => setSelectedGenre(e.target.value)}
            className="bg-gray-700 rounded-lg px-4 py-2 flex-1"
          >
            {['arcade','puzzle','card','strategy','shooter','rhythm','casino'].map(g => (
              <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={generateNewGame}
            disabled={generating}
            className="bg-yellow-400 text-black px-8 py-2 rounded-lg font-bold disabled:opacity-50"
          >
            {generating ? '⚙️ Generating...' : '✨ Generate Game'}
          </button>
        </div>
        {generating && (
          <div className="mt-4 text-yellow-400 text-sm animate-pulse">
            🎮 ZeroClaw agent is writing your game from scratch...
          </div>
        )}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map(game => (
          <div key={game.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-yellow-400/50 transition-colors">
            <div className="aspect-video bg-gray-700 flex items-center justify-center text-4xl">
              {game.thumbnail ? (
                <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
              ) : '🎮'}
            </div>
            <div className="p-4">
              <h3 className="font-bold truncate">{game.title}</h3>
              <p className="text-xs text-gray-400 mb-3">{game.playTime} • {game.difficulty}</p>
              <button
                onClick={() => playGame(game)}
                className="w-full bg-yellow-400 text-black py-2 rounded-lg font-bold text-sm hover:bg-yellow-300 transition-colors"
              >
                Play · {game.ticketCost} 🎫
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 9.6 Sunday Relaxation Mode

Sunday uses calming backgrounds — ambient ocean, forest dawn, or zen garden — with no games.

```typescript
// lib/weekend/SundayRelaxation.ts
export const SUNDAY_SCENES = [
  'ocean_calm',      // Still water, gentle waves, sunrise
  'forest_dawn',     // Mist through trees, bird particles
  'zen_garden',      // Sand ripples, koi pond, lotus flowers
  'northern_lights', // Aurora borealis with slow drift
  'rainy_cafe',      // Rain on window effect, warm interior glow
]

export function getSundayScene(): string {
  // Rotate through the 5 scenes week by week
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return SUNDAY_SCENES[weekNumber % SUNDAY_SCENES.length]
}
```

---

## Section 10: Live Stats Dashboard Widget

### 10.1 DaveAIStatsWidget Component

```typescript
// components/stats/DaveAIStatsWidget.tsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme/BackgroundProvider'

export interface DaveAIStats {
  // Real-time
  liveTime: string             // "14:32:08"
  liveDate: string             // "Thursday, Feb 20"
  currentTheme: string
  activeBackground: string

  // Generation totals
  totalSitesGenerated: number
  totalPagesCreated: number
  totalFilesWritten: number
  totalLinesOfCode: number

  // TimeWarp / TimeMachine
  timeWarpFrameCount: number
  timeWarpTotalDays: number
  timeWarpOldestDate: string
  timeWarpNewestDate: string

  // Agent activity
  agentHoursWorked: number
  tokensUsedTotal: number
  tokensUsedToday: number
  activeAgents: number
  completedTasksToday: number

  // Current generation
  isGenerating: boolean
  currentTask?: string
  generationProgress?: number  // 0-100
  generationETA?: string       // "~2 min"

  // Storage
  diskUsedGB: number
  diskTotalGB: number
  sitesCompressed: number
  compressionRatio: number
}

export function DaveAIStatsWidget() {
  const [stats, setStats] = useState<DaveAIStats | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [time, setTime] = useState(new Date())
  const esRef = useRef<EventSource | null>(null)
  const { currentScene } = useTheme()

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // SSE stats stream
  useEffect(() => {
    const es = new EventSource('/api/stats/stream')
    esRef.current = es

    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setStats(data)
    }

    es.onerror = () => {
      es.close()
      // Reconnect after 5s
      setTimeout(() => {
        esRef.current = new EventSource('/api/stats/stream')
      }, 5000)
    }

    return () => es.close()
  }, [])

  const formatNumber = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n)

  const formatTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
    : `${(n / 1_000).toFixed(0)}K`

  if (!stats) return null

  return (
    <div className={`
      fixed bottom-4 right-4 z-40
      bg-black/80 backdrop-blur-xl border border-white/10
      rounded-2xl shadow-2xl text-white
      transition-all duration-500 ease-out
      ${expanded ? 'w-80' : 'w-48'}
    `}>
      {/* Collapsed view — always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Live clock */}
        <div className="text-center">
          <div className="text-2xl font-mono font-bold tabular-nums tracking-tight">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex justify-between mt-3 text-xs">
          <div className="text-center">
            <div className="font-bold text-green-400">{formatNumber(stats.totalSitesGenerated)}</div>
            <div className="text-gray-500">Sites</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-400">{formatNumber(stats.totalPagesCreated)}</div>
            <div className="text-gray-500">Pages</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-400">{stats.activeAgents}</div>
            <div className="text-gray-500">Agents</div>
          </div>
        </div>

        {/* Generation progress bar */}
        {stats.isGenerating && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-yellow-400 animate-pulse">⚙️ Generating</span>
              <span className="text-gray-400">{stats.generationETA}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-yellow-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${stats.generationProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded view */}
      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4">
          {/* TimeWarp stats */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              ⏱️ TimeWarp / TimeMachine
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatRow label="Frames" value={formatNumber(stats.timeWarpFrameCount)} color="cyan" />
              <StatRow label="Days Covered" value={String(stats.timeWarpTotalDays)} color="cyan" />
              <StatRow label="Oldest Site" value={stats.timeWarpOldestDate} color="gray" />
              <StatRow label="Latest Site" value={stats.timeWarpNewestDate} color="gray" />
            </div>
          </div>

          {/* Agent stats */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              🤖 Agent Activity
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatRow label="Hours Worked" value={`${stats.agentHoursWorked.toFixed(0)}h`} color="green" />
              <StatRow label="Tasks Today" value={String(stats.completedTasksToday)} color="green" />
              <StatRow label="Tokens Total" value={formatTokens(stats.tokensUsedTotal)} color="purple" />
              <StatRow label="Tokens Today" value={formatTokens(stats.tokensUsedToday)} color="purple" />
            </div>
          </div>

          {/* Storage */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              💾 Storage
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{stats.diskUsedGB.toFixed(1)} GB used</span>
                <span className="text-gray-500">{stats.diskTotalGB} GB total</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${stats.diskUsedGB / stats.diskTotalGB > 0.8 ? 'bg-red-400' : 'bg-green-400'}`}
                  style={{ width: `${(stats.diskUsedGB / stats.diskTotalGB) * 100}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatRow label="Compressed" value={formatNumber(stats.sitesCompressed)} color="blue" />
              <StatRow label="Ratio" value={`${stats.compressionRatio.toFixed(1)}:1`} color="blue" />
            </div>
          </div>

          {/* Current task */}
          {stats.currentTask && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 rounded-lg p-2">
              <span className="animate-pulse">⚙️ </span>{stats.currentTask}
            </div>
          )}

          {/* Theme indicator */}
          <div className="text-xs text-gray-500 text-center">
            Theme: {stats.activeBackground}
          </div>
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'text-cyan-400', green: 'text-green-400', purple: 'text-purple-400',
    blue: 'text-blue-400', gray: 'text-gray-300',
  }
  return (
    <div>
      <div className={`font-bold ${colors[color] ?? 'text-white'}`}>{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  )
}
```

### 10.2 Stats SSE Server Route

```typescript
// app/api/stats/stream/route.ts
import { NextRequest } from 'next/server'
import { getStatsFromDB } from '@/lib/stats/StatsCollector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // Initial stats
      send(await getStatsFromDB())

      // Update every 5 seconds
      const interval = setInterval(async () => {
        try {
          send(await getStatsFromDB())
        } catch {
          clearInterval(interval)
          controller.close()
        }
      }, 5000)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 30000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

```typescript
// lib/stats/StatsCollector.ts
import Database from 'better-sqlite3'
import { join } from 'path'
import { statSync } from 'fs'
import type { DaveAIStats } from '@/components/stats/DaveAIStatsWidget'

const DB_PATH = join(process.cwd(), '..', 'zeroclaw.db')

export async function getStatsFromDB(): Promise<DaveAIStats> {
  const db = new Database(DB_PATH, { readonly: true })

  const sites = db.prepare('SELECT COUNT(*) as count FROM sites').get() as any
  const pages = db.prepare('SELECT COUNT(*) as count FROM pages').get() as any
  const tokens = db.prepare('SELECT SUM(tokens_used) as total, SUM(CASE WHEN DATE(created_at)=DATE(\'now\') THEN tokens_used ELSE 0 END) as today FROM agent_runs').get() as any
  const activeAgents = db.prepare('SELECT COUNT(*) as count FROM agent_runs WHERE status=\'running\'').get() as any
  const tasksToday = db.prepare('SELECT COUNT(*) as count FROM agent_runs WHERE status=\'completed\' AND DATE(created_at)=DATE(\'now\')').get() as any
  const timeWarp = db.prepare('SELECT COUNT(*) as frames, COUNT(DISTINCT DATE(snapshot_date)) as days, MIN(snapshot_date) as oldest, MAX(snapshot_date) as newest FROM timewarp_snapshots').get() as any
  const agentHours = db.prepare('SELECT SUM(duration_seconds)/3600.0 as hours FROM agent_runs WHERE status=\'completed\'').get() as any
  const compressed = db.prepare('SELECT COUNT(*) as count, AVG(compression_ratio) as ratio FROM site_archives').get() as any
  const currentTask = db.prepare('SELECT task_description FROM agent_runs WHERE status=\'running\' ORDER BY created_at DESC LIMIT 1').get() as any
  const progress = db.prepare('SELECT progress FROM agent_runs WHERE status=\'running\' ORDER BY created_at DESC LIMIT 1').get() as any

  db.close()

  // Disk usage
  let diskUsedGB = 0
  try {
    const { size } = statSync(DB_PATH)
    diskUsedGB = size / (1024 ** 3)
    // Add sites directory
    diskUsedGB += estimateSitesDirSize()
  } catch {}

  return {
    liveTime: new Date().toLocaleTimeString('en-US', { hour12: false }),
    liveDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    currentTheme: 'auto',
    activeBackground: 'space_nebula',
    totalSitesGenerated: sites?.count ?? 0,
    totalPagesCreated: pages?.count ?? 0,
    totalFilesWritten: (pages?.count ?? 0) * 12, // estimate
    totalLinesOfCode: (pages?.count ?? 0) * 450, // estimate
    timeWarpFrameCount: timeWarp?.frames ?? 0,
    timeWarpTotalDays: timeWarp?.days ?? 0,
    timeWarpOldestDate: timeWarp?.oldest?.slice(0, 10) ?? '—',
    timeWarpNewestDate: timeWarp?.newest?.slice(0, 10) ?? '—',
    agentHoursWorked: agentHours?.hours ?? 0,
    tokensUsedTotal: tokens?.total ?? 0,
    tokensUsedToday: tokens?.today ?? 0,
    activeAgents: activeAgents?.count ?? 0,
    completedTasksToday: tasksToday?.count ?? 0,
    isGenerating: (activeAgents?.count ?? 0) > 0,
    currentTask: currentTask?.task_description,
    generationProgress: progress?.progress,
    diskUsedGB,
    diskTotalGB: 200,
    sitesCompressed: compressed?.count ?? 0,
    compressionRatio: compressed?.ratio ?? 1,
  }
}

function estimateSitesDirSize(): number {
  // Returns GB estimate from cached size file updated by generation pipeline
  try {
    const sizeFile = join(process.cwd(), '..', '.site_size_cache')
    const { size } = statSync(sizeFile)
    return parseFloat(size.toString()) / (1024 ** 3)
  } catch { return 0 }
}
```

---

## Section 11: Daily Site Recreation System

### 11.1 Architecture — Zero-Downtime Background Generation

The key design principle: **the current live site never goes down**. A new site is generated in a staging directory, fully built, tested, then atomically swapped in. The admin controls when this happens via a scheduled time (default: 3:00 AM) or on-demand. A refresh signal is sent to connected clients when ready.

```
┌─────────────────────────────────────────────────────────┐
│                    DAILY RECREATION FLOW                 │
│                                                          │
│  [Scheduler / Admin Trigger]                             │
│         │                                                │
│         ▼                                                │
│  [DailyBriefGenerator] ──► generates theme brief         │
│         │                                                │
│         ▼                                                │
│  [BackgroundBuildWorker] ──► builds in /staging/         │
│         │                 ──► runs next build            │
│         │                 ──► validates (lighthouse≥90)  │
│         ▼                                                │
│  [ReadySignal] ──SSE──► all connected browsers           │
│         │                                                │
│         ▼                                                │
│  [AtomicSwap] ──► mv /staging/ /current/                 │
│                ──► compress /prev/ → sites archive       │
└─────────────────────────────────────────────────────────┘
```

### 11.2 Scheduler Configuration

```typescript
// lib/daily/DailyRecreationScheduler.ts
import { CronJob } from 'cron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { DailyBriefGenerator } from './DailyBriefGenerator'
import { BackgroundBuildWorker } from './BackgroundBuildWorker'
import { logger } from '@/lib/logger'

export interface SchedulerConfig {
  // Default: 3:00 AM server time. Admin-configurable via settings UI.
  recreationTime: string       // cron format: "0 3 * * *"
  timezone: string             // "America/New_York"
  enabled: boolean
  notifyMinutesBefore: number  // warn users N minutes before swap (default: 0 = silent)
  autoCompress: boolean        // compress previous site after swap
  stagingDir: string           // absolute path to staging build
  currentDir: string           // absolute path to live site
  archiveDir: string           // absolute path to compressed archives
  lighthouseMinScore: number   // minimum score before swap (default: 90)
}

const DB = new Database(join(process.cwd(), '..', 'zeroclaw.db'))

export class DailyRecreationScheduler {
  private job: CronJob | null = null
  private config: SchedulerConfig
  private isBuilding = false

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      recreationTime: '0 3 * * *',   // 3:00 AM daily
      timezone: 'America/New_York',
      enabled: true,
      notifyMinutesBefore: 0,
      autoCompress: true,
      stagingDir: '/var/www/zeroclaw/staging',
      currentDir: '/var/www/zeroclaw/current',
      archiveDir: '/var/www/zeroclaw/archives',
      lighthouseMinScore: 90,
      ...this.loadConfigFromDB(),
      ...config,
    }
  }

  start(): void {
    if (!this.config.enabled) {
      logger.info('[Scheduler] Daily recreation disabled in config')
      return
    }

    this.job = new CronJob(
      this.config.recreationTime,
      () => this.triggerRecreation('scheduled'),
      null,
      true,
      this.config.timezone
    )
    logger.info(`[Scheduler] Daily recreation scheduled: ${this.config.recreationTime} ${this.config.timezone}`)
  }

  stop(): void {
    this.job?.stop()
    logger.info('[Scheduler] Daily recreation scheduler stopped')
  }

  // Admin can trigger immediately
  async triggerRecreation(reason: 'scheduled' | 'admin' | 'manual'): Promise<void> {
    if (this.isBuilding) {
      logger.warn('[Scheduler] Build already in progress, skipping trigger')
      return
    }

    this.isBuilding = true
    const runId = crypto.randomUUID()
    logger.info(`[Scheduler] Starting recreation run ${runId} (reason: ${reason})`)

    try {
      // 1. Generate daily brief
      const brief = await new DailyBriefGenerator().generate()
      logger.info(`[Scheduler][${runId}] Brief generated: theme=${brief.theme}, bg=${brief.background}`)

      // 2. Build in background
      const worker = new BackgroundBuildWorker(runId, brief, this.config)
      const result = await worker.build()

      if (!result.success) {
        logger.error(`[Scheduler][${runId}] Build failed: ${result.error}`)
        return
      }

      if (result.lighthouseScore < this.config.lighthouseMinScore) {
        logger.warn(`[Scheduler][${runId}] Lighthouse score ${result.lighthouseScore} below minimum ${this.config.lighthouseMinScore}, skipping swap`)
        return
      }

      // 3. Notify clients if configured
      if (this.config.notifyMinutesBefore > 0) {
        await this.notifyClients('incoming', this.config.notifyMinutesBefore)
        await new Promise(r => setTimeout(r, this.config.notifyMinutesBefore * 60 * 1000))
      }

      // 4. Atomic swap
      await this.atomicSwap(runId)

      // 5. Signal refresh to all connected browsers
      await this.broadcastRefresh(brief)

      // 6. Compress previous site
      if (this.config.autoCompress) {
        await this.compressPrevious(runId, brief)
      }

      // 7. Log to DB
      this.logRun(runId, brief, result, reason)
      logger.info(`[Scheduler][${runId}] Recreation complete. New theme: ${brief.theme}`)

    } catch (err) {
      logger.error(`[Scheduler][${runId}] Recreation failed:`, err)
    } finally {
      this.isBuilding = false
    }
  }

  private async atomicSwap(runId: string): Promise<void> {
    const { execSync } = await import('child_process')
    const prev = `${this.config.currentDir}_prev_${runId}`
    // Atomic rename: current → prev, staging → current
    execSync(`mv ${this.config.currentDir} ${prev}`)
    execSync(`mv ${this.config.stagingDir} ${this.config.currentDir}`)
    logger.info(`[Scheduler][${runId}] Atomic swap complete`)
  }

  private async broadcastRefresh(brief: DailyBrief): Promise<void> {
    // POST to internal SSE broadcaster
    await fetch('http://localhost:3001/internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'site_refresh',
        theme: brief.theme,
        background: brief.background,
        message: 'New site is ready!',
      }),
    })
  }

  private async compressPrevious(runId: string, brief: DailyBrief): Promise<void> {
    const { execSync } = await import('child_process')
    const archive = join(this.config.archiveDir, `site_${brief.date}_${runId.slice(0, 8)}.tar.zst`)
    const prev = `${this.config.currentDir}_prev_${runId}`
    execSync(`tar -I 'zstd -T0 -19' -cf ${archive} -C ${prev} .`)
    execSync(`rm -rf ${prev}`)
    logger.info(`[Scheduler][${runId}] Compressed previous site → ${archive}`)
  }

  // Update config from admin UI — persisted to DB
  updateConfig(patch: Partial<SchedulerConfig>): void {
    Object.assign(this.config, patch)
    this.saveConfigToDB()
    // Restart cron with new time
    this.job?.stop()
    this.start()
    logger.info('[Scheduler] Config updated:', patch)
  }

  private loadConfigFromDB(): Partial<SchedulerConfig> {
    try {
      const row = DB.prepare('SELECT value FROM settings WHERE key=?').get('scheduler_config') as any
      return row ? JSON.parse(row.value) : {}
    } catch { return {} }
  }

  private saveConfigToDB(): void {
    DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'scheduler_config', JSON.stringify(this.config)
    )
  }

  private logRun(runId: string, brief: any, result: any, reason: string): void {
    DB.prepare(`
      INSERT INTO daily_recreation_log (run_id, date, theme, background, lighthouse_score, build_time_ms, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(runId, brief.date, brief.theme, brief.background, result.lighthouseScore, result.buildTimeMs, reason)
  }
}
```

### 11.3 Admin Settings UI — Scheduler Control

```typescript
// app/admin/scheduler/page.tsx
'use client'
import { useState, useEffect } from 'react'

export default function SchedulerAdmin() {
  const [config, setConfig] = useState<any>(null)
  const [building, setBuilding] = useState(false)
  const [log, setLog] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/scheduler').then(r => r.json()).then(setConfig)
    fetch('/api/admin/scheduler/log').then(r => r.json()).then(setLog)
  }, [])

  async function triggerNow() {
    setBuilding(true)
    await fetch('/api/admin/scheduler/trigger', { method: 'POST' })
    setBuilding(false)
  }

  async function saveConfig() {
    await fetch('/api/admin/scheduler', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
  }

  if (!config) return <div className="p-8 text-white">Loading...</div>

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">⚙️ Daily Recreation Scheduler</h1>

      <div className="grid grid-cols-2 gap-8">
        {/* Config panel */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Schedule Settings</h2>

          <label className="block mb-4">
            <span className="text-gray-400 text-sm">Recreation Time (Cron)</span>
            <input
              type="text"
              value={config.recreationTime}
              onChange={e => setConfig({ ...config, recreationTime: e.target.value })}
              className="w-full mt-1 bg-gray-700 rounded-lg px-4 py-2 font-mono"
              placeholder="0 3 * * *"
            />
            <span className="text-xs text-gray-500 mt-1 block">
              Default: "0 3 * * *" = 3:00 AM daily
            </span>
          </label>

          <label className="block mb-4">
            <span className="text-gray-400 text-sm">Timezone</span>
            <select
              value={config.timezone}
              onChange={e => setConfig({ ...config, timezone: e.target.value })}
              className="w-full mt-1 bg-gray-700 rounded-lg px-4 py-2"
            >
              {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','UTC'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig({ ...config, enabled: e.target.checked })}
              className="w-5 h-5"
            />
            <span>Auto-recreation enabled</span>
          </label>

          <label className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              checked={config.autoCompress}
              onChange={e => setConfig({ ...config, autoCompress: e.target.checked })}
              className="w-5 h-5"
            />
            <span>Auto-compress previous site</span>
          </label>

          <label className="block mb-6">
            <span className="text-gray-400 text-sm">Minimum Lighthouse Score</span>
            <input
              type="number"
              min="0" max="100"
              value={config.lighthouseMinScore}
              onChange={e => setConfig({ ...config, lighthouseMinScore: parseInt(e.target.value) })}
              className="w-full mt-1 bg-gray-700 rounded-lg px-4 py-2"
            />
          </label>

          <div className="flex gap-3">
            <button onClick={saveConfig} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg font-bold">
              Save Settings
            </button>
            <button
              onClick={triggerNow}
              disabled={building}
              className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              {building ? '⚙️ Building...' : '▶ Generate Now'}
            </button>
          </div>
        </div>

        {/* Recent runs log */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Recent Recreation Runs</h2>
          <div className="space-y-3">
            {log.map((run: any) => (
              <div key={run.run_id} className="bg-gray-700 rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-green-400">{run.date}</span>
                    <span className="text-gray-400 ml-2">{run.theme}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    run.reason === 'admin' ? 'bg-orange-500/30 text-orange-300'
                    : 'bg-blue-500/30 text-blue-300'
                  }`}>{run.reason}</span>
                </div>
                <div className="text-gray-400 mt-1">
                  Lighthouse: <span className={run.lighthouse_score >= 90 ? 'text-green-400' : 'text-yellow-400'}>{run.lighthouse_score}</span>
                  {' · '}Build: {(run.build_time_ms / 1000).toFixed(1)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 11.4 Client-Side Refresh Listener

Browsers get a soft refresh signal via SSE — no jarring full reload. Instead, a toast appears and Next.js router refresh is called which swaps in new content without losing scroll position.

```typescript
// components/SiteRefreshListener.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function SiteRefreshListener() {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/events/site')

    es.addEventListener('site_refresh', (e) => {
      const data = JSON.parse(e.data)
      setPending(data.theme)
      toast(`✨ New site ready! Theme: ${data.theme}`, {
        action: {
          label: 'Refresh Now',
          onClick: () => {
            router.refresh()
            setPending(null)
          },
        },
        duration: 30000,
      })
    })

    return () => es.close()
  }, [router])

  return null
}
```

### 11.5 DailyBriefGenerator — Diversity Engine

The brief generator enforces **diversity** — no two consecutive sites share the same design style, color palette, layout type, or framework pattern.

```typescript
// lib/daily/DailyBriefGenerator.ts
export interface DailyBrief {
  date: string              // "2026-02-20"
  theme: string             // "Zen Garden"
  background: string        // scene key
  colorPalette: string      // "earthy-neutrals"
  layoutStyle: string       // "editorial" | "hero-centered" | "grid-magazine" | ...
  typography: string        // "serif-display" | "mono-tech" | "humanist-sans" | ...
  animationStyle: string    // "minimal" | "kinetic" | "particle-heavy" | "scroll-reveal"
  industryFocus: string     // "tech" | "nature" | "art" | "science" | "culture" | ...
  accentMood: string        // "calm" | "energetic" | "mysterious" | "playful" | "luxury"
  generationPrompt: string  // full LLM prompt for site generation
}

// 10 diversity axes — no consecutive repeat allowed
const DIVERSITY_AXES = {
  colorPalette: ['vibrant-neon','earthy-neutrals','ocean-blues','forest-greens',
    'monochrome','pastel-dreams','sunset-gradient','deep-space','desert-sand','arctic-ice'],
  layoutStyle: ['hero-centered','grid-magazine','editorial-columns','asymmetric-split',
    'scroll-story','full-screen-sections','card-mosaic','sidebar-nav','immersive-full','minimal-focus'],
  typography: ['serif-display','mono-tech','humanist-sans','condensed-bold',
    'elegant-thin','variable-weight','retro-display','geometric-sans'],
  animationStyle: ['minimal-fade','kinetic-scroll','particle-heavy','3d-perspective',
    'liquid-morph','typewriter','draw-on-scroll','stagger-reveal'],
  industryFocus: ['tech-startup','nature-ecology','fine-art','space-science',
    'gastronomy','architecture','music','fashion','sports','education'],
  accentMood: ['calm-meditative','high-energy','mysterious-dark','playful-fun',
    'luxury-premium','nostalgic-retro','futuristic','organic-natural'],
}

export class DailyBriefGenerator {
  async generate(): Promise<DailyBrief> {
    const today = new Date().toISOString().slice(0, 10)
    const prev = this.getRecentHistory(7)

    // Pick values that haven't appeared in last 7 days
    const palette = this.pickFresh('colorPalette', prev)
    const layout = this.pickFresh('layoutStyle', prev)
    const typography = this.pickFresh('typography', prev)
    const animation = this.pickFresh('animationStyle', prev)
    const industry = this.pickFresh('industryFocus', prev)
    const mood = this.pickFresh('accentMood', prev)
    const background = this.pickBackground(mood, industry)

    const theme = await this.generateThemeName(palette, mood, industry)
    const prompt = this.buildGenerationPrompt({ palette, layout, typography, animation, industry, mood, background, theme })

    const brief: DailyBrief = {
      date: today, theme, background,
      colorPalette: palette, layoutStyle: layout,
      typography, animationStyle: animation,
      industryFocus: industry, accentMood: mood,
      generationPrompt: prompt,
    }

    this.saveBrief(brief)
    return brief
  }

  private pickFresh(axis: keyof typeof DIVERSITY_AXES, history: DailyBrief[]): string {
    const used = new Set(history.map(h => (h as any)[axis]))
    const options = DIVERSITY_AXES[axis].filter(v => !used.has(v))
    const pool = options.length > 0 ? options : DIVERSITY_AXES[axis]
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private pickBackground(mood: string, industry: string): string {
    const moodToScene: Record<string, string[]> = {
      'calm-meditative': ['ocean_calm','forest_dawn','zen_garden','northern_lights'],
      'high-energy': ['supernova','independence_4th','arcade_neon','storm_lightning'],
      'mysterious-dark': ['deep_space','halloween','galaxy_core','noir_rain'],
      'playful-fun': ['coral_reef','easter','carnival_lights','bubbly_spheres'],
      'luxury-premium': ['nebula_bloom','aurora_curtain','crystal_cave','silk_waves'],
      'futuristic': ['binary_star','matrix_rain','circuit_pulse','neon_grid'],
      'organic-natural': ['forest_rain','autumn_leaves','spring_flowers','mountain_mist'],
    }
    const pool = moodToScene[mood] ?? ['starfield_parallax']
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private buildGenerationPrompt(spec: Record<string, string>): string {
    return `Generate a SOTA ${spec.industry} website with these exact specifications:

VISUAL DESIGN:
- Color palette: ${spec.palette} — define 5 specific hex values and their usage
- Layout: ${spec.layout} — this must be the primary structural pattern
- Typography: ${spec.typography} — choose 2 Google Fonts that embody this
- Animation style: ${spec.animation} — every major section must use this pattern
- Mood: ${spec.mood} — every design decision should reinforce this feeling
- Theme: ${spec.theme}
- Background: ${spec.background} (from DaveAI theme engine)

QUALITY REQUIREMENTS:
- Lighthouse performance ≥ 90, accessibility ≥ 95
- 8+ distinct page sections, each with unique design
- GSAP ScrollTrigger for all scroll animations
- Framer Motion for component micro-interactions
- Minimum 3 CSS custom property animation systems
- One WebGL or Canvas 2D hero element
- Responsive: mobile, tablet, desktop
- Dark/light mode with CSS custom properties

CONTENT:
- Fictional but realistic ${spec.industry} brand
- 500+ words of copy total across all sections
- 6+ realistic testimonials/stats/case studies
- Complete navigation, hero, features, social proof, CTA, footer

OUTPUT FORMAT:
Return complete Next.js 15 App Router project as file tree with full file contents.`
  }

  private async generateThemeName(palette: string, mood: string, industry: string): Promise<string> {
    // Quick LLM call for creative theme name
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Generate a 2-3 word creative theme name for a website with: palette="${palette}", mood="${mood}", industry="${industry}". Reply with ONLY the name, nothing else.`
      }]
    })
    return (msg.content[0] as any).text.trim()
  }

  private getRecentHistory(days: number): DailyBrief[] {
    const DB = require('better-sqlite3')(require('path').join(process.cwd(), '..', 'zeroclaw.db'))
    const rows = DB.prepare('SELECT brief_json FROM daily_briefs ORDER BY date DESC LIMIT ?').all(days) as any[]
    DB.close()
    return rows.map(r => JSON.parse(r.brief_json))
  }

  private saveBrief(brief: DailyBrief): void {
    const DB = require('better-sqlite3')(require('path').join(process.cwd(), '..', 'zeroclaw.db'))
    DB.prepare('INSERT OR REPLACE INTO daily_briefs (date, brief_json) VALUES (?, ?)').run(brief.date, JSON.stringify(brief))
    DB.close()
  }
}
```

---

## Section 12: Agentic Background Generation Pipeline

### 12.1 AgentGeneratedBackground Schema

```typescript
// lib/backgrounds/agentic/AgentGeneratedBackground.ts
export interface AgentGeneratedBackground {
  id: string
  name: string
  description: string
  sceneType: SceneType
  generatedAt: Date
  agentModel: string
  generationPrompt: string

  // The actual code written by the agent
  canvasCode: string          // complete React component source
  shaderCode?: string         // optional GLSL fragment shader
  cssVariables: Record<string, string>

  // Metadata for the system
  commitVisual: CommitVisualConfig
  interactionMode: 'mouse_parallax' | 'mouse_repel' | 'mouse_attract' | 'touch_ripple' | 'none'
  performanceTier: 'low' | 'medium' | 'high'
  prefersDarkMode: boolean
  tags: string[]

  // Validation results
  validatedAt?: Date
  performanceScore?: number
  accessibilityPass?: boolean
}

export interface CommitVisualConfig {
  particleType: string         // "comet" | "bubble" | "leaf" | "bat" | "snowflake" | "sparkle"
  color: string
  size: number
  duration: number
  trailEffect: string         // "gradient_fade" | "particle_burst" | "ripple" | "none"
}
```

### 12.2 Five-Step Agentic Generation Pipeline

```typescript
// lib/backgrounds/agentic/AgentBackgroundPipeline.ts
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '@/lib/logger'

const client = new Anthropic()

export async function generateAgentBackground(
  request: { theme: string; mood: string; season?: string; holiday?: string }
): Promise<AgentGeneratedBackground> {
  const pipelineId = crypto.randomUUID()
  logger.info(`[AgentBg][${pipelineId}] Starting 5-step pipeline for: ${JSON.stringify(request)}`)

  // ── STEP 1: Scene Design ──────────────────────────────────────────
  logger.debug(`[AgentBg][${pipelineId}] Step 1: Scene design`)
  const sceneDesign = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: 'You are a creative director for interactive web backgrounds. Design a scene concept.',
    messages: [{
      role: 'user',
      content: `Design an interactive animated background scene for: theme="${request.theme}", mood="${request.mood}"${request.holiday ? `, holiday="${request.holiday}"` : ''}.
      
      Return JSON only:
      {
        "sceneType": "<type>",
        "name": "<creative name>",
        "description": "<2 sentence description>",
        "elements": ["<element1>", "<element2>", ...],
        "interactionMode": "<mode>",
        "performanceTier": "<low|medium|high>",
        "commitParticle": "<type>",
        "commitColor": "<hex>",
        "colorScheme": {"bg": "<hex>", "primary": "<hex>", "accent": "<hex>"}
      }`
    }]
  })

  const design = JSON.parse((sceneDesign.content[0] as any).text)
  logger.debug(`[AgentBg][${pipelineId}] Step 1 complete: ${design.name}`)

  // ── STEP 2: Canvas Code Generation ───────────────────────────────
  logger.debug(`[AgentBg][${pipelineId}] Step 2: Canvas code generation`)
  const canvasCode = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    system: `You are an expert Canvas 2D / WebGL developer. Write complete, working React components.
    Requirements:
    - 'use client' directive
    - useEffect with proper cleanup (cancelAnimationFrame, removeEventListener)
    - useRef for canvas
    - Mouse/touch interaction via useCallback
    - Respects prefers-reduced-motion
    - OffscreenCanvas for web worker on high performance tier
    - All TypeScript, strict types
    Output ONLY the complete component code, no explanation.`,
    messages: [{
      role: 'user',
      content: `Write a complete React TypeScript Canvas 2D component for this background scene:
      
      Scene: ${design.name}
      Elements: ${design.elements.join(', ')}
      Color scheme: bg=${design.colorScheme.bg}, primary=${design.colorScheme.primary}, accent=${design.colorScheme.accent}
      Interaction: ${design.interactionMode}
      Performance: ${design.performanceTier}
      Commit particle: type=${design.commitParticle}, color=${design.commitColor}
      
      The component must accept an onCommit subscription prop and render commit particles when triggered.
      Component name: ${design.name.replace(/\s+/g, '')}Scene`
    }]
  })

  const generatedCode = (canvasCode.content[0] as any).text
  logger.debug(`[AgentBg][${pipelineId}] Step 2 complete: ${generatedCode.length} chars`)

  // ── STEP 3: Optional GLSL Shader ─────────────────────────────────
  let shaderCode: string | undefined
  if (design.performanceTier === 'high' && request.mood !== 'calm-meditative') {
    logger.debug(`[AgentBg][${pipelineId}] Step 3: GLSL shader generation`)
    const shader = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: 'Write GLSL fragment shaders for WebGL backgrounds. Output ONLY the shader code.',
      messages: [{
        role: 'user',
        content: `Write a GLSL fragment shader for: ${design.description}
        Should complement these colors: ${JSON.stringify(design.colorScheme)}
        Include: uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse;
        Create atmospheric/ambient effect that tiles seamlessly.`
      }]
    })
    shaderCode = (shader.content[0] as any).text
    logger.debug(`[AgentBg][${pipelineId}] Step 3 complete`)
  }

  // ── STEP 4: Validation ────────────────────────────────────────────
  logger.debug(`[AgentBg][${pipelineId}] Step 4: Code validation`)
  const validation = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Review this React Canvas component for bugs, memory leaks, and missing cleanup:
      
      ${generatedCode.slice(0, 3000)}
      
      Return JSON: { "valid": boolean, "issues": string[], "fixes": string[] }`
    }]
  })

  const validationResult = JSON.parse((validation.content[0] as any).text)
  logger.debug(`[AgentBg][${pipelineId}] Step 4: valid=${validationResult.valid}, issues=${validationResult.issues.length}`)

  // ── STEP 5: Store & Register ──────────────────────────────────────
  const bg: AgentGeneratedBackground = {
    id: pipelineId,
    name: design.name,
    description: design.description,
    sceneType: design.sceneType,
    generatedAt: new Date(),
    agentModel: 'claude-opus-4-5',
    generationPrompt: JSON.stringify(request),
    canvasCode: generatedCode,
    shaderCode,
    cssVariables: {
      '--bg-primary': design.colorScheme.bg,
      '--bg-accent': design.colorScheme.primary,
      '--bg-highlight': design.colorScheme.accent,
    },
    commitVisual: {
      particleType: design.commitParticle,
      color: design.commitColor,
      size: 8,
      duration: 3000,
      trailEffect: 'gradient_fade',
    },
    interactionMode: design.interactionMode,
    performanceTier: design.performanceTier,
    prefersDarkMode: true,
    tags: [request.theme, request.mood, request.holiday ?? 'general'],
    validatedAt: new Date(),
    accessibilityPass: validationResult.valid,
  }

  logger.info(`[AgentBg][${pipelineId}] Pipeline complete: "${bg.name}" (${bg.sceneType})`)
  return bg
}
```

---

## Section 13: Performance & Accessibility

### 13.1 Required Global CSS

```css
/* app/globals.css — background system additions */

/* Reduced motion — static fallback for all animated backgrounds */
@media (prefers-reduced-motion: reduce) {
  canvas.bg-canvas {
    animation: none !important;
    transition: none !important;
  }
  .bg-static-fallback {
    display: block !important;
  }
  .bg-animated-layer {
    display: none !important;
  }
}

/* Background canvas base */
canvas.bg-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -10;
  will-change: transform;
  image-rendering: pixelated; /* for Canvas 2D crisp rendering */
}

/* Crossfade transition between backgrounds */
.bg-transition-enter {
  opacity: 0;
  transition: opacity 1500ms ease-in-out;
}
.bg-transition-enter-active {
  opacity: 1;
}
.bg-transition-exit {
  opacity: 1;
  transition: opacity 1500ms ease-in-out;
}
.bg-transition-exit-active {
  opacity: 0;
}

/* Performance tiers — reduce particles on low-end */
[data-perf="low"] canvas.bg-canvas {
  image-rendering: auto;
  filter: none;
}
```

### 13.2 Device Capability Detection

```typescript
// lib/backgrounds/deviceCapability.ts
export type PerformanceTier = 'low' | 'medium' | 'high'

export function detectPerformanceTier(): PerformanceTier {
  // Check for reduced motion preference first
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low'

  // Hardware concurrency
  const cores = navigator.hardwareConcurrency ?? 2
  if (cores <= 2) return 'low'
  if (cores <= 4) return 'medium'

  // Memory (Chrome only)
  const memory = (navigator as any).deviceMemory ?? 4
  if (memory < 2) return 'low'
  if (memory < 4) return 'medium'

  // WebGL availability
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return 'medium'
    const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (ext) {
      const renderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL) as string
      if (renderer.includes('SwiftShader') || renderer.includes('Software')) return 'low'
    }
  } catch { return 'medium' }

  return 'high'
}

// Apply tier to document root for CSS targeting
export function applyPerformanceTier(tier: PerformanceTier): void {
  document.documentElement.dataset.perf = tier
  document.documentElement.dataset.webgl = String(isWebGLAvailable())
}

function isWebGLAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch { return false }
}
```

### 13.3 Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| Canvas FPS | ≥ 55fps (high tier), ≥ 30fps (low tier) | requestAnimationFrame delta |
| First Paint | < 800ms | Chrome DevTools |
| LCP | < 2.5s | Lighthouse |
| Memory usage | < 50MB per background | Chrome Memory panel |
| JS bundle (bg system) | < 80KB gzipped | next build analyzer |
| WebGL context lost | Handled with restore | `webglcontextlost` event |

---

## Section 14: Quality Gates & Visual Checklist

### 14.1 Visual Quality Checklist

```typescript
// lib/quality/VisualChecklist.ts
import { logger } from '@/lib/logger'

export const VISUAL_QUALITY_CHECKLIST = [
  // Background
  { id: 'bg_moves',        label: 'Background has motion/animation',           required: true },
  { id: 'bg_interactive',  label: 'Background responds to mouse/touch',         required: false },
  { id: 'bg_commits',      label: 'Commit particles appear on commit event',    required: true },
  { id: 'bg_crossfade',    label: 'Background transition uses 1.5s crossfade', required: true },
  { id: 'bg_reduced',      label: 'Static fallback for prefers-reduced-motion', required: true },

  // Layout
  { id: 'layout_sections', label: '8+ distinct content sections',              required: true },
  { id: 'layout_nav',      label: 'Navigation present and functional',          required: true },
  { id: 'layout_footer',   label: 'Footer with complete links',                required: true },
  { id: 'layout_hero',     label: 'Hero section with clear CTA',               required: true },

  // Typography
  { id: 'type_hierarchy',  label: 'Clear H1 > H2 > body hierarchy',            required: true },
  { id: 'type_readable',   label: 'Body text ≥ 16px, line-height ≥ 1.5',      required: true },
  { id: 'type_contrast',   label: 'WCAG AA contrast ratios (4.5:1 min)',        required: true },

  // Animation
  { id: 'anim_scroll',     label: 'Scroll-triggered animations on sections',   required: true },
  { id: 'anim_hover',      label: 'Hover micro-interactions on interactive els', required: false },
  { id: 'anim_load',       label: 'Page load entrance animation',              required: false },

  // Stats widget
  { id: 'widget_clock',    label: 'Live clock ticking every second',           required: true },
  { id: 'widget_sites',    label: 'Total sites count visible',                 required: true },
  { id: 'widget_agents',   label: 'Active agent count updates via SSE',        required: true },

  // Responsive
  { id: 'resp_mobile',     label: 'Mobile layout (375px) fully functional',    required: true },
  { id: 'resp_tablet',     label: 'Tablet layout (768px) properly structured', required: true },
  { id: 'resp_desktop',    label: 'Desktop (1440px) optimal layout',           required: true },
]

export interface ChecklistResult {
  passed: string[]
  failed: string[]
  warnings: string[]
  score: number          // 0-100
  requiredPass: boolean  // all required items passed
}

export async function runVisualChecklist(url: string): Promise<ChecklistResult> {
  logger.info(`[QualityGate] Running visual checklist for: ${url}`)

  const results: ChecklistResult = {
    passed: [], failed: [], warnings: [], score: 0, requiredPass: false,
  }

  // In production: use Playwright to check each item
  // This is the schema — actual checks are Playwright scripts
  const requiredItems = VISUAL_QUALITY_CHECKLIST.filter(c => c.required)
  const optionalItems = VISUAL_QUALITY_CHECKLIST.filter(c => !c.required)

  // Run Lighthouse
  const { default: lighthouse } = await import('lighthouse')
  const { default: chromeLauncher } = await import('chrome-launcher')

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless','--no-sandbox'] })
  const lhResult = await lighthouse(url, { port: chrome.port, logLevel: 'error' })
  await chrome.kill()

  const lhScores = lhResult?.lhr.categories
  const perfScore = Math.round((lhScores?.performance?.score ?? 0) * 100)
  const a11yScore = Math.round((lhScores?.accessibility?.score ?? 0) * 100)

  logger.info(`[QualityGate] Lighthouse: perf=${perfScore}, a11y=${a11yScore}`)

  results.score = Math.round((perfScore + a11yScore) / 2)

  if (perfScore < 90) results.failed.push(`lighthouse_performance: ${perfScore} < 90`)
  else results.passed.push(`lighthouse_performance: ${perfScore}`)

  if (a11yScore < 95) results.failed.push(`lighthouse_accessibility: ${a11yScore} < 95`)
  else results.passed.push(`lighthouse_accessibility: ${a11yScore}`)

  results.requiredPass = results.failed.filter(f =>
    VISUAL_QUALITY_CHECKLIST.find(c => c.required && f.includes(c.id))
  ).length === 0

  logger.info(`[QualityGate] Complete: score=${results.score}, requiredPass=${results.requiredPass}`)
  return results
}
```

### 14.2 Logging System

All background/theme/scheduler operations use a structured logger.

```typescript
// lib/logger.ts
import pino from 'pino'
import { join } from 'path'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: {
    targets: [
      // Console — pretty in dev, JSON in prod
      {
        target: process.env.NODE_ENV === 'development' ? 'pino-pretty' : 'pino/file',
        options: process.env.NODE_ENV === 'development'
          ? { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' }
          : { destination: join(process.cwd(), '..', 'logs', 'daveai.log') },
        level: 'info',
      },
      // Error log — separate file
      {
        target: 'pino/file',
        options: { destination: join(process.cwd(), '..', 'logs', 'errors.log') },
        level: 'error',
      },
    ],
  },
})

// Subsystem child loggers
export const themeLogger = logger.child({ system: 'theme-engine' })
export const bgLogger = logger.child({ system: 'background' })
export const schedulerLogger = logger.child({ system: 'scheduler' })
export const agentLogger = logger.child({ system: 'agent-bg' })
export const statsLogger = logger.child({ system: 'stats' })
export const arcadeLogger = logger.child({ system: 'arcade' })
```

### 14.3 DB Schema Additions for Theme Engine

```sql
-- migrations/004_theme_engine.sql

CREATE TABLE IF NOT EXISTS daily_briefs (
  date          TEXT PRIMARY KEY,
  brief_json    TEXT NOT NULL,
  created_at    DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_recreation_log (
  run_id            TEXT PRIMARY KEY,
  date              TEXT NOT NULL,
  theme             TEXT NOT NULL,
  background        TEXT NOT NULL,
  lighthouse_score  INTEGER,
  build_time_ms     INTEGER,
  reason            TEXT DEFAULT 'scheduled',
  created_at        DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_backgrounds (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  scene_type      TEXT NOT NULL,
  canvas_code     TEXT NOT NULL,
  shader_code     TEXT,
  metadata_json   TEXT NOT NULL,
  generated_at    DATETIME DEFAULT (datetime('now')),
  validated       INTEGER DEFAULT 0,
  perf_score      INTEGER
);

CREATE TABLE IF NOT EXISTS weekend_games (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  genre           TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  metadata_json   TEXT NOT NULL,
  generated_at    DATETIME DEFAULT (datetime('now')),
  times_played    INTEGER DEFAULT 0,
  high_score      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_archives (
  id              TEXT PRIMARY KEY,
  run_id          TEXT NOT NULL,
  date            TEXT NOT NULL,
  archive_path    TEXT NOT NULL,
  size_bytes      INTEGER,
  compression_ratio REAL,
  theme           TEXT,
  archived_at     DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_briefs_date ON daily_briefs(date);
CREATE INDEX IF NOT EXISTS idx_recreation_log_date ON daily_recreation_log(date);
CREATE INDEX IF NOT EXISTS idx_site_archives_date ON site_archives(date);
```

---

## Section 15: Document Summary & File Map

### 15.1 All Files Created/Modified by Theme Engine

```
zeroclaw/
├── docs/
│   ├── daveai-theme-engine.md          ← THIS FILE
│   └── daveai-master-plan.md           ← Phase 1 plan
│
├── app/
│   ├── api/
│   │   ├── commits/stream/route.ts     ← Git commit SSE stream
│   │   ├── stats/stream/route.ts       ← Stats SSE stream
│   │   ├── events/site/route.ts        ← Site refresh SSE
│   │   ├── weekend/
│   │   │   ├── games/route.ts          ← List generated games
│   │   │   └── generate/route.ts       ← Generate new game
│   │   └── admin/scheduler/
│   │       ├── route.ts                ← GET/PATCH scheduler config
│   │       ├── trigger/route.ts        ← POST trigger recreation
│   │       └── log/route.ts            ← GET recreation history
│   └── admin/
│       └── scheduler/page.tsx          ← Admin scheduler UI
│
├── components/
│   ├── stats/
│   │   └── DaveAIStatsWidget.tsx       ← Live stats widget
│   ├── weekend/
│   │   └── ArcadePortal.tsx            ← Weekend arcade UI
│   └── SiteRefreshListener.tsx         ← Client refresh handler
│
├── lib/
│   ├── theme/
│   │   ├── ThemeConfig.ts              ← Types & ThemeConfig
│   │   ├── ThemeResolver.ts            ← Priority-based resolver
│   │   ├── BackgroundProvider.tsx      ← React context
│   │   └── BackgroundControls.tsx      ← User override panel
│   ├── backgrounds/
│   │   ├── holidayDetector.ts          ← Holiday detection engine
│   │   ├── deviceCapability.ts         ← Performance tier detection
│   │   ├── space/
│   │   │   ├── StarField.tsx           ← Parallax star field
│   │   │   ├── CommitComets.tsx        ← SSE commit comets
│   │   │   ├── Nebula.tsx              ← WebGL FBM nebula
│   │   │   ├── Planets.tsx             ← R3F 3D planets
│   │   │   └── Aurora.tsx              ← Aurora vertex shader
│   │   ├── ocean/
│   │   │   ├── useBoids.ts             ← Boids fish algorithm
│   │   │   ├── Jellyfish.tsx           ← Jellyfish canvas
│   │   │   ├── CoralReef.tsx           ← SVG coral branches
│   │   │   ├── Anemone.tsx             ← Interactive anemone
│   │   │   ├── SandBottom.tsx          ← Procedural sand
│   │   │   └── DayNightCycle.tsx       ← Ocean time context
│   │   ├── nature/
│   │   │   ├── FireworksSystem.ts      ← Multi-burst fireworks
│   │   │   └── BatsSystem.ts           ← Boids bats
│   │   ├── holidays/
│   │   │   ├── index.ts                ← Holiday scene registry
│   │   │   ├── HalloweenScene.tsx      ← Full Halloween
│   │   │   ├── ChristmasScene.tsx      ← Snowflakes + lights
│   │   │   ├── IndependenceScene.tsx   ← Fireworks + patriotic
│   │   │   ├── EasterScene.tsx         ← Floating eggs
│   │   │   ├── DiwaliScene.tsx         ← Diyas + particles
│   │   │   └── [10 more scenes]
│   │   └── agentic/
│   │       ├── AgentGeneratedBackground.ts ← Schema
│   │       └── AgentBackgroundPipeline.ts  ← 5-step pipeline
│   ├── daily/
│   │   ├── DailyBriefGenerator.ts      ← Diversity engine
│   │   ├── DailyRecreationScheduler.ts ← Cron scheduler
│   │   └── BackgroundBuildWorker.ts    ← Staging build runner
│   ├── weekend/
│   │   ├── WeekendModeEngine.ts        ← Mode detection
│   │   ├── GameGenerator.ts            ← LLM game generator
│   │   ├── TicketEconomy.ts            ← Ticket system
│   │   └── SundayRelaxation.ts         ← Sunday scene picker
│   ├── stats/
│   │   └── StatsCollector.ts           ← DB stats aggregator
│   ├── quality/
│   │   └── VisualChecklist.ts          ← Quality gates
│   └── logger.ts                       ← Structured pino logger
│
├── migrations/
│   └── 004_theme_engine.sql            ← DB schema additions
│
└── public/
    └── games/
        └── generated/                  ← Agent-generated game HTML files
```

### 15.2 Environment Variables Required

```bash
# .env.local — theme engine additions

# Anthropic (already in master plan)
ANTHROPIC_API_KEY=sk-ant-...

# Scheduler
RECREATION_CRON="0 3 * * *"
RECREATION_TIMEZONE="America/New_York"
STAGING_DIR="/var/www/zeroclaw/staging"
CURRENT_DIR="/var/www/zeroclaw/current"
ARCHIVE_DIR="/var/www/zeroclaw/archives"
LIGHTHOUSE_MIN_SCORE=90

# Logging
LOG_LEVEL=info
LOG_DIR="/var/www/zeroclaw/logs"
```

---

## Section 16: Package Dependencies

### 16.1 Complete package.json for Theme Engine

```json
{
  "name": "zeroclaw-site",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "node .next/standalone/server.js",
    "lint": "next lint",
    "migrate": "node scripts/migrate.js",
    "scheduler": "node scripts/scheduler.js"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@anthropic-ai/sdk": "^0.36.0",
    "better-sqlite3": "^11.7.0",
    "cron": "^3.1.7",
    "pino": "^9.5.0",
    "pino-pretty": "^13.0.0",
    "sonner": "^1.7.0",
    "zustand": "^5.0.3",
    "framer-motion": "^11.15.0",
    "gsap": "^3.12.5",
    "@react-three/fiber": "^8.17.10",
    "@react-three/drei": "^9.117.0",
    "three": "^0.171.0",
    "lenis": "^1.1.14",
    "@tsparticles/react": "^3.0.0",
    "@tsparticles/slim": "^3.7.1",
    "chrome-launcher": "^1.1.2",
    "lighthouse": "^12.2.1",
    "zod": "^3.24.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.3",
    "@types/react-dom": "^19.0.2",
    "@types/better-sqlite3": "^7.6.12",
    "@types/three": "^0.171.0",
    "typescript": "^5.7.3",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "eslint": "^9.17.0",
    "eslint-config-next": "15.1.0"
  }
}
```

### 16.2 next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    turbo: {
      rules: {
        '*.glsl': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.frag': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
        '*.vert': {
          loaders: ['raw-loader'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    {
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|frag|vert)$/,
      use: 'raw-loader',
    })
    return config
  },
}

export default nextConfig
```

### 16.3 tailwind.config.ts

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
```

### 16.4 app/layout.tsx — Root Layout with Theme Engine

```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BackgroundProvider } from '@/lib/theme/BackgroundProvider'
import { DaveAIStatsWidget } from '@/components/stats/DaveAIStatsWidget'
import { SiteRefreshListener } from '@/components/SiteRefreshListener'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DaveAI — Generated by ZeroClaw',
  description: 'A SOTA website created by autonomous AI agents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <BackgroundProvider>
          {/* Animated background canvas renders behind everything */}
          {children}
          <DaveAIStatsWidget />
          <SiteRefreshListener />
          <Toaster position="bottom-left" theme="dark" richColors />
        </BackgroundProvider>
      </body>
    </html>
  )
}
```

### 16.5 app/globals.css — Complete Background System CSS

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Background Canvas System ────────────────────────────── */

canvas.bg-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -10;
  will-change: transform;
  pointer-events: none;
}

/* Interactive canvases need pointer events */
canvas.bg-canvas.interactive {
  pointer-events: auto;
}

/* Crossfade transitions between backgrounds */
.bg-transition-enter {
  opacity: 0;
}
.bg-transition-enter-active {
  opacity: 1;
  transition: opacity 1500ms ease-in-out;
}
.bg-transition-exit {
  opacity: 1;
}
.bg-transition-exit-active {
  opacity: 0;
  transition: opacity 1500ms ease-in-out;
}

/* ─── Reduced Motion ────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  canvas.bg-canvas {
    display: none !important;
  }
  .bg-static-fallback {
    display: block !important;
    position: fixed;
    inset: 0;
    z-index: -10;
  }
  .bg-animated-layer {
    display: none !important;
  }
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ─── Performance Tiers ─────────────────────────────────────── */

[data-perf="low"] canvas.bg-canvas {
  image-rendering: auto;
}

[data-perf="high"] canvas.bg-canvas {
  image-rendering: pixelated;
}

/* ─── Stats Widget ──────────────────────────────────────────── */

.stats-widget {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

/* ─── Arcade Portal ─────────────────────────────────────────── */

.arcade-portal {
  background: radial-gradient(ellipse at center, #1a0a2e 0%, #0a0010 100%);
}

/* ─── Admin Panel ───────────────────────────────────────────── */

.admin-sidebar {
  background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
  border-right: 1px solid rgba(255,255,255,0.05);
}

/* ─── Scrollbar Styling ─────────────────────────────────────── */

:root {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.35);
}

/* ─── Background Override Panel ─────────────────────────────── */

.bg-controls-panel {
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(0, 0, 0, 0.75);
  border-top: 1px solid rgba(255,255,255,0.08);
}

.bg-controls-thumbnail {
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, transform 0.2s;
}

.bg-controls-thumbnail:hover {
  transform: scale(1.05);
}

.bg-controls-thumbnail.active {
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96,165,250,0.3);
}

/* ─── Toast Notifications ───────────────────────────────────── */

.site-refresh-toast {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* ─── TimeWarp Preview Frame ────────────────────────────────── */

.timewarp-frame {
  border: none;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.8);
}
```

---

## Section 17: BackgroundProvider — Complete Implementation

```typescript
// lib/theme/BackgroundProvider.tsx
'use client'
import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode
} from 'react'
import { resolveTheme, type ResolvedTheme } from './ThemeResolver'
import { detectPerformanceTier, applyPerformanceTier } from '@/lib/backgrounds/deviceCapability'
import type { SceneType, UserThemePreferences } from './ThemeConfig'

interface BackgroundContextValue {
  currentScene: SceneType
  currentVariant: string
  resolvedTheme: ResolvedTheme | null
  performanceTier: 'low' | 'medium' | 'high'
  setUserOverride: (scene: SceneType | null, variant?: string) => void
  onCommit: (cb: () => void) => () => void   // subscribe to commit events
  preferences: UserThemePreferences
  updatePreferences: (patch: Partial<UserThemePreferences>) => void
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

const PREFS_KEY = 'daveai_theme_prefs'

function loadPreferences(): UserThemePreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    interactionEnabled: true,
    opacity: 1,
    savedAt: Date.now(),
  }
}

function savePreferences(prefs: UserThemePreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, savedAt: Date.now() }))
  } catch {}
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [resolved, setResolved] = useState<ResolvedTheme | null>(null)
  const [prefs, setPrefs] = useState<UserThemePreferences>({
    reducedMotion: false,
    interactionEnabled: true,
    opacity: 1,
    savedAt: 0,
  })
  const [perfTier, setPerfTier] = useState<'low' | 'medium' | 'high'>('medium')
  const commitListeners = useRef<Set<() => void>>(new Set())

  // Initialize
  useEffect(() => {
    const loadedPrefs = loadPreferences()
    setPrefs(loadedPrefs)

    const tier = detectPerformanceTier()
    setPerfTier(tier)
    applyPerformanceTier(tier)

    const theme = resolveTheme(loadedPrefs)
    setResolved(theme)

    // Midnight re-selection
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight.getTime() - now.getTime()
    const midnightTimer = setTimeout(() => {
      setResolved(resolveTheme(loadedPrefs))
    }, msUntilMidnight)

    // Listen for commit SSE events to notify subscribers
    const es = new EventSource('/api/commits/stream')
    es.onmessage = () => {
      commitListeners.current.forEach(cb => cb())
    }

    return () => {
      clearTimeout(midnightTimer)
      es.close()
    }
  }, [])

  const setUserOverride = useCallback((scene: SceneType | null, variant = 'default') => {
    setPrefs(prev => {
      const updated = { ...prev, overrideScene: scene ?? undefined, overrideVariant: variant }
      savePreferences(updated)
      setResolved(resolveTheme(updated))
      return updated
    })
  }, [])

  const onCommit = useCallback((cb: () => void) => {
    commitListeners.current.add(cb)
    return () => commitListeners.current.delete(cb)
  }, [])

  const updatePreferences = useCallback((patch: Partial<UserThemePreferences>) => {
    setPrefs(prev => {
      const updated = { ...prev, ...patch }
      savePreferences(updated)
      if (patch.overrideScene !== undefined) {
        setResolved(resolveTheme(updated))
      }
      return updated
    })
  }, [])

  return (
    <BackgroundContext.Provider value={{
      currentScene: resolved?.scene ?? 'starfield_parallax',
      currentVariant: resolved?.variant ?? 'default',
      resolvedTheme: resolved,
      performanceTier: perfTier,
      setUserOverride,
      onCommit,
      preferences: prefs,
      updatePreferences,
    }}>
      <ActiveBackground scene={resolved?.scene} tier={perfTier} prefs={prefs} />
      {children}
    </BackgroundContext.Provider>
  )
}

// Dynamic background loader
function ActiveBackground({
  scene, tier, prefs
}: {
  scene?: SceneType
  tier: 'low' | 'medium' | 'high'
  prefs: UserThemePreferences
}) {
  if (!scene || prefs.reducedMotion) {
    return <div className="bg-static-fallback bg-gray-950" />
  }

  // Map scene to component — lazy loaded
  return <SceneRenderer scene={scene} tier={tier} />
}

function SceneRenderer({ scene, tier }: { scene: SceneType; tier: string }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    const SCENE_IMPORTS: Partial<Record<SceneType, () => Promise<{ default: React.ComponentType }>>> = {
      starfield_parallax: () => import('@/lib/backgrounds/space/StarField').then(m => ({ default: m.StarField as any })),
      nebula_bloom: () => import('@/lib/backgrounds/space/Nebula').then(m => ({ default: m.Nebula as any })),
      coral_reef: () => import('@/lib/backgrounds/ocean/CoralReef').then(m => ({ default: m.CoralReef as any })),
      ocean_calm: () => import('@/lib/backgrounds/ocean/Jellyfish').then(m => ({ default: m.Jellyfish as any })),
      halloween: () => import('@/lib/backgrounds/holidays/HalloweenScene').then(m => ({ default: m.HalloweenScene as any })),
      christmas: () => import('@/lib/backgrounds/holidays/ChristmasScene').then(m => ({ default: m.ChristmasScene as any })),
      independence_4th: () => import('@/lib/backgrounds/holidays/IndependenceScene').then(m => ({ default: m.IndependenceScene as any })),
      easter: () => import('@/lib/backgrounds/holidays/EasterScene').then(m => ({ default: m.EasterScene as any })),
      diwali: () => import('@/lib/backgrounds/holidays/DiwaliScene').then(m => ({ default: m.DiwaliScene as any })),
      autumn_leaves: () => import('@/lib/backgrounds/nature/AutumnScene').then(m => ({ default: m.AutumnScene as any })),
      northern_lights: () => import('@/lib/backgrounds/space/Aurora').then(m => ({ default: m.Aurora as any })),
      spring_flowers: () => import('@/lib/backgrounds/nature/SpringScene').then(m => ({ default: m.SpringScene as any })),
    }

    const loader = SCENE_IMPORTS[scene]
    if (loader) {
      loader().then(mod => setComponent(() => mod.default))
    }
  }, [scene])

  if (!Component) return null
  return <Component />
}

export function useTheme(): BackgroundContextValue {
  const ctx = useContext(BackgroundContext)
  if (!ctx) throw new Error('useTheme must be used within BackgroundProvider')
  return ctx
}
```

---

## Section 18: BackgroundControls — User Override Panel

```typescript
// lib/theme/BackgroundControls.tsx
'use client'
import { useState } from 'react'
import { useTheme } from './BackgroundProvider'
import type { SceneType } from './ThemeConfig'

const SCENE_CATALOG: { key: SceneType; label: string; category: string; emoji: string }[] = [
  // Space
  { key: 'starfield_parallax', label: 'Star Field', category: 'space', emoji: '⭐' },
  { key: 'nebula_bloom', label: 'Nebula', category: 'space', emoji: '🌌' },
  { key: 'galaxy_core', label: 'Galaxy Core', category: 'space', emoji: '🌀' },
  { key: 'aurora_curtain', label: 'Aurora', category: 'space', emoji: '🌠' },
  { key: 'binary_star', label: 'Binary Star', category: 'space', emoji: '💫' },
  // Ocean
  { key: 'coral_reef', label: 'Coral Reef', category: 'ocean', emoji: '🐠' },
  { key: 'ocean_calm', label: 'Ocean (Jellyfish)', category: 'ocean', emoji: '🪼' },
  { key: 'ocean_deep', label: 'Deep Ocean', category: 'ocean', emoji: '🦑' },
  { key: 'bioluminescent', label: 'Bioluminescent', category: 'ocean', emoji: '✨' },
  // Nature
  { key: 'forest_dawn', label: 'Forest Dawn', category: 'nature', emoji: '🌲' },
  { key: 'forest_rain', label: 'Forest Rain', category: 'nature', emoji: '🌧️' },
  { key: 'autumn_leaves', label: 'Autumn', category: 'nature', emoji: '🍂' },
  { key: 'spring_flowers', label: 'Spring', category: 'nature', emoji: '🌸' },
  { key: 'mountain_mist', label: 'Mountain Mist', category: 'nature', emoji: '⛰️' },
  { key: 'northern_lights', label: 'Northern Lights', category: 'nature', emoji: '🌌' },
  // Tech
  { key: 'matrix_rain', label: 'Matrix Rain', category: 'tech', emoji: '🖥️' },
  { key: 'circuit_pulse', label: 'Circuit', category: 'tech', emoji: '⚡' },
  { key: 'neon_grid', label: 'Neon Grid', category: 'tech', emoji: '🔮' },
  // Calm
  { key: 'zen_garden', label: 'Zen Garden', category: 'calm', emoji: '🪨' },
  { key: 'rainy_cafe', label: 'Rainy Café', category: 'calm', emoji: '☕' },
  { key: 'crystal_cave', label: 'Crystal Cave', category: 'calm', emoji: '💎' },
  // Holidays
  { key: 'halloween', label: 'Halloween', category: 'holiday', emoji: '🎃' },
  { key: 'christmas', label: 'Christmas', category: 'holiday', emoji: '🎄' },
  { key: 'independence_4th', label: '4th of July', category: 'holiday', emoji: '🎆' },
  { key: 'easter', label: 'Easter', category: 'holiday', emoji: '🥚' },
  { key: 'diwali', label: 'Diwali', category: 'holiday', emoji: '🪔' },
  { key: 'hanukkah', label: 'Hanukkah', category: 'holiday', emoji: '🕎' },
  { key: 'new_year', label: 'New Year', category: 'holiday', emoji: '🎉' },
]

const CATEGORIES = ['all', 'space', 'ocean', 'nature', 'tech', 'calm', 'holiday']

export function BackgroundControls() {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const { currentScene, setUserOverride, resolvedTheme } = useTheme()

  const filtered = activeCategory === 'all'
    ? SCENE_CATALOG
    : SCENE_CATALOG.filter(s => s.category === activeCategory)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 left-4 z-40 bg-black/70 backdrop-blur-sm border border-white/10 text-white rounded-full px-4 py-2 text-xs font-medium hover:bg-black/90 transition-colors"
        title="Change background"
      >
        🎨 {SCENE_CATALOG.find(s => s.key === currentScene)?.emoji ?? '🌌'} Background
      </button>

      {/* Slide-up panel */}
      {open && (
        <div className="fixed bottom-14 left-4 z-40 bg-controls-panel rounded-2xl w-80 max-h-96 overflow-hidden flex flex-col shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-white font-bold text-sm">Background</div>
              <div className="text-gray-500 text-xs">Auto: {resolvedTheme?.source} · {resolvedTheme?.scene}</div>
            </div>
            <div className="flex items-center gap-2">
              {resolvedTheme?.source !== 'daily' && (
                <button
                  onClick={() => setUserOverride(null)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Scene grid */}
          <div className="overflow-y-auto p-3 grid grid-cols-3 gap-2">
            {filtered.map(scene => (
              <button
                key={scene.key}
                onClick={() => { setUserOverride(scene.key); setOpen(false) }}
                className={`bg-controls-thumbnail flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  currentScene === scene.key
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                }`}
              >
                <span className="text-xl">{scene.emoji}</span>
                <span className="text-xs text-gray-300 text-center leading-tight">{scene.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
```
