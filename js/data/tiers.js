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
  NYA.tierHP = t => { const d = NYA.tierDiff(t); return Math.pow(5, d - 1) * Math.pow(NYA.DEEP_HP, Math.max(0, d - 4)); }; // tile HP
  // Past Dairy Depths you only arrive after a few prestiges' worth of Loom and milk multipliers: on arrival at
  // Tier 5 the crew broke stone in 0.35 swings and had ~2000 swings of stamina (Tier 4 in Season 1: ~5 and
  // ~250), so the rock was easier than Dairy Depths. Deep tiers toughen faster to make up for it.
  NYA.DEEP_HP = 10;
  NYA.DEEP_RESIST = 5;
  NYA.tierResist = t => { const d = NYA.tierDiff(t); return Math.pow(2.0, d - 1) * Math.pow(NYA.DEEP_RESIST, Math.max(0, d - 4)); }; // stamina per swing
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
  NYA.MAX_TIER = 6;
  // Catnip value per ore item. A tier can pay like a shallower one (nipTier) when it's a resource mine.
  NYA.tierNip = t => NYA.tierBase((NYA.TIERS[t] && NYA.TIERS[t].nipTier) || t);

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
})(globalThis.NYA = globalThis.NYA || {});
