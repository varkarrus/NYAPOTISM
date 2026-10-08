// Mousehole Maze (GDD §10): mouse nests, mice that nibble stamina, catgirls who fight back, and turrets.
// Mixed into NYA.Episode. Only runs in mines whose quirk is 'mice'; everywhere else `mice` stays empty.
(function (NYA) {
  'use strict';
  const T = NYA.T;
  const P = NYA.Episode.prototype;
  // a catgirl swings at an adjacent mouse instead of carrying on, in these states
  const FIGHT = { idle: 1, wait: 1, walk: 1, mine: 1, return: 1, drop: 1, pump: 1, pbuild: 1, pipe: 1, hotbox: 1, smoke: 1 };
  const SAFE = { out: 1, rescue: 1, flop: 1, nap: 1, buried: 1 };
  const KINDS = Object.keys(NYA.MICE).map(k => [k, NYA.MICE[k].w]);

  P.initMice = function () {
    const M = this.mine, cfg = this.cfg;
    this.mice = []; this.turrets = []; this.nests = {}; this.nestOrder = [];
    this.miceOn = this.def.quirk === 'mice';
    if (!this.miceOn) return;
    this.miceRng = new NYA.RNG('mice:' + cfg.seed);
    this.mouseId = 1;
    this.tierHP = NYA.tierHP(this.tier);
    this.maxTurrets = cfg.turrets || NYA.TURRET_BASE;
    this.chanT = 0; // counts down only once NYA.CHAN_DELAY has passed
    for (let i = 0; i < M.n; i++) if (M.type[i] === T.NEST) this.nests[i] = { awake: false, next: 0, alive: 0 };
  };

  P.tickMice = function (dt) {
    const M = this.mine, rng = this.miceRng;
    // nests wake once uncovered, then send out a mouse every few seconds
    for (const k in this.nests) {
      const i = +k, nest = this.nests[k];
      if (!nest.awake) {
        if (!M.revealed[i] || !M.nbrs(i).some(nb => M.isOpen(nb))) continue;
        nest.awake = true; nest.next = NYA.NEST_SPAWN * 0.6;
        this.nestOrder.push(i);
        this.ev({ t: 'nestwake', i });
        for (let k = 0; k < NYA.NEST_BURST && this.mice.length < NYA.MICE_CAP; k++) this.spawnMouse(i, nest);
      }
      nest.next -= dt;
      if (nest.next <= 0) {
        nest.next = NYA.NEST_SPAWN * (0.75 + 0.5 * rng.next());
        if (nest.alive < NYA.NEST_CAP && this.mice.length < NYA.MICE_CAP) this.spawnMouse(i, nest);
      }
    }
    for (const mo of this.mice) { mo.px = mo.x; mo.py = mo.y; if (mo.hitT > 0) mo.hitT -= dt; if (!mo.dead) this.updateMouse(mo, dt); }
    if (this.mice.some(mo => mo.dead)) this.mice = this.mice.filter(mo => !mo.dead);
    // turrets lob hairballs at the nearest mouse in range
    for (const tu of this.turrets) {
      tu.cd -= dt;
      if (tu.cd > 0) continue;
      const tx = M.x(tu.idx), ty = M.y(tu.idx);
      let best = null, bd = NYA.TURRET_RANGE;
      for (const mo of this.mice) {
        if (mo.dead || !M.revealed[mo.tile]) continue;
        const d = Math.hypot(mo.x - tx, mo.y - ty);
        if (d <= bd) { bd = d; best = mo; }
      }
      if (!best) { tu.cd = 0.2; tu.idle = (tu.idle || 0) + 0.2; continue; }
      tu.cd = NYA.TURRET_CD; tu.idle = 0;
      tu.aim = Math.atan2(best.y - ty, best.x - tx);
      this.st.shots = (this.st.shots || 0) + 1;
      this.ev({ t: 'tshot', i: tu.idx, x: best.x, y: best.y });
      this.hurtMouse(best, NYA.TURRET_DMG * this.tierHP * (this.cfg.turretMult || 1), null);
    }
    // Turret-chan fills the turret slots you didn't use (in her own special way). Once trained, she also moves
    // her idle turrets from smashed nests to uncovered ones.
    if (this.cfg.turretChan && this.t >= NYA.CHAN_DELAY) {
      this.chanT -= dt;
      if (this.chanT <= 0) {
        this.chanT = 2;
        const lvl = this.cfg.chanLvl || 0;
        if (this.turrets.length < this.maxTurrets) this.autoTurret(lvl, 'chan');
        else if (lvl >= 1) this.relocateTurret('chan', lvl);
      }
    }
  };
  // Move one idle turret (no target for a few seconds, no live nest nearby) of `by` to a nest nobody covers.
  P.relocateTurret = function (by, lvl) {
    const awake = this.nestOrder.filter(i => this.nests[i]);
    if (!awake.some(i => !this.turrets.some(t => this.manhattan(t.idx, i) <= 3))) return false;
    const tu = this.turrets.find(t => t.by === by && (t.idle || 0) >= 3 && !awake.some(i => this.manhattan(t.idx, i) <= 4));
    if (!tu) return false;
    this.turrets.splice(this.turrets.indexOf(tu), 1);
    this.ev({ t: 'turretoff', i: tu.idx });
    if (this.autoTurret(Math.max(2, lvl), by)) return true;
    this.turrets.push(tu); // nowhere better after all
    return false;
  };

  P.spawnMouse = function (i, nest) {
    const M = this.mine, rng = this.miceRng;
    const exits = M.nbrs(i).filter(nb => M.isOpen(nb));
    if (!exits.length) return null;
    const at = exits[rng.int(0, exits.length - 1)];
    const kind = rng.weighted(KINDS), D = NYA.MICE[kind];
    const hp = D.hp * this.tierHP;
    const mo = { id: this.mouseId++, kind, nest: i, home: at, tile: at, x: M.x(at), y: M.y(at), px: M.x(at), py: M.y(at),
      hp, maxHp: hp, path: [], pathI: 0, planT: 0, biteT: 0.6, target: 0, calm: rng.chance(0.5), face: 1,
      item: null, flee: false, dead: false, hitT: 0 };
    this.mice.push(mo);
    nest.alive++;
    this.st.miceSeen = (this.st.miceSeen || 0) + 1;
    this.ev({ t: 'mspawn', i: at, kind });
    if (this.game.onMice) this.game.onMice(this);
    return mo;
  };

  P.biteable = function (m) { return !SAFE[m.state] && !m.lifted; };

  P.updateMouse = function (mo, dt) {
    const D = NYA.MICE[mo.kind], M = this.mine;
    mo.biteT -= dt; mo.planT -= dt;
    if (mo.flee) { // a pickpocket with loot runs for home and is gone once it gets there
      if (mo.pathI >= mo.path.length) {
        if (mo.tile === mo.home) { this.mouseEscapes(mo); return; }
        this.bfs(mo.tile);
        if (this._dist[mo.home] < 0) { this.mouseEscapes(mo); return; }
        mo.path = this.pathTo(mo.home, mo.tile); mo.pathI = 0;
      }
      this.moveMouse(mo, dt, D.speed * 1.15);
      return;
    }
    let tgt = mo.target ? this.minerById(mo.target) : null;
    if (tgt && (!this.biteable(tgt) || (D.thief && !tgt.bag.length))) { tgt = null; mo.target = 0; mo.planT = 0; }
    if (tgt && Math.abs(tgt.x - mo.x) + Math.abs(tgt.y - mo.y) <= 0.85) {
      mo.face = tgt.x >= mo.x ? 1 : -1;
      if (mo.biteT <= 0) {
        mo.biteT = D.biteCD;
        if (D.thief) this.stealFrom(mo, tgt);
        else this.biteMiner(mo, tgt, D);
      }
      return;
    }
    if (mo.planT <= 0 || mo.pathI >= mo.path.length) { mo.planT = 0.5; this.planMouse(mo); }
    this.moveMouse(mo, dt, D.speed);
    void M;
  };

  P.planMouse = function (mo) {
    const M = this.mine, D = NYA.MICE[mo.kind], rng = this.miceRng;
    const dist = this.bfs(mo.tile);
    let best = null, bd = NYA.MOUSE_SIGHT + 1;
    for (const m of this.miners) {
      if (!this.biteable(m)) continue;
      if (D.thief && !m.bag.length) continue;
      if (m.s.flags.pacifist && mo.calm) continue; // mice ignore a pacifist half the time
      const d = dist[m.tile];
      if (d >= 0 && d < bd) { bd = d; best = m; }
    }
    if (best) { mo.target = best.id; mo.path = this.pathTo(best.tile, mo.tile); mo.pathI = 0; return; }
    mo.target = 0;
    // nobody in reach: scurry around near the nest
    let opts = M.nbrs(mo.tile).filter(nb => M.isOpen(nb));
    const far = this.manhattan(mo.tile, mo.home) > 3;
    if (far) { const back = opts.filter(nb => this.manhattan(nb, mo.home) < this.manhattan(mo.tile, mo.home)); if (back.length) opts = back; }
    mo.path = opts.length ? [opts[rng.int(0, opts.length - 1)]] : []; mo.pathI = 0;
    mo.planT = 0.4 + rng.next() * 0.6;
  };

  P.moveMouse = function (mo, dt, speed) {
    const M = this.mine;
    let remaining = speed * dt;
    while (remaining > 1e-6 && mo.pathI < mo.path.length) {
      const nxt = mo.path[mo.pathI];
      if (!M.isOpen(nxt)) { mo.path = []; mo.pathI = 0; break; }
      const tx = M.x(nxt), ty = M.y(nxt), dx = tx - mo.x, dy = ty - mo.y, d = Math.abs(dx) + Math.abs(dy);
      if (Math.abs(dx) > 0.01) mo.face = dx > 0 ? 1 : -1;
      if (d <= remaining) { mo.x = tx; mo.y = ty; mo.tile = nxt; mo.pathI++; remaining -= d; }
      else { mo.x += dx / d * remaining; mo.y += dy / d * remaining; remaining = 0; }
    }
  };

  P.biteMiner = function (mo, m, D) {
    m.stamina -= D.bite * m.maxSt;
    this.st.bites = (this.st.bites || 0) + 1;
    this.ev({ t: 'bite', m: m.id, kind: mo.kind });
    if (m.stamina <= 0) this.zeroStamina(m);
  };

  P.stealFrom = function (mo, m) {
    if (!m.bag.length) return;
    mo.item = m.bag.pop();
    mo.flee = true; mo.path = []; mo.pathI = 0; mo.target = 0;
    this.st.steals = (this.st.steals || 0) + 1;
    this.emote(m, 'mad', 1.5);
    this.ev({ t: 'steal', m: m.id, x: mo.x, y: mo.y });
  };

  P.mouseEscapes = function (mo) {
    mo.dead = true;
    const nest = this.nests[mo.nest];
    if (nest) nest.alive--;
    if (mo.item) { this.st.stolen = (this.st.stolen || 0) + 1; mo.item = null; }
    this.ev({ t: 'escape', x: mo.x, y: mo.y });
  };

  P.hurtMouse = function (mo, dmg, m) {
    if (mo.dead) return;
    mo.hp -= dmg; mo.hitT = 0.15;
    if (mo.hp <= 0) this.killMouse(mo, m);
  };

  P.killMouse = function (mo, m) {
    mo.dead = true;
    const nest = this.nests[mo.nest];
    if (nest) nest.alive--;
    this.st.mice = (this.st.mice || 0) + 1;
    let cheese = NYA.MICE[mo.kind].cheese;
    if (this.miners.some(o => o.s.flags.cheeseMagnet && Math.abs(o.x - mo.x) + Math.abs(o.y - mo.y) <= 2.5)) cheese *= 2;
    this.dropLoose(mo.tile, { q: 1, d: 1, cheese, claim: 0 });
    if (mo.item) { this.dropLoose(mo.tile, mo.item); mo.item = null; this.ev({ t: 'recover', x: mo.x, y: mo.y }); }
    this.ev({ t: 'mkill', x: mo.x, y: mo.y, kind: mo.kind, m: m ? m.id : 0 });
  };

  // all the mice bolt once the mine is perfect-cleared (pickpockets take their loot with them)
  P.scatterMice = function () {
    for (const mo of this.mice) {
      if (mo.item) { this.st.stolen = (this.st.stolen || 0) + 1; mo.item = null; }
      mo.dead = true;
      this.ev({ t: 'escape', x: mo.x, y: mo.y });
    }
    this.mice = [];
  };

  // Catgirls fight back (GDD §10.2): an adjacent mouse gets swung at instead of the rock. Each swing costs
  // stamina like a mining swing. Returns true when the fight took her turn.
  P.mouseFight = function (m, dt) {
    if (!FIGHT[m.state]) return false;
    const f = m.s.flags;
    let near = null, bd = 1.05;
    for (const mo of this.mice) {
      if (mo.dead) continue;
      const d = Math.abs(mo.x - m.x) + Math.abs(mo.y - m.y);
      if (d < bd) { bd = d; near = mo; }
    }
    if (!near) { m.fightT = 0; return false; }
    if (f.pacifist) return false;
    if (f.scaredy) { // Scaredy Cat: runs home instead of fighting
      if (m.state !== 'return' && m.state !== 'drop' && (m.scaredT || 0) < this.t) {
        m.scaredT = this.t + 4;
        this.release(m);
        this.emote(m, 'scared', 1.5);
        this.ev({ t: 'scared', m: m.id });
        this.goHome(m, 'return');
      }
      return false;
    }
    m.fightT = (m.fightT || 0) + dt * this.hasteOf(m);
    if (Math.abs(near.x - m.x) > 0.01) m.face = near.x > m.x ? 1 : -1;
    while (m.fightT >= 1 && !near.dead) {
      m.fightT -= 1;
      m.stamina -= this.swingCost(m) * (m.s.swingMult || 1);
      let dmg = m.s.power * (f.mouser ? 2 : 1) * (f.rampage ? 1.5 : 1) * (this.cfg.combatMult || 1);
      const crit = this.rng.chance(m.s.crit);
      if (crit) dmg *= 3;
      m.swingAnim = 0.25;
      this.st.mswings = (this.st.mswings || 0) + 1;
      this.giveXP(m, 1);
      this.ev({ t: 'mswing', m: m.id, x: near.x, y: near.y, crit });
      this.hurtMouse(near, dmg, m);
      if (m.stamina <= 0) { this.zeroStamina(m); return true; }
    }
    return true;
  };

  // A smashed nest stops spawning and drops a Cheese Wheel.
  P.nestBroken = function (i, m) {
    delete this.nests[i];
    this.st.nests = (this.st.nests || 0) + 1;
    const wheel = { q: 3, d: 1, cheese: NYA.CHEESE_WHEEL, wheel: true, claim: 0, idx: -1 };
    if (m && m.bag.length < m.s.carry) { wheel.id = this.itemId++; m.bag.push(wheel); m.items++; }
    else this.dropLoose(i, wheel);
    this.ev({ t: 'nestbreak', i, m: m ? m.id : 0 });
  };

  // ---------------------------------------------------------------- turrets
  P.chanSays = function (line, i) {
    this.ev({ t: 'chan', line, i });
    if (this.game.onChan) this.game.onChan(line);
  };
  P.canTurret = function (i) {
    const M = this.mine;
    return this.miceOn && i >= 0 && i < M.n && M.revealed[i] && M.type[i] === T.OPEN && !M.water[i] && !this.turrets.some(t => t.idx === i);
  };
  // Click a free open tile to place a Hairball Cannon, or a turret to pick it back up.
  P.placeTurret = function (i, by) {
    const k = this.turrets.findIndex(t => t.idx === i);
    if (k >= 0) { this.turrets.splice(k, 1); this.ev({ t: 'turretoff', i }); return true; }
    if (this.turrets.length >= this.maxTurrets || !this.canTurret(i)) return false;
    this.turrets.push({ idx: i, cd: 0.6, aim: -Math.PI / 2, by: by || 'you' });
    this.st.turrets = (this.st.turrets || 0) + 1;
    this.ev({ t: 'turret', i, by: by || 'you' });
    return true;
  };
  // Turret-chan (lvl 0–2) or the harness bot (lvl 2). Untrained, she always puts one by the elevator "for vibes"
  // and piles the rest onto the first nest she saw; trained, she spreads them across the nests.
  P.autoTurret = function (lvl, by) {
    const M = this.mine;
    if (lvl < 1 && !this.turrets.some(t => this.manhattan(t.idx, M.elev) <= 1)) {
      const spot = M.nbrs(M.elev).find(nb => this.canTurret(nb));
      if (spot !== undefined) { this.placeTurret(spot, by); if (by === 'chan') this.chanSays('vibes', spot); return true; }
    }
    const awake = this.nestOrder.filter(i => this.nests[i]);
    if (!awake.length) return false;
    let nest = awake[0];
    if (lvl >= 2) {
      let fewest = 1e9;
      for (const i of awake) {
        const near = this.turrets.filter(t => this.manhattan(t.idx, i) <= 3).length;
        if (near < fewest) { fewest = near; nest = i; }
      }
    }
    let best = -1, bd = 1e9;
    const x0 = M.x(nest), y0 = M.y(nest);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (!M.inb(x, y)) continue;
      const i = M.idx(x, y);
      if (!this.canTurret(i)) continue;
      const d = Math.abs(dx) + Math.abs(dy) + (this.homeDist[i] < 0 ? 4 : 0);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return false;
    this.placeTurret(best, by);
    if (by === 'chan' && lvl < 2 && this.turrets.filter(t => this.manhattan(t.idx, nest) <= 3).length >= 2) this.chanSays('pile', best);
    return true;
  };
})(globalThis.NYA = globalThis.NYA || {});
