import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { isMimeVideo } from '../../lib/Utilities.js'

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
   command: 'hdvid',
   hidden: 'enhancevid',
   category: 'tools',
   async run(m, {
      sock,
      isPrefix,
      command
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeVideo(mimetype))
            return m.reply('💭 Reply/kirim video untuk ditingkatkan kualitasnya (HD).')
         m.react('🕒')

         const buffer = await q.download()
         const tmpDir = path.resolve('./tmp')
         if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

         const tmpIn = path.join(tmpDir, `hdvid_in_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`)
         const tmpOut = path.join(tmpDir, `hdvid_out_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`)
         fs.writeFileSync(tmpIn, buffer)

         try {
            await execFileAsync(getFfmpegBin(), [
               '-y',
               '-i', tmpIn,
               '-vf', 'scale=trunc(iw*1.5/2)*2:trunc(ih*1.5/2)*2:flags=lanczos,unsharp=3:3:0.8:3:3:0.0',
               '-c:v', 'libx264',
               '-crf', '20',
               '-preset', 'fast',
               '-c:a', 'copy',
               tmpOut
            ])

            const outputBuffer = fs.readFileSync(tmpOut)
            await sock.sendMedia(m.chat, outputBuffer, '✨ *Kualitas video ditingkatkan (HD Lanczos)*', m)
         }
         finally {
            try { fs.unlinkSync(tmpIn) } catch {}
            try { fs.unlinkSync(tmpOut) } catch {}
         }
      }
      catch (error) {
         console.error('[hdvid] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   premium: true,
   limit: 1
}