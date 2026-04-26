/**
 * WebAudioSynthesizer.ts
 * Pure Web Audio API sound synthesis — no external files required.
 * 15 sound types covering all ZeroClaw arcade game needs.
 */

type SoundType =
  | 'eat' | 'powerup' | 'gameover' | 'levelup' | 'jump'
  | 'coin' | 'hit' | 'explode' | 'laser' | 'flap'
  | 'score' | 'die' | 'whack' | 'combo' | 'fanfare';

export class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.6;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private dest(): AudioNode {
    this.getCtx();
    return this.masterGain!;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }

  play(type: SoundType): void {
    if (this.muted) return;
    try {
      switch (type) {
        case 'eat':      this.playEat();      break;
        case 'powerup':  this.playPowerup();  break;
        case 'gameover': this.playGameover(); break;
        case 'levelup':  this.playLevelup();  break;
        case 'jump':     this.playJump();     break;
        case 'coin':     this.playCoin();     break;
        case 'hit':      this.playHit();      break;
        case 'explode':  this.playExplode();  break;
        case 'laser':    this.playLaser();    break;
        case 'flap':     this.playFlap();     break;
        case 'score':    this.playScore();    break;
        case 'die':      this.playDie();      break;
        case 'whack':    this.playWhack();    break;
        case 'combo':    this.playCombo();    break;
        case 'fanfare':  this.playFanfare();  break;
      }
    } catch {
      // Audio context blocked — ignore silently
    }
  }

  // ── Tone helper ─────────────────────────────────────────────────────────────

  private tone(
    freq: number, duration: number, type: OscillatorType = 'sine',
    gainEnv?: (g: GainNode, ctx: AudioContext, t: number) => void
  ) {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest());
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    if (gainEnv) {
      gainEnv(gain, ctx, t);
    } else {
      gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    }
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // ── Noise helper ────────────────────────────────────────────────────────────

  private noise(duration: number, filterFreq: number, filterType: BiquadFilterType = 'highpass', gainPeak = 0.4) {
    const ctx = this.getCtx();
    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(gainPeak, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest());
    source.start(t);
    source.stop(t + duration);
  }

  // ── Sound Implementations ──────────────────────────────────────────────────

  private playEat() {
    // Rising tone 200→600 Hz, 100ms
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(this.dest());
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t); osc.stop(t + 0.12);
  }

  private playPowerup() {
    // Arpeggio E4-G4-B4
    [329.6, 392, 493.9].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.12, 'square'), i * 80);
    });
  }

  private playGameover() {
    // Descending A4-F4-D4-A3
    [440, 349.2, 293.7, 220].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.25, 'sawtooth'), i * 200);
    });
  }

  private playLevelup() {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.15, 'square'), i * 100);
    });
  }

  private playJump() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(this.dest());
    osc.type = 'square';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.2);
  }

  private playCoin() {
    [1200, 1600].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.08, 'triangle'), i * 60);
    });
  }

  private playHit() {
    this.noise(0.12, 300, 'bandpass', 0.5);
  }

  private playExplode() {
    this.noise(0.4, 200, 'lowpass', 0.8);
    setTimeout(() => this.noise(0.3, 100, 'lowpass', 0.4), 50);
  }

  private playLaser() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(this.dest());
    osc.type = 'sawtooth';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.25);
  }

  private playFlap() {
    this.noise(0.08, 400, 'bandpass', 0.35);
  }

  private playScore() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(this.dest());
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.2);
  }

  private playDie() {
    [440, 392, 349.2, 293.7].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, 'sine'), i * 120);
    });
  }

  private playWhack() {
    this.noise(0.05, 2000, 'highpass', 0.6);
    setTimeout(() => this.noise(0.1, 400, 'lowpass', 0.3), 20);
  }

  private playCombo() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(this.dest());
    osc.type = 'triangle';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t); osc.stop(t + 0.15);
  }

  private playFanfare() {
    const melody = [523.3, 659.3, 783.9, 1046.5, 783.9, 1046.5];
    melody.forEach((f, i) => {
      setTimeout(() => this.tone(f, i === melody.length - 1 ? 0.4 : 0.15, 'square'), i * 120);
    });
  }
}
