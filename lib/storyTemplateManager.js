// lib/storyTemplateManager.js — Manajemen Template Audiens Story WA (Maksimal 10 Template)
// Menyediakan penyimpanan, validasi ketat nomor telepon, dan proteksi duplikasi

const fs = require('fs');
const path = require('path');
const contactsManager = require('./contactsManager');

const DEFAULT_FILE = path.resolve(__dirname, '../database/story_audience_templates.json');
const MAX_TEMPLATES = 10;

function getFilePath(instanceId = null) {
  if (!instanceId || instanceId === 'primary') {
    return DEFAULT_FILE;
  }
  const instDir = path.resolve(__dirname, `../instances/${instanceId}/database`);
  if (!fs.existsSync(instDir)) {
    fs.mkdirSync(instDir, { recursive: true });
  }
  return path.join(instDir, 'story_audience_templates.json');
}

function readTemplates(instanceId = null) {
  const filePath = getFilePath(instanceId);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content || '[]');
      if (Array.isArray(data) && data.length > 0) return data;
    }
    // Fallback: Jika bot instance belum memiliki template terpisah, gunakan template global/primary agar tidak hilang
    if (instanceId && instanceId !== 'primary' && fs.existsSync(DEFAULT_FILE)) {
      const content = fs.readFileSync(DEFAULT_FILE, 'utf-8');
      const data = JSON.parse(content || '[]');
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('[storyTemplateManager] Gagal membaca berkas template:', err.message);
  }
  return [];
}

function writeTemplates(templates, instanceId = null) {
  const filePath = getFilePath(instanceId);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[storyTemplateManager] Gagal menyimpan berkas template:', err.message);
    throw err;
  }
}

function getTemplates(instanceId = null) {
  return readTemplates(instanceId);
}

function sanitizeContacts(rawContacts) {
  if (!Array.isArray(rawContacts)) {
    if (typeof rawContacts === 'string') {
      rawContacts = rawContacts.split(/[,;\s\n]+/);
    } else {
      return [];
    }
  }

  const uniqueNumbers = new Set();
  rawContacts.forEach((item) => {
    let raw = '';
    if (typeof item === 'string') {
      raw = item;
    } else if (item && typeof item === 'object') {
      raw = item.number || item.id || item.jid || '';
    }
    const clean = contactsManager.normalizePhoneNumber(raw);
    if (clean && contactsManager.isValidPhoneNumber(clean)) {
      uniqueNumbers.add(clean);
    }
  });

  return Array.from(uniqueNumbers);
}

function createTemplate({ name, contacts }, instanceId = null) {
  const templates = readTemplates(instanceId);

  if (templates.length >= MAX_TEMPLATES) {
    throw new Error(`Kapasitas template penuh! Maksimal ${MAX_TEMPLATES} template audiens yang diizinkan. Silakan hapus template lama terlebih dahulu.`);
  }

  const cleanName = String(name || '').trim();
  if (!cleanName) {
    throw new Error('Nama template audiens wajib diisi.');
  }

  const validContacts = sanitizeContacts(contacts);
  if (validContacts.length === 0) {
    throw new Error('Template harus memiliki minimal 1 nomor kontak yang valid.');
  }

  const newTemplate = {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    contacts: validContacts,
    count: validContacts.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  writeTemplates(templates, instanceId);

  return {
    success: true,
    data: newTemplate,
    totalTemplates: templates.length,
    maxLimit: MAX_TEMPLATES,
  };
}

function updateTemplate(id, { name, contacts }, instanceId = null) {
  const templates = readTemplates(instanceId);
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    throw new Error(`Template dengan ID '${id}' tidak ditemukan.`);
  }

  if (name !== undefined) {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Nama template audiens tidak boleh kosong.');
    templates[index].name = cleanName;
  }

  if (contacts !== undefined) {
    const validContacts = sanitizeContacts(contacts);
    if (validContacts.length === 0) {
      throw new Error('Template harus memiliki minimal 1 nomor kontak yang valid.');
    }
    templates[index].contacts = validContacts;
    templates[index].count = validContacts.length;
  }

  templates[index].updatedAt = new Date().toISOString();
  writeTemplates(templates, instanceId);

  return {
    success: true,
    data: templates[index],
  };
}

function deleteTemplate(id, instanceId = null) {
  const templates = readTemplates(instanceId);
  const filtered = templates.filter((t) => t.id !== id);

  if (filtered.length === templates.length) {
    throw new Error(`Template dengan ID '${id}' tidak ditemukan.`);
  }

  writeTemplates(filtered, instanceId);
  return {
    success: true,
    totalTemplates: filtered.length,
    maxLimit: MAX_TEMPLATES,
  };
}

module.exports = {
  MAX_TEMPLATES,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sanitizeContacts,
};
