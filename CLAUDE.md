# NYAPOTISM! — working notes for Claude

A browser incremental game built from the design doc `NYAPOTISM! — Catnip Mining Co.md` (the GDD). The user, varkarrus, is the designer. They play each build on GitHub Pages (https://varkarrus.github.io/NYAPOTISM/) and send playtest feedback. Read `docs/HANDOFF.md` for current state and next steps, and `README.md` for the feature list.

## Architecture rules (don't break these)

- **No build step, no dependencies.** Plain `<script>` tags attach everything to `globalThis.NYA`, so the game also runs from `file://`.
- **The simulation is DOM-free.** `js/core`, `js/data` and `js/sim` run unchanged in Node for the balance harness. Rendering (`js/render`), audio and UI (`js/ui`) only read sim state and its events.
- **Adding a file:** put it in `index.html` in dependency order. If it's a data or sim file, also add it to the `require` list of every tool that loads the sim (`grep -l sim/mice.js tools/*.js` finds them all).
- **Fixed timestep:** 20 ticks/s (`NYA.TICK`), and the renderer interpolates. `requestAnimationFrame` drives `step()` while visible; a Web Worker timer drives it when frames stop (background tab), skipping drawing via `view.tickHidden()`. Everything runs on sim time (cooldowns, research, Tanuki visits, Catterall), so Fast-Forward and dev speeds just run more ticks.
- **Content is data-driven:**
  - Upgrades: `def({...})` in `js/data/upgrades.js`, using `show`, `req`, `costs` or `base`/`growth`, `cur` (currency) and `fx`.
  - Traits: `mods` keys in `js/data/traits.js`. New flag keys must also be added to the flag list in `NYA.buildStats` (`js/sim/catgirl.js`). Give a trait `tier: N` if its text names a mine-specific system, so it can't roll before the player has seen that mine. `req(cg)` limits who can roll it, `onGain(cg)` runs once when she gets it, and `ova: 'id'` marks an OVA-only trait that never rolls normally. A trait that applies everywhere but mentions a later system gets a `descMice`-style second description, shown through `NYA.traitDesc(t, g)` once that system has been seen (lifetime).
  - Also data-driven: faxes (`check` functions), the Loom grid, Tanuki events, and tiers.
- **Pathfinding goes through `ep.bfs()` / `pathTo()`.** In an ice mine `bfs` walks a one-way slide graph, so never assume consecutive path tiles are neighbours or that `homeDist` is the way back (use `goHome`); start new routes with `navStart(m)` / `navPath(goal, m)` so a slide in progress finishes first.
- **Per-tier scaling lives in `js/data/tiers.js`:** `tierBase`, `tierHP`, `tierResist`, `tierXP`, `tierDensityP`, `tierCrumble`, `tierDarkness`, `tierFooting`, `tierRich`. New tiers get these for free.
  - Past Tier 4, HP and resist grow an extra `DEEP_HP`/`DEEP_RESIST` per tier, because players only arrive after a few prestiges' worth of multipliers.
  - A tier can override `nipTier` (what its ore pays, read with `NYA.tierNip`) and `diffTier` (how tough it is, may be fractional). The Mousehole Maze uses both to be a cheese sidegrade.
- **Mine order is not fixed.** The GDD's tier list isn't sacred: reorder, or add new mines in between, as the design needs. The user has new quirk ideas since the GDD, and wants old quirks to come back in later mines (remixed or combined), not appear once and vanish. A tier's `quirk` is its headline gimmick and `quirks` lists everything it has (the Greeble Crash Site brings back `grooved`); always test with `NYA.hasQuirk(def, q)`, never `def.quirk ===`.
- **New tiers:** add the `NYA.TIERS[n]` entry and raise `NYA.MAX_TIER`. Gate the survey with `NYA.surveyReq(g, tier, fcTier, n)`, so the perfect-clear requirement only applies to the first unlock. One easy clear (crew above half stamina, `NYA.EASY_CLEAR`) also satisfies it. Add a `STORY_FAX.tierN`, a bunk, music `prog` and a dev-save milestone. A tier's purrmit can cost another currency with `purrmitCur` (Tier 7 costs sushi): go through `game.purrmitCost(t)` / `purrmitCur(t)` / `canPayPurrmit(t)`.
- **Loom patterns** live in `NYA.LOOM_PATTERNS` (`js/data/loom.js`); the next one opens when the previous is complete (`game.loomPatternOpen(p)`). Row/column checks take the pattern: `loomRowDone(r, p)`, `loomColDone(c, p)` (p defaults to 1). Read a knit multiplier through `game.knit(id)` (effective ranks: full to rank 5, then ×0.8 per rank, capped at 15), never `Math.pow(x, game.loom(id))`. Pattern II's head-start row skips OVAs.
- **Yarn** comes from `s.seasonYarnNip`, not `seasonCatnip`: catnip earned past Tier 4 counts less, ÷`NYA.yarnDiv(def, tier)`: ÷`YARN_TIER_DIV` (100) per tier up to the Sushi Grotto, then ÷10 per tier, so a deeper mine is never a worse yarn farm per item. Any new catnip payout that should count toward yarn adds to both.
- **Events:**
  - Game → UI: `game.emit(type, data)`.
  - Episode → renderer: `ep.ev({ t: ... })`. These are dropped when running headless.
  - Any first-time system should call `game.novel(key, label, kind)`. That drives the "★ NEW! ★" ribbon and the harness novelty timeline.
- **Saves:** `game.s` is serialized as JSON. `Game.deserialize` fills missing keys from `newState()`, so new state fields go in `newState()` and old saves migrate automatically. Read new lifetime counters as `s.life.x || 0`.

## Design philosophy (from the user's feedback, keep following it)

- **The deepest mine must stay watchable (the user's rule of thumb).** In the latest mine you've unlocked, crossing it should take more than a few seconds, and catgirls should not break every block in one strike. Past that it stops being a well-oiled machine where each catgirl's personality shows and becomes "a cellular automaton chewing up a shape". The fix is pacing, not a mechanic that punishes success (a "frontier pushback" was tried and rejected as a band-aid): **by the time a crew could zoom around a mine one-shotting blocks, the next one or two mines should already be unlocked.** Survey costs and perfect-clear requirements open the next mine while the current one is still chewy; mines take longer to complete, with similar catnip per second. Check with `node tools/frontier.js <seed>` (targets in `docs/HANDOFF.md`).
- **The prestige wall is a mine, not a price.** If you haven't been unravelling enough, you eventually reach a new mine you can't come close to clearing, and upgrades take very long waits, until you unravel, spend yarn and climb back. It should never be "the current mine is trivial but I can't afford the next survey".
- **Every stat gets a per-tier counter-pressure instead of a hard cap.** Upgrades stay relevant in your current mine, and early mines become hilariously easy. This is how it maps:
  - Power vs tile HP (×`HP_GROWTH` 5 per tier, ×`DEEP_HP` 15 more past Tier 4). A long stay's own income grows Power 10–50×, which is why stays at the deepest mine must stay short (see above). Ore is worth ×`RICH_STEP` (1.35) per tier on top of ×10, paying for the longer shifts.
  - Stamina and Grit vs swing resistance.
  - Haste vs swing techniques: speed caps at 4 swings/s, then a fold gives half the swings, ×2.2 power and ×2 stamina per swing.
  - Crit folds the same way: past 40%, 30 points of crit become ×1.65 Power (crit focus ranks).
  - Carry vs ore density (from Tier 3, `tierDensityMult` multiplies items per tile and divides their value, HP and XP).
  - Headlamps vs darkness (Sight).
  - Pace vs mine size, rough ground (mud patches and rubble: `tierMud`, `tierRubble`) and slick floors: `tierFooting` divides all walking speed (`FOOTING_EARLY` ÷1.3 at T2, ÷1.7 at T3, then ÷4 at T4 and ×1.3 per tier). It costs time only: walking stamina per tile is unchanged.
  - Focus vs decoy tiles (TODO).
- **Crew size grows slowly.** Bunk Beds are hand-authored and progress-gated (`NYA.BUNKS`). The user wants about 3–5 miners through Tier 2.
- **Animations must be readable.** Eyecatchers play picture-in-picture on a real-time clock and are never rushed or cut off. Pack-up time is a real sim cost: don't lengthen it for presentation.
- **Novelty rhythm:** early on, a new system every few minutes. Mid-season gaps should stay under ~5–10 min (check the harness novelty timeline).
- **Active play is a bonus, never a tax.** An unsteered crew should reach milestones about 1.3–1.6× slower than an attentive player, not 10×.
- **Sound:** Music and SFX each have On / Mute when unfocused / Muted.
- **Tone:** 80s anime comedy. Auntie's faxes are ALL CAPS and end with ♡. Tora barks with Kansai flavor ("Nyandeyanen!?"). Catgirls have cat ears and never human ears.

## Workflow

- **Dev server:** run `python tools/serve.py 8418` (it sends no-cache headers) and open `http://localhost:8418/?dev`. `?dev` adds 4×/16×/64× speed buttons and a +1M catnip cheat. `NYA.debug` exposes `game`, `ui`, `view`, `audio` and `save` in the console.
- **After any sim or economy change, run the harness and compare against the targets in `docs/HANDOFF.md`:**
  - `node tools/harness.js --minutes 150 --seed 1` gives the novelty timeline and checkpoints. Add `--quiet --json` for scripting, and check seeds 2–4 too.
  - `node tools/harness.js --minutes 480 --seasons 7 --seed 4` runs a multi-season prestige check.
  - `node tools/test_mice.js 4` measures the Mousehole Maze at first arrival: Tier 5 vs Tier 6 with no turrets, Turret-chan, and smart turrets.
  - `node tools/test_crystal.js 4` measures the Crystal Catacombs at first arrival: Tier 6 vs Tier 7 left alone and with a player lasering crystal clusters.
  - `node tools/test_greebles.js 4` does the same for the Greeble Crash Site: Tier 7 vs Tier 8 left alone and with a player lasering greebles (greebles seen, caught and lost per shift). Both take an `[hours]` argument to measure later instead of on arrival.
  - `node tools/test_ice.js 4` does it for the Purrmafrost Caverns: Tier 8 vs Tier 9, with slides, the longest slide and Rescue Claw trips per shift.
  - `node tools/seasons.js 4 8` prints catnip, yarn and tier times per season. Add `--max-tier 4` to compare against the economy without newer mines.
  - `node tools/test_events.js` and `node tools/test_pump.js` cover the event mines and the Tier 4 pumps.
  - `node tools/diag.js --minutes 30` shows where miner time goes.
  - `node tools/tierjump.js 1` compares staying vs jumping at each tier unlock (target ~1–2×).
  - `node tools/frontier.js 1 7` checks the frontier rule: for each stretch where a mine is the deepest one unlocked, the median miner's swings for stone and hard stone and her crossing time, on arrival and when the next mine unlocks. `--set '{json}'` tries balance changes (constants, `UPG.<id>.<field>`, `FC` per-tier perfect clears) without editing the game.
  - `node tools/test_ovas.js 1 90` plays to Season 5, then clears every OVA release and reports how long each took.
- **OVAs** live in `js/data/ovas.js` (limiter text, three goals, perk). Limiters hook in through `game.ovaIs(id)` / `game.ovaCfg()`, perks through `game.ovaPerk(id)` (0–3). OVAs are side stories: `startOva` saves the current run's state (`RUN_KEYS` in `js/sim/game.js`) in `s.suspended` and starts a fresh OVA run with a brand-new crew (no Timeline Anchors); an OVA's `useless` list locks upgrades that do nothing during it; `endOva` (goal met via `finishOva`, or ejected via `abandonOva`) restores it exactly, shifting the global-clock timers. No yarn, no season change. A new run-scoped state field must go in `RUN_KEYS`, or it will leak between the OVA and the saved run. Tapes and releases are spaced out by season (`NYA.ovaSeason`), counting regular runs only.
- **Syntax check:** run `node --check <file>` on everything you touch, since there is no compiler.
- **In a cloud session with no browser:** rely on the harness and syntax checks, then ask the user to playtest on GitHub Pages after pushing. `tools/spritetest.html` draws every sprite, pose and eyecatcher on one page.
- **Deploys:** `.github/workflows/pages.yml` publishes only `index.html`, `css/`, `js/` and `img/` (the link-preview image `img/og.png`), as two builds on one Pages site. `main` goes to the root URL, and the most recently pushed other branch goes to `/dev/` (https://varkarrus.github.io/NYAPOTISM/dev/). A push to any branch rebuilds both. The dev build uses its own save key (`nyapotism.save.dev`) and copies the main save the first time.
- **Dev saves:** on `/dev/` (or `?dev` off the live site), Settings → 🧪 Dev saves builds a save at a milestone by running `NYA.Bot` headless in the browser, and has snapshot slots (`js/ui/devtools.js`, milestones in `NYA.DEV_MILESTONES`). Handy for asking the user to playtest a specific stage.
- **Mine-gimmick spoilers:** a fax about a mine's own gimmick gets a `tier` (set at the bottom of `js/data/faxes.js`) so the board shows "?" until that mine is reached. Hide whole R&D sections whose teaser would name an unseen system.
- **No Skein spoilers:** never mention the Skein, yarn, the Loom, unravelling or seasons in text a player can see before finding the Skein (changelog, frontier note, upgrade/req text, faxes, dev-save labels).
- **Changelog:** whenever you push something playable, add an entry at the top of `NYA.CHANGELOG` in `js/ui/changelog.js`, and update `NYA.FRONTIER` if the content frontier moved. Both show on the title card at every load.
- **Line endings:** `.gitattributes` normalizes to LF in the repo. If you edit with Python on Windows, open files with `newline=''` so you don't convert line endings.
- **Commits:** clear messages that explain the why. The user pushes from GitHub Desktop locally. In the cloud, push when asked.
