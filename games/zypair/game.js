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
  function pts(c) { return c.c + 1; }
  function cmp(a, b) { return a.s - b.s || a.c - b.c || a.i - b.i; }
  function score(g, s) { return g.won[s].reduce(function (a, x) { return a + x[1] + x[2]; }, 0); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nextSeat(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function pairs(g, hand) { var o = []; hand.forEach(function (c) { g.table.forEach(function (t) { if (t.s === c.s) o.push({ c: c, t: t, v: pts(c) + pts(t) }); }); }); return o; }
  function finish(g, why) {
    var a = alive(g), bv = -1, top = [];
    a.forEach(function (s) { var v = score(g, s); if (v > bv) { bv = v; top = [s]; } else if (v === bv) top.push(s); });
    g.left = g.table.length;
    if (top.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
    else if (top.length > 1) g.res = { ws: top, why: why, note: bv + ' 分' };
    else g.res = { w: top[0], why: why, note: bv + ' 分' };
  }
  function startClock(g) { if (!g.dl && g.limit) g.dl = Date.now() + g.limit; }
  function advance(g, s) {
    g.lastS = s; g.cnt++; g.turns = (g.turns || 0) + 1;
    var a = alive(g);
    if (a.every(function (x) { return !g.hands[x].length; })) { finish(g, 'most'); return; }
    if (g.turns > g.np * 80) { finish(g, 'most'); return; }
    if (g.lastTurns != null) { g.lastTurns--; if (g.lastTurns <= 0) { finish(g, 'time'); return; } }
    else if (g.dl && Date.now() > g.dl) { g.lastTurns = a.length - 1; if (g.lastTurns <= 0) { finish(g, 'time'); return; } }
    var n = nextSeat(g, s), guard = 0;
    while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n);
    g.turn = n;
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
    onResume: function (g, d) { if (g.dl) g.dl += d; },
    levelDesc: ['常常亂出牌', '看到能配的就配', '會先配高分的牌、丟低分牌', '會看別人手牌，丟出別人撿不到的牌'],
    opts: [
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
      shuffle(deck);
      while (hn > 2 && n * hn + tn + 4 > deck.length) hn--;
      var g = { np: n, four: four, hn: hn, tn: tn, deck: deck, hands: [], won: [], table: [], out: [], turn: 0, last: null, cnt: 0, res: null, lastS: null, turns: 0,
        limit: (o.limit != null && +o.limit === 0 ? 0 : (+o.limit || 15)) * 60000, dl: null, lastTurns: null, left: 0 };
      for (var s = 0; s < n; s++) { g.hands.push(deck.splice(0, hn).sort(cmp)); g.won.push([]); }
      g.table = deck.splice(0, tn).sort(cmp);
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var tl = g.dl ? Math.max(0, g.dl - Date.now()) : null;
      return { np: g.np, four: g.four, hn: g.hn, turn: g.turn, table: g.table, hand: seat >= 0 ? g.hands[seat] : null,
        counts: g.hands.map(function (h) { return h.length; }), won: g.won, scores: g.won.map(function (x, s) { return score(g, s); }),
        left: g.deck.length, last: g.last, out: g.out, cnt: g.cnt, tl: tl, limit: g.limit, ending: g.lastTurns != null, rest: g.left, res: !!g.res };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], c = cardOf(h, d.c); if (!c) return false;
      startClock(g);
      if (d.take != null) {
        var t = cardOf(g.table, d.take); if (!t || t.s !== c.s) return false;
        h.splice(h.indexOf(c), 1); g.table.splice(g.table.indexOf(t), 1);
        g.won[seat].push([c.s, pts(c), pts(t), c.c, t.c]);
        g.last = { s: seat, c: c, t: t };
      } else {
        h.splice(h.indexOf(c), 1); g.table.push(c); g.table.sort(cmp); g.last = { s: seat, c: c, t: null };
      }
      if (g.deck.length) { h.push(g.deck.pop()); }
      advance(g, seat);
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat || !g.hands[seat].length) return null;
      var h = g.hands[seat], ps = pairs(g, h);
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
  var L = { order: null, newIds: {}, sel: null, round: -1, sent: -1, key: '', tl: null, tlT: 0 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function card(c, cls, w) {
    var b = el('button', 'zp-card c' + c.c + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('data-c', String(c.i));
    if (w) b.style.setProperty('--cw', w + 'px');
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
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.sent = -1; L.key = ''; L.order = null; L.newIds = {}; }
    L.tl = v.tl; L.tlT = Date.now();
    var key = v.cnt + ':' + (v.last ? v.last.c.i : '');
    if (prev && key !== L.key && v.last) {
      fx.snd(v.last.t ? 'cap' : 'move');
      if (v.last.t && v.last.s !== tb.seat) fx.toast(who(tb, v.last.s) + ' 配到「' + SYMS[v.last.c.s] + '」 ' + (pts(v.last.c) + pts(v.last.t)) + ' 分');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '手牌和桌上同一個符號，就能配對撿走');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
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
    felt.appendChild(info);
    var lg = el('div', 'zp-log');
    if (v.last) lg.innerHTML = esc(who(tb, v.last.s)) + (v.last.t ? ' 配到「<b>' + SYMS[v.last.c.s] + '</b>」，拿走 <b class="zp-big">' + (pts(v.last.c) + pts(v.last.t)) + '</b> 分' : ' 打出「<b>' + SYMS[v.last.c.s] + '</b>」到桌上');
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
        if (sel.s !== c.s) { ctx.toast('「' + SYMS[sel.s] + '」和「' + SYMS[c.s] + '」不一樣，不能配對！'); ctx.snd('error'); return; }
        send({ t: 'play', c: sel.i, take: c.i });
      });
      tbl.appendChild(b);
    });
    if (!v.table.length) tbl.appendChild(el('div', 'pk-empty', '桌上沒有牌'));
    felt.appendChild(tbl);
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; L.sent = v.cnt; L.sel = null; L.newIds = {}; ctx.snd(d.take != null ? 'cap' : 'move'); if (d.take != null) ctx.toast('配對成功！'); ctx.send('play', d); ctx.rerender(); }
    // 我的手牌：區塊大小固定，牌自動縮放
    var me = el('div', 'pk-me zp-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot);
    top.appendChild(el('span', 'n', '我的手牌')); top.appendChild(el('span', 'pk-info', '⭐ ' + v.scores[seat] + ' 分（' + v.won[seat].length + ' 對）'));
    var sortBtn = ctx.button('pk-btn small', '🗂 整理手牌', function () { L.order = null; L.newIds = {}; ctx.snd('tap'); ctx.rerender(); }); sortBtn.classList.add('zp-sort'); top.appendChild(sortBtn);
    me.appendChild(top);
    var hAreaH = Math.round(H * (wide ? .19 : .18)), hcw = fit(Math.max(v.hn, hand.length), W - 40, hAreaH, wide ? 100 : 86);
    var hd = el('div', 'zp-hand'); hd.style.height = hAreaH + 'px';
    if (!L.order) L.order = hand.slice().sort(cmp).map(function (c) { return c.i; });
    else {
      L.order = L.order.filter(function (id) { return cardOf(hand, id); });
      hand.forEach(function (c) { if (L.order.indexOf(c.i) < 0) { L.order.push(c.i); L.newIds[c.i] = 1; } });
    }
    Object.keys(L.newIds).forEach(function (k) { if (!cardOf(hand, +k)) L.newIds[k] = 0; });
    L.order.map(function (id) { return cardOf(hand, id); }).forEach(function (c) {
      var b = card(c, (sel && sel.i === c.i ? 'sel' : '') + (L.newIds[c.i] ? ' newc fresh' : ''), hcw);
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (L.sel === c.i) { send({ t: 'play', c: c.i, take: null }); return; }   // 同一張點兩次：打到桌上
        L.sel = c.i; ctx.snd('tap'); ctx.rerender();
      });
      hd.appendChild(b);
    });
    me.appendChild(hd);
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && sel) tools.appendChild(ctx.button('pk-btn go', '打到桌上', function () { send({ t: 'play', c: sel.i, take: null }); }));
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
      { h: '小技巧', html: '<ul><li>黃色牌（4 分）最值錢，能配到就先配。</li><li>打牌到桌上的時候，想一想別人手上會不會剛好有一樣的符號。分數高的牌別隨便丟給別人撿！</li><li>「🗂 整理手牌」可以把手牌照注音順序排好；新拿到的牌會放最右邊並標「新」。</li><li>卡住了可以按「💡 提示」。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「語文」→「注音配對撿紅點」開房間。</li><li>QR code 上方先選好<b>2 色或 4 色</b>、<b>限時</b>。2 色：手牌和開局翻牌都固定 6 張，一局約 5～7 分鐘；4 色：可再選手牌張數（4～8）和開局翻出的張數（4～8），一局約 10～15 分鐘。</li><li>每桌 2～6 人，人數不夠可以讓電腦補位。</li><li>老師端每桌顯示桌上的牌與每人分數、牌堆剩幾張、剩餘時間。</li></ol>' },
      { h: '規則說明', html: '<p>依老師的實體卡牌玩法設計，細節 Claude 先自訂，可以再調整：</p><ul><li>37 個注音符號 × 每色 1 張：2 色共 74 張，4 色共 148 張。</li><li>分數：黑 1、紅 2、藍 3、黃 4。2 色時用黑和黃。</li><li>配對一定是「手牌一張＋桌上同符號一張」，桌上有兩張同符號時，由玩家自己點要拿哪一張。</li><li>有可以配的牌也可以選擇不配、直接打牌（保留好牌）。</li><li>限時：時間到，這一輪每人再打完一次就結算；同分最高的都算贏。</li></ul>' }
    ]
  };
})();
