/* 奇雞連連（座位 0 = 橘雞先走，座位 1 = 藍雞） */
(function () {
  'use strict';
  var G = window.GBL, top = G.top;
  var REASONS = { line: '連成一直線', reveal: '搬起的雞露出了對手的三連', repeat: '同樣的局面出現三次，平手', limit: '走了太多步，平手', nomove: '有一方無路可走，平手', resign: '認輸', draw: '雙方同意和棋', teacher: '老師判和', left: '對手離開房間' };
  var NAME = ['橘雞', '藍雞'], COLS = ['#f7931e', '#29a9e1'], SZ = ['小', '中', '大'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  /* 膠囊雞：o 顏色（0 橘 1 藍），帶笑臉和頭頂羽毛 */
  var BODY = ['#f7931e', '#29a9e1'], SHADE = ['#d9740b', '#1b84b9'], FEATH = ['#2aa7df', '#f7931e'];
  function chickSVG(o) {
    return '<svg viewBox="-4 -16 108 160" xmlns="http://www.w3.org/2000/svg"><path d="M50 18 C40 8 36 -2 42 -12 C50 -4 56 6 50 18Z" fill="' + FEATH[o] + '"/><path d="M50 18 C56 8 62 2 70 0 C68 10 60 16 50 18Z" fill="' + FEATH[o] + '" opacity=".8"/>' +
      '<ellipse cx="6" cy="96" rx="9" ry="14" fill="' + SHADE[o] + '"/><ellipse cx="94" cy="96" rx="9" ry="14" fill="' + SHADE[o] + '"/>' +
      '<path d="M10 128 Q10 142 24 142 H76 Q90 142 90 128 V54 A40 40 0 0 0 10 54 Z" fill="' + BODY[o] + '"/>' +
      '<path d="M10 112 H90 V128 Q90 142 76 142 H24 Q10 142 10 128Z" fill="' + SHADE[o] + '" opacity=".35"/>' +
      '<ellipse cx="28" cy="40" rx="7" ry="13" fill="#fff" opacity=".28" transform="rotate(-18 28 40)"/>' +
      '<circle cx="35" cy="52" r="11" fill="#fff"/><circle cx="65" cy="52" r="11" fill="#fff"/><circle cx="37" cy="54" r="5.5" fill="#222"/><circle cx="63" cy="54" r="5.5" fill="#222"/><circle cx="39" cy="52" r="1.8" fill="#fff"/><circle cx="65" cy="52" r="1.8" fill="#fff"/>' +
      '<path d="M22 76 Q50 70 78 76 Q76 118 50 120 Q24 118 22 76Z" fill="#241a17"/><rect x="42" y="76" width="16" height="13" rx="2.5" fill="#fff"/><path d="M36 108 Q50 98 64 108 Q58 119 50 119 Q42 119 36 108Z" fill="#e9556b"/></svg>';
  }
  function pc(o, z, cls) { return '<div class="gb-p z' + z + (cls ? ' ' + cls : '') + '">' + chickSVG(o) + '</div>'; }

  var mod = {
    seats: 2,
    botSeats: [1, 1],
    botDelay: 1500,
    ver: 1,
    reasons: REASONS,
    levelDesc: ['隨便走，只會注意有沒有能直接贏', '會避開馬上輸的走法', '會想兩步，攻守都會', '會往後想三步，很難贏'],
    seatName: function (i) { return NAME[i]; },
    seatColor: function (i) { return COLS[i]; },
    opts: [
      { k: 'rule', label: '玩法：', list: [['strict', '嚴格版（預設）'], ['loose', '寬鬆版']], note: '嚴格版：搬起棋盤上的雞時，只要露出對手的三連，對手就直接獲勝。寬鬆版：搬起後可以補救，只要把這隻雞放下去蓋住對手那條線，遊戲就繼續。若蓋住後對手的線還在，就算輸。' },
      { k: 'mem', label: '被蓋住的雞：', list: [['mem', '純記憶（預設）'], ['mark', '顯示小標記'], ['peek', '限時偷看底下']], note: '純記憶：只看得到最上面的雞，要自己記住底下是誰。顯示小標記：格子角落會用小圖示顯示底下蓋了誰。限時偷看：每人每局 3 次，點一格看底下，時間到蓋回去，只有偷看的人看得到。' },
      { k: 'peeksec', label: '偷看時間：', list: [['3', '3 秒'], ['2', '2 秒'], ['5', '5 秒'], ['8', '8 秒']], note: '只有選「限時偷看底下」時才用到' }
    ],
    init: function (n, o) {
      o = o || {};
      return { st: G.newState(), strict: o.rule !== 'loose', mem: o.mem === 'mark' || o.mem === 'peek' ? o.mem : 'mem', peeksec: Math.max(2, Math.min(10, +o.peeksec || 3)),
        hist: [], last: null, win: null, res: null, req: null, n: 0, seen: {}, pk: null, pks: [0, 0], pkid: 0, cnt: 0 };
    },
    turnSeat: function (g) { return g.st.turn; },
    forfeit: function (g, seat) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
    view: function (g, seat) {
      var pk = g.pk && g.pk.s === seat ? { id: g.pk.id, i: g.pk.i, st: g.st.c[g.pk.i].map(function (x) { return [x.o, x.z]; }), sec: g.peeksec } : null;
      return {
        c: g.st.c.map(function (a) { var t = top(a); return { o: t ? t.o : -1, z: t ? t.z : -1, d: a.length, b: g.mem === 'mark' ? a.slice(0, -1).map(function (x) { return [x.o, x.z]; }) : null }; }),
        out: g.st.out, turn: g.st.turn, n: g.n, last: g.last, win: g.win, req: g.req, mem: g.mem, strict: g.strict, peeksec: g.peeksec, pkLeft: 3 - g.pks[seat], pk: pk, cnt: g.cnt
      };
    },
    act: function (g, seat, d, notify) {
      if (g.res) return false;
      switch (d.t) {
        case 'place': case 'move':
          if (g.st.turn !== seat || d.n !== g.n || typeof d.to !== 'number') return false;
          var m = d.t === 'place' ? { z: d.z, f: -1, to: d.to } : { f: d.f, to: d.to };
          var ok = G.moves(g.st, seat).filter(function (x) { return x.f === m.f && x.to === m.to && (m.f >= 0 || x.z === m.z); })[0];
          if (!ok) return false;
          g.hist.push(JSON.parse(JSON.stringify({ st: g.st, last: g.last, seen: g.seen, n: g.n })));
          var r = G.apply(g.st, ok, g.strict);
          g.last = { z: ok.z, f: ok.f, to: r.w !== null && r.why === 'reveal' && ok.f >= 0 && g.strict ? -1 : ok.to, o: seat };
          g.st = r.s; g.n++; g.req = null; g.pk = null; g.cnt++;
          if (r.w !== null) { g.res = { w: r.w, why: r.why }; g.win = r.win || null; return true; }
          var k = G.key(g.st); g.seen[k] = (g.seen[k] || 0) + 1;
          if (g.seen[k] >= 3) g.res = { w: -1, why: 'repeat' };
          else if (g.n >= 150) g.res = { w: -1, why: 'limit' };
          else if (!G.moves(g.st, g.st.turn).length) g.res = { w: -1, why: 'nomove' };
          return true;
        case 'peek':
          if (g.mem !== 'peek' || g.st.turn !== seat || g.pks[seat] >= 3 || typeof d.i !== 'number' || !g.st.c[d.i] || g.st.c[d.i].length < 2) return false;
          g.pks[seat]++; g.pk = { s: seat, i: d.i, id: ++g.pkid }; g.cnt++; return true;
        case 'req':
          if (g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
          if (d.k === 'undo' && g.hist.length < (g.st.turn === seat ? 2 : 1)) return false;
          g.req = { k: d.k, by: seat }; return true;
        case 'resp':
          if (!g.req || g.req.by === seat) return false;
          var rq = g.req; g.req = null;
          if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
          if (d.ok && rq.k === 'undo') {
            var pops = g.st.turn === rq.by ? 2 : 1, sn = null;
            while (pops-- && g.hist.length) sn = g.hist.pop();
            if (sn) { g.st = sn.st; g.last = sn.last; g.seen = sn.seen; g.n = sn.n; g.win = null; g.pk = null; g.cnt++; }
          }
          if (!d.ok) notify(1 - seat, '對方不同意' + (rq.k === 'undo' ? '悔棋' : '和棋'));
          return true;
        case 'cancel':
          if (g.req && g.req.by === seat) { g.req = null; return true; } return false;
        case 'resign':
          g.res = { w: 1 - seat, why: 'resign' }; g.req = null; return true;
      }
      return false;
    },
    botTurn: function (g, seat, lv) {
      if (g.res) return null;
      if (g.req && g.req.by !== seat) return { t: 'resp', ok: g.req.k === 'undo' ? true : G.evalS(g.st, seat) < 0 };
      if (g.req || g.st.turn !== seat) return null;
      var m = G.pick(g.st, lv, g.strict); if (!m) return null;
      return m.f >= 0 ? { t: 'move', f: m.f, to: m.to, n: g.n } : { t: 'place', z: m.z, to: m.to, n: g.n };
    },
    hintDesc: '用閃亮的黃框標出「這一步值得考慮」的雞和格子：能直接連成三子、必須擋住對手，或對你比較有利的走法。',
    tipDesc: '發呆太久時，提醒你怎麼走（先點雞，再點格子）。',
    hint: function (g, seat) {
      if (g.res || g.st.turn !== seat) return null;
      var l = G.scored(g.st, 2, g.strict); if (!l.length) return null;
      var b = l[0], m = b.m, hl = [m.f >= 0 ? 'c' + m.f : 't' + m.z, 'c' + m.to];
      var msg = b.v >= 1900 ? '你可以直接連成三子！亮黃框的雞和格子就是。' : '這一步比較有利：把亮黃框的雞，放到亮黃框的格子。';
      return { msg: msg, hl: hl };
    },
    nudge: function (g, seat) {
      if (g.res) return null;
      if (g.req && g.req.by !== seat) return '對方提出了' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，請在畫面上選「同意」或「不同意」。';
      if (g.st.turn !== seat || g.req) return null;
      return '輪到你了：先點一隻雞（下面還沒放的，或棋盤上你自己最上面的），再點要放的格子，大雞可以蓋住小雞。';
    },
    hostView: function (g) {
      var s = '<svg viewBox="0 0 150 150" style="width:100%;max-width:240px"><rect width="150" height="150" rx="10" fill="#f4f0e4"/>';
      s += '<rect x="48" y="6" width="6" height="138" fill="#7cb518"/><rect x="96" y="6" width="6" height="138" fill="#7cb518"/><rect x="6" y="48" width="138" height="6" fill="#d9381e"/><rect x="6" y="96" width="138" height="6" fill="#d9381e"/>';
      g.st.c.forEach(function (a, i) {
        var t = top(a); if (!t) return;
        var cx = 25 + (i % 3) * 50, cy = 25 + Math.floor(i / 3) * 50, r = [7, 11, 16][t.z];
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + COLS[t.o] + '" stroke="#333" stroke-width="1.5"/>';
        if (a.length > 1) s += '<text x="' + (cx + 15) + '" y="' + (cy + 18) + '" font-size="12" fill="#555">×' + a.length + '</text>';
      });
      return s + '</svg>';
    },
    hostStatus: function (g) {
      if (g.req) return { t: NAME[g.req.by] + '提出' + (g.req.k === 'undo' ? '悔棋' : '和棋') + '，等待回覆', c: 'hot' };
      return { t: '第 ' + (g.n + 1) + ' 手・輪到' + NAME[g.st.turn], c: '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { round: -1, lastN: -1, sel: null, to: null, sent: -1, rects: {}, anim: null, pkKey: '', pkAt: 0, peekMode: false };
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.sel = null; L.to = null; L.sent = -1; L.rects = {}; L.peekMode = false; }
    if (L.lastN >= 0 && v.n > L.lastN && v.last) {
      L.anim = v.last; L.sel = null; L.to = null;
      if (v.last.o !== tb.seat) { fx.snd('move'); if (!tb.res) setTimeout(function () { fx.snd('turn'); }, 900); }
    } else if (L.lastN >= 0 && v.n < L.lastN) { fx.toast('已經悔棋'); L.sel = null; L.to = null; }
    L.lastN = v.n;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + NAME[tb.seat] + (tb.seat === 0 ? '（先走）' : ''));
  };
  mod.onReject = function () { L.sent = -1; };

  function legal(v, sel) {
    var r = [], z = sel.z != null ? sel.z : (v.c[sel.f] ? v.c[sel.f].z : -1);
    for (var i = 0; i < 9; i++) { if (sel.f != null && i === sel.f) continue; if (z > v.c[i].z) r.push(i); }
    return r;
  }
  function trayHTML(v, o, mine, sel) {
    var h = '<div class="gb-tray' + (mine ? ' mine' : '') + '">';
    for (var z = 2; z >= 0; z--) {
      h += '<div class="gb-grp" data-tray="' + o + z + '">';
      for (var k = 0; k < 2; k++) {
        if (k < v.out[o][z]) h += '<button type="button" class="gb-tp z' + z + (mine && sel && sel.z === z && k === 0 ? ' sel' : '') + '"' + (mine ? ' data-z="' + z + '" data-h="t' + z + '"' : ' disabled') + '>' + chickSVG(o) + '</button>';
        else h += '<span class="gb-tp z' + z + ' gone"></span>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function who(i, isMe, v, tb) {
    var info = tb.seats[i], turn = !tb.res && v.turn === i;
    var w = el('div', 'gb-who' + (turn ? ' turn' : '')); w.setAttribute('data-seat', i);
    var dot = el('span', 'gb-dot'); dot.style.background = COLS[i]; w.appendChild(dot);
    w.appendChild(el('span', 'n', info.name + (isMe && info.name !== '我' ? '・我' : '')));
    if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
    w.appendChild(el('span', 'tag' + (turn ? ' now' : ''), turn ? '走棋中' : NAME[i]));
    return w;
  }
  function rel(e, w) { var a = e.getBoundingClientRect(), b = w.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height }; }
  function saveRects(wrap) {
    var m = {};
    [].forEach.call(wrap.querySelectorAll('[data-tray]'), function (n) { m['T' + n.getAttribute('data-tray')] = rel(n, wrap); });
    [].forEach.call(wrap.querySelectorAll('[data-cell]'), function (n) { m['C' + n.getAttribute('data-cell')] = rel(n, wrap); });
    L.rects = m;
  }
  function runAnim(wrap, A) {
    var dst = wrap.querySelector('[data-cell="' + A.to + '"] .gb-p.topp'); if (!dst) return;
    var src = A.f >= 0 ? L.rects['C' + A.f] : L.rects['T' + A.o + A.z];
    dst.classList.remove('gb-hide');
    if (!src || !dst.animate) return;
    var d = rel(dst, wrap), z = parseFloat(wrap.style.zoom) || 1;
    var dx = (src.x + src.w / 2 - (d.x + d.w / 2)) / z, dy = (src.y + src.h / 2 - (d.y + d.h / 2)) / z;
    dst.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.1)', zIndex: 9 }, { transform: 'translate(' + (dx * .35) + 'px,' + (dy * .35 - 22) + 'px) scale(1.18)', offset: .55, zIndex: 9 }, { transform: 'none', zIndex: 9 }], { duration: 1000, easing: 'ease-in-out' });
  }

  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, myTurn = !tb.res && v.turn === seat && !v.req && L.sent !== v.n;
    var now = Date.now(), A = L.anim; L.anim = null;
    if (v.pk && L.pkKey !== tb.round + ':' + v.pk.id) { L.pkKey = tb.round + ':' + v.pk.id; L.pkAt = now; }
    var pkLeft = v.pk ? v.pk.sec * 1000 - (now - L.pkAt) : 0;
    if (pkLeft > 0) setTimeout(function () { ctx.rerender(); }, Math.min(pkLeft + 40, 500));
    var sel = myTurn ? L.sel : null, targets = sel ? legal(v, sel) : [];
    var wrap = el('div', 'gb-table');
    var st = el('div', 'gb-status');
    if (tb.res) st.textContent = '對局結束';
    else if (v.req) st.textContent = '等待回覆…';
    else if (v.turn === seat) {
      st.className = 'gb-status me';
      st.textContent = L.peekMode ? '點一格疊了雞的格子，偷看底下' : !sel ? '輪到你了：先點一隻雞' : L.to == null ? '再點要放的格子' : '再點一下同一格，就會走棋';
    } else st.textContent = '等對方思考…';
    wrap.appendChild(st);
    var ow = who(1 - seat, false, v, tb); wrap.appendChild(ow);
    var ot = el('div'); ot.innerHTML = trayHTML(v, 1 - seat, false, null); wrap.appendChild(ot.firstChild);

    var bx = el('div', 'gb-board');
    var bd = el('div', 'gb-bd'), h = '<i class="gb-bar v1"></i><i class="gb-bar v2"></i><i class="gb-bar h1"></i><i class="gb-bar h2"></i>';
    for (var i = 0; i < 9; i++) {
      var c = v.c[i], isT = targets.indexOf(i) >= 0, inWin = v.win && v.win.indexOf(i) >= 0;
      var cls = 'gb-cell' + (isT ? ' tg' : '') + (L.to === i && sel ? ' to' : '') + (inWin ? ' win' : '') + (sel && sel.f === i ? ' from' : '');
      h += '<div class="' + cls + '" data-cell="' + i + '" data-h="c' + i + '" style="grid-row:' + (Math.floor(i / 3) + 1) + ';grid-column:' + (i % 3 + 1) + '">';
      if (c.o >= 0) {
        var hide = A && A.to === i && A.z === c.z && A.o === c.o;
        h += pc(c.o, c.z, 'topp' + (c.o === seat ? ' mine' : '') + (hide ? ' gb-hide' : ''));
      }
      if (L.to === i && sel) h += pc(seat, sel.z != null ? sel.z : v.c[sel.f].z, 'ghost');
      if (c.d > 1 && c.b) h += '<span class="gb-bury">' + c.b.map(function (x) { return '<b class="s' + x[1] + '" style="background:' + COLS[x[0]] + '"></b>'; }).join('') + '</span>';
      if (c.d > 1 && !c.b && v.mem === 'peek') h += '<span class="gb-cnt">' + c.d + '</span>';
      if (v.pk && v.pk.i === i && pkLeft > 0) h += '<div class="gb-peek"><small>左邊是最上面 → 右邊是最底下</small>' + v.pk.st.map(function (x) { return '<b class="s' + x[1] + '" style="background:' + COLS[x[0]] + '"><em>' + SZ[x[1]] + '</em></b>'; }).reverse().join('') + '</div>';
      if (v.last && v.last.to === i && !tb.res) h += '<span class="gb-last"></span>';
      h += '</div>';
    }
    bd.innerHTML = h; bx.appendChild(BG.zoom('gobblet', bd)); wrap.appendChild(bx);

    function commit(to) {
      L.sent = v.n; ctx.snd('move');
      if (sel.z != null) ctx.send('place', { z: sel.z, to: to, n: v.n }); else ctx.send('move', { f: sel.f, to: to, n: v.n });
      L.to = null; ctx.rerender();
    }
    bx.addEventListener('click', function (e) {
      var cell = e.target.closest && e.target.closest('[data-cell]'); if (!cell || !myTurn) return;
      var i = +cell.getAttribute('data-cell'), c = v.c[i];
      if (L.peekMode) {
        if (c.d >= 2) { L.peekMode = false; ctx.send('peek', { i: i }); } else ctx.snd('error');
        return;
      }
      if (sel && targets.indexOf(i) >= 0) { if (L.to === i) return commit(i); L.to = i; ctx.snd('tap'); return ctx.rerender(); }
      if (c.o === seat) { if (sel && sel.f === i) L.sel = null; else L.sel = { f: i }; L.to = null; ctx.snd('tap'); return ctx.rerender(); }
      ctx.snd('error');
    });
    var mt = el('div'); mt.innerHTML = trayHTML(v, seat, true, sel); var tray = mt.firstChild;
    tray.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-z]'); if (!b || !myTurn) return;
      var z = +b.getAttribute('data-z'); L.peekMode = false;
      L.sel = sel && sel.z === z ? null : { z: z }; L.to = null; ctx.snd('tap'); ctx.rerender();
    });
    wrap.appendChild(tray);
    wrap.appendChild(who(seat, true, v, tb));
    if (myTurn && sel) {
      var cf = el('div', 'gb-confirm');
      var ok = ctx.button('gb-btn go', '✔ 確定走棋', function () { if (L.to != null) commit(L.to); }); ok.disabled = L.to == null; cf.appendChild(ok);
      cf.appendChild(ctx.button('gb-btn', '取消', function () { L.sel = null; L.to = null; ctx.rerender(); }));
      wrap.appendChild(cf);
    }
    if (v.req && !tb.res) {
      var rq = el('div', 'gb-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
      if (v.req.by === seat) { rq.appendChild(el('p', '', '已經提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('gb-btn', '取消', function () { ctx.send('cancel'); })); }
      else {
        rq.appendChild(el('p', '', '對方想要' + k + '，你同意嗎？'));
        var r = el('div', 'row c'); r.appendChild(ctx.button('gb-btn go', '同意', function () { ctx.send('resp', { ok: true }); })); r.appendChild(ctx.button('gb-btn no', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r);
      }
      wrap.appendChild(rq);
    }
    if (!tb.res) {
      var tools = el('div', 'gb-tools');
      if (v.mem === 'peek') { var pb = ctx.button('gb-btn' + (L.peekMode ? ' on' : ''), '👁 看底下（剩 ' + v.pkLeft + ' 次）', function () { L.peekMode = !L.peekMode; L.sel = null; L.to = null; ctx.rerender(); }); pb.disabled = !myTurn || v.pkLeft <= 0; tools.appendChild(pb); }
      if (ctx.canUndo) tools.appendChild(ctx.button('gb-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = v.n < (v.turn === seat ? 2 : 1) || !!v.req;
      tools.appendChild(ctx.button('gb-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
      tools.appendChild(ctx.button('gb-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
      tools.appendChild(ctx.emoteButton('gb-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
    setTimeout(function () { if (!wrap.isConnected) { return; } if (A) runAnim(wrap, A); setTimeout(function () { if (wrap.isConnected) saveRects(wrap); }, A ? 1050 : 0); }, 120);
    setTimeout(function () { if (wrap.isConnected && !A) saveRects(wrap); }, 700);
  };
  mod.chick = chickSVG;
  BG.register('gobblet', mod);
})();
