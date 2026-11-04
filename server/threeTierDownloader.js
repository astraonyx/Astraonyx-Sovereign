// server/threeTierDownloader.js — Thin Facade Adapter to Mori Core Engine
// Single Source of Truth: astraonyx/mori/engine.js
// Unifies:
//   Layer 1 (Utama): Primary Polaris Scrapers (lib/*Scraper.js)
//   Layer 2 (Mori Secondary): High-Performance Secondary Scrapers (scrape/*)
//   Layer 3 (Multi-Server): Multi-Server Registry & Cloud Debrid (astraonyx/mori/*)

const { engine, toolbox } = require('../astraonyx/mori');

module.exports = {
  analyzeThreeTier: engine.analyzeThreeTier,
  analyzeUrl: engine.analyzeUrl,
  detectPlatform: engine.detectPlatform,
  scrapeLayer1: engine.scrapeLayer1,
  scrapeLayer2: engine.scrapeLayer2,
  scrapeLayer3: engine.scrapeLayer3,
  getServersRegistry: engine.getServersRegistry,
  scrapeFxTwitter: engine.scrapeFxTwitter,
  moriToolbox: toolbox,
  moriEngine: engine,
};
