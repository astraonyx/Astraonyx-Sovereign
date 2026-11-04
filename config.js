// config.js — Konfigurasi utama bot & dashboard Polaris Project
require('dotenv').config();

module.exports = {
  botName: process.env.BOT_NAME || 'Polaris',
  prefix: process.env.BOT_PREFIX || '/',
  dashboardPort: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'polaris_super_secret_jwt_key_2026',

  // Nomor asli primary owner (format: 628xxxxxxxxxx)
  ownerNumber: process.env.OWNER_NUMBER || '',

  paths: {
    authInfo: process.env.AUTH_DIR || './auth_info',
    tmp: process.env.TMP_DIR || './tmp',
    tmpMedia: (process.env.TMP_DIR ? process.env.TMP_DIR + '/media' : './tmp/media'),
    tmpDownloader: (process.env.TMP_DIR ? process.env.TMP_DIR + '/downloader' : './tmp/downloader'),
    // Dulu 2 folder ini (apk_builds & vault_media) ditulis langsung oleh
    // webToApkBuilder.js & antiRevokeEngine.js TANPA lewat tmpManager, jadi
    // tidak pernah ikut disapu oleh cleanupScheduler → inilah sumber utama
    // tmp/ membengkak. Sekarang didaftarkan resmi di sini + tmpManager.
    tmpApkBuilds: (process.env.TMP_DIR ? process.env.TMP_DIR + '/apk_builds' : './tmp/apk_builds'),
    tmpVaultMedia: (process.env.TMP_DIR ? process.env.TMP_DIR + '/vault_media' : './tmp/vault_media'),
    // astraonyx/omniget/toolbox.js (compressor/gif/audio normalizer) juga
    // nulis langsung ke sini tanpa pernah menghapus hasil olahannya.
    tmpOmniget: (process.env.TMP_DIR ? process.env.TMP_DIR + '/omniget' : './tmp/omniget'),
    // tmp/web: KHUSUS tool dashboard (Web-to-APK, OmniGet compressor, dll)
    // yang dipakai akun Wuna LANGSUNG dari browser — bukan lewat bot WA.
    // Beda konsep dari tmp bot WA (tmp/media, tmp/downloader, dst — yang
    // sudah terisolasi per-instance bot via TMP_DIR saat clusterManager
    // spawn child process). Server dashboard (server.js) cuma SATU proses
    // yang dipakai SEMUA akun Wuna sekaligus, jadi isolasi di sini bukan
    // lewat folder beda-proses, tapi tiap akun dapat SUB-FOLDER sendiri:
    // tmp/web/<wunaUserId>/apk_builds/, tmp/web/<wunaUserId>/omniget/, dst.
    tmpWeb: (process.env.TMP_DIR ? process.env.TMP_DIR + '/web' : './tmp/web'),
    logs: process.env.LOG_FILE || './logs/error.log',
    whitelist: process.env.WHITELIST_FILE || './database/whitelist.json',
    groupSettings: process.env.GROUP_SETTINGS_FILE || './database/groupSettings.json',
    privateChatSettings: process.env.PRIVATE_SETTINGS_FILE || './database/privateChatSettings.json',
    dashboardUsers: './database/dashboard_users.json',
    commandOverrides: process.env.COMMAND_OVERRIDES_FILE || './database/command_overrides.json',
    customFeatures: process.env.CUSTOM_FEATURES_FILE || './database/custom_features.json',
  },

  maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 500,
  warnLimit: 10,

  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  grokApiKey: process.env.GROK_API_KEY || '',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',

  default2FAPin: process.env.DEFAULT_2FA_PIN || '111111',
  sessionTimeoutHours: Number(process.env.SESSION_TIMEOUT_HOURS) || 24,
  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS) || 5,

  news: {
    intervalHours: Number(process.env.NEWS_BROADCAST_INTERVAL_HOURS) || 4,
    includeThumbnails: process.env.NEWS_INCLUDE_THUMBNAILS !== 'false',
    includeMedia: process.env.NEWS_INCLUDE_MEDIA !== 'false',
    maxArticles: Number(process.env.NEWS_MAX_ARTICLES) || 6,
  },

  games: {
    enabled: process.env.GAMES_ENABLED !== 'false',
    starliumLearningEnabled: process.env.STARLIUM_LEARNING_ENABLED !== 'false',
    starliumMaxMatches: Number(process.env.STARLIUM_MAX_MATCHES) || 500000,
  },

  cluster: {
    maxBotsPerUser: Number(process.env.CLUSTER_MAX_BOTS_PER_USER) || 5,
    maxTotalBots: Number(process.env.CLUSTER_MAX_TOTAL_BOTS) || 30,
    minTierLevel: Number(process.env.CLUSTER_MIN_TIER_LEVEL) || 9,
  },

  tools: {
    webToApkDir: process.env.TOOLS_WEB_TO_APK_DIR || './tmp/apk_builds',
    spotifyFallbackServers: (process.env.SPOTIFY_FALLBACK_SERVERS || 'spotidown,spotifydown,spotifymate,btch').split(',').map(s => s.trim()),
  },

  // Tuning pembersihan tmp/ otomatis. Nilai default aman untuk server kecil
  // (VPS/STB) — bisa dioverride lewat .env tanpa ubah kode.
  cleanup: {
    intervalMinutes: Number(process.env.CLEANUP_INTERVAL_MINUTES) || 10,
    // Umur maksimum file (menit) per kategori sebelum dihapus otomatis.
    maxAgeMinutes: {
      media: Number(process.env.CLEANUP_MAX_AGE_MEDIA_MIN) || 30,
      downloader: Number(process.env.CLEANUP_MAX_AGE_DOWNLOADER_MIN) || 60,
      apk_builds: Number(process.env.CLEANUP_MAX_AGE_APK_MIN) || 120, // beri waktu user unduh
      vault_media: Number(process.env.CLEANUP_MAX_AGE_VAULT_MIN) || 180,
      omniget: Number(process.env.CLEANUP_MAX_AGE_OMNIGET_MIN) || 60,
      web: Number(process.env.CLEANUP_MAX_AGE_WEB_MIN) || 120, // tmp/web/<wunaUserId>/... (apk_builds, omniget hasil tool dashboard)
    },
    // Hard cap total ukuran tmp/ (MB). Kalau terlampaui, file TERTUA
    // dihapus duluan (lintas kategori) sampai kembali di bawah batas —
    // ini jaring pengaman kalau ada lonjakan traffic sebelum siklus
    // berbasis umur sempat jalan.
    maxTotalSizeMB: Number(process.env.CLEANUP_MAX_TOTAL_SIZE_MB) || 1024,
  },
};

