#!/usr/bin/env node
// NYAPOTISM! balance harness — runs the real simulation headless with a bot player.
// Usage: node tools/harness.js [--minutes 150] [--seed 1] [--mode active|idle] [--seasons 1] [--quiet]
'use strict';
const path = require('path');
const root = path.join(__dirname, '..', 'js');
for (const f of ['core/util.js', 'data/tiers.js', 'data/traits.js', 'data/content.js', 'data/upgrades.js', 'data/faxes.js',
  'data/loom.js', 'data/events.js', 'data/ovas.js', 'sim/minegen.js', 'sim/catgirl.js', 'sim/episode.js', 'sim/mice.js','sim/greebles.js', 'sim/game.js', 'sim/bot.js']) {
  require(path.join(root, f));
}
const NYA = globalThis.NYA;

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const minutes = +arg('minutes', 150);
const seed = arg('seed', '1');
const mode = arg('mode', 'active');
const maxSeasons = +arg('seasons', 1);
const quiet = args.indexOf('--quiet') >= 0;
const json = args.indexOf('--json') >= 0;

const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode, unravel: maxSeasons > 1 ? 'auto' : 'never' });
const novelty = [];
const checkpoints = {};
const cpTimes = [5, 10, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300];
g.on((type, d) => {
  if (type === 'novel') novelty.push(d);
});
g.newGame();

const dt = NYA.TICK;
const end = minutes * 60;
let lastCp = 0;
const t0 = Date.now();
while (g.s.simTime < end) {
  bot.tick(dt);
  g.tick(dt);
  const m = g.s.simTime / 60;
  while (lastCp < cpTimes.length && m >= cpTimes[lastCp]) {
    const c = cpTimes[lastCp++];
    checkpoints[c] = {
      season: g.s.season, catnip: g.s.catnip, seasonCatnip: g.s.seasonCatnip, tier: g.s.maxTierReached,
      crew: g.s.active.length, ref: g.lvl('refinery'), pick: g.lvl('pick'), fc: g.s.life.fullClears,
      lv: Math.max(...g.s.crew.map(c => c.level)), yarn: g.s.yarn, yarnNow: g.yarnPreview(), skein: g.s.skein.have,
    };
  }
  if (g.s.season > maxSeasons) break;
}
const wall = (Date.now() - t0) / 1000;

const fmt = NYA.fmt, ft = NYA.fmtTime;
if (json) {
  console.log(JSON.stringify({ novelty, checkpoints, tierStats: bot.tierStats, seasonLog: g.s.seasonLog }));
  process.exit(0);
}
console.log(`\n=== NYAPOTISM harness: seed=${seed} mode=${mode} sim=${minutes}min wall=${wall.toFixed(1)}s ===`);
if (!quiet) {
  console.log('\n-- Novelty timeline (sim time, gap since previous) --');
  let prev = 0;
  for (const n of novelty) {
    if (n.kind === 'tip') continue;
    const gap = n.t - prev; prev = n.t;
    console.log(`${ft(n.t).padStart(8)}  (+${ft(gap).padStart(6)})  S${n.season} [${n.kind}] ${n.label}`);
  }
}
console.log('\n-- Checkpoints --');
console.log('  min  season  catnip     seasonNip  tier crew ref pick  FCs  maxLv  yarn(+now) skein');
for (const c of cpTimes) {
  const k = checkpoints[c]; if (!k) continue;
  console.log(`${String(c).padStart(5)}  ${String(k.season).padStart(6)}  ${fmt(k.catnip).padStart(9)}  ${fmt(k.seasonCatnip).padStart(9)}  ${String(k.tier).padStart(4)} ${String(k.crew).padStart(4)} ${String(k.ref).padStart(3)} ${String(k.pick).padStart(4)} ${String(k.fc).padStart(4)}  ${String(k.lv).padStart(5)}  ${String(k.yarn).padStart(4)}(+${k.yarnNow}) ${k.skein ? 'YES' : '-'}`);
}
console.log('\n-- Per-tier episodes --');
for (const t in bot.tierStats) {
  const ts = bot.tierStats[t];
  console.log(`T${t}: ${ts.n} eps, avg ${(ts.dur / ts.n).toFixed(1)}s, FC rate ${(100 * ts.fc / ts.n).toFixed(0)}%, avg catnip ${fmt(ts.catnip / ts.n)}, recent CPS ${fmt(ts.recent.reduce((a, r) => a + r.cps, 0) / Math.max(1, ts.recent.length))}`);
}
if (g.s.seasonLog.length) {
  console.log('\n-- Seasons --');
  for (const sl of g.s.seasonLog) console.log(`S${sl.season}: ${ft(sl.time)}, ${sl.eps} eps, ${fmt(sl.catnip)} catnip → ${sl.yarn} yarn`);
}
const crew = g.s.crew.map(c => `${c.name} L${c.level} [${c.traits.join(', ')}]`).join('\n  ');
console.log('\n-- Crew --\n  ' + crew);
console.log('\n-- Upgrades --\n  ' + Object.entries(g.s.upg).map(([k, v]) => k + ':' + v).join('  '));
console.log('Faxes: ' + Object.keys(g.s.faxes).length + '  Episodes: ' + g.s.episodeNum + '  Skein: ' + (g.s.skein.have ? 'found at ' + ft(g.s.skein.foundAt) : 'no'));
