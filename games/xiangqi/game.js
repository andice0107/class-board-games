/* 中國象棋模組：老師端判定 + 學生端棋桌畫面（座位 0 = 紅方，座位 1 = 黑方） */
(function () {
  'use strict';
  var COL = ['r', 'b'];
  var REASONS = { mate: '將死', stuck: '困斃（沒棋可走）', resign: '認輸', draw: '雙方同意和棋', nocap: '60 回合沒有吃子，和棋', teacher: '老師判和', left: '對手離開房間' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  var mod = {
    seats: 2,
    reasons: REASONS,
    seatName: function (i) { return i === 0 ? '紅方' : '黑方'; },
    seatColor: function (i) { return i === 0 ? '#c0392b' : '#1f1a17'; },
    init: function () { return { board: XQ.START, turn: 'r', hist: [], last: null, check: false, res: null, req: null, noCap: 0 }; },
    turnSeat: function (g) { return g.turn === 'r' ? 0 : 1; },
    forfeit: function (g, seat) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
    view: function (g) { return { board: g.board, turn: g.turn, n: g.hist.length, last: g.last, check: g.check, req: g.req }; },

    /* 老師端：處理學生送來的動作，回傳 true 代表局面有變 */
    act: function (g, seat, d, notify) {
      var me = COL[seat];
      if (g.res) return false;
      switch (d.t) {
        case 'move':
          if (g.turn !== me || d.n !== g.hist.length || !XQ.isLegal(g.board, d.from, d.to, me)) return false;
          var cap = g.board[d.to] !== '.';
          g.hist.push({ board: g.board, last: g.last, noCap: g.noCap, check: g.check });
          g.board = XQ.apply(g.board, d.from, d.to); g.last = [d.from, d.to]; g.turn = XQ.other(me);
          g.noCap = cap ? 0 : g.noCap + 1; g.req = null;
          var st = XQ.status(g.board, g.turn); g.check = st.check;
          if (st.over) g.res = { w: seat, why: st.check ? 'mate' : 'stuck' };
          else if (g.noCap >= 120) g.res = { w: -1, why: 'nocap' };
          return true;
        case 'req':
          if (g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
          if (d.k === 'undo' && g.hist.length < (me === 'r' ? 1 : 2)) return false;
          g.req = { k: d.k, by: me }; return true;
        case 'resp':
          if (!g.req || g.req.by === me) return false;
          var rq = g.req; g.req = null;
          if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
          if (d.ok && rq.k === 'undo') {
            var pops = g.turn === rq.by ? 2 : 1;
            while (pops-- && g.hist.length) { var h = g.hist.pop(); g.board = h.board; g.last = h.last; g.noCap = h.noCap; g.check = h.check; g.turn = XQ.other(g.turn); }
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
    /* 電腦玩家：輪到它或需要它回覆時，回傳要做的動作 */
    botSeats: [1, 1],
    botTurn: function (g, seat, level) {
      var me = COL[seat];
      if (g.res) return null;
      if (g.req && g.req.by !== me) {
        if (g.req.k === 'undo') return { t: 'resp', ok: true };
        return { t: 'resp', ok: XQAI.evaluate(g.board, me) < 120 };
      }
      if (g.req || g.turn !== me) return null;
      var m = XQAI.pick(g.board, me, level); if (!m) return null;
      return { t: 'move', from: m.from, to: m.to, n: g.hist.length };
    },
    hostView: function (g) { return XQ.svg(g.board, { last: g.last, checkKing: g.check && !g.res ? XQ.king(g.board, g.turn) : null }); },
    hostStatus: function (g) {
      if (g.req) return { t: (g.req.by === 'r' ? '紅方' : '黑方') + '提出' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，等待回覆', c: 'hot' };
      return { t: (g.check ? '⚠️ 將軍！' : '') + '第 ' + (Math.floor(g.hist.length / 2) + 1) + ' 回合・輪到' + (g.turn === 'r' ? '紅方' : '黑方'), c: g.check ? 'hot' : '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, dots: [], pending: null, anim: false, round: -1, lastN: -1 };
  /* 收到新狀態時：音效、動畫 */
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.pending = null; L.sel = -1; L.dots = []; }
    if (L.pending && v.n !== L.pending.n) L.pending = null;
    if (L.lastN >= 0 && v.n > L.lastN && v.last) {
      var mine = XQ.side(v.board[v.last[1]]) === COL[tb.seat];
      var capd = prev && prev.view && prev.view.board[v.last[1]] !== '.';
      if (v.check && !tb.res) { fx.snd('check'); stamp('將'); }
      else if (!mine) { if (capd) { fx.snd('cap'); splash(); } else fx.snd('move'); }
      L.anim = !mine;
    } else if (L.lastN >= 0 && v.n < L.lastN) fx.toast('已經悔棋');
    L.lastN = v.n;
    if (tb.res || v.turn !== COL[tb.seat]) { L.sel = -1; L.dots = []; }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + (tb.seat === 0 ? '紅方（先下）' : '黑方'));
  };
  setInterval(function () {
    var P = L.pending; if (!P || !mod._ctx) return;
    if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('move', { from: P.from, to: P.to, n: P.n }); }
  }, 800);

  function bar(ctx, i, isMe, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === COL[i];
    var w = el('div', 'xq-who' + (turn ? ' turn' : '')); w.setAttribute('data-seat', i);
    w.appendChild(el('span', 'xq-stone ' + COL[i], i === 0 ? '帥' : '將'));
    w.appendChild(el('span', 'n', info.name + (isMe ? '（我）' : '')));
    if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
    w.appendChild(el('span', 'tag' + (turn ? ' now' : ''), turn ? '落子中' : mod.seatName(i)));
    return w;
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, my = COL[seat], op = 1 - seat, P = L.pending;
    var board = P ? XQ.apply(v.board, P.from, P.to) : v.board, myTurn = !tb.res && v.turn === my && !P && !v.req;
    var wrap = el('div', 'xq-table');
    wrap.innerHTML = '<svg class="xq-hills" viewBox="0 0 600 120" preserveAspectRatio="none"><path fill="#7d8780" opacity=".22" d="M0 70 C60 40 110 30 170 55 S270 20 330 45 S440 10 500 40 S570 35 600 45 V120 H0Z"/><path fill="#3b403c" opacity=".2" d="M0 95 C80 75 140 70 210 88 S330 65 400 85 S520 70 600 82 V120 H0Z"/></svg><div class="xq-sun"></div>';
    var st = el('div', 'xq-status');
    if (tb.res) st.textContent = '對局結束';
    else if (P) st.textContent = '落子中…';
    else if (v.req) st.textContent = '等待回覆…';
    else if (v.turn === my) { st.textContent = v.check ? '⚠️ 你被將軍了！快解圍' : '輪到你了，請落子'; st.className = 'xq-status ' + (v.check ? 'hot' : 'me'); }
    else st.textContent = v.check ? '你將軍了對方！' : '等對方思考…';
    wrap.appendChild(st);
    wrap.appendChild(bar(ctx, op, false, v, tb));
    var bx = el('div', 'xq-board'), bin = el('div');
    bin.innerHTML = XQ.svg(board, { flip: my === 'b', sel: L.sel, dots: L.dots, last: P ? [P.from, P.to] : v.last, anim: L.anim || !!P, checkKing: v.check && !tb.res && !P ? XQ.king(v.board, v.turn) : null });
    L.anim = false;
    bx.appendChild(BG.zoom('xiangqi', bin));
    bx.addEventListener('click', function (e) {
      if (!myTurn) return;
      var i = XQ.hit(bin.firstChild, e, my === 'b'); if (i < 0) return;
      if (L.sel >= 0 && L.dots.indexOf(i) >= 0) {
        L.pending = { from: L.sel, to: i, n: v.n, at: Date.now() };
        if (v.board[i] !== '.') { ctx.snd('cap'); splash(); } else ctx.snd('move');
        ctx.send('move', { from: L.sel, to: i, n: v.n }); L.sel = -1; L.dots = []; ctx.rerender(); return;
      }
      if (XQ.side(v.board[i]) === my) { L.sel = L.sel === i ? -1 : i; L.dots = L.sel >= 0 ? XQ.legalFrom(v.board, i) : []; if (L.sel >= 0 && !L.dots.length) ctx.toast('這顆棋現在不能走'); ctx.snd('tap'); }
      else { L.sel = -1; L.dots = []; }
      ctx.rerender();
    });
    wrap.appendChild(bx);
    wrap.appendChild(bar(ctx, seat, true, v, tb));
    if (v.req && !tb.res) {
      var rq = el('div', 'xq-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
      if (v.req.by === my) { rq.appendChild(el('p', '', '已經向對方提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('xq-btn', '取消', function () { ctx.send('cancel'); })); }
      else {
        rq.appendChild(el('p', '', '對方想要' + k + '，你同意嗎？'));
        var r = el('div', 'row c'); r.appendChild(ctx.button('xq-btn jade', '同意', function () { ctx.send('resp', { ok: true }); })); r.appendChild(ctx.button('xq-btn seal', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r);
      }
      wrap.appendChild(rq);
    }
    if (!tb.res) {
      var tools = el('div', 'xq-tools');
      tools.appendChild(ctx.button('xq-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = !(v.n >= (my === 'r' ? 1 : 2)) || !!v.req || !!P;
      tools.appendChild(ctx.button('xq-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
      tools.appendChild(ctx.button('xq-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
      tools.appendChild(ctx.emoteButton('xq-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  function stamp(t) { var w = el('div', 'xq-stamp'); w.appendChild(el('span', '', t)); document.body.appendChild(w); setTimeout(function () { w.remove(); }, 1200); }
  function splash() { var bx = document.querySelector('.xq-board'); if (!bx) return; var r = bx.getBoundingClientRect(), d = el('div', 'xq-splash'), s = r.width * .5; d.style.cssText = 'left:' + (r.left + r.width / 2 - s / 2) + 'px;top:' + (r.top + r.height / 2 - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px'; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 800); }

  BG.register('xiangqi', mod);
})();
