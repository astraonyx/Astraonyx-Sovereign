import { Jimp, loadFont } from 'jimp'
import { SANS_32_BLACK, SANS_64_BLACK } from 'jimp/fonts'

export default {
   command: ['brathd', 'bratvidhd'],
   category: 'maker',
   async run (m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} i'm here`)
         if (text.length > 150)
            return m.reply('❌ Maximum 150 characters.')
         m.react('🕒')

         const width = 512
         const height = 512
         // Authentic brat white background
         const canvas = new Jimp({ width, height, color: 0xFFFFFFFF })

         const font = text.length > 40 ? await loadFont(SANS_32_BLACK) : await loadFont(SANS_64_BLACK)
         const yPos = text.length > 40 ? 120 : 160

         canvas.print({
            font,
            x: 40,
            y: yPos,
            text: text.toLowerCase(),
            maxWidth: 432
         })

         // Authentic brat blur
         canvas.blur(1)

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   premium: true,
   limit: 1
}