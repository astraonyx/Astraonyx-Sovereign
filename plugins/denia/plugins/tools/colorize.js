import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'colorize',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeImage(mimetype))
            return m.reply('💭 Reply/kirim gambar yang ingin di-colorize.')
         m.react('🕒')
         const buffer = await q.download()
         const { Jimp } = await import('jimp')

         const img = await Jimp.read(buffer)
         img.color([
            { apply: 'saturate', params: [45] },
            { apply: 'mix', params: [{ r: 255, g: 235, b: 205 }, 12] }
         ])
         img.contrast(0.18)
         img.brightness(0.06)

         const outputBuffer = await img.getBuffer('image/jpeg')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[colorize] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}