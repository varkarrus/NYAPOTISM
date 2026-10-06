// Mine (tier) definitions and the scaling table from GDD §6.3.
(function (NYA) {
  'use strict';

  // Tile types
  NYA.T = {
    OPEN: 0, DIRT: 1, STONE: 2, HARD: 3, BEDROCK: 4, ORE: 5, BOX: 6, ELEV: 7, GROOVE: 8, MILK: 9,
  };
  const T = NYA.T;
  NYA.TILE_NAME = ['Open', 'Dirt', 'Stone', 'Hardstone', 'Bedrock', 'Catnip Ore', "Schrödinger's Box", 'Elevator', 'Grooved Stone', 'Milk Node'];
  NYA.BASE_HP = { [T.DIRT]: 10, [T.STONE]: 25, [T.HARD]: 80, [T.GROOVE]: 25, [T.BOX]: 120 };
  NYA.ORE_LAYER_HP = 15;

  // Per-tier scaling (GDD §6.3)
  NYA.tierBase = t => Math.pow(10, t - 1);       // nip value
  NYA.tierHP = t => Math.pow(3.5, t - 1);         // tile HP
  NYA.tierResist = t => Math.pow(1.6, t - 1);     // stamina per swing
  NYA.tierXP = t => Math.pow(2.5, t - 1);         // XP per swing / item

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
  NYA.MAX_TIER = 4;

  // Schrödinger's Box base chance per episode by tier (GDD §14.1)
  NYA.BOX_CHANCE = { 3: 0.01, 4: 0.05, 5: 0.15, 6: 0.35 };
  NYA.PIPE_HALF = 12; // flow = rate / (1 + pipeLength / 12)  (GDD §9.2)
})(globalThis.NYA = globalThis.NYA || {});
