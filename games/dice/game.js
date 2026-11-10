/* 骰子吹牛（台灣常見玩法）
   每人 5 顆骰子，只能看自己的。輪流喊「全桌至少有 N 個 F」，下一家要喊更大（個數更多，或個數一樣點數更大；1 點最大）。
   不相信上一家就「開」：全桌實際數量 ≥ 喊的數量 → 開的人輸；不到 → 喊的人輸。
   1 點萬用；有人直接喊 1（喊齋）後，這一局 1 不再萬用。第一次最少喊「人數＋1」個。5 顆全部不一樣（散骰）可以重搖。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var REASONS = { caught: '吹牛被抓到了！', wrong: '開錯了，真的有那麼多！', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function roll() { var a = []; for (var i = 0; i < 5; i++) a.push(1 + Math.floor(Math.random() * 6)); return a.sort(); }
  function scatter(d) { return d.slice().sort().every(function (x, i, a) { return !i || a[i - 1] !== x; }); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nxt(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function rank(f) { return f === 1 ? 7 : f; }               // 同個數時：2 < 3 < 4 < 5 < 6 < 1
  function minN(g) { return alive(g).length + 1; }
  function maxN(g) { return alive(g).length * 5; }
  function higher(g, n, f) { var c = g.call; if (!c) return n >= minN(g) && n <= maxN(g); return n <= maxN(g) && (n > c.n || (n === c.n && rank(f) > rank(c.f))); }
  function count(g, f) { var k = 0; g.dice.forEach(function (d, s) { if (g.out.indexOf(s) >= 0) return; d.forEach(function (x) { if (x === f || (!g.zhai && f !== 1 && x === 1)) k++; }); }); return k; }
  function lowestCall(g) {   // 下一個可以喊的最小喊法
    var c = g.call; if (!c) return { n: minN(g), f: 2 };
    for (var f = 2; f <= 7; f++) { var ff = f === 7 ? 1 : f; if (rank(ff) > rank(c.f)) return { n: c.n, f: ff }; }
    return c.n + 1 <= maxN(g) ? { n: c.n + 1, f: 2 } : null;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1500, ver: 1,
    reasons: REASONS,
    levelDesc: ['亂喊亂開', '偶爾會想一下', '會算機率', '很會算，也很會唬人'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var g = { np: n, dice: [], rolls: [], call: null, zhai: false, hist: [], turn: Math.floor(Math.random() * n), out: [], cnt: 0, res: null, reveal: null };
      for (var s = 0; s < n; s++) { g.dice.push(roll()); g.rolls.push(0); }
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, turn: g.turn, call: g.call, zhai: g.zhai, hist: g.hist, out: g.out, cnt: g.cnt, total: alive(g).length * 5, min: minN(g), max: maxN(g),
        mine: seat >= 0 ? g.dice[seat] : null, canScatter: seat >= 0 && !g.call && scatter(g.dice[seat]), rolls: g.rolls,
        all: g.res ? g.dice : null, reveal: g.reveal };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t === 'scatter') {   // 散骰重搖：還沒有人喊之前才可以
        if (g.call || !scatter(g.dice[seat])) return false;
        g.dice[seat] = roll(); g.rolls[seat]++; g.cnt++; return true;
      }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      if (d.t === 'call') {
        var n = d.c | 0, f = d.f | 0;
        if (f < 1 || f > 6 || !higher(g, n, f)) { notify(seat, '要喊得比上一家大喔'); return false; }
        g.call = { s: seat, n: n, f: f }; if (f === 1 && !g.zhai) { g.zhai = true; g.call.zhai = true; }
        g.hist.push(g.call); g.turn = nxt(g, seat); g.cnt++; return true;
      }
      if (d.t === 'open') {
        if (!g.call) return false;
        var c = g.call, k = count(g, c.f), lose = k >= c.n ? seat : c.s;
        g.reveal = { by: seat, s: c.s, n: c.n, f: c.f, k: k, zhai: g.zhai };
        g.res = { w: -1, l: lose, why: lose === seat ? 'wrong' : 'caught' };
        g.cnt++; return true;
      }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res) return null;
      if (!g.call && scatter(g.dice[seat]) && g.rolls[seat] < 3) return { t: 'scatter' };
      if (g.turn !== seat) return null;
      var n0 = g.cnt, mine = g.dice[seat], others = (alive(g).length - 1) * 5;
      function own(f, zhai) { return mine.filter(function (x) { return x === f || (!zhai && f !== 1 && x === 1); }).length; }
      function expect(f, zhai) { return own(f, zhai) + others * ((!zhai && f !== 1) ? 1 / 3 : 1 / 6); }
      var c = g.call, low = lowestCall(g);
      if (!low) return { t: 'open', n: n0 };
      if (lv <= 1) {
        if (c && Math.random() < .35) return { t: 'open', n: n0 };
        var f1 = 1 + Math.floor(Math.random() * 6), n1 = low.n; if (!higher(g, n1, f1)) n1++;
        if (!higher(g, n1, f1)) return { t: 'call', c: low.n, f: low.f, n: n0 };
        return { t: 'call', c: n1, f: f1, n: n0 };
      }
      if (c) {
        var e = expect(c.f, g.zhai), margin = lv === 2 ? 1.6 : lv === 3 ? .9 : .6;
        if (c.n > e + margin + (lv === 2 ? Math.random() * 1.5 - .75 : 0)) return { t: 'open', n: n0 };
      }
      // 找一個最有把握的喊法
      var best = null;
      for (var f = 1; f <= 6; f++) {
        var z = g.zhai || f === 1;
        var ex = expect(f, z), n = c ? c.n : minN(g);
        if (!higher(g, n, f)) n++;
        if (!higher(g, n, f)) continue;
        var risk = n - ex + (f === 1 && !g.zhai ? .8 : 0);
        if (lv >= 4 && Math.random() < .25) risk -= .7;      // 偶爾唬人：喊自己沒有的點數
        if (!best || risk < best.r) best = { n: n, f: f, r: risk };
      }
      if (!best) return { t: 'open', n: n0 };
      if (c && best.r > (lv === 2 ? 1.8 : 1.2) && best.r > c.n - expect(c.f, g.zhai)) return { t: 'open', n: n0 };
      return { t: 'call', c: best.n, f: best.f, n: n0 };
    },
    hostView: function (g) {
      var c = g.call, h = '<div class="dc-host">';
      h += c ? '<div class="dc-hcall"><i style="background:' + SEATC[c.s] + '"></i>喊：<b>' + c.n + ' 個 ' + c.f + '</b>' + (g.zhai ? '<small>齋</small>' : '') + '</div>' : '<div class="dc-hcall">還沒有人喊</div>';
      if (g.res && g.reveal) h += '<div class="dc-hres">實際有 <b>' + g.reveal.k + '</b> 個</div>';
      return h + '</div>';
    },
    hostStatus: function (g) { var c = g.call; return { t: c ? '目前喊到 ' + c.n + ' 個 ' + c.f + (g.zhai ? '（齋）' : '') + '・共喊了 ' + g.hist.length + ' 次' : '剛搖好骰子', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.call && g.call.n > maxN(g)) g.call.n = maxN(g);
    if (g.turn === seat) g.turn = nxt(g, seat);
  }
  window.DC = { count: count, higher: higher, lowestCall: lowestCall };

  /* ---------- 學生端 ---------- */
  var L = { n: 0, f: 0, sent: -1, round: -1, key: -1, roll: 0 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function die(v, cls) {
    var d = el('span', 'dc-die' + (cls ? ' ' + cls : '') + (v === 1 ? ' one' : ''));
    PIPS[v].forEach(function (i) { var p = el('b'); p.style.left = (22 + (i % 3) * 28) + '%'; p.style.top = (22 + Math.floor(i / 3) * 28) + '%'; d.appendChild(p); });
    return d;
  }
  function callTxt(c) { return c.n + ' 個 ' + c.f; }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sent = -1; L.key = -1; L.n = 0; L.f = 0; L.roll = v.rolls ? v.rolls[tb.seat] : 0; }
    if (prev && v.cnt !== L.key) {
      var c = v.call, last = v.hist[v.hist.length - 1];
      if (tb.res && v.reveal) fx.snd(tb.res.l === tb.seat ? 'lose' : 'win');
      else if (last && (!prev.view || prev.view.hist.length !== v.hist.length)) { fx.snd('move'); if (last.s !== tb.seat) fx.toast(who(tb, last.s) + ' 喊：全桌至少 ' + callTxt(last) + (last.zhai ? '（喊齋！1 不能再當萬用）' : '')); }
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 450);
    }
    if (v.rolls && v.rolls[tb.seat] !== L.roll) { L.roll = v.rolls[tb.seat]; fx.snd('pop'); }
    L.key = v.cnt;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '看看自己的骰子，猜猜全桌有幾個 🎲');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var g = { np: v.np, out: v.out, call: v.call, zhai: v.zhai };
    var wrap = el('div', 'dc-table');
    // 順序
    var ord = el('div', 'dc-order');
    for (var k = 0; k < v.np; k++) {
      var s = (v.turn + k) % v.np; if (tb.res) s = k;
      if (k) ord.appendChild(el('span', 'ar', '➜'));
      var w = el('span', 'who' + (s === v.turn && !tb.res ? ' now' : '') + (v.out.indexOf(s) >= 0 ? ' out' : '') + (s === seat ? ' me' : '')), dd = el('i'); dd.style.background = SEATC[s];
      w.appendChild(dd); w.appendChild(document.createTextNode(who(tb, s))); ord.appendChild(w);
    }
    wrap.appendChild(ord);
    var st = el('div', 'dc-status');
    if (tb.res) {
      var r = v.reveal;
      st.textContent = r ? (who(tb, r.by) + ' 開 ' + who(tb, r.s) + ' 的「' + r.n + ' 個 ' + r.f + '」→ 全桌實際有 ' + r.k + ' 個，' + (r.k >= r.n ? '真的有！開的人輸' : '不夠！喊的人吹牛') ) : '這局結束了';
      st.className = 'dc-status end';
    } else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.className = 'dc-status me'; st.textContent = v.call ? '輪到你了！要喊更大，還是「開」？' : '輪到你先喊！最少喊 ' + v.min + ' 個'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + ' 想想看…';
    wrap.appendChild(st);
    // 目前的喊數
    var cur = el('div', 'dc-cur');
    if (v.call) {
      var cl = el('div', 'dc-call'); cl.appendChild(el('small', '', who(tb, v.call.s) + ' 喊：全桌至少'));
      var big = el('div', 'dc-big'); big.appendChild(el('b', '', v.call.n)); big.appendChild(el('span', '', '個')); big.appendChild(die(v.call.f, 'mid')); cl.appendChild(big);
      cur.appendChild(cl);
    } else cur.appendChild(el('div', 'dc-call none', '還沒有人喊'));
    var info = el('div', 'dc-info');
    info.appendChild(el('span', '', '🎲 全桌共 ' + v.total + ' 顆骰子'));
    info.appendChild(el('span', v.zhai ? 'zhai' : 'wild', v.zhai ? '🚫 已喊齋：1 不能當萬用' : '⭐ 1 點萬用（可以當任何點數）'));
    cur.appendChild(info);
    wrap.appendChild(cur);
    // 揭曉：所有人的骰子
    if (tb.res && v.all) {
      var rv = el('div', 'dc-reveal'), f = v.reveal ? v.reveal.f : 0, z = v.reveal ? v.reveal.zhai : false;
      v.all.forEach(function (ds, s) {
        var row = el('div', 'dc-rrow' + (tb.res.l === s ? ' lose' : '')), nm = el('span', 'nm'), d0 = el('i'); d0.style.background = SEATC[s]; nm.appendChild(d0); nm.appendChild(document.createTextNode(who(tb, s))); row.appendChild(nm);
        var dr = el('span', 'ds'); ds.forEach(function (x) { dr.appendChild(die(x, 'sm' + (f && (x === f || (!z && f !== 1 && x === 1)) ? ' hit' : ' dim'))); }); row.appendChild(dr);
        rv.appendChild(row);
      });
      wrap.appendChild(rv);
    }
    // 我的骰子
    if (v.mine && !tb.res) {
      var me = el('div', 'dc-me' + (myTurn ? ' turn' : ''));
      me.appendChild(el('div', 'dc-lbl', '🙈 我的骰子（只有你看得到）'));
      var row = el('div', 'dc-mine'); v.mine.forEach(function (x) { row.appendChild(die(x, 'big')); }); me.appendChild(row);
      if (v.canScatter && !out) me.appendChild(ctx.button('dc-btn sc', '🎲 散骰！5 顆都不一樣，可以重搖', function () { ctx.send('scatter', {}); ctx.snd('tap'); }));
      wrap.appendChild(me);
    }
    // 喊數面板
    if (myTurn) {
      var low = DC.lowestCall(g);
      var pad = el('div', 'dc-pad');
      if (low) {
        if (!L.n || !DC.higher(g, L.n, L.f || low.f)) { L.n = low.n; L.f = low.f; }
        var nrow = el('div', 'dc-nrow');
        nrow.appendChild(el('span', 'lbl', '全桌至少'));
        nrow.appendChild(ctx.button('dc-step', '−', function () { if (L.n > (v.call ? v.call.n : v.min)) { L.n--; fixF(); ctx.rerender(); } }));
        nrow.appendChild(el('b', 'dc-n', L.n));
        nrow.appendChild(ctx.button('dc-step', '＋', function () { if (L.n < v.max) { L.n++; fixF(); ctx.rerender(); } }));
        nrow.appendChild(el('span', 'lbl', '個'));
        pad.appendChild(nrow);
        var frow = el('div', 'dc-frow');
        [2, 3, 4, 5, 6, 1].forEach(function (f) {
          var ok = DC.higher(g, L.n, f), b = el('button', 'dc-fb' + (L.f === f ? ' on' : '')); b.type = 'button'; b.disabled = !ok;
          b.appendChild(die(f, 'mid'));
          b.addEventListener('click', function () { L.f = f; ctx.snd('tap'); ctx.rerender(); });
          frow.appendChild(b);
        });
        pad.appendChild(frow);
        if (L.f === 1 && !v.zhai) pad.appendChild(el('div', 'dc-warn', '⚠️ 喊 1 就是「喊齋」：這一局 1 點不再萬用'));
      }
      var act = el('div', 'dc-acts');
      if (low && DC.higher(g, L.n, L.f)) act.appendChild(ctx.button('dc-btn go', '📣 喊 ' + L.n + ' 個 ' + L.f, function () { L.sent = v.cnt; ctx.send('call', { c: L.n, f: L.f, n: v.cnt }); ctx.snd('move'); ctx.rerender(); }));
      if (v.call) act.appendChild(ctx.button('dc-btn open', '🫳 開！', function () { if (!confirm('確定要開 ' + who(tb, v.call.s) + ' 的「' + callTxt(v.call) + '」嗎？')) return; L.sent = v.cnt; ctx.send('open', { n: v.cnt }); ctx.rerender(); }));
      pad.appendChild(act);
      wrap.appendChild(pad);
    }
    function fixF() { if (!DC.higher(g, L.n, L.f)) { for (var f = 2; f <= 7; f++) { var ff = f === 7 ? 1 : f; if (DC.higher(g, L.n, ff)) { L.f = ff; return; } } } }
    // 這一局的喊數紀錄
    if (v.hist.length) {
      var hs = el('div', 'dc-hist'); hs.appendChild(el('b', '', '這一局喊過的（最新在上面）'));
      v.hist.slice().reverse().forEach(function (c, i) {
        var r = el('div', 'dc-h' + (i === 0 ? ' new' : '')), d = el('i'); d.style.background = SEATC[c.s]; r.appendChild(d);
        r.appendChild(el('span', 'n', who(tb, c.s)));
        r.appendChild(el('span', 't', '至少 ' + c.n + ' 個'));
        r.appendChild(die(c.f, 'xs'));
        if (c.zhai) r.appendChild(el('em', '', '喊齋'));
        hs.appendChild(r);
      });
      wrap.appendChild(hs);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'dc-tools');
      tools.appendChild(ctx.button('dc-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('dc-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每個人有 <b>5 顆骰子</b>，搖完只看得到自己的。</li><li>輪流喊「<b>全桌至少有幾個幾</b>」，算的是<b>所有人的骰子加起來</b>。例如 4 個人共 20 顆骰子，喊「5 個 6」就是說這 20 顆裡面至少有 5 顆是 6。</li><li>第一個人最少要喊「人數＋1」個（4 個人最少喊 5 個）。</li><li>下一個人要喊<b>更大</b>：個數更多（5 個 6 → 6 個 3），或個數一樣但點數更大（5 個 3 → 5 個 4）。點數大小：2 &lt; 3 &lt; 4 &lt; 5 &lt; 6 &lt; <b>1</b>。</li><li>不相信<b>上一家</b>就按「<b>開</b>」，大家的骰子全部打開來數。</li></ol>' },
      { h: '開了以後誰輸', html: '<ul><li>全桌實際數量 <b>≥</b> 喊的數量（真的有那麼多）→ <b>開的人輸</b>。</li><li>全桌實際數量 <b>＜</b> 喊的數量（吹牛了）→ <b>喊的人輸</b>。</li><li>喊的是「至少」，不用剛好。喊 5 個 6，實際有 7 個也是喊的人贏。</li></ul>' },
      { h: '特別規則', html: '<ul><li><b>⭐ 1 點萬用</b>：數的時候，1 點可以算成任何點數。</li><li><b>🚫 喊齋</b>：有人直接喊「幾個 1」，這一局 1 點就<b>不再萬用</b>。</li><li><b>🎲 散骰</b>：搖出來 5 顆<b>全部不一樣</b>，在還沒有人喊之前可以按「散骰」重搖。</li></ul><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>💪 沒輸的人</td><td>3 分</td></tr><tr><td>😵 輸的人</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' },
      { h: '小技巧', html: '<ul><li>先數自己有幾個（記得加上 1 點），再猜別人：每個人平均大約每 3 顆會有 1 顆是你要的點數（含萬用 1）。</li><li>喊太大很容易被開；不確定時，喊自己最多的點數。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「益智」→「骰子吹牛」，每桌 2～6 人（3～5 人最好玩）。一局大約 2～3 分鐘，一開就結束，可以按「再來一局」。</li><li>老師端每一桌只顯示目前喊到多少，<b>不會顯示任何人的骰子</b>，大螢幕被學生看到也沒關係。</li><li>規則採台灣常見玩法：1 點萬用、喊齋、最少喊人數＋1、散骰可重搖；沒有劈、反劈、搶開。</li></ol>' },
      { h: '教學重點', html: '<ul><li>練習<b>數數與估算</b>：從自己的骰子推估全桌的數量（期望值概念）。</li><li>練習比較大小與規則判斷（個數優先、再比點數）。</li><li>可以討論「誠實」與「策略」的差別，以及輸了怎麼調整心情。</li></ul>' },
      { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦怎麼玩</th></tr><tr><td>🐣 入門</td><td>亂喊亂開</td></tr><tr><td>🙂 簡單</td><td>會看自己的骰子，但判斷常常出錯</td></tr><tr><td>🤔 普通</td><td>會估算全桌數量再決定</td></tr><tr><td>🔥 困難</td><td>估算很準，偶爾還會唬人</td></tr></table>' }
    ]
  };
  BG.register('dice-bluff', mod);
})();
