// astraonyx/polaris/events/connectionUpdate.js — Handler event connection.update Baileys
const { DisconnectReason } = require('baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const config = require('../../../config');
const contactsManager = require('../../../lib/contactsManager');
const groupsManager = require('../../../lib/groupsManager');
const channelFollower = require('../../../lib/channelFollower');
const botEcosystemGroups = require('../../../lib/botEcosystemGroups');
const ecosystemNewsScheduler = require('../../../lib/ecosystemNewsScheduler');
const ecosystemAcademyScheduler = require('../../../lib/ecosystemAcademyScheduler');
const { startReminderScheduler } = require('../../../lib/reminderScheduler');
const { startCleanupScheduler } = require('../../../lib/cleanupScheduler');
const { startTaskReminderScheduler } = require('../../../lib/taskReminderScheduler');
const timeCapsuleEngine = require('../../../lib/timeCapsuleEngine');
const bossRaidScheduler = require('../../../lib/bossRaidScheduler');

/**
 * Mendaftarkan event listener connection.update ke socket Baileys
 */
function handleConnectionUpdate(sock, { pairingNumber, requestPairing, isAlreadyAuthenticated, getPairingRequested, reconnectCallback }) {
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Pemicu: Saat QR siap atau connection connecting, jika pairing code aktif
    if (pairingNumber && !isAlreadyAuthenticated() && !getPairingRequested()) {
      if (qr || connection === 'connecting') {
        setTimeout(requestPairing, 1200);
      }
    }

    if (qr) {
      if (!pairingNumber) {
        console.log(`\n[${config.botName}] Scan QR ini pakai WhatsApp di HP bot:\n`);
        qrcode.generate(qr, { small: true });
        console.log(`[${config.botName}] QR_RAW:${qr}`);
      }
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`[${config.botName}] Koneksi terputus (Status: ${statusCode}, Reason: ${lastDisconnect?.error?.message || lastDisconnect?.error || 'unknown'}), reconnect dalam 5 detik...`);
      if (loggedOut) {
        console.log(`[${config.botName}] Logged out. Hapus folder auth_info/ dan scan ulang QR.`);
      } else {
        setTimeout(reconnectCallback, 5000);
      }
    } else if (connection === 'open') {
      console.log(`[${config.botName}] Bot tersambung ke WhatsApp!`);
      global.__activeWASocket = sock;
      if (process.send) process.send({ type: 'BOT_CONNECTED' });

      // Ambil foto profil WhatsApp bot untuk kanvas dashboard
      try {
        const myJid = sock.user?.id;
        if (myJid) {
          sock.profilePictureUrl(myJid, 'image').then((picUrl) => {
            if (picUrl) {
              contactsManager.saveBotProfile({ profilePicUrl: picUrl, name: sock.user?.name || config.botName });
              if (process.send) process.send({ type: 'BOT_PROFILE', profilePicUrl: picUrl });
            }
          }).catch(() => {});
        }
      } catch (_) {}

      // Ambil dan sinkronkan daftar seluruh nama grup WhatsApp
      try {
        console.log(`[${config.botName}] Menyinkronkan daftar nama grup WhatsApp...`);
        sock.groupFetchAllParticipating().then((groups) => {
          if (groups && typeof groups === 'object') {
            const count = groupsManager.syncGroupsFromBaileys(groups);
            console.log(`[${config.botName}] Berhasil sinkronkan ${count} nama grup WhatsApp!`);
            if (process.send) process.send({ type: 'GROUPS_SYNCED', count });
          }
        }).catch((gErr) => {
          console.error(`[${config.botName}] Gagal fetch groups participating:`, gErr.message);
        });
      } catch (e) {
        console.error(`[${config.botName}] Error sync groups:`, e.message);
      }

      // Schedulers background runner
      if (!global.__reminderSchedulerStarted) {
        global.__reminderSchedulerStarted = true;
        startReminderScheduler(sock);
      }

      if (!global.__cleanupSchedulerStarted) {
        global.__cleanupSchedulerStarted = true;
        startCleanupScheduler();
      }

      if (!global.__timeCapsuleSchedulerStarted) {
        global.__timeCapsuleSchedulerStarted = true;
        setInterval(() => {
          timeCapsuleEngine.checkDueCapsules(sock).catch((err) => {
            console.error(`[${config.botName}] Error checkDueCapsules:`, err.message);
          });
        }, 30000);
      }

      if (!global.__bossRaidSchedulerStarted) {
        global.__bossRaidSchedulerStarted = true;
        bossRaidScheduler.startBossRaidScheduler(sock);
      }

      if (!global.__taskReminderSchedulerStarted) {
        global.__taskReminderSchedulerStarted = true;
        startTaskReminderScheduler(sock);
      }

      // Channel follower watchdog
      try {
        channelFollower.startChannelWatchdog(sock);
      } catch (cfErr) {
        console.error(`[${config.botName}] Error startChannelWatchdog:`, cfErr.message);
      }

      // Ekosistem watchdog
      try {
        botEcosystemGroups.startEcosystemWatchdog(sock);
      } catch (ewErr) {
        console.error(`[${config.botName}] Error startEcosystemWatchdog:`, ewErr.message);
      }

      // Inisialisasi 5 grup ekosistem
      if (!global.__ecosystemCheckedThisSession) {
        global.__ecosystemCheckedThisSession = true;
        setTimeout(() => {
          botEcosystemGroups.ensureEcosystemGroups(sock).then((ecoRes) => {
            if (ecoRes?.newlyCreatedCount > 0) {
              console.log(`[${config.botName}] Sukses inisialisasi ${ecoRes.newlyCreatedCount} grup ekosistem baru.`);
            }
            ecosystemNewsScheduler.startNewsScheduler(sock);
            ecosystemAcademyScheduler.startAcademyScheduler(sock);
          }).catch((ecoErr) => {
            if (typeof botEcosystemGroups.logEcosystemTerminalError === 'function') {
              botEcosystemGroups.logEcosystemTerminalError('Startup Inisialisasi Ekosistem Gagal', ecoErr);
            }
            console.error(`[${config.botName}] Error ensureEcosystemGroups:`, ecoErr.message);
          });
        }, 3000);
      }
    }
  });
}

module.exports = { handleConnectionUpdate };
