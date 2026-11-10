/* 五子棋規則＋電腦對手：15×15，黑先，連成五顆（含以上）獲勝 */
window.GMK = (function () {
  'use strict';
  var N = 15, DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  function empty() { return '.'.repeat(N * N); }
  function at(b, x, y) { return x < 0 || y < 0 || x >= N || y >= N ? '#' : b[y * N + x]; }
  function place(b, i, c) { return b.slice(0, i) + c + b.slice(i + 1); }
  /* 落在 i 之後，回傳連成五的那一排（沒有就 null） */
  function winLine(b, i) {
    var c = b[i], x = i % N, y = (i / N) | 0;
    for (var d = 0; d < 4; d++) {
      var dx = DIRS[d][0], dy = DIRS[d][1], line = [i], k;
      for (k = 1; at(b, x + dx * k, y + dy * k) === c; k++) line.push((y + dy * k) * N + x + dx * k);
      for (k = 1; at(b, x - dx * k, y - dy * k) === c; k++) line.unshift((y - dy * k) * N + x - dx * k);
      if (line.length >= 5) return line;
    }
    return null;
  }
  function full(b) { return b.indexOf('.') < 0; }

  /* ---------- 電腦 ---------- */
  var W = [0, 1, 12, 160, 3000, 1e6];
  // 在 i 下 c 的價值：看經過 i 的每一個「五格窗口」，窗口裡沒有對方棋子才算數
  function value(b, i, c) {
    var x = i % N, y = (i / N) | 0, o = c === 'b' ? 'w' : 'b', total = 0;
    for (var d = 0; d < 4; d++) {
      var dx = DIRS[d][0], dy = DIRS[d][1];
      for (var s = -4; s <= 0; s++) {
        var mine = 0, ok = true;
        for (var k = 0; k < 5; k++) {
          var v = at(b, x + dx * (s + k), y + dy * (s + k));
          if (v === '#' || v === o) { ok = false; break; }
          if (v === c) mine++;
        }
        if (ok) total += W[Math.min(5, mine + 1)];
      }
    }
    return total;
  }
  function candidates(b) {
    var out = [], any = false;
    for (var i = 0; i < N * N; i++) {
      if (b[i] !== '.') { any = true; continue; }
      var x = i % N, y = (i / N) | 0, near = false;
      for (var dy = -2; dy <= 2 && !near; dy++) for (var dx = -2; dx <= 2; dx++) { var v = at(b, x + dx, y + dy); if (v === 'b' || v === 'w') { near = true; break; } }
      if (near) out.push(i);
    }
    if (!any) return [7 * N + 7];
    return out;
  }
  function scored(b, c, def) {
    var o = c === 'b' ? 'w' : 'b';
    return candidates(b).map(function (i) { return { i: i, a: value(b, i, c), d: value(b, i, o), s: value(b, i, c) * 1.1 + value(b, i, o) * def }; })
      .sort(function (p, q) { return q.s - p.s; });
  }
  function pick(b, c, level) {
    var o = c === 'b' ? 'w' : 'b', list = scored(b, c, level >= 3 ? 1 : .7);
    if (!list.length) return -1;
    // 自己能連五就下；對方能連五一定擋（入門偶爾會漏看）
    var win = list.filter(function (m) { return m.a >= 1e6; })[0];
    if (win && (level > 1 || Math.random() < .6)) return win.i;
    var block = list.filter(function (m) { return m.d >= 1e6; })[0];
    if (block && (level > 1 || Math.random() < .5)) return block.i;
    if (level <= 1) { var top = list.slice(0, 12); return top[Math.floor(Math.random() * top.length)].i; }
    if (level === 2) {
      list.forEach(function (m) { m.s *= .5 + Math.random(); });
      list.sort(function (p, q) { return q.s - p.s; });
      return list[0].i;
    }
    if (level === 3) return list[0].i;
    // 困難：往後想幾步（只看最有希望的幾個位置）
    var deadline = Date.now() + 1200;
    function leaf(bb, side) { var other = side === 'b' ? 'w' : 'b', m1 = scored(bb, side, 0)[0], m2 = scored(bb, other, 0)[0]; return (m1 ? m1.a : 0) * 1.25 - (m2 ? m2.a : 0); }
    function nega(bb, side, depth, alpha, beta) {
      if (depth === 0 || Date.now() > deadline) return leaf(bb, side);
      var other = side === 'b' ? 'w' : 'b', ms = scored(bb, side, 1).slice(0, 7), best = -Infinity;
      if (!ms.length) return 0;
      for (var k = 0; k < ms.length; k++) {
        var nb = place(bb, ms[k].i, side);
        var v = winLine(nb, ms[k].i) ? 1e8 + depth : -nega(nb, other, depth - 1, -beta, -alpha);
        if (v > best) best = v; if (v > alpha) alpha = v; if (alpha >= beta) break;
      }
      return best;
    }
    var bestI = list[0].i, bestV = -Infinity, alpha = -Infinity;
    list.slice(0, 9).forEach(function (m) {
      var nb = place(b, m.i, c);
      var v = winLine(nb, m.i) ? 1e9 : -nega(nb, o, 3, -Infinity, -alpha);
      if (v > bestV) { bestV = v; bestI = m.i; }
      if (v > alpha) alpha = v;
    });
    return bestI;
  }
  /* 局勢：正數代表 c 比較有利 */
  function advantage(b, c) {
    var o = c === 'b' ? 'w' : 'b', a = scored(b, c, 0)[0], d = scored(b, o, 0)[0];
    return (a ? a.a : 0) - (d ? d.a : 0);
  }

  /* ---------- 棋盤 SVG ---------- */
  var DEFS = '<defs><radialGradient id="gmB" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#6b6b6b"/><stop offset=".45" stop-color="#1f1f1f"/><stop offset="1" stop-color="#000"/></radialGradient>' +
    '<radialGradient id="gmW" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#ebe8e0"/><stop offset="1" stop-color="#bdb8ac"/></radialGradient>' +
    '<linearGradient id="gmWood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3cf8e"/><stop offset=".5" stop-color="#e9bd72"/><stop offset="1" stop-color="#dcab5c"/></linearGradient>' +
    '<pattern id="gmGrain" width="40" height="5" patternUnits="userSpaceOnUse"><path d="M0 2.5 Q10 1 20 2.5 T40 2.5" stroke="#b9853f" stroke-width=".25" fill="none" opacity=".35"/></pattern></defs>';
  function P(i) { return 6 + 6 * i; }
  function svg(b, o) {
    o = o || {};
    var h = ['<svg class="gm-svg" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' + DEFS];
    h.push('<rect width="96" height="96" rx="2.5" fill="url(#gmWood)"/><rect width="96" height="96" rx="2.5" fill="url(#gmGrain)"/>');
    var L = '';
    for (var k = 0; k < N; k++) L += 'M6 ' + P(k) + 'H90M' + P(k) + ' 6V90';
    h.push('<path d="' + L + '" stroke="#6b4320" stroke-width=".3"/><rect x="6" y="6" width="84" height="84" fill="none" stroke="#6b4320" stroke-width=".6"/>');
    [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]].forEach(function (s) { h.push('<circle cx="' + P(s[0]) + '" cy="' + P(s[1]) + '" r=".9" fill="#6b4320"/>'); });
    var win = {}; (o.win || []).forEach(function (i) { win[i] = 1; });
    for (var i = 0; i < N * N; i++) {
      var c = b[i]; if (c === '.') continue;
      var x = P(i % N), y = P((i / N) | 0);
      h.push('<g class="gm-st' + (o.anim && o.last === i ? ' land' : '') + '"><circle cx="' + (x + .35) + '" cy="' + (y + .5) + '" r="2.75" fill="#000" opacity=".28"/><circle cx="' + x + '" cy="' + y + '" r="2.75" fill="url(#gm' + (c === 'b' ? 'B' : 'W') + ')"/></g>');
      if (win[i]) h.push('<circle class="gm-win" cx="' + x + '" cy="' + y + '" r="3.3" fill="none" stroke="#e53935" stroke-width=".7"/>');
      else if (o.last === i) h.push('<circle cx="' + x + '" cy="' + y + '" r=".9" fill="#e53935"/>');
    }
    if (o.ghost != null && b[o.ghost] === '.') {
      var gx = P(o.ghost % N), gy = P((o.ghost / N) | 0);
      h.push('<circle class="gm-ghost" cx="' + gx + '" cy="' + gy + '" r="2.75" fill="url(#gm' + (o.ghostColor === 'w' ? 'W' : 'B') + ')" opacity=".55"/><circle cx="' + gx + '" cy="' + gy + '" r="3.4" fill="none" stroke="#1e88e5" stroke-width=".55" stroke-dasharray="1 .7"/>');
    }
    h.push('</svg>');
    return h.join('');
  }
  function hit(el, ev) {
    var r = el.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * 96, py = (ev.clientY - r.top) / r.height * 96;
    var x = Math.round((px - 6) / 6), y = Math.round((py - 6) / 6);
    if (x < 0 || y < 0 || x >= N || y >= N) return -1;
    return y * N + x;
  }
  return { N: N, empty: empty, place: place, winLine: winLine, full: full, pick: pick, advantage: advantage, svg: svg, hit: hit };
})();
