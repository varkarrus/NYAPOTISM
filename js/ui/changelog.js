// Changelog + "how far can you get" notes shown on the title card at every load.
// Newest entry first. Add an entry whenever you push something playable.
(function (NYA) {
  'use strict';

  // Keep this spoiler-free: no Skein, yarn, Loom, unravelling or seasons. Players read it before finding them.
  NYA.CHANGELOG = [
    {
      title: 'Denser ore from Tier 3',
      date: '2026-10-09',
      items: [
        'From Yarnball Caverns on, every ore tile holds more catnip items (×2 in Tier 3, ×3 in Tier 4, and so on), each worth proportionally less. A tile still pays the same and takes as long to break, but bags actually fill up and catgirls start bringing catnip home early in the shift instead of halfway through.',
        'Bigger Bags is cheaper (×2.1 per level, was ×2.3) and goes up to 30 levels, since Carry matters more now.',
        'Pump crews: a catgirl with nothing left to dig now comes back to help crank a pump someone’s already running (up to 3 helpers, each adding her own flow). No more watching the whole crew clock out while one catgirl pumps the last node alone.',
        'Last one standing: once everyone still on shift is at a pump (the rest have flopped), they crank 3× as fast and tire 3× as fast. Same milk for the same stamina, minus the waiting.',
        'New trait: Destructive Urges. +15% Power and hits mice harder, but she won’t head home with a full bag until she’s tired. Catnip that won’t fit is left on the floor for the rest of the crew, and she never works a pump.',
        'Loner now really is a loner: she avoids tiles near other miners and wherever they’re headed, even if it means a longer walk. She gets her +25% Power bonus far more often (76% of her swings, up from about half).',
      ],
    },
    {
      title: 'Blend exploit fix, new names',
      date: '2026-10-09',
      items: [
        'New applicant names: Sketchy, Tabi, Miya, Koneko, Raku, Catherine, Clawdia and Bob, and two new family names: Nyansuke and Luxenford.',
        'Fixed: Tora’s Special Blend could keep brewing through a fresh start and pay out a huge pot early in the next run. An unfinished pot is now settled at face value before the reset.',
      ],
    },
    {
      title: 'Pumping fix',
      date: '2026-10-09',
      items: [
        'Pumping milk now tires a catgirl almost as fast as mining does (it used to barely cost anything), so you’re no longer left watching one catgirl pump alone after everyone else has flopped.',
        'To make up for it, pumps flow 60% faster. Dairy Depths shifts are about a quarter shorter, with the same milk per shift.',
      ],
    },
    {
      title: 'Catnip values, new traits, a new OVA',
      date: '2026-10-09',
      items: [
        'Settings → “Show catnip value on ore” (replaces the raw d/q numbers): each ore tile shows the catnip it’s still worth, after your Refinery and other multipliers (but before the perfect-clear bonus).',
        'Drop-offs now pop the catnip that catgirl just delivered, and a running “THIS SHIFT” total sits in the sky above the mine. The Haul in the top bar shows the same number.',
        'New legendary trait: Caffeine Addict. Does everything twice as fast (swings, walking, pumping, even loafing), but stamina drains 2.2× as fast.',
        'New rare trait: Underdog. Only C-rank catgirls can roll it, and it bumps her aptitude straight to SS, a brand-new rank above S.',
        'New Sphynx-only trait: Hot Water Bottle. Anyone who loafs within 2 tiles of her cuddles up and gets 6% stamina back.',
        'A seventh OVA tape: No OSHA Compliance. No hard hats, and every level-up might leave a catgirl Concussed, Punch Drunk, Drain Bamaged or Toofless. They heal when it’s over. Perk: Hazard Pay (+XP).',
        'Very rarely, a bonk in that OVA does something stranger: Fluent in Spanish. It does nothing at all except turn her NYAs into ¡MIAU!s, a nod to the soap-opera trope where someone bumps their head and wakes up fluent in a language they never learned.',
      ],
    },
    {
      title: 'New rare eyecatcher',
      date: '2026-10-08',
      items: [
        'Tickling the Dragon’s Tail: two lab catgirls, one very important screwdriver, and a butterfly. It can turn up once Doc Boom has started Project MEWCLEAR.',
      ],
    },
    {
      title: 'Tier 6: Mousehole Maze',
      date: '2026-10-08',
      items: [
        'A new mine past the Sushi Grotto: survey it at R&D after 10 perfect clears of the Sushi Grotto. Twisty tunnels full of mouse nests.',
        'Once a nest is uncovered, mice pour out: Scout Mice, Bruiser Rats, and Pickpockets that snatch ore from a catgirl’s bag and run for home (catch one to get it back). Bites take a chunk of stamina, and your crew swats any mouse that gets close.',
        'Turrets! Pick the 🎯 Turret tool (T) and click open floor to place a Hairball Cannon. Click one again to pick it up. Turret-chan, the anxious defense intern, places any you don’t. She tries her best.',
        'Smashed nests drop Cheese Wheels and mice drop crumbs: CHEESE, a new currency. Spend it on Defense in R&D (more turrets, bigger hairballs, Mouser Drills, Turret-chan’s Study Group) and on Aged Gouda at the Refinery (catnip ×1.25 per level, in every mine).',
        'It’s the cheese mine: its ore pays like the Sushi Grotto’s, and there’s less of it.',
        'Four new traits that only turn up once you’ve been there: Mouser, Pacifist, Scaredy Cat and Cheese Magnet.',
        'One more Bunk Bed, unlocked by reaching Tier 6.',
        'Rock past Dairy Depths is much tougher now. The Sushi Grotto used to be easier than Dairy Depths when you first got there.',
      ],
    },
    {
      title: 'Tier 5: Sushi Grotto',
      date: '2026-10-08',
      items: [
        'A new mine past Dairy Depths: survey it at R&D after 10 perfect clears of Dairy Depths.',
        'Flooded chambers hide behind the rock. Break into one and the water pours out and settles into the low ground. Wet catgirls walk at half speed and tire twice as fast until they dry off.',
        'Wild nigiri grows on the rocks beside the water. Mine it for SUSHI, a new currency.',
        'Tora opens a Sushi Bar at the Refinery: Wetsuits, Drain Pumps, Wasabi Kick (Power) and Otoro Platter (catnip).',
        'Two new traits that only turn up once you’ve been there: Water Cat (never gets wet) and Sushi Snob (double sushi).',
        'One more Bunk Bed, unlocked by reaching Tier 5.',
        'Fixed: Auntie’s fax for reaching Dairy Depths arrived blank.',
      ],
    },
    {
      title: 'Loaf fix',
      date: '2026-10-08',
      items: [
        'Loafing catgirls no longer melt into one blob: the head now sits properly under the hard hat, with a soft shadow where it rests on the body. Hard hats also cast a little shadow on the hair.',
      ],
    },
    {
      title: 'OVAs: challenge episodes',
      date: '2026-10-08',
      items: [
        'Late in the game, an OVA Tape Shelf appears in the Office: six special episodes with their own rules (no laser, 30-second shifts, a frozen Refinery, a one-cat crew…).',
        'Each has three releases (VHS, Laserdisc, Director’s Cut) with harder goals. Clearing one gives a permanent perk, and the OVA ends right there.',
        'New tapes arrive every few runs, one at a time, and each tape’s harder releases come out a couple of runs after the last. The shelf shows when the next one is due.',
      ],
    },
    {
      title: 'Outlined catgirls',
      date: '2026-10-08',
      items: [
        'Every catgirl now has one thick dark outline around her whole silhouette, and the thin outlines inside it (like around the ears) are gone. Easier to spot in the mine, and Sphynx ears no longer look grey.',
      ],
    },
    {
      title: 'Crit focus, Barracks scroll fix',
      date: '2026-10-07',
      items: [
        'Crit now works like Haste: past 40% crit chance, 30% of it focuses into ×1.65 Power (Claw Mastery, Razor Mastery, Diamond Claw…). Damage only ever goes up.',
        'Claw Sharpening is no longer capped at 8 levels, so crit keeps climbing and focusing.',
        'Fixed: the Barracks (and other tabs) no longer jump back up a few lines while you’re scrolled to the bottom.',
        'Sphynx ears are now properly skin-pink instead of greyish, and cards just say “Sphynx”.',
        'Fixed: “% extracted” counts ore items, not ore value, and tops out at 99% unless you really perfect-clear. Upgrades that boost ore value used to push it to 100% with ore still left.',
      ],
    },
    {
      title: 'Suggestions link',
      date: '2026-10-07',
      items: [
        'Got an idea or found a bug? The 💡 button in the top bar (and the link below) opens the suggestion box on GitHub.',
      ],
    },
    {
      title: 'Keeps mining in background tabs',
      date: '2026-10-07',
      items: [
        'The game now keeps running at full speed (with sound) when its tab is in the background or the window is minimised.',
        'Settings → “Keep mining in background tabs” turns it off if you’d rather bank the time as Fast-Forward like before.',
        'If the computer sleeps or the browser freezes the tab (phones do this), that gap still becomes Banked Time.',
      ],
    },
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
    summary: 'Roughly 5 hours of new things, then the OVA challenges (several more hours). After that, just bigger numbers.',
    items: [
      'Tiers 1–3 in your first run (Tier 3 at about 1 hour).',
      'Something big around the 1h 15m mark. No spoilers!',
      'Tier 4, Dairy Depths (milk pumping), at about 1h 30m.',
      'Tanuki’s limited-time event mines, R&D and MEWCLEAR, standing orders, swing techniques.',
      'Tier 5, Sushi Grotto (floods and sushi), around 3–5 hours in.',
      'Tier 6, Mousehole Maze (mice, turrets and cheese), around 4–5 hours in.',
      'Late game: seven OVA challenge episodes, 21 releases in all, each with a permanent perk.',
      'Not built yet: Tiers 7+, equipment, and more late-game content.',
    ],
  };
})(globalThis.NYA = globalThis.NYA || {});
