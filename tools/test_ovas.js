#!/usr/bin/env node
// OVA check: the bot plays to Season 5, then clears every OVA release in order and reports how long each
// took (sim minutes), and that the run set aside when the tape started comes back unchanged afterwards (same
// season, catnip, upgrades and crew; no yarn). Between OVAs it plays normal runs (unravelling) until the next
// tape or release arrives (NYA.ovaSeason).
// Usage: node tools/test_ovas.js [seed=1] [capMinutes=180]
'use strict';
const path = require('path');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js','sim/greebles.js', 'sim/game.js', 'sim/bot.js']) require(path.join(__dirname, '..', 'js', f));
const NYA = globalThis.NYA;
const seed = process.argv[2] || '1', cap = +(process.argv[3] || 180) * 60;
const g = new NYA.Game({ headless: true, seed: 'ova-' + seed });
let bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
while (g.s.season < NYA.OVA_UNLOCK_SEASON && g.s.simTime < 10 * 3600) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
console.log(`Season ${g.s.season} at ${(g.s.simTime / 60).toFixed(0)} min, yarn ${NYA.fmt(g.s.yarn)}; shelf open: ${g.ovaShelfOpen()}`);
bot = new NYA.Bot(g, { mode: 'active', unravel: 'never' });
const runUntil = (pred, limit) => { const t0 = g.s.simTime; while (!pred() && g.s.simTime - t0 < limit) { bot.tick(NYA.TICK); g.tick(NYA.TICK); } return (g.s.simTime - t0) / 60; };
for (const o of NYA.OVAS) {
  for (let rel = 0; rel < 3; rel++) {
    // play normal runs (unravelling as usual) until this release is out, then play some of the run before the tape
    bot.unravelAt = 'auto';
    runUntil(() => g.ovaReleaseReady(o.id), 12 * 3600);
    bot.unravelAt = 'never';
    runUntil(() => false, 5 * 60);
    if (!g.ovaReleaseReady(o.id)) { console.log(`  ${o.name}: never got to start ${NYA.OVA_RELEASES[rel]} (season ${g.s.season})`); break; }
    const ep = g.phase === 'shift' && g.episode && !g.episode.ended ? g.episode : null;
    const before = { season: g.s.season, yarn: g.s.yarn, catnip: g.s.catnip + (ep && !ep.eventKey && (ep.cfg.purrmitCur || 'catnip') === 'catnip' ? ep.cfg.purrmit : 0), upg: JSON.stringify(g.s.upg),
      crew: JSON.stringify(g.s.crew.map(c => [c.id, c.level, c.xp])), tiers: JSON.stringify(g.s.tierUnlocked) };
    if (!g.startOva(o.id)) { console.log(`  ${o.name} ${NYA.OVA_RELEASES[rel]}: could not start (unlocked: ${g.ovaUnlocked(o.id)})`); break; }
    const goal = g.ovaGoal();
    const mins = runUntil(() => !g.s.ova, cap);
    const cleared = !g.s.ova;
    // the resumed run starts a shift on the same tick, so add that shift's purrmit back before comparing
    const ep2 = g.phase === 'shift' && g.episode ? g.episode : null;
    const after = { season: g.s.season, yarn: g.s.yarn, catnip: g.s.catnip + (ep2 && !ep2.eventKey && (ep2.cfg.purrmitCur || 'catnip') === 'catnip' ? ep2.cfg.purrmit : 0), upg: JSON.stringify(g.s.upg),
      crew: JSON.stringify(g.s.crew.map(c => [c.id, c.level, c.xp])), tiers: JSON.stringify(g.s.tierUnlocked) };
    const diff = Object.keys(before).filter(k => k === 'catnip' ? Math.abs(after.catnip - before.catnip) > 1e-9 * before.catnip + 1e-6 : after[k] !== before[k]);
    const back = cleared && !diff.length;
    const prog = cleared ? '' : ` (at ${NYA.fmt(goal.cur(g))}/${NYA.fmt(goal.need)}, tier ${g.s.maxTierReached}, crew ${g.s.crew.length}, T3 clears ${g.fc(3)}, T4 survey: ${g.lvl('mine4') ? 'bought' : g.canBuy('mine4').why}, selected T${g.s.selectedTier})`;
    console.log(`  S${String(g.s.season).padEnd(3)} ${(g.s.simTime / 3600).toFixed(1)}h ${o.icon} ${o.name.padEnd(14)} ${NYA.OVA_RELEASES[rel].padEnd(15)} ${goal.text.padEnd(46)} ${cleared ? 'CLEARED in ' + mins.toFixed(0) + ' min' : 'not cleared after ' + mins.toFixed(0) + ' min' + prog}` +
      `  (perk ${g.ovaPerk(o.id)}${cleared ? ', run resumed ' + (back ? 'intact' : 'CHANGED: ' + diff.map(k => k + ' ' + (k === 'catnip' ? NYA.fmt(before[k]) + '→' + NYA.fmt(after[k]) : '')).join(', ')) : ''})`);
    if (!cleared) { g.abandonOva(); break; }
  }
}
