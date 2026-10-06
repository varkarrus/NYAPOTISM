// Trait definitions (GDD §4.4). Effects are plain modifier keys that the stat
// builder and the episode sim read; trait logic stays out of the miner code.
(function (NYA) {
  'use strict';

  NYA.RARITY = {
    common: { name: 'Common', color: '#cfc7de', w: 60 },
    uncommon: { name: 'Uncommon', color: '#5fe08a', w: 28 },
    rare: { name: 'Rare', color: '#57b8ff', w: 10 },
    legendary: { name: 'Legendary', color: '#ffd23f', w: 2.5 },
  };

  // kind: pos | mixed | neg
  // mines: weight multipliers keyed by mine key — "mine-flavored rolls"
  // tier: can't roll until you've ever reached that tier (no naming tangles, boxes or milk before you've seen them)
  NYA.TRAITS = [
    // --- Mining
    { id: 'chunky', name: 'Chunky', kind: 'mixed', rarity: 'common', desc: '+30% Power, −15% Pace.', flavor: 'A thicc queen.', mods: { powerMult: 1.3, paceMult: 0.85 } },
    { id: 'kneader', name: 'Kneader', kind: 'pos', rarity: 'common', desc: '+50% damage vs dirt.', flavor: 'Makes biscuits out of it.', mods: { dmgDirt: 1.5 }, mines: { burrow: 3 } },
    { id: 'ore_sniffer', name: 'Ore Sniffer', kind: 'pos', rarity: 'uncommon', desc: 'Catnip tiles score ×2 when she picks targets.', flavor: 'Follows her nose. Her nose is usually right.', mods: { scoreOre: 2 } },
    { id: 'lucky_paw', name: 'Lucky Paw', kind: 'pos', rarity: 'rare', desc: '5% chance any catnip item drops at +1 quality.', flavor: 'Rubbed a beckoning cat statue once. Never washed that paw.', mods: { luckyPaw: 0.05 } },
    { id: 'double_dipper', name: 'Double Dipper', kind: 'pos', rarity: 'rare', desc: '3% chance any catnip item drops twice.', flavor: 'Two for her, two for the company.', mods: { doubleDrop: 0.03 } },
    { id: 'allergic_dirt', name: 'Allergic to Dirt', kind: 'neg', rarity: 'common', desc: '−30% damage vs dirt.', flavor: 'Sneezes. Constantly. In a dirt mine.', mods: { dmgDirt: 0.7 }, mines: { burrow: 3 } },
    { id: 'rock_licker', name: 'Rock Licker', kind: 'pos', rarity: 'uncommon', desc: '+35% damage vs stone and hardstone.', flavor: 'Says it helps her "read the grain". HR has asked her to stop.', mods: { dmgStone: 1.35 }, mines: { quarry: 4 } },
    { id: 'sharp_claws', name: 'Sharp Claws', kind: 'pos', rarity: 'uncommon', desc: '+6% critical swing chance.', flavor: 'Files them nightly. On the furniture.', mods: { critAdd: 0.06 } },
    { id: 'noodle_arms', name: 'Noodle Arms', kind: 'neg', rarity: 'common', desc: '−20% Power.', flavor: 'Arms are for hugging, not for rocks.', mods: { powerMult: 0.8 } },
    { id: 'domino_brain', name: 'Domino Brain', kind: 'pos', rarity: 'rare', desc: 'Stone she breaks has a 30% chance to crack each adjacent stone tile.', flavor: 'Sees chain reactions everywhere. Including in soup.', mods: { crackSpread: 0.3 }, mines: { quarry: 6 } },

    // --- Movement and attention
    { id: 'laser_brained', name: 'Laser-Brained', kind: 'mixed', rarity: 'uncommon', desc: 'Triple Zoomies from the laser, but +50% Whimsy when no laser mark is active.', flavor: 'The red dot is her whole personality.', mods: { zoomMult: 3, whimsyNoLaser: 1.5 } },
    { id: 'tunnel_vision', name: 'Tunnel Vision', kind: 'mixed', rarity: 'uncommon', desc: '+4 Focus, ignores laser marks entirely.', flavor: 'Has a plan. Will not be sharing it.', mods: { focusAdd: 4, ignoreLaser: 1 } },
    { id: 'box_obsessed', name: 'Box Obsessed', kind: 'neg', rarity: 'common', desc: 'Stops to sit in any dead-end nook for 5 seconds. Every time.', flavor: 'If it fits, she sits. It always fits.', mods: { boxSitter: 1 } },
    { id: 'zoomies_3am', name: 'Zoomies at 3AM', kind: 'pos', rarity: 'uncommon', desc: 'Random bursts of +100% Pace.', flavor: 'It is always 3AM somewhere.', mods: { zoomies3am: 1 } },
    { id: 'mud_puppy', tier: 2, name: 'Mud Puppy', kind: 'pos', rarity: 'uncommon', desc: 'Mud and rubble don’t slow her; she stomps rubble flat.', flavor: 'Splashes in every puddle. On purpose. With joy.', mods: { mudPuppy: 1 }, mines: { quarry: 3, dairy: 3 } },
    { id: 'sure_footed', name: 'Sure-Footed', kind: 'pos', rarity: 'common', desc: '+20% Pace.', flavor: 'Always lands on her feet. Usually on purpose.', mods: { paceMult: 1.2 }, mines: { yarn: 2 } },
    { id: 'yarn_wrangler', tier: 3, name: 'Yarn Wrangler', kind: 'pos', rarity: 'uncommon', desc: 'Tangles don’t slow her; she cuts them clean.', flavor: 'Has fought yarn before. Yarn lost.', mods: { yarnWrangler: 1 }, mines: { yarn: 6 } },
    { id: 'ball_of_energy', name: 'Ball of Energy', kind: 'mixed', rarity: 'common', desc: '+20% Haste, +60% Whimsy.', flavor: 'Bounces. Constantly. Even asleep.', mods: { hasteMult: 1.2, whimsyMult: 1.6 }, mines: { yarn: 3 } },
    { id: 'space_cadet', name: 'Space Cadet', kind: 'neg', rarity: 'common', desc: '+100% Whimsy.', flavor: 'Is she mining or staring at the wall? Yes.', mods: { whimsyMult: 2 } },

    // --- Stamina
    { id: 'power_napper', name: 'Power Napper', kind: 'pos', rarity: 'uncommon', desc: 'At 0 stamina, naps 5 s and wakes with 20%. Once per shift.', flavor: 'Five minutes. Five more seconds. Whatever.', mods: { powerNap: 1 } },
    { id: 'sleepyhead', name: 'Sleepyhead', kind: 'neg', rarity: 'common', desc: 'Starts shifts at 80% stamina.', flavor: 'Clocks in. Yawns. Clocks in again.', mods: { sleepy: 0.8 } },
    { id: 'night_owl', name: 'Night Owl', kind: 'pos', rarity: 'uncommon', desc: 'Swings cost half stamina below 25%.', flavor: 'Gets weirdly productive right before bed.', mods: { nightOwl: 1 } },
    { id: 'marathoner', name: 'Marathoner', kind: 'pos', rarity: 'common', desc: '+25% Stamina.', flavor: 'Runs 5Ks for fun. Nobody asked.', mods: { staminaMult: 1.25 } },
    { id: 'couch_potato', name: 'Couch Potato', kind: 'neg', rarity: 'common', desc: '−20% Stamina.', flavor: 'Saving her energy for later. Later never comes.', mods: { staminaMult: 0.8 } },
    { id: 'gritty', name: 'Gritty', kind: 'pos', rarity: 'common', desc: '+8 Grit.', flavor: 'Chews gravel. Recreationally.', mods: { gritAdd: 8 }, mines: { quarry: 2 } },

    // --- Economy
    { id: 'big_pockets', name: 'Big Pockets', kind: 'pos', rarity: 'common', desc: '+2 Carry.', flavor: 'Her overalls have overalls.', mods: { carryAdd: 2 } },
    { id: 'butterfingers', name: 'Butterfingers', kind: 'neg', rarity: 'common', desc: '5% chance per item to drop it on the walk home. Someone else can pick it up.', flavor: 'Paws were not designed for this.', mods: { butterfingers: 0.05 } },
    { id: 'tabletop_menace', name: 'Tabletop Menace', kind: 'neg', rarity: 'uncommon', desc: 'Sometimes knocks a delivered item into a crevice, lost forever.', flavor: 'Looks you in the eye while doing it.', mods: { menace: 0.06 } },
    { id: 'hoarder', name: 'Hoarder', kind: 'mixed', rarity: 'uncommon', desc: '+50% Carry, −10% Pace.', flavor: 'It’s not hoarding if it’s catnip.', mods: { carryMult: 1.5, paceMult: 0.9 } },
    { id: 'quick_study', name: 'Quick Study', kind: 'pos', rarity: 'common', desc: '+30% XP.', flavor: 'Took notes during orientation. Nobody else did.', mods: { xpMult: 1.3 } },

    // --- Social and synergy
    { id: 'team_player', name: 'Team Player', kind: 'pos', rarity: 'uncommon', desc: '+10% Haste to miners within 2 tiles (including her).', flavor: 'Brings orange slices to the mine.', mods: { teamPlayer: 1 } },
    { id: 'loner', name: 'Loner', kind: 'mixed', rarity: 'common', desc: '+25% Power with no other miner within 3 tiles.', flavor: 'Prefers the company of rocks.', mods: { loner: 1 } },
    { id: 'loaf_squad', name: 'Loaf Squad', kind: 'pos', rarity: 'uncommon', desc: '+5% all stats per other Loaf Squad member in the crew. Stacks.', flavor: 'Part of a bread-based collective.', mods: { loafSquad: 1 } },
    { id: 'tuxedo_club', name: 'Tuxedo Club', kind: 'pos', rarity: 'uncommon', desc: '+15% Power if at least two tuxedo-pattern catgirls are on shift.', flavor: 'Formal wear is mandatory. Always.', mods: { tuxedoClub: 1 } },
    { id: 'perfectionist', name: 'Perfectionist', kind: 'pos', rarity: 'uncommon', desc: '+10% Power in mines where your crew has an S rank.', flavor: 'An A is just a failed S.', mods: { perfectionist: 1 } },

    // --- Dairy
    { id: 'lactose_tolerant', tier: 4, name: 'Lactose Tolerant', kind: 'pos', rarity: 'uncommon', desc: 'Pumps she operates run 30% faster, and she loves to volunteer.', flavor: 'Drinks it straight from the pipe. Nobody stops her.', mods: { lactose: 1 }, mines: { dairy: 7 } },
    { id: 'milk_mustache', tier: 4, name: 'Milk Mustache', kind: 'mixed', rarity: 'common', desc: '+20% Stamina, −10% Haste.', flavor: 'Has not noticed. Nobody will tell her.', mods: { staminaMult: 1.2, hasteMult: 0.9 }, mines: { dairy: 4 } },

    // --- Box
    { id: 'box_whisperer', tier: 3, name: 'Box Whisperer', kind: 'pos', rarity: 'rare', desc: '+3% Schrödinger’s Box chance per episode while she’s on shift.', flavor: 'Hears a hum nobody else hears.', mods: { boxWhisperer: 0.03 }, mines: { yarn: 5 } },

    // --- Legendary
    { id: 'nine_lives', name: 'Nine-Lives Energy', kind: 'pos', rarity: 'legendary', desc: 'Once per shift, a flop instantly restores 100% stamina.', flavor: 'Has died zero times. Plans to use all nine anyway.', mods: { nineLives: 1 } },
    { id: 'main_character', name: 'Main Character Syndrome', kind: 'pos', rarity: 'legendary', desc: '+50% all stats; every other miner gets −5% for being a side character.', flavor: 'Has an opening theme. Hums it constantly.', mods: { mainChar: 1 } },
    { id: 'midas_paw', name: 'Midas Paw', kind: 'pos', rarity: 'legendary', desc: '10% chance any catnip item drops at +2 quality.', flavor: 'Everything she touches turns to slightly better catnip.', mods: { midas: 0.1 } },
  ];

  NYA.TRAIT = {};
  for (const t of NYA.TRAITS) NYA.TRAIT[t.id] = t;

  NYA.TRAIT_LEVELS = [3, 8, 15, 25, 40];

  // Roll a trait for a catgirl in a given mine. Kinds 55/25/20, rarity-weighted, mine-flavored.
  NYA.rollTrait = function (rng, owned, mineKey, luck, maxTier) {
    const known = t => !t.tier || (maxTier || 1) >= t.tier;
    const kind = rng.weighted([['pos', 55 + (luck || 0)], ['mixed', 25], ['neg', Math.max(5, 20 - (luck || 0))]]);
    const pool = [];
    for (const t of NYA.TRAITS) {
      if (owned.indexOf(t.id) >= 0 || !known(t)) continue;
      if (t.kind !== kind) continue;
      let w = NYA.RARITY[t.rarity].w;
      if (t.mines && mineKey && t.mines[mineKey]) w *= t.mines[mineKey];
      pool.push([t.id, w]);
    }
    if (!pool.length) {
      for (const t of NYA.TRAITS) if (owned.indexOf(t.id) < 0 && known(t)) pool.push([t.id, NYA.RARITY[t.rarity].w]);
    }
    return pool.length ? rng.weighted(pool) : null;
  };
})(globalThis.NYA = globalThis.NYA || {});
