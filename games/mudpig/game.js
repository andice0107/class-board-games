/* 泥巴豬農場（原創角色與牌圖，玩法類似「髒小豬」）
   每人有幾隻乾淨的小豬。輪到你時打出一張牌（或把手牌全部換掉），再補到 3 張。
   第一個讓自己的小豬「全部變髒」的人獲勝。
   牌：泥巴(21) 下雨(4) 豬舍(9) 閃電(4) 避雷針(4) 農夫洗豬(8) 鎖門(4) 共 54 張 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var CARDS = {
    mud: { n: '泥巴', d: '讓自己一隻乾淨的小豬變髒', k: 21 },
    rain: { n: '下雨', d: '所有人沒在豬舍裡的髒小豬，全部被洗乾淨', k: 4 },
    barn: { n: '豬舍', d: '幫自己一隻小豬蓋豬舍，下雨淋不到', k: 9 },
    bolt: { n: '閃電', d: '打掉別人的一間豬舍（有避雷針就打不掉）', k: 4 },
    rod: { n: '避雷針', d: '裝在自己的豬舍上，閃電打不壞', k: 4 },
    farmer: { n: '農夫洗豬', d: '把別人一隻髒小豬洗乾淨（鎖了門的豬舍洗不到）', k: 8 },
    lock: { n: '鎖門', d: '鎖上自己的豬舍，農夫進不去', k: 4 }
  };
  var ORDER = ['mud', 'rain', 'barn', 'bolt', 'rod', 'farmer', 'lock'];
  var IMG = function (k) { return 'games/mudpig/img/' + k + '.jpg' + (BG.VER ? '?v=' + BG.VER : ''); };
  var REASONS = { dirty: '小豬全部變髒了！', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nxt(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function pigsFor(n) { return n <= 2 ? 4 : n <= 4 ? 3 : 2; }
  function draw(g) { if (!g.deck.length) { g.deck = shuffle(g.disc); g.disc = []; } return g.deck.pop(); }
  /* 這張牌可以打給誰：回傳 [{s, p}]；下雨回傳 [{}] */
  function targets(g, seat, c) {
    var r = [];
    if (c === 'rain') return [{}];
    for (var s = 0; s < g.np; s++) {
      if (g.out.indexOf(s) >= 0) continue;
      var mine = s === seat;
      g.pigs[s].forEach(function (p, i) {
        var ok = false;
        if (c === 'mud') ok = mine && !p.d;
        else if (c === 'barn') ok = mine && !p.barn;
        else if (c === 'rod') ok = mine && p.barn && !p.rod;
        else if (c === 'lock') ok = mine && p.barn && !p.lock;
        else if (c === 'bolt') ok = !mine && p.barn && !p.rod;
        else if (c === 'farmer') ok = !mine && p.d && !(p.barn && p.lock);
        if (ok) r.push({ s: s, p: i });
      });
    }
    return r;
  }
  function pushLog(g) { if (!g.logs) g.logs = []; g.logs.push(g.log); if (g.logs.length > 6) g.logs.shift(); }
  function dirtyCount(g, s) { return g.pigs[s].filter(function (p) { return p.d; }).length; }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1300, ver: 1,
    reasons: REASONS,
    levelDesc: ['隨便出牌', '會先讓自己的豬變髒', '會阻止快贏的人', '很會保護豬，也很會搗蛋'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var deck = []; ORDER.forEach(function (k) { for (var i = 0; i < CARDS[k].k; i++) deck.push(k); });
      var g = { np: n, deck: shuffle(deck), disc: [], hands: [], pigs: [], turn: Math.floor(Math.random() * n), log: null, logs: [], out: [], cnt: 0, res: null };
      for (var s = 0; s < n; s++) {
        g.hands.push([]); g.pigs.push([]);
        for (var p = 0; p < pigsFor(n); p++) g.pigs[s].push({ d: false, barn: false, rod: false, lock: false });
      }
      for (var k = 0; k < 3; k++) for (s = 0; s < n; s++) g.hands[s].push(draw(g));
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, turn: g.turn, pigs: g.pigs, hand: seat >= 0 ? g.hands[seat] : null, deck: g.deck.length, top: g.disc[g.disc.length - 1] || null, log: g.log, logs: g.logs, out: g.out, cnt: g.cnt };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat];
      if (d.t === 'swap') {
        g.disc = g.disc.concat(h); g.hands[seat] = []; for (var k = 0; k < 3; k++) g.hands[seat].push(draw(g));
        g.log = { k: 'swap', s: seat }; pushLog(g); g.turn = nxt(g, seat); g.cnt++; return true;
      }
      if (d.t !== 'play') return false;
      var i = d.i | 0, c = h[i]; if (!c) return false;
      var tg = targets(g, seat, c), t = null;
      if (c !== 'rain') { t = tg.filter(function (x) { return x.s === d.s && x.p === d.p; })[0]; if (!t) return false; }
      var pig = t ? g.pigs[t.s][t.p] : null, washed = 0;
      if (c === 'mud') pig.d = true;
      else if (c === 'barn') pig.barn = true;
      else if (c === 'rod') pig.rod = true;
      else if (c === 'lock') pig.lock = true;
      else if (c === 'bolt') { pig.barn = false; pig.rod = false; pig.lock = false; }
      else if (c === 'farmer') pig.d = false;
      else if (c === 'rain') g.pigs.forEach(function (ps, s) { if (g.out.indexOf(s) < 0) ps.forEach(function (p) { if (p.d && !p.barn) { p.d = false; washed++; } }); });
      h.splice(i, 1); g.disc.push(c); h.push(draw(g));
      g.log = { k: c, s: seat, t: t, washed: washed }; pushLog(g);
      if (dirtyCount(g, seat) === g.pigs[seat].length) { g.res = { w: seat, why: 'dirty' }; g.cnt++; return true; }
      g.turn = nxt(g, seat); g.cnt++;
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      var h = g.hands[seat], n = g.cnt, opts = [];
      h.forEach(function (c, i) { targets(g, seat, c).forEach(function (t) { opts.push({ c: c, i: i, t: t }); }); });
      if (!opts.length) return { t: 'swap', n: n };
      function A(o) { return { t: 'play', i: o.i, s: o.t.s, p: o.t.p, n: n }; }
      if (lv <= 1) return A(opts[Math.floor(Math.random() * opts.length)]);
      // 對手當中最危險的（髒豬最多）
      var lead = -1, ld = -1; for (var s = 0; s < g.np; s++) if (s !== seat && g.out.indexOf(s) < 0) { var dc = dirtyCount(g, s) / g.pigs[s].length; if (dc > ld) { ld = dc; lead = s; } }
      var myUnprot = g.pigs[seat].filter(function (p) { return p.d && !p.barn; }).length, theirUnprot = 0;
      g.pigs.forEach(function (ps, s) { if (s !== seat && g.out.indexOf(s) < 0) ps.forEach(function (p) { if (p.d && !p.barn) theirUnprot++; }); });
      function score(o) {
        var c = o.c, p = o.t.s != null ? g.pigs[o.t.s][o.t.p] : null, v = 0;
        if (c === 'mud') v = 50 + (p.barn ? 10 : 0);
        else if (c === 'barn') v = p.d ? 40 : 12;
        else if (c === 'rod') v = p.d ? 30 : 8;
        else if (c === 'lock') v = p.d ? 32 : 8;
        else if (c === 'farmer') v = 25 + (o.t.s === lead ? 20 * ld : 0) + (lv >= 3 && ld >= .99 ? 40 : 0);
        else if (c === 'bolt') v = 18 + (o.t.s === lead ? 15 : 0) + (g.pigs[o.t.s][o.t.p].d ? 10 : 0);
        else if (c === 'rain') v = (theirUnprot - myUnprot * 1.5) * 15 + (lv >= 3 && ld >= .99 ? 30 : 0) - 5;
        if (lv === 2 && (c === 'rod' || c === 'lock')) v -= 10;
        return v + Math.random() * (lv === 2 ? 15 : 6);
      }
      opts.sort(function (a, b) { return score(b) - score(a); });
      if (score(opts[0]) < 0 && lv >= 3) return { t: 'swap', n: n };
      return A(opts[0]);
    },
    hostView: function (g) {
      var h = '<div class="mp-host">';
      for (var s = 0; s < g.np; s++) {
        h += '<div class="mp-hrow' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>';
        g.pigs[s].forEach(function (p) { h += '<span class="' + (p.d ? 'd' : '') + (p.barn ? ' b' : '') + '">' + (p.d ? '🟤' : '🩷') + (p.barn ? '🏠' : '') + '</span>'; });
        h += '</div>';
      }
      return h + '</div>';
    },
    hostStatus: function (g) { return { t: '牌堆還有 ' + g.deck.length + ' 張', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.disc = g.disc.concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) g.turn = nxt(g, seat);
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, sent: -1, round: -1, key: -1 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function logText(tb, lg) {
    if (!lg) return '';
    var a = who(tb, lg.s), t = lg.t && lg.t.s != null ? (lg.t.s === lg.s ? '自己的' : who(tb, lg.t.s) + '的') + '第 ' + (lg.t.p + 1) + ' 隻' : '', tb2 = t ? t + '豬的' : '';
    switch (lg.k) {
      case 'swap': return a + ' 換了一手新牌';
      case 'mud': return a + ' 把' + t + '小豬丟進泥巴 🟤';
      case 'rain': return a + ' 讓天空下雨 🌧️ 洗乾淨 ' + lg.washed + ' 隻小豬';
      case 'barn': return a + ' 幫' + t + '小豬蓋了豬舍 🏠';
      case 'bolt': return a + ' 用閃電打壞' + tb2 + '豬舍 ⚡';
      case 'rod': return a + ' 在' + tb2 + '豬舍裝上避雷針';
      case 'farmer': return a + ' 叫農夫把' + t + '小豬洗乾淨 🧽';
      case 'lock': return a + ' 把' + tb2 + '豬舍鎖起來 🔒';
    }
    return '';
  }
  function pigEl(p, small, no) {
    var w = el('div', 'mp-pig' + (p.d ? ' dirty' : '') + (p.barn ? ' barn' : '') + (small ? ' sm' : ''));
    var im = el('img'); im.src = IMG(p.d ? 'pig-dirty' : 'pig-clean'); im.alt = p.d ? '髒小豬' : '乾淨小豬'; im.draggable = false; w.appendChild(im); if (no) w.appendChild(el('em', 'mp-no', no));
    if (p.barn) { var roof = el('div', 'mp-roof'); roof.innerHTML = '<span>豬舍</span>' + (p.rod ? '<b title="避雷針">⚡🛡️</b>' : '') + (p.lock ? '<b title="鎖門">🔒</b>' : ''); w.appendChild(roof); }
    return w;
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = -1; L.sent = -1; L.key = -1; }
    if (prev && v.cnt !== L.key && v.log) {
      var lg = v.log;
      fx.snd(lg.k === 'mud' ? 'pop' : lg.k === 'bolt' || lg.k === 'farmer' ? 'cap' : 'move');
      if (lg.s !== tb.seat) fx.toast(logText(tb, lg));
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 450);
    }
    L.key = v.cnt;
    if (L.sel >= (v.hand ? v.hand.length : 0)) L.sel = -1;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '讓你的小豬全部變髒就贏了 🐷');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var g = { np: v.np, pigs: v.pigs, out: v.out };
    var selCard = myTurn && L.sel >= 0 ? v.hand[L.sel] : null, tg = selCard ? targets(g, seat, selCard) : [];
    function isT(s, p) { return tg.some(function (x) { return x.s === s && x.p === p; }); }
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; L.sel = -1; ctx.send(t, d); ctx.rerender(); }
    var wrap = el('div', 'mp-table');
    var st = el('div', 'mp-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.className = 'mp-status me'; st.textContent = !selCard ? '輪到你了！選一張牌' : selCard === 'rain' ? '確定要讓天空下雨嗎？' : tg.length ? '點一隻發光的小豬' : '這張牌現在沒辦法用，換一張'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + '…';
    wrap.appendChild(st);
    // 對手
    var opps = el('div', 'mp-opps n' + (v.np - 1) + ' pc' + v.pigs[seat].length);
    for (var k = 1; k < v.np; k++) {
      var s = (seat + k) % v.np, row = el('div', 'mp-opp' + (v.turn === s && !tb.res ? ' turn' : '') + (v.out.indexOf(s) >= 0 ? ' out' : ''));
      row.setAttribute('data-seat', s);
      var nm = el('div', 'mp-name'), dot = el('i'); dot.style.background = SEATC[s]; nm.appendChild(dot); nm.appendChild(el('span', '', short(tb, s)));
      var sm = el('small'); sm.innerHTML = dirtyCount(g, s) + '/' + v.pigs[s].length + '<u> 髒</u>'; nm.appendChild(sm); row.appendChild(nm);
      var pr = el('div', 'mp-pigs');
      v.pigs[s].forEach(function (p, i) {
        var pe = pigEl(p, true, i + 1);
        if (isT(s, i)) { pe.classList.add('tg'); pe.addEventListener('click', (function (s, i) { return function () { ctx.snd('tap'); send('play', { i: L.sel, s: s, p: i }); }; })(s, i)); }
        pr.appendChild(pe);
      });
      row.appendChild(pr); opps.appendChild(row);
    }
    wrap.appendChild(opps);
    // 中間：牌堆、棄牌、最後動作
    var mid = el('div', 'mp-mid');
    var dk = el('div', 'mp-deck'); dk.innerHTML = '<img src="' + IMG('back') + '" alt="牌堆"><b>' + v.deck + '</b>'; mid.appendChild(dk);
    if (v.top) { var tp = el('div', 'mp-top'); tp.innerHTML = '<img src="' + IMG(v.top) + '" alt=""><span>' + CARDS[v.top].n + '</span>'; mid.appendChild(tp); }
    var lgBox = el('div', 'mp-log'), lgs = (v.logs || (v.log ? [v.log] : [])).slice(-4).reverse();
    if (!lgs.length) lgBox.appendChild(el('div', 'mp-li', '大家好！先讓小豬變髒吧'));
    lgs.forEach(function (lg, i) {
      var hitMe = lg.t && lg.t.s === seat && lg.s !== seat, li = el('div', 'mp-li' + (i === 0 ? ' new' : '') + (hitMe ? ' hit' : ''));
      var d = el('i'); d.style.background = SEATC[lg.s]; li.appendChild(d); li.appendChild(document.createTextNode(logText(tb, lg)));
      lgBox.appendChild(li);
    });
    mid.appendChild(lgBox);
    wrap.appendChild(mid);
    // 我的小豬
    var me = el('div', 'mp-me' + (myTurn ? ' turn' : ''));
    me.setAttribute('data-seat', seat);
    var mn = el('div', 'mp-name'), md = el('i'); md.style.background = SEATC[seat]; mn.appendChild(md); mn.appendChild(document.createTextNode('我的小豬'));
    mn.appendChild(el('small', '', dirtyCount(g, seat) + '/' + v.pigs[seat].length + ' 髒')); me.appendChild(mn);
    var mp = el('div', 'mp-pigs big');
    v.pigs[seat].forEach(function (p, i) {
      var pe = pigEl(p, false, i + 1);
      if (isT(seat, i)) { pe.classList.add('tg'); pe.addEventListener('click', function () { ctx.snd('tap'); send('play', { i: L.sel, s: seat, p: i }); }); }
      mp.appendChild(pe);
    });
    me.appendChild(mp);
    // 手牌
    if (v.hand && !out) {
      var hand = el('div', 'mp-hand');
      v.hand.forEach(function (c, i) {
        var usable = targets(g, seat, c).length > 0;
        var b = el('button', 'mp-card' + (L.sel === i ? ' sel' : '') + (myTurn && !usable ? ' dim' : '')); b.type = 'button';
        b.innerHTML = '<img src="' + IMG(c) + '" alt=""><b>' + CARDS[c].n + '</b><small>' + CARDS[c].d + '</small>';
        b.addEventListener('click', function () { if (!myTurn) { ctx.toast(CARDS[c].n + '：' + CARDS[c].d); return; } L.sel = L.sel === i ? -1 : i; ctx.snd('tap'); ctx.rerender(); });
        hand.appendChild(b);
      });
      me.appendChild(hand);
    }
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'mp-tools');
      if (myTurn && selCard === 'rain') tools.appendChild(ctx.button('mp-btn go', '🌧️ 下雨！', function () { send('play', { i: L.sel }); }));
      if (myTurn) tools.appendChild(ctx.button('mp-btn', '🔄 換手牌', function () { if (confirm('把 3 張手牌全部丟掉，換 3 張新的？（這回合就結束）')) send('swap'); }));
      tools.appendChild(ctx.button('mp-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('mp-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  function cardFig(k) { return '<figure class="g-fig mp-gfig"><img src="' + IMG(k) + '" alt=""><figcaption><b>' + CARDS[k].n + '</b>（' + CARDS[k].k + ' 張）<br>' + CARDS[k].d + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每個人有幾隻<b>乾淨的小豬</b>（2 人各 4 隻、3～4 人各 3 隻、5～6 人各 2 隻），手上有 3 張牌。</li><li>輪到你時，<b>打出一張牌</b>：先點手上的牌，再點一隻發光的小豬。打完自動補到 3 張。</li><li>手上的牌都不好用時，可以按「🔄 換手牌」，把 3 張全部換新（這回合就結束）。</li><li><b>第一個讓自己的小豬全部變髒的人獲勝！</b></li></ol>' },
      { h: '牌的種類', html: '<div class="g-figs">' + ORDER.map(cardFig).join('') + '</div>' },
      { h: '小技巧', html: '<ul><li>髒小豬先蓋豬舍，下雨就淋不到。</li><li>豬舍再裝避雷針、鎖門，就完全安全了。</li><li>看到別人快贏了，用農夫或閃電搗蛋！</li></ul><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 第一個全部變髒</td><td>3 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「牌類」→「泥巴豬農場」，每桌 2～6 人（3～4 人最好玩），一局約 10 分鐘。</li><li>老師端每一桌會顯示每個人的小豬：🩷 乾淨、🟤 髒、🏠 在豬舍裡。</li></ol>' },
      { h: '教學重點', html: '<ul><li>規則簡單，適合低年級：認識「保護」和「攻擊」的策略。</li><li>每張牌都有文字說明，可以練習閱讀理解；也可以討論「被搗蛋時怎麼調整心情」。</li><li>牌圖為原創插畫（Canva 生成），玩法參考市售「髒小豬」類遊戲。</li></ul>' }
    ]
  };
  BG.register('mudpig', mod);
})();
