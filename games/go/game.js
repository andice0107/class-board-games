/* 圍棋模組（座位 0 = 黑棋先下，座位 1 = 白棋）。9 路和 13 路兩個版本。
   雙方連續虛手後進入「確認死子」：系統先自動判斷，雙方可以點棋串修正，兩邊都按確認就數子算勝負（中國規則，貼 7.5 目）。 */
(function () {
  'use strict';
  var KOMI = 7.5;
  var REASONS = { score: '數子決定勝負', resign: '認輸', draw: '雙方同意和棋', teacher: '老師判和', left: '對手離開房間' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function make(gid, N) {
    function snap(g) { return { b: g.b, ko: g.ko, caps: g.caps.slice(), last: g.last, passes: g.passes, turn: g.turn }; }
    function enterMark(g) { g.phase = 'mark'; g.dead = GO.estimateDead(g.b, N, g.turn, N === 9 ? 60 : 40); g.conf = [false, false]; }
    function finish(g) {
      var s = GO.score(g.b, N, g.dead, KOMI); g.final = s;
      g.res = { w: s.black > s.white ? 0 : 1, why: 'score', note: '黑 ' + s.black + ' 子，白 ' + (s.white - KOMI) + ' 子＋貼 ' + KOMI + ' ＝ ' + s.white + '；' + (s.black > s.white ? '黑棋' : '白棋') + '贏 ' + Math.abs(s.black - s.white) + ' 子' };
    }
    var mod = {
      seats: 2, botSeats: [1, 1], ver: 1, botDelay: 400,
      reasons: REASONS,
      levelDesc: ['隨便下，不太會吃子', '會吃子、會逃，但看不遠', '會用模擬算地盤', '模擬次數更多，下得更穩'],
      seatName: function (i) { return i === 0 ? '黑棋' : '白棋'; },
      seatColor: function (i) { return i === 0 ? '#1d1d1d' : '#f1efe8'; },
      init: function () { return { b: GO.empty(N), turn: 1, ko: -1, caps: [0, 0], last: -1, passes: 0, hist: [], phase: 'play', dead: {}, conf: [false, false], res: null, req: null }; },
      turnSeat: function (g) { return g.phase === 'play' ? g.turn - 1 : -1; },
      forfeit: function (g, seat) { g.res = { w: 1 - seat, why: 'left' }; g.req = null; },
      teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.req = null; },
      view: function (g) { return { b: g.b, n: N, turn: g.turn, mv: g.hist.length, last: g.last, caps: g.caps, passes: g.passes, ko: g.ko, phase: g.phase, dead: g.dead, conf: g.conf, req: g.req, final: g.final || null, est: g.phase === 'mark' ? GO.score(g.b, N, g.dead, KOMI) : null }; },
      act: function (g, seat, d, notify) {
        var me = seat + 1;
        if (g.res) return false;
        switch (d.t) {
          case 'move':
            if (g.phase !== 'play' || g.turn !== me || d.n !== g.hist.length || g.req) return false;
            var r = GO.play(g.b, N, d.i, me, g.ko); if (!r) return false;
            g.hist.push(snap(g)); g.b = r.b; g.ko = r.ko; g.caps[seat] += r.caps; g.last = d.i; g.passes = 0; g.turn = 3 - me;
            if (g.hist.length > N * N * 3) enterMark(g);
            return true;
          case 'pass':
            if (g.phase !== 'play' || g.turn !== me || d.n !== g.hist.length || g.req) return false;
            g.hist.push(snap(g)); g.passes++; g.ko = -1; g.last = -1; g.turn = 3 - me;
            if (g.passes >= 2) enterMark(g);
            return true;
          case 'mark':
            if (g.phase !== 'mark' || !g.b[d.i]) return false;
            var grp = GO.group(g.b, N, d.i), on = !g.dead[d.i];
            grp.stones.forEach(function (s) { if (on) g.dead[s] = true; else delete g.dead[s]; });
            g.conf = [false, false]; return true;
          case 'confirm':
            if (g.phase !== 'mark' || g.conf[seat]) return false;
            g.conf[seat] = true; if (g.conf[0] && g.conf[1]) finish(g); return true;
          case 'resume':
            if (g.phase !== 'mark') return false;
            g.phase = 'play'; g.passes = 0; g.dead = {}; notify(1 - seat, '對方想繼續下，回到對局'); return true;
          case 'req':
            if (g.phase !== 'play' || g.req || (d.k !== 'undo' && d.k !== 'draw')) return false;
            if (d.k === 'undo' && g.hist.length < (me === 1 ? 1 : 2)) return false;
            g.req = { k: d.k, by: me }; return true;
          case 'resp':
            if (!g.req || g.req.by === me) return false;
            var rq = g.req; g.req = null;
            if (d.ok && rq.k === 'draw') g.res = { w: -1, why: 'draw' };
            if (d.ok && rq.k === 'undo') { var pops = g.turn === rq.by ? 2 : 1; while (pops-- && g.hist.length) { var h = g.hist.pop(); g.b = h.b; g.ko = h.ko; g.caps = h.caps; g.last = h.last; g.passes = h.passes; g.turn = h.turn; } }
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
        var me = seat + 1;
        if (g.res) return null;
        if (g.req && g.req.by !== me) return { t: 'resp', ok: g.req.k === 'undo' };
        if (g.phase === 'mark') return g.conf[seat] ? null : { t: 'confirm' };
        if (g.req || g.turn !== me) return null;
        var i = GO.pick(g.b, N, me, g.ko, level, g.passes > 0, KOMI);
        return i < 0 ? { t: 'pass', n: g.hist.length } : { t: 'move', i: i, n: g.hist.length };
      },
      hostView: function (g) { return GO.svg(g.b, N, { last: g.last, dead: g.phase === 'mark' || g.res ? g.dead : null, terr: g.phase === 'mark' ? GO.score(g.b, N, g.dead, KOMI).terr : g.final ? g.final.terr : null }); },
      hostStatus: function (g) {
        if (g.phase === 'mark') return { t: '雙方虛手，正在確認死子', c: 'hot' };
        return { t: '第 ' + (g.hist.length + 1) + ' 手・輪到' + (g.turn === 1 ? '黑棋' : '白棋') + '・提子 黑' + g.caps[0] + ' 白' + g.caps[1], c: '' };
      }
    };

    /* ---------- 學生端 ---------- */
    var L = { ghost: null, pending: null, round: -1, lastN: -1, anim: -1 };
    mod.onUpdate = function (prev, tb, fx) {
      var v = tb.view, my = tb.seat + 1;
      if (L.round !== tb.round) { L.round = tb.round; L.lastN = -1; L.pending = null; L.ghost = null; }
      if (L.pending && v.mv !== L.pending.n) L.pending = null;
      if (L.lastN >= 0 && v.mv > L.lastN) {
        var mine = v.turn !== my;
        if (!mine) { if (v.last >= 0) fx.snd('move'); else fx.toast('對方虛手（不下）' + (v.passes >= 1 && v.phase === 'play' ? '，你也虛手就結束對局' : '')); if (!tb.res && v.phase === 'play') setTimeout(function () { fx.snd('turn'); }, 350); }
        L.anim = mine ? -1 : v.last;
        if (prev && prev.view && prev.view.caps && v.caps[tb.seat] > prev.view.caps[tb.seat]) { fx.snd('cap'); fx.toast('提子！吃掉 ' + (v.caps[tb.seat] - prev.view.caps[tb.seat]) + ' 顆'); }
        if (prev && prev.view && prev.view.caps && v.caps[1 - tb.seat] > prev.view.caps[1 - tb.seat]) { fx.snd('cap'); fx.toast('被提了 ' + (v.caps[1 - tb.seat] - prev.view.caps[1 - tb.seat]) + ' 顆子'); }
      } else if (L.lastN >= 0 && v.mv < L.lastN) fx.toast('已經悔棋');
      if (prev && prev.view && prev.view.phase === 'play' && v.phase === 'mark') { fx.snd('check'); fx.toast('雙方都虛手，來確認哪些是死子'); }
      L.lastN = v.mv;
      if (L.ghost != null && v.b[L.ghost]) L.ghost = null;
      if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '配對成功！') + '你是' + (tb.seat === 0 ? '黑棋（先下）' : '白棋'));
    };
    setInterval(function () { var P = L.pending; if (!P || !mod._ctx) return; if (Date.now() - P.at > 2500) { P.at = Date.now(); mod._ctx.send('move', { i: P.i, n: P.n }); } }, 800);
    function bar(i, isMe, v, tb) {
      var info = tb.seats[i], turn = !tb.res && v.phase === 'play' && v.turn === i + 1;
      var w = el('div', 'go-who' + (turn ? ' turn' : ''));
      w.appendChild(el('span', 'go-stone ' + (i === 0 ? 'b' : 'w')));
      w.appendChild(el('span', 'n', info.name + (isMe && info.name !== '我' ? '・我' : '')));
      if (!isMe && !info.bot) { w.appendChild(el('span', 'dot ' + (info.on ? 'on' : 'off'))); if (!info.on) w.appendChild(el('span', 'tag', info.gone ? '已離開' : '離線')); }
      w.appendChild(el('span', 'tag', '提 ' + v.caps[i]));
      w.appendChild(el('span', 'tag' + (turn ? ' now' : ''), v.phase === 'mark' ? (v.conf[i] ? '已確認' : '確認中') : turn ? '下棋中' : mod.seatName(i)));
      return w;
    }
    mod.render = function (box, ctx) {
      mod._ctx = ctx;
      var tb = ctx.tb, v = tb.view, seat = tb.seat, my = seat + 1, P = L.pending, mark = v.phase === 'mark' && !tb.res;
      var board = v.b; if (P) { var pr = GO.play(v.b, N, P.i, my, v.ko); if (pr) board = pr.b; }
      var myTurn = !tb.res && v.phase === 'play' && v.turn === my && !P && !v.req;
      var wrap = el('div', 'go-table');
      var st = el('div', 'go-status');
      if (tb.res) st.textContent = '對局結束';
      else if (mark) { st.textContent = v.conf[seat] ? '已確認，等對方確認…' : '打 ✕ 的是死子。不對的話點棋串修改，然後按「確認結果」'; st.className = 'go-status me'; }
      else if (P) st.textContent = '落子中…';
      else if (v.req) st.textContent = '等待回覆…';
      else if (myTurn) { st.textContent = L.ghost != null ? '再點一下就落子' : (v.passes ? '對方虛手了。你也虛手就結束，或繼續下' : '輪到你了，點一個交叉點'); st.className = 'go-status me'; }
      else st.textContent = '等對方思考…';
      wrap.appendChild(st);
      wrap.appendChild(bar(1 - seat, false, v, tb));
      var bx = el('div', 'go-board'), bin = el('div');
      var showTerr = mark || (tb.res && v.final);
      bin.innerHTML = GO.svg(board, N, { last: P ? P.i : v.last, anim: P ? P.i : L.anim, ghost: myTurn ? L.ghost : null, ghostColor: my, dead: mark || (tb.res && v.final) ? v.dead : null, terr: showTerr ? (mark ? v.est.terr : v.final.terr) : null });
      L.anim = -1;
      bx.appendChild(BG.zoom(gid, bin));
      function commit(i) { L.pending = { i: i, n: v.mv, at: Date.now() }; L.ghost = null; ctx.snd('move'); ctx.send('move', { i: i, n: v.mv }); ctx.rerender(); }
      bx.addEventListener('click', function (e) {
        var i = GO.hit(bin.firstChild, e, N); if (i < 0) return;
        if (mark) { if (v.b[i]) { ctx.snd('tap'); ctx.send('mark', { i: i }); } return; }
        if (!myTurn) return;
        if (v.b[i] || !GO.play(v.b, N, i, my, v.ko)) { ctx.snd('error'); ctx.toast(v.b[i] ? '這裡已經有棋子了' : i === v.ko ? '打劫：不能馬上提回來，先下別的地方' : '不能下在這裡（下了會沒有氣）'); return; }
        if (L.ghost === i) return commit(i);
        L.ghost = i; ctx.snd('tap'); ctx.rerender();
      });
      wrap.appendChild(bx);
      if (myTurn) {
        var cf = el('div', 'go-confirm');
        var ok = ctx.button('go-btn go', '✔ 確定落子', function () { if (L.ghost != null) commit(L.ghost); }); ok.disabled = L.ghost == null; cf.appendChild(ok);
        if (L.ghost != null) cf.appendChild(ctx.button('go-btn', '取消', function () { L.ghost = null; ctx.rerender(); }));
        cf.appendChild(ctx.button('go-btn', '✋ 虛手（不下）', function () { if (confirm(v.passes ? '對方已經虛手，你也虛手就會結束對局開始數子，確定嗎？' : '確定這一手不下嗎？')) { ctx.send('pass', { n: v.mv }); } }));
        wrap.appendChild(cf);
      }
      if (mark) {
        var mk = el('div', 'go-mark');
        mk.innerHTML = '<p>目前估計：黑 <b>' + v.est.black + '</b>　白 <b>' + v.est.white + '</b>（含貼 ' + KOMI + '）→ ' + (v.est.black > v.est.white ? '黑棋' : '白棋') + '領先</p>';
        var row = el('div', 'row c');
        var cb = ctx.button('go-btn go', v.conf[seat] ? '已確認' : '✔ 確認結果', function () { ctx.send('confirm', {}); }); cb.disabled = v.conf[seat]; row.appendChild(cb);
        row.appendChild(ctx.button('go-btn', '↩ 還沒下完，繼續下', function () { ctx.send('resume', {}); }));
        mk.appendChild(row); wrap.appendChild(mk);
      }
      if (tb.res && v.final) { var fr = el('div', 'go-mark'); fr.innerHTML = '<p>' + tb.res.note + '</p>'; wrap.appendChild(fr); }
      wrap.appendChild(bar(seat, true, v, tb));
      if (v.req && !tb.res) {
        var rq = el('div', 'go-req'), k = v.req.k === 'undo' ? '悔棋' : '和棋';
        if (v.req.by === my) { rq.appendChild(el('p', '', '已經提出' + k + '，等待回覆…')); rq.appendChild(ctx.button('go-btn', '取消', function () { ctx.send('cancel'); })); }
        else { rq.appendChild(el('p', '', '對方想要' + k + '，你同意嗎？')); var r2 = el('div', 'row c'); r2.appendChild(ctx.button('go-btn go', '同意', function () { ctx.send('resp', { ok: true }); })); r2.appendChild(ctx.button('go-btn', '不同意', function () { ctx.send('resp', { ok: false }); })); rq.appendChild(r2); }
        wrap.appendChild(rq);
      }
      if (!tb.res && !mark) {
        var tools = el('div', 'go-tools');
        if (ctx.canUndo) tools.appendChild(ctx.button('go-btn', '↩️ 悔棋', function () { ctx.send('req', { k: 'undo' }); })).disabled = v.mv < (my === 1 ? 1 : 2) || !!v.req || !!P;
        tools.appendChild(ctx.button('go-btn', '🤝 和棋', function () { ctx.send('req', { k: 'draw' }); })).disabled = !!v.req;
        tools.appendChild(ctx.button('go-btn', '🏳️ 認輸', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign'); }));
        tools.appendChild(ctx.emoteButton('go-btn'));
        wrap.appendChild(tools);
      }
      box.appendChild(wrap);
    };
    BG.register(gid, mod);
    return mod;
  }
  make('go', 9); make('go13', 13);
})();
