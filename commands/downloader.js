// commands/downloader.js — WhatsApp Bot Downloader Commands Adapter
// Delegates to unified Mori Downloader Core (astraonyx/mori) — satu tempat scrape untuk bot WA & web dashboard
const mori = require('../astraonyx/mori');
const botHandler = require('../astraonyx/mori/botHandler');

module.exports = {
  handleDownloaderCommand: botHandler.handleDownloaderCommand,
  handleUnifiedDownload: botHandler.handleUnifiedDownload,
  handleMdf: botHandler.handleMdf,
  handleTiktok: botHandler.handleTiktok,
  handleYoutube: botHandler.handleYoutube,
  handleInstagramOrFacebook: botHandler.handleInstagramOrFacebook,
  handleSpotify: botHandler.handleSpotify,
  handlePinterest: botHandler.handlePinterest,
  handleTwitter: botHandler.handleTwitter,
  handleTerabox: botHandler.handleTerabox,
  handleGdrive: botHandler.handleGdrive,
  handleRemoveBg: botHandler.handleRemoveBg,
  handleOmniGetOrCourse: botHandler.handleMoriOrCourse,
  handleMoriOrCourse: botHandler.handleMoriOrCourse,
  handleMagnetTorrent: botHandler.handleMagnetTorrent,
  mori,
};
