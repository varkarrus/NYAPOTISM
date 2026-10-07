// Eyecatchers (GDD §21.3): two-to-three frame gag animations shown during Pack-Up.
// Each is drawn procedurally: draw(ctx, W, H, frame, t, ctxInfo)
(function (NYA) {
  'use strict';
  const D = NYA.drawCatgirl;

  function bg(ctx, W, H, c1, c2, t, lines) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (lines === 'speed') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * Math.PI * 2 + t * 0.2;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * W * 0.25, H / 2 + Math.sin(a) * H * 0.25); ctx.lineTo(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * W); ctx.stroke();
      }
    } else if (lines === 'sparkle') {
      for (let k = 0; k < 18; k++) {
        const x = ((k * 97) % 100) / 100 * W, y = ((k * 53) % 100) / 100 * H, s = 4 + (k % 4) * 3 + Math.sin(t * 4 + k) * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x, y - s * 0.25); ctx.closePath(); ctx.fill();
      }
    } else if (lines === 'dots') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let y = 0; y < H; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function caption(ctx, W, H, text, col) {
    ctx.font = `900 ${Math.round(H * 0.075)}px "Mochiy Pop One", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1a1020'; ctx.strokeText(text, W / 2, H * 0.92);
    ctx.fillStyle = col || '#fff'; ctx.fillText(text, W / 2, H * 0.92);
  }
  function logo(ctx, W, H) {
    ctx.save();
    ctx.translate(W * 0.03, H * 0.15); ctx.rotate(-0.06);
    ctx.font = `900 ${Math.round(H * 0.085)}px "Mochiy Pop One", sans-serif`;
    ctx.textAlign = 'left';
    ctx.lineWidth = 7; ctx.strokeStyle = '#1a1020'; ctx.strokeText('NYAPOTISM!', 0, 0);
    ctx.fillStyle = '#ffd23f'; ctx.fillText('NYAPOTISM!', 0, 0);
    ctx.restore();
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const randLook = () => { const fur = pick(NYA.FUR_KEYS); return { fur, hair: NYA.FURS[fur].sphynx ? 'bald' : pick(['bob', 'buzz', 'ponytail', 'undercut', 'twinbuns', 'velvet', 'bun']), outfit: pick(NYA.OUTFITS), hat: true }; };

  const EYE = {
    box(ctx, W, H, f, t, L) {
      bg(ctx, W, H, '#ffb3a7', '#c9a8ff', t, 'dots');
      const s = H * 0.55;
      if (f === 0) { D(ctx, W * 0.36, H * 0.82, s, L, { anim: 'idle', t, eyes: 'open' }); NYA.drawBox(ctx, W * 0.66, H * 0.82, H * 0.18, t, false); caption(ctx, W, H, '…'); }
      else if (f === 1) { ctx.save(); ctx.translate(W * 0.66, H * 0.82); ctx.scale(H / 70, H / 70); D(ctx, 0, 0, 34, L, { anim: 'box', t }); ctx.restore(); caption(ctx, W, H, 'fits.'); }
      else {
        ctx.save(); ctx.translate(W * 0.6, H * 0.82);
        ctx.fillStyle = '#c9925a';
        ctx.beginPath(); ctx.moveTo(-H * 0.14, 0); ctx.lineTo(-H * 0.14, -H * 0.3); ctx.lineTo(-H * 0.1, -H * 0.42); ctx.lineTo(-H * 0.04, -H * 0.32); ctx.lineTo(H * 0.04, -H * 0.32); ctx.lineTo(H * 0.1, -H * 0.42); ctx.lineTo(H * 0.14, -H * 0.3); ctx.lineTo(H * 0.14, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(80,40,10,0.5)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
        caption(ctx, W, H, 'the box is catgirl-shaped now');
      }
    },
    mug(ctx, W, H, f, t, L) {
      bg(ctx, W, H, '#7ad7f0', '#b69cff', t, 'dots');
      ctx.fillStyle = '#8a5a3c'; ctx.fillRect(W * 0.2, H * 0.62, W * 0.6, H * 0.06);
      const s = H * 0.6;
      D(ctx, W * 0.35, H * 0.62, s, L, { anim: 'idle', t, eyes: f === 2 ? 'half' : 'open', noPick: true });
      const mx = f === 0 ? W * 0.55 : f === 1 ? W * 0.75 : W * 0.75;
      if (f < 2) {
        ctx.fillStyle = '#fff'; ctx.fillRect(mx, H * 0.5, H * 0.1, H * 0.12); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(mx + H * 0.12, H * 0.56, H * 0.035, -1.3, 1.3); ctx.stroke();
      }
      caption(ctx, W, H, f === 0 ? '*stares at camera*' : f === 1 ? '*push*' : '*pushes the camera off the table*');
      if (f === 2) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(0.15); ctx.translate(-W / 2, -H / 2); ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H); }
    },
    laser(ctx, W, H, f, t, L) {
      bg(ctx, W, H, '#ff9e7a', '#ff7eb6', t, f === 2 ? 'speed' : 'dots');
      const s = H * 0.85;
      D(ctx, W / 2, H * 0.98, s, L, { anim: 'idle', t, eyes: f === 2 ? 'dizzy' : 'open' });
      const dx = f === 0 ? W * 0.75 : W / 2, dy = f === 0 ? H * 0.3 : H * 0.98 - s * 0.82;
      ctx.fillStyle = 'rgba(255,59,92,0.5)'; ctx.beginPath(); ctx.arc(dx, dy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe0e6'; ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill();
      caption(ctx, W, H, f === 0 ? 'the dot…' : f === 1 ? 'THE DOT…!' : '@_@');
    },
    totem(ctx, W, H, f, t) {
      bg(ctx, W, H, '#8ce99a', '#7ad7f0', t, 'dots');
      const s = H * 0.42;
      const looks = [randLookSeed(1), randLookSeed(2), randLookSeed(3)];
      const shake = f === 2 ? Math.sin(t * 50) * 6 : 0;
      for (let k = 0; k < 3; k++) D(ctx, W / 2 + (k === 0 ? shake : 0), H * 0.98 - k * s * 0.55, s, looks[k], { anim: 'idle', t, eyes: f === 1 && k === 0 ? 'closed' : f === 2 ? 'dizzy' : 'open', noPick: true });
      caption(ctx, W, H, f === 0 ? 'perfectly balanced' : f === 1 ? 'a… a… ' : 'A-CHOO!!');
    },
    stamp(ctx, W, H, f, t) {
      bg(ctx, W, H, '#3d5a99', '#7ad7f0', t, 'dots');
      ctx.fillStyle = '#fff8e8'; ctx.fillRect(W * 0.3, H * 0.15, W * 0.4, H * 0.65);
      ctx.fillStyle = '#c9c3d6'; for (let k = 0; k < 6; k++) ctx.fillRect(W * 0.34, H * (0.22 + k * 0.06), W * 0.32, 4);
      if (f >= 1) {
        ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.rotate(-0.15);
        ctx.strokeStyle = f === 1 ? '#e0304e' : '#2f8f55'; ctx.lineWidth = 6; ctx.strokeRect(-W * 0.13, -H * 0.09, W * 0.26, H * 0.18);
        ctx.font = `900 ${Math.round(H * 0.13)}px "Mochiy Pop One", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = f === 1 ? '#e0304e' : '#2f8f55';
        ctx.fillText(f === 1 ? 'NO' : 'FINE', 0, H * 0.05); ctx.restore();
      }
      D(ctx, W * 0.82, H * 0.98, H * 0.6, NYA.npcLook('pochi'), { anim: 'idle', t, eyes: f === 2 ? 'half' : 'open', mouth: 'flat' });
      caption(ctx, W, H, f === 0 ? 'Inspector Pochi reviews your purrmit' : f === 1 ? '*STAMP*' : '*flips stamp* …fine.');
    },
    fax(ctx, W, H, f, t) {
      bg(ctx, W, H, '#2a1f33', '#5b4a6e', t, 'dots');
      ctx.fillStyle = '#d8d0e0'; NYA.rrect(ctx, W * 0.3, H * 0.45, W * 0.4, H * 0.3, 10); ctx.fill();
      ctx.fillStyle = '#9b93a8'; ctx.fillRect(W * 0.35, H * 0.47, W * 0.3, H * 0.04);
      const paper = f === 0 ? 0.05 : f === 1 ? 0.18 : 0.32;
      ctx.fillStyle = '#fffdf5'; ctx.fillRect(W * 0.38, H * 0.47 - H * paper, W * 0.24, H * paper);
      if (f === 2) {
        ctx.fillStyle = '#2a1f33'; ctx.font = `${Math.round(H * 0.035)}px "VT323", monospace`; ctx.textAlign = 'center';
        ctx.fillText('STOP LOOKING AT', W / 2, H * 0.22); ctx.fillText('THE FAX MACHINE.', W / 2, H * 0.27); ctx.fillText('♡', W / 2, H * 0.32);
      }
      caption(ctx, W, H, f === 2 ? '' : 'skreeeeee…');
    },
    nail(ctx, W, H, f, t) {
      bg(ctx, W, H, '#ffd166', '#ff9e7a', t, f === 2 ? 'sparkle' : 'dots');
      // plywood warhead
      ctx.save(); ctx.translate(W * 0.62, H * 0.62);
      ctx.fillStyle = '#d9b07a'; NYA.rrect(ctx, -W * 0.18, -H * 0.12, W * 0.3, H * 0.24, H * 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W * 0.12, -H * 0.12); ctx.lineTo(W * 0.22, 0); ctx.lineTo(W * 0.12, H * 0.12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9c3d6'; ctx.fillRect(-W * 0.24, -H * 0.16, W * 0.06, H * 0.32);
      ctx.fillStyle = '#7a5a3c'; for (let k = 0; k < 9; k++) ctx.fillRect(-W * 0.15 + k * W * 0.03, -H * 0.1 + (k % 3) * H * 0.07, 3, 3);
      ctx.fillStyle = '#2a1f33'; ctx.beginPath(); ctx.arc(-W * 0.02, -H * 0.02, 3, 0, 7); ctx.arc(W * 0.04, -H * 0.02, 3, 0, 7); ctx.fill();
      ctx.restore();
      D(ctx, W * 0.25, H * 0.98, H * 0.6, NYA.npcLook('doc'), { anim: f === 2 ? 'cheer' : 'idle', t, eyes: f === 2 ? 'happy' : 'open', noPick: true });
      if (f === 1) { ctx.font = `900 ${Math.round(H * 0.1)}px "Mochiy Pop One"`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('BOING', W * 0.45, H * 0.35); }
      caption(ctx, W, H, f === 0 ? '*hammer hammer*' : f === 1 ? '' : 'It’s fine! It’s STRUCTURALLY fine!');
    },
    loaf(ctx, W, H, f, t, L) {
      bg(ctx, W, H, '#fff3b0', '#ffb3a7', t, 'dots');
      const s = H * 0.5;
      // bread
      const bx = W * 0.32, by = H * 0.7;
      if (f < 2) { ctx.fillStyle = '#d9a066'; NYA.rrect(ctx, bx - H * 0.15, by - H * 0.18, H * 0.3, H * 0.18, H * 0.08); ctx.fill(); ctx.fillStyle = '#f3d3a0'; ctx.fillRect(bx - H * 0.11, by - H * 0.13, H * 0.22, 5); }
      D(ctx, W * 0.66, H * 0.78, s, L, { anim: 'loaf', t });
      if (f === 1) { ctx.fillStyle = '#ffe3d1'; ctx.fillRect(W * 0.6, H * 0.15, 30, H * 0.25); ctx.fillStyle = '#c9c3d6'; ctx.fillRect(W * 0.62, H * 0.38, 6, H * 0.12); }
      if (f === 2) { ctx.fillStyle = '#fff3b0'; ctx.fillRect(W * 0.55, H * 0.46, W * 0.22, 8); }
      caption(ctx, W, H, f === 0 ? 'a loaf and a loaf' : f === 1 ? '*butter knife approaches*' : 'it was the wrong one');
    },
    harisen(ctx, W, H, f, t) {
      bg(ctx, W, H, '#ff7eb6', '#ffd166', t, f === 1 ? 'speed' : 'dots');
      D(ctx, W * 0.3, H * 0.98, H * 0.65, NYA.npcLook('tora'), { anim: f === 1 ? 'cheer' : 'idle', t, eyes: f === 1 ? 'closed' : 'open', mouth: f === 1 ? 'open' : 'cat' });
      ctx.save(); ctx.translate(W * 0.68, H * 0.7); ctx.rotate(f === 2 ? -0.6 : 0);
      ctx.fillStyle = '#9b6a3e'; ctx.fillRect(-4, -H * 0.3, 8, H * 0.3);
      ctx.fillStyle = '#c9d2e0'; ctx.beginPath(); ctx.moveTo(-W * 0.08, -H * 0.28); ctx.quadraticCurveTo(0, -H * 0.38, W * 0.08, -H * 0.28); ctx.lineTo(W * 0.07, -H * 0.25); ctx.quadraticCurveTo(0, -H * 0.33, -W * 0.07, -H * 0.25); ctx.closePath(); ctx.fill();
      ctx.restore();
      caption(ctx, W, H, f === 0 ? 'this pickaxe missed a q1 tile' : f === 1 ? 'THWACK!!' : '*the pickaxe bows in apology*');
    },
    hat(ctx, W, H, f, t) {
      bg(ctx, W, H, '#ffb3a7', '#ffd23f', t, 'sparkle');
      const L = NYA.foremanLook;
      const s = H * 0.85;
      if (f === 0) D(ctx, W / 2, H * 1.0, s, L, { anim: 'idle', t });
      else {
        D(ctx, W / 2, H * 1.0, s, Object.assign({}, L, { hat: false }), { anim: 'idle', t, eyes: f === 2 ? 'half' : 'open' });
        // a second, smaller hard hat
        ctx.save(); ctx.translate(W / 2, H * 1.0); ctx.scale(s / 34 * 0.6, s / 34 * 0.6); ctx.translate(0, -12);
        ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(0, -25, 6.6, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8a91f'; ctx.fillRect(-8, -25.6, 16, 2);
        ctx.restore();
        if (f === 1) { ctx.save(); ctx.translate(W * 0.8, H * 0.3); ctx.rotate(0.4); ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(0, 0, H * 0.12, Math.PI, 0); ctx.fill(); ctx.restore(); }
      }
      caption(ctx, W, H, f === 0 ? 'the Foreman removes her hard hat' : f === 1 ? '!?' : 'it’s hard hats all the way down', '#ffd23f');
    },
    ears(ctx, W, H, f, t, L) {
      bg(ctx, W, H, '#b69cff', '#2a1f33', t, f === 1 ? 'speed' : 'dots');
      const L2 = randLookSeed(9);
      D(ctx, W * 0.36, H * 0.98, H * 0.7, L, { anim: 'idle', t, noPick: true });
      D(ctx, W * 0.68, H * 0.98, H * 0.7, L2, { anim: f === 1 ? 'cheer' : 'idle', t, eyes: f === 1 ? 'pin' : f === 2 ? 'half' : 'open', mouth: f === 1 ? 'open' : 'cat', noPick: true, face: -1 });
      // human-ear headband: ears poke out past the sides of her head (head radius 8.6, centre y −20.2 in sprite units)
      if (f < 2) {
        const u = H * 0.7 / 34;
        ctx.save(); ctx.translate(W * 0.36, H * 0.98); ctx.scale(u, u);
        ctx.fillStyle = '#ffe3d1'; ctx.strokeStyle = '#2a1f33'; ctx.lineWidth = 0.7;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * 9.4, -19.6, 1.6, 2.5, sx * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(160,90,80,0.6)'; ctx.beginPath(); ctx.arc(sx * 9.5, -19.6, 0.9, sx > 0 ? -1.2 : Math.PI - 1.2, sx > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
          ctx.strokeStyle = '#2a1f33';
        }
        ctx.restore();
      } else {
        ctx.save(); ctx.translate(W * 0.18, H * 0.4); ctx.rotate(-0.5);
        ctx.strokeStyle = '#ff7eb6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, H * 0.1, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#ffe3d1'; ctx.beginPath(); ctx.ellipse(-H * 0.1, 0, H * 0.025, H * 0.04, 0, 0, 7); ctx.ellipse(H * 0.1, 0, H * 0.025, H * 0.04, 0, 0, 7); ctx.fill();
        ctx.restore();
      }
      caption(ctx, W, H, f === 0 ? 'wait…' : f === 1 ? 'FOUR EARS?!' : 'novelty headband. phew.');
    },
    // Rare (after Project MEWCLEAR starts): two lab catgirls hold the core open with a screwdriver, a butterfly
    // flies past, and… they're remembered fondly.
    core(ctx, W, H, f, t, L) {
      const L2 = randLookSeed(11);
      if (f === 2) { shrine(ctx, W, H, t, L, L2); caption(ctx, W, H, 'rest in purrs'); return; }
      bg(ctx, W, H, '#25324a', '#4e3f66', t, 'dots');
      const s = H * 0.62, by = H * 0.86, up = f === 1;
      D(ctx, W * 0.26, by, s, L, { anim: 'idle', t, eyes: up ? 'up' : 'open', mouth: up ? 'open' : 'flat', noPick: true });
      D(ctx, W * 0.74, by, s, L2, { anim: 'idle', t, eyes: up ? 'up' : 'open', mouth: up ? 'open' : 'cat', noPick: true, face: -1 });
      // clipboard and pencil (the note-taker)
      const u = s / 34, cbx = W * 0.74 - 9 * u, cby = by - 15 * u;
      ctx.save(); ctx.translate(cbx, cby); ctx.rotate(-0.12);
      ctx.fillStyle = '#9a6a3e'; ctx.fillRect(-4.5 * u, -6 * u, 9 * u, 12 * u);
      ctx.fillStyle = '#fffdf5'; ctx.fillRect(-3.8 * u, -4.6 * u, 7.6 * u, 10 * u);
      ctx.fillStyle = '#c9c3d6'; ctx.fillRect(-2.4 * u, -6.6 * u, 4.8 * u, 1.8 * u);
      ctx.fillStyle = '#9b93a8'; for (let k = 0; k < 5; k++) ctx.fillRect(-3 * u, (-3 + k * 1.8) * u, (k === 4 && !up ? 3 : 6) * u, 0.4 * u);
      ctx.restore();
      // the table
      ctx.fillStyle = '#6b5a7a'; ctx.fillRect(W * 0.1, H * 0.62, W * 0.8, H * 0.05);
      ctx.fillStyle = '#4a3d58'; ctx.fillRect(W * 0.14, H * 0.67, W * 0.035, H * 0.33); ctx.fillRect(W * 0.825, H * 0.67, W * 0.035, H * 0.33);
      // the core: two silver half-shells around a dark sphere, the top one propped open on the left
      const cx = W * 0.49, r = H * 0.105, cy = H * 0.62 - H * 0.03 - r;
      ctx.fillStyle = '#3a3346'; ctx.fillRect(cx - r * 0.7, cy + r * 0.6, r * 1.4, H * 0.03 + r * 0.4); // stand
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy + r * 1.05, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1020'; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 3; ctx.beginPath(); ctx.moveTo(cx, cy + r * 1.05); ctx.arc(cx, cy + r * 1.05, r * 0.2, a - 0.45, a + 0.45); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy + r * 1.05, r * 0.05, 0, Math.PI * 2); ctx.fill();
      const glow = up ? 0.55 + 0.35 * Math.abs(Math.sin(t * 9)) : 0.28;
      const gg = ctx.createRadialGradient(cx - r * 0.5, cy, 0, cx - r * 0.5, cy, r * (up ? 3.2 : 1.6));
      gg.addColorStop(0, `rgba(140,200,255,${glow})`); gg.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.fillStyle = gg; ctx.fillRect(cx - r * 4, cy - r * 4, r * 8, r * 8);
      ctx.fillStyle = '#4a4458'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill(); // the core itself
      ctx.fillStyle = '#c9d2e0'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.closePath(); ctx.fill(); // lower shell
      ctx.fillStyle = '#e8eef8'; ctx.fillRect(cx - r * 0.7, cy + r * 0.25, r * 0.5, r * 0.12);
      const open = up ? -0.08 : -0.55; // the gap all but closes while nobody's looking
      ctx.save(); ctx.translate(cx + r, cy); ctx.rotate(open);
      ctx.fillStyle = '#d9e1ee'; ctx.beginPath(); ctx.arc(-r, 0, r, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); // upper shell
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 1.55, -r * 0.62, r * 0.4, r * 0.1);
      ctx.restore();
      // the screwdriver, from her paw into the gap
      const hx = W * 0.26 + 9 * u, hy = by - 13 * u;
      const tx = cx - r * 0.95, ty = cy - (up ? r * 0.05 : r * 0.32);
      ctx.strokeStyle = '#9ba4b4'; ctx.lineWidth = Math.max(2, H * 0.012); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx + (tx - hx) * 0.35, hy + (ty - hy) * 0.35); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = '#e0304e'; ctx.lineWidth = Math.max(4, H * 0.03);
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (tx - hx) * 0.35, hy + (ty - hy) * 0.35); ctx.stroke();
      ctx.lineCap = 'butt';
      if (up) { // the butterfly
        const bx = W * 0.5 + Math.sin(t * 2.2) * W * 0.12, byy = H * 0.2 + Math.sin(t * 3.1) * H * 0.04, wing = Math.abs(Math.sin(t * 18));
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(bx - H * 0.03 * wing, byy, H * 0.035 * wing + 1, H * 0.045, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx + H * 0.03 * wing, byy, H * 0.035 * wing + 1, H * 0.045, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9e7a'; ctx.beginPath(); ctx.ellipse(bx - H * 0.025 * wing, byy + H * 0.035, H * 0.02 * wing + 1, H * 0.025, 0.2, 0, Math.PI * 2); ctx.ellipse(bx + H * 0.025 * wing, byy + H * 0.035, H * 0.02 * wing + 1, H * 0.025, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1f33'; ctx.fillRect(bx - 1.5, byy - H * 0.035, 3, H * 0.08);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let k = 0; k < 4; k++) { const a = t * 3 + k * 1.6; ctx.fillRect(bx + Math.cos(a) * H * 0.09, byy + Math.sin(a) * H * 0.07, 3, 3); }
      }
      caption(ctx, W, H, up ? '…ooh, a butterfly!' : 'tickling the dragon’s tail…');
    },
  };
  // A Japanese funeral altar: kujira-maku stripes, flower wreaths, white-draped tiers, two framed portraits.
  function shrine(ctx, W, H, t, La, Lb) {
    const sw = W / 16;
    for (let k = 0; k < 16; k++) { ctx.fillStyle = k % 2 ? '#f4f1ea' : '#1a1418'; ctx.fillRect(k * sw, 0, sw + 1, H * 0.74); }
    ctx.fillStyle = '#7d7a88'; ctx.fillRect(0, H * 0.74, W, H * 0.26);
    ctx.fillStyle = '#9d9aa8';
    const tw = H * 0.07;
    for (let y = H * 0.74, row = 0; y < H; y += tw, row++) for (let x = row % 2 ? 0 : tw / 2; x < W; x += tw) ctx.fillRect(x + 1, y + 1, tw / 2 - 2, tw / 2 - 2);
    // flower wreaths on stands
    for (const wx of [W * 0.11, W * 0.89]) {
      const wy = H * 0.34, R = H * 0.17;
      ctx.strokeStyle = '#2a1f33'; ctx.lineWidth = Math.max(2, H * 0.01);
      ctx.beginPath(); ctx.moveTo(wx - R * 0.5, H * 0.78); ctx.lineTo(wx, wy); ctx.lineTo(wx + R * 0.5, H * 0.78); ctx.stroke();
      ctx.fillStyle = '#3d6fd6'; ctx.beginPath(); ctx.arc(wx, wy, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4f1ea'; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; ctx.beginPath(); ctx.arc(wx + Math.cos(a) * R * 0.86, wy + Math.sin(a) * R * 0.86, R * 0.11, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.arc(wx, wy, R * 0.66, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0304e'; ctx.beginPath(); ctx.arc(wx, wy, R * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9eb5'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; ctx.beginPath(); ctx.arc(wx + Math.cos(a) * R * 0.38, wy + Math.sin(a) * R * 0.38, R * 0.08, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fffdf5'; ctx.fillRect(wx - R * 0.16, wy - R * 0.3, R * 0.32, R * 0.6);
      ctx.fillStyle = '#2a1f33'; for (let k = 0; k < 3; k++) ctx.fillRect(wx - R * 0.08, wy - R * 0.2 + k * R * 0.17, R * 0.16, R * 0.05);
    }
    // the altar: two white-draped tiers
    ctx.fillStyle = '#ffffff'; ctx.fillRect(W * 0.22, H * 0.56, W * 0.56, H * 0.24);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(W * 0.28, H * 0.48, W * 0.44, H * 0.09);
    ctx.fillStyle = '#d9d4e2';
    for (let k = 1; k < 9; k++) ctx.fillRect(W * 0.22 + k * W * 0.062, H * 0.58, 2, H * 0.22);
    ctx.fillRect(W * 0.22, H * 0.56, W * 0.56, 3); ctx.fillRect(W * 0.28, H * 0.48, W * 0.44, 3);
    // portraits, smiling, no hard hats (kept below the logo)
    portrait(ctx, W * 0.4, H * 0.19, H * 0.3, La);
    portrait(ctx, W * 0.6, H * 0.19, H * 0.3, Lb);
    // candles, incense, and offerings (a fish, a little heap of catnip)
    for (const x of [W * 0.31, W * 0.69]) {
      ctx.fillStyle = '#fffdf5'; ctx.fillRect(x - H * 0.012, H * 0.42, H * 0.024, H * 0.07);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse(x, H * 0.405 + Math.sin(t * 9 + x) * 1, H * 0.01, H * 0.02, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#5b4a6a'; ctx.beginPath(); ctx.ellipse(W * 0.5, H * 0.6, H * 0.06, H * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(W * 0.5 - H * 0.05, H * 0.6, H * 0.1, H * 0.04);
    ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 2;
    for (const dx of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(W * 0.5 + dx * H * 0.015, H * 0.6); ctx.lineTo(W * 0.5 + dx * H * 0.025, H * 0.53); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,215,230,0.7)'; ctx.lineWidth = 1.5;
    for (const dx of [-1, 0, 1]) {
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const yy = H * 0.53 - k * H * 0.025, xx = W * 0.5 + dx * H * 0.025 + Math.sin(t * 2 + k * 0.7 + dx) * H * 0.015; if (k) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.fillStyle = '#e8e4ee'; ctx.beginPath(); ctx.ellipse(W * 0.36, H * 0.64, H * 0.07, H * 0.02, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ad7f0'; ctx.beginPath(); ctx.ellipse(W * 0.36, H * 0.625, H * 0.05, H * 0.015, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W * 0.36 + H * 0.045, H * 0.625); ctx.lineTo(W * 0.36 + H * 0.07, H * 0.61); ctx.lineTo(W * 0.36 + H * 0.07, H * 0.64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5fe08a'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(W * 0.64 + (k - 2) * H * 0.018, H * 0.63 - (k % 2) * H * 0.012, H * 0.016, H * 0.009, k * 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
  function portrait(ctx, cx, top, h, look) {
    const w = h * 0.78, x = cx - w / 2, pad = h * 0.07;
    ctx.fillStyle = '#1a1418'; ctx.fillRect(x, top, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x + pad, top + pad, w - pad * 2, h - pad * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, top + h); g.addColorStop(0, '#c9d6e8'); g.addColorStop(1, '#8a9ab3');
    ctx.fillStyle = g; ctx.fillRect(x, top, w, h);
    const ih = h - pad * 2, u = ih / 28; // show sprite units −34…−6: ears to shoulders
    D(ctx, cx, top + pad + 34 * u, 34 * u, Object.assign({}, look, { hat: false }), { anim: 'idle', t: 0, eyes: 'happy', noPick: true });
    ctx.restore();
    // black mourning ribbon across the top corners
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.moveTo(x, top + h * 0.22); ctx.lineTo(x + w * 0.28, top); ctx.lineTo(x + w * 0.4, top); ctx.lineTo(x, top + h * 0.32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w, top + h * 0.22); ctx.lineTo(x + w * 0.72, top); ctx.lineTo(x + w * 0.6, top); ctx.lineTo(x + w, top + h * 0.32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, top, h * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - w * 0.18, top - h * 0.06); ctx.lineTo(cx - w * 0.16, top + h * 0.06); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + w * 0.18, top - h * 0.06); ctx.lineTo(cx + w * 0.16, top + h * 0.06); ctx.closePath(); ctx.fill();
  }
  function randLookSeed(k) {
    const r = new NYA.RNG('look' + k);
    const fur = r.pick(NYA.FUR_KEYS);
    return { fur, hair: NYA.FURS[fur].sphynx ? 'bald' : r.pick(['bob', 'buzz', 'ponytail', 'undercut', 'twinbuns', 'velvet', 'bun']), outfit: r.pick(NYA.OUTFITS), hat: true };
  }

  NYA.randEyeLook = randLook;
  NYA.drawEyecatch = function (ctx, W, H, id, frame, t, look) {
    const fn = EYE[id] || EYE.box;
    ctx.save();
    fn(ctx, W, H, frame, t, look || randLook());
    logo(ctx, W, H);
    ctx.restore();
  };
})(globalThis.NYA = globalThis.NYA || {});
