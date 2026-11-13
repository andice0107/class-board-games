/* 拉密模組：2～4 人，每人 14 張。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2f6fe4', '#2a9d5c', '#f4a300'];
  var REASONS = { empty: '第一個把手上的牌全部放到桌上', pool: '牌堆抽完後，大家連續一整輪都出不了牌，比手上剩下的點數，最少的人獲勝', tie: '牌堆抽完後大家都出不了牌，手上點數一樣，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
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
        turn: g.turn, out: g.out, cnt: g.cnt, last: g.last, reveal: g.res ? g.racks.map(function (r) { return RK.rackValue(r); }) : null, racks: g.res ? g.racks.map(function (r) { return RK.sortRack(r.slice()); }) : null };
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
    hintDesc: '還沒「破冰」（第一次出牌要 30 點以上）時，會直接亮出可以用來破冰的牌；已經破冰的話，會告訴你「哪一張牌可以加到桌上的哪一組」，或亮出手牌裡「已經可以組成一組」的牌。',
    tipDesc: '還沒破冰又湊不出 30 點時，提醒你直接抽一張牌；已經破冰、但手上沒有牌可以放時，也提醒你抽牌。',
    /* 手牌可以接在桌上哪一組後面（一張牌 + 一組仍然合法） */
    _append: function (g, seat) {
      var out = [];
      g.racks[seat].forEach(function (id) { g.table.forEach(function (set, i) { if (RK.analyze(set.concat([id])).ok) out.push({ id: id, set: i }); }); });
      return out;
    },
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var rack = g.racks[seat], best = RK.bestBySum(rack);
      if (!g.opened[seat]) {
        if (best.sum >= 30) { var ids = []; best.combos.forEach(function (m) { m.forEach(function (id) { ids.push(id); }); }); return { msg: '你可以「破冰」了！亮黃框的 ' + ids.length + ' 張牌可以組成 ' + best.combos.length + ' 組，合計 ' + best.sum + ' 點（超過 30）。把它們分組放到桌上，按「完成」。', hl: ids }; }
        return { msg: '你現在湊不出 30 點以上的組合（最多只有 ' + best.sum + ' 點），沒辦法破冰。請直接按亮黃框的「抽一張」。', hl: ['draw'] };
      }
      var ap = mod._append(g, seat);
      if (ap.length) { var a = ap[0]; return { msg: '亮黃框的這張牌，可以加到桌上亮黃框的那一組裡面（組合仍然合法）。', hl: [a.id, 'set' + a.set] }; }
      if (best.combos.length) { var m = best.combos[0]; return { msg: '你手上亮黃框的 ' + m.length + ' 張牌，已經可以自己組成一組（同數字不同顏色，或同顏色連號）。', hl: m.slice() }; }
      var re = RK.rearrange(g.table, rack, true);
      if (re) { var gid = re.used[0], sets = []; g.table.forEach(function (st, i) { if (!st.some(function (id) { return id >= 104; })) sets.push('set' + i); });
        return { msg: '沒辦法直接接上去，但是如果把桌上的組合「拆開重新排」，亮黃框的這張牌就放得進去！想一想：桌上哪幾張可以換到別組，讓這張也湊成一組？（排完每一組都要合法才能按「完成」）', hl: [gid] }; }
      return { msg: '你手上目前沒有牌可以放到桌上，也湊不出新的一組，連把桌上的牌拆開重組也放不進去。請按亮黃框的「' + (g.pool.length ? '抽一張' : '跳過') + '」。', hl: ['draw'] };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var best = RK.bestBySum(g.racks[seat]);
      if (!g.opened[seat]) return best.sum >= 30 ? '第一次出牌（破冰）要湊出 30 點以上的組合，而且只能用自己的牌。湊好了就按「完成」；湊不出來就按「抽一張」。' : '你現在沒有可以破冰的牌組（湊不出 30 點以上），請直接按「抽一張」牌。';
      if (!mod._append(g, seat).length && !best.combos.length) return '你手上的牌好像沒辦法放到桌上，也湊不出新的一組，請直接按「抽一張」牌。';
      return '輪到你了：點牌選起來，再點桌上的一組（或「＋新的一組」）放進去，放好按「完成」；放不了就按「抽一張」。';
    },
    turnKey: function (g, seat) { return g.cnt; },
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
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
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
    // 用和老師端完全一樣的規則先檢查一次，按「完成」前就知道哪裡不行
    var err = placed > 0 && !bad ? check({ table: v.table, racks: (function () { var r = []; r[seat] = v.rack; return r; })(), opened: v.opened }, seat, W.table) : '';
    return { placed: placed, bad: bad, newSum: newSum, err: err, ok: placed > 0 && !bad && !err };
  }
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0; mod._ctx = ctx;
    if (!W || W.cnt !== v.cnt) resetWork(v);
    var myTurn = !tb.res && v.turn === seat && !L.pending && !out;
    var ws = workState(v, seat), table = myTurn ? W.table : v.table, rack = myTurn ? W.rack : v.rack;
    var wrap = el('div', 'rk-table');
    var st = el('div', 'rk-status');
    if (tb.res) st.textContent = '這局結束了：' + (tb.res.w >= 0 ? who(tb, tb.res.w) + ' 獲勝' : '平手');
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (L.pending) st.textContent = '送出中…';
    else if (myTurn) { st.textContent = W.sel.length ? '再點桌上的一組，或「＋新的一組」' : ws.err ? '⚠️ ' + ws.err : (!v.pool ? '牌堆抽完了：能出就繼續出，出不了就按「跳過」' : v.opened[seat] ? '點牌選起來，移到桌上；或抽一張' : '第一次出牌要 30 點以上'); st.className = 'rk-status me' + (ws.err && !W.sel.length ? ' warn' : ''); }
    else st.textContent = '等 ' + short(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, v, seat, function (i) { return v.opened[i] ? '' : '未開局'; }, short));
    [].forEach.call(wrap.querySelectorAll('.pk-mini'), function (e) { e.className = 'rk-mini'; });
    // 桌面
    var felt = el('div', 'rk-felt');
    var lastPlaced = {}; if (v.last && v.last.k === 'play' && !myTurn) (v.last.placed || []).forEach(function (id) { lastPlaced[id] = 1; });
    table.forEach(function (s, i) {
      var a = RK.analyze(s), row = el('div', 'rk-set' + (myTurn && !a.ok ? ' bad' : '') + (myTurn && W.sel.length ? ' target' : '')); row.setAttribute('data-h', 'set' + i);
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
    // 結束：把每個人剩下的牌全部翻開，寫清楚張數和點數，誰贏、為什麼
    if (tb.res && v.racks) {
      var rv = el('div', 'rk-reveal'), r0 = tb.res, ws0 = r0.w;
      rv.appendChild(el('div', 'rk-rvt', r0.why === 'empty' ? '🏆 ' + who(tb, ws0) + ' 把牌全部出完了！大家剩下的牌：' : r0.why === 'pool' || r0.why === 'tie' ? '🀫 牌堆抽完，大家都出不了牌 → 翻開比點數（鬼牌算 30 點，越少越好）' : '這局結束了，大家剩下的牌：'));
      var order = v.racks.map(function (x, i) { return i; }).sort(function (a, b) { return v.reveal[a] - v.reveal[b]; });
      order.forEach(function (i) {
        var line = el('div', 'rk-rvrow' + (i === ws0 ? ' win' : '') + (v.out.indexOf(i) >= 0 ? ' out' : ''));
        var nmx = el('div', 'rk-rvn'); nmx.innerHTML = (i === ws0 ? '🏆 ' : '') + '<b>' + who(tb, i) + '</b><small>' + (v.out.indexOf(i) >= 0 ? '已認輸' : v.racks[i].length + ' 張・' + v.reveal[i] + ' 點') + '</small>'; line.appendChild(nmx);
        var ts = el('div', 'rk-rvts'); ts.innerHTML = v.racks[i].length ? v.racks[i].map(function (id) { return RK.tile(id); }).join('') : '<span class="rk-rv0">✨ 全部出完，沒有剩牌</span>'; line.appendChild(ts);
        rv.appendChild(line);
      });
      wrap.appendChild(rv);
    }
    // 手牌
    var me = el('div', 'rk-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot); top.appendChild(el('span', 'n', (tb.seats[seat].name === '我' ? '我' : tb.seats[seat].name + '・我'))); top.appendChild(el('span', 'pk-cnt', rack.length + ' 張・牌堆 ' + v.pool));
    me.appendChild(top);
    // 手牌順序：新抽到的牌放最右邊並標「新」，按「整理」才依數字／依顏色排到該在的位置
    var rr = el('div', 'rk-rack'), HK = BG.handKey(tb, 'rummikub'), SF = function (r) { return L.sortNum ? RK.sortNum(r) : RK.sortRack(r); };
    var ho = BG.handOrder(HK, v.rack, SF), shown = ho.list.filter(function (id) { return rack.indexOf(id) >= 0; }).concat(rack.filter(function (id) { return ho.list.indexOf(id) < 0; }));
    shown.forEach(function (id) { var x = el('span'); x.innerHTML = RK.tile(id, { sel: myTurn && W.sel.indexOf(id) >= 0 }); var t = x.firstChild; if (ho.fresh[ho.list.indexOf(id)]) t.classList.add('fresh-card'); rr.appendChild(t); });
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
        var done = ctx.button('pk-btn go', '✔ 完成', function () { if (!ws.ok) return; L.pending = v.cnt; L.pd = { t: 'play', d: { table: W.table, n: v.cnt }, at: Date.now() }; ctx.snd('move'); ctx.send('play', L.pd.d); ctx.rerender(); }); done.disabled = !ws.ok; tools.appendChild(done);
        var db = ctx.button('pk-btn', ws.placed || W.table.length !== v.table.length ? '↩ 重來' : v.pool ? '🀫 抽一張' : '⏭ 沒牌可抽，跳過', function () {
          if (ws.placed || W.table.length !== v.table.length || W.sel.length) { resetWork(v); ctx.rerender(); return; }
          // 牌堆抽完後按「跳過」：系統先幫忙看看是不是其實還有牌能出（不說是哪一張）
          if (!v.pool && L.warn !== v.cnt) { var cp = RK.canPlay(v.table, v.rack, v.opened[seat]); if (cp) { L.warn = v.cnt; L.warnK = cp; ctx.snd('tap'); ctx.rerender(); return; } }
          L.pending = v.cnt; L.pd = { t: 'draw', d: { n: v.cnt }, at: Date.now() }; ctx.send('draw', L.pd.d); ctx.rerender();
        }); db.setAttribute('data-h', 'draw'); tools.appendChild(db);
        if (W.sel.length) tools.appendChild(ctx.button('pk-btn', '取消選取', function () { W.sel = []; ctx.rerender(); }));
      }
      [[true, '🔀 整理：依數字'], [false, '🔀 整理：依顏色']].forEach(function (o) { tools.appendChild(ctx.button('pk-btn sort-btn' + (L.sortNum === o[0] ? ' on' : ''), o[1], function () { L.sortNum = o[0]; BG.handSort(HK, SF); ctx.snd('tap'); ctx.rerender(); })); });
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
      if (myTurn && L.warn === v.cnt && !L.pending) {
        var WM = { open: '你手上的牌其實可以湊到 30 點破冰喔！', combo: '你手上的牌其實可以自己湊成一組喔！', attach: '你有牌可以直接接到桌上的組合喔！', rearrange: '如果把桌上的組合拆開重新排，你還有牌放得進去喔！' };
        var wb = el('div', 'rk-warn'); wb.appendChild(el('b', '', '🤔 等一下！' + (WM[L.warnK] || '你好像還有牌可以出。')));
        wb.appendChild(el('span', '', '牌堆已經抽完了，大家都跳過的話遊戲就會結束、開始比點數。要再看看嗎？（可以按 💡 提示）'));
        var wr = el('div', 'row c');
        wr.appendChild(ctx.button('pk-btn go', '👀 我再看看', function () { L.warn = -2; ctx.rerender(); }));
        wr.appendChild(ctx.button('pk-btn', '⏭ 確定跳過', function () { L.warn = -1; L.pending = v.cnt; L.pd = { t: 'draw', d: { n: v.cnt }, at: Date.now() }; ctx.send('draw', L.pd.d); ctx.rerender(); }));
        wb.appendChild(wr); wrap.appendChild(wb);
      }
    }
    box.appendChild(wrap);
  };
  // 網路掉封包時：3 秒沒有回應就再送一次；老師端說「不行」時（onReject）就解除「送出中」，回到剛剛排好的桌面
  setInterval(function () { var P = L.pd, c = mod._ctx; if (!L.pending || !P || !c) return; if (Date.now() - P.at > 3000) { P.at = Date.now(); c.send(P.t, P.d); } }, 1000);
  mod.onReject = function () { L.pending = null; L.pd = null; };
  /* 結束資訊：誰贏、為什麼贏、每個人剩幾張、幾點（剩下的牌已經翻開在牌桌上） */
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res, L2 = [];
    if (!v.racks) return null;
    var det = v.racks.map(function (x, i) { return { i: i, n: x.length, p: v.reveal[i] }; }).filter(function (o) { return v.out.indexOf(o.i) < 0; }).sort(function (a, b) { return a.p - b.p; });
    if (r.why === 'empty') {
      L2.push('🏆 獲勝：' + nm(r.w) + '（第一個把手上的牌全部出完）');
      L2.push('🃏 其他人剩下的牌：' + det.filter(function (o) { return o.i !== r.w; }).map(function (o) { return nm(o.i) + ' ' + o.n + ' 張（' + o.p + ' 點）'; }).join('、'));
    } else if (r.why === 'pool' || r.why === 'tie') {
      L2.push('🀫 牌堆已經抽完，之後大家輪流一整輪都沒辦法再出牌，所以遊戲結束，改比手上剩下的點數');
      L2.push('🧮 點數：數字多少就算幾點，鬼牌算 30 點，越少越好');
      L2.push('📊 ' + det.map(function (o) { return nm(o.i) + ' ' + o.p + ' 點（' + o.n + ' 張）'; }).join('、'));
      L2.push(r.why === 'tie' ? '🤝 最少的點數一樣，平手' : '🏆 獲勝：' + nm(r.w) + '（只剩 ' + v.reveal[r.w] + ' 點，最少）');
    } else return null;
    L2.push('👀 每個人剩下的牌都已經翻開在牌桌上，可以往上看');
    return L2;
  };
  BG.register('rummikub', mod);
  function row(ids, note) { return '<figure class="g-fig"><div class="rk-set demo">' + ids.map(function (id) { return RK.tile(id); }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每人先拿 <b>14 張</b>。輪到你時，可以把牌組成「一組」放到桌上，或<b>抽一張</b>。</li><li><b>第一次出牌</b>：放出去的組合點數加起來要 <b>30 點以上</b>，而且只能用自己的牌。</li><li>開局後，可以把牌<b>接到桌上別人的組合</b>，也可以把桌上的牌重新拆開、重組，只要回合結束時桌上每一組都合法。</li><li>第一個把手牌全部放完的人獲勝！</li></ol>' +
        '<h4>操作方法</h4><ul><li>點一張或好幾張牌（會浮起來），再點<b>桌上的某一組</b>把牌加進去，或點「<b>＋ 新的一組</b>」。</li><li>放錯了：選起來再點自己的手牌區可以收回（只限本回合從手上拿出去的牌），或按「<b>↩ 重來</b>」。</li><li>不合法的組合會用紅框標示。全部合法才能按「<b>✔ 完成</b>」。</li></ul>' },
      { h: '合法的組合', html: '<div class="g-figs">' + row([6, 19, 32], '同數字、不同顏色（3～4 張）') + row([0, 1, 2, 3], '同顏色、連續數字（3 張以上）') + row([22, 104, 24], '鬼牌 😀 可以當作任何一張牌') + '</div><p>1 不能接在 13 後面。</p>' },
      { h: '計分方式', html: '<p><b>誰先把手上的牌全部出完，誰就贏</b>（積分榜 +3 分），這是正常的結束方式。如果牌堆被抽完了，遊戲<b>還會繼續</b>：能出牌就繼續出，沒有牌可以出就按「跳過」（如果你其實還有牌能出，系統會先提醒你）。要等到牌堆抽完、而且大家連續一整輪都出不了牌，才會結束，這時候把大家的牌翻開，手上點數最少的人獲勝（數字多少算幾點，鬼牌算 30 點）。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁點「拉密」開房間，每桌 2～4 人（預設 4 人）。</li><li>大螢幕顯示桌上所有組合、每人剩幾張、誰還沒開局（還沒滿 30 點的第一手）。</li></ol>' },
      { h: '規則說明', html: '<ul><li>106 張牌：1～13 四種顏色各兩套，加上 2 張鬼牌。</li><li>第一次出牌要 30 點以上，而且只能用自己的牌。</li><li>開局後可以自由重組桌上的牌，但桌上的牌不能收回手上。</li><li>系統會檢查：回合結束時每一組都合法、至少從手上放一張牌，才能送出。</li><li>結束方式：先把牌全部出完的人贏（正式規則）。牌堆抽完後遊戲繼續，沒牌可出的人按「跳過」；大家連續一整輪都出不了牌才結束，翻開所有人剩下的牌比點數（鬼牌 30 點），最少的人贏。結束時每個人剩下的牌都會翻開顯示。</li><li>本工具沒有計時沙漏，老師可用「電腦出牌速度」調整電腦節奏。</li></ul>' },
      { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦怎麼打</th></tr><tr><td>🐣 入門</td><td>會用手上的牌湊組合，但常常故意不出（約 3 成），讓學生比較容易贏</td></tr><tr><td>🙂 簡單</td><td>用手上的牌湊新的一組</td></tr><tr><td>🤔 普通</td><td>湊新的一組，再把剩下的單張接到桌上的組合</td></tr><tr><td>🔥 困難</td><td>以上都會，還會像真人一樣<b>把桌上的牌拆開重新排</b>，放進更多手牌</td></tr></table>' },
      { h: '跳過提醒', html: '<p>牌堆抽完後，學生按「⏭ 跳過」時，如果系統發現他其實還有牌能出（包含把桌上的牌拆開重組才放得進去），會先跳出「🤔 等一下！」提醒（只說還有牌能出，不說是哪一張），學生可以選「我再看看」或「確定跳過」。按 💡 提示會亮出可以放的那張牌。</p>' },
      { h: '教學重點', html: '<ul><li>數字分類（同數字／連續數字）、加法（開局 30 點）。</li><li>重組桌上的牌是很好的邏輯與規劃練習，可以把一桌投影出來，全班討論「這張牌還能放哪裡」。</li></ul>' }
    ]
  };
})();
