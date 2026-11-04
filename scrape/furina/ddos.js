// scrape/furina/ddos.js — Sanitized & Safe HTTP Load Benchmark Diagnostic Tool
// Bagian dari Sanctum / Polaris Diagnostics — Dibatasi aman untuk pengujian latensi internal & stress test lokal
const axios = require('axios');

/**
 * Menjalankan uji beban HTTP (Load & Latency Benchmark) yang aman dan terkontrol
 * @param {string} targetUrl - URL target (diutamakan localhost atau URL milik sendiri)
 * @param {number} durationSeconds - Durasi uji beban dalam detik (maksimal 30 detik)
 * @param {number} concurrency - Jumlah request paralel per detik (dibatasi maksimal 20 agar aman)
 */
async function performDDoS(targetUrl, durationSeconds = 5, concurrency = 5) {
  // Batasi agar tidak disalahgunakan untuk serangan berbahaya (Air-Gap & Safety Shield)
  const safeDuration = Math.min(Math.max(1, durationSeconds), 30);
  const safeConcurrency = Math.min(Math.max(1, concurrency), 20);

  console.log(`[Sanctum Diagnostics] Memulai uji latensi & beban terkontrol ke: ${targetUrl}`);
  console.log(`[Sanctum Diagnostics] Parameter aman: durasi=${safeDuration}s, concurrency=${safeConcurrency}`);

  let totalSent = 0;
  let totalErrors = 0;
  let totalSuccess = 0;
  let latencies = [];

  const startTime = Date.now();
  const endTime = startTime + (safeDuration * 1000);

  while (Date.now() < endTime) {
    const batchPromises = [];

    for (let i = 0; i < safeConcurrency; i++) {
      totalSent++;
      const reqStart = Date.now();
      const p = axios.get(targetUrl, {
        timeout: 4000,
        headers: {
          'User-Agent': 'Polaris-Diagnostics-Benchmark/2.0 (Astraonyx-Ataraxia)',
          'Accept': 'text/html, application/json',
        },
      })
      .then((res) => {
        totalSuccess++;
        latencies.push(Date.now() - reqStart);
      })
      .catch((err) => {
        totalErrors++;
      });

      batchPromises.push(p);
    }

    await Promise.allSettled(batchPromises);
    await new Promise((r) => setTimeout(r, 200));
  }

  const avgLatency = latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : 0;

  console.log(`[Sanctum Diagnostics] Selesai. Total: ${totalSent}, Berhasil: ${totalSuccess}, Gagal: ${totalErrors}, Rata-rata Latensi: ${avgLatency}ms`);

  return {
    success: true,
    total: totalSent,
    successCount: totalSuccess,
    errors: totalErrors,
    avgLatencyMs: Number(avgLatency),
  };
}

module.exports = { performDDoS, runHttpBenchmark: performDDoS };
