const fs = require('fs');
const path = require('path');

async function main() {
  console.log('START_CUTOUT');

  // Try to load an image library
  let Jimp;
  try {
    const jimpPkg = require('jimp');
    Jimp = jimpPkg.Jimp || jimpPkg;
  } catch (e) {
    console.log('Jimp load error:', e.message);
  }

  // Check what files exist
  const candidates = [
    'public/icons/astraonyx-app-icon.png',
    'public/icons/astraonyx-icon.png',
    '1.webp',
    '2.webp',
    '3.webp'
  ];

  for (const c of candidates) {
    const full = path.join(process.cwd(), c);
    console.log(c, fs.existsSync(full) ? 'EXISTS' : 'NOT_FOUND');
  }

  if (Jimp) {
    console.log('JIMP_AVAILABLE');
  }
}

main().catch(err => console.error(err));
