// server/services/notify.js — Pembuat notifikasi tunggal untuk seluruh ekosistem (PRD F-NTF).
//
// Fitur lain TIDAK menulis tabel notifikasi sendiri. Mereka mendaftarkan jenisnya lalu memanggil notify() dari server,
// tidak pernah dari permintaan klien:
//
//   const { registerNotificationType } = require('../../services/registry');
//   registerNotificationType({ type: 'ntf.social.comment', domain: 'social', owner: 'F-CMT' });
//
//   const { notify } = require('../../services/notify');
//   notify({ eventId: commentId, accountId: post.authorId, actorId: req.user.id, type: 'ntf.social.comment',
//            refType: 'post', refId: post.id, groupKey: `post:${post.id}`, payload: { snippetOf: 'comment' } });
//
// notify() tidak pernah melempar galat ke pemanggil: gagal → { created:false, skipped:'error' } dan dicatat.
// Muatan (payload) hanya boleh berisi ID dan kolom kecil, TIDAK PERNAH isi pesan atau data pribadi (PRD R-06.8, F-NTF-C08).
//
// Pemilik berkas ini: pengembang akun-core. Ia menambahkan daftar, tandai baca, hapus, dan preferensi di atas tabel yang sama.
const crypto = require('crypto');
const { db, userQueries } = require('../db');
const { getNotificationType, isBlocked } = require('./registry');

const MERGE_WINDOW_MS = 5 * 60 * 1000;   // PRM-NTF-01
const MAX_PAYLOAD_BYTES = 2048;

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_id TEXT,
    ref_type TEXT,
    ref_id TEXT,
    group_key TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    read_at TEXT,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(account_id) WHERE read_at IS NULL AND deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(account_id, group_key) WHERE read_at IS NULL AND deleted_at IS NULL;

  CREATE TABLE IF NOT EXISTS notification_dedupe (
    account_id TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (account_id, dedupe_key)
  );

  CREATE TABLE IF NOT EXISTS notification_preferences (
    account_id TEXT PRIMARY KEY,
    master INTEGER NOT NULL DEFAULT 1,
    categories TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1
  );
`);

const q = {
  prefs: db.prepare('SELECT master, categories FROM notification_preferences WHERE account_id = ?'),
  dedupe: db.prepare('INSERT OR IGNORE INTO notification_dedupe (account_id, dedupe_key, created_at) VALUES (?, ?, ?)'),
  findGroup: db.prepare(`SELECT id FROM notifications
    WHERE account_id = ? AND group_key = ? AND read_at IS NULL AND deleted_at IS NULL AND updated_at > ?
    ORDER BY updated_at DESC LIMIT 1`),
  merge: db.prepare('UPDATE notifications SET count = count + 1, updated_at = ?, payload = ? WHERE id = ?'),
  insert: db.prepare(`INSERT INTO notifications (id, account_id, domain, type, actor_id, ref_type, ref_id, group_key, count, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`),
  byId: db.prepare('SELECT id, domain, type, count, created_at FROM notifications WHERE id = ?'),
  unread: db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE account_id = ? AND read_at IS NULL AND deleted_at IS NULL'),
};

function allowedByPreferences(accountId, def) {
  if (def.mandatory) return true;
  const row = q.prefs.get(accountId);
  if (!row) return true; // belum pernah mengatur: semua kategori aktif
  if (!row.master) return false;
  try {
    const categories = JSON.parse(row.categories || '{}');
    const own = categories[def.domain];
    return !(own && own.inApp === false);
  } catch (_) {
    return true;
  }
}

function pushRealtime(row, accountId) {
  try {
    const { broadcastWs } = require('../wsServer');
    broadcastWs('notification.created', { id: row.id, domain: row.domain, type: row.type, count: row.count, createdAt: row.created_at }, { to: [accountId] });
  } catch (_) { /* realtime opsional; baris sudah tersimpan */ }
}

/**
 * @param {{ eventId?: string, accountId: string, actorId?: string|null, type: string, refType?: string, refId?: string,
 *           groupKey?: string, payload?: object }} entry
 * @returns {{ created: boolean, merged?: boolean, id?: string, skipped?: string }}
 */
function notify(entry) {
  try {
    const { eventId, accountId, actorId = null, type, refType = null, refId = null, groupKey = null, payload = {} } = entry || {};
    const def = getNotificationType(type);
    if (!accountId || !def) return { created: false, skipped: def ? 'no_recipient' : 'unknown_type' };
    if (actorId && actorId === accountId && !def.self) return { created: false, skipped: 'self' };

    const recipient = userQueries.getById.get(accountId);
    if (!recipient || recipient.is_banned) return { created: false, skipped: 'recipient_inactive' };
    if (actorId && isBlocked(accountId, actorId)) return { created: false, skipped: 'blocked' };
    if (!allowedByPreferences(accountId, def)) return { created: false, skipped: 'preference_off' };

    let body = JSON.stringify(payload || {});
    if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) body = '{}';

    const now = new Date().toISOString();
    const outcome = db.transaction(() => {
      if (eventId) {
        const marked = q.dedupe.run(accountId, `${eventId}|${type}`, now);
        if (marked.changes === 0) return { created: false, skipped: 'duplicate' };
      }
      if (groupKey) {
        const since = new Date(Date.now() - MERGE_WINDOW_MS).toISOString();
        const existing = q.findGroup.get(accountId, groupKey, since);
        if (existing) {
          q.merge.run(now, body, existing.id);
          return { created: true, merged: true, id: existing.id };
        }
      }
      const id = crypto.randomUUID();
      q.insert.run(id, accountId, def.domain, type, actorId, refType, refId, groupKey, body, now, now);
      return { created: true, merged: false, id };
    })();

    if (outcome.created) {
      const row = q.byId.get(outcome.id);
      if (row) pushRealtime(row, accountId);
    }
    return outcome;
  } catch (err) {
    console.error('[notify] gagal membuat notifikasi:', err && err.message ? err.message : err);
    return { created: false, skipped: 'error' };
  }
}

/** Jumlah notifikasi belum dibaca milik akun (untuk lencana lonceng). */
function unreadCount(accountId) {
  return q.unread.get(accountId).n;
}

module.exports = { notify, unreadCount, MERGE_WINDOW_MS };
