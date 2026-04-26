/**
 * space.config.ts — ZeroClaw SpaceBackground Configuration System
 * 5 theme variants, fully typed, agent-configurable via StyleSeed
 */

export type SpaceVariant =
  | 'deep_space'
  | 'nebula_bloom'
  | 'galaxy_core'
  | 'binary_star'
  | 'supernova';

export interface StarLayerConfig {
  count: number;
  speedFactor: number;    // parallax speed multiplier
  sizeRange: [number, number]; // [min, max] px
  opacityRange: [number, number];
  twinkleFreq: number;    // Hz
  color: string;          // hex or 'white'
}

export interface CometTypeColors {
  daily: string;
  coder: string;
  asset: string;
  qa: string;
  user: string;
}

export interface CometConfig {
  enabled: boolean;
  maxSimultaneous: number;
  speedMultiplier: number;
  fadeOutDuration: number;  // ms
  trailLength: number;      // px
  colors: CometTypeColors;
  glowRadius: number;
}

export interface MoonConfig {
  radius: number;
  textureUrl: string;
  orbitRadius: number;
  orbitSpeed: number;     // radians per frame
}

export interface PlanetConfig {
  id: string;
  name: string;
  textureUrl: string;
  radius: number;
  position: [number, number, number];
  rotationSpeed: number;
  funFact: string;
  moons: MoonConfig[];
  hasRings?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
}

export interface NebulaConfig {
  enabled: boolean;
  colors: [string, string, string];  // 3 color stops
  opacity: number;                   // 0-1
  driftSpeed: number;                // units/sec
  mouseDistortion: {
    strength: number;   // 0-1
    radius: number;     // px
  };
}

export interface AuroraConfig {
  enabled: boolean;
  colors: string[];          // 4 gradient stops
  opacity: number;
  height: number;            // vh
  position: 'top' | 'bottom' | 'both';
  animationDuration: number; // seconds
}

export interface SpaceConfig {
  variant: SpaceVariant;
  seed: number;
  stars: {
    totalCount: number;
    layers: [StarLayerConfig, StarLayerConfig, StarLayerConfig];
    nebulaColors: string[];   // cluster tint colors
    shootingStarInterval: number; // ms between auto shooting stars
  };
  comets: CometConfig;
  planets: PlanetConfig[];
  nebula: NebulaConfig;
  aurora: AuroraConfig;
  performance: {
    targetFPS: number;
    useOffscreenCanvas: boolean;
    maxDPR: number;
  };
}

// ─── Variant Overrides ───────────────────────────────────────────────────────

const VARIANT_OVERRIDES: Record<SpaceVariant, Partial<SpaceConfig>> = {
  deep_space: {
    stars: {
      totalCount: 800,
      nebulaColors: ['#1a0533', '#0d1f4c', '#0a2e1a'],
      shootingStarInterval: 8000,
      layers: [
        { count: 400, speedFactor: 0.2, sizeRange: [0.5, 1.2], opacityRange: [0.4, 0.9], twinkleFreq: 0.3, color: 'white' },
        { count: 280, speedFactor: 0.5, sizeRange: [1.0, 2.0], opacityRange: [0.5, 1.0], twinkleFreq: 0.5, color: '#aaccff' },
        { count: 120, speedFactor: 1.2, sizeRange: [1.5, 3.0], opacityRange: [0.6, 1.0], twinkleFreq: 0.8, color: '#ffeecc' },
      ],
    },
    nebula: {
      enabled: true,
      colors: ['#1a0533', '#0d1f4c', '#0a2e1a'],
      opacity: 0.55,
      driftSpeed: 0.0003,
      mouseDistortion: { strength: 0.4, radius: 200 },
    },
    aurora: { enabled: false, colors: [], opacity: 0, height: 20, position: 'top', animationDuration: 8 },
  },

  nebula_bloom: {
    stars: {
      totalCount: 650,
      nebulaColors: ['#4a0a6b', '#1a0f4a', '#4a1500'],
      shootingStarInterval: 6000,
      layers: [
        { count: 300, speedFactor: 0.15, sizeRange: [0.5, 1.0], opacityRange: [0.3, 0.8], twinkleFreq: 0.4, color: '#ffaaff' },
        { count: 250, speedFactor: 0.45, sizeRange: [1.0, 2.2], opacityRange: [0.5, 1.0], twinkleFreq: 0.6, color: '#aaffee' },
        { count: 100, speedFactor: 1.0,  sizeRange: [1.5, 2.8], opacityRange: [0.7, 1.0], twinkleFreq: 0.9, color: 'white' },
      ],
    },
    nebula: {
      enabled: true,
      colors: ['#4a0a6b', '#1a0f4a', '#4a1500'],
      opacity: 0.75,
      driftSpeed: 0.0005,
      mouseDistortion: { strength: 0.6, radius: 280 },
    },
    aurora: {
      enabled: true,
      colors: ['#ff00ff80', '#8800ff80', '#00ffff80', '#ff008080'],
      opacity: 0.18,
      height: 15,
      position: 'top',
      animationDuration: 12,
    },
  },

  galaxy_core: {
    stars: {
      totalCount: 1200,
      nebulaColors: ['#3d1a00', '#1a1000', '#004433'],
      shootingStarInterval: 4000,
      layers: [
        { count: 600, speedFactor: 0.1, sizeRange: [0.3, 0.9], opacityRange: [0.3, 0.7], twinkleFreq: 0.5, color: '#ffffee' },
        { count: 420, speedFactor: 0.4, sizeRange: [0.8, 1.8], opacityRange: [0.5, 0.9], twinkleFreq: 0.7, color: '#ffd700' },
        { count: 180, speedFactor: 1.5, sizeRange: [1.2, 2.5], opacityRange: [0.8, 1.0], twinkleFreq: 1.2, color: '#ff8844' },
      ],
    },
    nebula: {
      enabled: true,
      colors: ['#3d1a00', '#1a0800', '#004433'],
      opacity: 0.65,
      driftSpeed: 0.0007,
      mouseDistortion: { strength: 0.3, radius: 150 },
    },
    aurora: { enabled: false, colors: [], opacity: 0, height: 20, position: 'top', animationDuration: 8 },
  },

  binary_star: {
    stars: {
      totalCount: 700,
      nebulaColors: ['#001a33', '#1a0033', '#001a00'],
      shootingStarInterval: 5000,
      layers: [
        { count: 350, speedFactor: 0.25, sizeRange: [0.5, 1.2], opacityRange: [0.4, 0.9], twinkleFreq: 0.6, color: 'white' },
        { count: 250, speedFactor: 0.6,  sizeRange: [1.0, 2.0], opacityRange: [0.5, 1.0], twinkleFreq: 0.8, color: '#88ccff' },
        { count: 100, speedFactor: 1.3,  sizeRange: [1.5, 3.0], opacityRange: [0.7, 1.0], twinkleFreq: 1.0, color: '#ffcc88' },
      ],
    },
    nebula: {
      enabled: true,
      colors: ['#001a33', '#1a0033', '#002200'],
      opacity: 0.45,
      driftSpeed: 0.0004,
      mouseDistortion: { strength: 0.5, radius: 240 },
    },
    aurora: {
      enabled: true,
      colors: ['#0088ff80', '#ff880080', '#00ff8880', '#8800ff80'],
      opacity: 0.12,
      height: 12,
      position: 'bottom',
      animationDuration: 15,
    },
  },

  supernova: {
    stars: {
      totalCount: 950,
      nebulaColors: ['#4a1000', '#2a0033', '#003322'],
      shootingStarInterval: 2000,
      layers: [
        { count: 450, speedFactor: 0.3, sizeRange: [0.5, 1.5], opacityRange: [0.5, 1.0], twinkleFreq: 1.0, color: '#fff5ee' },
        { count: 330, speedFactor: 0.8, sizeRange: [1.2, 2.5], opacityRange: [0.6, 1.0], twinkleFreq: 1.4, color: '#ff8844' },
        { count: 170, speedFactor: 2.0, sizeRange: [2.0, 4.0], opacityRange: [0.8, 1.0], twinkleFreq: 2.0, color: '#ffff88' },
      ],
    },
    nebula: {
      enabled: true,
      colors: ['#4a1000', '#2a0033', '#003300'],
      opacity: 0.85,
      driftSpeed: 0.001,
      mouseDistortion: { strength: 0.8, radius: 350 },
    },
    aurora: {
      enabled: true,
      colors: ['#ff440080', '#ff000080', '#ffaa0080', '#ffffff40'],
      opacity: 0.35,
      height: 30,
      position: 'both',
      animationDuration: 6,
    },
  },
};

// ─── Planet Definitions ──────────────────────────────────────────────────────

const PLANET_SETS: Record<SpaceVariant, PlanetConfig[]> = {
  deep_space: [
    {
      id: 'distant-gas-giant',
      name: 'Kepler-7b',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 1.2,
      position: [-5, 1.5, -8],
      rotationSpeed: 0.002,
      funFact: 'A hot Jupiter with reflective clouds, orbiting its star every 4.9 days.',
      moons: [
        { radius: 0.25, textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg', orbitRadius: 2.2, orbitSpeed: 0.012 }
      ],
    },
  ],
  nebula_bloom: [
    {
      id: 'ringed-world',
      name: 'Zephyria',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 1.6,
      position: [5, -1, -10],
      rotationSpeed: 0.003,
      funFact: 'A ringed gas giant in the nebula\'s heart, its rings made of ice crystals refracting violet light.',
      moons: [],
      hasRings: true,
      ringInnerRadius: 2.0,
      ringOuterRadius: 3.2,
    },
  ],
  galaxy_core: [
    {
      id: 'core-world',
      name: 'Galactic Hub',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 0.9,
      position: [4, 2, -7],
      rotationSpeed: 0.005,
      funFact: 'A dense world near the galactic core, bathed in the light of a thousand nearby stars.',
      moons: [
        { radius: 0.18, textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg', orbitRadius: 1.6, orbitSpeed: 0.02 }
      ],
    },
  ],
  binary_star: [
    {
      id: 'twin-planet-1',
      name: 'Solara',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 1.0,
      position: [-4, 1, -8],
      rotationSpeed: 0.004,
      funFact: 'A world lit by two suns, experiencing eternal twilight on its temperate hemisphere.',
      moons: [],
    },
    {
      id: 'twin-planet-2',
      name: 'Lunara',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 0.7,
      position: [5, -0.5, -9],
      rotationSpeed: 0.006,
      funFact: 'Solara\'s twin, a cooler world with vast frozen seas that reflect both suns.',
      moons: [],
    },
  ],
  supernova: [
    {
      id: 'remnant-world',
      name: 'Ash Remnant',
      textureUrl: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/BlueMarble_2002.jpg',
      radius: 1.4,
      position: [0, 0, -12],
      rotationSpeed: 0.007,
      funFact: 'A scorched survivor of the supernova event, its surface eternally lit by the expanding debris cloud.',
      moons: [],
    },
  ],
};

// ─── Base Config ──────────────────────────────────────────────────────────────

const BASE_CONFIG: SpaceConfig = {
  variant: 'deep_space',
  seed: 42,
  stars: {
    totalCount: 800,
    nebulaColors: ['#1a0533', '#0d1f4c', '#0a2e1a'],
    shootingStarInterval: 8000,
    layers: [
      { count: 400, speedFactor: 0.2, sizeRange: [0.5, 1.2], opacityRange: [0.4, 0.9], twinkleFreq: 0.3, color: 'white' },
      { count: 280, speedFactor: 0.5, sizeRange: [1.0, 2.0], opacityRange: [0.5, 1.0], twinkleFreq: 0.5, color: '#aaccff' },
      { count: 120, speedFactor: 1.2, sizeRange: [1.5, 3.0], opacityRange: [0.6, 1.0], twinkleFreq: 0.8, color: '#ffeecc' },
    ],
  },
  comets: {
    enabled: true,
    maxSimultaneous: 5,
    speedMultiplier: 1.0,
    fadeOutDuration: 800,
    trailLength: 120,
    colors: {
      daily:  '#ffd700',
      coder:  '#00d4ff',
      asset:  '#ff6b35',
      qa:     '#00ff88',
      user:   '#c0c0c0',
    },
    glowRadius: 8,
  },
  planets: [],
  nebula: {
    enabled: true,
    colors: ['#1a0533', '#0d1f4c', '#0a2e1a'],
    opacity: 0.55,
    driftSpeed: 0.0003,
    mouseDistortion: { strength: 0.4, radius: 200 },
  },
  aurora: {
    enabled: false,
    colors: ['#00ff8880', '#0088ff80', '#8800ff80', '#ff008880'],
    opacity: 0.15,
    height: 20,
    position: 'top',
    animationDuration: 10,
  },
  performance: {
    targetFPS: 60,
    useOffscreenCanvas: true,
    maxDPR: 2,
  },
};

// ─── Build Config ─────────────────────────────────────────────────────────────

export function buildConfig(variant: SpaceVariant, seed: number): SpaceConfig {
  const overrides = VARIANT_OVERRIDES[variant] ?? {};
  const planets   = PLANET_SETS[variant] ?? [];

  return {
    ...BASE_CONFIG,
    ...overrides,
    variant,
    seed,
    planets,
    stars: {
      ...BASE_CONFIG.stars,
      ...(overrides.stars ?? {}),
    },
    nebula: {
      ...BASE_CONFIG.nebula,
      ...(overrides.nebula ?? {}),
    },
    aurora: {
      ...BASE_CONFIG.aurora,
      ...(overrides.aurora ?? {}),
    },
    comets: {
      ...BASE_CONFIG.comets,
      ...(overrides.comets ?? {}),
    },
  };
}
