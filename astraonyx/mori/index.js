// astraonyx/mori/index.js — Mori Universal Studio & Media Downloader Hub
const engine = require('./engine');
const toolbox = require('./toolbox');
const {
  handleDownloaderCommand,
  handleMdf,
  handleTiktok,
  handleYoutube,
  handleInstagramOrFacebook,
  handleSpotify,
  handlePinterest,
  handleTwitter,
  handleTerabox,
  handleGdrive,
  handleRemoveBg,
  handleMoriOrCourse,
  handleMagnetTorrent,
} = require('./botHandler');

const { handleMediaCommand } = require('../../commands/media');
const { handleTextToolsCommand } = require('../../commands/text-tools');
const { handleViewWebbCommand } = require('../../commands/viewwebb');
const { handleEditOutputCommand } = require('../../commands/editoutput');

const MORI_COMMAND_NAMES = new Set([
  'mdf', 'tiktok', 'tiktokslide', 'ytmp3', 'ytmp4', 'ig', 'instagram', 'facebook', 'fb',
  'spotify', 'pinterest', 'terabox', 'gdrive', 'twitter', 'twittervid', 'removebg',
  'sticker', 'stiker', 's', 'stc', 'toimg', 'toimage', 'tourl', 'nobg', 'hd', 'upscale', 'remini', 'enhance',
  'translate', 'tts', 'readmore',
  'viewwebb', 'viewweb', 'webview', 'webinwa',
  'editoutput', 'editmsg', 'revisi', 'editpesan',
  'course', 'mori', 'omniget', 'torrent', 'magnet', // 'omniget' dipertahankan sebagai alias lama
]);

async function dispatchMoriCommand(context) {
  const { command } = context;
  const cleanCmd = String(command || '').toLowerCase().replace(/^[!./#]/, '');

  if (!MORI_COMMAND_NAMES.has(cleanCmd)) {
    return false;
  }

  // 1. Media Converters (Sticker, ToImage, ToUrl, RemoveBg, HD)
  if (['sticker', 'stiker', 's', 'stc', 'toimg', 'toimage', 'tourl', 'nobg', 'hd', 'upscale', 'remini', 'enhance'].includes(cleanCmd)) {
    await handleMediaCommand(context);
    return true;
  }

  // 2. Social Media & Cloud Downloaders (Mori & Mori unified)
  if (['mdf', 'tiktok', 'tiktokslide', 'ytmp3', 'ytmp4', 'ig', 'instagram', 'facebook', 'fb', 'spotify', 'pinterest', 'terabox', 'gdrive', 'twitter', 'twittervid', 'removebg', 'course', 'mori', 'torrent', 'magnet'].includes(cleanCmd)) {
    await handleDownloaderCommand(context);
    return true;
  }

  // 3. Text Tools (Translate, TTS, ReadMore)
  if (['translate', 'tts', 'readmore'].includes(cleanCmd)) {
    await handleTextToolsCommand(context);
    return true;
  }

  // 4. In-WA Browser
  if (['viewwebb', 'viewweb', 'webview', 'webinwa'].includes(cleanCmd)) {
    await handleViewWebbCommand(context);
    return true;
  }

  // 5. Bot Output Live Editor
  if (['editoutput', 'editmsg', 'revisi', 'editpesan'].includes(cleanCmd)) {
    await handleEditOutputCommand(context);
    return true;
  }

  return false;
}

module.exports = {
  pillar: 'mori',
  name: 'Mori Media & Tools Utility Engine',
  engine,
  toolbox,
  detectPlatform: engine.detectPlatform,
  analyzeUrl: engine.analyzeUrl,
  getServersRegistry: engine.getServersRegistry,
  commandNames: MORI_COMMAND_NAMES,
  dispatch: dispatchMoriCommand,
  handlers: {
    handleDownloaderCommand,
    handleMdf,
    handleTiktok,
    handleYoutube,
    handleInstagramOrFacebook,
    handleSpotify,
    handlePinterest,
    handleTwitter,
    handleTerabox,
    handleGdrive,
    handleRemoveBg,
    handleMoriOrCourse,
    handleMagnetTorrent,
    handleMediaCommand,
    handleTextToolsCommand,
    handleViewWebbCommand,
    handleEditOutputCommand,
  },
  // Backward compatibility alias for handleDownloaderCommand
  handleDownloaderCommand,
};
