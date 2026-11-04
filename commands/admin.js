const { normalizeNumber, toJid, jidToNumber, isBotAdmin } = require('../lib/helpers');
const { isOwner } = require('../lib/accessControl');
const { success, error, warning, denied, usage, info: infoBox } = require('../lib/messageStyle');

// Ambil semua target JID dari mention (bisa banyak) atau reply (cuma 1)
function getTargetJids(msg) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) return mentioned;
  const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quotedParticipant) return [quotedParticipant];
  return [];
}

// Filter target: buang bot sendiri dan owner, biar nggak kena kick/demote nggak sengaja
function filterProtectedTargets(sock, targets) {
  const botNumber = normalizeNumber(jidToNumber(sock.user.id));
  const safe = [];
  const blocked = [];
  for (const jid of targets) {
    const number = normalizeNumber(jidToNumber(jid));
    if (number === botNumber || isOwner(number)) {
      blocked.push(jid);
    } else {
      safe.push(jid);
    }
  }
  return { safe, blocked };
}

async function handleAdminCommand({ sock, chatJid, msg, command, args, reply }) {
  let botAdmin;
  try {
    botAdmin = await isBotAdmin(sock, chatJid);
  } catch (err) {
    console.error('[admin] Gagal cek status admin bot:', err.message);
    await reply(warning('Gagal Cek Status', 'Tidak bisa cek status admin bot di grup ini. Coba lagi.'));
    return;
  }

  switch (command) {
    case 'kick': {
      const targets = getTargetJids(msg);
      if (targets.length === 0) {
        await reply(usage('/kick @user1 @user2 ...', 'Atau reply pesan orang yang mau dikeluarkan.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk kick member.'));
        return;
      }
      const { safe, blocked } = filterProtectedTargets(sock, targets);
      if (safe.length === 0) {
        await reply(denied('Target Dilindungi', 'Target tidak bisa dikeluarkan (bot/owner dilindungi).'));
        return;
      }
      try {
        await sock.groupParticipantsUpdate(chatJid, safe, 'remove');
        const footer = blocked.length > 0 ? `⛔ ${blocked.length} target dilewati (bot/owner).` : null;
        await reply(success('Member Dikeluarkan', `${safe.length} member berhasil dikeluarkan dari grup.`, footer));
      } catch (err) {
        console.error('[admin] kick gagal:', err.message);
        await reply(warning('Gagal Kick', 'Kemungkinan izin WhatsApp menolak aksi ini.'));
      }
      return;
    }

    case 'add': {
      if (args.length === 0) {
        await reply(usage('/add 628xxxxxxxxxx 628yyyyyyyyyy ...'));
        return;
      }
      const normalizedNumbers = [];
      const invalid = [];
      for (const raw of args) {
        const n = normalizeNumber(raw);
        if (n) normalizedNumbers.push(n);
        else invalid.push(raw);
      }
      if (normalizedNumbers.length === 0) {
        await reply(warning('Nomor Tidak Valid', 'Semua nomor tidak valid. Pastikan format nomor benar.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk menambah member.'));
        return;
      }
      try {
        const jids = normalizedNumbers.map(toJid);
        await sock.groupParticipantsUpdate(chatJid, jids, 'add');
        const footer = invalid.length > 0 ? `⚠️ ${invalid.length} nomor tidak valid dilewati: ${invalid.join(', ')}` : null;
        await reply(success('Member Ditambahkan', `${normalizedNumbers.length} nomor berhasil diproses.`, footer));
      } catch (err) {
        console.error('[admin] add gagal:', err.message);
        await reply(warning('Gagal Menambah Member', 'Kemungkinan nomor tidak terdaftar WhatsApp atau privasinya membatasi invite langsung.'));
      }
      return;
    }

    case 'promote': {
      const targets = getTargetJids(msg);
      if (targets.length === 0) {
        await reply(usage('/promote @user1 @user2 ...', 'Atau reply pesan orang yang mau dijadikan admin.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk promote member.'));
        return;
      }
      try {
        await sock.groupParticipantsUpdate(chatJid, targets, 'promote');
        await reply(success('Member Dipromosikan', `${targets.length} member berhasil dijadikan admin.`));
      } catch (err) {
        console.error('[admin] promote gagal:', err.message);
        await reply(warning('Gagal Promote', 'Terjadi kesalahan saat promote member.'));
      }
      return;
    }

    case 'demote': {
      const targets = getTargetJids(msg);
      if (targets.length === 0) {
        await reply(usage('/demote @user1 @user2 ...', 'Atau reply pesan admin yang mau dicabut statusnya.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk demote member.'));
        return;
      }
      const { safe, blocked } = filterProtectedTargets(sock, targets);
      if (safe.length === 0) {
        await reply(denied('Target Dilindungi', 'Target tidak bisa didemote (bot/owner dilindungi).'));
        return;
      }
      try {
        await sock.groupParticipantsUpdate(chatJid, safe, 'demote');
        const footer = blocked.length > 0 ? `⛔ ${blocked.length} target dilewati (bot/owner).` : null;
        await reply(success('Status Admin Dicabut', `${safe.length} member dicabut status adminnya.`, footer));
      } catch (err) {
        console.error('[admin] demote gagal:', err.message);
        await reply(warning('Gagal Demote', 'Terjadi kesalahan saat demote member.'));
      }
      return;
    }

    case 'groupname': {
      const newName = args.join(' ');
      if (!newName) {
        await reply(usage('/groupname <nama baru>'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk ganti nama grup.'));
        return;
      }
      try {
        await sock.groupUpdateSubject(chatJid, newName);
        await reply(success('Nama Grup Diubah', `Nama grup sekarang: *${newName}*`));
      } catch (err) {
        console.error('[admin] groupname gagal:', err.message);
        await reply(warning('Gagal Ubah Nama', 'Terjadi kesalahan saat mengubah nama grup.'));
      }
      return;
    }

    case 'groupdesc': {
      const newDesc = args.join(' ');
      if (!newDesc) {
        await reply(usage('/groupdesc <teks deskripsi>'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk ganti deskripsi grup.'));
        return;
      }
      try {
        await sock.groupUpdateDescription(chatJid, newDesc);
        await reply(success('Deskripsi Grup Diubah', 'Deskripsi grup berhasil diperbarui.'));
      } catch (err) {
        console.error('[admin] groupdesc gagal:', err.message);
        await reply(warning('Gagal Ubah Deskripsi', 'Terjadi kesalahan saat mengubah deskripsi grup.'));
      }
      return;
    }

    case 'grouppic': {
      const quotedImage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!quotedImage) {
        await reply(usage('/grouppic', 'Reply gambar dengan caption `/grouppic`.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk ganti foto grup.'));
        return;
      }
      await reply(infoBox('Segera Hadir', 'Fitur ganti foto grup akan aktif penuh setelah modul media selesai.'));
      return;
    }

    case 'link': {
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk ambil invite link.'));
        return;
      }
      try {
        const code = await sock.groupInviteCode(chatJid);
        await reply(infoBox('Invite Link Grup', `https://chat.whatsapp.com/${code}`));
      } catch (err) {
        console.error('[admin] link gagal:', err.message);
        await reply(warning('Gagal Ambil Link', 'Terjadi kesalahan saat mengambil invite link.'));
      }
      return;
    }

    case 'revoke': {
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk reset invite link.'));
        return;
      }
      try {
        const newCode = await sock.groupRevokeInvite(chatJid);
        await reply(success('Invite Link Direset', `https://chat.whatsapp.com/${newCode}`));
      } catch (err) {
        console.error('[admin] revoke gagal:', err.message);
        await reply(warning('Gagal Reset Link', 'Terjadi kesalahan saat mereset invite link.'));
      }
      return;
    }

    case 'groupinfo': {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const adminCount = metadata.participants.filter(
          (p) => p.admin === 'admin' || p.admin === 'superadmin'
        ).length;
        const body =
          `Nama: ${metadata.subject}\n` +
          `ID: ${metadata.id}\n` +
          `Total member: ${metadata.participants.length}\n` +
          `Total admin: ${adminCount}\n` +
          `Bot admin: ${botAdmin ? 'Ya' : 'Tidak'}\n` +
          `Deskripsi: ${metadata.desc || '(tidak ada)'}`;
        await reply(infoBox('Info Grup', body));
      } catch (err) {
        console.error('[admin] groupinfo gagal:', err.message);
        await reply(warning('Gagal Ambil Info', 'Terjadi kesalahan saat mengambil info grup.'));
      }
      return;
    }

    case 'leave': {
      try {
        const botEcosystemGroups = require('../lib/botEcosystemGroups');
        if (botEcosystemGroups.isEcosystemGroup(chatJid)) {
          await reply(denied('Grup Ekosistem Inti', 'Bot tidak diizinkan keluar dari grup ekosistem resmi Polaris.'));
          return;
        }
        await reply(infoBox('Sampai Jumpa', 'Bot keluar dari grup ini.'));
        await sock.groupLeave(chatJid);
      } catch (err) {
        console.error('[admin] leave gagal:', err.message);
        await reply(warning('Gagal Keluar', 'Terjadi kesalahan saat keluar dari grup.'));
      }
      return;
    }

    default:
      return;
  }
}

module.exports = { handleAdminCommand };
