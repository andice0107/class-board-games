/* 圍棋：提子、打劫、禁止自殺、數子法（中國規則）計分、蒙地卡羅電腦、死活估計、棋盤圖。
   棋盤是長度 n*n 的陣列：0 空、1 黑、2 白。 */
window.GO = (function () {
  'use strict';
  var NB = {};
  function nbrs(n, i) {
    var k = n + ':' + i; if (NB[k]) return NB[k];
    var r = Math.floor(i / n), c = i % n, a = [];
    if (r > 0) a.push(i - n); if (r < n - 1) a.push(i + n); if (c > 0) a.push(i - 1); if (c < n - 1) a.push(i + 1);
    return (NB[k] = a);
  }
  function empty(n) { var b = []; for (var i = 0; i < n * n; i++) b.push(0); return b; }
  function group(b, n, i) {
    var col = b[i], seen = {}, st = [i], stones = [], libs = {}; seen[i] = 1;
    while (st.length) { var x = st.pop(); stones.push(x); nbrs(n, x).forEach(function (y) { if (b[y] === 0) libs[y] = 1; else if (b[y] === col && !seen[y]) { seen[y] = 1; st.push(y); } }); }
    return { stones: stones, libs: Object.keys(libs).map(Number) };
  }
  /* 下一手：回傳 {b, caps, ko} 或 null（不合法） */
  function play(b, n, i, c, ko) {
    if (b[i] !== 0 || i === ko) return null;
    var nb = b.slice(), op = 3 - c, caps = 0, capAt = -1; nb[i] = c;
    nbrs(n, i).forEach(function (y) { if (nb[y] === op) { var g = group(nb, n, y); if (!g.libs.length) { caps += g.stones.length; if (g.stones.length === 1) capAt = g.stones[0]; g.stones.forEach(function (s) { nb[s] = 0; }); } } });
    var me = group(nb, n, i);
    if (!me.libs.length) return null; // 自殺
    var nko = caps === 1 && me.stones.length === 1 && me.libs.length === 1 ? capAt : -1;
    return { b: nb, caps: caps, ko: nko };
  }
  function isEye(b, n, i, c) {
    if (b[i] !== 0) return false;
    var ns = nbrs(n, i); if (!ns.every(function (y) { return b[y] === c; })) return false;
    var r = Math.floor(i / n), cc = i % n, bad = 0, edge = r === 0 || r === n - 1 || cc === 0 || cc === n - 1;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (d) { var rr = r + d[0], c2 = cc + d[1]; if (rr < 0 || rr >= n || c2 < 0 || c2 >= n) return; if (b[rr * n + c2] === 3 - c) bad++; });
    return edge ? bad === 0 : bad <= 1;
  }
  /* 數子：dead = {點: true} 的棋子當作被提掉 */
  function score(b, n, dead, komi) {
    var bb = b.map(function (v, i) { return dead && dead[i] ? 0 : v; }), area = [0, 0, 0], terr = [], seen = {};
    for (var i = 0; i < n * n; i++) terr.push(0);
    for (var j = 0; j < n * n; j++) {
      if (bb[j]) { area[bb[j]]++; continue; }
      if (seen[j]) continue;
      var st = [j], reg = [], touch = {}; seen[j] = 1;
      while (st.length) { var x = st.pop(); reg.push(x); nbrs(n, x).forEach(function (y) { if (bb[y]) touch[bb[y]] = 1; else if (!seen[y]) { seen[y] = 1; st.push(y); } }); }
      var owner = touch[1] && !touch[2] ? 1 : touch[2] && !touch[1] ? 2 : 0;
      if (owner) { area[owner] += reg.length; reg.forEach(function (x) { terr[x] = owner; }); }
    }
    return { black: area[1], white: area[2] + komi, terr: terr };
  }
  /* 隨機下到底，用來估計每個點最後屬於誰 */
  function playout(b, n, turn, ko, maxMoves, amaf) {
    var bb = b.slice(), c = turn, passes = 0, moves = 0, k = ko, N = n * n, cand = [];
    var last = -1;
    while (passes < 2 && moves < maxMoves) {
      cand.length = 0; for (var i = 0; i < N; i++) if (bb[i] === 0 && !isEye(bb, n, i, c)) cand.push(i);
      var done = false;
      // 戰術：最後一手旁邊，能吃就吃、自己被叫吃就逃
      if (last >= 0 && bb[last]) {
        var tacts = [], lg = group(bb, n, last);
        if (lg.libs.length === 1) tacts.push(lg.libs[0]);
        nbrs(n, last).forEach(function (y) { if (bb[y] === c) { var gg = group(bb, n, y); if (gg.libs.length === 1) tacts.push(gg.libs[0]); } });
        for (var q = 0; q < tacts.length && !done; q++) {
          var rt = play(bb, n, tacts[q], c, k);
          if (rt && (rt.caps || group(rt.b, n, tacts[q]).libs.length >= 2)) { if (amaf && !(tacts[q] in amaf)) amaf[tacts[q]] = c; bb = rt.b; k = rt.ko; last = tacts[q]; done = true; }
        }
      }
      // 先試著吃掉被打吃的棋子
      for (var t = 0; t < 8 && cand.length; t++) {
        var pick = cand.splice(Math.floor(Math.random() * cand.length), 1)[0];
        var r = play(bb, n, pick, c, k);
        if (r && !r.caps) { var sg = group(r.b, n, pick); if (sg.libs.length === 1 && sg.stones.length > 2) r = null; } // 不要自己送吃一大串
        if (r) { bb = r.b; k = r.ko; last = pick; if (amaf && !(pick in amaf)) amaf[pick] = c; done = true; break; }
      }
      if (!done) { // 剩下的全部試一遍
        while (cand.length) { var p2 = cand.splice(Math.floor(Math.random() * cand.length), 1)[0]; var r2 = play(bb, n, p2, c, k); if (r2) { bb = r2.b; k = r2.ko; last = p2; if (amaf && !(p2 in amaf)) amaf[p2] = c; done = true; break; } }
      }
      if (!done) last = -1;
      passes = done ? 0 : passes + 1; c = 3 - c; moves++;
    }
    return bb;
  }
  function finalOwner(bb, n) { var s = score(bb, n, null, 0); return bb.map(function (v, i) { return v || s.terr[i]; }); }
  /* 估計死子：跑很多盤隨機對局，某顆子最後多半變成對方的地 → 判死 */
  function estimateDead(b, n, turn, runs) {
    runs = runs || 40; var own = []; for (var i = 0; i < n * n; i++) own.push(0);
    for (var r = 0; r < runs; r++) { var f = finalOwner(playout(b, n, turn, -1, n * n * 3), n); f.forEach(function (v, i) { own[i] += v === 1 ? 1 : v === 2 ? -1 : 0; }); }
    var dead = {}, done = {};
    for (var j = 0; j < n * n; j++) {
      if (!b[j] || done[j]) continue;
      var g = group(b, n, j), sum = 0; g.stones.forEach(function (s) { done[s] = 1; sum += own[s]; });
      var avg = sum / g.stones.length / runs, mine = b[j] === 1 ? avg : -avg;
      if (mine < -0.3) g.stones.forEach(function (s) { dead[s] = true; });
    }
    return dead;
  }
  function legalMoves(b, n, c, ko, noEyes) {
    var out = []; for (var i = 0; i < n * n; i++) if (b[i] === 0 && !(noEyes && isEye(b, n, i, c)) && play(b, n, i, c, ko)) out.push(i); return out;
  }
  /* 電腦選點：回傳點的編號，或 -1 代表虛手（pass） */
  function pick(b, n, c, ko, level, oppPassed, komi) {
    var moves = legalMoves(b, n, c, ko, true); if (!moves.length) return -1;
    // 戰術：能吃就吃、自己被打吃就逃
    if (level >= 2) {
      var best = -1, bv = 0;
      moves.forEach(function (i) {
        var r = play(b, n, i, c, ko); var v = r.caps * 10;
        nbrs(n, i).forEach(function (y) { if (b[y] === c && group(b, n, y).libs.length === 1) { var g2 = group(r.b, n, i); if (g2.libs.length >= 2) v += 8 * group(b, n, y).stones.length; } });
        var me = group(r.b, n, i); if (me.libs.length === 1) v -= 15; // 自己送吃
        if (v > bv) { bv = v; best = i; }
      });
      if (best >= 0 && bv >= 8 && (level < 4 || Math.random() < .7)) return best;
    }
    if (level <= 1) {
      if (oppPassed && b.filter(function (v) { return v; }).length > n * n * .5 && Math.random() < .5) return -1;
      var safe = moves.filter(function (i) { return group(play(b, n, i, c, ko).b, n, i).libs.length > 1; });
      return (safe.length ? safe : moves)[Math.floor(Math.random() * (safe.length || moves.length))];
    }
    var runs = Math.round((level === 2 ? 60 : level === 3 ? 200 : 500) * (n > 9 ? .4 : 1)), win = {}, tot = {}, winsAll = 0, own = [];
    for (var z = 0; z < n * n; z++) own.push(0);
    for (var r = 0; r < runs; r++) {
      var am = {}, fin = playout(b, n, c, ko, n * n * 3, am), s = score(fin, n, null, komi);
      s.terr.forEach(function (v, i) { var o = fin[i] || v; own[i] += o === c ? 1 : o ? -1 : 0; });
      var w = c === 1 ? s.black > s.white : s.white > s.black; if (w) winsAll++;
      Object.keys(am).forEach(function (k) { if (am[k] !== c) return; tot[k] = (tot[k] || 0) + 1; if (w) win[k] = (win[k] || 0) + 1; });
    }
    // 還有沒人圍住的空點（中立點）就繼續下，全部分完才虛手
    var stones = b.filter(function (v) { return v; }).length, open = moves.filter(function (i) { return Math.abs(own[i]) / runs < .85 || stones < n * n * .3; });
    if (!open.length && (oppPassed || winsAll / runs > .5 || runs)) {
      // 剩下的都是地盤內：只有能明顯增加勝率才下，否則虛手
      var gain = -1, gm = -1; moves.forEach(function (i) { var t = tot[i] || 0; if (t < 5) return; var rate = (win[i] || 0) / t; if (rate > gain) { gain = rate; gm = i; } });
      if (gm < 0 || gain - winsAll / runs < .15) return -1;
      return gm;
    }
    var pool = open.length ? open : moves;
    if (level === 2 && Math.random() < .3) return pool[Math.floor(Math.random() * pool.length)];
    var bestM = -1, bestR = -1;
    pool.forEach(function (i) { var t = tot[i] || 0; var rate = ((win[i] || 0) + 1) / (t + 2); if (rate > bestR) { bestR = rate; bestM = i; } });
    return bestM >= 0 ? bestM : pool[0];
  }

  /* ---------- 棋盤圖 ---------- */
  function stars(n) { var p = n === 9 ? [2, 6] : n === 13 ? [3, 9] : [3, 9, 15], c = (n - 1) / 2, out = []; p.forEach(function (x) { p.forEach(function (y) { out.push([x, y]); }); }); out.push([c, c]); return out; }
  function svg(b, n, o) {
    o = o || {};
    var S = 40, M = 30, W = M * 2 + S * (n - 1), h = '<svg class="go-svg" viewBox="0 0 ' + W + ' ' + W + '" xmlns="http://www.w3.org/2000/svg"><defs>' +
      '<radialGradient id="gob" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#666"/><stop offset=".5" stop-color="#1a1a1a"/><stop offset="1" stop-color="#000"/></radialGradient>' +
      '<radialGradient id="gow" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e9e6dd"/><stop offset="1" stop-color="#b9b4a6"/></radialGradient></defs>';
    h += '<rect width="' + W + '" height="' + W + '" rx="10" fill="#dcb35c"/><rect width="' + W + '" height="' + W + '" rx="10" fill="url(#gow)" opacity=".08"/>';
    for (var k = 0; k < n; k++) { var p = M + k * S; h += '<line x1="' + M + '" y1="' + p + '" x2="' + (W - M) + '" y2="' + p + '" stroke="#3b2a12" stroke-width="' + (k === 0 || k === n - 1 ? 2 : 1.1) + '"/><line x1="' + p + '" y1="' + M + '" x2="' + p + '" y2="' + (W - M) + '" stroke="#3b2a12" stroke-width="' + (k === 0 || k === n - 1 ? 2 : 1.1) + '"/>'; }
    stars(n).forEach(function (s) { h += '<circle cx="' + (M + s[0] * S) + '" cy="' + (M + s[1] * S) + '" r="4" fill="#3b2a12"/>'; });
    for (var i = 0; i < n * n; i++) {
      var x = M + (i % n) * S, y = M + Math.floor(i / n) * S, v = b[i];
      if (v) {
        var dead = o.dead && o.dead[i];
        h += '<g' + (dead ? ' opacity=".4"' : '') + (o.anim === i ? ' class="go-drop"' : '') + '><circle cx="' + (x + 1.5) + '" cy="' + (y + 2) + '" r="18.5" fill="#0004"/><circle cx="' + x + '" cy="' + y + '" r="18.5" fill="url(#go' + (v === 1 ? 'b' : 'w') + ')"/></g>';
        if (dead) h += '<path d="M' + (x - 8) + ' ' + (y - 8) + 'L' + (x + 8) + ' ' + (y + 8) + 'M' + (x + 8) + ' ' + (y - 8) + 'L' + (x - 8) + ' ' + (y + 8) + '" stroke="#e5534b" stroke-width="3.5"/>';
        if (o.last === i && !dead) h += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="none" stroke="' + (v === 1 ? '#fff' : '#000') + '" stroke-width="2.5"/>';
      }
      if (o.terr && o.terr[i] && (!v || (o.dead && o.dead[i]))) h += '<rect x="' + (x - 6) + '" y="' + (y - 6) + '" width="12" height="12" fill="' + (o.terr[i] === 1 ? '#111' : '#fff') + '" stroke="#555" stroke-width="1"/>';
      if (o.hl && o.hl.indexOf(i) >= 0) h += '<circle class="hint-ring" cx="' + x + '" cy="' + y + '" r="22" fill="rgba(255,212,0,.3)" stroke="#ffc400" stroke-width="3.5"/>';
      if (o.ghost === i && !v) h += '<circle cx="' + x + '" cy="' + y + '" r="18" fill="url(#go' + (o.ghostColor === 1 ? 'b' : 'w') + ')" opacity=".55"/>';
    }
    return h + '</svg>';
  }
  function hit(svgEl, ev, n) {
    var S = 40, M = 30, W = M * 2 + S * (n - 1), r = svgEl.getBoundingClientRect();
    var x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * W;
    var c = Math.round((x - M) / S), rr = Math.round((y - M) / S);
    if (c < 0 || rr < 0 || c >= n || rr >= n) return -1;
    return rr * n + c;
  }
  function coord(i, n) { var L = 'ABCDEFGHJKLMNOPQRST'; return L[i % n] + (n - Math.floor(i / n)); }
  return { empty: empty, group: group, play: play, score: score, estimateDead: estimateDead, pick: pick, svg: svg, hit: hit, coord: coord, legalMoves: legalMoves, nbrs: nbrs };
})();
