// server/skillManager.js — Dynamic Skill & Tool Manager untuk Hermes Agent
// Mengelola tools bawaan, custom skills (.js, .json), dan auto-extract ZIP skills (seperti ui-ux-pro-max)
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const SKILLS_DIR = path.resolve(__dirname, '../database/hermes_skills');
const EXTRACTED_DIR = path.resolve(SKILLS_DIR, 'extracted');
const SKILLS_META_FILE = path.resolve(__dirname, '../database/hermes_skills_meta.json');

if (!fs.existsSync(SKILLS_DIR)) {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
}
if (!fs.existsSync(EXTRACTED_DIR)) {
  fs.mkdirSync(EXTRACTED_DIR, { recursive: true });
}

function readSkillsMeta() {
  try {
    if (!fs.existsSync(SKILLS_META_FILE)) {
      fs.writeFileSync(SKILLS_META_FILE, '{}', 'utf8');
      return {};
    }
    const raw = fs.readFileSync(SKILLS_META_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('[skillManager] Gagal membaca meta skills:', err.message);
    return {};
  }
}

function saveSkillsMeta(meta) {
  try {
    fs.writeFileSync(SKILLS_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('[skillManager] Gagal menyimpan meta skills:', err.message);
  }
}

const AGENTS_SKILLS_DIR = path.resolve(__dirname, '../.agents/skills');
const CLAUDE_SKILLS_DIR = path.resolve(__dirname, '../.claude/skills');

// ==================== AUTO EXTRACT ZIP SKILLS ====================
function extractAllZips() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const extractedList = [];

  try {
    const files = fs.readdirSync(SKILLS_DIR);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.zip')) {
        const base = path.basename(file, '.zip');
        const zipPath = path.join(SKILLS_DIR, file);
        const targetDir = path.join(EXTRACTED_DIR, base);

        try {
          const zipStat = fs.statSync(zipPath);
          let needsExtract = true;

          if (fs.existsSync(targetDir)) {
            const markerFile = path.join(targetDir, '.extracted_timestamp');
            if (fs.existsSync(markerFile)) {
              const markerTime = parseInt(fs.readFileSync(markerFile, 'utf8') || '0', 10);
              if (markerTime >= zipStat.mtimeMs) {
                needsExtract = false;
              }
            }
          }

          if (needsExtract) {
            console.log(`[skillManager] Mengekstrak zip skill: ${file}...`);
            fs.mkdirSync(targetDir, { recursive: true });
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(targetDir, true);
            fs.writeFileSync(path.join(targetDir, '.extracted_timestamp'), String(Date.now()), 'utf8');
            console.log(`[skillManager] Berhasil ekstrak zip: ${file} ke ${targetDir}`);
          }
          extractedList.push({ file, base, targetDir });
        } catch (zErr) {
          console.error(`[skillManager] Gagal ekstrak ${file}:`, zErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[skillManager] Error saat scan zip skills:', err.message);
  }

  return extractedList;
}

// Fungsi rekursif mencari file SKILL.md atau skill.json
function findSkillDefinitions(dir, maxDepth = 6, currentDepth = 0) {
  let results = [];
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return results;

  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      let stat;
      try {
        stat = fs.statSync(full);
      } catch (_) {
        continue;
      }

      if (stat.isDirectory()) {
        if (item === 'node_modules' || item === '.git') continue;
        results = results.concat(findSkillDefinitions(full, maxDepth, currentDepth + 1));
      } else {
        if (item === 'SKILL.md' || item === 'skill.json') {
          results.push(full);
        }
      }
    }
  } catch (_) {}

  return results;
}

// Ekstrak file zip secara manual jika diminta runtime
async function extractAndLoadZipSkill(zipPathOrBuffer, customName = '') {
  let targetBase = customName;
  let zip;

  if (Buffer.isBuffer(zipPathOrBuffer)) {
    targetBase = targetBase || ('skill_upload_' + Date.now());
    zip = new AdmZip(zipPathOrBuffer);
  } else {
    targetBase = targetBase || path.basename(zipPathOrBuffer, path.extname(zipPathOrBuffer));
    zip = new AdmZip(zipPathOrBuffer);
  }

  const targetDir = path.join(EXTRACTED_DIR, targetBase);
  fs.mkdirSync(targetDir, { recursive: true });
  zip.extractAllTo(targetDir, true);
  fs.writeFileSync(path.join(targetDir, '.extracted_timestamp'), String(Date.now()), 'utf8');

  // Segera refresh tools
  return getCustomTools();
}

// ==================== SCAN EXTRACTED ZIP SKILLS ====================
function getExtractedZipTools() {
  extractAllZips();

  const meta = readSkillsMeta();
  const tools = [];
  const seenSkillNames = new Set();

  if (!fs.existsSync(EXTRACTED_DIR)) return tools;

  const foundFiles = findSkillDefinitions(EXTRACTED_DIR);

  for (const filePath of foundFiles) {
    const isMd = path.basename(filePath) === 'SKILL.md';
    const isJson = path.basename(filePath) === 'skill.json';
    const parentDir = path.dirname(filePath);
    const parentName = path.basename(parentDir).toLowerCase();

    let skillName = parentName;
    let description = 'Extracted ZIP skill';
    let instructions = '';
    let aliases = [];

    if (isMd) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        instructions = content;

        // Cek frontmatter YAML
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (fmMatch) {
          const fm = fmMatch[1];
          const nameM = fm.match(/name:\s*["']?([^"'\r\n]+)["']?/i);
          if (nameM) skillName = nameM[1].trim().toLowerCase();
          const descM = fm.match(/description:\s*["']?([^"'\r\n]+)["']?/i);
          if (descM) description = descM[1].trim();
        } else {
          const headingM = content.match(/^#\s+(.+)/m);
          if (headingM) description = headingM[1].trim();
        }
      } catch (_) {}
    } else if (isJson) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.name) skillName = parsed.name.toLowerCase();
        if (parsed.description) description = parsed.description;
        instructions = `Skill ${parsed.displayName || parsed.name}: ${parsed.description || ''}`;
      } catch (_) {}
    }

    if (!skillName || seenSkillNames.has(skillName)) continue;
    seenSkillNames.add(skillName);

    if (meta[skillName] && meta[skillName].enabled === false) continue;

    // Tambahkan alias populer
    if (skillName === 'ui-ux-pro-max') {
      aliases = ['uipro', 'uiuxpromax', 'ui_ux_pro_max', 'uiux', 'uipro-max'];
    } else if (skillName.includes('-') || skillName.includes('_')) {
      aliases.push(skillName.replace(/-/g, '_'));
      aliases.push(skillName.replace(/_/g, '-'));
      aliases.push(skillName.replace(/[-_]/g, ''));
    }

    const toolIdentifier = skillName.replace(/[^a-zA-Z0-9_]/g, '_');

    tools.push({
      id: skillName,
      name: toolIdentifier,
      rawName: skillName,
      aliases,
      description: description.slice(0, 400),
      instructions,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: `Instruksi, parameter, atau permintaan untuk skill ${skillName}`,
          },
        },
        required: ['query'],
      },
      execute: async (args) => {
        return {
          success: true,
          skill: skillName,
          instructions: instructions ? instructions.slice(0, 3000) : `Skill ${skillName} aktif.`,
          query: args.query,
          skillDir: parentDir,
        };
      },
      isCustom: true,
      isZipExtracted: true,
      skillDir: parentDir,
      filePath,
    });
  }

  return tools;
}

// ==================== DAFTAR SEMUA CUSTOM TOOLS ====================
function getCustomTools() {
  const meta = readSkillsMeta();

  // Core built-in skills formal
  const customTools = [
    {
      id: 'math',
      name: 'math',
      rawName: 'math',
      displayName: 'Mathematics & LaTeX',
      aliases: ['math', 'calculator', 'kalkulator', 'hitung', 'matematika', 'algebra'],
      description: 'Skill penalaran matematika tingkat lanjut, persamaan KaTeX LaTeX, step-by-step substitution, dan pembuktian formula.',
      instructions: `# SKILL: MATHEMATICS RESPONSE STYLE
Untuk menyelesaikan soal matematika atau kalkulasi:
1. Tuliskan informasi yang diberikan (Diketahui) dalam notasi matematis;
2. Tuliskan rumus yang digunakan secara eksplisit dengan format KaTeX;
3. Tuliskan proses substitusi angka ke dalam variabel rumus;
4. Tuliskan langkah-langkah perhitungan per baris yang sistematis;
5. Tuliskan jawaban akhir yang jelas dan dibingkai dalam LaTeX \\boxed{...}.
Gunakan sintaks KaTeX display ($$ ... $$) untuk rumus utama dan inline (\\( ... \\)) untuk variabel.`,
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Ekspresi matematika atau soal hitungan' },
        },
        required: ['expression'],
      },
      execute: async (args) => ({ success: true, skill: 'math', message: 'Math skill active' }),
      isCustom: false,
    },
    {
      id: 'coding',
      name: 'coding',
      rawName: 'coding',
      displayName: 'Advanced Coding & Engineering',
      aliases: ['coding', 'code', 'koding', 'programmer', 'developer', 'script', 'programming'],
      description: 'Skill software engineering tingkat tinggi: clean code, arsitektur modular, syntax highlighting, dan file creation workflow.',
      instructions: `# SKILL: ADVANCED CODING & SOFTWARE DEVELOPMENT
Pedoman penulisan kode:
1. Menghasilkan clean, production-ready, modular code dengan penanganan error yang baik.
2. Selalu tentukan bahasa pemrograman secara eksplisit pada code fences (\`\`\`javascript, \`\`\`python, \`\`\`html, dll.).
3. Jika pengguna meminta berkas lengkap atau aplikasi mandiri (HTML/CSS/JS/Python), gunakan tool "create_artifact" untuk membuat file fisik nyata.
4. AMBIGUITY HANDLING: Jika permintaan pengguna sangat minim konteks (contoh: "bikin bot" tanpa bahasa, platform, atau fitur spesifik), ajukan pertanyaan klarifikasi terarah terlebih dahulu sebelum membuat kode! Jika permintaan sudah spesifik (contoh: "buat fungsi JS untuk menjumlahkan array"), langsung eksekusi tanpa bertanya lagi.`,
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'Tugas pemrograman yang ingin dikerjakan' },
        },
        required: ['task'],
      },
      execute: async (args) => ({ success: true, skill: 'coding', message: 'Coding skill active' }),
      isCustom: false,
    },
    {
      id: 'research',
      name: 'research',
      rawName: 'research',
      displayName: 'Deep Research & Synthesis',
      aliases: ['research', 'riset', 'search', 'investigasi', 'cari', 'browsing'],
      description: 'Skill riset mendalam, penelusuran fakta web aktual, analisis komparatif dengan tabel, dan sintesis informasi.',
      instructions: `# SKILL: DEEP RESEARCH & FACT SYNTHESIS
Pedoman riset:
1. Gunakan tool "search_web" dan "fetch_web_content" untuk mengumpulkan fakta terkini dan kredibel.
2. Sajikan perbandingan data dalam format Tabel Markdown semantik (| Header 1 | Header 2 |).
3. Buat kesimpulan berbutir (bullet points) yang padat, terstruktur, dan tidak bertele-tele.
4. Cantumkan tautan sumber referensi yang relevan.`,
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topik atau pertanyaan riset' },
        },
        required: ['topic'],
      },
      execute: async (args) => ({ success: true, skill: 'research', message: 'Research skill active' }),
      isCustom: false,
    }
  ];

  // 1. Scan database/hermes_skills (.js dan .json)
  if (fs.existsSync(SKILLS_DIR)) {
    const files = fs.readdirSync(SKILLS_DIR);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const base = path.basename(file, ext);

      if (meta[base] && meta[base].enabled === false) continue;

      const fullPath = path.join(SKILLS_DIR, file);

      if (ext === '.js') {
        try {
          delete require.cache[require.resolve(fullPath)];
          const mod = require(fullPath);
          if (mod && mod.name && typeof mod.execute === 'function') {
            const safeName = mod.name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
            customTools.push({
              id: mod.name,
              name: safeName,
              rawName: mod.name,
              aliases: [mod.name, mod.name.replace(/_/g, '-')],
              description: mod.description || 'Custom tool uploaded by user',
              parameters: mod.parameters || { type: 'object', properties: {} },
              execute: mod.execute,
              isCustom: true,
              filename: file,
            });
          }
        } catch (err) {
          console.error('[skillManager] Gagal load custom skill JS ' + file + ':', err.message);
        }
      } else if (ext === '.json') {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.name) {
            const safeName = parsed.name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
            customTools.push({
              id: parsed.name,
              name: safeName,
              rawName: parsed.name,
              aliases: [parsed.name, parsed.name.replace(/_/g, '-')],
              description: parsed.description || 'Custom JSON tool',
              parameters: parsed.parameters || { type: 'object', properties: {} },
              execute: async (args) => {
                return {
                  success: true,
                  message: parsed.response || 'Executed custom skill: ' + parsed.name,
                  receivedArgs: args,
                };
              },
              isCustom: true,
              filename: file,
            });
          }
        } catch (err) {
          console.error('[skillManager] Gagal load custom skill JSON ' + file + ':', err.message);
        }
      }
    }
  }

  // 2. Scan Extracted ZIP Skills (seperti ui-ux-pro-max-skill-main)
  const zipTools = getExtractedZipTools();
  customTools.push(...zipTools);

  // 3. Scan CLI Installed Skills (.agents/skills/ & .claude/skills/)
  const agentDirs = [AGENTS_SKILLS_DIR, CLAUDE_SKILLS_DIR];
  for (const dir of agentDirs) {
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (!fs.statSync(itemPath).isDirectory()) continue;
        const skillName = item.toLowerCase();
        if (meta[skillName] && meta[skillName].enabled === false) continue;

        // Cek file SKILL.md
        const skillMd = path.join(itemPath, 'SKILL.md');
        let desc = 'Installed CLI Agent Skill';
        let instructions = '';
        if (fs.existsSync(skillMd)) {
          const content = fs.readFileSync(skillMd, 'utf8');
          instructions = content;
          const descMatch = content.match(/description:\s*(.+)/i) || content.match(/^#\s+(.+)/m);
          if (descMatch) desc = descMatch[1].trim();
        }

        const searchPy = path.join(itemPath, 'scripts', 'search.py');
        const hasSearchScript = fs.existsSync(searchPy);

        const safeName = skillName.replace(/[^a-zA-Z0-9_]/g, '_');
        customTools.push({
          id: skillName,
          name: safeName,
          rawName: skillName,
          aliases: [skillName, skillName.replace(/_/g, '-'), skillName.replace(/[-_]/g, '')],
          description: desc + (hasSearchScript ? ' (Dengan script python search)' : ''),
          instructions,
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Query atau instruksi untuk skill ' + item },
            },
            required: ['query'],
          },
          execute: async (args) => {
            return {
              success: true,
              skill: item,
              instructions: instructions ? instructions.slice(0, 2000) : 'Skill guidance aktif.',
              query: args.query,
              hasSearchScript,
            };
          },
          isCustom: true,
          isCliInstalled: true,
          skillDir: itemPath,
        });
      }
    }
  }

  return customTools;
}

// ==================== HELPER FIND SKILL BY NAME / COMMAND ====================
/**
 * Mencari skill yang cocok dengan nama command (misal: /ui-ux-pro-max, /uipro, /banner-design)
 * Mendukung alias dan nama ternormalisasi
 */
function findSkillByName(inputName) {
  if (!inputName || typeof inputName !== 'string') return null;

  const clean = inputName.toLowerCase().replace(/^[\/.]/, '').trim();
  const normalized = clean.replace(/[-_]/g, '');

  const allTools = getCustomTools();

  // 1. Coba kecocokan langsung (name atau rawName)
  for (const t of allTools) {
    const tName = (t.name || '').toLowerCase();
    const tRaw = (t.rawName || '').toLowerCase();
    const tId = (t.id || '').toLowerCase();

    if (tName === clean || tRaw === clean || tId === clean) {
      return t;
    }
  }

  // 2. Coba kecocokan alias
  for (const t of allTools) {
    if (Array.isArray(t.aliases)) {
      for (const a of t.aliases) {
        if (a.toLowerCase() === clean || a.toLowerCase().replace(/[-_]/g, '') === normalized) {
          return t;
        }
      }
    }
  }

  // 3. Coba kecocokan ternormalisasi tanpa dash/underscore
  for (const t of allTools) {
    const tNormName = (t.name || '').toLowerCase().replace(/[-_]/g, '');
    const tNormRaw = (t.rawName || '').toLowerCase().replace(/[-_]/g, '');
    const tNormId = (t.id || '').toLowerCase().replace(/[-_]/g, '');

    if (tNormName === normalized || tNormRaw === normalized || tNormId === normalized) {
      return t;
    }
  }

  return null;
}

/**
 * Memberikan saran skill yang tersedia jika user memasukkan skill yang tidak dikenal
 */
function suggestSkills(inputQuery = '') {
  const allTools = getCustomTools();
  const q = String(inputQuery || '').toLowerCase().replace(/^[\/.]/, '').trim();

  if (q) {
    const matched = allTools.filter(t => {
      const name = (t.name || t.rawName || t.id || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const aliases = Array.isArray(t.aliases) ? t.aliases.map(a => a.toLowerCase()) : [];
      return name.includes(q) || aliases.some(a => a.includes(q)) || desc.includes(q);
    });
    if (matched.length > 0) {
      return matched.slice(0, 6);
    }
  }

  const priorityNames = ['ui-ux-pro-max', 'coding', 'math', 'research', 'banner-design', 'slides', 'brand'];
  const prioritized = [];
  priorityNames.forEach(p => {
    const f = allTools.find(t => (t.name === p || t.rawName === p || t.id === p));
    if (f) prioritized.push(f);
  });

  allTools.forEach(t => {
    if (!prioritized.some(p => p.id === t.id) && prioritized.length < 6) {
      prioritized.push(t);
    }
  });

  return prioritized;
}

// ==================== AMBIL SEMUA STATUS SKILLS (DASHBOARD) ====================
function getAllSkills() {
  const meta = readSkillsMeta();
  const custom = [];

  // 1. Scan ZIPs & Extracted skills
  extractAllZips();
  const zipTools = getExtractedZipTools();
  for (const zt of zipTools) {
    const isEnabled = meta[zt.rawName]?.enabled !== false && meta[zt.name]?.enabled !== false;
    custom.push({
      id: zt.rawName || zt.name,
      name: zt.rawName || zt.name,
      filename: path.basename(zt.filePath || zt.skillDir),
      extension: 'zip-skill',
      size: 'Extracted Skill',
      enabled: isEnabled,
      type: 'zip-extracted',
      aliases: zt.aliases || [],
      description: zt.description,
      uploadedAt: new Date().toISOString(),
    });
  }

  // 2. Scan file tunggal di database/hermes_skills
  if (fs.existsSync(SKILLS_DIR)) {
    const files = fs.readdirSync(SKILLS_DIR);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.zip') continue; // sudah diproses lewat extracted
      const base = path.basename(file, ext);
      const isEnabled = meta[base]?.enabled !== false;
      const stat = fs.statSync(path.join(SKILLS_DIR, file));

      custom.push({
        id: base,
        name: base,
        filename: file,
        extension: ext,
        size: (stat.size / 1024).toFixed(1) + ' KB',
        enabled: isEnabled,
        type: 'uploaded',
        uploadedAt: stat.mtime.toISOString(),
      });
    }
  }

  // 3. Scan CLI installed
  const agentDirs = [{ dir: AGENTS_SKILLS_DIR, source: 'universal' }, { dir: CLAUDE_SKILLS_DIR, source: 'claude' }];
  for (const { dir, source } of agentDirs) {
    if (fs.existsSync(dir)) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (!fs.statSync(itemPath).isDirectory()) continue;
        const skillName = item.toLowerCase();
        const isEnabled = meta[skillName]?.enabled !== false;
        const stat = fs.statSync(itemPath);

        custom.push({
          id: skillName,
          name: item,
          filename: `${item}/ (${source})`,
          extension: 'cli-skill',
          size: 'Folder CLI',
          enabled: isEnabled,
          type: 'cli-installed',
          uploadedAt: stat.mtime.toISOString(),
        });
      }
    }
  }

  return custom;
}

// ==================== SIMPAN SKILL BARU ====================
async function saveCustomSkill(filename, bufferOrString) {
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetPath = path.join(SKILLS_DIR, safeName);
  const ext = path.extname(safeName).toLowerCase();
  const base = path.basename(safeName, ext);

  fs.writeFileSync(targetPath, bufferOrString);

  // Jika berupa ZIP, auto-ekstrak langsung!
  if (ext === '.zip') {
    try {
      await extractAndLoadZipSkill(targetPath, base);
    } catch (zErr) {
      console.error('[skillManager] Gagal auto-ekstrak ZIP saat upload:', zErr.message);
    }
  }

  const meta = readSkillsMeta();
  meta[base] = {
    enabled: true,
    uploadedAt: new Date().toISOString(),
    filename: safeName,
    isZip: ext === '.zip',
  };
  saveSkillsMeta(meta);

  return { success: true, name: base, filename: safeName, isZip: ext === '.zip' };
}

// Toggle enable/disable skill
function toggleSkill(name, enabled) {
  const meta = readSkillsMeta();
  if (!meta[name]) meta[name] = {};
  meta[name].enabled = Boolean(enabled);
  saveSkillsMeta(meta);
  return { success: true, name, enabled: meta[name].enabled };
}

// Hapus custom skill
function deleteCustomSkill(name) {
  const meta = readSkillsMeta();
  if (fs.existsSync(SKILLS_DIR)) {
    const files = fs.readdirSync(SKILLS_DIR);
    for (const file of files) {
      const base = path.basename(file, path.extname(file));
      if (base === name || file === name) {
        fs.unlinkSync(path.join(SKILLS_DIR, file));
        break;
      }
    }
  }

  // Jika ada folder extracted
  const extractedFolder = path.join(EXTRACTED_DIR, name);
  if (fs.existsSync(extractedFolder)) {
    try {
      fs.rmSync(extractedFolder, { recursive: true, force: true });
    } catch (_) {}
  }

  delete meta[name];
  saveSkillsMeta(meta);
  return { success: true, message: `Skill ${name} berhasil dihapus.` };
}

module.exports = {
  SKILLS_DIR,
  EXTRACTED_DIR,
  extractAllZips,
  extractAndLoadZipSkill,
  getCustomTools,
  findSkillByName,
  suggestSkills,
  getAllSkills,
  saveCustomSkill,
  toggleSkill,
  deleteCustomSkill,
};

