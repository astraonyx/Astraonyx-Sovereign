// lib/antidelete.js — Cache isi pesan terbaru per chat, dan re-post kalau
// terdeteksi dihapus pengirim (event messages.update dengan protocolMessage
// type REVOKE). Terpisah dari messageCache.js karena messageCache cuma
// nyimpen key (buat .delchat), sedangkan ini perlu nyimpen ISI pesan +
// file media (didownload duluan saat pesan MASUK, karena begitu dihapus
// pengirim, media aslinya sudah tidak bisa diambil dari WhatsApp lagi).

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { looksLikeVirtex } = require('./helpers');

const MAX_PER_CHAT = 100;
const MAX_AGE_MS = 15 * 60 * 1000; // hanya simpan 15 menit terakhir, biar memory & tmp/ tidak bengkak
const MAX_MEDIA_SIZE_MB = 20; // skip download kalau media lebih besar dari ini (hemat storage/waktu)

// Map<chatJid, Array<{ id, participant, text, mediaType, mediaPath, isVirtext, timestamp }>>
const cache = new Map();

// Tracking ID pesan yang terdeteksi virtex oleh moderationEngine atau heuristik
const virtexMessageIds = new Map(); // Map<messageId, timestamp>
const VIRTEX_TTL_MS = 30 * 60 * 1000;

function markAsVirtext(messageId) {
  if (!messageId) return;
  virtexMessageIds.set(messageId, Date.now());
}

function isVirtextMessage(messageId) {
  if (!messageId) return false;
  const ts = virtexMessageIds.get(messageId);
  if (!ts) return false;
  if (Date.now() - ts > VIRTEX_TTL_MS) {
    virtexMessageIds.delete(messageId);
    return false;
  }
  return true;
}

function deepUnwrapMessage(message) {
  if (!message) return { node: null, type: null, ext: null, isViewOnce: false, text: null, rawUnwrapped: null };
  let current = message;
  let isViewOnce = false;

  for (let i = 0; i < 10; i++) {
    if (!current) break;
    if (current.viewOnceMessage) { current = current.viewOnceMessage.message; isViewOnce = true; }
    else if (current.viewOnceMessageV2) { current = current.viewOnceMessageV2.message; isViewOnce = true; }
    else if (current.viewOnceMessageV2Extension) { current = current.viewOnceMessageV2Extension.message; isViewOnce = true; }
    else if (current.ephemeralMessage) { current = current.ephemeralMessage.message; }
    else if (current.documentWithCaptionMessage) { current = current.documentWithCaptionMessage.message; }
    else break;
  }

  if (!current) return { node: null, type: null, ext: null, isViewOnce, text: null, rawUnwrapped: null };

  let type = null;
  let ext = null;
  let node = null;

  if (current.imageMessage) {
    type = 'gambar'; ext = 'jpg'; node = current.imageMessage;
  } else if (current.videoMessage) {
    type = 'video'; ext = 'mp4'; node = current.videoMessage;
  } else if (current.stickerMessage) {
    type = 'stiker'; ext = 'webp'; node = current.stickerMessage;
  } else if (current.audioMessage) {
    type = 'audio'; ext = 'ogg'; node = current.audioMessage;
  } else if (current.documentMessage) {
    type = 'dokumen'; ext = 'bin'; node = current.documentMessage;
  }

  if (node?.viewOnce) isViewOnce = true;

  const text =
    current.conversation ||
    current.extendedTextMessage?.text ||
    node?.caption ||
    null;

  return { node, type, ext, isViewOnce, text, rawUnwrapped: current };
}

function extractText(message) {
  if (!message) return null;
  const unwrapped = deepUnwrapMessage(message);
  return unwrapped.text;
}

function getMediaMessageInfo(message) {
  if (!message) return null;
  const unwrapped = deepUnwrapMessage(message);
  if (!unwrapped.node) return null;
  return {
    type: unwrapped.type,
    node: unwrapped.node,
    ext: unwrapped.ext,
    isViewOnce: unwrapped.isViewOnce,
    rawUnwrapped: unwrapped.rawUnwrapped,
  };
}

// Download media ke tmp/antidelete/, balikin path file atau null kalau gagal/dilewati.
async function tryDownloadMedia(sock, msg, mediaInfo) {
  try {
    const sizeBytes = mediaInfo.node.fileLength ? Number(mediaInfo.node.fileLength) : 0;
    if (sizeBytes > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      return null; // terlalu besar, skip biar tidak boros storage
    }

    const { downloadMediaMessage } = require('baileys');

    // Jika pesan adalah View-Once, sintesis fakeMsg dengan unwrapped message agar Baileys mendekripsi dengan mulus
    let targetMsg = msg;
    if (mediaInfo.isViewOnce && mediaInfo.rawUnwrapped) {
      targetMsg = {
        key: msg.key,
        message: mediaInfo.rawUnwrapped,
      };
    }

    let buffer;
    try {
      buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
    } catch (innerErr) {
      // Fallback coba download dengan pesan asli jika fakeMsg gagal
      buffer = await downloadMediaMessage(msg, 'buffer', {});
    }

    if (!buffer || buffer.length === 0) return null;

    const dir = path.join(config.paths.tmpMedia, 'antidelete');
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${msg.key.id}.${mediaInfo.ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (err) {
    console.error('[antidelete] Gagal download media untuk cache:', err.message);
    return null;
  }
}

// sock dibutuhkan untuk download media. chatJid = grup ATAU private chat (JID @s.whatsapp.net).
async function record(sock, chatJid, msg) {
  if (!chatJid || !msg?.key?.id || msg.key.fromMe) return;

  // Deteksi nomor bot sendiri (agar pesan bot sendiri TIDAK PERNAH di-cache untuk antidelete)
  const myJid = sock?.user?.id ? (sock.user.id.includes(':') ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : sock.user.id) : null;
  const myNum = myJid ? myJid.replace(/[^0-9]/g, '') : '';
  const participant = msg.key.participant || msg.key.participantAlt || msg.key.remoteJid || '';

  if (myNum && (participant.includes(myNum) || participant === myJid)) {
    return;
  }

  if (!cache.has(chatJid)) cache.set(chatJid, []);
  const list = cache.get(chatJid);
  const now = Date.now();

  // Buang entry expired, dan hapus file tmp yang menyertainya biar tidak numpuk di disk
  const expired = list.filter((m) => now - m.timestamp >= MAX_AGE_MS);
  for (const m of expired) {
    if (m.mediaPath) {
      fs.unlink(m.mediaPath, () => {}); // best-effort, tidak perlu await/throw
    }
  }
  const filtered = list.filter((m) => now - m.timestamp < MAX_AGE_MS);

  const mediaInfo = getMediaMessageInfo(msg.message);
  let mediaPath = null;
  if (mediaInfo) {
    mediaPath = await tryDownloadMedia(sock, msg, mediaInfo);
  }

  const rawText = extractText(msg.message);
  const isVirtext = looksLikeVirtex(rawText || '') || isVirtextMessage(msg.key.id);
  if (isVirtext) {
    markAsVirtext(msg.key.id);
  }

  filtered.push({
    id: msg.key.id,
    fromMe: Boolean(msg.key.fromMe),
    participant: msg.key.participant || msg.key.participantAlt || msg.key.remoteJid,
    text: rawText,
    mediaType: mediaInfo?.type || null,
    mediaPath,
    isViewOnce: Boolean(mediaInfo?.isViewOnce),
    isVirtext,
    timestamp: now,
  });

  // Kalau kepenuhan, buang entry TERLAMA dan hapus file tmp-nya juga
  if (filtered.length > MAX_PER_CHAT) {
    const removed = filtered.splice(0, filtered.length - MAX_PER_CHAT);
    for (const m of removed) {
      if (m.mediaPath) fs.unlink(m.mediaPath, () => {});
    }
  }
  cache.set(chatJid, filtered);
}

function findDeleted(chatJid, messageId) {
  const list = cache.get(chatJid) || [];
  return list.find((m) => m.id === messageId) || null;
}

// Dipanggil setelah repost berhasil, supaya file tmp tidak menumpuk lebih lama dari perlu.
function cleanupAfterRepost(chatJid, messageId) {
  const list = cache.get(chatJid) || [];
  const entry = list.find((m) => m.id === messageId);
  if (entry?.mediaPath) {
    fs.unlink(entry.mediaPath, () => {});
    entry.mediaPath = null; // cegah unlink ganda kalau expired-cleanup jalan belakangan
  }
}

module.exports = {
  record,
  findDeleted,
  cleanupAfterRepost,
  markAsVirtext,
  isVirtextMessage,
};
