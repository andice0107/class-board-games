/* 彩色接龍（UNO 玩法）模組：2～6 人，每人 7 張 */
(function () {
  'use strict';
  var LIMIT = 500, SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300', '#8e44ad', '#16a2b8'];
  var REASONS = { empty: '第一個把手牌全部出完', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和', limit: '回合數到了上限，手牌最少的人獲勝' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function step(g, from) { var s = from; do { s = (s + g.dir + g.np) % g.np; } while (g.out.indexOf(s) >= 0 && s !== from); return s; }
  function draw(g, seat, k) {
    var got = [];
    for (var i = 0; i < k; i++) {
      if (!g.deck.length) { var top = g.disc.pop(); g.deck = UNO.shuffle(g.disc); g.disc = [top]; }
      if (!g.deck.length) break;
      var c = g.deck.pop(); g.hands[seat].push(c); got.push(c);
    }
    UNO.sortHand(g.hands[seat]);
    return got;
  }
  function finishLimit(g) {
    var best = -1, bl = 999, tie = false;
    alive(g).forEach(function (s) { var l = g.hands[s].length; if (l < bl) { bl = l; best = s; tie = false; } else if (l === bl) tie = true; });
    g.res = { w: tie ? -1 : best, why: 'limit' };
  }
  function knockOut(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    var wasTurn = g.turn === seat;
    g.deck = g.hands[seat].concat(g.deck); g.hands[seat] = []; g.out.push(seat);
    if (g.pend && g.pend.seat === seat) g.pend = null;
    var a = alive(g);
    if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (wasTurn) g.turn = step(g, seat);
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5],
    reasons: REASONS,
    levelDesc: ['能出就亂出，常忘記喊', '隨意出牌，偶爾忘記喊', '會留萬用牌，有點挑戰', '會用功能牌攻擊，很難贏'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(6, n || 2));
      var g = { np: n, deck: UNO.deck(), disc: [], hands: [], turn: 0, dir: 1, color: '', pend: null, out: [], said: [], cnt: 0, last: null, res: null };
      for (var s = 0; s < n; s++) { g.hands.push([]); draw(g, s, 7); g.said.push(false); }
      // 第一張翻開的牌一定是數字牌（比較好上手）
      var i = g.deck.length - 1; while (!/[0-9]/.test(g.deck[i][1])) i--;
      var top = g.deck.splice(i, 1)[0]; g.disc.push(top); g.color = top[0];
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knockOut(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, hand: seat >= 0 ? g.hands[seat] : [], counts: g.hands.map(function (h) { return h.length; }), top: g.disc[g.disc.length - 1], color: g.color, dir: g.dir,
        turn: g.turn, cnt: g.cnt, pend: g.pend && g.pend.seat === seat ? g.pend.card : null, said: g.said, out: g.out, deckN: g.deck.length, last: g.last, shout: g.shout || null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      var hand = g.hands[seat];
      if (d.t === 'call') { // 喊「最後一張」
        if (g.said[seat] || hand.length > 2) return false;
        g.said[seat] = true; g.shout = { seat: seat, k: (g.shout ? g.shout.k : 0) + 1 }; return true;
      }
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knockOut(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      var top = g.disc[g.disc.length - 1];
      if (d.t === 'draw') {
        if (g.pend) return false;
        var got = draw(g, seat, 1); g.cnt++; g.said[seat] = false;
        g.last = { k: 'draw', seat: seat, k2: got.length, n: g.cnt };
        if (got.length && UNO.playable(got[0], top, g.color)) g.pend = { seat: seat, card: got[0] };
        else g.turn = step(g, seat);
        return true;
      }
      if (d.t === 'pass') {
        if (!g.pend || g.pend.seat !== seat) return false;
        g.pend = null; g.cnt++; g.turn = step(g, seat); g.last = { k: 'pass', seat: seat, n: g.cnt }; return true;
      }
      if (d.t === 'play') {
        var i = hand.indexOf(d.c); if (i < 0 || !UNO.playable(d.c, top, g.color)) return false;
        if (g.pend && d.c !== g.pend.card) return false;
        if (UNO.isWild(d.c) && UNO.COLS.indexOf(d.color) < 0) return false;
        hand.splice(i, 1); g.disc.push(d.c); g.pend = null; g.cnt++;
        g.color = UNO.isWild(d.c) ? d.color : d.c[0];
        var info = { k: 'play', seat: seat, c: d.c, color: g.color, n: g.cnt };
        if (!hand.length) { g.last = info; g.res = { w: seat, why: 'empty' }; return true; }
        if (hand.length === 1 && !g.said[seat]) { draw(g, seat, 2); info.pen = true; notify(seat, '忘記喊「最後一張」，罰抽 2 張！'); }
        if (hand.length > 2) g.said[seat] = false;
        var v = d.c[1], nx = step(g, seat), two = alive(g).length === 2;
        if (v === 'R') { if (two) nx = step(g, nx); else { g.dir = -g.dir; nx = step(g, seat); } }
        else if (v === 'S') { info.hit = nx; nx = step(g, nx); }
        else if (v === 'D' || v === 'F') { info.hit = nx; info.k2 = v === 'D' ? 2 : 4; draw(g, nx, info.k2); g.said[nx] = false; nx = step(g, nx); }
        g.turn = nx; g.last = info;
        if (g.cnt >= LIMIT) finishLimit(g);
        return true;
      }
      return false;
    },
    hintDesc: '會亮出你手上「現在可以出」的牌（同顏色、同數字或同符號，或萬用牌）；沒有牌可以出時，會亮出牌堆提醒你抽一張；剩兩張以下時，也會提醒你要先按「最後一張」。',
    tipDesc: '你沒有牌可以出時，提醒你抽一張牌；剩兩張以下忘了喊「最後一張」時，提醒你喊（不喊會罰抽 2 張）。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1], shout = hand.length <= 2 && !g.said[seat];
      if (g.pend && g.pend.seat === seat) return { msg: '你剛抽到的這張牌可以出（亮黃框）！想出就按「出這張」，想留著就按「留著，換下一位」。' + (shout ? '出牌前別忘了先按「最後一張」。' : ''), hl: [g.pend.card, 'playpend'].concat(shout ? ['call'] : []) };
      var ok = hand.filter(function (c) { return UNO.playable(c, top, g.color); });
      if (!ok.length) return { msg: '你手上沒有能出的牌（要跟中間那張同顏色、同數字或同符號，或是萬用牌）。請點亮黃框的牌堆，抽一張牌。', hl: ['draw'] };
      return { msg: '亮黃框的牌現在都可以出。' + (shout ? '你只剩 ' + hand.length + ' 張了，出牌前記得先按「最後一張」，不然會罰抽 2 張！' : '想一想：先出功能牌（+2、跳過、迴轉）可以整對手，先出萬用牌則要留到最後才好用。'), hl: ok.concat(shout ? ['call'] : []) };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1];
      if (g.pend && g.pend.seat === seat) return '你剛抽到的牌可以出喔！按「出這張」，或按「留著，換下一位」。';
      if (!hand.some(function (c) { return UNO.playable(c, top, g.color); })) return '你手上沒有能出的牌（要同顏色、同數字或同符號，或萬用牌），請點中間的牌堆抽一張。';
      if (hand.length <= 2 && !g.said[seat]) return '你只剩 ' + hand.length + ' 張牌了！出牌前要先按「📣 最後一張！」，不然會被罰抽 2 張。';
      return '輪到你了：點一張亮起來的牌（再點一次就出牌），或點牌堆抽一張。';
    },
    botTurn: function (g, seat, level) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], top = g.disc[g.disc.length - 1];
      var canPlay = g.pend ? [g.pend.card] : hand.filter(function (c) { return UNO.playable(c, top, g.color); });
      // 剩兩張而且這回合能出牌：記得喊（強度低的電腦偶爾會忘記）
      if (hand.length === 2 && !g.said[seat] && canPlay.length) {
        var forget = [0, 45, 20, 5, 0][level] || 0, roll = (g.cnt * 37 + seat * 11) % 100;
        if (roll >= forget) return { t: 'call' };
      }
      if (g.pend) {
        var keep = level >= 3 && UNO.isWild(g.pend.card) && hand.length > 3;
        return keep ? { t: 'pass', n: g.cnt } : { t: 'play', c: g.pend.card, color: UNO.bestColor(hand.filter(function (c) { return c !== g.pend.card; }), level), n: g.cnt };
      }
      var i = UNO.choose(hand, top, g.color, level, g.hands[step(g, seat)].length);
      if (i < 0) return { t: 'draw', n: g.cnt };
      var c = hand[i];
      return { t: 'play', c: c, color: UNO.bestColor(hand.filter(function (x, k) { return k !== i; }), level), n: g.cnt };
    },
    hostView: function (g) {
      var top = g.disc[g.disc.length - 1], h = '<div class="un-host"><div class="un-host-mid"><span class="un-htop">' + UNO.card(top, { color: g.color }) + '</span><span class="un-hcol" style="background:' + UNO.HEX[g.color] + '">' + UNO.CNAME[g.color] + '</span><span class="un-hdir">' + (g.dir > 0 ? '↻' : '↺') + '</span></div><div class="un-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="un-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length + ' 張') + (g.said[s] && g.hands[s].length <= 2 ? ' 📣' : '') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '輪到第 ' + (g.turn + 1) + ' 位・目前顏色：' + UNO.CNAME[g.color] + (g.dir > 0 ? '・順時針' : '・逆時針'), c: '' }; }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: null, pending: null, round: -1, cnt: -1, wild: null, anim: false };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.sel = null; L.wild = null; }
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt) {
      if (la.k === 'play' && la.seat !== tb.seat) { fx.snd(la.c[1] > '9' ? 'cap' : 'move'); L.anim = true; }
      if (la.k === 'play' && la.hit === tb.seat) { if (la.k2) fx.toast('被罰抽 ' + la.k2 + ' 張！'); else fx.toast('被跳過了！'); fx.snd('error'); }
      if (la.k === 'play' && la.c[1] === 'R' && la.seat !== tb.seat) fx.toast('方向改變！');
      if (!tb.res && v.turn === tb.seat && la.seat !== tb.seat) setTimeout(function () { fx.snd('turn'); }, 350);
    }
    var sh = v.shout, ps = prev && prev.view && prev.view.shout;
    if (sh && sh.seat !== tb.seat && prev && (!ps || ps.k !== sh.k)) { fx.toast(short(tb, sh.seat) + '：最後一張！'); fx.snd('pop'); }
    L.cnt = v.cnt;
    if (L.sel && v.hand.indexOf(L.sel) < 0) L.sel = null;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '每人 7 張牌');
  };
  setInterval(function () {
    var P = L.pending; if (!P || !mod._ctx) return;
    if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send(P.t, P.d); }
  }, 800);
  function act(ctx, t, d) { d.n = ctx.tb.view.cnt; L.pending = { t: t, d: d, n: d.n, at: Date.now() }; ctx.send(t, d); L.sel = null; L.wild = null; ctx.rerender(); }
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function seatChip(i, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === i, out = v.out.indexOf(i) >= 0;
    var w = el('div', 'un-opp' + (turn ? ' turn' : '') + (out ? ' out' : '')); w.setAttribute('data-seat', i);
    var top = el('div', 'un-opp-top'); var dot = el('i'); dot.style.background = SEATC[i]; top.appendChild(dot);
    top.appendChild(el('span', 'n', info.bot ? info.name.replace(/電腦（.*）/, '電腦 ' + (i + 1)) : info.name)); w.appendChild(top);
    var fan = el('div', 'un-fan'), n = v.counts[i];
    for (var k = 0; k < Math.min(n, 8); k++) { var b = el('span', 'un-mini'); b.style.transform = 'rotate(' + ((k - Math.min(n, 8) / 2) * 7) + 'deg)'; fan.appendChild(b); }
    w.appendChild(fan);
    var tag = el('div', 'un-cnt', out ? '已認輸' : n + ' 張'); w.appendChild(tag);
    if (!out && v.said[i] && n <= 2) w.appendChild(el('div', 'un-shout', '最後一張！'));
    if (!info.bot && !info.on) w.appendChild(el('div', 'un-off', info.gone ? '已離開' : '離線'));
    return w;
  }
  /* 整理手牌：依顏色（同色放一起、再看數字）或依數字（同數字放一起、再看顏色） */
  function sortBy(k) {
    var CO = { r: 0, y: 1, g: 2, b: 3, w: 4 }, VO = '0123456789SRDWF';
    return k === 'num' ? function (h) { return h.sort(function (a, b) { return VO.indexOf(a[1]) - VO.indexOf(b[1]) || CO[a[0]] - CO[b[0]]; }); } : function (h) { return UNO.sortHand(h); };
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0;
    var myTurn = !tb.res && v.turn === seat && !P && !out;
    var wrap = el('div', 'un-table');
    var st = el('div', 'un-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (P) st.textContent = '出牌中…';
    else if (myTurn && v.pend) { st.textContent = '抽到能出的牌！要出嗎？'; st.className = 'un-status me'; }
    else if (myTurn) { st.textContent = L.sel ? '再點一次這張牌就出牌' : '輪到你了！出一張牌或抽牌'; st.className = 'un-status me'; }
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    // 其他玩家：從自己的下一位開始排
    var opps = el('div', 'un-opps');
    for (var k = 1; k < v.np; k++) opps.appendChild(seatChip((seat + k) % v.np, v, tb));
    wrap.appendChild(opps);
    // 中間：牌堆和棄牌
    var mid = el('div', 'un-mid');
    var dir = el('div', 'un-dir' + (v.dir < 0 ? ' ccw' : ''), v.dir > 0 ? '↻' : '↺'); mid.appendChild(dir);
    var pile = el('button', 'un-pile' + (myTurn && !v.pend ? ' can' : '')); pile.type = 'button'; pile.setAttribute('data-h', 'draw');
    pile.innerHTML = UNO.card(null, { back: true }) + '<span class="un-pile-n">' + v.deckN + '</span>' + (myTurn && !v.pend ? '<span class="un-pile-tip">抽一張</span>' : '');
    pile.addEventListener('click', function () { if (!myTurn || v.pend) return; ctx.snd('tap'); act(ctx, 'draw', {}); });
    mid.appendChild(pile);
    var dsc = el('div', 'un-disc' + (L.anim ? ' land' : '')); dsc.innerHTML = UNO.card(v.top, { color: v.color }); L.anim = false; mid.appendChild(dsc);
    var cl = el('div', 'un-color'); cl.style.background = UNO.HEX[v.color]; cl.textContent = UNO.CNAME[v.color]; mid.appendChild(cl);
    wrap.appendChild(mid);
    if (v.last && v.last.k === 'play') {
      var lg = el('div', 'un-log'), who = v.last.seat === seat ? '你' : short(tb, v.last.seat);
      lg.textContent = who + ' 出了「' + UNO.name(v.last.c) + '」' + (UNO.isWild(v.last.c) ? '，指定' + UNO.CNAME[v.last.color] + '色' : '') + (v.last.k2 ? '，' + (v.last.hit === seat ? '你' : short(tb, v.last.hit)) + '抽 ' + v.last.k2 + ' 張' : '') + (v.last.pen ? '（忘記喊，罰抽 2 張）' : '');
      wrap.appendChild(lg);
    }
    // 自己
    var meBox = el('div', 'un-me' + (v.turn === seat && !tb.res ? ' turn' : ''));
    var mt = el('div', 'un-me-top'); var md = el('i'); md.style.background = SEATC[seat]; mt.appendChild(md); mt.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我')));
    mt.appendChild(el('span', 'un-cnt', v.hand.length + ' 張'));
    if (v.said[seat] && v.hand.length <= 2) mt.appendChild(el('span', 'un-shout', '已喊最後一張'));
    meBox.appendChild(mt);
    // 手牌順序：新抽到的牌放最右邊並標「新」，按「整理」才排好
    var HK = BG.handKey(tb, 'uno'), ho = BG.handOrder(HK, v.hand, sortBy(L.sortBy)), hl = ho.list;
    var hand = el('div', 'un-hand'), rows = hl.length > 9 ? 2 : 1, per = Math.ceil(hl.length / rows);
    for (var r = 0; r < rows; r++) {
      var row = el('div', 'un-row');
      hl.slice(r * per, (r + 1) * per).forEach(function (c, j) {
        var fresh = ho.fresh[r * per + j];
        var can = myTurn && UNO.playable(c, v.top, v.color) && (!v.pend || c === v.pend);
        var cd = el('button', 'un-hc' + (can ? ' can' : myTurn ? ' dim' : '') + (L.sel === c ? ' sel' : '') + (v.pend === c ? ' new' : '') + (fresh ? ' fresh-card' : '')); cd.type = 'button'; cd.setAttribute('data-h', c);
        cd.innerHTML = UNO.card(c);
        cd.addEventListener('click', function () {
          if (!myTurn) return;
          if (!can) { ctx.snd('error'); ctx.toast(v.pend ? '剛抽到的那張才能出' : '要出同顏色、同數字或同符號的牌'); return; }
          if (L.sel !== c) { L.sel = c; ctx.snd('tap'); ctx.rerender(); return; }
          if (UNO.isWild(c)) { L.wild = c; ctx.rerender(); return; }
          ctx.snd(c[1] > '9' ? 'cap' : 'move'); act(ctx, 'play', { c: c });
        });
        row.appendChild(cd);
      });
      hand.appendChild(row);
    }
    meBox.appendChild(hand);
    wrap.appendChild(meBox);
    if (L.wild && myTurn) {
      var pk = el('div', 'un-pick'); pk.appendChild(el('p', '', '要換成什麼顏色？'));
      var pr = el('div', 'un-pick-row');
      UNO.COLS.forEach(function (c) { var b = ctx.button('un-cbtn', UNO.CNAME[c], function () { ctx.snd('cap'); act(ctx, 'play', { c: L.wild, color: c }); }); b.style.background = UNO.HEX[c]; pr.appendChild(b); });
      pk.appendChild(pr); pk.appendChild(ctx.button('un-btn', '取消', function () { L.wild = null; ctx.rerender(); }));
      wrap.appendChild(pk);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'un-tools');
      if (myTurn && v.pend) {
        var pc = v.pend;
        var pb0 = ctx.button('un-btn go', '出這張', function () { if (UNO.isWild(pc)) { L.sel = pc; L.wild = pc; ctx.rerender(); } else { ctx.snd('move'); act(ctx, 'play', { c: pc }); } }); pb0.setAttribute('data-h', 'playpend'); tools.appendChild(pb0);
        tools.appendChild(ctx.button('un-btn', '留著，換下一位', function () { act(ctx, 'pass', {}); }));
      }
      if (v.hand.length <= 2 && !v.said[seat]) { var sb = ctx.button('un-btn shout', '📣 最後一張！', function () { ctx.snd('pop'); ctx.send('call', {}); }); sb.setAttribute('data-h', 'call'); tools.appendChild(sb); }
      [['color', '🔀 整理：依顏色'], ['num', '🔀 整理：依數字']].forEach(function (o) { tools.appendChild(ctx.button('un-btn sort-btn' + ((L.sortBy || 'color') === o[0] ? ' on' : ''), o[1], function () { L.sortBy = o[0]; BG.handSort(HK, sortBy(o[0])); ctx.snd('tap'); ctx.rerender(); })); });
      tools.appendChild(ctx.button('un-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？你的牌會收回牌堆。')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('un-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('uno', mod);
})();
