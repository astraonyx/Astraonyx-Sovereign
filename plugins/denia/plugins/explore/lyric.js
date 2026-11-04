import { frame } from '../../lib/Utilities.js'

export default {
   command: 'lyric',
   hidden: 'lirik',
   category: 'explore',
   async run(m, {
      isPrefix,
      command,
      text
   }) {
      try {
         const keyCache = m.sender + 'lyric'
         const userPreviousResult = ExploreSession.get(keyCache)
         if (
            text &&
            !isNaN(text) &&
            userPreviousResult
         ) {
            const result = userPreviousResult[Number(text) - 1]
            if (!result)
               return m.reply(`❌ Nomor pilihan tidak valid.`)
            m.reply(`🎶 *${result.trackName}* - ${result.artistName}\n\n${result.plainLyrics || result.syncedLyrics || 'Lirik tidak tersedia.'}`)
         }
         else {
            if (!text)
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} Army dreamers`)
            m.react('🕒')

            const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(text)}`, {
               headers: { 'User-Agent': 'PolarisBot/1.0' }
            })
            if (!response.ok)
               return m.reply('❌ Gagal mencari lirik lagu.')

            const results = await response.json()
            if (!Array.isArray(results) || results.length === 0)
               return m.reply('❌ Lirik tidak ditemukan.')

            const validResults = results.filter(r => r.plainLyrics || r.syncedLyrics).slice(0, 10)
            if (!validResults.length)
               return m.reply('❌ Lirik tidak ditemukan.')

            const flattedResult = validResults.flatMap((result, index, array) => {
               const lines = [
                  `${index + 1}. ${result.trackName}`,
                  `*Artist*: ${result.artistName}`
               ]
               if (index !== array.length - 1)
                  lines.push('')
               return lines
            })
            const printHowTo = frame('CARA LIHAT LIRIK', [
               `Ketik: \`${isPrefix + command} <nomor>\``,
               `*Contoh*: ${isPrefix + command} 1`
            ], '📄')
            const printList = frame('DAFTAR LIRIK', flattedResult, '📜')
            ExploreSession.set(keyCache, validResults)
            m.reply(printHowTo + '\n\n' + printList)
         }
      }
      catch (error) {
         console.error('[lyric] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}