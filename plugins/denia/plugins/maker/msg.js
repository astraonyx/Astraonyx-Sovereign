export default {
   command: 'msg',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const [message = '', title = 'Warning', icon = 'error'] = text ? text.split('|').map(s => s.trim()) : ['', 'Warning', 'error']
         if (!message)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} hello | Notify | error`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE, SANS_16_BLACK } = await import('jimp/fonts')
         const fontWhite = await loadFont(SANS_16_WHITE)
         const fontBlack = await loadFont(SANS_16_BLACK)

         const w = 440
         const h = Math.max(180, Math.min(300, 140 + Math.ceil(message.length / 28) * 20))
         const img = new Jimp({ width: w, height: h, color: 0xF0F0F0FF })

         // Title bar #0055EA
         for (let y = 1; y < 32; y++) {
            for (let x = 1; x < w - 1; x++) {
               img.setPixelColor(0x0055EAFF, x, y)
            }
         }

         // Border
         for (let x = 0; x < w; x++) {
            img.setPixelColor(0x0055EAFF, x, 0)
            img.setPixelColor(0x999999FF, x, h - 1)
         }
         for (let y = 0; y < h; y++) {
            img.setPixelColor(0x0055EAFF, 0, y)
            img.setPixelColor(0x999999FF, w - 1, y)
         }

         // Title text & close button
         img.print({ font: fontWhite, x: 12, y: 7, text: title || 'Notice' })
         img.print({ font: fontWhite, x: w - 24, y: 7, text: 'X' })

         // Icon
         const icX = 42, icY = 72, r = 18
         const isWarn = icon.toLowerCase().includes('warn')
         const icColor = isWarn ? 0xFFC000FF : 0xE81123FF
         for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
               if (dx * dx + dy * dy <= r * r) {
                  img.setPixelColor(icColor, icX + dx, icY + dy)
               }
            }
         }
         img.print({ font: fontWhite, x: icX - 5, y: icY - 9, text: isWarn ? '!' : 'X' })

         // Message body
         img.print({ font: fontBlack, x: 75, y: 55, text: message, maxWidth: w - 95 })

         // [ OK ] button
         const btnW = 80, btnH = 28
         const btnX = Math.floor((w - btnW) / 2)
         const btnY = h - 42
         for (let y = btnY; y < btnY + btnH; y++) {
            for (let x = btnX; x < btnX + btnW; x++) {
               const isB = x === btnX || x === btnX + btnW - 1 || y === btnY || y === btnY + btnH - 1
               img.setPixelColor(isB ? 0x0078D7FF : 0xE1E1E1FF, x, y)
            }
         }
         img.print({ font: fontBlack, x: btnX + 28, y: btnY + 5, text: 'OK' })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[msg] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}