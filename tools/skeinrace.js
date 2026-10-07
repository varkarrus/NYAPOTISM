#!/usr/bin/env node
// When does the bot find the Skein vs. buy the Tier 4 survey? The Skein should usually come first.
// Usage: node tools/skeinrace.js [seeds=8]
'use strict';
const path = require('path');
const root = path.join(__dirname, '..', 'js') + '/';
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js', 'sim/game.js', 'sim/bot.js']) require(root + f);
const NYA = globalThis.NYA;
const n = +(process.argv[2] || 8);
let first = 0;
for (let k = 1; k <= n; k++) {
  const g = new NYA.Game({ headless: true, seed: 'harness-' + k });
  const bot = new NYA.Bot(g, { mode: 'active', unravel: 'never' });
  g.newGame();
  let skein = null, t4 = null, fc10 = null;
  while (g.s.simTime < 180 * 60 && (skein === null || t4 === null)) {
    bot.tick(NYA.TICK); g.tick(NYA.TICK);
    const m = g.s.simTime / 60;
    if (skein === null && g.s.skein.have) skein = m;
    if (fc10 === null && g.fc(3) >= 10) fc10 = m;
    if (t4 === null && g.lvl('mine4')) t4 = m;
  }
  if (skein !== null && (t4 === null || skein < t4)) first++;
  const f = v => v === null ? '  —  ' : v.toFixed(0).padStart(4) + 'm';
  console.log(`seed ${k}: Skein ${f(skein)} · 10 T3 clears ${f(fc10)} · T4 survey bought ${f(t4)}`);
}
console.log(`Skein first in ${first}/${n}`);
