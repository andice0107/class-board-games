/* 平台背景：漂浮的彩色桌遊符號 */
(function () {
  var s = document.createElement('div'); s.className = 'bg-scene';
  var syms = ['♠', '♥', '♦', '♣', '帥', '●', '▲', '⚄', '+2', '★', '⚀', '♞'], cols = ['#ff6b6b', '#ffc93c', '#2ec4b6', '#7b5cff', '#4ea8ff', '#ffffff'];
  for (var i = 0; i < 18; i++) {
    var f = document.createElement('div'); f.className = 'floaty';
    f.textContent = syms[i % syms.length];
    f.style.left = (i * 37 % 100) + Math.random() * 5 + '%';
    f.style.top = (i * 53 % 100) + Math.random() * 5 + '%';
    f.style.fontSize = 22 + Math.random() * 46 + 'px';
    f.style.color = cols[i % cols.length];
    f.style.animationDuration = 7 + Math.random() * 8 + 's';
    f.style.animationDelay = -Math.random() * 10 + 's';
    s.appendChild(f);
  }
  document.body.insertBefore(s, document.body.firstChild);
})();
