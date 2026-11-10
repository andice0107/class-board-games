/* 撲克牌・莊家對戰（21點；之後十點半也共用這個架構）：電腦當莊家，玩家同時行動，每局 5 回合，籌碼最多的人獲勝。 */
window.BANKER = function (CFG) {
  'use strict';
  var SEATC = PKUI.SEATC, ROUNDS = 5, START = 10;
  var REASONS = { most: '5 回合後籌碼最多', tie: '籌碼一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function draw(g) { if (!g.deck.length) g.deck = PK.deck(0); return g.deck.pop(); }
  function fmt(v) { return CFG.fmt ? CFG.fmt(v) : String(v); }
  function startPlay(g) {
    g.phase = 'play'; g.dealer = [draw(g), draw(g)];
    for (var s = 0; s < g.np; s++) { g.hands[s] = []; g.stood[s] = false; if (g.out.indexOf(s) < 0) { for (var k = 0; k < CFG.startCards; k++) g.hands[s].push(draw(g)); var v = CFG.value(g.hands[s]); if (v.bust || v.natural || v.auto) g.stood[s] = true; } }
    maybeDealer(g);
  }
  function maybeDealer(g) {
    if (alive(g).some(function (s) { return !g.stood[s]; })) return;
    var all = alive(g).every(function (s) { return CFG.value(g.hands[s]).bust; });
    while (!all && CFG.dealerHits(CFG.value(g.dealer), g.dealer.length)) g.dealer.push(draw(g));
    var dv = CFG.value(g.dealer), res = [];
    for (var s = 0; s < g.np; s++) {
      if (g.out.indexOf(s) >= 0) { res.push(null); continue; }
      var pv = CFG.value(g.hands[s]), m = CFG.settle(pv, dv), win = m * g.bets[s];
      g.chips[s] += win; res.push({ m: m, win: win, v: pv.v, bust: pv.bust, tag: pv.tag || '' });
    }
    g.phase = 'show'; g.result = { dealer: dv, list: res }; g.ready = g.ready.map(function () { return false; });
  }
  function nextRound(g) {
    if (g.round >= ROUNDS || alive(g).every(function (s) { return g.chips[s] <= 0; })) { endGame(g); return; }
    g.round++; g.phase = 'bet'; g.bets = g.bets.map(function () { return 0; }); g.result = null; g.dealer = []; g.hands = g.hands.map(function () { return []; });
  }
  function endGame(g) {
    var best = -1, bv = -1e9, tie = false;
    alive(g).forEach(function (s) { if (g.chips[s] > bv) { bv = g.chips[s]; best = s; tie = false; } else if (g.chips[s] === bv) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'most' };
  }
  function botAct(g, seat, level) {
    if (g.phase === 'bet') { if (g.bets[seat]) return null; var b = level <= 1 ? 1 + Math.floor(Math.random() * 3) : level === 2 ? 1 : 2; return { t: 'bet', b: Math.max(1, Math.min(b, 3, g.chips[seat] > 0 ? g.chips[seat] : 1)) }; }
    if (g.phase === 'play') { if (g.stood[seat]) return null; return { t: CFG.botHit(CFG.value(g.hands[seat]), g.dealer[0], level, g.hands[seat].length) ? 'hit' : 'stand' }; }
    if (g.phase === 'show') { if (g.ready[seat]) return null; return { t: 'ready' }; }
    return null;
  }
  var mod = {
    seats: 4, seatOptions: [1, 2, 3, 4, 5, 6], seatDefault: 4, botSeats: [0, 5],
    reasons: REASONS,
    levelDesc: CFG.levelDesc,
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(1, Math.min(6, n || 4));
      var g = { np: n, deck: PK.deck(0), round: 1, phase: 'bet', chips: [], bets: [], hands: [], stood: [], ready: [], dealer: [], out: [], result: null, cnt: 0, res: null };
      for (var s = 0; s < n; s++) { g.chips.push(START); g.bets.push(0); g.hands.push([]); g.stood.push(false); g.ready.push(false); }
      return g;
    },
    turnSeat: function () { return -1; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var hideHole = g.phase === 'play';
      return { np: g.np, round: g.round, rounds: ROUNDS, phase: g.phase, chips: g.chips, bets: g.bets, stood: g.stood, ready: g.ready, out: g.out, cnt: g.cnt,
        dealer: hideHole ? [g.dealer[0], null] : g.dealer, hands: g.hands.map(function (h, s) { return s === seat || g.phase === 'show' ? h : h.map(function () { return null; }); }),
        counts: g.hands.map(function (h) { return h.length; }), result: g.result, turn: -1 };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t === 'bet' && g.phase === 'bet' && !g.bets[seat]) {
        var b = Math.max(1, Math.min(3, d.b | 0)); g.bets[seat] = b; g.cnt++;
        if (alive(g).every(function (s) { return g.bets[s]; })) startPlay(g);
        return true;
      }
      if (g.phase === 'play' && !g.stood[seat] && (d.t === 'hit' || d.t === 'stand')) {
        if (d.t === 'hit') { g.hands[seat].push(draw(g)); var v = CFG.value(g.hands[seat]); if (v.bust || v.auto) g.stood[seat] = true; }
        else g.stood[seat] = true;
        g.cnt++; maybeDealer(g); return true;
      }
      if (d.t === 'ready' && g.phase === 'show' && !g.ready[seat]) {
        g.ready[seat] = true; g.cnt++;
        if (alive(g).every(function (s) { return g.ready[s]; })) nextRound(g);
        return true;
      }
      return false;
    },
    botTurn: function (g, seat, level) { if (g.res || g.out.indexOf(seat) >= 0) return null; return botAct(g, seat, level); },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + (g.dealer.length ? g.dealer.map(function (c, i) { return '<span>' + PK.svg(g.phase === 'play' && i === 1 ? null : c, { back: g.phase === 'play' && i === 1 }) + '</span>'; }).join('') : '<em>下注中</em>') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : '🪙 ' + g.chips[s]) + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '第 ' + g.round + ' / ' + ROUNDS + ' 回合・' + ({ bet: '下注中', play: '補牌中', show: '開牌' })[g.phase], c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat);
    var a = alive(g);
    if (!a.length || (a.length === 1 && g.np > 1 && false)) { g.res = { w: -1, why: why }; return; }
    if (!a.length) return;
    if (g.phase === 'bet' && a.every(function (s) { return g.bets[s]; })) startPlay(g);
    else if (g.phase === 'play') maybeDealer(g);
    else if (g.phase === 'show' && a.every(function (s) { return g.ready[s]; })) nextRound(g);
  }

  /* ---------- 學生端 ---------- */
  var L = { round: -1, phaseKey: '', pending: null };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view, key = v.round + v.phase;
    if (L.round !== tb.round) { L.round = tb.round; L.phaseKey = ''; }
    if (L.pending && v.cnt !== L.pending) L.pending = null;
    if (key !== L.phaseKey) {
      if (v.phase === 'show' && v.result) { var r = v.result.list[tb.seat]; if (r) { if (r.win > 0) { fx.snd('win'); fx.toast('贏了 ' + r.win + ' 個籌碼！'); } else if (r.win < 0) { fx.snd('lose'); fx.toast('輸了 ' + (-r.win) + ' 個籌碼'); } else fx.toast('平手，籌碼不變'); } }
      if (v.phase === 'play') fx.snd('move');
      L.phaseKey = key;
    }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '每人 ' + START + ' 個籌碼');
  };
  function send(ctx, t, d) { L.pending = ctx.tb.view.cnt; ctx.send(t, d || {}); ctx.rerender(); }
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, wait = L.pending != null;
    var wrap = el('div', 'pk-table');
    var st = el('div', 'pk-status');
    var mine = v.hands[seat] || [], mv = mine.length ? CFG.value(mine) : null;
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (v.phase === 'bet') { st.textContent = v.bets[seat] ? '等其他人下注…' : '第 ' + v.round + ' / ' + v.rounds + ' 回合：要押幾個籌碼？'; if (!v.bets[seat]) st.className = 'pk-status me'; }
    else if (v.phase === 'play') { st.textContent = v.stood[seat] ? '等其他人補牌…' : '要再補一張嗎？'; if (!v.stood[seat]) st.className = 'pk-status me'; }
    else st.textContent = '開牌！';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: -1 }, seat, function (i) {
      if (v.phase === 'bet') return v.bets[i] ? '押 ' + v.bets[i] : '';
      if (v.phase === 'play') return v.stood[i] ? '停' : '補牌中';
      var r = v.result && v.result.list[i]; return r ? (r.bust ? '爆' : fmt(r.v)) + (r.win > 0 ? ' +' + r.win : r.win < 0 ? ' ' + r.win : '') : '';
    }, short));
    [].forEach.call(wrap.querySelectorAll('.pk-opp'), function (e) { var i = +e.getAttribute('data-seat'); var c = e.querySelector('.pk-cnt'); if (c && v.out.indexOf(i) < 0) c.textContent = '🪙 ' + v.chips[i]; });
    // 莊家
    var felt = el('div', 'pk-felt');
    felt.appendChild(el('div', 'bj-dealer-t', '🎩 莊家（電腦）' + (v.phase === 'show' && v.result ? '：' + (v.result.dealer.bust ? '爆了！' : fmt(v.result.dealer.v) + ' 點' + (v.result.dealer.tag ? '・' + v.result.dealer.tag : '')) : '')));
    var dr = el('div', 'pk-played');
    if (v.dealer.length) v.dealer.forEach(function (c) { var s = el('span'); s.innerHTML = PK.svg(c, { back: !c }); dr.appendChild(s); });
    else dr.appendChild(el('div', 'pk-empty', '下注中'));
    felt.appendChild(dr);
    wrap.appendChild(felt);
    // 自己
    var me = el('div', 'pk-me' + ((v.phase === 'bet' && !v.bets[seat]) || (v.phase === 'play' && !v.stood[seat]) ? ' turn' : ''));
    var t = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; t.appendChild(dot); t.appendChild(el('span', 'n', tb.seats[seat].name + '・我'));
    if (mv) t.appendChild(el('span', 'pk-info', mv.bust ? '爆了！' : fmt(mv.v) + ' 點' + (mv.tag ? '・' + mv.tag : '')));
    t.appendChild(el('span', 'pk-cnt', '🪙 ' + v.chips[seat] + (v.bets[seat] ? '（押 ' + v.bets[seat] + '）' : '')));
    me.appendChild(t);
    var hr = el('div', 'pk-row bj-hand'); mine.forEach(function (c) { var s = el('span', 'bj-c'); s.innerHTML = PK.svg(c); hr.appendChild(s); }); me.appendChild(hr);
    if (v.phase === 'show' && v.result && v.result.list[seat]) { var r = v.result.list[seat]; me.appendChild(el('div', 'bj-res ' + (r.win > 0 ? 'win' : r.win < 0 ? 'lose' : ''), r.win > 0 ? '贏了 +' + r.win + ' 🪙' : r.win < 0 ? '輸了 ' + r.win + ' 🪙' : '平手')); }
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (v.phase === 'bet' && !v.bets[seat]) [1, 2, 3].forEach(function (b) { var x = ctx.button('pk-btn go', '押 ' + b + ' 🪙', function () { ctx.snd('tap'); send(ctx, 'bet', { b: b }); }); x.disabled = wait; tools.appendChild(x); });
      if (v.phase === 'play' && !v.stood[seat]) {
        var h1 = ctx.button('pk-btn go', '🃏 補一張', function () { ctx.snd('move'); send(ctx, 'hit'); }); h1.disabled = wait; tools.appendChild(h1);
        var h2 = ctx.button('pk-btn', '✋ 停牌', function () { ctx.snd('tap'); send(ctx, 'stand'); }); h2.disabled = wait; tools.appendChild(h2);
      }
      if (v.phase === 'show' && !v.ready[seat]) tools.appendChild(ctx.button('pk-btn go', v.round >= v.rounds ? '看結果' : '下一回合 ▶', function () { send(ctx, 'ready'); }));
      if (v.phase === 'show' && v.ready[seat]) tools.appendChild(el('span', 'pk-who', '等其他人…'));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register(CFG.id, mod);
  mod.guide = CFG.guide;
  return mod;
};

/* ---------- 21 點 ---------- */
(function () {
  function value(cs) {
    var t = 0, aces = 0;
    cs.forEach(function (c) { var r = c[0]; if (r === 'A') { aces++; t += 1; } else if ('TJQK'.indexOf(r) >= 0) t += 10; else t += +r; });
    var soft = false; if (aces && t + 10 <= 21) { t += 10; soft = true; }
    var natural = cs.length === 2 && t === 21;
    return { v: t, soft: soft, bust: t > 21, natural: natural, tag: natural ? 'Black Jack！' : '' };
  }
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  BANKER({
    id: 'blackjack', startCards: 2, value: value,
    dealerHits: function (v) { return v.v < 17; },
    settle: function (p, d) {
      if (p.bust) return -1;
      if (p.natural && !d.natural) return 2;
      if (d.bust) return 1;
      if (p.v > d.v) return 1; if (p.v < d.v) return -1; return 0;
    },
    botHit: function (v, up, level) {
      if (level <= 1) return v.v < 12 || (v.v < 18 && Math.random() < .5);
      if (level === 2) return v.v < 15;
      var u = up[0] === 'A' ? 11 : 'TJQK'.indexOf(up[0]) >= 0 ? 10 : +up[0];
      if (v.soft) return v.v < 18 || (v.v === 18 && u >= 9);
      if (v.v <= 11) return true;
      if (v.v === 12) return u < 4 || u > 6;
      if (v.v <= 16) return u >= 7;
      return false;
    },
    levelDesc: ['隨意補牌', '不到 15 點就補', '會看莊家的牌決定', '照最佳策略，很難贏'],
    guide: {
      student: [
        { h: '怎麼玩', html: '<ol><li>電腦當<b>莊家</b>，大家每人有 <b>10 個籌碼</b>，一局 5 回合。</li><li>每回合先選要押 1、2 或 3 個籌碼。</li><li>每人發 2 張牌，莊家一張明牌、一張蓋牌。</li><li>想要更接近 21 點就按「補一張」，覺得夠了就按「停牌」。<b>超過 21 點就爆了</b>，直接輸。</li><li>大家都停牌後，莊家翻牌，不到 17 點一定要補牌。</li><li>比莊家更接近 21 點就贏，贏的話拿回押的籌碼數。</li></ol>' },
        { h: '點數', html: '<ul><li>2～10 照數字算。</li><li>J、Q、K 都算 <b>10 點</b>。</li><li>A 可以算 <b>1 點或 11 點</b>，系統會自動幫你選比較好的。</li><li>前兩張剛好 21 點（A 加 10/J/Q/K）叫 <b>Black Jack</b>，贏兩倍！</li></ul>' + cards(['As', 'Kh'], 'Black Jack：A＋K＝21') + cards(['9c', '7d', '5s'], '9＋7＋5＝21') },
        { h: '計分方式', html: '<p>5 回合結束時<b>籌碼最多</b>的人獲勝（積分榜 +3 分），一樣多就平手。</p><p>贏莊家 +押注、Black Jack +2 倍、輸 −押注、一樣點數不輸不贏。</p>' }
      ],
      teacher: [
        { h: '主持流程', html: '<ol><li>首頁點「撲克牌」→「21點」開房間，每桌 1～6 人（可以一個人和莊家玩）。</li><li>大家同時下注、同時補牌，不用等輪流，節奏很快。</li><li>莊家固定是電腦：不到 17 點一定補、17 點以上停。</li></ol>' },
        { h: '教學重點', html: '<ul><li>加法心算：每補一張都要重算總和。</li><li>機率直覺：16 點要不要補？可以全班討論「下一張讓你爆掉的牌有幾種」。</li><li>不使用真錢，籌碼每局重新給 10 個。本工具沒有加倍（Double）與分牌（Split）。</li></ul>' }
      ]
    }
  });
})();
