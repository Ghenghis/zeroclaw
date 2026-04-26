// lib/backgrounds/ocean/useBoids.ts
// Boids flocking algorithm for fish/bat/bird simulation.
// Separation, Alignment, Cohesion — classic Reynolds rules.

import { useRef, useEffect, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Boid {
  x: number
  y: number
  vx: number
  vy: number
  ax: number    // acceleration
  ay: number
  size: number
  color: string
  variant: number   // for species differentiation
  phase: number     // animation phase
}

export interface BoidsConfig {
  count?: number
  maxSpeed?: number
  maxForce?: number
  perceptionRadius?: number
  separationRadius?: number
  separationWeight?: number
  alignmentWeight?: number
  cohesionWeight?: number
  boundaryMargin?: number
  boundaryForce?: number
  colors?: string[]
  minSize?: number
  maxSize?: number
  /** Width + height of the simulation area */
  width: number
  height: number
  /** Mouse repulsion radius (0 = disabled) */
  mouseRepelRadius?: number
  mouseRepelForce?: number
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const FISH_COLORS = [
  '#ff9f40', '#ffd166', '#06d6a0', '#118ab2',
  '#ef476f', '#ffb3c1', '#8ecae6', '#a8dadc',
  '#f4a261', '#e9c46a',
]

// ---------------------------------------------------------------------------
// useBoids hook
// ---------------------------------------------------------------------------

export function useBoids(config: BoidsConfig): {
  boids: React.MutableRefObject<Boid[]>
  tick: (mouseX?: number, mouseY?: number) => void
  reset: () => void
} {
  const {
    count = 60,
    maxSpeed = 2.5,
    maxForce = 0.08,
    perceptionRadius = 80,
    separationRadius = 30,
    separationWeight = 1.6,
    alignmentWeight = 1.0,
    cohesionWeight = 1.0,
    boundaryMargin = 60,
    boundaryForce = 0.5,
    colors = FISH_COLORS,
    minSize = 6,
    maxSize = 14,
    width,
    height,
    mouseRepelRadius = 100,
    mouseRepelForce = 0.3,
  } = config

  const boidsRef = useRef<Boid[]>([])

  function initBoids() {
    boidsRef.current = Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2
      const speed = maxSpeed * (0.5 + Math.random() * 0.5)
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 0,
        size: minSize + Math.random() * (maxSize - minSize),
        color: colors[i % colors.length],
        variant: Math.floor(Math.random() * 3),
        phase: Math.random() * Math.PI * 2,
      }
    })
  }

  useEffect(() => {
    initBoids()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, width, height])

  // ── Vector helpers ────────────────────────────────────────────────────────

  function limit(vx: number, vy: number, max: number): [number, number] {
    const mag = Math.sqrt(vx * vx + vy * vy)
    if (mag > max) return [(vx / mag) * max, (vy / mag) * max]
    return [vx, vy]
  }

  function setMag(vx: number, vy: number, mag: number): [number, number] {
    const len = Math.sqrt(vx * vx + vy * vy)
    if (len === 0) return [0, 0]
    return [(vx / len) * mag, (vy / len) * mag]
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  const tick = useCallback((mouseX?: number, mouseY?: number) => {
    const boids = boidsRef.current
    if (!boids.length) return

    for (let i = 0; i < boids.length; i++) {
      const b = boids[i]

      let sepX = 0, sepY = 0, sepCount = 0
      let alignVx = 0, alignVy = 0, alignCount = 0
      let cohX = 0, cohY = 0, cohCount = 0

      for (let j = 0; j < boids.length; j++) {
        if (i === j) continue
        const other = boids[j]
        const dx = b.x - other.x
        const dy = b.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < perceptionRadius) {
          // Cohesion
          cohX += other.x
          cohY += other.y
          cohCount++

          // Alignment
          alignVx += other.vx
          alignVy += other.vy
          alignCount++

          // Separation
          if (dist < separationRadius && dist > 0) {
            sepX += (dx / dist)
            sepY += (dy / dist)
            sepCount++
          }
        }
      }

      let fx = 0, fy = 0

      // Separation
      if (sepCount > 0) {
        let [sx, sy] = setMag(sepX / sepCount, sepY / sepCount, maxSpeed)
        sx -= b.vx; sy -= b.vy
        ;[sx, sy] = limit(sx, sy, maxForce)
        fx += sx * separationWeight
        fy += sy * separationWeight
      }

      // Alignment
      if (alignCount > 0) {
        let [ax, ay] = setMag(alignVx / alignCount, alignVy / alignCount, maxSpeed)
        ax -= b.vx; ay -= b.vy
        ;[ax, ay] = limit(ax, ay, maxForce)
        fx += ax * alignmentWeight
        fy += ay * alignmentWeight
      }

      // Cohesion
      if (cohCount > 0) {
        const cx = cohX / cohCount - b.x
        const cy = cohY / cohCount - b.y
        let [cvx, cvy] = setMag(cx, cy, maxSpeed)
        cvx -= b.vx; cvy -= b.vy
        ;[cvx, cvy] = limit(cvx, cvy, maxForce)
        fx += cvx * cohesionWeight
        fy += cvy * cohesionWeight
      }

      // Boundary avoidance
      if (b.x < boundaryMargin) fx += boundaryForce * (1 - b.x / boundaryMargin)
      if (b.x > width - boundaryMargin) fx -= boundaryForce * (1 - (width - b.x) / boundaryMargin)
      if (b.y < boundaryMargin) fy += boundaryForce * (1 - b.y / boundaryMargin)
      if (b.y > height - boundaryMargin) fy -= boundaryForce * (1 - (height - b.y) / boundaryMargin)

      // Mouse repulsion
      if (mouseRepelRadius > 0 && mouseX !== undefined && mouseY !== undefined) {
        const mdx = b.x - mouseX
        const mdy = b.y - mouseY
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mdist < mouseRepelRadius && mdist > 0) {
          const strength = (1 - mdist / mouseRepelRadius) * mouseRepelForce
          fx += (mdx / mdist) * strength
          fy += (mdy / mdist) * strength
        }
      }

      b.ax = fx
      b.ay = fy
    }

    // Apply forces
    for (const b of boids) {
      b.vx += b.ax
      b.vy += b.ay
      ;[b.vx, b.vy] = limit(b.vx, b.vy, maxSpeed)
      b.x += b.vx
      b.y += b.vy
      b.phase += 0.1

      // Wrap edges
      if (b.x < -20) b.x += width + 40
      if (b.x > width + 20) b.x -= width + 40
      if (b.y < -20) b.y += height + 40
      if (b.y > height + 20) b.y -= height + 40
    }
  }, [
    perceptionRadius, separationRadius, separationWeight, alignmentWeight,
    cohesionWeight, boundaryMargin, boundaryForce, maxSpeed, maxForce,
    width, height, mouseRepelRadius, mouseRepelForce,
  ])

  const reset = useCallback(() => {
    initBoids()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, width, height])

  return { boids: boidsRef, tick, reset }
}
