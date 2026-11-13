/* 台灣 16 張麻將：2～4 人（正式是 4 人），有花牌，可以吃、碰、槓、胡、自摸，算台數。
   一局 = 一把牌。牌牆留最後 16 張不摸（流局）。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#2a9d5c', '#f4a300'], WIND = '東南西北', KEEP = 16;
  var REASONS = { match: '整場打完了', tsumo: '自摸', ron: '胡牌', exhaust: '流局（沒人胡牌）', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rm(h, t, n) { for (var k = 0; k < (n || 1); k++) { var i = h.indexOf(t); if (i < 0) return false; h.splice(i, 1); } return true; }
  function need(g, s) { return 5 - g.melds[s].length; }
  function cnt(h, t) { return h.filter(function (x) { return x === t; }).length; }
  function seen(g) { var c = []; for (var i = 0; i < 34; i++) c.push(0); g.rivers.forEach(function (r) { r.forEach(function (t) { c[t]++; }); }); g.melds.forEach(function (ms) { ms.forEach(function (m) { if (m.k === 'chi') { c[m.t]++; c[m.t + 1]++; c[m.t + 2]++; } else c[m.t] += m.k === 'pon' ? 3 : 4; }); }); return c; }

  var HOLD = 2400; // 吃碰槓之後，放大特效播完（約 2 秒）大家才能繼續動作
  function holdLeft(g) { return g.hold ? Math.max(0, g.hold - Date.now()) : 0; }
  var BASE = 3, QN = { east: 1, full: 4 }, QNAME = ['東風圈', '南風圈', '西風圈', '北風圈'];
  var MODES = { single: '單局', east: '一圈（東風圈）', full: '全場（東南西北四圈）' };
  function multi(g) { return g.mode === 'east' || g.mode === 'full'; }
  function windOf(g, s) { return (s - g.hd + g.np) % g.np; }   // 0=東（莊家）
  function draw(g, s, back) {
    while (true) {
      if (g.wall.length <= KEEP) { endHand(g, null); return false; }
      var t = back ? g.wall.shift() : g.wall.pop();
      if (MJ.isFlower(t)) { g.flowers[s].push(t); back = true; g.log = { k: 'flower', s: s, t: t }; if (flowerWin(g, s)) return false; continue; }
      g.hands[s].push(t); g.drawn = t; g.cnt++; break;
    }
    g.turn = s; g.phase = 'discard'; g.kanDraw = !!back && g.kanDraw;
    if (g.out.indexOf(s) >= 0) autoOut(g, s);
    return true;
  }
  /* 八仙過海：一個人收齊 8 張花；七搶一：你有 7 張花，別人摸到第 8 張，你直接胡 */
  function flowerWin(g, s) {
    if (g.flowers[s].length === 8) { specialWin(g, s, -1, '八仙過海'); return true; }
    if (g.flowers[s].length === 1) for (var p = 0; p < g.np; p++) if (p !== s && g.flowers[p].length === 7) { specialWin(g, p, s, '七搶一'); return true; }
    return false;
  }
  function specialWin(g, s, from, nm) {
    MJ.sortHand(g.hands[s]);
    endHand(g, { s: s, t: -1, tsumo: from < 0, from: from, special: nm, tai: { list: [[nm, 8]], total: 8 } });
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
  /* 加槓：先問其他人要不要「搶槓」胡這張 */
  function kakan(g, seat, tile) {
    rm(g.hands[seat], tile); g.cnt++;
    var pend = {}, any = false;
    for (var k = 1; k < g.np; k++) { var s = (seat + k) % g.np; if (g.out.indexOf(s) >= 0) continue; var c = MJ.counts(g.hands[s]); c[tile]++; if (MJ.isWin(c)) { pend[s] = { hu: 1, rob: 1 }; any = true; } }
    if (!any) return finishKakan(g, seat, tile);
    g.last0 = g.last; g.last = { s: seat, t: tile, rob: 1 }; g.pend = pend; g.resp = {}; g.phase = 'claim'; g.drawn = null;
    g.log = { k: 'kakan?', s: seat, t: tile };
  }
  function finishKakan(g, seat, tile) {
    if (g.last && g.last.rob) { g.last = g.last0 || null; g.last0 = null; }
    g.melds[seat].forEach(function (m) { if (m.k === 'pon' && m.t === tile) m.k = 'kan'; });
    g.log = { k: 'kan', s: seat, t: tile }; g.pend = {}; g.resp = {}; g.nclaim++; g.cnt++; g.kanDraw = true; draw(g, seat, true);
  }
  function resolve(g) {
    if (Object.keys(g.pend).some(function (s) { return !(s in g.resp); })) return;
    var d = g.last.s, t = g.last.t, order = [];
    for (var k = 1; k < g.np; k++) order.push((d + k) % g.np);
    var hu = order.filter(function (s) { return g.resp[s] && g.resp[s].a === 'hu'; });
    if (hu.length) return win(g, hu[0], t, false);
    if (g.last.rob) return finishKakan(g, d, t);
    var pk = order.filter(function (s) { return g.resp[s] && (g.resp[s].a === 'pon' || g.resp[s].a === 'kan'); })[0];
    if (pk != null) {
      var a = g.resp[pk].a; g.rivers[d].pop(); g.cnt++; g.nclaim++;
      rm(g.hands[pk], t, a === 'kan' ? 3 : 2); g.melds[pk].push({ k: a === 'kan' ? 'kan' : 'pon', t: t, from: d });
      g.log = { k: a, s: pk, t: t, from: d }; g.pend = {}; g.resp = {}; g.hold = Date.now() + HOLD;
      if (a === 'kan') { g.kanDraw = true; draw(g, pk, true); } else { g.turn = pk; g.phase = 'discard'; g.drawn = null; if (g.out.indexOf(pk) >= 0) autoOut(g, pk); }
      return;
    }
    var cs = order.filter(function (s) { return g.resp[s] && g.resp[s].a === 'chi'; })[0];
    if (cs != null) {
      var st = g.resp[cs].st; g.rivers[d].pop(); g.cnt++; g.nclaim++;
      [st, st + 1, st + 2].forEach(function (x) { if (x !== t) rm(g.hands[cs], x); });
      g.melds[cs].push({ k: 'chi', t: st, got: t, from: d });
      g.log = { k: 'chi', s: cs, t: t, from: d }; g.pend = {}; g.resp = {}; g.hold = Date.now() + HOLD;
      g.turn = cs; g.phase = 'discard'; g.drawn = null;
      return;
    }
    next(g);
  }
  function win(g, s, t, tsumo) {
    var rob = !tsumo && g.last && g.last.rob, D = g.M.dealer;
    var hand = g.hands[s].slice(); if (!tsumo) hand.push(t);
    var first = null;
    if (!g.nclaim) {
      if (tsumo && s === D && g.rivers.every(function (r) { return !r.length; })) first = 'heaven';
      else if (tsumo && s !== D && !g.rivers[s].length) first = 'earth';
      else if (!tsumo && s !== D && !g.rivers[s].length) first = 'human';
    }
    var r = MJ.tai({ hand: hand, melds: g.melds[s], flowers: g.flowers[s], wind: windOf(g, s), round: g.M.quan % 4, tsumo: tsumo, win: t, kanDraw: g.kanDraw, lastTile: g.wall.length <= KEEP, rob: rob, first: first });
    if (!tsumo) { g.hands[s].push(t); if (!rob) g.rivers[g.last.s].pop(); }
    MJ.sortHand(g.hands[s]);
    endHand(g, { s: s, t: t, tsumo: tsumo, from: tsumo ? -1 : g.last.s, rob: rob ? 1 : 0, tai: r });
  }
  /* 一把牌結束：算付分、決定下一把的莊家和圈風；單局模式直接結束 */
  function endHand(g, w) {
    var M = g.M, D = M.dealer, dt = 1 + 2 * M.lian, delta = []; for (var i = 0; i < g.np; i++) delta.push(0);
    if (w) {
      w.pay = []; w.dt = dt; w.lian = M.lian; w.dealer = D;
      var payers = w.tsumo ? alive(g).concat(g.out).filter(function (p) { return p !== w.s; }) : [w.from];
      payers.forEach(function (p) {
        var x = (w.s === D || p === D) ? dt : 0, amt = BASE + w.tai.total + x;
        delta[p] -= amt; delta[w.s] += amt; w.pay.push({ s: p, dt: x, amt: amt });
      });
    }
    var rec = { no: M.no, quan: M.quan, dealer: D, lian: M.lian, w: w ? w.s : -1, from: w ? w.from : -1, tsumo: w ? w.tsumo : false, t: w ? w.t : -1, tai: w ? w.tai.total : 0, sp: w && w.special || '', d: delta };
    if (multi(g)) { for (var k = 0; k < g.np; k++) M.sc[k] += delta[k]; M.hist.push(rec); }
    g.win = w; g.drawn = null; g.pend = {}; g.resp = {};
    // 莊家胡牌或流局 → 連莊；別人胡 → 下莊，輪到下一家當莊，繞一圈回到起莊的人就換下一個圈風
    w = g.win;
    if (!w || w.s === D) M.lian++; else { M.lian = 0; M.dealer = (D + 1) % g.np; if (M.dealer === M.start) M.quan++; }
    g.cnt++;
    if (!multi(g)) {
      if (!w) g.res = { w: -1, why: 'exhaust' };
      else g.res = { w: w.s, why: w.tsumo ? 'tsumo' : 'ron', note: (w.special || (w.tsumo ? '自摸' : '胡 ' + MJ.name(w.t))) + '・' + (w.tai.total ? w.tai.list.map(function (x) { return x[0] + ' ' + x[1]; }).join('、') + '，共 ' + w.tai.total + ' 台' : '沒有台數（屁胡）') };
      g.phase = 'end'; return;
    }
    g.log = { k: 'hand', s: w ? w.s : -1, t: w ? w.t : -1 };
    if (M.quan >= QN[g.mode]) { finishMatch(g, 'match'); return; }
    g.phase = 'hand'; g.ready = {}; g.out.forEach(function (s) { g.ready[s] = true; });
  }
  function finishMatch(g, why) {
    var al = alive(g), top = Math.max.apply(null, al.map(function (s) { return g.M.sc[s]; }));
    g.res = { ws: al.filter(function (s) { return g.M.sc[s] === top; }), why: why };
    g.phase = 'end'; g.cnt++;
  }
  /* 發一把新牌（全場模式每一把都會重新發） */
  function deal(g) {
    var n = g.np, D = g.M.dealer;
    g.wall = MJ.wall(); g.hands = []; g.melds = []; g.flowers = []; g.rivers = [];
    g.turn = D; g.phase = 'discard'; g.drawn = null; g.last = null; g.last0 = null; g.pend = {}; g.resp = {}; g.kanDraw = false; g.log = null; g.win = null; g.ready = {}; g.nclaim = 0;
    g.M.no++; g.hd = D;
    for (var s = 0; s < n; s++) { g.hands.push([]); g.melds.push([]); g.flowers.push([]); g.rivers.push([]); }
    for (var r = 0; r < 16; r++) for (var k = 0; k < n; k++) g.hands[(D + k) % n].push(g.wall.pop());
    for (var k2 = 0; k2 < n; k2++) { // 補花（從莊家開始）
      var s3 = (D + k2) % n, h = g.hands[s3];
      for (var i = 0; i < h.length; i++) while (MJ.isFlower(h[i])) { g.flowers[s3].push(h[i]); h[i] = g.wall.shift(); }
      MJ.sortHand(h);
    }
    for (var k3 = 0; k3 < n; k3++) { var s4 = (D + k3) % n; if (g.flowers[s4].length === 8) return specialWin(g, s4, -1, '八仙過海'); }
    for (var k4 = 0; k4 < n; k4++) { var s5 = (D + k4) % n; if (g.flowers[s5].length === 7) { for (var p = 0; p < n; p++) if (p !== s5 && g.flowers[p].length === 1) return specialWin(g, s5, p, '七搶一'); } }
    draw(g, D, false);
    if (g.phase === 'discard') g.log = null;
    g.cnt++;
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
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3], ver: 2, botDelay: 700,
    opts: [{ k: 'mode', label: '麻將要打：', list: [['single', '🀄 單局（打一把就結束）'], ['east', '🀀 一圈（東風圈：每人當一次莊）'], ['full', '🏆 全場（東南西北四圈，正式規則）']], note: '一圈、全場會輪流當莊、連莊，累計底 3 分＋每台 1 分，打完才算輸贏' }],
    reasons: REASONS,
    levelDesc: ['常常亂打牌，不太會吃碰', '會留對子和連號', '會算還差幾張聽牌', '會算哪一張進牌機會最多，很難纏'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      n = Math.max(2, Math.min(4, n || 4));
      var mode = o && MODES[o.mode] ? o.mode : 'single', st = mode === 'single' ? 0 : Math.floor(Math.random() * n); // 全場：隨機決定起莊（像擲骰子）
      var sc = []; for (var i = 0; i < n; i++) sc.push(0);
      var g = { np: n, mode: mode, out: [], cnt: 0, res: null, M: { quan: 0, dealer: st, start: st, lian: 0, no: 0, sc: sc, hist: [] } };
      deal(g);
      return g;
    },
    holdLeft: holdLeft,
    turnSeat: function (g) { return g.phase === 'discard' ? g.turn : -1; },
    /* ---- 提示／小提醒（老師端統一控制）---- */
    acting: function (g) {
      if (g.res) return [];
      if (g.phase === 'hand') return alive(g).filter(function (s) { return !g.ready[s]; });
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
      if (g.phase === 'hand') return g.ready[seat] ? null : { t: 'ready' };
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
      if (g.phase === 'hand') return g.ready[seat] ? null : '這一把結束了！看完結果後，按「▶ 下一局」繼續（大家都按了才會發牌）。';
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
      var fin = !!g.res || g.phase === 'hand';
      var hl0 = holdLeft(g);
      return { np: g.np, mode: g.mode, M: g.M, wind: g.hands.map(function (x, s) { return windOf(g, s); }), dealer: g.hd,
        ready: g.phase === 'hand' ? g.ready : null, hold: hl0, turn: g.phase === 'discard' ? g.turn : -1, phase: g.phase, cnt: g.cnt, left: Math.max(0, g.wall.length - KEEP),
        hand: seat >= 0 ? g.hands[seat] : null, drawn: seat >= 0 && g.turn === seat ? g.drawn : null,
        counts: g.hands.map(function (h) { return h.length; }),
        melds: g.melds.map(function (ms, s) { return ms.map(function (m) { return m.k === 'ankan' && s !== seat && !fin ? { k: 'ankan', t: -1 } : m; }); }),
        flowers: g.flowers, rivers: g.rivers, last: g.last, out: g.out, log: g.log,
        opts: me && g.phase === 'claim' && g.pend[seat] && !(seat in g.resp) ? g.pend[seat] : null,
        waiting: g.phase === 'claim' ? Object.keys(g.pend).filter(function (s) { return !(s in g.resp); }).map(Number) : [],
        self: me ? selfOpts(g, seat) : {},
        win: g.win || null, hands: fin ? g.hands : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，電腦會幫你把這局打完（只摸牌打牌）'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.n != null && d.n !== g.cnt) return false;
      if (d.t === 'ready') {
        if (g.phase !== 'hand' || g.ready[seat]) return false;
        g.ready[seat] = true; g.cnt++;
        if (alive(g).every(function (s) { return g.ready[s]; })) deal(g);
        return true;
      }
      if (d.t === 'resp') {
        if (g.phase !== 'claim' || !g.pend[seat] || seat in g.resp) return false;
        var o = g.pend[seat], a = d.a;
        if (a !== 'pass' && !o[a]) return false;
        if (a === 'chi' && o.chi.indexOf(d.st) < 0) return false;
        g.resp[seat] = { a: a, st: d.st };
        resolve(g); return true;
      }
      if (g.phase !== 'discard' || g.turn !== seat) return false;
      if (holdLeft(g) > 150) return false;   // 特效還在播
      var so = selfOpts(g, seat);
      if (d.t === 'tsumo') { if (!so.tsumo) return false; win(g, seat, g.drawn, true); return true; }
      if (d.t === 'ankan') { if (!so.ankan || so.ankan.indexOf(d.tile) < 0) return false; rm(g.hands[seat], d.tile, 4); g.melds[seat].push({ k: 'ankan', t: d.tile }); g.log = { k: 'ankan', s: seat, t: -1 }; g.cnt++; g.nclaim++; g.kanDraw = true; draw(g, seat, true); return true; }
      if (d.t === 'kakan') { if (!so.kakan || so.kakan.indexOf(d.tile) < 0) return false; kakan(g, seat, d.tile); return true; }
      if (d.t === 'discard') { if (g.hands[seat].indexOf(d.tile) < 0) return false; discard(g, seat, d.tile); return true; }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res) return null;
      if (g.phase === 'hand') return g.ready[seat] || g.out.indexOf(seat) >= 0 ? null : { t: 'ready' };
      if (g.phase === 'claim') {
        var o = g.pend[seat]; if (!o || seat in g.resp) return null;
        if (o.hu) return { t: 'resp', a: 'hu' };
        if (o.rob) return { t: 'resp', a: 'pass' };
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
      var h = '<div class="mj-host">', mu = multi(g);
      if (mu) h += '<div class="mj-hhead">' + MODES[g.mode] + '・' + QNAME[Math.min(3, g.M.quan)] + ' 第 ' + g.M.no + ' 把' + (g.M.lian ? '・連莊 ' + g.M.lian : '') + '</div>';
      for (var s = 0; s < g.np; s++) {
        h += '<div class="mj-hrow' + (g.phase === 'discard' && g.turn === s && !g.res ? ' on' : '') + '"><i style="background:' + SEATC[s] + '"></i><b>' + WIND[windOf(g, s)] + (s === g.hd ? '<sup>莊</sup>' : '') + '</b>' + (mu ? '<span class="mj-hsc' + (g.M.sc[s] < 0 ? ' neg' : '') + '">' + (g.M.sc[s] > 0 ? '+' : '') + g.M.sc[s] + '</span>' : '') + '<span class="mj-hm">' +
          g.melds[s].map(function (m) { return meldHTML(m, true); }).join('') + (g.flowers[s].length ? '<em>花' + g.flowers[s].length + '</em>' : '') + '</span><span class="mj-hr">' + g.rivers[s].slice(-8).map(function (t) { return MJ.svg(t); }).join('') + '</span></div>';
      }
      return h + '</div>';
    },
    hostStatus: function (g) {
      if (g.res) return { t: REASONS[g.res.why] || '', c: '' };
      if (g.phase === 'hand') return { t: '第 ' + g.M.no + ' 把結束，等大家按「下一局」', c: '' };
      return { t: (multi(g) ? QNAME[g.M.quan] + ' 第 ' + g.M.no + ' 把・' : '') + '牌牆剩 ' + Math.max(0, g.wall.length - KEEP) + ' 張', c: '' };
    }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; g.phase = 'end'; return; }
    if (g.phase === 'hand') { g.ready[seat] = true; if (a.every(function (s) { return g.ready[s]; })) deal(g); return; }
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
  function hk(tb) { return tb.round + ':' + (tb.view.M ? tb.view.M.no : 0); }
  /* 我打出的牌被吃／碰／槓／胡：畫面中間放大顯示約 2 秒 */
  var ZW = { chi: '吃！', pon: '碰！', kan: '槓！', hu: '胡！' }, ZV = { chi: '吃了', pon: '碰了', kan: '槓了', hu: '胡了' };
  function zoom(tb, k, s, t, sp) {
    var old = document.querySelector('.mj-zoom'); if (old) old.remove();
    var z = el('div', 'mj-zoom k-' + k);
    z.innerHTML = '<div class="mj-zcard"><div class="mj-zw">' + (sp || ZW[k]) + '</div>' + (t >= 0 ? '<div class="mj-zt">' + MJ.svg(t) + '</div>' : '') +
      '<div class="mj-zs"><b>' + short(tb, s) + '</b> ' + (sp ? '用七張花搶了你摸到的第八張花' : ZV[k] + '你打出的「' + MJ.name(t) + '」') + '</div></div>';
    document.body.appendChild(z);
    setTimeout(function () { z.classList.add('out'); }, 1900);
    setTimeout(function () { z.remove(); }, 2400);
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view, k0 = hk(tb);
    if (v.hold > 0 && L.holdCnt !== v.cnt) { L.holdCnt = v.cnt; L.holdEnd = Date.now() + v.hold; clearTimeout(L.htimer); L.htimer = setTimeout(function () { if (mod._ctx) mod._ctx.rerender(); }, v.hold + 50); }
    if (L.round !== k0) { L.round = k0; L.sel = null; L.sent = -1; L.logKey = ''; L.readyAt = 0; }
    if (v.opts && L.claimCnt !== v.cnt) { L.claimCnt = v.cnt; L.claimAt = Date.now(); fx.snd('turn'); }
    var lg = v.log, key = lg ? lg.k + lg.s + ':' + v.cnt + ':' + (lg.t) : '';
    if (lg && key !== L.logKey && prev) {
      var mine = lg.from === tb.seat && lg.s !== tb.seat;
      if (mine && ZW[lg.k]) zoom(tb, lg.k, lg.s, lg.t);
      else if (lg.k === 'pon') fx.toast(who(tb, lg.s) + '：碰！'); else if (lg.k === 'chi') fx.toast(who(tb, lg.s) + '：吃！'); else if (lg.k === 'kan' || lg.k === 'ankan') fx.toast(who(tb, lg.s) + '：槓！');
      else if (lg.k === 'kakan?') fx.toast(who(tb, lg.s) + ' 要加槓「' + MJ.name(lg.t) + '」');
      if (lg.k === 'discard') fx.snd('move'); else if (lg.k !== 'flower') fx.snd('cap');
    }
    L.logKey = key;
    // 我放槍（或被七搶一）：放大提醒
    var w = v.win, wk = w ? k0 + ':' + w.s : '';
    if (w && !w.tsumo && w.from === tb.seat && L.zk !== wk && prev) { L.zk = wk; zoom(tb, 'hu', w.s, w.t, w.special); }
    if (prev && prev.view && v.turn === tb.seat && prev.view.turn !== tb.seat) fx.snd('turn');
    var M = v.M, mu = v.mode === 'east' || v.mode === 'full';
    if (prev === null || (prev && (prev.round !== tb.round || (mu && prev.view && prev.view.M && prev.view.M.no !== M.no)))) {
      if (mu) fx.toast(QNAME[Math.min(3, M.quan)] + ' 第 ' + M.no + ' 把開始！莊家：' + who(tb, M.dealer) + (M.lian ? '（連莊 ' + M.lian + '）' : ''));
      else fx.toast(tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始打牌囉！' + (v.dealer === tb.seat ? '你是莊家，先打一張' : '莊家先打牌'));
    }
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, np = v.np, fin = !!tb.res || v.phase === 'hand';
    // 老師暫停（有新同學加入）時，吃碰的 20 秒也跟著停
    if (tb.paused) { clearTimeout(L.timer); L.pz = L.pz || Date.now(); } else if (L.pz) { L.claimAt += Date.now() - L.pz; if (L.readyAt) L.readyAt += Date.now() - L.pz; L.pz = 0; }
    mod._ctx = ctx;
    var holding = L.holdCnt === v.cnt && Date.now() < (L.holdEnd || 0);
    var myTurn = !fin && !out && v.turn === seat && L.sent !== v.cnt && !holding;
    var wrap = el('div', 'mj-table');
    // 其他玩家
    var opp = el('div', 'mj-opps');
    var rel = np === 4 ? ['下家', '對家', '上家'] : np === 3 ? ['下家', '上家'] : ['對家'];
    for (var k = 1; k < np; k++) {
      var s = (seat + k) % np, b = el('div', 'mj-opp' + (v.turn === s && !fin ? ' on' : '') + (v.waiting.indexOf(s) >= 0 ? ' think' : '') + (v.out.indexOf(s) >= 0 ? ' out' : ''));
      var top = el('div', 'mj-ot'); var dot = el('i'); dot.style.background = SEATC[s]; top.appendChild(dot);
      top.appendChild(el('b', '', WIND[v.wind[s]] + (s === v.dealer ? '・莊' : ''))); top.appendChild(el('span', 'n', short(tb, s))); top.appendChild(el('small', '', rel[k - 1]));
      b.appendChild(top);
      var info = el('div', 'mj-oi'); info.innerHTML = '<span class="mj-cnt">🀫 ' + v.counts[s] + '</span>' + (v.flowers[s].length ? '<span class="mj-fl">' + v.flowers[s].map(function (f) { return MJ.svg(f); }).join('') + '</span>' : '');
      b.appendChild(info);
      if (v.melds[s].length) { var md = el('div', 'mj-om'); md.innerHTML = v.melds[s].map(function (m) { return meldHTML(m, true); }).join(''); b.appendChild(md); }
      if (fin && v.hands) { var hh = el('div', 'mj-om reveal'); hh.innerHTML = v.hands[s].map(function (t) { return MJ.svg(t); }).join(''); b.appendChild(hh); }
      opp.appendChild(b);
    }
    wrap.appendChild(opp);
    // 狀態
    var st = el('div', 'mj-status');
    if (fin) {
      if (v.win && v.win.special) st.textContent = (v.win.s === seat ? '🎉 你' : short(tb, v.win.s)) + ' ' + v.win.special + '！';
      else if (v.win) st.textContent = (v.win.s === seat ? '🎉 你' : short(tb, v.win.s)) + (v.win.tsumo ? ' 自摸！' : ' 胡牌！' + (v.win.from === seat ? '（你放槍）' : '（' + short(tb, v.win.from) + ' 放槍）'));
      else st.textContent = tb.res ? '這局結束了：' + (REASONS[tb.res.why] || '') : '🀫 流局：沒有人胡牌，莊家連莊';
      st.className = 'mj-status end';
    } else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (v.opts) { st.textContent = v.opts.rob ? who(tb, v.last.s) + ' 要加槓「' + MJ.name(v.last.t) + '」，你可以搶槓胡！' : '有人打出 ' + MJ.name(v.last.t) + '，你要吃／碰／胡嗎？'; st.className = 'mj-status me'; }
    else if (myTurn) { st.textContent = v.self.tsumo ? '你可以自摸！' : (L.sel != null ? '再點一次「' + MJ.name(L.sel) + '」或按「打出」' : '輪到你：點一張牌打出去'); st.className = 'mj-status me'; }
    else if (holding && v.log) st.textContent = '⏸️ ' + who(tb, v.log.s) + ' ' + (ZV[v.log.k] || '') + (v.log.from === seat ? '你的牌' : '') + '，等一下再繼續…';
    else if (v.waiting.length) st.textContent = '等 ' + v.waiting.map(function (s) { return who(tb, s); }).join('、') + ' 決定要不要吃碰…';
    else st.textContent = '輪到 ' + (v.turn >= 0 ? who(tb, v.turn) : '…');
    wrap.appendChild(st);
    // 桌面：最新一張＋四家的河
    var felt = el('div', 'mj-felt');
    var mid = el('div', 'mj-mid');
    mid.innerHTML = '<div class="mj-wall">牌牆<br><b>' + v.left + '</b> 張</div>' + (v.last && !fin ? '<div class="mj-lastt' + (v.opts ? ' hint-hl' : '') + '" data-h="last"><small>' + who(tb, v.last.s) + (v.last.rob ? ' 加槓' : ' 打出') + '</small>' + MJ.svg(v.last.t) + '</div>' : '');
    if (fin && v.win) { var tl = el('div', 'mj-tai'); tl.innerHTML = '<b>' + (v.win.tai.total ? v.win.tai.total + ' 台' : '屁胡') + '</b>' + v.win.tai.list.map(function (x) { return '<span>' + x[0] + ' ' + x[1] + '</span>'; }).join(''); mid.appendChild(tl); }
    felt.appendChild(mid);
    var rivers = el('div', 'mj-rivers');
    for (var q = 0; q < np; q++) {
      var s3 = (seat + q) % np, rv = el('div', 'mj-river'); rv.style.borderColor = SEATC[s3];
      rv.innerHTML = '<small style="color:' + SEATC[s3] + '">' + WIND[v.wind[s3]] + (s3 === v.dealer ? '莊' : '') + '・' + (q === 0 ? '我' : short(tb, s3)) + '</small>' + v.rivers[s3].map(function (t, i) { return '<span class="' + (v.last && v.last.s === s3 && i === v.rivers[s3].length - 1 && !fin ? 'new' : '') + '">' + MJ.svg(t) + '</span>'; }).join('');
      rivers.appendChild(rv);
    }
    felt.appendChild(rivers);
    wrap.appendChild(felt);
    // 我的牌
    var mine = el('div', 'mj-me' + (myTurn || v.opts ? ' turn' : ''));
    var mt = el('div', 'mj-me-top'); var d2 = el('i'); d2.style.background = SEATC[seat]; mt.appendChild(d2);
    mt.appendChild(el('b', '', WIND[v.wind[seat]] + (seat === v.dealer ? '・莊' : ''))); mt.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我')));
    if (v.flowers[seat].length) { var fl = el('span', 'mj-fl'); fl.innerHTML = v.flowers[seat].map(function (f) { return MJ.svg(f); }).join(''); mt.appendChild(fl); }
    mine.appendChild(mt);
    if (v.melds[seat].length) { var mm = el('div', 'mj-mymelds'); mm.innerHTML = v.melds[seat].map(function (m) { return meldHTML(m); }).join(''); mine.appendChild(mm); }
    var hand = el('div', 'mj-hand');
    // 手牌順序：摸進來的牌放最右邊並標「新」，按「整理」才依花色（萬、筒、條、字）排到該在的位置
    var HK = BG.handKey(tb, 'mahjong') + ':' + (v.M ? v.M.no : 0), ho = BG.handOrder(HK, v.hand, MJ.sortHand), tiles = ho.list;
    function tileBtn(t, extra) {
      var b2 = el('button', 'mj-tile' + (L.sel === t ? ' sel' : '') + (extra || '')); b2.type = 'button'; b2.setAttribute('data-h', 't' + t); b2.innerHTML = MJ.svg(t);
      if (fin && v.win && v.win.s === seat && t === v.win.t) b2.classList.add('win');
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
    if (v.opts && !fin && L.sent !== v.cnt) {
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
    if (!fin && !out) {
      var tools = el('div', 'mj-tools');
      tools.appendChild(ctx.button('mj-btn ghost sort-btn', '🔀 整理手牌', function () { BG.handSort(HK, MJ.sortHand); ctx.snd('tap'); ctx.rerender(); }));
      tools.appendChild(ctx.button('mj-btn ghost', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？電腦會幫你把牌打完，這局算輸。')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('mj-btn ghost'));
      wrap.appendChild(tools);
    }
    if ((v.mode === 'east' || v.mode === 'full') && !tb.res) {
      var bn = el('div', 'mj-round'); bn.textContent = '🀄 ' + QNAME[Math.min(3, v.M.quan)] + ' 第 ' + v.M.no + ' 把' + (v.M.lian ? '・連莊 ' + v.M.lian : '') + '・我的分數 ' + (v.M.sc[seat] > 0 ? '+' : '') + v.M.sc[seat];
      wrap.insertBefore(bn, wrap.firstChild);
    }
    if (v.phase === 'hand' && !tb.res) wrap.appendChild(handPanel(tb, ctx));
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  /* 一把牌結束的資訊：誰胡、誰放槍（或自摸）、胡哪一張、每一項台數、莊家台、付分 */
  function handLines(v, w, nm, mu) {
    var np = v.np, D = w ? w.dealer : v.dealer, W2 = function (i) { return WIND[(i - D + np) % np] + '家・' + nm(i); };
    if (!w) return ['🀫 流局：牌牆只剩最後 16 張，沒有人胡牌' + (mu === 'end' ? '。' : mu ? '，莊家（' + W2(D) + '）連莊。' : '，大家平手。')];
    var L2 = [];
    if (w.special) { L2.push('🏆 ' + w.special + '：' + W2(w.s)); L2.push(w.tsumo ? '🌸 一個人收齊 8 張花牌，直接胡牌（大家都要付）' : '🌸 手上有 7 張花，' + W2(w.from) + ' 摸到第 8 張花被搶走，由他付'); }
    else {
      L2.push('🏆 胡牌：' + W2(w.s) + (w.tsumo ? '（自摸）' : ''));
      L2.push(w.tsumo ? '🙌 自摸：自己摸到胡的那張，沒有人放槍，其他人都要付' : w.rob ? '💥 被搶槓：' + W2(w.from) + ' 加槓的「' + MJ.name(w.t) + '」被搶來胡（只有他付）' : '💥 放槍：' + W2(w.from) + '（打出了「' + MJ.name(w.t) + '」，只有他付）');
      L2.push('🀄 胡的牌：' + MJ.name(w.t));
    }
    L2.push('🧮 台數：' + (w.tai.total ? w.tai.list.map(function (x) { return x[0] + ' ' + x[1]; }).join('、') + '，共 ' + w.tai.total + ' 台' : '沒有台數（屁胡，0 台）'));
    var dl = '🏠 莊家：' + W2(D) + (w.lian ? '，連 ' + w.lian + ' 拉 ' + w.lian : '') + '。莊家有輸贏時加莊家 ' + w.dt + ' 台' + (w.lian ? '（莊家 1 台＋連莊 ' + (2 * w.lian) + ' 台）' : '');
    L2.push(dl);
    if (w.pay && w.pay.length) L2.push('💰 付分（底 ' + BASE + ' 分＋每台 1 分）：' + w.pay.map(function (p) { return nm(p.s) + ' 付 ' + p.amt + ' 分（' + BASE + '＋' + w.tai.total + ' 台' + (p.dt ? '＋莊家 ' + p.dt + ' 台' : '') + '）'; }).join('；') + (mu ? '' : '　※ 單局模式只看誰胡，積分榜照平台算法'));
    return L2;
  }
  function scoreTable(v, nm, delta) {
    var M = v.M, order = []; for (var i = 0; i < v.np; i++) order.push(i);
    order.sort(function (a, b) { return M.sc[b] - M.sc[a]; });
    var st = function (s, k) { return M.hist.filter(function (h) { return k === 'hu' ? h.w === s : k === 'zm' ? h.w === s && h.tsumo : h.from === s; }).length; };
    var rank = 0, prev = null;
    return '<table class="mj-sct"><tr><th>名次</th><th>玩家</th>' + (delta ? '<th>這把</th>' : '') + '<th>總分</th><th>胡</th><th>自摸</th><th>放槍</th></tr>' + order.map(function (s, k) {
      if (M.sc[s] !== prev) { rank = k + 1; prev = M.sc[s]; }
      var d = delta ? delta[s] : 0;
      return '<tr' + (nm(s) === '你' ? ' class="me"' : '') + '><td>' + rank + '</td><td>' + nm(s) + '</td>' + (delta ? '<td class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (d > 0 ? '+' : '') + d + '</td>' : '') + '<td><b>' + (M.sc[s] > 0 ? '+' : '') + M.sc[s] + '</b></td><td>' + st(s, 'hu') + '</td><td>' + st(s, 'zm') + '</td><td>' + st(s, 'fp') + '</td></tr>';
    }).join('') + '</table>';
  }
  function histTable(v, nm) {
    var np = v.np;
    return '<div class="mj-hist"><table><tr><th>把</th><th>圈</th><th>莊家</th><th>結果</th><th>台</th>' + v.M.sc.map(function (x, s) { return '<th>' + nm(s) + '</th>'; }).join('') + '</tr>' + v.M.hist.map(function (h) {
      var res = h.w < 0 ? '流局' : h.sp ? nm(h.w) + ' ' + h.sp : nm(h.w) + (h.tsumo ? ' 自摸' : ' 胡（' + nm(h.from) + ' 放槍）');
      return '<tr><td>' + h.no + '</td><td>' + QNAME[h.quan].charAt(0) + '</td><td>' + nm(h.dealer) + (h.lian ? '<small>連' + h.lian + '</small>' : '') + '</td><td>' + res + '</td><td>' + (h.w < 0 ? '－' : h.tai) + '</td>' + h.d.map(function (d) { return '<td class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (d > 0 ? '+' : '') + d + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table></div>';
  }
  /* 全場／一圈：每一把結束時的結算畫面（按「下一局」繼續） */
  var READY = 45000;
  function handPanel(tb, ctx) {
    var v = tb.view, w = v.win, M = v.M, seat = tb.seat, nm = function (i) { return who(tb, i); };
    var p = el('div', 'mj-hend');
    var h = el('h3', '', w ? (w.special ? '🌸 ' + nm(w.s) + ' ' + w.special + '！' : (w.s === seat ? '🎉 你' : nm(w.s)) + (w.tsumo ? ' 自摸！' : ' 胡牌！')) : '🀫 流局');
    p.appendChild(h);
    var bx = el('div', 'res-info'); handLines(v, w, nm, true).forEach(function (line) { bx.appendChild(el('p', 'res-note', line)); }); p.appendChild(bx);
    var last = M.hist[M.hist.length - 1], tbx = el('div'); tbx.innerHTML = scoreTable(v, nm, last ? last.d : null); p.appendChild(tbx);
    p.appendChild(el('p', 'mj-next', '下一把：' + QNAME[Math.min(3, M.quan)] + '，莊家是 ' + nm(M.dealer) + (M.lian ? '（連莊 ' + M.lian + '）' : '') + '・已經打了 ' + M.hist.length + ' 把'));
    var rd = v.ready || {}, wait = [];
    for (var s = 0; s < v.np; s++) if (!rd[s]) wait.push(nm(s));
    if (!L.readyAt) L.readyAt = Date.now();
    var left = Math.max(0, Math.ceil((READY - ((L.pz || Date.now()) - L.readyAt)) / 1000));
    var row = el('div', 'row c');
    if (rd[seat] || L.sent === v.cnt) row.appendChild(el('span', 'pill light', '✅ 你準備好了，等 ' + (wait.join('、') || '…')));
    else {
      row.appendChild(ctx.button('mj-btn go big', '▶ 下一局（' + left + '）', function () { L.sent = v.cnt; ctx.send('ready', { n: v.cnt }); ctx.rerender(); }));
      clearTimeout(L.rtimer);
      L.rtimer = setTimeout(function () { var cur = BGPlayer.state().tb; if (!cur || !cur.view || cur.view.phase !== 'hand' || cur.view.cnt !== v.cnt || cur.paused || L.sent === v.cnt) return; if (Date.now() - L.readyAt >= READY) { L.sent = v.cnt; ctx.send('ready', { n: v.cnt }); } ctx.rerender(); }, 1000);
    }
    row.appendChild(ctx.button('mj-btn ghost', '👀 先看牌桌（大家的牌）', function () { L.hideHP = hk(tb); ctx.rerender(); }));
    p.appendChild(row);
    var hb = el('details', 'mj-hdet'); hb.appendChild(el('summary', '', '📜 看每一把的紀錄')); var hi = el('div'); hi.innerHTML = histTable(v, nm); hb.appendChild(hi); p.appendChild(hb);
    if (L.hideHP === hk(tb)) return ctx.button('mj-btn go big mj-hmini', '📋 看結算／下一局' + (rd[seat] || L.sent === v.cnt ? '' : '（' + left + '）'), function () { L.hideHP = ''; ctx.rerender(); });
    return p;
  }
  /* 結束的資訊：單局＝這一把的完整資訊；全場／一圈＝最後一把＋總排名＋每一把的紀錄 */
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res, mu = v.mode === 'east' || v.mode === 'full';
    if (!mu) return v.win || r.why === 'exhaust' ? handLines(v, v.win, nm, false) : ['這局結束：' + (REASONS[r.why] || '')];
    var L2 = ['🏁 ' + MODES[v.mode] + (r.why === 'match' ? '打完了！' : '提前結束：' + (REASONS[r.why] || '')) + '共打了 ' + v.M.hist.length + ' 把'];
    L2.push({ html: '<h4>🏆 最後排名</h4>' + scoreTable(v, nm, null) });
    if (v.M.hist.length && r.why === 'match') { L2.push('— 最後一把 —'); L2 = L2.concat(handLines(v, v.win, nm, 'end')); }
    L2.push({ html: '<details class="mj-hdet" open><summary>📜 每一把的紀錄</summary>' + histTable(v, nm) + '</details>' });
    return L2;
  };
  BG.register('mahjong', mod);
  mod._meld = meldHTML;
})();
