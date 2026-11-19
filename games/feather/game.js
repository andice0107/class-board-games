/* 就我的毛最多（原創角色與圖案，玩法類似「拔毛運動會」）
   外圈 24 格蛋形跑道（12 種圖案各 2 格），內圈 12 張蓋著的八角形雞窩牌（每種圖案 1 張，位置固定）。
   輪到你時翻一張雞窩牌：翻到的圖案和「前面第一個空格」一樣就跳過去，超越的雞要被拔走一根羽毛，可以繼續翻；翻錯就換人。
   版本 1 基本版；版本 2 加上便便（豪邁版）。 */
(function () {
  'use strict';
  var NAMES = ['紅蘿蔔', '瓢蟲', '玉米', '蘑菇', '蚯蚓', '牛奶桶', '乾草堆', '蘋果推車', '乳牛', '綿羊', '青蛙', '稻草人'];
  var CN = ['橘雞', '白雞', '棕雞', '粉雞', '白鴨', '綠鴨'];
  var SEATC = ['#f08a24', '#7b8794', '#8d5a3b', '#e86aa5', '#3a9ad9', '#2e9d57'];
  var STRIDE = { 2: [0, 12], 3: [0, 8, 16], 4: [0, 6, 12, 18], 5: [0, 5, 10, 15, 20], 6: [0, 4, 8, 12, 16, 20] };
  var REASONS = { feathers: '集滿羽毛了！', time: '時間到，羽毛最多', stall: '打了很久了，羽毛最多的贏', tie: '羽毛一樣多，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function IMG(k) { return 'games/feather/img/' + k + '.webp' + (BG.VER ? '?v=' + BG.VER : ''); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nxt(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function holdLeft(g) { return g.hold ? Math.max(0, g.hold - Date.now()) : 0; }
  function holdOn(g) { g.hold = Date.now() + BG.holdMs(); }
  function cellOwner(g, c) {
    for (var s = 0; s < g.np; s++) { if (g.pos[s] === c) return { k: 'c', s: s }; if (g.poop[s] === c) return { k: 'p', s: s }; }
    return null;
  }
  /* 這位玩家現在的目標：前面第一個空格，中間一排被佔住的格子都是「超越」 */
  function nextTarget(g, s) {
    var c = (g.pos[s] + 1) % 24, jumped = [], poops = [], n = 0;
    while (n++ < 24) {
      var o = cellOwner(g, c);
      if (!o) return { c: c, d: ((c - g.pos[s]) + 24) % 24, jumped: jumped, poops: poops };
      if (o.k === 'c') jumped.push(o.s); else poops.push(o.s);
      c = (c + 1) % 24;
    }
    return { c: c, d: 1, jumped: jumped, poops: poops };
  }
  function layout(g) {
    var occ = {}, base = STRIDE[g.np];
    for (var s = 0; s < g.np; s++) {
      if (g.out.indexOf(s) >= 0) { g.pos[s] = -1; g.poop[s] = -1; continue; }
      var p = (base[s] + (g.off[s] || 0)) % 24; while (occ[p]) p = (p + 1) % 24; occ[p] = 1; g.pos[s] = p; g.steps[s] = g.off[s] || 0;
    }
    for (s = 0; s < g.np; s++) {
      if (g.out.indexOf(s) >= 0) continue;
      if (g.ver !== 2) { g.poop[s] = -1; continue; }
      var c = (g.pos[s] + 23) % 24; while (occ[c]) c = (c + 23) % 24; occ[c] = 1; g.poop[s] = c;
    }
  }
  function makeRing() {
    for (var tries = 0; tries < 200; tries++) {
      var a = []; for (var i = 0; i < 12; i++) a.push(i, i); shuffle(a);
      var ok = true; for (i = 0; i < 24; i++) if (a[i] === a[(i + 1) % 24]) { ok = false; break; }
      if (ok) return a;
    }
    return a;
  }
  function addEv(g, it) { if (!g.ev || g.ev.n !== g.cnt) g.ev = { n: g.cnt, items: [] }; g.ev.items.push(it); holdOn(g); }
  function startClock(g) { if (!g.dl && g.limit) g.dl = Date.now() + g.limit; }
  function finishBy(g, why) {
    var al = alive(g), mx = -1; al.forEach(function (s) { if (g.f[s] > mx) mx = g.f[s]; });
    var ws = al.filter(function (s) { return g.f[s] === mx; });
    g.res = ws.length === al.length ? { w: -1, why: 'tie' } : { ws: ws, why: why };
  }
  function behindLaps(g, s) {
    var al = alive(g), mx = -1, mn = 1e9; al.forEach(function (o) { if (g.steps[o] > mx) mx = g.steps[o]; if (o !== s && g.steps[o] < mn) mn = g.steps[o]; });
    var gap = mx - g.steps[s]; return al.length > 1 && g.steps[s] < mn && gap >= 24 ? Math.floor(gap / 24) : 0;
  }
  function startTurn(g) {
    g.fate = null; g.peek = null; g.peekUntil = 0; if (g.res) return;
    if (g.peekOn && behindLaps(g, g.turn) > (g.usedP[g.turn] || 0)) g.peek = { s: g.turn };
    var s = g.turn, al = alive(g); if (al.length < 2) return;
    var mx = -1, mn = 1e9; al.forEach(function (o) { if (g.steps[o] > mx) mx = g.steps[o]; if (o !== s && g.steps[o] < mn) mn = g.steps[o]; });
    var gap = mx - g.steps[s];
    if (g.steps[s] < mn && gap >= 24 && Math.floor(gap / 24) > (g.used[s] || 0)) {
      var all = []; for (var i = 0; i < 12; i++) all.push(i); shuffle(all);
      var lit = all.slice(0, 3).sort(function (a, b) { return a - b; });
      g.fate = { s: s, lit: lit, lucky: lit[Math.floor(Math.random() * 3)] };
    }
  }
  function endTurn(g) {
    g.turns++;
    if (g.turns > g.np * 120) { finishBy(g, 'stall'); return; }
    if (g.lastTurns != null) { g.lastTurns--; if (g.lastTurns <= 0) { finishBy(g, 'time'); return; } }
    else if (g.dl && Date.now() > g.dl) { g.lastTurns = alive(g).length - 1; if (g.lastTurns <= 0) { finishBy(g, 'time'); return; } }
    g.turn = nxt(g, g.turn);
    if (g.turn === g.first) {
      g.rd++;
      if (g.rs === 2) { var nest = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); g.nest = nest; g.flips = []; g.last = null; g.logs = []; g.rs = 0; addEv(g, { k: 'rs2' }); }
      else if (g.rs === 1) { g.rs = 2; addEv(g, { k: 'rs1' }); }
    }
    startTurn(g);
  }
  /* 往前跳到目標格：拔走被超越的雞的羽毛 */
  function move(g, seat, tg) {
    var took = [];
    tg.jumped.forEach(function (o) { var t = g.f[o]; g.f[seat] += t; g.f[o] = 0; took.push({ s: o, n: t }); });
    g.steps[seat] += tg.d; g.pos[seat] = tg.c;
    if (tg.jumped.length) {
      addEv(g, { k: 'jump', s: seat, took: took });
      if (g.ver === 2) tg.jumped.forEach(function (o) { g.poop[o] = -1; g.pl.push(o); });
    }
    if (g.f[seat] >= g.need) g.res = { w: seat, why: 'feathers' };
  }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.pos[seat] = -1; g.poop[seat] = -1;
    g.pl = g.pl.filter(function (x) { return x !== seat; });
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.first === seat) g.first = nxt(g, seat);
    if (g.fate && g.fate.s === seat) g.fate = null;
    if (g.turn === seat) { g.turn = nxt(g, seat); startTurn(g); }
  }
  function maxFlip(g, seat) { return Math.max(1, Math.min(3, g.multi[seat] || 1)); }
  function freeCells(g) { var r = []; for (var c = 0; c < 24; c++) if (!cellOwner(g, c)) r.push(c); return r; }

  var mod = {
    seats: 4, seatOptions: [2, 3, 4, 5, 6], seatDefault: 4, botSeats: [1, 5], botDelay: 2300, ver: 1, fitZoom: false,
    reasons: REASONS, holdLeft: holdLeft, onResume: function (g, d) { if (g.dl) g.dl += d; if (g.hold) g.hold += d; },
    levelDesc: ['亂翻', '只記得最近翻過的 2 張', '記得最近翻過的 4 張', '幾乎全部都記得'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    opts: [
      { k: 'ver', label: '玩法：', list: [['1', '版本 1 基本版（沒有便便）'], ['2', '版本 2 便便版（豪邁版）']], note: '版本 1 最多 6 人（第 5、6 位是小鴨）；版本 2 加上便便規則，最多 6 人' },
      { k: 'limit', label: '限時：', list: [['15', '⏱️ 15 分鐘'], ['10', '⏱️ 10 分鐘'], ['20', '⏱️ 20 分鐘'], ['0', '不限時']], note: '時間到，這一輪打完就結算，羽毛最多的人贏（一樣多就一起贏）；沒到時間就是先集滿羽毛的人贏' },
      { k: 'aidsec', label: '輔助顯示時間：', list: [['3', '3 秒'], ['2', '2 秒'], ['4', '4 秒'], ['5', '5 秒']], note: '有選記憶輔助時：翻牌紀錄只會顯示這麼久就蓋住；一次翻多張時，選了牌超過這個時間沒翻，選的牌會蓋回去' },
      { k: 'peek', label: '落後偷看：', list: [['no', '不開啟'], ['yes', '開啟（落後一圈可偷看）']], note: '這是獨立的功能（和記憶輔助可以同時開）：落後整整一圈的最後一名，輪到時可按「偷看全部牌」，限時看清楚所有雞窩牌，時間到就蓋回去，只有他自己的畫面看得到；每多落後一圈可再用一次' },
      { k: 'peeksec', label: '偷看時間：', list: [['5', '5 秒'], ['3', '3 秒'], ['8', '8 秒'], ['10', '10 秒']], note: '落後偷看開啟時，全部牌翻開給他看的秒數' },
      { k: 'aid', label: '記憶輔助：', list: [['none', '不提供'], ['r2', '顯示最近 2 次翻牌'], ['r3', '顯示最近 3 次翻牌'], ['r4', '顯示最近 4 次翻牌'], ['r5', '顯示最近 5 次翻牌'], ['r6', '顯示最近 6 次翻牌'], ['m2', '同學一次可翻 2 張'], ['m3', '同學一次可翻 3 張']], note: '記憶輔助只能二選一：看翻牌紀錄，或讓真人同學一次翻 2～3 張（有一張對就算對）。選「一次翻多張」後，可在桌面管理替個別同學開關' }
    ],
    init: function (n, o) {
      o = o || {}; n = Math.max(2, Math.min(6, n || 4));
      var ver = o.ver === '2' ? 2 : 1, aid = String(o.aid || 'none'), ak = aid.charAt(0), an = +aid.slice(1) || 0;
      var bots = o._bots || [];
      var g = { np: n, ver: ver, ring: makeRing(), nest: shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), pos: [], poop: [], f: [], steps: [], off: [], used: [], multi: [], out: [], pl: [], flips: [], logs: [], last: null, fate: null,
        need: Math.min(n, 5), handi: o.handi === 'yes', aid: { k: ak === 'r' || ak === 'm' ? ak : 'none', n: an }, peekOn: o.peek === 'yes', peeksec: Math.max(2, Math.min(15, +o.peeksec || 5)), usedP: [], peek: null, peekUntil: 0, help: null, helpId: 0, aidsec: Math.max(2, Math.min(5, +o.aidsec || 3)), turn: 0, first: 0, rd: 1, rs: 0, turns: 0, cnt: 0, started: false, res: null, hold: 0, ev: null,
        limit: (+o.limit === 0 ? 0 : (+o.limit || 15)) * 60000, dl: null, lastTurns: null };
      for (var s = 0; s < n; s++) { g.f.push(1); g.steps.push(0); g.off.push(0); g.used.push(0); g.multi.push(ak === 'm' && !bots[s] ? an : 1); }
      var pool = shuffle([0, 1, 2, 3, 4, 5].slice(0, Math.max(n, 4))); g.chr = pool.slice(0, n);
      g.hold = Date.now() + 2800 + n * 700; g.draw = 1;
      g.turn = g.first = Math.floor(Math.random() * n);
      layout(g); startTurn(g);
      return g;
    },
    turnSeat: function (g) { return g.pl.length ? g.pl[0] : g.turn; },
    acting: function (g) { return g.res ? [] : [g.pl.length ? g.pl[0] : g.turn]; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var tg = g.res ? null : nextTarget(g, g.turn);
      return { np: g.np, ver: g.ver, chr: g.chr, ring: g.ring, pos: g.pos, poop: g.poop, f: g.f, steps: g.steps, need: g.need, turn: g.turn, first: g.first, out: g.out, tgt: tg ? tg.c : -1, tpic: tg ? g.ring[tg.c] : -1, jn: tg ? tg.jumped.length : 0,
        last: g.last, logs: g.logs.slice(-5), rec: g.aid.k === 'r' && seat === g.turn ? g.flips.slice(-g.aid.n) : null, aid: { k: g.aid.k, n: g.aid.n }, aidsec: g.aidsec, peeksec: g.peeksec, peekOn: g.peekOn, help: g.help && seat === g.help.s && Date.now() < g.help.until ? { id: g.help.id, cells: g.help.cells, tiles: g.help.tiles, sec: g.help.sec } : null, peekReady: !!(g.peek && g.peek.s === seat && !g.fate), all: g.peekUntil && Date.now() < g.peekUntil && seat === g.turn ? g.nest : null, pl: g.pl.length ? g.pl[0] : -1, fate: g.fate ? { s: g.fate.s, lit: g.fate.lit } : null, rs: g.rs, rd: g.rd,
        hold: holdLeft(g), ev: g.ev, cnt: g.cnt, tl: g.dl ? Math.max(0, g.dl - Date.now()) : null, limit: g.limit, ending: g.lastTurns != null, mf: seat >= 0 ? maxFlip(g, seat) : 1, handi: g.handi, off: g.off };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.n !== g.cnt || holdLeft(g) > 150) return false;
      if (d.t === 'place') {
        if (!g.pl.length || g.pl[0] !== seat) return false;
        var c = d.c | 0; if (c < 0 || c > 23 || cellOwner(g, c)) return false;
        g.poop[seat] = c; g.pl.shift(); g.cnt++; return true;
      }
      if (g.turn !== seat || g.pl.length) return false;
      if (d.t === 'peek') {
        if (!g.peek || g.peek.s !== seat || g.fate) return false;
        g.usedP[seat] = (g.usedP[seat] || 0) + 1; g.peekUntil = Date.now() + g.peeksec * 1000; g.peek = null; g.cnt++; return true;
      }
      if (d.t === 'fate') {
        if (!g.fate || g.fate.s !== seat || g.fate.lit.indexOf(d.pos | 0) < 0) return false;
        startClock(g); var pos = d.pos | 0, lucky = pos === g.fate.lucky;
        g.used[seat]++; g.last = { s: seat, ps: [pos], fate: 1, lucky: lucky }; g.fate = null; g.cnt++; g.started = true; g.logs.push({ s: seat, fate: 1, lucky: lucky, c: g.cnt }); if (g.logs.length > 8) g.logs.shift();
        addEv(g, { k: 'fate', s: seat, lucky: lucky });
        if (lucky) move(g, seat, nextTarget(g, seat));
        return true;
      }
      if (d.t !== 'flip' || g.fate) return false;
      var ps = (d.ps || []).map(function (x) { return x | 0; });
      ps = ps.filter(function (x, i) { return x >= 0 && x < 12 && ps.indexOf(x) === i; });
      if (!ps.length || ps.length > maxFlip(g, seat)) return false;
      startClock(g); g.started = true;
      var tg = nextTarget(g, seat), want = g.ring[tg.c], hit = -1, pics = [], oks = [];
      ps.forEach(function (p) { var pic = g.nest[p], ok = pic === want; pics.push(pic); oks.push(ok); g.flips.push({ s: seat, p: p, pic: pic, ok: ok }); if (ok && hit < 0) hit = p; });
      if (g.flips.length > 300) g.flips = g.flips.slice(-150);
      g.last = { s: seat, ps: ps, pics: pics, oks: oks, hit: hit };
      g.cnt++; g.logs.push({ s: seat, pics: pics, hit: hit >= 0, c: g.cnt }); if (g.logs.length > 8) g.logs.shift();
      if (hit >= 0) { move(g, seat, tg); return true; }
      if (g.ver === 2 && tg.poops.length) {
        var o = tg.poops[0], took = 0;
        if (g.f[seat] > 0) { g.f[seat]--; g.f[o]++; took = 1; }
        g.poop[o] = -1; addEv(g, { k: 'poop', s: seat, o: o, took: took });
        if (g.f[o] >= g.need) { g.res = { w: o, why: 'feathers' }; return true; }
      }
      endTurn(g);
      return true;
    },
    hintDesc: '會在雞窩牌中，把「現在要找的圖案」那一張亮一下（約 1.5 秒），要趕快記起來。輪到你放便便、選命運牌時，則是文字提醒。',
    tipDesc: '提醒你現在要找什麼圖案、怎麼翻牌；放便便或選命運牌時提醒你怎麼操作。',
    hint: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0 || mod.turnSeat(g) !== seat) return null;
      if (g.pl.length) return { msg: '請把便便放在一個空格上。放在對手前面一格，他翻錯時就會被扣羽毛！', hl: [] };
      if (g.fate) return { msg: '命運三選一：只有亮起來的 3 張可以翻，其中 1 張會讓你前進一步，全靠運氣！', hl: [] };
      var tg = nextTarget(g, seat), want = g.ring[tg.c], p = g.nest.indexOf(want);
      return { msg: '金色框那張，就是你現在要找的「' + NAMES[want] + '」。它只會亮一下，趕快記住它的位置！', hl: ['n' + p], dur: 1500 };
    },
    nudge: function (g, seat) {
      if (g.res || g.out.indexOf(seat) >= 0 || mod.turnSeat(g) !== seat) return null;
      if (g.pl.length) return '輪到你安放便便：點一個發光的空格。';
      if (g.peek && g.peek.s === seat && !g.fate) return '你落後一整圈了！可以按「👁 偷看全部牌」，限時看清楚所有牌的位置。';
      if (g.fate) return '命運三選一：點一張亮起來的雞窩牌，看看運氣好不好。';
      var tg = nextTarget(g, seat);
      return '輪到你了！要找「' + NAMES[g.ring[tg.c]] + '」，在中間的雞窩牌裡點一張來翻。';
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.out.indexOf(seat) >= 0) return null;
      var n = g.cnt;
      if (g.pl.length) {
        if (g.pl[0] !== seat) return null;
        var fr = freeCells(g), pick = fr[Math.floor(Math.random() * fr.length)];
        if (lv >= 2) {
          var best = -1, bs = -1;
          alive(g).forEach(function (o) { if (o === seat) return; var c = (g.pos[o] + 1) % 24; if (!cellOwner(g, c)) { var sc = g.f[o] * 3 + g.steps[o] / 10 + Math.random(); if (sc > bs) { bs = sc; best = c; } } });
          if (best >= 0) pick = best;
        }
        return { t: 'place', c: pick, n: n };
      }
      if (g.turn !== seat) return null;
      if (g.fate) return { t: 'fate', pos: g.fate.lit[Math.floor(Math.random() * 3)], n: n };
      var M = [2, 4, 8, 9999][Math.max(0, Math.min(3, lv - 1))], known = {};
      g.flips.slice(-M).forEach(function (x) { known[x.p] = x.pic; });
      var want = g.ring[nextTarget(g, seat).c], cand = [], unk = [];
      for (var p = 0; p < 12; p++) { if (known[p] === want) cand.push(p); if (known[p] == null) unk.push(p); }
      var use;
      if (lv === 1) use = Math.floor(Math.random() * 12);
      else if (cand.length) use = cand[0];
      else if (unk.length) use = unk[Math.floor(Math.random() * unk.length)];
      else use = Math.floor(Math.random() * 12);
      return { t: 'flip', ps: [use], n: n };
    },
    hostStatus: function (g) { return { t: '第 ' + g.rd + ' 輪・羽毛 ' + g.f.join('／') + (g.rs ? '・已預約洗牌' : ''), c: '' }; },
    hostAct: function (g, d) {
      if (g.res) return false;
      if (d.t === 'rs') { g.rs = g.rs ? 0 : 1; return true; }
      if (d.t === 'help') {
        if (d.s < 0 || d.s >= g.np || g.out.indexOf(d.s) >= 0) return false;
        var cells = [], cur = (g.pos[d.s] + 1) % 24, it = 0;
        while (cells.length < 3 && it++ < 24) { if (!cellOwner(g, cur)) cells.push(cur); cur = (cur + 1) % 24; }
        var tiles = [], seen = {};
        cells.forEach(function (c, i) { var pic = g.ring[c], pp = g.nest.indexOf(pic); if (!seen[pp]) { seen[pp] = 1; tiles.push({ p: pp, pic: pic, n: [i + 1] }); } else tiles.forEach(function (t) { if (t.p === pp) t.n.push(i + 1); }); });
        var sec = Math.max(2, Math.min(15, d.sec | 0 || 5));
        g.help = { id: ++g.helpId, s: d.s, cells: cells, tiles: tiles, sec: sec, until: Date.now() + sec * 1000 }; return true;
      }
      if (d.t === 'handi') { if (g.started || d.s < 0 || d.s >= g.np) return false; g.off[d.s] = Math.max(0, Math.min(6, d.v | 0)); layout(g); startTurn(g); return true; }
      if (d.t === 'multi') { if (g.aid.k !== 'm' || d.s < 0 || d.s >= g.np) return false; g.multi[d.s] = Math.max(1, Math.min(3, d.v | 0)); return true; }
      return false;
    },
    hostView: function (g) {
      var R = 54, svg = '<svg viewBox="-70 -70 140 140" width="150" height="150">';
      for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2 - Math.PI / 2; svg += '<circle cx="' + (R * Math.cos(a)).toFixed(1) + '" cy="' + (R * Math.sin(a)).toFixed(1) + '" r="2.2" fill="#ccc"/>'; }
      for (var s = 0; s < g.np; s++) {
        if (g.out.indexOf(s) >= 0) continue;
        var a2 = g.pos[s] / 24 * Math.PI * 2 - Math.PI / 2; svg += '<circle cx="' + (R * Math.cos(a2)).toFixed(1) + '" cy="' + (R * Math.sin(a2)).toFixed(1) + '" r="7" fill="' + SEATC[g.chr[s]] + '" stroke="#fff" stroke-width="1.5"/>';
        if (g.poop[s] >= 0) { var a3 = g.poop[s] / 24 * Math.PI * 2 - Math.PI / 2; svg += '<circle cx="' + (R * Math.cos(a3)).toFixed(1) + '" cy="' + (R * Math.sin(a3)).toFixed(1) + '" r="3.5" fill="#6d4c41"/>'; }
      }
      svg += '<text x="0" y="5" text-anchor="middle" font-size="14" fill="#555">第' + g.rd + '輪</text></svg>';
      var h = '<div class="fe-host">' + svg + '<div class="fe-hrows">';
      for (s = 0; s < g.np; s++) h += '<div class="' + (g.out.indexOf(s) >= 0 ? 'out' : (s === g.turn ? 'turn' : '')) + '"><i style="background:' + SEATC[g.chr[s]] + '"></i>' + CN[g.chr[s]] + ' 🪶' + g.f[s] + '</div>';
      return h + '</div></div>';
    }
  };

  /* 老師端：每桌的管理面板（重新洗牌、偷看雞窩牌、讓分、一次翻幾張） */
  var PEEK = {};
  mod.hostTable = function (T, API) {
    var g = T.g, box = el('div', 'fe-ht');
    function row(label) { var r = el('div', 'fe-hrow'); r.appendChild(el('b', '', label)); box.appendChild(r); return r; }
    function btn(r, text, fn) { var b = el('button', 'btn small', text); b.type = 'button'; b.addEventListener('click', fn); r.appendChild(b); return b; }
    var r1 = row('🔀 重新洗牌：');
    btn(r1, g.rs === 1 ? '取消預約洗牌' : g.rs === 2 ? '下一輪結束後洗牌（點一下取消）' : '預約重新洗牌', function () { if (g.rs === 2) { g.rs = 0; API.save(); API.render(); return; } API.act(T, { t: 'rs' }); API.render(); });
    r1.appendChild(el('small', '', g.rs === 0 ? '不會馬上洗牌：下一輪開始前會先暫停公告，那一輪結束後才洗牌' : g.rs === 1 ? '已預約，下一輪開始時會公告' : '這一輪結束後就會洗牌'));
    var r2 = row('👁 偷看雞窩牌：');
    btn(r2, PEEK[T.id] ? '收起來' : '看雞窩牌位置（學生看不到）', function () { PEEK[T.id] = !PEEK[T.id]; API.render(); });
    if (PEEK[T.id]) { var pk = el('div', 'fe-peek'); for (var p = 0; p < 12; p++) { var c = el('div', 'fe-pk'); c.innerHTML = '<img src="' + IMG('n' + pad(g.nest[p] + 1)) + '" alt=""><b>' + (p + 1) + '</b><small>' + NAMES[g.nest[p]] + '</small>'; pk.appendChild(c); } box.appendChild(pk); }
    var r3 = row('🎁 讓分（隨時可用）：'); r3.appendChild(el('small', '', '選一位同學，他的畫面會翻出「前面三格」對應的雞窩牌位置，限時後蓋回去'));
    var r3b = row('　看幾秒：'), selSec = document.createElement('select');
    [3, 5, 8, 10, 15].forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v + ' 秒'; if (v === (PEEK['sec'] || 5)) o.selected = true; selSec.appendChild(o); });
    selSec.addEventListener('change', function () { PEEK['sec'] = +this.value; }); r3b.appendChild(selSec);
    var r3c = row('　給誰看：');
    for (var s = 0; s < g.np; s++) {
      (function (s) {
        if (API.isBot(T, s) || g.out.indexOf(s) >= 0) return;
        btn(r3c, '👀 ' + API.name(T, s).replace(/（.*）/, '') + '（' + CN[g.chr[s]] + '）', function () { API.act(T, { t: 'help', s: s, sec: +selSec.value }); API.render(); });
      })(s);
    }
    if (g.aid.k === 'm') {
      var r4 = row('🧠 一次翻幾張牌：');
      for (var s2 = 0; s2 < g.np; s2++) {
        (function (s) {
          if (API.isBot(T, s)) return;
          var w = el('label', 'fe-sel'); w.appendChild(document.createTextNode(API.name(T, s).replace(/（.*）/, '') + ' '));
          var sel = document.createElement('select');
          for (var v = 1; v <= 3; v++) { var o = document.createElement('option'); o.value = v; o.textContent = v + ' 張'; if (g.multi[s] === v) o.selected = true; sel.appendChild(o); }
          sel.addEventListener('change', function () { API.act(T, { t: 'multi', s: s, v: +this.value }); API.render(); });
          w.appendChild(sel); r4.appendChild(w);
        })(s2);
      }
    }
    return box;
  };

  /* ---------- 學生端 ---------- */
  var L = { helpKey: '', helpAt: 0, peekKey: -1, peekAt: 0, holdUntil: 0, sel: [], selCnt: -1, sent: -1, round: -1, evn: -1, show: null, anim: {} };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦' + CN[tb.view.chr[i]] : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function rc(i) { if (i <= 6) return [0, i]; if (i <= 12) return [i - 6, 6]; if (i <= 18) return [6, 18 - i]; return [24 - i, 0]; }
  function fmtT(ms) { var s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function evHtml(tb, it) {
    if (it.k === 'jump') {
      var names = it.took.map(function (t) { return who(tb, t.s) + (t.n ? '（被拔走 ' + t.n + ' 根 🪶）' : '（沒有羽毛可拔）'); }).join('、');
      return { icon: '🪶', title: who(tb, it.s) + ' 超越了別隻雞！', html: '超越了：' + names + (tb.view.ver === 2 ? '<br>被超越的雞，要重新安放自己的便便 💩' : '') };
    }
    if (it.k === 'poop') return { icon: '💩', title: who(tb, it.s) + ' 踩到便便了！', html: '前面有 ' + who(tb, it.o) + ' 的便便，' + (it.took ? who(tb, it.s) + ' 被扣 1 根羽毛給 ' + who(tb, it.o) + '。' : who(tb, it.s) + ' 沒有羽毛可以扣。') + '這坨便便被清掉了。' };
    if (it.k === 'fate') return { icon: it.lucky ? '🍀' : '💨', title: it.lucky ? who(tb, it.s) + ' 翻轉命運成功！前進一步' : who(tb, it.s) + ' 這張是空的…', html: it.lucky ? '落後一整圈的好運來了！' : '沒關係，接著再翻一張，繼續追上去。' };
    if (it.k === 'rs1') return { icon: '🔀', title: '老師預告：本輪結束後要重新洗牌！', html: '這一輪還是用原來的位置，翻完這一輪，所有雞窩牌會重新洗牌，位置要重新記囉。' };
    if (it.k === 'rs2') return { icon: '🔀', title: '雞窩牌重新洗牌了！', html: '所有雞窩牌的位置都換過了，之前記的位置不算數，大家重新來。' };
    return null;
  }
  /* 開局抽角色：每個位置的圖像快速跳動，依序停在分配到的角色上 */
  function drawRoles(tb, fx, ms) {
    var v = tb.view, np = v.np, pool = Math.max(np, 4), old = document.getElementById('fe-draw'); if (old) old.remove();
    var ov = el('div', 'fe-draw'); ov.id = 'fe-draw';
    ov.appendChild(el('h2', '', '🎲 抽角色囉！'));
    var row = el('div', 'fe-dslots'), slots = [], order = [];
    for (var i = 0; i < np; i++) if (i !== tb.seat) order.push(i);
    order.push(tb.seat);
    for (i = 0; i < np; i++) {
      var c = el('div', 'fe-ds' + (i === tb.seat ? ' me' : '')), im = el('img'); im.src = IMG('c' + (Math.floor(Math.random() * pool) + 1)); im.draggable = false;
      c.appendChild(el('small', '', i === tb.seat ? '你' : tb.seats[i].bot ? '電腦' : short(tb, i))); c.appendChild(im);
      var cap = el('b', '', '？'); c.appendChild(cap); row.appendChild(c); slots.push({ c: c, im: im, cap: cap, done: false });
    }
    ov.appendChild(row);
    var msg = el('div', 'fe-dmsg', '角色是系統隨機分配的…'); ov.appendChild(msg);
    document.body.appendChild(ov);
    var tick = setInterval(function () { slots.forEach(function (sl) { if (!sl.done) sl.im.src = IMG('c' + (Math.floor(Math.random() * pool) + 1)); }); }, 90);
    order.forEach(function (seatIdx, k) {
      setTimeout(function () {
        var sl = slots[seatIdx]; sl.done = true; sl.im.src = IMG('c' + (v.chr[seatIdx] + 1)); sl.cap.textContent = CN[v.chr[seatIdx]]; sl.c.classList.add('done'); fx.snd(seatIdx === tb.seat ? 'turn' : 'tap');
        if (seatIdx === tb.seat) msg.textContent = '你是「' + CN[v.chr[seatIdx]] + '」！';
      }, 1200 + k * 700);
    });
    var endT = Math.max(2500, ms - 300);
    setTimeout(function () { clearInterval(tick); ov.classList.add('out'); setTimeout(function () { ov.remove(); }, 400); }, endT);
    ov.addEventListener('click', function () { if (slots.every(function (x) { return x.done; })) { clearInterval(tick); ov.remove(); } });
  }
  function normView(v) { if (v && !v.chr) { v.chr = []; for (var i = 0; i < v.np; i++) v.chr.push(i); } if (v && !v.logs) v.logs = []; return v; }
  mod.onUpdate = function (prev, tb, fx) {
    var v = normView(tb.view); if (prev) normView(prev.view);
    if (L.round !== tb.round) { L.round = tb.round; L.sel = []; L.sent = -1; L.evn = v.ev ? v.ev.n : -1; }
    var nowT = Date.now(), flipped = false;
    if (prev && prev.view.cnt !== v.cnt && v.last && JSON.stringify(prev.view.last) !== JSON.stringify(v.last)) {
      flipped = true; L.show = { cnt: v.cnt, until: nowT + 1500, noteAt: nowT + 450 };
    }
    if (prev && prev.view.cnt !== v.cnt) {
      for (var s0 = 0; s0 < v.np; s0++) {
        var a0 = prev.view.pos[s0], b0 = v.pos[s0];
        if (a0 >= 0 && b0 >= 0 && a0 !== b0 && prev.view.poop.join() !== undefined) {
          var ra = rc(a0), rb = rc(b0);
          L.anim[s0] = { dx: ra[1] - rb[1], dy: ra[0] - rb[0], t0: nowT + (flipped ? 1000 : 0) };
        }
      }
    }
    if (flipped && v.last) {
      var ok = v.last.fate ? v.last.lucky : v.last.hit >= 0;
      fx.snd(ok ? 'move' : 'pop');
      if (v.turn === tb.seat && !tb.res && v.last.s !== tb.seat) setTimeout(function () { fx.snd('turn'); }, 450);
    }
    L.holdUntil = v.hold > 0 ? Date.now() + v.hold : 0;
    if (v.cnt === 0 && v.hold > 800 && !tb.res && L.drawKey !== tb.round + ':' + tb.seat) { L.drawKey = tb.round + ':' + tb.seat; drawRoles(tb, fx, v.hold); }
    if (v.ev && v.ev.n !== L.evn && v.hold > 0 && !tb.res) {
      var parts = v.ev.items.map(function (it) { return evHtml(tb, it); }).filter(Boolean);
      if (parts.length) { var dly = flipped ? 1900 : 0, ov = { icon: parts[0].icon, title: parts[0].title, html: parts.map(function (p, i) { return (i ? '<hr><b>' + p.title + '</b><br>' : '') + p.html; }).join(''), ms: Math.max(1500, v.hold - dly) }; if (dly) setTimeout(function () { BG.fxOverlay(ov); }, dly); else BG.fxOverlay(ov); }
      if (v.ev.items.some(function (it) { return it.k === 'jump' || it.k === 'poop'; })) fx.snd('cap');
    }
    if (v.ev) L.evn = v.ev.n;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '集滿 ' + v.need + ' 根羽毛就贏了 🪶');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = normView(tb.view), seat = tb.seat, out = v.out.indexOf(seat) >= 0, held = Date.now() < L.holdUntil;
    if (held && !tb.res) { clearTimeout(L.ht); L.ht = setTimeout(function () { ctx.rerender(); }, L.holdUntil - Date.now() + 80); }
    var nowR = Date.now(), busyEnd = L.show && L.show.cnt === v.cnt ? L.show.until : 0;
    Object.keys(L.anim).forEach(function (k) { var a = L.anim[k]; if (a.t0 + 800 > nowR) busyEnd = Math.max(busyEnd, a.t0 + 800); });
    var busy = nowR < busyEnd;
    if (busy) { clearTimeout(L.bt); L.bt = setTimeout(function () { ctx.rerender(); }, busyEnd - nowR + 60); }
    if (L.show && L.show.cnt === v.cnt && nowR < L.show.noteAt) { clearTimeout(L.nt); L.nt = setTimeout(function () { ctx.rerender(); }, L.show.noteAt - nowR + 30); }
    if (L.selCnt !== v.cnt) { L.selCnt = v.cnt; L.sel = []; }
    if (v.all && L.peekKey !== tb.round + ':' + v.cnt) { L.peekKey = tb.round + ':' + v.cnt; L.peekAt = nowR; }
    var peekLeft = v.all ? (v.peeksec || 5) * 1000 - (nowR - L.peekAt) : 0;
    if (peekLeft > 0) { clearTimeout(L.pt); L.pt = setTimeout(function () { ctx.rerender(); }, Math.min(peekLeft + 30, 400)); }
    var hp = v.help; if (hp && L.helpKey !== tb.round + ':' + hp.id) { L.helpKey = tb.round + ':' + hp.id; L.helpAt = nowR; }
    var helpLeft = hp ? hp.sec * 1000 - (nowR - L.helpAt) : 0, hpCell = {}, hpTile = {};
    if (helpLeft > 0) { clearTimeout(L.ht2); L.ht2 = setTimeout(function () { ctx.rerender(); }, Math.min(helpLeft + 30, 400)); hp.cells.forEach(function (c, i) { hpCell[c] = i + 1; }); hp.tiles.forEach(function (t) { hpTile[t.p] = t; }); }
    var live = !tb.res && !out && !held && !busy && L.sent !== v.cnt && !(peekLeft > 0);
    var placing = live && v.pl === seat, myTurn = live && v.pl < 0 && v.turn === seat;
    var asMs = (v.aidsec || 3) * 1000;
    if (myTurn && v.rec) { var rk = tb.round + ':' + v.cnt; if (L.recKey !== rk) { L.recKey = rk; L.recAt = nowR; } }
    if ((v.mf || 1) > 1 && L.sel.length) {
      if (!L.selAt) L.selAt = nowR;
      if (nowR - L.selAt > asMs) { L.sel = []; L.selAt = 0; ctx.toast('時間到，選的牌蓋回去了'); }
      else { clearTimeout(L.st); L.st = setTimeout(function () { ctx.rerender(); }, 400); }
    } else L.selAt = 0;
    var fate = v.fate && v.fate.s === v.turn ? v.fate : null, mf = v.mf || 1;
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; L.sel = []; ctx.send(t, d); ctx.rerender(); }
    var wrap = el('div', 'fe-table fe-v' + v.ver);
    (function () {
      var vw = document.documentElement.clientWidth, vh = window.innerHeight, land = vw / vh > 1.2 && vw >= 640;
      var b = land ? Math.min(vh - 78, (vw - 60) * .62) : Math.min(vw - 28, vh - (120 + Math.max(300, vh * 0.3)));
      b = Math.max(260, Math.floor(b)); wrap.style.setProperty('--b', b + 'px');
    })();
    var main = el('div', 'fe-main'), side = el('div', 'fe-side'), top = el('div', 'fe-top');
    // 狀態列
    var st = el('div', 'fe-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (peekLeft > 0) { st.textContent = '👁 記住位置！' + Math.ceil(peekLeft / 1000) + ' 秒後蓋回去'; st.className = 'fe-status me'; }
    else if (held) { st.textContent = '⏸️ 請看畫面…'; st.className = 'fe-status hold'; }
    else if (v.pl >= 0) { st.textContent = v.pl === seat ? '💩 請把你的便便放在一個發光的空格' : who(tb, v.pl) + ' 正在安放便便…'; if (v.pl === seat) st.className = 'fe-status me'; }
    else if (fate) { st.textContent = v.turn === seat ? '🍀 命運三選一！點一張亮起來的雞窩牌' : who(tb, v.turn) + ' 正在選命運牌…'; if (v.turn === seat) st.className = 'fe-status me'; }
    else if (myTurn) { st.textContent = L.sel.length ? '再點一次「同一張牌」就翻開！' : mf > 1 ? '輪到你了！可以選 1～' + mf + ' 張，再點同一張翻開' : '輪到你了！點一張雞窩牌，再點一次翻開'; st.className = 'fe-status me'; }
    else st.textContent = busy && !tb.res ? '👀 看清楚喔…' : '輪到 ' + who(tb, v.turn) + '…';
    top.appendChild(st);
    // 棋盤
    var bd = el('div', 'fe-ring'), h = '';
    var tpos = v.pos[v.turn], row = {};
    if (!tb.res && v.tgt >= 0 && tpos >= 0) for (var c0 = (tpos + 1) % 24, k0 = 0; c0 !== v.tgt && k0 < 24; c0 = (c0 + 1) % 24, k0++) row[c0] = 1;
    var freeSet = {};
    if (placing) for (var c1 = 0; c1 < 24; c1++) { var occ = false; for (var q = 0; q < v.np; q++) if (v.pos[q] === c1 || v.poop[q] === c1) occ = true; if (!occ) freeSet[c1] = 1; }
    for (var i = 0; i < 24; i++) {
      var rr = rc(i), cls = 'fe-cell' + (i === v.tgt && !tb.res ? ' tgt' : '') + (row[i] ? ' row' : '') + (freeSet[i] ? ' free' : '') + (hpCell[i] ? ' hp' : ''), inner = '<img class="egg" src="' + IMG('t' + pad(v.ring[i] + 1)) + '" alt="' + NAMES[v.ring[i]] + '" draggable="false">';
      for (var s = 0; s < v.np; s++) {
        if (v.pos[s] === i) { var an = L.anim[s], hopSt = ''; if (an && an.t0 + 800 > nowR) hopSt = ' hop" style="--dx:' + an.dx + ';--dy:' + an.dy + ';--dl:' + (an.t0 - nowR) + 'ms'; inner += '<div class="pcw' + (s === v.turn && !tb.res ? ' act' : '') + hopSt + '"><img class="chk" src="' + IMG('c' + (v.chr[s] + 1)) + '" alt="' + CN[v.chr[s]] + '" draggable="false">' + (s === seat ? '<em class="me">我</em>' : '') + '</div><b class="ft" style="background:' + SEATC[v.chr[s]] + '">🪶' + v.f[s] + '</b>'; }
        if (v.poop[s] === i) inner += '<img class="poo" src="' + IMG('poop') + '" alt="便便" draggable="false"><i class="pdot" style="background:' + SEATC[v.chr[s]] + '"></i>';
      }
      h += '<div class="' + cls + '"' + (hpCell[i] ? ' data-n="' + '①②③'.charAt(hpCell[i] - 1) + '"' : '') + ' style="grid-row:' + (rr[0] + 1) + ';grid-column:' + (rr[1] + 1) + '" data-c="' + i + '">' + inner + '</div>';
    }
    bd.innerHTML = h;
    [].forEach.call(bd.querySelectorAll('.fe-cell.free'), function (e) { e.addEventListener('click', function () { ctx.snd('tap'); send('place', { c: +e.getAttribute('data-c') }); }); });
    // 中央：目標＋雞窩牌
    var ctr = el('div', 'fe-center'), tgt = el('div', 'fe-target');
    if (!tb.res && v.tpic >= 0 && v.pl < 0) tgt.innerHTML = '<span>' + (v.turn === seat ? '你' : short(tb, v.turn)) + ' 要找</span><img src="' + IMG('n' + pad(v.tpic + 1)) + '" alt=""><b>' + NAMES[v.tpic] + '</b>' + (v.jn ? '<em>超越 ' + v.jn + ' 隻</em>' : '');
    ctr.appendChild(tgt);
    var nest = el('div', 'fe-nest'), showing = L.show && L.show.cnt === v.cnt && nowR < L.show.until, lastPs = showing && v.last ? v.last.ps : [];
    for (var p = 0; p < 12; p++) {
      var up = lastPs.indexOf(p) >= 0, li = up ? lastPs.indexOf(p) : -1, lit = fate && fate.lit.indexOf(p) >= 0;
      var t = el('button', 'fe-tile' + (up ? ' up' : '') + (up && !v.last.fate ? (v.last.oks[li] ? ' ok' : ' bad') : '') + (lit ? ' lit' : '') + (L.sel.indexOf(p) >= 0 ? ' sel' : '') + (fate && !lit ? ' off' : '')); t.type = 'button'; t.setAttribute('data-h', 'n' + p);
      var face = lit && !up ? 'fate' : 'nestback', body;
      if (up && v.last.fate) body = '<img src="' + IMG('fate') + '" alt=""><em>' + (v.last.lucky ? '🍀' : '💨') + '</em>';
      else if (up) body = '<img src="' + IMG('n' + pad(v.last.pics[li] + 1)) + '" alt="' + NAMES[v.last.pics[li]] + '">';
      else if (helpLeft > 0 && hpTile[p]) body = '<img src="' + IMG('n' + pad(hpTile[p].pic + 1)) + '" alt=""><em class="hn">' + hpTile[p].n.map(function (x) { return '①②③'.charAt(x - 1); }).join('') + '</em>';
      else if (peekLeft > 0 && v.all) body = '<img src="' + IMG('n' + pad(v.all[p] + 1)) + '" alt="' + NAMES[v.all[p]] + '">';
      else body = '<img src="' + IMG(face) + '" alt="">';
      t.innerHTML = body + '<u>' + (p + 1) + '</u>';
      if (myTurn && !up && (!fate || lit)) t.addEventListener('click', (function (p) { return function () {
        ctx.snd('tap');
        if (L.sel.indexOf(p) >= 0) return fate ? send('fate', { pos: p }) : send('flip', { ps: L.sel.slice() });
        if (fate || mf <= 1) L.sel = [p]; else { if (!L.sel.length) L.selAt = Date.now(); if (L.sel.length >= mf) L.sel.shift(); L.sel.push(p); }
        ctx.rerender();
      }; })(p));
      else if (!myTurn || up) t.disabled = true;
      nest.appendChild(t);
    }
    ctr.appendChild(nest);
    var note = el('div', 'fe-note');
    if (helpLeft > 0) { note.textContent = '👀 老師讓你看前面三格的牌！記住 ①②③ 在哪裡（' + Math.ceil(helpLeft / 1000) + ' 秒）'; note.className = 'fe-note hi'; } else {
    if (v.last && !tb.res && !(L.show && L.show.cnt === v.cnt && nowR < L.show.noteAt)) {
      var lw = who(tb, v.last.s);
      note.textContent = v.last.fate ? lw + ' 選了命運牌：' + (v.last.lucky ? '🍀 前進一步！' : '💨 空的…') : lw + ' 翻到「' + v.last.pics.map(function (x) { return NAMES[x]; }).join('、') + '」' + (v.last.hit >= 0 ? ' ✅ 對了！' : ' ❌ 錯了');
    } else note.textContent = v.last && !tb.res ? '翻牌中…' : '雞窩牌上的數字是位置，位置不會變，記起來！';
    }
    ctr.appendChild(note);
    bd.appendChild(ctr);
    main.appendChild(bd);
    // 玩家
    var chips = el('div', 'fe-chips n' + v.np);
    for (var o = 0; o < v.np; o++) {
      var ch = el('div', 'fe-chip' + (o === seat ? ' me' : '') + (o === v.turn && !tb.res ? ' turn' : '') + (v.out.indexOf(o) >= 0 ? ' out' : ''));
      ch.innerHTML = '<img src="' + IMG('c' + (v.chr[o] + 1)) + '" alt=""><span>' + (o === seat ? '我' : tb.seats[o].bot ? CN[v.chr[o]] : short(tb, o)) + '</span><b style="background:' + SEATC[v.chr[o]] + '">🪶' + v.f[o] + '/' + v.need + '</b>' + (v.ver === 2 && v.poop[o] >= 0 ? '<i>💩</i>' : '');
      chips.appendChild(ch);
    }
    side.appendChild(chips);
    var inf = el('div', 'fe-info');
    if (v.limit) inf.appendChild(el('span', 'fe-pill', v.ending ? '⏱️ 最後一輪' : v.tl == null ? '⏱️ 開始後計時' : '⏱️ ' + fmtT(v.tl)));
    if (v.rs === 1) inf.appendChild(el('span', 'fe-pill warn', '🔀 下一輪會預告洗牌'));
    if (v.rs === 2) inf.appendChild(el('span', 'fe-pill warn', '🔀 這一輪結束後洗牌'));
    inf.appendChild(el('span', 'fe-pill', '第 ' + v.rd + ' 輪'));
    if (mf > 1) inf.appendChild(el('span', 'fe-pill warn', '🧠 輔助：一次可翻 ' + mf + ' 張'));
    if (v.peekOn) inf.appendChild(el('span', 'fe-pill warn', '👁 落後一圈可偷看全部牌'));
    if (v.rec) inf.appendChild(el('span', 'fe-pill warn', '🧠 輔助：輪到你時看最近 ' + v.aid.n + ' 次翻牌'));
    side.appendChild(inf);
    if (v.rec && v.turn === seat && v.pl < 0 && !tb.res && myTurn) {
      var rleft = asMs - (nowR - L.recAt), rec = el('div', 'fe-rec');
      if (rleft > 0) { clearTimeout(L.rt); L.rt = setTimeout(function () { ctx.rerender(); }, Math.min(rleft + 30, 500)); }
      rec.appendChild(el('b', '', rleft > 0 ? '🧠 輔助（' + Math.ceil(rleft / 1000) + ' 秒後蓋住）：' : '🧠 輔助紀錄已蓋住'));
      if (rleft > 0 && !v.rec.length) rec.appendChild(el('span', '', '（還沒有）'));
      (rleft > 0 ? v.rec : []).slice().reverse().forEach(function (x) { var s = el('span', 'fe-r ' + (x.ok ? 'ok' : 'bad')); s.innerHTML = '<i style="background:' + SEATC[v.chr[x.s]] + '"></i><u>' + (x.p + 1) + '</u><img src="' + IMG('n' + pad(x.pic + 1)) + '" alt="">' + NAMES[x.pic]; rec.appendChild(s); });
      side.appendChild(rec);
    }
    var lg = el('div', 'fe-log'); lg.appendChild(el('b', '', '最近 5 次翻牌'));
    var lgs = (v.logs || []).filter(function (x) { return !(L.show && L.show.cnt === x.c && nowR < L.show.noteAt); }).slice().reverse();
    if (!lgs.length) lg.appendChild(el('div', 'li', '還沒有人翻牌'));
    lgs.forEach(function (x, i) {
      var li = el('div', 'li' + (i === 0 ? ' new' : '') + (x.fate ? '' : x.hit ? ' ok' : ' bad')), d = el('i'); d.style.background = SEATC[v.chr[x.s]]; li.appendChild(d);
      li.appendChild(document.createTextNode(who(tb, x.s) + (x.fate ? ' 選命運牌：' + (x.lucky ? '🍀 前進一步' : '💨 空的') : ' 翻到「' + x.pics.map(function (q) { return NAMES[q]; }).join('、') + '」' + (x.hit ? ' ✅' : ' ❌'))));
      lg.appendChild(li);
    });
    side.appendChild(lg);
    if (!tb.res && !out) {
      var tools = el('div', 'fe-tools');
      if (myTurn && v.peekReady && !fate) tools.appendChild(ctx.button('fe-btn go', '👁 偷看全部牌（' + (v.peeksec || 5) + ' 秒）', function () { send('peek'); }));
      if (myTurn && L.sel.length) tools.appendChild(ctx.button('fe-btn', '取消選擇', function () { L.sel = []; ctx.rerender(); }));
      tools.appendChild(ctx.button('fe-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('fe-btn'));
      side.appendChild(tools);
    }
    wrap.appendChild(top); wrap.appendChild(main); wrap.appendChild(side);
    box.appendChild(wrap);
    // 直式：棋盤放到剛好填滿畫面；放不滿（受寬度限制）時，多出來的高度分給玩家區
    var fitAll = function () {
      if (!wrap.isConnected) return;
      var c0 = side.querySelector('.fe-chips'), l0 = side.querySelector('.fe-log'); if (c0) c0.style.minHeight = ''; if (l0) l0.style.minHeight = ''; wrap.style.setProperty('--sc', 1);
      var vw2 = document.documentElement.clientWidth, vh2 = window.innerHeight;
      var land = vw2 / vh2 > 1.2 && vw2 >= 640;
      var cur = parseFloat(wrap.style.getPropertyValue('--b')) || 300, avail = vh2 - (wrap.getBoundingClientRect().top + window.scrollY);
      if (!land) {
        var other = top.offsetHeight + side.offsetHeight + 24, want = Math.max(240, Math.floor(Math.min(vw2 - 28, avail - other - 4)));
        if (Math.abs(want - cur) > 2) wrap.style.setProperty('--b', want + 'px');
      }
      var sc = 1;
      for (var pass = 0; pass < 4; pass++) {
        wrap.style.setProperty('--sc', sc);
        var slack = land ? avail - (top.offsetHeight + side.offsetHeight + 8) - 30 : avail - (top.offsetHeight + side.offsetHeight + main.offsetHeight + 24) - 4;
        if (Math.abs(slack) < 6) break;
        var ns = Math.max(1, Math.min(2.4, Math.max(1, side.offsetWidth / 330), sc * (1 + slack / Math.max(120, side.offsetHeight) * 0.85)));
        if (Math.abs(ns - sc) < .01) break; sc = ns;
      }
      var rest = land ? avail - (top.offsetHeight + side.offsetHeight + 8) - 30 : avail - (top.offsetHeight + side.offsetHeight + main.offsetHeight + 24) - 4;
      if (rest > 10) {
        var ch2 = side.querySelector('.fe-chips'), lg2 = side.querySelector('.fe-log');
        if (ch2) ch2.style.minHeight = (ch2.offsetHeight + rest * .5) + 'px';
        if (lg2) lg2.style.minHeight = (lg2.offsetHeight + rest * .5) + 'px';
      }
    };
    setTimeout(fitAll, 80); setTimeout(fitAll, 600);
  };

  function tileFigs() { var h = '<div class="g-figs">'; for (var i = 0; i < 12; i++) h += '<figure class="g-fig"><img src="' + IMG('t' + pad(i + 1)) + '" alt="" style="max-width:70px"><figcaption>' + NAMES[i] + '</figcaption></figure>'; return h + '</div>'; }
  mod.guide = {
    student: [
      { h: '遊戲目標', html: '<p>每隻雞一開始都有 <b>1 根羽毛 🪶</b>。靠「記憶力」翻對雞窩牌，往前跳、超越別的雞，把別人的羽毛拔過來！<b>第一個集滿羽毛的人獲勝</b>（2～4 人要集滿全部、5 人集滿 5 根、6 人先集到 5 根就贏）。</p>' },
      { h: '畫面怎麼看', html: '<p>一開局系統會<b>隨機抽角色</b>（每個人抽到哪隻雞或鴨都是運氣），畫面會顯示抽籤動畫，最後告訴你「你是誰」。你的雞身上有黃色「我」字。</p><ul><li><b>外圈的蛋形跑道</b>有 24 格，上面有 12 種圖案，每種出現 2 次。雞只會<b>順時針</b>往前走。</li><li><b>中間 12 張蓋著的八角形雞窩牌</b>，每種圖案剛好有 1 張，<b>位置固定不會變</b>（上面的數字是位置，除非老師說要重新洗牌）。</li>' + '<li>金色發光的那一格，就是你這回合<b>要找的目標格</b>，中間會顯示要找哪種圖案。</li></ul>' + tileFigs() },
      { h: '輪到你怎麼玩（版本 1 基本版）', html: '<ol><li>看目標格是什麼圖案（例如🥕紅蘿蔔）。</li><li>在中間<b>點一張雞窩牌翻開</b>。</li><li><b>翻對了</b>（圖案一樣）：你的雞跳到目標格！中間如果有別的雞擋著，你<b>跳過牠們</b>，每隻被超越的雞要被你<b>拔走 1 根羽毛</b>。然後你<b>繼續翻下一張</b>。</li><li><b>翻錯了</b>：這回合結束，換下一位。翻開的牌會蓋回去，要記得它在哪裡！</li><li>集滿羽毛就立刻獲勝。</li></ol><p>小提醒：大家都看得到你翻的牌，所以別人翻過的牌也要幫忙記！</p>' },
      { h: '版本 2 便便版（豪邁版）— 特別清楚的說明', html: '<p>版本 2 就是基本版再加上<b>便便 💩</b>。每隻雞身後一開始都有自己的一坨便便。請照下面三點看：</p><ol><li><b>便便會擋路，也會「絆人」。</b>便便佔一格，和雞一樣可以被跳過去。如果你<b>翻錯了</b>，而你前面那一排（緊貼在你前面的連續格子）裡有<b>別人的便便</b>，你就踩到了：<b>最靠近你的那坨便便的主人，從你身上拿走 1 根羽毛</b>（你沒有羽毛就不用給）。那坨被踩到的便便會被清掉。</li><li><b>被超越的雞要重新放便便。</b>有人跳過你的雞時，你要馬上把自己的便便<b>放到任何一個空格</b>（畫面上發光的格子，點一下就放好）。這時候其他人要等你放好。可以放在對手前面一格，等他翻錯就賺到羽毛！</li><li>其他規則和基本版一模一樣：翻對了可以繼續翻、翻錯換人、集滿羽毛獲勝。</li></ol><p>第一次玩的話，先照基本版玩一下，看懂了再加便便，也很好！</p>' },
      { h: '翻轉命運', html: '<p>如果你是<b>最後一名，而且已經落後第一名整整一圈（24 格）</b>，輪到你時系統會給你一次「<b>命運三選一</b>」：3 張雞窩牌會亮起來，只有亮的可以翻。其中 <b>1 張</b>會讓你<b>前進一步</b>（🍀），另外 2 張是空的（💨）。翻開後只會看到結果，不會看到圖案。全憑運氣！之後你再繼續翻牌。每多落後一圈，可以再得到一次。</p>' },
      { h: '暫停公告', html: '<p>有人超越別人、踩到便便、命運牌、或老師預告洗牌時，畫面會跳出說明並<b>暫停幾秒</b>，這時候大家都不能動作，看清楚發生什麼事。</p>' },
      { h: '計分', html: '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 先集滿羽毛（或時間到時羽毛最多）</td><td>3 分</td></tr><tr><td>🤝 平手</td><td>各 1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>有時間限制時，時間到會把這一輪打完，羽毛最多的人獲勝（一樣多就一起贏）。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「益智」→「就我的毛最多」，每桌 2～6 人（4 人最剛好，一局約 10～15 分鐘）。</li><li>開桌前可選：<b>玩法</b>（版本 1 基本版／版本 2 便便版）、<b>限時</b>、<b>記憶輔助</b>。</li><li>點某一桌打開「桌面管理」：可<b>預約重新洗牌</b>、<b>偷看雞窩牌位置</b>、<b>讓分（給同學看前三格牌的位置）</b>、<b>設定誰一次翻幾張</b>。</li><li>暫停公告的秒數（2～8 秒）可在老師面板調整。</li></ol>' },
      { h: '各功能怎麼用', html: '<ul><li><b>重新洗牌：</b>按下後<b>不會馬上洗</b>。遊戲繼續到下一輪開始前，系統會暫停並公告「這一輪結束後會洗牌」，那一輪結束後，雞窩牌才全部重新洗過。適合大家都背熟了、想增加難度的時候。</li><li><b>讓分：</b>遊戲中隨時可用。在「桌面管理」選一位同學（不一定是最落後的，可依羽毛最少、落後第一名最遠來判斷）和秒數，他的畫面會把「他前面三格」對應的雞窩牌翻開給他看（標 ①②③），時間到就蓋回去，其他人看不到。</li><li><b>落後偷看（獨立功能，可和記憶輔助同時開）：</b>開啟後，「最後一名而且落後第一名整整一圈」的同學，輪到時會出現「偷看全部牌」按鈕，所有雞窩牌會翻開給他看限時的幾秒，只有他自己的畫面看得到；每多落後一圈可再用一次。</li><li><b>偷看時間（3～10 秒）：</b>可另外設定偷看全部牌的秒數。</li><li><b>輔助顯示時間（2～5 秒）：</b>輔助只有輪到的同學自己的畫面才看得到，而且只顯示這麼久就蓋住；一次翻多張時，選了牌超過時間沒翻，牌也會蓋回去。</li><li><b>記憶輔助（二選一）：</b>① 顯示最近 2～6 次的翻牌紀錄（含位置與圖案）；② 讓真人同學一次翻 2～3 張，只要其中一張對就算對（可針對個別同學開關）。</li><li><b>翻轉命運：</b>落後第一名整整一圈的最後一名，會自動得到「命運三選一」，增加逆轉的機會，也讓程度弱的孩子不會一直挫折。</li><li><b>時間到：</b>預設 15 分鐘，時間到那一輪打完，羽毛最多的人贏，一樣多就一起贏。</li></ul>' },
      { h: '教學重點', html: '<ul><li>訓練<b>工作記憶、視覺記憶與位置記憶</b>，也練習專注看別人翻的牌。</li><li>12 種農場圖案可以延伸做「詞語」「類別」討論（蔬菜、動物、農具…）。</li><li>便便版有一點「搗蛋」，可以討論：被超越時的心情怎麼調整？輸了怎麼說「下次加油」？</li><li>角色與圖案為原創插畫，玩法參考市售「拔毛運動會」類記憶遊戲。</li></ul>' }
    ]
  };
  mod.onReject = function () { L.sent = -1; };
  BG.register('feather-race', mod);
})();
