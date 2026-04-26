/**
 * MobileTouchAdapter.ts
 * Injects mobile touch controls into AI-generated arcade game iframes.
 * Supports: swipe, tap, D-pad overlay, virtual joystick.
 */

type ControlType = 'swipe' | 'tap' | 'dpad' | 'joystick' | 'auto';

interface TouchAdapterOptions {
  controlType?: ControlType;
  swipeThreshold?: number;  // px minimum for swipe recognition
  joystickSize?: number;    // px diameter
  opacity?: number;
  position?: 'left' | 'right' | 'center';
}

interface SwipeState {
  startX: number; startY: number;
  startTime: number;
}

export class MobileTouchAdapter {
  private container: HTMLElement;
  private options: Required<TouchAdapterOptions>;
  private overlay: HTMLElement | null = null;
  private swipeState: SwipeState | null = null;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };

  constructor(container: HTMLElement | null, options: TouchAdapterOptions = {}) {
    this.container = container ?? document.body;
    this.options = {
      controlType:    options.controlType    ?? 'auto',
      swipeThreshold: options.swipeThreshold ?? 30,
      joystickSize:   options.joystickSize   ?? 120,
      opacity:        options.opacity        ?? 0.7,
      position:       options.position       ?? 'center',
    };
    if (this.isMobile()) this.init();
  }

  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;
  }

  private init() {
    const type = this.options.controlType === 'auto'
      ? this.detectBestControl()
      : this.options.controlType;

    switch (type) {
      case 'swipe':    this.initSwipe();    break;
      case 'dpad':     this.initDPad();     break;
      case 'joystick': this.initJoystick(); break;
      case 'tap':      this.initTap();      break;
    }
  }

  private detectBestControl(): ControlType {
    // Check if game iframe exposes hints via data attributes
    const game = this.container.querySelector('canvas, iframe');
    const hint = game?.getAttribute('data-control-type') as ControlType | null;
    return hint ?? 'swipe';
  }

  // ── Swipe ──────────────────────────────────────────────────────────────────

  private initSwipe() {
    const el = this.container;
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.swipeState = { startX: t.clientX, startY: t.clientY, startTime: Date.now() };
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (!this.swipeState) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.swipeState.startX;
      const dy = t.clientY - this.swipeState.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < this.options.swipeThreshold) return;

      const key = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
        : (dy > 0 ? 'ArrowDown'  : 'ArrowUp');

      this.dispatchKey(key);
      this.swipeState = null;
    }, { passive: true });
  }

  // ── Tap ───────────────────────────────────────────────────────────────────

  private initTap() {
    this.container.addEventListener('touchstart', () => {
      this.dispatchKey(' ');
    }, { passive: true });
  }

  // ── D-Pad ─────────────────────────────────────────────────────────────────

  private initDPad() {
    const dpad = document.createElement('div');
    dpad.style.cssText = `
      position: fixed; bottom: 24px;
      ${this.options.position === 'right' ? 'right: 24px' : this.options.position === 'left' ? 'left: 24px' : 'left: 50%; transform: translateX(-50%)'};
      display: grid; grid-template-columns: repeat(3, 52px); grid-template-rows: repeat(3, 52px);
      gap: 4px; z-index: 9999; pointer-events: all; user-select: none;
    `;

    const buttons: [string, string, number, number][] = [
      ['↑', 'ArrowUp',    0, 1],
      ['←', 'ArrowLeft',  1, 0],
      ['↓', 'ArrowDown',  2, 1],
      ['→', 'ArrowRight', 1, 2],
    ];

    buttons.forEach(([label, key, row, col]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        grid-row: ${row + 1}; grid-column: ${col + 1};
        background: rgba(255,255,255,${this.options.opacity * 0.15});
        border: 2px solid rgba(255,255,255,${this.options.opacity * 0.5});
        border-radius: 8px; color: #fff; font-size: 20px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      `;

      const fire = () => this.dispatchKey(key);
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); fire(); }, { passive: false });
      btn.addEventListener('mousedown', fire);
      dpad.appendChild(btn);
    });

    document.body.appendChild(dpad);
    this.overlay = dpad;
  }

  // ── Joystick ──────────────────────────────────────────────────────────────

  private initJoystick() {
    const size = this.options.joystickSize;
    const zone = document.createElement('div');
    zone.style.cssText = `
      position: fixed; bottom: 24px; left: 24px;
      width: ${size}px; height: ${size}px;
      background: rgba(255,255,255,${this.options.opacity * 0.1});
      border: 2px solid rgba(255,255,255,${this.options.opacity * 0.4});
      border-radius: 50%; z-index: 9999; pointer-events: all; user-select: none;
    `;

    const knob = document.createElement('div');
    const knobSize = size * 0.45;
    knob.style.cssText = `
      position: absolute; width: ${knobSize}px; height: ${knobSize}px;
      background: rgba(255,255,255,${this.options.opacity * 0.6});
      border-radius: 50%; top: 50%; left: 50%;
      transform: translate(-50%, -50%); transition: none;
      pointer-events: none;
    `;
    zone.appendChild(knob);
    document.body.appendChild(zone);
    this.overlay = zone;

    let lastKey = '';
    const MAX_DIST = size * 0.35;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = zone.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.joystickActive = true;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;
      const t  = e.touches[0];
      const dx = t.clientX - this.joystickCenter.x;
      const dy = t.clientY - this.joystickCenter.y;
      const dist = Math.min(Math.hypot(dx, dy), MAX_DIST);
      const angle = Math.atan2(dy, dx);
      const nx = Math.cos(angle) * dist;
      const ny = Math.sin(angle) * dist;
      knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;

      const key = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
        : (dy > 0 ? 'ArrowDown'  : 'ArrowUp');

      if (key !== lastKey) { this.dispatchKey(key); lastKey = key; }
    }, { passive: false });

    const reset = () => {
      this.joystickActive = false;
      lastKey = '';
      knob.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('touchend', reset, { passive: true });
    zone.addEventListener('touchcancel', reset, { passive: true });
  }

  // ── Key dispatch ──────────────────────────────────────────────────────────

  private dispatchKey(key: string) {
    const target = document.querySelector('canvas') ?? document.body;
    ['keydown', 'keyup'].forEach(type => {
      target.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
    });
  }

  destroy() {
    this.overlay?.remove();
    this.overlay = null;
  }

  /** Returns injection code string for inserting into AI-generated game HTML */
  static getInjectionCode(controlType: ControlType = 'swipe'): string {
    return `
<script>
(function() {
  const adapter = { controlType: '${controlType}', threshold: 30 };
  let sx, sy;
  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.hypot(dx, dy) < adapter.threshold) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      return;
    }
    const key = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
      : (dy > 0 ? 'ArrowDown'  : 'ArrowUp');
    ['keydown','keyup'].forEach(t =>
      document.dispatchEvent(new KeyboardEvent(t, { key, bubbles: true }))
    );
  }, { passive: true });
})();
</script>`;
  }
}
