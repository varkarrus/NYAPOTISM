#!/usr/bin/env node
// Stay-vs-jump check: at each tier unlock, compare catnip/sec over 6 episodes in the old tier vs the new one.
// Usage: node tools/tierjump.js [seed]. Target: net ratio ~1-2 (a new mine should wait on Power/Grit upgrades).
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA;
const seed = process.argv[2] || '1';
// At the moment the bot first unlocks tier t, compare catnip/sec over 6 episodes: stay in t-1 vs jump to t.
function measure(json, tier, eps) {
  const g = NYA.Game.deserialize(json, { headless: true });
  g.s.selectedTier = tier; g.s.catnip = 1e15; // purrmit irrelevant here
  const c0 = g.s.seasonCatnip || 0; let t = 0, fc = 0, n = 0, earned = 0;
  g.on((type, d) => { if (type === 'episodeEnd') { n++; earned += d.catnip; t += d.duration + g.packUpTime(); if (d.fullClear) fc++; } });
  g.startEpisode();
  let guard = 0;
  while (n < eps && guard++ < 2e6) { g.tick(NYA.TICK); if (g.phase === 'await') g.nextEpisode(); }
  return { cps: (earned - n * g.purrmitCost(tier)) / t, gross: earned / t, fc: fc + '/' + n };
}
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'never' });
g.newGame();
let seen = 1;
while (g.s.simTime < 150 * 60) {
  bot.tick(NYA.TICK); g.tick(NYA.TICK);
  const top = Math.max(...Object.keys(g.s.tierUnlocked).map(Number));
  if (top > seen) {
    seen = top;
    const js = g.serialize();
    const a = measure(js, top - 1, 6), b = measure(js, top, 6);
    console.log(`seed ${seed} @${(g.s.simTime/60).toFixed(0)}min unlock T${top}: stay T${top-1} ${a.cps.toFixed(1)}/s FC ${a.fc} (gross ${a.gross.toFixed(1)}) | jump T${top} ${b.cps.toFixed(1)}/s FC ${b.fc} (gross ${b.gross.toFixed(1)}) | net ratio ${(b.cps/a.cps).toFixed(2)}`);
  }
}
