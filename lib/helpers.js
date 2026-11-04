// lib/helpers.js — Fungsi utilitas bersama

function normalizeNumber(raw) {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim().replace(/[^\d+]/g, '');
  cleaned = cleaned.replace(/^\+/, '');

  if (cleaned.length < 8 || cleaned.length > 15) return null;

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8') && !cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }

  if (!/^\d{10,15}$/.test(cleaned)) return null;

  return cleaned;
}

function toJid(normalizedNumber) {
  return `${normalizedNumber}@s.whatsapp.net`;
}

function jidToNumber(jid) {
  if (!jid) return null;
  return jid.split('@')[0].split(':')[0];
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

// Cek apakah bot berstatus admin/superadmin di grup tertentu.
// metadata.participants[].id sekarang berformat @lid (ID acak internal Baileys),
// nomor telepon asli ada di participants[].phoneNumber -> prioritaskan itu.
async function isBotAdmin(sock, groupJid) {
  const metadata = await sock.groupMetadata(groupJid);
  const botNumber = normalizeNumber(jidToNumber(sock.user.id));
  const botParticipant = metadata.participants.find((p) => {
    const pNumber = normalizeNumber(jidToNumber(p.phoneNumber || p.id));
    return pNumber === botNumber;
  });
  return Boolean(botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin'));
}

// Cache groupMetadata per grup, TTL 60 detik. Dipakai resolveParticipantNumber
// supaya tidak fetch groupMetadata() (API call) di SETIAP pesan masuk grup rame.
const groupMetadataCache = new Map(); // Map<groupJid, { metadata, fetchedAt }>
const METADATA_CACHE_TTL_MS = 60 * 1000;

async function getCachedGroupMetadata(sock, groupJid) {
  const cached = groupMetadataCache.get(groupJid);
  if (cached && Date.now() - cached.fetchedAt < METADATA_CACHE_TTL_MS) {
    return cached.metadata;
  }
  const metadata = await sock.groupMetadata(groupJid);
  groupMetadataCache.set(groupJid, { metadata, fetchedAt: Date.now() });
  return metadata;
}

// PENTING: msg.key.participantAlt TIDAK BISA DIPERCAYA untuk pesan dari orang
// LAIN di grup — WhatsApp/Baileys punya bug dimana participantAlt kadang
// selalu berisi nomor bot/owner sendiri, bukan nomor pengirim asli pesan itu
// (root cause bug antilink/antibad tidak terdeteksi, lihat rekap sesi).
// Cara paling reliable: cocokkan participant (@lid) ke groupMetadata().participants[].id,
// lalu ambil phoneNumber dari situ.
async function resolveParticipantNumber(sock, groupJid, participantJid) {
  if (!participantJid) return null;

  // Kalau participantJid udah format nomor biasa (bukan @lid), langsung normalize.
  if (!participantJid.endsWith('@lid')) {
    return normalizeNumber(jidToNumber(participantJid));
  }

  try {
    const metadata = await getCachedGroupMetadata(sock, groupJid);
    const found = metadata.participants.find((p) => p.id === participantJid || p.lid === participantJid);
    if (found?.phoneNumber) {
      return normalizeNumber(jidToNumber(found.phoneNumber));
    }
    // Fallback: kalau phoneNumber tidak ketemu, cek juga apakah field 'id'
    // ternyata sudah berupa nomor (kasus campuran lid/non-lid dalam 1 grup)
    if (found?.id && !found.id.endsWith('@lid')) {
      return normalizeNumber(jidToNumber(found.id));
    }
  } catch (err) {
    console.error('[resolveParticipantNumber] Gagal resolve LID:', err.message);
  }

  return null; // gagal resolve, caller harus handle null (skip, bukan salah proses)
}

// Invalidate cache metadata grup (dipanggil setelah aksi yang mengubah member,
// misal kick/promote/demote, supaya lookup berikutnya tidak pakai data basi)
function invalidateGroupMetadataCache(groupJid) {
  groupMetadataCache.delete(groupJid);
}

// Deteksi teks virtex, spam-crash, karakter invisible / zargo berulang
function looksLikeVirtex(text) {
  try {
    const virtexShield = require('./virtexShield');
    return virtexShield.looksLikeVirtex(text);
  } catch (_) {
    if (!text || typeof text !== 'string') return false;
    if (text.length > 3000) return true;
    if (/(.)\1{79,}/.test(text)) return true;
    return false;
  }
}

module.exports = {
  normalizeNumber,
  toJid,
  jidToNumber,
  isGroupJid,
  isBotAdmin,
  resolveParticipantNumber,
  invalidateGroupMetadataCache,
  getCachedGroupMetadata,
  looksLikeVirtex,
};
