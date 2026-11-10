/* 三色跳棋：學生版玩法說明＋教師版主持說明 */
(function () {
  'use strict';
  function fig(b, n, o, note) { o = o || {}; o.n = n; return '<figure class="g-fig">' + CCK.svg(b, o) + '<figcaption>' + note + '</figcaption></figure>'; }
  // 示範：單跳與連跳
  var B = CCK.init(2), m = CCK.moves(B, 0);
  var start = fig(CCK.init(3), 3, {}, '三人局：紅、黃、藍各佔一個角，要走到正對面的角');
  // 自己組一個連跳盤面
  function demoJump() {
    var b = '.'.repeat(CCK.CELLS.length).split(''), idx = {};
    CCK.CELLS.forEach(function (c, i) { idx[c[0] + ',' + c[1]] = i; });
    var from = idx['0,4'], a1 = idx['0,3'], a2 = idx['0,1'], a3 = idx['1,-2'];
    b[from] = '0'; b[a1] = '1'; b[a2] = '0'; b[a3] = '1';
    b = b.join('');
    var mv = CCK.moves(b, from), far = -1, fl = 0;
    Object.keys(mv).forEach(function (k) { if (mv[k].length > fl) { fl = mv[k].length; far = +k; } });
    return fig(b, 2, { sel: from, dots: Object.keys(mv).map(Number), path: far >= 0 ? mv[far] : null }, '跳過任何一顆彈珠（自己的或別人的都可以），落點是空的就能一直連跳。綠點是可以去的地方');
  }
  var student = [
    { h: '怎麼玩', html:
      '<ol><li>每人有 <b>10 顆彈珠</b>，放在星星的一個角。目標是把全部彈珠移到<b>正對面的角</b>。</li>' +
      '<li>大家輪流，每次移動<b>一顆</b>自己的彈珠。紅色先走。</li>' +
      '<li><b>先點自己的彈珠</b>，棋盤會出現<b>綠點</b>；再點綠點就移動過去。想換一顆就直接點另一顆。</li>' +
      '<li>你的家永遠在畫面<b>下方</b>，往上走就對了。</li>' +
      '<li>格子太小？按棋盤上方的 <b>＋</b> 放大，或兩根手指撐開。</li></ol>' + start },
    { h: '走一步和跳', html:
      '<ul><li><b>走一步</b>：移到旁邊 6 個方向任一個空洞。</li><li><b>跳</b>：旁邊有一顆彈珠、它後面是空洞，就可以跳過去。跳完還能繼續跳，一次跳很遠！</li><li>跳過的彈珠<b>不會被吃掉</b>。</li><li>走一步之後就不能再跳；同一回合只能「走一步」或「一連串跳」。</li></ul>' +
      '<div class="g-figs">' + demoJump() + '</div>' },
    { h: '怎麼贏', html:
      '<p>第一個把對面的角<b>全部填滿</b>的人獲勝（角裡至少要有一顆自己的彈珠，所以故意佔住別人終點的人擋不了太久）。</p>' +
      '<ul><li>兩人局可以提議和棋；三人局不能和棋。</li><li>三人局有人認輸或離開，他的彈珠會被拿走，剩下的人繼續比。</li><li>總步數到 600 步還沒人完成，還沒進終點的彈珠最少的人獲勝。</li></ul>' },
    { h: '小技巧', html:
      '<ul><li><b>搭橋</b>：把彈珠排成一排、中間留空，後面的彈珠就能一路連跳過去。</li><li><b>別留下落後的彈珠</b>：最後一顆彈珠孤零零在家，要一步一步走很久。</li><li>別人的彈珠也可以當跳板，多利用！</li></ul>' },
    { h: '計分方式', html:
      '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 贏</td><td>3 分</td></tr><tr><td>🤝 和棋</td><td>1 分</td></tr><tr><td>💪 輸</td><td>0 分</td></tr></table>' +
      '<p>三人局只有第一名得 3 分，其他人記為輸。和電腦下的另外記錄，不列入總分。</p>' }
  ];
  var teacher = [
    { h: '主持流程', html:
      '<ol><li>在首頁點「三色跳棋」開房間，把 QR code 投影出來。</li><li>左邊「每桌人數」選 <b>2 人</b>或 <b>3 人</b>（預設 3 人），系統湊滿人數就自動開桌，顏色隨機。</li><li>剩下的人數湊不滿一桌時，按「立刻配對」會盡量平均分桌（不會讓一個人落單）。</li><li>右邊每桌棋盤即時更新，點一下放大，綠色虛線是剛剛那一步的跳躍路線。</li></ol>' },
    { h: '規則與教學重點', html:
      '<ul><li>二人局使用正對面的兩個角；三人局使用間隔的三個角，每人 10 顆。</li><li>可以跳過任何人的彈珠，不會吃子，所以非常適合低年級。</li><li>獲勝條件：對面角全部被填滿且至少一顆是自己的（避免故意佔位卡人）。</li><li>600 步上限是防止有人故意拖延；到上限時比還沒進終點的顆數。</li><li>教學重點：空間方向感、規劃連跳路線、「搭橋」合作與阻擋。</li><li>和同學對戰時不能悔棋；只有對手全是電腦時可以。</li></ul>' },
    { h: '電腦對手', html:
      '<table class="g-tbl"><tr><th>強度</th><th>電腦會怎麼下</th></tr><tr><td>🐣 入門</td><td>隨便挑一顆往前走</td></tr><tr><td>🙂 簡單</td><td>大致往前，但常常走得不划算</td></tr><tr><td>🤔 普通</td><td>每一步都挑跳最遠的走法</td></tr><tr><td>🔥 困難</td><td>會先想好下一步，幫自己搭橋連跳</td></tr></table>' +
      '<p>學生可以選 1 或 2 個電腦對手。勝負另外記在積分榜的「對電腦」欄位。</p>' },
    { h: '計分與活動', html:
      '<p>同學對戰：贏 3 分、和 1 分、輸 0 分。三人局只有第一名得分。</p><ul><li><b>跳跳接力</b>：把一桌放大投影，請全班找出「一次能跳最遠的路線」。</li><li><b>兩人賽→三人賽</b>：先用 2 人局學規則，熟了再改成 3 人局。</li></ul>' }
  ];
  BG.games['chinese-checkers'].guide = { student: student, teacher: teacher };
})();
