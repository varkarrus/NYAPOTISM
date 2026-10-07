// Catgirls: generation, levels/XP, and the modifier stack that turns
// upgrades + levels + traits into a cached stat block (GDD §4, §25 "Modifier stack").
(function (NYA) {
  'use strict';

  NYA.BASE_STATS = {
    power: 5, haste: 2.0, pace: 4.0, stamina: 50, carry: 5, focus: 2, grit: 0, whimsy: 0.03, crit: 0.03,
  };
  NYA.STAT_INFO = {
    power: { name: 'Power', desc: 'Damage per swing.' },
    haste: { name: 'Haste', desc: 'Swings per second.' },
    pace: { name: 'Pace', desc: 'Tiles per second walking.' },
    stamina: { name: 'Stamina', desc: 'Total swing budget per shift. Swings cost (mine resistance × 0.99^Grit); walking costs 12.5% of that per second.' },
    carry: { name: 'Carry', desc: 'Inventory slots. One catnip item per slot.' },
    focus: { name: 'Focus', desc: 'How many candidate tiles she compares before picking one (K).' },
    grit: { name: 'Grit', desc: 'Each point cuts swing stamina cost by ~1%, multiplicatively.' },
    whimsy: { name: 'Whimsy', desc: 'Chance per second of getting distracted. Hidden. Only traits touch it.' },
    crit: { name: 'Crit', desc: 'Chance a swing deals ×3 damage.' },
  };

  NYA.xpNeed = L => Math.ceil(100 * Math.pow(1.45, L - 1));

  // Swing techniques: Haste never runs away. Past the cap, swings "fold": half as many
  // swings, each with double power and double stamina cost, plus a small bonus per fold.
  NYA.HASTE_CAP = 4;
  NYA.FOLD_BONUS = 1.1;
  NYA.TECHNIQUES = ['Kitty Tap', 'Paw Smash', 'Pounce Strike', 'Tiger Drop', 'Meteor Mew', 'Nine-Tail Nova', 'Big Bang Biscuit', 'Catastrophe', 'Purrfect Singularity'];
  NYA.techName = f => NYA.TECHNIQUES[Math.min(f, NYA.TECHNIQUES.length - 1)] + (f >= NYA.TECHNIQUES.length ? ' ' + (f - NYA.TECHNIQUES.length + 2) : '');
  // Crit folds the same way: past CRIT_CAP, 30 points of crit chance become a Power multiplier
  // (×1.65, a bit more than the ×1.5 those crits were worth), so crit can climb forever without capping.
  NYA.CRIT_CAP = 0.4; NYA.CRIT_FOLD_STEP = 0.3; NYA.CRIT_FOLD_POWER = 1.65;
  NYA.CRIT_RANKS = ['Claw Mastery', 'Razor Mastery', 'Diamond Claw', 'Meteor Claw', 'Nine-Claw Style', 'Catastrophe Claw'];
  NYA.critRankName = f => NYA.CRIT_RANKS[Math.min(f, NYA.CRIT_RANKS.length) - 1] + (f > NYA.CRIT_RANKS.length ? ' ' + (f - NYA.CRIT_RANKS.length + 1) : '');
  NYA.foldStats = function (out) {
    out.critFold = 0;
    while (out.crit > NYA.CRIT_CAP && out.critFold < 40) { out.crit -= NYA.CRIT_FOLD_STEP; out.power *= NYA.CRIT_FOLD_POWER; out.critFold++; }
    if (out.critFold) {
      const name = NYA.critRankName(out.critFold) + ' (crit focus)';
      out.parts.crit.push({ src: name, op: 'add', v: -NYA.CRIT_FOLD_STEP * out.critFold });
      out.parts.power.push({ src: name, op: 'mul', v: Math.pow(NYA.CRIT_FOLD_POWER, out.critFold) });
    }
    out.fold = 0; out.swingMult = 1;
    while (out.haste > NYA.HASTE_CAP && out.fold < 40) { out.haste /= 2; out.power *= 2 * NYA.FOLD_BONUS; out.swingMult *= 2; out.fold++; }
    if (out.fold) {
      const name = NYA.techName(out.fold) + ' (technique)';
      out.parts.haste.push({ src: name, op: 'mul', v: Math.pow(0.5, out.fold) });
      out.parts.power.push({ src: name, op: 'mul', v: Math.pow(2 * NYA.FOLD_BONUS, out.fold) });
    }
    return out;
  };

  let nextId = 1;
  NYA.setNextCatgirlId = v => { nextId = Math.max(nextId, v); };

  NYA.makeCatgirl = function (rng, opts) {
    opts = opts || {};
    const used = opts.usedNames || {};
    let name = rng.pick(NYA.FIRST_NAMES);
    for (let k = 0; k < 8 && used[name]; k++) name = rng.pick(NYA.FIRST_NAMES);
    const apt = opts.apt !== undefined ? opts.apt : rng.weighted(NYA.APTITUDES.map((a, i) => [i, a.w]));
    const fur = opts.fur || NYA.rollFur(rng);
    return {
      id: nextId++,
      name: opts.name || name,
      family: rng.pick(NYA.FAMILY_NAMES),
      fur,
      hair: (NYA.FURS[fur] && NYA.FURS[fur].sphynx) ? 'bald' : opts.hair || NYA.rollHair(rng, fur),
      outfit: rng.pick(NYA.OUTFITS),
      blurb: opts.blurb || rng.pick(NYA.BLURBS),
      apt,
      level: 1, xp: 0,
      traits: [],
      traitMines: [],
      episodes: 0, swings: 0, items: 0,
      seasons: 1,
      anchored: false,
      hiredEp: opts.ep || 0,
    };
  };

  // ---------- Modifier stack ----------
  class StatBlock {
    constructor() { this.parts = {}; for (const k in NYA.BASE_STATS) this.parts[k] = [{ src: 'Base', op: 'base', v: NYA.BASE_STATS[k] }]; this.flags = {}; }
    add(stat, v, src) { if (v) this.parts[stat].push({ src, op: 'add', v }); }
    mul(stat, v, src) { if (v !== 1) this.parts[stat].push({ src, op: 'mul', v }); }
    finalize() {
      const out = {};
      for (const k in this.parts) {
        let base = 0, mult = 1;
        for (const p of this.parts[k]) {
          if (p.op === 'base' || p.op === 'add') base += p.v; else mult *= p.v;
        }
        out[k] = base * mult;
      }
      out.carry = Math.max(1, Math.floor(out.carry));
      out.focus = Math.max(1, Math.floor(out.focus));
      out.flags = this.flags;
      out.parts = this.parts;
      return out;
    }
  }
  NYA.StatBlock = StatBlock;

  // ctx: { mineKey, tier, crew: [catgirls on shift], sRankHere: bool }
  NYA.buildStats = function (game, cg, ctx) {
    ctx = ctx || {};
    const sb = new StatBlock();
    const apt = NYA.APTITUDES[cg.apt].mult;
    const L = cg.level - 1;
    // Levels
    sb.mul('power', 1 + 0.05 * L * apt, 'Level ' + cg.level);
    sb.mul('stamina', 1 + 0.05 * L * apt, 'Level ' + cg.level);
    sb.mul('haste', 1 + 0.015 * L * apt, 'Level ' + cg.level);
    sb.mul('pace', 1 + 0.015 * L * apt, 'Level ' + cg.level);
    sb.add('grit', Math.floor(L * apt), 'Level ' + cg.level);
    sb.add('carry', Math.floor(cg.level / 5), 'Level ' + cg.level);
    // Research
    const lv = id => game.lvl(id);
    sb.mul('power', Math.pow(1.2, lv('pick')), 'Sharper Pickaxe');
    sb.mul('haste', Math.pow(1.1, lv('grip')), 'Grippy Paw Pads');
    sb.mul('pace', Math.pow(1.1, lv('boots')), 'Comfy Boots');
    sb.mul('stamina', Math.pow(1.15, lv('snacks')), 'Stamina Snacks');
    sb.add('carry', lv('bags'), 'Bigger Bags');
    sb.add('focus', lv('focus'), 'Focus Seminar');
    sb.add('grit', 4 * lv('grit'), 'Grit Training');
    sb.add('crit', 0.03 * lv('claws'), 'Claw Sharpening');
    sb.mul('haste', Math.pow(1.1, lv('cream')), 'Cream Grease (milk)');
    sb.mul('pace', Math.pow(1.1, lv('cream')), 'Cream Grease (milk)');
    sb.mul('stamina', Math.pow(1.1, lv('calcium')), 'Calcium Supplements (milk)');
    sb.add('grit', 2 * lv('calcium'), 'Calcium Supplements (milk)');
    sb.mul('power', Math.pow(1.1, lv('wasabi')), 'Wasabi Kick (sushi)');
    // Loom
    const lm = id => game.loom(id);
    sb.mul('power', Math.pow(1.5, lm('km_power')), 'Muscle Mittens (yarn)');
    sb.mul('stamina', Math.pow(1.5, lm('km_stamina')), 'Cozy Scarf (yarn)');
    if (cg.anchored && game.loomRowDone(2)) {
      for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, 1.25, 'Anchor Stripe');
    }
    // Faxes
    const fb = game.faxBonus();
    if (fb.power) sb.mul('power', 1 + fb.power, 'Faxes');

    // Traits
    const f = sb.flags;
    f.dmg = { dirt: 1, stone: 1, ore: 1, box: 1 };
    f.xpMult = 1;
    for (const tid of cg.traits) {
      const t = NYA.TRAIT[tid]; if (!t) continue;
      const m = t.mods, src = t.name;
      if (m.powerMult) sb.mul('power', m.powerMult, src);
      if (m.hasteMult) sb.mul('haste', m.hasteMult, src);
      if (m.paceMult) sb.mul('pace', m.paceMult, src);
      if (m.staminaMult) sb.mul('stamina', m.staminaMult, src);
      if (m.whimsyMult) sb.mul('whimsy', m.whimsyMult, src);
      if (m.carryAdd) sb.add('carry', m.carryAdd, src);
      if (m.carryMult) sb.mul('carry', m.carryMult, src);
      if (m.focusAdd) sb.add('focus', m.focusAdd, src);
      if (m.focusMult) sb.mul('focus', m.focusMult, src);
      if (m.gritAdd) sb.add('grit', m.gritAdd, src);
      if (m.critAdd) sb.add('crit', m.critAdd, src);
      if (m.dmgDirt) f.dmg.dirt *= m.dmgDirt;
      if (m.dmgStone) f.dmg.stone *= m.dmgStone;
      if (m.xpMult) f.xpMult *= m.xpMult;
      for (const k of ['scoreOre', 'luckyPaw', 'doubleDrop', 'zoomMult', 'whimsyNoLaser', 'ignoreLaser', 'boxSitter', 'zoomies3am',
        'powerNap', 'sleepy', 'nightOwl', 'butterfingers', 'menace', 'teamPlayer', 'loner', 'yarnWrangler', 'mudPuppy', 'boxWhisperer',
        'nineLives', 'midas', 'crackSpread', 'lactose', 'waterproof', 'sushiSnob', 'mouser', 'pacifist', 'scaredy', 'cheeseMagnet', 'caffeine', 'hotWater', 'spanish', 'rampage', 'psychic']) {
        if (m[k] !== undefined) f[k] = m[k];
      }
      if (m.mainChar) { for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, 1.5, src); f.mainChar = 1; }
    }
    // OVAs: limiters for the run in progress, perks from cleared releases
    if (game && game.s && game.s.ova) {
      if (game.ovaIs('monday')) { f.sleepy = Math.min(f.sleepy || 1, 0.6); sb.mul('whimsy', 5, 'OVA: Monday'); }
      if (game.ovaIs('onecat')) for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, NYA.OVA_ONECAT_MULT, 'OVA: One Cat Army');
    }
    if (game && game.ovaPerk) {
      const eyes = game.ovaPerk('nolaser');
      if (eyes) sb.add('focus', eyes, 'Sharp Eyes (OVA perk)');
      const ace = game.ovaPerk('onecat');
      if (ace && game.s.active[0] === cg.id) for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, NYA.OVA_ACE[ace], 'Ace Protocol (OVA perk)');
    }
    // Crew synergies
    const crew = ctx.crew || [];
    if (cg.traits.indexOf('loaf_squad') >= 0) {
      const others = crew.filter(c => c.id !== cg.id && c.traits.indexOf('loaf_squad') >= 0).length;
      if (others) for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, 1 + 0.05 * others, 'Loaf Squad ×' + others);
    }
    if (cg.traits.indexOf('tuxedo_club') >= 0 && crew.filter(c => c.fur === 'tuxedo').length >= 2) sb.mul('power', 1.15, 'Tuxedo Club');
    if (cg.traits.indexOf('perfectionist') >= 0 && ctx.sRankHere) sb.mul('power', 1.1, 'Perfectionist');
    if (cg.traits.indexOf('main_character') < 0 && crew.some(c => c.id !== cg.id && c.traits.indexOf('main_character') >= 0)) {
      for (const k of ['power', 'haste', 'pace', 'stamina']) sb.mul(k, 0.95, 'Side Character');
    }
    return NYA.foldStats(sb.finalize());
  };

  NYA.aptGrade = cg => NYA.APTITUDES[cg.apt].g;
})(globalThis.NYA = globalThis.NYA || {});
