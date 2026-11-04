import { Jimp } from 'jimp'
import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'removewm',
   hidden: 'nowatermark',
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
            return m.reply('💭 Provide an image or reply to an image to remove watermark.')
         m.react('🕒')

         const buffer = await q.download()
         if (!buffer || !Buffer.isBuffer(buffer))
            return m.reply('❌ Failed to download image.')

         const image = await Jimp.read(buffer)
         const w = image.bitmap.width
         const h = image.bitmap.height

         // Watermarks are standardly located at the lower border/corner.
         // Crop out the lower 7% of height cleanly
         const croppedH = Math.max(10, Math.floor(h * 0.93))
         image.crop({ x: 0, y: 0, w, h: croppedH })

         const outBuffer = await image.getBuffer('image/png')
         await sock.sendMedia(m.chat, outBuffer, '✨ *Watermark Removed*', m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   premium: true,
   limit: 1
}