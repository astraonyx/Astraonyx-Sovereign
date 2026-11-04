// commands/reminder.js — /setreminder, /reminder (auto-reminder harian per grup)
const { updateGroup, getGroup } = require('../lib/groupSettings');
const { success, warning, usage, info } = require('../lib/messageStyle');

function parseTime(raw) {
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
}

async function handleReminderCommand({ chatJid, command, args, reply }) {
  if (command === 'setreminder') {
    const timeArg = args[0];
    const message = args.slice(1).join(' ');

    if (!timeArg || !message) {
      if (timeArg && parseTime(timeArg)) {
        await reply(usage(
          '/setreminder <jam:menit> <pesan>',
          `Format pesan reminder grup: \`/setreminder ${timeArg} <pesan kamu>\`\n` +
          `Contoh: \`/setreminder ${timeArg} Jangan lupa evaluasi harian!\`\n\n` +
          `💡 _Catatan: Jika Anda ingin mengatur jam rekap otomatis daftar tugas & deadline, gunakan command \`/setremind ${timeArg}\`._`
        ));
        return;
      }
      await reply(usage('/setreminder <jam:menit> <pesan>', 'Contoh: `/setreminder 19:00 Jangan lupa checklist harian!` (format 24 jam)\n\n💡 _Tips: Untuk mengatur jam rekap harian daftar tugas & deadline, gunakan `/setremind <HH:mm>`._'));
      return;
    }

    const time = parseTime(timeArg);
    if (!time) {
      await reply(warning('Format Jam Salah', 'Pakai format 24 jam HH:MM, contoh: `19:00` atau `07:30`.'));
      return;
    }

    updateGroup(chatJid, (g) => {
      g.reminder = { enabled: true, hour: time.hour, minute: time.minute, message };
    });

    const hh = String(time.hour).padStart(2, '0');
    const mm = String(time.minute).padStart(2, '0');
    await reply(success('Reminder Diset', `⏰ Reminder aktif tiap hari jam ${hh}:${mm}.\nPesan: ${message}`));
    return;
  }

  if (command === 'reminder') {
    const sub = args[0]?.toLowerCase();

    if (sub === 'off') {
      updateGroup(chatJid, (g) => { g.reminder.enabled = false; });
      await reply(success('Reminder Dimatikan', '⏰ Auto-reminder grup ini dinonaktifkan.'));
      return;
    }

    if (sub === 'status' || !sub) {
      const group = getGroup(chatJid);
      const r = group?.reminder;
      if (!r || !r.enabled) {
        await reply(warning('Reminder Nonaktif', 'Belum ada reminder aktif di grup ini.\nSet lewat `/setreminder <jam:menit> <pesan>`'));
        return;
      }
      const hh = String(r.hour).padStart(2, '0');
      const mm = String(r.minute).padStart(2, '0');
      await reply(info('Status Reminder', `⏰ Aktif tiap hari jam ${hh}:${mm}\nPesan: ${r.message}`, 'Matikan lewat `/reminder off`'));
      return;
    }

    await reply(usage('/reminder status', 'Atau `/reminder off`. Untuk mengaktifkan/ubah jadwal, pakai `/setreminder <jam:menit> <pesan>`.'));
  }
}

module.exports = { handleReminderCommand };
