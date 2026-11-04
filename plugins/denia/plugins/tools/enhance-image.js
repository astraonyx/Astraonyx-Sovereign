import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { isMimeImage } from '../../lib/Utilities.js'

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
   command: 'hd',
   hidden: 'enhance',
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
            return m.reply('💭 Reply/kirim gambar untuk ditingkatkan kualitasnya (HD).')
         m.react('🕒')

         const buffer = await q.download()
         const tmpDir = path.resolve('./tmp')
         if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

         const tmpIn = path.join(tmpDir, `hd_in_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)
         const tmpOut = path.join(tmpDir, `hd_out_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`)
         fs.writeFileSync(tmpIn, buffer)

         try {
            await execFileAsync(getFfmpegBin(), [
               '-y',
               '-i', tmpIn,
               '-vf', 'scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:1.0:5:5:0.0',
               '-q:v', '2',
               tmpOut
            ])

            const outputBuffer = fs.readFileSync(tmpOut)
            await sock.sendMedia(m.chat, outputBuffer, '✨ *Kualitas gambar ditingkatkan (HD Lanczos 2x)*', m)
         }
         finally {
            try { fs.unlinkSync(tmpIn) } catch {}
            try { fs.unlinkSync(tmpOut) } catch {}
         }
      }
      catch (error) {
         console.error('[hd] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}