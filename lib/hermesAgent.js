// lib/hermesAgent.js — Hermes Autonomous AI Agent Engine
// Mendukung Multi-step ReAct reasoning, Function/Tool Calling, dan Persistent Session Memory
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const config = require('../config');

// Memory per chat/sender: Map<chatId, Array<{ role, content }>>
const sessionMemory = new Map();
const MAX_MEMORY_TURNS = 10;

// Model chain fallback untuk Hermes
const HERMES_DEFAULT_MODEL = 'liquid/lfm-2.5-2.6b:free';
const FALLBACK_MODELS = [
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nousresearch/hermes-3-llama-3.1-70b',
];

// ==================== 1. DAFTAR TOOLS AUTONOMOUS AGENT ====================
const HERMES_TOOLS = [
  {
    name: 'get_time_date',
    description: 'Dapatkan tanggal, waktu sekarang, hari, dan zona waktu lokal secara real-time.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Zona waktu opsional (contoh: Asia/Jakarta, UTC). Default Asia/Jakarta.',
        },
      },
    },
  },
  {
    name: 'calculator',
    description: 'Hitung ekspresi matematika dan kalkulasi numerik secara akurat (contoh: 450 * 125, sqrt(144), 2^10, 15% dari 2500000).',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Formula atau perhitungan matematika yang akan dihitung.',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'search_web',
    description: 'Cari informasi terkini, pengetahuan umum, fakta, atau berita dari ensiklopedia dan web.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Kata kunci pencarian atau topik yang ingin dicari.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_web_content',
    description: 'Buka dan ekstrak isi teks dari suatu tautan/URL web secara langsung.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL web yang valid (http:// atau https://).',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'bot_info',
    description: 'Dapatkan informasi internal bot WhatsApp: status koneksi, uptime, memori server, dan daftar cluster bot.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'group_info',
    description: 'Dapatkan metadata grup WhatsApp saat ini (nama grup, jumlah anggota, deskripsi). Hanya berlaku jika di dalam grup.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'text_tools',
    description: 'Transformasi teks: base64 encode/decode, hashing md5/sha256, hitung kata/karakter, atau manipulasi string.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Aksi: base64_encode, base64_decode, md5, sha256, count, reverse.',
        },
        text: {
          type: 'string',
          description: 'Teks sumber yang akan diproses.',
        },
      },
      required: ['action', 'text'],
    },
  },
  {
    name: 'create_artifact',
    description: 'Buat file fisik nyata (artefak) yang bisa diunduh langsung oleh pengguna atau dikirim ke WhatsApp. Mendukung format: html, css, js, docx, pdf, pptx, xlsx, txt, png, jpg, json, py, svg, csv, md.',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Nama file lengkap beserta ekstensinya (contoh: website.html, laporan.docx, dokumen.pdf, presentasi.pptx, data.xlsx, script.py, catatan.txt, banner.png, data.json).',
        },
        filetype: {
          type: 'string',
          description: 'Tipe atau format file: html, css, js, docx, pdf, pptx, xlsx, txt, png, jpg, json, py, svg, csv, md.',
        },
        title: {
          type: 'string',
          description: 'Judul atau ringkasan dokumen.',
        },
        content: {
          type: 'string',
          description: 'Isi lengkap dokumen, kode sumber, markdown, teks tabel CSV, atau ringkasan slide yang akan ditulis ke file.',
        },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'edit_artifact',
    description: 'Edit atau perbarui isi file artefak yang sudah pernah dibuat sebelumnya (contoh: merevisi kode HTML, memperbaiki script Python, memperbarui dokumen atau data).',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Nama file artefak yang ingin diedit (contoh: website.html, script.py).',
        },
        content: {
          type: 'string',
          description: 'Konten file yang baru atau kode yang telah diperbarui secara lengkap.',
        },
        description: {
          type: 'string',
          description: 'Penjelasan singkat apa yang diubah atau diperbaiki.',
        },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'read_artifact',
    description: 'Baca isi kode sumber atau teks dari file artefak yang sudah ada sebelumnya (contoh: membaca isi halo_antigravity.html sebelum diedit).',
    parameters: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Nama file artefak yang ingin dibaca (contoh: halo_antigravity.html, script.py).',
        },
      },
      required: ['filename'],
    },
  },
  {
    name: 'manage_memory',
    description: 'Kelola ingatan jangka panjang Hermes: simpan fakta baru tentang pengguna, simpan preferensi pengguna, atau catat koreksi/evaluasi kesalahan masa lalu agar kamu selalu belajar dari pengalaman.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['add_fact', 'set_preference', 'add_correction'],
          description: 'Aksi: add_fact (ingat fakta baru), set_preference (simpan preferensi), add_correction (catat evaluasi/koreksi).',
        },
        fact: {
          type: 'string',
          description: 'Fakta atau pengalaman yang dipelajari (untuk action: add_fact).',
        },
        category: {
          type: 'string',
          description: 'Kategori fakta opsional (misal: user_info, preference, experience).',
        },
        key: {
          type: 'string',
          description: 'Nama preferensi (untuk action: set_preference).',
        },
        value: {
          type: 'string',
          description: 'Nilai preferensi (untuk action: set_preference).',
        },
        wrong_behavior: {
          type: 'string',
          description: 'Kesalahan atau perilaku masa lalu yang dikoreksi (untuk action: add_correction).',
        },
        right_behavior: {
          type: 'string',
          description: 'Perilaku atau cara yang benar/seharusnya (untuk action: add_correction).',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'create_new_skill',
    description: 'Buat skill/alat baru secara otonom (.js atau .json) saat disuruh membuat skill baru. Skill langsung tersimpan di database/hermes_skills, langsung aktif dan bisa dipanggil via /<namaskill> di WhatsApp.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nama skill singkat tanpa spasi (contoh: crypto_tracker, kalkulator_zakat, info_gempa).',
        },
        description: {
          type: 'string',
          description: 'Penjelasan fungsi dan kapabilitas skill yang dibuat.',
        },
        type: {
          type: 'string',
          enum: ['js', 'json'],
          description: 'Format skill: js (dengan fungsi execute async) atau json (template respon dinamis). Default: js.',
        },
        code: {
          type: 'string',
          description: 'Kode implementasi body execute(args, context) JavaScript atau string respon jika tipe JSON.',
        },
        parameters: {
          type: 'object',
          description: 'Skema parameter JSON Schema untuk skill ini.',
        },
      },
      required: ['name', 'description'],
    },
  },
  {
    name: 'extract_skill_zip',
    description: 'Ekstrak dan muat file skill dalam bentuk ZIP (seperti ui-ux-pro-max-skill-main.zip) agar Hermes bisa membaca SKILL.md dan langsung mengimplementasikannya.',
    parameters: {
      type: 'object',
      properties: {
        zip_name: {
          type: 'string',
          description: 'Nama file zip (contoh: ui-ux-pro-max-skill-main.zip) atau path file zip.',
        },
      },
      required: ['zip_name'],
    },
  },
  {
    name: 'market_intelligence',
    description: 'Dapatkan data pasar finansial real-time: harga cryptocurrency terkini (BTC, ETH, SOL, dll. dalam USD & IDR beserta perubahan 24 jam), kurs valuta asing (USD/IDR, EUR/IDR, dll.), dan berita sentimen pasar saham/IHSG.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['crypto', 'forex', 'stock_news'],
          description: 'Tipe data: crypto (harga koin kripto), forex (kurs mata uang), stock_news (berita saham/emiten/IHSG).',
        },
        query: {
          type: 'string',
          description: 'Simbol koin (misal: bitcoin, btc, ethereum, eth, solana, sol), pasangan mata uang (misal: USD, EUR, SGD), atau kode saham/topik (misal: IHSG, BBCA, BBRI, GOTO).',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'get_curated_sources',
    description: 'Dapatkan daftar direktori 30 kanal Instagram pilihan Polaris yang terverifikasi untuk kategori Saham, Crypto, Finansial & Bisnis, Mindset, Tech & Sains.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Kategori opsional (misal: saham, crypto, bisnis, tech, mindset). Kosongkan untuk semua.',
        },
      },
    },
  },
];

// ==================== 2. TOOL EXECUTOR ====================
async function executeTool(toolName, args = {}, context = {}) {
  try {
    switch (toolName) {
      case 'market_intelligence': {
        const type = args.type || 'crypto';
        const q = String(args.query || '').trim().toLowerCase();

        if (type === 'crypto') {
          const coinMap = {
            btc: 'bitcoin',
            bitcoin: 'bitcoin',
            eth: 'ethereum',
            ethereum: 'ethereum',
            sol: 'solana',
            solana: 'solana',
            bnb: 'binancecoin',
            xrp: 'ripple',
            ripple: 'ripple',
            doge: 'dogecoin',
            dogecoin: 'dogecoin',
            ada: 'cardano',
            cardano: 'cardano',
          };
          const targetCoins = q && coinMap[q] ? [coinMap[q]] : (q ? [q] : ['bitcoin', 'ethereum', 'solana', 'ripple']);
          try {
            const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + targetCoins.join(',') + '&vs_currencies=usd,idr&include_24hr_change=true';
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const data = await res.json();
              return {
                success: true,
                type: 'crypto_prices',
                coins: data,
                timestamp: new Date().toISOString(),
              };
            }
          } catch (err) {
            return { error: 'Gagal mengambil data crypto: ' + err.message };
          }
        }

        if (type === 'forex') {
          try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
              const json = await res.json();
              const rates = json.rates || {};
              return {
                success: true,
                base: 'USD',
                rates: {
                  IDR: rates.IDR,
                  EUR: rates.EUR,
                  SGD: rates.SGD,
                  JPY: rates.JPY,
                  GBP: rates.GBP,
                  CNY: rates.CNY,
                },
                lastUpdate: json.time_last_update_utc,
              };
            }
          } catch (err) {
            return { error: 'Gagal mengambil kurs forex: ' + err.message };
          }
        }

        if (type === 'stock_news') {
          const searchQuery = q || 'saham IHSG bursa efek indonesia';
          try {
            const url = 'https://news.google.com/rss/search?q=when:24h+' + encodeURIComponent(searchQuery) + '&hl=id&gl=ID&ceid=ID:id';
            const res = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              signal: AbortSignal.timeout(6000),
            });
            if (res.ok) {
              const xml = await res.text();
              const $ = cheerio.load(xml, { xmlMode: true });
              const news = [];
              $('item').slice(0, 5).each((_, el) => {
                const title = $(el).find('title').text().trim();
                const link = $(el).find('link').text().trim();
                const pubDate = $(el).find('pubDate').text().trim();
                const source = $(el).find('source').text().trim();
                if (title && link) {
                  news.push({ title, link, pubDate, source });
                }
              });
              return {
                success: true,
                query: searchQuery,
                articlesCount: news.length,
                articles: news,
              };
            }
          } catch (err) {
            return { error: 'Gagal mengambil berita saham: ' + err.message };
          }
        }

        return { error: 'Tipe intelligence tidak dikenali. Pilih: crypto, forex, atau stock_news.' };
      }

      case 'get_curated_sources': {
        const catFilter = String(args.category || '').toLowerCase();
        const sources = [
          { category: 'Saham & Market', accounts: ['stockmate.idn', 'sahamtalk', 'beritasaham.id', 'idx_channel', 'stockwise.id', 'stockwaveidn', 'stockalpha.id'] },
          { category: 'Crypto & Blockchain', accounts: ['jackcryptoind', 'cryptoalpha.id', 'cryptowise.id', 'cryptowaveid', 'bitorexpost'] },
          { category: 'Keuangan & Bisnis', accounts: ['tumbuhkaya.id', 'bareksa', 'miliardermuda__', 'ternakuang.id', 'bisnismillenial', 'theeconomicinfluence.id', 'bloombergtechnoz'] },
          { category: 'Mindset & Growth', accounts: ['mental_juara.id', 'rawatcita.id', 'ruangpikirr.id'] },
          { category: 'Tech & Science', accounts: ['neuraai.id', 'teknologi_id', 'nasa', 'spacescience', 'metavulus'] },
          { category: 'News & Media', accounts: ['wo.ai.ni.media', 'cretivox', 'pinterpolitik'] },
        ];

        let result = sources;
        if (catFilter) {
          result = sources.filter(s => s.category.toLowerCase().includes(catFilter));
        }

        return {
          success: true,
          categories: result,
          instagramFormat: 'https://instagram.com/<username>',
        };
      }
      case 'get_time_date': {
        const tz = args.timezone || 'Asia/Jakarta';
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', {
          timeZone: tz,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('id-ID', { timeZone: tz });
        return {
          success: true,
          date: dateStr,
          time: timeStr,
          timezone: tz,
          iso: now.toISOString(),
        };
      }

      case 'calculator': {
        const expr = String(args.expression || '').trim();
        if (!expr) return { error: 'Ekspresi matematika tidak boleh kosong.' };

        let sanitized = expr
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/\^/g, '**')
          .replace(/([0-9.]+)%/g, '($1/100)')
          .replace(/sqrt\(/gi, 'Math.sqrt(')
          .replace(/abs\(/gi, 'Math.abs(')
          .replace(/sin\(/gi, 'Math.sin(')
          .replace(/cos\(/gi, 'Math.cos(')
          .replace(/tan\(/gi, 'Math.tan(')
          .replace(/log\(/gi, 'Math.log10(')
          .replace(/ln\(/gi, 'Math.log(')
          .replace(/pi/gi, 'Math.PI')
          .replace(/pow\(/gi, 'Math.pow(')
          .replace(/round\(/gi, 'Math.round(');

        if (!/^[0-9+\-*\/()., MathPIsqrsincoetaglwb]+$/.test(sanitized)) {
          return { error: 'Ekspresi memuat karakter yang tidak diizinkan.' };
        }

        try {
          const fn = new Function('return (' + sanitized + ')');
          const result = fn();
          return {
            success: true,
            expression: expr,
            result: Number.isFinite(result) ? Number(result.toFixed(6)).toString() : String(result),
          };
        } catch (calcErr) {
          return { error: 'Perhitungan gagal: ' + calcErr.message };
        }
      }

      case 'search_web': {
        const query = String(args.query || '').trim();
        if (!query) return { error: 'Query pencarian kosong.' };

        try {
          const wikiUrl = 'https://id.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(query);
          const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(4000) });
          if (wikiRes.ok) {
            const wikiJson = await wikiRes.json();
            if (wikiJson.extract) {
              return {
                source: 'Wikipedia (ID)',
                title: wikiJson.title,
                extract: wikiJson.extract,
                url: wikiJson.content_urls?.desktop?.page || null,
              };
            }
          }
        } catch (_) {}

        try {
          const ddgUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
          const ddgRes = await fetch(ddgUrl, { signal: AbortSignal.timeout(4000) });
          if (ddgRes.ok) {
            const ddgJson = await ddgRes.json();
            if (ddgJson.AbstractText) {
              return {
                source: 'DuckDuckGo Instant Answer',
                heading: ddgJson.Heading,
                summary: ddgJson.AbstractText,
                sourceUrl: ddgJson.AbstractURL,
              };
            }
            if (Array.isArray(ddgJson.RelatedTopics) && ddgJson.RelatedTopics.length > 0) {
              const snippets = ddgJson.RelatedTopics.slice(0, 3)
                .map((t) => t.Text)
                .filter(Boolean);
              if (snippets.length > 0) {
                return {
                  source: 'DuckDuckGo Related Topics',
                  results: snippets,
                };
              }
            }
          }
        } catch (_) {}

        return {
          query,
          message: 'Pencarian untuk "' + query + '" tidak menemukan ringkasan langsung. Menggunakan penalaran internal model.',
        };
      }

      case 'fetch_web_content': {
        let url = String(args.url || '').trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }

        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(6000),
          });
          if (!res.ok) return { error: 'Gagal mengakses URL (HTTP ' + res.status + ')' };

          const html = await res.text();
          const $ = cheerio.load(html);

          $('script, style, nav, footer, header, noscript, iframe, svg').remove();

          let text = $('body').text().replace(/\s+/g, ' ').trim();
          if (text.length > 2500) {
            text = text.substring(0, 2400) + '... (konten dipotong untuk batas token)';
          }

          const title = $('title').text().trim() || url;
          return { success: true, title, url, content: text };
        } catch (fetchErr) {
          return { error: 'Gagal mengambil isi URL: ' + fetchErr.message };
        }
      }

      case 'bot_info': {
        const uptimeSec = process.uptime();
        const hrs = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const secs = Math.floor(uptimeSec % 60);
        const mem = process.memoryUsage();

        return {
          botName: config.botName || 'Polaris',
          uptime: hrs + 'j ' + mins + 'm ' + secs + 'd',
          nodeVersion: process.version,
          memoryRss: (mem.rss / 1024 / 1024).toFixed(2) + ' MB',
          heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
          environment: process.env.NODE_ENV || 'production',
          status: 'ONLINE & READY',
        };
      }

      case 'group_info': {
        if (!context.isGroup) {
          return { error: 'Tool group_info hanya dapat digunakan di dalam grup WhatsApp.' };
        }
        return {
          isGroup: true,
          chatJid: context.chatJid,
          groupName: context.groupName || 'WhatsApp Group',
          participantsCount: context.participantsCount || 'N/A',
        };
      }

      case 'text_tools': {
        const action = args.action;
        const text = String(args.text || '');
        const crypto = require('crypto');

        switch (action) {
          case 'base64_encode':
            return { result: Buffer.from(text).toString('base64') };
          case 'base64_decode':
            return { result: Buffer.from(text, 'base64').toString('utf-8') };
          case 'md5':
            return { result: crypto.createHash('md5').update(text).digest('hex') };
          case 'sha256':
            return { result: crypto.createHash('sha256').update(text).digest('hex') };
          case 'word_count':
            return {
              wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
              charCount: text.length,
              charCountNoSpaces: text.replace(/\s+/g, '').length,
            };
          case 'reverse':
            return { result: text.split('').reverse().join('') };
          default:
            return { error: 'Operasi text "' + action + '" tidak dikenal.' };
        }
      }

      case 'create_artifact': {
        const artifactManager = require('./artifactManager');
        const prevArt = (context && context.createdArtifacts && context.createdArtifacts.length > 0)
          ? context.createdArtifacts[context.createdArtifacts.length - 1]
          : null;

        // Jika dalam iterasi sebelumnya di giliran yang sama sudah pernah membuat artefak bertipe sama, perbarui saja agar tidak dobel/duplikat
        if (prevArt && (!args.filename || args.filename === prevArt.filename)) {
          const updated = await artifactManager.editArtifact({
            id: prevArt.id,
            filename: prevArt.filename,
            content: args.content,
            description: args.title || 'Diperbarui otomatis oleh agen',
          });
          return updated;
        }

        const art = await artifactManager.createArtifact({
          filename: args.filename,
          filetype: args.filetype,
          title: args.title,
          content: args.content,
          data: args.data,
          userId: context && context.userId,
          ownerUsername: context && context.ownerUsername,
        });
        return {
          success: true,
          id: art.id,
          filename: art.filename,
          filetype: art.filetype,
          size: art.size,
          downloadUrl: art.downloadUrl,
          previewUrl: art.previewUrl,
          message: art.message,
        };
      }

      case 'edit_artifact': {
        const artifactManager = require('./artifactManager');
        const art = await artifactManager.editArtifact({
          filename: args.filename,
          content: args.content,
          description: args.description,
        });
        return {
          success: true,
          id: art.id,
          filename: art.filename,
          filetype: art.filetype,
          size: art.size,
          downloadUrl: art.downloadUrl,
          previewUrl: art.previewUrl,
          message: art.message,
          isEdit: true,
        };
      }

      case 'read_artifact': {
        const artifactManager = require('./artifactManager');
        return artifactManager.readArtifactContent(args.filename);
      }

      case 'manage_memory': {
        const hermesAdaptive = require('./hermesAdaptive');
        const action = args.action;
        if (action === 'add_fact') {
          return hermesAdaptive.addLearnedFact(args.fact, args.category || 'experience');
        } else if (action === 'set_preference') {
          return hermesAdaptive.setPreference(args.key, args.value);
        } else if (action === 'add_correction') {
          return hermesAdaptive.addCorrection(args.wrong_behavior, args.right_behavior);
        }
        return { error: 'Aksi manage_memory tidak valid: ' + action };
      }

      case 'create_new_skill': {
        const hermesAdaptive = require('./hermesAdaptive');
        return hermesAdaptive.createSkillFile({
          name: args.name,
          description: args.description,
          type: args.type || 'js',
          code: args.code,
          parameters: args.parameters,
        });
      }

      case 'extract_skill_zip': {
        const skillManager = require('../server/skillManager');
        const zipName = args.zip_name || '';
        let zipPath = zipName;
        if (!path.isAbsolute(zipPath)) {
          zipPath = path.join(skillManager.SKILLS_DIR, zipName);
        }
        if (!fs.existsSync(zipPath)) {
          return { error: 'File zip tidak ditemukan di ' + zipPath };
        }
        const tools = await skillManager.extractAndLoadZipSkill(zipPath);
        return {
          success: true,
          message: 'File ZIP ' + path.basename(zipPath) + ' berhasil diekstrak dan dimuat ke runtime Hermes.',
          loadedSkillsCount: tools.length,
          skills: tools.map((t) => t.name),
        };
      }

      default: {
        try {
          const skillManager = require('../server/skillManager');
          const customTools = skillManager.getCustomTools();
          const custom = customTools.find(
            (t) => t.name === toolName || t.rawName === toolName || (Array.isArray(t.aliases) && t.aliases.includes(toolName))
          );
          if (custom && typeof custom.execute === 'function') {
            return await custom.execute(args, context);
          }
        } catch (_) {}
        return { error: 'Tool "' + toolName + '" tidak tersedia.' };
      }
    }
  } catch (err) {
    return { error: 'Error eksekusi tool ' + toolName + ': ' + err.message };
  }
}

// ==================== 3. SYSTEM PROMPT BUILDER ====================
function buildHermesSystemPrompt(userConfig = {}, agentContext = {}) {
  const customPrompt = userConfig.systemPrompt || '';
  const activeSkill = agentContext.activeSkill || null;
  const reasoningMode = agentContext.reasoningMode || 'flash';

  let customTools = [];
  try {
    const skillManager = require('../server/skillManager');
    customTools = skillManager.getCustomTools();
  } catch (_) {}

  const allTools = [...HERMES_TOOLS, ...customTools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters }))];
  const toolsJson = JSON.stringify(allTools, null, 2);

  const hermesAdaptive = require('./hermesAdaptive');
  const personaGuide = hermesAdaptive.getPersonaInstruction(agentContext.senderNumber);
  const memoryContext = hermesAdaptive.getMemoryContext();

  let prompt = 'You are Hermes 3, an advanced autonomous AI agent integrated with the WhatsApp bot ecosystem.\n';

  // 1. Injeksi Persona Mirroring (Meniru gaya bicara pengguna/tuannya)
  if (personaGuide) {
    prompt += '\n' + personaGuide + '\n';
  }

  // 2. Injeksi Long-term Memory (Fakta yang sudah dipelajari & preferensi)
  if (memoryContext) {
    prompt += '\n' + memoryContext + '\n';
  }

  // 3. Injeksi Desain UI/UX Pro Max Terintegrasi
  prompt += '\n' + hermesAdaptive.UI_UX_PRO_MAX_INSTRUCTION + '\n';

  // 4. Injeksi Active Skill Khusus jika dipanggil via /<namaskill>
  if (activeSkill) {
    prompt += '\n[CURRENT ACTIVATED SKILL: ' + (activeSkill.displayName || activeSkill.rawName || activeSkill.name) + ']\n';
    prompt += 'Panduan/Aturan Lengkap Skill:\n' + (activeSkill.instructions ? activeSkill.instructions.slice(0, 4500) : (activeSkill.description || '')) + '\n';
    prompt += 'Kamu WAJIB mengimplementasikan tugas pengguna saat ini dengan mematuhi penuh keahlian skill di atas!\n';
  }

  if (customPrompt) {
    prompt += '\n[Custom Instruction]\n' + customPrompt + '\n';
  }

  // 5. Injeksi Reasoning Mode: Flash vs Thinking
  if (reasoningMode === 'thinking') {
    prompt += '\n[REASONING MODE: DEEP THINKING ACTIVATED]\n' +
      'Before producing your final response, you MUST conduct deep, rigorous reasoning, self-reflection, and analysis inside `<thinking>` and `</thinking>` tags.\n' +
      'Inside `<thinking>`, analyze the problem step-by-step, verify analytical derivations, explore edge cases, and plan your response structure.\n' +
      'After the closing `</thinking>` tag, present your polished, structured, and complete final answer.\n';
  } else {
    prompt += '\n[REASONING MODE: FLASH ACTIVATED]\n' +
      'Provide rapid, direct, and concise yet thorough responses without unnecessary preamble.\n';
  }

  // 5b. Injeksi Direktif Intensi Khusus dari Hermes Intent Engine
  if (agentContext.intentDirective) {
    prompt += '\n' + agentContext.intentDirective + '\n';
  }

  // 6. Response Engine Guidelines (Always active)
  prompt += '\nSTRUCTURED RESPONSE COMPLIANCE (RESPONSE ENGINE):\n' +
    '- Tables: Always use standard semantic Markdown tables (| Col 1 | Col 2 |\\n|:---|---:|) with clear headers.\n' +
    '- Mathematics: Always use KaTeX notation. Use $$ ... $$ for standalone/display equations and \\( ... \\) for inline expressions. For math calculations, follow the 5-step style: 1. Diketahui; 2. Rumus; 3. Substitusi; 4. Perhitungan; 5. Jawaban akhir dalam \\boxed{...}.\n' +
    '- Code & JSON: Always use fenced code blocks with explicit language specifiers (```javascript, ```python, ```html, ```json, etc.).\n' +
    '- Checklists: Use task lists (- [ ] Belum selesai, - [x] Selesai).\n' +
    '- Callouts: Use standard blockquote alerts (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT]).\n' +
    '- ADAPTIVE PERSONA: Sesuaikan gaya bahasa dan panggilanmu dengan pengguna. Tanggapi dengan cerdas, sigap, dan solutif.\n';

  // 7. Strict Tool & Skill Gating:
  // ONLY provide tools when an active skill was triggered via /<skill_name>
  if (activeSkill) {
    // Injeksi Daftar Artefak Terkini jika skill aktif
    try {
      const artifactManager = require('./artifactManager');
      const recentArts = artifactManager.getAllArtifacts(10);
      if (recentArts.length > 0) {
        prompt += '\n[EXISTING ARTIFACTS IN WORKSPACE]\n' +
          recentArts.map((a) => `- ${a.filename} (ID: ${a.id}, Tipe: ${a.filetype}, Ukuran: ${a.size})`).join('\n') +
          '\nJika diminta mengedit atau memperbarui salah satu file di atas, gunakan "read_artifact" lalu "edit_artifact"!\n';
      }
    } catch (_) {}

    prompt += '\nYou have access to the following tools for this active skill:\n<tools>\n' + toolsJson + '\n</tools>\n\n' +
      'Instructions for Tool Execution:\n' +
      '1. Call the appropriate tool when needed.\n' +
      '2. ARTIFACT CREATION & EDITING: You CAN and MUST create real physical files whenever requested using the "create_artifact" tool!\n' +
      '3. To invoke a tool, write ONLY the tool call block in this format:\n' +
      '<tool_call>\n' +
      '{"name": "tool_name", "arguments": {"param1": "value1"}}\n' +
      '</tool_call>\n' +
      '4. Once you receive the <tool_response>, synthesize all data and provide your comprehensive final response.\n';
  } else {
    // STRICT CONVERSATIONAL REASONING MODE: NO TOOLS
    prompt += '\n[STRICT CONVERSATIONAL REASONING MODE]\n' +
      'No external tools or skills are loaded for this request. You are operating as a pure analytical and reasoning AI model.\n' +
      'You MUST NOT attempt to invoke external tools, function calls, or file creation syntax unless the user explicitly triggers an authorized skill using the slash command `/<skill_name>` (e.g. `/coding`, `/math`, `/research`, etc.).\n' +
      'Answer directly, analytically, logically, and comprehensively using your own intelligence and mathematical/logical expertise.\n';
  }

  return prompt;
}

// ==================== 4. PARSER TOOL CALLS ====================
// Helper: validasi apakah sebuah nama merupakan nama tool/skill resmi
function isKnownToolName(name) {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (HERMES_TOOLS.some((t) => t.name === clean)) return true;
  try {
    const skillManager = require('../server/skillManager');
    const customTools = skillManager.getCustomTools();
    if (customTools.some((t) => t.name === clean || t.rawName === clean || (Array.isArray(t.aliases) && t.aliases.includes(clean)))) {
      return true;
    }
  } catch (_) {}
  return false;
}

// Tokenizer argumen fungsi ramah HTML/CSS (tidak terpotong tanda kurung atau tanda kutip di dalam konten)
function parseFuncArguments(str) {
  const args = {};
  let i = 0;
  const len = str.length;

  while (i < len) {
    while (i < len && (str[i] === ' ' || str[i] === '\t' || str[i] === '\n' || str[i] === '\r' || str[i] === ',')) {
      i++;
    }
    if (i >= len) break;

    let keyStart = i;
    while (i < len && /[a-zA-Z0-9_]/.test(str[i])) i++;
    const key = str.slice(keyStart, i);
    if (!key) { i++; continue; }

    while (i < len && (str[i] === ' ' || str[i] === '\t')) i++;
    if (i >= len || str[i] !== '=') continue;
    i++; // lewati '='

    while (i < len && (str[i] === ' ' || str[i] === '\t' || str[i] === '\n' || str[i] === '\r')) i++;
    if (i >= len) break;

    let val = '';
    const quoteChar = str[i];

    if (quoteChar === "'" || quoteChar === '"' || quoteChar === '`') {
      i++; // lewati quote pembuka
      let valStart = i;
      let escaped = false;
      while (i < len) {
        if (escaped) {
          escaped = false;
          i++;
        } else if (str[i] === '\\') {
          escaped = true;
          i++;
        } else if (str[i] === quoteChar) {
          break;
        } else {
          i++;
        }
      }
      val = str.slice(valStart, i);
      if (i < len && str[i] === quoteChar) i++; // lewati quote penutup
      val = val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    } else if (quoteChar === '{' || quoteChar === '[') {
      const closeChar = quoteChar === '{' ? '}' : ']';
      let depth = 0;
      let jsonStart = i;
      while (i < len) {
        if (str[i] === quoteChar) depth++;
        else if (str[i] === closeChar) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      const rawJson = str.slice(jsonStart, i);
      try {
        val = JSON.parse(rawJson);
      } catch (_) {
        val = rawJson;
      }
    } else {
      let valStart = i;
      while (i < len && str[i] !== ',' && str[i] !== ')' && str[i] !== ']') i++;
      val = str.slice(valStart, i).trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === 'null') val = null;
      else if (!isNaN(Number(val)) && val !== '') val = Number(val);
    }

    args[key] = val;
  }

  return args;
}

function parseToolCalls(text) {
  if (!text || typeof text !== 'string') return [];

  const toolCalls = [];

  // 1. Format: <tool_call> ... </tool_call>
  const regexXml = /<tool_call>([\s\S]*?)(?:<\/tool_call>|$)/gi;
  let match;
  while ((match = regexXml.exec(text)) !== null) {
    let rawChunk = (match[1] || '').trim();
    if (!rawChunk) continue;

    let parsed = null;
    try {
      parsed = JSON.parse(rawChunk);
    } catch (_) {
      const suffixes = ['}', '}}', '"}}', '"}', '"]}}', '"}\n}}'];
      for (const s of suffixes) {
        try {
          parsed = JSON.parse(rawChunk + s);
          if (parsed && parsed.name) break;
        } catch (_) {}
      }
      if (!parsed || !parsed.name) {
        const nameM = rawChunk.match(/"name"\s*:\s*"([^"]+)"/);
        if (nameM) {
          const name = nameM[1];
          const args = {};
          const queryM = rawChunk.match(/"query"\s*:\s*"([^"]+)"/);
          const exprM = rawChunk.match(/"expression"\s*:\s*"([^"]+)"/);
          const urlM = rawChunk.match(/"url"\s*:\s*"([^"]+)"/);
          const actionM = rawChunk.match(/"action"\s*:\s*"([^"]+)"/);
          const tzM = rawChunk.match(/"timezone"\s*:\s*"([^"]+)"/);

          if (queryM) args.query = queryM[1];
          if (exprM) args.expression = exprM[1];
          if (urlM) args.url = urlM[1];
          if (actionM) args.action = actionM[1];
          if (tzM) args.timezone = tzM[1];

          parsed = { name, arguments: args };
        }
      }
    }

    if (parsed && isKnownToolName(parsed.name)) {
      toolCalls.push({
        name: parsed.name,
        arguments: parsed.arguments || {},
        raw: match[0],
      });
    }
  }

  if (toolCalls.length > 0) return toolCalls;

  // 1b. Format: <invoke name="..."> ... </invoke> (Claude / Dots / Anthropic XML style)
  const regexInvoke = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)(?:<\/invoke>|$)/gi;
  let invMatch;
  while ((invMatch = regexInvoke.exec(text)) !== null) {
    const fnName = invMatch[1].trim();
    if (isKnownToolName(fnName)) {
      const body = invMatch[2] || '';
      const args = {};
      const paramRegex = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)(?:<\/parameter>|$)/gi;
      let pMatch;
      let foundParam = false;
      while ((pMatch = paramRegex.exec(body)) !== null) {
        foundParam = true;
        args[pMatch[1].trim()] = pMatch[2].trim();
      }
      if (!foundParam && body.trim()) {
        args.content = body.trim();
      }
      toolCalls.push({
        name: fnName,
        arguments: args,
        raw: invMatch[0],
      });
    }
  }

  if (toolCalls.length > 0) return toolCalls;

  // 1c. Format: <dots_function_call>...<arg_value>...</arg_value> or <function_call>...
  const dotsRegex = /(?:<dots_function_call[^>]*>|<function_call[^>]*>)[\s\S]*?(create_artifact|edit_artifact|read_artifact|search_web|fetch_web_content|extract_skill_zip|create_new_skill|manage_memory)[\s\S]*?<arg_value>([\s\S]*?)(?:<\/arg_value>|<\/dots_function_call>|<\/function_call>|$)/gi;
  let dMatch;
  while ((dMatch = dotsRegex.exec(text)) !== null) {
    const fnName = dMatch[1].trim();
    if (isKnownToolName(fnName)) {
      let rawArg = dMatch[2].trim();
      let parsedArg = {};
      try {
        parsedArg = JSON.parse(rawArg);
      } catch (_) {
        parsedArg = { content: rawArg };
      }
      toolCalls.push({
        name: fnName,
        arguments: parsedArg,
        raw: dMatch[0],
      });
    }
  }

  if (toolCalls.length > 0) return toolCalls;

  // 2. Format: <|tool_call_start|>[tool_name(...)]<|tool_call_end|>
  if (text.includes('<|tool_call_start|>')) {
    const startIdx = text.indexOf('<|tool_call_start|>');
    const endIdx = text.indexOf('<|tool_call_end|>', startIdx);
    let chunk = endIdx !== -1 ? text.slice(startIdx + 19, endIdx) : text.slice(startIdx + 19);
    chunk = chunk.trim();
    if (chunk.startsWith('[')) chunk = chunk.slice(1);
    if (chunk.endsWith(']')) chunk = chunk.slice(0, -1);
    chunk = chunk.trim();

    const parenIdx = chunk.indexOf('(');
    if (parenIdx !== -1) {
      const fnName = chunk.slice(0, parenIdx).trim();
      const lastParenIdx = chunk.lastIndexOf(')');
      if (lastParenIdx > parenIdx && isKnownToolName(fnName)) {
        const argsStr = chunk.slice(parenIdx + 1, lastParenIdx);
        const parsedArgs = parseFuncArguments(argsStr);
        toolCalls.push({
          name: fnName,
          arguments: parsedArgs,
          raw: chunk,
        });
      }
    }
  }

  if (toolCalls.length > 0) return toolCalls;

  // 3. Format: [tool_name(...)] atau tool_name(...) dengan nama tool yang terdaftar
  const regexFunc = /\[?([a-zA-Z0-9_]+)\(([\s\S]*)\)\]?/i;
  const fMatch = regexFunc.exec(text.trim());
  if (fMatch) {
    const fnName = fMatch[1];
    if (isKnownToolName(fnName)) {
      const chunk = fMatch[0];
      const parenIdx = chunk.indexOf('(');
      const lastParenIdx = chunk.lastIndexOf(')');
      if (parenIdx !== -1 && lastParenIdx > parenIdx) {
        const argsStr = chunk.slice(parenIdx + 1, lastParenIdx);
        const parsedArgs = parseFuncArguments(argsStr);
        toolCalls.push({
          name: fnName,
          arguments: parsedArgs,
          raw: chunk,
        });
      }
    }
  }

  if (toolCalls.length > 0) return toolCalls;

  // 4. Format: Raw JSON { "name": "...", "arguments": { ... } }
  if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.name && isKnownToolName(parsed.name) && parsed.arguments) {
        return [{
          name: parsed.name,
          arguments: parsed.arguments,
          raw: text.trim(),
        }];
      }
    } catch (_) {}
  }

  return [];
}

// ==================== 5. MULTI-PROVIDER RESOLVER & CALL LLM ====================

function resolveProviderConfig(requestedModel, userConfig = {}) {
  let model = String(requestedModel || userConfig.model || HERMES_DEFAULT_MODEL).trim();
  const lower = model.toLowerCase();

  // Deteksi kunci API aktif dari konfigurasi atau environment
  const userKey = (userConfig.apiKey || '').trim();
  const requireUserKey = Boolean(userConfig && (userConfig.isIndependentAccount || userConfig.userId || userConfig.ownerUserId || userConfig.apiKey !== undefined));
  const isOpenRouterKey = userKey.startsWith('sk-or-') || (!requireUserKey && (process.env.OPENROUTER_API_KEY || process.env.HERMES_API_KEY || '').startsWith('sk-or-'));
  const isGroqKey = userKey.startsWith('gsk_') || (!requireUserKey && (process.env.GROQ_API_KEY || '').startsWith('gsk_'));

  // 1. Jika API Key adalah OpenRouter (sk-or-...), prioritaskan OpenRouter Gateway dan sesuaikan format model
  if (isOpenRouterKey && !lower.startsWith('models/gemini-') && !isGroqKey) {
    let key = userKey.startsWith('sk-or-') ? userKey : (requireUserKey ? userKey : (process.env.OPENROUTER_API_KEY || process.env.HERMES_API_KEY || ''));
    let resolvedModel = model;

    // Normalisasi nama model ke format resmi OpenRouter jika dipanggil tanpa namespace
    const openRouterMap = {
      'grok-2-latest': 'x-ai/grok-2-1212',
      'grok-beta': 'x-ai/grok-beta',
      'grok-2': 'x-ai/grok-2-1212',
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
      'gemini-2.5-flash': 'google/gemini-2.5-flash',
      'gemini-2.0-flash': 'google/gemini-2.0-flash-001',
      'gemini-1.5-flash': 'google/gemini-flash-1.5',
      'deepseek-chat': 'deepseek/deepseek-chat',
      'deepseek-r1': 'deepseek/deepseek-r1',
      'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
    };

    if (openRouterMap[lower]) {
      resolvedModel = openRouterMap[lower];
    }

    let baseUrl = 'https://openrouter.ai/api/v1';
    if (userConfig.baseUrl && userConfig.baseUrl.includes('openrouter.ai')) {
      baseUrl = userConfig.baseUrl;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    return {
      provider: 'openrouter',
      providerName: 'OpenRouter AI',
      model: resolvedModel,
      baseUrl,
      apiKey: key,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
        'HTTP-Referer': 'https://github.com/astraonyx-bot',
        'X-Title': 'Polaris Hermes Agent',
      },
    };
  }

  // 2. Google Gemini Direct
  if (lower.startsWith('gemini-') || lower.startsWith('models/gemini-') || (lower.includes('gemini') && !lower.includes('/'))) {
    let actualModel = model.replace(/^models\//, '');
    if (
      actualModel === 'gemini-2.0-flash' ||
      actualModel === 'gemini-1.5-flash' ||
      actualModel === 'gemini-1.5-pro' ||
      actualModel === 'gemini-2.0-flash-exp' ||
      actualModel === 'gemini-2.5-flash'
    ) {
      actualModel = 'gemini-3.6-flash';
    }
    let key = '';
    if (userConfig.apiKey && !userConfig.apiKey.startsWith('sk-or-') && !userConfig.apiKey.startsWith('gsk_')) {
      key = userConfig.apiKey;
    }
    if (!key && !requireUserKey && process.env.GEMINI_API_KEY) {
      key = process.env.GEMINI_API_KEY;
    }
    if (!key) {
      key = userConfig.apiKey || (!requireUserKey ? process.env.GEMINI_API_KEY : '') || '';
    }
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      model: actualModel,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: key,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
    };
  }

  // 3. Groq Cloud LPU Direct
  if (lower.startsWith('groq/') || (isGroqKey && (lower.startsWith('llama-') || lower.startsWith('mixtral-') || lower.startsWith('gemma2-')) && !lower.includes('/'))) {
    const cleanModel = model.startsWith('groq/') ? model.replace(/^groq\//, '') : model;
    let key = '';
    if (userConfig.apiKey && userConfig.apiKey.startsWith('gsk_')) {
      key = userConfig.apiKey;
    }
    if (!key && !requireUserKey && process.env.GROQ_API_KEY) {
      key = process.env.GROQ_API_KEY;
    }
    if (!key) {
      key = userConfig.apiKey || (!requireUserKey ? process.env.GROQ_API_KEY : '') || '';
    }
    return {
      provider: 'groq',
      providerName: 'Groq Cloud (LPU)',
      model: cleanModel,
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: key,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
    };
  }

  // 4. Grok / xAI Direct
  if (lower.startsWith('grok-') || lower.startsWith('xai/') || (lower.includes('grok') && !lower.includes('/'))) {
    let cleanModel = model.startsWith('xai/') ? model.replace(/^xai\//, '') : model;
    if (cleanModel === 'grok-beta') cleanModel = 'grok-2-latest';
    let key = '';
    if (userConfig.apiKey && userConfig.apiKey.startsWith('xai-')) {
      key = userConfig.apiKey;
    }
    if (!key && !requireUserKey && process.env.GROK_API_KEY && process.env.GROK_API_KEY.startsWith('xai-')) {
      key = process.env.GROK_API_KEY;
    }
    if (!key) {
      key = userConfig.apiKey || (!requireUserKey ? process.env.GROK_API_KEY : '') || '';
    }
    return {
      provider: 'grok',
      providerName: 'xAI (Grok)',
      model: cleanModel,
      baseUrl: 'https://api.x.ai/v1',
      apiKey: key,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
    };
  }

  // 5. DeepSeek Direct
  if (lower.startsWith('deepseek/') && !lower.includes(':') && (userConfig.apiKey || (!requireUserKey && process.env.DEEPSEEK_API_KEY))) {
    const cleanModel = model.replace(/^deepseek\//, '');
    let key = '';
    if (userConfig.apiKey && !userConfig.apiKey.startsWith('sk-or-') && !userConfig.apiKey.startsWith('gsk_')) {
      key = userConfig.apiKey;
    }
    if (!key && !requireUserKey && process.env.DEEPSEEK_API_KEY) {
      key = process.env.DEEPSEEK_API_KEY;
    }
    if (!key) {
      key = userConfig.apiKey || (!requireUserKey ? process.env.DEEPSEEK_API_KEY : '') || '';
    }
    return {
      provider: 'deepseek',
      providerName: 'DeepSeek API',
      model: cleanModel,
      baseUrl: 'https://api.deepseek.com',
      apiKey: key,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key,
      },
    };
  }

  // 6. OpenRouter Gateway (Default Fallback)
  let key = '';
  if (userConfig.apiKey && userConfig.apiKey.startsWith('sk-or-')) {
    key = userConfig.apiKey;
  }
  if (!key && !requireUserKey && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith('sk-or-')) {
    key = process.env.OPENROUTER_API_KEY;
  }
  if (!key && !requireUserKey && process.env.HERMES_API_KEY && process.env.HERMES_API_KEY.startsWith('sk-or-')) {
    key = process.env.HERMES_API_KEY;
  }
  if (!key) {
    key = userConfig.apiKey || (!requireUserKey ? (process.env.OPENROUTER_API_KEY || process.env.HERMES_API_KEY) : '') || '';
  }

  let baseUrl = 'https://openrouter.ai/api/v1';
  if (userConfig.baseUrl && !userConfig.baseUrl.includes('googleapis.com') && !userConfig.baseUrl.includes('api.groq.com') && !userConfig.baseUrl.includes('api.x.ai') && !userConfig.baseUrl.includes('api.deepseek.com')) {
    baseUrl = userConfig.baseUrl;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');
  return {
    provider: 'openrouter',
    providerName: 'OpenRouter AI',
    model,
    baseUrl,
    apiKey: key,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      'HTTP-Referer': 'https://github.com/astraonyx-bot',
      'X-Title': 'Polaris Hermes Agent',
    },
  };
}
async function callLlmEndpoint(messages, configObj) {
  const primaryModel = configObj.model || HERMES_DEFAULT_MODEL;
  const primaryResolved = resolveProviderConfig(primaryModel, configObj);

  // Jika user memilih provider sendiri (Gemini, Grok, Groq, DeepSeek),
  // JANGAN secara diam-diam beralih ke model gratis OpenRouter yang membingungkan!
  const isCustomProvider = primaryResolved.provider !== 'openrouter';
  const modelsToTry = isCustomProvider
    ? [primaryModel]
    : [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError = null;

  for (const model of modelsToTry) {
    const resolved = resolveProviderConfig(model, configObj);
    if (!resolved.apiKey) {
      const errText = `API Key untuk ${resolved.providerName} (${model}) belum diatur di .env. Silakan periksa di tab '🔑 API Keys & .env'.`;
      if (isCustomProvider) {
        throw new Error(errText);
      }
      lastError = new Error(errText);
      continue;
    }

    const endpoint = resolved.baseUrl.replace(/\/+$/, '') + '/chat/completions';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: resolved.headers,
        body: JSON.stringify({
          model: resolved.model,
          messages,
          temperature: configObj.temperature !== undefined ? Number(configObj.temperature) : 0.7,
          max_tokens: configObj.maxTokens ? Number(configObj.maxTokens) : 4096,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message || data?.error || ('HTTP ' + res.status);
        lastError = new Error('[' + resolved.providerName + ' - ' + resolved.model + '] ' + errMsg);
        if (isCustomProvider) {
          throw lastError;
        }
        continue;
      }

      const choice = data.choices?.[0];
      const content = choice?.message?.content || '';

      const nativeTools = choice?.message?.tool_calls;
      if (nativeTools && nativeTools.length > 0) {
        const first = nativeTools[0];
        let args = {};
        try {
          args = JSON.parse(first.function?.arguments || '{}');
        } catch (_) {}
        return {
          content: '<tool_call>\n' + JSON.stringify({ name: first.function?.name, arguments: args }) + '\n</tool_call>',
          model: resolved.model,
          provider: resolved.provider,
          rawChoice: choice,
        };
      }

      return { content, model: resolved.model, provider: resolved.provider, rawChoice: choice };
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error('[' + resolved.providerName + ' - ' + resolved.model + '] Waktu tunggu respon habis (Request timeout).');
      } else {
        lastError = err;
      }
      if (isCustomProvider) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Gagal menghubungi model AI.');
}

// ==================== 5b. RESPONSE CLEANER ====================
function cleanAssistantResponse(text, createdArtifacts = [], executedSteps = []) {
  let cleaned = String(text || '');

  // 1. Bersihkan semua tag XML/Function call yang bocor
  cleaned = cleaned
    .replace(/<(?:dots_)?function_call[\s\S]*?(?:<\/(?:dots_)?function_call>|$)/gi, '')
    .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, '')
    .replace(/<tool_response>[\s\S]*?(?:<\/tool_response>|$)/gi, '')
    .replace(/<invoke[\s\S]*?(?:<\/invoke>|$)/gi, '')
    .replace(/<parameter[\s\S]*?(?:<\/parameter>|$)/gi, '')
    .replace(/<arg_value>[\s\S]*?(?:<\/arg_value>|$)/gi, '')
    .replace(/<\|tool_call_start\|>[\s\S]*?(?:<\|tool_call_end\|>|$)/gi, '')
    .replace(/\[?(?:create_artifact|edit_artifact|read_artifact|search_web|fetch_web_content)\([\s\S]*?\)?\]?/gi, '')
    .trim();

  // 2. Jika teks masih berupa dump mentah JSON seperti {"content":"<!DOCTYPE...
  if (
    cleaned.startsWith('{"content":') ||
    cleaned.startsWith('{"filename":') ||
    cleaned.startsWith('{"success":') ||
    cleaned.startsWith('<<!DOCTYPE') ||
    cleaned.startsWith('<!DOCTYPE') ||
    cleaned.startsWith('<html')
  ) {
    cleaned = '';
  }

  // 3. Jika teks kosong setelah pembersihan, buat jawaban yang ramah dan elegan
  if (!cleaned || cleaned.length < 5) {
    if (createdArtifacts && createdArtifacts.length > 0) {
      const art = createdArtifacts[createdArtifacts.length - 1];
      cleaned = `File **${art.filename}** (${(art.filetype || 'FILE').toUpperCase()}, ${art.size}) telah berhasil dibuat dan siap digunakan! 🚀\n\nAnda dapat melihat pratinjau langsung secara interaktif atau mengunduhnya melalui tombol kartu artefak di bawah.`;
    } else if (executedSteps && executedSteps.length > 0) {
      const lastStep = executedSteps[executedSteps.length - 1];
      if (lastStep.result && lastStep.result.message) {
        cleaned = lastStep.result.message;
      } else {
        cleaned = `Tugas otonom telah selesai diproses melalui ${executedSteps.length} langkah alat.`;
      }
    } else {
      cleaned = 'Tugas berhasil diproses dan diselesaikan.';
    }
  }

  return cleaned;
}

// ==================== 6. AUTONOMOUS AGENT REACTION LOOP ====================
async function runAutonomousAgent({
  prompt,
  senderNumber = 'user',
  chatJid = 'private',
  isGroup = false,
  groupName = '',
  participantsCount = 0,
  userConfig = null,
  activeSkill = null,
  reasoningMode = 'flash',
  onProgress = null,
  apiKey = null,
  userId = null,
  ownerUsername = null,
}) {
  const hermesManager = require('../server/hermesManager');
  const hermesAdaptive = require('./hermesAdaptive');
  const cfg = userConfig ? { ...userConfig } : { ...hermesManager.getConfig() };
  if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
    cfg.apiKey = apiKey.trim();
  }

  // Validasi Kunci API Wajib: Bot Hermes tidak akan berjalan jika API key belum disetel
  const effectiveKey = (cfg.apiKey || '').trim();
  if (!effectiveKey || effectiveKey.length < 8) {
    const errorExplanation =
      `⚠️ *[Hermes AI Dinonaktifkan - API Key Belum Disetel]*\n\n` +
      `Sistem Hermes AI tidak dapat berjalan karena akun pemilik bot belum menyetel API Key pribadi.\n\n` +
      `📌 *Penjelasan:*\n` +
      `• Setiap akun di platform ini beroperasi independen dan wajib menggunakan API Key mandiri (Google Gemini / OpenRouter / Groq).\n` +
      `• Hal ini untuk menjaga isolasi token, kuota, dan privasi penuh percakapan masing-masing akun tanpa menggunakan kuota server bersama.\n\n` +
      `🔧 *Cara Mengaktifkan:*\n` +
      `1. Dapatkan API Key gratis di https://aistudio.google.com/ atau https://openrouter.ai/\n` +
      `2. Masuk ke Web Dashboard Polaris di browser Anda.\n` +
      `3. Buka menu *🧠 Hermes AI* atau *⚙️ Pengaturan Akun* lalu simpan API Key Anda.\n` +
      `Setelah API Key tersimpan, bot Hermes akan langsung aktif seketika! 🚀`;

    return {
      success: false,
      error: errorExplanation,
      needsApiKey: true,
      model: cfg.model || HERMES_DEFAULT_MODEL,
      steps: [],
      artifacts: [],
      iterations: 0,
      text: errorExplanation,
    };
  }

  // 1. Catat pesan raw pengguna ke riwayat percakapan mentah
  hermesAdaptive.recordRawChat({ senderNumber, role: 'user', content: prompt });

  // 2. Analisis gaya bicara pengguna & simpan persona adaptif secara otomatis
  hermesAdaptive.analyzeAndSavePersona(prompt, senderNumber);

  // 3. Catat koreksi/evaluasi otomatis jika user memberikan instruksi larangan/koreksi
  const lowerPrompt = String(prompt || '').toLowerCase();
  if (lowerPrompt.includes('jangan') && (lowerPrompt.includes('lagi') || lowerPrompt.includes('pakai') || lowerPrompt.includes('panggil'))) {
    hermesAdaptive.addCorrection(prompt, 'Patuhi instruksi koreksi dari pengguna', prompt);
  }

  // 4. Resolusi Pemanggilan Skill Eksplisit /<namaskill>
  let effectivePrompt = String(prompt || '').trim();
  let resolvedSkill = activeSkill;

  const slashMatch = effectivePrompt.match(/^\/([a-zA-Z0-9_\-]+)(?:\s+([\s\S]*))?$/);
  if (slashMatch) {
    const skillQuery = slashMatch[1].toLowerCase();
    const remainder = (slashMatch[2] || '').trim();
    const skillManager = require('../server/skillManager');
    const foundSkill = skillManager.findSkillByName(skillQuery);

    if (foundSkill) {
      resolvedSkill = foundSkill;
      effectivePrompt = remainder || `Gunakan keahlian ${foundSkill.displayName || foundSkill.name} untuk memproses tugas saya.`;
    } else {
      // Skill TIDAK DITEMUKAN: Berikan notifikasi ramah & daftar saran skill yang tersedia
      const suggestions = skillManager.suggestSkills(skillQuery);
      const suggestionList = suggestions.map((s) => `- \`/${s.rawName || s.name}\`: ${s.description ? s.description.slice(0, 85) : 'Skill siap pakai'}`).join('\n');
      const notFoundMsg = `Maaf, skill \`/${skillQuery}\` tidak ditemukan dalam katalog keahlian.\n\nBerikut beberapa skill yang tersedia dan siap Anda gunakan:\n${suggestionList}\n\n*Format pemanggilan:* \`/<nama_skill> <tugas atau instruksi Anda>\``;

      hermesAdaptive.recordRawChat({ senderNumber, role: 'assistant', content: notFoundMsg });

      return {
        success: true,
        text: notFoundMsg,
        steps: [],
        artifacts: [],
        model: cfg.model || HERMES_DEFAULT_MODEL,
        iterations: 0,
        sessionKey: chatJid + '_' + senderNumber,
      };
    }
  }

  // 5. Ambiguity Check: Pengecekan ambiguitas untuk instruksi yang belum cukup konteks
  if (resolvedSkill && (resolvedSkill.name === 'coding' || resolvedSkill.rawName === 'coding')) {
    const pLower = effectivePrompt.toLowerCase().trim();
    const isVagueGoal = /^(bikin|buat|create|make|build|tolong\s+bikin|tolong\s+buat)\s+(bot|aplikasi|app|web|website|program|script|sistem)$/i.test(pLower);
    const isTooShort = pLower.length < 25 && (pLower.includes('bot') || pLower.includes('aplikasi') || pLower.includes('website')) && !pLower.includes('fungsi') && !pLower.includes('function') && !pLower.includes('js') && !pLower.includes('python') && !pLower.includes('javascript') && !pLower.includes('html');

    if (isVagueGoal || isTooShort) {
      const clarifyMsg = `Untuk membuat **${effectivePrompt}** yang tepat, terstruktur, dan sesuai kebutuhan Anda, mohon berikan beberapa informasi penting berikut:

1. **Platform / Target**: Apakah bot/aplikasi untuk WhatsApp, Telegram, Discord, REST API, atau Web UI?
2. **Bahasa Pemrograman / Stack**: Node.js/JavaScript, Python, TypeScript, atau lainnya?
3. **Fitur & Perilaku Utama**: Apa tugas spesifik yang harus ada (misal: auto-reply pesan, integrasi AI, pengingat terjadwal, scraping web, atau database CRUD)?
4. **Kebutuhan Database / Storage**: Apakah membutuhkan database (PostgreSQL, MongoDB, SQLite/JSON) atau memori sesi sementara?

Setelah detail di atas Anda jelaskan, saya akan langsung merancang arsitektur dan membuatkan kodenya secara utuh! 🚀`;

      hermesAdaptive.recordRawChat({ senderNumber, role: 'assistant', content: clarifyMsg });

      return {
        success: true,
        text: clarifyMsg,
        steps: [],
        artifacts: [],
        model: cfg.model || HERMES_DEFAULT_MODEL,
        iterations: 0,
        sessionKey: chatJid + '_' + senderNumber,
      };
    }
  }

  const sessionKey = chatJid + '_' + senderNumber;
  let history = sessionMemory.get(sessionKey) || [];

  const hermesIntentEngine = require('./hermesIntentEngine');
  const intentAnalysis = hermesIntentEngine.analyzeIntent(effectivePrompt, { activeSkill: resolvedSkill, senderNumber });

  const isSkillTriggered = Boolean(resolvedSkill);
  const isTableIntent = intentAnalysis.primaryIntent === 'TABLE_GENERATION';
  const isChitChatIntent = intentAnalysis.primaryIntent === 'CASUAL_CHITCHAT';

  const systemMessage = {
    role: 'system',
    content: buildHermesSystemPrompt(cfg, {
      senderNumber,
      chatJid,
      isGroup,
      groupName,
      activeSkill: resolvedSkill,
      reasoningMode,
      intentDirective: intentAnalysis.systemPromptDirective,
    }),
  };

  const messages = [
    systemMessage,
    ...history.slice(-MAX_MEMORY_TURNS),
    { role: 'user', content: effectivePrompt },
  ];

  const executedSteps = [];
  const createdArtifacts = [];
  // STRICT SKILL TRIGGERING: Jika tidak ada skill yang ditrigger via /<skill>, atau intent adalah table/chitchat, iterasi dibatasi ke 1
  const maxIterations = (isSkillTriggered && !isTableIntent && !isChitChatIntent) ? 5 : 1;
  let currentIteration = 0;
  let finalAnswer = '';
  let usedModel = cfg.model || HERMES_DEFAULT_MODEL;

  const context = { chatJid, senderNumber, isGroup, groupName, participantsCount, createdArtifacts, userId, ownerUsername };

  // Initial thinking progress event
  let initialProgressTitle = 'Hermes sedang memproses jawaban...';
  let initialProgressIcon = '⚡';
  let initialProgressDetail = 'Menganalisis instruksi pengguna...';

  if (isTableIntent) {
    initialProgressTitle = 'Hermes sedang menyusun tabel data...';
    initialProgressIcon = '📊';
    initialProgressDetail = 'Format Markdown Interaktif (Siap Salin & Sortir)';
  } else if (isChitChatIntent) {
    initialProgressTitle = 'Hermes merespon...';
    initialProgressIcon = '💬';
    initialProgressDetail = 'Percakapan Santai';
  } else if (isSkillTriggered) {
    initialProgressTitle = `Mengaktifkan skill: ${resolvedSkill.displayName || resolvedSkill.name}`;
    initialProgressIcon = '🎨';
    initialProgressDetail = 'Multi-step autonomous execution';
  } else if (reasoningMode === 'thinking') {
    initialProgressTitle = 'Hermes sedang melakukan penalaran mendalam...';
    initialProgressIcon = '🧠';
    initialProgressDetail = 'Analisis langkah demi langkah';
  }

  if (typeof onProgress === 'function') {
    onProgress({
      type: 'thinking',
      title: initialProgressTitle,
      detail: initialProgressDetail,
      icon: initialProgressIcon,
      step: 1,
    });
  }

  while (currentIteration < maxIterations) {
    currentIteration++;

    if (currentIteration > 1 && typeof onProgress === 'function') {
      onProgress({
        type: 'evaluating',
        title: `Mengevaluasi hasil langkah ${currentIteration - 1}...`,
        detail: 'Menentukan tindakan berikutnya atau menyusun jawaban akhir...',
        icon: '⚙️',
        step: currentIteration,
      });
    }

    const llmResult = await callLlmEndpoint(messages, cfg);
    usedModel = llmResult.model;
    const content = (llmResult.content || '').trim();

    // JIKA TIDAK ADA SKILL YANG DITRIGGER, ATAU INTENT ADALAH TABEL / CHITCHAT:
    // Model berjalan dalam Pure Direct Response Mode tanpa eksekusi tool eksternal
    if (!isSkillTriggered || isTableIntent || isChitChatIntent) {
      finalAnswer = content;
      break;
    }

    const toolCalls = parseToolCalls(content);

    if (!toolCalls || toolCalls.length === 0) {
      finalAnswer = content;
      break;
    }

    for (const tc of toolCalls) {
      const { name, arguments: toolArgs } = tc;

      // Label aksi yang ramah dan representatif layaknya Antigravity
      let actionTitle = 'Menjalankan alat otonom';
      let actionDetail = name;
      let actionIcon = '🛠️';

      if (name === 'create_artifact') {
        actionTitle = 'Membuat File Artefak Baru';
        actionDetail = `File: ${toolArgs.filename || 'dokumen'} (${(toolArgs.filetype || '').toUpperCase()})`;
        actionIcon = '📝';
      } else if (name === 'edit_artifact') {
        actionTitle = 'Mengedit File Artefak';
        actionDetail = `File: ${toolArgs.filename || 'file'} — ${toolArgs.description || 'Memperbarui konten kode'}`;
        actionIcon = '✏️';
      } else if (name === 'read_artifact') {
        actionTitle = 'Membaca File Artefak';
        actionDetail = `File: ${toolArgs.filename || 'dokumen'}`;
        actionIcon = '📖';
      } else if (name === 'search_web') {
        actionTitle = 'Mencari Informasi di Web';
        actionDetail = `Query: "${toolArgs.query || ''}"`;
        actionIcon = '🔍';
      } else if (name === 'fetch_web_content') {
        actionTitle = 'Membaca Konten Web';
        actionDetail = `URL: ${toolArgs.url || ''}`;
        actionIcon = '🌐';
      } else if (name === 'extract_skill_zip') {
        actionTitle = 'Mengekstrak Arsip ZIP Skill';
        actionDetail = `Arsip: ${toolArgs.filename || 'skill.zip'}`;
        actionIcon = '📦';
      } else if (name === 'create_new_skill') {
        actionTitle = 'Menciptakan Keahlian Baru';
        actionDetail = `Skill: ${toolArgs.name || 'custom'}`;
        actionIcon = '🛠️';
      } else if (name === 'manage_memory') {
        actionTitle = 'Memperbarui Memori Sesi';
        actionDetail = `Aksi: ${toolArgs.action || 'fakta'}`;
        actionIcon = '🧠';
      } else if (name === 'calculator') {
        actionTitle = 'Menghitung Matematika';
        actionDetail = `Formula: ${toolArgs.expression || ''}`;
        actionIcon = '🧮';
      } else if (name.startsWith('ui_ux') || name.includes('design') || name.includes('banner') || name.includes('slide')) {
        actionTitle = 'Menerapkan Desain & Styling';
        actionDetail = `${name}: Menyusun layout, palette & spesifikasi`;
        actionIcon = '🎨';
      }

      if (typeof onProgress === 'function') {
        onProgress({
          type: 'tool_start',
          title: actionTitle,
          detail: actionDetail,
          icon: actionIcon,
          tool: name,
          args: toolArgs,
          step: currentIteration,
        });
      }

      const toolResult = await executeTool(name, toolArgs, context);

      if (typeof onProgress === 'function') {
        let resultSummary = 'Selesai dieksekusi';
        if (name === 'create_artifact' && toolResult && toolResult.success) {
          resultSummary = `Selesai: ${toolResult.filename} (${toolResult.size})`;
        } else if (name === 'edit_artifact' && toolResult && toolResult.success) {
          resultSummary = `Diperbarui: ${toolResult.filename} (${toolResult.size})`;
        } else if (name === 'read_artifact' && toolResult && toolResult.success) {
          resultSummary = `Selesai membaca: ${toolResult.filename} (${toolResult.size})`;
        } else if (toolResult && toolResult.message) {
          resultSummary = toolResult.message;
        }

        onProgress({
          type: 'tool_done',
          title: actionTitle,
          detail: resultSummary,
          icon: '✓',
          tool: name,
          result: toolResult,
          step: currentIteration,
        });
      }

      executedSteps.push({
        step: currentIteration,
        tool: name,
        arguments: toolArgs,
        result: toolResult,
        title: actionTitle,
        detail: actionDetail,
        icon: actionIcon,
      });

      if ((name === 'create_artifact' || name === 'edit_artifact') && toolResult && toolResult.success) {
        const existingIdx = createdArtifacts.findIndex(a => a.id === toolResult.id || a.filename === toolResult.filename);
        if (existingIdx >= 0) {
          createdArtifacts[existingIdx] = toolResult;
        } else {
          createdArtifacts.push(toolResult);
        }
      }

      messages.push({
        role: 'assistant',
        content: '<tool_call>\n' + JSON.stringify({ name, arguments: toolArgs }) + '\n</tool_call>',
      });

      messages.push({
        role: 'user',
        content: '<tool_response>\n' + JSON.stringify({ name, result: toolResult }) + '\n</tool_response>',
      });
    }
  }

  if (typeof onProgress === 'function') {
    onProgress({
      type: 'synthesizing',
      title: 'Menyusun rangkuman jawaban...',
      detail: 'Menyelesaikan laporan dan menyajikan artefak',
      icon: '✨',
      step: currentIteration + 1,
    });
  }

  // Bersihkan teks akhir secara menyeluruh dari kode atau markup fungsi yang bocor
  finalAnswer = cleanAssistantResponse(finalAnswer, createdArtifacts, executedSteps);

  history.push({ role: 'user', content: effectivePrompt });
  history.push({ role: 'assistant', content: finalAnswer });
  while (history.length > MAX_MEMORY_TURNS * 2) history.shift();
  sessionMemory.set(sessionKey, history);

  // Catat respons assistant ke riwayat raw chat terpisah
  hermesAdaptive.recordRawChat({
    senderNumber,
    role: 'assistant',
    content: finalAnswer,
    toolCalls: executedSteps.map((s) => ({ tool: s.tool, args: s.arguments })),
  });

  return {
    success: true,
    text: finalAnswer,
    steps: executedSteps,
    artifacts: createdArtifacts,
    model: usedModel,
    iterations: currentIteration,
    sessionKey,
  };
}

// ==================== 7. MEMORY HELPERS ====================
function clearSessionMemory(sessionKey) {
  if (sessionKey) {
    sessionMemory.delete(sessionKey);
    return true;
  }
  sessionMemory.clear();
  return true;
}

function getMemoryStats() {
  let customTools = [];
  try {
    const skillManager = require('../server/skillManager');
    customTools = skillManager.getCustomTools();
  } catch (_) {}

  const allTools = [...HERMES_TOOLS, ...customTools];
  let totalMessages = 0;
  sessionMemory.forEach((arr) => {
    totalMessages += arr.length;
  });
  return {
    activeSessions: sessionMemory.size,
    totalMessages,
    registeredToolsCount: allTools.length,
    tools: allTools.map((t) => ({ name: t.name, description: t.description, isCustom: Boolean(t.isCustom) })),
  };
}

module.exports = {
  HERMES_TOOLS,
  HERMES_DEFAULT_MODEL,
  executeTool,
  buildHermesSystemPrompt,
  resolveProviderConfig,
  runAutonomousAgent,
  clearSessionMemory,
  getMemoryStats,
};
