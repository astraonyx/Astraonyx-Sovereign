import { isMimeImage } from '../../lib/Utilities.js'

export default {
   command: 'ocr',
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
            return m.reply('💭 Provide or reply to an image to recognize the characters.')
         m.react('🕒')

         const buffer = await q.download()
         if (!buffer || !Buffer.isBuffer(buffer))
            return m.reply('❌ Failed to download image.')

         const form = new FormData()
         form.append('base64Image', 'data:image/png;base64,' + buffer.toString('base64'))
         form.append('apikey', 'helloworld')

         const res = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: form
         })
         const data = await res.json()

         const parsedText = data.ParsedResults?.[0]?.ParsedText?.trim()
         if (!parsedText)
            return m.reply('❌ No text detected in this image.')

         m.reply(`📖 *OCR Result*:\n\n${parsedText}`)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}