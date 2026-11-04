// server/downloaderService.js — Unified 3-Layer Downloader Service (Mori Core Engine Single Source of Truth)
const threeTier = require('./threeTierDownloader');
const { engine, toolbox } = require('../astraonyx/mori');

module.exports = {
  detectPlatform: threeTier.detectPlatform,
  analyzeUrl: (url, server) => threeTier.analyzeThreeTier(url, server || 'auto'),
  analyzeThreeTier: threeTier.analyzeThreeTier,
  scrapeLayer1: threeTier.scrapeLayer1,
  scrapeLayer2: threeTier.scrapeLayer2,
  scrapeLayer3: threeTier.scrapeLayer3,
  getServersRegistry: engine.getServersRegistry,
  scrapeFxTwitter: engine.scrapeFxTwitter,
  MORI_VERSION: engine.MORI_VERSION,
  MORI_SCRAPER_CORE: engine.MORI_SCRAPER_CORE,
  mori: toolbox,
  engine,
  toolbox,
};
