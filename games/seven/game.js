/* 7吃9：數字牌搶出遊戲（沒有輪流，大家同時搶）。
   每張牌有一個大數字（1～10）和一個加減數（±1 綠、±2 藍、±3 紅）。
   中間那張牌的「大數字 ± 加減數」就是下一張可以出的數字；超過 10 要減 10，小於 1 要加 10（繞一圈）。
   每人有自己的牌堆，手上隨時補到 5 張。最快把自己的牌全部出完的人獲勝。
   點錯暫停 2 秒。大家都出不了牌時：每個人把手牌放回牌堆底重抽，中間最下面的牌翻到最上面。 */
(function () {
  'use strict';
  var HAND = 5, LOCK = 700, FREEZE = 2000;
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var MCOL = { 1: '#2a9d5c', 2: '#1d7dd8', 3: '#e63946' };
  var MNAME = { 1: '綠', 2: '藍', 3: '紅' };
  // 牌號 0～59：數字 = floor(id/6)+1，加減數 = id%3+1（每種組合 2 張，共 60 張）
  function num(id) { return Math.floor(id / 6) + 1; }
  function md(id) { return id % 3 + 1; }
  function wrap(x) { return x > 10 ? x - 10 : x < 1 ? x + 10 : x; }
  function targets(id) { var a = wrap(num(id) + md(id)), b = wrap(num(id) - md(id)); return a === b ? [a] : [a, b]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function cardHTML(id, o) {
    o = o || {}; var n = num(id), m = md(id), c = MCOL[m];
    return '<svg class="s9-card' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 70 100"><rect x="1" y="1" width="68" height="98" rx="9" fill="#fffaf0" stroke="' + c + '" stroke-width="2.5"/>' +
      '<rect x="6" y="6" width="58" height="88" rx="6" fill="none" stroke="' + c + '" stroke-width=".8" stroke-dasharray="3 2" opacity=".6"/>' +
      '<circle cx="35" cy="47" r="22" fill="#ffd54f" stroke="#e0a800" stroke-width="1.5"/>' +
      '<text x="35" y="' + (n === 10 ? 56 : 58) + '" font-size="' + (n === 10 ? 26 : 32) + '" font-weight="900" text-anchor="middle" fill="#3a2a00" font-family="Arial Rounded MT Bold,Arial,sans-serif">' + n + '</text>' +
      '<g font-weight="900" text-anchor="middle" font-family="Arial,sans-serif"><rect x="5" y="76" width="26" height="17" rx="8.5" fill="' + c + '"/><text x="18" y="89" font-size="12" fill="#fff">±' + m + '</text>' +
      '<rect x="39" y="7" width="26" height="17" rx="8.5" fill="' + c + '"/><text x="52" y="20" font-size="12" fill="#fff">±' + m + '</text></g></svg>';
  }
  var REASONS = { empty: '第一個把牌全部出完', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function left(g, s) { return g.hands[s].length + g.piles[s].length; }
  function refill(g, s) { while (g.hands[s].length < HAND && g.piles[s].length) g.hands[s].push(g.piles[s].pop()); }
  function top(g) { return g.center[g.center.length - 1]; }
  function canPlay(g, s, c) { return left(g, s) === 1 || targets(top(g)).indexOf(num(c)) >= 0; }
  function anyMove(g) { return alive(g).some(function (s) { return g.hands[s].some(function (c) { return canPlay(g, s, c); }); }); }
  function unstick(g) {
    var k = 0;
    while (!anyMove(g) && k++ < 30) {
      alive(g).forEach(function (s) { if (g.piles[s].length) { g.piles[s] = g.hands[s].concat(g.piles[s]); g.hands[s] = []; refill(g, s); } });
      if (g.center.length > 1) g.center.push(g.center.shift());
      g.stuck++;
    }
    if (!anyMove(g)) { // 真的沒辦法：剩最多張的人放一張到中間
      var a = alive(g).sort(function (x, y) { return left(g, y) - left(g, x); })[0];
      if (a != null && g.hands[a].length) { g.center.push(g.hands[a].shift()); refill(g, a); g.stuck++; }
    }
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], ver: 1,
    reasons: REASONS,
    levelDesc: ['算很慢，大約 8 秒出一張', '大約 6 秒出一張', '大約 4 秒出一張', '大約 2.5 秒就出一張'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 4));
      var d = shuffle(Array.apply(null, Array(60)).map(function (_, i) { return i; }));
      var g = { np: n, piles: [], hands: [], center: [d.pop()], frz: [], out: [], last: null, lockAt: 0, stuck: 0, cnt: 0, res: null };
      var per = Math.floor(d.length / n);
      for (var s = 0; s < n; s++) { g.piles.push(d.splice(0, per)); g.hands.push([]); g.frz.push(0); refill(g, s); }
      g.center = d.concat(g.center); // 多出來的牌放到中間牌堆底下
      unstick(g);
      return g;
    },
    turnSeat: function () { return -1; },
    /* 搶答遊戲：沒有輪流，所以不做思考倒數；提示、小提醒照常（由老師端統一控制） */
    noTimer: true,
    acting: function (g) { return g.res ? [] : alive(g); },
    hintDesc: '會告訴你「中間這張牌可以出哪些數字」，並亮出你手上可以出的牌；如果你手上沒有可以出的牌，也會告訴你。提示只針對當下中間這張牌，中間換牌後就消失。',
    tipDesc: '發呆一下子時，提醒你「超過 10 要減 10、小於 1 要加 10」的繞圈算法；如果你手上沒有能出的牌，提醒你不用急。',
    hint: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      var t = top(g), tg = targets(t), ok = g.hands[seat].filter(function (c) { return canPlay(g, seat, c); });
      var eq = '中間是 ' + num(t) + '（±' + md(t) + '），可以出 ' + tg.join(' 或 ') + '。';
      return ok.length ? { msg: eq + '亮黃框的牌就是你手上現在可以出的牌。', hl: ok.map(String) } : { msg: eq + '可惜你手上目前沒有這些數字，等中間換牌再看看。', hl: [] };
    },
    nudge: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      var ok = g.hands[seat].some(function (c) { return canPlay(g, seat, c); });
      return ok ? '算不出來嗎？記得：中間的大數字加或減那個數字。算出來超過 10 要減 10，小於 1 要加 10（數字排成一圈）。' : '你手上現在沒有可以出的牌，不用急，等別人出牌、中間換牌後再看看。';
    },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var now = Date.now();
      return { np: g.np, top: top(g), center: g.center.length, hand: seat >= 0 ? g.hands[seat] : null, counts: g.hands.map(function (h, s) { return left(g, s); }),
        out: g.out, last: g.last, stuck: g.stuck, cnt: g.cnt, turn: -1, frz: seat >= 0 ? Math.max(0, g.frz[seat] - now) : 0, lock: Math.max(0, g.lockAt - now) };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || d.n !== g.cnt) return false;   // 中間的牌已經換了，這一下不算
      var now = Date.now(), h = g.hands[seat], c = +d.c;
      if (now < g.frz[seat] || now < g.lockAt || h.indexOf(c) < 0) return false;
      if (!canPlay(g, seat, c)) { g.frz[seat] = now + FREEZE; return true; }
      h.splice(h.indexOf(c), 1); g.center.push(c); refill(g, seat);
      g.last = { w: seat, c: c, n: g.cnt }; g.cnt++; g.lockAt = now + LOCK;
      if (!left(g, seat)) { g.res = { w: seat, why: 'empty' }; return true; }
      var st = g.stuck; unstick(g); if (g.stuck !== st) g.last.stuck = true;
      return true;
    },
    botTurn: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      var c = g.hands[seat].filter(function (c) { return canPlay(g, seat, c); })[0];
      return c == null ? null : { t: 'play', c: c, n: g.cnt };
    },
    botWait: function (g, seat, lv) {
      var base = [8000, 6000, 4000, 2500][Math.max(0, Math.min(3, (lv || 1) - 1))];
      return base + Math.random() * 2000 + Math.max(0, g.lockAt - Date.now());
    },
    hostView: function (g) {
      var h = '<div class="s9-host">' + cardHTML(top(g), { cls: 'mini' }) + '<div class="s9-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="' + (g.out.indexOf(s) >= 0 ? 'out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : '剩 ' + left(g, s) + ' 張') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { var t = top(g); return { t: '中間 ' + num(t) + '（±' + md(t) + '）→ 可出 ' + targets(t).join(' 或 '), c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    unstick(g);
  }

  /* ---------- 學生端 ---------- */
  var L = { lastN: -1, frzUntil: 0, lockUntil: 0, sent: -1, round: -1, timer: null, stuck: -1 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function later(ctx, ms) { clearTimeout(L.timer); L.timer = setTimeout(function () { ctx.rerender(); }, ms + 30); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view, now = Date.now();
    if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.sent = -1; L.frzUntil = 0; L.stuck = v.stuck; }
    if (v.frz > 0) L.frzUntil = Math.max(L.frzUntil, now + v.frz);
    if (v.lock > 0) L.lockUntil = now + v.lock;
    if (v.last && v.last.n !== L.lastN) {
      if (L.lastN !== -1 || prev) {
        if (v.last.w === tb.seat) fx.snd('pop'); else { fx.snd('cap'); }
      }
      L.lastN = v.last.n;
    }
    if (v.stuck !== L.stuck) { if (L.stuck !== -1 && prev) fx.toast('大家都出不了牌 🔄 手牌換新、中間換一張'); L.stuck = v.stuck; }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '沒有輪流，算出來就快出！');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, now = Date.now();
    var frozen = L.frzUntil > now, locked = L.lockUntil > now;
    if (frozen) later(ctx, Math.min(1000, L.frzUntil - now)); else if (locked) later(ctx, L.lockUntil - now);
    var wrap = el('div', 's9-table');
    var bar = el('div', 's9-bar');
    for (var i = 0; i < v.np; i++) {
      var chip = el('span', 's9-chip' + (i === seat ? ' me' : '') + (v.out.indexOf(i) >= 0 ? ' out' : '') + (v.last && v.last.w === i && locked ? ' got' : ''));
      var dot = el('i'); dot.style.background = SEATC[i]; chip.appendChild(dot);
      chip.appendChild(el('span', 'n', i === seat ? '我' : short(tb, i)));
      chip.appendChild(el('b', '', v.counts[i]));
      bar.appendChild(chip);
    }
    wrap.appendChild(bar);
    var st = el('div', 's9-status'), t = v.top;
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (frozen) { st.textContent = '❄️ 算錯了！暫停 ' + Math.ceil((L.frzUntil - now) / 1000) + ' 秒'; st.className = 's9-status bad'; }
    else if (locked && v.last) { st.textContent = (v.last.w === seat ? '你' : short(tb, v.last.w)) + ' 出了 ' + num(v.last.c) + '！'; st.className = 's9-status got'; }
    else { st.textContent = '中間是 ' + num(t) + '，' + num(t) + ' 加減 ' + md(t) + ' 是多少？快出！'; st.className = 's9-status go'; }
    wrap.appendChild(st);
    var mid = el('div', 's9-mid');
    var pile = el('div', 's9-pile'); pile.innerHTML = cardHTML(t, { cls: 'center' + (locked ? ' in' : '') }); mid.appendChild(pile);
    var info = el('div', 's9-info');
    info.appendChild(el('div', 's9-eq', num(t) + ' ± ' + md(t)));
    info.appendChild(el('div', 's9-ans dim', '= ？'));
    info.appendChild(el('small', '', '中間有 ' + v.center + ' 張'));
    mid.appendChild(info);
    wrap.appendChild(mid);
    if (seat >= 0 && v.hand) {
      var me = el('div', 's9-me' + (frozen ? ' frozen' : ''));
      me.appendChild(el('div', 's9-lbl', '我的手牌・牌堆還有 ' + Math.max(0, v.counts[seat] - v.hand.length) + ' 張'));
      var hand = el('div', 's9-hand'), HK = BG.handKey(tb, 'seven'), SF = function (h) { return h.sort(function (a, b) { return num(a) - num(b) || a - b; }); };
      // 新補進來的牌放最右邊並標「新」，按「整理」才依數字排好
      var ho = BG.handOrder(HK, v.hand, function (h) { return h; });
      ho.list.forEach(function (c, i) {
        var b = el('button', 's9-hc' + (ho.fresh[i] ? ' fresh-card' : '')); b.type = 'button'; b.setAttribute('data-c', c); b.innerHTML = cardHTML(c);
        b.addEventListener('click', function () {
          var t2 = Date.now();
          if (tb.res || out || L.frzUntil > t2 || L.lockUntil > t2 || L.sent === v.cnt) return;
          var ok = v.counts[seat] === 1 || targets(v.top).indexOf(num(c)) >= 0;
          if (!ok) { L.frzUntil = t2 + FREEZE; ctx.snd('error'); b.classList.add('wrong'); setTimeout(function () { ctx.rerender(); }, 350); }
          else { L.sent = v.cnt; ctx.snd('tap'); b.classList.add('go'); }
          ctx.send('play', { c: c, n: v.cnt });
        });
        hand.appendChild(b);
      });
      me.appendChild(hand);
      if (!tb.res && !out) { var srt = ctx.button('s9-sort sort-btn', '🔀 整理：依數字', function () { BG.handSort(HK, SF); ctx.snd('tap'); ctx.rerender(); }); me.appendChild(srt); }
      if (v.counts[seat] === 1) me.appendChild(el('div', 's9-lastone', '最後一張！不用算，直接出就贏了'));
      wrap.appendChild(me);
    }
    if (!tb.res && !out) {
      var tools = el('div', 's9-tools');
      tools.appendChild(ctx.button('s9-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('s9-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* ---------- 說明 ---------- */
  var ex = function (id, cap) { return '<figure class="g-fig s9-demo">' + cardHTML(id) + '<figcaption>' + cap + '</figcaption></figure>'; };
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每個人有自己的一疊牌，手上隨時會有 5 張。</li><li><b>沒有輪流！</b>大家同時看中間那張牌，算出下一張可以出什麼，最快的人先出。</li><li>算法：中間牌的<b>大數字</b>，<b>加上</b>或<b>減掉</b>角落的<b>加減數</b>（±1 綠色、±2 藍色、±3 紅色）。</li><li>算錯了出牌，會<b>暫停 2 秒</b>。</li><li>大家都出不了牌時，系統會幫每個人換手牌，中間也換一張，繼續搶。</li></ol>' +
        '<div class="g-figs">' + ex(4 * 6 + 1, '中間是 5（±2）：可以出 <b>3</b> 或 <b>7</b>') + ex(8 * 6 + 2, '中間是 9（±3）：9+3=12，超過 10 要減 10 → <b>2</b>；9−3 → <b>6</b>') + '</div>' },
      { h: '繞一圈', html: '<ul><li>算出來<b>超過 10</b>：減 10。例如 8+3=11 → 出 <b>1</b>。</li><li>算出來<b>小於 1</b>：加 10。例如 1−2=−1 → 出 <b>9</b>；2−2=0 → 出 <b>10</b>。</li><li>想像數字排成一圈：…8、9、10、1、2、3…</li></ul>' },
      { h: '怎麼贏', html: '<p>最先把自己的牌（手牌加牌堆）全部出完的人獲勝！最後一張不用算，可以直接出。</p><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 第一個出完</td><td>3 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' },
      { h: '小技巧', html: '<ul><li>看到中間的牌，先算出兩個答案，再找手上有沒有。</li><li>真的算不出來，可以按上方的「💡 提示」（老師有開放才會出現），會告訴你中間這張可以出哪兩個數字、亮出你手上能出的牌。次數由老師決定，要省著用！</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「牌類」→「7吃9」，每桌 2～6 人（2～4 人最好玩）。</li><li>一副 60 張：數字 1～10，每個數字都有 ±1、±2、±3 各 2 張。</li><li>一局大約 3～5 分鐘。老師端會顯示中間的牌、答案和每人剩幾張。</li></ol>' },
      { h: '教學重點', html: '<ul><li>練習 10 以內的<b>加減心算</b>，以及「繞一圈」（超過 10 減 10、小於 1 加 10）。</li><li>學生可以用上方的「💡 提示」（由老師端統一設定次數），每次只顯示當下中間那張牌可以出的數字，換牌就消失；用完就不能再看，鼓勵學生自己心算。</li><li>算錯只會暫停 2 秒，不扣分，鼓勵學生先算清楚再出。</li><li>規則參考市售「7 ate 9」玩法：原版牌數、張數分布查不到完整資料，本工具用 60 張平均分配；原版手牌沒有上限，本工具為了好操作，手上固定補到 5 張。</li></ul>' },
      { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦大約多久出一張</th></tr><tr><td>🐣 入門</td><td>約 8～10 秒</td></tr><tr><td>🙂 簡單</td><td>約 6～8 秒</td></tr><tr><td>🤔 普通</td><td>約 4～6 秒</td></tr><tr><td>🔥 困難</td><td>約 2.5～4.5 秒</td></tr></table><p>「電腦出牌速度」也會影響電腦反應。</p>' }
    ]
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  BG.register('seven-eat-nine', mod);
  window.S9 = { num: num, md: md, targets: targets };
})();
