#!/bin/sh
# 更新版本號，讓瀏覽器一定載入最新的檔案（避免舊快取）
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(src|href)=\"((decor|net|sfx|games|host|player)\.js|platform\.css|vendor/[a-z.]+\.js)(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" index.html host.html play.html
sed -i -E "s#^BG.VER = '[0-9]+';#BG.VER = '$V';#" games.js
grep -q "^BG.VER" games.js || sed -i "/^window.BG = /a BG.VER = '$V';" games.js
echo $V > version.txt
echo $V
