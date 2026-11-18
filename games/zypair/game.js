/* 注音配對撿紅點（37 個注音符號 × 2 或 4 種顏色，配對撿牌）
   - 37 個注音符號，每個符號有 2 色（黑1分、黃4分）或 4 色（黑1、紅2、藍3、黃4）的牌。
   - 中間有牌堆，開局先翻幾張到桌上。每人固定張數手牌（2 色固定 6 張、桌上翻 6 張；4 色老師可選）。
   - 輪到你：手牌的一張＋桌上同一個符號的一張 → 兩張一起收走，分數 ＝ 兩張牌的分數相加。
     沒有可以配的（或不想配）就把一張手牌打到桌上。之後補一張牌，維持固定手牌張數。
   - 所有人手牌都出完就結束；桌上剩下的牌作廢。限時（預設 15 分鐘）：時間到，這一輪打完就結算。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2a7bd4', '#2a9d6f', '#e0a020', '#8e5bd6', '#d6568f'];
  var REASONS = { most: '分數最高', time: '時間到，分數最高', tie: '分數一樣，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  var SYMS = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'.split('');   // 37 個，順序＝聲母、介音、韻母
  var CNAME = ['黑', '紅', '藍', '黃'], CCOL = ['#2b2b33', '#d62839', '#2a6fdb', '#f2b01e'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function cardOf(list, id) { for (var i = 0; i < list.length; i++) if (list[i].i === id) return list[i]; return null; }
  var FN = { reshuffle: ['🔀', '全員重洗', '所有人的手牌收起來一起洗牌，再平均發回給每個人'], clear: ['🧹', '清桌', '桌上所有牌洗回牌堆，重新翻出新的牌'], dbl: ['✖️2', '雙倍', '你下一次配對成功時，分數變 2 倍'],
    skip: ['⏭️', '跳過', '下一位玩家這回合被跳過，直接換再下一位'], swap: ['🔁', '交換', '指定一位玩家，你們各自隨機拿出一張手牌互換'],
    rev: ['↩️', '迴轉', '出牌的順序反過來（順時鐘變逆時鐘）'], pick: ['👉', '指定', '指定一位玩家，下一個換他出牌'], peek: ['👀', '偷看', '指定一位玩家，偷看他現在的全部手牌'],
    steal: ['🦝', '搶分', '指定一位玩家，搶走他最近配到的一對牌（分數歸你）'], redraw: ['🔄', '重抽', '你的全部手牌放回牌堆，洗牌後重抽同樣張數'],
    luck: ['🎲', '轉運', '選 1～2 張手牌放回牌堆，再抽同樣張數的新牌'], shield: ['🛡️', '護盾', '擋下下一次別人對你用的功能牌（交換、搶分、偷看、指定、跳過）一次'] };
  var TARGET = { swap: 1, pick: 1, peek: 1, steal: 1 };
  var FKEYS = Object.keys(FN);
  function pts(c) { return c.f ? 2 : c.c + 1; }
  function cmp(a, b) { return a.s - b.s || a.c - b.c || a.i - b.i; }
  function score(g, s) { return g.won[s].reduce(function (a, x) { return a + x[1] + x[2]; }, 0); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nextSeat(g, s) { for (var k = 1; k <= g.np; k++) { var n = (((s + k * (g.dir || 1)) % g.np) + g.np) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function pairs(g, hand) { var o = []; hand.forEach(function (c) { g.table.forEach(function (t) { if (t.s === c.s) o.push({ c: c, t: t, v: pts(c) + pts(t) }); }); }); return o; }
  function finish(g, why) {
    var a = alive(g), bv = -1, top = [];
    a.forEach(function (s) { var v = score(g, s); if (v > bv) { bv = v; top = [s]; } else if (v === bv) top.push(s); });
    g.left = g.table.length;
    if (top.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
    else if (top.length > 1) g.res = { ws: top, why: why, note: bv + ' 分' };
    else g.res = { w: top[0], why: why, note: bv + ' 分' };
  }
  var HOLD = 5000;   // 功能牌打出後，停 5 秒讓大家看清楚，這段時間誰都不能動
  function holdLeft(g) { return g.hold ? Math.max(0, g.hold - Date.now()) : 0; }
  function startClock(g) { if (!g.dl && g.limit) g.dl = Date.now() + g.limit; }
  function advance(g, s) {
    g.lastS = s; g.cnt++; g.turns = (g.turns || 0) + 1;
    var a = alive(g);
    if (a.every(function (x) { return !g.hands[x].length; })) { finish(g, 'most'); return; }
    if (g.turns > g.np * 80) { finish(g, 'most'); return; }
    if (g.lastTurns != null) { g.lastTurns--; if (g.lastTurns <= 0) { finish(g, 'time'); return; } }
    else if (g.dl && Date.now() > g.dl) { g.lastTurns = a.length - 1; if (g.lastTurns <= 0) { finish(g, 'time'); return; } }
    var n = nextSeat(g, s), guard = 0;
    if (g.nextTo != null) { if (g.out.indexOf(g.nextTo) < 0 && g.hands[g.nextTo].length) n = g.nextTo; g.nextTo = null; }
    if (g.skipS != null && g.skipS === n) { g.skipS = null; g.last = Object.assign({}, g.last, { sk: n }); n = nextSeat(g, n); }
    while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n);
    g.turn = n;
  }
  function useFn(g, seat, c, d, h) {   // 回傳 false 表示不能這樣用
    var k = c.f, a = alive(g);
    if (TARGET[k] && d.to != null) {
      if (d.to === seat || a.indexOf(d.to) < 0) return false;
      if (k === 'steal' && !g.won[d.to].length) return false;
      if (g.shield[d.to]) { delete g.shield[d.to]; h.splice(h.indexOf(c), 1); g.last = { s: seat, c: c, t: null, fx: k, to: d.to, blocked: 1 }; return true; }
    }
    if (k === 'luck') {
      var ids = Array.isArray(d.cards) ? d.cards.filter(function (x, i2, ar) { return ar.indexOf(x) === i2; }) : [];
      if (!ids.length && !h.some(function (x) { return !x.f; })) { h.splice(h.indexOf(c), 1); g.last = { s: seat, c: c, t: null, fx: 'void' }; return true; }
      if (ids.length < 1 || ids.length > 2) return false;
      var cs = ids.map(function (id) { return cardOf(h, id); }); if (cs.some(function (x) { return !x || x === c; })) return false;
      h.splice(h.indexOf(c), 1); cs.forEach(function (x) { h.splice(h.indexOf(x), 1); }); g.deck = shuffle(g.deck.concat(cs));
      for (var z = 0; z < cs.length && g.deck.length; z++) h.push(g.deck.pop());
      h.sort(cmp); g.last = { s: seat, c: c, t: null, fx: k }; return true;
    }
    if (TARGET[k] && d.to == null) { h.splice(h.indexOf(c), 1); g.last = { s: seat, c: c, t: null, fx: 'void' }; return true; }   // 沒有對象可以用：丟掉
    if (k === 'swap') {
      var to = d.to;
      h.splice(h.indexOf(c), 1);
      var mine = h.filter(function (x) { return !x.f; }), th = g.hands[to].filter(function (x) { return !x.f; });
      if (mine.length && th.length) { var x1 = mine[Math.floor(Math.random() * mine.length)], x2 = th[Math.floor(Math.random() * th.length)]; h.splice(h.indexOf(x1), 1, x2); g.hands[to].splice(g.hands[to].indexOf(x2), 1, x1); g.hands[to].sort(cmp); }
      g.last = { s: seat, c: c, t: null, fx: 'swap', to: to }; return true;
    }
    if (k === 'pick' || k === 'peek' || k === 'steal') {
      h.splice(h.indexOf(c), 1); var to2 = d.to, extra = {};
      if (k === 'pick') g.nextTo = to2;
      else if (k === 'peek') g.peek = { s: seat, to: to2, cards: g.hands[to2].slice() };
      else { var x = g.won[to2].pop(); g.won[seat].push(x); extra.p = x[1] + x[2]; }
      g.last = Object.assign({ s: seat, c: c, t: null, fx: k, to: to2 }, extra); return true;
    }
    h.splice(h.indexOf(c), 1); var blocked = 0;
    if (k === 'reshuffle') {
      var pool = [], cnt = a.map(function (x) { return g.hands[x].length; }); a.forEach(function (x) { pool = pool.concat(g.hands[x]); }); shuffle(pool);
      a.forEach(function (x, j) { g.hands[x] = pool.splice(0, cnt[j]).sort(cmp); });
    } else if (k === 'clear') {
      var nt = g.table.length; g.deck = shuffle(g.deck.concat(g.table)); g.table = [];
      for (var q = g.deck.length - 1; q >= 0 && g.table.length < g.tn; q--) if (!g.deck[q].f) g.table.push(g.deck.splice(q, 1)[0]);
      g.table.sort(cmp);
    } else if (k === 'dbl') g.dbl[seat] = 1;
    else if (k === 'rev') g.dir = -(g.dir || 1);
    else if (k === 'shield') g.shield[seat] = 1;
    else if (k === 'redraw') { var nh = h.length; g.deck = shuffle(g.deck.concat(h.splice(0, h.length))); for (var z2 = 0; z2 < nh && g.deck.length; z2++) h.push(g.deck.pop()); h.sort(cmp); }
    else if (k === 'skip') { var nx = nextSeat(g, seat); if (nx !== seat) { if (g.shield[nx]) { delete g.shield[nx]; blocked = 1; } else g.skipS = nx; } }
    g.last = { s: seat, c: c, t: null, fx: k, to: k === 'skip' ? (blocked ? nx : g.skipS) : null, blocked: blocked };
    return true;
  }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.table = g.table.concat(g.hands[seat]).sort(cmp); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (a.every(function (x) { return !g.hands[x].length; })) { finish(g, 'most'); return; }
    if (g.turn === seat) { var n = nextSeat(g, seat), guard = 0; while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n); g.turn = n; }
  }
  /* 這個符號，別人手上＋牌堆裡還有幾張（電腦用來判斷丟這張會不會被別人撿走） */
  function risk(g, c, seat) {
    var r = 0; g.hands.forEach(function (h, s) { if (s !== seat) h.forEach(function (x) { if (x.s === c.s) r += pts(x); }); });
    return r;
  }

  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1100,
    reasons: REASONS,
    holdLeft: holdLeft, onResume: function (g, d) { if (g.dl) g.dl += d; if (g.hold) g.hold += d; },
    levelDesc: ['常常亂出牌', '看到能配的就配', '會先配高分的牌、丟低分牌', '會看別人手牌，丟出別人撿不到的牌'],
    opts: [
      { k: 'fn', label: '功能牌：', list: [['no', '❌ 不用（原版）'], ['yes', '✨ 要用（全員重洗、清桌、雙倍、跳過、交換、迴轉、指定、偷看、搶分、重抽、轉運、護盾）']], note: '共 12 種，2 色每種 1 張、4 色每種 2 張' },
      { k: 'col', label: '牌的顏色數：', list: [['2', '🎴 2 色（黑 1 分、黃 4 分）'], ['4', '🌈 4 色（黑 1、紅 2、藍 3、黃 4 分）']], note: '2 色：每人固定 6 張手牌、開局翻 6 張，一局約 5～7 分鐘；4 色：下面兩項才會生效，一局約 10～15 分鐘' },
      { k: 'hand', label: '手牌張數（只有 4 色才有用）：', list: [['6', '6 張'], ['4', '4 張'], ['5', '5 張'], ['7', '7 張'], ['8', '8 張']] },
      { k: 'tn', label: '開局翻出幾張（只有 4 色才有用）：', list: [['6', '6 張'], ['4', '4 張'], ['5', '5 張'], ['7', '7 張'], ['8', '8 張']] },
      { k: 'limit', label: '限時：', list: [['15', '⏱️ 15 分鐘'], ['10', '⏱️ 10 分鐘'], ['0', '不限時']], note: '時間到，這一輪打完就結算，分數最高的人贏' }
    ],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(2, Math.min(6, n || 4));
      var four = o.col === '4', cl = four ? [0, 1, 2, 3] : [0, 3], hn = four ? (+o.hand || 6) : 6, tn = four ? (+o.tn || 6) : 6, deck = [], id = 0;
      cl.forEach(function (c) { SYMS.forEach(function (_, s) { deck.push({ i: id++, s: s, c: c }); }); });
      if (o.fn === 'yes') for (var rp = 0; rp < (four ? 2 : 1); rp++) FKEYS.forEach(function (k, j) { deck.push({ i: id++, f: k, s: 100 + j, c: 4 }); });
      shuffle(deck);
      while (hn > 2 && n * hn + tn + 4 > deck.length) hn--;
      var g = { fn: o.fn === 'yes', skipS: null, shield: {}, nextTo: null, dir: 1, peek: null, dbl: {}, np: n, four: four, hn: hn, tn: tn, deck: deck, hands: [], won: [], table: [], out: [], turn: 0, last: null, cnt: 0, res: null, lastS: null, turns: 0,
        limit: (o.limit != null && +o.limit === 0 ? 0 : (+o.limit || 15)) * 60000, dl: null, lastTurns: null, left: 0 };
      for (var s = 0; s < n; s++) { g.hands.push(deck.splice(0, hn).sort(cmp)); g.won.push([]); }
      for (var q = deck.length - 1; q >= 0 && g.table.length < tn; q--) if (!deck[q].f) g.table.push(deck.splice(q, 1)[0]);
      g.table.sort(cmp);
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var pk = g.peek && g.peek.s === seat ? { to: g.peek.to, cards: g.peek.cards } : null;
      var tl = g.dl ? Math.max(0, g.dl - Date.now()) : null;
      return { hold: holdLeft(g), sh: !!g.shield[seat], dir: g.dir || 1, peek: pk, np: g.np, four: g.four, hn: g.hn, turn: g.turn, table: g.table, hand: seat >= 0 ? g.hands[seat] : null,
        counts: g.hands.map(function (h) { return h.length; }), won: g.won, scores: g.won.map(function (x, s) { return score(g, s); }),
        left: g.deck.length, last: g.last, out: g.out, cnt: g.cnt, tl: tl, limit: g.limit, ending: g.lastTurns != null, rest: g.left, res: !!g.res };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || g.turn !== seat || d.n !== g.cnt) return false;
      if (holdLeft(g) > 150) return false;   // 功能牌特效還在播
      var h = g.hands[seat], c = cardOf(h, d.c); if (!c) return false;
      if (g.peek && g.peek.s === seat) g.peek = null;
      if (c.f) { if (!g.fn || !useFn(g, seat, c, d, h)) return false; startClock(g); if (g.deck.length) h.push(g.deck.pop()); advance(g, seat); if (!g.res && g.last && g.last.fx && g.last.fx !== 'void') g.hold = Date.now() + HOLD; return true; }
      startClock(g);
      if (d.take != null) {
        var t = cardOf(g.table, d.take); if (!t || t.s !== c.s) return false;
        var mm = g.dbl[seat] ? 2 : 1; delete g.dbl[seat];
        h.splice(h.indexOf(c), 1); g.table.splice(g.table.indexOf(t), 1);
        g.won[seat].push([c.s, pts(c) * mm, pts(t) * mm, c.c, t.c]);
        g.last = { s: seat, c: c, t: t, p: (pts(c) + pts(t)) * mm };
      } else {
        h.splice(h.indexOf(c), 1); g.table.push(c); g.table.sort(cmp); g.last = { s: seat, c: c, t: null };
      }
      if (g.deck.length) { h.push(g.deck.pop()); }
      advance(g, seat);
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat || !g.hands[seat].length) return null;
      var h = g.hands[seat], fns = h.filter(function (x) { return x.f; }), ps = pairs(g, h.filter(function (x) { return !x.f; }));
      if (fns.length && (!h.some(function (x) { return !x.f; }) || (lv >= 2 && !ps.length && Math.random() < .5) || (lv >= 2 && Math.random() < .15))) {
        var f = fns[Math.floor(Math.random() * fns.length)], oth = alive(g).filter(function (x) { return x !== seat && (f.f !== 'steal' || g.won[x].length) && (f.f !== 'swap' || g.hands[x].length); });
        if (TARGET[f.f]) return { t: 'play', c: f.i, to: oth.length ? oth[Math.floor(Math.random() * oth.length)] : null, n: g.cnt };
        if (f.f === 'luck') { var oc = h.filter(function (x) { return !x.f; }); if (!oc.length) return { t: 'play', c: f.i, to: null, n: g.cnt, cards: [] }; shuffle(oc); return { t: 'play', c: f.i, cards: oc.slice(0, 1 + Math.floor(Math.random() * Math.min(2, oc.length))).map(function (x) { return x.i; }), n: g.cnt }; }
        return { t: 'play', c: f.i, n: g.cnt };
      }
      h = h.filter(function (x) { return !x.f; }); if (!h.length) return null;
      if (lv <= 1 && Math.random() < .45) { var c0 = h[Math.floor(Math.random() * h.length)], p0 = ps.filter(function (p) { return p.c === c0; })[0]; return { t: 'play', c: c0.i, take: p0 && Math.random() < .6 ? p0.t.i : null, n: g.cnt }; }
      if (ps.length) {
        if (lv >= 3) ps.sort(function (a, b) { return b.v - a.v; }); else shuffle(ps);
        return { t: 'play', c: ps[0].c.i, take: ps[0].t.i, n: g.cnt };
      }
      var best = null;
      h.forEach(function (c) {
        var v = lv >= 2 ? pts(c) * 2 + (lv >= 4 ? risk(g, c, seat) * 3 : 0) + Math.random() * .5 : Math.random();
        if (!best || v < best.v) best = { c: c, v: v };
      });
      return { t: 'play', c: best.c.i, take: null, n: g.cnt };
    },
    hintDesc: '按一次會顯示 6 秒：手牌和桌上「同一個符號」可以配對的牌會亮起來；沒有的話會告訴你這輪要打哪一張比較好。提示用完就不會再出現。',
    tipDesc: '輪到你卻還沒出牌時，提醒你怎麼操作（不會告訴你哪幾張能配對）。',
    acting: function (g) { return g.res ? [] : [g.turn]; },
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var ps = pairs(g, g.hands[seat]), hl = [];
      ps.forEach(function (p) { [p.c.i, p.t.i].forEach(function (x) { if (hl.indexOf(String(x)) < 0) hl.push(String(x)); }); });
      var best = ps.slice().sort(function (a, b) { return b.v - a.v; })[0];
      return { msg: ps.length ? '👉 亮框的手牌和桌上的牌可以配對！最高分是「' + SYMS[best.c.s] + '」' + best.v + ' 分。' : '👉 這一輪你的手牌配不到，打一張到桌上吧（分數低的、別人比較不容易撿走的先丟）。', hl: hl, dur: 6000 };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      return '輪到你了：看看手上的注音符號，桌上有沒有一樣的？有的話先點手牌、再點桌上那張；沒有的話把一張手牌點兩下，打到桌上。';
    },
    hostView: function (g) {
      var h = '<div class="zp-host"><div class="zp-host-tb">' + g.table.map(function (c) { return '<span class="zp-mini" style="background:' + CCOL[c.c] + ';color:' + (c.c === 3 ? '#3b2a00' : '#fff') + '">' + SYMS[c.s] + '</span>'; }).join('') + '</div><div class="zp-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="zp-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : score(g, s) + ' 分（' + g.won[s].length + ' 對）') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '牌堆剩 ' + g.deck.length + ' 張' + (g.dl ? '，剩 ' + fmtT(g.dl - Date.now()) : ''), c: '' }; }
  };
  function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- 學生端 ---------- */
  var L = { holdUntil: 0, two: [], order: null, newIds: {}, sel: null, round: -1, sent: -1, key: '', tl: null, tlT: 0 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function card(c, cls, w) {
    var b = el('button', 'zp-card c' + c.c + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('data-c', String(c.i));
    if (w) b.style.setProperty('--cw', w + 'px');
    if (c.f) { b.classList.add('fn'); b.appendChild(el('b', 'zp-sym', FN[c.f][0])); b.appendChild(el('small', 'zp-fn', FN[c.f][1])); return b; }
    b.appendChild(el('b', 'zp-sym', SYMS[c.s])); b.appendChild(el('i', 'zp-pt', String(c.c + 1)));
    return b;
  }
  /* 在固定大小的區塊裡，算出能把 n 張牌都排進去的最大牌寬 */
  function fit(n, areaW, areaH, max) {
    var gap = 6, cw = max;
    for (; cw > 26; cw -= 2) { var cols = Math.max(1, Math.floor((areaW + gap) / (cw + gap))), rows = Math.ceil(Math.max(1, n) / cols); if (rows * (cw * 1.3 + gap) <= areaH) break; }
    return cw;
  }
  var ticking = false;
  function tick() { if (ticking) return; ticking = true; setInterval(function () { var t = document.querySelector('.zp-timer'); if (t && L.tl != null) t.textContent = '⏱️ ' + fmtT(L.tl - (Date.now() - L.tlT)); }, 1000); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.two = []; L.sent = -1; L.key = ''; L.order = null; L.newIds = {}; }
    L.tl = v.tl; L.tlT = Date.now(); L.holdUntil = v.hold > 0 ? Date.now() + v.hold : 0;
    var key = v.cnt + ':' + (v.last ? v.last.c.i : '');
    if (prev && key !== L.key && v.last) {
      fx.snd(v.last.t ? 'cap' : 'move');
      if (v.last.t && v.last.s !== tb.seat) fx.toast(who(tb, v.last.s) + ' 配到「' + SYMS[v.last.t.s] + '」 ' + v.last.p + ' 分');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    if (prev && key !== L.key && v.last && v.last.fx && v.last.fx !== 'void') {
      var ov = document.createElement('div'); ov.className = 'zp-fxov'; var fi = FN[v.last.fx];
      var tg = TARGET[v.last.fx] || (v.last.fx === 'skip' && v.last.to != null) ? '（對象：' + who(tb, v.last.to) + (v.last.blocked ? '，被護盾擋下！' : '') + '）' : '';
      ov.innerHTML = '<div class="zp-fxbox"><div class="ic">' + fi[0] + '</div><b>' + esc(who(tb, v.last.s)) + ' 使用「' + fi[1] + '」</b><p>' + esc(fi[2]) + tg + '</p></div>';
      var dur = Math.max(1500, v.hold || 5000); ov.style.animationDuration = dur + 'ms'; document.body.appendChild(ov); setTimeout(function () { ov.remove(); }, dur);
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '手牌和桌上同一個符號，就能配對撿走');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, held = Date.now() < L.holdUntil, myTurn = !tb.res && !out && !held && v.turn === seat && L.sent !== v.cnt;
    if (held && !tb.res) { clearTimeout(L.ht); L.ht = setTimeout(function () { ctx.rerender(); }, L.holdUntil - Date.now() + 80); }
    var hand = v.hand || [], sel = L.sel != null ? cardOf(hand, L.sel) : null; if (!sel) L.sel = null;
    var wide = window.innerWidth > window.innerHeight, W = Math.min(window.innerWidth || 390, 760) - 40, H = window.innerHeight || 800;
    var wrap = el('div', 'pk-table zp-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = !sel ? '輪到你：先點一張手牌' : '點桌上同一個符號的牌來配對，或再點一次這張打到桌上'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function (i) { return '⭐ ' + v.scores[i] + ' 分'; }, short));
    var felt = el('div', 'pk-felt zp-felt');
    var info = el('div', 'zp-info');
    info.appendChild(el('span', 'zp-chip', '牌堆 ' + v.left));
    info.appendChild(el('span', 'zp-chip', v.four ? '🌈 4 色' : '🎴 2 色'));
    if (v.limit) info.appendChild(el('span', 'zp-chip zp-timer', v.ending ? '⏱️ 最後一輪' : v.tl == null ? '⏱️ 開始後計時' : '⏱️ ' + fmtT(v.tl)));
    if (v.dir < 0 || v.limit) {} 
    if (v.sh) info.appendChild(el('span', 'zp-chip', '🛡️ 護盾'));
    if (v.dir < 0) info.appendChild(el('span', 'zp-chip', '↩️ 逆時鐘'));
    felt.appendChild(info);
    var lg = el('div', 'zp-log');
    if (v.last && v.last.fx && v.last.fx !== 'void') lg.innerHTML = esc(who(tb, v.last.s)) + ' 使用功能牌「' + FN[v.last.fx][1] + '」：' + esc(FN[v.last.fx][2]) + (TARGET[v.last.fx] ? '（對象：' + esc(who(tb, v.last.to)) + (v.last.blocked ? '，被護盾擋下！' : '') + '）' : '');
    else if (v.last && v.last.fx === 'void') lg.innerHTML = esc(who(tb, v.last.s)) + ' 丟掉一張功能牌';
    else if (v.last) lg.innerHTML = esc(who(tb, v.last.s)) + (v.last.t ? ' 配到「<b>' + SYMS[v.last.t.s] + '</b>」' + '' + '，拿走 <b class="zp-big">' + v.last.p + '</b> 分' : ' 打出「<b>' + SYMS[v.last.c.s] + '</b>」到桌上');
    else lg.textContent = '桌上翻開 ' + v.table.length + ' 張牌';
    if (tb.res && v.rest) lg.innerHTML += '<br>桌上剩下 ' + v.rest + ' 張牌作廢，不算分';
    felt.appendChild(lg);
    var tAreaH = Math.round(H * (wide ? .25 : .24)), tcw = fit(v.table.length, W, tAreaH, wide ? 84 : 76);
    var tbl = el('div', 'zp-board'); tbl.style.minHeight = tAreaH + 'px';
    v.table.forEach(function (c) {
      var b = card(c, (v.last && !v.last.t && v.last.c.i === c.i ? 'new' : ''), tcw);
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (!sel) { ctx.toast('先點一張自己的手牌，再點桌上同一個符號的牌'); return; }
        if (sel.f) { ctx.toast('功能牌要按「✨ 使用」'); return; }
        if (sel.s !== c.s) { ctx.toast('「' + SYMS[sel.s] + '」和「' + SYMS[c.s] + '」不一樣，不能配對！'); ctx.snd('error'); return; }
        send({ t: 'play', c: sel.i, take: c.i });
      });
      tbl.appendChild(b);
    });
    if (!v.table.length) tbl.appendChild(el('div', 'pk-empty', '桌上沒有牌'));
    felt.appendChild(tbl);
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; L.sent = v.cnt; L.sel = null; L.two = []; L.newIds = {}; ctx.snd(d.take != null ? 'cap' : 'move'); if (d.take != null) ctx.toast('配對成功！'); ctx.send('play', d); ctx.rerender(); }
    // 我的手牌：區塊大小固定，牌自動縮放
    var me = el('div', 'pk-me zp-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot);
    top.appendChild(el('span', 'n', '我的手牌')); top.appendChild(el('span', 'pk-info', '⭐ ' + v.scores[seat] + ' 分（' + v.won[seat].length + ' 對）'));
    var sortBtn = ctx.button('pk-btn small', '🗂 整理手牌', function () { L.order = null; L.newIds = {}; ctx.snd('tap'); ctx.rerender(); }); sortBtn.classList.add('zp-sort'); top.appendChild(sortBtn);
    me.appendChild(top);
    if (myTurn && sel && sel.f) { var ds = el('div', 'zp-desc', FN[sel.f][0] + ' ' + FN[sel.f][1] + '：' + FN[sel.f][2]); wrap.appendChild(ds); }
    function alive() { var a = []; for (var q = 0; q < v.np; q++) if (q !== seat && v.out.indexOf(q) < 0 && v.counts[q] > 0) a.push(q); return a; }
    if (v.peek) { var pp = el('div', 'zp-peek'); pp.appendChild(el('span', '', '👀 ' + short(tb, v.peek.to) + ' 的手牌：')); v.peek.cards.forEach(function (c) { pp.appendChild(card(c, '', 34)); }); wrap.appendChild(pp); }
    var hAreaH = Math.round(H * (wide ? .19 : .18)), hcw = fit(Math.max(v.hn, hand.length), W - 40, hAreaH, wide ? 100 : 86);
    var hd = el('div', 'zp-hand'); hd.style.height = hAreaH + 'px';
    if (!L.order) L.order = hand.slice().sort(cmp).map(function (c) { return c.i; });
    else {
      L.order = L.order.filter(function (id) { return cardOf(hand, id); });
      hand.forEach(function (c) { if (L.order.indexOf(c.i) < 0) { L.order.push(c.i); L.newIds[c.i] = 1; } });
    }
    Object.keys(L.newIds).forEach(function (k) { if (!cardOf(hand, +k)) L.newIds[k] = 0; });
    L.order.map(function (id) { return cardOf(hand, id); }).forEach(function (c) {
      var b = card(c, (sel && sel.i === c.i ? 'sel' : '') + (L.two.indexOf(c.i) >= 0 ? ' two' : '') + (L.newIds[c.i] ? ' newc fresh' : ''), hcw);
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (sel && sel.f === 'luck' && c.i !== sel.i) { var ix = L.two.indexOf(c.i); if (ix >= 0) L.two.splice(ix, 1); else if (L.two.length < 2) L.two.push(c.i); ctx.snd('tap'); ctx.rerender(); return; }
        if (L.sel === c.i) { if (TARGET[c.f] || c.f === 'luck') return; send({ t: 'play', c: c.i, take: null }); return; }   // 同一張點兩次：打到桌上（功能牌＝使用；萬用牌＝丟掉）
        L.sel = c.i; L.two = []; ctx.snd('tap'); ctx.rerender();
      });
      hd.appendChild(b);
    });
    me.appendChild(hd);
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && sel && !sel.f) tools.appendChild(ctx.button('pk-btn go', '打到桌上', function () { send({ t: 'play', c: sel.i, take: null }); }));
      if (myTurn && sel && sel.f === 'luck') { tools.appendChild(ctx.button('pk-btn go', '🎲 換掉選的牌（' + L.two.length + '）', function () { if (!L.two.length) { ctx.toast('先在手牌裡點 1～2 張要換掉的牌'); return; } var cs = L.two.slice(); send({ t: 'play', c: sel.i, cards: cs }); })); tools.appendChild(ctx.button('pk-btn', '丟掉這張', function () { send({ t: 'play', c: sel.i, to: null, cards: [] }); })); }
      if (myTurn && sel && sel.f && sel.f !== 'luck' && !TARGET[sel.f]) tools.appendChild(ctx.button('pk-btn go', '✨ 使用', function () { send({ t: 'play', c: sel.i, take: null }); }));
      if (myTurn && sel && TARGET[sel.f]) {
        var tp = el('div', 'zp-tgt'); tp.appendChild(el('span', '', '對誰使用「' + FN[sel.f][1] + '」？'));
        alive().filter(function (o) { return sel.f !== 'steal' || v.won[o].length; }).forEach(function (o) { tp.appendChild(ctx.button('pk-btn go', short(tb, o) + (sel.f === 'steal' ? '（' + v.scores[o] + '分）' : ''), function () { send({ t: 'play', c: sel.i, to: o }); })); });
        tp.appendChild(ctx.button('pk-btn', '丟掉這張', function () { send({ t: 'play', c: sel.i, to: null }); }));
        wrap.appendChild(tp);
      }
      if (myTurn && sel && sel.f === 'swap') alive().forEach(function (o) { tools.appendChild(ctx.button('pk-btn go', '和' + short(tb, o) + '交換', function () { send({ t: 'play', c: sel.i, to: o }); })); });
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
    tick();
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res; if (!v || !v.won || !r) return null;
    var lines = [r.ws ? '🏆 並列最高分，一起獲勝：' + r.ws.map(nm).join('、') + '（' + v.scores[r.ws[0]] + ' 分）' : r.w >= 0 ? '🏆 獲勝：' + nm(r.w) + '（' + v.scores[r.w] + ' 分）' : '🤝 大家分數一樣，平手'];
    var h = '<div class="zp-sum">';
    for (var s = 0; s < v.np; s++) h += '<div class="zp-sumrow"><b>' + esc(nm(s)) + '：' + v.scores[s] + ' 分</b>' + v.won[s].map(function (x) { return '<span class="zp-w"><i class="c' + x[3] + '"></i><i class="c' + x[4] + '"></i>' + SYMS[x[0]] + '</span>'; }).join('') + '</div>';
    lines.push({ html: h + '</div>' });
    if (v.rest) lines.push('桌上剩下 ' + v.rest + ' 張牌作廢，誰都不算分');
    return lines;
  };
  mod.onReject = function () { L.sent = -1; };

  BG.register('zhuyin-pair', mod);
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每張牌有一個<b>注音符號</b>和<b>顏色</b>，顏色代表分數：黑 1 分、紅 2 分、藍 3 分、黃 4 分（只玩 2 色時只有黑和黃）。</li><li>輪到你時，看看<b>手牌</b>裡有沒有和<b>桌上</b>一模一樣的注音符號。有的話：<b>先點手牌、再點桌上那張</b>，兩張一起收走，分數就是兩張牌的分數加起來。</li><li>沒有可以配的，就把一張手牌<b>點兩下</b>（或點一下再按「打到桌上」），打到桌上。</li><li>出完牌後，系統自動從牌堆補一張，手牌張數維持固定。</li><li>所有人的手牌都出完就結束，桌上剩下的牌作廢。時間到的話，打完這一輪就結算。分數最高的人獲勝。</li></ol>' },
      { h: '功能牌（老師有開才有）', html: '<ul>' + FKEYS.map(function (k) { return '<li><b>' + FN[k][0] + ' ' + FN[k][1] + '</b>：' + FN[k][2] + '</li>'; }).join('') + '</ul><p>用功能牌就算這回合的動作（不能再配對或打牌），用完一樣補一張牌。功能牌可以點一下選起來，再按「✨ 使用」，或點兩下直接使用。</p>' },
      { h: '小技巧', html: '<ul><li>黃色牌（4 分）最值錢，能配到就先配。</li><li>打牌到桌上的時候，想一想別人手上會不會剛好有一樣的符號。分數高的牌別隨便丟給別人撿！</li><li>「🗂 整理手牌」可以把手牌照注音順序排好；新拿到的牌會放最右邊並標「新」。</li><li>卡住了可以按「💡 提示」。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「語文」→「注音配對撿紅點」開房間。</li><li>QR code 上方先選好<b>2 色或 4 色</b>、<b>限時</b>。2 色：手牌和開局翻牌都固定 6 張，一局約 5～7 分鐘；4 色：可再選手牌張數（4～8）和開局翻出的張數（4～8），一局約 10～15 分鐘。</li><li>每桌 2～6 人，人數不夠可以讓電腦補位。</li><li>老師端每桌顯示桌上的牌與每人分數、牌堆剩幾張、剩餘時間。</li></ol>' },
      { h: '規則說明', html: '<p>依老師的實體卡牌玩法設計，細節 Claude 先自訂，可以再調整：</p><ul><li>37 個注音符號 × 每色 1 張：2 色共 74 張，4 色共 148 張。</li><li>分數：黑 1、紅 2、藍 3、黃 4。2 色時用黑和黃。</li><li>配對一定是「手牌一張＋桌上同符號一張」，桌上有兩張同符號時，由玩家自己點要拿哪一張。</li><li>有可以配的牌也可以選擇不配、直接打牌（保留好牌）。</li><li>功能牌（開桌前由老師選開或不開，預設不開）：共 12 種，2 色各 1 張、4 色各 2 張，都不會改變任何人的手牌數。全員重洗、迴轉、指定、偷看、轉運參考拼音大挑戰，護盾參考泥巴豬農場，重抽是老師指定，清桌、雙倍、跳過、交換、搶分是新提議。</li><li>限時：時間到，這一輪每人再打完一次就結算；同分最高的都算贏。</li></ul>' }
    ]
  };
})();
