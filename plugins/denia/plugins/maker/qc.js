import { fetchAsBuffer } from '../../lib/Utilities.js'

export default {
   command: 'qc',
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
         if (text.length > 150)
            return m.reply('❌ Maximum 150 characters.')
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE, SANS_32_WHITE } = await import('jimp/fonts')
         const fontSmall = await loadFont(SANS_16_WHITE)
         const fontMessage = await loadFont(text.length > 40 ? SANS_16_WHITE : SANS_32_WHITE)

         // Calculate bubble dimensions
         const width = 512
         const height = 260
         const img = new Jimp({ width, height, color: 0x00000000 })

         const bubbleX = 100
         const bubbleY = 20
         const bubbleW = 395
         const bubbleH = 210

         // Draw rounded dark WhatsApp bubble
         for (let y = bubbleY; y < bubbleY + bubbleH; y++) {
            for (let x = bubbleX; x < bubbleX + bubbleW; x++) {
               const cornerRadius = 14
               const isTopLeft = x < bubbleX + cornerRadius && y < bubbleY + cornerRadius
               const isTopRight = x > bubbleX + bubbleW - cornerRadius && y < bubbleY + cornerRadius
               const isBottomLeft = x < bubbleX + cornerRadius && y > bubbleY + bubbleH - cornerRadius
               const isBottomRight = x > bubbleX + bubbleW - cornerRadius && y > bubbleY + bubbleH - cornerRadius

               let draw = true
               if (isTopLeft) {
                  const dx = x - (bubbleX + cornerRadius)
                  const dy = y - (bubbleY + cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isTopRight) {
                  const dx = x - (bubbleX + bubbleW - cornerRadius)
                  const dy = y - (bubbleY + cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isBottomLeft) {
                  const dx = x - (bubbleX + cornerRadius)
                  const dy = y - (bubbleY + bubbleH - cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               } else if (isBottomRight) {
                  const dx = x - (bubbleX + bubbleW - cornerRadius)
                  const dy = y - (bubbleY + bubbleH - cornerRadius)
                  if (dx * dx + dy * dy > cornerRadius * cornerRadius) draw = false
               }

               if (draw) {
                  img.setPixelColor(0x202C33FF, x, y)
               }
            }
         }

         // Avatar circle
         const avatarSize = 64
         const cx = 52
         const cy = 55
         const r = avatarSize / 2

         let avatarDrawn = false
         try {
            const ppUrl = await sock.profilePicture(m.sender)
            if (ppUrl) {
               const ppBuf = await fetchAsBuffer(ppUrl)
               const ppImg = await Jimp.read(ppBuf)
               ppImg.cover({ w: avatarSize, h: avatarSize })
               // Circle mask
               ppImg.scan(0, 0, avatarSize, avatarSize, function(x, y, idx) {
                  const dx = x - r
                  const dy = y - r
                  if (dx * dx + dy * dy > r * r) {
                     this.bitmap.data[idx + 3] = 0
                  }
               })
               img.composite(ppImg, 20, 23)
               avatarDrawn = true
            }
         } catch {}

         if (!avatarDrawn) {
            for (let dy = -r; dy <= r; dy++) {
               for (let dx = -r; dx <= r; dx++) {
                  if (dx * dx + dy * dy <= r * r) {
                     img.setPixelColor(0x00A884FF, cx + dx, cy + dy)
                  }
               }
            }
         }

         // Sender name (highlighted color)
         const senderName = m.pushName || m.sender?.split('@')[0] || 'User'
         img.print({
            font: fontSmall,
            x: bubbleX + 18,
            y: bubbleY + 14,
            text: `~ ${senderName}`
         })

         // Quoted message text
         img.print({
            font: fontMessage,
            x: bubbleX + 18,
            y: bubbleY + 48,
            text,
            maxWidth: bubbleW - 36
         })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error('[qc] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}