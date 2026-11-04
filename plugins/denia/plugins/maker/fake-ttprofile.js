import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE, SANS_16_BLACK } from 'jimp/fonts'
import { fetchAsBuffer, randomInteger } from '../../lib/Utilities.js'

export default {
   command: 'fakettprofile',
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
         const name = (parts[0] || m.pushName || 'TikToker').trim()
         const rawUser = (parts[1] || name.toLowerCase().replace(/\s+/g, '')).trim()
         const username = rawUser.startsWith('@') ? rawUser : '@' + rawUser
         const following = (parts[2] || `${randomInteger(20, 450)}`).trim()
         const followers = (parts[3] || `${randomInteger(1, 99)}.${randomInteger(1, 9)}K`).trim()
         const likes = (parts[4] || `${randomInteger(100, 950)}K`).trim()

         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} Denia | @denia_official | 85 | 120.5K | 1.8M`)
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
         const height = 960
         // TikTok dark background #121212
         const canvas = new Jimp({ width, height, color: 0x121212FF })

         const fontLarge = await loadFont(SANS_32_WHITE)
         const fontSmall = await loadFont(SANS_16_WHITE)

         // Top Bar
         canvas.print({
            font: fontSmall,
            x: 40,
            y: 40,
            text: '<'
         })

         canvas.print({
            font: fontLarge,
            x: Math.max(50, Math.floor((width - name.length * 18) / 2)),
            y: 35,
            text: name
         })

         canvas.print({
            font: fontSmall,
            x: 650,
            y: 40,
            text: '...'
         })

         // Avatar circle (180x180)
         const avatarSize = 180
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

         // Ring
         const ring = new Jimp({ width: avatarSize + 8, height: avatarSize + 8, color: 0x27272AFF })
         ring.circle()
         canvas.composite(ring, Math.floor((width - (avatarSize + 8)) / 2), 126)
         canvas.composite(avatarImg, Math.floor((width - avatarSize) / 2), 130)

         // Username @handle
         canvas.print({
            font: fontSmall,
            x: Math.max(50, Math.floor((width - username.length * 10) / 2)),
            y: 330,
            text: username
         })

         // Stats row: Following | Followers | Likes
         const statsY = 380
         const cols = [
            { num: following, label: 'Following', x: 100 },
            { num: followers, label: 'Followers', x: 300 },
            { num: likes, label: 'Likes', x: 500 }
         ]

         cols.forEach(col => {
            canvas.print({
               font: fontLarge,
               x: col.x,
               y: statsY,
               text: col.num
            })
            canvas.print({
               font: fontSmall,
               x: col.x,
               y: statsY + 45,
               text: col.label
            })
         })

         // TikTok Red Follow / Edit Button (#FE2C55)
         const btnWidth = 360
         const btnHeight = 54
         const btn = new Jimp({ width: btnWidth, height: btnHeight, color: 0xFE2C55FF })
         const btnX = Math.floor((width - btnWidth) / 2)
         const btnY = 480
         canvas.composite(btn, btnX, btnY)

         canvas.print({
            font: fontSmall,
            x: btnX + 140,
            y: btnY + 18,
            text: 'Follow'
         })

         // Bio section
         canvas.print({
            font: fontSmall,
            x: Math.max(50, Math.floor((width - 240) / 2)),
            y: 570,
            text: '✨ Welcome to my TikTok! 🎵'
         })

         // Tabs line
         const tabLine = new Jimp({ width: 640, height: 2, color: 0x27272AFF })
         canvas.composite(tabLine, 40, 630)

         canvas.print({
            font: fontSmall,
            x: 160,
            y: 650,
            text: '[ Videos ]'
         })
         canvas.print({
            font: fontSmall,
            x: 480,
            y: 650,
            text: '[ Liked ]'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `🎵 *TikTok Profile of ${username}*`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}