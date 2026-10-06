// The meta-game: economy, roster, research, episode flow, prestige, save/load.
// Pure simulation — no DOM. The browser UI and the Node harness both drive this.
(function (NYA) {
  'use strict';

  const LIFE_KEYS = ['catnip', 'episodes', 'tiles', 'fullClears', 'sRanks', 'marks', 'hires', 'transfers', 'motherlodes', 'crits',
    'bestChain', 'zoomies', 'blunts', 'bombs', 'allLoaf', 'traits', 'legendaries', 'boxes', 'rescues', 'droneMarks', 'glowing',
    'madStarter', 'faxClicks', 'whistles', 'maxTier', 'skeins', 'yarn', 'swings', 'items', 'distractions', 'firstBoxDone', 'mewclears'];

  function newSeasonStats() {
    return { swings: 0, fullClears: 0, marks: 0, episodes: 0, catnip: 0 };
  }

  function newState(seed) {
    const life = {};
    for (const k of LIFE_KEYS) life[k] = 0;
    return {
      v: 1,
      seed: String(seed),
      season: 1, episodeNum: 0, episodes: 0,
      catnip: 0, seasonCatnip: 0, lifetimeCatnip: 0, milk: 0,
      yarn: 0,
      upg: {}, loom: {},
      research: null,
      buildings: { office: 1, refinery: 1 },
      tierUnlocked: { 1: 1 }, selectedTier: 1, maxTierReached: 1,
      mine: {}, lifeMine: {},
      crew: [], active: [], reserve: [],
      hires: 0,
      board: { apps: [null, null, null], ads: 0, turn: 0, init: 0 }, // Sgt. Paws's applicant board
      act: {},
      orders: [],
      faxes: {},
      skein: { have: 0, pity: 0, empties: 0 },
      life,
      stats: newSeasonStats(),
      simTime: 0, seasonTime: 0,
      bank: 0, lastOnline: Date.now(),
      novel: {}, noveltyLog: [],
      nyan: 0,
      gallery: {},
      lastEyecatch: '',
      settings: { music: 0.35, sfx: 0.6, musicMode: 'on', sfxMode: 'on', nya: false, shake: true, flashes: true, vhs: false, showDQ: false, hideAnims: false, sci: false, ffOn: false, bgRun: true },
      seasonLog: [],
      tanuki: { nextAt: 0, offer: null, queue: [], rain: null },
      pendingEvent: null,
      ova: null,       // { id, rel } while an OVA run is in progress
      ovaDone: {},     // id -> releases cleared (0-3); also the perk level
    };
  }

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.headless = !!opts.headless;
      this.listeners = [];
      this.s = opts.state || newState(opts.seed || ('nyapo-' + Math.floor(Math.random() * 1e9)));
      this.rng = new NYA.RNG(this.s.rngState || ('meta:' + this.s.seed));
      this.phase = 'idle';
      this.episode = null;
      this.packup = null;
      this.lastResult = null;
      this.faxT = 0;
      this._faxBonus = null;
      this.awaitT = 0;
      const ids = this.s.crew.map(c => c.id).concat(this.s.board.apps.filter(Boolean).map(c => c.id));
      if (ids.length) NYA.setNextCatgirlId(Math.max(...ids) + 1);
      this.openBoard();
      if (this.s.season > 1) this.applyHeadStarts(); // floors only; fixes saves that bought head starts mid-season
      NYA.settingsRef.sci = !!this.s.settings.sci;
    }

    on(fn) { this.listeners.push(fn); }
    emit(type, data) { for (const fn of this.listeners) fn(type, data || {}); }

    // ------------------------------------------------------------ lookups
    lvl(id) { return this.s.upg[id] || 0; }
    loom(id) { return this.s.loom[id] || 0; }
    fc(t) { return (this.s.mine[t] && this.s.mine[t].fc) || 0; }
    hasSRank(t) { return !!(this.s.lifeMine[t] && this.s.lifeMine[t].s); }
    crewById(id) { return this.s.crew.find(c => c.id === id); }
    activeCrew() { return this.s.active.map(id => this.crewById(id)).filter(Boolean); }
    reserveCrew() { return this.s.reserve.map(id => this.crewById(id)).filter(Boolean); }
    statsFor(cg, ctx) {
      if (!ctx) ctx = { mineKey: NYA.TIERS[this.s.selectedTier].key, tier: this.s.selectedTier, crew: this.activeCrew(), sRankHere: this.hasSRank(this.s.selectedTier) };
      return NYA.buildStats(this, cg, ctx);
    }

    faxBonus() {
      if (this._faxBonus) return this._faxBonus;
      const b = { catnip: 0, xp: 0, yarn: 0, power: 0 };
      for (const id in this.s.faxes) {
        const f = NYA.FAX[id]; if (!f) continue;
        for (const k in f.bonus) b[k] = (b[k] || 0) + f.bonus[k];
      }
      return (this._faxBonus = b);
    }
    loomRowDone(r) { return NYA.LOOM[r].every(n => this.loom(n.id) >= 1); }
    loomColDone(c) { return NYA.LOOM.every(row => this.loom(row[c].id) >= 1); }
    loomComplete() { return NYA.LOOM.every(row => row.every(n => this.loom(n.id) >= 1)); }

    catnipMultParts() {
      const parts = [];
      const fb = this.faxBonus();
      if (fb.catnip) parts.push(['Faxes from Auntie', 1 + fb.catnip]);
      if (this.loom('km_catnip')) parts.push(['Catnip Cable-Knit', Math.pow(2, this.loom('km_catnip'))]);
      if (this.lvl('milkbath')) parts.push(['Milk Bath', Math.pow(1.25, this.lvl('milkbath'))]);
      if (this.loomRowDone(1)) parts.push(['Multiplier Stripe', 3]);
      if (this.loomColDone(0)) parts.push(['Cast-On Stripe', 1.5]);
      if (this.loomColDone(2)) parts.push(['Cable Stripe', 1.5]);
      if (this.loomColDone(4)) parts.push(['Bind-Off Stripe', 2]);
      return parts;
    }
    catnipMult() { return this.catnipMultParts().reduce((a, p) => a * p[1], 1); }
    xpMult() {
      let m = 1 + this.faxBonus().xp;
      m *= Math.pow(2, this.loom('km_xp'));
      if (this.loomColDone(1)) m *= 1.5;
      if (this.loomColDone(3)) m *= 1.5;
      return m;
    }
    refineryMult() { return this.ovaIs('budget') ? 1 : Math.pow(1.5, this.lvl('refinery')); }
    fullClearMult() { return 1.25 + 0.15 * this.lvl('perfection') + 0.25 * this.loom('km_clear'); }
    packUpTime() { return Math.max(NYA.OVA_PACKUP_FLOOR[this.ovaPerk('nine')], 6 - 0.5 * this.lvl('drills')); }
    laserMax() { return 3 + this.lvl('batteries'); }
    crewCap() { return this.ovaIs('onecat') ? 1 : 1 + this.lvl('bunk'); }
    reserveCap() { return 2 + this.lvl('lockers'); }
    levelCap() { return NYA.LEVEL_CAPS[this.lvl('montage')]; }
    polishExp() { return this.ovaIs('budget') ? 1 : [1, 1.15, 1.3][this.lvl('polisher')]; }

    // ------------------------------------------------------------ OVAs (js/data/ovas.js)
    ovaIs(id) { return !!(this.s.ova && this.s.ova.id === id); }
    ovaPerk(id) { return (this.s.ovaDone && this.s.ovaDone[id]) || 0; }
    ovaShelfOpen() { return this.s.season >= NYA.OVA_UNLOCK_SEASON || !!this.s.ova || Object.keys(this.s.ovaDone || {}).length > 0; }
    ovaUnlocked(id) { const o = NYA.OVA[id]; return this.ovaShelfOpen() && (o.index === 0 || this.ovaPerk(NYA.OVAS[o.index - 1].id) >= 1); }
    ovaGoal() { const o = this.s.ova && NYA.OVA[this.s.ova.id]; return o ? o.goals[this.s.ova.rel] : null; }
    ovaCfg() {
      return { lightsOut: this.ovaIs('lights'), timeLimit: this.ovaIs('nine') ? NYA.OVA_TIME_LIMIT : 0,
        noLaser: this.ovaIs('nolaser'), loafPower: 0.04 * this.ovaPerk('monday') };
    }
    // start an OVA instead of a normal unravel: you still get this run's yarn on the way out
    startOva(id) {
      const o = NYA.OVA[id];
      if (!o || this.s.ova || !this.s.skein.have || !this.ovaUnlocked(id)) return false;
      const rel = this.ovaPerk(id);
      if (rel >= 3) return false;
      this.unravel({ ova: { id, rel } });
      return true;
    }
    abandonOva() {
      if (!this.s.ova) return false;
      this.emit('ova', { phase: 'abandon', id: this.s.ova.id, rel: this.s.ova.rel });
      return this.unravel({ force: true, noYarn: true });
    }
    checkOvaGoal() {
      const ova = this.s.ova, goal = this.ovaGoal();
      if (!goal || this._ovaClear || goal.cur(this) < goal.need) return;
      this._ovaClear = true; // handled at the next tick, outside of any episode code
    }
    finishOva() {
      const ova = this.s.ova; this._ovaClear = false;
      if (!ova) return;
      const o = NYA.OVA[ova.id];
      this.s.ovaDone[ova.id] = Math.max(this.ovaPerk(ova.id), ova.rel + 1);
      this.s.life.ovaClears = (this.s.life.ovaClears || 0) + 1;
      this.novel('ova:' + ova.id + ':' + ova.rel, 'OVA cleared: ' + o.name + ' (' + NYA.OVA_RELEASES[ova.rel] + ')! ' + o.perk + ' ' + ['', 'I', 'II', 'III'][ova.rel + 1], 'prestige');
      const next = NYA.OVAS[o.index + 1];
      if (ova.rel === 0 && next) this.novel('ova:unlock:' + next.id, 'New OVA on the shelf: ' + next.name, 'prestige');
      this.emit('ova', { phase: 'clear', id: ova.id, rel: ova.rel });
      this.unravel({ force: true, noYarn: true });
    }
    bluntPotency() { return 0.30 + 0.05 * this.lvl('pouch'); }
    bombDamage(tier) { return 50 * NYA.tierHP(tier) * (1 + 0.6 * this.lvl('bombdmg')) * Math.pow(1.25, this.lvl('mewclear')); }
    sonarRadius() { return 3 + Math.max(0, this.lvl('mewclear') - 2); }
    rpMax() { return 5 + 2 * this.lvl('cabinet') + (this.loom('nm_desk') ? 4 : 0); }
    ffSpeed() { return this.loomRowDone(3) ? 5 : this.loom('nm_ff') ? 3 : 2; }
    bankEff() { return this.loom('nm_bank') ? 0.5 : 0.33; }
    purrmitCost(t) { return NYA.TIERS[t].purrmit; }
    hireCost() { return Math.ceil(10 * Math.pow(1.15, this.s.hires)); }
    anchorSlots() { return this.loom('ta_5') ? 5 : this.loom('ta_3') ? 3 : this.loom('ta_2') ? 2 : this.loom('ta_1') ? 1 : 0; }

    // ------------------------------------------------------------ novelty
    novel(key, label, kind) {
      if (this.s.novel[key]) return false;
      this.s.novel[key] = 1;
      const rec = { t: this.s.simTime, st: this.s.seasonTime, season: this.s.season, key, label, kind: kind || 'new' };
      this.s.noveltyLog.push(rec);
      this.emit('novel', rec);
      return true;
    }

    // ------------------------------------------------------------ new game
    newGame() {
      const mochi = NYA.makeCatgirl(this.rng, { name: 'Mochi', fur: 'calico', hair: 'twinbuns', apt: 1,
        blurb: 'Your very first catgirl. Shows up early. Leaves early. Loafs in between.' });
      mochi.family = 'Nekomaru';
      this.s.crew.push(mochi);
      this.s.active.push(mochi.id);
      this.syncActives();
      this.fax('intro', NYA.STORY_FAX.intro);
      this.novel('start', 'Episode 1: The Foreman Arrives!', 'story');
      this.startEpisode();
    }

    // ------------------------------------------------------------ actives
    activeUnlocked(id) {
      if (id === 'mewclear') return this.lvl('mewclear') >= 10;
      return this.lvl(id) >= 1;
    }
    activeMaxCharges(id) { return id === 'blunt' ? 3 + this.lvl('pouch') : 1; }
    syncActives() {
      for (const id of NYA.ACTIVE_ORDER) {
        if (!this.s.act[id]) this.s.act[id] = { ch: this.activeMaxCharges(id), cd: 0 };
        const a = this.s.act[id], mx = this.activeMaxCharges(id);
        if (a.ch > mx) a.ch = mx;
      }
    }
    tickActives(dt) {
      for (const id of NYA.ACTIVE_ORDER) {
        const a = this.s.act[id]; if (!a) continue;
        const mx = this.activeMaxCharges(id);
        if (a.ch < mx) {
          a.cd -= dt;
          if (a.cd <= 0) { a.ch++; a.cd = a.ch < mx ? NYA.ACTIVES[id].cd : 0; }
        } else a.cd = 0;
      }
    }
    canUseActive(id) {
      if (!this.activeUnlocked(id)) return false;
      if (id === 'sonar' && this.ovaIs('lights')) return false;
      if (this.phase !== 'shift' || !this.episode || this.episode.ended) return false;
      const a = this.s.act[id];
      return a && a.ch > 0;
    }
    spendActive(id) {
      const a = this.s.act[id];
      const mx = this.activeMaxCharges(id);
      if (a.ch >= mx) a.cd = NYA.ACTIVES[id].cd;
      a.ch--;
    }
    // target: miner id (blunt), tile idx (bomb/sonar/hotbox/mewclear), none (tuna)
    useActive(id, target) {
      if (!this.canUseActive(id)) return false;
      const ep = this.episode;
      let ok = false;
      if (id === 'blunt') {
        if (target === undefined || target === null) {
          let best = null;
          for (const m of ep.miners) if (m.state !== 'rescue' && (!best || m.stamina / m.maxSt < best.stamina / best.maxSt)) best = m;
          target = best && best.id;
        }
        ok = ep.useBlunt(target, this.bluntPotency());
        if (ok) this.s.life.blunts++;
      } else if (id === 'bomb') {
        ok = ep.useBomb(target, this.bombDamage(ep.tier));
        if (ok) this.s.life.bombs++;
      } else if (id === 'tuna') ok = ep.useTuna();
      else if (id === 'sonar') ok = ep.useSonar(target, this.sonarRadius());
      else if (id === 'hotbox') ok = ep.useHotbox(target);
      else if (id === 'treat') {
        if (target === undefined || target === null) {
          const cap = this.levelCap();
          const cands = ep.miners.filter(m => m.cg.level < cap);
          target = cands.length ? cands.sort((a, b) => b.cg.level - a.cg.level)[0].id : null;
        }
        ok = target !== null && ep.useTreat(target);
      } else if (id === 'catterall') {
        this.s.catterall = this.s.simTime + 90;
        ep.setCatterall(true);
        this.novel('catterall', 'CATTERALL. The crew mines in total silence.', 'active');
        ok = true;
      }
      else if (id === 'mewclear') {
        ok = ep.useMewclear(target);
        if (ok) { this.s.life.mewclears++; if (ep.tier === 1) this.s.life.madStarter++; }
      }
      if (ok) { this.spendActive(id); this.emit('active', { id, target }); }
      return ok;
    }

    // ------------------------------------------------------------ orders (automation)
    orderAvailable(id) {
      const o = NYA.ORDERS[id];
      if (!this.s.buildings.pochi) return false;
      if (o.active) return this.activeUnlocked(o.active);
      if (o.tanuki) return !!this.s.buildings.tanuki;
      return true;
    }
    rpUsed() { return this.runningOrders().reduce((a, id) => a + NYA.ORDERS[id].rp, 0); }
    runningOrders() {
      if (!this.s.buildings.pochi) return [];
      let used = 0;
      const out = [];
      for (const id of this.s.orders) {
        if (!this.orderAvailable(id)) continue;
        const rp = NYA.ORDERS[id].rp;
        if (used + rp <= this.rpMax()) { used += rp; out.push(id); }
      }
      return out;
    }
    orderRunning(id) { return this.runningOrders().indexOf(id) >= 0; }
    toggleOrder(id) {
      const k = this.s.orders.indexOf(id);
      if (k >= 0) this.s.orders.splice(k, 1); else this.s.orders.push(id);
      this.emit('orders');
    }
    runOrders(dt) {
      const run = this.runningOrders();
      if (!run.length) return;
      const ep = this.episode;
      this.orderT = (this.orderT || 0) - dt;
      if (this.orderT > 0) return;
      this.orderT = 0.5;
      if (run.indexOf('tanuki_buy') >= 0) {
        if (this.s.tanuki.offer && this.s.catnip >= this.s.tanuki.offer.cost) this.tanukiBuy();
        if (this.s.tanuki.queue.length && !this.s.pendingEvent) this.queueEvent(0);
      }
      if (run.indexOf('auto_hire') >= 0) {
        if (this.s.active.length < this.crewCap() && this.s.catnip >= this.hireCost()) this.hire();
      }
      if (!ep || ep.ended || this.phase !== 'shift' || ep.fullClear) return;
      if (run.indexOf('cast_blunt') >= 0 && this.canUseActive('blunt') && ep.resLeft > 0) {
        const m = ep.miners.find(mm => mm.state === 'flop' || (mm.state === 'out' && mm.flopped));
        if (m) this.useActive('blunt', m.id);
      }
      if (run.indexOf('cast_tuna') >= 0 && this.canUseActive('tuna')) {
        const mining = ep.miners.filter(m => m.state === 'mine').length;
        if (mining >= Math.max(1, Math.ceil(ep.miners.length * 0.6))) this.useActive('tuna');
      }
      if (run.indexOf('cast_bomb') >= 0 && this.canUseActive('bomb')) {
        const tgt = this.bestBombTarget(ep);
        if (tgt >= 0) this.useActive('bomb', tgt);
      }
      if (run.indexOf('cast_sonar') >= 0 && this.canUseActive('sonar')) {
        const tgt = this.bestSonarTarget(ep);
        if (tgt >= 0) this.useActive('sonar', tgt);
      }
      if (run.indexOf('cast_hotbox') >= 0 && this.canUseActive('hotbox') && ep.resLeft > 0) {
        const low = ep.miners.filter(m => m.stamina < 0.2 * m.maxSt).length;
        if (low >= Math.ceil(ep.miners.length / 2)) {
          const tgt = this.bestHotboxTarget(ep);
          if (tgt >= 0) this.useActive('hotbox', tgt);
        }
      }
    }
    bestBombTarget(ep) {
      const M = ep.mine;
      let best = -1, bv = 0;
      for (let i = 0; i < M.n; i++) {
        if (!M.revealed[i] || M.type[i] !== NYA.T.ORE) continue;
        let v = 0;
        const x0 = M.x(i), y0 = M.y(i);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!M.inb(x0 + dx, y0 + dy)) continue;
          const j = M.idx(x0 + dx, y0 + dy);
          if (M.revealed[j] && M.type[j] === NYA.T.ORE) v += (M.dens[j] - M.dropped[j]) * M.q[j];
        }
        if (v > bv) { bv = v; best = i; }
      }
      return bv >= 3 ? best : -1;
    }
    bestSonarTarget(ep) {
      const M = ep.mine;
      let best = -1, bv = 0;
      for (let k = 0; k < 30; k++) {
        const i = ep.rng.int(0, M.n - 1);
        let v = 0;
        const x0 = M.x(i), y0 = M.y(i);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          if (M.inb(x0 + dx, y0 + dy) && !M.revealed[M.idx(x0 + dx, y0 + dy)]) v++;
        }
        if (v > bv) { bv = v; best = i; }
      }
      return bv >= 12 ? best : -1;
    }
    bestHotboxTarget(ep) {
      const M = ep.mine;
      let sx = 0, sy = 0, n = 0;
      for (const m of ep.miners) { sx += m.x; sy += m.y; n++; }
      if (!n) return -1;
      sx /= n; sy /= n;
      let best = -1, bd = 1e9;
      for (let i = 0; i < M.n; i++) {
        if (ep.homeDist[i] < 0) continue;
        const d = Math.abs(M.x(i) - sx) + Math.abs(M.y(i) - sy);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    // ------------------------------------------------------------ upgrades
    upgVisible(u) { return !u.show || u.show(this) || this.lvl(u.id) > 0; }
    upgCost(id) { const u = NYA.UPG[id]; return NYA.upgCost(u, this.lvl(id)); }
    upgCur(id) { return NYA.UPG[id].cur || 'catnip'; }
    canBuy(id) {
      const u = NYA.UPG[id];
      if (!u) return { ok: false, why: '?' };
      if (!this.s.buildings[u.bld]) return { ok: false, why: 'Building locked' };
      if (this.lvl(id) >= u.max) return { ok: false, why: 'MAX', max: true };
      if (this.ovaIs('budget') && u.bld === 'refinery' && !u.cur) return { ok: false, why: 'Budget Cuts: the Refinery is frozen', locked: true };
      if (this.s.research && this.s.research.id === id) return { ok: false, why: 'In progress…' };
      if (u.req) { const r = u.req(this); if (r) return { ok: false, why: r, locked: true }; }
      if (u.timer && this.s.research) return { ok: false, why: 'Doc Boom is busy', busy: true };
      const cost = this.upgCost(id);
      if ((this.s[u.cur || 'catnip'] || 0) < cost) return { ok: false, why: 'Need ' + NYA.fmt(cost), poor: true, cost };
      return { ok: true, cost };
    }
    buy(id) {
      const c = this.canBuy(id);
      if (!c.ok) return false;
      const u = NYA.UPG[id];
      this.s[u.cur || 'catnip'] -= c.cost;
      if (u.timer) {
        const time = u.timer * (this.s.season > 1 ? 0.5 : 1);
        this.s.research = { id, left: time, total: time };
        this.emit('research', { id, start: true });
      } else this.applyUpgrade(id);
      return true;
    }
    applyUpgrade(id) {
      const u = NYA.UPG[id];
      this.s.upg[id] = this.lvl(id) + 1;
      const l = this.lvl(id);
      if (u.unlock) {
        const [kind, what] = u.unlock.split(':');
        if (kind === 'active') { this.syncActives(); this.novel('active:' + what, 'New Active: ' + NYA.ACTIVES[what].name, 'active'); }
        if (kind === 'tool') this.novel('tool:' + what, 'New Tool: Spray Bottle', 'tool');
        if (kind === 'mine') {
          const t = +what;
          this.s.tierUnlocked[t] = 1;
          this.novel('mine:' + t, 'New Mine: ' + NYA.TIERS[t].name, 'mine');
          this.fax('tier' + t, NYA.STORY_FAX['tier' + t]);
        }
      }
      if (id === 'pouch') this.syncActives();
      if (id === 'montage') { this.novel('montage:' + l, 'Training Montage ' + ['', 'I', 'II', 'III', 'IV'][l] + '! Level cap ' + this.levelCap(), 'montage'); if (l === 1) this.fax('montage', NYA.STORY_FAX.montage); }
      if (id === 'mewclear') {
        this.novel('mewclear:' + l, 'Project MEWCLEAR stage ' + l + ': ' + NYA.MEWCLEAR_NOTES[l], 'mewclear');
        if (l === 10) { this.syncActives(); this.fax('mewclear', NYA.STORY_FAX.mewclear); }
      }
      if (id === 'polisher' || id === 'centrifuge') this.novel('upg:' + id, 'Refinery Module: ' + u.name, 'refinery');
      if (id === 'resonance') this.novel('upg:resonance', 'Groove Theory: chains spread!', 'research');
      if (id === 'resume') this.novel('upg:resume', 'Résumé Reader: Aptitudes revealed', 'research');
      this.emit('upgrade', { id, level: l });
    }
    tickResearch(dt) {
      const r = this.s.research;
      if (!r) return;
      r.left -= dt;
      if (r.left <= 0) {
        this.s.research = null;
        this.applyUpgrade(r.id);
        this.emit('research', { id: r.id, done: true, line: this.rng.pick(NYA.BARKS.doc_research) });
      }
    }

    // ------------------------------------------------------------ applicant board
    // Three visible applicants instead of a blind roll. Hiring leaves the slot empty until the
    // next episode ends; one applicant also moves on every BOARD_TURN episodes. Posting an ad
    // replaces the whole board right away, at a price that doubles per ad and halves per turnover.
    newApplicant() {
      const used = {};
      for (const c of this.s.crew) used[c.name] = 1;
      for (const c of this.s.board.apps) if (c) used[c.name] = 1;
      return NYA.makeCatgirl(this.rng, { usedNames: used, ep: this.s.episodeNum });
    }
    openBoard() { // first fill, once the Barracks exist (also covers saves from before the board)
      const B = this.s.board;
      if (B.init || !this.s.buildings.barracks) return;
      B.init = 1;
      this.fillBoard(false);
    }
    fillBoard(all) {
      const B = this.s.board;
      for (let k = 0; k < NYA.BOARD_SIZE; k++) if (all || !B.apps[k]) B.apps[k] = this.newApplicant();
    }
    boardEpisodeEnd() {
      const B = this.s.board;
      if (!this.s.buildings.barracks) return;
      B.turn++;
      if (B.turn % NYA.BOARD_TURN === 0) {
        // the longest-waiting applicant takes another job
        B.apps.shift(); B.apps.push(null);
        B.ads = Math.max(0, B.ads - 1);
      }
      this.fillBoard(false);
    }
    adCost() { return Math.ceil(this.hireCost() * NYA.AD_MULT * Math.pow(2, this.s.board.ads)); }
    postAd() {
      const cost = this.adCost();
      if (this.s.catnip < cost) return false;
      this.s.catnip -= cost;
      this.s.board.ads++;
      this.s.life.ads = (this.s.life.ads || 0) + 1;
      this.fillBoard(true);
      if (this.novel('ad', 'Hiring fair! Post an ad to refresh the applicant board', 'crew')) this.fax('ad', NYA.STORY_FAX.ad);
      this.emit('ad', {});
      return true;
    }
    // Does this applicant suit someone already on the crew? (e.g. a tuxedo for the Tuxedo Club)
    applicantMatch(cg) {
      return cg.fur === 'tuxedo' && this.s.crew.some(c => c.traits.indexOf('tuxedo_club') >= 0);
    }
    // Auto-hire and the bot take the best visible applicant (aptitude only if Résumé Reader shows it).
    bestApplicant() {
      const apps = this.s.board.apps;
      let best = -1, score = -1;
      for (let k = 0; k < apps.length; k++) {
        const c = apps[k];
        if (!c) continue;
        const sc = (this.lvl('resume') ? c.apt * 10 : 0) + (this.applicantMatch(c) ? 5 : 0);
        if (sc > score) { score = sc; best = k; }
      }
      return best;
    }

    // ------------------------------------------------------------ roster
    hire(slot) {
      const cost = this.hireCost();
      if (this.s.catnip < cost) return null;
      const roomActive = this.s.active.length < this.crewCap();
      const roomRes = this.s.reserve.length < this.reserveCap();
      if (!roomActive && !roomRes) return null;
      const B = this.s.board;
      if (slot === undefined || slot < 0) slot = this.bestApplicant();
      const cg = B.apps[slot];
      if (!cg) return null;
      B.apps[slot] = null;
      this.s.catnip -= cost;
      if (this.loom('ta_fresh')) {
        cg.level = 3;
        const tid = NYA.rollTrait(this.rng, cg.traits, 'burrow', 0, Math.max(this.s.maxTierReached, this.s.life.maxTier || 0));
        if (tid) { cg.traits.push(tid); cg.traitMines.push('burrow'); }
      }
      this.s.crew.push(cg);
      (roomActive ? this.s.active : this.s.reserve).push(cg.id);
      this.s.hires++;
      this.s.life.hires++;
      if (this.s.hires === 1) this.novel('hire:first', 'Second catgirl! Twice the loafing!', 'crew');
      if (this.s.crew.length === 3) this.novel('hire:third', 'Third catgirl! It’s a real crew now', 'crew');
      this.emit('hire', { cg, line: this.rng.pick(NYA.BARKS.paws_hire) });
      return cg;
    }
    transfer(id) {
      const cg = this.crewById(id);
      if (!cg || this.s.crew.length <= 1) return false;
      this.s.crew = this.s.crew.filter(c => c.id !== id);
      this.s.active = this.s.active.filter(x => x !== id);
      this.s.reserve = this.s.reserve.filter(x => x !== id);
      const refund = Math.ceil(this.hireCost() * NYA.TRANSFER_REFUND * (1 + 0.2 * (cg.level - 1)));
      this.s.catnip += refund;
      this.s.life.transfers++;
      if (!this.s.active.length && this.s.reserve.length) this.s.active.push(this.s.reserve.shift());
      this.emit('transfer', { cg, refund, line: this.rng.pick(NYA.BARKS.paws_fire) });
      return true;
    }
    toggleActive(id) {
      const a = this.s.active.indexOf(id), r = this.s.reserve.indexOf(id);
      if (a >= 0) {
        if (this.s.active.length <= 1) return false;
        if (this.s.reserve.length >= this.reserveCap()) return false;
        this.s.active.splice(a, 1); this.s.reserve.push(id);
      } else if (r >= 0) {
        if (this.s.active.length >= this.crewCap()) return false;
        this.s.reserve.splice(r, 1); this.s.active.push(id);
      } else return false;
      this.emit('roster');
      return true;
    }
    giveXP(cg, amt, mineKey) {
      const cap = this.levelCap();
      if (cg.level >= cap) { cg.xp = Math.min(cg.xp + amt, NYA.xpNeed(cg.level)); return 0; }
      cg.xp += amt;
      let gained = 0;
      while (cg.level < cap && cg.xp >= NYA.xpNeed(cg.level)) {
        cg.xp -= NYA.xpNeed(cg.level);
        cg.level++;
        gained++;
        if (NYA.TRAIT_LEVELS.indexOf(cg.level) >= 0) {
          const tid = NYA.rollTrait(this.rng, cg.traits, mineKey, 0, Math.max(this.s.maxTierReached, this.s.life.maxTier || 0));
          if (tid) {
            cg.traits.push(tid); cg.traitMines.push(mineKey);
            this.s.life.traits++;
            const t = NYA.TRAIT[tid];
            if (t.rarity === 'legendary') this.s.life.legendaries++;
            this.novel('trait:first', 'First trait roll! ' + cg.name + ' rolled ' + t.name, 'trait');
            if (t.rarity === 'legendary') this.novel('trait:legendary', 'LEGENDARY TRAIT: ' + t.name, 'trait');
            this.emit('trait', { cg, tid, mineKey, level: cg.level });
          }
        }
      }
      if (cg.level >= cap) cg.xp = Math.min(cg.xp, NYA.xpNeed(cg.level));
      if (gained) this.emit('levelup', { cg, level: cg.level });
      return gained;
    }

    // ------------------------------------------------------------ mines
    selectTier(t) {
      if (!this.s.tierUnlocked[t]) return false;
      this.s.selectedTier = t;
      this.emit('mine', { t });
      return true;
    }

    // ------------------------------------------------------------ episode flow
    startEpisode() {
      const evq = this.s.pendingEvent;
      if (evq) return this.startEventEpisode(evq);
      let t = this.s.selectedTier;
      while (t > 1 && (!this.s.tierUnlocked[t] || this.s.catnip < this.purrmitCost(t))) {
        if (this.s.tierUnlocked[t]) this.emit('toast', { text: 'Can’t afford the purrmit for ' + NYA.TIERS[t].name + ' — falling back.', kind: 'warn' });
        t--;
      }
      const cost = this.purrmitCost(t);
      this.s.catnip -= cost;
      const def = NYA.TIERS[t];
      this.s.episodeNum++;
      this.s.episodes++;
      if (t > this.s.maxTierReached) this.s.maxTierReached = t;
      if (t > this.s.life.maxTier) this.s.life.maxTier = t;
      // Schrödinger's Box roll
      let box = false;
      const boxEligible = !this.s.skein.have && !this.s.ova && (def.box || (t === 2 && this.loom('sk_hum')));
      if (boxEligible) {
        let p = (NYA.BOX_CHANCE[t] || 0.005) + 0.02 * this.loom('sk_box') + this.s.skein.pity;
        for (const cg of this.activeCrew()) if (cg.traits.indexOf('box_whisperer') >= 0) p += 0.03;
        if (this.rng.chance(p)) { box = true; this.s.skein.pity = 0; }
        else this.s.skein.pity += this.loom('sk_hum') ? 0.02 : 0.01;
      }
      const crew = this.activeCrew();
      for (const cg of crew) cg.episodes++;
      const cfg = {
        tier: t,
        seed: this.s.seed + ':' + this.s.season + ':' + this.s.episodeNum,
        crew,
        genOpts: { box, motherlodeChance: 0.02 + 0.015 * this.lvl('radar'), qualityBonus: 0.04 * this.lvl('enrich') },
        laserMax: this.laserMax(),
        headlamp: this.lvl('headlamp'),
        headless: this.headless,
        resonance: this.lvl('resonance') > 0,
        polishExp: this.polishExp(),
        centrifuge: this.lvl('centrifuge'),
        bluntPotency: this.bluntPotency(),
        droneMarks: 1,
        pumpRate: 5 * Math.pow(1.3, this.lvl('pistons')),
        junctions: this.lvl('junctions') > 0,
        purrmit: cost,
      };
      Object.assign(cfg, this.ovaCfg());
      cfg.headlamp += this.ovaPerk('lights');
      if (this.ovaIs('budget')) cfg.centrifuge = 0;
      this.episode = new NYA.Episode(this, cfg);
      if (this.catterallActive()) this.episode.setCatterall(true);
      this.phase = 'shift';
      if (NYA.tierMud(t) > 0) this.novel('terrain', 'Rough ground! Mud and rubble slow your crew down. Pace matters now', 'mine');
      this.emit('episodeStart', { ep: this.episode, num: this.s.episodeNum, tier: t });
      return this.episode;
    }

    // ------------------------------------------------------------ Tanuki's Emporium (GDD §9.4)
    tanukiCost(t) { return NYA.TIERS[t].purrmit * 4 + 200 * NYA.tierBase(t); }
    tanukiOffer() {
      const keys = NYA.EVENT_KEYS.filter(k => !this.s.tanuki.lastKey || k !== this.s.tanuki.lastKey);
      const ev = this.rng.pick(keys);
      const tier = Math.max(1, Math.min(this.s.maxTierReached, NYA.MAX_TIER));
      this.s.tanuki.lastKey = ev;
      this.s.tanuki.offer = { ev, tier, cost: this.tanukiCost(tier), until: this.s.simTime + 15 * 60 };
      this.emit('tanuki', { phase: 'arrive', offer: this.s.tanuki.offer, line: this.rng.pick(NYA.TANUKI_LINES.arrive) });
    }
    tickTanuki() {
      const s = this.s, T = s.tanuki;
      if (!s.buildings.tanuki) return;
      if (T.offer && s.simTime > T.offer.until) {
        if (!T.rain) { T.rain = T.offer; this.emit('tanuki', { phase: 'expire', line: this.rng.pick(NYA.TANUKI_LINES.expire) }); }
        T.offer = null;
      }
      if (!T.offer && s.simTime >= T.nextAt) {
        this.tanukiOffer();
        T.nextAt = s.simTime + this.rng.range(25, 40) * 60;
      }
    }
    tanukiBuy(fromRain) {
      const T = this.s.tanuki;
      const o = fromRain ? T.rain : T.offer;
      if (!o || this.s.catnip < o.cost || T.queue.length >= 3) return false;
      this.s.catnip -= o.cost;
      T.queue.push({ ev: o.ev, tier: o.tier });
      if (fromRain) T.rain = null; else T.offer = null;
      this.emit('tanuki', { phase: 'buy', line: this.rng.pick(NYA.TANUKI_LINES.buy) });
      return true;
    }
    queueEvent(k) {
      const T = this.s.tanuki;
      const q = T.queue[k];
      if (!q || this.s.pendingEvent) return false;
      T.queue.splice(k, 1);
      this.s.pendingEvent = q;
      this.emit('tanuki', { phase: 'queued', ev: q.ev });
      if (this.phase === 'await') this.nextEpisode();
      return true;
    }
    startEventEpisode(q) {
      this.s.pendingEvent = null;
      const ev = NYA.EVENTS[q.ev];
      const t = Math.min(q.tier, NYA.MAX_TIER);
      const def = NYA.TIERS[t];
      this.s.episodeNum++; this.s.episodes++;
      const crew = this.activeCrew();
      for (const cg of crew) cg.episodes++;
      const genOpts = Object.assign({ motherlodeChance: 0.02 + 0.015 * this.lvl('radar'), qualityBonus: 0.04 * this.lvl('enrich') }, ev.gen || {});
      const cfg = {
        tier: t, seed: this.s.seed + ':' + this.s.season + ':' + this.s.episodeNum + ':' + q.ev, crew, genOpts,
        laserMax: this.laserMax(), headlamp: this.lvl('headlamp') + (ev.headlamp || 0), headless: this.headless,
        resonance: this.lvl('resonance') > 0, polishExp: this.polishExp(), centrifuge: this.lvl('centrifuge'),
        bluntPotency: this.bluntPotency(), droneMarks: 1, purrmit: 0,
        pumpRate: 5 * Math.pow(1.3, this.lvl('pistons')), junctions: this.lvl('junctions') > 0,
        event: q.ev, ghosts: ev.ghosts || 0,
      };
      Object.assign(cfg, this.ovaCfg());
      cfg.headlamp += this.ovaPerk('lights');
      if (this.ovaIs('budget')) cfg.centrifuge = 0;
      this.episode = new NYA.Episode(this, cfg);
      if (this.catterallActive()) this.episode.setCatterall(true);
      this.phase = 'shift';
      this.novel('event:' + q.ev, 'Event mine: ' + ev.name + '!', 'event');
      this.emit('episodeStart', { ep: this.episode, num: this.s.episodeNum, tier: t, event: q.ev });
      return this.episode;
    }

    onMotherlode(ep) {
      this.s.life.motherlodes++;
      this.novel('motherlode', 'THE MEOWTHERLODE!!', 'event');
      this.emit('motherlode', { ep });
    }
    onBoxOpened(ep, m) {
      this.s.life.boxes++;
      this.novel('box', 'Schrödinger’s Box opened!', 'event');
      let skein;
      if (!this.s.life.firstBoxDone) { skein = true; this.s.life.firstBoxDone = 1; }
      else skein = this.rng.chance(0.5 + 0.25 * this.s.skein.empties);
      if (skein && !this.s.skein.have) {
        this.s.skein.have = 1; this.s.skein.empties = 0; this.s.skein.foundAt = this.s.seasonTime;
        this.s.life.skeins++;
        this.s.buildings.loom = 1;
        this.novel('skein', 'THE SKEIN!! Unravel the Timeline unlocked', 'prestige');
        this.fax('skein', NYA.STORY_FAX.skein);
        this.emit('skein', { m });
        return 'skein';
      }
      this.s.skein.empties++;
      return 'empty';
    }

    endEpisode() {
      const ep = this.episode;
      const s = this.s;
      const fullClear = ep.fullClear;
      const clearMult = fullClear ? this.fullClearMult() : 1;
      const ref = this.refineryMult();
      const glob = this.catnipMult();
      const threadValue = ep.haul.thread * 40 * ep.tierBase;
      const ore = ep.haul.value + threadValue;
      const evMult = ep.event ? 1.5 * (1 + 0.15 * ep.wishes) : 1;
      let catnip = ore * ref * clearMult * glob * evMult;
      if (ep.event) { s.life.events = (s.life.events || 0) + 1; s.life.wishes = (s.life.wishes || 0) + ep.wishes; }
      let blendCut = 0;
      if (s.blend && s.blend.active) { blendCut = catnip * 0.5; catnip -= blendCut; s.blend.pot += blendCut; }
      s.catnip += catnip;
      this.boardEpisodeEnd();
      const milk = ep.haul.milk;
      if (milk > 0) {
        s.milk += milk; s.life.milk = (s.life.milk || 0) + milk;
        if (this.novel('milk', 'First milk! The Creamery opens at the Refinery', 'refinery')) this.emit('toast', { text: 'Tora: \u201cMilk?! In MY refinery?! …Fine. I\u2019ll make it work.\u201d', kind: 'tora' });
      } s.seasonCatnip += catnip; s.lifetimeCatnip += catnip;
      s.life.catnip += catnip; s.stats.catnip += catnip;
      const rating = ep.rating();
      // stats
      const mkey = ep.event ? 'ev' : ep.tier;
      const ms = s.mine[mkey] || (s.mine[mkey] = { eps: 0, fc: 0, s: 0, best: 0 });
      const lm = s.lifeMine[ep.tier] || (s.lifeMine[ep.tier] = { eps: 0, fc: 0, s: 0, best: 0 });
      ms.eps++; lm.eps++;
      if (fullClear) { ms.fc++; lm.fc++; s.stats.fullClears++; s.life.fullClears++; }
      if (rating === 'S') { ms.s++; lm.s++; s.life.sRanks++; }
      ms.best = Math.max(ms.best, catnip); lm.best = Math.max(lm.best, catnip);
      const L = s.life, st = ep.st;
      L.episodes++; L.tiles += st.tiles; L.crits += st.crits; L.zoomies += st.zoomies;
      L.marks += st.marks; s.stats.marks += st.marks; L.swings += st.swings; s.stats.swings += st.swings;
      L.items += st.items; L.distractions += st.distractions; L.droneMarks += st.droneMarks; L.glowing += st.glowing;
      L.rescues += st.rescues;
      if (st.allLoaf) L.allLoaf++;
      if (st.bestChain > L.bestChain) L.bestChain = st.bestChain;
      if (ep.endReason === 'whistle') L.whistles++;
      s.stats.episodes++;
      for (const m of ep.miners) { m.cg.swings += m.swings; m.cg.items += m.items; }

      // writing
      const top = ep.miners.slice().sort((a, b) => b.items - a.items)[0];
      const name = top ? top.name : 'Mochi';
      const lowHaul = catnip < 0.5 * (this.lastResult ? this.lastResult.catnip : catnip) || rating === 'D';
      if (lowHaul) s.nyan++;
      const title = this.makeTitle(ep, { name, catnip, rating, lowHaul });
      const tora = this.makeToraLine(ep, catnip, rating, lowHaul);
      const preview = this.makePreview(ep, { name, rating, lowHaul });
      const eye = this.pickEyecatcher();

      const result = {
        ep: s.episodeNum, season: s.season, tier: ep.tier, mine: ep.def.name, title, tora, preview, eye,
        reason: ep.endReason, fullClear, rating, extraction: ep.extraction(),
        oreValue: ore, ref, clearMult, glob, catnip, blendCut, milk, event: ep.eventKey, evMult, wishes: ep.wishes,
        items: ep.haul.items, byQ: ep.haul.byQ.slice(), thread: ep.haul.thread, lost: ep.haul.lost,
        motherlode: st.motherlode, box: st.box, chain: st.bestChain, duration: ep.t, purrmit: ep.cfg.purrmit,
        crew: ep.miners.map(m => ({ id: m.id, name: m.name, items: m.items, xp: m.xp, levels: m.levelsGained, flopped: m.flopped, level: m.cg.level })),
      };
      this.lastResult = result;
      if (fullClear && s.life.fullClears === 1) {
        this.novel('fullclear:first', 'PERFECT CLEAR!! The Purrmit Office opens', 'milestone');
      }
      this.phase = 'packup';
      this.packup = { t: 0, total: this.packUpTime(), result };
      this.emit('episodeEnd', result);
      this.checkUnlocks();
      if (this.s.ova) this.checkOvaGoal();
    }

    makeTitle(ep, o) {
      const T = NYA.TITLES, rng = this.rng;
      const dict = { name: o.name, mine: ep.def.name, haul: NYA.fmt(o.catnip), ep: this.s.episodeNum, nyan: this.s.nyan, n: rng.int(2, 99),
        chain: ep.st.bestChain, adj: rng.pick(T.adj), trait: '' };
      let pool = T.generic;
      if (this.s.episodeNum === 404) return 'Episode Not Found';
      if (ep.st.box === 'skein') pool = T.skein;
      else if (ep.st.box) pool = T.box;
      else if (ep.st.motherlode) pool = T.motherlode;
      else if (ep.fullClear && rng.chance(0.6)) pool = T.perfect;
      else if (ep.st.bestChain >= 6 && rng.chance(0.6)) pool = T.chain;
      else if (o.lowHaul && rng.chance(0.5)) pool = T.low;
      return NYA.fill(rng.pick(pool), dict);
    }
    makeToraLine(ep, catnip, rating, low) {
      const B = NYA.BARKS, rng = this.rng;
      let pool;
      if (ep.st.motherlode) pool = B.tora_motherlode;
      else if (ep.fullClear) pool = B.tora_perfect;
      else if (low) pool = B.tora_low;
      else if (rating === 'A' || rating === 'B') pool = B.tora_high;
      else pool = B.tora_mid;
      const n = Math.round(catnip);
      const word = n < 20 ? ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'][n] : NYA.fmt(n);
      return NYA.fill(rng.pick(pool), { n: word, N: word.toUpperCase() });
    }
    makePreview(ep, o) {
      const P = NYA.PREVIEWS, rng = this.rng;
      const crew = this.activeCrew();
      const dict = { name: crew.length ? rng.pick(crew).name : o.name, mine: NYA.TIERS[this.s.selectedTier].name };
      if (this.s.skein.have && rng.chance(0.3)) return rng.pick(P.skein);
      if (ep.st.motherlode) return rng.pick(P.motherlode);
      if (ep.fullClear && rng.chance(0.4)) return rng.pick(P.perfect);
      if (o.lowHaul && rng.chance(0.4)) return rng.pick(P.low);
      return NYA.fill(rng.pick(P.generic), dict);
    }
    pickEyecatcher() {
      const rng = this.rng;
      const pool = NYA.EYECATCHERS.map(e => [e.id, e.rare ? 1.5 : 10]).filter(e => e[0] !== this.s.lastEyecatch);
      const id = rng.weighted(pool);
      this.s.lastEyecatch = id;
      return id;
    }
    // called by the UI when an eyecatcher actually plays, so the gallery only holds what you saw
    markEyecatcher(id) {
      if (this.s.gallery[id]) return;
      this.s.gallery[id] = 1;
      const e = NYA.EYECATCHERS.find(x => x.id === id);
      if (e && e.rare) this.novel('eye:' + id, 'Rare eyecatcher: ' + e.name, 'gallery');
    }

    nextEpisode() {
      if (this.phase !== 'await' && this.phase !== 'packup') return;
      this.packup = null;
      this.startEpisode();
    }
    whistle() {
      if (this.phase === 'shift' && this.episode && !this.episode.ended) {
        this.episode.whistle();
        return true;
      }
      return false;
    }

    // ------------------------------------------------------------ player tools (forwarded)
    laser(idx) {
      if (this.phase !== 'shift' || !this.episode || this.ovaIs('nolaser')) return false;
      return this.episode.addMark(idx, false);
    }
    unmark(idx) { return this.episode ? this.episode.removeMark(idx) : false; }
    spray(idx, on) {
      if (!this.lvl('spray') || !this.episode) return false;
      return this.episode.setForbid(idx, on);
    }

    // ------------------------------------------------------------ unlocks & faxes
    checkUnlocks() {
      const s = this.s, B = s.buildings;
      if (!B.lab && s.life.episodes >= 1) {
        B.lab = 1; this.novel('bld:lab', 'R&D Lab opens! Doc Boom has questions about plywood', 'building');
        this.fax('lab', NYA.STORY_FAX.lab);
      }
      if (!B.barracks && s.lifetimeCatnip >= 25) {
        B.barracks = 1; this.novel('bld:barracks', 'The Barracks open! Sgt. Paws is already crying', 'building');
        this.openBoard();
        this.fax('barracks', NYA.STORY_FAX.barracks);
      }
      if (!B.pochi && (s.stats.fullClears >= 1 || this.loom('nm_desk'))) {
        B.pochi = 1; this.novel('bld:pochi', 'Purrmit Office opens! Standing Orders (automation) available', 'building');
        this.fax('pochi', NYA.STORY_FAX.pochi);
      }
      if (!B.loom && (s.skein.have || s.season > 1)) B.loom = 1;
      if (!B.tanuki && (s.maxTierReached >= 2 || s.season > 1)) {
        B.tanuki = 1; s.tanuki.nextAt = s.simTime;
        this.novel('bld:tanuki', 'Tanuki\u2019s Emporium! A travelling merchant sells limited-time event mines', 'building');
      }
      // swing techniques: first time any crew member folds to a new technique
      let fold = 0;
      for (const cg of this.activeCrew()) fold = Math.max(fold, this.statsFor(cg).fold || 0);
      let cf = 0;
      for (const cg of this.activeCrew()) cf = Math.max(cf, this.statsFor(cg).critFold || 0);
      for (let f = 1; f <= cf; f++) {
        if (this.novel('critfold:' + f, 'Crit focus: ' + NYA.critRankName(f).toUpperCase() + '! Crit chance −30%, Power ×' + NYA.CRIT_FOLD_POWER, 'technique')) this.emit('critfold', { fold: f });
      }
      for (let f = 1; f <= fold; f++) {
        if (this.novel('fold:' + f, 'New swing technique: ' + NYA.techName(f).toUpperCase() + '! Half the swings, double the power', 'technique')) this.emit('technique', { fold: f });
      }
      if (s.life.episodes >= 1 && !s.novel['tip:laser']) { this.novel('tip:laser', 'Tip: click tiles to laser-mark them', 'tip'); this.fax('laser', NYA.STORY_FAX.laser); }
    }
    fax(id, text) {
      // story faxes (no bonus) are delivered through the same machine
      this.emit('fax', { id: 'story:' + id, name: 'From Auntie', text, story: true });
    }
    checkFaxes() {
      let got = false;
      for (const f of NYA.FAXES) {
        if (this.s.faxes[f.id]) continue;
        let ok = false;
        try { ok = f.check(this); } catch (e) { ok = false; }
        if (ok) {
          this.s.faxes[f.id] = Math.floor(this.s.simTime);
          got = true;
          this.emit('fax', { id: f.id, name: f.name, text: f.text, bonus: f.bonus });
        }
      }
      if (got) this._faxBonus = null;
    }

    // ------------------------------------------------------------ prestige
    yarnExp() { return this.loom('sk_exp2') ? 0.5 : this.loom('sk_exp1') ? 0.45 : NYA.YARN_EXP; }
    yarnMult() {
      let m = 1 + this.faxBonus().yarn;
      if (this.loom('sk_mult')) m *= 1.5;
      if (this.loomRowDone(4)) m *= 1.5;
      return m;
    }
    yarnPreview() {
      if (!this.s.skein.have || this.s.ova) return 0;
      return Math.floor(Math.pow(this.s.seasonCatnip / NYA.YARN_DIV, this.yarnExp()) * this.yarnMult());
    }
    // opts.ova: the next run is that OVA. opts.noYarn/force: leave an OVA (cleared or abandoned) for a fresh run.
    unravel(opts) {
      opts = opts || {};
      if (!this.s.skein.have && !opts.force) return false;
      const s = this.s;
      const gain = opts.noYarn ? 0 : this.yarnPreview();
      s.seasonLog.push({ season: s.season, time: s.seasonTime, catnip: s.seasonCatnip, yarn: gain, eps: s.episodes, ova: s.ova ? s.ova.id + ':' + s.ova.rel : undefined });
      s.yarn += gain; s.life.yarn += gain;
      // Timeline Anchors: keep the best N catgirls
      const keepN = this.anchorSlots();
      const kept = s.crew.slice().sort((a, b) => (b.level - a.level) || (b.xp - a.xp)).slice(0, keepN);
      for (const c of kept) { c.anchored = true; c.seasons++; }
      s.season++;
      s.ova = opts.ova || null;
      this._ovaClear = false;
      s.seasonCatnip = 0; s.seasonTime = 0; s.episodes = 0;
      s.catnip = this.loom('hs_cash') ? 300 : 0;
      s.milk = 0;
      s.upg = {};
      s.research = null;
      s.tierUnlocked = { 1: 1 }; s.selectedTier = 1; s.maxTierReached = 1;
      s.mine = {};
      s.crew = kept; s.active = []; s.reserve = [];
      s.hires = 0;
      s.board = { apps: [null, null, null], ads: 0, turn: 0, init: 0 };
      s.act = {};
      s.skein = { have: 0, pity: 0, empties: 0 };
      s.stats = newSeasonStats();
      s.buildings = { office: 1, refinery: 1, loom: 1 };
      s.pendingEvent = null;
      if (s.tanuki) s.tanuki.nextAt = s.simTime + 5 * 60;
      this.applyHeadStarts();
      if (s.life.episodes) { s.buildings.lab = 1; s.buildings.barracks = 1; }
      for (const c of kept) { if (s.active.length < this.crewCap()) s.active.push(c.id); else s.reserve.push(c.id); }
      if (!s.crew.length) {
        const cg = NYA.makeCatgirl(this.rng, { ep: s.episodeNum });
        s.crew.push(cg); s.active.push(cg.id);
      }
      if (this.loomRowDone(0)) {
        const cg = NYA.makeCatgirl(this.rng, { ep: s.episodeNum });
        s.crew.push(cg); (s.active.length < this.crewCap() ? s.active : s.reserve).push(cg.id);
      }
      this.syncActives();
      this._faxBonus = null;
      if (s.ova) {
        const o = NYA.OVA[s.ova.id];
        this.novel('ova:start', 'OVA! A special episode with its own rules. Clear the goal for a permanent perk', 'prestige');
        this.fax('ova:' + o.id, o.fax);
      } else this.novel('season:' + s.season, 'SEASON ' + s.season + '! A new verse of the opening theme', 'prestige');
      if (s.season === 2) this.fax('season2', NYA.STORY_FAX.season2);
      this.episode = null; this.phase = 'idle'; this.packup = null; this.lastResult = null;
      this.emit('unravel', { gain, season: s.season, ova: s.ova, afterOva: !!opts.noYarn });
      this.startEpisode();
      return gain;
    }
    // Head-start knots set a floor on this season's upgrades. Applied at every unravel, and right away
    // when bought: yarn only arrives at an unravel, so buying them always happens mid-season.
    applyHeadStarts() {
      const s = this.s, up = (id, lv) => { if ((s.upg[id] || 0) < lv) s.upg[id] = lv; };
      up('bunk', (this.loom('hs_bunks') ? 2 : 0) + (this.loomRowDone(0) ? 1 : 0));
      if (this.loom('hs_refinery')) up('refinery', 3);
      if (this.loom('hs_lab')) { up('blunt', 1); up('bomb', 1); up('spray', 1); up('drills', 4); }
      if (this.loom('hs_maps')) { up('mine2', 1); s.tierUnlocked[2] = 1; }
      if (this.loom('nm_desk')) s.buildings.pochi = 1;
      const bud = this.ovaPerk('budget'); // OVA perk: Expense Account
      if (bud >= 1) up('refinery', 2);
      if (bud >= 2) up('polisher', 1);
      if (bud >= 3) up('centrifuge', 1);
      // new bunks: move reserves up into the free active slots
      while (s.active.length < this.crewCap() && s.reserve.length) s.active.push(s.reserve.shift());
      this.syncActives();
    }
    loomBuy(id) {
      const n = NYA.LOOM_NODE[id];
      if (!n) return false;
      const l = this.loom(id);
      if (n.max && l >= n.max) return false;
      const cost = NYA.loomCost(n, l);
      if (this.s.yarn < cost) return false;
      this.s.yarn -= cost;
      this.s.loom[id] = l + 1;
      this._faxBonus = null;
      const row0Was = this.loomRowDone(0) && !(NYA.LOOM[0].some(n => n.id === id) && l === 0);
      this.applyHeadStarts();
      if (id === 'hs_cash' && l === 0) this.s.catnip += 300;
      if (!row0Was && this.loomRowDone(0)) { // Head Start Stripe's free recruit, right now too
        const cg = NYA.makeCatgirl(this.rng, { ep: this.s.episodeNum });
        if (this.s.active.length < this.crewCap()) { this.s.crew.push(cg); this.s.active.push(cg.id); }
        else if (this.s.reserve.length < this.reserveCap()) { this.s.crew.push(cg); this.s.reserve.push(cg.id); }
      }
      if (l === 0) this.novel('loom:' + id, 'Loom: ' + n.name, 'loom');
      for (let r = 0; r < 5; r++) if (this.loomRowDone(r)) this.novel('stripe:r' + r, NYA.LOOM_ROW_STRIPES[r].name + '!', 'loom');
      for (let c = 0; c < 5; c++) if (this.loomColDone(c)) this.novel('stripe:c' + c, NYA.LOOM_COL_STRIPES[c].name + '!', 'loom');
      this.emit('loom', { id });
      return true;
    }

    // ------------------------------------------------------------ Catterall & Special Blend
    catterallActive() { return (this.s.catterall || 0) > this.s.simTime; }
    blendAvailable() { const b = this.s.blend; return this.lvl('blend') > 0 && !(b && (b.active || this.s.simTime < (b.readyAt || 0))); }
    startBlend() {
      if (!this.blendAvailable()) return false;
      this.s.blend = { active: 1, until: this.s.simTime + NYA.BLEND_TIME, readyAt: this.s.simTime + NYA.BLEND_COOLDOWN, pot: 0, season: this.s.season, lineT: 0 };
      this.novel('blend', 'Tora’s Special Blend is brewing!', 'refinery');
      this.emit('blend', { phase: 'start', line: this.rng.pick(NYA.BLEND_LINES.start) });
      return true;
    }
    tickBlend(dt) {
      const b = this.s.blend;
      if (!b || !b.active) return;
      b.lineT += dt;
      if (b.lineT > 120) { b.lineT = 0; this.emit('blend', { phase: 'mid', pot: b.pot, line: this.rng.pick(NYA.BLEND_LINES.mid) }); }
      if (this.s.simTime >= b.until) {
        b.active = 0;
        const f = this.rng.weighted(NYA.BLEND_TABLE);
        const payout = b.pot * f;
        this.s.catnip += payout; this.s.seasonCatnip += payout; this.s.lifetimeCatnip += payout; this.s.life.catnip += payout;
        const L = NYA.BLEND_LINES;
        const line = this.rng.pick(f < 1 ? L.bad : f === 1 ? L.even : f >= 4 ? L.jackpot : L.good);
        b.result = { f, pot: b.pot, payout };
        this.emit('blend', { phase: 'end', f, pot: b.pot, payout, line });
      }
    }

    // ------------------------------------------------------------ tick
    tick(dt) {
      const s = this.s;
      if (this._ovaClear) { this.finishOva(); return; }
      s.simTime += dt; s.seasonTime += dt;
      this.tickActives(dt);
      this.tickResearch(dt);
      this.tickBlend(dt);
      this.tanukiT = (this.tanukiT || 0) - dt;
      if (this.tanukiT <= 0) { this.tanukiT = 1; this.tickTanuki(); if (s.ova) this.checkOvaGoal(); }
      if (this.episode && this.episode.catterall && !this.catterallActive()) this.episode.setCatterall(false);
      if (this.phase === 'shift' && this.episode) {
        if (this.loom('nm_drone') && !this.episode.fullClear) {
          const v2 = this.loom('nm_drone2');
          this.episode.droneTick(dt, v2 ? 5 : 2, v2 ? 2 : 4);
        }
        this.runOrders(dt);
        this.episode.tick(dt);
        if (this.episode.ended) this.endEpisode();
      } else if (this.phase === 'packup') {
        this.runOrders(dt);
        this.packup.t += dt;
        if (this.packup.t >= this.packup.total) {
          if (this.orderRunning('repeat')) this.nextEpisode();
          else { this.phase = 'await'; this.awaitT = 10; this.emit('await'); }
        }
      } else if (this.phase === 'await') {
        this.runOrders(dt);
        this.awaitT -= dt;
        if (this.awaitT <= 0) this.nextEpisode();
      }
      this.faxT -= dt;
      if (this.faxT <= 0) { this.faxT = 1; this.checkFaxes(); this.checkUnlocks(); }
    }

    // ------------------------------------------------------------ save / load
    serialize() {
      this.s.rngState = this.rng.state();
      this.s.lastOnline = Date.now();
      return JSON.stringify(this.s);
    }
    static deserialize(json, opts) {
      const s = JSON.parse(json);
      const fresh = newState(s.seed || 'x');
      for (const k in fresh) if (s[k] === undefined) s[k] = fresh[k];
      for (const k in fresh.life) if (s.life[k] === undefined) s.life[k] = 0;
      for (const k in fresh.settings) if (s.settings[k] === undefined) s.settings[k] = fresh.settings[k];
      const g = new Game(Object.assign({}, opts, { state: s }));
      g.syncActives();
      return g;
    }
  }

  NYA.Game = Game;
  NYA.newState = newState;
})(globalThis.NYA = globalThis.NYA || {});
