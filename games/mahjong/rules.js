/* 台灣 16 張麻將：牌、胡牌判斷、向聽數、台數、牌面圖。
   牌的代號：0～8 萬、9～17 筒、18～26 條、27～30 東南西北、31～33 中發白、34～41 花（春夏秋冬梅蘭竹菊） */
window.MJ = (function () {
  'use strict';
  var NUM = '一二三四五六七八九', HON = '東南西北中發白', FL = '春夏秋冬梅蘭竹菊';
  function isFlower(t) { return t >= 34; }
  function suit(t) { return t < 27 ? Math.floor(t / 9) : 3; }
  function name(t) {
    if (t < 9) return NUM[t] + '萬'; if (t < 18) return NUM[t - 9] + '筒'; if (t < 27) return NUM[t - 18] + '條';
    if (t < 34) return t === 33 ? '白板' : t === 32 ? '發財' : t === 31 ? '紅中' : HON[t - 27] + '風'; return FL[t - 34];
  }
  function wall() {
    var w = []; for (var t = 0; t < 34; t++) for (var k = 0; k < 4; k++) w.push(t);
    for (var f = 34; f < 42; f++) w.push(f);
    for (var i = w.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = w[i]; w[i] = w[j]; w[j] = x; }
    return w;
  }
  function counts(hand) { var c = []; for (var i = 0; i < 34; i++) c.push(0); hand.forEach(function (t) { if (t < 34) c[t]++; }); return c; }
  function sortHand(h) { return h.sort(function (a, b) { return a - b; }); }

  /* ---------- 胡牌判斷：N 組＋1 對 ---------- */
  function sets(c, i, out, acc) {
    while (i < 34 && !c[i]) i++;
    if (i >= 34) { if (out) out.push(acc.slice()); return true; }
    var ok = false;
    if (c[i] >= 3) { c[i] -= 3; acc.push({ k: 'pung', t: i }); ok = sets(c, i, out, acc) || ok; acc.pop(); c[i] += 3; if (ok && !out) return true; }
    if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; acc.push({ k: 'chow', t: i }); ok = sets(c, i, out, acc) || ok; acc.pop(); c[i]++; c[i + 1]++; c[i + 2]++; }
    return ok;
  }
  function isWin(c) {
    var n = 0; for (var i = 0; i < 34; i++) n += c[i];
    if (n % 3 !== 2) return false;
    for (var p = 0; p < 34; p++) if (c[p] >= 2) { c[p] -= 2; var ok = sets(c, 0, null, []); c[p] += 2; if (ok) return true; }
    return false;
  }
  function decomps(c) {
    var all = [];
    for (var p = 0; p < 34; p++) if (c[p] >= 2) { c[p] -= 2; var out = []; sets(c, 0, out, []); c[p] += 2; out.forEach(function (s) { all.push({ pair: p, sets: s }); }); }
    return all;
  }

  /* ---------- 向聽數：還差幾步聽牌（-1 代表已經胡） ---------- */
  function shanten(c, N) {
    var best = 99;
    function dfs(i, m, t, p) {
      while (i < 34 && !c[i]) i++;
      if (i >= 34) { var tt = Math.min(t, N - m); var s = 2 * N - 2 * m - tt - p; if (s < best) best = s; return; }
      if (c[i] >= 3) { c[i] -= 3; dfs(i, m + 1, t, p); c[i] += 3; }
      if (i < 27 && i % 9 <= 6 && c[i + 1] && c[i + 2]) { c[i]--; c[i + 1]--; c[i + 2]--; dfs(i, m + 1, t, p); c[i]++; c[i + 1]++; c[i + 2]++; }
      if (m + t < N + 1) {
        if (c[i] >= 2) { c[i] -= 2; if (!p) dfs(i, m, t, 1); dfs(i, m, t + 1, p); c[i] += 2; }
        if (i < 27 && i % 9 <= 7 && c[i + 1]) { c[i]--; c[i + 1]--; dfs(i, m, t + 1, p); c[i]++; c[i + 1]++; }
        if (i < 27 && i % 9 <= 6 && c[i + 2]) { c[i]--; c[i + 2]--; dfs(i, m, t + 1, p); c[i]++; c[i + 2]++; }
      }
      c[i]--; dfs(i, m, t, p); c[i]++;
    }
    dfs(0, 0, 0, 0);
    return best;
  }
  /* 一張牌在手上的「好用程度」，越小越該打出去 */
  function useful(c, t) {
    if (t >= 27) return c[t] >= 3 ? 30 : c[t] === 2 ? 12 : (t >= 31 ? 1 : 0);
    var r = t % 9, v = c[t] * 6;
    if (r > 0) v += c[t - 1] * 4; if (r < 8) v += c[t + 1] * 4;
    if (r > 1) v += c[t - 2] * 2; if (r < 7) v += c[t + 2] * 2;
    if (r === 0 || r === 8) v -= 1;
    return v;
  }
  function ukeire(c, N, seen) {
    var cur = shanten(c, N), n = 0;
    for (var t = 0; t < 34; t++) { var left = 4 - c[t] - (seen ? seen[t] : 0); if (left <= 0) continue; c[t]++; if (shanten(c, N) < cur) n += left; c[t]--; }
    return n;
  }
  /* 電腦選一張要打的牌 */
  function pickDiscard(hand, N, lv, seen) {
    var c = counts(hand), types = [];
    hand.forEach(function (t) { if (types.indexOf(t) < 0) types.push(t); });
    if (lv <= 1 && Math.random() < .4) return hand[Math.floor(Math.random() * hand.length)];
    var best = null;
    types.forEach(function (t) {
      c[t]--;
      var s = lv >= 3 ? shanten(c, N) : 0, u = lv >= 4 && hand.length <= 17 ? ukeire(c, N, seen) : 0;
      c[t]++;
      var score = [s, -u, useful(c, t)];
      if (!best || score[0] < best.s[0] || (score[0] === best.s[0] && (score[1] < best.s[1] || (score[1] === best.s[1] && score[2] < best.s[2])))) best = { t: t, s: score };
    });
    return best.t;
  }
  /* 吃／碰之後再打一張，最好能到幾向聽 */
  function afterClaim(hand, remove, N) {
    var h = hand.slice(); remove.forEach(function (t) { h.splice(h.indexOf(t), 1); });
    var c = counts(h), best = 99;
    for (var t = 0; t < 34; t++) if (c[t]) { c[t]--; var s = shanten(c, N - 1); if (s < best) best = s; c[t]++; }
    return best;
  }

  /* ---------- 台數（台灣 16 張常見正式台數） ----------
     莊家／連莊拉莊的台數要看「誰付錢」，所以不放在這裡，由遊戲在付分時另外加。 */
  var WN = '東南西北';
  function waitsOf(h) { // h：還沒胡之前的手牌（不含胡的那張）
    var c = counts(h), w = [];
    for (var t = 0; t < 34; t++) { if (c[t] >= 4) continue; c[t]++; if (isWin(c)) w.push(t); c[t]--; }
    return w;
  }
  function tai(o) { // o: {hand(含胡的那張), melds, flowers, wind(門風0-3), round(圈風0-3), tsumo, win(胡的牌), kanDraw, lastTile, rob, first:'heaven'|'earth'|'human'|null}
    var c = counts(o.hand), ds = decomps(c), best = null, bestN = -1;
    var open = o.melds.filter(function (m) { return m.k !== 'ankan'; }), ank = o.melds.filter(function (m) { return m.k === 'ankan'; }).length;
    var all = o.hand.filter(function (t) { return t < 34; });
    o.melds.forEach(function (m) { if (m.k === 'chi') all.push(m.t, m.t + 1, m.t + 2); else all.push(m.t, m.t, m.t); });
    var suits = {}; all.forEach(function (t) { suits[suit(t)] = 1; });
    var nSuit = [0, 1, 2].filter(function (s) { return suits[s]; }).length, hasHon = !!suits[3];
    var h16 = o.hand.slice(); h16.splice(h16.indexOf(o.win), 1);
    var waits = waitsOf(h16).length;
    var quan = 27 + (o.round || 0), men = 27 + (o.wind || 0);
    ds.forEach(function (d) {
      var places = [];
      if (d.pair === o.win) places.push(-1);
      d.sets.forEach(function (s, i) { if ((s.k === 'pung' && s.t === o.win) || (s.k === 'chow' && o.win >= s.t && o.win <= s.t + 2)) places.push(i); });
      places.forEach(function (pl) {
        var L = [];
        if (o.first === 'heaven') L.push(['天胡', 24]); else if (o.first === 'earth') L.push(['地胡', 16]); else if (o.first === 'human') L.push(['人胡', 16]);
        if (!o.first) {
          if (!open.length) L.push(['門清', 1]);
          if (o.tsumo) L.push(['自摸', 1]);
          if (o.tsumo && !open.length) L.push(['不求人（門清又自摸，再加）', 1]);
        }
        var allOpen = open.length === 5 && !o.tsumo;
        if (allOpen) L.push(['全求人', 2]);
        if (o.kanDraw && o.tsumo) L.push(['槓上開花', 1]);
        if (o.lastTile) L.push([o.tsumo ? '海底撈月' : '河底撈魚', 1]);
        if (o.rob) L.push(['搶槓', 1]);
        var hp = d.sets.filter(function (s) { return s.k === 'pung'; });
        var pungs = hp.map(function (s) { return s.t; }).concat(o.melds.filter(function (m) { return m.k !== 'chi'; }).map(function (m) { return m.t; }));
        var chows = d.sets.filter(function (s) { return s.k === 'chow'; }).length + o.melds.filter(function (m) { return m.k === 'chi'; }).length;
        var hidden = ank + d.sets.filter(function (s, i) { return s.k === 'pung' && (o.tsumo || i !== pl); }).length;
        // 三元牌
        var drag = pungs.filter(function (t) { return t >= 31; }).length;
        if (drag === 3) L.push(['大三元', 8]); else if (drag === 2 && d.pair >= 31) L.push(['小三元', 4]); else pungs.forEach(function (t) { if (t >= 31) L.push([name(t) + '（三元牌刻子）', 1]); });
        // 風牌
        var nw = pungs.filter(function (t) { return t >= 27 && t <= 30; }).length;
        if (nw === 4) L.push(['大四喜', 16]);
        else if (nw === 3 && d.pair >= 27 && d.pair <= 30) L.push(['小四喜', 8]);
        else { if (pungs.indexOf(quan) >= 0) L.push(['圈風（' + WN[o.round || 0] + '風圈的' + name(quan) + '刻子）', 1]); if (pungs.indexOf(men) >= 0) L.push(['門風（你坐' + WN[o.wind || 0] + '家的' + name(men) + '刻子）', 1]); }
        var ziyi = !nSuit && hasHon;
        if (!chows && !ziyi) L.push(['碰碰胡', 4]);
        if (hidden >= 5) L.push(['五暗刻', 8]); else if (hidden === 4) L.push(['四暗刻', 5]); else if (hidden === 3) L.push(['三暗刻', 2]);
        if (ziyi) L.push(['字一色', 16]); else if (nSuit === 1 && !hasHon) L.push(['清一色', 8]); else if (nSuit === 1 && hasHon) L.push(['混一色', 4]);
        if (!o.flowers.length && !hasHon && !pungs.length && !o.tsumo && waits >= 2 && !allOpen) L.push(['平胡', 2]);
        if (waits === 1 && !allOpen) {
          var s0 = pl >= 0 ? d.sets[pl] : null;
          L.push([pl < 0 ? '獨聽（單吊）' : s0.k === 'chow' && o.win === s0.t + 1 ? '獨聽（中洞）' : s0.k === 'chow' ? '獨聽（邊張）' : '獨聽', 1]);
        }
        var n = L.reduce(function (a, x) { return a + x[1]; }, 0);
        if (n > bestN) { bestN = n; best = L; }
      });
    });
    best = best || [];
    // 花牌：自己位置的花各 1 台；同一組四張（春夏秋冬或梅蘭竹菊）收齊是花槓 2 台
    [0, 4].forEach(function (b) {
      var have = o.flowers.filter(function (f) { return f - 34 >= b && f - 34 < b + 4; });
      if (have.length === 4) best.push([b ? '花槓（梅蘭竹菊）' : '花槓（春夏秋冬）', 2]);
      else if (have.indexOf(34 + b + (o.wind || 0)) >= 0) best.push(['正花 ' + FL[b + (o.wind || 0)], 1]);
    });
    var total = best.reduce(function (a, x) { return a + x[1]; }, 0);
    return { list: best, total: total, waits: waits };
  }

  /* ---------- 牌面（SVG） ---------- */
  var CACHE = {};
  var PIN = { 1: [[20, 27]], 2: [[20, 15], [20, 39]], 3: [[10, 12], [20, 27], [30, 42]], 4: [[12, 15], [28, 15], [12, 39], [28, 39]], 5: [[12, 14], [28, 14], [20, 27], [12, 40], [28, 40]],
    6: [[12, 11], [28, 11], [12, 27], [28, 27], [12, 43], [28, 43]], 7: [[9, 8], [20, 13], [31, 18], [12, 32], [28, 32], [12, 45], [28, 45]],
    8: [[12, 9], [28, 9], [12, 21], [28, 21], [12, 33], [28, 33], [12, 45], [28, 45]], 9: [[9, 11], [20, 11], [31, 11], [9, 27], [20, 27], [31, 27], [9, 43], [20, 43], [31, 43]] };
  var SOU = { 2: [[20, 15], [20, 39]], 3: [[20, 14], [12, 39], [28, 39]], 4: [[13, 15], [27, 15], [13, 39], [27, 39]], 5: [[11, 15], [29, 15], [20, 27], [11, 39], [29, 39]],
    6: [[10, 15], [20, 15], [30, 15], [10, 39], [20, 39], [30, 39]], 7: [[20, 10], [10, 27], [20, 27], [30, 27], [10, 44], [20, 44], [30, 44]],
    8: [[8, 15], [16, 15], [24, 15], [32, 15], [8, 39], [16, 39], [24, 39], [32, 39]], 9: [[10, 10], [20, 10], [30, 10], [10, 27], [20, 27], [30, 27], [10, 44], [20, 44], [30, 44]] };
  function face(t) {
    var s = '';
    if (t < 9) s = '<text x="20" y="20" font-size="15" fill="#1b2a6b" text-anchor="middle" font-weight="900">' + NUM[t] + '</text><text x="20" y="44" font-size="18" fill="#c1121f" text-anchor="middle" font-weight="900">萬</text>';
    else if (t < 18) {
      var n = t - 8, pts = PIN[n], r = n === 1 ? 13 : n === 2 ? 8.5 : n <= 5 ? 6.5 : 5.6;
      pts.forEach(function (p, k) {
        var col = n === 1 ? '#c1121f' : (n === 6 && k < 2) || (n === 7 && k < 3) ? '#1f8a3d' : (n === 5 && k === 2) || n === 3 && k === 1 ? '#c1121f' : (k % 2 ? '#1b4fa0' : (n >= 7 ? '#c1121f' : '#1f8a3d'));
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + (r > 8 ? 2.4 : 1.8) + '"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (r * .42) + '" fill="' + col + '"/>';
        if (n === 1) s += '<circle cx="20" cy="27" r="8.5" fill="none" stroke="#1f8a3d" stroke-width="1.6"/>';
      });
    } else if (t < 27) {
      var m = t - 17;
      if (m === 1) s = '<ellipse cx="21" cy="30" rx="9" ry="7" fill="#1f8a3d"/><circle cx="13" cy="19" r="5" fill="#c1121f"/><path d="M10 19 L4 21 L10 22 Z" fill="#e8a33d"/><path d="M28 30 Q36 22 34 12 M29 33 Q38 30 38 20" stroke="#1b4fa0" stroke-width="2.2" fill="none"/><path d="M17 37 L15 46 M23 37 L25 46" stroke="#c1121f" stroke-width="1.8"/>';
      else SOU[m].forEach(function (p, k) {
        var red = (m === 5 && k === 2) || (m === 7 && k === 0) || (m === 9 && k % 3 === 1);
        var col = red ? '#c1121f' : (m === 8 && k % 2 ? '#1b4fa0' : '#1f8a3d');
        s += '<rect x="' + (p[0] - 2.6) + '" y="' + (p[1] - 7) + '" width="5.2" height="14" rx="2.4" fill="' + col + '"/><line x1="' + (p[0] - 2.6) + '" x2="' + (p[0] + 2.6) + '" y1="' + p[1] + '" y2="' + p[1] + '" stroke="#fff" stroke-width="1"/>';
      });
    } else if (t < 34) {
      if (t === 33) s = '<rect x="9" y="11" width="22" height="32" rx="2" fill="none" stroke="#1b4fa0" stroke-width="2.6"/>';
      else { var col2 = t === 31 ? '#c1121f' : t === 32 ? '#1f8a3d' : '#1b1b22'; s = '<text x="20" y="36" font-size="25" fill="' + col2 + '" text-anchor="middle" font-weight="900">' + HON[t - 27] + '</text>'; }
    } else {
      var f = t - 34, cf = f < 4 ? '#c1121f' : '#1b4fa0';
      s = '<text x="20" y="35" font-size="21" fill="' + cf + '" text-anchor="middle" font-weight="900">' + FL[f] + '</text><text x="33" y="13" font-size="10" fill="' + cf + '" text-anchor="middle" font-weight="700">' + (f % 4 + 1) + '</text>';
    }
    return s;
  }
  function svg(t, o) {
    o = o || {};
    if (o.back) return '<svg class="mj-t back" viewBox="0 0 40 54"><rect x="1" y="1" width="38" height="52" rx="5" fill="#2e8b57" stroke="#1d5e3a" stroke-width="2"/><rect x="5" y="5" width="30" height="44" rx="3" fill="none" stroke="#7fd1a3" stroke-width="1"/></svg>';
    if (!CACHE[t]) CACHE[t] = '<rect x="1" y="1" width="38" height="52" rx="5" fill="#fbf7ea" stroke="#c8bfa3" stroke-width="1.5"/>' + face(t);
    return '<svg class="mj-t" viewBox="0 0 40 54" data-t="' + t + '">' + CACHE[t] + '</svg>';
  }
  return { name: name, wall: wall, counts: counts, sortHand: sortHand, isWin: isWin, shanten: shanten, pickDiscard: pickDiscard, afterClaim: afterClaim, tai: tai, waitsOf: waitsOf, svg: svg, isFlower: isFlower, useful: useful, HON: HON };
})();
