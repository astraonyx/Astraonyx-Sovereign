import { fetchAsBuffer } from '../../lib/Utilities.js'

export default {
   command: 'fakefbcomment',
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
         const [comment = '', name = m.pushName || 'User'] = text ? text.split('|').map(s => s.trim()) : ['', '']
         if (!comment)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} excellent! | SairiDev`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_BLACK } = await import('jimp/fonts')
         const font = await loadFont(SANS_16_BLACK)

         const w = 550
         const h = Math.max(140, 95 + Math.ceil(comment.length / 42) * 20)
         const img = new Jimp({ width: w, height: h, color: 0xFFFFFFFF })

         // Avatar circle
         const avatarSize = 44
         const cx = 36
         const cy = 36
         const r = avatarSize / 2

         let avatarDrawn = false
         try {
            let ppUrl
            if (mimetype) {
               const ppBuf = await q.download()
               const ppImg = await Jimp.read(ppBuf)
               ppImg.cover({ w: avatarSize, h: avatarSize })
               ppImg.scan(0, 0, avatarSize, avatarSize, function(x, y, idx) {
                  const dx = x - r
                  const dy = y - r
                  if (dx * dx + dy * dy > r * r) this.bitmap.data[idx + 3] = 0
               })
               img.composite(ppImg, 14, 14)
               avatarDrawn = true
            } else {
               ppUrl = await sock.profilePicture(m.sender)
               if (ppUrl) {
                  const ppBuf = await fetchAsBuffer(ppUrl)
                  const ppImg = await Jimp.read(ppBuf)
                  ppImg.cover({ w: avatarSize, h: avatarSize })
                  ppImg.scan(0, 0, avatarSize, avatarSize, function(x, y, idx) {
                     const dx = x - r
                     const dy = y - r
                     if (dx * dx + dy * dy > r * r) this.bitmap.data[idx + 3] = 0
                  })
                  img.composite(ppImg, 14, 14)
                  avatarDrawn = true
               }
            }
         } catch {}

         if (!avatarDrawn) {
            for (let dy = -r; dy <= r; dy++) {
               for (let dx = -r; dx <= r; dx++) {
                  if (dx * dx + dy * dy <= r * r) img.setPixelColor(0x1877F2FF, cx + dx, cy + dy)
               }
            }
         }

         // FB comment grey bubble #F0F2F5
         const bubbleX = 68, bubbleY = 14, bubbleW = w - 85, bubbleH = h - 45
         for (let y = bubbleY; y < bubbleY + bubbleH; y++) {
            for (let x = bubbleX; x < bubbleX + bubbleW; x++) {
               const cr = 14
               const isTL = x < bubbleX + cr && y < bubbleY + cr
               const isTR = x > bubbleX + bubbleW - cr && y < bubbleY + cr
               const isBL = x < bubbleX + cr && y > bubbleY + bubbleH - cr
               const isBR = x > bubbleX + bubbleW - cr && y > bubbleY + bubbleH - cr
               let ok = true
               if (isTL && (x - (bubbleX + cr)) ** 2 + (y - (bubbleY + cr)) ** 2 > cr * cr) ok = false
               if (isTR && (x - (bubbleX + bubbleW - cr)) ** 2 + (y - (bubbleY + cr)) ** 2 > cr * cr) ok = false
               if (isBL && (x - (bubbleX + cr)) ** 2 + (y - (bubbleY + bubbleH - cr)) ** 2 > cr * cr) ok = false
               if (isBR && (x - (bubbleX + bubbleW - cr)) ** 2 + (y - (bubbleY + bubbleH - cr)) ** 2 > cr * cr) ok = false
               if (ok) img.setPixelColor(0xF0F2F5FF, x, y)
            }
         }

         // Name (Facebook bold)
         img.print({ font, x: bubbleX + 14, y: bubbleY + 8, text: name })
         // Comment
         img.print({ font, x: bubbleX + 14, y: bubbleY + 30, text: comment, maxWidth: bubbleW - 28 })

         // Like • Reply • 2h
         img.print({ font, x: bubbleX + 10, y: h - 25, text: 'Like  •  Reply  •  2h' })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[fakefbcomment] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}