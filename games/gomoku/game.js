/* 五子棋模組（座位 0 = 黑子先下，座位 1 = 白子） */
(function () {
  'use strict';
  var COL = ['b', 'w'];
  var REASONS = { five: '連成五子', full: '棋盤下滿了，平手', resign: '認輸', draw: '雙方同意和棋', teacher: '老師判和', left: '對手離開房間' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  var mod = {
    seats: 2,
    botSeats: [1, 1],
    reasons: REASONS,
    levelDesc: ['隨便下，常常忘記擋', '會擋明顯的威脅', '攻守都會，不會漏擋', '會製造雙重威脅，很難贏'],
    seatName: function (i) { return i === 0 ? '黑子' : '白子'; },
    seatColor: function (i) { return i === 0 ? '#1d1d1d' : '#f1efe8'; },
    init: function () { return { board: GMK.empty(), turn: 'b', hist: [], last: null, win: null, res: null, req: null }; },
    turnSeat: function (g) { return g.turn === 'b' ? 0 : 1; },
    forfeit: function (g, seat) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
    view: function (g) { return { board: g.board, turn: g.turn, n: g.hist.length, last: g.last, win: g.win, req: g.req }; },
    act: function (g, seat, d, notify) {
      var me = COL[seat];
      if (g.res) return false;
      switch (d.t) {
        case 'move':
          var i = d.i;
          if (g.turn !== me || d.n !== g.hist.length || typeof i !== 'number' || i < 0 || i >= 225 || g.board[i] !== '.') return false;
          g.hist.push(g.last); g.board = GMK.place(g.board, i, me); g.last = i; g.req = null;
          var line = GMK.winLine(g.board, i);
          if (line) { g.win = line; g.res = { w: seat, why: 'five' }; }
          else if (GMK.full(g.board)) g.res = { w: -1, why: 'full' };
          else g.turn = me === 'b' ? 'w' : 'b';
          return true;
        case 'req':
          if (g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
          if (d.k === 'undo' && g.hist.length < (me === 'b' ? 1 : 2)) return false;
          g.req = { k: d.k, by: me }; return true;
        case 'resp':
          if (!g.req || g.req.by === me) return false;
          var rq = g.req; g.req = null;
          if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
          if (d.ok && rq.k === 'undo') {
            var pops = g.turn === rq.by ? 2 : 1;
            while (pops-- && g.hist.length) { g.board = GMK.place(g.board, g.last, '.'); g.last = g.hist.pop(); g.turn = g.turn === 'b' ? 'w' : 'b'; }
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
      if (g.req && g.req.by !== me) return { t: 'resp', ok: g.req.k === 'undo' ? true : GMK.advantage(g.board, me) < 0 };
      if (g.req || g.turn !== me) return null;
      var i = GMK.pick(g.board, me, level); if (i < 0) return null;
      return { t: 'move', i: i, n: g.hist.length };
    },
    hintDesc: '會用閃亮的圈圈標出「這一步很重要」的交叉點：自己能連成五子的位置、必須擋住對方的位置，或對你攻守都有幫助的位置。',
    tipDesc: '發呆太久時，提醒你怎麼下子（點交叉點先預覽，再按確認）。',
    hint: function (g, seat) {
      var me = COL[seat]; if (g.res || g.turn !== me) return null;
      var list = GMK.scored(g.board, me, 1);
      if (!list.length) return null;
      var win = list.filter(function (m) { return m.a >= 1e6; }), blk = list.filter(function (m) { return m.d >= 1e6; });
      if (win.length) return { msg: '你有機會直接連成五子！亮黃圈的位置就是。', hl: win.slice(0, 3).map(function (m) { return m.i; }) };
      if (blk.length) return { msg: '對方下一步就要連成五子了，一定要擋住！亮黃圈的位置要擋。', hl: blk.slice(0, 3).map(function (m) { return m.i; }) };
      return { msg: '這幾個位置對你很重要：下在這裡可以讓自己的棋連得更長，或擋住對方的連線。亮黃圈的位置值得考慮。', hl: list.slice(0, 3).map(function (m) { return m.i; }) };
    },
    nudge: function (g, seat) {
      var me = COL[seat]; if (g.res) return null;
      if (g.req && g.req.by !== me) return '對方提出了' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，請在畫面上選「同意」或「不同意」。';
      if (g.turn !== me || g.req) return null;
      return '輪到你了：點棋盤上的交叉點，會先出現半透明的預覽棋子，確定位置再按「確認落子」。';
    },
    hostView: function (g) { return GMK.svg(g.board, { last: g.last, win: g.win }); },
    hostStatus: function (g) {
      if (g.req) return { t: (g.req.by === 'b' ? '黑子' : '白子') + '提出' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，等待回覆', c: 'hot' };
      return { t: '第 ' + (g.hist.length + 1) + ' 手・輪到' + (g.turn === 'b' ? '黑子' : '白子'), c: '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { ghost: null, pending: null, round: -1, lastN: -1, anim: false };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.pending = null; L.ghost = null; }
    if (L.pending && v.n !== L.pending.n) L.pending = null;
    if (L.lastN >= 0 && v.n > L.lastN && v.last != null) {
      var mine = v.board[v.last] === COL[tb.seat];
      if (!mine) { fx.snd('move'); if (!tb.res) setTimeout(function () { fx.snd('turn'); }, 350); }
      L.anim = !mine;
    } else if (L.lastN >= 0 && v.n < L.lastN) fx.toast('已經悔棋');
    L.lastN = v.n;
    if (L.ghost != null && v.board[L.ghost] !== '.') L.ghost = null;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + (tb.seat === 0 ? '黑子（先下）' : '白子'));
  };
  setInterval(function () {
    var P = L.pending; if (!P || !mod._ctx) return;
    if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('move', { i: P.i, n: P.n }); }
  }, 800);
  function bar(i, isMe, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === COL[i];
    var w = el('div', 'gm-who' + (turn ? ' turn' : '')); w.setAttribute('data-seat', i);
    w.appendChild(el('span', 'gm-stone ' + COL[i]));
    w.appendChild(el('span', 'n', info.name + (isMe && info.name !== '我' ? '・我' : '')));
    if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
    w.appendChild(el('span', 'tag' + (turn ? ' now' : ''), turn ? '下棋中' : mod.seatName(i)));
    return w;
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, my = COL[seat], P = L.pending;
    var board = P ? GMK.place(v.board, P.i, my) : v.board, myTurn = !tb.res && v.turn === my && !P && !v.req;
    var wrap = el('div', 'gm-table');
    wrap.innerHTML = '<svg class="gm-bamboo" viewBox="0 0 120 400" preserveAspectRatio="xMinYMax meet"><g fill="#4f7a4a" opacity=".22"><rect x="14" y="0" width="7" height="400" rx="3"/><rect x="34" y="40" width="5" height="360" rx="2.5"/><rect x="52" y="90" width="6" height="310" rx="3"/></g><g stroke="#4f7a4a" stroke-width="2" opacity=".3"><path d="M14 80h7M14 170h7M14 260h7M34 140h5M34 230h5M52 190h6M52 290h6"/></g><g fill="#5f8c55" opacity=".25"><path d="M21 78 q22 -14 40 -6 q-20 4 -40 6z"/><path d="M39 138 q20 -16 38 -10 q-18 6 -38 10z"/><path d="M14 168 q-14 -14 -12 -26 q8 14 12 26z"/></g></svg>';
    var st = el('div', 'gm-status');
    if (tb.res) st.textContent = '對局結束';
    else if (P) st.textContent = '落子中…';
    else if (v.req) st.textContent = '等待回覆…';
    else if (v.turn === my) { st.textContent = L.ghost != null ? '再點一下就落子' : '輪到你了，點一個交叉點'; st.className = 'gm-status me'; }
    else st.textContent = '等對方思考…';
    wrap.appendChild(st);
    wrap.appendChild(bar(1 - seat, false, v, tb));
    var bx = el('div', 'gm-board'), bin = el('div');
    bin.innerHTML = GMK.svg(board, { hl: myTurn && ctx.hint && ctx.hint.hl, last: P ? P.i : v.last, win: v.win, anim: L.anim || !!P, ghost: myTurn ? L.ghost : null, ghostColor: my });
    L.anim = false;
    bx.appendChild(BG.zoom('gomoku', bin));
    function commit(i) {
      L.pending = { i: i, n: v.n, at: Date.now() }; L.ghost = null; ctx.snd('move');
      ctx.send('move', { i: i, n: v.n }); ctx.rerender();
    }
    bx.addEventListener('click', function (e) {
      if (!myTurn) return;
      var i = GMK.hit(bin.firstChild, e); if (i < 0) return;
      if (v.board[i] !== '.') { ctx.snd('error'); return; }
      if (L.ghost === i) return commit(i);
      L.ghost = i; ctx.snd('tap'); ctx.rerender();
    });
    wrap.appendChild(bx);
    if (myTurn) {
      var cf = el('div', 'gm-confirm');
      var ok = ctx.button('gm-btn go', '✔ 確定落子', function () { if (L.ghost != null) commit(L.ghost); }); ok.disabled = L.ghost == null; cf.appendChild(ok);
      if (L.ghost != null) cf.appendChild(ctx.button('gm-btn', '取消', function () { L.ghost = null; ctx.rerender(); }));
      wrap.appendChild(cf);
    }
    wrap.appendChild(bar(seat, true, v, tb));
    if (v.req && !tb.res) {
      var rq = el('div', 'gm-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
      if (v.req.by === my) { rq.appendChild(el('p', '', '已經提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('gm-btn', '取消', function () { ctx.send('cancel'); })); }
      else {
        rq.appendChild(el('p', '', '對方想要' + k + '，你同意嗎？'));
        var r = el('div', 'row c'); r.appendChild(ctx.button('gm-btn go', '同意', function () { ctx.send('resp', { ok: true }); })); r.appendChild(ctx.button('gm-btn no', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r);
      }
      wrap.appendChild(rq);
    }
    if (!tb.res) {
      var tools = el('div', 'gm-tools');
      if (ctx.canUndo) tools.appendChild(ctx.button('gm-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = v.n < (my === 'b' ? 1 : 2) || !!v.req || !!P;
      tools.appendChild(ctx.button('gm-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
      tools.appendChild(ctx.button('gm-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
      tools.appendChild(ctx.emoteButton('gm-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  /* 老師端不接受剛剛的動作時，解除「送出中」，讓學生可以重新操作 */
  if (!mod.onReject) mod.onReject = function () { if (typeof L !== 'undefined' && L) { if ('sent' in L) L.sent = -1; if ('pending' in L) L.pending = null; } };
  BG.register('gomoku', mod);
})();
