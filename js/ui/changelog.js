// Changelog + "how far can you get" notes shown on the title card at every load.
// Newest entry first. Add an entry whenever you push something playable.
(function (NYA) {
  'use strict';

  NYA.CHANGELOG = [
    {
      title: 'Applicant board',
      date: '2026-10-06',
      items: [
        'Sgt. Paws now pins up 3 applicants in the Barracks. You see each one’s fur, hair and name before hiring. Aptitude shows once you have Résumé Reader; traits stay a surprise.',
        'A hired slot refills after the next episode, and the longest-waiting applicant moves on every 2 episodes.',
        '“Post a new ad” replaces the whole board right away. It costs 3× a hire, doubles with each ad, and halves each time an applicant moves on.',
        'A ★ marks a tuxedo applicant when someone on your crew has Tuxedo Club.',
        'Transfers now refund 25% of a hire (was 40%) and no longer bring in new applicants.',
      ],
    },
    {
      title: 'Rough ground',
      date: '2026-10-06',
      items: [
        'From Tier 2, mines have mud patches (half walking speed) and broken rock can leave rubble (slower walking until it’s trampled flat after two crossings). Both spread with depth, so Pace upgrades keep mattering.',
        'New trait: Mud Puppy. Mud and rubble don’t slow her, and she stomps rubble flat. Likes the Quarry and Dairy Depths.',
        'Hover a floor tile to see its slowdown.',
        'Fixed the Four Ears?! eyecatcher: the human ears now show, and the gallery replay keeps the same catgirl.',
      ],
    },
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
