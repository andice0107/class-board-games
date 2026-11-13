/* 西洋棋：完整規則（入堡、吃過路兵、升變、將死、逼和、50 步、三次重複、子力不足）＋電腦＋棋盤圖。
   棋盤是 64 格字串，索引 = 列*8 + 行，列 0 是第 8 橫列（黑方那邊）。大寫白、小寫黑。 */
window.CH = (function () {
  'use strict';
  var START = { b: 'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR', turn: 'w', castle: 'KQkq', ep: -1, half: 0 };
  var NAME = { k: '國王', q: '皇后', r: '城堡', b: '主教', n: '騎士', p: '士兵' };
  var N8 = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], K8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function colorOf(p) { return p === '.' ? '' : p === p.toUpperCase() ? 'w' : 'b'; }
  function other(c) { return c === 'w' ? 'b' : 'w'; }
  function sq(r, c) { return r * 8 + c; }
  function attacked(b, i, by) { // 格子 i 有沒有被 by 方攻擊
    var r = i >> 3, c = i & 7, k, rr, cc, p;
    var pr = by === 'w' ? r + 1 : r - 1, P = by === 'w' ? 'P' : 'p';
    if (pr >= 0 && pr < 8) { if (c > 0 && b[sq(pr, c - 1)] === P) return true; if (c < 7 && b[sq(pr, c + 1)] === P) return true; }
    var Nn = by === 'w' ? 'N' : 'n', Kk = by === 'w' ? 'K' : 'k';
    for (k = 0; k < 8; k++) { rr = r + N8[k][0]; cc = c + N8[k][1]; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[sq(rr, cc)] === Nn) return true; }
    for (k = 0; k < 8; k++) { rr = r + K8[k][0]; cc = c + K8[k][1]; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[sq(rr, cc)] === Kk) return true; }
    var BQ = by === 'w' ? 'BQ' : 'bq', RQ = by === 'w' ? 'RQ' : 'rq';
    for (k = 0; k < 4; k++) { rr = r; cc = c; while (true) { rr += DIAG[k][0]; cc += DIAG[k][1]; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; p = b[sq(rr, cc)]; if (p !== '.') { if (BQ.indexOf(p) >= 0) return true; break; } } }
    for (k = 0; k < 4; k++) { rr = r; cc = c; while (true) { rr += ORTH[k][0]; cc += ORTH[k][1]; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; p = b[sq(rr, cc)]; if (p !== '.') { if (RQ.indexOf(p) >= 0) return true; break; } } }
    return false;
  }
  function kingAt(b, c) { return b.indexOf(c === 'w' ? 'K' : 'k'); }
  function inCheck(st, c) { return attacked(st.b, kingAt(st.b, c), other(c)); }
  function pseudo(st) {
    var b = st.b, me = st.turn, out = [], i, r, c, p, k, rr, cc, t;
    function add(f, to, extra) { out.push({ f: f, t: to, x: extra || '' }); }
    for (i = 0; i < 64; i++) {
      p = b[i]; if (colorOf(p) !== me) continue;
      r = i >> 3; c = i & 7; var low = p.toLowerCase();
      if (low === 'p') {
        var dir = me === 'w' ? -1 : 1, start = me === 'w' ? 6 : 1, last = me === 'w' ? 0 : 7;
        rr = r + dir;
        if (rr >= 0 && rr < 8 && b[sq(rr, c)] === '.') {
          if (rr === last) 'qrbn'.split('').forEach(function (q) { add(i, sq(rr, c), q); }); else add(i, sq(rr, c));
          if (r === start && b[sq(r + 2 * dir, c)] === '.') add(i, sq(r + 2 * dir, c), 'd');
        }
        [-1, 1].forEach(function (dc) {
          var c2 = c + dc; if (c2 < 0 || c2 > 7 || rr < 0 || rr > 7) return; var to = sq(rr, c2), q = b[to];
          if (q !== '.' && colorOf(q) === other(me)) { if (rr === last) 'qrbn'.split('').forEach(function (x) { add(i, to, x); }); else add(i, to); }
          else if (to === st.ep) add(i, to, 'e');
        });
      } else if (low === 'n' || low === 'k') {
        var D = low === 'n' ? N8 : K8;
        for (k = 0; k < 8; k++) { rr = r + D[k][0]; cc = c + D[k][1]; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; t = b[sq(rr, cc)]; if (colorOf(t) !== me) add(i, sq(rr, cc)); }
        if (low === 'k') {
          var row = me === 'w' ? 7 : 0, KS = me === 'w' ? 'K' : 'k', QS = me === 'w' ? 'Q' : 'q', R = me === 'w' ? 'R' : 'r', op = other(me);
          if (i === sq(row, 4)) {
            if (st.castle.indexOf(KS) >= 0 && b[sq(row, 5)] === '.' && b[sq(row, 6)] === '.' && b[sq(row, 7)] === R && !attacked(b, sq(row, 4), op) && !attacked(b, sq(row, 5), op) && !attacked(b, sq(row, 6), op)) add(i, sq(row, 6), 'k');
            if (st.castle.indexOf(QS) >= 0 && b[sq(row, 3)] === '.' && b[sq(row, 2)] === '.' && b[sq(row, 1)] === '.' && b[sq(row, 0)] === R && !attacked(b, sq(row, 4), op) && !attacked(b, sq(row, 3), op) && !attacked(b, sq(row, 2), op)) add(i, sq(row, 2), 'Q');
          }
        }
      } else {
        var dirs = low === 'b' ? DIAG : low === 'r' ? ORTH : DIAG.concat(ORTH);
        for (k = 0; k < dirs.length; k++) { rr = r; cc = c; while (true) { rr += dirs[k][0]; cc += dirs[k][1]; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; t = b[sq(rr, cc)]; if (t === '.') add(i, sq(rr, cc)); else { if (colorOf(t) !== me) add(i, sq(rr, cc)); break; } } }
      }
    }
    return out;
  }
  function setc(s, i, ch) { return s.substring(0, i) + ch + s.substring(i + 1); }
  function apply(st, m) {
    var b = st.b, p = b[m.f], me = st.turn, cap = b[m.t] !== '.' || m.x === 'e';
    b = setc(b, m.t, p); b = setc(b, m.f, '.');
    if (m.x === 'e') b = setc(b, me === 'w' ? m.t + 8 : m.t - 8, '.');
    if ('qrbn'.indexOf(m.x) >= 0 && m.x) b = setc(b, m.t, me === 'w' ? m.x.toUpperCase() : m.x);
    if (m.x === 'k') { b = setc(b, m.t - 1, b[m.t + 1]); b = setc(b, m.t + 1, '.'); }
    if (m.x === 'Q') { b = setc(b, m.t + 1, b[m.t - 2]); b = setc(b, m.t - 2, '.'); }
    var cs = st.castle;
    function drop(ch) { cs = cs.replace(ch, ''); }
    if (p === 'K') { drop('K'); drop('Q'); } if (p === 'k') { drop('k'); drop('q'); }
    [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']].forEach(function (x) { if (m.f === x[0] || m.t === x[0]) drop(x[1]); });
    return { b: b, turn: other(me), castle: cs, ep: m.x === 'd' ? (m.f + m.t) / 2 : -1, half: p.toLowerCase() === 'p' || cap ? 0 : st.half + 1 };
  }
  function legal(st) { var me = st.turn; return pseudo(st).filter(function (m) { return !inCheck(apply(st, m), me); }); }
  function key(st) { return st.b + st.turn + st.castle + st.ep; }
  function insufficient(b) {
    var ps = b.replace(/[.kK]/g, ''); if (!ps) return true;
    if (ps.length === 1 && 'nNbB'.indexOf(ps) >= 0) return true;
    return false;
  }
  /* 局面結果：{over, why:'mate'|'stale'|'fifty'|'material'|'repeat', check} */
  function status(st, keys) {
    var ms = legal(st), chk = inCheck(st, st.turn);
    if (!ms.length) return { over: true, why: chk ? 'mate' : 'stale', check: chk };
    if (insufficient(st.b)) return { over: true, why: 'material', check: chk };
    if (st.half >= 100) return { over: true, why: 'fifty', check: chk };
    if (keys) { var k = key(st), n = 0; keys.forEach(function (x) { if (x === k) n++; }); if (n >= 3) return { over: true, why: 'repeat', check: chk }; }
    return { over: false, check: chk };
  }

  /* ---------- 電腦 ---------- */
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  function evalW(b) { // 白方觀點
    var s = 0;
    for (var i = 0; i < 64; i++) { var p = b[i]; if (p === '.') continue; var l = p.toLowerCase(); if (p === l) s -= VAL[l] + PST[l][(7 - (i >> 3)) * 8 + (i & 7)]; else s += VAL[l] + PST[l][i]; }
    return s;
  }
  function order(st, ms) { var b = st.b; return ms.map(function (m) { var v = b[m.t] !== '.' ? 10 * VAL[b[m.t].toLowerCase()] - VAL[b[m.f].toLowerCase()] : 0; if (m.x === 'q') v += 800; return { m: m, v: v }; }).sort(function (a, c) { return c.v - a.v; }).map(function (x) { return x.m; }); }
  var nodes = 0, LIMIT = 120000;
  function quies(st, a, bta, depth) {
    var sgn = st.turn === 'w' ? 1 : -1, sp = sgn * evalW(st.b);
    if (sp >= bta) return sp; if (sp > a) a = sp;
    if (depth <= 0 || nodes > LIMIT) return sp;
    var ms = order(st, pseudo(st).filter(function (m) { return st.b[m.t] !== '.' || m.x === 'q'; }));
    for (var i = 0; i < ms.length; i++) {
      var n2 = apply(st, ms[i]); if (inCheck(n2, st.turn)) continue; nodes++;
      var sc = -quies(n2, -bta, -a, depth - 1); if (sc >= bta) return sc; if (sc > a) a = sc;
    }
    return a;
  }
  function search(st, d, a, bta, q, ply) {
    if (d <= 0) return q ? quies(st, a, bta, 4) : (st.turn === 'w' ? 1 : -1) * evalW(st.b);
    var ms = order(st, pseudo(st)), any = false, best = -1e9;
    for (var i = 0; i < ms.length; i++) {
      var n2 = apply(st, ms[i]); if (inCheck(n2, st.turn)) continue; any = true; nodes++;
      var sc = n2.half >= 100 ? 0 : -search(n2, d - 1, -bta, -a, q, ply + 1);
      if (sc > best) best = sc; if (sc > a) a = sc; if (a >= bta || nodes > LIMIT) break;
    }
    if (!any) return inCheck(st, st.turn) ? -100000 + ply : 0;
    return best;
  }
  function pick(st, level, keys) {
    var ms = legal(st); if (!ms.length) return null;
    if (level <= 1 && Math.random() < .5) return ms[Math.floor(Math.random() * ms.length)];
    var depth = [1, 1, 2, 3, 4][level] || 2, q = level >= 3, noise = level <= 1 ? 120 : level === 2 ? 40 : 0;
    nodes = 0; var scored = [];
    order(st, ms).forEach(function (m) {
      var n2 = apply(st, m), sc;
      if (keys && keys.filter(function (x) { return x === key(n2); }).length >= 2) sc = 0; // 會三次重複
      else sc = -search(n2, depth - 1, -1e9, 1e9, q, 1);
      scored.push({ m: m, s: sc + Math.random() * noise });
    });
    scored.sort(function (a, c) { return c.s - a.s; });
    return scored[0].m;
  }

  /* ---------- 棋盤圖 ---------- */
  var GLY = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function svg(st, o) {
    o = o || {};
    var flip = !!o.flip, h = '<svg class="ch-svg" viewBox="-14 -6 832 834" xmlns="http://www.w3.org/2000/svg">';
    h += '<rect x="-14" y="-6" width="832" height="834" rx="14" fill="#5b3a1e"/>';
    var tgt = {}; (o.targets || []).forEach(function (t) { tgt[t] = 1; });
    for (var vr = 0; vr < 8; vr++) for (var vc = 0; vc < 8; vc++) {
      var i = flip ? (7 - vr) * 8 + (7 - vc) : vr * 8 + vc, dark = (vr + vc) % 2 === 1, x = vc * 100, y = vr * 100;
      var fill = dark ? '#b58863' : '#f0d9b5';
      if (o.last && (o.last.f === i || o.last.t === i)) fill = dark ? '#aaa23a' : '#cdd16f';
      if (o.sel === i) fill = '#7fb2e5';
      if (o.check === i) fill = '#e5534b';
      h += '<rect x="' + x + '" y="' + y + '" width="100" height="100" fill="' + fill + '"/>';
      var p = st.b[i];
      if (p !== '.') {
        var w = p !== p.toLowerCase();
        h += '<text x="' + (x + 50) + '" y="' + (y + 82) + '" font-size="84" text-anchor="middle" class="ch-pc" fill="' + (w ? '#fffdf5' : '#1d1d1d') + '" stroke="' + (w ? '#1d1d1d' : '#000') + '" stroke-width="' + (w ? 2.6 : 1) + '">' + GLY[p.toLowerCase()] + '︎</text>';
      }
      if (o.hl && o.hl.indexOf(i) >= 0) h += '<rect class="hint-ring" x="' + (x + 5) + '" y="' + (y + 5) + '" width="90" height="90" rx="12" fill="rgba(255,212,0,.32)" stroke="#ffc400" stroke-width="8"/>';
      if (tgt[i]) h += p !== '.' ? '<circle cx="' + (x + 50) + '" cy="' + (y + 50) + '" r="44" fill="none" stroke="#2e7d32" stroke-width="8" opacity=".7"/>' : '<circle cx="' + (x + 50) + '" cy="' + (y + 50) + '" r="15" fill="#2e7d32" opacity=".55"/>';
      if (vc === 0) h += '<text x="5" y="' + (y + 20) + '" font-size="17" font-weight="700" fill="' + (dark ? '#f0d9b5' : '#b58863') + '">' + (flip ? vr + 1 : 8 - vr) + '</text>';
      if (vr === 7) h += '<text x="' + (x + 88) + '" y="795" font-size="17" font-weight="700" fill="' + (dark ? '#f0d9b5' : '#b58863') + '">' + 'abcdefgh'[flip ? 7 - vc : vc] + '</text>';
    }
    return h + '</svg>';
  }
  function hit(svgEl, ev, flip) {
    var r = svgEl.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 832 - 14, y = (ev.clientY - r.top) / r.height * 834 - 6;
    if (x < 0 || y < 0 || x >= 800 || y >= 800) return -1;
    var vc = Math.floor(x / 100), vr = Math.floor(y / 100);
    return flip ? (7 - vr) * 8 + (7 - vc) : vr * 8 + vc;
  }
  function sqName(i) { return 'abcdefgh'[i & 7] + (8 - (i >> 3)); }
  return { START: START, NAME: NAME, legal: legal, apply: apply, status: status, inCheck: inCheck, kingAt: kingAt, key: key, pick: pick, svg: svg, hit: hit, colorOf: colorOf, other: other, sqName: sqName, evalW: evalW, GLY: GLY, attacked: attacked, VAL: VAL };
})();
