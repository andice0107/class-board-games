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
  setInterval(function () { if (!net) return; if (!joined) hello(); else send('ping', { v: S ? S.v : -1 }); }, 4000);

  var fx = { snd: function (k) { snd.play(k); }, toast: toast };
  function onDown(d) {
    if (!d || d.to !== me.pid) return;
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
      S = d; me.name = d.name; save(); render();
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
  }

  /* ---------- 畫面 ---------- */
  function topBar() {
    var t = el('div', 'p-top');
    t.innerHTML = '<div class="brand"><div class="logo"><i></i><i></i><i></i><i></i></div><h1>桌遊對戰教室</h1></div><span class="sp"></span>';
    t.appendChild(BGSfx.button('btn small ghost'));
    if (joined && S && GAME && GAME.guide) t.appendChild(btn('btn small ghost', '📖 規則', function () { BG.showGuide((BG.meta(S.gid) || {}).title + '・玩法說明', GAME.guide.student); }));
    if (code && !SOLO) t.appendChild(el('span', 'pill', '房間 ' + code));
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
    GAME.render(app, ctx());
    if (S.tb.res) result();
    if (showEmo) emotes();
    placeBubbles();
  }
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
    return { tb: S.tb, canUndo: vsBots, send: send, toast: toast, snd: function (k) { snd.play(k); }, rerender: render,
      button: btn, emoteButton: function (cls) { return btn(cls, '💬 說話', function () { showEmo = !showEmo; render(); }); } };
  }
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
    c.appendChild(el('h2', '', '等待配對中'));
    c.appendChild(el('p', '', '你在這裡的名字是「' + S.name + '」' + (S.sid ? '（' + S.sid + '）' : '') + '。系統正在幫你找對手，請稍等一下。' + (S.qn > 1 ? '（目前有 ' + S.qn + ' 人在等）' : '')));
    if (GAME && GAME.guide) c.appendChild(btn('btn', '📖 等待時先看玩法說明', function () { BG.showGuide(m.title + '・玩法說明', GAME.guide.student); }));
    }
    app.appendChild(c);
    if (S.allowBot && S.botSeats) {
      var bc = el('div', 'panel p-card bot-card');
      bc.appendChild(el('h2', '', SOLO ? '🤖 選擇電腦強度' : '🤖 先和電腦下一盤'));
      if (!SOLO) bc.appendChild(el('p', '', '不想等？選一個電腦的強度就能馬上開桌。和電腦下的棋局不列入積分榜。'));
      var nb = S.botSeats[0];
      if (S.botSeats[1] > S.botSeats[0]) {
        var nr = el('div', 'row c'); nr.appendChild(el('span', '', '電腦玩家人數：'));
        for (var k = S.botSeats[0]; k <= S.botSeats[1]; k++) (function (k) { var b = btn('btn small' + (k === (waiting.n || nb) ? ' on' : ''), k + ' 位', function () { waiting.n = k; render(); }); nr.appendChild(b); })(k);
        bc.appendChild(nr); nb = waiting.n || nb;
      }
      var lv = el('div', 'levels');
      BG.levels.forEach(function (L) {
        var b = btn('lv', '', function () { send('bot', { level: L.n, n: nb }); toast('正在幫你開桌…'); });
        b.innerHTML = '<span class="ic">' + L.icon + '</span><b>' + L.name + '</b><small>' + L.desc + '</small>';
        lv.appendChild(b);
      });
      bc.appendChild(lv);
      app.appendChild(bc);
    }
  }
  function result() {
    var tb = S.tb, r = tb.res, win = r.w === tb.seat, draw = r.w < 0;
    var c = el('div', 'panel result');
    var b = el('div', 'badge', draw ? '🤝' : (win ? '🏆' : '💪')); b.style.background = draw ? '#bfeee9' : (win ? '#ffe7a3' : '#d8e9ff'); c.appendChild(b);
    c.appendChild(el('h2', '', draw ? '平手！' : (win ? '你贏了！' : '這局輸了')));
    c.appendChild(el('p', '', (GAME.reasons[r.why] || '') + (win || draw ? '' : '・下一局再加油！')));
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
