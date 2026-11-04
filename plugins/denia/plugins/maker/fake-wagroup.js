import { fetchAsBuffer, randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakewagroup',
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
         const [name = m.pushName || 'Group', members = `${randomInteger(50, 1024)}`, desc = 'Polaris Community', author = m.pushName || 'Admin', date = '27/05/26'] = text ? text.split('|').map(s => s.trim()) : ['', '', '', '', '']
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Polaris | 1024 | Polaris Community | Admin | 27/05/26`)
         m.react('🕒')

         const { Jimp, loadFont, HorizontalAlign } = await import('jimp')
         const { SANS_16_WHITE, SANS_32_WHITE } = await import('jimp/fonts')
         const fontBig = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         const w = 500, h = 360
         const img = new Jimp({ width: w, height: h, color: 0x111B21FF }) // WhatsApp Dark

         // Group avatar circle in center
         const avatarSize = 90
         const cx = 250, cy = 75, r = avatarSize / 2
         let avatarDrawn = false

         try {
            let ppUrl
            if (mimetype) {
               const ppBuf = await q.download()
               const ppImg = await Jimp.read(ppBuf)
               ppImg.cover({ w: avatarSize, h: avatarSize })
               ppImg.scan(0, 0, avatarSize, avatarSize, function(x, y, idx) {
                  const dx = x - r, dy = y - r
                  if (dx * dx + dy * dy > r * r) this.bitmap.data[idx + 3] = 0
               })
               img.composite(ppImg, cx - r, cy - r)
               avatarDrawn = true
            } else {
               ppUrl = await sock.profilePicture(m.sender)
               if (ppUrl) {
                  const ppBuf = await fetchAsBuffer(ppUrl)
                  const ppImg = await Jimp.read(ppBuf)
                  ppImg.cover({ w: avatarSize, h: avatarSize })
                  ppImg.scan(0, 0, avatarSize, avatarSize, function(x, y, idx) {
                     const dx = x - r, dy = y - r
                     if (dx * dx + dy * dy > r * r) this.bitmap.data[idx + 3] = 0
                  })
                  img.composite(ppImg, cx - r, cy - r)
                  avatarDrawn = true
               }
            }
         } catch {}

         if (!avatarDrawn) {
            for (let dy = -r; dy <= r; dy++) {
               for (let dx = -r; dx <= r; dx++) {
                  if (dx * dx + dy * dy <= r * r) img.setPixelColor(0x00A884FF, cx + dx, cy + dy)
               }
            }
         }

         // Group title centered
         img.print({
            font: fontBig,
            x: 20,
            y: 135,
            text: { text: name, alignmentX: HorizontalAlign.CENTER },
            maxWidth: w - 40
         })

         // Members count
         img.print({
            font: fontSmall,
            x: 20,
            y: 180,
            text: { text: `Grup  •  ${members} peserta`, alignmentX: HorizontalAlign.CENTER },
            maxWidth: w - 40
         })

         // Description Card
         const descY = 215, descH = 110
         for (let y = descY; y < descY + descH; y++) {
            for (let x = 30; x < w - 30; x++) {
               const cr = 10
               const isTL = x < 30 + cr && y < descY + cr
               const isTR = x > w - 30 - cr && y < descY + cr
               const isBL = x < 30 + cr && y > descY + descH - cr
               const isBR = x > w - 30 - cr && y > descY + descH - cr
               let ok = true
               if (isTL && (x - (30 + cr)) ** 2 + (y - (descY + cr)) ** 2 > cr * cr) ok = false
               if (isTR && (x - (w - 30 - cr)) ** 2 + (y - (descY + cr)) ** 2 > cr * cr) ok = false
               if (isBL && (x - (30 + cr)) ** 2 + (y - (descY + descH - cr)) ** 2 > cr * cr) ok = false
               if (isBR && (x - (w - 30 - cr)) ** 2 + (y - (descY + descH - cr)) ** 2 > cr * cr) ok = false
               if (ok) img.setPixelColor(0x202C33FF, x, y)
            }
         }

         img.print({ font: fontSmall, x: 45, y: descY + 14, text: `Deskripsi: ${desc}`, maxWidth: w - 90 })
         img.print({ font: fontSmall, x: 45, y: descY + 65, text: `Dibuat oleh ${author}, ${date}`, maxWidth: w - 90 })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[fakewagroup] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}