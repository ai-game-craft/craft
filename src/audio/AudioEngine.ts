import { CONFIG } from '../config';

const MUTE_KEY = 'craft.muted';

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain: number;
  delay?: number;
}

interface NoiseOpts {
  dur: number;
  freq: number;
  to?: number;
  q?: number;
  gain: number;
  delay?: number;
  filter?: BiquadFilterType;
}

/**
 * All sound is synthesised on the fly with WebAudio — zero audio files to load,
 * which keeps the demo a single small bundle.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Must be called from a user gesture (the Play button). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : CONFIG.audio.masterVolume;
      master.connect(ctx.destination);
      this.master = master;

      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : CONFIG.audio.masterVolume,
        this.ctx.currentTime,
        0.02,
      );
    }
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* private browsing */
    }
    return this.muted;
  }

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.03);
  }

  private hiss(o: NoiseOpts): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? 'bandpass';
    filter.frequency.setValueAtTime(o.freq, t0);
    filter.Q.value = o.q ?? 1;
    if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filter).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + o.dur + 0.03);
  }

  breakBlock(hardness: number): void {
    const pitch = 1 / (0.75 + hardness * 0.22);
    this.hiss({ dur: 0.15, freq: 1500 * pitch, to: 380, q: 0.8, gain: 0.28 });
    this.tone({ freq: 190 * pitch, to: 70 * pitch, dur: 0.12, type: 'triangle', gain: 0.18 });
  }

  placeBlock(): void {
    this.hiss({ dur: 0.07, freq: 900, to: 500, q: 1.2, gain: 0.16 });
    this.tone({ freq: 320, to: 190, dur: 0.07, type: 'square', gain: 0.05 });
  }

  jump(): void {
    this.tone({ freq: 300, to: 520, dur: 0.1, type: 'sine', gain: 0.06 });
  }

  land(force: number): void {
    const g = Math.min(0.3, 0.06 + force * 0.012);
    this.tone({ freq: 130, to: 55, dur: 0.14, type: 'sine', gain: g });
    this.hiss({ dur: 0.09, freq: 420, q: 0.7, gain: g * 0.6 });
  }

  step(): void {
    this.hiss({ dur: 0.045, freq: 620, q: 1.1, gain: 0.045 });
  }

  /** Rising arpeggio — pitch climbs with the streak counter. */
  collect(streak: number): void {
    const base = 660 * Math.pow(2, Math.min(streak, 10) / 24);
    this.tone({ freq: base, dur: 0.12, type: 'sine', gain: 0.1 });
    this.tone({ freq: base * 1.26, dur: 0.12, type: 'sine', gain: 0.09, delay: 0.07 });
    this.tone({ freq: base * 1.5, dur: 0.18, type: 'sine', gain: 0.08, delay: 0.14 });
  }

  fuse(): void {
    this.hiss({ dur: 0.9, freq: 3200, q: 6, gain: 0.05 });
  }

  explode(): void {
    this.hiss({ dur: 0.75, freq: 900, to: 60, q: 0.4, gain: 0.45, filter: 'lowpass' });
    this.tone({ freq: 90, to: 28, dur: 0.6, type: 'sine', gain: 0.35 });
  }

  splash(): void {
    this.hiss({ dur: 0.3, freq: 1400, to: 300, q: 0.5, gain: 0.18 });
  }

  ui(): void {
    this.tone({ freq: 880, to: 1320, dur: 0.06, type: 'square', gain: 0.035 });
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.34, type: 'triangle', gain: 0.09, delay: i * 0.11 });
      this.tone({ freq: f * 2, dur: 0.22, type: 'sine', gain: 0.04, delay: i * 0.11 });
    });
  }
}
