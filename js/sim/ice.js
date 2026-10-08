// Purrmafrost Caverns (user idea): sliding ice. A catgirl who steps onto ice slides that way until the next tile is
// blocked or she reaches ground that isn't ice. She can only stop on ice against something, so routes are straight
// runs and the crew plans around them ("wonderfully elaborate routes"). Sliding is quick and free; walking the
// frozen rock is slow and cold. Dug-out tiles are plain floor, so digging builds new places to stop.
// Slides are one-way, so the field is too: homeDist is reach from the elevator, and backDist/backNext (a search over
// the reversed moves) is the way home. Slide somewhere with no way back and the Rescue Claw comes for you.
// Mixed into NYA.Episode; only active in mines with the 'ice' quirk.
(function (NYA) {
  'use strict';
  const P = NYA.Episode.prototype;

  P.initIce = function () {
    this.iceOn = NYA.hasQuirk(this.def, 'ice');
    if (!this.iceOn) return;
    const n = this.n;
    this.fwd = new Int32Array(n * 4).fill(-1); // fwd[c*4+d]: where a move from c in direction d ends (E, W, S, N)
    this.backDist = new Int32Array(n).fill(-1);
    this.backNext = new Int32Array(n).fill(-1);
  };

  // the tile one step from i in direction d, or -1 at the edge
  P.iceStep = function (i, d) {
    const M = this.mine, w = M.w, x = i % w, y = (i / w) | 0;
    if (d === 0) return x < w - 1 ? i + 1 : -1;
    if (d === 1) return x > 0 ? i - 1 : -1;
    if (d === 2) return y < M.h - 1 ? i + w : -1;
    return y > 0 ? i - w : -1;
  };
  // where a catgirl standing on c ends up moving in direction d, or -1 if she can't
  P.slideFrom = function (c, d) {
    const M = this.mine;
    let t = this.iceStep(c, d);
    if (t < 0 || !M.isOpen(t)) return -1;
    while (M.ice[t]) { const nx = this.iceStep(t, d); if (nx < 0 || !M.isOpen(nx)) break; t = nx; }
    return t;
  };
  P.buildIceGraph = function () {
    const M = this.mine, f = this.fwd;
    for (let c = 0; c < this.n; c++) for (let d = 0; d < 4; d++) f[c * 4 + d] = M.isOpen(c) ? this.slideFrom(c, d) : -1;
  };

  // a slide starts (len tiles): stats, the "wheee", the first-time ribbon
  P.onSlide = function (m, to, len) {
    this.st.slides = (this.st.slides || 0) + 1;
    if (len > (this.st.longSlide || 0)) this.st.longSlide = Math.round(len);
    this.ev({ t: 'slide', m: m.id, i: to, n: Math.round(len) });
    if (this.game.onSlide) this.game.onSlide(this, len);
  };

  // bfs() in an ice mine: every move (a step, or a whole slide) counts 1
  P.iceBfs = function (start) {
    const dist = this._dist, prev = this._prev, q = this._q, f = this.fwd;
    dist.fill(-1);
    let head = 0, tail = 0;
    q[tail++] = start; dist[start] = 0; prev[start] = -1;
    while (head < tail) {
      const c = q[head++], d1 = dist[c] + 1;
      for (let d = 0; d < 4; d++) {
        const t = f[c * 4 + d];
        if (t >= 0 && dist[t] < 0) { dist[t] = d1; prev[t] = c; q[tail++] = t; }
      }
    }
    return dist;
  };

  // After homeDist: the way home (the reversed moves, searched from the elevator), and reveal the ice the crew can
  // slide over (it's seen like walked ground).
  P.iceAfterField = function () {
    const n = this.n, f = this.fwd, bd = this.backDist, bn = this.backNext, M = this.mine;
    const start = this._inStart || (this._inStart = new Int32Array(n + 1)), src = this._inSrc || (this._inSrc = new Int32Array(n * 4));
    const fill = this._inFill || (this._inFill = new Int32Array(n));
    start.fill(0);
    for (let k = 0; k < n * 4; k++) if (f[k] >= 0) start[f[k] + 1]++;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    fill.set(start.subarray(0, n));
    for (let k = 0; k < n * 4; k++) { const t = f[k]; if (t >= 0) src[fill[t]++] = (k / 4) | 0; }
    bd.fill(-1); bn.fill(-1);
    const q = this._q;
    let head = 0, tail = 0;
    q[tail++] = M.elev; bd[M.elev] = 0;
    while (head < tail) {
      const t = q[head++];
      for (let j = start[t]; j < start[t + 1]; j++) { const c = src[j]; if (bd[c] < 0) { bd[c] = bd[t] + 1; bn[c] = t; q[tail++] = c; } }
    }
    const hd = this.homeDist;
    // catnip left on ice nobody can stop on any more (the rock a slide stopped against got mined) skitters to the elevator
    for (const it of this.loose) if (M.ice[it.idx] && hd[it.idx] < 0) { it.idx = M.elev; it.claim = 0; }
    for (let c = 0; c < n; c++) {
      if (hd[c] < 0) continue;
      for (let d = 0; d < 4; d++) {
        const t = f[c * 4 + d];
        if (t < 0) continue;
        for (let i = this.iceStep(c, d); i >= 0 && i !== t; i = this.iceStep(i, d)) { this.reveal(i); for (const nb of M.nbrs(i)) this.reveal(nb); }
      }
    }
  };
})(globalThis.NYA = globalThis.NYA || {});
