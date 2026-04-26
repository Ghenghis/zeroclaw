// lib/backgrounds/nature/FireworksSystem.ts
// Fireworks particle system for Independence Day / New Year backgrounds.
// Supports multiple burst types: chrysanthemum, willow, crossette, ring.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BurstType = 'chrysanthemum' | 'willow' | 'crossette' | 'ring'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  alpha: number
  gravity: number
  drag: number
  burstType: BurstType
  trail: Array<{ x: number; y: number; alpha: number }>
  splitAt?: number
  split?: boolean
}

interface Shell {
  x: number
  y: number
  vx: number
  vy: number
  targetY: number
  burstType: BurstType
  palette: string[]
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

export const PATRIOTIC_PALETTE = ['#ff0000', '#ffffff', '#0000ff', '#ff6666', '#6666ff', '#ffcc00']
export const CELEBRATION_PALETTE = ['#ff9f40', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#ffe66d', '#a8dadc']
export const NEW_YEAR_PALETTE = ['#ffd700', '#ffffff', '#c0c0c0', '#ff69b4', '#00ffff', '#ff6347']
export const DIWALI_PALETTE = ['#ff6b00', '#ffaa00', '#ffd700', '#ff4444', '#ff8c00', '#fff176']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function angleParticle(
  x: number, y: number,
  angle: number, speed: number,
  color: string, size: number,
  gravity: number, drag: number,
  burstType: BurstType
): Particle {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    color, size, alpha: 1.0,
    gravity, drag, burstType,
    trail: [],
  }
}

// ---------------------------------------------------------------------------
// FireworksSystem
// ---------------------------------------------------------------------------

export class FireworksSystem {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private shells: Shell[] = []
  private particles: Particle[] = []
  private launchInterval: ReturnType<typeof setInterval> | null = null
  private palette: string[]
  private autoLaunch: boolean

  constructor(canvas: HTMLCanvasElement, options?: {
    palette?: string[]
    autoLaunch?: boolean
    launchIntervalMs?: number
  }) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.canvas = canvas
    this.ctx = ctx
    this.palette = options?.palette ?? PATRIOTIC_PALETTE
    this.autoLaunch = options?.autoLaunch ?? true

    if (this.autoLaunch) {
      this.launchInterval = setInterval(() => {
        this.launchShell()
      }, options?.launchIntervalMs ?? 1200)
    }
  }

  // ── Launch ────────────────────────────────────────────────────────────────

  launchShell(x?: number): void {
    const W = this.canvas.width
    const H = this.canvas.height

    const shellX = x ?? W * 0.2 + Math.random() * W * 0.6
    const targetY = H * 0.1 + Math.random() * H * 0.45
    const burstTypes: BurstType[] = ['chrysanthemum', 'willow', 'crossette', 'ring']
    const burstType = randomChoice(burstTypes)

    // Give the shell a slight horizontal drift
    const drift = (Math.random() - 0.5) * 2

    this.shells.push({
      x: shellX,
      y: H,
      vx: drift,
      vy: -(H - targetY) / 45, // reach target in ~45 frames
      targetY,
      burstType,
      palette: [...this.palette],
    })
  }

  // ── Burst ─────────────────────────────────────────────────────────────────

  private burst(x: number, y: number, type: BurstType, palette: string[]): void {
    const countMap: Record<BurstType, number> = {
      chrysanthemum: 80,
      willow: 60,
      crossette: 16,
      ring: 36,
    }
    const count = countMap[type]

    switch (type) {
      case 'chrysanthemum': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          const speed = 3 + Math.random() * 3
          const p = angleParticle(x, y, angle, speed, randomChoice(palette), 2.5, 0.06, 0.978, type)
          this.particles.push(p)
        }
        break
      }
      case 'willow': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          const speed = 1.5 + Math.random() * 2.5
          const p = angleParticle(x, y, angle, speed, randomChoice(palette), 2, 0.09, 0.978, type)
          this.particles.push(p)
        }
        break
      }
      case 'crossette': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          const speed = 3 + Math.random() * 2
          const p = angleParticle(x, y, angle, speed, randomChoice(palette), 3, 0.05, 0.982, type)
          p.splitAt = y - 30 - Math.random() * 20
          p.split = false
          this.particles.push(p)
        }
        break
      }
      case 'ring': {
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          const p = angleParticle(x, y, angle, 3.5, randomChoice(palette), 2, 0.03, 0.990, type)
          this.particles.push(p)
        }
        break
      }
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(): void {
    // Update shells
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i]
      s.x += s.vx
      s.y += s.vy
      s.vy += 0.3

      if (s.vy >= 0 || s.y <= s.targetY) {
        this.burst(s.x, s.y, s.burstType, s.palette)
        this.shells.splice(i, 1)
      }
    }

    // Update particles
    const toAdd: Particle[] = []
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha })
      if (p.trail.length > 8) p.trail.shift()

      // Crossette split
      if (p.burstType === 'crossette' && !p.split && p.splitAt !== undefined && p.y <= p.splitAt) {
        p.split = true
        for (let k = 0; k < 4; k++) {
          const angle = (k / 4) * Math.PI * 2 + Math.random() * 0.3
          toAdd.push(angleParticle(p.x, p.y, angle, 2 + Math.random(), p.color, 1.5, 0.06, 0.982, 'chrysanthemum'))
        }
      }

      p.vx *= p.drag
      p.vy *= p.drag
      p.vy += p.gravity
      p.x += p.vx
      p.y += p.vy
      p.alpha -= 0.012

      if (p.alpha <= 0) {
        this.particles.splice(i, 1)
      }
    }
    this.particles.push(...toAdd)
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  draw(): void {
    const ctx = this.ctx

    // Rising shells
    for (const s of this.shells) {
      ctx.save()
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffcc'
      ctx.shadowBlur = 6
      ctx.shadowColor = '#ffdd44'
      ctx.fill()
      ctx.restore()
    }

    // Particles with trails
    for (const p of this.particles) {
      // Trail
      if (p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const frac = i / p.trail.length
          ctx.save()
          ctx.globalAlpha = frac * p.alpha * 0.5
          ctx.beginPath()
          ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y)
          ctx.lineTo(p.trail[i].x, p.trail[i].y)
          ctx.strokeStyle = p.color
          ctx.lineWidth = p.size * frac * 0.7
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.restore()
        }
      }

      // Head
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.shadowBlur = 6
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    if (this.launchInterval) clearInterval(this.launchInterval)
    this.shells = []
    this.particles = []
  }

  getParticleCount(): number {
    return this.particles.length + this.shells.length
  }
}
