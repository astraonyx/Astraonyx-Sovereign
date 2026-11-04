import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE, SANS_16_BLACK } from 'jimp/fonts'
import { fetchAsBuffer, isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'fakestory',
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
         const caption = (parts[0] || 'My daily vibe ✨').trim()
         const rawUser = (parts[1] || m.pushName || 'instagrammer').trim()
         const username = rawUser.startsWith('@') ? rawUser : '@' + rawUser

         if (!text && !mimetype)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} sunset vibes | @sairidev`)
         m.react('🕒')

         let storyMediaBuffer
         let profileBuffer

         try {
            if (isMimeImage(mimetype)) {
               storyMediaBuffer = await q.download()
            }
         } catch {
            storyMediaBuffer = null
         }

         try {
            const pfpUrl = await sock.profilePicture(m.sender)
            if (pfpUrl) profileBuffer = await fetchAsBuffer(pfpUrl)
         } catch {
            profileBuffer = null
         }

         const width = 720
         const height = 1280
         let canvas

         if (storyMediaBuffer && Buffer.isBuffer(storyMediaBuffer)) {
            try {
               canvas = await Jimp.read(storyMediaBuffer)
               canvas.cover({ w: width, h: height })
               // Slight dim overlay so controls and text stand out
               const dim = new Jimp({ width, height, color: 0x00000040 })
               canvas.composite(dim, 0, 0)
            } catch {
               canvas = null
            }
         }

         if (!canvas) {
            canvas = new Jimp({ width, height, color: 0x18181BFF })
         }

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Top story progress bar (3 segments)
         const barY = 25
         const segWidth = 210
         for (let i = 0; i < 3; i++) {
            const seg = new Jimp({ width: segWidth, height: 3, color: i === 0 ? 0xFFFFFFFF : 0xFFFFFF60 })
            canvas.composite(seg, 35 + i * (segWidth + 15), barY)
         }

         // Instagram gradient ring for avatar
         const ringSize = 72
         const igRing = new Jimp({ width: ringSize, height: ringSize, color: 0xE1306CFF })
         igRing.circle()
         canvas.composite(igRing, 35, 55)

         // Profile avatar
         const avatarSize = 64
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
            avatarImg = new Jimp({ width: avatarSize, height: avatarSize, color: 0x27272AFF })
            avatarImg.circle()
         }
         canvas.composite(avatarImg, 39, 59)

         // Username and time
         canvas.print({
            font: fontSmall,
            x: 120,
            y: 75,
            text: `${username}   3h`
         })

         // Close X button
         canvas.print({
            font: fontSmall,
            x: 660,
            y: 75,
            text: 'X'
         })

         // Story caption in center/lower third
         if (caption) {
            canvas.print({
               font: fontLarge,
               x: 50,
               y: 850,
               text: caption,
               maxWidth: 620
            })
         }

         // Bottom reply input bar pill
         const inputY = 1170
         const inputPill = new Jimp({ width: 520, height: 50, color: 0x27272A99 })
         canvas.composite(inputPill, 35, inputY)

         canvas.print({
            font: fontSmall,
            x: 60,
            y: inputY + 15,
            text: 'Kirim pesan...'
         })

         // Heart and send icons
         canvas.print({
            font: fontSmall,
            x: 590,
            y: inputY + 15,
            text: '<3   >'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `📸 *Instagram Story by ${username}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}