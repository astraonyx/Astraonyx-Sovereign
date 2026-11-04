const { normalizeNumber, resolveParticipantNumber, jidToNumber } = require('../lib/helpers');
const { isOwner, isPrimaryOwner, addWhitelist, removeWhitelist, loadWhitelist, setLevel, addOwner, removeOwner, MAX_WHITELIST, MAX_OWNERS } = require('../lib/accessControl');
const { success, warning, denied, usage, info } = require('../lib/messageStyle');

async function extractTargetNumber({ sock, chatJid, msg, args = [] }) {
  const contextInfo = msg?.message?.extendedTextMessage?.contextInfo
    || msg?.message?.imageMessage?.contextInfo
    || msg?.message?.videoMessage?.contextInfo
    || msg?.message?.[Object.keys(msg?.message || {})[0]]?.contextInfo;

  // 1. Quoted message (reply)
  const quotedParticipant = contextInfo?.participant;
  if (quotedParticipant) {
    if (sock && chatJid) {
      const resolved = await resolveParticipantNumber(sock, chatJid, quotedParticipant);
      if (resolved) return resolved;
    }
    const fallback = normalizeNumber(jidToNumber(quotedParticipant));
    if (fallback) return fallback;
  }

  // 2. Mentions (@tag)
  const mentioned = contextInfo?.mentionedJid?.[0];
  if (mentioned) {
    if (sock && chatJid) {
      const resolved = await resolveParticipantNumber(sock, chatJid, mentioned);
      if (resolved) return resolved;
    }
    const fallback = normalizeNumber(jidToNumber(mentioned));
    if (fallback) return fallback;
  }

  // 3. Raw number from args (abaikan keyword level1/level2)
  if (Array.isArray(args) && args.length > 0) {
    const nonLevelArgs = args.filter((a) => !['level1', 'level2'].includes(a.toLowerCase()));
    const raw = nonLevelArgs.join('').replace(/[@\s\-+]/g, '');
    const normalized = normalizeNumber(raw);
    if (normalized) return normalized;
  }

  return null;
}

async function handleWhitelistCommand({ sock, chatJid, msg, senderNumber, command, args = [], reply }) {
  if (!isOwner(senderNumber)) return; // silent reject, bukan owner

  switch (command) {
    case 'adduser': {
      // Level opsional di argumen (level1/level2), default level1.
      let levelArg = 'level1';
      for (const a of args) {
        const lower = a.toLowerCase();
        if (lower === 'level1' || lower === 'level2') {
          levelArg = lower;
          break;
        }
      }

      const normalized = await extractTargetNumber({ sock, chatJid, msg, args });
      if (!normalized) {
        await reply(usage(
          '/adduser @user [level1/level2]',
          'Bisa reply pesan orangnya, tag @user, atau ketik nomor `/adduser 628xxxxxxxxxx [level1/level2]`. Default level1.'
        ));
        return;
      }
      const result = addWhitelist(normalized, levelArg);
      if (!result.ok) {
        if (result.reason === 'duplicate') {
          await reply(warning('Sudah Terdaftar', `Nomor ${normalized} sudah ada di whitelist (atau memang owner).`));
        } else if (result.reason === 'full') {
          await reply(warning('Whitelist Penuh', `Maksimal ${MAX_WHITELIST} orang. Hapus salah satu dulu pakai \`/deluser\`.`));
        }
        return;
      }
      await reply(success('User Ditambahkan', `*@${normalized}* berhasil ditambahkan ke whitelist sebagai *${levelArg}*.`));
      return;
    }

    case 'deluser': {
      const normalized = await extractTargetNumber({ sock, chatJid, msg, args });
      if (!normalized) {
        await reply(usage(
          '/deluser @user',
          'Bisa reply pesan orangnya, tag @user, atau ketik nomor `/deluser 628xxxxxxxxxx`.'
        ));
        return;
      }
      const result = removeWhitelist(normalized);
      if (!result.ok) {
        await reply(warning('Tidak Ditemukan', `Nomor ${normalized} tidak ada di whitelist.`));
        return;
      }
      await reply(success('User Dihapus', `*@${normalized}* berhasil dihapus dari whitelist.`));
      return;
    }

    case 'setlevel': {
      let levelArg = null;
      for (const a of args) {
        const lower = a.toLowerCase();
        if (lower === 'level1' || lower === 'level2') {
          levelArg = lower;
          break;
        }
      }

      const normalized = await extractTargetNumber({ sock, chatJid, msg, args });
      if (!normalized || !levelArg) {
        await reply(usage(
          '/setlevel @user level1/level2',
          'Bisa reply pesan orangnya, tag @user, atau ketik `/setlevel 628xxx level1`.'
        ));
        return;
      }
      const result = setLevel(normalized, levelArg);
      if (!result.ok) {
        if (result.reason === 'notfound') {
          await reply(warning('Belum Terdaftar', `Nomor ${normalized} belum ada di whitelist. Tambah dulu pakai \`/adduser\`.`));
        } else {
          await reply(warning('Level Tidak Valid', 'Pakai level1 atau level2.'));
        }
        return;
      }
      await reply(success('Level Diubah', `Level *@${normalized}* diubah jadi *${levelArg}*.`));
      return;
    }

    case 'setowner': {
      // HANYA primary owner (owners[0]) yang boleh nambah owner baru.
      if (!isPrimaryOwner(senderNumber)) {
        await reply(denied('Akses Ditolak', 'Command ini khusus owner utama.'));
        return;
      }
      const normalized = await extractTargetNumber({ sock, chatJid, msg, args });
      if (!normalized) {
        await reply(usage(
          '/setowner @user',
          'Bisa reply pesan orangnya, tag @user, atau ketik nomor `/setowner 628xxxxxxxxxx`.'
        ));
        return;
      }
      const result = addOwner(normalized);
      if (!result.ok) {
        if (result.reason === 'duplicate') {
          await reply(warning('Sudah Owner', `Nomor ${normalized} sudah jadi owner.`));
        } else if (result.reason === 'full') {
          await reply(warning('Owner Penuh', `Maksimal ${MAX_OWNERS} owner. Hapus salah satu dulu pakai \`/unsetowner\`.`));
        }
        return;
      }
      await reply(success('Owner Ditambahkan', `👑 *@${normalized}* sekarang jadi owner (akses penuh, setara owner utama kecuali \`/setowner\`/\`/unsetowner\`).`));
      return;
    }

    case 'unsetowner': {
      if (!isPrimaryOwner(senderNumber)) {
        await reply(denied('Akses Ditolak', 'Command ini khusus owner utama.'));
        return;
      }
      const normalized = await extractTargetNumber({ sock, chatJid, msg, args });
      if (!normalized) {
        await reply(usage(
          '/unsetowner @user',
          'Bisa reply pesan orangnya, tag @user, atau ketik nomor `/unsetowner 628xxxxxxxxxx`.'
        ));
        return;
      }
      const result = removeOwner(normalized);
      if (!result.ok) {
        if (result.reason === 'primary') {
          await reply(warning('Tidak Bisa Dihapus', 'Owner utama tidak bisa dihapus.'));
        } else {
          await reply(warning('Bukan Owner', `Nomor ${normalized} bukan owner.`));
        }
        return;
      }
      await reply(success('Owner Dicabut', `*@${normalized}* bukan owner lagi (akses turun ke non-whitelist, kecuali di-\`/adduser\` lagi).`));
      return;
    }

    case 'listuser': {
      const wl = loadWhitelist();
      let body = `👑 Owner (${wl.owners.length}/${MAX_OWNERS}):\n`;
      body += wl.owners.map((o, i) => `${i + 1}. ${o}${i === 0 ? ' (utama)' : ''}`).join('\n');
      body += '\n\n';
      if (wl.allowed.length === 0) {
        body += '(belum ada nomor whitelist selain owner)';
      } else {
        const badge = (level) => (level === 'level1' ? '⭐ level1' : '✨ level2');
        body += wl.allowed.map((entry, i) => `${i + 1}. ${entry.number} — ${badge(entry.level)}`).join('\n');
      }
      await reply(info(`Whitelist (${wl.allowed.length}/${MAX_WHITELIST})`, body));
      return;
    }

    default:
      return;
  }
}

module.exports = { handleWhitelistCommand };
