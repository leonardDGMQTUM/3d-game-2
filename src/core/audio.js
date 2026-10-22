// Procedural ambience: wind, birdsong by day, crickets by night, a discovery chime.
// Everything is synthesised with WebAudio, so there are no sound files.
export class Ambience {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
    this.nextChirp = 0;
    this.nextCricket = 0;
  }

  // Must be called from a user gesture (browsers block autoplay).
  start() {
    if (this.ctx) {
      this.ctx.resume?.();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    // Wind: looping brown-ish noise through a slowly wandering low-pass filter.
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 500;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.25;
    src.connect(this.windFilter).connect(this.windGain).connect(this.master);
    src.start();
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  suspend() {
    this.ctx?.suspend?.();
  }

  resume() {
    this.ctx?.resume?.();
  }

  update(dt, { night, day, altitude, swimming }) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.07 + 1);
    const alt = Math.min(1, Math.max(0, altitude / 70));
    this.windFilter.frequency.setTargetAtTime(300 + gust * 500 + alt * 700, t, 0.5);
    this.windGain.gain.setTargetAtTime((swimming ? 0.12 : 0.16) + gust * 0.12 + alt * 0.25, t, 0.5);

    if (day > 0.5 && altitude < 40 && t > this.nextChirp) {
      this.chirp(t);
      this.nextChirp = t + 1.5 + Math.random() * 5;
    }
    if (night > 0.6 && altitude < 30 && t > this.nextCricket) {
      this.cricket(t);
      this.nextCricket = t + 0.6 + Math.random() * 1.6;
    }
  }

  chirp(t) {
    const ctx = this.ctx;
    const base = 2200 + Math.random() * 2000;
    const notes = 2 + Math.floor(Math.random() * 4);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      pan.connect(this.master);
    }
    for (let i = 0; i < notes; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const st = t + i * (0.09 + Math.random() * 0.05);
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), st);
      o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.4), st + 0.07);
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.045, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, st + 0.09);
      o.connect(g).connect(pan || this.master);
      o.start(st);
      o.stop(st + 0.1);
    }
  }

  cricket(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 4200 + Math.random() * 600;
    g.gain.value = 0;
    for (let i = 0; i < 4; i++) {
      const st = t + i * 0.05;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.018, st + 0.012);
      g.gain.linearRampToValueAtTime(0, st + 0.035);
    }
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }

  chime() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      const st = t + i * 0.12;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.12, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 1.2);
      o.connect(g).connect(this.master);
      o.start(st);
      o.stop(st + 1.3);
    });
  }
}
