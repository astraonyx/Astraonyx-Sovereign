import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'wasted',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeImage(mimetype))
            return m.reply('💭 Provide an image.')
         m.react('🕒')
         
         const rawBuffer = await q.download()
         const { Jimp, loadFont, HorizontalAlign } = await import('jimp')
         const { SANS_64_BLACK, SANS_64_WHITE } = await import('jimp/fonts')
         
         const fontBlack = await loadFont(SANS_64_BLACK)
         const fontWhite = await loadFont(SANS_64_WHITE)

         const img = await Jimp.read(rawBuffer)
         img.greyscale()

         const bandY = Math.floor(img.bitmap.height / 2) - 45
         const bandHeight = 90
         for (let y = Math.max(0, bandY); y < Math.min(img.bitmap.height, bandY + bandHeight); y++) {
            for (let x = 0; x < img.bitmap.width; x++) {
               const idx = (y * img.bitmap.width + x) * 4
               img.bitmap.data[idx] = Math.floor(img.bitmap.data[idx] * 0.3)
               img.bitmap.data[idx + 1] = Math.floor(img.bitmap.data[idx + 1] * 0.3)
               img.bitmap.data[idx + 2] = Math.floor(img.bitmap.data[idx + 2] * 0.3)
            }
         }

         img.print({
            font: fontBlack,
            x: 2,
            y: bandY + 14,
            text: { text: 'W A S T E D', alignmentX: HorizontalAlign.CENTER },
            maxWidth: img.bitmap.width
         })
         img.print({
            font: fontWhite,
            x: 0,
            y: bandY + 12,
            text: { text: 'W A S T E D', alignmentX: HorizontalAlign.CENTER },
            maxWidth: img.bitmap.width
         })

         const outputBuffer = await img.getBuffer('image/jpeg')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[wasted] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}