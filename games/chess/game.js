/* 西洋棋模組（座位 0 = 白方先走，座位 1 = 黑方） */
(function () {
  'use strict';
  var COL = ['w', 'b'];
  var REASONS = { mate: '將死', stale: '逼和（沒有合法的棋可走），平手', fifty: '50 回合沒有吃子也沒有動士兵，和棋', material: '雙方子力不足，無法將死，和棋', repeat: '同一個局面出現三次，和棋', resign: '認輸', draw: '雙方同意和棋', teacher: '老師判和', left: '對手離開房間' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function snap(g) { return { st: g.st, last: g.last, check: g.check }; }
  var mod = {
    seats: 2, botSeats: [1, 1], ver: 1,
    reasons: REASONS,
    levelDesc: ['常常亂走', '只看一步，會吃送上門的棋子', '會想三步，懂得保護棋子', '會想四步以上，很難贏'],
    seatName: function (i) { return i === 0 ? '白方' : '黑方'; },
    seatColor: function (i) { return i === 0 ? '#f1efe8' : '#1d1d1d'; },
    init: function () { return { st: CH.START, hist: [], keys: [CH.key(CH.START)], last: null, check: false, res: null, req: null }; },
    turnSeat: function (g) { return g.st.turn === 'w' ? 0 : 1; },
    forfeit: function (g, seat) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
    view: function (g) { return { st: g.st, turn: g.st.turn, n: g.hist.length, last: g.last, check: g.check, req: g.req }; },
    act: function (g, seat, d, notify) {
      var me = COL[seat];
      if (g.res) return false;
      switch (d.t) {
        case 'move':
          if (g.st.turn !== me || d.n !== g.hist.length) return false;
          var m = CH.legal(g.st).filter(function (x) { return x.f === d.f && x.t === d.to && ('qrbn'.indexOf(x.x) < 0 || !x.x || x.x === (d.p || 'q')); })[0];
          if (!m) return false;
          g.hist.push(snap(g));
          g.st = CH.apply(g.st, m); g.last = { f: m.f, t: m.t }; g.req = null;
          g.keys.push(CH.key(g.st));
          var s = CH.status(g.st, g.keys); g.check = s.check;
          if (s.over) g.res = s.why === 'mate' ? { w: seat, why: 'mate' } : { w: -1, why: s.why };
          return true;
        case 'req':
          if (g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
          if (d.k === 'undo' && g.hist.length < (me === 'w' ? 1 : 2)) return false;
          g.req = { k: d.k, by: me }; return true;
        case 'resp':
          if (!g.req || g.req.by === me) return false;
          var rq = g.req; g.req = null;
          if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
          if (d.ok && rq.k === 'undo') {
            var pops = g.st.turn === rq.by ? 2 : 1;
            while (pops-- && g.hist.length) { var h = g.hist.pop(); g.st = h.st; g.last = h.last; g.check = h.check; g.keys.pop(); }
          }
          if (!d.ok) notify(1 - seat, '對方不同意' + (rq.k === 'undo' ? '悔棋' : '和棋'));
          return true;
        case 'cancel':
          if (g.req && g.req.by === me) { g.req = null; return true; } return false;
        case 'resign':
          g.res = { w: 1 - seat, why: 'resign' }; g.req = null; return true;
      }
      return false;
    },
    botTurn: function (g, seat, level) {
      var me = COL[seat];
      if (g.res) return null;
      if (g.req && g.req.by !== me) return { t: 'resp', ok: g.req.k === 'undo' ? true : CH.evalW(g.st.b) * (me === 'w' ? 1 : -1) < -150 };
      if (g.req || g.st.turn !== me) return null;
      var m = CH.pick(g.st, level, g.keys); if (!m) return null;
      return { t: 'move', f: m.f, to: m.t, p: 'qrbn'.indexOf(m.x) >= 0 && m.x ? m.x : undefined, n: g.hist.length };
    },
    hintDesc: '被將軍時，會亮出能解圍的棋子；可以「白吃」或吃到更值錢的棋時，亮出可以吃子的棋子；自己的棋子正被攻擊時，亮出需要保護或躲開的棋子；否則亮出還沒出動的馬、象。',
    tipDesc: '被將軍、對方提出悔棋／和棋、或發呆太久時，提醒你怎麼走棋。',
    hint: function (g, seat) {
      var me = COL[seat], st = g.st, b = st.b, opp = CH.other(me), V = CH.VAL;
      if (g.res || st.turn !== me) return null;
      var ms = CH.legal(st); if (!ms.length) return null;
      var movers = {}, caps = {}, wins = {}, danger = {}, dev = {};
      ms.forEach(function (m) {
        movers[m.f] = 1;
        var pf = b[m.f].toLowerCase(), tgt = b[m.t];
        if (tgt !== '.') {
          caps[m.f] = 1;
          var after = CH.attacked(CH.apply(st, m).b, m.t, opp);
          if (!after || V[tgt.toLowerCase()] > V[pf]) wins[m.f] = 1;
        }
        if ((pf === 'n' || pf === 'b') && ((me === 'w' && (m.f >> 3) === 7) || (me === 'b' && (m.f >> 3) === 0))) dev[m.f] = 1;
      });
      function keys(o) { return Object.keys(o).map(Number); }
      if (g.check) return { msg: '你被將軍了！一定要先解圍。亮黃框的棋子可以幫國王解圍（移開國王、擋住、或吃掉攻擊的棋）。', hl: keys(movers) };
      for (var i = 0; i < 64; i++) {
        if (b[i] === '.' || CH.colorOf(b[i]) !== me || b[i].toLowerCase() === 'k') continue;
        if (CH.attacked(b, i, opp) && (!CH.attacked(b, i, me) || V[b[i].toLowerCase()] > 100)) danger[i] = 1;
      }
      if (keys(wins).length) return { msg: '有棋子可以「划算地吃子」（吃了不會被吃回來，或吃到更值錢的棋）！亮黃框的就是可以吃子的棋子。', hl: keys(wins) };
      if (keys(danger).length) return { msg: '小心！亮黃框的棋子正被對方攻擊，想想要躲開、保護它，或反過來攻擊對方。', hl: keys(danger) };
      if (keys(caps).length) return { msg: '有棋子可以吃子，但要先想想：吃了以後會不會被吃回來？亮黃框的是可以吃子的棋子。', hl: keys(caps) };
      if (keys(dev).length) return { msg: '開局別忘了讓馬和象出動！亮黃框的是還在原位、可以走出去的馬和象。', hl: keys(dev) };
      return { msg: '目前沒有急迫的吃子或危險。亮黃框的是可以移動的棋子，想一想哪一顆走了可以讓整體更好。', hl: keys(movers).slice(0, 6) };
    },
    nudge: function (g, seat) {
      var me = COL[seat]; if (g.res) return null;
      if (g.req && g.req.by !== me) return '對方提出了' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，請在畫面上選「同意」或「不同意」。';
      if (g.st.turn !== me || g.req) return null;
      if (g.check) return '你被將軍了！要先解圍：移開國王、擋住攻擊，或吃掉攻擊的棋子。';
      return '輪到你了：先點一顆自己的棋子，會出現綠色提示（可以走的位置），再點那個位置就能走囉！';
    },
    hostView: function (g) { return CH.svg(g.st, { last: g.last, check: g.check ? CH.kingAt(g.st.b, g.st.turn) : -1 }); },
    hostStatus: function (g) {
      if (g.req) return { t: (g.req.by === 'w' ? '白方' : '黑方') + '提出' + (g.req.k === 'undo' ? '悔棋' : '和棋'), c: 'hot' };
      return { t: '第 ' + (Math.floor(g.hist.length / 2) + 1) + ' 回合・輪到' + (g.st.turn === 'w' ? '白方' : '黑方') + (g.check ? '（被將軍）' : ''), c: g.check ? 'hot' : '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, pending: null, promo: null, round: -1, lastN: -1 };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.pending = null; L.sel = -1; L.promo = null; }
    if (L.pending && v.n !== L.pending.n) L.pending = null;
    if (L.lastN >= 0 && v.n > L.lastN) {
      var mine = v.st.turn !== COL[tb.seat];
      if (!mine) { fx.snd(v.check ? 'check' : 'move'); if (!tb.res) setTimeout(function () { fx.snd('turn'); }, 350); }
      if (v.check && !tb.res) fx.toast(mine ? '將軍！' : '小心！你的國王被將軍了');
      L.sel = -1;
    } else if (L.lastN >= 0 && v.n < L.lastN) { fx.toast('已經悔棋'); L.sel = -1; }
    L.lastN = v.n;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + (tb.seat === 0 ? '白方（先走）' : '黑方'));
  };
  setInterval(function () { var P = L.pending; if (!P || !mod._ctx) return; if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('move', P.d); } }, 800);
  function bar(i, isMe, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === COL[i];
    var w = el('div', 'ch-who' + (turn ? ' turn' : ''));
    var pc = el('span', 'ch-pcicon ' + COL[i], CH.GLY.k + '︎'); w.appendChild(pc);
    w.appendChild(el('span', 'n', info.name + (isMe && info.name !== '我' ? '・我' : '')));
    if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
    w.appendChild(el('span', 'tag' + (turn ? ' now' : ''), turn ? (v.check ? '被將軍！' : '思考中') : mod.seatName(i)));
    return w;
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, my = COL[seat], P = L.pending, flip = seat === 1;
    var myTurn = !tb.res && v.turn === my && !P && !v.req;
    var st = P ? CH.apply(v.st, P.m) : v.st, legal = myTurn ? CH.legal(v.st) : [];
    var wrap = el('div', 'ch-table');
    var s = el('div', 'ch-status');
    if (tb.res) s.textContent = '對局結束';
    else if (P) s.textContent = '走棋中…';
    else if (v.req) s.textContent = '等待回覆…';
    else if (myTurn) { s.textContent = (v.check ? '⚠️ 你被將軍了！' : '輪到你了：') + (L.sel >= 0 ? '點綠點走過去，或換一顆棋' : '點一顆你的棋子'); s.className = 'ch-status me'; }
    else s.textContent = '等對方思考…';
    wrap.appendChild(s);
    wrap.appendChild(bar(1 - seat, false, v, tb));
    var targets = L.sel >= 0 ? legal.filter(function (m) { return m.f === L.sel; }).map(function (m) { return m.t; }) : [];
    var bx = el('div', 'ch-board'), bin = el('div');
    bin.innerHTML = CH.svg(st, { hl: myTurn && ctx.hint && ctx.hint.hl, flip: flip, last: P ? { f: P.m.f, t: P.m.t } : v.last, sel: L.sel, targets: targets, check: v.check && !P ? CH.kingAt(v.st.b, v.st.turn) : -1 });
    bx.appendChild(BG.zoom('chess', bin));
    function go(m, p) {
      var d = { f: m.f, to: m.t, p: p, n: v.n };
      L.pending = { d: d, n: v.n, at: Date.now(), m: p ? legal.filter(function (x) { return x.f === m.f && x.t === m.t && x.x === p; })[0] : m };
      L.sel = -1; L.promo = null; ctx.snd(v.st.b[m.t] !== '.' ? 'cap' : 'move'); ctx.send('move', d); ctx.rerender();
    }
    bx.addEventListener('click', function (e) {
      if (!myTurn) return;
      var i = CH.hit(bin.firstChild, e, flip); if (i < 0) return;
      if (CH.colorOf(v.st.b[i]) === my) { L.sel = L.sel === i ? -1 : i; ctx.snd('tap'); ctx.rerender(); return; }
      if (L.sel < 0) return;
      var ms = legal.filter(function (m) { return m.f === L.sel && m.t === i; });
      if (!ms.length) { ctx.snd('error'); return; }
      if (ms.length > 1) { L.promo = ms[0]; ctx.rerender(); return; }
      go(ms[0]);
    });
    wrap.appendChild(bx);
    if (L.promo && myTurn) {
      var pr = el('div', 'ch-promo'); pr.appendChild(el('p', '', '士兵走到底了！要升變成什麼？'));
      var row = el('div', 'row c');
      ['q', 'r', 'b', 'n'].forEach(function (x) { var b = ctx.button('ch-btn', '', function () { go(L.promo, x); }); b.innerHTML = '<span class="ch-pcicon ' + my + '">' + CH.GLY[x] + '︎</span>' + CH.NAME[x]; row.appendChild(b); });
      pr.appendChild(row); pr.appendChild(ctx.button('ch-btn', '取消', function () { L.promo = null; ctx.rerender(); }));
      wrap.appendChild(pr);
    }
    wrap.appendChild(bar(seat, true, v, tb));
    if (v.req && !tb.res) {
      var rq = el('div', 'ch-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
      if (v.req.by === my) { rq.appendChild(el('p', '', '已經提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('ch-btn', '取消', function () { ctx.send('cancel'); })); }
      else { rq.appendChild(el('p', '', '對方想要' + k + '，你同意嗎？')); var r2 = el('div', 'row c'); r2.appendChild(ctx.button('ch-btn go', '同意', function () { ctx.send('resp', { ok: true }); })); r2.appendChild(ctx.button('ch-btn', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r2); }
      wrap.appendChild(rq);
    }
    if (!tb.res) {
      var tools = el('div', 'ch-tools');
      if (ctx.canUndo) tools.appendChild(ctx.button('ch-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = v.n < (my === 'w' ? 1 : 2) || !!v.req || !!P;
      tools.appendChild(ctx.button('ch-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
      tools.appendChild(ctx.button('ch-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
      tools.appendChild(ctx.emoteButton('ch-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('chess', mod);
})();
