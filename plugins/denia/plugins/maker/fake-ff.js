import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE } from 'jimp/fonts'
import { fetchAsBuffer, randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakeff',
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
         const nickname = (text || m.pushName || 'Survivor').trim()

         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} sairidev`)
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

         const width = 854
         const height = 480
         // Dark combat camo banner background (#0F172A)
         const canvas = new Jimp({ width, height, color: 0x0F172AFF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Gaming banner header border
         const topAccent = new Jimp({ width, height: 6, color: 0xF59E0BFF })
         canvas.composite(topAccent, 0, 0)

         // Avatar (140x140)
         const avatarSize = 140
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
            avatarImg = new Jimp({ width: avatarSize, height: avatarSize, color: 0x334155FF })
            avatarImg.circle()
         }

         // Gold outer ring
         const ring = new Jimp({ width: avatarSize + 8, height: avatarSize + 8, color: 0xF59E0BFF })
         ring.circle()
         canvas.composite(ring, 50, 76)
         canvas.composite(avatarImg, 54, 80)

         // Player Nickname
         canvas.print({
            font: fontLarge,
            x: 230,
            y: 80,
            text: nickname
         })

         // Rank Badge Pill
         const rankPill = new Jimp({ width: 220, height: 36, color: 0xF59E0BFF })
         canvas.composite(rankPill, 230, 135)
         canvas.print({
            font: fontSmall,
            x: 250,
            y: 145,
            text: 'GRANDMASTER V'
         })

         // FF UID and Level
         const uid = randomInteger(100000000, 999999999)
         const lv = randomInteger(65, 88)
         canvas.print({
            font: fontSmall,
            x: 230,
            y: 190,
            text: `UID: ${uid}  |  Level: ${lv}  |  Region: Indonesia`
         })

         // Divider line
         const line = new Jimp({ width: 754, height: 2, color: 0x334155FF })
         canvas.composite(line, 50, 240)

         // Stats grid
         const stats = [
            { label: 'Booyah!', val: `${randomInteger(350, 1200)}` },
            { label: 'K/D Ratio', val: `${randomInteger(3, 8)}.${randomInteger(10, 99)}` },
            { label: 'Likes', val: `${randomInteger(2000, 9800)}` },
            { label: 'Guild', val: 'POLARIS ESPORTS' }
         ]

         stats.forEach((s, idx) => {
            const bx = 50 + idx * 190
            const box = new Jimp({ width: 175, height: 90, color: 0x1E293BFF })
            canvas.composite(box, bx, 270)
            canvas.print({
               font: fontSmall,
               x: bx + 15,
               y: 285,
               text: s.label
            })
            canvas.print({
               font: fontLarge,
               x: bx + 15,
               y: 315,
               text: s.val
            })
         })

         // Bottom watermark
         canvas.print({
            font: fontSmall,
            x: 50,
            y: 420,
            text: 'FREE FIRE BATTLEGROUNDS • OFFICIAL LOBBY PROFILE'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `🔥 *Free Fire Lobby: ${nickname}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}