// Headless check of the T4 pump state machine: build -> pipe -> pump -> dry
const path = require('path');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js', 'sim/game.js']) require(path.join(__dirname, '..', 'js', f));
const NYA = globalThis.NYA;
const g = new NYA.Game({ headless: true, seed: 'pumptest' });
g.newGame();
g.s.catnip = 1e15; Object.assign(g.s.buildings, { lab: 1, barracks: 1, pochi: 1 });
for (let k = 0; k < 40; k++) for (const id of ['bunk', 'pick', 'snacks', 'grit', 'boots', 'grip', 'bags', 'refinery']) g.buy(id);
for (let k = 0; k < 9; k++) { g.fillBoard(false); g.hire(); } // refill the applicant board between test hires
g.s.tierUnlocked[4] = 1; g.selectTier(4);
const junc = process.argv[2] === 'junctions';
if (junc) g.s.upg.junctions = 1;
let results = [];
g.on((t, d) => { if (t === 'episodeEnd') results.push(d); });
for (let e = 0; e < 4; e++) {
  g.whistle(); g.tick(0.05); g.nextEpisode();
  const ep = g.episode;
  const seen = {};
  let ticks = 0;
  while (!ep.ended && ticks++ < 20 * 600) {
    g.tick(0.05);
    for (const m of ep.miners) seen[m.state] = (seen[m.state] || 0) + 1;
  }
  const nodes = Object.keys(ep.pumps).length;
  const pipes = ep.pipe.reduce((a, b) => a + b, 0);
  const r = results[results.length - 1];
  console.log(`ep ${e}: t=${ep.t.toFixed(1)}s FC=${ep.fullClear} milk=${ep.haul.milk.toFixed(1)} pumps=${nodes} dry=${Object.values(ep.pumps).filter(p => p.dry).length} pipeTiles=${pipes} states=${JSON.stringify(seen)}`);
}
console.log('milk total', g.s.milk.toFixed(1));
