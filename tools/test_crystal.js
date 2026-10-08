#!/usr/bin/env node
// Crystal Catacombs check: the bot plays (unravelling on its own) until it first reaches Tier 7. From that same
// moment, runs N episodes each of: Tier 6, Tier 7 left alone, and Tier 7 with a player lasering crystal clusters
// near the crew (refraction), and reports catnip/s, sushi spent, swings for stone, crystals, cascades and refractions.
// Usage: node tools/test_crystal.js [seed] [episodes] [hours]. hours: keep playing that long after first reaching
// Tier 7 before measuring (0 = on arrival). Target: Tier 7 on arrival is a wall like the Sushi Grotto
// was (stone takes many swings); lasering crystals helps without being mandatory (active play is a bonus, not a tax).
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA, T = NYA.T;
const seed = process.argv[2] || '4', EPS = +(process.argv[3] || 6), LATER = +(process.argv[4] || 0);

// laser the biggest revealed crystal cluster closest to the crew, if it isn't marked yet
function laserCrystals(ep) {
  const M = ep.mine;
  if (ep.marks.some(k => k.refract != null || (M.crystal[k.idx] && M.type[k.idx] === T.ORE))) return;
  let best = -1, bd = 1e9;
  for (let i = 0; i < M.n; i++) {
    if (!M.crystal[i] || M.type[i] !== T.ORE || !M.revealed[i]) continue;
    let d = 1e9;
    for (const m of ep.miners) d = Math.min(d, Math.abs(m.x - M.x(i)) + Math.abs(m.y - M.y(i)));
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0) ep.addMark(best);
}

function measure(json, tier, laser) {
  const g = NYA.Game.deserialize(json, { headless: true });
  g.s.selectedTier = tier; g.s.catnip = 1e30; g.s.sushi = 1e9;
  const sum = { n: 0, t: 0, catnip: 0, fc: 0, crystals: 0, bestCascade: 0, refracts: 0, flops: 0 };
  g.on((type, d) => {
    if (type !== 'episodeEnd') return;
    const ep = g.episode;
    sum.n++; sum.t += d.duration + g.packUpTime(); sum.catnip += d.catnip;
    if (d.fullClear) sum.fc++;
    sum.crystals += ep.st.crystals || 0; sum.refracts += ep.st.refracts || 0;
    sum.bestCascade = Math.max(sum.bestCascade, ep.st.bestCascade || 0);
    sum.flops += d.crew.filter(c => c.flopped).length;
  });
  g.startEpisode();
  const crew = g.activeCrew(), ctx = { mineKey: NYA.TIERS[tier].key, tier, crew };
  const pw = crew.map(cg => NYA.buildStats(g, cg, ctx).power).sort((a, b) => a - b);
  sum.stone = NYA.BASE_HP[T.STONE] * NYA.tierHP(tier) / pw[pw.length >> 1];
  let guard = 0;
  while (sum.n < EPS && guard++ < 4e6) {
    if (laser && g.phase === 'shift' && g.episode && guard % 20 === 0) laserCrystals(g.episode);
    g.tick(NYA.TICK);
    if (g.phase === 'await') g.nextEpisode();
  }
  return sum;
}

const t0 = Date.now();
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
while (g.s.maxTierReached < 7 && g.s.simTime < 20 * 3600) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
if (g.s.maxTierReached < 7) { console.log('The bot never reached Tier 7 in 20 sim-hours.'); process.exit(1); }
console.log(`Tier 7 reached at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
const until = g.s.simTime + LATER * 3600;
while ((g.s.simTime < until || g.s.ova) && g.s.simTime < until + 7200) { bot.tick(NYA.TICK); g.tick(NYA.TICK); } // not inside an OVA
if (LATER) console.log(`Measured at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
console.log(`crew ${g.activeCrew().length}, Tuning Forks ${g.lvl('fork')}`);
const json = g.serialize();
const row = (label, r) => console.log(`${label.padEnd(20)} ${(r.catnip / r.t).toExponential(2)} nip/s  FC ${r.fc}/${r.n}  ${(r.t / r.n).toFixed(0)} s/ep  stone ${r.stone.toFixed(1)} swings` +
  (r.crystals ? `  crystals ${(r.crystals / r.n).toFixed(1)}/ep  best cascade ${r.bestCascade}  refractions ${(r.refracts / r.n).toFixed(1)}/ep` : '') + `  flops ${r.flops}`);
const t6 = measure(json, 6, false), t7 = measure(json, 7, false), t7l = measure(json, 7, true);
row('Tier 6', t6);
row('Tier 7, left alone', t7);
row('Tier 7, lasering', t7l);
console.log(`T7/T6 catnip per second: alone ${(t7.catnip / t7.t / (t6.catnip / t6.t)).toFixed(2)}, lasering ${(t7l.catnip / t7l.t / (t6.catnip / t6.t)).toFixed(2)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
