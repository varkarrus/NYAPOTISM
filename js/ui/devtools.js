// Dev-build-only save tools: build a save at a chosen milestone by letting the harness bot play
// a fresh game headless in the browser, plus snapshot slots to jump back and forth.
// Only shown on the /dev/ Pages build (or ?dev off the live site), so it never touches the main save.
(function (NYA) {
  'use strict';

  const SNAP_KEY = k => 'nyapotism.devsnap.' + k;
  const SNAP_SLOTS = 3;

  // stop conditions on the bot's game; `seasons` lets the bot unravel on its own
  NYA.DEV_MILESTONES = [
    { id: 'barracks', label: 'Barracks open', hint: '~2 min', done: g => g.s.buildings.barracks },
    { id: 'pochi', label: 'First perfect clear', hint: '~4–10 min', done: g => g.s.life.fullClears >= 1 },
    { id: 't2', label: 'Tier 2: Scratching Post Quarry', hint: '~17 min', done: g => g.s.maxTierReached >= 2 },
    { id: 'tanuki', label: 'Tanuki’s Emporium', hint: '~18 min', done: g => g.s.buildings.tanuki },
    { id: 't2mid', label: 'Mid Tier 2 (30 min in)', hint: '30 min', done: g => g.s.simTime >= 30 * 60 },
    { id: 't3', label: 'Tier 3: Yarnball Caverns', hint: '~55 min', done: g => g.s.maxTierReached >= 3 },
    { id: 'skein', label: 'Big discovery (spoiler!)', hint: '~75 min', done: g => g.s.skein.have },
    { id: 't4', label: 'Tier 4: Dairy Depths', hint: '~90 min', done: g => g.s.maxTierReached >= 4 },
    { id: 't5', label: 'Tier 5: Sushi Grotto', hint: 'a few hours', seasons: true, done: g => g.s.maxTierReached >= 5 },
    { id: 's2', label: 'After the discovery: stage 2 (spoiler!)', hint: '~1h30', seasons: true, done: g => g.s.season >= 2 },
    { id: 's3', label: 'After the discovery: stage 3 (spoiler!)', hint: '~2h30', seasons: true, done: g => g.s.season >= 3 },
    { id: 's5', label: 'After the discovery: stage 5 (spoiler!)', hint: '~3h30', seasons: true, done: g => g.s.season >= 5 },
  ];

  function readSnap(k) {
    try { const j = localStorage.getItem(SNAP_KEY(k)); return j ? JSON.parse(j) : null; } catch (e) { return null; }
  }

  // Runs the bot in slices so the page stays responsive. onProgress(simMinutes), onDone(json).
  NYA.buildMilestoneSave = function (ms, onProgress, onDone) {
    const g = new NYA.Game({ headless: true, seed: 'dev-' + ms.id + '-' + Math.floor(Math.random() * 1e6) });
    const bot = new NYA.Bot(g, { mode: 'active', unravel: ms.seasons ? 'auto' : 'never' });
    g.newGame();
    const cap = 8 * 3600; // give up after 8 sim-hours
    let cancelled = false;
    const slice = () => {
      if (cancelled) return;
      const until = performance.now() + 40;
      while (performance.now() < until) {
        for (let k = 0; k < 200; k++) { bot.tick(NYA.TICK); g.tick(NYA.TICK); }
        if (ms.done(g) || g.s.simTime > cap) {
          g.s.lastOnline = Date.now(); // no surprise offline bank on load
          g.s.bank = 0;
          onDone(ms.done(g) ? g.serialize() : null, g);
          return;
        }
      }
      onProgress(g.s.simTime / 60, g);
      setTimeout(slice, 0);
    };
    setTimeout(slice, 0);
    return () => { cancelled = true; };
  };

  NYA.openDevSaves = function (ui) {
    const fmtAge = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago'; };
    const snapRow = k => {
      const sn = readSnap(k);
      return `<div class="devsnap"><b>Slot ${k + 1}</b> <span class="mini">${sn ? NYA.esc(sn.label) + ' · ' + fmtAge(sn.at) : 'empty'}</span>
        <span class="devbtns"><button data-snap="save:${k}">Save here</button><button data-snap="load:${k}" ${sn ? '' : 'disabled'}>Load</button></span></div>`;
    };
    ui.openModal(`<h2>🧪 Dev saves</h2>
      <p class="mini">Dev build only. These replace your <b>/dev/</b> save; your main save is never touched.</p>
      <h3>Jump to a milestone</h3>
      <p class="mini">The harness bot plays a fresh game in your browser until it reaches the milestone (a few seconds), then loads it. Save a snapshot first if you want to come back to your current game.</p>
      <div class="devms">${NYA.DEV_MILESTONES.map(m => `<button data-ms="${m.id}"><b>${NYA.esc(m.label)}</b><small>${m.hint}</small></button>`).join('')}</div>
      <div id="devProg" class="mini"></div>
      <h3>Snapshots</h3>
      <p class="mini">Save your current game to a slot, and come back to it later.</p>
      ${Array.from({ length: SNAP_SLOTS }, (_, k) => snapRow(k)).join('')}
      <div class="row"><button class="big" data-act="close">Close</button></div>`);
    const box = ui.el.modal;
    let cancel = null;
    box.querySelectorAll('[data-ms]').forEach(b => b.onclick = () => {
      if (cancel) return;
      const ms = NYA.DEV_MILESTONES.find(m => m.id === b.dataset.ms);
      const prog = document.getElementById('devProg');
      box.querySelectorAll('[data-ms]').forEach(x => { x.disabled = true; });
      prog.textContent = 'Simulating: ' + ms.label + '…';
      cancel = NYA.buildMilestoneSave(ms,
        (min, g) => { if (prog.isConnected) prog.textContent = `Simulating: ${ms.label}… ${Math.floor(min)} sim-min · Tier ${g.s.maxTierReached} · crew ${g.s.crew.length}`; else cancel(); },
        json => {
          if (!prog.isConnected) return;
          if (!json) { prog.textContent = 'The bot didn’t reach that milestone in 8 sim-hours. Try again (it’s random).'; cancel = null; box.querySelectorAll('[data-ms]').forEach(x => { x.disabled = false; }); return; }
          prog.textContent = 'Done! Loading…';
          ui.opts.importSave(json);
        });
    });
    box.querySelectorAll('[data-snap]').forEach(b => b.onclick = () => {
      const [op, k] = b.dataset.snap.split(':');
      if (op === 'save') {
        const g = ui.g;
        const label = (g.s.season > 1 ? `Season ${g.s.season} · ` : '') + `Tier ${g.s.maxTierReached} · ${NYA.fmt(g.s.catnip)} catnip`;
        try {
          localStorage.setItem(SNAP_KEY(k), JSON.stringify({ label, at: Date.now(), save: g.serialize() }));
          ui.toast('Saved to slot ' + (+k + 1) + '.');
        } catch (e) { ui.toast('Couldn’t save the snapshot (storage full?).', 'warn'); }
        NYA.openDevSaves(ui);
      } else {
        const sn = readSnap(k);
        if (!sn) return;
        const st = JSON.parse(sn.save);
        st.lastOnline = Date.now(); // don't bank the time the snapshot sat in a slot
        ui.opts.importSave(JSON.stringify(st));
      }
    });
  };
})(globalThis.NYA = globalThis.NYA || {});
