/* 中國象棋規則引擎＋棋盤繪製
   棋盤是 90 格字串（9 行 × 10 列，第 0 列在黑方那一邊）。
   紅方大寫：K帥 A仕 B相 N傌 R俥 C炮 P兵；黑方小寫：k將 a士 b象 n馬 r車 c砲 p卒；空格「.」 */
window.XQ = (function () {
  'use strict';
  var START = 'rnbakabnr' + '.........' + '.c.....c.' + 'p.p.p.p.p' + '.........' +
              '.........' + 'P.P.P.P.P' + '.C.....C.' + '.........' + 'RNBAKABNR';
  var NAME = { K: '帥', A: '仕', B: '相', N: '傌', R: '俥', C: '炮', P: '兵', k: '將', a: '士', b: '象', n: '馬', r: '車', c: '砲', p: '卒' };
  function side(p) { return p === '.' || !p ? null : (p >= 'A' && p <= 'Z' ? 'r' : 'b'); }
  function other(s) { return s === 'r' ? 'b' : 'r'; }
  function inB(x, y) { return x >= 0 && x < 9 && y >= 0 && y < 10; }
  function inPalace(s, x, y) { return x >= 3 && x <= 5 && (s === 'r' ? y >= 7 && y <= 9 : y >= 0 && y <= 2); }
  function ownHalf(s, y) { return s === 'r' ? y >= 5 : y <= 4; }

  /* 不考慮「自己被將」的走法 */
  function pseudo(b, i) {
    var p = b[i], s = side(p), x = i % 9, y = (i / 9) | 0, out = [];
    if (!s) return out;
    function add(nx, ny) { if (!inB(nx, ny)) return false; var q = b[ny * 9 + nx]; if (side(q) !== s) out.push(ny * 9 + nx); return q === '.'; }
    function empty(nx, ny) { return inB(nx, ny) && b[ny * 9 + nx] === '.'; }
    var t = p.toUpperCase(), k, d, nx, ny;
    if (t === 'K') {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (inPalace(s, x + d[0], y + d[1])) add(x + d[0], y + d[1]); });
    } else if (t === 'A') {
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) { if (inPalace(s, x + d[0], y + d[1])) add(x + d[0], y + d[1]); });
    } else if (t === 'B') {
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(function (d) {
        nx = x + d[0]; ny = y + d[1];
        if (inB(nx, ny) && ownHalf(s, ny) && empty(x + d[0] / 2, y + d[1] / 2)) add(nx, ny); // 塞象眼
      });
    } else if (t === 'N') {
      [[1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]].forEach(function (d) {
        var lx = Math.abs(d[0]) === 2 ? x + d[0] / 2 : x, ly = Math.abs(d[1]) === 2 ? y + d[1] / 2 : y;
        if (empty(lx, ly)) add(x + d[0], y + d[1]); // 蹩馬腿
      });
    } else if (t === 'R') {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { for (k = 1; ; k++) { if (!add(x + d[0] * k, y + d[1] * k)) break; } });
    } else if (t === 'C') {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var jumped = false;
        for (k = 1; ; k++) {
          nx = x + d[0] * k; ny = y + d[1] * k;
          if (!inB(nx, ny)) break;
          var q = b[ny * 9 + nx];
          if (!jumped) { if (q === '.') out.push(ny * 9 + nx); else jumped = true; }
          else if (q !== '.') { if (side(q) !== s) out.push(ny * 9 + nx); break; }
        }
      });
    } else if (t === 'P') {
      d = s === 'r' ? -1 : 1;
      add(x, y + d);
      if (!ownHalf(s, y)) { add(x + 1, y); add(x - 1, y); }
    }
    return out;
  }
  function apply(b, from, to) { var a = b.split(''); a[to] = a[from]; a[from] = '.'; return a.join(''); }
  function king(b, s) { return b.indexOf(s === 'r' ? 'K' : 'k'); }
  function inCheck(b, s) {
    var ki = king(b, s); if (ki < 0) return true;
    var oi = king(b, other(s));
    if (oi >= 0 && oi % 9 === ki % 9) { // 將帥照面
      var lo = Math.min(oi, ki) + 9, hi = Math.max(oi, ki), clear = true;
      for (var j = lo; j < hi; j += 9) if (b[j] !== '.') { clear = false; break; }
      if (clear) return true;
    }
    for (var i = 0; i < 90; i++) if (side(b[i]) === other(s) && b[i].toUpperCase() !== 'K' && pseudo(b, i).indexOf(ki) >= 0) return true;
    return false;
  }
  function legalFrom(b, i) {
    var s = side(b[i]); if (!s) return [];
    return pseudo(b, i).filter(function (t) { return !inCheck(apply(b, i, t), s); });
  }
  function isLegal(b, from, to, turn) {
    if (typeof from !== 'number' || typeof to !== 'number' || from < 0 || from > 89) return false;
    if (turn && side(b[from]) !== turn) return false;
    return legalFrom(b, from).indexOf(to) >= 0;
  }
  function hasMove(b, s) { for (var i = 0; i < 90; i++) if (side(b[i]) === s && legalFrom(b, i).length) return true; return false; }
  /* 輪到 s 方時的局面：是否被將軍、是否已經沒有棋可走（將死或困斃都算輸） */
  function status(b, s) { var c = inCheck(b, s); return { check: c, over: !hasMove(b, s) }; }

  /* ---------- 棋盤 SVG：木框、刻線、立體棋子 ---------- */
  var DEFS = '<defs>' +
    '<linearGradient id="xqWood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0cf96"/><stop offset=".5" stop-color="#e6bb78"/><stop offset="1" stop-color="#d9a862"/></linearGradient>' +
    '<linearGradient id="xqFrame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5530"/><stop offset="1" stop-color="#5a3318"/></linearGradient>' +
    '<pattern id="xqGrain" width="30" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 Q7.5 1.6 15 3 T30 3" stroke="#b07a3e" stroke-width=".25" fill="none" opacity=".35"/></pattern>' +
    '<radialGradient id="xqFace" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fffdf5"/><stop offset=".6" stop-color="#f5e6c4"/><stop offset="1" stop-color="#d8b67c"/></radialGradient>' +
    '<linearGradient id="xqSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c79a5c"/><stop offset="1" stop-color="#7a5128"/></linearGradient>' +
    '</defs>';
  function svg(b, o) {
    o = o || {};
    var flip = !!o.flip, h = [];
    function X(i) { var x = i % 9; return 9 + 10 * (flip ? 8 - x : x); }
    function Y(i) { var y = (i / 9) | 0; return 9 + 10 * (flip ? 9 - y : y); }
    h.push('<svg class="xq-svg" viewBox="0 0 98 108" xmlns="http://www.w3.org/2000/svg">' + DEFS);
    h.push('<rect x="0" y="0" width="98" height="108" rx="3" fill="url(#xqFrame)"/>');
    h.push('<rect x="1.6" y="1.6" width="94.8" height="104.8" rx="2" fill="url(#xqWood)"/><rect x="1.6" y="1.6" width="94.8" height="104.8" rx="2" fill="url(#xqGrain)"/>');
    h.push('<rect x="7.2" y="7.2" width="83.6" height="93.6" fill="none" stroke="#5a3318" stroke-width=".9"/>');
    var L = '';
    for (var j = 0; j < 10; j++) L += 'M9 ' + (9 + 10 * j) + 'H89';
    L += 'M9 9V99M89 9V99';
    for (var c = 1; c < 8; c++) L += 'M' + (9 + 10 * c) + ' 9V49M' + (9 + 10 * c) + ' 59V99';
    L += 'M39 9L59 29M59 9L39 29M39 79L59 99M59 79L39 99';
    // 炮、兵卒位置的花記
    [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]].forEach(function (q) {
      var cx = 9 + 10 * q[0], cy = 9 + 10 * q[1];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
        if (cx + d[0] * 2 < 9 || cx + d[0] * 2 > 89) return;
        L += 'M' + (cx + d[0] * .9) + ' ' + (cy + d[1] * 2.6) + 'V' + (cy + d[1] * .9) + 'H' + (cx + d[0] * 2.6);
      });
    });
    h.push('<path d="' + L + '" stroke="#5a3318" stroke-width=".42" fill="none" stroke-linecap="square"/>');
    h.push('<text x="29" y="56.4" font-size="6.2" text-anchor="middle" fill="#5a3318" opacity=".8" letter-spacing="2">楚　河</text>');
    h.push('<text x="69" y="56.4" font-size="6.2" text-anchor="middle" fill="#5a3318" opacity=".8" letter-spacing="2">漢　界</text>');
    if (o.last) o.last.forEach(function (i, k) {
      if (k === 0) h.push('<circle cx="' + X(i) + '" cy="' + Y(i) + '" r="2.2" fill="none" stroke="#3f7d6b" stroke-width=".7" stroke-dasharray="1 .8"/>');
      else h.push('<circle cx="' + X(i) + '" cy="' + Y(i) + '" r="5.5" fill="#3f7d6b" opacity=".28"/>');
    });
    for (var i = 0; i < 90; i++) {
      var p = b[i]; if (p === '.') continue;
      var red = side(p) === 'r', col = red ? '#b8322a' : '#1f1a17', x = X(i), y = Y(i), cls = 'pc';
      if (o.sel === i) cls += ' sel';
      if (o.last && o.last[1] === i && o.anim) cls += ' land';
      h.push('<g class="' + cls + '">');
      if (o.checkKing === i) h.push('<circle class="chk" cx="' + x + '" cy="' + y + '" r="5.6" fill="#e53935" opacity=".7"/>');
      h.push('<ellipse cx="' + x + '" cy="' + (y + 1.3) + '" rx="4.5" ry="4.4" fill="#000" opacity=".22"/>');
      h.push('<circle cx="' + x + '" cy="' + (y + .7) + '" r="4.4" fill="url(#xqSide)"/>');
      h.push('<circle cx="' + x + '" cy="' + y + '" r="4.3" fill="url(#xqFace)" stroke="' + (o.sel === i ? '#2f6fb3' : 'rgba(90,51,24,.6)') + '" stroke-width="' + (o.sel === i ? .9 : .25) + '"/>');
      h.push('<circle cx="' + x + '" cy="' + y + '" r="3.4" fill="none" stroke="' + col + '" stroke-width=".35"/>');
      h.push('<text x="' + x + '" y="' + (y + 1.75) + '" font-size="4.9" text-anchor="middle" fill="' + col + '" font-weight="900">' + NAME[p] + '</text></g>');
    }
    if (o.dots) o.dots.forEach(function (i) {
      if (b[i] === '.') h.push('<circle cx="' + X(i) + '" cy="' + Y(i) + '" r="1.6" fill="#3f7d6b" opacity=".9"/>');
      else h.push('<circle cx="' + X(i) + '" cy="' + Y(i) + '" r="5" fill="none" stroke="#b8322a" stroke-width=".9" stroke-dasharray="1.6 1"/>');
    });
    h.push('</svg>');
    return h.join('');
  }
  /* 點擊位置 → 格子編號 */
  function hit(box, ev, flip) {
    var r = box.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * 98, py = (ev.clientY - r.top) / r.height * 108;
    var x = Math.round((px - 9) / 10), y = Math.round((py - 9) / 10);
    if (!inB(x, y)) return -1;
    if (flip) { x = 8 - x; y = 9 - y; }
    return y * 9 + x;
  }
  return { pseudo: pseudo, START: START, NAME: NAME, side: side, other: other, apply: apply, legalFrom: legalFrom, isLegal: isLegal, inCheck: inCheck, status: status, king: king, svg: svg, hit: hit };
})();
