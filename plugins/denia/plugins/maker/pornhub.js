export default {
   command: 'pornhub',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const [text1 = '', text2 = ''] = text ? text.split('|').map(s => s.trim()) : ['', '']
         if (!text1 || !text2)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Star | seed`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_32_WHITE, SANS_32_BLACK } = await import('jimp/fonts')

         const fontWhite = await loadFont(SANS_32_WHITE)
         const fontBlack = await loadFont(SANS_32_BLACK)

         const w1 = Math.max(text1.length * 18 + 10, 40)
         const w2 = Math.max(text2.length * 18 + 24, 60)
         const totalW = w1 + w2 + 80
         const totalH = 140

         const img = new Jimp({ width: totalW, height: totalH, color: 0x000000FF })

         // Text 1 in white
         img.print({ font: fontWhite, x: 35, y: 50, text: text1 })

         // Orange badge #FF9900 for text2
         const badgeX = 35 + w1 + 6
         const badgeY = 44
         const badgeW = w2
         const badgeH = 50

         for (let y = badgeY; y < badgeY + badgeH; y++) {
            for (let x = badgeX; x < badgeX + badgeW; x++) {
               const cornerRadius = 8
               const isTopLeft = x < badgeX + cornerRadius && y < badgeY + cornerRadius
               const isTopRight = x > badgeX + badgeW - cornerRadius && y < badgeY + cornerRadius
               const isBottomLeft = x < badgeX + cornerRadius && y > badgeY + badgeH - cornerRadius
               const isBottomRight = x > badgeX + badgeW - cornerRadius && y > badgeY + badgeH - cornerRadius

               let draw = true
               if (isTopLeft) {
                  const dx = x - (badgeX + cornerRadius)
                  const dy = y - (badgeY + cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isTopRight) {
                  const dx = x - (badgeX + badgeW - cornerRadius)
                  const dy = y - (badgeY + cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isBottomLeft) {
                  const dx = x - (badgeX + cornerRadius)
                  const dy = y - (badgeY + badgeH - cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isBottomRight) {
                  const dx = x - (badgeX + badgeW - cornerRadius)
                  const dy = y - (badgeY + badgeH - cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               }

               if (draw) {
                  img.setPixelColor(0xFF9900FF, x, y)
               }
            }
         }

         // Text 2 in black inside badge
         img.print({ font: fontBlack, x: badgeX + 12, y: 50, text: text2 })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[pornhub] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}