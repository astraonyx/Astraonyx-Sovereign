import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE } from 'jimp/fonts'
import { fetchAsBuffer } from '../../lib/Utilities.js'

export default {
   command: 'fakecall',
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
         const parts = (text || '').split('|')
         const nama = (parts[0] || m.pushName || 'Friend').trim()
         const durasi = (parts[1] || '06:52').trim()

         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Big Brother🤍 | 12:34`)
         m.react('🕒')

         let profileBuffer
         try {
            if (mimetype) {
               profileBuffer = await q.download()
            } else {
               const pfpUrl = await sock.profilePicture(m.sender)
               if (pfpUrl) profileBuffer = await fetchAsBuffer(pfpUrl)
            }
         } catch {
            profileBuffer = null
         }

         const width = 720
         const height = 1280
         // Dark modern smartphone call UI background (#0d1117)
         const canvas = new Jimp({ width, height, color: 0x0D1117FF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Top status
         canvas.print({
            font: fontSmall,
            x: 270,
            y: 90,
            text: 'WhatsApp Audio Call'
         })

         // Avatar circle
         const avatarSize = 240
         let avatarImg
         if (profileBuffer && Buffer.isBuffer(profileBuffer)) {
            try {
               avatarImg = await Jimp.read(profileBuffer)
               avatarImg.resize({ w: avatarSize, h: avatarSize })
               avatarImg.circle()
            } catch {
               avatarImg = null
            }
         }
         if (!avatarImg) {
            avatarImg = new Jimp({ width: avatarSize, height: avatarSize, color: 0x374151FF })
            avatarImg.circle()
         }

         // Outer ring for avatar
         const ring = new Jimp({ width: avatarSize + 16, height: avatarSize + 16, color: 0x1F2937FF })
         ring.circle()
         canvas.composite(ring, Math.floor((width - (avatarSize + 16)) / 2), 220)
         canvas.composite(avatarImg, Math.floor((width - avatarSize) / 2), 228)

         // Caller name
         canvas.print({
            font: fontLarge,
            x: Math.max(50, Math.floor((width - nama.length * 18) / 2)),
            y: 520,
            text: nama
         })

         // Call status / duration
         canvas.print({
            font: fontSmall,
            x: Math.max(50, Math.floor((width - durasi.length * 10) / 2)),
            y: 575,
            text: durasi
         })

         // Control buttons panel
         const btnY = 820
         const btnSize = 100
         const buttons = ['Mute', 'Speaker', 'Video']
         buttons.forEach((btn, i) => {
            const bx = 110 + i * 190
            const bCircle = new Jimp({ width: btnSize, height: btnSize, color: 0x1F2937FF })
            bCircle.circle()
            canvas.composite(bCircle, bx, btnY)
            canvas.print({
               font: fontSmall,
               x: bx + 22,
               y: btnY + 115,
               text: btn
            })
         })

         // End call button (red circle)
         const endCallSize = 110
         const endCall = new Jimp({ width: endCallSize, height: endCallSize, color: 0xEF4444FF })
         endCall.circle()
         const endX = Math.floor((width - endCallSize) / 2)
         const endY = 1050
         canvas.composite(endCall, endX, endY)

         canvas.print({
            font: fontSmall,
            x: endX + 18,
            y: endY + 45,
            text: 'END CALL'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `📞 *Call from ${nama}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}