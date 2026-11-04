import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE, SANS_16_BLACK } from 'jimp/fonts'
import { fetchAsBuffer, randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakethreads',
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
         const caption = (parts[0] || 'Hello from Threads!').trim()
         const rawUser = (parts[1] || m.pushName || 'user').trim()
         const username = rawUser.startsWith('@') ? rawUser : '@' + rawUser

         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} nice day today | @sairidev`)
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
         const height = 360
         // Threads dark theme #101010
         const canvas = new Jimp({ width, height, color: 0x101010FF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Avatar circle (64x64)
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
            avatarImg = new Jimp({ width: avatarSize, height: avatarSize, color: 0x3B82F6FF })
            avatarImg.circle()
         }
         canvas.composite(avatarImg, 40, 35)

         // Username
         canvas.print({
            font: fontSmall,
            x: 120,
            y: 40,
            text: `${username} • 2h`
         })

         // Post content text (wrap within 620px)
         canvas.print({
            font: fontLarge,
            x: 120,
            y: 85,
            text: caption.length > 90 ? caption.slice(0, 90) + '...' : caption,
            maxWidth: 550
         })

         // Action icons bar (Like, Reply, Repost, Send)
         const actionY = 250
         canvas.print({
            font: fontSmall,
            x: 120,
            y: actionY,
            text: '<3  Reply  Repost  Share'
         })

         // Likes count
         const likes = randomInteger(120, 4800)
         const replies = randomInteger(8, 140)
         canvas.print({
            font: fontSmall,
            x: 120,
            y: actionY + 45,
            text: `${replies} replies • ${likes} likes`
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `🧵 *Threads Post by ${username}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}