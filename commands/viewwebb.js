// commands/viewwebb.js — Fitur In-App Webview WhatsApp
// Memungkinkan pengguna membuka dan menggunakan web langsung di dalam WhatsApp tanpa membuka Chrome

const cheerio = require('cheerio');
const config = require('../config');
const { box, usage, warning } = require('../lib/messageStyle');

const THEMES = {
  default: {
    key: 'default',
    emoji: '🌐',
    label: 'Standar',
    description: 'Pratinjau web standar.',
    separator: '━━━━━━━━━━━━━━━━━━━━',
    headerEmoji: '🌍',
    bodyText: 'Membuka pratinjau web standar',
    defaultThumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80'
  },
  glassmorphism: {
    key: 'glassmorphism',
    emoji: '🪟',
    label: 'Glassmorphism',
    description: 'Efek transparan dan bercahaya.',
    separator: '✧༺♥༻∞༺♥༻✧',
    headerEmoji: '🔮',
    bodyText: 'Menembus batas visual kaca',
    defaultThumbnail: 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?w=800&q=80'
  },
  editorial: {
    key: 'editorial',
    emoji: '📰',
    label: 'Editorial',
    description: 'Gaya majalah dan koran.',
    separator: '─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───',
    headerEmoji: '🖋️',
    bodyText: 'Membaca rilis artikel terkini',
    defaultThumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'
  },
  minimalist: {
    key: 'minimalist',
    emoji: '◻️',
    label: 'Minimalis',
    description: 'Bersih, rapi, dan elegan.',
    separator: '・────・────・',
    headerEmoji: '⚪',
    bodyText: 'Kesederhanaan dalam setiap piksel',
    defaultThumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80'
  },
  modern: {
    key: 'modern',
    emoji: '🎨',
    label: 'Modern',
    description: 'Warna berani dan geometris.',
    separator: '▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀▄▀',
    headerEmoji: '🚀',
    bodyText: 'Eksplorasi desain web modern',
    defaultThumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80'
  },
  immersive: {
    key: 'immersive',
    emoji: '🌌',
    label: 'Imersif',
    description: 'Gelap, 3D, dengan aksen neon.',
    separator: '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰',
    headerEmoji: '💫',
    bodyText: 'Terjun ke dalam dimensi maya',
    defaultThumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80'
  },
  retro: {
    key: 'retro',
    emoji: '📜',
    label: 'Retro',
    description: 'Nuansa vintage kertas tua.',
    separator: '════ ⋆★⋆ ════',
    headerEmoji: '📻',
    bodyText: 'Menyusuri memori masa lalu',
    defaultThumbnail: 'https://images.unsplash.com/photo-1453738773917-9c307973c5e7?w=800&q=80'
  },
  darkmode: {
    key: 'darkmode',
    emoji: '🌑',
    label: 'Mode Gelap',
    description: 'Hitam pekat, hemat daya.',
    separator: '▪️▫️▪️▫️▪️▫️▪️▫️▪️▫️▪️',
    headerEmoji: '🌙',
    bodyText: 'Navigasi dalam keheningan malam',
    defaultThumbnail: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&q=80'
  }
};

const THEME_ALIASES = {
  glass: 'glassmorphism',
  dark: 'darkmode',
  min: 'minimalist',
  mod: 'modern',
  retro: 'retro',
  edit: 'editorial',
  '3d': 'immersive',
  neon: 'immersive'
};

async function fetchPageMetadata(targetUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return { title: new URL(targetUrl).hostname, description: 'Pratinjau web langsung di dalam WhatsApp.', image: null };
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    let title = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text().trim() || new URL(targetUrl).hostname;
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="twitter:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    let image = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('link[rel="image_src"]').attr('href') || null;
    if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
      try { image = new URL(image, targetUrl).href; } catch (_) {}
    }
    return { title: title.slice(0, 100).trim(), description: description.slice(0, 200).trim(), image };
  } catch (err) {
    return { title: new URL(targetUrl).hostname, description: 'Pratinjau web langsung di dalam WhatsApp.', image: null };
  }
}

function buildThemedCaption(meta, theme, targetUrl, hostname) {
  const t = THEMES[theme] || THEMES['default'];
  
  if (t.key === 'glassmorphism') {
    return `
${t.headerEmoji} *${t.label.toUpperCase()}* ${t.headerEmoji}
${t.separator}
✨ *${meta.title}*
${t.separator}
📝 ${meta.description || 'Tanpa deskripsi.'}
${t.separator}
🔗 Tautan: ${targetUrl}
`.trim();
  }
  
  if (t.key === 'editorial') {
    const descText = meta.description ? `"${meta.description}"` : 'Tidak ada ringkasan tersedia.';
    return `
${t.separator}
🗞️ E D I T O R I A L
${t.separator}

# ${meta.title.toUpperCase()}
oleh ${hostname}

${descText}

*Baca selengkapnya:* 
${targetUrl}
${t.separator}
`.trim();
  }

  if (t.key === 'minimalist') {
    return `
${meta.title}
${t.separator}
${meta.description || 'Tidak ada deskripsi.'}

> ${targetUrl}
`.trim();
  }

  if (t.key === 'modern') {
    return `
${t.separator}
${t.headerEmoji} *[ ${meta.title} ]*
${t.separator}

💡 *Info:* ${meta.description || '-'}

🚀 *Akses:* ${targetUrl}
${t.separator}
`.trim();
  }

  if (t.key === 'immersive') {
    return `
${t.separator}
🌌 ＶＩＲＴＵＡＬ ＳＰＡＣＥ 🌌
${t.separator}
> *ENTITAS:* ${meta.title}
> *DATA:* ${meta.description || 'Null'}

${t.headerEmoji} *PORTAL:* ${targetUrl}
${t.separator}
`.trim();
  }

  if (t.key === 'retro') {
    return `
${t.separator}
📻 *S I A R A N  R E T R O* 📻
${t.separator}

Ditemukan arsip:
*${meta.title}*

Pesan: 
_${meta.description || 'Pita kaset kosong.'}_

Frekuensi:
${targetUrl}
${t.separator}
`.trim();
  }

  if (t.key === 'darkmode') {
    return `
${t.separator}
${t.headerEmoji} TERMINAL GELAP
${t.separator}

$ title = "${meta.title}"
$ desc = "${meta.description || ''}"
$ host = "${hostname}"

> Execute: ${targetUrl}
${t.separator}
`.trim();
  }

  // Default theme
  return `
${t.headerEmoji} *WEBVIEW*
${t.separator}
📑 *Judul:* ${meta.title}
🌐 *Domain:* ${hostname}
${t.separator}
📝 *Deskripsi:* 
${meta.description || 'Tidak ada deskripsi.'}
${t.separator}
🔗 *Tautan:* ${targetUrl}
`.trim();
}

async function handleViewWebbCommand({ sock, chatJid, msg, args, reply }) {
  if (!args || args.length === 0) {
    return reply(usage(`${config.prefix}viewwebb <url> [tema]`, `Buka dan jelajahi halaman web langsung di WhatsApp.\n\nContoh:\n• \`${config.prefix}viewwebb https://github.com\`\n• \`${config.prefix}viewwebb google.com glassmorphism\`\n• \`${config.prefix}viewwebb tema\` — lihat daftar tema`));
  }

  const firstArg = args[0].toLowerCase();
  if (['tema', 'themes', 'style', 'gaya'].includes(firstArg)) {
    let catalog = '*🎨 KATALOG TEMA WEBVIEW 🎨*\n\n';
    for (const key in THEMES) {
      const t = THEMES[key];
      catalog += `${t.emoji} *${t.label}* (\`${t.key}\`)\n${t.description}\n\n`;
    }
    catalog += `Ketik \`${config.prefix}viewwebb <url> <nama_tema>\` untuk menggunakannya.`;
    return reply(box(catalog));
  }

  const targetUrlStr = args[0];
  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr.startsWith('http') ? targetUrlStr : `https://${targetUrlStr}`).href;
  } catch (err) {
    return reply(warning('URL tidak valid.'));
  }

  let themeKey = 'default';
  if (args.length > 1) {
    const requestedTheme = args[1].toLowerCase();
    if (THEMES[requestedTheme]) {
      themeKey = requestedTheme;
    } else if (THEME_ALIASES[requestedTheme] && THEMES[THEME_ALIASES[requestedTheme]]) {
      themeKey = THEME_ALIASES[requestedTheme];
    } else {
      let available = Object.keys(THEMES).join(', ');
      return reply(warning(`Tema tidak ditemukan. Tema tersedia: ${available}`));
    }
  }

  const t = THEMES[themeKey];
  const hostname = new URL(targetUrl).hostname;

  const meta = await fetchPageMetadata(targetUrl);
  const caption = buildThemedCaption(meta, themeKey, targetUrl, hostname);
  const thumbnail = meta.image || t.defaultThumbnail;

  await sock.sendMessage(chatJid, {
    text: caption,
    contextInfo: {
      externalAdReply: {
        title: meta.title,
        body: t.bodyText,
        thumbnailUrl: thumbnail,
        sourceUrl: targetUrl,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: msg });
}

module.exports = { handleViewWebbCommand };
