// commands/pdftoolkit.js — Pocket Scanner & Document Toolkit (/topdf, /img2pdf, /compresspdf, /text2pdf)
const { downloadMediaMessage } = require('baileys');
const pdfToolkit = require('../lib/pdfToolkit');
const { box, success, warning, error, usage, info, LINE } = require('../lib/messageStyle');
const config = require('../config');

/**
 * Mengekstrak informasi media dari pesan langsung atau pesan yang di-reply
 */
function extractMediaInfo(msg) {
  const direct = msg.message;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (direct?.imageMessage) return { type: 'image', msg, isQuoted: false };
  if (direct?.documentMessage) return { type: 'document', msg, isQuoted: false, doc: direct.documentMessage };

  if (quoted?.imageMessage) {
    const quotedKey = msg.message.extendedTextMessage.contextInfo;
    const fakeMsg = {
      key: { remoteJid: msg.key.remoteJid, id: quotedKey.stanzaId, participant: quotedKey.participant },
      message: quoted,
    };
    return { type: 'image', msg: fakeMsg, isQuoted: true };
  }

  if (quoted?.documentMessage) {
    const quotedKey = msg.message.extendedTextMessage.contextInfo;
    const fakeMsg = {
      key: { remoteJid: msg.key.remoteJid, id: quotedKey.stanzaId, participant: quotedKey.participant },
      message: quoted,
    };
    return { type: 'document', msg: fakeMsg, isQuoted: true, doc: quoted.documentMessage };
  }

  return null;
}

async function handlePdfToolkitCommand({ sock, chatJid, msg, command, args, reply, senderNumber }) {
  const userJid = msg.key.participant || msg.key.remoteJid;
  const subCmd = (args[0] || '').toLowerCase();

  // ==================== 1. COMMAND: /text2pdf ====================
  if (command === 'text2pdf') {
    const fullText = args.join(' ').trim();
    if (!fullText) {
      await reply(usage(
        `${config.prefix}text2pdf <judul> | <isi catatan/tugas>`,
        'Konversi catatan atau tugas teks menjadi dokumen PDF formal siap cetak.\n\nContoh:\n' +
        `\`${config.prefix}text2pdf Tugas Sejarah Bab 3 | Peradaban Mesopotamia berkembang di antara dua sungai besar yaitu Eufrat dan Tigris...\``
      ));
      return;
    }

    let title = 'Catatan Polaris';
    let content = fullText;

    if (fullText.includes('|')) {
      const parts = fullText.split('|');
      title = parts[0].trim();
      content = parts.slice(1).join('|').trim();
    }

    await sock.sendMessage(chatJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      const pdfBuffer = await pdfToolkit.textToPdf(title, content, { author: `User ${senderNumber || ''}` });
      const safeFileName = `${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().slice(0, 30) || 'Catatan'}.pdf`;

      await sock.sendMessage(chatJid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: safeFileName,
        caption: success(
          'Dokumen PDF Berhasil Dibuat',
          `📄 *Judul:* ${title}\n` +
          `📏 *Ukuran:* ${(pdfBuffer.length / 1024).toFixed(1)} KB\n` +
          `✨ *Format:* A4 Dokumen Formal`
        ),
      }, { quoted: msg });

      await sock.sendMessage(chatJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(chatJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await reply(error('Gagal Membuat PDF', err.message));
    }
    return;
  }

  // ==================== 2. COMMAND: /compresspdf ====================
  if (command === 'compresspdf') {
    const mediaInfo = extractMediaInfo(msg);
    if (!mediaInfo || mediaInfo.type !== 'document') {
      await reply(usage(
        `${config.prefix}compresspdf (reply file PDF)`,
        'Kecilkan ukuran berkas dokumen PDF kamu.\n\n' +
        `*Cara Pakai:*\nBalas (reply) dokumen PDF yang ingin dikompres, lalu ketik \`${config.prefix}compresspdf\`.`
      ));
      return;
    }

    await sock.sendMessage(chatJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      const origBuffer = await downloadMediaMessage(mediaInfo.msg, 'buffer', {});
      const res = await pdfToolkit.compressPdf(origBuffer);
      const fileName = mediaInfo.doc?.fileName || 'Dokumen_Compressed.pdf';

      await sock.sendMessage(chatJid, {
        document: res.buffer,
        mimetype: 'application/pdf',
        fileName: `[Optimized] ${fileName}`,
        caption: success(
          'PDF Berhasil Dikompres',
          `📄 *Nama File:* ${fileName}\n` +
          `📉 *Ukuran Asli:* ${(res.originalSize / 1024).toFixed(1)} KB\n` +
          `📦 *Ukuran Baru:* ${(res.compressedSize / 1024).toFixed(1)} KB\n` +
          `🚀 *Hasil Optimasi:* ${res.ratio}`
        ),
      }, { quoted: msg });

      await sock.sendMessage(chatJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(chatJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await reply(error('Gagal Mengompres PDF', err.message));
    }
    return;
  }

  // ==================== 3. COMMAND: /topdf & /img2pdf ====================
  // 3.a Mode Selesai Batch: /topdf selesai / done / finish
  if (subCmd === 'selesai' || subCmd === 'done' || subCmd === 'finish') {
    const session = pdfToolkit.getPendingSession(userJid);
    if (!session || session.images.length === 0) {
      await reply(warning(
        'Sesi PDF Kosong',
        `Kamu belum memiliki sesi foto aktif. Ketik \`${config.prefix}topdf start <judul>\` lalu kirim beberapa foto.`
      ));
      return;
    }

    await sock.sendMessage(chatJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      const completed = pdfToolkit.finishPdfSession(userJid);
      const pdfBuffer = await pdfToolkit.imagesToPdf(completed.images, {
        title: completed.title,
        author: `User ${senderNumber || ''}`,
      });

      const safeName = `${completed.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().slice(0, 30) || 'Dokumen_Scanned'}.pdf`;

      await sock.sendMessage(chatJid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: safeName,
        caption: success(
          'PDF Multi-Halaman Selesai',
          `📑 *Judul:* ${completed.title}\n` +
          `🖼️ *Total Halaman:* ${completed.images.length} Lembar\n` +
          `📏 *Ukuran File:* ${(pdfBuffer.length / 1024).toFixed(1)} KB\n` +
          `✨ *Format:* PDF A4 Siap Cetak/Kirim`
        ),
      }, { quoted: msg });

      await sock.sendMessage(chatJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(chatJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await reply(error('Gagal Menggabungkan PDF', err.message));
    }
    return;
  }

  // 3.b Mode Mulai Batch: /topdf start [judul]
  if (subCmd === 'start' || subCmd === 'mulai') {
    const title = args.slice(1).join(' ').trim() || 'Kumpulan Tugas';
    pdfToolkit.startPdfSession(userJid, chatJid, title);

    await reply(info(
      'Sesi PDF Multi-Halaman Dibuka',
      `📚 *Judul:* ${title}\n\n` +
      `Silakan kirim foto dokumen/tugas kamu satu per satu (atau sekaligus) ke chat ini.\n\n` +
      `• Setiap foto otomatis masuk ke dalam antrean.\n` +
      `• Jika sudah selesai, ketik: \`${config.prefix}topdf selesai\`\n` +
      `• Untuk membatalkan, ketik: \`${config.prefix}topdf batal\``
    ));
    return;
  }

  // 3.c Mode Batal Batch: /topdf batal / cancel
  if (subCmd === 'batal' || subCmd === 'cancel') {
    const cancelled = pdfToolkit.cancelPdfSession(userJid);
    if (cancelled) {
      await reply(info('Sesi PDF Dibatalkan', 'Antrean foto dokumen berhasil dibatalkan.'));
    } else {
      await reply(warning('Tidak Ada Sesi Aktif', 'Kamu tidak sedang memiliki sesi pembuatan PDF aktif.'));
    }
    return;
  }

  // 3.d Mode Konversi Langsung (Single Image atau Sesi Aktif)
  const mediaInfo = extractMediaInfo(msg);
  const pendingSession = pdfToolkit.getPendingSession(userJid);

  // Jika ada sesi aktif dan pesan mengandung gambar: tambahkan ke sesi
  if (pendingSession && mediaInfo && mediaInfo.type === 'image') {
    try {
      const buffer = await downloadMediaMessage(mediaInfo.msg, 'buffer', {});
      pdfToolkit.addImageToSession(userJid, buffer);
      const count = pendingSession.images.length;
      await sock.sendMessage(chatJid, { react: { text: '📎', key: msg.key } }).catch(() => {});
      await reply(info(
        `Foto ke-${count} Ditambahkan`,
        `Foto berhasil masuk antrean dokumen *"${pendingSession.title}"*.\n` +
        `Kirim foto berikutnya, atau ketik \`${config.prefix}topdf selesai\` untuk mengunduh PDF.`
      ));
      return;
    } catch (dErr) {
      await reply(error('Gagal Mengunduh Foto', dErr.message));
      return;
    }
  }

  // Konversi Foto Satuan Langsung (Single Image to PDF)
  if (mediaInfo && mediaInfo.type === 'image') {
    await sock.sendMessage(chatJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    try {
      const imgBuffer = await downloadMediaMessage(mediaInfo.msg, 'buffer', {});
      const customTitle = args.join(' ').trim() || 'Scanned_Document';
      const safeName = `${customTitle.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().slice(0, 30) || 'Dokumen'}.pdf`;

      const pdfBuffer = await pdfToolkit.imagesToPdf([imgBuffer], {
        title: customTitle,
        author: `User ${senderNumber || ''}`,
      });

      await sock.sendMessage(chatJid, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: safeName,
        caption: success(
          'Foto Berhasil Jadi PDF',
          `📄 *Nama Berkas:* ${safeName}\n` +
          `📏 *Ukuran:* ${(pdfBuffer.length / 1024).toFixed(1)} KB\n` +
          `✨ *Kualitas:* Resolusi Asli (A4 Auto-Fit)\n\n` +
          `💡 _Mau gabung banyak foto jadi 1 PDF? Ketik \`${config.prefix}topdf start <judul>\`_`
        ),
      }, { quoted: msg });

      await sock.sendMessage(chatJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
    } catch (err) {
      await sock.sendMessage(chatJid, { react: { text: '❌', key: msg.key } }).catch(() => {});
      await reply(error('Gagal Konversi Foto ke PDF', err.message));
    }
    return;
  }

  // Jika tidak ada gambar dan bukan sub-command sesi: tampilkan petunjuk lengkap
  await reply(usage(
    `${config.prefix}topdf [nama_file] (reply foto)`,
    'Fitur Pocket Scanner & Document Toolkit:\n\n' +
    '1. *Konversi 1 Foto Langsung:*\n' +
    `   Balas (reply) foto tugas/dokumen, lalu ketik \`${config.prefix}topdf Tugas_Fisika\`\n\n` +
    '2. *Gabung Banyak Foto Jadi 1 PDF (Multi-Page):*\n' +
    `   • Mulai sesi: \`${config.prefix}topdf start Laporan Praktikum\`\n` +
    `   • Kirim semua foto lembar tugasmu satu per satu\n` +
    `   • Selesaikan: \`${config.prefix}topdf selesai\`\n\n` +
    '3. *Kompres Ukuran PDF:*\n' +
    `   Balas dokumen PDF dengan: \`${config.prefix}compresspdf\`\n\n` +
    '4. *Ubah Catatan Teks Jadi Dokumen PDF:*\n' +
    `   \`${config.prefix}text2pdf <judul> | <isi materi/tugas>\``
  ));
}

module.exports = {
  handlePdfToolkitCommand,
};
