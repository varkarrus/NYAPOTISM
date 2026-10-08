#!/usr/bin/env node
// Episode diagnostics: where does miner time go? Runs the harness bot and samples miner states.
'use strict';
const path = require('path');
const root = path.join(__dirname, '..', 'js');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js','sim/greebles.js','sim/ice.js', 'sim/game.js', 'sim/bot.js']) require(path.join(root, f));
const NYA = globalThis.NYA;
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const minutes = +arg('minutes', 30);
const g = new NYA.Game({ headless: true, seed: 'diag-' + arg('seed', '1') });
const bot = new NYA.Bot(g, { mode: arg('mode', 'active'), unravel: 'never' });
const rows = [];
let acc = null;
g.on((type, d) => {
  if (type === 'episodeStart') acc = { tier: d.tier, crew: d.ep.miners.length, states: {} };
  if (type === 'episodeEnd' && acc) {
    acc.dur = d.duration; acc.fc = d.fullClear; acc.catnip = d.catnip; acc.ext = d.extraction; acc.ep = d.ep;
    acc.swings = g.episode.st.swings; acc.tiles = g.episode.st.tiles;
    rows.push(acc);
  }
});
g.newGame();
while (g.s.simTime < minutes * 60) {
  bot.tick(NYA.TICK);
  if (g.phase === 'shift' && g.episode && acc) for (const m of g.episode.miners) acc.states[m.state] = (acc.states[m.state] || 0) + NYA.TICK;
  g.tick(NYA.TICK);
}
const keys = ['mine', 'walk', 'return', 'drop', 'distract', 'wait', 'idle', 'flop', 'out', 'smoke', 'nap', 'hotbox'];
console.log('ep  T crew  dur   FC  ext  swings tiles catnip   | ' + keys.map(k => k.padStart(6)).join(''));
for (const r of rows) {
  const tot = Object.values(r.states).reduce((a, b) => a + b, 0);
  console.log(`${String(r.ep).padStart(3)} ${r.tier} ${String(r.crew).padStart(4)} ${r.dur.toFixed(0).padStart(4)}s ${r.fc ? 'Y' : '-'}  ${(r.ext * 100).toFixed(0).padStart(3)}% ${String(r.swings).padStart(6)} ${String(r.tiles).padStart(5)} ${NYA.fmt(r.catnip).padStart(7)} | ` +
    keys.map(k => ((100 * (r.states[k] || 0) / tot).toFixed(0) + '%').padStart(6)).join(''));
}
