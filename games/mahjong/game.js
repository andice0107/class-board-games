/* 台灣 16 張麻將：2～4 人（正式是 4 人），有花牌，可以吃、碰、槓、胡、自摸，算台數。
   一局 = 一把牌。牌牆留最後 16 張不摸（流局）。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#2a9d5c', '#f4a300'], WIND = '東南西北', KEEP = 16;
  var REASONS = { tsumo: '自摸', ron: '胡牌', exhaust: '流局（沒人胡牌）', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rm(h, t, n) { for (var k = 0; k < (n || 1); k++) { var i = h.indexOf(t); if (i < 0) return false; h.splice(i, 1); } return true; }
  function need(g, s) { return 5 - g.melds[s].length; }
  function cnt(h, t) { return h.filter(function (x) { return x === t; }).length; }
  function seen(g) { var c = []; for (var i = 0; i < 34; i++) c.push(0); g.rivers.forEach(function (r) { r.forEach(function (t) { c[t]++; }); }); g.melds.forEach(function (ms) { ms.forEach(function (m) { if (m.k === 'chi') { c[m.t]++; c[m.t + 1]++; c[m.t + 2]++; } else c[m.t] += m.k === 'pon' ? 3 : 4; }); }); return c; }

  function draw(g, s, back) {
    while (true) {
      if (g.wall.length <= KEEP) { g.res = { w: -1, why: 'exhaust' }; g.phase = 'end'; return false; }
      var t = back ? g.wall.shift() : g.wall.pop();
      if (MJ.isFlower(t)) { g.flowers[s].push(t); back = true; g.log = { k: 'flower', s: s, t: t }; continue; }
      g.hands[s].push(t); g.drawn = t; g.cnt++; break;
    }
    g.turn = s; g.phase = 'discard'; g.kanDraw = !!back && g.kanDraw;
    if (g.out.indexOf(s) >= 0) autoOut(g, s);
    return true;
  }
  function autoOut(g, s) { var t = g.drawn != null ? g.drawn : g.hands[s][g.hands[s].length - 1]; discard(g, s, t); }
  function discard(g, s, t) {
    rm(g.hands[s], t); MJ.sortHand(g.hands[s]); g.rivers[s].push(t); g.last = { s: s, t: t }; g.drawn = null; g.kanDraw = false; g.cnt++;
    g.log = { k: 'discard', s: s, t: t };
    openClaims(g);
  }
  function openClaims(g) {
    var d = g.last.s, t = g.last.t, pend = {}, any = false, lastTile = g.wall.length <= KEEP;
    for (var k = 1; k < g.np; k++) {
      var s = (d + k) % g.np; if (g.out.indexOf(s) >= 0) continue;
      var h = g.hands[s], c = MJ.counts(h), o = {};
      c[t]++; if (MJ.isWin(c)) o.hu = 1; c[t]--;
      if (!lastTile) {
        if (c[t] >= 2) o.pon = 1;
        if (c[t] >= 3) o.kan = 1;
        if (k === 1 && t < 27) {
          var r = t % 9, ch = [];
          [t - 2, t - 1, t].forEach(function (st) { if (st < 0 || st % 9 > 6 || Math.floor(st / 9) !== Math.floor(t / 9) || st % 9 > r || r - st % 9 > 2) return; var need2 = [st, st + 1, st + 2].filter(function (x) { return x !== t; }); if (need2.every(function (x) { return c[x] > 0; })) ch.push(st); });
          if (ch.length) o.chi = ch;
        }
      }
      if (Object.keys(o).length) { pend[s] = o; any = true; }
    }
    g.pend = pend; g.resp = {};
    if (!any) next(g); else g.phase = 'claim';
  }
  function next(g) { g.pend = {}; g.resp = {}; draw(g, (g.last.s + 1) % g.np, false); }
  function resolve(g) {
    if (Object.keys(g.pend).some(function (s) { return !(s in g.resp); })) return;
    var d = g.last.s, t = g.last.t, order = [];
    for (var k = 1; k < g.np; k++) order.push((d + k) % g.np);
    var hu = order.filter(function (s) { return g.resp[s] && g.resp[s].a === 'hu'; });
    if (hu.length) return win(g, hu[0], t, false);
    var pk = order.filter(function (s) { return g.resp[s] && (g.resp[s].a === 'pon' || g.resp[s].a === 'kan'); })[0];
    if (pk != null) {
      var a = g.resp[pk].a; g.rivers[d].pop(); g.cnt++;
      rm(g.hands[pk], t, a === 'kan' ? 3 : 2); g.melds[pk].push({ k: a === 'kan' ? 'kan' : 'pon', t: t, from: d });
      g.log = { k: a, s: pk, t: t }; g.pend = {}; g.resp = {};
      if (a === 'kan') { g.kanDraw = true; draw(g, pk, true); } else { g.turn = pk; g.phase = 'discard'; g.drawn = null; if (g.out.indexOf(pk) >= 0) autoOut(g, pk); }
      return;
    }
    var cs = order.filter(function (s) { return g.resp[s] && g.resp[s].a === 'chi'; })[0];
    if (cs != null) {
      var st = g.resp[cs].st; g.rivers[d].pop(); g.cnt++;
      [st, st + 1, st + 2].forEach(function (x) { if (x !== t) rm(g.hands[cs], x); });
      g.melds[cs].push({ k: 'chi', t: st, got: t, from: d });
      g.log = { k: 'chi', s: cs, t: t }; g.pend = {}; g.resp = {};
      g.turn = cs; g.phase = 'discard'; g.drawn = null;
      return;
    }
    next(g);
  }
  function win(g, s, t, tsumo) {
    var hand = g.hands[s].slice(); if (!tsumo) hand.push(t);
    var r = MJ.tai({ hand: hand, melds: g.melds[s], flowers: g.flowers[s], seat: s, dealer: 0, tsumo: tsumo, kanDraw: g.kanDraw, lastTile: g.wall.length <= KEEP });
    if (!tsumo) g.hands[s].push(t), g.rivers[g.last.s].pop();
    MJ.sortHand(g.hands[s]);
    g.res = { w: s, why: tsumo ? 'tsumo' : 'ron', note: (tsumo ? '自摸' : '胡 ' + MJ.name(t)) + '・' + (r.total ? r.list.map(function (x) { return x[0] + ' ' + x[1]; }).join('、') + '，共 ' + r.total + ' 台' : '沒有台數（屁胡）') };
    g.win = { s: s, t: t, tsumo: tsumo, from: tsumo ? -1 : g.last.s, tai: r };
    g.phase = 'end'; g.cnt++;
  }
  function selfOpts(g, s) {
    if (g.phase !== 'discard' || g.turn !== s) return {};
    var h = g.hands[s], c = MJ.counts(h), o = {};
    if (MJ.isWin(c)) o.tsumo = 1;
    if (g.wall.length > KEEP) {
      var an = []; for (var t = 0; t < 34; t++) if (c[t] === 4) an.push(t); if (an.length) o.ankan = an;
      var ka = g.melds[s].filter(function (m) { return m.k === 'pon' && c[m.t] > 0; }).map(function (m) { return m.t; }); if (ka.length) o.kakan = ka;
    }
    return o;
  }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }

  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3], ver: 1, botDelay: 700,
    reasons: REASONS,
    levelDesc: ['常常亂打牌，不太會吃碰', '會留對子和連號', '會算還差幾張聽牌', '會算哪一張進牌機會最多，很難纏'],
    seatName: function (i) { return WIND[i] + '家' + (i === 0 ? '（莊）' : ''); },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(4, n || 4));
      var g = { np: n, wall: MJ.wall(), hands: [], melds: [], flowers: [], rivers: [], out: [], turn: 0, phase: 'discard', drawn: null, last: null, pend: {}, resp: {}, kanDraw: false, cnt: 0, res: null, log: null };
      for (var s = 0; s < n; s++) { g.hands.push([]); g.melds.push([]); g.flowers.push([]); g.rivers.push([]); }
      for (var r = 0; r < 16; r++) for (var s2 = 0; s2 < n; s2++) g.hands[s2].push(g.wall.pop());
      for (var s3 = 0; s3 < n; s3++) { // 補花
        var h = g.hands[s3];
        for (var i = 0; i < h.length; i++) while (MJ.isFlower(h[i])) { g.flowers[s3].push(h[i]); h[i] = g.wall.shift(); }
        MJ.sortHand(h);
      }
      draw(g, 0, false);
      g.log = null;
      return g;
    },
    turnSeat: function (g) { return g.phase === 'discard' ? g.turn : -1; },
    /* ---- 提示／小提醒（老師端統一控制）---- */
    acting: function (g) {
      if (g.res) return [];
      if (g.phase === 'discard') return g.out.indexOf(g.turn) >= 0 ? [] : [g.turn];
      if (g.phase === 'claim') return Object.keys(g.pend).map(Number).filter(function (s) { return !(s in g.resp) && g.out.indexOf(s) < 0; });
      return [];
    },
    /* 別人出牌時，沒有吃碰機會的人也可能在想「我能不能吃／碰」：只給提示／小提醒，不倒數 */
    watch: function (g) {
      if (g.res || g.phase !== 'claim' || !g.last) return [];
      var a = []; for (var s = 0; s < g.np; s++) if (s !== g.last.s && g.out.indexOf(s) < 0 && !g.pend[s]) a.push(s);
      return a;
    },
    autoPlay: function (g, seat) {
      if (g.res) return null;
      if (g.phase === 'claim') { var o = g.pend[seat]; if (!o || seat in g.resp) return null; return { t: 'resp', a: o.hu ? 'hu' : 'pass' }; }
      if (g.phase !== 'discard' || g.turn !== seat) return null;
      if (selfOpts(g, seat).tsumo) return { t: 'tsumo' };
      return { t: 'discard', tile: MJ.pickDiscard(g.hands[seat], need(g, seat), 2, null) };
    },
    hintDesc: '輪到你打牌時：先看能不能自摸／槓；沒有的話，會用黃框亮出「現在比較沒用、可以優先考慮打出去」的幾張牌（不會直接指定答案），如果打其中一張就會聽牌也會告訴你。別人打出牌時：如果你可以胡、碰、槓、吃，會亮出對應的按鈕、那張牌和你手上要用到的牌，並說明怎麼吃碰；如果你不能吃也不能碰，會直接告訴你原因。',
    tipDesc: '別人打出牌，而你有機會胡／碰／槓／吃時，發呆幾秒後會明確提醒你「可以…」，下面的按鈕也會一直閃亮；如果你不能吃也不能碰，會提醒你「不用按任何按鈕，輪到你時系統自動幫你摸牌」；輪到你打牌時發呆，會提醒你「先點一張牌再點一次打出」。',
    hint: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      var h = g.hands[seat], N = need(g, seat), t, hl;
      if (g.phase === 'claim' && g.last) {
        var o = g.pend[seat], lt = g.last.t, nm = MJ.name(lt);
        if (!o) {
          var why = g.last.s === seat ? '這是你自己打的牌。' : '你手上沒有兩張一樣的「' + nm + '」可以碰，' + (lt >= 27 ? '字牌也不能吃。' : (seat === (g.last.s + 1) % g.np ? '也湊不出可以吃的順子。' : '而且只有打牌那家的「下家」才能吃。'));
          return { msg: '這張「' + nm + '」你不能吃也不能碰。' + why + '不用按任何按鈕，等其他人決定，輪到你時系統會自動幫你摸一張牌。', hl: ['last'] };
        }
        if (seat in g.resp) return null;
        hl = ['last'];
        if (o.hu) return { msg: '這張「' + nm + '」你可以胡！按亮黃框的「胡！」。', hl: ['last', 'c:hu'] };
        var parts = [];
        if (o.kan) { parts.push('槓（手上有三張「' + nm + '」）'); hl.push('c:kan', 't' + lt); }
        if (o.pon) { parts.push('碰（手上有兩張「' + nm + '」）'); hl.push('c:pon', 't' + lt); }
        (o.chi || []).forEach(function (st) {
          var use = [st, st + 1, st + 2].filter(function (x) { return x !== lt; });
          parts.push('吃（用你手上的「' + use.map(MJ.name).join('」和「') + '」）'); hl.push('c:chi' + st); use.forEach(function (x) { hl.push('t' + x); });
        });
        return { msg: '這張「' + nm + '」你可以：' + parts.join('；') + '。吃碰之後這些牌會攤開，還要再打一張，想清楚再決定；不想要就按「過」。', hl: hl };
      }
      if (g.phase !== 'discard' || g.turn !== seat) return null;
      var so = selfOpts(g, seat);
      if (so.tsumo) return { msg: '你摸到的這張可以自摸胡牌！按亮黃框的「自摸！」。', hl: ['c:tsumo'] };
      var c = MJ.counts(h), types = [], res = [];
      h.forEach(function (x) { if (types.indexOf(x) < 0) types.push(x); });
      types.forEach(function (x) { c[x]--; res.push({ t: x, s: MJ.shanten(c, N), u: MJ.useful(c, x) }); c[x]++; });
      var mn = Math.min.apply(null, res.map(function (r) { return r.s; }));
      var cand = res.filter(function (r) { return r.s === mn; }).sort(function (a, b) { return a.u - b.u; }).slice(0, 3);
      hl = cand.map(function (r) { return 't' + r.t; });
      var extra = '';
      if (so.ankan) { extra += '（你手上有四張一樣的牌，也可以「暗槓」）'; hl.push('c:ankan'); }
      if (so.kakan) { extra += '（你可以「加槓」）'; hl.push('c:kakan'); }
      return { msg: (mn <= 0 ? '打出亮黃框的其中一張牌，你就聽牌了（只差一張就胡）。' : '亮黃框的牌是你現在比較沒用的牌，可以優先考慮打出去（也要看你想做什麼牌型）。') + extra, hl: hl };
    },
    nudge: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      if (g.phase === 'claim' && g.last) {
        var o = g.pend[seat], nm = MJ.name(g.last.t);
        if (!o) return g.pend[seat] || seat === g.last.s ? null : '別人打了「' + nm + '」，你不能吃也不能碰，不用按任何按鈕喔。等其他人決定後，輪到你時系統會自動幫你摸一張牌。';
        if (seat in g.resp) return null;
        var can = []; if (o.hu) can.push('胡'); if (o.kan) can.push('槓'); if (o.pon) can.push('碰'); if (o.chi) can.push('吃');
        return '別人打了「' + nm + '」，你可以「' + can.join('」「') + '」！下面閃亮的按鈕就是你能做的；不想要就按「過」（不按也會自動過）。';
      }
      if (g.phase !== 'discard' || g.turn !== seat) return null;
      var so = selfOpts(g, seat);
      if (so.tsumo) return '你可以自摸胡牌了！按下面的「自摸！」。';
      return '輪到你打牌了：先點一張要打出去的牌，再點一次（或按「打出」）。不知道打哪一張，可以按 💡 提示。' + (so.ankan || so.kakan ? '你也可以槓喔。' : '');
    },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.phase = 'end'; },
    view: function (g, seat) {
      var me = seat >= 0 && !g.res;
      return { np: g.np, turn: g.phase === 'discard' ? g.turn : -1, phase: g.phase, cnt: g.cnt, left: Math.max(0, g.wall.length - KEEP),
        hand: seat >= 0 ? g.hands[seat] : null, drawn: seat >= 0 && g.turn === seat ? g.drawn : null,
        counts: g.hands.map(function (h) { return h.length; }),
        melds: g.melds.map(function (ms, s) { return ms.map(function (m) { return m.k === 'ankan' && s !== seat && !g.res ? { k: 'ankan', t: -1 } : m; }); }),
        flowers: g.flowers, rivers: g.rivers, last: g.last, out: g.out, log: g.log,
        opts: me && g.phase === 'claim' && g.pend[seat] && !(seat in g.resp) ? g.pend[seat] : null,
        waiting: g.phase === 'claim' ? Object.keys(g.pend).filter(function (s) { return !(s in g.resp); }).map(Number) : [],
        self: me ? selfOpts(g, seat) : {},
        win: g.win || null, hands: g.res ? g.hands : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，電腦會幫你把這局打完（只摸牌打牌）'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.n != null && d.n !== g.cnt) return false;
      if (d.t === 'resp') {
        if (g.phase !== 'claim' || !g.pend[seat] || seat in g.resp) return false;
        var o = g.pend[seat], a = d.a;
        if (a !== 'pass' && !o[a]) return false;
        if (a === 'chi' && o.chi.indexOf(d.st) < 0) return false;
        g.resp[seat] = { a: a, st: d.st };
        resolve(g); return true;
      }
      if (g.phase !== 'discard' || g.turn !== seat) return false;
      var so = selfOpts(g, seat);
      if (d.t === 'tsumo') { if (!so.tsumo) return false; win(g, seat, g.drawn, true); return true; }
      if (d.t === 'ankan') { if (!so.ankan || so.ankan.indexOf(d.tile) < 0) return false; rm(g.hands[seat], d.tile, 4); g.melds[seat].push({ k: 'ankan', t: d.tile }); g.log = { k: 'ankan', s: seat, t: -1 }; g.cnt++; g.kanDraw = true; draw(g, seat, true); return true; }
      if (d.t === 'kakan') { if (!so.kakan || so.kakan.indexOf(d.tile) < 0) return false; rm(g.hands[seat], d.tile); g.melds[seat].forEach(function (m) { if (m.k === 'pon' && m.t === d.tile) m.k = 'kan'; }); g.log = { k: 'kan', s: seat, t: d.tile }; g.cnt++; g.kanDraw = true; draw(g, seat, true); return true; }
      if (d.t === 'discard') { if (g.hands[seat].indexOf(d.tile) < 0) return false; discard(g, seat, d.tile); return true; }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res) return null;
      if (g.phase === 'claim') {
        var o = g.pend[seat]; if (!o || seat in g.resp) return null;
        if (o.hu) return { t: 'resp', a: 'hu' };
        var h = g.hands[seat], t = g.last.t, N = need(g, seat), cur = MJ.shanten(MJ.counts(h), N);
        if (lv <= 1) { if (o.pon && Math.random() < .5) return { t: 'resp', a: 'pon' }; return { t: 'resp', a: 'pass' }; }
        if (o.kan && lv >= 2) return { t: 'resp', a: 'kan' };
        if (o.pon && (t >= 31 || t === 27 + seat || MJ.afterClaim(h, [t, t], N) < cur)) return { t: 'resp', a: 'pon' };
        if (o.chi && lv >= 3) { var best = null; o.chi.forEach(function (st) { var need2 = [st, st + 1, st + 2].filter(function (x) { return x !== t; }); var s2 = MJ.afterClaim(h, need2, N); if (s2 < cur && (!best || s2 < best.s)) best = { st: st, s: s2 }; }); if (best) return { t: 'resp', a: 'chi', st: best.st }; }
        return { t: 'resp', a: 'pass' };
      }
      if (g.phase !== 'discard' || g.turn !== seat) return null;
      var so = selfOpts(g, seat);
      if (so.tsumo) return { t: 'tsumo' };
      if (lv >= 2 && so.ankan) return { t: 'ankan', tile: so.ankan[0] };
      if (lv >= 2 && so.kakan) return { t: 'kakan', tile: so.kakan[0] };
      return { t: 'discard', tile: MJ.pickDiscard(g.hands[seat], need(g, seat), lv, lv >= 4 ? seen(g) : null) };
    },
    hostView: function (g) {
      var h = '<div class="mj-host">';
      for (var s = 0; s < g.np; s++) {
        h += '<div class="mj-hrow' + (g.phase === 'discard' && g.turn === s && !g.res ? ' on' : '') + '"><i style="background:' + SEATC[s] + '"></i><b>' + WIND[s] + '</b><span class="mj-hm">' +
          g.melds[s].map(function (m) { return meldHTML(m, true); }).join('') + (g.flowers[s].length ? '<em>花' + g.flowers[s].length + '</em>' : '') + '</span><span class="mj-hr">' + g.rivers[s].slice(-8).map(function (t) { return MJ.svg(t); }).join('') + '</span></div>';
      }
      return h + '</div>';
    },
    hostStatus: function (g) { return { t: g.res ? REASONS[g.res.why] || '' : '牌牆剩 ' + Math.max(0, g.wall.length - KEEP) + ' 張', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; g.phase = 'end'; return; }
    if (g.phase === 'claim' && g.pend[seat] && !(seat in g.resp)) { g.resp[seat] = { a: 'pass' }; resolve(g); }
    else if (g.phase === 'discard' && g.turn === seat) autoOut(g, seat);
  }
  function meldHTML(m, small) {
    var ts = m.k === 'chi' ? [m.t, m.t + 1, m.t + 2] : m.k === 'pon' ? [m.t, m.t, m.t] : [m.t, m.t, m.t, m.t];
    return '<span class="mj-meld' + (small ? ' s' : '') + '">' + ts.map(function (t, i) { return m.k === 'ankan' && (t < 0 || i === 0 || i === 3) ? MJ.svg(0, { back: true }) : MJ.svg(t); }).join('') + '</span>';
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: null, round: -1, sent: -1, logKey: '', claimAt: 0, claimCnt: -1, timer: null };
  var AUTO = 20000;
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.sent = -1; L.logKey = ''; }
    if (v.opts && L.claimCnt !== v.cnt) { L.claimCnt = v.cnt; L.claimAt = Date.now(); fx.snd('turn'); }
    var lg = v.log, key = lg ? lg.k + lg.s + ':' + v.cnt + ':' + (lg.t) : '';
    if (lg && key !== L.logKey && prev) {
      if (lg.k === 'pon') fx.toast(who(tb, lg.s) + '：碰！'); else if (lg.k === 'chi') fx.toast(who(tb, lg.s) + '：吃！'); else if (lg.k === 'kan' || lg.k === 'ankan') fx.toast(who(tb, lg.s) + '：槓！');
      if (lg.k === 'discard') fx.snd('move'); else if (lg.k !== 'flower') fx.snd('cap');
    }
    L.logKey = key;
    if (prev && prev.view && v.turn === tb.seat && prev.view.turn !== tb.seat) fx.snd('turn');
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast(tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始打牌囉！東家是莊家，先打一張');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, np = v.np;
    // 老師暫停（有新同學加入）時，吃碰的 20 秒也跟著停
    if (tb.paused) { clearTimeout(L.timer); L.pz = L.pz || Date.now(); } else if (L.pz) { L.claimAt += Date.now() - L.pz; L.pz = 0; }
    var myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var wrap = el('div', 'mj-table');
    // 其他玩家
    var opp = el('div', 'mj-opps');
    var rel = np === 4 ? ['下家', '對家', '上家'] : np === 3 ? ['下家', '上家'] : ['對家'];
    for (var k = 1; k < np; k++) {
      var s = (seat + k) % np, b = el('div', 'mj-opp' + (v.turn === s && !tb.res ? ' on' : '') + (v.waiting.indexOf(s) >= 0 ? ' think' : '') + (v.out.indexOf(s) >= 0 ? ' out' : ''));
      var top = el('div', 'mj-ot'); var dot = el('i'); dot.style.background = SEATC[s]; top.appendChild(dot);
      top.appendChild(el('b', '', WIND[s])); top.appendChild(el('span', 'n', short(tb, s))); top.appendChild(el('small', '', rel[k - 1]));
      b.appendChild(top);
      var info = el('div', 'mj-oi'); info.innerHTML = '<span class="mj-cnt">🀫 ' + v.counts[s] + '</span>' + (v.flowers[s].length ? '<span class="mj-fl">' + v.flowers[s].map(function (f) { return MJ.svg(f); }).join('') + '</span>' : '');
      b.appendChild(info);
      if (v.melds[s].length) { var md = el('div', 'mj-om'); md.innerHTML = v.melds[s].map(function (m) { return meldHTML(m, true); }).join(''); b.appendChild(md); }
      if (tb.res && v.hands) { var hh = el('div', 'mj-om reveal'); hh.innerHTML = v.hands[s].map(function (t) { return MJ.svg(t); }).join(''); b.appendChild(hh); }
      opp.appendChild(b);
    }
    wrap.appendChild(opp);
    // 狀態
    var st = el('div', 'mj-status');
    if (tb.res) {
      if (v.win) st.textContent = (v.win.s === seat ? '🎉 你' : short(tb, v.win.s)) + (v.win.tsumo ? ' 自摸！' : ' 胡牌！' + (v.win.from === seat ? '（你放槍）' : '（' + short(tb, v.win.from) + ' 放槍）'));
      else st.textContent = '這局結束了：' + (REASONS[tb.res.why] || '');
      st.className = 'mj-status end';
    } else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (v.opts) { st.textContent = '有人打出 ' + MJ.name(v.last.t) + '，你要吃／碰／胡嗎？'; st.className = 'mj-status me'; }
    else if (myTurn) { st.textContent = v.self.tsumo ? '你可以自摸！' : (L.sel != null ? '再點一次「' + MJ.name(L.sel) + '」或按「打出」' : '輪到你：點一張牌打出去'); st.className = 'mj-status me'; }
    else if (v.waiting.length) st.textContent = '等 ' + v.waiting.map(function (s) { return who(tb, s); }).join('、') + ' 決定要不要吃碰…';
    else st.textContent = '輪到 ' + (v.turn >= 0 ? who(tb, v.turn) : '…');
    wrap.appendChild(st);
    // 桌面：最新一張＋四家的河
    var felt = el('div', 'mj-felt');
    var mid = el('div', 'mj-mid');
    mid.innerHTML = '<div class="mj-wall">牌牆<br><b>' + v.left + '</b> 張</div>' + (v.last && !tb.res ? '<div class="mj-lastt' + (v.opts ? ' hint-hl' : '') + '" data-h="last"><small>' + who(tb, v.last.s) + ' 打出</small>' + MJ.svg(v.last.t) + '</div>' : '');
    if (tb.res && v.win) { var tl = el('div', 'mj-tai'); tl.innerHTML = '<b>' + (v.win.tai.total ? v.win.tai.total + ' 台' : '屁胡') + '</b>' + v.win.tai.list.map(function (x) { return '<span>' + x[0] + ' ' + x[1] + '</span>'; }).join(''); mid.appendChild(tl); }
    felt.appendChild(mid);
    var rivers = el('div', 'mj-rivers');
    for (var q = 0; q < np; q++) {
      var s3 = (seat + q) % np, rv = el('div', 'mj-river'); rv.style.borderColor = SEATC[s3];
      rv.innerHTML = '<small style="color:' + SEATC[s3] + '">' + WIND[s3] + '・' + (q === 0 ? '我' : short(tb, s3)) + '</small>' + v.rivers[s3].map(function (t, i) { return '<span class="' + (v.last && v.last.s === s3 && i === v.rivers[s3].length - 1 && !tb.res ? 'new' : '') + '">' + MJ.svg(t) + '</span>'; }).join('');
      rivers.appendChild(rv);
    }
    felt.appendChild(rivers);
    wrap.appendChild(felt);
    // 我的牌
    var mine = el('div', 'mj-me' + (myTurn || v.opts ? ' turn' : ''));
    var mt = el('div', 'mj-me-top'); var d2 = el('i'); d2.style.background = SEATC[seat]; mt.appendChild(d2);
    mt.appendChild(el('b', '', WIND[seat] + (seat === 0 ? '・莊' : ''))); mt.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我')));
    if (v.flowers[seat].length) { var fl = el('span', 'mj-fl'); fl.innerHTML = v.flowers[seat].map(function (f) { return MJ.svg(f); }).join(''); mt.appendChild(fl); }
    mine.appendChild(mt);
    if (v.melds[seat].length) { var mm = el('div', 'mj-mymelds'); mm.innerHTML = v.melds[seat].map(function (m) { return meldHTML(m); }).join(''); mine.appendChild(mm); }
    var hand = el('div', 'mj-hand');
    // 手牌順序：摸進來的牌放最右邊並標「新」，按「整理」才依花色（萬、筒、條、字）排到該在的位置
    var HK = BG.handKey(tb, 'mahjong'), ho = BG.handOrder(HK, v.hand, MJ.sortHand), tiles = ho.list;
    function tileBtn(t, extra) {
      var b2 = el('button', 'mj-tile' + (L.sel === t ? ' sel' : '') + (extra || '')); b2.type = 'button'; b2.setAttribute('data-h', 't' + t); b2.innerHTML = MJ.svg(t);
      if (tb.res && v.win && v.win.s === seat && t === v.win.t) b2.classList.add('win');
      b2.addEventListener('click', function () {
        if (!myTurn) return;
        if (L.sel === t) { doDiscard(t); return; }
        L.sel = t; ctx.snd('tap'); ctx.rerender();
      });
      return b2;
    }
    tiles.forEach(function (t, i) { hand.appendChild(tileBtn(t, ho.fresh[i] ? ' drawn fresh-card' : '')); });
    mine.appendChild(hand);
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; L.sel = null; ctx.send(t, d); ctx.rerender(); }
    function doDiscard(t) { send('discard', { tile: t }); ctx.snd('move'); }
    // 動作按鈕：能胡／碰／槓／吃／自摸時，按鈕會一直閃亮（明顯提示，不算提示次數）
    function clm(b, id) { b.setAttribute('data-h', id); b.classList.add('hint-hl'); return b; }
    var bar = el('div', 'mj-acts');
    if (v.opts && !tb.res && L.sent !== v.cnt) {
      var o = v.opts;
      if (o.hu) bar.appendChild(clm(ctx.button('mj-btn hu', '胡！', function () { send('resp', { a: 'hu' }); }), 'c:hu'));
      if (o.kan) bar.appendChild(clm(ctx.button('mj-btn', '槓', function () { send('resp', { a: 'kan' }); }), 'c:kan'));
      if (o.pon) bar.appendChild(clm(ctx.button('mj-btn', '碰', function () { send('resp', { a: 'pon' }); }), 'c:pon'));
      if (o.chi) o.chi.forEach(function (stt) {
        var b3 = ctx.button('mj-btn chi', '', function () { send('resp', { a: 'chi', st: stt }); });
        b3.innerHTML = '吃 <span>' + [stt, stt + 1, stt + 2].map(function (x) { return MJ.svg(x); }).join('') + '</span>'; bar.appendChild(clm(b3, 'c:chi' + stt));
      });
      var left = Math.max(0, Math.ceil((AUTO - ((L.pz || Date.now()) - L.claimAt)) / 1000));
      bar.appendChild(ctx.button('mj-btn pass', '過（' + left + '）', function () { send('resp', { a: 'pass' }); }));
      clearTimeout(L.timer);
      L.timer = setTimeout(function () { var cv = (BGPlayer.state().tb || {}).view; if (cv && cv.opts && cv.cnt === v.cnt && L.sent !== v.cnt && !(BGPlayer.state().tb || {}).paused) { if (Date.now() - L.claimAt >= AUTO) send('resp', { a: 'pass' }); else ctx.rerender(); } }, 1000);
    } else if (myTurn) {
      if (v.self.tsumo) bar.appendChild(clm(ctx.button('mj-btn hu', '自摸！', function () { send('tsumo'); }), 'c:tsumo'));
      (v.self.ankan || []).forEach(function (t) { var b4 = ctx.button('mj-btn', '', function () { send('ankan', { tile: t }); }); b4.setAttribute('data-h', 'c:ankan'); b4.innerHTML = '暗槓 ' + MJ.svg(t); bar.appendChild(b4); });
      (v.self.kakan || []).forEach(function (t) { var b5 = ctx.button('mj-btn', '', function () { send('kakan', { tile: t }); }); b5.setAttribute('data-h', 'c:kakan'); b5.innerHTML = '加槓 ' + MJ.svg(t); bar.appendChild(b5); });
      var db = ctx.button('mj-btn go', L.sel != null ? '打出 ' + MJ.name(L.sel) : '先點一張牌', function () { if (L.sel != null) doDiscard(L.sel); });
      if (L.sel == null) db.disabled = true; bar.appendChild(db);
    }
    if (bar.children.length) mine.appendChild(bar);
    wrap.appendChild(mine);
    if (!tb.res && !out) {
      var tools = el('div', 'mj-tools');
      tools.appendChild(ctx.button('mj-btn ghost sort-btn', '🔀 整理手牌', function () { BG.handSort(HK, MJ.sortHand); ctx.snd('tap'); ctx.rerender(); }));
      tools.appendChild(ctx.button('mj-btn ghost', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？電腦會幫你把牌打完，這局算輸。')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('mj-btn ghost'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  /* 一局結束的資訊：誰胡、誰放槍（或自摸）、胡哪一張、台數 */
  mod.resultNote = function (tb, nm) {
    var v = tb.view, w = v.win, r = tb.res, W2 = function (i) { return WIND[i] + '家・' + nm(i); };
    if (!w) return [r && r.why === 'exhaust' ? '🀫 流局：牌牆只剩最後 16 張，沒有人胡牌，大家平手。' : '這局結束：' + (REASONS[r.why] || '')];
    var L2 = ['🏆 胡牌：' + W2(w.s) + (w.tsumo ? '（自摸）' : '')];
    L2.push(w.tsumo ? '🙌 自摸：自己摸到胡的那張，沒有人放槍' : '💥 放槍：' + W2(w.from) + '（打出了 ' + MJ.name(w.t) + '）');
    L2.push('🀄 胡的牌：' + MJ.name(w.t));
    L2.push('🧮 台數：' + (w.tai.total ? w.tai.list.map(function (x) { return x[0] + ' ' + x[1]; }).join('、') + '，共 ' + w.tai.total + ' 台' : '沒有台數（屁胡）'));
    return L2;
  };
  BG.register('mahjong', mod);
  mod._meld = meldHTML;
})();
