/* 桌遊對戰教室：老師房間（所有遊戲判定都在這台電腦） */
(function () {
  'use strict';
  var GID = (location.search.match(/[?&]g=([\w-]+)/) || [])[1] || 'xiangqi';
  BG.load(GID, function (ok) { if (!ok) { location.href = 'index.html'; return; } main(); });
  function main() {
  var GAME = BG.games[GID], META = BG.meta(GID);
  var SOLO = /[?&]solo=1/.test(location.search);
  var KEY = 'bg-host-' + GID + (BGNet.LOCAL ? '-local' : '') + (SOLO ? '-solo' : ''), MAXP = 40, ONLINE_MS = 15000;
  function $(id) { return document.getElementById(id); }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function btn(c, x, fn) { var b = el('button', c, x); b.type = 'button'; b.addEventListener('click', fn); return b; }
  document.title = META.title + '・桌遊對戰教室（老師）';
  $('h-sfx').appendChild(BGSfx.button('btn small ghost'));
  $('h-game').innerHTML = '<b style="background:' + META.color + '">' + META.icon + '</b>';
  $('h-game').appendChild(document.createTextNode(META.title));
  var S = null, net = null;
  function fresh() { return { gid: GID, code: BGNet.code(), broker: null, players: {}, queue: [], tables: {}, tn: 0, auto: true, at: Date.now() }; }
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  start(!SOLO && saved && saved.code && saved.gid === GID && Date.now() - saved.at < 12 * 3600e3 ? saved : fresh());

  function start(state) {
    if (net) net.close();
    S = state; S.at = Date.now();
    Object.keys(S.players).forEach(function (k) { S.players[k].lastSeen = 0; S.players[k]._on = false; });
    // 遊戲規則改版後，舊的棋局資料不相容：重新開一局
    Object.keys(S.tables).forEach(function (k) { var T = S.tables[k]; if ((T.gv || 0) !== (GAME.ver || 0)) { T.g = GAME.init(T.seats.length); T.again = {}; T.round++; T.gv = GAME.ver || 0; } });
    $('h-code').innerHTML = S.code.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('');
    $('h-qr').textContent = '連線中…'; $('h-url').textContent = '';
    $('h-auto').checked = S.auto;
    net = BGNet.open({ code: S.code, role: 'host', broker: S.broker, onMessage: onUp, onStatus: function (s) {
      var n = $('h-net'); n.textContent = s === 'online' ? '🟢 連線正常' : (s === 'connecting' ? '🟡 連線中…' : '🔴 連線中斷，自動重試中'); n.classList.toggle('warn', s !== 'online');
      if (s === 'online') { S.broker = net.broker; save(); showQR(); if (SOLO && window.parent !== window) window.parent.postMessage({ bgSolo: S.code }, location.origin); }
    } });
    render(); save();
    setTimeout(function () { Object.keys(S.tables).forEach(function (k) { runBots(S.tables[k]); }); }, 500);
  }
  function copyText(x) {
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(x).catch(fallback); return; } } catch (e) {}
    fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = x; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, x.length); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  }
  function joinUrl() {
    var base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    return base + 'play.html' + (BGNet.LOCAL ? '?local=1' : '') + '#r=' + S.code + '&b=' + (S.broker || 0) + '&g=' + GID;
  }
  function showQR() {
    var q = qrcode(0, 'M'); q.addData(joinUrl()); q.make();
    $('h-qr').innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true });
    $('h-url').textContent = joinUrl();
    $('h-copy').onclick = function () { copyText(joinUrl()); var t = $('h-copy-t'); t.textContent = '✅ 已複製（序號 ' + S.code + '），可以貼給學生了'; $('h-copy').classList.add('done'); clearTimeout(t._t); t._t = setTimeout(function () { t.textContent = '📋 點一下複製網址'; $('h-copy').classList.remove('done'); }, 2500); };
  }
  var saveT = null;
  function save() { if (saveT) return; saveT = setTimeout(function () { saveT = null; S.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 400); }

  /* ---------- 玩家與棋桌 ---------- */
  function online(p) { return Date.now() - p.lastSeen < ONLINE_MS; }
  var ADJ = ['快樂', '勇敢', '聰明', '閃亮', '神秘', '冷靜', '熱血', '機智', '可愛', '認真', '飛天', '無敵', '溫柔', '超級', '幸運'],
    NOUN = ['熊貓', '老虎', '海豚', '貓頭鷹', '狐狸', '企鵝', '獅子', '兔子', '松鼠', '老鷹', '無尾熊', '長頸鹿', '小龍', '鯨魚', '刺蝟', '浣熊', '獨角獸', '柴犬'];
  function funName() {
    var taken = {}; Object.keys(S.players).forEach(function (k) { taken[S.players[k].name] = 1; });
    for (var t = 0; t < 200; t++) { var n = ADJ[Math.floor(Math.random() * ADJ.length)] + NOUN[Math.floor(Math.random() * NOUN.length)]; if (!taken[n]) return n; }
    return '同學' + (Object.keys(S.players).length + 1);
  }
  function dname(q) { return q.sid ? q.name + '（' + q.sid + '）' : q.name; }
  function pub(pid) {
    if (BG.isBot(pid)) { var L = BG.levels[(+pid.split(':')[1] || 1) - 1]; return { name: L.icon + ' 電腦（' + L.name + '）', on: true, bot: true, level: L.n }; }
    var q = S.players[pid]; return q ? { name: dname(q), on: online(q) } : { name: '（已離開）', on: false, gone: true }; }
  function names(T) { return T.seats.map(pub); }
  function stOf(p) {
    var s = p.stat || { w: 0, d: 0, l: 0 }, m = { t: 'st', to: p.pid, v: p.ver, name: p.name, sid: p.sid, gid: GID, qn: S.queue.length, stat: s, pts: pts(s), allowBot: S.allowBot !== false, botSeats: GAME.botSeats || null };
    var T = p.table && S.tables[p.table];
    if (T) { var seat = T.seats.indexOf(p.pid); m.tb = { no: T.no, round: T.round, seat: seat, seats: names(T), view: GAME.view(T.g, seat), res: T.g.res || null, again: T.again }; }
    return m;
  }
  function send(p) { if (p) net.send(stOf(p)); }
  function bump(p) { if (!p) return; p.ver++; send(p); }
  function pts(s) { return s.w * 3 + s.d; }
  function score(T) {
    var r = T.g.res; if (!r || T.scored === T.round) return;
    T.scored = T.round;
    if (!SOLO) BGSfx.play('win');
    var vsBot = T.seats.some(BG.isBot);
    T.seats.forEach(function (id, i) { var p = S.players[id]; if (!p) return; var s = p.stat = p.stat || { w: 0, d: 0, l: 0 };
      if (vsBot) { s.bot = s.bot || { w: 0, d: 0, l: 0 }; s = s.bot; }
      if (r.w < 0) s.d++; else if (r.w === i) s.w++; else s.l++; });
  }
  function touch(T) { score(T); runBots(T); T.seats.forEach(function (id) { bump(S.players[id]); }); render(); save(); if (ovId === T.id) drawOv(); drawLb(); }
  function tblOf(p) { return p.table ? S.tables[p.table] : null; }

  function onUp(d) {
    if (!d || !d.pid) return;
    var p = S.players[d.pid];
    if (d.t === 'hello') {
      var sid = String(d.sid || '');
      if (!SOLO && !/^\d{4}$/.test(sid)) return net.send({ t: 'sidtaken', to: d.pid, text: '學號要剛好 4 碼數字。' });
      if (!p && sid) {
        var old = null; Object.keys(S.players).forEach(function (k) { if (S.players[k].sid === sid) old = S.players[k]; });
        if (old && online(old)) return net.send({ t: 'sidtaken', to: d.pid, text: '學號 ' + sid + ' 已經有人在使用了，請確認是不是輸入錯了。' });
        if (old) { // 同一位學生換裝置或重新進來：接回原本的名字、棋桌和積分
          var oid = old.pid; delete S.players[oid]; old.pid = d.pid; S.players[d.pid] = p = old;
          S.queue = S.queue.map(function (x) { return x === oid ? d.pid : x; });
          Object.keys(S.tables).forEach(function (k) { var T = S.tables[k]; T.seats = T.seats.map(function (x) { return x === oid ? d.pid : x; }); });
          Object.keys(S.players).forEach(function (k) { var q = S.players[k]; if (q.lastOpp) q.lastOpp = q.lastOpp.map(function (x) { return x === oid ? d.pid : x; }); });
        }
      }
      if (!p) {
        if (S.locked && !SOLO) return net.send({ t: 'full', to: d.pid, text: '這個房間已經鎖住了，不能再加入。如果你是這班的學生，請告訴老師。' });
        if (Object.keys(S.players).length >= MAXP) return net.send({ t: 'full', to: d.pid, text: '這個房間已經滿了（最多 ' + MAXP + ' 人）。' });
        p = S.players[d.pid] = { pid: d.pid, name: SOLO ? '我' : funName(), sid: sid, joined: Date.now(), lastSeen: 0, ver: 1, table: null, lastOpp: [] };
        if (!SOLO) BGSfx.play('join');
        S.queue.push(p.pid);
      }
      p.lastSeen = Date.now(); p._on = true;
      send(p); pair(); render(); save();
      return;
    }
    if (!p) return net.send({ t: 'gone', to: d.pid });
    var wasOn = online(p); p.lastSeen = Date.now();
    if (!wasOn) { p._on = true; presence(p); }
    var T = tblOf(p), seat = T ? T.seats.indexOf(p.pid) : -1;
    if (d.t === 'ping') { if (d.v !== p.ver) send(p); return; }
    if (d.t === 'bot') { if (!T && S.allowBot !== false) botTable(p, d.level, d.n); return; }
    if (!T) return;
    if (d.t === 'emo') {
      T.seats.forEach(function (id) { if (id !== p.pid) net.send({ t: 'emo', to: id, from: seat, i: d.i | 0 }); });
      return;
    }
    if (d.t === 'again') {
      if (!T.g.res || T.seats.some(function (id) { return !BG.isBot(id) && !S.players[id]; })) return;
      T.again[seat] = true;
      T.seats.forEach(function (id, i) { if (BG.isBot(id)) T.again[i] = true; });
      if (T.seats.every(function (id, i) { return T.again[i]; })) newRound(T, true); else touch(T);
      return;
    }
    if (d.t === 'leave') { if (T.g.res) dissolve(T, p); return; }
    // 平台規則：只有對手全部是電腦時才能悔棋（避免同學對戰時一直悔棋）
    if (d.t === 'req' && d.k === 'undo' && !othersAllBots(T, seat)) { net.send({ t: 'note', to: p.pid, text: '和同學對戰時不能悔棋喔！' }); return; }
    // 其他動作交給遊戲模組
    var changed = GAME.act(T.g, seat, d, function (toSeat, text) { var id = T.seats[toSeat]; if (id) net.send({ t: 'note', to: id, text: text }); });
    if (changed) touch(T); else send(p);
  }
  function othersAllBots(T, seat) { return T.seats.every(function (id, i) { return i === seat || BG.isBot(id); }); }
  function presence(p) {
    var T = tblOf(p); if (T) T.seats.forEach(function (id) { if (id !== p.pid) bump(S.players[id]); });
    render();
  }
  setInterval(function () {
    Object.keys(S.players).forEach(function (k) { var p = S.players[k], on = online(p); if (p._on !== on) { p._on = on; presence(p); } });
  }, 3000);

  /* ---------- 配對 ---------- */
  function pair() { if (S.auto) pairNow(); }
  function seatN() { return GAME.seatOptions ? (S.seatN || GAME.seatDefault || GAME.seatOptions[GAME.seatOptions.length - 1]) : GAME.seats; }
  function pairNow(manual) {
    var N = seatN(), ready = S.queue.filter(function (id) { var p = S.players[id]; return p && online(p); });
    // 老師按「立刻配對」時，不夠一整桌的人也先開小一點的桌（最少 2 人），盡量不留一個人
    var flex = manual === true && GAME.seatOptions, full = N;
    while (ready.length >= N || (flex && ready.length >= 2)) {
      N = full;
      if (flex) { N = Math.min(full, ready.length); if (ready.length - N === 1 && N > 2) N--; }
      var group = [ready.shift()];
      while (group.length < N) {
        var bi = 0, last = S.players[group[0]].lastOpp || [];
        for (var i = 0; i < ready.length; i++) if (last.indexOf(ready[i]) < 0) { bi = i; break; }
        group.push(ready.splice(bi, 1)[0]);
      }
      S.queue = S.queue.filter(function (id) { return group.indexOf(id) < 0; });
      var used = {}; Object.keys(S.tables).forEach(function (k) { used[S.tables[k].no] = 1; });
      var no = 1; while (used[no]) no++;
      group.sort(function () { return Math.random() - .5; });
      var T = { id: 't' + (++S.tn), no: no, round: 0, seats: group };
      S.tables[T.id] = T;
      group.forEach(function (id) { S.players[id].table = T.id; });
      newRound(T, false);
    }
    S.queue.forEach(function (id) { bump(S.players[id]); });
    render(); save();
  }
  /* ---------- 電腦玩家 ---------- */
  function botTable(p, level, n) {
    level = Math.max(1, Math.min(4, level | 0 || 2));
    var rng = GAME.botSeats || [1, 1]; n = Math.max(rng[0], Math.min(rng[1], n | 0 || rng[0]));
    S.queue = S.queue.filter(function (id) { return id !== p.pid; });
    var used = {}; Object.keys(S.tables).forEach(function (k) { used[S.tables[k].no] = 1; });
    var no = 1; while (used[no]) no++;
    var seats = [p.pid]; for (var i = 0; i < n; i++) seats.push('bot:' + level + ':' + i);
    seats.sort(function () { return Math.random() - .5; });
    var T = { id: 't' + (++S.tn), no: no, round: 0, seats: seats };
    S.tables[T.id] = T; p.table = T.id;
    newRound(T, false);
    S.queue.forEach(function (id) { bump(S.players[id]); });
  }
  var botTimers = {};
  function runBots(T) {
    if (botTimers[T.id] || !T.g || T.g.res || !GAME.botTurn) return;
    for (var i = 0; i < T.seats.length; i++) {
      var id = T.seats[i]; if (!BG.isBot(id)) continue;
      var lv = +id.split(':')[1];
      (function (seat, lv) {
        var peek = GAME.botTurn(T.g, seat, 1); // 先用最快的方式確認輪不輪到它
        if (!peek) return;
        botTimers[T.id] = setTimeout(function () {
          delete botTimers[T.id];
          if (S.tables[T.id] !== T || T.g.res) return;
          var a = GAME.botTurn(T.g, seat, lv);
          if (a && GAME.act(T.g, seat, a, function () {})) touch(T);
        }, peek.t === 'resp' ? 900 : 500 + Math.random() * 700);
      })(i, lv);
      if (botTimers[T.id]) return;
    }
  }
  function newRound(T, rotate) {
    if (rotate) T.seats.push(T.seats.shift());
    T.g = GAME.init(T.seats.length); T.again = {}; T.round++; T.gv = GAME.ver || 0;
    touch(T);
  }
  function dissolve(T, first) {
    var ps = T.seats.map(function (id) { return S.players[id]; });
    if (first) ps.sort(function (a, b) { return a === first ? -1 : (b === first ? 1 : 0); });
    delete S.tables[T.id];
    if (ovId === T.id) closeOv();
    ps.forEach(function (p) { if (!p) return; p.table = null; p.lastOpp = T.seats.filter(function (id) { return id !== p.pid; }); S.queue.push(p.pid); bump(p); });
    pair(); render(); save();
  }
  function kick(pid) {
    var p = S.players[pid]; if (!p) return;
    if (!confirm('要請「' + dname(p) + '」離開房間嗎？')) return;
    var T = tblOf(p);
    delete S.players[pid];
    S.queue = S.queue.filter(function (id) { return id !== pid; });
    net.send({ t: 'kick', to: pid, text: '老師已經請你離開這個房間。' });
    if (T) {
      if (!T.g.res) GAME.forfeit(T.g, T.seats.indexOf(pid));
      if (T.seats.every(function (id) { return !S.players[id]; })) delete S.tables[T.id]; else touch(T);
    }
    render(); save();
  }

  /* ---------- 畫面 ---------- */
  var renderT = null;
  function render() { if (renderT) return; renderT = setTimeout(doRender, 80); }
  function nameTag(T, i) {
    var turn = !T.g.res && GAME.turnSeat(T.g) === i, q = pub(T.seats[i]);
    var w = el('div', 'who' + (turn ? ' turn' : ''));
    var c = el('span', 'chipc'); c.style.background = GAME.seatColor(i); w.appendChild(c);
    w.appendChild(el('span', 'n', q.name));
    if (!q.gone) w.appendChild(el('span', 'dot ' + (q.on ? 'on' : 'off')));
    return w;
  }
  function statusOf(T) {
    var nm = names(T), r = T.g.res;
    if (r) return { t: r.w < 0 ? '🤝 ' + GAME.reasons[r.why] : '🏆 ' + nm[r.w].name + '（' + GAME.seatName(r.w) + '）獲勝・' + GAME.reasons[r.why], c: 'done' };
    return GAME.hostStatus(T.g, nm);
  }
  function tableBody(T, big) {
    var w = el('div', big ? 'big-view' : '');
    var order = GAME.hostOrder ? GAME.hostOrder(T.seats.length) : T.seats.map(function (x, i) { return i; });
    var bd = el('div', 'g-' + GID + '-mini'); bd.innerHTML = GAME.hostView(T.g);
    if (T.seats.length === 2) { // 兩人遊戲：上方第 2 位、棋盤、下方第 1 位
      w.appendChild(nameTag(T, order[1])); w.appendChild(bd); w.appendChild(nameTag(T, order[0]));
    } else { T.seats.forEach(function (x, i) { w.appendChild(nameTag(T, i)); }); w.appendChild(bd); }
    return w;
  }
  function doRender() {
    renderT = null;
    $('h-count').textContent = Object.keys(S.players).length + ' 位學生';
    var w = $('h-wait'); w.innerHTML = '';
    $('h-wn').textContent = S.queue.length;
    if (!S.queue.length) w.appendChild(el('span', 'empty', '目前沒有人在等'));
    S.queue.forEach(function (id) {
      var p = S.players[id]; if (!p) return;
      var c = el('span', 'chip'); c.appendChild(el('span', 'dot ' + (online(p) ? 'on' : 'off'))); c.appendChild(el('span', '', dname(p)));
      c.appendChild(btn('x', '×', function () { kick(id); })); w.appendChild(c);
    });
    var box = $('h-tables'); box.innerHTML = '';
    var ts = Object.keys(S.tables).map(function (k) { return S.tables[k]; }).sort(function (a, b) { return a.no - b.no; });
    $('h-notable').classList.toggle('hidden', ts.length > 0);
    ts.forEach(function (T) {
      var c = el('div', 'panel tcard'), hd = el('div', 'hd'), no = el('span', 'no');
      no.appendChild(el('b', '', T.no)); no.appendChild(document.createTextNode('第 ' + T.no + ' 桌'));
      hd.appendChild(no); hd.appendChild(el('span', 'pill light', '第 ' + T.round + ' 局'));
      c.appendChild(hd); c.appendChild(tableBody(T));
      var s = statusOf(T); c.appendChild(el('div', 'st ' + s.c, s.t));
      c.addEventListener('click', function () { openOv(T.id); });
      box.appendChild(c);
    });
  }
  var ovId = null;
  function openOv(id) { ovId = id; $('h-ov').classList.remove('hidden'); drawOv(); }
  function closeOv() { ovId = null; $('h-ov').classList.add('hidden'); }
  function drawOv() {
    var T = S.tables[ovId], b = $('h-ovbox'); if (!T) return closeOv();
    b.innerHTML = '';
    var hd = el('div', 'row'); hd.style.justifyContent = 'space-between';
    hd.appendChild(el('h2', '', '第 ' + T.no + ' 桌・第 ' + T.round + ' 局')); hd.lastChild.style.margin = '0';
    hd.appendChild(btn('btn small', '✕ 關閉', closeOv)); b.appendChild(hd);
    b.appendChild(tableBody(T, true));
    var s = statusOf(T); b.appendChild(el('p', 'st ' + s.c, s.t));
    var row = el('div', 'row c');
    if (!T.g.res) row.appendChild(btn('btn', '🤝 判和並結束這局', function () { if (confirm('確定要判這局和棋嗎？')) { GAME.teacherDraw(T.g); touch(T); } }));
    row.appendChild(btn('btn', '↩️ 解散這桌（回等候區）', function () { if (confirm('確定要解散第 ' + T.no + ' 桌嗎？')) { if (!T.g.res) GAME.teacherDraw(T.g); dissolve(T); } }));
    b.appendChild(row);
  }
  $('h-ov').addEventListener('click', function (e) { if (e.target === this) closeOv(); });
  $('h-auto').addEventListener('change', function () { S.auto = this.checked; save(); pair(); });
  $('h-lock').checked = !!S.locked;
  $('h-lock').addEventListener('change', function () { S.locked = this.checked; save(); render(); });
  $('h-bot').checked = S.allowBot !== false;
  $('h-bot').addEventListener('change', function () { S.allowBot = this.checked; save(); S.queue.forEach(function (id) { bump(S.players[id]); }); });
  $('h-pairnow').addEventListener('click', function () { pairNow(true); });
  if (GAME.seatOptions) {
    var sw = el('div', 'switch seatsel'); sw.appendChild(el('span', '', '每桌人數：'));
    GAME.seatOptions.forEach(function (k) { var b = btn('btn small' + (seatN() === k ? ' on' : ''), k + ' 人', function () { S.seatN = k; save(); [].forEach.call(sw.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); pair(); }); sw.appendChild(b); });
    $('h-auto').parentNode.parentNode.insertBefore(sw, $('h-auto').parentNode);
  }
  $('h-new').addEventListener('click', function () {
    if (!confirm('開新房間會換一個新的代碼，目前所有棋局都會結束。確定嗎？')) return;
    Object.keys(S.players).forEach(function (k) { net.send({ t: 'kick', to: k, text: '老師開了新房間，請重新掃描大螢幕上的 QR code。' }); });
    setTimeout(function () { closeOv(); start(fresh()); }, 300);
  });
  $('h-help').addEventListener('click', function () {
    var st = GAME.guide.student.map(function (x) { return '<h3>' + x.h + '</h3>' + x.html; }).join('');
    BG.showGuide('教師說明・' + META.title, GAME.guide.teacher.concat([{ h: '學生版規則（可投影）', html: st }]));
  });
  $('h-lb').addEventListener('click', function () { $('h-lbov').classList.remove('hidden'); drawLb(); });
  $('h-lbov').addEventListener('click', function (e) { if (e.target === this || e.target.id === 'lb-close') this.classList.add('hidden'); });
  function drawLb() {
    if ($('h-lbov').classList.contains('hidden')) return;
    var rows = Object.keys(S.players).map(function (k) { var p = S.players[k], s = p.stat || { w: 0, d: 0, l: 0 }; return { n: dname(p), w: s.w, d: s.d, l: s.l, pts: pts(s), b: s.bot }; });
    rows.sort(function (a, b) { return b.pts - a.pts || b.w - a.w || a.l - b.l; });
    var h = '<div class="row" style="justify-content:space-between"><h2 style="margin:0">🏆 積分榜・' + META.title + '</h2><button class="btn small" id="lb-close" type="button">✕ 關閉</button></div>' +
      '<p class="empty">同學對戰：贏 3 分・和 1 分・輸 0 分。和電腦下的棋局另外記錄，不列入總分。</p><table class="lb"><tr><th>名次</th><th>名字</th><th>勝</th><th>和</th><th>負</th><th>總分</th><th>對電腦（勝/和/負）</th></tr>';
    var rank = 0, prev = null;
    rows.forEach(function (r, i) { if (!prev || r.pts !== prev.pts || r.w !== prev.w || r.l !== prev.l) rank = i + 1; prev = r;
      var played = r.w + r.d + r.l;
      h += '<tr><td class="medal">' + (!played ? '—' : (['🥇', '🥈', '🥉'][rank - 1] || rank)) + '</td><td>' + esc(r.n) + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td class="pts">' + r.pts + '</td><td class="empty">' + (r.b ? r.b.w + ' / ' + r.b.d + ' / ' + r.b.l : '—') + '</td></tr>'; });
    if (!rows.length) h += '<tr><td colspan="7" class="empty">還沒有學生加入</td></tr>';
    $('h-lbbox').innerHTML = h + '</table>';
  }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  window.BGHost = { state: function () { return S; } }; // 測試用
  }
})();
