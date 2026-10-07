// DOM UI: HUD, crew rail, tools/actives, HQ panels, overlays, tooltips, input.
(function (NYA) {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => NYA.esc(s), fmt = NYA.fmt;
  const NIP = '<i class="nip"></i>';

  const OPENING = [
    ['Hard hat on and tail held high,', 'down the shaft where the green leaves lie!', 'Auntie’s faxing from the beach —', 'every rock is within our reach!'],
    ['Pull the thread and start again,', 'same old tunnels, brand-new friends!', 'Yarn and timelines, knit and purl —', 'NYAPOTISM, mining girl!'],
    ['Lasers flicker, pickaxes ring,', 'Tora yells but we still sing!', 'Doc Boom’s warhead hums a tune —', 'we’ll be rich by Tuesday noon!'],
    ['Season four and the loaf is strong,', 'Sgt. Paws is crying along!', 'Pochi stamps it: NO, then FINE —', 'one more box and the Skein is mine!'],
    ['Somewhere a fax machine screams,', 'printing out our wildest dreams!', 'Who is Auntie? Who are we?', 'Dig a little deeper and see!'],
  ];

  const SND_LABEL = { on: 'On', unfocused: 'Mute when unfocused', off: 'Muted' };

  class UI {
    constructor(game, view, audio, opts) {
      this.g = game; this.view = view; this.audio = audio; this.opts = opts || {};
      this.tab = 'office';
      this.tool = 'laser';
      this.targeting = null;
      this.panelSig = '';
      this.crewSig = '';
      this.activesSig = '';
      this.slowT = 0;
      this.overlayFor = null;
      this.eyeT = 0;
      this.traitQueue = []; this.traitShowing = false;
      this.newTabs = {};
      this.freeze = 0;
      this.drag = null;
      this.lastCatnip = game.s.catnip;
      this.bind();
      game.on((t, d) => this.onEvent(t, d));
      view.banners = k => this.banner(k);
    }

    // ---------------------------------------------------------------- setup
    bind() {
      this.el = {
        catnip: $('#catnip'), yarnBox: $('#resYarn'), yarn: $('#yarn'), milkBox: $('#resMilk'), milk: $('#milk'), sushiBox: $('#resSushi'), sushi: $('#sushi'), cheeseBox: $('#resCheese'), cheese: $('#cheese'), title: $('#epTitle'),
        hud: $('#hud'), crew: $('#crewList'), actives: $('#actives'), tabs: $('#tabs'), panel: $('#panel'),
        overlay: $('#overlay'), banner: $('#banner'), toasts: $('#toasts'), faxTray: $('#faxTray'), tip: $('#tip'),
        modal: $('#modal'), bank: $('#bank'), ff: $('#btnFF'), pause: $('#btnPause'), tools: $('#toolBtns'), stage: $('#mineWrap'),
        traitPop: $('#traitPop'), novel: $('#novel'), catnipRate: $('#catnipRate'),
      };
      const cv = this.view.cv;
      cv.addEventListener('pointerdown', e => this.onDown(e));
      cv.addEventListener('pointermove', e => this.onMove(e));
      window.addEventListener('pointerup', () => { this.drag = null; });
      cv.addEventListener('pointerleave', () => { this.view.hover = -1; });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('pointerdown', e => {
        const a = e.target.closest('[data-act]');
        if (a && e.button === 0) { this.act(a.dataset.act, a, e); }
      });
      document.addEventListener('mouseover', e => this.onTipOver(e));
      document.addEventListener('mousemove', e => this.onTipMove(e));
      window.addEventListener('keydown', e => this.onKey(e));
      window.addEventListener('resize', () => this.view.resize());
      this.renderTabs();
      this.renderTools();
      this.renderSound();
    }
    renderSound() {
      const st = this.g.s.settings;
      for (const [id, kind, icon] of [['#btnMusic', 'music', '🎵'], ['#btnSfx', 'sfx', '🔊']]) {
        const el = document.querySelector(id); if (!el) continue;
        const m = st[kind + 'Mode'] || 'on';
        el.className = 'snd m-' + m;
        el.innerHTML = `${icon}<small>${m === 'on' ? 'ON' : m === 'off' ? 'OFF' : 'BG'}</small>`;
      }
    }

    // ---------------------------------------------------------------- actions
    act(a, el, e) {
      const g = this.g;
      const [k, v] = a.split(':');
      this.audio.init();
      switch (k) {
        case 'tab': this.tab = v; this.newTabs[v] = 0; this.renderTabs(); this.renderPanel(true); this.audio.sfx('click'); break;
        case 'buy':
          if (g.buy(v)) { this.audio.sfx(NYA.UPG[v].timer ? 'research' : 'buy'); this.renderPanel(true); this.flashEl(el); }
          else this.audio.sfx('deny');
          break;
        case 'hire': { const cg = g.hire(v === undefined || v === '' ? undefined : +v); this.audio.sfx(cg ? 'buy' : 'deny'); this.renderPanel(true); break; }
        case 'postad': { const ok = g.postAd(); this.audio.sfx(ok ? 'buy' : 'deny'); if (ok) this.toast('Sgt. Paws: “NEW FACES! I’M NOT CRYING, YOU’RE CRYING!”', 'paws'); this.renderPanel(true); break; }
        case 'bench': if (g.toggleActive(+v)) { this.audio.sfx('click'); this.renderPanel(true); } else { this.audio.sfx('deny'); this.toast('No free slot for that.', 'warn'); } break;
        case 'transfer': {
          const cg = g.crewById(+v);
          if (!cg) break;
          if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Sure?'; setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ''; el.textContent = 'Transfer'; } }, 2500); break; }
          g.transfer(+v); this.renderPanel(true);
          break;
        }
        case 'mine': if (g.selectTier(+v)) { this.audio.sfx('click'); this.renderPanel(true); this.toast(`Next episode: ${NYA.TIERS[+v].name}`); } break;
        case 'order': g.toggleOrder(v); this.audio.sfx('stamp'); this.renderPanel(true); this.renderTools(); break;
        case 'defrag': this.audio.sfx('stamp'); this.toast('Pochi looks deeply satisfied.'); break;
        case 'unravel': this.confirmUnravel(); break;
        case 'ova': if (v === 'abandon') this.confirmAbandonOva(); else this.confirmOva(a.split(':')[2]); break;
        case 'loom': if (g.loomBuy(v)) { this.audio.sfx('buy'); this.renderPanel(true); } else this.audio.sfx('deny'); break;
        case 'blend': if (g.startBlend()) { this.audio.sfx('blend'); this.renderPanel(true); } break;
        case 'tanbuy': if (g.tanukiBuy()) { this.audio.sfx('buy'); this.renderPanel(true); } else this.audio.sfx('deny'); break;
        case 'tanrain': if (g.tanukiBuy(true)) { this.audio.sfx('buy'); this.renderPanel(true); } else this.audio.sfx('deny'); break;
        case 'runevent': if (g.queueEvent(+v)) { this.audio.sfx('stamp'); this.toast('Event purrmit stamped — it runs next episode!'); this.renderPanel(true); } break;
        case 'tool': this.setTool(v); break;
        case 'active': this.useActive(v); break;
        case 'whistle': if (g.whistle()) { this.audio.sfx('whistle'); } break;
        case 'next': g.nextEpisode(); this.audio.sfx('click'); break;
        case 'pause': this.opts.togglePause(); break;
        case 'ff': this.opts.toggleFF(); break;
        case 'speed': this.opts.setDevSpeed(+v); break;
        case 'settings': this.openSettings(); break;
        case 'help': this.openHelp(); break;
        case 'close': this.closeModal(); break;
        case 'faxclick': g.s.life.faxClicks++; this.audio.sfx('fax'); break;
        case 'eye': this.showEyecatchModal(v); break;
        case 'set': this.toggleSetting(v); break;
        case 'cycle': {
          const st = g.s.settings, key = v + 'Mode', order = ['on', 'unfocused', 'off'];
          st[key] = order[(order.indexOf(st[key] || 'on') + 1) % 3];
          this.audio.applyVolumes(); this.renderSound();
          this.toast(`${v === 'music' ? 'Music' : 'Sound effects'}: ${SND_LABEL[st[key]]}`);
          break;
        }
        case 'sndmode': {
          const [kind, mode] = v.split('.');
          g.s.settings[kind + 'Mode'] = mode; this.audio.applyVolumes(); this.renderSound();
          this.el.modal.querySelectorAll(`[data-act^="sndmode:${kind}."]`).forEach(b => b.classList.toggle('on', b.dataset.act === `sndmode:${kind}.${mode}`));
          break;
        }
        case 'export': this.doExport(); break;
        case 'import': this.doImport(); break;
        case 'reset': this.doReset(el); break;
        case 'crewpick': if (this.targeting && NYA.ACTIVES[this.targeting].target === 'miner') { g.useActive(this.targeting, +v); this.endTargeting(); } else { this.tab = 'barracks'; this.renderTabs(); this.renderPanel(true); } break;
        case 'dismiss': el.remove(); break;
        case 'cheat': g.s.catnip += +v || 1e3; break;
      }
    }
    flashEl(el) { const c = el.closest('.card'); if (c) { c.classList.remove('bought'); void c.offsetWidth; c.classList.add('bought'); } }

    setTool(t) {
      if (t === 'spray' && !this.g.lvl('spray')) return;
      if (t === 'turret' && !(this.g.episode && this.g.episode.miceOn)) return;
      this.tool = t; this.endTargeting(true);
      this.view.toolMode = t;
      this.renderTools();
      this.audio.sfx('click');
    }
    useActive(id) {
      const g = this.g;
      if (!g.canUseActive(id)) { this.audio.sfx('deny'); return; }
      const def = NYA.ACTIVES[id];
      if (def.target === 'none') { g.useActive(id); return; }
      if (this.targeting === id) { this.endTargeting(); return; }
      this.targeting = id;
      this.view.toolMode = id;
      this.el.stage.classList.add('targeting');
      this.renderTools();
      this.hint(def.target === 'miner' ? 'Click a miner (or her crew card) — right-click to cancel' : 'Click a tile — right-click to cancel');
    }
    endTargeting(silent) {
      this.targeting = null;
      this.view.toolMode = this.tool;
      this.el.stage.classList.remove('targeting');
      this.renderTools();
      if (!silent) this.hint('');
    }

    // ---------------------------------------------------------------- mine input
    onDown(e) {
      const g = this.g, view = this.view;
      this.audio.init();
      if (g.phase !== 'shift' || !g.episode) return;
      const i = view.tileAt(e.clientX, e.clientY);
      if (e.button === 2) {
        if (this.targeting) { this.endTargeting(); return; }
        if (i >= 0) { g.unmark(i); if (g.lvl('spray')) g.spray(i, false); }
        this.drag = { mode: 'erase' };
        return;
      }
      if (this.targeting) {
        const id = this.targeting, def = NYA.ACTIVES[id];
        let ok = false;
        if (def.target === 'miner') { const m = view.minerAt(e.clientX, e.clientY) || (i >= 0 ? g.episode.miners.find(mm => mm.tile === i) : null); if (m) ok = g.useActive(id, m.id); }
        else if (i >= 0) ok = g.useActive(id, i);
        if (ok) { if (!e.shiftKey || !g.canUseActive(id)) this.endTargeting(); }
        else this.audio.sfx('deny');
        return;
      }
      if (i < 0) return;
      const ep = g.episode;
      if (this.tool === 'turret') {
        if (g.turret(i)) this.drag = null; else this.audio.sfx('deny');
        return;
      }
      if (this.tool === 'spray') {
        const on = !ep.mine.forbid[i];
        if (g.spray(i, on)) this.audio.sfx('puff');
        this.drag = { mode: 'spray', on };
      } else {
        if (ep.isMarked(i)) { g.unmark(i); this.drag = { mode: 'unmark' }; }
        else { if (!g.laser(i) && g.ovaIs('nolaser') && !this._nlTold) { this._nlTold = true; setTimeout(() => { this._nlTold = false; }, 8000); this.toast('📵 No Laser Zone! The laser pointer has been confiscated.', 'warn'); } this.drag = { mode: 'laser' }; }
      }
    }
    onMove(e) {
      const view = this.view, g = this.g;
      const i = view.tileAt(e.clientX, e.clientY);
      view.hover = i;
      if (!view.toolMode) view.toolMode = this.tool;
      if (!this.drag || i < 0 || g.phase !== 'shift' || !g.episode) return;
      const ep = g.episode;
      if (this.drag.mode === 'laser' && !ep.isMarked(i)) g.laser(i);
      else if (this.drag.mode === 'unmark') g.unmark(i);
      else if (this.drag.mode === 'spray') g.spray(i, this.drag.on);
      else if (this.drag.mode === 'erase') { g.unmark(i); if (g.lvl('spray')) g.spray(i, false); }
    }
    onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const g = this.g, k = e.key;
      if (k === ' ') { e.preventDefault(); this.opts.togglePause(); return; }
      if (k === 'Escape') { if (!this.el.modal.hidden) this.closeModal(); else this.endTargeting(); return; }
      if (k === 'l' || k === 'L') this.setTool('laser');
      else if (k === 's' || k === 'S') this.setTool('spray');
      else if (k === 't' || k === 'T') this.setTool('turret');
      else if (k === 'w' || k === 'W') { if (g.whistle()) this.audio.sfx('whistle'); }
      else if (k === 'f' || k === 'F') this.opts.toggleFF();
      else if (k === 'n' || k === 'N') g.nextEpisode();
      else {
        const id = Object.keys(NYA.ACTIVES).find(a => NYA.ACTIVES[a].key === k);
        if (id && g.activeUnlocked(id)) this.useActive(id);
      }
    }

    // ---------------------------------------------------------------- game events
    onEvent(t, d) {
      const g = this.g;
      switch (t) {
        case 'episodeStart':
          this.view.setEpisode(d.ep);
          const def = NYA.TIERS[d.tier];
          const evd = d.event ? NYA.EVENTS[d.event] : null;
          if (this.audio) this.audio.setTheme(evd ? evd.music : def.music.prog, def.music.bpm + (evd ? 8 : 0), def.music.key);
          this.overlayFor = null; this.el.overlay.innerHTML = ''; this.el.overlay.className = '';
          this.titleCard(d);
          this.renderTools();
          break;
        case 'episodeEnd': this.buildOverlay(d); this.queueEyecatch(d.eye, d.ep); break;
        case 'fax': this.showFax(d); break;
        case 'novel': this.showNovel(d); break;
        case 'trait': this.traitQueue.push(d); this.nextTrait(); break;
        case 'hire': this.toast(`<b>${esc(d.cg.name)} ${esc(d.cg.family)}</b> joins! Sgt. Paws: “${esc(d.line)}”`, 'paws'); this.renderPanel(true); break;
        case 'transfer': this.toast(`${esc(d.cg.name)} transferred to Corporate (+${fmt(d.refund)} catnip). Sgt. Paws: “${esc(d.line)}”`, 'paws'); break;
        case 'research': if (d.done) { this.toast(`Research complete: <b>${esc(NYA.UPG[d.id].name)}</b>. Doc Boom: “${esc(d.line)}”`, 'doc'); this.audio.sfx('research'); this.renderPanel(true); } break;
        case 'upgrade':
          if (d.id === 'montage') this.montage(d.level);
          if (d.id === 'mewclear') this.renderPanel(true);
          this.renderTools();
          break;
        case 'skein': this.freeze = 2.2; this.el.stage.classList.add('mono'); setTimeout(() => this.el.stage.classList.remove('mono'), 2600); this.newTabs.office = 1; this.renderTabs(); break;
        case 'unravel': if (d.ova) this.ovaStartCard(d); else if (!d.afterOva) this.seasonCard(d); this.renderTabs(); this.renderPanel(true); break;
        case 'ova': if (d.phase === 'clear') this.ovaClearCard(d); else this.toast('OVA abandoned. Back to the regular broadcast.', 'warn'); break;
        case 'toast': this.toast(esc(d.text), d.kind); break;
        case 'blend':
          if (d.phase === 'end') { this.banner('blend', d); this.audio.sfx(d.f >= 2 ? 'motherlode' : d.f >= 1 ? 'fullclear' : 'empty'); }
          this.toast(`Tora: “${esc(d.line)}”`, 'tora');
          this.renderPanel(true);
          break;
        case 'active': break;
        case 'levelup': break;
        case 'orders': this.renderTools(); break;
        case 'technique': this.banner('technique', d); this.audio.sfx('montage'); break;
        case 'critfold': this.banner('critfold', d); this.audio.sfx('montage'); break;
        case 'tanuki':
          if (d.phase === 'arrive') { this.toast(`<b>Tanuki-san</b> sets up shop: ${esc(NYA.EVENTS[d.offer.ev].name)}! “${esc(d.line)}”`, 'tanuki'); this.newTabs.tanuki = 1; this.renderTabs(); this.audio.sfx('novel'); }
          else if (d.phase === 'expire') this.toast(esc(d.line), 'tanuki');
          else if (d.phase === 'buy') this.toast(`Tanuki: “${esc(d.line)}”`, 'tanuki');
          this.renderPanel(true);
          break;
      }
    }

    titleCard(d) {
      const ttl = this.el.title;
      const ova = this.g.s.ova ? `<span class="ovatag">📼 OVA: ${esc(NYA.OVA[this.g.s.ova.id].name)}</span> ` : '';
      ttl.innerHTML = `${ova}<b>EP ${d.num}</b> · ${d.event ? `<span class="evname">${NYA.EVENTS[d.event].icon} ${esc(NYA.EVENTS[d.event].name)}</span>` : esc(NYA.TIERS[d.tier].name)}`;
    }

    // ---------------------------------------------------------------- overlay (pack-up)
    buildOverlay(r) {
      this.overlayFor = r;
      this.eyeT = 0;
      const g = this.g;
      const q = r.byQ.map((n, qq) => n && qq ? `<span class="qi"><canvas class="qshape" data-q="${qq}" width="18" height="18"></canvas>×${n}</span>` : '').join('');
      const crew = r.crew.map(c => `<span class="cr">${esc(c.name)} <b>${c.items}</b>${c.levels ? ` <i class="lvup">+${c.levels} Lv</i>` : ''}${c.flopped ? ' 💤' : ''}</span>`).join('');
      const extra = [];
      if (r.thread) extra.push(`Tangled Thread ×${r.thread}`);
      if (r.lost) extra.push(`${r.lost} lost to a Tabletop Menace`);
      if (r.blendCut) extra.push(`${fmt(r.blendCut)} into Tora’s pot`);
      if (r.milk) extra.push(`🥛 +${fmt(r.milk)} milk`);
      if (r.sushi) extra.push(`🍣 +${fmt(r.sushi)} sushi`);
      if (r.cheese) extra.push(`🧀 +${fmt(r.cheese)} cheese`);
      if (r.mice) extra.push(`🐭 ${r.mice} mice shooed`);
      if (r.stolen) extra.push(`${r.stolen} item${r.stolen > 1 ? 's' : ''} stolen by pickpockets`);
      if (r.event) extra.push(`${NYA.EVENTS[r.event].icon} ${NYA.EVENTS[r.event].name}: ×${r.evMult.toFixed(2)}${r.wishes ? ` (${r.wishes} wish${r.wishes > 1 ? 'es' : ''})` : ''}`);
      this.el.overlay.innerHTML = `
        <div class="ov-tally">
          <div class="ov-ep">EPISODE ${r.ep}${r.season > 1 ? ` <small>· SEASON ${r.season}</small>` : ''}</div>
          <div class="ov-title">“${esc(r.title)}”</div>
          <div class="ov-stamps"><div class="rank r-${r.rating}">${r.rating}</div>${r.fullClear ? '<div class="perfect">PERFECT CLEAR!!</div>' : `<div class="pct">${Math.floor(r.extraction * 100)}% extracted</div>`}</div>
          <div class="ov-ore">${q || '<span class="none">no ore… nyandeyanen</span>'}</div>
          <div class="ov-math" data-tip="formula">${fmt(r.oreValue)} ore × ${NYA.fmtMult(r.ref)} refinery${r.fullClear ? ` × <b class="pc">${NYA.fmtMult(r.clearMult)} perfect</b>` : ''}${r.glob > 1.0001 ? ` × ${NYA.fmtMult(r.glob)}` : ''} = <b class="gain">+${fmt(r.catnip)}</b> ${NIP}</div>
          ${extra.length ? `<div class="ov-extra">${extra.map(esc).join(' · ')}</div>` : ''}
          <div class="ov-crew">${crew}</div>
          <div class="ov-tora"><span class="npc" data-npc="tora"></span><div class="bubble">${esc(r.tora)}</div></div>
        </div>
        <div class="ov-prev"><div class="nt">NEXT TIME ON <b>NYAPOTISM!</b></div><div class="nl">${esc(r.preview)}</div>
          <div class="await"><button class="big" data-act="next">▶ NEXT EPISODE <small>[N]</small></button><div class="cd" data-live="awaitCd"></div></div></div>`;
      this.el.overlay.querySelectorAll('canvas.qshape').forEach(c => {
        const x = c.getContext('2d'); const qi = NYA.qInfo(+c.dataset.q);
        NYA.drawOreShape(x, qi.shape, 9, 9, 6.5, qi.color, '#1a1020');
      });
      this.paintNpcs(this.el.overlay);
      this.el.overlay.className = 'show stage-tally';
      if (r.fullClear) this.audio.sfx('stamp');
      if (r.catnip > 0) this.bumpCatnip();
    }
    updateOverlay(rdt) {
      const g = this.g, ov = this.el.overlay;
      if (!this.overlayFor) return;
      if (g.phase === 'shift') { ov.className = ''; this.overlayFor = null; return; }
      const hide = g.s.settings.hideAnims;
      let stage = 'tally';
      if (g.phase === 'packup' && g.packup) {
        const f = g.packup.t / g.packup.total;
        stage = hide ? 'mini' : f < 0.65 ? 'tally' : 'prev';
      } else if (g.phase === 'await') {
        stage = hide ? 'mini await' : 'prev await';
        const cd = ov.querySelector('[data-live="awaitCd"]');
        if (cd) cd.textContent = `auto-continues in ${Math.ceil(g.awaitT)}… (file Auto-Repeat with Pochi to skip)`;
      }
      const cls = 'show stage-' + stage.split(' ').join(' stage-');
      if (ov.className !== cls) ov.className = cls;
    }

    // ---------------------------------------------------------------- eyecatcher picture-in-picture
    // Plays on its own real-time clock (1.8 s per frame) so it is never rushed or cut off by
    // the episode flow. A new one never interrupts a playing one; rare ones wait their turn.
    queueEyecatch(id, ep) {
      if (!id || this.g.s.settings.hideAnims) return;
      const rare = (NYA.EYECATCHERS.find(e => e.id === id) || {}).rare;
      if (this.eyePlay) {
        if (rare || !this.eyePending) this.eyePending = { id, ep, at: performance.now() };
        return;
      }
      this.startEyecatch(id, ep);
    }
    startEyecatch(id, ep) {
      const crew = this.g.activeCrew();
      const L = crew.length ? crew[(ep || 0) % crew.length] : null;
      this.eyePlay = { id, t: 0, fr: -1, look: L ? { fur: L.fur, hair: L.hair, outfit: L.outfit, hat: true } : null };
      const el = document.getElementById('eyePip');
      el.className = 'show';
      el.onpointerdown = () => { this.eyePending = null; this.endEyecatch(); };
      this.g.markEyecatcher(id);
    }
    endEyecatch() {
      const el = document.getElementById('eyePip');
      if (el) { el.className = 'show out'; setTimeout(() => { if (!this.eyePlay) el.className = ''; }, 300); }
      this.eyePlay = null;
    }
    updateEyecatch(rdt) {
      const P = this.eyePlay;
      if (!P) {
        const q = this.eyePending;
        if (q && performance.now() - q.at < 30000 && !this.g.s.settings.hideAnims) { this.eyePending = null; this.startEyecatch(q.id, q.ep); }
        return;
      }
      P.t += rdt;
      const PER = 1.8;
      const fr = Math.floor(P.t / PER);
      if (fr >= 3) { this.endEyecatch(); return; }
      if (fr !== P.fr) { P.fr = fr; if (fr === 0) this.audio.sfx('eyecatch'); }
      const cv = document.querySelector('#eyePip canvas');
      if (cv) NYA.drawEyecatch(cv.getContext('2d'), cv.width, cv.height, P.id, fr, performance.now() / 1000, P.look);
    }

    // ---------------------------------------------------------------- frame updates
    frame(rdt) {
      const g = this.g, s = g.s;
      if (this.freeze > 0) this.freeze -= rdt;
      this.el.catnip.textContent = fmt(s.catnip);
      if (s.yarn > 0 || s.season > 1) { this.el.yarnBox.hidden = false; this.el.yarn.textContent = fmt(s.yarn); }
      if (s.milk > 0 || s.tierUnlocked[4]) { this.el.milkBox.hidden = false; this.el.milk.textContent = fmt(s.milk); } else this.el.milkBox.hidden = true;
      if (s.sushi > 0 || s.tierUnlocked[5]) { this.el.sushiBox.hidden = false; this.el.sushi.textContent = fmt(s.sushi); } else this.el.sushiBox.hidden = true;
      if (s.cheese > 0 || s.tierUnlocked[6]) { this.el.cheeseBox.hidden = false; this.el.cheese.textContent = fmt(s.cheese); } else this.el.cheeseBox.hidden = true;
      this.el.bank.textContent = NYA.fmtTime(s.bank);
      this.el.ff.classList.toggle('on', !!s.settings.ffOn && s.bank > 0);
      this.el.ff.querySelector('small').textContent = g.ffSpeed() + '×';
      this.el.pause.classList.toggle('on', !!this.opts.isPaused());
      // HUD
      const ep = g.episode;
      if (ep) {
        const left = ep.resLeft;
        const est = g.haulCatnip(ep); // after multipliers, before the Full-Clear Bonus
        const marks = ep.marks.filter(m => !m.drone).length;
        this.el.hud.innerHTML = `<span>⏱ ${NYA.fmtTime(ep.t)}</span><span>Ore tiles left <b>${left}</b></span><span class="haul" data-tip="haul">Haul ${NIP}<b>${fmt(est)}</b> <small>(${ep.haul.items} items)</small></span>${ep.def.quirk === 'milk' ? `<span>🥛 <b>${fmt(ep.haul.milk)}</b></span>` : ''}${ep.waterOn ? `<span>🍣 <b>${fmt(ep.haul.sushi)}</b></span>` : ''}${ep.miceOn ? `<span>🧀 <b>${fmt(ep.haul.cheese)}</b></span><span>🐭 <b>${ep.mice.length}</b></span><span data-tip="tool:turret">🎯 ${ep.turrets.length}/${ep.maxTurrets}</span>` : ''}<span class="lz">🔴 ${marks}/${g.laserMax()}</span><span data-tip="sight">👁 Sight <b>${ep.noticeRange}</b>${ep.darkness ? ` <small>(darkness −${ep.darkness})</small>` : ''}</span>${ep.catterall ? '<span class="catt">CATTERALL</span>' : ''}${ep.t < ep.tunaUntil ? '<span class="tuna">TUNA TIME!</span>' : ''}${g.s.research ? `<span>🔨 ${esc(NYA.UPG[g.s.research.id].name)} ${Math.round(100 * (1 - g.s.research.left / g.s.research.total))}%</span>` : ''}`;
      }
      this.updateTileInfo();
      this.updateCrewLive();
      this.updateActivesLive();
      this.updateOverlay(rdt);
      this.updateEyecatch(rdt);
      this.slowT -= rdt;
      if (this.slowT <= 0) { this.slowT = 0.25; this.slow(); }
      // warhead anim
      const wh = document.getElementById('warhead');
      if (wh) NYA.drawWarhead(wh, g.lvl('mewclear'), performance.now() / 1000);
    }
    slow() {
      this.contextTips();
      this.renderCrewRail();
      this.renderActives();
      this.renderPanel(false);
      this.renderTabs(false);
      this.updateLive();
      const s = this.g.s;
      const d = s.catnip - this.lastCatnip;
      this.lastCatnip = s.catnip;
      void d;
    }
    updateTileInfo() {
      const ep = this.g.episode, i = this.view.hover;
      let el = this.tileInfoEl;
      if (!el) { el = this.tileInfoEl = document.createElement('div'); el.id = 'tileinfo'; this.el.stage.appendChild(el); }
      if (!ep || i < 0 || this.g.phase !== 'shift') { if (el.style.display !== 'none') el.style.display = 'none'; return; }
      const M = ep.mine, T = NYA.T;
      let html;
      if (!M.revealed[i]) html = '<b>Fog</b> — unknown. Laser it to make the crew dig toward it.';
      else {
        const ty = M.type[i];
        const hp = M.maxHp[i] ? ` · HP <b>${fmt(Math.max(0, M.hp[i]))}</b>/${fmt(M.maxHp[i])}` : '';
        if (ty === T.ORE) {
          const left = M.dens[i] - M.dropped[i], q = M.q[i] + (M.glow[i] ? 2 : 0), qi = NYA.qInfo(q);
          if (M.sushi[i]) html = `<b>Wild Nigiri</b> · <b>${left}</b> sushi · grows next to flooded chambers. Break it carefully!${hp}`;
          else html = `<b>Catnip Ore</b>${i === M.motherlode ? ' <b style="color:#ff7eb6">MEOWTHERLODE</b>' : ''}${M.glow[i] ? ' <b style="color:#b4ff78">GLOWING</b>' : ''} · density <b>${left}</b> · quality <b style="color:${qi.color}">${q} ${qi.label}</b> · worth ${NIP}${fmt(left * ep.itemValue({ q, d: M.dens[i] }) * this.g.nipMult(ep))}${hp}`;
        } else if (ty === T.BOX) html = `<b>Schrödinger’s Box</b> — it hums.${hp}`;
        else if (ty === T.NEST) html = `<b>Mouse Nest</b> — sends out mice once it’s uncovered. Smash it for a Cheese Wheel (${NYA.CHEESE_WHEEL} cheese). Counts toward a perfect clear.${hp}`;
        else if (ty === T.OPEN) {
          const bits = [];
          if (M.tangle[i]) bits.push('<b>Tangle</b> — walkers ×' + NYA.TANGLE_SLOW + ' until cut through');
          if (M.rubble[i]) bits.push('<b>Rubble</b> — walkers ×' + NYA.RUBBLE_SLOW + ' until trampled flat (' + M.rubble[i] + ' more)');
          if (M.mud[i]) bits.push('<b>Mud</b> — walkers ×' + NYA.MUD_SLOW + '. Pace pushes through');
          if (M.water[i]) bits.push('<b>Flooded</b> — wet catgirls walk at ' + Math.round(100 * (ep.cfg.wetPace || NYA.WET_PACE)) + '% speed and tire ×' + (ep.cfg.wetDrain || NYA.WET_DRAIN) + ' as fast for a while');
          html = bits.length ? bits.join(' · ') : '<b>Open floor</b>';
        }
        else html = `<b>${NYA.TILE_NAME[ty]}</b>${ty === T.GROOVE ? ' — breaks in a chain' : ty === T.BEDROCK ? ' — indestructible (mostly)' : ''}${hp}`;
        if (M.forbid[i]) html += ' · <b style="color:#8fd0ff">FORBIDDEN</b>';
      }
      if (ep.miceOn) {
        const tu = ep.turrets.find(k => k.idx === i);
        if (tu) html = `<b>Hairball Cannon</b>${tu.by === 'chan' ? ' (placed by Turret-chan)' : ''} · range ${NYA.TURRET_RANGE} · ${this.tool === 'turret' ? 'click to pick it up' : 'Turret tool to move it'}`;
        const mo = ep.mice.find(k => k.tile === i);
        if (mo && M.revealed[i]) { const D = NYA.MICE[mo.kind]; html = `<b>${D.name}</b> — ${esc(D.desc)} · HP <b>${fmt(Math.max(0, mo.hp))}</b>/${fmt(mo.maxHp)}${mo.item ? ' · <b style="color:#ffd96a">carrying your ore!</b>' : ''}`; }
      }
      if (el.innerHTML !== html) el.innerHTML = html;
      el.style.display = '';
    }
    contextTips() {
      const g = this.g, s = g.s;
      const done = s.tipsDone || (s.tipsDone = {});
      let tip = null;
      if (g.phase === 'shift' && g.episode && !s.life.marks && !g.episode.st.marks && g.episode.t > 3 && !done.laser) tip = ['laser', 'Click a catnip tile (▲ ■ ◆) to laser-point it. Your crew will drop everything and rush over.', 'Drag across tiles to mark several. Right-click to unmark.'];
      else if (s.catnip >= 10 && !Object.keys(s.upg).length && s.buildings.lab && !done.shop) tip = ['shop', 'You can afford research! Open the R&D Lab tab and grab a Sharper Pickaxe.', 'Hover any card for the exact numbers.'];
      else if (s.buildings.barracks && s.hires === 0 && s.catnip >= g.hireCost() + 15 && !done.hire) tip = ['hire', 'The Barracks are open — buy Bunk Beds, then hire a second catgirl.', 'Twice the crew, twice the loafing.'];
      else if (g.activeUnlocked('blunt') && !s.life.blunts && !done.blunt && g.phase === 'shift' && g.episode && g.episode.miners.some(m => m.state === 'flop' || (m.state === 'out' && m.flopped))) tip = ['blunt', 'Someone flopped! Press 1 (Catnip Blunt), then click her to get her back up.', 'Each extra dose on the same catgirl is 20% weaker.'];
      else if (s.buildings.pochi && !s.orders.length && !done.pochi) tip = ['pochi', 'The Purrmit Office is open. File an Auto-Repeat order with Pochi so episodes roll straight on.', 'Standing orders cost Requisition Points.'];
      let el = document.getElementById('tip-ctx');
      if (!tip) { if (el) el.remove(); return; }
      if (!el) {
        el = document.createElement('div'); el.id = 'tip-ctx';
        el.addEventListener('pointerdown', () => { (s.tipsDone || (s.tipsDone = {}))[el.dataset.k] = 1; el.remove(); });
        this.el.stage.appendChild(el);
      }
      if (el.dataset.k !== tip[0]) { el.dataset.k = tip[0]; el.innerHTML = `💡 ${esc(tip[1])}<small>${esc(tip[2])} (click to dismiss)</small>`; }
    }
    bumpCatnip() {
      const b = this.el.catnip.parentElement;
      b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    }
    updateLive() {
      const g = this.g, s = g.s;
      const p = this.el.panel;
      const r = p.querySelectorAll('[data-live="research"]');
      if (s.research) r.forEach(el => el.style.width = (100 * (1 - s.research.left / s.research.total)).toFixed(1) + '%');
      const yn = p.querySelector('[data-live="yarnNow"]');
      if (yn) { const y = g.yarnPreview(); yn.textContent = fmt(y); const yr = p.querySelector('[data-live="yarnRate"]'); if (yr) yr.textContent = (y / Math.max(1, s.seasonTime / 60)).toFixed(2); }
      const tl = p.querySelector('[data-live="tanLeft"]');
      if (tl && s.tanuki.offer) tl.textContent = NYA.fmtTime(Math.max(0, s.tanuki.offer.until - s.simTime));
      const tn = p.querySelector('[data-live="tanNext"]');
      if (tn) tn.textContent = NYA.fmtTime(Math.max(0, s.tanuki.nextAt - s.simTime));
      const ob = p.querySelector('[data-live="ovaBar"]');
      if (ob && s.ova) {
        const goal = g.ovaGoal(), cur = Math.min(goal.need, goal.cur(g));
        ob.style.width = (goal.nip ? Math.min(100, 100 * Math.log10(1 + cur) / Math.log10(1 + goal.need)) : 100 * cur / goal.need).toFixed(1) + '%';
        const op = p.querySelector('[data-live="ovaProg"]'); if (op) op.textContent = goal.nip ? fmt(cur) : cur;
      }
      const bp = p.querySelector('[data-live="blendPot"]');
      if (bp && s.blend) { bp.textContent = fmt(s.blend.pot); const bl = p.querySelector('[data-live="blendLeft"]'); if (bl) bl.textContent = NYA.fmtTime(s.blend.until - s.simTime); }
    }

    // ---------------------------------------------------------------- tabs & panel
    renderTabs() {
      const s = this.g.s;
      const order = ['office', 'refinery', 'barracks', 'lab', 'pochi', 'tanuki', 'loom'];
      const html = order.filter(b => s.buildings[b]).map(b => {
        const B = NYA.BUILDINGS[b];
        return `<button class="tab ${this.tab === b ? 'on' : ''}" data-act="tab:${b}" title="${esc(B.name)}">${B.icon} ${esc(B.short || B.name)}${this.newTabs[b] ? '<i class="newdot">NEW</i>' : ''}</button>`;
      }).join('');
      if (html !== this.tabsHtml) { this.el.tabs.innerHTML = html; this.tabsHtml = html; }
    }
    panelSignature() {
      const g = this.g, s = g.s, tab = this.tab;
      const affOf = bld => NYA.UPGRADES.filter(u => u.bld === bld && s.buildings[u.bld] && g.upgVisible(u)).map(u => { const c = g.canBuy(u.id); return u.id + (c.ok ? 1 : 0) + (c.busy ? 'b' : '') + g.lvl(u.id); }).join(',');
      const parts = [tab, s.season, Object.keys(s.buildings).join(), s.research ? s.research.id : ''];
      if (tab === 'office') parts.push(s.selectedTier, Object.keys(s.tierUnlocked).join(), s.skein.have, g.yarnPreview() >= 1, Object.keys(s.faxes).length, Object.keys(s.gallery).length, s.seasonLog.length, Math.floor(s.skein.pity * 1000), s.life.episodes);
      else if (tab === 'refinery') parts.push(affOf('refinery'), Math.floor(Math.log10(1 + s.milk) * 4), Math.floor(Math.log10(1 + s.sushi) * 4), Math.floor(Math.log10(1 + s.cheese) * 4), s.blend ? (s.blend.active ? 1 : 0) + ':' + (s.blend.result ? 1 : 0) : '', g.blendAvailable(), s.blend && !s.blend.active ? Math.floor(((s.blend.readyAt || 0) - s.simTime) / 60) : '', Math.round(g.catnipMult() * 100));
      else if (tab === 'barracks') parts.push(affOf('barracks'), s.active.join(), s.reserve.join(), s.catnip >= g.hireCost(), g.levelCap(), g.lvl('resume'),
        s.board.apps.map(c => c ? c.id : 0).join(), s.board.turn, s.catnip >= g.adCost(),
        s.crew.map(c => c.level + ':' + c.traits.length + ':' + Math.floor(c.xp / Math.max(1, NYA.xpNeed(c.level)) * 10)).join());
      else if (tab === 'lab') parts.push(affOf('lab'), Math.floor(Math.log10(1 + s.cheese) * 4));
      else if (tab === 'pochi') parts.push(affOf('pochi'), s.orders.join(), g.runningOrders().join(), NYA.ORDER_ORDER.map(id => g.orderAvailable(id) ? 1 : 0).join(''));
      else if (tab === 'loom') parts.push(Math.floor(s.yarn), JSON.stringify(s.loom));
      else if (tab === 'tanuki') parts.push(JSON.stringify(s.tanuki.offer), JSON.stringify(s.tanuki.rain), s.tanuki.queue.length, s.catnip >= (s.tanuki.offer ? s.tanuki.offer.cost : Infinity), s.catnip >= (s.tanuki.rain ? s.tanuki.rain.cost : Infinity));
      if (tab === 'office') parts.push(s.tanuki ? s.tanuki.queue.length + ':' + !!s.pendingEvent : '', JSON.stringify(s.ova), JSON.stringify(s.ovaDone), g.ovaShelfOpen());
      return parts.join('|');
    }
    renderPanel(force) {
      const sig = this.panelSignature();
      if (!force && sig === this.panelSig) return;
      this.panelSig = sig;
      const fn = NYA.PANELS[this.tab] || NYA.PANELS.office;
      const p = this.el.panel;
      const st = p.scrollTop;
      p.innerHTML = fn(this.g);
      this.paintNpcs(p);
      p.querySelectorAll('[data-por]').forEach(el => {
        const cg = this.g.crewById(+el.dataset.por);
        if (cg) el.appendChild(NYA.portrait('cg' + cg.id, { fur: cg.fur, hair: cg.hair, outfit: cg.outfit, hat: false }, 56));
      });
      p.querySelectorAll('[data-apor]').forEach(el => {
        const cg = this.g.s.board.apps[+el.dataset.apor];
        if (cg) el.appendChild(NYA.portrait('cg' + cg.id, { fur: cg.fur, hair: cg.hair, outfit: cg.outfit, hat: false }, 56));
      });
      p.scrollTop = st; // after portraits: before them the panel is shorter and the scroll gets clamped
    }
    paintNpcs(root) {
      root.querySelectorAll('.npc[data-npc]').forEach(el => {
        if (el.firstChild) return;
        el.appendChild(NYA.portrait('npc-' + el.dataset.npc, NYA.npcLook(el.dataset.npc), el.classList.contains('small') ? 36 : 64));
      });
    }

    // ---------------------------------------------------------------- crew rail
    renderCrewRail() {
      const g = this.g, s = g.s;
      const sig = s.active.join() + '|' + s.crew.map(c => c.id + ':' + c.level + ':' + c.traits.length).join() + '|' + (this.targeting || '');
      if (sig === this.crewSig) return;
      this.crewSig = sig;
      const html = g.activeCrew().map(cg => `
        <div class="rail-cg" data-act="crewpick:${cg.id}" data-rail="${cg.id}">
          <div class="rp" data-rpor="${cg.id}"></div>
          <div class="ri">
            <div class="rn"><span class="rnn">${esc(cg.name)} <span class="rl">Lv ${cg.level}</span></span><span class="bag" title="Bag"></span></div>
            <div class="sbar"><div class="sf"></div><span class="st"></span></div>
            <div class="rs"><span class="state"></span></div>
          </div>
        </div>`).join('') +
        (s.reserve.length ? `<div class="rail-res">+${s.reserve.length} in reserve</div>` : '') +
        (s.active.length < g.crewCap() ? `<div class="rail-empty" data-act="tab:barracks">+ empty slot — hire!</div>` : '');
      this.el.crew.innerHTML = html;
      this.el.crew.querySelectorAll('[data-rpor]').forEach(el => {
        const cg = g.crewById(+el.dataset.rpor);
        el.appendChild(NYA.portrait('cg' + cg.id, { fur: cg.fur, hair: cg.hair, outfit: cg.outfit, hat: true }, 40));
      });
      this.railEls = {};
      this.el.crew.querySelectorAll('[data-rail]').forEach(el => {
        this.railEls[el.dataset.rail] = { el, sf: el.querySelector('.sf'), st: el.querySelector('.st'), state: el.querySelector('.state'), bag: el.querySelector('.bag') };
      });
    }
    updateCrewLive() {
      const ep = this.g.episode;
      if (!ep || !this.railEls) return;
      const names = { idle: 'thinking', wait: 'waiting', walk: 'walking', mine: 'mining', return: 'hauling', drop: 'dropping off', flop: 'flopped!', out: 'clocked out', nap: 'power nap', smoke: 'puffing', distract: '', rescue: 'RESCUE CLAW', hotbox: 'to the hotbox!', pbuild: 'building a pumpjack', pipe: 'laying pipe', pump: 'pumping milk 🥛' };
      const dk = { butterfly: 'chasing a butterfly 🦋', groom: 'grooming', loaf: 'is a loaf 🍞', pebble: 'batting a pebble', box: 'sitting in a nook 📦' };
      for (const m of ep.miners) {
        const r = this.railEls[m.id];
        if (!r) continue;
        const f = NYA.clamp(m.stamina / m.maxSt, 0, 1);
        r.sf.style.width = (f * 100).toFixed(1) + '%';
        r.sf.className = 'sf ' + (f > 0.5 ? 'hi' : f > 0.2 ? 'mid' : 'lo');
        r.st.textContent = Math.ceil(Math.max(0, m.stamina)) + '/' + Math.round(m.maxSt);
        const txt = m.state === 'distract' ? dk[m.dkind] || 'distracted' : m.state === 'pump' && m.helping ? 'helping pump 🥛' : m.helping && m.state === 'walk' ? 'off to help pump' : m.state === 'out' ? (m.flopped ? 'zzz…' : ep.fullClear ? 'celebrating!' : 'clocked out') : names[m.state] || m.state
          + ((m.cg.treatUntil || 0) > this.g.s.simTime ? ' · 🍬2× XP ' + Math.ceil(m.cg.treatUntil - this.g.s.simTime) + 's' : '');
        if (r.state.textContent !== txt) r.state.textContent = txt;
        const bag = `🎒<b class="${m.bag.length >= m.s.carry ? 'full' : ''}">${m.bag.length}</b>/${m.s.carry}`;
        if (r.bagHtml !== bag) { r.bag.innerHTML = bag; r.bagHtml = bag; }
        const ttl = m.name + ' — ' + txt;
        if (r.el.title !== ttl) r.el.title = ttl;
        r.el.classList.toggle('flopped', m.state === 'flop' || (m.state === 'out' && m.flopped));
      }
    }

    // ---------------------------------------------------------------- tools & actives
    renderTools() {
      const g = this.g;
      const hasSpray = g.lvl('spray') > 0;
      const miceOn = !!(g.episode && g.episode.miceOn);
      if (this.tool === 'turret' && !miceOn) { this.tool = 'laser'; this.view.toolMode = this.targeting || 'laser'; }
      this.el.tools.innerHTML = `
        <button class="tool ${this.tool === 'laser' && !this.targeting ? 'on' : ''}" data-act="tool:laser" data-tip="tool:laser">🔴<span>Laser</span><kbd>L</kbd></button>
        ${hasSpray ? `<button class="tool ${this.tool === 'spray' && !this.targeting ? 'on' : ''}" data-act="tool:spray" data-tip="tool:spray">💦<span>Spray</span><kbd>S</kbd></button>` : ''}
        ${miceOn ? `<button class="tool ${this.tool === 'turret' && !this.targeting ? 'on' : ''}" data-act="tool:turret" data-tip="tool:turret">🎯<span>Turret</span><kbd>T</kbd></button>` : ''}
        <button class="tool" data-act="whistle" data-tip="tool:whistle">📣<span>Whistle</span><kbd>W</kbd></button>`;
      this.activesSig = '';
      this.renderActives();
    }
    renderActives() {
      const g = this.g;
      const ids = NYA.ACTIVE_ORDER.filter(id => g.activeUnlocked(id));
      const sig = ids.join() + '|' + (this.targeting || '') + '|' + g.runningOrders().join();
      if (sig === this.activesSig) return;
      this.activesSig = sig;
      if (!ids.length) { this.el.actives.innerHTML = `<div class="noact">Actives from Doc Boom's lab will appear here.</div>`; this.actEls = {}; return; }
      this.el.actives.innerHTML = ids.map(id => {
        const a = NYA.ACTIVES[id];
        const auto = g.orderRunning('cast_' + id);
        return `<button class="act ${this.targeting === id ? 'on' : ''}" data-act="active:${id}" data-actid="${id}" data-tip="active:${id}">
          <div class="ring"></div><div class="ic">${a.icon}</div><kbd>${a.key}</kbd><b class="ch"></b>${auto ? '<i class="auto">AUTO</i>' : ''}<span class="an">${esc(a.name)}</span></button>`;
      }).join('');
      this.actEls = {};
      this.el.actives.querySelectorAll('[data-actid]').forEach(el => { this.actEls[el.dataset.actid] = { el, ring: el.querySelector('.ring'), ch: el.querySelector('.ch') }; });
    }
    updateActivesLive() {
      const g = this.g;
      if (!this.actEls) return;
      for (const id in this.actEls) {
        const r = this.actEls[id], a = g.s.act[id];
        if (!a) continue;
        const mx = g.activeMaxCharges(id);
        const p = a.ch >= mx ? 1 : 1 - Math.max(0, a.cd) / NYA.ACTIVES[id].cd;
        r.ring.style.setProperty('--p', (p * 360).toFixed(0) + 'deg');
        const ready = g.canUseActive(id);
        r.el.classList.toggle('ready', ready);
        r.el.classList.toggle('cool', a.ch <= 0);
        const txt = mx > 1 ? String(a.ch) : (a.ch <= 0 ? NYA.fmtTime(a.cd) : '');
        if (r.ch.textContent !== txt) r.ch.textContent = txt;
      }
    }

    // ---------------------------------------------------------------- notifications
    toast(html, kind) {
      const el = document.createElement('div');
      el.className = 'toast ' + (kind || '');
      el.innerHTML = (kind && ['tora', 'doc', 'paws', 'pochi', 'tanuki'].indexOf(kind) >= 0 ? `<span class="npc small" data-npc="${kind}"></span>` : '') + `<div>${html}</div>`;
      this.paintNpcs(el);
      this.el.toasts.appendChild(el);
      while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5200);
    }
    hint(text) {
      let h = document.getElementById('hint');
      if (!h) { h = document.createElement('div'); h.id = 'hint'; this.el.stage.appendChild(h); }
      h.textContent = text; h.style.display = text ? '' : 'none';
    }
    showFax(d) {
      const el = document.createElement('div');
      el.className = 'fax' + (d.story ? ' story' : '');
      const bonus = d.bonus ? Object.entries(d.bonus).map(([k, v]) => `+${Math.round(v * 100)}% ${k}`).join(', ') : '';
      el.innerHTML = `<div class="fax-head">${d.story ? 'FAX — FROM: AUNTIE' : 'FAX FROM AUNTIE · ' + esc(d.name).toUpperCase()}</div><div class="fax-body">${esc(d.text)}</div>${bonus ? `<div class="fax-bonus">${bonus}</div>` : ''}<div class="fax-sig">— K.N. ♡</div>`;
      el.addEventListener('pointerdown', () => el.remove());
      this.el.faxTray.appendChild(el);
      while (this.el.faxTray.children.length > 3) this.el.faxTray.firstChild.remove();
      this.audio.sfx('fax');
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, d.story ? 9000 : 6500);
    }
    showNovel(d) {
      if (d.kind === 'tip') return;
      const el = document.createElement('div');
      el.className = 'novel k-' + d.kind;
      el.innerHTML = `<b>★ NEW! ★</b> ${esc(d.label)}`;
      this.el.novel.appendChild(el);
      while (this.el.novel.children.length > 3) this.el.novel.firstChild.remove();
      this.audio.sfx('novel');
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 4200);
      const map = { building: d.key.split(':')[1], active: 'lab', mine: 'office', tool: 'lab', montage: 'barracks', mewclear: 'lab', refinery: 'refinery', loom: 'loom', prestige: 'office', research: 'lab' };
      const tab = map[d.kind];
      if (tab && tab !== this.tab) { this.newTabs[tab] = 1; this.renderTabs(); }
    }
    nextTrait() {
      if (this.traitShowing || !this.traitQueue.length) return;
      const d = this.traitQueue.shift();
      this.traitShowing = true;
      const t = NYA.TRAIT[d.tid], R = NYA.RARITY[t.rarity];
      const mine = Object.values(NYA.TIERS).find(x => x.key === d.mineKey);
      const el = this.el.traitPop;
      el.innerHTML = `<div class="tcard r-${t.rarity} k-${t.kind}" style="--rc:${R.color}">
        <div class="tc-inner"><div class="tc-back">?</div>
        <div class="tc-front"><div class="tc-top">TRAIT GET! <small>Lv ${d.level || d.cg.level}</small></div><div class="tc-por"></div>
          <div class="tc-who">${esc(d.cg.name)}</div><div class="tc-name">${esc(t.name)}</div>
          <div class="tc-rar">${R.name} · ${t.kind === 'pos' ? 'Positive' : t.kind === 'neg' ? 'Negative' : 'Mixed'}</div>
          <div class="tc-desc">${esc(t.desc)}</div><div class="tc-flav">${esc(t.flavor)}</div>
          ${mine ? `<div class="tc-mine">rolled in ${esc(mine.name)}</div>` : ''}</div></div></div>`;
      el.querySelector('.tc-por').appendChild(NYA.portrait('cg' + d.cg.id, { fur: d.cg.fur, hair: d.cg.hair, outfit: d.cg.outfit, hat: true }, 64));
      el.className = 'show';
      this.audio.sfx(t.rarity === 'legendary' ? 'legendary' : 'trait');
      const close = () => { el.className = ''; this.traitShowing = false; setTimeout(() => this.nextTrait(), 250); };
      el.onpointerdown = close;
      setTimeout(() => { if (this.traitShowing) close(); }, t.rarity === 'legendary' ? 5000 : 3400);
    }
    banner(k, d) {
      const B = {
        motherlode: ['THE MEOWTHERLODE', 'Tora (off-screen): “NYANDEYANEN!?”', 'pink'],
        fullclear: ['FULL CLEAR!', 'every last leaf', 'gold'],
        skein: ['THE SKEIN', 'a thread through time hums in her paws…', 'mono'],
        tuna: ['TUNA TIME!', '+50% Haste', 'blue'],
        catterall: ['CATTERALL', '…', 'dark'],
        mewclear: ['☢ THE MEWCLEAR OPTION ☢', 'everyone is fine. everyone has an afro now.', 'gold'],
        allloaf: ['LOAF OF THE MONTH', 'the entire crew is bread', 'pink'],
        blend: ['×' + (d && d.f), 'Tora’s Special Blend pays ' + (d ? fmt(d.payout) : ''), d && d.f >= 2 ? 'gold' : 'blue'],
        montage: ['TRAINING MONTAGE!', d ? 'Level cap → ' + d : '', 'gold'],
        critfold: [d ? NYA.critRankName(d.fold).toUpperCase() + '!' : '', 'crit focus: −30% crit chance, ×' + NYA.CRIT_FOLD_POWER + ' power', 'gold'],
        technique: [d ? NYA.techName(d.fold).toUpperCase() + '!' : '', 'new swing technique — half the swings, ×' + (2 * NYA.FOLD_BONUS).toFixed(1) + ' power each', 'blue'],
      }[k];
      if (!B) return;
      const el = this.el.banner;
      el.innerHTML = `<div class="bn bn-${B[2]}"><div class="bt">${esc(B[0])}</div><div class="bs">${esc(B[1])}</div></div>`;
      el.className = 'show';
      clearTimeout(this.bannerT);
      this.bannerT = setTimeout(() => { el.className = ''; }, k === 'skein' ? 3200 : 2200);
    }
    montage(level) {
      this.banner('montage', this.g.levelCap());
      this.audio.sfx('montage');
      const el = document.createElement('div');
      el.className = 'montage';
      const crew = this.g.activeCrew().slice(0, 6);
      el.innerHTML = '<div class="mt-row"></div><div class="mt-cap">♪ push-ups · sit-ups · tunnel sprints · emotional growth ♪</div>';
      const row = el.querySelector('.mt-row');
      crew.forEach((cg, k) => {
        const c = document.createElement('canvas'); c.width = 80; c.height = 90; c.style.animationDelay = (k * 0.12) + 's';
        NYA.drawCatgirl(c.getContext('2d'), 40, 86, 80, { fur: cg.fur, hair: cg.hair, outfit: cg.outfit, hat: true }, { anim: 'cheer', t: k, eyes: 'closed', mouth: 'open' });
        row.appendChild(c);
      });
      this.el.stage.appendChild(el);
      setTimeout(() => el.remove(), 3400);
    }
    seasonCard(d) {
      const verse = OPENING[(d.season - 2) % OPENING.length];
      this.openModal(`<div class="season-card"><div class="sc-top">NEW TIMELINE</div><div class="sc-big">SEASON ${d.season}</div>
        <div class="sc-gain">+${fmt(d.gain)} 🧶 yarn</div>
        <div class="sc-verse"><div class="sc-vh">♪ Opening theme — verse ${d.season - 1} ♪</div>${verse.map(l => `<div>${esc(l)}</div>`).join('')}<div class="sc-ch">NYA-PO-TIS-M! Dig, dig, dig!</div></div>
        <p>Spend your yarn at the <b>Quantum Loom</b>.</p>
        <button class="big" data-act="close">Roll the opening!</button></div>`);
      this.tab = 'loom'; this.renderTabs(); this.renderPanel(true);
      this.audio.sfx('motherlode');
    }

    // ---------------------------------------------------------------- modals
    openModal(html) { this.el.modal.innerHTML = `<div class="mbox">${html}</div>`; this.el.modal.hidden = false; }
    closeModal() { this.el.modal.hidden = true; this.el.modal.innerHTML = ''; if (this.opts.onModalClose) this.opts.onModalClose(); }
    confirmOva(id) {
      const g = this.g, o = NYA.OVA[id], rel = g.ovaPerk(id), y = g.yarnPreview();
      if (!o) return;
      this.openModal(`<h2>${o.icon} OVA: ${esc(o.name)}</h2><p><b>${NYA.OVA_RELEASES[rel]} release.</b> ${esc(o.limiter)}</p>
        <p>Goal: <b>${esc(o.goals[rel].text)}</b>. Clear it for <b>${esc(o.perk)} ${['I', 'II', 'III'][rel]}</b> (${esc(o.perkText(rel + 1))}).</p>
        <p>This unravels the timeline as usual (you gain <b>🧶 ${fmt(y)} yarn</b> from this run), but the next run is the OVA. OVAs pay no yarn. When you hit the goal it ends and a fresh regular run begins. You can abandon it any time from the Office.</p>
        <div class="row"><button class="big danger" id="doOva">📼 Play the tape</button><button class="big ghost" data-act="close">Not yet</button></div>`);
      document.getElementById('doOva').onclick = () => { this.closeModal(); this.audio.sfx('skein'); g.startOva(id); };
    }
    confirmAbandonOva() {
      const g = this.g;
      this.openModal(`<h2>Abandon the OVA?</h2><p>This run ends with no yarn and no perk, and a fresh regular run starts. You can play the tape again later.</p>
        <div class="row"><button class="big danger" id="doAbandon">⏏ Eject the tape</button><button class="big ghost" data-act="close">Keep going</button></div>`);
      document.getElementById('doAbandon').onclick = () => { this.closeModal(); g.abandonOva(); };
    }
    ovaStartCard(d) {
      const o = NYA.OVA[d.ova.id], goal = o.goals[d.ova.rel];
      this.openModal(`<div class="season-card"><div class="sc-top">ORIGINAL VIDEO ANIMATION</div><div class="sc-big">${o.icon} ${esc(o.name)}</div>
        <div class="sc-gain">${NYA.OVA_RELEASES[d.ova.rel]} release${d.gain ? ` · +${fmt(d.gain)} 🧶 yarn banked` : ''}</div>
        <div class="sc-verse"><div class="sc-vh">Special rules</div>${esc(o.limiter)}<div class="sc-ch">Goal: ${esc(goal.text)}</div></div>
        <button class="big" data-act="close">Press play ▶</button></div>`);
      this.audio.sfx('motherlode');
    }
    ovaClearCard(d) {
      const o = NYA.OVA[d.id], L = d.rel + 1;
      this.openModal(`<div class="season-card"><div class="sc-top">OVA CLEAR!!</div><div class="sc-big">${o.icon} ${esc(o.name)}</div>
        <div class="sc-gain">${NYA.OVA_RELEASES[d.rel]} release · ${esc(o.perk)} ${['I', 'II', 'III'][d.rel]}</div>
        <div class="sc-verse"><div class="sc-vh">Permanent perk</div>${esc(o.perkText(L))}${L === 1 && NYA.OVAS[o.index + 1] ? `<div class="sc-ch">New tape on the shelf: ${esc(NYA.OVAS[o.index + 1].name)}</div>` : ''}</div>
        <p>A fresh regular run starts now.</p>
        <button class="big" data-act="close">Back to the show ▶</button></div>`);
      this.audio.sfx('fullclear');
    }
    confirmUnravel() {
      const g = this.g;
      const y = g.yarnPreview();
      this.openModal(`<h2>Unravel the Timeline?</h2>
        <p>You'll gain <b>🧶 ${fmt(y)} yarn</b>.</p>
        <p>Resets: catnip, research, refinery, mine unlocks and your roster${g.anchorSlots() ? ` (except ${g.anchorSlots()} anchored catgirl${g.anchorSlots() > 1 ? 's' : ''})` : ''}.<br>Keeps: yarn, Loom upgrades, faxes, lifetime stats, standing orders.</p>
        <div class="row"><button class="big danger" id="doUnravel">🧶 Pull the thread</button><button class="big ghost" data-act="close">Not yet</button></div>`);
      document.getElementById('doUnravel').onclick = () => { this.closeModal(); this.audio.sfx('skein'); g.unravel(); };
    }
    showEyecatchModal(id) {
      this.openModal(`<h2>${esc(NYA.EYECATCHERS.find(e => e.id === id).name)}</h2><canvas id="galCv" width="640" height="360" style="width:100%;border-radius:12px"></canvas><div class="row"><button class="big" data-act="close">Close</button></div>`);
      const cv = document.getElementById('galCv');
      const look = NYA.randEyeLook(); // one catgirl for the whole replay, not a new one per frame
      let fr = 0;
      const tick = () => {
        if (!cv.isConnected) return;
        NYA.drawEyecatch(cv.getContext('2d'), 640, 360, id, fr % 3, performance.now() / 1000, look);
        fr++;
        setTimeout(tick, 900);
      };
      tick();
    }
    openSettings() {
      const s = this.g.s.settings;
      const tog = (k, label) => `<label class="tog"><input type="checkbox" ${s[k] ? 'checked' : ''} data-set="${k}"> ${label}</label>`;
      this.openModal(`<h2>Settings</h2>
        <div class="setgrid">
          ${['music', 'sfx'].map(kind => `<div class="sndrow"><span class="sndname">${kind === 'music' ? '🎵 Music' : '🔊 Sound FX'}</span>
            <div class="seg">${['on', 'unfocused', 'off'].map(m => `<button class="${(s[kind + 'Mode'] || 'on') === m ? 'on' : ''}" data-act="sndmode:${kind}.${m}">${SND_LABEL[m]}</button>`).join('')}</div>
            <input type="range" min="0" max="1" step="0.05" value="${s[kind]}" data-vol="${kind}" title="Volume"></div>`).join('')}
          ${tog('nya', 'Soft “nya” per swing (will drive some people up the wall)')}
          ${tog('shake', 'Screen shake')}${tog('flashes', 'Flashes')}${tog('showDQ', 'Show catnip value on ore')}
          ${tog('hideAnims', 'Hide pack-up animations (time cost is simulated either way)')}${tog('sci', 'Scientific notation')}${tog('vhs', 'VHS mode (scanlines)')}${tog('bgRun', 'Keep mining in background tabs (off: hidden time becomes Banked Time at ' + Math.round(this.g.bankEff() * 100) + '%)')}
        </div>
        <h3>Save</h3>
        <div class="row"><button data-act="export">Export save</button><button data-act="import">Import save</button><button class="danger" data-act="reset">Hard reset</button>${this.opts.devTools ? '<button id="devSavesBtn">🧪 Dev saves</button>' : ''}</div>
        <textarea id="saveText" rows="4" placeholder="Your save string appears here / paste one to import"></textarea>
        <div class="row"><button class="big" data-act="close">Done</button></div>`);
      this.el.modal.querySelectorAll('[data-set]').forEach(inp => inp.addEventListener('change', () => { s[inp.dataset.set] = inp.checked; this.applySettings(); }));
      this.el.modal.querySelectorAll('[data-vol]').forEach(inp => inp.addEventListener('input', () => { s[inp.dataset.vol] = +inp.value; this.audio.applyVolumes(); }));
      const dv = document.getElementById('devSavesBtn');
      if (dv) dv.onclick = () => NYA.openDevSaves(this);
    }
    applySettings() {
      const s = this.g.s.settings;
      NYA.settingsRef.sci = !!s.sci;
      document.body.classList.toggle('vhs', !!s.vhs);
      this.renderPanel(true);
    }
    doExport() {
      const ta = document.getElementById('saveText');
      ta.value = btoa(unescape(encodeURIComponent(this.g.serialize())));
      ta.select();
      try { navigator.clipboard.writeText(ta.value); this.toast('Save copied to clipboard.'); } catch (e) { /* ignore */ }
    }
    doImport() {
      const ta = document.getElementById('saveText');
      try {
        const json = decodeURIComponent(escape(atob(ta.value.trim())));
        JSON.parse(json);
        this.opts.importSave(json);
      } catch (e) { this.toast('That doesn’t look like a NYAPOTISM save.', 'warn'); }
    }
    doReset(el) {
      if (el.dataset.c !== '2') { el.dataset.c = el.dataset.c === '1' ? '2' : '1'; el.textContent = el.dataset.c === '1' ? 'Really?' : 'REALLY really?'; return; }
      this.opts.hardReset();
    }
    openHelp() {
      this.openModal(`<h2>How to Foreman</h2>
        <ul class="help">
          <li><b>Your crew mines on their own.</b> They pick targets with a short attention span: each compares only <i>Focus</i> random tiles.</li>
          <li><b>Laser pointer</b> (click / drag): marked tiles become irresistible. Fresh marks give <b>Zoomies</b> (+50% speed). Mark fog to make them dig toward it. Right-click removes.</li>
          <li><b>Stamina</b> runs out → she flops and waddles home. The episode ends when everyone clocks out, or when every ore tile is mined (<b>PERFECT CLEAR</b> ×bonus).</li>
          <li>Ore: <b>shape & color = quality</b> (▲ ■ ◆ ★ ♥), stacked pieces/number = <b>density</b> (more items, more swings).</li>
          <li>Spend catnip in the HQ panel. Hover anything for the real formula.</li>
          <li>Hotkeys: <kbd>1</kbd>–<kbd>9</kbd> actives · <kbd>L</kbd> laser · <kbd>S</kbd> spray · <kbd>W</kbd> whistle · <kbd>Space</kbd> pause · <kbd>F</kbd> fast-forward · <kbd>N</kbd> next episode</li>
          <li>Offline time becomes <b>Banked Time</b> (33%) — spend it as Fast-Forward.</li>
        </ul><div class="row"><button class="big" data-act="close">Got it</button></div>`);
    }
    toggleSetting(k) { const s = this.g.s.settings; s[k] = !s[k]; this.applySettings(); }

    // ---------------------------------------------------------------- tooltips
    onTipOver(e) {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { this.el.tip.style.display = 'none'; this.tipKey = null; return; }
      const key = el.dataset.tip;
      const html = this.tipFor(key);
      if (!html) { this.el.tip.style.display = 'none'; return; }
      this.tipKey = key;
      this.el.tip.innerHTML = html;
      this.el.tip.style.display = 'block';
      this.onTipMove(e);
    }
    onTipMove(e) {
      if (this.el.tip.style.display !== 'block') return;
      const t = this.el.tip, pad = 14;
      let x = e.clientX + pad, y = e.clientY + pad;
      const w = t.offsetWidth, h = t.offsetHeight;
      if (x + w > window.innerWidth - 4) x = e.clientX - w - pad;
      if (y + h > window.innerHeight - 4) y = window.innerHeight - h - 4;
      t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px';
    }
    tipFor(key) {
      const g = this.g;
      const [k, a, b] = key.split(':');
      if (k === 'upg') {
        const u = NYA.UPG[a]; const l = g.lvl(a);
        return `<b>${esc(u.name)}</b>${u.max > 1 ? ` <small>Lv ${l}/${u.max}</small>` : ''}<br>${esc(u.desc)}${u.fx ? `<br><span class="tfx">Now: ${esc(u.fx(l) || '—')}${l < u.max ? ' → ' + esc(u.fx(l + 1)) : ''}</span>` : ''}<div class="tfl">${esc(u.flavor || '')}</div>`;
      }
      if (k === 'trait') { const t = NYA.TRAIT[a]; return `<b style="color:${NYA.RARITY[t.rarity].color}">${esc(t.name)}</b> <small>${NYA.RARITY[t.rarity].name}</small><br>${esc(t.desc)}<div class="tfl">${esc(t.flavor)}</div>`; }
      if (k === 'stat') {
        const cg = g.crewById(+a); if (!cg) return '';
        const st = g.statsFor(cg); const parts = st.parts[b]; const info = NYA.STAT_INFO[b];
        const lines = parts.map(p => `<div class="tl"><span>${esc(p.src)}</span><span>${p.op === 'mul' ? '×' + (Math.round(p.v * 1000) / 1000) : (p.op === 'add' && p.v > 0 ? '+' : '') + (Math.round(p.v * 1000) / 1000)}</span></div>`).join('');
        let extra = '';
        if (b === 'grit') extra = `<div class="tfx">Swing cost here: ${(NYA.tierResist(g.s.selectedTier) * Math.pow(0.99, st.grit)).toFixed(2)} stamina</div>`;
        return `<b>${info.name}</b> = ${b === 'haste' || b === 'pace' ? st[b].toFixed(2) : fmt(st[b])}<br><small>${esc(info.desc)}</small><div class="tbreak">${lines}</div><small>(base + adds) × mults</small>${extra}`;
      }
      if (k === 'fax') { const f = NYA.FAX[a]; return `<b>${esc(f.name)}</b><div class="tfax">${esc(f.text)}</div>${Object.entries(f.bonus).map(([kk, v]) => `+${Math.round(v * 100)}% ${kk}`).join(', ')}`; }
      if (k === 'loom') { const n = NYA.LOOM_NODE[a]; const l = g.loom(a); return `<b>${esc(n.name)}</b>${n.growth ? ` <small>Rank ${l}</small>` : ''}<br>${esc(n.desc)}${n.fx ? `<br><span class="tfx">${esc(n.fx(l))} → ${esc(n.fx(l + 1))}</span>` : ''}`; }
      if (k === 'stripe') { const r = a[0] === 'r'; const S = (r ? NYA.LOOM_ROW_STRIPES : NYA.LOOM_COL_STRIPES)[+a.slice(1)]; return `<b>${esc(S.name)}</b><br>${esc(S.desc)}`; }
      if (k === 'active') {
        const d = NYA.ACTIVES[a], s = g.s.act[a];
        return `<b>${esc(d.name)}</b> <kbd>${d.key}</kbd><br>${esc(d.desc)}<br><small>Cooldown ${NYA.fmtTime(d.cd)} · charges ${s ? s.ch : 0}/${g.activeMaxCharges(a)}${g.orderRunning('cast_' + a) ? ' · AUTO-CAST filed' : ''}</small>${a === 'bomb' ? `<br><small>Damage here: ${fmt(g.bombDamage(g.episode ? g.episode.tier : 1))}</small>` : ''}${a === 'blunt' ? `<br><small>Restores ${Math.round(g.bluntPotency() * 100)}% (×0.8 per repeat dose on the same catgirl)</small>` : ''}`;
      }
      if (k === 'tool') {
        if (a === 'laser') return `<b>Laser Pointer</b> <kbd>L</kbd><br>Click or drag to mark up to ${g.laserMax()} tiles. Marked tiles score ×10 when miners pick targets. Fresh marks (3 s) give Zoomies. Marking fog makes miners dig toward it. Right-click to remove.`;
        if (a === 'spray') return `<b>Spray Bottle</b> <kbd>S</kbd><br>Click/drag to forbid tiles. Miners refuse to mine them (and make a face). Right-click clears.`;
        if (a === 'whistle') return `<b>The Whistle</b> <kbd>W</kbd><br>Call the shift early. Everyone hurries home with what they're carrying.`;
        if (a === 'turret') { const ep = g.episode; return `<b>Hairball Cannons</b> <kbd>T</kbd><br>Click an open, uncovered tile to place a turret (${ep && ep.miceOn ? ep.turrets.length + '/' + ep.maxTurrets + ' placed' : NYA.TURRET_BASE + g.lvl('cannons') + ' slots'}). It lobs a hairball at the nearest mouse within ${NYA.TURRET_RANGE} tiles. Click a turret to pick it up.<br><small>Turret-chan places any you haven’t after ${NYA.CHAN_DELAY} s. She tries her best.</small>`; }
      }
      if (k === 'formula') return `<b>Refining</b><br>Each item's value = tier base (×10 per tier) × quality${g.lvl('polisher') ? '^' + g.polishExp() : ''}${g.lvl('centrifuge') ? ' × centrifuge bonus' : ''}.<br>Catnip = ore value × Refinery (×1.5 per Mark) × Full-Clear Bonus (perfect clears only) × global multipliers (faxes, yarn).`;
      if (k === 'catnip') return `<b>Catnip</b><br>Global multiplier ${NYA.fmtMult(g.catnipMult())}<br>${g.catnipMultParts().map(p => esc(p[0]) + ' ' + NYA.fmtMult(p[1])).join('<br>') || 'Earn faxes and yarn to grow it.'}<br>Season total: ${fmt(g.s.seasonCatnip)}`;
      if (k === 'snd') { const m = g.s.settings[a + 'Mode'] || 'on'; return `<b>${a === 'music' ? 'Music' : 'Sound effects'}: ${SND_LABEL[m]}</b><br>Click to cycle: On → Mute when unfocused → Muted.<br><small>Volume lives in Settings ⚙.</small>`; }
      if (k === 'sight') { const ep = g.episode; return `<b>Sight</b> = ${NYA.BASE_SIGHT} base + ${g.lvl('headlamp')} Headlamps − ${ep ? ep.darkness : 0} darkness = <b>${ep ? ep.noticeRange : '?'}</b><br>Miners notice ore within this many tiles on their own, even with a short attention span. Opened tiles reveal fog ${ep ? ep.revealR : 1} tile(s) around them.<br><small>Deeper mines are darker: −1 Sight every two tiers. Buy Headlamps in the R&D Lab.</small>`; }
      if (k === 'haul') return `<b>This shift’s haul</b><br>Catnip your crew has delivered so far, after Refinery, global${g.episode && g.episode.event ? ' and event-mine' : ''} multipliers. A perfect clear multiplies it again by the Full-Clear Bonus (${NYA.fmtMult(g.fullClearMult())}) at the end.`;
      if (k === 'cheese') return `<b>Cheese</b><br>Mice drop crumbs, and every smashed Mouse Nest drops a whole Cheese Wheel. Spend it on turrets in the R&D Lab (Defense) and on Aged Gouda at the Refinery.`;
      if (k === 'sushi') return `<b>Sushi</b><br>Wild nigiri grows on the rocks of the Sushi Grotto, usually right next to the flooded chambers. Spend it at the Refinery's Sushi Bar.`;
      if (k === 'milk') return `<b>Milk</b><br>Pumped from milk nodes in the Dairy Depths. Spend it at the Refinery's Creamery.<br><small>Pump flow = rate ÷ (1 + pipe length ÷ ${NYA.PIPE_HALF}). Short pipes pump faster.</small>`;
      if (k === 'bank') return `<b>Catnap Bank</b><br>Offline time is banked at ${Math.round(g.bankEff() * 100)}% efficiency. Spend it as Fast-Forward (${g.ffSpeed()}×). Press <kbd>F</kbd>.`;
      return '';
    }
  }
  NYA.UI = UI;
})(globalThis.NYA = globalThis.NYA || {});
