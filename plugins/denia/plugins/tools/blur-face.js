import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'blurface',
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
            return m.reply('💭 Reply/kirim gambar untuk di-blur.')
         m.react('🕒')
         const buffer = await q.download()
         const { Jimp } = await import('jimp')

         const img = await Jimp.read(buffer)
         img.blur(18)

         const outputBuffer = await img.getBuffer('image/jpeg')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[blurface] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}