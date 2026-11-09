// All sound is synthesised with WebAudio, so the game needs no asset files.
const BASS = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98];
const ARP = [440, 523.25, 659.25, 523.25, 392, 493.88, 587.33, 493.88];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.lastPlayed = Object.create(null);
    this.bgmPlaying = false;
    this.bgmStep = 0;
    this.bgmNext = 0;
    this.bgmStepDur = 60 / 144 / 2;
  }

  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(ctx.destination);
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0.3;
    this.bgmGain.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, dur, type, gain, slideTo, when, dest) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, gain, type, freq, when, q, dest) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const t0 = when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 1;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const gap = {
      shot: 0.07, hit: 0.06, graze: 0.06, explosion: 0.045, phase: 0.2,
      warning: 0.5, death: 0.4, bomb: 0.3, clear: 1, gameover: 1, enemyshot: 0.1,
    }[name] || 0.03;
    if (this.lastPlayed[name] && now - this.lastPlayed[name] < gap) return;
    this.lastPlayed[name] = now;

    switch (name) {
      case 'shot':
        this.tone(1250, 0.045, 'square', 0.025, 820);
        break;
      case 'hit':
        this.noise(0.035, 0.05, 'highpass', 2600);
        break;
      case 'graze':
        this.tone(1750, 0.05, 'sine', 0.05, 2300);
        break;
      case 'enemyshot':
        this.tone(420, 0.09, 'triangle', 0.03, 300);
        break;
      case 'explosion':
        this.noise(0.32, 0.14, 'lowpass', 900);
        this.tone(160, 0.25, 'sawtooth', 0.07, 45);
        break;
      case 'death':
        this.tone(500, 0.6, 'sawtooth', 0.14, 50);
        this.noise(0.5, 0.12, 'lowpass', 700);
        break;
      case 'bomb':
        this.tone(220, 0.55, 'sine', 0.16, 40);
        this.noise(0.5, 0.12, 'bandpass', 1200, undefined, 1.4);
        break;
      case 'phase':
        this.tone(660, 0.12, 'square', 0.06);
        this.tone(990, 0.18, 'square', 0.055, undefined, ctx.currentTime + 0.1);
        break;
      case 'warning':
        this.tone(330, 0.22, 'square', 0.07);
        this.tone(330, 0.22, 'square', 0.07, undefined, ctx.currentTime + 0.3);
        break;
      case 'clear':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(f, 0.28, 'triangle', 0.09, undefined, ctx.currentTime + i * 0.12);
        });
        break;
      case 'gameover':
        [440, 349.23, 261.63, 174.61].forEach((f, i) => {
          this.tone(f, 0.4, 'sawtooth', 0.09, undefined, ctx.currentTime + i * 0.16);
        });
        break;
      default:
        break;
    }
  }

  startBgm() {
    if (!this.init()) return;
    this.resume();
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.bgmNext = this.ctx.currentTime + 0.08;
  }

  stopBgm() {
    this.bgmPlaying = false;
  }

  update() {
    if (!this.ctx || !this.bgmPlaying || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.bgmNext < now) this.bgmNext = now + 0.05;
    const horizon = now + 0.18;
    let guard = 0;
    while (this.bgmNext < horizon && guard++ < 32) {
      this.scheduleStep(this.bgmStep, this.bgmNext);
      this.bgmStep = (this.bgmStep + 1) % 32;
      this.bgmNext += this.bgmStepDur;
    }
  }

  scheduleStep(step, when) {
    const dest = this.bgmGain;
    if (step % 4 === 0) {
      this.tone(BASS[(step / 4) % 8], 0.26, 'triangle', 0.5, undefined, when, dest);
    }
    if (step % 2 === 0) {
      const n = ARP[(step + Math.floor(step / 8)) % 8];
      this.tone(n, 0.1, 'square', 0.1, undefined, when, dest);
    }
    if (step % 4 === 2) {
      this.noise(0.04, 0.09, 'highpass', 6000, when, 1, dest);
    }
    if (step % 8 === 0) {
      this.tone(120, 0.16, 'sine', 0.4, 45, when, dest);
    }
  }
}
