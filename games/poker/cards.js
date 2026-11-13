/* 撲克牌共用：牌組、牌面 SVG、排序。牌的代碼 = 點數 + 花色，例如 'As'、'Tc'、'2h'；鬼牌 'X1'
   點數 A 2 3 4 5 6 7 8 9 T J Q K；花色 c 梅花 < d 方塊 < h 紅心 < s 黑桃 */
window.PK = (function () {
  'use strict';
  var RANKS = 'A23456789TJQK', SUITS = 'cdhs';
  var SYM = { c: '♣', d: '♦', h: '♥', s: '♠' }, SNAME = { c: '梅花', d: '方塊', h: '紅心', s: '黑桃' };
  var LABEL = { A: 'A', T: '10', J: 'J', Q: 'Q', K: 'K' };
  function label(r) { return LABEL[r] || r; }
  function red(c) { return c[1] === 'd' || c[1] === 'h'; }
  function deck(jokers) {
    var d = []; SUITS.split('').forEach(function (s) { RANKS.split('').forEach(function (r) { d.push(r + s); }); });
    for (var i = 1; i <= (jokers || 0); i++) d.push('X' + i);
    return shuffle(d);
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function name(c) { if (c[0] === 'X') return '鬼牌'; return SNAME[c[1]] + ' ' + label(c[0]); }
  /* 中間的圖案位置（傳統的點數排列） */
  var PIPS = {
    A: [[30, 45]], 2: [[30, 20], [30, 70]], 3: [[30, 20], [30, 45], [30, 70]],
    4: [[19, 20], [41, 20], [19, 70], [41, 70]], 5: [[19, 20], [41, 20], [30, 45], [19, 70], [41, 70]],
    6: [[19, 20], [41, 20], [19, 45], [41, 45], [19, 70], [41, 70]],
    7: [[19, 20], [41, 20], [30, 32], [19, 45], [41, 45], [19, 70], [41, 70]],
    8: [[19, 20], [41, 20], [30, 32], [19, 45], [41, 45], [30, 58], [19, 70], [41, 70]],
    9: [[19, 18], [41, 18], [19, 36], [41, 36], [30, 45], [19, 54], [41, 54], [19, 72], [41, 72]],
    T: [[19, 18], [41, 18], [30, 27], [19, 36], [41, 36], [19, 54], [41, 54], [30, 63], [19, 72], [41, 72]]
  };
  var FACE = { J: '#2f6fb0', Q: '#b0306a', K: '#b07a1a' };
  function svg(c, o) {
    o = o || {};
    if (o.back || !c) return '<svg class="pk-card back" viewBox="0 0 60 90"><rect x=".6" y=".6" width="58.8" height="88.8" rx="6" fill="#fff" stroke="#8a8a8a" stroke-width=".8"/><rect x="4" y="4" width="52" height="82" rx="4" fill="#8f1d2c"/>' +
      '<g stroke="#e9c46a" stroke-width=".7" fill="none" opacity=".8"><rect x="7" y="7" width="46" height="76" rx="3"/><path d="M7 20L53 66M7 34L53 80M7 48L39 80M7 62L25 80M7 6L53 52M21 7L53 38M35 7L53 24M7 70L53 24M7 56L53 10M7 42L42 7M7 28L28 7M7 84L53 38M21 83L53 52M35 83L53 66"/></g>' +
      '<circle cx="30" cy="45" r="9" fill="#8f1d2c" stroke="#e9c46a" stroke-width="1.2"/><text x="30" y="49.5" font-size="12" text-anchor="middle" fill="#e9c46a" font-weight="900">♠</text></svg>';
    if (c[0] === 'X') return '<svg class="pk-card" viewBox="0 0 60 90"><rect x=".6" y=".6" width="58.8" height="88.8" rx="6" fill="#fffdf6" stroke="#8a8a8a" stroke-width=".8"/>' +
      '<text x="6" y="14" font-size="7" font-weight="900" fill="#6a2c91" writing-mode="tb">JOKER</text>' +
      '<g transform="translate(31 47)"><path d="M-14 -4 L-9 -18 L-4 -6 L0 -20 L4 -6 L9 -18 L14 -4 Z" fill="#e63946" stroke="#1b1830" stroke-width=".8"/><circle cx="-9" cy="-19" r="2" fill="#f4a300"/><circle cx="0" cy="-21" r="2" fill="#2a9d5c"/><circle cx="9" cy="-19" r="2" fill="#2f6fe4"/>' +
      '<circle cy="4" r="9" fill="#ffe0bd" stroke="#1b1830" stroke-width=".8"/><circle cx="-3.2" cy="2" r="1.1"/><circle cx="3.2" cy="2" r="1.1"/><path d="M-4 6 Q0 10 4 6" fill="none" stroke="#1b1830" stroke-width=".9"/><circle cx="-5.5" cy="6" r="1.4" fill="#ff8fa3"/><circle cx="5.5" cy="6" r="1.4" fill="#ff8fa3"/>' +
      '<path d="M-12 22 Q0 12 12 22 Z" fill="#6a2c91"/></g></svg>';
    var r = c[0], s = c[1], col = red(c) ? '#c8102e' : '#1b1b22', sym = SYM[s];
    var h = '<svg class="pk-card' + (red(c) ? ' red' : '') + '" viewBox="0 0 60 90"><rect x=".6" y=".6" width="58.8" height="88.8" rx="6" fill="#fffdf6" stroke="#8a8a8a" stroke-width=".8"/>';
    var lab = label(r);
    function corner() { return '<text x="6.5" y="13.5" font-size="' + (lab.length > 1 ? 10.5 : 12) + '" font-weight="900" text-anchor="middle" fill="' + col + '" font-family="Georgia,serif" letter-spacing="-1">' + lab + '</text><text x="6.5" y="22.5" font-size="8.5" text-anchor="middle" fill="' + col + '">' + sym + '</text>'; }
    h += corner() + '<g transform="rotate(180 30 45)">' + corner() + '</g>';
    if (PIPS[r]) {
      var big = r === 'A';
      PIPS[r].forEach(function (p, k) { var flip = !big && p[1] > 46; h += '<text x="' + p[0] + '" y="' + (p[1] + (big ? 8 : 4)) + '" font-size="' + (big ? (s === 's' ? 30 : 24) : 13) + '" text-anchor="middle" fill="' + col + '"' + (flip ? ' transform="rotate(180 ' + p[0] + ' ' + p[1] + ')"' : '') + '>' + sym + '</text>'; });
    } else {
      // 人頭牌：原創簡筆插畫（框＋人物＋點數字母）
      var fc = FACE[r];
      h += '<rect x="13" y="12" width="34" height="66" rx="3" fill="' + fc + '" opacity=".12" stroke="' + fc + '" stroke-width=".8"/>';
      h += '<g transform="translate(30 40)">' +
        (r === 'K' ? '<path d="M-9 -12 L-9 -20 L-4.5 -15 L0 -22 L4.5 -15 L9 -20 L9 -12 Z" fill="#f4c430" stroke="#1b1830" stroke-width=".6"/>' : r === 'Q' ? '<path d="M-8 -12 Q0 -24 8 -12 Z" fill="#f4c430" stroke="#1b1830" stroke-width=".6"/><circle cy="-19" r="1.6" fill="#e63946"/>' : '<path d="M-9 -12 L9 -12 L6 -18 L-6 -18 Z" fill="' + fc + '" stroke="#1b1830" stroke-width=".6"/><path d="M6 -18 Q12 -20 13 -14" stroke="#e63946" stroke-width="1.4" fill="none"/>') +
        '<circle cy="-5" r="7" fill="#ffe0bd" stroke="#1b1830" stroke-width=".6"/><circle cx="-2.4" cy="-6" r=".9"/><circle cx="2.4" cy="-6" r=".9"/><path d="M-2 -2 Q0 0 2 -2" fill="none" stroke="#1b1830" stroke-width=".7"/>' +
        (r === 'K' ? '<path d="M-5 -1 Q0 6 5 -1 L4 4 Q0 7 -4 4Z" fill="#8a5a2b"/>' : '') +
        '<path d="M-12 18 Q-12 4 0 3 Q12 4 12 18 Z" fill="' + fc + '" stroke="#1b1830" stroke-width=".6"/><path d="M-3 4 L0 12 L3 4" fill="#fff" opacity=".8"/>' +
        '<text y="31" font-size="9" text-anchor="middle" fill="' + col + '">' + sym + '</text></g>';
    }
    if (o.dim) h += '<rect x=".6" y=".6" width="58.8" height="88.8" rx="6" fill="#000" opacity=".28"/>';
    return h + '</svg>';
  }
  /* 小尺寸用的簡化牌面：只有點數和花色 */
  function mini(c) {
    var col = red(c) ? '#c8102e' : '#1b1b22', lab = label(c[0]);
    return '<svg class="pk-card mini" viewBox="0 0 40 60"><rect x=".5" y=".5" width="39" height="59" rx="4" fill="#fffdf6" stroke="#8a8a8a" stroke-width=".8"/><text x="20" y="28" font-size="' + (lab.length > 1 ? 19 : 23) + '" font-weight="900" text-anchor="middle" fill="' + col + '" font-family="Georgia,serif" letter-spacing="-1.5">' + lab + '</text><text x="20" y="51" font-size="18" text-anchor="middle" fill="' + col + '">' + SYM[c[1]] + '</text></svg>';
  }
  return { RANKS: RANKS, SUITS: SUITS, SYM: SYM, SNAME: SNAME, label: label, red: red, deck: deck, shuffle: shuffle, name: name, svg: svg, mini: mini };
})();

/* 撲克牌共用畫面：對手列、自己的手牌 */
window.PKUI = (function () {
  'use strict';
  var SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300', '#8e44ad', '#16a2b8'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  /* tagFn(i) 回傳對手旁邊的小標籤（例如 Pass） */
  function opps(tb, v, seat, tagFn, short) {
    var box = el('div', 'pk-opps');
    for (var k = 1; k < v.np; k++) {
      var i = (seat + k) % v.np, info = tb.seats[i], turn = !tb.res && v.turn === i, out = v.out && v.out.indexOf(i) >= 0;
      var w = el('div', 'pk-opp' + (turn ? ' turn' : '') + (out ? ' out' : '')); w.setAttribute('data-seat', i);
      var t = el('div', 'pk-opp-top'), dot = el('i'); dot.style.background = SEATC[i]; t.appendChild(dot); t.appendChild(el('span', 'n', short(tb, i))); w.appendChild(t);
      var n = v.counts[i], fan = el('div', 'pk-fan');
      for (var j = 0; j < Math.min(n, 9); j++) { var b = el('span', 'pk-mini'); b.style.transform = 'rotate(' + ((j - Math.min(n, 9) / 2) * 6) + 'deg)'; fan.appendChild(b); }
      w.appendChild(fan);
      w.appendChild(el('div', 'pk-cnt', out ? '已認輸' : n + ' 張'));
      var tag = tagFn ? tagFn(i) : ''; if (tag) w.appendChild(el('div', 'pk-tag', tag));
      if (!info.bot && !info.on) w.appendChild(el('div', 'pk-off', info.gone ? '已離開' : '離線'));
      box.appendChild(w);
    }
    return box;
  }
  /* o: {title, color, count, turn, sel:[], info, onTap(c), dim(c)} */
  function hand(cards, o) {
    var me = el('div', 'pk-me' + (o.turn ? ' turn' : ''));
    var t = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = o.color; t.appendChild(dot);
    t.appendChild(el('span', 'n', o.title)); if (o.info) t.appendChild(el('span', 'pk-info', o.info)); t.appendChild(el('span', 'pk-cnt', (o.count != null ? o.count : cards.length) + ' 張'));
    me.appendChild(t);
    var h = el('div', 'pk-hand'), rows = cards.length > 9 ? 2 : 1, per = Math.ceil(cards.length / rows);
    for (var r = 0; r < rows; r++) {
      var row = el('div', 'pk-row');
      cards.slice(r * per, (r + 1) * per).forEach(function (c, j) {
        var b = el('button', 'pk-hc' + (o.sel && o.sel.indexOf(c) >= 0 ? ' sel' : '') + (o.dim && o.dim(c) ? ' dim' : '') + (o.fresh && o.fresh[r * per + j] ? ' fresh-card' : '')); b.type = 'button'; b.setAttribute('data-c', c);
        b.innerHTML = PK.svg(c);
        b.addEventListener('click', function () { if (o.onTap) o.onTap(c); });
        row.appendChild(b);
      });
      h.appendChild(row);
    }
    me.appendChild(h);
    return me;
  }
  /* 「整理」按鈕：list = [[key, 文字, 排序函式], ...]；L 是遊戲自己的狀態（記住選了哪一種） */
  function sortBtns(ctx, tools, L, HK, list) {
    list.forEach(function (o) {
      tools.appendChild(ctx.button('pk-btn sort-btn' + ((L.sortBy || list[0][0]) === o[0] ? ' on' : ''), o[1], function () { L.sortBy = o[0]; BG.handSort(HK, o[2]); ctx.snd('tap'); ctx.rerender(); }));
    });
  }
  function sorter(L, list) { var k = L.sortBy || list[0][0]; for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][2]; return list[0][2]; }
  var RO = 'A23456789TJQKX', SO = 'cdhs1';
  function byRank(h) { return h.sort(function (a, b) { return RO.indexOf(a[0]) - RO.indexOf(b[0]) || SO.indexOf(a[1]) - SO.indexOf(b[1]); }); }
  function bySuit(h) { return h.sort(function (a, b) { return SO.indexOf(a[1]) - SO.indexOf(b[1]) || RO.indexOf(a[0]) - RO.indexOf(b[0]); }); }
  return { SEATC: SEATC, opps: opps, hand: hand, sortBtns: sortBtns, sorter: sorter, byRank: byRank, bySuit: bySuit };
})();
