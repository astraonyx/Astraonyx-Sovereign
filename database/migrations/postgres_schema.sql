-- ========================================================
-- ASTRAONYX POLARIS POSTGRESQL SCHEMA MIGRATION
-- Generated: 2026-10-21T22:49:40.258Z
-- Compatible with: PostgreSQL 14+, 15+, 16+, Laragon PostgreSQL
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: atomic_exercise
CREATE TABLE IF NOT EXISTS "atomic_exercise" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "activity_type" TEXT NOT NULL,
  "duration_minutes" BIGINT NOT NULL,
  "calories" BIGINT DEFAULT 0,
  "intensity" TEXT DEFAULT 'moderate',
  "notes" TEXT,
  "timestamp" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_exercise_created_at" ON "atomic_exercise" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_exercise' AND column_name = 'created_at');

-- Table: atomic_habits
CREATE TABLE IF NOT EXISTS "atomic_habits" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT DEFAULT 'general',
  "frequency" TEXT DEFAULT 'daily',
  "streak" BIGINT DEFAULT 0,
  "best_streak" BIGINT DEFAULT 0,
  "last_completed_at" TIMESTAMPTZ,
  "history_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_habits_created_at" ON "atomic_habits" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_habits' AND column_name = 'created_at');

-- Table: atomic_journal
CREATE TABLE IF NOT EXISTS "atomic_journal" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "encrypted_payload" TEXT NOT NULL,
  "tags" TEXT,
  "is_locked" BIGINT DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_journal_created_at" ON "atomic_journal" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_journal' AND column_name = 'created_at');

-- Table: atomic_mood
CREATE TABLE IF NOT EXISTS "atomic_mood" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "score" BIGINT NOT NULL,
  "label" TEXT NOT NULL,
  "energy_level" BIGINT DEFAULT 5,
  "note" TEXT,
  "timestamp" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_mood_created_at" ON "atomic_mood" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_mood' AND column_name = 'created_at');

-- Table: atomic_savings
CREATE TABLE IF NOT EXISTS "atomic_savings" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT DEFAULT 'general',
  "note" TEXT,
  "timestamp" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_savings_created_at" ON "atomic_savings" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_savings' AND column_name = 'created_at');

-- Table: atomic_todos
CREATE TABLE IF NOT EXISTS "atomic_todos" (
  "id" TEXT,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT DEFAULT 'medium',
  "status" TEXT DEFAULT 'pending',
  "due_date" TEXT,
  "subtasks_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "completed_at" TIMESTAMPTZ,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_atomic_todos_created_at" ON "atomic_todos" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'atomic_todos' AND column_name = 'created_at');

-- Table: auto_responders
CREATE TABLE IF NOT EXISTS "auto_responders" (
  "id" TEXT,
  "keyword" TEXT NOT NULL,
  "match_type" TEXT NOT NULL DEFAULT 'contains',
  "response_type" TEXT NOT NULL DEFAULT 'text',
  "response_content" TEXT NOT NULL,
  "media_url" TEXT DEFAULT '',
  "scope" TEXT NOT NULL DEFAULT 'all',
  "is_active" BIGINT NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_auto_responders_created_at" ON "auto_responders" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auto_responders' AND column_name = 'created_at');

-- Table: bot_analytics
CREATE TABLE IF NOT EXISTS "bot_analytics" (
  "id" SERIAL PRIMARY KEY,
  "date_str" TEXT NOT NULL,
  "message_count" BIGINT NOT NULL DEFAULT 0,
  "command_count" BIGINT NOT NULL DEFAULT 0,
  "download_count" BIGINT NOT NULL DEFAULT 0,
  "error_count" BIGINT NOT NULL DEFAULT 0,
  "platforms_json" JSONB DEFAULT '{}'::jsonb,
  "active_groups_json" JSONB DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_bot_analytics_created_at" ON "bot_analytics" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bot_analytics' AND column_name = 'created_at');

-- Table: downloader_history
CREATE TABLE IF NOT EXISTS "downloader_history" (
  "id" TEXT,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "author" TEXT,
  "duration" TEXT,
  "thumbnail" TEXT,
  "media_type" TEXT,
  "used_server" TEXT,
  "source" TEXT NOT NULL DEFAULT 'web',
  "chat_jid" TEXT DEFAULT '',
  "sender_number" TEXT DEFAULT '',
  "downloads_json" JSONB DEFAULT '{}'::jsonb,
  "slides_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "user_id" TEXT DEFAULT "",
  "instance_id" TEXT DEFAULT "",
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_downloader_history_created_at" ON "downloader_history" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'downloader_history' AND column_name = 'created_at');

-- Table: ecosystem_news
CREATE TABLE IF NOT EXISTS "ecosystem_news" (
  "id" TEXT,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "snippet" TEXT,
  "category" TEXT DEFAULT 'Tech',
  "source" TEXT DEFAULT 'Google News',
  "published_at" TIMESTAMPTZ,
  "sent_to_group" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_ecosystem_news_created_at" ON "ecosystem_news" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ecosystem_news' AND column_name = 'created_at');

-- Table: friends
CREATE TABLE IF NOT EXISTS "friends" (
  "id" SERIAL PRIMARY KEY,
  "user_id_1" TEXT NOT NULL,
  "user_id_2" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_by" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_friends_created_at" ON "friends" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friends' AND column_name = 'created_at');

-- Table: game_challenges
CREATE TABLE IF NOT EXISTS "game_challenges" (
  "id" TEXT,
  "challenger_id" TEXT NOT NULL,
  "challenger_username" TEXT NOT NULL,
  "challenged_id" TEXT NOT NULL,
  "challenged_username" TEXT NOT NULL,
  "game_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "game_state_json" JSONB DEFAULT '{}'::jsonb,
  "turn_user_id" TEXT DEFAULT '',
  "winner_id" TEXT DEFAULT '',
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_game_challenges_created_at" ON "game_challenges" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_challenges' AND column_name = 'created_at');

-- Table: game_stats
CREATE TABLE IF NOT EXISTS "game_stats" (
  "id" SERIAL PRIMARY KEY,
  "game_type" TEXT NOT NULL,
  "player_name" TEXT NOT NULL,
  "opponent_type" TEXT NOT NULL DEFAULT 'bot',
  "difficulty" TEXT DEFAULT 'normal',
  "result" TEXT NOT NULL,
  "score" BIGINT NOT NULL DEFAULT 0,
  "duration_seconds" BIGINT NOT NULL DEFAULT 0,
  "meta_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "created_timestamp" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_game_stats_created_at" ON "game_stats" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_stats' AND column_name = 'created_at');

-- Table: group_duel_history
CREATE TABLE IF NOT EXISTS "group_duel_history" (
  "group_jid" TEXT NOT NULL,
  "user_a" TEXT NOT NULL,
  "user_b" TEXT NOT NULL,
  "duel_date" TEXT NOT NULL,
  "duel_count" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("group_jid", "user_a", "user_b", "duel_date")
);

CREATE INDEX IF NOT EXISTS "idx_group_duel_history_created_at" ON "group_duel_history" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_duel_history' AND column_name = 'created_at');

-- Table: group_member_xp
CREATE TABLE IF NOT EXISTS "group_member_xp" (
  "group_jid" TEXT NOT NULL,
  "user_jid" TEXT NOT NULL,
  "user_name" TEXT DEFAULT '',
  "xp" BIGINT NOT NULL DEFAULT 0,
  "level" BIGINT NOT NULL DEFAULT 1,
  "message_count" BIGINT NOT NULL DEFAULT 0,
  "last_xp_at" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "last_spin_at" BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY ("group_jid", "user_jid")
);

CREATE INDEX IF NOT EXISTS "idx_group_member_xp_created_at" ON "group_member_xp" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_member_xp' AND column_name = 'created_at');

-- Table: group_rank_settings
CREATE TABLE IF NOT EXISTS "group_rank_settings" (
  "group_jid" TEXT,
  "is_enabled" BIGINT NOT NULL DEFAULT 0,
  "level_up_notice" BIGINT NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("group_jid")
);

CREATE INDEX IF NOT EXISTS "idx_group_rank_settings_created_at" ON "group_rank_settings" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_rank_settings' AND column_name = 'created_at');

-- Table: kv_store
CREATE TABLE IF NOT EXISTS "kv_store" (
  "key" TEXT,
  "value_json" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "idx_kv_store_created_at" ON "kv_store" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kv_store' AND column_name = 'created_at');

-- Table: login_history
CREATE TABLE IF NOT EXISTS "login_history" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "login_at" TIMESTAMPTZ NOT NULL,
  "login_timestamp" BIGINT NOT NULL,
  "success" BIGINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_login_history_created_at" ON "login_history" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_history' AND column_name = 'created_at');

-- Table: luminary_projects
CREATE TABLE IF NOT EXISTS "luminary_projects" (
  "id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT DEFAULT 'Academy',
  "creator" TEXT NOT NULL,
  "progress" BIGINT DEFAULT 0,
  "tasks_json" JSONB DEFAULT '{}'::jsonb,
  "docs_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_luminary_projects_created_at" ON "luminary_projects" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'luminary_projects' AND column_name = 'created_at');

-- Table: message_vault
CREATE TABLE IF NOT EXISTS "message_vault" (
  "id" TEXT,
  "chat_jid" TEXT NOT NULL,
  "sender_jid" TEXT NOT NULL,
  "sender_name" TEXT,
  "message_type" TEXT NOT NULL,
  "content_text" TEXT,
  "media_path" TEXT,
  "is_view_once" BIGINT NOT NULL DEFAULT 0,
  "is_revoked" BIGINT NOT NULL DEFAULT 0,
  "timestamp" BIGINT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_message_vault_created_at" ON "message_vault" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_vault' AND column_name = 'created_at');

-- Table: raid_history
CREATE TABLE IF NOT EXISTS "raid_history" (
  "id" TEXT,
  "group_jid" TEXT NOT NULL,
  "boss_name" TEXT NOT NULL,
  "boss_tier" TEXT NOT NULL DEFAULT 'V',
  "total_hp" BIGINT NOT NULL DEFAULT 5000,
  "mvp_jid" TEXT DEFAULT '',
  "mvp_name" TEXT DEFAULT '',
  "mvp_damage" BIGINT DEFAULT 0,
  "last_hit_jid" TEXT DEFAULT '',
  "last_hit_name" TEXT DEFAULT '',
  "participants_count" BIGINT DEFAULT 0,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_raid_history_created_at" ON "raid_history" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raid_history' AND column_name = 'created_at');

-- Table: reminder_targets
CREATE TABLE IF NOT EXISTS "reminder_targets" (
  "chat_jid" TEXT,
  "enabled" BIGINT NOT NULL DEFAULT 1,
  "daily_remind_time" TEXT NOT NULL DEFAULT '07:00',
  "set_by" TEXT DEFAULT '',
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL,
  PRIMARY KEY ("chat_jid")
);

CREATE INDEX IF NOT EXISTS "idx_reminder_targets_created_at" ON "reminder_targets" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_targets' AND column_name = 'created_at');

-- Table: sirium_contacts
CREATE TABLE IF NOT EXISTS "sirium_contacts" (
  "id" TEXT,
  "buyer_username" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "message" TEXT,
  "timestamp" TEXT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sirium_contacts_created_at" ON "sirium_contacts" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sirium_contacts' AND column_name = 'created_at');

-- Table: sirium_listings
CREATE TABLE IF NOT EXISTS "sirium_listings" (
  "id" TEXT,
  "store_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price_idr" BIGINT NOT NULL,
  "price_coins" BIGINT DEFAULT 0,
  "description" TEXT,
  "features_json" JSONB DEFAULT '{}'::jsonb,
  "tech_stack" TEXT,
  "file_type" TEXT,
  "file_size" TEXT,
  "live_demo_url" TEXT,
  "preview_image" TEXT,
  "downloads_count" BIGINT DEFAULT 0,
  "rating" DOUBLE PRECISION DEFAULT 5.0,
  "is_verified" BIGINT DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sirium_listings_created_at" ON "sirium_listings" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sirium_listings' AND column_name = 'created_at');

-- Table: sirium_stores
CREATE TABLE IF NOT EXISTS "sirium_stores" (
  "id" TEXT,
  "owner_username" TEXT NOT NULL,
  "store_name" TEXT NOT NULL,
  "tagline" TEXT,
  "bio" TEXT,
  "avatar_url" TEXT,
  "banner_url" TEXT,
  "badge" TEXT DEFAULT 'Verified Creator',
  "rating" DOUBLE PRECISION DEFAULT 4.9,
  "total_sales" BIGINT DEFAULT 0,
  "whatsapp_number" TEXT,
  "telegram_handle" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_sirium_stores_created_at" ON "sirium_stores" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sirium_stores' AND column_name = 'created_at');

-- Table: social_direct_messages
CREATE TABLE IF NOT EXISTS "social_direct_messages" (
  "id" TEXT,
  "conversation_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "sender_username" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "recipient_username" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "media_url" TEXT DEFAULT '',
  "media_type" TEXT DEFAULT '',
  "is_read" BIGINT DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_social_direct_messages_created_at" ON "social_direct_messages" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_direct_messages' AND column_name = 'created_at');

-- Table: social_posts
CREATE TABLE IF NOT EXISTS "social_posts" (
  "id" TEXT,
  "author_id" TEXT NOT NULL,
  "author_username" TEXT NOT NULL,
  "author_display_name" TEXT NOT NULL,
  "author_avatar_url" TEXT DEFAULT '',
  "author_role" TEXT NOT NULL DEFAULT 'member',
  "content" TEXT NOT NULL,
  "media_url" TEXT DEFAULT '',
  "post_type" TEXT DEFAULT 'post',
  "extra_data_json" JSONB DEFAULT '{}'::jsonb,
  "likes_json" JSONB DEFAULT '{}'::jsonb,
  "comments_json" JSONB DEFAULT '{}'::jsonb,
  "reposts_json" JSONB DEFAULT '{}'::jsonb,
  "bookmarks_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_social_posts_created_at" ON "social_posts" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_posts' AND column_name = 'created_at');

-- Table: social_stories
CREATE TABLE IF NOT EXISTS "social_stories" (
  "id" TEXT,
  "author_id" TEXT NOT NULL,
  "author_username" TEXT NOT NULL,
  "author_display_name" TEXT NOT NULL,
  "author_avatar_url" TEXT DEFAULT '',
  "media_url" TEXT DEFAULT '',
  "text_content" TEXT DEFAULT '',
  "bg_gradient" TEXT DEFAULT '',
  "created_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "sound_title" TEXT DEFAULT "",
  "sound_artist" TEXT DEFAULT "",
  "sound_audio_url" TEXT DEFAULT "",
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_social_stories_created_at" ON "social_stories" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_stories' AND column_name = 'created_at');

-- Table: starlium_matches
CREATE TABLE IF NOT EXISTS "starlium_matches" (
  "id" SERIAL PRIMARY KEY,
  "game_id" TEXT NOT NULL,
  "pgn" TEXT NOT NULL,
  "fen_final" TEXT,
  "result" TEXT NOT NULL,
  "white_player" TEXT NOT NULL,
  "black_player" TEXT NOT NULL,
  "difficulty" TEXT DEFAULT 'medium',
  "moves_count" BIGINT NOT NULL DEFAULT 0,
  "opening_name" TEXT DEFAULT 'Standard Opening',
  "opening_eco" TEXT DEFAULT '',
  "learned_patterns_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  "created_timestamp" BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_starlium_matches_created_at" ON "starlium_matches" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'starlium_matches' AND column_name = 'created_at');

-- Table: task_reminders
CREATE TABLE IF NOT EXISTS "task_reminders" (
  "id" TEXT,
  "target_jid" TEXT NOT NULL,
  "creator_jid" TEXT NOT NULL,
  "task_name" TEXT NOT NULL,
  "deadline_at" BIGINT NOT NULL,
  "deadline_str" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "delete_reason" TEXT DEFAULT '',
  "last_reminded_at" BIGINT NOT NULL DEFAULT 0,
  "overdue_reminded" BIGINT NOT NULL DEFAULT 0,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_task_reminders_created_at" ON "task_reminders" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_reminders' AND column_name = 'created_at');

-- Table: time_capsules
CREATE TABLE IF NOT EXISTS "time_capsules" (
  "id" TEXT,
  "chat_jid" TEXT NOT NULL,
  "creator_jid" TEXT NOT NULL,
  "creator_name" TEXT,
  "target_jid" TEXT NOT NULL,
  "target_name" TEXT,
  "message_content" TEXT NOT NULL,
  "unlock_at" BIGINT NOT NULL,
  "is_opened" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_time_capsules_created_at" ON "time_capsules" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_capsules' AND column_name = 'created_at');

-- Table: token_redemptions
CREATE TABLE IF NOT EXISTS "token_redemptions" (
  "id" TEXT,
  "token_id" TEXT NOT NULL,
  "token_code" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "previous_role" TEXT NOT NULL,
  "new_role" TEXT NOT NULL,
  "redeemed_via" TEXT NOT NULL DEFAULT 'web',
  "phone_number" TEXT DEFAULT '',
  "redeemed_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_token_redemptions_created_at" ON "token_redemptions" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_redemptions' AND column_name = 'created_at');

-- Table: upgrade_tokens
CREATE TABLE IF NOT EXISTS "upgrade_tokens" (
  "id" TEXT,
  "token_code" TEXT NOT NULL,
  "target_role" TEXT NOT NULL,
  "max_uses" BIGINT NOT NULL DEFAULT 1,
  "used_count" BIGINT NOT NULL DEFAULT 0,
  "is_active" BIGINT NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "notes" TEXT DEFAULT '',
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_upgrade_tokens_created_at" ON "upgrade_tokens" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upgrade_tokens' AND column_name = 'created_at');

-- Table: user_raid_titles
CREATE TABLE IF NOT EXISTS "user_raid_titles" (
  "id" TEXT,
  "user_jid" TEXT NOT NULL,
  "title_id" TEXT NOT NULL,
  "title_name" TEXT NOT NULL,
  "title_badge" TEXT NOT NULL DEFAULT '🎖️',
  "title_desc" TEXT DEFAULT '',
  "is_equipped" BIGINT NOT NULL DEFAULT 0,
  "unlocked_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_user_raid_titles_created_at" ON "user_raid_titles" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_raid_titles' AND column_name = 'created_at');

-- Table: users
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "require_2fa" BIGINT NOT NULL DEFAULT 1,
  "pin_hash" TEXT,
  "is_banned" BIGINT NOT NULL DEFAULT 0,
  "linked_owner_number" TEXT DEFAULT '',
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "avatar_url" TEXT DEFAULT "",
  "bio" TEXT DEFAULT "",
  "display_name" TEXT DEFAULT "",
  "custom_ai_api_key" TEXT DEFAULT "",
  "phone_number" TEXT DEFAULT "",
  "plain_password" TEXT DEFAULT "",
  "plain_pin" TEXT DEFAULT "",
  "current_session_token" TEXT DEFAULT "",
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at');

-- Table: wayground_history
CREATE TABLE IF NOT EXISTS "wayground_history" (
  "id" TEXT,
  "quiz_id" TEXT NOT NULL,
  "quiz_title" TEXT NOT NULL,
  "mode" TEXT DEFAULT 'solo',
  "player_name" TEXT DEFAULT 'Player',
  "score" BIGINT DEFAULT 0,
  "total_questions" BIGINT DEFAULT 0,
  "correct_count" BIGINT DEFAULT 0,
  "incorrect_count" BIGINT DEFAULT 0,
  "accuracy" DOUBLE PRECISION DEFAULT 0,
  "time_spent" BIGINT DEFAULT 0,
  "streak_record" BIGINT DEFAULT 0,
  "answers_json" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_wayground_history_created_at" ON "wayground_history" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wayground_history' AND column_name = 'created_at');

-- Table: wayground_lobbies
CREATE TABLE IF NOT EXISTS "wayground_lobbies" (
  "pin" TEXT,
  "quiz_id" TEXT NOT NULL,
  "host_name" TEXT NOT NULL,
  "status" TEXT DEFAULT 'waiting',
  "players_json" JSONB DEFAULT '{}'::jsonb,
  "current_question" BIGINT DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("pin")
);

CREATE INDEX IF NOT EXISTS "idx_wayground_lobbies_created_at" ON "wayground_lobbies" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wayground_lobbies' AND column_name = 'created_at');

-- Table: wayground_quizzes
CREATE TABLE IF NOT EXISTS "wayground_quizzes" (
  "id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT DEFAULT 'general',
  "topic" TEXT DEFAULT '',
  "icon" TEXT DEFAULT '📚',
  "cover_url" TEXT DEFAULT '',
  "time_limit" BIGINT DEFAULT 30,
  "difficulty" TEXT DEFAULT 'medium',
  "questions_json" JSONB DEFAULT '{}'::jsonb NOT NULL,
  "author" TEXT DEFAULT 'Polaris Academy',
  "plays_count" BIGINT DEFAULT 0,
  "is_public" BIGINT DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_wayground_quizzes_created_at" ON "wayground_quizzes" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wayground_quizzes' AND column_name = 'created_at');

