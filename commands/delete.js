// commands/delete.js — .delchat: delete for everyone (single & bulk)
// Akses: owner + level1 saja (dicek di index.js sebelum handler ini dipanggil)

const { getLastBotMessages, getLastMessagesFromUser } = require('../lib/messageCache');
const { isBotAdmin, normalizeNumber, jidToNumber } = require('../lib/helpers');
const { success, warning, usage } = require('../lib/messageStyle');

async function handleDeleteCommand({ sock, chatJid, msg, args, reply }) {
  try {
    // Mode 1: reply ke 1 pesan spesifik -> hapus pesan itu
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (quoted?.stanzaId && args.length === 0) {
      // Cocokkan participant pesan yang di-reply dengan nomor bot sendiri.
      // Pakai normalizeNumber+jidToNumber (bukan string compare mentah) karena
      // participant bisa berformat @lid ATAU @s.whatsapp.net tergantung skema
      // yang dipakai WhatsApp saat itu (lihat catatan bug LID di PROGRESS.md).
      const quotedNumber = normalizeNumber(jidToNumber(quoted.participant));
      const botNumber = normalizeNumber(jidToNumber(sock.user.id));
      const isBotMessage = quotedNumber === botNumber;

      // Hapus pesan orang lain butuh bot admin. Hapus pesan bot sendiri selalu boleh.
      if (!isBotMessage) {
        let botAdmin = false;
        try {
          botAdmin = await isBotAdmin(sock, chatJid);
        } catch (err) {
          console.error('[delete] Gagal cek status admin bot:', err.message);
        }
        if (!botAdmin) {
          await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup untuk hapus pesan orang lain.'));
          return;
        }
      }

      const targetKey = {
        remoteJid: chatJid,
        fromMe: isBotMessage,
        id: quoted.stanzaId,
        participant: quoted.participant,
      };
      try {
        await sock.sendMessage(chatJid, { delete: targetKey });
        // Jika pesan yang di-reply adalah status WhatsApp, hapus juga dari status@broadcast
        try {
          const storyManager = require('../lib/storyManager');
          const instId = process.env.INSTANCE_ID || 'primary';
          const relatedStory = storyManager.findStoryByMessageId(quoted.stanzaId, instId);
          if (relatedStory && relatedStory.status === 'active') {
            await storyManager.deleteStoryOnWhatsApp(sock, relatedStory, instId);
          }
        } catch (_) {}
        await reply(success('Pesan Dihapus', '🗑️ Pesan berhasil dihapus.'));
      } catch (err) {
        console.error('[delete] Gagal hapus pesan reply:', err.message);
        await reply(warning('Gagal Hapus', 'Kemungkinan pesan sudah lama atau bukan dari grup ini.'));
      }
      return;
    }

    // Mode 2 & 3: bulk delete, butuh angka jumlah pesan
    const count = parseInt(args[0], 10);
    if (!count || count <= 0) {
      await reply(usage(
        '/delchat <jumlah>',
        'Atau reply 1 pesan lalu `/delchat` untuk hapus pesan itu.\n`/delchat <jumlah> @user` untuk hapus N pesan terakhir dari user (grup, bot harus admin).'
      ));
      return;
    }
    if (count > 50) {
      await reply(warning('Terlalu Banyak', 'Maksimal 50 pesan sekali hapus, biar tidak kena rate limit WhatsApp.'));
      return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    let keys;
    if (mentioned) {
      // Mode 3: hapus pesan orang lain butuh bot jadi admin grup
      let botAdmin = false;
      try {
        botAdmin = await isBotAdmin(sock, chatJid);
      } catch (err) {
        console.error('[delete] Gagal cek status admin bot:', err.message);
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup untuk hapus pesan orang lain.'));
        return;
      }
      keys = getLastMessagesFromUser(chatJid, mentioned, count);
      if (keys.length === 0) {
        await reply(warning('Tidak Ada Pesan', 'Tidak ada pesan dari user itu yang tercache (bot baru bisa hapus pesan yang masuk selama bot nyala).'));
        return;
      }
    } else {
      // Mode 2: hapus N pesan bot sendiri
      keys = getLastBotMessages(chatJid, count);
      if (keys.length === 0) {
        await reply(warning('Tidak Ada Pesan', 'Tidak ada pesan bot yang tercache di chat ini.'));
        return;
      }
    }

    let deletedCount = 0;
    let failedCount = 0;
    for (const key of keys) {
      try {
        await sock.sendMessage(chatJid, { delete: key });
        deletedCount++;
      } catch (err) {
        failedCount++;
      }
      // Jeda kecil antar delete, biar tidak terlalu "robotic" / kena rate limit
      await new Promise((r) => setTimeout(r, 300));
    }

    await reply(success('Selesai Hapus', `🗑️ ${deletedCount} pesan terhapus${failedCount > 0 ? `, ${failedCount} gagal` : ''}.`));
  } catch (err) {
    console.error('[delete] Error umum:', err.message);
    await reply(warning('Gagal Memproses', 'Terjadi kesalahan saat menghapus pesan.'));
  }
}

module.exports = { handleDeleteCommand };
