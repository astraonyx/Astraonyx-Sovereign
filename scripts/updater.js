#!/usr/bin/env node
/**
 * scripts/updater.js — Polaris & Astraonyx Safe Snapshot Updater Engine
 * 
 * Fitur:
 * 1. Targeted Safety Backup otomatis ke folder backups/backup-<timestamp>/
 * 2. Proteksi ketat folder data sensitif: auth_info, database, instances, uploads, logs, tmp, bin, .env, node_modules
 * 3. Pemindahan & pengamanan legacy dashboard ke _archive_dead_code/legacy-dashboard/ termasuk aset tarot
 * 4. Smart merge untuk config.js, server.js, index.js, dan package.json (zero regression)
 * 5. Ekstraksi modul snapshot baru (dashboard, server/services, server/routes/ext, plugins/denia, commands)
 * 6. Validasi sintaks otomatis (node --check) untuk semua file JS
 * 7. Dukungan rollback instan: node scripts/updater.js --rollback
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

// Folder dan berkas yang DILARANG KERAS ditimpa oleh updater
const PROTECTED_PATTERNS = [
  /^database([\\/]|$)/i,
  /^auth_info([\\/]|$)/i,
  /^instances([\\/]|$)/i,
  /^uploads([\\/]|$)/i,
  /^logs([\\/]|$)/i,
  /^tmp([\\/]|$)/i,
  /^bin([\\/]|$)/i,
  /^\.env($|\.)/i,
  /^node_modules([\\/]|$)/i,
  /^\.git([\\/]|$)/i,
  /^backups([\\/]|$)/i
];

function isProtected(relPath) {
  const norm = relPath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
  return PROTECTED_PATTERNS.some(regex => regex.test(norm));
}

// Bantuan pencarian file zip snapshot default
function findDefaultZip() {
  const primary = 'C:\\Users\\astra\\Downloads\\astraonyx-ataraxia-rombak-snapshot.zip';
  if (fs.existsSync(primary)) return primary;

  const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\astra', 'Downloads');
  if (fs.existsSync(downloadsDir)) {
    const files = fs.readdirSync(downloadsDir)
      .filter(f => /astra.*snapshot.*\.zip$|rombak.*\.zip$/i.test(f))
      .map(f => path.join(downloadsDir, f));
    if (files.length > 0) {
      files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      return files[0];
    }
  }

  const localZips = fs.readdirSync(PROJECT_ROOT)
    .filter(f => /snapshot.*\.zip$/i.test(f))
    .map(f => path.join(PROJECT_ROOT, f));
  if (localZips.length > 0) return localZips[0];

  return null;
}

// Helper salin direktori rekursif
function copyDirSync(src, dest, excludeDirs = []) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ----------------------------------------------------
// FUNGSI ROLLBACK
// ----------------------------------------------------
function executeRollback(targetBackupDir) {
  console.log('\n========================================================');
  console.log('🔄 [Polaris Updater] MEMULAI PROSES ROLLBACK');
  console.log('========================================================\n');

  if (!fs.existsSync(BACKUPS_DIR)) {
    console.error('❌ Folder backups/ tidak ditemukan. Tidak ada backup untuk di-rollback.');
    process.exit(1);
  }

  let backupDir = targetBackupDir;
  if (!backupDir) {
    const backups = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('backup-') && fs.statSync(path.join(BACKUPS_DIR, f)).isDirectory())
      .sort()
      .reverse();
    if (backups.length === 0) {
      console.error('❌ Tidak ditemukan folder backup di', BACKUPS_DIR);
      process.exit(1);
    }
    backupDir = path.join(BACKUPS_DIR, backups[0]);
  } else if (!path.isAbsolute(backupDir)) {
    backupDir = path.join(BACKUPS_DIR, backupDir);
  }

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Folder backup ${backupDir} tidak ditemukan.`);
    process.exit(1);
  }

  const manifestPath = path.join(backupDir, 'backup-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ Manifest tidak ditemukan di ${manifestPath}.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`📦 Memulihkan backup: ${path.basename(backupDir)}`);
  console.log(`📅 Dibuat pada: ${manifest.timestamp}`);
  console.log(`📁 Jumlah file yang dipulihkan: ${manifest.files.length}`);

  let restored = 0;
  for (const rel of manifest.files) {
    const bkpFile = path.join(backupDir, 'files', rel);
    const targetFile = path.join(PROJECT_ROOT, rel);
    if (fs.existsSync(bkpFile)) {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.copyFileSync(bkpFile, targetFile);
      restored++;
    }
  }

  console.log(`✅ Rollback berhasil! ${restored} file telah dikembalikan.`);
  runSyntaxVerification();
}

// ----------------------------------------------------
// FUNGSI VALIDASI SINTAKS JS
// ----------------------------------------------------
function runSyntaxVerification() {
  console.log('\n========================================================');
  console.log('🔍 [Polaris Verification] MENGECEK SINTAKS KODE');
  console.log('========================================================\n');

  const vm = require('vm');
  const specificFiles = [
    'server.js',
    'index.js',
    'config.js',
    'scripts/updater.js'
  ];

  const scanDirs = ['server', 'lib', 'astraonyx', 'commands', 'dashboard/app'];
  const filesToCheck = [...specificFiles];

  function collectJs(dir) {
    const fullDir = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullDir)) return;
    for (const item of fs.readdirSync(fullDir)) {
      if (['node_modules', 'dist', 'vendor', '_archive_dead_code', 'backups'].includes(item)) continue;
      const sub = path.join(dir, item);
      const fullSub = path.join(PROJECT_ROOT, sub);
      const stat = fs.statSync(fullSub);
      if (stat.isDirectory()) {
        collectJs(sub);
      } else if (item.endsWith('.js')) {
        filesToCheck.push(sub);
      }
    }
  }

  for (const d of scanDirs) {
    collectJs(d);
  }

  let pass = 0;
  let fail = 0;

  for (const rel of filesToCheck) {
    const full = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    try {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('import ') || code.includes('export ') || rel.includes('dashboard')) {
        if (typeof vm.SourceTextModule === 'function') {
          new vm.SourceTextModule(code, { identifier: rel });
        } else {
          execFileSync(process.execPath, ['--check', full], { timeout: 3000, stdio: 'ignore' });
        }
      } else {
        new vm.Script(code, { filename: rel });
      }
      pass++;
    } catch (err) {
      console.error(`  ❌ ERROR: ${rel} -> ${err.message}`);
      fail++;
    }
  }

  console.log(`  ✓ Telah memeriksa total ${filesToCheck.length} berkas JavaScript.`);
  console.log(`\nHasil validasi: ${pass} lolos, ${fail} galat.`);

  if (fail > 0) {
    console.error('⚠️  Perhatian: Terdapat galat sintaks pada file di atas.');
    return false;
  }
  return true;
}

// ----------------------------------------------------
// SMART MERGE CONFIG.JS
// ----------------------------------------------------
function mergeConfigJs(localConfigContent, zipConfigContent) {
  // Jika lokal sudah memiliki tuning cleanup scheduler & tmp paths baru, kita pertahankan
  if (localConfigContent.includes('tmpApkBuilds') && localConfigContent.includes('cleanup:')) {
    console.log('  ℹ️  config.js: Mempertahankan ekstensi path tmp & tuning cleanupScheduler lokal.');
    return localConfigContent;
  }
  return zipConfigContent;
}

// ----------------------------------------------------
// SMART MERGE SERVER.JS
// ----------------------------------------------------
function mergeServerJs(localServerContent, zipServerContent) {
  console.log('  ℹ️  server.js: Menggabungkan security headers, routing /classic, dan cleanupScheduler.');
  let merged = zipServerContent;

  // 1. Pastikan import cleanupScheduler ada
  if (!merged.includes('startCleanupScheduler')) {
    merged = merged.replace(
      "const { registerModularRoutes } = require('./server/routes');",
      "const { registerModularRoutes } = require('./server/routes');\nconst { startCleanupScheduler } = require('./lib/cleanupScheduler');"
    );
  }

  // 2. Tambahkan route /classic untuk melayani _archive_dead_code/legacy-dashboard
  if (!merged.includes('/classic')) {
    const classicRouteSnippet = `
// Sajikan backup dashboard klasik di route /classic
app.use('/classic', express.static(path.join(__dirname, '_archive_dead_code', 'legacy-dashboard'), staticDashboardOptions));
`;
    merged = merged.replace(
      "app.use('/artifacts', express.static(path.join(__dirname, 'public/artifacts')));",
      "app.use('/artifacts', express.static(path.join(__dirname, 'public/artifacts')));\n" + classicRouteSnippet
    );
  }

  // 3. Pastikan startCleanupScheduler() dipanggil di server.listen
  if (!merged.includes('startCleanupScheduler()')) {
    merged = merged.replace(
      "console.error('[botManager] Auto-start bot notice:', err.message);\n    });",
      "console.error('[botManager] Auto-start bot notice:', err.message);\n    });\n\n    // Jalankan scheduler pembersihan tmp otomatis\n    startCleanupScheduler();"
    );
  }

  // 4. Global resilience timeout handlers
  if (!merged.includes('Caught network timeout exception')) {
    const resilienceSnippet = `
// Global resilience handler: cegah proses crash jika third-party stream atau request timeout
process.on('uncaughtException', (err) => {
  if (err && (err.name === 'TimeoutError' || err.message?.includes('aborted') || err.message?.includes('timeout'))) {
    console.warn('[Server Warning] Caught network timeout exception:', err.message);
    return;
  }
  console.error('[SERVER UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('aborted') || msg.includes('timeout') || reason?.name === 'TimeoutError') {
    console.warn('[Server Warning] Unhandled rejection timeout notice:', msg);
    return;
  }
  console.error('[SERVER UNHANDLED REJECTION]', reason);
});
`;
    merged = merged.replace("require('dotenv').config();", "require('dotenv').config();\n" + resilienceSnippet);
  }

  return merged;
}

// ----------------------------------------------------
// SMART MERGE INDEX.JS
// ----------------------------------------------------
function mergeIndexJs(localIndexContent, zipIndexContent) {
  console.log('  ℹ️  index.js: Mengamankan resilience guards & auto-downloader hook.');
  let merged = zipIndexContent;

  // Pastikan uncaught exception & unhandled rejection tahan timeout
  if (localIndexContent.includes('[BOT RESILIENCE]') && !merged.includes('[BOT RESILIENCE]')) {
    const oldUncaughtRegex = /process\.on\('uncaughtException'[\s\S]*?process\.on\('unhandledRejection'[\s\S]*?\}\);/m;
    const resilienceBlock = `process.on('uncaughtException', (err) => {
  if (err && (err.name === 'TimeoutError' || err.message?.includes('aborted') || err.message?.includes('timeout') || err.code === 'ABORT_ERR')) {
    console.warn('[BOT RESILIENCE] Caught timeout notice (non-fatal):', err.message);
    return;
  }
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('aborted') || msg.includes('timeout') || reason?.name === 'TimeoutError') {
    console.warn('[BOT RESILIENCE] Unhandled rejection notice (non-fatal):', msg);
    return;
  }
  console.error('[UNHANDLED REJECTION]', reason);
});`;
    merged = merged.replace(oldUncaughtRegex, resilienceBlock);
  }

  // Pastikan 3.b auto-downloader hook ada
  if (localIndexContent.includes('outputVaultAutoDownloader.handleAutoDownload') && !merged.includes('outputVaultAutoDownloader.handleAutoDownload')) {
    const targetHook = `      // 3.b Auto-Detect Media Link di Chat Pribadi atau Grup Umum (Downloader Auto-Detect Tanpa Command)
      if (!isCommand && outputVaultAutoDownloader && typeof outputVaultAutoDownloader.handleAutoDownload === 'function') {
        const urlMatches = trimmedText.match(/https?:\\/\\/[^\\s,]+/i);
        if (urlMatches) {
          const handledAuto = await outputVaultAutoDownloader.handleAutoDownload({
            sock,
            msg,
            text: trimmedText,
            senderNumber,
            isGroup,
            chatJid,
            groupSubject: isGroup ? (groupsManager.getGroupName(chatJid) || getGroup(chatJid)?.name || '') : '',
            allowUniversal: true,
          });
          if (handledAuto) return;
        }
      }

      // 4. Tangani Perolehan XP & Leveling Grup`;

    merged = merged.replace('      // 4. Tangani Perolehan XP & Leveling Grup', targetHook);
  }

  return merged;
}

// ----------------------------------------------------
// SMART MERGE PACKAGE.JSON
// ----------------------------------------------------
function mergePackageJson(localPkg, zipPkg) {
  console.log('  ℹ️  package.json: Menggabungkan dependensi & script updater.');
  const merged = { ...localPkg };

  merged.dependencies = {
    ...(localPkg.dependencies || {}),
    ...(zipPkg.dependencies || {})
  };

  merged.devDependencies = {
    ...(localPkg.devDependencies || {}),
    ...(zipPkg.devDependencies || {})
  };

  merged.scripts = {
    ...(localPkg.scripts || {}),
    update: 'node scripts/updater.js',
    rollback: 'node scripts/updater.js --rollback',
    verify: 'node scripts/updater.js --check'
  };

  return merged;
}

// ----------------------------------------------------
// PROSES UTAMA EKSEKUSI UPDATE
// ----------------------------------------------------
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--rollback')) {
    const targetBackup = args[args.indexOf('--rollback') + 1];
    executeRollback(targetBackup && !targetBackup.startsWith('--') ? targetBackup : null);
    return;
  }

  if (args.includes('--check')) {
    runSyntaxVerification();
    return;
  }

  console.log('\n========================================================');
  console.log('🚀 [Polaris Updater Engine] MEMPERSIAPKAN PEMBARUAN');
  console.log('========================================================\n');

  let zipPath = args.find(a => !a.startsWith('--') && (a.endsWith('.zip') || fs.existsSync(a)));
  if (!zipPath) {
    zipPath = findDefaultZip();
  }

  if (!zipPath || !fs.existsSync(zipPath)) {
    console.error('❌ File snapshot ZIP tidak ditemukan!');
    console.error('   Harap tentukan path zip: node scripts/updater.js <path-ke-file.zip>');
    process.exit(1);
  }

  console.log(`📦 Menggunakan snapshot: ${zipPath}`);
  const stat = fs.statSync(zipPath);
  console.log(`📏 Ukuran arsip: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (e) {
    console.error('❌ Modul adm-zip tidak ditemukan di node_modules.');
    process.exit(1);
  }

  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  console.log(`📑 Total entri dalam arsip: ${zipEntries.length}`);

  // Deteksi prefix root di dalam zip (misal: astraonyx-merged/)
  let rootPrefix = '';
  if (zipEntries.some(e => e.entryName.startsWith('astraonyx-merged/'))) {
    rootPrefix = 'astraonyx-merged/';
    console.log(`🔍 Terdeteksi root prefix arsip: "${rootPrefix}"`);
  }

  // 1. Filter entri yang akan diekstrak (lewati entri terproteksi)
  const extractableEntries = [];
  const skippedProtected = [];

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    let relPath = entry.entryName;
    if (rootPrefix && relPath.startsWith(rootPrefix)) {
      relPath = relPath.substring(rootPrefix.length);
    }
    if (!relPath) continue;

    if (isProtected(relPath)) {
      skippedProtected.push(relPath);
    } else {
      extractableEntries.push({ entry, relPath });
    }
  }

  console.log(`🔒 File data sensitif yang dilindungi (tidak ditimpa): ${skippedProtected.length}`);
  console.log(`✨ File yang akan diperbarui/ditambahkan: ${extractableEntries.length}`);

  // 2. Buat Targeted Pre-Update Backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentBackupDir = path.join(BACKUPS_DIR, `backup-${timestamp}`);
  const backupFilesDir = path.join(currentBackupDir, 'files');

  console.log(`\n💾 Membuat cadangan keselamatan di: ${path.relative(PROJECT_ROOT, currentBackupDir)}...`);
  fs.mkdirSync(backupFilesDir, { recursive: true });

  const backedUpFiles = [];
  for (const item of extractableEntries) {
    const localFile = path.join(PROJECT_ROOT, item.relPath);
    if (fs.existsSync(localFile)) {
      const bkpDest = path.join(backupFilesDir, item.relPath);
      fs.mkdirSync(path.dirname(bkpDest), { recursive: true });
      fs.copyFileSync(localFile, bkpDest);
      backedUpFiles.push(item.relPath);
    }
  }

  // Amankan juga file kunci server.js, index.js, config.js, package.json jika belum
  const crucialFiles = ['server.js', 'index.js', 'config.js', 'package.json', 'package-lock.json'];
  for (const cf of crucialFiles) {
    const localFile = path.join(PROJECT_ROOT, cf);
    if (fs.existsSync(localFile) && !backedUpFiles.includes(cf)) {
      const bkpDest = path.join(backupFilesDir, cf);
      fs.mkdirSync(path.dirname(bkpDest), { recursive: true });
      fs.copyFileSync(localFile, bkpDest);
      backedUpFiles.push(cf);
    }
  }

  const manifest = {
    timestamp: new Date().toISOString(),
    zipPath,
    filesCount: backedUpFiles.length,
    files: backedUpFiles
  };
  fs.writeFileSync(path.join(currentBackupDir, 'backup-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✅ Cadangan keselamatan selesai (${backedUpFiles.length} file diamankan).\n`);

  // 3. Amankan Tarot Assets & Arsipkan Legacy Dashboard
  const localTarotDir = path.join(PROJECT_ROOT, 'dashboard', 'assets', 'tarot');
  const legacyTarotDir = path.join(PROJECT_ROOT, '_archive_dead_code', 'legacy-dashboard', 'assets', 'tarot');
  const legacyDashboardDir = path.join(PROJECT_ROOT, '_archive_dead_code', 'legacy-dashboard');

  if (fs.existsSync(localTarotDir)) {
    console.log('🃏 Mengamankan aset Tarot ke _archive_dead_code/legacy-dashboard/assets/tarot...');
    copyDirSync(localTarotDir, legacyTarotDir);
  }

  // Jika folder _archive_dead_code/legacy-dashboard belum ada atau kurang lengkap, salin dari dashboard lokal
  if (fs.existsSync(path.join(PROJECT_ROOT, 'dashboard'))) {
    console.log('🏛️  Menyelaraskan dashboard lama ke _archive_dead_code/legacy-dashboard...');
    copyDirSync(path.join(PROJECT_ROOT, 'dashboard'), legacyDashboardDir);
  }

  // 4. Ekstraksi dan Smart Merge
  console.log('⚡ Menerapkan pembaruan dari snapshot...');

  let localPkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  let localServerContent = fs.readFileSync(path.join(PROJECT_ROOT, 'server.js'), 'utf8');
  let localIndexContent = fs.readFileSync(path.join(PROJECT_ROOT, 'index.js'), 'utf8');
  let localConfigContent = fs.readFileSync(path.join(PROJECT_ROOT, 'config.js'), 'utf8');

  let updatedCount = 0;

  for (const item of extractableEntries) {
    const targetPath = path.join(PROJECT_ROOT, item.relPath);
    const contentBuffer = item.entry.getData();

    // Pastikan folder tujuan ada
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    // Handle berkas-berkas dengan aturan smart merge khusus
    if (item.relPath === 'package.json') {
      try {
        const zipPkg = JSON.parse(contentBuffer.toString('utf8'));
        const mergedPkg = mergePackageJson(localPkg, zipPkg);
        fs.writeFileSync(targetPath, JSON.stringify(mergedPkg, null, 2) + '\n', 'utf8');
        updatedCount++;
      } catch (err) {
        console.error('❌ Gagal merge package.json:', err.message);
      }
      continue;
    }

    if (item.relPath === 'server.js') {
      try {
        const zipServerContent = contentBuffer.toString('utf8');
        const mergedServer = mergeServerJs(localServerContent, zipServerContent);
        fs.writeFileSync(targetPath, mergedServer, 'utf8');
        updatedCount++;
      } catch (err) {
        console.error('❌ Gagal merge server.js:', err.message);
      }
      continue;
    }

    if (item.relPath === 'index.js') {
      try {
        const zipIndexContent = contentBuffer.toString('utf8');
        const mergedIndex = mergeIndexJs(localIndexContent, zipIndexContent);
        fs.writeFileSync(targetPath, mergedIndex, 'utf8');
        updatedCount++;
      } catch (err) {
        console.error('❌ Gagal merge index.js:', err.message);
      }
      continue;
    }

    if (item.relPath === 'config.js') {
      try {
        const zipConfigContent = contentBuffer.toString('utf8');
        const mergedConfig = mergeConfigJs(localConfigContent, zipConfigContent);
        fs.writeFileSync(targetPath, mergedConfig, 'utf8');
        updatedCount++;
      } catch (err) {
        console.error('❌ Gagal merge config.js:', err.message);
      }
      continue;
    }

    // Tulis file biasa (biner maupun teks)
    fs.writeFileSync(targetPath, contentBuffer);
    updatedCount++;
  }

  // Pastikan aset Tarot tetap tersedia di dashboard baru jika dibutuhkan
  if (fs.existsSync(legacyTarotDir)) {
    const newTarotDir = path.join(PROJECT_ROOT, 'dashboard', 'assets', 'tarot');
    copyDirSync(legacyTarotDir, newTarotDir);
  }

  console.log(`\n🎉 Pembaruan file selesai! ${updatedCount} file berhasil diproses.`);

  // 5. Validasi Sintaks
  const verifyOk = runSyntaxVerification();

  if (verifyOk) {
    console.log('\n========================================================');
    console.log('✅ PEMBARUAN BERHASIL DITERAPKAN DENGAN SEMPURNA!');
    console.log('========================================================');
    console.log('Catatan Operasional:');
    console.log('1. Dashboard baru aktif di: http://localhost:3000/dashboard (atau /)');
    console.log('2. Dashboard klasik tetap bisa diakses di: http://localhost:3000/classic');
    console.log('3. Data autentikasi & database WhatsApp tersimpan aman tanpa tersentuh.');
    console.log('4. Jika ingin membatalkan perubahan, jalankan: npm run rollback\n');
  } else {
    console.warn('\n⚠️  Pembaruan selesai dengan peringatan sintaks. Periksa file terkait.');
  }
}

main().catch(err => {
  console.error('\n❌ Terjadi kesalahan fatal saat menjalankan updater:', err);
  process.exit(1);
});
