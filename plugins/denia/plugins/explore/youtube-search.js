import path from 'path'
import { isJidNewsletter } from '@sairidev/baileys-new'
import { createRequire } from 'module'
import { yts } from '../../lib/Scraper.js'
import { frame, formatNumber } from '../../lib/Utilities.js'

const require = createRequire(import.meta.url)
const { scrapeYouTube } = require(path.join(process.cwd(), 'lib/youtubeScraper.js'))

export default {
   command: 'ytsearch',
   hidden: ['yts', 'ytsa', 'ytsv'],
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const keyCache = m.sender + 'youtube-search'
         const userPreviousResult = ExploreSession.get(keyCache)
         if (
            text &&
            !isNaN(text) &&
            userPreviousResult
         ) {
            const result = userPreviousResult[Number(text) - 1]
            if (!result)
               return m.reply(`❌ Invalid input.`)
            m.react('🕒')
            if (result.seconds > 1440)
               return m.reply('❌ Video is too long. Maximum duration is 24 minutes.')
            const shouldAsAudio = command === 'ytsa'

            const ytData = await scrapeYouTube(result.url)
            if (!ytData.success || !ytData.downloads?.length)
               return m.reply('❌ ' + (ytData.error || 'Failed to download YouTube media.'))

            const matchedMedia = shouldAsAudio
               ? ytData.downloads.find(d => d.type === 'MP3') || ytData.downloads[0]
               : ytData.downloads.find(d => d.type === 'MP4') || ytData.downloads[0]

            if (!matchedMedia?.url)
               return m.reply('❌ Download stream URL not available.')

            sock.sendMedia(m.chat, matchedMedia.url, result.title, m, {
               audio: shouldAsAudio,
               ptt: shouldAsAudio && isJidNewsletter(m.chat)
            })
         }
         else {
            if (!text)
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} abnormal heat`)
            m.react('🕒')
            const data = await yts(text)
            const flattedResult = data.all.flatMap((result, index, array) => {
               const lines = [
                  `${index + 1}. ${result.title}`,
                  `*Views*: ${formatNumber(result.views || 0)}`,
                  `*Duration*: ${result.timestamp || '0:00'}`,
                  `*Uploaded*: ${result.ago || 'Long time ago'}`
               ]
               if (index !== array.length - 1)
                  lines.push('')
               return lines
            })
            const printHowTo = frame('HOW TO GET', [
               `To get the video use \`${isPrefix}ytsv <number>\` command and to get the audio use \`${isPrefix}ytsa <number>\` command`,
               `*Example*: ${isPrefix}ytsv 1`
            ], '📄')
            const printList = frame('YOUTUBE SEARCH', flattedResult, '🎥')
            ExploreSession.set(keyCache, data.all)
            m.reply(printHowTo + '\n\n' +
               printList)
         }
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}