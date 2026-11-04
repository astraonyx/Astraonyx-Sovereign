import { REACTION_TEXTS } from '../../lib/Constants.js'
import { request } from '../../lib/Request.js'
import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE } from 'jimp/fonts'

const KAOMOJIS = {
   kiss: '( ˘ ³˘)♥',
   cry: '(╥﹏╥)',
   wave: '(・∀・)ノ',
   poke: '( ´∀｀)σ',
   waifu: '(♡´▽`♡)',
   neko: '(=^･ω･^=)',
   shinobu: '(◕‿◕✿)',
   megumin: '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
   bully: '(¬‿¬)',
   cuddle: '(*' + '˘︶˘' + '*)',
   hug: '(つ≧▽≦)つ',
   awoo: 'U^ｪ^U',
   kicked: '(╯°□°)╯',
   pat: '( ´ω｀)ノ(´∀｀*)',
   smug: '( ಠ ‿ ಠ )',
   bonk: '( ﾟДﾟ)┌┛',
   yeet: '(ノ^_^)ノ',
   blush: '(⁄ ⁄•⁄ω⁄•⁄ ⁄)',
   smile: '(✿◠‿◠)',
   highfive: '( ﾟ▽ﾟ)/',
   handhold: '(つ✧ω✧)つ',
   nom: '(っ˘ڡ˘ς)',
   bite: '(;¬_¬)',
   glomp: '(づ｡◕‿‿◕｡)づ',
   slap: '( ﾟ∀ﾟ)o彡',
   kill: '(ง︡'-'︠)ง',
   happy: '＼(≧▽≦)／',
   wink: '(＾_-)',
   dance: 'ᕕ( ᐛ )ᕗ',
   cringe: '(￣ヘ￣)'
}

async function generateReactionSticker(action) {
   const width = 512
   const height = 512
   // Rounded colorful reaction card (#6366F1 indigo)
   const canvas = new Jimp({ width, height, color: 0x00000000 })
   const box = new Jimp({ width: 450, height: 450, color: 0x6366F1EE })
   canvas.composite(box, 31, 31)

   const fontLarge = await loadFont(SANS_32_WHITE)
   const fontSmall = await loadFont(SANS_16_WHITE)

   const emo = KAOMOJIS[action] || '(≧◡≦)'
   const title = action.toUpperCase()

   canvas.print({
      font: fontLarge,
      x: Math.max(50, Math.floor((width - title.length * 18) / 2)),
      y: 120,
      text: title
   })

   canvas.print({
      font: fontLarge,
      x: Math.max(50, Math.floor((width - emo.length * 16) / 2)),
      y: 220,
      text: emo
   })

   canvas.print({
      font: fontSmall,
      x: 180,
      y: 360,
      text: '✨ POLARIS REACTION ✨'
   })

   return await canvas.getBuffer('image/png')
}

export default {
   command: Object.keys(REACTION_TEXTS),
   category: 'reaction',
   async run(m, {
      sock,
      command
   }) {
      try {
         m.react('🕒')
         const path = command === 'kicked' ?
            'kick' :
            command

         let mediaData = null
         try {
            const data = await request(`https://api.waifu.pics/sfw/${path}`)
            if (data?.url) mediaData = data.url
         } catch {
            mediaData = null
         }

         if (!mediaData) {
            mediaData = await generateReactionSticker(command)
         }

         const userId =
            m.quoted?.sender ||
            m.mentionedJid[0]
         const message = REACTION_TEXTS[command]
         const context = await sock.sendMedia(m.chat, mediaData, '', m, {
            sticker: true
         })
         if (userId && message)
            sock.sendText(
               m.chat,
               `✨ @${m.sender.split('@')[0]} ${message} ${
                  userId === m.sender
                     ? 'themselves'
                     : `@${userId.split('@')[0]}`
               }`,
               context,
               { mentions: [m.sender, userId] }
            )
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: true
}