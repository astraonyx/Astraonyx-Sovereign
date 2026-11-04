-- ========================================================
-- ASTRAONYX POLARIS POSTGRESQL DATA SEED
-- Generated: 2026-10-21T22:49:40.258Z
-- ========================================================

BEGIN;

-- Data for atomic_exercise (2 rows)
INSERT INTO "atomic_exercise" ("id", "user_id", "activity_type", "duration_minutes", "calories", "intensity", "notes", "timestamp") VALUES ('ex-1', 'default_user', 'Lari Pagi', 30, 240, 'moderate', 'Keliling komplek & jogging', '2026-10-11T12:27:37.862Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_exercise" ("id", "user_id", "activity_type", "duration_minutes", "calories", "intensity", "notes", "timestamp") VALUES ('ex-2', 'default_user', 'Workout Push/Pull', 45, 320, 'intense', 'Fokus dada & tricep', '2026-10-12T12:27:37.862Z') ON CONFLICT DO NOTHING;

-- Data for atomic_habits (4 rows)
INSERT INTO "atomic_habits" ("id", "user_id", "title", "category", "frequency", "streak", "best_streak", "last_completed_at", "history_json", "created_at") VALUES ('hab-1', 'default_user', 'Deep Work 90 Menit', 'Fokus', 'daily', 4, 12, '2026-10-12', '["2026-10-12"]'::jsonb, '2026-10-12T12:27:37.842Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_habits" ("id", "user_id", "title", "category", "frequency", "streak", "best_streak", "last_completed_at", "history_json", "created_at") VALUES ('hab-2', 'default_user', 'Minum 2.5L Air Putih', 'Kesehatan', 'daily', 7, 21, '2026-10-12', '["2026-10-12"]'::jsonb, '2026-10-12T12:27:37.842Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_habits" ("id", "user_id", "title", "category", "frequency", "streak", "best_streak", "last_completed_at", "history_json", "created_at") VALUES ('hab-3', 'default_user', 'Review Code & Bot Logs', 'Tech', 'daily', 3, 15, '', '[]'::jsonb, '2026-10-12T12:27:37.842Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_habits" ("id", "user_id", "title", "category", "frequency", "streak", "best_streak", "last_completed_at", "history_json", "created_at") VALUES ('hab-4', 'default_user', 'Membaca Buku / Docs 20 Hlm', 'Edukasi', 'daily', 5, 10, '', '[]'::jsonb, '2026-10-12T12:27:37.842Z') ON CONFLICT DO NOTHING;

-- Data for atomic_journal (1 rows)
INSERT INTO "atomic_journal" ("id", "user_id", "title", "encrypted_payload", "tags", "is_locked", "created_at", "updated_at") VALUES ('jrn-1', 'default_user', 'Refleksi Peluncuran Astraonyx Ataraxia', 'AES256:U2FsdGVkX1+vG83KzM4ZkL...[TERENKRIPSI PRIVATE VAULT]', 'Visi,Ataraxia,Polaris', 1, '2026-10-12T12:27:37.866Z', '2026-10-12T12:27:37.866Z') ON CONFLICT DO NOTHING;

-- Data for atomic_mood (2 rows)
INSERT INTO "atomic_mood" ("id", "user_id", "score", "label", "energy_level", "note", "timestamp") VALUES ('md-1', 'default_user', 5, 'Sangat Berenergi', 9, 'Menyelesaikan integrasi fitur dengan lancar!', '2026-10-12T12:27:37.863Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_mood" ("id", "user_id", "score", "label", "energy_level", "note", "timestamp") VALUES ('md-2', 'default_user', 4, 'Fokus & Tenang', 7, 'Membaca dokumentasi arsitektur PRD', '2026-10-11T12:27:37.863Z') ON CONFLICT DO NOTHING;

-- Data for atomic_savings (6 rows)
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-1', 'default_user', 'income', 2500000, 'Gaji / Project', 'Project Web Dashboard Ataraxia', '2026-09-28T12:27:37.858Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-2', 'default_user', 'expense', 350000, 'Server Hosting', 'VPS & Domain renewal', '2026-10-01T12:27:37.858Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-3', 'default_user', 'income', 750000, 'Sirium Aset', 'Penjualan Template E-Commerce', '2026-10-04T12:27:37.858Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-4', 'default_user', 'expense', 150000, 'Konsumsi', 'Kopi & Langganan Musik', '2026-10-07T12:27:37.858Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-5', 'default_user', 'income', 1200000, 'Jasa Bot WA', 'Custom WhatsApp Bot Setup', '2026-10-10T12:27:37.858Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_savings" ("id", "user_id", "type", "amount", "category", "note", "timestamp") VALUES ('sav-6', 'default_user', 'expense', 200000, 'Tools & API', 'AI API Credits', '2026-10-11T12:27:37.858Z') ON CONFLICT DO NOTHING;

-- Data for atomic_todos (3 rows)
INSERT INTO "atomic_todos" ("id", "user_id", "title", "description", "priority", "status", "due_date", "subtasks_json", "created_at", "completed_at") VALUES ('td-1', 'default_user', 'Deploy Polaris Bot Core v6.0', 'Pastikan koneksi Baileys & socket cluster aktif stabil', 'urgent', 'completed', 'Hari Ini', '[]'::jsonb, '2026-10-12T12:27:37.853Z', '2026-10-12T12:27:37.853Z') ON CONFLICT DO NOTHING;
INSERT INTO "atomic_todos" ("id", "user_id", "title", "description", "priority", "status", "due_date", "subtasks_json", "created_at", "completed_at") VALUES ('td-2', 'default_user', 'Finalisasi Modul Pembelajaran Luminary', 'Buat butir kuis interaktif & presentasi AI', 'high', 'in_progress', 'Besok', '[]'::jsonb, '2026-10-12T12:27:37.853Z', NULL) ON CONFLICT DO NOTHING;
INSERT INTO "atomic_todos" ("id", "user_id", "title", "description", "priority", "status", "due_date", "subtasks_json", "created_at", "completed_at") VALUES ('td-3', 'default_user', 'Audit Saldo Soul Coins & Marketplace', 'Periksa validitas harga listing di Sirium Store', 'medium', 'pending', 'Minggu Ini', '[]'::jsonb, '2026-10-12T12:27:37.853Z', NULL) ON CONFLICT DO NOTHING;

-- Data for bot_analytics (1 rows)
INSERT INTO "bot_analytics" ("id", "date_str", "message_count", "command_count", "download_count", "error_count", "platforms_json", "active_groups_json", "updated_at") VALUES (10998, '2026-10-12', 0, 0, 2, 0, '{"tiktok":2}'::jsonb, '{}'::jsonb, '2026-10-12T12:30:29.695Z') ON CONFLICT DO NOTHING;

-- Data for downloader_history (1 rows)
INSERT INTO "downloader_history" ("id", "url", "title", "platform", "author", "duration", "thumbnail", "media_type", "used_server", "source", "chat_jid", "sender_number", "downloads_json", "slides_json", "created_at", "user_id", "instance_id") VALUES ('dl_1791808106459_7czhj', 'https://www.tiktok.com/@naevi.fuscus/video/7656466207402642691?is_from_webapp=1&sender_device=pc&web_id=7683168517018371592', '​Trapped in stone for 3,700 years. No technology, no civilization, no family. Total silence. ​When Senku woke up, he didn''t despair. He looked at a ruined world and decided that humanity was worth saving. Dr. STONE was never just an anime about science; it was a beautiful love letter to human resilience. It reminded us that as long as we don''t give up, we can rebuild anything from scratch. ​Now that this incredible journey has come to an end, it leaves a huge void, but also a powerful message: never stop looking at the stars, and never stop believing in the impossible. ​Thank you, Kingdom of Science, 10,000,000,000%. You will be missed. #drstone #anime #Science #drstoneanime #animation ', 'tiktok', 'Naevio', '13s', 'https://p16-common-sign.tiktokcdn-us.com/tos-no1a-p-0037-no/oUpB7T1iupIJAI3E1Ai1AOFBw6y1kCt3fJICl9~tplv-tiktokx-cropcenter-q:300:400:q70.jpeg?dr=8596&refresh_token=636560c5&x-expires=1791892800&x-signature=wG3kAF9Hu9otiQAJ6TJJ2NUeGrA%3D&t=bacd0480&ps=933b5bde&shp=d05b14bd&shcp=1d1a97fc&idc=useast5&biz_tag=tt_video&s=AWEME_DETAIL&sc=cover', 'video', 'Server 1', 'web', '', '', '[{"label":"🎬 Video Full HD 1080p (Tanpa Watermark)","quality":"Full HD 1080p","type":"video","format":"mp4","url":"https://v16-notes.tiktokcdn-us.com/d229aa77fa96cc9da137f853be056b7b/6acd2755/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/oIBpSi9Q1EOI7itCpyRfBJT4wlB6AIwTB1IJAC/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&&bt=772&ft=7SkatDDwNj6VQQdGntpisdZbN7ZqYlHMGItMhWLrK&mime_type=video_mp4&rc=Ojw2ZDpkN2U1aGgzODRkOUBpMzw5dHc5cndtPDMzbzczNUBjYzAvYS02NjExYV4tMDIyYSNxXzY2MmRzaS1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261012123032738111616E657A1C066C&btag=e000b0000","filename":"tiktok_video_1080p.mp4"},{"label":"🎬 Video MP4 720p","quality":"HD 720p","type":"video","format":"mp4","url":"https://v16m.tiktokcdn-us.com/15c63668977d62e76f47e8fbfbddc86f/6acd2754/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/oIBpSi9Q1EOI7itCpyRfBJT4wlB6AIwTB1IJAC/?a=1233&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&&bt=772&ft=74~WHDDwNyvVQQdGntpisd-bN7ZqYlJoictMhWLrK&mime_type=video_mp4&rc=Ojw2ZDpkN2U1aGgzODRkOUBpMzw5dHc5cndtPDMzbzczNUBjYzAvYS02NjExYV4tMDIyYSNxXzY2MmRzaS1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261012123031D9FFF2F0B571191A6496&btag=e000b0000","filename":"tiktok_video_720p.mp4"},{"label":"🎵 Audio Musik (MP3)","quality":"Audio MP3","type":"audio","format":"mp3","url":"https://v16-ies-music.tiktokcdn-us.com/0f91b21c10370ae013eece12b137593c/6ad60d81/video/tos/no1a/tos-no1a-v-2370-no/oAYoTUmXgEUEoZf6LEYItxbffsWABFQDG5IDEn/?a=583965&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&&bt=125&ft=7g~atDDwNyvVQQdGntpisd-bN7ZqYlJoictMhWLrK&mime_type=audio_mpeg&rc=PDk4MzlmNTk4OTw2aDk8PEBpM3BzdHI5cnltPDMzbzU8NUBjMTJfXjFgNmIxNTMwYTA1YSNlbWZpMmRzai1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261012123031D9FFF2F0B571191A6496&btag=e000f0000&shp=d05b14bd&shcp=-","filename":"tiktok_audio.mp3"}]'::jsonb, '[{"url":"https://v16-notes.tiktokcdn-us.com/d229aa77fa96cc9da137f853be056b7b/6acd2755/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/oIBpSi9Q1EOI7itCpyRfBJT4wlB6AIwTB1IJAC/?a=0&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&&bt=772&ft=7SkatDDwNj6VQQdGntpisdZbN7ZqYlHMGItMhWLrK&mime_type=video_mp4&rc=Ojw2ZDpkN2U1aGgzODRkOUBpMzw5dHc5cndtPDMzbzczNUBjYzAvYS02NjExYV4tMDIyYSNxXzY2MmRzaS1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261012123032738111616E657A1C066C&btag=e000b0000","type":"video"},{"url":"https://v16m.tiktokcdn-us.com/15c63668977d62e76f47e8fbfbddc86f/6acd2754/video/tos/useast2a/tos-useast2a-ve-68c810-euttp/oIBpSi9Q1EOI7itCpyRfBJT4wlB6AIwTB1IJAC/?a=1233&bti=OUBzOTg7QGo6OjZAL3AjLTAzYCMxNDNg&&bt=772&ft=74~WHDDwNyvVQQdGntpisd-bN7ZqYlJoictMhWLrK&mime_type=video_mp4&rc=Ojw2ZDpkN2U1aGgzODRkOUBpMzw5dHc5cndtPDMzbzczNUBjYzAvYS02NjExYV4tMDIyYSNxXzY2MmRzaS1hLS1kMTFzcw%3D%3D&vvpl=1&l=20261012123031D9FFF2F0B571191A6496&btag=e000b0000","type":"video"}]'::jsonb, '2026-10-12T12:30:29.697Z', 'user_1788745743989_74m03', '') ON CONFLICT DO NOTHING;

-- Data for ecosystem_news (107 rows)
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487408_lnlz', 'Bukan Cuma Layar Besar, Teknologi Chery Q Ini Bikin Nyetir Lebih Gampang', 'https://news.google.com/rss/articles/CBMitAFBVV95cUxNNTB6NW5tUlF0TXVTb2U5bzB3dmkyTGFqa2xVZHMxVUpyNnBocmY1eURtU3hhazB2U3lrTS14c3VPRmMxQnM4WDZLNHJqcWtUc1d1cTBKMnotdDFUSHZ1akh2dUtYWTZiQnpPWGd0LVV0TmhXQ1AwdGw2Wi14M1pCd2NybjNsY3VtNUVUT1dGcjFEQUxMVkxjc2VSMHRoNmtQRHo4QkMxUkQ1Ym1yLXNnMmFVNHDSAboBQVVfeXFMTU1lTmRJLU1JcUxsOWZsbUtsaHNVZHdlTENILTJxcTd2WExpVEh0Q2RUZ0JzcXJzeDdUREtjYUdoYmxxWE04X1Y2TDBIU0hZX0tEelFoZlpPcWoza2h0b3Roay1ET3dSR3FGdnlfUW83R1FMZm1zUktVaGlwZzB4U3BNR0d5bHY0Vk1QeW5sSFlWMkVPYVBPQmM3djQxOU1vUE1JSjBlaUJoaDFKdk50ZmVURkhrdzVwcWp3?oc=5', 'Bukan Cuma Layar Besar, Teknologi Chery Q Ini Bikin Nyetir Lebih Gampang&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Fri, 11 Sep 2026 13:33:23 GMT', 1, '2026-09-12T01:11:27.593Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487408_aw09', 'Zankore Indosat Dapat Suntikan Rp 54,6 Triliun, Bangun AI Factory 1 GW', 'https://news.google.com/rss/articles/CBMivAFBVV95cUxNTXh1eU5mRHpOZnFtN0tlZ1lhaUFjRUpJcDkzcHAtR2N5bmVuWjRybzJPZ1VFYm4tR1lPb2pHdHBHZEgzMS1HTW1FQ3FZalpkaFlOTHlmdnZvQVRDR1hRNFd0TUFFOU5SNWhPamtianotbVNjRkhVMk1hdDFiRWFUZGpUWjFWMXB6UnlwdUptRjlXbFVfckt4WG9hRmFPaTZyZUdmNU5jTGs3Qy13Z010dWVWWjVRdnhYNTVfbtIBwgFBVV95cUxPMXRTcXUtbHV5SHV0QXhtYVFWTlBSMEtia1N1MmhvTzdvTzRpRzFqU1ZqMmFvOUJRU2hVSjNuOUxON1dOQVpNMnhTb244MVhFcGJfMVBVSmVYYTBncXREOEpncUVobHFISG00Ujh2aVhrNTZENDhvdlZadzd6bVQ0NGVDRDVqMkFOMmU4WVRfNktycFFKd2hxa0dQb1VhekhjYzhmeW9ycUdjQlh6ZzNlT0FKazdaeVFhU1FMeEgzbThDZw?oc=5', 'Zankore Indosat Dapat Suntikan Rp 54,6 Triliun, Bangun AI Factory 1 GW&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Fri, 11 Sep 2026 13:16:31 GMT', 1, '2026-09-12T01:11:27.593Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487532_o9g9', 'Waspada Hujan Lebat Sabtu Ini, Simak Daftar Wilayahnya', 'https://www.cnnindonesia.com/teknologi/20260911184447-641-1402961/bmkg-ungkap-daftar-9-wilayah-berpotensi-diguyur-hujan-hari-ini', 'BMKG mengeluarkan peringatan hujan lebat untuk Aceh dan hujan sedang di beberapa wilayah. Waspadai potensi angin kencang di berbagai daerah.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sat, 12 Sep 2026 06:15:01 +0700', 1, '2026-09-12T01:11:27.593Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487532_rrtj', 'NASA Ungkap Potret Satelit Gunung Anak Krakatau Saat Erupsi', 'https://www.cnnindonesia.com/teknologi/20260911190226-199-1402976/nasa-ungkap-potret-satelit-gunung-anak-krakatau-saat-erupsi', 'NASA mengungkap citra satelit erupsi Gunung Anak Krakatau yang berlangsung lebih dari 24 jam, mengganggu penerbangan dan kualitas udara di Indonesia.', '🔬 Sains & Digital', 'CNN Indonesia', 'Fri, 11 Sep 2026 21:00:27 +0700', 1, '2026-09-12T01:11:27.594Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487593_nrj6', 'Apa itu drone thermal? Teknologi untuk deteksi api karhutla', 'https://www.antaranews.com/berita/5736097/apa-itu-drone-thermal-teknologi-untuk-deteksi-api-karhutla', 'Kebakaran hutan dan lahan (karhutla) masih menjadi perhatian di sejumlah wilayah Kalimantan. Badan Nasional ...', '⚡ Inovasi & Industri', 'Antara News', 'Fri, 11 Sep 2026 11:13:58 +0700', 1, '2026-09-12T01:11:27.594Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789175487593_feib', 'Sejarah Hari Radio Nasional 11 September dan lahirnya RRI', 'https://www.antaranews.com/berita/5736091/sejarah-hari-radio-nasional-11-september-dan-lahirnya-rri', 'Hari Radio Nasional diperingati setiap 11 September, bertepatan dengan berdirinya Radio Republik Indonesia (RRI) pada ...', '⚡ Inovasi & Industri', 'Antara News', 'Fri, 11 Sep 2026 11:10:49 +0700', 1, '2026-09-12T01:11:27.594Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789223552299_boru', 'Teknologi di Balik Pengalaman Responsif Redmi Note 17 Series', 'https://news.google.com/rss/articles/CBMipAFBVV95cUxNLWtXY3FxRTE0TG5ON3VjQk9FMTQ4c2ZiaTVlQS11eFFVUDZvRnl5andwMzZYelNmWW9lZGF3bmJZZzh5bzI0RFNmRkxHVVEzZXpfRmxkRzVGUER6TXZSQnN6SHVKSEg0QzlFRF9NeDJDcEUtdzVJN1lPSnk5a1R5TzFJQWFkRzFqS0d4RUFMNm9GY0lQUWhlYlJneHJOMFNMdDkzStIBqgFBVV95cUxPYTZrUWM3NTJRQ2ZGSUNSQjRQclJkYjVaemdQTmlkVjM5ZXFFd0RuUG9RQVZodmhueU1sa0MxRTVTRDRZWFRjb2NicnEtRUJOS1BvV05pc0JlSWJLNjVQTTNlX0dXS0lOMkNNdE1UV1hpYVM1RG5LRjljVGlhLXFNbExuNHRfeTRZd181TEZDcGFVLXQxb0tEdHZET1V0Xy1pcHEwdHIxZUJSZw?oc=5', 'Teknologi di Balik Pengalaman Responsif Redmi Note 17 Series&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sat, 12 Sep 2026 12:45:54 GMT', 1, '2026-09-12T14:32:33.736Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789223552301_dcr1', 'Genjot Pasar B2B, Telkom Solution Perkuat Solusi AI untuk Korporasi', 'https://news.google.com/rss/articles/CBMirAFBVV95cUxNUC1tNm8zWUZKRnc4VTZVNjRGaW5iN3V4bE1sb0h2ZC1BMzRNc2VuYmpQOHB3N2g1QjNISDBwbV84WWZoUWw3YWttN3lsSVVJTnh4WENfdzhGcW9RRmtrMlp6Q0dRNDBaTDlWcHFMTW1rOC1MT1V5ZGs1dGw3NnY0ZlRON1ZWZ0xBel8zcnVmYU9sWHJucjU1Um90dUcwb1VzVDlOQXFKcnN3OHJW0gGyAUFVX3lxTE5pV2ZLdWNTNzhlR1l0ZHFVVHdpR1NYWG14YmxHM1VFeHl5cmluOWdnZ1hpUXZDQ0FnZE1kemZTSW1xM2VwWDIwcXhaSmRiUUpVLWlVTnhKY2FuRlM0RXdpSFU0VHlta014VXFUSjI3R2pidlAyZ0JDWnY1OUFYS1AxZzQzNmpSUUpNd0FQMDA3TU54N0FQX3dReDhjdlNkWFloX0V1aVZjRkQ1S3VINVBOckE?oc=5', 'Genjot Pasar B2B, Telkom Solution Perkuat Solusi AI untuk Korporasi&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sat, 12 Sep 2026 10:01:25 GMT', 1, '2026-09-12T14:32:33.737Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789223553604_19hj', 'Pakar soal Gempa Kepulauan Seribu: Guncangan Luas Tapi Tidak Merusak', 'https://www.cnnindonesia.com/teknologi/20260912113752-199-1403090/pakar-soal-gempa-kepulauan-seribu-guncangan-luas-tapi-tidak-merusak', 'Pakar mengatakan gempa bumi Kepulauan Seribu, Jakarta, pada Sabtu (12/9) menimbulkan guncangan yang terasa di wilayah sangat luas.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sat, 12 Sep 2026 12:40:04 +0700', 1, '2026-09-12T14:32:33.737Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789223553605_enqq', 'Tulus Santoso: Kalau Mau Penyiaran Relevan, Regulasi Perlu Disesuaikan', 'https://www.cnnindonesia.com/teknologi/20260912113350-213-1403089/tulus-santoso-kalau-mau-penyiaran-relevan-regulasi-perlu-disesuaikan', 'Komisioner KPI Pusat Tulus Santoso menilai regulasi penyiaran perlu disesuaikan dengan perkembangan teknologi dan perubahan perilaku audiens.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sat, 12 Sep 2026 11:35:42 +0700', 1, '2026-09-12T14:32:33.737Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789223762384_dcwy', 'Mengenal Teknologi Cold Chain untuk Industri Perikanan', 'https://news.google.com/rss/articles/CBMinAFBVV95cUxNYnhhZHJXYlZiUjVTTmUtYXBpOXNhX0ZMU3lhVXNLMldndXd3emtMWS05RGgzbHhoRUJIcWRGNEJQZWtsT3ZPSjR3UXZxXzlYMUJCc2FhNHRTYWlsTnJvQ2U3Mk45MHpWUXZ4Y1o0d2R6QWhPVGYzYUlqMWREaURjeUREMDhaOEVHSDZyOWNDeW1PM3lMQnRyY3ZQS0vSAaIBQVVfeXFMUG5VN0t4MmdJbXgyeERfXzhnYl92d2RxV3o3dVN6ZEVGQUVrRmpRWVJmV3NzaVc1VHl0cHI4MDZjY3B0SnR2aWRIS29TN1gwLVVwQUV4d1FENTNubGpWVW5Cc2trOGdMYjEwYTdTN2c2LUVSeXdmalJvUkZKVndmbFloYWI2NTNOeGpSWXJhTUVveDhYd0hOTUZFNS0yTVVrOXlR?oc=5', 'Mengenal Teknologi Cold Chain untuk Industri Perikanan&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sat, 12 Sep 2026 14:30:28 GMT', 1, '2026-09-12T14:36:02.727Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789252812213_93d1', '100 Tahun Jadi Misteri, Peneliti Buat Rekonstruksi 3D Kuda Purba Ini', 'https://www.cnnindonesia.com/teknologi/20260912165856-199-1403184/100-tahun-jadi-misteri-peneliti-buat-rekonstruksi-3d-kuda-purba-ini', 'Tim peneliti dari China dan AS berhasil merekonstruksi secara utuh penampilan seekor kuda purba yang sudah punah, Equus ovodovi.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 13 Sep 2026 01:30:00 +0700', 1, '2026-09-12T22:40:12.316Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789261578121_locx', 'Daftar 4 Wilayah Indonesia Berpotensi Hujan Hari Ini', 'https://www.cnnindonesia.com/teknologi/20260913071103-641-1403276/bmkg-ungkap-daftar-wilayah-potensi-hujan-hari-ini-simak-prediksinya', 'BMKG memperingatkan potensi hujan sedang hingga sangat lebat di sejumlah wilayah Indonesia hari ini. Waspadai kondisi atmosfer yang labil dan angin...', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 13 Sep 2026 07:30:04 +0700', 1, '2026-09-13T01:06:18.354Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789335717581_ex31', 'iPhone Duo Pakai Kamera Bawah Layar, Samsung Sudah Coba Sejak Fold3', 'https://news.google.com/rss/articles/CBMirAFBVV95cUxPQlE4d2lpREFlbHNPZE50WlUxQ1hMV3NyWkZHQUUteE5GSWczdGZVdHJBZ1J4R05PNDZQbkprT2I0akxFbWtfWWIyN3NPdDMteWV4OGxTZ3hIajBndzcwdHdiNXVfV2RQZzlTem1DWEY4QkktNG5zS183Y1Q0b2pqcnVvZVp3OVBuWkx6TEVEU2NpMVJ5bUd1TmdRZUNvS3dLZFJyc0NFa2lyT3Bo0gGyAUFVX3lxTFBWUHZRdmx1Nk9Gdmc3czBNNENPTVh6QW4zTks0OXRqY2ozQjNZWG0xanB0U3JkbUw3bUROaHVLSnRzSDJqTFY5NVl5aG5LdjFhSlFoVzNzWXpmNkE3VzlzR0hGQmI0cllodEx1M1p1cEVKTVhNbUlDT2k4cU5BMVdFVVFkRVc1YW9MeGhncWhIcnZfaFFYSzNZeEhvMmVDX3N2cHJ1bGZLRDc3VDdHdHhSWFE?oc=5', 'iPhone Duo Pakai Kamera Bawah Layar, Samsung Sudah Coba Sejak Fold3&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sun, 13 Sep 2026 10:10:24 GMT', 1, '2026-09-13T21:41:57.781Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789335717581_hswl', 'Tergiur Harga Miring AC Split 1 PK di Transmart Full Day Sale', 'https://news.google.com/rss/articles/CBMipgFBVV95cUxQOUlFbzJObkpOVkJJQ01kVlh6R0dZNm9RaS0yU2xTRHRwUWQ2aUhlU0hUdTk4cS11dnd3UUoxa2tPR1ZySUdoanQwdmItLXNQZVlCUmhORGo3NloxVFhkODdZVkQ1bEM1aXBxLXRYT091OWRtT3Z0ZXZlZTk3bDJ1QTlvanhvWldFVG9pVG51RHN3OUsyUU01eGNGMXhreHdDTlBxUmxR0gGrAUFVX3lxTE1JLU5OTlJwd2tnTDN4VHBsa1dBRXRfLUEzXzJmdDRKVlQzV2ljZkp5SHhpNGVzN0JIY0JQcy1fVmdNMVRmSmtReGJkX2E5dzBOZVRxUWJnR0YtRndVWGFnZlJkMHJGb1E1NzZ4UE00N0w0UE9tSTJNdjRRRWd1UEN5dGlFeFFuZk9weEo1WEpNZFVwX2s3a1VBSVoyOVZ1cGItOFFlTERkV3UzWQ?oc=5', 'Tergiur Harga Miring AC Split 1 PK di Transmart Full Day Sale&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sun, 13 Sep 2026 00:30:23 GMT', 1, '2026-09-13T21:41:57.806Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789335717727_csjp', 'Polytron Luncurkan AC Baru, Bisa Nyala Cuma Pakai Perintah Suara', 'https://www.cnnindonesia.com/teknologi/20260913145917-206-1403372/polytron-luncurkan-ac-baru-bisa-nyala-cuma-pakai-perintah-suara', 'Polytron luncurkan AC Neuva Pro Voice Sense, AC pertama di Indonesia dengan kontrol suara tanpa internet.', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 04:30:27 +0700', 1, '2026-09-13T21:41:57.806Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789335717727_w0im', 'Trump Anggap Kekhawatiran soal Bahaya AI Berlebihan', 'https://www.cnnindonesia.com/teknologi/20260913220716-192-1403491/trump-anggap-kekhawatiran-soal-bahaya-ai-berlebihan', 'Presiden Trump kritik seruan perlambatan pengembangan AI, menilai kekhawatiran negatif berlebihan. CEO AI juga mendukung pengawasan lebih ketat.', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 01:00:00 +0700', 1, '2026-09-13T21:41:57.806Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789352535368_9quh', 'Promo Transmart Full Day Sale, Ada TV LED UHD Smart Harga Hemat', 'https://news.google.com/rss/articles/CBMipwFBVV95cUxPMHFWeWtSVjV5V3J6NVprUUYtWkROWlhVcUVZb21BX051Wms3RlFxbWliWjZpdGdEUjVKZGZqaEczc09jQ1JOVXFyUFhIcC1ub1VlTVl5c24wU1AtS2QzbEdjU1dZOElPQm5DSHpQb3dHdkw3Z2d6N0FNbnM2U2pTZE5ROTZaR3VRZDZpa0JfNnNLa1pvM3dRcE44bU5VSW9hNGtIX1p0QdIBrAFBVV95cUxONGYtMDRkTnpmYzhBUXFpLWpsZFJCZkJqOGpCTUpPTUVXS2ZYNVVMVGUtTmVqaVZUbHZMczZ5bERXSHkzN196b3otekV4d3NpcElpdFhydXA1THdCY0stS1lxU1lidmNuRFJ3ZkR5ZTVfTGdBUHJ0VHFmYTkzQ3JRYlRfYVIwOHYxMWtVN29ORk1VcUl2NlNJVVZaM3lIMFpnV0JHUXdaOGwyZXE2?oc=5', 'Promo Transmart Full Day Sale, Ada TV LED UHD Smart Harga Hemat&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sun, 13 Sep 2026 02:30:11 GMT', 1, '2026-09-14T02:22:16.568Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789352535972_gzi5', 'Berapa Harga iPhone Duo di Indonesia? Ini Prediksinya', 'https://www.cnnindonesia.com/teknologi/20260914085038-206-1403541/masuk-indonesia-harga-iphone-duo-diprediksi-tembus-rp40-juta', 'HP lipat pertama Apple, iPhone Duo, dipastikan hadir di Indonesia. Harganya diperkirakan mulai Rp40 jutaan.', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 09:15:00 +0700', 1, '2026-09-14T02:22:16.568Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789352535972_7pm6', 'iPhone Duo Dibanderol Mulai Rp34 Juta, Mampukah Pikat Pasar?', 'https://www.cnnindonesia.com/teknologi/20260913151207-206-1403378/iphone-duo-dibanderol-mulai-rp34-juta-mampukah-pikat-pasar', 'Apple meluncurkan iPhone Duo, smartphone lipat termahal seharga US$1.999. Target konsumen belum jelas, namun diharapkan menarik penggemar setia Apple.', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 08:15:13 +0700', 1, '2026-09-14T02:22:16.569Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789352536567_6b75', 'iPhone 18 Pro sudah resmi rilis, kapan bisa dibeli di Indonesia?', 'https://www.antaranews.com/berita/5739239/iphone-18-pro-sudah-resmi-rilis-kapan-bisa-dibeli-di-indonesia', 'Apple resmi memperkenalkan iPhone 18 Pro dan iPhone 18 Pro Max pada 9 September 2026 waktu Amerika Serikat. Dua model ...', '⚡ Inovasi & Industri', 'Antara News', 'Mon, 14 Sep 2026 07:45:58 +0700', 1, '2026-09-14T02:22:16.569Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789384810674_sqxi', 'Kisah Kelvin Kurniawan, Nyaris Gagal ke Apple Event karena Anak Krakatau', 'https://news.google.com/rss/articles/CBMitAFBVV95cUxPUXprT0pSMVo4MWt3UVAza0pmMzJaTFROYUlHZzZxNUxRUVJJQ0pxUjFkYnlEdFd4MWVabm1HNGxURmNRR3N5Z0o0RTNYTHczVjhZMkhwQXgxdWpCTVVUZm9zVExhWUdueUYxcEdkLWdJNkVDT3pQNkhPdmlOLUZBLUtmVnhkZXVtNC00ZVNZZUU3RkN1YjE2MmV2YlVoVVJVWGVuUjdkT0lJeklwNVJLdXR1Q2XSAboBQVVfeXFMUGNJeHh4aFIzWWdGYnhwTmgwQjFuMHFYTU1QUjRMS3B4Ylh1OG4wVjBDYlliUGI3Q2k3bEdoRG9UQzJwWlRwMnhIX1JrN0ROV1JkMUlpN283akpaUVpqaE5iajhfLUN1d3A0QmdET2hES0NyQldPZEFCTExkZnZtU1V3cm5kTnBqTlpHbDZxNnd2X0N1WHRscDU3dEZIeHJRZzZvV0ZjMGJ6VUFaREJwOVU1dVgzQ0Q3OG9B?oc=5', 'Kisah Kelvin Kurniawan, Nyaris Gagal ke Apple Event karena Anak Krakatau&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Mon, 14 Sep 2026 00:15:15 GMT', 1, '2026-09-14T11:20:10.976Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789384810675_zwjk', 'Trump Tolak Kekhawatiran AI, Tak Mau AS Kalah dari China', 'https://news.google.com/rss/articles/CBMinwFBVV95cUxPeVB0MU9KR3pQMk9Ua3VZVHlObHdaM0FpdDBwU2JKVm9hMWFxUmhETnIyUjRvT0Z3NWpQNXk5bkpGNHBMMTNPczZxSmYzTGtjZzJjRl83VXNCTHhUR2k2Und2QTBfT09sLVpITzFCRGowWnFDQXFQNTh5RFBiMVBROTVFLUdfNmtXRFZpQlNPLTVUU3ZoRS1kenh0UlhWTTjSAaQBQVVfeXFMTi1PY2RiamFOZm9NbDRsQy1xelFORm5TRVJ3UTY2VWhsVDBiWlc3ZTJ2T1hZSl9DbkxtdXlBUGFydGdaYWdacjQtM2x5SGlPYVFUMGx5UnhrTi11VjFwY2NodWFSNTJaaFdwaWJKYllpM2dFZVNtdTVfZk9jZjhnVURhMkdfYmhUOXRZeTZrQW96N1dSdWl3aXNIcXBLRU9MLVZLNE4?oc=5', 'Trump Tolak Kekhawatiran AI, Tak Mau AS Kalah dari China&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Mon, 14 Sep 2026 03:15:44 GMT', 1, '2026-09-14T11:20:10.977Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789384810890_ss9c', 'NASA-IBM Rilis Model AI Baru untuk Petakan Kawah dan Es Bulan', 'https://www.cnnindonesia.com/teknologi/20260914080955-199-1403535/nasa-ibm-rilis-model-ai-baru-untuk-petakan-kawah-dan-es-bulan', 'NASA dan IBM luncurkan model AI open source untuk analisis data Bulan. Model ini mendukung eksplorasi kehidupan manusia di Bulan dan penelitian geo...', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 18:00:42 +0700', 1, '2026-09-14T11:20:10.977Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789384810891_kbi0', 'Anthropic Ungkap Penyalahgunaan Claude, Sorot Ancaman Senjata Biologis', 'https://www.cnnindonesia.com/teknologi/20260914061757-192-1403508/anthropic-ungkap-penyalahgunaan-claude-sorot-ancaman-senjata-biologis', 'Anthropic melaporkan penyalahgunaan model AI Claude untuk serangan siber dan riset senjata biologis.', '🔬 Sains & Digital', 'CNN Indonesia', 'Mon, 14 Sep 2026 17:10:27 +0700', 1, '2026-09-14T11:20:10.978Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552601316_1oxo', 'Beda Jalan Trump dan Xi Jinping dalam Teknologi Penentu Zaman', 'https://news.google.com/rss/articles/CBMipwFBVV95cUxQVkhuN3dha0kyaURvMklaem9PVWpRVEN1ZmN6MkU2Unl1WGEtVm1NbHlsN2RLRU5qQ0JnSTY4TW81dXh4U0xwc29vRTlNTFJfQW5rOXlJRGRtTjdsbUI4UHhNWEl4ZEthdGhiNFRCMEp3T2tSNHN5TlFfRHpkNXgxNjAtVmh4VWVZLVo5ZHc3UXE4WGEteDVtUzlHSlA1Qk1KU29hQkhSUdIBrAFBVV95cUxNWnhOdzR4bkVQano0eEhWVXJKcnFfeGNmNE5rbjhnSlhqUEhYZWxPSzdYNEtLWjBrYUh5d2E4YVBnV0FlSFphRXk5eDlLX3FwWXIxNll4R2cxc3h0SXFMZ2lYeFdieVNsc1M1QXltdGNPb1BhVi1ZdHBHOFZOQm8wNmE5TlVudGlhdi1WdHhCTHVESTNtMFJkNGozdVlYMVZlcGMyNENUY211bnEy?oc=5', 'Beda Jalan Trump dan Xi Jinping dalam Teknologi Penentu Zaman&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Wed, 16 Sep 2026 05:15:48 GMT', 1, '2026-09-16T09:56:42.202Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552601317_2dzh', 'September 2026, Blibli Tebar Diskon Pembelian Gadget hingga 70 Persen', 'https://news.google.com/rss/articles/CBMiuwFBVV95cUxQckRBQWVhY21PNi13enNSUEtxdDE1R01nS0NJcVFiUlBHeDVkS2lDZXZjRWx0SzdqRGl2cGV4U2lGWnR3TFRqV3FjbmJUaENBbGlNTWVReUhwcHJWSEVRUnpXb2xIb2dtUUNKUVh5NXNGV2Q0ajBXdXdfRnNqNXBGckRoVnN0aXh4QWxuOTFOWVlSN3A4bC1YcnZhMHZvZVBzQ0dSbE9KVUxfQkxWaXg4Vk9jYVRDVXRFQmlF?oc=5', 'September 2026, Blibli Tebar Diskon Pembelian Gadget hingga 70 Persen&nbsp;&nbsp;Kompas.com', '📱 Gadget & Teknologi', 'Kompas.com', 'Tue, 15 Sep 2026 14:38:00 GMT', 1, '2026-09-16T09:56:42.202Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552601701_4dob', 'Eropa Bakal Larang Anak Pakai Sosmed dan AI, Ini Alasannya', 'https://www.cnnindonesia.com/teknologi/20260915132458-185-1404152/eropa-bakal-larang-anak-pakai-sosmed-dan-ai-ini-alasannya', 'Uni Eropa usulkan larangan akses media sosial untuk anak di bawah 15 tahun. Proposal ini bertujuan melindungi anak dari bahaya digital dan eksploit...', '🔬 Sains & Digital', 'CNN Indonesia', 'Wed, 16 Sep 2026 15:45:01 +0700', 1, '2026-09-16T09:56:42.203Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552601702_0wrp', 'Samsung Segera Launching Galaxy Tab S12 Series, Intip Bocoran Speknya', 'https://www.cnnindonesia.com/teknologi/20260915175648-206-1404285/samsung-segera-launching-galaxy-tab-s12-series-intip-bocoran-speknya', 'Samsung akan luncurkan Galaxy Tab S12+ dan S12 Ultra pada 7 Oktober dengan sejumlah pembaruan pada hardware dan software.', '🔬 Sains & Digital', 'CNN Indonesia', 'Wed, 16 Sep 2026 14:15:03 +0700', 1, '2026-09-16T09:56:42.203Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552602201_bwjc', 'Honor Magic9 resmi rilis: Kamera selfie 55 MP dan baterai 11.000 mAh', 'https://www.antaranews.com/berita/5741984/honor-magic9-resmi-rilis-kamera-selfie-55-mp-dan-baterai-11000-mah', 'Honor memastikan seri ponsel terbarunya, Honor Magic9, bakal membawa teknologi kamera depan yang cukup berbeda ...', '⚡ Inovasi & Industri', 'Antara News', 'Tue, 15 Sep 2026 16:10:31 +0700', 1, '2026-09-16T09:56:42.203Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789552602202_ktlv', 'iPhone 18 Pro dan Pro Max: 10 hal yang wajib diketahui', 'https://www.antaranews.com/berita/5741853/iphone-18-pro-dan-pro-max-10-hal-yang-wajib-diketahui', 'Apple resmi memperkenalkan iPhone 18 Pro dan iPhone 18 Pro Max pada 9 September 2026 waktu Amerika Serikat. Dua ponsel ...', '⚡ Inovasi & Industri', 'Antara News', 'Tue, 15 Sep 2026 15:32:19 +0700', 1, '2026-09-16T09:56:42.203Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789553509702_7k82', 'FOTO: Korsel Bantu Lansia Hadapi Kesenjangan Digital', 'https://www.cnnindonesia.com/teknologi/20200430130857-194-498846/foto-korsel-bantu-lansia-hadapi-kesenjangan-digital', 'Di tengah pesatnya perkembangan teknologi, Korea Selatan berupaya membantu warganya yang lanjut usia agar tidak semakin tertinggal dalam dunia digi...', '🔬 Sains & Digital', 'CNN Indonesia', 'Wed, 16 Sep 2026 17:00:48 +0700', 1, '2026-09-16T10:11:50.265Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789558994892_wcso', 'Jejak Kaki T-rex Dewasa Pertama Ditemukan, Usianya 66,5 Juta Tahun', 'https://www.cnnindonesia.com/teknologi/20260915134526-199-1404172/jejak-kaki-t-rex-dewasa-pertama-ditemukan-usianya-665-juta-tahun', 'Tim ilmuwan menemukan jejak kaki T-rex berusia 66,5 juta tahun di North Dakota. Temuan ini adalah yang pertama dan dapat membantu memahami perilaku...', '🔬 Sains & Digital', 'CNN Indonesia', 'Wed, 16 Sep 2026 18:30:21 +0700', 1, '2026-09-16T11:43:15.019Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789616441631_jdd9', 'Mark Zuckerberg Tolak ''Rem'' AI', 'https://news.google.com/rss/articles/CBMie0FVX3lxTFBDTnhuWjFkaGFUdnhzMzFrVndoMmVDeEszMWdsMnFJVWVEc1RSRm1jeXdYcnAzRkhjMkJyamFiWnU0cXpTWHVvazdxXzN5QXM4ejhrYk03dVZKSEQtRzJqd2tsNlhsdzlveXFWc0FFRlBMTlJqcmlqNFJVZ9IBgAFBVV95cUxNdkRVY2JDS3pDLWJuWE5sb2VUS29PdEtzdjM1WVZlcU4zWXBwa1VDUXNSRWFYV0wzUlBGelAtSWpsbWFBaGN2dmFHNEdNM1NtMnJuR09lSUpRcks0c2x3M0RicDN1RnVVYW5ZdjAybk1XVDBUd1NnSEc5WGN4ZDI0RA?oc=5', 'Mark Zuckerberg Tolak ''Rem'' AI&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Thu, 17 Sep 2026 02:45:24 GMT', 1, '2026-09-17T03:40:42.107Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789616441997_d3bi', 'Ubur-Ubur Raksasa Tertangkap Kamera, Besarnya Seukuran Bus', 'https://www.cnnindonesia.com/teknologi/20260915132356-199-1404153/ubur-ubur-raksasa-tertangkap-kamera-besarnya-seukuran-bus', 'Seekor ubur-ubur raksasa sebesar bus terlihat di perairan Wales. Ubur-ubur itu memiliki tentakel yang dapat tumbuh memanjang hingga puluhan meter.', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 10:30:02 +0700', 1, '2026-09-17T03:40:42.108Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789616441997_kato', 'Benarkah AI Bisa Musnahkan Umat Manusia? Ini Kata Bapak AI Dunia', 'https://www.cnnindonesia.com/teknologi/20260917010504-192-1404809/benarkah-ai-bisa-musnahkan-umat-manusia-ini-kata-bapak-ai-dunia', 'Perdebatan tentang risiko kecerdasan buatan (AI) semakin memanas. Para ahli menyerukan regulasi, sementara Trump menolak kekhawatiran ini sebagai h...', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 09:16:41 +0700', 1, '2026-09-17T03:40:42.108Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789638122548_aj45', 'Gojek Dorong Produktivitas Pelajar Lewat Program ChamPOINTship', 'https://news.google.com/rss/articles/CBMiqAFBVV95cUxNa0xTYUlWYWQxcTVMNWdUUWpxQUdwbTZOX040SU5TdUZtQ0J6SWJ4ejhKcU0yM3BQY3ZhN2h6a0I0U0ctZTdKaHdvYkdzRFhZSkVqZ2NWbUVYZm8xYnhpY2hoZ0pYTVR5eVFDYVBhV1BYd3F2bC01WDJxbDdQZkZyQVZZVk9xMFpUTTZSQ1FudFpJWFU3UjRLNFZ4bnBUaTdQQzVkNWhwQW_SAa4BQVVfeXFMUDNLUGpIakJmZ0hhUkF2dXZfUVZLZ3ZZaWk1WmRUYmFPMHpadnJoUGQ0LVhSSkk5T2sxSlhTdXhmQkY3elpsLWpQSkZNYkF0a3d6Rkp2c0xWeGFUaXVsd3l1WDRIVUtYbWM0OUJDRVlfLXN2bnkxb2ViQ0QyR3RsbG5LbjNTdXFMZ1JOV2xwZjZDdzd1U0dXVkZZWktHdDBLSFRmSUNmdEdRYy1mVTZB?oc=5', 'Gojek Dorong Produktivitas Pelajar Lewat Program ChamPOINTship&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Thu, 17 Sep 2026 05:40:27 GMT', 1, '2026-09-17T09:42:02.829Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789638122729_02ru', 'Cara Aktifkan Motion Assist di Android untuk Kurangi Mabuk Kendaraan', 'https://www.cnnindonesia.com/teknologi/20260917144201-206-1405050/cara-aktifkan-motion-assist-di-android-untuk-kurangi-mabuk-kendaraan', 'Google meluncurkan fitur Motion Assist untuk Android, membantu mengurangi mabuk perjalanan saat menggunakan ponsel di kendaraan. Simak cara mengakt...', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 15:45:17 +0700', 1, '2026-09-17T09:42:02.833Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789638122730_ovbp', 'Komdigi Tegur Puluhan Platform Tak Daftar PSE, Ada Whoosh dan Susi Air', 'https://www.cnnindonesia.com/teknologi/20260917140724-185-1405035/komdigi-tegur-puluhan-platform-tak-daftar-pse-ada-whoosh-dan-susi-air', 'Kementerian Komdigi menegur 25 platform PSE Lingkup Privat, termasuk Susi Air dan Kereta Cepat, untuk segera mendaftar PSE sebelum 22 September 2026.', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 14:20:26 +0700', 1, '2026-09-17T09:42:02.833Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789652509014_44xk', 'PSEL Bogor Dibangun, 1.500 Ton Sampah Diolah Jadi Listrik Tiap Hari', 'https://www.cnnindonesia.com/teknologi/20260917193815-641-1405178/psel-bogor-dibangun-1500-ton-sampah-diolah-jadi-listrik-tiap-hari', 'Danantara Indonesia meresmikan PSEL Bogor Raya 1, mampu kelola 1.500 ton sampah/hari jadi energi listrik.', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 19:44:53 +0700', 1, '2026-09-17T13:41:49.115Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789652509015_4uty', 'Zuckerberg Tak Setuju AI Direm, Sebut Perusahaan Bisa Jaga Diri', 'https://www.cnnindonesia.com/teknologi/20260917175434-192-1405130/zuckerberg-tak-setuju-ai-direm-sebut-perusahaan-bisa-jaga-diri', 'CEO Meta Mark Zuckerberg menolak seruan perlambatan pengembangan AI. Ia percaya perusahaan memiliki insentif untuk menjaga keamanan tanpa koordinas...', '🔬 Sains & Digital', 'CNN Indonesia', 'Thu, 17 Sep 2026 18:15:53 +0700', 1, '2026-09-17T13:41:49.141Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789720021297_xhcc', 'Tim Cook Bakal Makan Malam Bareng Donald Trump dan Xi Jinping', 'https://news.google.com/rss/articles/CBMipgFBVV95cUxPZzE4TW9ERUVKRHdjTjBMSTVZZm9oWmJJdExfemYwSExLWGVubkJqQnY0SGRMV1J3OEtZX2NWaWVQUjUzcWY1VzE1OHE5dlh5anJoTDk0XzQzT2RDbTZiN1VVOXV6Uzdua0VCTVpFZktnLWhVWGFrallKYjc4TXFtczJEZXZFamx6N2pfODlsTU5pWFpLYm1NdDRzeGRIZGdQX0YxNFVn0gGrAUFVX3lxTE51eTJLS2lsWFFqZlZ3b3ZScngxeW05YnJiX3AtZjQ2NkU2Z05RMG91YVBpc3hmSXQ0RmJZdlVaQWQzaXRNMkxBUVRJa29ob2hLM3NBOWpkX3I0bkdoUlZQc2lYcEp0cXpPdEttUDRYMzNzZlM1d2xqZ0NjMVZWZEVzbG5ValdXbDFGYlFqcElnbmhzdllpdmc0NlY4UUdyNDZCSThyRjhfelFMcw?oc=5', 'Tim Cook Bakal Makan Malam Bareng Donald Trump dan Xi Jinping&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Fri, 18 Sep 2026 05:45:18 GMT', 1, '2026-09-18T08:27:01.494Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789720021298_d2pq', 'AI China Pangkas Waktu Berburu Mineral, dari 6 Bulan Jadi 1 Minggu', 'https://news.google.com/rss/articles/CBMiqgFBVV95cUxQSnFqQ2hVZ2t4enpqTklWX1hkQ3VlNUJ3WEJNTXZtMlRKeXJKbDRmQ0NLYk1rTnprYXoyc1lnUHFjWld1MEhVcDh3T1BtZTJXZFdOcWh0NUxTOWRhRGRpZXIyOUNtNHlTZ0J1RE1Fd2Q3bUNfTThkSWswVjZaVmRmV1Via0w2aTl1My1hSjRHTlNraUJxSFJsbm9CYWR0VUVQa2pQY1dWcHV4d9IBrwFBVV95cUxPYzJSa3EtLUpLZ3lOMEtCdC1GT0Q0TUwwNDRSbGVCMWd5dDhGR3hvQWtBeVdJYnRjbU93YjREbEtXZmdHeUUxd1VBemJLM3FSMjJvV2Itd3o0d2lqWHhHMXBHdTRQa01pVFJYdS1HbkNFSFZKM0NmMFpNdzFjY3hFZkRtZjR2MWhFcksteGluR2tZZWYwY2VHLVZEYmk3aWpzRTNUNnlvUERUVHItQlFn?oc=5', 'AI China Pangkas Waktu Berburu Mineral, dari 6 Bulan Jadi 1 Minggu&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Thu, 17 Sep 2026 15:00:41 GMT', 1, '2026-09-18T08:27:01.495Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789720021441_uxh9', 'FOTO: Berburu iPhone 18 Pro, Antrean Mengular di Apple Store Beijing', 'https://www.cnnindonesia.com/teknologi/20260918105609-208-1405348/foto-berburu-iphone-18-pro-antrean-mengular-di-apple-store-beijing', 'Antusiasme penggemar Apple menyambut iPhone 18 Pro dan iPhone 18 Pro Max di China tak terbendung. Antrean mengular demi mendapatkan iPhone generasi...', '🔬 Sains & Digital', 'CNN Indonesia', 'Fri, 18 Sep 2026 14:30:00 +0700', 1, '2026-09-18T08:27:01.495Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789720021441_ekz5', 'Huawei MatePad Air Comeback di Indonesia, Simak Spek dan Harganya', 'https://www.cnnindonesia.com/teknologi/20260918135253-206-1405422/huawei-matepad-air-comeback-di-indonesia-simak-spek-dan-harganya', 'Setelah dua tahun, Huawei kembali menghadirkan tablet MatePad Air (2026) di Indonesia. Simak spesifikasi dan harganya.', '🔬 Sains & Digital', 'CNN Indonesia', 'Fri, 18 Sep 2026 13:58:25 +0700', 1, '2026-09-18T08:27:01.495Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789862974536_ucop', '5 Cara Bikin Family Media Plan biar Anak Tak Kecanduan Gadget', 'https://news.google.com/rss/articles/CBMikgJBVV95cUxObEZ0ZWpkRVhCclc1dS1QU1YxZHFKOEJ6RThtZmt1cjczT25UTndWSlJMa0Nwa3Y2bGdablFjR3hvRjY1ODFucWs4cFZweFFiaWdHdG9zcGxTN2RyUndySlpBWmN1djY2NjVEbzluWVg0bjd2ak12Y3J6dXVhMnBCQlZ0LWkxUThmWDR3bGZmVnRFaXJTeDVrZ3V0bGIyU0NuVVpLa0V6X3lYcWdRdzdack1MMGg0RU5DRE55bHFjZ2x4cERNNlFZb3JDX255R2NnTUR6VWRqZzB2ekR0a3BnblhReGpVcU5ONkhTeGcxRW5nWGZkaHNVY0puZThyV3JEUEQyVzIxZXB5TXJMZTdyNTFB?oc=5', '5 Cara Bikin Family Media Plan biar Anak Tak Kecanduan Gadget&nbsp;&nbsp;Kompas.com', '📱 Gadget & Teknologi', 'Kompas.com', 'Sat, 19 Sep 2026 10:06:00 GMT', 1, '2026-09-20T00:09:35.017Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789862974537_wi38', 'Wujud Masa Depan Versi Orang Zaman Dulu Bikin Melotot', 'https://news.google.com/rss/articles/CBMimwFBVV95cUxObUZtczdxTVZ2RU9PY0FoTElHVW16eklFNEhqN2dpUm9JcGdrZEdzZG55d1pWRkg0UmptbmRnY2tOa0dEY2tJTmtCYTdnbGtXSUhHdjlSUVdLQ1UzWVZEaDlFQTZ3WXNGdGRCR2d2VmxRS2txanBWbndpalhwSFhHNk1jcWJ4WTY2NWs5VEJHN2NETXh5WDlOYWx6b9IBoAFBVV95cUxNZDVNZTR1QzZpWVJDUzR3V1NHR0RFU0x2NmJVQ2dXMXFlZGh0a1p4SE9IN3hlR1pzYTY4QUhYVzVvYndrVVo5aWU3RGI4bGV4T0pKUktmR2VwM1pLblBfV0Y1RVZUdmMyRmY3UzA1Skx5YU9BRzRxWURhelM0YURWdzBLZzZtT0VvME91eVJ1LTI2THNNS3N4ZlB2RFdjRk9K?oc=5', 'Wujud Masa Depan Versi Orang Zaman Dulu Bikin Melotot&nbsp;&nbsp;detikInet', '📱 Gadget & Teknologi', 'detikInet', 'Sat, 19 Sep 2026 07:15:37 GMT', 1, '2026-09-20T00:09:35.017Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789862974904_pqru', 'Daftar 12 Daerah Indonesia Berpotensi Hujan Hari Ini', 'https://www.cnnindonesia.com/teknologi/20260920060342-641-1405909/bmkg-ungkap-daftar-daerah-berpotensi-hujan-dan-angin-kencang-hari-ini', 'BMKG memprediksi hujan di sejumlah daerah Indonesia hari ini, dengan potensi hujan sedang hingga lebat di Aceh dan Sumatera Utara.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 20 Sep 2026 06:30:00 +0700', 1, '2026-09-20T00:09:35.017Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789862974904_9cji', 'AI Google, Gemini Sanggup Bobol Situs Tebak Password', 'https://www.cnnindonesia.com/teknologi/20260919163709-192-1405805/ai-google-gemini-sanggup-bobol-situs-tebak-password', 'Google mengakui model AI Gemini mengakses tiga situs saat uji keamanan siber pada Mei. Reuters menyebutnya kasus pertama yang diketahui pada sistem...', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 20 Sep 2026 05:44:16 +0700', 1, '2026-09-20T00:09:35.018Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789862975013_4bje', 'Redmi Note 17 Pro Max 5G: Spesifikasi dan harganya di Indonesia', 'https://www.antaranews.com/berita/5748719/redmi-note-17-pro-max-5g-spesifikasi-dan-harganya-di-indonesia', 'Xiaomi resmi membawa Redmi Note 17 Series ke pasar Indonesia. Salah satu model yang menjadi perhatian adalah Redmi Note ...', '⚡ Inovasi & Industri', 'Antara News', 'Sat, 19 Sep 2026 10:40:55 +0700', 1, '2026-09-20T00:09:35.018Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789872173218_2j4x', 'Profil Zhang Yiming, Pendiri ByteDance yang Kini Jadi Orang Terkaya di Asia', 'https://news.google.com/rss/articles/CBMizgFBVV95cUxQSjMyRzgtMFRHWHgzaFV3R0ZLTE1xdTBudVpLTzhxQU1yclg3SHBEZWFwMExOQXlvUllzZGVCWlNaYVBVa2lPSjVTVExxZTBwVS1wWW5rcGNnUDNtbWVVd3pCQTFFbVFHaV9KTnZYenZFTVlOWk0xRllLNFNrWEhmVHBRZmYxSEtzU2tmS0xKN203aVhrVHBibnFhWHE5T3dyenJCd2JjbnVtNDVWUVFCenExbk9OZTF6ZlNjT2N6MmMxXzRlcWFIYVBTWV9zUQ?oc=5', 'Profil Zhang Yiming, Pendiri ByteDance yang Kini Jadi Orang Terkaya di Asia&nbsp;&nbsp;Kompas.com', '📱 Gadget & Teknologi', 'Kompas.com', 'Sat, 19 Sep 2026 09:15:00 GMT', 1, '2026-09-20T02:42:53.636Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789872173360_pppl', 'Pakar Ungkap Skenario AI Lenyapkan Umat Manusia', 'https://www.cnnindonesia.com/teknologi/20260918154508-192-1405508/bisakah-ai-memusnahkan-manusia-dan-bagaimana-caranya', 'Pekerja AI khawatir teknologi ini bisa memicu kepunahan manusia. Beberapa skenario, termasuk virus mematikan dan robot otonom, diungkapkan oleh par...', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 20 Sep 2026 08:05:02 +0700', 1, '2026-09-20T02:42:53.636Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789883546947_8gnq', 'FOTO: Pelukan Anak dan Induk Orangutan Saat Dievakuasi dari Karhutla', 'https://www.cnnindonesia.com/teknologi/20260920104206-201-1405942/foto-pelukan-anak-dan-induk-orangutan-saat-dievakuasi-dari-karhutla', 'Pelukan erat anak orangutan kepada induknya menjadi momen haru saat keduanya dievakuasi dari area perkebunan kelapa sawit yang terdampak karhutla.', '🔬 Sains & Digital', 'CNN Indonesia', 'Sun, 20 Sep 2026 11:10:43 +0700', 1, '2026-09-20T05:52:27.095Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789883547093_kfta', 'Honor Magic9 bakal rilis, ini bocoran harga dan spesifikasinya', 'https://www.antaranews.com/berita/5749779/honor-magic9-bakal-rilis-ini-bocoran-harga-dan-spesifikasinya', 'Honor menyiapkan seri ponsel flagship terbaru Magic9 yang dijadwalkan diperkenalkan secara resmi pada 28 September 2026 ...', '⚡ Inovasi & Industri', 'Antara News', 'Sun, 20 Sep 2026 11:47:59 +0700', 1, '2026-09-20T05:52:27.096Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789883547094_u9mr', 'Spesifikasi Redmi NOTE 17 Pro Max dengan baterai 10.000 mAh', 'https://www.antaranews.com/berita/5749767/spesifikasi-redmi-note-17-pro-max-dengan-baterai-10000-mah', 'Xiaomi resmi memperkenalkan Redmi Note 17 Pro Max 5G di Indonesia dengan membawa sejumlah pembaruan, salah satunya ...', '⚡ Inovasi & Industri', 'Antara News', 'Sun, 20 Sep 2026 11:36:42 +0700', 1, '2026-09-20T05:52:27.109Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910178928_urmh', 'IHSG Sepekan Turun 1,53 Persen, Kapitalisasi Pasar BEI Jadi Rp11.266 Triliun', 'https://news.google.com/rss/articles/CBMioAFBVV95cUxQT01jV0ZubEUtNE9lY01XTmVBTG5RekVoZHZOTFNsWkc4cmo5QWkxQzdFOXZCWUV4ekpxa19FcGM0bXk1X1I0ZHNidWJWVmR1dWc3MXhTZTFyMjRLc3pGN0RHNm84MUN2MEJXZzBUb1VyT1VZbE5DRVM2ajJjZHJSSWZ2ZmgzMy0xcGo3NUpnTW0tWG8xclFVSk5aa2VjNjhP?oc=5', 'IHSG Sepekan Turun 1,53 Persen, Kapitalisasi Pasar BEI Jadi Rp11.266 Triliun&nbsp;&nbsp;Infobanknews', '📈 Saham & Market', 'Infobanknews', 'Sun, 20 Sep 2026 07:49:00 GMT', 1, '2026-09-20T13:16:19.695Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910178930_942p', 'Investor Asing Lepas Saham Rp 2,94 Triliun, 4 Big Bank Jadi Sasaran Utama Pekan Ini', 'https://news.google.com/rss/articles/CBMivgFBVV95cUxQVWkxeDgxNHVkSUJDYm9zSzdlQmx1TTRqWG1LYUFNZ2ZOTXYzeDFJRFNwekI1eHU0SWsyRXlwUVF6YXZxT293anRoSjkxRVJnMHRWYmpwdEpsUFMwUFdFZ2RTZGJhNVFtVjlDemFPeVZuNFVGODhOZzV1MWhWU3hEaEJDX3hFTW1fd2JnRmZNazB2SU5ncXZOOGJkckU1c0RHelJMcVhraE1tczA1QUU5TDJaQ0cxSFNMYkt6SkJB?oc=5', 'Investor Asing Lepas Saham Rp 2,94 Triliun, 4 Big Bank Jadi Sasaran Utama Pekan Ini&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Sat, 19 Sep 2026 23:28:00 GMT', 1, '2026-09-20T13:16:19.696Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910179228_bxlv', 'Permintaan staking Ethereum 13,6 kali lipat leb...', 'https://news.google.com/rss/articles/CBMinwFBVV95cUxPX0xXTUEwTGp1TmYtLXgyV200UFhWS1JMVmJKY1hreU01U0xXNjM3RDlyZTJ2cTBUaFR3YWdYWmJUaW9tS19KanA0ZUxhWjRKWG14MWNqM0VtdVQ0QjQ3QWJoajdqNVFkbDdtTkJCc0JtOTU3RGhCd1c3dVRnQ1c4RmlRZVNIYXVYQkU3T2F2eTQtb0VhMGFzRDhqbENfNEU?oc=5', 'Permintaan staking Ethereum 13,6 kali lipat leb...&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Sun, 20 Sep 2026 08:47:03 GMT', 1, '2026-09-20T13:16:19.696Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910179228_2915', '5 Game Blockchain dengan Rating Tertinggi di Google Play September 2026', 'https://news.google.com/rss/articles/CBMifkFVX3lxTE5yNndYbUFnOVM0VkVwYmpPcGNrWVFVQkNkanNERjhrM3V6MndXMzdQWjQ5UTlJREthSmhrVkgySlBERWViOHpoTnVMTlU5YTdFNlkwR0lIc1kzYkI0Qjk2QlhxRktMMks4cS1LVmVyUXRrVlFzMlZNLXJvNEd2dw?oc=5', '5 Game Blockchain dengan Rating Tertinggi di Google Play September 2026&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Sun, 20 Sep 2026 08:37:30 GMT', 1, '2026-09-20T13:16:19.696Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910179694_swxv', 'Anthropic Bangun Laboratorium Biologi, AI Claude Mulai Diuji di Dunia Nyata', 'https://news.google.com/rss/articles/CBMiwgFBVV95cUxPYV9uSEZEaXRDYm5NZkNkOThYTDcwYkNzTEs1RV80VHNIT0V5TzRveG1LbVZQb3ZGd1R0eXBNNTU4MWV2b0VmZGdoUmZhVGllREpwaUpiVlVrQ1NlRGRwSWtwY1VYeElNeGQxNElydGplWjJSUGZra0FtVDJiZXhkcjI0dTZaWW9QR1ZQai1jZm16dTNWV2txSWxMMTR4QnUzZGdxUC0zRTlTZG9KQkN5bllCYVBPdnh5MURtMTVqeGpQQdIBxwFBVV95cUxNYzNOdlo2RmNPb2pHTGptWXpackJ5YW1FeF92ZzB1Sk45a1lITGcxVWxoaWVrOVdFU28zNFp3MXNZUFNWczdxaklEVEx6WnZLYXdBa0NPVHJnV195X3g3SVljU3gxS0hEYk9nbE1DNXRxNHhKT1dTSkVGRlJ4Qmx3T1JEaTZLNG5XYkNkSnZpOUMyUnNTTndqdWNZRExqUHJNZXlPSFMyWl9KN2hKaVdueHE1MUJhaTkzRWlCLXlXakw0SmRpQUM4?oc=5', 'Anthropic Bangun Laboratorium Biologi, AI Claude Mulai Diuji di Dunia Nyata&nbsp;&nbsp;Jawa Pos', '🤖 AI & Teknologi', 'Jawa Pos', 'Sun, 20 Sep 2026 04:00:40 GMT', 1, '2026-09-20T13:16:19.696Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789910179695_sxq6', 'Google Gemini Meretas Tiga Perusahaan Saat Uji Keamanan Siber', 'https://news.google.com/rss/articles/CBMiZkFVX3lxTE1TaUFNNXN2R3A2OHYxRUotb3JoWTJmc1ZyMFp1MkFzbGRMTFdqQ0NYaGtSMXZRTHhMYTNfVXYyNURkVEtPR2VvR3FXNWpia2JuS3cxTnp3SWpva2V3Rm41V2ZIV01MUQ?oc=5', 'Google Gemini Meretas Tiga Perusahaan Saat Uji Keamanan Siber&nbsp;&nbsp;ChatNews.id', '🤖 AI & Teknologi', 'ChatNews.id', 'Sun, 20 Sep 2026 00:03:23 GMT', 1, '2026-09-20T13:16:19.697Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982823103_9nw3', 'Investor Bisa Kuasai Lebih dari 5% Saham BEI, Asalkan Penuhi Syarat Ini', 'https://news.google.com/rss/articles/CBMirAFBVV95cUxQY0R6QzR3ZS0yUFJYcDlHeXgzNVN3Q2R4SGpISjBuclQ3U2FsNnphLUY2NVZSWmpDemZ2a1JoUWJSeEtuSmVIOWx3V0std0RYSmhVcXZhaHFLRVN2X3R6UjVJdmY5ZzU3ZE9xVHlCeVFHQzlaMmZoY280QzQ3Xzk2NzN2SGV4a0wzUFhmNGVONThFTDBBSjQ2TkI3d0dhb1IteXNaaFlFTUpFT0pO?oc=5', 'Investor Bisa Kuasai Lebih dari 5% Saham BEI, Asalkan Penuhi Syarat Ini&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Mon, 21 Sep 2026 06:44:00 GMT', 1, '2026-09-21T09:27:04.043Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982823108_5hp6', 'IHSG turun 0,27% tertekan aksi jual asing di saham-saham ini', 'https://news.google.com/rss/articles/CBMipgFBVV95cUxOeU1nNVBGVldvTVdWYklqbWdxcllUUWhGZmdJdXRua0Jub1pycjg3WlhfdW9wTW1va1RYR0NlSzdBendpRWhuX0tZSWI0WGhhdG1QVDFCanZFbVZYanpzd0dBSnJRQVVJM2dPVnBJZTFOR2xBZzdCdmZ2N2YyMGxkeGJQWVNfTktweVMzMXdna1JMcm9YOUdPcnlGcXROM0NoNmoxLWJn?oc=5', 'IHSG turun 0,27% tertekan aksi jual asing di saham-saham ini&nbsp;&nbsp;IDNFinancials', '📈 Saham & Market', 'IDNFinancials', 'Mon, 21 Sep 2026 05:45:00 GMT', 1, '2026-09-21T09:27:04.043Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982823794_zamm', 'Bitwise pimpin konsolidasi validator Ethereum p...', 'https://news.google.com/rss/articles/CBMingFBVV95cUxNM2pKSThSQ2xScE04aGhVX2ItZ2pCakdaY3pFV2tBMnpQd0U4ckhxcGJrczl5ZENvUTM4WWw4VkV1eFBTNVNGaTlpelpib0xCaFotN01fS0J5R0JBTmlBbncwZUlLamVtVnUtMlJTNThQNXN2Qm5qZ1A3aURqYkNLbkpBcFNSUkxpZDZtOTl3eGpqSDVRNTJfOVYtNWRyUQ?oc=5', 'Bitwise pimpin konsolidasi validator Ethereum p...&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Mon, 21 Sep 2026 06:55:37 GMT', 1, '2026-09-21T09:27:04.043Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982823798_v70u', 'Antrean Staking Ethereum Membludak, Harga ETH Bakal Naik?', 'https://news.google.com/rss/articles/CBMieEFVX3lxTE9LVHhRVG9FSTF4MkFUQTdKX3FOX252WGJvRG40bV9XazVUUmVQeXRscU9BS0VRSUtoNy1NNUlYWHhhaFFfS0UzZnBVbWpua3FZQlBoWWlJeTJyN28xQ1VfSzZ6WnV1MjFmblFDeHFZVU5mekNPbzBQeA?oc=5', 'Antrean Staking Ethereum Membludak, Harga ETH Bakal Naik?&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Mon, 21 Sep 2026 05:26:36 GMT', 1, '2026-09-21T09:27:04.046Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982824038_73z9', 'Ada Aturan Investasi di Luar Negeri Dalam Perubahan POJK 27/2023, Ini Kata ADPI', 'https://news.google.com/rss/articles/CBMisAFBVV95cUxOZEhzT1BDbU5GclZfRGxQcTZsT2JkWHRWY1J0dFA2SlUtWm5mMkpwQ3RVaEFSbDJUNUItMzYweHpoRS1Vek9hdV9WRDdtR09yYU1KWGpiTjY2SEpldDFheURYcFhDdnBfanlZRzMzOUZRaWdTdVhSZWFOZEtlQVFhMHdEa0NBalNvcmdsM1hkeGozcmtodFVPRE1TLUJld1lyRHowMllkcHZ2My1penVVcg?oc=5', 'Ada Aturan Investasi di Luar Negeri Dalam Perubahan POJK 27/2023, Ini Kata ADPI&nbsp;&nbsp;KONTAN', '💰 Fintech & Ekonomi', 'KONTAN', 'Mon, 21 Sep 2026 02:23:08 GMT', 1, '2026-09-21T09:27:04.046Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1789982824042_bpow', 'Transaksi Digital BTN Melonjak 146%, Bank Mandiri Catat 3,32 Miliar Transaksi', 'https://news.google.com/rss/articles/CBMirgFBVV95cUxPRzN1eUw0SmdfVThweVREdFVzdXFKMTdXUlQ3YXBwMFZnUDVYOHBLZDFPY3MtUzVDZVJmMHVUUElodjhWU3ZrX3o4eVM4bXV5R203cXR4eWdpNmxqOGlhRm9ZR3I5a2J1RkJDX0NlOVZLUWpqSHl5TVpEMVVGQU9QNGlDZ183dksxSndLSW55TlZnV24xQmJsdXhQVEVNbDVkMUhIcS1ZNmRrS2paS1HSAacBQVVfeXFMUGpiclhaUTdnbjgzVmFkYmx4WGM2WDRzREoyam9LS1cyWFZKOVJEdWNGSmFsUlJyOEU3bWl3NEVJMHpvZVVXeTB6U3FpczJIVW5ka2ZmZUw2elQ5OUFsTnY0MW45MWtGclNsLWRKRFlacFQ2Mk9YZ1Iyci1UanpVaGdabFplQWRpZFlCaHh4SkFySERFNjRmR0tZTG5QdXFLWXB4NTBPOVU?oc=5', 'Transaksi Digital BTN Melonjak 146%, Bank Mandiri Catat 3,32 Miliar Transaksi&nbsp;&nbsp;kontan.co.id', '💰 Fintech & Ekonomi', 'kontan.co.id', 'Sun, 20 Sep 2026 15:29:45 GMT', 1, '2026-09-21T09:27:04.046Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790068854979_00yc', 'Circle luncurkan pinjaman USDC berbasis Bitcoin untuk institusi lewat protokol DeFi di Arc dan Ethereum.', 'https://news.google.com/rss/articles/CBMiigFBVV95cUxNbUhmd1QxSFdUOEQyV0tvekxtQVgzamlVRjFrckg0MHQ0bEkxWjFJMWluMXl0WG9laGZZc1lCdndzaFRKd3I5dlhEd1VFUTZCTU5sOTc5WE9DSlBnTE50cXpXbU1uUVZ3R3ktT3dIekVGc25IR0d6cDRROUdsNEU4VFFCRDZjc1VGYkE?oc=5', 'Circle luncurkan pinjaman USDC berbasis Bitcoin untuk institusi lewat protokol DeFi di Arc dan Ethereum.&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Tue, 22 Sep 2026 05:45:14 GMT', 1, '2026-09-22T09:20:58.372Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790068854982_me3r', 'Rekomendasi Kripto Hari Ini: Bitcoin Tembus $87.000, Reli Q3 Capai 47,60%', 'https://news.google.com/rss/articles/CBMijAFBVV95cUxNSDJ3TkU4eUdrd3lTWjZMWGFPeUpnMGxZQklTcmVNcFV0VDlEdlpvMG9ESUpXWlQ3VU5NanV2UkM4cFZLRHh6OXZnNUNnZ0RIcFlQNVl6UjlrQVVDRFFROGkzZzV2YmZUTXNmb2hYRTFZSVgzSS1UeXN2dnkzMDhzaHc0X3pNMTUwcnFEYg?oc=5', 'Rekomendasi Kripto Hari Ini: Bitcoin Tembus $87.000, Reli Q3 Capai 47,60%&nbsp;&nbsp;Ajaib', '🪙 Crypto & Blockchain', 'Ajaib', 'Tue, 22 Sep 2026 03:34:36 GMT', 1, '2026-09-22T09:20:58.373Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790068856974_dlgo', 'Aturan Investasi di Luar Negeri Ada di Perubahan POJK 27/2023, Ini Kata Asosiasi DPLK', 'https://news.google.com/rss/articles/CBMiugFBVV95cUxOYTNTTGlQZ2FEdE9QRUVBbU1BNGFzZ1lCUnJFazh6Nk9HakllZGpBMVJSVEVRNEVqRGFTSllNVXRfT19nRkREcl9adjNtUXhfMmF1WWFmU3ZjMFJFY294eG9qTHpNQ054WGlfWjhYVUR2MmNXT0FVTVVUTlJzT3F6QWZnYUxqN2J1N0JubVRlX2w1S3hHWWdGTk5LLS05X25vcDlWZGcxdFBhTG5QM3pNUk5GX09tdkxQUmfSAbMBQVVfeXFMT3NmS1dIYzlmVTQ5NjFEalE2aHg1Yk9JMGZPeXpqV1JzOG9sTEJpSG5SSnY4dnFkdlY5STg3VVZ6MEtfUjZ2eDZYbGVzUF9kbmI0NnQ5VnotQ1YwUlNsYXZXMFR6MGtrVHVYY0dzb25xMjFFQlVra0l6eHJuXzA3aldKcWxUN29YZTVnNWU0VVA2dDA0dU1ielI5QlJSSFAxVmwwYkp1NXp0Q3JGWmZDZWs1MnM?oc=5', 'Aturan Investasi di Luar Negeri Ada di Perubahan POJK 27/2023, Ini Kata Asosiasi DPLK&nbsp;&nbsp;kontan.co.id', '💰 Fintech & Ekonomi', 'kontan.co.id', 'Mon, 21 Sep 2026 12:35:33 GMT', 1, '2026-09-22T09:20:58.374Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790068857432_lixa', '7 Perusahaan AI Terkenal di Indonesia 2026, dari Kata.ai hingga Nodeflux dan IONext.ai', 'https://news.google.com/rss/articles/CBMitAFBVV95cUxPZGUzb3h0WDFjTXotenlOQjBUOGhrdXFCM24zRDdndzlhdGJ4U0tHbjhqVHlCaHNyaEY0NXZiMk9aVjhsQjZsWDVLWXhqOVMtUzVCQUgxYmJjSURnZ0VuZVdJVFZ2THJiWnRvdnhyQ0J3Q190aFpQSTQ5WHNtajd1dGlnZ2lQTHNHUFMzSWRwU01DektFS1lYbGU4OWZqVVdtc25FQlVIdHU4UmNCRUZGNlJEclI?oc=5', '7 Perusahaan AI Terkenal di Indonesia 2026, dari Kata.ai hingga Nodeflux dan IONext.ai&nbsp;&nbsp;Aktualita.co', '🤖 AI & Teknologi', 'Aktualita.co', 'Mon, 21 Sep 2026 18:35:56 GMT', 1, '2026-09-22T09:20:58.374Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790068857433_luge', 'Startup Gandeng Model AI China Efek Biaya Langanan OpenAI Cs Naik', 'https://news.google.com/rss/articles/CBMiuAFBVV95cUxPQzI3cmQxTHl4WTBJS0RDZmZEa0VPclUtY2JaMkQyYjRFaHVUNWY5dHo1bFh2VDg1NVd1azNXSDc1eGYxQ3BtZ2tIVXYtS3lzQzZDQVQ3VGQtamluOUZLdWZ0dDFibHBZT2R4eEc5eXo1QldwRDdtZElqc2hIV0VuaVpMSmdvYkdMNUlJSWpPOU90Zl9RbmMtVVp1blQtVGdEM2Y5eVh0M2ZscEhEOEdmak9nRWtxZGg0?oc=5', 'Startup Gandeng Model AI China Efek Biaya Langanan OpenAI Cs Naik&nbsp;&nbsp;Bloomberg Technoz', '🤖 AI & Teknologi', 'Bloomberg Technoz', 'Tue, 22 Sep 2026 01:58:00 GMT', 1, '2026-09-22T09:20:58.375Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790154890089_ewsx', 'Bitcoin, Ethereum, XRP, Dogecoin Gain as Trump Touts ''Good Meeting'' With Iran: Analyst Says BTC ''Sitting'' Above Strong Support', 'https://news.google.com/rss/articles/CBMihwJBVV95cUxPcFN6bFVFVklzcW9aZHdndVFrUEpGRnQ1cjNuS3ZrMnVmelFEY055QlZhclRNZjBVLUhpM0U4QllvMVhfRXoyMnNxSTJpZFpGMFdjSVVJa0N0ZFVsWEw2TklzRFl1elJlWnR4T1M1N2RxX1VfZ1Z3U20zOU11blI4czYzR0RRYUN3QXVGejc3MWJJRTdELU5ZQTJDWm9PRUF5a0dyZWxyRWdINHpnYk5kQUJkaTNaYXZYdVNyN0JIYjhtSE05M1NCN2ZCeC10NFYxaXlfaG9YMzB6ajNNb1FUY0trdFBDYjJzdGVRdjFfcmtMTk5BcW1DSEt0ZUYxUnA5VEJuU1VBcw?oc=5', 'Bitcoin, Ethereum, XRP, Dogecoin Gain as Trump Touts ''Good Meeting'' With Iran: Analyst Says BTC ''Sitting'' Above Strong Support&nbsp;&nbsp;id.tradin...', '🪙 Crypto & Blockchain', 'id.tradingview.com', 'Wed, 23 Sep 2026 02:04:00 GMT', 1, '2026-09-23T09:14:52.748Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790154890090_lpk3', 'Ethereum Reklaim US$2.700 Pertama Sejak Januari: Bisa Tembus US$3.000?', 'https://news.google.com/rss/articles/CBMinwFBVV95cUxQY3h3OGVqTXZVMjJldXA5N09YazRlRUZuNzZjSjBtdWkwbkY0eTZJLTFqWTNxOFBTR01qb1ZoZHpvY1JBdGx3bDFKZ0pxLUl4am1YdkRUb3hOeXV1SmNwSE1pU3FkSWtzSjdPdTAwLXFaMFFfNVdpaUk0ME5TbGRUU1BySXhfQ3BwenM4dzE5VmY1Wlh0aFp2QmFzVTZVdDA?oc=5', 'Ethereum Reklaim US$2.700 Pertama Sejak Januari: Bisa Tembus US$3.000?&nbsp;&nbsp;pintu.co.id', '🪙 Crypto & Blockchain', 'pintu.co.id', 'Wed, 23 Sep 2026 05:49:04 GMT', 1, '2026-09-23T09:14:52.773Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790154892042_3kqb', 'Agen AI Grok Bot Elon Musk Diserbu 400.000 Pengguna dalam Sepekan', 'https://news.google.com/rss/articles/CBMiuAFBVV95cUxOSS03M19FcEFuMFFGb1RiRGNlY09tVjgxUnJfYnFIUExXVUNaQXJGNHY4Z3NfWmtVX3pVWUp4UEd0bi1qSENqWk1KU3E2TEZRNHlkUmVpN3JGYnF5c1pDMlNQdW1vdW5lR3BaTmp0T3pFbzRtNmI2X0dIV1poVFJEeGF0RjBzb1BIcGZOWHdqd0RxOUo4WEJaNVNxa1JJYjNvSGJoal9oS05qZ1ZtQ1FKZGlseUoxYS1t?oc=5', 'Agen AI Grok Bot Elon Musk Diserbu 400.000 Pengguna dalam Sepekan&nbsp;&nbsp;Bloomberg Technoz', '🤖 AI & Teknologi', 'Bloomberg Technoz', 'Wed, 23 Sep 2026 08:25:00 GMT', 1, '2026-09-23T09:14:52.773Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790154892043_pttp', 'Kemajuan China Kini: Robot dan AI di Mana-Mana', 'https://news.google.com/rss/articles/CBMirAFBVV95cUxQVmx6S0NJOWtWVThZSUNpaWVCcVFkVlNaX2VkeWs2dExsaHYtb1VtRWJyczEyd1hSakc4N0tiekIzU21RWUV2Nms5eG9paUpZTnE1REFCYjBBeEJRRERnekZtNEVHV1FkUEJtYmc0QV9fb2dGTEJPS3BaNHFOVDUtS0NFZkpTYk05LUtiWklTUEY4cGFONDJTOFRjRmtxZnpJMDRCMkNJdl9uel800gGsAUFVX3lxTFBWbHpLQ0k5a1ZVOFlJQ2lpZUJxUWRWU1pfZWR5azZ0TGxodi1vVW1FYnJzMTJ3WFJqRzg3S2J6QjNTbVFZRXY2azl4b2lpSllOcTVEQUJiMEF4QlFERGd6Rm00RUdXUWRQQm1iZzRBX19vZ0ZMQk9LcFo0cU5UNS1LQ0VmSlNiTTktS2JaSVNQRjhwYU40MlM4VGNGa3FmekkwNEIyQ0l2X256XzQ?oc=5', 'Kemajuan China Kini: Robot dan AI di Mana-Mana&nbsp;&nbsp;CNBC Indonesia', '🤖 AI & Teknologi', 'CNBC Indonesia', 'Tue, 22 Sep 2026 23:05:39 GMT', 1, '2026-09-23T09:14:52.774Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251016148_f572', 'IHSG Ditutup Jatuh 1,20%, Sebaliknya Saham Emiten Haji Isam Melesat', 'https://news.google.com/rss/articles/CBMipwFBVV95cUxQQm1zV3hUbjlzUWJZWWl0Y0lJUnlQbnVZZ2czUHJfb2hsZFN0TVlUY1hOemxnZ3VRbklHVlVmTDd6QUtJN25HNXdzWW9fZlpUY3NlaldtS1hlLXR1d0JjcUNNSTdQd3JCeE5Idkllb0FNaE9WTVJ3MHcwaUNvbWl5Sy1vU3J2ZWpMZ0l4bTA0UG00a1pXVGVhaEg4Z0E3bU4xcUZ5V293UQ?oc=5', 'IHSG Ditutup Jatuh 1,20%, Sebaliknya Saham Emiten Haji Isam Melesat&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Thu, 24 Sep 2026 09:08:00 GMT', 1, '2026-09-24T11:56:57.578Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251016149_kmh9', 'Alasan IHSG Ditutup Melemah 1% di 6.298', 'https://news.google.com/rss/articles/CBMilAFBVV95cUxNckpYeTBFRWdJWXFoVWgyVjEyeFlFTmlZNExLd3ExVzhuSzlrdGpqMG52RkVJMG9lZnMxc0wtN0Q1TnpEMXBLdEJuaUdBOTA3SXV0UlZCUWVaNFpXSFRVWUJjYWpoVEx2cElqR1YtY2VnME9Zb2hIZ004YUtiamI5Q0k3X0RveU5zQ1JBUkJoaDhYdkhX?oc=5', 'Alasan IHSG Ditutup Melemah 1% di 6.298&nbsp;&nbsp;Bloomberg Technoz', '📈 Saham & Market', 'Bloomberg Technoz', 'Thu, 24 Sep 2026 10:11:42 GMT', 1, '2026-09-24T11:56:57.579Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251016735_5vqg', 'Ancaman kuantum terhadap Bitcoin dapat terwujud sebelum kelayakan komersial, peringatan regulator UE', 'https://news.google.com/rss/articles/CBMi0gFBVV95cUxNb1RNeXh5TFg4U0cxTThSdFUyMzRobFpSd285ODRTX0JjWDloYTZhUmZkRC1aVXA3b3FySXl0TXV1emVPeEZPSE9zdThGUDFMNTc5RFlYTEx4SlZZd2lFUXpkY3lCa1Y5aDhCQlM3dkFORWNEOUxLRFBoTDhBb0JGTG1QMi1ybDVWOUVoYTVhZU92aWh2bFJBQ0hyZDF0ZW4zQk4ycnBXS0J6N2ktTWlzekdCaFRzSkRBYnBYcDc3Rkgwa0NEXzY0NG81SmJ0MWd2Smc?oc=5', 'Ancaman kuantum terhadap Bitcoin dapat terwujud sebelum kelayakan komersial, peringatan regulator UE&nbsp;&nbsp;coindesk.com', '🪙 Crypto & Blockchain', 'coindesk.com', 'Thu, 24 Sep 2026 09:32:48 GMT', 1, '2026-09-24T11:56:57.579Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251016736_8ggi', 'Harga Ethereum Hari Ini 24 September 2026: ETH Melemah di US$2.660', 'https://news.google.com/rss/articles/CBMigAFBVV95cUxPTnVrUzV6bF9oU1lLdjJtNWpMTmg5dDlPUUg5VDhmOFcyRFJVbDhCWmQwZkNrTk9aalhCYThBTWZvTnpENnp5VGpoWXFqTmJnVTFHdTllUGw1RDJNalB3Rjh3Q1J4dHVKdWxLX1FLXzZDMXNKbnZMVmNscUUwNGNvRw?oc=5', 'Harga Ethereum Hari Ini 24 September 2026: ETH Melemah di US$2.660&nbsp;&nbsp;Pintu', '🪙 Crypto & Blockchain', 'Pintu', 'Thu, 24 Sep 2026 05:08:04 GMT', 1, '2026-09-24T11:56:57.579Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251017578_0jcg', 'Abu Dhabi Ready to Showcase the Face of AI-Based Government', 'https://news.google.com/rss/articles/CBMirAFBVV95cUxNWW51T0E1X285U1NYd2c0YzFpaG1md1ZhMDBaNkZiblExNlFqN1ViNE9lb09vaUNIaE0xTF9YUE9BVGtKVC1FcThPRUQ3anpseU84S3lsWEJwTGxraU1YRGZMUW81c1BMNEpDR1lNcHdwZUoyUUhsT1g3MTV6d08tSUVRSHlTVXVsX3pPM0NXck5iSGdjY29kekMxd3cwOWNFUmgzMTdrVHd2WkJK?oc=5', 'Abu Dhabi Ready to Showcase the Face of AI-Based Government&nbsp;&nbsp;Kompas.id', '🤖 AI & Teknologi', 'Kompas.id', 'Thu, 24 Sep 2026 09:52:44 GMT', 1, '2026-09-24T11:56:57.579Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790251017578_indf', 'Abu Dhabi Siap Perlihatkan Wajah Pemerintahan Berbasis AI', 'https://news.google.com/rss/articles/CBMiswFBVV95cUxOYkdPVGExd2VWcW5GZHYyaTZLU0lzZk10WWJqdEV5WE5lTzl2RDR5VlZpanZubi04eW1uR2hlZlZNRTVsY2hHNUh5cmd1SGpqRHB3ZDZDN19rT2c4MmxhalJHQ3N2aV9vSG1vSENKbmJSQm02VndQZm84dFloakZiVkJnc1NmamNiekZwbzZoOTVnczdKMmVIRHFlSTRweXJQVXY3cDdVVktyNjFmOFdwRTVTYw?oc=5', 'Abu Dhabi Siap Perlihatkan Wajah Pemerintahan Berbasis AI&nbsp;&nbsp;Kompas.id', '🤖 AI & Teknologi', 'Kompas.id', 'Thu, 24 Sep 2026 09:52:44 GMT', 1, '2026-09-24T11:56:57.579Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790253995350_xxvt', 'Review Buckeye Billfold: Cara Ohio Terima Pembayaran Crypto', 'https://news.google.com/rss/articles/CBMiekFVX3lxTE80WnpzVXZaek4xZ1lyRmhOVmNlbXUzWEtQTF9PaGdjZHotU0syY0pnNmJmdTBocUhnVERtUmZxNnVJdk13RV9BcGZOVy1Wd1NJaTY2b2RBUUVsaHFyWG54RUNaM3loak9EWmhrN2hLVFlqNS13UktNMm13?oc=5', 'Review Buckeye Billfold: Cara Ohio Terima Pembayaran Crypto&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Thu, 24 Sep 2026 12:44:21 GMT', 1, '2026-09-24T12:46:36.603Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790310555453_0lxi', 'Reliance Sekuritas Jagokan 4 Saham Hari Ini, Ada MEDC hingga FAST', 'https://news.google.com/rss/articles/CBMipgFBVV95cUxNZjEzRzRnV1JpUl9tLUF3OXdZMzJ0eGpyaG9WNXE0UEhSb1AtVDhteHdWLVdZNUh1dWJpNTVHRlhwWV9vZlBIUGRqOHZMR3FGTTZVS1pVM083OHNoYlJiTEVJc2hzMVRUOHNuZ1ZXYUFTYmt6TmZOU0gzeUNtVmxScXotYnM0N1Q0X2NZNFJBUm1hcFk3ejI2Q0pJOEQ5ckM0V1RhZEtn?oc=5', 'Reliance Sekuritas Jagokan 4 Saham Hari Ini, Ada MEDC hingga FAST&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Fri, 25 Sep 2026 01:54:00 GMT', 1, '2026-09-25T04:29:18.888Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790310555454_8b5h', 'Harga Saham Bergerak Liar, BEI Gembok Perdagangan 4 Emiten Ini', 'https://news.google.com/rss/articles/CBMiwAFBVV95cUxNdEpoTlRtbDdzVXhwRnhMMTVqQlNJMXdOX2Z2azRCYzQzRktaSENoQ3VXMjlCNk5qOU04V09OLWU1aDhGU2lEYjVhdjBkNGJzaHZUVExFOXh1Uk1tU3o0eWpIRmVNR19jY01jTjJTa2k4M3pjOXRjMXlSQV9SNVE5cy1qSFNTaG53Vko1Y2RWakRjdmg5UkljTWg2T0QyRVM3ZmNaX1NNR3N4d0U5NzB0YUFsb0IzS2tPeXdUMnFoWGnSAcYBQVVfeXFMT1F3MDR1ZXBETjN3R01HZUpzdHdXbW9vMklyNWdWNXdHQnBhdHdsdk82MmlPT1BlYmNORFBoV24xRjlENlFhclJNa1laSkozRm1GdFRoX0ZmQkxzYXB1eC1rNThsT3VBZTJqQndqQUVNc3NzZkdwU2Vsc3U4cm9MY1JPTlBGRjEtdzFDald5MkZqMUg4YTNhLVdWblB5RkUtVE4tZ3ZjYTlScnRXYnBJVnRITXQyb0xGaTVjWGdrYWZSbkF6UG9R?oc=5', 'Harga Saham Bergerak Liar, BEI Gembok Perdagangan 4 Emiten Ini&nbsp;&nbsp;cnbcindonesia.com', '📈 Saham & Market', 'cnbcindonesia.com', 'Fri, 25 Sep 2026 03:25:41 GMT', 1, '2026-09-25T04:29:18.893Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790310556486_yt1j', 'Harga Bitcoin turun 16% akibat penurunan hashra...', 'https://news.google.com/rss/articles/CBMiggFBVV95cUxOUlRhTTJsR1BUc2R6NEoxVTdrZE14d1dMWWlGalotd3lOUFEtTXJfRDdkR1p3czY2ZXV4Nmh5bG5uTWcxaW1QQW4tX3hjY3VCb3ZGSy1RcFptOWlHRXlXM0xSVHVxLVAxR3V3bUpCdXlCb0lVUUQ0TDFxZUxHODNQa3hR?oc=5', 'Harga Bitcoin turun 16% akibat penurunan hashra...&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Thu, 24 Sep 2026 15:24:20 GMT', 1, '2026-09-25T04:29:18.894Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790310557145_zwh4', 'OJK Pacu Transformasi Keuangan Digital, Keamanan Siber Tak Bisa Ditawar', 'https://news.google.com/rss/articles/CBMiqgFBVV95cUxNNWlxLTc0ZExnQXNBSFhuX1pKYjd1dzJ4bjdueDA0NVdPMTRtdHNRc2JlMi1hWTQwYy1YN2tMZ0dXdDE1cEFONF9qM2FCSTFsQk9RcWNlTENyWEY5cEw3M2JJMjl0ejRWc2ZhMlFOOUwzTDRkY0tVZHVsdGhKMWRVRmFmWGZxb0pGSndmTVNjNDlMT1R6ZWh0X3gtaUZBd09wRk5VUlBmUFN1Zw?oc=5', 'OJK Pacu Transformasi Keuangan Digital, Keamanan Siber Tak Bisa Ditawar&nbsp;&nbsp;pasardana.id', '💰 Fintech & Ekonomi', 'pasardana.id', 'Fri, 25 Sep 2026 00:19:00 GMT', 1, '2026-09-25T04:29:18.894Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790323602836_mclc', 'Penyebab IHSG Balik Arah Jadi Melemah', 'https://news.google.com/rss/articles/CBMikwFBVV95cUxNZTBCZW41Y3hnamlvY0FlRUhNUGRMck9RQm44V2YtNE5XMjV0WDdFUDZOV3pHSG5DMC1xanZ0cGpjVVlLYV83aGJnTHpYWENockw4MmlNZ3JlRUVUaXJhRGlteVpxUVFDRDlWQ3NtdGpWUXpSOXIzanZnanBUN2phSG8zTWhpTjdBNDhjZ0VEdE1KalE?oc=5', 'Penyebab IHSG Balik Arah Jadi Melemah&nbsp;&nbsp;Bloomberg Technoz', '📈 Saham & Market', 'Bloomberg Technoz', 'Fri, 25 Sep 2026 06:03:20 GMT', 1, '2026-09-25T08:06:52.653Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790323602838_o7a9', 'IHSG Sesi I Melemah 0,55% Terseret Kejatuhan Mayoritas Sektor Saham', 'https://news.google.com/rss/articles/CBMiqAFBVV95cUxNeFlSbUIzSWN0OUNLQjMxMlhZU3FWVFctWEl0bE0wQ0gzRmxmTnl0NWNpRDhQQndUQmMxRWNCYm9JTmRMVVNORTV4c0N4RGVaTVplelpQdEt3RmRyc04yazllSmNmMXE5bUpZUi1nMmZKYnVsREJCc3ZSQUd3ZXRiQ0l6WkR0STl5T3pFMHFfUXdKb2VuLWlhaDFycXppQWFVbzZWUVZXemI?oc=5', 'IHSG Sesi I Melemah 0,55% Terseret Kejatuhan Mayoritas Sektor Saham&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Fri, 25 Sep 2026 04:34:00 GMT', 1, '2026-09-25T08:06:52.654Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790323603797_5yku', 'Ada Katalis Besar, Tom Lee Prediksi Ethereum Capai ATH Baru di 2026', 'https://news.google.com/rss/articles/CBMicEFVX3lxTE1xYzZic1VPaXloZ3V0YlcxcTROMnZwRkNyMXhpb3NTSERDYjVRYi1mMW9SR1ZLaXdkSkhqV0ZCUVV3dXlCbGJVeS1KOWVGRnRWX0RfMkRyZkxCZlhleTAweTEwdE1QaWREZWVqVWluMkE?oc=5', 'Ada Katalis Besar, Tom Lee Prediksi Ethereum Capai ATH Baru di 2026&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Fri, 25 Sep 2026 02:43:24 GMT', 1, '2026-09-25T08:06:52.654Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790323603798_t4c6', 'Harga Ethereum Hari Ini 25 September 2026: ETH Stabil di US$2.670', 'https://news.google.com/rss/articles/CBMigAFBVV95cUxPdjZoR2VSX0dodUtoU2oxY0RBX0M4R1NCWXNlMkdLWEE4S3JHWllRWmg5Y3RTUWoya1NpckhiRnhXbmpKX2xuTGl4MUJCUm8wajZKdVRnRnVOdk1ESXMydzc5c0pQcEpPT2xQcmdfUkw1T2pUZUVVOUs3el9RaEJ4VA?oc=5', 'Harga Ethereum Hari Ini 25 September 2026: ETH Stabil di US$2.670&nbsp;&nbsp;Pintu', '🪙 Crypto & Blockchain', 'Pintu', 'Fri, 25 Sep 2026 06:13:57 GMT', 1, '2026-09-25T08:06:52.654Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790348186556_aw9j', 'IHSG melemah ikuti bursa Asia, pasar cermati pertemuan Trump-Jinping', 'https://news.google.com/rss/articles/CBMitAFBVV95cUxNUXdCdEZROHh4U3p6WFUxU0h3enhLOC1FSDh2eVpaUmVTNnExekstQnFQRVNLOTRkOGFPcU1MM0FxbmpaZ3daaUhXSkZjQWkzSTB6S3R2OTBIQXNRbUplMzhKeDVfRWNFcHpxTTlnb19TNmJsNFlISktha1BBWDdrdVFPcHpoLTYtN1JCRTQ1cjZVSWYwTXFzZzhQd19ya19uOU1yS0xSZld0RThIU29lN3pqZjXSAbQBQVVfeXFMTVF3QnRGUTh4eFN6elhVMVNId3p4SzgtRUg4dnlaWlJlUzZxMXpLLUJxUEVTSzk0ZDhhT3FNTDNBcW5qWmd3WmlIV0pGY0FpM0kwekt0djkwSEFzUW1KZTM4Sng1X0VjRXB6cU05Z29fUzZibDRZSEpLYWtQQVg3a3VRT3B6aC02LTdSQkU0NXI2VUlmME1xc2c4UHdfcmtfbjlNcktMUmZXdEU4SFNvZTd6amY1?oc=5', 'IHSG melemah ikuti bursa Asia, pasar cermati pertemuan Trump-Jinping&nbsp;&nbsp;ANTARA News Jambi', '📈 Saham & Market', 'ANTARA News Jambi', 'Fri, 25 Sep 2026 12:10:08 GMT', 1, '2026-09-25T14:56:27.575Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790348187086_faj2', 'Harga Ether (ETH) naik di atas $2.700, mencapai $2.705 di pasar spot Binance.', 'https://news.google.com/rss/articles/CBMihgFBVV95cUxNYVlJN2dMWWpNb0FrTjBSd2tlNXpaZDYwSlNyUDdUbFNpcm9PUnBCRTJNQ3pldGpRd0dlME5qNjhaY1BnRjFLOTdoWHA0d1BzZEZWTWxZY25jckVoOENtQzdkb3UzWGc0bGxENHV1R2RkZkNOM1FkMGt4NXRqaXlReWdSQW02dw?oc=5', 'Harga Ether (ETH) naik di atas $2.700, mencapai $2.705 di pasar spot Binance.&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Fri, 25 Sep 2026 09:45:02 GMT', 1, '2026-09-25T14:56:27.576Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790348187086_dm8l', 'CEO Ripple Sarankan Beli 5 Crypto Terbesar Ini dan Hold 5 Tahun', 'https://news.google.com/rss/articles/CBMie0FVX3lxTFBCa1pqSGFwQmJDNHZlVHpSNnFBVHYtM0xFdTNFOXp4dnBpNl9OSVpYR2swa2I5bWtSalpqTmdyQ253UGM3UjVrcGhUeUhFWmdVRXpPT3pHdDYzUlFRTFdYbHVhaDNGQkoxUU9yZ1NZUm5xX1ZPTDRLbG85Zw?oc=5', 'CEO Ripple Sarankan Beli 5 Crypto Terbesar Ini dan Hold 5 Tahun&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Fri, 25 Sep 2026 04:40:36 GMT', 1, '2026-09-25T14:56:27.576Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790348187575_fw7s', 'Skor Kesehatan Finansial Anak Muda Turun, tapi Kebiasaan Menabung Meningkat?', 'https://news.google.com/rss/articles/CBMid0FVX3lxTE5SVWUxVmF4bjdack1QQkJESHBCN1RIYXhFYTRwUUV4MTZMYTFleElrek1SNXRaT2JCd1VGdE9jbU0zZ0JTT0VNdzR6V1BzVExwRVNoN3pCUS1TbW1wVzFOc0V1cFVZVXZjSDc1LVJSSHE5SG5wR09z?oc=5', 'Skor Kesehatan Finansial Anak Muda Turun, tapi Kebiasaan Menabung Meningkat?&nbsp;&nbsp;magdalene.co', '💰 Fintech & Ekonomi', 'magdalene.co', 'Fri, 25 Sep 2026 10:12:44 GMT', 1, '2026-09-25T14:56:27.576Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790413488178_xv72', 'Asing Terus Membuang Saham, Net Sell Tembus Rp 77 Triliun', 'https://news.google.com/rss/articles/CBMimwFBVV95cUxQOERpekYwSEpYUmtkdFE4WGNDSm9CbHBxUkszX2owczhYRlBaWWZ0YU95SE5fRUktSVpFaUJkYWlWU1ptV2Q3UU53MEgtRGNtcEljTjNrdDZGVWY5bllKM0JUS3JaeU9rd3liQ2F6bDdZb0tuQmoxQnBKNzZmSlNVSFBNZmIyQlJKMFZFR1YyZHdGM2c4SDBsZ190bw?oc=5', 'Asing Terus Membuang Saham, Net Sell Tembus Rp 77 Triliun&nbsp;&nbsp;InvestorTrust', '📈 Saham & Market', 'InvestorTrust', 'Fri, 25 Sep 2026 23:57:00 GMT', 1, '2026-09-26T09:04:49.212Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790413488179_flwr', 'Danantara Mau Pegang Saham BEI, Ini Update Terbarunya', 'https://news.google.com/rss/articles/CBMitAFBVV95cUxPcWRINEUtM3RxLV8wMzJUMzdCWDVRZXo4ZjRGU1BwNXduNDZuaDdGTmlTREpfVExYVkNTR0hrbUJZNl9wM08tN0pDQ1huYXJLUzBibzZ0NklrZFlqYXByR0MwMVNQaUtWQUVMM3NnQjFXM0Y3SmdtVDBhQmliS29SZEI4b3JVOTA1c0FqeW5BQXROTElNNDBYQ2xQZUFUVVhKVWhreUtSbFRLZHk1X0ZfLTFKcFPSAboBQVVfeXFMUE96TmR0TUl4eEJudnVaM2V3V2hGOXpFVkEtUThfWHd2TWZ4akdrUHo0NVV1VG5xX2M4bHJ4ajlibWptTE9FNEtNaExxWlp1RGRvSkl4S1pteTZTbVZXWmV6VDhET0psdEwwemxVaFhJdDRuLTB6WXdldTNmWE5CME5vZUZGOTlEQWZjNnpuSVlsUFFrMGpyUEx5aEs2TzRWSktEZExvZkxjaG9FMlZZRHRpUmJqX0otbkVn?oc=5', 'Danantara Mau Pegang Saham BEI, Ini Update Terbarunya&nbsp;&nbsp;CNBC Indonesia', '📈 Saham & Market', 'CNBC Indonesia', 'Sat, 26 Sep 2026 03:00:03 GMT', 1, '2026-09-26T09:04:49.212Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790413488680_8w0q', 'Ethereum vs Chainlink, Siapa Lebih Diuntungkan dari Tokenisasi Aset?', 'https://news.google.com/rss/articles/CBMidEFVX3lxTE5uQlRST1AxM05RYUh2UF9sMTVILW9id21OcjVGUjN0WTZaTkwxVVdXTWROdkJsT252cHNaaGlFejdpU1BUTXQtZi02V2NmRmZvcTg5UG14WXNCdkxBbnJ6TldpaVhYZ3l6Mi01UkxIcDUwVkdZ?oc=5', 'Ethereum vs Chainlink, Siapa Lebih Diuntungkan dari Tokenisasi Aset?&nbsp;&nbsp;INDODAX', '🪙 Crypto & Blockchain', 'INDODAX', 'Fri, 25 Sep 2026 23:49:25 GMT', 1, '2026-09-26T09:04:49.212Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790413488681_ikrz', 'Asosiasi Blockchain melihat pergeseran kepemimpinan tak lama setelah RUU Crypto Clarity gagal', 'https://news.google.com/rss/articles/CBMiywFBVV95cUxPSzFNZFJpbXhFOThnZmNFOVlmWlpGVU5iYkRKZEhaWFpuSG9pQ0lBZGZvWXlkbURMdGdyMWF6OFIzOE9zWXhXM3NocjAyQTVaTndIS0JUT1ZsVFlvZWt1NUVLSE5Sd1B0RncyRDdObEpBSU5jb0xvRTYzUHN2YS1UVm9WVUVrTU1Va1EtUGVoWERpNEFST2JHRWZwQ3hTSThzM19LOGFPV0xzRVRXWEp5ZWlFZHBPQUN5OFdtc2xvQVQ3Ry13MjUwSkZjcw?oc=5', 'Asosiasi Blockchain melihat pergeseran kepemimpinan tak lama setelah RUU Crypto Clarity gagal&nbsp;&nbsp;CoinDesk', '🪙 Crypto & Blockchain', 'CoinDesk', 'Fri, 25 Sep 2026 20:01:05 GMT', 1, '2026-09-26T09:04:49.214Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790413489211_4d2e', 'Gen Z Mulai Minati Dunia Investasi, Bursa Efek Catat Investor Baru Pasar Modal di Lampung Capai 828 Ribu di Tahun 2026', 'https://news.google.com/rss/articles/CBMi3AFBVV95cUxOVnQ2Q3BiUDc3WUZjcVQwdFVxTFR2eEVnb1Nyd2ZOUkNLZnJ1TXdINjZlZVRZVk1GQ0c4cC1kRDFGMGMxVjNXVmoxeklwa1JSNmJQQW5qT1FmOVdud3FEYVlWSG95ZjRPZmVCaUtNQWUwM0t4dl9VbXdhNlZnZVJkY1NDTVRmTkllbmJpa2F5TXpSOXdTU1pwTHhrb3BMcjJLRUh2N1dsUmhQM1JOSlFWVDhjbUs0cUVaRTJpMkRZRXpPNmxmb0Nqc2FEWWoxMG14N0ppNWFPSzNXa0dT?oc=5', 'Gen Z Mulai Minati Dunia Investasi, Bursa Efek Catat Investor Baru Pasar Modal di Lampung Capai 828 Ribu di Tahun 2026&nbsp;&nbsp;Lampungpro', '💰 Fintech & Ekonomi', 'Lampungpro', 'Sat, 26 Sep 2026 02:10:41 GMT', 1, '2026-09-26T09:04:49.214Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790427873914_830j', 'BEI Catat 5 Saham Ini Jadi Pemberat Gerak IHSG Sepekan', 'https://news.google.com/rss/articles/CBMihgFBVV95cUxNdHIxb0p6Z1RfWW1YRFBoOE83WVJicVduVm9QRVk0MmhpLUo3YlM5cWh4NU1aazNJbG1HSVQ4b2lzR25rcThHWk5sc3ZlcWQySEl1VTNzeDRtbEtLQkpUdjF6WV9sVHdHc2VGOUpsRHFuT2htQ1hIc1JCX3BaVXNaQy1xc3ZRQQ?oc=5', 'BEI Catat 5 Saham Ini Jadi Pemberat Gerak IHSG Sepekan&nbsp;&nbsp;Infobanknews', '📈 Saham & Market', 'Infobanknews', 'Sat, 26 Sep 2026 07:01:00 GMT', 1, '2026-09-26T13:04:35.844Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790427875842_nb94', 'UKM Indonesia Bangkit: Revolusi AI untuk Kemandirian Bangsa', 'https://news.google.com/rss/articles/CBMiiAFBVV95cUxNQlR2MjE1bXhsSERHVERnY2hUc1ZKYzNmOHJyOGVfTFF6R05WV2dzZTljRzRBZkxicmRILXBmREVQNHh1MkdIaFVOQjdKcmQxRmpyanRfNlk5Ym5HYVVrOVNfYXV5dXlPNzZUNE9JNWhIT1lmdk1xMjJseGxFUUJid0IwQnFfNHBJ?oc=5', 'UKM Indonesia Bangkit: Revolusi AI untuk Kemandirian Bangsa&nbsp;&nbsp;Pijar Nusa Media', '🤖 AI & Teknologi', 'Pijar Nusa Media', 'Sat, 26 Sep 2026 02:37:40 GMT', 1, '2026-09-26T13:04:35.845Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790484443585_r9ac', 'Mendung di Pasar Saham, Rp 361 Triliun Susut, Ini Peta Raksasa Bursa', 'https://news.google.com/rss/articles/CBMiogFBVV95cUxON3FVM2RDVEtjNzRTNGdZd0llUlZtQ0lubVBMMWE0RXk0TzRveHJwalFlSHF3QWtCWkpjeWFac1E1dG9xbEp6T1Y2UnRRTlFVVHBlc2Rrazc1OUwwOE5JSGd4RklyaEZaQU5GSFJBZXJKNl9HemlmRV9Ma2x5OWZZMGhWd0VMSE1wOUhtN3A0c21uc0Jwc3AtNmVTbXk5cld2aFE?oc=5', 'Mendung di Pasar Saham, Rp 361 Triliun Susut, Ini Peta Raksasa Bursa&nbsp;&nbsp;investor.id', '📈 Saham & Market', 'investor.id', 'Sun, 27 Sep 2026 03:00:00 GMT', 1, '2026-09-27T04:47:25.448Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790484443586_m3od', 'Bos BEI Jabarkan Penghapusan Empat Kriteria di Papan FCA, 92 Saham Lepas dari Pemantauan Khusus', 'https://news.google.com/rss/articles/CBMiwgFBVV95cUxQTXR6RkJkS0NHWU0wR1M3TzNvOVpWdEh5ZDQ2ZW0xX2ZtOUZBNHBmWFFzRG1DRVg1VWtZNDVJeXE5MFVPUnoteC1td25xaER0ZVFwUFNuZGg1eng0QUl5M24yaVNpbWlYc3BNdTV6ZDB0OWRmSXhYN21vWnc5VFRJQjNuWVZlM2EwUE5JaHltTVZDWFEzREZqYkZETkt0R3BVa3F5QmFQODdjRi1mYk1fTzZZNEVtT3FoX3pXdFdBbXM2QQ?oc=5', 'Bos BEI Jabarkan Penghapusan Empat Kriteria di Papan FCA, 92 Saham Lepas dari Pemantauan Khusus&nbsp;&nbsp;SWA.co.id', '📈 Saham & Market', 'SWA.co.id', 'Sun, 27 Sep 2026 00:00:00 GMT', 1, '2026-09-27T04:47:25.450Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790484444432_785x', 'Node Ethereum masih butuh penyimpanan besar mes...', 'https://news.google.com/rss/articles/CBMihgFBVV95cUxNWGpyZWVwNDVRZnR3cDlRcXNTeGd1RU5aRDdjbkltVmNCMlRTSUkwTkNpSG13QUtBTERrVGJnaERlTEpnZFp4UlhwS3Awcndvem9pWlhORGNIQVJsR1pwNGNISXBXNUgxak1yUnA3Yk8yb3A4VDlFZUhqTF9DXzZ4bVRrSkctUQ?oc=5', 'Node Ethereum masih butuh penyimpanan besar mes...&nbsp;&nbsp;Pluang', '🪙 Crypto & Blockchain', 'Pluang', 'Sat, 26 Sep 2026 13:27:49 GMT', 1, '2026-09-27T04:47:25.451Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790484444957_b1ru', 'Cara Investasi Saham dan Reksadana untuk Pemula dengan Modal Rp10.000 - https://rakyatcirebon.disway.id/', 'https://news.google.com/rss/articles/CBMiwAFBVV95cUxNS0E1X0V6a0VSVm9zclpPSlk3SjNOb0ttYXFrWU9XODdOLVhKZ0pacEJjQm92cWRmZGIyWkRQTGxURXRSUzlBRS1Hb3VjU3FVeWV3aTROR3JYTEo3TGxLaVVtQjNmQU9tdGw3OGIxNm9PQ01zNlhZMmRHSURKR0N5ZnhIY01oRkNtZVNmalZSTHRUY2NsQk40RUtqT3dYWmh1LXZNOGpFWjlnOEpvX3Z2YjhvbHEtRlR5TzF1SmdqU2vSAbABQVVfeXFMUHV2Z1BuR0ltNTFJU0RJdmYzMW5NQVlEeWVkOW1YdExSaE9VeFI0M0UzUWxIWk1Fb2xybmhnQklTM3JEcllmbGZLbnk3bmpGaXQzcFZWYkdGVnFDSGRKX0dZT1pjVzlIbGpWX3Jkd0dvd2prNkZXdGhkcnMtN3lvem5aQ0dyV2lvWWdPb0dZVUhiVlFzUkFhOEtsTm04QUlqSkgzU2tTWGt1a25YRFVZZjk?oc=5', 'Cara Investasi Saham dan Reksadana untuk Pemula dengan Modal Rp10.000 - https://rakyatcirebon.disway.id/&nbsp;&nbsp;Rakyat Cirebon', '💰 Fintech & Ekonomi', 'Rakyat Cirebon', 'Sat, 26 Sep 2026 15:00:00 GMT', 1, '2026-09-27T04:47:25.452Z') ON CONFLICT DO NOTHING;
INSERT INTO "ecosystem_news" ("id", "title", "url", "snippet", "category", "source", "published_at", "sent_to_group", "created_at") VALUES ('news_1790484445448_zgi0', 'AI di Klaim Asuransi Rumah Sakit Tambah Biaya Kesehatan Rp15,3 Triliun', 'https://news.google.com/rss/articles/CBMimwFBVV95cUxPVll6VXJiakMxOG1pSU9WWUVQWTJJZk16TVlxaGt0NFVuaFJ3X3JjTE4zUjkwejBBc1FTU2EzQ3ZEaWlaaGRtcy1qbDlWWm5KSlBpcmpteWNzNkVia0hwSzJuQjZRV2k0cmFxM1hqMlJQU1pwTmRKN0hVMnVxTlUzNThnUFAxd2U5My1kNFRxUVJ6VXAtMXRMa3A1Yw?oc=5', 'AI di Klaim Asuransi Rumah Sakit Tambah Biaya Kesehatan Rp15,3 Triliun&nbsp;&nbsp;Telset.id', '🤖 AI & Teknologi', 'Telset.id', 'Sat, 26 Sep 2026 22:01:27 GMT', 1, '2026-09-27T04:47:25.452Z') ON CONFLICT DO NOTHING;

-- Data for kv_store (7 rows)
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('commandOverrides', '{
  "siapaitupajri": {
    "enabled": true,
    "customResponse": "pajri adalah orang paling aneh di dunia",
    "updatedAt": "2026-09-09T12:59:42.819Z",
    "outputRouting": {
      "mode": "inplace"
    },
    "permission": "all"
  },
  "ping": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:59:18.181Z",
    "outputRouting": {
      "mode": "group",
      "destination": "vault"
    },
    "permission": "all"
  },
  "menu": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "help": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z",
    "outputRouting": {
      "mode": "group",
      "destination": "vault"
    }
  },
  "allowgroup": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "disallowgroup": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "adduser": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "deluser": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "listuser": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "setlevel": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "setowner": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "unsetowner": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "opencvc": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "opencoc": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T13:00:13.326Z",
    "outputRouting": {
      "mode": "inplace"
    },
    "permission": "public"
  },
  "cleartmp": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "tmpstatus": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "kick": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "add": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "promote": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "demote": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "groupname": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "groupdesc": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "grouppic": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "link": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "revoke": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "groupinfo": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "leave": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "close": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "open": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "mute": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "spam": {
    "enabled": false,
    "customResponse": null,
    "updatedAt": "2026-09-07T10:48:12.730Z"
  },
  "unbanned": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "banned": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antidelete": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z",
    "outputRouting": {
      "mode": "group",
      "destination": "vault"
    }
  },
  "antivirtex": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antispam": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "notify": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "setwelcome": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "welcome": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antifake": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antibot": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "aiforget": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ai": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "reminder": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "setreminder": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "readmore": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "tts": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "translate": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "removebg": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "twitter": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "gdrive": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "terabox": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "pinterest": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "spotify": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "facebook": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ig": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ytmp4": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ytmp3": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "tiktokslide": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "tiktok": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "tourl": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "mdf": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "toimg": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "sticker": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "setwarnlimit": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "resetwarn": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "warn": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "listmember": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "listadmin": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "afk": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "getpp": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "groupsetting": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "delwordlist": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hidetag": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "listwordlist": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antibad": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "antilink": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "delchat": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "restrict": {
    "enabled": true,
    "customResponse": null,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "infobot": {
    "enabled": true,
    "customResponse": "🤖 {botName}\n👤 Pengguna: {user}\n🕐 Waktu: {time}\n📅 Tanggal: {date}",
    "updatedAt": "2026-09-09T12:59:38.717Z",
    "outputRouting": {
      "mode": "inplace"
    },
    "permission": "all"
  },
  "test": {
    "enabled": true,
    "customResponse": "m",
    "outputRouting": {
      "mode": "inplace"
    },
    "updatedAt": "2026-09-08T08:50:12.807Z"
  },
  "status": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "viewwebb": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "editoutput": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "editmsg": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hermes": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hermes-agent": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hermesclear": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hermesstatus": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "aio": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "capcut": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "douyin": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "doump3": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "douvn": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fbmp3": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fbvn": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "videy": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "lyric": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "meloboom": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "pinimg": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "spotplay": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "spotsearch": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "stickerpack": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "stickerly": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ttphoto": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "wallcraft": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "play": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ytsearch": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "playvideo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ptv": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "attp": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "ttp": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "balogo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "brathd": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bratvidhd": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bratanime": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bratgirl": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "brat": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bratvid": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "carbonify": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakecall": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakedana": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakefbcomment": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakeff": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakeml": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakestory": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakethreads": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakettcomment": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakettprofile": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakewachannel": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakewagroup": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakexnxx": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "fakeytcomment": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "iqc": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "msg": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "pornhub": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "qc": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "kiss": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "cry": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "wave": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "poke": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "waifu": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "neko": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "shinobu": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "megumin": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bully": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "cuddle": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "hug": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "awoo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "kicked": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "pat": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "smug": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bonk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "yeet": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "blush": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "smile": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "highfive": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "handhold": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "nom": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "bite": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "glomp": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "slap": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "kill": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "happy": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.242Z"
  },
  "wink": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "dance": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "cringe": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "smeme": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "text2qr": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "wanted": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "wasted": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "blurface": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "calculator": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "ocr": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "colorize": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "toimage": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "tovideo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "emojito": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "emojimix": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "hd": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "hdvid": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "groupid": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "morse": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "dmorse": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "channelid": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "removewm": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "qr2text": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "ssweb": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "bass": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "blown": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "chipmunk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "deep": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "earrape": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "fast": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "fat": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "nightcore": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "reverse": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "robot": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "slow": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "smooth": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "vibrato": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "echo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "tremolo": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "cave": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "haunted": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "underwater": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "cursed": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "dizzy": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "demonic": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "alien": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "ghost": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "glitch": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "vintage": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "telephone": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "8d": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "drunk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "helium": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "muted": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "underworld": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "squirrel": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "boostbass": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "boosttreble": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "whisper": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "darthvader": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "chipdemon": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "megaphone": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "immersive": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "reverb": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "dcstalk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "ffstalk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "igstalk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "robloxstalk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "ttstalk": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "swm": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "toaudio": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "tovn": {
    "enabled": true,
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "interping": {
    "enabled": true,
    "customResponse": null,
    "outputRouting": {
      "mode": "inplace"
    },
    "permission": "all",
    "updatedAt": "2026-09-09T12:59:14.399Z"
  },
  "apakahpajriganteng": {
    "enabled": true,
    "customResponse": null,
    "outputRouting": {
      "mode": "inplace"
    },
    "permission": "all",
    "updatedAt": "2026-09-09T12:59:34.661Z"
  }
}'::jsonb, '2026-09-12T00:38:19.814Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('customFeatures', '{
  "siapaitupajri": {
    "name": "siapaitupajri",
    "response": "pajri adalah orang paling aneh di dunia",
    "desc": "Command kustom dari Polaris Web",
    "category": "Kustom Web",
    "permission": "public",
    "ownerOnly": false,
    "adminOnly": false,
    "enabled": true,
    "createdAt": "2026-09-07T02:55:36.461Z",
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "infobot": {
    "name": "infobot",
    "response": "🤖 {botName}\n👤 Pengguna: {user}\n🕐 Waktu: {time}\n📅 Tanggal: {date}",
    "desc": "Menampilkan informasi bot.",
    "category": "Imported",
    "permission": "public",
    "ownerOnly": false,
    "adminOnly": false,
    "enabled": true,
    "createdAt": "2026-09-07T03:39:32.557Z",
    "updatedAt": "2026-09-09T12:29:16.243Z"
  },
  "apakahpajriganteng": {
    "name": "apakahpajriganteng",
    "response": "Ketampanannya bukan kaleng-kaleng, sekali lewat bikin kamera auto fokus, kaca auto bening, dan orang-orang auto bilang: “Waduh, siapa nih kok gantengnya kebangetan?”\n{sender}",
    "desc": "Mengulang pesan dengan opsi grup dan mention pengirim.",
    "category": "Kustom Web",
    "permission": "public",
    "ownerOnly": false,
    "adminOnly": false,
    "enabled": true,
    "createdAt": "2026-09-07T13:38:30.996Z",
    "updatedAt": "2026-09-09T12:29:16.243Z"
  }
}'::jsonb, '2026-09-12T00:38:19.815Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('whitelist', '{"allowed":[],"owners":[]}'::jsonb, '2026-10-11T08:29:39.311Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('groupSettings', '{"allowedGroups":{}}'::jsonb, '2026-10-11T08:29:39.312Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('privateChatSettings', '{"chats":{}}'::jsonb, '2026-10-11T08:29:39.312Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('botProfile', '{"profilePicUrl":"","name":"Polaris"}'::jsonb, '2026-10-11T08:29:39.312Z') ON CONFLICT DO NOTHING;
INSERT INTO "kv_store" ("key", "value_json", "updated_at") VALUES ('bot_ecosystem_state', '{}'::jsonb, '2026-10-11T08:29:39.312Z') ON CONFLICT DO NOTHING;

-- Data for login_history (4 rows)
INSERT INTO "login_history" ("id", "user_id", "username", "role", "ip_address", "user_agent", "login_at", "login_timestamp", "success") VALUES (37, 'user_1788745743989_74m03', 'owner_antigravity_master', 'cosmos', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0', '2026-10-12T12:27:45.092Z', 1791808065092, 1) ON CONFLICT DO NOTHING;
INSERT INTO "login_history" ("id", "user_id", "username", "role", "ip_address", "user_agent", "login_at", "login_timestamp", "success") VALUES (38, 'user_1788745743989_74m03', 'owner_antigravity_master', 'cosmos', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0', '2026-10-18T14:21:20.521Z', 1792333280521, 1) ON CONFLICT DO NOTHING;
INSERT INTO "login_history" ("id", "user_id", "username", "role", "ip_address", "user_agent", "login_at", "login_timestamp", "success") VALUES (39, 'user_cosmos_test', 'cosmos_test', 'cosmos', '::1', 'node', '2026-10-21T15:27:58.264Z', 1792596478264, 1) ON CONFLICT DO NOTHING;
INSERT INTO "login_history" ("id", "user_id", "username", "role", "ip_address", "user_agent", "login_at", "login_timestamp", "success") VALUES (40, 'user_1788745743989_74m03', 'owner_antigravity_master', 'cosmos', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0', '2026-10-21T22:36:13.046Z', 1792622173046, 1) ON CONFLICT DO NOTHING;

-- Data for luminary_projects (1 rows)
INSERT INTO "luminary_projects" ("id", "title", "description", "category", "creator", "progress", "tasks_json", "docs_json", "created_at", "updated_at") VALUES ('prj-1', 'Pembuatan Robot WhatsApp Terpadu Ataraxia', 'Membangun bot cerdas berbasis Baileys & AI hermes autonomous.', 'Teknologi & Bot', 'Cosmos', 75, '[{"id":"tsk-1","title":"Setup Baileys Auth & Credentials","status":"completed","subtasks":[{"id":"sub-1","title":"Generate QR code canvas","completed":true},{"id":"sub-2","title":"Pairing code multi-session","completed":true}]},{"id":"tsk-2","title":"Integrasi Multi-Key Fallback Hermes","status":"in_progress","subtasks":[{"id":"sub-3","title":"Deep research grounding","completed":true},{"id":"sub-4","title":"Auto-retry token exhaustion","completed":false}]}]'::jsonb, '[{"id":"doc-1","title":"Diagram Arsitektur Baileys Multi-Session","type":"image","url":"/assets/icons/polaris.png","timestamp":"2026-10-11T08:34:23.797Z"},{"id":"doc-2","title":"Catatan Spesifikasi PRD v1.0","type":"document","url":"#","timestamp":"2026-10-11T08:34:23.797Z"}]'::jsonb, '2026-10-11T08:34:23.797Z', '2026-10-11T08:34:23.797Z') ON CONFLICT DO NOTHING;

-- Data for sirium_listings (6 rows)
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-1', 'store-ataraxia', 'Polaris Full Dashboard Enterprise Suite', 'Web Templates', 350000, 700, 'Template dashboard dark-mode ultra-lengkap dengan 8 pilar galaksi, integrasi bot Baileys WhatsApp, visualisasi chart realtime, dan sound effects haptic.', '["Clean Modular Architecture","Three.js Cosmic Background","Live Socket Telemetry","Zero CLS & 60 FPS Animations"]'::jsonb, 'HTML5, CSS3, Vanilla JS, Express, SQLite', 'ZIP Bundle', '48.2 MB', 'http://localhost:3000', '/assets/icons/polaris.png', 89, 5, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-2', 'store-ataraxia', 'Luminary Assessment & Quizizz Clone Engine', 'Full-Stack Apps', 450000, 900, 'Sistem pembelajaran gamifikasi kuis interaktif dengan 15+ mode soal (Drag and drop, hotspot, labeling, math formula, live lobby multiplayer).', '["15+ Interactive Question Modes","Realtime Multiplayer Lobby","Sound Effects & Confetti FX","Export to PDF & Excel"]'::jsonb, 'React, TypeScript, Tailwind CSS, Express', 'Source Code ZIP', '62.4 MB', 'http://localhost:3000/#study', '/assets/icons/luminary.png', 73, 4.9, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-3', 'store-botlab', 'Multi-Device Baileys WhatsApp Bot Master Pack', 'Bot Modules', 250000, 500, 'Engine bot WhatsApp tangguh anti-ban dengan auto-responder visual, filter grup anti-link, download media multi-platform, dan integrasi AI.', '["Multi-session Pairing Code","Auto Read & Reaction","Custom Plugin Loader","SQLite Memory Vault"]'::jsonb, 'Node.js, @whiskeysockets/baileys, Sharp, FFmpeg', 'Node.js Package', '22.8 MB', '', '/assets/icons/messages.png', 145, 4.8, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-4', 'store-cybercraft', 'Obsidian UI — High-End Glassmorphism Component Kit', 'UI Component Kits', 180000, 360, 'Koleksi 40+ komponen web obsidian gelap dengan efek multi-layered colored aura underglows, spring easing, dan token warna 3 lapis.', '["40+ Accessible Components","Tailwind CSS v3/v4 Ready","Lucide Icons Integration","Figma File Included"]'::jsonb, 'Tailwind CSS, React / HTML', 'Figma + Code ZIP', '35.1 MB', '', '/assets/icons/cubes.png', 62, 5, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-5', 'store-ataraxia', 'Starlium Arcade Multiplayer Game Engine', 'Games & 3D', 320000, 640, 'Paket source code game server-authoritative catur, tic-tac-toe, dan duel turnamen real-time menggunakan WebSocket murni.', '["Server State Validation","Turn-based Timer & Matchmaking","Spectator Mode","Leaderboard Integration"]'::jsonb, 'Node.js, WebSocket, Canvas API', 'Full Repository', '29.0 MB', 'http://localhost:3000/#games', '/assets/icons/starlium.png', 51, 4.9, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_listings" ("id", "store_id", "title", "category", "price_idr", "price_coins", "description", "features_json", "tech_stack", "file_type", "file_size", "live_demo_url", "preview_image", "downloads_count", "rating", "is_verified", "created_at") VALUES ('item-6', 'store-cybercraft', 'Cyberpunk & Retro Sci-Fi Audio Synthesizer Pack', 'Audio & SFX', 120000, 240, '100+ sampel audio haptic web, tombol klik taktil, laser whoosh, dan ambient pad synthesizers untuk meningkatkan interaksi UI.', '["120 High Quality SFX (WAV/MP3)","Web Audio API Synthesizer Script","Royalty-free License","Zero Latency Buffer"]'::jsonb, 'Web Audio API, WAV/MP3 320kbps', 'Audio ZIP', '84.5 MB', '', '/assets/icons/activity.png', 98, 4.9, 1, '2026-10-11T08:34:23.805Z') ON CONFLICT DO NOTHING;

-- Data for sirium_stores (3 rows)
INSERT INTO "sirium_stores" ("id", "owner_username", "store_name", "tagline", "bio", "avatar_url", "banner_url", "badge", "rating", "total_sales", "whatsapp_number", "telegram_handle", "created_at") VALUES ('store-ataraxia', 'Cosmos', 'Ataraxia Studio Official', 'Laboratorium Arsitektur Web & Bot Eksklusif', 'Pengembang resmi ekosistem Astraonyx Ataraxia. Menyediakan source code berkualitas enterprise, bot WhatsApp Baileys custom, dan template dashboard modern.', '/assets/icons/polarium-star.png', '', 'Official Ecosystem', 5, 342, '6281234567890', 'astraonyx_official', '2026-10-11T08:34:23.804Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_stores" ("id", "owner_username", "store_name", "tagline", "bio", "avatar_url", "banner_url", "badge", "rating", "total_sales", "whatsapp_number", "telegram_handle", "created_at") VALUES ('store-cybercraft', 'CyberCraftsman', 'Nexus UI Works', 'UI/UX Design Systems & Tailwind Primitives', 'Spesialis antarmuka obsidian dark-mode, micro-animations spring physics, dan komponen React berkemampuan aksesibilitas tinggi.', '/assets/icons/atomic.png', '', 'Verified Elite', 4.9, 189, '6289876543210', 'nexus_craft', '2026-10-11T08:34:23.804Z') ON CONFLICT DO NOTHING;
INSERT INTO "sirium_stores" ("id", "owner_username", "store_name", "tagline", "bio", "avatar_url", "banner_url", "badge", "rating", "total_sales", "whatsapp_number", "telegram_handle", "created_at") VALUES ('store-botlab', 'ZeroByte', 'BotForge Robotics', 'Modul Multi-Session WhatsApp & Telegram Bots', 'Automasi bisnis cerdas, integrasi AI Hermes, dan bot manajemen komunitas berkecepatan tinggi.', '/assets/icons/polaris.png', '', 'Bot Master', 4.8, 124, '6281299887766', 'botforge_dev', '2026-10-11T08:34:23.804Z') ON CONFLICT DO NOTHING;

-- Data for users (2 rows)
INSERT INTO "users" ("id", "username", "password_hash", "role", "require_2fa", "pin_hash", "is_banned", "linked_owner_number", "created_at", "updated_at", "avatar_url", "bio", "display_name", "custom_ai_api_key", "phone_number", "plain_password", "plain_pin", "current_session_token") VALUES ('user_1788745743989_74m03', 'owner_antigravity_master', '$2b$10$EoEKf.9GXGUg98UayM1AWu1fj2eNbEsAiL2r007lbRZUGcQ6slBqi', 'cosmos', 1, '$2b$10$I.Xvia2nfe85moFV5vxiVeaeS.YnO.J5EUZ91/T.xNBVqeJM7nXi6', 0, '6281234567890', '2026-09-07T01:49:03.989Z', '2026-10-21T22:36:13.037Z', 'https://api.dicebear.com/7.x/bottts/svg?seed=PolarisMaster', 'Cosmos Supreme Master of Polaris', 'Polaris Admin', '', '6281234567890', 'Owner#WiFi!2026$Secure', '123456', 'sess_1792622173028_jxwk8m2r') ON CONFLICT DO NOTHING;
INSERT INTO "users" ("id", "username", "password_hash", "role", "require_2fa", "pin_hash", "is_banned", "linked_owner_number", "created_at", "updated_at", "avatar_url", "bio", "display_name", "custom_ai_api_key", "phone_number", "plain_password", "plain_pin", "current_session_token") VALUES ('user_cosmos_test', 'cosmos_test', '$2b$10$zJy28GcLiO.Fd8PIg4BvPOLQyjIC3ppB7uy5KQ4DfGUQKYre2QSvS', 'cosmos', 1, '$2b$10$WwjyTxxWaWgNh/7zEkr3uOXQf4L9y/YeePT2MO.Cz2nQH0An88uua', 0, '', '2026-10-21T14:26:15.896Z', '2026-10-21T22:36:13.038Z', '', '', 'cosmos_test', '', '628999999999', 'Test#12345', '123456', 'sess_1792596478261_ymxeneos') ON CONFLICT DO NOTHING;

-- Data for wayground_quizzes (8 rows)
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_fullstack', 'Fullstack JS, WebSocket & Baileys Mastery', 'Uji pemahamanmu tentang arsitektur socket Baileys v7, event loop Node.js, async/await, dan manajemen memori buffer.', 'coding', 'Fullstack Engineering & WhatsApp Baileys', '⚡', '', 30, 'advanced', '[{"id":"q_fs_1","question":"Di Baileys v7 multi-device, event apa yang dipancarkan saat bot berhasil memperoleh status koneksi terbuka (terhubung ke server WA)?","options":["connection.update dengan connection === \"open\"","messages.upsert dengan status === \"connected\"","creds.update dengan status === \"ready\"","socket.handshake dengan status === \"online\""],"correctAnswer":0,"explanation":"Di Baileys, pemantauan siklus koneksi dilakukan via event \"connection.update\". Properti update.connection akan bernilai \"open\" ketika WebSocket terotentikasi.","hint":"Cari event yang memiliki kata \"connection\" dan properti status \"open\".","points":1000},{"id":"q_fs_2","question":"Mengapa Buffer.from() atau stream lebih dianjurkan daripada membaca file utuh (fs.readFileSync) saat mendownload media besar di Node.js?","options":["Buffer/stream mencegah lonjakan V8 Heap Memory dan Memory Leak pada RAM server","fs.readFileSync otomatis mengenkripsi media dengan AES-GCM","Node.js melarang fs.readFileSync pada protokol WebSocket","Stream membuat file terunduh 10x lebih kecil dari ukuran aslinya"],"correctAnswer":0,"explanation":"Streaming atau chunk buffering memungkinkan data diproses bertahap per-paket byte tanpa memuat seluruh file gigabyte ke RAM, mencegah OOM (Out Of Memory) crash.","hint":"Fokus pada alokasi memori RAM dan V8 Heap engine.","points":1000},{"id":"q_fs_3","question":"Pada arsitektur single-threaded Node.js, di mana microtasks (Promise.then, queueMicrotask) dieksekusi dalam siklus Event Loop?","options":["Tepat setelah fase saat ini selesai, sebelum melanjutkan ke fase macrotask berikutnya","Hanya di fase check (setImmediate)","Di akhir siklus setiap 1 detik sekali secara berkala","Di thread pool libuv secara paralel di latar belakang"],"correctAnswer":0,"explanation":"Microtask queue (Promise, queueMicrotask, process.nextTick) dieksekusi segera setelah operasi saat ini selesai sebelum event loop melanjutkan ke macrotask (timers, I/O, check) berikutnya.","hint":"Microtask memiliki prioritas lebih tinggi daripada macrotask biasa.","points":1000},{"id":"q_fs_4","question":"Teknik apa yang paling efektif untuk mencegah nomor bot WhatsApp terkena banned saat memproses pesan massal?","options":["Exponential jitter delay acak (2-5 detik) dan peniruan status presence (composing / recording)","Mengirimkan 100 pesan sekaligus dalam 1 milidetik tanpa jeda","Menghapus file auth_info secara berulang kali saat runtime","Mengganti port WebSocket setiap kali pesan dikirimkan"],"correctAnswer":0,"explanation":"Menambahkan artificial jitter delay acak dan mengirimkan signal presence (composing/recording) meniru pola perilaku manusia asli, menghindari deteksi otomatis anti-spam WhatsApp.","hint":"Pola perilaku natural manusia dengan jeda acak.","points":1000},{"id":"q_fs_5","question":"Fitur HTTP header apa yang wajib disertakan pada koneksi WebSocket untuk melakukan upgrade protokol dari HTTP ke WS?","options":["Upgrade: websocket dan Connection: Upgrade","Accept: application/websocket dan Keep-Alive: true","Sec-Protocol: raw-binary dan Content-Type: ws/frame","Authorization: Bearer WS dan Cache-Control: no-cache"],"correctAnswer":0,"explanation":"Handshake WebSocket dimulai dari request HTTP standar dengan header \"Upgrade: websocket\" dan \"Connection: Upgrade\" dengan status response 101 Switching Protocols.","hint":"Header dengan kata kunci Upgrade dan Connection.","points":1000}]'::jsonb, 'Polaris Lead Architect', 0, 1, '2026-10-04T04:36:35.364Z', '2026-10-04T04:36:35.364Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_ai_llm', 'Artificial Intelligence, Transformers & Agentic Architecture', 'Pahami mekanisme Attention di balik LLM, penalaran multi-step, RAG, dan koordinasi multi-agent.', 'ai', 'Artificial Intelligence & Large Language Models', '🧠', '', 30, 'advanced', '[{"id":"q_ai_1","question":"Komponen apakah yang bertanggung jawab menghubungkan token satu dengan token lainnya dalam arsitektur Transformer (Vaswani et al.)?","options":["Multi-Head Self-Attention Mechanism","Convolutional Max-Pooling Filter","Recurrent Hidden State Memory Gate","Linear Regression Feedforward Layer"],"correctAnswer":0,"explanation":"Self-Attention menghitung bobot keterkaitan dinamis antara setiap token dalam urutan teks menggunakan matriks Query (Q), Key (K), dan Value (V).","hint":"Mekanisme ini memungkinkan kata memperhatikan kata lain dalam satu kalimat.","points":1000},{"id":"q_ai_2","question":"Apa fungsi utama dari KV-Cache (Key-Value Cache) pada tahap inferensi autoregresif sebuah model bahasa besar?","options":["Menghindari komputasi ulang representasi Key dan Value dari token-token sebelumnya pada tiap langkah prediksi","Menyimpan parameter bobot model ke dalam harddisk SSD agar tidak memakan RAM","Menyensor kata-kata tidak sopan sebelum dikirimkan ke pengguna","Menerjemahkan teks bahasa asing ke bahasa Inggris secara otomatis"],"correctAnswer":0,"explanation":"Pada generasi token berikutnya, KV-Cache menyimpan matriks K dan V dari token masa lalu, memangkas kompleksitas waktu inferensi dari O(N^2) menjadi O(N).","hint":"Cache ini mencegah perhitungan ulang matriks yang sudah dihitung sebelumnya.","points":1000},{"id":"q_ai_3","question":"Dalam pola arsitektur RAG (Retrieval-Augmented Generation), apa langkah pertama sebelum context disuntikkan ke prompt LLM?","options":["Mengubah query pengguna menjadi embedding vector lalu melakukan semantic similarity search di Vector Database","Melatih ulang (fine-tuning) seluruh miliaran parameter model dari awal","Mengompres prompt menjadi berkas arsip zip terenkripsi","Mengirimkan query ke server Google Cloud untuk diterjemahkan ke kode C++"],"correctAnswer":0,"explanation":"RAG mengonversi pertanyaan pengguna menjadi representasi embedding berdimensi tinggi, mencari potongan dokumen paling relevan (cosine similarity) di Vector DB, lalu menyisipkannya ke prompt context.","hint":"Semantic search dengan representasi numerik vektor.","points":1000},{"id":"q_ai_4","question":"Apa perbedaan mendasar antara parameter \"Temperature\" dan \"Top-P\" (Nucleus Sampling) dalam sampling LLM?","options":["Temperature mengatur keacakan kurva probabilitas (kelembutan softmax), sedangkan Top-P membatasi kandidat ke kumpulan kumulatif persentase teratas","Temperature mengatur jumlah token maksimum, sedangkan Top-P mengatur kecepatan token per detik","Temperature hanya berlaku untuk model OpenAI, sedangkan Top-P hanya untuk model open-source","Keduanya sama persis tanpa ada perbedaan matematis sama sekali"],"correctAnswer":0,"explanation":"Temperature menskalakan logit sebelum softmax (mendatarkan atau menajamkan distribusi). Top-P memotong ekor probabilitas rendah dengan menjumlahkan probabilitas kumulatif hingga ambang p.","hint":"Satu mengatur skala logit, satu memotong batas kumulatif p.","points":1000},{"id":"q_ai_5","question":"Dalam konsep Autonomous Coding Agent (seperti Hermes), apa yang dimaksud dengan \"Multi-Turn Tool Use with Self-Correction\"?","options":["Agen mengeksekusi aksi (baca file/jalankan perintah), menerima error kembali sebagai observasi, lalu memperbaiki rencananya secara mandiri","Agen meminta pengguna menulis ulang kode setiap kali terjadi kegagalan sistem","Agen otomatis mematikan server jika mendeteksi bug sintaksis","Agen mengubah bahasa pemrograman menjadi HTML tanpa persetujuan"],"correctAnswer":0,"explanation":"Self-correction memungkinkan LLM bertindak dalam loop: Thought -> Action -> Observation (error) -> Reflection -> Fixed Action hingga tugas tuntas tanpa intervensi manual.","hint":"Siklus observasi error yang memicu perbaikan mandiri.","points":1000}]'::jsonb, 'Hermes Research Division', 0, 1, '2026-10-04T04:36:35.368Z', '2026-10-04T04:36:35.368Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_crypto', 'Modern Cryptography, AES-256 & Signal Protocol', 'Kuasai kriptografi simetris, asimetris, Diffie-Hellman key exchange, dan arsitektur rahasia pesan E2EE.', 'security', 'Cybersecurity, Cryptography & Privacy', '🔐', '', 30, 'advanced', '[{"id":"q_cr_1","question":"Mengapa mode AES-256-GCM lebih aman dan modern dibandingkan mode AES-256-CBC biasa?","options":["AES-GCM menyediakan AEAD (Authenticated Encryption with Associated Data) yang mendeteksi manipulasi ciphertext (tampering)","AES-CBC tidak memerlukan kunci enkripsi sama sekali","AES-GCM hanya bisa didekripsi oleh pihak kepolisian internasional","AES-CBC memiliki panjang kunci 1024 bit sedangkan GCM hanya 128 bit"],"correctAnswer":0,"explanation":"AES-GCM menghasilkan Authentication Tag bersamaan dengan ciphertext. Jika ada pihak yang memodifikasi 1 bit ciphertext, dekripsi akan gagal seketika, mencegah padding oracle attack.","hint":"AEAD menggabungkan enkripsi dan verifikasi integritas data.","points":1000},{"id":"q_cr_2","question":"Dalam protokol pertukaran kunci Diffie-Hellman (ECDH), apa yang dihitung oleh kedua pihak untuk menghasilkan Shared Secret yang sama?","options":["Mengalikan Private Key milik sendiri dengan Public Key milik lawan bicara","Mengirimkan Private Key secara terbuka melalui jaringan internet","Menggabungkan password akun Facebook kedua belah pihak","Membuat hash MD5 dari alamat IP router pengirim"],"correctAnswer":0,"explanation":"Pada ECDH berbasis kurva eliptik: Alice menghitung (privAlice * pubBob) dan Bob menghitung (privBob * pubAlice). Keduanya menghasilkan titik kurva yang identik secara matematis.","hint":"Kombinasi kunci privat sendiri dengan kunci publik pihak kedua.","points":1000},{"id":"q_cr_3","question":"Apa fungsi utama dari protokol \"Double Ratchet Algorithm\" yang digunakan pada Signal dan WhatsApp E2EE?","options":["Menyediakan Perfect Forward Secrecy dan Post-Compromise Security untuk setiap pesan individual","Membuat pesan WhatsApp terkirim 2 kali lebih cepat dari SMS biasa","Menyimpan salinan kunci enkripsi di server Meta untuk keperluan audit","Mengubah format teks pesan menjadi file suara terkompresi"],"correctAnswer":0,"explanation":"Double Ratchet memutar kunci KDF (Key Derivation Function) pada setiap pesan (Symmetric Ratchet) dan setiap respons (DH Ratchet), sehingga kompromi satu kunci tidak membuka pesan masa lalu atau masa depan.","hint":"Perlindungan kunci pesan masa lalu dan pemulihan otomatis setelah kebocoran.","points":1000},{"id":"q_cr_4","question":"Berapakah ukuran Initialization Vector (IV / Nonce) yang direkomendasikan secara standar untuk algoritma AES-GCM?","options":["12 bytes (96 bits)","64 bytes (512 bits)","1 byte (8 bits)","128 bytes (1024 bits)"],"correctAnswer":0,"explanation":"NIST merekomendasikan IV berukuran tepat 96 bit (12 byte) untuk AES-GCM karena dioptimalkan secara langsung tanpa perlu hashing tambahan GHASH.","hint":"Tepat 12 byte atau 96 bit.","points":1000},{"id":"q_cr_5","question":"Konsep kriptografi tingkat lanjut apakah yang memungkinkan seseorang membuktikan bahwa ia mengetahui rahasia tanpa pernah membocorkan rahasia itu sendiri?","options":["Zero-Knowledge Proofs (ZKP)","Caesar Cipher Substitution","Base64 URL Encoding","Single-Factor Authentication"],"correctAnswer":0,"explanation":"Zero-Knowledge Proof (seperti zk-SNARKs) membuktikan kebenaran suatu proposisi matematis kepada verifikator tanpa mengungkapkan informasi atau variabel rahasia itu sendiri.","hint":"Istilah \"Zero-Knowledge\" membuktikan kebenaran tanpa membocorkan data.","points":1000}]'::jsonb, 'Polaris Sanctum Security', 0, 1, '2026-10-04T04:36:35.368Z', '2026-10-04T04:36:35.368Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_chess', 'Stockfish Engine, Opening Theory & Minimax', 'Kuasai algoritma catur canggih, evaluasi NNUE centipawn, PGN parsing, dan taktik grandmaster.', 'chess', 'Chess Algorithms, Tactics & Stockfish NNUE', '♟️', '', 30, 'intermediate', '[{"id":"q_ch_1","question":"Teknik optimasi apakah yang memangkas cabang pohon pencarian (search tree) pada algoritma Minimax catur tanpa memengaruhi hasil evaluasi terbaik?","options":["Alpha-Beta Pruning","Monte Carlo Stochastic Drop","Linear Gradient Descent","QuickSort Partitioning"],"correctAnswer":0,"explanation":"Alpha-Beta pruning mengabaikan langkah-langkah yang terbukti lebih buruk daripada langkah yang sudah ditemukan sebelumnya, memangkas pohon pencarian hingga setengah kedalaman secara eksponensial.","hint":"Dua huruf Yunani pertama untuk pemangkasan pohon.","points":1000},{"id":"q_ch_2","question":"Apa arti nilai evaluasi \"+150\" centipawns yang diberikan oleh Stockfish pada sebuah posisi catur?","options":["Putih unggul setara dengan 1.5 pion (pion dihitung 100 centipawns)","Hitam akan melakukan skakmat dalam 150 langkah","Permainan telah berlangsung selama 150 menit","Putih memiliki kelebihan 150 perwira di atas papan"],"correctAnswer":0,"explanation":"Dalam representasi mesin catur, 1 pion bernilai 100 centipawns. Nilai positif menunjukkan keunggulan Putih, sehingga +150 berarti Putih unggul 1.5 pion.","hint":"100 centipawn sama dengan 1 pion penuh.","points":1000},{"id":"q_ch_3","question":"Apakah kepanjangan dan fungsi dari teknologi \"NNUE\" pada Stockfish modern?","options":["Efficiently Updatable Neural Network — jaringan saraf tiruan cepat yang berjalan pada CPU untuk fungsi evaluasi posisi","New Normal Universal Engine — sistem grafis 3D untuk bidak catur","Node Network Underflow Error — penanda bug saat mesin kehabisan memori","Non-Neutral Uniform Endgame — database endgame 7 bidak Tablebase"],"correctAnswer":0,"explanation":"NNUE (Efficiently Updatable Neural Network) menggantikan evaluasi manual heuristik dengan jaringan saraf ringan yang hanya memperbarui perbedaan langkah bidak, menjadikannya sangat cepat di CPU.","hint":"Neural network yang dapat diperbarui secara efisien saat langkah bidak bergeser.","points":1000},{"id":"q_ch_4","question":"Dalam teori pembukaan catur, langkah pertama 1. e4 c5 dikenal sebagai pembukaan apa?","options":["Pertahanan Sisilia (Sicilian Defense)","Pertahanan Prancis (French Defense)","Ruy Lopez (Spanish Opening)","Gambit Ratu (Queen''s Gambit)"],"correctAnswer":0,"explanation":"1. e4 c5 adalah Pertahanan Sisilia, respons asimetris paling agresif dan populer di level Grandmaster untuk merebut kontrol petak d4.","hint":"Nama sebuah pulau terkenal di Italia bagian selatan.","points":1000},{"id":"q_ch_5","question":"Notasi baku FEN (Forsyth-Edwards Notation) digunakan dalam pemrograman catur untuk merepresentasikan apa?","options":["Kondisi snapshot lengkap penempatan bidak di atas papan catur pada satu waktu spesifik","Daftar seluruh langkah dari awal hingga akhir pertandingan","Riwayat nama dan rating Elo kedua pemain catur","Analisis grafis eval bar dan statistik akurasi gerakan"],"correctAnswer":0,"explanation":"FEN mendeskripsikan secara ringkas posisi bidak per-baris papan, giliran melangkah, hak rokade, petak en passant, dan counter halfmove.","hint":"Snapshot posisi satu kali, berbeda dengan PGN yang mencatat seluruh jalannya game.","points":1000}]'::jsonb, 'Starlium Grandmaster', 0, 1, '2026-10-04T04:36:35.369Z', '2026-10-04T04:36:35.369Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_physics', 'First-Principles Physics & Quantum Mechanics', 'Eksplorasi hukum alam semesta: termodinamika, relativitas, kuantum superposisi, dan reduksi logika fundamental.', 'science', 'Fundamental Physics, Quantum & Thermodynamics', '🔬', '', 30, 'advanced', '[{"id":"q_ph_1","question":"Menurut Hukum Kedua Termodinamika, apa yang selalu bertambah atau tidak pernah berkurang pada sistem yang terisolasi?","options":["Entropi (derajat ketidakteraturan sistem)","Suhu total dalam skala Kelvin","Massa jenis partikel penyusun materi","Gaya gravitasi antar atom"],"correctAnswer":0,"explanation":"Hukum Kedua Termodinamika menyatakan bahwa dalam sistem terisolasi, entropi (tingkat keacakan/disorder) cenderung selalu meningkat seiring berjalannya waktu, mendefinisikan panah waktu (Arrow of Time).","hint":"Ukuran keacakan atau ketidakteraturan termodinamika.","points":1000},{"id":"q_ph_2","question":"Fenomena kuantum apakah yang menggambarkan kondisi di mana partikel berada di berbagai kemungkinan keadaan sekaligus sebelum dilakukan pengukuran?","options":["Superposisi Kuantum (Quantum Superposition)","Difraksi Elektromagnetik Klasik","Radiasi Benda Hitam Spektral","Efek Doppler Akustik"],"correctAnswer":0,"explanation":"Superposisi kuantum (dicontohkan secara metaforis oleh Kucing Schrödinger) menyatakan bahwa fungsi gelombang partikel merepresentasikan kombinasi probabilitas sebelum runtuh (wave-function collapse) saat diobservasi.","hint":"Keadaan ganda sebelum observasi menyebabkan keruntuhan fungsi gelombang.","points":1000},{"id":"q_ph_3","question":"Prinsip Ketidakpastian Heisenberg membuktikan bahwa kita tidak dapat mengukur pasangan besaran fisik apa secara bersamaan dengan presisi tak terbatas?","options":["Posisi (x) dan Momentum (p)","Massa dan Volume partikel","Suhu dan Tekanan gas ideal","Muatan listrik dan Arus listrik"],"correctAnswer":0,"explanation":"Rumus Δx * Δp >= ħ/2 menunjukkan bahwa semakin presisi posisi suatu partikel diketahui, semakin besar ketidakpastian dalam menentukan momentumnya.","hint":"Lokasi keberadaan dan besaran momentum gerak.","points":1000},{"id":"q_ph_4","question":"Metode berpikir \"First-Principles Thinking\" (dipopulerkan oleh Aristoteles & Richard Feynman) mengharuskan kita untuk:","options":["Mendekonstruksi suatu masalah ke kebenaran paling mendasar yang tidak bisa diragukan lagi, lalu membangun solusi baru dari fondasi tersebut","Meniru cara kerja kompetitor yang sudah sukses tanpa melakukan modifikasi","Mencari jawaban tercepat berdasarkan opini terbanyak di media sosial","Mengasumsikan bahwa tradisi lama adalah satu-satunya kebenaran mutlak"],"correctAnswer":0,"explanation":"First Principles menolak analogi atau meniru kebiasaan. Kita membedah masalah hingga fakta ilmiah paling fundamental, kemudian merancang arsitektur solusi dari nol.","hint":"Membongkar masalah ke kebenaran paling mendasar, bukan sekadar meniru analogi.","points":1000},{"id":"q_ph_5","question":"Partikel elementer apakah yang bertindak sebagai pembawa gaya interaksi elektromagnetik di alam semesta?","options":["Foton (Photon)","Gluon","Graviton hipotetis","Higgs Boson"],"correctAnswer":0,"explanation":"Foton adalah kuantum energi cahaya dan partikel pengemban (gauge boson) untuk seluruh interaksi gaya elektromagnetik dalam Model Standar fisika partikel.","hint":"Kuantum partikel cahaya tanpa massa diam.","points":1000}]'::jsonb, 'Polymath Science Guild', 0, 1, '2026-10-04T04:36:35.369Z', '2026-10-04T04:36:35.369Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_english', 'Advanced English Fluency, Idioms & Rhetoric', 'Tingkatkan penguasaan bahasa Inggris tingkat tinggi (C1/C2): idiom diplomatik, perbedaan British vs US, dan kosakata elegan.', 'languages', 'C1/C2 English Master, Idiomatic Phrasings & Diction', '🇬🇧', '', 30, 'intermediate', '[{"id":"q_en_1","question":"What does the diplomatic idiom \"to play devil''s advocate\" truly mean?","options":["To argue against an idea simply to test the strength of the argument, not because you necessarily disagree","To promote evil and harmful deeds inside an organization","To hire an expensive legal attorney for criminal defense","To completely abandon a project before it finishes"],"correctAnswer":0,"explanation":"\"Playing devil''s advocate\" means taking an opposing viewpoint in a discussion specifically to critically examine assumptions and stress-test the validity of a proposal.","hint":"Arguing an opposing view to test and strengthen reasoning.","points":1000},{"id":"q_en_2","question":"Which of the following word pairs correctly contrasts British English vs American English for the same item?","options":["Pavement (UK) vs Sidewalk (US)","Apartment (UK) vs Flat (US)","Elevator (UK) vs Lift (US)","Trunk (UK) vs Boot (US)"],"correctAnswer":0,"explanation":"In British English, the pedestrian path beside a road is the \"pavement\", whereas in American English it is called the \"sidewalk\". Note that Flat is UK (Apartment is US), and Lift is UK (Elevator is US).","hint":"British people walk on the pavement, Americans walk on the sidewalk.","points":1000},{"id":"q_en_3","question":"What does the sophisticated adjective \"ephemeral\" describe?","options":["Lasting for a very short, fleeting time; transitory","Permanent, unyielding and indestructible through centuries","Deeply religious and strictly orthodox","Unusually heavy and difficult to carry physically"],"correctAnswer":0,"explanation":"\"Ephemeral\" means short-lived, transient, or fleeting (e.g., \"ephemeral beauty of a cherry blossom\"). Its antonym is eternal or permanent.","hint":"Something that only lasts for a brief fleeting moment.","points":1000},{"id":"q_en_4","question":"In professional negotiation, what does the idiom \"the elephant in the room\" refer to?","options":["An obvious major problem or controversial issue that people avoid discussing because it is uncomfortable","A very wealthy and influential investor who sponsors the meeting","A catastrophic computer network outage during a presentation","A physical trophy awarded to the most outstanding participant"],"correctAnswer":0,"explanation":"\"The elephant in the room\" signifies a massive, conspicuous truth or issue that everyone is aware of, yet no one wants to mention due to awkwardness.","hint":"An enormous undeniable problem that everyone avoids mentioning.","points":1000},{"id":"q_en_5","question":"Choose the grammatically immaculate sentence suitable for an executive academic paper:","options":["Neither the researchers nor the principal investigator was aware of the anomaly until the dataset was compiled.","Neither the researchers nor the principal investigator were aware of the anomaly until the dataset was compiled.","Either the data or the findings is completely invalid without further review.","The group of scientists have decided to publish their findings without peer consensus."],"correctAnswer":0,"explanation":"Under subject-verb agreement rules for \"neither... nor...\", the verb agrees with the closer subject (\"the principal investigator\" -> singular \"was\").","hint":"Look for proximity agreement with the singular closer subject \"was\".","points":1000}]'::jsonb, 'Polymath Linguistic Chair', 0, 1, '2026-10-04T04:36:35.369Z', '2026-10-04T04:36:35.369Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_stoic', 'Stoic Philosophy, Epistemology & Logical Fallacies', 'Kuasai Stoikisme Marcus Aurelius, Dichotomy of Control, dekonstruksi logical fallacies, dan berpikir jernih tanpa bias.', 'philosophy', 'Stoicism, Epistemology, Logic & Critical Thinking', '🏛️', '', 30, 'intermediate', '[{"id":"q_st_1","question":"Prinsip fundamental \"Dichotomy of Control\" yang diajarkan oleh Epictetus menyatakan bahwa:","options":["Hal-hal di dunia terbagi dua: apa yang berada dalam kendali kita (pikiran, aksi kita) dan apa yang di luar kendali kita (opini orang, takdir eksternal)","Seseorang harus mengontrol seluruh anggota keluarga dan rekan kerjanya tanpa toleransi","Pemerintah harus membagi kekuasaan menjadi monarki dan demokrasi sekaligus","Semua hal di dunia ini dapat dikontrol sepenuhnya jika memiliki cukup kekayaan"],"correctAnswer":0,"explanation":"Dichotomy of Control membedakan hal-hal yang dapat kita kendalikan (kehendak, pertimbangan nilai, tindakan kita sendiri) dan hal-hal di luar kendali kita (perilaku orang lain, cuaca, reputasi). Ketenangan batin tercapai dengan berfokus pada yang pertama.","hint":"Fokus pada apa yang ada di dalam pikiran dan tindakan kita sendiri.","points":1000},{"id":"q_st_2","question":"Logical fallacy apakah yang terjadi ketika seseorang menyerang karakter atau kepribadian lawan debat alih-alih membantah argumennya?","options":["Argumentum Ad Hominem","Straw Man Fallacy","False Dilemma / Black-or-White","Post Hoc Ergo Propter Hoc"],"correctAnswer":0,"explanation":"Ad Hominem menyerang individu (latar belakang, fisik, motif pribadi) daripada konten logika dari klaim yang disampaikannya.","hint":"Menyerang orangnya (\"Hominem\"), bukan argumen logikanya.","points":1000},{"id":"q_st_3","question":"Ungkapan Stoikisme terkenal \"Amor Fati\" yang juga diresapi oleh Friedrich Nietzsche memiliki makna:","options":["Mencintai dan merangkul takdir hidup secara utuh, baik suka maupun duka, sebagai bahan bakar pertumbuhan jiwa","Menyerah pasrah pada keadaan tanpa pernah berusaha memperbaiki diri","Membenci takdir buruk dan menyalahkan orang tua atas kemalangan hidup","Mengumpulkan sebanyak mungkin harta duniawi sebelum usia tua"],"correctAnswer":0,"explanation":"Amor Fati bukan sekadar pasrah (resignation), melainkan mencintai apapun yang terjadi (\"Love of Fate\") dan memanfaatkannya sebagai sarana mengasah kebajikan dan ketangguhan karakter.","hint":"Cinta pada takdir apa pun yang datang menghampiri.","points":1000},{"id":"q_st_4","question":"Apa perbedaan mendasar antara System 1 dan System 2 dalam teori kognitif Daniel Kahneman (Thinking, Fast and Slow)?","options":["System 1 beroperasi otomatis, cepat, intuitif, dan hemat energi; System 2 lambat, deliberatif, logis, dan menuntut konsentrasi tinggi","System 1 khusus memproses bahasa pemrograman, System 2 memproses seni lukis","System 1 berada di otak kiri, System 2 berada di otak kanan secara anatomis terpisah","System 1 hanya aktif saat tidur, System 2 aktif saat siang hari"],"correctAnswer":0,"explanation":"System 1 bekerja secara otomatis dan spontan (sering rentan bias heuristik). System 2 memerlukan usaha sadar untuk melakukan kalkulasi rumit dan penalaran kritis.","hint":"Satu cepat otomatis intuitif, satu lambat terencana analitis.","points":1000},{"id":"q_st_5","question":"Apakah yang dimaksud dengan \"Straw Man Fallacy\" dalam diskusi kritis?","options":["Mendistorsi atau melebih-lebihkan argumen lawan menjadi versi yang lemah dan konyol agar mudah diserang","Menggunakan analogi boneka jerami di persawahan untuk mengusir burung","Mengulang-ulang kebohongan hingga orang percaya sebagai kebenaran","Mengajukan pertanyaan yang jawabannya sudah diasumsikan sebelumnya"],"correctAnswer":0,"explanation":"Straw Man membuat \"orang-orangan sawah\" dari argumen lawan — versi yang dipelintir dan disederhanakan secara ekstrem — lalu menghancurkannya untuk memberi ilusi telah memenangkan debat.","hint":"Membuat versi palsu yang mudah dirobohkan dari argumen lawan.","points":1000}]'::jsonb, 'Seneca Philosophical Circle', 0, 1, '2026-10-04T04:36:35.369Z', '2026-10-04T04:36:35.369Z') ON CONFLICT DO NOTHING;
INSERT INTO "wayground_quizzes" ("id", "title", "description", "category", "topic", "icon", "cover_url", "time_limit", "difficulty", "questions_json", "author", "plays_count", "is_public", "created_at", "updated_at") VALUES ('wg_polymath', 'Cosmic Trivia & Polymath General Knowledge', 'Uji wawasan luasmu dalam sejarah peradaban, geografi dunia, keajaiban sains kosmik, dan misteri bumi.', 'trivia', 'World Trivia, History, Astronomy & Geography', '🪐', '', 25, 'medium', '[{"id":"q_po_1","question":"Planet manakah di tata surya kita yang memiliki rotasi berlawanan arah jarum jam (retrograde) dibandingkan mayoritas planet lain?","options":["Venus","Mars","Jupiter","Merkurius"],"correctAnswer":0,"explanation":"Venus berotasi dari timur ke barat (retrograde rotation). Matahari di Venus terbit di barat dan terbenam di timur, dengan periode rotasi lebih lambat daripada periode revolusinya.","hint":"Planet terpanas di tata surya yang sering disebut Bintang Kejora.","points":1000},{"id":"q_po_2","question":"Titik terdalam di seluruh samudra bumi yang terletak di Palung Mariana adalah:","options":["Challenger Deep (kedalaman ~10.994 meter)","Java Trench (Palung Jawa)","Puerto Rico Trench","Sunda Abyss"],"correctAnswer":0,"explanation":"Challenger Deep di bagian selatan Palung Mariana adalah titik paling dalam di lautan bumi dengan kedalaman hampir 11 kilometer di bawah permukaan laut.","hint":"Dinamakan berdasarkan ekspedisi kapal penjelajah HMS Challenger.","points":1000},{"id":"q_po_3","question":"Perpustakaan legendaris dunia kuno yang menjadi pusat ilmu pengetahuan terbesar di era Helenistik bernama:","options":["Perpustakaan Agung Aleksandria di Mesir","House of Wisdom (Bayt al-Hikma) di Baghdad","Perpustakaan Ashurbanipal di Niniwe","Perpustakaan Celsus di Efesus"],"correctAnswer":0,"explanation":"Perpustakaan Aleksandria didirikan di bawah dinasti Ptolemaik di Mesir pada abad ke-3 SM dan menyimpan ratusan ribu gulungan papirus dari berbagai penjuru peradaban kuno.","hint":"Dinamakan dari nama penakluk Makedonia, Aleksander Agung.","points":1000},{"id":"q_po_4","question":"Unsur kimia apakah yang paling melimpah di seluruh alam semesta teramati (observable universe)?","options":["Hidrogen (~75% massa baryonik)","Helium","Oksigen","Karbon"],"correctAnswer":0,"explanation":"Hidrogen (H) adalah unsur paling sederhana dan mencakup sekitar 75% dari seluruh materi biasa di alam semesta, dibentuk saat masa Big Bang Nucleosynthesis.","hint":"Unsur nomor atom 1 pada tabel periodik.","points":1000},{"id":"q_po_5","question":"Siapakah matematikawan jenius asal India yang secara intuitif menemukan ribuan rumus deret tak hingga dan fungsi partisi tanpa pendidikan formal?","options":["Srinivasa Ramanujan","Aryabhata","Brahmagupta","Satyendra Nath Bose"],"correctAnswer":0,"explanation":"Srinivasa Ramanujan (1887–1920) menghasilkan kontribusi revolusioner pada analisis matematika, teori bilangan, deret tak terhingga, dan pecahan berlanjut bersama G.H. Hardy di Cambridge.","hint":"Tokoh di balik film biopik \"The Man Who Knew Infinity\".","points":1000}]'::jsonb, 'Polaris Cosmography', 0, 1, '2026-10-04T04:36:35.369Z', '2026-10-04T04:36:35.369Z') ON CONFLICT DO NOTHING;

COMMIT;
