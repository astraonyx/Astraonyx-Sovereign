const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.resolve(ROOT_DIR, 'astraonyx-ataraxia-source-clean.zip');

// Directories to completely skip
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  '.cache',
  'venv',
  '__pycache__',
  'dist',
  '.git',
  '.skills',
  '.agents',
  '_archive_dead_code',
  '_archive',
  'backups',
  'auth_info',
  'instances',
  'logs',
  'tmp',
  'uploads',
  'output',
  'outputs',
  'models' // Binary AI weights
]);

// File extensions to completely skip
const EXCLUDED_EXTENSIONS = new Set([
  '.zip',
  '.sqlite',
  '.sqlite-shm',
  '.sqlite-wal',
  '.db',
  '.log',
  '.onnx',
  '.bin',
  '.pem',
  '.key'
]);

// Specific files to completely skip
const EXCLUDED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.test',
  'skills-lock.json',
  'merge_parts.bat',
  'merge_parts.sh'
]);

// Sanitized dashboard_users.json content (removes plain passwords, tokens, real phone numbers)
const SANITIZED_USERS_JSON = JSON.stringify([
  {
    "id": "user_polaris_master",
    "username": "owner_polaris",
    "phoneNumber": "6281200000000",
    "passwordHash": "$2b$10$6vSmAQv1LRzMk/YO4zhZ.ePDv8mN06qCZUrNdpyIUV.is2rxvVUoy",
    "role": "cosmos",
    "require2FA": false,
    "displayName": "Polaris Administrator",
    "bio": "Cosmos Administrator of Astraonyx Polaris",
    "avatarUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=PolarisMaster",
    "createdAt": "2026-10-22T00:00:00.000Z",
    "updatedAt": "2026-10-22T00:00:00.000Z"
  }
], null, 2);

function shouldExclude(relPath, isDir, filename) {
  const parts = relPath.split(/[/\\]/);
  for (const part of parts) {
    if (EXCLUDED_DIRS.has(part)) {
      return true;
    }
  }

  if (isDir) return false;

  if (EXCLUDED_FILES.has(filename)) {
    return true;
  }

  const ext = path.extname(filename).toLowerCase();
  if (EXCLUDED_EXTENSIONS.has(ext)) {
    return true;
  }

  return false;
}

function collectFiles(dir, baseDir = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExclude(relPath, true, entry.name)) {
        results = results.concat(collectFiles(fullPath, relPath));
      }
    } else if (entry.isFile()) {
      if (!shouldExclude(relPath, false, entry.name)) {
        results.push({ fullPath, relPath, name: entry.name });
      }
    }
  }

  return results;
}

async function createCleanZip() {
  console.log('========================================================');
  console.log('📦 PACKING CLEAN SOURCE CODE ARCHIVE (ANTI-SENSITIF)');
  console.log('========================================================\n');

  if (fs.existsSync(OUTPUT_ZIP)) {
    console.log(`Menghapus arsip zip lama: ${path.basename(OUTPUT_ZIP)}`);
    fs.unlinkSync(OUTPUT_ZIP);
  }

  console.log('Memindai direktori proyek...');
  const files = collectFiles(ROOT_DIR);
  console.log(`Ditemukan ${files.length} berkas sumber penting untuk dimasukkan.\n`);

  const output = fs.createWriteStream(OUTPUT_ZIP);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const bytes = archive.pointer();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      console.log(`\n✓ Arsip berhasil dibuat: ${path.basename(OUTPUT_ZIP)}`);
      console.log(`  Ukuran Arsip: ${mb} MB (${bytes.toLocaleString()} bytes)`);

      // Verify the generated zip
      console.log('\n--- Verifikasi Integritas Arsip ZIP ---');
      const zip = new AdmZip(OUTPUT_ZIP);
      const zipEntries = zip.getEntries();
      console.log(`  Total entri dalam ZIP: ${zipEntries.length}`);

      let leaked = 0;
      for (const e of zipEntries) {
        const entryName = e.entryName;
        const parts = entryName.split('/');
        const fileName = parts[parts.length - 1];

        if (
          parts.includes('node_modules') ||
          parts.includes('.skills') ||
          parts.includes('.agents') ||
          parts.includes('_archive_dead_code') ||
          parts.includes('auth_info') ||
          parts.includes('instances') ||
          parts.includes('.next') ||
          parts.includes('venv') ||
          parts.includes('outputs') ||
          parts.includes('uploads') ||
          parts.includes('models') ||
          fileName.endsWith('.sqlite') ||
          fileName.endsWith('.sqlite-shm') ||
          fileName.endsWith('.sqlite-wal') ||
          fileName === '.env' ||
          fileName.endsWith('.zip') ||
          fileName.endsWith('.onnx') ||
          fileName.endsWith('.bin')
        ) {
          console.error(`  ❌ KEBOCORAN DITEMUKAN: ${entryName}`);
          leaked++;
        }
      }

      if (leaked === 0) {
        console.log('  ✓ 100% BERSIH: Tidak ada berkas sensitif, skill, node_modules, atau sampah!');
      } else {
        console.error(`  ⚠️ Peringatan: Terdapat ${leaked} berkas yang melanggar aturan filter!`);
      }

      resolve({ bytes, count: files.length, leaked });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    for (const file of files) {
      const normalizedRelPath = file.relPath.replace(/\\/g, '/');

      // Special case: sanitize database/dashboard_users.json
      if (normalizedRelPath === 'database/dashboard_users.json') {
        archive.append(SANITIZED_USERS_JSON, { name: normalizedRelPath });
        continue;
      }

      archive.file(file.fullPath, { name: normalizedRelPath });
    }

    archive.finalize();
  });
}

createCleanZip().catch((err) => {
  console.error('Gagal membuat ZIP:', err);
  process.exit(1);
});
