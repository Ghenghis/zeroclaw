// lib/daily/DailyBriefGenerator.ts
// Generates a unique daily brief using 6-axis diversity enforcement.
// Prevents repeating the same palette/layout/mood for at least 7 days.

import Anthropic from '@anthropic-ai/sdk'
import { schedulerLogger } from '@/lib/logger'
import type { SceneType } from '@/lib/theme/ThemeConfig'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyBrief {
  date: string          // YYYY-MM-DD
  themeName: string
  headline: string
  summary: string
  mood: string
  colorPalette: string
  layoutStyle: string
  typography: string
  animationStyle: string
  industryFocus: string
  accentMood: string
  sceneType: SceneType
  sceneVariant: string
  generatedAt: Date
  agentModel: string
  promptTokens: number
  completionTokens: number
}

// ---------------------------------------------------------------------------
// Diversity axes — each axis has all available options
// ---------------------------------------------------------------------------

export const DIVERSITY_AXES = {
  colorPalette: [
    'midnight_blue',
    'forest_emerald',
    'sunset_coral',
    'arctic_white',
    'deep_purple',
    'golden_amber',
    'rose_quartz',
    'slate_graphite',
    'ocean_teal',
    'crimson_ember',
    'lavender_mist',
    'citrus_pop',
  ],
  layoutStyle: [
    'hero_centered',
    'editorial_grid',
    'magazine_columns',
    'minimal_whitespace',
    'card_mosaic',
    'split_screen',
    'full_bleed',
    'sidebar_focus',
    'masonry_flow',
    'dashboard_panels',
  ],
  typography: [
    'geometric_sans',
    'elegant_serif',
    'brutalist_bold',
    'playful_rounded',
    'technical_mono',
    'classic_humanist',
    'display_condensed',
    'handwritten_feel',
  ],
  animationStyle: [
    'smooth_parallax',
    'particle_field',
    'wave_distortion',
    'typewriter_reveal',
    'slide_entrance',
    'morphing_shapes',
    'glitch_flicker',
    'spring_bounce',
    'dissolve_fade',
    'cascade_stagger',
  ],
  industryFocus: [
    'technology',
    'creative_agency',
    'startup',
    'enterprise',
    'education',
    'healthcare',
    'finance',
    'entertainment',
    'ecommerce',
    'portfolio',
    'saas',
    'nonprofit',
  ],
  accentMood: [
    'energetic',
    'serene',
    'professional',
    'playful',
    'mysterious',
    'warm',
    'futuristic',
    'organic',
    'luxurious',
    'minimalist',
  ],
} as const

type AxisKey = keyof typeof DIVERSITY_AXES

// ---------------------------------------------------------------------------
// Scene mapping: mood + industry → background scene
// ---------------------------------------------------------------------------

const MOOD_SCENE_MAP: Record<string, SceneType> = {
  energetic: 'fireworks',
  serene: 'ocean_calm',
  professional: 'starfield_parallax',
  playful: 'cherry_blossoms',
  mysterious: 'nebula_shader',
  warm: 'forest_dawn',
  futuristic: 'deep_space',
  organic: 'coral_reef',
  luxurious: 'aurora_curtain',
  minimalist: 'zen_garden',
}

// ---------------------------------------------------------------------------
// DailyBriefGenerator
// ---------------------------------------------------------------------------

export class DailyBriefGenerator {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic()
  }

  // ── Pick a fresh value for an axis, avoiding last 7 days ─────────────────

  pickFresh(axis: AxisKey, history: Partial<DailyBrief>[]): string {
    const options = DIVERSITY_AXES[axis] as readonly string[]
    const recentValues = new Set(
      history.slice(0, 7).map(h => (h as Record<string, unknown>)[axis] as string).filter(Boolean)
    )

    // Filter out recently used values
    const fresh = options.filter(o => !recentValues.has(o))

    // If all options have been used recently (< 7 remaining), use full set
    const pool = fresh.length > 0 ? fresh : [...options]

    // Weighted random — prefer options not used in last 14 days
    const recentValues14 = new Set(
      history.slice(0, 14).map(h => (h as Record<string, unknown>)[axis] as string).filter(Boolean)
    )
    const preferred = pool.filter(o => !recentValues14.has(o))
    const finalPool = preferred.length > 0 ? preferred : pool

    return finalPool[Math.floor(Math.random() * finalPool.length)]
  }

  // ── Pick background scene based on mood and industry ─────────────────────

  pickBackground(mood: string, _industry: string): SceneType {
    return MOOD_SCENE_MAP[mood] ?? 'starfield_parallax'
  }

  // ── Build the generation prompt ───────────────────────────────────────────

  buildGenerationPrompt(spec: {
    date: string
    colorPalette: string
    layoutStyle: string
    typography: string
    animationStyle: string
    industryFocus: string
    accentMood: string
  }): string {
    return `You are DaveAI, an autonomous web design agent. Generate a daily website brief for ${spec.date}.

DESIGN PARAMETERS:
- Color Palette: ${spec.colorPalette}
- Layout Style: ${spec.layoutStyle}
- Typography: ${spec.typography}
- Animation Style: ${spec.animationStyle}
- Industry Focus: ${spec.industryFocus}
- Accent Mood: ${spec.accentMood}

Generate a JSON response with these exact fields:
{
  "themeName": "Creative name for today's theme (2-4 words, evocative)",
  "headline": "The website's main headline (compelling, industry-relevant, under 10 words)",
  "summary": "2-3 sentence description of today's design direction and what makes it unique"
}

Rules:
- themeName must feel fresh and creative (e.g., "Neon Midnight Sprint", "Coastal Editorial")
- headline should feel like a real website's hero text
- summary describes the aesthetic and UX direction, not just the parameters
- Be specific and vivid — avoid generic phrases
- The output must be valid JSON only, no markdown, no explanation`
  }

  // ── Generate theme name (uses haiku for speed) ────────────────────────────

  async generateThemeName(palette: string, mood: string, industry: string): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Generate a creative 2-4 word theme name for a website with:
- Color palette: ${palette}
- Mood: ${mood}
- Industry: ${industry}

Return ONLY the theme name, nothing else. Examples: "Arctic Velocity", "Golden Hour Studio", "Neon Protocol"`
        }]
      })
      const text = message.content.find(b => b.type === 'text')
      return text?.type === 'text' ? text.text.trim().replace(/['"]/g, '') : `${mood} ${industry}`
    } catch {
      return `${palette.replace('_', ' ')} ${mood}`
    }
  }

  // ── Main generate method ──────────────────────────────────────────────────

  async generate(date: Date = new Date(), history: Partial<DailyBrief>[] = []): Promise<DailyBrief> {
    const dateStr = date.toISOString().slice(0, 10)

    // Pick fresh values for all axes
    const colorPalette = this.pickFresh('colorPalette', history)
    const layoutStyle = this.pickFresh('layoutStyle', history)
    const typography = this.pickFresh('typography', history)
    const animationStyle = this.pickFresh('animationStyle', history)
    const industryFocus = this.pickFresh('industryFocus', history)
    const accentMood = this.pickFresh('accentMood', history)

    schedulerLogger.info({
      date: dateStr, colorPalette, layoutStyle, typography,
      animationStyle, industryFocus, accentMood
    }, 'Generating daily brief')

    const prompt = this.buildGenerationPrompt({
      date: dateStr, colorPalette, layoutStyle, typography,
      animationStyle, industryFocus, accentMood
    })

    const message = await this.client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content from brief generator')
    }

    let parsed: { themeName: string; headline: string; summary: string }
    try {
      parsed = JSON.parse(textBlock.text.trim())
    } catch {
      // Fallback if JSON is malformed
      parsed = {
        themeName: await this.generateThemeName(colorPalette, accentMood, industryFocus),
        headline: `Welcome to ${industryFocus.replace('_', ' ')} — ${dateStr}`,
        summary: `Today's design direction combines ${colorPalette} aesthetics with ${layoutStyle} layout and ${accentMood} energy.`
      }
    }

    const sceneType = this.pickBackground(accentMood, industryFocus)

    const brief: DailyBrief = {
      date: dateStr,
      themeName: parsed.themeName,
      headline: parsed.headline,
      summary: parsed.summary,
      mood: accentMood,
      colorPalette,
      layoutStyle,
      typography,
      animationStyle,
      industryFocus,
      accentMood,
      sceneType,
      sceneVariant: colorPalette,
      generatedAt: new Date(),
      agentModel: 'claude-opus-4-5',
      promptTokens: message.usage.input_tokens,
      completionTokens: message.usage.output_tokens,
    }

    schedulerLogger.info({ date: dateStr, themeName: brief.themeName }, 'Daily brief generated')
    return brief
  }
}
