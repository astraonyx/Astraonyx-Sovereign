export default {
   command: 'carbonify',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text: code
   }) {
      try {
         if (!code)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} console.log('Polaris Bot')`)
         m.react('🕒')

         const { Jimp, loadFont } = await import('jimp')
         const { SANS_16_WHITE, SANS_16_BLACK } = await import('jimp/fonts')
         const font = await loadFont(SANS_16_WHITE)

         const lines = code.split('\n')
         const maxLen = Math.max(...lines.map(l => l.length), 25)
         const width = Math.min(1200, Math.max(480, maxLen * 11 + 70))
         const height = Math.max(150, lines.length * 24 + 90)

         // Dark modern code window (OneDark / Dracula style #1E1E2E)
         const img = new Jimp({ width, height, color: 0x1E1E2EFF })

         // Window title bar with macOS-style window controls
         const buttons = [
            { color: 0xFF5F56FF, x: 25 },
            { color: 0xFFBD2EFF, x: 45 },
            { color: 0x27C93FFF, x: 65 }
         ]
         for (const b of buttons) {
            for (let dx = -4; dx <= 4; dx++) {
               for (let dy = -4; dy <= 4; dy++) {
                  if (dx * dx + dy * dy <= 16) {
                     img.setPixelColor(b.color, b.x + dx, 22 + dy)
                  }
               }
            }
         }

         // Print code lines
         img.print({
            font,
            x: 28,
            y: 55,
            text: code,
            maxWidth: width - 40
         })

         const outputBuffer = await img.getBuffer('image/png')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[carbonify] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}