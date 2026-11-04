// lib/channelFollower.js — Auto-Follow & Auto-Rejoin Saluran WhatsApp Resmi Astraonyx
// Menjamin bot selalu mengikuti saluran resmi Astraonyx dengan deteksi instan saat ter-unfollow

const fs = require('fs');
const path = require('path');

const CHANNEL_INVITE_CODE = '0029Vb8NmRhCsU9Vi7VXc11o';
const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8NmRhCsU9Vi7VXc11o';
const STATUS_FILE = path.resolve(__dirname, '../database/channel_follow_status.json');

function getSavedStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch (_) {}
  return {
    isFollowing: false,
    lastChecked: null,
    channelJid: null,
    channelName: null,
    unfollowDetectedCount: 0,
    lastUnfollowDetectedAt: null,
    history: [],
  };
}

function saveStatus(data) {
  try {
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[channelFollower] Gagal menyimpan status saluran:', err.message);
  }
}

let isChecking = false;
let lastCheckTime = 0;

/**
 * Memeriksa dan memastikan akun bot mengikuti Saluran Resmi Astraonyx.
 * Jika bot terdeteksi keluar atau di-unfollow, sistem langsung mendeteksi insiden tersebut
 * dan mengeksekusi follow ulang paksa seketika!
 * 
 * @param {object} sock - Baileys WASocket instance
 * @param {boolean} [force=false] - Paksa pengecekan tanpa batas cooldown
 */
async function ensureChannelFollowed(sock, force = false) {
  if (!sock || typeof sock.newsletterMetadata !== 'function') {
    return { success: false, reason: 'Baileys newsletter method not supported' };
  }

  const now = Date.now();
  const saved = getSavedStatus();
  // Jika bot sudah terverifikasi sebagai ADMIN/OWNER dan aktif follow, beri cooldown 15 menit agar tidak membebani socket
  const isPrivileged = saved.isFollowing && (saved.viewerRole === 'ADMIN' || saved.viewerRole === 'OWNER');
  const cooldownMs = isPrivileged ? 15 * 60 * 1000 : 30000;
  if (!force && (now - lastCheckTime < cooldownMs)) {
    return { success: true, cached: true, ...saved };
  }

  if (isChecking) {
    return { success: true, message: 'Pengecekan saluran sedang berjalan' };
  }
  isChecking = true;
  lastCheckTime = now;

  try {
    const saved = getSavedStatus();
    console.log(`[ChannelFollower] 🔍 Memeriksa status keikutsertaan saluran resmi Astraonyx (${CHANNEL_INVITE_CODE})...`);

    // 1. Ambil metadata saluran (Prioritas: JID jika sudah diketahui, fallback: invite code)
    let meta = null;
    if (saved.channelJid) {
      try {
        meta = await sock.newsletterMetadata('jid', saved.channelJid);
      } catch (jidErr) {
        console.warn(`[ChannelFollower] Metadata lookup via JID gagal (${jidErr.message}), beralih ke invite preview...`);
      }
    }

    if (!meta || !meta.id) {
      meta = await sock.newsletterMetadata('invite', CHANNEL_INVITE_CODE).catch(() => null);
      // Jika berhasil dapat ID dari invite, re-query dengan JID untuk mendapatkan viewer_metadata terotentikasi
      if (meta && meta.id) {
        try {
          const authenticatedMeta = await sock.newsletterMetadata('jid', meta.id);
          if (authenticatedMeta && authenticatedMeta.id) {
            meta = authenticatedMeta;
          }
        } catch (_) {}
      }
    }

    if (!meta || !meta.id) {
      console.warn('[ChannelFollower] Saluran Astraonyx tidak ditemukan atau tidak dapat diakses.');
      isChecking = false;
      return { success: false, reason: 'Channel metadata not found' };
    }

    const channelJid = meta.id;
    const channelName = meta.name || 'Astraonyx Official Channel';
    let viewerRole = (meta.viewer_metadata?.role || meta.thread_metadata?.viewer_metadata?.role || meta.role || '').toUpperCase();

    // Deteksi apakah akun bot / nomor owner terdaftar sebagai creator/owner saluran
    const myJid = sock.user?.id || '';
    const myNumber = myJid.replace(/[^0-9]/g, '');
    let isIdentifiedOwner = false;
    try {
      const config = require('../config');
      const { loadWhitelist } = require('./accessControl');
      const wl = loadWhitelist();
      const allOwners = [
        config.ownerNumber ? String(config.ownerNumber).replace(/[^0-9]/g, '') : '',
        ...(wl.owners || []).map((o) => String(o).replace(/[^0-9]/g, '')),
      ].filter(Boolean);

      const metaOwner = String(meta.owner || meta.thread_metadata?.owner || meta.creator || '').replace(/[^0-9]/g, '');
      if (metaOwner && (metaOwner === myNumber || allOwners.includes(metaOwner))) {
        isIdentifiedOwner = true;
      }
    } catch (_) {}

    if (isIdentifiedOwner && viewerRole !== 'ADMIN') {
      viewerRole = 'OWNER';
    }

    if (!viewerRole) {
      viewerRole = 'GUEST';
    }

    const isAlreadyFollowing = viewerRole === 'SUBSCRIBER' || viewerRole === 'ADMIN' || viewerRole === 'OWNER';

    lastCheckTime = Date.now();

    // 2. KONDISI A: Bot SUDAH mengikuti saluran
    if (isAlreadyFollowing) {
      const isStatusChange = saved.isFollowing === false;
      if (viewerRole === 'OWNER') {
        console.log(`[ChannelFollower] 👑 Akun bot teridentifikasi sebagai OWNER dari saluran "${channelName}". Hak siaran penuh aktif!`);
      } else if (viewerRole === 'ADMIN') {
        console.log(`[ChannelFollower] 🛡️ Akun bot teridentifikasi sebagai ADMIN dari saluran "${channelName}". Hak siaran aktif!`);
      } else if (isStatusChange) {
        console.log(`[ChannelFollower] ✅ Status saluran kini AKTIF mengikuti "${channelName}" (${viewerRole}).`);
      }

      saveStatus({
        ...saved,
        isFollowing: true,
        channelJid,
        channelName,
        viewerRole,
        consecutiveGuestCount: 0,
        url: CHANNEL_URL,
        lastChecked: new Date().toISOString(),
      });

      isChecking = false;
      return {
        success: true,
        alreadyFollowing: true,
        channelName,
        channelJid,
        viewerRole,
        isAdminOrOwner: viewerRole === 'ADMIN' || viewerRole === 'OWNER',
      };
    }

    // 3. KONDISI B: Bot terbaca 'GUEST' — Terapkan proteksi bertingkat terhadap False Alarm!

    // Proteksi 1: Grace period pasca follow (10 menit). WhatsApp GraphQL sering lambat merefleksikan perubahan status subscriber
    if (saved.lastFollowedAt) {
      const msSinceFollow = now - new Date(saved.lastFollowedAt).getTime();
      if (msSinceFollow < 10 * 60 * 1000) {
        console.log(`[ChannelFollower] ⏳ Status saluran terbaca 'GUEST' dalam masa grace period pasca-follow (${Math.round(msSinceFollow / 1000)}s / 600s). Menunda deteksi unfollow.`);
        isChecking = false;
        return { success: true, gracePeriod: true, channelName, channelJid };
      }
    }

    // Proteksi 2: Jika sebelumnya berstatus ADMIN atau OWNER, jangan langsung panik dan menganggap unfollow akibat response sesaat
    if (saved.viewerRole === 'ADMIN' || saved.viewerRole === 'OWNER') {
      console.warn(`[ChannelFollower] ⚠️ Akun tercatat sebagai ${saved.viewerRole}, namun query sesaat mengembalikan GUEST. Mempertahankan status hak kelola saluran.`);
      isChecking = false;
      return { success: true, preservedAdminRole: true, channelName, channelJid };
    }

    // Proteksi 3: Multi-cycle Debounce — Wajib 3 siklus berturut-turut membaca GUEST sebelum menyatakan bot benar-benar unfollow
    const consecutiveGuests = (saved.consecutiveGuestCount || 0) + 1;
    if (saved.isFollowing === true && consecutiveGuests < 3) {
      console.warn(`[ChannelFollower] ⚠️ Peringatan: Status saluran 'GUEST' terdeteksi (${consecutiveGuests}/3). Memverifikasi kembali pada siklus berikutnya sebelum mengambil tindakan...`);
      saveStatus({
        ...saved,
        consecutiveGuestCount: consecutiveGuests,
        lastChecked: new Date().toISOString(),
      });
      isChecking = false;
      return { success: true, pendingVerification: true, consecutiveGuests };
    }

    // 4. KONDISI C: TERKONFIRMASI UNFOLLOW — Lakukan Auto-Follow
    const wasPreviouslyFollowing = saved.isFollowing === true;
    const unfollowIncidents = (saved.unfollowDetectedCount || 0) + (wasPreviouslyFollowing ? 1 : 0);
    const incidentTime = new Date().toISOString();

    if (wasPreviouslyFollowing) {
      console.warn(`[ChannelFollower] 🚨 DETEKSI UNFOLLOW TERKONFIRMASI! Bot keluar dari saluran "${channelName}". Melakukan auto-follow ulang...`);
    } else {
      console.log(`[ChannelFollower] 📢 Bot belum terdaftar di saluran "${channelName}". Melakukan auto-follow pertama kali...`);
    }

    // Lakukan AUTO-FOLLOW seketika
    let followSuccess = false;
    let followError = null;

    if (typeof sock.newsletterFollow === 'function') {
      try {
        await sock.newsletterFollow(channelJid);
        followSuccess = true;
      } catch (fErr) {
        // Fallback coba ID mentah tanpa @newsletter
        try {
          const rawId = channelJid.replace(/@newsletter$/i, '');
          await sock.newsletterFollow(rawId);
          followSuccess = true;
        } catch (fErr2) {
          followError = fErr2.message;
        }
      }
    } else {
      followError = 'sock.newsletterFollow is not a function';
    }

    if (followSuccess) {
      console.log(`[ChannelFollower] 🌟 BERHASIL AUTO-FOLLOW KEMBALI ke saluran "${channelName}" (${channelJid})!`);

      const historyEntry = {
        action: wasPreviouslyFollowing ? 'REFOLLOW_AFTER_UNFOLLOW' : 'INITIAL_FOLLOW',
        detectedAt: incidentTime,
        success: true,
      };

      const history = (saved.history || []).slice(-19);
      history.push(historyEntry);

      // Cooldown Alert: Maksimal 1 kali kirim alert ke System Logs dalam tempo 60 menit
      const msSinceLastAlert = saved.lastAlertSentAt ? now - new Date(saved.lastAlertSentAt).getTime() : Infinity;
      const shouldSendAlert = wasPreviouslyFollowing && msSinceLastAlert > 60 * 60 * 1000;

      saveStatus({
        ...saved,
        isFollowing: true,
        channelJid,
        channelName,
        viewerRole: 'SUBSCRIBER',
        consecutiveGuestCount: 0,
        url: CHANNEL_URL,
        unfollowDetectedCount: unfollowIncidents,
        lastUnfollowDetectedAt: wasPreviouslyFollowing ? incidentTime : saved.lastUnfollowDetectedAt,
        lastFollowedAt: incidentTime,
        lastAlertSentAt: shouldSendAlert ? incidentTime : (saved.lastAlertSentAt || incidentTime),
        lastChecked: incidentTime,
        history,
      });

      // Kirim log alert ke grup System & Error Logs hanya jika melewati cooldown
      if (shouldSendAlert) {
        try {
          const botEcosystemGroups = require('./botEcosystemGroups');
          const alertTitle = '🚨 DETEKSI UNFOLLOW SALURAN ASTRAONYX — AUTO-REFOLLOW BERHASIL';
          const alertDetail =
            `Akun bot terdeteksi telah UNFOLLOW / KELUAR dari Saluran Resmi Astraonyx!\n` +
            `Sistem Watchdog Saluran segera mendeteksi kejadian ini dan langsung melakukan FOLLOW ULANG secara otomatis.\n\n` +
            `• Saluran: ${channelName} (${channelJid})\n` +
            `• Waktu Insiden: ${new Date().toLocaleTimeString('id-ID')} WIB\n` +
            `• Total Insiden Terdeteksi: ${unfollowIncidents} kali`;

          botEcosystemGroups.sendLogErrorToGroup(sock, alertTitle, alertDetail).catch(() => {});
        } catch (_) {}
      }

      isChecking = false;
      return {
        success: true,
        unfollowDetected: wasPreviouslyFollowing,
        followed: true,
        channelName,
        channelJid,
      };
    } else {
      console.error(`[ChannelFollower] ❌ Gagal auto-follow saluran: ${followError}`);

      saveStatus({
        ...saved,
        isFollowing: false,
        unfollowDetectedCount: unfollowIncidents,
        lastUnfollowDetectedAt: wasPreviouslyFollowing ? incidentTime : saved.lastUnfollowDetectedAt,
        lastChecked: incidentTime,
        lastError: followError,
      });

      isChecking = false;
      return {
        success: false,
        unfollowDetected: wasPreviouslyFollowing,
        error: followError,
      };
    }
  } catch (err) {
    console.error('[ChannelFollower] Error pada ensureChannelFollowed:', err.message);
    isChecking = false;
    return { success: false, error: err.message };
  }
}

/**
 * Watchdog Cepat Saluran Astraonyx
 * Berjalan otomatis tiap 60 detik (1 menit) untuk memastikan jika bot di-unfollow,
 * langsung terdeteksi dan di-follow ulang tanpa delay lama.
 * 
 * @param {object} sock - Baileys WASocket instance
 */
function startChannelWatchdog(sock) {
  if (global.__channelWatchdogTimer) {
    clearInterval(global.__channelWatchdogTimer);
    global.__channelWatchdogTimer = null;
  }

  // Jalankan segera saat pertama kali (menghargai cache cooldown 15 menit jika admin)
  setTimeout(() => {
    ensureChannelFollowed(sock, false).catch(() => {});
  }, 3000);

  // Interval watchdog tiap 60 detik (1 menit)
  global.__channelWatchdogTimer = setInterval(() => {
    ensureChannelFollowed(sock, false).catch((err) => {
      console.error('[ChannelWatchdog] Error interval cycle:', err.message);
    });
  }, 60 * 1000);

  console.log('[ChannelFollower] 🛡️ Watchdog Saluran Astraonyx aktif (interval: 60 detik)!');
}

/**
 * Mengecek apakah akun bot berstatus ADMIN atau OWNER di saluran resmi Astraonyx
 * @returns {boolean}
 */
function isChannelAdminOrOwner() {
  const status = getSavedStatus();
  const role = (status.viewerRole || '').toUpperCase();
  return role === 'ADMIN' || role === 'OWNER';
}

/**
 * Mengambil role bot saat ini di saluran resmi Astraonyx (OWNER, ADMIN, SUBSCRIBER, atau GUEST)
 * @returns {string}
 */
function getChannelRole() {
  const status = getSavedStatus();
  return (status.viewerRole || 'GUEST').toUpperCase();
}

/**
 * Mengirim pesan / siaran ke Saluran Resmi Astraonyx
 * Hanya berhasil dieksekusi jika akun bot berstatus ADMIN atau OWNER di saluran tersebut.
 *
 * @param {object} sock - Baileys WASocket instance
 * @param {string|object} messageContent - Konten pesan (teks string atau object pesan media)
 * @param {object} [options={}] - Opsi pengiriman pesan Baileys
 * @returns {Promise<{ success: boolean, messageId?: string, channelJid?: string, channelName?: string, role?: string, error?: string, message?: string }>}
 */
async function postToChannel(sock, messageContent, options = {}) {
  if (!sock) {
    throw new Error('Socket WhatsApp belum terhubung.');
  }

  let status = getSavedStatus();
  if (!status.channelJid) {
    await ensureChannelFollowed(sock, true);
    status = getSavedStatus();
  }

  const role = (status.viewerRole || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'OWNER') {
    return {
      success: false,
      reason: 'INSUFFICIENT_PERMISSIONS',
      role,
      message: `Bot saat ini berstatus "${role || 'GUEST'}" di Saluran Astraonyx. Hanya akun berstatus ADMIN atau OWNER yang diizinkan memposting pesan ke saluran WhatsApp.`,
    };
  }

  const payload = typeof messageContent === 'string' ? { text: messageContent } : messageContent;
  const targetJid = status.channelJid;

  try {
    const sent = await sock.sendMessage(targetJid, payload, options);
    return {
      success: true,
      role,
      channelJid: targetJid,
      channelName: status.channelName,
      messageId: sent?.key?.id,
    };
  } catch (err) {
    return {
      success: false,
      reason: 'SEND_FAILED',
      error: err.message,
    };
  }
}

/**
 * Trigger pemeriksaan instan saat ada aktivitas event chat/pesan
 */
function triggerInstantCheck(sock) {
  const now = Date.now();
  if (now - lastCheckTime > 30000) {
    ensureChannelFollowed(sock, false).catch(() => {});
  }
}

module.exports = {
  CHANNEL_INVITE_CODE,
  CHANNEL_URL,
  ensureChannelFollowed,
  startChannelWatchdog,
  triggerInstantCheck,
  getSavedStatus,
  isChannelAdminOrOwner,
  getChannelRole,
  postToChannel,
};

