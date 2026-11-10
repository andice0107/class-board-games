/* 拉密模組：2～4 人，每人 14 張。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300'];
  var REASONS = { empty: '第一個把手上的牌全部放到桌上', pool: '牌堆抽完了，手上點數最少的人獲勝', tie: '牌堆抽完，點數一樣平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function next(g, s) { var t = s; do { t = (t + 1) % g.np; } while (g.out.indexOf(t) >= 0 && t !== s); return t; }
  function key(set) { return set.slice().sort(function (a, b) { return a - b; }).join(','); }
  /* 檢查玩家送來的新桌面是否合法；回傳錯誤訊息或 '' */
  function check(g, seat, table) {
    if (!Array.isArray(table)) return '格式錯誤';
    var before = {}, rack = {}, seen = {}, fromRack = [];
    g.table.forEach(function (s) { s.forEach(function (id) { before[id] = 1; }); });
    g.racks[seat].forEach(function (id) { rack[id] = 1; });
    for (var i = 0; i < table.length; i++) {
      var s = table[i]; if (!Array.isArray(s)) return '格式錯誤';
      for (var k = 0; k < s.length; k++) { var id = s[k]; if (seen[id]) return '有重複的牌'; seen[id] = 1; if (!before[id]) { if (!rack[id]) return '有不是你的牌'; fromRack.push(id); } }
      if (!RK.analyze(s).ok) return '桌上有不合法的組合';
    }
    if (Object.keys(before).some(function (id) { return !seen[id]; })) return '桌上原本的牌不能收回手上';
    if (!fromRack.length) return '至少要從手上放一張牌';
    if (!g.opened[seat]) {
      var oldKeys = {}; g.table.forEach(function (s) { oldKeys[key(s)] = (oldKeys[key(s)] || 0) + 1; });
      var sum = 0, rk = {}; fromRack.forEach(function (id) { rk[id] = 1; });
      for (var j = 0; j < table.length; j++) {
        var s2 = table[j], kk = key(s2);
        if (oldKeys[kk]) { oldKeys[kk]--; continue; }
        if (!s2.every(function (id) { return rk[id]; })) return '第一次出牌只能用自己的牌，不能動桌上的牌';
        sum += RK.analyze(s2).sum;
      }
      if (sum < 30) return '第一次出牌，點數加起來要 30 以上（現在 ' + sum + '）';
    }
    return '';
  }
  function endByPool(g) {
    var best = -1, bv = 1e9, tie = false;
    alive(g).forEach(function (s) { var v = RK.rackValue(g.racks[s]); if (v < bv) { bv = v; best = s; tie = false; } else if (v === bv) tie = true; });
    g.res = tie ? { w: -1, why: 'tie' } : { w: best, why: 'pool' };
  }
  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3], botDelay: 1200,
    reasons: REASONS,
    levelDesc: ['常常忘了出牌', '只會出自己湊好的組合', '會把牌接到桌上的組合', '找最多張的出法，很難贏'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n) {
      n = Math.max(2, Math.min(4, n || 4));
      var p = RK.pool(), racks = [], opened = [];
      for (var s = 0; s < n; s++) { racks.push(RK.sortRack(p.splice(0, 14))); opened.push(false); }
      return { np: n, pool: p, racks: racks, opened: opened, table: [], turn: Math.floor(Math.random() * n), out: [], passes: 0, cnt: 0, res: null, last: null };
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, rack: seat >= 0 ? g.racks[seat] : [], counts: g.racks.map(function (r) { return r.length; }), opened: g.opened, table: g.table, pool: g.pool.length,
        turn: g.turn, out: g.out, cnt: g.cnt, last: g.last, reveal: g.res ? g.racks.map(function (r) { return RK.rackValue(r); }) : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (g.turn !== seat || d.n !== g.cnt) return false;
      if (d.t === 'draw') {
        var got = null;
        if (g.pool.length) { got = g.pool.pop(); g.racks[seat].push(got); RK.sortRack(g.racks[seat]); g.passes = 0; }
        else g.passes++;
        g.cnt++; g.last = { k: 'draw', seat: seat, n: g.cnt, empty: got == null };
        if (!g.pool.length && g.passes >= alive(g).length) { endByPool(g); return true; }
        g.turn = next(g, seat); return true;
      }
      if (d.t === 'play') {
        var err = check(g, seat, d.table); if (err) { notify(seat, err); return false; }
        var on = {}; d.table.forEach(function (s) { s.forEach(function (id) { on[id] = 1; }); });
        var placed = g.racks[seat].filter(function (id) { return on[id]; });
        g.racks[seat] = g.racks[seat].filter(function (id) { return !on[id]; });
        g.table = d.table.map(function (s) { return RK.analyze(s).order; });
        g.opened[seat] = true; g.passes = 0; g.cnt++;
        g.last = { k: 'play', seat: seat, n: g.cnt, placed: placed };
        if (!g.racks[seat].length) { g.res = { w: seat, why: 'empty' }; return true; }
        g.turn = next(g, seat); return true;
      }
      return false;
    },
    botTurn: function (g, seat, level) {
      if (g.res || g.turn !== seat) return null;
      var t = RK.botPlay(g.table, g.racks[seat], g.opened[seat], level);
      if (t && !check(g, seat, t)) return { t: 'play', table: t, n: g.cnt };
      return { t: 'draw', n: g.cnt };
    },
    hostView: function (g) {
      var h = '<div class="rk-host"><div class="rk-host-tb">' + (g.table.length ? g.table.map(function (s) { return '<span class="rk-set">' + s.map(function (id) { return RK.tile(id); }).join('') + '</span>'; }).join('') : '<em>桌上還沒有牌</em>') + '</div><div class="pk-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="pk-hs' + (g.turn === s && !g.res ? ' turn' : '') + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.racks[s].length + ' 張' + (g.opened[s] ? '' : '・未開局')) + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '輪到第 ' + (g.turn + 1) + ' 位・牌堆剩 ' + g.pool.length + ' 張', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.pool = RK.shuffle(g.pool.concat(g.racks[seat])); g.racks[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) g.turn = next(g, seat);
  }

  /* ---------- 學生端：本回合的「工作桌面」 ---------- */
  var W = null, L = { round: -1, cnt: -1, pending: null, sortNum: false, err: '' };
  function resetWork(v) { W = { cnt: v.cnt, table: v.table.map(function (s) { return s.slice(); }), rack: v.rack.slice(), sel: [], orig: {} }; v.rack.forEach(function (id) { W.orig[id] = 1; }); }
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.cnt = -1; L.pending = null; W = null; }
    if (L.pending && v.cnt !== L.pending) L.pending = null;
    if (!W || W.cnt !== v.cnt) resetWork(v);
    var la = v.last;
    if (L.cnt >= 0 && la && la.n > L.cnt && la.seat !== tb.seat) {
      fx.snd(la.k === 'play' ? 'move' : 'tap');
      if (!tb.res && v.turn === tb.seat) setTimeout(function () { fx.snd('turn'); }, 350);
    }
    L.cnt = v.cnt;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開桌了！') + '每人 14 張');
  };
  function moveSel(target) { // target: 數字 = 桌上第幾組；'new' = 新的一組；'rack' = 收回手上
    var sel = W.sel.slice(); if (!sel.length) return;
    if (target === 'rack' && sel.some(function (id) { return !W.orig[id]; })) return '桌上原本的牌不能收回手上';
    W.table = W.table.map(function (s) { return s.filter(function (id) { return sel.indexOf(id) < 0; }); });
    W.rack = W.rack.filter(function (id) { return sel.indexOf(id) < 0; });
    if (target === 'rack') W.rack = W.rack.concat(sel);
    else if (target === 'new') W.table.push(sel);
    else W.table[target] = W.table[target].concat(sel);
    var keep = target === 'new' ? W.table[W.table.length - 1] : null;
    W.table = W.table.filter(function (s) { return s.length; });
    W.sel = [];
    return '';
  }
  function workState(v, seat) {
    var placed = Object.keys(W.orig).filter(function (id) { return W.rack.indexOf(+id) < 0; }).length;
    var bad = W.table.some(function (s) { return !RK.analyze(s).ok; });
    var newSum = 0;
    if (!v.opened[seat]) {
      var old = {}; v.table.forEach(function (s) { old[s.slice().sort().join()] = 1; });
      W.table.forEach(function (s) { if (!old[s.slice().sort().join()]) newSum += RK.analyze(s).ok ? RK.analyze(s).sum : 0; });
    }
    return { placed: placed, bad: bad, newSum: newSum, ok: placed > 0 && !bad && (v.opened[seat] || newSum >= 30) };
  }
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0;
    if (!W || W.cnt !== v.cnt) resetWork(v);
    var myTurn = !tb.res && v.turn === seat && !L.pending && !out;
    var ws = workState(v, seat), table = myTurn ? W.table : v.table, rack = myTurn ? W.rack : v.rack;
    var wrap = el('div', 'rk-table');
    var st = el('div', 'rk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (L.pending) st.textContent = '送出中…';
    else if (myTurn) { st.textContent = W.sel.length ? '再點桌上的一組，或「＋新的一組」' : (v.opened[seat] ? '點牌選起來，移到桌上；或抽一張' : '第一次出牌要 30 點以上'); st.className = 'rk-status me'; }
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, v, seat, function (i) { return v.opened[i] ? '' : '未開局'; }, short));
    [].forEach.call(wrap.querySelectorAll('.pk-mini'), function (e) { e.className = 'rk-mini'; });
    // 桌面
    var felt = el('div', 'rk-felt');
    var lastPlaced = {}; if (v.last && v.last.k === 'play' && !myTurn) (v.last.placed || []).forEach(function (id) { lastPlaced[id] = 1; });
    table.forEach(function (s, i) {
      var a = RK.analyze(s), row = el('div', 'rk-set' + (myTurn && !a.ok ? ' bad' : '') + (myTurn && W.sel.length ? ' target' : ''));
      (a.ok ? a.order : s).forEach(function (id) { var x = el('span'); x.innerHTML = RK.tile(id, { sel: myTurn && W.sel.indexOf(id) >= 0, mine: myTurn && W.orig[id] }); var t = x.firstChild; if (lastPlaced[id]) t.classList.add('new'); row.appendChild(t); });
      if (myTurn && !a.ok) row.appendChild(el('small', 'rk-why', a.why || '不合法'));
      row.addEventListener('click', function (e) {
        if (!myTurn) return;
        var t = e.target.closest('.rk-tile');
        if (W.sel.length && !(t && W.sel.indexOf(+t.getAttribute('data-id')) >= 0)) { moveSel(i); ctx.snd('move'); ctx.rerender(); return; }
        if (t) { var id = +t.getAttribute('data-id'), k = W.sel.indexOf(id); if (k >= 0) W.sel.splice(k, 1); else W.sel.push(id); ctx.snd('tap'); ctx.rerender(); }
      });
      felt.appendChild(row);
    });
    if (!table.length) felt.appendChild(el('div', 'rk-empty', '桌上還沒有牌'));
    if (myTurn && W.sel.length) { var nw = el('button', 'rk-new', '＋ 新的一組'); nw.type = 'button'; nw.addEventListener('click', function () { moveSel('new'); ctx.snd('move'); ctx.rerender(); }); felt.appendChild(nw); }
    wrap.appendChild(felt);
    if (myTurn) wrap.appendChild(el('div', 'rk-sum', v.opened[seat] ? '這回合放了 ' + ws.placed + ' 張' : '這回合新放的組合：' + ws.newSum + ' 點（第一次要 30 點）'));
    if (tb.res && v.reveal) { var pr = el('div', 'pk-pen'); v.reveal.forEach(function (x, i) { pr.appendChild(el('span', '', (i === seat ? '你' : short(tb, i)) + '：手上剩 ' + x + ' 點')); }); wrap.appendChild(pr); }
    // 手牌
    var me = el('div', 'rk-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot); top.appendChild(el('span', 'n', tb.seats[seat].name + '・我')); top.appendChild(el('span', 'pk-cnt', rack.length + ' 張・牌堆 ' + v.pool));
    me.appendChild(top);
    var rr = el('div', 'rk-rack'), shown = L.sortNum ? RK.sortNum(rack.slice()) : RK.sortRack(rack.slice());
    shown.forEach(function (id) { var x = el('span'); x.innerHTML = RK.tile(id, { sel: myTurn && W.sel.indexOf(id) >= 0 }); rr.appendChild(x.firstChild); });
    rr.addEventListener('click', function (e) {
      if (!myTurn) return;
      var t = e.target.closest('.rk-tile');
      if (!t && W.sel.length) { var er = moveSel('rack'); if (er) ctx.toast(er); ctx.rerender(); return; }
      if (!t) return;
      var id = +t.getAttribute('data-id');
      if (W.sel.length && W.sel.some(function (x) { return W.rack.indexOf(x) < 0; })) { var er2 = moveSel('rack'); if (er2) ctx.toast(er2); ctx.rerender(); return; }
      var k = W.sel.indexOf(id); if (k >= 0) W.sel.splice(k, 1); else W.sel.push(id); ctx.snd('tap'); ctx.rerender();
    });
    me.appendChild(rr);
    wrap.appendChild(me);
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn) {
        var done = ctx.button('pk-btn go', '✔ 完成', function () { if (!ws.ok) return; L.pending = v.cnt; ctx.snd('move'); ctx.send('play', { table: W.table, n: v.cnt }); ctx.rerender(); }); done.disabled = !ws.ok; tools.appendChild(done);
        tools.appendChild(ctx.button('pk-btn', ws.placed || W.table.length !== v.table.length ? '↩ 重來' : '🀫 抽一張', function () {
          if (ws.placed || W.table.length !== v.table.length || W.sel.length) { resetWork(v); ctx.rerender(); return; }
          L.pending = v.cnt; ctx.send('draw', { n: v.cnt }); ctx.rerender();
        }));
        if (W.sel.length) tools.appendChild(ctx.button('pk-btn', '取消選取', function () { W.sel = []; ctx.rerender(); }));
      }
      tools.appendChild(ctx.button('pk-btn', L.sortNum ? '依顏色排' : '依數字排', function () { L.sortNum = !L.sortNum; ctx.rerender(); }));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  BG.register('rummikub', mod);
  function row(ids, note) { return '<figure class="g-fig"><div class="rk-set demo">' + ids.map(function (id) { return RK.tile(id); }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人先拿 <b>14 張</b>。輪到你時，可以把牌組成「一組」放到桌上，或<b>抽一張</b>。</li><li><b>第一次出牌</b>：放出去的組合點數加起來要 <b>30 點以上</b>，而且只能用自己的牌。</li><li>開局後，可以把牌<b>接到桌上別人的組合</b>，也可以把桌上的牌重新拆開、重組，只要回合結束時桌上每一組都合法。</li><li>第一個把手牌全部放完的人獲勝！</li></ol>' +
        '<h4>操作方法</h4><ul><li>點一張或好幾張牌（會浮起來），再點<b>桌上的某一組</b>把牌加進去，或點「<b>＋ 新的一組</b>」。</li><li>放錯了：選起來再點自己的手牌區可以收回（只限本回合從手上拿出去的牌），或按「<b>↩ 重來</b>」。</li><li>不合法的組合會用紅框標示。全部合法才能按「<b>✔ 完成</b>」。</li></ul>' },
      { h: '合法的組合', html: '<div class="g-figs">' + row([6, 19, 32], '同數字、不同顏色（3～4 張）') + row([0, 1, 2, 3], '同顏色、連續數字（3 張以上）') + row([22, 104, 24], '鬼牌 😀 可以當作任何一張牌') + '</div><p>1 不能接在 13 後面。</p>' },
      { h: '計分方式', html: '<p>先把牌放完的人獲勝（積分榜 +3 分）。牌堆抽完、大家都不能出時，手上點數最少的人獲勝（鬼牌算 30 點）。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「拉密」開房間，每桌 2～4 人（預設 4 人）。</li><li>大螢幕顯示桌上所有組合、每人剩幾張、誰還沒開局（還沒滿 30 點的第一手）。</li></ol>' },
      { h: '規則說明', html: '<ul><li>106 張牌：1～13 四種顏色各兩套，加上 2 張鬼牌。</li><li>第一次出牌要 30 點以上，而且只能用自己的牌。</li><li>開局後可以自由重組桌上的牌，但桌上的牌不能收回手上。</li><li>系統會檢查：回合結束時每一組都合法、至少從手上放一張牌，才能送出。</li><li>本工具沒有計時沙漏，老師可用「電腦出牌速度」調整電腦節奏。</li></ul>' },
      { h: '教學重點', html: '<ul><li>數字分類（同數字／連續數字）、加法（開局 30 點）。</li><li>重組桌上的牌是很好的邏輯與規劃練習，可以把一桌投影出來，全班討論「這張牌還能放哪裡」。</li></ul>' }
    ]
  };
})();
