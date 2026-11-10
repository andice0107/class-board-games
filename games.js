/* 遊戲清單：每個遊戲是 games/<id>/ 裡獨立的模組，用 BG.register 加進來 */
window.BG = window.BG || {};
BG.games = BG.games || {};
BG.register = function (id, mod) { mod.id = id; BG.games[id] = mod; };
BG.catalog = [
  { id: 'xiangqi', cat: '棋類', files: ['games/xiangqi/xiangqi.css', 'games/xiangqi/rules.js', 'games/xiangqi/ai.js', 'games/xiangqi/game.js', 'games/xiangqi/guide.js'], title: '中國象棋', icon: '帥', color: '#c0392b', players: '2 人對戰', desc: '楚河漢界，完整規則自動判定輸贏', ready: true },
  { id: 'gomoku', cat: '棋類', files: ['games/gomoku/gomoku.css', 'games/gomoku/rules.js', 'games/gomoku/game.js', 'games/gomoku/guide.js'], title: '五子棋', icon: '五', color: '#4f7a4a', players: '2 人對戰', desc: '橫直斜連成五顆就贏，一分鐘學會', ready: true },
  { id: 'go', cat: '棋類', title: '圍棋', icon: '●', color: '#3d3d3d', players: '2 人對戰', desc: '規劃中', ready: false },
  { id: 'chess', cat: '棋類', title: '西洋棋', icon: '♚', color: '#5b4636', players: '2 人對戰', desc: '規劃中', ready: false },
  { id: 'poker', cat: '牌類', title: '撲克牌', icon: '♠', color: '#2b2d42', players: '2–4 人', desc: '大老二、撿紅點、抽鬼牌、排7、十點半、99、吹牛、射龍門、21點、比大小', ready: false },
  { id: 'uno', cat: '牌類', title: 'UNO', icon: '+4', color: '#e63946', players: '2–6 人', desc: '規劃中', ready: false },
  { id: 'rummikub', cat: '牌類', title: '拉密', icon: '7', color: '#e07a1f', players: '2–4 人', desc: '規劃中', ready: false },
  { id: 'spot-match', cat: '牌類', title: '眼明手快', icon: '👀', color: '#8e44ad', players: '2–8 人', desc: '兩張牌找出唯一相同的圖案（規劃中）', ready: false },
  { id: 'seven-eat-nine', cat: '牌類', title: '7吃9', icon: '7', color: '#d35400', players: '待確認', desc: '規劃中（玩法待確認）', ready: false },
  { id: 'mahjong', cat: '麻將', title: '中國麻將', icon: '中', color: '#1b7f5a', players: '4 人', desc: '規劃中', ready: false },
  { id: 'chinese-checkers', cat: '棋類', title: '三色跳棋', icon: '✦', color: '#2a9d8f', players: '2–3 人', desc: '規劃中', ready: false }
];
BG.meta = function (id) { for (var i = 0; i < BG.catalog.length; i++) if (BG.catalog[i].id === id) return BG.catalog[i]; return null; };

/* 說明視窗：sections = [{h, html}]，用分頁切換 */
BG.showGuide = function (title, sections) {
  var ov = document.createElement('div'); ov.className = 'overlay';
  var box = document.createElement('div'); box.className = 'panel guide'; ov.appendChild(box);
  var hd = document.createElement('div'); hd.className = 'g-hd';
  var h = document.createElement('h2'); h.textContent = title; hd.appendChild(h);
  var x = document.createElement('button'); x.type = 'button'; x.className = 'btn small'; x.textContent = '✕ 關閉'; hd.appendChild(x);
  box.appendChild(hd);
  var tabs = document.createElement('div'); tabs.className = 'g-tabs'; box.appendChild(tabs);
  var body = document.createElement('div'); body.className = 'g-body'; box.appendChild(body);
  function show(k) {
    [].forEach.call(tabs.children, function (b, j) { b.classList.toggle('on', j === k); });
    body.innerHTML = sections[k].html; body.scrollTop = 0; box.scrollTop = 0;
  }
  sections.forEach(function (s, k) { var b = document.createElement('button'); b.type = 'button'; b.textContent = s.h; b.addEventListener('click', function () { show(k); }); tabs.appendChild(b); });
  function close() { ov.remove(); }
  x.addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.body.appendChild(ov); show(0);
};

BG.cats = ['棋類', '牌類', '麻將'];
/* 只載入選到的遊戲檔案 */
BG.load = function (id, cb) {
  var m = BG.meta(id); if (!m || !m.files) return cb(false);
  if (BG.games[id] && BG.games[id].guide) return cb(true);
  BG._wait = BG._wait || {};
  if (BG._wait[id]) return BG._wait[id].push(cb);
  BG._wait[id] = [cb];
  function done(ok) { var l = BG._wait[id]; delete BG._wait[id]; l.forEach(function (f) { f(ok); }); }
  var files = m.files.slice();
  (function next() {
    var f = files.shift(); if (!f) return done(!!BG.games[id]);
    if (/\.css$/.test(f)) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f; document.head.appendChild(l); return next(); }
    var s = document.createElement('script'); s.src = f; s.onload = next; s.onerror = function () { done(false); }; document.body.appendChild(s);
  })();
};

/* 電腦強度 */
BG.levels = [
  { n: 1, name: '入門', icon: '🐣', desc: '剛學會規則，常常亂走' },
  { n: 2, name: '簡單', icon: '🙂', desc: '會吃子，但看不遠' },
  { n: 3, name: '普通', icon: '🤔', desc: '會想兩步，有點挑戰' },
  { n: 4, name: '困難', icon: '🔥', desc: '認真下棋，很難贏' }
];
BG.isBot = function (id) { return typeof id === 'string' && id.indexOf('bot:') === 0; };

/* 棋盤縮放：按鈕放大縮小、雙指縮放、滑鼠滾輪，放大後可以拖曳。key 用來在重畫時記住縮放狀態 */
BG._z = {};
BG.zoom = function (key, content) {
  var st = BG._z[key] || (BG._z[key] = { s: 1, x: 0, y: 0 });
  var vp = document.createElement('div'); vp.className = 'zoom-vp';
  var inner = document.createElement('div'); inner.className = 'zoom-inner'; inner.appendChild(content); vp.appendChild(inner);
  function size() { return { w: vp.clientWidth, h: vp.clientHeight }; }
  function apply() {
    var z = size();
    st.s = Math.max(1, Math.min(3, st.s));
    st.x = Math.min(0, Math.max(z.w - z.w * st.s, st.x));
    st.y = Math.min(0, Math.max(z.h - z.h * st.s, st.y));
    inner.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.s + ')';
    vp.classList.toggle('zoomed', st.s > 1.01);
    lbl.textContent = Math.round(st.s * 100) + '%';
  }
  function zoomAt(ns, cx, cy) { // cx, cy：相對於 vp 的座標
    ns = Math.max(1, Math.min(3, ns));
    st.x = cx - (cx - st.x) * ns / st.s; st.y = cy - (cy - st.y) * ns / st.s; st.s = ns; apply();
  }
  var ctl = document.createElement('div'); ctl.className = 'zoom-ctl';
  function cb(t, title, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.title = title; b.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); ctl.appendChild(b); return b; }
  cb('－', '縮小', function () { var z = size(); zoomAt(st.s - .5, z.w / 2, z.h / 2); });
  var lbl = cb('100%', '恢復原本大小', function () { st.s = 1; st.x = st.y = 0; apply(); });
  cb('＋', '放大', function () { var z = size(); zoomAt(st.s + .5, z.w / 2, z.h / 2); });
  var wrap = document.createElement('div'); wrap.className = 'zoom-wrap'; wrap.appendChild(vp); wrap.appendChild(ctl);
  // 手勢
  var pts = {}, start = null, moved = false;
  function rel(e) { var r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  vp.addEventListener('pointerdown', function (e) {
    pts[e.pointerId] = rel(e); moved = false;
    var ids = Object.keys(pts);
    if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; start = { d: Math.hypot(a.x - b.x, a.y - b.y), s: st.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x: st.x, y: st.y }; }
    else start = { px: pts[e.pointerId].x, py: pts[e.pointerId].y, x: st.x, y: st.y };
  });
  vp.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId] || !start) return;
    pts[e.pointerId] = rel(e);
    var ids = Object.keys(pts);
    if (ids.length >= 2 && start.d) {
      var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), ns = Math.max(1, Math.min(3, start.s * d / start.d));
      st.s = start.s; st.x = start.x; st.y = start.y; zoomAt(ns, start.mx, start.my); moved = true;
    } else if (ids.length === 1 && st.s > 1.01 && start.px != null) {
      var p = pts[ids[0]], dx = p.x - start.px, dy = p.y - start.py;
      if (moved || Math.abs(dx) + Math.abs(dy) > 8) { moved = true; st.x = start.x + dx; st.y = start.y + dy; apply(); }
    }
  });
  function up(e) { delete pts[e.pointerId]; if (!Object.keys(pts).length) start = null; else { var id = Object.keys(pts)[0]; start = { px: pts[id].x, py: pts[id].y, x: st.x, y: st.y }; } }
  vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
  vp.addEventListener('click', function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  vp.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); zoomAt(st.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), p.x, p.y); }, { passive: false });
  requestAnimationFrame(apply);
  return wrap;
};
