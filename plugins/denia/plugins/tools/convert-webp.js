import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { isMimeWebP } from '../../lib/Utilities.js'

const execFileAsync = promisify(execFile)

function getFfmpegBin() {
   if (global.__ffmpegBin) {
      if (fs.existsSync(global.__ffmpegBin)) return global.__ffmpegBin
      const p = path.join(global.__ffmpegBin, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
      if (fs.existsSync(p)) return p
   }
   return 'ffmpeg'
}

async function webpToImage(buffer) {
   const tmpDir = path.resolve('./tmp')
   if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
   const tmpIn = path.join(tmpDir, `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`)
   const tmpOut = path.join(tmpDir, `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.png`)
   fs.writeFileSync(tmpIn, buffer)
   try {
      await execFileAsync(getFfmpegBin(), ['-y', '-i', tmpIn, '-vframes', '1', tmpOut])
      return fs.readFileSync(tmpOut)
   }
   finally {
      try { fs.unlinkSync(tmpIn) } catch {}
      try { fs.unlinkSync(tmpOut) } catch {}
   }
}

async function webpToVideo(buffer) {
   const tmpDir = path.resolve('./tmp')
   if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
   const tmpIn = path.join(tmpDir, `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`)
   const tmpOut = path.join(tmpDir, `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`)
   fs.writeFileSync(tmpIn, buffer)
   try {
      await execFileAsync(getFfmpegBin(), [
         '-y', '-i', tmpIn,
         '-pix_fmt', 'yuv420p',
         '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
         '-c:v', 'libx264',
         '-movflags', '+faststart',
         tmpOut
      ])
      return fs.readFileSync(tmpOut)
   }
   finally {
      try { fs.unlinkSync(tmpIn) } catch {}
      try { fs.unlinkSync(tmpOut) } catch {}
   }
}

export default {
   command: ['toimage', 'tovideo'],
   hidden: ['toimg', 'tovid'],
   category: 'tools',
   async run (m, {
      sock,
      command
   }) {
      try {
         const q = m.quoted ? m.quoted : m
         const mimetype = q.msg?.mimetype
         if (!isMimeWebP(mimetype))
            return m.reply('💭 Reply sticker.')
         m.react('🕒')
         const buffer = await q.download()
         const isNeedVideoConvert = command === 'tovid' || command === 'tovideo'
         let outputBuffer
         if (isNeedVideoConvert) {
            outputBuffer = await webpToVideo(buffer)
         }
         else {
            outputBuffer = await webpToImage(buffer)
         }
         if (!outputBuffer || outputBuffer.length === 0)
            return m.reply('❌ Gagal mengonversi stiker.')
         await sock.sendMedia(m.chat, outputBuffer, '', m)
      }
      catch (error) {
         console.error('[convert-webp] Error:', error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}