// commands/editoutput.js — Handler Command Edit Output WhatsApp
// Memungkinkan mengedit output pesan bot secara langsung di tempat, atau mengirim hasil edit ke grup tertentu atau nomor teman

const config = require('../config');
const { box, success, warning, usage, LINE } = require('../lib/messageStyle');
const waFormatter = require('../lib/whatsappFormatter');
const botOutputCache = require('../lib/botOutputCache');
const botEcosystemGroups = require('../lib/botEcosystemGroups');

/**
 * Normalisasi nomor telepon atau JID tujuan
 */
function resolveDestinationJid(targetStr) {
  if (!targetStr) return null;
  const t = String(targetStr).trim().toLowerCase();

  // 1. Cek shortcut grup ekosistem
  const ecosystem = botEcosystemGroups.getSavedData();
  const ecoGroups = ecosystem.groups || {};
  if (t === 'vault' || t === 'output') return ecoGroups.vault?.jid || null;
  if (t === 'news' || t === 'berita') return ecoGroups.news?.jid || null;
  if (t === 'logs' || t === 'log') return ecoGroups.logs?.jid || null;
  if (t === 'sandbox' || t === 'lab') return ecoGroups.sandbox?.jid || null;
  if (t === 'academy' || t === 'belajar') return ecoGroups.academy?.jid || null;
  if (t === 'channel' || t === 'saluran' || t === 'ch') {
    const channelFollower = require('../lib/channelFollower');
    const chStatus = channelFollower.getSavedStatus();
    return chStatus.channelJid || null;
  }

  // 2. Jika sudah berformat JID lengkap
  if (t.endsWith('@s.whatsapp.net') || t.endsWith('@g.us')) {
    return t;
  }

  // 3. Jika nomor telepon (misal: 628123... atau 08123...)
  let cleanNum = t.replace(/[^0-9]/g, '');
  if (cleanNum.startsWith('0')) {
    cleanNum = '62' + cleanNum.slice(1);
  }
  if (cleanNum.length >= 9) {
    return `${cleanNum}@s.whatsapp.net`;
  }

  return null;
}

async function handleEditOutputCommand({ sock, chatJid, msg, command, args, reply }) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo;
  const rawArgStr = args.join(' ').trim();

  // Parsing parameter: to=<target> dan id=<msgId>
  let targetParam = null;
  let idParam = null;
  let newText = rawArgStr;

  const toMatch = newText.match(/\bto=([a-zA-Z0-9_@\.\-]+)/i);
  if (toMatch) {
    targetParam = toMatch[1];
    newText = newText.replace(toMatch[0], '').trim();
  }

  const idMatch = newText.match(/\bid=([a-zA-Z0-9_\-]+)/i);
  if (idMatch) {
    idParam = idMatch[1];
    newText = newText.replace(idMatch[0], '').trim();
  }

  // Panduan jika argumen kosong
  if (!newText && !rawArgStr) {
    await reply(usage(
      `${config.prefix}${command} [to=<nomor/grup>] <teks baru>`,
      'Fitur Edit Output Pesan Bot:\n\n' +
      '1. *Edit Langsung di Tempat (In-Place):*\n' +
      `   Balas (reply) pesan bot yang ingin diedit, lalu ketik:\n` +
      `   • \`${config.prefix}${command} <isi teks baru yang sudah direvisi>\`\n\n` +
      '2. *Edit & Kirim ke Nomor Teman:*\n' +
      `   • \`${config.prefix}${command} to=628123456789 <isi teks baru>\`\n\n` +
      '3. *Edit & Kirim ke Grup yang Ditentukan:*\n' +
      `   • \`${config.prefix}${command} to=120363xxx@g.us <isi teks baru>\`\n` +
      `   • Atau gunakan shortcut: \`to=vault\`, \`to=news\`, \`to=sandbox\`, \`to=academy\`, \`to=logs\`\n\n` +
      '4. *Edit via ID Pesan:*\n' +
      `   • \`${config.prefix}${command} id=<id_pesan> <isi teks baru>\``
    ));
    return;
  }

  if (!newText) {
    await reply(warning('Teks Baru Kosong', 'Silakan sertakan teks baru yang ingin kamu jadikan revisi/edit.'));
    return;
  }

  // Terapkan formatter WhatsApp (tabel dan formula matematika)
  const formattedText = waFormatter.formatForWhatsApp(newText);

  // KASUS A: Kirim hasil edit ke nomor teman atau grup yang ditentukan
  if (targetParam) {
    const destJid = resolveDestinationJid(targetParam);
    if (!destJid) {
      await reply(warning('Tujuan Tidak Valid', `Format tujuan "to=${targetParam}" tidak dikenali. Gunakan nomor WA (contoh: to=628123456789) atau JID grup.`));
      return;
    }

    try {
      const isTargetGroup = destJid.endsWith('@g.us');
      const isTargetChannel = destJid.endsWith('@newsletter');
      let targetLabel = 'Nomor Teman';
      if (isTargetGroup) targetLabel = 'Grup Pilihan';
      if (isTargetChannel) targetLabel = 'Saluran Resmi Astraonyx';

      if (isTargetChannel) {
        const channelFollower = require('../lib/channelFollower');
        if (!channelFollower.isChannelAdminOrOwner()) {
          const role = channelFollower.getChannelRole();
          await reply(warning(
            'Izin Saluran Diperlukan',
            `Akun bot saat ini berstatus *${role}* di Saluran Astraonyx.\n\n` +
            `Hanya akun *ADMIN* atau *OWNER* yang dapat memposting hasil edit ke Saluran WhatsApp.\n\n` +
            `Jadikan nomor bot sebagai Admin Saluran di WhatsApp agar fitur ini dapat digunakan.`
          ));
          return;
        }
      }

      const sentMsg = await sock.sendMessage(destJid, { text: formattedText });
      if (sentMsg?.key?.id) {
        botOutputCache.recordBotOutput({
          id: sentMsg.key.id,
          chatJid: destJid,
          text: formattedText,
          command: 'editoutput_forward',
        });
      }

      await reply(success(
        'Output Terkirim ke Tujuan',
        `✅ Hasil edit pesan berhasil dikirimkan ke *${targetLabel}* (\`${destJid.split('@')[0]}\`).`
      ));
      return;
    } catch (sendErr) {
      await reply(warning('Gagal Mengirim Output', `Terjadi kesalahan saat mengirim ke ${targetParam}: ${sendErr.message}`));
      return;
    }
  }

  // KASUS B: Edit Langsung di Tempat (In-Place Edit)
  let targetStanzaId = idParam || quoted?.stanzaId;

  if (!targetStanzaId) {
    // Cek cache output terakhir di chat ini jika user tidak quote
    const cached = botOutputCache.getCachedOutputs();
    const lastInThisChat = cached.find((c) => c.chatJid === chatJid);
    if (lastInThisChat) {
      targetStanzaId = lastInThisChat.id;
    }
  }

  if (!targetStanzaId) {
    await reply(warning(
      'Target Pesan Tidak Ditemukan',
      'Balas (*reply*) pesan bot yang ingin diedit, atau gunakan `id=<id_pesan>`, atau gunakan `to=<nomor/grup>` untuk mengirim ke tempat lain.'
    ));
    return;
  }

  try {
    const editKey = {
      remoteJid: chatJid,
      fromMe: true,
      id: targetStanzaId,
    };

    await sock.sendMessage(chatJid, {
      text: formattedText,
      edit: editKey,
    });

    botOutputCache.updateCachedOutput(targetStanzaId, formattedText);

    try {
      await sock.sendMessage(chatJid, { react: { text: '✏️', key: msg.key } });
    } catch (_) {}

  } catch (editErr) {
    console.error('[handleEditOutputCommand] In-place edit error:', editErr.message);
    // Jika in-place edit gagal (misal window 15 menit lewat), kirim versi terbarunya
    await reply(box({
      prefix: 'REVISI OUTPUT',
      statusTag: 'EDITED',
      title: 'Output Pesan Diperbarui',
      body: [
        '⚠️ _Catatan: Batas waktu edit in-place WhatsApp (15 menit) telah lewat. Pesan revisi disajikan di bawah ini:_\n',
        formattedText,
      ].join('\n'),
      footer: `Target ID: ${targetStanzaId}`,
    }));
  }
}

module.exports = {
  handleEditOutputCommand,
  resolveDestinationJid,
};
