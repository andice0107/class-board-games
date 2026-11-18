/* 注音彩色接龍（UNO 玩法，牌上是注音符號）
   - 四種顏色 × 37 個注音符號各 1 張＝148 張，加上功能牌：每色跳過、迴轉、+2 各 2 張（24 張），變色、變色 +4 各 4 張，
     進階功能牌（老師可關）：全員重洗、交換手牌、指定抽 2 各 2 張。共 186 張。
   - 出牌要和桌上那張「同顏色」或「同符號」，萬用牌隨時可出。第一個出完手牌的人獲勝；限時（預設 15 分鐘），時間到打完這一輪，剩牌最少的人贏。
   - 打出任何功能牌：畫面放大顯示 5 秒，這 5 秒大家都不能動作。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300', '#8e44ad', '#16a2b8'];
  var SYMS = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ'.split('');
  var ACT = 'SRDWFHXT', COLS = ['r', 'y', 'g', 'b'], CO = { r: 0, y: 1, g: 2, b: 3, w: 4 };
  var HEX = { r: '#e63946', y: '#f4a300', g: '#2a9d5c', b: '#2f6fe4', w: '#24213a' }, CNAME = { r: '紅', y: '黃', g: '綠', b: '藍' };
  var HOLD = 5000;
  var FN = {
    S: ['⛔', '跳過', '下一位這輪不能出牌'], R: ['↩️', '迴轉', '出牌順序反過來（兩個人玩時等於跳過）'], D: ['➕2', '加二', '下一位抽 2 張，而且這輪不能出牌'],
    W: ['🎨', '變色', '指定接下來要出的顏色'], F: ['➕4', '變色加四', '指定顏色，下一位抽 4 張，而且這輪不能出牌'],
    H: ['🔀', '全員重洗', '所有人的手牌收起來洗牌，再平均發回（每人張數不變），並指定顏色'],
    X: ['🔁', '交換手牌', '指定一位玩家，兩人的手牌整副互換，並指定顏色'], T: ['🎯', '指定抽 2', '指定一位玩家抽 2 張牌（不用跳過），並指定顏色']
  };
  var REASONS = { empty: '第一個把手牌全部出完', time: '時間到，剩牌最少', tie: '剩牌一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和', limit: '回合數到了上限，手牌最少的人贏' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function isWild(c) { return c[0] === 'w'; }
  function isAct(c) { return ACT.indexOf(c[1]) >= 0; }
  function vord(v) { var i = SYMS.indexOf(v); return i >= 0 ? i : 100 + ACT.indexOf(v); }
  function sortSym(h) { return h.sort(function (a, b) { return CO[a[0]] - CO[b[0]] || vord(a[1]) - vord(b[1]); }); }
  function sortBy(k) { return k === 'sym' ? function (h) { return h.sort(function (a, b) { return vord(a[1]) - vord(b[1]) || CO[a[0]] - CO[b[0]]; }); } : sortSym; }
  function playable(c, top, color) { return isWild(c) || c[0] === color || c[1] === top[1]; }
  function deck(adv) {
    var d = [];
    COLS.forEach(function (c) { SYMS.forEach(function (s) { d.push(c + s); }); for (var k = 0; k < 2; k++) 'SRD'.split('').forEach(function (v) { d.push(c + v); }); });
    for (var k = 0; k < 4; k++) { d.push('wW'); d.push('wF'); }
    if (adv) for (var q = 0; q < 2; q++) { d.push('wH'); d.push('wX'); d.push('wT'); }
    return shuffle(d);
  }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function step(g, from) { var s = from; do { s = (s + g.dir + g.np) % g.np; } while (g.out.indexOf(s) >= 0 && s !== from); return s; }
  function draw(g, seat, k) {
    var got = [];
    for (var i = 0; i < k; i++) {
      if (!g.deck.length) { var top = g.disc.pop(); g.deck = shuffle(g.disc); g.disc = [top]; }
      if (!g.deck.length) break;
      var c = g.deck.pop(); g.hands[seat].push(c); got.push(c);
    }
    sortSym(g.hands[seat]);
    return got;
  }
  function holdLeft(g) { return g.hold ? Math.max(0, g.hold - Date.now()) : 0; }
  function startClock(g) { if (!g.dl && g.limit) g.dl = Date.now() + g.limit; }
  function finishLimit(g, why) {
    var bl = 999, top = [];
    alive(g).forEach(function (s) { var l = g.hands[s].length; if (l < bl) { bl = l; top = [s]; } else if (l === bl) top.push(s); });
    if (top.length === alive(g).length && top.length > 1) g.res = { w: -1, why: 'tie' };
    else if (top.length > 1) g.res = { ws: top, why: why || 'time', note: '剩 ' + bl + ' 張' };
    else g.res = { w: top[0], why: why || 'time', note: '剩 ' + bl + ' 張' };
  }
  /* 換人之後：處理限時（時間到，這一輪打完就結算） */
  function afterTurn(g) {
    g.turns = (g.turns || 0) + 1;
    if (g.turns > g.np * 150) { finishLimit(g, 'limit'); return; }
    if (g.lastTurns != null) { g.lastTurns--; if (g.lastTurns <= 0) finishLimit(g, 'time'); }
    else if (g.dl && Date.now() > g.dl) { g.lastTurns = alive(g).length - 1; if (g.lastTurns <= 0) finishLimit(g, 'time'); }
  }
  function knockOut(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    var wasTurn = g.turn === seat;
    g.deck = shuffle(g.hands[seat].concat(g.deck)); g.hands[seat] = []; g.out.push(seat);
    if (g.pend && g.pend.seat === seat) g.pend = null;
    var a = alive(g);
    if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (wasTurn) g.turn = step(g, seat);
  }
  /* ---------- 電腦 ---------- */
  function bestColor(hand, level) {
    if (level <= 1) return COLS[Math.floor(Math.random() * 4)];
    var n = { r: 0, y: 0, g: 0, b: 0 }; hand.forEach(function (c) { if (!isWild(c)) n[c[0]] += 1; });
    var best = 'r'; COLS.forEach(function (c) { if (n[c] > n[best]) best = c; }); return best;
  }
  function choose(g, seat, level) {
    var hand = g.hands[seat], top = g.disc[g.disc.length - 1], ok = [], nxt = g.hands[step(g, seat)].length;
    hand.forEach(function (c, i) { if (playable(c, top, g.color)) ok.push(i); });
    if (!ok.length) return -1;
    if (level <= 1) return ok[Math.floor(Math.random() * ok.length)];
    var cnt = { r: 0, y: 0, g: 0, b: 0 }; hand.forEach(function (c) { if (!isWild(c)) cnt[c[0]]++; });
    var best = ok[0], bv = -1e9;
    ok.forEach(function (i) {
      var c = hand[i], v = 0;
      if (level === 2) v = Math.random() * 10 - (isWild(c) ? 4 : 0);
      else {
        v = isWild(c) ? -12 : cnt[c[0]] * 2;
        if (isAct(c) && !isWild(c)) v += 3;
        if (level >= 4 && nxt <= 2 && (c[1] === 'D' || c[1] === 'F' || c[1] === 'S')) v += 30;
        if (level >= 4 && c[1] === 'F' && nxt > 3) v -= 8;
        v += Math.random() * .5;
      }
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 1200,
    reasons: REASONS, holdLeft: holdLeft, onResume: function (g, d) { if (g.dl) g.dl += d; if (g.hold) g.hold += d; },
    levelDesc: ['能出就亂出，常忘記喊', '隨意出牌，偶爾忘記喊', '會留萬用牌，有點挑戰', '會用功能牌攻擊，很難贏'],
    opts: [
      { k: 'hand', label: '一開始每人幾張牌：', list: [['7', '7 張'], ['5', '5 張'], ['6', '6 張'], ['8', '8 張'], ['10', '10 張']], note: '牌越多，一局越久；7 張通常 10 分鐘左右' },
      { k: 'adv', label: '進階功能牌：', list: [['yes', '✨ 要用（全員重洗、交換手牌、指定抽 2）'], ['no', '❌ 不用（只有原本 UNO 的功能牌）']] },
      { k: 'limit', label: '限時：', list: [['15', '⏱️ 15 分鐘'], ['10', '⏱️ 10 分鐘'], ['20', '⏱️ 20 分鐘'], ['0', '不限時']], note: '時間到，這一輪打完就結算，剩牌最少的人贏；沒到時間就是先出完的人贏' }
    ],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(2, Math.min(6, n || 4));
      var g = { np: n, deck: deck(o.adv !== 'no'), disc: [], hands: [], turn: 0, dir: 1, color: '', pend: null, out: [], said: [], cnt: 0, last: null, res: null, hold: 0,
        limit: (o.limit != null && +o.limit === 0 ? 0 : (+o.limit || 15)) * 60000, dl: null, lastTurns: null, turns: 0, hn: +o.hand || 7 };
      for (var s = 0; s < n; s++) { g.hands.push([]); draw(g, s, g.hn); g.said.push(false); }
      var i = g.deck.length - 1; while (isAct(g.deck[i])) i--;   // 第一張翻開的一定是注音符號牌
      var top = g.deck.splice(i, 1)[0]; g.disc.push(top); g.color = top[0];
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knockOut(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var tl = g.dl ? Math.max(0, g.dl - Date.now()) : null;
      return { np: g.np, hand: seat >= 0 ? g.hands[seat] : [], counts: g.hands.map(function (h) { return h.length; }), top: g.disc[g.disc.length - 1], color: g.color, dir: g.dir,
        turn: g.turn, cnt: g.cnt, pend: g.pend && g.pend.seat === seat ? g.pend.card : null, said: g.said, out: g.out, deckN: g.deck.length, last: g.last, shout: g.shout || null,
        hold: holdLeft(g), tl: tl, limit: g.limit, ending: g.lastTurns != null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      var hand = g.hands[seat];
      if (d.t === 'call') { if (g.said[seat] || hand.length > 2) return false; g.said[seat] = true; g.shout = { seat: seat, k: (g.shout ? g.shout.k : 0) + 1 }; return true; }
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knockOut(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      if (holdLeft(g) > 150) return false;   // 功能牌特效還在播，5 秒內誰都不能動
      var top = g.disc[g.disc.length - 1];
      if (d.t === 'draw') {
        if (g.pend) return false;
        startClock(g);
        var got = draw(g, seat, 1); g.cnt++; g.said[seat] = false;
        g.last = { k: 'draw', seat: seat, k2: got.length, n: g.cnt };
        if (got.length && playable(got[0], top, g.color)) g.pend = { seat: seat, card: got[0] };
        else { g.turn = step(g, seat); afterTurn(g); }
        return true;
      }
      if (d.t === 'pass') {
        if (!g.pend || g.pend.seat !== seat) return false;
        g.pend = null; g.cnt++; g.turn = step(g, seat); g.last = { k: 'pass', seat: seat, n: g.cnt }; afterTurn(g); return true;
      }
      if (d.t === 'play') {
        var i = hand.indexOf(d.c); if (i < 0 || !playable(d.c, top, g.color)) return false;
        if (g.pend && d.c !== g.pend.card) return false;
        var v = d.c[1], needCol = isWild(d.c), needTo = v === 'X' || v === 'T';
        if (needCol && COLS.indexOf(d.color) < 0) return false;
        if (needTo) { if (d.to == null || d.to === seat || g.out.indexOf(d.to) >= 0 || d.to < 0 || d.to >= g.np || (v === 'X' && !g.hands[d.to].length)) return false; }
        startClock(g);
        hand.splice(i, 1); g.disc.push(d.c); g.pend = null; g.cnt++;
        g.color = needCol ? d.color : d.c[0];
        var info = { k: 'play', seat: seat, c: d.c, color: g.color, n: g.cnt };
        if (!hand.length) { g.last = info; g.res = { w: seat, why: 'empty' }; return true; }
        if (hand.length === 1 && !g.said[seat]) { draw(g, seat, 2); info.pen = true; notify(seat, '忘記喊「最後一張」，罰抽 2 張！'); }
        if (hand.length > 2) g.said[seat] = false;
        var nx = step(g, seat), two = alive(g).length === 2;
        if (v === 'R') { if (two) nx = step(g, nx); else { g.dir = -g.dir; nx = step(g, seat); } }
        else if (v === 'S') { info.hit = nx; nx = step(g, nx); }
        else if (v === 'D' || v === 'F') { info.hit = nx; info.k2 = v === 'D' ? 2 : 4; draw(g, nx, info.k2); g.said[nx] = false; nx = step(g, nx); }
        else if (v === 'T') { info.hit = d.to; info.k2 = 2; draw(g, d.to, 2); g.said[d.to] = false; }
        else if (v === 'X') {
          info.hit = d.to; var t0 = g.hands[seat]; g.hands[seat] = g.hands[d.to]; g.hands[d.to] = t0; g.said[seat] = false; g.said[d.to] = false;
        } else if (v === 'H') {
          var a = alive(g), cn = a.map(function (x) { return g.hands[x].length; }), pool = [];
          a.forEach(function (x) { pool = pool.concat(g.hands[x]); }); shuffle(pool);
          a.forEach(function (x, j) { g.hands[x] = sortSym(pool.splice(0, cn[j])); g.said[x] = false; });
        }
        if (g.hands[seat].length === 0) { g.res = { w: seat, why: 'empty' }; g.last = info; return true; }   // 換到空手牌：算贏
        g.turn = nx; g.last = info;
        if (isAct(d.c)) g.hold = Date.now() + BG.holdMs();
        afterTurn(g);
        return true;
      }
      return false;
    },
    hintDesc: '會亮出你手上「現在可以出」的牌（同顏色、同注音符號，或萬用牌）；沒有牌可以出時，會亮出牌堆提醒你抽一張；剩兩張以下時，也會提醒你要先按「最後一張」。',
    tipDesc: '你沒有牌可以出時，提醒你抽一張；剩兩張以下忘了喊「最後一張」時，提醒你喊（不喊會罰抽 2 張）。',
    acting: function (g) { return g.res ? [] : [g.turn]; },
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1], shout = hand.length <= 2 && !g.said[seat];
      if (g.pend && g.pend.seat === seat) return { msg: '你剛抽到的這張牌可以出（亮黃框）！想出就按「出這張」，想留著就按「留著，換下一位」。' + (shout ? '出牌前別忘了先按「最後一張」。' : ''), hl: [g.pend.card, 'playpend'].concat(shout ? ['call'] : []), dur: 6000 };
      var ok = hand.filter(function (c) { return playable(c, top, g.color); });
      if (!ok.length) return { msg: '你手上沒有能出的牌（要跟中間那張同顏色或同注音符號，或是萬用牌）。請點亮黃框的牌堆，抽一張牌。', hl: ['draw'], dur: 6000 };
      return { msg: '亮黃框的牌現在都可以出。' + (shout ? '你只剩 ' + hand.length + ' 張了，出牌前記得先按「最後一張」，不然會罰抽 2 張！' : '想一想：下一位快贏了就用 +2、跳過擋住他；萬用牌留到最後才好用。'), hl: ok.concat(shout ? ['call'] : []), dur: 6000 };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1];
      if (g.pend && g.pend.seat === seat) return '你剛抽到的牌可以出喔！按「出這張」，或按「留著，換下一位」。';
      if (!hand.some(function (c) { return playable(c, top, g.color); })) return '你手上沒有能出的牌（要同顏色、同注音符號，或萬用牌），請點中間的牌堆抽一張。';
      if (hand.length <= 2 && !g.said[seat]) return '你只剩 ' + hand.length + ' 張牌了！出牌前要先按「📣 最後一張！」，不然會被罰抽 2 張。';
      return '輪到你了：點一張亮起來的牌（再點一次就出牌），或點牌堆抽一張。';
    },
    botTurn: function (g, seat, level) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1];
      var canPlay = g.pend ? [g.pend.card] : hand.filter(function (c) { return playable(c, top, g.color); });
      if (hand.length === 2 && !g.said[seat] && canPlay.length) {
        var forget = [0, 45, 20, 5, 0][level] || 0, roll = (g.cnt * 37 + seat * 11) % 100;
        if (roll >= forget) return { t: 'call' };
      }
      function mk(c, rest) {
        var d = { t: 'play', c: c, n: g.cnt };
        if (isWild(c)) d.color = bestColor(rest, level);
        if (c[1] === 'X' || c[1] === 'T') {
          var o = alive(g).filter(function (x) { return x !== seat && (c[1] !== 'X' || g.hands[x].length); });
          if (!o.length) return null;
          o.sort(function (a, b) { return g.hands[a].length - g.hands[b].length; });
          d.to = c[1] === 'X' ? o[Math.floor(Math.random() * 2) ? 0 : o.length - 1] : o[0];
          if (c[1] === 'X' && level >= 3) d.to = o[0];
        }
        return d;
      }
      if (g.pend) {
        var pc = g.pend.card, keep = level >= 3 && isWild(pc) && hand.length > 3, pd = keep ? null : mk(pc, hand.filter(function (c) { return c !== pc; }));
        return pd || { t: 'pass', n: g.cnt };
      }
      var i = choose(g, seat, level);
      if (i < 0) return { t: 'draw', n: g.cnt };
      var c = hand[i], d2 = mk(c, hand.filter(function (x, k) { return k !== i; }));
      if (d2) return d2;
      var alt = hand.filter(function (x) { return playable(x, top, g.color) && x !== c && x[1] !== 'X' && x[1] !== 'T'; })[0];
      return alt ? mk(alt, hand.filter(function (x) { return x !== alt; })) : { t: 'draw', n: g.cnt };
    },
    hostView: function (g) {
      var top = g.disc[g.disc.length - 1], h = '<div class="un-host"><div class="un-host-mid"><span class="un-htop">' + card(top, { color: g.color }) + '</span><span class="un-hcol" style="background:' + HEX[g.color] + '">' + CNAME[g.color] + '</span><span class="un-hdir">' + (g.dir > 0 ? '↻' : '↺') + '</span></div><div class="un-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="un-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length + ' 張') + (g.said[s] && g.hands[s].length <= 2 ? ' 📣' : '') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '輪到第 ' + (g.turn + 1) + ' 位・目前顏色：' + CNAME[g.color] + (g.dl ? '・剩 ' + fmtT(g.dl - Date.now()) : ''), c: '' }; }
  };
  function fmtT(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- 牌面 ---------- */
  function card(c, o) {
    o = o || {};
    if (o.back || !c) return UNO.card(null, { back: true });
    var v = c[1], isSym = SYMS.indexOf(v) >= 0;
    if (!isSym && 'SRDWF'.indexOf(v) >= 0) return UNO.card(c, o);
    var wild = isWild(c), col = HEX[c[0]];
    var h = '<svg class="un-card" viewBox="0 0 60 90"><rect x="1" y="1" width="58" height="88" rx="8" fill="#1b1830"/><rect x="4" y="4" width="52" height="82" rx="6" fill="' + (wild ? '#2d2a4a' : col) + '"/>';
    h += '<g transform="translate(30 45) rotate(28)"><ellipse rx="20" ry="33" fill="#fff"/></g>';
    if (isSym) {
      h += '<text x="30" y="58" font-size="36" text-anchor="middle" font-weight="900" fill="' + col + '" stroke="#1b1830" stroke-width="1" paint-order="stroke" font-family="Noto Sans TC,PingFang TC,sans-serif">' + v + '</text>';
      h += '<text x="11" y="21" font-size="12" text-anchor="middle" font-weight="900" fill="#fff" stroke="#1b1830" stroke-width=".6" paint-order="stroke" font-family="Noto Sans TC,PingFang TC,sans-serif">' + v + '</text>';
      h += '<g transform="translate(49 75) rotate(180)"><text x="0" y="4" font-size="12" text-anchor="middle" font-weight="900" fill="#fff" stroke="#1b1830" stroke-width=".6" paint-order="stroke" font-family="Noto Sans TC,PingFang TC,sans-serif">' + v + '</text></g>';
    } else {
      h += '<text x="30" y="52" font-size="26" text-anchor="middle">' + FN[v][0] + '</text><text x="30" y="68" font-size="9" text-anchor="middle" font-weight="900" fill="#1b1830">' + FN[v][1] + '</text>';
    }
    if (o.color && wild) h += '<rect x="2.5" y="2.5" width="55" height="85" rx="7" fill="none" stroke="' + HEX[o.color] + '" stroke-width="4"/>';
    return h + '</svg>';
  }
  function cname(c) { var v = c[1], n = FN[v] ? FN[v][1] : v; return isWild(c) ? n : CNAME[c[0]] + ' ' + n; }

  /* ---------- 學生端 ---------- */
  var L = { sel: null, pending: null, round: -1, cnt: -1, wild: null, to: null, anim: false, holdUntil: 0, tl: null, tlT: 0, sortBy: 'color' };
  var ticking = false;
  function tick() { if (ticking) return; ticking = true; setInterval(function () { var t = document.querySelector('.zu-timer'); if (t && L.tl != null) t.textContent = '⏱️ ' + fmtT(L.tl - (Date.now() - L.tlT)); }, 1000); }
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.sel = null; L.wild = null; L.to = null; }
    L.tl = v.tl; L.tlT = Date.now(); L.holdUntil = v.hold > 0 ? Date.now() + v.hold : 0;
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt) {
      if (la.k === 'play' && la.seat !== tb.seat) { fx.snd(isAct(la.c) ? 'cap' : 'move'); L.anim = true; }
      if (la.k === 'play' && la.hit === tb.seat && la.seat !== tb.seat) { fx.snd('error'); }
      if (!tb.res && v.turn === tb.seat && la.seat !== tb.seat) setTimeout(function () { fx.snd('turn'); }, 350);
      if (la.k === 'play' && isAct(la.c) && v.hold > 0 && !tb.res) {
        var ov = document.createElement('div'), fi = FN[la.c[1]]; ov.className = 'zu-fxov';
        var tg = la.hit != null && la.c[1] !== 'F' && la.c[1] !== 'D' && la.c[1] !== 'S' ? '（對象：' + who(tb, la.hit) + '）' : la.hit != null ? '（' + who(tb, la.hit) + (la.k2 ? ' 抽 ' + la.k2 + ' 張並被跳過' : ' 被跳過') + '）' : '';
        if (la.c[1] === 'R') tg = '（現在是' + (v.dir > 0 ? '順時鐘' : '逆時鐘') + '）';
        ov.innerHTML = '<div class="zu-fxbox"><div class="ic">' + fi[0] + '</div><b>' + esc(who(tb, la.seat)) + ' 使用「' + fi[1] + '」</b><p>' + esc(fi[2]) + esc(tg) + (isWild(la.c) ? '<br>指定顏色：<span class="zu-cc" style="background:' + HEX[la.color] + '">' + CNAME[la.color] + '</span>' : '') + '</p><p class="zu-cd">⏳ 全員暫停，<span>' + Math.ceil(Math.max(1500, v.hold) / 1000) + '</span> 秒後繼續</p></div>';
        var dur = Math.max(1500, v.hold); ov.style.animationDuration = dur + 'ms'; document.body.appendChild(ov);
        var t0 = Date.now(), iv = setInterval(function () { var sp = ov.querySelector('.zu-cd span'); if (sp) sp.textContent = Math.max(0, Math.ceil((dur - (Date.now() - t0)) / 1000)); }, 200);
        setTimeout(function () { clearInterval(iv); ov.remove(); }, dur);
      }
    }
    var sh = v.shout, ps = prev && prev.view && prev.view.shout;
    if (sh && sh.seat !== tb.seat && prev && (!ps || ps.k !== sh.k)) { fx.toast(short(tb, sh.seat) + '：最後一張！'); fx.snd('pop'); }
    L.cnt = v.cnt;
    if (L.sel && v.hand.indexOf(L.sel) < 0) L.sel = null;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '每人 ' + v.hand.length + ' 張牌');
  };
  setInterval(function () {
    var P = L.pending; if (!P || !mod._ctx) return;
    if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send(P.t, P.d); }
  }, 800);
  function act(ctx, t, d) { d.n = ctx.tb.view.cnt; L.pending = { t: t, d: d, n: d.n, at: Date.now() }; ctx.send(t, d); L.sel = null; L.wild = null; L.to = null; ctx.rerender(); }
  function seatChip(i, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === i, out = v.out.indexOf(i) >= 0;
    var w = el('div', 'un-opp' + (turn ? ' turn' : '') + (out ? ' out' : '')); w.setAttribute('data-seat', i);
    var top = el('div', 'un-opp-top'); var dot = el('i'); dot.style.background = SEATC[i]; top.appendChild(dot);
    top.appendChild(el('span', 'n', info.bot ? info.name.replace(/電腦（.*）/, '電腦 ' + (i + 1)) : info.name)); w.appendChild(top);
    var fan = el('div', 'un-fan'), n = v.counts[i];
    for (var k = 0; k < Math.min(n, 8); k++) { var b = el('span', 'un-mini'); b.style.transform = 'rotate(' + ((k - Math.min(n, 8) / 2) * 7) + 'deg)'; fan.appendChild(b); }
    w.appendChild(fan);
    w.appendChild(el('div', 'un-cnt', out ? '已認輸' : n + ' 張'));
    if (!out && v.said[i] && n <= 2) w.appendChild(el('div', 'un-shout', '最後一張！'));
    if (!info.bot && !info.on) w.appendChild(el('div', 'un-off', info.gone ? '已離開' : '離線'));
    return w;
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0;
    var held = Date.now() < L.holdUntil, myTurn = !tb.res && v.turn === seat && !P && !out && !held;
    if (held && !tb.res) { clearTimeout(L.ht); L.ht = setTimeout(function () { ctx.rerender(); }, L.holdUntil - Date.now() + 80); }
    var wrap = el('div', 'un-table');
    var st = el('div', 'un-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (held) st.textContent = '功能牌效果中，大家先看清楚…';
    else if (P) st.textContent = '出牌中…';
    else if (myTurn && v.pend) { st.textContent = '抽到能出的牌！要出嗎？'; st.className = 'un-status me'; }
    else if (myTurn) { st.textContent = L.sel ? '再點一次這張牌就出牌' : '輪到你了！出一張牌或抽牌'; st.className = 'un-status me'; }
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    var opps = el('div', 'un-opps');
    for (var k = 1; k < v.np; k++) opps.appendChild(seatChip((seat + k) % v.np, v, tb));
    wrap.appendChild(opps);
    var mid = el('div', 'un-mid');
    mid.appendChild(el('div', 'un-dir' + (v.dir < 0 ? ' ccw' : ''), v.dir > 0 ? '↻' : '↺'));
    var pile = el('button', 'un-pile' + (myTurn && !v.pend ? ' can' : '')); pile.type = 'button'; pile.setAttribute('data-h', 'draw');
    pile.innerHTML = card(null, { back: true }) + '<span class="un-pile-n">' + v.deckN + '</span>' + (myTurn && !v.pend ? '<span class="un-pile-tip">抽一張</span>' : '');
    pile.addEventListener('click', function () { if (!myTurn || v.pend) return; ctx.snd('tap'); act(ctx, 'draw', {}); });
    mid.appendChild(pile);
    var dsc = el('div', 'un-disc' + (L.anim ? ' land' : '')); dsc.innerHTML = card(v.top, { color: v.color }); L.anim = false; mid.appendChild(dsc);
    var cl = el('div', 'un-color'); cl.style.background = HEX[v.color]; cl.textContent = CNAME[v.color]; mid.appendChild(cl);
    wrap.appendChild(mid);
    if (v.limit) { var tm = el('div', 'zu-timer', v.ending ? '⏱️ 最後一輪' : v.tl == null ? '⏱️ 開始後計時' : '⏱️ ' + fmtT(v.tl)); wrap.appendChild(tm); }
    if (v.last && v.last.k === 'play') {
      var lg = el('div', 'un-log'), who0 = who(tb, v.last.seat);
      lg.textContent = who0 + ' 出了「' + cname(v.last.c) + '」' + (isWild(v.last.c) ? '，指定' + CNAME[v.last.color] + '色' : '') + (v.last.hit != null ? '，對象：' + who(tb, v.last.hit) : '') + (v.last.k2 ? '（抽 ' + v.last.k2 + ' 張）' : '') + (v.last.pen ? '（忘記喊，罰抽 2 張）' : '');
      wrap.appendChild(lg);
    }
    var meBox = el('div', 'un-me' + (v.turn === seat && !tb.res ? ' turn' : ''));
    var mt = el('div', 'un-me-top'); var md = el('i'); md.style.background = SEATC[seat]; mt.appendChild(md); mt.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我')));
    mt.appendChild(el('span', 'un-cnt', v.hand.length + ' 張'));
    if (v.said[seat] && v.hand.length <= 2) mt.appendChild(el('span', 'un-shout', '已喊最後一張'));
    meBox.appendChild(mt);
    var HK = BG.handKey(tb, 'zyuno'), ho = BG.handOrder(HK, v.hand, sortBy(L.sortBy)), hl = ho.list;
    var hand = el('div', 'un-hand'), rows = hl.length > 8 ? 2 : 1, per = Math.ceil(hl.length / rows);
    for (var r = 0; r < rows; r++) {
      var row = el('div', 'un-row');
      hl.slice(r * per, (r + 1) * per).forEach(function (c, j) {
        var fresh = ho.fresh[r * per + j];
        var can = myTurn && playable(c, v.top, v.color) && (!v.pend || c === v.pend);
        var cd = el('button', 'un-hc' + (can ? ' can' : myTurn ? ' dim' : '') + (L.sel === c ? ' sel' : '') + (v.pend === c ? ' new' : '') + (fresh ? ' fresh-card' : '')); cd.type = 'button'; cd.setAttribute('data-h', c);
        cd.innerHTML = card(c);
        cd.addEventListener('click', function () {
          if (!myTurn) return;
          if (!can) { ctx.snd('error'); ctx.toast(v.pend ? '剛抽到的那張才能出' : '要出同顏色或同注音符號的牌'); return; }
          if (L.sel !== c) { L.sel = c; L.wild = null; L.to = null; ctx.snd('tap'); ctx.rerender(); return; }
          if (isWild(c)) { L.wild = c; ctx.rerender(); return; }
          ctx.snd(isAct(c) ? 'cap' : 'move'); act(ctx, 'play', { c: c });
        });
        row.appendChild(cd);
      });
      hand.appendChild(row);
    }
    meBox.appendChild(hand);
    wrap.appendChild(meBox);
    if (L.wild && myTurn) {
      var wc = L.wild, nd = wc[1] === 'X' || wc[1] === 'T', pk = el('div', 'un-pick');
      pk.appendChild(el('p', '', FN[wc[1]][0] + ' ' + FN[wc[1]][1] + '：' + FN[wc[1]][2]));
      if (nd && L.to == null) {
        pk.appendChild(el('p', '', '先選一位玩家：'));
        var tr = el('div', 'un-pick-row');
        for (var o = 0; o < v.np; o++) if (o !== seat && v.out.indexOf(o) < 0 && (wc[1] !== 'X' || v.counts[o] > 0)) (function (o) { tr.appendChild(ctx.button('un-btn go', short(tb, o) + '（' + v.counts[o] + '張）', function () { L.to = o; ctx.snd('tap'); ctx.rerender(); })); })(o);
        pk.appendChild(tr);
      } else {
        pk.appendChild(el('p', '', (nd ? '對象：' + short(tb, L.to) + '。' : '') + '要換成什麼顏色？'));
        var pr = el('div', 'un-pick-row');
        COLS.forEach(function (c) { var b = ctx.button('un-cbtn', CNAME[c], function () { ctx.snd('cap'); var d = { c: wc, color: c }; if (nd) d.to = L.to; act(ctx, 'play', d); }); b.style.background = HEX[c]; pr.appendChild(b); });
        pk.appendChild(pr);
      }
      pk.appendChild(ctx.button('un-btn', '取消', function () { L.wild = null; L.to = null; ctx.rerender(); }));
      wrap.appendChild(pk);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'un-tools');
      if (myTurn && v.pend) {
        var pc = v.pend;
        var pb0 = ctx.button('un-btn go', '出這張', function () { if (isWild(pc)) { L.sel = pc; L.wild = pc; ctx.rerender(); } else { ctx.snd('move'); act(ctx, 'play', { c: pc }); } }); pb0.setAttribute('data-h', 'playpend'); tools.appendChild(pb0);
        tools.appendChild(ctx.button('un-btn', '留著，換下一位', function () { act(ctx, 'pass', {}); }));
      }
      if (v.hand.length <= 2 && !v.said[seat]) { var sb = ctx.button('un-btn shout', '📣 最後一張！', function () { ctx.snd('pop'); ctx.send('call', {}); }); sb.setAttribute('data-h', 'call'); tools.appendChild(sb); }
      [['color', '🔀 整理：依顏色'], ['sym', '🔀 整理：依符號']].forEach(function (o) { tools.appendChild(ctx.button('un-btn sort-btn' + (L.sortBy === o[0] ? ' on' : ''), o[1], function () { L.sortBy = o[0]; BG.handSort(HK, sortBy(o[0])); ctx.snd('tap'); ctx.rerender(); })); });
      tools.appendChild(ctx.button('un-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？你的牌會收回牌堆。')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('un-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
    tick();
  };
  mod.onReject = function () { L.pending = null; };
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res; if (!v || !r) return null;
    var lines = [r.ws ? '🏆 並列最少，一起獲勝：' + r.ws.map(nm).join('、') : r.w >= 0 ? '🏆 獲勝：' + nm(r.w) : '🤝 剩牌一樣多，平手'];
    var h = '<div>'; for (var s = 0; s < v.np; s++) h += '<div><b>' + esc(nm(s)) + '</b>：剩 ' + v.counts[s] + ' 張</div>';
    lines.push({ html: h + '</div>' }); return lines;
  };
  BG.register('zhuyin-uno', mod);
  function figs(list, note) { return '<figure class="g-fig"><div class="un-figrow">' + list.map(function (c) { return '<span>' + card(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人先拿 7 張牌（老師可以改），中間翻開一張當作第一張。</li><li>輪到你時，出一張和桌上那張<b>同顏色</b>或<b>同注音符號</b>的牌。可以出的牌會稍微浮起來。</li><li><b>點一下</b>選牌，<b>再點一次</b>就出牌。</li><li>沒有能出的牌，就點<b>牌堆抽一張</b>。抽到能出的可以馬上出，也可以留著換下一位。</li><li><b>第一個把手上的牌出完</b>的人獲勝。時間到的話，打完這一輪，剩牌最少的人獲勝。</li></ol><div class="g-figs">' + figs(['rㄅ', 'rㄇ', 'bㄅ'], '桌上是紅色ㄅ：可以出紅色ㄇ（同顏色），或藍色ㄅ（同符號）') + '</div>' },
      { h: '功能牌（出的時候全部暫停 5 秒）', html: '<div class="g-figs">' + figs(['gS'], '跳過：下一位這輪不能出牌') + figs(['yR'], '迴轉：順序反過來') + figs(['bD'], '加二：下一位抽 2 張並跳過') + figs(['wW'], '變色：指定顏色') + figs(['wF'], '變色加四：指定顏色，下一位抽 4 張並跳過') + '</div><p>進階功能牌（老師有開才有）：</p><div class="g-figs">' + figs(['wH'], '全員重洗：所有人手牌洗牌再平均發回') + figs(['wX'], '交換手牌：和指定的人整副手牌互換') + figs(['wT'], '指定抽 2：指定的人抽 2 張') + '</div><p>有人出功能牌時，畫面會放大顯示誰用了什麼、有什麼效果，5 秒內大家都不能動作，看清楚再繼續。</p>' },
      { h: '最後一張！', html: '<p>手上剩兩張時會出現 <b>📣 最後一張！</b> 按鈕。出完牌只剩一張前一定要先按，忘記的話會<b>罰抽 2 張</b>。</p>' },
      { h: '整理手牌', html: '<p>「🔀 整理：依顏色」同色放一起，再按注音順序；「🔀 整理：依符號」同一個符號放一起，再按顏色。新抽到的牌會放最右邊並標「新」，按整理才會排好。</p>' },
      { h: '計分方式', html: '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 第一個出完（或時間到剩牌最少）</td><td>3 分</td></tr><tr><td>其他人</td><td>0 分</td></tr></table><p>剩牌一樣少的人都算贏。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「語文」→「注音彩色接龍」開房間，投影 QR code。</li><li>QR code 上方可選每人起始手牌（5～10 張，預設 7）、進階功能牌要不要用、限時（預設 15 分鐘）。</li><li>每桌 2～6 人，人數不夠可讓電腦補位。</li></ol>' },
      { h: '規則說明', html: '<ul><li>四色（紅黃綠藍）× 37 個注音符號各 1 張＝148 張；每色跳過、迴轉、+2 各 2 張；變色、變色 +4 各 4 張；進階功能牌（全員重洗、交換手牌、指定抽 2）各 2 張。共 186 張（關掉進階為 180 張）。</li><li>第一張翻開的一定是注音符號牌。</li><li>限時：時間到，這一輪打完就結算，剩牌最少的贏；同樣少的都算贏。</li><li>所有功能牌出牌後暫停 5 秒。</li><li>+4 沒有「質疑」規則，+2、+4 不能疊加（簡化）。這些是 Claude 先自訂，可以再調整。</li></ul>' }
    ]
  };
})();
