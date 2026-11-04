import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'wanted',
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
         const { SANS_32_BLACK, SANS_16_BLACK } = await import('jimp/fonts')
         
         const fontBig = await loadFont(SANS_32_BLACK)
         const fontSmall = await loadFont(SANS_16_BLACK)

         const posterW = 400
         const posterH = 550
         const poster = new Jimp({ width: posterW, height: posterH, color: 0xE8D5B5FF })

         // Vintage border
         for (let x = 15; x < posterW - 15; x++) {
            for (let dy = 0; dy < 3; dy++) {
               poster.setPixelColor(0x3B250BFF, x, 15 + dy)
               poster.setPixelColor(0x3B250BFF, x, posterH - 18 + dy)
            }
         }
         for (let y = 15; y < posterH - 15; y++) {
            for (let dx = 0; dx < 3; dx++) {
               poster.setPixelColor(0x3B250BFF, 15 + dx, y)
               poster.setPixelColor(0x3B250BFF, posterW - 18 + dx, y)
            }
         }

         poster.print({
            font: fontBig,
            x: 0,
            y: 30,
            text: { text: 'W A N T E D', alignmentX: HorizontalAlign.CENTER },
            maxWidth: posterW
         })

         poster.print({
            font: fontSmall,
            x: 0,
            y: 75,
            text: { text: 'DEAD OR ALIVE', alignmentX: HorizontalAlign.CENTER },
            maxWidth: posterW
         })

         // User photo in center
         const photo = await Jimp.read(rawBuffer)
         photo.cover({ w: 280, h: 280 })
         photo.sepia()
         poster.composite(photo, 60, 110)

         poster.print({
            font: fontBig,
            x: 0,
            y: 410,
            text: { text: 'REWARD', alignmentX: HorizontalAlign.CENTER },
            maxWidth: posterW
         })

         poster.print({
            font: fontSmall,
            x: 0,
            y: 460,
            text: { text: '$ 1,000,000', alignmentX: HorizontalAlign.CENTER },
            maxWidth: posterW
         })

         const outputBuffer = await poster.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error('[wanted] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}