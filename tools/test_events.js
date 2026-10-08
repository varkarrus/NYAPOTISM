// Headless check of each Tanuki event mine's special rules
const path = require('path');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js','sim/greebles.js','sim/ice.js', 'sim/game.js']) require(path.join(__dirname, '..', 'js', f));
const NYA = globalThis.NYA;
const g = new NYA.Game({ headless: true, seed: 'evtest' });
g.newGame();
Object.assign(g.s.buildings, { lab: 1, barracks: 1, pochi: 1 });
g.s.catnip = 1e9;
for (let k = 0; k < 10; k++) for (const id of ['bunk', 'pick', 'snacks', 'grit', 'boots', 'grip', 'bags', 'refinery']) g.buy(id);
for (let k = 0; k < 6; k++) { g.fillBoard(false); g.hire(); } // refill the applicant board between test hires
g.s.maxTierReached = 2; g.s.tierUnlocked[2] = 1;
let last = null;
g.on((t, d) => { if (t === 'episodeEnd') last = d; });
for (const ev of NYA.EVENT_KEYS) {
  g.whistle(); g.tick(0.05);
  g.s.pendingEvent = { ev, tier: 2 };
  g.nextEpisode();
  const ep = g.episode;
  const M = ep.mine;
  const info = { mochiTiles: M.mochi.reduce((a, b) => a + b, 0), clusters: Object.keys(ep.clusterLeft).length, ghosts: ep.miners.filter(m => m.ghost).length, fish: ep.loose.filter(i => i.fish).length };
  let ticks = 0;
  while (!ep.ended && ticks++ < 20 * 900) g.tick(0.05);
  const mochiLeft = Array.from(M.type).filter((t, i) => t === NYA.T.ORE && M.mochi[i]).length;
  console.log(ev.padEnd(9), JSON.stringify(info), `t=${ep.t.toFixed(0)}s FC=${ep.fullClear} wishes=${ep.wishes} mochiLeft=${mochiLeft} fishLeft=${ep.loose.filter(i => i.fish).length} catnip=${NYA.fmt(last.catnip)} evMult=${last.evMult.toFixed(2)}`);
}
