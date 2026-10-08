#!/usr/bin/env node
// Greeble Crash Site check: the bot plays (unravelling on its own) until it first reaches Tier 8. From that same
// moment, runs N episodes each of: Tier 7, Tier 8 left alone, and Tier 8 with a player lasering the nearest greeble
// (the crew gangs up on it), and reports catnip/s, swings for stone, and greebles seen / caught / got away per shift.
// Usage: node tools/test_greebles.js [seed] [episodes] [hours]. hours: keep playing that long after first reaching
// Tier 8 before measuring (0 = on arrival). Target: Tier 8 on arrival is a wall like the mines before it; a crew
// catches a few greebles a shift on its own, and lasering helps without being mandatory.
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/greebles.js','sim/ice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA, T = NYA.T;
const seed = process.argv[2] || '4', EPS = +(process.argv[3] || 6), LATER = +(process.argv[4] || 0);

// laser the awake greeble closest to the crew, unless one is still lasered
function laserGreeble(ep) {
  const M = ep.mine;
  if (ep.greebles.some(gr => gr.marked > ep.t)) return;
  let best = null, bd = 1e9;
  for (const gr of ep.greebles) {
    if (!gr.awake || !M.revealed[gr.tile]) continue;
    let d = 1e9;
    for (const m of ep.miners) d = Math.min(d, Math.abs(m.x - gr.x) + Math.abs(m.y - gr.y));
    if (d < bd) { bd = d; best = gr; }
  }
  if (best) ep.addMark(best.tile);
}

function measure(json, tier, laser) {
  const g = NYA.Game.deserialize(json, { headless: true });
  g.s.selectedTier = tier; g.s.tierUnlocked[tier] = 1; g.s.catnip = 1e30; g.s.sushi = 1e9; // a later run may not have re-surveyed it yet
  const sum = { n: 0, t: 0, catnip: 0, fc: 0, seen: 0, caught: 0, missed: 0, left: 0, flops: 0 };
  g.on((type, d) => {
    if (type !== 'episodeEnd') return;
    const ep = g.episode;
    sum.n++; sum.t += d.duration + g.packUpTime(); sum.catnip += d.catnip;
    if (d.fullClear) sum.fc++;
    sum.seen += ep.st.greeblesSeen || 0; sum.caught += d.greebles || 0; sum.missed += ep.st.greebleMiss || 0; sum.left += ep.st.greeblesLeft || 0;
    sum.flops += d.crew.filter(c => c.flopped).length;
  });
  g.startEpisode();
  const crew = g.activeCrew(), ctx = { mineKey: NYA.TIERS[tier].key, tier, crew };
  const pw = crew.map(cg => NYA.buildStats(g, cg, ctx).power).sort((a, b) => a - b);
  sum.stone = NYA.BASE_HP[T.STONE] * NYA.tierHP(tier) / pw[pw.length >> 1];
  let guard = 0;
  while (sum.n < EPS && guard++ < 4e6) {
    if (laser && g.phase === 'shift' && g.episode && guard % 20 === 0) laserGreeble(g.episode);
    g.tick(NYA.TICK);
    if (g.phase === 'await') g.nextEpisode();
  }
  return sum;
}

const t0 = Date.now();
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
while (g.s.maxTierReached < 8 && g.s.simTime < 20 * 3600) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
if (g.s.maxTierReached < 8) { console.log('The bot never reached Tier 8 in 20 sim-hours.'); process.exit(1); }
console.log(`Tier 8 reached at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
const until = g.s.simTime + LATER * 3600;
while ((g.s.simTime < until || g.s.ova) && g.s.simTime < until + 7200) { bot.tick(NYA.TICK); g.tick(NYA.TICK); } // not inside an OVA
if (LATER) console.log(`Measured at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season})`);
console.log(`crew ${g.activeCrew().length}, Greeble Treats ${g.lvl('treats')}, MEWCLEAR stage ${g.lvl('mewclear')}`);
const json = g.serialize();
const row = (label, r) => console.log(`${label.padEnd(20)} ${(r.catnip / r.t).toExponential(2)} nip/s  FC ${r.fc}/${r.n}  ${(r.t / r.n).toFixed(0)} s/ep  stone ${r.stone.toFixed(1)} swings` +
  (r.seen ? `  greebles seen ${(r.seen / r.n).toFixed(1)} caught ${(r.caught / r.n).toFixed(1)} beamed away ${(r.left / r.n).toFixed(1)} /ep (chases given up ${(r.missed / r.n).toFixed(1)})` : '') + `  flops ${r.flops}`);
const t7 = measure(json, 7, false), t8 = measure(json, 8, false), t8l = measure(json, 8, true);
row('Tier 7', t7);
row('Tier 8, left alone', t8);
row('Tier 8, lasering', t8l);
console.log(`T8/T7 catnip per second: alone ${(t8.catnip / t8.t / (t7.catnip / t7.t)).toFixed(2)}, lasering ${(t8l.catnip / t8l.t / (t7.catnip / t7.t)).toFixed(2)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
