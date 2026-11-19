/* 賓果：自己把數字填進格子，輪流喊數字，大家找到並圈起來，先連成指定條數的線就贏 */
(function () {
  'use strict';
  var REASONS = { bingo: '先連成指定條數的線', resign: '認輸', left: '其他人都離開了', teacher: '老師結束這局' };
  var ZY = ['ㄅ', 'ㄆ', 'ㄇ', 'ㄈ', 'ㄉ', 'ㄊ', 'ㄋ', 'ㄌ', 'ㄍ', 'ㄎ', 'ㄏ', 'ㄐ', 'ㄑ', 'ㄒ', 'ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ', 'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄜ', 'ㄝ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄡ', 'ㄢ', 'ㄣ', 'ㄤ', 'ㄥ', 'ㄦ'];
  function zcat(x) { return x <= 21 ? 0 : x <= 24 ? 1 : 2; }
  var ZCOL = ['#c2410c', '#15803d', '#1d4ed8'], ZNAME = ['聲符', '介音', '韻符'];
  var SEATC = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#e03131', '#f08c00'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function seq(n) { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; }
  function lineList(n) {
    var L = [], i, j, a;
    for (i = 0; i < n; i++) { a = []; for (j = 0; j < n; j++) a.push(i * n + j); L.push(a); }
    for (j = 0; j < n; j++) { a = []; for (i = 0; i < n; i++) a.push(i * n + j); L.push(a); }
    a = []; for (i = 0; i < n; i++) a.push(i * n + i); L.push(a);
    a = []; for (i = 0; i < n; i++) a.push(i * n + (n - 1 - i)); L.push(a);
    return L;
  }
  /* 回傳已完成的線（陣列的陣列）。mark：以格子編號為 key 的圈選表 */
  function doneLines(n, mark) { return lineList(n).filter(function (l) { return l.every(function (i) { return mark[i]; }); }); }
  function marks(g, s) { var m = {}, b = g.boards[s]; for (var i = 0; i < b.length; i++) if (g.circ[s][b[i]]) m[i] = 1; return m; }
  function lineCount(g, s) { return doneLines(g.n, marks(g, s)).length; }
  function startGame(g) {
    g.phase = 'play'; g.caller = Math.floor(Math.random() * g.np); g.cur = null; g.cnt++;
  }
  function finishRound(g) {   // 所有人都圈完目前的數字：判斷有沒有人達標，沒有就換下一位喊
    var ws = [];
    for (var s = 0; s < g.np; s++) if (!g.gone[s] && lineCount(g, s) >= g.need) ws.push(s);
    if (ws.length) g.res = ws.length === 1 ? { w: ws[0], why: 'bingo' } : { ws: ws, why: 'bingo' };
    else {
      nextCaller(g); g.cur = null;
      if (g.hist.length >= g.tot) g.res = { w: -1, why: 'bingo' };
    }
  }
  function nextCaller(g) { for (var k = 0; k < g.np; k++) { g.caller = (g.caller + 1) % g.np; if (!g.gone[g.caller]) return; } }
  function autoAck(g) { if (!g.sym || g.cur == null) return; for (var s = 0; s < g.np; s++) if (g.boards[s].indexOf(g.cur) < 0) g.circ[s][g.cur] = 1; if (g.circ.every(function (c) { return c[g.cur]; })) finishRound(g); }
  function autoGone(g) { for (var s = 0; s < g.np; s++) if (g.gone[s] && g.cur != null) g.circ[s][g.cur] = 1; }
  function greedyPick(g, s, noise) {
    var b = g.boards[s], m = marks(g, s), lines = lineList(g.n), best = [], bv = -1;
    for (var i = 0; i < b.length; i++) {
      var x = b[i]; if (g.circ[s][x]) continue;
      var v = 0; lines.forEach(function (l) { if (l.indexOf(i) < 0) return; var c = 0; l.forEach(function (k) { if (m[k]) c++; }); v += c * c + 1; });
      v += Math.random() * noise;
      if (v > bv) { bv = v; best = [x]; }
    }
    return best.length ? best[0] : null;
  }
  function uncalled(g) { return seq(g.tot).filter(function (x) { return g.called.indexOf(x) < 0; }); }

  function build(ID, SYM) {
  var PL = SYM ? SYM.length : 0;
  function lab(x) { return SYM ? SYM[x - 1] : String(x); }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 900, ver: 1,
    reasons: REASONS,
    levelDesc: ['隨便喊數字', '有時候會挑對自己有利的數字', '會挑讓自己快連線的數字', '很會算，專挑自己最快連線的數字'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    opts: SYM ? [
      { k: 'size', label: '賓果盤大小：', list: [['5', '5×5（25 個符號）'], ['3', '3×3（9 個符號）'], ['4', '4×4（16 個符號）'], ['6', '6×6（36 個符號）']], note: '注音符號共 37 個（聲符 21、介音 3、韻符 13）。每個人的盤子由系統從中隨機挑符號、隨機填好，每個符號在同一張盤子只出現一次' },
      { k: 'lines', label: '連線幾條就贏：', list: [['auto', '標準（邊長，例如 5×5 要 5 條）'], ['1', '1 條'], ['2', '2 條'], ['3', '3 條'], ['4', '4 條'], ['5', '5 條'], ['6', '6 條'], ['7', '7 條'], ['8', '8 條']], note: '橫、直、斜都算一條（斜線最多 2 條）。超過這張盤子能連的最多條數時，會自動改成最多' },
      { k: 'hintsec', label: '找不到符號的提示：', list: [['8', '8 秒後亮出所在的橫排'], ['5', '5 秒後'], ['12', '12 秒後'], ['0', '不提示']], note: '喊出符號後，同學要自己在盤上找到並點一下圈起來。超過這個時間還沒找到，會亮出符號所在的那一橫排，再過一樣的時間會亮出那一直排' }
    ] : [
      { k: 'size', label: '賓果盤大小：', list: [['5', '5×5（1～25）'], ['3', '3×3（1～9）'], ['4', '4×4（1～16）'], ['6', '6×6（1～36）'], ['7', '7×7（1～49）'], ['8', '8×8（1～64）'], ['9', '9×9（1～81）'], ['10', '10×10（1～100）']], note: '數字是 1 到格子總數，每個數字只會出現一次' },
      { k: 'lines', label: '連線幾條就贏：', list: [['auto', '標準（邊長，例如 5×5 要 5 條）'], ['1', '1 條'], ['2', '2 條'], ['3', '3 條'], ['4', '4 條'], ['5', '5 條'], ['6', '6 條'], ['7', '7 條'], ['8', '8 條'], ['9', '9 條'], ['10', '10 條']], note: '橫、直、斜都算一條（斜線最多 2 條）。超過這張盤子能連的最多條數時，會自動改成最多' },
      { k: 'fill', label: '數字怎麼填：', list: [['manual', '同學自己填'], ['auto', '系統隨機填好']], note: '同學自己填：每個人把數字填進自己選的格子（也有隨機填滿按鈕）。系統隨機填好：不用填，直接開始' },
      { k: 'hintsec', label: '找不到數字的提示：', list: [['8', '8 秒後亮出所在的橫排'], ['5', '5 秒後'], ['12', '12 秒後'], ['0', '不提示']], note: '喊出數字後，同學要自己在盤上找到並點一下圈起來。超過這個時間還沒找到，會亮出數字所在的那一橫排，再過一樣的時間會亮出那一直排' }
    ],
    init: function (n, o) {
      o = o || {};
      n = Math.max(2, Math.min(6, n || 4));
      var sz = Math.max(3, Math.min(SYM ? 6 : 10, +o.size || 5)), cells = sz * sz, tot = SYM ? PL : cells, maxL = 2 * sz + 2;
      var need = o.lines === 'auto' || !o.lines ? sz : Math.max(1, Math.min(maxL, +o.lines || sz));
      var g = { np: n, n: sz, tot: tot, need: need, fill: SYM || o.fill === 'auto' ? 'auto' : 'manual', cells: cells, sym: !!SYM, hintsec: o.hintsec == null ? 8 : Math.max(0, +o.hintsec || 0),
        phase: 'fill', boards: [], ready: [], circ: [], called: [], hist: [], caller: 0, cur: null, cnt: 0, res: null, bots: o._bots || [], gone: [] };
      for (var s = 0; s < n; s++) { g.boards.push(SYM ? shuffle(seq(tot)).slice(0, cells) : shuffle(seq(tot))); g.ready.push(g.fill === 'auto' || !!g.bots[s]); g.circ.push({}); }
      if (g.ready.every(function (r) { return r; })) startGame(g);
      return g;
    },
    turnSeat: function (g) { return g.caller; },
    acting: function (g) {
      if (g.res) return [];
      var r = [], s;
      if (g.phase === 'fill') { for (s = 0; s < g.np; s++) if (!g.ready[s] && !g.gone[s]) r.push(s); return r; }
      if (g.cur == null) return [g.caller];
      for (s = 0; s < g.np; s++) if (!g.circ[s][g.cur] && !g.gone[s]) r.push(s);
      return r;
    },
    turnKey: function (g) { return g.phase + ':' + g.hist.length + ':' + (g.cur == null ? 'c' : 'r'); },
    forfeit: function (g, seat) {
      if (g.res || g.gone[seat]) return;
      g.gone[seat] = true;
      var alive = []; for (var s = 0; s < g.np; s++) if (!g.gone[s]) alive.push(s);
      if (alive.length <= 1) { g.res = alive.length ? { w: alive[0], why: 'left' } : { w: -1, why: 'left' }; return; }
      if (g.phase === 'fill') { g.boards[seat] = shuffle(seq(g.tot)); g.ready[seat] = true; g.cnt++; if (g.ready.every(function (r) { return r; })) startGame(g); return; }
      if (g.caller === seat && g.cur == null) nextCaller(g);
      autoGone(g); g.cnt++;
      if (g.cur != null && g.circ.every(function (c) { return c[g.cur]; })) finishRound(g);
    },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    autoPlay: function (g, seat) {
      if (g.res) return null;
      if (g.phase === 'fill') return { t: 'ready', b: shuffle(seq(g.tot)) };
      if (g.cur == null) { var u = uncalled(g); return g.caller === seat && u.length ? { t: 'call', x: u[Math.floor(Math.random() * u.length)], n: g.cnt } : null; }
      return g.circ[seat][g.cur] ? null : { t: 'circle', x: g.cur };
    },
    view: function (g, seat) {
      var me = seat >= 0 && seat < g.np ? seat : 0, lines = [];
      for (var s = 0; s < g.np; s++) lines.push(g.phase === 'play' || g.res ? lineCount(g, s) : 0);
      return { np: g.np, n: g.n, tot: g.tot, need: g.need, fill: g.fill, hintsec: g.hintsec, phase: g.phase, board: g.boards[me], ready: g.ready, circ: Object.keys(g.circ[me]).map(Number),
        cur: g.cur, caller: g.caller, hist: g.hist.slice(-10), called: g.called.slice(), nCalled: g.called.length, lines: lines, cnt: g.cnt, circled: g.circ.map(function (c) { return g.cur != null && !!c[g.cur]; }) };
    },
    act: function (g, seat, d, notify) {
      if (g.res || seat < 0 || seat >= g.np) return false;
      var i;
      if (d.t === 'resign') { g.res = g.np === 2 ? { w: 1 - seat, why: 'resign' } : g.res; return g.np === 2; }
      if (g.phase === 'fill') {
        if (d.t === 'unready') { if (!g.ready[seat] || g.fill === 'auto' || g.bots[seat]) return false; g.ready[seat] = false; g.cnt++; return true; }
        if (d.t !== 'ready' || g.ready[seat] || !Array.isArray(d.b) || d.b.length !== g.tot) return false;
        var seen = {}; for (i = 0; i < d.b.length; i++) { var x = d.b[i]; if (!(x >= 1 && x <= g.tot) || x !== Math.floor(x) || seen[x]) { notify(seat, '每個數字都要填一次，而且不能重複喔'); return false; } seen[x] = 1; }
        g.boards[seat] = d.b.slice(); g.ready[seat] = true; g.cnt++;
        if (g.ready.every(function (r) { return r; })) startGame(g);
        return true;
      }
      if (d.t === 'call') {
        if (g.caller !== seat || g.cur != null || d.n !== g.cnt) return false;
        var v = +d.x;
        if (!(v >= 1 && v <= g.tot) || v !== Math.floor(v)) { notify(seat, SYM ? '請選一個注音符號' : '要喊 1 到 ' + g.tot + ' 的數字喔'); return false; }
        if (g.called.indexOf(v) >= 0) { notify(seat, lab(v) + ' 已經被圈起來了，請換一個' + (SYM ? '符號' : '數字')); return false; }
        g.called.push(v); g.hist.push({ s: seat, x: v }); g.cur = v; g.cnt++;
        autoGone(g); autoAck(g);
        return true;
      }
      if (d.t === 'circle') {
        if (g.cur == null || g.circ[seat][g.cur]) return false;
        if (+d.x !== g.cur) { notify(seat, '現在要圈的是 ' + lab(g.cur) + ' 喔'); return false; }
        g.circ[seat][g.cur] = 1; g.cnt++;
        if (g.circ.every(function (c) { return c[g.cur]; })) finishRound(g);
        return true;
      }
      return false;
    },
    hostAct: function (g, d) {
      if (g.res) return false;
      if (d.t === 'force' && g.phase === 'fill') {
        for (var s = 0; s < g.np; s++) if (!g.ready[s]) { g.boards[s] = shuffle(seq(g.tot)); g.ready[s] = true; }
        startGame(g); return true;
      }
      if (d.t === 'draw' && g.phase === 'play' && g.cur == null) {
        var u = uncalled(g); if (!u.length) return false;
        var x = u[Math.floor(Math.random() * u.length)];
        g.called.push(x); g.hist.push({ s: g.caller, x: x, d: 1 }); g.cur = x; g.cnt++; autoGone(g); autoAck(g); return true;
      }
      if (d.t === 'circleAll' && g.cur != null) {
        for (var q = 0; q < g.np; q++) g.circ[q][g.cur] = 1;
        g.cnt++; finishRound(g); return true;
      }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.phase !== 'play') return null;
      if (g.cur != null) return g.circ[seat][g.cur] ? null : { t: 'circle', x: g.cur };
      if (g.caller !== seat) return null;
      var u = uncalled(g); if (!u.length) return null;
      var x = lv <= 1 || (lv === 2 && Math.random() < .5) ? null : greedyPick(g, seat, lv === 4 ? .5 : 3);
      if (x == null || g.called.indexOf(x) >= 0) x = u[Math.floor(Math.random() * u.length)];
      return { t: 'call', x: x, n: g.cnt };
    },
    hintDesc: '喊出數字後，亮出那個數字在你賓果盤上的位置。',
    tipDesc: '發呆太久時，提醒你現在該做什麼（填數字、喊數字，或找數字圈起來）。',
    hint: function (g, seat) {
      if (g.res || g.phase !== 'play') return null;
      if (g.cur != null && !g.circ[seat][g.cur]) { var i = g.boards[seat].indexOf(g.cur); return { msg: '要圈的是「' + lab(g.cur) + '」，亮黃框的格子就是！自己點一下把它圈起來。', hl: ['c' + i] }; }
      if (g.cur == null && g.caller === seat) { var x = greedyPick(g, seat, 0); var hl = x != null ? ['c' + g.boards[seat].indexOf(x)] : []; return { msg: '輪到你喊' + (SYM ? '符號' : '數字') + '。喊「' + lab(x) + '」會讓你更接近連線，亮黃框是它在你盤子上的位置。', hl: hl }; }
      return null;
    },
    nudge: function (g, seat) {
      if (g.res) return null;
      if (g.phase === 'fill') return g.ready[seat] ? null : '請把數字填進格子：點一格，打上數字按 Enter；填滿後按「我填好了」。不想填可以按「隨機填滿」。';
      if (g.cur == null) return g.caller === seat ? (SYM ? '輪到你喊符號：點下面或盤子上一個還沒有被圈起來的符號，再按「喊！」。' : '輪到你喊數字：在輸入框打一個還沒有被圈起來的數字，再按「喊！」。') : null;
      return g.circ[seat][g.cur] ? null : '現在要圈的是「' + lab(g.cur) + '」，請在你的賓果盤上找到它，點一下圈起來。';
    },
    hostView: function (g) {
      var h = '<div class="bg-host">';
      for (var s = 0; s < g.np; s++) { var c = g.phase === 'play' || g.res ? lineCount(g, s) : 0; h += '<div class="bg-hrow"><i style="background:' + SEATC[s] + '"></i><b>' + (s + 1) + '</b><span>' + (g.phase === 'fill' ? (g.ready[s] ? '✔ 填好了' : '填數字中…') : c + ' / ' + g.need + ' 條') + '</span></div>'; }
      return h + '<div class="bg-hcur">' + (g.cur != null ? '剛喊：<b>' + lab(g.cur) + '</b>' : '') + '</div></div>';
    },
    hostStatus: function (g) {
      if (g.phase === 'fill') return { t: '填數字中（' + g.ready.filter(Boolean).length + '/' + g.np + ' 人完成）', c: '' };
      var ws = g.cur != null ? '・剛喊 ' + lab(g.cur) : '';
      return { t: g.n + '×' + g.n + '・已喊 ' + g.called.length + ' 個' + ws, c: '' };
    }
  };
  mod.hostTable = function (T, API) {
    var g = T.g, box = el('div', 'bg-ht');
    function btn(text, fn) { var b = el('button', 'btn small', text); b.type = 'button'; b.addEventListener('click', fn); box.appendChild(b); }
    if (g.phase === 'fill' && !g.res) btn('⏩ 直接開始（沒填完的自動隨機填滿）', function () { API.act(T, { t: 'force' }); API.render(); });
    if (g.phase === 'play' && g.cur == null && !g.res) btn('🎲 幫輪到喊的同學隨機抽一個還沒被圈起來的號碼', function () { API.act(T, { t: 'draw' }); API.render(); });
    if (g.phase === 'play' && g.cur != null && !g.res) btn('✔ 幫所有人圈起目前的數字（' + g.cur + '）', function () { API.act(T, { t: 'circleAll' }); API.render(); });
    return box;
  };

  /* ---------- 學生端 ---------- */
  var L = { round: -1, draft: null, sel: -1, key: '', at: 0, curKey: '', curAt: 0, sent: '', typed: '', msg: '' };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.draft = null; L.sel = -1; L.curKey = ''; L.sent = ''; L.typed = ''; }
    var k = v.phase + ':' + v.nCalled + ':' + (v.cur == null ? 'c' : 'r');
    if (prev && L.key && L.key !== k && v.cur != null) { fx.snd('turn'); }
    if (prev && L.key && L.key !== k && v.cur == null && v.phase === 'play' && v.caller === tb.seat) { fx.snd('turn'); L.typed = ''; }
    L.key = k;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '賓果盤 ' + v.n + '×' + v.n + '，要連成 ' + v.need + ' 條線');
  };
  mod.onReject = function () { L.sent = ''; };
  function drawBoard(tb, v, ctx, opt) {
    var n = v.n, mk = {}, cs = {}, i;
    var circSet = {}; v.circ.forEach(function (x) { circSet[x] = 1; });
    var hint = opt.clue || {};
    for (i = 0; i < v.board.length; i++) if (circSet[v.board[i]]) mk[i] = 1;
    var dl = doneLines(n, mk); dl.forEach(function (l) { l.forEach(function (c) { cs[c] = 1; }); });
    var bd = el('div', 'bg-bd' + (SYM ? ' sym' : '')); bd.style.setProperty('--n', n);
    var h = '';
    for (i = 0; i < n * n; i++) {
      var x = v.board[i], cls = 'bg-cell' + (mk[i] ? ' on' : '') + (cs[i] ? ' line' : '') + (opt.selNum && x === opt.selNum ? ' sel' : '') + (hint.row === Math.floor(i / n) ? ' crow' : '') + (hint.col === i % n ? ' ccol' : '') + (opt.cur != null && x === opt.cur && !mk[i] && opt.live ? ' tgt' : '');
      h += '<div class="' + cls + '" data-i="' + i + '" data-h="c' + i + '">' + (x ? '<span class="num"' + (SYM ? ' style="color:' + ZCOL[zcat(x)] + '"' : '') + '>' + lab(x) + '</span>' : '') + (mk[i] ? '<i class="ring"></i>' : '') + '</div>';
    }
    bd.innerHTML = h;
    return { bd: bd, lines: dl.length };
  }
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, n = v.n, now = Date.now();
    var wrap = el('div', 'bg-table');
    var bar = el('div', 'bg-bar');
    for (var s = 0; s < v.np; s++) {
      var chip = el('span', 'bg-chip' + (s === seat ? ' me' : '') + (v.phase === 'play' && s === v.caller && !tb.res ? ' turn' : ''));
      var dot = el('i'); dot.style.background = SEATC[s]; chip.appendChild(dot);
      chip.appendChild(el('span', '', s === seat ? '我' : short(tb, s)));
      chip.appendChild(el('b', '', v.phase === 'fill' ? (v.ready[s] ? '✔' : '…') : v.lines[s] + '/' + v.need));
      bar.appendChild(chip);
    }
    wrap.appendChild(bar);
    if (v.phase === 'fill') { wrap.classList.add('fill'); return renderFill(box, wrap, ctx); }

    /* ----- 遊戲中 ----- */
    var myCall = !tb.res && v.cur == null && v.caller === seat, mine = v.cur != null && v.circ.indexOf(v.cur) >= 0;
    var live = !tb.res && v.cur != null && !mine; if (myCall) wrap.classList.add('call'); if (myCall && SYM) wrap.classList.add('symc');
    var ck = tb.round + ':' + v.nCalled; if (v.cur != null && L.curKey !== ck) { L.curKey = ck; L.curAt = now; }
    var waited = v.cur != null ? now - L.curAt : 0, hs = v.hintsec * 1000, clue = {};
    if (live && hs > 0) {
      var idx = v.board.indexOf(v.cur);
      if (waited >= hs) clue.row = Math.floor(idx / n);
      if (waited >= hs * 2) clue.col = idx % n;
      var nxt = waited < hs ? hs - waited : waited < hs * 2 ? hs * 2 - waited : 0;
      if (nxt > 0) setTimeout(function () { ctx.rerender(); }, nxt + 50);
    }
    var call = el('div', 'bg-call' + (live ? ' live' : ''));
    if (tb.res) call.innerHTML = '<small>對局結束</small>';
    else if (v.cur != null) call.innerHTML = '<small>' + who(tb, v.caller) + ' 喊：' + (SYM ? '（' + ZNAME[zcat(v.cur)] + '）' : '') + '</small><b' + (SYM ? ' style="color:' + ZCOL[zcat(v.cur)] + '"' : '') + '>' + lab(v.cur) + '</b><small>' + (mine ? '你已經圈起來了，等其他人…' : '找到後，點一下圈起來') + '</small>';
    else call.innerHTML = '<small>' + (myCall ? '輪到你喊' + (SYM ? '符號' : '數字') + '！' : '等 ' + who(tb, v.caller) + ' 喊數字…') + '</small>';
    wrap.appendChild(call);
    var res = drawBoard(tb, v, ctx, { cur: v.cur, live: live, clue: clue, selNum: myCall && +L.typed >= 1 ? +L.typed : 0 });
    var bx = el('div', 'bn-board'); bx.appendChild(BG.zoom('bingo', res.bd)); wrap.appendChild(bx);
    bx.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-i]'); if (!c || tb.res) return;
      var i = +c.getAttribute('data-i'), x = v.board[i];
      if (v.cur == null) {
        if (!myCall) return;
        if (v.circ.indexOf(x) >= 0) { ctx.snd('error'); ctx.toast(lab(x) + ' 已經被圈起來了，請換一個'); return; }
        if (+L.typed === x) { ctx.send('call', { x: x, n: v.cnt }); return; }
        L.typed = String(x); ctx.snd('tap'); ctx.rerender(); return;
      }
      if (mine || v.circ.indexOf(x) >= 0) return;
      if (x !== v.cur) { ctx.snd('error'); ctx.toast('現在要圈的是 ' + lab(v.cur) + ' 喔'); return; }
      if (L.sent === ck) return;
      L.sent = ck; ctx.snd('tap'); ctx.send('circle', { x: x }); ctx.rerender();
    });
    var info = el('div', 'bg-info');
    info.appendChild(el('span', '', '我已連成 ' + res.lines + ' 條，要 ' + v.need + ' 條'));
    if (v.hist.length) { var hs2 = el('span', 'bg-hist'); hs2.textContent = '剛喊過：' + v.hist.slice().reverse().slice(0, 6).map(function (h) { return lab(h.x); }).join('、'); info.appendChild(hs2); }
    wrap.appendChild(info);
    if (myCall && SYM) {
      var pal = el('div', 'bg-pal'), called = {}; v.called.forEach(function (x) { called[x] = 1; });
      for (var z = 1; z <= PL; z++) { var pb = el('button', 'bg-sym' + (called[z] ? ' used' : '') + (+L.typed === z ? ' sel' : ''), ZY[z - 1]); pb.type = 'button'; pb.setAttribute('data-z', z); pb.style.color = ZCOL[zcat(z)]; pal.appendChild(pb); }
      pal.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-z]'); if (!b) return; var z = +b.getAttribute('data-z');
        if (called[z]) { ctx.send('call', { x: z, n: v.cnt }); return; }
        if (+L.typed === z) { ctx.send('call', { x: z, n: v.cnt }); return; }
        L.typed = String(z); ctx.snd('tap'); ctx.rerender();
      });
      wrap.appendChild(pal);
      var go2 = ctx.button('bg-btn go', L.typed ? '喊「' + lab(+L.typed) + '」！' : '先選一個符號', function () { if (L.typed) ctx.send('call', { x: +L.typed, n: v.cnt }); }); go2.disabled = !L.typed; var r2 = el('div', 'bg-in'); r2.appendChild(go2); wrap.appendChild(r2);
      wrap.appendChild(el('p', 'bg-note', '點一個還沒被圈起來的符號（點一下選起來，再點一下或按「喊！」就喊出去）。點到已經圈起來的符號，只有你會收到通知。'));
    } else if (myCall) {
      var row = el('div', 'bg-in'), inp = document.createElement('input');
      inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = 1; inp.max = v.tot; inp.placeholder = '1～' + v.tot; inp.value = L.typed;
      inp.addEventListener('input', function () { L.typed = inp.value; });
      var go = ctx.button('bg-btn go', '喊！', function () { var x = +inp.value; if (!inp.value || !(x >= 1 && x <= v.tot)) { ctx.toast('請打 1 到 ' + v.tot + ' 的數字'); return; } ctx.send('call', { x: x, n: v.cnt }); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.click(); });
      row.appendChild(inp); row.appendChild(go); wrap.appendChild(row);
      wrap.appendChild(el('p', 'bg-note', '打一個還沒被圈起來的數字，或直接點盤子上還沒圈起來的數字（點一下選起來，再點一下或按「喊！」就喊出去）。如果那個數字已經被圈起來了，只有你會收到通知，換一個就好。'));
    }
    if (!tb.res) { var tools = el('div', 'bg-tools'); tools.appendChild(ctx.emoteButton('bg-btn')); wrap.appendChild(tools); }
    box.appendChild(wrap);
    if (myCall) setTimeout(function () { var i = wrap.querySelector('.bg-in input'); if (i && document.activeElement !== i && !L.typed) { try { i.focus({ preventScroll: true }); } catch (e) {} } }, 150);
  };

  function renderFill(box, wrap, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, n = v.n, tot = v.tot;
    if (!L.draft || L.draft.length !== tot) { L.draft = v.ready[seat] ? v.board.slice() : new Array(tot).fill(0); }
    var d = L.draft, done = v.ready[seat];
    var cnt = 0, mx = 0; d.forEach(function (x) { if (x) { cnt++; if (x > mx) mx = x; } });
    var call = el('div', 'bg-call');
    call.innerHTML = done ? '<small>你填好了，等其他同學…</small>' : cnt < tot ? '<small>依序點格子：下一個數字是</small><b>' + (mx + 1) + '</b>' : '<small>全部填好了！確認沒問題就按「我填好了」</small>';
    wrap.appendChild(call);
    L.sel = -1;
    var res = drawBoard(tb, { n: n, board: d, circ: [] }, ctx, { fill: false });
    var bx = el('div', 'bn-board'); bx.appendChild(BG.zoom('bingo', res.bd)); wrap.appendChild(bx);
    bx.addEventListener('click', function (e) {
      var c = e.target.closest && e.target.closest('[data-i]'); if (!c || done) return;
      var i = +c.getAttribute('data-i');
      if (d[i]) { if (d[i] === mx) { d[i] = 0; ctx.snd('tap'); ctx.rerender(); } else ctx.toast('要照順序，只能取消最後填的那一格（或按「↩ 上一步」）'); return; }
      if (cnt >= tot) return;
      d[i] = mx + 1; ctx.snd('tap'); ctx.rerender();
    });
    if (!done) {
      wrap.appendChild(el('div', 'bg-note', '點的順序就是數字的順序：第 1 個點的格子是 1，第 2 個點的是 2……'));
      var tools = el('div', 'bg-tools');
      var un = ctx.button('bg-btn', '↩ 上一步', function () { for (var i = 0; i < tot; i++) if (d[i] === mx) { d[i] = 0; break; } ctx.rerender(); }); un.disabled = !cnt; tools.appendChild(un);
      tools.appendChild(ctx.button('bg-btn', '🎲 隨機填滿剩下的', function () {
        var used = {}; d.forEach(function (x) { if (x) used[x] = 1; });
        var rest = shuffle(seq(tot).filter(function (x) { return !used[x]; }));
        for (var i = 0; i < tot; i++) if (!d[i]) d[i] = rest.pop();
        ctx.snd('pop'); ctx.rerender();
      }));
      tools.appendChild(ctx.button('bg-btn', '🗑 全部重填', function () { L.draft = new Array(tot).fill(0); ctx.rerender(); }));
      var rd = ctx.button('bg-btn go', '✔ 我填好了', function () { ctx.send('ready', { b: d.slice() }); }); rd.disabled = cnt < tot; tools.appendChild(rd);
      wrap.appendChild(tools);
    } else {
      var tl = el('div', 'bg-tools'); tl.appendChild(ctx.button('bg-btn', '↩️ 我還想改', function () { ctx.send('unready'); L.draft = null; })); tl.appendChild(ctx.emoteButton('bg-btn')); wrap.appendChild(tl);
    }
    box.appendChild(wrap);
  }
  BG.register(ID, mod);
  }
  build('bingo', null);
  build('zhuyin-bingo', ZY);
})();
