// server/spotifyService.js — Spotify & Instagram Music Sound Scanner / Scraper
const { scrapeSpotify, isSpotifyUrl } = require('../lib/spotifyScraper');

const DEFAULT_POPULAR_SOUNDS = [
  {
    id: 'snd_1',
    title: 'Midnight City (Cyberpunk Synth)',
    artist: 'Polaris Sound Lab',
    album: 'Ataraxia Vol. 1',
    albumArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    previewUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
    duration: 30,
    spotifyUrl: 'https://open.spotify.com/track/polaris1'
  },
  {
    id: 'snd_2',
    title: 'Cosmic Drift (Chill Lo-Fi)',
    artist: 'Luminary Study Space',
    album: 'Focus Horizons',
    albumArt: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
    previewUrl: 'https://assets.mixkit.co/music/preview/mixkit-chill-bro-494.mp3',
    duration: 30,
    spotifyUrl: 'https://open.spotify.com/track/polaris2'
  },
  {
    id: 'snd_3',
    title: 'Golden Hour Sunset',
    artist: 'Ataraxia Echoes',
    album: 'Instagram Golden Tape',
    albumArt: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&q=80',
    previewUrl: 'https://assets.mixkit.co/music/preview/mixkit-hazy-after-hours-132.mp3',
    duration: 30,
    spotifyUrl: 'https://open.spotify.com/track/polaris3'
  },
  {
    id: 'snd_4',
    title: 'Phonk Overdrive',
    artist: 'Drift Samurai',
    album: 'Night Tokyo',
    albumArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80',
    previewUrl: 'https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3',
    duration: 30,
    spotifyUrl: 'https://open.spotify.com/track/polaris4'
  },
  {
    id: 'snd_5',
    title: 'Aesthetic Piano & Rain',
    artist: 'Raindrop Melody',
    album: 'Peaceful Mind',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
    previewUrl: 'https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3',
    duration: 30,
    spotifyUrl: 'https://open.spotify.com/track/polaris5'
  }
];

async function searchMusic(query) {
  const cleanQ = String(query || '').trim();
  if (!cleanQ) {
    return DEFAULT_POPULAR_SOUNDS;
  }

  // 1. Jika pengguna paste URL Spotify langsung
  if (isSpotifyUrl(cleanQ)) {
    try {
      const scraped = await scrapeSpotify(cleanQ, 15000);
      if (scraped.success && scraped.data) {
        const d = scraped.data;
        return [{
          id: 'sp_' + Date.now(),
          title: d.title || d.songTitle || 'Spotify Track',
          artist: d.artist || d.artistName || 'Unknown Artist',
          album: d.album || 'Spotify Music',
          albumArt: d.cover || d.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&q=80',
          previewUrl: d.downloadUrl || d.url || '',
          duration: d.duration || 30,
          spotifyUrl: cleanQ,
        }];
      }
    } catch (err) {
      console.warn('[spotifyService] Scrape Spotify link error:', err.message);
    }
  }

  // 2. Query Music API Publik iTunes / Apple Music (Audio Preview 30 detik gratis tanpa rate-limit)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=15`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(itunesUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item) => ({
          id: String(item.trackId || Math.random().toString(36).slice(2)),
          title: item.trackName || 'Judul Lagu',
          artist: item.artistName || 'Artis',
          album: item.collectionName || 'Album',
          albumArt: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : '',
          previewUrl: item.previewUrl || '',
          duration: Math.round((item.trackTimeMillis || 30000) / 1000),
          spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent((item.trackName || '') + ' ' + (item.artistName || ''))}`,
        }));
      }
    }
  } catch (err) {
    console.warn('[spotifyService] iTunes search error, fallback:', err.message);
  }

  // 3. Fallback jika offline / query tidak ditemukan di API eksternal
  const filtered = DEFAULT_POPULAR_SOUNDS.filter((s) =>
    s.title.toLowerCase().includes(cleanQ.toLowerCase()) ||
    s.artist.toLowerCase().includes(cleanQ.toLowerCase())
  );

  return filtered.length > 0 ? filtered : DEFAULT_POPULAR_SOUNDS;
}

module.exports = {
  searchMusic,
  DEFAULT_POPULAR_SOUNDS,
};
