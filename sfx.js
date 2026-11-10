/* 平台音效：在瀏覽器裡即時合成成小段 WAV，用 <audio> 播放（iPad 開著靜音鍵也聽得到）。
   BGSfx.play('move')；BGSfx.toggle() 開關音效（記在這台裝置） */
window.BGSfx = (function () {
  'use strict';
  var RATE = 22050, KEY = 'bg-sfx-off', off = false;
  try { off = localStorage.getItem(KEY) === '1'; } catch (e) {}
  function wav(samples) {
    var n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s * 32767, true); }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  /* 合成工具 */
  function make(dur, fn) { var n = Math.floor(dur * RATE), a = new Float32Array(n); for (var i = 0; i < n; i++) a[i] = fn(i / RATE); return a; }
  function mix(dur, parts) { var a = new Float32Array(Math.floor(dur * RATE)); parts.forEach(function (p) { var off = Math.floor((p.at || 0) * RATE); for (var i = 0; i < p.s.length && off + i < a.length; i++) a[off + i] += p.s[i]; }); return a; }
  function tone(f, dur, decay, vol, type) {
    return make(dur, function (t) {
      var ph = 2 * Math.PI * f * t, w = type === 'tri' ? 2 / Math.PI * Math.asin(Math.sin(ph)) : Math.sin(ph);
      return w * vol * Math.exp(-t * decay) * Math.min(1, t * 400);
    });
  }
  function clack(vol, pitch) { // 木頭棋子落下：短促噪音＋低音
    var lp = 0;
    return make(.16, function (t) {
      var n = Math.random() * 2 - 1; lp += (n - lp) * .35;
      return (lp * 1.6 * Math.exp(-t * 70) + Math.sin(2 * Math.PI * pitch * t) * .55 * Math.exp(-t * 38)) * vol;
    });
  }
  function bell(f, dur, vol) { // 鐘聲：不和諧泛音
    var ps = [[1, 1], [2.76, .45], [5.4, .25], [8.9, .12]];
    return make(dur, function (t) { var s = 0; ps.forEach(function (p) { s += Math.sin(2 * Math.PI * f * p[0] * t) * p[1] * Math.exp(-t * (2.2 + p[0] * .9)); }); return s * vol * Math.min(1, t * 300); });
  }
  var SPEC = {
    tap: function () { return tone(1250, .06, 60, .25); },
    move: function () { return clack(.85, 180); },
    cap: function () { return mix(.3, [{ s: clack(.9, 150) }, { s: clack(.75, 230), at: .07 }]); },
    check: function () { return mix(.9, [{ s: bell(392, .9, .45) }, { s: clack(.6, 120) }]); },
    win: function () { return mix(1.3, [523, 659, 784, 1047].map(function (f, i) { return { s: tone(f, .7, 4.5, .28, 'tri'), at: i * .13 }; }).concat([{ s: bell(1047, .8, .18), at: .52 }])); },
    lose: function () { return mix(1, [494, 415, 349].map(function (f, i) { return { s: tone(f, .5, 5, .3, 'tri'), at: i * .2 }; })); },
    pop: function () { return make(.14, function (t) { return Math.sin(2 * Math.PI * (500 + 900 * t / .14) * t) * .4 * Math.exp(-t * 26); }); },
    start: function () { return mix(.7, [{ s: tone(659, .35, 7, .3, 'tri') }, { s: tone(988, .5, 5, .3, 'tri'), at: .12 }]); },
    join: function () { return mix(.6, [{ s: tone(880, .4, 8, .22) }, { s: tone(1320, .45, 7, .18), at: .08 }]); },
    turn: function () { return tone(988, .25, 14, .16, 'tri'); },
    error: function () { return mix(.3, [{ s: tone(220, .12, 20, .3, 'tri') }, { s: tone(185, .15, 18, .3, 'tri'), at: .1 }]); }
  };
  var pool = {}, ready = false;
  function build() {
    if (ready) return; ready = true;
    Object.keys(SPEC).forEach(function (k) { var url = wav(SPEC[k]()); pool[k] = { i: 0, a: [new Audio(url), new Audio(url), new Audio(url)] }; });
  }
  var unlocked = false;
  function unlock() { // iPad／iPhone：第一次觸碰時先把每個聲音「解鎖」
    build(); if (unlocked) return; unlocked = true;
    Object.keys(pool).forEach(function (k) { pool[k].a.forEach(function (a) { a.muted = true; var p = a.play(); if (p && p.then) p.then(function () { a.pause(); a.currentTime = 0; a.muted = false; }).catch(function () { a.muted = false; unlocked = false; }); else { a.pause(); a.muted = false; } }); });
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, { passive: true }); });
  function play(k) {
    if (off) return; build();
    var p = pool[k]; if (!p) return;
    var a = p.a[p.i = (p.i + 1) % p.a.length];
    try { a.currentTime = 0; var r = a.play(); if (r && r.catch) r.catch(function () {}); } catch (e) {}
  }
  function toggle() { off = !off; try { localStorage.setItem(KEY, off ? '1' : '0'); } catch (e) {} if (!off) play('tap'); return !off; }
  /* 音效開關按鈕 */
  function button(cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = cls || 'btn small';
    function lbl() { b.textContent = off ? '🔇' : '🔊'; b.title = off ? '音效已關閉，按一下開啟' : '音效開啟中，按一下關閉'; }
    lbl(); b.addEventListener('click', function () { toggle(); lbl(); });
    return b;
  }
  return { play: play, toggle: toggle, on: function () { return !off; }, button: button, unlock: unlock };
})();
