// server/routes/data.js — Data Overview, Whitelist, Group & Chat Settings
const express = require('express');
const config = require('../../config');
const { authenticateToken, requireWriteAccess, requireRole } = require('../auth');
const {
  getWhitelist,
  saveWhitelist,
  getGroupSettings,
  saveGroupSettings,
  getPrivateChatSettings,
  savePrivateChatSettings,
  getRawFile,
  saveRawFile,
} = require('../dataBridge');
const { getAllCommands } = require('../commandManager');
const botManager = require('../botManager');
const contactsManager = require('../../lib/contactsManager');
const groupsManager = require('../../lib/groupsManager');
const botEcosystemGroups = require('../../lib/botEcosystemGroups');

const dataRouter = express.Router();
const contactsRouter = express.Router();
const groupsRouter = express.Router();

// ==================== DATA ROUTER (/api/data) ====================

// Ringkasan data untuk kartu statistik
dataRouter.get('/overview', authenticateToken, async (req, res) => {
  try {
    const whitelist = getWhitelist();
    const groupSettings = getGroupSettings();
    const allCommands = await getAllCommands();
    const botStatus = botManager.getStatus();

    const allowedGroupCount = Object.keys(groupSettings.allowedGroups || {}).filter(
      (k) => groupSettings.allowedGroups[k].allowed
    ).length;

    res.json({
      success: true,
      data: {
        botStatus: botStatus.status,
        botName: config.botName,
        prefix: config.prefix,
        ownerCount: (whitelist.owners || []).length,
        whitelistCount: (whitelist.allowed || []).length,
        allowedGroupsCount: allowedGroupCount,
        totalCommands: allCommands.length,
        activeCommands: allCommands.filter((c) => c.enabled).length,
        botProfile: contactsManager.getBotProfile(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Whitelist Bot
dataRouter.get('/whitelist', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const data = getWhitelist(instanceId);
    res.json({ success: true, data, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/whitelist', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const payload = req.body.data || req.body;
    saveWhitelist(payload, instanceId);
    res.json({ success: true, message: 'Whitelist berhasil diperbarui.', instanceId });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Pengaturan Grup WhatsApp
dataRouter.get('/groups', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const data = getGroupSettings(instanceId);
    const waGroups = groupsManager.getAllGroups(instanceId);

    if (data && data.allowedGroups) {
      for (const jid of Object.keys(data.allowedGroups)) {
        const g = data.allowedGroups[jid];
        const cached = waGroups[jid];
        if (cached?.name || cached?.subject) {
          g.name = cached.name || cached.subject;
          g.subject = cached.name || cached.subject;
          if (cached.participantsCount) g.participantsCount = cached.participantsCount;
        }
      }
    }
    res.json({ success: true, data, waGroups, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/groups/sync', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    if (!instanceId || instanceId === 'primary') {
      await botManager.syncGroupsLive();
    }
    const data = getGroupSettings(instanceId);
    const waGroups = groupsManager.getAllGroups(instanceId);

    if (data && data.allowedGroups) {
      for (const jid of Object.keys(data.allowedGroups)) {
        const g = data.allowedGroups[jid];
        const cached = waGroups[jid];
        if (cached?.name || cached?.subject) {
          g.name = cached.name || cached.subject;
          g.subject = cached.name || cached.subject;
          if (cached.participantsCount) g.participantsCount = cached.participantsCount;
        }
      }
    }
    res.json({ success: true, message: 'Daftar nama grup WhatsApp berhasil disinkronkan!', data, waGroups, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/groups', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const payload = req.body.data || req.body;
    saveGroupSettings(payload, instanceId);
    res.json({ success: true, message: 'Pengaturan grup berhasil disimpan.', instanceId });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

dataRouter.post('/groups/disallow-all', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const data = getGroupSettings(instanceId);
    let count = 0;
    if (data && data.allowedGroups) {
      for (const jid of Object.keys(data.allowedGroups)) {
        if (data.allowedGroups[jid].allowed) {
          data.allowedGroups[jid].allowed = false;
          count++;
        }
      }
      saveGroupSettings(data, instanceId);
    }
    res.json({
      success: true,
      count,
      instanceId,
      message: `Izin bot di seluruh grup (${count} grup) berhasil dinonaktifkan.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pengaturan Percakapan Pribadi (Private Chat)
dataRouter.get('/private-chats', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const data = getPrivateChatSettings(instanceId);
    res.json({ success: true, data, instanceId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

dataRouter.post('/private-chats', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const payload = req.body.data || req.body;
    savePrivateChatSettings(payload, instanceId);
    res.json({ success: true, message: 'Pengaturan private chat berhasil disimpan.', instanceId });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Raw File Editor (Khusus Cosmos)
dataRouter.get('/raw/:fileKey', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const content = getRawFile(req.params.fileKey);
    res.json({ success: true, content });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

dataRouter.post('/raw/:fileKey', authenticateToken, requireRole(['cosmos']), (req, res) => {
  try {
    const { content } = req.body;
    saveRawFile(req.params.fileKey, content);
    res.json({ success: true, message: `File ${req.params.fileKey} berhasil disimpan dengan backup otomatis.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== CONTACTS ROUTER (/api/contacts) ====================

contactsRouter.get('/', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || null;
    const contacts = contactsManager.getContacts(instanceId);
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

contactsRouter.post('/', authenticateToken, requireWriteAccess, (req, res) => {
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

// ==================== GROUPS ECOSYSTEM ROUTER (/api/groups) ====================

groupsRouter.get('/ecosystem', authenticateToken, (req, res) => {
  try {
    const ecoData = botEcosystemGroups.getSavedData();
    const allGroups = groupsManager.getAllGroups();
    res.json({
      success: true,
      ecosystem: ecoData.groups || {},
      community: ecoData.community || null,
      allGroups: allGroups || {},
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  dataRouter,
  contactsRouter,
  groupsRouter,
};
