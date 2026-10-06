# NYAPOTISM! — Catnip Mining Co.

Sep 27, 2026 · @Amy

*Game design document, v0.1. Working title; alternates: "Nyanium Rush", "Paws Down the Mineshaft", "Mewtual Extraction Co."*

## 0. The Pitch

You are a catgirl who has just been made Foreman of a catnip mining operation. You did not earn this. Your aunt owns the company, she is on permanent vacation somewhere tropical, and she communicates exclusively by fax. Your crew is a rotating cast of short-attention-span catgirls with pickaxes, your research department is building a nuclear warhead out of plywood, and your refinery officer has been yelling "Nyandeyanen!?" since 1987.

Underneath the jokes is a layered incremental game in the lineage of Antimatter Dimensions: a satisfying, readable core loop (send miners into a procedurally generated cave, steer their chaos with a laser pointer, haul out catnip), wrapped in prestige layer after prestige layer, each of which adds a genuinely new system rather than just a bigger number. The target is 150–300+ hours for a completionist, with the first prestige around hour 2 and a new "what the heck is THIS" system roughly every few hours for the first week.

## 1. Design Pillars

1. **Every number has a joke, and every joke has a number.** Flavor text is everywhere, but it never hides the math. Hover any stat and you get the real formula; the gag is the label, not the obstacle.
2. **Active play is a bonus, never a tax.** Laser pointers, bombs, and turret placement let an attentive player beat the odds, but the game must progress sensibly when you walk away. Idle is the floor; attention raises the ceiling.
3. **Chaos you can steer.** Miners are dumb on purpose. The fun is in the gap between what they do and what you want, and in the growing toolbox that closes it without ever making them smart enough to be boring.
4. **Every new system feeds the old ones.** Farming makes mining better, mining makes alchemy better, alchemy makes the mechs better. Nothing is a dead-end minigame.
5. **The show gets weirder every season.** The structure of the game is the structure of an 80s anime franchise, and escalation is the point.

## 2. The Framing Device: It's a TV Show

The entire progression is structured as if the game were a long-running 80s anime franchise. This gives every prestige layer an in-universe name and a natural "new season, new opening" beat.

| Game concept | In-show name | Notes |
| --- | --- | --- |
| One mine visit | **Episode** | Numbered and titled. "Episode 47: The Stone That Wouldn't Break!!" |
| Prestige via Schrödinger's Skein | **New Season / New Timeline** | Each season gets a new verse of the opening theme. |
| Challenge runs | **OVAs** (Original Video Adventures) | Weird premise, short run, big reward. OVAs were *the* 80s format for strange side stories. |
| Side systems (farm, fishing, alchemy, idols) | **Spin-offs** | Each has its own title card and theme song. |
| The mouse invasion of HQ | **The Movie** | Scripted, dramatic, forces the second prestige layer. |
| Second prestige layer | **Reboot** | Currency: **Déjà Mew**. |
| Endgame | **The Nine Lives** | Nine final arcs. You're a cat. You get nine. |

## 3. The Core Loop: One Episode

### 3.1 Flow

1. **Select mine.** Pay the purrmit (free for the Starter Mine).
2. **Pre-shift (optional).** Swap crew from reserves, adjust equipment, place turrets, pick your active-ability loadout. Skippable; the game remembers your last setup.
3. **Shift.** The simulation runs. Miners fan out, dig, haul, get distracted, and eventually run out of stamina. You intervene with tools.
4. **Wrap-up.** Tally screen, full-clear bonus, XP and level-ups, trait rolls.
5. **Eyecatcher.** A two-to-three frame gag animation.
6. **Next Episode Preview.** A one-line narrator tease for the next episode, then the new mine loads.

Steps 4–6 together are **Pack-Up Time**, a fixed simulated cost per episode (about 6 seconds at the start). The animations fill that time, but the time cost is real in the simulation, not just cosmetic. Players can hide the animations; they can only shorten the time through upgrades. That distinction matters for balance (see 3.8).

### 3.2 The Grid

Each mine is a fresh, seeded, procedurally generated grid. Mines do not persist between episodes. The Starter Mine is 16×12 (192 tiles); later mines go up to roughly 64×40.

| Tile | Base HP (Tier 1) | Drops | Notes |
| --- | --- | --- | --- |
| Dirt | 10 | Rubble (once unlocked) | Fast filler. |
| Stone | 25 | Rubble | Most of the early "wall." |
| Hardstone | 80 | Rubble | Appears from Tier 2. |
| Bedrock | ∞ | — | Indestructible, except by very late tools. |
| Catnip Ore | 15 per density layer | Nip Ore × density | See 3.3. |
| Special Node | varies | Milk, Sushi, Greebles, Crystals… | Mine-specific. |
| Air Pocket | — | — | Pre-open cavern space, revealed on breakthrough. Great moments of "oh, a whole room." |
| Elevator | — | — | The drop-off point, always on an edge. |

**Fog of war.** Every tile starts hidden except the elevator and its neighbours. A tile is revealed when it becomes orthogonally adjacent to an open tile; a Headlamp stat or equipment adds a reveal radius. Special tiles have a faint "sparkle" visible through fog once you buy the *Whisker Sonar* research, so you can hint at a vault without showing it.

**Generation.** A cellular-automata pass for cave shape, a few drunkard's-walk tunnels, then weighted placement of ore clusters. Starter composition target: \~45% dirt, \~28% stone, \~8% bedrock, \~12% catnip, \~7% air pockets.

**Critical rule: every resource tile must be reachable.** After generation, flood-fill from the elevator treating bedrock as walls. Any resource tile that is unreachable either gets the blocking bedrock downgraded to stone or is moved. A full clear must always be *possible*, even when it's not *likely*.

### 3.3 Density and Quality

These are the two axes of catnip value, and they deliberately behave differently.

- **Density (d):** how many ore items are packed into the tile. Tile HP = `15 × tierHP × d`. The tile drops one item each time its remaining HP crosses a multiple of its per-layer HP, so a d2 tile drops one item at half health and one at zero. Each item takes one inventory slot.
- **Quality (q):** how valuable each item is. Item value = `tierBase × q`. Quality costs nothing extra to mine or carry.

So a d5/q5 tile is worth 25 standard tiles, takes 5× as long to mine, and eats 5 inventory slots. **Quality is free value. Density is value that costs time and bag space.** That asymmetry is the whole design: quality upgrades are pure wins, density upgrades are powerful but threaten full clears.

**Spawn distributions (Tier 1 baseline):**

- Density: geometric distribution, `P(d = n) = 0.7 × 0.3^(n−1)`. Most tiles are d1, d3 is uncommon, d6 is a treat.
- Quality: weighted table, q1 50% / q2 28% / q3 14% / q4 6% / q5 2%.

**Readability.** Quality is shown by ore color *and* a shape (green triangle → blue square → purple diamond → gold star → rainbow heart for q5+), so it never relies on color alone. Density is shown by how "stacked" the ore sprite looks, with pips for 2–5 and a number badge above that. An accessibility toggle shows raw `d/q` numbers on every tile.

**The Motherlode.** Density has no hard cap. There's a tiny chance per mine (improved by research) that one catnip tile rolls an absurd density, 30–50. When a catgirl first reveals it: screen shake, a full-width banner reading **THE MOTHER-NYAN-LODE**, and Tora (the refinery officer) screaming from off-screen. It takes the whole crew to finish it, which makes it both a jackpot and a full-clear threat.

**Enrichment upgrades.** Later research lets a percentage of catnip tiles roll +quality or +density bonuses at generation. Because density enrichment can hurt full clears, it's governed by a player-controlled **Enrichment Dial** per mine: slide it toward Quality (safer) or Density (more total value, harder to clear). A later research, *Density Governor*, lets you cap maximum density per mine. Your upgrades never trap you; you choose how greedy to be.

### 3.4 Miner AI: The Short Attention Span Algorithm

Miners are intentionally imperfect. The algorithm should be cheap, predictable in aggregate, and funny up close.

**State machine:** `Idle → ChooseTarget → Walk → Mine → (Full → Return → DropOff) | (Stamina 0 → ClockOut) | Distracted → Idle`

**Choosing a target:**

1. Build the **frontier**: every mineable tile orthogonally adjacent to reachable open space.
2. Sample **K** random frontier tiles, where K = the miner's **Focus** stat (starts at 2).
3. Score each: `score = valueWeight × expectedValue − distWeight × pathDistance + noise`. Dirt and stone have a small "it's in the way" value so miners still dig toward unrevealed areas.
4. Always add any **laser-marked** tiles to the sample with a ×10 score multiplier.
5. Subtract a crowding penalty for tiles already claimed; two miners can share a tile with diminishing returns, three can't.
6. Pick the highest score.

With Focus 2, miners are close to random but tilt toward good tiles. With Focus 8+, they're near-optimal. Focus upgrades are therefore a strong mid-game investment that quietly reduce the need for laser micro, and they should feel that way.

**Distractions.** Every second, each miner has a small chance (her hidden **Whimsy** stat) of a distraction:

- Chases a butterfly to a random nearby tile.
- Stops to groom for two seconds.
- Loafs. Becomes a loaf. Is a loaf for three seconds.
- Bats a pebble, watches it roll, looks at the camera.
- Loafs on a passing robovac and rides it wherever it goes for four seconds (once Robovacs is researched).

Distractions cost no extra stamina. They cost time. Only traits and actives reduce Whimsy; no research or upgrade touches it. Traits never take it to zero. Only Catterall (§7) does, briefly, because a catgirl who never loafs is unsettling.

### 3.5 The Player's Tools: Laser Pointer and Spray Bottle

**Laser Pointer (priority).** Click or drag to mark tiles. Marked tiles glow red; any miner who samples them treats them as ×10 score. Early on you get 3 marks at a time. Upgrades: more marks, a *Laser Sweep* that marks a whole line, and eventually the *Laser Drone* (automation, see §11).

Visual gag, and a real mechanic: while a laser mark is fresh (first 3 seconds), miners walking to it get **Zoomies**, +50% move speed. Actively flicking the laser to pull miners across the map is a real skill-expression tool.

**Spray Bottle (forbid).** Unlocked mid-Tier 1. Mark tiles as forbidden; miners refuse to mine them and make a disgusted face if they path near one. Uses: protecting a Motherlode until the end of a shift so a single catgirl doesn't waste stamina chipping at it, keeping walls up in mouse mines, or preserving a choke point.

### 3.6 Stamina

- Every swing costs stamina: `swingCost = mineResistance × 0.99^grit`. Grit is a flat points stat that starts at 0; each point cuts swing cost by about 1%, multiplicatively.
  - Tier resistance grows ×1.6 per tier, so about 47 grit offsets one tier, and roughly 517 breaks even at Tier 12. That makes grit a stat you're always raising: levels, gear, traits and research all need to supply it at about that pace.
  - Because both curves are exponential, what counts is grit relative to the mine. +10 grit is always about 10% cheaper swings, whether a catgirl has 20 or 510, so a slightly grittier catgirl stays noticeably ahead of her peers all game.
  - If late-game numbers run away, soften it to `swingCost = mineResistance × 0.99^(grit^0.99)`. At 500 grit that behaves like about 470, a mild squeeze that only bites at high values.
- Walking drains stamina at about 12.5% of the rate mining does: `walkDrain = 0.125 × swingCost` per second spent walking, measured against the base rate of one swing per second. It scales with mine hardness and grit just like mining. Haste upgrades don't make walking any pricier, and higher Pace makes each trip cheaper because it takes fewer seconds. From Tier 3, a full bag raises the walking drain by 50%, which makes Carry and drop-off distance matter.
- Mouse attacks drain stamina directly.
- At 0 stamina, a miner "flops": she waddles back to the elevator with whatever she's carrying and clocks out with a *zzz* bubble. She never loses her inventory, and if there's no path home she's rescued instead (§9.5). Running out of stamina is a pacing limit, not a punishment.
- All stamina restores between episodes.

### 3.7 Ending an Episode

An episode ends when any of these is true:

- **Full clear:** every resource tile (catnip and special nodes) has been mined. Dirt and stone don't count.
- **Everyone's clocked out.**
- **The Whistle:** the player calls it early (useful when three miners are loafing at 4 stamina each).

**Full-Clear Bonus.** A full clear stamps a giant **PERFECT CLEAR!!** across the tally screen and applies a retroactive multiplier to *all* resources earned that episode. Base ×1.25, upgradeable through research to ×2 and eventually beyond via yarn. This is the reward for over-preparing for a mine, and it's what makes dropping down a tier occasionally correct.

**Episode Rating.** S/A/B/C/D based on percent of resource value extracted. Ratings feed Auntie's faxes (achievements) and some traits ("Perfectionist: +10% power in mines where she's gotten an S before").

### 3.8 Why You Can't Just Farm the Starter Mine Forever

Catnip per second for any mine is roughly `CPS ≈ episodeYield / (shiftTime + packUpTime)`.

The Starter Mine has a hard ceiling on yield (it's small and low-value) and Pack-Up Time has a floor (1.5 s, even fully upgraded). So even when your crew clears it in 4 seconds, you're spending more than a quarter of your time on transitions for tiny yields. Meanwhile, tier value scales by ×10 per tier.

| Mine | Avg yield (fully cleared) | Clear time (well-geared) | Pack-up | Effective CPS |
| --- | --- | --- | --- | --- |
| Starter (T1) | \~45 | 4 s | 1.5 s | \~8 |
| Scratching Post (T2) | \~700 | 14 s | 1.5 s | \~45 |
| Yarnball Caverns (T3) | \~9,000 | 40 s | 1.5 s | \~215 |

This is the core tension of the macro game: **push a tier higher (slower, riskier, higher value) or stay where you can reliably full clear (safer, bonus-boosted).** It should be close enough that both answers are sometimes right.

### 3.9 The First Ten Minutes (Concrete Walkthrough)

- **0:00** — Auntie's first fax: "CONGRATULATIONS ON YOUR PROMOTION. DON'T TELL ANYONE WE'RE RELATED. ♡". You have one catgirl, Mochi. She has 60 stamina, 5 power, carries 5.
- **0:30** — Episode 1 ends. Mochi mined 14 tiles, three were catnip, and she loafed twice. You have 4 catnip. Tora: "Four?! FOUR?! Nyandeyanen!?"
- **1:00** — You've learned that clicking a catnip tile makes Mochi go get it. You buy *Sharper Pickaxe* (+power).
- **2:00** — Second catgirl. Two miners, twice the loafing.
- **3:30** — Refinery Mk II. Tora is briefly happy.
- **5:30** — Barracks upgrade, third catgirl. Mochi hits level 3 and rolls her first trait: **Big Pockets** (+2 carry). You feel attached to Mochi.
- **\~10:00** — First full clear of the Starter Mine. Big stamp, big number. The Purrmit Office unlocks, and Inspector Pochi (a dog) glares at you through the window.

## 4. Catgirls

### 4.1 Hiring

Hiring happens at the Barracks via a recruitment poster. Cost is small and scales gently: `10 × 1.15^(hiresThisSeason)` catnip, which is trivial by mid-game. Every recruit is generated with:

- A name (first + family name from pools: Mochi, Yuzu, Kinako, Azuki, Nori, Momo, Pudding, Biscuit… + Nekomaru, Tabbygawa, Whiskerton, Purrington…).
- Fur pattern (tabby, calico, tuxedo, siamese, tortie, orange, black, white). Cosmetic, but some traits reference it.
- A one-line personality blurb from a big table ("Claims she's never loafed. Is loafing right now.").
- **No traits.** Traits are earned, not rolled at the door.
- A hidden **Aptitude** grade (C to S) affecting stat growth per level. Hidden until you buy the *Résumé Reader* research, at which point the rehire-and-fire loop gets a real optimization target.

The real cost of a catgirl is time: levelling her up and seeing what she becomes.

### 4.2 Stats

| Stat | What it does | Base |
| --- | --- | --- |
| Power | Damage per swing | 5 |
| Haste | Swings per second | 1.0 |
| Pace | Tiles per second walking | 2.0 |
| Stamina | Total swing budget per shift | 60 |
| Carry | Inventory slots | 5 |
| Focus | Target sample size (K) | 2 |
| Grit | Cuts swing stamina cost \~1% per point, multiplicatively (see 3.6) | 0 |
| Whimsy (hidden) | Distraction chance per second | 4% |

Global upgrades multiply these; levels and traits add on top.

### 4.3 Levels and XP

- XP comes from swings, items mined, and full clears. Harder mines give more XP.
- Each level grants +3% to core stats, scaled by Aptitude.
- **Level cap** starts at 5 and is raised by the *Training Montage* upgrade line (with an actual 80s training montage animation the first time you buy each rank): 10, 15, 20, 30, 40, 50. Yarn and later layers push it higher.
- **Trait thresholds:** levels 3, 8, 15, 25, and 40. A max-level catgirl has five traits.

### 4.4 Traits

At each threshold, a trait is rolled. Roughly 55% positive, 25% mixed (a real upside with a real downside), 20% negative. Rarity tiers: Common, Uncommon, Rare, Legendary.

**Mine-flavored rolls.** The trait pool is weighted by *the mine she was in when she hit the threshold*. Hit level 15 in the Dairy Depths and you're far more likely to roll a milk-related trait. This is the core of specialist building: you deliberately level a catgirl in a particular mine to fish for a trait. It's also why reserves become valuable; you keep the specialist on the bench until her mine comes up.

**Sample traits**

*Mining*

- **Chunky** (mixed) — +30% Power, −15% Pace. A thicc queen.
- **Kneader** (positive) — +50% damage vs dirt. Makes biscuits out of it.
- **Ore Sniffer** (positive) — catnip tiles get ×2 score in her target sampling.
- **Lucky Paw** (rare) — 5% chance any catnip item drops at +1 quality.
- **Double Dipper** (rare) — 3% chance any catnip item drops twice.
- **Allergic to Dirt** (negative) — −30% damage vs dirt. Sneezes.

*Movement and attention*

- **Laser-Brained** (mixed) — triple Zoomies from the laser, but +50% Whimsy when there's no laser active.
- **Tunnel Vision** (mixed) — Focus +4, ignores laser marks entirely.
- **Box Obsessed** (negative) — will stop and sit in any 1×1 air pocket for 5 seconds. Every time.
- **Zoomies at 3AM** (positive) — random bursts of +100% Pace.

*Stamina*

- **Power Napper** (positive) — at 0 stamina, naps for 5 seconds and wakes with 20% once per shift.
- **Sleepyhead** (negative) — starts shifts at 80% stamina.
- **Night Owl** (positive) — swings cost half stamina below 25%.

*Economy*

- **Big Pockets** (positive) — +2 Carry.
- **Butterfingers** (negative) — 5% chance to drop an item on the walk home. Another miner can pick it up.
- **Tabletop Menace** (negative) — occasionally knocks a dropped item into a crevice, lost forever. Looks you in the eye while doing it.
- **Hoarder** (mixed) — +50% Carry, but won't return until full, even when a Blunt is about to go off cooldown.

*Social and synergy*

- **Team Player** — +10% Haste to miners within 2 tiles.
- **Loner** — +25% Power with no miners within 3 tiles.
- **Loaf Squad** — +5% all stats per other Loaf Squad member in the crew. Stacks. Build around it.
- **Tuxedo Club** — +15% Power if at least two tuxedo-pattern catgirls are in the crew.
- **Rivals (with \[Name\])** — +20% Power when her rival is also on shift, −10% Focus from glaring.
- **Besties (with \[Name\])** — share stamina: when one flops, the other gives her 10%.

*Combat* (matters once mice appear)

- **Mouser** — double damage vs mice.
- **Scaredy Cat** — flees mice instead of fighting. Great in a mouse-free mine; terrible elsewhere.
- **Pacifist** — never fights; mice ignore her 50% of the time.

*Mine-flavored* (only from the matching mine)

- **Lactose Tolerant** (Dairy Depths) — pumpjacks she operates run 30% faster.
- **Sushi Snob** (Sushi Grotto) — +1 quality on sushi nodes.
- **Cheese Magnet** (Mousehole Maze) — mice drop double cheese around her.
- **Greeble Whisperer** (Greeble Crash Site) — greebles sometimes follow her home.

*Legendary*

- **Nine-Lives Energy** — once per shift, a flop instantly restores 100% stamina.
- **Main Character Syndrome** — +50% all stats; other miners get −5% for being side characters.
- **Déjà Mew** — only obtainable post-Reboot; she remembers past timelines (see §17).

### 4.5 Firing (Transfer to Corporate)

Firing a catgirl is framed as *Transfer to Corporate*. Auntie takes her. You get a small catnip refund, and she occasionally sends a postcard from the beach. This keeps optimizing your roster from feeling cruel.

Later, the **Alumni Network** (yarn unlock) turns transferred catgirls into a tiny passive: each alumna at level 25+ adds +0.1% to a stat tied to her best trait. Firing becomes a slow investment rather than a waste.

### 4.6 Roster, Reserves, and Squads

- **Active crew cap:** starts at 1, raised by Barracks upgrades to about 12 over a season. These are the catgirls who go into mines.
- **Reserve cap:** starts at 2. Reserves don't mine but keep their levels and traits. You can swap between episodes for free. The cap is raised slowly by research and meaningfully by yarn, since you don't need many reserves until the spin-offs arrive.
- **Squads:** saved crew presets ("Milk Squad," "Mouse Busters," "Speedrun Girls"). Standing Orders can swap squads automatically per mine, which is where specialists pay off in automation.

### 4.7 Equipment

Equipment is crafted at the **Workshop**, run by Hagane, a silent blacksmith catgirl who communicates only in "…" and thumbs-ups. It's the main sink for special resources, so every mine's unique output has a reason to exist.

**Slots:** Tool, Outfit, Trinket (Trinket unlocks later). Items have a rarity and can be upgraded with more resources.

- *Tools:* Rusty Pick (starter), Stone Pick, Cheese Grater Pick (+damage vs hardstone, crafted from cheese, ironically), Greeble Drill, Moonstone Pick.
- *Outfits:* Headlamp Helmet (+reveal radius), Hi-Vis Hoodie (mice target you less), Wetsuit (required for deep Sushi Grotto water), Asbestos Apron (fire resistance for the Onsen Abyss; the tooltip insists it's fine).
- *Trinkets:* Rubber Ducky (+1 Focus), Cardboard Box (+stamina regen while idle), Collar Bell (mice notice you more; a taunt item for tank builds), Silent Bell (mice notice you less; the Vault mine's stealth tool), Lucky Fish Charm (+Lucky Paw chance).

## 5. Headquarters

HQ is a small, scrollable side-view compound (think the cross-section base screens of 80s mecha shows) that fills in as you unlock things. Each building has a character who runs it, a shop or panel, and idle animations you can watch.

| Building | Run by | Function |
| --- | --- | --- |
| Foreman's Office | You | Mine select, roster overview, Auntie's fax machine |
| Refinery | Tora Naniwa | Converts Nip Ore to Catnip; refinery upgrades |
| Barracks | Sgt. Paws | Hiring, crew cap, reserves, squads, Training Montage |
| R&D Lab | Dr. Nyako "Doc Boom" Bakuhatsu | Research tree, active abilities, Project MEWCLEAR |
| Workshop | Hagane | Equipment crafting and upgrades |
| Purrmit Office | Inspector Pochi | Mine purrmits, Standing Orders (automation) |
| Tanuki's Emporium | Tanuki-san | Limited-time bonus mines, rare trinkets |
| *Later:* Farm, Fishing Pier, Canteen, Alchemy Lab, Idol Stage, Mech Hangar, Quantum Loom | various | Spin-offs and prestige systems |

## 6. The Economy

### 6.1 Currencies and Resources

| Resource | Source | Main uses |
| --- | --- | --- |
| **Nip Ore** | Catnip tiles | Refined into Catnip at the end of each episode |
| **Catnip** | Refinery | Main currency: upgrades, hires, purrmits, research |
| **Rubble** | Dirt/stone (after *Robovacs* research) | Pipes, turret bases, farm soil; swept up by robovacs, takes no inventory |
| **Milk** | Dairy Depths | Canteen, alchemy, equipment, purrmits |
| **Sushi** | Sushi Grotto | Purrmits (the aliens love it), canteen, equipment |
| **Cheese** | Mice, mouse nests | Equipment, alchemy, turret upgrades |
| **Crystals** | Crystal Catacombs | Laser upgrades, high-tier tools |
| **Greebles** | Greeble Crash Site | Automation hardware, mech parts |
| **Obsidian / Onsen Eggs** | Onsen Abyss | Heat gear, stamina consumables |
| **Moonstone** | Lunar Litter Site | Top-tier equipment |
| **Yarn** | Prestige (Skein) | Yarn upgrades |
| **Déjà Mew** | Reboot | Second-layer upgrades |

### 6.2 The Refinery

Raw Nip Ore is refined at the end of each episode: `Catnip = oreValue × refineryMultiplier × fullClearBonus × globalMultipliers`.

**Refinery levels** (Mk I to Mk XX) each multiply output by ×1.5, with cost growing ×4 per level, so it's always a good buy but never the only one.

**Refinery Modules** (unlocked through research) change *how* value is computed and reward different mining styles:

- **Centrifuge:** bonus for high-density tiles: +1% per density point above 1 on that tile's ore. Pairs with the Enrichment Dial pushed toward Density.
- **Polisher:** quality becomes superlinear, `value = tierBase × q^1.15`, later ^1.3. Pairs with quality enrichment and *Lucky Paw*.
- **Byproduct Still:** diverts q1 ore into **Nip Extract**, used to craft extra Catnip Blunt charges. Turns junk ore into stamina.
- **Tora's Special Blend** (late): a gamble button. Once per season, stake 50% of your refinery output for 10 minutes for a random ×0.5 to ×4 result, with Tora commentating live. Pure spectacle; mathematically neutral-to-slightly-positive.

### 6.3 Tier Scaling

| Property | Scaling per tier |
| --- | --- |
| Nip value (`tierBase`) | ×10 |
| Tile HP (`tierHP`) | ×3.5 |
| Stamina cost per swing (`mineResistance`) | ×1.6 |
| XP per item | ×2.5 |
| Purrmit cost | roughly ×12 |

The ×10 value jump is deliberately larger than the typical early quality spread (q1–q5), so even a q1 tile in Tier N+1 matches or beats a q5 tile in Tier N. Late-game quality enrichment (q8–q10) blurs that line on purpose, making a perfectly tuned lower-tier mine a real contender again.

## 7. Active Abilities

All actives come out of Doc Boom's R&D Lab. Cooldowns tick in simulation time and persist across episodes, so a long cooldown might be available once every few episodes. Each has an upgrade track (charges, strength, cooldown) and, later, an auto-cast rule.

- **Catnip Blunt** — restores a flat, upgradable amount of stamina to a single miner (\~30%) after a brief smoking animation. Hand these out like candy. Holds 3 charges (more with upgrades); each charge refills on a 40 s CD.
- **C****a****t****n****i****p**** ****Hotb****o****x**** ** — Placed on a tile. All catgirls will rush towards it and smoke a single, slightly weaker version of the Catnip Blunt. The single biggest "make or break" button for full clears.  CD 5 min.
- **Hairball Bomb** — thrown at a tile; deals heavy damage in a 3×3 area. Upgrades: *Sticky Hairball* (damage over time), *Cluster Hairball* (splits into four). CD 45 s.
- **Tuna Time!** — a can-opener sound echoes through the mine and every miner gets +50% Haste for 10 s. CD 90 s.
- **Catterall** — every miner gets +50% Pace and Haste, +50% maximum stamina (the extra is added on cast and trimmed off when it ends), and 0% Whimsy for 90 s, long enough to cover several episodes. Pupils go to pinpricks, tails stop swishing, and the crew mines in total silence. It is deeply unsettling. CD 20 min.
- **Whisker Sonar** — reveals fog in a 7×7 area and highlights special tiles. CD 30 s.
- **Cardboard Box Drop** — drops a box on an open tile; miners who rest inside regain stamina over time. *Box Obsessed* catgirls stop being a liability near it, a deliberate synergy.
- **Treat Bag** — instantly grants a chunk of XP to one catgirl. Long CD. Good for fishing a trait threshold in the right mine.
- **THE MEWCLEAR OPTION** — see Project MEWCLEAR below.

**Tolerance.** Every mid-shift stamina restore makes the next one on the same catgirl 20% weaker, multiplicatively, and it resets between episodes. That covers Blunts, Hotbox puffs, Silvervine Blunts, and every \~30% of stamina regained from a Cardboard Box rest or a hot-spring soak. Total restored stamina tops out at 5× the first dose (about 150% of max for a 30% Blunt), so no pile of charges or cooldowns can keep a crew going forever, even in a marathon mine. It's true to life, too: real cats stop responding to catnip for a while after a session. Once-per-shift traits (*Power Napper*, *Nine-Lives Energy*) are exempt.

### 7.1 Project MEWCLEAR

When you first enter the R&D Lab, you see the engineers hammering nails into a warhead made of plywood and duct tape. That's not just a gag; it's the lab's flagship research project, a ten-stage research line that runs from Tier 1 to about Tier 7. Each stage has its own absurd progress note and changes the warhead's sprite in the lab:

1. "Acquired plywood."
2. "Structural duct tape applied. Structurally."
3. "Nails. So many nails."
4. "Found a fin. Taped fin to it."
5. "Doc Boom says the uranium is 'basically catnip if you think about it.'"
6. "Someone drew a face on it. The face is staying."
7. "It hums now. Nobody knows why."
8. "Tora has filed a formal complaint. Nyandeyanen."
9. "Painted it pink for morale."
10. "IT WORKS?? IT WORKS!!"

Each stage also grants a small permanent bonus along the way (hairball damage, sonar radius), so it never feels like a pure sink. Stage 10 unlocks **The Mewclear Option**: once per real hour, clear a massive radius of the current mine, *including bedrock* (the only thing that ever can), and irradiate catnip at the edge of the blast for +2 quality ("Glowing Nip"). The animation is a full-screen 80s-anime mushroom cloud in the shape of a cat head, followed by every miner standing in the crater with afro hair.

## 8. Research (R&D)

Research is a tech tree with six branches. Nodes cost catnip (and later, special resources). Many have a short build timer ("Doc Boom is hammering…"), which Lab Assistants (reserve catgirls assigned to the lab, unlocked mid-game) can speed up.

- **Excavation:** Power, Haste, pickaxe tiers, *Grooved Stone* chains.
- **Logistics:** Carry, Pace, drop-off speed, *Robovacs*, Pack-Up Time reduction (6 s → 1.5 s floor).
- **Personnel:** Barracks slots, Focus, Training Montage (level caps), *Résumé Reader*, reserve slots.
- **Ordnance:** every active ability and its upgrades, plus Project MEWCLEAR.
- **Exploration:** mine unlocks, Whisker Sonar, Enrichment Dial, Density Governor, Motherlode chance, full-clear bonus.
- **Defense:** turrets, Turret-chan, combat stats.

Mine unlocks live in Exploration, and each one is gated by a milestone (e.g., "Full-clear Scratching Post Quarry 5 times") as well as a cost, so you prove you're ready before you're allowed to be underprepared.

## 9. Mines

### 9.1 Purrmits

Every mine except the Starter Mine costs a **purrmit** per visit, issued by Inspector Pochi, a dog-girl from the Ministry of Holes who is deeply suspicious of cats. Purrmits cost catnip and, from Tier 5 up, rare resources. That's what creates the supply-chain loops the automation system exists to solve: you'll run the Sushi Grotto twice to afford one visit to the Greeble Crash Site.

### 9.2 Main Mines

These 12 tiers are a starting roster, not the cap. The full game will likely have many more, spaced so a new tier is never far away. Don't treat this list or ordering as final.

**Tier 1 — The Backyard Burrow** (16×12, free). The starter. Dirt, stone, bedrock, catnip. Small enough to learn on, big enough that the first full clear takes about 10 minutes of progression.

**Tier 2 — Scratching Post Quarry** (20×14). Stone-heavy with hardstone veins. Quirk: **Grooved Stone**, lines of pre-scored stone that shatter in a chain when one tile breaks. Smart laser use turns one swing into six tiles.

**Tier 3 — Yarnball Caverns** (24×16). Twisting tunnels, lots of air pockets. Quirk: **Tangles**, thread-filled open tiles that slow movement until a miner cuts through. First mine where **Schrödinger's Box** can appear (see §14).

**Tier 4 — Dairy Depths** (28×18). Introduces **Milk Nodes** and the pumpjack system:

- When a milk node is revealed, the nearest idle miner becomes its **Pump Operator**. She builds a pumpjack (free, costs a few seconds and some stamina), then lays pipe along the shortest open path back to the elevator. Pipe costs stamina per tile.
- Milk then flows at a rate that falls off with pipe length: `flow = pumpLevel / (1 + pipeLength / 12)`. The operator spends stamina to keep the pump running.
- Research **Pipe Junctions**: new pipes can connect to an existing line instead of running all the way back. Milk nodes clustered together suddenly become much cheaper, and it becomes worth laser-marking a path so the trunk line goes where you want it.
- A node is "cleared" for full-clear purposes when pumped dry.

**Tier 5 — Sushi Grotto** (30×20). Flooded caverns with wild nigiri growing on the rocks like barnacles. Quirk: **Water.** Opening a tile next to a flooded chamber lets water flow in (simple cellular fluid, capped per tick for performance). Catgirls hate water: −50% Pace and double stamina drain while wet. The Wetsuit, drain pumps, and careful Spray Bottle use to keep walls intact until a chamber is drained all matter here. Sushi is the big purrmit currency for Tiers 7–9.

**Tier 6 — Mousehole Maze** (32×22). Mice everywhere, mouse nests, cheese. The first mine where turrets are required rather than optional. Drops less catnip than Tier 5, deliberately: it's the cheese mine.

**Tier 7 — Crystal Catacombs** (36×24). Crystal Catnip clusters. Quirks: **Refraction:** a laser mark on one crystal propagates to every connected crystal. **Resonance:** mining a crystal deals splash damage to adjacent crystals. Chains are huge if you set them up right.

**Tier 8 — Greeble Crash Site** (40×26). A crashed alien saucer. **Greebles** are mobile resources: little alien doodads that wander between open tiles and must be cornered against walls to collect. Purrmit costs sushi (the aliens have a sushi thing). Greebles are the key input for automation hardware and, later, mech parts.

**Tier 9 — Fort Knocks** (48×32). The vault mine. Mostly empty halls and bedrock rooms, with mineable steel **Doors** (very high HP). Mouse **Commandos** patrol with vision cones; being spotted triggers an alarm that spawns reinforcements. Hidden inside: a handful of **Vaults**, each holding a small mass of  high-density, high-quality catnip tiles. It's a stealth-and-heist mine: Silent Bells, *Pacifist* catgirls, and Hairball Bombs on doors. Full-clearing Fort Knocks is a flex.

**Tier 10 — Onsen Abyss** (48×32). Volcanic hot springs. Quirk: **Heat.** Tiles near magma raise a miner's heat meter; at max, she overheats and flops. **Hot spring pools** restore stamina if a catgirl soaks in them, but she might not get out for a while. Asbestos Aprons required. Obsidian and Onsen Eggs.

**Tier 11 — Lunar Litter Site** (56×36). Reached by a rocket Doc Boom built from the same materials as the warhead. Quirk: **Low gravity.** Miners move in bounces and sometimes overshoot their target by a tile. Moonstone. The skybox is Earth, with Auntie's vacation island visible if you zoom in.

**Tier 12 — The Cat's Cradle** (64×40). Quantum string-space, the place the Skein comes from. Quirk: **Superposition tiles**, which randomly flip between solid and open while no catgirl has line of sight to them. Flipped-solid tiles are always dirt or stone, never bedrock, and the elevator's neighbours never flip. So a flip can close a shortcut and force a long detour or some digging, but it can never truly cut off ore or the way home. The highest Skein chance, and the only mine where certain late-game prestige resources drop.

### 9.3 Alternate Mines (Yarn Unlocks)

Each alternate is a sidegrade for its tier: more specialized, sometimes strictly better for one purpose.

- **Sandbox Dunes (T2α):** sand tiles fall into open space below them. Catgirls love sand (+200% Whimsy) but it's full of high-quality nip.
- **Cardboard Canyon (T3α):** every tile is a box. Very low HP. *Box Obsessed* catgirls become unplayable; everyone else has the best XP/hour in the tier.
- **Oat Milk Aquifer (T4α):** milk springs that flow without pumps, but at lower value. For lactose-intolerant crews.
- **Conveyor Belt Cavern (T5α):** rows of tiles slide along conveyor belts, like a sushi restaurant. Ore passes by; timing matters.
- **Rat Race Speedway (T6α):** mice run laps on a track. Barely any catnip, enormous cheese.
- **Hall of Mirrors (T7α):** laser marks bounce off mirror tiles, marking everything in their path.

### 9.4 Limited-Time Bonus Mines

Tanuki-san, a travelling raccoon-dog merchant, sets up a stall in the Emporium on a random timer (every 2–4 hours of sim time). Each visit offers one limited mine scaling to fit a chosen tier for 20–30 minutes. Buy a single **queued purrmit**; it waits in your queue until you choose to run it, so buying is the attention reward and running it is flexible.

- **Golden Week Goldmine:** golden catnip everywhere.
- **Tanabata Starfield:** star-shaped ore clusters; connect them with laser marks to form constellations for a bonus.
- **Obon Lantern Caves:** ghost catgirls from past timelines mine alongside your crew.
- **Mochi Pounding Mine:** New Year's. Mochi tiles need two miners in rhythm.
- **Summer Matsuri Mine:** goldfish-scooping nodes, festival music, fireworks eyecatcher.

To keep this from punishing idle players, Tanuki leaves one **Rain Check** if an offer expires while you're away (maximum one held). Paying attention gets you every offer; being away still gets you some.

Queued purrmits can be bought automatically as a standing order, but it's the most RP-hungry order in the game (§11.1), so hands-off players pay for that convenience with other automation.

### 9.5 Hazards: Bamboo, Cave-ins, and Rescue

These are modifiers, not mines. They get sprinkled across the tier list so they keep turning up in new combinations.

**Bamboo.** Nasty, worthless tiles that drop nothing and never count toward a full clear.

- Bamboo grows during a shift: +1 density every few seconds of sim time, and its HP scales with density like catnip does. A fresh shoot takes one swing; an old stalk takes a crew.
- At high density (around d5), each growth tick can sprout a new d1 shoot into a neighbouring open or dirt tile. It never grows over ore, but it will happily seal a tunnel.
- Left alone, it chokes your paths and turns a long shift into a worse one, so bamboo mines reward speed and early laser marks on young shoots. Hairball Bombs are the panic button.
- Growth resets with each new mine, like everything else, so bamboo is pressure within a shift, never a problem that follows you.
- Trait hook: **Weed Whacker** (positive): +200% damage vs bamboo. Rolled mostly in bamboo-heavy mines.

**Cave-ins.** "Unstable" mines are spread through the tiers and can collapse a region mid-shift, dropping a mound of dirt and stone onto open tiles.

- They're telegraphed: dust trickles and the screen rumbles for 2–3 seconds first. Active players can flick the laser to Zoomies miners out of the zone.
- A tile that lands on a catgirl is destroyed instantly, for free: no stamina, no drops, no harm. She pops out with a dazed swirl over her head.
- Collapses never fill the elevator or its neighbours, and never bury ore or special nodes. They can cut milk pipes, though ("Spilled Milk" fax), and they can wall catgirls into lone pockets.
- A walled-in catgirl with stamina digs herself out: while she has no path home, her target picks favour tiles that bring her closer to the elevator.
- Research: *Shoring* shrinks collapses, and *Seismograph* lengthens the warning. Trait hook: **Canary** (positive): senses cave-ins early and yowls a warning that gives the whole crew +1 s.

**The rescue rule (applies everywhere).** A catgirl with 0 stamina (or no tiles they can mine) and no path to the elevator is lifted out for free by the **Rescue Claw**, a giant UFO-catcher claw that descends through the ceiling, grabs her by the scruff, and drops her in the elevator with her full inventory. It covers every way to get stranded: cave-ins, bamboo, sand, water, and the Cat's Cradle's flipping tiles. Being stranded should cost time, never progress.

### 9.6 Mine Archetypes and Marathon Mines

Each mine introduces an **archetype**: a core rule that defines how it plays. With far more than 12 tiers planned, archetypes come back with variations instead of each appearing once. A returning archetype has to bring at least one new rule and a different layout grammar, so it reads as a sequel rather than a reskin. A mine that borrows another's archetype (a second heist mine, say) must still have its own signature: a different threat, a different tool it rewards, or a different payoff.

**Marathon mines** are a new archetype. The first is **The Big Haze**, which slots in as an extra option around Tier 5.

- A colossal cavern, around 96×64, several times the area of a normal mine, packed with high-density (d4–d12), low-to-mid quality (q1–q3) catnip.
- A persistent **catnip haze** cuts all stamina drain by about 75%. It also nudges Whimsy up a little, because everyone is extremely relaxed.
- Shifts take 10–20× as long as a normal episode, with proportionately bigger rewards. Pack-Up Time is paid once per episode, so marathon mines are where transition overhead almost vanishes, making them an ideal overnight or Fast-Forward pick.
- Long cooldowns finally fit inside a single shift: the Catnip Hotbox, Catterall and even the Mewclear Option can all come up mid-episode.
- Hauling distance would dominate at this size, so the map has several elevators or a mine-cart line that auto-returns full bags.
- A full clear is the white whale: rare, and enormous when it lands.

| Archetype | First appearance | A later variation (example) |
| --- | --- | --- |
| Chain-break | T2 Scratching Post Quarry | Domino Galleries: pre-scored stone laid out in long runs that topple across the whole map |
| Pumping | T4 Dairy Depths | Ramune Springs: fizzy nodes build pressure, so pipes that run too long can burst and need to be rebuilt. |
| Flooding | T5 Sushi Grotto | Tide Caves: the water rises and falls on a timer, and the dry windows are your mining time |
| Heist | T9 Fort Knocks | Museum of Cultural Purrservation: laser-tripwire grids instead of patrols, where *Laser-Brained* catgirls are a liability and *Tunnel Vision* ones shine |
| Heat | T10 Onsen Abyss | Permafrost Pantry: the reverse; idle catgirls slowly freeze, so keep them moving or near campfire tiles |
| Marathon | \~T5 The Big Haze | A deeper, denser haze where the hauling line has to be built by the crew |
| Overgrowth | A bamboo-heavy mine, \~T7 | A thicket whose stalks grow faster the more of them you cut |

## 10. Mice and Defense

### 10.1 Mice

Mice spawn from **Mouse Nests** (special tiles) and, in some mines, from the fog edge. Each mine has an Aggression value. Contact with a mouse drains stamina. Nests count as resource tiles, so full clears in mouse mines require destroying them, and each one drops a big **Cheese Wheel**.

| Mouse | Behaviour |
| --- | --- |
| Scout | Fast, fragile, chases the nearest catgirl |
| Bruiser Rat | Slow, tanky, heavy stamina damage |
| Pickpocket | Steals one item from a full inventory and runs for the nest. Kill it to get the item back. |
| Sapper | Burrows through dirt, opening new paths. In the Sushi Grotto, this causes floods. |
| Medic | Heals nearby mice |
| Cheese Golem | Mini-boss made of cheese. Drops an absurd amount of cheese. |
| Commando | Fort Knocks guard with a vision cone; triggers alarms |
| The Four Cheesenals | Named bosses (Gouda, Feta, Havarti, Limburger) that appear in late tiers and in The Movie |

### 10.2 Defense Progression

1. **Catgirls fight back.** Adjacent mice are auto-attacked; each attack costs stamina. Combat traits start mattering.
2. **Manual turrets.** Place a limited number during pre-shift or mid-shift on any revealed open tile:
   - *Squeaky Decoy:* pulls aggro.
   - *Yarn Launcher:* slows.
   - *Hairball Cannon:* single-target damage.
   - *Mousetrap Mortar:* area damage.
   - *Tesla Scratching Post:* chain static damage.
   - *Laser Turret:* massive damage, but nearby catgirls get distracted by the beam. High-risk, high-reward; hilarious with *Laser-Brained*.
3. **Turret-chan.** An anxious intern who auto-places turrets for you. She's *slightly unoptimized* by design, and it's part of her character: she likes symmetry, always puts one next to the elevator "for vibes," and over-defends the first chamber she sees. Upgrading her (Defense research) sands off her quirks one at a time, each with a little dialogue ("I-I read a book about chokepoints!"). She's never perfect, so manual placement stays worth it for the hardest mines.

## 11. Automation: Standing Orders

Automation is filed as paperwork with Inspector Pochi, who stamps each form with visible reluctance. It unlocks in levels:

Every order you file draws on a shared **Requisition Budget** (see 11.1), so automation is something you allocate, not just something you unlock.

1. **Auto-Repeat:** rerun the current mine forever.
2. **Playlist:** a loop of up to four mines.
3. **Conditionals:** add lines like `IF Sushi < 50 GOTO 1`, `SQUAD Milk Squad`, `WAIT UNTIL Blunt READY`.
4. **Auto-Buy:** purrmits, upgrades by category, with spending limits ("never spend more than 10% of current catnip").
5. **Auntie's Fax Macro Language** (yarn unlock): a real text-based scripting language shown on dot-matrix fax paper. This is the endgame automation layer, in the spirit of Antimatter Dimensions' automator.

```
REM  greeble supply loop
LOOP
  WHILE sushi < 400
    VISIT sushi_grotto SQUAD "wet cats"
  END
  VISIT greeble_crash SQUAD "greeble gang"
  IF skein_found THEN PRESTIGE
END
```

**Laser Drone:** an automation unlock that marks one tile every few seconds. It picks from a random sample using its own Focus stat, so, yes, the drone also has a short attention span. Drone Focus upgrades are a late sink.

**Auto-cast:** each active can be given a rule, like "cast Blunt on any miner below 30% stamina" or "cast Sonar at the start of each shift."

### 11.1 The Requisition Budget

Every standing order draws **Requisition Points (RP)** from one shared budget: Auto-Repeat, Playlist slots, conditionals, Auto-Buy rules, fax macro lines, the Laser Drone, and auto-cast rules. Pochi's office shows it as a free/allocated memory bar styled like an 80s PC boot screen, with each order as a colored block. An order that doesn't fit is stamped PENDING and simply doesn't run.

The puzzle is that you can always *write* more automation than you can *run*. Choosing which conditionals to keep, which actives to auto-cast, and which to keep pressing by hand until the limit goes up is a small optimization game of its own.

| Standing order | RP cost |
| --- | --- |
| Auto-Repeat | 1 |
| Playlist | 1 per mine in the loop |
| Conditional line (`IF`, `WAIT UNTIL`, `SQUAD`) | 1 each |
| Auto-Buy rule | 2 per category |
| Auto-cast rule | 2 per active; 6 for the Mewclear Option |
| Laser Drone | 4, +1 per Drone Focus upgrade |
| Fax macro | 1 per executable line; `REM` comments are free |
| Tanuki auto-buy (limited-time purrmits) | 8, the hungriest order in the game |

Tanuki auto-buy is expensive on purpose. It's the order that fully replaces paying attention (§9.4), so it should crowd out several conveniences you'd otherwise keep.

**Raising the limit.** The budget starts at 8 RP when Standing Orders unlock.

- **Filing Cabinets** at the Purrmit Office, bought with catnip. The steady early source.
- **Pochi's Trust.** Every purrmit filed builds trust, and each trust rank adds RP, which ties the budget to her slow softening across seasons.
- **Greeble Co-processors**, crafted at the Workshop from Greebles. Big chunks, and a lasting reason to run the Crash Site.
- **Yarn upgrades** in the Loom's New Mechanics row, plus a handful of faxes that grant +1 RP.
- **Compression research**, which cuts costs instead: conditionals that share a resource check cost 1 together, and the first auto-cast rule is free.

Tuning target: the budget sits a little below what the player wants for most of a series, then comfortably covers a full setup once Déjà Mew upgrades land. For flavor, the bar has a **Defragment** button that rearranges the colored blocks into neat order. It does nothing. Pochi looks deeply satisfied.

## 12. Banked Time (The Catnap Bank)

The game doesn't simulate progress while closed. Instead, offline time is converted into **Banked Time** at 33% efficiency (upgradeable to about 60% with yarn). Banked time is spent as **Fast-Forward**: the whole simulation runs at 2× (later 3×, 5×, 10×) with no penalty until the bank runs out. You can pause spending at any time.

Every system runs on simulation time, not wall-clock time, including crop growth, cooldowns, and Tanuki's timer. That keeps the model simple (no separate offline calculations for each spin-off) and makes Fast-Forward feel like a real, universal accelerant. While the game is open, it always runs at least at 1×.

## 13. Faxes From Auntie (Achievements)

Achievements arrive as faxes, printed with a dot-matrix screech and her signature doodle. There are about 150, arranged in a grid by season. Each gives a tiny permanent bonus (+1% catnip, +1% XP, etc.) and many are jokes:

- **"You Mined A Rock"** — Mine your first tile. "PROUD OF YOU. TELL NO ONE."
- **"Loaf Of The Month"** — Have your entire crew loafing at the same moment.
- **"Nyandeyanen!?"** — Find a Motherlode.
- **"Spilled Milk"** — Let a pipe route be cut. "NO USE CRYING. (CRY A LITTLE.)"
- **"Mutually Assured Destruction"** — Use the Mewclear Option in the Starter Mine. For no reason.
- **"HR Would Like A Word"** — Transfer 100 catgirls to corporate.
- **"Rivals To Lovers"** — Have two catgirls who are each other's Rivals roll *Besties* with each other.
- **"Totally Normal Company"** — Hidden. Reach Episode 1,000. The fax just says "WE NEED TO TALK ABOUT SOMETHING. LATER."

Faxes also deliver the story: new systems are announced by fax, and Auntie's increasingly strange knowledge of things that haven't happened yet is the long-running mystery (see §20).

## 14. Seasons: Schrödinger's Skein and Yarn

### 14.1 Finding the Skein

Starting in Tier 3, any mine can generate a **Schrödinger's Box**: a sealed cardboard box tile with a faint hum. Base chance is about 1% per episode in Tier 3, rising steeply per tier (see the table below), plus a pity counter that adds 0.5% for every eligible episode without one.&#32;

**Tuning targets** (the numbers are starting points for the balance harness):

- **First timeline:** a new player should almost always find the Skein before unlocking Tier 4. As a safety net, the first Schrödinger's Box a player ever opens always holds the Skein; the empty-box outcome below only applies from the second season on.
- **Tier scaling** mostly matters for rapid prestige runs that skip whole tiers, so later seasons don't stall when Tier 3 flies by. The rise per tier should be steep, roughly tripling each tier.
- **By about Tier 6**, a box should be nearly guaranteed within a short run of episodes.

| Tier | Starting box chance per episode | Chance of a box within 10 episodes (with 0.5% pity) |
| --- | --- | --- |
| 3 | 1% | \~28% (\~99% within 40) |
| 4 | 5% | \~53% |
| 5 | 15% | \~85% |
| 6 | 35% | \~99% |

When a catgirl mines the box, the waveform collapses:

- **The Skein is inside.** A time-manipulating yarn ball of quantum string floats out. Everything freezes for a beat, the screen goes monochrome, and the opening theme's chorus plays in music-box form.
- **It's empty.** She finds a *Tangled Thread* instead (a small catnip payout), and the next box's Skein chance is raised by 25 percentage points. By the third box, it's guaranteed.

Only one Skein can be collected per season. Once you have it, it sits on your office desk humming, and the **Unravel Timeline** button appears.

### 14.2 Prestiging (New Season)

Unravelling resets catnip, upgrades, research, the refinery, mine unlocks, and your roster. It keeps yarn, yarn upgrades, faxes, cosmetics, lifetime stats, saved automation scripts, and the Alumni Network.

**Yarn formula:** `yarn = floor((seasonCatnip / 1e6) ^ 0.4) × yarnMultipliers`

| Season catnip | Yarn |
| --- | --- |
| 1e7 | 2 |
| 1e8 | 6 |
| 1e10 | 39 |
| 1e12 | 251 |
| 1e15 | 3,981 |

The office always shows *yarn if you unravel now* and *yarn per minute this season*, so players can find the optimal prestige point themselves, the same way Antimatter Dimensions surfaces IP/min.

**First season target:** 90–150 minutes. By season five, a season should take 20–30 minutes; by season fifteen, under 10.

### 14.3 The Quantum Loom (Yarn Upgrades)

Yarn is spent at the **Quantum Loom**, which appears in HQ after the first prestige. The upgrade screen is a sweater being knitted.

**The Sweater Pattern** is a 5×5 grid of upgrades. Buying all five in a row or column "completes a stripe" for an extra bonus, and completing the full sweater unlocks the next pattern (there are six patterns, each a different sweater design, the last one ugly-Christmas themed). Row themes:

- **Head Start:** start seasons with more crew slots, catnip, refinery levels, and pre-researched nodes.
- **Knit Multipliers:** big, repeatable multipliers to catnip, XP, and resources, with exponentially scaling costs.
- **Timeline Anchors:** keep 1, 2, then up to 5 catgirls (with levels and traits) across seasons.
- **New Mechanics:** Laser Drone, Fax Macro Language, Alumni Network, alternate mines, reserve slots, Banked Time efficiency and Fast-Forward speed tiers.
- **Skein Tuning:** Schrödinger's Box chance, yarn gain exponent (0.4 → 0.45 → 0.5).

The early-game rows are intentionally huge. A second-season player with ×3 catnip, three starting crew slots, and a pre-built Refinery Mk III should rocket through Tier 1 in two minutes, which is exactly the feeling that makes prestige satisfying.

**Spin-off unlocks** also live here as expensive standalone knots: Farm, Fishing Pier, Alchemy Lab. That's where the "yarn unlocks new game mechanics" promise is delivered.

## 15. OVAs: Challenge Runs

OVAs unlock after your fifth season. Each is a special season with a limiter, a goal, and a reward that's usually a new yarn upgrade or a permanent rule change. Every OVA has three "releases" of increasing difficulty: **VHS**, **Laserdisc**, and **Director's Cut**, each with its own reward, which triples the challenge content without tripling the design work.

NOTE: Order and goal not currently set in stone. Be open to the idea of repeat challenge runs with higher goals and/or harder requirements.

| # | Title | Limiter | Goal | Reward |
| --- | --- | --- | --- | --- |
| 1 | **One Cat Army** | Crew is capped at one catgirl, who gets ×5 stats. | Reach Tier 4 | *Ace Protocol:* your first-hired catgirl each season gets ×2 stats. Transferring her applies the bonus to your next hired catgirl. |
| 2 | **Mouse Apocalypse** | Mice spawn in every mine at 5× aggression. | Find the Skein | Cheese becomes a global multiplier (+1% catnip per log10 cheese) |
| 3 | **Lights Out** | Fog never reveals more than 1 tile away; no Sonar. | Full-clear Tier 3 | +1 base reveal radius, Sonar auto-casts free each shift |
| 4 | **No Laser Zone** | Laser pointer disabled. | Reach Tier 5 | +2 base Focus permanently |
| 5 | **Budget Cuts** | Refinery locked at Mk I. | Earn 1e9 catnip | Refinery Modules start unlocked each season |
| 6 | **Nine to Five** | Every episode has a hard 30-second limit. | Full-clear Tier 4 | Pack-Up Time floor lowered from 1.5 s to 0.5 s |
| 7 | **Cursed Density** | All catnip spawns at ×5 density, but all catnip is less valuable; full-clear bonus doubled. | Full-clear Tier 5 | Centrifuge upgraded; Density Governor free |
| 8 | **Monday** | Every catgirl has *Sleepyhead* and ×3 Whimsy. | Reach Tier 6 | *Loaf Power:* loafing restores stamina |
| 9 | **Inflation** | Each purrmit costs the square of the last one. | Find the Skein | Purrmit costs ×0.5 forever |
| 10 | **Wrong Timeline** | You can't choose mines; each episode is random. | Earn 1e12 catnip | *Episode Roulette:* optional mode with a +25% bonus |
| 11 | **Hagane's Day Off** | No equipment. | Full-clear Tier 6 | Second Trinket slot |
| 12 | **The Aunt Strikes Back** | Every 60 s, Auntie faxes a random edict ("ALL MINERS MUST WEAR HATS": −10% Pace, +10 Grit). | Reach Tier 8 | *Edicts:* you can issue your own edicts, trading one stat for another |

Your two examples fit perfectly as OVAs 1 and 2. A later batch (13–20) unlocks after the Reboot and combines limiters ("One Cat Army + Mouse Apocalypse") for the truly unhinged.

## 16. Spin-Offs

Spin-offs are the long-tail (heh) systems that run in parallel to mining. Each has its own title card, a theme song, a character, its own resources and upgrades, and at least two cross-feeds into other systems. **They are staffed by reserve catgirls**, which is the moment the reserve roster stops being a convenience and becomes essential.

Each catgirl has a **Skill Rank** (1–10) in each spin-off she's worked in. Ranks give a small spin-off-specific perk and, at rank 5 and 10, roll a **Specialty** from that spin-off's own pool. Specialties are separate from mining trait slots, so a great farmer doesn't sacrifice a mining slot.

### 16.1 Mimi's Harvest Farm

Run by **Mimi Kirakira**, a former 80s pop idol who got sick of fame and moved to the countryside. Farm plots are built from **Rubble**, which finally gives dirt and stone a purpose.

- **Catnip (herbal):** feeds the refinery's *Herbal Infusion* multiplier.
- **Cat Grass:** stamina ingredient for the Canteen.
- **Silvervine (Matatabi):** super-catnip. Crafts *Silvervine Blunts*, which restore 100% stamina.
- **Valerian:** brewed into tea that raises Banked Time efficiency.
- **Mystery Seeds:** found attached to Greebles. They grow alien plants with random effects.

Crops grow in simulation time. Farmers with the right Specialty (*Green Paw*, *Scarecrow Energy*, *Talks To Plants*) speed growth or raise yields. Cross-feeds: needs Rubble and Fish Emulsion (from Fishing); feeds the Refinery, Canteen, and Alchemy.

### 16.2 Captain Salty's Pier

Run by **Captain Salty Whiskers**, an ancient sea-cat who has been trying to catch the same legendary tuna, **Maguro-sama**, for forty years.

- **Nets** fish idly and are staffed by reserves.
- **The Rod** is an optional timing minigame: a tension bar you keep in the sweet spot. It gives better fish but is never required.
- **The Fish-dex** holds about 60 species across rarities, each giving a small permanent bonus on first catch.
- **Bait** comes from mine Grubs (a rare drop from dirt) and farm crops.
- **Maguro-sama** needs a specific rod, bait, crew, and Salty himself at rank 10. Catching it is a season-long quest with a tearful payoff.

Cross-feeds: fish become **Sushi** at the Canteen, an alternate sushi supply that relieves pressure on the Sushi Grotto for purrmits; fish scraps become fertilizer for the Farm.

### 16.3 Nekomanma Canteen

Run by **Obaa-chan**, a tiny elderly catgirl cook who thinks everyone is too thin. The Canteen turns milk, fish, crops, and cheese into **Meals**. Before each episode, every crew member can eat one (the *Bento Loadout*), and meals are consumed per shift, making them a steady resource sink that automation has to account for.

- *Tuna Onigiri:* +15% Stamina.
- *Milk Tea:* +1 Focus.
- *Silvervine Curry:* +25% Power, +50% Whimsy.
- *Cheese Fondue:* +30% combat damage.
- *Obaa-chan's Special:* random great buff; she won't say what's in it.

Recipes are discovered by combining ingredients. Obaa-chan also sometimes packs an unrequested extra onigiri, a random small bonus.

### 16.4 The Pawacelsus Memorial Laboratory (Alchemy)

Run by **Nyacolette Flamel**, an apprentice who is absolutely obsessed with the legendary alchemist Pawacelsus ("They say the legendary alchemist Pawacelsus discovered how to transmute milk into cheese!"). No one has ever met Pawacelsus.

- **The Cauldron:** three ingredient slots, a heat dial, and a brew time. New combinations are recorded in the **Grimoire** (about 80 entries).
- **Transmutation:** convert surplus resources into scarce ones at a loss. This is the pressure valve for supply chains: if you're drowning in cheese and short on sushi, alchemy fixes it. Milk into cheese is the first recipe you learn.
- **Elixirs:** consumable active-style buffs.
- **Quintessence:** a slow-accumulating resource spent to inscribe **Transmutation Circles**, which are permanent global multipliers.
- **Homuncu****t****ie****s****:** tiny artificial catgirls made in a flask. They join the crew as extra miners that only dig dirt and stone: no stamina, no traits, no inventory. They clear filler so your real catgirls can go straight for ore.
- **The Philosofur's Stone:** the alchemy capstone, a multi-stage project needed for the endgame.

### 16.5 NYAIDOL PROJECT

Unlocked after the Reboot. Mimi is persuaded out of retirement to produce a new idol unit. Form a unit of 3–5 reserve catgirls; concerts run idly (with an optional rhythm minigame) and earn **Fans**.

- Fans unlock **Sponsorships**: purrmit discounts, catnip multipliers, cosmetic outfits.
- Performing catgirls roll performance Specialties (*Center Position*, *Tone Deaf But Trying*, *Fan Service Is Illegal At Work*).
- **Song Power:** during mech battles, the idol unit performs live on the HQ roof and buffs the mech. Singing as a combat mechanic, in the grand tradition of 80s space opera.

## 17. The Movie and the Reboot

### 17.1 Foreshadowing

From about Season 10 onward, the game starts dropping hints:

- Mice start appearing, rarely, in mines that shouldn't have any.
- A new eyecatcher shows a mouse holding a "WE'LL BE BACK" sign, and it appears more often the closer you get.
- Tora mentions squeaking under the refinery floor. Sgt. Paws starts doing night patrols.
- Auntie's faxes get strange: "HOW'S THE WEATHER. HOW ARE THE WALLS. ARE THE WALLS OKAY."

### 17.2 The Invasion

Somewhere between day two and three of play (a threshold on lifetime yarn), the title card appears: **NYAPOTISM! THE MOVIE: Revenge of the Rodent Imperium.**

Emperor Roquefort and the Four Cheesenals attack HQ. It plays out as a real defensive sequence using everything you have (turrets, actives, crew) and it's winnable for a while, which makes it hurt more when Roquefort's colossal mech, **The Big Cheese**, arrives and flattens the refinery. With HQ collapsing, the Foreman grabs the Skein and unravels not just the season, but the entire series.

Before it triggers, Auntie sends one clear fax: "SOMETHING BAD HAPPENS IN 3 HOURS. SPEND YOUR YARN. TRUST ME." That gives players a warning to spend and prepare. The invasion should feel dramatic, not like a punishment for not having read a wiki.

### 17.3 The Reboot

The Reboot is the second prestige layer. It resets seasons, yarn, and yarn upgrades (except those protected by Déjà Mew upgrades) and grants **Déjà Mew**, based on lifetime yarn earned in the series.

The first, forced Reboot is deliberately generous: enough Déjà Mew to immediately buy upgrades that make the next series dramatically faster (auto-collect Skeins, keep Timeline Anchors, start with the Loom's first row complete). After the invasion is defeated in the new timeline, future Reboots are voluntary.

**Déjà Mew upgrades** ("Memories"):

- *I've Been Here Before:* auto-unravel when yarn gain crosses a threshold you set.
- *Deep Anchors:* keep yarn upgrades across Reboots.
- *Muscle Memory:* catgirls start each season at level 5.
- *Déjà Mew* trait: a new Legendary trait that only appears post-Reboot. A catgirl with it remembers past timelines and gains +1% all stats per season she has existed in, uncapped.
- *Mouse Intel:* see the next invasion wave's composition in advance.
- New spin-off unlocks: NYAIDOL PROJECT and the Mech Hangar.

## 18. Super Robot NYANZER (Mech Battles)

In the new timeline, you know the mice are coming. Doc Boom, who has been waiting her whole life for someone to say "build a giant robot," builds one.

### 18.1 How Battles Work

The Mech Hangar adds an **Invasion Track** to HQ: a lane-based auto-battle that runs in parallel with mining. Every few minutes of sim time, a wave of Rodent Imperium units marches on HQ, and NYANZER meets them.

- **The Mech:** five component units (Head, Torso, Arms, Legs, Tail), each piloted by a reserve catgirl. They combine, with a full 80s combination sequence (skippable), into Super Robot NYANZER.
- **Pilot stats** come from a new **Piloting** skill and specialties like *Hot-Blooded*, *Calm Under Fire*, *Screams Attack Names*. That last one is a genuine bonus: +10% damage on special moves.
- **Parts** are primarily crafted from Greebles, Moonstone, and **Scrap** (dropped by enemy mechs), so the mining loop feeds the war.
- **Special Moves** are the mech's actives: *Rocket Paw Punch*, *Hairball Missile Barrage*, *Kitty Litter Shield*, and the finisher, *NINE LIVES SLASH*.
- **Song Power** from the idol unit multiplies everything.

Losing a wave damages an HQ building (for example, the Refinery goes offline for a few minutes), which gives defense real stakes without ever wiping progress. Winning drops Scrap and **Mouse Tech**, which unlocks a new research branch reverse-engineered from their machines.

### 18.2 The Campaign

Fifty numbered Battle Episodes with a boss every ten: Gouda (the brute), Feta (the tactician, crumbles under pressure), Havarti (the smooth talker who tries to recruit your pilots), Limburger (everyone avoids him; his special attack is his smell), and finally Emperor Roquefort in The Big Cheese.

The twist, in proper 80s-anime tradition: the mice attacked because the mining operation keeps digging through their homes. Defeating Roquefort leads to a peace treaty instead of a victory lap. The Imperium becomes a trading partner (cheese imports, mouse engineers at the Workshop), while the wild mice in the mines stay hostile, so no mechanics are lost.

## 19. The Nine Lives (Endgame)

After the peace, Auntie's faxes stop being funny. She knows things she can't know. The endgame is **The Nine Lives**: nine unique arcs, each a special series with its own rules, its own mechanic, and a boss or goal. Completing a Life grants a permanent, game-changing **Life Power**.

1. **Life of Plenty — The Bottomless Mine.** One infinite mine that scrolls downward. Depth records, escalating tiers every 50 rows. *Power:* depth record adds a permanent tier-value multiplier.
2. **Life of Solitude — The Foreman Digs.** Only you mine. Your stats come from your fax collection. *Power:* the Foreman joins every crew as an extra miner.
3. **Life of Chaos.** Whimsy is maxed; every catgirl's traits reroll every episode. *Power:* one free trait reroll per catgirl per season.
4. **Life of Hunger.** Resources spoil over time; the Canteen is your only multiplier. *Power:* meals no longer consume resources.
5. **Life of War.** Invasions every 60 seconds. The mech also mines. *Power:* NYANZER can be deployed into mines.
6. **Life of Song.** Every multiplier is replaced by Fans. *Power:* Song Power applies to mining.
7. **Life of Transmutation.** You can only mine one resource; everything else must be transmuted. *Power:* transmutation becomes lossless.
8. **Life of Stillness.** Time only moves when you spend Banked Time. *Power:* Banked Time efficiency reaches 100%.
9. **Life of the Box.** The Foreman enters Schrödinger's Box herself. There's no boss. There's a fax machine, and on it, a stack of faxes addressed to you, in your own handwriting.

## 20. Story and Cast

### 20.1 The Big Reveal

The final Life reveals the joke that's been under the whole game: **Auntie is you.** The Chairwoman is the Foreman from a future timeline who used the Skein to send money, faxes, and a promotion back to her past self. The nya-potism was self-nepotism the entire time. The game's final interaction is you, as the Chairwoman, typing the very first fax of Episode 1: "CONGRATULATIONS ON YOUR PROMOTION. DON'T TELL ANYONE WE'RE RELATED. ♡" (The game prompts you to type, but any key you press becomes the next one in the string. You have to press and hold to place the heart, with a downwards pointing finger hovering over the key.)

Then the credits roll over an ending-theme montage of every catgirl you ever transferred to corporate, all together at the beach.

**Post-game — Director's Cut:** an endless mode with scaling Lives, leaderboards for Bottomless Mine depth, and OVA speedrun times.

### 20.2 Cast

- **The Foreman (you).** Default name Mikan Nekomata, renameable. An orange catgirl with a hard hat two sizes too big. Mostly silent, communicates in reaction faces: a flat stare, a giant sweat drop, an explosion of sparkles.
- **Chairwoman Kurone Nekomata ("Auntie").** Never seen except in a sun-bleached photo: sunglasses, Hawaiian shirt, a cocktail with three umbrellas. Faxes only. All caps. Always signs with ♡.
- **Tora Naniwa, Refinery Officer.** Tiger-striped, loud, and the tsukkomi (the straight-man role in Kansai manzai comedy) to everyone else's nonsense. Carries a harisen (paper fan) for smacking. Speaks English peppered with Kansai-ben and cat puns: "Nyandeyanen!? Four catnip!? My grandma mines faster'n that and she's a HOUSECAT!" Secretly proud of you.
- **Dr. Nyako "Doc Boom" Bakuhatsu, Head of R&D.** Goggles, singed lab coat, zero concept of risk. Her engineers, the Nail Girls, hammer constantly. Catchphrase: "It's fine! It's *structurally* fine!"
- **Sgt. Paws, Barracks.** Drill-sergeant cadence, but every order is about hydration and naps. Cries at every hire and every transfer. "LISTEN UP, RECRUIT! DRINK WATER! TAKE A NAP! I'M SO PROUD OF YOU!"
- **Hagane, Workshop.** Silent blacksmith. Speaks only in "…" and thumbs-ups. Has, somehow, the most emotionally affecting side quest in the game.
- **Inspector Pochi, Purrmit Office.** A dog-girl from the Ministry of Holes, suspicious of every cat. Over many seasons she softens, and in a late event she joins the crew as the only non-cat miner, with the unique trait *Good Girl* (fetches items dropped by *Butterfingers* miners).
- **Tanuki-san, Emporium.** Travelling raccoon-dog merchant with a leaf on her head and used-car-salesman energy. "Limited time only! Well, all time is limited, if you think about it."
- **Turret-chan.** Anxious defense intern. Apologizes to turrets.
- **Mimi Kirakira.** Retired idol turned farmer turned reluctant idol producer. Sparkles involuntarily.
- **Captain Salty Whiskers.** Old sea-cat. Speaks entirely in nautical metaphors, most of them wrong.
- **Obaa-chan.** Canteen cook. Four feet tall. Terrifying.
- **Nyacolette Flamel.** Alchemist apprentice. Believes in Pawacelsus the way some people believe in Bigfoot.
- **Emperor Roquefort and the Four Cheesenals.** Villains with capes, monologues, and a surprisingly sympathetic grievance.

### 20.3 Character Design: Hair and Ears

Every catgirl has cat ears and no human ears, and the designs should prove it. The classic three catgirl hairstyles are allowed but kept in the minority: the chunky bob, the very long bangs, and the convenient hair tendrils that happen to cover exactly where human ears would be. Plenty of designs should leave the sides of the head plainly visible.

- Mix in styles that show the sides of the head: buzzcuts, undercuts, high-and-tights, slicked-back hair, tight buns, high ponytails, side shaves.
- At least one catgirl has a **velvet buzz**: a buzzcut grown out just long enough to be soft rather than bristly. There's no single standard name for it (barbers usually go by clipper guard size), so "velvet buzz" works in-universe.
- Nobody tucks her hair behind her ear. There's nothing to tuck it behind.
- The recruit generator draws from the same hairstyle pool, weighted so a crew never looks like one haircut repeated.

| Character | Hair |
| --- | --- |
| Mikan (the Foreman) | The bob, flattened by a hard hat two sizes too big |
| Tora | Striped hair in a high ponytail, sides fully visible |
| Doc Boom | Singed frizz held back by her goggle strap |
| Sgt. Paws | High-and-tight |
| Hagane | Velvet buzz; nothing for forge sparks to catch |
| Inspector Pochi | Twin braids beside floppy dog ears |
| Tanuki-san | Messy undercut with the leaf pinned on top |
| Turret-chan | Convenient hair tendrils, which she hides behind |
| Mimi Kirakira | Big 80s idol curls pinned up into twin buns |
| Obaa-chan | Tight grey bun |
| Nyacolette Flamel | Very long bangs; can't see her cauldron, won't cut them |

## 21. Writing and Tone

The comedic register is 80s anime comedy: slapstick, extreme reaction faces, sudden sparkle backgrounds for dramatic moments, super-deformed chibi panic, and characters who take ridiculous things completely seriously. Everyone is a caricature; nobody is mean.

### 21.1 Episode Titles

Every episode gets a generated title from templates keyed to what happened in it, shown on the tally screen:

- "\[Catgirl\] Finds a \[Rare Thing\]?! \[Dramatic Claim\]!!"
- "The \[Adjective\] Rock That Wouldn't Break!"
- "Episode 203: Nyandeyanen, Part 17"
- Rare: "Episode 404: Episode Not Found"

### 21.2 Next Episode Previews

A narrator line plays over a freeze-frame at the end of the transition. Pools per mine, per character, per event, plus rare ones:

- "Next time: Mochi gets a new pickaxe! But is it… too sharp?!"
- "Next time: Tora finds a q1 tile and loses her mind. Again."
- "Next time: the Scratching Post Quarry! Will our heroes survive… the stone?!"
- "Next time: nothing happens. It's a mine. Please look forward to it."
- (After a Motherlode) "Next time: can Tora recover from THE MOTHER-NYAN-LODE? Doctors say no."

### 21.3 Eyecatchers

Two-to-three-frame gag animations in the middle of the transition, drawn in full cel-anime style. Common ones rotate often; rare ones (1-in-500) go into a collectible **Eyecatcher Gallery**, which is a completionist goal of its own.

1. A catgirl plugs both ends of a male-to-male power cable into an outlet and ascends as an angel. Expression :3 in all three frames.
2. A catgirl eyes a box that's clearly too small. Frame 2: she's in it. Frame 3: the box is now catgirl-shaped.
3. Doc Boom hammers a nail into the warhead. It goes *boing*. She gives a thumbs-up, hair smoking.
4. A catgirl slowly pushes a mug off a table, looking at the camera. Frame 3: she pushes the camera off the table.
5. The laser dot lands on a catgirl's own forehead. She goes cross-eyed.
6. Three catgirls stacked into a totem pole. The bottom one sneezes.
7. Pochi stamps a purrmit: NO. She flips the stamp: FINE.
8. A loaf of bread and a loafing catgirl side by side. A hand picks one and butters it. It was the wrong one.
9. Hagane gives a thumbs-up. Her thumb is a tiny pickaxe.
10. Turret-chan places a turret facing the wrong way. It shoots her hat off.
11. A mouse holding a sign: WE'LL BE BACK. (Foreshadowing; frequency rises before the Movie.)
12. Auntie's fax machine prints a fax: "STOP LOOKING AT THE FAX MACHINE."
13. A catgirl at a computer typing "nyaaaaaaaaa". The monitor shows this game.
14. Tora smacks a pickaxe with her harisen. The pickaxe bows in apology.
15. Rare: the Foreman takes off her hard hat. Under it is a second, smaller hard hat.
16. A catgirl turns around and appears to have human and cat ears. Frame 2: the catgirl next to her shrieks in full 80s horror shading. Frame 3: she pulls off a novelty human-ear headband and her friend sags with relief.

### 21.4 Sample Barks

- Tora, low haul: "Nyandeyanen!? I've seen more catnip in a hairball!"
- Tora, great haul: "Meccha good! …Don't let it go to yer head, boss."
- Tora, Motherlode: "FIFTY?! Density FIFTY?! Somebody hold my harisen, I'm gonna—" *(faints)*
- Doc Boom, new research: "Good news! It works. Bad news! I don't know *why* it works."
- Sgt. Paws, on firing: "SHE'S NOT GONE, SHE'S JUST AT CORPORATE." *(sobbing)*
- Pochi, first purrmit: "Sign here. And here. And here. Do not scratch the form."
- Turret-chan: "I put one by the elevator! For… for vibes!"

## 22. Presentation

### 22.1 Art

- **Mine view:** clean top-down pixel art (16×16 or 24×24 tiles) that prioritizes readability: ore, fog, mice, and laser marks must pop at a glance. Catgirls are chibi sprites with big expressive heads.
- **Portraits, eyecatchers, cutscenes:** full 80s cel-anime style: big shoujo eyes, open mouths that are tall and narrow or entirely devour the chin, hard two-tone shadows, sparkle and speed-line backgrounds, occasional painted "dramatic still" frames.
- **Palette:** pastel sunset pinks, teal, lavender, and neon accents. Each mine gets its own palette shift.
- **VHS mode:** optional scanlines, slight chromatic aberration, and a tracking glitch during transitions. Off by default in the mine view to protect readability.

### 22.2 Audio

- City pop and synth-funk soundtrack; each mine and spin-off gets its own theme.
- An opening theme that gains a new verse each season, and a new arrangement after the Reboot.
- A proper sentai-style combination theme for NYANZER.
- SFX: pickaxe tinks, ore sparkles, the dot-matrix fax screech, Tora's harisen *thwack*. A soft "nya" per swing is available as a toggle, because it will drive some people up the wall.

### 22.3 UI Layout

- **Center:** the mine.
- **Left rail:** crew cards with stamina bars, carry counters, and status icons (loafing, fighting, wet, overheated).
- **Right rail:** tools (laser, spray) and actives with cooldown rings.
- **Top bar:** resources, with a hover breakdown of every multiplier.
- **Bottom:** HQ building tabs.
- **Hotkeys:** 1–9 for actives, L for laser, S for spray, W for the whistle, Space to pause.
- **Numbers:** suffixes (K, M, B, T…) up to about 1e33, then scientific, with a setting to force scientific.

## 23. Accessibility and Comfort

- No mechanic ever requires fast reflexes. Every active and tool can eventually be automated, and anything timed (the fishing rod, rhythm concerts) is optional bonus content.
- Toggles for screen shake, flashes, VHS effects, and the per-swing "nya."
- Quality is encoded by shape and color, with an option to show raw density/quality numbers.
- Every cutscene and eyecatcher can be skipped or hidden (the time cost is simulated either way).
- Being away is never punished beyond not earning; there are no decaying resources or missed-login penalties outside the Life of Hunger arc, which is opt-in.
- Text scaling and a high-contrast mine palette.

## 24. Pacing Targets

Hours assume moderately active play with some Banked Time use. These are targets for tuning, not promises.

| Time | Milestone |
| --- | --- |
| 0–10 min | Tier 1, first full clear, Purrmit Office |
| 10–45 min | Tier 2, Spray Bottle, 4–5 crew, first actives |
| 45 min–2.5 h | Tier 3, Schrödinger's Box, first Skein, Season 2 |
| 2.5–8 h | Seasons 2–6, Tiers 4–6, milk and sushi, Playlist automation |
| 8–20 h | OVAs, Farm, Tiers 7–8, conditionals, Project MEWCLEAR completes |
| 20–40 h (days 2–3) | Fishing, Canteen, Alchemy, Fort Knocks, foreshadowing, **The Movie**, first Reboot |
| 40–80 h | Mech campaign, NYAIDOL PROJECT, Onsen Abyss, Lunar Litter Site, Fax Macro Language |
| 80–150 h | Campaign finale, the Cat's Cradle, OVA Director's Cuts, OVAs 13–20 |
| 150–300 h | The Nine Lives, the reveal, Director's Cut post-game |

## 25. Implementation Notes

- **Separate simulation from presentation.** Run the simulation on a fixed timestep (say 20 ticks per second) and render by interpolation. Fast-Forward is then just running N ticks per frame, and a headless simulation is available for testing and balancing.
- **Seeded determinism.** Each mine's seed is derived from the season seed and the episode number, so bugs are reproducible and a "seed of the day" is trivial to add.
- **Pathfinding.** Grids are small (at most 64×40, 2,560 tiles). Maintain a BFS distance field from the elevator and recompute it whenever a tile opens; it's cheap at this size. Returning miners just walk down the gradient, the same field gives pipe routes for milk, and it gives an approximate distance for target scoring. In GameMaker, a `ds_grid` for tiles plus a `ds_queue`-based BFS is simpler than keeping an `mp_grid` in sync with a constantly changing map; in C#, a flat array and a `Queue<int>` does the same job.
- **Data-driven content.** Traits, mines, upgrades, meals, faxes, and eyecatchers are definitions (structs or JSON) with two kinds of effects: stat modifiers, and event hooks (`onSwing`, `onItemDrop`, `onFlop`, `onEpisodeEnd`, `onMouseKill`). Trait logic stays out of the miner code.
- **Modifier stack.** Additive modifiers, then multiplicative, aggregated into a cached stat block that's recomputed only on change. Store each contribution with its source so the tooltips from Pillar 1 can show the full breakdown.
- **Numbers.** If the curve tops out around 1e150–1e200, doubles are enough, so there's no need for a big-number library. Keep a single formatting utility.
- **Save system.** Versioned JSON with a migration function per version, autosave every 30 seconds, and export/import as a string (incremental players expect it). Store the last-online timestamp for Banked Time and clamp negative deltas.
- **Balance harness.** Build a headless runner early: give it a mine, a crew build, and an "active player" bot that uses the laser and actives, run 1,000 episodes, and output catnip per second. Use it to tune the tier table and to keep the active-to-idle gap in a healthy range (roughly 1.3–1.6× in favour of active play).
- **Performance hot spots.** Water simulation and mice. Cap fluid updates per tick, and use a simple spatial hash for mouse–catgirl proximity checks.

## 26. Risks and Open Questions

1. **The active-vs-idle gap.** If laser micro is too strong, the game becomes a clicker; too weak, it's a screensaver. The balance harness and the Laser Drone are the two levers.
2. **Density vs full clears.** The Enrichment Dial and Density Governor should handle it, but playtest whether players understand the tradeoff without a tutorial.
3. **Roster tedium.** Fire-and-rehire loops get tedious fast. Add **HR Policy** automation: rules like "auto-transfer any catgirl who rolls a negative trait before level 8" and "auto-hire to fill empty slots." Good sorting and filtering in the Barracks is essential.
4. **Resource sprawl.** Every resource needs at least two sinks, or it's clutter. Audit this as each mine is added.
5. **The forced Reboot.** The warning fax and a generous first payout should keep it from feeling like a punishment; watch playtest reactions closely.
6. **Scope.** This is an enormous design. A sensible vertical slice: Tiers 1–3, laser and spray, three actives, traits up to level 15, the Skein, and a first yarn pattern. If that loop is fun for two hours, everything else is content on a proven foundation.
7. **Joke fatigue.** Large line pools, rarity tiers for barks and eyecatchers, and callbacks that evolve over seasons (Pochi softening, the warhead's face, Tora's escalating "Nyandeyanen, Part N" count).
