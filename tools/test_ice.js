#!/usr/bin/env node
// Purrmafrost Caverns check: the bot plays (unravelling on its own) until it first reaches Tier 9. From that same
// moment, runs N episodes each of Tier 8 and Tier 9, and reports catnip/s, swings for stone, perfect clears, and per
// shift the slides, the longest slide and Rescue Claw trips (catgirls who slid somewhere with no way back).
// Usage: node tools/test_ice.js [seed] [episodes] [hours]. hours: keep playing that long after first reaching Tier 9
// before measuring (0 = on arrival). Target: Tier 9 on arrival is a wall like the mines before it; once workable it
// clears, with the claw busy but not constantly.
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/greebles.js','sim/ice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA, T = NYA.T;
const seed = process.argv[2] || '4', EPS = +(process.argv[3] || 6), LATER = +(process.argv[4] || 0);

function measure(json, tier) {
  const g = NYA.Game.deserialize(json, { headless: true });
  g.s.selectedTier = tier; g.s.tierUnlocked[tier] = 1; g.s.catnip = 1e30; g.s.sushi = 1e9; // a later run may not have re-surveyed it yet
  const sum = { n: 0, t: 0, catnip: 0, fc: 0, slides: 0, long: 0, rescues: 0, flops: 0 };
  g.on((type, d) => {
    if (type !== 'episodeEnd') return;
    const ep = g.episode;
    sum.n++; sum.t += d.duration + g.packUpTime(); sum.catnip += d.catnip;
    if (d.fullClear) sum.fc++;
    sum.slides += ep.st.slides || 0; sum.long = Math.max(sum.long, ep.st.longSlide || 0); sum.rescues += ep.st.rescues || 0;
    sum.flops += d.crew.filter(c => c.flopped).length;
  });
  g.startEpisode();
  const crew = g.activeCrew(), ctx = { mineKey: NYA.TIERS[tier].key, tier, crew };
  const pw = crew.map(cg => NYA.buildStats(g, cg, ctx).power).sort((a, b) => a - b);
  sum.stone = NYA.BASE_HP[T.STONE] * NYA.tierHP(tier) / pw[pw.length >> 1];
  let guard = 0;
  while (sum.n < EPS && guard++ < 4e6) {
    g.tick(NYA.TICK);
    if (g.phase === 'await') g.nextEpisode();
  }
  return sum;
}

const t0 = Date.now();
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
while (g.s.maxTierReached < 9 && g.s.simTime < 24 * 3600) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
if (g.s.maxTierReached < 9) { console.log('The bot never reached Tier 9 in 24 sim-hours.'); process.exit(1); }
console.log(`Tier 9 reached at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
const until = g.s.simTime + LATER * 3600;
while ((g.s.simTime < until || g.s.ova) && g.s.simTime < until + 7200) { bot.tick(NYA.TICK); g.tick(NYA.TICK); } // not inside an OVA
if (LATER) console.log(`Measured at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
console.log(`crew ${g.activeCrew().length}, Thermal Undies ${g.lvl('thermals')}, MEWCLEAR stage ${g.lvl('mewclear')}`);
const json = g.serialize();
const row = (label, r) => console.log(`${label.padEnd(20)} ${(r.catnip / r.t).toExponential(2)} nip/s  FC ${r.fc}/${r.n}  ${(r.t / r.n).toFixed(0)} s/ep  stone ${r.stone.toFixed(1)} swings` +
  (r.slides ? `  slides ${(r.slides / r.n).toFixed(0)}/ep (longest ${r.long} tiles)  rescues ${(r.rescues / r.n).toFixed(1)}/ep` : '') + `  flops ${r.flops}`);
const t8 = measure(json, 8), t9 = measure(json, 9);
row('Tier 8', t8);
row('Tier 9', t9);
console.log(`T9/T8 catnip per second: ${(t9.catnip / t9.t / (t8.catnip / t8.t)).toFixed(2)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
