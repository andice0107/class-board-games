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
  return { COLS: COLS, CN: CN, info: info, pool: pool, sortRack: sortRack, sortNum: sortNum, analyze: analyze, rackValue: rackValue, botPlay: botPlay, tile: tile, shuffle: shuffle };
})();
