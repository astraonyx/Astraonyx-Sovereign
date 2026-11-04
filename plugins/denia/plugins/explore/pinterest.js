import path from 'path'
import * as cheerio from 'cheerio'
import { createRequire } from 'module'
import { shuffleArray } from '../../lib/Utilities.js'

const require = createRequire(import.meta.url)
const { isPinterestUrl, scrapePinterest } = require(path.join(process.cwd(), 'lib/pinterestScraper.js'))

async function searchPinterestImages(query) {
   const res = await fetch(`https://wallpaperscraft.com/search/?query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
   })
   if (!res.ok) return []
   const html = await res.text()
   const $ = cheerio.load(html)
   const images = []
   $('.wallpapers__item').each((i, el) => {
      const img = $(el).find('img.wallpapers__image').attr('src')
      if (img) {
         images.push({
            type: 'image',
            images_url: img.replace(/300x168/, '1280x720')
         })
      }
   })
   return images
}

export default {
   command: 'pinimg',
   hidden: 'pins',
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Fern x Stark\nAtau kirim link pin: ${isPrefix + command} https://pin.it/...`)
         m.react('🕒')

         if (isPinterestUrl(text)) {
            const res = await scrapePinterest(text)
            if (!res.success || !res.downloads?.length)
               return m.reply('❌ ' + (res.error || 'Failed to download Pinterest media.'))

            const firstMedia = res.downloads[0]
            if (firstMedia.type === 'video') {
               return sock.sendMedia(m.chat, firstMedia.url, res.title, m, { video: true })
            } else {
               return sock.sendMedia(m.chat, firstMedia.url, res.title, m)
            }
         }

         const results = await searchPinterestImages(text)
         if (!results.length)
            return m.reply('❌ No images found for this query.')

         const album = shuffleArray(results).slice(0, 3)
         if (album.length === 1) {
            return sock.sendMedia(m.chat, album[0].images_url, `📌 *Pinterest*: ${text}`, m)
         }

         sock.sendMessage(m.chat, {
            album: album.map((media) => ({
               image: {
                  url: media.images_url
               }
            }))
         }, {
            quoted: m
         })
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}