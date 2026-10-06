// Procedural chibi sprites: catgirls, NPCs and props, drawn with canvas paths.
// drawCatgirl(ctx, x, footY, size, look, pose) — size is the full sprite height in px.
(function (NYA) {
  'use strict';

  const SKIN = '#ffe3d1', INK = '#2a1f33', PINK = '#ff9ec4';

  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  NYA.shade = shade;

  function furOf(look) {
    if (look.fur === 'tan') return { hair: '#d9a066', hair2: '#a8703c', ear: '#a8703c', tail: '#d9a066' };
    return NYA.FURS[look.fur] || NYA.FURS.orange;
  }

  function ellipse(ctx, x, y, rx, ry, fill, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  NYA.rrect = rrect;

  // ---------------------------------------------------------------- pieces
  function drawEar(ctx, side, fur, droop, dog, tanuki) {
    ctx.save();
    ctx.scale(side, 1);
    if (tanuki) {
      // round raccoon-dog ears
      ctx.beginPath(); ctx.arc(7.2, -26.5, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#5a3f2a'; ctx.fill();
      ctx.beginPath(); ctx.arc(7.2, -26.3, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = '#d9a066'; ctx.fill();
      ctx.restore();
      return;
    }
    if (dog) {
      // floppy dog ears (Inspector Pochi)
      ctx.beginPath();
      ctx.moveTo(6.8, -27.2); ctx.quadraticCurveTo(14.8, -27.5, 14, -17); ctx.quadraticCurveTo(13.2, -13.4, 11, -15); ctx.quadraticCurveTo(10.6, -21, 7.8, -23.8); ctx.closePath();
      ctx.fillStyle = shade(fur.ear, -0.18); ctx.fill();
      ctx.restore();
      return;
    }
    const tipX = 7.2 + droop * 2.5, tipY = -31.5 + droop * 4.5;
    ctx.beginPath();
    ctx.moveTo(3.2, -26.5); ctx.lineTo(tipX, tipY); ctx.lineTo(8.6, -22.2); ctx.closePath();
    ctx.fillStyle = fur.ear; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.5, -25.6); ctx.lineTo(tipX - 0.4, tipY + 2.4); ctx.lineTo(7.6, -23.2); ctx.closePath();
    ctx.fillStyle = PINK; ctx.fill();
    if (fur.points || fur.tux) { // siamese point / tuxedo tip
      ctx.beginPath(); ctx.moveTo(tipX - 1.3, tipY + 2.6); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX + 0.6, tipY + 2.4); ctx.closePath();
      ctx.fillStyle = fur.points ? fur.hair2 : '#f6f0ea'; ctx.fill();
    }
    ctx.restore();
  }

  function drawTail(ctx, fur, t, mode) {
    const sway = mode === 'still' ? 0 : Math.sin(t * 3) * 2.2;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = fur.tail; ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.bezierCurveTo(-11, -8, -12 + sway * 0.3, -16, -9 + sway, -21);
    ctx.stroke();
    if (fur.points || fur.stripes) {
      ctx.strokeStyle = fur.points ? fur.hair2 : fur.stripes;
      ctx.lineWidth = 2.7;
      ctx.beginPath(); ctx.moveTo(-11 + sway * 0.6, -17.5); ctx.quadraticCurveTo(-10.5 + sway, -19.5, -9 + sway, -21); ctx.stroke();
    }
    ctx.restore();
  }

  function hairBack(ctx, style, fur, t) {
    const c = fur.hair, d = shade(fur.hair, -0.2);
    if (style === 'ponytail') {
      const sw = Math.sin(t * 4) * 1.5;
      ctx.beginPath(); ctx.moveTo(-1.5, -28); ctx.quadraticCurveTo(-7 + sw, -27, -9 + sw, -17); ctx.quadraticCurveTo(-5 + sw, -21, -1.5, -24);
      ctx.fillStyle = d; ctx.fill();
    } else if (style === 'braids') {
      for (const s of [-1, 1]) {
        ctx.fillStyle = d;
        for (let k = 0; k < 4; k++) ellipse(ctx, s * 8.3, -18 + k * 2.6, 1.7, 1.5, d);
        ellipse(ctx, s * 8.3, -7.6, 1.1, 1.1, '#ff7eb6');
      }
    } else if (style === 'bob' || style === 'tendrils' || style === 'bangs') {
      rrect(ctx, -9.2, -24, 18.4, style === 'bob' ? 11 : 14, 4); ctx.fillStyle = d; ctx.fill();
    } else if (style === 'frizz') {
      for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; ellipse(ctx, Math.cos(a) * 9.5, -21 + Math.sin(a) * 9.5, 4.3, 4.3, c); }
      for (const s of [-1, 1]) ellipse(ctx, s * 10, -16, 4, 4.5, c);
    } else if (style === 'sideshave') {
      rrect(ctx, 1.5, -24, 8.2, 13, 3); ctx.fillStyle = d; ctx.fill();
    }
  }

  function hairFront(ctx, style, fur, hat) {
    const c = fur.hair, hi = shade(fur.hair, 0.22), d = shade(fur.hair, -0.18);
    ctx.fillStyle = c;
    const cap = (ext) => { ctx.beginPath(); ctx.arc(0, -20.5, 9 + (ext || 0), Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); };
    switch (style) {
      case 'bald': // Sphynx: no hair at all, just a couple of forehead wrinkles
        if (!hat) { ctx.strokeStyle = shade(fur.hair, -0.22); ctx.lineWidth = 0.45; ctx.lineCap = 'round';
          for (const y of [-25.2, -24.1]) { ctx.beginPath(); ctx.moveTo(-2.4, y); ctx.quadraticCurveTo(0, y - 0.6, 2.4, y); ctx.stroke(); } }
        else { ctx.strokeStyle = shade(fur.hair, -0.22); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(-2, -24.6); ctx.quadraticCurveTo(0, -25.1, 2, -24.6); ctx.stroke(); }
        break;
      case 'buzz': case 'velvet': {
        ctx.fillStyle = style === 'velvet' ? shade(c, 0.05) : shade(c, 0.12);
        ctx.beginPath(); ctx.arc(0, -20.5, 8.7, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(6.5, -24.5); ctx.quadraticCurveTo(0, -26.3, -6.5, -24.5); ctx.closePath(); ctx.fill();
        if (style === 'velvet') { ctx.strokeStyle = shade(c, 0.3); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(0, -20.5, 8.2, Math.PI * 1.25, Math.PI * 1.5); ctx.stroke(); }
        break;
      }
      case 'hightight':
        ctx.fillStyle = shade(c, 0.15);
        ctx.beginPath(); ctx.arc(0, -20.5, 8.8, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c; rrect(ctx, -5, -30.3, 10, 4.3, 2); ctx.fill();
        break;
      case 'undercut':
        ctx.fillStyle = shade(c, 0.25);
        ctx.beginPath(); ctx.arc(0, -20.5, 8.8, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(-7, -26); ctx.quadraticCurveTo(0, -33, 8.5, -26.5); ctx.quadraticCurveTo(3, -25.5, 6, -22); ctx.quadraticCurveTo(-1, -26, -7, -24); ctx.closePath(); ctx.fill();
        break;
      case 'slick':
        cap(0.2);
        ctx.strokeStyle = hi; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5, -27); ctx.quadraticCurveTo(0, -29.4, 5, -27); ctx.stroke();
        break;
      case 'sideshave':
        cap(0.2);
        ctx.fillStyle = d; ctx.beginPath(); ctx.moveTo(-1, -29.5); ctx.quadraticCurveTo(8, -28, 9.2, -18); ctx.lineTo(6.5, -20); ctx.quadraticCurveTo(4, -26, -1, -26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(c, 0.35); ctx.beginPath(); ctx.arc(-6.4, -21, 2.6, Math.PI * 0.9, Math.PI * 1.6); ctx.fill();
        break;
      case 'bob':
        cap(0.4);
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-9.3, -22); ctx.lineTo(-9.3, -13.5); ctx.lineTo(-6.6, -13.5); ctx.lineTo(-6.6, -21); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9.3, -22); ctx.lineTo(9.3, -13.5); ctx.lineTo(6.6, -13.5); ctx.lineTo(6.6, -21); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-7.5, -24); ctx.lineTo(7.5, -24); ctx.lineTo(7, -21.4); ctx.lineTo(-7, -21.4); ctx.closePath(); ctx.fill();
        break;
      case 'bangs':
        cap(0.4);
        ctx.beginPath(); ctx.moveTo(-8, -24); ctx.lineTo(8, -24); ctx.lineTo(7, -17.8); ctx.lineTo(4, -19.2); ctx.lineTo(1, -17.6); ctx.lineTo(-2, -19.2); ctx.lineTo(-5, -17.8); ctx.lineTo(-7.6, -19.6); ctx.closePath(); ctx.fill();
        break;
      case 'tendrils':
        cap(0.3);
        ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(6, -24); ctx.lineTo(5.5, -21.5); ctx.lineTo(-5.5, -21.5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 7.8, -23); ctx.quadraticCurveTo(s * 9.6, -17, s * 7.8, -12.5); ctx.stroke(); }
        break;
      case 'bun': case 'twinbuns': case 'ponytail': case 'braids':
        cap(0.2);
        ctx.beginPath(); ctx.moveTo(-6.8, -24); ctx.quadraticCurveTo(-2, -21, 0.5, -24.5); ctx.quadraticCurveTo(3, -21.5, 6.8, -24); ctx.lineTo(6.5, -26); ctx.lineTo(-6.5, -26); ctx.closePath(); ctx.fill();
        if (!hat && style === 'bun') ellipse(ctx, 0, -30.2, 3.4, 3, c);
        if (style === 'twinbuns') { if (hat) { ellipse(ctx, -9, -22, 2.6, 2.6, c); ellipse(ctx, 9, -22, 2.6, 2.6, c); } else { ellipse(ctx, -6.5, -27.2, 3, 3, c); ellipse(ctx, 6.5, -27.2, 3, 3, c); } }
        break;
      case 'frizz':
        cap(0.8);
        for (let k = 0; k < 5; k++) ellipse(ctx, -6 + k * 3, -25.2 + (k % 2) * 0.8, 2.5, 2.2, c);
        break;
      default:
        cap(0.2);
    }
    // fur patterns
    if (fur.stripes && style !== 'buzz') {
      ctx.strokeStyle = fur.stripes; ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (const x of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(x, -28.6 + Math.abs(x) * 0.3); ctx.lineTo(x * 1.1, -26); ctx.stroke(); }
    }
    if (fur.patches) {
      ellipse(ctx, -4.5, -26.6, 2.6, 1.6, fur.patches[0], -0.3);
      ellipse(ctx, 4.2, -27.2, 2.1, 1.4, fur.patches[1], 0.3);
    }
    if (fur.tux) ellipse(ctx, 0, -26.2, 2.2, 1.6, '#f6f0ea');
  }

  function drawFace(ctx, eyes, mouth, look) {
    const ey = -19.2;
    if (eyes === 'closed' || eyes === 'happy') {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        if (eyes === 'happy') ctx.arc(s * 3.5, ey + 0.8, 1.6, Math.PI * 1.1, Math.PI * 1.9);
        else { ctx.moveTo(s * 3.5 - 1.6, ey); ctx.quadraticCurveTo(s * 3.5, ey + 1.3, s * 3.5 + 1.6, ey); }
        ctx.stroke();
      }
    } else if (eyes === 'dizzy') {
      ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 3.5, ey, 1.6, 0, Math.PI * 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(s * 3.5, ey, 0.7, 0, Math.PI * 1.6); ctx.stroke(); }
    } else if (eyes === 'pin') {
      for (const s of [-1, 1]) { ellipse(ctx, s * 3.5, ey, 1.9, 2.4, '#fff'); ctx.lineWidth = 0.4; ctx.strokeStyle = INK; ctx.stroke(); ellipse(ctx, s * 3.5, ey, 0.35, 0.35, INK); }
    } else if (eyes === 'half') {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 3.5, ey + 0.4, 1.8, 1.5, INK);
        ctx.fillStyle = SKIN; ctx.fillRect(s * 3.5 - 2, ey - 2.4, 4, 2.2);
        ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(s * 3.5 - 2, ey - 0.2); ctx.lineTo(s * 3.5 + 2, ey - 0.2); ctx.stroke();
      }
    } else {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 3.5, ey, 1.85, 2.5, INK);
        ellipse(ctx, s * 3.5, ey + 0.7, 1.3, 1.3, look.eyeColor || '#7a4fd6');
        ellipse(ctx, s * 3.5 + 0.55, ey - 0.9, 0.7, 0.8, '#fff');
        ellipse(ctx, s * 3.5 - 0.6, ey + 1.1, 0.3, 0.3, '#fff');
      }
    }
    ellipse(ctx, -5.6, -16.4, 1.5, 0.8, 'rgba(255,120,160,0.45)');
    ellipse(ctx, 5.6, -16.4, 1.5, 0.8, 'rgba(255,120,160,0.45)');
    ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
    if (mouth === 'open') { ellipse(ctx, 0, -15, 1.2, 1.5, '#a33a5a'); }
    else if (mouth === 'flat') { ctx.beginPath(); ctx.moveTo(-1.3, -15.3); ctx.lineTo(1.3, -15.3); ctx.stroke(); }
    else if (mouth === 'none') { /* silence */ }
    else {
      // one continuous "ω" (a :3 mouth): left lobe then right lobe, no jump stroke between them
      ctx.lineWidth = 0.55; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(-0.7, -15.9, 0.7, Math.PI, 0, true); ctx.arc(0.7, -15.9, 0.7, Math.PI, 0, true); ctx.stroke();
    }
  }

  function drawHat(ctx, t, lampOn) {
    // hard hat sits between the ears
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath(); ctx.arc(0, -25, 6.6, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8a91f';
    rrect(ctx, -8.2, -25.6, 16.4, 2.1, 1); ctx.fill();
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(-0.6, -31.2, 1.2, 5.4);
    ellipse(ctx, 0, -27.6, 1.6, 1.3, lampOn ? '#fffbe0' : '#c9c9c9');
  }

  const FOLD_GLOW = ['#ffd23f', '#7af0e0', '#ff7eb6', '#b69cff', '#ff9e7a', '#7af0a0'];
  function drawPick(ctx, ang, fold) {
    ctx.save();
    ctx.translate(4.5, -10.5);
    ctx.rotate(ang);
    if (fold) {
      // heavier technique: a bigger head with a colored aura
      const k = 1 + Math.min(0.6, 0.15 * fold);
      ctx.save(); ctx.translate(0, -9.5); ctx.scale(k, k); ctx.translate(0, 9.5);
      ctx.fillStyle = FOLD_GLOW[(fold - 1) % FOLD_GLOW.length]; ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.ellipse(0, -10, 7.5, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
      ctx.scale(k, k);
    }
    ctx.fillStyle = '#9b6a3e'; rrect(ctx, -0.7, -11, 1.5, 12, 0.6); ctx.fill();
    ctx.fillStyle = '#c9d2e0';
    ctx.beginPath(); ctx.moveTo(-6, -9.5); ctx.quadraticCurveTo(0, -13.5, 6, -9.5); ctx.lineTo(5.5, -8.6); ctx.quadraticCurveTo(0, -11.6, -5.5, -8.6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- main
  // pose: { anim, t, face, swing (0..1), eyes, mouth, hat, lamp, droop, prop }
  // Every catgirl gets one thick outline around her whole silhouette (no internal outlines): draw her to an
  // offscreen canvas, stamp a dark copy of that silhouette around her, then draw her on top.
  const OUTLINE = INK, BOX_W = 52, BOX_H = 50, ANCHOR_Y = 42; // sprite units (size / 34)
  const pool = new Map();
  function scratch(w, h) {
    const key = Math.ceil(w / 32) + 'x' + Math.ceil(h / 32);
    let p = pool.get(key);
    if (!p) {
      if (pool.size > 24) pool.clear();
      const mk = () => { const c = document.createElement('canvas'); c.width = Math.ceil(w / 32) * 32; c.height = Math.ceil(h / 32) * 32; return c; };
      p = { a: mk(), b: mk() }; pool.set(key, p);
    }
    return p;
  }
  NYA.drawCatgirl = function (ctx, x, footY, size, look, pose) {
    pose = pose || {};
    if (typeof document === 'undefined' || pose.noOutline) return drawCatgirlRaw(ctx, x, footY, size, look, pose);
    const u = size / 34;
    const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
    const k = Math.max(1, Math.hypot(m.a, m.b)); // device pixels per canvas unit, so the sprite stays crisp
    const W = BOX_W * u * k, H = BOX_H * u * k;
    if (W < 4 || H < 4) return;
    const { a, b } = scratch(W, H);
    const ca = a.getContext('2d'), cb = b.getContext('2d');
    ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, a.width, a.height);
    ca.setTransform(k, 0, 0, k, 0, 0);
    drawCatgirlRaw(ca, BOX_W * u / 2, ANCHOR_Y * u, size, look, Object.assign({}, pose, { noShadow: true }));
    cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, b.width, b.height);
    cb.globalCompositeOperation = 'source-over'; cb.drawImage(a, 0, 0);
    cb.globalCompositeOperation = 'source-in'; cb.fillStyle = OUTLINE; cb.fillRect(0, 0, b.width, b.height);
    cb.globalCompositeOperation = 'source-over';
    // shadow under her feet, then the outline stamps, then the sprite
    if (!pose.noShadow) { ctx.save(); ctx.translate(x, footY); ctx.scale(u, u); ellipse(ctx, 0, 0, 8.5, 2.2, 'rgba(0,0,0,0.28)'); ctx.restore(); }
    const ox = x - BOX_W * u / 2, oy = footY - ANCHOR_Y * u, sw = a.width / k, sh = a.height / k;
    const t = Math.max(1 / k, u * 0.85);
    for (let i = 0; i < 12; i++) { const ang = i * Math.PI / 6; ctx.drawImage(b, ox + Math.cos(ang) * t, oy + Math.sin(ang) * t, sw, sh); }
    ctx.drawImage(a, ox, oy, sw, sh);
  };
  function drawCatgirlRaw(ctx, x, footY, size, look, pose) {
    pose = pose || {};
    const u = size / 34;
    const t = pose.t || 0;
    const anim = pose.anim || 'idle';
    const fur = furOf(look);
    const face = pose.face || 1;
    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(u * face, u);

    // shadow
    if (!pose.noShadow) ellipse(ctx, 0, 0, 8.5, 2.2, 'rgba(0,0,0,0.28)');

    if (anim === 'loaf' || anim === 'sleep') { drawLoaf(ctx, look, fur, t, anim); ctx.restore(); return; }
    if (anim === 'box') { drawBoxed(ctx, look, fur, t); ctx.restore(); return; }
    if (anim === 'flat') { ctx.rotate(-Math.PI / 2); ctx.translate(4, 16); }

    let bob = 0, legA = 0;
    if (anim === 'walk' || anim === 'zoom') { const f = anim === 'zoom' ? 18 : 11; bob = Math.abs(Math.sin(t * f)) * -1.2; legA = Math.sin(t * f) * 1.6; }
    else if (anim === 'idle' || anim === 'smoke') bob = Math.sin(t * 2) * 0.3;
    else if (anim === 'cheer') bob = -Math.abs(Math.sin(t * 8)) * 2.5;
    ctx.translate(0, bob);

    drawTail(ctx, fur, t, anim === 'flat' ? 'still' : 'sway');
    // legs
    ctx.fillStyle = '#4a3a55';
    rrect(ctx, -4.2, -6.5 + Math.max(0, legA), 3.4, 6.5 - Math.max(0, legA), 1.2); ctx.fill();
    rrect(ctx, 0.8, -6.5 + Math.max(0, -legA), 3.4, 6.5 - Math.max(0, -legA), 1.2); ctx.fill();
    ctx.fillStyle = '#6b5577';
    rrect(ctx, -4.6, -1.6, 4, 1.8, 0.8); ctx.fill(); rrect(ctx, 0.6, -1.6, 4, 1.8, 0.8); ctx.fill();
    // body (overalls)
    const out = look.outfit || '#ff8fb1';
    ctx.fillStyle = out;
    rrect(ctx, -5.8, -14.2, 11.6, 9.4, 3.2); ctx.fill();
    ctx.fillStyle = shade(out, -0.15); ctx.fillRect(-5.8, -7.8, 11.6, 1.4);
    ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85; rrect(ctx, -2.2, -13.6, 4.4, 3.2, 1.1); ctx.fill(); ctx.globalAlpha = 1;
    if (fur.tux) { ctx.fillStyle = '#f6f0ea'; rrect(ctx, -2.2, -13.6, 4.4, 3.4, 1.2); ctx.fill(); }
    if (look.prop === 'harisen') { ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-11, -17); ctx.lineTo(-8, -18.6); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 0.5; ctx.stroke(); }

    // arms + pick
    ctx.fillStyle = SKIN;
    if (anim === 'mine') {
      const sw = pose.swing || 0; // 1 = just swung
      const ang = -1.9 + (1 - sw) * 0 + (sw > 0 ? (1 - sw) * 2.4 : 0);
      drawPick(ctx, sw > 0 ? -1.6 + (1 - sw) * 2.3 : -1.6 + Math.sin(t * 2) * 0.1, pose.fold);
      void ang;
      ellipse(ctx, 5, -10.5, 1.7, 1.7, SKIN);
    } else if (anim === 'groom') {
      ellipse(ctx, 3, -17.5 + Math.sin(t * 10) * 0.8, 1.9, 1.9, SKIN);
    } else if (anim === 'smoke') {
      ellipse(ctx, 3.5, -15.2, 1.7, 1.7, SKIN);
      ctx.fillStyle = '#e9f5d0'; ctx.fillRect(4.6, -15.8, 3.6, 0.9);
      ellipse(ctx, 8.5, -15.4, 0.6, 0.6, '#ff7a3c');
    } else if (anim === 'cheer') {
      ellipse(ctx, -7, -18, 1.7, 1.7, SKIN); ellipse(ctx, 7, -18, 1.7, 1.7, SKIN);
    } else if (pose.carry) {
      ellipse(ctx, -5.6, -9.5, 1.6, 1.6, SKIN); ellipse(ctx, 5.6, -9.5, 1.6, 1.6, SKIN);
    } else {
      ellipse(ctx, -6, -8.8 + legA * 0.3, 1.6, 1.6, SKIN); ellipse(ctx, 6, -8.8 - legA * 0.3, 1.6, 1.6, SKIN);
      if (look.hat !== false && anim !== 'flat' && !pose.noPick) drawPick(ctx, 0.5);
    }
    if (pose.bag) { // tiny sack on the back
      ellipse(ctx, -6.5, -11, 3.2 + Math.min(1.5, pose.bag * 0.3), 3.2, '#c9a26a');
      ctx.fillStyle = '#7af0a0'; ctx.fillRect(-7.2, -14.4, 1.4, 1.4);
    }

    // head
    hairBack(ctx, look.hair, fur, t);
    ellipse(ctx, 0, -20.2, 8.6, 8.2, SKIN);
    ellipse(ctx, 0, -20.2, 8.6, 8.2, null);
    const eyes = pose.eyes || (anim === 'flat' ? 'dizzy' : anim === 'mine' && pose.swing > 0.6 ? 'closed' : 'open');
    drawFace(ctx, eyes, pose.mouth || (anim === 'cheer' ? 'open' : 'cat'), look);
    hairFront(ctx, look.hair, fur, look.hat !== false);
    if (look.prop === 'goggles') {
      ctx.strokeStyle = '#5b4a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, -24); ctx.lineTo(9, -24); ctx.stroke();
      for (const s of [-1, 1]) { ellipse(ctx, s * 3.6, -24.4, 2.5, 2.1, '#7ad7f0'); ctx.lineWidth = 0.9; ctx.strokeStyle = '#5b4a3a'; ctx.stroke(); }
    }
    if (look.prop === 'shades') {
      ctx.fillStyle = INK; rrect(ctx, -6.6, -21, 5.6, 3, 1.2); ctx.fill(); rrect(ctx, 1, -21, 5.6, 3, 1.2); ctx.fill(); ctx.fillRect(-1.2, -20.4, 2.4, 0.7);
    }
    // ears always visible (GDD §20.3)
    const droop = pose.droop || 0;
    drawEar(ctx, -1, fur, droop, look.dog, look.tanuki); drawEar(ctx, 1, fur, droop, look.dog, look.tanuki);
    if (look.tanuki) { ctx.fillStyle = 'rgba(70,45,30,0.55)'; ctx.beginPath(); ctx.ellipse(-3.5, -18.6, 3, 2.4, 0.2, 0, Math.PI * 2); ctx.ellipse(3.5, -18.6, 3, 2.4, -0.2, 0, Math.PI * 2); ctx.fill(); }
    if (look.hat !== false) drawHat(ctx, t, pose.lamp);
    if (pose.lantern) {
      ctx.strokeStyle = '#5a3f2a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-9, -15); ctx.stroke();
      ctx.fillStyle = '#ffb36b'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 7); ctx.beginPath(); ctx.arc(-9.5, -7, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff7a3c'; NYA.rrect(ctx, -11, -10, 3.2, 4.2, 1.2); ctx.fill();
    }
    if (look.prop === 'beret') { ellipse(ctx, -1, -28, 7.2, 2.4, '#6f8f4a', -0.15); ellipse(ctx, 3, -29.4, 1, 1, '#ffd23f'); }
    if (look.prop === 'leaf') { ellipse(ctx, 0, -30, 3, 1.5, '#5fe08a', -0.6); }
    ctx.restore();
  };

  function drawLoaf(ctx, look, fur, t, anim) {
    const out = look.outfit || '#ff8fb1';
    const breathe = Math.sin(t * 2.2) * 0.4;
    ctx.save();
    ctx.translate(0, 1);
    // tail wrapped around
    ctx.strokeStyle = fur.tail; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-4, 1.5, 4, 0.5); ctx.stroke();
    ellipse(ctx, 0, -6, 9.5, 6 + breathe, out);
    ellipse(ctx, 0, -8.5, 8, 3, shade(out, 0.15));
    ellipse(ctx, 0, -13, 7.2, 6.8, SKIN);
    ctx.save(); ctx.translate(0, 7.5); ctx.scale(0.82, 0.82);
    drawFace(ctx, 'closed', anim === 'sleep' ? 'flat' : 'cat', look);
    hairFront(ctx, look.hair, fur, look.hat !== false);
    drawEar(ctx, -1, fur, 0.3, look.dog); drawEar(ctx, 1, fur, 0.3, look.dog);
    if (look.hat !== false) drawHat(ctx, t, false);
    ctx.restore();
    ctx.restore();
  }

  function drawBoxed(ctx, look, fur, t) {
    ctx.save();
    ctx.save(); ctx.translate(0, 4); ctx.scale(0.9, 0.9);
    ellipse(ctx, 0, -13, 7.6, 7.2, SKIN);
    ctx.translate(0, 6.5);
    drawFace(ctx, 'happy', 'cat', look);
    hairFront(ctx, look.hair, fur, false);
    drawEar(ctx, -1, fur, 0, look.dog); drawEar(ctx, 1, fur, 0, look.dog);
    ctx.restore();
    NYA.drawBox(ctx, 0, 0, 15, t, false);
    ctx.restore();
  }

  // cardboard box, centered at x, bottom at y, width w (in current units)
  NYA.drawBox = function (ctx, x, y, w, t, hum) {
    const h = w * 0.62;
    const wob = hum ? Math.sin(t * 9) * 0.04 : 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(wob);
    ctx.fillStyle = '#c9925a'; ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#b07a45'; ctx.fillRect(-w / 2, -h, w, h * 0.18);
    ctx.fillStyle = '#ddb07a';
    ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(-w / 2 - w * 0.12, -h - h * 0.3); ctx.lineTo(-w * 0.05, -h - h * 0.3); ctx.lineTo(0, -h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w / 2, -h); ctx.lineTo(w / 2 + w * 0.12, -h - h * 0.3); ctx.lineTo(w * 0.05, -h - h * 0.3); ctx.lineTo(0, -h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,10,0.5)'; ctx.lineWidth = w * 0.03; ctx.strokeRect(-w / 2, -h, w, h);
    ctx.restore();
  };

  // NPC looks
  NYA.npcLook = function (key) {
    const c = NYA.CAST[key];
    if (!c) return { fur: 'orange', hair: 'bob', outfit: '#ff8fb1' };
    return Object.assign({ eyeColor: key === 'pochi' ? '#5a3a1a' : key === 'tora' ? '#3fb36a' : '#7a4fd6' }, c.look);
  };
  NYA.foremanLook = { fur: 'orange', hair: 'bob', outfit: '#ff9e7a', hat: true, eyeColor: '#c46a1c' };

  // quality ore shapes (centered at x,y radius r)
  NYA.drawOreShape = function (ctx, shape, x, y, r, fill, stroke) {
    ctx.beginPath();
    if (shape === 'tri') { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.95, y + r * 0.75); ctx.lineTo(x - r * 0.95, y + r * 0.75); }
    else if (shape === 'square') { ctx.rect(x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56); }
    else if (shape === 'diamond') { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r * 0.8, y); ctx.lineTo(x, y + r * 1.1); ctx.lineTo(x - r * 0.8, y); }
    else if (shape === 'star') {
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r * 1.1; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    } else if (shape === 'heart') {
      ctx.moveTo(x, y + r * 0.95);
      ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.45);
      ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.95);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, r * 0.22); ctx.stroke(); }
  };

  // Render a portrait into a canvas (cached by key)
  const portraitCache = new Map();
  NYA.portrait = function (key, look, size, pose) {
    const k = key + '|' + size + '|' + JSON.stringify(look) + '|' + (pose ? JSON.stringify(pose) : '');
    if (portraitCache.has(k)) return portraitCache.get(k);
    const c = document.createElement('canvas');
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    c.width = c.height = Math.round(size * dpr);
    c.style.width = c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    // bust crop: draw large, anchored so the head fills the frame
    NYA.drawCatgirl(ctx, size / 2, size * 1.55, size * 1.75, look, Object.assign({ noShadow: true, noPick: true, t: 0 }, pose || {}));
    if (portraitCache.size > 300) portraitCache.clear();
    portraitCache.set(k, c);
    return c;
  };
})(globalThis.NYA = globalThis.NYA || {});
