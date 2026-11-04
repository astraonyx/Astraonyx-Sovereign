const { isBotAdmin } = require('../lib/helpers');
const { success, warning, usage } = require('../lib/messageStyle');

// Timer mute disimpan di memory saja -> hilang kalau bot restart/crash.
// Persistence proper (nyimpen ke file) menyusul di Fase 12 (auto-cleanup/database).
const muteTimers = {};

async function handleGroupLockCommand({ sock, chatJid, command, args, reply }) {
  let botAdmin;
  try {
    botAdmin = await isBotAdmin(sock, chatJid);
  } catch (err) {
    console.error('[group-lock] Gagal cek status admin bot:', err.message);
    await reply(warning('Gagal Cek Status', 'Tidak bisa cek status admin bot di grup ini. Coba lagi.'));
    return;
  }

  switch (command) {
    case 'close':
    case 'announce': {
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk mengunci grup.'));
        return;
      }
      try {
        await sock.groupSettingUpdate(chatJid, 'announcement');
        await reply(success('Grup Dikunci', '🔒 Hanya admin yang bisa chat sekarang.'));
      } catch (err) {
        console.error('[group-lock] close gagal:', err.message);
        await reply(warning('Gagal Mengunci', 'Terjadi kesalahan saat mengunci grup.'));
      }
      return;
    }

    case 'open': {
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk membuka grup.'));
        return;
      }
      try {
        await sock.groupSettingUpdate(chatJid, 'not_announcement');
        if (muteTimers[chatJid]) {
          clearTimeout(muteTimers[chatJid]);
          delete muteTimers[chatJid];
        }
        await reply(success('Grup Dibuka', '🔓 Semua member bisa chat sekarang.'));
      } catch (err) {
        console.error('[group-lock] open gagal:', err.message);
        await reply(warning('Gagal Membuka', 'Terjadi kesalahan saat membuka grup.'));
      }
      return;
    }

    case 'mute': {
      const minutes = parseInt(args[0], 10);
      if (!minutes || minutes <= 0) {
        await reply(usage('/mute <menit>', 'Contoh: `/mute 10`'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk mute grup.'));
        return;
      }
      try {
        await sock.groupSettingUpdate(chatJid, 'announcement');
        await reply(success(
          'Grup Dibisukan',
          `🔇 Grup dibisukan selama ${minutes} menit.`,
          '⚠️ Timer ini hilang kalau bot restart, grup akan tetap terkunci sampai di-`/open` manual.'
        ));

        if (muteTimers[chatJid]) clearTimeout(muteTimers[chatJid]);

        muteTimers[chatJid] = setTimeout(async () => {
          try {
            await sock.groupSettingUpdate(chatJid, 'not_announcement');
            await sock.sendMessage(chatJid, { text: success('Mute Berakhir', '🔊 Waktu mute habis, grup dibuka kembali.') });
          } catch (err) {
            console.error('[group-lock] Gagal auto-unmute:', err.message);
          }
          delete muteTimers[chatJid];
        }, minutes * 60 * 1000);
      } catch (err) {
        console.error('[group-lock] mute gagal:', err.message);
        await reply(warning('Gagal Mute', 'Terjadi kesalahan saat mute grup.'));
      }
      return;
    }

    case 'restrict': {
      const mode = args[0]?.toLowerCase();
      if (mode !== 'on' && mode !== 'off') {
        await reply(usage('/restrict on', 'Atau `/restrict off`.'));
        return;
      }
      if (!botAdmin) {
        await reply(warning('Bot Bukan Admin', 'Bot harus jadi admin grup dulu untuk mengatur restrict.'));
        return;
      }
      try {
        await sock.groupSettingUpdate(chatJid, mode === 'on' ? 'locked' : 'unlocked');
        await reply(success(
          mode === 'on' ? 'Edit Info Dikunci' : 'Edit Info Dibuka',
          mode === 'on' ? '🔒 Hanya admin yang bisa ubah info grup.' : '🔓 Semua member bisa ubah info grup.'
        ));
      } catch (err) {
        console.error('[group-lock] restrict gagal:', err.message);
        await reply(warning('Gagal Mengatur', 'Terjadi kesalahan saat mengatur restrict grup.'));
      }
      return;
    }

    default:
      return;
  }
}

module.exports = { handleGroupLockCommand };
