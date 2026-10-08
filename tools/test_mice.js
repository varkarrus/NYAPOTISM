#!/usr/bin/env node
// Mousehole Maze check: the bot plays (unravelling on its own) until it first reaches Tier 6. From that same
// moment, runs N episodes each of: Tier 5, Tier 6 with only Turret-chan placing turrets, and Tier 6 with
// smart turret placement (plus a no-turret baseline), and reports catnip/s, cheese, mice and bites.
// Usage: node tools/test_mice.js [seed] [episodes]. Target: Tier 6 pays less catnip/s than Tier 5 (GDD: it's
// the cheese mine), mice cost real stamina, and smart turrets beat Turret-chan without being mandatory.
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/greebles.js','sim/ice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA;
const seed = process.argv[2] || '4', EPS = +(process.argv[3] || 8);

function measure(json, tier, smart, noTurrets) {
  const g = NYA.Game.deserialize(json, { headless: true });
  g.s.selectedTier = tier; g.s.catnip = 1e30;
  if (noTurrets) { const mc = g.miceCfg.bind(g); g.miceCfg = () => Object.assign(mc(), { turretChan: false }); }
  const sum = { n: 0, t: 0, catnip: 0, cheese: 0, fc: 0, mice: 0, seen: 0, bites: 0, steals: 0, stolen: 0, nests: 0, nestsTotal: 0, shots: 0, flops: 0 };
  g.on((type, d) => {
    if (type !== 'episodeEnd') return;
    const ep = g.episode;
    sum.n++; sum.t += d.duration + g.packUpTime(); sum.catnip += d.catnip; sum.cheese += d.cheese || 0;
    if (d.fullClear) sum.fc++;
    for (const k of ['mice', 'bites', 'steals', 'stolen', 'nests', 'shots']) sum[k] += ep.st[k] || 0;
    sum.seen += ep.st.miceSeen || 0;
    sum.flops += d.crew.filter(c => c.flopped).length;
  });
  g.startEpisode();
  let guard = 0, n0 = -1;
  while (sum.n < EPS && guard++ < 4e6) {
    if (g.episode && sum.n !== n0) { n0 = sum.n; sum.nestsTotal += Object.keys(g.episode.nests).length; }
    if (smart && g.phase === 'shift' && g.episode && g.episode.miceOn && guard % 10 === 0) {
      const ep = g.episode;
      while (ep.turrets.length < ep.maxTurrets && ep.autoTurret(2, 'bot'));
      ep.relocateTurret('bot', 2);
    }
    g.tick(NYA.TICK);
    if (g.phase === 'await') g.nextEpisode();
  }
  return sum;
}

const t0 = Date.now();
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
while (g.s.maxTierReached < 6 && g.s.simTime < 14 * 3600) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
if (g.s.maxTierReached < 6) { console.log('The bot never reached Tier 6 in 14 sim-hours.'); process.exit(1); }
console.log(`Tier 6 reached at ${(g.s.simTime / 3600).toFixed(2)}h (Season ${g.s.season}), crew ${g.activeCrew().length}, cheese upgrades ${['cannons', 'caliber', 'combat', 'chan', 'gouda'].map(k => k + g.lvl(k)).join(' ')}`);
const json = g.serialize();
const row = (label, r) => console.log(`${label.padEnd(22)} ${(r.catnip / r.t).toExponential(2)} nip/s  FC ${r.fc}/${r.n}  ${(r.t / r.n).toFixed(0)} s/ep  cheese ${(r.cheese / r.n).toFixed(1)}/ep` +
  (r.seen ? `  mice ${(r.mice / r.n).toFixed(1)} killed of ${(r.seen / r.n).toFixed(1)}  bites ${(r.bites / r.n).toFixed(1)}  steals ${(r.steals / r.n).toFixed(1)} (${r.stolen} lost)  nests ${r.nests}/${r.nestsTotal}  shots ${(r.shots / r.n).toFixed(0)}  flops ${r.flops}` : ''));
const t5 = measure(json, 5, false), none = measure(json, 6, false, true), chan = measure(json, 6, false), smart = measure(json, 6, true);
row('Tier 5', t5);
row('Tier 6, no turrets', none);
row('Tier 6, Turret-chan', chan);
row('Tier 6, smart turrets', smart);
console.log(`T6/T5 catnip per second: Turret-chan ${(chan.catnip / chan.t / (t5.catnip / t5.t)).toFixed(2)}, smart ${(smart.catnip / smart.t / (t5.catnip / t5.t)).toFixed(2)}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
