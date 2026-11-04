// scrape/index.js — Unified Scraper & Tool Repository for Astraonyx Ataraxia
// Integrates all adopted scrapers, media extractors, AI modules, and OSINT stalkers.
// Menggunakan lazy-getter pattern agar hemat RAM (zero-overhead boot) dan tahan error jika ada dependensi opsional.

function safeRequire(relPath) {
  try {
    return require(relPath);
  } catch (err) {
    return {
      error: true,
      message: `Modul ${relPath} membutuhkan dependensi tambahan: ${err.message}`,
    };
  }
}

module.exports = {
  // Downloader & Media Extractors (OmniGet Layer 2)
  get downloaders() {
    return {
      snapAny: safeRequire('./furina/SnapAny'),
      tiktok: safeRequire('./furina/tiktokdl'),
      instagram: safeRequire('./furina/igdl'),
      youtube: safeRequire('./furina/ytdl'),
      facebook: safeRequire('./furina/XeonFb'),
      twitter: safeRequire('./furina/XeonTwitter'),
      spotify: safeRequire('./furina/spotifydl'),
      pinterest: safeRequire('./furina/pinterestdl'),
      mediafire: safeRequire('./furina/mediafire'),
      hdVideo: safeRequire('./furina/hdvideo'),
      threads: safeRequire('./furina/threads'),
      playMusic: safeRequire('./furina/playmusic'),
    };
  },

  // AI & Neural Engines (Starlium / Hermes Sub-modules)
  get ai() {
    return {
      coreAi: safeRequire('./furina/ai'),
      googleAi: safeRequire('./furina/googleai'),
      gemmy: safeRequire('./furina/gemmy'),
      gpt52: safeRequire('./furina/gpt52'),
      grokAi: safeRequire('./furina/grokai'),
      mimo: safeRequire('./furina/mimo'),
      alyaChat: safeRequire('./furina/alyachat'),
    };
  },

  // Creative, Maker & Graphic Tools
  get makers() {
    return {
      photooxy: safeRequire('./furina/photooxy'),
      textpro: safeRequire('./furina/textpro'),
      textpro2: safeRequire('./furina/textpro2'),
      removeBg: safeRequire('./furina/removebg'),
      wantedPoster: safeRequire('./furina/wantedPoster'),
      tarotCard: safeRequire('./furina/tarotCard'),
      fakeIg: safeRequire('./furina/fakeig'),
      fakeIqc: safeRequire('./furina/fakeIQC'),
      fakeNotif: safeRequire('./furina/fakenotif'),
    };
  },

  // Stalker & OSINT
  get stalkers() {
    return {
      github: safeRequire('./furina/githubstalk'),
      genshin: safeRequire('./furina/genshinstalk'),
      mobileLegends: safeRequire('./furina/mlstalk'),
      freeFire: safeRequire('./furina/ffstalk'),
      npm: safeRequire('./furina/npmstalk'),
      dapodik: safeRequire('./furina/dapodik'),
    };
  },

  // Entertainment & Anime
  get entertainment() {
    return {
      anime: safeRequire('./furina/anime'),
      nontonAnime: safeRequire('./furina/nontonanime'),
      lyrics: safeRequire('./furina/lirik'),
    };
  },

  // Diagnostics & Sanctum Security Benchmark
  get diagnostics() {
    return {
      loadBenchmark: safeRequire('./furina/ddos'),
      otpValidator: safeRequire('./furina/spamOtp'),
    };
  },
};
