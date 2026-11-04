// server/routes/story.js — WhatsApp Status / Story Studio & Templates
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { authenticateToken, requireWriteAccess } = require('../auth');
const storyTemplateManager = require('../../lib/storyTemplateManager');
const storyManager = require('../../lib/storyManager');
const botManager = require('../botManager');
const clusterManager = require('../clusterManager');

const router = express.Router();

// ==================== STORY AUDIENCE TEMPLATES ====================

router.get('/templates', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || req.query.botId || 'primary';
    const templates = storyTemplateManager.getTemplates(instanceId);
    res.json({
      success: true,
      data: templates,
      count: templates.length,
      maxLimit: storyTemplateManager.MAX_TEMPLATES,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/templates', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { name, contacts } = req.body;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = storyTemplateManager.createTemplate({ name, contacts }, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/templates/:id', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { name, contacts } = req.body;
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = storyTemplateManager.updateTemplate(req.params.id, { name, contacts }, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/templates/:id', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const instanceId = req.body.instanceId || req.query.instanceId || 'primary';
    const result = storyTemplateManager.deleteTemplate(req.params.id, instanceId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==================== STORY POST & DELETE ====================

// Posting Status WhatsApp (Teks / Media)
router.post('/post', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const {
      targetBotId,
      storyType,
      text,
      caption,
      bgColor,
      font,
      mediaBase64,
      mediaExt,
      audienceType,
      customContacts,
      excludedContacts,
      mentionedNumbers,
      tagGroups,
    } = req.body;

    if (!storyType) {
      return res.status(400).json({ success: false, error: 'Tipe story (text / media) harus ditentukan.' });
    }

    if (storyType === 'text' && (!text || !text.trim())) {
      return res.status(400).json({ success: false, error: 'Teks status tidak boleh kosong.' });
    }

    let mediaPath = null;
    if (storyType === 'media') {
      if (!mediaBase64 && !req.body.mediaPath) {
        return res.status(400).json({ success: false, error: 'File foto atau video status harus diunggah terlebih dahulu.' });
      }

      if (mediaBase64) {
        const uploadDir = path.resolve(__dirname, '../../', config.paths.tmpMedia || './tmp/media');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const safeExt = (mediaExt || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
        mediaPath = path.join(uploadDir, `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${safeExt}`);

        const base64Data = mediaBase64.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(mediaPath, Buffer.from(base64Data, 'base64'));
      } else if (req.body.mediaPath) {
        mediaPath = req.body.mediaPath;
      }
    }

    const storyPayload = {
      storyType,
      text: text ? text.trim() : '',
      caption: caption ? caption.trim() : '',
      bgColor: bgColor || '#005c4b',
      font: font || 1,
      mediaPath,
      mediaBase64,
      mediaExt,
      audienceType: audienceType || 'all',
      customContacts: Array.isArray(customContacts) ? customContacts : [],
      excludedContacts: Array.isArray(excludedContacts) ? excludedContacts : [],
      mentionedNumbers: mentionedNumbers || '',
      tagGroups: Array.isArray(tagGroups) ? tagGroups : [],
    };

    if (targetBotId && targetBotId !== 'primary') {
      const instances = clusterManager.listInstances(botManager);
      const targetInst = instances.find((inst) => inst.id === targetBotId);
      if (targetInst && !targetInst.isPrimary) {
        if (targetInst.status !== 'RUNNING') {
          return res.status(400).json({
            success: false,
            error: `Bot "${targetInst.name}" sedang OFFLINE. Nyalakan bot tersebut di menu Bot Cluster terlebih dahulu.`,
          });
        }
        try {
          const clusterRes = await clusterManager.postStory(targetBotId, storyPayload);
          return res.json(clusterRes);
        } catch (errCluster) {
          return res.status(500).json({
            success: false,
            error: `Gagal memposting story via ${targetInst.name}: ${errCluster.message}`,
          });
        }
      }
    }

    const result = await botManager.postStory(storyPayload);

    let notifDetail = '';
    if (result.audienceCount && result.audienceCount !== 'all') {
      notifDetail += ` (${result.audienceCount} kontak terpilih)`;
    }
    if (result.groupsNotified > 0) {
      notifDetail += ` + ${result.groupsNotified} grup diberitahu`;
    }

    res.json({ success: true, message: `Status WhatsApp berhasil diunggah${notifDetail}!`, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hapus status WhatsApp
router.post('/delete', authenticateToken, requireWriteAccess, async (req, res) => {
  try {
    const { targetBotId, storyId } = req.body;
    if (targetBotId && targetBotId !== 'primary') {
      const clusterRes = await clusterManager.deleteStory(targetBotId, storyId);
      return res.json({ success: true, message: 'Status WhatsApp berhasil dihapus!', data: clusterRes });
    }
    const result = await botManager.deleteStory(storyId);
    res.json({ success: true, message: 'Status WhatsApp berhasil dihapus!', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Status terbaru yang pernah diunggah
router.get('/recent', authenticateToken, (req, res) => {
  try {
    const instanceId = req.query.instanceId || 'primary';
    const stories = storyManager.getRecentStories(15, instanceId);
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
