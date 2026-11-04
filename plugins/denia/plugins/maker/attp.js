import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function getFfmpegBin() {
   if (global.__ffmpegBin) {
      if (fs.existsSync(global.__ffmpegBin)) return global.__ffmpegBin
      const p = path.join(global.__ffmpegBin, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
      if (fs.existsSync(p)) return p
   }
   return 'ffmpeg'
}

export default {
   command: ['attp', 'ttp'],
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} hello`)
         if (text.length > 150)
            return m.reply('❌ Maximum 150 characters.')
         m.react('🕒')

         const { Jimp, loadFont, HorizontalAlign } = await import('jimp')
         const { SANS_32_WHITE, SANS_32_BLACK } = await import('jimp/fonts')
         const fontWhite = await loadFont(SANS_32_WHITE)
         const fontBlack = await loadFont(SANS_32_BLACK)

         const tmpDir = path.resolve('./tmp')
         if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

         if (command === 'ttp') {
            const frame = new Jimp({ width: 512, height: 512, color: 0x00000000 })
            const y = 230
            const offsets = [[-2, -2], [2, -2], [-2, 2], [2, 2]]
            for (const [ox, oy] of offsets) {
               frame.print({
                  font: fontBlack,
                  x: ox,
                  y: y + oy,
                  text: { text, alignmentX: HorizontalAlign.CENTER },
                  maxWidth: 512
               })
            }
            frame.print({
               font: fontWhite,
               x: 0,
               y,
               text: { text, alignmentX: HorizontalAlign.CENTER },
               maxWidth: 512
            })
            const pngBuf = await frame.getBuffer('image/png')
            return await sock.sendMedia(m.chat, pngBuf, '', m, { sticker: true })
         }

         // ATTP: Animated rainbow frames
         const colors = [
            [255, 60, 60],
            [60, 220, 60],
            [60, 160, 255],
            [255, 220, 60],
            [220, 60, 255],
            [60, 240, 240]
         ]

         const prefix = 'attp_' + Date.now() + '_' + Math.random().toString(36).slice(2)
         const frameFiles = []

         for (let i = 0; i < colors.length; i++) {
            const frame = new Jimp({ width: 512, height: 512, color: 0x00000000 })
            const [r, g, b] = colors[i]
            const y = 230
            const offsets = [[-2, -2], [2, -2], [-2, 2], [2, 2]]
            for (const [ox, oy] of offsets) {
               frame.print({
                  font: fontBlack,
                  x: ox,
                  y: y + oy,
                  text: { text, alignmentX: HorizontalAlign.CENTER },
                  maxWidth: 512
               })
            }
            frame.print({
               font: fontWhite,
               x: 0,
               y,
               text: { text, alignmentX: HorizontalAlign.CENTER },
               maxWidth: 512
            })
            frame.scan(0, 0, 512, 512, function(x, y, idx) {
               if (this.bitmap.data[idx + 3] > 200 && this.bitmap.data[idx] > 200) {
                  this.bitmap.data[idx] = r
                  this.bitmap.data[idx + 1] = g
                  this.bitmap.data[idx + 2] = b
               }
            })
            const fp = path.join(tmpDir, `${prefix}_${i}.png`)
            await frame.write(fp)
            frameFiles.push(fp)
         }

         const outWebp = path.join(tmpDir, `${prefix}.webp`)
         await execFileAsync(getFfmpegBin(), [
            '-y',
            '-framerate', '4',
            '-i', path.join(tmpDir, `${prefix}_%d.png`),
            '-vcodec', 'libwebp',
            '-lossless', '0',
            '-compression_level', '3',
            '-q:v', '70',
            '-loop', '0',
            '-an',
            outWebp
         ])

         const webpBuf = fs.readFileSync(outWebp)
         for (const fp of frameFiles) try { fs.unlinkSync(fp) } catch {}
         try { fs.unlinkSync(outWebp) } catch {}

         await sock.sendMedia(m.chat, webpBuf, '', m, { sticker: true })
      }
      catch (error) {
         console.error('[attp] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}