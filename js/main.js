// Boot, main loop (fixed-timestep sim + interpolated render), Banked Time, autosave.
(function (NYA) {
  'use strict';
  const MAIN_SAVE_KEY = 'nyapotism.save.v1';
  // The /dev/ Pages build shares this origin's localStorage, so it keeps its own save.
  const devBuild = /\/dev\//.test(location.pathname);
  const SAVE_KEY = devBuild ? 'nyapotism.save.dev' : MAIN_SAVE_KEY;
  const params = new URLSearchParams(location.search);
  const dev = params.has('dev');
  let copiedMain = false;
  try {
    if (devBuild && !localStorage.getItem(SAVE_KEY) && localStorage.getItem(MAIN_SAVE_KEY)) {
      localStorage.setItem(SAVE_KEY, localStorage.getItem(MAIN_SAVE_KEY));
      copiedMain = true;
    }
  } catch (e) { /* storage blocked */ }

  function loadSave() {
    try {
      const j = localStorage.getItem(SAVE_KEY);
      if (j) return NYA.Game.deserialize(j);
    } catch (e) { console.warn('save load failed', e); }
    return null;
  }

  let game = loadSave();
  if (game && !game.s.crew.length && !game.s.life.episodes) game = null; // never-started save
  const isNew = !game;
  if (!game) game = new NYA.Game({ seed: 'nyapo-' + Math.floor(Math.random() * 1e9) });
  let offline = 0;
  if (!isNew) {
    offline = Math.max(0, Math.min(7 * 86400, (Date.now() - (game.s.lastOnline || Date.now())) / 1000));
    game.s.bank += offline * game.bankEff();
  }

  const audio = new NYA.Audio(game.s.settings);
  const view = new NYA.MineView(document.getElementById('mine'), game, audio);
  let paused = false, devSpeed = 1, started = false;

  let resetting = false;
  function save() {
    if (resetting || !started) return;
    try { localStorage.setItem(SAVE_KEY, game.serialize()); } catch (e) { console.warn('save failed', e); }
  }
  const ui = new NYA.UI(game, view, audio, {
    togglePause() { paused = !paused; },
    toggleFF() { game.s.settings.ffOn = !game.s.settings.ffOn; if (game.s.bank <= 0 && game.s.settings.ffOn) ui.toast('The Catnap Bank is empty. Offline time fills it.', 'warn'); },
    setDevSpeed(v) { devSpeed = v; renderDev(); },
    isPaused() { return paused; },
    importSave(json) { resetting = true; localStorage.setItem(SAVE_KEY, json); location.reload(); },
    hardReset() { resetting = true; localStorage.removeItem(SAVE_KEY); location.reload(); },
    onModalClose() { if (!started) begin(); },
    // dev save tools: the /dev/ build, or ?dev anywhere except the live main site
    devTools: devBuild || (dev && location.hostname !== 'varkarrus.github.io'),
  });
  NYA.debug = { game, ui, view, audio, save };

  function renderDev() {
    const el = document.getElementById('devSpeeds');
    if (!dev) return;
    el.innerHTML = [1, 4, 16, 64].map(v => `<button class="${devSpeed === v ? 'on' : ''}" data-act="speed:${v}">${v}×</button>`).join('') + '<button data-act="cheat:1e6">+1M</button>';
  }
  renderDev();
  document.body.classList.toggle('vhs', !!game.s.settings.vhs);

  function begin() {
    if (started) return;
    started = true;
    audio.init();
    if (isNew || !game.s.crew.length) game.newGame();
    else game.startEpisode();
    ui.renderPanel(true);
    view.resize();
  }

  // changelog + content frontier, shown on the title card at every load
  function newsHtml() {
    const log = NYA.CHANGELOG || [], fr = NYA.FRONTIER;
    const b = NYA.BUILD;
    const tag = (devBuild ? '<span class="tc-dev">DEV BUILD</span> ' : '') + (b ? `${NYA.esc(b.sha)} · ${NYA.esc(b.date)}` : '');
    const entry = (e, i) => `<details class="tc-log"${i === 0 ? ' open' : ''}><summary><b>${NYA.esc(e.title)}</b> <small>${NYA.esc(e.date)}</small></summary>
      <ul>${e.items.map(x => `<li>${NYA.esc(x)}</li>`).join('')}</ul></details>`;
    return `<div class="tc-news">
      ${tag ? `<div class="tc-build">${tag}</div>` : ''}
      ${copiedMain ? '<p class="mini">Dev build: copied your main save to start from. The two saves are separate from now on.</p>' : ''}
      <h3>What's new</h3>${log.slice(0, 4).map(entry).join('')}
      ${fr ? `<h3>How far this build goes</h3><p>${NYA.esc(fr.summary)}</p><ul>${fr.items.map(x => `<li>${NYA.esc(x)}</li>`).join('')}</ul>` : ''}
      <p class="tc-suggest">💡 Ideas or bugs? <a href="https://github.com/varkarrus/NYAPOTISM/issues" target="_blank" rel="noopener">Leave a suggestion</a> (the 💡 button up top goes there too).</p>
    </div>`;
  }

  // title / welcome-back card (also unlocks audio with a user gesture)
  if (isNew) {
    ui.openModal(`<div class="title-card">
      <div class="tc-logo">NYAPOTISM!</div><div class="tc-sub">— Catnip Mining Co. —</div>
      <div class="tc-fax"><div class="fax-head">FAX — FROM: AUNTIE</div><div class="fax-body">${NYA.esc(NYA.STORY_FAX.intro)}</div></div>
      <p>You've just been made <b>Foreman</b> of a catnip mine. You did not earn this.</p>
      <button class="big" data-act="close">Clock in ▶</button>
      <p class="mini">Click tiles to laser-point your crew. Hover anything for the real numbers.</p>${newsHtml()}</div>`);
  } else {
    ui.openModal(`<div class="title-card"><div class="tc-logo">NYAPOTISM!</div><div class="tc-sub">Welcome back, Foreman.</div>
      ${offline > 60 ? `<p>You were away for <b>${NYA.fmtTime(offline)}</b>. The crew napped. You banked <b>${NYA.fmtTime(offline * game.bankEff())}</b> of Fast-Forward.</p>` : ''}
      <button class="big" data-act="close">Clock in ▶</button>${newsHtml()}</div>`);
  }

  // ---------------------------------------------------------------- loop
  // Animation frames drive the game while it's visible. Browsers stop those in background tabs and
  // throttle normal timers, but not a Web Worker's timer, so a worker ticks the game while hidden:
  // the sim and its sounds keep going at full speed (Settings: "Keep mining in background tabs").
  let last = performance.now(), acc = 0, saveT = 30, lastStep = 0;
  function step(now, visible) {
    lastStep = now;
    let rdt = (now - last) / 1000;
    last = now;
    // a real gap (computer asleep, phone froze the tab) still becomes Banked Time
    if (rdt > 3 && started) { game.s.bank += rdt * game.bankEff(); ui.toast(`Game was paused — banked ${NYA.fmtTime(rdt * game.bankEff())} of Fast-Forward.`); rdt = 0; }
    rdt = Math.min(rdt, visible ? 0.25 : 3);
    if (started && !paused && ui.freeze <= 0) {
      let speed = 1;
      if (game.s.settings.ffOn && game.s.bank > 0) {
        speed = game.ffSpeed();
        game.s.bank = Math.max(0, game.s.bank - rdt * (speed - 1));
      }
      speed *= devSpeed;
      acc += rdt * speed;
      let n = 0;
      const maxN = 4000;
      while (acc >= NYA.TICK && n < maxN) { game.tick(NYA.TICK); acc -= NYA.TICK; n++; }
      if (n >= maxN) acc = 0;
    }
    if (visible) view.frame(paused || !started ? 1 : acc / NYA.TICK, rdt);
    else view.tickHidden(rdt);
    ui.frame(rdt);
    saveT -= rdt;
    if (saveT <= 0 && started) { saveT = 30; save(); }
  }
  function loop(now) { step(now, true); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  function startBackgroundTicker(ms, fn) {
    try {
      const src = `setInterval(() => postMessage(0), ${ms});`;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = fn;
      return;
    } catch (e) { /* no workers (some file:// setups): plain timer, throttled but better than nothing */ }
    setInterval(fn, ms);
  }
  startBackgroundTicker(50, () => {
    if (game.s.settings.bgRun === false) return;
    const now = performance.now();
    if (now - lastStep > 150) step(now, false); // only when animation frames have stopped arriving
  });
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden && started) save(); });
})(globalThis.NYA = globalThis.NYA || {});
