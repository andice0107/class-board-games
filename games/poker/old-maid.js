/* 撲克牌・抽鬼牌：52 張＋1 張鬼牌，2～6 人。
   發完牌先丟掉成對的牌（同點數），輪流從下一家抽一張，湊成對就丟掉。最後拿著鬼牌的人輸；最先出完的人獲勝。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC;
  var REASONS = { done: '第一個把手牌丟光', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rank(c) { return c[0]; }
  function sortH(h) { var O = 'A23456789TJQKX'; return h.sort(function (a, b) { return O.indexOf(a[0]) - O.indexOf(b[0]) || 'cdhs1'.indexOf(a[1]) - 'cdhs1'.indexOf(b[1]); }); }
  /* 把手上的對子全部丟掉，回傳丟掉的牌 */
  function dropPairs(h) {
    var by = {}, out = [];
    h.forEach(function (c) { if (c[0] !== 'X') (by[c[0]] = by[c[0]] || []).push(c); });
    Object.keys(by).forEach(function (r) { var l = by[r]; while (l.length >= 2) { var a = l.pop(), b = l.pop(); out.push(a, b); h.splice(h.indexOf(a), 1); h.splice(h.indexOf(b), 1); } });
    return out;
  }
  function active(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.hands[s].length && g.out.indexOf(s) < 0) a.push(s); return a; }
  function nextActive(g, s) { for (var k = 1; k <= g.np; k++) { var t = (s + k) % g.np; if (g.hands[t].length && g.out.indexOf(t) < 0) return t; } return -1; }
  function settle(g) {
    for (var s = 0; s < g.np; s++) if (!g.hands[s].length && g.out.indexOf(s) < 0 && g.done.indexOf(s) < 0) g.done.push(s);
    var a = active(g);
    if (a.length <= 1) {
      var loser = a.length ? a[0] : -1, w = g.done.length ? g.done[0] : -1;
      g.res = { w: w, why: 'done', lose: loser };
      g.loser = loser; return true;
    }
    return false;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5],
    reasons: REASONS,
    levelDesc: ['全憑運氣', '全憑運氣', '全憑運氣', '全憑運氣'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var d = PK.deck(1), hands = []; for (var s = 0; s < n; s++) hands.push([]);
      d.forEach(function (c, i) { hands[i % n].push(c); });
      var pairs = 0; hands.forEach(function (h) { pairs += dropPairs(h).length / 2; sortH(h); PK.shuffle(h); });
      var g = { np: n, hands: hands, turn: Math.floor(Math.random() * n), out: [], done: [], pairs: pairs, lastPair: null, cnt: 0, res: null, last: null };
      if (!g.hands[g.turn].length || nextActive(g, g.turn) < 0) g.turn = nextActive(g, g.turn);
      settle(g);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var la = g.last;
      if (la && la.k === 'draw' && seat !== la.seat && seat !== la.from) la = { k: 'draw', seat: la.seat, from: la.from, pair: la.pair, n: la.n };
      return { np: g.np, hand: seat >= 0 ? sortH(g.hands[seat].slice()) : [], counts: g.hands.map(function (h) { return h.length; }), turn: g.turn, target: g.res ? -1 : nextActive(g, g.turn),
        out: g.out, done: g.done, pairs: g.pairs, lastPair: g.lastPair, cnt: g.cnt, last: la, loser: g.res ? g.loser : null, jokerAt: g.res ? g.loser : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'draw' || g.turn !== seat || d.n !== g.cnt) return false;
      var from = nextActive(g, seat); if (from < 0) return false;
      var th = g.hands[from], i = d.i | 0; if (i < 0 || i >= th.length) return false;
      var c = th.splice(i, 1)[0], mine = g.hands[seat], pair = null;
      var m = c[0] === 'X' ? -1 : mine.findIndex(function (x) { return x[0] === c[0]; });
      if (m >= 0) { var p = mine.splice(m, 1)[0]; pair = [p, c]; g.pairs++; g.lastPair = pair; } else mine.push(c);
      PK.shuffle(th); PK.shuffle(mine);
      g.cnt++; g.last = { k: 'draw', seat: seat, from: from, c: c, pair: pair, n: g.cnt };
      if (settle(g)) return true;
      g.turn = g.hands[seat].length ? nextActive(g, seat) : nextActive(g, seat);
      if (g.turn === -1) settle(g);
      return true;
    },
    botTurn: function (g, seat) {
      if (g.res || g.turn !== seat) return null;
      var from = nextActive(g, seat); if (from < 0) return null;
      return { t: 'draw', i: Math.floor(Math.random() * g.hands[from].length), n: g.cnt };
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + (g.lastPair ? g.lastPair.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') : '<em>開始抽牌</em>') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length ? g.hands[s].length + ' 張' : '✅ 出完') + (g.res && g.loser === s ? ' 🤡' : '') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '第 ' + (g.turn + 1) + ' 位抽第 ' + (nextActive(g, g.turn) + 1) + ' 位的牌・已丟掉 ' + g.pairs + ' 對', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    var h = g.hands[seat]; g.hands[seat] = []; g.out.push(seat);
    var to = nextActive(g, seat);
    if (to >= 0 && h.length) { g.hands[to] = g.hands[to].concat(h); g.pairs += dropPairs(g.hands[to]).length / 2; PK.shuffle(g.hands[to]); }
    if (settle(g)) { if (g.res.why === 'done' && why !== 'done' && active(g).length === 0) g.res.why = why; return; }
    if (g.turn === seat || !g.hands[g.turn].length) g.turn = nextActive(g, seat);
  }

  /* ---------- 學生端 ---------- */
  var L = { pick: -1, pending: null, round: -1, cnt: -1, flash: null };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.pick = -1; L.flash = null; }
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt) {
      if (la.seat === tb.seat) {
        L.flash = la.c;
        if (la.c && la.c[0] === 'X') { fx.toast('抽到鬼牌了！快想辦法讓別人抽走 😱'); fx.snd('error'); }
        else if (la.pair) { fx.toast('配成一對 ' + PK.label(la.c[0]) + '，丟掉！'); fx.snd('cap'); }
        else { fx.toast('抽到 ' + PK.name(la.c)); fx.snd('move'); }
      } else if (la.from === tb.seat) {
        fx.toast(short(tb, la.seat) + ' 抽走了你的' + (la.c[0] === 'X' ? '鬼牌！太好了 🎉' : ' ' + PK.name(la.c))); fx.snd(la.c[0] === 'X' ? 'win' : 'move');
      } else fx.snd('tap');
      if (!tb.res && v.turn === tb.seat) setTimeout(function () { fx.snd('turn'); }, 450);
    }
    L.cnt = v.cnt;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '成對的牌已經自動丟掉');
  };
  setInterval(function () { var P = L.pending; if (!P || !mod._ctx) return; if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('draw', P.d); } }, 800);
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0, finished = !v.hand.length && !out;
    var myTurn = !tb.res && v.turn === seat && !P && !out;
    var wrap = el('div', 'pk-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (finished) st.textContent = '你的牌丟光了，安全過關 🎉';
    else if (P) st.textContent = '抽牌中…';
    else if (myTurn) { st.textContent = L.pick >= 0 ? '再點一次就抽這張' : '輪到你了！從 ' + short(tb, v.target) + ' 抽一張'; st.className = 'pk-status me'; }
    else st.textContent = short(tb, v.turn) + ' 正在抽 ' + (v.target === seat ? '你' : short(tb, v.target)) + ' 的牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, v, seat, function (i) { if (tb.res && v.loser === i) return '🤡 鬼牌'; if (!v.counts[i] && v.out.indexOf(i) < 0) return '出完'; return v.target === i && !tb.res ? '被抽' : ''; }, short));
    var felt = el('div', 'pk-felt');
    if (myTurn && v.target >= 0) {
      var n = v.counts[v.target], fan = el('div', 'om-fan');
      for (var k = 0; k < n; k++) (function (k) {
        var b = el('button', 'om-back' + (L.pick === k ? ' sel' : '')); b.type = 'button'; b.innerHTML = PK.svg(null, { back: true });
        b.style.transform = 'rotate(' + ((k - (n - 1) / 2) * Math.min(3.5, 24 / n)) + 'deg)' + (L.pick === k ? ' translateY(-14px)' : '');
        b.addEventListener('click', function () {
          if (L.pick !== k) { L.pick = k; ctx.snd('tap'); ctx.rerender(); return; }
          L.pending = { d: { i: k, n: v.cnt }, n: v.cnt, at: Date.now() }; ctx.send('draw', { i: k, n: v.cnt }); L.pick = -1; ctx.rerender();
        });
        fan.appendChild(b);
      })(k);
      felt.appendChild(fan);
      felt.appendChild(el('div', 'pk-who', short(tb, v.target) + ' 的牌（' + n + ' 張）'));
    } else {
      if (v.lastPair) { var row = el('div', 'pk-played'); v.lastPair.forEach(function (c) { var s = el('span'); s.innerHTML = PK.svg(c); row.appendChild(s); }); felt.appendChild(row); }
      felt.appendChild(el('div', 'pk-who', '已經丟掉 ' + v.pairs + ' 對'));
    }
    wrap.appendChild(felt);
    var hand = v.hand;
    wrap.appendChild(PKUI.hand(hand, { title: tb.seats[seat].name + '・我', color: SEATC[seat], count: hand.length, turn: myTurn, sel: L.flash && hand.indexOf(L.flash) >= 0 ? [L.flash] : [], info: hand.indexOf('X1') >= 0 ? '🤡 鬼牌在你手上' : '' }));
    L.flash = null;
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      tools.appendChild(ctx.button('pk-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？你的牌會交給下一位。')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('old-maid', mod);

  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>一副牌加一張<b>鬼牌</b>，全部平均發給大家。</li><li>手上<b>點數一樣的兩張</b>（例如兩張 7）會自動丟掉。</li><li>輪到你時，從<b>下一位</b>的手牌裡抽一張（你看不到牌面）：點一下選牌，再點一次就抽。</li><li>抽到的牌如果和手上的湊成一對，就自動丟掉。</li><li>牌丟光的人就安全了。<b>最後拿著鬼牌的人輸！</b></li></ol>' + '<div class="g-figs"><figure class="g-fig"><div class="pk-figrow"><span>' + PK.svg('X1') + '</span></div><figcaption>鬼牌：沒有牌能和它配對</figcaption></figure></div>' },
      { h: '計分方式', html: '<p><b>第一個把牌丟光</b>的人算贏（積分榜 +3 分）。最後拿到鬼牌的人會顯示 🤡。</p><p>和電腦玩的另外記錄，不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「撲克牌」→「抽鬼牌」開房間。</li><li>每桌人數 2～6 人（預設 4 人）。</li><li>大螢幕顯示每人剩幾張、最近丟掉的一對，結束時標出拿鬼牌的人。</li></ol>' },
      { h: '規則與教學重點', html: '<ul><li>同點數就算一對，不分花色。</li><li>被抽的人手牌會自動洗亂，抽的人無法記位置，完全靠運氣。</li><li>有人認輸或離開，他的牌（包括鬼牌）會交給下一位。</li><li>適合低年級：只需要認得點數配對；可以帶學生練習「數字配對」與「機率」的概念（鬼牌在誰手上？）。</li></ul>' }
    ]
  };
})();
