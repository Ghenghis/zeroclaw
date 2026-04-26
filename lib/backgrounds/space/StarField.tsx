'use client'

import { useEffect, useRef } from 'react'
import { detectPerformanceTier, getParticleCount } from '@/lib/backgrounds/deviceCapability'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Star {
  x: number
  y: number
  z: number       // depth 0.1–1.0 (1 = closest)
  vx: number
  vy: number
  size: number
  brightness: number
  color: string
  twinklePhase: number
  twinkleSpeed: number
}

interface MouseState {
  x: number
  y: number
  active: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAR_COLORS = [
  '#ffffff', '#fffbe6', '#e6f0ff', '#ffd6d6',
  '#d6f5ff', '#f0e6ff', '#ffecd6', '#e6ffe6',
]

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function getDateSeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

// ---------------------------------------------------------------------------
// StarField component
// ---------------------------------------------------------------------------

interface StarFieldProps {
  /** Number of stars — scaled by performance tier if undefined */
  starCount?: number
  /** Parallax intensity 0–1 */
  parallaxStrength?: number
  /** Enable mouse interaction */
  interactive?: boolean
  /** Background gradient CSS string */
  background?: string
  /** Optional CSS class */
  className?: string
}

export default function StarField({
  starCount,
  parallaxStrength = 0.04,
  interactive = true,
  background = 'radial-gradient(ellipse at 50% 100%, #0d0d2b 0%, #000005 60%)',
  className = '',
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const mouseRef = useRef<MouseState>({ x: 0.5, y: 0.5, active: false })
  const rafRef = useRef<number>(0)
  const tRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tier = detectPerformanceTier()
    const count = starCount ?? getParticleCount(300, tier)
    const rand = mulberry32(getDateSeed())

    // ── Resize ───────────────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Init stars ───────────────────────────────────────────────────────────
    function initStars() {
      if (!canvas) return
      starsRef.current = Array.from({ length: count }, () => {
        const z = 0.1 + rand() * 0.9
        return {
          x: rand() * canvas.width,
          y: rand() * canvas.height,
          z,
          vx: (rand() - 0.5) * 0.02,
          vy: (rand() - 0.5) * 0.02,
          size: 0.5 + z * 2.5,
          brightness: 0.4 + rand() * 0.6,
          color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
          twinklePhase: rand() * Math.PI * 2,
          twinkleSpeed: 0.5 + rand() * 2,
        }
      })
    }
    initStars()

    // ── Mouse ─────────────────────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      if (!canvas) return
      mouseRef.current = {
        x: e.clientX / canvas.width,
        y: e.clientY / canvas.height,
        active: true,
      }
    }
    function onMouseLeave() {
      mouseRef.current.active = false
    }
    if (interactive) {
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseleave', onMouseLeave)
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    function render() {
      if (!canvas || !ctx) return
      tRef.current += 0.016

      const W = canvas.width
      const H = canvas.height
      const t = tRef.current
      const mouse = mouseRef.current

      // Background
      ctx.clearRect(0, 0, W, H)

      // Subtle nebula fog
      const fog = ctx.createRadialGradient(W * 0.3, H * 0.4, 0, W * 0.3, H * 0.4, W * 0.6)
      fog.addColorStop(0, 'rgba(40,0,80,0.08)')
      fog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fog
      ctx.fillRect(0, 0, W, H)

      // Draw stars
      for (const star of starsRef.current) {
        const twinkle = 0.7 + 0.3 * Math.sin(t * star.twinkleSpeed + star.twinklePhase)
        const alpha = star.brightness * twinkle

        // Parallax offset
        let ox = 0, oy = 0
        if (mouse.active) {
          const dx = mouse.x - 0.5
          const dy = mouse.y - 0.5
          ox = dx * parallaxStrength * star.z * W * 0.1
          oy = dy * parallaxStrength * star.z * H * 0.1
        }

        const px = ((star.x + ox + W) % W)
        const py = ((star.y + oy + H) % H)

        // Glow for bright/large stars
        if (star.z > 0.7 && star.size > 2) {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, star.size * 4)
          glow.addColorStop(0, `${star.color}${Math.floor(alpha * 80).toString(16).padStart(2, '0')}`)
          glow.addColorStop(1, 'transparent')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(px, py, star.size * 4, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = star.color
        ctx.beginPath()
        ctx.arc(px, py, star.size * 0.5, 0, Math.PI * 2)
        ctx.fill()

        // Cross sparkle for brightest stars
        if (star.z > 0.85 && star.brightness > 0.8) {
          ctx.globalAlpha = alpha * 0.4
          ctx.strokeStyle = star.color
          ctx.lineWidth = 0.5
          ctx.beginPath()
          const sp = star.size * 3
          ctx.moveTo(px - sp, py); ctx.lineTo(px + sp, py)
          ctx.moveTo(px, py - sp); ctx.lineTo(px, py + sp)
          ctx.stroke()
        }
        ctx.restore()

        // Slow drift
        star.x += star.vx
        star.y += star.vy
        if (star.x < 0) star.x += W
        if (star.x > W) star.x -= W
        if (star.y < 0) star.y += H
        if (star.y > H) star.y -= H
      }

      rafRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      if (interactive) {
        canvas.removeEventListener('mousemove', onMouseMove)
        canvas.removeEventListener('mouseleave', onMouseLeave)
      }
    }
  }, [starCount, parallaxStrength, interactive, background])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ background, zIndex: -1 }}
      aria-hidden="true"
    />
  )
}
