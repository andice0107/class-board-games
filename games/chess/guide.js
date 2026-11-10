/* 西洋棋：學生版玩法說明＋教師版主持說明 */
(function () {
  'use strict';
  function pos(rows, note, o) {
    var b = rows.join('').replace(/\d/g, function (n) { return '.'.repeat(+n); });
    return '<figure class="g-fig ch-fig">' + CH.svg({ b: b, turn: 'w', castle: '', ep: -1, half: 0 }, o || {}) + '<figcaption>' + note + '</figcaption></figure>';
  }
  function at(s) { return (8 - +s[1]) * 8 + 'abcdefgh'.indexOf(s[0]); }
  function ts(list) { return list.split(' ').map(at); }
  var E = '8';
  var F = {
    start: pos(['rnbqkbnr', 'pppppppp', E, E, E, E, 'PPPPPPPP', 'RNBQKBNR'], '開局擺法：白方在下面先走。皇后站在自己顏色的格子上（白后在白格、黑后在黑格）'),
    king: pos([E, E, E, '3K4', E, E, E, E], '國王：往任何方向走 1 格', { sel: at('d5'), targets: ts('c6 d6 e6 c5 e5 c4 d4 e4') }),
    queen: pos([E, E, E, '3Q4', E, E, E, E], '皇后：直、橫、斜都可以走，格數不限（最強）', { sel: at('d5'), targets: ts('d8 d7 d6 d4 d3 d2 d1 a5 b5 c5 e5 f5 g5 h5 a8 b7 c6 e4 f3 g2 h1 a2 b3 c4 e6 f7 g8') }),
    rook: pos([E, E, E, '3R4', E, E, E, E], '城堡：直走或橫走，格數不限', { sel: at('d5'), targets: ts('d8 d7 d6 d4 d3 d2 d1 a5 b5 c5 e5 f5 g5 h5') }),
    bishop: pos([E, E, E, '3B4', E, E, E, E], '主教：斜走，格數不限（永遠在同一種顏色的格子）', { sel: at('d5'), targets: ts('a8 b7 c6 e4 f3 g2 h1 a2 b3 c4 e6 f7 g8') }),
    knight: pos([E, E, E, '3N4', E, E, E, E], '騎士：走「日」字（先直 2 格再橫 1 格），可以跳過別的棋子', { sel: at('d5'), targets: ts('c7 e7 b6 f6 b4 f4 c3 e3') }),
    pawn: pos([E, E, E, '3p4', '4P3', E, 'P7', E], '士兵：只能往前走 1 格（第一步可以走 2 格）；吃子要斜前方吃', { sel: at('e4'), targets: ts('e5 d5') }),
    castle: pos([E, E, E, E, E, E, 'PPPPPPPP', 'R3K2R'], '入堡：國王往城堡方向走 2 格，城堡跳到國王另一邊', { sel: at('e1'), targets: ts('g1 c1 f1 d1') }),
    ep: pos([E, E, E, '3pP3', E, E, E, E], '吃過路兵：對方士兵剛從起點走 2 格停在你的士兵旁邊，你可以「斜走到它經過的那一格」把它吃掉（只有下一步可以）', { sel: at('e5'), targets: ts('e6 d6') }),
    mate: pos(['3R2k1', '5ppp', E, E, E, E, E, '6K1'], '將死：城堡走到第 8 排，黑國王被自己的士兵擋住，逃不掉也擋不了 → 白方贏', { last: { f: at('d1'), t: at('d8') } })
  };
  var student = [
    { h: '開局與目標', html: '<p>西洋棋兩個人下，<b>白方先走</b>，輪流各走一步。目標是<b>「將死」對方的國王</b>：讓國王被攻擊，而且怎麼走都逃不掉。</p><div class="g-figs">' + F.start + F.mate + '</div>' },
    { h: '棋子怎麼走', html: '<p>點一顆自己的棋子，綠色的點就是它可以走的位置，再點綠點就走過去。走到對方棋子的格子就是<b>吃掉</b>它。</p><div class="g-figs">' + F.king + F.queen + F.rook + F.bishop + F.knight + F.pawn + '</div>' },
    { h: '特殊規則', html: '<ul><li><b>升變</b>：士兵走到最遠的那一排，可以變成皇后、城堡、主教或騎士（通常選皇后）。</li><li><b>入堡</b>：國王和城堡都還沒動過、中間沒有棋子、國王沒有被將軍、經過的格子也沒被攻擊，就可以入堡。</li><li><b>吃過路兵</b>：見下圖。</li><li><b>將軍</b>：國王被攻擊時，一定要馬上解除（逃走、擋住、或吃掉攻擊的棋子）。系統不會讓你走出讓自己國王被吃的棋。</li></ul><div class="g-figs">' + F.castle + F.ep + '</div>' },
    { h: '和棋', html: '<ul><li><b>逼和</b>：輪到你，國王沒被將軍，但所有棋子都沒有合法的步可以走 → 平手。</li><li><b>子力不足</b>：只剩國王（或國王加一個主教／騎士），誰都將不死 → 平手。</li><li><b>三次重複</b>：同一個局面出現三次 → 平手。</li><li><b>50 回合</b>：連續 50 回合沒有吃子、也沒有動士兵 → 平手。</li><li>也可以按「🤝 和棋」向對方提議。</li></ul>' },
    { h: '計分方式', html: '<table class="g-tbl"><tr><th>結果</th><th>得分</th></tr><tr><td>🏆 贏</td><td>3 分</td></tr><tr><td>🤝 和棋</td><td>1 分</td></tr><tr><td>💪 輸</td><td>0 分</td></tr></table><p>和電腦下的另外記錄，不列入總分。和電腦下時可以悔棋，和同學下時不行。</p>' }
  ];
  var teacher = [
    { h: '主持流程', html: '<ol><li>首頁點「西洋棋」開房間，投影 QR code。</li><li>學生掃碼加入，系統兩兩配對，白方先走；再玩一局會黑白交換。</li><li>右側每一桌的棋盤即時更新，被將軍的國王格子會變紅。</li></ol>' },
    { h: '規則說明', html: '<p>本工具採<b>國際標準規則</b>，全部由系統自動判定：入堡、吃過路兵、升變（學生自己選升成什麼）、將死、逼和、三次重複、50 回合、子力不足。學生不可能走出違規的棋。</p><p>棋子中文名稱：國王、皇后、城堡（車）、主教（象）、騎士（馬）、士兵（兵）。</p>' },
    { h: '電腦對手', html: '<table class="g-tbl"><tr><th>強度</th><th>電腦會怎麼下</th></tr><tr><td>🐣 入門</td><td>一半的時候亂走</td></tr><tr><td>🙂 簡單</td><td>只看一步，會吃送上門的棋子</td></tr><tr><td>🤔 普通</td><td>想三步，會保護棋子</td></tr><tr><td>🔥 困難</td><td>想四步以上，還會算完吃子交換</td></tr></table>' },
    { h: '教學建議', html: '<ul><li>第一次教：先只教棋子怎麼走，用「棋子怎麼走」頁投影。特殊規則等學生會下了再教。</li><li>可以先讓學生和「入門」電腦下，練習「將軍」與「將死」的差別。</li><li>西洋棋和象棋很像，可以比較：城堡≈車、騎士≈馬（但不會被絆馬腳）、主教≈象（但可以走很遠、沒有過河限制）。</li></ul>' }
  ];
  BG.games.chess.guide = { student: student, teacher: teacher };
})();
