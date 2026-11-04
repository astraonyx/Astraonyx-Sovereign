import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'smeme',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeImage(mimetype))
            return m.reply('💭 Provide an image to create sticker.')
         const [top = '', bottom = ''] = text ? text.split('|').map(s => s.trim()) : ['', '']
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} top text | bottom text`)
         m.react('🕒')
         
         const buffer = await q.download()
         const { Jimp, loadFont, HorizontalAlign } = await import('jimp')
         const { SANS_32_WHITE, SANS_32_BLACK } = await import('jimp/fonts')
         
         const fontWhite = await loadFont(SANS_32_WHITE)
         const fontBlack = await loadFont(SANS_32_BLACK)

         const img = await Jimp.read(buffer)
         // Resize to standard sticker box 512x512
         img.cover({ w: 512, h: 512 })
         const w = 512
         const h = 512

         const printCentered = (t, y) => {
            if (!t) return
            const offsets = [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -2], [0, 2], [-2, 0], [2, 0]]
            for (const [ox, oy] of offsets) {
               img.print({
                  font: fontBlack,
                  x: ox,
                  y: y + oy,
                  text: { text: t.toUpperCase(), alignmentX: HorizontalAlign.CENTER },
                  maxWidth: w
               })
            }
            img.print({
               font: fontWhite,
               x: 0,
               y: y,
               text: { text: t.toUpperCase(), alignmentX: HorizontalAlign.CENTER },
               maxWidth: w
            })
         }

         if (top) printCentered(top, 16)
         if (bottom) printCentered(bottom, h - 60)

         const memePng = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, memePng, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error('[smeme] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}