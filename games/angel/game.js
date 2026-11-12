/* 天使與惡魔（社會技巧卡牌遊戲，andice 原創構想）
   桌上有一排「圖像」，每個圖像都有情緒碼錶（-10～+10，從 0 開始）。每位玩家祕密分到一個圖像。
   輪到你時出一張牌：天使牌讓圖像心情變好、惡魔牌讓心情變差（不能打給自己的圖像），出牌時要大聲念出來。
   天神牌有各種特殊功能。打完補到 3 張，不能 pass。
   老師（天神）可以：機會／命運轉盤、給星星、全班暫停、心情快問、天神挑戰、自訂卡片、本節主題……
   最後分數＝自己圖像的心情＋天神星星。 */
(function () {
  'use strict';
  var SEATC = ['#e63946', '#1d7dd8', '#f4a300', '#2a9d5c', '#8e44ad', '#e76f51'];
  var MIN = -10, MAX = 10, HAND = 3;
  var FACES = [
    { n: '紅帽子', i: '🧢', c: '#e53935', skin: '#ffd7b5' }, { n: '藍眼鏡', i: '👓', c: '#1e88e5', skin: '#f1c7a1' },
    { n: '綠圍巾', i: '🧣', c: '#43a047', skin: '#ffe0c2' }, { n: '黃髮夾', i: '🎀', c: '#fbc02d', skin: '#f6cfa8' },
    { n: '紫背包', i: '🎒', c: '#8e24aa', skin: '#e9b98f' }, { n: '橘球鞋', i: '👟', c: '#fb8c00', skin: '#ffd9bd' },
    { n: '粉蝴蝶', i: '🦋', c: '#ec407a', skin: '#f3c9a6' }, { n: '灰耳機', i: '🎧', c: '#607d8b', skin: '#e8bf98' }
  ];
  /* 本節主題 */
  var TOPICS = [['all', '全部'], ['praise', '稱讚與鼓勵'], ['apology', '道歉與原諒'], ['include', '不排擠、一起玩'], ['sarcasm', '聽懂酸言酸語'], ['comfort', '安慰與關心']];
  var TOPIC_OF = { '稱讚': 'praise', '鼓勵': 'praise', '感謝': 'praise', '批評': 'praise', '輕視': 'praise', '道歉': 'apology', '寬容': 'apology', '指責': 'apology',
    '接納': 'include', '陪伴': 'include', '分享': 'include', '尊重': 'include', '排斥': 'include', '排擠': 'include', '酸言酸語': 'sarcasm',
    '關懷': 'comfort', '關注': 'comfort', '同理': 'comfort', '支持': 'comfort', '聆聽': 'comfort', '體諒': 'comfort', '協助': 'comfort', '幫助': 'comfort', '信任': 'comfort', '嘲笑': 'comfort', '否定': 'comfort', '威脅': 'comfort', '挑釁': 'comfort' };
  var ANGEL = [
    ['你還好嗎？需要我陪你坐一下嗎？', '關懷'], ['需要我幫忙嗎？我可以幫你一起做。', '幫助'], ['我發現你今天有點不開心。', '關注'], ['謝謝你幫我，你真的很好心。', '感謝'],
    ['你這個想法很棒，我怎麼沒想到！', '鼓勵'], ['沒關係，每個人都會犯錯。', '寬容'], ['慢慢來沒關係，我會等你喔。', '體諒'], ['你想說什麼都可以，我在聽。', '聆聽'],
    ['要不要跟我們一起玩？還有位子喔！', '接納'], ['下課我們一起去操場玩吧！', '陪伴'], ['別擔心，我們一起想辦法解決。', '協助'], ['我相信你一定做得到，加油！', '信任'],
    ['你已經比上次進步很多了！', '鼓勵'], ['你的作品好特別，我好喜歡！', '稱讚'], ['你說得也有道理，我會想一想。', '尊重'], ['我的東西可以借你用，不用客氣。', '分享'],
    ['輪到你了，你先說，我們等你。', '尊重'], ['別擔心，我陪你去找老師。', '協助'], ['你今天幫了大家很多忙。', '稱讚'], ['對不起，剛剛是我不對，我會改。', '道歉'],
    ['你不是一個人，我在你旁邊。', '支持', 2], ['他們那樣說不對，不是你的錯。', '同理', 2], ['如果是我，我也會很難過。', '同理', 2],
    ['我很喜歡和你當好朋友。', '接納', 2], ['你認真做事的樣子真的很帥氣！', '稱讚', 2], ['不管別人怎麼說，你都很重要。', '支持', 2]
  ].map(function (a, k) { return { id: 'a' + k, k: 'a', t: a[0], c: a[1], v: a[2] || 1 }; });
  var DEVIL = [
    ['你怎麼這麼笨？連這個都不會？', '輕視', '這題比較難，我們一起想想看。'], ['這麼簡單你也不會，真的很遜。', '輕視', '不會沒關係，我可以慢慢教你。'],
    ['你懂什麼？不要在那邊吵！', '否定', '你的想法是什麼？說來聽聽。'], ['都是你害的，我們才會輸！', '指責', '沒關係，我們一起想辦法補救。'],
    ['你每次都搞砸，真的很糟糕！', '指責', '這次沒成功，下次會更好。'], ['你好煩喔，走開啦，不要靠近我！', '排斥', '我現在想安靜一下，等一下再聊好嗎？'],
    ['哈哈哈，你好好笑，大家快來看！', '嘲笑', '每個人都會出糗，沒關係。'], ['你是膽小鬼吧？這樣也會怕！', '嘲笑', '會害怕很正常，我陪你一起去。'],
    ['你的想法太幼稚了，誰會聽你的？', '批評', '你的想法很特別，可以再多說一點嗎？'], ['你寫得好糟喔，根本看不懂。', '批評', '這裡再改一下，就會變得更好。'],
    ['來啊，誰怕誰，有種就來啊！', '挑釁', '我們先冷靜一下，好好說。'], ['我才不要跟你一組，換別人啦！', '排斥', '我們一起一組吧，一定會很好玩！'],
    ['大家不要跟他玩，不要理他！', '排擠', '大家一起玩吧，人多比較好玩！', 2], ['你根本不是我們這一國的。', '排擠', '歡迎你加入我們，一起來玩吧！', 2],
    ['你敢說出去，就給我小心。', '威脅', '有事情可以說出來，沒關係。', 2], ['沒有人想理你，你自己玩啦。', '否定', '我想聽你說，你可以慢慢講。', 2]
  ].map(function (a, k) { return { id: 'd' + k, k: 'd', t: a[0], c: a[1], r: a[2], v: a[3] || 1 }; });
  [
    ['對—對—對—，你最厲害，什麼都會。', '翻白眼、拉長音', '你很愛炫耀，我不想再聽了。', '你真的很厲害，可以教我嗎？'],
    ['對啦對啦，你很棒啦，這樣可以了吧。', '不看對方、語氣敷衍', '我根本不覺得你很棒，別再說了。', '你真的做得很好，我覺得很棒！'],
    ['啊不就好棒棒～你最了不起了嘛～', '語調上揚、做鬼臉', '這沒什麼了不起，不用一直講。', '你好棒，我真心替你感到開心！'],
    ['哇，你好聰明喔，真是天才耶。', '拍手很慢、冷笑', '你剛剛的答案很笨，我在笑你。', '沒關係，答錯也是在學習。'],
    ['對啦，你最乾淨、你最乖了啦。', '嘲笑的笑', '你很愛裝乖，我看不順眼。', '謝謝你提醒大家，你很細心。'],
    ['好喔好喔，反正都是你說了算。', '聳肩、嘆氣', '我不同意，但懶得跟你說。', '我的想法不太一樣，我們可以討論嗎？']
  ].forEach(function (a) { DEVIL.push({ id: 'd' + DEVIL.length, k: 'd', s: 1, t: a[0], tone: a[1], mean: a[2], r: a[3], c: '酸言酸語', v: 1 }); });
  /* 2026-11-12 擴充：天使 50 張、惡魔 50 張（id 接在後面，舊的 id 不變） */
  [
    ['你畫的圖好漂亮，可以教我嗎？', '稱讚'], ['謝謝你借我橡皮擦，幫了大忙。', '感謝'], ['你剛剛分享的故事好有趣喔！', '稱讚'],
    ['你好勇敢，敢上台發表耶！', '鼓勵'], ['沒關係，我們下次再試一次。', '鼓勵'], ['你先選吧，我等一下再選就好。', '尊重'],
    ['你看起來很累，要不要休息一下？', '關懷'], ['我可以坐你旁邊一起吃午餐嗎？', '接納'], ['你忘了帶的話，我可以分你用。', '分享'],
    ['你掉的東西，我幫你撿起來了。', '幫助'], ['我知道你很努力，大家都看到了。', '鼓勵'], ['這題我也不會，我們一起問老師。', '協助'],
    ['你說的話很重要，我想聽完。', '聆聽'], ['剛剛撞到你，對不起，你還好嗎？', '道歉'], ['你願意原諒我，真的謝謝你。', '感謝'],
    ['我們輪流玩，這樣大家都開心。', '尊重'], ['你生氣的時候，可以跟我說說看。', '關懷'], ['你遇到困難時，記得還有我在。', '支持'],
    ['你是我們這一組最棒的好隊友！', '稱讚', 2], ['我相信你不是故意的，沒關係。', '體諒', 2], ['被大家笑一定很難受，我懂你的感覺。', '同理', 2],
    ['有人欺負你的話，我陪你去告訴老師。', '支持', 2], ['不管輸或贏，我都想和你一起玩。', '接納', 2], ['謝謝你一直陪著我，你是我的好朋友。', '感謝', 2]
  ].forEach(function (a) { ANGEL.push({ id: 'a' + ANGEL.length, k: 'a', t: a[0], c: a[1], v: a[2] || 1 }); });
  [
    ['你動作好慢喔，大家都在等你。', '輕視', '不急，我們等你準備好再開始。'], ['你又在亂講了，誰會相信你？', '否定', '你這樣想的原因是什麼呢？'],
    ['你很愛哭耶，一點小事就哭。', '嘲笑', '你看起來很難過，要不要說說看？'], ['你再碰我的東西，我就告訴大家。', '威脅', '這是我的東西，用之前請先問我。'],
    ['你的意見不重要，聽我的就好。', '否定', '我們聽聽看每個人的意見吧。'], ['輸了都怪你，你最不會玩了。', '指責', '輸了沒關係，下一局我們再加油。'],
    ['這是我們的位子，你去別的地方。', '排斥', '這裡還有位子，你可以一起坐。'], ['你又講錯了，真的很丟臉耶。', '嘲笑', '講錯沒關係，再說一次就好。'],
    ['你畫這什麼東西啊？看不懂啦。', '批評', '你畫的是什麼？可以介紹給我聽嗎？'], ['你那麼慢，不要跟我們同一隊。', '排斥', '我們同一隊，大家一起加油吧！'],
    ['你自己想辦法，不要來問我。', '排斥', '我現在在忙，等一下再幫你好嗎？'], ['有本事你就去告老師啊！', '挑釁', '有問題我們可以一起去找老師。'],
    ['你懂不懂規則啊？笨死了。', '輕視', '這個規則我再說一次給你聽。'], ['你每次都要搶，真的很自私。', '指責', '我們輪流來，每個人都有機會。'],
    ['走開啦，這裡沒有你的事。', '排斥', '你也想參加嗎？我們一起來。'],
    ['我們都不要理他，假裝沒看到。', '排擠', '他也是我們班的，一起邀請他吧！', 2], ['誰跟他好，就不跟誰做朋友。', '排擠', '每個人都可以和大家做朋友。', 2],
    ['你再說一次，我就讓你好看！', '威脅', '我很生氣，但我會好好跟你說。', 2], ['你什麼都做不好，真沒用。', '否定', '每個人都有擅長的事，你也有。', 2],
    ['大家來看，他又出糗了，哈哈！', '嘲笑', '不要笑他，我們一起幫幫他。', 2]
  ].forEach(function (a) { DEVIL.push({ id: 'd' + DEVIL.length, k: 'd', t: a[0], c: a[1], r: a[2], v: a[3] || 1 }); });
  [
    ['喔～你好厲害喔，全世界你最懂。', '拉長音、翻白眼', '你很愛自以為是，我聽了很煩。', '你懂很多，可以多說一點給我聽嗎？'],
    ['哇，你今天終於準時了耶，好難得。', '誇張的驚訝表情', '你平常都遲到，我在笑你。', '你今天很準時，真是太好了！'],
    ['好啦好啦，都是我的錯，可以了吧。', '不耐煩、大聲嘆氣', '我不覺得自己錯，只是不想再吵。', '我們都冷靜一下，好好說清楚吧。'],
    ['隨便啦，反正你什麼都對。', '聳肩、撇嘴', '我不同意你，也不想聽你說。', '我的想法不一樣，可以說給你聽嗎？'],
    ['哇，你好會整理喔，桌子好乾淨喔。', '看著很亂的桌子冷笑', '你的桌子好亂，真受不了。', '我們一起整理桌子，會更乾淨。'],
    ['哇，你考得好高喔，一定很辛苦吧。', '語氣酸酸的、斜眼看', '你很愛現，我一點也不佩服。', '你考得很好，我真心替你高興！'],
    ['是是是，你說的都對，你最大。', '敷衍點頭、不看對方', '我不想跟你講道理，懶得理你。', '我有不同的看法，可以聽聽看嗎？'],
    ['你真的很會耶，又打翻東西了。', '拍手、偷笑', '你又闖禍了，真的好笨，好麻煩喔。', '沒關係，我幫你一起整理乾淨。']
  ].forEach(function (a) { DEVIL.push({ id: 'd' + DEVIL.length, k: 'd', s: 1, t: a[0], tone: a[1], mean: a[2], r: a[3], c: '酸言酸語', v: 1 }); });
  var GOD = [
    { n: '重新開始', d: '收回所有人的手牌，洗牌後每人重發 3 張', e: '🔄' },
    { n: '天神點名', d: '指定下一個出牌的人，之後從他往下接', e: '👉' },
    { n: '迴轉', d: '出牌方向反過來', e: '↩️' },
    { n: '天神祝福', d: '選一個圖像（不能是自己的），心情 +3', e: '✨' },
    { n: '圖像大風吹', d: '所有人的圖像重新洗牌分配，心情留在圖像上', e: '🌪️' },
    { n: '大家換位子', d: '重新隨機排出牌的順序', e: '🪑' },
    { n: '守護天使', d: '選一個圖像（不能是自己的），擋掉它下一張惡魔牌', e: '🛡️' },
    { n: '轉念牌', d: '上一個人剛出惡魔牌時才能用：把那句話改成好聽的說法念出來，那個圖像改成 +1', e: '💡' },
    { n: '道歉修復', d: '選一個這一輪被惡魔牌打到的圖像，說一句道歉的話，心情 +2', e: '🤝' },
    { n: '公平之光', d: '目前心情最低的圖像 +3（一樣低的都加）', e: '🌈' },
    { n: '換位思考', d: '選一個圖像（不能是自己的），說出「如果我是它，我現在覺得……」，心情 +2', e: '🧠' },
    { n: '冷靜時間', d: '全桌一起深呼吸 3 次，所有心情在 -5 以下的圖像 +2', e: '🌬️' },
    { n: '手牌大洗牌', d: '把所有人手上的牌收起來洗亂，再照原本的張數發回去（不從牌堆拿新牌）', e: '🃏' },
    { n: '手牌交換', d: '選一個人，和他交換全部的手牌（天神用的時候：選兩個人互換）', e: '🔀' }
  ].map(function (o, k) { o.id = 'g' + k; o.k = 'g'; o.g = k; return o; });
  var CARD = {}; ANGEL.concat(DEVIL, GOD).forEach(function (c) { CARD[c.id] = c; });
  function C(cid) { return CARD[cid]; }
  function wlen(t) { return String(t || '').replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '').length; }   // 不含標點符號的字數
  var MINW = 10;
  function addCustom(list) {   // 老師自訂的句子：id 由內容決定，所以老師端、學生端算出來都一樣
    var ids = [];
    (list || []).forEach(function (x) {
      var t = String(x.t || '').trim().slice(0, 40); if (!t || wlen(t) < MINW || (x.k !== 'a' && x.k !== 'd')) return;
      var h = 0, s = x.k + t; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      var id = 'x' + h.toString(36);
      CARD[id] = { id: id, k: x.k, t: t, c: '天神自訂', v: x.v === 2 ? 2 : 1, r: x.k === 'd' ? (String(x.r || '').trim().slice(0, 40) || '（想一想可以怎麼好好說）') : null, custom: 1 };
      ids.push(id);
    });
    return ids;
  }
  /* 機會（正向題）／命運（危機、狀況題）：不提到圖像、不指定真實的同學 */
  var QS = {
    chance: [
      ['說出一個你自己的優點。', 'praise'], ['說出一句你最喜歡聽到的稱讚。', 'praise'], ['同學考試進步了，你會怎麼稱讚他？', 'praise'], ['同學畫了一張很棒的畫，你會怎麼說？', 'praise'],
      ['說出一件你最近很努力的事情。', 'praise'], ['比賽輸了，你可以對隊友說什麼鼓勵的話？', 'praise'],
      ['你不小心撞到同學，你會怎麼說？', 'apology'], ['一個好的道歉，要說出哪些內容？', 'apology'], ['同學跟你道歉了，你可以怎麼回應？', 'apology'], ['道歉之後，還可以做什麼來補救？', 'apology'],
      ['如果新同學一個人吃午餐，你會怎麼做？', 'include'], ['下課有同學站在旁邊看大家玩，你會怎麼邀請他？', 'include'], ['分組時有同學沒有組，你可以怎麼說？', 'include'],
      ['說出一個大家可以一起玩的遊戲，你會怎麼邀請別人加入？', 'include'], ['你有好吃的點心，可以怎麼和朋友分享？', 'include'],
      ['說出最近一件讓你開心的事。', 'comfort'], ['同學跌倒了，你會怎麼做、怎麼說？', 'comfort'], ['朋友的寵物生病了很難過，你可以說什麼？', 'comfort'],
      ['說出一個你心情不好時，會讓自己好一點的方法。', 'comfort'], ['朋友說「我好緊張」，你可以怎麼安慰他？', 'comfort'], ['聽別人說話的時候，眼睛和身體可以怎麼做？', 'comfort'],
      ['用真心的語氣說一次「你好棒」。', 'sarcasm'], ['怎麼聽出別人是在「酸」你？可以看哪些地方？', 'sarcasm'], ['示範用溫柔的語氣說「謝謝你」。', 'sarcasm'],
      ['說出你今天的心情，還有為什麼。', 'all'], ['想一個可以讓全班氣氛變好的點子。', 'all'], ['說出一件你幫助過別人的事。', 'all'], ['你覺得什麼樣的人是好朋友？', 'all']
    ],
    fate: [
      ['你聽到有人說「大家不要跟他玩」，你會怎麼做？', 'include'], ['分組時有人說「我才不要跟你一組」，你會怎麼回應？', 'include'], ['你看到有同學被大家排擠，你可以做什麼？', 'include'], ['朋友叫你不要跟某個同學說話，你會怎麼辦？', 'include'],
      ['你不小心弄壞同學的鉛筆盒，你會怎麼說？', 'apology'], ['你說了一句話讓朋友哭了，你會怎麼做？', 'apology'], ['你和朋友吵架了，想和好，第一句話會說什麼？', 'apology'], ['有人撞倒你的水壺卻沒有道歉，你會怎麼說？', 'apology'],
      ['排隊時有人插隊，你會怎麼說？', 'comfort'], ['有人一直笑你答錯了，你會怎麼做？', 'comfort'], ['你很生氣，想要大叫，可以先做什麼讓自己冷靜？', 'comfort'], ['有人在網路上說你壞話，你會找誰幫忙？', 'comfort'],
      ['你聽到有人在背後說你朋友壞話，你會怎麼做？', 'comfort'], ['有人拿走你的東西不還，你會怎麼說？', 'comfort'], ['你輸了比賽很難過，可以怎麼讓自己好一點？', 'comfort'], ['有人對你說「你敢說出去就給我小心」，你會怎麼辦？', 'comfort'],
      ['有人對你說「對啦，你最厲害啦」，他真正的意思可能是什麼？你會怎麼回應？', 'sarcasm'], ['你答錯題，有人說「哇，你好聰明喔」，你會怎麼回應？', 'sarcasm'], ['有人說「好喔，你說了算」然後走開，他可能在想什麼？', 'sarcasm'],
      ['你很努力寫作業，卻被說「寫得好糟」，你會怎麼回應？', 'praise'], ['同學得了獎，你心裡有點羨慕，你可以怎麼說？', 'praise'], ['你覺得同學的想法很奇怪，可以怎麼說才不會傷到他？', 'praise'],
      ['老師誤會你做錯事，你會怎麼說明？', 'all'], ['你想加入大家的遊戲但很害羞，你會怎麼說？', 'all'], ['朋友一直打斷你說話，你會怎麼說？', 'all'], ['你借給同學的東西被弄髒了，你會怎麼說？', 'all'],
      ['你很想玩某個遊戲，但大家都想玩別的，你會怎麼辦？', 'all'], ['有人一直模仿你說話的樣子，你會怎麼做？', 'all']
    ]
  };
  var CHAL = [
    ['angel', '😇 這一輪只能出天使牌（或天神牌）'], ['turn', '💡 這一輪有人出惡魔牌，下一個人要先把它轉念，再出自己的牌'],
    ['gentle', '🎵 這一輪要用最溫柔的語氣念'], ['decode', '🔍 這一輪的酸言酸語，全桌要先猜真正的意思'], ['why', '🌟 這一輪天使牌念完，要再加一句具體的理由']
  ];
  var STAR_R = ['語氣很溫暖', '有耐心等待', '主動道歉', '說出真正的意思', '好好回答問題', '遵守規則', '幫助同學'];
  var MOODS = [['😄', '很開心'], ['🙂', '還不錯'], ['😐', '普通'], ['🙁', '有點難過'], ['😢', '很不舒服']];
  var MOOD = function (m) { return m >= 10 ? '超級開心' : m >= 6 ? '開心' : m >= 1 ? '有點高興' : m === 0 ? '普通' : m >= -5 ? '有點難過' : m >= -9 ? '很難過' : '崩潰'; };
  var REASONS = { joy: '有圖像的心情到了 +10！', crash: '有圖像的心情掉到 -10，崩潰了…', time: '大家都出完牌了', coop: '所有人的圖像心情都在 0 以上，全體過關！', coopfail: '還有圖像的心情低於 0，下次再一起努力', coopcrash: '有圖像崩潰了，合作失敗', tie: '大家的實際得分一樣高', resign: '其他人都認輸了', left: '其他人都離開了', teacher: '天神結束這局' };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(m) { return Math.max(MIN, m); }   // 正分沒有上限，負分最低 -10
  function draw(g) { if (!g.deck.length) { g.deck = shuffle(g.disc); g.disc = []; } return g.deck.pop(); }
  function alive(g) { var a = []; for (var s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) a.push(s); return a; }
  function turnSeat(g) { return g.order[g.pos]; }
  function advance(g) { for (var k = 0; k < g.np; k++) { g.pos = (g.pos + g.dir + g.np) % g.np; if (g.out.indexOf(g.order[g.pos]) < 0) break; } g.turnAt = Date.now(); }
  function chalOn(g, k) { return g.chal && g.chal.k === k && g.plays < g.chal.until; }
  function canTurn(g, seat) { var l = g.lastDevil; return !!l && l.at === g.plays - 1 && l.s !== seat && l.delta < 0; }
  function apoTargets(g, own) { var r = []; g.P.forEach(function (p, i) { if (i !== own && p.hitAt >= 0 && g.plays - p.hitAt <= g.np) r.push(i); }); return r; }
  function baseTargets(g, seat, cid) {
    var c = C(cid), own = g.own[seat], all = [];
    if (!c) return null;
    for (var i = 0; i < g.P.length; i++) if (i !== own) all.push(i);
    if (c.k === 'a' || c.k === 'd') return { p: all };
    if (c.g === 1 || c.g === 13) { var ss = alive(g).filter(function (s) { return s !== seat; }); return ss.length ? { s: ss } : null; }
    if (c.g === 3 || c.g === 10) return { p: all };
    if (c.g === 6) { var sh = all.filter(function (i) { return !g.P[i].shield; }); return sh.length ? { p: sh } : null; }
    if (c.g === 7) return canTurn(g, seat) ? { now: true } : null;
    if (c.g === 8) { var ap = apoTargets(g, own); return ap.length ? { p: ap } : null; }
    return { now: true };
  }
  /* 天神挑戰「只能出天使牌」：手上還有別的牌可以出時，惡魔牌不能用 */
  function targets(g, seat, cid, hand) {
    var t = baseTargets(g, seat, cid);
    if (t && chalOn(g, 'angel') && C(cid).k === 'd' && (hand || g.hands[seat]).some(function (x) { return C(x).k !== 'd' && baseTargets(g, seat, x); })) return null;
    return t;
  }
  function blocked(g) { return !!(g.res || g.wait || g.paused || g.help != null || g.ev || moodWait(g)); }
  function moodWait(g) { return !!g.moodQ && g.hum.some(function (h, s) { return h && g.out.indexOf(s) < 0 && g.moodA[s] == null; }); }
  function change(g, i, d, note) {
    var p = g.P[i], before = p.m; p.m = clamp(p.m + d); p.hist.push(p.m);
    if (note) { p.rec.push(note); if (p.rec.length > 14) p.rec.shift(); }
    return p.m - before;
  }
  function pushLog(g, lg) { g.log = lg; g.logs.push(lg); if (g.logs.length > 400) g.logs.shift(); }
  function rec(g, e) { g.evq.push(e); }
  /* 實際得分：只看「助人」，只加不扣；心情只用來判斷遊戲結束 */
  var HELP = { 3: 3, 6: 2, 9: 3, 11: 2 };     // 直接加分的天神牌：天神祝福、守護天使、公平之光、冷靜時間
  var JUDGE = { 7: 1, 8: 1, 10: 1 };           // 要有表現、由天神評 0～5 分：轉念牌、道歉修復、換位思考
  var NEEDP = { 3: 1, 6: 1, 8: 1, 10: 1 };     // 老師用天神牌時要選圖像的
  function scOf(g, s) { g.sc = g.sc || []; return g.sc[s] = g.sc[s] || { a: 0, g: 0, j: 0, ev: 0, st: 0, t: 0 }; }
  function addPts(g, s, key, n, notify, why) {
    if (!n || s < 0) return;
    scOf(g, s)[key] += n; g.stars[s] = (g.stars[s] || 0) + n;
    rec(g, { seat: s, k: 'pts', n: n });
    if (notify && g.cfg.show !== 'end') notify(s, '⭐ 實際得分 +' + n + (why ? '（' + why + '）' : ''));
  }
  function hostGodOK(g) {   // 老師現在能用的天神牌：同一張不能連續 3 次；轉念牌要有人剛出過惡魔牌
    if (g.res || g.wait) return [];
    var hg = g.hg || [], ban = hg.length >= 2 && hg[hg.length - 1] === hg[hg.length - 2] ? hg[hg.length - 1] : -1;
    return GOD.map(function (c) { return c.g; }).filter(function (k) { return k !== ban && !(k === 7 && !g.lastDevil) && !(k === 13 && alive(g).length < 2); });
  }
  function autoJudge(g, seat) { return g.solo || g.cfg.judge === 'auto' || !g.hum[seat]; }
  function scoreJ(g, id, pts, notify) {
    var q = null; (g.jq || []).forEach(function (x, k) { if (x.id === id) q = k; }); if (q == null) return false;
    var it = g.jq.splice(q, 1)[0]; pts = Math.max(0, Math.min(5, pts | 0));
    rec(g, { seat: it.s, k: 'judge', c: it.c, pts: pts });
    if (pts) addPts(g, it.s, 'j', pts, notify, '天神評分：' + C(it.c).n);
    else if (notify && g.cfg.show !== 'end') notify(it.s, '天神聽過你的回答了，下次再多想一點喔');
    g.cnt++;
    if (g.wait && !g.jq.length) { var w = g.wait; g.wait = null; finish(g, w); }
    return true;
  }
  function owners(g) { var o = []; for (var i = 0; i < g.P.length; i++) o.push(g.own.indexOf(i)); return o; }
  function total(g, s) { return g.stars[s] || 0; }   // 比賽模式只比實際得分
  function finish(g, why) {
    var a = alive(g);
    if (g.mode === 'coop') {
      var ok = why !== 'crash' && a.every(function (s) { return g.P[g.own[s]].m >= 0; });
      g.res = { ws: ok ? a : [], why: ok ? 'coop' : why === 'crash' ? 'coopcrash' : 'coopfail' };
    } else {
      var best = Math.max.apply(null, a.map(function (s) { return total(g, s); })), ws = a.filter(function (s) { return total(g, s) === best; });
      if (ws.length === a.length && a.length > 1) g.res = { w: -1, why: 'tie' };
      else if (ws.length === 1) g.res = { w: ws[0], why: why };
      else g.res = { ws: ws, why: why };
    }
    var r = g.res;
    a.forEach(function (s) { rec(g, { seat: s, k: 'end', mood: g.P[g.own[s]].m, stars: g.stars[s] || 0, win: r.ws ? r.ws.indexOf(s) >= 0 : r.w === s }); });
  }
  function checkEnd(g) {
    var hi = false, lo = false;
    g.P.forEach(function (p) { if (p.m <= MIN) lo = true; });
    var why = lo ? 'crash' : g.plays >= g.len * alive(g).length ? 'time' : null;
    if (!why) return false;
    if (g.jq && g.jq.length) { g.wait = why; return true; }   // 還有天神牌等老師評分，評完才公布
    return finish(g, why), true;
    return false;
  }
  /* 天神降臨：轉盤選一位真人玩家，抽機會或命運 */
  function startEv(g, kind) {
    var hs = alive(g).filter(function (s) { return g.hum[s]; }); if (!hs.length || g.ev || g.res) return false;
    kind = kind === 'chance' || kind === 'fate' ? kind : (Math.random() < .5 ? 'chance' : 'fate');
    var pool = QS[kind].filter(function (q) { return g.cfg.topic === 'all' || !g.cfg.topic || q[1] === g.cfg.topic || q[1] === 'all'; });
    (g.cfg.qs || []).forEach(function (q) { if (q && q.k === kind && q.t) pool.push([String(q.t).slice(0, 80), 'all']); });
    if (g.used) { var fresh = pool.filter(function (q) { return g.used.indexOf(q[0]) < 0; }); if (fresh.length) pool = fresh; }
    var q = pick(pool)[0]; g.used.push(q);
    g.ev = { id: ++g.evn, seat: pick(hs), k: kind, q: q, cand: hs };
    return true;
  }
  function scoreEv(g, pts, notify) {
    var e = g.ev; if (!e) return false;
    pts = Math.max(0, Math.min(3, pts | 0));
    rec(g, { seat: e.seat, k: 'ev', kind: e.k, q: e.q, pts: pts });
    pushLog(g, { k: 'ev', s: e.seat, ek: e.k, q: e.q, pts: pts });
    addPts(g, e.seat, 'ev', pts, notify, e.k === 'chance' ? '機會題' : '命運題');
    g.ev = null; g.turnAt = Date.now(); g.cnt++;
    return true;
  }
  /* 天神牌的效果（玩家出牌、老師用天神牌共用；老師 seat = -1） */
  function godFx(g, seat, c, p, s2, lg, h, i) {
    var jump = false, cid = c.id;
    switch (c.g) {
        case 0: g.hands.forEach(function (hh, s) { if (s !== seat) g.disc = g.disc.concat(hh); }); if (h) g.disc = g.disc.concat(h.filter(function (x, j) { return j !== i; }));
          g.deck = shuffle(g.deck.concat(g.disc)); g.disc = [];
          for (var s = 0; s < g.np; s++) g.hands[s] = [];
          for (var k = 0; k < HAND; k++) for (s = 0; s < g.np; s++) if (g.out.indexOf(s) < 0) g.hands[s].push(draw(g));
          h = null; break;
        case 1: g.pos = g.order.indexOf(s2); g.turnAt = Date.now(); jump = true; lg.to = s2; break;
        case 2: g.dir = -g.dir; break;
        case 3: lg.d = change(g, p, 3, cid); break;
        case 4: var fs = shuffle(g.P.map(function (x, j) { return j; })); for (var q = 0; q < g.np; q++) g.own[q] = fs[q]; break;
        case 5: var cur = seat >= 0 ? seat : turnSeat(g); g.order = shuffle(g.order.slice()); g.pos = g.order.indexOf(cur); break;
        case 6: g.P[p].shield = true; break;
        case 7: var L = g.lastDevil; lg.p = L.p; lg.from = L.c; lg.d = change(g, L.p, -L.delta + 1, cid); g.lastDevil = null; if (seat >= 0) rec(g, { seat: seat, k: 'turn' }); break;
        case 8: lg.d = change(g, p, 2, cid); g.P[p].hitAt = -1; if (seat >= 0) rec(g, { seat: seat, k: 'apo' }); break;
        case 9: var lo = Math.min.apply(null, g.P.map(function (x) { return x.m; })); lg.ps = [];
          g.P.forEach(function (x, j) { if (x.m === lo) { change(g, j, 3, cid); lg.ps.push(j); } }); break;
        case 10: lg.d = change(g, p, 2, cid); break;
        case 11: lg.ps = []; g.P.forEach(function (x, j) { if (x.m <= -5) { change(g, j, 2, cid); lg.ps.push(j); } }); break;
        case 12: if (h) h.splice(i, 1);   // 手牌大洗牌：只用大家手上現有的牌
          var al = alive(g), pool = [], cnt = {};
          al.forEach(function (s) { cnt[s] = g.hands[s].length; pool = pool.concat(g.hands[s]); });
          shuffle(pool); al.forEach(function (s) { g.hands[s] = pool.splice(0, cnt[s]); });
          al.forEach(function (s) { while (g.hands[s].length < HAND) g.hands[s].push(draw(g)); });
          h = null; break;
        case 13: if (h) h.splice(i, 1);   // 手牌交換：一對一
          var a1 = seat >= 0 ? seat : lg.from2, b1 = s2, tmp = g.hands[a1]; g.hands[a1] = g.hands[b1]; g.hands[b1] = tmp;
          [a1, b1].forEach(function (s) { while (g.hands[s].length < HAND) g.hands[s].push(draw(g)); });
          lg.from2 = a1; lg.to = b1; h = null; break;
      }
    return { h: h, jump: jump };
  }
  /* 牌堆：依老師設定的比例（惡魔：天使：天神，預設 6：3：1）組成約 120 張 */
  var WDEF = [6, 3, 1], DECKN = 120;
  function wOf(cfg) { var w = (cfg.w || WDEF).map(function (x) { return Math.max(0, Math.min(10, +x || 0)); }); return w[0] + w[1] + w[2] ? w : WDEF.slice(); }
  function buildDeck(cfg) {
    var off = cfg.off || [], cx = addCustom(cfg.custom), w = wOf(cfg), sum = w[0] + w[1] + w[2];
    function pool(list, k) {
      var ids = list.filter(function (c) { return off.indexOf(c.id) < 0; }).map(function (c) { return c.id; });
      if (cfg.topic && cfg.topic !== 'all') list.forEach(function (c) { if (off.indexOf(c.id) < 0 && TOPIC_OF[c.c] === cfg.topic) ids.push(c.id); });   // 本節主題的牌多放一份
      return { first: cx.filter(function (id) { return C(id).k === k; }), ids: ids };
    }
    function fill(pl, n) {
      var out = shuffle(pl.first.slice()).slice(0, n), cyc = [];
      var all = pl.ids.concat(pl.first); if (!all.length) return out;
      while (out.length < n) { if (!cyc.length) cyc = shuffle(all.slice()); out.push(cyc.pop()); }
      return out;
    }
    var nd = Math.round(DECKN * w[0] / sum), na = Math.round(DECKN * w[1] / sum), ng = DECKN - nd - na;
    var deck = fill(pool(DEVIL, 'd'), nd).concat(fill(pool(ANGEL, 'a'), na)).concat(fill({ first: [], ids: GOD.map(function (c) { return c.id; }) }, w[2] ? ng : 0));
    return shuffle(deck);
  }
  var mod = {
    seats: 4, seatOptions: [3, 4, 5, 6], seatDefault: 4, botSeats: [2, 5], botDelay: 2200, ver: 16,
    reasons: REASONS,
    opts: [
      { k: 'mode', label: '玩法：', list: [['comp', '🏆 比賽（心情＋星星最高的人贏）'], ['coop', '🤝 合作（大家都在 0 以上才過關）']] },
      { k: 'len', label: '每人出牌幾次：', list: [['8', '8 次（約 15 分鐘）'], ['5', '5 次（約 10 分鐘）'], ['12', '12 次（約 20 分鐘）'], ['15', '15 次（約 25 分鐘）']] }
    ],
    levelDesc: ['隨便出牌', '比較常說好話', '會想辦法讓自己贏', '很會用天神牌'],
    seatName: function (i) { return '第 ' + (i + 1) + ' 位'; },
    seatColor: function (i) { return SEATC[i]; },
    init: function (n, o) {
      o = o || {}; n = Math.max(3, Math.min(6, n || 4));
      var x = o._x || {}, cfg = { topic: x.topic || 'all', w: x.w || WDEF.slice(), custom: x.custom || [], off: x.off || [], qs: x.qs || [], godEvery: +x.godEvery || 0, judge: o._solo ? 'auto' : (x.judge || 'teacher'), timer: +x.timer || 0, show: x.show === 'end' ? 'end' : 'self' };
      var nf = n <= 4 ? n + 1 : n, faces = shuffle(FACES.map(function (f, i) { return i; })).slice(0, nf);
      var hum = []; for (var s = 0; s < n; s++) hum.push(o._bots ? !o._bots[s] : true);
      var g = { np: n, mode: o.mode === 'coop' ? 'coop' : 'comp', len: Math.max(3, Math.min(20, +o.len || 8)), cfg: cfg, cx: cfg.custom, hum: hum,
        P: faces.map(function (f) { return { f: f, m: 0, hist: [0], rec: [], shield: false, hitAt: -1, ga: 0, gd: 0 }; }),
        own: shuffle(faces.map(function (f, i) { return i; })).slice(0, n),
        order: shuffle(alive({ np: n, out: [] })), pos: 0, dir: 1, deck: buildDeck(cfg), disc: [], hands: [], swap: [], out: [], stars: [],
        plays: 0, pc: [], sc: [], jq: [], jn: 0, hg: [], wait: null, solo: !!o._solo, cnt: 0, log: null, logs: [], lastDevil: null, res: null, turnAt: Date.now(),
        ev: null, evn: 0, used: [], paused: false, help: null, moodQ: 0, moodA: {}, chal: null, evq: [] };
      for (s = 0; s < n; s++) { g.hands.push([]); g.swap.push(false); g.stars.push(0); }
      for (var k = 0; k < HAND; k++) for (s = 0; s < n; s++) g.hands[s].push(draw(g));
      return g;
    },
    turnSeat: turnSeat,
    forfeit: function (g, seat) { knock(g, seat, 'left'); },
    teacherDraw: function (g) { g.res = { w: -1, why: 'teacher' }; g.ev = null; },
    view: function (g, seat) {
      addCustom(g.cx);
      return { np: g.np, mode: g.mode, len: g.len, cx: g.cx, P: g.P.map(function (p) { return { f: p.f, m: p.m, shield: p.shield, hitAt: p.hitAt, hist: g.res ? p.hist : null, rec: g.res ? p.rec : null, ga: p.ga, gd: p.gd }; }),
        mine: seat >= 0 ? g.own[seat] : -1, owners: g.res ? owners(g) : null, hand: seat >= 0 ? g.hands[seat] : null, swapped: seat >= 0 ? g.swap[seat] : true,
        stars: g.res ? g.stars : null, sc: g.res ? g.sc : null, myScore: seat >= 0 && (g.res || g.cfg.show !== 'end') ? g.stars[seat] || 0 : null, wait: !!g.wait, solo: !!g.solo,
        order: g.order, pos: g.pos, dir: g.dir, turn: turnSeat(g), plays: g.plays, limit: g.len * alive(g).length, len: g.len, myPlays: seat >= 0 ? (g.pc || [])[seat] || 0 : 0, deck: g.deck.length, lastDevil: g.lastDevil, log: g.log, logs: g.logs, out: g.out, cnt: g.cnt,
        ev: g.ev, judge: g.cfg.judge, paused: g.paused, help: g.help != null, moodQ: g.moodQ, moodMine: seat >= 0 ? g.moodA[seat] : null,
        chal: g.chal && g.plays < g.chal.until ? g.chal.k : null, timer: g.cfg.timer, left: g.cfg.timer && !blocked(g) ? Math.max(0, g.cfg.timer - (Date.now() - g.turnAt) / 1000) : null };
    },
    act: function (g, seat, d, notify) {
      if (g.res || g.out.indexOf(seat) >= 0) return false;
      if (d.t === 'resign') { notify(seat, '你已經認輸，可以繼續觀看'); knock(g, seat, 'resign'); g.cnt++; return true; }
      if (d.t === 'help') { if (g.help != null) return false; g.help = seat; rec(g, { seat: seat, k: 'help' }); g.cnt++; return true; }
      if (d.t === 'mood') { if (!g.moodQ || d.id !== g.moodQ || g.moodA[seat] != null) return false; var mv = d.v | 0; if (mv < 0 || mv > 4) return false; g.moodA[seat] = mv; rec(g, { seat: seat, k: 'mood', v: mv }); g.cnt++; if (!moodWait(g)) g.turnAt = Date.now(); return true; }
      if (d.t === 'evdone') { if (!g.ev || g.ev.seat !== seat || g.cfg.judge !== 'auto') return false; return scoreEv(g, 2, notify); }
      if (blocked(g) || turnSeat(g) !== seat || d.n !== g.cnt) return false;
      var h = g.hands[seat], i = d.i | 0, cid = h[i]; if (!cid) return false;
      if (d.t === 'redraw') {   // 手上全是惡魔牌：整組換新（不算出牌、不限次數）
        if (!h.length || !h.every(function (x) { return C(x).k === 'd'; })) return false;
        g.disc = g.disc.concat(h); var nh = []; while (nh.length < HAND) nh.push(draw(g)); g.hands[seat] = nh;
        g.rdT = g.rdT || {}; g.rdT[seat] = g.plays; g.cnt++;
        pushLog(g, { k: 'swap', s: seat, all: 1 }); return true;
      }
      if (d.t === 'dump') {   // 手上的牌都不能用：換一張新的（不算出牌、不限次數）
        if (h.some(function (x) { return !!targets(g, seat, x); })) return false;
        g.disc.push(cid); h[i] = draw(g); g.cnt++;
        pushLog(g, { k: 'swap', s: seat, dump: 1 }); return true;
      }
      if (d.t !== 'play') return false;
      var c = C(cid), tg = targets(g, seat, cid); if (!tg) { notify(seat, '這張牌現在不能用，換一張吧'); return false; }
      var p = null, s2 = null;
      if (tg.p) { p = +d.p; if (tg.p.indexOf(p) < 0) return false; }
      if (tg.s) { s2 = +d.s; if (tg.s.indexOf(s2) < 0) return false; }
      var lg = { k: c.k, c: cid, s: seat, p: p, d: 0 }, jump = false;
      // 天神挑戰「轉念」：上一個人出了惡魔牌，這個人先轉念（那個圖像 +1）
      if (chalOn(g, 'turn') && canTurn(g, seat) && c.g !== 7) { var LD = g.lastDevil; lg.tt = { p: LD.p, from: LD.c, d: change(g, LD.p, 1, null) }; rec(g, { seat: seat, k: 'turn' }); }
      if (c.k === 'a') { lg.d = change(g, p, c.v, cid); g.P[p].ga++; }
      else if (c.k === 'd') {
        var P = g.P[p]; P.gd++;
        if (P.shield) { P.shield = false; lg.blocked = true; P.rec.push(cid); }
        else { lg.d = change(g, p, -c.v, cid); P.hitAt = g.plays; }
        g.lastDevil = { s: seat, p: p, c: cid, delta: lg.d, at: g.plays };
      } else { var fx = godFx(g, seat, c, p, s2, lg, h, i); h = fx.h; jump = fx.jump; }
      // 實際得分：助人才加分
      if (lg.tt) addPts(g, seat, 't', 1, notify, '先轉念');
      if (c.k === 'a') addPts(g, seat, 'a', c.v, notify, '天使牌');
      else if (c.k === 'g' && HELP[c.g]) addPts(g, seat, 'g', HELP[c.g], notify, c.n);
      else if (c.k === 'g' && JUDGE[c.g]) {
        var jit = { id: ++g.jn, s: seat, c: cid, p: lg.p, from: lg.from || null };
        if (autoJudge(g, seat)) addPts(g, seat, 'j', 3, notify, c.n);
        else { g.jq = g.jq || []; g.jq.push(jit); }
      }
      if (h) { h.splice(i, 1); h.push(draw(g)); }
      g.disc.push(cid);
      if (g.chal && g.chal.k) lg.ch = chalOn(g, g.chal.k) ? g.chal.k : null;
      rec(g, { seat: seat, k: 'play', ck: c.k === 'g' ? 'g' : c.s ? 's' : c.k });
      g.plays++; g.cnt++; g.pc = g.pc || []; g.pc[seat] = (g.pc[seat] || 0) + 1;
      pushLog(g, lg);
      if (checkEnd(g)) return true;
      if (!jump) advance(g);
      var al = alive(g).length;
      if (g.cfg.godEvery && g.plays % (g.cfg.godEvery * al) === 0) startEv(g);
      return true;
    },
    /* 老師（天神）的動作 */
    hostAct: function (g, d, notify) {
      if (!g) return false;
      var t = d.t;
      if (t === 'resume') { if (!g.paused && g.help == null) return false; g.paused = false; g.help = null; g.turnAt = Date.now(); g.cnt++; return true; }
      if (t === 'pause') { if (g.res || g.paused) return false; g.paused = true; g.cnt++; return true; }
      if (t === 'mood') { if (g.res) return false; g.moodQ = d.id; g.moodA = {}; g.cnt++; return true; }
      if (t === 'moodend') { if (!g.moodQ) return false; g.moodQ = 0; g.moodA = {}; g.turnAt = Date.now(); g.cnt++; return true; }
      if (t === 'god') { if (!startEv(g, d.kind)) return false; g.cnt++; return true; }
      if (t === 'evscore') return scoreEv(g, d.pts, notify);
      if (t === 'evskip') { if (!g.ev) return false; g.ev = null; g.turnAt = Date.now(); g.cnt++; return true; }
      if (t === 'chal') { if (g.res) return false; g.chal = { k: d.k, until: g.plays + alive(g).length }; pushLog(g, { k: 'chal', ch: d.k, s: -1 }); g.cnt++; return true; }
      if (t === 'star') {
        var s = d.seat | 0; if (s < 0 || s >= g.np) return false;
        rec(g, { seat: s, k: 'star', r: d.r || '' });
        addPts(g, s, 'st', 1, notify, d.r || '天神給的星星'); g.cnt++; return true;
      }
      if (t === 'jscore') return scoreJ(g, d.id, d.pts, notify);
      if (t === 'show') { g.cfg.show = d.v === 'end' ? 'end' : 'self'; g.cnt++; return true; }
      if (t === 'grand') {   // 天神隨性點：從現在能用的天神牌裡隨機挑一張，目標也隨機
        var ok = hostGodOK(g); if (!ok.length) return false;
        var rk = pick(ok), rd = { t: 'gcard', k: rk };
        if (NEEDP[rk]) rd.p = Math.floor(Math.random() * g.P.length);
        if (rk === 1) { var cand = alive(g).filter(function (x) { return x !== turnSeat(g); }); rd.s = cand.length ? pick(cand) : turnSeat(g); }
        if (rk === 13) { var two = shuffle(alive(g).slice()); rd.s = two[0]; rd.s2 = two[1]; }
        d = rd; t = 'gcard';
      }
      if (t === 'gcard') {   // 老師（天神）用天神牌：不限次數，但同一張不能連續 3 次
        if (g.res || g.wait) return false;
        var k = d.k | 0, gc = GOD[k]; if (!gc || hostGodOK(g).indexOf(k) < 0) return false;
        var hg = g.hg = g.hg || [];
        var gp = null, gs = null;
        if (NEEDP[k]) { gp = +d.p; if (!(gp >= 0 && gp < g.P.length)) return false; }
        if (k === 1 || k === 13) { gs = +d.s; if (!(gs >= 0 && gs < g.np) || g.out.indexOf(gs) >= 0) return false; }
        var glg = { k: 'g', c: gc.id, s: -1, T: 1, p: gp, d: 0 };
        if (k === 13) { var ga = +d.s2; if (!(ga >= 0 && ga < g.np) || g.out.indexOf(ga) >= 0 || ga === gs) return false; glg.from2 = ga; }
        godFx(g, -1, gc, gp, gs, glg, null, -1);
        hg.push(k); if (hg.length > 6) hg.shift();
        g.cnt++; pushLog(g, glg); return true;
      }
      return false;
    },
    hostBadge: function (g) {
      if (g.help != null) return '🛑 有同學需要休息，請過去看看';
      if (g.jq && g.jq.length) return '🧠 有天神牌等你評分（0～5 分）';
      if (g.ev) return g.cfg.judge === 'teacher' ? '⚡ 等天神評分' : '⚡ 天神時刻進行中';
      if (g.paused) return '⏸️ 暫停中';
      return '';
    },
    drain: function (g) { var e = g.evq || []; g.evq = []; return e; },
    hostRecord: function (gx, e, who) {
      if (!who.sid || who.bot) return;
      gx.rec = gx.rec || {};
      var r = gx.rec[who.sid] = gx.rec[who.sid] || { sid: who.sid, name: who.name, rounds: 0, wins: 0, a: 0, d: 0, s: 0, g: 0, turn: 0, apo: 0, stars: 0, sr: {}, ev: [], moods: [], help: 0, said: {}, pts: 0 };
      r.name = who.name;
      if (e.k === 'play') { r[e.ck] = (r[e.ck] || 0) + 1; }
      else if (e.k === 'turn') r.turn++;
      else if (e.k === 'apo') r.apo++;
      else if (e.k === 'star') { r.stars++; if (e.r) r.sr[e.r] = (r.sr[e.r] || 0) + 1; }
      else if (e.k === 'ev') { r.stars += e.pts; r.ev.push((e.kind === 'chance' ? '機會' : '命運') + '：' + e.q + '（' + e.pts + ' 星）'); }
      else if (e.k === 'mood') r.moods.push(MOODS[e.v][0] + MOODS[e.v][1]);
      else if (e.k === 'help') r.help++;
      else if (e.k === 'pts') r.pts = (r.pts || 0) + e.n;
      else if (e.k === 'end') { r.rounds++; if (e.win) r.wins++; }
    },
    botTurn: function (g, seat, lv) {
      if (blocked(g) || turnSeat(g) !== seat) return null;
      var h = g.hands[seat], n = g.cnt, own = g.own[seat], opts = [];
      h.forEach(function (cid, i) {
        var tg = targets(g, seat, cid); if (!tg) return;
        if (tg.p) tg.p.forEach(function (p) { opts.push({ i: i, c: C(cid), p: p }); });
        else if (tg.s) tg.s.forEach(function (s) { opts.push({ i: i, c: C(cid), s: s }); });
        else opts.push({ i: i, c: C(cid) });
      });
      function A(o) { var a = { t: 'play', i: o.i, n: n }; if (o.p != null) a.p = o.p; if (o.s != null) a.s = o.s; return a; }
      if (!opts.length) return h.length ? { t: 'dump', i: 0, n: n } : null;
      if (lv <= 1) return A(pick(opts));
      var coop = g.mode === 'coop', me = g.P[own].m, ms = g.P.map(function (x) { return x.m; });
      var others = g.P.map(function (x, j) { return j; }).filter(function (j) { return j !== own; });
      var hiO = Math.max.apply(null, others.map(function (j) { return ms[j]; }));
      function score(o) {
        var c = o.c, v = 0, m = o.p != null ? ms[o.p] : 0;
        if (c.k === 'a') v = coop || lv === 2 ? 30 - m * 2 + c.v * 3 : 10 - m * 1.5;
        else if (c.k === 'd') v = coop ? -10 + m * 2 - (m - c.v <= MIN ? 60 : 0) : (lv === 2 ? 2 : 20) + m * 2 + (g.P[o.p].shield ? -15 : 0);
        else switch (c.g) {
          case 3: case 10: v = coop ? 35 - m * 2 : 8 - m * 1.5; break;
          case 7: v = coop ? 50 : 18; break;
          case 8: v = coop ? 45 - m * 2 : 12 - m; break;
          case 9: v = coop || me === Math.min.apply(null, ms) ? 40 : 8; break;
          case 11: v = ms.filter(function (x) { return x <= -5; }).length * (coop ? 30 : 8) + (me <= -5 ? 25 : 0) - 5; break;
          case 4: v = coop ? 0 : (me < hiO ? 10 + (hiO - me) * 3 : -20); break;
          case 6: v = coop ? 20 - m * 1.5 : 4 - m; break;
          case 0: v = 6; break; case 2: case 5: v = 5; break; case 1: v = 4; break; case 12: v = 4; break; case 13: v = 3; break;
        }
        if (lv >= 3 && !coop && c.k === 'd' && m === hiO) v += 15;
        if (!coop && lv >= 2) v += c.k === 'a' ? 20 + c.v * 6 : c.k === 'g' && HELP[c.g] ? 15 + HELP[c.g] * 5 : c.k === 'g' && JUDGE[c.g] ? 28 : 0;   // 助人會得分
        return v + Math.random() * (lv === 2 ? 20 : lv === 3 ? 10 : 4);
      }
      opts.sort(function (a, b) { return score(b) - score(a); });
      if (lv >= 2 && h.every(function (x) { return C(x).k === 'd'; }) && !(g.rdT && g.rdT[seat] === g.plays)) return { t: 'redraw', i: 0, n: n };
      return A(opts[0]);
    },
    hostView: function (g) {
      var o = owners(g), h = '<div class="ad-host">';
      g.P.forEach(function (p, i) {
        var f = FACES[p.f];
        h += '<span class="ad-hp" style="border-color:' + f.c + '"><b>' + f.i + '</b><em class="' + (p.m > 0 ? 'up' : p.m < 0 ? 'dn' : '') + '">' + (p.m > 0 ? '+' : '') + p.m + '</em>' + (o[i] >= 0 ? '<i style="background:' + SEATC[o[i]] + '"></i>' + (g.stars[o[i]] ? '<u>⭐' + g.stars[o[i]] + '</u>' : '') : '<i class="none"></i>') + (p.shield ? '🛡️' : '') + '</span>';
      });
      if (g.ev) h += '<div class="ad-hev">' + (g.ev.k === 'chance' ? '🍀 機會' : '🌀 命運') + '：' + esc(g.ev.q) + '</div>';
      return h + '</div>';
    },
    hostStatus: function (g, nm) { return { t: (g.mode === 'coop' ? '合作・' : '') + '已出牌 ' + g.plays + '／' + g.len * alive(g).length + ' 次' + (g.chal && g.plays < g.chal.until ? '・挑戰中' : ''), c: '' }; }
  };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function knock(g, seat, why) {
    if (g.out.indexOf(seat) >= 0) return;
    var cur = turnSeat(g) === seat;
    g.out.push(seat); g.disc = g.disc.concat(g.hands[seat]); g.hands[seat] = [];
    if (g.ev && g.ev.seat === seat) g.ev = null;
    if (g.help === seat) g.help = null;
    var a = alive(g); if (a.length <= 1) { g.res = a.length ? { w: a[0], why: why } : { w: -1, why: why }; return; }
    if (cur) advance(g);
  }

  /* ---------- 圖像（SVG 臉，表情跟著心情變） ---------- */
  function faceSVG(fi, m) {
    var f = FACES[fi], k = Math.min(m, 10) / 10, my = 66, curve = (k * 14).toFixed(1);
    var mouth = '<path d="M38 ' + my + ' Q50 ' + (my + +curve) + ' 62 ' + my + '" stroke="#5d3a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
    if (m >= 7) mouth = '<path d="M36 63 Q50 84 64 63 Z" fill="#8b2e16"/><path d="M41 66 Q50 72 59 66" fill="#fff"/>';
    if (m <= -10) mouth = '<ellipse cx="50" cy="70" rx="8" ry="6" fill="#5d3a1a"/>';
    var brow = m <= -3 ? '<path d="M30 38 L42 42 M70 38 L58 42" stroke="#5d3a1a" stroke-width="3" stroke-linecap="round"/>' : m >= 3 ? '<path d="M30 39 Q36 34 42 38 M58 38 Q64 34 70 39" stroke="#5d3a1a" stroke-width="3" fill="none" stroke-linecap="round"/>' : '';
    var eyes = m >= 7 ? '<path d="M31 50 Q36 44 41 50 M59 50 Q64 44 69 50" stroke="#3a2412" stroke-width="3.5" fill="none" stroke-linecap="round"/>' : '<circle cx="36" cy="50" r="4.5" fill="#3a2412"/><circle cx="64" cy="50" r="4.5" fill="#3a2412"/>';
    var tears = m <= -6 ? '<path d="M34 56 q-3 8 0 11 q3 -3 0 -11z" fill="#64b5f6"/>' + (m <= -8 ? '<path d="M66 56 q-3 8 0 11 q3 -3 0 -11z" fill="#64b5f6"/>' : '') : '';
    var blush = m >= 3 ? '<circle cx="27" cy="60" r="6" fill="#ff8a80" opacity=".55"/><circle cx="73" cy="60" r="6" fill="#ff8a80" opacity=".55"/>' : '';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="40" fill="' + f.skin + '"/><path d="M12 46 Q14 10 50 10 Q86 10 88 46 Q76 26 50 26 Q24 26 12 46z" fill="#4e342e"/>' + brow + eyes + blush + tears + mouth + '</svg>';
  }
  function meterEl(m) {
    var w = el('div', 'ad-meter'), f = el('i', m > 0 ? 'up' : 'dn');
    f.style.left = (m >= 0 ? 50 : 50 + m * 5) + '%'; f.style.width = Math.min(10, Math.abs(m)) * 5 + '%';
    w.appendChild(f); w.appendChild(el('b')); return w;
  }

  /* ---------- 學生端 ---------- */
  var L = { sel: -1, pick: null, sent: -1, round: -1, key: -1, peek: false, spin: {}, dec: {}, tick: null };
  function short(tb, i) { var s = tb.seats[i]; return s.bot ? '電腦 ' + (i + 1) : s.name.replace(/（.*）/, ''); }
  function who(tb, i) { return i < 0 ? '天神' : i === tb.seat ? '你' : short(tb, i); }
  function fname(v, i) { var f = FACES[v.P[i].f]; return f.i + f.n; }
  function sgn(d) { return d > 0 ? '+' + d : d < 0 ? '' + d : '±0'; }
  function chalText(k) { for (var i = 0; i < CHAL.length; i++) if (CHAL[i][0] === k) return CHAL[i][1]; return ''; }
  function logText(tb, v, lg) {
    if (!lg) return '';
    if (lg.k === 'chal') return '🎯 天神挑戰：' + chalText(lg.ch);
    if (lg.k === 'ev') return '⚡ 天神時刻：' + who(tb, lg.s) + ' 回答了' + (lg.ek === 'chance' ? '機會' : '命運') + '題' + (lg.pts ? '，得到 ' + lg.pts + ' 顆星星' : '');
    var a = who(tb, lg.s), c = lg.c && C(lg.c);
    if (lg.k === 'swap') return a + (lg.all ? ' 手上都是惡魔牌，換了一組新手牌' : lg.dump ? ' 手上的牌都不能用，換了一張新牌' : ' 換了一張手牌');
    var pre = lg.tt ? a + ' 先轉念「' + C(lg.tt.from).r + '」，然後' : a;
    if (lg.k === 'a') return pre + ' 對【' + fname(v, lg.p) + '】說：「' + c.t + '」 ' + sgn(lg.d);
    if (lg.k === 'd') return pre + ' 對【' + fname(v, lg.p) + '】說：「' + c.t + '」 ' + (lg.blocked ? '🛡️ 被守護天使擋下了' : sgn(lg.d));
    var t = '⚡ ' + pre + ' 用了天神牌「' + c.n + '」';
    switch (c.g) {
      case 1: return t + '，下一個換 ' + who(tb, lg.to) + ' 出牌';
      case 2: return t + '，出牌方向反過來了';
      case 3: case 10: case 8: return t + '：【' + fname(v, lg.p) + '】' + sgn(lg.d);
      case 4: return t + '！大家的圖像換過了，按住「我的圖像」看看';
      case 12: return t + '！大家手上的牌洗亂重發了';
      case 13: return t + '：' + who(tb, lg.from2) + ' 和 ' + who(tb, lg.to) + ' 交換了全部手牌';
      case 6: return t + '：【' + fname(v, lg.p) + '】受到保護';
      case 7: return t + '：把「' + C(lg.from).t + '」改成「' + C(lg.from).r + '」【' + fname(v, lg.p) + '】' + sgn(lg.d);
      case 9: case 11: return t + (lg.ps.length ? '：' + lg.ps.map(function (j) { return '【' + fname(v, j) + '】'; }).join('') + '心情變好了' : '（這次沒有圖像需要）');
    }
    return t;
  }
  function cardEl(cid, extra) {
    var c = C(cid), b = el('button', 'ad-card ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? (c.s ? 'devil sour' : 'devil') : 'god') + (c.v === 2 ? ' big' : '') + (extra || '')); b.type = 'button';
    var top = c.k === 'a' ? '😇 ' + (c.v === 2 ? '大天使 +2' : '天使 +1') : c.k === 'd' ? '😈 ' + (c.s ? '酸言酸語 -1' : c.v === 2 ? '大惡魔 -2' : '惡魔 -1') : c.e + ' 天神牌';
    b.innerHTML = '<span class="ad-ct">' + top + '</span>' + (c.k === 'g' ? '<b>' + c.n + '</b><small>' + c.d + '</small>' : '<b>「' + esc(c.t) + '」</b>' + (c.s ? '<small>（' + c.tone + '）</small>' : '<small>' + c.c + '</small>'));
    return b;
  }
  function speech(tb, v, lg, ctx) {
    if (!lg || lg.k === 'swap') return null;
    if (lg.k === 'chal') { var cb = el('div', 'ad-say god'); cb.appendChild(el('div', 'ad-say-hd', '🎯 天神挑戰')); cb.appendChild(el('p', 'ad-say-t sm', chalText(lg.ch))); return cb; }
    if (lg.k === 'ev') { var eb = el('div', 'ad-say god'); eb.appendChild(el('div', 'ad-say-hd', '⚡ 天神時刻結束')); eb.appendChild(el('small', '', logText(tb, v, lg))); return eb; }
    var c = C(lg.c); if (!c) return null;
    var box = el('div', 'ad-say ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? 'devil' : 'god'));
    var hd = el('div', 'ad-say-hd'), dot = el('i'); dot.style.background = SEATC[lg.s]; hd.appendChild(dot);
    if (lg.tt) box.appendChild(el('div', 'ad-say-tt', '💡 先轉念：「' + C(lg.tt.from).r + '」【' + fname(v, lg.tt.p) + '】+1'));
    if (c.k === 'g') {
      hd.appendChild(document.createTextNode(who(tb, lg.s) + ' 用了天神牌'));
      box.appendChild(hd); box.appendChild(el('b', '', c.e + ' ' + c.n));
      box.appendChild(el('small', '', logText(tb, v, lg).replace(/^⚡ .*?」/, '').replace(/^[：，]/, '') || c.d));
      if (c.g === 7) box.appendChild(el('p', 'ad-say-t', '「' + C(lg.from).r + '」'));
      if (c.g === 11) box.appendChild(el('p', 'ad-breathe', '🌬️ 吸氣……吐氣……'));
      return box;
    }
    hd.appendChild(document.createTextNode(who(tb, lg.s) + ' 對【' + fname(v, lg.p) + '】說'));
    box.appendChild(hd);
    box.appendChild(el('p', 'ad-say-t', '「' + c.t + '」'));
    if (c.s) {
      if (lg.ch === 'decode' && !L.dec[v.cnt]) {
        box.appendChild(el('small', '', '語氣：' + c.tone + '　🔍 天神挑戰：大家先猜猜看，這句話真正的意思是什麼？'));
        var rb = el('button', 'ad-btn', '揭曉真正的意思'); rb.type = 'button'; rb.addEventListener('click', function () { L.dec[v.cnt] = 1; ctx.rerender(); }); box.appendChild(rb);
      } else box.appendChild(el('small', '', '語氣：' + c.tone + '　真正的意思：' + c.mean));
    }
    if (lg.ch === 'why' && c.k === 'a') box.appendChild(el('small', 'ad-say-ch', '🌟 挑戰：再加一句具體的理由！'));
    if (lg.ch === 'gentle') box.appendChild(el('small', 'ad-say-ch', '🎵 挑戰：要用最溫柔的語氣喔'));
    box.appendChild(el('em', lg.blocked ? 'blk' : lg.d > 0 ? 'up' : 'dn', lg.blocked ? '🛡️ 被守護天使擋下來了' : '心情 ' + sgn(lg.d)));
    return box;
  }
  mod.onUpdate = function (prev, tb, fx) {
    var v = tb.view; addCustom(v.cx);
    if (L.round !== tb.round) { L.round = tb.round; L.sel = -1; L.pick = null; L.sent = -1; L.key = -1; L.peek = false; }
    if (prev && v.cnt !== L.key && v.log) {
      var lg = v.log, c = lg.c && C(lg.c);
      fx.snd(!c ? 'move' : c.k === 'a' ? 'pop' : c.k === 'd' ? 'cap' : 'check');
      if (c && c.k === 'g' && c.g === 4 && lg.s !== tb.seat && !lg.T) fx.toast('🌪️ 圖像大風吹！按住「我的圖像」看看你現在是誰');
      if (c && c.k === 'g' && (c.g === 0 || c.g === 12 || (c.g === 13 && (lg.to === tb.seat || lg.from2 === tb.seat)))) { L.sel = -1; L.pick = null; if (!lg.T && lg.s !== tb.seat) fx.toast(c.g === 13 ? '🔀 你的手牌被交換了！看看新的手牌' : '🃏 大家的手牌換過了！看看新的手牌'); }
      if (lg.T && c) {   // 老師（天神）臨時出天神牌：取消正在選的牌，提醒大家
        var mid = L.sel >= 0 || L.pick; L.sel = -1; L.pick = null;
        fx.toast('⚡ 天神用了「' + c.e + ' ' + c.n + '」！' + (c.g === 4 ? '按住「我的圖像」看看你現在是誰。' : '') + (v.turn === tb.seat && !tb.res ? (mid ? '剛剛選的牌取消了，請重新選一張。' : '輪到你出牌。') : ''));
      }
      if (v.turn === tb.seat && !tb.res && !v.ev) setTimeout(function () { fx.snd('turn'); }, 500);
    }
    if (v.ev && !L.spin[v.ev.id]) { L.spin[v.ev.id] = Date.now() + 3600; fx.snd('check'); }
    L.key = v.cnt; L.recv = Date.now();
    if (L.sel >= (v.hand ? v.hand.length : 0)) L.sel = -1;
    if (prev === null || (prev && prev.round !== tb.round)) fx.toast((tb.round > 1 ? '第 ' + tb.round + ' 局開始！' : '開始囉！') + '先按住「我的圖像」偷偷看你是誰，不要說出來喔 🤫');
  };
  mod.render = function (box, ctx) {
    var tb = ctx.tb, v = tb.view, seat = tb.seat, out = v.out.indexOf(seat) >= 0;
    var hold = v.paused || v.help || v.ev || (v.moodQ && v.moodMine == null);
    var myTurn = !tb.res && !out && !hold && v.turn === seat && L.sent !== v.cnt;
    var g = { P: v.P, own: [], np: v.np, plays: v.plays, lastDevil: v.lastDevil, out: v.out, hands: [], chal: v.chal ? { k: v.chal, until: 1e9 } : null };
    g.own[seat] = v.mine; g.hands[seat] = v.hand || [];
    var selC = myTurn && L.sel >= 0 ? v.hand[L.sel] : null, tg = selC ? targets(g, seat, selC) : null;
    var stuck = myTurn && v.hand && v.hand.length && !v.hand.some(function (x) { return !!targets(g, seat, x); });
    function send(t, d) { d = d || {}; d.n = v.cnt; L.sent = v.cnt; L.sel = -1; L.pick = null; ctx.send(t, d); ctx.rerender(); }
    if (L.tick) { clearInterval(L.tick); L.tick = null; }
    var wrap = el('div', 'ad-table' + (v.mode === 'coop' ? ' coop' : ''));
    // 狀態
    var st = el('div', 'ad-status');
    if (tb.res) st.textContent = '這局結束了！大家的圖像翻開囉';
    else if (v.wait) st.textContent = '🧠 牌出完了！等天神評完分就公布結果';
    else if (out) st.textContent = '你已經認輸，正在觀看';
    else if (hold) st.textContent = v.ev ? '⚡ 天神時刻！' : v.help ? '有人需要休息一下，請等天神' : v.paused ? '⏸️ 天神暫停了，請看大螢幕' : '請先回答心情快問';
    else if (myTurn) { st.className = 'ad-status me'; st.textContent = stuck ? '你的牌現在都不能用，按下面「🔁 換一張新牌」' : !selC ? '輪到你了！選一張牌' : !tg ? '這張牌現在不能用，換一張' : tg.p ? '點一個發光的圖像' : tg.s ? (C(selC).g === 13 ? '選一個人和你交換手牌' : '選下一個出牌的人') : '按下面的按鈕使用這張牌'; }
    else st.textContent = '輪到 ' + who(tb, v.turn) + ' 出牌…';
    if (v.left != null && !tb.res && !hold) {
      var tm = el('span', 'ad-timer'), end = (L.recv || Date.now()) + v.left * 1000;
      var upd = function () { var s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); tm.textContent = s > 0 ? '⏱️ ' + s + ' 秒' : '⏱️ 時間到，請快點出牌！'; tm.classList.toggle('over', s <= 0); tm.classList.toggle('low', s > 0 && s <= 10); };
      upd(); L.tick = setInterval(function () { if (!document.body.contains(tm)) { clearInterval(L.tick); L.tick = null; return; } upd(); }, 1000);
      st.appendChild(tm);
    }
    wrap.appendChild(st);
    if (v.chal && !tb.res) wrap.appendChild(el('div', 'ad-chal', '🎯 天神挑戰：' + chalText(v.chal).replace(/^\S+ /, '')));
    // 出牌順序
    var ord = el('div', 'ad-order');
    ord.appendChild(el('span', 'ad-dir', v.dir > 0 ? '順序 ➡️' : '順序 ⬅️'));
    var seq = v.order.slice(); if (v.dir < 0) seq.reverse();
    seq.forEach(function (s) {
      var ch = el('span', 'ad-chip' + (s === v.turn && !tb.res ? ' turn' + (s === seat && myTurn ? ' myturn' : '') : '') + (v.out.indexOf(s) >= 0 ? ' out' : '') + (tg && tg.s && tg.s.indexOf(s) >= 0 ? ' tg' : ''));
      ch.setAttribute('data-seat', s);
      var d = el('i'); d.style.background = SEATC[s]; ch.appendChild(d); ch.appendChild(document.createTextNode(s === tb.seat && !v.solo ? '你【' + short(tb, s) + '】' : who(tb, s)));   // 自己的暱稱只有自己看得到
      if (tb.res && v.stars) ch.appendChild(el('u', '', ' ⭐' + (v.stars[s] || 0)));
      if (tg && tg.s && tg.s.indexOf(s) >= 0) ch.addEventListener('click', function () { ctx.snd('tap'); L.pick = { s: s }; ctx.rerender(); });
      ord.appendChild(ch);
    });
    wrap.appendChild(ord);
    if (!tb.res && v.limit) { var left = Math.max(0, v.limit - v.plays), cn = el('div', 'ad-count' + (left <= v.order.length ? ' low' : ''));
      cn.innerHTML = '🃏 這一局全桌還可以出牌 <b>' + left + '</b> 次（已出 ' + v.plays + '／' + v.limit + '，出完就結束）<span>你已經出了 ' + (v.myPlays || 0) + ' 次</span>' + (v.myScore != null ? '<span class="ad-my">⭐ 我的實際得分 ' + v.myScore + '</span>' : '');
      wrap.appendChild(cn); }
    // 圖像
    var grid = el('div', 'ad-faces n' + v.P.length);
    v.P.forEach(function (p, i) {
      var f = FACES[p.f], isT = tg && tg.p && (tg.p.indexOf(i) >= 0 || (i === v.mine && C(selC).g !== 8));
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
    var sp = tb.res ? null : speech(tb, v, v.log, ctx);
    if (sp) wrap.appendChild(sp);
    if (tb.res) wrap.appendChild(debrief(tb, v));
    var lgBox = el('div', 'ad-log'), lgAll = v.logs || [], lgs = lgAll.slice(0, -1).reverse();
    if (!tb.res && lgs.length) { lgBox.appendChild(el('div', 'ad-loghd', '📜 出牌紀錄（最新的在上面，共 ' + lgAll.length + ' 筆）')); lgs.forEach(function (lg) { var li = el('div', 'ad-li'), d = el('i'); d.style.background = lg.s >= 0 ? SEATC[lg.s] : '#29b6f6'; li.appendChild(d); li.appendChild(document.createTextNode(logText(tb, v, lg))); lgBox.appendChild(li); }); wrap.appendChild(lgBox); }
    if (!tb.res && !out && v.hand) {
      var me = el('div', 'ad-me' + (myTurn ? ' turn' : '')); me.setAttribute('data-seat', seat);
      var pk = el('button', 'ad-peek' + (L.peek ? ' on' : '')); pk.type = 'button';
      if (L.peek && v.mine >= 0) { var mf = FACES[v.P[v.mine].f]; pk.innerHTML = '<span class="ad-pk-pic">' + faceSVG(v.P[v.mine].f, v.P[v.mine].m) + '</span><b>' + mf.i + mf.n + '</b><small>心情 ' + sgn(v.P[v.mine].m).replace('±0', '0') + '・不要說出來喔！</small>'; }
      else pk.innerHTML = '<span class="ad-pk-q">🤫</span><b>按住看我的圖像</b><small>只有你自己知道</small>';
      var on = function (e) { e.preventDefault(); if (!L.peek) { L.peek = true; ctx.rerender(); } }, off = function () { if (L.peek) { L.peek = false; ctx.rerender(); } };
      pk.addEventListener('pointerdown', on); pk.addEventListener('pointerup', off); pk.addEventListener('pointerleave', off); pk.addEventListener('pointercancel', off);
      pk.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      me.appendChild(pk);
      var hand = el('div', 'ad-hand');
      v.hand.forEach(function (cid, i) {
        var usable = !!targets(g, seat, cid), b = cardEl(cid, (L.sel === i ? ' sel' : '') + (myTurn && !usable ? ' dim' : ''));
        b.addEventListener('click', function () {
          var c = C(cid);
          if (!myTurn) { ctx.toast(c.k === 'g' ? c.n + '：' + c.d : '「' + c.t + '」'); return; }
          L.sel = L.sel === i ? -1 : i; L.pick = null; ctx.snd('tap'); ctx.rerender();
        });
        hand.appendChild(b);
      });
      me.appendChild(hand);
      wrap.appendChild(me);
      var tools = el('div', 'ad-tools');
      if (stuck) tools.appendChild(ctx.button('ad-btn go', '🔁 換一張新牌（不算出牌）', function () { var i = L.sel >= 0 ? L.sel : 0; L.sel = -1; ctx.send('dump', { i: i, n: v.cnt }); L.sent = v.cnt; ctx.rerender(); }));
      var allD = myTurn && !stuck && v.hand.length && v.hand.every(function (x) { return C(x).k === 'd'; });
      if (allD) tools.appendChild(ctx.button('ad-btn go', '🔄 手上都是惡魔牌，換一組新手牌（不算出牌）', function () { L.sel = -1; L.pick = null; ctx.send('redraw', { i: 0, n: v.cnt }); L.sent = v.cnt; ctx.rerender(); }));
      if (myTurn && tg && tg.now && !L.pick) tools.appendChild(ctx.button('ad-btn go', '⚡ 使用這張牌', function () { L.pick = {}; ctx.rerender(); }));
      if (!v.help && !v.ev) tools.appendChild(ctx.button('ad-btn help', '🛑 我需要休息', function () { if (confirm('要請天神過來嗎？這一桌會先暫停。')) ctx.send('help', {}); }));
      tools.appendChild(ctx.button('ad-btn', '🏳️', function () { if (confirm('確定要認輸嗎？')) ctx.send('resign', {}); }));
      tools.appendChild(ctx.emoteButton('ad-btn'));
      wrap.appendChild(tools);
    }
    if (myTurn && selC && tg && L.pick) wrap.appendChild(confirmBox(tb, v, selC, L.pick, function () { var d = { i: L.sel }; if (L.pick.p != null) d.p = L.pick.p; if (L.pick.s != null) d.s = L.pick.s; ctx.snd('tap'); send('play', d); }, function () { L.pick = null; ctx.rerender(); }));
    // 覆蓋畫面：天神時刻、心情快問、暫停
    if (!tb.res) {
      if (v.ev) wrap.appendChild(evBox(tb, v, ctx));
      else if (v.moodQ && v.moodMine == null && !out) wrap.appendChild(moodBox(v, ctx));
      else if (v.help || v.paused) { var po = el('div', 'ad-ov soft'), pb = el('div', 'ad-ovb god'); pb.appendChild(el('div', 'ad-ovh', v.help ? '🛑 暫停一下' : '⏸️ 天神暫停了')); pb.appendChild(el('p', 'ad-ovhelp', v.help ? '有人需要休息一下，天神馬上過來。大家先等一等。' : '請看大螢幕，聽天神說明。')); po.appendChild(pb); wrap.appendChild(po); }
    }
    box.appendChild(wrap);
    // 出牌紀錄：一次剛好看得到 5 則，其他的用捲軸往下看
    var its = lgBox.querySelectorAll('.ad-li');
    if (its.length > 5) { var b0 = lgBox.getBoundingClientRect(), b5 = its[4].getBoundingClientRect(); if (b5.bottom > b0.top) lgBox.style.maxHeight = Math.ceil(b5.bottom - b0.top + 16) + 'px'; }
  };
  function evBox(tb, v, ctx) {
    var e = v.ev, ov = el('div', 'ad-ov'), bx = el('div', 'ad-ovb god ad-ev'), spinning = Date.now() < (L.spin[e.id] || 0);
    bx.appendChild(el('div', 'ad-ovh', '⚡ 天神時刻'));
    if (spinning) {
      var wheel = el('div', 'ad-wheel'), names = e.cand.map(function (s) { return who(tb, s); });
      var nm = el('b', 'ad-wheel-n', names[0]); wheel.appendChild(nm); bx.appendChild(wheel);
      bx.appendChild(el('p', 'ad-ovhelp', '轉盤轉轉轉……會轉到誰呢？'));
      var k = 0, iv = setInterval(function () { if (!document.body.contains(nm)) return clearInterval(iv); k++; nm.textContent = names[k % names.length]; ctx.snd('tap'); }, 160);
      setTimeout(function () { clearInterval(iv); ctx.rerender(); }, Math.max(50, L.spin[e.id] - Date.now()));
    } else {
      var mine = e.seat === tb.seat;
      bx.appendChild(el('div', 'ad-ev-k ' + e.k, e.k === 'chance' ? '🍀 機會' : '🌀 命運'));
      if (mine) { bx.classList.add('ad-evmine'); bx.appendChild(el('div', 'ad-evme', '🎯 轉到你了！')); }
      bx.appendChild(el('p', 'ad-ovhelp', mine ? '不用出牌，請大聲回答：' : '轉到 ' + who(tb, e.seat) + '！請聽他回答：'));
      bx.appendChild(el('p', 'ad-ovline', e.q));
      bx.appendChild(el('p', 'ad-ovnote', v.judge === 'auto' ? '說完之後按「我說完了」，可以得到 2 分 ⭐' : '說完之後，天神會給分，加進實際得分 ⭐。'));
      if (mine && v.judge === 'auto') { var row = el('div', 'ad-ovbtns'); var b = el('button', 'ad-btn go', '🗣️ 我說完了'); b.type = 'button'; b.addEventListener('click', function () { ctx.send('evdone', {}); }); row.appendChild(b); bx.appendChild(row); }
    }
    ov.appendChild(bx); return ov;
  }
  function moodBox(v, ctx) {
    var ov = el('div', 'ad-ov'), bx = el('div', 'ad-ovb god');
    bx.appendChild(el('div', 'ad-ovh', '😀 心情快問'));
    bx.appendChild(el('p', 'ad-ovhelp', '不是圖像的心情，是「你自己」現在真正的心情。只有天神看得到，其他人看不到。'));
    var row = el('div', 'ad-moods');
    MOODS.forEach(function (m, i) { var b = el('button', 'ad-moodb'); b.type = 'button'; b.innerHTML = '<span>' + m[0] + '</span><small>' + m[1] + '</small>'; b.addEventListener('click', function () { ctx.snd('tap'); ctx.send('mood', { v: i, id: v.moodQ }); }); row.appendChild(b); });
    bx.appendChild(row); ov.appendChild(bx); return ov;
  }
  function confirmBox(tb, v, cid, pick, ok, cancel) {
    var c = C(cid), ov = el('div', 'ad-ov'), bx = el('div', 'ad-ovb ' + (c.k === 'a' ? 'angel' : c.k === 'd' ? 'devil' : 'god'));
    var line = null, help = '', g = { lastDevil: v.lastDevil, plays: v.plays };
    if (v.chal === 'turn' && canTurn(g, tb.seat) && c.g !== 7) { var pre = el('div', 'ad-ovpre'); pre.innerHTML = '<b>💡 第一步：先轉念</b><br>把剛剛那句「' + esc(C(v.lastDevil.c).t) + '」改成好聽的說法念出來，例如：<br><b>「' + esc(C(v.lastDevil.c).r) + '」</b>'; bx.appendChild(pre); }
    if (c.k === 'a' || c.k === 'd') { line = c.t; help = '看著【' + fname(v, pick.p) + '】，大聲把這句話念出來：'; }
    else if (c.g === 7) { line = C(v.lastDevil.c).r; help = '把剛剛那句「' + C(v.lastDevil.c).t + '」改成好聽的說法，大聲念出來：'; }
    else if (c.g === 8) { line = '對不起，剛剛那樣說讓你難過了。'; help = '對【' + fname(v, pick.p) + '】說一句道歉的話，例如：'; }
    else if (c.g === 10) { line = '如果我是' + FACES[v.P[pick.p].f].n + '，我現在覺得' + MOOD(v.P[pick.p].m) + '，因為……'; help = '想一想【' + fname(v, pick.p) + '】的心情，大聲說出來：'; }
    else if (c.g === 11) { help = '請全桌一起深呼吸 3 次：'; line = '吸氣……吐氣……'; }
    else help = c.d + (pick.p != null ? '：【' + fname(v, pick.p) + '】' : pick.s != null ? (c.g === 13 ? '：和 ' + who(tb, pick.s) + ' 交換全部手牌' : '：下一個換 ' + who(tb, pick.s)) : '');
    bx.appendChild(el('div', 'ad-ovh', c.k === 'g' ? c.e + ' ' + c.n : c.k === 'a' ? '😇 天使牌' : '😈 惡魔牌'));
    bx.appendChild(el('p', 'ad-ovhelp', help));
    if (line) bx.appendChild(el('p', 'ad-ovline', '「' + line + '」'));
    if (c.s) bx.appendChild(el('p', 'ad-ovtone', '用這種語氣：' + c.tone));
    if (v.chal === 'gentle' && line) bx.appendChild(el('p', 'ad-ovtone', '🎵 挑戰：用最溫柔的語氣念'));
    if (v.chal === 'why' && c.k === 'a') bx.appendChild(el('p', 'ad-ovtone', '🌟 挑戰：念完再加一句「因為……」說出具體的理由'));
    if (c.k === 'd') bx.appendChild(el('p', 'ad-ovnote', '這是卡片上的話，不是你心裡的話。照卡片念，不要自己加詞。'));
    if (c.k === 'g' && JUDGE[c.g]) bx.appendChild(el('p', 'ad-ovnote', v.solo || v.judge === 'auto' ? '想一想再說，說完可以得到 3 分。' : '先想一想再說出自己的話，天神會依你的回答給 0～5 分。'));
    var row = el('div', 'ad-ovbtns');
    var b1 = el('button', 'ad-btn go', line && c.g !== 11 ? '🗣️ 我念完了，出牌' : c.g === 11 ? '🌬️ 呼吸完了' : '⚡ 確定使用'); b1.type = 'button'; b1.addEventListener('click', ok);
    var b2 = el('button', 'ad-btn', '取消'); b2.type = 'button'; b2.addEventListener('click', cancel);
    row.appendChild(b2); row.appendChild(b1); bx.appendChild(row); ov.appendChild(bx);
    return ov;
  }
  var TIPS = ['我的圖像從 0 變成 ___。', '聽到「___」這句話的時候，我覺得 ___。', '如果我真的這麼難過，我可能會想要 ___。', '我希望別人對我說「___」。'];
  function debrief(tb, v) {
    var w = el('div', 'ad-deb');
    var ms = v.P.map(function (p) { return p.m; }), hi = Math.max.apply(null, ms), lo = Math.min.apply(null, ms);
    if (v.stars) {
      var sb = el('div', 'ad-score'); sb.appendChild(el('h3', '', '⭐ 實際得分（做到「助人」的分數）'));
      var ss = v.order.slice().sort(function (a, b) { return (v.stars[b] || 0) - (v.stars[a] || 0); });
      ss.forEach(function (s) { var c = (v.sc && v.sc[s]) || {}, r = el('div', 'ad-score-r' + (s === tb.seat ? ' me' : ''));
        r.appendChild(el('b', '', (s === tb.seat ? '⭐ 你' : short(tb, s)) + '：' + (v.stars[s] || 0) + ' 分'));
        r.appendChild(el('small', '', '助人牌 ' + ((c.a || 0) + (c.g || 0) + (c.t || 0)) + '・天神評分 ' + (c.j || 0) + '・機會命運 ' + (c.ev || 0) + '・天神星星 ' + (c.st || 0)));
        sb.appendChild(r); });
      sb.appendChild(el('p', 'ad-score-n', '圖像的心情不算分：聽到不同的話會有不同的心情，這是很正常的。'));
      w.appendChild(sb);
    }
    w.appendChild(el('h3', '', '💬 說說看你的感受'));
    var tips = el('div', 'ad-deb-tips'); TIPS.forEach(function (t) { tips.appendChild(el('p', '', t)); }); w.appendChild(tips);
    var list = el('div', 'ad-deb-list');
    v.P.forEach(function (p, i) { list.appendChild(portraitCard(v, i, hi, lo, function (ow) { return ow < 0 ? '沒有人' : ow === tb.seat ? '你' : short(tb, ow); })); });
    w.appendChild(list);
    w.appendChild(el('p', 'ad-deb-end', '🙌 最後請對旁邊的同學，真心說一句天使牌上的話。'));
    return w;
  }
  function portraitCard(v, i, hi, lo, ownerName, big) {
    var p = v.P[i], ow = v.owners ? v.owners[i] : -1, r = el('div', 'ad-deb-row' + (p.m === hi && hi !== lo ? ' hi' : '') + (p.m === lo && hi !== lo ? ' lo' : '') + (big ? ' big' : ''));
    var top = el('div', 'ad-deb-top'); top.innerHTML = '<span class="ad-deb-pic">' + faceSVG(p.f, p.m) + '</span>';
    top.appendChild(el('b', '', fname(v, i) + '（' + ownerName(ow) + '）'));
    top.appendChild(el('span', 'ad-mood ' + (p.m > 0 ? 'up' : p.m < 0 ? 'dn' : ''), sgn(p.m).replace('±0', '0') + ' ' + MOOD(p.m)));
    if (p.m === hi && hi !== lo) top.appendChild(el('em', 'tag hi', '心情最高'));
    if (p.m === lo && hi !== lo) top.appendChild(el('em', 'tag lo', '心情最低'));
    r.appendChild(top);
    if (p.hist && p.hist.length > 1) r.appendChild(spark(p.hist));
    r.appendChild(el('small', '', '收到天使牌 ' + p.ga + ' 張、惡魔牌 ' + p.gd + ' 張'));
    if (p.rec && p.rec.length) {
      var said = el('div', 'ad-deb-said');
      p.rec.slice(big ? -10 : -6).forEach(function (cid) { var c = C(cid); if (!c || c.k === 'g') return; said.appendChild(el('span', c.k === 'a' ? 'a' : 'd', c.t)); });
      r.appendChild(said);
    }
    return r;
  }
  function spark(h) {
    var W = 200, H = 40, n = h.length, top = Math.max(10, Math.max.apply(null, h)), pts = h.map(function (m, k) { return (k * W / (n - 1)).toFixed(1) + ',' + (H / 2 - m * (H / 2 - 1) / (m > 0 ? top : 10)).toFixed(1); }).join(' ');
    var d = el('div', 'ad-spark');
    d.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><line x1="0" x2="' + W + '" y1="' + H / 2 + '" y2="' + H / 2 + '" stroke="#bbb" stroke-dasharray="3 3"/><polyline points="' + pts + '" fill="none" stroke="#7c4dff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    return d;
  }

  /* ---------- 老師端：天神控制台 ---------- */
  var H = { moodId: 0, open: false };
  function hbtn(api, cls, txt, fn) { return api.btn('btn small' + (cls ? ' ' + cls : ''), txt, fn); }
  function ratioRow(api) {
    var cfg = api.cfg(), row = api.el('div', 'ad-hrow ad-ratio'), w = wOf(cfg);
    row.appendChild(api.el('span', 'ad-hl', '⚖️ 牌的比例（惡魔：天使：天神）：'));
    var info = api.el('small', 'empty');
    function upd() { var s = w[0] + w[1] + w[2]; info.textContent = '約 ' + Math.round(DECKN * w[0] / s) + '／' + Math.round(DECKN * w[1] / s) + '／' + (w[2] ? DECKN - Math.round(DECKN * w[0] / s) - Math.round(DECKN * w[1] / s) : 0) + ' 張（一副約 ' + DECKN + ' 張）'; }
    [['😈 惡魔', 0], ['😇 天使', 1], ['⚡ 天神', 2]].forEach(function (k, n) {
      var box = api.el('span', 'ad-step'), num = api.el('b', '', String(w[k[1]]));
      function set(d) { var v = Math.max(0, Math.min(10, w[k[1]] + d)), t = w.slice(); t[k[1]] = v; if (!(t[0] + t[1] + t[2])) return; w = t; cfg.w = w; num.textContent = String(v); upd(); api.save(); }
      box.appendChild(api.el('span', '', k[0] + ' ')); box.appendChild(hbtn(api, '', '－', function () { set(-1); })); box.appendChild(num); box.appendChild(hbtn(api, '', '＋', function () { set(1); }));
      row.appendChild(box); if (n < 2) row.appendChild(api.el('span', 'ad-colon', '：'));
    });
    row.appendChild(hbtn(api, '', '恢復 6：3：1', function () { w = WDEF.slice(); cfg.w = w; [].forEach.call(row.querySelectorAll('.ad-step b'), function (x, i) { x.textContent = String(w[i]); }); upd(); api.save(); }));
    upd(); row.appendChild(info);
    return row;
  }
  function opts(api, label, key, list, def, note, onSet) {
    var cfg = api.cfg(), row = api.el('div', 'ad-hrow'); row.appendChild(api.el('span', 'ad-hl', label));
    list.forEach(function (o) {
      var b = hbtn(api, (cfg[key] == null ? def : cfg[key]) === o[0] ? 'on' : '', o[1], function () { cfg[key] = o[0]; api.save(); if (onSet) onSet(o[0]); [].forEach.call(row.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); });
      row.appendChild(b);
    });
    if (note) row.appendChild(api.el('small', 'empty', note));
    return row;
  }
  mod.hostPanel = function (api) {
    var p = api.el('div', 'panel ad-gp');
    var hd = api.el('div', 'ad-gp-hd'); hd.appendChild(api.el('h3', '', '⚡ 天神控制台'));
    var tg = hbtn(api, '', '⚙️ 上課設定', function () { H.open = !H.open; set.classList.toggle('hidden', !H.open); });
    hd.appendChild(tg); p.appendChild(hd);
    // 上課設定
    var set = api.el('div', 'ad-set' + (H.open ? '' : ' hidden'));
    set.appendChild(api.el('p', 'empty', '設定在「下一局」或新開的桌才會生效。'));
    set.appendChild(opts(api, '📚 本節主題：', 'topic', TOPICS, 'all', '這個主題的牌會變多，機會／命運題只出這個主題'));
    set.appendChild(ratioRow(api));
    set.appendChild(opts(api, '⚡ 天神時刻：', 'godEvery', [[0, '只有老師按才出現'], [2, '每 2 輪自動'], [3, '每 3 輪自動']], 0));
    set.appendChild(opts(api, '⭐ 機會命運評分：', 'judge', [['teacher', '老師評分'], ['auto', '學生說完就自動 +2']], 'teacher'));
    set.appendChild(opts(api, '👀 學生的實際得分：', 'show', [['self', '看得到自己的'], ['end', '結束才公布']], 'self', '隨時可以切換，正在玩的桌也馬上生效；學生只看得到自己的', function (v) { api.actAll({ t: 'show', v: v }); }));
    set.appendChild(opts(api, '⏱️ 出牌倒數：', 'timer', [[0, '關閉'], [30, '30 秒'], [60, '60 秒']], 0, '時間到只會提醒，不會自動出牌'));
    var r2 = api.el('div', 'ad-hrow');
    r2.appendChild(hbtn(api, '', '✏️ 自訂卡片和題目', function () { customEditor(api); }));
    r2.appendChild(hbtn(api, '', '🚫 關掉不適合的句子', function () { offEditor(api); }));
    set.appendChild(r2);
    p.appendChild(set);
    // 遊戲中
    var live = api.el('div', 'ad-hrow');
    live.appendChild(hbtn(api, '', '⏸️ 全班暫停', function () { api.actAll({ t: 'pause' }); api.render(); }));
    live.appendChild(hbtn(api, '', '▶️ 全班繼續', function () { api.actAll({ t: 'resume' }); api.render(); }));
    live.appendChild(hbtn(api, '', '😀 心情快問', function () { H.moodId = Date.now() % 1e9; api.gx().moodId = H.moodId; api.actAll({ t: 'mood', id: H.moodId }); api.render(); moodProj(api); }));
    live.appendChild(hbtn(api, '', '🎲 天神隨性點（每桌各隨機一張天神牌）', function () { var n = api.actAll({ t: 'grand' }); if (!n) alert('目前沒有可以用天神牌的桌'); api.render(); }));
    live.appendChild(hbtn(api, '', '⚡ 天神降臨（每桌各一位）', function () { var n = api.actAll({ t: 'god' }); if (!n) alert('目前沒有可以進行天神時刻的桌（可能已經在進行或已結束）'); }));
    p.appendChild(live);
    var ch = api.el('div', 'ad-hrow'); ch.appendChild(api.el('span', 'ad-hl', '🎯 天神挑戰（下一輪）：'));
    var SHORT = { angel: '😇 只能出天使牌', turn: '💡 惡魔牌要先轉念', gentle: '🎵 最溫柔的語氣', decode: '🔍 一起猜酸話的意思', why: '🌟 天使牌加上理由' };
    CHAL.forEach(function (c) { ch.appendChild(hbtn(api, '', SHORT[c[0]], function () { if (api.actAll({ t: 'chal', k: c[0] })) api.render(); })); });
    p.appendChild(ch);
    var dyn = api.el('div', 'ad-dyn'); dyn.id = 'ad-dyn'; p.appendChild(dyn);
    var after = api.el('div', 'ad-hrow'); after.appendChild(api.el('span', 'ad-hl', '📋 課後：'));
    after.appendChild(hbtn(api, '', '📥 下載課後紀錄表（Excel）', function () { report(api); }));
    after.appendChild(hbtn(api, '', '📝 列印天使任務單', function () { taskSheet(api); }));
    after.appendChild(hbtn(api, '', '🗑️ 清除紀錄', function () { if (confirm('確定要清除這個房間所有學生的課後紀錄嗎？')) { api.gx().rec = {}; api.save(); } }));
    p.appendChild(after);
    return p;
  };
  mod.hostPanelUpdate = function (api) {
    var dyn = document.getElementById('ad-dyn'); if (!dyn) return;
    dyn.innerHTML = '';
    var ts = api.tables();
    // 心情快問的結果
    var any = ts.some(function (T) { return T.g && T.g.moodQ; });
    if (any) {
      var cnt = [0, 0, 0, 0, 0], n = 0, waiting = 0;
      ts.forEach(function (T) { var g = T.g; if (!g || !g.moodQ) return; Object.keys(g.moodA).forEach(function (s) { cnt[g.moodA[s]]++; n++; }); g.hum.forEach(function (h, s) { if (h && g.out.indexOf(s) < 0 && g.moodA[s] == null) waiting++; }); });
      var m = api.el('div', 'ad-alert mood');
      m.appendChild(api.el('b', '', '😀 心情快問：' + n + ' 人回答' + (waiting ? '，還有 ' + waiting + ' 人' : '')));
      m.appendChild(api.el('span', '', MOODS.map(function (x, i) { return x[0] + ' ' + cnt[i]; }).join('　')));
      m.appendChild(hbtn(api, '', '📽️ 投影結果', function () { moodProj(api); }));
      m.appendChild(hbtn(api, 'on', '結束快問、繼續遊戲', function () { api.actAll({ t: 'moodend' }); var o = document.getElementById('h-proj'); if (o) o.remove(); }));
      dyn.appendChild(m);
    }
    ts.forEach(function (T) {
      var g = T.g; if (!g) return;
      if (g.help != null) { var a = api.el('div', 'ad-alert help'); a.appendChild(api.el('b', '', '🛑 第 ' + T.no + ' 桌：' + api.name(T, g.help) + ' 需要休息')); a.appendChild(hbtn(api, 'on', '處理好了，繼續', function () { api.act(T, { t: 'resume' }); })); dyn.appendChild(a); }
      var need = [];
      if (g.jq && g.jq.length) need.push('🧠 ' + g.jq.length + ' 張天神牌等你評分');
      if (g.ev && g.cfg.judge === 'teacher') need.push('⚡ 機會命運等你評分');
      if (need.length) { var e = api.el('div', 'ad-alert ev'); e.appendChild(api.el('b', '', '第 ' + T.no + ' 桌：' + need.join('、'))); if (api.open) e.appendChild(hbtn(api, 'on', '打開第 ' + T.no + ' 桌評分', function () { api.open(T); })); else e.appendChild(api.el('span', 'ad-q', '請點開那一桌評分')); dyn.appendChild(e); }
    });
    var pz = ts.filter(function (T) { return T.g && T.g.paused; }).length;
    if (pz) dyn.appendChild(api.el('div', 'ad-alert', '⏸️ 有 ' + pz + ' 桌暫停中，按「▶️ 全班繼續」恢復'));
  };
  function jqBoxes(T, api) {
    var g = T.g;
    return (g.jq || []).map(function (q) {
      var c = C(q.c), e = api.el('div', 'ad-alert ev');
      e.appendChild(api.el('b', '', '🧠 第 ' + T.no + ' 桌・' + api.name(T, q.s) + ' 用了「' + c.e + ' ' + c.n + '」' + (q.p != null ? '對【' + FACES[g.P[q.p].f].i + FACES[g.P[q.p].f].n + '】' : '')));
      e.appendChild(api.el('span', 'ad-q', q.from ? '把「' + C(q.from).t + '」轉念。聽他說完，給 0～5 分' : '聽他說完自己的答案，給 0～5 分（只加分、不扣分）'));
      [0, 1, 2, 3, 4, 5].forEach(function (n) { e.appendChild(hbtn(api, n >= 4 ? 'on' : '', n + ' 分', function () { api.act(T, { t: 'jscore', id: q.id, pts: n }); api.render(); })); });
      return e;
    });
  }
  function hostTb(T, api) { return { seat: -2, seats: T.seats.map(function (id, i) { return { bot: api.isBot(T, i), name: api.name(T, i) }; }) }; }
  function pstat(g, s) {
    var o = { a: 0, A: 0, d: 0, s: 0, g: 0 };
    (g.logs || []).forEach(function (lg) { if (lg.s !== s || lg.T) return; var c = lg.c && C(lg.c); if (!c) return; if (c.k === 'a') o[c.v === 2 ? 'A' : 'a']++; else if (c.k === 'd') o[c.s ? 's' : 'd']++; else o.g++; });
    return o;
  }
  mod.hostTable = function (T, api) {
    var g = T.g, w = api.el('div', 'ad-ht');
    // 機會／命運評分（這一桌）
    if (g.ev) {
      var e = api.el('div', 'ad-alert ev');
      e.appendChild(api.el('b', '', '⚡ 天神時刻・' + api.name(T, g.ev.seat) + '・' + (g.ev.k === 'chance' ? '🍀 機會' : '🌀 命運')));
      e.appendChild(api.el('span', 'ad-q', g.ev.q));
      if (g.cfg.judge === 'teacher') [[3, '👍 很棒 +3'], [2, '👌 不錯 +2'], [1, '🤔 再想想 +1']].forEach(function (o) { e.appendChild(hbtn(api, o[0] === 3 ? 'on' : '', o[1], function () { api.act(T, { t: 'evscore', pts: o[0] }); api.render(); })); });
      else e.appendChild(api.el('span', 'ad-q', '（學生說完按「我說完了」會自動 +2）'));
      e.appendChild(hbtn(api, '', '跳過', function () { api.act(T, { t: 'evskip' }); api.render(); }));
      w.appendChild(e);
    }
    jqBoxes(T, api).forEach(function (x) { w.appendChild(x); });
    // 這一桌現在的順序和圖像配置（大風吹、換位子之後也會更新）
    var info = api.el('div', 'ad-hinfo'), seq = g.order.slice(); if (g.dir < 0) seq.reverse();
    var or = api.el('div', 'ad-hrow'); or.appendChild(api.el('span', 'ad-hl', '🔄 出牌順序' + (g.dir > 0 ? '（➡️）' : '（⬅️ 反方向）') + '：'));
    seq.forEach(function (s2, k) { var cur = !g.res && s2 === turnSeat(g); var ch = api.el('span', 'ad-hchip' + (cur ? ' cur' : '') + (g.out.indexOf(s2) >= 0 ? ' out' : ''), (cur ? '▶ ' : '') + api.name(T, s2)); ch.style.borderColor = SEATC[s2]; or.appendChild(ch); if (k < seq.length - 1) or.appendChild(api.el('span', 'ad-harr', '→')); });
    info.appendChild(or);
    var pr0 = api.el('div', 'ad-hrow'), ow0 = owners(g); pr0.appendChild(api.el('span', 'ad-hl', '🎭 圖像配置：'));
    g.P.forEach(function (pp, j) { var f = FACES[pp.f]; var ch = api.el('span', 'ad-hchip', f.i + f.n + '＝' + (ow0[j] >= 0 ? api.name(T, ow0[j]) : '沒有人') + '（心情 ' + sgn(pp.m).replace('±0', '0') + (pp.shield ? '・🛡️' : '') + '）'); ch.style.borderColor = f.c; pr0.appendChild(ch); });
    info.appendChild(pr0);
    w.appendChild(info);
    // 老師的天神牌
    if (!g.res) {
      var gw = api.el('div', 'ad-hgod'), hg = g.hg || [], ban = hg.length >= 2 && hg[hg.length - 1] === hg[hg.length - 2] ? hg[hg.length - 1] : -1;
      gw.appendChild(api.el('b', '', '⚡ 天神牌（老師無限使用，同一張不能連續用 3 次）'));
      var rr0 = api.el('div', 'ad-hrow');
      rr0.appendChild(hbtn(api, 'on', '🎲 天神隨性點（隨機用一張）', function () { H.gsel = null; if (!api.act(T, { t: 'grand' })) alert('這一桌現在不能用天神牌'); api.render(); }));
      var lastT = null; (g.logs || []).forEach(function (lg) { if (lg.T) lastT = lg; });
      if (lastT) rr0.appendChild(api.el('small', 'ad-hl', '上一次天神用了：' + logText(hostTb(T, api), { P: g.P }, lastT).replace(/^⚡ 天神 用了天神牌/, '')));
      gw.appendChild(rr0);
      var gr = api.el('div', 'ad-hrow');
      GOD.forEach(function (c) {
        var on = H.gsel && H.gsel.no === T.no && H.gsel.k === c.g;
        var b = hbtn(api, on ? 'on' : '', c.e + ' ' + c.n, function () {
          if (NEEDP[c.g] || c.g === 1 || c.g === 13) { H.gsel = on ? null : { no: T.no, k: c.g }; api.render(); return; }
          if (!api.act(T, { t: 'gcard', k: c.g })) alert('現在不能用這張天神牌'); H.gsel = null; api.render();
        });
        if (c.g === ban || (c.g === 7 && !g.lastDevil) || g.wait) { b.disabled = true; b.classList.add('ad-dis'); }
        b.title = c.d; gr.appendChild(b);
      });
      gw.appendChild(gr);
      if (ban >= 0) gw.appendChild(api.el('small', 'ad-hnote', '「' + GOD[ban].e + ' ' + GOD[ban].n + '」已經連續用了 2 次，下一張請換別的天神牌。'));
      if (!g.lastDevil) gw.appendChild(api.el('small', 'ad-hnote', '轉念牌要在有人剛出完惡魔牌之後才能用。'));
      if (H.gsel && H.gsel.no === T.no) {
        var k = H.gsel.k, pr2 = api.el('div', 'ad-hrow');
        pr2.appendChild(api.el('span', 'ad-hl', GOD[k].e + ' ' + GOD[k].n + '：' + (k === 1 ? '選下一個出牌的人' : k === 13 ? (H.gsel.a == null ? '先選第一個人' : '再選要和「' + api.name(T, H.gsel.a) + '」交換手牌的人') : '選一個圖像')));
        if (k === 13) T.seats.forEach(function (id, i) { if (g.out.indexOf(i) >= 0 || i === H.gsel.a) return; pr2.appendChild(hbtn(api, '', api.name(T, i), function () { if (H.gsel.a == null) { H.gsel.a = i; api.render(); return; } if (!api.act(T, { t: 'gcard', k: 13, s: i, s2: H.gsel.a })) alert('現在不能用這張天神牌'); H.gsel = null; api.render(); })); });
        else if (k === 1) T.seats.forEach(function (id, i) { if (g.out.indexOf(i) >= 0) return; pr2.appendChild(hbtn(api, '', api.name(T, i), function () { api.act(T, { t: 'gcard', k: 1, s: i }); H.gsel = null; api.render(); })); });
        else { var ow = owners(g); g.P.forEach(function (pp, j) { var f = FACES[pp.f]; pr2.appendChild(hbtn(api, '', f.i + f.n + '（' + sgn(pp.m).replace('±0', '0') + '・' + (ow[j] >= 0 ? api.name(T, ow[j]) : '沒有人') + '）', function () { if (!api.act(T, { t: 'gcard', k: k, p: j })) alert('現在不能用這張天神牌'); H.gsel = null; api.render(); })); }); }
        pr2.appendChild(hbtn(api, '', '取消', function () { H.gsel = null; api.render(); }));
        gw.appendChild(pr2);
      }
      w.appendChild(gw);
    }
    if (!g.res) {
      var r1 = api.el('div', 'ad-hrow');
      r1.appendChild(hbtn(api, '', '⚡ 天神降臨（這一桌）', function () { if (!api.act(T, { t: 'god' })) alert('這一桌現在不能進行（可能已經在進行，或沒有真人玩家）'); api.render(); }));
      r1.appendChild(hbtn(api, '', '🍀 指定機會', function () { api.act(T, { t: 'god', kind: 'chance' }); api.render(); }));
      r1.appendChild(hbtn(api, '', '🌀 指定命運', function () { api.act(T, { t: 'god', kind: 'fate' }); api.render(); }));
      r1.appendChild(hbtn(api, '', g.paused ? '▶️ 繼續' : '⏸️ 暫停', function () { api.act(T, { t: g.paused ? 'resume' : 'pause' }); api.render(); }));
      w.appendChild(r1);
    }
    // 給星星
    var sr = api.el('div', 'ad-stars'); sr.appendChild(api.el('b', '', '⭐ 給星星（先點原因，再點學生）'));
    H.reason = H.reason || STAR_R[0];
    var rr = api.el('div', 'ad-hrow');
    STAR_R.forEach(function (r) { var b = hbtn(api, H.reason === r ? 'on' : '', r, function () { H.reason = r; [].forEach.call(rr.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); }); }); rr.appendChild(b); });
    sr.appendChild(rr);
    var pr = api.el('div', 'ad-hrow');
    T.seats.forEach(function (id, i) { if (api.isBot(T, i)) return; pr.appendChild(hbtn(api, '', '⭐ ' + api.name(T, i) + (g.stars[i] ? '（' + g.stars[i] + '）' : ''), function () { api.act(T, { t: 'star', seat: i, r: H.reason }); api.render(); })); });
    sr.appendChild(pr); w.appendChild(sr);
    // 玩家狀況（只有老師看得到）
    var ps = api.el('div', 'ad-ps'); ps.appendChild(api.el('b', '', '👥 玩家狀況（只有老師看得到）'));
    var htb = hostTb(T, api), hv = { P: g.P }, own = g.own;
    T.seats.forEach(function (id, i) {
      var c = (g.sc || [])[i] || {}, st = pstat(g, i), pp = g.P[own[i]], f = FACES[pp.f], key = T.no + '-' + i, open = H.plog === key;
      var r = api.el('div', 'ad-psr');
      r.appendChild(api.el('div', 'ad-psn', api.name(T, i) + (g.out.indexOf(i) >= 0 ? '（已認輸）' : '') + '　⭐ 實際得分 ' + (g.stars[i] || 0)));
      r.appendChild(api.el('div', 'ad-pss', '得分來源：助人牌 ' + ((c.a || 0) + (c.g || 0) + (c.t || 0)) + '・天神評分 ' + (c.j || 0) + '・機會命運 ' + (c.ev || 0) + '・老師星星 ' + (c.st || 0)));
      r.appendChild(api.el('div', 'ad-pss', '出牌：天使 ' + st.a + '・大天使 ' + st.A + '・惡魔 ' + st.d + '・酸言酸語 ' + st.s + '・天神 ' + st.g + '　｜現在的圖像：' + f.i + f.n + ' 心情 ' + sgn(pp.m).replace('±0', '0')));
      r.appendChild(hbtn(api, open ? 'on' : '', open ? '收起出牌紀錄' : '📜 看他的出牌紀錄', function () { H.plog = open ? null : key; api.render(); }));
      if (open) {
        var mine = (g.logs || []).filter(function (lg) { return lg.s === i; }).reverse(), ul = api.el('div', 'ad-pslog');
        if (!mine.length) ul.appendChild(api.el('div', '', '還沒有出牌'));
        mine.forEach(function (lg) { ul.appendChild(api.el('div', '', logText(htb, hv, lg))); });
        r.appendChild(ul);
      }
      ps.appendChild(r);
    });
    w.appendChild(ps);
    // 教學時刻：投影一句話
    var said = (g.logs || []).filter(function (lg) { return (lg.k === 'a' || lg.k === 'd') && C(lg.c); }).reverse();
    if (said.length) {
      var tm = api.el('div', 'ad-teach'); tm.appendChild(api.el('b', '', '📽️ 教學時刻：點一句話投影到大螢幕，全班一起討論（這一局說過的 ' + said.length + ' 句，最新的在上面）'));
      var tl = api.el('div', 'ad-tlist'); tm.appendChild(tl);
      said.forEach(function (lg) { var c = C(lg.c); tl.appendChild(api.btn('ad-tline ' + (c.k === 'a' ? 'a' : 'd'), (c.k === 'a' ? '😇 ' : '😈 ') + c.t + '　（' + api.name(T, lg.s) + '）', function () { api.actAll({ t: 'pause' }); teachProj(api, c); })); });
      w.appendChild(tm);
    }
    if (g.res) w.appendChild(hbtn(api, 'on', '📽️ 分享時刻投影', function () { shareProj(api, T); }));
    return w;
  };
  function teachProj(api, c) {
    var d = api.el('div', 'ad-proj');
    d.appendChild(api.el('div', 'ad-pj-k ' + (c.k === 'a' ? 'a' : 'd'), c.k === 'a' ? '😇 天使的話' : c.s ? '😈 酸言酸語' : '😈 惡魔的話'));
    d.appendChild(api.el('p', 'ad-pj-line', '「' + c.t + '」'));
    if (c.s) d.appendChild(api.el('p', 'ad-pj-sub', '語氣：' + c.tone));
    var qs = c.k === 'a' ? ['聽到這句話，你的心情會怎麼樣？', '為什麼這句話會讓人覺得舒服？', '什麼時候可以對別人說這句話？'] : ['聽到這句話，你的心情會怎麼樣？', c.s ? '這句話表面上在說什麼？真正的意思是什麼？' : '說這句話的人，可能是什麼心情？', '可以怎麼改成好聽的說法？'];
    var ul = api.el('ol', 'ad-pj-q'); qs.forEach(function (q) { ul.appendChild(api.el('li', '', q)); }); d.appendChild(ul);
    if (c.k === 'd') {
      var ans = api.el('div', 'ad-pj-ans hidden');
      if (c.s) ans.appendChild(api.el('p', '', '真正的意思：' + c.mean));
      ans.appendChild(api.el('p', '', '💡 轉念說法：「' + c.r + '」'));
      d.appendChild(api.btn('btn', '揭曉答案', function () { ans.classList.remove('hidden'); this.remove(); }));
      d.appendChild(ans);
    }
    d.appendChild(api.el('p', 'ad-pj-sub', '各桌已經暫停，討論完請按「▶️ 全班繼續」'));
    api.project(d);
  }
  function moodProj(api) {
    var d = api.el('div', 'ad-proj'); d.appendChild(api.el('div', 'ad-pj-k a', '😀 心情快問'));
    d.appendChild(api.el('p', 'ad-pj-sub', '你自己現在真正的心情是？（匿名）'));
    var bars = api.el('div', 'ad-pj-bars'); d.appendChild(bars);
    function draw() {
      var cnt = [0, 0, 0, 0, 0], n = 0;
      api.tables().forEach(function (T) { var g = T.g; if (g && g.moodQ) Object.keys(g.moodA).forEach(function (s) { cnt[g.moodA[s]]++; n++; }); });
      bars.innerHTML = '';
      MOODS.forEach(function (m, i) { var b = api.el('div', 'ad-pj-bar'); b.innerHTML = '<span>' + m[0] + '</span><i style="height:' + (n ? cnt[i] / n * 100 : 0) + '%"></i><b>' + cnt[i] + '</b><small>' + m[1] + '</small>'; bars.appendChild(b); });
    }
    draw(); var o = api.project(d), iv = setInterval(function () { if (!document.body.contains(o)) return clearInterval(iv); draw(); }, 1000);
  }
  function shareProj(api, T) {
    var g = T.g, v = mod.view(g, -1), ms = v.P.map(function (p) { return p.m; }), hi = Math.max.apply(null, ms), lo = Math.min.apply(null, ms);
    var order = v.P.map(function (p, i) { return i; }).sort(function (a, b) { return ms[b] - ms[a]; });
    // 先看心情最高和最低的兩位
    order = [order[0], order[order.length - 1]].concat(order.slice(1, -1));
    var k = 0, d = api.el('div', 'ad-proj share');
    function show() {
      d.innerHTML = '';
      d.appendChild(api.el('div', 'ad-pj-k a', '🗣️ 分享時刻・第 ' + T.no + ' 桌（' + (k + 1) + '／' + order.length + '）'));
      d.appendChild(portraitCard(v, order[k], hi, lo, function (ow) { return ow < 0 ? '沒有人拿這個圖像' : api.name(T, ow); }, true));
      var tips = api.el('div', 'ad-pj-tips'); TIPS.forEach(function (t) { tips.appendChild(api.el('p', '', t)); }); d.appendChild(tips);
      var row = api.el('div', 'row c');
      if (k > 0) row.appendChild(api.btn('btn', '⬅️ 上一位', function () { k--; show(); }));
      if (k < order.length - 1) row.appendChild(api.btn('btn btn-sun', '下一位 ➡️', function () { k++; show(); }));
      else row.appendChild(api.el('p', 'ad-pj-sub', '🙌 最後請對旁邊的同學，真心說一句天使牌上的話。'));
      d.appendChild(row);
    }
    show(); api.project(d);
  }
  function modal(api, title, body, onSave) {
    var ov = api.el('div', 'overlay'), bx = api.el('div', 'panel ad-modal'); ov.appendChild(bx);
    var hd = api.el('div', 'row'); hd.style.justifyContent = 'space-between'; hd.appendChild(api.el('h2', '', title)); hd.lastChild.style.margin = '0';
    hd.appendChild(api.btn('btn small', '✕ 關閉', function () { ov.remove(); })); bx.appendChild(hd);
    bx.appendChild(body);
    var r = api.el('div', 'row c'); r.appendChild(api.btn('btn btn-sun', '💾 儲存', function () { if (onSave() === false) return; api.save(); ov.remove(); })); bx.appendChild(r);
    document.body.appendChild(ov);
  }
  function customEditor(api) {
    var cfg = api.cfg(), b = api.el('div', 'ad-edit');
    b.appendChild(api.el('p', 'empty', '一行一句。可以放班上最近真的聽到的話。請不要寫真實同學的名字。每一句（包括轉念的說法）扣掉標點符號，至少要 10 個字，最多 40 個字。'));
    function area(label, val, ph) { b.appendChild(api.el('h4', '', label)); var t = api.el('textarea'); t.rows = 4; t.value = val; t.placeholder = ph; b.appendChild(t); return t; }
    var cu = cfg.custom || [];
    var ta = area('😇 天使的話（+1）', cu.filter(function (x) { return x.k === 'a' && x.v !== 2; }).map(function (x) { return x.t; }).join('\n'), '例如：你今天排隊排得好整齊！');
    var ta2 = area('😇 大天使的話（+2）', cu.filter(function (x) { return x.k === 'a' && x.v === 2; }).map(function (x) { return x.t; }).join('\n'), '例如：有你在我們這一組真好。');
    b.appendChild(api.el('p', 'empty', '惡魔的話：用「｜」把轉念說法寫在後面，例如：你動作很慢耶，大家都在等你｜慢慢來沒關係，我們會等你。'));
    var td = area('😈 惡魔的話（-1）', cu.filter(function (x) { return x.k === 'd'; }).map(function (x) { return x.t + (x.r ? '｜' + x.r : ''); }).join('\n'), '例如：你動作很慢耶，大家都在等你｜慢慢來沒關係，我們會等你。');
    b.appendChild(api.el('p', 'empty', '機會／命運題：不要提到圖像，也不要指定真實的同學（避免洩漏身分或針對某個人）。'));
    var qs = cfg.qs || [];
    var qc = area('🍀 機會題（正向）', qs.filter(function (x) { return x.k === 'chance'; }).map(function (x) { return x.t; }).join('\n'), '例如：說出一個你最近學會的新本領。');
    var qf = area('🌀 命運題（危機、狀況）', qs.filter(function (x) { return x.k === 'fate'; }).map(function (x) { return x.t; }).join('\n'), '例如：有人一直踢你的椅子，你會怎麼說？');
    function lines(t) { return t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 40); }
    modal(api, '✏️ 自訂卡片和題目', b, function () {
      var out = [];
      lines(ta).forEach(function (t) { out.push({ k: 'a', t: t, v: 1 }); });
      lines(ta2).forEach(function (t) { out.push({ k: 'a', t: t, v: 2 }); });
      lines(td).forEach(function (t) { var p = t.split(/[｜|]/); out.push({ k: 'd', t: p[0].trim(), r: (p[1] || '').trim(), v: 1 }); });
      out = out.filter(function (x) { return x.t; });
      var bad = [];
      out.forEach(function (x) {
        if (wlen(x.t) < MINW) bad.push('「' + x.t + '」只有 ' + wlen(x.t) + ' 個字');
        if (x.k === 'd' && !x.r) bad.push('「' + x.t + '」後面要用「｜」加上轉念的說法');
        else if (x.k === 'd' && wlen(x.r) < MINW) bad.push('轉念「' + x.r + '」只有 ' + wlen(x.r) + ' 個字');
      });
      if (bad.length) { alert('下面這些句子太短了，扣掉標點符號至少要 10 個字，請改長一點再儲存：\n\n' + bad.slice(0, 12).join('\n') + (bad.length > 12 ? '\n……還有 ' + (bad.length - 12) + ' 句' : '')); return false; }
      cfg.custom = out;
      cfg.qs = lines(qc).map(function (t) { return { k: 'chance', t: t }; }).concat(lines(qf).map(function (t) { return { k: 'fate', t: t }; }));
    });
  }
  function offEditor(api) {
    var cfg = api.cfg(), off = (cfg.off || []).slice(), b = api.el('div', 'ad-edit');
    b.appendChild(api.el('p', 'empty', '取消勾選的句子就不會出現在牌堆裡。'));
    [['😇 天使牌', ANGEL], ['😈 惡魔牌', DEVIL]].forEach(function (grp) {
      b.appendChild(api.el('h4', '', grp[0]));
      grp[1].forEach(function (c) {
        var l = api.el('label', 'ad-offl'), i = api.el('input'); i.type = 'checkbox'; i.checked = off.indexOf(c.id) < 0;
        i.addEventListener('change', function () { var k = off.indexOf(c.id); if (i.checked && k >= 0) off.splice(k, 1); if (!i.checked && k < 0) off.push(c.id); });
        l.appendChild(i); l.appendChild(document.createTextNode(c.t + '（' + c.c + '）')); b.appendChild(l);
      });
    });
    modal(api, '🚫 關掉不適合的句子', b, function () { cfg.off = off; });
  }
  function csvCell(x) { x = String(x == null ? '' : x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }
  function report(api) {
    var rec = api.gx().rec || {}, ks = Object.keys(rec).sort();
    if (!ks.length) { alert('還沒有紀錄。學生玩過之後才會有資料。'); return; }
    var head = ['學號', '名字', '玩了幾局', '贏了幾局', '天使牌', '惡魔牌', '酸言酸語牌', '天神牌', '轉念次數', '道歉修復次數', '天神星星', '實際得分', '星星的原因', '機會命運題', '心情快問', '我需要休息'];
    var rows = [head].concat(ks.map(function (k) {
      var r = rec[k];
      return [r.sid, r.name, r.rounds, r.wins, r.a || 0, r.d || 0, r.s || 0, r.g || 0, r.turn, r.apo, r.stars, r.pts || 0, Object.keys(r.sr).map(function (x) { return x + '×' + r.sr[x]; }).join('、'), r.ev.join('；'), r.moods.join(' '), r.help];
    }));
    var d = new Date(), name = '天使與惡魔_課後紀錄_' + d.getFullYear() + (d.getMonth() + 1) + d.getDate() + '.csv';
    api.download(name, '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'));
  }
  function taskSheet(api) {
    var rec = api.gx().rec || {}, ks = Object.keys(rec).sort();
    var page = function (sid, name, n) {
      return '<section><h1>😇 本週天使任務</h1><p class="who">學號：' + (sid || '＿＿＿＿') + '　名字：' + (name ? esc(name) : '＿＿＿＿＿＿') + '</p>' +
        (n ? '<p>這節課你說了 <b>' + n + '</b> 句天使的話，好棒！</p>' : '') +
        '<p>這個星期，請在學校真的對別人說 3 句天使的話，並記下來：</p><table><tr><th>日期</th><th>我對誰說</th><th>我說了什麼</th><th>對方的反應</th><th>我的感覺</th></tr>' +
        '<tr><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td><td></td><td></td></tr></table>' +
        '<p class="tip">可以參考：' + ['你還好嗎？', '需要我幫忙嗎？', '謝謝你幫我。', '要不要跟我們一起玩？', '我相信你做得到！', '對不起，剛剛是我不對。'].join('、') + '</p>' +
        '<p class="sign">家長簽名：＿＿＿＿＿＿　　老師簽名：＿＿＿＿＿＿</p></section>';
    };
    var html = '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>天使任務單</title><style>body{font-family:"Noto Sans TC",sans-serif;margin:0}section{page-break-after:always;padding:24mm 18mm;box-sizing:border-box}h1{text-align:center;font-size:30px;margin:0 0 12px}p{font-size:18px;line-height:1.7}.who{font-size:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:2px solid #555;padding:8px;font-size:16px}td{height:70px}.tip{font-size:15px;color:#555}.sign{margin-top:26px}</style><body>' +
      (ks.length ? ks.map(function (k) { return page(rec[k].sid, rec[k].name, rec[k].a); }).join('') : '') + page('', '', 0) + '<script>setTimeout(function(){print()},400)<\/script></body></html>';
    var w = window.open('', '_blank'); if (!w) { alert('瀏覽器擋住了新視窗，請允許彈出視窗後再按一次。'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  mod.guide = {
    student: [
      { h: '怎麼玩', html: '<ol><li>桌上有一排<b>圖像</b>，每個圖像都有<b>情緒碼錶</b>，一開始都是 0「普通」。心情可以一直往上加（沒有上限），最低是 -10「崩潰」。</li><li>每個人會祕密分到一個圖像。按住「🤫 按住看我的圖像」偷偷看，<b>不要告訴別人</b>你是哪一個！</li><li>每人手上 3 張牌。輪到你時一定要出一張牌（不能 pass），出完自動補到 3 張。</li><li><b>天使牌</b>讓圖像心情變好，<b>惡魔牌</b>讓圖像心情變差。選一個圖像（不能選自己的），<b>看著它大聲念出卡片上的話</b>。</li><li><b>天神牌</b>有特別的功能，例如迴轉、圖像大風吹、守護天使。</li><li><b>⚡ 天神時刻</b>：轉盤會轉到一位玩家回答機會或命運題，答得好可以得到<b>天神星星 ⭐</b>（星星是祕密的）。</li><li>大家都出完規定張數，或有圖像掉到 -10，遊戲就結束，所有人的圖像翻開。</li></ol>' },
      { h: '贏的方法', html: '<p><b>🏆 比賽模式：</b>比的是<b>⭐ 實際得分</b>，最高的人贏。圖像的心情<b>不算分</b>，只用來決定遊戲什麼時候結束（有圖像掉到 -10，或全桌出牌次數到了）。</p><p><b>怎麼得分（只加不扣）：</b>出天使牌 +1、大天使牌 +2；天神祝福、公平之光 +3；守護天使、冷靜時間 +2；轉念牌、道歉修復、換位思考要先想一想再說出自己的話，天神給 0～5 分；機會命運題答得好、天神給的星星也會加分。惡魔牌不扣分，但也不會得分。</p><p><b>🤝 合作模式：</b>結束時，所有人的圖像都在 0 以上，大家一起過關！有圖像掉到 -10 就失敗。</p><table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 贏（或合作過關）</td><td>3 分</td></tr><tr><td>🤝 大家一樣高</td><td>1 分</td></tr><tr><td>💪 其他</td><td>0 分</td></tr></table><p>和電腦玩的不列入總分。</p>' },
      { h: '天神牌', html: '<table class="g-tbl"><tr><th>牌</th><th>功能</th></tr>' + GOD.map(function (c) { return '<tr><td>' + c.e + ' ' + c.n + '</td><td>' + c.d + '</td></tr>'; }).join('') + '</table><p>輪到你時，如果手上 3 張全是惡魔牌，可以按「🔄 換一組新手牌」，不算出牌、一局不限次數。手上的牌都不能用時，也可以換一張新牌。</p>' },
      { h: '說話的規則', html: '<ul><li>惡魔牌上的話是<b>卡片上的話，不是你心裡的話</b>。</li><li>要<b>照卡片念</b>，不可以自己加詞。</li><li>念惡魔牌時看著<b>圖像</b>，不要看著同學。</li><li><b>酸言酸語牌</b>表面上像在稱讚，其實是在說別人不好。卡片上有寫要用什麼語氣，也有寫「真正的意思」。</li><li>不舒服的時候，按「🛑 我需要休息」，天神會過來。</li></ul>' }
    ],
    teacher: [
      { h: '主持流程', html: '<ol><li>首頁「社會技巧/溝通訓練」→「天使與惡魔」。每桌 3～6 人（4～5 人最好）。4 人以下會多放一個沒人拿的圖像，比較不容易猜出誰是誰。</li><li>QR code 上方選<b>玩法</b>（比賽／合作）和<b>每人出牌幾次</b>（每人次數 × 人數＝這一局全桌一共出幾次牌，出完就結束）。建議第一次先玩合作模式。</li><li>老師端就是「天神」：每一桌都看得到每個圖像是誰的（圓點顏色＝玩家），學生看不到。系統會自動擋住學生出牌給自己的圖像。</li><li>上方的「⚡ 天神控制台」有所有老師的功能；點某一桌可以打開那一桌的控制（天神降臨、給星星、教學時刻、分享時刻）。</li></ol>' },
      { h: '天神控制台', html: '<h4>上課前（⚙️ 上課設定）</h4><ul><li><b>本節主題</b>：稱讚與鼓勵、道歉與原諒、不排擠、聽懂酸言酸語、安慰與關心。這個主題的牌會多一份，機會／命運題只出這個主題。</li><li><b>牌的比例</b>：惡魔：天使：天神，各 0～10，預設 6：3：1。一副牌約 120 張，照比例組成（同一句可能出現不只一次）。</li><li><b>自訂卡片和題目</b>：可以加班上真的聽到的話（每句扣掉標點至少 10 個字），也可以自己出機會／命運題。<b>題目不要提到圖像，也不要指定真實的同學</b>。</li><li><b>關掉不適合的句子</b>：班上學生有特別敏感的話，先關掉。</li><li><b>天神時刻</b>自動出現的頻率、<b>評分方式</b>、<b>出牌倒數</b>。</li><li><b>學生的實際得分</b>：看得到自己的／結束才公布，隨時可以切換、馬上生效。</li></ul><h4>實際得分（比賽模式比這個）</h4><ul><li>只算「助人」，只加不扣：天使 +1、大天使 +2、天神祝福／公平之光 +3、守護天使／冷靜時間 +2、天神挑戰先轉念 +1。</li><li>轉念牌、道歉修復、換位思考：學生出牌後控制台會跳出「🧠 等天神評分」，聽完給 0～5 分。全桌出完牌時如果還沒評完，會等你評完才公布結果。</li><li>機會命運題的分數、給星星也會加進實際得分。</li><li>圖像心情不算分，只用來判斷遊戲結束。</li><li>老師端點某一桌，可以看到「👥 玩家狀況」：每個人的實際得分、得分來源、出了哪些牌、現在的圖像和完整出牌紀錄。</li><li>老師也可以點「⚡ 天神牌」直接用任何一張天神牌，次數不限，但同一張不能連續用 3 次。</li></ul><h4>遊戲中</h4><ul><li><b>⏸️ 全班暫停／▶️ 繼續</b>。</li><li><b>📽️ 教學時刻</b>：點某一桌，點一句剛出的話，會投影到大螢幕並自動暫停全班，附討論問題和轉念答案。</li><li><b>😀 心情快問</b>：每個學生點出自己真正的心情，匿名統計後可以投影。</li><li><b>⚡ 天神降臨</b>：轉盤轉到一位學生回答機會（正向）或命運（危機、狀況）題，老師按 👍+3／👌+2／🤔+1 給星星。轉盤轉的是「人」，不會洩漏他的圖像；星星是祕密的，最後才加進分數。</li><li><b>🎯 天神挑戰</b>：下一輪只能出天使牌、惡魔牌要先轉念、用最溫柔的語氣、一起猜酸言酸語的真正意思、天使牌要加上具體理由。</li><li><b>⭐ 給星星</b>：看到學生做得好，點原因再點學生。原因會記在課後紀錄表。</li><li><b>🛑 學生求救</b>：學生按「我需要休息」，那一桌自動暫停，控制台會亮起來。</li></ul><h4>結束後</h4><ul><li><b>📽️ 分享時刻投影</b>：一次一個圖像，先看心情最高和最低的兩位。</li><li><b>📥 課後紀錄表</b>：用學號整理每位學生的出牌、轉念、道歉、星星原因、機會命運題、心情快問，可以用 Excel 打開，當作 IEP／社會技巧目標紀錄。</li><li><b>📝 天使任務單</b>：每位學生一張回家作業，最後附一張空白的。</li></ul>' },
      { h: '上課前', html: '<ul><li>先介紹情緒碼錶（超級開心、開心、有點高興、普通、有點難過、很難過、崩潰），讓學生說說自己現在在哪一格。</li><li>和學生一起念：「卡片上的話不是我心裡的話」。</li><li>酸言酸語牌：先示範同一句「你很棒」用真心的語氣說一次、用酸的語氣說一次，讓學生聽出差別。</li><li>圖像大風吹、大家換位子這些牌會讓事情突然改變，先讓學生看過天神牌清單。</li><li>班上有被霸凌經驗的學生，請先用「關掉不適合的句子」處理。</li></ul>' },
      { h: '結束後的分享', html: '<ol><li><b>出戲：</b>每個人對旁邊的真人同學說一句天使牌的話。</li><li><b>分享：</b>請心情最高和最低的兩位先說，可以用句型：<ul>' + TIPS.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></li><li><b>討論：</b>不一樣的心情會不會讓我們做出不一樣的事？</li><li><b>本週天使任務：</b>發天使任務單，下次上課回報。</li></ol><p>遊戲設計：andice（社會技巧卡牌構思）。保密圖像是為了不讓特定的人成為被針對的一方，每個人都有一樣的機會被稱讚、也承受批評，體會被攻擊的人心裡的感受。</p>' }
    ]
  };
  BG.register('angel', mod);
})();
