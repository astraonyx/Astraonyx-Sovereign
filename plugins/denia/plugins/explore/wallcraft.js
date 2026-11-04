import * as cheerio from 'cheerio'
import { frame } from '../../lib/Utilities.js'

async function searchWallcraft(query) {
   const res = await fetch(`https://wallpaperscraft.com/search/?query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
   })
   if (!res.ok) return []
   const html = await res.text()
   const $ = cheerio.load(html)
   const items = []
   $('.wallpapers__item').each((i, el) => {
      const img = $(el).find('img.wallpapers__image').attr('src')
      const tags = $(el).find('.wallpapers__info').text().trim()
      if (img) {
         const highRes = img.replace(/300x168/, '1280x720')
         items.push({
            id: `Wallpaper ${i + 1}`,
            tags: tags ? tags.split(/\s*,\s*/) : [query],
            url: highRes,
            description: `🎨 *Wallcraft*: ${tags || query}`
         })
      }
   })
   return items
}

export default {
   command: 'wallcraft',
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const keyCache = m.sender + 'wallcraft'
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
            sock.sendMedia(m.chat, result.url, result.description, m)
         }
         else {
            if (!text)
               return m.reply(`👉🏻 *Example*: ${isPrefix + command} nature`)
            m.react('🕒')
            const list = await searchWallcraft(text)
            if (!list.length)
               return m.reply('❌ No wallpapers found.')

            const flattedResult = list.flatMap((result, index, array) => {
               const lines = [
                  `${index + 1}. ${result.id}`,
                  `*Tags*: ${result.tags.join(', ')}`
               ]
               if (index !== array.length - 1)
                  lines.push('')
               return lines
            })
            const printHowTo = frame('HOW TO GET', [
               `To download wallpaper use \`${isPrefix + command} <number>\` command`,
               `*Example*: ${isPrefix + command} 1`
            ], '📄')
            const printList = frame('WALLCRAFT', flattedResult, '🖼️')
            ExploreSession.set(keyCache, list)
            m.reply(printHowTo + '\n\n' + printList)
         }
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}