#!/usr/bin/env node
// Frontier check (the user's rule of thumb): a mine should still be chewy and take a while to cross for as long as it
// is the deepest mine you've unlocked. Only once the next mine or two are open may the crew outgrow it.
// For every frontier stretch (a tier being the deepest unlocked this run), prints the median miner's swings for stone
// and hard stone (HP / Power, no crits) and her seconds to cross the mine's width, on arrival and when the next mine
// unlocks, plus how long the stretch lasted, the average shift and catnip/s.
// Usage: node tools/frontier.js [seed=1] [hours=7] [--quiet] [--set '{"PUSH":1,"UPG.mine3.base":3e4,"FC":{"3":2}}']
// --set tries balance changes without editing the game: NYA constants by name, "UPG.<id>.<field>" for upgrades,
// "TIER.<n>.<field>" for a mine (e.g. "TIER.8.diffTier"), and
// "FC" to override the perfect clears each survey asks for (by tier). Targets: see docs/HANDOFF.md.
const path = require('path'); const root = path.join(__dirname, '..', 'js') + '/';
['core/util.js','data/tiers.js','data/traits.js','data/content.js','data/upgrades.js','data/faxes.js','data/loom.js','data/events.js','data/ovas.js','sim/minegen.js','sim/catgirl.js','sim/episode.js','sim/mice.js','sim/greebles.js','sim/game.js','sim/bot.js'].forEach(f => require(root + f));
const NYA = globalThis.NYA, T = NYA.T;
const args = process.argv.slice(2), quiet = args.includes('--quiet');
const si = args.indexOf('--set'), set = si >= 0 ? JSON.parse(args.splice(si, 2)[1]) : {};
for (const [k, v] of Object.entries(set)) {
  if (k === 'FC') { const sr = NYA.surveyReq; NYA.surveyReq = (g, tier, fcTier, n) => sr(g, tier, fcTier, v[tier] != null ? v[tier] : n); }
  else if (k.startsWith('UPG.')) { const [, id, field] = k.split('.'); NYA.UPG[id][field] = v; }
  else if (k.startsWith('TIER.')) { const [, t, field] = k.split('.'); NYA.TIERS[t][field] = v; }
  else NYA[k] = v;
}
const nums = args.filter(a => !a.startsWith('--'));
const seed = nums[0] || '1', hours = +(nums[1] || 7);
const g = new NYA.Game({ headless: true, seed: 'harness-' + seed });
const bot = new NYA.Bot(g, { mode: 'active', unravel: 'auto' });
g.newGame();
const top = () => Math.max(...Object.keys(g.s.tierUnlocked).filter(k => g.s.tierUnlocked[k]).map(Number));
// the median active catgirl's stats in tier t (as Episode would build them)
function snap(t) {
  const crew = g.activeCrew(); if (!crew.length) return null;
  const ctx = { mineKey: NYA.TIERS[t].key, tier: t, crew };
  const st = crew.map(cg => NYA.buildStats(g, cg, ctx)).sort((a, b) => a.power - b.power);
  const m = st[st.length >> 1], hp = ty => NYA.BASE_HP[ty] * NYA.tierHP(t);
  const pace = st.map(s => s.pace).sort((a, b) => a - b)[st.length >> 1] / NYA.tierFooting(t);
  return { stone: hp(T.STONE) / m.power, hard: hp(T.HARD) / m.power, cross: NYA.TIERS[t].w / pace };
}
const rows = []; let cur = null;
function open(t) { cur = { season: g.s.season, t, t0: g.s.simTime, a: snap(t), eps: 0, dur: 0, nip: 0, ft: 0 }; }
function close() { if (!cur) return; cur.z = snap(cur.t); cur.len = (g.s.simTime - cur.t0) / 60; rows.push(cur); cur = null; }
const unravel = g.unravel.bind(g); g.unravel = o => { if (cur) cur.end = 'season end'; close(); return unravel(o); }; // snapshot before the reset
const startOva = g.startOva.bind(g); g.startOva = id => { close(); return startOva(id); };
g.on((type, d) => {
  if (type === 'episodeEnd' && cur && !d.event && d.tier === cur.t) { cur.eps++; cur.dur += d.duration; cur.nip += d.catnip; cur.ft += d.duration + g.packUpTime(); }
});
const first = {};
let lastTop = 0;
while (g.s.simTime < hours * 3600) {
  bot.tick(NYA.TICK); g.tick(NYA.TICK);
  if (g.s.ova) continue;
  const tp = top();
  if (tp !== lastTop || (cur && cur.season !== g.s.season)) { if (!cur || cur.t !== tp || cur.season !== g.s.season) { close(); if (g.s.maxTierReached >= tp) open(tp); } lastTop = tp; }
  if (!cur && g.s.maxTierReached >= tp && tp === lastTop) open(tp);
  for (const k in g.s.tierUnlocked) if (first[k] == null && g.s.maxTierReached >= +k) first[k] = g.s.simTime / 3600;
}
close();
const f = (x, d = 1) => x == null ? '-' : x.toFixed(d);
if (!quiet) for (const r of rows) {
  if (!r.a || !r.eps || r.len < 3) continue; // a minute or two passing through a mine you've outgrown doesn't count
  console.log(`S${String(r.season).padEnd(3)} T${r.t} ${f(r.len, 0).padStart(4)} min  arrive stone ${f(r.a.stone)} hard ${f(r.a.hard)} cross ${f(r.a.cross)}s  ->  ${r.end || 'next unlock'}: stone ${f(r.z.stone)} hard ${f(r.z.hard)} cross ${f(r.z.cross)}s  | ${r.eps} shifts ${f(r.dur / r.eps, 0)}s, ${NYA.fmt(r.nip / r.ft)}/s`);
}
console.log(`seed ${seed}: first ` + Object.keys(first).map(k => 'T' + k + ' ' + f(first[k], 2) + 'h').join(' ') + `  | season ${g.s.season}, lifetime yarn ${NYA.fmt(g.s.life.yarn)}`);
