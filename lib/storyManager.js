// lib/storyManager.js — Manajemen dan Pelacakan Status WhatsApp (SW)
// Menyimpan riwayat status yang diposting, mencatat pesan yang dikirim ke nomor sendiri,
// dan mengelola proses penghapusan (delete / revoke) status dari status@broadcast.

const fs = require('fs');
const path = require('path');
const { jidNormalizedUser } = require('baileys');

const DEFAULT_FILE = path.resolve(__dirname, '../database/story_history.json');
const MAX_HISTORY = 50;

function getFilePath(instanceId = null) {
  if (!instanceId || instanceId === 'primary') {
    return DEFAULT_FILE;
  }
  const instDir = path.resolve(__dirname, `../instances/${instanceId}/database`);
  if (!fs.existsSync(instDir)) {
    fs.mkdirSync(instDir, { recursive: true });
  }
  return path.join(instDir, 'story_history.json');
}

function readHistory(instanceId = null) {
  const filePath = getFilePath(instanceId);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content || '[]');
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('[storyManager] Gagal membaca riwayat status:', err.message);
  }
  return [];
}

function writeHistory(history, instanceId = null) {
  const filePath = getFilePath(instanceId);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[storyManager] Gagal menyimpan riwayat status:', err.message);
    return false;
  }
}

/**
 * Mencatat status yang berhasil diposting beserta pesan copy yang dikirim ke nomor sendiri.
 */
function recordStory({
  statusKey,
  selfMessageKeys = [],
  storyType = 'text',
  preview = '',
  audienceCount = 'all',
  instanceId = null,
}) {
  const history = readHistory(instanceId);
  const entry = {
    id: statusKey?.id || `story_${Date.now()}`,
    statusKey: {
      remoteJid: 'status@broadcast',
      id: statusKey?.id,
      fromMe: true,
      participant: statusKey?.participant || undefined,
    },
    selfMessageKeys: (selfMessageKeys || []).map((k) => ({
      jid: k.jid,
      key: {
        remoteJid: k.key?.remoteJid,
        id: k.key?.id,
        fromMe: k.key?.fromMe ?? true,
      },
    })),
    storyType,
    preview: (preview || '').slice(0, 300),
    audienceCount,
    status: 'active',
    createdAt: Date.now(),
    instanceId: instanceId || 'primary',
  };

  history.unshift(entry);
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  writeHistory(history, instanceId);
  return entry;
}

/**
 * Mencari status berdasarkan Message ID pesan yang dikirim ke nomor sendiri (atau statusKey.id).
 */
function findStoryByMessageId(msgId, instanceId = null) {
  if (!msgId) return null;
  const history = readHistory(instanceId);
  return history.find((item) => {
    if (item.statusKey?.id === msgId) return true;
    return (item.selfMessageKeys || []).some((k) => k.key?.id === msgId);
  }) || null;
}

/**
 * Mengambil status aktif terakhir yang diposting.
 */
function getLatestActiveStory(instanceId = null) {
  const history = readHistory(instanceId);
  return history.find((item) => item.status === 'active') || null;
}

/**
 * Mendapatkan daftar status terbaru.
 */
function getRecentStories(limit = 10, instanceId = null) {
  const history = readHistory(instanceId);
  return history.slice(0, limit);
}

/**
 * Menandai status sebagai dihapus.
 */
function markStoryDeleted(storyId, instanceId = null) {
  if (!storyId) return false;
  const history = readHistory(instanceId);
  let updated = false;
  for (const item of history) {
    if (item.id === storyId || item.statusKey?.id === storyId) {
      item.status = 'deleted';
      item.deletedAt = Date.now();
      updated = true;
    }
  }
  if (updated) {
    writeHistory(history, instanceId);
  }
  return updated;
}

/**
 * Menghapus status dari status@broadcast dan pesan copy di nomor sendiri via socket Baileys.
 */
async function deleteStoryOnWhatsApp(sock, story, instanceId = null) {
  if (!sock) throw new Error('Socket WhatsApp tidak tersedia.');
  if (!story || !story.statusKey?.id) throw new Error('Data status tidak valid.');

  const results = { broadcastDeleted: false, selfDeletedCount: 0, errors: [] };

  // 1. Hapus dari status@broadcast
  try {
    await sock.sendMessage('status@broadcast', {
      delete: {
        remoteJid: 'status@broadcast',
        id: story.statusKey.id,
        fromMe: true,
      },
    });
    results.broadcastDeleted = true;
  } catch (err) {
    results.errors.push(`Broadcast: ${err.message}`);
  }

  // 2. Hapus copy pesan di nomor sendiri / owner
  if (Array.isArray(story.selfMessageKeys)) {
    for (const sm of story.selfMessageKeys) {
      try {
        if (sm.jid && sm.key?.id) {
          await sock.sendMessage(sm.jid, {
            delete: {
              remoteJid: sm.key.remoteJid || sm.jid,
              id: sm.key.id,
              fromMe: true,
            },
          });
          results.selfDeletedCount++;
        }
      } catch (err) {
        // Abaikan jika pesan chat tidak bisa dihapus
      }
    }
  }

  markStoryDeleted(story.id || story.statusKey?.id, instanceId);
  return results;
}

/**
 * Mengumpulkan seluruh JID nomor sendiri dan owner yang berhak menerima copy status.
 */
function getSelfAndOwnerJids(sock, config = {}) {
  const jids = new Set();

  // 1. Nomor bot itu sendiri (official "Message Yourself" di WhatsApp)
  if (sock?.user?.id) {
    try {
      const normalized = jidNormalizedUser(sock.user.id);
      if (normalized) jids.add(normalized);
    } catch (_) {}
  }

  // 2. Nomor Owner dari config.js
  if (config.ownerNumber) {
    const c = String(config.ownerNumber).replace(/[^0-9]/g, '');
    if (c.length >= 9 && c.length <= 14) {
      jids.add(`${c}@s.whatsapp.net`);
    }
  }

  // 3. Nomor Owner dari Environment Variable (Multi-instance cluster)
  if (process.env.OWNER_NUMBER) {
    const c = String(process.env.OWNER_NUMBER).replace(/[^0-9]/g, '');
    if (c.length >= 9 && c.length <= 14) {
      jids.add(`${c}@s.whatsapp.net`);
    }
  }

  // 4. Nomor Owner dari database/whitelist.json
  try {
    const wlPath = path.resolve(__dirname, '../database/whitelist.json');
    if (fs.existsSync(wlPath)) {
      const wl = JSON.parse(fs.readFileSync(wlPath, 'utf8'));
      (wl.owners || []).forEach((n) => {
        const c = String(n).replace(/[^0-9]/g, '');
        if (c.length >= 9 && c.length <= 14) {
          jids.add(`${c}@s.whatsapp.net`);
        }
      });
    }
  } catch (_) {}

  return Array.from(jids);
}

module.exports = {
  recordStory,
  findStoryByMessageId,
  getLatestActiveStory,
  getRecentStories,
  markStoryDeleted,
  deleteStoryOnWhatsApp,
  getSelfAndOwnerJids,
};
