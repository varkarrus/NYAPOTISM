// The Quantum Loom (GDD §14.3): a 5×5 sweater pattern of yarn upgrades.
// Completing a row or column "finishes a stripe" for an extra bonus.
(function (NYA) {
  'use strict';

  NYA.YARN_DIV = 1e6;      // yarn = floor((seasonYarnNip / YARN_DIV) ^ exp × mult)
  // Catnip earned past Dairy Depths counts ÷YARN_TIER_DIV per tier toward yarn (s.seasonYarnNip). A tier's
  // base pay is only ×10, but the extra income buys more multiplier upgrades, so a season spent in a new mine
  // ends up with ~100–1000× the catnip. Undivided, Tier 5 took Season 5 from ~700 to ~200K yarn. It's applied
  // per episode, so entering a deeper mine never lowers the yarn preview.
  NYA.YARN_TIER_FROM = 4;
  NYA.YARN_TIER_DIV = 100;
  // Past the Sushi Grotto's jump (YARN_TIER_CAP, the last one that brings a new pile of multipliers) a deeper mine's
  // catnip only counts ÷ how much more its base pay is (×10 per tier), so it's never a worse yarn farm per item than
  // the mine above it. At ÷100 the Crystal Catacombs earned a fifth of the Maze's yarn per item.
  NYA.YARN_TIER_CAP = 5;
  NYA.yarnDiv = (def, tier) => {
    const nt = def.nipTier || tier;
    let d = Math.pow(NYA.YARN_TIER_DIV, Math.max(0, Math.min(nt, NYA.YARN_TIER_CAP) - NYA.YARN_TIER_FROM));
    if (nt > NYA.YARN_TIER_CAP) d *= NYA.tierBase(nt) / NYA.tierBase(NYA.YARN_TIER_CAP);
    return d;
  };
  NYA.YARN_EXP = 0.4;

  // Knit multipliers (the "Knit Multipliers" rows): the first KNIT_FULL ranks count in full, then each rank is worth
  // KNIT_FADE of the one before, up to KNIT_MAX ranks (≈8.6 full ranks in all). Uncapped ×2 per rank made catnip and
  // power run away from the deep mines. Older saves past the cap keep their ranks; the extra just stops counting.
  NYA.KNIT_FULL = 5;
  NYA.KNIT_FADE = 0.8;
  NYA.KNIT_MAX = 15;
  NYA.knitEff = l => {
    l = Math.min(l, NYA.KNIT_MAX);
    const over = Math.max(0, l - NYA.KNIT_FULL);
    return Math.min(l, NYA.KNIT_FULL) + NYA.KNIT_FADE * (1 - Math.pow(NYA.KNIT_FADE, over)) / (1 - NYA.KNIT_FADE);
  };
  const KNIT_NOTE = ' Ranks past ' + NYA.KNIT_FULL + ' fade: each is worth 80% of the one before.';

  NYA.LOOM_ROWS = ['Head Start', 'Knit Multipliers', 'Timeline Anchors', 'New Mechanics', 'Skein Tuning'];

  // grid[row][col]
  NYA.LOOM = [
    [
      { id: 'hs_bunks', name: 'Pre-Built Bunks', cost: 1, desc: 'Start every season with 2 extra Bunk Beds (3 active slots).' },
      { id: 'hs_cash', name: 'Seed Money', cost: 2, desc: 'Start every season with 300 Catnip.' },
      { id: 'hs_refinery', name: 'Refinery Blueprints', cost: 4, desc: 'Start every season with Refinery Mk IV.' },
      { id: 'hs_lab', name: 'Lab Notebooks', cost: 10, desc: 'Start with Catnip Blunt, Hairball Bomb, Spray Bottle and Pack-Up Drills ×4 already researched.' },
      { id: 'hs_maps', name: 'Old Survey Maps', cost: 25, desc: 'Start with the Scratching Post Quarry surveyed.' },
    ],
    [
      { id: 'km_catnip', name: 'Catnip Cable-Knit', cost: 1, growth: 4, max: NYA.KNIT_MAX, desc: 'Catnip ×2 per rank.' + KNIT_NOTE, fx: l => 'Catnip ×' + NYA.fmt(Math.pow(2, NYA.knitEff(l))) },
      { id: 'km_xp', name: 'Purl of Wisdom', cost: 2, growth: 3, max: NYA.KNIT_MAX, desc: 'XP ×2 per rank.' + KNIT_NOTE, fx: l => 'XP ×' + NYA.fmt(Math.pow(2, NYA.knitEff(l))) },
      { id: 'km_power', name: 'Muscle Mittens', cost: 4, growth: 3.5, max: NYA.KNIT_MAX, desc: 'Power ×1.5 per rank.' + KNIT_NOTE, fx: l => 'Power ×' + NYA.fmt(Math.pow(1.5, NYA.knitEff(l))) },
      { id: 'km_stamina', name: 'Cozy Scarf', cost: 8, growth: 3.5, max: NYA.KNIT_MAX, desc: 'Stamina ×1.5 per rank.' + KNIT_NOTE, fx: l => 'Stamina ×' + NYA.fmt(Math.pow(1.5, NYA.knitEff(l))) },
      { id: 'km_clear', name: 'Perfect Seams', cost: 15, growth: 4, max: NYA.KNIT_MAX, desc: '+0.25 Full-Clear Bonus per rank.' + KNIT_NOTE, fx: l => '+' + (0.25 * NYA.knitEff(l)).toFixed(2) + ' clear bonus' },
    ],
    [
      { id: 'ta_1', name: 'Timeline Anchor I', cost: 2, desc: 'Keep your 1 highest-level catgirl (levels and traits) across seasons.' },
      { id: 'ta_2', name: 'Timeline Anchor II', cost: 5, desc: 'Keep 2 catgirls across seasons.' },
      { id: 'ta_3', name: 'Timeline Anchor III', cost: 12, desc: 'Keep 3 catgirls across seasons.' },
      { id: 'ta_fresh', name: 'Head Hunter', cost: 25, desc: 'New recruits arrive at level 3, with their first trait already rolled.' },
      { id: 'ta_5', name: 'Timeline Anchor V', cost: 50, desc: 'Keep 5 catgirls across seasons.' },
    ],
    [
      { id: 'nm_drone', name: 'Laser Drone', cost: 3, desc: 'A drone that marks one tile every 4 s, picking from a random sample with its own Focus (2). Yes, it also has a short attention span.' },
      { id: 'nm_bank', name: 'Valerian Dreams', cost: 5, desc: 'Banked Time efficiency 33% → 50%.' },
      { id: 'nm_ff', name: 'VCR Fast-Forward', cost: 10, desc: 'Fast-Forward runs at 3× instead of 2×.' },
      { id: 'nm_desk', name: 'Pochi’s Spare Desk', cost: 18, desc: '+4 Requisition Points, and the Purrmit Office opens from the start of each season.' },
      { id: 'nm_drone2', name: 'Drone Firmware 2.0', cost: 40, desc: 'The Laser Drone marks every 2 s with Focus 5.' },
    ],
    [
      { id: 'sk_box', name: 'Box Magnet', cost: 2, desc: '+2% Schrödinger’s Box chance per episode.' },
      { id: 'sk_exp1', name: 'Looser Weave', cost: 40, desc: 'Yarn exponent 0.40 → 0.45.' },
      { id: 'sk_mult', name: 'Double Knit', cost: 14, desc: 'Yarn ×1.5.' },
      { id: 'sk_hum', name: 'Quantum Hum', cost: 25, desc: 'Box pity grows 1%/episode (was 0.5%), and boxes can appear in Tier 2 at half chance.' },
      { id: 'sk_exp2', name: 'Loosest Weave', cost: 600, desc: 'Yarn exponent → 0.50.' },
    ],
  ];

  NYA.LOOM_ROW_STRIPES = [
    { name: 'Head Start Stripe', desc: 'Start every season with 1 free recruit and +1 more Bunk.' },
    { name: 'Multiplier Stripe', desc: 'Catnip ×3.' },
    { name: 'Anchor Stripe', desc: 'Anchored catgirls get +25% all stats.' },
    { name: 'Mechanics Stripe', desc: 'Fast-Forward runs at 5×.' },
    { name: 'Skein Stripe', desc: 'Yarn ×1.5.' },
  ];
  NYA.LOOM_COL_STRIPES = [
    { name: 'Cast-On Stripe', desc: 'Catnip ×1.5.' },
    { name: 'Rib Stripe', desc: 'XP ×1.5.' },
    { name: 'Cable Stripe', desc: 'Catnip ×1.5.' },
    { name: 'Fair Isle Stripe', desc: 'XP ×1.5.' },
    { name: 'Bind-Off Stripe', desc: 'Catnip ×2.' },
  ];

  // ---------------- Pattern II: The Cable-Knit Cardigan (opens when Pattern I is complete; GDD §14.3) ----------------
  // Same five row themes, one size up: deeper head starts, a second set of knit multipliers (with Star Search),
  // more anchors, quality-of-life mechanics and stronger Skein tuning. Costs sit at late-game yarn (thousands to
  // hundreds of thousands a knot).
  NYA.LOOM2_ROWS = ['Head Start II', 'Knit Multipliers II', 'Timeline Anchors II', 'New Mechanics II', 'Skein Tuning II'];
  NYA.LOOM2 = [
    [
      { id: 'h2_cash', name: 'Trust Fund', cost: 1.5e4, desc: 'Start every season with 1M Catnip. Not during OVAs.' },
      { id: 'h2_maps', name: 'Survey Atlas', cost: 3e4, desc: 'Start every season with Tiers 2–4 surveyed. Not during OVAs.' },
      { id: 'h2_bunks', name: 'Bunk Blueprints', cost: 5e4, desc: 'Start every season with 2 more Bunk Beds. Not during OVAs.' },
      { id: 'h2_montage', name: 'Montage Tapes', cost: 8e4, desc: 'Start every season with Training Montage I–III (level cap 20). Not during OVAs.' },
      { id: 'h2_lab', name: 'Lab Notebooks II', cost: 1.2e5, desc: 'Start with Tuna Time, Whisker Sonar, Treat Bag, Catnip Hotbox and Laser Batteries ×3 already researched. Not during OVAs.' },
    ],
    [
      { id: 'k2_star', name: 'Star Search', cost: 5e4, growth: 2.5, max: NYA.KNIT_MAX, desc: 'Each rank: +5% chance an applicant is promoted one Aptitude grade. On a promotion, roll again, so they chain: C → B → A → S → SS → SSS → …', fx: l => (5 * l) + '% promotion chance' },
      { id: 'k2_pace', name: 'Leg Warmers', cost: 3e4, growth: 3, max: NYA.KNIT_MAX, desc: 'Pace ×1.15 per rank.' + KNIT_NOTE, fx: l => 'Pace ×' + NYA.fmt(Math.pow(1.15, NYA.knitEff(l))) },
      { id: 'k2_socks', name: 'Wool Socks', cost: 4e4, growth: 3, max: NYA.KNIT_MAX, desc: 'Stamina per swing ×0.85 per rank.' + KNIT_NOTE, fx: l => 'Stamina per swing ×' + Math.pow(0.85, NYA.knitEff(l)).toFixed(3) },
      { id: 'k2_res', name: 'Mohair Blend', cost: 6e4, growth: 3, max: NYA.KNIT_MAX, desc: 'Milk, sushi, cheese and greebles ×1.5 per rank.' + KNIT_NOTE, fx: l => 'Resources ×' + NYA.fmt(Math.pow(1.5, NYA.knitEff(l))) },
      { id: 'k2_carry', name: 'Pocket Knit', cost: 5e4, growth: 3.5, max: NYA.KNIT_MAX, desc: '+2 Carry per rank.' + KNIT_NOTE, fx: l => '+' + Math.round(2 * NYA.knitEff(l)) + ' Carry' },
    ],
    [
      { id: 'a2_vet', name: 'Veteran’s Pay', cost: 8e4, desc: 'Anchored catgirls earn +50% XP.' },
      { id: 'a2_anchor7', name: 'Timeline Anchor VII', cost: 1.5e5, desc: 'Keep 7 catgirls across seasons.' },
      { id: 'a2_head', name: 'Head Hunter II', cost: 2.5e5, desc: 'New recruits arrive at level 10, with two traits already rolled.' },
      { id: 'a2_anchor10', name: 'Timeline Anchor X', cost: 6e5, desc: 'Keep 10 catgirls across seasons.' },
      { id: 'a2_reunion', name: 'Class Reunion', cost: 1.2e6, desc: 'Anchored catgirls get +50% Power, Haste, Pace and Stamina.' },
    ],
    [
      { id: 'm2_drone3', name: 'Drone Firmware 3.0', cost: 1e5, desc: 'The Laser Drone marks every second with Focus 8.' },
      { id: 'm2_lockers', name: 'Walk-In Closet', cost: 6e4, desc: '+3 reserve slots in the Barracks.' },
      { id: 'm2_bank', name: 'Lucid Dreams', cost: 1.2e5, desc: 'Banked Time efficiency → 75%.' },
      { id: 'm2_ff', name: 'Laserdisc Fast-Forward', cost: 2e5, desc: 'Fast-Forward runs at 8×.' },
      { id: 'm2_intern', name: 'Doc Boom’s Intern', cost: 3e5, desc: 'R&D research finishes 4× faster.' },
    ],
    [
      { id: 's2_box', name: 'Box Magnet II', cost: 5e4, desc: '+5% Schrödinger’s Box chance, and boxes turn up in the Crystal Catacombs and deeper as often as in the Mousehole Maze.' },
      { id: 's2_mult', name: 'Triple Knit', cost: 1e5, desc: 'Yarn ×2.' },
      { id: 's2_deep', name: 'Deep Spool', cost: 2.5e5, desc: 'Catnip from the Crystal Catacombs and deeper counts ×3 toward yarn.' },
      { id: 's2_exp', name: 'Purl Two Together', cost: 6e5, desc: 'Yarn exponent +0.03.' },
      { id: 's2_exp2', name: 'Cast-Off Weave', cost: 4e6, desc: 'Yarn exponent +0.05 more.' },
    ],
  ];
  NYA.LOOM2_ROW_STRIPES = [
    { name: 'Head Start Stripe II', desc: 'Start every season with 1 more Bunk and a second free recruit. Not during OVAs.' },
    { name: 'Multiplier Stripe II', desc: 'Catnip ×5.' },
    { name: 'Anchor Stripe II', desc: 'Anchored catgirls get +25% Power, Haste, Pace and Stamina (stacks with the first Anchor Stripe).' },
    { name: 'Mechanics Stripe II', desc: 'Every standing order costs 1 less RP (minimum 1).' },
    { name: 'Skein Stripe II', desc: 'Yarn ×2.' },
  ];
  NYA.LOOM2_COL_STRIPES = [
    { name: 'Cast-On Stripe II', desc: 'Catnip ×2.' },
    { name: 'Rib Stripe II', desc: 'XP ×2.' },
    { name: 'Cable Stripe II', desc: 'Catnip ×2.' },
    { name: 'Fair Isle Stripe II', desc: 'XP ×2.' },
    { name: 'Bind-Off Stripe II', desc: 'Yarn ×1.5.' },
  ];

  // Every pattern, in order. Finishing one opens the next (GDD: six in all, the last an ugly Christmas sweater).
  NYA.LOOM_PATTERNS = [
    { n: 1, name: 'Pattern I: The Starter Sweater', grid: NYA.LOOM, rows: NYA.LOOM_ROWS, rowStripes: NYA.LOOM_ROW_STRIPES, colStripes: NYA.LOOM_COL_STRIPES },
    { n: 2, name: 'Pattern II: The Cable-Knit Cardigan', grid: NYA.LOOM2, rows: NYA.LOOM2_ROWS, rowStripes: NYA.LOOM2_ROW_STRIPES, colStripes: NYA.LOOM2_COL_STRIPES },
  ];
  NYA.LOOM_NODE = {};
  for (const p of NYA.LOOM_PATTERNS) p.grid.forEach((row, r) => row.forEach((n, c) => { n.row = r; n.col = c; n.pattern = p.n; NYA.LOOM_NODE[n.id] = n; }));
  NYA.loomCost = function (node, level) {
    if (node.growth) return Math.ceil(node.cost * Math.pow(node.growth, level));
    return level >= 1 ? Infinity : node.cost;
  };
})(globalThis.NYA = globalThis.NYA || {});
