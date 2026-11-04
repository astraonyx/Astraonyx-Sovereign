// server/spotifyStreamService.js — Astraonyx Spotify Cloud Streamer & Lyrics Engine
// Pure streaming audio architecture without local disk download, synced + translated lyrics,
// full playlist/album tracklist parsing via Spotify embed & multi-engine fallback.

const cheerio = require('cheerio');
const axios = require('axios');
const path = require('path');
const yts = require('yt-search');
const { scrapeYouTube } = require('../lib/youtubeScraper');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Cache for lyrics, translations, and Mori streams
const lyricsCache = new Map();
const translationCache = new Map();
const moriStreamCache = new Map();

/**
 * Format milliseconds to MM:SS
 */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0:30';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

/**
 * Extract Spotify entity type and ID from any Spotify URL
 */
function parseSpotifyUrl(input) {
  const clean = String(input || '').trim();
  // Support standard open.spotify.com URLs
  const match = clean.match(/spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]{15,30})/i);
  if (match) {
    return { type: match[1].toLowerCase(), id: match[2], rawUrl: clean };
  }
  // Support uri: spotify:track:id or spotify:playlist:id
  const uriMatch = clean.match(/spotify:(playlist|album|track):([a-zA-Z0-9]{15,30})/i);
  if (uriMatch) {
    return { type: uriMatch[1].toLowerCase(), id: uriMatch[2], rawUrl: `https://open.spotify.com/${uriMatch[1]}/${uriMatch[2]}` };
  }
  return null;
}

/**
 * Resolve Spotify shortened URLs or redirects (e.g. spotify.link)
 */
async function resolveSpotifyLink(url) {
  try {
    if (/spotify\.link/i.test(url)) {
      const res = await axios.get(url, {
        headers: { 'User-Agent': CHROME_UA },
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: () => true
      });
      if (res.request?.res?.responseUrl) {
        return res.request.res.responseUrl;
      }
    }
  } catch (err) {
    console.warn('[spotifyStreamService] Resolve link warning:', err.message);
  }
  return url;
}

/**
 * Fetch and parse Spotify Playlist, Album, or Track via Embed NextData Engine
 */
async function getSpotifyEntityData(inputUrl) {
  const resolvedUrl = await resolveSpotifyLink(inputUrl);
  const parsed = parseSpotifyUrl(resolvedUrl);

  if (!parsed) {
    throw new Error('URL Spotify tidak valid. Harap masukkan tautan Playlist, Album, atau Track Spotify (contoh: https://open.spotify.com/playlist/...)');
  }

  const { type, id } = parsed;
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

  const res = await axios.get(embedUrl, {
    headers: {
      'User-Agent': CHROME_UA,
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 15000
  });

  const $ = cheerio.load(res.data);
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (!nextDataScript) {
    throw new Error('Gagal mengekstrak data dari Spotify Embed. Periksa apakah playlist bersifat publik.');
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataScript);
  } catch (err) {
    throw new Error('Gagal memparsing payload Spotify metadata.');
  }

  const entity = nextData.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error('Informasi playlist atau album Spotify tidak ditemukan.');
  }

  // Extract cover art
  let coverArt = '';
  if (entity.coverArt?.sources && entity.coverArt.sources.length > 0) {
    coverArt = entity.coverArt.sources[0].url;
  } else if (entity.visualIdentity?.image && entity.visualIdentity.image.length > 0) {
    coverArt = entity.visualIdentity.image[entity.visualIdentity.image.length - 1].url;
  }

  const playlistTitle = entity.name || entity.title || 'Spotify Playlist';
  const creator = entity.subtitle || (Array.isArray(entity.authors) ? entity.authors.map(a => a.name).join(', ') : 'Spotify');
  const rawTrackList = entity.trackList || [];

  // If single track
  let trackItems = [];
  if (rawTrackList.length > 0) {
    trackItems = rawTrackList.map((t, idx) => {
      const trackId = t.uri ? t.uri.replace('spotify:track:', '') : (t.id || `track_${idx}`);
      const audioUrl = t.audioPreview?.url || '';
      return {
        index: idx + 1,
        id: trackId,
        uri: t.uri || `spotify:track:${trackId}`,
        title: t.title || 'Unknown Track',
        artist: t.subtitle || creator || 'Unknown Artist',
        album: playlistTitle,
        durationMs: t.duration || 30000,
        durationFormatted: formatDuration(t.duration),
        coverArt: coverArt, // inherited or track cover
        streamUrl: audioUrl,
        hasAudioPreview: Boolean(audioUrl),
        spotifyUrl: `https://open.spotify.com/track/${trackId}`
      };
    });
  } else if (type === 'track') {
    // Single track format
    const trackId = entity.id || id;
    const audioUrl = entity.audioPreview?.url || '';
    trackItems = [{
      index: 1,
      id: trackId,
      uri: entity.uri || `spotify:track:${trackId}`,
      title: entity.title || entity.name || 'Unknown Track',
      artist: entity.subtitle || creator || 'Unknown Artist',
      album: playlistTitle,
      durationMs: entity.duration || 30000,
      durationFormatted: formatDuration(entity.duration),
      coverArt: coverArt,
      streamUrl: audioUrl,
      hasAudioPreview: Boolean(audioUrl),
      spotifyUrl: `https://open.spotify.com/track/${trackId}`
    }];
  }

  return {
    type,
    id,
    title: playlistTitle,
    creator,
    coverArt: coverArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80',
    totalTracks: trackItems.length,
    tracks: trackItems,
    sourceUrl: `https://open.spotify.com/${type}/${id}`
  };
}

/**
 * Fetch lyrics from LRCLIB with synced timestamps & plain fallback with auto-sync pacing
 */
async function getLyrics(title, artist, durationSec = 180) {
  const cleanTitle = String(title || '').replace(/\(feat\..*?\)/i, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = String(artist || '').split(',')[0].trim();
  const cacheKey = `${cleanTitle.toLowerCase()}___${cleanArtist.toLowerCase()}`;

  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    const res = await axios.get('https://lrclib.net/api/search', {
      params: {
        track_name: cleanTitle,
        artist_name: cleanArtist
      },
      headers: {
        'User-Agent': CHROME_UA
      },
      timeout: 8000
    });

    const items = res.data;
    if (Array.isArray(items) && items.length > 0) {
      // Pick best match with synced lyrics if possible
      const itemWithSynced = items.find(i => Boolean(i.syncedLyrics)) || items[0];
      const rawSynced = itemWithSynced.syncedLyrics || '';
      const rawPlain = itemWithSynced.plainLyrics || '';

      let parsedLines = [];
      if (rawSynced) {
        const lines = rawSynced.split('\n');
        for (const line of lines) {
          const match = line.match(/^\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)$/);
          if (match) {
            const min = parseInt(match[1], 10);
            const sec = parseFloat(match[2]);
            const timeInSeconds = min * 60 + sec;
            const text = match[3].trim();
            parsedLines.push({
              time: Math.round(timeInSeconds * 10) / 10,
              timeFormatted: `${String(min).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}`,
              text: text
            });
          }
        }
      }

      // If synced lyrics is absent but plain text exists, synthesize paced timestamps
      // across the song duration so auto-scroll and line highlighting work for EVERY song!
      if (parsedLines.length === 0 && rawPlain && rawPlain.trim().length > 0) {
        const plainLines = rawPlain
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        if (plainLines.length > 0) {
          const totalDur = Number(durationSec) > 20 ? Number(durationSec) : (itemWithSynced.duration || 180);
          const introSec = Math.min(8, totalDur * 0.05);
          const outroSec = Math.max(introSec + 10, totalDur * 0.90);
          const step = plainLines.length > 1 ? (outroSec - introSec) / plainLines.length : 8;

          parsedLines = plainLines.map((lineText, idx) => {
            const t = Math.round((introSec + idx * step) * 10) / 10;
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            return {
              time: t,
              timeFormatted: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
              text: lineText
            };
          });
        }
      }

      const result = {
        hasLyrics: Boolean(parsedLines.length > 0 || rawPlain),
        isSynced: parsedLines.length > 0,
        syncedLyrics: parsedLines,
        plainLyrics: rawPlain,
        source: rawSynced ? 'LRCLIB (Official Synced)' : 'LRCLIB (Mori Auto-Paced)',
        trackName: itemWithSynced.trackName,
        artistName: itemWithSynced.artistName
      };

      lyricsCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('[spotifyStreamService] Lyrics fetch warning:', err.message);
  }

  // Fallback: If not found, return empty lyrics per exact specification
  const emptyResult = {
    hasLyrics: false,
    isSynced: false,
    syncedLyrics: [],
    plainLyrics: '',
    source: null,
    message: 'Lirik tidak tersedia untuk lagu ini.'
  };
  lyricsCache.set(cacheKey, emptyResult);
  return emptyResult;
}

/**
 * Translate lyrics to Indonesian (or target language) using Google Translate API
 */
async function translateLyrics(textOrLines, targetLang = 'id') {
  if (!textOrLines) return { translatedText: '', translatedLines: [] };

  const isArray = Array.isArray(textOrLines);
  const cacheKey = `${targetLang}___${isArray ? textOrLines.map(l => l.text || l).join('\n') : textOrLines}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    let textToTranslate = '';
    if (isArray) {
      textToTranslate = textOrLines.map(l => (typeof l === 'object' ? l.text : l) || ' ').join('\n');
    } else {
      textToTranslate = String(textOrLines);
    }

    if (!textToTranslate.trim()) {
      return { translatedText: '', translatedLines: [] };
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': CHROME_UA },
      timeout: 10000
    });

    let translatedCombined = '';
    if (Array.isArray(res.data?.[0])) {
      translatedCombined = res.data[0].map(chunk => chunk[0]).join('');
    }

    const translatedSplit = translatedCombined.split('\n');

    let translatedLines = [];
    if (isArray) {
      translatedLines = textOrLines.map((original, i) => {
        const trText = (translatedSplit[i] || '').trim();
        if (typeof original === 'object') {
          return {
            ...original,
            translatedText: trText || original.text
          };
        }
        return trText || original;
      });
    }

    const output = {
      translatedText: translatedCombined,
      translatedLines: translatedLines
    };

    translationCache.set(cacheKey, output);
    return output;
  } catch (err) {
    console.warn('[spotifyStreamService] Translate lyrics error:', err.message);
    return {
      translatedText: typeof textOrLines === 'string' ? textOrLines : '',
      translatedLines: isArray ? textOrLines : []
    };
  }
}

/**
 * Mori Audio Stream Resolver:
 * Uses yt-search + Mori's native youtubeScraper (from coflyn/Mori)
 * to resolve full-length 320k/128k MP3 streaming audio with zero disk storage.
 */
async function resolveMoriStream(title, artist) {
  const cleanTitle = String(title || '').replace(/\(feat\..*?\)/i, '').replace(/\[.*?\]/g, '').trim();
  const cleanArtist = String(artist || '').split(',')[0].trim();
  const query = `${cleanTitle} ${cleanArtist}`.trim();
  const cacheKey = query.toLowerCase();

  // Check in-memory cache (valid for 2 hours)
  if (moriStreamCache.has(cacheKey)) {
    const cached = moriStreamCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000) {
      return cached;
    }
  }

  // 1. Search YouTube
  const searchRes = await yts(query);
  const video = searchRes?.videos?.[0];
  if (!video || !video.url) {
    throw new Error(`Lagu "${query}" tidak ditemukan di YouTube.`);
  }

  // 2. Scrape stream via Mori YouTube Scraper engine
  const scrapeRes = await scrapeYouTube(video.url, 25000);
  if (!scrapeRes || !scrapeRes.success || !Array.isArray(scrapeRes.downloads) || scrapeRes.downloads.length === 0) {
    throw new Error(scrapeRes?.error || 'Gagal mengekstrak stream audio dari Mori Scraper.');
  }

  const mp3Item = scrapeRes.downloads.find(d => /mp3/i.test(d.type)) || scrapeRes.downloads[0];
  if (!mp3Item || !mp3Item.url) {
    throw new Error('Link audio MP3 tidak ditemukan dari Mori Scraper.');
  }

  const directUrl = mp3Item.url;
  const proxyUrl = `/api/spotify/stream-proxy?url=${encodeURIComponent(directUrl)}`;
  const durationMs = (video.seconds || 180) * 1000;

  const result = {
    directUrl,
    streamUrl: proxyUrl,
    title: video.title || title,
    artist: video.author?.name || artist,
    durationMs,
    durationFormatted: formatDuration(durationMs),
    thumbnail: video.thumbnail || scrapeRes.thumbnail,
    source: 'Mori Audio Streamer',
    timestamp: Date.now()
  };

  moriStreamCache.set(cacheKey, result);
  return result;
}

// Backward-compatibility alias
const resolveAudioStreamUrl = resolveMoriStream;

module.exports = {
  parseSpotifyUrl,
  getSpotifyEntityData,
  getLyrics,
  translateLyrics,
  resolveMoriStream,
  resolveAudioStreamUrl,
  formatDuration
};
