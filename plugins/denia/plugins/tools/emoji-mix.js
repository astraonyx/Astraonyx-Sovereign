import { Jimp } from 'jimp'

function emojiToHex(str) {
   return [...str]
      .map(c => c.codePointAt(0).toString(16))
      .filter(x => x !== 'fe0f')
      .join('-')
}

export default {
   command: 'emojimix',
   hidden: 'mix',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         const [emoji1, emoji2] = text.split('+')
         if (!emoji1 || !emoji2)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} 😁+😆`)
         m.react('🕒')

         const hex1 = emojiToHex(emoji1.trim())
         const hex2 = emojiToHex(emoji2.trim())

         const u1 = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hex1}.png`
         const u2 = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hex2}.png`

         const [r1, r2] = await Promise.all([fetch(u1), fetch(u2)])
         if (!r1.ok || !r2.ok)
            return m.reply('❌ One or both emojis are not supported.')

         const b1 = Buffer.from(await r1.arrayBuffer())
         const b2 = Buffer.from(await r2.arrayBuffer())

         const j1 = await Jimp.read(b1)
         const j2 = await Jimp.read(b2)

         j1.resize({ w: 320, h: 320 })
         j2.resize({ w: 320, h: 320 })

         const canvas = new Jimp({ width: 512, height: 512, color: 0x00000000 })
         canvas.composite(j1, 30, 96)
         canvas.composite(j2, 162, 96)

         const stickerBuf = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, stickerBuf, '', m, {
            sticker: true
         })
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}