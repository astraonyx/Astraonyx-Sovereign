// commands/security.js — Toggle antispam/antivirtex/antidelete + banned/unbanned.
// Sama seperti moderation.js: ini cuma ngatur setting, eksekusi ada di
// lib/moderationEngine.js.

const { updateGroup, getGroup } = require('../lib/groupSettings');
const { updateChatSettings, getChatSettings } = require('../lib/privateChatSettings');
const { resolveParticipantNumber, isGroupJid, getCachedGroupMetadata, toJid } = require('../lib/helpers');
const { success, warning, usage, bullet } = require('../lib/messageStyle');
const { getCommandOverrides } = require('../lib/commandOverridesHelper');

function parseOnOff(arg) {
  const lower = arg?.toLowerCase();
  if (lower === 'on') return true;
  if (lower === 'off') return false;
  return null;
}

async function handleSecurityCommand({ sock, chatJid, command, args, msg, reply }) {
  switch (command) {
    case 'antispam': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/antispam on', 'Atau `/antispam off`.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.antispam.enabled = onOff; });
      await reply(success(onOff ? 'Antispam Aktif' : 'Antispam Nonaktif', `🚫 Antispam ${onOff ? 'diaktifkan' : 'dimatikan'}.`));
      return;
    }

    case 'antivirtex': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/antivirtex on', 'Atau `/antivirtex off`.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.antivirtex.enabled = onOff; });
      await reply(success(onOff ? 'Antivirtex Aktif' : 'Antivirtex Nonaktif', `💣 Antivirtex ${onOff ? 'diaktifkan' : 'dimatikan'}.`));
      return;
    }

    case 'antidelete': {
      const sub = (args[0] || '').toLowerCase().trim();

      // Cek nama grup asal (LID-safe / metadata)
      let groupSubject = 'Chat Pribadi';
      if (isGroupJid(chatJid)) {
        try {
          const meta = await getCachedGroupMetadata(sock, chatJid);
          if (meta?.subject) groupSubject = meta.subject;
        } catch (_) {
          const g = getGroup(chatJid);
          if (g?.name || g?.subject) groupSubject = g.name || g.subject;
        }
      }

      // Ambil override output routing untuk command antidelete
      const commandOverrides = getCommandOverrides();
      const routing = commandOverrides['antidelete']?.outputRouting || { mode: 'inplace' };
      const isRedirected = routing && routing.mode && routing.mode !== 'inplace';

      let routeName = 'di chat ini (Inplace)';
      if (routing.mode === 'self') routeName = 'Nomor Sendiri (Owner)';
      else if (routing.mode === 'friend') routeName = `Nomor Teman (${routing.destination || ''})`;
      else if (routing.mode === 'group') {
        const dest = String(routing.destination || 'vault').toLowerCase();
        if (dest === 'vault') routeName = 'Polaris • Output & Artifact Vault';
        else routeName = `Grup/GC (${routing.destination})`;
      }

      // 1. Cek Status Anti-Delete (/antidelete status / cek / tanpa argumen)
      if (!sub || sub === 'status' || sub === 'cek' || sub === 'info') {
        const isCurrentOn = isGroupJid(chatJid)
          ? Boolean(getGroup(chatJid)?.antidelete)
          : Boolean(getChatSettings(chatJid)?.antidelete);

        await reply(
          `🛡️ *STATUS FITUR ANTI-DELETE*\n` +
          `──────────────────────────────\n` +
          `🏢 *Lokasi:* ${groupSubject}\n` +
          `🆔 *Chat JID:* ${chatJid}\n` +
          `⚙️ *Status Anti-Delete:* ${isCurrentOn ? '✅ AKTIF (ON)' : '❌ NONAKTIF (OFF)'}\n` +
          `🎯 *Tujuan Laporan Repost:* ${routeName}\n` +
          `🛡️ *Anti-Virtex Shield:* 🟢 Siaga (Mencegah WhatsApp crash dari virtex)\n` +
          `──────────────────────────────\n` +
          `_Ketik \`/antidelete on\` untuk mengaktifkan atau \`/antidelete off\` untuk menonaktifkan._`
        );
        return;
      }

      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/antidelete on', 'Atau `/antidelete off`, atau `/antidelete status`.'));
        return;
      }

      // Simpan setting ke groupSettings atau privateChatSettings
      if (isGroupJid(chatJid)) {
        updateGroup(chatJid, (g) => { g.antidelete = onOff; });
      } else {
        updateChatSettings(chatJid, (c) => { c.antidelete = onOff; });
      }

      // Ambil nomor pengirim perintah
      const rawParticipant = msg.key.participant || msg.key.remoteJid;
      const senderNumber = isGroupJid(chatJid)
        ? await resolveParticipantNumber(sock, chatJid, rawParticipant)
        : (rawParticipant ? rawParticipant.split('@')[0].split(':')[0] : 'Admin');

      if (isRedirected) {
        // Notifikasi mendalam dikirim ke chat target output routing (misal Polaris Vault / Nomor Teman)
        const detailedNotice =
          `🛡️ *PENGATURAN ANTI-DELETE DIPERBARUI*\n` +
          `──────────────────────────────\n` +
          `🏢 *Grup Asal:* ${groupSubject}\n` +
          `🆔 *Group JID:* ${chatJid}\n` +
          `👤 *Diubah Oleh:* @${senderNumber || 'User'}\n` +
          `⚙️ *Status Baru:* ${onOff ? '✅ AKTIF (ON)' : '❌ NONAKTIF (OFF)'}\n` +
          `🎯 *Tujuan Laporan Repost:* ${routeName}\n` +
          `🛡️ *Anti-Virtex Shield:* 🟢 Aktif (Otomatis menetralkan virtex/crash text)\n` +
          `──────────────────────────────\n` +
          `📌 _${onOff ? `Mulai sekarang, seluruh pesan/media yang dihapus di grup *${groupSubject}* akan otomatis dilaporkan dan di-repost ke sini.` : `Fitur anti-delete untuk grup *${groupSubject}* telah dimatikan.`}_`;

        await reply(detailedNotice, { mentions: senderNumber ? [toJid(senderNumber)] : [] });

        // Kirim konfirmasi singkat di grup asal tempat command diketik
        try {
          await sock.sendMessage(chatJid, {
            text: `_🛡️ Anti-Delete grup *${groupSubject}* ${onOff ? 'diaktifkan' : 'dimatikan'}. Seluruh laporan pesan terhapus dialihkan ke ${routeName}._`
          });
        } catch (_) {}
      } else {
        await reply(success(
          onOff ? 'Antidelete Aktif' : 'Antidelete Nonaktif',
          `👁️ Antidelete grup *${groupSubject}* ${onOff ? 'diaktifkan' : 'dimatikan'}.`,
          onOff ? 'Pesan yang dihapus akan di-repost otomatis di grup ini.' : null
        ));
      }
      return;
    }

    case 'banned': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) {
        await reply(usage('/banned @user', 'Tag orang yang mau diblokir dari pakai command bot.'));
        return;
      }
      const number = await resolveParticipantNumber(sock, chatJid, mentioned);
      if (!number) {
        await reply(warning('Gagal Ambil Nomor', 'Tidak bisa ambil nomor user yang di-tag. Coba lagi.'));
        return;
      }
      updateGroup(chatJid, (g) => {
        if (!g.bannedUsers.includes(number)) g.bannedUsers.push(number);
      });
      await reply(success('User Diblokir', `🚫 ${number} diblokir dari pakai command bot di grup ini.`));
      return;
    }

    case 'unbanned': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) {
        await reply(usage('/unbanned @user'));
        return;
      }
      const number = await resolveParticipantNumber(sock, chatJid, mentioned);
      if (!number) {
        await reply(warning('Gagal Ambil Nomor', 'Tidak bisa ambil nomor user yang di-tag. Coba lagi.'));
        return;
      }
      updateGroup(chatJid, (g) => {
        g.bannedUsers = g.bannedUsers.filter((n) => n !== number);
      });
      await reply(success('Blokir Dicabut', `${number} tidak lagi diblokir dari command bot.`));
      return;
    }

    case 'listban': {
      const group = getGroup(chatJid);
      const banned = group?.bannedUsers || [];
      if (banned.length === 0) {
        await reply(warning('Belum Ada Banned', 'Tidak ada user yang di-banned di grup ini.'));
        return;
      }
      const list = banned.map((n) => bullet(n)).join('\n');
      await reply(success(`User Di-banned (${banned.length})`, list));
      return;
    }

    default:
      return;
  }
}

module.exports = { handleSecurityCommand };
