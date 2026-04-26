/**
 * AgentThemeSelector
 *
 * Called during the daily build pipeline to select the theme and background
 * for the generated site. Respects admin overrides, supports contextual
 * enrichment from repo metrics, and produces a deterministic but varied output.
 *
 * Selection priority:
 *   1. Admin-pinned theme (from /api/admin/theme)
 *   2. AI contextual selection (commit velocity, day-of-week, milestone)
 *   3. Deterministic seed-based fallback (date → seed → ThemeRegistry lookup)
 */

import {
  getThemeByName,
  getThemeForDate,
  getThemeForSeed,
  getAllThemeIds,
  type ThemeConfig,
} from '@/lib/theme/ThemeRegistry';
import type { BackgroundScene } from '@/components/backgrounds/BackgroundRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepoMetrics {
  /** Number of commits in the last 24 hours */
  commitVelocity: number;
  /** Current streak of consecutive daily builds */
  buildStreak: number;
  /** Total site generations since launch */
  totalGenerations: number;
  /** Whether today is a landmark build (e.g. 100, 365, 1000) */
  isMilestone: boolean;
  /** Day of week 0=Sun…6=Sat */
  dayOfWeek: number;
  /** Primary language detected in recent commits */
  primaryLanguage: string;
  /** Most-used emoji in commit messages (fun signal) */
  topCommitEmoji: string | null;
}

export interface AdminOverride {
  pinnedTheme: string | null;
  pinnedBackground: BackgroundScene | null;
  adminLocked: boolean;
  pinnedUntil: string | null;
}

export interface ThemeSelection {
  theme: ThemeConfig;
  backgroundScene: BackgroundScene;
  styleSeed: number;
  selectionReason: string;
  contextualHints: string[];
}

// ---------------------------------------------------------------------------
// Milestone seeds (give landmark builds special scenes)
// ---------------------------------------------------------------------------

const MILESTONE_OVERRIDES: { count: number; themeId: string; scene: BackgroundScene }[] = [
  { count: 1,    themeId: 'commit-stream',    scene: 'commit_comets' },
  { count: 7,    themeId: 'nebula-drift',     scene: 'nebula_bloom' },
  { count: 30,   themeId: 'aurora-borealis',  scene: 'northern_lights' },
  { count: 100,  themeId: 'supernova-remnant', scene: 'supernova' },
  { count: 365,  themeId: 'galaxy-core',      scene: 'galaxy_core' },
  { count: 500,  themeId: 'binary-star',      scene: 'binary_star' },
  { count: 1000, themeId: 'supernova-remnant', scene: 'supernova' },
];

// ---------------------------------------------------------------------------
// Day-of-week character hints
// ---------------------------------------------------------------------------

const DAY_TAGS: Record<number, string> = {
  0: 'serene',     // Sunday
  1: 'minimal',   // Monday
  2: 'developer', // Tuesday
  3: 'cosmic',    // Wednesday
  4: 'bold',      // Thursday
  5: 'colorful',  // Friday
  6: 'dreamy',    // Saturday
};

// ---------------------------------------------------------------------------
// mulberry32 PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a deterministic seed from a date string "YYYY-MM-DD" → 0..999 */
function dateSeed(date: Date): number {
  const s = date.toISOString().slice(0, 10).replace(/-/g, '');
  // Fold 8 digits into 0..999 range
  return Number(s) % 1000;
}

// ---------------------------------------------------------------------------
// Core selection function
// ---------------------------------------------------------------------------

/**
 * Select the theme and background for a given date and repo context.
 * This is the primary entry point called from the daily generation pipeline.
 */
export function selectTheme(
  date: Date,
  metrics: RepoMetrics,
  override: AdminOverride,
): ThemeSelection {
  const seed = dateSeed(date);
  const rng = mulberry32(seed);
  const contextualHints: string[] = [];

  // 1. Admin pin takes absolute priority
  if (override.adminLocked && override.pinnedTheme) {
    const theme = getThemeByName(override.pinnedTheme);
    if (theme) {
      return {
        theme,
        backgroundScene: override.pinnedBackground ?? theme.backgroundScene,
        styleSeed: seed,
        selectionReason: `Admin-locked to "${theme.id}"`,
        contextualHints: ['admin-override'],
      };
    }
  }

  // 2. Milestone builds get special treatment
  const milestone = MILESTONE_OVERRIDES.find(m => m.count === metrics.totalGenerations);
  if (milestone) {
    const theme = getThemeByName(milestone.themeId);
    if (theme) {
      contextualHints.push(`milestone-${metrics.totalGenerations}`);
      return {
        theme,
        backgroundScene: milestone.scene,
        styleSeed: seed,
        selectionReason: `Milestone #${metrics.totalGenerations} — "${theme.id}"`,
        contextualHints,
      };
    }
  }

  // 3. Admin-pinned theme without lock — just override the theme choice
  if (override.pinnedTheme && !override.adminLocked) {
    const pinExpired = override.pinnedUntil && new Date(override.pinnedUntil) < date;
    if (!pinExpired) {
      const theme = getThemeByName(override.pinnedTheme);
      if (theme) {
        return {
          theme,
          backgroundScene: override.pinnedBackground ?? pickContextualBackground(theme, metrics, rng),
          styleSeed: seed,
          selectionReason: `Admin-pinned theme "${theme.id}" (background chosen contextually)`,
          contextualHints,
        };
      }
    }
  }

  // 4. Contextual AI-style selection
  return contextualSelection(date, seed, metrics, rng, override, contextualHints);
}

// ---------------------------------------------------------------------------
// Contextual selection logic
// ---------------------------------------------------------------------------

function contextualSelection(
  date: Date,
  seed: number,
  metrics: RepoMetrics,
  rng: () => number,
  override: AdminOverride,
  contextualHints: string[],
): ThemeSelection {
  const reasons: string[] = [];

  // High commit velocity → dynamic scenes
  if (metrics.commitVelocity >= 20) {
    contextualHints.push('high-velocity');
    reasons.push(`high commit velocity (${metrics.commitVelocity} commits/day)`);
  }

  // Long streaks → celebratory scenes
  if (metrics.buildStreak >= 30 && metrics.buildStreak % 30 === 0) {
    contextualHints.push('streak-celebration');
    reasons.push(`${metrics.buildStreak}-day build streak`);
  }

  // Day-of-week aesthetic hint
  const dayTag = DAY_TAGS[metrics.dayOfWeek] ?? 'cosmic';
  contextualHints.push(`day-${dayTag}`);

  // Language-based accent
  if (metrics.primaryLanguage === 'TypeScript' || metrics.primaryLanguage === 'JavaScript') {
    contextualHints.push('lang-js');
  } else if (metrics.primaryLanguage === 'Python') {
    contextualHints.push('lang-python');
  } else if (metrics.primaryLanguage === 'Rust') {
    contextualHints.push('lang-rust');
    contextualHints.push('cold');
  }

  // Emoji signal (fun flourish)
  if (metrics.topCommitEmoji === '🚀') contextualHints.push('launch');
  if (metrics.topCommitEmoji === '🐛') contextualHints.push('debug');
  if (metrics.topCommitEmoji === '✨') contextualHints.push('feature');

  // Build the candidate set: all themes, scored by hint overlap
  const allIds = getAllThemeIds();
  const scored = allIds.map(id => {
    const theme = getThemeByName(id)!;
    const overlap = theme.tags.filter(tag => contextualHints.includes(tag)).length;
    // Add slight random jitter (0–0.3) so ties break differently each day
    const score = overlap + rng() * 0.3;
    return { theme, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick from top 3 candidates stochastically
  const topN = scored.slice(0, 3);
  const weights = [0.6, 0.3, 0.1];
  let pick = topN[0].theme;
  const r = rng();
  let cumulative = 0;
  for (let i = 0; i < topN.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) { pick = topN[i].theme; break; }
  }

  const background = override.pinnedBackground ?? pickContextualBackground(pick, metrics, rng);
  reasons.push(`day tag: ${dayTag}`);

  return {
    theme: pick,
    backgroundScene: background,
    styleSeed: seed,
    selectionReason: `Contextual: ${reasons.join(', ')}`,
    contextualHints,
  };
}

// ---------------------------------------------------------------------------
// Background picker
// ---------------------------------------------------------------------------

function pickContextualBackground(
  theme: ThemeConfig,
  metrics: RepoMetrics,
  rng: () => number,
): BackgroundScene {
  // High velocity → commit comets (live data visualization)
  if (metrics.commitVelocity >= 15) return 'commit_comets';

  // Weekend gets nature backgrounds
  if (metrics.dayOfWeek === 0 || metrics.dayOfWeek === 6) {
    const weekend: BackgroundScene[] = ['fireflies', 'cherry_blossoms', 'ocean_reef', 'northern_lights', 'snowfall'];
    return weekend[Math.floor(rng() * weekend.length)];
  }

  // Default to the theme's configured scene with 80% probability
  if (rng() < 0.8) return theme.backgroundScene;

  // 20% chance of a curated alt scene
  const altScenes: BackgroundScene[] = ['nebula_bloom', 'galaxy_core', 'neon_city', 'matrix_rain', 'fireworks'];
  return altScenes[Math.floor(rng() * altScenes.length)];
}

// ---------------------------------------------------------------------------
// CSS variable injection helper
// ---------------------------------------------------------------------------

/**
 * Produces a CSS `:root { }` block from a ThemeConfig + selection.
 * Used by the generation pipeline to inject theme tokens into generated HTML.
 */
export function generateCSSVars(selection: ThemeSelection): string {
  const { theme } = selection;
  const lines: string[] = [':root {'];

  // Color palette
  for (const [scale, shades] of Object.entries(theme.colors)) {
    if (typeof shades === 'object' && '500' in shades) {
      for (const [shade, value] of Object.entries(shades as Record<string, string>)) {
        lines.push(`  --color-${scale}-${shade}: ${value};`);
      }
    } else {
      lines.push(`  --color-${scale}: ${shades as string};`);
    }
  }

  // Font stack
  lines.push(`  --font-heading: ${theme.fonts.heading};`);
  lines.push(`  --font-body: ${theme.fonts.body};`);
  lines.push(`  --font-mono: ${theme.fonts.mono};`);

  // Spacing
  for (const [key, value] of Object.entries(theme.spacing)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`  --spacing-${cssKey}: ${value};`);
  }

  // Theme-specific custom vars
  for (const [key, value] of Object.entries(theme.cssVars)) {
    lines.push(`  ${key}: ${value};`);
  }

  lines.push('}');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Prompt enrichment
// ---------------------------------------------------------------------------

/**
 * Returns a short paragraph of context that can be prepended to AI generation prompts
 * to help Claude produce HTML/CSS that aligns with the chosen theme.
 */
export function buildPromptContext(selection: ThemeSelection): string {
  const { theme, backgroundScene, contextualHints, selectionReason } = selection;
  return [
    `Today's visual theme is "${theme.name}": ${theme.description}`,
    `Background scene: ${backgroundScene}.`,
    `Color palette: primary ${theme.colors.primary[500]}, accent ${theme.colors.accent[500]}, background ${theme.colors.background}.`,
    `Typography: heading font "${theme.fonts.heading}", body "${theme.fonts.body}".`,
    `Aesthetic tags: ${theme.tags.join(', ')}.`,
    `Selection context: ${selectionReason}.`,
    contextualHints.length ? `Contextual signals: ${contextualHints.join(', ')}.` : '',
    `Use the CSS custom properties (--color-primary-*, --font-heading, etc.) in all generated styles.`,
  ].filter(Boolean).join(' ');
}
