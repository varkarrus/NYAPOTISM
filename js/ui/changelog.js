// Changelog + "how far can you get" notes shown on the title card at every load.
// Newest entry first. Add an entry whenever you push something playable.
(function (NYA) {
  'use strict';

  // Keep this spoiler-free: no Skein, yarn, Loom, unravelling or seasons. Players read it before finding them.
  NYA.CHANGELOG = [
    {
      title: 'Sphynx catgirls, fog lasers, head-start fix',
      date: '2026-10-07',
      items: [
        'New rare breed: Sphynx (about 3% of applicants). Completely bald, skin-coloured ears and tail, a couple of forehead wrinkles.',
        'You can now laser any fog tile, even if it’s secretly open air or bedrock. The crew digs toward it, and the mark clears itself once the tile is revealed and turns out to be unmineable.',
        'Fixed: head-start bonuses (like pre-built Bunk Beds) now apply the moment you get them, not one cycle later. Saves that already have them get them on load.',
      ],
    },
    {
      title: 'Dairy Depths gate, fewer spoilers',
      date: '2026-10-07',
      items: [
        'The Mother-Nyan-Lode is now the MEOWTHERLODE (and Meowtherlode Radar).',
        'Traits that name a mine’s special feature only roll once you’ve reached that mine: Mud Puppy (Tier 2), Yarn Wrangler and Box Whisperer (Tier 3), Lactose Tolerant and Milk Mustache (Tier 4).',
        'Schrödinger’s Box turns up more reliably in Yarnball Caverns (5% base, was 1%, and the chance grows twice as fast while you wait).',
        'The Dairy Depths survey now only needs 10 perfect clears of Yarnball Caverns, so you can reach Tier 4 in your first run.',
        'Removed spoilers from the survey text, this changelog and the dev-save list.',
      ],
    },
    {
      title: 'Playtest fixes: Blend, Treat Bag, VHS, mud edges',
      date: '2026-10-07',
      items: [
        'Tora’s Special Blend now unlocks later, when one bad roll can’t stall your progress, and you can run it once an hour.',
        'Treat Bag: one catgirl earns double XP for 1 minute (carries across episodes) instead of an instant half-level. The crew rail shows the timer.',
        'Catnip Hotbox fixed: a puff now really gives 22% stamina (it was only ~7%, so woken miners flopped again after one block), it wakes sleepers properly, and revived miners lose their Zs.',
        'VHS mode is much cheaper to draw: same scanline look, no more framerate drop.',
        'Mud has ragged edges where it meets normal ground.',
        'Pack-Up Drills are hand-priced across Tiers 1–4 (they used to max out before Tier 3). Headlamps get pricier much faster.',
        'The Tier 4 survey is cheaper (20M, was 60M) to keep Dairy Depths on schedule after the tougher-mines change.',
      ],
    },
    {
      title: 'Tougher new mines, cheaper pickaxes',
      date: '2026-10-07',
      items: [
        'Each tier’s rock is tougher (HP ×5 per tier, was ×3.5) and tires miners faster (stamina per swing ×2 per tier, was ×1.6). Tier 2 rock is ~40% tougher than before.',
        'Sharper Pickaxe and Stamina Snacks get pricier more slowly (×2.1 per level, was ×2.3), so upgrading is how you get ready for the next mine.',
        'Moving to a new mine before your Power and Grit are ready now pays about 2× your current mine instead of 3–4×.',
        'Mud and rubble are now proper pixel tiles instead of drawn-on shapes.',
      ],
    },
    {
      title: 'Dev saves (dev build only)',
      date: '2026-10-06',
      items: [
        'Settings → 🧪 Dev saves. Jump to a milestone (Barracks, Tier 2, Tier 3, Tier 4 and later): the balance bot plays a fresh game in a few seconds and loads it.',
        'Three snapshot slots to save your current game and come back to it later.',
        'Only on /dev/. Your main save is never touched.',
      ],
    },
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
    summary: 'Roughly 3–4 hours of new things. After that nothing new unlocks yet — just bigger numbers.',
    items: [
      'Tiers 1–3 in your first run (Tier 3 at about 1 hour).',
      'Something big around the 1h 15m mark. No spoilers!',
      'Tier 4, Dairy Depths (milk pumping), at about 1h 30m.',
      'Tanuki’s limited-time event mines, R&D and MEWCLEAR, standing orders, swing techniques.',
      'Not built yet: Tiers 5+, equipment, and more late-game content.',
    ],
  };
})(globalThis.NYA = globalThis.NYA || {});
