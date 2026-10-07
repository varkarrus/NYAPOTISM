// Synthesized audio (GDD §22.2): city-pop loop per mine + SFX. No asset files.
(function (NYA) {
  'use strict';

  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  // progressions: [rootOffset, quality] — quality: M7, m7, 7, sus
  const PROGS = {
    burrow: [[0, 'M7'], [9, 'm7'], [2, 'm7'], [7, 'sus']],
    quarry: [[5, 'M7'], [7, '7'], [4, 'm7'], [9, 'm7']],   // the "royal road" — very city pop
    yarn: [[2, 'm7'], [7, '7'], [0, 'M7'], [9, 'm7']],
    menu: [[5, 'M7'], [4, 'm7'], [2, 'm7'], [0, 'M7']],
    dairy: [[0, 'M7'], [5, 'M7'], [2, 'm7'], [7, 'sus']],
    sushi: [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, '7']],   // breezy seaside city pop
    maze: [[9, 'm7'], [5, 'M7'], [7, '7'], [4, '7']],     // sneaky minor-key chase
  };
  const CHORD = { M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], sus: [0, 5, 7, 10] };

  class Audio {
    constructor(settings) {
      this.settings = settings;
      this.ctx = null; this.ready = false;
      this.theme = 'burrow'; this.bpm = 98; this.key = 0;
      this.step = 0; this.nextT = 0; this.ducked = false;
      this.musicOn = true;
      // focus tracking for the "mute when unfocused" mode
      this.focused = typeof document !== 'undefined' && document.hasFocus ? document.hasFocus() : true;
      if (typeof window !== 'undefined') {
        const upd = () => { this.focused = !document.hidden && document.hasFocus(); this.applyVolumes(); };
        window.addEventListener('focus', upd);
        window.addEventListener('blur', upd);
        document.addEventListener('visibilitychange', upd);
      }
    }
    // mode: 'on' | 'unfocused' (mute when the window isn't focused) | 'off'
    chanOn(kind) {
      const mode = this.settings[kind + 'Mode'] || 'on';
      if (mode === 'off') return false;
      if (mode === 'unfocused' && !this.focused) return false;
      return true;
    }
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
      this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -16; this.comp.ratio.value = 4;
      this.comp.connect(this.master);
      this.sfxGain = ctx.createGain(); this.sfxGain.connect(this.comp);
      this.musicGain = ctx.createGain(); this.musicGain.connect(this.comp);
      // shared reverb-ish delay for the music
      this.delay = ctx.createDelay(1); this.delay.delayTime.value = 0.28;
      this.fb = ctx.createGain(); this.fb.gain.value = 0.28;
      this.dlp = ctx.createBiquadFilter(); this.dlp.type = 'lowpass'; this.dlp.frequency.value = 2200;
      this.delay.connect(this.dlp); this.dlp.connect(this.fb); this.fb.connect(this.delay);
      this.wet = ctx.createGain(); this.wet.gain.value = 0.25; this.dlp.connect(this.wet); this.wet.connect(this.musicGain);
      // noise buffer
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.ready = true;
      this.nextT = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 50);
    }
    applyVolumes() {
      if (!this.ctx) return;
      const s = this.settings;
      const t = this.ctx.currentTime;
      this.sfxGain.gain.setTargetAtTime(this.chanOn('sfx') ? s.sfx * 0.7 : 0, t, 0.05);
      this.musicGain.gain.setTargetAtTime(this.ducked || !this.chanOn('music') ? 0 : s.music * 0.55, t, this.ducked ? 0.4 : 0.1);
    }
    duck(on) { this.ducked = on; this.applyVolumes(); }
    setTheme(key, bpm, root) {
      this.theme = PROGS[key] ? key : 'burrow';
      this.bpm = bpm || 100; this.key = root || 0;
    }

    // ------------------------------------------------------------ primitives
    osc(type, freq, t0, dur, vol, dest, opts) {
      const ctx = this.ctx;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (opts && opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + (opts.slideT || dur));
      if (opts && opts.detune) o.detune.value = opts.detune;
      const a = (opts && opts.a) || 0.004;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      let out = g;
      if (opts && opts.filter) {
        const f = ctx.createBiquadFilter(); f.type = opts.filter; f.frequency.value = opts.ff || 1000; f.Q.value = opts.q || 1;
        if (opts.fslide) f.frequency.exponentialRampToValueAtTime(opts.fslide, t0 + dur);
        g.connect(f); out = f;
      }
      out.connect(dest || this.sfxGain);
      o.start(t0); o.stop(t0 + dur + 0.02);
      return o;
    }
    noiseHit(t0, dur, vol, type, freq, dest, q, fslide) {
      const ctx = this.ctx;
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      s.playbackRate.value = 0.8 + Math.random() * 0.4;
      const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1000; f.Q.value = q || 0.8;
      if (fslide) f.frequency.exponentialRampToValueAtTime(fslide, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
      s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
    }
    // 2-op FM electric piano (DX7-ish) — the city pop sound
    ep(freq, t0, dur, vol, dest) {
      const ctx = this.ctx;
      const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
      car.frequency.value = freq; mod.frequency.value = freq * 1.0;
      mg.gain.setValueAtTime(freq * 2.2, t0); mg.gain.exponentialRampToValueAtTime(freq * 0.15, t0 + 0.25);
      mod.connect(mg); mg.connect(car.frequency);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(vol * 0.35, t0 + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      car.connect(g); g.connect(dest); g.connect(this.delay);
      car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
    }

    // ------------------------------------------------------------ music
    schedule() {
      if (!this.ctx || !this.musicOn) return;
      const ctx = this.ctx;
      if (this.nextT < ctx.currentTime - 0.5) this.nextT = ctx.currentTime + 0.05;
      const sixteenth = 60 / this.bpm / 4;
      while (this.nextT < ctx.currentTime + 0.15) {
        this.playStep(this.step, this.nextT, sixteenth);
        this.step = (this.step + 1) % 256;
        // swing the off-sixteenths a touch
        this.nextT += sixteenth * (this.step % 2 ? 1.08 : 0.92);
      }
    }
    playStep(step, t, s16) {
      if (this.settings.music <= 0.001 || this.ducked || !this.chanOn('music')) return;
      const dest = this.musicGain;
      const prog = PROGS[this.theme];
      const bar = Math.floor(step / 16), pos = step % 16;
      const [rootOff, qual] = prog[bar % prog.length];
      const root = 48 + this.key + rootOff; // C3-ish
      const ch = CHORD[qual];
      const section = Math.floor(bar / 8) % 2; // A/B sections for variety
      // drums
      if (pos === 0 || pos === 8 || (pos === 10 && section)) this.kick(t, dest);
      if (pos === 4 || pos === 12) this.snare(t, dest);
      if (pos % 2 === 0) this.noiseHit(t, 0.04, pos % 4 === 2 ? 0.09 : 0.05, 'highpass', 7000, dest);
      if (pos === 14 && bar % 2) this.noiseHit(t, 0.12, 0.05, 'highpass', 5000, dest);
      // bass: funky octave pattern
      const bassPat = section ? [0, -1, 12, -1, -1, 0, -1, 7, 0, -1, 12, -1, 10, -1, 7, -1] : [0, -1, -1, 0, -1, -1, 12, -1, 0, -1, -1, 7, -1, 10, 12, -1];
      const bn = bassPat[pos];
      if (bn >= 0) this.osc('sawtooth', NOTE(root - 12 + bn), t, s16 * 1.6, 0.16, dest, { filter: 'lowpass', ff: 900, fslide: 200, q: 4 });
      // EP chord stabs (syncopated)
      const stab = section ? [2, 6, 10, 14] : [0, 3, 6, 10, 14];
      if (stab.indexOf(pos) >= 0) {
        for (const iv of ch) this.ep(NOTE(root + 12 + iv), t, s16 * (pos === 0 ? 6 : 2.5), 0.035, dest);
      }
      // sparkle arpeggio on alternate bars
      if (bar % 4 >= 2 && pos % 2 === 0) {
        const n = ch[(pos / 2) % 4] + (pos >= 8 ? 24 : 12);
        this.osc('sine', NOTE(root + 12 + n), t, s16 * 2, 0.025, dest, { a: 0.003 });
      }
      // a pad on bar starts
      if (pos === 0) for (const iv of ch) this.osc('triangle', NOTE(root + iv + 12), t, s16 * 15, 0.014, dest, { a: 0.3, detune: (Math.random() - 0.5) * 12 });
    }
    kick(t, dest) { this.osc('sine', 150, t, 0.22, 0.5, dest, { slide: 42, slideT: 0.12 }); }
    snare(t, dest) { this.noiseHit(t, 0.16, 0.22, 'bandpass', 1800, dest, 0.7); this.osc('triangle', 220, t, 0.08, 0.12, dest, { slide: 160 }); }

    // ------------------------------------------------------------ sfx
    sfx(name, a, b) {
      if (!this.ready || this.settings.sfx <= 0.001 || !this.chanOn('sfx')) return;
      const t = this.ctx.currentTime + 0.005;
      const T = NYA.T;
      switch (name) {
        case 'tink':
          if (a === T.DIRT) this.noiseHit(t, 0.06, 0.25, 'lowpass', 700);
          else { this.osc('square', a === T.HARD ? 1500 : 1100 + Math.random() * 120, t, 0.05, 0.05, null, { filter: 'bandpass', ff: 2200 }); this.noiseHit(t, 0.03, 0.12, 'highpass', 3000); }
          break;
        case 'heavy': {
          // a deeper, beefier swing for folded techniques
          const f = Math.min(6, b || 1);
          if (a === T.DIRT) this.noiseHit(t, 0.1, 0.32, 'lowpass', 500 - f * 40);
          else { this.osc('square', 700 - f * 70, t, 0.08, 0.06, null, { filter: 'bandpass', ff: 1500 - f * 120 }); this.noiseHit(t, 0.06, 0.18, 'bandpass', 1400 - f * 100); }
          this.osc('sine', 140 - f * 10, t, 0.12, 0.18, null, { slide: 60 });
          break;
        }
        case 'crit':
          this.osc('triangle', 600, t, 0.12, 0.18, null, { slide: 1500 });
          this.osc('square', 900, t + 0.05, 0.08, 0.06);
          break;
        case 'break': this.noiseHit(t, 0.14, 0.3, 'bandpass', a === T.DIRT ? 500 : 1200, null, 1, 200); break;
        case 'break_ore': this.noiseHit(t, 0.12, 0.25, 'bandpass', 1400, null, 1, 300); this.osc('sine', 1760, t + 0.03, 0.3, 0.08); break;
        case 'crack': this.noiseHit(t, 0.08, 0.25, 'highpass', 1500 + Math.random() * 1500); this.osc('square', 300 + Math.random() * 300, t, 0.05, 0.05); break;
        case 'ore': {
          const scale = [0, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
          const n = scale[Math.min(11, a || 1)];
          this.osc('sine', NOTE(n), t, 0.35, 0.12, null, { a: 0.003 });
          this.osc('sine', NOTE(n + 12), t, 0.2, 0.04, null, { a: 0.003 });
          break;
        }
        case 'drop': this.osc('square', NOTE(83), t, 0.07, 0.06); this.osc('square', NOTE(88), t + 0.07, 0.16, 0.06); break;
        case 'mew': case 'nya': {
          const o = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
          o.type = 'sawtooth';
          const p = name === 'nya' ? 1.3 : 1;
          o.frequency.setValueAtTime(500 * p, t); o.frequency.linearRampToValueAtTime(750 * p, t + 0.08); o.frequency.linearRampToValueAtTime(420 * p, t + 0.26);
          f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.1); f.frequency.linearRampToValueAtTime(1000, t + 0.26);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(name === 'nya' ? 0.05 : 0.09, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          o.connect(f); f.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.32);
          break;
        }
        case 'flop': this.osc('sine', 700, t, 0.45, 0.12, null, { slide: 160 }); break;
        case 'levelup': [72, 76, 79, 84].forEach((n, k) => this.osc('square', NOTE(n), t + k * 0.06, 0.12, 0.07)); break;
        case 'trait': [79, 83, 86, 91, 95].forEach((n, k) => this.osc('sine', NOTE(n), t + k * 0.07, 0.4, 0.09)); this.noiseHit(t, 0.3, 0.1, 'highpass', 4000, null, 1, 9000); break;
        case 'legendary': [72, 76, 79, 84, 88, 91, 96].forEach((n, k) => { this.osc('square', NOTE(n), t + k * 0.08, 0.3, 0.06); this.osc('sine', NOTE(n + 12), t + k * 0.08, 0.5, 0.05); }); break;
        case 'motherlode':
          [60, 64, 67, 72, 76, 79, 84].forEach((n, k) => this.osc('square', NOTE(n), t + k * 0.07, 0.25, 0.07));
          [60, 64, 67, 71].forEach(n => this.osc('sawtooth', NOTE(n), t + 0.55, 1.0, 0.05, null, { filter: 'lowpass', ff: 2500 }));
          break;
        case 'hum': this.osc('sine', 110, t, 0.8, 0.12, null, { a: 0.1 }); this.osc('sine', 165, t, 0.8, 0.06, null, { a: 0.1 }); break;
        case 'skein': {
          const mel = [84, 88, 91, 96, 95, 91, 88, 91, 93, 89, 84];
          mel.forEach((n, k) => { this.osc('sine', NOTE(n), t + 0.3 + k * 0.22, 0.6, 0.12, null, { a: 0.002 }); this.osc('sine', NOTE(n + 12), t + 0.3 + k * 0.22, 0.3, 0.03); });
          break;
        }
        case 'empty': this.osc('sawtooth', NOTE(55), t, 0.3, 0.06, null, { filter: 'lowpass', ff: 900 }); this.osc('sawtooth', NOTE(51), t + 0.3, 0.6, 0.06, null, { filter: 'lowpass', ff: 900, slide: NOTE(49) }); break;
        case 'fullclear': [72, 76, 79, 83, 84].forEach((n, k) => this.osc('square', NOTE(n), t + k * 0.08, 0.3, 0.07)); break;
        case 'stamp': this.osc('sine', 120, t, 0.18, 0.4, null, { slide: 50 }); this.noiseHit(t, 0.08, 0.3, 'lowpass', 1200); break;
        case 'laser': this.osc('sine', 2400, t, 0.06, 0.035, null, { slide: 1300 }); break;
        case 'drone': this.osc('sine', 1600, t, 0.05, 0.025, null, { slide: 1000 }); break;
        case 'throw': this.noiseHit(t, 0.4, 0.12, 'bandpass', 600, null, 2, 2400); break;
        case 'boom': this.noiseHit(t, 0.9, 0.6, 'lowpass', 900, null, 0.7, 80); this.osc('sine', 120, t, 0.6, 0.5, null, { slide: 35 }); break;
        case 'puff': this.noiseHit(t, 0.35, 0.12, 'highpass', 2500, null, 0.5, 900); break;
        case 'squeak': { // a: 0 nibble, 1 nest, 2 theft, 3 knocked out
          const base = [1900, 1600, 2300, 2100][a || 0];
          this.osc('sine', base, t, 0.07, 0.05, null, { slide: base * 1.35 });
          if (a === 3) this.osc('sine', base * 1.2, t + 0.06, 0.1, 0.04, null, { slide: base * 0.6 });
          if (a === 1) this.osc('sine', base * 1.15, t + 0.09, 0.06, 0.04, null, { slide: base * 1.5 });
          break;
        }
        case 'pew': this.noiseHit(t, 0.05, 0.08, 'bandpass', 900, null, 2, 400); this.osc('triangle', 520, t, 0.08, 0.05, null, { slide: 260 }); break;
        case 'splash':
          this.noiseHit(t, 0.4, 0.16, 'lowpass', 1400, null, 0.6, 300);
          for (let k = 0; k < 4; k++) this.osc('sine', NOTE(76 - k * 3), t + 0.05 + k * 0.06, 0.08, 0.05);
          break;
        case 'tuna':
          for (let k = 0; k < 10; k++) this.noiseHit(t + k * 0.045, 0.03, 0.2, 'bandpass', 3000 + k * 120, null, 4);
          this.osc('sine', NOTE(93), t + 0.5, 0.5, 0.12);
          break;
        case 'sonar': this.osc('sine', 1500, t, 0.5, 0.1); this.osc('sine', 1500, t + 0.25, 0.4, 0.04); break;
        case 'claw': this.osc('square', 110, t, 0.6, 0.05, null, { slide: 160, filter: 'lowpass', ff: 600 }); break;
        case 'mewclear':
          this.noiseHit(t, 2.5, 0.8, 'lowpass', 1200, null, 0.7, 40);
          this.osc('sine', 90, t, 2.2, 0.6, null, { slide: 25 });
          break;
        case 'treat': for (let k = 0; k < 6; k++) this.noiseHit(t + k * 0.05, 0.04, 0.12, 'highpass', 4000 + Math.random() * 3000); break;
        case 'fax': {
          for (let k = 0; k < 14; k++) this.osc('square', 1200 + Math.random() * 1800, t + k * 0.05, 0.045, 0.025);
          this.noiseHit(t, 0.75, 0.06, 'bandpass', 3000, null, 3);
          break;
        }
        case 'buy': this.osc('sine', NOTE(88), t, 0.12, 0.08); this.osc('sine', NOTE(95), t + 0.07, 0.25, 0.08); break;
        case 'deny': this.osc('square', 180, t, 0.12, 0.05); break;
        case 'click': this.osc('sine', 1200, t, 0.03, 0.04); break;
        case 'whistle': this.osc('sine', 2100, t, 0.6, 0.1, null, { a: 0.02 }); break;
        case 'harisen': this.noiseHit(t, 0.1, 0.5, 'highpass', 1500); this.osc('sine', 200, t, 0.1, 0.3, null, { slide: 80 }); break;
        case 'research': [67, 71, 74, 79].forEach((n, k) => this.osc('triangle', NOTE(n), t + k * 0.08, 0.25, 0.08)); break;
        case 'novel': [76, 81, 88].forEach((n, k) => this.osc('sine', NOTE(n), t + k * 0.06, 0.35, 0.08)); break;
        case 'eyecatch': [79, 84, 88, 91].forEach((n, k) => this.ep(NOTE(n), t + k * 0.12, 0.6, 0.06, this.sfxGain)); break;
        case 'montage': [60, 67, 72, 76, 79, 84].forEach((n, k) => this.osc('sawtooth', NOTE(n), t + k * 0.12, 0.35, 0.05, null, { filter: 'lowpass', ff: 3000 })); break;
        case 'blend': [67, 66, 67, 70, 72].forEach((n, k) => this.osc('square', NOTE(n), t + k * 0.1, 0.12, 0.05)); break;
      }
    }
  }
  NYA.Audio = Audio;
})(globalThis.NYA = globalThis.NYA || {});
