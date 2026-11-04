// lib/antiRevokeEngine.js — Polaris Ghost Protocol: Anti-Delete & Anti-ViewOnce Engine
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { db, messageVaultQueries } = require('../server/db');
const botEcosystemGroups = require('./botEcosystemGroups');
const config = require('../config');

// Folder penyimpanan media terhapus / view once
const MEDIA_DIR = path.resolve(__dirname, '../tmp/vault_media');
fs.mkdirSync(MEDIA_DIR, { recursive: true });

// LRU In-Memory Cache untuk 1000 pesan terakhir
const messageCache = new Map();
const MAX_CACHE_SIZE = 1000;

function formatTimestamp(ts) {
  if (!ts) return '-';
  const d = new Date(Number(ts) * 1000 || Date.now());
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
}

/**
 * Ekstrak teks utama dari message object
 */
function extractMessageText(message) {
  if (!message) return '';
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  );
}

/**
 * Deteksi tipe pesan
 */
function detectMessageType(message) {
  if (!message) return 'unknown';
  if (message.conversation || message.extendedTextMessage) return 'text';
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.stickerMessage) return 'sticker';
  if (message.documentMessage) return 'document';
  if (message.contactMessage || message.contactsArrayMessage) return 'contact';
  if (message.locationMessage) return 'location';
  return 'other';
}

/**
 * Rekam pesan masuk ke buffer memori dan unduh media jika ada
 */
async function recordIncomingMessage(msg) {
  try {
    const id = msg?.key?.id;
    if (!id || !msg.message) return;

    // Abaikan jika protocol message
    if (msg.message.protocolMessage) return;

    const chatJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
    const senderName = msg.pushName || '';
    const ts = Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);
    const mType = detectMessageType(msg.message);
    const textContent = extractMessageText(msg.message);

    const entry = {
      id,
      chatJid,
      senderJid,
      senderName,
      timestamp: ts,
      messageType: mType,
      textContent,
      rawMessage: msg.message,
      mediaBuffer: null,
      mediaMime: null,
      savedMediaPath: null,
    };

    // Jika pesan berupa media, download buffer di background
    const isMedia = ['image', 'video', 'audio', 'sticker', 'document'].includes(mType);
    if (isMedia) {
      setImmediate(async () => {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { reuploadRequest: () => Promise.resolve() }
          );
          if (buffer) {
            entry.mediaBuffer = buffer;
            const extMap = { image: 'jpg', video: 'mp4', audio: 'ogg', sticker: 'webp', document: 'bin' };
            const ext = extMap[mType] || 'bin';
            const filename = `vault_${id}_${Date.now()}.${ext}`;
            const filePath = path.join(MEDIA_DIR, filename);
            fs.writeFileSync(filePath, buffer);
            entry.savedMediaPath = filePath;

            // Catat ke SQLite message_vault
            messageVaultQueries.save.run({
              id,
              chat_jid: chatJid,
              sender_jid: senderJid,
              sender_name: senderName,
              message_type: mType,
              content_text: textContent,
              media_path: filePath,
              is_view_once: 0,
              is_revoked: 0,
              timestamp: ts,
              created_at: new Date().toISOString(),
            });
          }
        } catch (_) {}
      });
    } else {
      // Simpan pesan teks ke SQLite
      messageVaultQueries.save.run({
        id,
        chat_jid: chatJid,
        sender_jid: senderJid,
        sender_name: senderName,
        message_type: mType,
        content_text: textContent,
        media_path: null,
        is_view_once: 0,
        is_revoked: 0,
        timestamp: ts,
        created_at: new Date().toISOString(),
      });
    }

    // Manajemen LRU Cache
    if (messageCache.size >= MAX_CACHE_SIZE) {
      const firstKey = messageCache.keys().next().value;
      messageCache.delete(firstKey);
    }
    messageCache.set(id, entry);
  } catch (err) {
    console.warn('[GhostProtocol] Error recordIncomingMessage:', err.message);
  }
}

/**
 * Tangani aksi penarikan / penghapusan pesan (Anti-Delete / Anti-Revoke)
 */
async function handleRevokeEvent(sock, msg) {
  try {
    const protocol = msg.message?.protocolMessage;
    if (!protocol || protocol.type !== 0) return false;

    const targetId = protocol.key?.id;
    if (!targetId) return false;

    // Cari pesan di memori cache atau SQLite
    let cached = messageCache.get(targetId);
    if (!cached) {
      const dbRow = messageVaultQueries.getById.get(targetId);
      if (dbRow) {
        cached = {
          id: dbRow.id,
          chatJid: dbRow.chat_jid,
          senderJid: dbRow.sender_jid,
          senderName: dbRow.sender_name,
          timestamp: dbRow.timestamp,
          messageType: dbRow.message_type,
          textContent: dbRow.content_text,
          savedMediaPath: dbRow.media_path,
        };
      }
    }

    if (!cached) {
      console.log(`[GhostProtocol] Pesan ditarik (ID: ${targetId}), tapi tidak ada di cache.`);
      return true;
    }

    // Tandai di SQLite bahwa pesan ini ditarik
    try {
      messageVaultQueries.markRevoked.run(targetId);
    } catch (_) {}

    const isGroup = cached.chatJid.endsWith('@g.us');
    const senderNumber = cached.senderJid.split('@')[0];
    const timeSent = formatTimestamp(cached.timestamp);
    const timeDeleted = formatTimestamp(msg.messageTimestamp);

    // Ambil target destinasi alert: Grup Polaris System & Error Logs atau nomor Owner
    const saved = botEcosystemGroups.getSavedData();
    const logGroupJid = saved.groups?.logs?.jid;
    const targetJid = logGroupJid || cached.chatJid;

    const alertText = [
      `🕵️ *[POLARIS GHOST PROTOCOL — ANTI-DELETE]*`,
      `──────────────────────────────`,
      `👤 *Pengirim:* +${senderNumber} ${cached.senderName ? `(${cached.senderName})` : ''}`,
      `👥 *Ruang Obrolan:* ${isGroup ? 'Grup WhatsApp' : 'Chat Pribadi'}`,
      `⏰ *Waktu Dikirim:* ${timeSent}`,
      `🗑️ *Waktu Dihapus:* ${timeDeleted}`,
      `📦 *Tipe Pesan:* ${cached.messageType.toUpperCase()}`,
      `──────────────────────────────`,
      cached.textContent ? `💬 *Pesan yang Dihapus:*\n"${cached.textContent}"` : '_(Pesan media tanpa teks caption)_',
      `──────────────────────────────`,
      `_Terekam otomatis oleh Baileys Ghost Sentinel._`,
    ].join('\n');

    // Kirim notifikasi teks
    await sock.sendMessage(targetJid, { text: alertText });

    // Jika pesan yang dihapus berisi file media, kirimkan kembali berkas aslinya!
    if (cached.savedMediaPath && fs.existsSync(cached.savedMediaPath)) {
      const buffer = fs.readFileSync(cached.savedMediaPath);
      if (cached.messageType === 'image') {
        await sock.sendMessage(targetJid, { image: buffer, caption: `📸 Berkas foto yang dihapus oleh +${senderNumber}` });
      } else if (cached.messageType === 'video') {
        await sock.sendMessage(targetJid, { video: buffer, caption: `🎬 Berkas video yang dihapus oleh +${senderNumber}` });
      } else if (cached.messageType === 'audio') {
        await sock.sendMessage(targetJid, { audio: buffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' });
      } else if (cached.messageType === 'sticker') {
        await sock.sendMessage(targetJid, { sticker: buffer });
      } else if (cached.messageType === 'document') {
        await sock.sendMessage(targetJid, { document: buffer, mimetype: 'application/octet-stream', fileName: path.basename(cached.savedMediaPath) });
      }
    }

    console.log(`[GhostProtocol] 🚨 Berhasil mengungkap pesan dihapus dari +${senderNumber} di ${cached.chatJid}`);
    return true;
  } catch (err) {
    console.error('[GhostProtocol] Error handleRevokeEvent:', err.message);
    return false;
  }
}

/**
 * Tangani pesan 1x Lihat (View-Once Revealer)
 */
async function handleViewOnceEvent(sock, msg) {
  try {
    const viewOnceMsg = msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2;
    if (!viewOnceMsg) return false;

    const innerMsg = viewOnceMsg.message;
    if (!innerMsg) return false;

    const id = msg.key?.id;
    const chatJid = msg.key?.remoteJid;
    const senderJid = msg.key?.participant || msg.key?.remoteJidAlt || msg.key?.remoteJid;
    const senderNumber = senderJid ? senderJid.split('@')[0] : 'Unknown';
    const timeStr = formatTimestamp(msg.messageTimestamp);

    // Download media view once
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { reuploadRequest: () => Promise.resolve() }
    );

    if (!buffer) return false;

    const isImage = Boolean(innerMsg.imageMessage);
    const isVideo = Boolean(innerMsg.videoMessage);
    const isAudio = Boolean(innerMsg.audioMessage);
    const caption = innerMsg.imageMessage?.caption || innerMsg.videoMessage?.caption || '';

    // Simpan ke direktori vault
    const ext = isImage ? 'jpg' : (isVideo ? 'mp4' : 'ogg');
    const filename = `viewonce_${id}_${Date.now()}.${ext}`;
    const filePath = path.join(MEDIA_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    // Catat ke SQLite message_vault
    messageVaultQueries.save.run({
      id,
      chat_jid: chatJid,
      sender_jid: senderJid,
      sender_name: msg.pushName || '',
      message_type: isImage ? 'image' : (isVideo ? 'video' : 'audio'),
      content_text: caption,
      media_path: filePath,
      is_view_once: 1,
      is_revoked: 0,
      timestamp: Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000),
      created_at: new Date().toISOString(),
    });

    // Kirim arsip permanen ke grup Polaris • Output & Artifact Vault
    const saved = botEcosystemGroups.getSavedData();
    const vaultJid = saved.groups?.vault?.jid || chatJid;

    const alertCaption = [
      `👁️ *[POLARIS GHOST PROTOCOL — 1X LIHAT REVEALER]*`,
      `──────────────────────────────`,
      `👤 *Pengirim:* +${senderNumber} ${msg.pushName ? `(${msg.pushName})` : ''}`,
      `⏰ *Waktu Diterima:* ${timeStr}`,
      caption ? `📝 *Caption:* "${caption}"` : '',
      `💾 *Status:* Media sekali lihat berhasil diabadikan ke Vault!`,
      `──────────────────────────────`,
    ].filter(Boolean).join('\n');

    if (isImage) {
      await sock.sendMessage(vaultJid, { image: buffer, caption: alertCaption });
    } else if (isVideo) {
      await sock.sendMessage(vaultJid, { video: buffer, caption: alertCaption });
    } else if (isAudio) {
      await sock.sendMessage(vaultJid, { audio: buffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' });
      await sock.sendMessage(vaultJid, { text: alertCaption });
    }

    console.log(`[GhostProtocol] 👁️ Media View-Once dari +${senderNumber} berhasil diabadikan ke Vault.`);
    return true;
  } catch (err) {
    console.error('[GhostProtocol] Error handleViewOnceEvent:', err.message);
    return false;
  }
}

/**
 * Pipeline utama Ghost Protocol yang dipanggil saat ada pesan masuk
 */
async function processIncomingGhostMessage(sock, msg) {
  if (!msg || !msg.message) return;

  // 1. Cek apakah ini aksi Revoke / Delete
  if (msg.message.protocolMessage && msg.message.protocolMessage.type === 0) {
    await handleRevokeEvent(sock, msg);
    return;
  }

  // 2. Cek apakah ini pesan Sekali Lihat (View Once)
  if (msg.message.viewOnceMessage || msg.message.viewOnceMessageV2) {
    await handleViewOnceEvent(sock, msg);
  }

  // 3. Selalu simpan pesan biasa ke cache buffer untuk persiapan jika nanti dihapus
  await recordIncomingMessage(msg);
}

module.exports = {
  processIncomingGhostMessage,
  recordIncomingMessage,
  handleRevokeEvent,
  handleViewOnceEvent,
};
