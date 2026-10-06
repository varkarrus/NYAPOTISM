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
| Rough ground from Tier 2: mud patches (×0.5 walk speed) and rubble from broken rock (×0.65, trampled after 2 crossings). New Mud Puppy trait ignores both | Pace needed a per-tier counter-pressure. Pacing targets unchanged in the harness |

### Pacing targets vs current sims (active bot)

| Milestone | Target | Current |
| --- | --- | --- |
| First perfect clear | ~10 min | 4–11 min |
| Tier 2 | 15–20 min | 16–18 min |
| Tier 3 | 55–65 min | 52–60 min |
| Skein | 65–80 min | 62–72 min |
| Tier 4 (needs the Skein) | after the Skein | 85–100 min |
| Crew size | 3 at Tier 1, 3–4 at Tier 2, 5–6 at Tier 3, 7–8 at Tier 4 | on target |
| Season 1 | 90–150 min | ~1h25–1h30 (the bot unravels 25 min after the Skein) |
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
2. **OVAs (GDD §15).** Challenge seasons unlocked after Season 5. Each has three difficulty releases (VHS / Laserdisc / Director's Cut) and a permanent reward. Most limiters are just flags on existing systems (One Cat Army, Lights Out, No Laser Zone, Budget Cuts, Nine to Five, Monday). This is the next novelty source for Season 5+.
3. **Loom Pattern 2**, unlocked when Pattern 1 is complete.
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
