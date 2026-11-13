/* 桌遊對戰教室：學生端外框（加入房間、等候、結果、表情），棋桌畫面交給各遊戲模組 */
(function () {
  'use strict';
  var EMO = ['好棋！', '請等一下', '換你囉', '謝謝指教', '加油！', '👍', '😊', '😮'];
  var app = document.getElementById('app');
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function btn(c, x, fn) { var b = el('button', c, x); b.type = 'button'; b.addEventListener('click', function (e) { snd.unlock(); fn(e); }); return b; }
  function hashArg(k) { var m = location.hash.match(new RegExp('[#&]' + k + '=([^&]+)')); return m ? decodeURIComponent(m[1]) : null; }

  /* 音效：sfx.js */
  var snd = { unlock: function () { BGSfx.unlock(); }, play: function (k) { BGSfx.play(k); } };

  /* ---------- 連線 ---------- */
  var code = (hashArg('r') || '').toUpperCase(), broker = hashArg('b'), KEY = 'bg-player-' + code;
  broker = broker == null ? null : (+broker || 0);
  var me = { pid: null, name: '' }, net = null, joined = false, S = null, err = '', showEmo = false, netState = 'online', GAME = null;
  try { var sv = JSON.parse(localStorage.getItem(KEY)); if (sv && sv.pid) me = sv; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) {} }

  function connect() {
    if (net) net.close();
    joined = false; render();
    net = BGNet.open({ code: code, role: 'player', broker: broker, onMessage: onDown, onStatus: function (s) { netState = s; netPill(); if (s === 'online') hello(); } });
    var cc = code;
    clearTimeout(connect.t);
    connect.t = setTimeout(function () { if (!joined && code === cc) { if (net) net.close(); net = null; err = '找不到房間「' + cc + '」，請確認老師大螢幕上的代碼，或重新掃描 QR code。'; render(); } }, 14000);
  }
  function hello() { if (net) net.send({ t: 'hello', pid: me.pid, sid: me.sid || '' }); }
  function send(t, extra) { if (!net) return; var d = { t: t, pid: me.pid }; for (var k in extra) d[k] = extra[k]; net.send(d); }
  setInterval(function () { if (!net) return; if (!joined) hello(); else send('ping', { v: S ? S.v : -1, cs: CAST ? CAST.seq : -1 }); }, 4000);
  /* 同步投影：主持人投影時，蓋住整個畫面、關不掉，主持人關掉才回到自己的畫面 */
  var CAST = null, castEl = null;
  function setCast(c) {
    if (c && c.ex && c.ex === me.pid) c = null;   // 投影的是自己的畫面：自己繼續玩，不被蓋住
    if (c && CAST && c.id === CAST.id && c.seq < CAST.seq) return;
    CAST = c || null;
    if (!CAST) { if (castEl) { castEl.remove(); castEl = null; } return; }
    if (!castEl) {
      castEl = el('div', 'proj cast p-cast'); var fit = el('div', 'cast-fit'), stage = el('div', 'cast-stage'), body = el('div', 'cast-html'), cv = document.createElement('canvas');
      cv.width = BG.CAST_W; cv.height = BG.CAST_H; cv.className = 'cast-cv';
      stage.appendChild(body); stage.appendChild(cv); fit.appendChild(stage);
      castEl.appendChild(el('div', 'cast-live', '📽️ 請看投影畫面'));
      castEl.appendChild(fit); document.body.appendChild(castEl);
      castEl._b = body; castEl._cv = cv; castEl._f = fit; castEl._s = stage; castEl._h = null;
      var lay = function () { if (!castEl) return; castEl.firstChild.textContent = window.innerHeight > window.innerWidth * 1.1 ? '📽️ 請看投影畫面（把裝置橫過來看，畫面會比較大）' : '📽️ 請看投影畫面'; BG.castFit(castEl._f, castEl._s, 60); }; castEl._lay = lay; window.addEventListener('resize', lay);
      snd.play('start');
    }
    if (castEl._h !== CAST.html) { castEl._b.innerHTML = CAST.html; castEl._h = CAST.html; }
    castEl._b.classList.toggle('doc', !!CAST.doc);
    var bb = castEl._b; bb.scrollTop = (CAST.st || 0) * Math.max(0, bb.scrollHeight - bb.clientHeight);
    BG.castDraw(castEl._cv, CAST.sk);
    castEl._lay();
  }

  var fx = { snd: function (k) { snd.play(k); }, toast: toast };
  function onDown(d) {
    if (!d || (d.to !== me.pid && !(d.to === '*' && d.t === 'cast'))) return;
    if (d.t === 'cast') { if (joined) setCast(d.c); return; }
    if (d.t === 'watch') { monSet(d.lv, d.gz); return; }
    if (d.t === 'st') {
      if (S && joined && d.v < S.v) return;
      if (!BG.games[d.gid] || !BG.games[d.gid].guide) { BG.load(d.gid, function () { onDown(d); }); return; }
      joined = true; err = ''; clearTimeout(connect.t);
      GAME = BG.games[d.gid] || GAME;
      var prev = S && S.tb ? S.tb : null;
      if (!d.tb || !prev || prev.round !== d.tb.round) bubbles = {};
      if (d.tb && GAME) {
        if (!prev || prev.round !== d.tb.round) snd.play('start');
        GAME.onUpdate(prev, d.tb, fx);
        if (d.tb.res && !(prev && prev.res && prev.round === d.tb.round)) {
          var w = d.tb.res.w; if (w === d.tb.seat) { snd.play('win'); confetti(); } else if (w >= 0) snd.play('lose');
        }
      }
      if (!SOLO) BGSfx.force(d.snd !== false);
      if (!SOLO && 'cast' in d) setCast(d.cast);
      if (!SOLO && 'watch' in d) monSet(d.watch, d.gz);
      d._rt = Date.now(); S = d; me.name = d.name; save(); render();
    } else if (d.t === 'sidtaken') {
      if (joined) return;
      if (net) net.close(); net = null; S = null; clearTimeout(connect.t);
      me = { pid: null, sid: me.sid, name: '' }; save(); err = d.text; render();
    } else if (d.t === 'full' || d.t === 'kick') {
      joined = false; if (net) net.close(); net = null; S = null;
      if (d.t === 'kick') { me = { pid: null, sid: me.sid, name: '' }; save(); }
      err = d.text; render();
    } else if (d.t === 'gone') hello();
    else if (d.t === 'emo') { bubble(d.from, EMO[d.i] || ''); snd.play('pop'); }
    else if (d.t === 'note') toast(d.text);
    else if (d.t === 'rej') { if (GAME && GAME.onReject) { try { GAME.onReject(d); } catch (e) {} } if (joined && S) render(); }
  }

  /* ---------- 畫面 ---------- */
  function topBar() {
    var t = el('div', 'p-top');
    t.innerHTML = '<div class="brand"><div class="logo"><i></i><i></i><i></i><i></i></div><h1>桌遊對戰教室</h1></div><span class="sp"></span>';
    var A = joined && S && S.tb && !S.tb.res ? S.aid : null;
    if (A && (A.tl != null || (A.h != null && GAME && GAME.hint))) t.classList.add('aidon');
    if (A && A.tl != null) t.appendChild(el('span', 'pill aid-tl', '⏱ ' + secsLeft()));
    if (A && A.h != null && GAME && GAME.hint) t.appendChild(btn('btn small aid-btn' + (A.hint ? ' on' : '') + (A.h === 0 ? ' dis' : ''), '💡 提示' + (A.h < 0 ? '' : '（' + A.h + '）'), askHint));
    if (SOLO) t.appendChild(BGSfx.button('btn small ghost'));   // 多人時音效由老師端統一開關
    if (joined && S && GAME && GAME.guide) t.appendChild(btn('btn small ghost', '📖 規則', function () { BG.showGuide((BG.meta(S.gid) || {}).title + '・玩法說明', GAME.guide.student); }));
    if (code && !SOLO) { var cp = el('span', 'pill code-pill', '🔑 ' + code); t.appendChild(cp); }
    return t;
  }
  function render() {
    app.innerHTML = '';
    app.appendChild(topBar());
    if (!code) return codeForm();
    if (!me.pid) return nameForm();
    if (!joined) {
      var c = el('div', 'panel p-card');
      c.appendChild(dice());
      if (err) { c.appendChild(el('p', 'err', err)); c.appendChild(btn('btn-sun', '重新連線', function () { err = ''; connect(); })); c.appendChild(el('p')); c.appendChild(btn('btn small', '重新輸入學號', function () { me.pid = null; save(); err = ''; render(); })); }
      else c.appendChild(el('p', '', '正在進入房間…'));
      app.appendChild(c); return;
    }
    if (!S.tb || !GAME) return waiting();
    var n0 = app.children.length;
    GAME.render(app, ctx());
    hintMark();
    fit(app.children[n0]);
    if (S.tb.res) result();
    if (showEmo && (SOLO || !S || S.emo !== false)) emotes();
    placeBubbles();
    aidBanner();
    pauseVeil();
  }
  /* 有新同學加入、老師還在決定時：整個畫面霧化、不能操作 */
  function pauseVeil() {
    var v = document.querySelector('.p-pause'), on = joined && S && S.tb && S.tb.paused && !S.tb.res;
    if (!on) { if (v) v.remove(); return; }
    if (!v) { v = el('div', 'p-pause'); v.innerHTML = '<div class="pp-box"><div class="pp-ic">⏸️</div><b>遊戲暫停中</b><p>有新同學加入，老師正在決定要讓他接著玩，還是重開新局。<br>請稍等一下，倒數計時也暫停了。</p></div>'; document.body.appendChild(v); snd.play('turn'); }
  }
  /* 遊戲桌自動放大到填滿畫面：找出「整張桌子剛好放得下」的最大倍率。
     只在開新局、換方向／視窗大小時重新計算；遊戲中不會因為牌變少而縮小，
     只有內容變多到被擋住時才會稍微縮小一點。 */
  var FIT = { key: '', z: 1 };
  function fitAvail() {
    var top = app.firstChild, th = top ? top.getBoundingClientRect().height : 40;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    return { w: vw - 16, h: vh - th - 46 };
  }
  function fitApply(t, z, av) {
    t.style.zoom = z; t.style.width = Math.floor(av.w / z) + 'px'; t.style.maxWidth = 'none'; t.style.minHeight = Math.floor(av.h / z) + 'px'; t.style.boxSizing = 'border-box';
    app.style.setProperty('--vw', (av.w / z / 100) + 'px'); app.style.setProperty('--vh', ((av.h + 60) / z / 100) + 'px');
  }
  function fitNeed(t, z, av) { fitApply(t, z, av); t.style.minHeight = '0px'; var h = t.scrollHeight; return h * z; }
  function fitSearch(t, av, hiZ) {
    var lo = 1, hi = Math.min(hiZ, 2.4, av.w / 380);
    if (hi <= 1) return 1;
    if (fitNeed(t, hi, av) <= av.h) return hi;
    for (var k = 0; k < 9; k++) { var mid = (lo + hi) / 2; if (fitNeed(t, mid, av) <= av.h) lo = mid; else hi = mid; }
    return Math.floor(lo * 100) / 100;
  }
  function fit(t) {
    if (!t || !t.style) return;
    var av = fitAvail(), key = S.tb.seat + ':' + S.tb.round + ':' + av.w + 'x' + av.h;
    // 橫式畫面＋棋盤類：棋盤放左邊、其他資訊放右邊，棋盤用滿整個高度
    var board = [].filter.call(t.children, function (c) { return /(^|\s)[a-z0-9]+-board(\s|$)/.test(c.getAttribute('class') || ''); })[0];
    FIT.land = !!board && av.w / av.h > 1.2 && av.w >= 640;
    t.classList.toggle('fit-land', FIT.land);
    if (FIT.land) { if (FIT.key !== key) { FIT.key = key; FIT.z = Math.max(1, Math.min(1.6, av.h / 620, av.w / 900)); } }
    else if (GAME && GAME.fitZoom === false) { FIT.key = key; FIT.z = 1; }   // 這個遊戲自己用滿畫面（例如眼明手快的兩個圈），不整頁放大
    else if (FIT.key !== key) { FIT.key = key; FIT.z = fitSearch(t, av, 9); }
    else if (!FIT.land && FIT.z > 1 && fitNeed(t, FIT.z, av) > av.h * 1.02) FIT.z = fitSearch(t, av, FIT.z);
    fitApply(t, FIT.z, av);
  }
  var fitT = null;
  window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(function () { if (S && S.tb) render(); }, 150); });
  /* 只有換畫面時才播放進場動畫，平常更新不閃動 */
  var lastKey = '';
  var _render = render;
  render = function () {
    _render();
    var key = !code ? 'c' : !me.pid ? 'n' : !joined ? 'j' + !!err : !S.tb ? 'w' : 't' + S.tb.round + (S.tb.res ? 'r' : '');
    if (key !== lastKey) {
      [].forEach.call(app.children, function (c, i) { if (i > 0) { c.classList.add('enter'); c.style.animationDelay = (i - 1) * .06 + 's'; } });
      if (key.charAt(0) === 't' && key.slice(-1) === 'r' && lastKey.charAt(0) === 't') { var t = app.querySelector('.xq-table, [class$="-table"]'); if (t) { t.classList.remove('enter'); } }
      lastKey = key;
    }
  };
  function ctx() {
    var vsBots = S.tb.seats.every(function (x, i) { return i === S.tb.seat || x.bot; });
    return { tb: S.tb, hint: S.aid && S.aid.hint ? S.aid.hint : null, canUndo: vsBots, send: send, toast: toast, snd: function (k) { snd.play(k); }, rerender: render,
      button: btn, emoteButton: function (cls) { if (!SOLO && S && S.emo === false) { var x = el('span'); x.style.display = 'none'; return x; } return btn(cls, '💬 說話', function () { showEmo = !showEmo; render(); }); } };
  }

  /* ---------- 提示・倒數計時・溫馨小提醒（由老師端控制） ---------- */
  var dismissed = {};
  function secsLeft() { var A = S && S.aid; if (!A || A.tl == null) return ''; if (A.pz) return Math.ceil(A.tl / 1000); return Math.max(0, Math.ceil((A.tl - (Date.now() - S._rt)) / 1000)); }
  function askHint() {
    var A = S && S.aid; if (!A) return;
    if (A.hint) { delete dismissed['h' + A.hint.k]; aidBanner(); return; }
    if (A.h === 0) { toast('這局的提示次數用完了，自己想想看！'); snd.play('error'); return; }
    send('hint'); snd.play('tap');
  }
  /* 被提示指到的牌／棋子加上閃亮框（遊戲用 data-h 或撲克牌的 data-c 標記） */
  function hintMark() {
    var h = S && S.aid && S.aid.hint; if (!h || !h.hl || !h.hl.length) return;
    var set = {}; h.hl.forEach(function (x) { set[x] = 1; });
    [].forEach.call(app.querySelectorAll('[data-h],[data-c],[data-id]'), function (n) {
      var a = n.getAttribute('data-h'), b = n.getAttribute('data-c'), c = n.getAttribute('data-id');
      if ((a != null && set[a]) || (b != null && set[b]) || (c != null && set[c])) n.classList.add('hint-hl');
    });
  }
  function aidBanner() {
    [].forEach.call(document.querySelectorAll('.aid-banner'), function (n) { n.remove(); });
    var A = S && S.aid; if (!A || !S.tb || S.tb.res) return;
    var items = [];
    if (A.hint && !dismissed['h' + A.hint.k]) items.push({ c: 'hint', t: '💡 提示：' + A.hint.msg, k: 'h' + A.hint.k });
    if (A.tip && !dismissed['t' + A.tip + A.tk]) items.push({ c: 'tip', t: '🌟 溫馨小提醒：' + A.tip, k: 't' + A.tip + A.tk });
    if (!items.length) return;
    var box = el('div', 'aid-banner');
    items.forEach(function (it) {
      var d = el('div', 'aid-msg ' + it.c); d.appendChild(el('span', 'tx', it.t));
      var x = el('button', 'x', '✕'); x.type = 'button'; x.title = '先關掉這則'; x.addEventListener('click', function () { dismissed[it.k] = 1; aidBanner(); });
      d.appendChild(x); box.appendChild(d);
    });
    document.body.appendChild(box);
    if (aidBanner.last !== items[0].k) { aidBanner.last = items[0].k; snd.play(items[0].c === 'tip' ? 'turn' : 'pop'); }
  }
  var lastTick = -1;
  setInterval(function () {
    var A = S && S.aid, bar = document.querySelector('.aid-bar');
    if (!A || A.tl == null || !S.tb || S.tb.res) { if (bar) bar.remove(); return; }
    var left = A.pz ? A.tl : A.tl - (Date.now() - S._rt), sec = Math.max(0, Math.ceil(left / 1000)), pill = document.querySelector('.aid-tl');
    if (pill) { pill.textContent = '⏱ ' + sec; pill.classList.toggle('warn2', sec <= 10); pill.classList.toggle('hot', sec <= 5); }
    if (!bar) { bar = el('div', 'aid-bar'); bar.appendChild(el('i')); document.body.appendChild(bar); }
    var fillEl = bar.firstChild; fillEl.style.width = Math.max(0, Math.min(100, left / Math.max(1, A.tt || left) * 100)) + '%'; bar.classList.toggle('hot', sec <= 10);
    if (A.pz) return;
    if (sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; snd.play('tap'); } else if (sec > 5) lastTick = -1;
  }, 250);
  function dice() { var w = el('div', 'wait-dice'); ['♠', '帥', '●', '★'].forEach(function (t) { w.appendChild(el('span', '', t)); }); return w; }
  function codeForm() {
    var c = el('div', 'panel p-card');
    c.appendChild(dice());
    c.appendChild(el('h2', '', '加入遊戲房間'));
    c.appendChild(el('p', '', '請輸入老師大螢幕上的 5 碼房間代碼'));
    var i = el('input'); i.maxLength = 5; i.autocapitalize = 'characters'; i.placeholder = '房間代碼'; c.appendChild(i);
    c.appendChild(btn('btn-sun', '下一步', function () { var v = i.value.trim().toUpperCase(); if (v.length !== 5) return toast('代碼是 5 個字'); code = v; KEY = 'bg-player-' + code; location.hash = 'r=' + v; try { me = JSON.parse(localStorage.getItem(KEY)) || { pid: null, name: '' }; } catch (e) {} if (me.pid) connect(); else render(); }));
    app.appendChild(c); i.focus();
  }
  function nameForm() {
    var c = el('div', 'panel p-card');
    c.appendChild(dice());
    c.appendChild(el('h2', '', '輸入你的學號'));
    if (err) c.appendChild(el('p', 'err', err));
    c.appendChild(el('p', '', '請輸入 4 碼學號：年級＋班級＋座號。例如 4 年 5 班 6 號是 4506，6 年 2 班 17 號是 6217。名字會由系統幫你取一個！'));
    var i = el('input'); i.type = 'text'; i.inputMode = 'numeric'; i.pattern = '[0-9]*'; i.maxLength = 4; i.placeholder = '4 碼學號'; i.autocomplete = 'off'; i.value = me.sid || '';
    i.addEventListener('input', function () { i.value = i.value.replace(/\D/g, '').slice(0, 4); });
    c.appendChild(i);
    function go() {
      var v = i.value.trim(); if (!/^\d{4}$/.test(v)) { toast('學號要剛好 4 碼數字，例如 4506'); i.focus(); return; }
      me = { pid: 'p' + Math.random().toString(36).slice(2, 10), sid: v, name: '' }; save(); err = ''; connect();
    }
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    c.appendChild(btn('btn-sun', '加入 ▶', go));
    app.appendChild(c); i.focus();
  }
  function waiting() {
    var m = BG.meta(S.gid) || {}, c = el('div', 'panel p-card');
    if (SOLO) { c.innerHTML = ''; var gb0 = el('div', 'gbadge'); gb0.innerHTML = '<b style="background:' + m.color + '">' + m.icon + '</b>'; gb0.appendChild(document.createTextNode(m.title + '・一個人練習')); c.appendChild(gb0); c.appendChild(el('p', '', '選一個電腦的強度開始練習。覺得太簡單就換強一點的！')); if (GAME && GAME.guide) c.appendChild(btn('btn', '📖 先看玩法說明', function () { BG.showGuide(m.title + '・玩法說明', GAME.guide.student); })); }
    else {
    var gb = el('div', 'gbadge'); gb.innerHTML = '<b style="background:' + m.color + '">' + m.icon + '</b>'; gb.appendChild(document.createTextNode(m.title || '')); c.appendChild(gb);
    c.appendChild(dice());
    if (S.pend) { c.appendChild(el('h2', '', S.pend.after ? '下一局就輪到你！' : '老師正在幫你安排座位')); c.appendChild(el('p', '', S.pend.after ? '第 ' + S.pend.no + ' 桌這一局由電腦打完後，你就會換掉電腦加入。' : '你要加入第 ' + S.pend.no + ' 桌（換掉電腦的位子），老師正在決定要接著玩還是重開新局，請稍等。')); app.appendChild(c); return; }
    c.appendChild(el('h2', '', '等待配對中'));
    c.appendChild(el('p', '', '你在這裡的名字是「' + S.name + '」' + (S.sid ? '（' + S.sid + '）' : '') + '。系統正在幫你找對手，請稍等一下。' + (S.qn > 1 ? '（目前有 ' + S.qn + ' 人在等）' : '')));
    if (GAME && GAME.guide) c.appendChild(btn('btn', '📖 等待時先看玩法說明', function () { BG.showGuide(m.title + '・玩法說明', GAME.guide.student); }));
    }
    app.appendChild(c);
    if (S.allowBot && S.botSeats) {
      var bc = el('div', 'panel p-card bot-card');
      bc.appendChild(el('h2', '', SOLO ? '🤖 選擇電腦強度' : '🤖 先和電腦下一盤'));
      if (!SOLO) bc.appendChild(el('p', '', '不想等？選一個電腦的強度就能馬上開桌。和電腦下的棋局不列入積分榜。'));
      var nb = GAME && GAME.seatDefault ? Math.max(S.botSeats[0], Math.min(S.botSeats[1], GAME.seatDefault - 1)) : S.botSeats[0]; // 預設用正式人數（例如麻將 4 人）
      if (S.botSeats[1] > S.botSeats[0]) {
        var nr = el('div', 'row c'); nr.appendChild(el('span', '', '這一桌幾個人（含你自己）：'));
        for (var k = S.botSeats[0]; k <= S.botSeats[1]; k++) (function (k) { var b = btn('btn small' + (k === (waiting.n || nb) ? ' on' : ''), (k + 1) + ' 人', function () { waiting.n = k; render(); }); nr.appendChild(b); })(k);
        bc.appendChild(nr); nb = waiting.n || nb;
      }
      if (SOLO) {
        var sr = el('div', 'row c'); sr.appendChild(el('span', '', '電腦出牌速度：'));
        [['vslow', '🐌 最慢'], ['slow', '🐢 慢'], ['normal', '普通'], ['fast', '🐇 快'], ['vfast', '⚡ 最快']].forEach(function (o) { sr.appendChild(btn('btn small' + ((waiting.speed || 'normal') === o[0] ? ' on' : ''), o[1], function () { waiting.speed = o[0]; render(); })); });
        bc.appendChild(sr);
        (GAME && GAME.opts || []).forEach(function (d) {
          waiting.opts = waiting.opts || {}; if (waiting.opts[d.k] == null) waiting.opts[d.k] = d.list[0][0];
          var orow = el('div', 'row c'); orow.appendChild(el('span', '', d.label));
          d.list.forEach(function (o) { orow.appendChild(btn('btn small' + (waiting.opts[d.k] === o[0] ? ' on' : ''), o[1], function () { waiting.opts[d.k] = o[0]; render(); })); });
          bc.appendChild(orow);
        });
      }
      var lv = el('div', 'levels');
      BG.levels.forEach(function (L) {
        var b = btn('lv', '', function () { send('bot', { level: L.n, n: nb, speed: waiting.speed || 'normal', opts: waiting.opts }); toast('正在幫你開桌…'); });
        b.innerHTML = '<span class="ic">' + L.icon + '</span><b>' + L.name + '</b><small>' + ((GAME && GAME.levelDesc && GAME.levelDesc[L.n - 1]) || L.desc) + '</small>';
        lv.appendChild(b);
      });
      bc.appendChild(lv);
      app.appendChild(bc);
    }
  }
  function result() {
    var tb = S.tb, r = tb.res, win = r.ws ? r.ws.indexOf(tb.seat) >= 0 : r.l != null ? r.l !== tb.seat : r.w === tb.seat, draw = !r.ws && r.l == null && r.w < 0;
    var c = el('div', 'panel result');
    var b = el('div', 'badge', draw ? '🤝' : (win ? '🏆' : '💪')); b.style.background = draw ? '#bfeee9' : (win ? '#ffe7a3' : '#d8e9ff'); c.appendChild(b);
    c.appendChild(el('h2', '', draw ? '平手！' : (win ? '你贏了！' : '這局輸了')));
    c.appendChild(el('p', '', r.ws ? (GAME.reasons[r.why] || '') : r.l != null ? (win ? '別人' + (GAME.reasons[r.why] || '') + '你安全過關！' : '你' + (GAME.reasons[r.why] || '') + '下一局再加油！') : (GAME.reasons[r.why] || '') + (win || draw ? '' : '・下一局再加油！')));
    // 這局是誰贏／誰輸，寫清楚（遊戲可以用 resultNote 提供更完整的結束資訊，例如麻將誰胡、誰放槍、胡哪張、幾台）
    var nm = function (i) { var x = tb.seats[i]; return i === tb.seat ? '你' : !x ? '?' : x.bot ? '電腦 ' + (i + 1) : x.name.replace(/（\d{4}）/, ''); };
    var who = r.ws ? (r.ws.length ? '🏆 獲勝：' + r.ws.map(nm).join('、') : '') : r.l != null ? '💥 ' + nm(r.l) + '：' + (GAME.reasons[r.why] || '輸了') : r.w >= 0 ? '🏆 獲勝：' + nm(r.w) : '';
    var rn = GAME.resultNote ? GAME.resultNote(tb, nm) : null;
    if (rn) { var bx = el('div', 'res-info'); rn.forEach(function (line) { if (line && line.html != null) { var hx = el('div', 'res-html'); hx.innerHTML = line.html; bx.appendChild(hx); } else bx.appendChild(el('p', 'res-note', line)); }); c.appendChild(bx); }
    else { if (who) c.appendChild(el('p', 'res-who', who)); if (r.note) c.appendChild(el('p', 'res-note', r.note)); }
    if (r.lose != null && r.lose >= 0) c.appendChild(el('p', 'res-note', r.lose === tb.seat ? '🤡 鬼牌最後在你手上！' : '🤡 鬼牌最後在 ' + tb.seats[r.lose].name + ' 手上'));
    if (S.stat) c.appendChild(el('p', '', '我的積分：' + S.pts + ' 分（' + S.stat.w + ' 勝 ' + S.stat.d + ' 和 ' + S.stat.l + ' 負）'));
    var row = el('div', 'row c'), anyGone = tb.seats.some(function (s) { return s.gone; });
    var others = tb.seats.filter(function (s, i) { return i !== tb.seat && tb.again[i]; }).length;
    if (!anyGone) {
      if (tb.again[tb.seat]) row.appendChild(el('span', 'pill light', '已邀請再玩一局，等待對方…'));
      else row.appendChild(btn('btn-sun', (others ? '對方想再玩！' : '') + '再玩一局', function () { send('again'); }));
    }
    row.appendChild(btn('btn', S.tb.seats.some(function (x) { return x.bot; }) ? '換電腦強度' : '換對手', function () { send('leave'); }));
    c.appendChild(row);
    app.appendChild(c);
  }
  function emotes() {
    var g = el('div', 'emotes');
    EMO.forEach(function (t, i) { g.appendChild(btn('btn', t, function () { if (Date.now() - (emotes.last || 0) < 1500) return; emotes.last = Date.now(); send('emo', { i: i }); bubble(S.tb.seat, t); showEmo = false; render(); })); });
    app.appendChild(g);
  }


  /* ---------- 監視牆：老師打開看你的畫面時，才把畫面傳給老師（縮圖約 1.5 秒一次、放大時約 0.35 秒一次） ---------- */
  var MON = { lv: 0, gz: false, last: '', t: 0, timer: null, mo: null, tap: null, seq: 0, force: false };
  function monSet(lv, gz) {
    lv = +lv || 0; MON.gz = !!gz && !!window.CompressionStream;
    if (lv && !MON.lv) { MON.last = ''; MON.t = 0; }
    MON.lv = lv;
    if (lv && !MON.mo) { MON.mo = new MutationObserver(monQ); MON.mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); }
    if (!lv && MON.mo) { MON.mo.disconnect(); MON.mo = null; clearTimeout(MON.timer); MON.timer = null; }
    if (lv) monQ();
  }
  function monQ() {
    if (!MON.lv || MON.timer) return;
    var gap = MON.lv >= 2 ? 350 : 1500;
    MON.timer = setTimeout(monSend, Math.max(30, MON.t + gap - Date.now()));
  }
  function monHTML() {
    var out = [];
    [].forEach.call(document.body.children, function (c) {
      if (c.tagName === 'SCRIPT' || c.tagName === 'IFRAME' || c === castEl || /(^|\s)bg-scene(\s|$)/.test(c.className || '')) return;
      out.push(c.outerHTML);
    });
    return out.join('').replace(/ id="/g, ' data-oid="').replace(/<script[\s\S]*?<\/script>/gi, '');
  }
  function b64(buf) { var u = new Uint8Array(buf), s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
  function monSend() {
    MON.timer = null; if (!MON.lv || !net || !joined) return;
    var h = monHTML(); if (h === MON.last && !MON.force) return;
    MON.last = h; MON.force = false; MON.t = Date.now();
    var base = { w: window.innerWidth, hh: window.innerHeight, tap: MON.tap, s: ++MON.seq };
    if (MON.gz) {
      new Response(new Blob([h]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function (buf) { base.z = b64(buf); send('scr', base); }, function () { base.h = h; send('scr', base); });
    } else { base.h = h; send('scr', base); }
  }
  document.addEventListener('pointerdown', function (e) { if (!MON.lv) return; MON.tap = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, k: Date.now() }; MON.force = true; monQ(); }, true);
  window.addEventListener('resize', function () { if (MON.lv) { MON.force = true; monQ(); } });
  /* ---------- 特效 ---------- */
  function toast(t) { var d = el('div', 'toast', t); document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2300); }
  var bubbles = {};
  function bubble(seat, t) { bubbles[seat] = { t: t, at: Date.now() }; placeBubbles(); setTimeout(placeBubbles, 3100); }
  function placeBubbles() {
    Object.keys(bubbles).forEach(function (k) {
      var host = app.querySelector('[data-seat="' + k + '"]'); if (!host) return;
      var old = host.querySelector('.bubble'); if (old) old.remove();
      var b = bubbles[k]; if (Date.now() - b.at > 3000) return;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(el('div', 'bubble ' + (+k === (S && S.tb ? S.tb.seat : -1) ? 'up' : 'down'), b.t));
    });
  }
  function confetti() {
    var cols = ['#ff6b6b', '#ffc93c', '#2ec4b6', '#7b5cff', '#4ea8ff'];
    for (var i = 0; i < 60; i++) {
      var p = el('div', 'confetti'); p.style.left = 50 + (Math.random() * 16 - 8) + 'vw'; p.style.top = '45vh'; p.style.background = cols[i % cols.length];
      var a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 340;
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 220 + 'px');
      p.style.animationDelay = Math.random() * .25 + 's'; document.body.appendChild(p);
      setTimeout(function (p) { p.remove(); }.bind(null, p), 3000);
    }
  }
  function netPill() {
    var n = document.querySelector('.net-warn');
    if (netState === 'online' || !joined) { if (n) n.remove(); return; }
    if (!n) { n = el('div', 'pill warn net-warn'); document.body.appendChild(n); }
    n.textContent = netState === 'connecting' ? '🟡 重新連線中…' : '🔴 連線中斷，自動重試中';
  }

  var hg = hashArg('g'); if (hg) BG.load(hg, function () {});
  var SOLO = (location.search.match(/[?&]solo=([\w-]+)/) || [])[1];
  if (SOLO) {
    // 一個人練習：在背景開一個只屬於自己的房間，對手是電腦
    code = ''; me = { pid: 'solo' + Math.random().toString(36).slice(2, 8), name: '我', sid: '' };
    window.addEventListener('message', function (e) { if (e.origin === location.origin && e.data && e.data.bgSolo && !code) { code = e.data.bgSolo; connect(); } });
    var fr = document.createElement('iframe'); fr.src = 'host.html?g=' + SOLO + '&local=1&solo=1'; fr.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;border:0;pointer-events:none'; fr.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fr);
    var c0 = el('div', 'panel p-card'); c0.appendChild(dice()); c0.appendChild(el('p', '', '正在準備練習棋桌…')); app.appendChild(topBar()); app.appendChild(c0);
  } else if (code && me.pid) connect(); else render();
  window.BGPlayer = { state: function () { return S; }, me: function () { return me; } }; // 測試用
})();
