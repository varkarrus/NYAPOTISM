// The meta-game: economy, roster, research, episode flow, prestige, save/load.
// Pure simulation — no DOM. The browser UI and the Node harness both drive this.
(function (NYA) {
  'use strict';

  const LIFE_KEYS = ['catnip', 'episodes', 'tiles', 'fullClears', 'sRanks', 'marks', 'hires', 'transfers', 'motherlodes', 'crits',
    'bestChain', 'zoomies', 'blunts', 'bombs', 'allLoaf', 'traits', 'legendaries', 'boxes', 'rescues', 'droneMarks', 'glowing',
    'madStarter', 'faxClicks', 'whistles', 'maxTier', 'skeins', 'yarn', 'swings', 'items', 'distractions', 'firstBoxDone', 'mewclears'];

  // Everything that belongs to one run (what an unravel resets). An OVA sets these aside in s.suspended.
  const RUN_KEYS = ['episodes', 'catnip', 'seasonCatnip', 'seasonYarnNip', 'seasonTime', 'milk', 'sushi', 'cheese', 'greebles', 'upg', 'research',
    'buildings', 'tierUnlocked', 'selectedTier', 'maxTierReached', 'mine', 'crew', 'active', 'reserve', 'hires', 'board', 'act', 'skein',
    'stats', 'pendingEvent', 'blend', 'tanuki', 'catterall'];

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
      catnip: 0, seasonCatnip: 0, lifetimeCatnip: 0, seasonYarnNip: 0, yarnNipInit: 0, milk: 0, sushi: 0, cheese: 0, greebles: 0,
      yarn: 0,
      upg: {}, loom: {},
      auto: { n: 0, off: {} }, // Autopilot: how many autobuyers are earned, and which are switched off (lifetime, survives unravels and OVAs)
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
      suspended: null, // { at: simTime, run: {RUN_KEYS...} }: the regular run, saved while an OVA plays
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
      const sus = this.s.suspended && this.s.suspended.run; // the run saved during an OVA keeps its ids too
      if (sus) ids.push(...sus.crew.map(c => c.id), ...sus.board.apps.filter(Boolean).map(c => c.id));
      if (ids.length) NYA.setNextCatgirlId(Math.max(...ids) + 1);
      this.openBoard();
      if (this.s.season > 1) this.applyHeadStarts(); // floors only; fixes saves that bought head starts mid-season
      if (!this.s.yarnNipInit) { this.s.seasonYarnNip = this.s.seasonCatnip; this.s.yarnNipInit = 1; } // saves from before seasonYarnNip
      NYA.settingsRef.sci = !!this.s.settings.sci;
    }

    on(fn) { this.listeners.push(fn); }
    emit(type, data) { for (const fn of this.listeners) fn(type, data || {}); }

    // ------------------------------------------------------------ lookups
    lvl(id) { return this.s.upg[id] || 0; }
    loom(id) { return this.s.loom[id] || 0; }
    knit(id) { return NYA.knitEff(this.loom(id)); } // a knit multiplier's effective ranks (capped, fading)
    fc(t) { return (this.s.mine[t] && this.s.mine[t].fc) || 0; }
    easyClear(t) { return !!(this.s.mine[t] && this.s.mine[t].easy); } // this run (NYA.EASY_CLEAR)
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
    // p: which Loom pattern (NYA.LOOM_PATTERNS, 1-based)
    loomRowDone(r, p) { return NYA.LOOM_PATTERNS[(p || 1) - 1].grid[r].every(n => this.loom(n.id) >= 1); }
    loomColDone(c, p) { return NYA.LOOM_PATTERNS[(p || 1) - 1].grid.every(row => this.loom(row[c].id) >= 1); }
    loomComplete(p) { return NYA.LOOM_PATTERNS[(p || 1) - 1].grid.every(row => row.every(n => this.loom(n.id) >= 1)); }
    loomPatternOpen(p) { return p === 1 || this.loomComplete(p - 1); }

    catnipMultParts() {
      const parts = [];
      const fb = this.faxBonus();
      if (fb.catnip) parts.push(['Faxes from Auntie', 1 + fb.catnip]);
      if (this.loom('km_catnip')) parts.push(['Catnip Cable-Knit', Math.pow(2, this.knit('km_catnip'))]);
      if (this.lvl('milkbath')) parts.push(['Milk Bath', Math.pow(1.25, this.lvl('milkbath'))]);
      if (this.lvl('otoro')) parts.push(['Otoro Platter', Math.pow(1.25, this.lvl('otoro'))]);
      if (this.lvl('gouda')) parts.push(['Aged Gouda', Math.pow(1.25, this.lvl('gouda'))]);
      if (this.lvl('salvage')) parts.push(['Saucer Salvage', Math.pow(1.25, this.lvl('salvage'))]);
      if (this.loomRowDone(1)) parts.push(['Multiplier Stripe', 3]);
      if (this.loomColDone(0)) parts.push(['Cast-On Stripe', 1.5]);
      if (this.loomColDone(2)) parts.push(['Cable Stripe', 1.5]);
      if (this.loomColDone(4)) parts.push(['Bind-Off Stripe', 2]);
      if (this.loomRowDone(1, 2)) parts.push(['Multiplier Stripe II', 5]);
      if (this.loomColDone(0, 2)) parts.push(['Cast-On Stripe II', 2]);
      if (this.loomColDone(2, 2)) parts.push(['Cable Stripe II', 2]);
      return parts;
    }
    catnipMult() { return this.catnipMultParts().reduce((a, p) => a * p[1], 1); }
    // Catnip per point of ore value, before the Full-Clear Bonus (Refinery × global × event mine). Ore labels,
    // drop-off pops and the running haul total all use it.
    nipMult(ep) { return this.refineryMult() * this.catnipMult() * (ep && ep.event ? 1.5 * (1 + 0.15 * ep.wishes) : 1); }
    haulCatnip(ep) { return (ep.haul.value + ep.haul.thread * 40 * ep.tierBase) * this.nipMult(ep); }
    xpMult() {
      let m = 1 + this.faxBonus().xp;
      m *= Math.pow(2, this.knit('km_xp'));
      if (this.loomColDone(1)) m *= 1.5;
      if (this.loomColDone(3)) m *= 1.5;
      if (this.loomColDone(1, 2)) m *= 2;
      if (this.loomColDone(3, 2)) m *= 2;
      m *= 1 + 0.15 * this.ovaPerk('osha'); // OVA perk: Hazard Pay
      if (this.mew(9)) m *= 1.25;
      return m;
    }
    refineryMult() { return this.ovaIs('budget') ? 1 : Math.pow(1.5, this.lvl('refinery')); }
    fullClearMult() { return 1.25 + 0.15 * this.lvl('perfection') + 0.25 * this.knit('km_clear'); }
    packUpTime() { return Math.max(NYA.OVA_PACKUP_FLOOR[this.ovaPerk('nine')], 6 - 0.5 * this.lvl('drills')); }
    laserMax() { return 3 + this.lvl('batteries'); }
    crewCap() { return this.ovaIs('onecat') ? 1 : 1 + this.lvl('bunk'); }
    reserveCap() { return 2 + this.lvl('lockers') + (this.loom('m2_lockers') ? 3 : 0); }
    levelCap() { return NYA.LEVEL_CAPS[this.lvl('montage')]; }
    polishExp() { return this.ovaIs('budget') ? 1 : [1, 1.15, 1.3][this.lvl('polisher')]; }

    // Sushi Grotto water: Wetsuits soften being wet, Drain Pumps skim flooded tiles
    waterCfg() {
      const ws = this.lvl('wetsuit');
      return { wetPace: NYA.WET_PACE + 0.1 * ws, wetDrain: NYA.WET_DRAIN - 0.25 * ws, drain: this.lvl('drain') };
    }
    // Crystal Catacombs: resonance cascades and refracted marks
    onCrystal(ep, cascade) {
      if (this.novel('crystal', 'CRYSTAL CATNIP! Every hit rings through its neighbours, and a shattering crystal can set off the rest', 'mine'))
        this.emit('toast', { text: 'Doc Boom: \u201cListen to that! It\u2019s RESONATING! Hit one, they all feel it. Hit enough of them and\u2026 well. Stand back.\u201d', kind: 'doc' });
      if (cascade >= 5) this.novel('cascade', 'Resonance cascade! ' + cascade + ' crystals in one chain', 'mine');
    }
    onBuried() { this.novel('buried', 'Funny story… a catgirl started the shift stuck in a rock! The crew will dig her out', 'mine'); }
    onRefract() { this.novel('refract', 'Refraction! Lasering one crystal marks its whole cluster, and doesn\u2019t use up your laser marks', 'tool'); }
    onFlood() { this.novel('flood', 'FLOOD! Opening a chamber lets the water in. Wet catgirls walk at half speed and tire twice as fast', 'mine'); }
    // Mousehole Maze: turret slots and damage, crew damage vs mice, Turret-chan's training
    miceCfg() {
      return { turrets: NYA.TURRET_BASE + this.lvl('cannons'), turretMult: Math.pow(1.5, this.lvl('caliber')) * (this.mew(5) ? 2 : 1),
        combatMult: Math.pow(1.5, this.lvl('combat')), chanLvl: this.lvl('chan'), turretChan: true };
    }
    // Greeble Crash Site: Greeble Treats slow them down
    // Purrmafrost Caverns: Thermal Undies soften the cold
    iceCfg() { return { coldSoft: Math.pow(0.85, this.lvl('thermals')) }; }
    loomCfg() { return { swingSoft: Math.pow(0.85, this.knit('k2_socks')), vetXP: !!this.loom('a2_vet') }; }
    onSlide(ep, len) {
      if (this.novel('slide', 'ICE! Step onto it and you slide until something stops you. The crew plans around it, and the cold makes every swing cost more', 'mine'))
        this.emit('toast', { text: 'Doc Boom: \u201cIt\u2019s not a bug, it\u2019s PHYSICS! Wheeeee! \u2026Someone get the Rescue Claw.\u201d', kind: 'doc' });
      if (len >= 12) this.novel('icecapade', 'ICECAPADE! A ' + Math.round(len) + '-tile slide', 'mine');
    }
    greebleCfg() { return { greebleSlow: Math.pow(0.92, this.lvl('treats')) * (this.mew(8) ? 0.85 : 1) }; }
    onGreeble() {
      if (this.novel('greeble', 'GREEBLES! Alien doodads that scoot away from your crew. Corner one in a dead end, or close in from both sides. Laser one to set the crew on it', 'mine'))
        this.emit('toast', { text: 'Doc Boom: \u201cDon\u2019t chase them in the open, they\u2019re FASTER than you! Herd them into a corner! Like sheep! Small, beeping, extraterrestrial sheep!\u201d', kind: 'doc' });
    }
    onGrab() {
      if (this.novel('grab', 'Got one! Greebles go home in her bag. Spend them at the Refinery (Saucer Salvage), in R&D (Xenology) and at the Purrmit Office', 'refinery'))
        this.emit('toast', { text: 'Tora: \u201cIt\u2019s BEEPING at me. Why is it beeping at me?! \u2026It\u2019s kinda cute. Nyandeyanen.\u201d', kind: 'tora' });
    }
    onMice() {
      if (this.novel('mice', 'MICE! They nibble your crew’s stamina. Your crew fights back, and turrets help (Turret tool, T)', 'mine'))
        this.emit('toast', { text: 'Turret-chan: “H-hi! I’m the defense intern! If you don’t place the turrets, I’ll… I’ll do it! Sorry!”', kind: 'chan' });
    }
    onChan(line) { // Turret-chan's commentary, now and then
      if (this.s.simTime - (this._chanAt || -1e9) < 600) return;
      this._chanAt = this.s.simTime;
      const text = line === 'vibes' ? 'Turret-chan: “I put one by the elevator! For… for vibes!”' : 'Turret-chan: “This nest looked scary, so I put them all here. Is that bad? That’s bad, isn’t it.”';
      this.emit('toast', { text, kind: 'chan' });
    }
    turret(idx) { return this.episode && this.episode.miceOn ? this.episode.placeTurret(idx, 'you') : false; }

    // ------------------------------------------------------------ OVAs (js/data/ovas.js)
    ovaIs(id) { return !!(this.s.ova && this.s.ova.id === id); }
    ovaPerk(id) { return (this.s.ovaDone && this.s.ovaDone[id]) || 0; }
    ovaShelfOpen() { return this.s.season >= NYA.OVA_UNLOCK_SEASON || !!this.s.ova || Object.keys(this.s.ovaDone || {}).length > 0; }
    ovaUnlocked(id) { const o = NYA.OVA[id]; return this.ovaShelfOpen() && this.s.season >= NYA.ovaSeason(o, 0) && (o.index === 0 || this.ovaPerk(NYA.OVAS[o.index - 1].id) >= 1); }
    ovaReleaseReady(id) { const o = NYA.OVA[id], rel = this.ovaPerk(id); return rel < 3 && this.ovaUnlocked(id) && this.s.season >= NYA.ovaSeason(o, rel); }
    ovaGoal() { const o = this.s.ova && NYA.OVA[this.s.ova.id]; return o ? o.goals[this.s.ova.rel] : null; }
    ovaCfg() {
      return { lightsOut: this.ovaIs('lights'), timeLimit: this.ovaIs('nine') ? NYA.OVA_TIME_LIMIT : 0,
        noLaser: this.ovaIs('nolaser'), loafPower: 0.04 * this.ovaPerk('monday'), noHats: this.ovaIs('osha') };
    }
    // An OVA is a side story. Playing a tape sets the current run aside exactly as it stands (s.suspended: no
    // yarn, nothing reset) and starts a fresh OVA run with a brand-new crew: Timeline Anchors don't reach into an
    // OVA (playtest). When the OVA ends, cleared or ejected, the saved run picks up where it left off.
    startOva(id) {
      const o = NYA.OVA[id], s = this.s;
      if (!o || s.ova || !this.ovaReleaseReady(id)) return false;
      const rel = this.ovaPerk(id);
      const run = {};
      for (const k of RUN_KEYS) run[k] = s[k] === undefined ? null : JSON.parse(JSON.stringify(s[k]));
      const ep = this.phase === 'shift' && this.episode && !this.episode.ended ? this.episode : null;
      if (ep) { // the shift that got interrupted is handed back: its purrmit, or its event mine
        if (ep.eventKey) { const q = { ev: ep.eventKey, tier: ep.tier }; if (!run.pendingEvent) run.pendingEvent = q; else run.tanuki.queue.unshift(q); }
        else run[ep.cfg.purrmitCur || 'catnip'] += ep.cfg.purrmit || 0;
      }
      s.suspended = { at: s.simTime, run };
      s.ova = { id, rel };
      s.blend = null; s.catterall = 0;
      s.tanuki = { nextAt: s.simTime + 5 * 60, offer: null, queue: [], rain: null };
      this.freshRun([]);
      this.novel('ova:start', 'OVA! A special episode with its own rules. Clear the goal for a permanent perk', 'prestige');
      this.fax('ova:' + o.id, o.fax);
      this.episode = null; this.phase = 'idle'; this.packup = null; this.lastResult = null;
      this.emit('ova', { phase: 'start', ova: s.ova });
      this.startEpisode();
      return true;
    }
    abandonOva() {
      if (!this.s.ova) return false;
      this.endOva('abandon');
      return true;
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
      this.endOva('clear');
    }
    // leave the OVA (phase 'clear' or 'abandon') and pick the saved run back up
    endOva(phase) {
      const s = this.s, ova = s.ova, sus = s.suspended;
      this._ovaClear = false;
      if (!sus) { // an OVA started before runs could be set aside: it ends in a fresh run, as it used to
        this.emit('ova', { phase, id: ova.id, rel: ova.rel, fresh: true });
        this.unravel({ force: true, noYarn: true });
        return;
      }
      s.seasonLog.push({ season: s.season, time: s.seasonTime, catnip: s.seasonCatnip, yarn: 0, eps: s.episodes, ova: ova.id + ':' + ova.rel });
      for (const k of RUN_KEYS) s[k] = sus.run[k];
      s.ova = null; s.suspended = null;
      // timers on the global clock stood still while the run was set aside
      const dt = s.simTime - sus.at;
      if (s.catterall > sus.at) s.catterall += dt;
      if (s.blend) { if (s.blend.until != null) s.blend.until += dt; if (s.blend.readyAt != null) s.blend.readyAt += dt; }
      if (s.tanuki) { s.tanuki.nextAt += dt; if (s.tanuki.offer) s.tanuki.offer.until += dt; }
      this.syncActives();
      this._faxBonus = null;
      this.announceShelf();
      this.episode = null; this.phase = 'idle'; this.packup = null; this.lastResult = null;
      this.emit('ova', { phase, id: ova.id, rel: ova.rel });
      this.startEpisode();
    }
    bluntPotency() { return 0.30 + 0.05 * this.lvl('pouch'); }
    mew(stage) { return this.lvl('mewclear') >= stage; } // a Project MEWCLEAR stage's bonus (NYA.MEWCLEAR_STAGES)
    bombDamage(tier) { return 50 * NYA.tierHP(tier) * (1 + 0.6 * this.lvl('bombdmg')) * (this.mew(1) ? 1.5 : 1); }
    sonarRadius() { return 3 + (this.mew(2) ? 1 : 0); }
    activeCd(id) { return NYA.ACTIVES[id].cd * (id === 'bomb' && this.mew(3) ? 0.75 : 1); }
    rpMax() { return 5 + 2 * this.lvl('cabinet') + 2 * this.lvl('coproc') + (this.loom('nm_desk') ? 4 : 0); }
    ffSpeed() { return this.loom('m2_ff') ? 8 : this.loomRowDone(3) ? 5 : this.loom('nm_ff') ? 3 : 2; }
    bankEff() { return this.loom('m2_bank') ? 0.75 : this.loom('nm_bank') ? 0.5 : 0.33; }
    purrmitCost(t) { return NYA.TIERS[t].purrmit; }
    purrmitCur(t) { return NYA.TIERS[t].purrmitCur || 'catnip'; } // Tiers 7+ take sushi (GDD)
    canPayPurrmit(t) { return (this.s[this.purrmitCur(t)] || 0) >= this.purrmitCost(t); }
    hireCost() { return Math.ceil(10 * Math.pow(1.15, this.s.hires)); }
    anchorSlots() { return this.loom('a2_anchor10') ? 10 : this.loom('a2_anchor7') ? 7 : this.loom('ta_5') ? 5 : this.loom('ta_3') ? 3 : this.loom('ta_2') ? 2 : this.loom('ta_1') ? 1 : 0; }

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
          if (a.cd <= 0) { a.ch++; a.cd = a.ch < mx ? this.activeCd(id) : 0; }
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
      if (a.ch >= mx) a.cd = this.activeCd(id);
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
        ok = ep.useBomb(target, this.bombDamage(ep.tier), this.mew(4) ? 2 : 1, this.mew(6));
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
      if (o.minBlunts) return this.activeUnlocked('blunt') && this.activeMaxCharges('blunt') >= o.minBlunts;
      if (o.tanuki) return !!this.s.buildings.tanuki;
      return true;
    }
    orderRp(id) { return Math.max(1, NYA.ORDERS[id].rp - (this.loomRowDone(3, 2) ? 1 : 0)); } // Mechanics Stripe II
    rpUsed() { return this.runningOrders().reduce((a, id) => a + this.orderRp(id), 0); }
    runningOrders() {
      if (!this.s.buildings.pochi) return [];
      let used = 0;
      const out = [];
      for (const id of this.s.orders) {
        if (!this.orderAvailable(id)) continue;
        const rp = this.orderRp(id);
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
      // Blunt Rotation: once auto-casting has used the last charge, hold off until they're all back
      const ab = this.s.act.blunt;
      if (ab) {
        if (run.indexOf('blunt_rotation') < 0) ab.hold = false;
        else if (ab.ch <= 0) ab.hold = true;
        else if (ab.ch >= this.activeMaxCharges('blunt')) ab.hold = false;
      }
      if (run.indexOf('cast_blunt') >= 0 && this.canUseActive('blunt') && ep.resLeft > 0 && !(ab && ab.hold)) {
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
      if (this.s.ova && (NYA.OVA[this.s.ova.id].useless || []).indexOf(id) >= 0) return { ok: false, why: NYA.OVA[this.s.ova.id].name + ': no use during this OVA', locked: true };
      if (this.s.research && this.s.research.id === id) return { ok: false, why: 'In progress…' };
      if (u.req) { const r = u.req(this); if (r) return { ok: false, why: r, locked: true }; }
      if (u.timer && this.s.research) return { ok: false, why: 'Doc Boom is busy', busy: true };
      const cost = this.upgCost(id);
      if ((this.s[u.cur || 'catnip'] || 0) < cost) return { ok: false, why: 'Need ' + NYA.fmt(cost), poor: true, cost };
      return { ok: true, cost };
    }
    buy(id, auto) { // auto: bought by the Autopilot (the UI keeps it quiet)
      const c = this.canBuy(id);
      if (!c.ok) return false;
      const u = NYA.UPG[id];
      this.s[u.cur || 'catnip'] -= c.cost;
      if (u.timer) {
        const time = u.timer * (this.s.season > 1 ? 0.5 : 1) * (this.loom('m2_intern') ? 0.25 : 1);
        this.s.research = { id, left: time, total: time, auto: auto ? 1 : 0 };
        this.emit('research', { id, start: true, auto: !!auto });
      } else this.applyUpgrade(id, auto);
      return true;
    }
    applyUpgrade(id, auto) {
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
      if (id === 'bunk' && auto) { // the Autopilot's Bunk Bed Wrench also moves a reserve up into the new slot
        while (this.s.active.length < this.crewCap() && this.s.reserve.length) this.s.active.push(this.s.reserve.shift());
      }
      if (id === 'montage') { this.novel('montage:' + l, 'Training Montage ' + ['', 'I', 'II', 'III', 'IV'][l] + '! Level cap ' + this.levelCap(), 'montage'); if (l === 1) this.fax('montage', NYA.STORY_FAX.montage); }
      if (id === 'mewclear') {
        this.novel('mewclear:' + l, 'Project MEWCLEAR stage ' + l + ': ' + NYA.MEWCLEAR_NOTES[l] + ' (' + NYA.MEWCLEAR_STAGES[l].fx + ')', 'mewclear');
        if (l === 10) { this.syncActives(); this.fax('mewclear', NYA.STORY_FAX.mewclear); }
      }
      if (id === 'polisher' || id === 'centrifuge') this.novel('upg:' + id, 'Refinery Module: ' + u.name, 'refinery');
      if (id === 'resonance') this.novel('upg:resonance', 'Groove Theory: chains spread!', 'research');
      if (id === 'resume') this.novel('upg:resume', 'Résumé Reader: Aptitudes revealed', 'research');
      this.emit('upgrade', { id, level: l, auto: !!auto });
    }
    // An easy clear (NYA.EASY_CLEAR) stands in for every "full-clear this mine n times" requirement this run. Say so
    // when it's the thing that just opened a survey or a bunk.
    markEasyClear(t, ms) {
      const gated = () => NYA.UPGRADES.filter(u => u.req && this.upgVisible(u) && this.lvl(u.id) < (u.max || 1) && u.req(this)).map(u => u.id);
      const before = gated();
      ms.easy = 1;
      const after = gated();
      const opened = before.filter(id => !after.includes(id));
      if (!opened.length) return;
      this.novel('easyclear', 'Easy clear! A perfect clear with the crew above half stamina counts for the whole perfect-clear requirement', 'research');
      this.emit('toast', { text: 'Doc Boom: \u201cThat barely made them sweat! I\u2019ve seen enough. ' + opened.map(id => NYA.UPG[id].name).join(' and ') + (opened.length > 1 ? ' are' : ' is') + ' ready when you are!\u201d', kind: 'doc' });
    }
    tickResearch(dt) {
      const r = this.s.research;
      if (!r) return;
      r.left -= dt;
      if (r.left <= 0) {
        this.s.research = null;
        this.applyUpgrade(r.id, r.auto);
        this.emit('research', { id: r.id, done: true, auto: !!r.auto, line: this.rng.pick(NYA.BARKS.doc_research) });
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
      const cg = NYA.makeCatgirl(this.rng, { usedNames: used, ep: this.s.episodeNum });
      // Star Search (Loom II): roll for a promotion, and on a success roll again, so grades chain (GDD §14.3)
      const p = 0.05 * Math.min(NYA.KNIT_MAX, this.loom('k2_star'));
      if (p > 0) {
        let k = 0;
        while (k < 40 && this.rng.chance(p)) k++;
        if (k) {
          cg.apt += k; cg.starred = k;
          this.novel('starsearch', 'STAR SEARCH! A promoted applicant on the board: ' + NYA.aptLabel(cg.apt), 'crew');
          if (cg.apt >= 6 && !this.s.novel['starsearch:wow']) {
            this.novel('starsearch:wow', 'STAR SEARCH! An ' + NYA.aptLabel(cg.apt) + ' applicant!', 'crew');
            this.fax('starsearch', 'AN ' + NYA.aptLabel(cg.apt) + ' APPLICANT?? WHERE DID YOU FIND HER. NO. DON\u2019T TELL ME. HIRE HER BEFORE THE TANUKI DOES ♡');
          }
        }
      }
      return cg;
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
      if (this.loom('ta_fresh') || this.loom('a2_head')) {
        cg.level = this.loom('a2_head') ? 10 : 3;
        for (let k = 0; k < (this.loom('a2_head') ? 2 : 1); k++) {
          const tid = NYA.rollTrait(this.rng, cg.traits, 'burrow', 0, Math.max(this.s.maxTierReached, this.s.life.maxTier || 0), cg);
          if (tid) { cg.traits.push(tid); cg.traitMines.push('burrow'); if (NYA.TRAIT[tid].onGain) NYA.TRAIT[tid].onGain(cg); }
        }
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
          const tid = NYA.rollTrait(this.rng, cg.traits, mineKey, 0, Math.max(this.s.maxTierReached, this.s.life.maxTier || 0), cg);
          if (tid) {
            cg.traits.push(tid); cg.traitMines.push(mineKey);
            if (NYA.TRAIT[tid].onGain) NYA.TRAIT[tid].onGain(cg);
            this.s.life.traits++;
            const t = NYA.TRAIT[tid];
            if (t.rarity === 'legendary') this.s.life.legendaries++;
            this.novel('trait:first', 'First trait roll! ' + cg.name + ' rolled ' + t.name, 'trait');
            if (t.rarity === 'legendary') this.novel('trait:legendary', 'LEGENDARY TRAIT: ' + t.name, 'trait');
            this.emit('trait', { cg, tid, mineKey, level: cg.level });
          }
        }
        if (this.ovaIs('osha') && this.rng.chance(NYA.OSHA_INJURY)) { // OVA: No OSHA Compliance
          const hurt = NYA.OSHA_INJURIES.filter(([id]) => cg.traits.indexOf(id) < 0);
          if (hurt.length) {
            const tid = this.rng.weighted(hurt);
            cg.traits.push(tid); cg.traitMines.push(mineKey);
            this.s.life.injuries = (this.s.life.injuries || 0) + 1;
            this.emit('toast', { text: tid === 'spanish' ? '🤕 ' + cg.name + ' bonked her head and woke up… Fluent in Spanish?! ¡Miau!' : '💥 ' + cg.name + ' leveled up… and is now ' + NYA.TRAIT[tid].name + '. (No hard hats!)', kind: 'warn' });
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
      while (t > 1 && (!this.s.tierUnlocked[t] || !this.canPayPurrmit(t))) {
        if (this.s.tierUnlocked[t]) this.emit('toast', { text: 'Can’t afford the purrmit for ' + NYA.TIERS[t].name + (this.purrmitCur(t) !== 'catnip' ? ' (it costs ' + this.purrmitCur(t) + ')' : '') + ' — falling back.', kind: 'warn' });
        t--;
      }
      const cost = this.purrmitCost(t), cur = this.purrmitCur(t);
      this.s[cur] -= cost;
      const def = NYA.TIERS[t];
      this.s.episodeNum++;
      this.s.episodes++;
      if (t > this.s.maxTierReached) this.s.maxTierReached = t;
      if (t > this.s.life.maxTier) this.s.life.maxTier = t;
      // Schrödinger's Box roll
      let box = false;
      const boxEligible = !this.s.skein.have && !this.s.ova && (def.box || (t === 2 && this.loom('sk_hum')));
      if (boxEligible) {
        let p = (NYA.BOX_CHANCE[t] || (t >= 7 && this.loom('s2_box') ? NYA.BOX_CHANCE[6] : 0.005)) + 0.02 * this.loom('sk_box') + 0.05 * this.loom('s2_box') + this.s.skein.pity;
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
        pumpRate: NYA.PUMP_RATE * Math.pow(1.3, this.lvl('pistons')), resonanceMult: (1 + 0.15 * this.lvl('fork')) * (this.mew(7) ? 1.5 : 1),
        junctions: this.lvl('junctions') > 0,
        purrmit: cost, purrmitCur: cur,
      };
      Object.assign(cfg, this.ovaCfg(), this.waterCfg(), this.miceCfg(), this.greebleCfg(), this.iceCfg(), this.loomCfg());
      cfg.headlamp += this.ovaPerk('lights');
      if (this.ovaIs('budget')) cfg.centrifuge = 0;
      this.episode = new NYA.Episode(this, cfg);
      if (this.catterallActive()) this.episode.setCatterall(true);
      this.phase = 'shift';
      if (NYA.tierMud(t) > 0) this.novel('terrain', 'Rough ground! Mud and rubble slow your crew down. Pace matters now', 'mine');
      if (NYA.tierFooting(t) > 1) this.novel('footing', 'Slick floors! Walking is ÷' + NYA.tierFooting(t).toFixed(1) + ' here, and every deeper mine is slicker. Comfy Boots help', 'mine');
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
        pumpRate: NYA.PUMP_RATE * Math.pow(1.3, this.lvl('pistons')), resonanceMult: (1 + 0.15 * this.lvl('fork')) * (this.mew(7) ? 1.5 : 1), junctions: this.lvl('junctions') > 0,
        event: q.ev, ghosts: ev.ghosts || 0,
      };
      Object.assign(cfg, this.ovaCfg(), this.waterCfg(), this.miceCfg(), this.greebleCfg(), this.iceCfg(), this.loomCfg());
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
      const yarnDiv = NYA.yarnDiv(ep.def, ep.tier) / (ep.tier >= 7 && this.loom('s2_deep') ? 3 : 1); // see NYA.YARN_TIER_FROM; Deep Spool (Loom II)
      if (s.blend && s.blend.active) { blendCut = catnip * 0.5; catnip -= blendCut; s.blend.pot += blendCut; s.blend.potYarn = (s.blend.potYarn || 0) + blendCut / yarnDiv; }
      s.catnip += catnip;
      this.boardEpisodeEnd();
      const resMult = Math.pow(1.5, this.knit('k2_res')); // Mohair Blend (Loom II)
      const sushi = Math.round(ep.haul.sushi * resMult);
      if (sushi > 0) {
        s.sushi += sushi; s.life.sushi = (s.life.sushi || 0) + sushi;
        if (this.novel('sushi', 'First sushi! Tora opens a Sushi Bar at the Refinery', 'refinery')) this.emit('toast', { text: 'Tora: \u201cRaw fish growing on ROCKS?! …Pass the soy sauce.\u201d', kind: 'tora' });
      }
      const cheese = Math.round(ep.haul.cheese * resMult);
      if (cheese > 0) {
        s.cheese += cheese; s.life.cheese = (s.life.cheese || 0) + cheese;
        if (this.novel('cheese', 'First cheese! Spend it on turrets in R&D (Defense) and at Tora’s Cheese Cave', 'lab')) this.emit('toast', { text: 'Doc Boom: \u201cCHEESE! Do you know what I can build with cheese?! …Turrets. Mostly turrets.\u201d', kind: 'doc' });
      }
      const greebles = Math.round(ep.haul.greebles * resMult);
      if (greebles > 0) { s.greebles += greebles; s.life.greebles = (s.life.greebles || 0) + greebles; }
      const milk = ep.haul.milk * resMult;
      if (milk > 0) {
        s.milk += milk; s.life.milk = (s.life.milk || 0) + milk;
        if (this.novel('milk', 'First milk! The Creamery opens at the Refinery', 'refinery')) this.emit('toast', { text: 'Tora: \u201cMilk?! In MY refinery?! …Fine. I\u2019ll make it work.\u201d', kind: 'tora' });
      } s.seasonCatnip += catnip; s.lifetimeCatnip += catnip;
      s.seasonYarnNip += catnip / yarnDiv;
      s.life.catnip += catnip; s.stats.catnip += catnip;
      const rating = ep.rating();
      // stats
      const mkey = ep.event ? 'ev' : ep.tier;
      const ms = s.mine[mkey] || (s.mine[mkey] = { eps: 0, fc: 0, s: 0, best: 0 });
      const lm = s.lifeMine[ep.tier] || (s.lifeMine[ep.tier] = { eps: 0, fc: 0, s: 0, best: 0 });
      ms.eps++; lm.eps++;
      if (fullClear) { ms.fc++; lm.fc++; s.stats.fullClears++; s.life.fullClears++; }
      if (fullClear && !ep.event && !ms.easy && ep.clearStam >= NYA.EASY_CLEAR) this.markEasyClear(ep.tier, ms);
      if (rating === 'S') { ms.s++; lm.s++; s.life.sRanks++; }
      ms.best = Math.max(ms.best, catnip); lm.best = Math.max(lm.best, catnip);
      const L = s.life, st = ep.st;
      L.episodes++; L.tiles += st.tiles; L.crits += st.crits; L.zoomies += st.zoomies;
      L.marks += st.marks; s.stats.marks += st.marks; L.swings += st.swings; s.stats.swings += st.swings;
      L.items += st.items; L.distractions += st.distractions; L.droneMarks += st.droneMarks; L.glowing += st.glowing;
      L.rescues += st.rescues; L.floods = (L.floods || 0) + (st.floods || 0);
      if (st.crystals) { L.crystals = (L.crystals || 0) + st.crystals; L.bestCascade = Math.max(L.bestCascade || 0, st.bestCascade || 0); }
      if (st.slides) { L.slides = (L.slides || 0) + st.slides; L.longSlide = Math.max(L.longSlide || 0, st.longSlide || 0); }
      if (st.rescues && ep.iceOn) L.iceRescues = (L.iceRescues || 0) + st.rescues;
      if (ep.miceOn) { L.mice = (L.mice || 0) + (st.mice || 0); L.nests = (L.nests || 0) + (st.nests || 0); L.bites = (L.bites || 0) + (st.bites || 0); }
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
        oreValue: ore, ref, clearMult, glob, catnip, blendCut, milk, sushi, cheese, greebles, mice: st.mice || 0, stolen: st.stolen || 0, event: ep.eventKey, evMult, wishes: ep.wishes,
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
      const pool = NYA.EYECATCHERS.filter(e => e.id !== this.s.lastEyecatch && (!e.req || e.req(this))).map(e => [e.id, e.rare ? 1.5 : 10]);
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
      if (B.loom && (!s.novel['loom:pattern2'] || !s.auto.n) && this.loomComplete(1)) this.loomPatternNews();
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
          this.s.faxes[f.id] = Math.max(1, Math.floor(this.s.simTime)); // 0 would read as "not received"
          got = true;
          this.emit('fax', { id: f.id, name: f.name, text: f.text, bonus: f.bonus });
        }
      }
      if (got) this._faxBonus = null;
    }

    // ------------------------------------------------------------ prestige
    yarnExp() { return (this.loom('sk_exp2') ? 0.5 : this.loom('sk_exp1') ? 0.45 : NYA.YARN_EXP) + (this.loom('s2_exp') ? 0.03 : 0) + (this.loom('s2_exp2') ? 0.05 : 0); }
    yarnMult() {
      let m = 1 + this.faxBonus().yarn;
      if (this.loom('sk_mult')) m *= 1.5;
      if (this.loomRowDone(4)) m *= 1.5;
      if (this.loom('s2_mult')) m *= 2;
      if (this.loomRowDone(4, 2)) m *= 2;
      if (this.loomColDone(4, 2)) m *= 1.5;
      return m;
    }
    yarnPreview() {
      if (!this.s.skein.have || this.s.ova) return 0;
      return Math.floor(Math.pow(this.s.seasonYarnNip / NYA.YARN_DIV, this.yarnExp()) * this.yarnMult());
    }
    // opts.noYarn/force: only for leaving an OVA started before runs could be set aside (see endOva).
    unravel(opts) {
      opts = opts || {};
      if (!this.s.skein.have && !opts.force) return false;
      const s = this.s;
      // Tora's Blend can't brew across timelines (playtest exploit: a pot started before unravelling paid out
      // millions early in the next run). An unfinished pot counts at face value toward this run instead.
      const b = s.blend;
      if (b && b.active) {
        b.active = 0;
        s.seasonCatnip += b.pot; s.seasonYarnNip += b.potYarn != null ? b.potYarn : b.pot;
        b.pot = 0; b.potYarn = 0; b.result = null;
      }
      const gain = opts.noYarn ? 0 : this.yarnPreview();
      s.seasonLog.push({ season: s.season, time: s.seasonTime, catnip: s.seasonCatnip, yarn: gain, eps: s.episodes, ova: s.ova ? s.ova.id + ':' + s.ova.rel : undefined });
      s.yarn += gain; s.life.yarn += gain;
      const kept = this.anchoredCrew();
      for (const c of kept) { c.anchored = true; c.seasons++; }
      if (s.ova && s.ova.id === 'osha') { // No OSHA Compliance is over: the injuries heal
        for (const c of kept) for (let k = c.traits.length - 1; k >= 0; k--) if ((NYA.TRAIT[c.traits[k]] || {}).ova) { c.traits.splice(k, 1); c.traitMines.splice(k, 1); }
      }
      s.season++;
      s.ova = null;
      this.freshRun(kept);
      this.announceShelf();
      this.novel('season:' + s.season, 'SEASON ' + s.season + '! A new verse of the opening theme', 'prestige');
      if (s.season === 2) this.fax('season2', NYA.STORY_FAX.season2);
      if (!opts.noYarn && this.loomPatternOpen(2)) this.earnAutopilot(); // one more autobuyer per unravel
      this.episode = null; this.phase = 'idle'; this.packup = null; this.lastResult = null;
      this.emit('unravel', { gain, season: s.season, afterOva: !!opts.noYarn });
      this.startEpisode();
      return gain;
    }
    // Timeline Anchors: the best N catgirls go on to the next run (or into an OVA)
    anchoredCrew() {
      return this.s.crew.slice().sort((a, b) => (b.level - a.level) || (b.xp - a.xp)).slice(0, this.anchorSlots());
    }
    // A brand-new run's state (an unravel, or an OVA starting), with `kept` as the crew carried in
    freshRun(kept) {
      const s = this.s;
      this._ovaClear = false;
      s.seasonCatnip = 0; s.seasonYarnNip = 0; s.seasonTime = 0; s.episodes = 0;
      s.catnip = this.loom('h2_cash') && !s.ova ? 1e6 : this.loom('hs_cash') ? 300 : 0;
      s.milk = 0; s.sushi = 0; s.cheese = 0; s.greebles = 0;
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
      for (let k = (this.loomRowDone(0) ? 1 : 0) + (this.loomRowDone(0, 2) && !s.ova ? 1 : 0); k > 0; k--) { // Head Start Stripes I and II
        const cg = NYA.makeCatgirl(this.rng, { ep: s.episodeNum });
        s.crew.push(cg); (s.active.length < this.crewCap() ? s.active : s.reserve).push(cg.id);
      }
      this.syncActives();
      this._faxBonus = null;
    }
    announceShelf() { // a new tape or a harder release just arrived on the shelf
      for (const o of NYA.OVAS) {
        if (this.ovaUnlocked(o.id) && this.ovaPerk(o.id) === 0) this.novel('ova:unlock:' + o.id, 'New OVA on the shelf: ' + o.name + '!', 'prestige');
        else if (this.ovaReleaseReady(o.id) && this.ovaPerk(o.id) > 0) this.novel('ova:rel:' + o.id + ':' + this.ovaPerk(o.id), o.name + ': the ' + NYA.OVA_RELEASES[this.ovaPerk(o.id)] + ' release is out!', 'prestige');
      }
    }
    // Head-start knots set a floor on this season's upgrades. Applied at every unravel, and right away
    // when bought: yarn only arrives at an unravel, so buying them always happens mid-season.
    applyHeadStarts() {
      const s = this.s, up = (id, lv) => { if ((s.upg[id] || 0) < lv) s.upg[id] = lv; };
      const h2 = !s.ova; // Pattern II's head starts skip OVAs: they'd hand over goals like "reach Tier 4" for free
      up('bunk', (this.loom('hs_bunks') ? 2 : 0) + (this.loomRowDone(0) ? 1 : 0) + (h2 && this.loom('h2_bunks') ? 2 : 0) + (h2 && this.loomRowDone(0, 2) ? 1 : 0));
      if (this.loom('hs_refinery')) up('refinery', 3);
      if (this.loom('hs_lab')) { up('blunt', 1); up('bomb', 1); up('spray', 1); up('drills', 4); }
      if (this.loom('hs_maps')) { up('mine2', 1); s.tierUnlocked[2] = 1; }
      if (this.loom('nm_desk')) s.buildings.pochi = 1;
      // Loom Pattern II head starts
      if (h2 && this.loom('h2_maps')) for (let t = 2; t <= 4; t++) { up('mine' + t, 1); s.tierUnlocked[t] = 1; }
      if (h2 && this.loom('h2_montage')) up('montage', 3);
      if (h2 && this.loom('h2_lab')) { for (const id of ['tuna', 'sonar', 'treat', 'hotbox']) up(id, 1); up('batteries', 3); }
      const bud = this.ovaPerk('budget'); // OVA perk: Expense Account
      if (bud >= 1) up('refinery', 2);
      if (bud >= 2) up('polisher', 1);
      if (bud >= 3) up('centrifuge', 1);
      // new bunks: move reserves up into the free active slots
      while (s.active.length < this.crewCap() && s.reserve.length) s.active.push(s.reserve.shift());
      this.syncActives();
    }
    // ------------------------------------------------------------ Autopilot (NYA.AUTOPILOT, user idea)
    autoEarned() { return Math.min(this.s.auto.n || 0, NYA.AUTOPILOT.length); }
    autoHas(id) { const k = NYA.AUTOPILOT.indexOf(NYA.AUTO[id]); return k >= 0 && k < this.autoEarned(); }
    autoOn(id) { return this.autoHas(id) && !this.s.auto.off[id]; }
    autoToggle(id) {
      if (!this.autoHas(id)) return false;
      const off = this.s.auto.off;
      if (off[id]) delete off[id]; else off[id] = 1;
      this.emit('auto', { id, on: !off[id] });
      return true;
    }
    autoCap(a, id) {
      const c = this.autoHas('mk2') && a.mk2 && a.mk2[id] != null ? a.mk2[id] : a.ids[id];
      return c === 'max' ? NYA.UPG[id].max : c;
    }
    earnAutopilot() {
      const A = this.s.auto, k = A.n || 0;
      if (k >= NYA.AUTOPILOT.length) return;
      const a = NYA.AUTOPILOT[k];
      A.n = k + 1;
      this.novel('auto:' + a.id, 'Autopilot: ' + a.name + '! ' + (a.id === 'mk2' ? 'Every stat cap goes up' : 'Pochi buys ' + this.autoSummary(a)), 'auto');
      if (k === 0) this.emit('toast', { text: 'Pochi: \u201cYou keep filling out the same forms every time. I made you a rubber stamp. Find it in the Purrmit Office.\u201d', kind: 'pochi' });
    }
    // "Training Montage to max, Sharper Pickaxe to 15…" (UI and NEW! ribbon)
    autoSummary(a) {
      return Object.keys(a.ids).map(id => {
        const u = NYA.UPG[id], cap = this.autoCap(a, id);
        return u.name + (u.max === 1 ? '' : cap >= u.max ? ' to max' : ' to ' + cap);
      }).join(', ');
    }
    // Runs once a second: research first (one at a time, in list order), then everything else cheapest-first.
    tickAutopilot() {
      if (!this.autoEarned()) return;
      const want = (a, id) => this.autoOn(a.id) && this.lvl(id) < this.autoCap(a, id) && this.upgVisible(NYA.UPG[id]);
      if (!this.s.research) {
        outer: for (const a of NYA.AUTOPILOT) for (const id in a.ids) if (NYA.UPG[id].timer && want(a, id) && this.buy(id, true)) break outer;
      }
      for (let n = 0; n < 200; n++) {
        let best = null, bc = Infinity;
        for (const a of NYA.AUTOPILOT) for (const id in a.ids) {
          if (NYA.UPG[id].timer || !want(a, id)) continue;
          const c = this.canBuy(id);
          if (c.ok && c.cost < bc) { bc = c.cost; best = id; }
        }
        if (!best || !this.buy(best, true)) break;
      }
    }
    // a finished pattern opens the next one (also checked on load, for saves that finished Pattern I before II existed)
    loomPatternNews() {
      if (this.loomComplete(1) && this.novel('loom:pattern2', 'Pattern I complete! Nyacolette casts on Pattern II: The Cable-Knit Cardigan', 'loom'))
        this.emit('toast', { text: 'Nyacolette: “Oh, you finished the sweater? Adorable. Now try a cardigan.”', kind: 'loom' });
      if (this.loomComplete(1) && !this.s.auto.n) this.earnAutopilot(); // the first autobuyer comes with Pattern II
      if (NYA.LOOM_PATTERNS[1] && this.loomComplete(2)) this.novel('loom:pattern3', 'Pattern II complete! Pattern III is still on the needles (coming soon)', 'loom');
    }
    loomBuy(id) {
      const n = NYA.LOOM_NODE[id];
      if (!n || !this.loomPatternOpen(n.pattern)) return false;
      const l = this.loom(id);
      if (n.max && l >= n.max) return false;
      const cost = NYA.loomCost(n, l);
      if (this.s.yarn < cost) return false;
      this.s.yarn -= cost;
      this.s.loom[id] = l + 1;
      this._faxBonus = null;
      const row0Was = [1, 2].map(p => this.loomRowDone(0, p) && !(NYA.LOOM_PATTERNS[p - 1].grid[0].some(n => n.id === id) && l === 0));
      this.applyHeadStarts();
      if (id === 'hs_cash' && l === 0) this.s.catnip += 300;
      if (id === 'h2_cash' && l === 0 && !this.s.ova) this.s.catnip += 1e6;
      for (const p of [1, 2]) if (!row0Was[p - 1] && this.loomRowDone(0, p) && !(p === 2 && this.s.ova)) { // Head Start Stripe's free recruit, right now too
        const cg = NYA.makeCatgirl(this.rng, { ep: this.s.episodeNum });
        if (this.s.active.length < this.crewCap()) { this.s.crew.push(cg); this.s.active.push(cg.id); }
        else if (this.s.reserve.length < this.reserveCap()) { this.s.crew.push(cg); this.s.reserve.push(cg.id); }
      }
      if (l === 0) this.novel('loom:' + id, 'Loom: ' + n.name, 'loom');
      for (const P of NYA.LOOM_PATTERNS) {
        const pre = P.n === 1 ? 'stripe:' : 'stripe' + P.n + ':';
        for (let r = 0; r < 5; r++) if (this.loomRowDone(r, P.n)) this.novel(pre + 'r' + r, P.rowStripes[r].name + '!', 'loom');
        for (let c = 0; c < 5; c++) if (this.loomColDone(c, P.n)) this.novel(pre + 'c' + c, P.colStripes[c].name + '!', 'loom');
      }
      this.loomPatternNews();
      this.emit('loom', { id });
      return true;
    }

    // ------------------------------------------------------------ Catterall & Special Blend
    catterallActive() { return (this.s.catterall || 0) > this.s.simTime; }
    blendAvailable() { const b = this.s.blend; return this.lvl('blend') > 0 && !(b && (b.active || this.s.simTime < (b.readyAt || 0))); }
    startBlend() {
      if (!this.blendAvailable()) return false;
      this.s.blend = { active: 1, until: this.s.simTime + NYA.BLEND_TIME, readyAt: this.s.simTime + NYA.BLEND_COOLDOWN, pot: 0, potYarn: 0, season: this.s.season, lineT: 0 };
      this.novel('blend', 'Tora’s Special Blend is brewing!', 'refinery');
      this.emit('blend', { phase: 'start', line: this.rng.pick(NYA.BLEND_LINES.start) });
      return true;
    }
    tickBlend(dt) {
      const b = this.s.blend;
      if (!b || !b.active) return;
      if (b.season !== undefined && b.season !== this.s.season) { b.active = 0; b.pot = 0; b.potYarn = 0; return; } // a pot left over from an earlier run (saves from before the fix)
      b.lineT += dt;
      if (b.lineT > 120) { b.lineT = 0; this.emit('blend', { phase: 'mid', pot: b.pot, line: this.rng.pick(NYA.BLEND_LINES.mid) }); }
      if (this.s.simTime >= b.until) {
        b.active = 0;
        const f = this.rng.weighted(NYA.BLEND_TABLE);
        const payout = b.pot * f;
        this.s.catnip += payout; this.s.seasonCatnip += payout; this.s.lifetimeCatnip += payout; this.s.life.catnip += payout;
        this.s.seasonYarnNip += (b.potYarn != null ? b.potYarn : b.pot) * f; // pot catnip from deep mines counts less toward yarn
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
      if (this.tanukiT <= 0) { this.tanukiT = 1; this.tickTanuki(); if (s.ova) this.checkOvaGoal(); this.tickAutopilot(); }
      if (this.episode && this.episode.catterall && !this.catterallActive()) this.episode.setCatterall(false);
      if (this.phase === 'shift' && this.episode) {
        if (this.loom('nm_drone') && !this.episode.fullClear) {
          const v2 = this.loom('nm_drone2');
          const v3 = this.loom('m2_drone3');
          this.episode.droneTick(dt, v3 ? 8 : v2 ? 5 : 2, v3 ? 1 : v2 ? 2 : 4);
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
