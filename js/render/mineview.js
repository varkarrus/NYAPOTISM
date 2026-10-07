// Canvas renderer for the mine (GDD §22.1: readable top-down pixel art; ore, fog,
// laser marks must pop). Reads Episode state, consumes its event queue for juice.
(function (NYA) {
  'use strict';
  const T = NYA.T;

  // ---------------------------------------------------------------- textures
  function texCanvas(fn, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    const rng = new NYA.RNG('tex' + seed);
    fn(x, rng);
    return c;
  }
  const px = (x, X, Y, col, w, h) => { x.fillStyle = col; x.fillRect(X, Y, w || 1, h || 1); };

  function makeTextures(pal, key) {
    const V = 4, out = {};
    const bevel = (x, light, dark) => { px(x, 0, 0, light, 16, 1); px(x, 0, 0, light, 1, 16); px(x, 0, 15, dark, 16, 1); px(x, 15, 0, dark, 1, 16); };
    out.dirt = []; out.stone = []; out.hard = []; out.groove = []; out.bed = []; out.floor = []; out.fog = []; out.mud = []; out.rubble = []; out.rubbleLite = []; out.mudEdge = [[], [], [], []];
    for (let v = 0; v < V; v++) {
      out.dirt.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.dirt, 16, 16);
        for (let k = 0; k < 34; k++) px(x, r.int(0, 15), r.int(0, 15), r.chance(0.5) ? pal.dirt2 : pal.dirt3);
        for (let k = 0; k < 3; k++) { const a = r.int(1, 12), b = r.int(1, 12); px(x, a, b, pal.stone2, 2, 2); px(x, a + 1, b + 1, pal.stone3); }
        bevel(x, pal.dirt2, pal.dirt3);
      }, key + 'd' + v));
      out.stone.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.stone, 16, 16);
        for (let k = 0; k < 6; k++) { const a = r.int(0, 13), b = r.int(0, 13); px(x, a, b, pal.stone2, r.int(2, 4), r.int(1, 3)); }
        let cx = r.int(2, 13), cy = r.int(2, 6);
        for (let k = 0; k < 7; k++) { px(x, cx, cy, pal.stone3); cx += r.int(-1, 1); cy += 1; if (cx < 1 || cx > 14 || cy > 14) break; }
        for (let k = 0; k < 10; k++) px(x, r.int(0, 15), r.int(0, 15), pal.stone3);
        bevel(x, pal.stone2, pal.stone3);
      }, key + 's' + v));
      out.hard.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.hard, 16, 16);
        for (let k = 0; k < 3; k++) { let cx = r.int(0, 15), cy = 0; for (let s = 0; s < 18; s++) { px(x, cx, cy, pal.hard3); cx += r.chance(0.5) ? 1 : 0; cy += 1; if (cx > 15) cx = 0; } }
        for (let k = 0; k < 7; k++) px(x, r.int(1, 14), r.int(1, 14), pal.hard2, 2, 1);
        px(x, r.int(2, 13), r.int(2, 13), '#ffffff');
        bevel(x, pal.hard2, pal.hard3);
      }, key + 'h' + v));
      out.groove.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.stone, 16, 16);
        for (let k = 0; k < 8; k++) px(x, r.int(0, 15), r.int(0, 15), pal.stone3);
        for (let i = 0; i < 16; i++) { px(x, i, 5, pal.stone3); px(x, i, 6, '#fff2dc'); px(x, i, 10, pal.stone3); px(x, i, 11, '#fff2dc'); }
        bevel(x, pal.stone2, pal.stone3);
      }, key + 'g' + v));
      out.bed.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.bed, 16, 16);
        for (let k = 0; k < 4; k++) { const a = r.int(0, 11), b = r.int(0, 11), w = r.int(3, 5); px(x, a, b, pal.bed2, w, w); px(x, a, b, pal.bed3, w, 1); }
        for (let k = 0; k < 3; k++) px(x, r.int(1, 14), r.int(1, 14), pal.bed3);
        px(x, r.int(2, 13), r.int(2, 13), '#a58cff');
      }, key + 'b' + v));
      out.floor.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.floor, 16, 16);
        for (let k = 0; k < 14; k++) px(x, r.int(0, 15), r.int(0, 15), pal.floor2);
        for (let k = 0; k < 2; k++) px(x, r.int(0, 14), r.int(0, 14), shadeHex(pal.floor, -0.25), 2, 1);
      }, key + 'f' + v));
      // rough ground: mud is its own floor tile; rubble is a pixel overlay so it can sit on mud too
      out.mud.push(texCanvas((x, r) => {
        px(x, 0, 0, '#6b4a2e', 16, 16);
        for (let k = 0; k < 18; k++) px(x, r.int(0, 15), r.int(0, 15), r.chance(0.5) ? '#7d5734' : '#5a3d25', r.int(1, 3), 1);
        for (let k = 0; k < 2; k++) { // puddles with a wet glint
          const a = r.int(1, 10), b = r.int(2, 12), w = r.int(4, 6);
          px(x, a, b, '#4a321e', w, 2); px(x, a + 1, b - 1, '#4a321e', w - 2, 1); px(x, a + 1, b + 2, '#4a321e', w - 2, 1);
          px(x, a + 1, b, '#c9a27a', 2, 1);
        }
        for (let k = 0; k < 3; k++) px(x, r.int(0, 15), r.int(0, 15), '#9c7650'); // footprints-ish flecks
      }, key + 'm' + v));
      // jagged floor-coloured border for a mud side that touches plain ground (0 top, 1 right, 2 bottom, 3 left)
      for (let side = 0; side < 4; side++) out.mudEdge[side].push(texCanvas((x, r) => {
        let d = r.int(1, 3);
        for (let i = 0; i < 16; i++) {
          d = Math.max(1, Math.min(4, d + r.int(-1, 1)));
          for (let k = 0; k <= d; k++) {
            const col = k === d ? '#4a321e' : (r.chance(0.2) ? pal.floor2 : pal.floor);
            const X = side === 1 ? 15 - k : side === 3 ? k : i, Y = side === 0 ? k : side === 2 ? 15 - k : i;
            px(x, X, Y, col);
          }
        }
      }, key + 'me' + side + v));
      const rubbleTex = (n, tag) => texCanvas((x, r) => {
        for (let k = 0; k < n; k++) {
          const a = r.int(0, 12), b = r.int(1, 13), w = r.int(2, 3), h = r.int(1, 2);
          px(x, a, b, pal.stone3, w + 1, h + 1);   // shadow
          px(x, a, b, pal.stone, w, h);
          px(x, a, b, pal.stone2, 1, 1);           // highlight
        }
        for (let k = 0; k < n; k++) px(x, r.int(0, 15), r.int(0, 15), pal.stone3); // grit
      }, key + tag + v);
      out.rubble.push(rubbleTex(7, 'r'));
      out.rubbleLite.push(rubbleTex(3, 'q'));
      out.fog.push(texCanvas((x, r) => {
        px(x, 0, 0, pal.fog, 16, 16);
        for (let k = 0; k < 16; k++) px(x, r.int(0, 15), r.int(0, 15), pal.fog2, 2, 1);
      }, key + 'o' + v));
    }
    out.elev = texCanvas((x) => {
      px(x, 0, 0, '#3b3a4a', 16, 16);
      for (let i = 0; i < 16; i += 3) { px(x, i, 0, '#5b5a6e', 1, 16); px(x, 0, i, '#5b5a6e', 16, 1); }
      for (let i = 0; i < 16; i += 2) { px(x, i, 0, i % 4 ? '#ffd23f' : '#2a2433', 2, 2); px(x, i, 14, i % 4 ? '#ffd23f' : '#2a2433', 2, 2); }
    }, key + 'e');
    return out;
  }
  const shadeHex = (h, a) => NYA.shade(h, a);
  const FOLD_COLS = ['#ffd23f', '#7af0e0', '#ff7eb6', '#b69cff', '#ff9e7a', '#7af0a0'];

  // ---------------------------------------------------------------- view
  class MineView {
    constructor(canvas, game, audio) {
      this.cv = canvas; this.ctx = canvas.getContext('2d');
      this.game = game; this.audio = audio;
      this.ep = null; this.tex = null; this.ts = 32;
      this.ox = 0; this.oy = 0; this.dpr = 1;
      this.parts = []; this.pops = []; this.rings = [];
      this.shake = 0; this.flash = 0; this.flashCol = '#fff';
      this.time = 0;
      this.hover = -1;
      this.mouse = null;
      this.sfxBudget = 0;
      this.banners = null; // set by UI
      this.claw = {};
      this.bombsVis = [];
      this.shots = []; // turret hairballs in flight (Mousehole Maze)
      this.mushroom = null;
    }
    setEpisode(ep) {
      this.ep = ep;
      this.pal = Object.assign({}, ep.def.pal, ep.event ? ep.event.pal : null);
      this.tex = makeTextures(this.pal, ep.def.key + (ep.eventKey || ''));
      this.parts.length = 0; this.pops.length = 0; this.rings.length = 0; this.bombsVis.length = 0; this.shots.length = 0;
      this.resize();
    }
    resize() {
      const cv = this.cv, wrap = cv.parentElement;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * this.dpr); cv.height = Math.round(H * this.dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      this.W = W; this.H = H;
      if (!this.ep) return;
      const M = this.ep.mine;
      this.ts = Math.max(8, Math.floor(Math.min((W - 16) / M.w, (H - 16) / (M.h + 1.2))));
      this.ox = Math.floor((W - this.ts * M.w) / 2);
      this.oy = Math.floor((H - this.ts * M.h) / 2 + this.ts * 0.5);
    }
    tileAt(clientX, clientY) {
      if (!this.ep) return -1;
      const r = this.cv.getBoundingClientRect();
      const x = Math.floor((clientX - r.left - this.ox) / this.ts), y = Math.floor((clientY - r.top - this.oy) / this.ts);
      const M = this.ep.mine;
      return M.inb(x, y) ? M.idx(x, y) : -1;
    }
    minerAt(clientX, clientY) {
      if (!this.ep) return null;
      const r = this.cv.getBoundingClientRect();
      const mx = (clientX - r.left - this.ox) / this.ts - 0.5, my = (clientY - r.top - this.oy) / this.ts - 0.5;
      let best = null, bd = 0.9;
      for (const m of this.ep.miners) { const d = Math.hypot(m.x - mx, m.y - 0.25 - my); if (d < bd) { bd = d; best = m; } }
      return best;
    }

    // ---------------------------------------------------------------- particles
    burst(i, col, n, spd, size) {
      const M = this.ep.mine;
      const cx = M.x(i) + 0.5, cy = M.y(i) + 0.5;
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (spd || 3);
        this.parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 0.5 + Math.random() * 0.4, max: 0.9, col, size: size || 0.12, g: 9 });
      }
    }
    burstAt(x, y, col, n, spd, size) { // x, y in tile coordinates (top-left), like miner and mouse positions
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (spd || 3);
        this.parts.push({ x: x + 0.5, y: y + 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 0.5 + Math.random() * 0.4, max: 0.9, col, size: size || 0.12, g: 9 });
      }
    }
    pop(x, y, text, col, big) {
      this.pops.push({ x, y, text, col: col || '#fff', life: big ? 1.6 : 1.0, max: big ? 1.6 : 1.0, big: !!big });
    }
    sfx(name, a, b) {
      if (!this.audio) return;
      if (this.sfxBudget > 14 && (name === 'tink' || name === 'chip')) return;
      this.sfxBudget++;
      this.audio.sfx(name, a, b);
    }

    consume() {
      const ep = this.ep;
      if (!ep || !ep.events.length) return;
      const M = ep.mine, set = this.game.s.settings;
      const evs = ep.events.splice(0, ep.events.length);
      for (const e of evs) {
        const m = e.m ? ep.minerById(e.m) : null;
        switch (e.t) {
          case 'swing': {
            const col = e.ty === T.DIRT ? ep.def.pal.dirt2 : e.ty === T.ORE ? '#7af0a0' : ep.def.pal.stone2;
            const fold = e.fold || 0;
            this.burst(e.i, col, (e.crit ? 10 : 3) + fold * 2, (e.crit ? 4 : 2.2) + fold * 0.4, 0.09 + fold * 0.015);
            if (fold) this.burst(e.i, FOLD_COLS[(fold - 1) % FOLD_COLS.length], 2 + fold, 3, 0.07);
            if (fold >= 2) this.shake = Math.max(this.shake, Math.min(0.12, 0.03 * fold));
            if (e.crit) { this.pop(M.x(e.i) + 0.5, M.y(e.i) + 0.2, m && m.s.flags.spanish ? '¡MIAU!' : 'NYA!', '#ff7eb6', true); this.sfx('crit'); }
            else this.sfx(fold ? 'heavy' : 'tink', e.ty, fold);
            if (set.nya && Math.random() < 0.5) this.sfx('nya');
            break;
          }
          case 'break':
            this.burst(e.i, e.ty === T.DIRT ? ep.def.pal.dirt : e.ty === T.ORE ? '#a6ffc9' : ep.def.pal.stone, 10, 3.5, 0.14);
            this.sfx(e.ty === T.ORE ? 'break_ore' : 'break', e.ty);
            break;
          case 'chain':
            this.burst(e.i, '#fff2dc', 8, 4, 0.12);
            this.rings.push({ i: e.i, life: 0.35, max: 0.35, col: '#ffcf70', r0: 0.2, r1: 0.9 });
            this.shake = Math.max(this.shake, 0.12);
            this.sfx('crack');
            break;
          case 'item': {
            const q = NYA.qInfo(e.q);
            this.burst(e.i, q.color, 6, 2.5, 0.1);
            if (m) this.pop(m.x + 0.5, m.y - 0.2, e.lucky ? '★' + e.q : '+', q.color, e.lucky);
            this.sfx('ore', e.q);
            break;
          }
          case 'drop': // what she just delivered, in catnip after multipliers (before the Full-Clear Bonus)
            if (m && e.n) {
              const nip = e.value * this.game.nipMult(ep);
              if (nip > 0) this.pop(m.x + 0.5, m.y - 0.3, '+' + NYA.fmt(nip), '#7af0a0', false);
              if (e.sushi) this.pop(m.x + 0.5, m.y - (nip > 0 ? 0.75 : 0.3), '+' + e.sushi + ' sushi', '#ff8a5c', false);
              if (e.cheese) this.pop(m.x + 0.5, m.y - (nip > 0 || e.sushi ? 0.75 : 0.3), '+' + e.cheese + ' cheese', '#ffd96a', false);
              this.haulBump = 0.35;
              this.sfx('drop', e.n);
            }
            break;
          case 'pickup': this.sfx('ore', e.q); break;
          case 'distract': if (e.kind === 'loaf' && Math.random() < 0.5) this.sfx('mew'); break;
          case 'flop': this.sfx('flop'); break;
          case 'levelup':
            if (m) { this.pop(m.x + 0.5, m.y - 0.6, 'LEVEL ' + e.level + '!', '#ffd23f', true); this.burst(m.tile, '#ffd23f', 14, 3, 0.1); }
            this.sfx('levelup');
            break;
          case 'motherlode':
            this.shake = set.shake ? 0.8 : 0; this.flashOn('#ff7eb6', 0.5);
            this.rings.push({ i: e.i, life: 1.4, max: 1.4, col: '#ff7eb6', r0: 0.3, r1: 4 });
            this.sfx('motherlode');
            if (this.banners) this.banners('motherlode');
            break;
          case 'boxseen': this.sfx('hum'); this.rings.push({ i: e.i, life: 1, max: 1, col: '#7af0e0', r0: 0.3, r1: 2 }); break;
          case 'boxopen':
            this.burst(e.i, e.outcome === 'skein' ? '#c9a8ff' : '#c9925a', 30, 5, 0.15);
            if (e.outcome === 'skein') { this.flashOn('#ffffff', 0.9); this.sfx('skein'); if (this.banners) this.banners('skein'); }
            else { this.pop(M.x(e.i) + 0.5, M.y(e.i), 'Tangled Thread…', '#c9a8ff', true); this.sfx('empty'); }
            break;
          case 'fullclear': this.sfx('fullclear'); if (this.banners) this.banners('fullclear'); break;
          case 'unmark': this.rings.push({ i: e.i, life: 0.5, max: 0.5, col: '#9b93a8', r0: 0.3, r1: 1.0 }); break;
          case 'mark': this.sfx(e.drone ? 'drone' : 'laser'); this.rings.push({ i: e.i, life: 0.4, max: 0.4, col: e.drone ? '#7af0e0' : '#ff3b5c', r0: 1.2, r1: 0.3 }); break;
          case 'bombthrow': this.bombsVis.push({ i: e.i, t: 0, dur: 0.55 }); this.sfx('throw'); break;
          case 'boom':
            this.burst(e.i, '#ffb36b', 28, 6, 0.16); this.burst(e.i, '#7a6a8a', 18, 4, 0.2);
            this.rings.push({ i: e.i, life: 0.5, max: 0.5, col: '#ffcf70', r0: 0.4, r1: 2.2 });
            this.shake = set.shake ? 0.45 : 0; this.sfx('boom');
            break;
          case 'blunt': case 'puff':
            if (m) for (let k = 0; k < 8; k++) this.parts.push({ x: m.x + 0.5, y: m.y, vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random(), life: 1.4, max: 1.4, col: 'rgba(200,255,200,0.6)', size: 0.22, g: -0.3, smoke: true });
            this.sfx('puff');
            break;
          case 'tuna': this.sfx('tuna'); if (this.banners) this.banners('tuna'); break;
          case 'sonar': this.rings.push({ i: e.i, life: 0.9, max: 0.9, col: '#7af0e0', r0: 0.2, r1: e.r + 0.5 }); this.sfx('sonar'); break;
          case 'hotbox': this.sfx('puff'); this.rings.push({ i: e.i, life: 1, max: 1, col: '#a6ffc9', r0: 0.3, r1: 3 }); break;
          case 'mewclear':
            this.flashOn('#ffffff', 1.4); this.shake = set.shake ? 1.4 : 0;
            this.mushroom = { i: e.i, t: 0 };
            this.burst(e.i, '#ffd23f', 60, 9, 0.2);
            this.sfx('mewclear');
            if (this.banners) this.banners('mewclear');
            break;
          case 'rescue': this.sfx('claw'); break;
          case 'allloaf': if (this.banners) this.banners('allloaf'); break;
          case 'ninelives': if (m) this.pop(m.x + 0.5, m.y - 0.6, 'NINE LIVES!', '#ffd23f', true); this.sfx('levelup'); break;
          case 'menace': if (m) this.pop(m.x + 0.5, m.y - 0.6, '*pushes item into crevice* :3', '#ff9e7a', false); break;
          case 'treat': if (m) this.pop(m.x + 0.5, m.y - 0.6, '2× XP!', '#ff7eb6', true); this.sfx('treat'); break;
          case 'catterall': if (e.on && this.banners) this.banners('catterall'); if (this.audio) this.audio.duck(e.on); break;
          case 'tangle': this.burst(e.i, '#ff9ec4', 3, 1.5, 0.08); break;
          case 'flood': this.burst(e.i, '#7ad7f0', 16, 3, 0.14); this.shake = Math.max(this.shake, 0.25); this.sfx('splash'); break;
          case 'wet': if (m) this.burst(m.tile, '#bfefff', 5, 1.6, 0.08); break;
          case 'drain': this.burst(e.i, '#d8f6ff', 4, 1.2, 0.08); break;
          case 'rubble': this.burst(e.i, '#b8a890', 2, 1.2, 0.06); break;
          case 'wish':
            this.pop(M.x(e.i) + 0.5, M.y(e.i) - 0.2, '★ WISH ' + e.n + ' ★', '#c9e3ff', true);
            this.burst(e.i, '#c9e3ff', 24, 4, 0.12); this.sfx('trait'); break;
          case 'pound': this.pop(M.x(e.i) + 0.5, M.y(e.i) + 0.2, 'PON!', '#ff7eb6', false); this.burst(e.i, '#fff6fa', 6, 2.5, 0.1); break;
          case 'fireworks':
            for (let k = 0; k < 8; k++) {
              const fx = Math.random() * M.w, fy = Math.random() * M.h * 0.6;
              const col = ['#ff5c7a', '#ffd23f', '#7af0e0', '#b69cff', '#ff9e7a'][k % 5];
              for (let j = 0; j < 22; j++) { const a = j / 22 * Math.PI * 2; this.parts.push({ x: fx, y: fy, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 1.2 + k * 0.08, max: 1.4, col, size: 0.12, g: 2 }); }
            }
            this.sfx('boom'); this.sfx('fullclear'); break;
          case 'pumpbuilt': this.burst(e.i, '#ffffff', 10, 2.5, 0.1); this.sfx('stamp'); if (m) this.pop(m.x + 0.5, m.y - 0.5, 'PUMPJACK!', '#fffaf0', false); break;
          case 'pipedone': this.rings.push({ i: e.i, life: 0.6, max: 0.6, col: '#e8f4ff', r0: 0.3, r1: 1.5 }); this.sfx('drop', 2); break;
          case 'milkdry': this.burst(e.i, '#fffaf0', 18, 3, 0.12); if (m) this.pop(m.x + 0.5, m.y - 0.5, 'PUMPED DRY!', '#fffaf0', true); this.sfx('fullclear'); break;
          case 'pipelay': if (Math.random() < 0.4) this.sfx('tink', 2); break;
          // Mousehole Maze
          case 'nestwake': this.rings.push({ i: e.i, life: 0.7, max: 0.7, col: '#ffd96a', r0: 0.3, r1: 1.6 }); this.pop(M.x(e.i) + 0.5, M.y(e.i), 'SQUEAK!', '#ffd96a', false); this.sfx('squeak', 1); break;
          case 'mspawn': this.burst(e.i, '#8a7a6a', 4, 1.5, 0.08); break;
          case 'bite': if (m) { this.pop(m.x + 0.5, m.y - 0.3, e.kind === 'bruiser' ? 'CHOMP!' : 'nibble!', '#ff9ec4', false); this.burstAt(m.x, m.y - 0.3, '#ff9ec4', 3, 1.4, 0.07); } this.sfx('squeak', 0); break;
          case 'steal': this.pop(e.x + 0.5, e.y - 0.2, 'YOINK!', '#ffd96a', true); this.sfx('squeak', 2); break;
          case 'recover': this.pop(e.x + 0.5, e.y - 0.2, 'Got it back!', '#7af0a0', false); break;
          case 'escape': this.burstAt(e.x, e.y, '#8a7a6a', 5, 1.6, 0.08); break;
          case 'mswing': this.burstAt(e.x, e.y, e.crit ? '#ff7eb6' : '#fff2dc', e.crit ? 6 : 3, 2, 0.08); if (e.crit) this.pop(e.x + 0.5, e.y - 0.1, m && m.s.flags.spanish ? '¡MIAU!' : 'NYA!', '#ff7eb6', false); this.sfx('tink', 0); break;
          case 'mkill': this.burstAt(e.x, e.y, '#c9c2d6', 10, 2.6, 0.1); this.burstAt(e.x, e.y, '#ffd96a', 4, 1.8, 0.08); this.pop(e.x + 0.5, e.y - 0.1, e.kind === 'bruiser' ? 'SQUEEEAK!' : 'squeak!', '#fffaf0', e.kind === 'bruiser'); this.sfx('squeak', 3); break;
          case 'tshot': this.shots.push({ x0: M.x(e.i) + 0.5, y0: M.y(e.i) + 0.35, x1: e.x + 0.5, y1: e.y + 0.6, t: 0, dur: 0.18 }); if (Math.random() < 0.6) this.sfx('pew'); break;
          case 'turret': this.rings.push({ i: e.i, life: 0.5, max: 0.5, col: e.by === 'chan' ? '#7af0e0' : '#ff9ec4', r0: 0.3, r1: 1.2 }); this.sfx('stamp'); break;
          case 'turretoff': this.rings.push({ i: e.i, life: 0.4, max: 0.4, col: '#9b93a8', r0: 1.0, r1: 0.3 }); this.sfx('click'); break;
          case 'nestbreak':
            this.burst(e.i, '#ffd96a', 18, 4, 0.12); this.burst(e.i, '#a8957a', 10, 3, 0.14);
            this.rings.push({ i: e.i, life: 0.6, max: 0.6, col: '#ffd96a', r0: 0.3, r1: 2 });
            this.pop(M.x(e.i) + 0.5, M.y(e.i), 'NEST SMASHED!', '#ffd96a', true); this.sfx('break_ore'); this.sfx('squeak', 3);
            break;
          case 'chan': this.pop(M.x(e.i) + 0.5, M.y(e.i) - 0.2, e.line === 'vibes' ? 'for vibes!' : 'eep!', '#7af0e0', false); break;
          case 'scared': if (m) this.pop(m.x + 0.5, m.y - 0.5, 'EEK!', '#ffd96a', true); break;
        }
      }
    }
    flashOn(col, a) { if (!this.game.s.settings.flashes) return; this.flash = a; this.flashCol = col; }

    // ---------------------------------------------------------------- draw
    // Background tab: nothing is visible, but episode events still need to play their sounds and be cleared.
    tickHidden(rdt) {
      this.time += rdt;
      this.sfxBudget = Math.max(0, this.sfxBudget - rdt * 30);
      this.consume();
      this.parts.length = 0; this.pops.length = 0; this.rings.length = 0;
    }
    frame(alpha, rdt) {
      this.time += rdt;
      this.sfxBudget = Math.max(0, this.sfxBudget - rdt * 30);
      const ep = this.ep;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#0b0710';
      ctx.fillRect(0, 0, this.W, this.H);
      if (!ep) return;
      this.consume();
      const M = ep.mine, ts = this.ts;
      let sx = 0, sy = 0;
      if (this.shake > 0) { this.shake = Math.max(0, this.shake - rdt * 1.6); const a = this.shake * ts * 0.35; sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; }
      ctx.save();
      ctx.translate(this.ox + sx, this.oy + sy);
      ctx.imageSmoothingEnabled = false;
      const tex = this.tex, t = this.time;
      const game = this.game;
      this.drawSurface(ctx, M, ts, t);
      this.drawHaulTotal(ctx, M, ts, rdt, game.haulCatnip(ep));
      const valMult = game.s.settings.showDQ ? game.nipMult(ep) : 0; // "Show catnip value on ore"
      const sparkles = game.lvl('sonar') > 0;

      // tiles
      for (let y = 0; y < M.h; y++) {
        for (let x = 0; x < M.w; x++) {
          const i = y * M.w + x;
          const X = x * ts, Y = y * ts;
          const v = (i * 7 + (i >> 3)) & 3;
          if (!M.revealed[i]) {
            ctx.drawImage(tex.fog[v], X, Y, ts, ts);
            if (sparkles && (M.type[i] === T.BOX || i === M.motherlode) && Math.sin(t * 3 + i) > 0.6) {
              ctx.fillStyle = M.type[i] === T.BOX ? '#7af0e0' : '#ff7eb6';
              ctx.fillRect(X + ts * 0.45, Y + ts * 0.3, ts * 0.1, ts * 0.4); ctx.fillRect(X + ts * 0.3, Y + ts * 0.45, ts * 0.4, ts * 0.1);
            }
            continue;
          }
          const ty = M.type[i];
          if (ty === T.OPEN || ty === T.BOX) {
            ctx.drawImage((M.mud[i] ? tex.mud : tex.floor)[v], X, Y, ts, ts);
            if (M.mud[i]) { // soft edge wherever the mud meets plain open ground
              const nb = [y > 0 ? i - M.w : -1, x < M.w - 1 ? i + 1 : -1, y < M.h - 1 ? i + M.w : -1, x > 0 ? i - 1 : -1];
              for (let sd = 0; sd < 4; sd++) { const j = nb[sd]; if (j >= 0 && M.isOpen(j) && !M.mud[j] && M.revealed[j]) ctx.drawImage(tex.mudEdge[sd][v], X, Y, ts, ts); }
            }
            if (M.rubble[i]) ctx.drawImage((M.rubble[i] > 1 ? tex.rubble : tex.rubbleLite)[v], X, Y, ts, ts);
            if (y > 0 && !M.isOpen(i - M.w) && M.type[i - M.w] !== T.BOX) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X, Y, ts, ts * 0.22); }
            if (M.tangle[i]) this.drawTangle(ctx, X, Y, ts, i, M.tangle[i]);
            if (M.water[i]) this.drawWater(ctx, X, Y, ts, i, t, y === 0 || !M.water[i - M.w]);
            if (ty === T.BOX) {
              ctx.save(); ctx.translate(X + ts / 2, Y + ts * 0.9); ctx.scale(ts / 20, ts / 20);
              NYA.drawBox(ctx, 0, 0, 17, t, true);
              ctx.fillStyle = '#2a1f33'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, -4);
              ctx.restore();
              this.drawCracks(ctx, X, Y, ts, M.hp[i] / M.maxHp[i]);
            }
          } else if (ty === T.ELEV) {
            ctx.drawImage(tex.elev, X, Y, ts, ts);
          } else if (ty === T.BEDROCK) {
            ctx.drawImage(tex.bed[v], X, Y, ts, ts);
          } else if (ty === T.MILK) {
            ctx.drawImage(tex.stone[v], X, Y, ts, ts);
            this.drawMilkNode(ctx, X, Y, ts, i, t);
          } else {
            const base = ty === T.DIRT ? tex.dirt : ty === T.HARD ? tex.hard : ty === T.GROOVE ? tex.groove : tex.stone;
            ctx.drawImage(base[v], X, Y, ts, ts);
            if (ty === T.ORE && M.mochi[i]) this.drawMochi(ctx, X, Y, ts, i, t);
            else if (ty === T.ORE && M.sushi[i]) this.drawNigiriTile(ctx, X, Y, ts, i, t);
            else if (ty === T.ORE) this.drawOre(ctx, X, Y, ts, i, t, valMult);
            else if (ty === T.NEST) this.drawNest(ctx, X, Y, ts, i, t);
            if (ty === T.GROOVE && Math.sin(t * 2 + M.groove[i]) > 0.92) { ctx.fillStyle = 'rgba(255,240,200,0.25)'; ctx.fillRect(X, Y, ts, ts); }
            const f = M.hp[i] / M.maxHp[i];
            if (f < 1) this.drawCracks(ctx, X, Y, ts, f);
          }
          if (M.forbid[i]) {
            ctx.fillStyle = 'rgba(90,170,255,0.35)'; ctx.fillRect(X, Y, ts, ts);
            ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = Math.max(1.5, ts * 0.08);
            ctx.beginPath(); ctx.moveTo(X + ts * 0.25, Y + ts * 0.25); ctx.lineTo(X + ts * 0.75, Y + ts * 0.75); ctx.moveTo(X + ts * 0.75, Y + ts * 0.25); ctx.lineTo(X + ts * 0.25, Y + ts * 0.75); ctx.stroke();
          }
        }
      }
      // soft fog edge
      ctx.fillStyle = 'rgba(11,7,16,0.35)';
      for (let i = 0; i < M.n; i++) {
        if (!M.revealed[i]) continue;
        const x = M.x(i), y = M.y(i);
        let edge = false;
        for (const nb of M.nbrs(i)) if (!M.revealed[nb]) { edge = true; break; }
        if (edge && !M.isOpen(i)) ctx.fillRect(x * ts, y * ts, ts, ts);
      }

      // milk pipes (T4)
      if (ep.def.quirk === 'milk') this.drawPipes(ctx, M, ts, t, ep);
      // Tanabata constellation lines between revealed tiles of the same star
      if (ep.eventKey === 'tanabata') {
        ctx.strokeStyle = 'rgba(201,227,255,0.55)'; ctx.lineWidth = Math.max(1, ts * 0.04);
        ctx.beginPath();
        for (let i = 0; i < M.n; i++) {
          const c = M.cluster[i];
          if (c < 0 || !M.revealed[i]) continue;
          for (const nb of M.nbrs(i)) if (nb > i && M.cluster[nb] === c && M.revealed[nb]) { ctx.moveTo(M.x(i) * ts + ts / 2, M.y(i) * ts + ts / 2); ctx.lineTo(M.x(nb) * ts + ts / 2, M.y(nb) * ts + ts / 2); }
        }
        ctx.stroke();
      }

      // laser marks
      for (const mk of ep.marks) {
        const X = M.x(mk.idx) * ts + ts / 2, Y = M.y(mk.idx) * ts + ts / 2;
        const fresh = ep.t - mk.t0 < 3;
        const pulse = 0.5 + 0.5 * Math.sin(t * 10 + mk.idx);
        const col = mk.drone ? '122,240,224' : '255,59,92';
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, ts * (fresh ? 0.75 : 0.55));
        g.addColorStop(0, `rgba(${col},${0.55 + 0.3 * pulse})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(X - ts, Y - ts, ts * 2, ts * 2);
        ctx.fillStyle = mk.drone ? '#c8fff6' : '#ffe0e6';
        ctx.beginPath(); ctx.arc(X + Math.sin(t * 13) * ts * 0.04, Y + Math.cos(t * 11) * ts * 0.04, ts * 0.09, 0, Math.PI * 2); ctx.fill();
      }

      // loose items
      for (const it of ep.loose) {
        if (it.fish) { this.drawFish(ctx, M.x(it.idx) * ts + ts / 2, M.y(it.idx) * ts + ts * 0.6, ts, t, it.id); continue; }
        if (it.cheese) { this.drawCheese(ctx, M.x(it.idx) * ts + ts / 2 + ((it.id * 37) % 9 - 4) * ts * 0.04, M.y(it.idx) * ts + ts * 0.66 - Math.abs(Math.sin(t * 4 + it.id)) * ts * 0.05, ts * (it.wheel ? 0.42 : 0.24), it.wheel); continue; }
        if (it.sushi) { this.drawNigiri(ctx, M.x(it.idx) * ts + ts / 2, M.y(it.idx) * ts + ts * 0.66 - Math.abs(Math.sin(t * 4 + it.id)) * ts * 0.06, ts * 0.3, it.id % 3); continue; }
        const q = NYA.qInfo(it.q);
        const X = M.x(it.idx) * ts + ts / 2 + ((it.id * 37) % 9 - 4) * ts * 0.04, Y = M.y(it.idx) * ts + ts * 0.62 + ((it.id * 53) % 7 - 3) * ts * 0.03;
        const b = Math.abs(Math.sin(t * 4 + it.id)) * ts * 0.06;
        NYA.drawOreShape(ctx, q.shape, X, Y - b, ts * 0.13, q.color, '#1a1020');
      }
      // hotbox
      if (ep.hotbox) {
        const X = M.x(ep.hotbox.idx) * ts + ts / 2, Y = M.y(ep.hotbox.idx) * ts + ts * 0.9;
        ctx.save(); ctx.translate(X, Y); ctx.scale(ts / 20, ts / 20); NYA.drawBox(ctx, 0, 0, 16, t, false);
        ctx.fillStyle = '#5fe08a'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NIP', 0, -3.5); ctx.restore();
        if (Math.random() < 0.3) this.parts.push({ x: M.x(ep.hotbox.idx) + 0.5, y: M.y(ep.hotbox.idx) + 0.2, vx: (Math.random() - 0.5) * 0.4, vy: -0.7, life: 1.5, max: 1.5, col: 'rgba(190,255,190,0.5)', size: 0.25, g: -0.2, smoke: true });
      }

      for (const tu of ep.turrets) this.drawTurret(ctx, tu, ts, t, M);
      // miners (y-sorted)
      const ms = ep.miners.slice().sort((a, b) => a.y - b.y);
      const outSlots = {};
      for (const m of ms) this.drawMiner(ctx, m, alpha, ts, t, ep, outSlots);
      for (const mo of ep.mice) if (M.revealed[mo.tile]) this.drawMouse(ctx, mo, alpha, ts, t);
      // turret hairballs in flight
      for (let k = this.shots.length - 1; k >= 0; k--) {
        const s = this.shots[k];
        s.t += rdt;
        if (s.t >= s.dur) { this.shots.splice(k, 1); continue; }
        const f = s.t / s.dur, X = NYA.lerp(s.x0, s.x1, f) * ts, Y = (NYA.lerp(s.y0, s.y1, f) - Math.sin(f * Math.PI) * 0.5) * ts;
        ctx.fillStyle = '#9a6a5a'; ctx.beginPath(); ctx.arc(X, Y, Math.max(2, ts * 0.09), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c99a86'; ctx.beginPath(); ctx.arc(X - ts * 0.03, Y - ts * 0.03, Math.max(1, ts * 0.04), 0, Math.PI * 2); ctx.fill();
      }
      if (ep.darkness > 0) this.drawDarkness(ctx, M, ts, alpha, ep);

      // bombs in flight
      for (let k = this.bombsVis.length - 1; k >= 0; k--) {
        const b = this.bombsVis[k];
        b.t += rdt;
        if (b.t >= b.dur) { this.bombsVis.splice(k, 1); continue; }
        const e = M.elev, f = b.t / b.dur;
        const x0 = M.x(e) + 0.5, y0 = M.y(e) + 0.5, x1 = M.x(b.i) + 0.5, y1 = M.y(b.i) + 0.5;
        const X = NYA.lerp(x0, x1, f) * ts, Y = (NYA.lerp(y0, y1, f) - Math.sin(f * Math.PI) * 2.5) * ts;
        ctx.fillStyle = '#7a6a8a'; ctx.beginPath(); ctx.arc(X, Y, ts * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a3a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X - ts * 0.06, Y - ts * 0.04, ts * 0.12, 0, Math.PI * 1.4); ctx.stroke();
      }

      // rings
      for (let k = this.rings.length - 1; k >= 0; k--) {
        const r = this.rings[k];
        r.life -= rdt;
        if (r.life <= 0) { this.rings.splice(k, 1); continue; }
        const f = 1 - r.life / r.max;
        const R = NYA.lerp(r.r0, r.r1, f) * ts;
        ctx.globalAlpha = 1 - f;
        ctx.strokeStyle = r.col; ctx.lineWidth = Math.max(2, ts * 0.08);
        ctx.beginPath(); ctx.arc(M.x(r.i) * ts + ts / 2, M.y(r.i) * ts + ts / 2, R, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // particles
      for (let k = this.parts.length - 1; k >= 0; k--) {
        const p = this.parts[k];
        p.life -= rdt;
        if (p.life <= 0) { this.parts.splice(k, 1); continue; }
        p.vy += (p.g || 0) * rdt; p.x += p.vx * rdt; p.y += p.vy * rdt;
        ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
        ctx.fillStyle = p.col;
        const s = p.size * ts * (p.smoke ? (1.5 - p.life / p.max) : 1);
        if (p.smoke) { ctx.beginPath(); ctx.arc(p.x * ts, p.y * ts, s, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(p.x * ts - s / 2, p.y * ts - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      // mushroom cloud (cat head) for the Mewclear Option
      if (this.mushroom) this.drawMushroom(ctx, rdt, ts);

      // popups
      ctx.textAlign = 'center';
      for (let k = this.pops.length - 1; k >= 0; k--) {
        const p = this.pops[k];
        p.life -= rdt;
        if (p.life <= 0) { this.pops.splice(k, 1); continue; }
        const f = 1 - p.life / p.max;
        const size = Math.max(10, ts * (p.big ? 0.42 : 0.3)) * (p.big ? 1 + 0.3 * Math.max(0, 0.2 - f) * 5 : 1);
        ctx.font = `${p.big ? 900 : 700} ${size}px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif`;
        ctx.globalAlpha = Math.min(1, p.life * 2.5);
        const X = p.x * ts, Y = (p.y - f * 0.9) * ts;
        ctx.lineWidth = Math.max(2, size * 0.18); ctx.strokeStyle = '#1a1020'; ctx.strokeText(p.text, X, Y);
        ctx.fillStyle = p.col; ctx.fillText(p.text, X, Y);
      }
      ctx.globalAlpha = 1;

      // hover + tool cursor
      if (this.hover >= 0 && this.toolMode) {
        const X = M.x(this.hover) * ts, Y = M.y(this.hover) * ts;
        ctx.strokeStyle = this.toolMode === 'spray' ? '#8fd0ff' : this.toolMode === 'laser' ? 'rgba(255,90,120,0.9)' : '#ffd23f';
        ctx.lineWidth = 2;
        if (this.toolMode === 'turret') {
          ctx.strokeStyle = ep.canTurret(this.hover) || ep.turrets.some(tu => tu.idx === this.hover) ? '#ff9ec4' : 'rgba(155,147,168,0.7)';
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, NYA.TURRET_RANGE * ts, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeRect(X + 1, Y + 1, ts - 2, ts - 2);
        } else if (this.toolMode === 'bomb' || this.toolMode === 'sonar' || this.toolMode === 'mewclear') {
          const r = this.toolMode === 'bomb' ? 1 : this.toolMode === 'sonar' ? game.sonarRadius() : 5;
          ctx.setLineDash([4, 3]);
          if (this.toolMode === 'mewclear') { ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, 5.5 * ts, 0, Math.PI * 2); ctx.stroke(); }
          else ctx.strokeRect(X - r * ts, Y - r * ts, ts * (2 * r + 1), ts * (2 * r + 1));
          ctx.setLineDash([]);
        } else ctx.strokeRect(X + 1, Y + 1, ts - 2, ts - 2);
      }
      ctx.restore();

      // full-canvas tints
      if (ep.catterall) { ctx.fillStyle = 'rgba(40,0,30,0.18)'; ctx.fillRect(0, 0, this.W, this.H); }
      if (ep.t < ep.tunaUntil) { ctx.fillStyle = `rgba(120,200,255,${0.06 + 0.04 * Math.sin(t * 8)})`; ctx.fillRect(0, 0, this.W, this.H); }
      if (this.flash > 0) {
        ctx.globalAlpha = Math.min(1, this.flash); ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, this.W, this.H); ctx.globalAlpha = 1;
        this.flash -= rdt * 1.5;
      }
    }

    // decorative surface above the mine: sunset sky, grass, the elevator headframe
    drawSurface(ctx, M, ts, t) {
      const pal = this.pal || this.ep.def.pal;
      const H = Math.min(this.oy + 2, ts * 3);
      if (H < ts * 0.6) return;
      const W = M.w * ts;
      const g = ctx.createLinearGradient(0, -H, 0, 0);
      g.addColorStop(0, '#2a1840'); g.addColorStop(0.55, pal.sky || '#ffb3a7'); g.addColorStop(1, '#ffe0b0');
      ctx.fillStyle = g; ctx.fillRect(0, -H, W, H);
      // sun
      ctx.fillStyle = 'rgba(255,240,200,0.85)';
      ctx.beginPath(); ctx.arc(W * 0.78, -H * 0.18, ts * 0.9, Math.PI, 0); ctx.fill();
      // distant hills
      ctx.fillStyle = 'rgba(90,40,90,0.55)';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += ts) ctx.lineTo(x, -ts * (0.35 + 0.25 * Math.sin(x / ts * 0.9 + 1)));
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      // grass
      ctx.fillStyle = '#5fbf6a'; ctx.fillRect(0, -ts * 0.18, W, ts * 0.18);
      ctx.fillStyle = '#7ad98a';
      for (let x = 0; x < W; x += ts * 0.25) ctx.fillRect(x, -ts * 0.24 - ((x * 7) % 3), ts * 0.08, ts * 0.1);
      // headframe over a top-edge elevator
      const e = M.elev;
      if (M.y(e) === 0) {
        const X = M.x(e) * ts;
        ctx.strokeStyle = '#3b3a4a'; ctx.lineWidth = Math.max(2, ts * 0.1);
        ctx.beginPath(); ctx.moveTo(X + ts * 0.1, 0); ctx.lineTo(X + ts * 0.5, -ts * 1.3); ctx.lineTo(X + ts * 0.9, 0); ctx.stroke();
        ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(X + ts * 0.5, -ts * 1.3, ts * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1f33'; ctx.beginPath(); ctx.arc(X + ts * 0.5, -ts * 1.3, ts * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Running total of this shift's catnip (after multipliers, before the Full-Clear Bonus), up in the sky strip.
    drawHaulTotal(ctx, M, ts, rdt, total) {
      const H = Math.min(this.oy + 2, ts * 3);
      if (H < ts * 0.9) return;
      if (this.haulBump > 0) this.haulBump = Math.max(0, this.haulBump - rdt);
      const s = Math.max(12, Math.min(ts * 0.6, H * 0.36)) * (1 + 0.5 * (this.haulBump || 0));
      const X = ts * 0.35, Y = -H * 0.42;
      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.max(9, s * 0.48)}px "M PLUS Rounded 1c", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = '#1a1020';
      ctx.strokeText('THIS SHIFT', X, Y - s * 0.95); ctx.fillStyle = '#fff2dc'; ctx.fillText('THIS SHIFT', X, Y - s * 0.95);
      ctx.font = `900 ${s}px "Mochiy Pop One", sans-serif`;
      const txt = NYA.fmt(total) + ' nip';
      ctx.lineWidth = Math.max(3, s * 0.2); ctx.strokeText(txt, X, Y);
      ctx.fillStyle = '#7af0a0'; ctx.fillText(txt, X, Y);
    }

    drawOre(ctx, X, Y, ts, i, t, valMult) {
      const M = this.ep.mine;
      const left = M.dens[i] - M.dropped[i];
      const q = Math.min(9, M.q[i] + (M.glow[i] ? 2 : 0));
      const qi = NYA.qInfo(q);
      const ml = i === M.motherlode;
      if (ml || M.glow[i]) {
        const g = ctx.createRadialGradient(X + ts / 2, Y + ts / 2, 0, X + ts / 2, Y + ts / 2, ts * 0.8);
        g.addColorStop(0, ml ? 'rgba(255,126,182,0.6)' : 'rgba(180,255,120,0.55)'); g.addColorStop(1, 'rgba(255,126,182,0)');
        ctx.fillStyle = g; ctx.fillRect(X - ts / 2, Y - ts / 2, ts * 2, ts * 2);
      }
      let fill = qi.color;
      if (qi.rainbow || q > 5) fill = `hsl(${(t * 120 + i * 30) % 360},90%,72%)`;
      const n = Math.min(3, left);
      const spots = n === 1 ? [[0.5, 0.52, 0.27]] : n === 2 ? [[0.36, 0.42, 0.2], [0.64, 0.62, 0.2]] : [[0.32, 0.36, 0.17], [0.68, 0.4, 0.17], [0.5, 0.7, 0.17]];
      for (const [fx, fy, r] of spots) {
        NYA.drawOreShape(ctx, qi.shape, X + fx * ts, Y + fy * ts, r * ts * (ml ? 1.15 : 1), fill, '#1a1020');
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(X + (fx - r * 0.35) * ts, Y + (fy - r * 0.45) * ts, Math.max(1, ts * 0.05), Math.max(1, ts * 0.05));
      }
      if (left >= 4 && left <= 5) {
        for (let k = 0; k < left - 3; k++) { ctx.fillStyle = '#fff'; ctx.fillRect(X + ts * (0.12 + k * 0.12), Y + ts * 0.08, ts * 0.08, ts * 0.08); }
      } else if (left > 5) {
        const s = Math.max(9, ts * 0.32);
        ctx.font = `900 ${s}px "Mochiy Pop One", sans-serif`; ctx.textAlign = 'right';
        ctx.lineWidth = 3; ctx.strokeStyle = '#1a1020'; ctx.strokeText(String(left), X + ts * 0.96, Y + ts * 0.34);
        ctx.fillStyle = ml ? '#ff7eb6' : '#fff'; ctx.fillText(String(left), X + ts * 0.96, Y + ts * 0.34);
      }
      if (valMult) { // catnip this tile is still worth, after multipliers (before the Full-Clear Bonus)
        const txt = NYA.fmt(left * this.ep.itemValue({ q, d: M.dens[i] }) * valMult);
        const s = Math.max(8, Math.min(ts * 0.27, ts * 1.7 / Math.max(3, txt.length)));
        ctx.font = `800 ${s}px "M PLUS Rounded 1c", sans-serif`; ctx.textAlign = 'center';
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#000'; ctx.strokeText(txt, X + ts / 2, Y + ts - 2);
        ctx.fillStyle = '#b8ffcf'; ctx.fillText(txt, X + ts / 2, Y + ts - 2);
      }
      if (Math.sin(t * 2.5 + i * 1.7) > 0.95) {
        ctx.fillStyle = '#fff';
        const sx = X + ts * (0.25 + ((i * 13) % 50) / 100), sy = Y + ts * 0.3;
        ctx.fillRect(sx - ts * 0.08, sy, ts * 0.16, ts * 0.03); ctx.fillRect(sx - ts * 0.015, sy - ts * 0.065, ts * 0.03, ts * 0.16);
      }
    }

    // Deeper mines are darker: a dim layer with headlamp light pools around each miner.
    drawDarkness(ctx, M, ts, alpha, ep) {
      const W = M.w * ts, H = M.h * ts;
      const oc = this.darkCv || (this.darkCv = document.createElement('canvas'));
      const dpr = this.dpr;
      if (oc.width !== Math.ceil(W * dpr) || oc.height !== Math.ceil(H * dpr)) { oc.width = Math.ceil(W * dpr); oc.height = Math.ceil(H * dpr); }
      const o = oc.getContext('2d');
      o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.globalCompositeOperation = 'source-over';
      o.clearRect(0, 0, W, H);
      o.fillStyle = `rgba(4,2,10,${Math.min(0.6, 0.24 * ep.darkness)})`;
      o.fillRect(0, 0, W, H);
      o.globalCompositeOperation = 'destination-out';
      const R = (ep.noticeRange + 1.2) * ts;
      const hole = (x, y, r) => {
        const g = o.createRadialGradient(x, y, r * 0.15, x, y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = g; o.fillRect(x - r, y - r, r * 2, r * 2);
      };
      for (const m of ep.miners) hole((NYA.lerp(m.px, m.x, alpha) + 0.5) * ts, (NYA.lerp(m.py, m.y, alpha) + 0.5) * ts, R);
      hole((M.x(M.elev) + 0.5) * ts, (M.y(M.elev) + 0.5) * ts, 2.5 * ts);
      ctx.drawImage(oc, 0, 0, oc.width, oc.height, 0, 0, W, H);
    }

    drawMilkNode(ctx, X, Y, ts, i, t) {
      const M = this.ep.mine, ep = this.ep;
      const f = M.milkMax[i] ? M.milk[i] / M.milkMax[i] : 0;
      const cx = X + ts / 2, cy = Y + ts * 0.58;
      ctx.fillStyle = '#7aa0c8'; ctx.beginPath(); ctx.ellipse(cx, cy, ts * 0.38, ts * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(cx, cy, ts * 0.32 * (0.4 + 0.6 * f), ts * 0.19 * (0.4 + 0.6 * f), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.9 + k * 0.5 + i * 0.13) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(cx + (k ? 0.12 : -0.1) * ts, cy - ph * ts * 0.35, ts * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const p = ep.pumps[i];
      if (p && p.built) {
        // a little nodding-donkey pumpjack
        const active = p.op && ep.t - (p.pumping || -9) < 0.3;
        const ang = active ? Math.sin(t * 5) * 0.35 : 0.1;
        ctx.save(); ctx.translate(X + ts * 0.5, Y + ts * 0.42);
        ctx.fillStyle = '#ff9ec4'; ctx.fillRect(-ts * 0.05, -ts * 0.05, ts * 0.1, ts * 0.32);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-ts * 0.36, -ts * 0.06, ts * 0.72, ts * 0.1);
        ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(ts * 0.36, -ts * 0.01, ts * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // fill gauge
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(X + ts * 0.15, Y + ts * 0.86, ts * 0.7, Math.max(2, ts * 0.07));
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(X + ts * 0.15, Y + ts * 0.86, ts * 0.7 * f, Math.max(2, ts * 0.07));
    }

    drawPipes(ctx, M, ts, t, ep) {
      const pipe = ep.pipe;
      let any = false;
      for (let i = 0; i < M.n; i++) if (pipe[i]) { any = true; break; }
      if (!any) return;
      const flowing = Object.values(ep.pumps).some(p => p.op && ep.t - (p.pumping || -9) < 0.3);
      const isP = j => pipe[j] || M.type[j] === T.ELEV;
      ctx.lineCap = 'round';
      for (const [w, col] of [[0.2, '#5a7aa8'], [0.12, '#e8f4ff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, ts * w);
        ctx.beginPath();
        for (let i = 0; i < M.n; i++) {
          if (!pipe[i]) continue;
          const x = M.x(i) * ts + ts / 2, y = M.y(i) * ts + ts / 2;
          for (const nb of M.nbrs(i)) {
            if (nb < i && pipe[nb]) continue;
            const pumpHere = ep.pumps[nb] && ep.pumps[nb].stand === i;
            if (!(isP(nb) || pumpHere)) continue;
            ctx.moveTo(x, y); ctx.lineTo(M.x(nb) * ts + ts / 2, M.y(nb) * ts + ts / 2);
          }
          ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y);
        }
        ctx.stroke();
      }
      if (flowing) {
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < M.n; i++) {
          if (!pipe[i] || ((i + Math.floor(t * 6)) % 3)) continue;
          ctx.beginPath(); ctx.arc(M.x(i) * ts + ts / 2, M.y(i) * ts + ts / 2, ts * 0.05, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    drawMochi(ctx, X, Y, ts, i, t) {
      const M = this.ep.mine;
      const sq = 1 + 0.06 * Math.sin(t * 4 + i);
      const cx = X + ts / 2, cy = Y + ts * 0.6;
      ctx.fillStyle = '#fff6fa';
      ctx.beginPath(); ctx.ellipse(cx, cy, ts * 0.36 * sq, ts * 0.28 / sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffb3c8'; ctx.lineWidth = Math.max(1, ts * 0.05); ctx.stroke();
      ctx.fillStyle = '#2a1f33';
      ctx.beginPath(); ctx.arc(cx - ts * 0.1, cy - ts * 0.03, ts * 0.03, 0, Math.PI * 2); ctx.arc(cx + ts * 0.1, cy - ts * 0.03, ts * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,126,182,0.6)'; ctx.beginPath(); ctx.arc(cx - ts * 0.18, cy + ts * 0.03, ts * 0.04, 0, Math.PI * 2); ctx.arc(cx + ts * 0.18, cy + ts * 0.03, ts * 0.04, 0, Math.PI * 2); ctx.fill();
      const left = M.dens[i] - M.dropped[i];
      if (left > 1) { ctx.font = `900 ${Math.max(8, ts * 0.26)}px "Mochiy Pop One"`; ctx.textAlign = 'right'; ctx.fillStyle = '#c2185b'; ctx.fillText('×' + left, X + ts * 0.95, Y + ts * 0.3); }
    }
    drawFish(ctx, x, y, ts, t, id) {
      const wig = Math.sin(t * 8 + id) * 0.25;
      ctx.save(); ctx.translate(x + Math.sin(t * 1.3 + id) * ts * 0.12, y); ctx.rotate(wig * 0.3);
      ctx.fillStyle = '#ff7a3c';
      ctx.beginPath(); ctx.ellipse(0, 0, ts * 0.18, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-ts * 0.15, 0); ctx.lineTo(-ts * 0.3, -ts * 0.1 + wig * ts * 0.1); ctx.lineTo(-ts * 0.3, ts * 0.1 + wig * ts * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ts * 0.09, -ts * 0.02, ts * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    drawCracks(ctx, X, Y, ts, f) {
      if (f >= 0.95) return;
      ctx.strokeStyle = 'rgba(20,10,25,0.75)'; ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.beginPath();
      ctx.moveTo(X + ts * 0.5, Y + ts * 0.5); ctx.lineTo(X + ts * 0.3, Y + ts * 0.25);
      if (f < 0.66) { ctx.moveTo(X + ts * 0.5, Y + ts * 0.5); ctx.lineTo(X + ts * 0.78, Y + ts * 0.36); ctx.lineTo(X + ts * 0.86, Y + ts * 0.18); }
      if (f < 0.33) { ctx.moveTo(X + ts * 0.5, Y + ts * 0.5); ctx.lineTo(X + ts * 0.42, Y + ts * 0.82); ctx.moveTo(X + ts * 0.5, Y + ts * 0.5); ctx.lineTo(X + ts * 0.15, Y + ts * 0.62); }
      ctx.stroke();
    }

    // Sushi Grotto water: translucent blue with a wavy, brighter surface line
    drawWater(ctx, X, Y, ts, i, t, surface) {
      ctx.fillStyle = 'rgba(70,170,230,0.42)';
      if (surface) {
        const top = Y + ts * 0.18;
        ctx.beginPath(); ctx.moveTo(X, Y + ts);
        for (let k = 0; k <= 6; k++) ctx.lineTo(X + ts * k / 6, top + Math.sin(t * 3 + i * 0.7 + k * 1.1) * ts * 0.04);
        ctx.lineTo(X + ts, Y + ts); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(210,245,255,0.7)'; ctx.lineWidth = Math.max(1, ts * 0.05);
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) { const px = X + ts * k / 6, py = top + Math.sin(t * 3 + i * 0.7 + k * 1.1) * ts * 0.04; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
      } else ctx.fillRect(X, Y, ts, ts);
      // a lazy bubble now and then
      const ph = (t * 0.6 + i * 0.37) % 1;
      if ((i * 7) % 5 === 0) { ctx.fillStyle = 'rgba(220,250,255,0.55)'; ctx.beginPath(); ctx.arc(X + ts * (0.3 + 0.4 * ((i * 13) % 10) / 10), Y + ts * (0.9 - 0.6 * ph), ts * 0.05, 0, Math.PI * 2); ctx.fill(); }
    }
    // one nigiri: rice block + topping (0 salmon, 1 tuna, 2 tamago with a nori band), centred at x,y, width w
    drawNigiri(ctx, x, y, w, kind) {
      const h = w * 0.42;
      ctx.fillStyle = '#fffdf5'; NYA.rrect(ctx, x - w / 2, y - h / 2, w, h, h * 0.45); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,170,0.6)'; ctx.fillRect(x - w * 0.3, y + h * 0.1, w * 0.06, w * 0.06); ctx.fillRect(x + w * 0.15, y - h * 0.05, w * 0.06, w * 0.06);
      const top = ['#ff8a5c', '#e0405a', '#ffd23f'][kind];
      ctx.fillStyle = top; NYA.rrect(ctx, x - w * 0.56, y - h * 0.95, w * 1.12, h * 0.75, h * 0.35); ctx.fill();
      if (kind === 0) { ctx.strokeStyle = 'rgba(255,240,230,0.85)'; ctx.lineWidth = Math.max(1, w * 0.06); for (const k of [-0.25, 0.05, 0.35]) { ctx.beginPath(); ctx.moveTo(x + w * k, y - h * 0.9); ctx.lineTo(x + w * (k + 0.12), y - h * 0.3); ctx.stroke(); } }
      if (kind === 2) { ctx.fillStyle = '#1f3b2a'; ctx.fillRect(x - w * 0.1, y - h, w * 0.2, h * 1.45); }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x - w * 0.35, y - h * 0.8, w * 0.18, Math.max(1, h * 0.12));
    }
    drawNigiriTile(ctx, X, Y, ts, i, t) {
      const M = this.ep.mine, left = M.dens[i] - M.dropped[i];
      const spots = left === 1 ? [[0.5, 0.58]] : left === 2 ? [[0.32, 0.4], [0.66, 0.68]] : [[0.3, 0.32], [0.7, 0.42], [0.45, 0.76]];
      spots.forEach(([fx, fy], k) => this.drawNigiri(ctx, X + fx * ts, Y + fy * ts, ts * (left === 1 ? 0.5 : 0.36), (i + k) % 3));
    }
    // ---------------------------------------------------------------- Mousehole Maze
    drawNest(ctx, X, Y, ts, i, t) {
      const cx = X + ts * 0.5, cy = Y + ts * 0.6;
      ctx.fillStyle = '#e8c56a'; // straw ring
      ctx.beginPath(); ctx.ellipse(cx, cy, ts * 0.38, ts * 0.27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b8903e'; ctx.lineWidth = Math.max(1, ts * 0.04);
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + i; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * ts * 0.24, cy + Math.sin(a) * ts * 0.16); ctx.lineTo(cx + Math.cos(a + 0.5) * ts * 0.4, cy + Math.sin(a + 0.5) * ts * 0.28); ctx.stroke(); }
      ctx.fillStyle = '#1a0f08'; // the hole (an arched mousehole)
      ctx.beginPath(); ctx.moveTo(cx - ts * 0.2, cy + ts * 0.12); ctx.lineTo(cx - ts * 0.2, cy - ts * 0.02); ctx.arc(cx, cy - ts * 0.02, ts * 0.2, Math.PI, 0); ctx.lineTo(cx + ts * 0.2, cy + ts * 0.12); ctx.closePath(); ctx.fill();
      if (Math.sin(t * 1.3 + i * 2.1) > 0.45) { // eyes in the dark
        ctx.fillStyle = '#ffd96a';
        ctx.fillRect(cx - ts * 0.09, cy - ts * 0.04, Math.max(1, ts * 0.05), Math.max(1, ts * 0.05));
        ctx.fillRect(cx + ts * 0.04, cy - ts * 0.04, Math.max(1, ts * 0.05), Math.max(1, ts * 0.05));
      }
      this.drawCheese(ctx, X + ts * 0.82, Y + ts * 0.85, ts * 0.2, false);
    }
    // a cheese wedge (crumbs from mice) or a whole wheel (from a smashed nest), centred at x,y
    drawCheese(ctx, x, y, w, wheel) {
      if (wheel) {
        ctx.fillStyle = '#e0a83a'; ctx.beginPath(); ctx.ellipse(x, y, w * 0.5, w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd96a'; ctx.beginPath(); ctx.ellipse(x, y - w * 0.08, w * 0.5, w * 0.26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.moveTo(x, y - w * 0.08); ctx.lineTo(x + w * 0.5, y - w * 0.1); ctx.lineTo(x + w * 0.36, y + w * 0.08); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d99a2a'; ctx.beginPath(); ctx.arc(x - w * 0.2, y - w * 0.1, w * 0.06, 0, Math.PI * 2); ctx.arc(x + w * 0.1, y - w * 0.2, w * 0.05, 0, Math.PI * 2); ctx.fill();
        return;
      }
      ctx.fillStyle = '#ffd96a'; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y + w * 0.25); ctx.lineTo(x + w * 0.5, y + w * 0.25); ctx.lineTo(x + w * 0.35, y - w * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d99a2a'; ctx.beginPath(); ctx.arc(x + w * 0.05, y + w * 0.05, w * 0.08, 0, Math.PI * 2); ctx.arc(x + w * 0.28, y - w * 0.08, w * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    drawMouse(ctx, mo, alpha, ts, t) {
      const D = NYA.MICE[mo.kind];
      const x = NYA.lerp(mo.px, mo.x, alpha), y = NYA.lerp(mo.py, mo.y, alpha);
      const moving = Math.abs(mo.x - mo.px) + Math.abs(mo.y - mo.py) > 1e-4;
      const s = ts * (D.big ? 0.56 : 0.42);
      const X = (x + 0.5) * ts, Y = (y + 0.86) * ts - (moving ? Math.abs(Math.sin(t * 16 + mo.id)) * ts * 0.05 : 0);
      const body = mo.hitT > 0 ? '#ffffff' : mo.kind === 'bruiser' ? '#7a5a44' : mo.kind === 'pickpocket' ? '#8d8799' : '#b3adbf';
      ctx.save(); ctx.translate(X, Y); ctx.scale(mo.face || 1, 1);
      ctx.strokeStyle = '#ff9ec4'; ctx.lineWidth = Math.max(1, s * 0.1); // tail
      ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.25); ctx.quadraticCurveTo(-s * 1.0, -s * 0.05 + Math.sin(t * 8 + mo.id) * s * 0.2, -s * 1.05, -s * 0.6); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.6, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      const shape = () => { // body, head + snout, ear: stroked dark first for an outline, then filled
        ctx.beginPath(); ctx.ellipse(-s * 0.05, -s * 0.32, s * 0.58, s * 0.34, 0, 0, Math.PI * 2);
        ctx.moveTo(s * 0.25, -s * 0.66); ctx.quadraticCurveTo(s * 0.8, -s * 0.5, s * 0.86, -s * 0.3); ctx.lineTo(s * 0.25, -s * 0.12); ctx.closePath();
        ctx.moveTo(s * 0.5, -s * 0.72); ctx.arc(s * 0.3, -s * 0.72, s * 0.2, 0, Math.PI * 2);
      };
      ctx.strokeStyle = '#1a1020'; ctx.lineWidth = Math.max(2, s * 0.16); ctx.lineJoin = 'round';
      shape(); ctx.stroke();
      ctx.fillStyle = body; shape(); ctx.fill();
      ctx.fillStyle = '#ff9ec4'; ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.72, s * 0.11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.86, -s * 0.31, s * 0.07, 0, Math.PI * 2); ctx.fill(); // nose
      if (mo.kind === 'pickpocket') { ctx.fillStyle = '#2a1f33'; ctx.fillRect(s * 0.38, -s * 0.55, s * 0.36, s * 0.13); } // bandit mask
      ctx.fillStyle = mo.kind === 'pickpocket' ? '#ffd96a' : '#1a1020';
      ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.49, s * 0.055, 0, Math.PI * 2); ctx.fill(); // eye
      if (mo.kind === 'bruiser') { ctx.strokeStyle = '#1a1020'; ctx.lineWidth = Math.max(1, s * 0.06); ctx.beginPath(); ctx.moveTo(s * 0.45, -s * 0.62); ctx.lineTo(s * 0.64, -s * 0.56); ctx.stroke(); }
      ctx.restore();
      if (mo.item) NYA.drawOreShape(ctx, NYA.qInfo(mo.item.q).shape, X, Y - s * 0.95, ts * 0.1, NYA.qInfo(mo.item.q).color, '#1a1020');
      if (mo.hp < mo.maxHp) {
        const f = NYA.clamp(mo.hp / mo.maxHp, 0, 1), bw = s * 1.1;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(X - bw / 2 - 1, Y - s * 1.2 - 1, bw + 2, Math.max(2, ts * 0.05) + 2);
        ctx.fillStyle = '#ff5c7a'; ctx.fillRect(X - bw / 2, Y - s * 1.2, bw * f, Math.max(2, ts * 0.05));
      }
    }
    // Hairball Cannon: a little scratching-post tower with a cat-eared cannon head
    drawTurret(ctx, tu, ts, t, M) {
      const X = (M.x(tu.idx) + 0.5) * ts, Y = (M.y(tu.idx) + 0.95) * ts;
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(X - ts * 0.3, Y - ts * 0.12, ts * 0.6, ts * 0.12);
      ctx.fillStyle = '#d9b98a'; ctx.fillRect(X - ts * 0.1, Y - ts * 0.5, ts * 0.2, ts * 0.4);
      ctx.fillStyle = '#b08a5a'; for (let k = 0; k < 4; k++) ctx.fillRect(X - ts * 0.1, Y - ts * (0.46 - k * 0.1), ts * 0.2, Math.max(1, ts * 0.03));
      const hx = X, hy = Y - ts * 0.6, a = tu.aim == null ? -Math.PI / 2 : tu.aim;
      const recoil = tu.cd > NYA.TURRET_CD - 0.12 ? 0.06 : 0;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
      ctx.fillStyle = '#5b4a6a'; ctx.fillRect(ts * (0.05 - recoil), -ts * 0.06, ts * 0.3, ts * 0.12);
      ctx.restore();
      ctx.fillStyle = '#ff9ec4'; ctx.beginPath(); ctx.arc(hx, hy, ts * 0.17, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - ts * 0.16, hy - ts * 0.05); ctx.lineTo(hx - ts * 0.12, hy - ts * 0.27); ctx.lineTo(hx - ts * 0.02, hy - ts * 0.14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + ts * 0.16, hy - ts * 0.05); ctx.lineTo(hx + ts * 0.12, hy - ts * 0.27); ctx.lineTo(hx + ts * 0.02, hy - ts * 0.14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1020'; ctx.fillRect(hx - ts * 0.08, hy - ts * 0.03, Math.max(1, ts * 0.04), Math.max(1, ts * 0.04)); ctx.fillRect(hx + ts * 0.04, hy - ts * 0.03, Math.max(1, ts * 0.04), Math.max(1, ts * 0.04));
      if (tu.by === 'chan') { ctx.fillStyle = '#7af0e0'; ctx.beginPath(); ctx.moveTo(hx, hy - ts * 0.2); ctx.lineTo(hx - ts * 0.1, hy - ts * 0.27); ctx.lineTo(hx - ts * 0.1, hy - ts * 0.13); ctx.lineTo(hx + ts * 0.1, hy - ts * 0.27); ctx.lineTo(hx + ts * 0.1, hy - ts * 0.13); ctx.closePath(); ctx.fill(); }
    }
    drawTangle(ctx, X, Y, ts, i, n) {
      ctx.strokeStyle = n > 1 ? 'rgba(255,158,196,0.85)' : 'rgba(255,158,196,0.45)';
      ctx.lineWidth = Math.max(1, ts * 0.05);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = ((i * 17 + k * 41) % 100) / 100;
        ctx.moveTo(X + ts * a, Y + ts * 0.1);
        ctx.bezierCurveTo(X + ts * (1 - a), Y + ts * 0.4, X + ts * a, Y + ts * 0.6, X + ts * (1 - a), Y + ts * 0.9);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(122,240,224,0.6)';
      ctx.beginPath(); ctx.arc(X + ts * 0.5, Y + ts * 0.5, ts * 0.18, 0, Math.PI * 2); ctx.stroke();
    }

    drawMiner(ctx, m, alpha, ts, t, ep, outSlots) {
      const M = ep.mine;
      let x = NYA.lerp(m.px, m.x, alpha), y = NYA.lerp(m.py, m.y, alpha);
      let anim = 'idle', eyes = null, mouth = null, droop = 0, swing = 0, face = m.face;
      if (m.helping && m.state === 'pump') { // helpers crowd around the crank instead of standing on the operator
        const p = ep.pumps[m.pumpNode], k = p && p.helpers ? Math.max(0, p.helpers.indexOf(m.id)) : 0;
        x += (k % 2 ? -1 : 1) * (0.32 + 0.16 * Math.floor(k / 2)); y -= 0.06 * (k + 1);
      }
      switch (m.state) {
        case 'walk': case 'return': case 'hotbox': anim = (m.zoomT > ep.t || m.boost3am > 0) ? 'zoom' : 'walk'; break;
        case 'mine': case 'pbuild': case 'pump': anim = 'mine'; swing = Math.max(0, m.swingAnim / 0.25); break;
        case 'pipe': anim = 'walk'; break;
        case 'flop': anim = 'walk'; droop = 1; eyes = 'half'; mouth = 'flat'; break;
        case 'out': {
          const k = outSlots[m.tile] = (outSlots[m.tile] || 0) + 1;
          x += ((k % 3) - 1) * 0.28; y += Math.floor(k / 3) * 0.12 - 0.08;
          anim = m.flopped ? 'sleep' : 'idle';
          if (!m.flopped) { eyes = ep.fullClear ? 'happy' : 'half'; if (ep.fullClear) anim = 'cheer'; }
          break;
        }
        case 'distract':
          if (m.dkind === 'loaf') anim = 'loaf';
          else if (m.dkind === 'groom') { anim = 'groom'; eyes = 'closed'; }
          else if (m.dkind === 'box') anim = 'box';
          else if (m.dkind === 'butterfly') anim = m.pathI < m.path.length ? 'walk' : 'cheer';
          else { anim = 'idle'; eyes = 'open'; }
          break;
        case 'nap': anim = 'sleep'; break;
        case 'smoke': anim = 'smoke'; eyes = 'half'; break;
        case 'rescue': anim = 'flat'; break;
        case 'drop': anim = 'idle'; eyes = 'happy'; break;
        case 'wait': anim = 'idle'; break;
      }
      if (ep.catterall && anim !== 'sleep' && anim !== 'loaf') { eyes = 'pin'; mouth = 'none'; }
      let lift = 0;
      if (m.state === 'rescue') { const f = 1 - m.timer / 2.4; lift = f < 0.4 ? 0 : (f < 0.7 ? (f - 0.4) * 8 : 0); }
      const X = (x + 0.5) * ts, Y = (y + 0.92) * ts - lift * ts;
      const look = m.cg;
      if (m.ghost) { ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 3 + m.id); }
      NYA.drawCatgirl(ctx, X, Y - (m.ghost ? ts * 0.08 * (1 + Math.sin(t * 2 + m.id)) : 0), ts * 0.98, { fur: look.fur, hair: look.hair, outfit: look.outfit, hat: !ep.cfg.noHats }, {
        lantern: !!m.ghost || this.ep.eventKey === 'obon',
        anim, t: t + m.id * 0.37, face, swing, eyes, mouth, droop, bag: m.bag.length, lamp: true, fold: m.s.fold || 0, ghost: m.ghost,
      });
      ctx.globalAlpha = 1;
      // butterfly / pebble props
      if (m.state === 'distract' && m.dkind === 'butterfly') {
        const bx = X + Math.sin(t * 5 + m.id) * ts * 0.4, by = Y - ts * (0.9 + 0.15 * Math.sin(t * 7));
        ctx.fillStyle = '#ffd23f'; const w = Math.abs(Math.sin(t * 20)) * ts * 0.12 + 1;
        ctx.fillRect(bx - w, by - ts * 0.05, w, ts * 0.1); ctx.fillRect(bx, by - ts * 0.05, w, ts * 0.1);
      }
      if (m.state === 'distract' && m.dkind === 'pebble') {
        const f = 1 - m.timer / 2;
        ctx.fillStyle = '#b9b0c9'; ctx.beginPath(); ctx.arc(X + face * ts * (0.3 + f * 0.6), Y - ts * 0.08, ts * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      // claw
      if (m.state === 'rescue') {
        const f = 1 - m.timer / 2.4;
        const cy = f < 0.4 ? NYA.lerp(-ts * 2, Y - ts * 1.1, f / 0.4) : Y - ts * 1.1 - lift * ts;
        ctx.strokeStyle = '#c9d2e0'; ctx.lineWidth = Math.max(2, ts * 0.06);
        ctx.beginPath(); ctx.moveTo(X, -ts * 3); ctx.lineTo(X, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X - ts * 0.3, cy + ts * 0.35); ctx.lineTo(X - ts * 0.2, cy); ctx.lineTo(X + ts * 0.2, cy); ctx.lineTo(X + ts * 0.3, cy + ts * 0.35); ctx.stroke();
      }
      // stamina pip bar
      if (m.state !== 'out' || !m.flopped) {
        const f = NYA.clamp(m.stamina / m.maxSt, 0, 1);
        const bw = ts * 0.6, bx = X - bw / 2, by = Y + ts * 0.02;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 1, by - 1, bw + 2, Math.max(3, ts * 0.08) + 2);
        ctx.fillStyle = f > 0.5 ? '#7af0a0' : f > 0.2 ? '#ffd23f' : '#ff5c7a';
        ctx.fillRect(bx, by, bw * f, Math.max(3, ts * 0.08));
      }
      // dripping wet (Sushi Grotto)
      if (m.wetT > 0) {
        ctx.fillStyle = 'rgba(140,215,255,0.9)';
        for (let k = 0; k < 2; k++) {
          const ph = (t * 1.6 + k * 0.5 + m.id * 0.3) % 1;
          ctx.beginPath(); ctx.arc(X + (k ? 0.22 : -0.2) * ts, Y - ts * (0.7 - 0.6 * ph), Math.max(1, ts * 0.045), 0, Math.PI * 2); ctx.fill();
        }
      }
      // emote bubble
      if (m.emote) this.drawEmote(ctx, X, Y - ts * 1.05, ts, m.emote, t);
      else if (m.state === 'out' && m.flopped || m.state === 'nap') this.drawEmote(ctx, X, Y - ts * 0.9, ts, 'zzz', t);
      else if (m.state === 'distract' && m.dkind === 'loaf') this.drawEmote(ctx, X, Y - ts * 0.8, ts, 'loaf', t);
    }

    drawEmote(ctx, X, Y, ts, e, t) {
      const map = { wet: '💧', mad: '💢', scared: 'EEK!', zoom: '!!', zzz: 'z z Z', dots: '…', yuck: '~_~', oops: '!?', menace: ':3', spark: '✦', blunt: '♪', heart: '♥', flop: '@_@', loaf: 'loaf' };
      const txt = map[e] || e;
      const s = Math.max(9, ts * 0.28);
      ctx.font = `800 ${s}px "M PLUS Rounded 1c", sans-serif`;
      const w = ctx.measureText(txt).width + s * 0.8;
      const bob = Math.sin(t * 5) * ts * 0.03;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      NYA.rrect(ctx, X - w / 2, Y - s * 0.9 + bob, w, s * 1.3, s * 0.5); ctx.fill();
      ctx.fillStyle = e === 'zoom' ? '#ff3b5c' : e === 'heart' ? '#ff7eb6' : '#2a1f33';
      ctx.textAlign = 'center';
      ctx.fillText(txt, X, Y + s * 0.12 + bob);
    }

    drawMushroom(ctx, rdt, ts) {
      const mu = this.mushroom, M = this.ep.mine;
      mu.t += rdt;
      if (mu.t > 3.2) { this.mushroom = null; return; }
      const X = M.x(mu.i) * ts + ts / 2, Y0 = M.y(mu.i) * ts + ts / 2;
      const f = Math.min(1, mu.t / 1.2);
      const Y = Y0 - f * ts * 4;
      ctx.globalAlpha = Math.min(1, (3.2 - mu.t) / 0.8);
      ctx.fillStyle = '#ffb36b'; ctx.fillRect(X - ts * 0.6, Y, ts * 1.2, Y0 - Y);
      const R = ts * (1.5 + f * 2);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(X, Y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9e3f';
      ctx.beginPath(); ctx.moveTo(X - R * 0.9, Y - R * 0.3); ctx.lineTo(X - R * 0.7, Y - R * 1.5); ctx.lineTo(X - R * 0.2, Y - R * 0.85); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(X + R * 0.9, Y - R * 0.3); ctx.lineTo(X + R * 0.7, Y - R * 1.5); ctx.lineTo(X + R * 0.2, Y - R * 0.85); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a3a1a';
      ctx.beginPath(); ctx.arc(X - R * 0.35, Y - R * 0.1, R * 0.12, 0, Math.PI * 2); ctx.arc(X + R * 0.35, Y - R * 0.1, R * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = R * 0.06; ctx.strokeStyle = '#7a3a1a';
      ctx.beginPath(); ctx.arc(X - R * 0.08, Y + R * 0.2, R * 0.1, 0.2, Math.PI - 0.2); ctx.arc(X + R * 0.08, Y + R * 0.2, R * 0.1, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  NYA.MineView = MineView;
})(globalThis.NYA = globalThis.NYA || {});
