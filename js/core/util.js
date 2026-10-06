// NYAPOTISM! — core utilities: seeded RNG, number formatting, small helpers.
// Every file attaches to globalThis.NYA so the same code runs in the browser
// (plain <script> tags, works from file://) and in the Node balance harness.
(function (NYA) {
  'use strict';

  // ---------- Seeded RNG (sfc32 seeded by xmur3) ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  class RNG {
    constructor(seed) {
      if (Array.isArray(seed)) { this.s = seed.map(v => v >>> 0); return; }
      const f = xmur3(String(seed));
      this.s = [f(), f(), f(), f()];
      for (let i = 0; i < 12; i++) this.next();
    }
    next() {
      let a = this.s[0] >>> 0, b = this.s[1] >>> 0, c = this.s[2] >>> 0, d = this.s[3] >>> 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      this.s[0] = a; this.s[1] = b; this.s[2] = c; this.s[3] = d;
      return (t >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    // entries: [[value, weight], ...]
    weighted(entries) {
      let total = 0;
      for (const e of entries) total += e[1];
      let r = this.next() * total;
      for (const e of entries) { r -= e[1]; if (r < 0) return e[0]; }
      return entries[entries.length - 1][0];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    state() { return this.s.slice(); }
  }
  NYA.RNG = RNG;
  NYA.hashStr = function (s) { return xmur3(String(s))(); };

  // ---------- Number formatting ----------
  const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  NYA.settingsRef = { sci: false };
  function fmt(n, opts) {
    if (n === undefined || n === null || Number.isNaN(n)) return '0';
    if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (n < 1000) {
      if (opts === 'int' || Number.isInteger(n)) s = String(Math.floor(n));
      else if (n < 10) s = (Math.floor(n * 100) / 100).toFixed(n < 1 ? 2 : 1).replace(/\.0$/, '');
      else if (n < 100) s = (Math.floor(n * 10) / 10).toFixed(1).replace(/\.0$/, '');
      else s = String(Math.floor(n));
    } else {
      const e3 = Math.floor(Math.log10(n) / 3);
      if (e3 < SUFFIX.length && !NYA.settingsRef.sci) {
        const m = n / Math.pow(10, e3 * 3);
        s = (m < 10 ? (Math.floor(m * 100) / 100).toFixed(2) : m < 100 ? (Math.floor(m * 10) / 10).toFixed(1) : String(Math.floor(m))) + SUFFIX[e3];
      } else {
        const e = Math.floor(Math.log10(n));
        const m = n / Math.pow(10, e);
        s = (Math.floor(m * 100) / 100).toFixed(2) + 'e' + e;
      }
    }
    return neg ? '-' + s : s;
  }
  NYA.fmt = fmt;
  NYA.fmtPct = function (x, dp) { return (x * 100).toFixed(dp === undefined ? 0 : dp) + '%'; };
  NYA.fmtMult = function (x) { return '×' + (x < 100 ? (Math.round(x * 100) / 100) : fmt(x)); };
  NYA.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    return m + ':' + String(s).padStart(2, '0');
  };

  // ---------- Small helpers ----------
  NYA.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  NYA.lerp = (a, b, t) => a + (b - a) * t;
  NYA.esc = function (s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  // Fill a template "{name} found {thing}" from a dictionary.
  NYA.fill = function (tpl, dict) {
    return tpl.replace(/\{(\w+)\}/g, (m, k) => (dict[k] !== undefined ? dict[k] : m));
  };
  NYA.TICK = 0.05; // fixed simulation timestep (20 ticks per second)
})(globalThis.NYA = globalThis.NYA || {});
