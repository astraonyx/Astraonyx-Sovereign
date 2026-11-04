// server/routes/bot.js — Modular Bot Controller & Operation Routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireWriteAccess } = require('../auth');
const clusterManager = require('../clusterManager');
const botManager = require('../botManager');
const botOutputCache = require('../../lib/botOutputCache');
const botEcosystemGroups = require('../../lib/botEcosystemGroups');
const channelFollower = require('../../lib/channelFollower');
const contactsManager = require('../../lib/contactsManager');

const router = express.Router();

// 1. Status Bot
router.get('/status', authenticateToken, (req, res) => {
  try {
    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const instances = clusterManager.listInstances(botManager, req.user);
      const myInst = instances.find((i) => i.id === userBot.id) || instances[0];
      if (myInst) {
        return res.json({
          success: true,
          status: myInst.botStatus || 'OFFLINE',
          isRunning: myInst.status === 'RUNNING',
          lastQrDataUrl: myInst.lastQrDataUrl || null,
          pairingCode: myInst.pairingCode || null,
          startedAt: null,
          uptime: 0,
          botName: myInst.name,
          prefix: myInst.prefix || '/',
          isIsolatedUserBot: true,
          botId: myInst.id,
        });
      }
    }
    res.json({ success: true, ...botManager.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Start Bot
router.post('/start', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { pairingNumber } = req.body || {};
    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const result = await clusterManager.startInstance(userBot.id, { pairingNumber }, req.user);
      return res.json(result);
    }
    const result = await botManager.startBot({ pairingNumber });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Stop Bot
router.post('/stop', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const result = await clusterManager.stopInstance(userBot.id, req.user);
      return res.json(result);
    }
    const result = await botManager.stopBot();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Restart Bot
router.post('/restart', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { pairingNumber } = req.body || {};
    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const result = await clusterManager.restartBotInstance(userBot.id, req.headers.authorization, req.user, { pairingNumber });
      return res.json(result);
    }
    const result = await botManager.restartBot({ pairingNumber });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Pairing Code
router.post('/pair', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nomor telepon wajib diisi.' });
    let cleanNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) cleanNumber = '62' + cleanNumber.slice(1);
    else if (cleanNumber.startsWith('8')) cleanNumber = '62' + cleanNumber;

    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const result = await clusterManager.pairInstance(userBot.id, cleanNumber, req.headers.authorization, req.user);
      return res.json({ success: true, message: `Meminta kode pairing untuk nomor ${cleanNumber}...`, ...result });
    }
    const result = await botManager.restartBot({ pairingNumber: cleanNumber });
    res.json({ success: true, message: `Meminta kode pairing untuk nomor ${cleanNumber}...`, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Reset Session
router.post('/reset-session', authenticateToken, async (req, res) => {
  try {
    const userBot = clusterManager.ensureUserInstance(req.user);
    if (userBot) {
      const result = await clusterManager.resetSession(userBot.id, req.user);
      return res.json(result);
    }
    const result = await botManager.deleteSession();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Clear Logs
router.post('/clear-logs', authenticateToken, (req, res) => {
  const userBot = clusterManager.ensureUserInstance(req.user);
  if (userBot) {
    clusterManager.clearLogs(userBot.id, req.user);
    return res.json({ success: true });
  }
  botManager.clearLogs();
  res.json({ success: true });
});

// 8. Bot Outputs Cache
router.get('/outputs', authenticateToken, (req, res) => {
  try {
    const outputs = botOutputCache.getCachedOutputs();
    res.json({ success: true, outputs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Edit Bot Message Output
router.post('/message/edit', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { targetStanzaId, text, destination, chatJid } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Teks pesan baru tidak boleh kosong.' });
    }
    const result = await botManager.editMessage({ targetStanzaId, text, destination, chatJid });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Ecosystem Groups Status & Relink
router.get('/ecosystem-groups', authenticateToken, (req, res) => {
  try {
    const data = botEcosystemGroups.getSavedData();
    res.json({ success: true, ...data, specs: botEcosystemGroups.ECOSYSTEM_SPECS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ecosystem-relink', authenticateToken, async (req, res) => {
  try {
    const result = await botManager.relinkEcosystem();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Channel Status
router.get('/channel-status', authenticateToken, (req, res) => {
  try {
    const data = channelFollower.getSavedStatus();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Bot Profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || null;
    const profile = contactsManager.getBotProfile(instanceId);
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12b. Contacts List & Add (Under /api/bot/contacts)
router.get('/contacts', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || null;
    const contacts = contactsManager.getContacts(instanceId);
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/contacts', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { number, name, instanceId } = req.body || {};
    if (!number) {
      return res.status(400).json({ success: false, error: 'Nomor WhatsApp wajib diisi (diawali 62).' });
    }
    const targetInst = instanceId || req.query.instanceId || null;
    const result = contactsManager.addContact({ number, name }, targetInst);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13. Contacts Import & Sample
router.post('/contacts/import', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { vcardText, contacts, instanceId } = req.body;
    const targetInst = instanceId || req.query.instanceId || null;
    if (vcardText) {
      const result = contactsManager.importVCard(vcardText, targetInst);
      return res.json(result);
    } else if (Array.isArray(contacts)) {
      let added = 0;
      contacts.forEach((c) => {
        const rawNum = typeof c === 'string' ? c : c.number;
        const rawName = typeof c === 'object' ? c.name : '';
        const num = contactsManager.normalizePhoneNumber(rawNum);
        if (num) {
          contactsManager.recordContact(`${num}@s.whatsapp.net`, rawName, targetInst);
          added++;
        }
      });
      return res.json({
        success: true,
        addedCount: added,
        totalContacts: contactsManager.getContacts(targetInst).length,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Payload tidak valid: Sertakan vcardText (string) atau contacts (array).',
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/contacts/sample', authenticateToken, (req, res) => {
  try {
    const samplePath = path.resolve(__dirname, '../../database/00001.txt');
    if (fs.existsSync(samplePath)) {
      const vcardText = fs.readFileSync(samplePath, 'utf-8');
      res.json({ success: true, vcardText });
    } else {
      res.status(404).json({ success: false, error: 'Berkas sampel kontak 00001.txt tidak ditemukan.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
