// Tanuki's Emporium: limited-time event mines (GDD §9.4). Each event is a set of
// generation options + episode rules layered on a normal tier.
(function (NYA) {
  'use strict';

  NYA.EVENTS = {
    golden: {
      name: 'Golden Week Goldmine', icon: '🪙',
      desc: 'Golden catnip everywhere: every ore tile rolls +2 quality, and there’s a bit more of it.',
      gen: { qualityAdd: 2, oreMult: 1.25 },
      pal: { stone: '#c9a85a', stone2: '#e3c77a', stone3: '#9c7f3a', dirt: '#b08a50', dirt2: '#c9a468', dirt3: '#8a6a3a', floor: '#4a3a2a', floor2: '#5a4834', accent: '#ffd23f', sky: '#ffe08a' },
      music: 'quarry',
    },
    tanabata: {
      name: 'Tanabata Starfield', icon: '🎋',
      desc: 'Ore grows in star-shaped constellations. Mine out a whole constellation to make a wish: +15% catnip each.',
      gen: { stars: true },
      pal: { floor: '#1d2448', floor2: '#262f5a', fog: '#07091a', fog2: '#0e1230', stone: '#5a6aa8', stone2: '#7a8ac8', stone3: '#3e4a80', dirt: '#4a5590', dirt2: '#5d69a8', dirt3: '#36407a', accent: '#c9e3ff', sky: '#5a4aa8' },
      music: 'yarn',
    },
    obon: {
      name: 'Obon Lantern Caves', icon: '🏮',
      desc: 'Ghost catgirls from past timelines mine alongside your crew (+3 ghostly miners). Lanterns light the way.',
      ghosts: 3, headlamp: 2,
      pal: { floor: '#2a1f2a', floor2: '#352835', fog: '#0a070c', fog2: '#140e16', stone: '#6a5a6e', stone2: '#82708a', stone3: '#4c3f50', accent: '#ffb36b', sky: '#3a2050' },
      music: 'burrow',
    },
    mochi: {
      name: 'Mochi Pounding Mine', icon: '🍡',
      desc: 'New Year’s! Squishy mochi tiles only give way when two catgirls pound them together — and they pay ×4.',
      gen: { mochi: 0.4 },
      pal: { floor: '#4a3a46', floor2: '#584654', stone: '#c9b8c8', stone2: '#e3d3e0', stone3: '#9f8e9c', dirt: '#c49a8a', dirt2: '#d8b0a0', dirt3: '#9c7466', accent: '#ffb3c8', sky: '#ffd6e0' },
      music: 'menu',
    },
    matsuri: {
      name: 'Summer Matsuri Mine', icon: '🎆',
      desc: 'Festival night! Goldfish swim through the open caverns — scoop them up for bonus catnip. Fireworks guaranteed.',
      gen: { airAdd: 0.07 }, goldfish: 14,
      pal: { floor: '#2a2040', floor2: '#352a50', fog: '#0a0716', fog2: '#130e24', accent: '#ff5c7a', sky: '#ff7a5a' },
      music: 'quarry',
    },
  };
  NYA.EVENT_KEYS = Object.keys(NYA.EVENTS);

  NYA.TANUKI_LINES = {
    arrive: [
      'Limited time only! Well, all time is limited, if you think about it.',
      'Psst. Foreman. Wanna see a mine? It’s a GREAT mine. Barely haunted.',
      'Fresh off the truck! Purrmits! Hot purrmits! Get ’em while they’re legal!',
      'I have a mine for you. The mine is a deal. I am also a deal.',
    ],
    buy: ['Pleasure doing business! No refunds. No returns. No questions.', 'A fine choice! Possibly the finest! Statistically!', 'Sold! I’d say "enjoy" but you’ll enjoy it anyway.'],
    expire: ['Tanuki left a Rain Check on your desk. It smells like leaves.', 'The stall is gone. A Rain Check flutters in the breeze.'],
  };
})(globalThis.NYA = globalThis.NYA || {});
