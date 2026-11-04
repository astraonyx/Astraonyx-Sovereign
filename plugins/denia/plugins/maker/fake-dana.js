import { Jimp, loadFont } from 'jimp'
import { SANS_32_WHITE, SANS_16_WHITE, SANS_32_BLACK, SANS_16_BLACK } from 'jimp/fonts'

export default {
   command: 'fakedana',
   category: 'maker',
   async run(m, {
      sock,
      isPrefix,
      command,
      text
   }) {
      try {
         if (!text)
            return m.reply(`👉🏻 *Example*: ${isPrefix + command} 100000`)
         m.react('🕒')

         const cleanNominal = text.replace('--crop', '').replace(/[^0-9]/g, '') || '50000'
         const formattedAmount = 'Rp ' + Number(cleanNominal).toLocaleString('id-ID')

         const width = 600
         const height = 850
         const canvas = new Jimp({ width, height, color: 0xF8FAFCFF })

         const fontLargeWhite = await loadFont(SANS_32_WHITE)
         const fontSmallWhite = await loadFont(SANS_16_WHITE)
         const fontLargeBlack = await loadFont(SANS_32_BLACK)
         const fontSmallBlack = await loadFont(SANS_16_BLACK)

         // DANA blue top header banner (#118EEA)
         const header = new Jimp({ width: 600, height: 180, color: 0x118EEAFF })
         canvas.composite(header, 0, 0)

         // Green checkmark circle (#10B981)
         const checkCircle = new Jimp({ width: 56, height: 56, color: 0x10B981FF })
         checkCircle.circle()
         canvas.composite(checkCircle, 272, 35)

         canvas.print({
            font: fontLargeWhite,
            x: 288,
            y: 45,
            text: 'v'
         })

         canvas.print({
            font: fontLargeWhite,
            x: 130,
            y: 105,
            text: 'Pembayaran Berhasil'
         })

         // Receipt card box
         const card = new Jimp({ width: 540, height: 600, color: 0xFFFFFFFF })
         canvas.composite(card, 30, 160)

         // Amount display
         canvas.print({
            font: fontSmallBlack,
            x: 240,
            y: 195,
            text: 'Total Pembayaran'
         })

         canvas.print({
            font: fontLargeBlack,
            x: Math.max(50, Math.floor((width - formattedAmount.length * 18) / 2)),
            y: 235,
            text: formattedAmount
         })

         // Divider line
         const divider = new Jimp({ width: 480, height: 2, color: 0xE2E8F0FF })
         canvas.composite(divider, 60, 310)

         // Details list
         const now = new Date()
         const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
         const trxId = 'TRX' + Date.now().toString().slice(-10)

         const rows = [
            { label: 'Merchant', val: 'Google Play Store' },
            { label: 'Waktu Transaksi', val: dateStr },
            { label: 'ID Transaksi', val: trxId },
            { label: 'Metode Pembayaran', val: 'Saldo DANA' },
            { label: 'Total Bayar', val: formattedAmount }
         ]

         let currY = 345
         rows.forEach(r => {
            canvas.print({
               font: fontSmallBlack,
               x: 60,
               y: currY,
               text: r.label
            })
            canvas.print({
               font: fontSmallBlack,
               x: 320,
               y: currY,
               text: r.val
            })
            currY += 55
         })

         // Bottom button
         const btn = new Jimp({ width: 480, height: 50, color: 0x118EEAFF })
         canvas.composite(btn, 60, 680)
         canvas.print({
            font: fontSmallWhite,
            x: 230,
            y: 695,
            text: 'LIHAT DETAIL'
         })

         const buffer = await canvas.getBuffer('image/png')
         await sock.sendMedia(m.chat, buffer, `💸 *Bukti Transfer DANA* (${formattedAmount})`, m)
      }
      catch (error) {
         console.error(error)
         m.reply('❌ ' + error.message)
      }
   },
   limit: 1
}