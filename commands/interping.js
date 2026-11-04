// commands/interping.js — Uji Kualitas Jaringan & Kecepatan Internet Server (Download, Upload & Ping)
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const config = require('../config');

// Helper untuk test download dari Cloudflare CDN
function measureDownload(bytes = 6000000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let receivedBytes = 0;
    const req = https.get('https://speed.cloudflare.com/__down?bytes=' + bytes, {
      headers: { 'User-Agent': 'PolarisBot-SpeedTest/1.0' },
    }, (res) => {
      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
      });
      res.on('end', () => {
        const durationSec = (Date.now() - startTime) / 1000;
        const mbps = durationSec > 0 ? (receivedBytes * 8) / (durationSec * 1000000) : 0;
        resolve({ success: true, mbps: mbps.toFixed(2), duration: durationSec.toFixed(2), bytes: receivedBytes });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, mbps: '0.00' });
    });

    req.setTimeout(9000, () => {
      req.destroy();
      const durationSec = (Date.now() - startTime) / 1000;
      const mbps = durationSec > 0 ? (receivedBytes * 8) / (durationSec * 1000000) : 0;
      resolve({ success: true, mbps: mbps.toFixed(2), duration: durationSec.toFixed(2), bytes: receivedBytes, timedOut: true });
    });
  });
}

// Helper untuk test upload ke Cloudflare speed endpoint
function measureUpload(bytes = 2000000) {
  return new Promise((resolve) => {
    const data = crypto.randomBytes(bytes);
    const startTime = Date.now();
    const req = https.request('https://speed.cloudflare.com/__up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length,
        'User-Agent': 'PolarisBot-SpeedTest/1.0',
      },
    }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const durationSec = (Date.now() - startTime) / 1000;
        const mbps = durationSec > 0 ? (data.length * 8) / (durationSec * 1000000) : 0;
        resolve({ success: true, mbps: mbps.toFixed(2), duration: durationSec.toFixed(2), bytes: data.length });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, mbps: '0.00' });
    });

    req.setTimeout(9000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout', mbps: '0.00' });
    });

    req.write(data);
    req.end();
  });
}

// Helper untuk test latency / ping ke Cloudflare DNS
function measurePing() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get('https://1.1.1.1/cdn-cgi/trace', (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        resolve(Date.now() - start);
      });
    });
    req.on('error', () => resolve(999));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(999);
    });
  });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  name: 'interping',
  category: 'Umum',
  desc: 'Cek kualitas & kecepatan internet server (Download & Upload Mbps, Ping)',
  async execute(sock, msg, args, { reply, senderNumber, botStartTimestamp }) {
    await reply('⏳ _Mengukur kualitas jaringan server (Download, Upload & Latency)... Mohon tunggu 5-8 detik._');

    const totalStart = Date.now();

    // Jalankan test latency terlebih dahulu
    const pingMs = await measurePing();

    // Jalankan test download
    const downResult = await measureDownload(6000000);

    // Jalankan test upload
    const upResult = await measureUpload(2000000);

    const totalSec = ((Date.now() - totalStart) / 1000).toFixed(1);

    // Kualitas sinyal / rating
    let rating = '🟢 Sangat Bagus';
    const downNum = parseFloat(downResult.mbps) || 0;
    if (downNum < 2) rating = '🔴 Lambat';
    else if (downNum < 10) rating = '🟡 Cukup Baik';
    else if (downNum >= 50) rating = '⚡ Super Cepat (Ultra High Speed)';

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memStr = formatBytes(usedMem) + ' / ' + formatBytes(totalMem);

    const text = '╭───「 🌐 KUALITAS JARINGAN SERVER 」\n' +
'│ ◈ Status Jaringan: *' + rating + '*\n' +
'│ ◈ Kecepatan Download: 🚀 *' + downResult.mbps + ' Mbps*\n' +
'│ ◈ Kecepatan Upload: 📤 *' + upResult.mbps + ' Mbps*\n' +
'│ ◈ Server Latency (Ping): ⚡ *' + pingMs + ' ms*\n' +
'├───────────────────────────\n' +
'│ ◈ Target Gateway: Cloudflare Edge (Anycast)\n' +
'│ ◈ Server OS: ' + os.type() + ' ' + os.release() + ' (' + os.arch() + ')\n' +
'│ ◈ Server RAM: ' + memStr + '\n' +
'│ ◈ Node.js Runtime: ' + process.version + '\n' +
'│ ◈ Durasi Uji: ' + totalSec + ' detik\n' +
'╰───────────────────────────';

    await reply(text);
  },
};
