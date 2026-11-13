/* 三色跳棋模組：每桌 2 或 3 人，座位 0 紅、1 黃、2 藍 */
(function () {
  'use strict';
  var NAMES = ['紅色', '黃色', '綠色'], LIMIT = 600;
  var REASONS = { finish: '十顆棋子全部走進對面的星角', resign: '其他人都認輸了', left: '其他人都離開了', draw: '雙方同意和棋', teacher: '老師判和', limit: '步數到了上限，剩下最少棋子的人獲勝', stuck: '大家都走不動了，平手' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function nextTurn(g) {
    for (var k = 1; k <= g.np; k++) {
      var s = (g.turn + k) % g.np;
      if (g.out.indexOf(s) >= 0) continue;
      if (CCK.allMoves(g.board, s, g.np).length) { g.turn = s; return true; }
    }
    return false;
  }
  function knockOut(g, seat, why) {
    if (g.out.indexOf(seat) < 0) g.out.push(seat);
    g.board = g.board.split('').map(function (c) { return c === String(seat) ? '.' : c; }).join('');
    var alive = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) alive.push(s);
    if (alive.length <= 1) { g.res = { w: alive.length ? alive[0] : -1, why: why }; return; }
    if (g.turn === seat) nextTurn(g);
  }
  var mod = {
    ver: 2, seats: 3, seatOptions: [2, 3], botSeats: [1, 2],
    reasons: REASONS,
    levelDesc: ['隨便挑一顆往前走', '大致往前，常走得不划算', '每步都挑跳最遠的', '會先搭橋連跳，很難贏'],
    seatName: function (i) { return NAMES[i] || ''; },
    seatColor: function (i) { return CCK.COLORS[i]; },
    init: function (n) { n = n === 3 ? 3 : 2; return { np: n, board: CCK.init(n), turn: 0, hist: [], last: null, res: null, req: null, out: [], moves: 0 }; },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { if (g.np === 2) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; } else knockOut(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
    view: function (g) {
      var left = []; for (var s = 0; s < g.np; s++) left.push(g.out.indexOf(s) >= 0 ? null : CCK.left(g.board, g.np, s));
      return { np: g.np, board: g.board, turn: g.turn, cnt: g.hist.length, last: g.last, req: g.req, out: g.out, left: left };
    },
    act: function (g, seat, d, notify) {
      if (g.res) return false;
      switch (d.t) {
        case 'move':
          if (g.turn !== seat || d.n !== g.hist.length || g.board[d.from] !== String(seat)) return false;
          var path = CCK.moves(g.board, d.from, g.np)[d.to]; if (!path) return false;
          g.hist.push({ board: g.board, last: g.last, turn: g.turn, moves: g.moves });
          g.board = CCK.move(g.board, d.from, d.to); g.last = path; g.req = null; g.moves++;
          if (CCK.won(g.board, g.np, seat)) { g.res = { w: seat, why: 'finish' }; return true; }
          if (g.moves >= LIMIT) {
            var best = -1, bl = 99, tie = false;
            for (var s = 0; s < g.np; s++) { if (g.out.indexOf(s) >= 0) continue; var l = CCK.left(g.board, g.np, s); if (l < bl) { bl = l; best = s; tie = false; } else if (l === bl) tie = true; }
            g.res = { w: tie ? -1 : best, why: 'limit' }; return true;
          }
          if (!nextTurn(g)) g.res = { w: -1, why: 'stuck' };
          return true;
        case 'req':
          if (g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
          if (d.k === 'draw' && g.np !== 2) return false;
          if (d.k === 'undo' && !g.hist.some(function (h) { return h.turn === seat; })) return false;
          g.req = { k: d.k, by: seat }; return true;
        case 'resp':
          if (!g.req || g.req.by === seat) return false;
          var rq = g.req; g.req = null;
          if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
          if (d.ok && rq.k === 'undo') {
            while (g.hist.length) { var h = g.hist.pop(); g.board = h.board; g.last = h.last; g.turn = h.turn; g.moves = h.moves; if (h.turn === rq.by) break; }
          }
          if (!d.ok) notify(rq.by, '對方不同意' + (rq.k === 'undo' ? '悔棋' : '和棋'));
          return true;
        case 'cancel':
          if (g.req && g.req.by === seat) { g.req = null; return true; } return false;
        case 'resign':
          g.req = null;
          if (g.np === 2) g.res = { w: 1 - seat, why: 'resign' }; else { notify(seat, '你已經認輸，可以繼續觀看其他人下棋'); knockOut(g, seat, 'resign'); }
          return true;
      }
      return false;
    },
    botTurn: function (g, seat, level) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      if (g.req && g.req.by !== seat) return { t: 'resp', ok: g.req.k === 'undo' ? true : CCK.left(g.board, g.np, seat) >= CCK.left(g.board, g.np, g.req.by) };
      if (g.req || g.turn !== seat) return null;
      var m = CCK.pick(g.board, g.np, seat, level); if (!m) return null;
      return { t: 'move', from: m[0], to: m[1], n: g.hist.length };
    },
    hintDesc: '會亮出「走了以後最靠近終點」的彈珠，也就是可以跳得最遠、或可以連續跳的彈珠，不會直接告訴你要走到哪裡。',
    tipDesc: '發呆太久時，提醒你怎麼走彈珠（點自己的彈珠，會出現白點，再點白點）。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var base = CCK.score(g.board, g.np, seat), best = {}, multi = {}, movers = {}, any = false;
      CCK.allMoves(g.board, seat, g.np).forEach(function (m) {
        any = true; movers[m[0]] = 1; var gain = base - CCK.score(CCK.move(g.board, m[0], m[1]), g.np, seat);
        if (gain > (best[m[0]] || 0)) best[m[0]] = gain;
        if (m[2].length > 2) multi[m[0]] = 1;
      });
      if (!any) return null;
      var arr = Object.keys(best).map(function (k) { return { i: +k, g: best[k] }; }).sort(function (a, b) { return b.g - a.g; });
      if (!arr.length) return { msg: '現在每一顆彈珠都只能橫著或往旁邊挪。可以想想怎麼先讓後面的彈珠跟上來。', hl: Object.keys(movers).map(Number).slice(0, 6) };
      var top = arr.filter(function (x) { return x.g >= arr[0].g - 1; }).slice(0, 3).map(function (x) { return x.i; });
      var jump = top.some(function (i) { return multi[i]; });
      return { msg: jump ? '亮黃框的彈珠可以「連續跳」，一次往終點前進很多格！' : '亮黃框的彈珠走了以後，離對面的終點最近。', hl: top };
    },
    nudge: function (g, seat) {
      if (g.res) return null;
      if (g.req && g.req.by !== seat) return '對方提出了' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，請在畫面上選「同意」或「不同意」。';
      if (g.turn !== seat || g.req) return null;
      return '輪到你了：先點一顆自己的彈珠，會出現白點（可以走到的地方），再點白點就會走過去。可以連續跳過旁邊的棋子喔！';
    },
    hostView: function (g) { return CCK.svg(g.board, { n: g.np, path: g.last }); },
    hostStatus: function (g) {
      if (g.req) return { t: NAMES[g.req.by] + '提出' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，等待回覆', c: 'hot' };
      var left = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) left.push(NAMES[s].charAt(0) + ' 剩 ' + CCK.left(g.board, g.np, s));
      return { t: '輪到' + NAMES[g.turn] + '・' + left.join('、'), c: '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, dests: {}, pending: null, round: -1, cnt: -1, anim: false };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; L.sel = -1; L.dests = {}; }
    if (L.pending && v.cnt !== L.pending.n) L.pending = null;
    if (L.cnt >= 0 && v.cnt > L.cnt && v.last) {
      var mine = v.board[v.last[v.last.length - 1]] === String(tb.seat);
      if (!mine) { fx.snd(v.last.length > 2 || !adjacent(v.last) ? 'cap' : 'move'); if (!tb.res && v.turn === tb.seat) setTimeout(function () { fx.snd('turn'); }, 350); }
      L.anim = !mine;
    } else if (L.cnt >= 0 && v.cnt < L.cnt) fx.toast('已經悔棋');
    L.cnt = v.cnt;
    if (tb.res || v.turn !== tb.seat) { L.sel = -1; L.dests = {}; }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + NAMES[tb.seat] + (tb.seat === 0 ? '（先下）' : ''));
  };
  function adjacent(path) { var a = CCK.CELLS[path[0]], b = CCK.CELLS[path[1]]; return path.length === 2 && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) === 2; }
  setInterval(function () {
    var P = L.pending; if (!P || !mod._ctx) return;
    if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('move', { from: P.from, to: P.to, n: P.n }); }
  }, 800);
  function bar(i, isMe, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === i, out = v.out.indexOf(i) >= 0;
    var w = el('div', 'ck-who' + (turn ? ' turn' : '') + (out ? ' out' : '')); w.setAttribute('data-seat', i);
    var m = el('span', 'ck-marble'); m.style.background = 'radial-gradient(circle at 35% 30%, #fff, ' + CCK.COLORS[i] + ' 40%, ' + CCK.COLORS[i] + ')'; w.appendChild(m);
    w.appendChild(el('span', 'n', info.name + (isMe && info.name !== '我' ? '・我' : '')));
    if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
    w.appendChild(el('span', 'tag left', out ? '已認輸' : '還差 ' + v.left[i] + ' 顆'));
    if (turn) w.appendChild(el('span', 'tag now', '下棋中'));
    return w;
  }
  mod.render = function (box, ctx) {
    mod._ctx = ctx;
    var tb = ctx.tb, v = tb.view, seat = tb.seat, P = L.pending, out = v.out.indexOf(seat) >= 0;
    var board = P ? CCK.move(v.board, P.from, P.to) : v.board, myTurn = !tb.res && v.turn === seat && !P && !v.req && !out;
    var wrap = el('div', 'ck-table');
    var st = el('div', 'ck-status');
    if (tb.res) st.textContent = '對局結束';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (P) st.textContent = '移動中…';
    else if (v.req) st.textContent = '等待回覆…';
    else if (v.turn === seat) { st.textContent = L.sel >= 0 ? '點綠點移動，或換一顆棋子' : '輪到你了，點一顆自己的彈珠'; st.className = 'ck-status me'; }
    else st.textContent = '等' + NAMES[v.turn] + '思考…';
    wrap.appendChild(st);
    var others = el('div', 'ck-others'); for (var i = 0; i < v.np; i++) if (i !== seat) others.appendChild(bar(i, false, v, tb));
    wrap.appendChild(others);
    var bx = el('div', 'ck-board'), bin = el('div');
    bin.innerHTML = CCK.svg(board, { hint: myTurn && ctx.hint && ctx.hint.hl, n: v.np, seat: seat, sel: L.sel, dots: Object.keys(L.dests).map(Number), path: P ? [P.from, P.to] : v.last, anim: L.anim || !!P });
    L.anim = false;
    bx.appendChild(BG.zoom('checkers', bin));
    bx.addEventListener('click', function (e) {
      if (!myTurn) return;
      var i = CCK.hit(bin.firstChild, e, v.np, seat); if (i < 0) return;
      if (L.sel >= 0 && L.dests[i]) {
        L.pending = { from: L.sel, to: i, n: v.cnt, at: Date.now() };
        ctx.snd(L.dests[i].length > 2 || !adjacent(L.dests[i]) ? 'cap' : 'move');
        ctx.send('move', { from: L.sel, to: i, n: v.cnt }); L.sel = -1; L.dests = {}; ctx.rerender(); return;
      }
      if (v.board[i] === String(seat)) { L.sel = L.sel === i ? -1 : i; L.dests = L.sel >= 0 ? CCK.moves(v.board, i, v.np) : {}; if (L.sel >= 0 && !Object.keys(L.dests).length) { ctx.toast('這顆彈珠現在走不動'); ctx.snd('error'); } else ctx.snd('tap'); }
      else { L.sel = -1; L.dests = {}; }
      ctx.rerender();
    });
    wrap.appendChild(bx);
    wrap.appendChild(bar(seat, true, v, tb));
    if (v.req && !tb.res) {
      var rq = el('div', 'ck-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
      if (v.req.by === seat) { rq.appendChild(el('p', '', '已經提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('ck-btn', '取消', function () { ctx.send('cancel'); })); }
      else {
        rq.appendChild(el('p', '', NAMES[v.req.by] + '想要' + k + '，你同意嗎？'));
        var r = el('div', 'row c'); r.appendChild(ctx.button('ck-btn go', '同意', function () { ctx.send('resp', { ok: true }); })); r.appendChild(ctx.button('ck-btn no', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r);
      }
      wrap.appendChild(rq);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'ck-tools');
      if (ctx.canUndo) tools.appendChild(ctx.button('ck-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = !!v.req || !!P || v.cnt === 0;
      if (v.np === 2) tools.appendChild(ctx.button('ck-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
      tools.appendChild(ctx.button('ck-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
      tools.appendChild(ctx.emoteButton('ck-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('chinese-checkers', mod);
})();
