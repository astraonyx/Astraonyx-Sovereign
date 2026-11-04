import { Jimp, loadFont } from 'jimp'
import { SANS_64_BLACK, SANS_16_BLACK } from 'jimp/fonts'

export default {
   command: 'balogo',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Blue | Archive`)
         m.react('🕒')

         const parts = text.includes('|') ? text.split('|') : text.split(' ')
         const leftText = (parts[0] || 'Blue').trim()
         const rightText = (parts.slice(1).join(' ') || 'Archive').trim()

         const fontLarge = await loadFont(SANS_64_BLACK)
         const fontSmall = await loadFont(SANS_16_BLACK)

         const width = 850
         const height = 350

         // Clean white background
         const canvas = new Jimp({ width, height, color: 0xFFFFFFFF })

         // Cyan-blue accent halo circle on top right of left text
         const halo = new Jimp({ width: 60, height: 60, color: 0x1289F5FF })
         halo.circle()
         canvas.composite(halo, 370, 70)

         const innerHalo = new Jimp({ width: 44, height: 44, color: 0xFFFFFFFF })
         innerHalo.circle()
         canvas.composite(innerHalo, 378, 78)

         // Draw left text in a blue mask canvas
         const leftCanvas = new Jimp({ width: 400, height: 120, color: 0x00000000 })
         leftCanvas.print({
            font: fontLarge,
            x: 10,
            y: 20,
            text: leftText
         })
         // Colorize text pixels to BlueArchive Cyan-Blue #1289F5
         leftCanvas.scan(0, 0, leftCanvas.bitmap.width, leftCanvas.bitmap.height, (x, y, idx) => {
            const a = leftCanvas.bitmap.data[idx + 3]
            if (a > 30) {
               leftCanvas.bitmap.data[idx] = 18       // R
               leftCanvas.bitmap.data[idx + 1] = 137  // G
               leftCanvas.bitmap.data[idx + 2] = 245  // B
            }
         })

         // Draw right text in dark charcoal #2b2d42
         const rightCanvas = new Jimp({ width: 400, height: 120, color: 0x00000000 })
         rightCanvas.print({
            font: fontLarge,
            x: 10,
            y: 20,
            text: rightText
         })

         // Composite both parts onto canvas
         canvas.composite(leftCanvas, 60, 110)
         canvas.composite(rightCanvas, 420, 110)

         // Bottom accent line
         const line = new Jimp({ width: 730, height: 4, color: 0x1289F5FF })
         canvas.composite(line, 60, 240)

         // Small sub-label
         canvas.print({
            font: fontSmall,
            x: 65,
            y: 255,
            text: 'SCHALE RECREATION DEPARTMENT • BLUE ARCHIVE'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, '✨ *Blue Archive Logo*', m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}