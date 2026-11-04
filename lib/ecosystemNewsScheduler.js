// lib/ecosystemNewsScheduler.js — Mesin Berita Otomatis untuk Grup "Polaris • Global Hot News"
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { db } = require('../server/db');
const botEcosystemGroups = require('./botEcosystemGroups');
const config = require('../config');

// Sumber Portal Berita Utama Market & Intelligence
const NEWS_CHANNELS = [
  {
    name: 'Saham & Market Indonesia',
    url: 'https://news.google.com/rss/search?q=when:24h+saham+IHSG+bursa+efek+indonesia&hl=id&gl=ID&ceid=ID:id',
    defaultCategory: '📈 Saham & Market',
    defaultSource: 'Market News',
  },
  {
    name: 'Crypto & Blockchain',
    url: 'https://news.google.com/rss/search?q=when:24h+bitcoin+crypto+blockchain+ethereum&hl=id&gl=ID&ceid=ID:id',
    defaultCategory: '🪙 Crypto & Blockchain',
    defaultSource: 'Crypto News',
  },
  {
    name: 'Fintech & Ekonomi',
    url: 'https://news.google.com/rss/search?q=when:24h+fintech+ekonomi+investasi+reksadana+indonesia&hl=id&gl=ID&ceid=ID:id',
    defaultCategory: '💰 Fintech & Ekonomi',
    defaultSource: 'Finance News',
  },
  {
    name: 'AI & Teknologi',
    url: 'https://news.google.com/rss/search?q=when:24h+artificial+intelligence+AI+teknologi+startup&hl=id&gl=ID&ceid=ID:id',
    defaultCategory: '🤖 AI & Teknologi',
    defaultSource: 'Tech News',
  },
  {
    name: 'Space & Science',
    url: 'https://news.google.com/rss/search?q=when:24h+NASA+SpaceX+space+science+sains&hl=en&gl=US&ceid=US:en',
    defaultCategory: '🔬 Space & Science',
    defaultSource: 'Science News',
  },
  {
    name: 'Bisnis & Startup Indonesia',
    url: 'https://news.google.com/rss/search?q=when:24h+startup+unicorn+bisnis+digital+indonesia&hl=id&gl=ID&ceid=ID:id',
    defaultCategory: '🏢 Bisnis & Startup',
    defaultSource: 'Business News',
  },
];

// Direktori Referensi Instagram (Market & Growth)
const INSTAGRAM_SOURCES = [
  { category: '📈 Saham & Market', accounts: [
    { username: 'stockmate.idn', label: 'StockMate' },
    { username: 'sahamtalk', label: 'Saham Talk' },
    { username: 'beritasaham.id', label: 'Berita Saham' },
    { username: 'idx_channel', label: 'IDX Channel' },
    { username: 'stockwise.id', label: 'StockWise' },
    { username: 'stockwaveidn', label: 'StockWave' },
    { username: 'stockalpha.id', label: 'StockAlpha' },
  ]},
  { category: '🪙 Crypto & Blockchain', accounts: [
    { username: 'jackcryptoind', label: 'Jack Crypto' },
    { username: 'cryptoalpha.id', label: 'CryptoAlpha' },
    { username: 'cryptowise.id', label: 'CryptoWise' },
    { username: 'cryptowaveid', label: 'CryptoWave' },
    { username: 'bitorexpost', label: 'Bitorex Post' },
  ]},
  { category: '💰 Keuangan & Bisnis', accounts: [
    { username: 'tumbuhkaya.id', label: 'Tumbuh Kaya' },
    { username: 'bareksa', label: 'Bareksa' },
    { username: 'miliardermuda__', label: 'Miliarder Muda' },
    { username: 'ternakuang.id', label: 'Ternak Uang' },
    { username: 'bisnismillenial', label: 'Bisnis Millenial' },
    { username: 'theeconomicinfluence.id', label: 'Economic Influence' },
    { username: 'bloombergtechnoz', label: 'Bloomberg Technoz' },
  ]},
  { category: '🧠 Mindset & Growth', accounts: [
    { username: 'mental_juara.id', label: 'Mental Juara' },
    { username: 'rawatcita.id', label: 'Rawat Cita' },
    { username: 'ruangpikirr.id', label: 'Ruang Pikir' },
  ]},
  { category: '🔬 Tech & Science', accounts: [
    { username: 'neuraai.id', label: 'Neura AI' },
    { username: 'teknologi_id', label: 'Teknologi ID' },
    { username: 'nasa', label: 'NASA' },
    { username: 'spacescience', label: 'Space Science' },
    { username: 'metavulus', label: 'Metavulus' },
  ]},
  { category: '📰 News & Media', accounts: [
    { username: 'wo.ai.ni.media', label: 'Wo Ai Ni Media' },
    { username: 'cretivox', label: 'Cretivox' },
    { username: 'pinterpolitik', label: 'Pinter Politik' },
  ]},
];

/**
 * Helper untuk mengekstrak media (og:image, og:video, thumbnail) dari URL artikel
 */
async function extractMediaFromArticleUrl(articleUrl) {
  if (!articleUrl) return null;
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Cek video OpenGraph atau video tag
    const ogVideo = $('meta[property="og:video"]').attr('content') ||
                    $('meta[property="og:video:secure_url"]').attr('content') ||
                    $('meta[property="og:video:url"]').attr('content') ||
                    $('video source').first().attr('src');

    if (ogVideo && ogVideo.startsWith('http')) {
      return { mediaType: 'video', mediaUrl: ogVideo };
    }

    // Cek gambar OpenGraph, twitter card, atau hero image
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                    $('meta[property="og:image:secure_url"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content') ||
                    $('meta[name="twitter:image:src"]').attr('content') ||
                    $('article img').first().attr('src');

    if (ogImage && ogImage.startsWith('http') && !ogImage.includes('favicon') && !ogImage.includes('logo')) {
      return { mediaType: 'image', mediaUrl: ogImage };
    }
  } catch (_) {}
  return null;
}

/**
 * Mengambil berita terkini dari feed RSS Google News lengkap dengan thumbnail & media
 */
async function fetchLatestNews(limit = 6) {
  const articles = [];

  for (const channel of NEWS_CHANNELS) {
    if (articles.length >= limit) break;
    try {
      const res = await fetch(channel.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      let countFromThisFeed = 0;
      const rawItems = $('item').toArray();

      for (const el of rawItems) {
        if (countFromThisFeed >= 2 || articles.length >= limit) break;

        let title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        const rawDescription = $(el).find('description').text();
        let description = rawDescription.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
        let source = $(el).find('source').text().trim() || channel.defaultSource;

        // Cek apakah ada tag gambar di dalam deskripsi RSS
        let mediaUrl = null;
        let mediaType = null;

        const enclosureUrl = $(el).find('enclosure').attr('url');
        const enclosureType = $(el).find('enclosure').attr('type') || '';
        if (enclosureUrl && enclosureUrl.startsWith('http')) {
          mediaUrl = enclosureUrl;
          mediaType = enclosureType.includes('video') ? 'video' : 'image';
        }

        const mediaContentUrl = $(el).find('media\\:content, content').attr('url');
        if (!mediaUrl && mediaContentUrl && mediaContentUrl.startsWith('http')) {
          mediaUrl = mediaContentUrl;
          mediaType = 'image';
        }

        if (!mediaUrl && rawDescription) {
          const imgMatch = rawDescription.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            mediaUrl = imgMatch[1];
            mediaType = 'image';
          }
        }

        // Bersihkan title dari publisher suffix dari Google News
        if (source) {
          const suffixPattern = new RegExp(` - ${source.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
          if (suffixPattern.test(title)) {
            title = title.replace(suffixPattern, '').trim();
          }
        }
        
        if (title.endsWith(' - Google News')) {
          title = title.slice(0, -14).trim();
        }

        if (title && link) {
          // Jika belum dapat media dan kuota headline masih sedikit, coba ekstrak OpenGraph
          if (!mediaUrl && countFromThisFeed === 0) {
            const ogMedia = await extractMediaFromArticleUrl(link);
            if (ogMedia) {
              mediaUrl = ogMedia.mediaUrl;
              mediaType = ogMedia.mediaType;
            }
          }

          articles.push({
            id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title,
            url: link,
            snippet: description.length > 150 ? description.slice(0, 147) + '...' : description,
            publishedAt: pubDate,
            category: channel.defaultCategory,
            source,
            mediaUrl,
            mediaType: mediaType || 'image',
          });
          countFromThisFeed++;
        }
      }
    } catch (err) {
      console.warn('[NewsScheduler] Gagal fetch feed:', channel.name, err.message);
    }
  }

  return articles;
}

/**
 * Menyusun dan mengirim rangkuman berita ke grup Polaris
 */
async function broadcastNewsDigest(sock, forced = false) {
  if (!sock) return { success: false, reason: 'Socket not connected' };

  try {
    const saved = botEcosystemGroups.getSavedData();
    const newsGid = saved.groups?.news?.jid;
    if (!newsGid) {
      console.warn('[NewsScheduler] Grup Polaris belum terdaftar atau belum dibuat.');
      return { success: false, reason: 'News group not found' };
    }

    const rawNews = await fetchLatestNews(6);
    if (!rawNews || rawNews.length === 0) {
      return { success: false, reason: 'No news articles found' };
    }

    // Filter berita yang belum pernah dikirim
    const checkStmt = db.prepare('SELECT id FROM ecosystem_news WHERE url = ?');
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO ecosystem_news (id, title, url, snippet, category, source, published_at, sent_to_group, created_at)
      VALUES (@id, @title, @url, @snippet, @category, @source, @published_at, 1, @created_at)
    `);

    const freshArticles = [];
    for (const item of rawNews) {
      const exists = checkStmt.get(item.url);
      if (!exists || forced) {
        freshArticles.push(item);
        insertStmt.run({
          id: item.id,
          title: item.title,
          url: item.url,
          snippet: item.snippet,
          category: item.category || 'Market & Teknologi',
          source: item.source,
          published_at: item.publishedAt,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (freshArticles.length === 0 && !forced) {
      console.log('[NewsScheduler] Semua berita terkini sudah pernah disiarkan sebelumnya.');
      return { success: true, message: 'All latest news already broadcasted' };
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const header = [
      `🌐 *[POLARIS MARKET INTELLIGENCE]*`,
      `──────────────────────────────`,
      `📅 *Waktu Rilis:* ${dateStr} • ${timeStr}`,
      `📰 *Fokus Berita:* Saham, Crypto, Tech, Science, Bisnis`,
      `🤖 *Kurasi Otomatis:* Polaris AI Market Intelligence Engine`,
      `──────────────────────────────`,
      `Berikut rangkuman berita terpenting dan perkembangan terkini hari ini:\n`,
    ];

    const body = freshArticles.map((art, idx) => {
      const numEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'][idx] || `[${idx + 1}]`;
      return [
        `${numEmoji} *${art.title}*`,
        `📂 _${art.category}_ • 🗞️ *[${art.source}]*`,
        art.snippet ? `📝 ${art.snippet}` : '',
        `🔗 ${art.url}`,
        '',
      ].filter(Boolean).join('\n');
    });

    const instaHeader = [
      `──────────────────────────────`,
      `📊 *DIREKTORI 30 KANAL MARKET & INTELIJEN*`,
      `_Kanal pilihan terkurasi (Saham, Kripto, Bisnis, AI & Sains):_\n`,
    ];

    const instaBody = INSTAGRAM_SOURCES.map(cat => {
      const accountsFormatted = cat.accounts.map(acc => `*${acc.label}* (instagram.com/${acc.username})`).join(' • ');
      return `${cat.category}:\n${accountsFormatted}`;
    }).join('\n\n');

    const instagramSection = [...instaHeader, instaBody, ''].join('\n');

    const footer = [
      `──────────────────────────────`,
      `⚡ *Polaris Intelligence Feed* disiarkan berkala setiap 4 jam.`,
      `📌 _Ketik /menu untuk eksplorasi seluruh kemampuan bot._`,
    ];

    // Kirim media foto / video headline jika tersedia (maks 2 artikel dengan media untuk efisiensi bandwidth)
    const mediaArticles = freshArticles.filter(a => a.mediaUrl).slice(0, 2);
    for (const art of mediaArticles) {
      try {
        const caption = [
          `📰 *[BREAKING NEWS MEDIA]*`,
          `🔥 *${art.title}*`,
          `📂 _${art.category}_ • 🗞️ *[${art.source}]*`,
          art.snippet ? `📝 ${art.snippet}` : '',
          `🔗 ${art.url}`,
        ].filter(Boolean).join('\n');

        if (art.mediaType === 'video') {
          await sock.sendMessage(newsGid, { video: { url: art.mediaUrl }, caption });
        } else {
          await sock.sendMessage(newsGid, { image: { url: art.mediaUrl }, caption });
        }
        await new Promise(r => setTimeout(r, 1200));
      } catch (mediaErr) {
        console.warn('[NewsScheduler] Gagal kirim media artikel:', mediaErr.message);
      }
    }

    const fullMessage = [...header, ...body, instagramSection, ...footer].join('\n');

    await sock.sendMessage(newsGid, { text: fullMessage });
    console.log(`[NewsScheduler] 🌟 Sukses mengirim ${freshArticles.length} berita (${mediaArticles.length} bermedia) ke grup Polaris!`);

    return { success: true, count: freshArticles.length, mediaCount: mediaArticles.length };
  } catch (err) {
    console.error('[NewsScheduler] Error broadcast berita:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Memulai scheduler berkala (setiap 4 jam)
 */
function startNewsScheduler(sock) {
  if (global.__newsSchedulerTimer) {
    clearInterval(global.__newsSchedulerTimer);
  }

  // Kirim perdana setelah delay 15 detik agar koneksi stabil
  setTimeout(() => {
    broadcastNewsDigest(sock, false).catch(() => {});
  }, 15000);

  // Interval setiap 4 jam
  global.__newsSchedulerTimer = setInterval(() => {
    broadcastNewsDigest(sock, false).catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

module.exports = {
  fetchLatestNews,
  broadcastNewsDigest,
  startNewsScheduler,
};
