/* 眼明手快：每張圓牌上有 6 個圖案，任兩張牌之間「剛好只有一個」圖案相同。
   中間有一疊牌，大家搶著找出「自己的牌」和「中間的牌」相同的圖案，點對了就把中間那張拿回來。
   點錯暫停 2 秒（不扣分）。中間的牌拿完時，拿到最多張的人獲勝。
   同一份程式註冊三個版本：圖案、注音、國字。 */
(function () {
  'use strict';
  var N = 5, PER = N + 1, LOCK = 1500, FREEZE = 2000;
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var THEMES = {
    'spot-match': { name: '圖案', text: false, syms: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐢', '🐙', '🦋', '🐝', '🍎', '🍌', '🍇', '🍉', '🍓', '🚗', '✈️', '🚀', '⚽', '🎈', '⭐'] },
    'spot-zhuyin': { name: '注音', text: true, apart: [0, 5, 10], syms: 'ㄇㄅㄆㄉㄊㄈㄋㄌㄍㄎㄩㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄞㄟㄠㄡㄢㄣ'.split('') }, // ㄇㄈㄩ（第 0、5、10 號）容易搞混，不放在同一張牌
    'spot-hanzi': { name: '國字', text: true, syms: '人入大太天夫日目白自木本未末土士王玉主生牛午千干口田由甲申山出'.split('') }
  };
  var TCOL = ['#e63946', '#1d7dd8', '#2a9d5c', '#8e44ad', '#f08c00', '#d6336c', '#0b7285', '#5c3d2e'];
  /* 有限射影平面（5 階）：31 張牌、31 個圖案、每張 6 個，任兩張剛好共用一個 */
  var DECK = (function () {
    var cards = [], x, y, m, b;
    function pt(x, y) { return x * N + y; }            // 0..24
    function slope(m) { return N * N + m; }            // 25..29
    var VERT = N * N + N;                              // 30
    for (m = 0; m < N; m++) for (b = 0; b < N; b++) { var c = []; for (x = 0; x < N; x++) c.push(pt(x, (m * x + b) % N)); c.push(slope(m)); cards.push(c); }
    for (x = 0; x < N; x++) { var v = []; for (y = 0; y < N; y++) v.push(pt(x, y)); v.push(VERT); cards.push(v); }
    var inf = []; for (m = 0; m < N; m++) inf.push(slope(m)); inf.push(VERT); cards.push(inf);
    return cards;
  })();
  function common(a, b) { var A = DECK[a], B = DECK[b]; for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return A[i]; return -1; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  /* 畫一張圓牌：中間 1 個、外圈 5 個，大小和角度依牌號固定（大家看到的一樣） */
  function cardHTML(theme, id, o) {
    o = o || {};
    var r = rnd(id * 7 + 3), syms = DECK[id].slice(), order = [];
    for (var i = 0; i < syms.length; i++) order.push(syms[i]);
    order.sort(function (a, b) { return ((a * 37 + id * 11) % 31) - ((b * 37 + id * 11) % 31); });
    var spin = r() * 72, h = '<div class="sp-card' + (o.cls ? ' ' + o.cls : '') + '">';
    order.forEach(function (s, k) {
      var cx = 50, cy = 50;
      if (k > 0) { var a = (spin + (k - 1) * 72) * Math.PI / 180; cx = 50 + Math.cos(a) * 31; cy = 50 + Math.sin(a) * 31; }
      var size = (k === 0 ? 1.05 : 1) * (0.78 + r() * 0.42), rot = theme.text ? (r() * 40 - 20) : (r() * 90 - 45);
      var col = theme.text ? 'color:' + TCOL[(s + id) % TCOL.length] + ';' : '';
      h += '<button type="button" class="sp-sym' + (o.hi === s ? ' hi' : '') + (theme.text ? ' txt' : '') + '" data-s="' + s + '" style="left:' + cx + '%;top:' + cy + '%;' + col + '--z:' + size.toFixed(2) + ';--r:' + rot.toFixed(0) + 'deg">' + theme.syms[s] + '</button>';
    });
    return h + '</div>';
  }

  function make(gid, theme) {
    /* 這個版本要用的牌：有 apart 的話，拿掉同時有其中兩個以上符號的牌（它們剛好都在同一張，拿掉後任兩張牌仍只有一個相同） */
    var IDS = DECK.map(function (_, i) { return i; }).filter(function (i) { return !theme.apart || DECK[i].filter(function (x) { return theme.apart.indexOf(x) >= 0; }).length < 2; });
    var REASONS = { most: '拿到最多張牌', tie: '拿到的牌一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
    function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
    function finish(g) {
      var a = alive(g), best = -1, bw = -1, tie = false;
      a.forEach(function (s) { if (g.won[s] > bw) { bw = g.won[s]; best = s; tie = false; } else if (g.won[s] === bw) tie = true; });
      g.res = tie ? { w: -1, why: 'tie', note: '每個人拿到：' + a.map(function (s) { return g.won[s]; }).join('、') + ' 張' } : { w: best, why: 'most', note: '拿到 ' + bw + ' 張牌' };
    }
    var mod = {
      seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], ver: 1,
      reasons: REASONS,
      levelDesc: ['反應很慢，大約 10 秒才找到', '大約 7 秒找到', '大約 5 秒找到', '大約 3 秒就找到，眼睛很利'],
      seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
      seatColor: function (i) { return SEATC[i % SEATC.length]; },
      init: function (n) {
        n = Math.max(2, Math.min(6, n || 4));
        var d = shuffle(IDS.slice());
        var g = { np: n, top: [], won: [], frz: [], out: [], pile: d, center: null, last: null, lockAt: 0, cnt: 0, res: null };
        for (var s = 0; s < n; s++) { g.top.push(d.pop()); g.won.push(0); g.frz.push(0); }
        g.center = g.pile.pop();
        return g;
      },
      turnSeat: function () { return -1; },
      forfeit: function (g, seat) { knock(g, seat, 'left'); },
      teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
      view: function (g, seat) {
        var now = Date.now();
        return { np: g.np, top: g.top, center: g.center, left: g.pile.length, won: g.won, out: g.out, last: g.last, cnt: g.cnt, turn: -1,
          counts: g.won, frz: seat >= 0 ? Math.max(0, g.frz[seat] - now) : 0, lock: Math.max(0, g.lockAt - now) };
      },
      act: function (g, seat, d, notify) {
        if (g.res || g.out.indexOf(seat) >= 0) return false;
        if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
        if (d.t !== 'tap' || d.c !== g.cnt) return false;   // 牌已經換了，這一下不算
        var now = Date.now();
        if (now < g.frz[seat] || now < g.lockAt) return false;
        var ans = common(g.top[seat], g.center);
        if (+d.s !== ans) { g.frz[seat] = now + FREEZE; return true; }
        g.last = { w: seat, s: ans, card: g.center, n: g.cnt };
        g.won[seat]++; g.top[seat] = g.center; g.cnt++;
        g.lockAt = now + LOCK;
        if (!g.pile.length) { g.center = null; finish(g); } else g.center = g.pile.pop();
        return true;
      },
      botTurn: function (g, seat) {
        if (g.res || g.center == null || g.out.indexOf(seat) >= 0) return null;
        return { t: 'tap', s: common(g.top[seat], g.center), c: g.cnt };
      },
      /* 電腦的反應時間（毫秒），會再乘上老師設定的速度 */
      botWait: function (g, seat, lv) {
        var base = [9000, 6500, 4500, 2800][Math.max(0, Math.min(3, (lv || 1) - 1))];
        return base + Math.random() * 2500 + Math.max(0, g.lockAt - Date.now());
      },
      hostView: function (g) {
        var h = '<div class="sp-host">' + (g.center != null ? cardHTML(theme, g.center, { cls: 'mini' }) : '<em>牌拿完了</em>') + '<div class="sp-host-seats">';
        for (var s = 0; s < g.np; s++) h += '<span class="' + (g.out.indexOf(s) >= 0 ? 'out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.won[s] + ' 張') + '</span>';
        return h + '</div></div>';
      },
      hostStatus: function (g) { return { t: '中間還剩 ' + (g.pile.length + (g.center != null ? 1 : 0)) + ' 張', c: '' }; }
    };
    function knock(g, seat, why) {
      if (g.out.indexOf(seat) >= 0) return;
      g.out.push(seat);
      var a = alive(g); if (a.length <= 1) g.res = { w: a.length ? a[0] : -1, why: why };
    }

    /* ---------- 學生端 ---------- */
    var L = { lastN: -1, frzUntil: 0, lockUntil: 0, sent: -1, round: -1, timer: null };
    function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
    function later(ctx, ms) { clearTimeout(L.timer); L.timer = setTimeout(function () { ctx.rerender(); }, ms + 30); }
    mod.onUpdate = function (prev, tb, fx) {
      var v = tb.view, now = Date.now();
      if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.sent = -1; L.frzUntil = 0; }
      if (v.frz > 0) L.frzUntil = Math.max(L.frzUntil, now + v.frz);
      if (v.lock > 0) L.lockUntil = now + v.lock;
      if (v.last && v.last.n !== L.lastN) {
        if (L.lastN !== -1 || prev) {
          if (v.last.w === tb.seat) { fx.snd('pop'); fx.toast('找到了！你拿到一張牌 🎉'); }
          else { fx.snd('cap'); fx.toast(short(tb, v.last.w) + ' 搶到了：' + theme.syms[v.last.s]); }
        }
        L.lastN = v.last.n;
      }
      if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '找出兩張牌上一樣的' + (theme.text ? '字' : '圖案'));
    };
    mod.render = function (box, ctx) {
      var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, now = Date.now();
      var frozen = L.frzUntil > now, locked = L.lockUntil > now;
      if (frozen) later(ctx, L.frzUntil - now); else if (locked) later(ctx, L.lockUntil - now);
      var wrap = el('div', 'sp-table' + (theme.text ? ' sp-text' : ''));
      var bar = el('div', 'sp-bar');
      for (var i = 0; i < v.np; i++) {
        var chip = el('span', 'sp-chip' + (i === seat ? ' me' : '') + (v.out.indexOf(i) >= 0 ? ' out' : ''));
        var dot = el('i'); dot.style.background = SEATC[i]; chip.appendChild(dot);
        chip.appendChild(el('span', 'n', i === seat ? '我' : short(tb, i)));
        chip.appendChild(el('b', '', v.won[i]));
        bar.appendChild(chip);
      }
      wrap.appendChild(bar);
      var st = el('div', 'sp-status');
      if (tb.res) st.textContent = '這局結束了';
      else if (out) st.textContent = '你已經認輸，正在觀看';
      else if (frozen) { st.textContent = '❄️ 點錯了！暫停 ' + Math.ceil((L.frzUntil - now) / 1000) + ' 秒'; st.className = 'sp-status bad'; later(ctx, Math.min(1000, L.frzUntil - now)); }
      else if (locked && v.last) { st.textContent = (v.last.w === seat ? '你' : short(tb, v.last.w)) + ' 找到了「' + theme.syms[v.last.s] + '」！下一張準備…'; st.className = 'sp-status got'; }
      else { st.textContent = '快！找出兩張牌上一樣的' + (theme.text ? '字' : '圖案') + '，點一下'; st.className = 'sp-status go'; }
      wrap.appendChild(st);

      var area = el('div', 'sp-area' + (frozen ? ' frozen' : '') + (locked ? ' locked' : ''));
      var cbox = el('div', 'sp-slot');
      cbox.appendChild(el('div', 'sp-lbl', '中間的牌・還剩 ' + (v.left + (v.center != null ? 1 : 0)) + ' 張'));
      var cw = el('div', 'sp-wrap pile');
      cw.innerHTML = v.center != null ? cardHTML(theme, v.center, { cls: 'center' }) : '<div class="sp-card empty">🏁</div>';
      cbox.appendChild(cw); area.appendChild(cbox);
      if (seat >= 0) {
        var mbox = el('div', 'sp-slot');
        mbox.appendChild(el('div', 'sp-lbl', '我的牌'));
        var mw = el('div', 'sp-wrap');
        var hi = locked && v.last && v.last.w === seat ? v.last.s : null;
        mw.innerHTML = cardHTML(theme, v.top[seat], { cls: 'mine', hi: hi });
        mw.firstChild.style.borderColor = SEATC[seat];
        mbox.appendChild(mw); area.appendChild(mbox);
      }
      if (frozen) area.appendChild(el('div', 'sp-ice', '❄️'));
      area.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.sp-sym'); if (!b) return;
        if (tb.res || out || seat < 0 || v.center == null) return;
        var t = Date.now(); if (L.frzUntil > t || L.lockUntil > t || L.sent === v.cnt) return;
        var s = +b.getAttribute('data-s');
        var ans = common(v.top[seat], v.center);
        if (s !== ans) { L.frzUntil = t + FREEZE; ctx.snd('error'); b.classList.add('wrong'); }
        else { L.sent = v.cnt; ctx.snd('tap'); [].forEach.call(area.querySelectorAll('.sp-sym[data-s="' + s + '"]'), function (x) { x.classList.add('hi'); }); }
        ctx.send('tap', { s: s, c: v.cnt });
        if (s !== ans) setTimeout(function () { ctx.rerender(); }, 350);
      });
      wrap.appendChild(area);
      if (!tb.res && !out) {
        var tools = el('div', 'sp-tools');
        tools.appendChild(ctx.button('sp-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
        tools.appendChild(ctx.emoteButton('sp-btn'));
        wrap.appendChild(tools);
      }
      box.appendChild(wrap);
    };

    /* ---------- 說明 ---------- */
    var A = IDS[0], B = IDS[1]; // 示範牌
    var demo = '<figure class="g-fig sp-demo">' + cardHTML(theme, A, { hi: common(A, B) }) + cardHTML(theme, B, { hi: common(A, B) }) +
      '<figcaption>這兩張牌只有「' + theme.syms[common(A, B)] + '」一樣（大小和方向可能不同）</figcaption></figure>';
    var thing = theme.text ? '字' : '圖案';
    mod.guide = {
      student: [
        { h: '怎麼玩', html:
          '<ol><li>每個人有一張<b>「我的牌」</b>，桌子中間有一疊<b>「中間的牌」</b>。</li>' +
          '<li>每張圓牌上有 6 個' + thing + '。<b>任何兩張牌，都剛好只有一個' + thing + '一樣</b>。</li>' +
          '<li>大家同時開始找：找出「我的牌」和「中間的牌」一樣的那個' + thing + '，<b>點一下</b>（點哪一張牌上的都可以）。</li>' +
          '<li>最快點對的人，就把中間那張牌拿走，它變成你新的「我的牌」，中間再翻出下一張。</li>' +
          '<li><b>點錯會暫停 2 秒</b>，不會扣分，但這 2 秒別人可能就搶走了，所以要看清楚再點！</li></ol>' + '<div class="g-figs">' + demo + '</div>' },
        { h: '怎麼贏', html: '<p>中間的牌全部被拿完時，<b>拿到最多張的人獲勝</b>。一樣多就平手。</p><p>上方的小圓點旁邊的數字，就是每個人目前拿到幾張。</p>' },
        { h: '小技巧', html: '<ul><li>' + thing + '的<b>大小和方向</b>每張都不一樣，別被騙了！</li><li>先盯住自己牌上的一個' + thing + '，再去中間的牌找它；找不到就換下一個。</li><li>不要亂點：點錯要等 2 秒，反而更慢。</li></ul>' },
        { h: '計分方式', html: '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 拿最多張</td><td>3 分</td></tr><tr><td>🤝 平手</td><td>1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>分數會自動加進老師大螢幕上的積分榜（和電腦玩的不列入總分）。</p>' }
      ],
      teacher: [
        { h: '主持流程', html: '<ol><li>在首頁點「眼明手快（' + theme.name + '）」開房間，投影 QR code。</li><li>選「每桌人數」（2～6 人），學生掃碼輸入學號，系統自動分桌。</li><li>一副牌 ' + IDS.length + ' 張，一局大約 2～4 分鐘。</li><li>老師端每一桌會顯示中間的牌和每個人拿到幾張。</li></ol>' },
        { h: '版本與教學重點', html: '<ul><li><b>圖案版</b>：動物、水果、交通工具，暖身用，人人都能玩。</li><li><b>注音版</b>：31 個注音符號，ㄅㄆ、ㄉㄊ、ㄋㄌ、ㄓㄗ、ㄢㄣ 等長得像的都在裡面，可以練習<b>字形辨識</b>。容易搞混的 <b>ㄇ、ㄈ、ㄩ</b> 不會出現在同一張牌上（一張牌最多只有其中一個）。</li><li><b>國字版</b>：人入、大太天夫、日目白自、木本未末、土士王玉、千干、田由甲申 等形近字，練習<b>看清楚筆畫</b>。</li><li>點錯暫停 2 秒、不扣分：鼓勵學生「看清楚再點」，而不是亂猜。</li><li>可以在學生找到後，請他說出那個注音或國字的讀音，或用國字造詞。</li></ul>' },
        { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦大約多久找到</th></tr><tr><td>🐣 入門</td><td>約 10 秒</td></tr><tr><td>🙂 簡單</td><td>約 7 秒</td></tr><tr><td>🤔 普通</td><td>約 5 秒</td></tr><tr><td>🔥 困難</td><td>約 3 秒</td></tr></table><p>左側「電腦出牌速度」也會影響電腦反應：選「🐌 最慢」電腦會再慢 3 倍多，適合剛開始練習的學生。</p>' }
      ]
    };
    BG.register(gid, mod);
  }
  Object.keys(THEMES).forEach(function (k) { make(k, THEMES[k]); });
  window.SPOT = { DECK: DECK, common: common, THEMES: THEMES };
})();
