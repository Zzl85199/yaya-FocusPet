/* tools/build.js — 把整個專案打包成單一 HTML(dist/yaya3d-bundle.html)
   用法:node tools/build.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 內嵌所有 CSS(含內嵌字型)
html = html.replace(/<link rel="stylesheet" href="css\/([\w.]+)">/g,
  (_, f) => '<style>\n' + fs.readFileSync(path.join(root, 'css', f), 'utf8') + '\n</style>');

// 內嵌所有 JS(含 vendor 的 three.js,打包後完全離線可玩)
html = html.replace(/<script src="js\/([\w.\/-]+)"><\/script>/g,
  (_, f) => '<script>\n' + fs.readFileSync(path.join(root, 'js', f), 'utf8') + '\n</script>');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'yaya3d-bundle.html');
fs.writeFileSync(out, html);
console.log('打包完成 →', out, `(${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
