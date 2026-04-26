/**
 * ThemeRegistry — 20+ full ThemeConfig objects
 *
 * Each theme defines typography, colors, spacing tokens, background scene hints,
 * and a StyleSeed range that maps to the SpaceVariant system.
 *
 * The AI pipeline calls `getThemeForDate(date)` to deterministically pick a theme,
 * or `getThemeByName(name)` when an admin pin is active.
 */

import type { BackgroundScene } from '@/components/backgrounds/BackgroundRenderer';

export type FontPair = {
  heading: string;
  body: string;
  mono: string;
};

export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  /** 0–999 seed used to configure SpaceVariant and other per-day details */
  seedRange: [number, number];
  fonts: FontPair;
  colors: {
    primary: ColorScale;
    accent: ColorScale;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  spacing: {
    containerMaxW: string;
    sectionPadding: string;
    cardPadding: string;
    borderRadius: string;
    borderRadiusLg: string;
  };
  /** Primary background scene for this theme */
  backgroundScene: BackgroundScene;
  /** Fallback scene when reduced-motion is preferred */
  reducedMotionScene: BackgroundScene;
  /** CSS custom properties injected into :root at build time */
  cssVars: Record<string, string>;
  /** Tone / aesthetic tags for AI prompt enrichment */
  tags: string[];
}

// ---------------------------------------------------------------------------
// Theme definitions
// ---------------------------------------------------------------------------

export const THEMES: ThemeConfig[] = [
  // ─── Space / Sci-Fi ────────────────────────────────────────────────────────

  {
    id: 'midnight-terminal',
    name: 'Midnight Terminal',
    description: 'Dark hacker aesthetic with phosphor-green accents and monospace everything',
    seedRange: [0, 49],
    fonts: { heading: "'JetBrains Mono', monospace", body: "'JetBrains Mono', monospace", mono: "'JetBrains Mono', monospace" },
    colors: {
      primary: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      accent:  { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      background: '#050a05', surface: '#0d1a0d', text: '#4ade80', textMuted: '#166534', border: '#14532d',
    },
    spacing: { containerMaxW: '900px', sectionPadding: '80px 24px', cardPadding: '20px', borderRadius: '4px', borderRadiusLg: '8px' },
    backgroundScene: 'matrix_rain',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--font-heading': "'JetBrains Mono', monospace", '--glow-color': '#4ade80', '--cursor-width': '2px' },
    tags: ['hacker', 'terminal', 'monospace', 'dark', 'retro'],
  },

  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    description: 'Cool night sky with shimmering aurora ribbons and crystalline typography',
    seedRange: [50, 99],
    fonts: { heading: "'Syne', sans-serif", body: "'Inter', sans-serif", mono: "'Fira Code', monospace" },
    colors: {
      primary: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      accent:  { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      background: '#020b18', surface: '#0a1628', text: '#e2f5ff', textMuted: '#64a8c8', border: '#1a3a5c',
    },
    spacing: { containerMaxW: '1100px', sectionPadding: '100px 32px', cardPadding: '28px', borderRadius: '12px', borderRadiusLg: '20px' },
    backgroundScene: 'northern_lights',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--aurora-speed': '8s', '--aurora-blur': '40px' },
    tags: ['nature', 'cool', 'ethereal', 'nordic', 'sky'],
  },

  {
    id: 'solar-flare',
    name: 'Solar Flare',
    description: 'Fiery orange and deep red with aggressive diagonal layouts',
    seedRange: [100, 149],
    fonts: { heading: "'Space Grotesk', sans-serif", body: "'DM Sans', sans-serif", mono: "'Source Code Pro', monospace" },
    colors: {
      primary: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      accent:  { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
      background: '#0a0404', surface: '#180808', text: '#fef2f2', textMuted: '#b45309', border: '#7c2d12',
    },
    spacing: { containerMaxW: '1200px', sectionPadding: '90px 40px', cardPadding: '24px', borderRadius: '6px', borderRadiusLg: '14px' },
    backgroundScene: 'supernova',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--flare-hue': '20', '--flare-saturation': '95%' },
    tags: ['fire', 'bold', 'energy', 'warm', 'aggressive'],
  },

  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Abyssal blues with bioluminescent accents and flowing underwater feel',
    seedRange: [150, 199],
    fonts: { heading: "'Playfair Display', serif", body: "'Source Sans 3', sans-serif", mono: "'Courier New', monospace" },
    colors: {
      primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      accent:  { 50: '#f0fdff', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
      background: '#010d1f', surface: '#031632', text: '#e0f2fe', textMuted: '#0369a1', border: '#0c4a6e',
    },
    spacing: { containerMaxW: '1050px', sectionPadding: '100px 32px', cardPadding: '32px', borderRadius: '16px', borderRadiusLg: '24px' },
    backgroundScene: 'ocean_reef',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--wave-duration': '6s', '--caustic-opacity': '0.3' },
    tags: ['ocean', 'depth', 'blue', 'serene', 'bioluminescent'],
  },

  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    description: 'Soft pink sakura petals drifting over a dark ink wash background',
    seedRange: [200, 249],
    fonts: { heading: "'Noto Serif JP', serif", body: "'Noto Sans JP', sans-serif", mono: "'BIZ UDGothic', monospace" },
    colors: {
      primary: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      accent:  { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
      background: '#0a0509', surface: '#150b12', text: '#fce7f3', textMuted: '#9d174d', border: '#831843',
    },
    spacing: { containerMaxW: '960px', sectionPadding: '80px 24px', cardPadding: '24px', borderRadius: '10px', borderRadiusLg: '18px' },
    backgroundScene: 'cherry_blossoms',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--petal-hue': '340deg', '--blossom-density': '60' },
    tags: ['japanese', 'sakura', 'pink', 'poetic', 'spring'],
  },

  {
    id: 'neon-tokyo',
    name: 'Neon Tokyo',
    description: 'Cyberpunk megacity with neon kanji, rain reflections, and vaporwave palette',
    seedRange: [250, 299],
    fonts: { heading: "'Orbitron', sans-serif", body: "'Rajdhani', sans-serif", mono: "'Share Tech Mono', monospace" },
    colors: {
      primary: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      accent:  { 50: '#fff0f0', 100: '#ffe0e0', 200: '#ffc0c0', 300: '#ff9090', 400: '#ff5050', 500: '#ff2020', 600: '#e00000', 700: '#c00000', 800: '#900000', 900: '#700000' },
      background: '#04000d', surface: '#0d0020', text: '#f0e0ff', textMuted: '#701a75', border: '#3b0764',
    },
    spacing: { containerMaxW: '1300px', sectionPadding: '70px 24px', cardPadding: '20px', borderRadius: '2px', borderRadiusLg: '4px' },
    backgroundScene: 'neon_city',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--neon-flicker': '0.05s', '--rain-opacity': '0.4', '--scanline-opacity': '0.03' },
    tags: ['cyberpunk', 'neon', 'japanese', 'rain', 'vaporwave'],
  },

  {
    id: 'nebula-drift',
    name: 'Nebula Drift',
    description: 'Pastel cosmic clouds with slow drift and gentle star shimmer',
    seedRange: [300, 349],
    fonts: { heading: "'Exo 2', sans-serif", body: "'Nunito', sans-serif", mono: "'Space Mono', monospace" },
    colors: {
      primary: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      accent:  { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      background: '#07040f', surface: '#110820', text: '#ede9fe', textMuted: '#6d28d9', border: '#4c1d95',
    },
    spacing: { containerMaxW: '1100px', sectionPadding: '100px 32px', cardPadding: '28px', borderRadius: '14px', borderRadiusLg: '22px' },
    backgroundScene: 'nebula_bloom',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--nebula-speed': '20s', '--star-count': '200' },
    tags: ['space', 'cosmic', 'pastel', 'dreamy', 'purple'],
  },

  {
    id: 'arctic-void',
    name: 'Arctic Void',
    description: 'Stark white on black with crystalline geometry and polar coldness',
    seedRange: [350, 399],
    fonts: { heading: "'Helvetica Neue', Helvetica, Arial, sans-serif", body: "'Helvetica Neue', Helvetica, Arial, sans-serif", mono: "'Courier New', monospace" },
    colors: {
      primary: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
      accent:  { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      background: '#000000', surface: '#060606', text: '#f8fafc', textMuted: '#475569', border: '#1e293b',
    },
    spacing: { containerMaxW: '980px', sectionPadding: '120px 40px', cardPadding: '40px', borderRadius: '0px', borderRadiusLg: '2px' },
    backgroundScene: 'snowfall',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--crystal-opacity': '0.8', '--grid-gap': '1px' },
    tags: ['minimal', 'stark', 'cold', 'geometric', 'swiss'],
  },

  {
    id: 'ancient-forest',
    name: 'Ancient Forest',
    description: 'Bioluminescent fireflies in an ancient forest at midnight',
    seedRange: [400, 449],
    fonts: { heading: "'Cinzel', serif", body: "'Crimson Pro', serif", mono: "'Fira Code', monospace" },
    colors: {
      primary: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      accent:  { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      background: '#010a02', surface: '#061206', text: '#dcfce7', textMuted: '#15803d', border: '#14532d',
    },
    spacing: { containerMaxW: '1000px', sectionPadding: '80px 28px', cardPadding: '28px', borderRadius: '8px', borderRadiusLg: '16px' },
    backgroundScene: 'fireflies',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--firefly-count': '60', '--glow-hue': '120deg' },
    tags: ['nature', 'forest', 'fireflies', 'bioluminescent', 'ancient'],
  },

  {
    id: 'lava-flow',
    name: 'Lava Flow',
    description: 'Molten rock and ember textures with volcanic intensity',
    seedRange: [450, 499],
    fonts: { heading: "'Bebas Neue', sans-serif", body: "'Barlow', sans-serif", mono: "'IBM Plex Mono', monospace" },
    colors: {
      primary: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      accent:  { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
      background: '#0d0000', surface: '#1c0000', text: '#fff7ed', textMuted: '#9a3412', border: '#7c2d12',
    },
    spacing: { containerMaxW: '1150px', sectionPadding: '80px 32px', cardPadding: '24px', borderRadius: '4px', borderRadiusLg: '8px' },
    backgroundScene: 'fireworks',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--lava-speed': '4s', '--ember-count': '40' },
    tags: ['fire', 'volcanic', 'intense', 'red', 'primal'],
  },

  {
    id: 'coral-reef',
    name: 'Coral Reef',
    description: 'Vibrant underwater ecosystem with tropical fish and swaying corals',
    seedRange: [500, 549],
    fonts: { heading: "'Poppins', sans-serif", body: "'Open Sans', sans-serif", mono: "'Roboto Mono', monospace" },
    colors: {
      primary: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      accent:  { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
      background: '#010f1a', surface: '#021828', text: '#ecfdf5', textMuted: '#059669', border: '#065f46',
    },
    spacing: { containerMaxW: '1100px', sectionPadding: '80px 28px', cardPadding: '24px', borderRadius: '16px', borderRadiusLg: '28px' },
    backgroundScene: 'ocean_reef',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--fish-count': '15', '--sway-speed': '3s' },
    tags: ['ocean', 'tropical', 'colorful', 'life', 'warm'],
  },

  {
    id: 'galaxy-core',
    name: 'Galaxy Core',
    description: 'The galactic center — dense star fields and rotating spiral arms',
    seedRange: [550, 599],
    fonts: { heading: "'Rajdhani', sans-serif", body: "'Barlow', sans-serif", mono: "'Space Mono', monospace" },
    colors: {
      primary: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      accent:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      background: '#020008', surface: '#06000f', text: '#fae8ff', textMuted: '#701a75', border: '#4a044e',
    },
    spacing: { containerMaxW: '1200px', sectionPadding: '90px 32px', cardPadding: '28px', borderRadius: '10px', borderRadiusLg: '18px' },
    backgroundScene: 'galaxy_core',
    reducedMotionScene: 'starfield_only',
    cssVars: { '--spiral-speed': '120s', '--core-glow': '#d946ef' },
    tags: ['space', 'galaxy', 'purple', 'cosmic', 'vast'],
  },

  {
    id: 'desert-storm',
    name: 'Desert Storm',
    description: 'Warm sand tones and dusty oranges under a blood-red sky',
    seedRange: [600, 649],
    fonts: { heading: "'Kanit', sans-serif", body: "'Noto Sans', sans-serif", mono: "'Inconsolata', monospace" },
    colors: {
      primary: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      accent:  { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
      background: '#100800', surface: '#1e1000', text: '#fef3c7', textMuted: '#b45309', border: '#78350f',
    },
    spacing: { containerMaxW: '1050px', sectionPadding: '80px 32px', cardPadding: '24px', borderRadius: '4px', borderRadiusLg: '10px' },
    backgroundScene: 'gradient_flow',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--dust-opacity': '0.15', '--heat-shimmer': 'true' },
    tags: ['desert', 'warm', 'sandy', 'arid', 'primal'],
  },

  {
    id: 'binary-star',
    name: 'Binary Star',
    description: 'Twin stars in orbit — electric blue and molten gold gravitational dance',
    seedRange: [650, 699],
    fonts: { heading: "'Audiowide', sans-serif", body: "'Exo 2', sans-serif", mono: "'Anonymous Pro', monospace" },
    colors: {
      primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      accent:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      background: '#000510', surface: '#000d22', text: '#dbeafe', textMuted: '#1d4ed8', border: '#1e3a8a',
    },
    spacing: { containerMaxW: '1150px', sectionPadding: '90px 32px', cardPadding: '28px', borderRadius: '8px', borderRadiusLg: '16px' },
    backgroundScene: 'binary_star',
    reducedMotionScene: 'starfield_only',
    cssVars: { '--star-a-color': '#60a5fa', '--star-b-color': '#fbbf24', '--orbit-period': '30s' },
    tags: ['space', 'stars', 'blue', 'gold', 'duality'],
  },

  {
    id: 'supernova-remnant',
    name: 'Supernova Remnant',
    description: 'The aftermath — scattered stellar debris, shockwaves, and rebirth',
    seedRange: [700, 749],
    fonts: { heading: "'Oxanium', sans-serif", body: "'Overpass', sans-serif", mono: "'Hack', monospace" },
    colors: {
      primary: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
      accent:  { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
      background: '#0a0003', surface: '#180008', text: '#ffe4e6', textMuted: '#9f1239', border: '#881337',
    },
    spacing: { containerMaxW: '1200px', sectionPadding: '100px 40px', cardPadding: '32px', borderRadius: '6px', borderRadiusLg: '12px' },
    backgroundScene: 'supernova',
    reducedMotionScene: 'starfield_only',
    cssVars: { '--shockwave-speed': '3s', '--debris-count': '80' },
    tags: ['space', 'explosion', 'red', 'intense', 'rebirth'],
  },

  {
    id: 'deep-space',
    name: 'Deep Space',
    description: 'The void between galaxies — peaceful, vast, humbling darkness',
    seedRange: [750, 799],
    fonts: { heading: "'Questrial', sans-serif", body: "'Karla', sans-serif", mono: "'Cousine', monospace" },
    colors: {
      primary: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
      accent:  { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      background: '#000000', surface: '#020408', text: '#f1f5f9', textMuted: '#334155', border: '#0f172a',
    },
    spacing: { containerMaxW: '1050px', sectionPadding: '120px 40px', cardPadding: '40px', borderRadius: '12px', borderRadiusLg: '20px' },
    backgroundScene: 'deep_space',
    reducedMotionScene: 'starfield_only',
    cssVars: { '--void-depth': '99vmax', '--star-density': '0.8' },
    tags: ['space', 'minimal', 'void', 'contemplative', 'dark'],
  },

  {
    id: 'neon-horizon',
    name: 'Neon Horizon',
    description: 'Synthwave sunset with retrowave grid, purple sky, and electric lines',
    seedRange: [800, 849],
    fonts: { heading: "'Orbitron', sans-serif", body: "'Rajdhani', sans-serif", mono: "'Share Tech Mono', monospace" },
    colors: {
      primary: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
      accent:  { 50: '#fffff0', 100: '#fefcbf', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
      background: '#060010', surface: '#0d0020', text: '#fae8ff', textMuted: '#701a75', border: '#3b0764',
    },
    spacing: { containerMaxW: '1300px', sectionPadding: '70px 28px', cardPadding: '22px', borderRadius: '4px', borderRadiusLg: '8px' },
    backgroundScene: 'cyberpunk',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--grid-perspective': '600px', '--horizon-glow': '#d946ef', '--sun-color': '#f59e0b' },
    tags: ['synthwave', 'retrowave', 'purple', 'retro', 'neon'],
  },

  {
    id: 'winter-solstice',
    name: 'Winter Solstice',
    description: 'Peaceful snowfall over a dark frozen landscape with silver and blue',
    seedRange: [850, 899],
    fonts: { heading: "'Cormorant Garamond', serif", body: "'EB Garamond', serif", mono: "'Courier Prime', monospace" },
    colors: {
      primary: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
      accent:  { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
      background: '#020810', surface: '#040f1e', text: '#e0f2fe', textMuted: '#0369a1', border: '#0c4a6e',
    },
    spacing: { containerMaxW: '980px', sectionPadding: '100px 32px', cardPadding: '32px', borderRadius: '12px', borderRadiusLg: '20px' },
    backgroundScene: 'snowfall',
    reducedMotionScene: 'gradient_flow',
    cssVars: { '--snow-count': '150', '--wind-speed': '2s', '--frost-opacity': '0.15' },
    tags: ['winter', 'snow', 'cold', 'serene', 'classic'],
  },

  {
    id: 'commit-stream',
    name: 'Commit Stream',
    description: 'Live GitHub commit data visualized as meteors through the star field',
    seedRange: [900, 949],
    fonts: { heading: "'JetBrains Mono', monospace", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
    colors: {
      primary: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
      accent:  { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      background: '#010a04', surface: '#02120a', text: '#dcfce7', textMuted: '#15803d', border: '#14532d',
    },
    spacing: { containerMaxW: '1100px', sectionPadding: '80px 28px', cardPadding: '22px', borderRadius: '6px', borderRadiusLg: '12px' },
    backgroundScene: 'commit_comets',
    reducedMotionScene: 'starfield_only',
    cssVars: { '--comet-trail-length': '120px', '--sse-dot-color': '#4ade80' },
    tags: ['developer', 'github', 'live', 'commits', 'data'],
  },

  {
    id: 'gradient-canvas',
    name: 'Gradient Canvas',
    description: 'Slow-morphing color gradients as a pure abstract background',
    seedRange: [950, 999],
    fonts: { heading: "'Plus Jakarta Sans', sans-serif", body: "'Plus Jakarta Sans', sans-serif", mono: "'JetBrains Mono', monospace" },
    colors: {
      primary: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
      accent:  { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
      background: '#08060f', surface: '#100e1c', text: '#ede9fe', textMuted: '#6d28d9', border: '#4c1d95',
    },
    spacing: { containerMaxW: '1050px', sectionPadding: '90px 32px', cardPadding: '28px', borderRadius: '16px', borderRadiusLg: '24px' },
    backgroundScene: 'gradient_flow',
    reducedMotionScene: 'static_gradient',
    cssVars: { '--gradient-speed': '12s', '--gradient-stops': '4' },
    tags: ['abstract', 'colorful', 'modern', 'gradient', 'flexible'],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const THEME_MAP = new Map<string, ThemeConfig>(THEMES.map(t => [t.id, t]));

/** Get a theme by its ID. Returns undefined if not found. */
export function getThemeByName(id: string): ThemeConfig | undefined {
  return THEME_MAP.get(id);
}

/** Deterministically pick a theme based on a 0–999 seed. */
export function getThemeForSeed(seed: number): ThemeConfig {
  const s = Math.abs(seed) % 1000;
  return THEMES.find(t => s >= t.seedRange[0] && s <= t.seedRange[1]) ?? THEMES[0];
}

/** Pick a theme based on a Date object using mulberry32 PRNG seeded by date. */
export function getThemeForDate(date: Date): ThemeConfig {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seed = Number(dateStr) % 1000;
  return getThemeForSeed(seed);
}

/** All theme IDs for admin UI dropdowns. */
export function getAllThemeIds(): string[] {
  return THEMES.map(t => t.id);
}

/** Get all themes tagged with a specific tag. */
export function getThemesByTag(tag: string): ThemeConfig[] {
  return THEMES.filter(t => t.tags.includes(tag));
}
