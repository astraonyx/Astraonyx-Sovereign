import { isJidNewsletter } from '@sairidev/baileys-new'
import { yts } from '../../lib/Scraper.js'
import { fetchAsBuffer, frame } from '../../lib/Utilities.js'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { scrapeSpotify, isSpotifyUrl } = require(path.resolve('./lib/spotifyScraper.js'))
const { scrapeYouTube } = require(path.resolve('./lib/youtubeScraper.js'))

export default {
   command: 'spotplay',
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} abnormal heat`)
         m.react('🕒')

         if (isSpotifyUrl(text)) {
            const res = await scrapeSpotify(text)
            if (!res || !res.success || !res.audioUrl)
               return m.reply('❌ ' + (res?.error || 'Gagal mengambil lagu Spotify.'))
            const printMessage = frame('SPOTIFY', [
               `*Title*: ${res.title || 'Track'}`,
               `*Artist*: ${res.artist || 'Spotify Artist'}`
            ], '🎵')
            await m.reply(printMessage)
            return await sock.sendMedia(m.chat, res.audioUrl, '', m, {
               audio: true,
               ptt: isJidNewsletter(m.chat)
            })
         }

         // Search by song name via yts
         const ytSearchRes = await yts(text + ' audio')
         const video = ytSearchRes?.videos?.[0] || ytSearchRes?.all?.[0]
         if (!video)
            return m.reply('❌ Lagu tidak ditemukan.')

         const ytData = await scrapeYouTube(video.url)
         const audioItem = ytData?.downloads?.find(d => d.type.includes('MP3')) || ytData?.downloads?.[0]
         if (!audioItem?.url)
            return m.reply('❌ Gagal mengunduh audio.')

         const printMessage = frame('SPOTIFY PLAY', [
            `*Title*: ${video.title}`,
            `*Duration*: ${video.timestamp || 'Unknown'}`,
            `*Author*: ${video.author?.name || 'Artist'}`
         ], '🎵')

         await m.reply(printMessage, {
            title: video.title,
            description: video.author?.name || 'Artist',
            thumbnail: await fetchAsBuffer(video.thumbnail || botThumbnail),
            thumbnailUrl: video.url,
            largeThumbnail: true
         })

         await sock.sendMedia(m.chat, audioItem.url, '', m, {
            audio: true,
            ptt: isJidNewsletter(m.chat)
         })
      }
      catch (error) {
         console.error('[spotplay] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}