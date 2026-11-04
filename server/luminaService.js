// server/luminaService.js — Lumina HD AI Image Studio Backend Service
// Integrates Sagitarius AI (Real-ESRGAN Vulkan + GFPGAN Face Restore + Wink Aesthetic Engine)
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SAGITARIUS_BACKEND_DIR = process.env.SAGITARIUS_DIR || path.resolve('D:/Users/Astraonyx/Sagitarius/backend');
const PYTHON_PATH = path.join(SAGITARIUS_BACKEND_DIR, 'venv', 'Scripts', 'python.exe');
const UPLOADS_DIR = path.join(SAGITARIUS_BACKEND_DIR, 'uploads');
const OUTPUTS_DIR = path.join(SAGITARIUS_BACKEND_DIR, 'outputs');
const LUMINA_API_BASE = 'http://127.0.0.1:8000';

let luminaProcess = null;
let isStarting = false;

// Ensure directories exist
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
} catch (_) {}

/**
 * Check if the Lumina FastAPI server is already running on port 8000
 */
async function isServerAlive() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${LUMINA_API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch (_) {
    return false;
  }
}

/**
 * Ensure the Lumina FastAPI server is active. If offline, spawn it in background.
 */
async function ensureLuminaServer() {
  if (await isServerAlive()) {
    return { status: 'online', port: 8000 };
  }

  if (isStarting) {
    // Wait for ongoing start
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 300));
      if (await isServerAlive()) return { status: 'online', port: 8000 };
    }
  }

  isStarting = true;
  console.log('[Lumina AI] Spawning Sagitarius FastAPI backend from:', SAGITARIUS_BACKEND_DIR);

  try {
    if (!fs.existsSync(PYTHON_PATH)) {
      throw new Error(`Python virtual environment not found at: ${PYTHON_PATH}`);
    }

    luminaProcess = spawn(
      PYTHON_PATH,
      ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'],
      {
        cwd: SAGITARIUS_BACKEND_DIR,
        stdio: 'pipe',
        detached: false
      }
    );

    luminaProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete')) {
        console.log('[Lumina AI]', msg.trim());
      }
    });

    luminaProcess.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('ERROR') || msg.includes('Warning')) {
        console.warn('[Lumina AI Warning]', msg.trim());
      }
    });

    luminaProcess.on('exit', (code) => {
      console.log(`[Lumina AI] Process exited with code ${code}`);
      luminaProcess = null;
    });

    // Poll until ready (max 10 seconds)
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (await isServerAlive()) {
        console.log('[Lumina AI] Sagitarius backend is READY on port 8000');
        isStarting = false;
        return { status: 'online', port: 8000 };
      }
    }

    isStarting = false;
    throw new Error('Lumina server spawn timed out after 10 seconds');
  } catch (err) {
    isStarting = false;
    console.error('[Lumina AI] Failed to start backend:', err.message);
    throw err;
  }
}

/**
 * Fetch health & hardware info from Lumina
 */
async function getHealth() {
  await ensureLuminaServer();
  const res = await fetch(`${LUMINA_API_BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
  return await res.json();
}

/**
 * Upload an image file to Lumina
 */
async function uploadImage(fileBuffer, originalFilename, mimetype = 'image/png') {
  await ensureLuminaServer();
  
  const blob = new Blob([fileBuffer], { type: mimetype });
  const formData = new FormData();
  formData.append('file', blob, originalFilename);

  const res = await fetch(`${LUMINA_API_BASE}/api/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Stream enhancement progress via Server-Sent Events (SSE)
 */
async function proxyEnhanceStream(payload, expressRes) {
  await ensureLuminaServer();

  const response = await fetch(`${LUMINA_API_BASE}/api/enhance/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stream init failed (${response.status}): ${err}`);
  }

  expressRes.setHeader('Content-Type', 'text/event-stream');
  expressRes.setHeader('Cache-Control', 'no-cache');
  expressRes.setHeader('Connection', 'keep-alive');
  expressRes.setHeader('X-Accel-Buffering', 'no');
  if (typeof expressRes.flushHeaders === 'function') expressRes.flushHeaders();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      expressRes.write(chunk);
    }
  } catch (streamErr) {
    console.warn('[Lumina AI Stream Error]', streamErr.message);
  } finally {
    expressRes.end();
  }
}

/**
 * Synchronous enhancement request
 */
async function enhanceSync(payload) {
  await ensureLuminaServer();
  const res = await fetch(`${LUMINA_API_BASE}/api/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Enhance sync failed: ${err}`);
  }
  return await res.json();
}

/**
 * Resolve local media file path from Lumina uploads or outputs directory
 */
function resolveMediaFile(folder, filename) {
  const safeFilename = path.basename(filename);
  const targetDir = folder === 'uploads' ? UPLOADS_DIR : OUTPUTS_DIR;
  const fullPath = path.join(targetDir, safeFilename);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}

module.exports = {
  isServerAlive,
  ensureLuminaServer,
  getHealth,
  uploadImage,
  proxyEnhanceStream,
  enhanceSync,
  resolveMediaFile,
  SAGITARIUS_BACKEND_DIR,
  UPLOADS_DIR,
  OUTPUTS_DIR
};
