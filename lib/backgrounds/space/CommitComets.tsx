'use client'

import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Comet {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  length: number
  alpha: number
  color: string
  message: string
  age: number
  maxAge: number
  glowIntensity: number
}

interface Commit {
  sha: string
  message: string
  author: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMET_COLORS = [
  '#88ccff', '#aaddff', '#ffffff', '#66bbff',
  '#99ddcc', '#ffcc88', '#cc99ff', '#88ffcc',
]

const MAX_COMETS = 8

// ---------------------------------------------------------------------------
// CommitComets component
// Streams git commits via SSE and renders each as a comet with vapor trail
// ---------------------------------------------------------------------------

interface CommitCometsProps {
  angle?: number          // degrees, default 25 (top-right to bottom-left)
  speed?: number          // pixels/frame, default 4
  maxComets?: number
  className?: string
}

export default function CommitComets({
  angle = 25,
  speed = 4,
  maxComets = MAX_COMETS,
  className = '',
}: CommitCometsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cometsRef = useRef<Comet[]>([])
  const rafRef = useRef<number>(0)
  const esRef = useRef<EventSource | null>(null)
  const queueRef = useRef<Commit[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize
    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // SSE connection for live commits
    function connectSSE() {
      esRef.current?.close()
      const es = new EventSource('/api/commits/stream')
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const commit = JSON.parse(e.data) as Commit
          queueRef.current.push(commit)
          // Keep queue bounded
          if (queueRef.current.length > 20) queueRef.current.shift()
        } catch { /* ignore malformed */ }
      }

      es.onerror = () => {
        setTimeout(connectSSE, 5000)
      }
    }
    connectSSE()

    // Spawn comets from queue
    const spawnInterval = setInterval(() => {
      if (!canvas) return
      if (cometsRef.current.length >= maxComets) return
      if (queueRef.current.length === 0) return

      const commit = queueRef.current.shift()!
      const rad = (angle * Math.PI) / 180
      const vx = Math.cos(rad) * speed
      const vy = Math.sin(rad) * speed

      // Start from top or left edge
      const fromLeft = Math.random() > 0.5
      const comet: Comet = {
        id: commit.sha,
        x: fromLeft ? -50 : Math.random() * canvas.width,
        y: fromLeft ? Math.random() * canvas.height * 0.5 : -50,
        vx,
        vy,
        length: 80 + Math.random() * 120,
        alpha: 0.9,
        color: COMET_COLORS[Math.floor(Math.random() * COMET_COLORS.length)],
        message: commit.message.slice(0, 60),
        age: 0,
        maxAge: 300 + Math.random() * 200,
        glowIntensity: 0.6 + Math.random() * 0.4,
      }
      cometsRef.current.push(comet)
    }, 800)

    // Also spawn demo comets if no SSE data (dev mode)
    const demoInterval = setInterval(() => {
      if (!canvas) return
      if (queueRef.current.length === 0 && cometsRef.current.length < 3) {
        queueRef.current.push({
          sha: Math.random().toString(36).slice(2, 10),
          message: [
            'feat: add new background engine',
            'fix: improve star parallax performance',
            'chore: update dependencies',
            'docs: update implementation guide',
            'refactor: simplify theme resolver',
          ][Math.floor(Math.random() * 5)],
          author: 'DaveAI',
          timestamp: new Date().toISOString(),
        })
      }
    }, 3000)

    // Render loop
    function render() {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const W = canvas.width
      const H = canvas.height

      for (let i = cometsRef.current.length - 1; i >= 0; i--) {
        const c = cometsRef.current[i]

        c.x += c.vx
        c.y += c.vy
        c.age++

        // Fade out near end of life or when off-screen
        const lifeFrac = c.age / c.maxAge
        const alpha = c.alpha * (1 - Math.pow(lifeFrac, 2))

        if (alpha <= 0.01 || c.x > W + 200 || c.y > H + 200) {
          cometsRef.current.splice(i, 1)
          continue
        }

        // Tail direction (opposite of velocity)
        const tailX = c.x - c.vx * (c.length / speed)
        const tailY = c.y - c.vy * (c.length / speed)

        // Draw vapor trail
        const grad = ctx.createLinearGradient(tailX, tailY, c.x, c.y)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.6, `${c.color}${Math.floor(alpha * 60).toString(16).padStart(2, '0')}`)
        grad.addColorStop(1, `${c.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`)

        ctx.save()
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.shadowBlur = 12 * c.glowIntensity
        ctx.shadowColor = c.color
        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(c.x, c.y)
        ctx.stroke()

        // Head glow
        const headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 8)
        headGrad.addColorStop(0, `${c.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`)
        headGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = headGrad
        ctx.beginPath()
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2)
        ctx.fill()

        // Commit message label (fades in, then out)
        if (lifeFrac < 0.7) {
          const textAlpha = Math.min(1, lifeFrac * 5) * (1 - lifeFrac / 0.7)
          ctx.globalAlpha = textAlpha * alpha
          ctx.font = '10px monospace'
          ctx.fillStyle = c.color
          ctx.shadowBlur = 4
          ctx.fillText(c.message, c.x + 10, c.y - 6)
        }

        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearInterval(spawnInterval)
      clearInterval(demoInterval)
      esRef.current?.close()
      window.removeEventListener('resize', resize)
    }
  }, [angle, speed, maxComets])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
