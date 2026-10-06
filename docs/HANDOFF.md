# Handoff — state as of 2026-10-06

This picks up development of NYAPOTISM! after the first build sessions. `CLAUDE.md` has the project rules and workflow. `README.md` lists what's built.

## Where things stand

The vertical slice is playable and live on GitHub Pages. `main` is at https://varkarrus.github.io/NYAPOTISM/, and the newest other branch is at https://varkarrus.github.io/NYAPOTISM/dev/. The user is away from their computer for a few days and playtests on `/dev/`, so push playable work to the session branch and add a changelog entry (`js/ui/changelog.js`). The build includes:
- Tiers 1–4, with grooved chains, tangles + Schrödinger's Box, and Dairy Depths pumping.
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
| OVAs: `js/data/ovas.js`, six tapes × three releases (Lights Out, Nine to Five, Budget Cuts, No Laser Zone, Monday, One Cat Army last). Shelf opens in Season 5; each unlocks when the previous VHS is cleared; started instead of a normal unravel (you keep that run's yarn); no yarn inside, no Skein box; ends on the goal with a permanent perk (`s.ovaDone[id]` = perk level). `tools/test_ovas.js`: all 18 clear in 4–61 min on seed 4 | User: OVAs shouldn't pay yarn, should end once the goal is met, and One Cat Army shouldn't be first |
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
| Yarn per season | ~×3 growth | S2 ~50, S4 ~100–400, S5 ~600–1300 |

## Known issues / watch list

- **Season 1 optimal unravel time drifts late.** Once Tier 4 runs, yarn/min keeps rising past 150 min, so an optimizing player may stay in Season 1 for over 2h. Options:
  - Make Tier 4 a Season 2+ unlock.
  - Soften the Milk Bath multiplier.
  - Raise the yarn divisor.
- **The bot's prestige heuristic is erratic.** It sometimes unravels after 8–12 min. This only affects the harness, not the game, but it adds noise to multi-season numbers.
- **The test scripts are slower now.** `test_pump.js` and `test_events.js` build crews by buying bunks, which are now progress-gated, so their crews are small. They still pass. Set `g.s.maxTierReached` and full clears in the setup for faster runs.
- **Darkness is subtle at darkness 1.** The overlay alpha is `0.24 × darkness`, capped at 0.6. Revisit when Tiers 5+ exist.
- **In the narrow (phone-width) layout the trait-roll card covers much of the mine.**
- **Content thins out around Season 5.** Loom Pattern 2 and OVAs are the planned fix.

## Next steps (agreed with the user, roughly in priority order)

1. ~~Pace vs terrain~~ — done (`NYA.tierMud`, `NYA.tierRubble` in `js/data/tiers.js`, `terrainSlow` in `js/sim/episode.js`). Possible follow-ups: let pathfinding avoid mud when a detour is short, and feed trampled rubble into Robovacs later.
2. ~~**OVAs**~~ — first six built (see below). Next ideas: more OVAs once Tiers 5+, mice and equipment exist (Mouse Apocalypse, Inflation, Wrong Timeline, Cursed Density, The Aunt Strikes Back), and combined limiters later. Original note: **OVAs (GDD §15).** Challenge seasons unlocked after Season 5. Each has three difficulty releases (VHS / Laserdisc / Director's Cut) and a permanent reward. Most limiters are just flags on existing systems (One Cat Army, Lights Out, No Laser Zone, Budget Cuts, Nine to Five, Monday). This is the next novelty source for Season 5+.
3. **Loom Pattern 2**, unlocked when Pattern 1 is complete. Good home for **Star Search** (GDD §14.3): a repeatable knot giving applicants a chaining +5%/rank aptitude promotion roll (SS, SSS, …).
4. **Tiers 5–6 (GDD §9.2), built on the per-tier scaling framework:**
   - Sushi Grotto: flooding water that applies a wet penalty.
   - Mousehole Maze: mice, nests and cheese, with manual turrets and later Turret-chan.
   - The Big Haze: a marathon mine with several elevators.
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
