# Handoff — state as of 2026-10-08

This picks up development of NYAPOTISM! after the first build sessions. `CLAUDE.md` has the project rules and workflow. `README.md` lists what's built.

## Where things stand

The vertical slice is playable and live on GitHub Pages. `main` is at https://varkarrus.github.io/NYAPOTISM/, and the newest other branch is at https://varkarrus.github.io/NYAPOTISM/dev/. The user is away from their computer for a few days and playtests on `/dev/`, so push playable work to the session branch and add a changelog entry (`js/ui/changelog.js`). The build includes:
- Tiers 1–6, with grooved chains, tangles + Schrödinger's Box, Dairy Depths pumping, Sushi Grotto flooding, and Mousehole Maze mice and turrets.
- Seven OVA challenge tapes.
- Traits, the R&D tree and MEWCLEAR, eight actives, standing orders, and Banked Time.
- Skein prestige into the Quantum Loom.
- Tanuki's limited-time event mines and swing techniques.
- Faxes, eyecatchers, and synthesized music and SFX.

The user has played through Tier 2 and an event mine. They called it "super addictive".

### Recent changes driven by playtest feedback

| Change | Why |
| --- | --- |
| ":3" mouths drawn as one continuous "ω" | The old path closed into a moustache shape |
| Music/SFX each On / Mute when unfocused / Muted, with 🎵/🔊 top-bar cycle buttons | User request |
| Swing techniques: Haste caps at 4/s, then folds into heavier named swings | Haste values were running away visually |
| Fixed-width crew cards, status on its own line, compact "🎒 n/m" bag counter | Cards resized constantly in the narrow layout |
| Eyecatchers as picture-in-picture, 1.8 s per frame, never interrupted, rares queued | They were ~0.5 s per frame and got cut off |
| Ceviche and Sashimi added to the name pool | User request |
| Hand-authored, progress-gated Bunk Beds (`NYA.BUNKS`); cheaper Tier 3/4 surveys | Crew grew too fast (6 miners at Tier 2) |
| Ore density rises per tier and dense ore gets crumblier | Carry needs a per-tier counter-pressure |
| Sight = 3 + Headlamps − darkness (−1 every two tiers) | Headlamps need a per-tier counter-pressure |
| Sight also sets the ore-noticing range and fog reveal radius; dark-mine overlay | Sight needs to be felt and seen |
| Yarn exponent nodes cost 40/600, Catnip Cable-Knit cost ×4/rank, Skein Stripe ×1.5 | Yarn ran away from Season 4 on (up to 44K/season) |
| Title card shows a changelog (`js/ui/changelog.js`) and how far the build goes; `/dev/` Pages build | User is away from their computer and playtests by URL |
| Four Ears?! eyecatcher: human ears drawn outside the head; gallery keeps one look per replay | Ears were hidden inside the head; the gallery re-rolled the catgirl every frame |
| Applicant board: 3 visible applicants, slots refill after episodes, one turns over every 2 episodes, paid "Post a new ad" refresh (×3 hire, doubles per ad, halves per turnover); transfer refund 40% → 25% | Hire-and-transfer loops let you fish for exact fur/aptitude rolls (user found it fishing for a second tuxedo) |
| Tier 4 survey: no Skein gate (just 10 T3 perfect clears); spoiler-free changelog/frontier/req text; `tools/skeinrace.js` checks the Skein still comes first (8/8 seeds, 5–16 min ahead) | User: Dairy Depths should be reachable first run, the Skein should usually come first, and it must never be named before it's found |
| Loom head starts go through `applyHeadStarts()` (floors on `s.upg`), run at unravel, on every Loom purchase, and on load for season > 1 | Bug: yarn only arrives at an unravel, so head-start knots were always bought mid-season and did nothing until the next one |
| OVAs: `js/data/ovas.js`, six tapes × three releases (Lights Out, Nine to Five, Budget Cuts, No Laser Zone, Monday, One Cat Army last). Tapes are spaced out: tape i needs Season 5 + 3i and the previous VHS, each harder release +2 seasons (`NYA.ovaSeason`); in the bot run they span 3.7h–10.1h; started instead of a normal unravel (you keep that run's yarn); no yarn inside, no Skein box; ends on the goal with a permanent perk (`s.ovaDone[id]` = perk level). `tools/test_ovas.js`: all 18 clear in 4–61 min on seed 4 | User: OVAs shouldn't pay yarn, should end once the goal is met, and One Cat Army shouldn't be first |
| Crit folds like Haste (`NYA.foldStats`): past `CRIT_CAP` 40%, −30 pts crit → Power ×1.65 per fold, named `critRankName`; Claw Sharpening max 8 → 60. First fold ~1h28–1h48 in season 1 | User request: crit should reset into a damage boost like Haste |
| `renderPanel` restores scrollTop after portraits are appended | Bug: panel redraws (XP ticks) clamped the scroll while the page was briefly shorter |
| Background running: a Blob Web Worker ticks every 50 ms; when animation frames stop, `step(now, false)` runs the sim + UI and `view.tickHidden()` plays/clears episode events without drawing. Setting `bgRun` (default on). Gaps > 3 s still bank | User wants to hear Tanuki etc. with the tab in the background (plays in Firefox) |
| Sphynx fur (`w: 0.25` ≈ 3%, `NYA.rollFur`/`rollHair`), always `hair: 'bald'` | User request |
| Laser marks allowed on any unrevealed tile; `reveal()` clears marks on tiles that turn out unmineable; far marks on fog tiles pull digging toward them | Bug: you couldn't mark fog tiles that were secretly open or bedrock, which leaked what was under the fog |
| Mother-Nyan-Lode renamed MEOWTHERLODE in all player text | User request |
| Traits can carry `tier: N` and only roll once lifetime max tier ≥ N (Mud Puppy 2, Yarn Wrangler/Box Whisperer 3, Lactose Tolerant/Milk Mustache 4) | Playtest: rolled Yarn Wrangler before seeing tangles and Lactose Tolerant before seeing milk |
| Box chance T3 1% → 5%, T4 5% → 8%; pity +0.005 → +0.01 per boxless episode | After the tougher-tier change, the first box took 19–26 T3 episodes; the Skein now lands at ~63–99 min (mostly 69–81) and before the T4 survey in 12/12 seeds |
| Blend: shows after the Skein (or Season 2+), costs 5M, hourly cooldown (`NYA.BLEND_COOLDOWN`) | Playtest: a ×0.5 roll during a first run stalled progress, and once-per-season felt stingy after paying to unlock it |
| Treat Bag: 2× XP for 60 s on one catgirl (`cg.treatUntil`, `NYA.TREAT_TIME`) | User request |
| Hotbox puff is 22% × (potency / 0.30) (was 22% × potency ≈ 6.6%); waking clears flopped/clockOut/zzz | Bug: woken sleepers kept their Zs, mined one block on ~7% stamina and flopped again |
| VHS: static CSS overlay instead of drop-shadow filters + blend mode on the canvas (38 → 60 fps in headless test) | Playtest: big framerate drop |
| Mud edge textures (`mudEdge`) where mud meets plain floor | Playtest: mud read as a solid block |
| Pack-Up Drills hand-priced (`costs`), Headlamps growth 8 → 25, Tier 4 survey 6e7 → 2e7 | Playtest: drills/headlamps too cheap late; T4 drifted late after the HP change |
| Tier HP ×5/tier (was 3.5), resistance ×2/tier (was 1.6); Sharper Pickaxe and Stamina Snacks growth 2.3 → 2.1 | Playtest: moving to a new mine was an instant big income gain; it should be held back by low Power/Grit. Measured stay-vs-jump income at unlock: median ~2× (was 3–4×). The user rejected an unmined-ore fine as the lever |
| Mud and rubble drawn as pixel tiles (mud floor texture, rubble overlay) | Playtest: should be tiles, not decals |
| **Tier 5 Sushi Grotto** (`quirk: 'water'`, 30×20). Minegen carves sealed water chambers (`M.water`, walled in stone) and grows nigiri (`M.sushi`, ORE tiles that drop sushi) beside them. Breaking into a chamber wakes a falling-sand water sim (`tickWater` in `js/sim/episode.js`: volume-conserving, capped moves per step, sleeps when settled). Miners on water get wet (`m.wetT`, `NYA.WET_*`): ×0.5 Pace, ×2 stamina per swing. Sushi Bar (refinery, `cur: 'sushi'`): Wetsuits, Drain Pumps, Wasabi Kick, Otoro Platter. Traits Water Cat / Sushi Snob (`tier: 5`). Bunk 9 at Tier 5. Survey: 20B + 10 T4 perfect clears | User: start on Tiers 5+ |
| **Tier 6 Mousehole Maze** (`quirk: 'mice'`, 32×22, tunnel-heavy). Nests (`T.NEST`, resource tiles, set in little warrens) wake once uncovered, burst 2 mice, then one every ~5 s (`NYA.NEST_*`, `NYA.MICE_CAP`). Mice (`NYA.MICE`: scout, bruiser, pickpocket) chase catgirls by BFS, bite a share of max stamina, pickpockets steal an item and run home. Catgirls auto-swing at adjacent mice (`mouseFight`). Turrets: Turret tool (T), `NYA.TURRET_*`; Turret-chan fills unused slots after 3 s (untrained: one by the elevator "for vibes", the rest piled on the first nest; Study Group rank 1 drops the vibes turret and relocates idle turrets, rank 2 spreads them). Cheese: nest wheels (10) and mouse crumbs → R&D Defense (`cur: 'cheese'`: Hairball Cannons, Bigger Hairballs, Mouser Drills, Turret-chan's Study Group) and Aged Gouda (Refinery). All in `js/sim/mice.js` (an Episode mixin). `nipTier: 5`, `diffTier: 5.6`, ore 6%: pays like Tier 5, a little tougher. Traits Mouser / Pacifist / Scaredy Cat / Cheese Magnet (`tier: 6`). Bunk 10. Survey 5T + 10 T5 perfect clears. `tools/test_mice.js` | User: start on Tiers 5+ |
| Deep tiers toughen faster: `NYA.DEEP_HP` 10 and `NYA.DEEP_RESIST` 5 per tier past 4, on top of ×5 HP / ×2 resist | On arrival at Tier 5 (Season 3) the crew broke stone in 0.35 swings with ~2000 swings of stamina (Tier 4 in Season 1: ~5 and ~250), so Tier 5 was easier than Tier 4: stay-vs-jump 21–31×. Now 3–6× (T4's milk pumping drags its catnip/s down) |
| Per-tier overrides: `nipTier` (catnip value tier, `NYA.tierNip`) and `diffTier` (HP/resist tier, `NYA.tierDiff`, may be fractional) | Lets the Mousehole Maze be a cheese sidegrade instead of the next ×10. Yarn's per-tier divisor follows `nipTier` |
| Yarn counts catnip earned past Tier 4 ÷`NYA.YARN_TIER_DIV` (100) per tier (`s.seasonYarnNip`, per episode; the Blend pot tracks it too in `potYarn`) | Tier 5 income is ~100–1000× Tier 4 once its catnip buys more multipliers; undivided it took Season 5 from ~700 to ~200K yarn. Now S5 ~2K, S9 ~10K, plateau ~20–45K (seed 4) |
| Survey perfect-clear requirements only gate the first unlock (`NYA.surveyReq`) | Bug: they were re-checked every season, so post-S4 seasons never got past Tier 3 |
| Bot resets its per-tier stats on unravel | Harness: stale stats kept the bot in old tiers after a reset |
| `STORY_FAX.tier4` added | Bug: reaching Dairy Depths sent a blank fax |
| Pump helpers: a catgirl with no tile left to dig helps crank a running pump (`helpablePump`, up to `NYA.PUMP_HELPERS` 3, each adds her own flow and drain); `hasWork` counts it, so clocked-out catgirls come back; if the operator leaves, a helper takes over | Playtest: one pumper with 2/3 stamina left while everyone else had clocked out. Pump-only waiting per T4 shift 7 → 2 s (seed 1), shifts 70 → 59 s, same milk per shift |
| Loner steers clear: target score −`NYA.LONER_PENALTY` (3) on tiles within 3 of another miner or of their target/pump node (laser marks still win) | User: Loner was "mixed" with no downside. Bonus uptime 54% → 76% of her swings, crew catnip/s unchanged |
| From Tier 3, ore tiles hold `NYA.tierDensityMult(t)` = t−1 times more items, each worth, weighing (HP) and teaching (XP) that much less, so a tile pays and breaks the same. Bigger Bags growth 2.3 → 2.1, max 20 → 30 | Playtest: by Tier 3 the crew cleared half the mine before anyone's bag was full, so the haul read 0 for half the shift. First drop-off moved from ~50% of the shift to ~12–24% at T3/T4; T3 catnip/s −10%, offset by cheaper bags (S1 milestones unchanged, T4 at 82–94 min) |
| Pumping drains `NYA.PUMP_DRAIN` (2) swing costs/s, was 0.6; base flow `NYA.PUMP_RATE` 8, was 5 | Playtest: the pumper outlasted everyone and the shift waited on one catgirl. Lone-pumper time per early T4 episode roughly halved (worst 44 s → 17 s), T4 episodes ~25% shorter, same milk per episode. T4 clears faster, so T5/T6 arrive ~0.3–0.8h earlier in the bot runs |
| Ore labels (setting `showDQ`, now "Show catnip value on ore"), drop-off pops, the HUD Haul and a "THIS SHIFT" total in the sky strip all show catnip after Refinery × global × event multipliers, before the Full-Clear Bonus (`game.nipMult(ep)`, `game.haulCatnip(ep)`) | User request: show catnip, not raw density/quality, and a visible running total |
| Traits can have `req(cg)` (eligibility), `onGain(cg)` and `ova` (OVA-only). New: Caffeine Addict (legendary: ×2 Haste/Pace, pumping, building, distraction speed; swings cost ×1.1, so drain is 2.2× per second), Underdog (rare, C-rank only, sets aptitude to the new SS grade, `NYA.APT_SS`), Hot Water Bottle (Sphynx only: loafing within 2 tiles of her restores 6% stamina) | User trait ideas (the Sphynx trait was left to me) |
| OVA 7, No OSHA Compliance (`osha`): `noHats`, 40% chance per level-up of an injury trait (Concussed, Punch Drunk, Drain Bamage, Toofless, weight 10 each; Fluent in Spanish, weight 1, no effect except ¡MIAU! crit pops, after the head-injury-language trope; `ova: 'osha'`), stripped from anchored catgirls when the OVA ends. Goals T3 / T4 / FC T4 ×3. Perk Hazard Pay +15% XP per release | User OVA idea |
| Rough ground from Tier 2: mud patches (×0.5 walk speed) and rubble from broken rock (×0.65, trampled after 2 crossings). New Mud Puppy trait ignores both | Pace needed a per-tier counter-pressure. Pacing targets unchanged in the harness |

### Pacing targets vs current sims (active bot)

| Milestone | Target | Current |
| --- | --- | --- |
| First perfect clear | ~10 min | 4–11 min |
| Tier 2 | 15–20 min | 16–18 min |
| Tier 3 | 55–65 min | 59–65 min |
| Skein | 65–80 min | 69–85 min |
| Tier 4 (needs the Skein) | after the Skein | 85–93 min |
| Crew size | 3 at Tier 1, 3–4 at Tier 2, 5–6 at Tier 3, 7–8 at Tier 4 | on target |
| Season 1 | 90–150 min | ~1h25–1h30 (the bot unravels 25 min after the Skein) |
| Stay-vs-jump income at a tier unlock | ~1× (new mine held back by Power/Grit) | median ~2× (T2 0.8–4, T3 2–3, T4 1–2.7); `node tools/tierjump.js <seed>` |
| Tier 5 | a few hours in | 2.9h (seed 4) – 4.0h (seed 1); ~2h25 if you never unravel. Stay-vs-jump at unlock 3–6× |
| Tier 6 | after Tier 5 | 3.3–4.5h (seeds 4 and 1; was 4.0–5.2h before the pump change). At unlock it pays 0.14–0.3× Tier 5's catnip/s (seed 4's crew: ~1×) plus ~35 cheese/episode; mice ~16/episode, 7–9 bites; smart turrets cut bites 30–45%. `node tools/test_mice.js <seed>` |
| Yarn per season | ~×3 growth | S2 ~50, S4 ~100–500, then ~2–4K around Seasons 7–8 and ~30–80K by Season 15 (with T5–T6). `node tools/seasons.js <seed> <hours> [--max-tier 4]` |

## Known issues / watch list

- **Season 1 optimal unravel time drifts late.** Once Tier 4 runs, yarn/min keeps rising past 150 min, so an optimizing player may stay in Season 1 for over 2h. Options:
  - Make Tier 4 a Season 2+ unlock.
  - Soften the Milk Bath multiplier.
  - Raise the yarn divisor.
- **The bot's prestige heuristic is erratic.** It sometimes unravels after 8–12 min. This only affects the harness, not the game, but it adds noise to multi-season numbers.
- **The test scripts are slower now.** `test_pump.js` and `test_events.js` build crews by buying bunks, which are now progress-gated, so their crews are small. They still pass. Set `g.s.maxTierReached` and full clears in the setup for faster runs.
- **Darkness is subtle at darkness 1.** The overlay alpha is `0.24 × darkness`, capped at 0.6. Tiers 5–6 are darkness 2.
- **Tier 6 difficulty at arrival swings with the crew.** Rock HP is fixed per tier, so a crew just past the one-swing threshold breezes it (seed 4: perfect clears, ~1× Tier 5) while others can't clear it (0.14–0.3×). Mice are a moderate pressure; turrets are a bonus, not required (the GDD calls them required; the "bonus, not tax" rule won).
- **Tier 7+ will need its own `nipTier`/`diffTier` thinking.** With Tier 6 at nipTier 5, a default Tier 7 would pay ×100 over Tier 6.
- **Mice not built yet:** Sapper, Medic, Cheese Golem, Commandos, the Four Cheesenals. **Turrets not built yet:** Squeaky Decoy, Yarn Launcher, Mousetrap Mortar, Tesla Scratching Post, Laser Turret. Sushi's second sink (GDD: purrmits for Tiers 7–9) is still open.
- **OVA goals stop at Tier 4.** Director's Cut releases could ask for Sushi Grotto now, but reaching Tier 5 inside an OVA run takes 30+ min. Nine to Five's Director's Cut is the hardest and swingy for the bot (24–68 min, sometimes not cleared in 90 min).
- **In the narrow (phone-width) layout the trait-roll card covers much of the mine.**
- **Content thins out around Season 5.** OVAs and Tiers 5–6 now fill it; Loom Pattern 2 is next.

## Next steps (agreed with the user, roughly in priority order)

1. ~~Pace vs terrain~~ — done (`NYA.tierMud`, `NYA.tierRubble` in `js/data/tiers.js`, `terrainSlow` in `js/sim/episode.js`). Possible follow-ups: let pathfinding avoid mud when a detour is short, and feed trampled rubble into Robovacs later.
2. ~~**OVAs**~~ — first six built (see below). Next ideas: more OVAs once Tiers 5+, mice and equipment exist (Mouse Apocalypse, Inflation, Wrong Timeline, Cursed Density, The Aunt Strikes Back), and combined limiters later. Original note: **OVAs (GDD §15).** Challenge seasons unlocked after Season 5. Each has three difficulty releases (VHS / Laserdisc / Director's Cut) and a permanent reward. Most limiters are just flags on existing systems (One Cat Army, Lights Out, No Laser Zone, Budget Cuts, Nine to Five, Monday). This is the next novelty source for Season 5+.
3. **Loom Pattern 2**, unlocked when Pattern 1 is complete. Good home for **Star Search** (GDD §14.3): a repeatable knot giving applicants a chaining +5%/rank aptitude promotion roll (SS, SSS, …).
4. **Tiers 5–6 (GDD §9.2), built on the per-tier scaling framework:**
   - ~~Sushi Grotto~~ — built. Sushi's second sink should be Tier 6's purrmit (GDD).
   - ~~Mousehole Maze~~ — built (see above). More mouse and turret types are still to come.
   - The Big Haze: a marathon mine with several elevators.
   - **Tabled mine quirk ideas from the user (not built):**
     - *Icy:* very high Grit, but lots of open space, and much of it is ice that behaves like a sliding-ice puzzle (a catgirl slides until something stops her). Pathfinding has to plan around slides, so expect wonderfully elaborate routes.
     - *Portal maze:* a massive mine split into many subsections by bedrock walls, linked by two-way portals.
5. **Focus vs "Fool's Nip".** Shiny worthless decoy tiles in deeper mines that fool low-Focus miners.
6. **Workshop (Hagane): equipment slots** (Tool / Outfit / Trinket). This is the sink for special resources such as milk and cheese.
7. **Rubble and Robovacs.** Gives dirt and stone a purpose, and feeds the Farm later.
8. **Later layers:** spin-offs, The Movie / Reboot, NYANZER, and The Nine Lives (see the GDD).

## Handy pointers

| Thing | Where |
| --- | --- |
| Crew size table | `NYA.BUNKS` in `js/data/upgrades.js` |
| Per-tier scaling | `js/data/tiers.js` |
| Miner AI | `chooseTarget`, `updateMiner` and `swing` in `js/sim/episode.js` |
| Economy | `endEpisode`, `startEpisode`, the Tanuki helpers and `unravel` in `js/sim/game.js` |
| Stat pipeline | `NYA.buildStats` → `NYA.foldStats` (swing techniques) in `js/sim/catgirl.js` |
| Pack-up overlay and eyecatcher PiP | `buildOverlay`, `updateOverlay` and `updateEyecatch` in `js/ui/ui.js` |
| Harness bot | `js/sim/bot.js` |
| Mice, nests, turrets, Turret-chan | `js/sim/mice.js` (Episode mixin); data in `NYA.MICE` / `NYA.TURRET_*` in `js/data/tiers.js` |
| Water sim, wet state | `tickWater`, `canHoldWater` in `js/sim/episode.js`; chambers in `js/sim/minegen.js` (`quirk === 'water'`) |
| Yarn formula | `yarnPreview` in `js/sim/game.js`, constants in `js/data/loom.js` |
