# NYAPOTISM! — Catnip Mining Co.

A browser incremental built from the GDD in `NYAPOTISM! — Catnip Mining Co.md`. Plain JavaScript and canvas, with no build step and no asset files. All art, music and sound are generated procedurally.

## Run it

- **Easiest:** open `index.html` in a browser. It works from `file://`.
- **Dev server** (no-cache, so edits show up on reload):

```bash
python tools/serve.py 8418
```

Then open <http://localhost:8418/>. Add `?dev` to the URL for 4×/16×/64× sim-speed buttons and a +1M catnip cheat.

Working on the code? Start with `CLAUDE.md` (rules and workflow) and `docs/HANDOFF.md` (current state, known issues, next steps).

The game autosaves to `localStorage` every 30 s. You can export or import a save string in Settings ⚙.

## What's in this build (vertical slice +)

| System | GDD § | Notes |
| --- | --- | --- |
| Seeded procedural mines, fog, air-pocket "whole room" reveals, reachability guarantee | 3.2 | `js/sim/minegen.js` |
| Density/quality ore (shape + color), Motherlode | 3.3 | |
| Short-attention-span miner AI: Focus sampling, distractions, flop, Rescue Claw | 3.4 | `js/sim/episode.js` |
| Laser pointer (Zoomies, dig-toward-fog), Spray Bottle, Whistle | 3.5, 3.7 | |
| Stamina/Grit/walk drain, full-clear bonus, S–D ratings | 3.6–3.7 | |
| Catgirls: applicant board hiring, levels, aptitude, ~40 traits with mine-flavored rolls | 4 | `js/data/traits.js` |
| Refinery Mk, Polisher, Centrifuge, **Tora's Special Blend** gamble | 6.2 | |
| Actives: Blunt (tolerance), Hairball Bomb, Tuna Time, Sonar, Hotbox, Treat Bag, Catterall, **Mewclear Option** | 7 | |
| R&D tree (5 branches) and Project MEWCLEAR's 10 stages, with the warhead sprite evolving | 7.1, 8 | |
| Tiers 1–6: Backyard Burrow, Scratching Post Quarry (grooved chains), Yarnball Caverns (tangles + Schrödinger's Box), **Dairy Depths** (milk nodes, pumpjacks, pipes, Creamery), **Sushi Grotto** (flooded chambers with falling-sand water, wet penalty, wild nigiri → sushi, Sushi Bar), **Mousehole Maze** (mouse nests, scouts/bruisers/pickpockets, crew fights back, Hairball Cannon turrets, Turret-chan, cheese → R&D Defense and Aged Gouda). Rough ground (mud, rubble) from Tier 2 | 9, 10 | `js/data/tiers.js`, `js/sim/mice.js` |
| Purrmit Office standing orders, Requisition Points (boot-screen bar), auto-cast, auto-hire | 11 | |
| Banked Time and Fast-Forward | 12 | |
| ~45 Faxes from Auntie (achievements with bonuses) | 13 | |
| Schrödinger's Skein → Unravel → Yarn → **Quantum Loom** 5×5 sweater with stripes, Timeline Anchors, Laser Drone | 14 | |
| **OVAs**: six challenge tapes (Lights Out, Nine to Five, Budget Cuts, No Laser Zone, Monday, One Cat Army) × three releases, each with a permanent perk, spread over Seasons 5–25 | 15 | `js/data/ovas.js` |
| Episode titles, Tora barks, eyecatchers (11, two of them rare), next-episode previews, opening-theme verses | 21 | |
| City-pop music per mine (FM e-piano, bass, drum machine), synthesized SFX | 22.2 | `js/audio.js` |
| **Tanuki's Emporium**: limited-time event mines (Golden Week, Tanabata wishes, Obon ghosts, Mochi Pounding, Summer Matsuri goldfish), Rain Checks, queued purrmits, an 8 RP auto-buy order | 9.4 | `js/data/events.js` |
| **Swing techniques**: Haste never exceeds 4 swings/s. Past that, swings fold into heavier named techniques (Paw Smash, Pounce Strike, Tiger Drop…) | — | your suggestion |
| Music/SFX: **On / Mute when unfocused / Muted** each, plus volume | — | top-bar 🎵/🔊 buttons cycle the mode |

### Liberties taken (for pacing and novelty)

- **Base speed:** base Haste is 2.0 and Pace is 4.0 (the GDD has 1.0 and 2.0), with Stamina 50. This keeps the first episodes around 40 s instead of 90 s.
- **First-time tips:** contextual tips only appear until you've done the thing (laser, first buy, first hire, first Blunt, Auto-Repeat).
- **Novelty drip:** an always-visible "★ NEW! ★" ribbon for every first-time system. Locked research shows up as "??? N more things coming…" teasers.
- **Extra actives:** Treat Bag and Catterall are reachable in Season 1 to fill the late-Tier-3 novelty gap.
- **Tier 4 gating:** Tier 4 needs the Skein in hand (GDD: Skein before T4) and 10 Tier-3 perfect clears. It becomes Season 2's new system.
- **Pack-up countdown:** before Auto-Repeat is filed, episodes auto-continue after a 10 s countdown, so the game is never stuck waiting on a click. Filing Auto-Repeat removes the wait.
- **Tile hover readout:** hovering a tile shows its type, density, quality and HP (Pillar 1: every number is visible).
- **Swing techniques:** when Haste would exceed 4 swings/s, swings fold: half the swings, ×2 power and ×2 stamina per swing (so stamina per second is unchanged), plus ×1.1 power per fold as a milestone bonus. XP per swing scales with the fold. Each new technique is a "★ NEW!" beat, and the swings visibly get heavier.
- **Local ore awareness:** miners always notice ore within 3 tiles of themselves. Without it, unsteered crews reached milestones ~10× slower than a laser-perfect player. With it, the gap is ~1.3–1.5× in time-to-milestone, which matches the GDD's 1.3–1.6× target.
- **Crew size:** each Bunk Bed is hand-priced and gated by progress (`NYA.BUNKS` in `js/data/upgrades.js`): 2 slots ~5 min, 3 by 10 min, 4 needs Tier 2, 5 needs 3 Tier-2 perfect clears, 6 needs Tier 3, 7 needs 5 Tier-3 perfect clears, 8 needs Tier 4. That's ~3–5 miners through Tier 2 and 5–6 in Tier 3, where the GDD has ~12 over a season. Tier surveys cost less to match the smaller crew.
- **Per-tier counter-pressures:** ore gets denser each tier but crumblier (HP per item ×0.88 per tier), so Carry keeps mattering. Sight = 3 + Headlamps − darkness (−1 every two tiers) sets how far miners notice ore on their own and how far fog reveals, so Headlamps are a long-tail upgrade instead of a 3-level cap. See `js/data/tiers.js`.
- **Tanuki's schedule:** Tanuki visits every 25–40 sim-minutes (the GDD says 2–4 h) and each offer lasts 15 min, which suits a shorter slice. Event mines pay ×1.5 and don't count toward tier-unlock perfect clears.

## Balance harness (headless sims)

The simulation runs headless in Node with a scripted player bot:

```bash
node tools/harness.js --minutes 150 --seed 1
```

```bash
node tools/harness.js --minutes 480 --seasons 6 --seed 4
```

```bash
node tools/harness.js --mode idle --minutes 90
```

```bash
node tools/diag.js --minutes 30
```

```bash
node tools/test_pump.js
```

```bash
node tools/test_events.js
```

- The first command prints the season-1 novelty timeline with the gap between new systems.
- The second runs a multi-season prestige run.
- The third runs an idle player who checks in every 90 s and relies on standing orders.
- `diag.js` shows where miner time goes in each episode (mining, walking, loafing, and so on).
- `test_pump.js` checks the Tier 4 pump state machine, and `test_events.js` runs each Tanuki event mine once.

Current active-bot pacing compared with the GDD targets:

| Milestone | GDD target | Sim |
| --- | --- | --- |
| First perfect clear / Purrmit Office | ~10 min | ~5–11 min |
| Tier 2 | 10–45 min | ~16–18 min |
| Tier 3 + Schrödinger's Box | 45 min–2.5 h | ~52–59 min |
| First Skein | 90–150 min | ~63–72 min |
| Season 1 length | 90–150 min | ~1 h 25–1 h 30 (bot unravels 25 min after the Skein) |
| Season 2 | — | ~1 h 10–1 h 20 (Dairy Depths arrives) |
| Seasons 3–5 | 20–30 min (by S5) | ~20–50 min |

## Layout

```
index.html            page shell
css/style.css         80s-anime sunset theme, responsive
js/core/util.js       seeded RNG, number formatting
js/data/*.js          tiers, traits, writing, upgrades, faxes, loom (data-driven content)
js/sim/*.js           minegen, catgirl stats (modifier stack), episode sim, meta game, bot
js/render/*.js        procedural sprites, mine renderer, eyecatchers
js/audio.js           synth music + SFX
js/ui/*.js            HQ panels, HUD/overlays/input
js/main.js            fixed-timestep loop (20 tps), Banked Time, autosave
tools/                harness, diagnostics, sprite sheet test page, dev server
```

The simulation layer (`js/sim`, `js/data`, `js/core`) has no DOM access. The browser and the Node harness run the exact same code.

## Not built yet (from the GDD)

Workshop and equipment, more mouse and turret types, more OVAs, spin-offs (Farm, Fishing, Canteen, Alchemy, Idols), The Movie and the Reboot, NYANZER, The Nine Lives, Tiers 7–12, alternate mines, cave-ins and bamboo, Loom patterns 2–6, and the Fax Macro language.
