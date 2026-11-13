/* 撲克牌・撿紅點（台灣玩法）：2～4 人，桌上翻開 4 張。
   輪到你：打一張手牌，和桌上的牌湊成 10 點就把兩張都撿回來（10、J、Q、K 要配一樣的點數）；湊不到就把牌留在桌上。
   接著自動翻牌堆最上面一張，能湊就撿，不能就留在桌上。
   計分：紅色 A＝20、紅色 2～8＝牌面點數、紅色 9～K＝10，黑桃 A 也算 20。牌打完時分數最高的人贏。 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC, HAND = { 2: 12, 3: 8, 4: 6 };
  var REASONS = { most: '撿到的分數最高', tie: '分數一樣，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function num(c) { return 'A23456789TJQK'.indexOf(c[0]) + 1; }
  function match(a, b) { var x = num(a), y = num(b); if (x >= 10 || y >= 10) return x === y; return x + y === 10; }
  function pts(c) { if (c === 'As') return 20; if (!PK.red(c)) return 0; var n = num(c); return n === 1 ? 20 : n >= 9 ? 10 : n; }
  function sum(cs) { return cs.reduce(function (a, c) { return a + pts(c); }, 0); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nextSeat(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function bestTake(table, c) { var best = null; table.forEach(function (t) { if (match(c, t) && (!best || pts(t) > pts(best))) best = t; }); return best; }
  function finish(g) {
    var a = alive(g), best = -1, bv = -1, tie = false;
    a.forEach(function (s) { var v = sum(g.won[s]); if (v > bv) { bv = v; best = s; tie = false; } else if (v === bv) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'most', note: '撿到 ' + bv + ' 分' };
  }
  function afterPlay(g, s) {
    // 翻牌堆
    if (g.deck.length) {
      var f = g.deck.pop(), t = bestTake(g.table, f);
      if (t) { g.table.splice(g.table.indexOf(t), 1); g.won[s].push(f, t); g.flip = { c: f, take: t }; }
      else { g.table.push(f); g.flip = { c: f, take: null }; }
    } else g.flip = null;
    g.cnt++;
    if (alive(g).every(function (x) { return !g.hands[x].length; })) { finish(g); return; }
    var n = nextSeat(g, s), guard = 0;
    while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n);
    g.turn = n;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3], botDelay: 900,
    reasons: REASONS,
    levelDesc: ['隨便出牌', '有得撿就撿', '先撿分數高的', '會避免留下好撿的紅牌給下一家'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(4, n || 4));
      var d = PK.deck(0), g = { np: n, deck: d, hands: [], won: [], table: [], out: [], turn: 0, last: null, flip: null, cnt: 0, res: null };
      for (var s = 0; s < n; s++) { g.hands.push(d.splice(0, HAND[n])); g.won.push([]); }
      g.table = d.splice(0, 4);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, turn: g.turn, table: g.table, hand: seat >= 0 ? g.hands[seat] : null, counts: g.hands.map(function (h) { return h.length; }),
        won: g.won, scores: g.won.map(sum), left: g.deck.length, last: g.last, flip: g.flip, out: g.out, cnt: g.cnt };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], c = d.c; if (h.indexOf(c) < 0) return false;
      if (d.take) { if (g.table.indexOf(d.take) < 0 || !match(c, d.take)) return false; }
      h.splice(h.indexOf(c), 1);
      if (d.take) { g.table.splice(g.table.indexOf(d.take), 1); g.won[seat].push(c, d.take); g.last = { s: seat, c: c, take: d.take }; }
      else { g.table.push(c); g.last = { s: seat, c: c, take: null }; }
      afterPlay(g, seat);
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var h = g.hands[seat], opts = [];
      h.forEach(function (c) { g.table.forEach(function (t) { if (match(c, t)) opts.push({ c: c, take: t, v: pts(c) + pts(t) }); }); });
      if (lv <= 1 && Math.random() < .5) { var c0 = h[Math.floor(Math.random() * h.length)], t0 = bestTake(g.table, c0); return { t: 'play', c: c0, take: t0 && Math.random() < .6 ? t0 : null, n: g.cnt }; }
      if (opts.length) {
        if (lv >= 3) opts.sort(function (a, b) { return b.v - a.v; }); else opts.sort(function () { return Math.random() - .5; });
        return { t: 'play', c: opts[0].c, take: opts[0].take, n: g.cnt };
      }
      // 沒得撿：丟一張最不值錢、而且不容易被下一家撿走的牌
      var best = null;
      h.forEach(function (c) {
        var risk = lv >= 4 ? (pts(c) + (g.table.some(function (t) { return match(c, t); }) ? 0 : 0)) * 2 + g.table.filter(function (t) { return 'A23456789'.indexOf(c[0]) >= 0 && num(t) + num(c) === 10; }).length : pts(c);
        if (!best || risk < best.r) best = { c: c, r: risk };
      });
      return { t: 'play', c: best.c, take: null, n: g.cnt };
    },
    hintDesc: '會亮出「手牌裡可以和桌上湊成 10 點」的牌，以及桌上對應的牌；如果沒有牌可以撿，會亮出最適合丟出去的牌（分數低、不會送分給對手）。',
    tipDesc: '你的手牌都湊不到 10 點時，提醒你丟一張牌到桌上；其他時候提醒你怎麼撿牌。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var h = g.hands[seat], hs = {}, ts = {}, best = 0;
      h.forEach(function (c) { g.table.forEach(function (t) { if (match(c, t)) { hs[c] = 1; ts[t] = 1; best = Math.max(best, pts(c) + pts(t)); } }); });
      var hl = Object.keys(hs).concat(Object.keys(ts));
      if (hl.length) return { msg: '亮黃框的手牌可以和桌上亮黃框的牌湊成 10 點（A+9、2+8、3+7、4+6、5+5；10、J、Q、K 要配一樣的）。' + (best >= 20 ? '其中有機會撿到 20 分的 A，別錯過！' : best >= 10 ? '其中有 10 分以上的紅牌可以撿。' : ''), hl: hl };
      var low = h.slice().sort(function (a, b) { return pts(a) - pts(b); }), m = pts(low[0]);
      return { msg: '你的手牌都湊不到 10 點，這一輪要把一張牌丟到桌上。亮黃框的是分數最低的牌，丟掉最不吃虧。', hl: low.filter(function (c) { return pts(c) === m; }).slice(0, 3) };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var h = g.hands[seat], any = h.some(function (c) { return g.table.some(function (t) { return match(c, t); }); });
      return any ? '輪到你了：先點一張變亮的手牌，桌上能湊成 10 點的牌會發亮，點那張就能撿回來。' : '你的手牌都湊不到 10 點喔！請選一張牌，按「丟到桌上」（建議丟分數低的黑色牌）。';
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + g.table.map(function (c) { return '<span>' + PK.mini(c) + '</span>'; }).join('') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : sum(g.won[s]) + ' 分') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '牌堆剩 ' + g.deck.length + ' 張', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.table = g.table.concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) { var n = nextSeat(g, seat); g.turn = n; }
    if (a.every(function (x) { return !g.hands[x].length; })) finish(g);
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: null, round: -1, sent: -1, key: '' };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.sent = -1; L.key = ''; }
    var key = v.cnt + ':' + (v.last ? v.last.c : '');
    if (prev && key !== L.key && v.last) { fx.snd(v.last.take ? 'cap' : 'move'); if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400); }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '湊 10 點把紅色的牌撿回來');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    if (L.sel && v.hand.indexOf(L.sel) < 0) L.sel = null;
    var wrap = el('div', 'pk-table pr-table');
    var st = el('div', 'pk-status');
    var can = L.sel ? v.table.filter(function (t) { return match(L.sel, t); }) : [];
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = !L.sel ? '輪到你：先點一張手牌' : can.length ? '點桌上發亮的牌把它撿回來' : '這張湊不到 10 點，按「丟到桌上」'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function (i) { return '⭐ ' + v.scores[i] + ' 分'; }, short));
    var felt = el('div', 'pk-felt pr-felt');
    var info = el('div', 'pr-info');
    var lastTxt = v.last ? who(tb, v.last.s) + ' 打 ' + PK.name(v.last.c) + (v.last.take ? '，撿走 ' + PK.name(v.last.take) : '，留在桌上') : '';
    var flipTxt = v.flip ? '翻牌 ' + PK.name(v.flip.c) + (v.flip.take ? '，撿走 ' + PK.name(v.flip.take) : '') : '';
    info.innerHTML = '<span class="pr-deck">' + PK.svg(null, { back: true }) + '<b>' + v.left + '</b></span><span class="pr-log">' + [lastTxt, flipTxt].filter(Boolean).join('<br>') + '</span>';
    felt.appendChild(info);
    var tbl = el('div', 'pr-board');
    v.table.forEach(function (c) {
      var b = el('button', 'pr-tc' + (can.indexOf(c) >= 0 && myTurn ? ' can' : '') + (v.flip && v.flip.c === c ? ' new' : '') + (v.last && v.last.c === c && !v.last.take ? ' new' : '')); b.type = 'button'; b.setAttribute('data-c', c); b.innerHTML = PK.svg(c);
      if (pts(c)) b.appendChild(el('small', 'pr-pt', pts(c)));
      b.addEventListener('click', function () { if (!myTurn || !L.sel || can.indexOf(c) < 0) return; send({ t: 'play', c: L.sel, take: c }); });
      tbl.appendChild(b);
    });
    if (!v.table.length) tbl.appendChild(el('div', 'pk-empty', '桌上沒有牌'));
    felt.appendChild(tbl);
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; L.sent = v.cnt; L.sel = null; ctx.snd(d.take ? 'cap' : 'move'); ctx.send('play', d); ctx.rerender(); }
    var me = PKUI.hand(v.hand.slice().sort(function (a, b) { return num(a) - num(b); }), { title: tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我', color: SEATC[seat], turn: myTurn, sel: L.sel ? [L.sel] : [], info: '⭐ ' + v.scores[seat] + ' 分',
      onTap: function (c) { if (!myTurn) return; L.sel = L.sel === c ? null : c; ctx.snd('tap'); ctx.rerender(); },
      dim: function (c) { return myTurn && !v.table.some(function (t) { return match(c, t); }); } });
    wrap.appendChild(me);
    if (v.won[seat].length) { var wn = el('div', 'pr-won'); wn.appendChild(el('span', '', '我撿到的：')); v.won[seat].filter(pts).forEach(function (c) { var s = el('span', 'pr-wc'); s.innerHTML = PK.mini(c); wn.appendChild(s); }); wrap.appendChild(wn); }
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && L.sel && !can.length) tools.appendChild(ctx.button('pk-btn go', '丟到桌上', function () { send({ t: 'play', c: L.sel, take: null }); }));
      if (myTurn && L.sel && can.length) tools.appendChild(ctx.button('pk-btn', '不撿，丟到桌上', function () { send({ t: 'play', c: L.sel, take: null }); }));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  BG.register('pick-red', mod);
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人先拿手牌（4 人每人 6 張、3 人 8 張、2 人 12 張），桌上翻開 4 張。</li><li>輪到你時，<b>點一張手牌</b>，桌上可以和它湊成 <b>10 點</b>的牌會發亮，點那張就把兩張一起撿回來。</li><li>湊不到 10 點，就按「丟到桌上」。</li><li>接著系統會自動<b>翻牌堆</b>最上面一張：能湊 10 點就幫你撿，不能就留在桌上。</li><li>所有手牌都打完，遊戲結束。</li></ol>' },
      { h: '怎麼湊', html: '<ul><li>A＋9、2＋8、3＋7、4＋6、5＋5 都是 10 點。</li><li>10、J、Q、K 不能加，要找<b>一樣的</b>：10 配 10、J 配 J、Q 配 Q、K 配 K。</li></ul>' + cards(['3h', '7c'], '3＋7＝10，撿起來！') + cards(['Qd', 'Qs'], 'Q 要配 Q') },
      { h: '計分方式', html: '<table class="g-tbl"><tr><th>撿到的牌</th><th>分數</th></tr><tr><td>紅色 A（♥A、♦A）</td><td>20</td></tr><tr><td>黑桃 A（♠A）</td><td>20</td></tr><tr><td>紅色 9、10、J、Q、K</td><td>10</td></tr><tr><td>紅色 2～8</td><td>牌上的點數</td></tr><tr><td>其他黑色的牌</td><td>0</td></tr></table><p>分數最高的人獲勝（積分榜 +3 分）。和電腦玩的不列入總分。</p>' + cards(['Ah', 'Kd', '6h'], '20＋10＋6＝36 分') }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「撲克牌」→「撿紅點」，每桌 2～4 人。</li><li>學生輪流出牌，翻牌由系統自動處理。</li><li>老師端每桌顯示桌面上的牌和每人分數。</li></ol>' },
      { h: '規則說明', html: '<p>撿紅點各地玩法略有不同，本工具採用台灣常見規則：黑桃 A 算 20 分、紅色 9～K 算 10 分、翻牌能撿時自動撿分數最高的那張。如果班上習慣不同，請告訴開發者調整。</p><h4>教學重點</h4><ul><li>10 的合成與分解（湊十）。</li><li>加總分數：練習兩位數加法。</li></ul>' }
    ]
  };
})();
