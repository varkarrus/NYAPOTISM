// A scripted "player" for the balance harness (GDD §25 "Balance harness").
// mode 'active' lasers, casts actives and shops constantly; 'idle' only checks in
// every few minutes and relies on standing orders.
(function (NYA) {
  'use strict';
  const T = NYA.T;

  const WEIGHTS = {
    refinery: 3.2, pick: 2.2, snacks: 2.0, bunk: 2.6, bags: 1.1, boots: 1.0, grip: 1.6, drills: 0.9, focus: 1.3,
    grit: 1.4, claws: 0.8, blunt: 6, spray: 3, batteries: 0.9, bomb: 6, bombdmg: 0.7, tuna: 5, sonar: 3, treat: 3, catterall: 4, blend: 3,
    hotbox: 5, pouch: 0.9, mine2: 25, mine3: 25, montage: 2.6, perfection: 1.3, radar: 0.5, headlamp: 0.6,
    enrich: 1.3, mine4: 25, junctions: 1.2, milkbath: 3, pistons: 2, cream: 1.5, calcium: 1.5, polisher: 2.2, centrifuge: 1.0, resonance: 1.0, resume: 0.15, lockers: 0.2, mewclear: 0.45, cabinet: 0.6,
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
          if (ty !== T.ORE && ty !== T.BOX) continue;
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

    chooseTier() {
      const g = this.g, s = g.s;
      const un = Object.keys(s.tierUnlocked).map(Number).sort((a, b) => a - b);
      const top = un[un.length - 1];
      let pick = top;
      // milestone grinding
      if (!s.tierUnlocked[2] && g.lvl('mine2') === 0 && g.fc(1) < 3) pick = 1;
      else if (s.tierUnlocked[2] && !s.tierUnlocked[3] && g.fc(2) < 5) {
        const ts = this.tierStats[2];
        pick = 2;
        // if tier 2 full clears are hopeless right now, farm tier 1 for upgrades
        if (ts && ts.recent.length >= 4 && ts.recent.every(r => !r.fc) && (this.tierStats[1] || {}).n) pick = (this.flip = !this.flip) ? 2 : 1;
      } else if (top >= 3 && !s.skein.have) pick = 3;
      else {
        let bestCps = -1;
        for (const t of un) {
          const ts = this.tierStats[t];
          if (!ts || ts.recent.length < 2) { if (t === top) { pick = t; bestCps = 1e99; } continue; }
          const cps = ts.recent.reduce((a, r) => a + r.cps, 0) / ts.recent.length;
          if (cps > bestCps) { bestCps = cps; pick = t; }
        }
      }
      if (g.s.catnip < g.purrmitCost(pick) * 2 && pick > 1) pick = Math.max(1, pick - 1);
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
      for (const cur of ['catnip', 'milk']) for (let k = 0; k < 20; k++) {
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
          if (u.id === 'cabinet' && g.runningOrders().length >= s.orders.length) w = 0.05;
          const cost = g.upgCost(u.id);
          const score = w / cost;
          if (score > bestScore) { bestScore = score; best = u; }
        }
        if (!best) break;
        if (!g.buy(best.id)) break;
      }
      // prestige decision
      if (s.skein.have && this.unravelAt !== 'never') {
        const since = s.seasonTime - (s.skein.foundAt || 0);
        const y = g.yarnPreview();
        const ypm = y / (s.seasonTime / 60);
        this.ypmPeak = Math.max(this.ypmPeak || 0, ypm);
        if (y >= 1 && (since > 25 * 60 || (since > 5 * 60 && ypm < this.ypmPeak * 0.92))) { this.ypmPeak = 0; g.unravel(); }
      }
    }
  }
  NYA.Bot = Bot;
})(globalThis.NYA = globalThis.NYA || {});
