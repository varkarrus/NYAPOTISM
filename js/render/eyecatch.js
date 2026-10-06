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
  const randLook = () => ({ fur: pick(NYA.FUR_KEYS), hair: pick(['bob', 'buzz', 'ponytail', 'undercut', 'twinbuns', 'velvet', 'bun']), outfit: pick(NYA.OUTFITS), hat: true });

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
  };
  function randLookSeed(k) {
    const r = new NYA.RNG('look' + k);
    return { fur: r.pick(NYA.FUR_KEYS), hair: r.pick(['bob', 'buzz', 'ponytail', 'undercut', 'twinbuns', 'velvet', 'bun']), outfit: r.pick(NYA.OUTFITS), hat: true };
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
