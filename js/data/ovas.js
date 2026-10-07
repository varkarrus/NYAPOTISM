// OVAs (GDD §15): challenge runs with a limiter and a goal, in three releases of rising difficulty.
// They pay no yarn: each cleared release raises a permanent perk instead, and an OVA ends the moment its
// goal is met (no reason to stay, nothing to farm). Tapes arrive spread out over many seasons (one new
// challenge every now and then): tape i needs Season OVA_UNLOCK_SEASON + OVA_SPACING·i and the previous
// tape's VHS, and each harder release needs OVA_RELEASE_GAP more seasons than the one before.
(function (NYA) {
  'use strict';

  NYA.OVA_RELEASES = ['VHS', 'Laserdisc', "Director's Cut"];
  NYA.OVA_UNLOCK_SEASON = 5;
  NYA.OVA_SPACING = 3;     // seasons between new tapes
  NYA.OVA_RELEASE_GAP = 2; // seasons between a tape's VHS, Laserdisc and Director's Cut
  NYA.ovaSeason = (o, rel) => NYA.OVA_UNLOCK_SEASON + NYA.OVA_SPACING * o.index + NYA.OVA_RELEASE_GAP * (rel || 0);

  // goal helpers: { text, cur(g), need }
  const tier = n => ({ tier: n, text: 'Reach Tier ' + n + ' (' + NYA.TIERS[n].name + ')', cur: g => g.s.maxTierReached, need: n });
  const fc = (t, n) => ({ tier: t, text: 'Perfect-clear ' + NYA.TIERS[t].name + (n > 1 ? ' ' + n + ' times' : ''), cur: g => g.fc(t), need: n || 1 });
  const nip = x => ({ text: 'Earn ' + NYA.fmt(x) + ' catnip this run', cur: g => g.s.seasonCatnip, need: x, nip: true });

  NYA.OVAS = [
    {
      id: 'lights', name: 'Lights Out', icon: '🔦',
      limiter: 'Fog only clears 1 tile around you, miners only notice ore right next to them, and Whisker Sonar is out of order.',
      goals: [fc(3), fc(4), fc(4, 5)],
      perk: 'Night Vision', perkText: L => '+' + L + ' Sight in every mine',
      fax: 'THE POWER WENT OUT. THE GIRLS SAY THEY CAN SEE IN THE DARK. THEY CANNOT. ♡',
    },
    {
      id: 'nine', name: 'Nine to Five', icon: '⏰',
      limiter: 'Every shift ends after 30 seconds, sharp. Whatever’s in their bags still counts.',
      goals: [tier(3), tier(4), fc(4, 3)],
      perk: 'Clock Puncher', perkText: L => 'Pack-up time can drop to ' + NYA.OVA_PACKUP_FLOOR[L] + ' s (was 1.5 s)',
      fax: 'HR SAYS SHIFTS ARE 30 SECONDS NOW. I DIDN’T KNOW WE HAD HR. ♡',
    },
    {
      id: 'budget', name: 'Budget Cuts', icon: '💸',
      limiter: 'The Refinery is frozen at Mk I: no refinery upgrades, modules or Blend.',
      goals: [nip(1e7), nip(1e9), nip(1e10)],
      perk: 'Expense Account', perkText: L => ['', 'Start every run with Refinery Mk III', '…and the Polisher Module', '…and the Centrifuge Module'][L],
      fax: 'CORPORATE CUT THE REFINERY BUDGET. TORA IS USING A COLANDER. ♡',
    },
    {
      id: 'nolaser', name: 'No Laser Zone', icon: '🚫',
      limiter: 'No laser pointer, no drone. The crew picks every target on her own.',
      goals: [tier(4), fc(4, 3), fc(4, 10)],
      perk: 'Sharp Eyes', perkText: L => '+' + L + ' Focus for every catgirl',
      fax: 'THE LASER POINTER HAS BEEN CONFISCATED FOR "SAFETY". IT WAS ME. I CONFISCATED IT. ♡',
    },
    {
      id: 'monday', name: 'Monday', icon: '☕',
      limiter: 'Everyone clocks in at 60% stamina with ×5 Whimsy. Nobody is awake. Nobody.',
      goals: [tier(4), fc(4, 3), fc(4, 10)],
      perk: 'Loaf Power', perkText: L => 'Loafing restores ' + (4 * L) + '% stamina',
      fax: 'IT IS MONDAY. IT HAS BEEN MONDAY FOR A WHILE. NOBODY KNOWS HOW. ♡',
    },
    {
      id: 'onecat', name: 'One Cat Army', icon: '💪',
      limiter: 'Only one catgirl may be on shift, but she has ×5 Power, Haste, Pace and Stamina.',
      goals: [tier(3), fc(3, 3), tier(4)],
      perk: 'Ace Protocol', perkText: L => 'Your first catgirl on shift gets ×' + NYA.OVA_ACE[L] + ' Power, Haste, Pace and Stamina',
      fax: 'ONE GIRL. ONE PICKAXE. ONE VERY LONG MONTAGE. ♡',
    },
    {
      id: 'osha', name: 'No OSHA Compliance', icon: '⛑️',
      limiter: 'No hard hats. Every level-up has a 40% chance to leave her with an injury: Concussed, Punch Drunk, Drain Bamage or Toofless (or, very rarely, something stranger). They heal when the OVA ends.',
      goals: [tier(3), tier(4), fc(4, 3)],
      perk: 'Hazard Pay', perkText: L => '+' + (15 * L) + '% XP',
      fax: 'THE HARD HATS WERE RECALLED. TORA SAYS SAFETY IS "A STATE OF MIND." ♡',
    },
  ];
  NYA.OVA = {};
  NYA.OVAS.forEach((o, i) => { o.index = i; NYA.OVA[o.id] = o; });

  NYA.OVA_PACKUP_FLOOR = [1.5, 1.1, 0.8, 0.5];
  NYA.OVA_ACE = [1, 1.25, 1.5, 2];
  NYA.OVA_TIME_LIMIT = 30;
  NYA.OVA_ONECAT_MULT = 5;
})(globalThis.NYA = globalThis.NYA || {});
