/* 撲克牌・排7：2～4 人，牌全部發完。拿到黑桃 7 的人先出。
   每種花色要先出 7，之後只能接在兩端（往下 6、5…A，往上 8、9…K）。能出就一定要出；
   都不能出時，要選一張牌「蓋牌」（蓋著放在自己面前）。牌出完後，蓋牌點數加起來最少的人獲勝（A=1、J=11、Q=12、K=13）。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC, NR = 'A23456789TJQK', SU = ['s', 'h', 'd', 'c'];
  var REASONS = { least: '蓋牌點數最少', tie: '蓋牌點數一樣，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rv(c) { return NR.indexOf(c[0]) + 1; }
  function sortH(h) { return h.sort(function (a, b) { return SU.indexOf(a[1]) - SU.indexOf(b[1]) || rv(a) - rv(b); }); }
  function canPlay(board, c, first) {
    if (first) return c === '7s';
    var b = board[c[1]], r = rv(c);
    if (!b) return r === 7;
    return r === b[0] - 1 || r === b[1] + 1;
  }
  function legal(g, seat) { var first = g.cnt === 0; return g.hands[seat].filter(function (c) { return canPlay(g.board, c, first); }); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function next(g, s) { for (var k = 1; k <= g.np; k++) { var t = (s + k) % g.np; if (g.out.indexOf(t) < 0 && g.hands[t].length) return t; } return -1; }
  function sum(l) { return l.reduce(function (a, c) { return a + rv(c); }, 0); }
  function endGame(g) {
    var best = -1, bv = 1e9, tie = false;
    alive(g).forEach(function (s) { var v = sum(g.cover[s]); if (v < bv) { bv = v; best = s; tie = false; } else if (v === bv) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'least' };
  }
  /* 電腦：出牌時優先打開自己後面還有牌的方向；蓋牌時蓋點數小、又能卡住別人的牌 */
  function botPick(g, seat, level) {
    var h = g.hands[seat], L = legal(g, seat);
    function mineBeyond(c) { var r = rv(c), n = 0; h.forEach(function (x) { if (x[1] !== c[1] || x === c) return; if (r <= 7 && rv(x) < r) n++; if (r >= 7 && rv(x) > r) n++; }); return n; }
    if (L.length) {
      if (level <= 1) return { t: 'play', c: L[Math.floor(Math.random() * L.length)] };
      L.forEach(function (c) { c = c; });
      var best = L[0], bv = -1e9;
      L.forEach(function (c) {
        var v = mineBeyond(c) * (level >= 3 ? 3 : 1) + Math.random() * (level === 2 ? 4 : .5);
        if (level >= 4 && mineBeyond(c) === 0 && rv(c) !== 7 && L.length > 1) v -= 4; // 會幫別人開路的牌，晚點出
        if (v > bv) { bv = v; best = c; }
      });
      return { t: 'play', c: best };
    }
    if (level <= 1) return { t: 'cover', c: h[Math.floor(Math.random() * h.length)] };
    var cv = h[0], cb = 1e9;
    h.forEach(function (c) {
      var v = rv(c) * 2;
      if (level >= 3) v -= mineBeyond(c) === 0 ? 3 : 0;   // 後面沒有自己牌的，蓋掉可以卡住別人
      if (level >= 4) { var b = g.board[c[1]]; if (b && (rv(c) === b[0] - 1 || rv(c) === b[1] + 1)) v -= 6; }
      if (v < cb) { cb = v; cv = c; }
    });
    return { t: 'cover', c: cv };
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3],
    reasons: REASONS,
    levelDesc: ['隨便出、隨便蓋', '會照順序出牌', '會先出自己需要的方向', '會故意蓋牌卡住別人，很難贏'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(4, n || 4));
      var d = PK.deck(0), hands = [], cover = []; for (var s = 0; s < n; s++) { hands.push([]); cover.push([]); }
      d.forEach(function (c, i) { hands[i % n].push(c); });
      hands.forEach(sortH);
      var first = 0; hands.forEach(function (h, s) { if (h.indexOf('7s') >= 0) first = s; });
      return { np: n, hands: hands, cover: cover, board: { s: null, h: null, d: null, c: null }, turn: first, out: [], cnt: 0, res: null, last: null };
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var la = g.last; if (la && la.k === 'cover' && la.seat !== seat) la = { k: 'cover', seat: la.seat, n: la.n };
      return { np: g.np, hand: seat >= 0 ? g.hands[seat] : [], counts: g.hands.map(function (h) { return h.length; }), covers: g.cover.map(function (c) { return c.length; }),
        myCover: seat >= 0 ? g.cover[seat] : [], board: g.board, turn: g.turn, out: g.out, cnt: g.cnt, last: la, reveal: g.res ? g.cover.map(function (c) { return { cards: c, sum: sum(c) }; }) : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], i = h.indexOf(d.c); if (i < 0) return false;
      var L = legal(g, seat);
      if (d.t === 'play') {
        if (L.indexOf(d.c) < 0) return false;
        h.splice(i, 1); var b = g.board[d.c[1]], r = rv(d.c);
        g.board[d.c[1]] = b ? [Math.min(b[0], r), Math.max(b[1], r)] : [7, 7];
        g.last = { k: 'play', seat: seat, c: d.c, n: g.cnt + 1 };
      } else if (d.t === 'cover') {
        if (L.length) return false;
        h.splice(i, 1); g.cover[seat].push(d.c); g.last = { k: 'cover', seat: seat, c: d.c, n: g.cnt + 1 };
      } else return false;
      g.cnt++;
      var nx = next(g, seat); if (nx < 0) endGame(g); else g.turn = nx;
      return true;
    },
    hintDesc: '會亮出你手上「現在可以接在桌上」的牌；如果沒有牌可以出，會告訴你這一輪要「蓋牌」，並亮出點數最小、蓋掉最划算的牌。',
    tipDesc: '你沒有牌可以接的時候，提醒你要蓋一張牌（不能不動）；其他時候提醒你怎麼出牌。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var L = legal(g, seat);
      if (L.length) return { msg: g.cnt === 0 ? '第一手一定要出黑桃 7，亮黃框的就是它。' : '亮黃框的牌現在都可以接在桌上（能出就一定要出）。想一想：先出哪個方向，對自己最有利？', hl: L };
      var low = g.hands[seat].slice().sort(function (a, b) { return rv(a) - rv(b); })[0];
      return { msg: '你現在沒有牌可以接，這一輪要「蓋牌」。蓋掉的牌點數會被加總，越少越好，所以亮黃框的是點數最小的牌。', hl: low ? [low] : [] };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      if (!legal(g, seat).length) return '你現在沒有牌可以接，不能不動喔！要選一張牌「蓋牌」（建議蓋點數小的），再點一次確認。';
      return '輪到你了：只要是能接在桌上的牌就一定要出，點亮起來（沒有變暗）的牌，再點一次確認。';
    },
    botTurn: function (g, seat, level) { if (g.res || g.turn !== seat) return null; var a = botPick(g, seat, level); a.n = g.cnt; return a; },
    hostView: function (g) { return '<div class="pk-host">' + boardHtml(g.board, true) + '<div class="pk-host-seats">' + g.hands.map(function (h, s) { return '<span class="pk-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : h.length + ' 張・蓋 ' + g.cover[s].length) + '</span>'; }).join('') + '</div></div>'; },
    hostStatus: function (g) { return { t: '輪到第 ' + (g.turn + 1) + ' 位', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    // 認輸的人手上的牌視為全部蓋牌（不影響別人能不能接）
    g.cover[seat] = g.cover[seat].concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) { var nx = next(g, seat); if (nx < 0) endGame(g); else g.turn = nx; }
    if (alive(g).every(function (s) { return !g.hands[s].length; })) endGame(g);
  }
  /* 桌面：四種花色各一排 */
  function boardHtml(board, small) {
    var h = '<div class="sv-board' + (small ? ' small' : '') + '">';
    SU.forEach(function (s) {
      h += '<div class="sv-row"><b class="' + (s === 'h' || s === 'd' ? 'red' : '') + '">' + PK.SYM[s] + '</b>';
      for (var r = 1; r <= 13; r++) {
        var b = board[s], on = b && r >= b[0] && r <= b[1];
        h += '<span class="sv-slot' + (on ? ' on' : '') + (r === 7 ? ' seven' : '') + '">' + (on ? PK.mini(NR[r - 1] + s) : '<i>' + PK.label(NR[r - 1]) + '</i>') + '</span>';
      }
      h += '</div>';
    });
    return h + '</div>';
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: null, pending: null, round: -1, cnt: -1 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.sel = null; }
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt && la.seat !== tb.seat) {
      if (la.k === 'cover') fx.toast(short(tb, la.seat) + ' 蓋了一張牌'); fx.snd('move');
      if (!tb.res && v.turn === tb.seat) setTimeout(function () { fx.snd('turn'); }, 350);
    }
    L.cnt = v.cnt;
    if (L.sel && v.hand.indexOf(L.sel) < 0) L.sel = null;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + (v.turn === tb.seat ? '你有黑桃 7，由你先出' : ''));
  };
  setInterval(function () { var P = L.pending; if (!P || !mod._ctx) return; if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send(P.t, P.d); } }, 800);
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0;
    var myTurn = !tb.res && v.turn === seat && !P && !out;
    var first = v.cnt === 0, L2 = v.hand.filter(function (c) { return canPlay(v.board, c, first); }), mustCover = myTurn && !L2.length;
    var wrap = el('div', 'pk-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (P) st.textContent = '出牌中…';
    else if (myTurn) { st.textContent = mustCover ? '沒有牌能接，選一張蓋起來' : (first ? '先出黑桃 7！' : '選一張能接上的牌'); st.className = 'pk-status me'; }
    else if (!v.hand.length) st.textContent = '你的牌出完了，等其他人…';
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, v, seat, function (i) { return v.covers[i] ? '蓋 ' + v.covers[i] : ''; }, short));
    var felt = el('div', 'pk-felt sv-felt'); felt.innerHTML = boardHtml(v.board);
    if (v.last && v.last.k === 'play') { var hit = felt.querySelectorAll('.sv-row')[SU.indexOf(v.last.c[1])].children[rv(v.last.c)]; if (hit) hit.classList.add('new'); }
    wrap.appendChild(felt);
    if (tb.res && v.reveal) {
      var pr = el('div', 'pk-pen');
      v.reveal.forEach(function (r, i) { pr.appendChild(el('span', '', (i === seat ? '你' : short(tb, i)) + '：蓋了 ' + r.cards.length + ' 張，共 ' + r.sum + ' 點' + (i === tb.res.w ? ' 🏆' : ''))); });
      wrap.appendChild(pr);
    }
    var info = v.myCover.length ? '我的蓋牌 ' + v.myCover.length + ' 張・' + v.myCover.reduce(function (a, c) { return a + rv(c); }, 0) + ' 點' : '';
    wrap.appendChild(PKUI.hand(v.hand, {
      title: (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我'), color: SEATC[seat], count: v.hand.length, turn: v.turn === seat && !tb.res, sel: L.sel ? [L.sel] : [], info: info,
      dim: function (c) { return myTurn && !mustCover && L2.indexOf(c) < 0; },
      onTap: function (c) {
        if (!myTurn) return;
        if (!mustCover && L2.indexOf(c) < 0) { ctx.snd('error'); ctx.toast(first ? '第一張一定要出黑桃 7' : '這張接不上，要接在同花色的兩端'); return; }
        if (L.sel !== c) { L.sel = c; ctx.snd('tap'); ctx.rerender(); return; }
        var t = mustCover ? 'cover' : 'play', d = { c: c, n: v.cnt };
        L.pending = { t: t, d: d, n: v.cnt, at: Date.now() }; ctx.snd('move'); ctx.send(t, d); L.sel = null; ctx.rerender();
      }
    }));
    if (myTurn && L.sel) wrap.appendChild(el('div', 'sv-hint', mustCover ? '再點一次「' + PK.name(L.sel) + '」把它蓋起來（會算 ' + rv(L.sel) + ' 點）' : '再點一次就出「' + PK.name(L.sel) + '」'));
    if (v.myCover.length) { var mc = el('div', 'sv-cover'); mc.appendChild(el('span', '', '我蓋的牌：')); v.myCover.forEach(function (c) { var s = el('span', 'sv-cc'); s.innerHTML = PK.svg(c); mc.appendChild(s); }); wrap.appendChild(mc); }
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      tools.appendChild(ctx.button('pk-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('sevens', mod);
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>牌全部發完（4 人每人 13 張）。拿到<b>黑桃 7</b> 的人先出。</li><li>每種花色都要先出 <b>7</b>，之後只能接在兩端：往下接 6、5…A，往上接 8、9…K。</li><li><b>能出就一定要出。</b>能出的牌會亮著，點一下選、再點一次出牌。</li><li>完全不能出時，要選一張牌<b>蓋起來</b>（放在自己面前，別人看不到）。</li><li>大家的牌都出完或蓋完後，算蓋牌的點數：<b>最少的人獲勝</b>。</li></ol>' },
      { h: '點數與技巧', html: '<p>A = 1 點、2～10 照數字、J = 11、Q = 12、K = 13。</p><ul><li>不得不蓋牌時，先蓋點數小的牌。</li><li>小技巧：如果你蓋掉某花色的 6，比 6 小的牌就沒人能出了，可以卡住別人（但小心自己手上也有）。</li></ul>' },
      { h: '計分方式', html: '<p>蓋牌點數最少的人贏（積分榜 +3 分），點數一樣就平手。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「撲克牌」→「排7」開房間，每桌 2～4 人（預設 4 人）。</li><li>大螢幕顯示四種花色已經排出的牌，以及每人剩幾張、蓋了幾張。</li></ol>' },
      { h: '教學重點', html: '<ul><li>練習數字順序（往上、往下接）與花色分類。</li><li>結束時要把蓋牌點數加起來：J、Q、K 是 11、12、13，是很好的加法練習。</li><li>能出一定要出，避免學生故意不出。</li></ul>' }
    ]
  };
})();
