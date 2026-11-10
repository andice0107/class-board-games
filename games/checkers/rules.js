/* 三色跳棋：六角星棋盤 121 個洞，2 人或 3 人，每人 10 顆。
   座標用軸座標 (q, r)，s = -q - r。星形 = 兩個大三角形 {q,r,s ≥ -4} ∪ {q,r,s ≤ 4} */
window.CCK = (function () {
  'use strict';
  var CELLS = [], IDX = {}, NB = [], DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  for (var r = -8; r <= 8; r++) for (var q = -8; q <= 8; q++) {
    var s = -q - r;
    var up = q >= -4 && r >= -4 && s >= -4, down = q <= 4 && r <= 4 && s <= 4;
    if (up || down) { IDX[q + ',' + r] = CELLS.length; CELLS.push([q, r, s]); }
  }
  CELLS.forEach(function (c, i) { NB[i] = DIRS.map(function (d) { var j = IDX[(c[0] + d[0]) + ',' + (c[1] + d[1])]; return j == null ? -1 : j; }); });
  // 六個角：用「哪一個座標超出 4」來分
  var CORNERS = { qp: function (c) { return c[0] > 4; }, qn: function (c) { return c[0] < -4; }, rp: function (c) { return c[1] > 4; }, rn: function (c) { return c[1] < -4; }, sp: function (c) { return c[2] > 4; }, sn: function (c) { return c[2] < -4; } };
  var OPP = { qp: 'qn', qn: 'qp', rp: 'rn', rn: 'rp', sp: 'sn', sn: 'sp' };
  function cornerCells(k) { var out = []; CELLS.forEach(function (c, i) { if (CORNERS[k](c)) out.push(i); }); return out; }
  var CC = {}; Object.keys(CORNERS).forEach(function (k) { CC[k] = cornerCells(k); });
  // 每個角的尖端（離中心最遠的洞）
  var TIP = {}; Object.keys(CC).forEach(function (k) { var best = -1, bi = 0; CC[k].forEach(function (i) { var c = CELLS[i], d = Math.max(Math.abs(c[0]), Math.abs(c[1]), Math.abs(c[2])); if (d > best) { best = d; bi = i; } }); TIP[k] = bi; });
  /* 兩人、三人都用「間隔」的角，終點是正對面同色、空著的角（台灣三色跳棋的玩法） */
  var HOMES = { 2: ['qp', 'rp'], 3: ['qp', 'rp', 'sp'] };
  function homes(n) { return HOMES[n] || HOMES[2]; }
  function dist(a, b) { var A = CELLS[a], B = CELLS[b]; return (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2])) / 2; }

  function init(n) {
    var b = []; for (var i = 0; i < CELLS.length; i++) b.push('.');
    homes(n).forEach(function (k, seat) { CC[k].forEach(function (i) { b[i] = String(seat); }); });
    return b.join('');
  }
  /* 從 i 出發能到的所有位置：走一步，或連續跳（跳過相鄰任何一顆棋子） */
  function moves(b, i, n) {
    var out = {}, seen = {}; seen[i] = 1;
    var lock = null; // 已經走進終點的彈珠，只能在終點裡移動
    if (n && b[i] !== '.') { var tg = target(n, +b[i]); if (tg.indexOf(i) >= 0) { lock = {}; tg.forEach(function (t) { lock[t] = 1; }); } }
    NB[i].forEach(function (j) { if (j >= 0 && b[j] === '.') out[j] = [i, j]; });
    var stack = [[i, [i]]];
    while (stack.length) {
      var cur = stack.pop(), p = cur[0];
      for (var d = 0; d < 6; d++) {
        var mid = NB[p][d]; if (mid < 0 || b[mid] === '.' || mid === i) continue;
        var to = NB[mid][d]; if (to < 0 || (b[to] !== '.' && to !== i) || seen[to]) continue;
        seen[to] = 1; var path = cur[1].concat([to]);
        if (to !== i && !out[to]) out[to] = path;
        stack.push([to, path]);
      }
    }
    if (lock) Object.keys(out).forEach(function (t) { if (!lock[t]) delete out[t]; });
    return out; // {目的地: 路徑}
  }
  function move(b, from, to) { var a = b.split(''); a[to] = a[from]; a[from] = '.'; return a.join(''); }
  /* 目標角全部被佔滿、而且至少有一顆是自己的 → 獲勝（避免別人故意佔位） */
  function won(b, n, seat) {
    var t = CC[OPP[homes(n)[seat]]], mine = 0;
    for (var k = 0; k < t.length; k++) { if (b[t[k]] === '.') return false; if (b[t[k]] === String(seat)) mine++; }
    return mine > 0;
  }
  function target(n, seat) { return CC[OPP[homes(n)[seat]]]; }
  function tip(n, seat) { return TIP[OPP[homes(n)[seat]]]; }
  function left(b, n, seat) { // 還沒進入目標的棋子數
    var t = {}; target(n, seat).forEach(function (i) { t[i] = 1; }); var c = 0;
    for (var i = 0; i < b.length; i++) if (b[i] === String(seat) && !t[i]) c++;
    return c;
  }
  function score(b, n, seat) { // 越小越接近終點
    var tp = tip(n, seat), tot = 0;
    for (var i = 0; i < b.length; i++) if (b[i] === String(seat)) tot += dist(i, tp);
    return tot;
  }
  function allMoves(b, seat, n) {
    var list = [];
    for (var i = 0; i < b.length; i++) if (b[i] === String(seat)) { var m = moves(b, i, n); Object.keys(m).forEach(function (t) { list.push([i, +t, m[t]]); }); }
    return list;
  }

  /* ---------- 電腦 ---------- */
  function pick(b, n, seat, level) {
    var tp = tip(n, seat), list = allMoves(b, seat, n); if (!list.length) return null;
    var tset = {}; target(n, seat).forEach(function (i) { tset[i] = 1; });
    function gain(bb, m) {
      var g = dist(m[0], tp) - dist(m[1], tp);
      if (tset[m[0]] && !tset[m[1]]) g -= 3;          // 不要離開終點區
      if (!tset[m[0]] && tset[m[1]]) g += .6;
      g += dist(m[0], tp) * .04;                        // 優先移動落後的棋子
      return g;
    }
    list.forEach(function (m) { m.g = gain(b, m); });
    if (level <= 1) {
      var fw = list.filter(function (m) { return m.g > 0; }); if (!fw.length) fw = list;
      return fw[Math.floor(Math.random() * fw.length)];
    }
    if (level === 2) { list.forEach(function (m) { m.v = m.g + Math.random() * 3; }); }
    else if (level === 3) { list.forEach(function (m) { m.v = m.g + Math.random() * .05; }); }
    else {
      // 困難：多想自己的下一步
      list.sort(function (a, c) { return c.g - a.g; });
      list.slice(0, 14).forEach(function (m) {
        var nb = move(b, m[0], m[1]), best = 0;
        allMoves(nb, seat, n).forEach(function (m2) { var g2 = gain(nb, m2); if (g2 > best) best = g2; });
        m.v = m.g + best * .8 + Math.random() * .02;
      });
      list = list.slice(0, 14);
    }
    list.sort(function (a, c) { return c.v - a.v; });
    return list[0];
  }

  /* ---------- 棋盤 SVG：六個彩色三角形（對角同色）、中間六角形、格線、凹洞 ---------- */
  var COLORS = ['#e53935', '#f9c21b', '#2e9e4f'], PAIR = { qp: 0, qn: 0, rp: 1, rn: 1, sp: 2, sn: 2 };
  var CNAMES = ['紅', '黃', '綠'];
  function XY(i) { var c = CELLS[i]; return [(c[0] + c[1] / 2) * 6, c[1] * 6 * 0.8660254]; }
  function P(q, r) { return [((q + r / 2) * 6).toFixed(2), (r * 6 * .8660254).toFixed(2)].join(','); }
  function homeAngle(n, seat) { var p = XY(TIP[homes(n)[seat]]); return Math.atan2(p[1], p[0]) * 180 / Math.PI; }
  // 三角形頂點（軸座標，往外多留半格）
  var TRI = { qp: [[9.1, -4.55], [4.45, -4.55], [4.45, .1]], qn: [[-9.1, 4.55], [-4.45, 4.55], [-4.45, -.1]],
    rp: [[-4.55, 9.1], [-4.55, 4.45], [.1, 4.45]], rn: [[4.55, -9.1], [4.55, -4.45], [-.1, -4.45]],
    sp: [[-4.55, -4.55], [.1, -4.55], [-4.55, .1]], sn: [[4.55, 4.55], [-.1, 4.55], [4.55, -.1]] };
  var LINES = (function () { var o = []; CELLS.forEach(function (c, i) { [0, 2, 4].forEach(function (d) { var j = NB[i][d]; if (j > i || (j >= 0 && j < i)) { if (j >= 0 && (d === 0 || d === 2 || d === 4)) { var a = XY(i), b = XY(j); o.push('M' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + 'L' + b[0].toFixed(2) + ' ' + b[1].toFixed(2)); } } }); }); return o.join(''); })();
  function svg(b, o) {
    o = o || {};
    var n = o.n || 2, rot = o.seat != null ? 90 - homeAngle(n, o.seat) : 0, h = [];
    h.push('<svg class="ck-svg" viewBox="-60 -60 120 120" xmlns="http://www.w3.org/2000/svg"><defs>' +
      COLORS.map(function (c, k) { return '<radialGradient id="ckM' + k + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c) + '"/></radialGradient>'; }).join('') +
      '<radialGradient id="ckHole" cx=".5" cy=".38" r=".6"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient></defs>');
    h.push('<g transform="rotate(' + rot + ')">');
    var star = [[8, -4], [4, 0], [4, 4], [0, 4], [-4, 8], [-4, 4], [-8, 4], [-4, 0], [-4, -4], [0, -4], [4, -8], [4, -4]];
    function starPts(k) { return star.map(function (qr) { return [((qr[0] + qr[1] / 2) * 6 * k).toFixed(2), (qr[1] * 6 * .866 * k).toFixed(2)].join(','); }).join(' '); }
    h.push('<polygon points="' + starPts(1.16) + '" fill="#f6efe0" stroke="#5c4632" stroke-width="2.2" stroke-linejoin="round"/>');
    Object.keys(TRI).forEach(function (k) { h.push('<polygon points="' + TRI[k].map(function (p) { return P(p[0], p[1]); }).join(' ') + '" fill="' + COLORS[PAIR[k]] + '" opacity=".78" stroke="' + shade(COLORS[PAIR[k]]) + '" stroke-width=".6" stroke-linejoin="round"/>'); });
    h.push('<path d="' + LINES + '" stroke="#5c4632" stroke-width=".45" opacity=".45" fill="none"/>');
    var hl = {}; (o.dots || []).forEach(function (i) { hl[i] = 1; });
    var last = {}; (o.path || []).forEach(function (i) { last[i] = 1; });
    for (var i = 0; i < CELLS.length; i++) { var p = XY(i); h.push('<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="2" fill="url(#ckHole)"/>'); }
    if (o.path && o.path.length > 1) h.push('<polyline points="' + o.path.map(function (i) { return XY(i).join(','); }).join(' ') + '" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="1.6 1.2" stroke-linecap="round" opacity=".95"/>');
    for (i = 0; i < CELLS.length; i++) {
      var q = XY(i), v = b[i];
      if (v !== '.') {
        var k = +v;
        h.push('<g class="ck-m' + (o.sel === i ? ' sel' : '') + (o.anim && o.path && o.path[o.path.length - 1] === i ? ' land' : '') + '"><circle cx="' + (q[0] + .35).toFixed(2) + '" cy="' + (q[1] + .55).toFixed(2) + '" r="2.55" fill="#000" opacity=".3"/><circle cx="' + q[0].toFixed(2) + '" cy="' + q[1].toFixed(2) + '" r="2.55" fill="url(#ckM' + k + ')" stroke="' + (o.sel === i ? '#fff' : shade(COLORS[k])) + '" stroke-width="' + (o.sel === i ? .9 : .3) + '"/></g>');
      }
      if (hl[i]) h.push('<circle class="ck-dot" cx="' + q[0].toFixed(2) + '" cy="' + q[1].toFixed(2) + '" r="1.35" fill="#fff" stroke="#1b5e20" stroke-width=".7"/>');
      else if (last[i] && v === '.') h.push('<circle cx="' + q[0].toFixed(2) + '" cy="' + q[1].toFixed(2) + '" r=".8" fill="#fff" opacity=".85"/>');
    }
    h.push('</g></svg>');
    return h.join('');
  }
  function shade(c) { var n = parseInt(c.slice(1), 16), r = (n >> 16) * .55, g = ((n >> 8) & 255) * .55, bl = (n & 255) * .55; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; }
  function hit(el, ev, n, seat) {
    var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 120 - 60, y = (ev.clientY - r.top) / r.height * 120 - 60;
    var rot = (seat != null ? 90 - homeAngle(n, seat) : 0) * Math.PI / 180, c = Math.cos(-rot), s = Math.sin(-rot);
    var ux = x * c - y * s, uy = x * s + y * c, best = -1, bd = 3.4 * 3.4;
    for (var i = 0; i < CELLS.length; i++) { var p = XY(i), d = (p[0] - ux) * (p[0] - ux) + (p[1] - uy) * (p[1] - uy); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  return { CELLS: CELLS, COLORS: COLORS, CNAMES: CNAMES, homes: homes, tip: tip, init: init, moves: moves, move: move, won: won, left: left, score: score, allMoves: allMoves, pick: pick, svg: svg, hit: hit, target: target };
})();
