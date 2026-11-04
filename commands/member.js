// commands/member.js — .listadmin, .listmember, .warn, .resetwarn

const { addWarn, resetWarn, getWarnCount } = require('../lib/warnSystem');
const { isBotAdmin, resolveParticipantNumber, normalizeNumber, jidToNumber, toJid } = require('../lib/helpers');
const { updateGroup, getGroup } = require('../lib/groupSettings');
const { success, warning, usage, box, LINE } = require('../lib/messageStyle');

async function handleMemberCommand({ sock, chatJid, msg, command, args, reply }) {
  switch (command) {
    case 'listadmin': {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const admins = metadata.participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin');
        if (admins.length === 0) {
          await reply(warning('Tidak Ada Admin', 'Tidak ada admin terdeteksi di grup ini.'));
          return;
        }
        // WhatsApp butuh JID mention berupa nomor asli (<nomor>@s.whatsapp.net),
        // BUKAN id mentah peserta yang sekarang sering berformat @lid (ID acak
        // internal Baileys) -- kirim @lid di mentions[] membuat WA gagal
        // me-link mention itu ke kontak nomor yang benar (lihat catatan bug
        // LID di lib/helpers.js). phoneNumber diprioritaskan karena field itu
        // yang berisi nomor asli.
        const numbers = admins.map((a) => normalizeNumber(jidToNumber(a.phoneNumber || a.id))).filter(Boolean);
        const mentionJids = numbers.map(toJid);
        const body = admins.map((a, i) => `${i + 1}. @${numbers[i] || '?'}${a.admin === 'superadmin' ? ' (owner grup)' : ''}`).join('\n');
        const text = box({ emoji: '👮', title: `Admin Grup (${admins.length})`, body });
        await sock.sendMessage(chatJid, { text, mentions: mentionJids });
      } catch (err) {
        console.error('[listadmin] Gagal:', err.message);
        await reply(warning('Gagal Ambil Data', 'Tidak bisa ambil daftar admin.'));
      }
      return;
    }

    case 'listmember': {
      try {
        const metadata = await sock.groupMetadata(chatJid);
        const members = metadata.participants;
        const numbers = members.map((m) => normalizeNumber(jidToNumber(m.phoneNumber || m.id))).filter(Boolean);
        const mentionJids = numbers.map(toJid);
        const body = members.map((m, i) => `${i + 1}. @${numbers[i] || '?'}${m.admin ? ' 👮' : ''}`).join('\n');
        const text = box({ emoji: '👥', title: `Member Grup (${members.length})`, body });
        await sock.sendMessage(chatJid, { text, mentions: mentionJids });
      } catch (err) {
        console.error('[listmember] Gagal:', err.message);
        await reply(warning('Gagal Ambil Data', 'Tidak bisa ambil daftar member.'));
      }
      return;
    }

    case 'warn': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) {
        await reply(usage('/warn @user'));
        return;
      }
      const number = await resolveParticipantNumber(sock, chatJid, mentioned);
      if (!number) {
        await reply(warning('Gagal Ambil Nomor', 'Tidak bisa ambil nomor user yang di-tag.'));
        return;
      }
      // mentions[] butuh JID nomor asli (dibangun ulang dari number yang
      // sudah di-resolve LID-safe), BUKAN mentionedJid mentah -- mentioned
      // tetap dipakai apa adanya untuk groupParticipantsUpdate (kick) di
      // bawah karena itu butuh identifier peserta asli, bukan format tampilan.
      const mentionForDisplay = toJid(number);

      const { count, limit, shouldKick } = addWarn(chatJid, number);

      if (shouldKick) {
        let botAdmin = false;
        try {
          botAdmin = await isBotAdmin(sock, chatJid);
        } catch (err) {
          console.error('[warn] Gagal cek bot admin:', err.message);
        }
        if (botAdmin) {
          try {
            await sock.groupParticipantsUpdate(chatJid, [mentioned], 'remove');
            await sock.sendMessage(chatJid, {
              text: box({ emoji: '👢', title: 'Auto-kick', body: `@${number} dikeluarkan otomatis (melebihi limit warning ${limit}x).` }),
              mentions: [mentionForDisplay],
            });
          } catch (err) {
            console.error('[warn] Gagal auto-kick:', err.message);
            await sock.sendMessage(chatJid, {
              text: box({ emoji: '⚠️', title: 'Gagal Auto-kick', body: `@${number} sudah kena limit warning (${count}/${limit}), tapi gagal auto-kick.` }),
              mentions: [mentionForDisplay],
            });
          }
        } else {
          await sock.sendMessage(chatJid, {
            text: box({ emoji: '⚠️', title: 'Limit Warning Tercapai', body: `@${number} sudah kena limit warning (${count}/${limit}), tapi bot bukan admin jadi tidak bisa auto-kick.` }),
            mentions: [mentionForDisplay],
          });
        }
      } else {
        await sock.sendMessage(chatJid, {
          text: box({ emoji: '⚠️', title: 'Warning Diberikan', body: `@${number} diberi warning.\nWarning: ${count}/${limit}.` }),
          mentions: [mentionForDisplay],
        });
      }
      return;
    }

    case 'resetwarn': {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      if (!mentioned) {
        await reply(usage('/resetwarn @user'));
        return;
      }
      const number = await resolveParticipantNumber(sock, chatJid, mentioned);
      if (!number) {
        await reply(warning('Gagal Ambil Nomor', 'Tidak bisa ambil nomor user yang di-tag.'));
        return;
      }
      resetWarn(chatJid, number);
      await sock.sendMessage(chatJid, {
        text: box({ emoji: '✅', title: 'Warning Direset', body: `@${number} sudah direset ke 0.` }),
        mentions: [toJid(number)],
      });
      return;
    }

    case 'setwarnlimit': {
      const limit = parseInt(args[0], 10);
      if (!limit || limit <= 0) {
        const current = getGroup(chatJid)?.warnLimit || 10;
        await reply(usage('/setwarnlimit <angka>', `Limit saat ini: ${current}x`));
        return;
      }
      updateGroup(chatJid, (g) => { g.warnLimit = limit; });
      await reply(success('Limit Warning Diset', `Grup ini sekarang limit ${limit}x sebelum auto-kick.`));
      return;
    }

    default:
      return;
  }
}

module.exports = { handleMemberCommand };
