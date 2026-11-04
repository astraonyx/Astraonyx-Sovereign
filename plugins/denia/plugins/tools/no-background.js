import { isMimeImage } from '../../lib/Utilities.js'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { removeBg } = require(path.resolve('./lib/removeBgScraper.js'))

export default {
   command: 'removebg',
   hidden: 'nobackground',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeImage(mimetype))
            return m.reply('💭 Provide an image to remove background.')
         m.react('🕒')
         const buffer = await q.download()
         const result = await removeBg(buffer)
         if (!result || !result.success || !result.imageBuffer)
            return m.reply('❌ ' + (result?.error || 'Gagal menghapus background.'))
         await sock.sendMedia(m.chat, result.imageBuffer, '', m)
      }
      catch (error) {
         console.error('[removebg] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}