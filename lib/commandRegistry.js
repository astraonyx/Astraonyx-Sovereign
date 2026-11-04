// lib/commandRegistry.js — Daftar pusat semua command bot.
// Setiap nambah command baru, cukup tambah 1 entry di sini.
// .menu otomatis generate dari daftar ini, jadi selalu up to date.

const COMMANDS = [
  // Umum
  { name: 'ping', category: 'Umum', desc: 'Cek bot masih hidup', ownerOnly: false },
  { name: 'interping', category: 'Umum', desc: 'Uji kualitas & kecepatan internet server (Download & Upload Mbps, Ping)', ownerOnly: false },
  { name: 'status', category: 'Umum', desc: 'Menampilkan status level hak akses pengguna dan info bot', ownerOnly: false },
  { name: 'info', category: 'Umum', desc: 'Menampilkan arsitektur resmi pilar ekosistem Astraonyx Ataraxia & telemetri host server', ownerOnly: false },
  { name: 'menu', category: 'Umum', desc: 'Tampilkan daftar menu utama bot', ownerOnly: false },
  { name: 'allmenu', category: 'Umum', desc: 'Tampilkan seluruh 100+ daftar perintah bot terorganisir', ownerOnly: false },
  { name: 'help', category: 'Umum', desc: 'Panduan bantuan & daftar perintah bot', ownerOnly: false },

  // Owner - Whitelist & Grup
  { name: 'allowgroup', category: 'Owner', desc: 'Izinkan bot dipakai di grup ini', ownerOnly: true },
  { name: 'disallowgroup', category: 'Owner', desc: 'Cabut izin bot di grup ini', ownerOnly: true },
  { name: 'adduser', category: 'Owner', desc: 'Tambah nomor ke whitelist (`/adduser 628xxx`)', ownerOnly: true },
  { name: 'deluser', category: 'Owner', desc: 'Hapus nomor dari whitelist (`/deluser 628xxx`)', ownerOnly: true },
  { name: 'listuser', category: 'Owner', desc: 'Lihat daftar nomor whitelist', ownerOnly: true },
  { name: 'setlevel', category: 'Owner', desc: 'Ubah level whitelist (`/setlevel 628xxx level1/level2`)', ownerOnly: true },
  { name: 'setowner', category: 'Owner', desc: 'Tambah owner baru (khusus owner utama, `/setowner 628xxx`)', ownerOnly: true },
  { name: 'unsetowner', category: 'Owner', desc: 'Cabut status owner (khusus owner utama, `/unsetowner 628xxx`)', ownerOnly: true },
  { name: 'opencvc', category: 'Owner', desc: 'Buka & kirim ulang media viewOnce ke chat langsung (reply pesan viewOnce)', ownerOnly: true },
  { name: 'opencoc', category: 'Owner', desc: 'Buka ViewOnce & kirim ke vault privat bot (trigger prefix `|` atau `/opencoc`)', ownerOnly: true },
  { name: 'cleartmp', category: 'Owner', desc: 'Hapus file sementara (`/cleartmp` semua, `/cleartmp media`, atau `/cleartmp downloader`)', ownerOnly: true },
  { name: 'tmpstatus', category: 'Owner', desc: 'Cek jumlah & ukuran file sementara di tmp/media dan tmp/downloader', ownerOnly: true },
  { name: 'upsw', category: 'Owner', desc: 'Unggah Status WhatsApp teks atau media (`/upsw <teks>` atau reply foto/video dengan `/upsw [caption]`)', ownerOnly: true },
  { name: 'delsw', category: 'Owner', desc: 'Hapus Status WhatsApp aktif dari status@broadcast (`/delsw` atau reply pesan copy status dengan `/delsw`)', ownerOnly: true },
  { name: 'bot', category: 'Owner', desc: 'Kontrol status operasional bot: hentikan bot (`/bot stop`) atau aktifkan kembali (`/bot start`)', ownerOnly: true },
  { name: 'createtoken', category: 'Owner', desc: 'Buat token naik tingkat akun Polaris (`/createtoken <tier> [maxUses] [catatan]`)', ownerOnly: true },

  // Admin Grup
  { name: 'kick', category: 'Admin Grup', desc: 'Keluarkan member (`/kick @user`)', ownerOnly: false },
  { name: 'add', category: 'Admin Grup', desc: 'Tambah member (`/add 628xxx`)', ownerOnly: false },
  { name: 'promote', category: 'Admin Grup', desc: 'Jadikan admin (`/promote @user`)', ownerOnly: false },
  { name: 'demote', category: 'Admin Grup', desc: 'Cabut status admin (`/demote @user`)', ownerOnly: false },
  { name: 'groupname', category: 'Admin Grup', desc: 'Ganti nama grup', ownerOnly: false },
  { name: 'groupdesc', category: 'Admin Grup', desc: 'Ganti deskripsi grup', ownerOnly: false },
  { name: 'grouppic', category: 'Admin Grup', desc: 'Ganti foto grup (reply gambar)', ownerOnly: false },
  { name: 'link', category: 'Admin Grup', desc: 'Ambil invite link grup', ownerOnly: false },
  { name: 'revoke', category: 'Admin Grup', desc: 'Reset invite link grup', ownerOnly: false },
  { name: 'groupinfo', category: 'Admin Grup', desc: 'Info detail grup', ownerOnly: false },
  { name: 'leave', category: 'Admin Grup', desc: 'Bot keluar dari grup', ownerOnly: false },

  // Kunci/Mode Grup
  { name: 'close', category: 'Kunci Grup', desc: 'Kunci grup, hanya admin bisa chat', ownerOnly: false },
  { name: 'open', category: 'Kunci Grup', desc: 'Buka grup untuk semua member', ownerOnly: false },
  { name: 'mute', category: 'Kunci Grup', desc: 'Bisukan grup sementara (`/mute <menit>`)', ownerOnly: false },
  { name: 'restrict', category: 'Kunci Grup', desc: 'Kunci edit info grup (`/restrict on/off`)', ownerOnly: false },
  { name: 'announce', category: 'Kunci Grup', desc: 'Ubah setelan kirim pesan grup khusus admin (`/announce on/off`)', ownerOnly: false },

  // Delete (owner + level1 saja, dicek terpisah di index.js)
  { name: 'delchat', category: 'Admin Grup', desc: 'Hapus pesan (reply 1 pesan, atau `/delchat <jumlah> [@user]`)', ownerOnly: false },

  // Auto-Moderasi
  { name: 'antilink', category: 'Moderasi', desc: 'Hapus pesan berisi link (`/antilink on/off` atau `/antilink domain1,domain2` whitelist)', ownerOnly: false },
  { name: 'antibad', category: 'Moderasi', desc: 'Filter kata kasar (`/antibad on/off` atau `/antibad kata1,kata2` tambah wordlist)', ownerOnly: false },
  { name: 'listwordlist', category: 'Moderasi', desc: 'Lihat daftar kata terlarang antibad', ownerOnly: false },
  { name: 'delwordlist', category: 'Moderasi', desc: 'Hapus 1 kata dari wordlist antibad (`/delwordlist <kata>`)', ownerOnly: false },

  // Utility Grup + Member Lanjutan (Fase 6)
  { name: 'hidetag', category: 'Utility Grup', desc: 'Tag semua member tanpa list nama (`/hidetag <pesan>`)', ownerOnly: false },
  { name: 'groupsetting', category: 'Utility Grup', desc: 'Lihat semua setting moderasi yang aktif di grup ini', ownerOnly: false },
  { name: 'getpp', category: 'Utility Grup', desc: 'Ambil foto profil orang (`/getpp @user` atau reply)', ownerOnly: false },
  { name: 'afk', category: 'Utility Grup', desc: 'Set status AFK, auto nonaktif saat kirim pesan lagi (`/afk <alasan>`)', ownerOnly: false },
  { name: 'listadmin', category: 'Member', desc: 'Tampilkan semua admin grup', ownerOnly: false },
  { name: 'listmember', category: 'Member', desc: 'Tampilkan semua member grup', ownerOnly: false },
  { name: 'warn', category: 'Member', desc: 'Beri warning ke member, auto-kick di limit (`/warn @user`)', ownerOnly: false },
  { name: 'resetwarn', category: 'Member', desc: 'Reset warning seseorang ke 0 (`/resetwarn @user`)', ownerOnly: false },
  { name: 'setwarnlimit', category: 'Member', desc: 'Ubah limit warning sebelum auto-kick (`/setwarnlimit <angka>`)', ownerOnly: false },

  // Fun/Media (Fase 8)
  { name: 'sticker', category: 'Fun/Media', desc: 'Ubah gambar/video jadi stiker (`/sticker`, reply media, opsi: circle/full)', ownerOnly: false },
  { name: 'toimg', category: 'Fun/Media', desc: 'Ubah stiker jadi gambar/video (`/toimg`, reply stiker)', ownerOnly: false },
  { name: 'tourl', category: 'Fun/Media', desc: 'Upload media dan dapat link (`/tourl`, reply media)', ownerOnly: false },

  // Downloader (Fase 10)
  { name: 'dwnld', category: 'Downloader', desc: 'Unduh media multi-platform otomatis 3-Lapis (`/dwnld <link>`) — Scraper Utama ➔ Mori Backup ➔ High-Res Cloud', ownerOnly: false },
  { name: 'download', category: 'Downloader', desc: 'Unduh media apa saja otomatis deteksi platform (`/download <link>` atau `/dl <link>`) — TikTok, IG, YT, FB, X, Spotify, Pinterest, MediaFire, GDrive, Terabox, Course, Magnet/Torrent', ownerOnly: false },
  { name: 'dl', category: 'Downloader', desc: 'Alias cepat /download (`/dl <link>`)', ownerOnly: false },
  { name: 'mdf', category: 'Downloader', desc: 'Download dari MediaFire (`/mdf <link file>` langsung download, atau `/mdf <link folder>` lihat daftar file lalu `/mdf <link folder> <nomor>` atau `/mdf <link folder> 1,3,5` untuk download banyak file sekaligus jadi ZIP)', ownerOnly: false },
  { name: 'tiktok', category: 'Downloader', desc: 'Download video TikTok tanpa watermark (`/tiktok <link>`)', ownerOnly: false },
  { name: 'tiktokslide', category: 'Downloader', desc: 'Download slide/carousel foto TikTok (`/tiktokslide <link>`, sama seperti /tiktok, otomatis deteksi mode)', ownerOnly: false },
  { name: 'ytmp3', category: 'Downloader', desc: 'Download audio YouTube (`/ytmp3 <link>`)', ownerOnly: false },
  { name: 'ytmp4', category: 'Downloader', desc: 'Download video YouTube (`/ytmp4 <link>`)', ownerOnly: false },
  { name: 'ig', category: 'Downloader', desc: 'Download foto/video/reels Instagram (`/ig <link>`)', ownerOnly: false },
  { name: 'facebook', category: 'Downloader', desc: 'Download video Facebook (`/facebook <link>`)', ownerOnly: false },
  { name: 'spotify', category: 'Downloader', desc: 'Download lagu Spotify (`/spotify <link>`)', ownerOnly: false },
  { name: 'pinterest', category: 'Downloader', desc: 'Download gambar/video dari 1 pin Pinterest (`/pinterest <link>`)', ownerOnly: false },
  { name: 'terabox', category: 'Downloader', desc: 'Download file dari Terabox (`/terabox <link>`)', ownerOnly: false },
  { name: 'gdrive', category: 'Downloader', desc: 'Download file publik dari Google Drive (`/gdrive <link>`, file harus di-share "Anyone with the link")', ownerOnly: false },
  { name: 'twitter', category: 'Downloader', desc: 'Download video/gambar dari Twitter/X (`/twitter <link tweet>`)', ownerOnly: false },
  { name: 'removebg', category: 'Downloader', desc: 'Hapus background gambar (`/removebg`, reply gambar)', ownerOnly: false },

  // Text Tools & Web (Fase 9)
  { name: 'translate', category: 'Text Tools', desc: 'Terjemahkan teks (`/translate <bahasa tujuan> <teks>`, bisa nama bahasa atau kode ISO)', ownerOnly: false },
  { name: 'tts', category: 'Text Tools', desc: 'Ubah teks/reply jadi pesan suara PTT (`/tts [bahasa] <teks>`, contoh: `/tts halo` atau `/tts en good morning`)', ownerOnly: false },
  { name: 'readmore', category: 'Text Tools', desc: 'Pesan gaya "Baca Selengkapnya" (`/readmore <teks keliatan>|<teks tersembunyi>`)', ownerOnly: false },
  { name: 'viewwebb', category: 'Web & Browser', desc: 'Buka dan jelajahi website langsung di dalam WhatsApp tanpa membuka Chrome (`/viewwebb <link>`)', ownerOnly: false },
  { name: 'editoutput', category: 'Output & Pesan', desc: 'Edit output pesan bot secara langsung (in-place) atau kirim ke nomor teman / grup (`/editoutput [to=...] <teks baru>`)', ownerOnly: false },
  { name: 'editmsg', category: 'Output & Pesan', desc: 'Alias dari /editoutput untuk edit pesan bot langsung di tempat atau forward', ownerOnly: false },

  // Komunitas & Gamifikasi
  { name: 'redeem', category: 'Gamifikasi', desc: 'Tebus token naik tingkat akun Polaris (`/redeem <kode-token>`)', ownerOnly: false },
  { name: 'playrank', category: 'Gamifikasi', desc: 'Aktifkan/matikan sistem XP & level obrolan di grup (`/playrank on/off/status/reset`, admin/owner)', ownerOnly: false },
  { name: 'rank', category: 'Gamifikasi', desc: 'Lihat kartu profil XP, level, rank tier, dan progres kamu atau teman (`/rank [@user]`)', ownerOnly: false },
  { name: 'tierlist', category: 'Gamifikasi', desc: 'Lihat tabel struktur 7 Rank Tier dan perolehan EXP berskala seimbang (`/tierlist` atau `/rank tier`)', ownerOnly: false },
  { name: 'topchat', category: 'Gamifikasi', desc: 'Lihat Top 10 obrolan teraktif dan papan peringkat member di grup (`/topchat`)', ownerOnly: false },
  { name: 'truth', category: 'Fun Games', desc: 'Pertanyaan jujur acak yang bikin salting atau membuka rahasia seru (`/truth`)', ownerOnly: false },
  { name: 'dare', category: 'Fun Games', desc: 'Tantangan gokil & berani untuk tongkrongan grup WhatsApp (`/dare`)', ownerOnly: false },
  { name: 'tebakkata', category: 'Fun Games', desc: 'Game tebak kata logika berhadiah +50 XP untuk penjawab tercepat (`/tebakkata`)', ownerOnly: false },
  { name: 'susunkata', category: 'Fun Games', desc: 'Susun huruf acak menjadi kata baku berhadiah Dual EXP & Koin (`/susunkata`)', ownerOnly: false },
  { name: 'caklontong', category: 'Fun Games', desc: 'Tebak-tebakan lucu & menjebak ala Cak Lontong berhadiah +50 XP (`/caklontong`)', ownerOnly: false },
  { name: 'tebaktebakan', category: 'Fun Games', desc: 'Tebak-tebakan humor romantis & cerdas berhadiah +50 XP (`/tebaktebakan`)', ownerOnly: false },
  { name: 'spin', category: 'Fun Games', desc: 'Wheel of Fortune / Gacha Hoki mempertaruhkan XP (1x per 5 jam, ada ZONK & JACKPOT) (`/spin` atau `/roll`)', ownerOnly: false },
  { name: 'roll', category: 'Fun Games', desc: 'Lempar dadu keberuntungan untuk perolehan angka hoki (`/roll`)', ownerOnly: false },
  { name: 'duel', category: 'Gamifikasi', desc: 'Tantang teman di grup beradu Suit (Batu-Gunting-Kertas) taruhan XP (`/duel @user [taruhan]`, anti-cheat & anti-push)', ownerOnly: false },
  { name: 'suit', category: 'Gamifikasi', desc: 'Kunci pilihan suit rahasia kamu dalam duel (`/suit batu/gunting/kertas`, auto-delete di grup atau via PM bot)', ownerOnly: false },
  { name: 'mining', category: 'RPG Economy', desc: 'Menambang batu, besi, emas, berlian berhadiah Dual EXP & hasil tambang (`/mining`)', ownerOnly: false },
  { name: 'mancing', category: 'RPG Economy', desc: 'Memancing ikan, udang, kepiting, lobster berhadiah Dual EXP (`/mancing`)', ownerOnly: false },
  { name: 'hunt', category: 'RPG Economy', desc: 'Berburu hewan liar di hutan berhadiah Dual EXP & daging buruan (`/hunt`)', ownerOnly: false },
  { name: 'daily', category: 'RPG Economy', desc: 'Klaim gaji harian Rp 10.000 + 100 EXP grup setiap 24 jam (`/daily`)', ownerOnly: false },
  { name: 'inventory', category: 'RPG Economy', desc: 'Cek isi tas ransel, mineral tambang, hasil pancingan & buruan (`/inventory` atau `/inv`)', ownerOnly: false },
  { name: 'dompet', category: 'RPG Economy', desc: 'Periksa saldo uang tunai di dompet dan rekening bank (`/dompet`)', ownerOnly: false },
  { name: 'deposit', category: 'RPG Economy', desc: 'Simpan uang tunai dompet ke rekening bank aman dari rampok (`/deposit <jumlah>`)', ownerOnly: false },
  { name: 'tarik', category: 'RPG Economy', desc: 'Tarik simpanan uang dari bank ke dompet tunai (`/tarik <jumlah>`)', ownerOnly: false },
  { name: 'jual', category: 'RPG Economy', desc: 'Jual seluruh komoditas hasil tambang & tangkapan ikan ke pasar (`/jual` atau `/sellall`)', ownerOnly: false },
  { name: 'leaderboard', category: 'RPG Economy', desc: 'Papan peringkat top level & kekayaan koin pemain tertinggi (`/leaderboard` atau `/lb`)', ownerOnly: false },
  { name: 'slot', category: 'RPG Economy', desc: 'Mesin putar slot kasino mini taruhan koin (`/slot <taruhan>`)', ownerOnly: false },
  { name: 'menfess', category: 'Anonymous', desc: 'Kirim pesan rahasia tanpa nama ke nomor WhatsApp tujuan (`/menfess <nomor> <pesan>`)', ownerOnly: false },
  { name: 'anon', category: 'Anonymous', desc: 'Masuk antrean obrolan rahasia 1-on-1 dengan orang asing (`/anon` atau `/start`)', ownerOnly: false },
  { name: 'next', category: 'Anonymous', desc: 'Tinggalkan partner anonim dan cari teman ngobrol baru (`/next`)', ownerOnly: false },
  { name: 'stop', category: 'Anonymous', desc: 'Hentikan obrolan rahasia anonim (`/stop`)', ownerOnly: false },
  { name: 'raid', category: 'Gamifikasi', desc: 'Co-Op Boss Raid: Kalahkan Boss Neural 5.000 HP bersama grup lewat teka-teki logika estafet & raih titel langka (`/raid`, `/raid start/status/titles/equip`)', ownerOnly: false },
  { name: 'boss', category: 'Gamifikasi', desc: 'Alias dari /raid untuk memanggil atau memeriksa pertempuran Boss Raid grup (`/boss`)', ownerOnly: false },
  { name: 'timecapsule', category: 'Romance & Vault', desc: 'Kunci pesan rahasia & kenangan dalam kapsul waktu digital, auto-unlock tepat waktu (`/timecapsule @user [waktu] [pesan]`)', ownerOnly: false },
  { name: 'listcapsule', category: 'Romance & Vault', desc: 'Lihat daftar kapsul waktu yang sedang kamu kunci (`/listcapsule`)', ownerOnly: false },
  { name: 'delcapsule', category: 'Romance & Vault', desc: 'Batalkan dan hapus kapsul waktu milikmu (`/delcapsule <id>`)', ownerOnly: false },
  { name: 'deeptalk', category: 'Romance & Vault', desc: 'Kartu refleksi & pertanyaan mendalam untuk obrolan intim & bermakna (`/deeptalk [1/2/3/wildcard]`)', ownerOnly: false },

  // Reminder (auto-peringatan harian per grup)
  { name: 'setreminder', category: 'Reminder', desc: 'Set/ubah jadwal reminder harian grup (`/setreminder <jam:menit> <pesan>`, contoh: `/setreminder 19:00 Checklist harian!`)', ownerOnly: false },
  { name: 'reminder', category: 'Reminder', desc: 'Cek status atau matikan reminder (`/reminder status`, `/reminder off`)', ownerOnly: false },

  // AI Chat (Fase 11)
  { name: 'ai', category: 'AI Chat', desc: 'Tanya ke AI (`/ai <pertanyaan>`, Gemini + fallback Groq, ingat riwayat percakapan)', ownerOnly: false },
  { name: 'aiforget', category: 'AI Chat', desc: 'Hapus riwayat percakapan AI kamu (`/aiforget`)', ownerOnly: false },
  // Hermes Autonomous AI Agent (Fase 12)
  { name: 'hermes', category: 'Autonomous AI', desc: 'Jalankan Hermes Autonomous AI Agent dengan multi-step reasoning & tools (`/hermes <pertanyaan/tugas>`)', ownerOnly: false },
  { name: 'hermes-agent', category: 'Autonomous AI', desc: 'Tugaskan Hermes Agent untuk menyelesaikan misi otonom step-by-step (`/hermes-agent <misi>`)', ownerOnly: false },
  { name: 'hermesclear', category: 'Autonomous AI', desc: 'Reset memori sesi percakapan Hermes kamu (`/hermesclear`)', ownerOnly: false },
  { name: 'hermesstatus', category: 'Autonomous AI', desc: 'Cek status model, reasoning engine, dan ketersediaan tools Hermes (`/hermesstatus`)', ownerOnly: false },


  { name: 'antibot', category: 'Moderasi', desc: 'Toggle antibot (belum ada aksi otomatis, deteksi bot belum reliable)', ownerOnly: false },
  { name: 'antifake', category: 'Moderasi', desc: 'Blokir nomor asing (`/antifake on/off` atau `/antifake 1,44` blocklist kode negara)', ownerOnly: false },
  { name: 'welcome', category: 'Moderasi', desc: 'Pesan otomatis member baru (`/welcome on/off`)', ownerOnly: false },
  { name: 'setwelcome', category: 'Moderasi', desc: 'Custom teks welcome (`/setwelcome <teks>`, bisa pakai @user @group)', ownerOnly: false },
  { name: 'notify', category: 'Moderasi', desc: 'Notif member keluar (`/notify on/off`)', ownerOnly: false },

  // Security/Anti-Spam
  { name: 'antispam', category: 'Security', desc: 'Blokir spam pesan beruntun (`/antispam on/off`)', ownerOnly: false },
  { name: 'antivirtex', category: 'Security', desc: 'Blokir pesan virtex/spam text (`/antivirtex on/off`)', ownerOnly: false },
  { name: 'antidelete', category: 'Security', desc: 'Re-post pesan+media yang dihapus pengirim, bisa dipakai di grup maupun chat pribadi (`/antidelete on/off`)', ownerOnly: false },
  { name: 'banned', category: 'Security', desc: 'Blokir user dari command bot di grup ini (`/banned @user`)', ownerOnly: false },
  { name: 'unbanned', category: 'Security', desc: 'Cabut blokir user (`/unbanned @user`)', ownerOnly: false },

  // Dokumen & PDF Toolkit (AllTools)
  { name: 'topdf', category: 'Dokumen & PDF', desc: 'Konversi foto atau gabung banyak foto jadi 1 dokumen PDF rapi (`/topdf`, `/topdf start`, `/topdf selesai`)', ownerOnly: false },
  { name: 'img2pdf', category: 'Dokumen & PDF', desc: 'Alias /topdf (konversi gambar ke PDF)', ownerOnly: false },
  { name: 'compresspdf', category: 'Dokumen & PDF', desc: 'Kecilkan ukuran file dokumen PDF (reply file PDF)', ownerOnly: false },
  { name: 'text2pdf', category: 'Dokumen & PDF', desc: 'Ubah teks catatan/tugas menjadi file PDF formal (`/text2pdf <judul> | <isi>`)', ownerOnly: false },

  // Tugas & Reminder Cerdas
  { name: 'addtask', category: 'Tugas & Reminder', desc: 'Catat tugas baru dengan batas waktu deadline otomatis (`/addtask <nama> <deadline>`)', ownerOnly: false },
  { name: 'addtugas', category: 'Tugas & Reminder', desc: 'Alias /addtask (catat tugas & deadline otomatis)', ownerOnly: false },
  { name: 'listtask', category: 'Tugas & Reminder', desc: 'Lihat seluruh daftar tugas aktif, countdown sisa waktu, dan tugas lewat deadline (`/listtask` atau `/tasks`)', ownerOnly: false },
  { name: 'listtugas', category: 'Tugas & Reminder', desc: 'Alias /listtask (lihat daftar tugas aktif)', ownerOnly: false },
  { name: 'tasks', category: 'Tugas & Reminder', desc: 'Alias /listtask (daftar tugas)', ownerOnly: false },
  { name: 'task', category: 'Tugas & Reminder', desc: 'Alias /listtask (daftar tugas)', ownerOnly: false },
  { name: 'tugas', category: 'Tugas & Reminder', desc: 'Alias /listtask (daftar tugas)', ownerOnly: false },
  { name: 'deltask', category: 'Tugas & Reminder', desc: 'Hapus tugas dengan mencatat alasan delete (`/deltask <nama> <alasan>`)', ownerOnly: false },
  { name: 'deltugas', category: 'Tugas & Reminder', desc: 'Alias /deltask (hapus tugas)', ownerOnly: false },
  { name: 'deletetask', category: 'Tugas & Reminder', desc: 'Alias /deltask (hapus tugas)', ownerOnly: false },
  { name: 'edittask', category: 'Tugas & Reminder', desc: 'Ubah nama & deadline tugas (`/edittask <nama lama> | <baru> | <deadline>`)', ownerOnly: false },
  { name: 'addtimetask', category: 'Tugas & Reminder', desc: 'Perpanjang deadline tugas yang sudah ada di list (`/addtimetask <nama> <deadline baru>`)', ownerOnly: false },
  { name: 'setremind', category: 'Tugas & Reminder', desc: 'Atur jam rekap pengingat tugas harian otomatis (`/setremind <HH:mm>`)', ownerOnly: false },

  // Polaris Ekosistem 5 Grup & Komunitas
  { name: 'listeco', category: 'Ekosistem', desc: 'Buka dashboard status 5 ruang operasional ekosistem & komunitas resmi Polaris (`/listeco`)', ownerOnly: true },
  { name: 'synceco', category: 'Ekosistem', desc: 'Audit, tie-breaker umur, auto-healing digital tag & sinkronisasi seluruh ruang ekosistem (`/synceco`)', ownerOnly: true },
  { name: 'inteco', category: 'Ekosistem', desc: 'Undang / kirim link seluruh 5 ruang ekosistem & komunitas ke obrolan Owner (`/inteco`)', ownerOnly: true },
  { name: 'bindeco', category: 'Ekosistem', desc: 'Kunci & ikat grup ke salah satu dari 5 kategori ekosistem (`/bindeco <kategori>`)', ownerOnly: true },

  // Modul Belajar & Polymath Genius
  { name: 'belajar', category: 'Akademi Belajar', desc: 'Panduan belajar multi-disiplin interaktif tanpa prefix di ruang Polaris Academy (`/belajar`)', ownerOnly: false },
  { name: 'jadwal', category: 'Akademi Belajar', desc: 'Lihat silabus & jadwal fokus kurikulum polymath mingguan (`/jadwal`)', ownerOnly: false },
  { name: 'materi', category: 'Akademi Belajar', desc: 'Daftar materi kuliah & keahlian polymath genius (`/materi`)', ownerOnly: false },
  { name: 'kuis', category: 'Akademi Belajar', desc: 'Minta studi kasus & kuis latihan polymath (`/kuis`)', ownerOnly: false },
];

function registerDeniaCommands(deniaPluginList) {
  if (!Array.isArray(deniaPluginList)) return;
  const existingNames = new Set(COMMANDS.map((c) => c.name.toLowerCase()));
  for (const p of deniaPluginList) {
    const rawCat = p.category || 'Tools';
    let cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
    if (cat.toLowerCase() === 'download' || cat.toLowerCase() === 'downloader') {
      cat = 'Downloader';
    }
    const cmds = p.commands || [];
    for (const cmd of cmds) {
      if (!cmd || typeof cmd !== 'string') continue;
      const lower = cmd.toLowerCase();
      if (!existingNames.has(lower)) {
        existingNames.add(lower);
        COMMANDS.push({
          name: lower,
          category: cat,
          desc: `Fitur /${lower} (${cat}) dari Denia Plugin`,
          ownerOnly: false,
        });
      }
    }
  }
}

module.exports = { COMMANDS, registerDeniaCommands };

