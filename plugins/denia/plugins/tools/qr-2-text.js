import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'qr2text',
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
            return m.reply('💭 Reply/kirim gambar QR code untuk dibaca.')
         m.react('🕒')
         const buffer = await q.download()
         const { Jimp } = await import('jimp')
         const jsQR = (await import('jsqr')).default || (await import('jsqr'))

         const img = await Jimp.read(buffer)
         const code = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height)

         if (!code || !code.data)
            return m.reply('❌ QR Code tidak terdeteksi pada gambar.')

         m.reply(`🔍 *Hasil Scan QR*: \n\n${code.data}`)
      }
      catch (error) {
         console.error('[qr2text] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}