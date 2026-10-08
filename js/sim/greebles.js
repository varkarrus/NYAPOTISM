// Greeble Crash Site (GDD §9.2): greebles are mobile resources, little alien doodads that wander the open tiles and
// scoot away from catgirls. They hover a little faster than the crew walks, so a lone chaser only catches one she has
// cornered: run into a dead end, pinned against the hull, or closed in on from both sides. Lasering a greeble sets
// the crew on it together. Mixed into NYA.Episode; only runs in mines with the 'greebles' quirk.
(function (NYA) {
  'use strict';
  const P = NYA.Episode.prototype;
  // a catgirl in one of these states grabs a cornered greeble (or one she's right on top of) on her way past,
  // and the greebles keep away from her
  const GRAB = { idle: 1, wait: 1, walk: 1, mine: 1, chase: 1, return: 1, drop: 1 };

  P.initGreebles = function () {
    this.greebles = [];
    this.greeblesOn = NYA.hasQuirk(this.def, 'greebles');
    if (!this.greeblesOn) return;
    const M = this.mine, rng = this.grRng = new NYA.RNG('greebles:' + this.cfg.seed);
    // they hover just faster than the crew's median walker (no slick floors or mud for them)
    const sp = this.miners.filter(m => !m.ghost).map(m => this.speedOf(m)).sort((a, b) => a - b);
    this.grSpeed = (sp.length ? sp[sp.length >> 1] : 1) * NYA.GREEBLE_SPEED * (this.cfg.greebleSlow || 1);
    let id = 1;
    for (const i of M.greebleSpawns) {
      if (!M.isOpen(i)) continue;
      this.greebles.push({ id: id++, tile: i, x: M.x(i), y: M.y(i), px: M.x(i), py: M.y(i), path: [], pathI: 0,
        planT: rng.next() * 2, awake: false, cornered: false, scared: false, chasers: 0, marked: 0,
        look: rng.int(0, 2), face: 1, gone: false });
    }
  };

  // the greebles run from her (a Greeble Whisperer they walk right up to)
  P.greebleThreat = function (m) { return !!GRAB[m.state] && !m.s.flags.greebleFriend; };

  P.tickGreebles = function (dt) {
    const M = this.mine;
    for (const gr of this.greebles) {
      gr.px = gr.x; gr.py = gr.y;
      if (!gr.awake) { // dormant until someone sees it
        if (!M.revealed[gr.tile]) continue;
        gr.awake = true;
        gr.leaveAt = this.t + NYA.GREEBLE_STAY[0] + this.grRng.next() * (NYA.GREEBLE_STAY[1] - NYA.GREEBLE_STAY[0]);
        this.st.greeblesSeen = (this.st.greeblesSeen || 0) + 1;
        this.ev({ t: 'gwake', i: gr.tile });
        if (this.game.onGreeble) this.game.onGreeble(this);
      }
      if (this.t >= gr.leaveAt && gr.marked <= this.t) { // bored: beams back up to the mothership
        gr.gone = true;
        this.st.greeblesLeft = (this.st.greeblesLeft || 0) + 1;
        this.ev({ t: 'gwarp', x: gr.x, y: gr.y });
        for (const o of this.miners) if (o.greeble === gr.id) { o.greeble = 0; if (o.state === 'chase') this.toIdle(o, 0.5); }
        continue;
      }
      this.updateGreeble(gr, dt);
    }
    // grabs: a catgirl right on top of a greeble, or next to one with nowhere left to run
    for (const gr of this.greebles) {
      if (!gr.awake || gr.gone) continue;
      for (const m of this.miners) {
        if (!GRAB[m.state] || m.bag.length >= m.s.carry) continue;
        const d = Math.abs(m.x - gr.x) + Math.abs(m.y - gr.y);
        if (d <= 0.45 || (d <= 1.05 && gr.cornered)) { this.grabGreeble(gr, m); break; }
      }
    }
    if (this.greebles.some(g => g.gone)) this.greebles = this.greebles.filter(g => !g.gone);
  };

  P.updateGreeble = function (gr, dt) {
    const rng = this.grRng;
    let close = false;
    for (const m of this.miners) if (this.greebleThreat(m) && Math.abs(m.x - gr.x) + Math.abs(m.y - gr.y) <= NYA.GREEBLE_SCARE) { close = true; break; }
    gr.scared = close;
    if (gr.pathI >= gr.path.length) { // on a tile: pick the next hop
      gr.cornered = false;
      if (close) this.fleeStep(gr);
      else {
        gr.planT -= dt;
        if (gr.planT <= 0) {
          gr.planT = 0.6 + rng.next() * 1.6;
          const opts = this.greebleSteps(gr);
          if (opts.length) { gr.path = [opts[rng.int(0, opts.length - 1)]]; gr.pathI = 0; }
        }
      }
    }
    this.moveGreeble(gr, dt, this.grSpeed * (close ? 1 : NYA.GREEBLE_WANDER) * (gr.marked > this.t ? NYA.GREEBLE_DAZZLE : 1));
  };

  // open tiles a greeble can hop to: not the elevator, not one another greeble is on
  P.greebleSteps = function (gr) {
    const M = this.mine;
    return M.nbrs(gr.tile).filter(nb => M.type[nb] === NYA.T.OPEN && !this.greebles.some(o => o !== gr && !o.gone && o.tile === nb));
  };

  // Scoot to the neighbouring tile farthest from every catgirl close by. None farther than here: cornered.
  P.fleeStep = function (gr) {
    const M = this.mine, threats = [];
    for (const m of this.miners) if (this.greebleThreat(m) && Math.abs(m.x - gr.x) + Math.abs(m.y - gr.y) <= NYA.GREEBLE_SCARE + 2) threats.push(m);
    const safety = i => { let d = 1e9; for (const m of threats) d = Math.min(d, Math.abs(m.x - M.x(i)) + Math.abs(m.y - M.y(i))); return d; };
    let best = -1, bs = safety(gr.tile) + 0.01;
    for (const nb of this.greebleSteps(gr)) {
      const sv = safety(nb) + this.grRng.next() * 0.05;
      if (sv > bs) { bs = sv; best = nb; }
    }
    if (best < 0) { gr.cornered = true; return; }
    gr.path = [best]; gr.pathI = 0;
  };

  P.moveGreeble = function (gr, dt, speed) {
    const M = this.mine;
    let remaining = speed * dt;
    while (remaining > 1e-6 && gr.pathI < gr.path.length) {
      const nxt = gr.path[gr.pathI];
      if (!M.isOpen(nxt)) { gr.path = []; gr.pathI = 0; break; }
      const tx = M.x(nxt), ty = M.y(nxt), dx = tx - gr.x, dy = ty - gr.y, d = Math.abs(dx) + Math.abs(dy);
      if (Math.abs(dx) > 0.01) gr.face = dx > 0 ? 1 : -1;
      if (d <= remaining) { gr.x = tx; gr.y = ty; gr.tile = nxt; gr.pathI++; remaining -= d; }
      else { gr.x += dx / d * remaining; gr.y += dy / d * remaining; remaining = 0; }
    }
  };

  P.grabGreeble = function (gr, m) {
    gr.gone = true;
    m.bag.push({ id: this.itemId++, q: 1, d: 1, greeble: 1, look: gr.look, claim: 0, idx: -1 });
    m.items++;
    this.st.greebles = (this.st.greebles || 0) + 1;
    if (gr.cornered && gr.scared) this.st.cornered = (this.st.cornered || 0) + 1;
    this.giveXP(m, 3);
    this.emote(m, 'heart', 1.2);
    this.ev({ t: 'grab', m: m.id, x: gr.x, y: gr.y, look: gr.look });
    for (const o of this.miners) if (o.greeble === gr.id) { o.greeble = 0; if (o.state === 'chase') this.toIdle(o, o === m ? 0.2 : 0.5); }
    if (this.game.onGrab) this.game.onGrab(this, m);
  };

  // the best greeble for her to go after, scored like a tile in chooseTarget, or null
  P.greebleOption = function (m, dist) {
    const M = this.mine, f = m.s.flags, cool = m.grCool || {};
    let best = null;
    for (const gr of this.greebles) {
      if (!gr.awake || gr.gone || !M.revealed[gr.tile] || (cool[gr.id] || 0) > this.t) continue;
      const d = dist[gr.tile];
      if (d < 0) continue;
      const marked = gr.marked > this.t && !f.ignoreLaser;
      if (gr.chasers >= (marked ? 3 : 1)) continue;
      if (!marked && d > this.noticeRange + 4) continue;
      let score = NYA.GREEBLE_VALUE * (f.greebleFriend ? 1.5 : 1) * 1.4 - d * 0.18 + this.rng.next() * 0.8;
      if (marked) score = Math.max(score, 0.2) * 10 + 8;
      if (!best || score > best.score) best = { kind: 'greeble', gr, score };
    }
    return best;
  };

  P.startChase = function (m, gr) {
    m.state = 'chase'; m.greeble = gr.id; m.chaseT = 0; m.chasePlan = 0; m.target = -1;
    gr.chasers++;
    m.path = this.pathTo(gr.tile, m.tile); m.pathI = 0;
    if (gr.marked > this.t) { m.zoom = 1 + 0.5 * (m.s.flags.zoomMult || 1); m.zoomT = this.t + 4; this.emote(m, 'zoom', 1); }
  };

  P.chaseGreeble = function (m, dt) {
    const gr = this.greebles.find(g => g.id === m.greeble);
    const quit = cool => {
      if (gr && cool) (m.grCool || (m.grCool = {}))[gr.id] = this.t + cool;
      this.release(m); this.toIdle(m, 0.3);
    };
    if (!gr || gr.gone || this.fullClear || m.bag.length >= m.s.carry) { quit(0); return; }
    m.chaseT += dt;
    if (m.chaseT > NYA.GREEBLE_PATIENCE * (gr.marked > this.t ? 2 : 1)) { // it got away (this time)
      this.emote(m, 'dots', 1.2);
      this.st.greebleMiss = (this.st.greebleMiss || 0) + 1;
      quit(6);
      return;
    }
    m.chasePlan -= dt;
    if (m.chasePlan <= 0 || m.pathI >= m.path.length) {
      m.chasePlan = 0.35;
      const dist = this.bfs(m.tile);
      if (dist[gr.tile] < 0) { quit(4); return; }
      m.path = this.pathTo(gr.tile, m.tile); m.pathI = 0;
    }
    this.move(m, dt, this.speedOf(m), true);
  };

  // Laser a greeble: for a while it's everyone's business (up to 3 chasers, twice the patience).
  P.markGreeble = function (idx) {
    const M = this.mine;
    const gr = this.greebles.find(g => g.awake && !g.gone && M.revealed[g.tile] && (g.tile === idx || Math.abs(g.x - M.x(idx)) + Math.abs(g.y - M.y(idx)) <= 0.6));
    if (!gr) return false;
    gr.marked = this.t + NYA.GREEBLE_MARK;
    gr.leaveAt = Math.max(gr.leaveAt, gr.marked + 5); // too curious to leave now
    this.st.marks++;
    this.st.greebleMarks = (this.st.greebleMarks || 0) + 1;
    this.ev({ t: 'gmark', x: gr.x, y: gr.y });
    for (const m of this.miners) {
      if (m.s.flags.ignoreLaser || m.bag.length >= m.s.carry || this.fullClear) continue;
      if (m.state === 'walk' || m.state === 'idle' || m.state === 'wait' || (m.state === 'mine' && this.rng.chance(0.6))) { this.release(m); this.chooseTarget(m); }
    }
    return true;
  };

  // the mine's perfect-cleared: the greebles beam back up to the mothership
  P.scatterGreebles = function () {
    for (const gr of this.greebles) if (gr.awake) this.ev({ t: 'gwarp', x: gr.x, y: gr.y });
    this.greebles = [];
    for (const m of this.miners) m.greeble = 0;
  };
})(globalThis.NYA = globalThis.NYA || {});
