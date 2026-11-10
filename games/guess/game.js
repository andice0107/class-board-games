/* 終極密碼：系統隨機出一個 0～100 的祕密數字（蓋著）。
   大家輪流猜一個數字（送出前要再確認一次），系統自動告訴大家密碼在哪兩個數字之間。
   猜中密碼的人「爆炸」（輸）——老師也可以改成「猜中的人贏」。
   老師端每一桌都可以按 👁 偷看密碼，再按一下蓋起來。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var MAX = 100;
  var REASONS = { boom: '猜中密碼，爆炸了！', hit: '猜中了密碼', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nxt(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1400, ver: 1,
    reasons: REASONS,
    opts: [{ k: 'mode', label: '猜中密碼的人：', list: [['lose', '💥 輸（預設）'], ['win', '🏆 贏']] }],
    levelDesc: ['隨便亂猜', '有時候會想一下', '會挑比較聰明的數字', '很會算，不容易輸'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      n = Math.max(2, Math.min(6, n || 4));
      return { np: n, mode: o && o.mode === 'win' ? 'win' : 'lose', secret: Math.floor(Math.random() * (MAX + 1)), lo: 0, hi: MAX, turn: Math.floor(Math.random() * n), hist: [], out: [], cnt: 0, res: null };
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g) {
      return { np: g.np, mode: g.mode, lo: g.lo, hi: g.hi, turn: g.turn, hist: g.hist.slice(-30), out: g.out, cnt: g.cnt, secret: g.res ? g.secret : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'guess' || g.turn !== seat || d.n !== g.cnt) return false;
      var x = +d.x;
      if (!(x === Math.floor(x)) || x < g.lo || x > g.hi) { notify(seat, '要猜 ' + g.lo + ' 到 ' + g.hi + ' 之間的數字喔'); return false; }
      var h = { s: seat, x: x };
      if (x === g.secret) {
        h.r = 'hit'; g.hist.push(h); g.lo = g.hi = x; g.cnt++;
        g.res = g.mode === 'win' ? { w: seat, why: 'hit' } : { w: -1, l: seat, why: 'boom' };
        return true;
      }
      if (x < g.secret) { g.lo = x + 1; h.r = 'up'; } else { g.hi = x - 1; h.r = 'down'; }
      h.a = g.lo; h.b = g.hi; g.hist.push(h); g.turn = nxt(g, seat); g.cnt++;
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var lo = g.lo, hi = g.hi, x, w = hi - lo;
      function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
      if (lv <= 1 || Math.random() < (lv === 2 ? .5 : .1)) x = rnd(lo, hi);
      else if (g.mode === 'win') x = Math.round((lo + hi) / 2) + (lv === 4 ? 0 : rnd(-2, 2));
      else {
        // 猜中會輸：每次被猜中的機會都一樣，聰明的作法是讓範圍縮小得剛剛好，下一個人比較危險
        x = w <= 2 ? rnd(lo, hi) : Math.round(lo + w * (Math.random() < .5 ? .3 : .7)) + rnd(-2, 2);
      }
      return { t: 'guess', x: Math.max(lo, Math.min(hi, x)), n: g.cnt };
    },
    hostView: function (g, T) {
      var id = T ? T.id : '', open = !!SHOW[id], done = !!g.res;
      return '<div class="ug-host"><div class="ug-host-range"><b>' + g.lo + '</b><span>～</span><b>' + g.hi + '</b></div>' +
        '<button type="button" class="ug-eye' + (open || done ? ' open' : '') + '" data-t="' + id + '" onclick="event.stopPropagation();UG.toggle(this)">' +
        '<span class="cover">🔒 密碼 <b>？？</b>　<small>👁 按一下偷看</small></span><span class="show">🔓 密碼 <b>' + g.secret + '</b>　<small>' + (done ? '' : '🙈 按一下蓋起來') + '</small></span></button>' +
        '<div class="ug-host-mode">' + (g.mode === 'win' ? '🏆 猜中的人贏' : '💥 猜中的人輸') + '</div></div>';
    },
    hostStatus: function (g) { var l = g.hist[g.hist.length - 1]; return { t: '範圍 ' + g.lo + '～' + g.hi + (l ? '・上一個猜 ' + l.x : ''), c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) g.turn = nxt(g, seat);
  }
  /* 老師端偷看密碼：只記在老師這台裝置上 */
  var SHOW = {};
  window.UG = { toggle: function (b) { var id = b.getAttribute('data-t'); SHOW[id] = !SHOW[id]; [].forEach.call(document.querySelectorAll('.ug-eye[data-t="' + id + '"]'), function (x) { x.classList.toggle('open', !!SHOW[id]); }); } };

  /* ---------- 學生端 ---------- */
  var L = { val: '', ask: false, sent: -1, round: -1, key: -1 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.val = ''; L.ask = false; L.sent = -1; L.key = -1; }
    if (prev && v.cnt !== L.key && v.hist.length) {
      var h = v.hist[v.hist.length - 1];
      if (h.r === 'hit') { fx.snd(v.mode === 'win' ? 'win' : 'lose'); }
      else { fx.snd('move'); if (h.s !== tb.seat) fx.toast(who(tb, h.s) + ' 猜 ' + h.x + '：密碼' + (h.r === 'up' ? '比較大' : '比較小') + '，現在是 ' + v.lo + '～' + v.hi); }
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    L.key = v.cnt;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + (v.mode === 'win' ? '猜中密碼的人贏！' : '小心別猜中密碼，猜中會爆炸！'));
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var wrap = el('div', 'ug-table');
    var bar = el('div', 'ug-bar');
    for (var i = 0; i < v.np; i++) {
      var chip = el('span', 'ug-chip' + (i === seat ? ' me' : '') + (i === v.turn && !tb.res ? ' turn' : '') + (v.out.indexOf(i) >= 0 ? ' out' : ''));
      var dot = el('i'); dot.style.background = SEATC[i]; chip.appendChild(dot); chip.appendChild(el('span', '', i === seat ? '我' : short(tb, i)));
      bar.appendChild(chip);
    }
    wrap.appendChild(bar);
    wrap.appendChild(el('div', 'ug-mode', v.mode === 'win' ? '🏆 這局：猜中密碼的人贏' : '💥 這局：猜中密碼的人輸'));
    var bomb = el('div', 'ug-bomb' + (tb.res && v.secret != null ? ' open' : ''));
    bomb.innerHTML = tb.res && v.secret != null ? '<small>密碼是</small><b>' + v.secret + '</b>' : '<small>密碼在</small><div class="ug-range"><b>' + v.lo + '</b><span>～</span><b>' + v.hi + '</b></div><small>之間</small>';
    wrap.appendChild(bomb);
    // 數線
    var line = el('div', 'ug-line'), fill = el('div', 'ug-fill');
    fill.style.left = (v.lo / MAX * 100) + '%'; fill.style.width = Math.max(1, (v.hi - v.lo) / MAX * 100) + '%';
    line.appendChild(fill); line.appendChild(el('span', 'a', '0')); line.appendChild(el('span', 'b', String(MAX)));
    wrap.appendChild(line);
    var st = el('div', 'ug-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = '輪到你了！猜一個 ' + v.lo + '～' + v.hi + ' 的數字'; st.className = 'ug-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + ' 猜…';
    wrap.appendChild(st);
    if (myTurn) {
      var pad = el('div', 'ug-pad');
      var disp = el('div', 'ug-disp' + (L.val ? '' : ' empty'), L.val || '輸入數字'); pad.appendChild(disp);
      var keys = el('div', 'ug-keys');
      '1234567890'.split('').concat(['⌫']).forEach(function (k) {
        keys.appendChild(ctx.button('ug-key' + (k === '⌫' ? ' del' : ''), k, function () {
          if (k === '⌫') L.val = L.val.slice(0, -1); else if (L.val.length < 3) L.val = (L.val === '0' ? '' : L.val) + k;
          ctx.snd('tap'); ctx.rerender();
        }));
      });
      var go = ctx.button('ug-key ok', '送出', function () {
        var x = +L.val;
        if (L.val === '' || x < v.lo || x > v.hi) { ctx.toast('要猜 ' + v.lo + ' 到 ' + v.hi + ' 之間的數字喔'); ctx.snd('error'); return; }
        L.ask = true; ctx.rerender();
      });
      go.disabled = L.val === ''; keys.appendChild(go);
      pad.appendChild(keys);
      wrap.appendChild(pad);
      if (L.ask) {
        var cf = el('div', 'ug-confirm'), cb = el('div', 'ug-cbox');
        cb.appendChild(el('p', '', '確定要猜'));
        cb.appendChild(el('b', '', L.val));
        cb.appendChild(el('p', '', '嗎？'));
        var row = el('div', 'ug-crow');
        row.appendChild(ctx.button('ug-btn', '再想想', function () { L.ask = false; ctx.rerender(); }));
        row.appendChild(ctx.button('ug-btn go', '✅ 確定送出', function () { L.ask = false; L.sent = v.cnt; ctx.send('guess', { x: +L.val, n: v.cnt }); L.val = ''; ctx.snd('move'); ctx.rerender(); }));
        cb.appendChild(row); cf.appendChild(cb); wrap.appendChild(cf);
      }
    } else { L.ask = false; }
    // 紀錄
    if (v.hist.length) {
      var hs = el('div', 'ug-hist');
      v.hist.slice().reverse().forEach(function (h) {
        var r = el('div', 'ug-h ' + h.r), d = el('i'); d.style.background = SEATC[h.s]; r.appendChild(d);
        r.appendChild(el('span', 'n', who(tb, h.s)));
        r.appendChild(el('b', '', h.x));
        r.appendChild(el('span', 't', h.r === 'hit' ? (v.mode === 'win' ? '🎯 猜中了！' : '💥 爆炸！') : h.r === 'up' ? '⬆️ 密碼較大' : '⬇️ 密碼較小'));
        if (h.r !== 'hit' && h.a != null) r.appendChild(el('span', 'rg', '→ ' + h.a + '～' + h.b + ' 之間'));
        hs.appendChild(r);
      });
      wrap.appendChild(hs);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'ug-tools');
      tools.appendChild(ctx.button('ug-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('ug-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>系統偷偷想好一個 <b>0～100</b> 的祕密數字（密碼），大家都看不到。</li><li>大家<b>輪流</b>猜一個數字：用數字鍵輸入，按「送出」，再按「確定送出」。</li><li>沒猜中的話，系統會告訴大家密碼在哪兩個數字之間，範圍會越來越小。<br>例如密碼是 37，有人猜 50 → 範圍變成 <b>0～49</b>；又有人猜 20 → 範圍變成 <b>21～49</b>。</li><li>只能猜範圍裡面的數字。</li></ol>' },
      { h: '怎麼贏', html: '<ul><li><b>💥 猜中的人輸</b>（預設）：猜中密碼的人爆炸，其他人都算贏。範圍越小越危險！</li><li><b>🏆 猜中的人贏</b>：誰先猜中密碼誰就贏。</li></ul><p>這一局是哪一種，畫面上方會寫出來。</p><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 贏</td><td>3 分</td></tr><tr><td>💪 輸</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' },
      { h: '小技巧', html: '<ul><li>「猜中的人贏」：每次猜範圍正中間的數字，最快找到密碼。</li><li>「猜中的人輸」：不要讓範圍剩太小時輪到自己！想想看猜哪個數字，下一個人會比較危險。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「益智」→「終極密碼」，選每桌人數（2～6 人），再選「猜中密碼的人：💥 輸／🏆 贏」（預設是輸）。</li><li>學生掃碼加入、開桌後，系統自動幫每一桌出一個 0～100 的密碼。</li><li>密碼一律<b>蓋著</b>，避免大螢幕被學生看到。老師要看時，點那一桌的「🔒 密碼 ？？」就會打開，再點一下就蓋回去。只會在老師這台裝置上打開。</li><li>學生猜完，系統自動顯示範圍，老師不用喊。</li></ol>' },
      { h: '教學重點', html: '<ul><li>練習<b>數的大小比較</b>和 0～100 的數線概念。</li><li>「猜中的人贏」可以帶出「每次猜一半」的二分法策略。</li><li>學生送出前會再問一次「確定要猜 ○○ 嗎？」，避免手滑按錯。</li></ul>' },
      { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦怎麼猜</th></tr><tr><td>🐣 入門</td><td>隨便亂猜</td></tr><tr><td>🙂 簡單</td><td>一半時間亂猜</td></tr><tr><td>🤔 普通</td><td>大多會用策略</td></tr><tr><td>🔥 困難</td><td>幾乎都用最好的策略</td></tr></table>' }
    ]
  };
  BG.register('guess', mod);
})();
