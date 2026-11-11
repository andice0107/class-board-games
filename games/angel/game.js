/* 天使與惡魔（社會技巧卡牌遊戲，andice 原創構想）
   桌上有一排「圖像」（孩子的頭像），每個圖像都有情緒碼錶（-5～+5，從 0 開始）。
   每位玩家祕密分到一個圖像，只有自己知道是哪一個。
   輪到你時打出一張牌：天使牌讓一個圖像心情變好、惡魔牌讓一個圖像心情變差（不能打給自己的圖像），
   打牌時要把卡片上的話大聲念出來。天神牌有各種特殊功能。打完補到 3 張，不能 pass。
   有圖像到 +5 或 -5，或每個人都出完規定張數就結束，翻開大家的圖像。
   比賽模式：自己圖像心情最高的人贏；合作模式：所有人的圖像都在 0 以上就全體過關。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var MIN = -5, MAX = 5, HAND = 3;
  /* 圖像：用配件分辨，不用真人名字（避免和班上同學同名） */
  var FACES = [
    { n: '紅帽子', i: '🧢', c: '#e53935', skin: '#ffd7b5' },
    { n: '藍眼鏡', i: '👓', c: '#1e88e5', skin: '#f1c7a1' },
    { n: '綠圍巾', i: '🧣', c: '#43a047', skin: '#ffe0c2' },
    { n: '黃髮夾', i: '🎀', c: '#fbc02d', skin: '#f6cfa8' },
    { n: '紫背包', i: '🎒', c: '#8e24aa', skin: '#e9b98f' },
    { n: '橘球鞋', i: '👟', c: '#fb8c00', skin: '#ffd9bd' },
    { n: '粉蝴蝶', i: '🦋', c: '#ec407a', skin: '#f3c9a6' },
    { n: '灰耳機', i: '🎧', c: '#607d8b', skin: '#e8bf98' }
  ];
  /* 天使牌：v = 加幾格 */
  var ANGEL = [
    ['你還好嗎？', '關懷'], ['需要我幫忙嗎？', '幫助'], ['我發現你今天有點不開心。', '關注'], ['謝謝你幫我。', '感謝'],
    ['你這個想法很棒！', '鼓勵'], ['沒關係，每個人都會犯錯。', '寬容'], ['慢慢來，我等你。', '體諒'], ['你想說的話，我在聽。', '聆聽'],
    ['要不要跟我們一起玩？', '接納'], ['下課我們一起去吧！', '陪伴'], ['我們一起想辦法。', '協助'], ['我相信你做得到！', '信任'],
    ['你已經比上次進步了。', '鼓勵'], ['你的作品好特別！', '稱讚'], ['你說得也有道理。', '尊重'], ['我的東西可以借你用。', '分享'],
    ['輪到你了，你先說。', '尊重'], ['別擔心，我陪你去找老師。', '協助'], ['你今天幫了大家很多忙。', '稱讚'], ['對不起，剛剛是我不對。', '道歉'],
    ['你不是一個人，我在你旁邊。', '支持', 2], ['他們那樣說不對，不是你的錯。', '同理', 2], ['如果是我，我也會很難過。', '同理', 2],
    ['我喜歡和你當朋友。', '接納', 2], ['你認真的樣子很帥氣！', '稱讚', 2], ['不管別人怎麼說，你都很重要。', '支持', 2]
  ].map(function (a, k) { return { id: 'a' + k, k: 'a', t: a[0], c: a[1], v: a[2] || 1 }; });
  /* 惡魔牌：v = 減幾格；r = 轉念的說法；s = 酸言酸語（tone 語氣提示、mean 真正的意思） */
  var DEVIL = [
    ['你怎麼這麼笨？', '輕視', '這題比較難，我們一起想想看。'], ['這麼簡單你也不會？', '輕視', '不會沒關係，我教你。'],
    ['你懂什麼？不要吵！', '否定', '你的想法是什麼？說來聽聽。'], ['都是你害的！', '指責', '沒關係，我們一起想辦法補救。'],
    ['你每次都搞砸！', '指責', '這次沒成功，下次會更好。'], ['你好煩喔，走開啦！', '排斥', '我現在想安靜一下，等一下再聊好嗎？'],
    ['哈哈哈，你好好笑。', '嘲笑', '每個人都會出糗，沒關係。'], ['你是膽小鬼吧？', '嘲笑', '會害怕很正常，我陪你。'],
    ['你的想法太幼稚了。', '批評', '你的想法很特別，可以再多說一點嗎？'], ['你寫得好糟喔。', '批評', '這裡再改一下，會更好。'],
    ['來啊，誰怕誰！', '挑釁', '我們先冷靜一下，好好說。'], ['我才不要跟你一組。', '排斥', '我們一起一組吧！'],
    ['大家不要跟他玩！', '排擠', '大家一起玩吧！', 2], ['你根本不是我們這一國的。', '排擠', '歡迎你加入我們。', 2],
    ['你敢說出去，就給我小心。', '威脅', '有事情可以說出來，沒關係。', 2], ['沒有人想理你。', '否定', '我想聽你說。', 2]
  ].map(function (a, k) { return { id: 'd' + k, k: 'd', t: a[0], c: a[1], r: a[2], v: a[3] || 1 }; });
  [
    ['對—對—對—，你最厲害。', '翻白眼、拉長音', '你很愛炫耀，我不想聽。', '你真的很厲害，可以教我嗎？'],
    ['對啦，你很棒啦。', '不看對方、語氣敷衍', '我根本不覺得你很棒。', '你真的做得很好！'],
    ['啊不就好棒棒～', '語調上揚、做鬼臉', '這沒什麼了不起。', '你好棒，我替你開心！'],
    ['哇，你好聰明喔。', '拍手很慢、冷笑', '你剛剛的答案很笨。', '沒關係，答錯也是在學習。'],
    ['你最乾淨、你最乖。', '嘲笑的笑', '你很愛裝。', '謝謝你提醒大家。'],
    ['好喔，你說了算。', '聳肩、嘆氣', '我不同意，但懶得跟你說。', '我的想法不太一樣，我們可以討論嗎？']
  ].forEach(function (a) { DEVIL.push({ id: 'd' + DEVIL.length, k: 'd', s: 1, t: a[0], tone: a[1], mean: a[2], r: a[3], c: '酸言酸語', v: 1 }); });
  /* 天神牌：tg = 要選什麼（p 圖像、s 玩家、空白 = 直接用） */
  var GOD = [
    { n: '重新開始', d: '收回所有人的手牌，洗牌後每人重發 3 張', e: '🔄' },
    { n: '天神點名', d: '指定下一個出牌的人，之後從他往下接', e: '👉', tg: 's' },
    { n: '迴轉', d: '出牌方向反過來', e: '↩️' },
    { n: '天神祝福', d: '選一個圖像（不能是自己的），心情 +2', e: '✨', tg: 'p' },
    { n: '圖像大風吹', d: '所有人的圖像重新洗牌分配，心情留在圖像上', e: '🌪️' },
    { n: '大家換位子', d: '重新隨機排出牌的順序', e: '🪑' },
    { n: '守護天使', d: '選一個圖像（不能是自己的），擋掉它下一張惡魔牌', e: '🛡️', tg: 'p' },
    { n: '轉念牌', d: '上一個人剛出惡魔牌時才能用：把那句話改成好聽的說法念出來，那個圖像改成 +1', e: '💡' },
    { n: '道歉修復', d: '選一個這一輪被惡魔牌打到的圖像，說一句道歉的話，心情 +1', e: '🤝', tg: 'p' },
    { n: '公平之光', d: '目前心情最低的圖像 +2（一樣低的都加）', e: '🌈' },
    { n: '換位思考', d: '選一個圖像（不能是自己的），說出「如果我是它，我現在覺得……」，心情 +1', e: '🧠', tg: 'p' },
    { n: '冷靜時間', d: '全桌一起深呼吸 3 次，所有心情在 -3 以下的圖像 +1', e: '🌬️' }
  ].map(function (o, k) { o.id = 'g' + k; o.k = 'g'; o.g = k; return o; });
  var CARD = {}; ANGEL.concat(DEVIL, GOD).forEach(function (c) { CARD[c.id] = c; });
  var MOOD = function (m) { return m >= 5 ? '超級開心' : m >= 3 ? '開心' : m >= 1 ? '有點高興' : m === 0 ? '普通' : m >= -2 ? '有點難過' : m >= -4 ? '很難過' : '崩潰'; };
  var REASONS = { joy: '有圖像的心情到了 +5！', crash: '有圖像的心情掉到 -5，崩潰了…', time: '大家都出完牌了', coop: '所有人的圖像心情都在 0 以上，全體過關！', coopfail: '還有圖像的心情低於 0，下次再一起努力', coopcrash: '有圖像崩潰了，合作失敗', tie: '大家的心情一樣高', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function clamp(m) { return Math.max(MIN, Math.min(MAX, m)); }
  function draw(g) { if (!g.deck.length) { g.deck = shuffle(g.disc); g.disc = []; } return g.deck.pop(); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function turnSeat(g) { return g.order[g.pos]; }
  function advance(g) { for (var k = 0; k < g.np; k++) { g.pos = (g.pos + g.dir + g.np) % g.np; if (g.out.indexOf(g.order[g.pos]) < 0) return; } }
  /* 轉念牌：上一個動作是別人出的惡魔牌，而且有打到 */
  function canTurn(g, seat) { var l = g.lastDevil; return !!l && l.at === g.plays - 1 && l.s !== seat && l.delta < 0; }
  function apoTargets(g, own) { var r = []; g.P.forEach(function (p, i) { if (i !== own && p.hitAt >= 0 && g.plays - p.hitAt <= g.np) r.push(i); }); return r; }
  /* 這張牌能打給誰：{p:[圖像]} 或 {s:[玩家]} 或 {now:true}；不能用回傳 null */
  function targets(g, seat, cid) {
    var c = CARD[cid], own = g.own[seat], all = [];
    for (var i = 0; i < g.P.length; i++) if (i !== own) all.push(i);
    if (c.k === 'a' || c.k === 'd') return { p: all };
    if (c.g === 1) { var ss = alive(g).filter(function (s) { return s !== seat; }); return ss.length ? { s: ss } : null; }
    if (c.g === 3 || c.g === 10) return { p: all };
    if (c.g === 6) return { p: all.filter(function (i) { return !g.P[i].shield; }) };
    if (c.g === 7) return canTurn(g, seat) ? { now: true } : null;
    if (c.g === 8) { var ap = apoTargets(g, own); return ap.length ? { p: ap } : null; }
    return { now: true };
  }
  function change(g, i, d, note) {
    var p = g.P[i], before = p.m; p.m = clamp(p.m + d); p.hist.push(p.m);
    if (note) { p.rec.push(note); if (p.rec.length > 12) p.rec.shift(); }
    return p.m - before;
  }
  function pushLog(g, lg) { g.log = lg; g.logs.push(lg); if (g.logs.length > 8) g.logs.shift(); }
  function owners(g) { var o = []; for (var i = 0; i < g.P.length; i++) o.push(g.own.indexOf(i)); return o; }
  function finish(g, why) {
    if (g.mode === 'coop') {
      var ok = why !== 'crash' && alive(g).every(function (s) { return g.P[g.own[s]].m >= 0; });
      g.res = { ws: ok ? alive(g) : [], why: ok ? 'coop' : why === 'crash' ? 'coopcrash' : 'coopfail' };
      return;
    }
    var a = alive(g), best = Math.max.apply(null, a.map(function (s) { return g.P[g.own[s]].m; }));
    var ws = a.filter(function (s) { return g.P[g.own[s]].m === best; });
    if (ws.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
    else if (ws.length === 1) g.res = { w: ws[0], why: why };
    else g.res = { ws: ws, why: why };
  }
  function checkEnd(g) {
    var hi = false, lo = false;
    g.P.forEach(function (p) { if (p.m >= MAX) hi = true; if (p.m <= MIN) lo = true; });
    if (lo) return finish(g, 'crash'), true;
    if (hi && g.mode !== 'coop') return finish(g, 'joy'), true;
    if (g.plays >= g.len * alive(g).length) return finish(g, 'time'), true;
    return false;
  }
  var mod = {
    seats: 4, seatOptions: [3, 4, 5, 6], seatDefault: 4, botSeats: [2, 5], botDelay: 2200, ver: 1,
    reasons: REASONS,
    opts: [
      { k: 'mode', label: '玩法：', list: [['comp', '🏆 比賽（自己圖像心情最高的人贏）'], ['coop', '🤝 合作（大家都在 0 以上才過關）']] },
      { k: 'len', label: '每人出幾張牌：', list: [['8', '8 張（約 15 分鐘）'], ['5', '5 張（約 10 分鐘）'], ['12', '12 張（約 20 分鐘）']] }
    ],
    levelDesc: ['隨便出牌', '比較常說好話', '會想辦法讓自己贏', '很會用天神牌'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      n = Math.max(3, Math.min(6, n || 4));
      var nf = n <= 4 ? n + 1 : n, faces = shuffle(FACES.map(function (f, i) { return i; })).slice(0, nf);  // 4 人以下多放一個沒人拿的圖像，比較難猜
      var deck = ANGEL.concat(DEVIL, GOD).map(function (c) { return c.id; });
      var g = { np: n, mode: o && o.mode === 'coop' ? 'coop' : 'comp', len: Math.max(3, Math.min(20, +(o && o.len) || 8)),
        P: faces.map(function (f) { return { f: f, m: 0, hist: [0], rec: [], shield: false, hitAt: -1, ga: 0, gd: 0 }; }),
        own: shuffle(faces.map(function (f, i) { return i; })).slice(0, n),
        order: shuffle(alive({ np: n, out: [] })), pos: 0, dir: 1, deck: shuffle(deck), disc: [], hands: [], swap: [], out: [],
        plays: 0, cnt: 0, log: null, logs: [], lastDevil: null, res: null };
      for (var s = 0; s < n; s++) { g.hands.push([]); g.swap.push(false); }
      for (var k = 0; k < HAND; k++) for (s = 0; s < n; s++) g.hands[s].push(draw(g));
      return g;
    },
    turnSeat: turnSeat,
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      return { np: g.np, mode: g.mode, len: g.len, P: g.P.map(function (p) { return { f: p.f, m: p.m, shield: p.shield, hitAt: p.hitAt, hist: g.res ? p.hist : null, rec: g.res ? p.rec : null, ga: p.ga, gd: p.gd }; }),
        mine: seat >= 0 ? g.own[seat] : -1, owners: g.res ? owners(g) : null, hand: seat >= 0 ? g.hands[seat] : null, swapped: seat >= 0 ? g.swap[seat] : true,
        order: g.order, pos: g.pos, dir: g.dir, turn: turnSeat(g), plays: g.plays, deck: g.deck.length, lastDevil: g.lastDevil, log: g.log, logs: g.logs, out: g.out, cnt: g.cnt };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (turnSeat(g) !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], i = d.i | 0, cid = h[i]; if (!cid) return false;
      if (d.t === 'swap') {   // 每局一次：換掉一張手牌，換完還是要出牌
        if (g.swap[seat]) return false;
        g.swap[seat] = true; g.disc.push(cid); h[i] = draw(g); g.cnt++;
        pushLog(g, { k: 'swap', s: seat }); return true;
      }
      if (d.t !== 'play') return false;
      var c = CARD[cid], tg = targets(g, seat, cid); if (!tg) { notify(seat, '這張牌現在不能用，換一張吧'); return false; }
      var p = null, s2 = null;
      if (tg.p) { p = +d.p; if (tg.p.indexOf(p) < 0) return false; }
      if (tg.s) { s2 = +d.s; if (tg.s.indexOf(s2) < 0) return false; }
      var lg = { k: c.k, c: cid, s: seat, p: p, d: 0 }, jump = false, own = g.own[seat];
      if (c.k === 'a') { lg.d = change(g, p, c.v, cid); g.P[p].ga++; }
      else if (c.k === 'd') {
        var P = g.P[p]; P.gd++;
        if (P.shield) { P.shield = false; lg.blocked = true; P.rec.push(cid); }
        else { lg.d = change(g, p, -c.v, cid); P.hitAt = g.plays; }
        g.lastDevil = { s: seat, p: p, c: cid, delta: lg.d, at: g.plays };
      } else switch (c.g) {
        case 0: g.hands.forEach(function (hh, s) { if (s !== seat) g.disc = g.disc.concat(hh); }); g.disc = g.disc.concat(h.filter(function (x, j) { return j !== i; }));
          g.deck = shuffle(g.deck.concat(g.disc, [cid])); g.disc = []; g.deck.splice(g.deck.indexOf(cid), 1);
          for (var s = 0; s < g.np; s++) g.hands[s] = [];
          for (var k = 0; k < HAND; k++) for (s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) g.hands[s].push(draw(g));
          h = null; break;
        case 1: g.pos = g.order.indexOf(s2); jump = true; lg.to = s2; break;
        case 2: g.dir = -g.dir; break;
        case 3: lg.d = change(g, p, 2, cid); break;
        case 4: var fs = shuffle(g.P.map(function (x, j) { return j; })); for (var q = 0; q < g.np; q++) g.own[q] = fs[q]; break;
        case 5: g.order = shuffle(g.order.slice()); g.pos = g.order.indexOf(seat); break;
        case 6: g.P[p].shield = true; break;
        case 7: var L = g.lastDevil; lg.p = L.p; lg.from = L.c; lg.d = change(g, L.p, -L.delta + 1, cid); g.lastDevil = null; break;
        case 8: lg.d = change(g, p, 1, cid); g.P[p].hitAt = -1; break;
        case 9: var lo = Math.min.apply(null, g.P.map(function (x) { return x.m; })); lg.ps = [];
          g.P.forEach(function (x, j) { if (x.m === lo) { change(g, j, 2, cid); lg.ps.push(j); } }); break;
        case 10: lg.d = change(g, p, 1, cid); break;
        case 11: lg.ps = []; g.P.forEach(function (x, j) { if (x.m <= -3) { change(g, j, 1, cid); lg.ps.push(j); } }); break;
      }
      if (h) { h.splice(i, 1); h.push(draw(g)); }
      g.disc.push(cid);
      g.plays++; g.cnt++;
      pushLog(g, lg);
      if (checkEnd(g)) return true;
      if (!jump) advance(g);
      return true;
    },
    botTurn: function (g, seat, lv) {
      if (g.res || turnSeat(g) !== seat) return null;
      var h = g.hands[seat], n = g.cnt, own = g.own[seat], opts = [];
      h.forEach(function (cid, i) {
        var tg = targets(g, seat, cid); if (!tg) return;
        if (tg.p) tg.p.forEach(function (p) { opts.push({ i: i, c: CARD[cid], p: p }); });
        else if (tg.s) tg.s.forEach(function (s) { opts.push({ i: i, c: CARD[cid], s: s }); });
        else opts.push({ i: i, c: CARD[cid] });
      });
      function A(o) { var a = { t: 'play', i: o.i, n: n }; if (o.p != null) a.p = o.p; if (o.s != null) a.s = o.s; return a; }
      if (!opts.length) return null;
      if (lv <= 1) return A(opts[Math.floor(Math.random() * opts.length)]);
      var coop = g.mode === 'coop', me = g.P[own].m, ms = g.P.map(function (x) { return x.m; });
      var others = g.P.map(function (x, j) { return j; }).filter(function (j) { return j !== own; });
      var hiO = Math.max.apply(null, others.map(function (j) { return ms[j]; })), loO = Math.min.apply(null, others.map(function (j) { return ms[j]; }));
      function score(o) {
        var c = o.c, v = 0, m = o.p != null ? ms[o.p] : 0;
        if (c.k === 'a') v = coop || lv === 2 ? 30 - m * 4 + c.v * 3 : 10 - m * 3 + (m + c.v >= 5 ? -40 : 0);
        else if (c.k === 'd') v = coop ? -10 + m * 4 - (m - c.v <= -5 ? 60 : 0) : (lv === 2 ? 2 : 20) + m * 4 + (g.P[o.p].shield ? -15 : 0) - (m - c.v <= -5 && lv >= 4 ? 0 : 0);
        else switch (c.g) {
          case 3: case 10: v = coop ? 35 - m * 4 : 8 - m * 3; break;
          case 7: v = coop ? 50 : 18; break;
          case 8: v = coop ? 45 - m * 3 : 12 - m * 2; break;
          case 9: v = coop || me === Math.min.apply(null, ms) ? 40 : 8; break;
          case 11: v = ms.filter(function (x) { return x <= -3; }).length * (coop ? 30 : 8) + (me <= -3 ? 25 : 0) - 5; break;
          case 4: v = coop ? 0 : (me < hiO ? 10 + (hiO - me) * 6 : -20); break;
          case 6: v = coop ? 20 - m * 3 : 4 - m * 2; break;
          case 0: v = 6; break; case 2: case 5: v = 5; break; case 1: v = 4; break;
        }
        if (lv >= 3 && !coop && c.k === 'd' && m === hiO) v += 15;
        return v + Math.random() * (lv === 2 ? 20 : lv === 3 ? 10 : 4);
      }
      opts.sort(function (a, b) { return score(b) - score(a); });
      if (!g.swap[seat] && lv >= 3 && score(opts[0]) < 0) {   // 牌都不好用：換一張最差的
        return { t: 'swap', i: opts[opts.length - 1].i, n: n };
      }
      return A(opts[0]);
    },
    hostView: function (g) {
      var o = owners(g), h = '<div class="ad-host">';
      g.P.forEach(function (p, i) {
        var f = FACES[p.f];
        h += '<span class="ad-hp" style="border-color:' + f.c + '"><b>' + f.i + '</b><em class="' + (p.m > 0 ? 'up' : p.m < 0 ? 'dn' : '') + '">' + (p.m > 0 ? '+' : '') + p.m + '</em>' + (o[i] >= 0 ? '<i style="background:' + SEATC[o[i]] + '"></i>' : '<i class="none"></i>') + (p.shield ? '🛡️' : '') + '</span>';
      });
      return h + '</div>';
    },
    hostStatus: function (g) { return { t: (g.mode === 'coop' ? '合作・' : '') + '已出 ' + g.plays + '／' + g.len * alive(g).length + ' 張', c: '' }; }
  };
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    var cur = turnSeat(g) === seat;
    g.out.push(seat); g.disc = g.disc.concat(g.hands[seat]); g.hands[seat] = [];
    var a = alive(g); if (a.length <= 1) { g.res = a.length ? { w: a[0], why: why } : { w: -1, why: why }; return; }
    if (cur) advance(g);
  }

  /* ---------- 圖像（SVG 臉，表情跟著心情變） ---------- */
  function faceSVG(fi, m) {
    var f = FACES[fi], k = m / 5, my = 66, curve = (k * 14).toFixed(1);
    var mouth = '<path d="M38 ' + my + ' Q50 ' + (my + +curve) + ' 62 ' + my + '" stroke="#5d3a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    if (m >= 4) mouth = '<path d="M36 63 Q50 84 64 63 Z" fill="#8b2e16"/><path d="M41 66 Q50 72 59 66" fill="#fff"/>';
    if (m <= -5) mouth = '<ellipse cx="50" cy="70" rx="8" ry="6" fill="#5d3a1a"/>';
    var brow = m <= -2 ? '<path d="M30 38 L42 42 M70 38 L58 42" stroke="#5d3a1a" stroke-width="3" stroke-linecap="round"/>' : m >= 2 ? '<path d="M30 39 Q36 34 42 38 M58 38 Q64 34 70 39" stroke="#5d3a1a" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
    var eyes = m >= 4 ? '<path d="M31 50 Q36 44 41 50 M59 50 Q64 44 69 50" stroke="#3a2412" stroke-width="3.5" fill="none" stroke-linecap="round"/>' : '<circle cx="36" cy="50" r="4.5" fill="#3a2412"/><circle cx="64" cy="50" r="4.5" fill="#3a2412"/>';
    var tears = m <= -3 ? '<path d="M34 56 q-3 8 0 11 q3 -3 0 -11z" fill="#64b5f6"/>' + (m <= -4 ? '<path d="M66 56 q-3 8 0 11 q3 -3 0 -11z" fill="#64b5f6"/>' : '') : '';
    var blush = m >= 2 ? '<circle cx="27" cy="60" r="6" fill="#ff8a80" opacity=".55"/><circle cx="73" cy="60" r="6" fill="#ff8a80" opacity=".55"/>' : '';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="' + f.skin + '"/><path d="M12 46 Q14 10 50 10 Q86 10 88 46 Q76 26 50 26 Q24 26 12 46z" fill="#4e342e"/>' + brow + eyes + blush + tears + mouth + '</svg>';
  }
  function meterEl(m) {
    var w = el('div', 'ad-meter');
    for (var x = MIN; x <= MAX; x++) { var c = el('i', x === 0 ? 'z' : ''); if ((m > 0 && x > 0 && x <= m) || (m < 0 && x < 0 && x >= m)) c.className += m > 0 ? ' up' : ' dn'; w.appendChild(c); }
    return w;
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, pick: null, sent: -1, round: -1, key: -1, peek: false };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function fname(v, i) { var f = FACES[v.P[i].f]; return f.i + f.n; }
  function sgn(d) { return d > 0 ? '+' + d : d < 0 ? '' + d : '±0'; }
  function logText(tb, v, lg) {
    if (!lg) return '';
    var a = who(tb, lg.s), c = lg.c && CARD[lg.c];
    if (lg.k === 'swap') return a + ' 換了一張手牌';
    if (lg.k === 'a') return a + ' 對【' + fname(v, lg.p) + '】說：「' + c.t + '」 ' + sgn(lg.d);
    if (lg.k === 'd') return a + ' 對【' + fname(v, lg.p) + '】說：「' + c.t + '」 ' + (lg.blocked ? '🛡️ 被守護天使擋下了' : sgn(lg.d));
    var t = '⚡ ' + a + ' 用了天神牌「' + c.n + '」';
    switch (c.g) {
      case 1: return t + '，下一個換 ' + who(tb, lg.to) + ' 出牌';
      case 2: return t + '，出牌方向反過來了';
      case 3: case 10: case 8: return t + '：【' + fname(v, lg.p) + '】' + sgn(lg.d);
      case 4: return t + '！大家的圖像換過了，按住「我的圖像」看看';
      case 6: return t + '：【' + fname(v, lg.p) + '】受到保護';
      case 7: return t + '：把「' + CARD[lg.from].t + '」改成「' + CARD[lg.from].r + '」【' + fname(v, lg.p) + '】' + sgn(lg.d);
      case 9: case 11: return t + (lg.ps.length ? '：' + lg.ps.map(function (j) { return '【' + fname(v, j) + '】'; }).join('') + '心情變好了' : '（這次沒有圖像需要）');
    }
    return t;
  }
  function cardEl(cid, extra) {
    var c = CARD[cid], b = el('button', 'ad-card ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? (c.s ? 'devil sour' : 'devil') : 'god') + (c.v === 2 ? ' big' : '') + (extra || '')); b.type = 'button';
    var top = c.k === 'a' ? '😇 ' + (c.v === 2 ? '大天使 +2' : '天使 +1') : c.k === 'd' ? '😈 ' + (c.s ? '酸言酸語 -1' : c.v === 2 ? '大惡魔 -2' : '惡魔 -1') : c.e + ' 天神牌';
    b.innerHTML = '<span class="ad-ct">' + top + '</span>' + (c.k === 'g' ? '<b>' + c.n + '</b><small>' + c.d + '</small>' : '<b>「' + c.t + '」</b>' + (c.s ? '<small>（' + c.tone + '）</small>' : '<small>' + c.c + '</small>'));
    return b;
  }
  function speech(tb, v, lg) {
    var c = lg && lg.c && CARD[lg.c]; if (!c) return null;
    var box = el('div', 'ad-say ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? 'devil' : 'god'));
    var hd = el('div', 'ad-say-hd'), dot = el('i'); dot.style.background = SEATC[lg.s]; hd.appendChild(dot);
    if (c.k === 'g') {
      hd.appendChild(document.createTextNode(who(tb, lg.s) + ' 用了天神牌'));
      box.appendChild(hd); box.appendChild(el('b', '', c.e + ' ' + c.n));
      box.appendChild(el('small', '', logText(tb, v, lg).replace(/^⚡ .*?」/, '').replace(/^[：，]/, '') || c.d));
      if (c.g === 7) box.appendChild(el('p', 'ad-say-t', '「' + CARD[lg.from].r + '」'));
      if (c.g === 11) box.appendChild(el('p', 'ad-breathe', '🌬️ 吸氣……吐氣……'));
      return box;
    }
    hd.appendChild(document.createTextNode(who(tb, lg.s) + ' 對【' + fname(v, lg.p) + '】說'));
    box.appendChild(hd);
    box.appendChild(el('p', 'ad-say-t', '「' + c.t + '」'));
    if (c.s) box.appendChild(el('small', '', '語氣：' + c.tone + '　真正的意思：' + c.mean));
    box.appendChild(el('em', lg.blocked ? 'blk' : lg.d > 0 ? 'up' : 'dn', lg.blocked ? '🛡️ 被守護天使擋下來了' : '心情 ' + sgn(lg.d)));
    return box;
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view;
    if (L.round !== tb.round) { L.round = tb.round; L.sel = -1; L.pick = null; L.sent = -1; L.key = -1; L.peek = false; }
    if (prev && v.cnt !== L.key && v.log) {
      var lg = v.log, c = lg.c && CARD[lg.c];
      fx.snd(!c ? 'move' : c.k === 'a' ? 'pop' : c.k === 'd' ? 'cap' : 'check');
      if (c && c.k === 'g' && c.g === 4 && lg.s !== tb.seat) fx.toast('🌪️ 圖像大風吹！按住「我的圖像」看看你現在是誰');
      if (v.turn === tb.seat && !tb.res) setTimeout(function () { fx.snd('turn'); }, 500);
    }
    L.key = v.cnt;
    if (L.sel >= (v.hand ? v.hand.length : 0)) L.sel = -1;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '先按住「我的圖像」偷偷看你是誰，不要說出來喔 🤫');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0, myTurn = !tb.res && !out && v.turn === seat && L.sent !== v.cnt;
    var g = { P: v.P, own: [], np: v.np, plays: v.plays, lastDevil: v.lastDevil, out: v.out }; g.own[seat] = v.mine;
    var selC = myTurn && L.sel >= 0 ? v.hand[L.sel] : null, tg = selC ? targets(g, seat, selC) : null;
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; L.sel = -1; L.pick = null; ctx.send(t, d); ctx.rerender(); }
    var wrap = el('div', 'ad-table' + (v.mode === 'coop' ? ' coop' : ''));
    // 狀態
    var st = el('div', 'ad-status');
    if (tb.res) st.textContent = '這局結束了！大家的圖像翻開囉';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (myTurn) { st.className = 'ad-status me'; st.textContent = !selC ? '輪到你了！選一張牌' : !tg ? '這張牌現在不能用，換一張' : tg.p ? '點一個發光的圖像' : tg.s ? '選下一個出牌的人' : '按下面的按鈕使用這張牌'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + ' 出牌…';
    wrap.appendChild(st);
    // 出牌順序
    var ord = el('div', 'ad-order');
    ord.appendChild(el('span', 'ad-dir', v.dir > 0 ? '順序 ➡️' : '順序 ⬅️'));
    var seq = v.order.slice(); if (v.dir < 0) seq.reverse();
    seq.forEach(function (s) {
      var ch = el('span', 'ad-chip' + (s === v.turn && !tb.res ? ' turn' : '') + (v.out.indexOf(s) >= 0 ? ' out' : '') + (tg && tg.s && tg.s.indexOf(s) >= 0 ? ' tg' : ''));
      ch.setAttribute('data-seat', s);
      var d = el('i'); d.style.background = SEATC[s]; ch.appendChild(d); ch.appendChild(document.createTextNode(who(tb, s)));
      if (tg && tg.s && tg.s.indexOf(s) >= 0) ch.addEventListener('click', function () { ctx.snd('tap'); L.pick = { s: s }; ctx.rerender(); });
      ord.appendChild(ch);
    });
    wrap.appendChild(ord);
    // 圖像
    var grid = el('div', 'ad-faces n' + v.P.length);
    v.P.forEach(function (p, i) {
      var f = FACES[p.f], isT = tg && tg.p && (tg.p.indexOf(i) >= 0 || (i === v.mine && (CARD[selC].k !== 'g' || CARD[selC].g !== 8)));
      var t = el('div', 'ad-face' + (isT ? ' tg' : '') + (L.pick && L.pick.p === i ? ' pick' : '') + (tb.res && i === v.mine ? ' mine' : ''));
      t.style.setProperty('--fc', f.c);
      var pic = el('div', 'ad-pic'); pic.innerHTML = faceSVG(p.f, p.m); pic.appendChild(el('span', 'ad-acc', f.i)); if (p.shield) pic.appendChild(el('span', 'ad-shield', '🛡️'));
      t.appendChild(pic);
      t.appendChild(el('div', 'ad-fn', f.n));
      t.appendChild(meterEl(p.m));
      t.appendChild(el('div', 'ad-mood ' + (p.m > 0 ? 'up' : p.m < 0 ? 'dn' : ''), sgn(p.m).replace('±0', '0') + ' ' + MOOD(p.m)));
      if (tb.res && v.owners) { var ow = v.owners[i]; t.appendChild(el('div', 'ad-owner', ow < 0 ? '沒有人' : (ow === seat ? '⭐ 你' : short(tb, ow)))); }
      if (isT) t.addEventListener('click', function () {
        if (i === v.mine) { ctx.toast('這是你自己的圖像，不能選喔！'); return; }
        if (tg.p.indexOf(i) < 0) { ctx.toast('這個圖像現在不能選'); return; }
        ctx.snd('tap'); L.pick = { p: i }; ctx.rerender();
      });
      grid.appendChild(t);
    });
    wrap.appendChild(grid);
    // 最新的一句話
    var sp = tb.res ? null : speech(tb, v, v.log && v.log.k !== 'swap' ? v.log : null);
    if (sp) wrap.appendChild(sp);
    if (tb.res) wrap.appendChild(debrief(tb, v));
    // 紀錄
    var lgBox = el('div', 'ad-log'), lgs = (v.logs || []).slice(0, -1).slice(-3).reverse();
    if (!tb.res && lgs.length) { lgs.forEach(function (lg) { var li = el('div', 'ad-li'), d = el('i'); d.style.background = SEATC[lg.s]; li.appendChild(d); li.appendChild(document.createTextNode(logText(tb, v, lg))); lgBox.appendChild(li); }); wrap.appendChild(lgBox); }
    // 我的圖像 + 手牌
    if (!tb.res && !out && v.hand) {
      var me = el('div', 'ad-me' + (myTurn ? ' turn' : '')); me.setAttribute('data-seat', seat);
      var pk = el('button', 'ad-peek' + (L.peek ? ' on' : '')); pk.type = 'button';
      if (L.peek && v.mine >= 0) { var mf = FACES[v.P[v.mine].f]; pk.innerHTML = '<span class="ad-pk-pic">' + faceSVG(v.P[v.mine].f, v.P[v.mine].m) + '</span><b>' + mf.i + mf.n + '</b><small>心情 ' + sgn(v.P[v.mine].m).replace('±0', '0') + '・不要說出來喔！</small>'; }
      else pk.innerHTML = '<span class="ad-pk-q">🤫</span><b>按住看我的圖像</b><small>只有你自己知道</small>';
      function on(e) { e.preventDefault(); if (!L.peek) { L.peek = true; ctx.rerender(); } }
      function off() { if (L.peek) { L.peek = false; ctx.rerender(); } }
      pk.addEventListener('pointerdown', on); pk.addEventListener('pointerup', off); pk.addEventListener('pointerleave', off); pk.addEventListener('pointercancel', off);
      pk.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      me.appendChild(pk);
      var hand = el('div', 'ad-hand');
      v.hand.forEach(function (cid, i) {
        var usable = !!targets(g, seat, cid), b = cardEl(cid, (L.sel === i ? ' sel' : '') + (myTurn && !usable ? ' dim' : ''));
        b.addEventListener('click', function () {
          var c = CARD[cid];
          if (!myTurn) { ctx.toast(c.k === 'g' ? c.n + '：' + c.d : '「' + c.t + '」'); return; }
          L.sel = L.sel === i ? -1 : i; L.pick = null; ctx.snd('tap'); ctx.rerender();
        });
        hand.appendChild(b);
      });
      me.appendChild(hand);
      wrap.appendChild(me);
      var tools = el('div', 'ad-tools');
      if (myTurn && selC && !v.swapped) tools.appendChild(ctx.button('ad-btn', '🔁 換掉這張（每局 1 次）', function () { if (confirm('把這張牌換成一張新的？換完還是要出牌喔（每局只能換 1 次）')) { var i = L.sel; L.sel = -1; ctx.send('swap', { i: i, n: v.cnt }); L.sent = v.cnt; ctx.rerender(); } }));
      if (myTurn && tg && tg.now && !L.pick) tools.appendChild(ctx.button('ad-btn go', '⚡ 使用這張牌', function () { L.pick = {}; ctx.rerender(); }));
      tools.appendChild(ctx.button('ad-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('ad-btn'));
      wrap.appendChild(tools);
    }
    // 確認視窗：念出來
    if (myTurn && selC && tg && L.pick) wrap.appendChild(confirmBox(tb, v, selC, L.pick, function () { var d = { i: L.sel }; if (L.pick.p != null) d.p = L.pick.p; if (L.pick.s != null) d.s = L.pick.s; ctx.snd('tap'); send('play', d); }, function () { L.pick = null; ctx.rerender(); }));
    box.appendChild(wrap);
  };
  function confirmBox(tb, v, cid, pick, ok, cancel) {
    var c = CARD[cid], ov = el('div', 'ad-ov'), bx = el('div', 'ad-ovb ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? 'devil' : 'god'));
    var line = null, help = '';
    if (c.k === 'a' || c.k === 'd') { line = c.t; help = '看著【' + fname(v, pick.p) + '】，大聲把這句話念出來：'; }
    else if (c.g === 7) { line = CARD[v.lastDevil.c].r; help = '把剛剛那句「' + CARD[v.lastDevil.c].t + '」改成好聽的說法，大聲念出來：'; }
    else if (c.g === 8) { line = '對不起，剛剛那樣說讓你難過了。'; help = '對【' + fname(v, pick.p) + '】說一句道歉的話，例如：'; }
    else if (c.g === 10) { line = '如果我是' + FACES[v.P[pick.p].f].n + '，我現在覺得' + MOOD(v.P[pick.p].m) + '，因為……'; help = '想一想【' + fname(v, pick.p) + '】的心情，大聲說出來：'; }
    else if (c.g === 11) { help = '請全桌一起深呼吸 3 次：'; line = '吸氣……吐氣……'; }
    else help = c.d + (pick.p != null ? '：【' + fname(v, pick.p) + '】' : pick.s != null ? '：下一個換 ' + who(tb, pick.s) : '');
    bx.appendChild(el('div', 'ad-ovh', c.k === 'g' ? c.e + ' ' + c.n : c.k === 'a' ? '😇 天使牌' : '😈 惡魔牌'));
    bx.appendChild(el('p', 'ad-ovhelp', help));
    if (line) bx.appendChild(el('p', 'ad-ovline', '「' + line + '」'));
    if (c.s) bx.appendChild(el('p', 'ad-ovtone', '用這種語氣：' + c.tone));
    if (c.k === 'd') bx.appendChild(el('p', 'ad-ovnote', '這是卡片上的話，不是你心裡的話。照卡片念，不要自己加詞。'));
    var row = el('div', 'ad-ovbtns');
    var b1 = el('button', 'ad-btn go', line && c.g !== 11 ? '🗣️ 我念完了，出牌' : c.g === 11 ? '🌬️ 呼吸完了' : '⚡ 確定使用'); b1.type = 'button'; b1.addEventListener('click', ok);
    var b2 = el('button', 'ad-btn', '取消'); b2.type = 'button'; b2.addEventListener('click', cancel);
    row.appendChild(b2); row.appendChild(b1); bx.appendChild(row); ov.appendChild(bx);
    return ov;
  }
  /* 結束後的分享 */
  function debrief(tb, v) {
    var w = el('div', 'ad-deb');
    var ms = v.P.map(function (p) { return p.m; }), hi = Math.max.apply(null, ms), lo = Math.min.apply(null, ms);
    w.appendChild(el('h3', '', '💬 說說看你的感受'));
    var tips = el('div', 'ad-deb-tips');
    ['我的圖像從 0 格變成 ___ 格。', '聽到「___」這句話的時候，我覺得 ___。', '如果我真的這麼難過，我可能會想要 ___。', '我希望別人對我說「___」。'].forEach(function (t) { tips.appendChild(el('p', '', t)); });
    w.appendChild(tips);
    var list = el('div', 'ad-deb-list');
    v.P.forEach(function (p, i) {
      var ow = v.owners ? v.owners[i] : -1, r = el('div', 'ad-deb-row' + (p.m === hi && hi !== lo ? ' hi' : '') + (p.m === lo && hi !== lo ? ' lo' : ''));
      var top = el('div', 'ad-deb-top'); top.innerHTML = '<span class="ad-deb-pic">' + faceSVG(p.f, p.m) + '</span>';
      top.appendChild(el('b', '', fname(v, i) + '（' + (ow < 0 ? '沒有人' : ow === tb.seat ? '你' : short(tb, ow)) + '）'));
      top.appendChild(el('span', 'ad-mood ' + (p.m > 0 ? 'up' : p.m < 0 ? 'dn' : ''), sgn(p.m).replace('±0', '0') + ' ' + MOOD(p.m)));
      if (p.m === hi && hi !== lo) top.appendChild(el('em', 'tag hi', '心情最高'));
      if (p.m === lo && hi !== lo) top.appendChild(el('em', 'tag lo', '心情最低'));
      r.appendChild(top);
      if (p.hist && p.hist.length > 1) r.appendChild(spark(p.hist));
      r.appendChild(el('small', '', '收到天使牌 ' + p.ga + ' 張、惡魔牌 ' + p.gd + ' 張'));
      if (p.rec && p.rec.length) {
        var said = el('div', 'ad-deb-said');
        p.rec.slice(-6).forEach(function (cid) { var c = CARD[cid]; if (c.k === 'g') return; said.appendChild(el('span', c.k === 'a' ? 'a' : 'd', c.t)); });
        r.appendChild(said);
      }
      list.appendChild(r);
    });
    w.appendChild(list);
    w.appendChild(el('p', 'ad-deb-end', '🙌 最後請對旁邊的同學，真心說一句天使牌上的話。'));
    return w;
  }
  function spark(h) {
    var W = 200, H = 40, n = h.length, pts = h.map(function (m, k) { return (k * W / (n - 1)).toFixed(1) + ',' + (H / 2 - m * H / 10.5).toFixed(1); }).join(' ');
    var d = el('div', 'ad-spark');
    d.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><line x1="0" x2="' + W + '" y1="' + H / 2 + '" y2="' + H / 2 + '" stroke="#bbb" stroke-dasharray="3 3"/><polyline points="' + pts + '" fill="none" stroke="#7c4dff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    return d;
  }
  function list(arr, f) { return arr.map(f).join(''); }
  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>桌上有一排<b>圖像</b>，每個圖像都有<b>情緒碼錶</b>（-5 到 +5），一開始都是 0「普通」。</li><li>每個人會祕密分到一個圖像。按住「🤫 按住看我的圖像」偷偷看，<b>不要告訴別人</b>你是哪一個！</li><li>每人手上 3 張牌。輪到你時一定要出一張牌（不能 pass），出完自動補到 3 張。</li><li><b>天使牌</b>讓圖像心情變好，<b>惡魔牌</b>讓圖像心情變差。選一個圖像（不能選自己的），<b>看著它大聲念出卡片上的話</b>。</li><li><b>天神牌</b>有特別的功能，例如迴轉、圖像大風吹、守護天使。</li><li>有圖像到 +5 或 -5，或大家都出完規定張數，遊戲就結束，所有人的圖像翻開。</li></ol>' },
      { h: '贏的方法', html: '<p><b>🏆 比賽模式：</b>翻開後，自己圖像的心情最高的人贏。</p><p><b>🤝 合作模式：</b>結束時，所有人的圖像都在 0 以上，大家一起過關！有圖像掉到 -5 就失敗。</p><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 贏（或合作過關）</td><td>3 分</td></tr><tr><td>🤝 大家一樣高</td><td>1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' },
      { h: '天神牌', html: '<table class="g-tbl"><tr><th>牌</th><th>功能</th></tr>' + list(GOD, function (c) { return '<tr><td>' + c.e + ' ' + c.n + '</td><td>' + c.d + '</td></tr>'; }) + '</table><p>每局可以把一張手牌換掉 1 次（換完還是要出牌）。</p>' },
      { h: '說話的規則', html: '<ul><li>惡魔牌上的話是<b>卡片上的話，不是你心裡的話</b>。</li><li>要<b>照卡片念</b>，不可以自己加詞。</li><li>念惡魔牌時看著<b>圖像</b>，不要看著同學。</li><li><b>酸言酸語牌</b>表面上像在稱讚，其實是在說別人不好。卡片上有寫要用什麼語氣，也有寫「真正的意思」。</li><li>不舒服的時候，可以舉手跟老師說要休息。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「益智」→「天使與惡魔」。每桌 3～6 人（4～5 人最好）。4 人以下會多放一個沒人拿的圖像，比較不容易猜出誰是誰。</li><li>QR code 上方可以選<b>玩法</b>（比賽／合作）和<b>每人出幾張牌</b>（5／8／12 張）。建議第一次先玩合作模式。</li><li>老師端就是「天神」：每一桌都看得到每個圖像是誰的（圓點顏色＝玩家），學生看不到。系統會自動擋住學生出牌給自己的圖像。</li><li>學生出牌時，畫面會請他大聲念出來，念完才按出牌。最新的一句話會大大的顯示在全桌的畫面上。</li><li>結束後全部翻開，畫面會顯示每個圖像的心情變化線、收到的天使牌和惡魔牌，以及分享用的句型。</li></ol>' },
      { h: '上課前', html: '<ul><li>先介紹情緒碼錶的每一格（超級開心、開心、有點高興、普通、有點難過、很難過、崩潰），讓學生說說自己現在在第幾格。</li><li>和學生一起念：「卡片上的話不是我心裡的話」。</li><li>酸言酸語牌：先示範同一句「你很棒」用真心的語氣說一次、用酸的語氣說一次，讓學生聽出差別。亞斯的學生特別需要這一步。</li><li>圖像大風吹、大家換位子這些牌會讓事情突然改變，先讓學生看過天神牌清單。</li><li>班上有被霸凌經驗的學生，請先看過惡魔牌，避免勾起不好的回憶。</li></ul>' },
      { h: '結束後的分享', html: '<ol><li><b>出戲：</b>每個人對旁邊的真人同學說一句天使牌的話，讓氣氛回到正向。</li><li><b>分享：</b>請心情最高和最低的兩位先說，可以用畫面上的句型：<ul><li>「我的圖像從 0 格變成 ___ 格。」</li><li>「聽到『___』這句話的時候，我覺得 ___。」</li><li>「如果我真的這麼難過，我可能會想要 ___。」</li><li>「我希望別人對我說『___』。」</li></ul></li><li><b>討論：</b>不一樣的心情會不會讓我們做出不一樣的事？</li><li><b>本週天使任務：</b>這週在學校真的對一個人說一句天使牌的話，下次上課回報。</li></ol>' },
      { h: '觀察重點', html: '<ul><li>念天使牌時，語氣和表情是不是溫暖的？</li><li>能不能說出酸言酸語牌「真正的意思」？</li><li>能不能等到輪到自己才出牌？</li><li>自己的圖像心情變低時有什麼反應，能不能用話說出來？</li><li>有沒有使用轉念牌、道歉修復？</li></ul><p>遊戲設計：andice（社會技巧卡牌構思）；為什麼要保密圖像：不讓特定的人成為被針對的一方，每個人都有一樣的機會被稱讚、也承受批評，體會被攻擊的人心裡的感受。</p>' }
    ]
  };
  BG.register('angel', mod);
})();
