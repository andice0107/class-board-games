/* 撲克牌・吹牛（台灣玩法）：2～6 人，牌全部發完。
   一輪開始的人宣告一個點數，蓋著出 1～4 張；接下來的人要「跟同一個點數」蓋牌出 1～4 張（可以說謊），或「不出」，或「抓」上一家。
   抓：翻開上一家剛出的牌，有說謊 → 說謊的人把桌上所有牌收回去；沒說謊 → 抓的人收回去。收牌的人的下一家開始新的一輪。
   大家都不出又輪回最後出牌的人 → 桌上的牌清掉，那個人重新開始。
   先把手牌出完、而且下一家沒抓到他說謊的人獲勝。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC, ORD = 'A23456789TJQK';
  var REASONS = { empty: '第一個出完手牌', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nxt(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function sortH(h) { return h.sort(function (a, b) { return ORD.indexOf(a[0]) - ORD.indexOf(b[0]) || a.localeCompare(b); }); }
  function newRound(g, s) { g.rlog = []; g.rank = null; g.turn = s; g.lastPlay = null; g.passes = 0; }
  function checkWin(g, actor) { // 出完牌的人，下一家沒抓 → 贏
    if (g.pendingWin != null && g.pendingWin !== actor) { g.res = { w: g.pendingWin, why: 'empty' }; return true; }
    return false;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1100,
    reasons: REASONS,
    levelDesc: ['常常亂說謊、亂抓', '有時候說謊，很少抓', '會算牌：明顯是騙人的就抓', '會算牌，也很會騙人'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var d = PK.deck(0), g = { np: n, hands: [], pile: [], rank: null, turn: 0, lastPlay: null, passes: 0, reveal: null, pendingWin: null, rlog: [], dead: 0, out: [], log: null, cnt: 0, res: null };
      for (var s = 0; s < n; s++) g.hands.push([]);
      d.forEach(function (c, i) { g.hands[i % n].push(c); });
      g.hands.forEach(sortH);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, turn: g.turn, rank: g.rank, hand: seat >= 0 ? g.hands[seat] : null, counts: g.hands.map(function (h) { return h.length; }), pile: g.pile.length,
        lastPlay: g.lastPlay ? { s: g.lastPlay.s, n: g.lastPlay.cards.length } : null, reveal: g.reveal, log: g.log, rlog: g.rlog || [], out: g.out, cnt: g.cnt, pendingWin: g.pendingWin };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat];
      if (d.t === 'play') {
        var cs = d.cards || []; if (!cs.length || cs.length > 4 || cs.some(function (c) { return h.indexOf(c) < 0; })) return false;
        var rk = g.rank || d.rank; if (!rk || ORD.indexOf(rk) < 0) return false;
        if (checkWin(g, seat)) { g.cnt++; return true; }
        cs.forEach(function (c) { h.splice(h.indexOf(c), 1); g.pile.push(c); });
        g.rank = rk; g.lastPlay = { s: seat, cards: cs.slice() }; g.passes = 0; g.reveal = null;
        g.log = { k: 'play', s: seat, n: cs.length, rank: rk }; (g.rlog = g.rlog || []).push({ s: seat, n: cs.length });
        if (!h.length) g.pendingWin = seat;
        g.turn = nxt(g, seat); g.cnt++;
        return true;
      }
      if (d.t === 'pass') {
        if (!g.rank) return false;
        if (checkWin(g, seat)) { g.cnt++; return true; }
        g.passes++; g.log = { k: 'pass', s: seat }; g.reveal = null; (g.rlog = g.rlog || []).push({ s: seat, p: 1 });
        var n = nxt(g, seat);
        if (g.lastPlay && n === g.lastPlay.s) { g.dead += g.pile.length; g.pile = []; g.log = { k: 'clear', s: n }; newRound(g, n); }
        else g.turn = n;
        g.cnt++; return true;
      }
      if (d.t === 'call') {
        if (!g.lastPlay) return false;
        var lp = g.lastPlay, lied = lp.cards.some(function (c) { return c[0] !== g.rank; }), taker = lied ? lp.s : seat;
        g.hands[taker] = sortH(g.hands[taker].concat(g.pile)); var got = g.pile.length; g.pile = [];
        g.reveal = { by: seat, s: lp.s, cards: lp.cards, rank: g.rank, lied: lied, taker: taker, got: got };
        g.log = { k: 'call', s: seat };
        if (g.pendingWin != null) { if (lied) g.pendingWin = null; else { g.res = { w: g.pendingWin, why: 'empty' }; g.cnt++; return true; } }
        newRound(g, nxt(g, taker));
        g.cnt++; return true;
      }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var h = g.hands[seat], n = g.cnt;
      function have(r) { return h.filter(function (c) { return c[0] === r; }); }
      // 要不要抓
      if (g.lastPlay) {
        var claim = g.lastPlay.cards.length, mine = have(g.rank).length, sure = mine + claim > 4;
        var p = sure ? 1 : lv <= 1 ? .25 : lv === 2 ? .08 : (claim >= 3 ? .35 : claim === 2 ? .15 : .05) + (g.pendingWin != null ? .6 : 0) + (g.pile.length > 10 ? -.05 : .05);
        if (lv >= 3 && g.pendingWin != null) p = Math.max(p, .7);
        if (Math.random() < p) return { t: 'call', n: n };
      }
      if (!g.rank) { // 自己開一輪：挑手上最多的點數
        var best = null; ORD.split('').forEach(function (r) { var k = have(r).length; if (k && (!best || k > best.k)) best = { r: r, k: k }; });
        var cs = have(best.r).slice(0, 4);
        if (lv >= 4 && Math.random() < .4 && cs.length < 3 && h.length > cs.length + 1) { var extra = h.filter(function (c) { return c[0] !== best.r; })[0]; cs.push(extra); }
        return { t: 'play', cards: cs, rank: best.r, n: n };
      }
      var real = have(g.rank).slice(0, 4);
      if (real.length) return { t: 'play', cards: lv >= 3 && real.length < 4 && Math.random() < .3 && h.length > real.length + 1 ? real.concat([h.filter(function (c) { return c[0] !== g.rank; })[0]]) : real, n: n };
      var lie = lv <= 1 ? .7 : lv === 2 ? .45 : lv === 3 ? .5 : .6;
      if (Math.random() < lie) { var junk = h.slice().sort(function (a, b) { return ORD.indexOf(a[0]) - ORD.indexOf(b[0]); }).slice(0, lv >= 4 && h.length > 4 ? 2 : 1); return { t: 'play', cards: junk, n: n }; }
      return { t: 'pass', n: n };
    },
    hintDesc: '會亮出你手上「真的有」要喊的點數的牌（可以放心出）；如果你手上的張數加上上一家喊的張數超過 4 張（一種點數只有 4 張），會告訴你他一定在吹牛，建議抓；新的一輪則亮出你最多張的點數。',
    tipDesc: '你手上沒有要喊的點數時，提醒你可以說謊、不出或抓；有人快出完時，提醒這是最後一次抓他的機會。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var h = g.hands[seat];
      function have(r) { return h.filter(function (c) { return c[0] === r; }); }
      if (g.lastPlay && g.rank) {
        var mine = have(g.rank).length, claim = g.lastPlay.cards.length;
        if (mine + claim > 4) return { msg: '你手上有 ' + mine + ' 張「' + PK.label(g.rank) + '」，上一家說他出了 ' + claim + ' 張，加起來超過 4 張（一種點數只有 4 張），他一定在吹牛！亮黃框的「抓」可以抓他。', hl: ['call'] };
      }
      if (!g.rank) {
        var best = null; ORD.split('').forEach(function (r) { var k = have(r).length; if (k && (!best || k > best.k)) best = { r: r, k: k }; });
        return best ? { msg: '新的一輪，你可以自己決定喊什麼。你手上最多的是 ' + best.k + ' 張「' + PK.label(best.r) + '」（亮黃框），喊它最安全。', hl: have(best.r).slice(0, 4) } : null;
      }
      var real = have(g.rank);
      if (real.length) return { msg: '你手上真的有 ' + real.length + ' 張「' + PK.label(g.rank) + '」（亮黃框），出它們就不用說謊。', hl: real.slice(0, 4) };
      return { msg: '你手上沒有「' + PK.label(g.rank) + '」。你可以：偷偷出別的牌說謊、選「不出」，或「抓」上一家（猜他吹牛）。亮黃框的是你可以選的按鈕。', hl: ['pass'].concat(g.lastPlay ? ['call'] : []) };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      if (g.pendingWin != null && g.pendingWin !== seat && g.lastPlay) return '上一家已經把手牌出完了！如果你覺得他剛剛在吹牛，現在是最後的機會，按「抓」就能把他的牌翻開。';
      if (g.rank && !g.hands[seat].some(function (c) { return c[0] === g.rank; })) return '你手上沒有「' + PK.label(g.rank) + '」喔！可以說謊（出別的牌）、按「不出」，或是「抓」上一家。';
      return g.rank ? '輪到你了：選 1～4 張牌，跟著喊「' + PK.label(g.rank) + '」；不想出就按「不出」。' : '新的一輪：先選 1～4 張牌，再選要喊的點數，按出牌。';
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb"><b class="nn-host">' + (g.rank ? PK.label(g.rank) : '—') + '</b><span>桌上 ' + g.pile.length + ' 張</span></div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length + ' 張') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: g.rank ? '這一輪喊「' + PK.label(g.rank) + '」・桌上 ' + g.pile.length + ' 張' : '新的一輪', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.pile = g.pile.concat(g.hands[seat]); g.hands[seat] = [];
    if (g.pendingWin === seat) g.pendingWin = null;
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.lastPlay && g.lastPlay.s === seat) g.lastPlay = null;
    if (g.turn === seat) g.turn = nxt(g, seat);
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: [], rank: null, round: -1, sent: -1, key: '' };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = []; L.sent = -1; L.key = ''; L.rank = null; }
    if (prev && v.cnt !== L.key && v.log) {
      var lg = v.log;
      if (lg.k === 'call' && v.reveal) { var r = v.reveal; fx.snd(r.lied ? 'pop' : 'cap'); fx.toast(who(tb, r.by) + ' 抓 ' + who(tb, r.s) + '：' + (r.lied ? '真的在吹牛！' : '沒有說謊！') + who(tb, r.taker) + ' 收 ' + r.got + ' 張'); }
      else if (lg.k === 'play') fx.snd('move');
      else if (lg.k === 'clear') fx.toast('大家都不出，桌上的牌清掉，' + who(tb, lg.s) + ' 重新開始');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    L.key = v.cnt;
    L.sel = L.sel.filter(function (c) { return v.hand.indexOf(c) >= 0; });
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '可以說謊，但小心被抓！');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var wrap = el('div', 'pk-table ch2-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = !v.rank ? '新的一輪：選 1～4 張牌，再選要喊什麼點數' : '跟著喊「' + PK.label(v.rank) + '」出 1～4 張、不出，或抓上一家'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function (i) { return v.pendingWin === i ? '出完了！' : ''; }, short));
    var ord = el('div', 'ch2-order'); ord.appendChild(el('span', 'lbl', '出牌順序'));
    for (var q = 0; q < v.np; q++) { var si = (seat + q) % v.np; if (q) ord.appendChild(el('span', 'ar', '→'));
      var tg = el('span', 'who' + (si === v.turn && !tb.res ? ' now' : '') + (v.out.indexOf(si) >= 0 ? ' out' : '')); var dd = el('i'); dd.style.background = SEATC[si]; tg.appendChild(dd); tg.appendChild(document.createTextNode(si === seat ? '我' : short(tb, si))); ord.appendChild(tg); }
    ord.appendChild(el('span', 'ar', '↩'));
    wrap.appendChild(ord);
    var felt = el('div', 'pk-felt ch2-felt');
    var pile = el('div', 'ch2-pile');
    for (var k = 0; k < Math.min(v.pile, 8); k++) { var b = el('span'); b.innerHTML = PK.svg(null, { back: true }); b.style.transform = 'rotate(' + ((k * 37) % 30 - 15) + 'deg)'; pile.appendChild(b); }
    felt.appendChild(pile);
    felt.appendChild(el('div', 'ch2-claim', v.rank ? '這一輪喊：「' + PK.label(v.rank) + '」・桌上 ' + v.pile + ' 張' : '新的一輪'));
    if (v.lastPlay && v.rank) felt.appendChild(el('div', 'ch2-last', who(tb, v.lastPlay.s) + '：「' + v.lastPlay.n + ' 張 ' + PK.label(v.rank) + '」'));
    if (v.rlog.length && v.rank) { var lg = el('div', 'ch2-log'); lg.appendChild(el('b', '', '這一輪喊的牌'));
      v.rlog.forEach(function (x) { var r = el('span', x.p ? 'pass' : ''); var dd = el('i'); dd.style.background = SEATC[x.s]; r.appendChild(dd); r.appendChild(document.createTextNode(who(tb, x.s) + '：' + (x.p ? '不出' : x.n + ' 張 ' + PK.label(v.rank)))); lg.appendChild(r); });
      felt.appendChild(lg); }
    if (v.reveal) { var rv = el('div', 'ch2-reveal ' + (v.reveal.lied ? 'lie' : 'true')); rv.innerHTML = '<small>' + who(tb, v.reveal.by) + ' 抓 ' + who(tb, v.reveal.s) + '（喊 ' + PK.label(v.reveal.rank) + '）</small><span>' + v.reveal.cards.map(function (c) { return PK.mini(c); }).join('') + '</span><small>' + (v.reveal.lied ? '😝 吹牛被抓到！' : '😇 沒說謊') + '　' + who(tb, v.reveal.taker) + ' 收 ' + v.reveal.got + ' 張</small>'; felt.appendChild(rv); }
    wrap.appendChild(felt);
    var SL = [['rank', '🔀 整理：依點數', sortH], ['suit', '🔀 整理：依花色', PKUI.bySuit]], HK = BG.handKey(tb, 'cheat'), ho = BG.handOrder(HK, v.hand, PKUI.sorter(L, SL));
    var me = PKUI.hand(ho.list, { fresh: ho.fresh, title: tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我', color: SEATC[seat], turn: myTurn, sel: L.sel,
      onTap: function (c) { if (!myTurn) return; var i = L.sel.indexOf(c); if (i >= 0) L.sel.splice(i, 1); else if (L.sel.length < 4) L.sel.push(c); else { ctx.toast('一次最多出 4 張'); return; } ctx.snd('tap'); ctx.rerender(); } });
    wrap.appendChild(me);
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; ctx.send(t, d); L.sel = []; L.rank = null; ctx.rerender(); }
    if (!tb.res && !out) {
      if (myTurn && !v.rank && L.sel.length) {
        var rr = el('div', 'pk-tools ch2-ranks'); rr.appendChild(el('span', '', '要喊：'));
        ORD.split('').forEach(function (r) { rr.appendChild(ctx.button('pk-btn small' + (L.rank === r ? ' go' : ''), PK.label(r), function () { L.rank = r; ctx.rerender(); })); });
        wrap.appendChild(rr);
      }
      var tools = el('div', 'pk-tools');
      if (myTurn) {
        var rk = v.rank || L.rank;
        var pb = ctx.button('pk-btn go', L.sel.length ? '出 ' + L.sel.length + ' 張' + (rk ? '，喊「' + PK.label(rk) + '」' : '') : '先選牌', function () { ctx.snd('move'); send('play', { cards: L.sel.slice(), rank: rk }); });
        pb.setAttribute('data-h', 'play'); pb.disabled = !L.sel.length || !rk; tools.appendChild(pb);
        if (v.rank) { var pb2 = ctx.button('pk-btn', '不出', function () { send('pass'); }); pb2.setAttribute('data-h', 'pass'); tools.appendChild(pb2); }
        if (v.lastPlay) { var cb = ctx.button('pk-btn ch2-call', '🔍 抓！', function () { ctx.snd('check'); send('call'); }); cb.setAttribute('data-h', 'call'); tools.appendChild(cb); }
      }
      PKUI.sortBtns(ctx, tools, L, HK, SL);
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  BG.register('cheat', mod);
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>牌全部發完。</li><li>一輪開始的人選 1～4 張牌<b>蓋著</b>出，並喊一個點數，例如「兩張 7」。</li><li>接下來的人都要跟著喊<b>同一個點數</b>，蓋著出 1～4 張。<b>可以說謊！</b>手上沒有 7 也可以假裝。</li><li>不想出就按「不出」。大家都不出、輪回最後出牌的人時，桌上的牌清掉，他重新開始一輪。</li><li>輪到你的時候，覺得<b>上一家</b>（剛剛出牌的人）在吹牛，就按「<b>🔍 抓！</b>」。只能抓上一家，不能抓更早出的人。</li><li>畫面上方的「出牌順序」箭頭會告訴你誰在你前面、誰在你後面；桌上會列出這一輪每個人喊了「幾張幾」。</li></ol>' },
      { h: '抓吹牛', html: '<ul><li>抓的時候翻開上一家剛出的牌。</li><li><b>真的在吹牛</b>（有一張不是喊的點數）→ 吹牛的人把桌上<b>全部的牌</b>收回去。</li><li><b>沒說謊</b> → 抓的人自己把桌上的牌收回去。</li><li>收牌的人的下一家開始新的一輪。</li><li>小技巧：一個點數只有 4 張。你手上有 3 張 7，別人卻喊「兩張 7」，一定是吹牛！</li></ul>' },
      { h: '怎麼贏', html: '<p>第一個把手牌出完的人，只要下一家沒有抓到他吹牛，就贏了（積分榜 +3 分）。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「撲克牌」→「撲克牌吹牛」，每桌 2～6 人（3～5 人最好玩）。</li><li>老師端每桌顯示這一輪喊的點數、桌上張數和每人剩幾張。</li></ol>' },
      { h: '規則與教學', html: '<p>本工具採用台灣常見玩法：只能跟同一個點數、輪到你時才能抓上一家、大家都不出就清桌。</p><ul><li>推理：一個點數只有 4 張，可以用自己的手牌推理別人有沒有說謊。</li><li>可以搭配品德討論：遊戲裡的「吹牛」是規則允許的策略，和生活中說謊不一樣。</li></ul>' }
    ]
  };
})();
