import path from 'path'
import { createRequire } from 'module'
import { frame, resizeImage } from '../../lib/Utilities.js'

const require = createRequire(import.meta.url)
const { isTikTokUrl, scrapeTikTok } = require(path.join(process.cwd(), 'lib/tiktokScraper.js'))

export default {
   command: 'ttphoto',
   category: 'explore',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} https://vt.tiktok.com/...`)
         m.react('🕒')

         if (isTikTokUrl(text)) {
            const data = await scrapeTikTok(text)
            if (!data.success || !data.downloads?.length)
               return m.reply('❌ ' + (data.error || 'Failed to download TikTok slide photos.'))

            const photoDownloads = data.downloads.filter(d => d.type.toLowerCase().includes('foto') || d.type.toLowerCase().includes('photo') || d.type.toLowerCase().includes('slide'))
            const audioDownload = data.downloads.find(d => d.type.toLowerCase().includes('audio') || d.type.toLowerCase().includes('mp3'))

            if (photoDownloads.length === 0) {
               // If no explicit photo slides, download whatever media is available
               const first = data.downloads[0]
               return sock.sendMedia(m.chat, first.url, data.title || 'TikTok Media', m)
            }

            if (photoDownloads.length === 1) {
               await sock.sendMedia(m.chat, photoDownloads[0].url, data.title || 'TikTok Photo', m)
            } else {
               const album = photoDownloads.map(p => ({
                  image: { url: p.url }
               }))
               await sock.sendMessage(m.chat, { album }, { quoted: m })
            }

            if (audioDownload?.url) {
               await sock.sendMedia(m.chat, audioDownload.url, '', m, { audio: true })
            }
            return
         }

         m.reply(`💡 Masukkan link postingan foto TikTok yang ingin diunduh:\n*Contoh*: ${isPrefix + command} https://vt.tiktok.com/...`)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}