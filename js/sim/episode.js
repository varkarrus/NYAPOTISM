// One Episode = one shift in one mine (GDD §3). Fixed-timestep simulation,
// no DOM. The renderer reads state + the `events` queue; the harness ignores both.
(function (NYA) {
  'use strict';
  const T = NYA.T;

  const DISTRACTIONS = [['butterfly', 25], ['groom', 25], ['loaf', 30], ['pebble', 20]];
  const CAN_DISTRACT = { walk: 1, mine: 1, return: 1, pump: 1, pipe: 1 };

  class Episode {
    // cfg: { tier, seed, crew:[catgirl], genOpts, laserMax, headlamp, headless, resonance,
    //        bombMult, sonarRadius, polishExp, centrifuge, bluntPotency, epNum }
    constructor(game, cfg) {
      this.game = game; this.cfg = cfg;
      this.tier = cfg.tier; this.def = NYA.TIERS[cfg.tier];
      this.mine = new NYA.Mine(this.def, cfg.seed, cfg.genOpts || {});
      this.rng = new NYA.RNG('ep:' + cfg.seed);
      const M = this.mine, n = M.n;
      this.n = n;
      this.t = 0;
      this.headless = !!cfg.headless;
      this.events = [];
      this.claims = new Uint8Array(n);
      this.isFront = new Uint8Array(n);
      this.homeDist = new Int32Array(n);
      this._dist = new Int32Array(n); this._prev = new Int32Array(n); this._q = new Int32Array(n);
      this.frontier = [];
      this.loose = []; this.itemId = 1;
      this.marks = [];
      this.chainQ = []; this.chainCounts = {}; this.chainId = 0;
      this.bombs = [];
      this.tunaUntil = 0; this.hotbox = null; this.catterall = false;
      this.haul = { value: 0, items: 0, byQ: new Array(12).fill(0), glow: 0, motherlode: 0, thread: 0, lost: 0, milk: 0, sushi: 0 };
      // Sushi Grotto water: only simulated while it's moving (a breach wakes it, settling puts it back to sleep)
      this.waterOn = this.mine.water.some(v => v);
      this.waterActive = false; this.waterT = 0; this.waterStamp = new Uint32Array(n); this.waterStepN = 0; this.drainT = 0;
      // T4 pumping (GDD §9.2): pumps keyed by milk-node index
      this.pipe = new Uint8Array(n); this.pipeConn = new Uint8Array(n);
      this.pumps = {}; this.milkFront = [];
      this.pumpRate = cfg.pumpRate || 2; this.junctions = !!cfg.junctions;
      // Tanuki events
      this.event = cfg.event ? NYA.EVENTS[cfg.event] : null;
      this.eventKey = cfg.event || null;
      this.wishes = 0; this.clusterLeft = {};
      for (let i = 0; i < n; i++) { const c = this.mine.cluster[i]; if (c >= 0 && this.mine.type[i] === T.ORE) this.clusterLeft[c] = (this.clusterLeft[c] || 0) + 1; }
      this.st = { tiles: 0, swings: 0, crits: 0, bestChain: 0, zoomies: 0, distractions: 0, allLoaf: 0, items: 0,
        marks: 0, blunts: 0, bombs: 0, rescues: 0, droneMarks: 0, motherlode: false, box: null, glowing: 0 };
      this.ended = false; this.endReason = null; this.fullClear = false; this.allOutT = -1;
      this.resLeft = 0;
      for (let i = 0; i < n; i++) if (M.isResource(i)) this.resLeft++;
      const rs = M.resourceStats();
      this.totalValue = rs.value; this.totalItems = rs.items;
      this.tierBase = NYA.tierBase(this.tier);
      this.resist = NYA.tierResist(this.tier);
      this.motherlodeSeen = false; this.boxSeen = false;
      // Sight: how far miners notice ore on their own, and how far opened tiles reveal fog
      this.rubbleP = NYA.tierRubble(this.tier);
      this.roughRng = new NYA.RNG('rubble:' + cfg.seed);
      this.darkness = NYA.tierDarkness(this.tier);
      this.sight = NYA.BASE_SIGHT + (cfg.headlamp || 0) - this.darkness;
      this.noticeRange = Math.max(1, Math.min(NYA.MAX_NOTICE, this.sight));
      this.revealR = Math.max(1, Math.min(NYA.MAX_REVEAL, 1 + (cfg.headlamp || 0) - this.darkness));
      if (cfg.lightsOut) { this.noticeRange = 1; this.revealR = 1; this.darkness = Math.max(this.darkness, 2); } // OVA: Lights Out
      this.droneT = 2;
      this.fieldDirty = true;
      this.recomputeField();
      this.crewCtx = { mineKey: this.def.key, tier: this.tier, crew: cfg.crew, sRankHere: game.hasSRank ? game.hasSRank(this.tier) : false };
      this.miners = cfg.crew.map((cg, k) => this.makeMiner(cg, k));
      if (cfg.ghosts) this.addGhosts(cfg.ghosts);
      if (this.event && this.event.goldfish) this.addGoldfish(this.event.goldfish);
    }

    ev(e) { if (!this.headless) this.events.push(e); }

    // Obon: ghost catgirls from past timelines (no XP, no roster slot)
    addGhosts(n) {
      const crew = this.cfg.crew;
      const lvl = crew.length ? Math.round(crew.reduce((a, c) => a + c.level, 0) / crew.length) : 1;
      for (let k = 0; k < n; k++) {
        const gfur = NYA.rollFur(this.rng);
        const ghost = { id: -(k + 1), name: 'Ghost #' + (k + 1), family: '', fur: gfur, hair: NYA.rollHair(this.rng, gfur),
          outfit: '#c9e3ff', apt: 1, level: lvl, xp: 0, traits: [], ghost: true };
        const m = this.makeMiner(ghost, this.miners.length);
        m.ghost = true;
        this.miners.push(m);
      }
    }
    // Summer Matsuri: goldfish swim in the open caverns, waiting to be scooped
    addGoldfish(n) {
      const M = this.mine, open = [];
      for (let i = 0; i < M.n; i++) if (M.type[i] === T.OPEN && i !== M.elev) open.push(i);
      for (let k = 0; k < n && open.length; k++) {
        const at = open.splice(this.rng.int(0, open.length - 1), 1)[0];
        this.loose.push({ id: this.itemId++, idx: at, q: this.rng.int(3, 6), d: 1, fish: true, claim: 0 });
      }
    }

    makeMiner(cg, k) {
      const s = this.game.statsFor(cg, this.crewCtx);
      const M = this.mine, e = M.elev;
      return {
        id: cg.id, cg, s, name: cg.name,
        x: M.x(e), y: M.y(e), px: M.x(e), py: M.y(e), tile: e,
        state: 'idle', timer: 0.15 + k * 0.3, target: -1, item: null, path: [], pathI: 0,
        stamina: s.stamina * (s.flags.sleepy || 1), maxSt: s.stamina,
        bag: [], swingT: 0, face: k % 2 ? -1 : 1, restores: 0, napped: false, nineUsed: false,
        dkind: null, emote: null, emoteT: 0, zoom: 1, zoomT: 0, boost3am: 0, lastBox: -99,
        bored: false, flopped: false, done: false, xp: 0, swings: 0, items: 0, levelsGained: 0, swingAnim: 0, pumpNode: -1, milk: 0,
      };
    }

    refreshStats(m) {
      const s = this.game.statsFor(m.cg, this.crewCtx);
      const newMax = s.stamina * (m.baseMaxSt ? 1.5 : 1);
      const delta = newMax - m.maxSt;
      m.s = s; m.maxSt = newMax;
      if (m.baseMaxSt) m.baseMaxSt = s.stamina;
      if (delta > 0) m.stamina += delta;
    }

    // ---------------------------------------------------------------- fields
    bfs(start) {
      const M = this.mine, dist = this._dist, prev = this._prev, q = this._q;
      dist.fill(-1);
      let head = 0, tail = 0;
      q[tail++] = start; dist[start] = 0; prev[start] = -1;
      const w = M.w, h = M.h, type = M.type;
      while (head < tail) {
        const c = q[head++];
        const x = c % w, y = (c / w) | 0, d = dist[c] + 1;
        if (x > 0) { const nb = c - 1; if (dist[nb] < 0 && (type[nb] === T.OPEN || type[nb] === T.ELEV)) { dist[nb] = d; prev[nb] = c; q[tail++] = nb; } }
        if (x < w - 1) { const nb = c + 1; if (dist[nb] < 0 && (type[nb] === T.OPEN || type[nb] === T.ELEV)) { dist[nb] = d; prev[nb] = c; q[tail++] = nb; } }
        if (y > 0) { const nb = c - w; if (dist[nb] < 0 && (type[nb] === T.OPEN || type[nb] === T.ELEV)) { dist[nb] = d; prev[nb] = c; q[tail++] = nb; } }
        if (y < h - 1) { const nb = c + w; if (dist[nb] < 0 && (type[nb] === T.OPEN || type[nb] === T.ELEV)) { dist[nb] = d; prev[nb] = c; q[tail++] = nb; } }
      }
      return dist;
    }

    recomputeField() {
      const M = this.mine;
      const dist = this.bfs(M.elev);
      this.homeDist.set(dist);
      const hd = this.homeDist;
      for (let i = 0; i < this.n; i++) {
        if (hd[i] >= 0) {
          this.reveal(i);
          for (const nb of M.nbrs(i)) this.reveal(nb);
        }
      }
      this.frontier.length = 0;
      this.isFront.fill(0);
      for (let i = 0; i < this.n; i++) {
        if (!M.isMineable(i)) continue;
        for (const nb of M.nbrs(i)) if (hd[nb] >= 0) { this.frontier.push(i); this.isFront[i] = 1; break; }
      }
      this.milkFront.length = 0;
      if (this.def.quirk === 'milk') {
        for (let i = 0; i < this.n; i++) {
          if (M.type[i] !== T.MILK) continue;
          for (const nb of M.nbrs(i)) if (hd[nb] >= 0) { this.milkFront.push(i); break; }
        }
      }
      this.fieldDirty = false;
    }

    reveal(i) {
      const M = this.mine;
      if (M.revealed[i]) return;
      M.revealed[i] = 1;
      if (this.marks.length && !M.isMineable(i) && M.type[i] !== T.MILK) { // fog mark turned out to be bedrock or open air
        for (let k = this.marks.length - 1; k >= 0; k--) if (this.marks[k].idx === i) { this.marks.splice(k, 1); this.ev({ t: 'unmark', i }); }
      }
      if (i === M.motherlode && !this.motherlodeSeen) {
        this.motherlodeSeen = true; this.st.motherlode = true;
        this.ev({ t: 'motherlode', i });
        if (this.game.onMotherlode) this.game.onMotherlode(this);
      }
      if (i === M.box && !this.boxSeen) { this.boxSeen = true; this.ev({ t: 'boxseen', i }); }
    }

    revealAround(i) {
      const M = this.mine, r = this.revealR || 1;
      const x0 = M.x(i), y0 = M.y(i);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const x = x0 + dx, y = y0 + dy;
        if (M.inb(x, y)) this.reveal(M.idx(x, y));
      }
    }

    manhattan(a, b) { const M = this.mine; return Math.abs(M.x(a) - M.x(b)) + Math.abs(M.y(a) - M.y(b)); }

    // ---------------------------------------------------------------- main tick
    tick(dt) {
      if (this.ended) return;
      this.t += dt;
      const t = this.t;
      if (this.cfg.timeLimit && t >= this.cfg.timeLimit && !this.fullClear) { // OVA: Nine to Five, bags still count
        for (const m of this.miners) this.deliver(m);
        this.end('timeup');
        return;
      }
      if (this.chainQ.length) {
        const keep = [];
        for (const c of this.chainQ) {
          if (c.at <= t) this.chainBreak(c);
          else keep.push(c);
        }
        this.chainQ = keep;
      }
      if (this.bombs.length) {
        const keep = [];
        for (const b of this.bombs) { if (b.at <= t) this.detonate(b); else keep.push(b); }
        this.bombs = keep;
      }
      if (this.hotbox && t > this.hotbox.until) this.hotbox = null;
      if (this.waterOn) this.tickWater(dt);
      if (this.fieldDirty) this.recomputeField();
      for (const m of this.miners) {
        m.px = m.x; m.py = m.y;
        this.updateMiner(m, dt);
      }
      if (this.fieldDirty) this.recomputeField();
      this.checkEnd();
    }

    whimsyOf(m) {
      if (this.catterall) return 0;
      let w = m.s.whimsy;
      if (m.s.flags.whimsyNoLaser && this.marks.length === 0) w *= 1.5;
      return w;
    }
    swingCost(m) {
      let c = this.resist * Math.pow(0.99, m.s.grit);
      if (m.wetT > 0) c *= this.cfg.wetDrain || NYA.WET_DRAIN; // swings and walking both cost double while wet
      if (m.s.flags.nightOwl && m.stamina < 0.25 * m.maxSt) c *= 0.5;
      return c;
    }
    hasteOf(m) {
      let h = m.s.haste;
      if (this.t < this.tunaUntil) h *= 1.5;
      if (this.catterall) h *= 1.5;
      // Team Player aura
      for (const o of this.miners) {
        if (o.s.flags.teamPlayer && Math.abs(o.x - m.x) + Math.abs(o.y - m.y) <= 2.01) { h *= 1.1; break; }
      }
      return h;
    }
    speedOf(m) {
      let p = m.s.pace;
      if (m.wetT > 0) p *= this.cfg.wetPace || NYA.WET_PACE;
      if (m.zoomT > this.t) p *= m.zoom;
      if (m.boost3am > 0) p *= 2;
      if (this.catterall) p *= 1.5;
      return p;
    }

    emote(m, e, dur) { m.emote = e; m.emoteT = dur || 1.5; }

    updateMiner(m, dt) {
      if (m.emoteT > 0) { m.emoteT -= dt; if (m.emoteT <= 0) m.emote = null; }
      if (this.waterOn) {
        if (this.mine.water[m.tile] && !m.s.flags.waterproof) {
          if (!(m.wetT > 0)) { this.emote(m, 'wet', 1.2); this.ev({ t: 'wet', m: m.id }); this.st.wet = (this.st.wet || 0) + 1; }
          m.wetT = NYA.WET_LINGER;
        } else if (m.wetT > 0) m.wetT -= dt;
      }
      if (m.swingAnim > 0) m.swingAnim -= dt;
      if (m.boost3am > 0) m.boost3am -= dt;
      else if (m.s.flags.zoomies3am && m.state === 'walk' && this.rng.chance(0.015 * dt)) { m.boost3am = 3; this.emote(m, 'zoom', 1.2); }

      if (CAN_DISTRACT[m.state] && this.rng.chance(this.whimsyOf(m) * dt)) { this.distract(m); return; }

      const M = this.mine;
      switch (m.state) {
        case 'idle':
          m.timer -= dt;
          if (m.timer > 0) return;
          if (this.fullClear || m.done) { this.goHome(m, 'return'); return; }
          if (m.bag.length >= m.s.carry) { this.goHome(m, 'return'); return; }
          this.chooseTarget(m);
          return;
        case 'wait':
          m.timer -= dt;
          if (m.timer <= 0) { m.state = 'idle'; m.timer = 0; }
          return;
        case 'walk': {
          if (m.pumpNode >= 0) {
            const p = this.pumps[m.pumpNode];
            if (M.type[m.pumpNode] !== T.MILK || !p || p.op !== m.id) { this.release(m); this.toIdle(m); return; }
            const arrivedP = this.move(m, dt, this.speedOf(m), true);
            if (m.state !== 'walk') return;
            if (arrivedP) {
              m.zoomT = 0;
              if (!p.built) { m.state = 'pbuild'; m.timer = 3; this.faceToward(m, m.pumpNode); }
              else if (!p.laid) this.startPipe(m);
              else { m.state = 'pump'; this.faceToward(m, m.pumpNode); }
            }
            return;
          }
          if (m.item) {
            if (m.item.gone || m.item.claim !== m.id) { this.release(m); this.toIdle(m); return; }
          } else if (m.target < 0 || !M.isMineable(m.target) || M.forbid[m.target]) { this.release(m); this.toIdle(m); return; }
          const arrived = this.move(m, dt, this.speedOf(m), true);
          if (m.state !== 'walk') return;
          if (arrived) {
            m.zoomT = 0;
            if (m.item) this.pickup(m);
            else { m.state = 'mine'; m.swingT = 0.6; this.faceToward(m, m.target); }
          }
          return;
        }
        case 'mine': {
          if (!M.isMineable(m.target) || M.forbid[m.target]) { this.release(m); this.toIdle(m); return; }
          if (m.bag.length >= m.s.carry) { this.release(m); this.goHome(m, 'return'); return; }
          m.swingT += dt * this.hasteOf(m);
          if (M.mochi[m.target] && (m.lonely || 0) >= 4) { m.lonely = 0; this.release(m); this.toIdle(m, 0.3); return; }
          while (m.swingT >= 1 && m.state === 'mine') {
            m.swingT -= 1;
            this.swing(m);
            if (m.state === 'mine' && (!M.isMineable(m.target))) { this.release(m); this.toIdle(m); break; }
          }
          return;
        }
        case 'return': {
          const arrived = this.move(m, dt, this.speedOf(m), true);
          if (m.state !== 'return') return;
          if (arrived) { m.state = 'drop'; m.timer = 0.4; }
          return;
        }
        case 'drop':
          m.timer -= dt;
          if (m.timer > 0) return;
          this.deliver(m);
          if (m.stamina <= 0) { m.state = 'out'; m.flopped = true; }
          else if (this.fullClear || m.done) { m.state = 'out'; m.bored = false; }
          else if (m.clockOut) { m.clockOut = false; m.state = 'out'; m.bored = true; m.timer = 2; this.emote(m, 'dots', 1.5); }
          else this.toIdle(m);
          return;
        case 'flop': {
          const arrived = this.move(m, dt, m.s.pace * 0.8, false);
          if (arrived) { this.deliver(m); m.state = 'out'; m.flopped = true; this.emote(m, 'zzz', 99); }
          return;
        }
        case 'out':
          if (m.bored && m.stamina > 0 && !this.fullClear) {
            m.timer -= dt;
            if (m.timer <= 0) {
              m.timer = 2;
              if (this.hasWork(m)) { m.bored = false; this.toIdle(m); }
            }
          }
          return;
        case 'nap':
          m.timer -= dt;
          if (m.timer <= 0) { m.stamina = 0.2 * m.maxSt; this.emote(m, 'spark', 1.2); this.toIdle(m); }
          return;
        case 'smoke':
          m.timer -= dt;
          if (m.timer <= 0) this.toIdle(m);
          return;
        case 'distract':
          m.timer -= dt;
          if (m.dkind === 'butterfly' && m.pathI < m.path.length) this.move(m, dt, m.s.pace, false);
          if (m.timer <= 0) { m.dkind = null; this.toIdle(m); }
          return;
        case 'pbuild': {
          const p = this.pumps[m.pumpNode];
          if (!p || M.type[m.pumpNode] !== T.MILK) { this.release(m); this.toIdle(m); return; }
          m.timer -= dt; m.swingAnim = 0.25 * (Math.sin(this.t * 14) > 0 ? 1 : 0);
          m.stamina -= this.swingCost(m) * dt;
          if (m.stamina <= 0) { this.zeroStamina(m); return; }
          if (m.timer <= 0) {
            p.built = true;
            this.giveXP(m, 6);
            this.ev({ t: 'pumpbuilt', i: m.pumpNode, m: m.id });
            if (p.laid) { m.state = 'pump'; } else this.startPipe(m);
          }
          return;
        }
        case 'pipe': {
          const p = this.pumps[m.pumpNode];
          if (!p) { this.release(m); this.toIdle(m); return; }
          const arrived = this.move(m, dt, m.s.pace * 0.6, true);
          if (m.state !== 'pipe') return;
          if (arrived || m.pipeDone) {
            p.laid = true; m.pipeDone = false;
            for (const k of m.pipeTiles || []) this.pipeConn[k] = 1;
            this.pipeConn[p.stand] = 1;
            this.ev({ t: 'pipedone', i: m.pumpNode });
            // walk back to the pump to operate it
            this.bfs(m.tile);
            m.path = this.pathTo(p.stand, m.tile); m.pathI = 0;
            m.state = 'walk';
          }
          return;
        }
        case 'pump': {
          const node = m.pumpNode, p = this.pumps[node];
          if (!p || M.type[node] !== T.MILK) { this.release(m); this.toIdle(m); return; }
          m.swingAnim = 0.25 * (0.5 + 0.5 * Math.sin(this.t * 6));
          m.stamina -= this.swingCost(m) * 0.6 * dt;
          const L = Math.max(1, this.homeDist[p.stand]);
          let flow = this.pumpRate * dt * (m.s.flags.lactose ? 1.3 : 1) / (1 + L / NYA.PIPE_HALF);
          flow = Math.min(flow, M.milk[node]);
          M.milk[node] -= flow; this.haul.milk += flow; m.milk += flow;
          p.pumping = this.t;
          m.milkXP = (m.milkXP || 0) + flow;
          if (m.milkXP >= 1) { const w = Math.floor(m.milkXP); m.milkXP -= w; this.giveXP(m, 2 * w); }
          if (M.milk[node] <= 0.001) {
            M.milk[node] = 0;
            M.type[node] = T.OPEN; this.resLeft--; this.fieldDirty = true;
            p.dry = true;
            this.ev({ t: 'milkdry', i: node, m: m.id });
            this.release(m); this.toIdle(m);
            return;
          }
          if (m.stamina <= 0) this.zeroStamina(m);
          return;
        }
        case 'rescue':
          m.timer -= dt;
          if (m.timer <= 1.0 && !m.lifted) {
            m.lifted = true;
            const e = M.elev; m.x = m.px = M.x(e); m.y = m.py = M.y(e); m.tile = e;
          }
          if (m.timer <= 0) { m.lifted = false; this.deliver(m); m.state = 'out'; m.flopped = m.stamina <= 0; }
          return;
        case 'hotbox': {
          if (!this.hotbox) { this.toIdle(m); return; }
          const arrived = this.move(m, dt, this.speedOf(m), false);
          if (arrived) {
            m.state = 'smoke'; m.timer = 1.5;
            // 22% of max stamina at base, scaled by Blunt Pouch like the Blunt (was 22% × potency ≈ 6.6%)
            this.restore(m, 0.22 * (this.cfg.bluntPotency || 0.3) / 0.3);
            this.ev({ t: 'puff', m: m.id });
          }
          return;
        }
      }
    }

    toIdle(m, delay) { m.state = 'idle'; m.timer = delay || 0; m.path = []; m.pathI = 0; }

    faceToward(m, i) { const dx = this.mine.x(i) - m.x; if (Math.abs(dx) > 0.01) m.face = dx > 0 ? 1 : -1; }

    hasWork(m) {
      if (this.frontier.some(i => !this.mine.forbid[i])) return true;
      return this.loose.some(it => !it.claim && this.homeDist[it.idx] >= 0);
    }

    move(m, dt, speed, drain) {
      const M = this.mine, st0 = m.state;
      let remaining = speed * dt;
      while (remaining > 1e-6 && m.pathI < m.path.length) {
        const nxt = m.path[m.pathI];
        const tx = M.x(nxt), ty = M.y(nxt);
        const dx = tx - m.x, dy = ty - m.y;
        const d = Math.abs(dx) + Math.abs(dy);
        const slow = this.terrainSlow(m, nxt);
        const step = remaining * slow;
        if (Math.abs(dx) > 0.01) m.face = dx > 0 ? 1 : -1;
        if (d <= step) {
          m.x = tx; m.y = ty; remaining -= d / slow; m.tile = nxt; m.pathI++;
          this.onEnterTile(m, nxt);
          if (m.state !== st0) return false;
        } else {
          m.x += (dx / d) * step; m.y += (dy / d) * step; remaining = 0;
        }
      }
      if (drain) {
        const full = m.bag.length >= m.s.carry && this.tier >= 3;
        m.stamina -= this.swingCost(m) * 0.125 * dt * (full ? 1.5 : 1);
        if (m.stamina <= 0) { this.zeroStamina(m); return false; }
      }
      return m.pathI >= m.path.length;
    }

    // Rough ground (Pace's per-tier counter-pressure): the worst obstacle on a tile sets the walking speed.
    terrainSlow(m, i) {
      const M = this.mine, f = m.s.flags;
      let slow = 1;
      if (M.tangle[i] && !f.yarnWrangler) slow = NYA.TANGLE_SLOW;
      if (!f.mudPuppy) {
        if (M.mud[i]) slow = Math.min(slow, NYA.MUD_SLOW);
        if (M.rubble[i]) slow = Math.min(slow, NYA.RUBBLE_SLOW);
      }
      return slow;
    }

    onEnterTile(m, i) {
      const M = this.mine;
      if (m.state === 'pipe') {
        if (this.junctions && this.pipeConn[i]) { m.pipeDone = true; m.path = []; m.pathI = 0; return; }
        if (!this.pipe[i]) { this.pipe[i] = 1; m.stamina -= this.swingCost(m) * 0.5; this.ev({ t: 'pipelay', i }); }
        (m.pipeTiles || (m.pipeTiles = [])).push(i);
        if (m.stamina <= 0) { this.zeroStamina(m); return; }
      }
      if (M.tangle[i]) {
        if (m.s.flags.yarnWrangler) M.tangle[i] = 0; else M.tangle[i]--;
        this.ev({ t: 'tangle', i });
      }
      if (M.rubble[i]) {
        if (m.s.flags.mudPuppy) M.rubble[i] = 0; else M.rubble[i]--;
        this.st.rubble = (this.st.rubble || 0) + 1;
        this.ev({ t: 'rubble', i });
      }
      if (m.s.flags.boxSitter && m.state === 'walk' && i !== M.elev && this.t - m.lastBox > 10) {
        let open = 0;
        for (const nb of M.nbrs(i)) if (M.isOpen(nb)) open++;
        if (open <= 1 && this.rng.chance(0.6)) {
          m.lastBox = this.t;
          this.release(m);
          m.state = 'distract'; m.dkind = 'box'; m.timer = 5; m.path = []; m.pathI = 0;
          this.st.distractions++;
          this.ev({ t: 'distract', m: m.id, kind: 'box' });
        }
      }
      if (this.marks.length || M.forbid[i] === 0) {
        for (const nb of M.nbrs(i)) if (M.forbid[nb] && this.rng.chance(0.25)) { this.emote(m, 'yuck', 1.2); break; }
      }
    }

    distract(m) {
      this.release(m);
      const kind = this.rng.weighted(DISTRACTIONS);
      m.dkind = kind; m.state = 'distract'; m.path = []; m.pathI = 0;
      this.st.distractions++;
      if (kind === 'butterfly') {
        const dist = this.bfs(m.tile);
        const opts = [];
        for (let i = 0; i < this.n; i++) if (dist[i] >= 2 && dist[i] <= 5) opts.push(i);
        if (opts.length) {
          const goal = this.rng.pick(opts);
          m.path = this.pathTo(goal, m.tile);
          m.pathI = 0;
        }
        m.timer = 3.5;
      } else if (kind === 'groom') m.timer = 2;
      else if (kind === 'loaf') { m.timer = 3; if (this.cfg.loafPower) m.stamina = Math.min(m.maxSt, m.stamina + m.maxSt * this.cfg.loafPower); } // OVA perk: Loaf Power
      else m.timer = 2;
      this.ev({ t: 'distract', m: m.id, kind });
      if (kind === 'loaf' && this.miners.length >= 3 && !this.st.allLoaf &&
        this.miners.every(o => o.state === 'distract' && o.dkind === 'loaf')) {
        this.st.allLoaf = 1;
        this.ev({ t: 'allloaf' });
      }
    }

    pathTo(goal, from) {
      const path = [];
      let c = goal;
      let guard = 0;
      while (c !== from && c >= 0 && guard++ < 10000) { path.push(c); c = this._prev[c]; }
      path.reverse();
      return path;
    }

    // ---------------------------------------------------------------- targeting
    valueOf(i, m) {
      const M = this.mine, ty = M.type[i];
      if (ty === T.ORE) {
        const left = M.dens[i] - M.dropped[i];
        return left * (M.q[i] + (M.glow[i] ? 2 : 0)) * (m.s.flags.scoreOre || 1);
      }
      if (ty === T.BOX) return 6;
      let v = 0.25;
      for (const nb of M.nbrs(i)) if (!M.revealed[nb]) { v += 0.6; break; }
      return v;
    }

    chooseTarget(m) {
      const M = this.mine, rng = this.rng, f = m.s.flags;
      const dist = this.bfs(m.tile);
      const cands = [];
      const fr = this.frontier;
      const K = m.s.focus;
      if (fr.length) {
        const local = [];
        const mx = M.x(m.tile), my = M.y(m.tile);
        const localR = Math.max(6, this.noticeRange);
        for (const i of fr) if (Math.abs(M.x(i) - mx) + Math.abs(M.y(i) - my) <= localR) local.push(i);
        for (let k = 0; k < K; k++) cands.push(local.length && rng.chance(0.6) ? rng.pick(local) : rng.pick(fr));
        // local awareness: ore right next to her is hard to miss, even with a short attention span
        for (const i of local) {
          const ty = M.type[i];
          if ((ty === T.ORE || ty === T.BOX) && Math.abs(M.x(i) - mx) + Math.abs(M.y(i) - my) <= this.noticeRange) cands.push(i);
        }
      }
      const markSet = new Set();
      const farMarks = [];
      if (!f.ignoreLaser) {
        for (const mk of this.marks) {
          if (this.isFront[mk.idx]) { cands.push(mk.idx); markSet.add(mk.idx); }
          else if (!M.isOpen(mk.idx) || !M.revealed[mk.idx]) {
            farMarks.push(mk);
            // nearest frontier tile toward the far mark
            let best = -1, bd = 1e9;
            for (const i of fr) { const d = this.manhattan(i, mk.idx); if (d < bd && !M.forbid[i]) { bd = d; best = i; } }
            if (best >= 0) cands.push(best);
          }
        }
      }
      let best = null, bestScore = -1e9, blocked = 0;
      const seen = new Set();
      const bagFull = m.bag.length >= m.s.carry;
      for (const c of cands) {
        if (seen.has(c)) continue; seen.add(c);
        if (M.forbid[c]) continue;
        if (this.claims[c] >= 2) { blocked++; continue; }
        let sd = 1e9, stand = -1;
        for (const nb of M.nbrs(c)) if (dist[nb] >= 0 && dist[nb] < sd) { sd = dist[nb]; stand = nb; }
        if (stand < 0) continue;
        let score = this.valueOf(c, m) * 1.4 - sd * 0.18 + rng.next() * 0.8 - this.claims[c] * 1.5;
        if (M.mochi[c] && this.claims[c] === 1) score += 4.5; // a lone pounder needs a partner
        const marked = markSet.has(c);
        if (marked) score = Math.max(score, 0.2) * 10 + 8;
        if (farMarks.length) {
          let bonus = 0;
          for (const mk of farMarks) bonus = Math.max(bonus, 6 / (1 + this.manhattan(c, mk.idx) * 0.5));
          score += bonus;
        }
        if (score > bestScore) { bestScore = score; best = { kind: 'tile', c, stand, marked }; }
      }
      for (const node of this.milkFront) {
        if (M.forbid[node]) continue;
        const p = this.pumps[node];
        if (p && p.op) continue;
        let stand = p ? p.stand : -1, sd = 1e9;
        if (stand >= 0) { if (dist[stand] >= 0) sd = dist[stand]; }
        else for (const nb of M.nbrs(node)) if (dist[nb] >= 0 && dist[nb] < sd) { sd = dist[nb]; stand = nb; }
        if (stand < 0 || sd >= 1e9) continue;
        let score = 4.5 * (f.lactose ? 1.6 : 1) * 1.4 - sd * 0.18 + rng.next() * 0.8;
        if (!f.ignoreLaser && this.isMarked(node)) score = Math.max(score, 0.2) * 10 + 8;
        if (score > bestScore) { bestScore = score; best = { kind: 'pump', node, stand }; }
      }
      if (!bagFull) {
        let n = 0;
        for (const it of this.loose) {
          if (it.claim || dist[it.idx] < 0) continue;
          if (n++ > 8 && !rng.chance(0.3)) continue;
          const score = (it.q * 1.3 + 0.8) * 1.4 - dist[it.idx] * 0.18 + rng.next() * 0.8;
          if (score > bestScore) { bestScore = score; best = { kind: 'item', it }; }
        }
      }
      if (!best) {
        if (blocked > 0) { m.state = 'wait'; m.timer = 0.6 + rng.next() * 0.6; if (rng.chance(0.3)) this.emote(m, 'dots', 1); return; }
        if (m.bag.length) { this.goHome(m, 'return'); return; }
        m.bored = true; m.done = false;
        this.goHome(m, 'return');
        m.clockOut = true;
        return;
      }
      if (best.kind === 'pump') {
        const p = this.pumps[best.node] || (this.pumps[best.node] = { built: false, laid: false, op: 0, stand: best.stand });
        p.op = m.id; m.pumpNode = best.node; m.target = -1;
        m.path = this.pathTo(p.stand, m.tile); m.pathI = 0;
        m.state = 'walk';
        if (this.isMarked(best.node)) { const mk = this.marks.find(k => k.idx === best.node); if (mk && this.t - mk.t0 < 3) { m.zoom = 1 + 0.5 * (f.zoomMult || 1); m.zoomT = this.t + 8; this.st.zoomies++; } }
        return;
      }
      if (best.kind === 'item') {
        best.it.claim = m.id; m.item = best.it; m.target = -1;
        m.path = this.pathTo(best.it.idx, m.tile); m.pathI = 0;
      } else {
        m.target = best.c; this.claims[best.c]++;
        m.path = this.pathTo(best.stand, m.tile); m.pathI = 0;
        if (best.marked) {
          const mk = this.marks.find(k => k.idx === best.c);
          if (mk && this.t - mk.t0 < 3) {
            m.zoom = 1 + 0.5 * (f.zoomMult || 1); m.zoomT = this.t + 8;
            this.st.zoomies++;
            this.emote(m, 'zoom', 1);
          }
        }
      }
      m.state = 'walk';
    }

    release(m) {
      if (m.pumpNode >= 0) {
        const p = this.pumps[m.pumpNode];
        if (p && p.op === m.id) p.op = 0;
        m.pumpNode = -1;
      }
      if (m.target >= 0 && this.claims[m.target] > 0) this.claims[m.target]--;
      m.target = -1;
      if (m.item) { if (m.item.claim === m.id) m.item.claim = 0; m.item = null; }
    }

    startPipe(m) {
      const M = this.mine, hd = this.homeDist, p = this.pumps[m.pumpNode];
      this.pipe[p.stand] = 1;
      m.pipeTiles = [p.stand];
      m.path = []; m.pathI = 0;
      let c = m.tile, guard = 0;
      while (hd[c] > 0 && guard++ < 5000) {
        let nxt = -1;
        for (const nb of M.nbrs(c)) if (hd[nb] === hd[c] - 1) { nxt = nb; if (this.pipe[nb]) break; }
        if (nxt < 0) break;
        m.path.push(nxt); c = nxt;
      }
      if (this.junctions && this.pipeConn[p.stand]) m.path = [];
      m.state = 'pipe';
      this.ev({ t: 'pipestart', i: m.pumpNode, m: m.id });
    }

    pickup(m) {
      const it = m.item;
      m.item = null;
      if (!it || it.gone) { this.toIdle(m); return; }
      if (m.bag.length >= m.s.carry) { it.claim = 0; this.goHome(m, 'return'); return; }
      it.gone = true;
      const k = this.loose.indexOf(it);
      if (k >= 0) this.loose.splice(k, 1);
      m.bag.push(it);
      this.ev({ t: 'pickup', m: m.id, q: it.q });
      this.toIdle(m);
    }

    goHome(m, mode) {
      const M = this.mine, hd = this.homeDist;
      m.path = []; m.pathI = 0;
      if (hd[m.tile] < 0) {
        // stranded: the Rescue Claw (GDD §9.5)
        m.state = 'rescue'; m.timer = 2.4; m.lifted = false;
        this.st.rescues++;
        this.ev({ t: 'rescue', m: m.id });
        return;
      }
      let c = m.tile, guard = 0;
      while (hd[c] > 0 && guard++ < 5000) {
        let nxt = -1;
        for (const nb of M.nbrs(c)) if (hd[nb] === hd[c] - 1) { nxt = nb; if (this.rng.chance(0.5)) break; }
        if (nxt < 0) break;
        m.path.push(nxt); c = nxt;
      }
      m.state = mode;
      if (mode === 'return' && m.s.flags.butterfingers && m.bag.length && m.path.length) {
        const keep = [];
        for (const it of m.bag) {
          if (this.rng.chance(m.s.flags.butterfingers)) {
            const at = m.path[this.rng.int(0, m.path.length - 1)];
            this.dropLoose(at, it);
            this.emote(m, 'oops', 1.2);
          } else keep.push(it);
        }
        m.bag = keep;
      }
    }

    // ---------------------------------------------------------------- mining
    swing(m) {
      const M = this.mine, i = m.target, f = m.s.flags;
      m.stamina -= this.swingCost(m) * (m.s.swingMult || 1);
      const ty = M.type[i];
      let dmg = m.s.power;
      if (ty === T.DIRT) dmg *= f.dmg.dirt;
      else if (ty === T.STONE || ty === T.HARD || ty === T.GROOVE) dmg *= f.dmg.stone;
      if (M.mochi[i]) {
        let partners = 0;
        for (const o of this.miners) if (o !== m && o.state === 'mine' && o.target === i) partners++;
        if (!partners) {
          dmg = 0;
          m.lonely = (m.lonely || 0) + 1;
          if (m.lonely % 2 === 1) this.emote(m, 'boing', 0.8);
        } else { dmg *= 1.5; m.lonely = 0; if (this.rng.chance(0.3)) this.ev({ t: 'pound', i }); }
      }
      if (f.loner) {
        let alone = true;
        for (const o of this.miners) if (o !== m && o.state !== 'out' && Math.abs(o.x - m.x) + Math.abs(o.y - m.y) <= 3) { alone = false; break; }
        if (alone) dmg *= 1.25;
      }
      let crit = false;
      if (this.rng.chance(m.s.crit)) { dmg *= 3; crit = true; this.st.crits++; }
      this.st.swings++; m.swings++;
      m.swingAnim = 0.25;
      this.faceToward(m, i);
      this.giveXP(m, m.s.swingMult || 1);
      this.ev({ t: 'swing', m: m.id, i, crit, ty, fold: m.s.fold });
      this.damage(i, dmg, m);
      if (m.stamina <= 0) this.zeroStamina(m);
    }

    giveXP(m, base) {
      if (m.ghost) return;
      const treat = (m.cg.treatUntil || 0) > this.game.s.simTime ? 2 : 1;
      const amt = base * NYA.tierXP(this.tier) * (m.s.flags.xpMult || 1) * this.game.xpMult() * treat;
      m.xp += amt;
      const lv = this.game.giveXP(m.cg, amt, this.def.key);
      if (lv) {
        m.levelsGained += lv;
        this.refreshStats(m);
        this.ev({ t: 'levelup', m: m.id, level: m.cg.level });
      }
    }

    damage(i, dmg, m) {
      const M = this.mine, ty = M.type[i];
      if (ty === T.OPEN || ty === T.ELEV || ty === T.BEDROCK) return;
      M.hp[i] -= dmg;
      if (ty === T.ORE) {
        const layer = M.maxHp[i] / M.dens[i];
        const should = Math.min(M.dens[i], Math.floor((M.maxHp[i] - Math.max(0, M.hp[i])) / layer + 1e-6));
        while (M.dropped[i] < should) { M.dropped[i]++; this.spawnItem(i, m); }
      }
      if (M.hp[i] <= 0) this.breakTile(i, m);
    }

    spawnItem(i, m) {
      const M = this.mine, rng = this.rng;
      let q = M.q[i] + (M.glow[i] ? 2 : 0);
      const f = m ? m.s.flags : {};
      let lucky = false;
      if (f.luckyPaw && rng.chance(f.luckyPaw)) { q += 1; lucky = true; }
      if (f.midas && rng.chance(f.midas)) { q += 2; lucky = true; }
      const copies = (f.doubleDrop && rng.chance(f.doubleDrop)) ? 2 : 1;
      for (let k = 0; k < copies; k++) {
        const it = { id: this.itemId++, q, d: M.dens[i], ml: i === M.motherlode, glow: !!M.glow[i], mochi: !!M.mochi[i], claim: 0, idx: -1 };
        if (M.sushi[i]) { it.sushi = 1 + (f.sushiSnob ? 1 : 0); it.q = 1; }
        this.st.items++;
        if (m && m.bag.length < m.s.carry) {
          m.bag.push(it); m.items++;
          this.giveXP(m, 2 * q);
          this.ev({ t: 'item', m: m.id, q, i, lucky, dbl: k > 0 });
        } else {
          let at = m ? m.tile : i;
          if (!m) { for (const nb of M.nbrs(i)) if (M.isOpen(nb)) { at = nb; break; } }
          this.dropLoose(at, it);
        }
      }
    }

    dropLoose(idx, it) {
      it.idx = idx; it.claim = 0; it.gone = false;
      if (!it.id) it.id = this.itemId++;
      this.loose.push(it);
      this.ev({ t: 'loose', i: idx, q: it.q });
    }

    // ---------------------------------------------------------------- water (T5)
    // Falling-sand fluid: water drops into an empty open tile below, or slides sideways when it can fall
    // from there or has water stacked on top (so pools level out and then stop moving). Volume is conserved.
    canHoldWater(j) { const M = this.mine; return M.type[j] === T.OPEN && !M.water[j]; }
    tickWater(dt) {
      const M = this.mine;
      if (this.cfg.drain) { // Drain Pumps: skim the highest water tile every few seconds
        this.drainT -= dt;
        if (this.drainT <= 0) {
          this.drainT = 10 / this.cfg.drain;
          for (let i = 0; i < M.n; i++) if (M.water[i]) { M.water[i] = 0; this.waterActive = true; this.ev({ t: 'drain', i }); break; }
        }
      }
      if (!this.waterActive) return;
      this.waterT -= dt;
      if (this.waterT > 0) return;
      this.waterT = NYA.WATER_STEP;
      const W = M.water, w = M.w, h = M.h, stamp = ++this.waterStepN, flip = stamp & 1;
      let moves = 0;
      for (let y = h - 1; y >= 0 && moves < NYA.WATER_MOVES; y--) {
        for (let k = 0; k < w; k++) {
          const x = flip ? k : w - 1 - k, i = y * w + x;
          if (!W[i] || this.waterStamp[i] === stamp) continue;
          let to = -1;
          if (y < h - 1 && this.canHoldWater(i + w)) to = i + w;
          else {
            const dirs = this.rng.chance(0.5) ? [1, -1] : [-1, 1];
            const pressed = y > 0 && W[i - w];
            for (const d of dirs) {
              const nx = x + d;
              if (nx < 0 || nx >= w) continue;
              const j = i + d;
              if (this.canHoldWater(j) && (pressed || (y < h - 1 && this.canHoldWater(j + w)))) { to = j; break; }
            }
          }
          if (to >= 0) { W[i] = 0; W[to] = 1; this.waterStamp[to] = stamp; moves++; }
        }
      }
      if (!moves) this.waterActive = false;
    }

    breakTile(i, m) {
      const M = this.mine, ty = M.type[i];
      M.type[i] = T.OPEN; M.hp[i] = 0;
      if (this.rubbleP > 0 && (ty === T.DIRT || ty === T.STONE || ty === T.HARD || ty === T.GROOVE) && this.roughRng.chance(this.rubbleP)) M.rubble[i] = NYA.RUBBLE_STEPS;
      if (ty === T.ORE || ty === T.BOX) this.resLeft--;
      if (ty === T.ORE && M.cluster[i] >= 0) {
        const c = M.cluster[i];
        this.clusterLeft[c]--;
        if (this.clusterLeft[c] === 0) { this.wishes++; this.ev({ t: 'wish', i, n: this.wishes }); }
      }
      this.claims[i] = 0;
      M.forbid[i] = 0;
      this.st.tiles++;
      if (this.waterOn && !this.waterActive && M.nbrs(i).some(nb => M.water[nb])) {
        this.waterActive = true; this.st.floods = (this.st.floods || 0) + 1;
        this.ev({ t: 'flood', i });
        if (this.game.onFlood) this.game.onFlood(this);
      }
      for (let k = this.marks.length - 1; k >= 0; k--) if (this.marks[k].idx === i) this.marks.splice(k, 1);
      this.ev({ t: 'break', i, ty });
      this.revealAround(i);
      this.fieldDirty = true;
      if (ty === T.GROOVE && M.groove[i] >= 0) this.startChain(i);
      if (ty === T.BOX) this.openBox(i, m);
      if (m && m.s.flags.crackSpread && (ty === T.STONE || ty === T.HARD || ty === T.GROOVE)) {
        for (const nb of M.nbrs(i)) {
          const t2 = M.type[nb];
          if ((t2 === T.STONE || t2 === T.GROOVE) && this.rng.chance(m.s.flags.crackSpread)) this.chainQ.push({ i: nb, at: this.t + 0.12, cid: -1 });
        }
      }
    }

    startChain(i) {
      const M = this.mine;
      const g = M.groove[i];
      const group = M.grooveGroups[g];
      if (!group) return;
      const cid = ++this.chainId;
      this.chainCounts[cid] = 1;
      const k0 = group.indexOf(i);
      group.forEach((j, k) => {
        if (j === i || M.type[j] !== T.GROOVE) return;
        this.chainQ.push({ i: j, at: this.t + 0.07 * Math.abs(k - k0), cid });
      });
      M.groove[i] = -1;
    }

    chainBreak(c) {
      const M = this.mine, ty = M.type[c.i];
      if (!(ty === T.GROOVE || ty === T.STONE)) return;
      M.groove[c.i] = -1;
      this.breakTile(c.i, null);
      this.ev({ t: 'chain', i: c.i });
      if (c.cid > 0) {
        this.chainCounts[c.cid]++;
        if (this.chainCounts[c.cid] > this.st.bestChain) this.st.bestChain = this.chainCounts[c.cid];
        if (this.cfg.resonance && ty === T.GROOVE) {
          for (const nb of M.nbrs(c.i)) if (M.type[nb] === T.STONE && this.rng.chance(0.25)) this.chainQ.push({ i: nb, at: this.t + 0.1, cid: c.cid });
        }
      }
    }

    openBox(i, m) {
      const outcome = this.game.onBoxOpened ? this.game.onBoxOpened(this, m) : 'empty';
      this.st.box = outcome;
      if (outcome !== 'skein') this.haul.thread += 1;
      this.ev({ t: 'boxopen', i, outcome, m: m ? m.id : 0 });
    }

    zeroStamina(m) {
      m.stamina = 0;
      const f = m.s.flags;
      if (f.nineLives && !m.nineUsed) {
        m.nineUsed = true; m.stamina = m.maxSt;
        this.emote(m, 'spark', 2);
        this.ev({ t: 'ninelives', m: m.id });
        return;
      }
      this.release(m);
      if (f.powerNap && !m.napped) {
        m.napped = true; m.state = 'nap'; m.timer = 5; m.path = []; m.pathI = 0;
        this.emote(m, 'zzz', 5);
        return;
      }
      this.goHome(m, 'flop');
      this.emote(m, 'flop', 2);
      this.ev({ t: 'flop', m: m.id });
    }

    restore(m, frac) {
      const amt = m.maxSt * frac * Math.pow(0.8, m.restores);
      m.restores++;
      m.stamina = Math.min(m.maxSt, Math.max(0, m.stamina) + amt);
      return amt;
    }

    deliver(m) {
      if (!m.bag.length) return 0;
      let delivered = 0, value = 0;
      for (const it of m.bag) {
        if (m.s.flags.menace && this.rng.chance(m.s.flags.menace)) {
          this.haul.lost++;
          this.emote(m, 'menace', 2);
          this.ev({ t: 'menace', m: m.id });
          continue;
        }
        if (it.sushi) { this.haul.sushi += it.sushi; this.haul.items++; delivered++; continue; } // nigiri: sushi, no catnip
        const v = this.itemValue(it);
        value += v; delivered++;
        this.haul.value += v; this.haul.items++;
        this.haul.byQ[Math.min(11, it.q)]++;
        if (it.ml) this.haul.motherlode++;
        if (it.glow) this.haul.glow++;
      }
      m.bag = [];
      this.ev({ t: 'drop', m: m.id, n: delivered, value });
      return delivered;
    }

    itemValue(it) {
      let v = this.tierBase * Math.pow(it.q, this.cfg.polishExp || 1);
      if (this.cfg.centrifuge && it.d > 1) v *= 1 + 0.02 * this.cfg.centrifuge * (it.d - 1);
      if (it.mochi) v *= 4;
      return v;
    }

    // ---------------------------------------------------------------- end
    checkEnd() {
      if (!this.fullClear && this.resLeft === 0) {
        let looseLeft = false;
        for (const it of this.loose) if (this.homeDist[it.idx] >= 0) { looseLeft = true; break; }
        let carrying = false;
        if (!looseLeft) {
          this.fullClear = true;
          this.ev({ t: 'fullclear' });
          for (const m of this.miners) {
            m.done = true;
            if (m.state === 'walk' || m.state === 'mine' || m.state === 'idle' || m.state === 'wait' || m.state === 'distract' || m.state === 'hotbox' || m.state === 'smoke' || m.state === 'pump' || m.state === 'pipe' || m.state === 'pbuild') {
              this.release(m); this.goHome(m, 'return');
            }
            if (m.bag.length) carrying = true;
          }
        }
        void carrying;
      }
      let allOut = true;
      for (const m of this.miners) if (m.state !== 'out') { allOut = false; break; }
      if (allOut) {
        if (this.allOutT < 0) this.allOutT = this.t;
        if (this.t - this.allOutT >= (this.fullClear ? 0.4 : 1.2)) this.end(this.fullClear ? 'clear' : 'out');
      } else this.allOutT = -1;
      if (this.t > 1800) this.end('timeout');
    }

    end(reason) {
      if (this.ended) return;
      this.ended = true; this.endReason = reason;
      if (this.eventKey === 'matsuri') this.ev({ t: 'fireworks' });
      this.ev({ t: 'end', reason });
    }

    whistle() {
      for (const m of this.miners) this.deliver(m);
      this.end('whistle');
    }

    rating() {
      if (this.fullClear) return 'S';
      const r = this.extraction();
      return r >= 0.8 ? 'A' : r >= 0.6 ? 'B' : r >= 0.4 ? 'C' : 'D';
    }
    // Share of the mine's catnip items hauled. Counted in items, not value: Polisher/glow bonuses made the
    // haul's value hit 100% with ore still in the ground. Only a real full clear reads 100%.
    extraction() {
      if (this.fullClear) return 1;
      const r = this.totalItems > 0 ? this.haul.items / this.totalItems : 0;
      return Math.min(0.99, r);
    }

    // ---------------------------------------------------------------- player tools
    addMark(idx, drone) {
      const M = this.mine;
      if (idx < 0 || idx >= this.n || this.cfg.noLaser) return false;
      // fog tiles can always be marked (no peeking at what's under them); reveal() clears the mark if it's not mineable
      if (M.revealed[idx] && !M.isMineable(idx) && M.type[idx] !== T.MILK) return false;
      if (M.revealed[idx] && M.isOpen(idx)) return false;
      if (this.marks.some(k => k.idx === idx)) return false;
      this.marks.push({ idx, t0: this.t, drone: !!drone });
      const max = drone ? 0 : (this.cfg.laserMax || 3);
      if (drone) {
        const dm = this.marks.filter(k => k.drone);
        if (dm.length > (this.cfg.droneMarks || 1)) this.marks.splice(this.marks.indexOf(dm[0]), 1);
        this.st.droneMarks++;
      } else {
        const pm = this.marks.filter(k => !k.drone);
        if (pm.length > max) this.marks.splice(this.marks.indexOf(pm[0]), 1);
        this.st.marks++;
      }
      this.ev({ t: 'mark', i: idx, drone: !!drone });
      // the laser pulls attention right away
      for (const m of this.miners) {
        if (m.s.flags.ignoreLaser || m.bag.length >= m.s.carry) continue;
        const ok = m.state === 'walk' || m.state === 'idle' || m.state === 'wait' ||
          (m.state === 'mine' && (M.type[m.target] !== T.ORE || m.s.flags.zoomMult) && this.rng.chance(0.6));
        if (ok && !this.fullClear) { this.release(m); this.chooseTarget(m); }
      }
      return true;
    }
    removeMark(idx) {
      const k = this.marks.findIndex(m => m.idx === idx);
      if (k >= 0) { this.marks.splice(k, 1); return true; }
      return false;
    }
    isMarked(idx) { return this.marks.some(m => m.idx === idx); }
    setForbid(idx, on) {
      const M = this.mine;
      if (!M.isMineable(idx) && on) return false;
      M.forbid[idx] = on ? 1 : 0;
      return true;
    }

    // Actives ------------------------------------------------------------
    minerById(id) { return this.miners.find(m => m.id === id); }
    useBlunt(id, potency) {
      const m = this.minerById(id);
      if (!m || m.state === 'rescue') return false;
      this.restore(m, potency);
      this.release(m);
      m.flopped = false; m.bored = false; m.clockOut = false;
      if (m.emote === 'zzz') { m.emote = null; m.emoteT = 0; } // awake now
      m.state = 'smoke'; m.timer = 0.8; m.path = []; m.pathI = 0;
      if (this.fullClear) m.done = true;
      this.emote(m, 'blunt', 1.5);
      this.st.blunts++;
      this.ev({ t: 'blunt', m: m.id });
      return true;
    }
    useBomb(idx, dmg) {
      this.bombs.push({ i: idx, at: this.t + 0.55, dmg });
      this.st.bombs++;
      this.ev({ t: 'bombthrow', i: idx });
      return true;
    }
    detonate(b) {
      const M = this.mine, x0 = M.x(b.i), y0 = M.y(b.i);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (!M.inb(x, y)) continue;
        const j = M.idx(x, y);
        this.reveal(j);
        this.damage(j, b.dmg * (dx || dy ? 0.75 : 1), null);
      }
      this.ev({ t: 'boom', i: b.i });
      this.fieldDirty = true;
    }
    useTuna() { this.tunaUntil = this.t + 10; this.ev({ t: 'tuna' }); return true; }
    // Catterall: +50% max stamina added on cast and trimmed off when it ends (GDD §7)
    setCatterall(on) {
      if (on === this.catterall) return;
      this.catterall = on;
      for (const m of this.miners) {
        if (on) {
          m.baseMaxSt = m.maxSt;
          m.maxSt *= 1.5;
          m.stamina += 0.5 * m.baseMaxSt;
          if (m.state === 'out' && m.flopped) { m.flopped = false; if (m.emote === 'zzz') { m.emote = null; m.emoteT = 0; } this.toIdle(m); }
        } else if (m.baseMaxSt) {
          m.maxSt = m.baseMaxSt; m.baseMaxSt = 0;
          m.stamina = Math.min(m.stamina, m.maxSt);
        }
      }
      this.ev({ t: 'catterall', on });
    }
    useTreat(id) {
      const m = this.minerById(id);
      if (!m) return false;
      // double XP for a minute of sim time; kept on the catgirl so it carries across episodes
      m.cg.treatUntil = this.game.s.simTime + NYA.TREAT_TIME;
      this.emote(m, 'heart', 2);
      this.ev({ t: 'treat', m: m.id });
      return true;
    }
    useSonar(idx, r) {
      const M = this.mine, x0 = M.x(idx), y0 = M.y(idx);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (M.inb(x, y)) this.reveal(M.idx(x, y));
      }
      this.ev({ t: 'sonar', i: idx, r });
      return true;
    }
    useHotbox(idx) {
      const M = this.mine;
      if (!M.isOpen(idx) || this.homeDist[idx] < 0) return false;
      this.hotbox = { idx, until: this.t + 30 };
      for (const m of this.miners) {
        if (m.state === 'rescue') continue;
        this.bfs(m.tile);
        if (this._dist[idx] < 0) continue;
        this.release(m);
        m.path = this.pathTo(idx, m.tile); m.pathI = 0;
        m.state = 'hotbox'; m.zoom = 1.5; m.zoomT = this.t + 30;
        // wakes sleepers like a Blunt does: no longer flopped, clocked out or showing Zs
        m.flopped = false; m.bored = false; m.clockOut = false;
        if (m.emote === 'zzz') { m.emote = null; m.emoteT = 0; }
        if (this.fullClear) m.done = true;
      }
      this.ev({ t: 'hotbox', i: idx });
      return true;
    }
    useMewclear(idx) {
      const M = this.mine, x0 = M.x(idx), y0 = M.y(idx);
      const R = 5.5, R2 = 8;
      for (let i = 0; i < this.n; i++) {
        const d = Math.hypot(M.x(i) - x0, M.y(i) - y0);
        if (d <= R) {
          const ty = M.type[i];
          if (ty === T.ELEV || ty === T.OPEN) { M.tangle[i] = 0; M.rubble[i] = 0; continue; }
          this.reveal(i);
          if (ty === T.ORE) {
            while (M.dropped[i] < M.dens[i]) { M.dropped[i]++; this.spawnItem(i, null); }
          }
          if (ty === T.BEDROCK) { M.type[i] = T.STONE; }
          this.breakTile(i, null);
          M.rubble[i] = 0; // blasted clean
        } else if (d <= R2) {
          this.reveal(i);
          if (M.type[i] === T.ORE && !M.glow[i]) { M.glow[i] = 1; this.st.glowing++; }
        }
      }
      // items spawned inside the blast land where the tile was
      for (const it of this.loose) if (!M.isOpen(it.idx)) it.idx = M.elev;
      this.fieldDirty = true;
      this.ev({ t: 'mewclear', i: idx });
      return true;
    }

    // Laser Drone (yarn unlock): samples random revealed ore with its own Focus
    droneTick(dt, focus, interval) {
      this.droneT -= dt;
      if (this.droneT > 0) return;
      this.droneT = interval;
      const M = this.mine, rng = this.rng;
      const pool = [];
      for (let i = 0; i < this.n; i++) if (M.revealed[i] && (M.type[i] === T.ORE || M.type[i] === T.BOX || M.type[i] === T.MILK) && !M.forbid[i] && !this.isMarked(i)) pool.push(i);
      if (!pool.length) {
        // no visible ore: point at the fog edge
        for (const i of this.frontier) if (!this.isMarked(i)) pool.push(i);
        if (!pool.length) return;
      }
      let best = -1, bs = -1e9;
      for (let k = 0; k < focus; k++) {
        const i = rng.pick(pool);
        let d = 99;
        for (const nb of M.nbrs(i)) if (this.homeDist[nb] >= 0) d = Math.min(d, this.homeDist[nb]);
        const v = (M.type[i] === T.ORE ? (M.dens[i] - M.dropped[i]) * M.q[i] : M.type[i] === T.BOX ? 6 : 0.3);
        const s = v * 1.5 - (d === 99 ? 6 : d * 0.2) + rng.next();
        if (s > bs) { bs = s; best = i; }
      }
      if (best >= 0) this.addMark(best, true);
    }
  }

  NYA.Episode = Episode;
})(globalThis.NYA = globalThis.NYA || {});
