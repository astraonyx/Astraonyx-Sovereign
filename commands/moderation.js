// commands/moderation.js — Toggle command untuk fitur auto-moderasi.
// Command ini cuma NGATUR setting (on/off, isi wordlist/teks). Eksekusi
// aktualnya (cek pesan masuk, hapus, warn) ada di lib/moderationEngine.js
// yang dipanggil dari index.js tiap ada pesan masuk.

const { updateGroup, getGroup } = require('../lib/groupSettings');
const { success, warning, usage, bullet } = require('../lib/messageStyle');

function parseOnOff(arg) {
  const lower = arg?.toLowerCase();
  if (lower === 'on') return true;
  if (lower === 'off') return false;
  return null;
}

async function handleModerationCommand({ chatJid, command, args, reply }) {
  switch (command) {
    case 'antilink': {
      const firstArg = args[0];
      const onOff = parseOnOff(firstArg);

      if (onOff !== null) {
        updateGroup(chatJid, (g) => { g.antilink.enabled = onOff; });
        await reply(success(onOff ? 'Antilink Aktif' : 'Antilink Nonaktif', `🔗 Antilink ${onOff ? 'diaktifkan' : 'dimatikan'} di grup ini.`));
        return;
      }

      if (!firstArg) {
        await reply(usage('/antilink on', 'Atau `/antilink off`, atau `/antilink domain1.com,domain2.com` untuk whitelist domain.'));
        return;
      }
      const domains = args.join(' ').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
      updateGroup(chatJid, (g) => { g.antilink.whitelistDomains = domains; });
      await reply(success('Whitelist Domain Diset', `🔗 ${domains.join(', ')}`));
      return;
    }

    case 'antibad': {
      const firstArg = args[0];
      const onOff = parseOnOff(firstArg);

      if (onOff !== null) {
        updateGroup(chatJid, (g) => { g.antibad.enabled = onOff; });
        await reply(success(onOff ? 'Antibad Aktif' : 'Antibad Nonaktif', `🤬 Antibad ${onOff ? 'diaktifkan' : 'dimatikan'} di grup ini.`));
        return;
      }

      if (!firstArg) {
        await reply(usage('/antibad on', 'Atau `/antibad off`, atau `/antibad kata1,kata2` untuk tambah wordlist.'));
        return;
      }
      const words = args.join(' ').split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
      updateGroup(chatJid, (g) => {
        const set = new Set([...(g.antibad.wordlist || []), ...words]);
        g.antibad.wordlist = Array.from(set);
      });
      await reply(success('Wordlist Ditambah', `🤬 ${words.join(', ')}`));
      return;
    }

    case 'listwordlist': {
      const group = getGroup(chatJid);
      const wordlist = group?.antibad?.wordlist || [];
      if (wordlist.length === 0) {
        await reply(warning('Wordlist Kosong', 'Belum ada kata di wordlist antibad.\nTambah lewat `/antibad kata1,kata2`'));
        return;
      }
      const status = group?.antibad?.enabled ? '🟢 aktif' : '🔴 nonaktif';
      const list = wordlist.map((w) => bullet(w)).join('\n');
      await reply(success(`Wordlist Antibad (${status})`, list));
      return;
    }

    case 'delwordlist': {
      const raw = args.join(' ').trim().toLowerCase();
      if (!raw) {
        await reply(usage('/delwordlist <kata>', 'Cek daftar lewat `/listwordlist`.'));
        return;
      }
      const group = getGroup(chatJid);
      const exists = group?.antibad?.wordlist?.includes(raw);
      if (!exists) {
        await reply(warning('Kata Tidak Ditemukan', `"${raw}" tidak ada di wordlist.`));
        return;
      }
      updateGroup(chatJid, (g) => {
        g.antibad.wordlist = g.antibad.wordlist.filter((w) => w !== raw);
      });
      await reply(success('Kata Dihapus', `🗑️ "${raw}" dihapus dari wordlist antibad.`));
      return;
    }

    case 'antibot': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/antibot on', 'Atau `/antibot off`.\n⚠️ Belum ada mekanisme deteksi bot yang reliable, toggle ini belum melakukan aksi apapun.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.antibot = onOff; });
      await reply(success(
        onOff ? 'Antibot Aktif' : 'Antibot Nonaktif',
        `🤖 Antibot ${onOff ? 'diaktifkan' : 'dimatikan'}.`,
        '⚠️ Belum ada mekanisme deteksi bot yang reliable dari sisi WhatsApp, jadi belum ada aksi otomatis.'
      ));
      return;
    }

    case 'antifake': {
      const firstArg = args[0];
      const onOff = parseOnOff(firstArg);

      if (onOff !== null) {
        updateGroup(chatJid, (g) => { g.antifake.enabled = onOff; });
        await reply(success(onOff ? 'Antifake Aktif' : 'Antifake Nonaktif', `📵 Antifake ${onOff ? 'diaktifkan' : 'dimatikan'} di grup ini.`));
        return;
      }

      if (!firstArg) {
        await reply(usage('/antifake on', 'Atau `/antifake off`, atau `/antifake 1,44` untuk blokir kode negara (contoh: 1=US/Kanada, 44=UK).'));
        return;
      }
      const prefixes = args.join(' ').split(',').map((p) => p.trim().replace(/\D/g, '')).filter(Boolean);
      updateGroup(chatJid, (g) => { g.antifake.blockedPrefixes = prefixes; });
      await reply(success('Blocklist Diset', `📵 ${prefixes.map((p) => `+${p}`).join(', ')}`));
      return;
    }

    case 'welcome': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/welcome on', 'Atau `/welcome off`.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.welcome.enabled = onOff; });
      await reply(success(onOff ? 'Welcome Aktif' : 'Welcome Nonaktif', `👋 Welcome message ${onOff ? 'diaktifkan' : 'dimatikan'}.`));
      return;
    }

    case 'setwelcome': {
      const text = args.join(' ');
      if (!text) {
        await reply(usage('/setwelcome <teks>', 'Bisa pakai `@user` dan `@group` sebagai placeholder.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.welcome.text = text; });
      await reply(success('Teks Welcome Diset', '👋 Pesan welcome berhasil diperbarui.'));
      return;
    }

    case 'notify': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/notify on', 'Atau `/notify off`.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.notify = onOff; });
      await reply(success(onOff ? 'Notif Keluar Aktif' : 'Notif Keluar Nonaktif', `👋 Notif member keluar ${onOff ? 'diaktifkan' : 'dimatikan'}.`));
      return;
    }

    case 'antiwame': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/antiwame on', 'Atau `/antiwame off` untuk memfilter link wa.me di grup ini.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.antiwame = onOff; });
      await reply(success(onOff ? 'Antiwa.me Aktif' : 'Antiwa.me Nonaktif', `🛡️ Filter link wa.me ${onOff ? 'diaktifkan' : 'dimatikan'} di grup ini.`));
      return;
    }

    case 'autostickergc':
    case 'autosticker': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/autostickergc on', 'Atau `/autostickergc off` untuk auto konversi gambar ke stiker.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.autostickergc = onOff; });
      await reply(success(onOff ? 'Auto Sticker Aktif' : 'Auto Sticker Nonaktif', `🎨 Auto konversi stiker grup ${onOff ? 'diaktifkan' : 'dimatikan'}.`));
      return;
    }

    case 'autosimi': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/autosimi on', 'Atau `/autosimi off` untuk auto-chat SimSimi AI di grup.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.autosimi = onOff; });
      await reply(success(onOff ? 'Auto SimSimi Aktif' : 'Auto SimSimi Nonaktif', `💬 Auto SimSimi AI chatbot ${onOff ? 'diaktifkan' : 'dimatikan'} di grup ini.`));
      return;
    }

    case 'mutegc':
    case 'botgrup': {
      const onOff = parseOnOff(args[0]);
      if (onOff === null) {
        await reply(usage('/mutegc on', 'Atau `/mutegc off` untuk membisukan/mengaktifkan respon bot di grup.'));
        return;
      }
      updateGroup(chatJid, (g) => { g.mutegc = onOff; });
      await reply(success(onOff ? 'Bot Grup Dibisukan' : 'Bot Grup Aktif Kembali', `🤖 Respon pesan grup untuk bot ${onOff ? 'dibisukan (mute)' : 'diaktifkan kembali'}.`));
      return;
    }

    default:
      return;
  }
}

module.exports = { handleModerationCommand };
