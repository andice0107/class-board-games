/* 撲克牌・大老二（台灣比賽規則）：2～4 人。
   大小：2 > A > K … > 3；花色：黑桃 > 紅心 > 方塊 > 梅花。
   牌型：單張、對子、順子、葫蘆、鐵支（4＋1）、同花順。鐵支可以壓單張、對子、順子、葫蘆；同花順可以壓所有牌型。 */
window.B2 = (function () {
  'use strict';
  var ORD = '3456789TJQKA2', NAT = 'A23456789TJQK', SU = 'cdhs';
  function val(c) { return ORD.indexOf(c[0]) * 4 + SU.indexOf(c[1]); }
  function rk(c) { return ORD.indexOf(c[0]); }
  function sort(h) { return h.sort(function (a, b) { return val(a) - val(b); }); }
  function sortSuit(h) { return h.sort(function (a, b) { return SU.indexOf(a[1]) - SU.indexOf(b[1]) || val(a) - val(b); }); }
  var KIND = { single: '單張', pair: '對子', straight: '順子', full: '葫蘆', four: '鐵支', sflush: '同花順' };
  var STR = []; // 合法順子的點數組合（用自然順序 A=0）
  for (var i = 0; i <= 8; i++) STR.push([i, i + 1, i + 2, i + 3, i + 4]);
  STR.push([9, 10, 11, 12, 0]);
  function isStraight(cs) {
    var ns = cs.map(function (c) { return NAT.indexOf(c[0]); }).sort(function (a, b) { return a - b; }).join(',');
    return STR.some(function (s) { return s.slice().sort(function (a, b) { return a - b; }).join(',') === ns; });
  }
  function classify(cs) {
    if (!cs || !cs.length) return null;
    var n = cs.length, vs = cs.map(val), top = Math.max.apply(null, vs);
    if (n === 1) return { k: 'single', v: top, n: 1 };
    if (n === 2) return cs[0][0] === cs[1][0] ? { k: 'pair', v: top, n: 2 } : null;
    if (n !== 5) return null;
    var cnt = {}; cs.forEach(function (c) { cnt[c[0]] = (cnt[c[0]] || 0) + 1; });
    var groups = Object.keys(cnt).map(function (r) { return [cnt[r], r]; }).sort(function (a, b) { return b[0] - a[0]; });
    if (groups[0][0] === 4) return { k: 'four', v: ORD.indexOf(groups[0][1]), n: 5 };
    if (groups[0][0] === 3 && groups[1][0] === 2) return { k: 'full', v: ORD.indexOf(groups[0][1]), n: 5 };
    if (groups.length === 5 && isStraight(cs)) {
      var two = cs.filter(function (c) { return c[0] === '2'; })[0];
      var tv = two ? val(two) : top;
      var flush = cs.every(function (c) { return c[1] === cs[0][1]; });
      return { k: flush ? 'sflush' : 'straight', v: tv, n: 5 };
    }
    return null;
  }
  function beats(a, b) {
    if (!a) return false; if (!b) return true;
    if (a.k === 'sflush') return b.k !== 'sflush' || a.v > b.v;
    if (b.k === 'sflush') return false;
    if (a.k === 'four') return b.k !== 'four' || a.v > b.v;
    if (b.k === 'four') return false;
    return a.k === b.k && a.v > b.v;
  }
  function combos(arr, k) { var out = []; (function go(s, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (var i = s; i < arr.length; i++) { cur.push(arr[i]); go(i + 1, cur); cur.pop(); } })(0, []); return out; }
  /* 手上所有可以出的組合（五張牌型只列出代表性的選法，避免組合爆炸） */
  function allPlays(hand) {
    var out = [], by = {};
    hand.forEach(function (c) { (by[c[0]] = by[c[0]] || []).push(c); out.push([c]); });
    Object.keys(by).forEach(function (r) { sort(by[r]); if (by[r].length >= 2) combos(by[r], 2).forEach(function (p) { out.push(p); }); });
    STR.forEach(function (s) {
      var lists = s.map(function (n) { return by[NAT[n]] || []; });
      if (lists.some(function (l) { return !l.length; })) return;
      out.push(lists.map(function (l) { return l[0]; }));
      out.push(lists.map(function (l) { return l[l.length - 1]; }));
      SU.split('').forEach(function (su) { var f = lists.map(function (l) { return l.filter(function (c) { return c[1] === su; })[0]; }); if (f.every(Boolean)) out.push(f); });
    });
    var rs = Object.keys(by);
    rs.forEach(function (t) {
      if (by[t].length >= 3) combos(by[t], 3).forEach(function (tri) { rs.forEach(function (p) { if (p !== t && by[p].length >= 2) out.push(tri.concat(by[p].slice(0, 2))); }); });
      if (by[t].length === 4) { var kick = sort(hand.filter(function (c) { return c[0] !== t; }))[0]; if (kick) out.push(by[t].concat([kick])); }
    });
    var seen = {};
    return out.filter(function (p) { var key = sort(p.slice()).join(); if (seen[key]) return false; seen[key] = 1; return !!classify(p); });
  }
  function legal(hand, table, must) {
    return allPlays(hand).filter(function (p) { return (!must || p.indexOf(must) >= 0) && beats(classify(p), table ? table.cls : null); });
  }
  /* 電腦選牌；回傳要出的牌，或 null 代表 Pass */
  function pick(hand, table, must, level, minOpp, nextOpp) {
    var L = legal(hand, table, must); if (!L.length) return null;
    var cost = function (p) { var c = classify(p); return c.v + (c.n === 5 ? 0 : 0); };
    function usesBig(p) { return p.some(function (c) { return c[0] === '2'; }) || classify(p).k === 'four' || classify(p).k === 'sflush'; }
    if (level <= 1) { if (table && Math.random() < .25) return null; return L[Math.floor(Math.random() * L.length)]; }
    if (!table) { // 自己先出
      var low = sort(hand.slice())[0];
      var withLow = L.filter(function (p) { return p.indexOf(must || low) >= 0; });
      if (level === 2) return withLow.sort(function (a, b) { return a.length - b.length || cost(a) - cost(b); })[0] || L[0];
      // 普通以上：盡量用包含最小那張的組合丟掉多一點牌，但不要拆 2
      var cand = (withLow.length ? withLow : L).filter(function (p) { return !usesBig(p) || p.length === hand.length; });
      if (!cand.length) cand = withLow.length ? withLow : L;
      if (level >= 4 && nextOpp === 1) { // 下一家只剩一張：不出單張，或出最大的單張
        var multi = L.filter(function (p) { return p.length > 1; });
        if (multi.length) cand = multi; else return L.sort(function (a, b) { return cost(b) - cost(a); })[0];
      }
      return cand.sort(function (a, b) { return b.length - a.length || cost(a) - cost(b); })[0];
    }
    // 跟牌：用最小能壓過的
    L.sort(function (a, b) { return a.length - b.length || cost(a) - cost(b); });
    if (level === 2) return L[0];
    var safe = L.filter(function (p) { return !usesBig(p); });
    if (level >= 4 && minOpp <= 2) return table.cls.n === 1 ? L[L.length - 1] : L[0];
    if (safe.length) return safe[0];
    if (minOpp <= 4 || hand.length <= 4) return L[0];
    return null;
  }
  function penalty(hand) { var p = hand.length; if (p >= 9) p *= 2; hand.forEach(function (c) { if (c[0] === '2') p *= 2; }); return p; }
  return { ORD: ORD, val: val, rk: rk, sort: sort, sortSuit: sortSuit, classify: classify, beats: beats, allPlays: allPlays, legal: legal, pick: pick, penalty: penalty, KIND: KIND };
})();

(function () {
  'use strict';
  var SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300'];
  var REASONS = { empty: '第一個把手牌全部出完', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function next(g, s) { var t = s; do { t = (t + 1) % g.np; } while (g.out.indexOf(t) >= 0 && t !== s); return t; }
  function finish(g, w, why) {
    g.res = { w: w, why: why };
    g.pen = g.hands.map(function (h, s) { return s === w || g.out.indexOf(s) >= 0 ? 0 : B2.penalty(h); });
    g.reveal = g.hands.map(function (h) { return h.slice(); });
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3],
    reasons: REASONS,
    levelDesc: ['亂出牌，常常放水', '會跟牌，但不會留大牌', '會留 2 和炸彈，有點挑戰', '會盯著快出完的人，很難贏'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(4, n || 4));
      var d = PK.deck(0), per = n === 3 ? 17 : 13, hands = [];
      for (var s = 0; s < n; s++) hands.push(B2.sort(d.splice(0, per)));
      var all = [].concat.apply([], hands), low = B2.sort(all.slice())[0], first = 0;
      hands.forEach(function (h, s) { if (h.indexOf(low) >= 0) first = s; });
      if (n === 3 && d.length) { hands[first].push(d.pop()); B2.sort(hands[first]); } // 三人時多的一張給拿到最小牌的人
      return { np: n, hands: hands, turn: first, table: null, must: low, passed: [], out: [], cnt: 0, res: null, last: null, pen: null, reveal: null };
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { finish(g, -1, 'teacher'); g.pen = null; },
    view: function (g, seat) {
      return { np: g.np, hand: seat >= 0 ? g.hands[seat] : [], counts: g.hands.map(function (h) { return h.length; }), turn: g.turn, table: g.table, must: g.must, passed: g.passed, out: g.out, cnt: g.cnt, last: g.last, pen: g.pen, reveal: g.res ? g.reveal : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      var hand = g.hands[seat];
      if (d.t === 'pass') {
        if (!g.table || g.table.seat === seat) return false;
        g.passed.push(seat); g.cnt++; g.last = { k: 'pass', seat: seat, n: g.cnt };
        var nx = next(g, seat);
        if (nx === g.table.seat || g.out.indexOf(g.table.seat) >= 0 && nx === next(g, g.table.seat)) { g.table = null; g.passed = []; }
        g.turn = nx; return true;
      }
      if (d.t === 'play') {
        var cs = d.cs; if (!Array.isArray(cs) || !cs.length || cs.some(function (c, i) { return hand.indexOf(c) < 0 || cs.indexOf(c) !== i; })) return false;
        var cls = B2.classify(cs); if (!cls) return false;
        if (g.must && cs.indexOf(g.must) < 0) return false;
        if (g.table && !B2.beats(cls, g.table.cls)) return false;
        cs.forEach(function (c) { hand.splice(hand.indexOf(c), 1); });
        g.must = null; g.table = { seat: seat, cs: B2.sort(cs.slice()), cls: cls }; g.passed = []; g.cnt++;
        g.last = { k: 'play', seat: seat, n: g.cnt, kind: cls.k };
        if (!hand.length) { finish(g, seat, 'empty'); return true; }
        g.turn = next(g, seat); return true;
      }
      return false;
    },
    botTurn: function (g, seat, level) {
      if (g.res || g.turn !== seat) return null;
      var minOpp = 99; alive(g).forEach(function (s) { if (s !== seat) minOpp = Math.min(minOpp, g.hands[s].length); });
      var p = B2.pick(g.hands[seat], g.table, g.must, level, minOpp, g.hands[next(g, seat)].length);
      if (!p) return g.table ? { t: 'pass', n: g.cnt } : { t: 'play', cs: [B2.sort(g.hands[seat].slice())[0]], n: g.cnt };
      return { t: 'play', cs: p, n: g.cnt };
    },
    hintDesc: '輪到你時，會亮出「可以壓過桌上那手牌」的牌（沒有牌可以壓就會告訴你只能 Pass）；自由出牌時，會亮出手上最小的一組對子／順子，建議先把小牌出掉；第一手會亮出梅花 3。',
    tipDesc: '桌上有牌、而你沒有能壓過的牌時，提醒你按 Pass；其他時候提醒你怎麼選牌出牌。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var hand = g.hands[seat], plays = B2.legal(hand, g.table, g.must);
      if (g.must) return { msg: '第一手一定要包含最小的牌「梅花 3」，亮黃框的就是它。你可以只出它，也可以搭配其他牌（對子、順子…）一起出。', hl: [g.must] };
      if (g.table) {
        if (!plays.length) return { msg: '你手上沒有能壓過桌上那手牌的牌，只能按 Pass。', hl: [] };
        var set = {}; plays.forEach(function (p) { p.forEach(function (c) { set[c] = 1; }); });
        return { msg: '亮黃框的牌都可以拿來壓過桌上的牌（共 ' + Object.keys(set).length + ' 張）。想一想：要用最小的壓過去，還是先 Pass 把大牌留著？', hl: Object.keys(set) };
      }
      var multi = plays.filter(function (p) { var c = B2.classify(p); return c && c.n >= 2; }).sort(function (a, b) { return B2.classify(a).n - B2.classify(b).n || B2.classify(a).v - B2.classify(b).v; });
      if (multi.length) { var m = multi[0], k = B2.classify(m).k; return { msg: '自由出牌時，先把不容易配對的小牌出掉最划算。亮黃框的是你手上最小的一組「' + B2.KIND[k] + '」，可以考慮。', hl: m.slice() }; }
      var one = B2.sort(hand.slice())[0];
      return { msg: '沒有對子或順子可以出，那就從最小的單張開始出，把大牌留到後面。亮黃框的是你最小的牌。', hl: [one] };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      if (g.table && !B2.legal(g.hands[seat], g.table, g.must).length) return '你手上沒有能壓過桌上這手牌的牌，請按「Pass」跳過這一輪。';
      return g.table ? '輪到你了：選好要壓過去的牌（張數要跟桌上一樣），再按「出牌」；不想出就按「Pass」。' : '輪到你了：點牌讓它浮起來（可以選好幾張），湊成合法牌型再按「出牌」。';
    },
    hostView: function (g) {
      var h = '<div class="pk-host"><div class="pk-host-tb">' + (g.table ? g.table.cs.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') : '<em>新的一輪</em>') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.hands[s].length + ' 張') + (g.passed.indexOf(s) >= 0 ? '・Pass' : '') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '輪到第 ' + (g.turn + 1) + ' 位' + (g.table ? '・桌上：' + B2.KIND[g.table.cls.k] : '・自由出牌'), c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { finish(g, a.length ? a[0] : -1, why); return; }
    if (g.table && g.table.seat === seat) { g.table = null; g.passed = []; }
    if (g.must && g.turn === seat) g.must = null;
    if (g.turn === seat) g.turn = next(g, seat);
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: [], pending: null, round: -1, cnt: -1, bySuit: false, hint: -1 };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.sel = []; L.hint = -1; }
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt && la.seat !== tb.seat) {
      if (la.k === 'play') fx.snd(la.kind === 'four' || la.kind === 'sflush' ? 'cap' : 'move');
      if (!tb.res && v.turn === tb.seat) setTimeout(function () { fx.snd('turn'); }, 350);
    }
    L.cnt = v.cnt;
    L.sel = L.sel.filter(function (c) { return v.hand.indexOf(c) >= 0; });
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + (v.turn === tb.seat ? '你拿到最小的牌，由你先出' : ''));
  };
  setInterval(function () { var P = L.pending; if (!P || !mod._ctx) return; if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send(P.t, P.d); } }, 800);
  function act(ctx, t, d) { d.n = ctx.tb.view.cnt; L.pending = { t: t, d: d, n: d.n, at: Date.now() }; ctx.send(t, d); L.sel = []; L.hint = -1; ctx.rerender(); }
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.short = short;
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0;
    var myTurn = !tb.res && v.turn === seat && !P && !out;
    var wrap = el('div', 'pk-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (P) st.textContent = '出牌中…';
    else if (myTurn) { st.textContent = !v.table ? (v.must ? '你先出，要包含' + PK.name(v.must) : '大家都 Pass，你可以自由出牌') : '輪到你了！壓過桌上的牌，或 Pass'; st.className = 'pk-status me'; }
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, v, seat, function (i) { return v.passed.indexOf(i) >= 0 ? 'Pass' : ''; }, short));
    // 桌面
    var felt = el('div', 'pk-felt');
    if (v.table) {
      var row = el('div', 'pk-played'); v.table.cs.forEach(function (c) { var s = el('span'); s.innerHTML = PK.svg(c); row.appendChild(s); });
      felt.appendChild(row);
      felt.appendChild(el('div', 'pk-who', (v.table.seat === seat ? '你' : short(tb, v.table.seat)) + ' 出了' + B2.KIND[v.table.cls.k]));
    } else felt.appendChild(el('div', 'pk-empty', tb.res ? '' : '新的一輪'));
    wrap.appendChild(felt);
    if (tb.res && v.pen) {
      var pr = el('div', 'pk-pen');
      v.pen.forEach(function (p, i) { if (i === tb.res.w) return; pr.appendChild(el('span', '', short(tb, i) + (i === seat ? '（你）' : '') + '：剩 ' + v.reveal[i].length + ' 張，扣 ' + p + ' 分')); });
      wrap.appendChild(pr);
    }
    // 自己的手牌
    var hand = L.bySuit ? B2.sortSuit(v.hand.slice()) : v.hand.slice();
    var cls = B2.classify(L.sel), ok = myTurn && cls && (!v.must || L.sel.indexOf(v.must) >= 0) && (!v.table || B2.beats(cls, v.table.cls));
    wrap.appendChild(PKUI.hand(hand, {
      title: (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我'), color: SEATC[seat], count: v.hand.length, turn: v.turn === seat && !tb.res,
      sel: L.sel, info: L.sel.length ? (cls ? B2.KIND[cls.k] + (ok ? '' : (myTurn && v.table ? '（壓不過）' : '')) : '不是合法牌型') : '',
      onTap: function (c) { if (out || tb.res) return; var i = L.sel.indexOf(c); if (i >= 0) L.sel.splice(i, 1); else L.sel.push(c); ctx.snd('tap'); ctx.rerender(); }
    }));
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      var pb = ctx.button('pk-btn go', '出牌', function () { if (ok) { ctx.snd('move'); act(ctx, 'play', { cs: L.sel.slice() }); } }); pb.disabled = !ok; tools.appendChild(pb);
      if (myTurn && v.table) tools.appendChild(ctx.button('pk-btn', 'Pass', function () { act(ctx, 'pass', {}); }));
      if (L.sel.length) tools.appendChild(ctx.button('pk-btn', '清除', function () { L.sel = []; ctx.rerender(); }));
      tools.appendChild(ctx.button('pk-btn', L.bySuit ? '依點數排' : '依花色排', function () { L.bySuit = !L.bySuit; ctx.rerender(); }));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('big2', mod);

  /* ---------- 說明 ---------- */
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>4 人每人 13 張（3 人每人 17 張，2 人每人 13 張）。</li><li>拿到<b>梅花 3</b>（最小的牌）的人先出，第一手一定要包含這張。</li><li>輪流出牌，要出<b>同樣張數、同樣牌型而且比較大</b>的牌；不想出或出不了就按 <b>Pass</b>。</li><li>其他人都 Pass，最後出牌的人就可以重新自由出任何牌型。</li><li><b>第一個把手牌出完的人獲勝！</b></li></ol>' +
        '<p>操作：點牌會往上浮起（可以選好幾張），再按「出牌」。不知道出什麼時，可以請老師開放「💡 提示」功能，它會把能用的牌標出亮黃框。</p>' },
      { h: '大小順序', html: '<p>點數：<b>2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; … &gt; 3</b></p><p>點數一樣比花色：<b>黑桃 ♠ &gt; 紅心 ♥ &gt; 方塊 ♦ &gt; 梅花 ♣</b></p>' + cards(['2s', '2h', 'As', '3c'], '黑桃 2 最大、梅花 3 最小') },
      { h: '牌型', html: '<table class="g-tbl"><tr><th>牌型</th><th>說明</th></tr><tr><td>單張</td><td>任何一張</td></tr><tr><td>對子</td><td>兩張一樣點數，比較大的那張決定大小</td></tr><tr><td>順子</td><td>五張連續點數（A2345、23456 … 10JQKA；JQKA2 不算）。比最大的那張，有 2 的順子以 2 為最大</td></tr><tr><td>葫蘆</td><td>三張一樣＋一對，比三張的點數</td></tr><tr><td>鐵支</td><td>四張一樣＋任一張，可以壓單張、對子、順子、葫蘆</td></tr><tr><td>同花順</td><td>同花色的順子，可以壓所有牌型</td></tr></table>' +
        cards(['7c', '8d', '9s', 'Th', 'Jc'], '順子') + cards(['Kc', 'Kd', 'Ks', '4h', '4c'], '葫蘆') + cards(['9c', '9d', '9h', '9s', '3d'], '鐵支') },
      { h: '計分方式', html: '<p>第一個出完的人獲勝，記入積分榜（贏 3 分）。</p><p>其他人照台灣規則算扣分（只顯示在結果，給大家參考）：剩 1 張扣 1 分；<b>剩 9 張以上加倍</b>；手上每有一張 2 再加倍。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「撲克牌」→「大老二」開房間，投影 QR code。</li><li>左邊「每桌人數」可選 2、3、4 人（預設 4 人）。</li><li>大螢幕只顯示桌面上的牌和每人剩幾張，<b>不會露出手牌</b>。</li></ol>' },
      { h: '規則說明', html: '<ul><li>依台灣大老二比賽規則：2 最大，花色黑桃 &gt; 紅心 &gt; 方塊 &gt; 梅花，梅花 3 先出。</li><li>五張牌型只有同牌型才能互壓；鐵支可壓單張、對子、順子、葫蘆；同花順可壓任何牌型。</li><li>本工具不計「同花」（五張同花色不連號）與「三條」。</li><li>Pass 後下一圈仍可以再出牌。</li><li>三人局每人 17 張，多出的一張給拿到梅花 3 的人；二人局每人 13 張，其餘不用，由拿到最小牌的人先出。</li></ul>' },
      { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦會怎麼出</th></tr><tr><td>🐣 入門</td><td>亂出，常常 Pass 放水</td></tr><tr><td>🙂 簡單</td><td>能壓就壓最小的</td></tr><tr><td>🤔 普通</td><td>先丟小牌，把 2 和鐵支留到後面</td></tr><tr><td>🔥 困難</td><td>看到有人快出完就用大牌擋</td></tr></table>' },
      { h: '教學活動', html: '<ul><li><b>數感與比較</b>：認識點數與花色的大小順序。</li><li><b>組合思考</b>：手牌怎麼拆成最少手出完？可以把一手牌投影出來全班討論。</li></ul>' }
    ]
  };
})();
