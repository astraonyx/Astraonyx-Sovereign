// server/routes/sirium.js — Sirium Digital Asset Marketplace (PRD F-SKT, F-STR, F-SLS, F-SCO, F-SMD, F-SRW, D-45, D-46)
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { authenticateToken } = require('../auth');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database/polaris.sqlite');
const db = new Database(dbPath);

// ==================== SCHEMA INITIALIZATION ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS sirium_stores (
    id TEXT PRIMARY KEY,
    owner_username TEXT NOT NULL,
    store_name TEXT NOT NULL,
    tagline TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    badge TEXT DEFAULT 'Verified Creator',
    rating REAL DEFAULT 4.9,
    total_sales INTEGER DEFAULT 0,
    whatsapp_number TEXT,
    telegram_handle TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sirium_listings (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price_idr INTEGER NOT NULL,
    price_coins INTEGER DEFAULT 0,
    description TEXT,
    features_json TEXT DEFAULT '[]',
    tech_stack TEXT,
    file_type TEXT,
    file_size TEXT,
    live_demo_url TEXT,
    preview_image TEXT,
    downloads_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    is_verified INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sirium_contacts (
    id TEXT PRIMARY KEY,
    buyer_username TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'whatsapp', 'telegram', 'direct'
    message TEXT,
    timestamp TEXT NOT NULL
  );
`);

// ==================== SEED VERIFIED STORES & LISTINGS ====================
function seedSiriumData() {
  const storeCount = db.prepare('SELECT count(*) as cnt FROM sirium_stores').get().cnt;
  if (storeCount === 0) {
    const stores = [
      {
        id: 'store-ataraxia',
        owner_username: 'Cosmos',
        store_name: 'Ataraxia Studio Official',
        tagline: 'Laboratorium Arsitektur Web & Bot Eksklusif',
        bio: 'Pengembang resmi ekosistem Astraonyx Ataraxia. Menyediakan source code berkualitas enterprise, bot WhatsApp Baileys custom, dan template dashboard modern.',
        avatar_url: '/assets/icons/polarium-star.png',
        banner_url: '',
        badge: 'Official Ecosystem',
        rating: 5.0,
        total_sales: 342,
        whatsapp_number: '6281234567890',
        telegram_handle: 'astraonyx_official',
        created_at: new Date().toISOString()
      },
      {
        id: 'store-cybercraft',
        owner_username: 'CyberCraftsman',
        store_name: 'Nexus UI Works',
        tagline: 'UI/UX Design Systems & Tailwind Primitives',
        bio: 'Spesialis antarmuka obsidian dark-mode, micro-animations spring physics, dan komponen React berkemampuan aksesibilitas tinggi.',
        avatar_url: '/assets/icons/atomic.png',
        banner_url: '',
        badge: 'Verified Elite',
        rating: 4.9,
        total_sales: 189,
        whatsapp_number: '6289876543210',
        telegram_handle: 'nexus_craft',
        created_at: new Date().toISOString()
      },
      {
        id: 'store-botlab',
        owner_username: 'ZeroByte',
        store_name: 'BotForge Robotics',
        tagline: 'Modul Multi-Session WhatsApp & Telegram Bots',
        bio: 'Automasi bisnis cerdas, integrasi AI Hermes, dan bot manajemen komunitas berkecepatan tinggi.',
        avatar_url: '/assets/icons/polaris.png',
        banner_url: '',
        badge: 'Bot Master',
        rating: 4.8,
        total_sales: 124,
        whatsapp_number: '6281299887766',
        telegram_handle: 'botforge_dev',
        created_at: new Date().toISOString()
      }
    ];

    const insertStore = db.prepare('INSERT INTO sirium_stores (id, owner_username, store_name, tagline, bio, avatar_url, banner_url, badge, rating, total_sales, whatsapp_number, telegram_handle, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const s of stores) {
      insertStore.run(s.id, s.owner_username, s.store_name, s.tagline, s.bio, s.avatar_url, s.banner_url, s.badge, s.rating, s.total_sales, s.whatsapp_number, s.telegram_handle, s.created_at);
    }

    const listings = [
      {
        id: 'item-1',
        store_id: 'store-ataraxia',
        title: 'Polaris Full Dashboard Enterprise Suite',
        category: 'Web Templates',
        price_idr: 350000,
        price_coins: 700,
        description: 'Template dashboard dark-mode ultra-lengkap dengan 8 pilar galaksi, integrasi bot Baileys WhatsApp, visualisasi chart realtime, dan sound effects haptic.',
        features_json: JSON.stringify(['Clean Modular Architecture', 'Three.js Cosmic Background', 'Live Socket Telemetry', 'Zero CLS & 60 FPS Animations']),
        tech_stack: 'HTML5, CSS3, Vanilla JS, Express, SQLite',
        file_type: 'ZIP Bundle',
        file_size: '48.2 MB',
        live_demo_url: 'http://localhost:3000',
        preview_image: '/assets/icons/polaris.png',
        downloads_count: 89,
        rating: 5.0,
        is_verified: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'item-2',
        store_id: 'store-ataraxia',
        title: 'Luminary Assessment & Quizizz Clone Engine',
        category: 'Full-Stack Apps',
        price_idr: 450000,
        price_coins: 900,
        description: 'Sistem pembelajaran gamifikasi kuis interaktif dengan 15+ mode soal (Drag and drop, hotspot, labeling, math formula, live lobby multiplayer).',
        features_json: JSON.stringify(['15+ Interactive Question Modes', 'Realtime Multiplayer Lobby', 'Sound Effects & Confetti FX', 'Export to PDF & Excel']),
        tech_stack: 'React, TypeScript, Tailwind CSS, Express',
        file_type: 'Source Code ZIP',
        file_size: '62.4 MB',
        live_demo_url: 'http://localhost:3000/#study',
        preview_image: '/assets/icons/luminary.png',
        downloads_count: 73,
        rating: 4.9,
        is_verified: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'item-3',
        store_id: 'store-botlab',
        title: 'Multi-Device Baileys WhatsApp Bot Master Pack',
        category: 'Bot Modules',
        price_idr: 250000,
        price_coins: 500,
        description: 'Engine bot WhatsApp tangguh anti-ban dengan auto-responder visual, filter grup anti-link, download media multi-platform, dan integrasi AI.',
        features_json: JSON.stringify(['Multi-session Pairing Code', 'Auto Read & Reaction', 'Custom Plugin Loader', 'SQLite Memory Vault']),
        tech_stack: 'Node.js, @whiskeysockets/baileys, Sharp, FFmpeg',
        file_type: 'Node.js Package',
        file_size: '22.8 MB',
        live_demo_url: '',
        preview_image: '/assets/icons/messages.png',
        downloads_count: 145,
        rating: 4.8,
        is_verified: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'item-4',
        store_id: 'store-cybercraft',
        title: 'Obsidian UI — High-End Glassmorphism Component Kit',
        category: 'UI Component Kits',
        price_idr: 180000,
        price_coins: 360,
        description: 'Koleksi 40+ komponen web obsidian gelap dengan efek multi-layered colored aura underglows, spring easing, dan token warna 3 lapis.',
        features_json: JSON.stringify(['40+ Accessible Components', 'Tailwind CSS v3/v4 Ready', 'Lucide Icons Integration', 'Figma File Included']),
        tech_stack: 'Tailwind CSS, React / HTML',
        file_type: 'Figma + Code ZIP',
        file_size: '35.1 MB',
        live_demo_url: '',
        preview_image: '/assets/icons/cubes.png',
        downloads_count: 62,
        rating: 5.0,
        is_verified: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'item-5',
        store_id: 'store-ataraxia',
        title: 'Starlium Arcade Multiplayer Game Engine',
        category: 'Games & 3D',
        price_idr: 320000,
        price_coins: 640,
        description: 'Paket source code game server-authoritative catur, tic-tac-toe, dan duel turnamen real-time menggunakan WebSocket murni.',
        features_json: JSON.stringify(['Server State Validation', 'Turn-based Timer & Matchmaking', 'Spectator Mode', 'Leaderboard Integration']),
        tech_stack: 'Node.js, WebSocket, Canvas API',
        file_type: 'Full Repository',
        file_size: '29.0 MB',
        live_demo_url: 'http://localhost:3000/#games',
        preview_image: '/assets/icons/starlium.png',
        downloads_count: 51,
        rating: 4.9,
        is_verified: 1,
        created_at: new Date().toISOString()
      },
      {
        id: 'item-6',
        store_id: 'store-cybercraft',
        title: 'Cyberpunk & Retro Sci-Fi Audio Synthesizer Pack',
        category: 'Audio & SFX',
        price_idr: 120000,
        price_coins: 240,
        description: '100+ sampel audio haptic web, tombol klik taktil, laser whoosh, dan ambient pad synthesizers untuk meningkatkan interaksi UI.',
        features_json: JSON.stringify(['120 High Quality SFX (WAV/MP3)', 'Web Audio API Synthesizer Script', 'Royalty-free License', 'Zero Latency Buffer']),
        tech_stack: 'Web Audio API, WAV/MP3 320kbps',
        file_type: 'Audio ZIP',
        file_size: '84.5 MB',
        live_demo_url: '',
        preview_image: '/assets/icons/activity.png',
        downloads_count: 98,
        rating: 4.9,
        is_verified: 1,
        created_at: new Date().toISOString()
      }
    ];

    const insertListing = db.prepare('INSERT INTO sirium_listings (id, store_id, title, category, price_idr, price_coins, description, features_json, tech_stack, file_type, file_size, live_demo_url, preview_image, downloads_count, rating, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const l of listings) {
      insertListing.run(l.id, l.store_id, l.title, l.category, l.price_idr, l.price_coins, l.description, l.features_json, l.tech_stack, l.file_type, l.file_size, l.live_demo_url, l.preview_image, l.downloads_count, l.rating, l.is_verified, l.created_at);
    }
  }
}

// Seed upon load
try {
  seedSiriumData();
} catch (e) {
  console.error('[sirium] Gagal seed awal:', e.message);
}

// ==================== 1. KATALOG & LISTING (F-SKT, F-SLS) ====================

router.get(['/catalog', '/listings'], (req, res) => {
  try {
    const { category, search, sort } = req.query;
    let sql = `
      SELECT l.*, s.store_name, s.owner_username, s.badge as store_badge, s.whatsapp_number, s.telegram_handle, s.avatar_url as store_avatar
      FROM sirium_listings l
      JOIN sirium_stores s ON l.store_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ` AND l.category = ?`;
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.tech_stack LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY l.price_idr ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY l.price_idr DESC`;
    } else if (sort === 'popular') {
      sql += ` ORDER BY l.downloads_count DESC`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    const listings = db.prepare(sql).all(...params);

    const categories = [
      { id: 'all', name: 'Semua Kategori', icon: '🌐' },
      { id: 'Web Templates', name: 'Web Templates', icon: '💻' },
      { id: 'Full-Stack Apps', name: 'Full-Stack Apps', icon: '⚡' },
      { id: 'Bot Modules', name: 'Bot Modules', icon: '🤖' },
      { id: 'UI Component Kits', name: 'UI Components', icon: '🎨' },
      { id: 'Games & 3D', name: 'Games & 3D', icon: '🎮' },
      { id: 'Audio & SFX', name: 'Audio & SFX', icon: '🎵' },
    ];

    res.json({ success: true, count: listings.length, listings, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/listings/:id', (req, res) => {
  try {
    const listing = db.prepare(`
      SELECT l.*, s.store_name, s.owner_username, s.tagline as store_tagline, s.bio as store_bio, s.badge as store_badge, s.whatsapp_number, s.telegram_handle, s.avatar_url as store_avatar, s.rating as store_rating
      FROM sirium_listings l
      JOIN sirium_stores s ON l.store_id = s.id
      WHERE l.id = ?
    `).get(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Aset digital tidak ditemukan.' });
    }

    res.json({ success: true, listing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 2. PROFIL TOKO & PENJUAL (F-STR) ====================

router.get('/stores', (req, res) => {
  try {
    const stores = db.prepare('SELECT * FROM sirium_stores ORDER BY total_sales DESC').all();
    res.json({ success: true, count: stores.length, stores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stores/:id', (req, res) => {
  try {
    const store = db.prepare('SELECT * FROM sirium_stores WHERE id = ? OR owner_username = ?').get(req.params.id, req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, error: 'Toko tidak ditemukan.' });
    }
    const listings = db.prepare('SELECT * FROM sirium_listings WHERE store_id = ? ORDER BY created_at DESC').all(store.id);
    res.json({ success: true, store, listings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 3. HUBUNGI PENJUAL (F-SCO, D-46) ====================
// "Pembelian di Sirium dilakukan dengan menghubungi toko atau penjual, bukan dengan pembayaran di dalam platform"

router.post('/contact', (req, res) => {
  try {
    const { buyer_username, listing_id, channel, custom_note } = req.body;
    const listing = db.prepare(`
      SELECT l.*, s.store_name, s.owner_username, s.whatsapp_number, s.telegram_handle
      FROM sirium_listings l
      JOIN sirium_stores s ON l.store_id = s.id
      WHERE l.id = ?
    `).get(listing_id);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing tidak valid.' });
    }

    const id = 'cnt-' + Date.now();
    const now = new Date().toISOString();
    const buyer = buyer_username || 'Pelanggan Astraonyx';

    db.prepare(`
      INSERT INTO sirium_contacts (id, buyer_username, listing_id, store_id, channel, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, buyer, listing.id, listing.store_id, channel || 'whatsapp', custom_note || '', now);

    // Format pre-filled messages for external chat
    const priceFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(listing.price_idr);
    const greetingText = `Halo kak ${listing.store_name}, saya @${buyer} tertarik untuk membeli aset digital "${listing.title}" seharga ${priceFormatted}. Mohon informasi pembayaran dan pengiriman file. Terima kasih!`;
    const encodedGreeting = encodeURIComponent(greetingText);

    let redirectUrl = '';
    if (channel === 'telegram' && listing.telegram_handle) {
      const cleanHandle = listing.telegram_handle.replace('@', '');
      redirectUrl = `https://t.me/${cleanHandle}?text=${encodedGreeting}`;
    } else if (listing.whatsapp_number) {
      let phone = listing.whatsapp_number.replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      redirectUrl = `https://wa.me/${phone}?text=${encodedGreeting}`;
    }

    res.json({
      success: true,
      message: 'Permintaan kontak dicatat. Menghubungkan ke toko penjual...',
      redirectUrl,
      greetingText,
      sellerContact: {
        storeName: listing.store_name,
        whatsapp: listing.whatsapp_number,
        telegram: listing.telegram_handle,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== 4. JUAL ASET / BUAT LISTING (F-SLS) ====================

router.post('/listings', (req, res) => {
  try {
    const { title, category, price_idr, price_coins, description, tech_stack, file_type, file_size, live_demo_url, preview_image } = req.body;
    if (!title || !price_idr) {
      return res.status(400).json({ success: false, error: 'Judul dan harga wajib diisi.' });
    }

    const id = 'item-' + Date.now();
    const now = new Date().toISOString();
    const storeId = 'store-ataraxia'; // Default store link for user's store

    db.prepare(`
      INSERT INTO sirium_listings (id, store_id, title, category, price_idr, price_coins, description, features_json, tech_stack, file_type, file_size, live_demo_url, preview_image, downloads_count, rating, is_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, '["File Terverifikasi", "Dukungan Instalasi"]', ?, ?, ?, ?, ?, 0, 5.0, 1, ?)
    `).run(
      id,
      storeId,
      title.trim(),
      category || 'Web Templates',
      parseInt(price_idr) || 100000,
      parseInt(price_coins) || 200,
      description || 'Aset digital berkualitas tinggi untuk ekosistem Astraonyx.',
      tech_stack || 'Web Tech',
      file_type || 'ZIP File',
      file_size || '10 MB',
      live_demo_url || '',
      preview_image || '/assets/icons/sirium.png',
      now
    );

    res.json({ success: true, id, message: 'Aset digital berhasil diterbitkan di Sirium Market!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
