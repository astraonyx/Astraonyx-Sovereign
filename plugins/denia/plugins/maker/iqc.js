export default {
   command: 'iqc',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} hello`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE, SANS_32_WHITE } = await import('jimp/fonts')
         const font = await loadFont(text.length > 35 ? SANS_16_WHITE : SANS_32_WHITE)

         const width = 512
         const height = 220
         const img = new Jimp({ width, height, color: 0x00000000 })

         const bubbleX = 60
         const bubbleY = 25
         const bubbleW = 420
         const bubbleH = 170

         // iMessage iOS Blue Bubble #007AFF
         for (let y = bubbleY; y < bubbleY + bubbleH; y++) {
            for (let x = bubbleX; x < bubbleX + bubbleW; x++) {
               const r = 22
               const isTL = x < bubbleX + r && y < bubbleY + r
               const isTR = x > bubbleX + bubbleW - r && y < bubbleY + r
               const isBL = x < bubbleX + r && y > bubbleY + bubbleH - r
               const isBR = x > bubbleX + bubbleW - r && y > bubbleY + bubbleH - r
               let ok = true
               if (isTL && (x - (bubbleX + r)) ** 2 + (y - (bubbleY + r)) ** 2 > r * r) ok = false
               if (isTR && (x - (bubbleX + bubbleW - r)) ** 2 + (y - (bubbleY + r)) ** 2 > r * r) ok = false
               if (isBL && (x - (bubbleX + r)) ** 2 + (y - (bubbleY + bubbleH - r)) ** 2 > r * r) ok = false
               if (isBR && (x - (bubbleX + bubbleW - r)) ** 2 + (y - (bubbleY + bubbleH - r)) ** 2 > r * r) ok = false
               if (ok) img.setPixelColor(0x007AFFFF, x, y)
            }
         }

         img.print({
            font,
            x: bubbleX + 24,
            y: bubbleY + 30,
            text,
            maxWidth: bubbleW - 48
         })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error('[iqc] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}