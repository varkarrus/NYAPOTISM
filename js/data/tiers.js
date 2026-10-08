// Mine (tier) definitions and the scaling table from GDD §6.3.
(function (NYA) {
  'use strict';

  // Tile types
  NYA.T = {
    OPEN: 0, DIRT: 1, STONE: 2, HARD: 3, BEDROCK: 4, ORE: 5, BOX: 6, ELEV: 7, GROOVE: 8, MILK: 9, NEST: 10,
  };
  const T = NYA.T;
  NYA.TILE_NAME = ['Open', 'Dirt', 'Stone', 'Hardstone', 'Bedrock', 'Catnip Ore', "Schrödinger's Box", 'Elevator', 'Grooved Stone', 'Milk Node', 'Mouse Nest'];
  NYA.BASE_HP = { [T.DIRT]: 10, [T.STONE]: 25, [T.HARD]: 80, [T.GROOVE]: 25, [T.BOX]: 120, [T.NEST]: 300 };
  NYA.ORE_LAYER_HP = 15;

  // Per-tier scaling (GDD §6.3)
  NYA.tierBase = t => Math.pow(10, t - 1);       // nip value
  // HP and resistance outgrow nip value enough that a new mine only pays well once Power and Grit catch
  // up (playtest: moving up shouldn't be an instant big gain). Stay-vs-jump at unlock: ~2x, was 3-4x.
  // A tier can set diffTier to be as tough as a (fractional) tier: the Mousehole Maze is a sidegrade.
  NYA.tierDiff = t => (NYA.TIERS && NYA.TIERS[t] && NYA.TIERS[t].diffTier) || t;
  NYA.tierHP = t => { const d = NYA.tierDiff(t); return Math.pow(NYA.HP_GROWTH, d - 1) * Math.pow(NYA.DEEP_HP, Math.max(0, d - 4)); }; // tile HP
  NYA.HP_GROWTH = 5;
  // Past Dairy Depths you only arrive after a few prestiges' worth of Loom and milk multipliers: on arrival at
  // Tier 5 the crew broke stone in 0.35 swings and had ~2000 swings of stamina (Tier 4 in Season 1: ~5 and
  // ~250), so the rock was easier than Dairy Depths. Deep tiers toughen faster to make up for it.
  NYA.DEEP_HP = 15; // 10 → 15 with the pacing rebalance: Sushi Grotto opens in Season 1 as the first prestige wall
  NYA.DEEP_RESIST = 5;
  NYA.WALK_DRAIN = 1 / 16; // walking drains this share of a miner's mining stamina per second (1/16 × base Haste 2 = the old flat ⅛)
  NYA.WALK_FOOTING = 0.5;  // walking drain per second ÷ footing^this: slick floors stretch a walk, and it costs √ of that in stamina
  NYA.tierResist = t => { const d = NYA.tierDiff(t); return Math.pow(2.0, d - 1) * Math.pow(NYA.DEEP_RESIST, Math.max(0, d - 4)); }; // stamina per swing
  // Richness: ore is worth an extra RICH_STEP per tier on top of tierBase's ×10. Mines are paced so the next one or two
  // open before a crew outgrows the current one (CLAUDE.md), which means shifts run longer with weaker crews; richer
  // ore keeps catnip per second where it was.
  NYA.tierRich = t => Math.pow(NYA.RICH_STEP, NYA.tierDiff(t) - 1);
  NYA.RICH_STEP = 1.35;
  NYA.tierXP = t => Math.pow(2.5, t - 1);         // XP per swing / item

  // Counter-pressures: every stat faces something that grows each tier, so upgrading it keeps
  // mattering in your current mine while early mines become trivial (see docs/HANDOFF.md).
  // Carry <- density: deeper ore is denser (more items per tile)...
  NYA.tierDensityP = t => Math.min(0.85, 0.3 + 0.06 * (t - 1)); // geometric "one more layer" chance
  NYA.tierDensityCap = t => 10 + 2 * t;
  // ...but crumblier: HP per item shrinks with depth, so density costs bag space more than time.
  NYA.tierCrumble = t => Math.pow(0.88, t - 1);
  // From Tier 3, every ore tile holds this many times more items, each worth (and as tough, and as much XP as)
  // that much less: a tile pays and breaks the same, but bags fill as fast as Bigger Bags grows them. Playtest:
  // by Tier 3 crews cleared half the mine before anyone's bag was full, so the haul read 0 for half the shift.
  NYA.tierDensityMult = t => Math.max(1, t - 1);
  // Headlamps <- darkness: Sight = BASE_SIGHT + headlamps - darkness.
  NYA.BASE_SIGHT = 3;
  NYA.tierDarkness = t => Math.floor((t - 1) / 2);   // T1-2: 0, T3-4: 1, T5-6: 2, ...
  NYA.MAX_NOTICE = 8; NYA.MAX_REVEAL = 6;
  // Pace <- rough ground: mud patches (permanent) and rubble left by broken rock (trampled flat after a
  // couple of crossings). Both start at Tier 2 and spread with depth; mines also widen each tier.
  NYA.tierMud = t => t < 2 ? 0 : Math.min(0.3, 0.06 * (t - 1));     // share of the mine floor that's mud
  NYA.tierRubble = t => t < 2 ? 0 : Math.min(0.6, 0.12 * (t - 1));  // chance a broken rock tile leaves rubble
  NYA.RAMPAGE_TIRED = 0.2; // Destructive Urges heads home with her bag below this share of her stamina
  NYA.LONER_PENALTY = 3;
  // Phone a Psychic: every PSYCHIC_GAP s (±) she spends PSYCHIC_CALL s on the phone, then PSYCHIC_TIME s of
  // perfect focus that sees through fog (she heads for the best ore in the mine, seen or not)
  NYA.BURIED_WRIGGLE = 4; // "Funny Story…": seconds before she wriggles out alone, once nobody else is left to dig her out
  NYA.PSYCHIC_GAP = [20, 35]; NYA.PSYCHIC_CALL = 3; NYA.PSYCHIC_TIME = 12;  // target-score penalty for a Loner on tiles near other miners or their targets
  // Pace <- footing: from Dairy Depths down the whole floor is slick (spilled milk, then standing water, then worse)
  // and walking speed is divided by this. Comfy Boots alone is ×1.1 a level, so without it crews crossed a Tier 4-6
  // mine in under a second (46-84 tiles/s) and walking fell from ~half of crew time to a quarter (playtest).
  NYA.tierFooting = t => { const d = NYA.tierDiff(t); return d < 4 ? NYA.FOOTING_EARLY[Math.max(0, Math.round(d) - 1)] : NYA.FOOTING_T4 * Math.pow(NYA.FOOTING_GROWTH, d - 4); };
  NYA.FOOTING_EARLY = [1, 1.3, 1.7]; // Tiers 1-3
  NYA.FOOTING_T4 = 4; NYA.FOOTING_GROWTH = 1.3;
  NYA.MUD_SLOW = 0.5; NYA.RUBBLE_SLOW = 0.65; NYA.TANGLE_SLOW = 0.4;
  NYA.RUBBLE_STEPS = 2;

  // Quality shapes & colors (never color alone — GDD §3.3)
  NYA.QUALITY = [
    null,
    { name: 'q1', shape: 'tri', color: '#5fe08a', dark: '#2f8f55', label: 'Common' },
    { name: 'q2', shape: 'square', color: '#57b8ff', dark: '#2b6fae', label: 'Fine' },
    { name: 'q3', shape: 'diamond', color: '#c77dff', dark: '#7b3fb5', label: 'Choice' },
    { name: 'q4', shape: 'star', color: '#ffd23f', dark: '#b8860b', label: 'Premium' },
    { name: 'q5', shape: 'heart', color: '#ff7eb6', dark: '#b23a74', label: 'Legendary', rainbow: true },
  ];
  NYA.qInfo = q => NYA.QUALITY[Math.min(5, Math.max(1, q))];

  NYA.TIERS = {
    1: {
      tier: 1, key: 'burrow', name: 'The Backyard Burrow', w: 16, h: 12,
      comp: { air: 0.07, bedrock: 0.08, ore: 0.12, hard: 0.0, stone: 0.38 },
      purrmit: 0, quirk: null, box: false,
      blurb: 'The starter. Dirt, stone, bedrock, catnip. Small enough to learn on, big enough to humble you.',
      pal: {
        floor: '#4a3646', floor2: '#574054', fog: '#140e1c', fog2: '#1c1527',
        dirt: '#9a6444', dirt2: '#b27752', dirt3: '#7a4c33',
        stone: '#7f7895', stone2: '#958eaa', stone3: '#615a77',
        hard: '#5b5370', hard2: '#6d6584', hard3: '#433c55',
        bed: '#241c31', bed2: '#30263f', bed3: '#3d2f52',
        accent: '#ff9e7a', sky: '#ffb3a7',
      },
      music: { key: 0, bpm: 98, prog: 'burrow' },
    },
    2: {
      tier: 2, key: 'quarry', name: 'Scratching Post Quarry', w: 20, h: 14,
      comp: { air: 0.06, bedrock: 0.08, ore: 0.12, hard: 0.08, stone: 0.62 },
      purrmit: 40, quirk: 'grooved', box: false,
      blurb: 'Stone-heavy, with hardstone veins. Quirk: GROOVED STONE shatters in a chain when one tile breaks.',
      pal: {
        floor: '#4d3638', floor2: '#5a4043', fog: '#130c11', fog2: '#1d1319',
        dirt: '#a8704d', dirt2: '#bf8660', dirt3: '#84553a',
        stone: '#b39b83', stone2: '#c9b39b', stone3: '#8e7862',
        hard: '#6e5866', hard2: '#836b7b', hard3: '#52404c',
        bed: '#261a22', bed2: '#33232e', bed3: '#45303e',
        accent: '#ffcf70', sky: '#ffd9a0',
      },
      music: { key: 2, bpm: 104, prog: 'quarry' },
    },
    3: {
      tier: 3, key: 'yarn', name: 'Yarnball Caverns', w: 26, h: 18,
      comp: { air: 0.14, bedrock: 0.07, ore: 0.12, hard: 0.13, stone: 0.55 },
      purrmit: 480, quirk: 'tangles', box: true,
      blurb: 'Twisting tunnels and big air pockets. Quirk: TANGLES slow anyone who walks through them. Schrödinger’s Box can appear here.',
      pal: {
        floor: '#3a3058', floor2: '#463a68', fog: '#0f0b1a', fog2: '#171226',
        dirt: '#a0607e', dirt2: '#b87595', dirt3: '#7c4862',
        stone: '#7d76b0', stone2: '#948dc6', stone3: '#5f598c',
        hard: '#4f4a7a', hard2: '#625c92', hard3: '#3a365e',
        bed: '#1d1830', bed2: '#28213f', bed3: '#3a2f5a',
        accent: '#7af0e0', sky: '#c9a8ff',
      },
      music: { key: 5, bpm: 110, prog: 'yarn' },
    },
  };
  NYA.TIERS[4] = {
    tier: 4, key: 'dairy', name: 'Dairy Depths', w: 28, h: 18,
    comp: { air: 0.09, bedrock: 0.08, ore: 0.11, hard: 0.12, stone: 0.55 },
    purrmit: 5760, quirk: 'milk', box: true,
    blurb: 'Creamy caverns over underground milk springs. Quirk: MILK NODES — a catgirl builds a pumpjack, lays pipe home, and pumps. Flow falls off with pipe length.',
    pal: {
      floor: '#3b4058', floor2: '#474d68', fog: '#0e1018', fog2: '#161a26',
      dirt: '#b39a7c', dirt2: '#cbb293', dirt3: '#8c765d',
      stone: '#9fb1c9', stone2: '#bccbe0', stone3: '#7a8aa3',
      hard: '#66748f', hard2: '#7a89a6', hard3: '#4c576d',
      bed: '#1c2030', bed2: '#262b40', bed3: '#3a4160',
      accent: '#fff3d6', sky: '#a8d8ff',
    },
    music: { key: 7, bpm: 96, prog: 'dairy' },
  };
  NYA.TIERS[5] = {
    tier: 5, key: 'sushi', name: 'Sushi Grotto', w: 30, h: 20,
    comp: { air: 0.08, bedrock: 0.08, ore: 0.10, hard: 0.15, stone: 0.55 },
    purrmit: 7e4, quirk: 'water', box: true,
    blurb: 'Flooded caverns with wild nigiri growing on the rocks. Quirk: WATER floods in when you open a chamber; wet catgirls walk at half speed and tire twice as fast. Nigiri drops SUSHI.',
    pal: {
      floor: '#2b3c4c', floor2: '#34485a', fog: '#0a121a', fog2: '#111c26',
      dirt: '#c2a77a', dirt2: '#d6bd92', dirt3: '#9c8560',
      stone: '#6f97a3', stone2: '#87b0bb', stone3: '#557883',
      hard: '#3f5f75', hard2: '#4f7189', hard3: '#2f4a5c',
      bed: '#141e2a', bed2: '#1c2a3a', bed3: '#2b3f55',
      accent: '#7ad7f0', sky: '#8fd6e8',
    },
    music: { key: 9, bpm: 92, prog: 'sushi' },
  };
  NYA.TIERS[6] = {
    tier: 6, key: 'maze', name: 'Mousehole Maze', w: 32, h: 22,
    comp: { air: 0.15, bedrock: 0.09, ore: 0.06, hard: 0.15, stone: 0.52 },
    purrmit: 7e5, quirk: 'mice', box: true,
    nipTier: 5, // the cheese mine: ore pays Tier 5 catnip (GDD: it drops less catnip than Tier 5, deliberately)
    diffTier: 5.6, // ...and the rock is only a little tougher than Tier 5's, so it's a sidegrade, not a wall
    blurb: 'A warren of twisty tunnels. Quirk: MOUSE NESTS send out mice that nibble your crew’s stamina. Your crew fights back, turrets help, and smashed nests drop CHEESE.',
    pal: {
      floor: '#4a3b2c', floor2: '#564534', fog: '#130e09', fog2: '#1c150e',
      dirt: '#b08850', dirt2: '#c79d62', dirt3: '#8a683b',
      stone: '#a8957a', stone2: '#bfac90', stone3: '#86745c',
      hard: '#6b5a48', hard2: '#7f6c58', hard3: '#4f4134',
      bed: '#211810', bed2: '#2d2118', bed3: '#3f3022',
      accent: '#ffd96a', sky: '#ffcf8a',
    },
    music: { key: 4, bpm: 112, prog: 'maze' },
  };
  NYA.TIERS[7] = {
    tier: 7, key: 'crystal', name: 'Crystal Catacombs', w: 36, h: 24,
    comp: { air: 0.12, bedrock: 0.1, ore: 0.04, hard: 0.2, stone: 0.54 }, // plus ~1 tile in 16 of crystal catnip (minegen)
    purrmit: 10, purrmitCur: 'sushi', // GDD: sushi is the purrmit currency for Tiers 7-9 (the aliens have a sushi thing)
    quirk: 'crystal', box: true,
    nipTier: 6, diffTier: 6.6, // 6.5 was too easy once Loom Pattern I was done
    blurb: 'Glittering catacombs studded with CRYSTAL CATNIP. Quirk: REFRACTION, laser one crystal and its whole cluster lights up. RESONANCE, every hit on a crystal rings through its neighbours, and a shattering crystal can set off the rest. Purrmits cost SUSHI.',
    pal: {
      floor: '#2c2640', floor2: '#352e4d', fog: '#0c0a16', fog2: '#141024',
      dirt: '#8a7aa8', dirt2: '#a090bf', dirt3: '#6b5d88',
      stone: '#6d6a94', stone2: '#8582ad', stone3: '#535078',
      hard: '#43406a', hard2: '#55527e', hard3: '#322f55',
      bed: '#14111f', bed2: '#1d192c', bed3: '#2c2642',
      accent: '#8ff2ff', sky: '#c9b6ff',
    },
    music: { key: 2, bpm: 96, prog: 'crystal' },
  };
  NYA.TIERS[8] = {
    tier: 8, key: 'greeble', name: 'Greeble Crash Site', w: 40, h: 26,
    comp: { air: 0.13, bedrock: 0.08, ore: 0.07, hard: 0.2, stone: 0.5 }, // plus the saucer and its crater (minegen)
    purrmit: 25, purrmitCur: 'sushi', // GDD: the aliens have a sushi thing
    quirk: 'greebles', quirks: ['greebles', 'grooved'], box: true, // the crash left grooved impact fractures (Tier 2's quirk returns)
    nipTier: 7, diffTier: 7.5, // a wall for ~10 seasons after arrival, until Loom Pattern II is under way (7.2 was too easy after Pattern I)
    blurb: 'A crashed alien saucer in a crater of cracked rock. Quirk: GREEBLES, alien doodads that scoot away from your crew. They’re quicker than a catgirl, so corner them in a dead end or close in from both sides. The crash left GROOVED fractures too. Purrmits cost SUSHI.',
    pal: {
      floor: '#2a3036', floor2: '#323a41', fog: '#0b0e11', fog2: '#12171b',
      dirt: '#8f7d68', dirt2: '#a8957e', dirt3: '#6e5f4f',
      stone: '#7d8a91', stone2: '#96a3aa', stone3: '#606c73',
      hard: '#4e5960', hard2: '#616d75', hard3: '#3a434a',
      bed: '#14181c', bed2: '#1c2227', bed3: '#2a3238',
      accent: '#9dff7a', sky: '#b8ffd0',
    },
    music: { key: 11, bpm: 100, prog: 'greeble' },
  };
  NYA.TIERS[9] = {
    tier: 9, key: 'ice', name: 'Purrmafrost Caverns', w: 44, h: 28,
    comp: { air: 0.3, bedrock: 0.07, ore: 0.07, hard: 0.18, stone: 0.5 }, // big caverns, most of their floor ice (minegen)
    purrmit: 40, purrmitCur: 'sushi',
    quirk: 'ice', box: true,
    cold: 3, // swings (and walking) cost ×3 stamina: Grit and Thermal Undies matter here
    nipTier: 8, diffTier: 8.3, // 7.8 fell to one swing per stone once Pattern II was done; 8.3 keeps it chewy (no Tier 10 yet)
    blurb: 'Frozen caverns, mostly open space, floored with ice. Quirk: SLIDING, step onto ice and you slide until something stops you, so the crew plans routes around it (and sometimes slides somewhere with no way back). The COLD makes every swing cost ×3 stamina. Purrmits cost SUSHI.',
    pal: {
      floor: '#2e3442', floor2: '#363d4d', fog: '#0b1018', fog2: '#121a26',
      dirt: '#8a8078', dirt2: '#a1978e', dirt3: '#6b625b',
      stone: '#7a7f8c', stone2: '#90959f', stone3: '#5f6470',
      hard: '#4c5060', hard2: '#5e6273', hard3: '#3a3d4a',
      bed: '#131b26', bed2: '#1b2533', bed3: '#29384b',
      accent: '#bfefff', sky: '#dff6ff',
    },
    music: { key: 6, bpm: 88, prog: 'ice' },
  };
  NYA.MAX_TIER = 9;
  // A tier has one headline quirk (`quirk`) and may bring back older ones too (`quirks`, user: old quirks should return).
  NYA.hasQuirk = (def, q) => !!def && (def.quirk === q || (!!def.quirks && def.quirks.indexOf(q) >= 0));
  // Crystal Catacombs (GDD §9.2). Crystals are tougher than ore, but every hit on one rings RES_HIT of its damage
  // into each neighbouring crystal, and a crystal that shatters sends RES_SHATTER of its max HP into its neighbours
  // RES_DELAY s later, so a softened cluster cascades. Lasering one crystal refracts the mark across its cluster.
  NYA.CRYSTAL_HP = 1.5; NYA.RES_HIT = 0.35; NYA.RES_SHATTER = 0.5; NYA.RES_DELAY = 0.12;
  // Greeble Crash Site (GDD §9.2). Greebles wander the open tiles and scoot away from any catgirl within GREEBLE_SCARE
  // tiles at GREEBLE_SPEED × the crew's median walking speed (they hover: rough ground and slick floors don't slow
  // them). Faster than her, so she only catches one that's cornered (no open tile farther from every catgirl nearby)
  // or that she's right on top of. A catgirl gives up a chase after GREEBLE_PATIENCE s (×2 on a lasered greeble).
  NYA.GREEBLE_SPEED = 1.3; NYA.GREEBLE_WANDER = 0.35; NYA.GREEBLE_SCARE = 3.5; NYA.GREEBLE_PATIENCE = 7;
  NYA.GREEBLE_VALUE = 6; // how keen a catgirl is to chase one (a tile of ore scores its items × quality)
  NYA.HULL_HP = 2; // saucer plating vs hard stone
  NYA.SLIDE_MULT = 3; // Purrmafrost: sliding is this many times her walking speed (and costs no stamina)
  NYA.ONE_WAY_PENALTY = 6; // target score lost for a spot she could slide to but not back from (the Rescue Claw's busy enough)
  NYA.MEWCLEAR_R = 7; NYA.MEWCLEAR_GLOW = 10; // THE MEWCLEAR OPTION: blast radius, and how far out ore starts Glowing
  NYA.GREEBLE_MARK = 12; // seconds a lasered greeble stays everyone's business
  // Once spotted, a greeble hangs around GREEBLE_STAY s (random in the range) and then beams back to the mothership,
  // unless it's lasered (too curious to leave). Without this a strong crew swept up every greeble in a long shift on
  // its own and lasering added nothing (active play should be a bonus).
  NYA.GREEBLE_STAY = [45, 80];
  NYA.GREEBLE_DAZZLE = 0.6; // a lasered greeble is dazzled by the dot: it scoots at this share of its speed
  // Catnip value per ore item. A tier can pay like a shallower one (nipTier) when it's a resource mine.
  NYA.tierNip = t => NYA.tierBase((NYA.TIERS[t] && NYA.TIERS[t].nipTier) || t) * NYA.tierRich(t); // value of one quality-1 item

  // Sushi Grotto water (GDD §9.2): a falling-sand style fluid on open tiles, simulated only while it moves.
  NYA.WATER_STEP = 0.08;   // seconds between flow steps
  NYA.WATER_MOVES = 160;   // cap on cell moves per step (performance)
  NYA.WET_LINGER = 3;      // seconds a catgirl stays wet after leaving the water
  NYA.WET_PACE = 0.5;      // walking speed while wet (Wetsuits raise it)
  NYA.WET_DRAIN = 2;       // stamina cost multiplier while wet (Wetsuits lower it)

  // Mousehole Maze mice (GDD §10). hp is × tierHP (Power vs mice). A bite takes that share of the victim's max
  // stamina, so mice stay a threat to strong crews: turrets and Mouser Drills (cheese) are the counter.
  // speed in tiles/s, cheese dropped on death, w = spawn weight.
  NYA.MICE = {
    scout: { name: 'Scout Mouse', hp: 25, speed: 3.0, bite: 0.03, biteCD: 0.9, cheese: 1, w: 60, desc: 'Fast and fragile. Chases the nearest catgirl.' },
    bruiser: { name: 'Bruiser Rat', hp: 120, speed: 1.6, bite: 0.07, biteCD: 1.3, cheese: 3, w: 22, big: true, desc: 'Slow, tanky, bites hard.' },
    pickpocket: { name: 'Pickpocket', hp: 40, speed: 2.8, bite: 0, biteCD: 1, cheese: 1, w: 18, thief: true, desc: 'Steals an item from a catgirl’s bag and runs for its nest. Catch it to get the item back.' },
  };
  NYA.NEST_BURST = 2;       // mice that pour out the moment a nest is uncovered
  NYA.NEST_SPAWN = 5;       // seconds between mice after that
  NYA.NEST_CAP = 4;         // live mice per nest
  NYA.MICE_CAP = 20;        // live mice per mine
  NYA.MOUSE_SIGHT = 12;     // path distance at which a mouse notices a catgirl
  NYA.CHEESE_WHEEL = 10;    // cheese in the wheel a smashed nest drops
  NYA.TURRET_BASE = 2;      // turret slots at the start
  NYA.TURRET_RANGE = 4;     // tiles
  NYA.TURRET_CD = 0.8;      // seconds between shots
  NYA.TURRET_DMG = 30;      // × tierHP: one hairball drops a scout
  NYA.CHAN_DELAY = 3;       // Turret-chan waits this long for you to place turrets yourself

  // Schrödinger's Box base chance per episode by tier (GDD §14.1)
  NYA.BOX_CHANCE = { 3: 0.05, 4: 0.08, 5: 0.15, 6: 0.35 };
  NYA.PIPE_HALF = 12; // flow = rate / (1 + pipeLength / 12)  (GDD §9.2)
  // Pumping costs stamina close to mining's rate (a swing costs 1 swing cost, at 2-4 swings/s). At 0.6 swing
  // costs/s the pumper outlasted everyone, and the shift sat waiting on one catgirl at a pump (playtest).
  NYA.PUMP_DRAIN = 2.0;   // swing costs per second while pumping
  NYA.PUMP_RATE = 8;      // base milk flow per second (Pump Pistons ×1.3 each); was 5 before the drain went up
  // Catgirls with nothing left to dig come and help crank a running pump (each adds her own flow), so the last
  // node doesn't leave the whole crew clocked out waiting on one pumper (playtest).
  NYA.PUMP_HELPERS = 3;
  // ...and once everyone still on shift is at a pump (the rest flopped or clocked out), they crank PUMP_RUSH× as
  // fast and tire PUMP_RUSH× as fast: same milk for the same stamina, it just doesn't keep the shift waiting.
  NYA.PUMP_RUSH = 3;
  // Easy clear: a perfect clear with the crew's total stamina at least this share of full. One counts for a whole
  // "full-clear X n times" survey/bunk requirement, so an outclassed mine isn't a perfect-clear grind (playtest).
  // First clears of a new mine in a first run end at ~2–15%; a crew that outclasses the mine, at 60–90%.
  NYA.EASY_CLEAR = 0.5;
})(globalThis.NYA = globalThis.NYA || {});
