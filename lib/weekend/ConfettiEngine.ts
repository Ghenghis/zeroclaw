/**
 * ConfettiEngine.ts
 * Canvas-overlay particle burst system.
 * API: confetti.burst(options) — call from anywhere after game events.
 */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  angle: number; spin: number;
  size: number;
  color: string;
  shape: 'rect' | 'circle';
  alpha: number;
  decay: number;
}

interface BurstOptions {
  x?: number;           // origin X (default: center)
  y?: number;           // origin Y (default: 40% from top)
  count?: number;       // particle count (default: 80)
  spread?: number;      // launch angle spread in degrees (default: 360)
  colors?: string[];
  gravity?: number;
  scalar?: number;      // size multiplier
}

const DEFAULT_COLORS = [
  '#ff0080', '#00ffff', '#ffd700', '#00ff88',
  '#ff4400', '#8800ff', '#ffffff', '#ff88cc',
];

export class ConfettiEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rafId = 0;
  private running = false;

  private ensureCanvas() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '99999',
    });
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => {
      if (this.canvas) {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    });
  }

  burst(options: BurstOptions = {}) {
    this.ensureCanvas();
    const {
      x       = window.innerWidth  * 0.5,
      y       = window.innerHeight * 0.4,
      count   = 80,
      colors  = DEFAULT_COLORS,
      gravity = 0.35,
      scalar  = 1,
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const speed = 4 + Math.random() * 8;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 8,
        size: (6 + Math.random() * 8) * scalar,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        alpha: 1,
        decay: 0.012 + Math.random() * 0.008,
      });
    }

    if (!this.running) this.startLoop(gravity);
  }

  /** Celebration burst from two cannons — top left + top right */
  celebrate(options: BurstOptions = {}) {
    const w = window.innerWidth;
    this.burst({ ...options, x: w * 0.1, y: window.innerHeight * 0.3, count: 60 });
    setTimeout(() => {
      this.burst({ ...options, x: w * 0.9, y: window.innerHeight * 0.3, count: 60 });
    }, 200);
  }

  private startLoop(gravity: number) {
    this.running = true;
    const tick = () => {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vy    += gravity * 0.016 * 60 * 0.016; // frame-rate independent
        p.x     += p.vx;
        p.y     += p.vy;
        p.angle += p.spin;
        p.alpha -= p.decay;
        p.vx    *= 0.99; // slight air resistance

        if (p.alpha <= 0) { this.particles.splice(i, 1); continue; }

        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle   = p.color;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle * Math.PI / 180);

        if (p.shape === 'rect') {
          this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        this.running = false;
        cancelAnimationFrame(this.rafId);
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.canvas?.remove();
    this.canvas = null;
    this.ctx    = null;
    this.particles = [];
    this.running = false;
  }
}
