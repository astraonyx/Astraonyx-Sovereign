import { Jimp } from 'jimp'

function emojiToHex(str) {
   return [...str]
      .map(c => c.codePointAt(0).toString(16))
      .filter(x => x !== 'fe0f')
      .join('-')
}

export default {
   command: 'emojito',
   hidden: 'emogif',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command,
      args
   }) {
      try {
         if (!args[0])
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} 😁`)
         m.react('🕒')

         const hex = emojiToHex(args[0])
         const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${hex}.png`

         const res = await fetch(url)
         if (!res.ok)
            return m.reply('❌ Emoji not supported or invalid.')

         const buf = Buffer.from(await res.arrayBuffer())
         const emojiImg = await Jimp.read(buf)
         emojiImg.resize({ w: 420, h: 420 })

         const canvas = new Jimp({ width: 512, height: 512, color: 0x00000000 })
         canvas.composite(emojiImg, 46, 46)

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