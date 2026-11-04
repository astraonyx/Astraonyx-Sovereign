// commands/cleanup.js — /cleartmp (owner-only)
const { clearTmpFolder, getTmpFileCount, getTmpTotalSize } = require('../lib/tmpManager');
const { formatBytes } = require('../lib/mediafireScraper');
const { success, usage, info, bullet } = require('../lib/messageStyle');

async function handleCleartmp({ args, reply }) {
  const target = (args[0] || 'all').toLowerCase();

  if (!['all', 'media', 'downloader'].includes(target)) {
    await reply(usage(
      '/cleartmp',
      'Atau `/cleartmp media` (sticker/toimg/antidelete saja), `/cleartmp downloader` (hasil download saja).'
    ));
    return;
  }

  const categories = target === 'all' ? ['media', 'downloader'] : [target];
  let totalDeleted = 0;
  let totalFreed = 0;
  const lines = [];

  for (const cat of categories) {
    const before = getTmpFileCount(cat);
    const { deletedCount, freedBytes } = clearTmpFolder(cat);
    totalDeleted += deletedCount;
    totalFreed += freedBytes;
    lines.push(bullet(`${cat}: ${deletedCount} file dihapus (${formatBytes(freedBytes)})${before === 0 ? ' — sudah kosong' : ''}`));
  }

  await reply(success(
    'Tmp Dibersihkan',
    lines.join('\n'),
    `🧹 Total: ${totalDeleted} file, ${formatBytes(totalFreed)} terbebas.`
  ));
}

async function handleTmpStatus({ reply }) {
  const mediaCount = getTmpFileCount('media');
  const mediaSize = getTmpTotalSize('media');
  const downloaderCount = getTmpFileCount('downloader');
  const downloaderSize = getTmpTotalSize('downloader');

  const body =
    bullet(`Media (sticker/toimg/antidelete): ${mediaCount} file (${formatBytes(mediaSize)})`) + '\n' +
    bullet(`Downloader (tiktok/ig/facebook — command lain streaming langsung tanpa nyimpen tmp): ${downloaderCount} file (${formatBytes(downloaderSize)})`);

  await reply(info('Status Folder Sementara', body, 'Ketik `/cleartmp` untuk membersihkan.'));
}

module.exports = { handleCleartmp, handleTmpStatus };
