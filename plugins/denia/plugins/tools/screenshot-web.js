import { isURL } from '../../lib/Utilities.js'

export default {
   command: 'ssweb',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command,
      args
   }) {
      try {
         if (!args[0])
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} https://www.npmjs.com/package/@sairidev/baileys-new/`)
         if (!isURL(args[0]))
            return m.reply('❌ Invalid URL.')
         m.react('🕒')
         const targetUrl = args[0].startsWith('http') ? args[0] : 'https://' + args[0]
         const screenshotUrl = `https://image.thum.io/get/width/1280/crop/800/${targetUrl}`
         await sock.sendMedia(m.chat, screenshotUrl, `📸 *Screenshot Web*: ${targetUrl}`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}