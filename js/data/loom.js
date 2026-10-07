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
  NYA.YARN_EXP = 0.4;

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
      { id: 'km_catnip', name: 'Catnip Cable-Knit', cost: 1, growth: 4, max: 30, desc: 'Catnip ×2 per rank.', fx: l => 'Catnip ×' + NYA.fmt(Math.pow(2, l)) },
      { id: 'km_xp', name: 'Purl of Wisdom', cost: 2, growth: 3, max: 30, desc: 'XP ×2 per rank.', fx: l => 'XP ×' + NYA.fmt(Math.pow(2, l)) },
      { id: 'km_power', name: 'Muscle Mittens', cost: 4, growth: 3.5, max: 30, desc: 'Power ×1.5 per rank.', fx: l => 'Power ×' + NYA.fmt(Math.pow(1.5, l)) },
      { id: 'km_stamina', name: 'Cozy Scarf', cost: 8, growth: 3.5, max: 30, desc: 'Stamina ×1.5 per rank.', fx: l => 'Stamina ×' + NYA.fmt(Math.pow(1.5, l)) },
      { id: 'km_clear', name: 'Perfect Seams', cost: 15, growth: 4, max: 20, desc: '+0.25 Full-Clear Bonus per rank.', fx: l => '+' + (0.25 * l).toFixed(2) + ' clear bonus' },
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

  NYA.LOOM_NODE = {};
  NYA.LOOM.forEach((row, r) => row.forEach((n, c) => { n.row = r; n.col = c; NYA.LOOM_NODE[n.id] = n; }));
  NYA.loomCost = function (node, level) {
    if (node.growth) return Math.ceil(node.cost * Math.pow(node.growth, level));
    return level >= 1 ? Infinity : node.cost;
  };
})(globalThis.NYA = globalThis.NYA || {});
