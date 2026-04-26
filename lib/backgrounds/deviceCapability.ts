// lib/backgrounds/deviceCapability.ts
// Detects device performance tier and sets CSS variables accordingly.

export type PerformanceTier = 'low' | 'medium' | 'high'

// ---------------------------------------------------------------------------
// WebGL availability
// ---------------------------------------------------------------------------

let _webgl1Cache: boolean | null = null
let _webgl2Cache: boolean | null = null

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (_webgl1Cache !== null) return _webgl1Cache
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl' as 'webgl')
    _webgl1Cache = !!ctx
    if (ctx) {
      const ext = (ctx as WebGLRenderingContext).getExtension('WEBGL_lose_context')
      ext?.loseContext()
    }
    return _webgl1Cache
  } catch {
    return (_webgl1Cache = false)
  }
}

export function isWebGL2Available(): boolean {
  if (typeof window === 'undefined') return false
  if (_webgl2Cache !== null) return _webgl2Cache
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('webgl2')
    _webgl2Cache = !!ctx
    if (ctx) {
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
    }
    return _webgl2Cache
  } catch {
    return (_webgl2Cache = false)
  }
}

function isSoftwareRenderer(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) return false
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    if (!info) return false
    const renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL) as string
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /SwiftShader|llvmpipe|softpipe|Mesa OffScreen|Microsoft Basic Render/i.test(renderer)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Performance tier detection
// ---------------------------------------------------------------------------

let _tierCache: PerformanceTier | null = null

export function detectPerformanceTier(): PerformanceTier {
  if (_tierCache !== null) return _tierCache
  if (typeof window === 'undefined') return (_tierCache = 'high')

  // Reduced motion = always low
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return (_tierCache = 'low')
  }

  // No WebGL = low
  if (!isWebGLAvailable() || isSoftwareRenderer()) {
    return (_tierCache = 'low')
  }

  let score = 0
  const cores = navigator.hardwareConcurrency ?? 2
  if (cores >= 8) score += 3
  else if (cores >= 4) score += 2

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  if (memory >= 8) score += 3
  else if (memory >= 4) score += 2
  else if (memory >= 2) score += 1

  if (isWebGL2Available()) score += 2
  else score += 1

  if (score >= 7) return (_tierCache = 'high')
  if (score >= 4) return (_tierCache = 'medium')
  return (_tierCache = 'low')
}

// ---------------------------------------------------------------------------
// Apply tier to DOM
// ---------------------------------------------------------------------------

export function applyPerformanceTier(tier: PerformanceTier): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.perf = tier
  const limits: Record<PerformanceTier, number> = { low: 30, medium: 150, high: 500 }
  const quality: Record<PerformanceTier, string> = { low: '0.4', medium: '0.7', high: '1.0' }
  root.style.setProperty('--particle-limit', String(limits[tier]))
  root.style.setProperty('--render-quality', quality[tier])
}

export function initPerformanceTier(): PerformanceTier {
  const tier = detectPerformanceTier()
  applyPerformanceTier(tier)
  return tier
}

// ---------------------------------------------------------------------------
// Particle count helper
// ---------------------------------------------------------------------------

export function getParticleCount(base: number, tier: PerformanceTier): number {
  const multipliers: Record<PerformanceTier, number> = {
    low: 0.25,
    medium: 0.6,
    high: 1.0,
  }
  return Math.round(base * multipliers[tier])
}
