// Upgrades & research (GDD §5, §6.2, §7, §8). All costs in catnip unless noted.
// cost(level) = base * growth^level. `max` caps levels. `show` gates when a node is
// visible at all (drip-fed novelty); `req` gates when it can be bought.
(function (NYA) {
  'use strict';

  // Buildings, in unlock order. `char` is the NPC who runs it.
  NYA.BUILDINGS = {
    office: { name: "Foreman's Office", short: 'Office', char: 'auntie', icon: '📠' },
    refinery: { name: 'Refinery', short: 'Refinery', char: 'tora', icon: '⚗️' },
    barracks: { name: 'Barracks', short: 'Barracks', char: 'paws', icon: '🛏️' },
    lab: { name: 'R&D Lab', short: 'R&D', char: 'doc', icon: '🔬' },
    pochi: { name: 'Purrmit Office', short: 'Purrmits', char: 'pochi', icon: '📋' },
    tanuki: { name: 'Tanuki\u2019s Emporium', short: 'Tanuki', char: 'tanuki', icon: '🍃' },
    loom: { name: 'Quantum Loom', short: 'Loom', char: 'nyacolette', icon: '🧶' },
  };

  const U = [];
  function def(o) { U.push(o); }

  // ---------------- Refinery ----------------
  def({ id: 'refinery', bld: 'refinery', name: 'Refinery Mk', max: 20, base: 30, growth: 5,
    desc: 'Each Mark multiplies refined Catnip by ×1.5.', flavor: 'Tora insists each Mark is "basically a whole new machine." It is the same machine with a sticker.',
    fx: l => 'Refinery ×' + NYA.fmt(Math.pow(1.5, l)) });
  def({ id: 'polisher', bld: 'refinery', name: 'Polisher Module', max: 2, base: 2500, growth: 40,
    show: g => g.s.maxTierReached >= 2, req: g => g.s.maxTierReached >= 2 ? null : 'Reach Tier 2',
    desc: 'Quality becomes superlinear: value = base × q^1.15 (rank 2: q^1.3).', flavor: 'Buffs each leaf to a mirror shine. Tora can see her face. She hates it.',
    fx: l => 'q^' + [1, 1.15, 1.3][l] });
  def({ id: 'centrifuge', bld: 'refinery', name: 'Centrifuge Module', max: 3, base: 6000, growth: 12,
    show: g => g.s.maxTierReached >= 2, req: g => g.s.maxTierReached >= 2 ? null : 'Reach Tier 2',
    desc: 'High-density tiles pay a bonus: +2% per density point above 1 (per rank).', flavor: 'Spins the ore really fast. Nobody knows why that helps.',
    fx: l => '+' + (2 * l) + '% per density' });

  // unlocks once the Skein is found (or from Season 2), when one bad roll can't stall a first run
  def({ id: 'blend', bld: 'refinery', name: 'Tora’s Special Blend', max: 1, base: 5e6,
    show: g => g.s.skein.have || g.s.season > 1,
    desc: 'Unlocks an hourly gamble: stake 50% of refinery output for 10 minutes, then Tora rolls a random ×0.5 to ×4 on the pot. Live commentary included.', flavor: 'Pure spectacle. Mathematically neutral-to-slightly-positive. Emotionally, a rollercoaster.',
    fx: l => l ? 'Gamble unlocked' : '' });

  // ---------------- Refinery: Creamery (paid in MILK) ----------------
  const milkShow = g => g.s.milk > 0 || g.s.maxTierReached >= 4;
  def({ id: 'milkbath', bld: 'refinery', cur: 'milk', name: 'Milk Bath', max: 40, base: 60, growth: 2.3, show: milkShow,
    desc: 'Catnip ×1.25 (compounding). The ore soaks overnight.', flavor: 'Tora insists this is "a real refining technique." It is a bathtub.',
    fx: l => 'Catnip ×' + NYA.fmt(Math.pow(1.25, l)) });
  def({ id: 'pistons', bld: 'refinery', cur: 'milk', name: 'Pump Pistons', max: 25, base: 40, growth: 2.4, show: milkShow,
    desc: '+30% pump flow (compounding).', flavor: 'Hagane machined them overnight. Thumbs up.',
    fx: l => 'Flow ×' + NYA.fmt(Math.pow(1.3, l)) });
  def({ id: 'cream', bld: 'refinery', cur: 'milk', name: 'Cream Grease', max: 25, base: 80, growth: 2.3, show: milkShow,
    desc: '+10% Haste and Pace for every miner (compounding).', flavor: 'For the pickaxe hinges. And the knees.',
    fx: l => 'Haste & Pace ×' + NYA.fmt(Math.pow(1.1, l)) });
  def({ id: 'calcium', bld: 'refinery', cur: 'milk', name: 'Calcium Supplements', max: 25, base: 120, growth: 2.3, show: milkShow,
    desc: '+10% Stamina (compounding) and +2 Grit.', flavor: 'Strong bones, strong swings, strong opinions about cheese.',
    fx: l => 'Stamina ×' + NYA.fmt(Math.pow(1.1, l)) + ', +' + (2 * l) + ' Grit' });

  // ---------------- Refinery: Sushi Bar (paid in SUSHI, from the Sushi Grotto) ----------------
  const sushiShow = g => g.s.sushi > 0 || g.s.maxTierReached >= 5;
  def({ id: 'wetsuit', bld: 'refinery', cur: 'sushi', name: 'Wetsuits', max: 3, base: 25, growth: 4, show: sushiShow,
    desc: 'Wet catgirls walk faster (half speed → 60/70/80%) and tire less (stamina ×2 → ×1.75/1.5/1.25).', flavor: 'Neoprene, with little ear holes. Hagane insisted on the ear holes.',
    fx: l => 'Wet: ' + Math.round(100 * (NYA.WET_PACE + 0.1 * l)) + '% speed, ×' + (NYA.WET_DRAIN - 0.25 * l) + ' stamina' });
  def({ id: 'drain', bld: 'refinery', cur: 'sushi', name: 'Drain Pumps', max: 5, base: 40, growth: 3, show: sushiShow,
    desc: 'Pumps skim the highest flooded tile every 10 s (÷ rank). Slowly drains a flooded mine.', flavor: 'They go "glorp." Tora finds this soothing.',
    fx: l => l ? 'One tile every ' + (10 / l).toFixed(1) + ' s' : 'No pumps' });
  def({ id: 'wasabi', bld: 'refinery', cur: 'sushi', name: 'Wasabi Kick', max: 30, base: 30, growth: 2.3, show: sushiShow,
    desc: '+10% Power for every miner (compounding).', flavor: 'Clears the sinuses. And the bedrock, apparently.',
    fx: l => 'Power ×' + NYA.fmt(Math.pow(1.1, l)) });
  def({ id: 'otoro', bld: 'refinery', cur: 'sushi', name: 'Otoro Platter', max: 40, base: 60, growth: 2.3, show: sushiShow,
    desc: 'Catnip ×1.25 (compounding). The finest cut, served on the ore.', flavor: 'Tora says it brings out the catnip\u2019s "umami." Nobody knows what that means for catnip.',
    fx: l => 'Catnip ×' + NYA.fmt(Math.pow(1.25, l)) });

  // ---------------- Cheese (from the Mousehole Maze): Tora's Cheese Cave and the R&D Defense branch ----------------
  const cheeseShow = g => g.s.cheese > 0 || g.s.maxTierReached >= 6;
  def({ id: 'gouda', bld: 'refinery', cur: 'cheese', name: 'Aged Gouda', max: 40, base: 30, growth: 2.3, show: cheeseShow,
    desc: 'Catnip ×1.25 (compounding), in every mine.', flavor: 'Tora wants it in the Blend. Nobody else does.',
    fx: l => 'Catnip ×' + NYA.fmt(Math.pow(1.25, l)) });
  def({ id: 'cannons', bld: 'lab', branch: 'Defense', cur: 'cheese', name: 'Hairball Cannons', max: 4, base: 15, growth: 4, show: cheeseShow,
    desc: '+1 turret slot in mouse mines.', flavor: 'Doc Boom’s design. The hairballs are locally sourced.',
    fx: l => (NYA.TURRET_BASE + l) + ' turrets' });
  def({ id: 'caliber', bld: 'lab', branch: 'Defense', cur: 'cheese', name: 'Bigger Hairballs', max: 30, base: 10, growth: 2.3, show: cheeseShow,
    desc: 'Turret damage ×1.5 (compounding).', flavor: 'Please don’t ask where the bigger ones come from.',
    fx: l => 'Turret damage ×' + NYA.fmt(Math.pow(1.5, l)) });
  def({ id: 'combat', bld: 'lab', branch: 'Defense', cur: 'cheese', name: 'Mouser Drills', max: 30, base: 12, growth: 2.3, show: cheeseShow,
    desc: 'Your crew hits mice ×1.5 harder (compounding).', flavor: 'Sgt. Paws runs them. There is a lot of shouting about “the pounce.”',
    fx: l => 'Damage vs mice ×' + NYA.fmt(Math.pow(1.5, l)) });
  def({ id: 'chan', bld: 'lab', branch: 'Defense', cur: 'cheese', name: 'Turret-chan’s Study Group', max: 2, base: 40, growth: 6, show: cheeseShow,
    desc: 'Turret-chan places better turrets. Rank 1: no more turret by the elevator “for vibes.” Rank 2: she spreads them across the nests instead of piling them onto the first one.', flavor: '“I-I read a book about chokepoints!”',
    fx: l => ['Vibes turret, then piles onto one nest', 'No vibes turret', 'Spreads turrets across nests'][Math.min(2, l)] });

  // ---------------- Greebles (from the Greeble Crash Site): Saucer Salvage and the R&D Xenology branch ----------------
  const greebleShow = g => g.s.greebles > 0 || g.s.maxTierReached >= 8;
  def({ id: 'salvage', bld: 'refinery', cur: 'greebles', name: 'Saucer Salvage', max: 40, base: 5, growth: 2.3, show: greebleShow,
    desc: 'Catnip ×1.25 (compounding), in every mine.', flavor: 'Tora bolted a greeble to the Refinery. It hums. The catnip comes out shinier. Nobody asks questions.',
    fx: l => 'Catnip ×' + NYA.fmt(Math.pow(1.25, l)) });
  def({ id: 'treats', bld: 'lab', branch: 'Xenology', cur: 'greebles', name: 'Greeble Treats', max: 8, base: 3, growth: 2.2, show: greebleShow,
    desc: 'Greebles scoot 8% slower (compounding). Easier to run down, and they don’t get as far before they’re cornered.', flavor: 'They’re just bolts. The greebles love them anyway.',
    fx: l => 'Greeble speed ×' + Math.pow(0.92, l).toFixed(2) });

  // ---------------- Barracks ----------------
  // Crew size is the biggest multiplier in the game, so every bunk is hand-priced and the
  // Barracks only has room for more as you dig deeper. BUNKS[i] is the bunk that takes you
  // from i+1 to i+2 active slots.
  NYA.BUNKS = [
    { cost: 15 },
    { cost: 90 },
    { cost: 1500, tier: 2 },
    { cost: 4e4, fc: [2, 2] },
    { cost: 1e6, tier: 3 },
    { cost: 2.5e7, fc: [3, 2] },
    { cost: 6e8, tier: 4 },
    { cost: 2e11, tier: 5 },
    { cost: 2e14, tier: 6 },
    { cost: 5e16, tier: 7 },
    { cost: 2e18, tier: 8 },
  ];
  NYA.bunkReq = function (g) {
    const b = NYA.BUNKS[g.lvl('bunk')];
    if (!b) return null;
    if (b.tier && g.s.maxTierReached < b.tier) return 'Reach Tier ' + b.tier + ' (' + NYA.TIERS[b.tier].name + ') to make room';
    // perfect clears pace crew growth, but never send you back: reaching a deeper mine counts too (playtest)
    if (b.fc && g.fc(b.fc[0]) < b.fc[1] && !g.easyClear(b.fc[0]) && g.s.maxTierReached <= b.fc[0]) return NYA.fcReqText(g, b.fc[0], b.fc[1]) + ', or reach a deeper mine';
    return null;
  };
  def({ id: 'bunk', bld: 'barracks', name: 'Bunk Beds', max: NYA.BUNKS.length, costs: NYA.BUNKS.map(b => b.cost),
    req: g => NYA.bunkReq(g),
    desc: '+1 active crew slot. Each bunk is hand-built, and the Barracks only has room for more as you dig deeper.', flavor: 'Top bunk is contested. Violently. Adorably.',
    fx: l => (1 + l) + ' active slots' });
  def({ id: 'lockers', bld: 'barracks', name: 'Reserve Lockers', max: 4, base: 150, growth: 5,
    show: g => g.s.hires >= 2,
    desc: '+1 reserve slot. Reserves keep their levels and traits; swap between episodes for free.', flavor: 'Each locker contains one (1) emergency nap pillow.',
    fx: l => (2 + l) + ' reserve slots' });
  def({ id: 'montage', bld: 'barracks', name: 'Training Montage', max: 4, costs: [120, 2500, 6e4, 2e6],
    show: g => g.s.lifetimeCatnip >= 60,
    desc: 'Raises the level cap: 5 → 10 → 15 → 20 → 30.', flavor: 'Comes with a real 80s training montage. The song is non-negotiable.',
    fx: l => 'Level cap ' + NYA.LEVEL_CAPS[l] });

  // ---------------- R&D Lab: Excavation ----------------
  def({ id: 'pick', bld: 'lab', branch: 'Excavation', name: 'Sharper Pickaxe', max: 60, base: 10, growth: 2.1,
    desc: '+20% Power (compounding).', flavor: 'Doc Boom sharpened it with another pickaxe. Then sharpened that one.',
    fx: l => 'Power ×' + NYA.fmt(Math.pow(1.2, l)) });
  def({ id: 'grip', bld: 'lab', branch: 'Excavation', name: 'Grippy Paw Pads', max: 30, base: 60, growth: 2.4,
    show: g => g.lvl('pick') >= 2,
    desc: '+10% Haste (compounding).', flavor: 'Tiny rubber beans for tiny rubber beans.',
    fx: l => 'Haste ×' + NYA.fmt(Math.pow(1.1, l)) });
  def({ id: 'claws', bld: 'lab', branch: 'Excavation', name: 'Claw Sharpening', max: 60, base: 300, growth: 2.6,
    show: g => g.s.stats.swings >= 300,
    desc: '+3% chance for a critical swing (×3 damage, loud "NYA!"). Past 40% crit, 30% of it focuses into ×1.65 Power, like swing techniques.', flavor: 'The scratching post finally pays for itself.',
    fx: l => (3 + 3 * l) + '% crit (before focus)' });
  def({ id: 'resonance', bld: 'lab', branch: 'Excavation', name: 'Groove Theory', max: 1, base: 1800, timer: 20,
    show: g => g.s.maxTierReached >= 2,
    desc: 'Grooved stone chains also crack every ordinary stone tile touching the chain (25% each).', flavor: '"Rocks are just very slow dominoes." — Doc Boom, unprompted',
    fx: l => l ? 'Chains spread' : '' });

  // ---------------- R&D Lab: Logistics ----------------
  def({ id: 'bags', bld: 'lab', branch: 'Logistics', name: 'Bigger Bags', max: 30, base: 20, growth: 2.1,
    show: g => g.s.episodes >= 2,
    desc: '+1 Carry.', flavor: 'Same bag. More pockets. Pockets inside pockets.',
    fx: l => '+' + l + ' Carry' });
  def({ id: 'boots', bld: 'lab', branch: 'Logistics', name: 'Comfy Boots', max: 25, base: 30, growth: 2.3,
    show: g => g.s.episodes >= 3,
    desc: '+10% Pace (compounding).', flavor: 'Toe beans deserve support.',
    fx: l => 'Pace ×' + NYA.fmt(Math.pow(1.1, l)) });
  // hand-priced so the 9 drills spread across Tiers 1-4 instead of maxing out before Tier 3
  def({ id: 'drills', bld: 'lab', branch: 'Logistics', name: 'Pack-Up Drills', max: 9, costs: [40, 300, 2500, 2e4, 2e5, 3e6, 5e7, 1e9, 3e10],
    show: g => g.s.episodes >= 4,
    desc: '−0.5 s Pack-Up Time between episodes (6 s → 1.5 s floor).', flavor: 'Sgt. Paws times them with an egg timer shaped like a fish.',
    fx: l => 'Pack-up ' + (6 - 0.5 * l).toFixed(1) + ' s' });

  // ---------------- R&D Lab: Personnel ----------------
  def({ id: 'snacks', bld: 'lab', branch: 'Personnel', name: 'Stamina Snacks', max: 60, base: 12, growth: 2.1,
    desc: '+15% Stamina (compounding).', flavor: 'Fish crackers. Industrial quantities.',
    fx: l => 'Stamina ×' + NYA.fmt(Math.pow(1.15, l)) });
  def({ id: 'grit', bld: 'lab', branch: 'Personnel', name: 'Grit Training', max: 80, base: 300, growth: 1.75,
    show: g => g.s.maxTierReached >= 2 || g.s.lifetimeCatnip >= 600,
    desc: '+4 Grit (each Grit point cuts swing stamina cost ~1%, multiplicatively).', flavor: 'Mostly yelling. Some push-ups.',
    fx: l => '+' + (4 * l) + ' Grit' });
  def({ id: 'focus', bld: 'lab', branch: 'Personnel', name: 'Focus Seminar', max: 6, base: 200, growth: 3.6,
    show: g => g.s.lifetimeCatnip >= 150,
    desc: '+1 Focus: miners compare one more candidate tile before choosing.', flavor: 'A PowerPoint titled "Rocks: Which One?"',
    fx: l => '+' + l + ' Focus' });
  def({ id: 'resume', bld: 'lab', branch: 'Personnel', name: 'Résumé Reader', max: 1, base: 400, timer: 10,
    // after the first run it's there from the start: anchored catgirls mean you may hire very few (playtest)
    show: g => g.s.hires >= 3 || g.s.season > 1,
    desc: 'Reveals each catgirl’s hidden Aptitude (C to S), which scales her growth per level.', flavor: 'Turns out the résumés were written in paw. Doc Boom built a translator.',
    fx: l => l ? 'Aptitude visible' : '' });

  // ---------------- R&D Lab: Ordnance ----------------
  def({ id: 'blunt', bld: 'lab', branch: 'Ordnance', name: 'Catnip Blunt', max: 1, base: 35, timer: 4,
    show: g => g.s.episodes >= 3,
    desc: 'ACTIVE [1]: restore 30% stamina to one miner (even a flopped one). 3 charges, 40 s each.', flavor: '"Medicinal." — Doc Boom',
    unlock: 'active:blunt' });
  def({ id: 'pouch', bld: 'lab', branch: 'Ordnance', name: 'Blunt Pouch', max: 4, base: 400, growth: 4,
    show: g => g.lvl('blunt') >= 1, req: g => g.lvl('blunt') ? null : 'Needs Catnip Blunt',
    desc: '+1 Blunt charge, +5% restore.', flavor: 'Hand-knitted. Smells incredible.',
    fx: l => (3 + l) + ' charges' });
  def({ id: 'bomb', bld: 'lab', branch: 'Ordnance', name: 'Hairball Bomb', max: 1, base: 150, timer: 8,
    show: g => g.s.lifetimeCatnip >= 80,
    desc: 'ACTIVE [2]: throw at a tile for heavy damage in a 3×3 area. 45 s cooldown.', flavor: 'Hand-coughed by volunteers. Do not ask how many.',
    unlock: 'active:bomb' });
  def({ id: 'bombdmg', bld: 'lab', branch: 'Ordnance', name: 'Denser Hairballs', max: 15, base: 600, growth: 2.4,
    show: g => g.lvl('bomb') >= 1, req: g => g.lvl('bomb') ? null : 'Needs Hairball Bomb',
    desc: '+60% Hairball Bomb damage.', flavor: 'More hair. More ball.',
    fx: l => 'Bomb ×' + NYA.fmt(1 + 0.6 * l) });
  def({ id: 'tuna', bld: 'lab', branch: 'Ordnance', name: 'Tuna Time!', max: 1, base: 1500, timer: 12,
    show: g => g.s.lifetimeCatnip >= 700,
    desc: 'ACTIVE [3]: every miner gets +50% Haste for 10 s. 90 s cooldown.', flavor: 'The sound of a can opener echoes through the mine. Every ear turns.',
    unlock: 'active:tuna' });
  def({ id: 'sonar', bld: 'lab', branch: 'Ordnance', name: 'Whisker Sonar', max: 1, base: 3500, timer: 15,
    show: g => g.s.maxTierReached >= 2,
    desc: 'ACTIVE [4]: reveal fog in a 7×7 area. 30 s cooldown. Also lets you see special-tile sparkles through fog.', flavor: 'Doc Boom attached a microphone to a whisker. It works. Nobody knows why.',
    unlock: 'active:sonar' });
  def({ id: 'hotbox', bld: 'lab', branch: 'Ordnance', name: 'Catnip Hotbox', max: 1, base: 6e4, timer: 25,
    show: g => g.s.maxTierReached >= 3,
    desc: 'ACTIVE [5]: place on an open tile. Every catgirl rushes over for a puff (22% stamina each, more with Blunt Pouch), waking anyone who flopped. 5 min cooldown.', flavor: 'The single biggest "make or break" button for full clears.',
    unlock: 'active:hotbox' });
  def({ id: 'treat', bld: 'lab', branch: 'Ordnance', name: 'Treat Bag', max: 1, base: 6000, timer: 10,
    show: g => g.s.maxTierReached >= 2 && g.s.lifetimeCatnip >= 4000,
    desc: 'ACTIVE [6]: one catgirl earns double XP for 1 minute (it carries over between episodes). 3 min cooldown. Perfect for fishing a trait in the right mine.', flavor: 'Crinkle crinkle. Every head in the mine turns.',
    unlock: 'active:treat' });
  def({ id: 'catterall', bld: 'lab', branch: 'Ordnance', name: 'Catterall', max: 1, base: 1.5e6, timer: 30,
    show: g => g.s.maxTierReached >= 3,
    desc: 'ACTIVE [7]: for 90 s every miner gets +50% Pace and Haste, +50% max stamina and 0% Whimsy. Lasts across episodes. 20 min cooldown.', flavor: 'Pupils go to pinpricks. Tails stop swishing. The crew mines in total silence. It is deeply unsettling.',
    unlock: 'active:catterall' });
  // Project MEWCLEAR: ten stages, each with its own bonus, and each waiting on a deeper mine (playtest: with +1 Sonar
  // radius a stage, the whole set by ~1h in Season 1 gave full sight of every mine, and the warhead itself was weak
  // for its cooldown). NYA.MEWCLEAR_STAGES[l] is stage l: the mine it waits for and what it adds.
  NYA.MEWCLEAR_STAGES = [null,
    { tier: 2, fx: 'Hairball Bomb damage ×1.5' },
    { tier: 2, fx: 'Whisker Sonar 9×9 (was 7×7)' },
    { tier: 3, fx: 'Hairball Bomb cooldown −25%' },
    { tier: 4, fx: 'Hairball Bombs blast 2 tiles out' },
    { tier: 6, fx: 'Turret damage ×2' },
    { tier: 7, fx: 'Ore a Hairball Bomb hits starts Glowing (+2 quality)' },
    { tier: 7, fx: 'Crystal resonance ×1.5' },
    { tier: 8, fx: 'Greebles scoot 15% slower' },
    { tier: 8, fx: '+25% XP' },
    { tier: 8, fx: 'THE MEWCLEAR OPTION' },
  ];
  def({ id: 'mewclear', bld: 'lab', branch: 'Ordnance', name: 'Project MEWCLEAR', max: 10,
    costs: [6000, 4e4, 5e6, 3e8, 3e13, 1e15, 3e16, 3e17, 1e18, 3e18],
    timer: 30, show: g => g.s.maxTierReached >= 2 || g.s.lifetimeCatnip >= 1500,
    req: g => { const st = NYA.MEWCLEAR_STAGES[g.lvl('mewclear') + 1]; return st && g.s.maxTierReached < st.tier ? 'Doc Boom needs samples from deeper down: reach Tier ' + st.tier + ' (' + NYA.TIERS[st.tier].name + ')' : null; },
    desc: 'A ten-stage research project. Each stage adds its own bonus, and Doc Boom needs samples from deeper mines to keep going. Stage 10 unlocks THE MEWCLEAR OPTION.', flavor: 'The engineers are hammering nails into a warhead made of plywood.',
    fx: l => l ? 'Stage ' + l + ': ' + NYA.MEWCLEAR_STAGES[l].fx : 'Not started' });

  // ---------------- R&D Lab: Exploration ----------------
  def({ id: 'spray', bld: 'lab', branch: 'Exploration', name: 'Spray Bottle', max: 1, base: 60, timer: 4,
    show: g => g.s.episodes >= 4,
    desc: 'TOOL [S]: mark tiles as forbidden. Miners refuse to mine them (and make a face).', flavor: 'Pssht. PSSHT.',
    unlock: 'tool:spray' });
  def({ id: 'batteries', bld: 'lab', branch: 'Exploration', name: 'Laser Batteries', max: 6, base: 45, growth: 3.3,
    show: g => g.s.stats.marks >= 5 || g.s.episodes >= 5,
    desc: '+1 laser mark at a time.', flavor: 'AAA. Triple-A. Like the catnip, if Tora is to be believed.',
    fx: l => (3 + l) + ' marks' });
  // steep: darkness only grows every two tiers (nip value ×100), so each lamp should cost a couple of tiers' worth
  def({ id: 'headlamp', bld: 'lab', branch: 'Exploration', name: 'Headlamps', max: 20, base: 400, growth: 25,
    show: g => g.s.lifetimeCatnip >= 300,
    desc: '+1 Sight. Miners notice ore one tile further away, and opened tiles reveal one tile further. Deeper mines are darker and eat Sight.',
    flavor: 'Mostly lights up the inside of the hard hat. Mostly.',
    fx: l => 'Sight ' + (NYA.BASE_SIGHT + l) + ' (before darkness)' });
  def({ id: 'perfection', bld: 'lab', branch: 'Exploration', name: 'Perfectionism', max: 5, base: 160, growth: 3.2,
    show: g => g.s.stats.fullClears >= 1,
    desc: '+15% Full-Clear Bonus multiplier (×1.25 → ×2.0).', flavor: 'An A is just a failed S.',
    fx: l => 'Full clear ×' + (1.25 + 0.15 * l).toFixed(2) });
  def({ id: 'radar', bld: 'lab', branch: 'Exploration', name: 'Meowtherlode Radar', max: 5, base: 900, growth: 3,
    show: g => g.s.lifetimeCatnip >= 500,
    desc: '+1.5% chance per mine that one catnip tile rolls an absurd density (30–50).', flavor: 'Beeps near big catnip. Also near Tora.',
    fx: l => (2 + 1.5 * l).toFixed(1) + '% / mine' });
  def({ id: 'enrich', bld: 'lab', branch: 'Exploration', name: 'Ore Enrichment', max: 10, base: 4000, growth: 2.8,
    show: g => g.s.maxTierReached >= 2,
    desc: '+4% chance each catnip tile rolls +1 quality at generation.', flavor: 'Doc Boom whispers encouragement to the bedrock.',
    fx: l => (4 * l) + '% +quality' });
  // Survey prices and perfect-clear counts are set so the next mine opens while the current one is still chewy (the
  // user's rule, CLAUDE.md): you often arrive "too early", and the deep mines, not the prices, are the prestige wall.
  // Check with tools/frontier.js.
  // Surveys ask you to prove yourself (perfect clears of the previous mine) only the first time ever.
  // Once you've been to a mine, later runs just pay for the survey: you know the way down.
  // One easy clear (crew above half stamina, NYA.EASY_CLEAR) proves it too: no grinding a mine you've outclassed.
  NYA.fcReqText = (g, t, n) => 'Full-clear ' + NYA.TIERS[t].name + ' ' + n + ' times (' + g.fc(t) + '/' + n + '), or once with the crew above half stamina';
  NYA.surveyReq = function (g, tier, fcTier, n) {
    if ((g.s.life.maxTier || 0) >= tier) return null;
    return g.fc(fcTier) >= n || g.easyClear(fcTier) ? null : NYA.fcReqText(g, fcTier, n);
  };
  def({ id: 'mine2', bld: 'lab', branch: 'Exploration', name: 'Survey: Scratching Post Quarry', max: 1, base: 600, timer: 10,
    show: g => g.s.stats.fullClears >= 1,
    req: g => NYA.surveyReq(g, 2, 1, 2),
    desc: 'Unlocks Tier 2 — Scratching Post Quarry. Grooved stone shatters in chains.', flavor: 'Prove you’re ready before you’re allowed to be underprepared.',
    unlock: 'mine:2' });
  def({ id: 'mine3', bld: 'lab', branch: 'Exploration', name: 'Survey: Yarnball Caverns', max: 1, base: 3.6e4, timer: 20,
    show: g => g.s.maxTierReached >= 2,
    req: g => NYA.surveyReq(g, 3, 2, 2),
    desc: 'Unlocks Tier 3 — Yarnball Caverns. Tangles, air pockets… and Schrödinger’s Box.', flavor: 'Somewhere down there, something hums.',
    unlock: 'mine:3' });

  def({ id: 'mine4', bld: 'lab', branch: 'Exploration', name: 'Survey: Dairy Depths', max: 1, base: 6e6, timer: 30,
    show: g => g.s.maxTierReached >= 3,
    // no Skein gate (spoiler, and the user wants Dairy Depths reachable first run), but priced so the
    // Skein usually turns up first (check with tools/skeinrace.js)
    req: g => NYA.surveyReq(g, 4, 3, 2),
    desc: 'Unlocks Tier 4 — Dairy Depths. Milk nodes, pumpjacks and pipes… and a new resource: MILK.', flavor: 'Doc Boom swears the cave is "lactating." Nobody asked her to elaborate.',
    unlock: 'mine:4' });
  def({ id: 'mine5', bld: 'lab', branch: 'Exploration', name: 'Survey: Sushi Grotto', max: 1, base: 3e8, timer: 40,
    show: g => g.s.maxTierReached >= 4,
    req: g => NYA.surveyReq(g, 5, 4, 2),
    desc: 'Unlocks Tier 5 — Sushi Grotto. Flooded chambers, wet catgirls… and wild nigiri: a new resource, SUSHI.', flavor: 'Doc Boom packed a snorkel. And a lunchbox. Mostly the lunchbox.',
    unlock: 'mine:5' });
  def({ id: 'mine6', bld: 'lab', branch: 'Exploration', name: 'Survey: Mousehole Maze', max: 1, base: 5e10, timer: 50,
    show: g => g.s.maxTierReached >= 5,
    req: g => NYA.surveyReq(g, 6, 5, 2),
    desc: 'Unlocks Tier 6 — Mousehole Maze. Mouse nests, mice, turrets… and a new resource: CHEESE.', flavor: 'Doc Boom’s survey drone came back covered in tiny bite marks.',
    unlock: 'mine:6' });
  def({ id: 'mine7', bld: 'lab', branch: 'Exploration', name: 'Survey: Crystal Catacombs', max: 1, base: 1e13, timer: 60,
    show: g => g.s.maxTierReached >= 6,
    req: g => NYA.surveyReq(g, 7, 6, 2),
    desc: 'Unlocks Tier 7 — Crystal Catacombs. Crystal catnip that refracts lasers and rings when struck. The purrmit costs SUSHI.', flavor: 'Doc Boom tapped the survey core with a spoon. It sang for twenty minutes.',
    unlock: 'mine:7' });
  def({ id: 'mine8', bld: 'lab', branch: 'Exploration', name: 'Survey: Greeble Crash Site', max: 1, base: 5e16, timer: 60,
    show: g => g.s.maxTierReached >= 7,
    req: g => NYA.surveyReq(g, 8, 7, 2),
    desc: 'Unlocks Tier 8 — Greeble Crash Site. A crashed saucer full of greebles, little alien doodads that run away. The purrmit costs SUSHI.', flavor: 'Doc Boom’s survey drone came back with a greeble stuck to it. It would not stop beeping.',
    unlock: 'mine:8' });
  def({ id: 'fork', bld: 'lab', branch: 'Excavation', name: 'Tuning Forks', max: 10, base: 2e14, growth: 3,
    show: g => g.s.maxTierReached >= 7,
    desc: '+15% resonance: hits on crystals ring harder into their neighbours, and shattering crystals pulse harder.', flavor: 'A-flat. Always A-flat. Crystals hate A-flat.',
    fx: l => 'Resonance ×' + (1 + 0.15 * l).toFixed(2) });
  def({ id: 'junctions', bld: 'lab', branch: 'Logistics', name: 'Pipe Junctions', max: 1, base: 6e7, timer: 20,
    show: g => g.s.maxTierReached >= 4,
    desc: 'New pipes connect to an existing line instead of running all the way back. Clustered milk nodes get much cheaper.', flavor: 'It\u2019s a T-shaped bit of pipe. Doc Boom wants a Nobel.' });

  // ---------------- Purrmit Office: Standing Orders ----------------
  def({ id: 'coproc', bld: 'pochi', cur: 'greebles', name: 'Greeble Co-processors', max: 10, base: 4, growth: 1.8, show: g => g.s.greebles > 0 || g.s.maxTierReached >= 8,
    desc: '+2 Requisition Points for standing orders.', flavor: 'Doc Boom wired a greeble into Pochi’s fax machine. It files things now. Pochi is furious and impressed.',
    fx: l => '+' + (2 * l) + ' RP' });
  def({ id: 'cabinet', bld: 'pochi', name: 'Filing Cabinets', max: 10, base: 500, growth: 3.4,
    desc: '+2 Requisition Points for standing orders.', flavor: 'Pochi alphabetizes them. Then re-alphabetizes them.',
    fx: l => '+' + (2 * l) + ' RP' });

  NYA.UPGRADES = U;
  NYA.UPG = {};
  for (const u of U) NYA.UPG[u.id] = u;

  NYA.LEVEL_CAPS = [5, 10, 15, 20, 30];

  NYA.upgCost = function (u, level) {
    if (u.costs) return u.costs[level] !== undefined ? u.costs[level] : Infinity;
    return Math.ceil(u.base * Math.pow(u.growth || 1, level));
  };

  // MEWCLEAR progress notes (GDD §7.1)
  NYA.MEWCLEAR_NOTES = [
    'The engineers are hammering nails into… something.',
    'Acquired plywood.',
    'Structural duct tape applied. Structurally.',
    'Nails. So many nails.',
    'Found a fin. Taped fin to it.',
    'Doc Boom says the uranium is “basically catnip if you think about it.”',
    'Someone drew a face on it. The face is staying.',
    'It hums now. Nobody knows why.',
    'Tora has filed a formal complaint. Nyandeyanen.',
    'Painted it pink for morale.',
    'IT WORKS?? IT WORKS!!',
  ];

  // ---------------- Active abilities (GDD §7) ----------------
  NYA.ACTIVES = {
    blunt: { name: 'Catnip Blunt', key: '1', icon: '🌿', cd: 40, target: 'miner', desc: 'Restore 30% stamina to one miner. Works on flopped miners too. Tolerance: each extra dose on the same catgirl this shift is 20% weaker.' },
    bomb: { name: 'Hairball Bomb', key: '2', icon: '💣', cd: 45, target: 'tile', desc: 'Heavy damage in a 3×3 area. Ore drops on the floor for pickup.' },
    tuna: { name: 'Tuna Time!', key: '3', icon: '🐟', cd: 90, target: 'none', desc: '+50% Haste for every miner for 10 s.' },
    sonar: { name: 'Whisker Sonar', key: '4', icon: '📡', cd: 30, target: 'tile', desc: 'Reveal the fog in a 7×7 area.' },
    hotbox: { name: 'Catnip Hotbox', key: '5', icon: '📦', cd: 300, target: 'open', desc: 'Every catgirl rushes to the box and takes a puff (22% stamina, tolerance applies), waking anyone who flopped.' },
    treat: { name: 'Treat Bag', key: '6', icon: '🍬', cd: 180, target: 'miner', desc: 'One catgirl earns double XP for 1 minute.' },
    catterall: { name: 'Catterall', key: '7', icon: '👁️', cd: 1200, target: 'none', desc: '90 s of +50% Pace, Haste and max stamina, and 0% Whimsy. Lasts across episodes. Silent. Unsettling.' },
    mewclear: { name: 'THE MEWCLEAR OPTION', key: '9', icon: '☢️', cd: 1800, target: 'tile', desc: 'Clears a massive radius, bedrock included. Every bit of catnip inside is refined on the spot (×2) and lands in the haul, mice in it are gone, greebles in it are yours. Ore at the blast edge becomes Glowing Nip (+2 quality).' },
  };
  NYA.ACTIVE_ORDER = ['blunt', 'bomb', 'tuna', 'sonar', 'hotbox', 'treat', 'catterall', 'mewclear'];

  // Tora's Special Blend payout table (GDD §6.2): EV ≈ ×1.18
  NYA.BLEND_TABLE = [[0.5, 35], [1, 30], [1.5, 18], [2, 10], [3, 5], [4, 2]];
  NYA.BLEND_LINES = {
    start: ['Alright, boss. Half the output goes in the pot. Don’t look at me like that.', 'Tora’s Special Blend! Secret recipe! Mostly catnip! Some hope!'],
    mid: ['It’s bubblin’. Is it supposed to bubble? …It’s supposed to bubble.', 'Smells like money. Or burnt toast. One of those.', 'Don’t touch the pot. DON’T. TOUCH. THE POT.', 'I’m stirrin’ with my harisen. For luck.'],
    bad: ['…Nyandeyanen. The blend… it curdled. HOW DOES CATNIP CURDLE?!', 'We’ll call this one "a learning experience." I learned to hate it.'],
    even: ['Broke even! That’s basically winnin’! …Right?', 'Huh. Exactly what we put in. The pot has no sense of drama.'],
    good: ['MECCHA GOOD! The blend sings! I SING!', 'Look at that! LOOK AT IT! Somebody frame this pot!'],
    jackpot: ['QUADRUPLE?! I— I need to sit down. Someone hold my harisen. I’m— *faints*', 'THE LEGENDARY BLEND! My grandma’s grandma’s recipe WORKED!'],
  };

  // ---------------- Standing orders (GDD §11) ----------------
  NYA.ORDERS = {
    repeat: { name: 'Auto-Repeat', rp: 1, desc: 'Roll straight into the next episode after Pack-Up.' },
    cast_blunt: { name: 'Auto-cast: Catnip Blunt', rp: 2, active: 'blunt', desc: 'Blunt any miner who flops, while charges last.' },
    // user idea: makes max Blunt charges matter in an auto-casting build
    blunt_rotation: { name: 'Blunt Rotation', rp: 1, minBlunts: 6, desc: 'Once auto-cast Blunts run dry, they wait until every charge is back before handing them out again. Saves up a full round for when the whole crew flops. (Your own Blunts are unaffected.)' },
    cast_bomb: { name: 'Auto-cast: Hairball Bomb', rp: 2, active: 'bomb', desc: 'Throw at the richest visible ore cluster when ready.' },
    cast_tuna: { name: 'Auto-cast: Tuna Time!', rp: 2, active: 'tuna', desc: 'Cast when most of the crew is mining.' },
    cast_sonar: { name: 'Auto-cast: Whisker Sonar', rp: 2, active: 'sonar', desc: 'Ping the fog at the edge of the dig.' },
    cast_hotbox: { name: 'Auto-cast: Catnip Hotbox', rp: 2, active: 'hotbox', desc: 'Drop it when half the crew is below 20% stamina.' },
    auto_hire: { name: 'HR Policy: Auto-Hire', rp: 2, desc: 'Hire a recruit whenever an active slot is empty and you can afford it.' },
    tanuki_buy: { name: 'Tanuki Auto-Buy', rp: 8, tanuki: true, desc: 'Buy every Tanuki offer you can afford and run queued event mines automatically. The hungriest order in the game.' },
  };
  NYA.ORDER_ORDER = ['repeat', 'cast_blunt', 'blunt_rotation', 'cast_bomb', 'cast_tuna', 'cast_sonar', 'cast_hotbox', 'auto_hire', 'tanuki_buy'];
})(globalThis.NYA = globalThis.NYA || {});
