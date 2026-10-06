// HQ building panels (GDD §5). Each returns an HTML string; actions use data-act.
(function (NYA) {
  'use strict';
  const esc = s => NYA.esc(s), fmt = NYA.fmt;
  const NIP = '<i class="nip"></i>';

  function npcHead(key) { return `<span class="npc" data-npc="${key}"></span>`; }

  function upgCard(g, u) {
    const l = g.lvl(u.id);
    const c = g.canBuy(u.id);
    const maxed = l >= u.max;
    let state = maxed ? 'max' : c.ok ? 'afford' : c.locked ? 'locked' : c.busy ? 'busy' : c.poor ? 'poor' : 'locked';
    if (g.s.research && g.s.research.id === u.id) state = 'researching';
    const cost = maxed ? '' : g.upgCost(u.id);
    const CUR = u.cur === 'milk' ? '🥛' : NIP;
    const fxNow = u.fx ? u.fx(l) : '';
    const fxNext = u.fx && !maxed ? u.fx(l + 1) : '';
    const lvTxt = u.max > 1 ? `<span class="lv">${maxed ? 'MAX' : 'Lv ' + l}</span>` : (l ? '<span class="lv done">✓</span>' : '');
    let btn;
    if (state === 'researching') {
      const r = g.s.research;
      btn = `<div class="rbar"><div data-live="research" style="width:${(100 * (1 - r.left / r.total)).toFixed(1)}%"></div><span>Doc Boom is hammering…</span></div>`;
    } else if (maxed) btn = '';
    else if (state === 'locked') btn = `<div class="req">🔒 ${esc(c.why)}</div><button class="buy" disabled>${CUR}${fmt(cost)}</button>`;
    else btn = `<button class="buy ${u.cur === 'milk' ? 'milkbuy' : ''}" data-act="buy:${u.id}" ${state === 'afford' ? '' : 'disabled'}>${CUR}${fmt(cost)}${u.timer ? ` <small>⏱${Math.round(u.timer * (g.s.season > 1 ? 0.5 : 1))}s</small>` : ''}</button>`;
    return `<div class="card upg ${state}" data-tip="upg:${u.id}">
      <div class="nm">${esc(u.name)} ${lvTxt}</div>
      <div class="desc">${esc(u.desc)}</div>
      ${fxNow || fxNext ? `<div class="fx">${esc(fxNow)}${fxNext ? ' <b>→ ' + esc(fxNext) + '</b>' : ''}</div>` : ''}
      ${btn}
    </div>`;
  }
  NYA.upgCard = upgCard;

  function upgList(g, filter) {
    const list = NYA.UPGRADES.filter(u => filter(u) && g.upgVisible(u));
    const hidden = NYA.UPGRADES.filter(u => filter(u) && !g.upgVisible(u)).length;
    let html = list.map(u => upgCard(g, u)).join('');
    if (hidden) html += `<div class="card teaser">??? <small>${hidden} more ${hidden === 1 ? 'thing' : 'things'} coming…</small></div>`;
    return html;
  }

  // ---------------------------------------------------------------- Office
  function office(g) {
    const s = g.s;
    let h = `<div class="phead">${npcHead('auntie')}<div><h2>Foreman's Office</h2><p class="quip">A sun-bleached photo of Auntie hangs on the wall. Sunglasses. Three umbrellas in one drink.</p></div></div>`;
    // OVA in progress
    if (s.ova) {
      const o = NYA.OVA[s.ova.id], goal = g.ovaGoal(), cur = Math.min(goal.need, goal.cur(g));
      const pct = goal.nip ? Math.min(100, 100 * Math.log10(1 + cur) / Math.log10(1 + goal.need)) : 100 * cur / goal.need;
      h += `<div class="ova-box"><div class="ova-tape">${o.icon}</div><div>
        <h3>OVA: ${esc(o.name)} <small>${NYA.OVA_RELEASES[s.ova.rel]} release</small></h3>
        <p class="ms">${esc(o.limiter)}</p>
        <p>Goal: <b>${esc(goal.text)}</b> · <b data-live="ovaProg">${goal.nip ? fmt(cur) : cur}</b> / ${goal.nip ? fmt(goal.need) : goal.need}</p>
        <div class="rbar"><div data-live="ovaBar" style="width:${pct.toFixed(1)}%"></div></div>
        <p class="ms">Clear it for <b>${esc(o.perk)} ${['I', 'II', 'III'][s.ova.rel]}</b>: ${esc(o.perkText(s.ova.rel + 1))}. OVAs pay no yarn, and end the moment you hit the goal.</p>
        <button class="big ghost" data-act="ova:abandon">⏏ Abandon OVA</button>
      </div></div>`;
    }
    // Skein / prestige
    if (s.skein.have) {
      const y = g.yarnPreview();
      const mins = Math.max(1, s.seasonTime / 60);
      h += `<div class="skein-box">
        <div class="skein-orb"></div>
        <div><h3>The Skein hums on your desk.</h3>
        <p>Unravel the timeline: reset catnip, research, mines and roster. Keep yarn, faxes, Loom upgrades${g.anchorSlots() ? ' and ' + g.anchorSlots() + ' anchored catgirl' + (g.anchorSlots() > 1 ? 's' : '') : ''}.</p>
        <div class="yarnline"><b data-live="yarnNow">${fmt(y)}</b> yarn if you unravel now · <span data-live="yarnRate">${(y / mins).toFixed(2)}</span> yarn/min this season</div>
        <button class="big danger" data-act="unravel" ${y < 1 ? 'disabled' : ''}>🧶 UNRAVEL TIMELINE</button>
        ${y < 1 ? '<div class="req">Earn more catnip this season to get at least 1 yarn.</div>' : ''}
        </div></div>`;
    } else if (!s.ova && (s.maxTierReached >= 3 || s.season > 1)) {
      const p = (NYA.BOX_CHANCE[3] + 0.02 * g.loom('sk_box') + s.skein.pity) * 100;
      h += `<div class="note">📦 <b>Schrödinger's Box</b>: ~${p.toFixed(1)}% chance per Tier 3 episode (grows every episode without one).</div>`;
    }
    // OVA tape shelf: start one instead of a normal unravel
    if (g.ovaShelfOpen() && !s.ova) {
      h += `<h3 class="sec">📼 OVA Tape Shelf <small>challenge runs · no yarn, permanent perks</small></h3><div class="tapes">` + NYA.OVAS.map(o => {
        const done = g.ovaPerk(o.id), open = g.ovaUnlocked(o.id);
        if (!open) {
          const need = [];
          if (s.season < NYA.ovaSeason(o, 0)) need.push('arrives in Season ' + NYA.ovaSeason(o, 0));
          if (o.index > 0 && g.ovaPerk(NYA.OVAS[o.index - 1].id) < 1) need.push('clear ' + NYA.OVAS[o.index - 1].name + ' (VHS) first');
          return `<div class="tape locked"><div class="tape-t">📼 ???</div><div class="ms">Coming soon: ${esc(need.join(', '))}.</div></div>`;
        }
        const rels = NYA.OVA_RELEASES.map((r, i) => `<li class="${i < done ? 'got' : i === done ? 'next' : ''}">${i < done ? '✓' : i === done ? '▶' : '·'} <b>${r}</b>: ${esc(o.goals[i].text)} → ${esc(o.perk)} ${['I', 'II', 'III'][i]} <small>(${esc(o.perkText(i + 1))})</small></li>`).join('');
        const btn = done >= 3 ? '<div class="ms">All releases cleared! ★</div>'
          : !g.ovaReleaseReady(o.id) ? `<div class="ms">The ${NYA.OVA_RELEASES[done]} release arrives in Season ${NYA.ovaSeason(o, done)}.</div>`
          : s.skein.have ? `<button class="big danger" data-act="ova:start:${o.id}">▶ Play the ${NYA.OVA_RELEASES[done]} release</button>`
          : '<div class="ms">Find the Skein to switch tapes.</div>';
        return `<div class="tape ${done >= 3 ? 'done' : ''}"><div class="tape-t">${o.icon} ${esc(o.name)}</div><div class="ms">${esc(o.limiter)}</div><ul>${rels}</ul>${btn}</div>`;
      }).join('') + `</div>`;
    }
    // Tanuki event purrmits waiting in the queue
    if (s.tanuki && (s.tanuki.queue.length || s.pendingEvent)) {
      h += `<h3 class="sec">🍃 Event Purrmits</h3><div class="mines">`;
      if (s.pendingEvent) { const E = NYA.EVENTS[s.pendingEvent.ev]; h += `<div class="mine sel evq"><div class="mt">${E.icon}</div><div class="mi"><b>${esc(E.name)}</b> <span class="sz">T${s.pendingEvent.tier}</span><div class="desc">Runs next episode!</div></div></div>`; }
      s.tanuki.queue.forEach((q, k) => { const E = NYA.EVENTS[q.ev]; h += `<div class="mine evq" data-act="runevent:${k}"><div class="mt">${E.icon}</div><div class="mi"><b>${esc(E.name)}</b> <span class="sz">T${q.tier}</span><div class="desc">${esc(E.desc)}</div><div class="ms">Click to run it next episode</div></div></div>`; });
      h += `</div>`;
    }
    // Mine select
    h += `<h3 class="sec">Mine Select</h3><div class="mines">`;
    for (let t = 1; t <= NYA.MAX_TIER; t++) {
      const d = NYA.TIERS[t];
      const un = s.tierUnlocked[t];
      const ms = s.mine[t] || { eps: 0, fc: 0, best: 0 };
      const sel = s.selectedTier === t;
      if (!un) {
        h += `<div class="mine locked"><div class="mt">T${t}</div><div><b>???</b><div class="desc">Survey it in the R&D Lab.</div></div></div>`;
        continue;
      }
      h += `<div class="mine ${sel ? 'sel' : ''}" data-act="mine:${t}" style="--acc:${d.pal.accent}">
        <div class="mt">T${t}</div>
        <div class="mi"><b>${esc(d.name)}</b> <span class="sz">${d.w}×${d.h}</span>
        <div class="desc">${esc(d.blurb)}</div>
        <div class="ms">Purrmit: ${d.purrmit ? NIP + fmt(d.purrmit) : 'free'} · Episodes ${ms.eps} · Perfect ${ms.fc} · Best ${NIP}${fmt(ms.best || 0)}${NYA.tierDarkness(t) ? ` · 🌑 Darkness ${NYA.tierDarkness(t)}` : ''}</div></div>
        ${sel ? '<div class="selbadge">SELECTED</div>' : ''}
      </div>`;
    }
    h += `</div>`;
    // faxes
    const got = Object.keys(s.faxes).length;
    const fb = g.faxBonus();
    h += `<h3 class="sec">Fax Machine <small>${got}/${NYA.FAXES.length} faxes · +${Math.round(fb.catnip * 100)}% catnip · +${Math.round(fb.xp * 100)}% XP${fb.yarn ? ' · +' + Math.round(fb.yarn * 100) + '% yarn' : ''}</small></h3>
      <div class="faxgrid">` + NYA.FAXES.map(f => {
        const have = s.faxes[f.id] !== undefined;
        // yarn faxes talk about seasons and unravelling: keep them secret until the Skein is found
        const spoiler = f.bonus.yarn && !s.skein.have && s.season === 1;
        if (!have && (f.hidden || spoiler)) return `<div class="fx-tile hidden" data-act="faxclick">?</div>`;
        return `<div class="fx-tile ${have ? 'have' : ''}" data-tip="fax:${f.id}">${have ? '📠' : '·'}</div>`;
      }).join('') + `</div>`;
    // gallery
    const seen = Object.keys(s.gallery).length;
    h += `<h3 class="sec">Eyecatcher Gallery <small>${seen}/${NYA.EYECATCHERS.length}</small></h3><div class="gallery">` +
      NYA.EYECATCHERS.map(e => `<div class="gal ${s.gallery[e.id] ? 'have' : ''} ${e.rare ? 'rare' : ''}" ${s.gallery[e.id] ? `data-act="eye:${e.id}"` : ''}>${s.gallery[e.id] ? esc(e.name) : '???'}</div>`).join('') + `</div>`;
    // season log
    if (s.seasonLog.length) {
      h += `<h3 class="sec">Previous Seasons</h3><table class="tbl"><tr><th>Season</th><th>Length</th><th>Catnip</th><th>Yarn</th></tr>` +
        s.seasonLog.map(l => `<tr><td>${l.season}${l.ova ? ' 📼 ' + esc(NYA.OVA[l.ova.split(':')[0]].name) : ''}</td><td>${NYA.fmtTime(l.time)}</td><td>${fmt(l.catnip)}</td><td>${fmt(l.yarn)}</td></tr>`).join('') + `</table>`;
    }
    h += `<h3 class="sec">Lifetime</h3><div class="stats">
      <span>Episodes <b>${fmt(s.life.episodes)}</b></span><span>Tiles mined <b>${fmt(s.life.tiles)}</b></span>
      <span>Perfect clears <b>${fmt(s.life.fullClears)}</b></span><span>Laser marks <b>${fmt(s.life.marks)}</b></span>
      <span>Crits <b>${fmt(s.life.crits)}</b></span><span>Loafs & naps <b>${fmt(s.life.distractions)}</b></span>
      <span>Catnip <b>${fmt(s.life.catnip)}</b></span><span>Transfers <b>${fmt(s.life.transfers)}</b></span></div>`;
    return h;
  }

  // ---------------------------------------------------------------- Refinery
  function refinery(g) {
    const s = g.s;
    const parts = g.catnipMultParts();
    let h = `<div class="phead">${npcHead('tora')}<div><h2>Refinery</h2><p class="quip">“${esc(g.lastResult ? g.lastResult.tora : 'Bring me ore, boss. Real ore. Not pebbles.')}”</p></div></div>`;
    h += `<div class="formula" data-tip="formula">Catnip = Ore value × <b>Refinery ${NYA.fmtMult(g.refineryMult())}</b> × Full-clear <b>${NYA.fmtMult(g.fullClearMult())}</b> (on perfect) × Global <b>${NYA.fmtMult(g.catnipMult())}</b>${g.lvl('polisher') ? ' · quality^' + g.polishExp() : ''}</div>`;
    if (parts.length) h += `<div class="mini">${parts.map(p => esc(p[0]) + ' ' + NYA.fmtMult(p[1])).join(' · ')}</div>`;
    h += `<div class="grid">${upgList(g, u => u.bld === 'refinery' && !u.cur)}</div>`;
    const cream = upgList(g, u => u.bld === 'refinery' && u.cur === 'milk');
    if (s.milk > 0 || s.maxTierReached >= 4) h += `<h3 class="sec">🥛 Creamery <small>paid in milk · you have ${fmt(s.milk)}</small></h3><div class="grid">${cream}</div>`;
    if (g.lvl('blend')) {
      const b = s.blend;
      if (b && b.active) {
        const left = b.until - s.simTime;
        h += `<div class="blend active"><h3>🍲 Tora's Special Blend is brewing</h3><p>Pot: ${NIP}<b data-live="blendPot">${fmt(b.pot)}</b> · Ready in <b data-live="blendLeft">${NYA.fmtTime(left)}</b></p><p class="quip">50% of every haul goes in the pot. Payout is the pot × ×0.5 … ×4.</p></div>`;
      } else if (g.blendAvailable()) {
        h += `<div class="blend"><h3>🍲 Tora's Special Blend</h3><p>Once an hour: stake 50% of refinery output for 10 minutes, then Tora rolls ×0.5 to ×4 on the pot.</p><button class="big" data-act="blend">Start the Blend</button></div>`;
      } else if (b && b.result) {
        h += `<div class="blend done"><h3>🍲 Last Blend</h3><p>Pot ${NIP}${fmt(b.result.pot)} × <b>${b.result.f}</b> = ${NIP}<b>${fmt(b.result.payout)}</b>. Next blend in <b>${NYA.fmtTime(Math.max(0, (b.readyAt || 0) - s.simTime))}</b>.</p></div>`;
      }
    }
    return h;
  }

  // ---------------------------------------------------------------- Barracks
  function crewCard(g, cg, where) {
    const st = g.statsFor(cg);
    const need = NYA.xpNeed(cg.level);
    const capped = cg.level >= g.levelCap();
    const apt = g.lvl('resume') ? `<span class="apt apt-${NYA.aptGrade(cg)}">${NYA.aptGrade(cg)}</span>` : '';
    const traits = cg.traits.map(t => { const d = NYA.TRAIT[t]; return `<span class="trait ${d.kind} r-${d.rarity}" data-tip="trait:${t}">${esc(d.name)}</span>`; }).join('');
    const nextT = NYA.TRAIT_LEVELS.find(l => l > cg.level);
    return `<div class="cg ${where}" data-cg="${cg.id}">
      <div class="por" data-por="${cg.id}"></div>
      <div class="cgi">
        <div class="cgn">${esc(cg.name)} <small>${esc(cg.family)}</small> ${apt} ${cg.anchored ? '<span class="anchor" title="Timeline-anchored">⚓</span>' : ''}</div>
        <div class="cgl">Lv ${cg.level}${capped ? ' <b class="cap">CAP</b>' : ''} · ${esc(NYA.lookLabel(cg))}</div>
        <div class="xpbar"><div style="width:${Math.min(100, 100 * cg.xp / need)}%"></div></div>
        <div class="traits">${traits || '<span class="none">No traits yet' + (nextT ? ' — first at Lv ' + nextT : '') + '</span>'}</div>
        <div class="blurb">${esc(cg.blurb)}</div>
        <div class="statrow">
          ${['power', 'haste', 'pace', 'stamina', 'carry', 'focus', 'grit'].map(k => `<span data-tip="stat:${cg.id}:${k}">${k.slice(0, 3).toUpperCase()} <b>${k === 'haste' || k === 'pace' ? st[k].toFixed(1) : fmt(Math.round(st[k]))}</b></span>`).join('')}
        </div>
      </div>
      <div class="cga">
        <button data-act="bench:${cg.id}">${where === 'active' ? 'Bench' : 'Activate'}</button>
        <button class="ghost" data-act="transfer:${cg.id}" title="Transfer to Corporate (refunds ${Math.round(NYA.TRANSFER_REFUND * 100)}% of a hire, more if levelled)">Transfer</button>
      </div>
    </div>`;
  }

  function barracks(g) {
    const s = g.s;
    const cost = g.hireCost();
    const room = s.active.length < g.crewCap() || s.reserve.length < g.reserveCap();
    let h = `<div class="phead">${npcHead('paws')}<div><h2>Barracks</h2><p class="quip">“LISTEN UP! DRINK WATER! TAKE A NAP! I LOVE YOU ALL!”</p></div></div>`;
    const B = s.board, ad = g.adCost();
    const untilTurn = NYA.BOARD_TURN - (B.turn % NYA.BOARD_TURN);
    const appCard = (c, k) => {
      if (!c) return `<div class="app empty"><div class="app-wait">📋</div><div class="ms">Next applicant arrives after this episode</div></div>`;
      const apt = g.lvl('resume') ? `<span class="apt apt-${NYA.aptGrade(c)}">${NYA.aptGrade(c)}</span>` : `<span class="apt apt-q" title="Aptitude hidden. Résumé Reader (R&amp;D) reveals it.">?</span>`;
      const star = g.applicantMatch(c) ? `<span class="app-star" title="Tuxedo Club would love her">★ Tuxedo Club match</span>` : '';
      const leaving = k === 0 && B.apps.filter(Boolean).length === NYA.BOARD_SIZE ? `<div class="ms">Leaves in ${untilTurn} episode${untilTurn > 1 ? 's' : ''}</div>` : '';
      return `<div class="app"><div class="por" data-apor="${k}"></div>
        <div class="cgn">${esc(c.name)} ${apt}</div><div class="cgl">${esc(NYA.lookLabel(c))}</div>
        ${star}<div class="blurb">${esc(c.blurb)}</div>${leaving}
        <button class="big" data-act="hire:${k}" ${s.catnip >= cost && room ? '' : 'disabled'}>Hire ${NIP}${fmt(cost)}</button></div>`;
    };
    h += `<div class="hire"><div class="poster">NOW HIRING<br><small>catgirls w/ pickaxes</small></div>
      <div><p>Active <b>${s.active.length}/${g.crewCap()}</b> · Reserves <b>${s.reserve.length}/${g.reserveCap()}</b> · Level cap <b>${g.levelCap()}</b></p>
      <p class="ms">Applicants come and go: one moves on every ${NYA.BOARD_TURN} episodes, and hired slots refill after each episode. Traits are a surprise.</p>
      ${!room ? '<div class="req">No room. Buy Bunk Beds or Reserve Lockers, or transfer someone.</div>' : ''}</div></div>`;
    h += `<div class="board">${B.apps.map(appCard).join('')}</div>`;
    h += `<div class="row"><button data-act="postad" ${s.catnip >= ad ? '' : 'disabled'} title="Replaces every applicant now. Price doubles per ad, halves each time an applicant moves on.">📰 Post a new ad — ${NIP}${fmt(ad)}</button></div>`;
    h += `<div class="grid">${upgList(g, u => u.bld === 'barracks')}</div>`;
    h += `<h3 class="sec">On Shift</h3>` + g.activeCrew().map(cg => crewCard(g, cg, 'active')).join('');
    const res = g.reserveCrew();
    if (res.length) h += `<h3 class="sec">Reserves</h3>` + res.map(cg => crewCard(g, cg, 'reserve')).join('');
    return h;
  }

  // ---------------------------------------------------------------- Lab
  function lab(g) {
    const s = g.s;
    const stage = g.lvl('mewclear');
    let h = `<div class="phead">${npcHead('doc')}<div><h2>R&D Lab</h2><p class="quip">“It's fine! It's <i>structurally</i> fine!”</p></div></div>`;
    if (s.research) {
      const u = NYA.UPG[s.research.id];
      h += `<div class="researching">🔨 <b>${esc(u.name)}</b> <div class="rbar"><div data-live="research" style="width:${(100 * (1 - s.research.left / s.research.total)).toFixed(1)}%"></div></div></div>`;
    }
    if (g.upgVisible(NYA.UPG.mewclear)) {
      h += `<div class="warhead"><canvas id="warhead" width="260" height="90"></canvas><div><b>Project MEWCLEAR</b> — stage ${stage}/10<br><i>${esc(NYA.MEWCLEAR_NOTES[stage])}</i></div></div>`;
    }
    const branches = ['Excavation', 'Logistics', 'Personnel', 'Ordnance', 'Exploration'];
    for (const b of branches) {
      const inner = upgList(g, u => u.bld === 'lab' && u.branch === b);
      if (!inner) continue;
      h += `<h3 class="sec">${b}</h3><div class="grid">${inner}</div>`;
    }
    return h;
  }

  // ---------------------------------------------------------------- Purrmit Office
  function pochi(g) {
    const s = g.s;
    const max = g.rpMax(), used = g.rpUsed();
    const running = g.runningOrders();
    let h = `<div class="phead">${npcHead('pochi')}<div><h2>Purrmit Office</h2><p class="quip">“Sign here. And here. And here. Do not scratch the form.”</p></div></div>`;
    // 80s boot-screen memory bar
    let blocks = '';
    for (const id of running) blocks += `<div class="blk o-${id}" style="flex:${NYA.ORDERS[id].rp}" title="${esc(NYA.ORDERS[id].name)}">${NYA.ORDERS[id].rp}</div>`;
    if (max - used > 0) blocks += `<div class="blk free" style="flex:${max - used}">${max - used} free</div>`;
    h += `<div class="boot"><div class="bt">REQUISITION MEMORY TEST: ${used}/${max} RP ALLOCATED</div><div class="mem">${blocks}</div>
      <button class="ghost tiny" data-act="defrag">Defragment</button></div>`;
    h += `<h3 class="sec">Standing Orders</h3><div class="orders">`;
    for (const id of NYA.ORDER_ORDER) {
      const o = NYA.ORDERS[id];
      const avail = g.orderAvailable(id);
      const filed = s.orders.indexOf(id) >= 0;
      const run = running.indexOf(id) >= 0;
      if (!avail && !filed) {
        h += `<div class="order locked"><b>???</b> <small>${o.active ? 'Needs ' + esc(NYA.ACTIVES[o.active].name) : ''}</small></div>`;
        continue;
      }
      h += `<div class="order ${filed ? (run ? 'run' : 'pending') : ''}" data-act="order:${id}">
        <div class="oname">${esc(o.name)} <span class="rp">${o.rp} RP</span></div>
        <div class="desc">${esc(o.desc)}</div>
        <div class="stampz">${filed ? (run ? 'FILED' : 'PENDING') : 'click to file'}</div></div>`;
    }
    h += `</div><div class="grid">${upgList(g, u => u.bld === 'pochi')}</div>`;
    return h;
  }

  // ---------------------------------------------------------------- Loom
  function loom(g) {
    const s = g.s;
    let h = `<div class="phead">${npcHead('nyacolette')}<div><h2>Quantum Loom</h2><p class="quip">Spool count: <b class="yarnc">🧶 ${fmt(s.yarn)}</b> yarn. Every stitch is a timeline.</p></div></div>`;
    h += `<div class="sweater"><div class="sw-title">Pattern I: The Starter Sweater</div><div class="swgrid">`;
    NYA.LOOM.forEach((row, r) => {
      h += `<div class="rowlab ${g.loomRowDone(r) ? 'done' : ''}" data-tip="stripe:r${r}">${esc(NYA.LOOM_ROWS[r])}</div>`;
      row.forEach(n => {
        const l = g.loom(n.id);
        const maxed = n.max ? l >= n.max : l >= 1;
        const cost = NYA.loomCost(n, l);
        const can = !maxed && s.yarn >= cost;
        h += `<div class="knot ${l ? 'owned' : ''} ${can ? 'afford' : ''} ${maxed ? 'max' : ''}" data-act="loom:${n.id}" data-tip="loom:${n.id}">
          <div class="kn">${esc(n.name)}</div>
          <div class="kl">${n.growth ? 'Rank ' + l : l ? '✓' : ''}</div>
          ${maxed ? '' : `<div class="kc">🧶${fmt(cost)}</div>`}
        </div>`;
      });
    });
    h += `<div></div>` + [0, 1, 2, 3, 4].map(c => `<div class="collab ${g.loomColDone(c) ? 'done' : ''}" data-tip="stripe:c${c}">${g.loomColDone(c) ? '★' : '·'}</div>`).join('');
    h += `</div></div>`;
    h += `<p class="mini">Complete a row or column to finish a stripe for a bonus. Finish the whole sweater for… something.</p>`;
    return h;
  }

  // ---------------------------------------------------------------- Tanuki's Emporium
  function tanuki(g) {
    const s = g.s, T = s.tanuki;
    let h = `<div class="phead">${npcHead('tanuki')}<div><h2>Tanuki\u2019s Emporium</h2><p class="quip">\u201cLimited time only! Well, all time is limited, if you think about it.\u201d</p></div></div>`;
    const card = (o, label, act) => {
      const E = NYA.EVENTS[o.ev];
      const left = o.until ? Math.max(0, o.until - s.simTime) : 0;
      return `<div class="tan-offer"><div class="tan-ic">${E.icon}</div><div class="tan-i"><div class="tan-n">${esc(E.name)} <span class="sz">scaled to T${o.tier}</span></div>
        <div class="desc">${esc(E.desc)}</div><div class="ms">Event mines pay ×1.5 and don\u2019t need a regular purrmit.${label ? ' ' + label : ''}</div>
        ${o.until ? `<div class="tan-t">Stall closes in <b data-live="tanLeft">${NYA.fmtTime(left)}</b></div>` : ''}
        <button class="big" data-act="${act}" ${s.catnip >= o.cost && T.queue.length < 3 ? '' : 'disabled'}>Buy purrmit — ${NIP}${fmt(o.cost)}</button>
        ${T.queue.length >= 3 ? '<div class="req">Your purrmit drawer is full (3). Run one first.</div>' : ''}</div></div>`;
    };
    if (T.offer) h += `<h3 class="sec">Today\u2019s Special</h3>` + card(T.offer, '', 'tanbuy');
    else h += `<div class="note">🍃 The stall is packed up. Tanuki will be back in about <b data-live="tanNext">${NYA.fmtTime(Math.max(0, T.nextAt - s.simTime))}</b>. Probably. She is not great with schedules.</div>`;
    if (T.rain) h += `<h3 class="sec">Rain Check <small>one held · never expires</small></h3>` + card(T.rain, '(Rain Check — Tanuki left it when the stall closed.)', 'tanrain');
    if (T.queue.length) {
      h += `<h3 class="sec">Your Event Purrmits</h3><div class="mines">` + T.queue.map((q, k) => { const E = NYA.EVENTS[q.ev]; return `<div class="mine evq" data-act="runevent:${k}"><div class="mt">${E.icon}</div><div class="mi"><b>${esc(E.name)}</b> <span class="sz">T${q.tier}</span><div class="ms">Click to run it next episode</div></div></div>`; }).join('') + `</div>`;
    }
    h += `<p class="mini">Event mines so far: <b>${fmt(s.life.events || 0)}</b>${s.life.wishes ? ` · wishes made: <b>${fmt(s.life.wishes)}</b>` : ''}. File <b>Tanuki Auto-Buy</b> with Pochi (8 RP) to never miss one.</p>`;
    return h;
  }

  NYA.PANELS = { office, refinery, barracks, lab, pochi, loom, tanuki };
  NYA.crewCard = crewCard;

  // Warhead sprite for Project MEWCLEAR (changes per stage)
  NYA.drawWarhead = function (cv, stage, t) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2);
    if (stage <= 0) {
      ctx.fillStyle = '#d9b07a'; for (let k = 0; k < 4; k++) ctx.fillRect(-60 + k * 30, 10 + (k % 2) * 4, 26, 6);
      ctx.restore(); return;
    }
    const pink = stage >= 9;
    ctx.fillStyle = pink ? '#ff9ec4' : '#d9b07a';
    NYA.rrect(ctx, -70, -22, 120, 44, 22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(50, -22); ctx.quadraticCurveTo(90, 0, 50, 22); ctx.closePath(); ctx.fill();
    if (stage >= 2) { ctx.strokeStyle = '#b8b8c8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, -22); ctx.lineTo(-30, 22); ctx.moveTo(10, -22); ctx.lineTo(20, 22); ctx.stroke(); }
    if (stage >= 3) { ctx.fillStyle = '#5b4a3a'; for (let k = 0; k < 14; k++) ctx.fillRect(-60 + (k * 37) % 110, -16 + (k * 13) % 30, 3, 3); }
    if (stage >= 4) { ctx.fillStyle = pink ? '#ff7eb6' : '#c9a26a'; ctx.beginPath(); ctx.moveTo(-70, -10); ctx.lineTo(-92, -30); ctx.lineTo(-80, 0); ctx.lineTo(-92, 30); ctx.lineTo(-70, 10); ctx.closePath(); ctx.fill(); }
    if (stage >= 5) { ctx.fillStyle = '#7af0a0'; ctx.beginPath(); ctx.arc(-15, 0, 7, 0, 7); ctx.fill(); }
    if (stage >= 6) {
      ctx.fillStyle = '#2a1f33'; ctx.beginPath(); ctx.arc(28, -6, 3, 0, 7); ctx.arc(42, -6, 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2a1f33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(32, 4, 3, 0.2, Math.PI - 0.2); ctx.arc(38, 4, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    }
    if (stage >= 7) { ctx.strokeStyle = 'rgba(122,240,224,' + (0.4 + 0.3 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 58 + Math.sin(t * 6) * 3, 0, 7); ctx.stroke(); }
    if (stage >= 8) { ctx.fillStyle = '#fff'; ctx.fillRect(-55, -38, 34, 14); ctx.fillStyle = '#e0304e'; ctx.font = 'bold 9px sans-serif'; ctx.fillText('NO!!', -50, -28); }
    if (stage >= 10) { ctx.fillStyle = '#ffd23f'; ctx.font = '900 14px "Mochiy Pop One", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('IT WORKS!!', 0, 42); }
    ctx.restore();
  };
})(globalThis.NYA = globalThis.NYA || {});
