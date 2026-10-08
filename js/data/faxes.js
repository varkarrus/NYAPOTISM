// Faxes From Auntie — achievements (GDD §13). Each grants a tiny permanent bonus.
(function (NYA) {
  'use strict';
  const F = [];
  function fax(id, name, text, bonus, check, hidden) { F.push({ id, name, text, bonus, check, hidden: !!hidden }); }
  const st = g => g.s.stats;
  const life = g => g.s.life;

  fax('rock', 'You Mined A Rock', 'PROUD OF YOU. TELL NO ONE.', { catnip: 0.01 }, g => life(g).tiles >= 1);
  fax('four', 'Four?!', 'TORA CALLED ME. SHE WAS YELLING. I HUNG UP. ♡', { catnip: 0.01 }, g => life(g).episodes >= 1);
  fax('laser', 'Pew Pew', 'THE RED DOT IS A FRIEND. A BOSSY FRIEND.', { xp: 0.02 }, g => life(g).marks >= 25);
  fax('hire', 'Hired Help', 'TWO OF THEM NOW. TWICE THE LOAFING. ♡', { catnip: 0.01 }, g => life(g).hires >= 1);
  fax('crew4', 'Squad Goals', 'FOUR GIRLS. ONE HOLE. A CLASSIC.', { catnip: 0.02 }, g => g.activeCrew().length >= 4);
  fax('crew8', 'Full House', 'EIGHT? IN THIS ECONOMY? ♡', { catnip: 0.03 }, g => g.activeCrew().length >= 8);
  fax('perfect', 'PERFECT', 'NOT ONE CRUMB. I WEPT. THE BARTENDER WEPT.', { catnip: 0.02 }, g => life(g).fullClears >= 1);
  fax('perfect25', 'Perfect Attendance', '25 PERFECT CLEARS. FRAMING THIS ONE.', { catnip: 0.03 }, g => life(g).fullClears >= 25);
  fax('perfect100', 'Clean Plate Club', '100 PERFECT CLEARS. OBAA-CHAN WOULD BE PROUD. YOU DON’T KNOW HER YET.', { catnip: 0.05 }, g => life(g).fullClears >= 100);
  fax('srank10', 'S-Rank Show-Off', 'TEN S RANKS. YOU’RE INSUFFERABLE. I LOVE IT.', { xp: 0.03 }, g => life(g).sRanks >= 10);
  fax('motherlode', 'Nyandeyanen!?', 'TORA FAINTED. SHE’S FINE. SHE’S MORE THAN FINE.', { catnip: 0.03 }, g => life(g).motherlodes >= 1);
  fax('loaf', 'Loaf Of The Month', 'EVERYONE LOAFED AT ONCE. I’M HAVING IT PAINTED.', { xp: 0.02 }, g => life(g).allLoaf >= 1);
  fax('trait', 'Trait Get!', 'SHE’S SPECIAL NOW. LIKE YOU. ♡', { xp: 0.02 }, g => life(g).traits >= 1);
  fax('legend', 'Legendary', 'A LEGEND AMONG CATS. DON’T LET HER UNIONIZE.', { catnip: 0.05 }, g => life(g).legendaries >= 1);
  fax('lv15', 'Veteran', 'LEVEL 15. GIVE HER A PLAQUE. A SMALL ONE.', { xp: 0.03 }, g => g.s.crew.some(c => c.level >= 15));
  fax('transfer', 'HR Would Like A Word', 'TEN TRANSFERS. THE BEACH IS GETTING CROWDED. ♡', { catnip: 0.02 }, g => life(g).transfers >= 10);
  fax('chain', 'Chain Reaction', 'TEN STONES. ONE SWING. PHYSICS IS A SUGGESTION.', { catnip: 0.02 }, g => life(g).bestChain >= 10);
  fax('crits', 'Crit Happens', '100 CRITICAL SWINGS. THE ROCKS HAVE NOTICED.', { xp: 0.02 }, g => life(g).crits >= 100);
  fax('zoom', 'Zoomies', 'THEY RAN SO FAST. I SAW IT FROM HERE. ♡', { xp: 0.02 }, g => life(g).zoomies >= 100);
  fax('blunt', 'Treat Yourself', '50 BLUNTS. FOR MORALE. IT’S A WELLNESS PROGRAM.', { catnip: 0.02 }, g => life(g).blunts >= 50);
  fax('boom', 'Boom', '25 HAIRBALLS. THE CLEANING BUDGET IS ON FIRE.', { catnip: 0.02 }, g => life(g).bombs >= 25);
  fax('tier2', 'Grooving', 'THE QUARRY. I USED TO SHARPEN MY CLAWS THERE. LONG STORY.', { catnip: 0.02 }, g => g.s.maxTierReached >= 2 || life(g).maxTier >= 2);
  fax('tier3', 'Into The Yarn', 'YOU’RE GETTING CLOSE. TO WHAT? YOU’LL SEE. ♡', { catnip: 0.03 }, g => g.s.maxTierReached >= 3 || life(g).maxTier >= 3);
  fax('milk', 'Got Milk?', 'FRESH FROM THE ROCK. DON\u2019T THINK ABOUT IT. \u2661', { catnip: 0.03 }, g => (g.s.life.milk || 0) >= 1);
  fax('sushi', 'Omakase', 'YOU FOUND SUSHI IN A ROCK. I HAVE QUESTIONS. I ALSO HAVE CHOPSTICKS. ♡', { catnip: 0.03 }, g => (g.s.life.sushi || 0) >= 1);
  fax('mice', 'Pest Control', 'MICE. IN MY MINE. DO NOT EAT THEM. …FINE, ONE. ♡', { catnip: 0.03 }, g => (g.s.life.mice || 0) >= 1);
  fax('cheese', 'Say Cheese', 'THE MICE WERE HOARDING CHEESE. NOW WE ARE HOARDING CHEESE. CIRCLE OF LIFE. ♡', { xp: 0.02 }, g => (g.s.life.cheese || 0) >= 1);
  fax('exterminator', 'Exterminator', 'FIVE HUNDRED MICE. THE OTHER MICE HAVE STARTED A NEWSLETTER ABOUT YOU. ♡', { catnip: 0.05 }, g => (g.s.life.mice || 0) >= 500);
  fax('nests', 'Home Wrecker', 'TWENTY-FIVE NESTS. THEY HAD MORTGAGES, DEAR. ♡', { xp: 0.03 }, g => (g.s.life.nests || 0) >= 25);
  fax('crystal', 'Crystal Clear', 'THE ROCK SINGS. DOC BOOM WANTS TO START A BAND. I SAID NO. SHE STARTED IT ANYWAY. ♡', { catnip: 0.03 }, g => (g.s.life.crystals || 0) >= 1);
  fax('cascade', 'Glass Harmonica', 'TEN CRYSTALS, ONE CHAIN. THE MICE UPSTAIRS FILED A NOISE COMPLAINT. ♡', { xp: 0.03 }, g => (g.s.life.bestCascade || 0) >= 10);
  fax('flood', 'Splash Zone', 'SOMEONE OPENED THE WRONG WALL. EVERYONE IS DAMP AND FURIOUS. ♡', { xp: 0.02 }, g => (g.s.life.floods || 0) >= 1);
  fax('milk1k', 'Dairy Queen', 'A THOUSAND LITERS. OBAA-CHAN WILL WANT SOME. (WHO IS OBAA-CHAN? LATER.)', { xp: 0.03 }, g => (g.s.life.milk || 0) >= 1000);
  fax('tier4', 'Udderly Ridiculous', 'THE DAIRY DEPTHS. I\u2019M SORRY FOR THE FAX TITLE. NOT VERY SORRY.', { catnip: 0.03 }, g => g.s.maxTierReached >= 4 || g.s.life.maxTier >= 4);
  fax('tanuki', 'Limited Time Only', 'A RACCOON-DOG SOLD YOU A HOLE. I\u2019M NOT MAD. I\u2019M A LITTLE MAD. \u2661', { catnip: 0.02 }, g => (g.s.life.events || 0) >= 1);
  fax('wish', 'Wish Upon A Star', 'YOU MADE A WISH. I KNOW WHAT IT WAS. (I DON\u2019T.) \u2661', { xp: 0.02 }, g => (g.s.life.wishes || 0) >= 1);
  fax('events10', 'Valued Customer', 'TEN EVENT MINES. TANUKI SENT A LOYALTY CARD. IT IS A LEAF.', { catnip: 0.03 }, g => (g.s.life.events || 0) >= 10);
  fax('box', 'The Box', 'IT HUMS. DON’T LISTEN TOO CLOSELY.', { catnip: 0.02 }, g => life(g).boxes >= 1);
  fax('unravel', 'Unravelled', 'NEW SEASON. NEW VERSE. SAME AUNTIE. ♡', { catnip: 0.05, yarn: 0.05 }, g => g.s.season >= 2);
  fax('season5', 'Long-Running Series', 'FIVE SEASONS. WE’RE GETTING A MERCH LINE.', { yarn: 0.1 }, g => g.s.season >= 5);
  fax('k1', 'Thousandaire', 'A THOUSAND CATNIP. DON’T SPEND IT ALL ON HATS.', { catnip: 0.01 }, g => life(g).catnip >= 1e3);
  fax('m1', 'Millionyaire', 'A MILLION. I’M PUTTING YOU IN THE WILL. (I’M ALREADY IN THE WILL.)', { catnip: 0.03 }, g => life(g).catnip >= 1e6);
  fax('b1', 'Billionyaire', 'A BILLION. THE MINISTRY OF HOLES SENT A FRUIT BASKET.', { catnip: 0.05 }, g => life(g).catnip >= 1e9);
  fax('ep100', 'Syndication', 'EPISODE 100. YOU’RE IN SYNDICATION NOW. WHATEVER THAT MEANS.', { catnip: 0.03 }, g => g.s.episodeNum >= 100);
  fax('longrun', 'Longer Than The Pirates', 'MORE EPISODES THAN A CERTAIN STRETCHY PIRATE SHOW. THE TREASURE WAS THE CATNIP ALL ALONG. ♡', { catnip: 0.05 }, g => g.s.episodeNum > NYA.longRunnerEps());
  fax('ep404', 'Episode Not Found', 'EPISODE 404. I CAN’T FIND IT EITHER.', { xp: 0.04 }, g => g.s.episodeNum >= 404, true);
  fax('mewclear', 'It Works??', 'I HEARD THE WARHEAD WORKS. I AM CALLING A LAWYER. AND A FIREWORKS GUY.', { catnip: 0.05 }, g => g.lvl('mewclear') >= 10);
  fax('mad', 'Mutually Assured Destruction', 'THE BACKYARD. YOU NUKED THE BACKYARD. FOR NO REASON. ♡', { catnip: 0.03 }, g => life(g).madStarter >= 1, true);
  fax('montage', 'Montage!', 'I HEARD THE SONG FROM HERE. IT’S STUCK IN MY HEAD. THANK YOU.', { xp: 0.03 }, g => g.lvl('montage') >= 1);
  fax('fax', 'Stop Looking At The Fax Machine', 'STOP LOOKING AT THE FAX MACHINE.', { xp: 0.01 }, g => life(g).faxClicks >= 10, true);
  fax('whistle', 'Blow The Whistle', 'YOU CALLED IT EARLY. SOMETIMES THAT’S LEADERSHIP.', { catnip: 0.01 }, g => life(g).whistles >= 1);
  fax('rescue', 'Insert Coin', 'THE CLAW GOT HER. THE CLAW ALWAYS GETS HER. ♡', { catnip: 0.01 }, g => life(g).rescues >= 1, true);
  fax('drone', 'It Has A Short Attention Span Too', 'THE DRONE IS ALSO DISTRACTED. IT RUNS IN THE FAMILY.', { catnip: 0.02 }, g => life(g).droneMarks >= 100);
  fax('glow', 'Glowing Nip', 'IT GLOWS. EAT IT ANYWAY. (DON’T.)', { catnip: 0.03 }, g => life(g).glowing >= 1, true);
  fax('sweater', 'Ugly Sweater Season', 'YOU FINISHED THE SWEATER. WEAR IT. NO, REALLY. WEAR IT. ♡', { yarn: 0.15 }, g => g.loomComplete(), true);

  NYA.FAXES = F;
  NYA.FAX = {};
  for (const f of F) NYA.FAX[f.id] = f;
  // faxes about a mine's own gimmick stay a "?" on the board until you've reached that mine (no spoilers)
  for (const [id, t] of Object.entries({ milk: 4, milk1k: 4, tier4: 4, sushi: 5, flood: 5, mice: 6, cheese: 6, exterminator: 6, nests: 6, crystal: 7, cascade: 7 })) NYA.FAX[id].tier = t;

  // A certain long-running pirate anime's episode count, kept current without updates: 1180 episodes as of
  // 2026-09-27, then Toei's 26-episodes-a-year schedule. Never goes below the anchor.
  NYA.longRunnerEps = function (now) {
    const years = ((now != null ? now : Date.now()) - Date.UTC(2026, 8, 27)) / (365.25 * 864e5);
    return 1180 + Math.max(0, Math.floor(years * 26));
  };
})(globalThis.NYA = globalThis.NYA || {});
