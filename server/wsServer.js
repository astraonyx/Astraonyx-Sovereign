// server/wsServer.js — WebSocket realtime Astraonyx: handshake autentikasi, penyaringan peristiwa per pengguna, presence.
//
// Protokol (klien dashboard: dashboard/app/core/ws.js)
//   klien → server   { type: 'AUTH', token }    harus pesan pertama; selain itu hanya { type: 'PING' } yang diterima
//   server → klien   { type: 'AUTH_OK', data: { userId, role } }
//                    { type: 'AUTH_FAIL', data: { reason, forceLogout } } lalu soket ditutup (kode 4401)
//                    { type: 'session.forced_logout', data: { reason } } lalu soket ditutup (kode 4401, PRD R-07.9)
//                         reason: session_replaced | banned | deleted | logout | expired
//                    { type: 'PONG' }
//                    peristiwa domain { type, data, timestamp }
//
// Siapa menerima apa
//   - Soket yang belum AUTH tidak menerima apa pun (sebelumnya QR dan kode pairing bot terkirim ke siapa saja yang membuka /ws).
//   - Peristiwa bot utama (STATUS, LOG, QR, PAIRING_CODE, LOGS_CLEARED): hanya akun Cosmos.
//   - Peristiwa CLUSTER_*: Cosmos dan pemilik instance (ownerUserId) yang bersangkutan.
//   - broadcastWs(type, data): semua pengguna yang sudah AUTH (untuk peristiwa publik seperti kiriman baru di feed).
//     broadcastWs(type, data, { to: [idAtauUsername, ...], alsoCosmos }) hanya untuk penerima tertentu (DM, tantangan, notifikasi).
//   - presence.user.online / presence.user.offline { userId, username }: teman yang sudah diterima dan akun Cosmos.
//     [Usulan] Audiens bawaan sambil menunggu keputusan OQ-37 (siapa boleh melihat status online); masa tenggang
//     sambung ulang 90 detik (PRM-SES-05) supaya penanda tidak berkedip saat jaringan sebentar putus.
const { WebSocketServer } = require('ws');
const botManager = require('./botManager');
const { resolveSession } = require('./auth');
const sessionBus = require('./sessionBus');
const { friendQueries } = require('./db');

const AUTH_TIMEOUT_MS = 8000;
const HEARTBEAT_MS = 25000;            // PRM-RT-01: ping server tiap 25 detik
const MISSED_PONG_LIMIT = 3;           // tanpa pong 3 siklus (75 detik) → koneksi ditutup
const MAX_MESSAGES_PER_SECOND = 30;    // PRM-RT-01
const PRESENCE_GRACE_MS = 90000;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const OWNER_CACHE_TTL_MS = 3000;
const IMMEDIATE_OFFLINE_REASONS = new Set(['logout', 'banned', 'deleted', 'expired']);

let globalBroadcast = null;
let globalOnlineUserIds = () => [];

/** Kirim peristiwa ke pengguna yang sudah AUTH. opts.to membatasi penerima; opts.alsoCosmos menambahkan semua akun Cosmos. */
function broadcastWs(type, data, opts) {
  if (globalBroadcast) {
    try {
      globalBroadcast(type, data, opts);
    } catch (_) {}
  }
}

/** Id pengguna yang sedang online (punya soket terautentikasi atau masih dalam masa tenggang sambung ulang). */
function onlineUserIds() {
  return globalOnlineUserIds();
}

function setupWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: MAX_PAYLOAD_BYTES });
  /** @type {Map<import('ws').WebSocket, { userId: string, username: string, role: string, sessionId: string, expTimer: any, leaving: string }>} */
  const sessions = new Map();
  const presenceOnline = new Set();
  const offlineTimers = new Map();

  const isCosmos = (info) => info.role === 'cosmos';
  const hasSocket = (userId) => {
    for (const info of sessions.values()) if (info.userId === userId) return true;
    return false;
  };

  function sendRaw(client, message) {
    if (client.readyState !== 1) return;
    try {
      client.send(message);
    } catch (err) {
      console.error('[ws] Gagal kirim pesan ke client:', err.message);
    }
  }

  function send(client, type, data) {
    sendRaw(client, JSON.stringify({ type, data, timestamp: Date.now() }));
  }

  /** Kirim ke semua soket terautentikasi yang lolos predicate(info). */
  function emitWhere(predicate, type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const [client, info] of sessions) {
      if (predicate(info)) sendRaw(client, message);
    }
  }

  function broadcast(type, data, opts = {}) {
    const to = Array.isArray(opts.to) ? opts.to.filter(Boolean).map((v) => String(v).toLowerCase()) : null;
    if (!to) {
      emitWhere(() => true, type, data);
      return;
    }
    emitWhere((info) => to.includes(String(info.userId).toLowerCase()) || to.includes(String(info.username).toLowerCase()) || (opts.alsoCosmos && isCosmos(info)), type, data);
  }

  globalBroadcast = broadcast;
  globalOnlineUserIds = () => [...presenceOnline];

  // ---- Presence ----
  function announcePresence(userId, username, online) {
    if (online) presenceOnline.add(userId);
    else presenceOnline.delete(userId);
    let friendIds = [];
    try {
      friendIds = friendQueries.getFriendsList(userId).map((f) => f.friendId);
    } catch (_) {}
    emitWhere(
      (info) => info.userId !== userId && (friendIds.includes(info.userId) || isCosmos(info)),
      online ? 'presence.user.online' : 'presence.user.offline',
      { userId, username },
    );
  }

  function markOnline(info) {
    const pending = offlineTimers.get(info.userId);
    if (pending) {
      clearTimeout(pending);
      offlineTimers.delete(info.userId);
    }
    if (!presenceOnline.has(info.userId)) announcePresence(info.userId, info.username, true);
  }

  function markGone(info) {
    if (hasSocket(info.userId) || offlineTimers.has(info.userId) || !presenceOnline.has(info.userId)) return;
    if (IMMEDIATE_OFFLINE_REASONS.has(info.leaving)) {
      announcePresence(info.userId, info.username, false);
      return;
    }
    const timer = setTimeout(() => {
      offlineTimers.delete(info.userId);
      if (!hasSocket(info.userId)) announcePresence(info.userId, info.username, false);
    }, PRESENCE_GRACE_MS);
    timer.unref();
    offlineTimers.set(info.userId, timer);
  }

  // ---- Peristiwa bot utama: hanya Cosmos ----
  botManager.addListener((event, payload) => {
    switch (event) {
      case 'LOGS_CLEARED':
        emitWhere(isCosmos, 'LOGS_CLEARED', {});
        break;
      default:
        emitWhere(isCosmos, event, payload);
    }
  });

  // ---- Peristiwa multi-bot: Cosmos dan pemilik instance ----
  let clusterManager = null;
  try {
    clusterManager = require('./clusterManager');
  } catch (err) {
    console.error('[ws] clusterManager tidak dapat dimuat:', err.message);
  }

  let ownerCache = { at: 0, byInstance: {} };
  function instanceOwner(instanceId) {
    if (!clusterManager || typeof clusterManager.readClusterDb !== 'function') return null;
    if (Date.now() - ownerCache.at > OWNER_CACHE_TTL_MS) {
      try {
        const clusterDb = clusterManager.readClusterDb() || {};
        const byInstance = {};
        for (const [id, inst] of Object.entries(clusterDb)) byInstance[id] = inst && inst.ownerUserId ? inst.ownerUserId : null;
        ownerCache = { at: Date.now(), byInstance };
      } catch (_) {
        ownerCache = { at: Date.now(), byInstance: ownerCache.byInstance };
      }
    }
    return ownerCache.byInstance[instanceId] || null;
  }

  try {
    if (clusterManager && typeof clusterManager.addListener === 'function') {
      clusterManager.addListener((event, payload) => {
        const owner = payload && payload.instanceId ? instanceOwner(payload.instanceId) : null;
        emitWhere((info) => isCosmos(info) || (owner && info.userId === owner), event, payload);
      });
    }
  } catch (err) {
    console.error('[ws] Gagal memasang listener clusterManager:', err.message);
  }

  // ---- Sesi yang dicabut di server memutus soketnya seketika ----
  function kick(client, reason) {
    const info = sessions.get(client);
    if (info) info.leaving = reason;
    send(client, 'session.forced_logout', { reason });
    try {
      client.close(4401, reason);
    } catch (_) {}
  }

  sessionBus.on('session-replaced', ({ userId, sessionId }) => {
    for (const [client, info] of sessions) {
      if (info.userId === userId && info.sessionId !== sessionId) kick(client, 'session_replaced');
    }
  });

  sessionBus.on('user-revoked', ({ userId, reason, sessionId }) => {
    for (const [client, info] of sessions) {
      if (info.userId !== userId) continue;
      if (sessionId && info.sessionId !== sessionId) continue;
      kick(client, reason || 'expired');
    }
  });

  // ---- Koneksi ----
  function sendInitialPrimaryState(client) {
    const currentStatus = botManager.getStatus();
    send(client, 'STATUS', currentStatus);
    send(client, 'LOG_HISTORY', botManager.getLogs());
    if (currentStatus.lastQrDataUrl) send(client, 'QR', { qrDataUrl: currentStatus.lastQrDataUrl });
    if (currentStatus.pairingCode) send(client, 'PAIRING_CODE', { code: currentStatus.pairingCode });
  }

  function dropSession(client) {
    const info = sessions.get(client);
    if (!info) return;
    if (info.expTimer) clearTimeout(info.expTimer);
    sessions.delete(client);
    markGone(info);
  }

  wss.on('connection', (client) => {
    client.missed = 0;
    client.rateStart = Date.now();
    client.rateCount = 0;
    client.rateWarnedAt = 0;
    client.on('pong', () => { client.missed = 0; });

    const authTimer = setTimeout(() => {
      if (sessions.has(client)) return;
      send(client, 'AUTH_FAIL', { reason: 'timeout' });
      try { client.close(4401, 'auth timeout'); } catch (_) {}
    }, AUTH_TIMEOUT_MS);

    client.on('message', (raw) => {
      client.missed = 0;
      const now = Date.now();
      if (now - client.rateStart >= 1000) {
        client.rateStart = now;
        client.rateCount = 0;
      }
      client.rateCount += 1;
      if (client.rateCount > MAX_MESSAGES_PER_SECOND) {
        if (now - client.rateWarnedAt > 1000) {
          client.rateWarnedAt = now;
          send(client, 'RATE_LIMITED', {});
        }
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw.toString());
      } catch (_) {
        return;
      }
      if (!parsed || typeof parsed.type !== 'string') return;

      if (parsed.type === 'PING') {
        sendRaw(client, JSON.stringify({ type: 'PONG' }));
        return;
      }

      if (parsed.type === 'AUTH' && !sessions.has(client)) {
        const result = resolveSession(typeof parsed.token === 'string' ? parsed.token : '');
        if (!result.ok) {
          clearTimeout(authTimer);
          send(client, 'AUTH_FAIL', { reason: result.body.code || 'UNAUTHENTICATED', forceLogout: Boolean(result.body.forceLogout) });
          try { client.close(4401, 'auth failed'); } catch (_) {}
          return;
        }
        clearTimeout(authTimer);
        const user = result.user;
        const info = { userId: user.id, username: user.username, role: user.role, sessionId: user.sessionId || '', expTimer: null, leaving: '' };
        if (user.exp) {
          const remaining = user.exp * 1000 - Date.now();
          if (remaining <= 0) {
            send(client, 'AUTH_FAIL', { reason: 'UNAUTHENTICATED', forceLogout: true });
            try { client.close(4401, 'expired'); } catch (_) {}
            return;
          }
          info.expTimer = setTimeout(() => kick(client, 'expired'), Math.min(remaining, MAX_TIMEOUT_MS));
        }
        sessions.set(client, info);
        send(client, 'AUTH_OK', { userId: info.userId, role: info.role });
        markOnline(info);
        if (isCosmos(info)) sendInitialPrimaryState(client);
      }
      // Pesan lain dari klien tidak dikenal dan diabaikan.
    });

    client.on('close', () => {
      clearTimeout(authTimer);
      dropSession(client);
    });

    client.on('error', (err) => {
      console.error('[ws] Client socket error:', err.message);
    });
  });

  // Soket yang diam-diam mati (jaringan putus tanpa FIN) dibersihkan lewat ping bawaan protokol.
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.missed >= MISSED_PONG_LIMIT) {
        client.terminate();
        continue;
      }
      client.missed += 1;
      try { client.ping(); } catch (_) {}
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));

  console.log('[ws] WebSocket server terpasang pada /ws (autentikasi wajib)');
  return wss;
}

module.exports = { setupWebSocket, broadcastWs, onlineUserIds };
