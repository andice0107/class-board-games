/* 撲克牌・射龍門：2～6 人，每人 10 個籌碼，開始時每人放 1 個到彩池。
   輪到你：翻開兩張「門柱」，決定要押多少（0～3，不能超過彩池和自己的籌碼），再翻第三張：
   ・落在兩根門柱中間 → 從彩池贏走押的數量
   ・在門外 → 押的數量放進彩池
   ・剛好和門柱一樣（撞柱）→ 賠 2 倍放進彩池
   兩根門柱一樣時改成猜「比它大」或「比它小」。A＝1 最小，K＝13 最大。
   每人輪 4 次後結束，籌碼最多的人贏。彩池空了，大家再各放 1 個。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC, TURNS = 4, START = 10;
  var REASONS = { most: '籌碼最多', tie: '籌碼一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function num(c) { return 'A23456789TJQK'.indexOf(c[0]) + 1; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function draw(g) { if (!g.deck.length) g.deck = PK.deck(0); return g.deck.pop(); }
  function ante(g) { alive(g).forEach(function (s) { if (g.chips[s] > 0) { g.chips[s]--; g.pot++; } }); }
  function deal(g) { g.posts = [draw(g), draw(g)]; g.posts.sort(function (a, b) { return num(a) - num(b); }); }
  function maxBet(g, s) { return Math.max(0, Math.min(3, g.pot, g.chips[s])); }
  function nextTurn(g) {
    var a = alive(g); if (!a.length) return;
    var n = g.turn; for (var k = 1; k <= g.np; k++) { var c = (g.turn + k) % g.np; if (g.out.indexOf(c) < 0) { n = c; break; } }
    if (n <= g.turn || a.length === 1) g.lap++;
    if (g.lap > TURNS) { finish(g); return; }
    g.turn = n; if (g.pot <= 0) ante(g); deal(g);
  }
  function finish(g) {
    var best = -1, bv = -1, tie = false;
    alive(g).forEach(function (s) { if (g.chips[s] > bv) { bv = g.chips[s]; best = s; tie = false; } else if (g.chips[s] === bv) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'most', note: '最後有 ' + bv + ' 個籌碼' };
  }
  function winProb(g) { // 第三張贏的機率（約略）
    var a = num(g.posts[0]), b = num(g.posts[1]);
    if (a === b) return Math.max(a - 1, 13 - a) * 4 / 50;
    return Math.max(0, b - a - 1) * 4 / 50;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1100,
    reasons: REASONS,
    levelDesc: ['亂押', '門很寬才押', '看機率決定押多少', '看機率，也會看彩池大小'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var g = { np: n, deck: PK.deck(0), chips: [], pot: 0, turn: 0, lap: 1, posts: null, last: null, out: [], cnt: 0, res: null };
      for (var s = 0; s < n; s++) g.chips.push(START);
      ante(g); deal(g);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g) { return { np: g.np, turn: g.turn, lap: g.lap, laps: TURNS, chips: g.chips, pot: g.pot, posts: g.posts, last: g.last, out: g.out, cnt: g.cnt, counts: g.chips }; },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'shoot' || g.turn !== seat || d.n !== g.cnt) return false;
      var bet = Math.max(0, Math.min(maxBet(g, seat), d.b | 0)), a = num(g.posts[0]), b = num(g.posts[1]), same = a === b;
      if (same && bet && d.guess !== 'hi' && d.guess !== 'lo') return false;
      var third = bet ? draw(g) : null, x = third ? num(third) : 0, out = 'skip', delta = 0;
      if (bet) {
        if (x === a || x === b) { out = 'post'; delta = -Math.min(g.chips[seat], bet * 2); }
        else if (same ? (d.guess === 'hi' ? x > a : x < a) : (x > a && x < b)) { out = 'in'; delta = bet; }
        else { out = 'out'; delta = -bet; }
      }
      g.chips[seat] += delta; g.pot -= delta;
      g.last = { s: seat, posts: g.posts, third: third, bet: bet, out: out, delta: delta, guess: same ? d.guess : null };
      g.cnt++;
      nextTurn(g);
      return true;
    },
    hintDesc: '會算出「第三張落在兩根門柱中間」的機率，告訴你兩根門柱中間有幾種點數，並亮出建議押的籌碼（機率高才多押，機率低就別射）；門柱一樣大時，亮出猜大或猜小哪邊比較有機會。',
    tipDesc: '提醒你先選要押幾個（選「不射」也可以），再按「射」。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0 || !g.posts) return null;
      var a = num(g.posts[0]), b = num(g.posts[1]), p = winProb(g), mb = maxBet(g, seat), rec = p > .7 ? mb : p > .55 ? Math.min(2, mb) : p > .42 ? Math.min(1, mb) : 0, pct = Math.round(p * 100);
      if (a === b) {
        var hi = 13 - a, lo = a - 1, gs = hi >= lo ? 'hi' : 'lo';
        return { msg: '兩根門柱一樣大（' + PK.label(g.posts[0][0]) + '），要猜第三張比它大還是小。比它大的點數有 ' + hi + ' 種、比它小的有 ' + lo + ' 種，所以猜「' + (gs === 'hi' ? '比較大' : '比較小') + '」機會比較高（約 ' + pct + '%）。' + (rec ? '建議押 ' + rec + ' 個。' : '機會不高，建議這次不射。'), hl: ['b' + rec, 'g:' + gs] };
      }
      return { msg: '兩根門柱中間有 ' + Math.max(0, b - a - 1) + ' 種點數，第三張落在門裡面的機會約 ' + pct + '%。' + (rec ? '機會不錯，建議押 ' + rec + ' 個。' : '機會不大，建議這次「不射」。') + '（撞柱要賠 2 倍，要小心）', hl: ['b' + rec] };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0 || !g.posts) return null;
      return num(g.posts[0]) === num(g.posts[1]) ? '兩根門柱一樣大！先選要押幾個，再選猜「比較大」或「比較小」，最後按「射」。' : '輪到你了：先選要押幾個籌碼（不想冒險就選「不射」），再按「射」，翻開第三張決定輸贏。';
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var p = winProb(g), mb = maxBet(g, seat), a = num(g.posts[0]), b;
      var guess = a <= 7 ? 'hi' : 'lo';
      if (lv <= 1) b = Math.floor(Math.random() * (mb + 1));
      else if (lv === 2) b = p > .55 ? Math.min(2, mb) : p > .4 ? 1 : 0;
      else { b = p > .7 ? mb : p > .55 ? Math.min(2, mb) : p > .42 ? Math.min(1, mb) : 0; if (lv >= 4 && g.pot >= 6 && p > .6) b = mb; }
      return { t: 'shoot', b: Math.min(b, mb), guess: guess, n: g.cnt };
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + (g.posts ? g.posts.map(function (c) { return '<span>' + PK.mini(c) + '</span>'; }).join('<em>門</em>') : '') + '<b class="nn-host">🏆' + g.pot + '</b></div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : '🪙 ' + g.chips[s]) + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '第 ' + Math.min(g.lap, TURNS) + ' / ' + TURNS + ' 輪・彩池 ' + g.pot, c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.pot += g.chips[seat]; g.chips[seat] = 0;
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) nextTurn(g);
  }

  /* ---------- 學生端 ---------- */
  var L = { bet: 1, guess: null, round: -1, sent: -1, key: '' };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  var OUTTXT = { in: '射進龍門！', out: '射歪了', post: '撞柱！賠 2 倍', skip: '不射' };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sent = -1; L.key = ''; L.guess = null; }
    var key = v.cnt;
    if (prev && key !== L.key && v.last) {
      var l = v.last; fx.snd(l.out === 'in' ? 'pop' : l.out === 'skip' ? 'tap' : 'cap');
      fx.toast(who(tb, l.s) + '：' + OUTTXT[l.out] + (l.delta ? '（' + (l.delta > 0 ? '+' : '') + l.delta + '）' : ''));
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 500);
      L.guess = null;
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '第三張要落在兩根門柱中間');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var same = v.posts && num(v.posts[0]) === num(v.posts[1]);
    var wrap = el('div', 'pk-table dg-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = same ? '門柱一樣！猜大還是猜小' : '會落在門柱中間嗎？選要押多少'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + ' 射龍門';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.chips, out: v.out, turn: v.turn }, seat, function () { return ''; }, short));
    [].forEach.call(wrap.querySelectorAll('.pk-opp'), function (e) { var i = +e.getAttribute('data-seat'); var c = e.querySelector('.pk-cnt'); if (c && v.out.indexOf(i) < 0) c.textContent = '🪙 ' + v.chips[i]; var f = e.querySelector('.pk-fan'); if (f) f.remove(); });
    var felt = el('div', 'pk-felt dg-felt');
    felt.appendChild(el('div', 'dg-pot', '🏆 彩池 ' + v.pot + '　・　第 ' + Math.min(v.lap, v.laps) + ' / ' + v.laps + ' 輪'));
    if (v.posts && !tb.res) {
      var gate = el('div', 'dg-gate');
      gate.innerHTML = '<span class="dg-post">' + PK.svg(v.posts[0]) + '</span><span class="dg-mid">' + (same ? '?' : '🐉') + '</span><span class="dg-post">' + PK.svg(v.posts[1]) + '</span>';
      felt.appendChild(gate);
      felt.appendChild(el('div', 'dg-who', who(tb, v.turn) + ' 的龍門'));
    }
    if (v.last) {
      var l = v.last, lr = el('div', 'dg-last ' + l.out);
      lr.innerHTML = '<small>上一位：' + who(tb, l.s) + '</small><span class="dg-row">' + PK.mini(l.posts[0]) + (l.third ? PK.mini(l.third) : '<em>不射</em>') + PK.mini(l.posts[1]) + '</span><small>' + OUTTXT[l.out] + (l.delta ? '　' + (l.delta > 0 ? '+' : '') + l.delta + ' 🪙' : '') + '</small>';
      felt.appendChild(lr);
    }
    wrap.appendChild(felt);
    var me = el('div', 'pk-me' + (myTurn ? ' turn' : ''));
    var t = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; t.appendChild(dot); t.appendChild(el('span', 'n', tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我')); t.appendChild(el('span', 'pk-cnt', '🪙 ' + v.chips[seat])); me.appendChild(t);
    if (myTurn) {
      var mb = Math.max(0, Math.min(3, v.pot, v.chips[seat])); if (L.bet > mb) L.bet = mb;
      var row = el('div', 'pk-tools');
      for (var b = 0; b <= mb; b++) (function (b) { var bb = ctx.button('pk-btn' + (L.bet === b ? ' go' : ''), b ? '押 ' + b : '不射', function () { L.bet = b; ctx.snd('tap'); ctx.rerender(); }); bb.setAttribute('data-h', 'b' + b); row.appendChild(bb); })(b);
      me.appendChild(row);
      if (same && L.bet) { var gr = el('div', 'pk-tools'); [['lo', '猜比較小 ⬇'], ['hi', '猜比較大 ⬆']].forEach(function (x) { var gb = ctx.button('pk-btn' + (L.guess === x[0] ? ' go' : ''), x[1], function () { L.guess = x[0]; ctx.rerender(); }); gb.setAttribute('data-h', 'g:' + x[0]); gr.appendChild(gb); }); me.appendChild(gr); }
      var go = ctx.button('pk-btn go dg-shoot', L.bet ? '🏹 射！' : '這次不射', function () { L.sent = v.cnt; ctx.snd('move'); ctx.send('shoot', { b: L.bet, guess: L.guess, n: v.cnt }); ctx.rerender(); });
      if (same && L.bet && !L.guess) go.disabled = true;
      var gw = el('div', 'pk-tools'); gw.appendChild(go); me.appendChild(gw);
    }
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('dragon-gate', mod);
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人有 <b>10 個籌碼</b>，開始時每人放 1 個到<b>彩池</b>。</li><li>輪到你時會翻開兩張牌當「<b>龍門</b>」的門柱。</li><li>選要押多少（0～3 個，不能超過彩池），按「射！」翻第三張。</li><li>大家輪流，每人射 4 次後結束，<b>籌碼最多的人贏</b>。</li></ol>' },
      { h: '輸贏', html: '<ul><li><b>射進龍門</b>：第三張在兩根門柱中間 → 從彩池拿走押的數量。</li><li><b>射歪</b>：在門外 → 押的籌碼放進彩池。</li><li><b>撞柱</b>：和門柱一樣大 → 賠 2 倍！</li><li>兩根門柱一樣時，改成猜第三張「比較大」還是「比較小」。</li><li>A 最小（1），K 最大（13）。門很窄的時候可以選「不射」。</li></ul>' + cards(['3c', '9h', 'Js'], '3 和 J 中間：9 射進去了！') + cards(['5d', '5s', '8h'], '門柱一樣：猜「比較大」，8 > 5 贏') },
      { h: '計分方式', html: '<p>4 輪後籌碼最多的人獲勝（積分榜 +3 分），一樣多就平手。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「撲克牌」→「射龍門」，每桌 2～6 人。</li><li>每人輪流射 4 次，一局大約 5 分鐘。</li></ol>' },
      { h: '規則說明', html: '<p>本工具採用簡化的台灣玩法：每次最多押 3 個、撞柱賠 2 倍、門柱相同改猜大小。不使用真錢，籌碼每局重新發。</p><h4>教學重點</h4><ul><li>數的大小比較、數線上的「介於」。</li><li>機率：門柱 3 和 J 中間有幾種牌？門柱 7 和 8 呢？討論什麼時候該「不射」。</li></ul>' }
    ]
  };
})();
