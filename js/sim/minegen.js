// Procedural mine generation (GDD §3.2): seeded, every resource reachable.
(function (NYA) {
  'use strict';
  const T = NYA.T;

  function valueNoise(w, h, rng, cell) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const g = new Float32Array(gw * gh);
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const fx = x / cell, fy = y / cell;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1];
        const c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
        out[y * w + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
      }
    }
    return out;
  }

  function rollDensity(rng, bonus, tier) {
    tier = tier || 1;
    let d = 1;
    const p = Math.min(0.92, NYA.tierDensityP(tier) + (bonus || 0)), cap = NYA.tierDensityCap(tier);
    while (d < cap && rng.next() < p) d++;
    return d * NYA.tierDensityMult(tier);
  }
  function rollQuality(rng) {
    return rng.weighted([[1, 50], [2, 28], [3, 14], [4, 6], [5, 2]]);
  }

  class Mine {
    constructor(def, seed, opts) {
      opts = opts || {};
      this.def = def;
      this.tier = def.tier;
      this.seed = seed;
      this.w = def.w; this.h = def.h;
      const n = this.n = this.w * this.h;
      this.type = new Uint8Array(n);
      this.hp = new Float32Array(n);
      this.maxHp = new Float32Array(n);
      this.dens = new Uint16Array(n);     // initial density (items)
      this.q = new Uint8Array(n);         // quality
      this.dropped = new Uint16Array(n);  // items already dropped from this tile
      this.revealed = new Uint8Array(n);
      this.groove = new Int16Array(n).fill(-1);
      this.tangle = new Uint8Array(n);
      this.mud = new Uint8Array(n);       // muddy floor: slows walkers once the tile is open
      this.rubble = new Uint8Array(n);    // crossings left before rubble is trampled flat
      this.forbid = new Uint8Array(n);
      this.glow = new Uint8Array(n);      // "Glowing Nip" (+quality from Mewclear)
      this.cluster = new Int16Array(n).fill(-1); // Tanabata constellations
      this.mochi = new Uint8Array(n);     // Mochi Pounding tiles
      this.milk = new Float32Array(n);    // milk left in a milk node
      this.milkMax = new Float32Array(n);
      this.water = new Uint8Array(n);     // Sushi Grotto: 1 = this open tile is flooded
      this.sushi = new Uint8Array(n);     // Sushi Grotto: this ORE tile is wild nigiri (drops sushi, not catnip)
      this.crystal = new Uint8Array(n);   // Crystal Catacombs: this ORE tile is crystal catnip (refraction, resonance)
      this.hull = new Uint8Array(n);      // Greeble Crash Site: this HARD tile is the crashed saucer's hull
      this.ice = new Uint8Array(n);       // Purrmafrost Caverns: this open tile is ice (you slide across it)
      this.greebleSpawns = [];            // Greeble Crash Site: open tiles where a greeble starts
      this.elev = 0;
      this.motherlode = -1;
      this.box = -1;
      this.grooveGroups = [];
      const rng = new NYA.RNG('mine:' + seed);
      this.generate(rng, opts);
    }
    idx(x, y) { return y * this.w + x; }
    x(i) { return i % this.w; }
    y(i) { return (i / this.w) | 0; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    isOpen(i) { const t = this.type[i]; return t === T.OPEN || t === T.ELEV; }
    isMineable(i) { const t = this.type[i]; return t !== T.OPEN && t !== T.ELEV && t !== T.BEDROCK && t !== T.MILK; }
    isResource(i) { const t = this.type[i]; return t === T.ORE || t === T.BOX || t === T.MILK || t === T.NEST; }
    nbrs(i) {
      const x = i % this.w, y = (i / this.w) | 0, out = [];
      if (x > 0) out.push(i - 1);
      if (x < this.w - 1) out.push(i + 1);
      if (y > 0) out.push(i - this.w);
      if (y < this.h - 1) out.push(i + this.w);
      return out;
    }

    generate(rng, opts) {
      const { w, h, n } = this;
      const def = this.def, comp = def.comp;
      const type = this.type;
      type.fill(T.DIRT);

      // --- Elevator on an edge
      const side = rng.weighted([['top', 6], ['left', 2], ['right', 2]]);
      let ex, ey;
      if (side === 'top') { ex = rng.int(2, w - 3); ey = 0; }
      else if (side === 'left') { ex = 0; ey = rng.int(1, Math.max(1, Math.floor(h * 0.6))); }
      else { ex = w - 1; ey = rng.int(1, Math.max(1, Math.floor(h * 0.6))); }
      this.elev = this.idx(ex, ey);
      const nearElev = (i, r) => Math.abs(this.x(i) - ex) + Math.abs(this.y(i) - ey) <= r;

      // --- Base material from noise: dirt vs stone, hardstone in the densest stone
      const nA = valueNoise(w, h, rng, 4);
      const nB = valueNoise(w, h, rng, 3);
      const order = [];
      for (let i = 0; i < n; i++) order.push(i);
      order.sort((a, b) => nA[b] - nA[a]);
      const stoneCount = Math.round(n * comp.stone * 0.85);
      for (let k = 0; k < stoneCount; k++) type[order[k]] = T.STONE;
      if (comp.hard > 0) {
        const hardCount = Math.round(n * comp.hard);
        const st = order.slice(0, stoneCount).sort((a, b) => nB[b] - nB[a]);
        for (let k = 0; k < Math.min(hardCount, st.length); k++) type[st[k]] = T.HARD;
      }
      // the elevator's neighbourhood starts soft
      for (let i = 0; i < n; i++) if (nearElev(i, 1) && type[i] !== T.DIRT) type[i] = T.DIRT;
      type[this.elev] = T.ELEV;

      // --- Air pockets (blobs + drunkard's walk tunnels)
      const airTarget = Math.round(n * (comp.air + (opts.airAdd || 0)));
      let air = 0, guard = 0;
      const tunnelBias = NYA.hasQuirk(def, 'tangles') ? 0.55 : NYA.hasQuirk(def, 'mice') ? 0.75 : NYA.hasQuirk(def, 'greebles') ? 0.5 : NYA.hasQuirk(def, 'ice') ? 0.1 : 0.2;
      while (air < airTarget && guard++ < 500) {
        let c = rng.int(0, n - 1);
        if (nearElev(c, 3)) continue;
        const tunnel = rng.chance(tunnelBias);
        const len = tunnel ? rng.int(8, 20) : rng.int(2, 8);
        let dir = rng.int(0, 3);
        for (let s = 0; s < len && air < airTarget; s++) {
          if (type[c] !== T.OPEN && !nearElev(c, 2) && type[c] !== T.ELEV) { type[c] = T.OPEN; air++; }
          if (!tunnel || rng.chance(0.3)) dir = rng.int(0, 3);
          let cx = this.x(c), cy = this.y(c);
          if (dir === 0) cx++; else if (dir === 1) cx--; else if (dir === 2) cy++; else cy--;
          if (!this.inb(cx, cy)) { dir = rng.int(0, 3); continue; }
          c = this.idx(cx, cy);
        }
      }

      // --- Bedrock clumps
      const bedTarget = Math.round(n * comp.bedrock);
      let bed = 0; guard = 0;
      while (bed < bedTarget && guard++ < 400) {
        let c = rng.int(0, n - 1);
        const size = rng.int(1, 6);
        for (let s = 0; s < size && bed < bedTarget; s++) {
          if (!nearElev(c, 2) && (type[c] === T.DIRT || type[c] === T.STONE || type[c] === T.HARD)) { type[c] = T.BEDROCK; bed++; }
          const nb = this.nbrs(c);
          c = nb[rng.int(0, nb.length - 1)];
        }
      }

      // --- Catnip ore clusters
      const oreTarget = Math.round(n * comp.ore * (opts.oreMult || 1));
      let ore = 0; guard = 0;
      const solidOK = i => type[i] === T.DIRT || type[i] === T.STONE || type[i] === T.HARD;
      let starId = 0;
      while (opts.stars && ore < oreTarget && guard++ < 600) {
        // Tanabata: star-shaped clusters (a plus with random diagonal tips)
        const c = rng.int(0, n - 1);
        const cx = this.x(c), cy = this.y(c);
        if (cx < 1 || cy < 1 || cx > w - 2 || cy > h - 2 || nearElev(c, 2) || !solidOK(c)) continue;
        const shape = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const d of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) if (rng.chance(0.35)) shape.push(d);
        const baseQ = rollQuality(rng);
        let made = 0;
        for (const [dx, dy] of shape) {
          const i = this.idx(cx + dx, cy + dy);
          if (!solidOK(i)) continue;
          type[i] = T.ORE; this.q[i] = baseQ; this.dens[i] = rollDensity(rng, 0, this.tier); this.cluster[i] = starId;
          ore++; made++;
        }
        if (made) starId++;
      }
      while (ore < oreTarget && guard++ < 600) {
        let c = rng.int(0, n - 1);
        if (!solidOK(c) || nearElev(c, 1)) continue;
        const size = rng.weighted([[1, 3], [2, 3], [3, 3], [4, 2], [5, 1], [7, 1]]);
        const baseQ = rollQuality(rng);
        const frontier = [c];
        for (let s = 0; s < size && ore < oreTarget && frontier.length; s++) {
          const pickI = rng.int(0, frontier.length - 1);
          const t = frontier.splice(pickI, 1)[0];
          if (!solidOK(t)) continue;
          type[t] = T.ORE;
          let q = rng.chance(0.7) ? baseQ : rollQuality(rng);
          if (opts.qualityBonus && rng.chance(opts.qualityBonus)) q++;
          this.q[t] = Math.min(9, q);
          this.dens[t] = rollDensity(rng, opts.densityBonus, this.tier);
          ore++;
          for (const nb of this.nbrs(t)) if (solidOK(nb)) frontier.push(nb);
        }
      }

      // --- Event modifiers: golden quality, mochi tiles
      if (opts.qualityAdd || opts.mochi) {
        for (let i = 0; i < n; i++) {
          if (type[i] !== T.ORE) continue;
          if (opts.qualityAdd) this.q[i] = Math.min(9, this.q[i] + opts.qualityAdd);
          if (opts.mochi && rng.chance(opts.mochi)) this.mochi[i] = 1;
        }
      }

      // --- The crashed saucer (T8): a riveted hull of tough plating around an open cargo hold, sunk in a crater of
      // soft dirt. Placed before the grooves so the crash's fractures run through the rock around it.
      if (NYA.hasQuirk(def, 'greebles')) {
        const sr = new NYA.RNG('saucer:' + this.seed);
        const rx = Math.max(5, Math.round(w * 0.17)), ry = Math.max(2.5, Math.round(h * 0.12));
        const cx = sr.int(rx + 2, w - rx - 3), cy = sr.int(Math.max(ry + 4, Math.round(h * 0.45)), h - ry - 3);
        this.saucer = { x: cx, y: cy, rx, ry };
        const hold = [];
        for (let i = 0; i < n; i++) {
          if (i === this.elev || nearElev(i, 3)) continue;
          const dx = (this.x(i) - cx) / rx, dy = (this.y(i) - cy) / ry, e = dx * dx + dy * dy;
          if (e < 0.55) { type[i] = T.OPEN; hold.push(i); }
          else if (e < 1.05) { type[i] = T.HARD; this.hull[i] = 1; }
          else if (e < 2.1 && type[i] !== T.ORE) type[i] = sr.chance(0.12) ? T.OPEN : T.DIRT; // the crater
        }
        // seal the hull: every hold tile's neighbours are hold or plating
        const inHold = new Uint8Array(n); for (const i of hold) inHold[i] = 1;
        for (const i of hold) for (const nb of this.nbrs(i)) if (!inHold[nb] && !this.hull[nb] && nb !== this.elev) { type[nb] = T.HARD; this.hull[nb] = 1; }
        // impact fractures: grooved lines (Tier 2's quirk) radiating out through the rock from the crater's rim
        const rays = sr.int(7, 10);
        for (let k = 0; k < rays; k++) {
          const a = (k + sr.next() * 0.6) / rays * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
          const len = sr.int(4, 9), members = [];
          for (let r = 1.5; members.length < len && r < 6; r += 0.12) {
            const x = Math.round(cx + ca * rx * r), y = Math.round(cy + sa * ry * r);
            if (!this.inb(x, y)) break;
            const i = this.idx(x, y);
            if (members.indexOf(i) >= 0) continue;
            if (type[i] !== T.DIRT && type[i] !== T.STONE) { if (members.length) break; continue; }
            members.push(i);
          }
          if (members.length < 3) continue;
          const gid = this.grooveGroups.length;
          for (const i of members) { type[i] = T.GROOVE; this.groove[i] = gid; }
          this.grooveGroups.push(members);
        }
        // cargo: a few crates of top-shelf catnip on the hold's floor
        const floor = hold.filter(i => !hold.includes(i + w)).sort((a, b) => this.x(a) - this.x(b));
        for (let k = 1; k < floor.length - 1; k += 3) { const i = floor[k]; type[i] = T.ORE; this.q[i] = Math.min(9, rollQuality(sr) + 2); this.dens[i] = rollDensity(sr, 0.2, this.tier); }
        this.holdTiles = hold.filter(i => type[i] === T.OPEN);
      }

      // --- Grooved stone lines (T2 quirk)
      if (NYA.hasQuirk(def, 'grooved')) {
        const lines = Math.round(n / 34);
        let gid = this.grooveGroups.length;
        for (let L = 0; L < lines; L++) {
          let c = rng.int(0, n - 1);
          if (type[c] !== T.STONE) continue;
          const horiz = rng.chance(0.55);
          const len = rng.int(4, 9);
          const members = [];
          let cx = this.x(c), cy = this.y(c);
          for (let s = 0; s < len; s++) {
            if (!this.inb(cx, cy)) break;
            const i = this.idx(cx, cy);
            if (type[i] !== T.STONE && type[i] !== T.DIRT) break;
            if (this.groove[i] >= 0) break;
            type[i] = T.GROOVE; this.groove[i] = gid; members.push(i);
            if (horiz) cx++; else cy++;
            if (rng.chance(0.18)) { if (horiz) cy += rng.chance(0.5) ? 1 : -1; else cx += rng.chance(0.5) ? 1 : -1; }
          }
          if (members.length >= 3) { this.grooveGroups.push(members); gid++; }
          else for (const i of members) { type[i] = T.STONE; this.groove[i] = -1; }
        }
      }

      // --- Tangles (T3 quirk): yarn-choked open tiles
      if (NYA.hasQuirk(def, 'tangles')) {
        for (let i = 0; i < n; i++) if (type[i] === T.OPEN && rng.chance(0.45)) this.tangle[i] = 2;
      }

      // --- Ice (T9 quirk): most of the open cavern floor, never right by the elevator, with a few frozen boulders
      // standing alone in the open (places for a slide to stop). Own RNG stream.
      if (NYA.hasQuirk(def, 'ice')) {
        const ir = new NYA.RNG('ice:' + this.seed);
        for (let i = 0; i < n; i++) if (type[i] === T.OPEN && !nearElev(i, 2) && ir.chance(0.85)) this.ice[i] = 1;
        for (let i = 0; i < n; i++) {
          if (!this.ice[i] || !ir.chance(0.05)) continue;
          if (this.nbrs(i).filter(nb => type[nb] === T.OPEN).length >= 3) { type[i] = T.STONE; this.ice[i] = 0; }
        }
      }

      // --- Mud patches (rough ground, Tier 2+). Own RNG so adding mud doesn't reshuffle the rest of the mine.
      const mudShare = NYA.tierMud(def.tier);
      if (mudShare > 0) {
        const mr = new NYA.RNG('mud:' + this.seed);
        const target = Math.round(n * mudShare);
        let muddy = 0, g2 = 0;
        while (muddy < target && g2++ < 400) {
          let c = mr.int(0, n - 1);
          const len = mr.int(3, 8);
          for (let s = 0; s < len && muddy < target; s++) {
            if (!nearElev(c, 1) && !this.mud[c] && !this.ice[c] && type[c] !== T.BEDROCK && type[c] !== T.ELEV) { this.mud[c] = 1; muddy++; }
            const d = mr.int(0, 3), cx = this.x(c) + (d === 0 ? 1 : d === 1 ? -1 : 0), cy = this.y(c) + (d === 2 ? 1 : d === 3 ? -1 : 0);
            if (this.inb(cx, cy)) c = this.idx(cx, cy);
          }
        }
      }

      // --- Milk nodes (T4 quirk): pumped, never mined
      if (NYA.hasQuirk(def, 'milk')) {
        const nodes = rng.int(3, 5) + (opts.extraMilk || 0);
        let placed = 0; guard = 0;
        while (placed < nodes && guard++ < 300) {
          const c = rng.int(0, n - 1);
          if (!(type[c] === T.DIRT || type[c] === T.STONE || type[c] === T.HARD) || nearElev(c, 3)) continue;
          let crowd = false;
          for (let k = 0; k < n; k++) if (type[k] === T.MILK && Math.abs(this.x(k) - this.x(c)) + Math.abs(this.y(k) - this.y(c)) < 3) { crowd = true; break; }
          if (crowd) continue;
          type[c] = T.MILK;
          this.q[c] = rollQuality(rng);
          this.milk[c] = this.milkMax[c] = 50 + 25 * rollDensity(rng) + rng.int(0, 20);
          placed++;
        }
      }

      // --- Flooded chambers + wild nigiri (T5 quirk). Own RNG stream so other tiers' layouts don't change.
      if (NYA.hasQuirk(def, 'water')) {
        const wr = new NYA.RNG('water:' + this.seed);
        const chambers = Math.max(3, Math.round(n / 110));
        let made = 0; guard = 0;
        while (made < chambers && guard++ < 300) {
          const c = wr.int(0, n - 1);
          const ok = t => { const tx = this.x(t), ty = this.y(t); return ty >= 3 && tx >= 1 && tx <= w - 2 && ty <= h - 2 && !nearElev(t, 5) && type[t] !== T.MILK; };
          if (!ok(c)) continue;
          const size = wr.int(6, 16), set = new Set([c]), cells = [c];
          for (let tries = 0; cells.length < size && tries < 120; tries++) {
            const nb = this.nbrs(cells[wr.int(0, cells.length - 1)]);
            const t = nb[wr.int(0, nb.length - 1)];
            if (!set.has(t) && ok(t)) { set.add(t); cells.push(t); }
          }
          for (const t of cells) { type[t] = T.OPEN; this.water[t] = 1; }
          // sealed, sturdy walls: dirt and dry air around a chamber become stone
          for (const t of cells) for (const nb of this.nbrs(t)) if (!set.has(nb) && !this.water[nb] && (type[nb] === T.DIRT || type[nb] === T.OPEN) && nb !== this.elev) type[nb] = T.STONE;
          made++;
        }
        // nigiri grow like barnacles on the rock walls of the chambers (so harvesting them floods things)
        const want = Math.round(n / 55);
        const cand = [];
        for (let i = 0; i < n; i++) if ((type[i] === T.STONE || type[i] === T.HARD) && this.nbrs(i).some(nb => this.water[nb])) cand.push(i);
        for (let k = cand.length - 1; k > 0; k--) { const j = wr.int(0, k); const tmp = cand[k]; cand[k] = cand[j]; cand[j] = tmp; }
        for (let k = 0; k < Math.min(want, cand.length); k++) {
          const i = cand[k];
          type[i] = T.ORE; this.sushi[i] = 1; this.q[i] = 1; this.dens[i] = wr.int(1, 3);
        }
      }

      // --- Crystal catnip clusters (T7 quirk): connected crystals refract laser marks and resonate when struck.
      // Own RNG stream so other tiers' layouts don't change.
      if (NYA.hasQuirk(def, 'crystal')) {
        const cr = new NYA.RNG('crystal:' + this.seed);
        const want = Math.max(5, Math.round(n / 95));
        let made = 0; guard = 0;
        while (made < want && guard++ < 400) {
          const c = cr.int(0, n - 1);
          if (!solidOK(c) || nearElev(c, 4)) continue;
          const size = cr.int(4, 8), cells = [c], set = new Set([c]);
          for (let tries = 0; cells.length < size && tries < 60; tries++) {
            const nb = this.nbrs(cells[cr.int(0, cells.length - 1)]);
            const t = nb[cr.int(0, nb.length - 1)];
            if (!set.has(t) && solidOK(t) && !nearElev(t, 3)) { set.add(t); cells.push(t); }
          }
          if (cells.length < 3) continue;
          const q = Math.min(9, rollQuality(cr) + 1); // crystal catnip is the good stuff
          for (const t of cells) { type[t] = T.ORE; this.crystal[t] = 1; this.q[t] = q; this.dens[t] = rollDensity(cr, 0, this.tier); }
          made++;
        }
      }

      // --- Mouse nests (T6 quirk), each set in the wall of a little warren so the mice have somewhere to come
      // out. Own RNG stream so other tiers' layouts don't change.
      if (NYA.hasQuirk(def, 'mice')) {
        const mr = new NYA.RNG('mice:' + this.seed);
        const want = Math.max(4, Math.round(n / 120));
        const nests = [];
        guard = 0;
        while (nests.length < want && guard++ < 400) {
          const c = mr.int(0, n - 1);
          const cx = this.x(c), cy = this.y(c);
          if (cy < 2 || cx < 1 || cx > w - 2 || cy > h - 2 || nearElev(c, 6)) continue;
          if (!(type[c] === T.DIRT || type[c] === T.STONE || type[c] === T.HARD || type[c] === T.BEDROCK)) continue;
          if (nests.some(o => Math.abs(this.x(o) - cx) + Math.abs(this.y(o) - cy) < 6)) continue;
          const ok = t => t !== c && type[t] !== T.ELEV && type[t] !== T.NEST && !nearElev(t, 3);
          const first = this.nbrs(c).filter(ok);
          if (!first.length) continue;
          let cur = first[mr.int(0, first.length - 1)];
          const size = mr.int(2, 5);
          for (let k = 0; k < size; k++) {
            type[cur] = T.OPEN; this.mud[cur] = 0;
            const nb = this.nbrs(cur).filter(ok);
            if (!nb.length) break;
            cur = nb[mr.int(0, nb.length - 1)];
          }
          type[c] = T.NEST;
          nests.push(c);
        }
      }

      // --- Elevator neighbours are never bedrock
      for (const nb of this.nbrs(this.elev)) if (type[nb] === T.BEDROCK) type[nb] = T.DIRT;

      // --- Reachability: flood-fill from the elevator, carve bedrock until every resource is reachable
      this.ensureReachable();

      // --- Distances from the elevator through any non-bedrock tile (used for placing specials)
      const far = this.bfsAll(this.elev);

      // --- Greebles (T8): a few start in the saucer's hold, the rest anywhere open, away from the elevator
      if (NYA.hasQuirk(def, 'greebles')) {
        for (const i of this.holdTiles || []) this.mud[i] = 0; // the hold's deck is clean
        const gr = new NYA.RNG('greeble:' + this.seed);
        const want = Math.max(6, Math.round(n / 95));
        const open = [], hold = (this.holdTiles || []).filter(i => type[i] === T.OPEN);
        for (let i = 0; i < n; i++) if (type[i] === T.OPEN && !this.water[i] && !nearElev(i, 5) && far[i] >= 0 && hold.indexOf(i) < 0) open.push(i);
        const pick = list => list.splice(gr.int(0, list.length - 1), 1)[0];
        for (let k = 0; k < 4 && hold.length; k++) this.greebleSpawns.push(pick(hold));
        while (this.greebleSpawns.length < want && open.length) this.greebleSpawns.push(pick(open));
      }

      // --- Schrödinger's Box
      if (opts.box) {
        let best = -1, bestD = -1;
        for (let k = 0; k < 40; k++) {
          const i = rng.int(0, n - 1);
          if ((type[i] === T.DIRT || type[i] === T.STONE || type[i] === T.HARD) && far[i] > bestD) { best = i; bestD = far[i]; }
        }
        if (best >= 0) { type[best] = T.BOX; this.box = best; }
      }

      // --- The Motherlode
      if (opts.motherlodeChance && rng.chance(opts.motherlodeChance)) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (type[i] === T.ORE && !this.sushi[i] && far[i] > bestD && rng.chance(0.6)) { best = i; bestD = far[i]; }
        if (best >= 0) {
          this.motherlode = best;
          this.dens[best] = rng.int(30, 50) * NYA.tierDensityMult(this.tier);
          this.q[best] = Math.max(this.q[best], rng.int(2, 3));
        }
      }

      // --- HP
      const tHP = NYA.tierHP(this.tier);
      for (let i = 0; i < n; i++) {
        const t = type[i];
        let hp = 0;
        if (t === T.ORE) hp = NYA.ORE_LAYER_HP * tHP * NYA.tierCrumble(this.tier) * (this.sushi[i] ? this.dens[i] : this.dens[i] / NYA.tierDensityMult(this.tier));
        else if (NYA.BASE_HP[t]) hp = NYA.BASE_HP[t] * tHP;
        if (this.crystal[i]) hp *= NYA.CRYSTAL_HP;
        if (this.hull[i]) hp *= NYA.HULL_HP;
        this.hp[i] = this.maxHp[i] = hp;
      }

      // --- Fog: only the elevator and its neighbours are visible
      this.revealed[this.elev] = 1;
      for (const nb of this.nbrs(this.elev)) this.revealed[nb] = 1;
    }

    // BFS through everything except bedrock; returns distance array (-1 = unreachable)
    bfsAll(start) {
      const dist = new Int32Array(this.n).fill(-1);
      const q = [start]; dist[start] = 0;
      for (let h = 0; h < q.length; h++) {
        const c = q[h];
        for (const nb of this.nbrs(c)) {
          if (dist[nb] < 0 && this.type[nb] !== T.BEDROCK && this.type[nb] !== T.MILK) { dist[nb] = dist[c] + 1; q.push(nb); }
        }
      }
      return dist;
    }

    ensureReachable() {
      for (let pass = 0; pass < 50; pass++) {
        const dist = this.bfsAll(this.elev);
        let stuck = -1;
        for (let i = 0; i < this.n; i++) {
          const ty = this.type[i];
          if (dist[i] < 0 && (ty === T.ORE || ty === T.BOX || ty === T.OPEN || ty === T.NEST)) { stuck = i; break; }
          if (ty === T.MILK && !this.nbrs(i).some(nb => dist[nb] >= 0)) { stuck = i; break; }
        }
        if (stuck < 0) return;
        // plain BFS (through bedrock) from the stuck tile to the reachable region; downgrade bedrock on the path
        const prev = new Int32Array(this.n).fill(-2);
        const q = [stuck]; prev[stuck] = -1;
        let hit = -1;
        for (let h = 0; h < q.length && hit < 0; h++) {
          const c = q[h];
          for (const nb of this.nbrs(c)) {
            if (prev[nb] !== -2 || this.type[nb] === T.MILK) continue;
            prev[nb] = c;
            if (dist[nb] >= 0) { hit = nb; break; }
            q.push(nb);
          }
        }
        let c = hit >= 0 ? prev[hit] : -1;
        while (c >= 0) {
          if (this.type[c] === T.BEDROCK) this.type[c] = T.STONE;
          c = prev[c];
        }
      }
    }

    resourceStats() {
      let tiles = 0, value = 0, items = 0;
      const base = NYA.tierNip(this.tier) / NYA.tierDensityMult(this.tier);
      for (let i = 0; i < this.n; i++) {
        if (this.type[i] === T.ORE) { tiles++; const left = this.dens[i] - this.dropped[i]; items += left; if (!this.sushi[i]) value += left * this.q[i] * base; }
        else if (this.type[i] === T.BOX || this.type[i] === T.NEST) tiles++;
      }
      return { tiles, value, items };
    }
  }
  NYA.Mine = Mine;
})(globalThis.NYA = globalThis.NYA || {});
