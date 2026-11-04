// lib/contactsManager.js — Manajemen Kontak WhatsApp & Profil Bot untuk Status / Story
const fs = require('fs');
const path = require('path');
const config = require('../config');

function getContactsFilePath(instanceId = null) {
  if (process.env.CONTACTS_FILE && (!instanceId || instanceId === 'primary')) {
    return path.resolve(process.env.CONTACTS_FILE);
  }
  if (!instanceId || instanceId === 'primary') {
    return path.resolve(__dirname, '../database/contacts.json');
  }
  const instDir = path.resolve(__dirname, `../instances/${instanceId}/database`);
  if (!fs.existsSync(instDir)) fs.mkdirSync(instDir, { recursive: true });
  return path.join(instDir, 'contacts.json');
}

function getProfileFilePath(instanceId = null) {
  if (process.env.BOT_PROFILE_FILE && (!instanceId || instanceId === 'primary')) {
    return path.resolve(process.env.BOT_PROFILE_FILE);
  }
  if (!instanceId || instanceId === 'primary') {
    return path.resolve(__dirname, '../database/bot_profile.json');
  }
  const instDir = path.resolve(__dirname, `../instances/${instanceId}/database`);
  if (!fs.existsSync(instDir)) fs.mkdirSync(instDir, { recursive: true });
  return path.join(instDir, 'bot_profile.json');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readContactsRaw(instanceId = null) {
  const filePath = getContactsFilePath(instanceId);
  let localData = {};
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      localData = JSON.parse(raw || '{}');
    }
  } catch (_) {
    localData = {};
  }

  // Jika membaca untuk sub-instance, selalu gabungkan (merge) dengan database utama global contacts.json
  // agar seluruh kontak yang pernah diimpor tidak pernah hilang / terhapus saat berpindah bot atau restart!
  if (instanceId && instanceId !== 'primary') {
    try {
      const primaryFile = path.resolve(__dirname, '../database/contacts.json');
      if (fs.existsSync(primaryFile)) {
        const primaryRaw = JSON.parse(fs.readFileSync(primaryFile, 'utf8') || '{}');
        return Object.assign({}, primaryRaw, localData);
      }
    } catch (_) {}
  }

  return localData;
}

function saveContactsRaw(data, instanceId = null) {
  const filePath = getContactsFilePath(instanceId);
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[contactsManager] Gagal simpan contacts.json:', err.message);
  }

  // Jika menyimpan kontak untuk sub-instance, selalu sinkronkan permanen juga ke global database/contacts.json
  if (instanceId && instanceId !== 'primary') {
    try {
      const primaryFile = path.resolve(__dirname, '../database/contacts.json');
      ensureDir(primaryFile);
      let globalData = {};
      if (fs.existsSync(primaryFile)) {
        try { globalData = JSON.parse(fs.readFileSync(primaryFile, 'utf8') || '{}'); } catch (_) {}
      }
      Object.assign(globalData, data);
      fs.writeFileSync(primaryFile, JSON.stringify(globalData, null, 2), 'utf8');
    } catch (e) {
      console.error('[contactsManager] Gagal sinkronkan ke primary contacts.json:', e.message);
    }
  } else {
    // Jika menyimpan ke primary, sinkronkan juga ke semua folder instance yang ada
    try {
      const instRoot = path.resolve(__dirname, '../instances');
      if (fs.existsSync(instRoot)) {
        const subDirs = fs.readdirSync(instRoot);
        for (const sub of subDirs) {
          const subFile = path.join(instRoot, sub, 'database/contacts.json');
          if (fs.existsSync(path.dirname(subFile))) {
            let subData = {};
            if (fs.existsSync(subFile)) {
              try { subData = JSON.parse(fs.readFileSync(subFile, 'utf8') || '{}'); } catch (_) {}
            }
            Object.assign(subData, data);
            fs.writeFileSync(subFile, JSON.stringify(subData, null, 2), 'utf8');
          }
        }
      }
    } catch (_) {}
  }
}

// Normalisasi nomor telepon WhatsApp (Mendukung Indonesia 62 & Internasional E.164, 7-16 digit)
function normalizePhoneNumber(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;

  if (digits.startsWith('08')) {
    digits = '628' + digits.slice(2);
  } else if (digits.startsWith('0') && digits.length >= 9) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
    digits = '628' + digits.slice(1);
  }

  // Standar WhatsApp E.164: panjang 7 - 16 digit angka
  if (digits.length < 7 || digits.length > 16) {
    return null;
  }
  return digits;
}

function isValidPhoneNumber(raw) {
  return normalizePhoneNumber(raw) !== null;
}

// Tambah kontak manual oleh user / admin dengan proteksi ANTI-OVERWRITE
function addContact({ number, name }, instanceId = null) {
  const normNum = normalizePhoneNumber(number);
  if (!normNum) {
    throw new Error('Nomor telepon tidak valid. Nomor WhatsApp harus berformat angka 7-16 digit (contoh: 628xxxxxxxxxx).');
  }

  const cleanName = (name || '').trim() || `Kontak +${normNum}`;
  const data = readContactsRaw(instanceId);
  const cleanJid = `${normNum}@s.whatsapp.net`;

  const existing = data[normNum];
  const isNew = !existing;

  data[normNum] = {
    jid: cleanJid,
    number: normNum,
    name: cleanName,
    notify: cleanName,
    isManual: true, // Tag proteksi agar tidak tertimpa sinkronisasi otomatis Baileys
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveContactsRaw(data, instanceId);

  return {
    success: true,
    isNew,
    contact: data[normNum],
    message: isNew
      ? `Kontak '${cleanName}' (+${normNum}) berhasil ditambahkan!`
      : `Kontak +${normNum} berhasil diperbarui menjadi '${cleanName}'!`,
  };
}

// Simpan atau perbarui data kontak (dari event pesan masuk / chat) dengan LOGIC ANTI-OVERWRITE
function recordContact(jid, name = '', instanceId = null) {
  if (!jid || typeof jid !== 'string') return;
  const rawNum = jid.split(':')[0].split('@')[0];
  const num = normalizePhoneNumber(rawNum);
  if (!num) return;

  const cleanJid = `${num}@s.whatsapp.net`;
  const data = readContactsRaw(instanceId);
  const existing = data[num];

  // Logic Anti-Overwrite: Jika kontak bertanda isManual atau sudah memiliki nama kustom, pertahankan!
  let finalName = existing?.name;
  const candidateName = (name || '').trim();

  if (existing?.isManual && finalName && !finalName.startsWith('User ')) {
    // Jangan ubah nama manual yang telah ditetapkan user
  } else if (!finalName || finalName.startsWith('User ') || finalName.startsWith('Kontak ')) {
    finalName = candidateName || `Kontak +${num}`;
  }

  data[num] = {
    jid: cleanJid,
    number: num,
    name: finalName,
    notify: candidateName || existing?.notify || '',
    isManual: existing?.isManual || false,
    updatedAt: new Date().toISOString(),
  };

  saveContactsRaw(data, instanceId);
}

// Rekam banyak kontak sekaligus (dari event Baileys contacts.upsert / update) dengan LOGIC ANTI-OVERWRITE
function recordContactsBatch(contactList, instanceId = null) {
  if (!Array.isArray(contactList) || contactList.length === 0) return;
  const data = readContactsRaw(instanceId);
  let updated = false;

  contactList.forEach((c) => {
    const rawId = c.id || c.jid;
    if (!rawId || typeof rawId !== 'string') return;
    const rawNum = rawId.split(':')[0].split('@')[0];
    const num = normalizePhoneNumber(rawNum);
    if (!num) return;

    const cleanJid = `${num}@s.whatsapp.net`;
    const existing = data[num];

    // Anti-overwrite: kontak manual tidak boleh ditimpa nama acak
    let finalName = existing?.name;
    const candidateName = (c.name || c.verifiedName || c.notify || '').trim();

    if (existing?.isManual && finalName && !finalName.startsWith('User ')) {
      // Pertahankan nama kustom manual
    } else if (!finalName || finalName.startsWith('User ') || finalName.startsWith('Kontak ')) {
      finalName = candidateName || `Kontak +${num}`;
    }

    data[num] = {
      jid: cleanJid,
      number: num,
      name: finalName,
      notify: candidateName || existing?.notify || '',
      isManual: existing?.isManual || false,
      updatedAt: new Date().toISOString(),
    };
    updated = true;
  });

  if (updated) saveContactsRaw(data, instanceId);
}

// Ambil seluruh kontak dengan VALIDASI NOMOR 62 & DEDUPLIKASI
function getContacts(instanceId = null) {
  const data = readContactsRaw(instanceId);
  const contactsMap = new Map();

  // 1. Data tersimpan dari contacts.json
  for (const [key, c] of Object.entries(data)) {
    const num = normalizePhoneNumber(c.number || key || (c.jid ? c.jid.split('@')[0] : ''));
    if (!num) continue;

    const jid = `${num}@s.whatsapp.net`;
    let name = (c.name || '').trim();
    if (!name || name.startsWith('User ')) {
      name = `Kontak +${num}`;
    }

    if (!contactsMap.has(num)) {
      contactsMap.set(num, {
        jid,
        number: num,
        name,
        notify: c.notify || '',
        isManual: !!c.isManual,
        updatedAt: c.updatedAt || new Date().toISOString(),
      });
    } else {
      const existing = contactsMap.get(num);
      if (c.isManual || (!existing.isManual && name && !name.startsWith('Kontak '))) {
        existing.name = name;
        if (c.isManual) existing.isManual = true;
      }
    }
  }

  // 2. Merge dari whitelist.json (Owners & Luna Member)
  try {
    const wlPath = instanceId && instanceId !== 'primary'
      ? path.resolve(__dirname, `../instances/${instanceId}/database/whitelist.json`)
      : path.resolve(__dirname, '../database/whitelist.json');

    if (fs.existsSync(wlPath)) {
      const wl = JSON.parse(fs.readFileSync(wlPath, 'utf8') || '{}');
      (wl.owners || []).forEach((n) => {
        const num = normalizePhoneNumber(n);
        if (!num) return;
        const jid = `${num}@s.whatsapp.net`;
        if (!contactsMap.has(num)) {
          contactsMap.set(num, {
            jid,
            number: num,
            name: `👑 Owner (+${num})`,
            isOwner: true,
          });
        } else {
          const item = contactsMap.get(num);
          item.isOwner = true;
          if (!item.name || item.name.startsWith('Kontak ')) {
            item.name = `👑 Owner (+${num})`;
          }
        }
      });

      (wl.allowed || []).forEach((item) => {
        const raw = typeof item === 'string' ? item : item.number;
        const num = normalizePhoneNumber(raw);
        if (!num) return;
        const jid = `${num}@s.whatsapp.net`;
        if (!contactsMap.has(num)) {
          contactsMap.set(num, {
            jid,
            number: num,
            name: `🛡️ Luna Member (+${num})`,
            isLuna: true,
          });
        } else {
          const cItem = contactsMap.get(num);
          cItem.isLuna = true;
          if (!cItem.name || cItem.name.startsWith('Kontak ')) {
            cItem.name = `🛡️ Luna Member (+${num})`;
          }
        }
      });
    }
  } catch (_) {}

  // 3. Pastikan owner number dari config selalu ada dan valid 62
  if (config.ownerNumber) {
    const num = normalizePhoneNumber(config.ownerNumber);
    if (num) {
      const jid = `${num}@s.whatsapp.net`;
      if (!contactsMap.has(num)) {
        contactsMap.set(num, {
          jid,
          number: num,
          name: `👑 Primary Owner (+${num})`,
          isOwner: true,
        });
      } else {
        const item = contactsMap.get(num);
        item.isOwner = true;
        item.name = `👑 Primary Owner (+${num})`;
      }
    }
  }

  // 4. Return array kontak murni diawali nomor 62, terurut rapi
  return Array.from(contactsMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// Alias untuk kompatibilitas
function getAllContacts(instanceId = null) {
  return getContacts(instanceId);
}

// Ambil seluruh JID kontak unik untuk statusJidList
function getAllContactJids(instanceId = null) {
  const contacts = getContacts(instanceId);
  const jids = new Set();
  contacts.forEach((c) => {
    if (c.jid && c.jid.endsWith('@s.whatsapp.net')) jids.add(c.jid);
  });

  // Jika kontak tersimpan masih sedikit, lengkapi dengan anggota grup tersimpan
  if (jids.size < 5) {
    try {
      const groupsManager = require('./groupsManager');
      const allGroups = groupsManager.getAllGroups(instanceId);
      for (const g of Object.values(allGroups)) {
        if (Array.isArray(g.participants)) {
          for (const p of g.participants) {
            const raw = p.id || p.jid || p;
            if (typeof raw === 'string' && raw.endsWith('@s.whatsapp.net')) {
              const cleanPart = raw.split(':')[0] + '@s.whatsapp.net';
              jids.add(cleanPart);
            }
          }
        }
      }
    } catch (_) {}
  }

  if (config.ownerNumber) {
    const num = normalizePhoneNumber(config.ownerNumber);
    if (num) jids.add(`${num}@s.whatsapp.net`);
  }

  return Array.from(jids);
}

// Profil Bot Foto URL
function saveBotProfile(profileData, instanceId = null) {
  const filePath = getProfileFilePath(instanceId);
  try {
    ensureDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(profileData, null, 2), 'utf8');
  } catch (_) {}
}

function getBotProfile(instanceId = null) {
  const filePath = getProfileFilePath(instanceId);
  try {
    if (!fs.existsSync(filePath)) {
      if (instanceId && instanceId !== 'primary') {
        const primaryProfile = path.resolve(__dirname, '../database/bot_profile.json');
        if (fs.existsSync(primaryProfile)) {
          return JSON.parse(fs.readFileSync(primaryProfile, 'utf8') || '{}');
        }
      }
      return { profilePicUrl: null };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (_) {
    return { profilePicUrl: null };
  }
}

// Parser teks vCard (.vcf / .txt seperti file 00001.txt) dengan validasi nomor 62
function parseVCard(vcardText) {
  if (!vcardText || typeof vcardText !== 'string') return [];
  const cards = vcardText.split(/BEGIN:VCARD[\r\n]+/i).filter(Boolean);
  const results = [];
  const seenNumbers = new Set();

  for (const card of cards) {
    const lines = card.split(/[\r\n]+/);
    let fn = '';
    let n = '';
    const phoneNumbers = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toUpperCase() === 'END:VCARD') continue;

      if (/^FN(\;[^:]*)?:/i.test(trimmed)) {
        fn = trimmed.replace(/^FN(\;[^:]*)?:/i, '').trim();
      } else if (/^N(\;[^:]*)?:/i.test(trimmed)) {
        const parts = trimmed.replace(/^N(\;[^:]*)?:/i, '').split(';').filter(Boolean);
        n = parts.reverse().join(' ').trim();
      } else if (/^TEL(\;[^:]*)?:/i.test(trimmed)) {
        const num = trimmed.replace(/^TEL(\;[^:]*)?:/i, '').trim();
        const normalized = normalizePhoneNumber(num);
        if (normalized) phoneNumbers.push(normalized);
      }
    }

    const contactName = fn || n || '';
    for (const num of phoneNumbers) {
      if (!seenNumbers.has(num)) {
        seenNumbers.add(num);
        results.push({
          number: num,
          name: contactName || `Kontak +${num}`,
          jid: `${num}@s.whatsapp.net`,
        });
      }
    }
  }

  return results;
}

// Impor teks vCard langsung ke contacts.json dengan proteksi anti-overwrite
function importVCard(vcardText, instanceId = null) {
  const parsed = parseVCard(vcardText);
  if (!parsed || parsed.length === 0) {
    return { success: false, message: 'Tidak ada kontak valid (berawalan 62) yang ditemukan dari file vCard.' };
  }

  const data = readContactsRaw(instanceId);
  let addedCount = 0;
  let updatedCount = 0;

  parsed.forEach((c) => {
    if (data[c.number]) {
      // Jika nomor sudah ada, jangan timpa jika sudah ada nama manual
      if (!data[c.number].isManual) {
        if (c.name && (!data[c.number].name || data[c.number].name.startsWith('Kontak ') || data[c.number].name.startsWith('User '))) {
          data[c.number].name = c.name;
          data[c.number].notify = c.name;
          data[c.number].updatedAt = new Date().toISOString();
          updatedCount++;
        }
      }
    } else {
      data[c.number] = {
        jid: c.jid,
        number: c.number,
        name: c.name || `Kontak +${c.number}`,
        notify: c.name || `Kontak +${c.number}`,
        source: 'vcard_import',
        isManual: false,
        updatedAt: new Date().toISOString(),
      };
      addedCount++;
    }
  });

  saveContactsRaw(data, instanceId);
  return {
    success: true,
    totalParsed: parsed.length,
    addedCount,
    updatedCount,
    totalContacts: Object.keys(data).length,
  };
}

module.exports = {
  recordContact,
  recordContactsBatch,
  addContact,
  getContacts,
  getAllContacts,
  getAllContactJids,
  saveBotProfile,
  getBotProfile,
  normalizePhoneNumber,
  isValidPhoneNumber,
  parseVCard,
  importVCard,
};

