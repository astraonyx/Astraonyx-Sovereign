// server/db.js — Polaris SQLite Database Engine (better-sqlite3)
// Mendukung WAL (Write-Ahead Logging), struktur tabel terindeks, dan migrasi transparan dari file JSON
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

const DB_FILE = path.resolve(__dirname, '../database/polaris.sqlite');

// Pastikan folder database ada
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

// Inisialisasi koneksi SQLite
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('secure_delete = ON');
db.pragma('cell_size_check = ON');
db.pragma('auto_vacuum = INCREMENTAL');
db.pragma('cache_size = -64000'); // 64MB Cache untuk kecepatan query tinggi
db.pragma('temp_store = MEMORY'); // Temporary tables & index scans di RAM
db.pragma('mmap_size = 268435456'); // 256MB memory map untuk I/O instan

/**
 * Inisialisasi Schema Tabel
 */
function initSchema() {
  db.exec(`
    -- Tabel Akun Pengguna Dashboard Polaris
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      require_2fa INTEGER NOT NULL DEFAULT 1,
      pin_hash TEXT,
      is_banned INTEGER NOT NULL DEFAULT 0,
      linked_owner_number TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabel Arsip Pesan Anti-Delete & Anti-ViewOnce (Ghost Protocol)
    CREATE TABLE IF NOT EXISTS message_vault (
      id TEXT PRIMARY KEY,
      chat_jid TEXT NOT NULL,
      sender_jid TEXT NOT NULL,
      sender_name TEXT,
      message_type TEXT NOT NULL,
      content_text TEXT,
      media_path TEXT,
      is_view_once INTEGER NOT NULL DEFAULT 0,
      is_revoked INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Tabel Auto-Responder Rule Engine
    CREATE TABLE IF NOT EXISTS auto_responders (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'contains', -- exact, contains, starts_with, regex
      response_type TEXT NOT NULL DEFAULT 'text',   -- text, image, sticker
      response_content TEXT NOT NULL,
      media_url TEXT DEFAULT '',
      scope TEXT NOT NULL DEFAULT 'all',            -- all, group, private
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabel Statistik & Aktivitas Bot (Harian)
    CREATE TABLE IF NOT EXISTS bot_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_str TEXT UNIQUE NOT NULL, -- YYYY-MM-DD
      message_count INTEGER NOT NULL DEFAULT 0,
      command_count INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      platforms_json TEXT DEFAULT '{}',
      active_groups_json TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    -- Tabel Feed Berita Ekosistem Polaris
    CREATE TABLE IF NOT EXISTS ecosystem_news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      snippet TEXT,
      category TEXT DEFAULT 'Tech',
      source TEXT DEFAULT 'Google News',
      published_at TEXT,
      sent_to_group INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Tabel Key-Value Konfigurasi Fleksibel (Whitelist, Group Settings, dll)
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabel Pengaturan Sistem Rank Per Grup (/playrank on/off)
    CREATE TABLE IF NOT EXISTS group_rank_settings (
      group_jid TEXT PRIMARY KEY,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      level_up_notice INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabel XP & Level Member Grup
    CREATE TABLE IF NOT EXISTS group_member_xp (
      group_jid TEXT NOT NULL,
      user_jid TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      message_count INTEGER NOT NULL DEFAULT 0,
      last_xp_at INTEGER NOT NULL DEFAULT 0,
      last_spin_at INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (group_jid, user_jid)
    );

    CREATE INDEX IF NOT EXISTS idx_group_member_xp_rank ON group_member_xp (group_jid, xp DESC);

    -- Tabel Riwayat Harian Duel XP Antar Member (Anti Push Farming)
    CREATE TABLE IF NOT EXISTS group_duel_history (
      group_jid TEXT NOT NULL,
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      duel_date TEXT NOT NULL,
      duel_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (group_jid, user_a, user_b, duel_date)
    );

    CREATE INDEX IF NOT EXISTS idx_group_duel_hist ON group_duel_history (group_jid, duel_date);

    -- Tabel Digital Time Capsule (Kapsul Waktu Digital)
    CREATE TABLE IF NOT EXISTS time_capsules (
      id TEXT PRIMARY KEY,
      chat_jid TEXT NOT NULL,
      creator_jid TEXT NOT NULL,
      creator_name TEXT,
      target_jid TEXT NOT NULL,
      target_name TEXT,
      message_content TEXT NOT NULL,
      unlock_at INTEGER NOT NULL,
      is_opened INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_timecapsules_unlock ON time_capsules (unlock_at, is_opened);

    -- Tabel Riwayat Unduhan Terpadu (Web Downloader Hub + Bot WA Command + Auto-Detect)
    CREATE TABLE IF NOT EXISTS downloader_history (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,
      author TEXT,
      duration TEXT,
      thumbnail TEXT,
      media_type TEXT,
      used_server TEXT,
      source TEXT NOT NULL DEFAULT 'web', -- 'web', 'bot_cmd', 'bot_auto_detect'
      chat_jid TEXT DEFAULT '',
      sender_number TEXT DEFAULT '',
      downloads_json TEXT DEFAULT '[]',
      slides_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dl_hist_created ON downloader_history (created_at DESC);

    -- Tabel Riwayat Boss Raid Co-Op
    CREATE TABLE IF NOT EXISTS raid_history (
      id TEXT PRIMARY KEY,
      group_jid TEXT NOT NULL,
      boss_name TEXT NOT NULL,
      boss_tier TEXT NOT NULL DEFAULT 'V',
      total_hp INTEGER NOT NULL DEFAULT 5000,
      mvp_jid TEXT DEFAULT '',
      mvp_name TEXT DEFAULT '',
      mvp_damage INTEGER DEFAULT 0,
      last_hit_jid TEXT DEFAULT '',
      last_hit_name TEXT DEFAULT '',
      participants_count INTEGER DEFAULT 0,
      status TEXT NOT NULL, -- 'defeated', 'timeout', 'aborted'
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_raid_hist_group ON raid_history (group_jid, created_at DESC);

    -- Tabel Titel Profil Langka Member (Dari Boss Raid & Pencapaian RPG)
    CREATE TABLE IF NOT EXISTS user_raid_titles (
      id TEXT PRIMARY KEY,
      user_jid TEXT NOT NULL,
      title_id TEXT NOT NULL,
      title_name TEXT NOT NULL,
      title_badge TEXT NOT NULL DEFAULT '🎖️',
      title_desc TEXT DEFAULT '',
      is_equipped INTEGER NOT NULL DEFAULT 0,
      unlocked_at TEXT NOT NULL,
      UNIQUE(user_jid, title_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_titles_jid ON user_raid_titles (user_jid);

    -- Tabel Target Chat Reminder & Jadwal Harian
    CREATE TABLE IF NOT EXISTS reminder_targets (
      chat_jid TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      daily_remind_time TEXT NOT NULL DEFAULT '07:00',
      set_by TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Tabel Reminder & Manajemen Tugas (Smart Task & Deadline Engine)
    CREATE TABLE IF NOT EXISTS task_reminders (
      id TEXT PRIMARY KEY,
      target_jid TEXT NOT NULL,
      creator_jid TEXT NOT NULL,
      task_name TEXT NOT NULL,
      deadline_at INTEGER NOT NULL,
      deadline_str TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', -- active, completed, deleted, auto_deleted
      delete_reason TEXT DEFAULT '',
      last_reminded_at INTEGER NOT NULL DEFAULT 0,
      overdue_reminded INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_target ON task_reminders (target_jid, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON task_reminders (deadline_at, status);

    -- Tabel Riwayat Login Wuna & Dashboard Analytics (Per jam, hari, bulan, tahun, custom)
    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      login_at TEXT NOT NULL,
      login_timestamp INTEGER NOT NULL,
      success INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_login_hist_time ON login_history (login_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_login_hist_user ON login_history (username, login_timestamp DESC);

    -- Tabel Starlium Chess AI Learning Matches (Belajar dari 100k match)
    CREATE TABLE IF NOT EXISTS starlium_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT UNIQUE NOT NULL,
      pgn TEXT NOT NULL,
      fen_final TEXT,
      result TEXT NOT NULL,
      white_player TEXT NOT NULL,
      black_player TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      moves_count INTEGER NOT NULL DEFAULT 0,
      opening_name TEXT DEFAULT 'Standard Opening',
      opening_eco TEXT DEFAULT '',
      learned_patterns_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      created_timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_starlium_created ON starlium_matches (created_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_starlium_eco ON starlium_matches (opening_eco);

    -- Tabel Statistik Game Umum (Minesweeper, XOX, SOS, Snake, Memory, Dots & Boxes, Tarot)
    CREATE TABLE IF NOT EXISTS game_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_type TEXT NOT NULL,
      player_name TEXT NOT NULL,
      opponent_type TEXT NOT NULL DEFAULT 'bot',
      difficulty TEXT DEFAULT 'normal',
      result TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      meta_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      created_timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_game_stats_type ON game_stats (game_type, created_timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_game_stats_player ON game_stats (player_name, score DESC);

    -- Tabel Pertemanan Akun (Friend System untuk Mabar & Medsos)
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id_1 TEXT NOT NULL,
      user_id_2 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
      requested_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id_1, user_id_2)
    );
    CREATE INDEX IF NOT EXISTS idx_friends_u1 ON friends(user_id_1, status);
    CREATE INDEX IF NOT EXISTS idx_friends_u2 ON friends(user_id_2, status);

    -- Tabel Tantangan & Mabar Online (Chess, Snake, XOX, SOS, dll)
    CREATE TABLE IF NOT EXISTS game_challenges (
      id TEXT PRIMARY KEY,
      challenger_id TEXT NOT NULL,
      challenger_username TEXT NOT NULL,
      challenged_id TEXT NOT NULL,
      challenged_username TEXT NOT NULL,
      game_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'active', 'finished', 'cancelled'
      game_state_json TEXT DEFAULT '{}',
      turn_user_id TEXT DEFAULT '',
      winner_id TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON game_challenges(challenged_id, status);
    CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON game_challenges(challenger_id, status);

    -- Tabel Postingan Medsos Astraonyx (Social Feed)
    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_username TEXT NOT NULL,
      author_display_name TEXT NOT NULL,
      author_avatar_url TEXT DEFAULT '',
      author_role TEXT NOT NULL DEFAULT 'member',
      content TEXT NOT NULL,
      media_url TEXT DEFAULT '',
      post_type TEXT DEFAULT 'post',
      extra_data_json TEXT DEFAULT '{}',
      likes_json TEXT DEFAULT '[]',
      comments_json TEXT DEFAULT '[]',
      reposts_json TEXT DEFAULT '[]',
      bookmarks_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);

    -- Tabel Stories Medsos Astraonyx (Instagram / TikTok Style 24h Status)
    CREATE TABLE IF NOT EXISTS social_stories (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      author_username TEXT NOT NULL,
      author_display_name TEXT NOT NULL,
      author_avatar_url TEXT DEFAULT '',
      media_url TEXT DEFAULT '',
      text_content TEXT DEFAULT '',
      bg_gradient TEXT DEFAULT '',
      sound_title TEXT DEFAULT '',
      sound_artist TEXT DEFAULT '',
      sound_audio_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_social_stories_expires ON social_stories(expires_at DESC);

    -- Tabel Direct Message (DM) Terenkripsi E2EE (End-to-End Encryption) Seperti WhatsApp
    CREATE TABLE IF NOT EXISTS social_direct_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_username TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      recipient_username TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      tag TEXT NOT NULL,
      media_url TEXT DEFAULT '',
      media_type TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sdm_conv ON social_direct_messages(conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_sdm_recipient ON social_direct_messages(recipient_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_sdm_sender ON social_direct_messages(sender_id, created_at DESC);

    -- Tabel Wayground / Quizizz Engine
    CREATE TABLE IF NOT EXISTS wayground_quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      topic TEXT DEFAULT '',
      icon TEXT DEFAULT '📚',
      cover_url TEXT DEFAULT '',
      time_limit INTEGER DEFAULT 30,
      difficulty TEXT DEFAULT 'medium',
      questions_json TEXT NOT NULL,
      author TEXT DEFAULT 'Polaris Academy',
      plays_count INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wg_cat ON wayground_quizzes(category);

    CREATE TABLE IF NOT EXISTS wayground_history (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      quiz_title TEXT NOT NULL,
      mode TEXT DEFAULT 'solo',
      player_name TEXT DEFAULT 'Player',
      score INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      time_spent INTEGER DEFAULT 0,
      streak_record INTEGER DEFAULT 0,
      answers_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wg_hist_date ON wayground_history(created_at DESC);

    CREATE TABLE IF NOT EXISTS wayground_lobbies (
      pin TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      host_name TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      players_json TEXT DEFAULT '[]',
      current_question INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  try {
    db.exec('ALTER TABLE group_member_xp ADD COLUMN last_spin_at INTEGER NOT NULL DEFAULT 0');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN custom_ai_api_key TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_posts ADD COLUMN post_type TEXT DEFAULT "post"');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_posts ADD COLUMN extra_data_json TEXT DEFAULT "{}"');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_posts ADD COLUMN reposts_json TEXT DEFAULT "[]"');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_posts ADD COLUMN bookmarks_json TEXT DEFAULT "[]"');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_stories ADD COLUMN sound_title TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_stories ADD COLUMN sound_artist TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE social_stories ADD COLUMN sound_audio_url TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN phone_number TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN plain_password TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN plain_pin TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN current_session_token TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number)');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE downloader_history ADD COLUMN user_id TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('ALTER TABLE downloader_history ADD COLUMN instance_id TEXT DEFAULT ""');
  } catch (_) {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_dl_user_id ON downloader_history (user_id, created_at DESC)');
  } catch (_) {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_dl_instance_id ON downloader_history (instance_id, created_at DESC)');
  } catch (_) {}

  // Sanitasi & Karantina Kredensial: Kosongkan residu password atau PIN plain-text dari database
  try {
    db.exec("UPDATE users SET plain_password = '', plain_pin = '' WHERE plain_password != '' OR plain_pin != ''");
  } catch (_) {}
}

/**
 * Migrasi otomatis dari file-file JSON lama ke SQLite (hanya jika data SQLite masih kosong)
 */
function migrateFromJson() {
  try {
    // 1. Migrasi Pengguna Dashboard
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const usersJsonPath = path.resolve(config.paths.dashboardUsers || './database/dashboard_users.json');
    if (userCount === 0 && fs.existsSync(usersJsonPath)) {
      const raw = fs.readFileSync(usersJsonPath, 'utf-8');
      const users = JSON.parse(raw || '[]');
      if (Array.isArray(users) && users.length > 0) {
        const insertUser = db.prepare(`
          INSERT OR REPLACE INTO users 
          (id, username, password_hash, role, require_2fa, pin_hash, is_banned, linked_owner_number, created_at, updated_at)
          VALUES (@id, @username, @passwordHash, @role, @require2FA, @pinHash, @isBanned, @linkedOwnerNumber, @createdAt, @updatedAt)
        `);
        const insertMany = db.transaction((list) => {
          for (const u of list) {
            insertUser.run({
              id: u.id,
              username: u.username,
              passwordHash: u.passwordHash,
              role: u.role || 'member',
              require2FA: u.require2FA ? 1 : 0,
              pinHash: u.pinHash || null,
              isBanned: u.isBanned ? 1 : 0,
              linkedOwnerNumber: u.linkedOwnerNumber || '',
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        });
        insertMany(users);
        console.log(`[SQLite Migration] Berhasil memigrasi ${users.length} akun pengguna ke SQLite.`);
      }
    }

    // 2. Migrasi KV Store Konfigurasi
    const kvFiles = [
      { key: 'whitelist', file: config.paths.whitelist || './database/whitelist.json' },
      { key: 'groupSettings', file: config.paths.groupSettings || './database/groupSettings.json' },
      { key: 'privateChatSettings', file: config.paths.privateChatSettings || './database/privateChatSettings.json' },
      { key: 'commandOverrides', file: config.paths.commandOverrides || './database/command_overrides.json' },
      { key: 'customFeatures', file: config.paths.customFeatures || './database/custom_features.json' },
      { key: 'botProfile', file: './database/bot_profile.json' },
    ];

    const insertKv = db.prepare(`
      INSERT OR REPLACE INTO kv_store (key, value_json, updated_at)
      VALUES (?, ?, ?)
    `);

    for (const item of kvFiles) {
      const p = path.resolve(item.file);
      if (fs.existsSync(p)) {
        const existing = db.prepare('SELECT key FROM kv_store WHERE key = ?').get(item.key);
        if (!existing) {
          const content = fs.readFileSync(p, 'utf-8');
          insertKv.run(item.key, content, new Date().toISOString());
        }
      }
    }
    // 3. Migrasi Kolom Sound untuk Stories
    try { db.exec("ALTER TABLE social_stories ADD COLUMN sound_title TEXT DEFAULT ''"); } catch (_) {}
    try { db.exec("ALTER TABLE social_stories ADD COLUMN sound_artist TEXT DEFAULT ''"); } catch (_) {}
    try { db.exec("ALTER TABLE social_stories ADD COLUMN sound_audio_url TEXT DEFAULT ''"); } catch (_) {}
  } catch (err) {
    console.error('[SQLite Migration] Peringatan migrasi JSON ke SQLite:', err.message);
  }
}

// Inisialisasi awal saat pertama di-load
initSchema();
migrateFromJson();

// ==========================================
// HELPER METHODS: USERS
// ==========================================
function mapUserRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    username: r.username,
    phoneNumber: r.phone_number || '',
    passwordHash: r.password_hash,
    currentSessionToken: r.current_session_token || '',
    role: r.role || 'member',
    require2FA: Boolean(r.require_2fa),
    pinHash: r.pin_hash || null,
    isBanned: Boolean(r.is_banned),
    linkedOwnerNumber: r.linked_owner_number || '',
    avatarUrl: r.avatar_url || '',
    bio: r.bio || '',
    displayName: r.display_name || r.username,
    customAiApiKey: r.custom_ai_api_key || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const userQueries = {
  mapUserRow,
  getAll: db.prepare('SELECT * FROM users ORDER BY created_at ASC'),
  getById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getByUsername: db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)'),
  getByPhone: db.prepare('SELECT * FROM users WHERE phone_number = ?'),
  getByUsernameOrPhone: db.prepare(`
    SELECT * FROM users
    WHERE LOWER(username) = LOWER(?) OR (phone_number != '' AND phone_number = ?)
    LIMIT 1
  `),
  getAllUsers: () => userQueries.getAll.all().map(mapUserRow),
  getUserById: (id) => mapUserRow(userQueries.getById.get(id)),
  getUserByUsername: (u) => mapUserRow(userQueries.getByUsername.get(u)),
  getUserByPhone: (p) => mapUserRow(userQueries.getByPhone.get(p)),
  search: db.prepare(`
    SELECT id, username, phone_number, display_name, avatar_url, role, bio, created_at
    FROM users
    WHERE is_banned = 0 AND (LOWER(username) LIKE LOWER(?) OR LOWER(display_name) LIKE LOWER(?) OR phone_number LIKE ?)
    LIMIT 20
  `),
  insert: db.prepare(`
    INSERT INTO users (id, username, phone_number, password_hash, plain_password, plain_pin, current_session_token, role, require_2fa, pin_hash, is_banned, linked_owner_number, avatar_url, bio, display_name, custom_ai_api_key, created_at, updated_at)
    VALUES (@id, @username, @phone_number, @password_hash, '', '', @current_session_token, @role, @require_2fa, @pin_hash, @is_banned, @linked_owner_number, @avatar_url, @bio, @display_name, @custom_ai_api_key, @created_at, @updated_at)
  `),
  upsert: db.prepare(`
    INSERT INTO users (id, username, phone_number, password_hash, plain_password, plain_pin, current_session_token, role, require_2fa, pin_hash, is_banned, linked_owner_number, avatar_url, bio, display_name, custom_ai_api_key, created_at, updated_at)
    VALUES (@id, @username, @phone_number, @password_hash, '', '', @current_session_token, @role, @require_2fa, @pin_hash, @is_banned, @linked_owner_number, @avatar_url, @bio, @display_name, @custom_ai_api_key, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      phone_number = excluded.phone_number,
      password_hash = excluded.password_hash,
      plain_password = '',
      plain_pin = '',
      current_session_token = COALESCE(NULLIF(excluded.current_session_token, ''), users.current_session_token),
      role = excluded.role,
      require_2fa = excluded.require_2fa,
      pin_hash = excluded.pin_hash,
      is_banned = excluded.is_banned,
      linked_owner_number = excluded.linked_owner_number,
      avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), users.avatar_url),
      bio = COALESCE(NULLIF(excluded.bio, ''), users.bio),
      display_name = COALESCE(NULLIF(excluded.display_name, ''), users.display_name),
      custom_ai_api_key = COALESCE(NULLIF(excluded.custom_ai_api_key, ''), users.custom_ai_api_key),
      updated_at = excluded.updated_at
  `),
  update: db.prepare(`
    UPDATE users SET
      username = @username,
      phone_number = @phone_number,
      password_hash = @password_hash,
      plain_password = '',
      plain_pin = '',
      current_session_token = @current_session_token,
      role = @role,
      require_2fa = @require_2fa,
      pin_hash = @pin_hash,
      is_banned = @is_banned,
      linked_owner_number = @linked_owner_number,
      avatar_url = @avatar_url,
      bio = @bio,
      display_name = @display_name,
      custom_ai_api_key = @custom_ai_api_key,
      updated_at = @updated_at
    WHERE id = @id
  `),
  updateSession: db.prepare('UPDATE users SET current_session_token = ?, updated_at = ? WHERE id = ?'),
  updatePhone: db.prepare('UPDATE users SET phone_number = ?, updated_at = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
};

// ==========================================
// HELPER METHODS: FRIEND SYSTEM
// ==========================================
const friendQueries = {
  getPair: (u1, u2) => {
    const [first, second] = u1 < u2 ? [u1, u2] : [u2, u1];
    return db.prepare('SELECT * FROM friends WHERE user_id_1 = ? AND user_id_2 = ?').get(first, second);
  },
  areFriends: (u1, u2) => {
    const [first, second] = u1 < u2 ? [u1, u2] : [u2, u1];
    const row = db.prepare("SELECT status FROM friends WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'accepted'").get(first, second);
    return Boolean(row);
  },
  sendRequest: (fromId, toId) => {
    if (fromId === toId) throw new Error('Tidak dapat berteman dengan diri sendiri.');
    const [u1, u2] = fromId < toId ? [fromId, toId] : [toId, fromId];
    const existing = db.prepare('SELECT * FROM friends WHERE user_id_1 = ? AND user_id_2 = ?').get(u1, u2);
    const now = new Date().toISOString();
    if (existing) {
      if (existing.status === 'accepted') throw new Error('Anda sudah berteman dengan pengguna ini.');
      if (existing.status === 'pending') throw new Error('Permintaan pertemanan sudah dikirim sebelumnya.');
      db.prepare('UPDATE friends SET status = ?, requested_by = ?, updated_at = ? WHERE user_id_1 = ? AND user_id_2 = ?')
        .run('pending', fromId, now, u1, u2);
      return { success: true, message: 'Permintaan pertemanan dikirim ulang.' };
    }
    db.prepare('INSERT INTO friends (user_id_1, user_id_2, status, requested_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(u1, u2, 'pending', fromId, now, now);
    return { success: true, message: 'Permintaan pertemanan berhasil dikirim.' };
  },
  respondRequest: (userId, otherId, accept) => {
    const [u1, u2] = userId < otherId ? [userId, otherId] : [otherId, userId];
    const row = db.prepare('SELECT * FROM friends WHERE user_id_1 = ? AND user_id_2 = ?').get(u1, u2);
    if (!row) throw new Error('Permintaan pertemanan tidak ditemukan.');
    if (row.status === 'accepted') return { success: true, message: 'Sudah berteman.' };
    if (row.requested_by === userId) throw new Error('Anda tidak dapat merespon permintaan yang Anda kirim sendiri.');

    const now = new Date().toISOString();
    if (accept) {
      db.prepare('UPDATE friends SET status = ?, updated_at = ? WHERE user_id_1 = ? AND user_id_2 = ?')
        .run('accepted', now, u1, u2);
      return { success: true, message: 'Permintaan pertemanan diterima! Sekarang kalian bisa mabar bareng.' };
    } else {
      db.prepare('DELETE FROM friends WHERE user_id_1 = ? AND user_id_2 = ?').run(u1, u2);
      return { success: true, message: 'Permintaan pertemanan ditolak.' };
    }
  },
  getFriendsList: (userId) => {
    const rows = db.prepare(`
      SELECT f.*, 
        u1.id as u1_id, u1.username as u1_username, u1.display_name as u1_display, u1.avatar_url as u1_avatar, u1.role as u1_role,
        u2.id as u2_id, u2.username as u2_username, u2.display_name as u2_display, u2.avatar_url as u2_avatar, u2.role as u2_role
      FROM friends f
      LEFT JOIN users u1 ON f.user_id_1 = u1.id
      LEFT JOIN users u2 ON f.user_id_2 = u2.id
      WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND f.status = 'accepted'
      ORDER BY f.updated_at DESC
    `).all(userId, userId);

    return rows.map(r => {
      const isU1 = r.user_id_1 === userId;
      return {
        friendId: isU1 ? r.u2_id : r.u1_id,
        username: isU1 ? r.u2_username : r.u1_username,
        displayName: isU1 ? (r.u2_display || r.u2_username) : (r.u1_display || r.u1_username),
        avatarUrl: isU1 ? r.u2_avatar : r.u1_avatar,
        role: isU1 ? r.u2_role : r.u1_role,
        since: r.created_at,
      };
    });
  },
  getPendingIncoming: (userId) => {
    const rows = db.prepare(`
      SELECT f.*, 
        u.id as sender_id, u.username as sender_username, u.display_name as sender_display, u.avatar_url as sender_avatar, u.role as sender_role
      FROM friends f
      LEFT JOIN users u ON f.requested_by = u.id
      WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND f.status = 'pending' AND f.requested_by != ?
      ORDER BY f.created_at DESC
    `).all(userId, userId, userId);

    return rows.map(r => ({
      senderId: r.sender_id,
      username: r.sender_username,
      displayName: r.sender_display || r.sender_username,
      avatarUrl: r.sender_avatar,
      role: r.sender_role,
      createdAt: r.created_at,
    }));
  }
};

// ==========================================
// HELPER METHODS: GAME CHALLENGES (MABAR ONLINE)
// ==========================================
const challengeQueries = {
  create: ({ id, challengerId, challengerUsername, challengedId, challengedUsername, gameType, gameStateJson = '{}' }) => {
    const now = new Date().toISOString();
    return db.prepare(`
      INSERT INTO game_challenges (id, challenger_id, challenger_username, challenged_id, challenged_username, game_type, status, game_state_json, turn_user_id, winner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, '', ?, ?)
    `).run(id, challengerId, challengerUsername, challengedId, challengedUsername, gameType, gameStateJson, challengerId, now, now);
  },
  getById: (id) => db.prepare('SELECT * FROM game_challenges WHERE id = ?').get(id),
  getPendingForUser: (userId) => {
    // Otomatis tandai tantangan yang lewat dari 30 detik sebagai expired
    const thirtySecAgo = new Date(Date.now() - 30000).toISOString();
    try {
      db.prepare("UPDATE game_challenges SET status = 'expired' WHERE status = 'pending' AND created_at < ?").run(thirtySecAgo);
    } catch (_) {}

    return db.prepare(`
      SELECT * FROM game_challenges 
      WHERE challenged_id = ? AND status = 'pending' AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(userId, thirtySecAgo);
  },
  getActiveForUser: (userId) => {
    return db.prepare(`
      SELECT * FROM game_challenges 
      WHERE (challenger_id = ? OR challenged_id = ?) AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(userId, userId);
  },
  updateStatus: (id, status, winnerId = '') => {
    const now = new Date().toISOString();
    return db.prepare('UPDATE game_challenges SET status = ?, winner_id = ?, updated_at = ? WHERE id = ?')
      .run(status, winnerId, now, id);
  },
  cancel: (id, userId) => {
    const now = new Date().toISOString();
    return db.prepare("UPDATE game_challenges SET status = 'cancelled', updated_at = ? WHERE id = ? AND challenger_id = ? AND status = 'pending'")
      .run(now, id, userId);
  },
  updateState: (id, gameStateJson, turnUserId) => {
    const now = new Date().toISOString();
    return db.prepare('UPDATE game_challenges SET game_state_json = ?, turn_user_id = ?, updated_at = ? WHERE id = ?')
      .run(gameStateJson, turnUserId, now, id);
  }
};

// ==========================================
// HELPER METHODS: MEDSOS ASTRAONYX (SOCIAL POSTS)
// ==========================================
const socialQueries = {
  create: ({ id, authorId, authorUsername, authorDisplayName, authorAvatarUrl, authorRole, content, mediaUrl, postType = 'post', extraData = {} }) => {
    const now = new Date().toISOString();
    return db.prepare(`
      INSERT INTO social_posts (id, author_id, author_username, author_display_name, author_avatar_url, author_role, content, media_url, post_type, extra_data_json, likes_json, comments_json, reposts_json, bookmarks_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', ?, ?)
    `).run(
      id, authorId, authorUsername, authorDisplayName || authorUsername,
      authorAvatarUrl || '', authorRole || 'member', content, mediaUrl || '',
      postType, JSON.stringify(extraData || {}), now, now
    );
  },
  getAll: (limit = 50, postType = null) => {
    if (postType && postType !== 'all') {
      return db.prepare('SELECT * FROM social_posts WHERE post_type = ? ORDER BY created_at DESC LIMIT ?').all(postType, limit);
    }
    return db.prepare('SELECT * FROM social_posts ORDER BY created_at DESC LIMIT ?').all(limit);
  },
  getById: (id) => db.prepare('SELECT * FROM social_posts WHERE id = ?').get(id),
  toggleLike: (id, username) => {
    const post = db.prepare('SELECT likes_json FROM social_posts WHERE id = ?').get(id);
    if (!post) throw new Error('Postingan tidak ditemukan.');
    let likes = [];
    try { likes = JSON.parse(post.likes_json || '[]'); } catch (_) {}
    const idx = likes.indexOf(username);
    let liked = false;
    if (idx !== -1) {
      likes.splice(idx, 1);
      liked = false;
    } else {
      likes.push(username);
      liked = true;
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE social_posts SET likes_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(likes), now, id);
    return { success: true, liked, likesCount: likes.length };
  },
  toggleRepost: (id, username) => {
    const post = db.prepare('SELECT reposts_json FROM social_posts WHERE id = ?').get(id);
    if (!post) throw new Error('Postingan tidak ditemukan.');
    let reposts = [];
    try { reposts = JSON.parse(post.reposts_json || '[]'); } catch (_) {}
    const idx = reposts.indexOf(username);
    let reposted = false;
    if (idx !== -1) {
      reposts.splice(idx, 1);
      reposted = false;
    } else {
      reposts.push(username);
      reposted = true;
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE social_posts SET reposts_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(reposts), now, id);
    return { success: true, reposted, repostsCount: reposts.length };
  },
  toggleBookmark: (id, username) => {
    const post = db.prepare('SELECT bookmarks_json FROM social_posts WHERE id = ?').get(id);
    if (!post) throw new Error('Postingan tidak ditemukan.');
    let bookmarks = [];
    try { bookmarks = JSON.parse(post.bookmarks_json || '[]'); } catch (_) {}
    const idx = bookmarks.indexOf(username);
    let bookmarked = false;
    if (idx !== -1) {
      bookmarks.splice(idx, 1);
      bookmarked = false;
    } else {
      bookmarks.push(username);
      bookmarked = true;
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE social_posts SET bookmarks_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(bookmarks), now, id);
    return { success: true, bookmarked, bookmarksCount: bookmarks.length };
  },
  votePoll: (id, username, optionIndex) => {
    const post = db.prepare('SELECT extra_data_json FROM social_posts WHERE id = ?').get(id);
    if (!post) throw new Error('Postingan tidak ditemukan.');
    let extra = {};
    try { extra = JSON.parse(post.extra_data_json || '{}'); } catch (_) {}
    if (!extra.poll || !Array.isArray(extra.poll.options)) throw new Error('Postingan ini tidak memiliki polling.');
    
    extra.poll.votes = extra.poll.votes || {};
    extra.poll.votes[username] = optionIndex;
    
    const counts = extra.poll.options.map(() => 0);
    Object.values(extra.poll.votes).forEach(optIdx => {
      if (counts[optIdx] !== undefined) counts[optIdx]++;
    });
    extra.poll.counts = counts;
    extra.poll.totalVotes = Object.keys(extra.poll.votes).length;

    const now = new Date().toISOString();
    db.prepare('UPDATE social_posts SET extra_data_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(extra), now, id);
    return { success: true, poll: extra.poll };
  },
  addComment: (id, { authorUsername, authorDisplayName, authorAvatarUrl, commentText }) => {
    const post = db.prepare('SELECT comments_json FROM social_posts WHERE id = ?').get(id);
    if (!post) throw new Error('Postingan tidak ditemukan.');
    let comments = [];
    try { comments = JSON.parse(post.comments_json || '[]'); } catch (_) {}
    const newComment = {
      id: 'c_' + Date.now(),
      authorUsername,
      authorDisplayName: authorDisplayName || authorUsername,
      authorAvatarUrl: authorAvatarUrl || '',
      text: commentText,
      createdAt: new Date().toISOString()
    };
    comments.push(newComment);
    const now = new Date().toISOString();
    db.prepare('UPDATE social_posts SET comments_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(comments), now, id);
    return { success: true, comment: newComment, commentsCount: comments.length };
  },
  delete: (id, authorId, isCosmos = false) => {
    if (isCosmos) {
      return db.prepare('DELETE FROM social_posts WHERE id = ?').run(id);
    }
    return db.prepare('DELETE FROM social_posts WHERE id = ? AND author_id = ?').run(id, authorId);
  }
};

const storyQueries = {
  create: ({ id, authorId, authorUsername, authorDisplayName, authorAvatarUrl, mediaUrl, textContent, bgGradient, soundTitle = '', soundArtist = '', soundAudioUrl = '' }) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    return db.prepare(`
      INSERT INTO social_stories (id, author_id, author_username, author_display_name, author_avatar_url, media_url, text_content, bg_gradient, sound_title, sound_artist, sound_audio_url, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, authorId, authorUsername, authorDisplayName || authorUsername, authorAvatarUrl || '', mediaUrl || '', textContent || '', bgGradient || '', soundTitle || '', soundArtist || '', soundAudioUrl || '', now.toISOString(), expiresAt);
  },
  getActive: () => {
    const now = new Date().toISOString();
    return db.prepare('SELECT * FROM social_stories WHERE expires_at > ? ORDER BY created_at ASC').all(now);
  }
};

const dmQueries = {
  saveMessage: ({ id, conversationId, senderId, senderUsername, recipientId, recipientUsername, ciphertext, iv, tag, mediaUrl = '', mediaType = '' }) => {
    const now = new Date().toISOString();
    return db.prepare(`
      INSERT INTO social_direct_messages (id, conversation_id, sender_id, sender_username, recipient_id, recipient_username, ciphertext, iv, tag, media_url, media_type, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, conversationId, senderId, senderUsername, recipientId, recipientUsername, ciphertext, iv, tag, mediaUrl, mediaType, now);
  },
  getConversation: (conversationId, limit = 100) => {
    return db.prepare(`
      SELECT * FROM social_direct_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(conversationId, limit);
  },
  getRecentChats: (username) => {
    const cleanUser = String(username).toLowerCase();
    return db.prepare(`
      SELECT m.* FROM social_direct_messages m
      INNER JOIN (
        SELECT conversation_id, MAX(created_at) as max_created
        FROM social_direct_messages
        WHERE LOWER(sender_username) = ? OR LOWER(recipient_username) = ?
        GROUP BY conversation_id
      ) latest ON m.conversation_id = latest.conversation_id AND m.created_at = latest.max_created
      ORDER BY m.created_at DESC
    `).all(cleanUser, cleanUser);
  },
  markRead: (conversationId, recipientUsername) => {
    return db.prepare(`
      UPDATE social_direct_messages
      SET is_read = 1
      WHERE conversation_id = ? AND LOWER(recipient_username) = ? AND is_read = 0
    `).run(conversationId, String(recipientUsername).toLowerCase());
  },
  getUnreadCount: (recipientUsername) => {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM social_direct_messages WHERE LOWER(recipient_username) = ? AND is_read = 0').get(String(recipientUsername).toLowerCase());
      return row ? row.count : 0;
    } catch (_) {
      return 0;
    }
  },
  getAllUserMessages: (username) => {
    const cleanUser = String(username).toLowerCase();
    return db.prepare(`
      SELECT * FROM social_direct_messages
      WHERE LOWER(sender_username) = ? OR LOWER(recipient_username) = ?
      ORDER BY created_at ASC
    `).all(cleanUser, cleanUser);
  }
};


// ==========================================
// HELPER METHODS: AUTO-RESPONDERS
// ==========================================
const autoResponderQueries = {
  getAll: db.prepare('SELECT * FROM auto_responders ORDER BY created_at DESC'),
  getActive: db.prepare('SELECT * FROM auto_responders WHERE is_active = 1'),
  getById: db.prepare('SELECT * FROM auto_responders WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO auto_responders (id, keyword, match_type, response_type, response_content, media_url, scope, is_active, created_at, updated_at)
    VALUES (@id, @keyword, @match_type, @response_type, @response_content, @media_url, @scope, @is_active, @created_at, @updated_at)
  `),
  update: db.prepare(`
    UPDATE auto_responders SET
      keyword = @keyword,
      match_type = @match_type,
      response_type = @response_type,
      response_content = @response_content,
      media_url = @media_url,
      scope = @scope,
      is_active = @is_active,
      updated_at = @updated_at
    WHERE id = @id
  `),
  toggle: db.prepare('UPDATE auto_responders SET is_active = ?, updated_at = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM auto_responders WHERE id = ?'),
};

// ==========================================
// HELPER METHODS: ANALYTICS
// ==========================================
function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ALLOWED_METRICS = new Set(['message_count', 'command_count', 'download_count', 'error_count']);

const analyticsQueries = {
  getRange: db.prepare('SELECT * FROM bot_analytics ORDER BY date_str DESC LIMIT ?'),
  getToday: db.prepare('SELECT * FROM bot_analytics WHERE date_str = ?'),
  insertOrIgnoreToday: db.prepare(`
    INSERT OR IGNORE INTO bot_analytics (date_str, message_count, command_count, download_count, error_count, platforms_json, active_groups_json, updated_at)
    VALUES (?, 0, 0, 0, 0, '{}', '{}', ?)
  `),
  incrementMetric: (metric, amount = 1) => {
    if (!ALLOWED_METRICS.has(metric)) {
      throw new Error(`Metric '${metric}' tidak diizinkan untuk keamanan database.`);
    }
    const today = getTodayDateStr();
    analyticsQueries.insertOrIgnoreToday.run(today, new Date().toISOString());
    db.prepare(`UPDATE bot_analytics SET ${metric} = ${metric} + ?, updated_at = ? WHERE date_str = ?`).run(amount, new Date().toISOString(), today);
  },
  recordPlatformDownload: (platformName) => {
    if (!platformName) return;
    const today = getTodayDateStr();
    analyticsQueries.insertOrIgnoreToday.run(today, new Date().toISOString());
    const row = analyticsQueries.getToday.get(today);
    let platforms = {};
    try {
      platforms = JSON.parse(row?.platforms_json || '{}');
    } catch (_) {}
    platforms[platformName] = (platforms[platformName] || 0) + 1;
    db.prepare('UPDATE bot_analytics SET download_count = download_count + 1, platforms_json = ?, updated_at = ? WHERE date_str = ?')
      .run(JSON.stringify(platforms), new Date().toISOString(), today);
  },
  recordGroupActivity: (groupJid, groupName) => {
    if (!groupJid) return;
    const today = getTodayDateStr();
    analyticsQueries.insertOrIgnoreToday.run(today, new Date().toISOString());
    const row = analyticsQueries.getToday.get(today);
    let groups = {};
    try {
      groups = JSON.parse(row?.active_groups_json || '{}');
    } catch (_) {}
    const key = groupName || groupJid;
    groups[key] = (groups[key] || 0) + 1;
    db.prepare('UPDATE bot_analytics SET active_groups_json = ?, updated_at = ? WHERE date_str = ?')
      .run(JSON.stringify(groups), new Date().toISOString(), today);
  },
  getSummary: () => {
    const rows = db.prepare('SELECT * FROM bot_analytics ORDER BY date_str DESC LIMIT 30').all();
    let totalMessages = 0;
    let totalCommands = 0;
    let totalDownloads = 0;
    let totalErrors = 0;
    const platformTotals = {};
    const groupTotals = {};

    rows.forEach(r => {
      totalMessages += r.message_count;
      totalCommands += r.command_count;
      totalDownloads += r.download_count;
      totalErrors += r.error_count;
      try {
        const p = JSON.parse(r.platforms_json || '{}');
        Object.entries(p).forEach(([k, v]) => platformTotals[k] = (platformTotals[k] || 0) + v);
      } catch (_) {}
      try {
        const g = JSON.parse(r.active_groups_json || '{}');
        Object.entries(g).forEach(([k, v]) => groupTotals[k] = (groupTotals[k] || 0) + v);
      } catch (_) {}
    });

    return {
      history: rows.reverse(), // chronologically ascending
      totals: { totalMessages, totalCommands, totalDownloads, totalErrors },
      platformTotals,
      groupTotals,
    };
  }
};

// ==========================================
// HELPER METHODS: KV STORE
// ==========================================
const kvQueries = {
  get: (key, defaultValue = null) => {
    const row = db.prepare('SELECT value_json FROM kv_store WHERE key = ?').get(key);
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value_json);
    } catch (_) {
      return defaultValue;
    }
  },
  set: (key, value) => {
    const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    db.prepare(`
      INSERT INTO kv_store (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run(key, str, new Date().toISOString());
  },
};

// ==========================================
// HELPER METHODS: MESSAGE VAULT (GHOST PROTOCOL)
// ==========================================
const messageVaultQueries = {
  save: db.prepare(`
    INSERT OR REPLACE INTO message_vault (id, chat_jid, sender_jid, sender_name, message_type, content_text, media_path, is_view_once, is_revoked, timestamp, created_at)
    VALUES (@id, @chat_jid, @sender_jid, @sender_name, @message_type, @content_text, @media_path, @is_view_once, @is_revoked, @timestamp, @created_at)
  `),
  getById: db.prepare('SELECT * FROM message_vault WHERE id = ?'),
  getRecent: db.prepare('SELECT * FROM message_vault ORDER BY timestamp DESC LIMIT ?'),
  markRevoked: db.prepare('UPDATE message_vault SET is_revoked = 1 WHERE id = ?'),
  count: db.prepare('SELECT COUNT(*) as total FROM message_vault'),
};

// ==========================================
// HELPER METHODS: GROUP XP & RANK
// ==========================================
const rankQueries = {
  getGroupSetting: db.prepare('SELECT * FROM group_rank_settings WHERE group_jid = ?'),
  setGroupSetting: db.prepare(`
    INSERT INTO group_rank_settings (group_jid, is_enabled, level_up_notice, created_at, updated_at)
    VALUES (@group_jid, @is_enabled, @level_up_notice, @created_at, @updated_at)
    ON CONFLICT(group_jid) DO UPDATE SET
      is_enabled = excluded.is_enabled,
      level_up_notice = excluded.level_up_notice,
      updated_at = excluded.updated_at
  `),
  getUserXp: db.prepare('SELECT * FROM group_member_xp WHERE group_jid = ? AND user_jid = ?'),
  upsertUserXp: db.prepare(`
    INSERT INTO group_member_xp (group_jid, user_jid, user_name, xp, level, message_count, last_xp_at, created_at, updated_at)
    VALUES (@group_jid, @user_jid, @user_name, @xp, @level, @message_count, @last_xp_at, @created_at, @updated_at)
    ON CONFLICT(group_jid, user_jid) DO UPDATE SET
      user_name = CASE WHEN excluded.user_name != '' THEN excluded.user_name ELSE group_member_xp.user_name END,
      xp = excluded.xp,
      level = excluded.level,
      message_count = excluded.message_count,
      last_xp_at = excluded.last_xp_at,
      updated_at = excluded.updated_at
  `),
  getLeaderboard: db.prepare(`
    SELECT user_jid, user_name, xp, level, message_count 
    FROM group_member_xp 
    WHERE group_jid = ? 
    ORDER BY xp DESC 
    LIMIT ?
  `),
  getUserRank: db.prepare(`
    SELECT COUNT(*) + 1 as rank 
    FROM group_member_xp 
    WHERE group_jid = ? AND xp > ?
  `),
  getTotalMembers: db.prepare('SELECT COUNT(*) as total FROM group_member_xp WHERE group_jid = ?'),
  resetGroup: db.prepare('DELETE FROM group_member_xp WHERE group_jid = ?'),
  updateSpinTime: db.prepare('UPDATE group_member_xp SET last_spin_at = ?, updated_at = ? WHERE group_jid = ? AND user_jid = ?'),
};

// ==========================================
// HELPER METHODS: GROUP DUEL BATTLE
// ==========================================
const duelQueries = {
  getDailyDuelCount: db.prepare(`
    SELECT duel_count FROM group_duel_history 
    WHERE group_jid = ? AND user_a = ? AND user_b = ? AND duel_date = ?
  `),
  incrementDailyDuelCount: db.prepare(`
    INSERT INTO group_duel_history (group_jid, user_a, user_b, duel_date, duel_count, updated_at)
    VALUES (@group_jid, @user_a, @user_b, @duel_date, 1, @updated_at)
    ON CONFLICT(group_jid, user_a, user_b, duel_date) DO UPDATE SET
      duel_count = group_duel_history.duel_count + 1,
      updated_at = excluded.updated_at
  `),
};

// ==========================================
// HELPER METHODS: DIGITAL TIME CAPSULE
// ==========================================
const capsuleQueries = {
  insert: db.prepare(`
    INSERT INTO time_capsules (id, chat_jid, creator_jid, creator_name, target_jid, target_name, message_content, unlock_at, is_opened, created_at)
    VALUES (@id, @chat_jid, @creator_jid, @creator_name, @target_jid, @target_name, @message_content, @unlock_at, 0, @created_at)
  `),
  getDue: db.prepare(`
    SELECT * FROM time_capsules 
    WHERE unlock_at <= ? AND is_opened = 0 
    ORDER BY unlock_at ASC
  `),
  markOpened: db.prepare(`
    UPDATE time_capsules SET is_opened = 1 WHERE id = ?
  `),
  getByCreator: db.prepare(`
    SELECT * FROM time_capsules 
    WHERE chat_jid = ? AND creator_jid = ? AND is_opened = 0 
    ORDER BY unlock_at ASC
  `),
  delete: db.prepare(`
    DELETE FROM time_capsules WHERE id = ? AND creator_jid = ?
  `),
  getAllPending: db.prepare(`
    SELECT COUNT(*) as count FROM time_capsules WHERE is_opened = 0
  `),
};

// ==========================================
// HELPER METHODS: DB SECURITY & BACKUPS
// ==========================================
const dbSecurity = {
  createBackup: async () => {
    const backupDir = path.resolve(__dirname, '../database/backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupPath = path.join(backupDir, `polaris_backup_${timestamp}.sqlite`);
    await db.backup(backupPath);
    // Rotasi: simpan maksimal 10 file backup terakhir
    try {
      const files = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith('polaris_backup_') && f.endsWith('.sqlite'))
        .sort()
        .reverse();
      if (files.length > 10) {
        for (const oldFile of files.slice(10)) {
          try { fs.unlinkSync(path.join(backupDir, oldFile)); } catch (_) {}
        }
      }
    } catch (_) {}
    return { success: true, backupPath, filename: path.basename(backupPath) };
  },
  listBackups: () => {
    const backupDir = path.resolve(__dirname, '../database/backups');
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.sqlite'))
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  runIntegrityCheck: () => {
    const check = db.pragma('integrity_check');
    return check;
  },
};

const downloaderHistoryQueries = {
  add: (item) => {
    try {
      const id = item.id || `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const userId = item.userId || item.user_id || '';
      const instanceId = item.instanceId || item.instance_id || '';

      // Check duplicate URL in latest 5 entries to avoid spamming same link
      const existing = db.prepare(`SELECT id FROM downloader_history WHERE url = ? AND (user_id = ? OR user_id = '')`).get(item.url, userId);
      if (existing) {
        db.prepare(`
          UPDATE downloader_history SET
            title = @title,
            platform = @platform,
            author = @author,
            duration = @duration,
            thumbnail = @thumbnail,
            media_type = @media_type,
            used_server = @used_server,
            source = @source,
            chat_jid = @chat_jid,
            sender_number = @sender_number,
            user_id = @user_id,
            instance_id = @instance_id,
            downloads_json = @downloads_json,
            slides_json = @slides_json,
            created_at = @created_at
          WHERE id = @id
        `).run({
          id: existing.id,
          title: item.title || 'Media Download',
          platform: item.platform || 'universal',
          author: item.author || '',
          duration: item.duration || '',
          thumbnail: item.thumbnail || '',
          media_type: item.mediaType || item.media_type || 'video',
          used_server: typeof item.usedServer === 'object' ? (item.usedServer.name || item.usedServer.id) : (item.usedServer || item.used_server || 'Server 1'),
          source: item.source || 'web',
          chat_jid: item.chatJid || item.chat_jid || '',
          sender_number: item.senderNumber || item.sender_number || '',
          user_id: userId,
          instance_id: instanceId,
          downloads_json: typeof item.downloads === 'string' ? item.downloads : JSON.stringify(item.downloads || []),
          slides_json: typeof item.slides === 'string' ? item.slides : JSON.stringify(item.slides || []),
          created_at: item.createdAt || item.created_at || new Date().toISOString(),
        });
        return existing.id;
      }

      const stmt = db.prepare(`
        INSERT INTO downloader_history (
          id, url, title, platform, author, duration, thumbnail,
          media_type, used_server, source, chat_jid, sender_number,
          user_id, instance_id,
          downloads_json, slides_json, created_at
        ) VALUES (
          @id, @url, @title, @platform, @author, @duration, @thumbnail,
          @media_type, @used_server, @source, @chat_jid, @sender_number,
          @user_id, @instance_id,
          @downloads_json, @slides_json, @created_at
        )
      `);
      stmt.run({
        id,
        url: item.url,
        title: item.title || 'Media Download',
        platform: item.platform || 'universal',
        author: item.author || '',
        duration: item.duration || '',
        thumbnail: item.thumbnail || '',
        media_type: item.mediaType || item.media_type || 'video',
        used_server: typeof item.usedServer === 'object' ? (item.usedServer.name || item.usedServer.id) : (item.usedServer || item.used_server || 'Server 1'),
        source: item.source || 'web',
        chat_jid: item.chatJid || item.chat_jid || '',
        sender_number: item.senderNumber || item.sender_number || '',
        user_id: userId,
        instance_id: instanceId,
        downloads_json: typeof item.downloads === 'string' ? item.downloads : JSON.stringify(item.downloads || []),
        slides_json: typeof item.slides === 'string' ? item.slides : JSON.stringify(item.slides || []),
        created_at: item.createdAt || item.created_at || new Date().toISOString(),
      });
      return id;
    } catch (err) {
      console.warn('[downloaderHistory:add] Gagal simpan riwayat unduhan:', err.message);
      return null;
    }
  },

  getRecent: (limit = 100, userId = null, isCosmos = false) => {
    try {
      let rows;
      if (userId && !isCosmos) {
        rows = db.prepare(`SELECT * FROM downloader_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`).all(userId, limit);
      } else {
        rows = db.prepare(`SELECT * FROM downloader_history ORDER BY created_at DESC LIMIT ?`).all(limit);
      }
      return rows.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        platform: r.platform,
        author: r.author,
        duration: r.duration,
        thumbnail: r.thumbnail,
        mediaType: r.media_type,
        usedServer: r.used_server,
        source: r.source,
        chatJid: r.chat_jid,
        senderNumber: r.sender_number,
        userId: r.user_id || '',
        instanceId: r.instance_id || '',
        downloads: JSON.parse(r.downloads_json || '[]'),
        slides: JSON.parse(r.slides_json || '[]'),
        createdAt: r.created_at,
      }));
    } catch (err) {
      console.warn('[downloaderHistory:getRecent] Error:', err.message);
      return [];
    }
  },

  delete: (id, userId = null, isCosmos = false) => {
    try {
      if (userId && !isCosmos) {
        return db.prepare(`DELETE FROM downloader_history WHERE id = ? AND user_id = ?`).run(id, userId);
      }
      return db.prepare(`DELETE FROM downloader_history WHERE id = ?`).run(id);
    } catch (err) {
      console.warn('[downloaderHistory:delete] Error:', err.message);
      return { changes: 0 };
    }
  },

  clear: (userId = null, isCosmos = false) => {
    try {
      if (userId && !isCosmos) {
        return db.prepare(`DELETE FROM downloader_history WHERE user_id = ?`).run(userId);
      }
      return db.prepare(`DELETE FROM downloader_history`).run();
    } catch (err) {
      console.warn('[downloaderHistory:clear] Error:', err.message);
      return { changes: 0 };
    }
  },

  getStats: (userId = null, isCosmos = false) => {
    try {
      if (userId && !isCosmos) {
        const total = db.prepare(`SELECT COUNT(*) as count FROM downloader_history WHERE user_id = ?`).get(userId)?.count || 0;
        const byPlatform = db.prepare(`SELECT platform, COUNT(*) as count FROM downloader_history WHERE user_id = ? GROUP BY platform`).all(userId);
        const bySource = db.prepare(`SELECT source, COUNT(*) as count FROM downloader_history WHERE user_id = ? GROUP BY source`).all(userId);
        return { total, byPlatform, bySource };
      }
      const total = db.prepare(`SELECT COUNT(*) as count FROM downloader_history`).get().count;
      const byPlatform = db.prepare(`SELECT platform, COUNT(*) as count FROM downloader_history GROUP BY platform`).all();
      const bySource = db.prepare(`SELECT source, COUNT(*) as count FROM downloader_history GROUP BY source`).all();
      return { total, byPlatform, bySource };
    } catch (err) {
      return { total: 0, byPlatform: [], bySource: [] };
    }
  },
};

const raidQueries = {
  recordRaidOutcome: (data) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO raid_history (
          id, group_jid, boss_name, boss_tier, total_hp, mvp_jid, mvp_name, mvp_damage,
          last_hit_jid, last_hit_name, participants_count, status, created_at
        ) VALUES (
          @id, @group_jid, @boss_name, @boss_tier, @total_hp, @mvp_jid, @mvp_name, @mvp_damage,
          @last_hit_jid, @last_hit_name, @participants_count, @status, @created_at
        )
      `);
      stmt.run({
        id: data.id || `raid_${Date.now()}`,
        group_jid: data.group_jid || data.groupJid,
        boss_name: data.boss_name || data.bossName,
        boss_tier: data.boss_tier || data.bossTier || 'V',
        total_hp: data.total_hp || data.totalHp || 5000,
        mvp_jid: data.mvp_jid || data.mvpJid || '',
        mvp_name: data.mvp_name || data.mvpName || '',
        mvp_damage: data.mvp_damage || data.mvpDamage || 0,
        last_hit_jid: data.last_hit_jid || data.lastHitJid || '',
        last_hit_name: data.last_hit_name || data.lastHitName || '',
        participants_count: data.participants_count || data.participantsCount || 0,
        status: data.status || 'defeated',
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.warn('[raidQueries:recordRaidOutcome] Error:', err.message);
      return false;
    }
  },

  getRecentRaids: (limit = 20) => {
    try {
      return db.prepare(`SELECT * FROM raid_history ORDER BY created_at DESC LIMIT ?`).all(limit);
    } catch (err) {
      return [];
    }
  },

  getUserTitles: (userJid) => {
    try {
      const clean = String(userJid || '').trim();
      const withSuffix = clean.includes('@') ? clean : `${clean.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      const numOnly = clean.replace(/[^0-9]/g, '');
      return db.prepare(`
        SELECT * FROM user_raid_titles 
        WHERE user_jid = ? OR user_jid = ? OR user_jid = ?
        ORDER BY unlocked_at DESC
      `).all(clean, withSuffix, numOnly);
    } catch (err) {
      return [];
    }
  },

  unlockTitle: (userJid, titleId, titleName, titleBadge = '🎖️', titleDesc = '') => {
    try {
      const clean = String(userJid || '').trim();
      const canonicalJid = clean.includes('@') ? clean : `${clean.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      const id = `ut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const existing = db.prepare(`
        SELECT id FROM user_raid_titles 
        WHERE (user_jid = ? OR user_jid = ?) AND title_id = ?
      `).get(canonicalJid, clean, titleId);
      if (existing) return false;
      db.prepare(`
        INSERT INTO user_raid_titles (id, user_jid, title_id, title_name, title_badge, title_desc, is_equipped, unlocked_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, canonicalJid, titleId, titleName, titleBadge, titleDesc, now);
      return true;
    } catch (err) {
      console.warn('[raidQueries:unlockTitle] Error:', err.message);
      return false;
    }
  },

  equipTitle: (userJid, titleId) => {
    try {
      const clean = String(userJid || '').trim();
      const canonicalJid = clean.includes('@') ? clean : `${clean.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      db.prepare(`UPDATE user_raid_titles SET is_equipped = 0 WHERE user_jid = ? OR user_jid = ?`).run(canonicalJid, clean);
      if (titleId && titleId !== 'none') {
        const res = db.prepare(`
          UPDATE user_raid_titles SET is_equipped = 1 
          WHERE (user_jid = ? OR user_jid = ?) AND (title_id = ? OR id = ?)
        `).run(canonicalJid, clean, titleId, titleId);
        return res.changes > 0;
      }
      return true;
    } catch (err) {
      return false;
    }
  },

  getEquippedTitle: (userJid) => {
    try {
      const clean = String(userJid || '').trim();
      const canonicalJid = clean.includes('@') ? clean : `${clean.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      return db.prepare(`
        SELECT * FROM user_raid_titles 
        WHERE (user_jid = ? OR user_jid = ?) AND is_equipped = 1 
        LIMIT 1
      `).get(canonicalJid, clean) || null;
    } catch (err) {
      return null;
    }
  },

  getAllRaidChampions: (limit = 10) => {
    try {
      const rows = db.prepare(`
        SELECT mvp_jid, mvp_name, SUM(mvp_damage) as total_damage, COUNT(*) as raids_won
        FROM raid_history
        WHERE status = 'defeated' AND mvp_jid != ''
        GROUP BY mvp_jid
        ORDER BY raids_won DESC, total_damage DESC
        LIMIT ?
      `).all(limit);

      return rows.map((r) => {
        const equipped = raidQueries.getEquippedTitle(r.mvp_jid);
        const titles = raidQueries.getUserTitles(r.mvp_jid);
        return {
          user_jid: r.mvp_jid,
          user_name: r.mvp_name,
          total_damage: r.total_damage,
          raids_won: r.raids_won,
          total_titles: titles.length,
          equipped_title: equipped?.title_name || 'Cyber Raider',
          equipped_badge: equipped?.title_badge || '🎖️',
        };
      });
    } catch (err) {
      return [];
    }
  },
};

const taskQueries = {
  setReminderTarget: (chatJid, enabled = 1, dailyRemindTime = '07:00', setBy = '') => {
    try {
      const now = Date.now();
      return db.prepare(`
        INSERT INTO reminder_targets (chat_jid, enabled, daily_remind_time, set_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(chat_jid) DO UPDATE SET
          enabled = excluded.enabled,
          daily_remind_time = excluded.daily_remind_time,
          set_by = CASE WHEN excluded.set_by != '' THEN excluded.set_by ELSE reminder_targets.set_by END,
          updated_at = excluded.updated_at
      `).run(chatJid, enabled ? 1 : 0, dailyRemindTime, setBy, now, now);
    } catch (err) {
      console.error('[db] Error setReminderTarget:', err.message);
      return null;
    }
  },

  getReminderTarget: (chatJid) => {
    try {
      return db.prepare('SELECT * FROM reminder_targets WHERE chat_jid = ?').get(chatJid);
    } catch (err) {
      return null;
    }
  },

  getAllActiveTargets: () => {
    try {
      return db.prepare('SELECT * FROM reminder_targets WHERE enabled = 1').all();
    } catch (err) {
      return [];
    }
  },

  addTask: ({ id, targetJid, creatorJid, taskName, deadlineAt, deadlineStr }) => {
    try {
      const now = Date.now();
      return db.prepare(`
        INSERT INTO task_reminders (id, target_jid, creator_jid, task_name, deadline_at, deadline_str, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(id, targetJid, creatorJid, taskName, deadlineAt, deadlineStr, now, now);
    } catch (err) {
      console.error('[db] Error addTask:', err.message);
      return null;
    }
  },

  getActiveTasks: (targetJid = null) => {
    try {
      if (targetJid) {
        return db.prepare(`
          SELECT * FROM task_reminders 
          WHERE target_jid = ? AND status = 'active'
          ORDER BY deadline_at ASC
        `).all(targetJid);
      }
      return db.prepare(`
        SELECT * FROM task_reminders 
        WHERE status = 'active'
        ORDER BY deadline_at ASC
      `).all();
    } catch (err) {
      return [];
    }
  },

  getAllTasks: (targetJid = null, limit = 50) => {
    try {
      if (targetJid) {
        return db.prepare(`
          SELECT * FROM task_reminders 
          WHERE target_jid = ?
          ORDER BY created_at DESC
          LIMIT ?
        `).all(targetJid, limit);
      }
      return db.prepare(`
        SELECT * FROM task_reminders 
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit);
    } catch (err) {
      return [];
    }
  },

  getTaskByIdOrName: (targetJid, searchStr) => {
    try {
      const q = String(searchStr || '').trim();
      if (!q) return null;
      let row = db.prepare('SELECT * FROM task_reminders WHERE target_jid = ? AND id = ? AND status = \'active\'').get(targetJid, q);
      if (row) return row;
      row = db.prepare('SELECT * FROM task_reminders WHERE target_jid = ? AND LOWER(task_name) = LOWER(?) AND status = \'active\'').get(targetJid, q);
      if (row) return row;
      row = db.prepare('SELECT * FROM task_reminders WHERE target_jid = ? AND LOWER(task_name) LIKE LOWER(?) AND status = \'active\' ORDER BY deadline_at ASC LIMIT 1').get(targetJid, `%${q}%`);
      return row || null;
    } catch (err) {
      return null;
    }
  },

  updateTaskTime: (id, deadlineAt, deadlineStr) => {
    try {
      return db.prepare(`
        UPDATE task_reminders 
        SET deadline_at = ?, deadline_str = ?, updated_at = ?
        WHERE id = ?
      `).run(deadlineAt, deadlineStr, Date.now(), id);
    } catch (err) {
      return null;
    }
  },

  editTask: (id, newTaskName, deadlineAt, deadlineStr) => {
    try {
      return db.prepare(`
        UPDATE task_reminders 
        SET task_name = ?, deadline_at = ?, deadline_str = ?, updated_at = ?
        WHERE id = ?
      `).run(newTaskName, deadlineAt, deadlineStr, Date.now(), id);
    } catch (err) {
      return null;
    }
  },

  deleteTaskWithReason: (id, reason) => {
    try {
      return db.prepare(`
        UPDATE task_reminders 
        SET status = 'deleted', delete_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(reason || 'Dihapus oleh pengguna', Date.now(), id);
    } catch (err) {
      return null;
    }
  },

  markAutoDeleted: (id) => {
    try {
      return db.prepare(`
        UPDATE task_reminders 
        SET status = 'auto_deleted', delete_reason = 'Otomatis dihapus karena lewat 3 hari dari deadline', updated_at = ?
        WHERE id = ?
      `).run(Date.now(), id);
    } catch (err) {
      return null;
    }
  },

  cleanOldExpiredTasks: (nowMs = Date.now()) => {
    try {
      const cutoff = nowMs - (3 * 24 * 60 * 60 * 1000);
      const expiredTasks = db.prepare(`
        SELECT * FROM task_reminders 
        WHERE status = 'active' AND deadline_at <= ?
      `).all(cutoff);

      if (expiredTasks.length > 0) {
        const ids = expiredTasks.map(t => t.id);
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`
          UPDATE task_reminders 
          SET status = 'auto_deleted', delete_reason = 'Otomatis dihapus karena lewat 3 hari dari deadline', updated_at = ?
          WHERE id IN (${placeholders})
        `).run(nowMs, ...ids);
      }

      return expiredTasks;
    } catch (err) {
      console.error('[db] Error cleanOldExpiredTasks:', err.message);
      return [];
    }
  },

  updateLastReminded: (id, timestamp = Date.now(), isOverdue = false) => {
    try {
      if (isOverdue) {
        return db.prepare('UPDATE task_reminders SET last_reminded_at = ?, overdue_reminded = overdue_reminded + 1 WHERE id = ?').run(timestamp, id);
      }
      return db.prepare('UPDATE task_reminders SET last_reminded_at = ? WHERE id = ?').run(timestamp, id);
    } catch (err) {
      return null;
    }
  },
};

// ==================== QUERY LOGIK: LOGIN & SESSION ANALYTICS ====================
const loginHistoryQueries = {
  recordLogin: ({ userId, username, role, ipAddress = '', userAgent = '', success = 1 }) => {
    try {
      const now = new Date();
      const loginAt = now.toISOString();
      const loginTimestamp = now.getTime();
      return db.prepare(`
        INSERT INTO login_history (user_id, username, role, ip_address, user_agent, login_at, login_timestamp, success)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId || 'anonymous', username || 'unknown', role || 'guest', ipAddress, userAgent, loginAt, loginTimestamp, success ? 1 : 0);
    } catch (err) {
      console.error('[db] Error recordLogin:', err.message);
      return null;
    }
  },

  getLoginStats: ({ range = 'day', from = null, to = null }) => {
    try {
      let timeFilterSql = '';
      let params = [];
      let groupFormat = '%Y-%m-%d';
      let limitRows = 50;

      const now = Date.now();

      if (range === 'hour') {
        const past24h = now - (24 * 60 * 60 * 1000);
        timeFilterSql = 'WHERE login_timestamp >= ?';
        params.push(past24h);
        groupFormat = '%Y-%m-%d %H:00';
        limitRows = 24;
      } else if (range === 'day') {
        const past30d = now - (30 * 24 * 60 * 60 * 1000);
        timeFilterSql = 'WHERE login_timestamp >= ?';
        params.push(past30d);
        groupFormat = '%Y-%m-%d';
        limitRows = 30;
      } else if (range === 'month') {
        const past12m = now - (365 * 24 * 60 * 60 * 1000);
        timeFilterSql = 'WHERE login_timestamp >= ?';
        params.push(past12m);
        groupFormat = '%Y-%m';
        limitRows = 12;
      } else if (range === 'year') {
        timeFilterSql = '';
        groupFormat = '%Y';
        limitRows = 10;
      } else if (range === 'custom') {
        const fromTs = from ? new Date(from).getTime() : now - (7 * 24 * 60 * 60 * 1000);
        const toTs = to ? new Date(to).getTime() : now;
        timeFilterSql = 'WHERE login_timestamp >= ? AND login_timestamp <= ?';
        params.push(fromTs, toTs);

        const diffHours = (toTs - fromTs) / (3600 * 1000);
        if (diffHours <= 72) {
          groupFormat = '%Y-%m-%d %H:00';
        } else if (diffHours <= 24 * 90) {
          groupFormat = '%Y-%m-%d';
        } else {
          groupFormat = '%Y-%m';
        }
        limitRows = 200;
      }

      // Summary counts
      const summary = db.prepare(`
        SELECT 
          COUNT(*) as totalLogins,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successfulLogins,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failedLogins,
          COUNT(DISTINCT username) as uniqueUsers
        FROM login_history
        ${timeFilterSql}
      `).get(...params) || { totalLogins: 0, successfulLogins: 0, failedLogins: 0, uniqueUsers: 0 };

      // Timeline grouping
      const timeline = db.prepare(`
        SELECT 
          strftime('${groupFormat}', login_at) as label,
          COUNT(*) as count,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failCount
        FROM login_history
        ${timeFilterSql}
        GROUP BY label
        ORDER BY label ASC
        LIMIT ${limitRows}
      `).all(...params);

      // Top Users
      const topUsers = db.prepare(`
        SELECT 
          username,
          role,
          COUNT(*) as count,
          MAX(login_at) as lastLogin
        FROM login_history
        ${timeFilterSql}
        GROUP BY username, role
        ORDER BY count DESC
        LIMIT 10
      `).all(...params);

      // Recent 15 login records
      const recentLogins = db.prepare(`
        SELECT id, username, role, ip_address, user_agent, login_at, success
        FROM login_history
        ORDER BY login_timestamp DESC
        LIMIT 15
      `).all();

      return {
        success: true,
        range,
        summary: {
          totalLogins: summary.totalLogins || 0,
          successfulLogins: summary.successfulLogins || 0,
          failedLogins: summary.failedLogins || 0,
          uniqueUsers: summary.uniqueUsers || 0,
        },
        timeline: timeline || [],
        topUsers: topUsers || [],
        recentLogins: recentLogins || [],
      };
    } catch (err) {
      console.error('[db] Error getLoginStats:', err.message);
      return {
        success: false,
        error: err.message,
        summary: { totalLogins: 0, successfulLogins: 0, failedLogins: 0, uniqueUsers: 0 },
        timeline: [],
        topUsers: [],
        recentLogins: [],
      };
    }
  },
};

// ==================== QUERY LOGIK: GAMES ARENA & STARLIUM AI ====================
const gameQueries = {
  // Simpan match chess untuk pelatihan Starlium AI
  saveStarliumMatch: ({
    gameId,
    pgn,
    fenFinal = '',
    result,
    whitePlayer = 'human',
    blackPlayer = 'starlium',
    difficulty = 'medium',
    movesCount = 0,
    openingName = 'Standard Opening',
    openingEco = '',
    learnedPatterns = [],
  }) => {
    try {
      const now = new Date();
      const insert = db.prepare(`
        INSERT OR REPLACE INTO starlium_matches
        (game_id, pgn, fen_final, result, white_player, black_player, difficulty, moves_count, opening_name, opening_eco, learned_patterns_json, created_at, created_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      return insert.run(
        gameId || `match_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        pgn,
        fenFinal,
        result,
        whitePlayer,
        blackPlayer,
        difficulty,
        movesCount,
        openingName,
        openingEco,
        JSON.stringify(learnedPatterns || []),
        now.toISOString(),
        now.getTime()
      );
    } catch (err) {
      console.error('[db] Error saveStarliumMatch:', err.message);
      return null;
    }
  },

  // Statistik kumulatif Starlium AI
  getStarliumStats: () => {
    try {
      const row = db.prepare(`
        SELECT 
          COUNT(*) as totalMatches,
          SUM(CASE WHEN result = 'white' THEN 1 ELSE 0 END) as whiteWins,
          SUM(CASE WHEN result = 'black' THEN 1 ELSE 0 END) as blackWins,
          SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
          AVG(moves_count) as avgMoves
        FROM starlium_matches
      `).get() || {};

      const topOpenings = db.prepare(`
        SELECT opening_name, opening_eco, COUNT(*) as frequency,
               SUM(CASE WHEN result = 'white' THEN 1 ELSE 0 END) as whiteWon,
               SUM(CASE WHEN result = 'black' THEN 1 ELSE 0 END) as blackWon
        FROM starlium_matches
        WHERE opening_name != '' AND opening_name IS NOT NULL
        GROUP BY opening_name, opening_eco
        ORDER BY frequency DESC
        LIMIT 10
      `).all();

      const totalMatches = row.totalMatches || 0;
      const targetMatches = 500000;
      const isUnlocked = totalMatches >= targetMatches;
      const progressPercent = Math.min(100, Math.round((totalMatches / targetMatches) * 10000) / 100);

      return {
        totalMatches,
        targetMatches,
        isUnlocked,
        progressPercent,
        whiteWins: row.whiteWins || 0,
        blackWins: row.blackWins || 0,
        draws: row.draws || 0,
        avgMoves: Math.round(row.avgMoves || 0),
        topOpenings: topOpenings || [],
      };
    } catch (err) {
      console.error('[db] Error getStarliumStats:', err.message);
      return { totalMatches: 0, targetMatches: 500000, isUnlocked: false, progressPercent: 0, whiteWins: 0, blackWins: 0, draws: 0, avgMoves: 0, topOpenings: [] };
    }
  },

  // Opening book generator dari match tersimpan (hingga 500,000 match)
  getStarliumOpeningBook: (limit = 500) => {
    try {
      const matches = db.prepare(`
        SELECT pgn, result, white_player, black_player, opening_name
        FROM starlium_matches
        ORDER BY id DESC
        LIMIT ?
      `).all(limit);

      const moveWeights = {};
      for (const m of matches) {
        if (!m.pgn) continue;
        // Ambil 6 move pertama (e.g. 1. e4 e5 2. Nf3 Nc6)
        const moves = m.pgn.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').trim().split(/\s+/);
        const openingMoves = moves.slice(0, 12).join(' ');
        if (!moveWeights[openingMoves]) {
          moveWeights[openingMoves] = { moves: openingMoves, count: 0, whiteWins: 0, blackWins: 0, draws: 0 };
        }
        moveWeights[openingMoves].count++;
        if (m.result === 'white') moveWeights[openingMoves].whiteWins++;
        else if (m.result === 'black') moveWeights[openingMoves].blackWins++;
        else moveWeights[openingMoves].draws++;
      }

      return Object.values(moveWeights).sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error('[db] Error getStarliumOpeningBook:', err.message);
      return [];
    }
  },

  // Simpan rekor / score game umum (Minesweeper, XOX, SOS, dll)
  recordGameStat: ({
    gameType,
    playerName = 'Guest',
    opponentType = 'bot',
    difficulty = 'normal',
    result = 'completed',
    score = 0,
    durationSeconds = 0,
    meta = {},
  }) => {
    try {
      const now = new Date();
      return db.prepare(`
        INSERT INTO game_stats (game_type, player_name, opponent_type, difficulty, result, score, duration_seconds, meta_json, created_at, created_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(gameType, playerName, opponentType, difficulty, result, score, durationSeconds, JSON.stringify(meta || {}), now.toISOString(), now.getTime());
    } catch (err) {
      console.error('[db] Error recordGameStat:', err.message);
      return null;
    }
  },

  // Leaderboard per jenis game
  getGameLeaderboard: (gameType, limit = 20) => {
    try {
      return db.prepare(`
        SELECT id, player_name, opponent_type, difficulty, result, score, duration_seconds, created_at
        FROM game_stats
        WHERE game_type = ?
        ORDER BY score DESC, duration_seconds ASC, id DESC
        LIMIT ?
      `).all(gameType, limit);
    } catch (err) {
      console.error('[db] Error getGameLeaderboard:', err.message);
      return [];
    }
  },

  // Rangkuman seluruh aktivitas game
  getGameSummary: () => {
    try {
      const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_stats').get().count;
      const byType = db.prepare(`
        SELECT game_type, COUNT(*) as count, MAX(score) as highScore
        FROM game_stats
        GROUP BY game_type
      `).all();
      return { totalGames, byType };
    } catch (err) {
      return { totalGames: 0, byType: [] };
    }
  },

  // Rangkuman pencapaian per akun/pemain
  getUserGameSummary: (playerName) => {
    try {
      if (!playerName) return { totalGames: 0, byType: [], personalBests: {} };
      const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_stats WHERE player_name = ?').get(playerName)?.count || 0;
      const byType = db.prepare(`
        SELECT game_type, COUNT(*) as count, MAX(score) as highScore,
               SUM(CASE WHEN result IN ('win', 'won', 'completed') THEN 1 ELSE 0 END) as wins
        FROM game_stats
        WHERE player_name = ?
        GROUP BY game_type
      `).all(playerName);
      const recentMatches = db.prepare(`
        SELECT id, game_type, opponent_type, difficulty, result, score, duration_seconds, created_at
        FROM game_stats
        WHERE player_name = ?
        ORDER BY created_timestamp DESC
        LIMIT 10
      `).all(playerName);
      return { totalGames, byType, recentMatches };
    } catch (err) {
      return { totalGames: 0, byType: [], recentMatches: [] };
    }
  },
};

// ==================== WAYGROUND (QUIZIZZ) QUERIES ====================
const waygroundQueries = {
  getAllQuizzes(search = '', category = 'all') {
    try {
      let sql = 'SELECT * FROM wayground_quizzes WHERE 1=1';
      const params = [];
      if (category && category !== 'all') {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (search && search.trim()) {
        sql += ' AND (title LIKE ? OR description LIKE ? OR topic LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      sql += ' ORDER BY created_at DESC';
      return db.prepare(sql).all(...params).map(q => {
        try { q.questions = JSON.parse(q.questions_json); } catch(_) { q.questions = []; }
        return q;
      });
    } catch (err) {
      console.error('[DB] getAllQuizzes error:', err.message);
      return [];
    }
  },

  getQuizById(id) {
    try {
      const q = db.prepare('SELECT * FROM wayground_quizzes WHERE id = ?').get(id);
      if (!q) return null;
      try { q.questions = JSON.parse(q.questions_json); } catch(_) { q.questions = []; }
      return q;
    } catch (err) {
      console.error('[DB] getQuizById error:', err.message);
      return null;
    }
  },

  saveQuiz(quiz) {
    try {
      const now = new Date().toISOString();
      const existing = db.prepare('SELECT id FROM wayground_quizzes WHERE id = ?').get(quiz.id);
      const questionsJson = typeof quiz.questions === 'string' ? quiz.questions : JSON.stringify(quiz.questions || []);
      if (existing) {
        db.prepare(`
          UPDATE wayground_quizzes
          SET title = ?, description = ?, category = ?, topic = ?, icon = ?, cover_url = ?,
              time_limit = ?, difficulty = ?, questions_json = ?, author = ?, updated_at = ?
          WHERE id = ?
        `).run(
          quiz.title, quiz.description || '', quiz.category || 'general', quiz.topic || '',
          quiz.icon || '📚', quiz.cover_url || '', quiz.time_limit || 30, quiz.difficulty || 'medium',
          questionsJson, quiz.author || 'Polaris Academy', now, quiz.id
        );
      } else {
        db.prepare(`
          INSERT INTO wayground_quizzes (
            id, title, description, category, topic, icon, cover_url, time_limit, difficulty,
            questions_json, author, plays_count, is_public, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          quiz.id, quiz.title, quiz.description || '', quiz.category || 'general', quiz.topic || '',
          quiz.icon || '📚', quiz.cover_url || '', quiz.time_limit || 30, quiz.difficulty || 'medium',
          questionsJson, quiz.author || 'Polaris Academy', 0, 1, now, now
        );
      }
      return this.getQuizById(quiz.id);
    } catch (err) {
      console.error('[DB] saveQuiz error:', err.message);
      return null;
    }
  },

  deleteQuiz(id) {
    try {
      return db.prepare('DELETE FROM wayground_quizzes WHERE id = ?').run(id);
    } catch (err) {
      console.error('[DB] deleteQuiz error:', err.message);
      return { changes: 0 };
    }
  },

  incrementQuizPlays(id) {
    try {
      return db.prepare('UPDATE wayground_quizzes SET plays_count = plays_count + 1 WHERE id = ?').run(id);
    } catch (err) {
      return { changes: 0 };
    }
  },

  saveHistory(entry) {
    try {
      const now = new Date().toISOString();
      const answersJson = typeof entry.answers === 'string' ? entry.answers : JSON.stringify(entry.answers || []);
      db.prepare(`
        INSERT INTO wayground_history (
          id, quiz_id, quiz_title, mode, player_name, score, total_questions, correct_count,
          incorrect_count, accuracy, time_spent, streak_record, answers_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.id || `wgh_${Date.now()}`, entry.quiz_id, entry.quiz_title, entry.mode || 'solo', entry.player_name || 'Player',
        entry.score || 0, entry.total_questions || 0, entry.correct_count || 0, entry.incorrect_count || 0,
        entry.accuracy || 0, entry.time_spent || 0, entry.streak_record || 0, answersJson, now
      );
      this.incrementQuizPlays(entry.quiz_id);
      return true;
    } catch (err) {
      console.error('[DB] saveHistory error:', err.message);
      return false;
    }
  },

  getHistory(limit = 20) {
    try {
      return db.prepare('SELECT * FROM wayground_history ORDER BY created_at DESC LIMIT ?').all(limit).map(h => {
        try { h.answers = JSON.parse(h.answers_json); } catch(_) { h.answers = []; }
        return h;
      });
    } catch (err) {
      console.error('[DB] getHistory error:', err.message);
      return [];
    }
  },

  getStats() {
    try {
      const totalSessions = db.prepare('SELECT COUNT(*) as count FROM wayground_history').get()?.count || 0;
      const totalScore = db.prepare('SELECT COALESCE(SUM(score), 0) as sum FROM wayground_history').get()?.sum || 0;
      const avgAccuracy = db.prepare('SELECT COALESCE(AVG(accuracy), 0) as avg FROM wayground_history').get()?.avg || 0;
      const totalCorrect = db.prepare('SELECT COALESCE(SUM(correct_count), 0) as sum FROM wayground_history').get()?.sum || 0;
      const totalQuestions = db.prepare('SELECT COALESCE(SUM(total_questions), 0) as sum FROM wayground_history').get()?.sum || 0;
      const totalQuizzes = db.prepare('SELECT COUNT(*) as count FROM wayground_quizzes').get()?.count || 0;
      return {
        totalSessions,
        totalScore,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        totalCorrect,
        totalQuestions,
        totalQuizzes
      };
    } catch (err) {
      console.error('[DB] getStats error:', err.message);
      return { totalSessions: 0, totalScore: 0, avgAccuracy: 0, totalCorrect: 0, totalQuestions: 0, totalQuizzes: 0 };
    }
  },

  saveLobby(lobby) {
    try {
      const now = new Date().toISOString();
      const playersJson = typeof lobby.players === 'string' ? lobby.players : JSON.stringify(lobby.players || []);
      db.prepare(`
        INSERT OR REPLACE INTO wayground_lobbies (pin, quiz_id, host_name, status, players_json, current_question, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(lobby.pin, lobby.quiz_id, lobby.host_name, lobby.status || 'waiting', playersJson, lobby.current_question || 0, lobby.created_at || now, now);
      return true;
    } catch (err) {
      console.error('[DB] saveLobby error:', err.message);
      return false;
    }
  },

  getLobby(pin) {
    try {
      const row = db.prepare('SELECT * FROM wayground_lobbies WHERE pin = ?').get(pin);
      if (!row) return null;
      try { row.players = JSON.parse(row.players_json); } catch(_) { row.players = []; }
      return row;
    } catch (err) {
      console.error('[DB] getLobby error:', err.message);
      return null;
    }
  },

  updateLobby(pin, updates) {
    const existing = this.getLobby(pin);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.saveLobby(updated);
    return this.getLobby(pin);
  },

  deleteLobby(pin) {
    try {
      return db.prepare('DELETE FROM wayground_lobbies WHERE pin = ?').run(pin);
    } catch (err) {
      return { changes: 0 };
    }
  }
};

module.exports = {
  db,
  userQueries,
  autoResponderQueries,
  analyticsQueries,
  kvQueries,
  messageVaultQueries,
  rankQueries,
  duelQueries,
  capsuleQueries,
  downloaderHistoryQueries,
  raidQueries,
  taskQueries,
  loginHistoryQueries,
  gameQueries,
  friendQueries,
  challengeQueries,
  socialQueries,
  storyQueries,
  dmQueries,
  waygroundQueries,
  dbSecurity,
};

