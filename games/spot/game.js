/* 眼明手快：每張圓牌上有 6 個圖案，任兩張牌之間「剛好只有一個」圖案相同。
   中間有一疊牌，大家搶著找出「自己的牌」和「中間的牌」相同的圖案，點對了就把中間那張拿回來。
   點錯暫停 2 秒（不扣分）。中間的牌拿完時，拿到最多張的人獲勝。
   同一份程式註冊三個版本：圖案、注音、國字。 */
(function () {
  'use strict';
  var N = 5, PER = N + 1, LOCK = 1500, FREEZE = 2000;
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var THEMES = {
    'spot-match': { name: '圖案', text: false, syms: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐢', '🐙', '🦋', '🐝', '🍎', '🍌', '🍇', '🍉', '🍓', '🚗', '✈️', '🚀', '⚽', '🎈', '⭐', '🐴', '🐑', '🐘', '🦒', '🐍', '🐟', '🐬', '🐳', '🦀', '🐞', '🦉', '🦆', '🍑', '🍒', '🍍', '🥕', '🌽', '🚌', '🚲', '🚢', '🚁', '⚾', '🎁', '🔔', '🌙', '☀️', '🐺', '🐗', '🦄', '🦓', '🐪', '🦘', '🐿️', '🦔', '🦜', '🐤', '🥝', '🍋', '🍊', '🥑', '🍔', '🍕'] },
    'spot-zhuyin': { name: '注音', text: true, apart: [0, 5, 10], fake: { 0: 'ㄝ', 5: 'ㄦ', 10: 'ㄨ' }, syms: 'ㄇㄅㄆㄉㄊㄈㄋㄌㄍㄎㄩㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄞㄟㄠㄡㄢㄣ'.split('').concat('ㄧㄤㄥˊˇˋ˙'.split(''), 'ㄅㄚ ㄆㄚ ㄉㄚ ㄊㄚ ㄋㄚ ㄌㄚ ㄍㄚ ㄎㄚ ㄏㄚ ㄅㄛ ㄆㄛ ㄌㄛ ㄅㄞ ㄆㄞ ㄉㄞ ㄊㄞ ㄋㄞ ㄌㄞ ㄍㄞ ㄎㄞ ㄏㄞ ㄅㄟ ㄆㄟ ㄉㄟ ㄋㄟ ㄌㄟ ㄍㄟ ㄏㄟ ㄅㄠ ㄆㄠ ㄉㄠ ㄊㄠ ㄋㄠ ㄌㄠ ㄍㄠ'.split(' ')) }, // ㄇㄈㄩ（第 0、5、10 號）容易搞混，不放在同一張牌
    'spot-hanzi': { name: '國字', text: true, syms: '人入大太天夫日目白自木本未末土士王玉主生牛午千干口田由甲申山出八犬百禾己已巳刀刃力九丁于冬各免兔貝見月用矢失右石左比北今令句旬市布夕多手毛方放司同'.split('') }
  };
  var TCOL = ['#e63946', '#1d7dd8', '#2a9d5c', '#8e44ad', '#f08c00', '#d6336c', '#0b7285', '#5c3d2e'];
  /* 有限射影平面：每張牌 N+1 個符號，任兩張牌剛好共用一個。N 越大，每張牌上的符號越多、牌越難找。
     N=5（每張 6 個）是原本的標準版；N=3（4 個）、N=4（5 個）、N=7（8 個）用「完美差集」做成循環的牌組。 */
  function plane5() {
    var cards = [], x, y, m, b;
    function pt(x, y) { return x * N + y; }            // 0..24
    function slope(m) { return N * N + m; }            // 25..29
    var VERT = N * N + N;                              // 30
    for (m = 0; m < N; m++) for (b = 0; b < N; b++) { var c = []; for (x = 0; x < N; x++) c.push(pt(x, (m * x + b) % N)); c.push(slope(m)); cards.push(c); }
    for (x = 0; x < N; x++) { var v = []; for (y = 0; y < N; y++) v.push(pt(x, y)); v.push(VERT); cards.push(v); }
    var inf = []; for (m = 0; m < N; m++) inf.push(slope(m)); inf.push(VERT); cards.push(inf);
    return cards;
  }
  function cyc(P, set) { var cards = []; for (var i = 0; i < P; i++) cards.push(set.map(function (d) { return (d + i) % P; })); return cards; }
  var DECKS = { 3: cyc(13, [0, 1, 3, 9]), 4: cyc(21, [0, 1, 4, 14, 16]), 5: plane5(), 7: cyc(57, [0, 1, 3, 13, 32, 36, 43, 52]), 8: cyc(73, [0, 1, 3, 7, 15, 31, 36, 54, 63]) };
  var DECK = DECKS[5];
  var LV2N = { '4': 3, '5': 4, '6': 5, '8': 7, '9': 8 };   // 每張牌的符號數 → 平面的階數
  function common(a, b, n) { var D = DECKS[n || 5], A = D[a], B = D[b]; for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return A[i]; return -1; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  /* 畫一張圓牌：中間 1 個、外圈 5 個，大小和角度依牌號固定（大家看到的一樣） */
  /* 容易搞混的符號（theme.fake）：只有兩張牌都有它（也就是答案）時才顯示本來的樣子，
     否則換成不會撞到的替身符號，畫面上就不會出現「一邊 ㄇ、一邊 ㄈ」這種混淆 */
  function face(theme, s, vs, n) {
    if (theme.fake && theme.fake[s] && (vs == null || DECKS[n || 5][vs].indexOf(s) < 0)) return theme.fake[s];
    return theme.syms[s];
  }
  function cardHTML(theme, id, o) {
    o = o || {};
    var n = o.n || 5, D = DECKS[n], P = D.length, per = D[0].length, r = rnd(id * 7 + 3), syms = D[id].slice(), order = [];
    for (var i = 0; i < syms.length; i++) order.push(syms[i]);
    order.sort(function (a, b) { return ((a * 37 + id * 11) % P) - ((b * 37 + id * 11) % P); });
    var spin = r() * 72, h = '<div class="sp-card' + (o.cls ? ' ' + o.cls : '') + '">';
    order.forEach(function (s, k) {
      var cx = 50, cy = 50;
      if (k > 0) { var a = (spin + (k - 1) * (360 / (per - 1))) * Math.PI / 180, rad = per > 8 ? 34 : per > 6 ? 33 : 31; cx = 50 + Math.cos(a) * rad; cy = 50 + Math.sin(a) * rad; }
      var size = (k === 0 ? 1.05 : 1) * (0.78 + r() * 0.42) * (per <= 4 ? 1.3 : per === 5 ? 1.15 : per >= 9 ? 0.72 : per >= 8 ? 0.8 : 1), rot = theme.text ? (r() * 40 - 20) : (r() * 90 - 45);
      var col = theme.text ? 'color:' + TCOL[(s + id) % TCOL.length] + ';' : '';
      h += '<button type="button" class="sp-sym' + (o.hi === s ? ' hi' : '') + (theme.text ? ' txt' : '') + (theme.syms[s].length > 1 ? ' two' : '') + (/^[ˊˇˋ˙]$/.test(theme.syms[s]) ? ' mark' : '') + '" data-s="' + s + '" data-h="s' + s + '" style="left:' + cx + '%;top:' + cy + '%;' + col + '--z:' + size.toFixed(2) + ';--r:' + rot.toFixed(0) + 'deg">' + face(theme, s, o.hi === s ? id : o.vs, n) + '</button>';
    });
    return h + '</div>';
  }

  function make(gid, theme) {
    /* 這個版本要用的牌：有 apart 的話，拿掉同時有其中兩個以上符號的牌（它們剛好都在同一張，拿掉後任兩張牌仍只有一個相同） */
    var IDSC = {};
    function idsFor(n) {
      if (IDSC[n]) return IDSC[n]; var D = DECKS[n];
      return IDSC[n] = D.map(function (_, i) { return i; }).filter(function (i) { return !theme.apart || D[i].filter(function (x) { return theme.apart.indexOf(x) >= 0; }).length < 2; });
    }
    var IDS = idsFor(5);
    var LVS = [['6', '⭐⭐ 標準：每張牌 6 個' + (theme.text ? '字' : '圖案') + '（原本的難度）'], ['4', '⭐ 入門：每張牌 4 個（牌少、容易找）'], ['5', '⭐ 簡單：每張牌 5 個']];
    var HAS8 = theme.syms.length >= 73;
    if (HAS8) LVS.push(['8', '⭐⭐⭐ 挑戰：每張牌 8 個（找很久！）'], ['9', '⭐⭐⭐⭐ 高手：每張牌 9 個（眼力大考驗）']);
    var REASONS = { most: '拿到最多張牌', tie: '拿到的牌一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
    function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
    function finish(g) {
      var a = alive(g), best = -1, bw = -1, tie = false;
      a.forEach(function (s) { if (g.won[s] > bw) { bw = g.won[s]; best = s; tie = false; } else if (g.won[s] === bw) tie = true; });
      g.res = tie ? { w: -1, why: 'tie', note: '每個人拿到：' + a.map(function (s) { return g.won[s]; }).join('、') + ' 張' } : { w: best, why: 'most', note: '拿到 ' + bw + ' 張牌' };
    }
    var mod = {
      seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], ver: 1, fitZoom: false,
      opts: [{ k: 'lv', label: '關卡難度（每張牌的' + (theme.text ? '字' : '圖案') + '數）：', list: LVS, note: '左右兩張牌的數量一定一樣多，任兩張牌仍然剛好只有一個一樣' }],
      reasons: REASONS,
      /* 個人練習：過完一關後，問要不要挑戰更難的下一關 */
      levelInfo: function (v) { var nm = { '4': '入門・4 個', '5': '簡單・5 個', '6': '標準・6 個', '8': '挑戰・8 個', '9': '高手・9 個' }, ord = ['4', '5', '6', '8', '9'], i = ord.indexOf(v.lv); return { cur: nm[v.lv] || '', next: i >= 0 && i < ord.length - 1 ? nm[ord[i + 1]] : null }; },
      levelUp: function (o) { var ord = ['4', '5', '6', '8', '9'], i = ord.indexOf(String(o.lv || '6')); return { lv: ord[Math.min(ord.length - 1, i + 1)] }; },
      levelDesc: ['反應很慢，大約 10 秒才找到', '大約 7 秒找到', '大約 5 秒找到', '大約 3 秒就找到，眼睛很利'],
      seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
      seatColor: function (i) { return SEATC[i % SEATC.length]; },
      init: function (n, o) {
        n = Math.max(2, Math.min(6, n || 4));
        var pn = LV2N[(o && o.lv) || '6'] || 5; if (DECKS[pn].length > theme.syms.length) pn = 5;
        var d = shuffle(idsFor(pn).slice());
        var g = { lv: String(Object.keys(LV2N).filter(function (k) { return LV2N[k] === pn; })[0] || 6), pn: pn, np: n, top: [], won: [], frz: [], out: [], pile: d, center: null, last: null, lockAt: 0, cnt: 0, res: null };
        for (var s = 0; s < n; s++) { g.top.push(d.pop()); g.won.push(0); g.frz.push(0); }
        g.center = g.pile.pop();
        return g;
      },
      turnSeat: function () { return -1; },
      /* 搶答遊戲：沒有輪流，所以不做思考倒數；提示、小提醒照常（由老師端統一控制） */
      noTimer: true,
      acting: function (g) { return g.res ? [] : alive(g); },
      hintDesc: '這一款的提示就是答案：會把「我的牌」和「中間的牌」上一樣的那個' + (theme.text ? '字' : '圖案') + '亮出黃框並直接告訴你。提示只針對當下中間這張牌，換牌後就消失。',
      tipDesc: '發呆一下子時，提醒你「先盯住自己牌上的一個' + (theme.text ? '字' : '圖案') + '，去中間那張找，找不到就換下一個」的找法。',
      hint: function (g, seat) {
        if (g.res || g.center == null || g.out.indexOf(seat) >= 0) return null;
        var a = common(g.top[seat], g.center, g.pn);
        return { msg: '兩張牌一樣的是「' + theme.syms[a] + '」，快點它！（它在兩張牌上都亮黃框）', hl: ['s' + a] };
      },
      nudge: function (g, seat) {
        if (g.res || g.center == null || g.out.indexOf(seat) >= 0) return null;
        return '找不到嗎？先盯住「我的牌」上的一個' + (theme.text ? '字' : '圖案') + '，到中間那張去找；沒有就換下一個。記得大小和方向都會不一樣喔！';
      },
      forfeit: function (g, seat) { knock(g, seat, 'left'); },
      teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
      view: function (g, seat) {
        var now = Date.now();
        return { lv: g.lv, pn: g.pn, np: g.np, top: g.top, center: g.center, left: g.pile.length, won: g.won, out: g.out, last: g.last, cnt: g.cnt, turn: -1,
          counts: g.won, frz: seat >= 0 ? Math.max(0, g.frz[seat] - now) : 0, lock: Math.max(0, g.lockAt - now) };
      },
      act: function (g, seat, d, notify) {
        if (g.res || g.out.indexOf(seat) >= 0) return false;
        if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
        if (d.t !== 'tap' || d.c !== g.cnt) return false;   // 牌已經換了，這一下不算
        var now = Date.now();
        if (now < g.frz[seat] || now < g.lockAt) return false;
        var ans = common(g.top[seat], g.center, g.pn);
        if (+d.s !== ans) { g.frz[seat] = now + FREEZE; return true; }
        g.last = { w: seat, s: ans, card: g.center, n: g.cnt };
        g.won[seat]++; g.top[seat] = g.center; g.cnt++;
        g.lockAt = now + LOCK;
        if (!g.pile.length) { g.center = null; finish(g); } else g.center = g.pile.pop();
        return true;
      },
      botTurn: function (g, seat) {
        if (g.res || g.center == null || g.out.indexOf(seat) >= 0) return null;
        return { t: 'tap', s: common(g.top[seat], g.center, g.pn), c: g.cnt };
      },
      /* 電腦的反應時間（毫秒），會再乘上老師設定的速度 */
      botWait: function (g, seat, lv) {
        var base = [9000, 6500, 4500, 2800][Math.max(0, Math.min(3, (lv || 1) - 1))];
        return base + Math.random() * 2500 + Math.max(0, g.lockAt - Date.now());
      },
      hostView: function (g) {
        var h = '<div class="sp-host">' + (g.center != null ? cardHTML(theme, g.center, { cls: 'mini', n: g.pn }) : '<em>牌拿完了</em>') + '<div class="sp-host-seats">';
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
      cw.innerHTML = v.center != null ? cardHTML(theme, v.center, { cls: 'center', n: v.pn, vs: seat >= 0 ? v.top[seat] : null }) : '<div class="sp-card empty">🏁</div>';
      cbox.appendChild(cw); area.appendChild(cbox);
      if (seat >= 0) {
        var mbox = el('div', 'sp-slot');
        mbox.appendChild(el('div', 'sp-lbl', '我的牌'));
        var mw = el('div', 'sp-wrap');
        var hi = locked && v.last && v.last.w === seat ? v.last.s : null;
        mw.innerHTML = cardHTML(theme, v.top[seat], { cls: 'mine', n: v.pn, hi: hi, vs: v.center });
        mw.firstChild.style.borderColor = SEATC[seat];
        mbox.appendChild(mw); area.appendChild(mbox);
      }
      if (frozen) area.appendChild(el('div', 'sp-ice', '❄️'));
      area.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.sp-sym'); if (!b) return;
        if (tb.res || out || seat < 0 || v.center == null) return;
        var t = Date.now(); if (L.frzUntil > t || L.lockUntil > t || L.sent === v.cnt) return;
        var s = +b.getAttribute('data-s');
        var ans = common(v.top[seat], v.center, v.pn);
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
    var demo = '<figure class="g-fig sp-demo">' + cardHTML(theme, A, { hi: common(A, B), vs: B }) + cardHTML(theme, B, { hi: common(A, B), vs: A }) +
      '<figcaption>這兩張牌只有「' + theme.syms[common(A, B)] + '」一樣（大小和方向可能不同）</figcaption></figure>';
    var thing = theme.text ? '字' : '圖案';
    mod.guide = {
      student: [
        { h: '怎麼玩', html:
          '<ol><li>每個人有一張<b>「我的牌」</b>，桌子中間有一疊<b>「中間的牌」</b>。</li>' +
          '<li>每張圓牌上有好幾個' + thing + '（數量依老師選的難度，一般是 6 個）。<b>任何兩張牌，都剛好只有一個' + thing + '一樣</b>。</li>' +
          '<li>大家同時開始找：找出「我的牌」和「中間的牌」一樣的那個' + thing + '，<b>點一下</b>（點哪一張牌上的都可以）。</li>' +
          '<li>最快點對的人，就把中間那張牌拿走，它變成你新的「我的牌」，中間再翻出下一張。</li>' +
          '<li><b>點錯會暫停 2 秒</b>，不會扣分，但這 2 秒別人可能就搶走了，所以要看清楚再點！</li></ol>' + '<div class="g-figs">' + demo + '</div>' },
        { h: '怎麼贏', html: '<p>中間的牌全部被拿完時，<b>拿到最多張的人獲勝</b>。一樣多就平手。</p><p>上方的小圓點旁邊的數字，就是每個人目前拿到幾張。</p>' },
        { h: '小技巧', html: '<ul><li>' + thing + '的<b>大小和方向</b>每張都不一樣，別被騙了！</li><li>先盯住自己牌上的一個' + thing + '，再去中間的牌找它；找不到就換下一個。</li><li>不要亂點：點錯要等 2 秒，反而更慢。</li></ul>' },
        { h: '計分方式', html: '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 拿最多張</td><td>3 分</td></tr><tr><td>🤝 平手</td><td>1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>分數會自動加進老師大螢幕上的積分榜（和電腦玩的不列入總分）。</p>' }
      ],
      teacher: [
        { h: '主持流程', html: '<ol><li>在首頁點「眼明手快（' + theme.name + '）」開房間，投影 QR code。</li><li>選「每桌人數」（2～6 人），學生掃碼輸入學號，系統自動分桌。</li><li>在 QR code 上方可以選<b>關卡難度</b>：每張牌上有 4、5、6（標準）' + '、8 或 9' + ' 個' + thing + '，數量越多越難找，牌的張數也不同（4 個：13 張、5 個：21 張、6 個：' + IDS.length + ' 張' + '、8 個：57 張、9 個：73 張' + '）。左右兩張牌的數量一定一樣多，其他規則都不變。</li><li>一局大約 2～4 分鐘（標準難度）。</li><li>老師端每一桌會顯示中間的牌和每個人拿到幾張。</li></ol>' },
        { h: '版本與教學重點', html: '<ul><li><b>圖案版</b>：動物、水果、交通工具，暖身用，人人都能玩。</li><li><b>注音版</b>：31 個注音符號，ㄅㄆ、ㄉㄊ、ㄋㄌ、ㄓㄗ、ㄢㄣ 等長得像的都在裡面，可以練習<b>字形辨識</b>。容易搞混的 <b>ㄇ、ㄈ、ㄩ</b>：畫面上只要出現，一定是兩張牌上同一個符號（就是答案），不會一邊 ㄇ 一邊 ㄈ。</li><li><b>注音版的高關卡</b>（每張牌 8、9 個）：符號不夠，會加入 ㄧ、ㄤ、ㄥ、聲調符號和 ㄅㄚ、ㄆㄞ 這類兩個符號的拼音，一起練習辨識。</li><li><b>國字版</b>：人入、大太天夫、日目白自、木本未末、土士王玉、千干、田由甲申 等形近字，練習<b>看清楚筆畫</b>。</li><li><b>個人練習</b>：每打完一關，會問要「挑戰更難的下一關」還是「繼續挑戰同一關」。</li><li>點錯暫停 2 秒、不扣分：鼓勵學生「看清楚再點」，而不是亂猜。</li><li>可以在學生找到後，請他說出那個注音或國字的讀音，或用國字造詞。</li></ul>' },
        { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦大約多久找到</th></tr><tr><td>🐣 入門</td><td>約 10 秒</td></tr><tr><td>🙂 簡單</td><td>約 7 秒</td></tr><tr><td>🤔 普通</td><td>約 5 秒</td></tr><tr><td>🔥 困難</td><td>約 3 秒</td></tr></table><p>左側「電腦出牌速度」也會影響電腦反應：選「🐌 最慢」電腦會再慢 3 倍多，適合剛開始練習的學生。</p>' }
      ]
    };
    /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
    if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
    BG.register(gid, mod);
  }
  Object.keys(THEMES).forEach(function (k) { make(k, THEMES[k]); });
  window.SPOT = { DECKS: DECKS, DECK: DECK, common: common, THEMES: THEMES, face: face };
})();
