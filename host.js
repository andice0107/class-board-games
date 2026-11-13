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
  /* 提示・倒數計時・溫馨小提醒：主持人隨時可開關、調整，全班一起套用 */
  function aidDefault() { return { hint: true, hintN: SOLO ? -1 : 3, tm: false, tsec: 30, tips: true, tipSec: 8 }; }
  function fresh() { return { aid: aidDefault(), gid: GID, code: BGNet.code(), broker: null, players: {}, queue: [], tables: {}, tn: 0, auto: false, allowBot: false, at: Date.now() }; }
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  start(!SOLO && saved && saved.code && saved.gid === GID && Date.now() - saved.at < 12 * 3600e3 ? saved : fresh());

  function start(state) {
    if (net) net.close();
    S = state; S.at = Date.now(); S.cast = null;
    var A0 = aidDefault(); S.aid = S.aid || {}; Object.keys(A0).forEach(function (k) { if (S.aid[k] == null) S.aid[k] = A0[k]; });
    Object.keys(S.tables).forEach(function (k) { S.tables[k].tm = {}; if (S.tables[k].g) aidSync(S.tables[k]); });   // 重新整理後投影一定關掉，學生不會卡在投影畫面
    Object.keys(S.players).forEach(function (k) { S.players[k].lastSeen = 0; S.players[k]._on = false; });
    // 遊戲規則改版後，舊的棋局資料不相容：重新開一局
    Object.keys(S.tables).forEach(function (k) { var T = S.tables[k]; if ((T.gv || 0) !== (GAME.ver || 0)) { T.g = GAME.init(T.seats.length, gopts(T)); T.again = {}; T.round++; T.gv = GAME.ver || 0; T.hu = {}; } });
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
    if (BG.isBot(pid)) { var L = BG.levels[Math.max(1, Math.min(BG.levels.length, +pid.split(':')[1] || 1)) - 1]; return { name: L.icon + ' 電腦（' + L.name + '）' + (isTemp(pid) ? '・暫代' : ''), on: true, bot: true, level: L.n, temp: isTemp(pid) }; }
    var q = S.players[pid]; return q ? { name: dname(q), on: online(q) } : { name: '（已離開）', on: false, gone: true }; }
  function names(T) { return T.seats.map(pub); }
  function stOf(p) {
    var s = p.stat || { w: 0, d: 0, l: 0 }, m = { t: 'st', to: p.pid, v: p.ver, name: p.name, sid: p.sid, gid: GID, qn: S.queue.length, stat: s, pts: pts(s), allowBot: SOLO || S.allowBot === true, cast: S.cast || null, emo: SOLO || S.emo === true, snd: SOLO || S.snd !== false, botSeats: GAME.botSeats || null };
    var T = p.table && S.tables[p.table];
    if (T) { var seat = T.seats.indexOf(p.pid); m.tb = { no: T.no, round: T.round, seat: seat, seats: names(T), view: GAME.view(T.g, seat), res: T.g.res || null, again: T.again, paused: !!T.pz }; m.aid = aidFor(T, seat, p); }
    var PT = !T && p.pend && S.tables[p.pend]; if (PT) m.pend = { no: PT.no, after: (PT.aft || []).indexOf(p.pid) >= 0 };
    m.watch = wLv(p.pid); m.gz = !!window.DecompressionStream; wSent[p.pid] = m.watch;
    return m;
  }
  function send(p) { if (p) net.send(stOf(p)); }
  function bump(p) { if (!p) return; p.ver++; send(p); }
  function pts(s) { return s.w * 3 + s.d; }
  function score(T) {
    var r = T.g.res; if (!r || T.scored === T.round) return;
    T.scored = T.round;
    if (!SOLO) BGSfx.play('win');
    var vsBot = T.seats.some(BG.isBot) || T.seats.length === 1; // 一個人和電腦莊家玩也算對電腦
    T.seats.forEach(function (id, i) { var p = S.players[id]; if (!p) return; var s = p.stat = p.stat || { w: 0, d: 0, l: 0 };
      if (vsBot) { s.bot = s.bot || { w: 0, d: 0, l: 0 }; s = s.bot; }
      if (r.ws) { if (r.ws.indexOf(i) >= 0) s.w++; else s.l++; } else if (r.l != null) { if (r.l === i) s.l++; else s.w++; } else if (r.w < 0) s.d++; else if (r.w === i) s.w++; else s.l++; });
  }
  function touch(T) { drain(T); score(T); if (T.g.res && T.aft && T.aft.length) swapIn(T); aidSync(T); runBots(T); T.seats.forEach(function (id) { bump(S.players[id]); }); render(); save(); if (ovId === T.id) drawOv(); drawLb(); }
  /* 遊戲可以回報事件（例如天使與惡魔的課後紀錄），用學號存起來 */
  function drain(T) {
    if (!GAME.drain || !T.g) return;
    var ev = GAME.drain(T.g); if (!ev || !ev.length) return;
    S.gx = S.gx || {};
    ev.forEach(function (e) { var id = T.seats[e.seat], p = id && S.players[id]; if (GAME.hostRecord) GAME.hostRecord(S.gx, e, p ? { sid: p.sid || '', name: p.name, bot: false } : { sid: '', name: BG.isBot(id) ? '電腦' : '', bot: BG.isBot(id) }); });
  }
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
    if (d.t === 'ping') { if (d.v !== p.ver) send(p); else if ((S.cast ? S.cast.seq : -1) !== (d.cs == null ? -1 : d.cs)) net.send({ t: 'cast', to: p.pid, c: S.cast || null }); return; }
    if (d.t === 'scr') { wFrame(p, d); return; }
    if (d.t === 'bot') { if (!T && (SOLO || S.allowBot === true)) { botTable(p, d.level, d.n, SOLO ? d.opts : null); var NT = tblOf(p); if (NT && SOLO && SPEEDS[d.speed]) NT.speed = d.speed; } return; }
    if (!T) return;
    // 有新同學加入、老師還在決定時，整桌暫停：除了表情，其他動作都先不算
    if (T.pz && d.t !== 'emo') { say(p, '⏸️ 遊戲暫停中，請等老師決定。'); send(p); return; }
    if (d.t === 'hint') { doHint(T, p, seat); return; }
    if (d.t === 'emo') {
      if (S.emo !== true && !SOLO) return;
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
    if (changed) touch(T); else { net.send({ t: 'rej', to: p.pid, a: d.t }); send(p); }   // 不接受這個動作：告訴學生端解除「送出中」
  }
  function othersAllBots(T, seat) { return T.seats.every(function (id, i) { return i === seat || BG.isBot(id); }); }
  function presence(p) {
    var T = tblOf(p); if (T) T.seats.forEach(function (id) { if (id !== p.pid) bump(S.players[id]); });
    render();
  }
  setInterval(function () {
    Object.keys(S.players).forEach(function (k) { var p = S.players[k], on = online(p); if (p._on !== on) { p._on = on; presence(p); } });
  }, 3000);


  /* ---------- 提示・倒數・溫馨小提醒 ---------- */
  function say(p, text) { net.send({ t: 'note', to: p.pid, text: text }); }
  function hleft(T, p) { var A = S.aid; if (!A.hint) return null; if (A.hintN < 0) return -1; return Math.max(0, A.hintN - ((T.hu || {})[p.pid] || 0)); }
  /* 現在輪到哪些真人要動作（同時動作的遊戲可以有好幾位） */
  function actingSeats(T) {
    var g = T.g; if (!g || g.res) return [];
    var a = GAME.acting ? GAME.acting(g) : (GAME.turnSeat ? [GAME.turnSeat(g)] : []);
    return (a || []).filter(function (s) { return s >= 0 && s < T.seats.length && !BG.isBot(T.seats[s]); });
  }
  function turnKey(T, seat) { return T.round + ':' + (GAME.turnKey ? GAME.turnKey(T.g, seat) : (T.g.cnt != null ? T.g.cnt : '')); }
  function newDl(now) { return S.aid.tm && !GAME.noTimer ? now + S.aid.tsec * 1000 : null; }
  function aidSync(T) {
    var now = Date.now(), tm = T.tm = T.tm || {}, act = actingSeats(T), wat = watchSeats(T, act); T.hint = {};
    Object.keys(tm).forEach(function (s) { if (act.indexOf(+s) < 0 && wat.indexOf(+s) < 0) delete tm[s]; });
    act.forEach(function (s) { var k = turnKey(T, s); if (!tm[s] || tm[s].k !== k) tm[s] = { k: k, at: now, dl: newDl(now), tip: null }; });
    wat.forEach(function (s) { var k = turnKey(T, s); if (!tm[s] || tm[s].k !== k) tm[s] = { k: k, at: now, dl: null, tip: null }; });
  }
  /* 有些遊戲（麻將）別人出牌時，不用動作的人也可能想問「我能不能吃碰」：這些人只給提示／小提醒，不倒數 */
  function watchSeats(T, act) {
    var g = T.g; if (!g || g.res || !GAME.watch) return [];
    var a = []; try { a = GAME.watch(g) || []; } catch (e) {}
    return a.filter(function (s) { return s >= 0 && s < T.seats.length && act.indexOf(s) < 0 && !BG.isBot(T.seats[s]); });
  }
  function aidFor(T, seat, p) {
    var A = S.aid, tm = (T.tm || {})[seat], o = { h: A.hint && GAME.hint ? hleft(T, p) : null };
    if (tm && !T.g.res) { if (tm.dl) { o.tl = Math.max(0, tm.dl - (T.pz || Date.now())); o.tt = tm.dl - tm.at; if (T.pz) o.pz = 1; } if (tm.tip) { o.tip = tm.tip; o.tk = tm.k; } }
    var hh = (T.hint || {})[p.pid]; if (hh) o.hint = hh;
    return o;
  }
  function doHint(T, p, seat) {
    var A = S.aid;
    if (!A.hint || !GAME.hint) return say(p, A.hint ? '這個遊戲目前沒有提示。' : '老師目前沒有開放提示功能。');
    if (T.g.res) return;
    T.hint = T.hint || {};
    if (T.hint[p.pid]) { T.hint[p.pid].k = Date.now(); return send(p); }   // 已經有提示了：再顯示一次，不重複扣次數
    var left = hleft(T, p); if (left === 0) return say(p, '這局的提示次數用完了，自己想想看！');
    var ac = actingSeats(T); if (ac.indexOf(seat) < 0 && watchSeats(T, ac).indexOf(seat) < 0) return say(p, '還沒輪到你喔，輪到你的時候再按 💡 提示。');
    var r = null; try { r = GAME.hint(T.g, seat); } catch (e) {}
    if (!r || !r.msg) return say(p, '目前想不到特別的提示，自己再看看。');
    if (!r.free) { T.hu = T.hu || {}; T.hu[p.pid] = (T.hu[p.pid] || 0) + 1; }
    T.hint[p.pid] = { msg: r.msg, hl: r.hl || [], k: Date.now() };
    send(p); render(); save();
  }
  function timeUp(T, seat, p) {
    var e = T.tm[seat], a = null;
    try { a = GAME.autoPlay ? GAME.autoPlay(T.g, seat) : GAME.botTurn(T.g, seat, 1); } catch (x) {}
    if (a && GAME.act(T.g, seat, a, function () {})) { say(p, '⏰ 時間到！系統先幫你出了一步。'); touch(T); }
    else if (e) e.dl = Date.now() + 4000;   // 現在沒有可以代出的動作，過幾秒再試
  }
  function aidTick() {
    var now = Date.now();
    Object.keys(S.tables).forEach(function (k) {
      var T = S.tables[k]; if (!T.g || T.g.res || !T.tm || T.pz) return;
      Object.keys(T.tm).forEach(function (s) {
        var e = T.tm[s], seat = +s, p = S.players[T.seats[seat]]; if (!e || !p) return;
        if (e.dl && now >= e.dl) return timeUp(T, seat, p);
        if (S.aid.tips && !e.tip && !e.tipDone && online(p) && now - e.at >= S.aid.tipSec * 1000) {
          e.tipDone = true; var t = null; try { t = GAME.nudge ? GAME.nudge(T.g, seat) : null; } catch (x) {}
          if (t) { e.tip = t; bump(p); }
        }
      });
      var m = document.querySelector('.tmr[data-t="' + T.id + '"]');
      if (m) { var min = null; Object.keys(T.tm).forEach(function (s) { var d = T.tm[s].dl; if (d && (min == null || d < min)) min = d; }); m.textContent = min ? '⏱ ' + Math.max(0, Math.ceil((min - now) / 1000)) : ''; m.style.display = min ? '' : 'none'; }
    });
  }
  setInterval(aidTick, 1000);
  function aidPush() { save(); Object.keys(S.players).forEach(function (k) { bump(S.players[k]); }); render(); }
  function eachTm(fn) { Object.keys(S.tables).forEach(function (k) { var T = S.tables[k]; Object.keys(T.tm || {}).forEach(function (s) { fn(T, +s, T.tm[s]); }); }); }
  function aidPanel() {
    var box = el('details', 'aid'); box.open = true; box.appendChild(el('summary', '', '🎓 提示・倒數計時・溫馨小提醒（可隨時調整）'));
    function row(c) { var r = el('div', 'aid-row ' + (c || '')); box.appendChild(r); return r; }
    function check(r, label, key, after) { var lb = el('label', 'switch'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!S.aid[key]; cb.addEventListener('change', function () { S.aid[key] = this.checked; if (after) after(); aidPush(); paint(); }); lb.appendChild(cb); lb.appendChild(document.createTextNode(' ' + label)); r.appendChild(lb); }
    function step(r, get, fn, fmt) { var b1 = btn('btn small', '－', function () { fn(-1); aidPush(); paint(); }), v = el('b', 'aid-v'), b2 = btn('btn small', '＋', function () { fn(1); aidPush(); paint(); }); r.appendChild(b1); r.appendChild(v); r.appendChild(b2); return function () { v.textContent = fmt(get()); }; }
    var r1 = row(); check(r1, '💡 開放「提示」', 'hint');
    var r1b = row('sub'); r1b.appendChild(el('span', '', '每局每人'));
    var p1 = step(r1b, function () { return S.aid.hintN; }, function (d) { var n = S.aid.hintN < 0 ? 3 : S.aid.hintN + d; S.aid.hintN = Math.max(1, Math.min(30, n)); }, function (n) { return n < 0 ? '無限' : n + ' 次'; });
    var un = btn('btn small', '♾️ 無限', function () { S.aid.hintN = S.aid.hintN < 0 ? 3 : -1; aidPush(); paint(); }); r1b.appendChild(un);
    var r2 = row(); check(r2, '⏱ 開啟「思考倒數計時」', 'tm', function () { var now = Date.now(); eachTm(function (T, s, e) { e.dl = newDl(now); e.at = e.at || now; }); });
    var r2b = row('sub'); r2b.appendChild(el('span', '', '每次思考'));
    var p2 = step(r2b, function () { return S.aid.tsec; }, function (d) { S.aid.tsec = Math.max(5, Math.min(600, S.aid.tsec + d * (S.aid.tsec >= 60 ? 15 : 5))); }, function (n) { return n + ' 秒'; });
    var r2c = row('sub'); r2c.appendChild(el('span', '', '現在全班每人多給'));
    [10, 30, 60].forEach(function (n) { var b = btn('btn small', '+' + n + ' 秒', function () { if (!S.aid.tm) return; eachTm(function (T, s, e) { if (e.dl) { e.dl += n * 1000; var pl = S.players[T.seats[s]]; if (pl) say(pl, '老師多給你 ' + n + ' 秒思考時間'); } }); aidPush(); }); b.className += ' addsec'; r2c.appendChild(b); });
    var r3 = row(); check(r3, '🌟 開啟「溫馨小提醒」（不扣提示次數）', 'tips');
    var r3b = row('sub'); r3b.appendChild(el('span', '', '沒動作超過'));
    var p3 = step(r3b, function () { return S.aid.tipSec; }, function (d) { S.aid.tipSec = Math.max(3, Math.min(60, S.aid.tipSec + d * (S.aid.tipSec >= 15 ? 5 : 1))); }, function (n) { return n + ' 秒'; });
    r3b.appendChild(el('span', '', '就提醒'));
    box.appendChild(el('p', 'aid-note', (GAME.noTimer ? '⚠️ 這個遊戲是大家同時搶答，沒有「輪流思考」，所以不會有倒數計時（提示和小提醒仍可使用）。' : '') + '倒數時間到了，系統會幫該位學生代出一步。提示次數是「每局」重新計算；調整次數會立刻套用到全班。'));
    function paint() { p1(); p2(); p3(); un.classList.toggle('on', S.aid.hintN < 0); r1b.classList.toggle('off', !S.aid.hint); r2b.classList.toggle('off', !S.aid.tm); r2c.classList.toggle('off', !S.aid.tm); [].forEach.call(r2c.querySelectorAll('button'), function (b) { b.disabled = !S.aid.tm; }); r3b.classList.toggle('off', !S.aid.tips); }
    paint(); return box;
  }
  window.BGAidPanel = aidPanel;

  /* ---------- 配對 ---------- */
  function pair() { if (S.auto) pairNow(); else { fillJoin(); render(); save(); } }
  function seatN() { return GAME.seatOptions ? (S.seatN || GAME.seatDefault || GAME.seatOptions[GAME.seatOptions.length - 1]) : GAME.seats; }
  function pairNow(manual) {
    fillJoin();
    var N = seatN(), ready = S.queue.filter(function (id) { var p = S.players[id]; return p && online(p); });
    // 老師按「立刻配對」時，不夠一整桌的人也先開小一點的桌（最少 2 人），盡量不留一個人
    var flex = manual === true && GAME.seatOptions, full = N;
    while ((ready.length >= N || (flex && ready.length >= 2)) && !oneFull()) {
      N = full;
      if (flex) { N = Math.min(full, ready.length); if (ready.length - N === 1 && N > 2) N--; }
      var group = [ready.shift()];
      while (group.length < N) {
        var bi = 0, last = S.players[group[0]].lastOpp || [];
        for (var i = 0; i < ready.length; i++) if (last.indexOf(ready[i]) < 0) { bi = i; break; }
        group.push(ready.splice(bi, 1)[0]);
      }
      makeTable(group);
    }
    // 人數不足：老師有開「電腦陪玩」時，剩下的人先開桌，空位由電腦暫代
    if (canFill() && ready.length && (manual === true || S.auto) && !oneFull()) makeTable(withBots(ready.splice(0, full)));
    S.queue.forEach(function (id) { bump(S.players[id]); });
    render(); save();
  }
  // 有些遊戲（天使與惡魔）全班只能開一桌
  function oneFull() { return !!GAME.oneTable && !SOLO && Object.keys(S.tables).length > 0; }
  function makeTable(group) {
    var first = GAME.oneTable && !SOLO && !Object.keys(S.tables).length;
    S.queue = S.queue.filter(function (id) { return group.indexOf(id) < 0; });
    var used = {}; Object.keys(S.tables).forEach(function (k) { used[S.tables[k].no] = 1; });
    var no = 1; while (used[no]) no++;
    group.sort(function () { return Math.random() - .5; });
    var T = { id: 't' + (++S.tn), no: no, round: 0, seats: group };
    S.tables[T.id] = T;
    group.forEach(function (id) { if (S.players[id]) S.players[id].table = T.id; });
    newRound(T, false);
    if (first) setTimeout(function () { openOv(T.id); }, 50);   // 只有一桌：開好就直接放大
    return T;
  }
  /* 老師手動配對：在等候名單點學生名字選人，再按「開成一桌」 */
  var SEL = [];
  function manualRange() { return GAME.seatOptions ? [Math.min.apply(null, GAME.seatOptions), Math.max.apply(null, GAME.seatOptions)] : [GAME.seats, GAME.seats]; }
  function manualPair() {
    var r = manualRange(), g = SEL.filter(function (id) { return S.queue.indexOf(id) >= 0; });
    if (oneFull()) { alert('這個遊戲全班只能開一桌。要換人玩，請先在桌子裡按「解散這桌」。'); return; }
    if (canFill() && g.length >= 1 && g.length < seatN()) { SEL = []; makeTable(withBots(g)); S.queue.forEach(function (id) { bump(S.players[id]); }); render(); save(); return; }
    if (g.length < r[0] || g.length > r[1]) { alert(r[0] === r[1] ? '這個遊戲一桌要剛好 ' + r[0] + ' 個人' : '一桌要 ' + r[0] + '～' + r[1] + ' 個人'); return; }
    SEL = []; makeTable(g);
    S.queue.forEach(function (id) { bump(S.players[id]); });
    render(); save();
  }

  /* ---------- 人數不足時電腦先陪玩，真人加入再換人 ---------- */
  // 不適合「中途接手」的遊戲：同時搶答、或電腦已經知道的牌／猜測紀錄會讓接手的人不公平
  var NOTAKE = { 'spot-match': '大家同時搶答，中途換人分數和牌的歸屬容易有爭議', 'spot-zhuyin': '大家同時搶答，中途換人分數和牌的歸屬容易有爭議', 'spot-hanzi': '大家同時搶答，中途換人分數和牌的歸屬容易有爭議',
    'seven-eat-nine': '大家同時搶出牌，中途換人容易有爭議', guess: '前面的猜測和範圍是電腦猜的，接手的人不公平', 'dice-bluff': '電腦已經喊過的數字和策略，接手的人接不上',
    cheat: '前面的出牌和吹牛紀錄是電腦記住的，接手的人不公平', blackjack: '這一局的下注已經由電腦決定了', 'ten-half': '這一局的下注已經由電腦決定了', 'dragon-gate': '彩池和下注已經由電腦決定了' };
  function isTemp(id) { return BG.isBot(id) && /:f\d+$/.test(id); }
  function canFill() { return !SOLO && S.fill === true && !!GAME.botTurn && !GAME.oneTable; }
  function withBots(humans) {
    var g = humans.slice(), lv = S.fillLv || 2, k = 0;
    while (g.length < seatN()) g.push('bot:' + lv + ':f' + (k++));
    return g;
  }
  function tempCount(T) { return T.seats.filter(isTemp).length; }
  function tempSeat(T) { for (var i = 0; i < T.seats.length; i++) if (isTemp(T.seats[i])) return i; return -1; }
  /* 等候中的真人同學，自動找有「電腦暫代」位子的桌子：這局還在玩就整桌暫停，等老師決定 */
  function fillJoin() {
    if (!canFill()) return;
    var ready = S.queue.filter(function (id) { var p = S.players[id]; return p && online(p) && !p.noFill; });
    ready.forEach(function (id) {
      var p = S.players[id];
      var ts = Object.keys(S.tables).map(function (k) { return S.tables[k]; }).filter(function (T) { return !T.join && tempCount(T) > (T.aft || []).length; }).sort(function (a, b) { return a.no - b.no; });
      var T = ts[0]; if (!T) return;
      S.queue = S.queue.filter(function (x) { return x !== id; });
      if (T.g.res) { seatIn(T, p, tempSeat(T)); return; }   // 這局剛好結束：直接坐進去，下一局一起玩
      T.join = { pid: id, seat: tempSeat(T), at: Date.now() }; p.pend = T.id;
      pause(T); BGSfx.play('join'); send(p);
    });
  }
  function seatIn(T, p, seat) {
    var old = T.seats[seat]; T.seats[seat] = p.pid; p.table = T.id; p.pend = null; p.noFill = false;
    if (T.again) T.again[seat] = false;
    T.seats.forEach(function (id) { if (id !== p.pid && S.players[id]) say(S.players[id], dname(p).replace(/（\d{4}）/, '') + ' 加入了，換掉' + pub(old).name.replace('・暫代', '')); });
  }
  function pause(T) { if (!T.pz) T.pz = Date.now(); clearTimeout(botTimers[T.id]); delete botTimers[T.id]; touch(T); }
  function resume(T) {
    if (!T.pz) return; var d = Date.now() - T.pz; T.pz = null;
    Object.keys(T.tm || {}).forEach(function (s) { var e = T.tm[s]; if (e.dl) e.dl += d; if (e.at) e.at += d; });
    if (T.g && GAME.onResume) { try { GAME.onResume(T.g, d); } catch (x) {} }
  }
  function joinDecide(T, how) {
    var J = T.join, p = J && S.players[J.pid]; if (!J) return;
    T.join = null;
    if (!p) { resume(T); touch(T); return; }
    if (how === 'take') { seatIn(T, p, J.seat); resume(T); say(p, '你接手了電腦的位子，接著玩到這局結束！'); touch(T); }
    else if (how === 'new') { seatIn(T, p, J.seat); if (T.aft && T.aft.length) swapIn(T); T.pz = null; T.seats.forEach(function (id) { if (S.players[id]) say(S.players[id], '🔄 老師重開新局，所有人分數重新計算'); }); newRound(T, false); }
    else if (how === 'later') { (T.aft = T.aft || []).push(p.pid); resume(T); say(p, '這一局先由電腦打完，下一局你就會加入第 ' + T.no + ' 桌。'); send(p); touch(T); }
    else { p.pend = null; p.noFill = true; S.queue.push(p.pid); resume(T); send(p); touch(T); }
    fillJoin(); render(); save();
  }
  function swapIn(T) { var l = T.aft; T.aft = []; l.forEach(function (pid) { var p = S.players[pid], s = tempSeat(T); if (!p) return; if (s < 0) { p.pend = null; S.queue.push(p.pid); bump(p); return; } seatIn(T, p, s); }); }
  function drawJoin() {
    var ov = $('h-joinov'), list = Object.keys(S.tables).map(function (k) { return S.tables[k]; }).filter(function (T) { return T.join; }).sort(function (a, b) { return a.no - b.no; });
    if (!list.length) { if (ov) ov.remove(); return; }
    if (!ov) { ov = el('div', 'overlay joinov'); ov.id = 'h-joinov'; document.body.appendChild(ov); }
    var key = list.map(function (T) { return T.id + T.join.pid; }).join(','); if (ov._k === key) return; ov._k = key;
    ov.innerHTML = ''; var box = el('div', 'panel joinbox'); ov.appendChild(box);
    box.appendChild(el('h2', '', '🙋 有真人同學加入了'));
    box.appendChild(el('p', 'empty', '這一桌已經暫停（倒數也一起暫停），所有玩家的畫面都先霧化，等你決定。'));
    list.forEach(function (T) {
      var p = S.players[T.join.pid], c = el('div', 'joincard');
      c.appendChild(el('p', 'jt', '第 ' + T.no + ' 桌：「' + (p ? dname(p) : '同學') + '」要換掉 ' + pub(T.seats[T.join.seat]).name.replace('・暫代', '') + '（' + GAME.seatName(T.join.seat) + '）'));
      var why = NOTAKE[GID];
      var b1 = btn('btn jbtn take', '▶️ 真人接這一局繼續玩到結束（繼承電腦玩家的分數）', function () { joinDecide(T, 'take'); });
      if (why) { b1.disabled = true; b1.title = why; }
      c.appendChild(b1);
      c.appendChild(btn('btn jbtn new', '🔄 重開新局（所有人分數全部重算）', function () { joinDecide(T, 'new'); }));
      if (why) { c.appendChild(el('small', 'empty', '⚠️ 這個遊戲不建議中途接手：' + why + '。')); c.appendChild(btn('btn jbtn later', '⏭️ 這局先讓電腦打完，下一局再換他', function () { joinDecide(T, 'later'); })); }
      c.appendChild(btn('btn small ghost', '先不要，讓他回等候區', function () { joinDecide(T, 'back'); }));
      box.appendChild(c);
    });
  }
  /* ---------- 電腦玩家 ---------- */
  function botTable(p, level, n, opts) {
    level = Math.max(1, Math.min(4, level | 0 || 2));
    var rng = GAME.botSeats || [1, 1]; n = Math.max(rng[0], Math.min(rng[1], n | 0 || rng[0]));
    S.queue = S.queue.filter(function (id) { return id !== p.pid; });
    var used = {}; Object.keys(S.tables).forEach(function (k) { used[S.tables[k].no] = 1; });
    var no = 1; while (used[no]) no++;
    var seats = [p.pid]; for (var i = 0; i < n; i++) seats.push('bot:' + level + ':' + i);
    seats.sort(function () { return Math.random() - .5; });
    var T = { id: 't' + (++S.tn), no: no, round: 0, seats: seats };
    if (opts) T.opts = opts;
    S.tables[T.id] = T; p.table = T.id;
    newRound(T, false);
    S.queue.forEach(function (id) { bump(S.players[id]); });
  }
  var SPEEDS = { vslow: 3.5, slow: 2, normal: 1, fast: .6, vfast: .35 };
  function speedOf(T) { return SPEEDS[T.speed || S.speed || 'normal'] || 1; }
  var botTimers = {}, botCnt = {};
  function runBots(T) {
    if (GAME.botWait && botTimers[T.id] && T.g && botCnt[T.id] !== T.g.cnt) { clearTimeout(botTimers[T.id]); delete botTimers[T.id]; }
    if (botTimers[T.id] || !T.g || T.g.res || !GAME.botTurn || T.pz) return;
    if (GAME.botWait) return raceBots(T);
    for (var i = 0; i < T.seats.length; i++) {
      var id = T.seats[i]; if (!BG.isBot(id)) continue;
      var lv = +id.split(':')[1];
      (function (seat, lv) {
        var peek = GAME.botTurn(T.g, seat, 1); // 先用最快的方式確認輪不輪到它
        if (!peek) return;
        botTimers[T.id] = setTimeout(function () {
          delete botTimers[T.id];
          if (S.tables[T.id] !== T || T.g.res || T.pz || !BG.isBot(T.seats[seat])) return;
          var a = GAME.botTurn(T.g, seat, lv);
          if (a && GAME.act(T.g, seat, a, function () {})) touch(T);
        }, (peek.t === 'resp' ? 900 : (GAME.botDelay || 500) + Math.random() * 700) * speedOf(T));
      })(i, lv);
      if (botTimers[T.id]) return;
    }
  }
  /* 搶答型遊戲：每個電腦各自有反應時間，最快的那個先出手；桌面一變就重新計時 */
  function raceBots(T) {
    var best = null, c0 = botCnt[T.id] = T.g.cnt;
    T.seats.forEach(function (id, seat) {
      if (!BG.isBot(id) || !GAME.botTurn(T.g, seat, 1)) return;
      var w = GAME.botWait(T.g, seat, +id.split(':')[1]) * speedOf(T);
      if (!best || w < best.w) best = { w: w, seat: seat, lv: +id.split(':')[1] };
    });
    if (!best) return;
    botTimers[T.id] = setTimeout(function () {
      delete botTimers[T.id];
      if (S.tables[T.id] !== T || T.g.res || T.pz || !BG.isBot(T.seats[best.seat])) return;
      if (T.g.cnt !== c0) return runBots(T);
      var a = GAME.botTurn(T.g, best.seat, best.lv);
      if (a && GAME.act(T.g, best.seat, a, function () {})) touch(T); else runBots(T);
    }, best.w);
  }
  /* 遊戲自己的設定（例如終極密碼的「猜中的人輸／贏」）：老師端設定，單人練習由學生自己選 */
  function gopts(T) {
    var o = { _x: SOLO ? {} : (S.gx && S.gx.cfg) || {}, _solo: SOLO, _bots: T ? T.seats.map(BG.isBot) : [] }; (GAME.opts || []).forEach(function (d) { o[d.k] = (T && T.opts && T.opts[d.k] != null) ? T.opts[d.k] : (S.gopts && S.gopts[d.k] != null ? S.gopts[d.k] : d.list[0][0]); });
    return o;
  }
  function newRound(T, rotate) {
    if (rotate) T.seats.push(T.seats.shift());
    T.g = GAME.init(T.seats.length, gopts(T)); T.again = {}; T.round++; T.gv = GAME.ver || 0; T.hu = {}; T.tm = {};
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
    Object.keys(S.tables).forEach(function (k) { var X = S.tables[k]; if (X.join && X.join.pid === pid) { X.join = null; resume(X); } if (X.aft) X.aft = X.aft.filter(function (x) { return x !== pid; }); });
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
    if (r && r.ws) return { t: (r.ws.length ? '🏆 ' + r.ws.map(function (i) { return nm[i].name; }).join('、') + ' 獲勝・' : '💪 ') + GAME.reasons[r.why], c: 'done' };
    if (r && r.l != null) return { t: '💥 ' + nm[r.l].name + '（' + GAME.seatName(r.l) + '）' + GAME.reasons[r.why], c: 'done' };
    if (r) return { t: r.w < 0 ? '🤝 ' + GAME.reasons[r.why] : '🏆 ' + nm[r.w].name + '（' + GAME.seatName(r.w) + '）獲勝・' + GAME.reasons[r.why], c: 'done' };
    return GAME.hostStatus(T.g, nm);
  }
  function tableBody(T, big) {
    var w = el('div', big ? 'big-view' : '');
    var order = GAME.hostOrder ? GAME.hostOrder(T.seats.length) : T.seats.map(function (x, i) { return i; });
    var bd = el('div', 'g-' + GID + '-mini'); bd.innerHTML = GAME.hostView(T.g, T);
    if (T.seats.length === 2) { // 兩人遊戲：上方第 2 位、棋盤、下方第 1 位
      w.appendChild(nameTag(T, order[1])); w.appendChild(bd); w.appendChild(nameTag(T, order[0]));
    } else { T.seats.forEach(function (x, i) { w.appendChild(nameTag(T, i)); }); w.appendChild(bd); }
    return w;
  }
  function doRender() {
    renderT = null;
    drawJoin(); if (W.on) wallDraw();
    // 只有一桌的遊戲：桌子開了之後，控制台就放在桌子的放大畫面裡（左半邊）
    if (GP && GAME.oneTable && !$('h-ov').classList.contains('wide')) GP.style.display = Object.keys(S.tables).length ? 'none' : '';
    $('h-count').textContent = Object.keys(S.players).length + ' 位學生';
    var w = $('h-wait'); w.innerHTML = '';
    $('h-wn').textContent = S.queue.length;
    if (!S.queue.length) w.appendChild(el('span', 'empty', '目前沒有人在等'));
    SEL = SEL.filter(function (id) { return S.queue.indexOf(id) >= 0; });
    S.queue.forEach(function (id) {
      var p = S.players[id]; if (!p) return;
      var on = SEL.indexOf(id) >= 0, c = el('span', 'chip pick' + (on ? ' sel' : '')); c.title = '點名字選人，選好再按「開成一桌」';
      c.appendChild(el('span', on ? 'ck' : 'dot ' + (online(p) ? 'on' : 'off'), on ? '✓' : null)); c.appendChild(el('span', '', dname(p)));
      c.addEventListener('click', function (e) { if (e.target.classList.contains('x')) return; var i = SEL.indexOf(id); if (i >= 0) SEL.splice(i, 1); else SEL.push(id); render(); });
      c.appendChild(btn('x', '×', function () { kick(id); })); w.appendChild(c);
    });
    var mp = $('h-manual');
    if (!mp) { mp = el('div', 'manual'); mp.id = 'h-manual'; w.parentNode.insertBefore(mp, w.nextSibling); }
    mp.innerHTML = '';
    if (S.queue.length) {
      var rg = manualRange();
      if (!SEL.length) mp.appendChild(el('small', 'empty', '👆 手動配對：點學生名字選人（' + (rg[0] === rg[1] ? rg[0] : rg[0] + '～' + rg[1]) + ' 人一桌），再按「開成一桌」'));
      else {
        var ok = SEL.length >= rg[0] && SEL.length <= rg[1];
        var b = btn('btn small' + (ok ? ' on' : ''), '🤝 把選的 ' + SEL.length + ' 人開成一桌', manualPair); if (!ok) b.disabled = true; mp.appendChild(b);
        mp.appendChild(btn('btn small', '取消選取', function () { SEL = []; render(); }));
        if (!ok) mp.appendChild(el('small', 'empty', SEL.length < rg[0] ? '還要再選 ' + (rg[0] - SEL.length) + ' 人' : '最多 ' + rg[1] + ' 人一桌'));
      }
    }
    if (GAME.hostPanelUpdate) GAME.hostPanelUpdate(API);
    var box = $('h-tables'); box.innerHTML = '';
    var ts = Object.keys(S.tables).map(function (k) { return S.tables[k]; }).sort(function (a, b) { return a.no - b.no; });
    $('h-notable').classList.toggle('hidden', ts.length > 0);
    ts.forEach(function (T) {
      var c = el('div', 'panel tcard'), hd = el('div', 'hd'), no = el('span', 'no');
      no.appendChild(el('b', '', T.no)); no.appendChild(document.createTextNode('第 ' + T.no + ' 桌'));
      hd.appendChild(no); hd.appendChild(el('span', 'pill light', '第 ' + T.round + ' 局')); var tmr = el('span', 'pill light tmr'); tmr.setAttribute('data-t', T.id); tmr.style.display = 'none'; hd.appendChild(tmr);
      c.appendChild(hd); c.appendChild(tableBody(T));
      var s = statusOf(T); c.appendChild(el('div', 'st ' + s.c, s.t));
      var bdg = GAME.hostBadge && GAME.hostBadge(T.g); if (bdg) { c.appendChild(el('div', 'st warn tbadge', bdg)); c.classList.add('alert'); }
      c.addEventListener('click', function () { openOv(T.id); });
      box.appendChild(c);
    });
  }

  /* ---------- 監視牆：看每位玩家的即時畫面（玩家端把畫面傳過來，只有老師打開時才傳） ---------- */
  var W = { on: false, open: {}, big: null, cast: null, fr: {}, sig: '' }, wSent = {};
  function wLv(pid) { if (W.cast === pid || W.big === pid) return 2; return W.on && W.open[pid] ? 1 : 0; }
  function wSync() { Object.keys(S.players).forEach(function (k) { var l = wLv(k); if ((wSent[k] || 0) !== l) { wSent[k] = l; net.send({ t: 'watch', to: k, lv: l, gz: !!window.DecompressionStream }); } }); }
  function unz(d, cb) {
    if (!d.z) return cb(d.h || '');
    try { var bin = atob(d.z), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(cb, function () {}); } catch (e) {}
  }
  function wFrame(p, d) {
    var pid = p.pid, seq = d.s | 0;
    unz(d, function (h) {
      var f = W.fr[pid]; if (f && f.s > seq && seq > 0) return;
      W.fr[pid] = { h: h, w: d.w || 390, hh: d.hh || 844, tap: d.tap || null, at: Date.now(), s: seq };
      wPaint(pid);
    });
  }
  /* 把玩家畫面縮放後放進 box（maxW × maxH） */
  function mirror(box, f, maxW, maxH) {
    var k = Math.min(maxW / f.w, maxH / f.hh), m = box.querySelector('.wm');
    if (!m) { box.innerHTML = ''; m = el('div', 'wm'); box.appendChild(m); m._h = null; }
    m.style.width = f.w + 'px'; m.style.height = f.hh + 'px'; m.style.transform = 'scale(' + k + ')';
    box.style.width = Math.round(f.w * k) + 'px'; box.style.height = Math.round(f.hh * k) + 'px';
    if (m._h !== f.h) { m.innerHTML = f.h; m._h = f.h; }
    if (f.tap && f.tap.k !== box._tap && Date.now() - f.at < 1500) {
      box._tap = f.tap.k; var t = el('div', 'wtap'); t.style.left = f.tap.x * f.w + 'px'; t.style.top = f.tap.y * f.hh + 'px'; m.appendChild(t); setTimeout(function () { t.remove(); }, 900);
    }
  }
  function wPaint(pid) {
    var f = W.fr[pid]; if (!f) return;
    var t = document.querySelector('#h-wall .wt[data-p="' + pid + '"] .wt-scr');
    if (t && W.open[pid]) mirror(t, f, t.parentNode.clientWidth - 12, 330);
    if (W.big === pid) { var b = document.querySelector('#h-wbig .wb-scr'); if (b) mirror(b, f, Math.min(innerWidth - 60, 1500), innerHeight - 150); }
    if (W.cast === pid && W.castBox) mirror(W.castBox, f, BG.CAST_W - 160, BG.CAST_H - 110);
  }
  function wPlayers() {
    var list = [];
    Object.keys(S.tables).map(function (k) { return S.tables[k]; }).sort(function (a, b) { return a.no - b.no; }).forEach(function (T) { T.seats.forEach(function (id, i) { if (S.players[id]) list.push({ p: S.players[id], T: T, seat: i }); }); });
    Object.keys(S.players).forEach(function (k) { var p = S.players[k]; if (!list.some(function (x) { return x.p === p; })) list.push({ p: p, T: null, seat: -1 }); });
    return list;
  }
  function wallOpen() { W.on = true; wallDraw(true); wSync(); }
  function wallClose() { W.on = false; W.big = null; var o = $('h-wall'); if (o) o.remove(); var b = $('h-wbig'); if (b) b.remove(); wSync(); }
  function wallDraw(force) {
    var list = wPlayers(), sig = list.map(function (x) { return x.p.pid + (x.T ? x.T.no : '-') + x.seat + (W.open[x.p.pid] ? 1 : 0) + (online(x.p) ? 1 : 0); }).join('|');
    var o = $('h-wall');
    if (!o) { o = el('div', 'overlay wall'); o.id = 'h-wall'; document.body.appendChild(o); force = true; }
    if (!force && sig === W.sig) return; W.sig = sig;
    o.innerHTML = '';
    var box = el('div', 'panel wallbox'), hd = el('div', 'wall-hd');
    hd.appendChild(el('h2', '', '📺 學生監視牆'));
    hd.appendChild(el('small', 'empty', '縮圖預設遮蔽；點 👁 打開單一位，點畫面可以放大。'));
    var sp = el('span', 'sp'); hd.appendChild(sp);
    hd.appendChild(btn('btn small', '👁 全開', function () { list.forEach(function (x) { W.open[x.p.pid] = true; }); wSync(); wallDraw(true); }));
    hd.appendChild(btn('btn small', '🙈 全關', function () { W.open = {}; wSync(); wallDraw(true); }));
    hd.appendChild(btn('btn small btn-sun', '✕ 關閉監視牆', wallClose));
    box.appendChild(hd);
    var grid = el('div', 'wall-grid');
    if (!list.length) grid.appendChild(el('p', 'empty', '還沒有學生加入。'));
    list.forEach(function (x) {
      var pid = x.p.pid, op = !!W.open[pid], t = el('div', 'wt' + (op ? ' open' : '')); t.setAttribute('data-p', pid);
      var th = el('div', 'wt-hd');
      if (x.T) { var c = el('span', 'chipc'); c.style.background = GAME.seatColor(x.seat); th.appendChild(c); }
      th.appendChild(el('b', '', dname(x.p)));
      th.appendChild(el('small', '', x.T ? '第 ' + x.T.no + ' 桌' : (x.p.pend ? '等老師安排' : '等候中')));
      th.appendChild(el('span', 'dot ' + (online(x.p) ? 'on' : 'off')));
      th.appendChild(btn('btn small wt-eye', op ? '🙈' : '👁', function (e) { e.stopPropagation(); if (W.open[pid]) delete W.open[pid]; else W.open[pid] = true; wSync(); wallDraw(true); }));
      t.appendChild(th);
      var sc = el('div', 'wt-scr');
      if (!op) sc.appendChild(el('div', 'wt-mask', '🙈 已遮蔽'));
      else if (!W.fr[pid]) sc.appendChild(el('div', 'wt-mask wait', online(x.p) ? '⏳ 等待畫面…' : '📴 離線中'));
      var sw = el('div', 'wt-sw'); sw.appendChild(sc); t.appendChild(sw);
      t.addEventListener('click', function () { wBig(pid); });
      grid.appendChild(t);
    });
    box.appendChild(grid); o.appendChild(box);
    list.forEach(function (x) { if (W.open[x.p.pid]) wPaint(x.p.pid); });
  }
  function wBig(pid) {
    var p = S.players[pid]; if (!p) return;
    W.big = pid; wSync();
    var o = $('h-wbig'); if (o) o.remove();
    o = el('div', 'overlay wbig'); o.id = 'h-wbig'; document.body.appendChild(o);
    var box = el('div', 'panel wbbox'), hd = el('div', 'wall-hd'), T = tblOf(p);
    hd.appendChild(el('h2', '', '🔍 ' + dname(p) + (T ? '・第 ' + T.no + ' 桌' : '')));
    hd.appendChild(el('span', 'sp'));
    var cb = btn('btn small btn-sun', W.cast === pid ? '⏹ 停止投影' : '📽️ 投影給其他玩家看', function () { if (W.cast === pid) { var pj = $('h-proj'); if (pj && pj._close) pj._close(); } else wCast(pid); wBig(pid); });
    hd.appendChild(cb);
    hd.appendChild(btn('btn small', '✕ 關閉放大', function () { W.big = null; o.remove(); wSync(); }));
    box.appendChild(hd);
    var sc = el('div', 'wb-scr'); if (!W.fr[pid]) sc.appendChild(el('div', 'wt-mask wait', online(p) ? '⏳ 等待畫面…（學生的裝置要開著）' : '📴 這位學生目前離線'));
    var sw = el('div', 'wb-sw'); sw.appendChild(sc); box.appendChild(sw);
    o.appendChild(box);
    o.addEventListener('click', function (e) { if (e.target === o) { W.big = null; o.remove(); wSync(); } });
    wPaint(pid);
  }
  /* 把某位玩家的即時畫面投影到其他所有玩家的裝置（他自己繼續玩，不會被蓋住） */
  function wCast(pid) {
    var p = S.players[pid]; if (!p) return;
    var node = el('div', 'wcast'), cap = el('div', 'wcast-cap', '📺 ' + p.name + ' 的畫面'), scr = el('div', 'wcast-scr');
    node.appendChild(cap); node.appendChild(scr);
    W.cast = pid; W.castBox = scr; wSync();
    API.project(node, { cast: true, ex: pid, onClose: function () { W.cast = null; W.castBox = null; wSync(); if (W.big) wBig(W.big); } });
    wPaint(pid);
  }
  $('h-wallbtn') || (function () { var b = btn('btn small ghost', '📺 監視牆', wallOpen); b.id = 'h-wallbtn'; if (!SOLO) $('h-lb').parentNode.insertBefore(b, $('h-lb')); })();
  /* ---------- 同步投影：主持人畫面上的內容，同步出現在每位學生的裝置上（學生關不掉），可以用螢幕畫筆 ---------- */
  function castOpen(o, node, opt) {
    o.classList.add('cast');
    var fit = el('div', 'cast-fit'), stage = el('div', 'cast-stage'), cv = document.createElement('canvas');
    cv.width = BG.CAST_W; cv.height = BG.CAST_H; cv.className = 'cast-cv';
    var body = el('div', 'cast-html' + (opt.doc ? ' doc' : '')); body.appendChild(node);
    stage.appendChild(body); stage.appendChild(cv); fit.appendChild(stage); o.appendChild(fit);
    var C = S.cast = { id: Date.now(), seq: 0, html: '', sk: [], ex: opt.ex || null }, cur = null, mode = 'op', color = '#ffeb3b', timer = null;
    function ser() { return body.innerHTML.replace(/（\d{4}）/g, ''); }   // 學生畫面不顯示學號
    function push(now) {
      if (timer && !now) return;
      clearTimeout(timer);
      timer = setTimeout(function () { timer = null; if (S.cast !== C) return; C.seq++; C.html = ser(); C.doc = !!opt.doc; C.st = body.scrollHeight > body.clientHeight ? body.scrollTop / (body.scrollHeight - body.clientHeight) : 0; net.send({ t: 'cast', to: '*', c: { id: C.id, seq: C.seq, html: C.html, doc: C.doc, st: C.st, ex: C.ex, sk: cur ? C.sk.concat([cur]) : C.sk } }); }, now ? 0 : 120);
    }
    body.addEventListener('scroll', function () { push(); });   // 捲動也同步給玩家
    var mo = new MutationObserver(function () { push(); }); mo.observe(body, { subtree: true, childList: true, characterData: true, attributes: true });
    function redraw() { BG.castDraw(cv, cur ? C.sk.concat([cur]) : C.sk); }
    // 工具列
    var bar = el('div', 'cast-bar'), tools = {};
    function setMode(m) { mode = m; cv.style.pointerEvents = m === 'op' ? 'none' : 'auto'; cv.style.cursor = m === 'er' ? 'cell' : m === 'pen' ? 'crosshair' : ''; Object.keys(tools).forEach(function (k) { tools[k].classList.toggle('on', k === m); }); }
    tools.op = btn('btn small', '👆 操作畫面', function () { setMode('op'); });
    tools.pen = btn('btn small', '🖊️ 畫筆', function () { setMode('pen'); });
    tools.er = btn('btn small', '🧽 橡皮擦', function () { setMode('er'); });
    bar.appendChild(el('span', 'cast-live', '📡 投影中：每位玩家的畫面都會看到'));
    bar.appendChild(tools.op); bar.appendChild(tools.pen);
    ['#ffeb3b', '#ff5252', '#69f0ae', '#40c4ff', '#ffffff'].forEach(function (c) { var b = btn('cast-dot', '', function () { color = c; setMode('pen'); [].forEach.call(bar.querySelectorAll('.cast-dot'), function (x) { x.classList.toggle('on', x === b); }); }); b.style.background = c; if (c === color) b.classList.add('on'); bar.appendChild(b); });
    bar.appendChild(tools.er);
    bar.appendChild(btn('btn small', '↩️ 返回上一步', function () { C.sk.pop(); redraw(); push(true); }));
    bar.appendChild(btn('btn small', '🗑️ 全清筆劃', function () { C.sk = []; redraw(); push(true); }));
    bar.appendChild(btn('btn small btn-sun', '✕ 關閉投影', function () { close(); }));
    o.appendChild(bar);
    setMode('op');
    function pt(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * BG.CAST_W), Math.round((e.clientY - r.top) / r.height * BG.CAST_H)]; }
    cv.addEventListener('pointerdown', function (e) { if (mode === 'op') return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} cur = { c: color, w: mode === 'er' ? 60 : 7, e: mode === 'er' ? 1 : 0, p: [pt(e)] }; redraw(); push(); });
    cv.addEventListener('pointermove', function (e) { if (!cur) return; cur.p.push(pt(e)); redraw(); push(); });
    function up() { if (!cur) return; C.sk.push(cur); cur = null; redraw(); push(true); }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    function layout() { BG.castFit(fit, stage, bar.offsetHeight + 16); }
    window.addEventListener('resize', layout); setTimeout(layout, 0); layout();
    function close() {
      mo.disconnect(); window.removeEventListener('resize', layout); clearTimeout(timer);
      o.remove(); if (S.cast === C) { S.cast = null; net.send({ t: 'cast', to: '*', c: null }); }
      if (opt.onClose) opt.onClose();
    }
    o._close = close;
    push(true);
    return o;
  }
  var ovId = null;
  var GP = null;   // 遊戲自己的老師控制台（天神控制台）
  function wideOv() { return !!(GAME.oneTable && GP); }
  function openOv(id) {
    ovId = id; $('h-ov').classList.remove('hidden');
    if (wideOv()) { var bx = $('h-ovbox'); $('h-ov').classList.add('wide'); bx.innerHTML = ''; var L = el('div', 'ov-l'), R = el('div', 'ov-r'); L.appendChild(GP); bx.appendChild(L); bx.appendChild(R); GP.style.display = ''; }
    drawOv();
  }
  function closeOv() {
    ovId = null; $('h-ov').classList.add('hidden');
    if (GP && $('h-ov').classList.contains('wide')) { $('h-ov').classList.remove('wide'); $('h-tables').parentNode.insertBefore(GP, $('h-tables')); $('h-ovbox').innerHTML = ''; render(); }
  }
  function drawOv() {
    var T = S.tables[ovId], b = $('h-ovbox'); if (!T) return closeOv();
    if (wideOv() && b.querySelector('.ov-r')) b = b.querySelector('.ov-r');
    b.innerHTML = '';
    var hd = el('div', 'row'); hd.style.justifyContent = 'space-between';
    hd.appendChild(el('h2', '', '第 ' + T.no + ' 桌・第 ' + T.round + ' 局')); hd.lastChild.style.margin = '0';
    hd.appendChild(btn('btn small', '✕ 關閉', closeOv)); b.appendChild(hd);
    b.appendChild(tableBody(T, true));
    var s = statusOf(T); b.appendChild(el('p', 'st ' + s.c, s.t));
    if (GAME.hostTable) b.appendChild(GAME.hostTable(T, API));
    var row = el('div', 'row c');
    if (!T.g.res) row.appendChild(btn('btn', '🤝 判和並結束這局', function () { if (confirm('確定要判這局和棋嗎？')) { GAME.teacherDraw(T.g); touch(T); } }));
    row.appendChild(btn('btn', '↩️ 解散這桌（回等候區）', function () { if (confirm('確定要解散第 ' + T.no + ' 桌嗎？')) { if (!T.g.res) GAME.teacherDraw(T.g); dissolve(T); } }));
    b.appendChild(row);
  }
  /* 給遊戲模組用的老師端工具（天使與惡魔的天神功能） */
  var API = {
    solo: SOLO, state: function () { return S; },
    cfg: function () { S.gx = S.gx || {}; S.gx.cfg = S.gx.cfg || {}; return S.gx.cfg; },
    gx: function () { S.gx = S.gx || {}; return S.gx; },
    tables: function () { return Object.keys(S.tables).map(function (k) { return S.tables[k]; }).sort(function (a, b) { return a.no - b.no; }); },
    act: function (T, d) { if (!GAME.hostAct || !T.g) return false; var ok = GAME.hostAct(T.g, d, function (toSeat, text) { var id = T.seats[toSeat]; if (id) net.send({ t: 'note', to: id, text: text }); }); if (ok) touch(T); return ok; },
    actAll: function (d) { var n = 0; API.tables().forEach(function (T) { if (API.act(T, d)) n++; }); return n; },
    name: function (T, i) { return pub(T.seats[i]).name; },
    isBot: function (T, i) { return BG.isBot(T.seats[i]); },
    save: save, render: function () { render(); if (ovId) drawOv(); },
    project: function (node, opt) {
      opt = opt || {};
      var o0 = $('h-proj'); if (o0) { if (o0._close) o0._close(); else o0.remove(); }
      var o = el('div', 'proj'); o.id = 'h-proj'; document.body.appendChild(o);
      if (opt.cast && !SOLO) return castOpen(o, node, opt);
      o.appendChild(btn('btn small proj-x', '✕ 關閉投影', function () { o.remove(); if (opt.onClose) opt.onClose(); })); o.appendChild(node); return o;
    },
    download: function (name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); },
    el: el, btn: btn,
    open: function (T) { if (T && S.tables[T.id]) openOv(T.id); }
  };
  if (GAME.hostPanel && !SOLO) { var gp = GAME.hostPanel(API); if (gp) { GP = gp; gp.classList.add('gpanel'); $('h-tables').parentNode.insertBefore(gp, $('h-tables')); } }
  $('h-ov').addEventListener('click', function (e) { if (e.target === this) closeOv(); });
  $('h-auto').addEventListener('change', function () { S.auto = this.checked; save(); pair(); });
  (function () {
    var sw = el('div', 'switch seatsel speedsel'); sw.appendChild(el('span', '', '電腦出牌速度：'));
    [['vslow', '🐌 最慢'], ['slow', '🐢 慢'], ['normal', '普通'], ['fast', '🐇 快'], ['vfast', '⚡ 最快']].forEach(function (o) { var b = btn('btn small' + ((S.speed || 'normal') === o[0] ? ' on' : ''), o[1], function () { S.speed = o[0]; save(); [].forEach.call(sw.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); }); sw.appendChild(b); });
    $('h-lock').parentNode.parentNode.insertBefore(sw, $('h-lock').parentNode);
    // 學生端的「說話」和音效由老師統一控制（說話預設關、音效預設開）
    [['emo', '💬 讓學生使用「說話」功能'], ['snd', '🔊 學生端音效']].forEach(function (o) {
      var lb = el('label', 'switch'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = o[0] === 'emo' ? S.emo === true : S[o[0]] !== false;   // 說話預設關、音效預設開
      cb.addEventListener('change', function () { S[o[0]] = this.checked; save(); Object.keys(S.players).forEach(function (k) { bump(S.players[k]); }); });
      lb.appendChild(cb); lb.appendChild(document.createTextNode(' ' + o[1]));
      sw.parentNode.insertBefore(lb, sw);   // 速度列維持在「鎖住房間」正上方
    });
  })();
  $('h-lock').checked = !!S.locked;
  $('h-lock').addEventListener('change', function () { S.locked = this.checked; save(); render(); });
  if (!SOLO && GAME.botTurn && !GAME.oneTable) (function () {
    var lb = el('label', 'switch fillsw'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = S.fill === true;
    lb.appendChild(cb); lb.appendChild(document.createTextNode(' 🤖 人數不足時先由電腦陪玩（真人加入再換人）'));
    var lvr = el('div', 'switch seatsel fill-lv'); lvr.appendChild(el('span', '', '陪玩電腦強度：'));
    BG.levels.forEach(function (L) { var b = btn('btn small' + ((S.fillLv || 2) === L.n ? ' on' : ''), L.icon + ' ' + L.name, function () { S.fillLv = L.n; save(); [].forEach.call(lvr.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); }); lvr.appendChild(b); });
    function paint() { lvr.style.display = cb.checked ? '' : 'none'; }
    cb.addEventListener('change', function () { S.fill = this.checked; save(); paint(); if (S.fill) fillJoin(); render(); });
    var hb = $('h-bot').parentNode; hb.parentNode.insertBefore(lb, hb.nextSibling); hb.parentNode.insertBefore(lvr, lb.nextSibling); paint();
  })();
  $('h-bot').checked = S.allowBot === true;
  $('h-bot').addEventListener('change', function () { S.allowBot = this.checked; save(); S.queue.forEach(function (id) { bump(S.players[id]); }); });
  $('h-pairnow').addEventListener('click', function () { pairNow(true); });
  if (!SOLO) $('h-pairnow').parentNode.parentNode.appendChild(aidPanel());
  if (GAME.seatOptions) {
    var sw = el('div', 'switch seatsel'); sw.appendChild(el('span', '', '每桌人數：'));
    GAME.seatOptions.forEach(function (k) { var b = btn('btn small' + (seatN() === k ? ' on' : ''), k + ' 人', function () { S.seatN = k; save(); [].forEach.call(sw.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); pair(); }); sw.appendChild(b); });
    $('h-auto').parentNode.parentNode.insertBefore(sw, $('h-auto').parentNode);
  }
  (GAME.opts || []).forEach(function (d) {
    var sw = el('div', 'switch seatsel'); sw.appendChild(el('span', '', d.label));
    d.list.forEach(function (o) { var b = btn('btn small' + (gopts()[d.k] === o[0] ? ' on' : ''), o[1], function () { S.gopts = S.gopts || {}; S.gopts[d.k] = o[0]; save(); [].forEach.call(sw.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); }); sw.appendChild(b); });
    if (d.note) sw.appendChild(el('small', 'empty', d.note));
    sw.classList.add('gopt'); $('h-qr').parentNode.insertBefore(sw, $('h-qr'));   // 開局選項放在 QR code 上面，一眼就看得到
  });
  $('h-new').addEventListener('click', function () {
    if (!confirm('開新房間會換一個新的代碼，目前所有棋局都會結束。確定嗎？')) return;
    Object.keys(S.players).forEach(function (k) { net.send({ t: 'kick', to: k, text: '老師開了新房間，請重新掃描大螢幕上的 QR code。' }); });
    setTimeout(function () { closeOv(); start(fresh()); }, 300);
  });
  $('h-help').addEventListener('click', function () {
    var st = GAME.guide.student.map(function (x) { return '<h3>' + x.h + '</h3>' + x.html; }).join('');
    var act = SOLO ? null : { label: '📽️ 投影給所有玩家看（同步到每個人的裝置）', fn: function () {
      var d = el('div', 'g-body cast-doc'); d.innerHTML = '<h2>📖 ' + META.title + '・玩法說明</h2>' + st;
      API.project(d, { cast: true, doc: true });
    } };
    BG.showGuide('教師說明・' + META.title, GAME.guide.teacher.concat([{ h: '學生版規則（可投影）', html: st, act: act }]));
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
