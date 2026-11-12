/* 遊戲清單：每個遊戲是 games/<id>/ 裡獨立的模組，用 BG.register 加進來 */
window.BG = window.BG || {};
BG.VER = '202611121251';
BG.games = BG.games || {};
BG.register = function (id, mod) { mod.id = id; BG.games[id] = mod; };
BG.catalog = [
  { id: 'xiangqi', cat: '棋類', files: ['games/xiangqi/xiangqi.css', 'games/xiangqi/rules.js', 'games/xiangqi/ai.js', 'games/xiangqi/game.js', 'games/xiangqi/guide.js'], title: '中國象棋', icon: '帥', color: '#c0392b', players: '2 人對戰', desc: '楚河漢界，完整規則自動判定輸贏', ready: true },
  { id: 'gomoku', cat: '棋類', files: ['games/gomoku/gomoku.css', 'games/gomoku/rules.js', 'games/gomoku/game.js', 'games/gomoku/guide.js'], title: '五子棋', icon: '五', color: '#4f7a4a', players: '2 人對戰', desc: '橫直斜連成五顆就贏，一分鐘學會', ready: true },
  { id: 'go', cat: '棋類', files: ['games/go/go.css', 'games/go/rules.js', 'games/go/game.js', 'games/go/guide.js'], title: '圍棋（9路）', icon: '●', color: '#3d3d3d', players: '2 人對戰', desc: '小棋盤，適合初學，一盤約 10～15 分鐘', ready: true },
  { id: 'go13', cat: '棋類', files: ['games/go/go.css', 'games/go/rules.js', 'games/go/game.js', 'games/go/guide.js'], title: '圍棋（13路）', icon: '◐', color: '#55473a', players: '2 人對戰', desc: '中棋盤，學會 9 路後再挑戰', ready: true },
  { id: 'chess', cat: '棋類', files: ['games/chess/chess.css', 'games/chess/rules.js', 'games/chess/game.js', 'games/chess/guide.js'], title: '西洋棋', icon: '♚', color: '#5b4636', players: '2 人對戰', desc: '國際標準規則：入堡、吃過路兵、升變全部自動判定', ready: true },
  { id: 'poker', cat: '牌類', title: '撲克牌', icon: '♠', color: '#1f6b47', players: '10 種玩法', desc: '大老二、撿紅點、抽鬼牌、排7、十點半、99、撲克牌吹牛、射龍門、21點、比大小', ready: true, sub: [
    { id: 'big2', title: '大老二', players: '2–4 人', desc: '2 最大、梅花 3 先出，先出完牌就贏', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/big2.js'] },
    { id: 'pick-red', title: '撿紅點', players: '2–4 人', desc: '湊成 10 點把紅色牌撿回來', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/pick-red.js'] },
    { id: 'old-maid', title: '抽鬼牌', players: '2–6 人', desc: '互相抽牌、丟掉對子，別留到鬼牌', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/old-maid.js'] },
    { id: 'sevens', title: '排7', players: '2–4 人', desc: '從 7 開始往上往下接龍，蓋牌點數最少的人贏', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/sevens.js'] },
    { id: 'ten-half', title: '十點半', players: '1–6 人', desc: '補牌湊近十點半，超過就爆；J、Q、K 算半點', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/blackjack.js', 'games/poker/ten-half.js'] },
    { id: 'ninety-nine', title: '99', players: '2–6 人', desc: '輪流加點數，誰超過 99 誰輸', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/ninety-nine.js'] },
    { id: 'cheat', title: '撲克牌吹牛', players: '2–6 人', desc: '蓋牌出牌可以說謊，被抓到就收牌', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/cheat.js'] },
    { id: 'dragon-gate', title: '射龍門', players: '2–6 人', desc: '抽到兩根門柱中間就贏', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/dragon-gate.js'] },
    { id: 'blackjack', title: '21點', players: '1–6 人', desc: '和電腦莊家比誰最接近 21 點', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/blackjack.js'] },
    { id: 'high-card', title: '比大小', players: '2–6 人', desc: '抽一張比點數和花色，5 回合定勝負', ready: true, files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/poker/high-card.js'] }
  ] },
  { id: 'uno', cat: '牌類', files: ['games/uno/uno.css', 'games/uno/rules.js', 'games/uno/game.js', 'games/uno/guide.js'], title: '彩色接龍', icon: '+4', color: '#e63946', players: '2–6 人', desc: 'UNO 玩法：同色或同數字接下去，先出完牌就贏', ready: true },
  { id: 'rummikub', cat: '牌類', files: ['games/poker/poker.css', 'games/poker/cards.js', 'games/rummikub/rummikub.css', 'games/rummikub/rules.js', 'games/rummikub/game.js'], title: '拉密', icon: '7', color: '#b07440', players: '2–4 人', desc: '同色連號或同數字不同色，先把牌放完就贏', ready: true },
  { id: 'spot-match', cat: '牌類', files: ['games/spot/spot.css', 'games/spot/game.js'], title: '眼明手快（圖案）', icon: '👀', color: '#8e44ad', players: '2–6 人', desc: '兩張牌只有一個圖案一樣，最快點到的人拿牌', ready: true },
  { id: 'spot-zhuyin', cat: '牌類', files: ['games/spot/spot.css', 'games/spot/game.js'], title: '眼明手快（注音）', icon: 'ㄅ', color: '#6a3cbc', players: '2–6 人', desc: '找出一樣的注音符號，練習分辨ㄅㄆ、ㄓㄗ等長得像的符號', ready: true },
  { id: 'spot-hanzi', cat: '牌類', files: ['games/spot/spot.css', 'games/spot/game.js'], title: '眼明手快（國字）', icon: '田', color: '#5b2a86', players: '2–6 人', desc: '找出一樣的國字，練習分辨大太天夫、日目白自等形近字', ready: true },
  { id: 'seven-eat-nine', cat: '牌類', files: ['games/seven/seven.css', 'games/seven/game.js'], title: '7吃9', icon: '7', color: '#d35400', players: '2–6 人', desc: '沒有輪流的加減法搶牌：中間的數字加減後，最快出牌的人贏', ready: true },
  { id: 'mudpig', cat: '牌類', files: ['games/mudpig/mudpig.css', 'games/mudpig/game.js'], title: '泥巴豬農場', icon: '🐷', color: '#8d6e63', players: '2–6 人', desc: '讓自己的小豬全部滾進泥巴！蓋豬舍防下雨，用農夫和閃電搗蛋', ready: true },
  { id: 'guess', cat: '益智', files: ['games/guess/guess.css', 'games/guess/game.js'], title: '終極密碼', icon: '?', color: '#0f766e', players: '2–6 人', desc: '猜 1～100 之間的祕密數字，範圍越縮越小，猜中的人爆炸（也可以設成猜中的人贏）', ready: true },
  { id: 'dice-bluff', cat: '益智', files: ['games/dice/dice.css', 'games/dice/game.js'], title: '骰子吹牛', icon: '🎲', color: '#b45309', players: '2–6 人', desc: '每人 5 顆骰子，喊「全桌至少幾個幾」，不相信就開！1 點萬用、可以喊齋', ready: true },
  { id: 'angel', cat: '社會技巧/溝通訓練', files: ['games/angel/angel.css', 'games/angel/game.js'], title: '天使與惡魔', icon: '😇', color: '#7c4dff', players: '3–6 人', desc: '社會技巧卡牌：用天使的話讓圖像心情變好、惡魔的話讓心情變差，誰的圖像是誰都保密', ready: true },
  { id: 'saynext', cat: '社會技巧/溝通訓練', files: ['games/saynext/saynext.css', 'games/saynext/game.js'], title: '你說我接', icon: '🗣️', color: '#e8772e', players: '3–6 人', desc: '對話接話卡牌：聽念題的人用指定的語氣說一句話，大家挑最適合的回應，再匿名投票', ready: true },
  { id: 'mahjong', cat: '麻將', files: ['games/mahjong/mahjong.css', 'games/mahjong/rules.js', 'games/mahjong/game.js', 'games/mahjong/guide.js'], title: '台灣麻將', icon: '中', color: '#1b7f5a', players: '2–4 人', desc: '台灣 16 張：吃碰槓胡、花牌、算台數', ready: true },
  { id: 'chinese-checkers', cat: '棋類', files: ['games/checkers/checkers.css', 'games/checkers/rules.js', 'games/checkers/game.js', 'games/checkers/guide.js'], title: '三色跳棋', icon: '✦', color: '#2a9d8f', players: '2–3 人', desc: '跳過彈珠連跳，先把對面的角填滿就贏', ready: true }
];
/* 撲克牌玩法很多，獨立成一個類別，每種玩法一個圖塊 */
(function () {
  var ICON = { 'big2': '2', 'pick-red': '♥', 'old-maid': '🤡', 'sevens': '7', 'ten-half': '½', 'ninety-nine': '99', 'cheat': '?', 'dragon-gate': '門', 'blackjack': '21', 'high-card': '↕' };
  var COL = ['#1f6b47', '#b8323f', '#6a2c91', '#2b5d8a', '#a0661f', '#1d7874', '#7a3e9d', '#8c2f39', '#174a33', '#3d5a80'];
  for (var i = 0; i < BG.catalog.length; i++) if (BG.catalog[i].sub) {
    var subs = BG.catalog[i].sub.map(function (v, k) { v.cat = '撲克牌'; v.icon = ICON[v.id] || '♠'; v.color = COL[k % COL.length]; return v; });
    BG.catalog.splice.apply(BG.catalog, [i, 1].concat(subs)); break;
  }
})();
BG.meta = function (id) {
  for (var i = 0; i < BG.catalog.length; i++) {
    var m = BG.catalog[i]; if (m.id === id) return m;
    if (m.sub) for (var j = 0; j < m.sub.length; j++) if (m.sub[j].id === id) { var x = m.sub[j]; x.cat = m.cat; x.icon = x.icon || m.icon; x.color = x.color || m.color; x.parent = m; return x; }
  }
  return null;
};

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

BG.cats = ['棋類', '撲克牌', '牌類', '麻將', '益智', '社會技巧/溝通訓練'];
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
    if (/\.css$/.test(f)) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = f + '?v=' + BG.VER; document.head.appendChild(l); return next(); }
    var s = document.createElement('script'); s.src = f + '?v=' + BG.VER; s.onload = next; s.onerror = function () { done(false); }; document.body.appendChild(s);
  })();
};

/* 電腦強度 */
BG.levels = [
  { n: 1, name: '入門', icon: '🐣', desc: '剛學會規則，常常亂走' },
  { n: 2, name: '簡單', icon: '🙂', desc: '會抓明顯的機會，但看不遠' },
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

/* 有新版本時提醒重新整理（避免一直開著的分頁停在舊版） */
(function () {
  if (!window.fetch || location.protocol === 'file:') return;
  var shown = false;
  function check() {
    if (shown) return;
    fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      t = (t || '').trim();
      if (!/^\d{12}$/.test(t) || t <= BG.VER || shown) return;
      shown = true;
      var b = document.createElement('div');
      b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;background:#1f6feb;color:#fff;padding:10px 16px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.3);font-size:16px;cursor:pointer;max-width:calc(100% - 32px);text-align:center';
      b.textContent = '🔄 有新版本，點這裡更新（房間和分數會保留）';
      b.onclick = function () { location.reload(); };
      document.body.appendChild(b);
    }).catch(function () {});
  }
  setTimeout(check, 5000); setInterval(check, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
})();
