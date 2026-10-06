#!/usr/bin/env node
// OVA check: the bot plays to Season 5, then clears every OVA release in order and reports how long each
// took (sim minutes) and that clearing drops you into a normal run with no yarn gained.
// Usage: node tools/test_ovas.js [seed=1] [capMinutes=180]
'use strict';
const path = require('path');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/game.js', 'sim/bot.js']) require(path.join(__dirname, '..', 'js', f));
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
    // get back into position to start one: find the Skein in a normal run
    runUntil(() => g.s.skein.have, cap);
    if (!g.s.skein.have) { console.log(`  ${o.name}: couldn't find the Skein to start ${NYA.OVA_RELEASES[rel]}`); break; }
    const yarn0 = g.s.yarn;
    if (!g.startOva(o.id)) { console.log(`  ${o.name} ${NYA.OVA_RELEASES[rel]}: could not start (unlocked: ${g.ovaUnlocked(o.id)})`); break; }
    const yarnIn = g.s.yarn - yarn0;
    const goal = g.ovaGoal();
    const mins = runUntil(() => !g.s.ova, cap);
    const cleared = !g.s.ova;
    const prog = cleared ? '' : ` (at ${NYA.fmt(goal.cur(g))}/${NYA.fmt(goal.need)}, tier ${g.s.maxTierReached}, crew ${g.s.crew.length}, T3 clears ${g.fc(3)}, T4 survey: ${g.lvl('mine4') ? 'bought' : g.canBuy('mine4').why}, selected T${g.s.selectedTier})`;
    console.log(`  ${o.icon} ${o.name.padEnd(14)} ${NYA.OVA_RELEASES[rel].padEnd(15)} ${goal.text.padEnd(46)} ${cleared ? 'CLEARED in ' + mins.toFixed(0) + ' min' : 'not cleared after ' + mins.toFixed(0) + ' min' + prog}` +
      `  (yarn on entry +${NYA.fmt(yarnIn)}, perk ${g.ovaPerk(o.id)})`);
    if (!cleared) { g.abandonOva(); break; }
  }
}
