// commands/raid.js — Command Handler: /raid, /boss, /attack (Co-Op Group Boss Raid & Rare Titles)
const bossRaidEngine = require('../lib/bossRaidEngine');
const { isOwner, canUseAdminCommands } = require('../lib/accessControl');
const { getCachedGroupMetadata, toJid } = require('../lib/helpers');
const { box, warning, success, info, denied, usage } = require('../lib/messageStyle');

async function isCallerAdminOrOwner(sock, chatJid, senderNumber, msg) {
  if (isOwner(senderNumber) || canUseAdminCommands(senderNumber)) return true;
  try {
    const meta = await getCachedGroupMetadata(sock, chatJid);
    const senderJid = msg.key.participant || `${senderNumber}@s.whatsapp.net`;
    const p = meta.participants.find(
      (item) => item.id === senderJid || item.id === toJid(senderNumber) || item.phoneNumber === senderNumber
    );
    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch (_) {
    return false;
  }
}

async function handleRaidCommand({ sock, chatJid, msg, command, args, reply, senderNumber, isGroup }) {
  if (!isGroup) {
    await reply(warning('Khusus Grup', '⚔️ Co-Op Boss Raid hanya dapat dimainkan di dalam grup obrolan WhatsApp bersama member lainnya.'));
    return;
  }

  const senderJid = msg.key.participant || msg.key.remoteJidAlt || `${senderNumber}@s.whatsapp.net`;
  const pushName = msg.pushName || `Member_${senderNumber.slice(-4)}`;
  const sub = (args[0] || '').toLowerCase().trim();

  // 1. /attack <jawaban>
  if (command === 'attack') {
    const answer = args.join(' ').trim();
    if (!answer) {
      await reply(usage('Format Serangan Salah', 'Ketik */attack [jawaban]* atau langsung ketik jawabannya di chat!'));
      return;
    }
    await bossRaidEngine.executeAttack({
      sock,
      chatJid,
      userJid: senderJid,
      senderNumber,
      pushName,
      answerText: answer,
      msg,
    });
    return;
  }

  // 2. /raid attack <jawaban>
  if (sub === 'attack' || sub === 'serang') {
    const answer = args.slice(1).join(' ').trim();
    if (!answer) {
      await reply(usage('Format Serangan Salah', 'Ketik */raid attack [jawaban]* atau langsung ketik jawabannya di chat!'));
      return;
    }
    await bossRaidEngine.executeAttack({
      sock,
      chatJid,
      userJid: senderJid,
      senderNumber,
      pushName,
      answerText: answer,
      msg,
    });
    return;
  }

  // 3. /raid start / /raid spawn / /boss start
  if (sub === 'start' || sub === 'spawn' || sub === 'mulai' || sub === 'summon') {
    const res = await bossRaidEngine.startRaid(sock, chatJid);
    if (!res.success) {
      await reply(warning('Boss Raid', res.message));
    }
    return;
  }

  // 4. /raid status
  if (sub === 'status' || sub === 'hp' || sub === 'cek') {
    const status = bossRaidEngine.getRaidStatus(chatJid);
    await reply(status.text);
    return;
  }

  // 5. /raid stop (Admin/Owner only)
  if (sub === 'stop' || sub === 'batal' || sub === 'cancel') {
    const isAdmin = await isCallerAdminOrOwner(sock, chatJid, senderNumber, msg);
    if (!isAdmin) {
      await reply(denied('Akses Ditolak', 'Hanya Admin Grup atau Owner yang dapat menghentikan sesi Boss Raid.'));
      return;
    }
    const res = bossRaidEngine.stopRaid(chatJid);
    if (res.success) {
      await reply(success('Raid Dibatalkan', res.message));
    } else {
      await reply(warning('Perhatian', res.message));
    }
    return;
  }

  // 6. /raid titles / /raid titel / /raid title
  if (sub === 'titles' || sub === 'titel' || sub === 'title' || sub === 'koleksi') {
    const titleData = bossRaidEngine.getUserTitlesCard(senderJid, senderNumber);
    await reply(titleData.text);
    return;
  }

  // 7. /raid equip <nomor/id>
  if (sub === 'equip' || sub === 'pasang' || sub === 'pakai') {
    const targetId = args[1];
    if (!targetId) {
      await reply(usage('Format Pasang Salah', 'Ketik */raid equip [nomor]* (contoh: */raid equip 1*).\nKetik */raid titles* untuk melihat daftar nomor titelmu!'));
      return;
    }
    const res = bossRaidEngine.equipUserTitle(senderJid, targetId);
    if (res.success) {
      await reply(success('Titel Dipasang', res.message));
    } else {
      await reply(warning('Gagal Memasang', res.message));
    }
    return;
  }

  // 8. Default: Jika ada raid aktif, tampilkan status. Jika tidak, tampilkan petunjuk & menu raid
  const currentRaid = bossRaidEngine.getRaidStatus(chatJid);
  if (currentRaid.active) {
    await reply(currentRaid.text);
    return;
  }

  const helpCard =
    `╔════════════════════════════════════╗\n` +
    `  ⚔️ *[ CO-OP GROUP BOSS RAID ]* 👾\n` +
    `╚════════════════════════════════════╝\n\n` +
    `Kumpulkan seluruh anggota grup dan kalahkan Anomali Neural AI berdaya 5.000 HP bersama-sama!\n\n` +
    `📌 *Fitur & Cara Bermain:*\n` +
    `• Jawab teka-teki logika siber & dekripsi emoji matrix yang diberikan Boss.\n` +
    `• Serangan estafet berantai antar-member memicu *COMBO MULTIPLIER (hingga x2.0 DMG)*!\n` +
    `• Mode Phase 3 Singularity Meltdown melipatgandakan serangan x1.5 saat HP Boss kritis!\n` +
    `• Raih titel profil langka (*The Void Slayer*, *Quantum Overclock*, *Cyber Vanguard*, *Neural Decoder*) yang terpampang di kartu */rank* dan Web Dashboard!\n\n` +
    `⏰ *Jadwal Otomatis:* Boss otomatis spawn setiap hari pada jam *20:00 WIB (8 Malam)*!\n\n` +
    `🎮 *Daftar Command:*\n` +
    `• */raid start* : Panggil Boss Raid baru sekarang\n` +
    `• */raid status* : Cek sisa HP, sisa waktu & top damage\n` +
    `• */raid titles* : Lihat koleksi titel profil langka kamu\n` +
    `• */raid equip [nomor]* : Pasang titel ke kartu profil\n` +
    `• */raid stop* : Batalkan sesi raid (Khusus Admin)`;

  await reply(helpCard);
}

module.exports = { handleRaidCommand };
