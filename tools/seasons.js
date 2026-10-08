#!/usr/bin/env node
// Multi-season yarn check: the active bot plays with its own unravel heuristic and prints one line per season
// (length, catnip, yarn, and the minute each tier was reached that season).
// Usage: node tools/seasons.js [seed] [hours] [--max-tier N]. Target: yarn ~×3 per season early (see docs/HANDOFF.md).
// --max-tier N hides surveys past tier N, to compare against an economy without the newest mine.
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js', 'data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/greebles.js','sim/ice.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA;
const args = process.argv.slice(2);
const mt = args.indexOf('--max-tier');
const maxTier = mt >= 0 ? +args.splice(mt, 2)[1] : NYA.MAX_TIER;
const seed = args[0] || '4', hours = +(args[1] || 8);
for (let t = maxTier + 1; t <= NYA.MAX_TIER; t++) if (NYA.UPG['mine' + t]) NYA.UPG['mine' + t].show = () => false;

const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
let reach = {}, season = g.s.season, t0 = 0;
const first = {};
while (g.s.simTime < hours * 3600) {
  bot.tick(NYA.TICK); g.tick(NYA.TICK);
  const t = g.s.maxTierReached;
  if (reach[t] == null) reach[t] = Math.round((g.s.simTime - t0) / 60);
  if (first[t] == null) first[t] = (g.s.simTime / 3600).toFixed(2) + 'h';
  if (g.s.season !== season) {
    const L = g.s.seasonLog[g.s.seasonLog.length - 1];
    const tiers = Object.keys(reach).filter(k => k > 1).map(k => 'T' + k + '@' + reach[k]).join(' ');
    console.log(`S${season}${L.ova ? ' (OVA ' + L.ova + ')' : ''}  ${Math.round(L.time / 60)} min  catnip ${NYA.fmt(L.catnip)}  yarn +${L.yarn}  ${tiers}`);
    season = g.s.season; reach = {}; t0 = g.s.simTime;
  }
}
console.log('First reached:', Object.keys(first).map(k => 'T' + k + ' ' + first[k]).join(', '));
