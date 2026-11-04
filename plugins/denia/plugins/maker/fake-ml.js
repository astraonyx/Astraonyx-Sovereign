import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE } from 'jimp/fonts'
import { fetchAsBuffer, randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakeml',
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
         const nickname = (text || m.pushName || 'Player').trim()

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
         // Mobile Legends navy blue / gold theme (#0A0F1D)
         const canvas = new Jimp({ width, height, color: 0x0A0F1DFF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Cyan-Gold top border
         const topBar = new Jimp({ width, height: 6, color: 0x38BDF8FF })
         canvas.composite(topBar, 0, 0)

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
            avatarImg = new Jimp({ width: avatarSize, height: avatarSize, color: 0x1E293BFF })
            avatarImg.circle()
         }

         // Gold outer ring
         const ring = new Jimp({ width: avatarSize + 8, height: avatarSize + 8, color: 0xEAB308FF })
         ring.circle()
         canvas.composite(ring, 50, 76)
         canvas.composite(avatarImg, 54, 80)

         // Nickname
         canvas.print({
            font: fontLarge,
            x: 230,
            y: 80,
            text: nickname
         })

         // Rank Badge Pill (Gold)
         const rankPill = new Jimp({ width: 230, height: 36, color: 0xEAB308FF })
         canvas.composite(rankPill, 230, 135)
         canvas.print({
            font: fontSmall,
            x: 245,
            y: 145,
            text: 'MYTHIC GLORY ★ 85'
         })

         // ML ID & Server
         const uid = randomInteger(10000000, 99999999)
         canvas.print({
            font: fontSmall,
            x: 230,
            y: 190,
            text: `ID: ${uid} (2026)  |  Server: Indonesia (ID)`
         })

         // Divider line
         const line = new Jimp({ width: 754, height: 2, color: 0x1E293BFF })
         canvas.composite(line, 50, 240)

         // Stats grid
         const stats = [
            { label: 'All Matches', val: `${randomInteger(1200, 4800)}` },
            { label: 'Win Rate', val: `${randomInteger(62, 79)}.${randomInteger(1, 9)}%` },
            { label: 'Total MVP', val: `${randomInteger(350, 920)}` },
            { label: 'Favorite Role', val: 'Assassin/Mage' }
         ]

         stats.forEach((s, idx) => {
            const bx = 50 + idx * 190
            const box = new Jimp({ width: 175, height: 90, color: 0x111827FF })
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
            text: 'MOBILE LEGENDS: BANG BANG • OFFICIAL LOBBY PROFILE'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `⚔️ *Mobile Legends Lobby: ${nickname}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}