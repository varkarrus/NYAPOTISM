// Changelog + "how far can you get" notes shown on the title card at every load.
// Newest entry first. Add an entry whenever you push something playable.
(function (NYA) {
  'use strict';

  NYA.CHANGELOG = [
    {
      title: 'Dev build & changelog',
      date: '2026-10-06',
      items: [
        'This popup! A changelog and a note on how far the current build goes.',
        'A separate dev build at /dev/ with its own save (it copies your main save the first time).',
      ],
    },
    {
      title: 'Counter-pressures for Carry & Sight',
      date: '2026-10-06',
      items: [
        'Ore gets denser each tier, and dense ore crumbles more easily, so Carry upgrades keep mattering.',
        'Deeper mines are darker: Sight = 3 + Headlamps − darkness. Sight also sets how far miners notice ore and how far the fog clears.',
        'Yarn growth tamed from Season 4 on (it was reaching 44K per season).',
      ],
    },
    {
      title: 'Slower crew growth',
      date: '2026-10-06',
      items: [
        'Bunk Beds are hand-placed and gated by progress: about 3 miners at Tier 1, 3–4 at Tier 2, 5–6 at Tier 3.',
        'Tier 3 and Tier 4 surveys are cheaper to compensate.',
      ],
    },
    {
      title: 'Readable eyecatchers',
      date: '2026-10-06',
      items: [
        'Eyecatchers play picture-in-picture at 1.8 s per frame and are never cut off. Rare ones wait their turn.',
      ],
    },
  ];

  // What the current build actually contains, so a playtester knows where the content ends.
  NYA.FRONTIER = {
    summary: 'Roughly 3–4 hours of new things, up to about Season 5. After that nothing new unlocks yet — just bigger numbers.',
    items: [
      'Tiers 1–3 in your first season (Tier 3 at about 1 hour).',
      'The Skein (about 1h 15m): Unravel the Timeline and spend yarn on Quantum Loom Pattern 1.',
      'Tier 4, Dairy Depths (milk pumping), unlocks after your first Skein.',
      'Tanuki’s limited-time event mines, R&D and MEWCLEAR, standing orders, swing techniques.',
      'Not built yet: OVAs, Loom Pattern 2, Tiers 5+, equipment.',
    ],
  };
})(globalThis.NYA = globalThis.NYA || {});
