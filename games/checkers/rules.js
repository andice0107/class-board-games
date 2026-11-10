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
  var HOMES = { 2: ['qp', 'qn'], 3: ['qp', 'rp', 'sp'] };
  function homes(n) { return HOMES[n] || HOMES[2]; }
  function dist(a, b) { var A = CELLS[a], B = CELLS[b]; return (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2])) / 2; }

  function init(n) {
    var b = []; for (var i = 0; i < CELLS.length; i++) b.push('.');
    homes(n).forEach(function (k, seat) { CC[k].forEach(function (i) { b[i] = String(seat); }); });
    return b.join('');
  }
  /* 從 i 出發能到的所有位置：走一步，或連續跳（跳過相鄰任何一顆棋子） */
  function moves(b, i) {
    var out = {}, seen = {}; seen[i] = 1;
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
  function allMoves(b, seat) {
    var list = [];
    for (var i = 0; i < b.length; i++) if (b[i] === String(seat)) { var m = moves(b, i); Object.keys(m).forEach(function (t) { list.push([i, +t, m[t]]); }); }
    return list;
  }

  /* ---------- 電腦 ---------- */
  function pick(b, n, seat, level) {
    var tp = tip(n, seat), list = allMoves(b, seat); if (!list.length) return null;
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
        allMoves(nb, seat).forEach(function (m2) { var g2 = gain(nb, m2); if (g2 > best) best = g2; });
        m.v = m.g + best * .8 + Math.random() * .02;
      });
      list = list.slice(0, 14);
    }
    list.sort(function (a, c) { return c.v - a.v; });
    return list[0];
  }

  /* ---------- 棋盤 SVG ---------- */
  var COLORS = ['#e74c3c', '#f1c40f', '#3498db'], HOLE = { qp: 0, qn: 1, rp: 1, rn: 0, sp: 2, sn: 2 };
  function XY(i) { var c = CELLS[i]; return [(c[0] + c[1] / 2) * 6, c[1] * 6 * 0.8660254]; }
  function homeAngle(n, seat) { var p = XY(TIP[homes(n)[seat]]); return Math.atan2(p[1], p[0]) * 180 / Math.PI; }
  function svg(b, o) {
    o = o || {};
    var n = o.n || 2, rot = o.seat != null ? 90 - homeAngle(n, o.seat) : 0, h = [];
    var hs = homes(n), tint = {};
    hs.forEach(function (k, seat) { CC[k].forEach(function (i) { tint[i] = seat; }); CC[OPP[k]].forEach(function (i) { tint[i] = seat; }); });
    h.push('<svg class="ck-svg" viewBox="-58 -58 116 116" xmlns="http://www.w3.org/2000/svg"><defs>' +
      COLORS.map(function (c, k) { return '<radialGradient id="ckM' + k + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c) + '"/></radialGradient>'; }).join('') +
      '<radialGradient id="ckBoard" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff8ea"/><stop offset="1" stop-color="#f0dcb4"/></radialGradient></defs>');
    h.push('<g transform="rotate(' + rot + ')">');
    // 星形底板
    var star = [[8, -4], [4, 0], [4, 4], [0, 4], [-4, 8], [-4, 4], [-8, 4], [-4, 0], [-4, -4], [0, -4], [4, -8], [4, -4]].map(function (qr) { return [((qr[0] + qr[1] / 2) * 6 * 1.13).toFixed(2), (qr[1] * 6 * .866 * 1.13).toFixed(2)].join(','); }).join(' ');
    h.push('<polygon points="' + star + '" fill="url(#ckBoard)" stroke="#b78a4a" stroke-width="1.6" stroke-linejoin="round"/>');
    var hl = {}; (o.dots || []).forEach(function (i) { hl[i] = 1; });
    var last = {}; (o.path || []).forEach(function (i) { last[i] = 1; });
    if (o.path && o.path.length > 1) h.push('<polyline points="' + o.path.map(function (i) { return XY(i).join(','); }).join(' ') + '" fill="none" stroke="#2ecc71" stroke-width="1" stroke-dasharray="1.6 1.2" opacity=".85"/>');
    for (var i = 0; i < CELLS.length; i++) {
      var p = XY(i), v = b[i];
      var tcol = tint[i] != null ? COLORS[tint[i]] : '#c9a571';
      h.push('<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="2" fill="' + tcol + '" opacity="' + (tint[i] != null ? .28 : .35) + '"/>');
      if (v !== '.') {
        var k = +v;
        h.push('<g class="ck-m' + (o.sel === i ? ' sel' : '') + (o.anim && o.path && o.path[o.path.length - 1] === i ? ' land' : '') + '"><circle cx="' + (p[0] + .3).toFixed(2) + '" cy="' + (p[1] + .45).toFixed(2) + '" r="2.45" fill="#000" opacity=".25"/><circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="2.45" fill="url(#ckM' + k + ')"' + (o.sel === i ? ' stroke="#2c3e50" stroke-width=".7"' : '') + '/></g>');
      }
      if (hl[i]) h.push('<circle class="ck-dot" cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="1.25" fill="#27ae60"/>');
      else if (last[i] && v === '.' ) h.push('<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r=".7" fill="#27ae60" opacity=".6"/>');
    }
    h.push('</g></svg>');
    return h.join('');
  }
  function shade(c) { var n = parseInt(c.slice(1), 16), r = (n >> 16) * .55, g = ((n >> 8) & 255) * .55, bl = (n & 255) * .55; return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (bl | 0) + ')'; }
  function hit(el, ev, n, seat) {
    var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 116 - 58, y = (ev.clientY - r.top) / r.height * 116 - 58;
    var rot = (seat != null ? 90 - homeAngle(n, seat) : 0) * Math.PI / 180, c = Math.cos(-rot), s = Math.sin(-rot);
    var ux = x * c - y * s, uy = x * s + y * c, best = -1, bd = 3.4 * 3.4;
    for (var i = 0; i < CELLS.length; i++) { var p = XY(i), d = (p[0] - ux) * (p[0] - ux) + (p[1] - uy) * (p[1] - uy); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  return { CELLS: CELLS, COLORS: COLORS, init: init, moves: moves, move: move, won: won, left: left, score: score, allMoves: allMoves, pick: pick, svg: svg, hit: hit, target: target };
})();
