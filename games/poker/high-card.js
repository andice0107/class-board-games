/* 撲克牌・比大小：2～6 人，每局 5 回合。每回合大家各抽一張，全部抽完一起翻開，最大的人得 1 分。
   大小：A > K > Q > J > 10 > … > 2；點數一樣比花色：黑桃 > 紅心 > 方塊 > 梅花 */
(function () {
  'use strict';
  var SEATC = PKUI.SEATC, ROUNDS = 5, ORD = '23456789TJQKA', SU = 'cdhs';
  var REASONS = { most: '5 回合裡贏最多次', tie: '贏的次數一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function val(c) { return ORD.indexOf(c[0]) * 4 + SU.indexOf(c[1]); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function endGame(g) {
    var a = alive(g), best = -1, bw = -1, tie = false;
    a.forEach(function (s) { if (g.wins[s] > bw) { bw = g.wins[s]; best = s; tie = false; } else if (g.wins[s] === bw) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'most' };
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5],
    reasons: REASONS,
    levelDesc: ['全憑運氣', '全憑運氣', '全憑運氣', '全憑運氣'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var g = { np: n, deck: PK.deck(0), round: 1, picks: [], wins: [], out: [], shown: null, cnt: 0, res: null };
      for (var s = 0; s < n; s++) { g.picks.push(null); g.wins.push(0); }
      return g;
    },
    turnSeat: function () { return -1; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, round: g.round, rounds: ROUNDS, picked: g.picks.map(function (c) { return !!c; }), mine: seat >= 0 ? g.picks[seat] : null, wins: g.wins, out: g.out, shown: g.shown, cnt: g.cnt,
        counts: g.picks.map(function (c, i) { return g.wins[i]; }), turn: -1 };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'draw' || g.picks[seat]) return false;
      g.picks[seat] = g.deck.pop(); g.cnt++;
      reveal(g);
      return true;
    },
    /* 大家同時抽牌：還沒抽的人就是「輪到他」 */
    acting: function (g) { var a = []; if (g.res) return a; for (var s = 0; s < g.np; s++) if (!g.picks[s] && g.out.indexOf(s) < 0) a.push(s); return a; },
    turnKey: function (g) { return g.round; },
    hintDesc: '比大小完全靠運氣，沒有策略可以選。提示只會用閃亮的框告訴你「點牌堆抽一張牌」，而且不會扣你的提示次數。',
    tipDesc: '你還沒抽牌時，提醒你點牌堆抽一張。',
    hint: function (g, seat) {
      if (g.res || g.picks[seat] || g.out.indexOf(seat) >= 0) return null;
      return { msg: '這個遊戲靠運氣：現在只要點亮黃框的「牌堆」抽一張牌就好。大家都抽完會一起翻牌，點數最大（A 最大，2 最小；一樣大比花色）的人贏這一回合。', hl: ['pile'], free: true };
    },
    nudge: function (g, seat) { return g.res || g.picks[seat] || g.out.indexOf(seat) >= 0 ? null : '這一回合還沒抽牌喔！點畫面上的「牌堆」抽一張，大家都抽完才會一起翻牌。'; },
    botTurn: function (g, seat) { if (g.res || g.picks[seat] || g.out.indexOf(seat) >= 0) return null; return { t: 'draw' }; },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + (g.shown ? g.shown.cards.map(function (c, i) { return c ? '<span class="' + (i === g.shown.w ? 'hc-win' : '') + '">' + PK.svg(c) + '</span>' : ''; }).join('') : '<em>第 ' + g.round + ' 回合</em>') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : '贏 ' + g.wins[s] + ' 次' + (g.picks[s] ? '・已抽' : '')) + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '第 ' + Math.min(g.round, ROUNDS) + ' / ' + ROUNDS + ' 回合', c: '' }; }
  };
  function reveal(g) {
    var a = alive(g); if (!a.length || a.some(function (s) { return !g.picks[s]; })) return;
    var w = a[0]; a.forEach(function (s) { if (val(g.picks[s]) > val(g.picks[w])) w = s; });
    g.wins[w]++; g.shown = { round: g.round, cards: g.picks.slice(), w: w };
    g.picks = g.picks.map(function () { return null; });
    if (g.deck.length < g.np) g.deck = PK.deck(0);
    if (g.round >= ROUNDS) endGame(g); else g.round++;
  }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.picks[seat] = null;
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    reveal(g);
  }

  /* ---------- 學生端 ---------- */
  var L = { round: -1, shownKey: '', pending: false };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.shownKey = ''; L.pending = false; }
    if (v.mine || L.vr !== v.round) L.pending = false; // 自己最後一個抽時，牌會立刻翻開、進入下一回合
    L.vr = v.round;
    var key = v.shown ? v.shown.round + ':' + v.shown.w : '';
    if (key && key !== L.shownKey) {
      if (L.shownKey !== '' || prev) { if (v.shown.w === tb.seat) { fx.toast('這回合你最大！+1'); fx.snd('win'); } else { fx.toast(short(tb, v.shown.w) + ' 最大'); fx.snd('cap'); } }
      L.shownKey = key;
    }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '一共 5 回合');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0;
    var wrap = el('div', 'pk-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (!v.mine && !L.pending) { st.textContent = '第 ' + v.round + ' / ' + v.rounds + ' 回合：點牌堆抽一張！'; st.className = 'pk-status me'; }
    else st.textContent = '等其他人抽牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.wins, out: v.out, turn: -1 }, seat, function (i) { return !tb.res && v.picked[i] ? '已抽' : ''; }, short));
    [].forEach.call(wrap.querySelectorAll('.pk-cnt'), function (e) { e.textContent = e.textContent.replace(' 張', ' 勝'); });
    [].forEach.call(wrap.querySelectorAll('.pk-fan'), function (e) { e.remove(); });
    var felt = el('div', 'pk-felt hc-felt');
    if (v.shown) {
      var row = el('div', 'hc-row');
      v.shown.cards.forEach(function (c, i) {
        if (!c) return;
        var it = el('div', 'hc-it' + (i === v.shown.w ? ' win' : '')); var s = el('span'); s.innerHTML = PK.svg(c); it.appendChild(s);
        it.appendChild(el('small', '', i === seat ? '你' : short(tb, i))); row.appendChild(it);
      });
      felt.appendChild(row);
      felt.appendChild(el('div', 'pk-who', '第 ' + v.shown.round + ' 回合：' + (v.shown.w === seat ? '你' : short(tb, v.shown.w)) + ' 最大 👑'));
    } else felt.appendChild(el('div', 'pk-empty', '比大小'));
    wrap.appendChild(felt);
    var mine = el('div', 'pk-me' + (!v.mine && !tb.res && !out ? ' turn' : ''));
    var t = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; t.appendChild(dot); t.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我'))); t.appendChild(el('span', 'pk-cnt', '贏 ' + v.wins[seat] + ' 次')); mine.appendChild(t);
    var area = el('div', 'hc-area');
    var pile = el('button', 'hc-pile' + (!v.mine && !L.pending && !tb.res && !out ? ' can' : '')); pile.type = 'button'; pile.setAttribute('data-h', 'pile'); pile.innerHTML = PK.svg(null, { back: true }) + '<span>抽牌</span>';
    pile.addEventListener('click', function () { if (v.mine || L.pending || tb.res || out) return; L.pending = true; ctx.snd('tap'); ctx.send('draw', {}); ctx.rerender(); });
    area.appendChild(pile);
    var my = el('div', 'hc-mine'); my.innerHTML = v.mine || L.pending ? PK.svg(null, { back: true }) : ''; if (v.mine) my.appendChild(el('small', '', '已抽，等大家一起翻牌'));
    area.appendChild(my);
    mine.appendChild(area);
    wrap.appendChild(mine);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      tools.appendChild(ctx.button('pk-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  BG.register('high-card', mod);
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每局有 <b>5 回合</b>。</li><li>每回合點<b>牌堆</b>抽一張牌，牌會先蓋著。</li><li>大家都抽完後一起翻開，<b>最大的人贏這回合</b>。</li><li>5 回合結束，贏最多次的人獲勝；一樣多就平手。</li></ol>' },
      { h: '大小順序', html: '<p>點數：<b>A &gt; K &gt; Q &gt; J &gt; 10 &gt; … &gt; 2</b></p><p>點數一樣比花色：<b>黑桃 ♠ &gt; 紅心 ♥ &gt; 方塊 ♦ &gt; 梅花 ♣</b></p>' + cards(['As', 'Kh', '7d', '2c'], '由左到右：大 → 小') },
      { h: '計分方式', html: '<p>贏的人積分榜 +3 分，平手 +1 分。和電腦玩的另外記錄。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「撲克牌」→「比大小」開房間。</li><li>每桌 2～6 人。大家抽完會同時翻牌，大螢幕會顯示這回合的牌和最大的人。</li></ol>' },
      { h: '教學重點', html: '<ul><li>最簡單的撲克牌遊戲，適合剛認識撲克牌的學生：認點數、認花色、比大小。</li><li>可以延伸成數學活動：猜猜看下一張比 7 大的機會有多少？</li></ul>' }
    ]
  };
})();
