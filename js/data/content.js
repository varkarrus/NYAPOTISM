// Writing & flavor: names, looks, blurbs, barks, titles, previews (GDD §4.1, §20, §21).
(function (NYA) {
  'use strict';

  NYA.FIRST_NAMES = ['Mochi', 'Yuzu', 'Kinako', 'Azuki', 'Nori', 'Momo', 'Pudding', 'Biscuit', 'Tofu', 'Sesame', 'Ume',
    'Matcha', 'Daifuku', 'Dango', 'Kuri', 'Hana', 'Miso', 'Tama', 'Sora', 'Mugi', 'Koharu', 'Pocky', 'Caramel', 'Toast',
    'Waffle', 'Pickles', 'Noodle', 'Bean', 'Nugget', 'Cocoa', 'Taiyaki', 'Senbei', 'Ramune', 'Kiwi', 'Peaches', 'Butter',
    'Cinnamon', 'Marble', 'Soba', 'Udon', 'Gyoza', 'Purin', 'Shiro', 'Kuro', 'Kohaku', 'Ikura', 'Natto', 'Wasabi', 'Onigiri',
    'Sprinkles', 'Truffle', 'Clementine', 'Jellybean', 'Kabocha', 'Anko', 'Monaka', 'Sakuraba', 'Yokan', 'Chai', 'Latte',
    'Ceviche', 'Sashimi'];
  NYA.FAMILY_NAMES = ['Nekomaru', 'Tabbygawa', 'Whiskerton', 'Purrington', 'Nekozawa', 'Mikeyama', 'Meowmura', 'Nyanbara',
    'Pawsley', 'Clawford', 'Furugawa', 'Koneko', 'Shimashima', 'Hachiware', 'Nyamamoto', 'Kittenhouse', 'Mewberry',
    'Fluffington', 'Biscuitbottom', 'Tamamura', 'Kurobuchi', 'Nekoda', 'Sunbeam', 'Mittensworth', 'Scratchley', 'Nyanzaki'];

  // Fur patterns: hair colors used by the sprite renderer.
  NYA.FURS = {
    orange: { name: 'Orange', hair: '#f39a45', hair2: '#d0702a', ear: '#f39a45', tail: '#f39a45' },
    black: { name: 'Black', hair: '#2e2638', hair2: '#4b3f5c', ear: '#2e2638', tail: '#2e2638' },
    white: { name: 'White', hair: '#f6f0ea', hair2: '#d9cfc6', ear: '#f6f0ea', tail: '#f6f0ea' },
    tabby: { name: 'Tabby', hair: '#b88a5c', hair2: '#7b5638', ear: '#b88a5c', tail: '#b88a5c', stripes: '#6f4c31' },
    calico: { name: 'Calico', hair: '#f6f0ea', hair2: '#e08a3c', ear: '#e08a3c', tail: '#2e2638', patches: ['#e08a3c', '#2e2638'] },
    tuxedo: { name: 'Tuxedo', hair: '#26212e', hair2: '#f6f0ea', ear: '#26212e', tail: '#26212e', tux: true },
    siamese: { name: 'Siamese', hair: '#efe1c8', hair2: '#5a4033', ear: '#5a4033', tail: '#5a4033', points: true },
    tortie: { name: 'Tortie', hair: '#3a2a26', hair2: '#c9662f', ear: '#c9662f', tail: '#3a2a26', patches: ['#c9662f', '#8a3f1e'] },
    // rare: no fur at all. Always bald (it takes the hairstyle slot too), skin-coloured ears and tail.
    sphynx: { name: 'Sphynx', hair: '#f6cdb9', hair2: '#e0a894', ear: '#ffd6c6', tail: '#f9cfbd', sphynx: true, w: 0.25 },
  };
  NYA.FUR_KEYS = Object.keys(NYA.FURS);
  // fur roll: every pattern weight 1 except the rare ones (Sphynx ≈ 3% of recruits)
  NYA.rollFur = rng => rng.weighted(NYA.FUR_KEYS.map(k => [k, NYA.FURS[k].w || 1]));
  // 'Sphynx' instead of 'Sphynx · Bald (Sphynx)' on cards
  NYA.lookLabel = c => NYA.FURS[c.fur].sphynx ? NYA.FURS[c.fur].name : NYA.FURS[c.fur].name + ' · ' + (NYA.HAIR_NAMES[c.hair] || c.hair);
  NYA.rollHair = (rng, fur) => (NYA.FURS[fur] && NYA.FURS[fur].sphynx ? 'bald' : rng.weighted(NYA.HAIRSTYLES));

  // Hairstyles (GDD §20.3): the classic three are allowed but kept in the minority.
  NYA.HAIRSTYLES = [
    ['bob', 3], ['bangs', 2], ['tendrils', 2],
    ['buzz', 4], ['velvet', 4], ['undercut', 4], ['hightight', 3], ['slick', 3],
    ['bun', 4], ['ponytail', 4], ['sideshave', 3], ['twinbuns', 3], ['braids', 2],
  ];
  NYA.HAIR_NAMES = {
    bald: 'Bald (Sphynx)',
    bob: 'Chunky bob', bangs: 'Very long bangs', tendrils: 'Convenient tendrils', buzz: 'Buzzcut', velvet: 'Velvet buzz',
    undercut: 'Undercut', hightight: 'High-and-tight', slick: 'Slicked back', bun: 'Tight bun', ponytail: 'High ponytail',
    sideshave: 'Side shave', twinbuns: 'Twin buns', braids: 'Twin braids',
  };
  NYA.OUTFITS = ['#ff8fb1', '#7ad7f0', '#b69cff', '#ffd166', '#8ce99a', '#ff9e7a', '#f7a8ff', '#9be7d8'];

  NYA.BLURBS = [
    'Claims she’s never loafed. Is loafing right now.',
    'Has opinions about every rock. Shares them.',
    'Brought a pillow to the interview.',
    'Once mined for six hours straight. It was a dream. She was asleep.',
    'Thinks the elevator is a very small house.',
    'Afraid of cucumbers. Will not elaborate.',
    'Reads mining manuals for fun. Doesn’t understand them.',
    'Knocked the résumé off the desk during the interview.',
    'Insists the laser dot is “a friend.”',
    'Can fit in any box. Has proven this. Repeatedly.',
    'Says “nya” unironically. Proudly.',
    'Allegedly once bit a geologist.',
    'Here for the dental plan.',
    'Hums city pop while she works. Badly.',
    'Has a rock collection. It’s just catnip. She eats it.',
    'Took this job to “find herself.” Found a rock instead.',
    'Her previous job was “professional sunbeam tester.”',
    'Brings snacks for the crew. Eats them on the walk over.',
    'Communicates mostly in slow blinks.',
    'Wants to be an idol someday. Practices in tunnels.',
    'Claims her pickaxe has a name. Won’t say it.',
    'Dramatic. Every rock is a nemesis.',
    'Can hear a can opener from three tiers down.',
    'Sleeps 16 hours a day. Productive the other 8. Ish.',
    'Once stared at a wall for an hour. Says she found something.',
    'Very serious about safety. Wears two hard hats.',
    'Swears the bedrock is looking at her.',
    'Sent her résumé by fax. It was blank. Hired anyway.',
    'Knows every word to the opening theme. Including the ones that aren’t there.',
    'Treats every tunnel like a dramatic entrance.',
    'Collects shiny pebbles. Gives them to Tora. Tora pretends to hate it.',
    'Has never seen a mouse. Has a plan for when she does.',
    'Purrs when she’s concentrating. Also when she isn’t.',
    'Insists on knocking before entering any cave.',
    'Lists “napping” under special skills. Twice.',
    'Thinks Inspector Pochi is “actually kind of cool.” Tells no one.',
    'Applied to be a bakery cat. Got lost. Here now.',
    'Wears her hard hat backwards for aerodynamics.',
    'Afraid of the vacuum. Loves the robovac. Contains multitudes.',
    'Unclear if she’s on shift or just visiting.',
  ];

  // Sgt. Paws's applicant board (see Game.boardEpisodeEnd)
  NYA.BOARD_SIZE = 3;        // applicants on the board
  NYA.BOARD_TURN = 2;        // one applicant moves on every N episodes
  NYA.AD_MULT = 3;           // "post an ad" costs hire price × 3 × 2^(recent ads)
  NYA.TRANSFER_REFUND = 0.25;
  NYA.TREAT_TIME = 60;        // Treat Bag: 2x XP for one catgirl for this many seconds
  NYA.BLEND_TIME = 600;       // Tora's Special Blend brews for 10 min...
  NYA.BLEND_COOLDOWN = 3600;  // ...and can be started again an hour after it began

  NYA.APTITUDES = [
    { g: 'C', mult: 0.75, w: 34 },
    { g: 'B', mult: 0.9, w: 36 },
    { g: 'A', mult: 1.1, w: 22 },
    { g: 'S', mult: 1.35, w: 8 },
  ];

  // ---------- Cast ----------
  NYA.CAST = {
    tora: { name: 'Tora Naniwa', role: 'Refinery Officer', look: { fur: 'tabby', hair: 'ponytail', outfit: '#ff9e7a', hat: false, prop: 'harisen', stripes: true } },
    doc: { name: 'Dr. Nyako “Doc Boom” Bakuhatsu', role: 'Head of R&D', look: { fur: 'white', hair: 'frizz', outfit: '#f6f0ea', hat: false, prop: 'goggles' } },
    paws: { name: 'Sgt. Paws', role: 'Barracks', look: { fur: 'black', hair: 'hightight', outfit: '#6f8f4a', hat: false, prop: 'beret' } },
    pochi: { name: 'Inspector Pochi', role: 'Ministry of Holes', look: { fur: 'tan', hair: 'braids', outfit: '#3d5a99', hat: false, dog: true } },
    auntie: { name: 'Chairwoman Kurone Nekomata', role: 'Auntie', look: { fur: 'black', hair: 'bob', outfit: '#ff7eb6', hat: false, prop: 'shades' } },
    nyacolette: { name: 'Nyacolette', role: 'Loom Keeper', look: { fur: 'siamese', hair: 'bangs', outfit: '#b69cff', hat: false } },
    tanuki: { name: 'Tanuki-san', role: 'Travelling Merchant', look: { fur: 'tan', hair: 'undercut', outfit: '#7a5a3a', hat: false, prop: 'leaf', tanuki: true } },
  };

  // ---------- Barks (GDD §21.4) ----------
  NYA.BARKS = {
    tora_low: [
      'Nyandeyanen!? I’ve seen more catnip in a hairball!',
      '{n}?! {N}?! My grandma mines faster’n that and she’s a HOUSECAT!',
      'Boss. Boss. Look at me. What is THIS.',
      'Are we minin’ or are we nappin’?! Don’t answer that!',
      'I’m gonna refine it. I’m gonna refine it SO hard. It’s still tiny!',
    ],
    tora_mid: [
      'Not bad, not bad. Don’t get comfy.',
      'Eh. It’s catnip. I’ll take it.',
      'Steady work! …That’s a compliment, don’t make it weird.',
      'The refinery hums. The refinery is content. For now.',
    ],
    tora_high: [
      'Meccha good! …Don’t let it go to yer head, boss.',
      'NOW we’re talkin’! Somebody fetch me a bigger bucket!',
      'Oho?! The crew’s got claws today!',
      'That’s the stuff! The refinery’s practically purring!',
    ],
    tora_perfect: [
      'PERFECT CLEAR?! Every last leaf!? …I’m not cryin’, YOU’RE cryin’!',
      'Not a single crumb left! That’s my crew! (Don’t tell ’em I said that.)',
      'Swept clean! Pochi’s gonna have to fill out a form about how empty that hole is!',
    ],
    tora_motherlode: [
      'FIFTY?! Density FIFTY?! Somebody hold my harisen, I’m gonna— *faints*',
      'THE MEOWTHERLODE!? In MY refinery!? I need to sit down. I need to lie down.',
    ],
    doc_research: [
      'Good news! It works. Bad news! I don’t know *why* it works.',
      'It’s fine! It’s *structurally* fine!',
      'Research complete! Only one small fire!',
      'Science! Or something adjacent to science!',
      'The Nail Girls have outdone themselves. Again. Please stop them.',
    ],
    paws_hire: [
      'LISTEN UP, RECRUIT! DRINK WATER! TAKE A NAP! I’M SO PROUD OF YOU!',
      'WELCOME TO THE CREW! HYDRATE OR DIE-DRATE! *sniff*',
      'NEW RECRUIT ON DECK! STRETCH YOUR TOES! YOU’RE DOING AMAZING!',
    ],
    paws_fire: [
      'SHE’S NOT GONE, SHE’S JUST AT CORPORATE. *sobbing*',
      'TRANSFER APPROVED! I’LL WRITE EVERY DAY! *wails*',
      'SHE’LL HAVE A BEACH! AND SUN! AND I’LL HAVE NOTHING! *blows nose*',
    ],
    pochi: [
      'Sign here. And here. And here. Do not scratch the form.',
      'The Ministry of Holes is watching. Mostly the holes. But also you.',
      'Stamped. Reluctantly. Very reluctantly.',
      'This purrmit is valid for one (1) hole.',
    ],
  };

  // ---------- Episode titles (GDD §21.1) ----------
  NYA.TITLES = {
    generic: [
      'The {adj} Rock That Wouldn’t Break!',
      'Dig, {name}, Dig!!',
      '{name}’s Big Day Underground!',
      'The Laser Points the Way!',
      '{name} Loafs Again?! Is This the End of the Mine?!',
      'Stone Cold Catgirls!',
      'The Secret of {mine}!',
      'Is That… Catnip?! The Glittering Wall!',
      'Hard Hats, Soft Hearts!',
      'The Pickaxe of Destiny!',
      '{name} vs. The Wall: Round {n}!',
      'Tunnel Vision! The Crew Digs Deep!',
      'A Rock! Another Rock! So Many Rocks!',
      'Clock In, Catgirls! The Shift Begins!',
      'Who Left This Bedrock Here?!',
      'Beneath the Backyard… A Secret!',
      'Whiskers in the Dark!',
    ],
    low: [
      'Nyandeyanen, Part {nyan}',
      'Tora’s Fury! {haul} Catnip Is Not Enough!',
      'The Great Loaf of Episode {ep}',
    ],
    perfect: [
      'Perfect Clear! {mine} Bows Before Us!',
      'Every Last Leaf! A Flawless Shift!',
      'Not One Crumb Left! The Crew Weeps With Joy!',
    ],
    motherlode: ['THE MEOWTHERLODE!! {name} Strikes It Rich!', 'Density Fifty?! Tora Faints!!'],
    chain: ['Domino Danger! {chain} Stones Fall at Once!', 'Crack! Crack! CRACK! The Great Chain Break!'],
    box: ['Open the Box! Schrödinger’s Gambit!', 'The Humming Box! {name} Peeks Inside!'],
    skein: ['The Skein!! Time Itself Unravels!!', 'A Thread Through Time! The Foreman’s Choice!'],
    trait: ['{name} Is Special Now?! The {trait} Awakening!', '{name}’s Secret Power: {trait}!'],
    adj: ['Stubborn', 'Glittering', 'Mysterious', 'Grumpy', 'Enormous', 'Suspicious', 'Very Normal', 'Smug', 'Haunted', 'Sleepy', 'Forbidden'],
  };

  // ---------- Next Episode Previews (GDD §21.2) ----------
  NYA.PREVIEWS = {
    generic: [
      'Next time: {name} gets a new pickaxe! But is it… too sharp?!',
      'Next time: Tora finds a q1 tile and loses her mind. Again.',
      'Next time: nothing happens. It’s a mine. Please look forward to it.',
      'Next time: {name} stares at a wall! Will the wall stare back?!',
      'Next time: the laser dot returns! Can anyone resist?!',
      'Next time: Doc Boom says it’s fine. It’s structurally fine!',
      'Next time: a rock! Possibly two!',
      'Next time: {name} learns the true meaning of “hard hat.”',
      'Next time: Sgt. Paws reminds everyone to hydrate. Twice.',
      'Next time: {mine}! Will our heroes survive… the stone?!',
      'Next time: the crew discovers a box. They sit in it.',
      'Next time: an episode so dramatic, it’s mostly digging!',
      'Next time: Inspector Pochi glares through a window. Ominously!',
    ],
    motherlode: ['Next time: can Tora recover from THE MEOWTHERLODE? Doctors say no.'],
    perfect: ['Next time: can the crew do it again?! The pressure! The glory! The snacks!'],
    low: ['Next time: Tora files a formal complaint. Nyandeyanen.', 'Next time: the crew tries again! Harder! Possibly!'],
    skein: ['Next time: the Skein hums on the Foreman’s desk. What will she do?!'],
    tier: {
      2: 'Next time: the Scratching Post Quarry! The stone is grooved… and so are we!',
      3: 'Next time: Yarnball Caverns! Tangles! Air pockets! A box that hums?!',
    },
  };

  // ---------- Eyecatchers (GDD §21.3). Drawn procedurally in render/eyecatch.js ----------
  NYA.EYECATCHERS = [
    { id: 'box', name: 'If It Fits', rare: false },
    { id: 'mug', name: 'Gravity Test', rare: false },
    { id: 'laser', name: 'Forehead Dot', rare: false },
    { id: 'totem', name: 'Totem Sneeze', rare: false },
    { id: 'stamp', name: 'NO. FINE.', rare: false },
    { id: 'fax', name: 'Stop Looking', rare: false },
    { id: 'nail', name: 'Structurally Fine', rare: false },
    { id: 'loaf', name: 'Wrong Loaf', rare: false },
    { id: 'harisen', name: 'The Pickaxe Apologizes', rare: false },
    { id: 'hat', name: 'Hats All the Way Down', rare: true },
    { id: 'ears', name: 'Four Ears?!', rare: true },
  ];

  // ---------- Story faxes for system announcements ----------
  NYA.STORY_FAX = {
    intro: 'CONGRATULATIONS ON YOUR PROMOTION. DON’T TELL ANYONE WE’RE RELATED. ♡',
    laser: 'THE MINERS LIKE THE RED DOT. CLICK THE NICE ROCKS. THEY WILL GO. TRUST ME. ♡',
    barracks: 'HIRE MORE GIRLS. SGT. PAWS WILL CRY. THAT IS NORMAL. ♡',
    lab: 'DOC BOOM HAS A LAB NOW. DO NOT ASK ABOUT THE PLYWOOD. ♡',
    pochi: 'A DOG FROM THE MINISTRY OF HOLES WILL BE VISITING. BE NICE. SHE CAN SMELL FEAR. ♡',
    tier2: 'THE SCRATCHING POST QUARRY. WATCH THE GROOVES. ONE CRACK, MANY CRACKS. ♡',
    tier4: 'DAIRY DEPTHS. THE ROCKS ARE LEAKING MILK. THIS IS NORMAL NOW. ♡',
    tier5: 'SUSHI GROTTO. KEEP YOUR TAILS DRY. BRING ME BACK SOME SALMON. THE GOOD SALMON. ♡',
    tier6: 'MOUSEHOLE MAZE. THE MICE WERE THERE FIRST. THEY WILL MENTION THIS. LOUDLY. ♡',
    tier3: 'YARNBALL CAVERNS. IF YOU SEE A BOX THAT HUMS, OPEN IT. IF IT DOESN’T HUM, ALSO OPEN IT. ♡',
    skein: 'YOU FOUND IT. GOOD. WHEN YOU’RE READY, PULL THE THREAD. EVERYTHING RESETS. NOT EVERYTHING. YOU’LL SEE. ♡',
    season2: 'WELCOME BACK. YOU DON’T REMEMBER ME. I REMEMBER YOU. KNIT SOMETHING NICE. ♡',
    ad: 'HIRING FAIR!! BRING SNACKS. DO NOT HIRE ANYONE WHO BRINGS THEIR OWN SNACKS. SUSPICIOUS. ♡',
    montage: 'IT’S TRAINING MONTAGE TIME. I’VE ALREADY PICKED THE SONG. ♡',
    mewclear: 'I HEARD ABOUT THE WARHEAD. I AM NOT ANGRY. I AM IMPRESSED AND ALSO A LITTLE ANGRY. ♡',
  };
})(globalThis.NYA = globalThis.NYA || {});
