import QRCode from 'qrcode'

export default {
   command: 'text2qr',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} I love you, big brother.`)
         m.react('🕒')
         const data = await QRCode.toBuffer(text, {
            scale: 8,
            margin: 2
         })
         if (!Buffer.isBuffer(data))
            return m.reply('❌ Failed to create QR code.')
         await sock.sendMedia(m.chat, data, '', m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}