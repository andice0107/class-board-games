/* 撲克牌・99（台灣玩法）：2～6 人，每人 5 張。輪流出一張牌加到總數上，再補一張；總數不能超過 99。
   輪到你時每張牌都會讓總數超過 99（或手上沒牌了），就出局。牌堆抽完後不再補牌。最後留下來的人獲勝。
   功能牌：4 迴轉、5 指定下一位、10 加或減 10、J 跳過（PASS）、Q 加或減 20、K 直接變 99、黑桃 A 歸零。其他 A＝1，2、3、6、7、8、9 照點數。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC;
  var REASONS = { last: '最後留下來', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rk(c) { return c[0]; }
  function special(c) { var r = rk(c); return c === 'As' || '45TJQK'.indexOf(r) >= 0; }
  /* 這張牌可以怎麼出：回傳 [{v:出完的總數, sign}] */
  function options(c, total) {
    var r = rk(c), o = [];
    if (c === 'As') o.push({ v: 0 });
    else if (r === 'A') o.push({ v: total + 1 });
    else if (r === '4' || r === '5' || r === 'J') o.push({ v: total });
    else if (r === 'K') o.push({ v: 99 });
    else if (r === 'T') { o.push({ v: total + 10, sign: 1 }); o.push({ v: Math.max(0, total - 10), sign: -1 }); }
    else if (r === 'Q') { o.push({ v: total + 20, sign: 1 }); o.push({ v: Math.max(0, total - 20), sign: -1 }); }
    else o.push({ v: total + (+r) });
    return o.filter(function (x) { return x.v <= 99; });
  }
  function desc(c) { var r = rk(c); return c === 'As' ? '歸零' : r === '4' ? '迴轉' : r === '5' ? '指定' : r === 'J' ? 'PASS' : r === 'K' ? '變 99' : r === 'T' ? '±10' : r === 'Q' ? '±20' : '+' + (r === 'A' ? 1 : r); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function step(g, s, k) { var n = s; for (var i = 0; i < g.np * 2; i++) { n = (n + g.dir * (k || 1) + g.np * 2) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function draw(g) { return g.deck.length ? g.deck.pop() : null; } // 牌堆抽完就不再補牌，手牌會越來越少，遊戲一定會結束
  function checkStuck(g) {
    var guard = 0;
    while (!g.res && guard++ < g.np) {
      var s = g.turn, h = g.hands[s];
      if (h.some(function (c) { return options(c, g.total).length; })) return;
      g.out.push(s); g.pile = g.pile.concat(h); g.hands[s] = []; g.log = { k: 'out', s: s };
      var a = alive(g); if (a.length <= 1) { g.res = { w: a[0], why: 'last' }; return; }
      g.turn = step(g, s);
    }
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 900,
    reasons: REASONS,
    levelDesc: ['隨便出牌', '會先出小牌', '會把功能牌留到危險時才用', '還會陷害下一家（把總數推到很高）'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var d = PK.deck(0), g = { np: n, deck: d, pile: [], hands: [], total: 0, dir: 1, turn: 0, out: [], last: null, log: null, cnt: 0, res: null };
      for (var s = 0; s < n; s++) g.hands.push(d.splice(0, 5));
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, turn: g.turn, total: g.total, dir: g.dir, hand: seat >= 0 ? g.hands[seat] : null, counts: g.hands.map(function (h) { return h.length; }), last: g.last, log: g.log, out: g.out, cnt: g.cnt };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], c = d.c; if (h.indexOf(c) < 0) return false;
      var opts = options(c, g.total); if (!opts.length) return false;
      var o = opts.length > 1 ? opts.filter(function (x) { return x.sign === (d.sign || 1); })[0] || opts[0] : opts[0];
      var r = rk(c), next;
      if (r === '5') { if (d.to == null || d.to === seat || g.out.indexOf(d.to) >= 0 || d.to < 0 || d.to >= g.np) return false; next = d.to; }
      h.splice(h.indexOf(c), 1); g.pile.push(c); var nc = draw(g); if (nc) h.push(nc);
      g.total = o.v;
      if (r === '4') g.dir = -g.dir;
      if (next == null) next = step(g, seat);
      g.last = { s: seat, c: c, sign: o.sign, to: r === '5' ? next : null, total: g.total };
      g.log = { k: 'play', s: seat };
      g.turn = next; g.cnt++;
      checkStuck(g);
      return true;
    },
    hintDesc: '會亮出「現在可以出、而且不會讓總數超過 99」的牌；總數很高（80 以上）時，會優先亮出能把總數降下來的牌（黑桃 A、10、Q）；總數還低時，提醒你把功能牌留著。',
    tipDesc: '提醒你怎麼出牌（10、Q 要選加或減，5 要指定下一位）；總數很高時提醒你小心。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var h = g.hands[seat], ok = h.filter(function (c) { return options(c, g.total).length; });
      if (!ok.length) return { msg: '你手上每一張牌出了都會超過 99，這一輪沒有牌可以出了。', hl: [] };
      if (g.total >= 80) {
        var low = ok.filter(function (c) { return c === 'As' || c[0] === 'T' || c[0] === 'Q'; });
        if (low.length) return { msg: '總數已經 ' + g.total + '，很危險了！亮黃框的牌可以把總數降下來（黑桃 A 歸零、10 減 10、Q 減 20）。', hl: low };
      }
      var plain = ok.filter(function (c) { return !special(c); });
      if (g.total < 70 && plain.length) return { msg: '總數才 ' + g.total + '，還很安全。亮黃框的牌都可以出，建議先出普通牌，把功能牌留到危險的時候再用。', hl: plain };
      return { msg: '總數 ' + g.total + '。亮黃框的牌現在都可以出（出了不會超過 99）。', hl: ok };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      if (g.total >= 85) return '總數已經 ' + g.total + ' 了，很危險！看看有沒有黑桃 A（歸零）、10（減 10）、Q（減 20）可以救急。';
      return '輪到你了：點一張沒有變暗的牌，再點一次出牌。10 和 Q 要選加或減，5 要指定下一位玩家喔！';
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var h = g.hands[seat], cands = [];
      h.forEach(function (c) { options(c, g.total).forEach(function (o) { cands.push({ c: c, o: o }); }); });
      if (!cands.length) return null;
      var others = alive(g).filter(function (s) { return s !== seat; });
      function pick(x) { var d = { t: 'play', c: x.c, sign: x.o.sign || 1, n: g.cnt }; if (rk(x.c) === '5') { d.to = lv >= 4 ? others.reduce(function (a, s) { return g.hands[s].length && a == null ? s : a; }, null) : others[Math.floor(Math.random() * others.length)]; if (d.to == null) d.to = others[0]; } return d; }
      if (lv <= 1) return pick(cands[Math.floor(Math.random() * cands.length)]);
      cands.forEach(function (x) {
        var sp = special(x.c), score = x.o.v;          // 總數越小越安全
        if (lv >= 3 && sp) score += 99 - g.total > 20 ? 60 : -30; // 不危險時保留功能牌
        if (lv >= 4 && !sp && x.o.v >= 90) score -= 25;          // 讓下一家難出
        if (x.o.sign === -1) score -= 0;
        x.s = score;
      });
      cands.sort(function (a, b) { return a.s - b.s; });
      return pick(cands[0]);
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb"><b class="nn-host">' + g.total + '</b>' + (g.last ? '<span>' + PK.mini(g.last.c) + '</span>' : '') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '出局' : g.turn === s ? '出牌中' : '') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '總數 ' + g.total + '・還有 ' + alive(g).length + ' 人', c: g.total >= 90 ? 'hot' : '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.pile = g.pile.concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) { g.turn = step(g, seat); checkStuck(g); }
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: null, round: -1, sent: -1, key: '' };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view, key = v.cnt + ':' + v.out.length;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.sent = -1; L.key = ''; }
    if (prev && key !== L.key) {
      if (prev.view && v.out.length > prev.view.out.length) { var o = v.out[v.out.length - 1]; fx.toast(o === tb.seat ? '你沒有牌可以出，出局了…' : short(tb, o) + ' 沒牌可出，出局！'); fx.snd(o === tb.seat ? 'lose' : 'cap'); }
      else if (v.last) { fx.snd('move'); var r = v.last.c[0]; if (v.last.c === 'As') fx.toast(who(tb, v.last.s) + '：歸零！'); else if (r === 'K') fx.toast(who(tb, v.last.s) + '：99！'); else if (r === '4') fx.toast('迴轉！'); else if (r === '5') fx.toast(who(tb, v.last.s) + ' 指定 ' + who(tb, v.last.to)); else if (r === 'J') fx.toast('PASS！'); }
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 350);
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '總數不能超過 99');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    if (L.sel && v.hand.indexOf(L.sel) < 0) L.sel = null;
    var wrap = el('div', 'pk-table nn-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經出局，正在觀看';
    else if (myTurn) { st.textContent = L.sel ? '再點一次這張牌出牌，或按下面的按鈕' : '輪到你：選一張牌，總數不能超過 99'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function (i) { return v.out.indexOf(i) >= 0 ? '出局' : ''; }, short));
    var felt = el('div', 'pk-felt nn-felt');
    var tot = el('div', 'nn-total' + (v.total >= 90 ? ' hot' : v.total >= 70 ? ' warm' : ''));
    tot.innerHTML = '<small>目前總數</small><b>' + v.total + '</b><small>' + (v.dir > 0 ? '順時針 ↻' : '逆時針 ↺') + '</small>';
    felt.appendChild(tot);
    if (v.last) { var lc = el('div', 'nn-last'); lc.innerHTML = '<span>' + PK.svg(v.last.c) + '</span><small>' + who(tb, v.last.s) + '：' + (v.last.sign === -1 ? (v.last.c[0] === 'T' ? '−10' : '−20') : desc(v.last.c).replace('±', '+')) + (v.last.to != null ? ' → ' + who(tb, v.last.to) : '') + '</small>'; felt.appendChild(lc); }
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; d.c = L.sel; L.sent = v.cnt; L.sel = null; ctx.snd('move'); ctx.send('play', d); ctx.rerender(); }
    var SL = [['rank', '🔀 整理：依點數', PKUI.byRank], ['suit', '🔀 整理：依花色', PKUI.bySuit]], HK = BG.handKey(tb, 'ninety-nine'), ho = BG.handOrder(HK, v.hand, PKUI.sorter(L, SL));
    var me = PKUI.hand(ho.list, { fresh: ho.fresh, title: tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我', color: SEATC[seat], turn: myTurn, sel: L.sel ? [L.sel] : [],
      onTap: function (c) { if (!myTurn || !options(c, v.total).length) { if (myTurn) { ctx.snd('error'); ctx.toast('這張出了會超過 99'); } return; }
        if (L.sel === c && options(c, v.total).length === 1 && c[0] !== '5') return send({});
        L.sel = c; ctx.snd('tap'); ctx.rerender(); },
      dim: function (c) { return myTurn && !options(c, v.total).length; } });
    [].forEach.call(me.querySelectorAll('.pk-hc'), function (b) { b.appendChild(el('small', 'nn-tag' + (special(b.getAttribute('data-c')) ? ' sp' : ''), desc(b.getAttribute('data-c')))); });
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && L.sel) {
        var r = L.sel[0], op = options(L.sel, v.total);
        if (r === '5') alive(v).forEach(function (s) { if (s !== seat) tools.appendChild(ctx.button('pk-btn go', '指定 ' + who(tb, s), function () { send({ to: s }); })); });
        else if (r === 'T' || r === 'Q') op.forEach(function (o) { tools.appendChild(ctx.button('pk-btn go', (o.sign > 0 ? '＋' : '－') + (r === 'T' ? 10 : 20) + ' → ' + o.v, function () { send({ sign: o.sign }); })); });
        else tools.appendChild(ctx.button('pk-btn go', '出牌 → ' + op[0].v, function () { send({}); }));
      }
      PKUI.sortBtns(ctx, tools, L, HK, SL);
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('ninety-nine', mod);
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人 5 張牌，桌上的總數從 <b>0</b> 開始。</li><li>輪到你時出一張牌，把點數加到總數上，系統會自動幫你補一張。</li><li><b>總數不能超過 99</b>。輪到你時如果每一張牌出了都會超過 99，你就<b>出局</b>。</li><li>牌堆抽完後就不再補牌，手上的牌出完也算出局。</li><li>最後留下來的人獲勝！</li></ol>' },
      { h: '功能牌', html: '<table class="g-tbl"><tr><th>牌</th><th>效果</th></tr><tr><td>♠A（黑桃 A）</td><td>總數歸零</td></tr><tr><td>4</td><td>迴轉：出牌順序反過來</td></tr><tr><td>5</td><td>指定：你選下一個出牌的人</td></tr><tr><td>10</td><td>加 10 或減 10（自己選）</td></tr><tr><td>J</td><td>PASS：總數不變</td></tr><tr><td>Q</td><td>加 20 或減 20（自己選）</td></tr><tr><td>K</td><td>總數直接變成 99</td></tr><tr><td>其他 A</td><td>加 1</td></tr><tr><td>2、3、6、7、8、9</td><td>照點數加</td></tr></table>' + cards(['As', 'Kh', '4d', 'Jc'], '歸零、變 99、迴轉、PASS') },
      { h: '小技巧與計分', html: '<ul><li>功能牌是救命牌，總數很高時才用。</li><li>總數快到 99 時出 K，下一家就很危險！</li></ul><p>最後留下來的人贏（積分榜 +3 分），和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「撲克牌」→「99」，每桌 2～6 人。</li><li>出局的學生可以繼續觀看。</li></ol>' },
      { h: '規則說明', html: '<p>本工具採用台灣常見規則：4 迴轉、5 指定、10 加減 10、J PASS、Q 加減 20、K 變 99、黑桃 A 歸零。減到負數時以 0 計。牌堆抽完後不再補牌（避免一直玩不完），手牌出完也算出局。如果班上習慣不同，請告訴開發者調整。</p><h4>教學重點</h4><ul><li>二位數加減法心算。</li><li>策略思考：什麼時候該用功能牌？</li></ul>' }
    ]
  };
})();
