// astraonyx/omniget/engine.js — Unified Media Downloader Service (Mori v4.3.3 & OmniGet Universal Studio)
const btch = require('btch-downloader');
const path = require('path');
const fs = require('fs');

// Scrapers & Toolboxes
const tiktokScraper = require('../../lib/tiktokScraper');
const igFbScraper = require('../../lib/instagramFacebookScraper');
const youtubeScraper = require('../../lib/youtubeScraper');
const twitterScraper = require('../../lib/twitterScraper');
const spotifyScraper = require('../../lib/spotifyScraper');
const pinterestScraper = require('../../lib/pinterestScraper');
const teraboxScraper = require('../../lib/teraboxScraper');
const gdriveScraper = require('../../lib/gdriveScraper');
const mediafireScraper = require('../../lib/mediafireScraper');
let scrapr = null;
try {
  scrapr = require('../../lib/scrapr');
} catch (_) {}

const MORI_VERSION = '5.0.0-unified';
const MORI_SCRAPER_CORE = 'v3';

const SERVERS_REGISTRY = {
  tiktok: [
    { id: 'server1', name: 'Server 1 (TikWM Ultra HD)', sub: 'TikWM Native 1080p Direct' },
    { id: 'server2', name: 'Server 2 (SnapTik Fast)', sub: 'SnapTik Clean No-WM & Slides' },
    { id: 'server3', name: 'Server 3 (TikTokIO Mirror)', sub: 'TikTokIO Multi-Resolution' },
  ],
  instagram: [
    { id: 'server1', name: 'Server 1 (SnapSave)', sub: 'SnapSave High Quality Reels & Posts' },
    { id: 'server2', name: 'Server 2 (Instagram Native)', sub: 'Direct Instagram Embed Engine' },
    { id: 'server3', name: 'Server 3 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  youtube: [
    { id: 'server1', name: 'Server 1 (YTMP3.mobi)', sub: 'Fast 1080p/720p MP4 & MP3' },
    { id: 'server2', name: 'Server 2 (YTMP3.gg)', sub: 'High Quality Job Converter' },
    { id: 'server3', name: 'Server 3 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  twitter: [
    { id: 'server1', name: 'Server 1 (FxTwitter)', sub: 'FxTwitter Full HD Direct CDN' },
    { id: 'server2', name: 'Server 2 (TVD Engine)', sub: 'TwitterVideoDownloader Multi-Bitrate' },
    { id: 'server3', name: 'Server 3 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  spotify: [
    { id: 'server1', name: 'Server 1 (SpotiDown)', sub: '320kbps High Quality Audio' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  facebook: [
    { id: 'server1', name: 'Server 1 (SnapSave FB)', sub: 'SnapSave 1080p HD & SD' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  pinterest: [
    { id: 'server1', name: 'Server 1 (Native CDN)', sub: 'Original Full-Res Image & Video' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  douyin: [
    { id: 'server1', name: 'Server 1 (Douyin TikWM HD)', sub: 'Direct 1080p & Slides Album' },
    { id: 'server2', name: 'Server 2 (Mori Douyin Core)', sub: 'IES Douyin Redirect Resolver' },
  ],
  rednote: [
    { id: 'server1', name: 'Server 1 (RedNote XHS Engine)', sub: 'Original Lossless Photo & Video' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  bilibili: [
    { id: 'server1', name: 'Server 1 (Bilibili HD)', sub: '1080p Direct Multi-Part Video' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  applemusic: [
    { id: 'server1', name: 'Server 1 (Apple Music Studio)', sub: 'High Fidelity Lossless Preview' },
    { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'BTCH Cloud Backup' },
  ],
  omniget: [
    { id: 'server1', name: 'Server 1 (OmniGet Deep Core)', sub: 'Course & Media Studio Extractor' },
    { id: 'server2', name: 'Server 2 (BitTorrent Swarm)', sub: 'Magnet URI Inspector' },
  ],
};

function getServersRegistry() {
  return SERVERS_REGISTRY;
}

/**
 * Detects the platform name from URL
 */
function detectPlatform(url) {
  if (!url || typeof url !== 'string') return 'unknown';
  const u = url.toLowerCase();
  if (u.startsWith('magnet:?')) return 'magnet';
  if (u.includes('tiktok.com') || u.includes('vt.tiktok.com') || u.includes('vm.tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com') || u.includes('instagr.am') || u.includes('ddinstagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('music.youtube.com')) return 'youtube';
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com')) return 'facebook';
  if (u.includes('twitter.com') || /(?:^|\/\/|[.\/])x\.com(?:\/|$)/.test(u) || u.includes('fxtwitter.com') || u.includes('vxtwitter.com') || u.includes('t.co/')) return 'twitter';
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('pinterest.com') || u.includes('pin.it') || u.includes('pinimg.com')) return 'pinterest';
  if (u.includes('threads.net') || u.includes('threads.com')) return 'threads';
  if (u.includes('xiaohongshu.com') || u.includes('xhslink.com') || u.includes('xhslink.cn') || u.includes('rednote.com')) return 'rednote';
  if (u.includes('douyin.com') || u.includes('v.douyin.com')) return 'douyin';
  if (u.includes('bilibili.com') || u.includes('b23.tv') || u.includes('bili.im') || u.includes('bilibili.tv')) return 'bilibili';
  if (u.includes('twitch.tv')) return 'twitch';
  if (u.includes('reddit.com') || u.includes('redd.it')) return 'reddit';
  if (u.includes('udemy.com') || u.includes('hotmart.com') || u.includes('kiwify.com') || u.includes('coursera.org') || u.includes('skillshare.com')) return 'course';
  if (u.includes('pixiv.net')) return 'pixiv';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('snackvideo.com') || u.includes('sck.io')) return 'snackvideo';
  if (u.includes('kuaishou.com') || u.includes('kwai.com')) return 'kuaishou';
  if (u.includes('music.apple.com')) return 'applemusic';
  if (u.includes('bandcamp.com')) return 'bandcamp';
  if (u.includes('terabox.com') || u.includes('1024tera.com')) return 'terabox';
  if (u.includes('drive.google.com')) return 'gdrive';
  if (u.includes('mediafire.com')) return 'mediafire';
  if (u.includes('capcut.com')) return 'capcut';
  if (u.includes('sfile.mobi') || u.includes('sfile.co')) return 'sfile';
  if (u.includes('videy.co')) return 'videy';
  if (u.includes('safelinku.com') || u.includes('rekonise.com') || u.includes('sub2unlock.com') || u.includes('bit.ly') || u.includes('tinyurl.com') || u.includes('s.id')) return 'bypass';
  return 'general';
}

/**
 * FxTwitter API Scraper: Direct, ultra-fast Twitter/X extractor
 */
async function scrapeFxTwitter(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(?:\w+)\/status(?:es)?\/(\d+)/i);
  if (!match) throw new Error('Format tautan Twitter/X tidak valid.');
  const tweetId = match[1];

  const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(12000),
  });

  const data = await res.json();
  if (!data || data.code !== 200 || !data.tweet) {
    throw new Error('Tweet tidak ditemukan atau akun di-private.');
  }

  const tweet = data.tweet;
  const result = {
    title: tweet.text ? tweet.text.slice(0, 80) : 'Twitter / X Media',
    author: tweet.author?.name ? `${tweet.author.name} (@${tweet.author.screen_name})` : '@twitter',
    thumbnail: tweet.author?.avatar_url || null,
    slides: [],
    downloads: [],
  };

  const media = tweet.media;
  if (media) {
    if (Array.isArray(media.photos) && media.photos.length > 0) {
      media.photos.forEach((p, idx) => {
        result.slides.push({ url: p.url, type: 'image' });
        result.downloads.push({
          label: `🖼️ Foto #${idx + 1} Full HD`,
          quality: 'Original HD',
          type: 'image',
          format: 'jpg',
          url: p.url,
          filename: `twitter_photo_${idx + 1}.jpg`,
        });
      });
      if (!result.thumbnail && media.photos[0]) result.thumbnail = media.photos[0].url;
    }

    if (Array.isArray(media.videos) && media.videos.length > 0) {
      media.videos.forEach((v, idx) => {
        result.slides.push({ url: v.url, type: 'video' });
        result.downloads.unshift({
          label: `🎬 Video HD (${v.format || 'MP4'})`,
          quality: 'HD Quality',
          type: 'video',
          format: 'mp4',
          url: v.url,
          filename: `twitter_video_${idx + 1}.mp4`,
        });
      });
      if (media.videos[0]?.thumbnail_url) result.thumbnail = media.videos[0].thumbnail_url;
    }
  }

  result.mediaType = result.slides.length > 1 ? 'gallery' : (result.slides.some((s) => s.type === 'video') ? 'video' : 'image');
  return result;
}

/**
 * Analyzes any social media / cloud link with Mori Multi-Server failover
 * @param {string} rawUrl - Target URL
 * @param {string} preferredServer - 'server1' | 'server2' | 'server3' | 'auto'
 */
async function analyzeUrl(rawUrl, preferredServer = 'auto') {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL tautan media wajib diisi.');
  }

  const url = rawUrl.trim();
  const platform = detectPlatform(url);

  let result = {
    url,
    platform,
    title: 'Media Download',
    author: null,
    thumbnail: null,
    duration: null,
    mediaType: 'video',
    slides: [],
    downloads: [],
    usedServer: null,
  };

  function getEngineOrder(platformKey) {
    const list = SERVERS_REGISTRY[platformKey] || [];
    const ids = list.map((s) => s.id);
    if (!ids.includes(preferredServer) || preferredServer === 'auto') {
      return list;
    }
    const chosen = list.find((s) => s.id === preferredServer);
    const others = list.filter((s) => s.id !== preferredServer);
    return [chosen, ...others];
  }

  // ==================== 1. TIKTOK ====================
  if (platform === 'tiktok') {
    const engines = getEngineOrder('tiktok');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1') {
          const data = await tiktokScraper.scrapeViaTikWm(url.split('?')[0], 18000);
          result.title = data.title || 'TikTok Content';
          result.author = data.author || '@tiktok';
          result.thumbnail = data.thumbnail || null;
          result.duration = data.duration || null;

          const photos = (data.downloads || []).filter((d) => d.type === 'PHOTO');
          if (photos.length > 0) {
            result.mediaType = 'gallery';
            photos.forEach((p, idx) => {
              result.slides.push({ url: p.url, type: 'image' });
              result.downloads.push({
                label: `Foto Slide #${idx + 1}`,
                quality: 'HD Image',
                type: 'image',
                format: 'jpg',
                url: p.url,
                filename: `tiktok_slide_${idx + 1}.jpg`,
              });
            });
            if (!result.thumbnail) result.thumbnail = photos[0].url;
          }

          const vids = (data.downloads || []).filter((d) => d.type.includes('MP4'));
          vids.forEach((v) => {
            if (result.mediaType !== 'gallery') {
              result.mediaType = 'video';
              result.slides.push({ url: v.url, type: 'video' });
            }
            result.downloads.push({
              label: v.type.includes('HD') ? '🎬 Video Full HD 1080p (Tanpa Watermark)' : '🎬 Video MP4 720p',
              quality: v.type.includes('HD') ? 'Full HD 1080p' : 'HD 720p',
              type: 'video',
              format: 'mp4',
              url: v.url,
              filename: v.type.includes('HD') ? 'tiktok_video_1080p.mp4' : 'tiktok_video_720p.mp4',
            });
          });

          const auds = (data.downloads || []).filter((d) => d.type === 'MP3');
          auds.forEach((a) => {
            result.downloads.push({
              label: '🎵 Audio Musik (MP3)',
              quality: 'Audio MP3',
              type: 'audio',
              format: 'mp3',
              url: a.url,
              filename: 'tiktok_audio.mp3',
            });
          });

          result.usedServer = srv;
          break;
        } else if (srv.id === 'server2') {
          const data = await tiktokScraper.scrapeViaSnapTik(url.split('?')[0], 18000);
          result.title = data.title || 'TikTok Content';
          result.author = data.author || '@tiktok';
          result.thumbnail = data.thumbnail || null;

          const photos = (data.downloads || []).filter((d) => d.type === 'PHOTO');
          if (photos.length > 0) {
            result.mediaType = 'gallery';
            photos.forEach((p, idx) => {
              result.slides.push({ url: p.url, type: 'image' });
              result.downloads.push({
                label: `Foto Slide #${idx + 1}`,
                quality: 'HD Image',
                type: 'image',
                format: 'jpg',
                url: p.url,
                filename: `tiktok_slide_${idx + 1}.jpg`,
              });
            });
            if (!result.thumbnail) result.thumbnail = photos[0].url;
          }

          const vids = (data.downloads || []).filter((d) => d.type.includes('MP4'));
          vids.forEach((v) => {
            if (result.mediaType !== 'gallery') {
              result.mediaType = 'video';
              result.slides.push({ url: v.url, type: 'video' });
            }
            result.downloads.push({
              label: v.type.includes('HD') ? '🎬 Video HD (SnapTik No-WM)' : '🎬 Video MP4',
              quality: v.type.includes('HD') ? 'HD 1080p' : 'HD 720p',
              type: 'video',
              format: 'mp4',
              url: v.url,
              filename: 'tiktok_video_nowm.mp4',
            });
          });

          result.usedServer = srv;
          break;
        } else if (srv.id === 'server3') {
          const data = await tiktokScraper.scrapeViaTikTokIo(url.split('?')[0], 18000);
          result.title = data.title || 'TikTok Content';
          result.author = data.author || '@tiktok';
          result.thumbnail = data.thumbnail || null;

          const photos = (data.downloads || []).filter((d) => d.type === 'PHOTO');
          if (photos.length > 0) {
            result.mediaType = 'gallery';
            photos.forEach((p, idx) => {
              result.slides.push({ url: p.url, type: 'image' });
              result.downloads.push({
                label: `Foto Slide #${idx + 1}`,
                quality: 'HD Image',
                type: 'image',
                format: 'jpg',
                url: p.url,
                filename: `tiktok_slide_${idx + 1}.jpg`,
              });
            });
            if (!result.thumbnail) result.thumbnail = photos[0].url;
          }

          const vids = (data.downloads || []).filter((d) => d.type === 'VIDEO' || d.type.includes('MP4'));
          vids.forEach((v) => {
            if (result.mediaType !== 'gallery') {
              result.mediaType = 'video';
              result.slides.push({ url: v.url, type: 'video' });
            }
            result.downloads.push({
              label: '🎬 Video HD (TikTokIO No-WM)',
              quality: 'HD 720p/1080p',
              type: 'video',
              format: 'mp4',
              url: v.url,
              filename: 'tiktok_video_nowm.mp4',
            });
          });

          const auds = (data.downloads || []).filter((d) => d.type === 'MP3');
          auds.forEach((a) => {
            result.downloads.push({
              label: '🎵 Audio Musik (MP3)',
              quality: 'Audio MP3',
              type: 'audio',
              format: 'mp3',
              url: a.url,
              filename: 'tiktok_audio.mp3',
            });
          });

          result.usedServer = srv;
          break;
        } else {
          const data = await btch.ttdl(url);
          result.title = data.title || 'TikTok Video';
          result.author = data.author || data.creator || '@tiktok';
          result.thumbnail = data.thumbnail || data.cover || null;

          if (Array.isArray(data.images) && data.images.length > 0) {
            result.mediaType = 'gallery';
            data.images.forEach((img, i) => {
              result.slides.push({ url: img, type: 'image' });
              result.downloads.push({
                label: `Foto Slide #${i + 1}`,
                quality: 'HD Image',
                type: 'image',
                format: 'jpg',
                url: img,
                filename: `tiktok_slide_${i + 1}.jpg`,
              });
            });
            if (!result.thumbnail) result.thumbnail = data.images[0];
          }

          const vUrl = data.video || data.nowatermark || data.video_nowm;
          if (vUrl) {
            if (result.mediaType !== 'gallery') {
              result.mediaType = 'video';
              result.slides.unshift({ url: vUrl, type: 'video' });
            }
            result.downloads.unshift({
              label: '🎬 Video HD (BTCH Mirror)',
              quality: 'HD',
              type: 'video',
              format: 'mp4',
              url: vUrl,
              filename: 'tiktok_video_nowm.mp4',
            });
          }

          if (data.audio || data.music) {
            result.downloads.push({
              label: '🎵 Audio Musik (MP3)',
              quality: 'Original Audio',
              type: 'audio',
              format: 'mp3',
              url: data.audio || data.music,
              filename: 'tiktok_audio.mp3',
            });
          }

          result.usedServer = srv;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] TikTok ${srv.id} (${srv.name}) failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak TikTok dari seluruh server: ${lastError.message}`);
    }
  }

  // ==================== 2. INSTAGRAM ====================
  else if (platform === 'instagram') {
    const engines = getEngineOrder('instagram');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1') {
          const fallback = await igFbScraper.scrapeInstagram(url);
          result.title = fallback.caption || 'Instagram Media';
          result.thumbnail = fallback.thumbnail || null;
          const mediaList = Array.isArray(fallback.media) ? fallback.media : (fallback.url ? [fallback.url] : []);
          mediaList.forEach((m, idx) => {
            const mUrl = typeof m === 'string' ? m : m.url;
            const isVideo = mUrl.includes('.mp4');
            result.slides.push({ url: mUrl, type: isVideo ? 'video' : 'image' });
            result.downloads.push({
              label: isVideo ? `🎬 Video Instagram #${idx + 1}` : `🖼️ Foto Instagram #${idx + 1}`,
              quality: 'HD Quality',
              type: isVideo ? 'video' : 'image',
              format: isVideo ? 'mp4' : 'jpg',
              url: mUrl,
              filename: `instagram_media_${idx + 1}.${isVideo ? 'mp4' : 'jpg'}`,
            });
          });
          result.mediaType = result.slides.length > 1 ? 'gallery' : (result.slides.some((s) => s.type === 'video') ? 'video' : 'image');
          result.usedServer = srv;
          break;
        } else {
          const data = await btch.igdl(url);
          const items = Array.isArray(data) ? data : (data.result || (data.url ? [data] : []));
          result.title = 'Instagram Media';

          items.forEach((item, idx) => {
            const itemUrl = typeof item === 'string' ? item : (item.url || item.download_url);
            if (!itemUrl) return;
            const isVideo = itemUrl.includes('.mp4') || (item.type && item.type.includes('video'));
            result.slides.push({ url: itemUrl, type: isVideo ? 'video' : 'image' });
            result.downloads.push({
              label: isVideo ? `🎬 Video #${idx + 1}` : `🖼️ Foto #${idx + 1}`,
              quality: 'Original',
              type: isVideo ? 'video' : 'image',
              format: isVideo ? 'mp4' : 'jpg',
              url: itemUrl,
              filename: isVideo ? `instagram_video_${idx + 1}.mp4` : `instagram_image_${idx + 1}.jpg`,
            });
          });

          result.mediaType = result.slides.length > 1 ? 'gallery' : (result.slides.some((s) => s.type === 'video') ? 'video' : 'image');
          if (result.slides.length > 0 && !result.thumbnail) result.thumbnail = result.slides[0].url;
          result.usedServer = srv;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] Instagram ${srv.id} (${srv.name}) failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak Instagram dari seluruh server: ${lastError.message}`);
    }
  }

  // ==================== 3. YOUTUBE ====================
  else if (platform === 'youtube') {
    const engines = getEngineOrder('youtube');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1' || srv.id === 'server2') {
          const fallback = await youtubeScraper.scrapeYouTube(url, 25000);
          result.title = fallback.title || 'YouTube Media';
          result.thumbnail = fallback.thumbnail || null;
          result.mediaType = 'video';

          if (Array.isArray(fallback.downloads)) {
            fallback.downloads.forEach((dl) => {
              const isAudio = dl.format === 'mp3' || dl.type === 'audio';
              if (!isAudio && result.slides.length === 0) {
                result.slides.push({ url: dl.url, type: 'video' });
              }
              result.downloads.push({
                label: dl.label || (isAudio ? '🎵 Unduh Audio MP3' : '🎬 Unduh Video MP4'),
                quality: dl.quality || (isAudio ? 'Audio MP3' : 'HD Video'),
                type: isAudio ? 'audio' : 'video',
                format: dl.format || (isAudio ? 'mp3' : 'mp4'),
                url: dl.url,
                filename: `${(result.title || 'youtube').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.${dl.format || 'mp4'}`,
              });
            });
          }

          if (result.downloads.length > 0) {
            result.usedServer = srv;
            break;
          }
        }

        const data = await btch.youtube(url);
        result.title = data.title || 'YouTube Media';
        result.author = data.channel || data.author || 'YouTube';
        result.thumbnail = data.thumbnail || null;
        result.mediaType = 'video';

        if (data.mp4) {
          result.slides.push({ url: data.mp4, type: 'video' });
          result.downloads.push({
            label: '🎬 Unduh Video MP4 (720p HD)',
            quality: '720p HD',
            type: 'video',
            format: 'mp4',
            url: data.mp4,
            filename: `${(data.title || 'youtube_video').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.mp4`,
          });
        }
        if (data.mp3) {
          result.downloads.push({
            label: '🎵 Unduh Audio MP3 (128kbps)',
            quality: '128kbps Audio',
            type: 'audio',
            format: 'mp3',
            url: data.mp3,
            filename: `${(data.title || 'youtube_audio').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.mp3`,
          });
        }
        result.usedServer = srv;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] YouTube ${srv.id} failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak YouTube dari seluruh server: ${lastError.message}`);
    }
  }

  // ==================== 4. TWITTER / X ====================
  else if (platform === 'twitter') {
    const engines = getEngineOrder('twitter');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1') {
          const fx = await scrapeFxTwitter(url);
          result = { ...result, ...fx, usedServer: srv };
          break;
        } else if (srv.id === 'server2') {
          const fallback = await twitterScraper.scrapeTwitter(url);
          result.title = fallback.title || 'Twitter / X Video';
          result.mediaType = 'video';
          if (fallback.videoUrl) {
            result.slides.push({ url: fallback.videoUrl, type: 'video' });
            result.downloads.push({
              label: '🎬 Video Twitter HD (TVD Engine)',
              quality: 'HD',
              type: 'video',
              format: 'mp4',
              url: fallback.videoUrl,
              filename: 'twitter_video.mp4',
            });
          }
          result.usedServer = srv;
          break;
        } else {
          const data = await btch.twitter(url);
          result.title = data.title || data.desc || 'Twitter / X Media';
          result.thumbnail = data.thumb || null;
          result.mediaType = 'video';
          if (Array.isArray(data.url)) {
            data.url.forEach((u, i) => {
              const dlUrl = u.url || u.hd || u.sd;
              if (dlUrl) {
                if (i === 0) result.slides.push({ url: dlUrl, type: 'video' });
                result.downloads.push({
                  label: `🎬 Video ${u.hd ? 'HD' : 'SD'}`,
                  quality: u.resolution || 'MP4',
                  type: 'video',
                  format: 'mp4',
                  url: dlUrl,
                  filename: `twitter_video_${i + 1}.mp4`,
                });
              }
            });
          }
          result.usedServer = srv;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] Twitter ${srv.id} failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak Twitter dari seluruh server: ${lastError.message}`);
    }
  }

  // ==================== 5. SPOTIFY ====================
  else if (platform === 'spotify') {
    result.mediaType = 'audio';
    const engines = getEngineOrder('spotify');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1') {
          const fallback = await spotifyScraper.scrapeSpotify(url);
          if (!fallback.success) throw new Error(fallback.error || 'SpotiDown scraper failed');
          result.title = fallback.title || 'Spotify Track';
          result.author = fallback.artist || 'Spotify';
          result.thumbnail = fallback.thumbnail || null;
          const spotiUrl = fallback.audioUrl || (fallback.downloads && fallback.downloads[0] && fallback.downloads[0].url);
          if (spotiUrl) {
            result.slides.push({ url: spotiUrl, type: 'audio' });
            result.downloads.push({
              label: '🎵 Unduh Lagu MP3 (320kbps Lossless)',
              quality: '320kbps Audio',
              type: 'audio',
              format: 'mp3',
              url: spotiUrl,
              filename: `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`,
            });
          }
          result.usedServer = srv;
          break;
        } else {
          const raw = await btch.spotify(url);
          const data = raw.result || raw;
          result.title = data.title || data.name || 'Spotify Track';
          result.author = data.artist || data.artists || 'Spotify';
          result.thumbnail = data.thumbnail || data.cover || null;
          const dlUrl = data.url || data.download || (data.formats && data.formats[0] && data.formats[0].url);
          if (dlUrl) {
            result.slides.push({ url: dlUrl, type: 'audio' });
            result.downloads.push({
              label: '🎵 Unduh Lagu MP3 (BTCH Mirror)',
              quality: 'Audio MP3',
              type: 'audio',
              format: 'mp3',
              url: dlUrl,
              filename: `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`,
            });
          }
          result.usedServer = srv;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] Spotify ${srv.id} failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak Spotify dari seluruh server: ${lastError.message}`);
    }
  }

  // ==================== 6. FACEBOOK ====================
  else if (platform === 'facebook') {
    const engines = getEngineOrder('facebook');
    let lastError = null;

    for (const srv of engines) {
      try {
        if (srv.id === 'server1') {
          const fallback = await igFbScraper.scrapeFacebook(url);
          result.title = fallback.title || 'Facebook Video';
          result.mediaType = 'video';
          if (fallback.hd) {
            result.slides.push({ url: fallback.hd, type: 'video' });
            result.downloads.push({
              label: '🎬 Video Facebook HD (SnapSave Engine)',
              quality: 'HD High Quality',
              type: 'video',
              format: 'mp4',
              url: fallback.hd,
              filename: 'facebook_video_hd.mp4',
            });
          }
          if (fallback.sd) {
            if (result.slides.length === 0) result.slides.push({ url: fallback.sd, type: 'video' });
            result.downloads.push({
              label: '🎬 Video Facebook SD',
              quality: 'SD',
              type: 'video',
              format: 'mp4',
              url: fallback.sd,
              filename: 'facebook_video_sd.mp4',
            });
          }
          result.usedServer = srv;
          break;
        } else {
          const data = await btch.fbdown(url);
          result.title = data.title || 'Facebook Video';
          result.mediaType = 'video';
          if (data.HD || data.hd) {
            const vUrl = data.HD || data.hd;
            result.slides.push({ url: vUrl, type: 'video' });
            result.downloads.push({
              label: '🎬 Video Facebook HD',
              quality: 'HD',
              type: 'video',
              format: 'mp4',
              url: vUrl,
              filename: 'facebook_video_hd.mp4',
            });
          }
          if (data.Normal_video || data.sd) {
            const vUrl = data.Normal_video || data.sd;
            if (result.slides.length === 0) result.slides.push({ url: vUrl, type: 'video' });
            result.downloads.push({
              label: '🎬 Video Facebook SD',
              quality: 'SD',
              type: 'video',
              format: 'mp4',
              url: vUrl,
              filename: 'facebook_video_sd.mp4',
            });
          }
          result.usedServer = srv;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[omnigetEngine] Facebook ${srv.id} failed: ${err.message}. Trying next server...`);
      }
    }

    if (result.downloads.length === 0 && lastError) {
      throw new Error(`Gagal mengekstrak Facebook: ${lastError.message}`);
    }
  }

  // ==================== 7. PINTEREST ====================
  else if (platform === 'pinterest') {
    try {
      const fallback = await pinterestScraper.scrapePinterest(url);
      result.title = 'Pinterest Media';
      if (fallback.url) {
        result.mediaType = fallback.isVideo ? 'video' : 'image';
        result.slides.push({ url: fallback.url, type: fallback.isVideo ? 'video' : 'image' });
        result.downloads.push({
          label: fallback.isVideo ? '🎬 Video Pinterest HD' : '🖼️ Gambar Pinterest Full HD',
          quality: 'Original',
          type: fallback.isVideo ? 'video' : 'image',
          format: fallback.isVideo ? 'mp4' : 'jpg',
          url: fallback.url,
          filename: fallback.isVideo ? 'pinterest_video.mp4' : 'pinterest_image.jpg',
        });
        if (!fallback.isVideo) result.thumbnail = fallback.url;
      }
      result.usedServer = { id: 'server1', name: 'Server 1 (Native CDN)', sub: 'Direct CDN' };
    } catch (_) {
      const data = await btch.pinterest(url);
      const pUrl = typeof data === 'string' ? data : (data.url || data.download);
      const isVideo = pUrl && pUrl.includes('.mp4');
      result.mediaType = isVideo ? 'video' : 'image';
      result.slides.push({ url: pUrl, type: isVideo ? 'video' : 'image' });
      result.downloads.push({
        label: isVideo ? '🎬 Video Pinterest' : '🖼️ Gambar Pinterest',
        quality: 'Original',
        type: isVideo ? 'video' : 'image',
        format: isVideo ? 'mp4' : 'jpg',
        url: pUrl,
        filename: isVideo ? 'pinterest_video.mp4' : 'pinterest_image.jpg',
      });
      if (!isVideo) result.thumbnail = pUrl;
      result.usedServer = { id: 'server2', name: 'Server 2 (BTCH Mirror)', sub: 'Backup' };
    }
  }

  // ==================== 8. THREADS ====================
  else if (platform === 'threads') {
    try {
      const data = await btch.threads(url);
      result.title = data.title || data.description || 'Threads Post';
      const items = Array.isArray(data) ? data : (data.result || (data.url ? [data] : []));
      items.forEach((item, idx) => {
        const iUrl = typeof item === 'string' ? item : (item.url || item.download);
        if (!iUrl) return;
        const isVideo = iUrl.includes('.mp4') || (item.type && item.type.includes('video'));
        result.slides.push({ url: iUrl, type: isVideo ? 'video' : 'image' });
        result.downloads.push({
          label: isVideo ? `🎬 Video Threads #${idx + 1}` : `🖼️ Foto Threads #${idx + 1}`,
          quality: 'Original',
          type: isVideo ? 'video' : 'image',
          format: isVideo ? 'mp4' : 'jpg',
          url: iUrl,
          filename: `threads_media_${idx + 1}.${isVideo ? 'mp4' : 'jpg'}`,
        });
      });
      result.mediaType = result.slides.length > 1 ? 'gallery' : (result.slides.some((s) => s.type === 'video') ? 'video' : 'image');
      if (result.slides.length > 0) result.thumbnail = result.slides[0].url;
      result.usedServer = { id: 'server1', name: 'Server 1 (Threads Engine)', sub: 'Direct Extractor' };
    } catch (_) {
      const aioData = await btch.aio(url);
      result.title = aioData.title || 'Threads Media';
      const dlUrl = aioData.url || aioData.download;
      if (dlUrl) {
        const isVideo = dlUrl.includes('.mp4');
        result.mediaType = isVideo ? 'video' : 'image';
        result.slides.push({ url: dlUrl, type: isVideo ? 'video' : 'image' });
        result.downloads.push({
          label: isVideo ? '🎬 Video Threads HD' : '🖼️ Foto Threads',
          quality: 'HD',
          type: isVideo ? 'video' : 'image',
          format: isVideo ? 'mp4' : 'jpg',
          url: dlUrl,
          filename: `threads_media.${isVideo ? 'mp4' : 'jpg'}`,
        });
      }
      result.usedServer = { id: 'server2', name: 'Server 2 (AIO Backup)', sub: 'Backup' };
    }
  }

  // ==================== 9. MEDIAFIRE ====================
  else if (platform === 'mediafire') {
    const isFolder = mediafireScraper.isFolderUrl(url);
    if (isFolder) {
      const folderData = await mediafireScraper.scanMediaFireFolder(url);
      result.title = folderData.folderName || 'MediaFire Folder';
      result.mediaType = 'document';
      folderData.files.forEach((f) => {
        result.downloads.push({
          label: `📄 ${f.name} (${mediafireScraper.formatBytes(f.size)})`,
          quality: mediafireScraper.formatBytes(f.size),
          type: 'document',
          format: 'bin',
          url: f.url,
          filename: f.name,
        });
      });
    } else {
      const direct = await mediafireScraper.resolveDirectLink(url);
      result.title = direct.fileName || 'MediaFire Download';
      result.mediaType = 'document';
      result.downloads.push({
        label: `📄 ${direct.fileName} (${mediafireScraper.formatBytes(direct.sizeBytes)})`,
        quality: mediafireScraper.formatBytes(direct.sizeBytes),
        type: 'document',
        format: 'bin',
        url: direct.directUrl,
        filename: direct.fileName,
      });
    }
    result.usedServer = { id: 'server1', name: 'Server 1 (MediaFire Engine)', sub: 'Native Direct' };
  }

  // ==================== 10. GOOGLE DRIVE ====================
  else if (platform === 'gdrive') {
    result.mediaType = 'document';
    try {
      const gData = await gdriveScraper.scrapeGDrive(url);
      result.title = gData.fileName || 'Google Drive File';
      result.downloads.push({
        label: `📦 Unduh ${gData.fileName}`,
        quality: 'Direct File',
        type: 'document',
        format: 'bin',
        url: gData.directUrl,
        filename: gData.fileName,
      });
      result.usedServer = { id: 'server1', name: 'Server 1 (GDrive Direct)', sub: 'Direct Stream' };
    } catch (_) {
      const bData = await btch.gdrive(url);
      result.title = bData.fileName || 'Google Drive File';
      result.downloads.push({
        label: '📦 Unduh File Google Drive',
        quality: 'Direct File',
        type: 'document',
        format: 'bin',
        url: bData.downloadUrl || bData.url,
        filename: bData.fileName || 'gdrive_download',
      });
      result.usedServer = { id: 'server2', name: 'Server 2 (BTCH GDrive)', sub: 'Backup' };
    }
  }

  // ==================== 11. OMNIGET COURSE & CURRICULUM ====================
  else if (platform === 'course') {
    const omnigetToolbox = require('./toolbox');
    const courseData = await omnigetToolbox.parseCourseUrl(url);
    result.title = courseData.title;
    result.author = courseData.instructor;
    result.thumbnail = courseData.thumbnail;
    result.mediaType = 'course';
    result.duration = courseData.totalDuration;
    result.courseData = courseData;

    (courseData.curriculum || []).forEach((sec) => {
      (sec.items || []).forEach((item) => {
        if (item.type === 'video') {
          result.downloads.push({
            label: `🎬 ${item.title} (${item.duration})`,
            quality: 'HD 1080p Stream',
            type: 'video',
            format: 'mp4',
            url: item.streamUrl || url,
            filename: `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`,
          });
        } else if (item.type === 'resource') {
          result.downloads.push({
            label: `📎 ${item.title} (${item.format?.toUpperCase()})`,
            quality: 'Resource File',
            type: 'document',
            format: item.format || 'zip',
            url: url,
            filename: `${item.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${item.format || 'zip'}`,
          });
        }
      });
    });

    result.usedServer = { id: 'server1', name: 'Server 1 (OmniGet Deep Core)', sub: 'Universal Course Scraper' };
  }

  // ==================== 12. BITTORRENT & MAGNET ====================
  else if (platform === 'magnet') {
    const omnigetToolbox = require('./toolbox');
    const mag = omnigetToolbox.parseMagnetUri(url);
    result.title = mag.name;
    result.author = `Swarm InfoHash: ${mag.infoHash.slice(0, 12)}...`;
    result.mediaType = mag.category;
    result.magnetData = mag;
    result.downloads.push({
      label: `🧲 Unduh Torrent: ${mag.name} (${mag.formattedSize})`,
      quality: `${mag.health} • ${mag.trackersCount} Trackers`,
      type: 'document',
      format: 'torrent',
      url,
      filename: `${mag.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.torrent`,
    });
    result.usedServer = { id: 'server2', name: 'Server 2 (BitTorrent Swarm)', sub: 'Magnet Inspector' };
  }

  // ==================== 13. DOUYIN ====================
  else if (platform === 'douyin') {
    let target = url;
    if (url.includes('v.douyin.com')) {
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });
        if (resp.url && resp.url !== url) target = resp.url;
      } catch (_) {}
    }

    try {
      const data = await tiktokScraper.scrapeViaTikWm(target, 18000);
      result.title = data.title || 'Douyin Media';
      result.author = data.author || '@douyin';
      result.thumbnail = data.thumbnail || null;
      result.duration = data.duration || null;

      const photos = (data.downloads || []).filter((d) => d.type === 'PHOTO');
      if (photos.length > 0) {
        result.mediaType = 'gallery';
        photos.forEach((p, idx) => {
          result.slides.push({ url: p.url, type: 'image' });
          result.downloads.push({
            label: `Foto Slide #${idx + 1}`,
            quality: 'HD Image',
            type: 'image',
            format: 'jpg',
            url: p.url,
            filename: `douyin_slide_${idx + 1}.jpg`,
          });
        });
        if (!result.thumbnail) result.thumbnail = photos[0].url;
      }

      const vids = (data.downloads || []).filter((d) => d.type.includes('MP4'));
      vids.forEach((v) => {
        if (result.mediaType !== 'gallery') {
          result.mediaType = 'video';
          result.slides.push({ url: v.url, type: 'video' });
        }
        result.downloads.push({
          label: v.type.includes('HD') ? '🎬 Video Full HD 1080p (Tanpa Watermark)' : '🎬 Video MP4 720p',
          quality: v.type.includes('HD') ? 'Full HD 1080p' : 'HD 720p',
          type: 'video',
          format: 'mp4',
          url: v.url,
          filename: 'douyin_video.mp4',
        });
      });

      const auds = (data.downloads || []).filter((d) => d.type === 'MP3');
      auds.forEach((a) => {
        result.downloads.push({
          label: '🎵 Audio Musik (MP3)',
          quality: 'Audio MP3',
          type: 'audio',
          format: 'mp3',
          url: a.url,
          filename: 'douyin_audio.mp3',
        });
      });

      result.usedServer = { id: 'server1', name: 'Server 1 (Douyin TikWM HD)', sub: 'Direct 1080p & Slides Album' };
    } catch (_) {
      const aioData = await btch.aio(target);
      result.title = aioData.title || 'Douyin Video';
      result.thumbnail = aioData.thumbnail || null;
      const dlUrl = aioData.url || aioData.download;
      if (dlUrl) {
        result.mediaType = 'video';
        result.slides.push({ url: dlUrl, type: 'video' });
        result.downloads.push({
          label: '🎬 Unduh Video Douyin HD',
          quality: 'HD',
          type: 'video',
          format: 'mp4',
          url: dlUrl,
          filename: 'douyin_video.mp4',
        });
      }
      result.usedServer = { id: 'server2', name: 'Server 2 (Mori Douyin Core)', sub: 'Fallback Mirror' };
    }
  }

  // ==================== 14. REDNOTE / XIAOHONGSHU ====================
  else if (platform === 'rednote') {
    try {
      const data = await btch.aio(url);
      result.title = data.title || 'RedNote / Xiaohongshu Post';
      result.thumbnail = data.thumbnail || null;
      const dlUrl = data.url || data.download;
      if (dlUrl) {
        const isVideo = dlUrl.includes('.mp4');
        result.mediaType = isVideo ? 'video' : 'image';
        result.slides.push({ url: dlUrl, type: isVideo ? 'video' : 'image' });
        result.downloads.push({
          label: isVideo ? '🎬 Video RedNote HD' : '🖼️ Foto RedNote Full HD',
          quality: 'Original HD',
          type: isVideo ? 'video' : 'image',
          format: isVideo ? 'mp4' : 'jpg',
          url: dlUrl,
          filename: `rednote_media.${isVideo ? 'mp4' : 'jpg'}`,
        });
      }
      result.usedServer = { id: 'server1', name: 'Server 1 (RedNote XHS Engine)', sub: 'Original Lossless' };
    } catch (e) {
      throw new Error('Gagal mengekstrak RedNote: ' + e.message);
    }
  }

  // ==================== 15. BILIBILI ====================
  else if (platform === 'bilibili') {
    try {
      const data = await btch.aio(url);
      result.title = data.title || 'Bilibili Video';
      result.thumbnail = data.thumbnail || null;
      const dlUrl = data.url || data.download;
      if (dlUrl) {
        result.mediaType = 'video';
        result.slides.push({ url: dlUrl, type: 'video' });
        result.downloads.push({
          label: '🎬 Video Bilibili 1080p HD',
          quality: '1080p HD',
          type: 'video',
          format: 'mp4',
          url: dlUrl,
          filename: 'bilibili_video.mp4',
        });
      }
      result.usedServer = { id: 'server1', name: 'Server 1 (Bilibili HD)', sub: 'Direct Multi-Part Video' };
    } catch (e) {
      throw new Error('Gagal mengekstrak Bilibili: ' + e.message);
    }
  }

  // ==================== 16. APPLE MUSIC ====================
  else if (platform === 'applemusic') {
    result.mediaType = 'audio';
    try {
      const data = await btch.aio(url);
      result.title = data.title || 'Apple Music Track';
      result.author = data.artist || 'Apple Music';
      result.thumbnail = data.thumbnail || null;
      const dlUrl = data.url || data.download;
      if (dlUrl) {
        result.slides.push({ url: dlUrl, type: 'audio' });
        result.downloads.push({
          label: '🎵 Apple Music Lossless Audio (320kbps)',
          quality: '320kbps Audio',
          type: 'audio',
          format: 'mp3',
          url: dlUrl,
          filename: `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`,
        });
      }
      result.usedServer = { id: 'server1', name: 'Server 1 (Apple Music Studio)', sub: 'High Fidelity' };
    } catch (_) {
      const match = url.match(/\/album\/[^/]+\/(\d+)(?:\?i=(\d+))?/i);
      const trackId = match ? (match[2] || match[1]) : null;
      if (trackId) {
        const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`, { signal: AbortSignal.timeout(10000) });
        const itunesJson = await itunesRes.json();
        const item = itunesJson.results?.[0];
        if (item) {
          result.title = item.trackName || item.collectionName || 'Apple Music Track';
          result.author = item.artistName || 'Apple Music';
          result.thumbnail = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
          if (item.previewUrl) {
            result.slides.push({ url: item.previewUrl, type: 'audio' });
            result.downloads.push({
              label: '🎵 Audio Preview HQ (Apple M4A / 256kbps)',
              quality: '256kbps Audio',
              type: 'audio',
              format: 'm4a',
              url: item.previewUrl,
              filename: `${result.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_preview.m4a`,
            });
          }
        }
      }
      result.usedServer = { id: 'server2', name: 'Server 2 (iTunes Direct CDN)', sub: 'Direct Preview Stream' };
    }
  }

  // ==================== 17. SFILE.MOBI ====================
  else if (platform === 'sfile') {
    result.mediaType = 'document';
    let sfileData = null;
    if (scrapr?.resolver?.sfile) {
      try {
        const sRes = await scrapr.resolver.sfile(url);
        if (sRes?.status && sRes?.result) sfileData = sRes.result;
      } catch (_) {}
    }
    if (sfileData && sfileData.url) {
      result.title = sfileData.filename || sfileData.title || 'Sfile Download';
      result.size = sfileData.size || '';
      result.downloads.push({
        label: `📄 Unduh ${sfileData.filename || 'File'} (${sfileData.size || 'Direct'})`,
        quality: 'Original',
        type: 'document',
        format: 'bin',
        url: sfileData.url,
        filename: sfileData.filename || 'sfile_file.bin',
      });
      result.usedServer = { id: 'server1', name: 'Server 1 (Sfile Native Scraper)', sub: 'Direct Token Resolver' };
    } else {
      const data = await btch.aio(url);
      const dlUrl = data.url || data.download;
      if (!dlUrl) throw new Error('Gagal mengekstrak unduhan dari Sfile.');
      result.title = data.title || 'Sfile File';
      result.downloads.push({
        label: '📄 Unduh Sfile',
        quality: 'Original',
        type: 'document',
        format: 'bin',
        url: dlUrl,
        filename: 'sfile_download.bin',
      });
      result.usedServer = { id: 'server2', name: 'Server 2 (Sfile AIO Mirror)', sub: 'Fallback Mirror' };
    }
  }

  // ==================== 18. VIDEY.CO ====================
  else if (platform === 'videy') {
    result.mediaType = 'video';
    const match = url.match(/videy\.co\/(?:v\?id=|embed\?id=)?([a-zA-Z0-9_-]+)/i);
    const vidId = match ? match[1] : null;
    if (vidId) {
      const directUrl = `https://cdn.videy.co/${vidId}.mp4`;
      result.title = `Videy Video (${vidId})`;
      result.slides.push({ url: directUrl, type: 'video' });
      result.downloads.push({
        label: '🎬 Unduh Videy MP4 (Direct CDN)',
        quality: 'Original',
        type: 'video',
        format: 'mp4',
        url: directUrl,
        filename: `videy_${vidId}.mp4`,
      });
      result.usedServer = { id: 'server1', name: 'Server 1 (Videy CDN Resolver)', sub: 'Lossless Direct Stream' };
    } else {
      const data = await btch.aio(url);
      const dlUrl = data.url || data.download;
      if (!dlUrl) throw new Error('Gagal mengekstrak video Videy.');
      result.title = data.title || 'Videy Video';
      result.slides.push({ url: dlUrl, type: 'video' });
      result.downloads.push({
        label: '🎬 Unduh Video Videy',
        quality: 'Original',
        type: 'video',
        format: 'mp4',
        url: dlUrl,
        filename: 'videy_video.mp4',
      });
      result.usedServer = { id: 'server2', name: 'Server 2 (Videy AIO Mirror)', sub: 'AIO Engine' };
    }
  }

  // ==================== 19. BYPASS / SHORTLINK ====================
  else if (platform === 'bypass') {
    result.mediaType = 'document';
    let targetUrl = null;
    if (scrapr?.resolver?.unshorten) {
      try {
        const uRes = await scrapr.resolver.unshorten(url);
        if (uRes?.status && uRes?.result?.destination) targetUrl = uRes.result.destination;
      } catch (_) {}
    }
    if (!targetUrl && scrapr?.resolver?.safelinku && url.includes('safelinku')) {
      try {
        const sRes = await scrapr.resolver.safelinku(url);
        if (sRes?.status && sRes?.result?.url) targetUrl = sRes.result.url;
      } catch (_) {}
    }
    if (!targetUrl) {
      const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (resp?.url) targetUrl = resp.url;
    }
    if (!targetUrl) throw new Error('Gagal melakukan bypass tautan pendek.');
    result.title = 'Bypass Shortlink Result';
    result.downloads.push({
      label: `🔗 URL Tujuan Asli: ${targetUrl.slice(0, 50)}...`,
      quality: 'Direct URL',
      type: 'document',
      format: 'url',
      url: targetUrl,
      filename: 'destination_url.txt',
    });
    result.usedServer = { id: 'server1', name: 'Server 1 (Unshorten Multi-Hop Resolver)', sub: 'Direct Redirect Follower' };
  }

  // ==================== 20. GENERAL / AIO (All In One) ====================
  else {
    try {
      const data = await btch.aio(url);
      result.title = data.title || 'Media Download';
      result.thumbnail = data.thumbnail || null;
      const dlUrl = data.url || data.download;
      if (dlUrl) {
        const isVideo = dlUrl.includes('.mp4');
        result.mediaType = isVideo ? 'video' : 'image';
        result.slides.push({ url: dlUrl, type: isVideo ? 'video' : 'image' });
        result.downloads.push({
          label: '📥 Unduh Media',
          quality: 'Original',
          type: isVideo ? 'video' : 'image',
          format: isVideo ? 'mp4' : 'jpg',
          url: dlUrl,
          filename: `media_download.${isVideo ? 'mp4' : 'jpg'}`,
        });
      }
      result.usedServer = { id: 'server1', name: 'Server 1 (AIO Engine)', sub: 'Universal Multi-CDN' };
    } catch (e) {
      throw new Error('Tautan tidak didukung atau konten privat / telah dihapus.');
    }
  }

  if (!result.downloads || result.downloads.length === 0) {
    throw new Error('Tidak ditemukan tautan unduhan yang dapat diakses untuk media ini.');
  }

  try {
    const { analyticsQueries } = require('../../server/db');
    if (analyticsQueries && typeof analyticsQueries.recordPlatformDownload === 'function') {
      analyticsQueries.recordPlatformDownload(result.platform);
    }
  } catch (_) {}

  result.success = true;
  result.layerUsed = result.layerUsed || (preferredServer === 'server1' ? 1 : (preferredServer === 'server2' ? 2 : 3));
  result.layerName = result.layerName || (result.usedServer ? result.usedServer.name : `Server ${result.layerUsed}`);
  result.downloadDate = new Date().toISOString();

  return result;
}

/**
 * Format Standardized Response Object
 */
function formatResult(raw, layerNum, layerName, url, platform, dateIso) {
  const dls = raw.downloads || [];
  const primaryDl = dls[0] || {};
  let mediaType = raw.mediaType;
  if (!mediaType) {
    if (raw.slides && raw.slides.length > 0) mediaType = 'gallery';
    else if (primaryDl.type) mediaType = primaryDl.type;
    else if (platform === 'spotify') mediaType = 'audio';
    else mediaType = 'video';
  }

  let formattedSize = raw.size || primaryDl.size || 'Auto/Streaming';

  return {
    success: true,
    layerUsed: layerNum,
    layerName,
    url,
    title: raw.title || 'Media Download',
    author: raw.author || '',
    duration: raw.duration || '',
    platform: raw.platform || platform,
    thumbnail: raw.thumbnail || '',
    mediaType,
    size: formattedSize,
    downloadDate: dateIso,
    downloads: dls,
    slides: raw.slides || [],
    errors: {
      layer1: null,
      layer2: null,
      layer3: null,
    },
  };
}

/**
 * Eksekusi Layer 1 (Scraper Utama)
 */
async function scrapeLayer1(url, platform = null) {
  return analyzeUrl(url, 'server1');
}

/**
 * Eksekusi Layer 2 (OmniGet Secondary Scrapers)
 */
async function scrapeLayer2(url, platform = null) {
  return analyzeUrl(url, 'server2');
}

/**
 * Eksekusi Layer 3 (Multi-Server Cloud / Mirror Engine)
 */
async function scrapeLayer3(url, serverPreference = 'auto') {
  return analyzeUrl(url, serverPreference === 'auto' ? 'server3' : serverPreference);
}

/**
 * Master 3-Tier Downloader Orchestrator (Single Source of Truth)
 * @param {string} url - Link media
 * @param {string} mode - 'auto' (default cascading fallback), 'layer1', 'layer2', 'layer3'
 */
async function analyzeThreeTier(url, mode = 'auto') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('URL / Tautan media wajib diisi.');
  }

  const cleanUrl = url.trim();
  const platform = detectPlatform(cleanUrl);
  const nowIso = new Date().toISOString();

  let err1 = null;
  let err2 = null;
  let err3 = null;

  // 1. Force Layer 1
  if (mode === 'layer1' || mode === 'server1') {
    try {
      const res1 = await scrapeLayer1(cleanUrl, platform);
      return formatResult(res1, 1, 'Layer 1 [Scraper Utama]', cleanUrl, platform, nowIso);
    } catch (e) {
      throw new Error(`[Force Layer 1 Gagal] ${e.message}`);
    }
  }

  // 2. Force Layer 2
  if (mode === 'layer2' || mode === 'server2') {
    try {
      const res2 = await scrapeLayer2(cleanUrl, platform);
      return formatResult(res2, 2, 'Layer 2 [OmniGet Secondary Engine]', cleanUrl, platform, nowIso);
    } catch (e) {
      throw new Error(`[Force Layer 2 Gagal] ${e.message}`);
    }
  }

  // 3. Force Layer 3
  if (mode === 'layer3' || mode === 'server3') {
    try {
      const res3 = await scrapeLayer3(cleanUrl, 'server3');
      return formatResult(res3, 3, 'Layer 3 [Multi-Server Mirror Engine]', cleanUrl, platform, nowIso);
    } catch (e) {
      throw new Error(`[Force Layer 3 Gagal] ${e.message}`);
    }
  }

  // 4. Mode AUTO: 3-Layer Cascading Fallback
  // Lapis 1: Scraper Utama
  try {
    const res1 = await scrapeLayer1(cleanUrl, platform);
    if (res1 && ((res1.downloads && res1.downloads.length > 0) || (res1.slides && res1.slides.length > 0))) {
      return formatResult(res1, 1, 'Layer 1 [Scraper Utama]', cleanUrl, platform, nowIso);
    }
    err1 = 'Tidak ada link unduhan yang dihasilkan oleh Scraper Utama.';
  } catch (e) {
    err1 = e.message;
  }

  // Lapis 2: OmniGet Secondary Engine
  try {
    const res2 = await scrapeLayer2(cleanUrl, platform);
    if (res2 && ((res2.downloads && res2.downloads.length > 0) || (res2.slides && res2.slides.length > 0))) {
      const result = formatResult(res2, 2, 'Layer 2 [OmniGet Secondary Engine]', cleanUrl, platform, nowIso);
      result.errors = { layer1: err1, layer2: null, layer3: null };
      return result;
    }
    err2 = 'Tidak ada link unduhan yang dihasilkan oleh Scraper Layer 2.';
  } catch (e) {
    err2 = e.message;
  }

  // Lapis 3: Multi-Server Mirror Engine
  try {
    const res3 = await scrapeLayer3(cleanUrl, 'auto');
    if (res3 && ((res3.downloads && res3.downloads.length > 0) || (res3.slides && res3.slides.length > 0))) {
      const result = formatResult(res3, 3, 'Layer 3 [Multi-Server Mirror Engine]', cleanUrl, platform, nowIso);
      result.errors = { layer1: err1, layer2: err2, layer3: null };
      return result;
    }
    err3 = 'Semua server cermin OmniGet tidak menghasilkan file unduhan.';
  } catch (e) {
    err3 = e.message;
  }

  // JIKA SEMUA 3 LAPIS GAGAL
  const errorReport =
    `❌ *Download Gagal di Semua 3 Lapis Scraper*\n\n` +
    `1️⃣ *Lapis 1 (Scraper Utama):* ${err1 || 'Gagal mengekstrak'}\n` +
    `2️⃣ *Lapis 2 (OmniGet Secondary):* ${err2 || 'Gagal mengekstrak'}\n` +
    `3️⃣ *Lapis 3 (Multi-Server Mirror):* ${err3 || 'Gagal mengekstrak'}\n\n` +
    `💡 _Saran: Pastikan link bersifat publik (bukan private), atau pilih server scraper secara manual di Web Dashboard._`;

  return {
    success: false,
    error: 'Semua 3 lapis scraper gagal mengunduh media.',
    errorReport,
    errors: {
      layer1: err1,
      layer2: err2,
      layer3: err3,
    },
    platform,
    url: cleanUrl,
  };
}

module.exports = {
  detectPlatform,
  analyzeUrl,
  analyzeThreeTier,
  scrapeLayer1,
  scrapeLayer2,
  scrapeLayer3,
  getServersRegistry,
  scrapeFxTwitter,
  MORI_VERSION,
  MORI_SCRAPER_CORE,
};
