// server/routes/autoresponders.js — Visual Auto-Responder Rule Engine
const express = require('express');
const { authenticateToken, requireWriteAccess } = require('../auth');
const { autoResponderQueries } = require('../db');
const autoResponderEngine = require('../../lib/autoResponderEngine');

const router = express.Router();

// Ambil seluruh aturan autoresponder
router.get('/', authenticateToken, (req, res) => {
  try {
    const rules = autoResponderQueries.getAll.all();
    res.json({ success: true, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tambah aturan baru
router.post('/', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const keyword = (req.body?.keyword || '').trim();
    const match_type = req.body?.match_type || req.body?.matchType || 'contains';
    const response_type = req.body?.response_type || req.body?.responseType || 'text';
    const response_content = (req.body?.response_content || req.body?.content || '').trim();
    const media_url = (req.body?.media_url || req.body?.mediaUrl || '').trim();
    const scope = req.body?.scope || 'all';

    if (!keyword || !response_content) {
      return res.status(400).json({ success: false, error: 'Kata kunci (keyword) dan teks balasan wajib diisi.' });
    }

    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const ruleData = {
      id,
      keyword,
      match_type,
      response_type,
      response_content,
      media_url,
      scope,
      is_active: 1,
      created_at: now,
      updated_at: now,
    };

    autoResponderQueries.insert.run(ruleData);
    autoResponderEngine.invalidateRuleCache();
    res.json({ success: true, message: 'Aturan auto-responder berhasil disimpan.', id, rule: ruleData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update aturan
router.put('/:id', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { id } = req.params;
    const rule = autoResponderQueries.getById.get(id);

    if (!rule) {
      return res.status(404).json({ success: false, error: 'Aturan tidak ditemukan.' });
    }

    const keyword = req.body?.keyword;
    const match_type = req.body?.match_type || req.body?.matchType;
    const response_type = req.body?.response_type || req.body?.responseType;
    const response_content = req.body?.response_content || req.body?.content;
    const media_url = req.body?.media_url || req.body?.mediaUrl;
    const scope = req.body?.scope;
    const is_active = typeof req.body?.is_active !== 'undefined' ? req.body.is_active : req.body?.isActive;
    const now = new Date().toISOString();

    if (typeof is_active !== 'undefined' && Object.keys(req.body).length <= 2) {
      autoResponderQueries.toggle.run(is_active ? 1 : 0, now, id);
    } else {
      autoResponderQueries.update.run({
        id,
        keyword: typeof keyword !== 'undefined' ? keyword.trim() : rule.keyword,
        match_type: match_type || rule.match_type,
        response_type: response_type || rule.response_type,
        response_content: typeof response_content !== 'undefined' ? response_content.trim() : rule.response_content,
        media_url: typeof media_url !== 'undefined' ? (media_url || '').trim() : rule.media_url,
        scope: scope || rule.scope,
        is_active: typeof is_active !== 'undefined' ? (is_active ? 1 : 0) : rule.is_active,
        updated_at: now,
      });
    }

    autoResponderEngine.invalidateRuleCache();
    res.json({ success: true, message: 'Aturan auto-responder berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hapus aturan
router.delete('/:id', authenticateToken, requireWriteAccess, (req, res) => {
  try {
    const { id } = req.params;
    autoResponderQueries.delete.run(id);
    autoResponderEngine.invalidateRuleCache();
    res.json({ success: true, message: 'Aturan auto-responder berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
