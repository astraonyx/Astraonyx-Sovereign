import { fetchAsBuffer } from '../../lib/Utilities.js'

export default {
   command: 'fakettcomment',
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
         const [comment = '', date = '1 m', username = m.pushName || 'user'] = text ? text.split('|').map(s => s.trim()) : ['', '1 m', '']
         if (!comment)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} ok! | 1 m | @sairidev`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE } = await import('jimp/fonts')
         const font = await loadFont(SANS_16_WHITE)

         const w = 550
         const h = Math.max(130, 85 + Math.ceil(comment.length / 40) * 20)
         // TikTok dark background #121212
         const img = new Jimp({ width: w, height: h, color: 0x121212FF })

         // Avatar circle
         const avatarSize = 42
         const cx = 35
         const cy = 35
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
                  if (dx * dx + dy * dy <= r * r) img.setPixelColor(0xFE2C55FF, cx + dx, cy + dy)
               }
            }
         }

         const userTag = username.startsWith('@') ? username : `@${username}`
         img.print({ font, x: 68, y: 15, text: userTag })
         img.print({ font, x: 68, y: 40, text: comment, maxWidth: w - 130 })
         img.print({ font, x: 68, y: h - 25, text: `${date}  •  Reply` })

         // Red heart icon at right side #FE2C55
         img.print({ font, x: w - 48, y: 35, text: '<3' })
         img.print({ font, x: w - 50, y: 55, text: '2.5K' })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[fakettcomment] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}