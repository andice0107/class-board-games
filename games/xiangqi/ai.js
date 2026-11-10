/* 中國象棋電腦對手：1 入門、2 簡單、3 普通、4 困難 */
window.XQAI = (function () {
  'use strict';
  var V = { K: 20000, A: 200, B: 200, N: 400, R: 900, C: 450, P: 100 }, WIN = 30000;
  var side = XQ.side;
  function score(p, i) {
    var t = p.toUpperCase(), v = V[t], x = i % 9, y = (i / 9) | 0, red = p === t, fy = red ? y : 9 - y; // fy：離自己底線的距離反過來，0 = 對方底線
    if (t === 'P') { if (fy <= 4) { v += 70 + (4 - fy) * 12 - Math.abs(x - 4) * 6; if (fy === 0) v -= 60; } }
    else if (t === 'N' || t === 'C') v += 12 - Math.abs(x - 4) * 3 + (t === 'N' && fy <= 6 ? 10 : 0);
    else if (t === 'R') v += fy <= 6 ? 12 : 0;
    return v;
  }
  function evaluate(b, s) {
    var t = 0;
    for (var i = 0; i < 90; i++) { var p = b[i]; if (p === '.') continue; var v = score(p, i); t += side(p) === s ? v : -v; }
    return t;
  }
  function facing(b) {
    var r = b.indexOf('K'), k = b.indexOf('k');
    if (r < 0 || k < 0 || r % 9 !== k % 9) return false;
    for (var j = k + 9; j < r; j += 9) if (b[j] !== '.') return false;
    return true;
  }
  function gen(b, s, capsOnly) {
    var ms = [];
    for (var i = 0; i < 90; i++) {
      if (side(b[i]) !== s) continue;
      var ts = XQ.pseudo(b, i);
      for (var j = 0; j < ts.length; j++) {
        var c = b[ts[j]];
        if (capsOnly && c === '.') continue;
        ms.push([i, ts[j], c === '.' ? 0 : V[c.toUpperCase()] * 10 - V[b[i].toUpperCase()] / 10]);
      }
    }
    ms.sort(function (a, c) { return c[2] - a[2]; });
    return ms;
  }
  var deadline = 0, nodes = 0;
  function timeUp() { if ((++nodes & 1023) === 0 && Date.now() > deadline) throw 'time'; }
  function quiesce(b, s, alpha, beta, d) {
    timeUp();
    var stand = evaluate(b, s);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (d <= 0) return stand;
    var ms = gen(b, s, true), o = s === 'r' ? 'b' : 'r';
    for (var i = 0; i < ms.length; i++) {
      var f = ms[i][0], t = ms[i][1], cap = b[t];
      if (cap.toUpperCase() === 'K') return WIN;
      b[t] = b[f]; b[f] = '.';
      var v = facing(b) ? -WIN : -quiesce(b, o, -beta, -alpha, d - 1);
      b[f] = b[t]; b[t] = cap;
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function search(b, s, depth, alpha, beta, qd) {
    timeUp();
    if (depth <= 0) return qd ? quiesce(b, s, alpha, beta, qd) : evaluate(b, s);
    var ms = gen(b, s, false), o = s === 'r' ? 'b' : 'r', best = -WIN - 1;
    for (var i = 0; i < ms.length; i++) {
      var f = ms[i][0], t = ms[i][1], cap = b[t];
      if (cap.toUpperCase() === 'K') return WIN;
      b[t] = b[f]; b[f] = '.';
      var v = facing(b) ? -WIN - 1 : -search(b, o, depth - 1, -beta, -alpha, qd);
      b[f] = b[t]; b[t] = cap;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best <= -WIN ? -WIN + (10 - depth) : best; // 沒有安全的走法 = 將死或困斃
  }
  function rootMoves(board, s) {
    var ms = [];
    for (var i = 0; i < 90; i++) if (side(board[i]) === s) XQ.legalFrom(board, i).forEach(function (t) { ms.push([i, t]); });
    for (var k = ms.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), x = ms[k]; ms[k] = ms[r]; ms[r] = x; }
    return ms;
  }
  /* 回傳 {from, to} */
  function pick(board, s, level) {
    var ms = rootMoves(board, s); if (!ms.length) return null;
    var b = board.split(''), o = s === 'r' ? 'b' : 'r';
    if (level <= 1) {
      // 入門：大多亂走，偶爾吃子
      if (Math.random() < .35) { var caps = ms.filter(function (m) { return board[m[1]] !== '.'; }); if (caps.length) ms = caps; }
      var m = ms[Math.floor(Math.random() * ms.length)]; return { from: m[0], to: m[1] };
    }
    var cfg = level === 2 ? { d: 1, q: 0, noise: 160, ms: 400 } : level === 3 ? { d: 2, q: 3, noise: 40, ms: 900 } : { d: 4, q: 4, noise: 0, ms: 1500 };
    deadline = Date.now() + cfg.ms; nodes = 0;
    var bestMove = ms[0], bestScore = -Infinity;
    for (var depth = 1; depth <= cfg.d; depth++) {
      try {
        var alpha = -WIN - 2, cur = null, curScore = -Infinity, scored = [];
        for (var i = 0; i < ms.length; i++) {
          var f = ms[i][0], t = ms[i][1], cap = b[t];
          b[t] = b[f]; b[f] = '.';
          var v = cfg.noise ? -search(b, o, depth - 1, -WIN - 2, WIN + 2, cfg.q) : -search(b, o, depth - 1, -WIN - 2, -alpha, cfg.q);
          b[f] = b[t]; b[t] = cap;
          if (cfg.noise) v += Math.random() * cfg.noise;
          scored.push([ms[i], v]);
          if (v > curScore) { curScore = v; cur = ms[i]; }
          if (v > alpha) alpha = v;
        }
        bestMove = cur; bestScore = curScore;
        // 下一層先試最好的走法
        scored.sort(function (a, c) { return c[1] - a[1]; }); ms = scored.map(function (x) { return x[0]; });
        if (bestScore >= WIN - 20) break;
      } catch (e) { if (e !== 'time') throw e; for (var q = 0; q < 90; q++) b[q] = board[q]; break; }
    }
    return { from: bestMove[0], to: bestMove[1] };
  }
  return { pick: pick, evaluate: function (board, s) { return evaluate(board.split(''), s); } };
})();
