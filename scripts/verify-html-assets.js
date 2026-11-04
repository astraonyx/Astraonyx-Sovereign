const fs = require('fs');
const path = require('path');

function checkHtml(file) {
  const html = fs.readFileSync(path.resolve(__dirname, '../dashboard', file), 'utf8');
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/g;
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  console.log(`\n=== Checking dashboard/${file} ===`);
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('http') || href.startsWith('//') || href.startsWith('data:')) continue;
    const clean = href.split('?')[0].replace(/^\//, '');
    const target = path.resolve(__dirname, '../dashboard', clean);
    if (fs.existsSync(target)) {
      console.log('  ✓ [CSS]', href);
    } else {
      console.error('  ❌ MISSING LINK:', href, '->', target);
      missing++;
    }
  }
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('http') || src.startsWith('//')) continue;
    const clean = src.split('?')[0].replace(/^\//, '');
    const target = path.resolve(__dirname, '../dashboard', clean);
    if (fs.existsSync(target)) {
      console.log('  ✓ [JS]', src);
    } else {
      console.error('  ❌ MISSING SCRIPT:', src, '->', target);
      missing++;
    }
  }
}

let missing = 0;
['index.html', 'login.html', 'welcome.html', 'games.html', 'downloader.html', 'hermes.html', 'terminal.html'].forEach(checkHtml);

console.log(`\nTotal missing assets across all HTML files: ${missing}`);
process.exit(missing > 0 ? 1 : 0);
