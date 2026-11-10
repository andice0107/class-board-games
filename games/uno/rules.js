/* 彩色接龍（UNO 玩法）：牌組、規則判斷、電腦、牌面 SVG
   牌的代碼：顏色 r/y/g/b（萬用牌 w）＋ 值：0-9、S 跳過、R 迴轉、D 加二、W 變色、F 變色加四 */
window.UNO = (function () {
  'use strict';
  var COLS = ['r', 'y', 'g', 'b'];
  var HEX = { r: '#e63946', y: '#f4a300', g: '#2a9d5c', b: '#2f6fe4', w: '#24213a' };
  var CNAME = { r: '紅', y: '黃', g: '綠', b: '藍' };
  var ORDER = { r: 0, y: 1, g: 2, b: 3, w: 4 }, VORD = '0123456789SRDWF';

  function deck() {
    var d = [];
    COLS.forEach(function (c) {
      d.push(c + '0');
      for (var k = 0; k < 2; k++) '123456789SRD'.split('').forEach(function (v) { d.push(c + v); });
    });
    for (var k = 0; k < 4; k++) { d.push('wW'); d.push('wF'); }
    return shuffle(d);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sortHand(h) { return h.sort(function (a, b) { return ORDER[a[0]] - ORDER[b[0]] || VORD.indexOf(a[1]) - VORD.indexOf(b[1]); }); }
  function isWild(c) { return c[0] === 'w'; }
  function playable(c, top, color) { return isWild(c) || c[0] === color || c[1] === top[1]; }
  function points(c) { var v = c[1]; if (v >= '0' && v <= '9') return +v; return isWild(c) ? 50 : 20; }

  /* ---------- 電腦 ---------- */
  function bestColor(hand, level) {
    if (level <= 1) return COLS[Math.floor(Math.random() * 4)];
    var n = { r: 0, y: 0, g: 0, b: 0 }; hand.forEach(function (c) { if (!isWild(c)) n[c[0]] += 1 + (c[1] > '9' ? .5 : 0); });
    var best = 'r'; COLS.forEach(function (c) { if (n[c] > n[best]) best = c; });
    return best;
  }
  /* 回傳要出的牌在手牌中的位置，-1 代表沒有能出的牌 */
  function choose(hand, top, color, level, nextCount) {
    var ok = []; hand.forEach(function (c, i) { if (playable(c, top, color)) ok.push(i); });
    if (!ok.length) return -1;
    if (level <= 1) return ok[Math.floor(Math.random() * ok.length)];
    var cnt = { r: 0, y: 0, g: 0, b: 0 }; hand.forEach(function (c) { if (!isWild(c)) cnt[c[0]]++; });
    var best = ok[0], bv = -1e9;
    ok.forEach(function (i) {
      var c = hand[i], v = 0;
      if (level === 2) v = Math.random() * 10 - (isWild(c) ? 4 : 0);
      else {
        v = isWild(c) ? -12 : cnt[c[0]] * 2;          // 平常先出顏色多的牌，萬用牌留到最後
        if (c[1] > '9' && !isWild(c)) v += 3;          // 功能牌早點出，免得被罰分
        if (level >= 4 && nextCount <= 2 && (c[1] === 'D' || c[1] === 'F' || c[1] === 'S')) v += 30; // 下一家快贏了就攻擊
        if (level >= 4 && c[1] === 'F' && nextCount > 3) v -= 8;
        if (!isWild(c)) v += +(c[1] <= '9' ? c[1] : 5) * .2;   // 點數大的先丟
        v += Math.random() * .5;
      }
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }

  /* ---------- 牌面 SVG（原創設計：漫畫風粗黑框＋斜橢圓） ---------- */
  function glyph(v, col, big) {
    var s = big ? 1 : .42, fill = big ? col : '#fff';
    if (v >= '0' && v <= '9') return '<text x="0" y="' + (big ? 9 : 4) + '" font-size="' + (big ? 28 : 12) + '" text-anchor="middle" font-weight="900" font-family="Arial Black,Arial,sans-serif" fill="' + fill + '" stroke="#1b1830" stroke-width="' + (big ? 1.6 : .8) + '" paint-order="stroke">' + v + (v === '6' || v === '9' ? '<tspan font-size="' + (big ? 8 : 5) + '">.</tspan>' : '') + '</text>';
    if (v === 'D' || v === 'F') return '<text x="0" y="' + (big ? 8 : 4) + '" font-size="' + (big ? 21 : 10) + '" text-anchor="middle" font-weight="900" font-family="Arial Black,Arial,sans-serif" fill="' + fill + '" stroke="#1b1830" stroke-width="' + (big ? 1.4 : .7) + '" paint-order="stroke">+' + (v === 'D' ? 2 : 4) + '</text>';
    if (v === 'S') return '<g transform="scale(' + s + ')" fill="none" stroke="' + fill + '" stroke-width="4.5"><circle r="10"/><path d="M-7 7L7 -7"/></g>';
    if (v === 'R') return '<g transform="scale(' + s + ') rotate(-35)" fill="' + fill + '" stroke="#1b1830" stroke-width="1"><path d="M-9 -3 h12 v-5 l8 8 -8 8 v-5 h-12z" transform="translate(0,-5)"/><path d="M9 3 h-12 v5 l-8 -8 8 -8 v5 h12z" transform="translate(0,5)"/></g>';
    if (v === 'W') return '<g transform="scale(' + s + ')">' + wheel(11) + '</g>';
    return '';
  }
  function wheel(r) {
    var q = ['r', 'y', 'g', 'b'], o = '';
    q.forEach(function (c, k) { var a0 = k * Math.PI / 2 - Math.PI / 2, a1 = a0 + Math.PI / 2; o += '<path d="M0 0L' + (r * Math.cos(a0)).toFixed(2) + ' ' + (r * Math.sin(a0)).toFixed(2) + 'A' + r + ' ' + r + ' 0 0 1 ' + (r * Math.cos(a1)).toFixed(2) + ' ' + (r * Math.sin(a1)).toFixed(2) + 'Z" fill="' + HEX[c] + '"/>'; });
    return o + '<circle r="' + r + '" fill="none" stroke="#1b1830" stroke-width="1.4"/>';
  }
  /* o: {color: 萬用牌選定的顏色, back: true 背面} */
  function card(c, o) {
    o = o || {};
    if (o.back || !c) return '<svg class="un-card back" viewBox="0 0 60 90"><rect x="1" y="1" width="58" height="88" rx="8" fill="#1b1830"/><rect x="5" y="5" width="50" height="80" rx="5" fill="#2d2a4a"/>' +
      '<g transform="translate(30 45) rotate(-28)"><ellipse rx="19" ry="32" fill="#f4a300"/><text y="-2" font-size="13" text-anchor="middle" font-weight="900" fill="#e63946" stroke="#1b1830" stroke-width=".8" paint-order="stroke" transform="rotate(28)">接龍</text></g>' +
      '<circle cx="12" cy="13" r="3" fill="#e63946"/><circle cx="48" cy="77" r="3" fill="#2f6fe4"/></svg>';
    var col = HEX[c[0]], v = c[1], inner = isWild(c) ? '#1b1830' : col;
    var h = '<svg class="un-card" viewBox="0 0 60 90"><rect x="1" y="1" width="58" height="88" rx="8" fill="#1b1830"/><rect x="4" y="4" width="52" height="82" rx="6" fill="' + (isWild(c) ? '#2d2a4a' : col) + '"/>';
    if (isWild(c)) h += '<g transform="translate(30 45) rotate(28)"><ellipse rx="20" ry="33" fill="#fff"/>' + (v === 'F' ? '<g transform="rotate(-28)"><rect x="-13" y="-17" width="10" height="15" rx="2" fill="' + HEX.r + '" stroke="#1b1830"/><rect x="3" y="-13" width="10" height="15" rx="2" fill="' + HEX.y + '" stroke="#1b1830"/><rect x="-11" y="1" width="10" height="15" rx="2" fill="' + HEX.b + '" stroke="#1b1830"/><rect x="2" y="4" width="10" height="15" rx="2" fill="' + HEX.g + '" stroke="#1b1830"/></g>' : '<g transform="rotate(-28)">' + wheel(15) + '</g>') + '</g>';
    else h += '<g transform="translate(30 45) rotate(28)"><ellipse rx="20" ry="33" fill="#fff"/></g><g transform="translate(30 45)">' + glyph(v, inner, true) + '</g>';
    if (isWild(c) && v === 'F') h += '<g transform="translate(30 76)">' + glyph('F', '#fff', false) + '</g>';
    h += '<g transform="translate(11 15)">' + glyph(v, '#fff', false) + '</g><g transform="translate(49 75) rotate(180)">' + glyph(v, '#fff', false) + '</g>';
    if (o.color && isWild(c)) h += '<rect x="2.5" y="2.5" width="55" height="85" rx="7" fill="none" stroke="' + HEX[o.color] + '" stroke-width="4"/>';
    return h + '</svg>';
  }
  function name(c) {
    var v = c[1], n = { S: '跳過', R: '迴轉', D: '+2', W: '變色', F: '變色 +4' }[v] || v;
    return isWild(c) ? n : CNAME[c[0]] + ' ' + n;
  }
  return { COLS: COLS, HEX: HEX, CNAME: CNAME, deck: deck, shuffle: shuffle, sortHand: sortHand, isWild: isWild, playable: playable, points: points, choose: choose, bestColor: bestColor, card: card, name: name };
})();
