// A scripted "player" for the balance harness (GDD §25 "Balance harness").
// mode 'active' lasers, casts actives and shops constantly; 'idle' only checks in
// every few minutes and relies on standing orders.
(function (NYA) {
  'use strict';
  const T = NYA.T;

  const WEIGHTS = {
    refinery: 3.2, pick: 2.2, snacks: 2.0, bunk: 12, bags: 1.1, boots: 1.0, grip: 1.6, drills: 0.9, focus: 1.3,
    grit: 1.4, claws: 0.8, blunt: 6, spray: 3, batteries: 0.9, bomb: 6, bombdmg: 0.7, tuna: 5, sonar: 3, treat: 3, catterall: 4, blend: 3,
    hotbox: 5, pouch: 0.9, mine2: 25, mine3: 25, montage: 2.6, perfection: 1.3, radar: 0.5, headlamp: 0.6,
    enrich: 1.3, mine4: 25, mine5: 25, mine6: 25, mine7: 25, mine8: 25, mine9: 25, thermals: 1.5, fork: 1.5, salvage: 3, treats: 1.5, coproc: 0.6, wetsuit: 2.5, drain: 1.2, wasabi: 2, otoro: 3, gouda: 3, cannons: 3, caliber: 1.5, combat: 1.5, chan: 1, junctions: 1.2, milkbath: 3, pistons: 2, cream: 1.5, calcium: 1.5, polisher: 2.2, centrifuge: 1.0, resonance: 1.0, resume: 0.15, lockers: 0.2, mewclear: 0.45, cabinet: 0.6,
  };

  class Bot {
    constructor(game, opts) {
      this.g = game;
      this.mode = (opts && opts.mode) || 'active';
      if (this.mode === 'shopper') { this.mode = 'active'; this.noPlay = true; }
      this.t = 0; this.shopT = 0; this.tierStats = {};
      this.lastEpNum = -1;
      this.unravelAt = (opts && opts.unravel) || 'auto';
      this.log = [];
      game.on((type, d) => {
        if (type === 'unravel' || type === 'ova') this.tierStats = {}; // a new (or resumed) run: old per-tier earnings are from another crew
        if (type === 'episodeEnd') {
          const ts = this.tierStats[d.tier] || (this.tierStats[d.tier] = { n: 0, dur: 0, catnip: 0, fc: 0, recent: [] });
          ts.n++; ts.dur += d.duration; ts.catnip += d.catnip; if (d.fullClear) ts.fc++;
          ts.recent.push({ cps: d.catnip / (d.duration + this.g.packUpTime()), fc: d.fullClear, dur: d.duration });
          if (ts.recent.length > 6) ts.recent.shift();
          this.chooseTier();
        }
      });
    }

    tick(dt) {
      const g = this.g;
      this.t += dt;
      if (g.phase === 'await' && this.mode === 'active') g.nextEpisode();
      this.shopT -= dt;
      const shopEvery = this.mode === 'active' ? 2 : 90;
      if (this.shopT <= 0) { this.shopT = shopEvery; this.shop(); }
      if (this.mode === 'active' && !this.noPlay && g.phase === 'shift' && g.episode && !g.episode.ended) {
        this.actT = (this.actT || 0) - dt;
        if (this.actT <= 0) { this.actT = 0.5; this.play(); }
      }
    }

    play() {
      const g = this.g, ep = g.episode, M = ep.mine;
      // laser: keep marks on the best visible ore
      const playerMarks = ep.marks.filter(k => !k.drone).length;
      if (playerMarks < g.laserMax() && !ep.fullClear) {
        let best = -1, bv = -1e9;
        for (let i = 0; i < M.n; i++) {
          if (!M.revealed[i] || ep.isMarked(i)) continue;
          const ty = M.type[i];
          if (ty !== T.ORE && ty !== T.BOX && ty !== T.NEST) continue;
          let d = 30;
          for (const nb of M.nbrs(i)) if (ep.homeDist[nb] >= 0) d = Math.min(d, ep.homeDist[nb]);
          const v = (ty === T.ORE ? (M.dens[i] - M.dropped[i]) * M.q[i] : 8) - d * 0.15;
          if (v > bv) { bv = v; best = i; }
        }
        if (best < 0 && ep.frontier.length) {
          // nothing visible: point into the fog
          for (const i of ep.frontier) { let fog = 0; for (const nb of M.nbrs(i)) if (!M.revealed[nb]) fog++; if (fog > bv) { bv = fog; best = i; } }
        }
        if (best >= 0) g.laser(best);
      }
      // turrets go next to the nests as they're uncovered (what Turret-chan does once fully trained)
      if (ep.miceOn) { while (ep.turrets.length < ep.maxTurrets && ep.autoTurret(2, 'bot')); ep.relocateTurret('bot', 2); }
      if (ep.resLeft > 0 && g.canUseActive('blunt')) {
        const m = ep.miners.find(mm => mm.state === 'flop' || (mm.state === 'out' && mm.flopped));
        if (m) g.useActive('blunt', m.id);
      }
      if (g.canUseActive('tuna') && ep.miners.filter(m => m.state === 'mine').length >= Math.ceil(ep.miners.length * 0.6)) g.useActive('tuna');
      if (g.canUseActive('bomb')) { const tg = g.bestBombTarget(ep); if (tg >= 0) g.useActive('bomb', tg); }
      if (g.canUseActive('sonar')) { const tg = g.bestSonarTarget(ep); if (tg >= 0) g.useActive('sonar', tg); }
      if (g.canUseActive('treat')) g.useActive('treat');
      if (g.canUseActive('catterall') && ep.resLeft > ep.mine.n * 0.05) g.useActive('catterall');
      if (g.canUseActive('hotbox') && ep.resLeft > 0) {
        const low = ep.miners.filter(m => m.stamina < 0.2 * m.maxSt).length;
        if (low >= Math.ceil(ep.miners.length / 2)) { const tg = g.bestHotboxTarget(ep); if (tg >= 0) g.useActive('hotbox', tg); }
      }
    }

    sushiReserve() {
      const g = this.g;
      let r = 0;
      for (const t in g.s.tierUnlocked) if (g.s.tierUnlocked[t] && g.purrmitCur(+t) === 'sushi') r = Math.max(r, 2 * g.purrmitCost(+t));
      return r;
    }

    chooseTier() {
      const g = this.g, s = g.s;
      const un = Object.keys(s.tierUnlocked).map(Number).sort((a, b) => a - b);
      const top = un[un.length - 1];
      let pick = top;
      // milestone grinding
      // (perfect clears a survey still asks for: read from the survey itself)
      const fcNeeded = n => g.lvl('mine' + n) === 0 && !!(NYA.UPG['mine' + n] && NYA.UPG['mine' + n].req(g));
      if (!s.tierUnlocked[2] && fcNeeded(2)) pick = 1;
      else if (s.tierUnlocked[2] && !s.tierUnlocked[3] && fcNeeded(3)) {
        const ts = this.tierStats[2];
        pick = 2;
        // if tier 2 full clears are hopeless right now, farm tier 1 for upgrades
        if (ts && ts.recent.length >= 4 && ts.recent.every(r => !r.fc) && (this.tierStats[1] || {}).n) pick = (this.flip = !this.flip) ? 2 : 1;
      } else if (top >= 3 && !s.skein.have && !s.ova) pick = 3; // hunt the box (never spawns in an OVA)
      else {
        let bestCps = -1;
        for (const t of un) {
          const ts = this.tierStats[t];
          if (!ts || ts.recent.length < 2) { if (t === top) { pick = t; bestCps = 1e99; } continue; }
          const cps = ts.recent.reduce((a, r) => a + r.cps, 0) / ts.recent.length;
          if (cps > bestCps) { bestCps = cps; pick = t; }
        }
      }
      // the Mousehole Maze pays less catnip but is the only source of cheese: go back every other episode
      // while a cheese upgrade is out of reach
      if (s.tierUnlocked[6] && pick !== 6 && !s.ova && NYA.UPGRADES.some(u => u.cur === 'cheese' && g.upgVisible(u) && g.canBuy(u.id).poor)) {
        this.cheeseFlip = !this.cheeseFlip;
        if (this.cheeseFlip) pick = 6;
      }
      // ...and the Greeble Crash Site is the only source of greebles: same deal, once it's paying its way
      const avg = t => { const ts = this.tierStats[t]; return ts && ts.recent.length >= 2 ? ts.recent.reduce((a, r) => a + r.cps, 0) / ts.recent.length : 0; };
      if (s.tierUnlocked[8] && pick !== 8 && !s.ova && avg(8) >= 0.25 * avg(pick) && NYA.UPGRADES.some(u => u.cur === 'greebles' && g.upgVisible(u) && g.canBuy(u.id).poor)) {
        this.greebleFlip = !this.greebleFlip;
        if (this.greebleFlip) pick = 8;
      }
      // in an OVA, go where the goal is once it's open (a player chasing the goal would)
      const goal = g.ovaGoal && g.ovaGoal();
      if (goal && goal.tier && s.tierUnlocked[goal.tier]) pick = goal.tier;
      // sushi purrmits (Tiers 7+): go top up at the Sushi Grotto when running low
      if (g.purrmitCur(pick) === 'sushi' && s.sushi < g.purrmitCost(pick) * 1.5 && s.tierUnlocked[5]) pick = 5;
      if (g.purrmitCur(pick) === 'catnip' && g.s.catnip < g.purrmitCost(pick) * 2 && pick > 1) pick = Math.max(1, pick - 1);
      g.selectTier(pick);
    }

    shop() {
      const g = this.g, s = g.s;
      // standing orders
      if (s.buildings.pochi) {
        for (const id of ['repeat', 'cast_blunt', 'auto_hire', 'cast_bomb', 'cast_tuna', 'cast_hotbox', 'cast_sonar', 'tanuki_buy']) {
          if (s.orders.indexOf(id) < 0 && g.orderAvailable(id)) {
            if (this.mode === 'active' && !this.noPlay && id.startsWith('cast_')) continue;
            g.toggleOrder(id);
          }
        }
      }
      if (g.blendAvailable() && this.mode === 'active') g.startBlend();
      if (this.mode === 'active' && !this.noPlay) {
        const T = s.tanuki;
        if (T && T.offer && s.catnip >= T.offer.cost * 3) g.tanukiBuy();
        if (T && T.rain && s.catnip >= T.rain.cost * 3) g.tanukiBuy(true);
        if (T && T.queue.length && !s.pendingEvent && g.phase !== 'shift') g.queueEvent(0);
      }
      // hire into free active slots
      for (let k = 0; k < 3; k++) {
        if (s.active.length < g.crewCap() && s.catnip >= g.hireCost()) g.hire(); else break;
      }
      // loom
      if (s.yarn > 0) {
        let bought = true;
        while (bought) {
          bought = false;
          let best = null, bc = 1e99;
          for (const row of NYA.LOOM) for (const n of row) {
            const l = g.loom(n.id);
            if (n.max ? l >= n.max : l >= 1) continue;
            const c = NYA.loomCost(n, l);
            if (c < bc) { bc = c; best = n; }
          }
          if (best && s.yarn >= bc) bought = g.loomBuy(best.id);
        }
      }
      // upgrades: best weight/cost per currency; buy if affordable, else save for it
      for (const cur of ['catnip', 'milk', 'sushi', 'cheese', 'greebles']) for (let k = 0; k < 20; k++) {
        let best = null, bestScore = 0;
        for (const u of NYA.UPGRADES) {
          if ((u.cur || 'catnip') !== cur) continue;
          if (!s.buildings[u.bld] || !g.upgVisible(u)) continue;
          const c = g.canBuy(u.id);
          if (!c.ok && !c.poor) continue;
          let w = WEIGHTS[u.id] || 0.5;
          if (u.id === 'bunk' && s.active.length < g.crewCap()) w = 0.1;
          if (u.id === 'montage' && !g.activeCrew().some(cg => cg.level >= g.levelCap())) w = 0.3;
          if (u.id === 'grit' && s.maxTierReached < 2) w = 0.3;
          if ((u.id === 'cabinet' || u.id === 'coproc') && g.runningOrders().length >= s.orders.length) w = 0.05;
          const cost = g.upgCost(u.id);
          // an eager explorer saves up for the next mine's survey if it's within ~10 minutes of this run's income
          if (u.unlock && u.unlock.startsWith('mine:') && cost <= 600 * s.seasonCatnip / Math.max(60, s.seasonTime)) w = 1e9;
          const score = w / cost;
          if (score > bestScore) { bestScore = score; best = u; }
        }
        if (!best) break;
        // keep enough sushi for a couple of deep-mine purrmits (they're paid in sushi from Tier 7 on)
        if (cur === 'sushi' && s.sushi - g.upgCost(best.id) < this.sushiReserve()) break;
        if (!g.buy(best.id)) break;
      }
      // prestige decision
      // judged once per shift, right after it pays out: catnip lands at shift end, so between paydays a 3-minute
      // shift made the rate look like it was falling and the bot unravelled runs early for a handful of yarn
      if (s.skein.have && this.unravelAt !== 'never' && g.lastResult && g.lastResult !== this._judged) {
        this._judged = g.lastResult;
        const since = s.seasonTime - (s.skein.foundAt || 0);
        const y = g.yarnPreview();
        // rate from the unrounded yarn: whole-yarn steps made the rate "fall" between steps early in a fast run
        // and the bot unravelled for 1 yarn
        const ypm = Math.pow(s.seasonYarnNip / NYA.YARN_DIV, g.yarnExp()) * g.yarnMult() / (s.seasonTime / 60);
        this.ypmPeak = Math.max(this.ypmPeak || 0, ypm);
        // and never bail out for a fraction of last run's yarn (a dip on reaching a new mine made it unravel for 4 yarn)
        const last = s.seasonLog.filter(l => !l.ova).slice(-1)[0], enough = !last || y >= 0.5 * last.yarn;
        if (y >= 1 && (since > 25 * 60 || (since > 5 * 60 && enough && ypm < this.ypmPeak * 0.92))) { this.ypmPeak = 0; g.unravel(); }
      }
    }
  }
  NYA.Bot = Bot;
})(globalThis.NYA = globalThis.NYA || {});
