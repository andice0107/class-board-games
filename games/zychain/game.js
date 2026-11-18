/* 拼音大挑戰（暫名）：用聲母、介音、韻母、聲調卡，在底版上拼出「真實存在的拼音」，先把手牌出完的人獲勝。
   玩法機制參考市面上的注音拼音桌遊，名稱、牌面、美術與文字都是原創。
   - 底版四格：聲母（紅）、介音（黃）、韻母（藍）、聲調（綠）。一次出一張牌，放進對應顏色的格子（換掉原本那張），
     放完之後底版上拼出來的音必須是真實存在的拼音（資料來自教育部國語辭典，見 syllables.js）。聲調格空著＝一聲。
   - 老師可選：場上已有的符號能不能再出、沒牌可出時是一直抽到能出還是只抽一張、限時、要不要功能牌、能不能查拼音表。
   - 功能牌：迴轉（順序反向）、指定（指定任一位玩家出牌）、空白（蓋住底版任一格，一聲就是蓋住聲調）、
     機會（出牌時隨機抽出 11 種效果之一：丟牌、轉運、罰抽、送牌、換牌、大放送、再一次、跳過、偷看、均富、重發）、ㄦ（清空底版，把ㄦ放在韻母格）。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2a7bd4', '#2a9d6f', '#e0a020', '#8e44ad', '#16a2b8'];
  var REASONS = { out: '先把手牌出完', time: '時間到，手牌最少', tie: '手牌一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和', stall: '打了很久了，手牌最少的贏' };
  var SLOTS = ['c', 'm', 'v', 't'], SNAME = { c: '聲母', m: '介音', v: '韻母', t: '聲調' };
  var TONEMARK = { '2': 'ˊ', '3': 'ˇ', '4': 'ˋ', '5': '˙' }, TONEOF = { 'ˊ': '2', 'ˇ': '3', 'ˋ': '4', '˙': '5' };
  var FN = { rev: ['迴轉', '🔄', '順序反過來'], pick: ['指定', '👉', '指定任何一位玩家出牌'], blank: ['空白', '⬜', '蓋住底版一格'], chance: ['機會', '🎲', '抽一個隨機效果'], er: ['ㄦ', '✨', '清空底版'] };
  var FNCOUNT = { rev: 3, pick: 3, blank: 5, chance: 3, er: 2 };
  var CFX = { cut: ['丟牌', '把自己的兩張手牌丟到牌堆底'], spin: ['轉運', '手牌全放到牌堆底，重抽同樣張數'], fine: ['罰抽', '指定一位玩家抽 2 張牌'], gift: ['送牌', '送一張手牌給指定玩家'], swap: ['換牌', '和指定玩家各從對方手上隨機抽一張來互換'], drop: ['大放送', '每位至少有 2 張手牌的玩家，各丟一張牌到牌堆底'], again: ['再一次', '自己再出一張牌'], skip: ['跳過', '指定一位玩家，下次輪到他時跳過'], peek: ['偷看', '偷看指定玩家最多 3 張手牌（只有你看得到）'], rich: ['均富', '手牌比最多的人少的玩家，都抽到和他一樣多'], redeal: ['重發', '所有手牌收回洗牌，由你指定誰拿第一張，並決定順時鐘或逆時鐘發牌'] };
  var ORDER = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦˊˇˋ˙';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- 拼音檢查（底版和牌都用這幾個函式，老師端、學生端、電腦玩家一致） ---------- */
  function realCard(c) { return c && !(c.k === 'f' && c.f === 'blank'); }
  function sylOf(board) {
    var base = '';
    ['c', 'm', 'v'].forEach(function (s) { if (realCard(board[s])) base += board[s].p; });
    var tone = realCard(board.t) ? TONEOF[board.t.p] : '1';
    var ok = !!base && !!window.ZYT && !!window.ZYT[base] && window.ZYT[base].indexOf(tone) >= 0;
    var text = base ? (tone === '5' ? '˙' + base : base + (TONEMARK[tone] || '')) : '';
    return { base: base, tone: tone, text: text, ok: ok };
  }
  function seenSyms(board) { var a = []; SLOTS.forEach(function (s) { if (realCard(board[s])) a.push(board[s].p); }); return a; }
  /* 把 card 放進 slot（或把 slot 蓋住）之後的結果；why＝'repeat'（符號重複）或 'bad'（拼不出真的拼音） */
  function tryPlace(board, repeat, card, slot) {
    var nb = {}; SLOTS.forEach(function (s) { nb[s] = board[s]; });
    if (card.k === 'f' && card.f === 'blank') { if (!board[slot] || !realCard(board[slot])) return { ok: false, why: 'empty' }; nb[slot] = card; }
    else {
      if (!repeat && seenSyms(board).indexOf(card.p) >= 0) return { ok: false, why: 'repeat', sym: card.p };
      nb[card.k] = card;
    }
    var sy = sylOf(nb); return sy.ok ? { ok: true, syl: sy, board: nb } : { ok: false, why: 'bad', syl: sy };
  }
  /* 這手牌現在所有能出的動作（沒有就要抽牌） */
  function legal(board, repeat, hand, me, others) {
    var out = [];
    hand.forEach(function (c) {
      if (c.k === 'f') {
        if (c.f === 'blank') SLOTS.forEach(function (s) { if (tryPlace(board, repeat, c, s).ok) out.push({ t: 'play', c: c.i, slot: s }); });
        else if (c.f === 'pick') others.forEach(function (o) { out.push({ t: 'play', c: c.i, to: o }); });
        else out.push({ t: 'play', c: c.i });
      } else if (tryPlace(board, repeat, c, c.k).ok) out.push({ t: 'play', c: c.i });
    });
    return out;
  }
  function cardById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].i === id) return list[i]; return null; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function others(g, s) { return alive(g).filter(function (x) { return x !== s; }); }
  function nextSeat(g, s) { for (var k = 1; k <= g.np; k++) { var n = ((s + g.dir * k) % g.np + g.np) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function movesOf(g, s) { return legal(g.board, g.repeat, g.hands[s], s, others(g, s)); }

  /* ---------- 牌堆 ---------- */
  function buildDeck(fn) {
    var d = [], id = 0, D = window.ZYD;
    ['c', 'm', 'v'].forEach(function (k) { Object.keys(D[k]).forEach(function (p) { for (var n = 0; n < D[k][p]; n++) d.push({ i: id++, k: k, p: p }); }); });
    Object.keys(D.t).forEach(function (t) { for (var n = 0; n < D.t[t]; n++) d.push({ i: id++, k: 't', p: TONEMARK[t] }); });
    if (fn) Object.keys(FNCOUNT).forEach(function (f) { for (var n = 0; n < FNCOUNT[f]; n++) d.push({ i: id++, k: 'f', f: f, p: f === 'er' ? 'ㄦ' : FN[f][0] }); });
    return shuffle(d);
  }
  function draw1(g) {
    if (!g.deck.length && g.disc.length) { g.deck = shuffle(g.disc.splice(0)); }
    return g.deck.length ? g.deck.pop() : null;
  }

  /* ---------- 回合與結束 ---------- */
  function finishBy(g, why) {
    var a = alive(g), best = 99, top = [];
    a.forEach(function (s) { var n = g.hands[s].length; if (n < best) { best = n; top = [s]; } else if (n === best) top.push(s); });
    if (top.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
    else if (top.length > 1) g.res = { ws: top, why: why, note: '剩 ' + best + ' 張' };
    else g.res = { w: top[0], why: why, note: '剩 ' + best + ' 張' };
  }
  function advance(g, from, to) {   // 一個回合結束：換人，順便處理限時
    g.cnt++; g.turns = (g.turns || 0) + 1;
    if (g.turns > g.np * 60) { finishBy(g, 'stall'); return; }   // 打太久了（每人 60 回合）還沒結束：手牌最少的贏
    if (g.lastTurns != null) { g.lastTurns--; if (g.lastTurns <= 0) { finishBy(g, 'time'); return; } }
    else if (g.dl && Date.now() > g.dl) { g.lastTurns = alive(g).length - 1; if (g.lastTurns <= 0) { finishBy(g, 'time'); return; } }
    g.turn = to != null && g.out.indexOf(to) < 0 ? to : nextSeat(g, from);
    var gu = 0; while (g.skips && g.skips[g.turn] && gu++ < g.np) { var sk = g.turn; delete g.skips[sk]; g.last = { s: sk, k: 'skipped' }; g.turn = nextSeat(g, sk); }
  }
  function startClock(g) { if (!g.dl && g.limit) g.dl = Date.now() + g.limit; }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.deck = g.hands[seat].concat(g.deck); g.hands[seat] = [];
    if (g.pend && g.pend.s === seat) g.pend = null; if (g.peek && g.peek.s === seat) g.peek = null; if (g.skips) delete g.skips[seat];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) { g.turn = nextSeat(g, seat); g.cnt++; }
  }

  var mod = {
    seats: 4, seatOptions: [3, 4, 5, 6], seatDefault: 4, botSeats: [2, 5], botDelay: 1300,
    reasons: REASONS,
    levelDesc: ['常常亂出，有牌就出', '有牌就出，會留著功能牌', '會挑讓下一位比較難接的拼音', '會算下一位難不難接，也會用功能牌擋人'],
    opts: [
      { k: 'repeat', label: '場上已經有的符號：', list: [['no', '❌ 不能再出一樣的符號（原版）'], ['yes', '⭕ 可以再出（簡單版）']], note: '例如場上已經有「ㄅ」，不能再出另一張「ㄅ」' },
      { k: 'draw', label: '沒有牌可以出時：', list: [['until', '🃏 一直抽，抽到能出為止（原版）'], ['one', '🃏 一輪只抽一張，換下一位']] },
      { k: 'limit', label: '限時：', list: [['15', '⏱️ 15 分鐘'], ['10', '⏱️ 10 分鐘'], ['20', '⏱️ 20 分鐘'], ['0', '不限時']], note: '時間到，這一輪打完就結算，手牌最少的人贏；沒到時間就是先出完的人贏' },
      { k: 'fn', label: '功能牌：', list: [['all', '✨ 有（迴轉、指定、空白、機會、ㄦ）'], ['none', '沒有（只有注音牌）']] },
      { k: 'idx', label: '查拼音表：', list: [['yes', '📖 學生可以查'], ['no', '不給查（比較難）']] }
    ],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(3, Math.min(6, n || 4));
      var fn = o.fn !== 'none', deck = buildDeck(fn);
      var g = { np: n, repeat: o.repeat === 'yes', drawMode: o.draw === 'one' ? 'one' : 'until', limit: (+o.limit === 0 ? 0 : (+o.limit || 15)) * 60000, dl: null, lastTurns: null, idx: o.idx !== 'no', fn: fn,
        deck: deck, disc: [], hands: [], board: { c: null, m: null, v: null, t: null }, out: [], turn: 0, dir: 1, last: null, cnt: 0, res: null, stall: 0, pend: null, peek: null, skips: {} };
      for (var s = 0; s < n; s++) g.hands.push(deck.splice(deck.length - 7, 7));
      var guard = 0, c0;
      while (guard++ < 400) { c0 = deck.pop(); if (c0.k === 'c' || c0.k === 'm' || c0.k === 'v') break; deck.unshift(c0); }   // 第一張底牌：功能牌和聲調牌放回牌堆底
      g.board[c0.k] = c0; g.deck = deck;
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var left = g.dl ? Math.max(0, g.dl - Date.now()) : null;
      return { np: g.np, repeat: g.repeat, drawMode: g.drawMode, idx: g.idx, board: g.board, turn: g.turn, dir: g.dir, hand: seat >= 0 ? g.hands[seat] : null,
        counts: g.hands.map(function (h) { return h.length; }), left: g.deck.length + g.disc.length, last: g.last, out: g.out, cnt: g.cnt, tl: left, limit: g.limit, ending: g.lastTurns != null, res: !!g.res, pend: g.pend ? { s: g.pend.s, fx: g.pend.fx } : null, peek: g.peek && g.peek.s === seat ? { to: g.peek.to, cards: g.peek.cards } : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      if (g.pend && d.t !== 'chfx') return false;
      if (d.t === 'chfx') return chfx(g, seat, d);
      if (g.peek && g.peek.s === seat) g.peek = null;
      if (d.t === 'draw') {
        startClock(g);
        var got = 0, c;
        if (movesOf(g, seat).length) {   // 有牌能出卻選擇不出：抽一張，這個回合就結束（想把好牌留著）
          c = draw1(g); if (c) { g.hands[seat].push(c); got++; }
          g.last = { s: seat, k: 'draw', n: got, vol: true }; g.stall++; if (g.stall >= alive(g).length * 3) { g.cnt++; finishBy(g, 'stall'); return true; }
          advance(g, seat); return true;
        }
        if (g.drawMode === 'one') { c = draw1(g); if (c) { g.hands[seat].push(c); got++; } g.last = { s: seat, k: 'draw', n: got }; g.stall++; if (g.stall >= alive(g).length * 3) { g.cnt++; finishBy(g, 'stall'); return true; } advance(g, seat); return true; }
        while ((c = draw1(g))) { g.hands[seat].push(c); got++; if (movesOf(g, seat).length) break; }
        g.last = { s: seat, k: 'draw', n: got };
        if (movesOf(g, seat).length) { g.cnt++; return true; }   // 抽到能出的牌了：還是這個人的回合，接著出牌
        g.stall++; if (g.stall >= alive(g).length * 3) { g.cnt++; finishBy(g, 'stall'); return true; }
        advance(g, seat); return true;
      }
      if (d.t !== 'play') return false;
      var h = g.hands[seat], c0 = cardById(h, d.c); if (!c0) return false;
      var next = null, info = { s: seat, k: 'play', c: c0 };
      if (c0.k === 'f') {
        if (c0.f === 'rev') { g.dir = -g.dir; info.k = 'rev'; }
        else if (c0.f === 'pick') { if (d.to == null || d.to === seat || g.out.indexOf(d.to) >= 0 || d.to < 0 || d.to >= g.np) return false; next = d.to; info.k = 'pick'; info.to = d.to; }
        else if (c0.f === 'blank') { var tp = tryPlace(g.board, g.repeat, c0, d.slot); if (!tp.ok) return false; c0.under = g.board[d.slot]; g.board[d.slot] = c0; info.k = 'blank'; info.slot = d.slot; h.splice(h.indexOf(c0), 1); g.last = info; return finishPlay(g, seat, next); }
        else if (c0.f === 'chance') {
          h.splice(h.indexOf(c0), 1); g.disc.push(c0);
          if (!h.length) { g.last = info; return finishPlay(g, seat, null); }
          return rollChance(g, seat, info);
        }
        else if (c0.f === 'er') {
          SLOTS.forEach(function (s) { var x = g.board[s]; if (x) { if (x.under) { g.disc.push(x.under); x.under = null; } g.disc.push(x); } g.board[s] = null; });
          h.splice(h.indexOf(c0), 1); g.board.v = c0; info.k = 'er'; g.last = info; return finishPlay(g, seat, next);
        }
        h.splice(h.indexOf(c0), 1); g.disc.push(c0);
      } else {
        var tp2 = tryPlace(g.board, g.repeat, c0, c0.k); if (!tp2.ok) return false;
        var old = g.board[c0.k]; if (old) { if (old.under) { g.disc.push(old.under); old.under = null; } g.disc.push(old); }
        g.board[c0.k] = c0; h.splice(h.indexOf(c0), 1);
      }
      g.last = info;
      return finishPlay(g, seat, next);
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat) return null;
      if (g.pend && g.pend.s === seat) return botFx(g, seat, lv);
      var mv = movesOf(g, seat);
      if (!mv.length) return { t: 'draw', n: g.cnt };
      var h = g.hands[seat], mine = function (m) { return cardById(h, m.c); };
      var normal = mv.filter(function (m) { return mine(m).k !== 'f'; }), fnm = mv.filter(function (m) { return mine(m).k === 'f'; });
      var pick;
      if (lv <= 1) pick = mv[Math.floor(Math.random() * mv.length)];
      else {
        var pool = normal.length ? normal : fnm;
        if (lv >= 3 && normal.length) {   // 挑出完後，下一位比較難接的
          var best = null;
          normal.forEach(function (m) { var c = mine(m), tp = tryPlace(g.board, g.repeat, c, m.slot || c.k), score = 0; if (tp.ok) score = ease(tp.board, g.repeat) + Math.random() * 3; if (best == null || score < best.s) best = { m: m, s: score }; });
          if (best) pool = [best.m];
        }
        if (lv >= 4 && h.length <= 3 && normal.length) pool = normal;
        pick = pool[Math.floor(Math.random() * pool.length)];
      }
      var c = mine(pick), a = { t: 'play', c: c.i, n: g.cnt };
      if (pick.slot) a.slot = pick.slot;
      if (c.f === 'pick') {
        var os = others(g, seat), tgt = os[Math.floor(Math.random() * os.length)];
        if (lv >= 3) { tgt = os.slice().sort(function (x, y) { return g.hands[y].length - g.hands[x].length; })[0]; }   // 指定手牌最多的（離獲勝最遠）
        a.to = tgt;
      }
      if (c.f === 'rev' && lv >= 3) { var nx = nextSeat(g, seat); if (g.hands[nx].length > 3) { var other = mv.filter(function (m) { return mine(m).f !== 'rev'; }); if (other.length) { var m2 = other[0], c2 = mine(m2); a = { t: 'play', c: c2.i, n: g.cnt }; if (m2.slot) a.slot = m2.slot; if (c2.f === 'pick') a.to = others(g, seat)[0]; } } }
      return a;
    },
    hintDesc: '會把「現在可以出」的手牌亮起來，不會告訴你放哪裡；如果沒有牌可以出，會提醒你抽牌。',
    tipDesc: '輪到你卻還沒出牌時，提醒你怎麼操作（不會透露哪張能出）。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      if (g.pend && g.pend.s === seat) return { msg: '先完成機會牌的效果，照畫面上的提示操作。', hl: [] };
      var mv = movesOf(g, seat);
      if (!mv.length) return { msg: '你的牌現在都沒辦法拼出真的拼音，按「抽牌」吧。', hl: [] };
      var hl = []; mv.forEach(function (m) { var k = String(m.c); if (hl.indexOf(k) < 0) hl.push(k); });
      return { msg: '亮框的手牌現在可以出。想一想：放進對應的格子，底版上會拼出什麼音？', hl: hl };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      return '輪到你了：看看手上的牌，放進底版對應顏色的格子後，能不能拼出真的拼音？可以的話選牌再按「出牌」；都不行就按「抽牌」。';
    },
    hostView: function (g) {
      var sy = sylOf(g.board), h = '<div class="zc-host"><div class="zc-host-b">';
      var cell = function (s) { var c = g.board[s]; return '<span class="zc-m k-' + s + '">' + (c ? (realCard(c) ? esc(c.p) : '⬜') : '') + '</span>'; };
      h += '<div class="zc-hcol">' + cell('c') + cell('m') + cell('v') + '</div>' + cell('t');
      h += '</div><div class="zc-host-s">' + (sy.ok ? esc(sy.text) : esc(sy.text || '…')) + '</div><div class="zc-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="zc-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + (s === g.turn && !g.res ? ' on' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length + ' 張') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '牌堆剩 ' + (g.deck.length + g.disc.length) + ' 張' + (g.lastTurns != null ? '・⏱️最後一輪' : ''), c: '' }; }
  };
  /* ---------- 機會牌：出牌時隨機抽一個效果 ---------- */
  function toBottom(g, cards) { g.deck.unshift.apply(g.deck, cards); }
  function rollChance(g, seat, info) {
    var h = g.hands[seat], os = others(g, seat), list = ['spin', 'fine', 'again', 'skip', 'rich', 'redeal', 'drop'];
    if (h.length >= 2) list.push('cut', 'gift');
    if (os.some(function (o) { return g.hands[o].length; })) list.push('swap', 'peek');
    var fx = list[Math.floor(Math.random() * list.length)], next = null;
    info.k = 'chance'; info.fx = fx;
    if (fx === 'spin') {
      var n = h.length, old = h.splice(0), c;
      for (var i = 0; i < n; i++) { c = draw1(g) || old.pop(); h.push(c); }
      toBottom(g, old); info.n = n;
    } else if (fx === 'drop') {
      var cn = 0; alive(g).forEach(function (s) { var hh = g.hands[s]; if (hh.length >= 2) { toBottom(g, hh.splice(Math.floor(Math.random() * hh.length), 1)); cn++; } }); info.n = cn;
    } else if (fx === 'again') { next = seat; }
    else if (fx === 'rich') {
      var mx = 0; alive(g).forEach(function (s) { mx = Math.max(mx, g.hands[s].length); });
      alive(g).forEach(function (s) { while (g.hands[s].length < mx) { var c2 = draw1(g); if (!c2) break; g.hands[s].push(c2); } }); info.mx = mx;
    } else { g.pend = { s: seat, fx: fx }; info.pend = true; g.last = info; g.stall = 0; startClock(g); g.cnt++; return true; }
    g.last = info; return finishPlay(g, seat, next);
  }
  function chfx(g, seat, d) {
    var p = g.pend; if (!p || p.s !== seat) return false;
    var h = g.hands[seat], info = { s: seat, k: 'chance', fx: p.fx }, to = d.to;
    var okT = to != null && to !== seat && to >= 0 && to < g.np && g.out.indexOf(to) < 0;
    if (p.fx === 'cut') {
      if (!Array.isArray(d.two) || d.two.length !== 2 || d.two[0] === d.two[1]) return false;
      var a = cardById(h, d.two[0]), b = cardById(h, d.two[1]); if (!a || !b) return false;
      h.splice(h.indexOf(a), 1); h.splice(h.indexOf(b), 1); toBottom(g, [a, b]);
    } else if (p.fx === 'fine') {
      if (!okT) return false; for (var i = 0; i < 2; i++) { var c = draw1(g); if (c) g.hands[to].push(c); } info.to = to;
    } else if (p.fx === 'gift') {
      var gc = cardById(h, d.card); if (!okT || !gc || h.length < 2) return false; h.splice(h.indexOf(gc), 1); g.hands[to].push(gc); info.to = to;
    } else if (p.fx === 'swap') {
      if (!okT || !g.hands[to].length || !h.length) return false;
      var ia = Math.floor(Math.random() * h.length), ib = Math.floor(Math.random() * g.hands[to].length), t = h[ia]; h[ia] = g.hands[to][ib]; g.hands[to][ib] = t; info.to = to;
    } else if (p.fx === 'skip') {
      if (!okT) return false; g.skips[to] = 1; info.to = to;
    } else if (p.fx === 'peek') {
      if (!okT || !g.hands[to].length) return false; g.peek = { s: seat, to: to, cards: shuffle(g.hands[to].slice()).slice(0, 3) }; info.to = to;
    } else if (p.fx === 'redeal') {
      var dir = d.dir === -1 ? -1 : 1, first = d.first, pool = []; if (first == null || first < 0 || first >= g.np || g.out.indexOf(first) >= 0) return false; alive(g).forEach(function (s) { pool = pool.concat(g.hands[s]); g.hands[s] = []; }); shuffle(pool);
      var cur = first; pool.forEach(function (cd) { g.hands[cur].push(cd); for (var k = 1; k <= g.np; k++) { var n2 = ((cur + dir * k) % g.np + g.np) % g.np; if (g.out.indexOf(n2) < 0) { cur = n2; break; } } });
      info.dir = dir; info.first = first;
    } else return false;
    g.pend = null; g.last = info; return finishPlay(g, seat, null);
  }
  function finishPlay(g, seat, next) {
    g.stall = 0; startClock(g);
    if (!g.hands[seat].length) { g.cnt++; g.res = { w: seat, why: 'out' }; return true; }
    advance(g, seat, next); return true;
  }
  /* 電腦判斷用：底版現在有多容易接（下一位能出的符號種類） */
  function ease(board, repeat) {
    var n = 0, seen = repeat ? [] : seenSyms(board);
    ['c', 'm', 'v', 't'].forEach(function (k) {
      var list = k === 'c' ? 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ' : k === 'm' ? 'ㄧㄨㄩ' : k === 'v' ? 'ㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥ' : 'ˊˇˋ˙';
      Array.from(list).forEach(function (p) { if (seen.indexOf(p) >= 0) return; if (tryPlace(board, repeat, { k: k, p: p }, k).ok) n++; });
    });
    return n;
  }
  function botFx(g, seat, lv) {
    var h = g.hands[seat], os = others(g, seat), a = { t: 'chfx', n: g.cnt }, withCards = os.filter(function (o) { return g.hands[o].length; });
    var few = os.slice().sort(function (x, y) { return g.hands[x].length - g.hands[y].length; }), rnd = function (l) { return l[Math.floor(Math.random() * l.length)]; };
    var byWorth = h.slice().sort(function (x, y) { return worth(y) - worth(x); });
    switch (g.pend.fx) {
      case 'cut': a.two = [byWorth[0].i, byWorth[1].i]; break;
      case 'fine': a.to = lv >= 3 ? few[0] : rnd(os); break;
      case 'gift': a.card = byWorth[0].i; a.to = lv >= 3 ? few[0] : rnd(os); break;
      case 'swap': a.to = lv >= 3 ? withCards.sort(function (x, y) { return g.hands[x].length - g.hands[y].length; })[0] : rnd(withCards); break;
      case 'skip': a.to = lv >= 2 ? nextSeat(g, seat) : rnd(os); break;
      case 'peek': a.to = rnd(withCards); break;
      default: a.dir = Math.random() < .5 ? 1 : -1; a.first = alive(g)[Math.floor(Math.random() * alive(g).length)];
    }
    return a;
  }
  function worth(c) { return c.k === 'f' ? 0 : 1; }   // 機會牌丟掉的優先順序：注音牌先丟，功能牌留著

  /* ---------- 學生端 ---------- */
  var L = { rd: null, sel: null, two: [], round: -1, sent: -1, key: '', seen: {}, tl: null, tlT: 0, idx: false, tab: 'ㄅ', pickTo: false };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function cardEl(c, cls) {
    var b = el('button', 'zc-card k-' + c.k + (c.k === 'f' ? ' f-' + c.f : '') + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('data-c', String(c.i));
    if (c.k === 'f') { var f = FN[c.f]; if (c.f === 'er') { b.appendChild(el('b', 'zc-sym', 'ㄦ')); b.appendChild(el('small', '', '清場')); } else { b.appendChild(el('b', 'zc-ico', f[1])); b.appendChild(el('small', '', f[0])); } }
    else { b.appendChild(el('b', 'zc-sym' + (c.k === 't' ? ' tone' : ''), c.p)); b.appendChild(el('small', '', c.k === 't' ? { 'ˊ': '二聲', 'ˇ': '三聲', 'ˋ': '四聲', '˙': '輕聲' }[c.p] : SNAME[c.k])); }
    return b;
  }
  function chanceLog(tb, l) {
    var n = who(tb, l.s), f = CFX[l.fx], t = l.to != null ? who(tb, l.to) : '';
    if (l.pend) return n + ' 出了機會牌，抽到「' + f[0] + '」：' + f[1];
    var m = { cut: '丟了兩張牌到牌堆底', spin: '手牌放到牌堆底，重抽了 ' + l.n + ' 張', fine: t + ' 被罰抽 2 張', gift: '送了一張牌給 ' + t, swap: '和 ' + t + ' 互換了一張牌', drop: l.n + ' 位玩家各丟了一張牌到牌堆底', again: '要再出一張牌', skip: t + ' 下次輪到時會被跳過', peek: '偷看了 ' + t + ' 的牌', rich: '手牌少的人都抽到 ' + l.mx + ' 張', redeal: '手牌全部洗在一起，從 ' + (l.first != null ? who(tb, l.first) : '') + ' 開始' + (l.dir > 0 ? '順時鐘' : '逆時鐘') + '重發' }[l.fx];
    return n + ' 的機會「' + f[0] + '」：' + m;
  }
  function sylHTML(sy) { return esc(sy.text || '…'); }
  var ticking = false;
  function tick() { if (ticking) return; ticking = true; setInterval(function () { var t = document.querySelector('.zc-timer'); if (t && L.tl != null) t.textContent = '⏱️ ' + fmtT(L.tl - (Date.now() - L.tlT)); }, 1000); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.two = []; L.sent = -1; L.key = ''; L.seen = {}; L.pickTo = false; }
    L.tl = v.tl; L.tlT = Date.now();
    var key = v.cnt + ':' + (v.last ? v.last.k : '');
    if (prev && key !== L.key && v.last) {
      var s = v.last.s, nm = who(tb, s);
      if (v.last.k === 'draw') fx.snd('pop');
      else fx.snd(v.last.k === 'play' || v.last.k === 'er' || v.last.k === 'blank' ? 'move' : 'cap');
      if (v.last.k === 'pick' && v.last.to === tb.seat) fx.toast(nm + ' 指定你出牌！');
      else if (v.last.k === 'chance' && !v.last.pend && v.last.to === tb.seat && s !== tb.seat) fx.toast(nm + ' 對你用了機會「' + CFX[v.last.fx][0] + '」');
      else if (v.last.k === 'chance' && v.last.pend && s !== tb.seat) fx.toast(nm + ' 抽到機會「' + CFX[v.last.fx][0] + '」');
      else if (v.last.k === 'rev' && s !== tb.seat) fx.toast(nm + ' 出了迴轉，順序反過來了');
      else if (v.last.k === 'er' && s !== tb.seat) fx.toast(nm + ' 出了ㄦ，底版清空！');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '一次出一張牌，拼出真的拼音');
  };
  mod.onReject = function () { L.sent = -1; };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var hand = v.hand || [], sel = L.sel != null ? cardById(hand, L.sel) : null; if (!sel) { L.sel = null; if (!v.pend) L.two = []; }
    L.two = L.two.filter(function (id) { return cardById(hand, id); });
    var oth = []; for (var q = 0; q < v.np; q++) if (q !== seat && v.out.indexOf(q) < 0) oth.push(q);
    var mv = myTurn ? legal(v.board, v.repeat, hand, seat, oth) : [], stuck = myTurn && !v.pend && !mv.length;
    tick();
    var wrap = el('div', 'pk-table zc-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn && v.pend) {
      st.className = 'pk-status me';
      var pf = v.pend.fx, pn = CFX[pf][0];
      st.textContent = '機會「' + pn + '」：' + (pf === 'cut' ? '點兩張牌丟掉（' + L.two.length + '/2）' : pf === 'gift' ? '點一張牌，再選玩家' : pf === 'redeal' ? (L.rd == null ? '選誰拿第一張牌' : '選發牌方向') : '選一位玩家');
    } else if (myTurn) {
      st.className = 'pk-status me';
      st.textContent = stuck ? '沒有牌可以出，按「抽牌」' : !sel ? '輪到你：選一張手牌' : sel.f === 'blank' ? '點底版上要蓋住的格子' : sel.f === 'pick' ? '選一位玩家，讓他出牌' : '再按一次牌，或按「出牌」';
    } else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function () { return ''; }, short));
    // 底版
    var felt = el('div', 'zc-felt');
    var info = el('div', 'zc-info');
    var nx = (function () { for (var k = 1; k <= v.np; k++) { var n = ((v.turn + v.dir * k) % v.np + v.np) % v.np; if (v.out.indexOf(n) < 0) return n; } return v.turn; })();
    info.appendChild(el('span', 'zc-chip', '🃏 牌堆 ' + v.left));
    if (!tb.res) info.appendChild(el('span', 'zc-chip', '下一位：' + who(tb, nx)));
    if (v.limit) { var tm = el('span', 'zc-chip zc-timer', v.ending ? '⏱️ 最後一輪' : v.tl == null ? '⏱️ 開始後計時' : '⏱️ ' + fmtT(v.tl)); info.appendChild(tm); }
    felt.appendChild(info);
    var bd = el('div', 'zc-board'), bcol = el('div', 'zc-bcol');
    SLOTS.forEach(function (s) {
      var c = v.board[s], slot = el('div', 'zc-slot k-' + s + (sel && sel.k === s ? ' target' : '') + (sel && sel.f === 'blank' && c && realCard(c) ? ' cover' : ''));
      slot.setAttribute('data-slot', s);
      if (c) { var ce = realCard(c) ? cardEl(c) : (function () { var b = el('div', 'zc-card k-f f-blank'); b.appendChild(el('b', 'zc-ico', '⬜')); b.appendChild(el('small', '', '空白')); return b; })(); ce.classList.add('onboard'); ce.removeAttribute('data-c'); slot.appendChild(ce); }
      else slot.appendChild(el('span', 'zc-empty', SNAME[s]));
      if (!c) slot.appendChild(el('i', 'zc-tag', SNAME[s]));
      slot.addEventListener('click', function () {
        if (!myTurn || !sel || sel.f !== 'blank') return;
        if (!c || !realCard(c)) { ctx.toast('這一格本來就是空的'); return; }
        var tp = tryPlace(v.board, v.repeat, sel, s);
        if (!tp.ok) { ctx.toast('蓋住之後是「' + (tp.syl ? tp.syl.text || '（空）' : '') + '」，不是真的拼音'); ctx.snd('error'); return; }
        send({ t: 'play', c: sel.i, slot: s });
      });
      (s === 't' ? bd : bcol).appendChild(slot);
    });
    bd.insertBefore(bcol, bd.firstChild);
    felt.appendChild(bd);
    var sy = sylOf(v.board), rd = el('div', 'zc-syl' + (sy.ok ? ' ok' : ' frag')); rd.innerHTML = sylHTML(sy) + (sy.ok ? ' <i>✓</i>' : ''); felt.appendChild(rd);
    var lg = el('div', 'zc-log'), l = v.last;
    if (l) lg.textContent = l.k === 'draw' ? who(tb, l.s) + (l.vol ? ' 選擇不出牌，抽了 ' + l.n + ' 張' : ' 沒牌可出，抽了 ' + l.n + ' 張') : l.k === 'rev' ? who(tb, l.s) + ' 出了迴轉：順序反過來' : l.k === 'pick' ? who(tb, l.s) + ' 指定 ' + who(tb, l.to) + ' 出牌' : l.k === 'blank' ? who(tb, l.s) + ' 用空白蓋住「' + SNAME[l.slot] + '」' : l.k === 'chance' ? chanceLog(tb, l) : l.k === 'skipped' ? who(tb, l.s) + ' 被跳過了一次' : l.k === 'er' ? who(tb, l.s) + ' 出了ㄦ，底版清空' : who(tb, l.s) + ' 出了「' + (l.c.p) + '」';
    else lg.textContent = '底版上先翻開一張牌，輪流放進對應顏色的格子，拼出真的拼音';
    felt.appendChild(lg);
    if (v.peek) { var pk = el('div', 'zc-peek'); pk.appendChild(el('span', '', '👀 你偷看了 ' + who(tb, v.peek.to) + ' 的牌：')); v.peek.cards.forEach(function (c) { pk.appendChild(cardEl(c)); }); felt.appendChild(pk); }
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; L.sent = v.cnt; L.sel = null; L.two = []; L.pickTo = false; ctx.snd('move'); ctx.send(d.t === 'draw' ? 'draw' : 'play', d); ctx.rerender(); }
    function playSel() {
      if (!sel) return;
      if (sel.k !== 'f') {
        var tp = tryPlace(v.board, v.repeat, sel, sel.k);
        if (!tp.ok) { ctx.toast(tp.why === 'repeat' ? '場上已經有「' + tp.sym + '」了，這一局不能再出一樣的符號' : '放進去之後是「' + (tp.syl && tp.syl.text || '') + '」，不是真的拼音，再想想看！'); ctx.snd('error'); return; }
        send({ t: 'play', c: sel.i });
      } else if (sel.f === 'rev' || sel.f === 'er' || sel.f === 'chance') send({ t: 'play', c: sel.i });
    }
    // 手牌
    var me = el('div', 'pk-me zc-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot);
    top.appendChild(el('span', 'n', '我的手牌')); top.appendChild(el('span', 'pk-cnt', hand.length + ' 張')); me.appendChild(top);
    var hd = el('div', 'zc-hand'), n = hand.length, rows = n <= 4 ? 1 : n <= 10 ? 2 : n <= 18 ? 3 : 4, cols = Math.ceil(n / rows) || 1;
    hd.style.setProperty('--hw', Math.max(38, Math.min(88, Math.floor((Math.min(window.innerWidth || 390, 700) - 64) / cols) - 8)) + 'px');
    var sorted = hand.slice().sort(function (a, b) { var ka = 'cmvtf'.indexOf(a.k), kb = 'cmvtf'.indexOf(b.k); return ka - kb || ORDER.indexOf(a.p) - ORDER.indexOf(b.p) || a.i - b.i; });
    sorted.forEach(function (c) {
      var fresh = !L.seen[c.i] && Object.keys(L.seen).length > 0;
      var b = cardEl(c, (sel && sel.i === c.i ? 'sel' : '') + (L.two.indexOf(c.i) >= 0 ? ' two' : '') + (fresh ? ' fresh' : ''));
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (v.pend) { var pf2 = v.pend.fx; if (pf2 === 'cut') { var ix = L.two.indexOf(c.i); if (ix >= 0) L.two.splice(ix, 1); else if (L.two.length < 2) L.two.push(c.i); ctx.snd('tap'); ctx.rerender(); } else if (pf2 === 'gift') { L.two = L.two[0] === c.i ? [] : [c.i]; ctx.snd('tap'); ctx.rerender(); } return; }
        if (L.sel === c.i) { if (c.k !== 'f' || c.f === 'rev' || c.f === 'er' || c.f === 'chance') { playSel(); return; } L.sel = null; L.two = []; L.pickTo = false; ctx.snd('tap'); ctx.rerender(); return; }
        L.sel = c.i; L.two = []; ctx.snd('tap'); ctx.rerender();
      });
      hd.appendChild(b);
    });
    hand.forEach(function (c) { L.seen[c.i] = 1; });
    me.appendChild(hd);
    wrap.appendChild(me);
    // 指定：選玩家
    if (myTurn && sel && sel.f === 'pick') {
      var pr = el('div', 'zc-pick'); pr.appendChild(el('span', '', '指定誰出牌？'));
      oth.forEach(function (o) { pr.appendChild(ctx.button('pk-btn go', short(tb, o) + '（' + v.counts[o] + '張）', function () { send({ t: 'play', c: sel.i, to: o }); })); });
      wrap.appendChild(pr);
    }
    if (myTurn && v.pend) {
      var pf3 = v.pend.fx, pp = el('div', 'zc-pick');
      if (pf3 === 'redeal') {
        var alv = []; for (var q2 = 0; q2 < v.np; q2++) if (v.out.indexOf(q2) < 0) alv.push(q2);
        if (L.rd == null || alv.indexOf(L.rd) < 0) { pp.appendChild(el('span', '', '誰拿第一張牌？')); alv.forEach(function (o) { pp.appendChild(ctx.button('pk-btn go', o === tb.seat ? '我自己' : short(tb, o), function () { L.rd = o; ctx.rerender(); })); }); }
        else { pp.appendChild(el('span', '', who(tb, L.rd) + ' 拿第一張，方向：')); [[1, '↻ 順時鐘'], [-1, '↺ 逆時鐘']].forEach(function (x) { pp.appendChild(ctx.button('pk-btn go', x[1], function () { var f = L.rd; L.rd = null; send({ t: 'chfx', dir: x[0], first: f }); })); }); pp.appendChild(ctx.button('pk-btn', '重選', function () { L.rd = null; ctx.rerender(); })); }
        wrap.appendChild(pp);
      }
      else if (pf3 !== 'cut') {
        pp.appendChild(el('span', '', CFX[pf3][0] + '：選一位玩家'));
        oth.forEach(function (o) { pp.appendChild(ctx.button('pk-btn go', short(tb, o) + '（' + v.counts[o] + '張）', function () {
          if (pf3 === 'gift' && L.two.length !== 1) { ctx.toast('先點一張要送出的手牌'); return; }
          send({ t: 'chfx', to: o, card: pf3 === 'gift' ? L.two[0] : null }); })); });
        wrap.appendChild(pp);
      }
    }
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && !v.pend && stuck) tools.appendChild(ctx.button('pk-btn go', v.drawMode === 'one' ? '🃏 抽一張牌' : '🃏 抽牌（抽到能出為止）', function () { send({ t: 'draw' }); }));
      else if (myTurn && !v.pend) tools.appendChild(ctx.button('pk-btn', '🃏 不出，抽一張', function () { if (confirm('不出牌，抽一張牌，這回合就結束喔？')) send({ t: 'draw' }); }));
      if (myTurn && !v.pend && sel && (sel.k !== 'f' || sel.f === 'rev' || sel.f === 'er' || sel.f === 'chance')) tools.appendChild(ctx.button('pk-btn go', '出牌', playSel));
      if (myTurn && v.pend && v.pend.fx === 'cut') { var okb = ctx.button('pk-btn go', '確定丟這兩張', function () { if (L.two.length !== 2) { ctx.toast('要選兩張牌'); return; } send({ t: 'chfx', two: L.two.slice() }); }); if (L.two.length !== 2) okb.classList.add('dim'); tools.appendChild(okb); }
      if (v.idx) tools.appendChild(ctx.button('pk-btn', '📖 拼音表', function () { L.idx = true; ctx.rerender(); }));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
    [].forEach.call(document.querySelectorAll('.zc-idx'), function (n) { n.remove(); });
    if (L.idx && v.idx) indexOverlay(ctx); else L.idx = false;
  };
  /* 拼音表（像實體遊戲附的注音索引表）：照聲母分頁，列出所有真實存在的拼音 */
  function indexOverlay(ctx) {
    var o = el('div', 'zc-idx'), card = el('div', 'zc-idxbox'); o.appendChild(card);
    var hd = el('div', 'zc-idxhd'); hd.appendChild(el('b', '', '📖 拼音表（教育部國語辭典）'));
    var x = el('button', 'pk-btn small', '✕ 關閉'); x.type = 'button'; x.addEventListener('click', function () { L.idx = false; o.remove(); }); hd.appendChild(x); card.appendChild(hd);
    var tabs = el('div', 'zc-tabs'), body = el('div', 'zc-idxbody');
    var C = Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙ').concat(['無']);
    function show() {
      [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === L.tab); }); body.innerHTML = '';
      var tab = L.tab, keys = Object.keys(window.ZYT).filter(function (b) { return tab === '無' ? !/^[ㄅ-ㄙ]/.test(b) : b[0] === tab; }).sort();
      if (!keys.length) body.appendChild(el('p', '', '沒有'));
      keys.forEach(function (b) {
        var row = el('div', 'zc-idxrow'); row.appendChild(el('b', '', b));
        Array.from(window.ZYT[b]).forEach(function (t) { row.appendChild(el('span', 'zc-tn', t === '1' ? '一聲' : t === '5' ? '˙輕' : TONEMARK[t])); });
        body.appendChild(row);
      });
    }
    C.forEach(function (c) { var b = el('button', 'zc-tab', c === '無' ? '無聲母' : c); b.type = 'button'; b.setAttribute('data-t', c); b.addEventListener('click', function () { L.tab = c; show(); }); tabs.appendChild(b); });
    card.appendChild(tabs); card.appendChild(body); document.body.appendChild(o); show();
    mod._closeIdx = function () { o.remove(); };
  }
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res; if (!v || !r) return null;
    var lines = [r.ws ? '🏆 並列最少：' + r.ws.map(nm).join('、') + '（' + (r.note || '') + '）' : r.w >= 0 ? '🏆 獲勝：' + nm(r.w) + (r.why === 'out' ? '（手牌出完了）' : '（' + (r.note || '') + '）') : '🤝 手牌一樣多，平手'];
    var h = '<div class="zc-sum">'; for (var s = 0; s < v.np; s++) h += '<div class="zc-sumrow"><b>' + esc(nm(s)) + '</b>：' + (v.out.indexOf(s) >= 0 ? '認輸' : v.counts[s] + ' 張') + '</div>';
    lines.push({ html: h + '</div>' });
    return lines;
  };

  BG.register('zhuyin-chain', mod);
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人先拿 7 張手牌，底版上翻開一張牌。</li><li>底版有四格：<b style="color:#e5484d">聲母（紅）</b>、<b style="color:#c98a00">介音（黃）</b>、<b style="color:#2f6fe4">韻母（藍）</b>、<b style="color:#2aa66a">聲調（綠）</b>。</li><li>輪到你時，<b>一次出一張牌</b>：點一張手牌（亮出它要放的格子），再按「出牌」（或再點一次那張牌）。</li><li>放進去以後，底版上拼出來的要是<b>真的存在的拼音</b>，不是的話不能出。</li><li>聲調格空著就是<b>一聲</b>。</li><li>沒有牌可以出，就按「抽牌」。有牌可以出，也可以按「不出，抽一張」：抽一張牌，這回合就結束（想把好牌留著時用）。</li><li><b>先把手牌出完的人獲勝！</b></li></ol>' },
      { h: '注意', html: '<ul><li>放進格子會<b>換掉</b>那一格原本的牌。</li><li>如果老師選「不能出一樣的符號」，場上已經有的符號（例如「ㄅ」）就不能再出另一張一樣的。</li><li>不確定有沒有這個音？可以按「📖 拼音表」查（老師有開放才有）。</li><li>有限時的話，時間到後<b>這一輪打完就結束</b>，手牌最少的人贏。</li></ul>' },
      { h: '功能牌', html: '<table class="g-tbl"><tr><th>牌</th><th>效果</th></tr><tr><td>🔄 迴轉</td><td>出牌的順序反過來</td></tr><tr><td>👉 指定</td><td>你決定讓哪一位玩家（不能是自己）出牌</td></tr><tr><td>⬜ 空白</td><td>蓋住底版上的一格，蓋住後底版仍要是真的拼音。蓋住聲調格＝一聲</td></tr><tr><td>🎲 機會</td><td>出牌後<b>隨機抽出一個效果</b>（見下表）。只剩這一張牌時直接出完獲勝。</td></tr><tr><td>✨ ㄦ</td><td>清空整個底版，把ㄦ放在韻母格</td></tr></table><p>功能牌隨時都可以出（空白要蓋完還是真的拼音）。</p><p><b>機會牌的 11 種效果：</b></p><table class="g-tbl">' + Object.keys(CFX).map(function (k) { return '<tr><td>' + CFX[k][0] + '</td><td>' + CFX[k][1] + '</td></tr>'; }).join('') + '</table><p>牌堆抽完時，會把出過的牌洗一洗放回牌堆繼續抽。</p>' },
      { h: '計分方式', html: '<p>先把手牌出完的人獲勝（積分榜 +3 分）。限時結束時，手牌最少的人獲勝，並列的人都算贏。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「語文」→「拼音大挑戰」開房間，每桌 3～6 人，人數不夠可以讓電腦補位。</li><li>在 QR code 上方選好玩法：場上符號能不能重複、沒牌可出時怎麼抽、限時、功能牌、能不能查拼音表。</li><li>學生掃碼加入後就開始。老師端每桌顯示底版拼出的音、每個人剩幾張牌。</li></ol>' },
      { h: '開桌選項', html: '<ul><li><b>場上已有的符號</b>：「不能再出」是原版玩法；「可以再出」比較簡單，適合剛學注音。</li><li><b>沒牌可出時</b>：「一直抽，抽到能出為止」是原版；「一輪只抽一張」節奏比較慢。</li><li><b>限時</b>：預設 15 分鐘，第一個人出牌後才開始計時。時間到，這一輪打完就結算，手牌最少的人贏。選「不限時」就是先出完的人贏。</li><li><b>功能牌</b>：可以關掉，只用注音牌。</li><li><b>查拼音表</b>：關掉的話學生要靠自己的注音能力，比較難。</li></ul>' },
      { h: '拼音是怎麼判斷的', html: '<p>所有「真的存在的拼音」都是從教育部國語辭典的詞條整理出來的（共 412 個基本音節，加上各個聲調），不含兒化韻。如果有學生拼出一個你覺得有的音卻不能出，是因為字典裡沒有這個讀音。牌堆約 170 張，各種注音符號的張數依使用頻率配置，是 Claude 自訂的，可以再調整。</p>' },
      { h: '教學重點', html: '<ul><li>認識聲母、介音、韻母、聲調的拼音結構（例如「ㄅ」＋「ㄧ」不能直接加「ㄚ」）。</li><li>練習判斷哪些拼音真的存在。</li><li>用空白牌蓋住聲調格表示一聲，認識「一聲不標調」。</li></ul>' }
    ]
  };
})();
