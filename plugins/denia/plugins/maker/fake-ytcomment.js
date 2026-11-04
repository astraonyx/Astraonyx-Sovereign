import { fetchAsBuffer } from '../../lib/Utilities.js'

export default {
   command: 'fakeytcomment',
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
         const [caption = '', username = m.pushName || 'user'] = text ? text.split('|').map(s => s.trim()) : ['', '']
         if (!caption)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} nice video | @username`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE } = await import('jimp/fonts')
         const font = await loadFont(SANS_16_WHITE)

         const w = 580
         const h = Math.max(140, 100 + Math.ceil(caption.length / 45) * 22)
         const img = new Jimp({ width: w, height: h, color: 0x0F0F0FFF })

         // Avatar circle
         const avatarSize = 46
         const cx = 38
         const cy = 38
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
               img.composite(ppImg, 15, 15)
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
                  img.composite(ppImg, 15, 15)
                  avatarDrawn = true
               }
            }
         } catch {}

         if (!avatarDrawn) {
            for (let dy = -r; dy <= r; dy++) {
               for (let dx = -r; dx <= r; dx++) {
                  if (dx * dx + dy * dy <= r * r) img.setPixelColor(0xCC0000FF, cx + dx, cy + dy)
               }
            }
         }

         // Header: @username • 2 hours ago
         const userTag = username.startsWith('@') ? username : `@${username}`
         img.print({ font, x: 74, y: 16, text: `${userTag}  •  2 hours ago` })

         // Comment text
         img.print({ font, x: 74, y: 44, text: caption, maxWidth: w - 90 })

         // Footer actions
         img.print({ font, x: 74, y: h - 30, text: '👍 1.2K    👎    Reply' })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[fakeytcomment] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}