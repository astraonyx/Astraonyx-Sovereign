const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, '../dashboard/welcome.html'), 'utf8');
const regex = /<(?:img|image)[^>]+(?:src|href)=["']([^"']+)["']/g;
let match;
let missing = 0;

console.log('=== Checking images in dashboard/welcome.html ===');
while ((match = regex.exec(html)) !== null) {
  const assetPath = match[1];
  const target = path.resolve(__dirname, '../dashboard', assetPath);
  const exists = fs.existsSync(target);
  console.log(`  ${exists ? '✓' : '❌'} ${assetPath}`);
  if (!exists) missing++;
}

console.log(`\nMissing image assets: ${missing}`);
process.exit(missing > 0 ? 1 : 0);
