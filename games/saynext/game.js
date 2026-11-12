/* 你說我接（社會技巧・對話接話卡牌，原創題目）
   玩法機制參考市售社交教具的「念題 → 大家出回應牌 → 匿名投票」流程，題目、回應、名稱與美術皆為原創。
   每一題由一位「念題的人」抽題目卡，照情緒骰子指定的語氣念出來；其他人從 5 張手牌挑一張最適合的回應（話或動作）蓋著交出。
   全部回應洗亂後匿名翻開，每人 2 票（不能投自己），票最多的回應得 1 分。
   牌堆裡有少數「不太合適」的回應，翻開後系統會標出來，這種牌票再多也不能得分。
   結束條件：先到指定分數、或念完指定回合數（可以兩個一起用，先到就結束；也可以只用其中一個）。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var HAND = 5, LET = 'ABCDEFGH';
  /* 情緒語氣 */
  var EMO = {
    h: { e: '😄', n: '開心' }, s: { e: '😢', n: '難過' }, a: { e: '😠', n: '生氣' }, u: { e: '😲', n: '驚訝' }, w: { e: '😟', n: '擔心' }
  };
  /* 回應的種類 */
  var CAT = { comfort: '安慰關心', joy: '替你開心', cheer: '鼓勵打氣', ask: '好奇追問', help: '主動幫忙', calm: '同理冷靜', thank: '回應感謝', forgive: '接受道歉', yes: '答應邀請' };
  /* 「我先說」題目卡：[句子, 可能的情緒（第一個是主要情緒）, 額外適合的回應種類] */
  var Q = [
    ['我的小狗昨天走丟了。', 'sw', 'help'], ['我這次數學考了一百分！', 'hu', ''], ['我明天要轉學了。', 'swh', ''], ['我的鉛筆盒被弄壞了。', 'sa', 'help'],
    ['我在賽跑的時候跌倒了。', 's', 'help'], ['我們班拔河比賽得到第一名！', 'hu', ''], ['我等一下要上台報告。', 'w', 'cheer'], ['有人一直笑我的新髮型。', 'sa', ''],
    ['我媽媽生了一個小妹妹！', 'hu', ''], ['我的作業忘記帶了。', 'ws', 'help'], ['我把你的橡皮擦弄丟了，對不起。', 'ws', 'forgive'], ['下課要不要一起去打球？', 'h', 'yes'],
    ['謝謝你昨天借我雨傘。', 'h', 'thank'], ['這一題我怎麼想都不會寫。', 'ws', 'help cheer'], ['我的好朋友今天都不理我。', 'saw', ''], ['我學會騎腳踏車了！', 'hu', ''],
    ['我的阿嬤生病住院了。', 'sw', ''], ['我今天被老師罵了。', 'sa', ''], ['今天是我的生日！', 'h', ''], ['我的飲料打翻在地上了。', 'us', 'help'],
    ['我不小心撞到你了，對不起。', 'w', 'forgive'], ['我們一起做勞作好不好？', 'h', 'yes'], ['我週末要去動物園。', 'hu', ''], ['打雷的聲音好可怕。', 'w', 'comfort'],
    ['他插隊排到我前面！', 'a', ''], ['我的畫被選去貼在公布欄。', 'hu', ''], ['我好想念以前的同學。', 's', ''], ['我找不到我的水壺。', 'ws', 'help'],
    ['我的牙齒掉了一顆。', 'uhw', ''], ['我養的小魚死掉了。', 's', ''], ['我今天投籃投進了十球！', 'h', ''], ['我們這一組都沒有人要聽我說。', 'as', ''],
    ['我的腳好痛，走不動了。', 'sw', 'help'], ['我明天要去看牙醫。', 'w', 'cheer'], ['我拿到了班上的好寶寶獎狀。', 'h', ''], ['我今天早上睡過頭，差點遲到。', 'uw', ''],
    ['我的平板被弟弟摔壞了。', 'as', ''], ['我的便當忘在家裡了。', 'sw', 'help'], ['下雨了，我沒有帶傘。', 'w', 'help'], ['謝謝你剛剛幫我撿東西。', 'h', 'thank'],
    ['我第一次自己去買早餐。', 'hwu', ''], ['我跟哥哥吵架了。', 'as', ''], ['我們隊輸了比賽。', 'sa', 'cheer'], ['明天要考試，我好緊張。', 'w', 'cheer'],
    ['我的風箏卡在樹上了。', 'su', 'help'], ['我種的綠豆發芽了！', 'hu', ''], ['我被分到跟不熟的人同一組。', 'w', ''], ['我昨天作了一個好可怕的夢。', 'w', ''],
    ['我們家要出國去玩！', 'hu', ''], ['對不起，我剛剛對你太大聲了。', 'w', 'forgive'], ['這個拼圖我拼了好久都拼不完。', 'as', 'help cheer'], ['我今天第一次當值日生。', 'wh', ''],
    ['我的作文被老師稱讚了。', 'h', ''], ['有人拿走我的球不還。', 'a', 'help'], ['我的腳踏車輪胎破了。', 'sa', 'help'], ['我要去參加鋼琴比賽。', 'wh', 'cheer'],
    ['我家的貓咪生了小貓！', 'hu', ''], ['我覺得大家都不喜歡我。', 's', ''], ['上課的時候，我聽不懂老師在講什麼。', 'ws', 'help'], ['你可以陪我一起去保健室嗎？', 'w', 'yes'],
    ['我抽到最後一個上台。', 'wa', ''], ['我撿到一百元，交給了老師。', 'h', ''], ['我的眼鏡壞掉了，看不清楚。', 'sw', 'help'], ['我好餓喔，肚子一直叫。', 's', 'help'],
    ['我們班下個禮拜要去校外教學！', 'h', ''], ['我最好的朋友要搬家了。', 's', ''], ['我跑步跑了最後一名。', 'sa', 'cheer'], ['我的衣服被潑到顏料了。', 'asu', 'help'],
    ['我終於把整本書看完了！', 'h', ''], ['我等了好久，媽媽還沒有來接我。', 'wa', ''], ['我做的模型被別人弄壞了。', 'as', ''], ['我今天被選為班長！', 'hu', ''],
    ['謝謝你今天陪我玩。', 'h', 'thank'], ['我不敢一個人去廁所。', 'w', 'help cheer'], ['我種的植物枯掉了。', 's', ''], ['我會翻跟斗了！', 'hu', ''],
    ['我的作業被風吹走了。', 'us', 'help'], ['我想參加社團，可是不知道要選哪一個。', 'w', 'ask help'], ['這包餅乾要不要跟我一起吃？', 'h', 'yes thank'], ['老師說我最近進步很多！', 'h', '']
  ].map(function (a, k) { return { id: 'q' + k, k: 'q', t: a[0], e: a[1], x: a[2] ? a[2].split(' ') : [] }; });
  /* 「換我說」回應卡 */
  var R = [];
  function addR(cat, list) { list.forEach(function (t) { R.push({ id: 'r' + R.length, k: 'r', t: t, cats: [cat] }); }); }
  addR('comfort', ['你還好嗎？', '聽起來你好難過。', '那一定很不好受。', '沒關係，我陪你。', '要不要先坐下來休息一下？', '我在這裡，你可以跟我說。', '想哭的話，哭一下也沒關係。', '換成是我，我也會很難過。',
    '你需要我陪你一下嗎？', '真希望這件事沒有發生。', '你已經很努力了。', '慢慢來，不用急。', '我會一直當你的好朋友。', '這不是你的錯。', '要不要跟我說說發生了什麼事？']);
  addR('joy', ['太棒了！恭喜你！', '哇，真替你高興！', '你好厲害喔！', '你一定很開心吧！', '這是你努力得來的！', '真的嗎？太好了！', '聽到這個，我也好開心！', '你真的做到了！',
    '這真是一個好消息！', '一定要好好慶祝一下！', '你的努力有回報了！', '哇，好酷喔！']);
  addR('cheer', ['加油，你一定可以的！', '別擔心，你準備得很好。', '深呼吸，慢慢來。', '就算沒成功也沒關係，再試一次就好。', '我相信你！', '你上次做到了，這次也可以。', '會緊張是正常的。', '我會在旁邊幫你加油。',
    '不要放棄，再試一次！', '你比你想的還要勇敢。', '一步一步來就好。', '下次一定會更好。', '不管結果怎樣，我都覺得你很棒。']);
  addR('ask', ['然後呢？後來怎麼了？', '真的嗎？是怎麼發生的？', '你那時候心裡在想什麼？', '你是怎麼做到的？', '可以多說一點嗎？', '那你現在覺得怎麼樣？', '是什麼時候的事？', '你最喜歡的是哪個部分？',
    '哇，那是什麼感覺？', '可以教我嗎？', '你要跟誰一起去？', '下次可以告訴我結果嗎？']);
  addR('help', ['需要我幫忙嗎？', '我陪你去找老師。', '我的可以先借你用。', '我們一起找找看。', '我幫你一起想辦法。', '要不要我陪你去？', '我教你，很簡單的。', '我幫你拿著。',
    '我們一起去問問看。', '我的分一半給你。', '我去幫你拿衛生紙。', '我們一起把它收拾乾淨。', '你想要我怎麼幫你？']);
  addR('calm', ['換成是我，我也會很生氣。', '先深呼吸，我們冷靜一下。', '那真的很讓人生氣。', '我們一起去跟老師說。', '先不要動手，用說的比較好。', '你可以跟他說：「請你不要這樣。」',
    '生氣是正常的，我們想想怎麼辦。', '我懂你的感覺。', '我們先離開一下，等一下再說。', '要不要喝口水，休息一下？']);
  addR('thank', ['不客氣！', '不用謝，這是我應該做的。', '能幫上忙，我很開心。', '下次需要也可以找我喔！', '我們是好朋友嘛！', '小事一件，別放在心上。']);
  addR('forgive', ['沒關係，我原諒你。', '謝謝你跟我道歉。', '沒關係，下次小心就好。', '我知道你不是故意的。', '好，我們還是好朋友。', '我們一起想辦法補救吧。']);
  addR('yes', ['好啊！我很樂意！', '好呀，我們一起去！', '謝謝你邀請我！', '聽起來很好玩，算我一個！', '好啊，那我們輪流好不好？', '謝謝你想到我！']);
  /* 行動卡 */
  var M = [
    ['👍', '比一個讚', 'joy cheer'], ['🙂', '點點頭', 'comfort calm yes'], ['🫲', '輕輕拍拍他的肩膀', 'comfort cheer'], ['✋', '跟他擊掌', 'joy yes'],
    ['👏', '為他鼓掌', 'joy'], ['🤗', '張開雙手問：「要抱抱嗎？」', 'comfort'], ['🧻', '遞給他一張衛生紙', 'comfort help'], ['😊', '給他一個溫暖的微笑', 'comfort joy thank forgive'],
    ['🌬️', '陪他一起深呼吸', 'calm cheer'], ['💪', '握拳說「加油」', 'cheer'], ['👂', '把手放在耳朵旁，認真聽他說', 'ask comfort'], ['🤔', '歪著頭，用好奇的表情看他', 'ask'],
    ['🙋', '舉手說「我來幫你」', 'help'], ['🫶', '用手比一個愛心', 'joy thank forgive'], ['🤝', '跟他握握手', 'forgive thank yes'], ['🪑', '拉一張椅子請他坐下', 'comfort help']
  ].map(function (a, k) { return { id: 'm' + k, k: 'm', i: a[0], t: a[1], cats: a[2].split(' ') }; });
  /* 不太合適的回應：[句子, 問題在哪, 為什麼不合適, 可以改成] */
  var B = [
    ['那又怎樣？', '冷漠', '對方會覺得你一點都不在乎他。', '你還好嗎？可以多說一點嗎？'],
    ['我也是啊，我比你更慘。', '只講自己', '把話題搶到自己身上，對方的事情沒有被聽到。', '聽起來你好難過，然後呢？'],
    ['這有什麼好哭的？', '否定感受', '把對方的感受說成不重要，他會覺得不被了解。', '想哭的話，哭一下也沒關係。'],
    ['哈哈，好好笑喔！', '嘲笑', '別人遇到困難的時候笑他，他會很受傷。', '你還好嗎？需要幫忙嗎？'],
    ['喔。（繼續玩自己的東西）', '不理人', '對方會覺得自己在跟空氣說話。', '放下手上的東西，看著他說：「怎麼了？」'],
    ['我昨天去吃了冰淇淋。', '轉移話題', '對方說的事被跳過去了，他會覺得你沒在聽。', '先回應他說的事，再分享自己的。'],
    ['誰叫你自己不小心。', '指責', '對方已經很難過了，再怪他會更難過。', '沒關係，我們一起想辦法。'],
    ['這麼簡單也不會？', '看不起人', '會讓對方覺得自己很笨，下次就不敢問了。', '不會沒關係，我教你。'],
    ['我才不在乎。', '冷漠', '對方會覺得自己的事一點都不重要。', '這件事對你很重要吧？'],
    ['你一定是在騙人。', '不相信', '沒有證據就說別人說謊，會傷害彼此的信任。', '真的嗎？是怎麼發生的？'],
    ['好煩喔，不要跟我說話。', '拒絕', '對方鼓起勇氣說出來，卻被推開。', '我現在有點累，等一下再聽你說好嗎？'],
    ['這沒什麼了不起的。', '潑冷水', '對方很開心地分享，卻被澆了一盆冷水。', '哇，真替你高興！'],
    ['早就跟你說了吧！', '落井下石', '事情已經發生了，說這句話只會讓對方更難過。', '下次我們一起注意就好。'],
    ['你每次都這樣。', '貼標籤', '用「每次」說別人，對方會覺得自己永遠都是壞的。', '這次沒關係，下次小心就好。'],
    ['我比你更厲害。', '比較炫耀', '把別人的快樂變成比賽，對方會覺得不舒服。', '你好厲害喔，恭喜你！'],
    ['不要再說了，好煩喔！', '不耐煩', '對方會覺得自己很討人厭。', '我在聽，你慢慢說。']
  ].map(function (a, k) { return { id: 'b' + k, k: 'r', bad: 1, t: a[0], why: a[1], bwhy: a[2], better: a[3] }; });
  var CARD = {}; Q.concat(R, M, B).forEach(function (c) { CARD[c.id] = c; });
  function C(id) { return CARD[id]; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  /* 老師自訂的題目和回應：id 由內容決定，所以老師端、學生端算出來都一樣 */
  function addCustom(cx) {
    var out = { q: [], r: [] }; if (!cx) return out;
    (cx.q || []).forEach(function (t) { t = String(t || '').trim().slice(0, 60); if (!t) return; var id = 'xq' + hash(t); CARD[id] = { id: id, k: 'q', t: t, e: 'hswua', x: [], custom: 1 }; out.q.push(id); });
    (cx.r || []).forEach(function (t) { t = String(t || '').trim().slice(0, 40); if (!t) return; var id = 'xr' + hash(t); CARD[id] = { id: id, k: 'r', t: t, cats: [], custom: 1 }; out.r.push(id); });
    return out;
  }
  /* 本節主題 */
  var TOPICS = [['all', '全部'], ['comfort', '😢 安慰與關心'], ['joy', '😄 替別人開心'], ['cheer', '😟 鼓勵打氣'], ['calm', '😠 面對生氣'], ['polite', '🙏 道謝、道歉與邀請']];
  var TOPIC_EMO = { comfort: 's', joy: 'h', cheer: 'w', calm: 'a' };
  function topicOk(q, tp) { if (!tp || tp === 'all' || q.custom) return true; if (tp === 'polite') return q.x.some(function (x) { return x === 'thank' || x === 'forgive' || x === 'yes'; }); return q.e.indexOf(TOPIC_EMO[tp]) >= 0; }
  /* 這一題、這種語氣，適合哪些回應 */
  function need(qid, emo) {
    var q = C(qid); if (!q) return [];
    var pol = q.x.filter(function (x) { return x === 'thank' || x === 'forgive' || x === 'yes'; });
    if (pol.length) return pol;
    var base = { h: ['joy', 'ask'], s: ['comfort', 'help'], a: ['calm', 'comfort'], w: ['cheer', 'comfort', 'help'], u: q.e.indexOf('h') >= 0 ? ['joy', 'ask'] : ['ask', 'comfort', 'help'] }[emo] || [];
    q.x.forEach(function (x) { if (base.indexOf(x) < 0) base.push(x); });
    return base;
  }
  function fit(cid, qid, emo) {
    var c = C(cid); if (!c) return 0; if (c.bad) return -2; if (c.custom) return 1;
    var nd = need(qid, emo);
    if (c.cats.some(function (x) { return nd.indexOf(x) >= 0; })) return 2;
    return c.cats.indexOf('ask') >= 0 ? 1 : 0;
  }
  function fitLabel(f) { return f >= 2 ? '✔ 很適合' : f === 1 ? '👌 也可以' : '➖ 這時候不太需要'; }
  var REASONS = { score: '先拿到指定的分數！', rounds: '大家都念完題目了', tie: '大家的分數一樣高', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '老師結束這局' };
  var PT_R = ['回應很貼心', '語氣很真誠', '眼睛有看著對方', '有耐心等別人', '說出了理由', '主動幫助同學'];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 規則 ---------- */
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function draw(g) { if (!g.deck.length) { g.deck = shuffle(g.disc); g.disc = []; } return g.deck.pop(); }
  function nBad(h) { return h.filter(function (id) { return C(id) && C(id).bad; }).length; }
  /* 手牌保證：手上「不太合適」的牌最多 2 張；連續 2 題手上都沒有的話，補牌時補 1 張。只控制補進來的牌，不換掉手上原本的牌 */
  function drawKind(g, want) {   // want: 'bad'、'good' 或 null
    if (!want) return draw(g);
    function find(a) { for (var j = a.length - 1; j >= 0; j--) if (!!C(a[j]).bad === (want === 'bad')) return j; return -1; }
    var k = find(g.deck); if (k >= 0) return g.deck.splice(k, 1)[0];
    k = find(g.disc); if (k >= 0) return g.disc.splice(k, 1)[0];
    return draw(g);
  }
  function drawFor(g, s) {
    var h = g.hands[s], nb = nBad(h);
    if (nb >= 2) return drawKind(g, 'good');
    if (nb === 0 && g.cfg.bad !== 'off' && (g.nob[s] || 0) >= 2) return drawKind(g, 'bad');
    return draw(g);
  }
  function fill(g) { alive(g).forEach(function (s) { while (g.hands[s].length < HAND && (g.deck.length || g.disc.length)) g.hands[s].push(drawFor(g, s)); g.nob[s] = nBad(g.hands[s]) ? 0 : (g.nob[s] || 0) + 1; }); }
  function players(g) { return alive(g).filter(function (s) { return s !== g.reader; }); }
  function blocked(g) { return !!(g.res || g.paused || g.help != null); }
  /* ⏱️ 選牌／投票倒數（只有老師開的多人桌；單人練習不倒數）。dl＝截止時間，dlLeft＝暫停時剩下的毫秒 */
  function setDl(g, sec) { g.dl = !g.solo && sec > 0 ? Date.now() + sec * 1000 : 0; g.dlLeft = 0; }
  function freeze(g) { if (g.dl && !g.dlLeft) g.dlLeft = Math.max(5000, g.dl - Date.now()); }
  function thaw(g) { if (g.dl && g.dlLeft) { g.dl = Date.now() + g.dlLeft; g.dlLeft = 0; } }
  function rec(g, e) { g.evq.push(e); }
  function buildDeck(cfg, cu) {
    var d = R.concat(M).map(function (c) { return c.id; });
    if (cfg.bad !== 'off') B.forEach(function (c) { d.push(c.id); });
    return shuffle(d.concat(cu.r));
  }
  function buildQ(cfg, cu) {
    var qs = Q.filter(function (q) { return topicOk(q, cfg.topic); }).map(function (q) { return q.id; }).concat(cu.q);
    return shuffle(qs.length ? qs : Q.map(function (q) { return q.id; }));
  }
  function newPrompt(g) {
    if (!g.qdeck.length) g.qdeck = buildQ(g.cfg, addCustom(g.cx));
    var q = C(g.qdeck.pop()), em = q.e.split('');
    var te = TOPIC_EMO[g.cfg.topic];
    g.q = q.id; g.emo = te && em.indexOf(te) >= 0 ? te : g.cfg.emo === 'off' ? em[0] : pick(em);
    g.phase = 'read'; g.plays = {}; g.opts = null; g.votes = {}; g.last = null; g.rv = null; g.say = {}; g.tp = {}; setDl(g, 0);
    fill(g); g.cnt++;
  }
  /* 每人可以投幾票：可以投的選項有 4 個以上時投 2 票，比較少時投 1 票（才不會每個都被迫投到） */
  function maxV(g, seat) { if (!g.opts) return 0; var n = g.opts.filter(function (o) { return o.s !== seat; }).length; return n >= 4 ? 2 : n ? 1 : 0; }
  function startVote(g) {
    var o = Object.keys(g.plays).map(function (s) { return { c: g.plays[s], s: +s }; });
    // 回應太少時，系統加入「神秘回應」湊到 4 個，大家才有得選，也比較猜不出是誰出的
    for (var t = 0; o.length < 4 && t < 200; t++) {
      if (!g.deck.length) { g.deck = shuffle(g.disc); g.disc = []; }
      var k = -1; for (var j = g.deck.length - 1; j >= 0; j--) if (!C(g.deck[j]).bad) { k = j; break; }
      if (k < 0) break;
      o.push({ c: g.deck.splice(k, 1)[0], s: -1 });
    }
    g.opts = shuffle(o); g.votes = {}; g.phase = 'vote'; setDl(g, g.tvote); g.cnt++;
  }
  function reveal(g) {
    var v = g.opts.map(function () { return 0; });
    Object.keys(g.votes).forEach(function (s) { g.votes[s].forEach(function (i) { v[i]++; }); });
    var mx = Math.max.apply(null, v), top = [], ws = [];
    if (mx > 0) v.forEach(function (n, i) { if (n === mx) top.push(i); });
    g.say = {};
    top.forEach(function (i) { var o = g.opts[i]; if (o.s >= 0 && !C(o.c).bad && ws.indexOf(o.s) < 0) { ws.push(o.s); rec(g, { seat: o.s, k: 'best' }); g.say[o.s] = { c: o.c, st: 'todo' }; } });
    g.opts.forEach(function (o, i) {
      if (o.s < 0) return;
      var c = C(o.c);
      rec(g, { seat: o.s, k: 'play', f: fit(o.c, g.q, g.emo), act: c.k === 'm', bad: !!c.bad, t: c.t, v: v[i] });
    });
    Object.keys(g.votes).forEach(function (s) { if (g.votes[s].some(function (i) { return C(g.opts[i].c).bad; })) rec(g, { seat: +s, k: 'vbad' }); });
    g.last = { v: v, top: top, ws: ws, bad: top.some(function (i) { return C(g.opts[i].c).bad; }) };
    g.hist.push({ q: g.q, emo: g.emo, r: g.reader, opts: g.opts.map(function (o, i) { return { c: o.c, s: o.s, v: v[i] }; }) });
    if (g.hist.length > 300) g.hist.shift();
    g.opts.forEach(function (o) { g.disc.push(o.c); });
    g.phase = 'show'; setDl(g, 0); g.n++; g.cnt++;
    // 得票最多的人要真的說一次：老師審查通過才給分（電腦和單人練習自動通過）
    ws.forEach(function (s0) { if (!g.hum[s0]) sayOk(g, s0, 2, null); });
    if (sayDone(g)) checkEnd(g);
  }
  function sayDone(g) { return Object.keys(g.say || {}).every(function (k) { var x = g.say[k]; return x.st === 'ok' || g.out.indexOf(+k) >= 0; }); }
  function sayOk(g, s0, pts, notify) {
    var x = g.say[s0]; if (!x || x.st === 'ok') return false;
    x.st = 'ok'; x.pts = pts; g.sc[s0] += pts; rec(g, { seat: s0, k: 'say', pts: pts });
    if (notify) notify(s0, pts >= 2 ? '✅ 老師通過了！+2 分' : '🌗 老師讓你通過了，+1 分');
    g.cnt++;
    if (sayDone(g)) checkEnd(g);
    return true;
  }
  function checkEnd(g) {
    var a = alive(g);
    var byScore = g.end !== 'rounds' && a.some(function (s) { return g.sc[s] >= g.target; });
    var byRounds = g.end !== 'score' && g.n >= g.rounds * a.length;
    if (byScore) finish(g, 'score'); else if (byRounds) finish(g, 'rounds');
  }
  function finish(g, why) {
    var a = alive(g), best = Math.max.apply(null, a.map(function (s) { return g.sc[s]; })), ws = a.filter(function (s) { return g.sc[s] === best; });
    if (ws.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
    else if (ws.length === 1) g.res = { w: ws[0], why: why };
    else g.res = { ws: ws, why: why };
    var r = g.res;
    a.forEach(function (s) { rec(g, { seat: s, k: 'end', sc: g.sc[s], win: r.ws ? r.ws.indexOf(s) >= 0 : r.w === s }); });
  }
  function nextReader(g) {
    var a = alive(g); if (!a.length) return;
    for (var k = 1; k <= g.np; k++) { var s = (g.reader + k) % g.np; if (a.indexOf(s) >= 0) { g.reader = s; return; } }
  }
  function unplay(g) { Object.keys(g.plays).forEach(function (s) { if (g.out.indexOf(+s) < 0) g.hands[s].push(g.plays[s]); else g.disc.push(g.plays[s]); }); g.plays = {}; if (g.opts) g.opts.forEach(function (o) { if (o.s < 0) g.disc.push(o.c); }); g.opts = null; }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    g.out.push(seat); g.disc = g.disc.concat(g.hands[seat]); g.hands[seat] = [];
    if (g.help === seat) g.help = null;
    var a = alive(g);
    if (a.length <= 1) { g.res = a.length ? { w: a[0], why: why } : { w: -1, why: why }; return; }
    if (a.length < 3) { finish(g, why); return; }   // 剩兩個人沒辦法好好投票：用目前的分數結束
    if (g.reader === seat && g.phase !== 'show') { unplay(g); nextReader(g); newPrompt(g); return; }
    if (g.phase === 'show' && g.say && g.say[seat] && sayDone(g)) checkEnd(g);
    if (g.phase === 'play' && players(g).every(function (s) { return g.plays[s]; })) startVote(g);
    else if (g.phase === 'vote' && alive(g).every(function (s) { return g.votes[s] || !maxV(g, s); })) reveal(g);
  }
  function canNext(g, seat) { return g.phase === 'show' && !g.res && sayDone(g) && (g.solo ? g.hum[seat] : seat === -9); }   // 多人：老師按下一題；單人練習：自己按

  var mod = {
    seats: 4, seatOptions: [3, 4, 5, 6], seatDefault: 4, botSeats: [2, 5], botDelay: 1600, ver: 2, oneTable: true,
    reasons: REASONS,
    opts: [
      { k: 'end', label: '什麼時候結束：', list: [['both', '分數或回合，先到就結束'], ['score', '只看分數'], ['rounds', '只看回合數']] },
      { k: 'target', label: '目標分數：', list: [['10', '先到 10 分'], ['6', '6 分'], ['14', '14 分'], ['20', '20 分']], note: '被選為最佳回應、老師通過 +2 分（半分通過 +1）' },
      { k: 'rounds', label: '回合數：', list: [['2', '每人念 2 題'], ['1', '每人念 1 題'], ['3', '每人念 3 題'], ['4', '每人念 4 題']] },
      { k: 'tplay', label: '⏱️ 選牌時間：', list: [['30', '30 秒'], ['20', '20 秒'], ['45', '45 秒'], ['60', '60 秒'], ['0', '不倒數']], note: '時間到：已經點了某張牌就出那張，還沒點就出最左邊那張' },
      { k: 'tvote', label: '⏱️ 投票時間：', list: [['30', '30 秒'], ['20', '20 秒'], ['45', '45 秒'], ['60', '60 秒'], ['0', '不倒數']], note: '時間到還沒投：系統幫他投 A（A 是自己出的就往後投）' }
    ],
    levelDesc: ['隨便出牌、隨便投', '大多會挑合適的話', '很會挑合適的話', '幾乎都挑最合適的話'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(2, Math.min(6, n || 4));
      var x = o._x || {}, cfg = { topic: x.topic || 'all', emo: x.emo || 'on', bad: x.bad || 'on', cx: x.cx || null };
      var cu = addCustom(cfg.cx), hum = [];
      for (var s = 0; s < n; s++) hum.push(o._bots && o._bots.length ? !o._bots[s] : true);
      var g = { np: n, hum: hum, out: [], cfg: cfg, cx: cfg.cx, end: { both: 'both', score: 'score', rounds: 'rounds' }[o.end] || 'both',
        target: Math.max(2, Math.min(40, +o.target || 10)), rounds: Math.max(1, Math.min(6, +o.rounds || 2)),
        deck: buildDeck(cfg, cu), disc: [], qdeck: buildQ(cfg, cu), hands: [], sc: [], swap: [], reader: Math.floor(Math.random() * n),
        phase: 'read', q: null, emo: 'h', plays: {}, opts: null, votes: {}, last: null, n: 0, cnt: 0, res: null, paused: false, help: null, evq: [], hist: [], nob: [], rv: null, say: {}, solo: !!o._solo, tp: {}, dl: 0, dlLeft: 0,
        tplay: o.tplay == null ? 30 : Math.max(0, Math.min(120, +o.tplay || 0)), tvote: o.tvote == null ? 30 : Math.max(0, Math.min(120, +o.tvote || 0)) };
      for (s = 0; s < n; s++) { g.hands.push([]); g.sc.push(0); g.swap.push(false); }
      newPrompt(g);
      return g;
    },
    turnSeat: function (g) { return g.reader; },
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; },
    view: function (g, seat) {
      var show = g.phase === 'show';
      return { np: g.np, phase: g.phase, reader: g.reader, q: g.q, emo: g.emo, emoOn: g.cfg.emo !== 'off', cx: g.cx,
        hand: seat >= 0 ? g.hands[seat] : null, myPlay: seat >= 0 ? g.plays[seat] || null : null,
        played: g.hum.map(function (h, s) { return !!g.plays[s]; }),
        opts: g.opts ? g.opts.map(function (o, i) { return { c: o.c, mine: seat >= 0 && o.s === seat, s: show ? o.s : null, v: show && g.last ? g.last.v[i] : null }; }) : null,
        voted: g.hum.map(function (h, s) { return !!g.votes[s]; }), myVotes: seat >= 0 ? g.votes[seat] || null : null, maxV: seat >= 0 ? maxV(g, seat) : 0,
        last: show ? g.last : null, sc: g.sc, n: g.n, end: g.end, target: g.target, rounds: g.rounds, out: g.out, cnt: g.cnt,
        hist: g.hist.map(function (h) { var mx = Math.max.apply(null, h.opts.map(function (o) { return o.v; })); return { q: h.q, emo: h.emo, r: h.r, w: mx > 0 ? h.opts.filter(function (o) { return o.v === mx; }).map(function (o) { return { c: o.c, s: o.s }; }) : [] }; }),
        rv: g.rv, say: g.say, solo: g.solo, left: g.dl && (g.phase === 'play' || g.phase === 'vote') ? (g.dlLeft || Math.max(0, g.dl - Date.now())) : null, frz: !!g.dlLeft, myPick: seat >= 0 && g.tp ? g.tp[seat] || null : null,
        paused: g.paused, help: g.help != null, swapped: seat >= 0 ? g.swap[seat] : true, canNext: seat >= 0 && canNext(g, seat), hum: g.hum };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t === 'help') { if (g.help != null) return false; freeze(g); g.help = seat; rec(g, { seat: seat, k: 'help' }); g.cnt++; return true; }
      if (blocked(g)) return false;
      if (d.t === 'read') {
        if (g.phase !== 'read' || seat !== g.reader || d.n !== g.cnt || g.rv === 'pend') return false;
        if (g.solo || !g.hum[seat]) { rec(g, { seat: seat, k: 'read' }); g.phase = 'play'; setDl(g, g.tplay); g.cnt++; return true; }
        g.rv = 'pend'; g.cnt++; return true;   // 念完要老師確認，才進到出牌
      }
      if (d.t === 'said') {   // 得分的人說完了，請老師確認
        var sx = g.say && g.say[seat]; if (g.phase !== 'show' || !sx || sx.st === 'ok' || sx.st === 'pend') return false;
        if (g.solo) return sayOk(g, seat, 2, notify);
        sx.st = 'pend'; g.cnt++; return true;
      }
      if (d.t === 'swap') {
        if (g.phase !== 'play' || seat === g.reader || g.plays[seat] || g.swap[seat]) return false;
        var si = d.i | 0, h0 = g.hands[seat]; if (!h0[si]) return false;
        g.swap[seat] = true; g.disc.push(h0[si]); h0.splice(si, 1); h0.splice(si, 0, drawFor(g, seat)); g.cnt++; return true;
      }
      if (d.t === 'pick') {   // 學生點了某張牌（還沒按出這張）：時間到就出這張
        if (g.phase !== 'play' || seat === g.reader || g.plays[seat]) return false;
        var pc = g.hands[seat][d.i | 0]; if (d.i == null || d.i < 0) pc = null; else if (!pc) return false;
        g.tp[seat] = pc; return true;
      }
      if (d.t === 'play') {
        if (g.phase !== 'play' || seat === g.reader || g.plays[seat]) return false;
        var h = g.hands[seat], i = d.i | 0; if (!h[i]) return false;
        g.plays[seat] = h.splice(i, 1)[0]; g.cnt++;
        if (players(g).every(function (s) { return g.plays[s]; })) startVote(g);
        return true;
      }
      if (d.t === 'vote') {
        if (g.phase !== 'vote' || g.votes[seat]) return false;
        var mv = maxV(g, seat), vs = (d.v || []).map(function (x) { return x | 0; }).filter(function (x, k, a) { return a.indexOf(x) === k; });
        if (vs.length !== mv || vs.some(function (x) { return !g.opts[x] || g.opts[x].s === seat; })) return false;
        g.votes[seat] = vs; g.cnt++;
        if (alive(g).every(function (s) { return g.votes[s] || !maxV(g, s); })) reveal(g);
        return true;
      }
      if (d.t === 'next') {
        if (!canNext(g, seat) || d.n !== g.cnt) return false;
        nextReader(g); newPrompt(g); return true;
      }
      return false;
    },
    /* 老師的動作 */
    hostAct: function (g, d, notify) {
      if (!g) return false;
      var t = d.t;
      if (t === 'resume') { if (!g.paused && g.help == null) return false; g.paused = false; g.help = null; thaw(g); g.cnt++; return true; }
      if (t === 'pause') { if (g.res || g.paused) return false; freeze(g); g.paused = true; g.cnt++; return true; }
      if (t === 'next') { if (g.res || g.phase !== 'show' || !sayDone(g)) return false; nextReader(g); newPrompt(g); return true; }
      if (t === 'more') { if (blocked(g) || !g.dl) return false; g.dl = Math.max(g.dl, Date.now()) + 15000; g.cnt++; return true; }
      if (t === 'tmo') {   // ⏱️ 時間到：還沒出牌的幫他出、還沒投票的幫他投
        if (blocked(g) || !g.dl || Date.now() < g.dl - 300 || d.n !== g.cnt) return false;
        var ph = g.phase, ok = false;
        if (ph === 'play') players(g).filter(function (s0) { return !g.plays[s0]; }).forEach(function (s0) {
          if (g.phase !== 'play') return;
          var hh = g.hands[s0], ix = g.tp[s0] ? hh.indexOf(g.tp[s0]) : -1, lock = ix >= 0; if (ix < 0) ix = 0;
          if (mod.act(g, s0, { t: 'play', i: ix }, notify)) { ok = true; rec(g, { seat: s0, k: 'auto', w: 'play' }); notify(s0, lock ? '⏱️ 時間到！出了你選好的那張牌' : '⏱️ 時間到！幫你出了最左邊那張牌'); }
        });
        else if (ph === 'vote') alive(g).filter(function (s0) { return !g.votes[s0] && maxV(g, s0); }).forEach(function (s0) {
          if (g.phase !== 'vote') return;
          var mv = maxV(g, s0), vs = [];
          for (var k = 0; k < g.opts.length && vs.length < mv; k++) if (g.opts[k].s !== s0) vs.push(k);
          if (mod.act(g, s0, { t: 'vote', v: vs }, notify)) { ok = true; rec(g, { seat: s0, k: 'auto', w: 'vote' }); notify(s0, '⏱️ 時間到！幫你投了 ' + vs.map(function (k) { return 'ABCDEF'[k]; }).join('、')); }
        });
        if (!ok) g.dl = 0;
        return true;
      }
      if (t === 'skip') { if (g.res || g.phase === 'show') return false; unplay(g); g.votes = {}; newPrompt(g); return true; }
      if (t === 'rdok') { if (g.res || g.phase !== 'read') return false; rec(g, { seat: g.reader, k: 'read' }); g.rv = null; g.phase = 'play'; setDl(g, g.tplay); g.cnt++; return true; }
      if (t === 'rdredo') { if (g.res || g.phase !== 'read' || g.rv !== 'pend') return false; g.rv = 'redo'; rec(g, { seat: g.reader, k: 'redo', w: 'read' }); notify(g.reader, '🔁 老師請你再念一次'); g.cnt++; return true; }
      if (t === 'sayok') { if (g.res || g.phase !== 'show') return false; return sayOk(g, d.seat | 0, d.half ? 1 : 2, notify); }
      if (t === 'sayredo') { var sy = g.say && g.say[d.seat | 0]; if (g.res || !sy || sy.st !== 'pend') return false; sy.st = 'redo'; rec(g, { seat: d.seat | 0, k: 'redo', w: 'say' }); notify(d.seat | 0, '🔁 老師請你再說一次'); g.cnt++; return true; }
      if (t === 'point') {
        var s = d.seat | 0; if (s < 0 || s >= g.np || g.res) return false;
        g.sc[s]++; rec(g, { seat: s, k: 'pt', r: d.r || '' });
        notify(s, '⭐ 老師給你加 1 分' + (d.r ? '：' + d.r : '') + '！'); g.cnt++; return true;
      }
      return false;
    },
    hostBadge: function (g) { if (g.rv === 'pend') return '🗣️ 念完了，等你確認'; if (Object.keys(g.say || {}).some(function (k) { return g.say[k].st === 'pend'; })) return '🗣️ 說完了，等你確認得分'; if (g.help != null) return '🛑 有同學需要休息，請過去看看'; if (g.paused) return '⏸️ 暫停中'; if (g.phase === 'show' && !g.res && !g.solo && sayDone(g)) return '➡️ 這一題完成，可以按下一題'; return ''; },
    drain: function (g) { var e = g.evq || []; g.evq = []; return e; },
    hostRecord: function (gx, e, who) {
      if (!who.sid || who.bot) return;
      gx.rec = gx.rec || {};
      var r = gx.rec[who.sid] = gx.rec[who.sid] || { sid: who.sid, name: who.name, rounds: 0, wins: 0, read: 0, play: 0, good: 0, act: 0, bad: 0, votes: 0, best: 0, vbad: 0, pts: 0, pr: {}, badT: [], help: 0, s2: 0, s1: 0, rr: 0, rs: 0, sp: 0, ap: 0, av: 0 };
      ['s2', 's1', 'rr', 'rs', 'sp', 'ap', 'av'].forEach(function (k) { r[k] = r[k] || 0; });
      r.name = who.name;
      if (e.k === 'read') r.read++;
      else if (e.k === 'play') { r.play++; if (e.f >= 2) r.good++; if (e.act) r.act++; if (e.bad) { r.bad++; if (r.badT.indexOf(e.t) < 0) r.badT.push(e.t); } r.votes += e.v || 0; }
      else if (e.k === 'best') r.best++;
      else if (e.k === 'vbad') r.vbad++;
      else if (e.k === 'pt') { r.pts++; if (e.r) r.pr[e.r] = (r.pr[e.r] || 0) + 1; }
      else if (e.k === 'help') r.help++;
      else if (e.k === 'say') { r.sp += e.pts; if (e.pts >= 2) r.s2++; else r.s1++; }
      else if (e.k === 'auto') { if (e.w === 'vote') r.av++; else r.ap++; }
      else if (e.k === 'redo') { if (e.w === 'read') r.rr++; else r.rs++; }
      else if (e.k === 'end') { r.rounds++; if (e.win) r.wins++; }
    },
    botTurn: function (g, seat, lv) {
      if (blocked(g) || g.out.indexOf(seat) >= 0) return null;
      var noise = [0, 4, 1.6, .8, .3][lv] || 1;
      if (g.phase === 'read') return seat === g.reader && g.rv !== 'pend' ? { t: 'read', n: g.cnt } : null;
      if (g.phase === 'play') {
        if (seat === g.reader || g.plays[seat]) return null;
        var h = g.hands[seat], best = 0, bv = -99;
        h.forEach(function (cid, i) { var v = fit(cid, g.q, g.emo) + Math.random() * noise; if (v > bv) { bv = v; best = i; } });
        return { t: 'play', i: best };
      }
      if (g.phase === 'vote') {
        if (g.votes[seat]) return null;
        var mv = maxV(g, seat); if (!mv) return null;
        var c = g.opts.map(function (o, i) { return { i: i, v: o.s === seat ? -99 : fit(o.c, g.q, g.emo) + Math.random() * noise }; }).sort(function (a, b) { return b.v - a.v; });
        return { t: 'vote', v: c.slice(0, mv).map(function (x) { return x.i; }) };
      }
      return null;
    },
    hostView: function (g) {
      addCustom(g.cx);
      var q = C(g.q), e = EMO[g.emo], h = '<div class="sn-host">';
      h += '<div class="sn-hq">' + (g.cfg.emo !== 'off' ? '<b>' + e.e + e.n + '</b>' : '') + esc(q ? q.t : '') + '</div>';
      h += '<div class="sn-hs">' + g.sc.map(function (s, i) { return '<span' + (i === g.reader ? ' class="rd"' : '') + '><i style="background:' + SEATC[i] + '"></i>' + (i === g.reader ? '🎤' : '') + s + ' 分</span>'; }).join('') + '</div>';
      return h + '</div>';
    },
    hostStatus: function (g) {
      var p = { read: '念題中', play: '大家在挑回應（' + Object.keys(g.plays).length + '／' + players(g).length + '）', vote: '投票中（' + Object.keys(g.votes).length + '／' + alive(g).length + '）', show: Object.keys(g.say || {}).some(function (k) { return g.say[k].st !== 'ok'; }) ? '等得分的人說給老師聽' : '看結果' }[g.phase];
      if (g.phase === 'read' && g.rv) p = g.rv === 'pend' ? '念完了，等老師確認' : '請他再念一次';
      return { t: '第 ' + (g.n + (g.phase === 'show' ? 0 : 1)) + ' 題・' + p, c: '' };
    }
  };

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, vsel: [], round: -1, key: -1, sent: -1 };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i === tb.seat ? '你' : short(tb, i); }
  function cardEl(cid, extra) {
    var c = C(cid), b = el('button', 'sn-card ' + (c.k === 'm' ? 'act' : 'say') + (extra || '')); b.type = 'button';
    if (c.k === 'm') b.innerHTML = '<span class="sn-ct">🙌 動作</span><span class="sn-ic">' + c.i + '</span><b>' + esc(c.t) + '</b>';
    else b.innerHTML = '<span class="sn-ct">💬 說</span><b>「' + esc(c.t) + '」</b>';
    return b;
  }
  function needText(v) { return need(v.q, v.emo).map(function (k) { return CAT[k]; }).join('、'); }
  function promptEl(tb, v) {
    var q = C(v.q), e = EMO[v.emo], box = el('div', 'sn-prompt');
    var hd = el('div', 'sn-ph'), dot = el('i'); dot.style.background = SEATC[v.reader]; hd.appendChild(dot);
    hd.appendChild(document.createTextNode('🎤 ' + who(tb, v.reader) + ' 先說'));
    box.appendChild(hd);
    if (v.emoOn) { var eb = el('div', 'sn-emo e-' + v.emo); eb.innerHTML = '<span>' + e.e + '</span><b>' + e.n + '</b>'; box.appendChild(eb); }
    box.appendChild(el('p', 'sn-qt', '「' + (q ? q.t : '') + '」'));
    return box;
  }
  function tickT() {
    var x = document.getElementById('sn-timer'); if (!x) return;
    var l = L.frz ? L.left : L.left - (Date.now() - L.recv), sec = Math.max(0, Math.ceil(l / 1000));
    x.textContent = L.frz ? '⏸️ 倒數暫停（剩 ' + sec + ' 秒）' : sec > 0 ? '⏱️ 還剩 ' + sec + ' 秒' : '⏱️ 時間到！';
    x.classList.toggle('hurry', !L.frz && sec <= 5);
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view; addCustom(v.cx);
    if (L.round !== tb.round) { L.round = tb.round; L.sel = -1; L.vsel = []; L.key = -1; }
    if (prev && prev.view && prev.view.phase !== v.phase) {
      L.sel = -1; L.vsel = [];
      if (v.phase === 'show') fx.snd('win');
      else if (v.phase === 'vote') fx.snd('check');
      else if (v.phase === 'read') { fx.snd('start'); if (v.reader === tb.seat) setTimeout(function () { fx.snd('turn'); }, 400); }
      else fx.snd('pop');
    }
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '仔細聽念題的人說什麼 👂');
    L.key = v.cnt;
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0;
    addCustom(v.cx);
    var hold = v.paused || v.help, isReader = v.reader === seat;
    var wrap = el('div', 'sn-table');
    // 狀態列
    var st = el('div', 'sn-status'), need2 = false;
    if (tb.res) st.textContent = '這局結束了！';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (hold) st.textContent = v.help ? '有同學需要休息，請等老師' : '⏸️ 老師暫停了，請看大螢幕';
    else if (v.phase === 'read') { st.textContent = v.rv === 'pend' ? (isReader ? '🗣️ 已經告訴老師你念完了，等老師確認…' : '🗣️ ' + who(tb, v.reader) + ' 念完了，等老師確認…') : v.rv === 'redo' ? (isReader ? '🔁 老師請你再念一次，念完按「我又念完了」' : '🔁 老師請 ' + who(tb, v.reader) + ' 再念一次') : isReader ? '輪到你念題目！' : '請聽 ' + who(tb, v.reader) + ' 念題目 👂'; need2 = isReader && v.rv !== 'pend'; }
    else if (v.phase === 'play') { st.textContent = isReader ? '大家正在想怎麼回應你…' : v.myPlay ? '你已經出牌了，等其他人…' : '選一張最適合回應的牌'; need2 = !isReader && !v.myPlay; }
    else if (v.phase === 'vote') { st.textContent = v.myVotes || !v.maxV ? '你投好了，等其他人…' : '投票！選 ' + v.maxV + ' 個你覺得最適合的回應'; need2 = !v.myVotes && v.maxV > 0; }
    else {
      var my = v.say && v.say[seat];
      if (my && my.st !== 'ok') { st.textContent = my.st === 'pend' ? '🗣️ 已經告訴老師你說完了，等老師確認…' : my.st === 'redo' ? '🔁 老師請你再說一次，說完按「我又說完了」' : '🎉 你的回應票最多！請真的說給 ' + who(tb, v.reader) + ' 聽'; need2 = my.st !== 'pend'; }
      else st.textContent = v.last && v.last.ws.length ? '🎉 票最多：' + v.last.ws.map(function (s) { return who(tb, s); }).join('、') + (Object.keys(v.say || {}).every(function (k) { return v.say[k].st === 'ok'; }) ? '' : '，說給老師聽通過才得分') : '這一題沒有人得分';
    }
    if (need2) st.classList.add('me');
    wrap.appendChild(st);
    // ⏱️ 倒數
    L.recv = Date.now(); L.left = v.left; L.frz = v.frz;
    if (v.left != null && !tb.res && !out) { var tmr = el('div', 'sn-timer'); tmr.id = 'sn-timer'; wrap.appendChild(tmr); tickT(); if (!L.ti) L.ti = setInterval(tickT, 250); }
    // 分數
    var sr = el('div', 'sn-scores');
    for (var s = 0; s < v.np; s++) {
      var ch = el('span', 'sn-chip' + (s === v.reader ? ' rd' : '') + (v.out.indexOf(s) >= 0 ? ' out' : ''));
      ch.setAttribute('data-seat', s);
      var d = el('i'); d.style.background = SEATC[s]; ch.appendChild(d);
      if (s === seat && need2 && !tb.res) ch.classList.add('me');
      ch.appendChild(document.createTextNode((s === v.reader ? '🎤 ' : '') + (s === seat && !v.solo ? '你【' + short(tb, s) + '】' : who(tb, s))));
      ch.appendChild(el('b', '', v.sc[s] + ''));
      var done = v.phase === 'play' ? v.played[s] : v.phase === 'vote' ? v.voted[s] : false;
      if (done && !tb.res) ch.appendChild(el('em', '', '✓'));
      sr.appendChild(ch);
    }
    var goal = el('span', 'sn-goal', (v.end !== 'rounds' ? '先到 ' + v.target + ' 分' : '') + (v.end === 'both' ? '・' : '') + (v.end !== 'score' ? '第 ' + Math.min(v.n + (v.phase === 'show' ? 0 : 1), v.rounds * (v.np - v.out.length)) + '／' + v.rounds * (v.np - v.out.length) + ' 題' : ''));
    sr.appendChild(goal);
    wrap.appendChild(sr);
    wrap.appendChild(promptEl(tb, v));
    // 各階段
    if (v.phase === 'read' && !tb.res) {
      var rb = el('div', 'sn-box');
      if (isReader && !out) {
        rb.appendChild(el('p', 'sn-big', v.emoOn ? '用「' + EMO[v.emo].e + ' ' + EMO[v.emo].n + '」的語氣，大聲念出上面的話' : '大聲把上面的話念出來'));
        if (v.emoOn) rb.appendChild(el('p', 'sn-tip', '提示：' + ({ h: '聲音高高的、笑著說', s: '聲音小小的、慢慢說', a: '皺眉頭、聲音比較重', u: '眼睛睜大、聲音往上揚', w: '聲音有點抖、眉頭皺起來' })[v.emo]));
        if (v.rv === 'redo') { rb.classList.add('redo'); rb.insertBefore(el('p', 'sn-redo', '🔁 老師請你再念一次（題目和語氣都一樣）'), rb.firstChild); }
        if (v.rv === 'pend') rb.appendChild(el('p', 'sn-tip', '🗣️ 已經告訴老師你念完了，等老師確認…'));
        else rb.appendChild(ctx.button('sn-btn go', v.rv === 'redo' ? '🗣️ 我又念完了，請老師確認' : v.solo ? '🗣️ 我念完了' : '🗣️ 我念完了，請老師確認', function () { if (L.sent === v.cnt) return; L.sent = v.cnt; ctx.send('read', { n: v.cnt }); }));
      } else rb.appendChild(el('p', 'sn-tip', v.emoOn ? '聽聽看他的語氣，他現在的心情是「' + EMO[v.emo].n + '」。想一想：你會怎麼回應他？' : '想一想：你會怎麼回應他？'));
      wrap.appendChild(rb);
    }
    if (v.phase === 'play' && !tb.res) {
      var pb = el('div', 'sn-box');
      if (isReader) {
        var n1 = 0, n2 = 0; for (var k = 0; k < v.np; k++) if (k !== v.reader && v.out.indexOf(k) < 0) { n2++; if (v.played[k]) n1++; }
        pb.appendChild(el('p', 'sn-tip', '大家正在挑回應你的牌（' + n1 + '／' + n2 + '），等一下你也要投票喔！'));
      } else if (v.myPlay) {
        pb.appendChild(el('p', 'sn-tip', '你出了這張（其他人看不到是誰出的）：'));
        var mp = cardEl(v.myPlay, ' mini'); mp.disabled = true; pb.appendChild(mp);
      } else pb.appendChild(el('p', 'sn-tip', '從下面的手牌點一張你覺得最適合的「話」或「動作」，再按「出這張」。'));
      wrap.appendChild(pb);
    }
    if ((v.phase === 'vote' || v.phase === 'show') && v.opts) wrap.appendChild(optsEl(tb, v, ctx, out, hold));
    // 手牌
    if (!out && v.hand && !tb.res && (v.phase === 'read' || v.phase === 'play')) {
      var canPlay = v.phase === 'play' && !isReader && !v.myPlay && !hold;
      var me = el('div', 'sn-me' + (canPlay ? ' turn' : '')); me.setAttribute('data-seat', seat);
      me.appendChild(el('div', 'sn-mh', isReader && v.phase !== 'show' ? '我的手牌（這一題你是念題的人，不用出牌）' : '我的手牌'));
      var hand = el('div', 'sn-hand');
      if (L.sel < 0 && v.myPick && canPlay) L.sel = v.hand.indexOf(v.myPick);   // 重新整理後還記得剛剛點的牌
      v.hand.forEach(function (cid, i) {
        var b = cardEl(cid, (L.sel === i && canPlay ? ' sel' : '') + (canPlay ? '' : ' dim'));
        b.addEventListener('click', function () {
          var c = C(cid);
          if (!canPlay) { ctx.toast(c.k === 'm' ? '動作：' + c.t : '「' + c.t + '」'); return; }
          L.sel = L.sel === i ? -1 : i; ctx.snd('tap'); if (!v.solo) ctx.send('pick', { i: L.sel }); ctx.rerender();
        });
        hand.appendChild(b);
      });
      me.appendChild(hand);
      wrap.appendChild(me);
    }
    if (!out && !tb.res) {
      var tools = el('div', 'sn-tools');
      if (v.phase === 'play' && !isReader && !v.myPlay && !hold && L.sel >= 0) {
        tools.appendChild(ctx.button('sn-btn go', '✅ 出這張', function () { var i = L.sel; L.sel = -1; ctx.snd('tap'); ctx.send('play', { i: i }); ctx.rerender(); }));
        if (!v.swapped) tools.appendChild(ctx.button('sn-btn', '🔁 換掉這張（每局 1 次）', function () { if (confirm('把這張牌換成一張新的？（每局只能換 1 次）')) { var i = L.sel; L.sel = -1; ctx.send('swap', { i: i }); } }));
      }
      if (!v.help) tools.appendChild(ctx.button('sn-btn help', '🛑 我需要休息', function () { if (confirm('要請老師過來嗎？這一桌會先暫停。')) ctx.send('help', {}); }));
      var redoMe = (v.phase === 'read' && isReader && v.rv) || (v.phase === 'show' && v.say && v.say[seat] && v.say[seat].st !== 'ok' && v.say[seat].st !== 'todo');
      if (!redoMe) tools.appendChild(ctx.button('sn-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      if (v.hist.length) tools.appendChild(ctx.button('sn-btn', L.hist ? '📜 收起接話紀錄' : '📜 接話紀錄（全部 ' + v.hist.length + ' 題）', function () { L.hist = !L.hist; ctx.rerender(); }));
      if (!redoMe) tools.appendChild(ctx.emoteButton('sn-btn'));
      wrap.appendChild(tools);
    }
    if (v.hist.length && (L.hist || tb.res)) wrap.appendChild(histEl(tb, v));
    if (hold && !tb.res) { var po = el('div', 'sn-ov'), pbx = el('div', 'sn-ovb'); pbx.appendChild(el('h3', '', v.help ? '🛑 暫停一下' : '⏸️ 老師暫停了')); pbx.appendChild(el('p', '', v.help ? '有同學需要休息一下，老師馬上過來。大家先等一等。' : '請看大螢幕，聽老師說明。')); po.appendChild(pbx); wrap.appendChild(po); }
    box.appendChild(wrap);
  };
  /* 全部的接話紀錄（最新的在最上面） */
  function histEl(tb, v) {
    var w = el('div', 'sn-box sn-hist'); w.appendChild(el('b', 'sn-hist-h', '📜 接話紀錄（全部 ' + v.hist.length + ' 題，最新的在最上面）'));
    v.hist.map(function (h, k) { return [h, k]; }).reverse().forEach(function (x) {
      var h = x[0], q = C(h.q), it = el('div', 'sn-hi');
      var hd = el('div', 'sn-hi-q'), d = el('i'); d.style.background = SEATC[h.r]; hd.appendChild(d);
      hd.appendChild(document.createTextNode('第 ' + (x[1] + 1) + ' 題・🎤 ' + who(tb, h.r) + (v.emoOn ? '（' + EMO[h.emo].e + EMO[h.emo].n + '）' : '') + '：「' + (q ? q.t : '') + '」'));
      it.appendChild(hd);
      var ok = h.w.filter(function (o) { return o.s >= 0 && C(o.c) && !C(o.c).bad; });
      if (ok.length) ok.forEach(function (o) { var c = C(o.c); it.appendChild(el('div', 'sn-hi-a', '🏆 ' + who(tb, o.s) + '：' + (c.k === 'm' ? c.i + ' ' + c.t : '「' + c.t + '」'))); });
      else it.appendChild(el('div', 'sn-hi-a none', h.w.some(function (o) { return C(o.c) && C(o.c).bad; }) ? '🤔 票最多的回應不太合適，沒有人得分' : '這一題沒有人得分'));
      w.appendChild(it);
    });
    return w;
  }
  function optsEl(tb, v, ctx, out, hold) {
    var show = v.phase === 'show', w = el('div', 'sn-box sn-vote');
    var canVote = !show && !out && !hold && !v.myVotes && v.maxV > 0 && !tb.res;
    if (!show) w.appendChild(el('p', 'sn-tip', canVote ? '點選 ' + v.maxV + ' 個最適合的回應（不能投自己出的）' : v.myVotes ? '你投好了！等大家投完就會公布。' : '大家正在投票…'));
    else {
      w.appendChild(el('p', 'sn-need', '💡 這時候適合：' + needText(v)));
    }
    var list = el('div', 'sn-opts');
    var idx = v.opts.map(function (o, i) { return i; });
    if (show) idx.sort(function (a, b) { return v.opts[b].v - v.opts[a].v; });
    idx.forEach(function (i) {
      var o = v.opts[i], c = C(o.c), top = show && v.last && v.last.top.indexOf(i) >= 0;
      var picked = L.vsel.indexOf(i) >= 0 || (v.myVotes && v.myVotes.indexOf(i) >= 0);
      var item = el('div', 'sn-opt' + (o.mine ? ' mine' : '') + (picked ? ' pick' : '') + (top ? ' top' : '') + (show && c.bad ? ' bad' : '') + (canVote && !o.mine ? ' can' : ''));
      var lt = el('span', 'sn-let', LET.charAt(i)); item.appendChild(lt);
      var cd = cardEl(o.c, ' in'); cd.tabIndex = -1; item.appendChild(cd);
      var info = el('div', 'sn-oi');
      if (o.mine && !show) info.appendChild(el('em', 'mine', '你出的'));
      if (picked && !show) info.appendChild(el('em', 'pk', '✓ 投這個'));
      if (show) {
        info.appendChild(el('b', 'sn-votes', '🗳️ ' + o.v + ' 票'));
        info.appendChild(el('span', 'sn-owner', o.s < 0 ? '🎲 系統加的神秘回應' : who(tb, o.s) + ' 出的'));
        if (top && !c.bad && o.s >= 0) info.appendChild(el('em', 'win', '🏆 票最多'));
        if (c.bad) { info.appendChild(el('em', 'bad', '🤔 不太合適（' + c.why + '）')); }
        else if (!c.custom) { var f = fit(o.c, v.q, v.emo); info.appendChild(el('em', 'cat f' + f, fitLabel(f) + '（' + c.cats.map(function (k) { return CAT[k]; }).join('・') + '）')); }
      }
      item.appendChild(info);
      if (show && c.bad) { var bd = el('div', 'sn-badwhy'); bd.innerHTML = '<b>為什麼不太合適？</b>' + esc(c.bwhy) + '<br><b>可以改成：</b>「' + esc(c.better) + '」'; item.appendChild(bd); }
      if (canVote && !o.mine) item.addEventListener('click', function () {
        var k = L.vsel.indexOf(i);
        if (k >= 0) L.vsel.splice(k, 1); else { if (L.vsel.length >= v.maxV) L.vsel.shift(); L.vsel.push(i); }
        ctx.snd('tap'); ctx.rerender();
      });
      if (canVote && o.mine) item.addEventListener('click', function () { ctx.toast('這是你自己出的，不能投給自己喔！'); });
      list.appendChild(item);
    });
    w.appendChild(list);
    if (canVote) {
      var vb = ctx.button('sn-btn go', '🗳️ 送出投票（' + L.vsel.length + '／' + v.maxV + '）', function () {
        if (L.vsel.length !== v.maxV) { ctx.toast('要選 ' + v.maxV + ' 個喔！'); return; }
        var vs = L.vsel.slice(); L.vsel = []; ctx.snd('tap'); ctx.send('vote', { v: vs }); ctx.rerender();
      });
      if (L.vsel.length !== v.maxV) vb.classList.add('wait');
      w.appendChild(vb);
    }
    if (show && v.last) {
      var win = v.last.top.filter(function (i) { var o = v.opts[i]; return o.s >= 0 && !C(o.c).bad; });
      if (win.length) win.forEach(function (i) {
        var o = v.opts[i], c = C(o.c), x = (v.say || {})[o.s] || { st: 'ok', pts: 2 }, mine = o.s === tb.seat, act = c.k === 'm';
        var box = el('div', 'sn-say' + (x.st === 'redo' ? ' redo' : '') + (x.st === 'ok' ? ' ok' : ''));
        box.appendChild(el('p', '', (x.st === 'redo' ? '🔁 老師請 ' + who(tb, o.s) + ' 再' + (act ? '做' : '說') + '一次：' : '🗣️ 請 ' + who(tb, o.s) + ' 看著 ' + who(tb, v.reader) + '，') + (act ? '真的做出這個動作：' + c.i + ' ' + c.t : '真心地說一次：「' + c.t + '」')));
        if (x.st === 'ok') box.appendChild(el('em', 'ok', x.pts >= 2 ? '✅ ' + (v.solo || !v.hum[o.s] ? '' : '老師') + '通過，+2 分' : '🌗 老師半分通過，+1 分'));
        else if (x.st === 'pend') box.appendChild(el('em', '', '⏳ ' + (mine ? '等老師確認…' : '說完了，等老師確認…')));
        else if (mine && !out) box.appendChild(ctx.button('sn-btn go', (x.st === 'redo' ? (act ? '🙌 我又做完了' : '🗣️ 我又說完了') : (act ? '🙌 我做完了' : '🗣️ 我說完了')) + (v.solo ? '' : '，請老師確認'), function () { if (L.sent === v.cnt) return; L.sent = v.cnt; ctx.send('said', {}); }));
        else box.appendChild(el('em', '', '👂 請聽他' + (act ? '做' : '說')));
        w.appendChild(box);
      });
      else if (v.last.bad) w.appendChild(el('p', 'sn-say', '🤔 票最多的回應不太合適，所以這一題沒有人得分。大家想一想，可以怎麼說比較好？'));
      if (!tb.res) {
        if (v.canNext) w.appendChild(ctx.button('sn-btn go', '➡️ 下一題', function () { if (L.sent === v.cnt) return; L.sent = v.cnt; ctx.send('next', { n: v.cnt }); }));
        else if (!Object.keys(v.say || {}).every(function (k) { return v.say[k].st === 'ok' || v.out.indexOf(+k) >= 0; })) w.appendChild(el('p', 'sn-tip', v.solo ? '說完之後按「我說完了」，就可以到下一題。' : '等老師確認得分的人說的話，才會到下一題…'));
        else w.appendChild(el('p', 'sn-tip', v.solo ? '按「下一題」繼續' : '等老師按「下一題」…'));
      }
    }
    return w;
  }

  /* ---------- 老師端 ---------- */
  var H = { open: false, reason: PT_R[0] };
  function hbtn(api, cls, txt, fn) { return api.btn('btn small' + (cls ? ' ' + cls : ''), txt, fn); }
  function optRow(api, label, key, list, def, note) {
    var cfg = api.cfg(), row = api.el('div', 'sn-hrow'); row.appendChild(api.el('span', 'sn-hl', label));
    list.forEach(function (o) {
      var b = hbtn(api, (cfg[key] == null ? def : cfg[key]) === o[0] ? 'on' : '', o[1], function () { cfg[key] = o[0]; api.save(); [].forEach.call(row.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); });
      row.appendChild(b);
    });
    if (note) row.appendChild(api.el('small', 'empty', note));
    return row;
  }
  mod.hostPanel = function (api) {
    // 多人上課不放電腦玩家（只有學生自己單人練習才有電腦）：只在這款遊戲的老師頁把那個選項關掉、藏起來
    // ⏱️ 倒數計時：老師端每半秒檢查一次，時間到就幫還沒出牌／投票的學生出
    if (!api.solo && !H.tick) H.tick = setInterval(function () {
      api.tables().forEach(function (T) {
        var g = T.g; if (g && g.dl && !g.dlLeft && !blocked(g) && Date.now() >= g.dl) { if (api.act(T, { t: 'tmo', n: g.cnt })) api.render(); }
      });
      Array.prototype.forEach.call(document.querySelectorAll('.sn-htm'), function (x) { var T = api.tables().filter(function (t) { return t.id === x.dataset.t; })[0]; var tx = T ? tmText(T.g) : ''; x.textContent = tx; x.style.display = tx ? '' : 'none'; });
    }, 500);
    var hb = document.getElementById('h-bot'); if (hb) { hb.checked = false; if (api.state().allowBot) { api.state().allowBot = false; api.save(); } if (hb.parentNode) hb.parentNode.style.display = 'none'; }
    var p = api.el('div', 'panel sn-gp');
    var hd = api.el('div', 'sn-gp-hd'); hd.appendChild(api.el('h3', '', '🗣️ 你說我接・老師控制台'));
    hd.appendChild(hbtn(api, '', '⚙️ 上課設定', function () { H.open = !H.open; set.classList.toggle('hidden', !H.open); }));
    p.appendChild(hd);
    var set = api.el('div', 'sn-set' + (H.open ? '' : ' hidden'));
    set.appendChild(api.el('p', 'empty', '設定在「下一局」或新開的桌才會生效。'));
    set.appendChild(optRow(api, '📚 本節主題：', 'topic', TOPICS, 'all', '只出這個主題的題目'));
    set.appendChild(optRow(api, '🎭 情緒語氣：', 'emo', [['on', '開（念題要用指定的語氣）'], ['off', '關']], 'on'));
    set.appendChild(optRow(api, '🤔 不太合適的牌：', 'bad', [['on', '放進牌堆（結束時會標出來）'], ['off', '不放']], 'on'));
    var r2 = api.el('div', 'sn-hrow'); r2.appendChild(hbtn(api, '', '✏️ 自訂題目和回應', function () { customEditor(api); })); set.appendChild(r2);
    p.appendChild(set);
    var live = api.el('div', 'sn-hrow');
    live.appendChild(hbtn(api, '', '⏸️ 全班暫停', function () { api.actAll({ t: 'pause' }); api.render(); }));
    live.appendChild(hbtn(api, '', '▶️ 全班繼續', function () { api.actAll({ t: 'resume' }); api.render(); }));
    live.appendChild(api.el('small', 'empty', '點某一桌可以：換一題、投影這一題全班討論、給學生加分'));
    p.appendChild(live);
    var dyn = api.el('div', 'sn-dyn'); dyn.id = 'sn-dyn'; p.appendChild(dyn);
    var after = api.el('div', 'sn-hrow'); after.appendChild(api.el('span', 'sn-hl', '📋 課後：'));
    after.appendChild(hbtn(api, '', '📥 下載課後紀錄表（Excel）', function () { report(api); }));
    after.appendChild(hbtn(api, '', '🗑️ 清除紀錄', function () { if (confirm('確定要清除這個房間所有學生的課後紀錄嗎？')) { api.gx().rec = {}; api.save(); } }));
    p.appendChild(after);
    return p;
  };
  /* ---------- 老師審查：念題、得分的人說給老師聽 ---------- */
  function pendBoxes(T, api, all) {   // all：連「還沒說完」的也列出來（桌子畫面用）
    var g = T.g, out = []; if (!g || g.res) return out;
    var q = C(g.q), e = EMO[g.emo];
    if (g.phase === 'read' && (g.rv === 'pend' || (all && g.hum[g.reader]))) {
      var a = api.el('div', 'sn-alert rev' + (g.rv === 'pend' ? '' : ' wait'));
      a.appendChild(api.el('b', '', g.rv === 'pend' ? '🗣️ 第 ' + T.no + ' 桌・' + api.name(T, g.reader) + ' 念完了，有沒有用對語氣、念清楚？' : g.rv === 'redo' ? '🔁 第 ' + T.no + ' 桌・已請 ' + api.name(T, g.reader) + ' 再念一次（聽完也可以直接通過）' : '🎤 第 ' + T.no + ' 桌・' + api.name(T, g.reader) + ' 正在念題目（念完會通知你）'));
      a.appendChild(api.el('span', 'sn-q', (g.cfg.emo !== 'off' ? '用「' + e.e + ' ' + e.n + '」的語氣：' : '') + '「' + (q ? q.t : '') + '」'));
      a.appendChild(hbtn(api, 'on sn-pass', '✅ 通過', function () { api.act(T, { t: 'rdok' }); api.render(); }));
      if (g.rv === 'pend') a.appendChild(hbtn(api, '', '🔁 請他再念一次', function () { api.act(T, { t: 'rdredo' }); api.render(); }));
      out.push(a);
    }
    if (g.phase === 'show') Object.keys(g.say || {}).forEach(function (k) {
      var x = g.say[k], s0 = +k, c = C(x.c); if (x.st === 'ok' || g.out.indexOf(s0) >= 0 || (!all && x.st !== 'pend')) return;
      var act = c.k === 'm', b = api.el('div', 'sn-alert rev' + (x.st === 'pend' ? '' : ' wait'));
      b.appendChild(api.el('b', '', x.st === 'pend' ? '🗣️ 第 ' + T.no + ' 桌・' + api.name(T, s0) + (act ? ' 做完了' : ' 說完了') + '，有沒有看著對方、真心地' + (act ? '做' : '說') + '？' : x.st === 'redo' ? '🔁 第 ' + T.no + ' 桌・已請 ' + api.name(T, s0) + ' 再' + (act ? '做' : '說') + '一次（聽完也可以直接給分）' : '🏆 第 ' + T.no + ' 桌・' + api.name(T, s0) + ' 票最多，正要' + (act ? '做給' : '說給') + api.name(T, g.reader).replace(/（.*）/, '') + (act ? '看' : '聽')));
      b.appendChild(api.el('span', 'sn-q', act ? '🙌 ' + c.i + ' ' + c.t : '💬「' + c.t + '」'));
      b.appendChild(hbtn(api, 'on sn-pass', '✅ 通過 +2 分', function () { api.act(T, { t: 'sayok', seat: s0 }); api.render(); }));
      b.appendChild(hbtn(api, '', '🌗 半分通過 +1 分', function () { api.act(T, { t: 'sayok', seat: s0, half: true }); api.render(); }));
      if (x.st === 'pend') b.appendChild(hbtn(api, '', '🔁 請他再' + (act ? '做' : '說') + '一次', function () { api.act(T, { t: 'sayredo', seat: s0 }); api.render(); }));
      out.push(b);
    });
    if (g.phase === 'show' && !g.solo && sayDone(g)) {   // 這一題完成：老師按下一題
      var nx = api.el('div', 'sn-alert rev nx');
      nx.appendChild(api.el('b', '', '✅ 第 ' + T.no + ' 桌・這一題完成了，可以換下一位念題'));
      nx.appendChild(hbtn(api, 'on sn-pass', '➡️ 下一題', function () { api.act(T, { t: 'next' }); api.render(); }));
      out.push(nx);
    }
    return out;
  }
  function tmText(g) { if (!g || !g.dl || (g.phase !== 'play' && g.phase !== 'vote')) return ''; var l = Math.ceil((g.dlLeft || Math.max(0, g.dl - Date.now())) / 1000); return '⏱️ ' + (g.phase === 'play' ? '選牌' : '投票') + '還剩 ' + l + ' 秒' + (g.dlLeft ? '（暫停中）' : ''); }
  function noteList(api) {
    var out = [];
    api.tables().forEach(function (T) {
      var g = T.g; if (!g) return;
      pendBoxes(T, api, false).forEach(function (x) { out.push(x); });
      if (g.help != null) { var a = api.el('div', 'sn-alert help'); a.appendChild(api.el('b', '', '🛑 第 ' + T.no + ' 桌：' + api.name(T, g.help) + ' 需要休息')); a.appendChild(hbtn(api, 'on', '處理好了，繼續', function () { api.act(T, { t: 'resume' }); api.render(); })); out.push(a); }
    });
    return out;
  }
  /* 🔔 通知鈴：固定在畫面左邊或右邊，可以拖曳上下移動（記住位置） */
  function bell(api) {
    var b = document.getElementById('sn-bell');
    if (!b) {
      b = api.el('div', 'sn-bell'); b.id = 'sn-bell';
      var btn0 = api.el('button', 'sn-bell-btn'); btn0.type = 'button'; btn0.title = '按住可以拖到左邊或右邊、上下移動';
      var dr = api.el('div', 'sn-drawer'); b.appendChild(btn0); b.appendChild(dr); document.body.appendChild(b);
      var pos = { side: 'R', top: 0.4 }; try { var sv = JSON.parse(localStorage.getItem('sn-bell-pos') || 'null'); if (sv && (sv.side === 'L' || sv.side === 'R')) pos = sv; } catch (e) {}
      var place = function () { b.classList.toggle('left', pos.side === 'L'); var tp = Math.max(8, Math.min(window.innerHeight - 140, pos.top * window.innerHeight)); b.style.top = tp + 'px'; dr.style.maxHeight = Math.max(200, window.innerHeight - tp - 12) + 'px'; };
      place(); window.addEventListener('resize', place);
      var drag = null, moved = false;
      btn0.addEventListener('pointerdown', function (ev) { drag = { x: ev.clientX, y: ev.clientY, t: b.getBoundingClientRect().top }; moved = false; try { btn0.setPointerCapture(ev.pointerId); } catch (e) {} });
      btn0.addEventListener('pointermove', function (ev) {
        if (!drag) return;
        if (!moved && Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) < 8) return;
        moved = true; b.classList.add('drag');
        pos.top = (drag.t + ev.clientY - drag.y) / window.innerHeight; var sd = ev.clientX < window.innerWidth / 2 ? 'L' : 'R'; if (sd !== pos.side) b._sig = null; pos.side = sd; place();
      });
      var end = function () { if (!drag) return; drag = null; b.classList.remove('drag'); if (moved) { try { localStorage.setItem('sn-bell-pos', JSON.stringify(pos)); } catch (e) {} bell(api); } };
      btn0.addEventListener('pointerup', end); btn0.addEventListener('pointercancel', end);
      btn0.addEventListener('click', function () { if (moved) { moved = false; return; } H.bell = !H.bell; bell(api); });
    }
    var items = noteList(api), bt = b.firstChild, drw = b.lastChild;
    bt.innerHTML = '🔔<span>' + (items.length ? items.length + ' 件待處理' : '通知') + '</span>';
    b.classList.toggle('has', items.length > 0); b.classList.toggle('open', !!H.bell);
    var sig = items.map(function (x) { return x.textContent; }).join('|');
    if (b._sig === sig && drw.firstChild) return; b._sig = sig;   // 內容沒變就不重畫，才不會吃掉點擊
    drw.innerHTML = '';
    var hd = api.el('div', 'sn-drawer-hd'); hd.appendChild(api.el('b', '', '🔔 待處理（' + items.length + '）')); hd.appendChild(hbtn(api, '', b.classList.contains('left') ? '◀ 收起' : '收起 ▶', function () { H.bell = false; bell(api); })); drw.appendChild(hd);
    if (!items.length) drw.appendChild(api.el('p', 'empty', '目前沒有要處理的事。'));
    items.forEach(function (x) { drw.appendChild(x); });
  }
  function playerStat(T, api) {
    var g = T.g, w = api.el('div', 'sn-pstat'); w.appendChild(api.el('b', '', '👥 玩家狀況'));
    T.seats.forEach(function (id, i) {
      var mine = g.hist.filter(function (h) { return h.opts.some(function (o) { return o.s === i; }); }), bad = 0, votes = 0, best = 0;
      var row = api.el('div', 'sn-prow'), d = api.el('i'); d.style.background = SEATC[i]; row.appendChild(d);
      var lines = mine.map(function (h) { var o = h.opts.filter(function (x) { return x.s === i; })[0], c = C(o.c), mx = Math.max.apply(null, h.opts.map(function (x) { return x.v; })); votes += o.v; if (c.bad) bad++; var top = mx > 0 && o.v === mx && !c.bad; if (top) best++; return (top ? '🏆' : c.bad ? '🤔' : '・') + (c.k === 'm' ? c.i + c.t : '「' + c.t + '」') + ' ' + o.v + '票'; });
      row.appendChild(api.el('b', '', api.name(T, i) + (i === g.reader && !g.res ? ' 🎤' : '') + '：' + g.sc[i] + ' 分'));
      row.appendChild(api.el('small', '', '得票 ' + votes + '・最佳 ' + best + ' 次・不太合適 ' + bad + ' 次・手上不太合適的牌 ' + nBad(g.hands[i] || []) + ' 張'));
      if (lines.length) row.appendChild(api.el('div', 'sn-plist', lines.slice().reverse().join('　')));
      w.appendChild(row);
    });
    return w;
  }
  mod.hostPanelUpdate = function (api) {
    if (!api.solo) bell(api);
    var dyn = document.getElementById('sn-dyn'); if (!dyn) return;
    dyn.innerHTML = '';
    var ts = api.tables();
    ts.forEach(function (T) {
      var g = T.g; if (!g) return;
      if (g.help != null) { var a = api.el('div', 'sn-alert'); a.appendChild(api.el('b', '', '🛑 第 ' + T.no + ' 桌：' + api.name(T, g.help) + ' 需要休息')); a.appendChild(hbtn(api, 'on', '處理好了，繼續', function () { api.act(T, { t: 'resume' }); })); dyn.appendChild(a); }
    });
    var pz = ts.filter(function (T) { return T.g && T.g.paused; }).length;
    if (pz) dyn.appendChild(api.el('div', 'sn-alert', '⏸️ 有 ' + pz + ' 桌暫停中，按「▶️ 全班繼續」恢復'));
  };
  mod.hostTable = function (T, api) {
    var g = T.g, w = api.el('div', 'sn-ht');
    addCustom(g.cx);
    var pbs = pendBoxes(T, api, true);
    if (pbs.length) { var pw = api.el('div', 'sn-pendw'); pw.appendChild(api.el('b', '', '🗣️ 待審查')); pbs.forEach(function (x) { pw.appendChild(x); }); w.appendChild(pw); }
    if (!g.res) {
      var r1 = api.el('div', 'sn-hrow');
      if (g.dl && (g.phase === 'play' || g.phase === 'vote')) { var tm = api.el('b', 'sn-htm', tmText(g)); tm.dataset.t = T.id; r1.appendChild(tm); r1.appendChild(hbtn(api, '', '⏱️ 多給 15 秒', function () { api.act(T, { t: 'more' }); api.render(); })); }
      r1.appendChild(hbtn(api, '', g.paused ? '▶️ 繼續' : '⏸️ 暫停', function () { api.act(T, { t: g.paused ? 'resume' : 'pause' }); api.render(); }));
      if (g.phase !== 'show') r1.appendChild(hbtn(api, '', '🔄 換一題', function () { if (confirm('換一個題目？已經出的牌會還給學生。')) { api.act(T, { t: 'skip' }); api.render(); } }));
      r1.appendChild(hbtn(api, 'on', '📽️ 投影這一題（全班討論）', function () { api.actAll({ t: 'pause' }); teachProj(api, g.q, g.emo, g.phase === 'vote' || g.phase === 'show' ? g.opts.map(function (o) { return o.c; }) : null); api.render(); }));
      w.appendChild(r1);
    }
    var sr = api.el('div', 'sn-pts'); sr.appendChild(api.el('b', '', '⭐ 給學生加 1 分（先點原因，再點學生）'));
    var rr = api.el('div', 'sn-hrow');
    PT_R.forEach(function (r) { var b = hbtn(api, H.reason === r ? 'on' : '', r, function () { H.reason = r; [].forEach.call(rr.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); }); rr.appendChild(b); });
    sr.appendChild(rr);
    var pr = api.el('div', 'sn-hrow');
    T.seats.forEach(function (id, i) { if (api.isBot(T, i)) return; pr.appendChild(hbtn(api, '', '⭐ ' + api.name(T, i) + '（' + g.sc[i] + ' 分）', function () { if (!api.act(T, { t: 'point', seat: i, r: H.reason })) alert('這局已經結束，不能再加分'); api.render(); })); });
    sr.appendChild(pr); w.appendChild(sr);
    if (g.hist.length) {
      var tm = api.el('div', 'sn-teach'); tm.appendChild(api.el('b', '', '📽️ 這一桌全部 ' + g.hist.length + ' 題（最新的在最上面）：點一題投影到大螢幕，全班一起討論'));
      g.hist.map(function (h, k) { h.no = k + 1; return h; }).slice().reverse().forEach(function (h) { var q = C(h.q); if (!q) return; var mx = Math.max.apply(null, h.opts.map(function (o) { return o.v; })), win = h.opts.filter(function (o) { return mx > 0 && o.v === mx && o.s >= 0 && !C(o.c).bad; }); tm.appendChild(api.btn('sn-tline', '第 ' + h.no + ' 題・' + api.name(T, h.r).replace(/（.*）/, '') + ' 念 ' + EMO[h.emo].e + ' ' + q.t + '　→ ' + (win.length ? win.map(function (o) { return '🏆' + api.name(T, o.s).replace(/（.*）/, '') + '「' + C(o.c).t + '」'; }).join('、') : '沒有人得分'), function () { api.actAll({ t: 'pause' }); teachProj(api, h.q, h.emo, h.opts.map(function (o) { return o.c; })); })); });
      w.appendChild(tm);
    }
    w.appendChild(playerStat(T, api));
    return w;
  };
  function teachProj(api, qid, emo, opts) {
    var q = C(qid), e = EMO[emo], d = api.el('div', 'sn-proj');
    d.appendChild(api.el('div', 'sn-pj-k', '🗣️ 你說我接・全班一起想'));
    d.appendChild(api.el('div', 'sn-pj-emo', e.e + ' 用「' + e.n + '」的語氣說'));
    d.appendChild(api.el('p', 'sn-pj-line', '「' + (q ? q.t : '') + '」'));
    var qs = ['說這句話的人，心情怎麼樣？你怎麼知道的？', '如果你是聽的人，你會怎麼回應？', opts ? '下面哪一個回應最適合？為什麼？有沒有不太合適的？' : '用說的，或用動作回應，都可以試試看。'];
    var ol = api.el('ol', 'sn-pj-q'); qs.forEach(function (x) { ol.appendChild(api.el('li', '', x)); }); d.appendChild(ol);
    if (opts) {
      var ls = api.el('div', 'sn-pj-opts');
      opts.forEach(function (cid, i) { var c = C(cid); if (!c) return; var it = api.el('div', 'sn-pj-o'); it.appendChild(api.el('b', '', LET.charAt(i))); it.appendChild(api.el('span', '', (c.k === 'm' ? c.i + ' ' : '') + c.t)); it.appendChild(api.el('em', 'sn-pj-a hidden ' + (c.bad ? 'bad' : 'f' + fit(cid, qid, emo)), c.bad ? '🤔 不太合適：' + c.bwhy + ' 可以改成「' + c.better + '」' : c.custom ? '' : fitLabel(fit(cid, qid, emo)) + '（' + c.cats.map(function (k) { return CAT[k]; }).join('・') + '）')); ls.appendChild(it); });
      d.appendChild(ls);
    }
    var ans = api.el('p', 'sn-pj-sub hidden', '💡 這時候適合：' + need(qid, emo).map(function (k) { return CAT[k]; }).join('、') + ' 的回應');
    d.appendChild(api.btn('btn', '揭曉參考答案', function () { ans.classList.remove('hidden'); [].forEach.call(d.querySelectorAll('.sn-pj-a'), function (x) { x.classList.remove('hidden'); }); this.remove(); }));
    d.appendChild(ans);
    d.appendChild(api.el('p', 'sn-pj-sub', '各桌已經暫停，討論完請按「▶️ 全班繼續」'));
    api.project(d, { cast: true });
  }
  function customEditor(api) {
    var cfg = api.cfg(), cx = cfg.cx || { q: [], r: [] }, b = api.el('div', 'sn-edit');
    b.appendChild(api.el('p', 'empty', '一行一句。可以放班上最近真的發生的事。請不要寫真實同學的名字。自訂的題目，情緒語氣會隨機抽。'));
    function area(label, val, ph) { b.appendChild(api.el('h4', '', label)); var t = api.el('textarea'); t.rows = 5; t.value = val; t.placeholder = ph; b.appendChild(t); return t; }
    var tq = area('🎤 題目（別人對你說的話）', (cx.q || []).join('\n'), '例如：我今天被選為接力賽的最後一棒。');
    var tr = area('💬 回應（可以怎麼接話）', (cx.r || []).join('\n'), '例如：你一定可以跑得很快！');
    function lines(t) { return t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 40); }
    var ov = api.el('div', 'overlay'), bx = api.el('div', 'panel sn-modal'); ov.appendChild(bx);
    var hd = api.el('div', 'row'); hd.style.justifyContent = 'space-between'; hd.appendChild(api.el('h2', '', '✏️ 自訂題目和回應')); hd.lastChild.style.margin = '0';
    hd.appendChild(api.btn('btn small', '✕ 關閉', function () { ov.remove(); })); bx.appendChild(hd);
    bx.appendChild(b);
    var r = api.el('div', 'row c'); r.appendChild(api.btn('btn btn-sun', '💾 儲存', function () { cfg.cx = { q: lines(tq), r: lines(tr) }; api.save(); ov.remove(); })); bx.appendChild(r);
    document.body.appendChild(ov);
  }
  function csvCell(x) { x = String(x == null ? '' : x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  function report(api) {
    var rec = api.gx().rec || {}, ks = Object.keys(rec).sort();
    if (!ks.length) { alert('還沒有紀錄。學生玩過之後才會有資料。'); return; }
    var head = ['學號', '名字', '玩了幾局', '贏了幾局', '念題次數', '出牌次數', '出了合適的回應', '用動作回應', '出了不太合適的牌', '不太合適的句子', '投給不太合適的牌', '總共得到幾票', '被選為最佳回應', '說給老師聽通過(+2)', '半分通過(+1)', '念題被請重念', '說話被請重說', '選牌時間到系統代出', '投票時間到系統代投', '老師另外加分', '加分原因', '我需要休息'];
    var rows = [head].concat(ks.map(function (k) {
      var r = rec[k];
      return [r.sid, r.name, r.rounds, r.wins, r.read, r.play, r.good, r.act, r.bad, r.badT.join('、'), r.vbad, r.votes, r.best, r.s2 || 0, r.s1 || 0, r.rr || 0, r.rs || 0, r.ap || 0, r.av || 0, r.pts, Object.keys(r.pr).map(function (x) { return x + '×' + r.pr[x]; }).join('、'), r.help];
    }));
    var d = new Date(), name = '你說我接_課後紀錄_' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + '.csv';
    api.download(name, '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'));
  }

  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>每個人手上有 <b>5 張回應牌</b>：💬「說」的牌是一句話，🙌「動作」牌是一個動作。</li><li>每一題有一位<b>🎤 念題的人</b>（大家輪流當）。系統抽一張題目卡，還有一個<b>情緒</b>（😄開心、😢難過、😠生氣、😲驚訝、😟擔心）。</li><li>念題的人要<b>用那個情緒的語氣</b>，大聲把題目念出來，再按「我念完了，請老師確認」。<b>老師聽過、按通過</b>才會開始出牌；老師覺得還要再練，會請你再念一次（題目和情緒不會換）。念題不加分。</li><li>其他人從手牌挑一張<b>最適合回應他</b>的牌，按「出這張」。大家看不到是誰出的。</li><li>所有回應翻開來（只有 A、B、C…，沒有名字）。每個人投票給最適合的回應（念題的人也要投），<b>不能投給自己出的</b>。可以選的回應有 4 個以上時投 <b>2 票</b>，比較少時投 <b>1 票</b>。</li><li>票最多的回應的主人要<b>真的</b>看著念題的人，把那句話說一次，或做出那個動作，再按「我說完了，請老師確認」。老師按 <b>✅ 通過得 2 分</b>、<b>🌗 半分通過得 1 分</b>，或請你再說一次。</li><li>老師確認完所有得分的人之後，老師按「下一題」，換下一位念題（自己單人練習時是你自己按）。</li></ol><p>手牌一直維持 <b>5 張</b>。</p><p><b>⏱️ 倒數計時</b>：選牌和投票都有時間限制（老師設定，預設 30 秒）。時間到時，選牌：你已經點了某張牌，就出那張，不能再改；還沒點，就出<b>最左邊</b>那張。投票：還沒投就幫你投 <b>A</b>（A 是你自己出的就往後投；要投 2 票就投 A、B）。</p>' },
      { h: '怎麼贏', html: '<p>先拿到老師設定的分數（預設 10 分，也可以選 6、14、20 分），或大家都念完規定的題數時，<b>分數最高的人贏</b>。</p><table class="g-tbl"><tr><th>結果</th><th>積分榜</th></tr><tr><td>🏆 分數最高</td><td>3 分</td></tr><tr><td>🤝 大家一樣高</td><td>1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>回應不到 4 個的時候（3～4 個人玩），系統會加入<b>🎲 神秘回應</b>湊到 4 個，讓大家有得選，也比較猜不出是誰出的。神秘回應得票最多時，沒有人得分。一個人和電腦練習時，說完按鈕就直接得 2 分；和電腦玩的不列入總分。</p>' },
      { h: '不太合適的牌', html: '<p>牌堆裡有一些<b>不太合適</b>的回應，例如「那又怎樣？」「我比你更厲害。」。它們在手牌裡看起來和一般的牌一樣，要靠你自己判斷。</p><p>投票結果出來時，系統會標出 <b>🤔 不太合適</b>，還會說<b>為什麼不合適、可以改成怎麼說</b>。</p><p>你的手牌裡<b>最多只會有 2 張</b>不太合適的牌；如果連續 2 題都沒有，下一次補牌會補到 1 張，讓你練習分辨。</p><p><b>不太合適的牌就算票最多也不能得分</b>，所以投票時要想清楚：如果你是念題的人，你最想聽到哪一句？</p>' },
      { h: '小提醒', html: '<ul><li>先看情緒：開心的事就替他開心；難過的事就安慰、關心；生氣的時候先陪他冷靜；擔心的時候幫他加油。</li><li>不知道說什麼時，可以先問：「然後呢？」「你現在覺得怎麼樣？」</li><li>每局可以把一張手牌換掉 1 次。</li><li>不舒服的時候，按「🛑 我需要休息」，老師會過來。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「社會技巧/溝通訓練」→「你說我接」。全班同一桌（3～6 人），開桌後老師畫面會滿版顯示這一桌；多人連線不會有電腦玩家，電腦只出現在學生自己的單人練習。</li><li><b>🔔 待處理鈴鐺</b>：學生按「我念完了」或「我說完了」時，鈴鐺會閃爍並顯示數字，點開就能直接按通過；鈴鐺可以拖到畫面任何位置。桌子畫面最上面也會列出「🗣️ 待審查」。</li><li><b>念題審查</b>：按「通過」才開始出牌；按「請他再念一次」，題目和情緒會鎖住不換。念題不加分。</li><li><b>說話審查</b>：得票最多的學生說完後，按「✅ 通過 +2 分」「🌗 半分通過 +1 分」或「🔁 請他再說一次」。全部確認完，鈴鐺會出現「➡️ 下一題」，由<b>老師按</b>才換下一位念題，可以先討論再往下。</li><li><b>⏱️ 選牌／投票倒數</b>：QR code 上方設定（20／30／45／60 秒或不倒數，預設都是 30 秒）。時間到還沒出牌：學生已經點了某張就出那張，沒點就出最左邊那張；還沒投票就幫他投 A（A 是自己出的就往後投）。桌子畫面會顯示剩幾秒，可以按「⏱️ 多給 15 秒」；暫停時倒數也會停。課後紀錄表會記下系統代出、代投的次數。</li><li>QR code 上方選<b>什麼時候結束</b>：「分數或回合，先到就結束」（兩個條件都有，先達成的那個就結束）、「只看分數」、「只看回合數」；再選<b>目標分數</b>（預設 10 分，可選 6／14／20）和<b>每人念幾題</b>。</li><li>上方的「🗣️ 老師控制台」→「⚙️ 上課設定」可以選本節主題、開關情緒語氣、開關不太合適的牌、自訂題目和回應。設定在下一局或新開的桌生效。</li><li>點某一桌可以打開那一桌：暫停、換一題、投影這一題全班討論、給學生加分。</li></ol>' },
      { h: '老師控制台', html: '<ul><li><b>📚 本節主題</b>：安慰與關心（難過）、替別人開心（開心）、鼓勵打氣（擔心）、面對生氣（生氣）、道謝道歉與邀請。選了之後只出這個主題的題目，情緒也會固定。</li><li><b>🎭 情緒語氣</b>：開的時候，念題的人要照指定的情緒念（畫面會提示語氣怎麼做）；同一句話換不同情緒，適合的回應也會不一樣。</li><li><b>🤔 不太合適的牌</b>：牌堆裡有 16 張冷漠、只講自己、轉移話題、嘲笑、否定感受等回應。開票後系統會標出來並說明原因和改法，這種牌票再多也不得分。</li><li><b>✏️ 自訂題目和回應</b>：可以加班上真的發生的事。</li><li><b>📽️ 投影這一題</b>：投影到大螢幕並自動暫停全班，附三個討論問題；投票後投影會列出所有回應，按「揭曉參考答案」顯示適合的種類和不太合適的原因。之前的題目也可以再投影。</li><li><b>⭐ 給學生加 1 分</b>：先點原因（回應很貼心、語氣很真誠、眼睛有看著對方…），再點學生。原因會記在課後紀錄表。</li><li><b>👥 玩家狀況</b>：桌子畫面最下面列出每位學生的分數、得票、被選為最佳、出過哪些回應、手上有幾張不太合適的牌。學生畫面只顯示暱稱，看不到是誰出了哪張牌。</li><li><b>📥 課後紀錄表</b>：用學號整理念題次數、說話通過（+2）與半分通過（+1）次數、被請重念／重說次數、出了合適的回應幾次、出了哪些不太合適的句子、投給不太合適的牌幾次、得票、被選為最佳回應、老師加分與原因，可以用 Excel 打開。</li></ul>' },
      { h: '上課建議', html: '<ul><li>第一次玩：先投影一題全班一起示範，「念題 → 想回應 → 投票」走一次。</li><li>情緒語氣：先示範同一句「我明天要轉學了」，用開心、難過、擔心各說一次，問學生回應會不會不一樣。</li><li>得分的人要<b>真的</b>對念題的人說一次那句話（或做那個動作），老師聽過再按通過，練習眼神、語氣和距離。說得很完整給 +2，有說但還不夠到位給半分 +1。</li><li>開票後遇到不太合適的牌，可以用「投影這一題」問全班：「為什麼不合適？可以怎麼改？」</li><li>回應不到 4 個時（3～4 人一桌），系統會自動加入神秘回應湊到 4 個；可以投的選項有 4 個以上時每人 2 票，比較少時 1 票。人數允許的話，一桌 4～5 人最好玩。</li><li>玩到只剩 2 個人（其他人離開或認輸）時，這局會用目前的分數結束。</li></ul><p>玩法機制參考「念題、出回應牌、投票」這類社交教具的流程；題目、回應、名稱與畫面都是原創。</p>' }
    ]
  };
  BG.register('saynext', mod);
})();
