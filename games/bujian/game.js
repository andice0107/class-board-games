/* 部件撿紅點（國語生字部件湊字，老師自訂題庫）
   - 每個生字拆成兩個部件；每個部件各有一張紅色、一張黑色 → 每個生字 4 張牌，可以湊出 2 次這個字。
   - 每人手牌 3 張（開房可改），桌上翻開 4 張，其餘當牌堆。順時鐘輪流。
   - 輪到你：手牌的一張＋桌上翻開的一張能組成生字 → 兩張收到自己桌邊；不能（或不想）就打一張到桌上。之後從牌堆補一張（牌堆沒牌就不補）。
   - 所有人手牌都出完就結束：桌上剩下的牌作廢，誰都不算分（和撲克牌撿紅點一樣，比較公平）。
   - 計分（開房時選，遊戲中不能改）：一組生字 10 分，或一張紅色部件 10 分。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#2a7bd4', '#2a9d6f', '#e0a020'];
  var REASONS = { most: '分數最高', tie: '分數一樣，平手', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師判和' };
  /* 範例題庫：只是讓老師先試玩用，正式上課請換成自己的生字 */
  var SAMPLE = { name: '範例（試玩用）', list: [['你', '亻', '尔'], ['他', '亻', '也'], ['拍', '扌', '白'], ['打', '扌', '丁'], ['明', '日', '月'], ['林', '木', '木'], ['好', '女', '子'], ['吃', '口', '乞'], ['和', '禾', '口'], ['河', '氵', '可']] };
  var DB_URL = 'https://raw.githubusercontent.com/andice0107/hanzi-component-detective/main/hanzi_db.json';
  var DB = null;
  function loadDB(cb) {
    if (DB) return cb(DB);
    fetch(DB_URL).then(function (r) { return r.json(); }).then(function (j) { DB = j; cb(DB); }).catch(function () { cb(null); });
  }
  /* 只輸入生字 → 用漢字部件庫自動帶出兩個部件；拆不開或超過兩個部件的，寫成註解請老師（或 AI）決定 */
  function autoSplit(chars, db) {
    var ok = [], todo = [];
    chars.forEach(function (c) {
      var p = db[c];
      if (p && p.length === 2) ok.push(c + '＝' + p[0] + '＋' + p[1]);
      else if (!p) todo.push('// ' + c + '：部件庫裡沒有這個字，請自己寫成「' + c + '＝部件＋部件」');
      else if (p.length === 1) todo.push('// ' + c + '：部件庫說這個字拆不開（這個遊戲用不到，可以略過）');
      else todo.push('// ' + c + '：部件庫拆成 ' + p.join('、') + '（' + p.length + ' 個），請依字的結構合併成兩個部件（例如 號＝号＋虎），改好後刪掉 // ');
    });
    return { ok: ok, todo: todo };
  }
  var AI_PROMPT = [
    '請幫我把國語課本某一課的生字，做成「部件撿紅點」卡牌遊戲要用的部件資料。',
    '',
    '一、資料來源',
    '1. 生字：只用我貼給你的課本／書商教材裡的生字表（必要時加上教材的「形近字」），不要自己加別的字。',
    '2. 部件：以我的漢字部件庫為準：' + DB_URL,
    '   這個檔案是 JSON，格式是 "字": ["部件1", "部件2", …]。請先查這個檔案，再決定怎麼拆。',
    '3. 部件拆法以教育部標準字體為準；部件的寫法要和字裡實際的樣子一樣（例如 氵、扌、亻、訁要寫成「言」或照部件庫）。',
    '',
    '二、怎麼拆（這個遊戲每個字只能拆成「兩個」部件）',
    '1. 部件庫剛好是兩個部件：直接照用，例如 你＝亻＋尔。',
    '2. 部件庫超過兩個部件：依字的結構（左右、上下、內外）合併成兩大塊，例如 號＝号＋虎。合併後的那一塊最好是學生認得的字或常見部件。',
    '3. 部件庫只有一個部件（拆不開，例如 耳、目）或查不到：不要硬拆，放在最後的註解列出來。',
    '4. 同一個部件在不同字裡要用同一種寫法（例如「亻」不要有時寫「人」），這樣遊戲才能配對。',
    '',
    '三、輸出格式（嚴格遵守，我會直接貼進遊戲）',
    '1. 純文字，第一行寫「@名稱 第幾課 課名」，例如：@名稱 第五課 生字',
    '2. 之後一行一個字，寫成「字＝部件＋部件」，用全形＝和＋。',
    '3. 不要編號、不要表格、不要其他說明文字。',
    '4. 需要提醒我的事情，寫在最後，每一行用 // 開頭（遊戲會自動略過 // 開頭的行），例如：',
    '   // 拆不開：耳、目',
    '   // 號：部件庫是 口、丂、虍、儿，我合併成 号＋虎',
    '',
    '四、範例',
    '@名稱 第五課 生字',
    '你＝亻＋尔',
    '他＝亻＋也',
    '清＝氵＋青',
    '晴＝日＋青',
    '號＝号＋虎',
    '// 拆不開：耳',
    '',
    '五、輸出前檢查',
    '1. 每一行都是「一個字＝部件＋部件」，剛好兩個部件。',
    '2. 沒有重複的字；只用這一課的生字。',
    '3. 每個字都有查過部件庫；有合併或略過的字，都寫在最後的 // 註解。',
    '',
    '請先回答「了解」，我再貼上這一課的生字表。'
  ].join('\n');
  var HOWTO = '<ol class="bj-howto">' +
    '<li><b>做部件資料（兩種方法選一種）</b><ul>' +
    '<li><b>最快：</b>按「➕ 新增題庫」，在「只輸入生字」那一格貼上這一課的生字（例如：你他拍清晴），按「🔍 自動查部件」。系統會到你的漢字部件庫查好，剛好拆成兩個部件的字會自動填好；拆不開或部件太多的字會寫成 // 開頭的提醒，請自己改好或刪掉。</li>' +
    '<li><b>用 AI：</b>按「🤖 複製給 AI 的提示詞」，貼到 ChatGPT、Claude、Gemini 等 AI，等它回答「了解」後，貼上課本的生字表（可以直接拍照或複製書商教材）。AI 會照格式回給你一段「字＝部件＋部件」的文字。</li></ul></li>' +
    '<li><b>匯入遊戲：</b>按「➕ 新增題庫」，把 AI 給的文字整段貼進大框框（或按「選擇檔案」上傳 AI 存給你的 .txt 檔）。下面會顯示讀到幾個生字，看不懂的行會用紅字標出來。檢查部件拆得對不對，填上題庫名稱，按「💾 儲存並使用」。</li>' +
    '<li><b>開桌前設定：</b>確認「這次要玩的生字」是剛剛的題庫，再選「計分方式」（一組生字 10 分／一張紅色部件 10 分）和「手牌張數」。這些都在 QR code 上方。</li>' +
    '<li><b>開始玩：</b>讓學生掃 QR code（或貼網址）用 4 位數學號加入，系統會自動或由你手動分桌，每桌 2～4 人，人數不夠可以讓電腦補位。學生加入後遊戲就開始了。</li>' +
    '<li><b>回家練習：</b>按「🔗 複製學生在家練習連結」，把連結給學生，學生就能用同一份生字和電腦練習。</li>' +
    '<li><b>下次再用：</b>題庫會存在這台電腦的瀏覽器裡，下次開房直接點題庫名稱就好。換電腦時，請把題庫文字再貼一次（建議把 AI 給的文字另存成 .txt 檔保留）。</li></ol>';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 題庫文字解析：一行一個字，例如「你＝亻＋尔」「你 亻 尔」「你,亻,尔」 ---------- */
  function parseBank(text) {
    var out = { name: '', list: [], errs: [] }, seen = {};
    String(text || '').split(/\r?\n|;/).forEach(function (raw, ln) {
      var line = raw.replace(/\/\/.*$/, '').trim(); if (!line) return;
      var m = line.match(/^[@＠#]\s*(名稱|題庫|標題|name)?\s*[:：]?\s*(.+)$/); if (m && !/[＝=]/.test(line)) { if (!out.name) out.name = m[2].trim(); return; }
      if (/^【.*】$/.test(line)) return;
      var s = line.replace(/##/g, ' ').replace(/[⿰-⿻]/g, ' ');
      var tk = s.split(/[\s=＝+＋,，、:：|｜/／→]+/).filter(Boolean);
      if (tk.length === 1 && Array.from(tk[0]).length === 3) tk = Array.from(tk[0]);
      if (tk.length < 3) { out.errs.push('第 ' + (ln + 1) + ' 行「' + line + '」看不懂：請寫成「字＝部件＋部件」'); return; }
      if (tk.length > 3) { out.errs.push('第 ' + (ln + 1) + ' 行「' + line + '」部件超過兩個，這個遊戲每個字只能拆成兩個部件'); return; }
      if (Array.from(tk[0]).length !== 1) { out.errs.push('第 ' + (ln + 1) + ' 行「' + line + '」第一個要是一個生字'); return; }
      if (seen[tk[0]]) { out.errs.push('「' + tk[0] + '」重複了，只算一次'); return; }
      if (Array.from(tk[1]).length > 3 || Array.from(tk[2]).length > 3) { out.errs.push('第 ' + (ln + 1) + ' 行部件太長'); return; }
      seen[tk[0]] = 1; out.list.push([tk[0], tk[1], tk[2]]);
    });
    return out;
  }
  function bankText(b) { return (b.name ? '@名稱 ' + b.name + '\n' : '') + b.list.map(function (w) { return w[0] + '＝' + w[1] + '＋' + w[2]; }).join('\n'); }
  function soloBank() {
    try {
      var q = (window.parent && window.parent !== window ? window.parent.location.search : location.search) || '';
      var m = q.match(/[?&]w=([^&]+)/); if (!m) return null;
      var b = parseBank(decodeURIComponent(m[1])); return b.list.length >= 2 ? b : null;
    } catch (e) { return null; }
  }

  /* ---------- 規則 ---------- */
  function combos(g, a, b) { var out = []; g.words.forEach(function (w, i) { if ((w[1] === a.p && w[2] === b.p) || (w[1] === b.p && w[2] === a.p)) out.push(i); }); return out; }
  function cardOf(list, id) { for (var i = 0; i < list.length; i++) if (list[i].i === id) return list[i]; return null; }
  function setPts(g, set) { return g.mode === 'red' ? (set.r[0] + set.r[1]) * 10 : 10; }
  function score(g, s) { return g.won[s].reduce(function (a, x) { return a + setPts(g, x); }, 0); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function nextSeat(g, s) { for (var k = 1; k <= g.np; k++) { var n = (s + k) % g.np; if (g.out.indexOf(n) < 0) return n; } return s; }
  function pairs(g, hand) { var o = []; hand.forEach(function (c) { g.table.forEach(function (t) { var w = combos(g, c, t); if (w.length) o.push({ c: c, t: t, w: w[0] }); }); }); return o; }
  function take(g, s, c, t, w) { g.won[s].push({ w: w, r: [c.r, t.r], p: [c.p, t.p] }); }
  function sweep(g) {   // 大家手牌都出完：桌上還能湊成字的，給最後出牌的人
    var s = g.lastS, got = [], again = true;
    while (again) {
      again = false;
      for (var i = 0; i < g.table.length && !again; i++) for (var j = i + 1; j < g.table.length && !again; j++) {
        var w = combos(g, g.table[i], g.table[j]);
        if (w.length) { var a = g.table[i], b = g.table[j]; g.table.splice(j, 1); g.table.splice(i, 1); if (s != null && g.out.indexOf(s) < 0) take(g, s, a, b, w[0]); got.push(w[0]); again = true; }
      }
    }
    g.sweep = { s: s, w: got };
  }
  function finish(g) {
    g.sweep = { s: null, w: [], n: g.table.length };   // 桌上剩下的牌作廢
    var a = alive(g), bv = -1, top = [];
    a.forEach(function (s) { var v = score(g, s); if (v > bv) { bv = v; top = [s]; } else if (v === bv) top.push(s); });
    if (top.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };            // 大家同分才算平手
    else if (top.length > 1) g.res = { ws: top, why: 'most', note: bv + ' 分' };          // 幾個人並列最高分：都算贏
    else g.res = { w: top[0], why: 'most', note: bv + ' 分' };
  }
  function afterPlay(g, s) {
    if (g.deck.length) { g.hands[s].push(g.deck.pop()); g.drew = 1; } else g.drew = 0;
    g.lastS = s; g.cnt++;
    var a = alive(g);
    if (a.every(function (x) { return !g.hands[x].length; })) { finish(g); return; }
    var n = nextSeat(g, s), guard = 0;
    while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n);
    g.turn = n;
  }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.table = g.table.concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = { w: a.length ? a[0] : -1, why: why }; return; }
    if (g.turn === seat) { var n = nextSeat(g, seat), guard = 0; while (!g.hands[n].length && guard++ < g.np) n = nextSeat(g, n); g.turn = n; }
    if (a.every(function (x) { return !g.hands[x].length; })) finish(g);
  }
  /* 這張牌還有沒有機會湊成字（另一半還在牌堆、手牌或桌上） */
  function partnerLeft(g, c, seat) {
    var pool = g.table.concat(g.deck); g.hands.forEach(function (h, s) { if (s !== seat) pool = pool.concat(h); });
    return pool.filter(function (x) { return combos(g, c, x).length; }).length;
  }

  var mod = {
    seats: 4, seatOptions: [2, 3, 4], seatDefault: 4, botSeats: [1, 3], botDelay: 1100,
    reasons: REASONS,
    levelDesc: ['常常亂出牌', '看到能湊的字就湊', '會先湊紅色的、留好牌', '會記牌，丟出別人湊不到的部件'],
    opts: [
      { k: 'score', label: '計分方式：', list: [['set', '🀄 一組生字 10 分'], ['red', '🔴 一張紅色部件 10 分']], note: '開桌後這一局就不能改' },
      { k: 'hand', label: '手牌張數：', list: [['3', '3 張'], ['4', '4 張'], ['5', '5 張']] }
    ],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(2, Math.min(4, n || 4));
      var bank = (o._solo ? soloBank() : (o._x && o._x.bank)) || SAMPLE;
      var words = bank.list.map(function (w) { return [w[0], w[1], w[2]]; }), deck = [], id = 0;
      words.forEach(function (w) { [w[1], w[2]].forEach(function (p) { deck.push({ i: id++, p: p, r: 1 }); deck.push({ i: id++, p: p, r: 0 }); }); });
      shuffle(deck);
      var hn = +o.hand || 3; while (hn > 1 && n * hn + 2 > deck.length) hn--;
      var g = { np: n, mode: o.score === 'red' ? 'red' : 'set', hn: hn, bank: bank.name || '', words: words, deck: deck, hands: [], won: [], table: [], out: [], turn: 0, last: null, cnt: 0, res: null, lastS: null, sweep: null };
      for (var s = 0; s < n; s++) { g.hands.push(deck.splice(0, hn)); g.won.push([]); }
      g.table = deck.splice(0, Math.min(4, Math.max(0, deck.length)));
      g.turn = Math.floor(Math.random() * n);
      return g;
    },
    turnSeat: function (g) { return g.turn; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, mode: g.mode, hn: g.hn, bank: g.bank, words: g.words, turn: g.turn, table: g.table, hand: seat >= 0 ? g.hands[seat] : null,
        counts: g.hands.map(function (h) { return h.length; }), won: g.won, scores: g.won.map(function (x, s) { return score(g, s); }),
        left: g.deck.length, last: g.last, sweep: g.sweep, out: g.out, cnt: g.cnt, res: !!g.res };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t !== 'play' || g.turn !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], c = cardOf(h, d.c); if (!c) return false;
      if (d.take != null) {
        var t = cardOf(g.table, d.take); if (!t) return false;
        var ws = combos(g, c, t); if (!ws.length) return false;
        var w = ws.indexOf(d.w) >= 0 ? d.w : ws[0];
        h.splice(h.indexOf(c), 1); g.table.splice(g.table.indexOf(t), 1); take(g, seat, c, t, w);
        g.last = { s: seat, c: c, t: t, w: w };
      } else {
        h.splice(h.indexOf(c), 1); g.table.push(c); g.last = { s: seat, c: c, t: null };
      }
      afterPlay(g, seat);
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || g.turn !== seat || !g.hands[seat].length) return null;
      var h = g.hands[seat], ps = pairs(g, h);
      if (lv <= 1 && Math.random() < .45) { var c0 = h[Math.floor(Math.random() * h.length)], p0 = ps.filter(function (p) { return p.c === c0; })[0]; return { t: 'play', c: c0.i, take: p0 && Math.random() < .6 ? p0.t.i : null, w: p0 ? p0.w : null, n: g.cnt }; }
      if (ps.length) {
        if (lv >= 3) ps.sort(function (a, b) { return (b.c.r + b.t.r) - (a.c.r + a.t.r); }); else shuffle(ps);
        return { t: 'play', c: ps[0].c.i, take: ps[0].t.i, w: ps[0].w, n: g.cnt };
      }
      // 湊不到：丟一張。厲害的電腦先丟「別人也湊不到」的牌、再丟黑色的
      var best = null;
      h.forEach(function (c) {
        var v = lv >= 2 ? (g.mode === 'red' ? c.r * 3 : 0) + (lv >= 4 ? Math.min(partnerLeft(g, c, seat), 3) : 0) + Math.random() * .5 : Math.random();
        if (!best || v < best.v) best = { c: c, v: v };
      });
      return { t: 'play', c: best.c.i, take: null, n: g.cnt };
    },
    hintDesc: '按一次會顯示 6 秒：列出所有生字是哪個部件加哪個部件；如果手牌和桌上的牌可以組成生字，也會把那幾張牌亮起來。提示用完就不會再出現。',
    tipDesc: '輪到你卻還沒出牌時，提醒你怎麼操作（不會告訴你哪幾張能組成生字）。',
    hint: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      var ps = pairs(g, g.hands[seat]), hl = [];
      ps.forEach(function (p) { if (hl.indexOf(String(p.c.i)) < 0) hl.push(String(p.c.i)); if (hl.indexOf(String(p.t.i)) < 0) hl.push(String(p.t.i)); });
      var list = g.words.map(function (w) { return Array.from(w[0] + '＝' + w[1] + '＋' + w[2]).join('\u2060'); }).join('　');   // \u2060：同一個生字的拆法不要被斷行切開
      return { msg: list + (ps.length ? '　👉 亮框的手牌和桌上的牌可以組成生字！' : '　👉 這一輪你的手牌組不成生字，打一張到桌上吧。'), hl: hl, dur: 6000 };
    },
    nudge: function (g, seat) {
      if (g.res || g.turn !== seat || g.out.indexOf(seat) >= 0) return null;
      return '輪到你了：看看手上的部件和桌上的部件，能不能組成生字？能的話先點手牌、再點桌上那張；不能的話把一張手牌點兩下，打到桌上。';
    },
    hostView: function (g) {
      var h = '<div class="bj-host"><div class="bj-host-tb">' + g.table.map(function (c) { return '<span class="bj-mini' + (c.r ? ' red' : '') + '">' + esc(c.p) + '</span>'; }).join('') + '</div><div class="bj-host-seats">';
      for (var s = 0; s < g.np; s++) h += '<span class="bj-hs' + (g.out.indexOf(s) >= 0 ? ' out' : '') + '"><i style="background:' + SEATC[s] + '"></i>' + (g.out.indexOf(s) >= 0 ? '認輸' : g.won[s].map(function (x) { return esc(g.words[x.w][0]); }).join('') + ' ' + score(g, s) + ' 分') + '</span>';
      return h + '</div></div>';
    },
    hostStatus: function (g) { return { t: '牌堆剩 ' + g.deck.length + ' 張', c: '' }; }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: null, round: -1, sent: -1, key: '', pick: null };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function card(c, cls) { var b = el('button', 'bj-card' + (c.r ? ' red' : '') + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('data-c', String(c.i)); b.appendChild(el('b', '', c.p)); b.appendChild(el('i', 'bj-dot')); return b; }
  function wordTile(v, x, big) {
    var w = v.words[x.w], d = el('span', 'bj-word' + (big ? ' big' : ''));
    d.appendChild(el('b', '', w[0]));
    var p = el('small'); p.innerHTML = '<em class="' + (x.r[0] ? 'r' : '') + '">' + esc(x.p[0]) + '</em><em class="' + (x.r[1] ? 'r' : '') + '">' + esc(x.p[1]) + '</em>'; d.appendChild(p);
    return d;
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = null; L.sent = -1; L.key = ''; L.pick = null; }
    var key = v.cnt + ':' + (v.last ? v.last.c.i : '');
    if (prev && key !== L.key && v.last) {
      fx.snd(v.last.t ? 'cap' : 'move');
      if (v.last.t && v.last.s !== tb.seat) fx.toast(who(tb, v.last.s) + ' 組成「' + v.words[v.last.w][0] + '」');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 400);
    }
    L.key = key;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '用手上的部件和桌上的部件組成生字');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var sel = L.sel != null ? cardOf(v.hand, L.sel) : null; if (!sel) L.sel = null;
    var wrap = el('div', 'pk-table bj-table');
    var st = el('div', 'pk-status');
    if (tb.res) st.textContent = '這局結束了';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.textContent = !sel ? '輪到你：先點一張手牌' : '點桌上的部件組成生字，或再點一次這張打到桌上'; st.className = 'pk-status me'; }
    else st.textContent = '輪到 ' + who(tb, v.turn);
    wrap.appendChild(st);
    wrap.appendChild(PKUI.opps(tb, { np: v.np, counts: v.counts, out: v.out, turn: v.turn }, seat, function (i) { return '⭐ ' + v.scores[i] + ' 分'; }, short));
    var felt = el('div', 'pk-felt bj-felt');
    var info = el('div', 'bj-info');
    var dk = el('span', 'bj-deck'); dk.appendChild(el('b', '', v.left)); dk.appendChild(el('small', '', '牌堆')); info.appendChild(dk);
    var lg = el('span', 'bj-log');
    if (v.last) lg.innerHTML = esc(who(tb, v.last.s)) + (v.last.t ? ' 用「' + esc(v.last.c.p) + '」＋「' + esc(v.last.t.p) + '」組成 <b class="bj-big">' + esc(v.words[v.last.w][0]) + '</b>' : ' 打出「' + esc(v.last.c.p) + '」到桌上');
    else lg.textContent = '桌上翻開 ' + v.table.length + ' 張部件';
    if (tb.res && v.sweep && v.sweep.n) lg.innerHTML += '<br>桌上剩下 ' + v.sweep.n + ' 張牌作廢，不算分';
    info.appendChild(lg);
    felt.appendChild(info);
    var tbl = el('div', 'bj-board' + (v.table.length > 10 ? ' many' : ''));
    v.table.forEach(function (c) {
      var b = card(c, (v.last && !v.last.t && v.last.c.i === c.i ? ' new' : ''));
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (!sel) { ctx.toast('先點一張自己的手牌，再點桌上的部件'); return; }
        var ws = combosV(v, sel, c);
        if (!ws.length) { ctx.toast('「' + sel.p + '」和「' + c.p + '」組不成生字，再想想看！'); ctx.snd('error'); return; }
        if (ws.length > 1) { L.pick = { c: sel.i, t: c.i, ws: ws }; ctx.snd('tap'); ctx.rerender(); return; }
        send({ t: 'play', c: sel.i, take: c.i, w: ws[0] });
      });
      tbl.appendChild(b);
    });
    if (!v.table.length) tbl.appendChild(el('div', 'pk-empty', '桌上沒有牌'));
    felt.appendChild(tbl);
    wrap.appendChild(felt);
    function send(d) { d.n = v.cnt; L.sent = v.cnt; L.sel = null; L.pick = null; ctx.snd(d.take != null ? 'cap' : 'move'); if (d.take != null) ctx.toast('組成「' + v.words[d.w][0] + '」！'); ctx.send('play', d); ctx.rerender(); }
    // 我的手牌
    var me = el('div', 'pk-me bj-me' + (myTurn ? ' turn' : ''));
    var top = el('div', 'pk-me-top'), dot = el('i'); dot.style.background = SEATC[seat]; top.appendChild(dot);
    top.appendChild(el('span', 'n', '我的手牌')); top.appendChild(el('span', 'pk-info', '⭐ ' + v.scores[seat] + ' 分')); me.appendChild(top);
    var hd = el('div', 'bj-hand');
    hd.style.setProperty('--hn', Math.max(3, v.hn));
    v.hand.forEach(function (c) {
      var b = card(c, sel && sel.i === c.i ? 'sel' : '');
      b.addEventListener('click', function () {
        if (!myTurn) return;
        if (L.sel === c.i) { send({ t: 'play', c: c.i, take: null }); return; }   // 同一張點兩次：打到桌上
        L.sel = c.i; L.pick = null; ctx.snd('tap'); ctx.rerender();
      });
      hd.appendChild(b);
    });
    for (var k = v.hand.length; k < v.hn; k++) hd.appendChild(el('span', 'bj-card ghost'));
    me.appendChild(hd);
    var wn = el('div', 'bj-won');
    wn.appendChild(el('span', 'bj-wl', '我組成的字：'));
    if (v.won[seat].length) v.won[seat].forEach(function (x) { wn.appendChild(wordTile(v, x)); }); else wn.appendChild(el('span', 'bj-none', '還沒有'));
    me.appendChild(wn);
    wrap.appendChild(me);
    if (L.pick && myTurn) {
      var pk = el('div', 'bj-pick'); pk.appendChild(el('span', '', '這兩個部件可以組成好幾個字，你要組哪一個？'));
      L.pick.ws.forEach(function (w) { pk.appendChild(ctx.button('pk-btn go', v.words[w][0], function () { send({ t: 'play', c: L.pick.c, take: L.pick.t, w: w }); })); });
      wrap.appendChild(pk);
    }
    if (!tb.res && !out) {
      var tools = el('div', 'pk-tools');
      if (myTurn && sel) tools.appendChild(ctx.button('pk-btn go', '打到桌上', function () { send({ t: 'play', c: sel.i, take: null }); }));
      tools.appendChild(ctx.button('pk-btn', '🔤 生字表', function () { ctx.toast('這次的生字：' + v.words.map(function (w) { return w[0]; }).join('、')); }));
      tools.appendChild(ctx.button('pk-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('pk-btn'));
      wrap.appendChild(tools);
    }
    box.appendChild(wrap);
  };
  function combosV(v, a, b) { var out = []; v.words.forEach(function (w, i) { if ((w[1] === a.p && w[2] === b.p) || (w[1] === b.p && w[2] === a.p)) out.push(i); }); return out; }
  mod.resultNote = function (tb, nm) {
    var v = tb.view, r = tb.res; if (!v || !v.won || !r) return null;
    var lines = [r.ws ? '🏆 並列最高分，一起獲勝：' + r.ws.map(nm).join('、') + '（' + v.scores[r.ws[0]] + ' 分）' : r.w >= 0 ? '🏆 獲勝：' + nm(r.w) + '（' + v.scores[r.w] + ' 分）' : '🤝 大家分數一樣，平手', v.mode === 'red' ? '計分：一張紅色部件 10 分' : '計分：一組生字 10 分'];
    var h = '<div class="bj-sum">';
    for (var s = 0; s < v.np; s++) h += '<div class="bj-sumrow"><b>' + esc(nm(s)) + '：' + v.scores[s] + ' 分</b>' + (v.won[s].length ? v.won[s].map(function (x) { var w = v.words[x.w]; return '<span class="bj-word"><b>' + esc(w[0]) + '</b><small><em class="' + (x.r[0] ? 'r' : '') + '">' + esc(x.p[0]) + '</em><em class="' + (x.r[1] ? 'r' : '') + '">' + esc(x.p[1]) + '</em></small></span>'; }).join('') : '<span class="bj-none">沒有組成字</span>') + '</div>';
    lines.push({ html: h + '</div>' });
    if (v.sweep && v.sweep.n) lines.push('桌上剩下 ' + v.sweep.n + ' 張牌作廢，誰都不算分');
    return lines;
  };
  mod.onReject = function () { L.sent = -1; L.pick = null; };

  /* ---------- 老師端：選題庫、上傳題庫 ---------- */
  var LS = 'bg-bujian-banks';
  function loadBanks() { try { var a = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveBanks(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} }
  mod.hostPanel = function (api) {
    var box = api.el('div', 'bj-panel');
    function cur() { var c = api.cfg(); return c.bank || SAMPLE; }
    function use(b) { api.cfg().bank = { name: b.name, list: b.list }; api.save(); draw(); }
    function draw() {
      box.innerHTML = '';
      var b = cur();
      box.appendChild(api.el('h3', '', '🧩 這次要玩的生字：' + (b.name || '未命名')));
      var chips = api.el('div', 'bj-chips');
      b.list.forEach(function (w) { chips.appendChild(api.el('span', 'bj-chip', w[0] + '＝' + w[1] + '＋' + w[2])); });
      box.appendChild(chips);
      var n = b.list.length;
      box.appendChild(api.el('small', 'bj-note', '共 ' + n + ' 個生字、' + (n * 4) + ' 張牌。換題庫後，新開的桌（或下一局）才會用新的生字。' + (n < 5 ? ' ⚠️ 生字太少，4 人一桌可能牌不夠，建議至少 5 個字。' : '')));
      var row = api.el('div', 'bj-row');
      var banks = loadBanks();
      [SAMPLE].concat(banks).forEach(function (x) {
        row.appendChild(api.btn('btn small' + (x.name === b.name ? ' on' : ''), x.name, function () { use(x); }));
      });
      box.appendChild(row);
      var r2 = api.el('div', 'bj-row');
      r2.appendChild(api.btn('btn small', '➕ 新增題庫', function () { edit(null); }));
      r2.appendChild(api.btn('btn small', '🤖 複製給 AI 的提示詞', function () { showPrompt(); }));
      r2.appendChild(api.btn('btn small', '📘 怎麼用（操作說明）', function () { showHow(); }));
      if (b !== SAMPLE && b.name !== SAMPLE.name) r2.appendChild(api.btn('btn small', '✏️ 修改這個題庫', function () { edit(b); }));
      r2.appendChild(api.btn('btn small', '🔗 複製學生在家練習連結', function () {
        var u = location.href.replace(/host\.html.*$/, '') + 'play.html?solo=bujian&w=' + encodeURIComponent(bankText(b).replace(/\n/g, ';'));
        var done = function () { alert('已複製！學生打開這個連結，就能用「' + (b.name || '這個題庫') + '」和電腦練習：\n\n' + u); };
        if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, function () { prompt('請複製這個連結：', u); }); else prompt('請複製這個連結：', u);
      }));
      box.appendChild(r2);
    }
    function dlg(title) {
      var ov = api.el('div', 'bj-edit-ov'), d = api.el('div', 'bj-edit'); d.appendChild(api.el('h3', '', title));
      ov.appendChild(d); document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      d.close = function () { ov.remove(); }; return d;
    }
    function copy(text, ok) { if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () { prompt('請複製：', text); }); else prompt('請複製：', text); }
    function showPrompt() {
      var d = dlg('🤖 給 AI 的提示詞（工作說明）');
      d.appendChild(api.el('p', 'bj-tip', '按「複製」後，貼到 ChatGPT、Claude、Gemini 等 AI。AI 回答「了解」後，再貼上這一課的生字表。AI 給你的文字，整段貼到「➕ 新增題庫」的大框框就能用。'));
      var ta = api.el('textarea'); ta.rows = 14; ta.readOnly = true; ta.value = AI_PROMPT; d.appendChild(ta);
      var row = api.el('div', 'bj-row');
      var cb = api.btn('btn', '📋 複製提示詞', function () { copy(AI_PROMPT, function () { cb.textContent = '✅ 已複製'; }); }); row.appendChild(cb);
      row.appendChild(api.btn('btn', '關閉', function () { d.close(); })); d.appendChild(row);
    }
    function showHow() {
      var d = dlg('📘 部件撿紅點・老師操作說明'); var h = api.el('div'); h.innerHTML = HOWTO; d.appendChild(h);
      d.appendChild(api.btn('btn', '關閉', function () { d.close(); }));
    }
    function edit(b0) {
      var ov = api.el('div', 'bj-edit-ov'), d = api.el('div', 'bj-edit');
      d.appendChild(api.el('h3', '', b0 ? '✏️ 修改題庫' : '➕ 新增題庫'));
      d.appendChild(api.el('label', '', '題庫名稱（例如：第五課 生字）'));
      var nm = api.el('input'); nm.value = b0 ? b0.name : ''; nm.placeholder = '第五課 生字'; d.appendChild(nm);
      d.appendChild(api.el('label', '', '一行一個生字，寫成「字＝部件＋部件」（也可以用空白隔開：你 亻 尔）'));
      var ta = api.el('textarea'); ta.rows = 10; ta.placeholder = '你＝亻＋尔\n他＝亻＋也\n拍＝扌＋白'; ta.value = b0 ? b0.list.map(function (w) { return w[0] + '＝' + w[1] + '＋' + w[2]; }).join('\n') : ''; d.appendChild(ta);
      var aw = api.el('div', 'bj-row'); aw.appendChild(api.el('span', '', '只輸入生字：'));
      var ai = api.el('input'); ai.placeholder = '例如：你他拍清晴'; ai.className = 'bj-auto'; aw.appendChild(ai);
      var ab = api.btn('btn small', '🔍 自動查部件', function () {
        var cs = []; Array.from(ai.value).forEach(function (c) { if (/[\u3400-\u9fff\uf900-\ufaff]/.test(c) && cs.indexOf(c) < 0) cs.push(c); });
        if (!cs.length) { alert('請先輸入生字'); return; }
        ab.textContent = '查詢中…';
        loadDB(function (db) {
          ab.textContent = '🔍 自動查部件';
          if (!db) { alert('連不上漢字部件庫，請檢查網路，或改用「🤖 複製給 AI 的提示詞」。'); return; }
          var have = parseBank(ta.value).list.map(function (w) { return w[0]; });
          var r = autoSplit(cs.filter(function (c) { return have.indexOf(c) < 0; }), db);
          ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + r.ok.concat(r.todo).join('\n'); chk();
          if (r.todo.length) alert('有 ' + r.todo.length + ' 個字需要你看一下（// 開頭那幾行）：改成「字＝部件＋部件」並刪掉 //，或直接刪掉那一行。');
        });
      });
      aw.appendChild(ab); d.appendChild(aw);
      var fl = api.el('input'); fl.type = 'file'; fl.accept = '.txt,.csv,text/plain';
      var fw = api.el('div', 'bj-row'); fw.appendChild(api.el('span', '', '或上傳文字檔（.txt／.csv）：')); fw.appendChild(fl); d.appendChild(fw);
      fl.addEventListener('change', function () { var f = fl.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { var p = parseBank(r.result); if (p.name && !nm.value) nm.value = p.name; ta.value = p.list.map(function (w) { return w[0] + '＝' + w[1] + '＋' + w[2]; }).join('\n'); chk(); if (p.errs.length) msg.textContent += '\n（檔案裡有 ' + p.errs.length + ' 行看不懂，已略過）'; }; r.readAsText(f); });
      var msg = api.el('pre', 'bj-msg'); d.appendChild(msg);
      function chk() { var p = parseBank(ta.value); msg.textContent = '讀到 ' + p.list.length + ' 個生字' + (p.list.length ? '：' + p.list.map(function (w) { return w[0]; }).join('') : '') + (p.errs.length ? '\n' + p.errs.join('\n') : '') + (/^\s*\/\//m.test(ta.value) ? '\n⚠️ 有 // 開頭的提醒行（不會算進遊戲），請看一下要不要補上那些字' : ''); msg.className = 'bj-msg' + (p.errs.length ? ' err' : ''); return p; }
      ta.addEventListener('input', chk); chk();
      var row = api.el('div', 'bj-row');
      row.appendChild(api.btn('btn', '💾 儲存並使用', function () {
        var p = chk(); if (p.list.length < 2) { alert('至少要 2 個生字'); return; }
        var name = nm.value.trim() || ('題庫 ' + new Date().toLocaleDateString());
        var banks = loadBanks().filter(function (x) { return x.name !== name && (!b0 || x.name !== b0.name); });
        var nb = { name: name, list: p.list }; banks.unshift(nb); saveBanks(banks.slice(0, 30)); use(nb); ov.remove();
      }));
      if (b0) row.appendChild(api.btn('btn', '🗑️ 刪除這個題庫', function () { if (!confirm('確定刪除「' + b0.name + '」嗎？')) return; saveBanks(loadBanks().filter(function (x) { return x.name !== b0.name; })); use(SAMPLE); ov.remove(); }));
      row.appendChild(api.btn('btn', '取消', function () { ov.remove(); }));
      d.appendChild(row);
      ov.appendChild(d); document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
      ta.focus();
    }
    draw();
    // 放到 QR code 上面，開房時一眼就看到
    setTimeout(function () { var q = document.getElementById('h-qr'); if (q && q.parentNode) { var f = q.parentNode.querySelector('.gopt') || q; q.parentNode.insertBefore(box, f); } }, 0);
    return box;
  };

  BG.register('bujian', mod);
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每張牌上面是一個<b>部件</b>，兩個部件可以組成一個<b>生字</b>，例如「亻」＋「尔」＝「你」。</li><li>每人先拿 3 張手牌，桌上翻開 4 張。</li><li>輪到你時，自己看看手上的部件和桌上的部件能不能組成生字：可以的話，<b>先點手牌、再點桌上那張</b>，兩張就收到自己這邊。</li><li>組不成生字，就把一張手牌<b>點兩下</b>（或點一下再按「打到桌上」），打到桌上。</li><li>出完牌後，系統自動幫你從牌堆補一張，換下一位（順時鐘）。</li><li>牌堆沒牌了就不再補牌，大家把手牌出完。大家都出完就結束，<b>桌上剩下的牌作廢</b>，誰都不算分。</li></ol>' },
      { h: '注意', html: '<ul><li>一定要用「<b>手上的一張</b>」配「<b>桌上的一張</b>」。</li><li>每個生字有兩組牌，所以同一個字可以組兩次。</li><li>按「🔤 生字表」可以看這次有哪些生字。</li><li>想不出來可以按「💡 提示」：6 秒內會列出每個生字是哪兩個部件，能組的牌也會亮起來。提示次數有限，用完就沒有了。</li></ul>' },
      { h: '計分方式', html: '<p>老師開桌時會選一種，這一局不會改：</p><table class="g-tbl"><tr><th>計分方式</th><th>怎麼算</th></tr><tr><td>🀄 一組生字 10 分</td><td>組成幾個字，就是幾個 10 分</td></tr><tr><td>🔴 一張紅色部件 10 分</td><td>每個部件有一張<b style="color:#c8102e">紅色</b>、一張黑色；收回來的紅色部件一張 10 分，黑色不算分</td></tr></table><p>分數最高的人獲勝（積分榜 +3 分）。和電腦玩的不列入總分。</p>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「語文」→「部件撿紅點」開房間。</li><li>在 QR code 上方先選好<b>這次要玩的生字題庫</b>、<b>計分方式</b>和<b>手牌張數</b>，再讓學生掃碼。</li><li>每桌 2～4 人，人數不夠可以讓電腦補位。</li><li>老師端每桌會顯示桌上的部件，以及每個人組成的字和分數。</li></ol>' },
      { h: '做部件資料、匯入、開始玩', html: HOWTO + '<p>每個字只能拆成兩個部件，系統會自動做出 4 張牌（每個部件一紅一黑）。不同的字可以共用部件（例如「你」「他」都有「亻」）。建議至少 5 個生字。部件資料來自你的漢字部件庫（hanzi-component-detective 的 hanzi_db.json）。</p><p>內建的「範例（試玩用）」是 Claude 自己挑的 10 個字，只是讓老師先試玩，上課請換成課本的生字。</p>' },
      { h: '給 AI 的提示詞', html: '<p>老師頁面的「🤖 複製給 AI 的提示詞」可以一鍵複製。內容如下：</p><pre class="bj-pre">' + esc(AI_PROMPT) + '</pre>' },
      { h: '規則說明', html: '<p>以下幾點是依老師的實體卡牌玩法設計，有些細節是 Claude 先自訂的，可以再調整：</p><ul><li>一次只能組一個字，組完一樣要補一張牌。</li><li>一定要「手牌＋桌上」配對，手上兩張或桌上兩張剛好能組成字都不算。</li><li>組得出字的時候也可以選擇不組、直接打到桌上。</li><li>所有人手牌出完就結束，桌上剩下的牌作廢、誰都不算分（老師確認，和撲克牌撿紅點一樣，比較公平）。</li></ul><h4>教學重點</h4><ul><li>認識生字的<b>部件</b>與<b>結構</b>（左右、上下）。</li><li>組字時可以請學生說出這個字、造一個詞，加深印象。</li><li>形近字放在同一份題庫（例如「清、晴、請」），學生要分辨部件才能組對。</li></ul>' }
    ]
  };
})();
