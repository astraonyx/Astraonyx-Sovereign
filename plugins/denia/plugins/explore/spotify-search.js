import { isJidNewsletter } from '@sairidev/baileys-new'
import { yts } from '../../lib/Scraper.js'
import { fetchAsBuffer, frame } from '../../lib/Utilities.js'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { scrapeYouTube } = require(path.resolve('./lib/youtubeScraper.js'))

export default {
   command: 'spotsearch',
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const keyCache = m.sender + 'spotify-search'
         const userPreviousResult = ExploreSession.get(keyCache)
         if (
            text &&
            !isNaN(text) &&
            userPreviousResult
         ) {
            const result = userPreviousResult[Number(text) - 1]
            if (!result)
               return m.reply(`❌ Nomor pilihan tidak valid.`)
            m.react('🕒')
            
            const ytData = await scrapeYouTube(result.url)
            const audioItem = ytData?.downloads?.find(d => d.type.includes('MP3')) || ytData?.downloads?.[0]
            if (!audioItem?.url)
               return m.reply('❌ Gagal mengunduh audio.')

            const printMessage = frame('SPOTIFY MUSIC', [
               `*Title*: ${result.title}`,
               `*Artist*: ${result.author?.name || 'Artist'}`,
               `*Duration*: ${result.timestamp || 'Unknown'}`
            ], '🎵')

            await m.reply(printMessage, {
               title: result.title,
               description: 'Artist: ' + (result.author?.name || 'Artist'),
               thumbnail: await fetchAsBuffer(result.thumbnail || botThumbnail),
               thumbnailUrl: result.url,
               largeThumbnail: true
            })

            await sock.sendMedia(m.chat, audioItem.url, '', m, {
               audio: true,
               ptt: isJidNewsletter(m.chat)
            })
         }
         else {
            if (!text)
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} heat abnormal`)
            m.react('🕒')
            
            const searchData = await yts(text)
            const list = (searchData?.videos || searchData?.all || []).slice(0, 10)
            if (!list.length)
               return m.reply('❌ Lagu tidak ditemukan.')

            const flattedResult = list.flatMap((result, index, array) => {
               const lines = [
                  `${index + 1}. ${result.title}`,
                  `*Artist*: ${result.author?.name || 'Artist'} • *Duration*: ${result.timestamp || '0:00'}`
               ]
               if (index !== array.length - 1)
                  lines.push('')
               return lines
            })

            const printHowTo = frame('CARA AMBIL', [
               `Ketik: \`${isPrefix + command} <nomor>\``,
               `*Contoh*: ${isPrefix + command} 1`
            ], '📄')

            const printList = frame('SPOTIFY SEARCH', flattedResult, '🎶')
            ExploreSession.set(keyCache, list)
            m.reply(printHowTo + '\n\n' + printList)
         }
      }
      catch (error) {
         console.error('[spotsearch] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}