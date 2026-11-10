/* 撲克牌・十點半：和電腦莊家比，誰最接近 10.5 點。共用 blackjack.js 裡的 BANKER 架構。
   A＝1 點，2～10 照數字，J、Q、K＝半點。超過 10.5 就爆。
   特殊牌型：剛好 10.5 叫「十點半」（贏 2 倍）；拿到 5 張還沒爆叫「五小」（贏 3 倍）。點數一樣算平手。 */
(function () {
  function pts(c) { var r = c[0]; return r === 'A' ? 1 : 'JQK'.indexOf(r) >= 0 ? .5 : r === 'T' ? 10 : +r; }
  function value(cs) {
    var t = cs.reduce(function (a, c) { return a + pts(c); }, 0), bust = t > 10.5;
    var five = !bust && cs.length >= 5, exact = t === 10.5;
    var rank = bust ? 0 : five ? 3 : exact ? 2 : 1;
    return { v: t, bust: bust, five: five, exact: exact, rank: rank, auto: five || exact, tag: five ? '五小！' : exact ? '十點半！' : '' };
  }
  function cards(list, note) { return '<figure class="g-fig"><div class="pk-figrow">' + list.map(function (c) { return '<span>' + PK.svg(c) + '</span>'; }).join('') + '</div><figcaption>' + note + '</figcaption></figure>'; }
  BANKER({
    id: 'ten-half', startCards: 1, dealerStart: 1, hideAll: true, value: value, fmt: function (v) { return String(v); },
    dealerHits: function (v, n) { return !v.bust && !v.auto && v.v < 7; },
    settle: function (p, d) {
      if (p.bust) return -1;
      if (p.five) return d.five ? 0 : 3;
      if (d.bust) return p.exact ? 2 : 1;
      if (d.five) return -1;
      if (p.exact) return d.exact ? 0 : 2;
      if (d.exact) return -1;
      if (p.v > d.v) return 1; if (p.v < d.v) return -1; return 0;
    },
    botHit: function (v, up, level, n) {
      if (v.auto) return false;
      if (level <= 1) return v.v < 5 || (v.v < 9 && Math.random() < .5);
      if (level === 2) return v.v < 6;
      if (n >= 4 && v.v <= 6.5) return true; // 拚五小
      return v.v < (level >= 4 ? 7 : 6.5);
    },
    levelDesc: ['隨意補牌', '不到 6 點就補', '7 點以下會補', '會算爆掉的機率，還會拚五小'],
    guide: {
      student: [
        { h: '怎麼玩', html: '<ol><li>電腦當<b>莊家</b>，每人有 <b>10 個籌碼</b>，一局 5 回合。</li><li>每回合先選要押 1、2 或 3 個籌碼。</li><li>每人先發 <b>1 張牌</b>，莊家也拿 1 張蓋著。</li><li>想更接近 <b>10 點半</b>就按「補一張」，覺得夠了就「停牌」。<b>超過 10.5 就爆了</b>，直接輸。</li><li>大家都停牌後莊家翻牌，不到 7 點一定要補牌。</li><li>比莊家更接近 10.5 就贏。</li></ol>' },
        { h: '點數與牌型', html: '<ul><li>A 算 <b>1 點</b>，2～10 照數字。</li><li>J、Q、K 都算<b>半點</b>（0.5）。</li><li><b>十點半</b>：剛好 10.5 點，贏 2 倍。</li><li><b>五小</b>：拿到 5 張牌還沒爆，贏 3 倍（最大）。</li><li>點數一樣算平手，不輸不贏。</li></ul>' + cards(['Tc', 'Kh'], '10＋半點＝十點半') + cards(['Ac', '2d', 'Js', '3h', 'Qd'], '五張沒爆：五小！') },
        { h: '計分方式', html: '<p>5 回合結束時<b>籌碼最多</b>的人獲勝（積分榜 +3 分），一樣多就平手。只有自己一個人和莊家玩時不列入積分榜。</p>' }
      ],
      teacher: [
        { h: '主持流程', html: '<ol><li>首頁「撲克牌」→「十點半」開房間，每桌 1～6 人。</li><li>大家同時下注、同時補牌，莊家固定是電腦（不到 7 點一定補）。</li></ol>' },
        { h: '規則說明', html: '<p>十點半各地玩法不太一樣，本工具採用：J／Q／K 半點、十點半贏 2 倍、五小贏 3 倍、同點數平手、莊家 7 點以上停。如果班上習慣不同（例如同點莊家贏），請告訴開發者調整。</p><h4>教學重點</h4><ul><li>小數加法：半點的累加（3.5＋0.5＝4）。</li><li>機率直覺：已經 8 點，下一張爆掉的牌有幾種？</li></ul>' }
      ]
    }
  });
})();
