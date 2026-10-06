// Boot, main loop (fixed-timestep sim + interpolated render), Banked Time, autosave.
(function (NYA) {
  'use strict';
  const SAVE_KEY = 'nyapotism.save.v1';
  const params = new URLSearchParams(location.search);
  const dev = params.has('dev');

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

  // title / welcome-back card (also unlocks audio with a user gesture)
  if (isNew) {
    ui.openModal(`<div class="title-card">
      <div class="tc-logo">NYAPOTISM!</div><div class="tc-sub">— Catnip Mining Co. —</div>
      <div class="tc-fax"><div class="fax-head">FAX — FROM: AUNTIE</div><div class="fax-body">${NYA.esc(NYA.STORY_FAX.intro)}</div></div>
      <p>You've just been made <b>Foreman</b> of a catnip mine. You did not earn this.</p>
      <button class="big" data-act="close">Clock in ▶</button>
      <p class="mini">Click tiles to laser-point your crew. Hover anything for the real numbers.</p></div>`);
  } else {
    ui.openModal(`<div class="title-card"><div class="tc-logo">NYAPOTISM!</div><div class="tc-sub">Welcome back, Foreman.</div>
      ${offline > 60 ? `<p>You were away for <b>${NYA.fmtTime(offline)}</b>. The crew napped. You banked <b>${NYA.fmtTime(offline * game.bankEff())}</b> of Fast-Forward.</p>` : ''}
      <button class="big" data-act="close">Clock in ▶</button></div>`);
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now(), acc = 0, saveT = 30;
  function loop(now) {
    let rdt = (now - last) / 1000;
    last = now;
    if (rdt > 3 && started) { game.s.bank += rdt * game.bankEff(); ui.toast(`Tab was hidden — banked ${NYA.fmtTime(rdt * game.bankEff())} of Fast-Forward.`); rdt = 0; }
    rdt = Math.min(rdt, 0.25);
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
    view.frame(paused || !started ? 1 : acc / NYA.TICK, rdt);
    ui.frame(rdt);
    saveT -= rdt;
    if (saveT <= 0 && started) { saveT = 30; save(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden && started) save(); });
})(globalThis.NYA = globalThis.NYA || {});
