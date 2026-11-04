// server/terminalManager.js — Terminal Khusus Instalasi Skill & Eksekusi CLI Hermes
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKSPACE_DIR = path.resolve(__dirname, '..');
let activeProcess = null;
const terminalHistory = [];
const MAX_HISTORY = 100;

function appendHistory(entry) {
  terminalHistory.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  if (terminalHistory.length > MAX_HISTORY) {
    terminalHistory.shift();
  }
}

function getHistory() {
  return terminalHistory;
}

/**
 * Jalankan perintah di terminal khusus Hermes dengan output streaming real-time
 * @param {string} command - Perintah shell yang akan dijalankan
 * @param {object} res - Express Response object untuk streaming SSE / chunked
 */
function runCommandStreaming(command, res) {
  if (activeProcess) {
    res.write(`data: ${JSON.stringify({ type: 'stderr', text: '⚠️ Sebuah proses masih berjalan. Harap tunggu atau klik "Hentikan Proses".\n' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'exit', code: -1 })}\n\n`);
    res.end();
    return;
  }

  const cleanCmd = String(command || '').trim();
  if (!cleanCmd) {
    res.write(`data: ${JSON.stringify({ type: 'stderr', text: 'Perintah kosong.\n' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'exit', code: 0 })}\n\n`);
    res.end();
    return;
  }

  // Catat ke riwayat
  appendHistory({ type: 'command', command: cleanCmd });

  res.write(`data: ${JSON.stringify({ type: 'start', command: cleanCmd, cwd: WORKSPACE_DIR })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'stdout', text: `polaris@hermes:~$ ${cleanCmd}\n` })}\n\n`);

  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell.exe' : 'bash';
  const shellArgs = isWindows ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cleanCmd] : ['-c', cleanCmd];

  try {
    const child = spawn(shell, shellArgs, {
      cwd: WORKSPACE_DIR,
      env: { ...process.env, FORCE_COLOR: '1' },
      windowsHide: true,
    });

    activeProcess = child;

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      appendHistory({ type: 'stdout', text });
      res.write(`data: ${JSON.stringify({ type: 'stdout', text })}\n\n`);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      appendHistory({ type: 'stderr', text });
      res.write(`data: ${JSON.stringify({ type: 'stderr', text })}\n\n`);
    });

    child.on('error', (err) => {
      const text = `❌ Gagal menjalankan proses: ${err.message}\n`;
      appendHistory({ type: 'stderr', text });
      res.write(`data: ${JSON.stringify({ type: 'stderr', text })}\n\n`);
      activeProcess = null;
      res.write(`data: ${JSON.stringify({ type: 'exit', code: 1 })}\n\n`);
      res.end();
    });

    child.on('close', (code) => {
      activeProcess = null;
      const text = `\n[Proses selesai dengan kode keluar ${code}]\n`;
      appendHistory({ type: 'exit', code });
      res.write(`data: ${JSON.stringify({ type: 'exit', code, text })}\n\n`);
      res.end();
    });

  } catch (err) {
    activeProcess = null;
    res.write(`data: ${JSON.stringify({ type: 'stderr', text: `Exception: ${err.message}\n` })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'exit', code: 1 })}\n\n`);
    res.end();
  }
}

/**
 * Hentikan paksa proses yang sedang berjalan
 */
function killActiveProcess() {
  if (!activeProcess) {
    return { success: false, message: 'Tidak ada proses aktif yang sedang berjalan.' };
  }
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', activeProcess.pid, '/f', '/t']);
    } else {
      activeProcess.kill('SIGTERM');
    }
    activeProcess = null;
    appendHistory({ type: 'stderr', text: '\n[Proses dihentikan paksa oleh pengguna]\n' });
    return { success: true, message: 'Proses aktif berhasil dihentikan.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  runCommandStreaming,
  killActiveProcess,
  getHistory,
};
