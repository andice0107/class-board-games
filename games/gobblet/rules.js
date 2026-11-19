/* 奇雞連連（Gobblet Gobblers 類）規則引擎。座位 0 = 橘雞（先走）、座位 1 = 藍雞。
   棋子大小 z：0 小、1 中、2 大；每格是一疊（最上面一隻才看得到）。
   strict = true  嚴格版：搬起雞時露出對手的三連，對手直接獲勝
   strict = false 寬鬆版：搬起後可補救，只要這隻雞放下去蓋住那條線，遊戲就繼續 */
(function (root) {
  'use strict';
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function top(c) { return c.length ? c[c.length - 1] : null; }
  function newState() {
    var c = []; for (var i = 0; i < 9; i++) c.push([]);
    return { c: c, out: [[2, 2, 2], [2, 2, 2]], turn: 0 };
  }
  function clone(s) { return { c: s.c.map(function (a) { return a.slice(); }), out: s.out.map(function (a) { return a.slice(); }), turn: s.turn }; }
  function lineOf(c, o) {
    for (var k = 0; k < 8; k++) {
      var L = LINES[k], a = top(c[L[0]]), b = top(c[L[1]]), d = top(c[L[2]]);
      if (a && b && d && a.o === o && b.o === o && d.o === o) return L;
    }
    return null;
  }
  function moves(s, p) {
    var r = [], z, to, f;
    for (z = 0; z < 3; z++) if (s.out[p][z] > 0) for (to = 0; to < 9; to++) { var t = top(s.c[to]); if (!t || z > t.z) r.push({ z: z, f: -1, to: to }); }
    for (f = 0; f < 9; f++) {
      var tp = top(s.c[f]); if (!tp || tp.o !== p) continue;
      for (to = 0; to < 9; to++) { if (to === f) continue; var t2 = top(s.c[to]); if (!t2 || tp.z > t2.z) r.push({ z: tp.z, f: f, to: to }); }
    }
    return r;
  }
  /* 走一步：回傳 { s: 新局面, w: 贏家座位或 null, why: 'line' | 'reveal' } */
  function apply(s, m, strict) {
    var p = s.turn, q = 1 - p, n = clone(s), piece, rev = false;
    if (m.f >= 0) { piece = n.c[m.f].pop(); rev = !!lineOf(n.c, q); }
    else { piece = { o: p, z: m.z }; n.out[p][m.z]--; }
    if (rev && strict) { n.turn = q; return { s: n, w: q, why: 'reveal', win: lineOf(n.c, q) }; }
    n.c[m.to].push(piece);
    var lq = lineOf(n.c, q);
    if (lq) { n.turn = q; return { s: n, w: q, why: 'reveal', win: lq }; }
    var lp = lineOf(n.c, p);
    n.turn = q;
    if (lp) return { s: n, w: p, why: 'line', win: lp };
    return { s: n, w: null };
  }
  function key(s) {
    return s.c.map(function (a) { return a.map(function (x) { return x.o + '' + x.z; }).join(''); }).join('|') + '#' + s.out[0].join('') + s.out[1].join('') + s.turn;
  }
  var CENTER = [1, 0, 1, 0, 3, 0, 1, 0, 1];
  function evalS(s, p) {
    var q = 1 - p, sc = 0, i;
    for (var k = 0; k < 8; k++) {
      var m = 0, o = 0;
      for (i = 0; i < 3; i++) { var t = top(s.c[LINES[k][i]]); if (t) { if (t.o === p) m++; else o++; } }
      if (!o) sc += m === 2 ? 30 : m === 1 ? 4 : 0;
      if (!m) sc -= o === 2 ? 30 : o === 1 ? 4 : 0;
    }
    for (i = 0; i < 9; i++) { var t2 = top(s.c[i]); if (t2) sc += (t2.o === p ? 1 : -1) * (t2.z + CENTER[i]); }
    return sc;
  }
  function order(s, ms, p, strict) {
    var l = ms.map(function (m) { var a = apply(s, m, strict), v = a.w === p ? 9999 : a.w === 1 - p ? -9999 : evalS(a.s, p); return { m: m, v: v, a: a }; });
    l.sort(function (x, y) { return y.v - x.v; });
    return l;
  }
  function nega(s, d, al, be, strict) {
    var p = s.turn, ms = moves(s, p);
    if (!ms.length) return 0;
    if (d === 0) return evalS(s, p);
    var l = order(s, ms, p, strict), best = -1e9;
    for (var i = 0; i < l.length; i++) {
      var a = l[i].a, v;
      if (a.w !== null) v = a.w === p ? 1000 + d : -1000 - d;
      else v = -nega(a.s, d - 1, -be, -al, strict);
      if (v > best) best = v;
      if (best > al) al = best;
      if (al >= be) break;
    }
    return best;
  }
  /* 評分每個走法：回傳 [{m, v}]，v 越大越好（從走棋者角度） */
  function scored(s, depth, strict) {
    var p = s.turn, ms = moves(s, p), out = [];
    for (var i = 0; i < ms.length; i++) {
      var a = apply(s, ms[i], strict), v;
      if (a.w !== null) v = a.w === p ? 2000 : -2000;
      else v = depth <= 1 ? evalS(a.s, p) : -nega(a.s, depth - 1, -1e9, 1e9, strict);
      out.push({ m: ms[i], v: v + Math.random() * 0.4 });
    }
    out.sort(function (x, y) { return y.v - x.v; });
    return out;
  }
  /* 電腦選步：lv 0 入門 1 簡單 2 普通 3 困難 */
  function pick(s, lv, strict) {
    var p = s.turn, ms = moves(s, p); if (!ms.length) return null;
    var i, a;
    if (lv <= 1) {
      var wins = ms.filter(function (m) { var r = apply(s, m, strict); return r.w === p; });
      if (wins.length && (lv === 1 || Math.random() < .5)) return wins[Math.floor(Math.random() * wins.length)];
      if (lv === 1) {   // 簡單：避開會馬上輸的走法
        var safe = ms.filter(function (m) { var r = apply(s, m, strict); return r.w !== 1 - p; });
        if (safe.length) ms = safe;
      }
      return ms[Math.floor(Math.random() * ms.length)];
    }
    var list = scored(s, lv === 2 ? 2 : 3, strict);
    return list[0].m;
  }
  root.GBL = { LINES: LINES, top: top, newState: newState, clone: clone, lineOf: lineOf, moves: moves, apply: apply, key: key, evalS: evalS, scored: scored, pick: pick };
  if (typeof module !== 'undefined') module.exports = root.GBL;
})(typeof window !== 'undefined' ? window : globalThis);
