/* 拉密：106 張數字牌（1～13，紅藍黃黑各兩套）＋2 張鬼牌。
   牌的編號 0～105：0～103 是數字牌，104、105 是鬼牌。 */
window.RK = (function () {
  'use strict';
  var COLS = ['#d62828', '#1d4ed8', '#e08e0b', '#1b1b22'], CN = ['紅', '藍', '黃', '黑'];
  function info(id) { if (id >= 104) return { j: true, c: -1, n: 0 }; var k = id % 52; return { j: false, c: Math.floor(k / 13), n: k % 13 + 1 }; }
  function pool() { var p = []; for (var i = 0; i < 106; i++) p.push(i); return shuffle(p); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sortRack(r) { return r.sort(function (a, b) { var x = info(a), y = info(b); if (x.j !== y.j) return x.j ? 1 : -1; return x.c - y.c || x.n - y.n || a - b; }); }
  function sortNum(r) { return r.sort(function (a, b) { var x = info(a), y = info(b); if (x.j !== y.j) return x.j ? 1 : -1; return x.n - y.n || x.c - y.c || a - b; }); }
  /* 判斷一組牌：回傳 {ok, kind:'group'|'run', sum, order:[排好的 id]} */
  function analyze(set) {
    if (!set || set.length < 3) return { ok: false, why: '至少要 3 張' };
    var js = set.filter(function (id) { return id >= 104; }), ns = set.filter(function (id) { return id < 104; }).map(function (id) { var t = info(id); t.id = id; return t; });
    if (!ns.length) return { ok: false };
    // 同數字不同顏色（3～4 張）
    if (ns.every(function (t) { return t.n === ns[0].n; })) {
      var cs = {}; var dup = ns.some(function (t) { if (cs[t.c]) return true; cs[t.c] = 1; return false; });
      if (!dup && set.length <= 4) return { ok: true, kind: 'group', sum: ns[0].n * set.length, order: ns.sort(function (a, b) { return a.c - b.c; }).map(function (t) { return t.id; }).concat(js) };
      if (dup) return { ok: false, why: '同數字的一組不能有重複顏色' };
      return { ok: false, why: '同數字最多 4 張' };
    }
    // 同顏色連續數字
    if (!ns.every(function (t) { return t.c === ns[0].c; })) return { ok: false, why: '要同顏色連號，或同數字不同顏色' };
    ns.sort(function (a, b) { return a.n - b.n; });
    for (var i = 1; i < ns.length; i++) if (ns[i].n === ns[i - 1].n) return { ok: false, why: '連號裡不能有重複數字' };
    var len = set.length, lo = ns[0].n, hi = ns[ns.length - 1].n;
    if (hi - lo + 1 > len || len > 13) return { ok: false, why: '中間缺的數字太多' };
    var start = lo, extra = len - (hi - lo + 1);
    var end = hi + extra; if (end > 13) { start = lo - (end - 13); end = 13; }
    if (start < 1) return { ok: false };
    var order = [], jl = js.slice(), k = 0, sum = 0;
    for (var n = start; n <= end; n++) { sum += n; if (k < ns.length && ns[k].n === n) order.push(ns[k++].id); else order.push(jl.shift()); }
    return { ok: true, kind: 'run', sum: sum, order: order };
  }
  function rackValue(r) { return r.reduce(function (a, id) { return a + (id >= 104 ? 30 : info(id).n); }, 0); }

  /* ---------- 電腦 ---------- */
  /* 從手牌找出所有可能的組合（不含鬼牌，或用一張鬼牌補一個洞） */
  function melds(rack) {
    var out = [], js = rack.filter(function (id) { return id >= 104; }), by = {};
    rack.forEach(function (id) { if (id < 104) { var t = info(id); (by[t.c + ':' + t.n] = by[t.c + ':' + t.n] || []).push(id); } });
    function one(c, n) { var l = by[c + ':' + n]; return l && l[0]; }
    for (var n = 1; n <= 13; n++) { // 同數字
      var have = []; for (var c = 0; c < 4; c++) if (one(c, n) != null) have.push(one(c, n));
      if (have.length >= 3) { out.push(have.slice(0, 3)); if (have.length === 4) { out.push(have.slice()); for (var x = 0; x < 4; x++) out.push(have.filter(function (_, i) { return i !== x; })); } }
      if (have.length === 2 && js.length) out.push(have.concat([js[0]]));
    }
    for (var c2 = 0; c2 < 4; c2++) for (var s = 1; s <= 11; s++) for (var e = s + 2; e <= 13; e++) { // 連號
      var ids = [], miss = 0;
      for (var m = s; m <= e; m++) { var t = one(c2, m); if (t == null) { miss++; ids.push(null); } else ids.push(t); }
      if (miss > js.length || miss * 1 > 1 || (ids[0] == null && ids[ids.length - 1] == null)) continue;
      var jk = js.slice(); out.push(ids.map(function (v) { return v == null ? jk.shift() : v; }));
    }
    return out.filter(function (m) { return analyze(m).ok; });
  }
  /* 挑一組互不重複的組合，讓放出去的牌最多（level 4 用回溯，其他用貪心） */
  function bestCombo(rack, full) {
    var ms = melds(rack).sort(function (a, b) { return b.length - a.length || analyze(b).sum - analyze(a).sum; });
    if (!full) { var used = {}, pick = []; ms.forEach(function (m) { if (m.every(function (id) { return !used[id]; })) { pick.push(m); m.forEach(function (id) { used[id] = 1; }); } }); return pick; }
    var best = [], bestN = 0, steps = 0;
    (function go(i, used, cur, n) {
      if (++steps > 4000) return;
      if (n > bestN) { bestN = n; best = cur.slice(); }
      for (var k = i; k < ms.length; k++) { var m = ms[k]; if (m.some(function (id) { return used[id]; })) continue; m.forEach(function (id) { used[id] = 1; }); cur.push(m); go(k + 1, used, cur, n + m.length); cur.pop(); m.forEach(function (id) { delete used[id]; }); }
    })(0, {}, [], 0);
    return best;
  }
  /* 提示用：從手牌湊出「點數合計最大」的一批互不重複的組合（回溯，有步數上限） */
  function bestBySum(rack) {
    var ms = melds(rack).map(function (m) { return { m: m, s: analyze(m).sum }; }).sort(function (a, b) { return b.s - a.s; });
    var best = [], bestS = 0, steps = 0;
    (function go(i, used, cur, sum) {
      if (sum > bestS) { bestS = sum; best = cur.slice(); }
      if (++steps > 6000) return;
      for (var k = i; k < ms.length; k++) { var x = ms[k]; if (x.m.some(function (id) { return used[id]; })) continue; x.m.forEach(function (id) { used[id] = 1; }); cur.push(x.m); go(k + 1, used, cur, sum + x.s); cur.pop(); x.m.forEach(function (id) { delete used[id]; }); }
    })(0, {}, [], 0);
    return { combos: best, sum: bestS };
  }
  /* ---------- 拆開桌上的牌重組 ----------
     把「桌上的牌（不含有鬼牌的組合）＋要加進去的手牌」重新分成合法的組合。
     每次挑數字最小的一張：它不是在「從它開始的同色連號」，就是在「同數字不同色」那一組裡。 */
  function kk(id) { var t = info(id); return t.c * 13 + t.n - 1; }
  function solve(cnt, limit) {
    var steps = 0, fail = {};
    function go() {
      if (++steps > limit) throw 0;
      var x = -1; for (var n0 = 0; n0 < 13 && x < 0; n0++) for (var c0 = 0; c0 < 4; c0++) if (cnt[c0 * 13 + n0]) { x = c0 * 13 + n0; break; }
      if (x < 0) return [];
      var sk = cnt.join(''); if (fail[sk]) return null;
      var c = Math.floor(x / 13), n = x % 13, r, i;
      // 同色連號，從 x 開始
      var run = [x]; cnt[x]--;
      for (var e = n + 1; e < 13 && cnt[c * 13 + e]; e++) {
        cnt[c * 13 + e]--; run.push(c * 13 + e);
        if (run.length >= 3) { r = go(); if (r) { run.forEach(function (k) { cnt[k]++; }); return [run.slice()].concat(r); } }
      }
      run.forEach(function (k) { cnt[k]++; });
      // 同數字不同色
      var oth = []; for (var o = 0; o < 4; o++) if (o !== c && cnt[o * 13 + n]) oth.push(o * 13 + n);
      var subs = []; if (oth.length === 3) subs.push(oth.slice());
      for (i = 0; i < oth.length; i++) for (var j = i + 1; j < oth.length; j++) subs.push([oth[i], oth[j]]);
      for (i = 0; i < subs.length; i++) {
        var gp = [x].concat(subs[i]); gp.forEach(function (k) { cnt[k]--; });
        r = go(); gp.forEach(function (k) { cnt[k]++; });
        if (r) return [gp].concat(r);
      }
      fail[sk] = 1; return null;
    }
    try { return go(); } catch (er) { return undefined; }
  }
  /* 回傳 {table: 新桌面, used: 用到的手牌} 或 null。quick=true 只要找到一個能加的就停 */
  function rearrange(table, rack, quick) {
    var fixed = [], free = [];
    table.forEach(function (s) { if (s.some(function (id) { return id >= 104; })) fixed.push(s.slice()); else free = free.concat(s); });
    var base = []; for (var i = 0; i < 52; i++) base.push(0);
    free.forEach(function (id) { base[kk(id)]++; });
    var cand = rack.filter(function (id) { return id < 104; }), added = [];
    // 同一種牌（顏色＋數字）只試一次
    var seenK = {}; cand = cand.filter(function (id) { var k = kk(id); if (seenK[k]) return false; seenK[k] = 1; return true; });
    function feas(extra) { var c = base.slice(); extra.forEach(function (id) { c[kk(id)]++; }); if (c.some(function (v) { return v > 2; })) return null; return solve(c, 2500); }
    var changed = true, pairs = 0;
    while (changed) {
      changed = false;
      for (var a = 0; a < cand.length; a++) { if (added.indexOf(cand[a]) >= 0) continue; if (feas(added.concat([cand[a]]))) { added.push(cand[a]); changed = true; if (quick) break; } }
      if (quick && added.length) break;
      if (!changed) {
        outer: for (var p = 0; p < cand.length; p++) for (var q = p + 1; q < cand.length; q++) {
          if (added.indexOf(cand[p]) >= 0 || added.indexOf(cand[q]) >= 0) continue;
          if (++pairs > 250) break outer;
          if (feas(added.concat([cand[p], cand[q]]))) { added.push(cand[p], cand[q]); changed = true; break outer; }
        }
      }
      if (quick && added.length) break;
    }
    if (!added.length) return null;
    var sol = feas(added); if (!sol) return null;
    var byK = {}; free.concat(added).forEach(function (id) { (byK[kk(id)] = byK[kk(id)] || []).push(id); });
    return { table: fixed.concat(sol.map(function (s) { return s.map(function (k) { return byK[k].shift(); }); })), used: added };
  }
  /* 這一回合還有沒有牌可以出？回傳 'open'｜'combo'｜'attach'｜'rearrange'｜null */
  function canPlay(table, rack, opened) {
    if (!opened) return bestBySum(rack).sum >= 30 ? 'open' : null;
    if (melds(rack).length) return 'combo';
    for (var i = 0; i < rack.length; i++) for (var k = 0; k < table.length; k++) if (analyze(table[k].concat([rack[i]])).ok) return 'attach';
    return rearrange(table, rack, true) ? 'rearrange' : null;
  }
  /* 回傳新的桌面（陣列的陣列），或 null 代表要抽牌 */
  function botPlay(table, rack, opened, level) {
    if (level <= 1 && Math.random() < .35) return null;
    var combo = bestCombo(rack, level >= 4), used = {};
    if (!opened) {
      var sum = combo.reduce(function (a, m) { return a + analyze(m).sum; }, 0);
      if (sum < 30) return null;
      return table.map(function (s) { return s.slice(); }).concat(combo.map(function (m) { return analyze(m).order; }));
    }
    var nt = table.map(function (s) { return s.slice(); }).concat(combo);
    combo.forEach(function (m) { m.forEach(function (id) { used[id] = 1; }); });
    if (level >= 3) { // 把剩下的單張接到桌上的組合
      var left = rack.filter(function (id) { return !used[id]; }), changed = true;
      while (changed) {
        changed = false;
        for (var i = 0; i < left.length; i++) {
          if (left[i] >= 104 && level < 4) continue;
          for (var k = 0; k < nt.length; k++) { var trial = nt[k].concat([left[i]]); if (analyze(trial).ok) { nt[k] = trial; used[left[i]] = 1; left.splice(i, 1); changed = true; break; } }
          if (changed) break;
        }
      }
    }
    if (level >= 4) { // 困難：再試著把桌上的牌拆開重組，放進更多手牌
      var rest = rack.filter(function (id) { return !used[id]; }), re = rest.length ? rearrange(nt, rest, false) : null;
      if (re) { nt = re.table; re.used.forEach(function (id) { used[id] = 1; }); }
    }
    if (!Object.keys(used).length) return null;
    return nt.map(function (s) { return analyze(s).order || s; });
  }

  /* ---------- 牌面 ---------- */
  function tile(id, o) {
    o = o || {};
    var t = info(id);
    var face = t.j ? '<svg viewBox="0 0 30 30" class="rk-joker"><circle cx="15" cy="15" r="12" fill="#ffd54f" stroke="#1b1b22" stroke-width="1.6"/><circle cx="11" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><path d="M9 18 Q15 24 21 18" fill="none" stroke="#1b1b22" stroke-width="1.8" stroke-linecap="round"/><path d="M5 9 L9 2 L13 7 L15 1 L17 7 L21 2 L25 9" fill="#e63946" stroke="#1b1b22" stroke-width="1.2"/></svg>'
      : '<b style="color:' + COLS[t.c] + '">' + t.n + '</b><i style="background:' + COLS[t.c] + '"></i>';
    return '<span class="rk-tile' + (o.sel ? ' sel' : '') + (o.mine ? ' mine' : '') + '" data-id="' + id + '">' + face + '</span>';
  }
  return { melds: melds, bestBySum: bestBySum, COLS: COLS, CN: CN, info: info, pool: pool, sortRack: sortRack, sortNum: sortNum, analyze: analyze, rackValue: rackValue, botPlay: botPlay, rearrange: rearrange, canPlay: canPlay, tile: tile, shuffle: shuffle };
})();
