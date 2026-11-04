import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE, SANS_16_BLACK } from 'jimp/fonts'
import { randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakexnxx',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const parts = (text || '').split('|')
         const caption = (parts[0] || 'Viral Video 2026').trim()
         const name = (parts[1] || m.pushName || 'Creator').trim()

         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Step sister help | sairidev`)
         m.react('🕒')

         const width = 800
         const height = 450
         // Dark video player screen #121212
         const canvas = new Jimp({ width, height, color: 0x121212FF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Play button (gold circle in center)
         const playSize = 90
         const playCircle = new Jimp({ width: playSize, height: playSize, color: 0xF59E0BFF })
         playCircle.circle()
         const px = Math.floor((width - playSize) / 2)
         const py = 150
         canvas.composite(playCircle, px, py)

         const fontLargeBlack = await loadFont(SANS_32_WHITE)
         canvas.print({
            font: fontLarge,
            x: px + 36,
            y: py + 26,
            text: '>'
         })

         // Video Title
         canvas.print({
            font: fontLarge,
            x: 40,
            y: 40,
            text: caption.length > 42 ? caption.slice(0, 42) + '...' : caption,
            maxWidth: 720
         })

         // Duration badge (bottom right of thumbnail)
         const durPill = new Jimp({ width: 80, height: 28, color: 0x000000CC })
         canvas.composite(durPill, 680, 270)
         canvas.print({
            font: fontSmall,
            x: 698,
            y: 275,
            text: '12:45'
         })

         // Bottom meta info
         const metaBox = new Jimp({ width: 720, height: 90, color: 0x1E1E1EFF })
         canvas.composite(metaBox, 40, 320)

         canvas.print({
            font: fontSmall,
            x: 60,
            y: 335,
            text: `Uploader: ${name}  |  Duration: 12:45`
         })

         const views = randomInteger(120, 980)
         const rating = randomInteger(92, 99)
         canvas.print({
            font: fontSmall,
            x: 60,
            y: 370,
            text: `Views: ${views},420  •  Rating: ${rating}%  •  Full HD 1080p`
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `🎬 *Video Mockup: ${caption}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}