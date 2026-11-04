const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { URL } = require('url');
const { exec } = require('child_process');

const CFG = {
  FIREWORKS_BASE: 'https://api.fireworks.ai/inference/v1',
  FIREWORKS_KEY:  process.env.FIREWORKS_API_KEY || '', // fallback key from environment
  HF_KEY:         process.env.HF_TOKEN || '',
  KEY_SERVER:     'https://api.unlimai.online/api/key',
  TEMP_EMAIL:     'https://creatett-seven.vercel.app/api/tempmail',
  UNWATERMARK:    'https://api.imgupscaler.ai',
  IMGUPSCALER:    'https://api.imgupscaler.ai',
  POLLINATIONS:   'https://image.pollinations.ai/prompt/',
  
  // Spaces
  REMBG_SPACE:    'https://briaai-bria-rmbg-2-0.hf.space',
  CODEFORMER:     'https://sczhou-codeformer.hf.space',
  RESTORE_FACE:   'https://wzhouxiff-restoreformer.hf.space',
  
  // Fireworks endpoints
  FLUX_SCHEMAS: {
    'flux-schnell': 'accounts/fireworks/models/flux-1-schnell',
    'flux-dev':     'accounts/fireworks/models/flux-1-dev',
  },
  FLUX_KONTEXT:  'https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-pro',
  FLUX_RESULT:   'https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-pro/get_result',

  // ImgLarger
  IMGLARGE_UP:    'https://photoai.imglarger.com/api/PhoAi/Upload',
  IMGLARGE_CHK:   'https://photoai.imglarger.com/api/PhoAi/CheckStatus',

  OUT_DIR:        './output',
  KEY_FILE:       './fw_keys.json',
  USER_AGENT:     'okhttp/4.12.0',
};

// ─────────────────────────────────────────────
// STYLES & MODELS
// ─────────────────────────────────────────────
const STYLES = {
  'cyberpunk':   'cyberpunk neon style, futuristic, neon glowing accents, highly detailed',
  'anime':       'anime style, vibrant colors, expressive eyes, digital art, high quality',
  '3d-render':   '3d render, unreal engine 5, octane render, volumetric lighting, photorealistic',
  'oil-painting': 'oil painting style, thick brush strokes, textured canvas, classical art',
  'watercolor':  'watercolor style, soft colors, splatters, hand-painted feel',
  'sketch':      'pencil sketch style, hand drawn, monochrome, graphite crosshatching',
  'none':        '',
};

const MODELS = {
  'flux-schnell': 'accounts/fireworks/models/flux-1-schnell',
  'flux-dev':     'accounts/fireworks/models/flux-1-dev',
};

let _apiKey = CFG.FIREWORKS_KEY;
let _keyRefresh = 0;
let _keyPool = [];

// ─────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────
function loadKeyPool() {
  try {
    if (fs.existsSync(CFG.KEY_FILE)) {
      _keyPool = JSON.parse(fs.readFileSync(CFG.KEY_FILE, 'utf8'));
      if (_keyPool.length > 0) {
        _apiKey = _keyPool[0];
        log(`Loaded ${_keyPool.length} key(s) from pool`, 'OK');
      }
    }
  } catch { }
}

function saveKeyPool() {
  try { fs.writeFileSync(CFG.KEY_FILE, JSON.stringify(_keyPool, null, 2)); } catch { }
}

function ensureOutputDir() {
  if (!fs.existsSync(CFG.OUT_DIR)) {
    fs.mkdirSync(CFG.OUT_DIR, { recursive: true });
  }
}

// ─────────────────────────────────────────────
// LOGGER
// ─────────────────────────────────────────────
function log(msg, tag = 'INFO') {
  const colors = { INFO: '\x1b[36m', OK: '\x1b[32m', ERR: '\x1b[31m', WARN: '\x1b[33m' };
  const c = colors[tag] || '\x1b[0m';
  console.log(`${c}[${tag}]\x1b[0m ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────
// CORE HTTP UTILS
// ─────────────────────────────────────────────
function request(urlStr, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = ['curl', '-s', '-i', '--max-time', '90'];
    if (opts.method) args.push('-X', opts.method);
    args.push('-H', 'User-Agent: ' + (CFG.USER_AGENT || 'okhttp/4.12.0'));

    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) {
        if (k.toLowerCase() === 'user-agent') continue;
        args.push('-H', `${k}: ${v}`);
      }
    }

    let tempFile = null;
    if (opts.body) {
      tempFile = path.join(os.tmpdir(), 'curl_body_' + Math.random().toString(36).slice(2));
      fs.writeFileSync(tempFile, opts.body);
      args.push('--data-binary', '@' + tempFile);
    }

    args.push(urlStr);
    const cmd = args.map(a => JSON.stringify(a)).join(' ');

    exec(cmd, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 }, (err, stdout) => {
      if (tempFile && fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }
      if (err) return reject(err);

      const idx = stdout.indexOf(Buffer.from('\r\n\r\n'));
      if (idx === -1) {
        return resolve({ status: 200, headers: {}, body: stdout });
      }

      const headPart = stdout.slice(0, idx).toString('utf-8');
      const body = stdout.slice(idx + 4);
      const lines = headPart.split('\r\n');
      const match = lines[0] ? lines[0].match(/HTTP\/[0-9.]+\s+(\d+)/) : null;
      const status = match ? parseInt(match[1], 10) : 200;

      const resHeaders = {};
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(':');
        if (parts.length >= 2) {
          resHeaders[parts[0].trim().toLowerCase()] = parts.slice(1).join(':').trim();
        }
      }
      resolve({ status, headers: resHeaders, body });
    });
  });
}

async function get(url, headers = {}) {
  return request(url, { method: 'GET', headers });
}

async function postJSON(url, payload, headers = {}) {
  const buf = Buffer.from(JSON.stringify(payload));
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': buf.length, ...headers },
    body: buf,
  });
  try { return { ...res, json: JSON.parse(res.body.toString()) }; } catch { return { ...res, json: null }; }
}

async function postMultipart(url, urlParams, files, extraHeaders = {}) {
  const args = ['curl', '-s', '-i', '--http1.1', '--max-time', '120'];
  args.push('-H', 'User-Agent: ' + (CFG.USER_AGENT || 'okhttp/4.12.0'));
  for (const [k, v] of Object.entries(extraHeaders)) {
    args.push('-H', `${k}: ${v}`);
  }

  let tempFiles = [];
  for (const [name, { filename, data, mime }] of Object.entries(files)) {
    let filePath = data;
    if (Buffer.isBuffer(data) || !fs.existsSync(data)) {
      const tmp = path.join(os.tmpdir(), 'tmp_upload_' + Math.random().toString(36).slice(2) + '_' + filename);
      fs.writeFileSync(tmp, Buffer.isBuffer(data) ? data : Buffer.from(data));
      filePath = tmp;
      tempFiles.push(tmp);
    }
    let fArg = `${name}=@${filePath}`;
    if (filename) fArg += `;filename=${filename}`;
    if (mime) fArg += `;type=${mime}`;
    args.push('-F', fArg);
  }
  args.push(url);

  const cmd = args.map(a => JSON.stringify(a)).join(' ');
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 }, (err, stdout) => {
      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch {}
      }
      if (err) return reject(err);

      const idx = stdout.indexOf(Buffer.from('\r\n\r\n'));
      const body = idx !== -1 ? stdout.slice(idx + 4) : stdout;
      let json = null;
      try { json = JSON.parse(body.toString()); } catch {}
      resolve({ status: 200, body, json });
    });
  });
}

function downloadFile(urlStr, destPath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(urlStr, { headers: { 'User-Agent': CFG.USER_AGENT } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} on download`));
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        log(`Saved → ${destPath}`, 'OK');
        resolve(destPath);
      });
    }).on('error', reject);
  });
}

function saveB64(base64Str, filename) {
  const dest = path.join(CFG.OUT_DIR, filename);
  fs.writeFileSync(dest, Buffer.from(base64Str, 'base64'));
  log(`Saved → ${dest}`, 'OK');
  return dest;
}

function randStr(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}

// ─────────────────────────────────────────────
// AUTH & API KEY SYSTEM
// ─────────────────────────────────────────────
async function getKey() {
  if (_keyPool.length > 0 && Date.now() - _keyRefresh < 600000) {
    return _keyPool[0];
  }
  log('Fetching new Fireworks key from backend...', 'WARN');
  try {
    const res = await get(CFG.KEY_SERVER, { 'User-Agent': CFG.USER_AGENT });
    if (res.status === 200) {
      const d = JSON.parse(res.body.toString());
      const k = d.key || d.api_key;
      if (k) {
        log(`Key fetched successfully: ${k.slice(0, 10)}...`, 'OK');
        _apiKey = k;
        _keyRefresh = Date.now();
        if (!_keyPool.includes(k)) {
          _keyPool.unshift(k);
          saveKeyPool();
        }
        return k;
      }
    }
  } catch {}
  
  // Return last working key or fallback key
  return _apiKey;
}

async function rotateKey() {
  if (_keyPool.length > 0) _keyPool.shift();
  const k = await getKey();
  _apiKey = k;
  saveKeyPool();
  return k;
}

function fwHeaders(key) {
  return {
    'Authorization': `Bearer ${key || _apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

// ─────────────────────────────────────────────
// 1. TEXT TO IMAGE (txt2img)
// ─────────────────────────────────────────────
async function txt2img({ prompt, style = 'none', model = 'flux-dev', width = 1024, height = 1024, steps = 30, cfg = 7.0, seed, neg = '', batch = 1, outPrefix = 'img' }) {
  const fullPrompt = (STYLES[style] || '') + prompt;
  const key = await getKey();
  const headers = fwHeaders(key);

  const modelPath = MODELS[model] || MODELS['flux-dev'];
  const url = `${CFG.FIREWORKS_BASE}/image_generation/${modelPath}`;

  const payload = {
    prompt: fullPrompt,
    negative_prompt: neg || 'blurry, low quality, distorted, watermark',
    width,
    height,
    num_inference_steps: steps,
    guidance_scale: cfg,
    seed: seed !== undefined ? seed : Math.floor(Math.random() * 99999),
    response_format: 'b64_json',
  };

  log(`txt2img | model=${model} | prompt="${prompt.slice(0, 45)}..."`);

  try {
    const res = await postJSON(url, payload, headers);
    if (res.status === 200 && res.json && res.json.data) {
      const paths = [];
      res.json.data.forEach((img, idx) => {
        const b64 = img.b64_json;
        if (b64) {
          const fn = `${outPrefix}_${Date.now()}_${idx}.jpg`;
          paths.push(saveB64(b64, fn));
        }
      });
      return paths;
    }
    log(`Inference failed: HTTP ${res.status} → rotating key...`, 'WARN');
    await rotateKey();
  } catch (e) { log(`Request error: ${e.message}`, 'ERR'); }

  // Fallback: Pollinations.ai (unlimited, no-key, flux model)
  log('Falling back to Pollinations.ai...', 'WARN');
  const fallbackUrl = `${CFG.POLLINATIONS}${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
  
  try {
    const res = await get(fallbackUrl);
    if (res.status === 200 && res.body.length > 5000) {
      const fn = `${outPrefix}_pollinations_${Date.now()}.jpg`;
      return [saveB64(res.body.toString('base64'), fn)];
    }
  } catch (e) { log(`Pollinations fallback error: ${e.message}`, 'ERR'); }

  return null;
}

// ─────────────────────────────────────────────
// 2. IMAGE TO VIDEO (img2video)
// ─────────────────────────────────────────────
async function img2video({ imagePath, prompt = '', filter = 'none', duration = 5, ratio = '16:9', motion = 50 }) {
  const headers = await fwHeaders();
  log(`img2video | filter=${filter} | duration=${duration}s | ratio=${ratio}`);

  const imageB64 = fs.readFileSync(imagePath).toString('base64');
  const filterText = STYLES[filter] || '';
  const fullPrompt = [filterText, prompt].filter(Boolean).join(', ');

  // Try Fireworks SVD workflows
  const workflows = [
    'accounts/fireworks/models/stable-video-diffusion-img2vid-xt',
    'accounts/fireworks/models/stable-video-diffusion-img2vid',
  ];

  for (const wf of workflows) {
    const url = `${CFG.FIREWORKS_BASE}/workflows/${wf}`;
    const payload = {
      image: `data:image/jpeg;base64,${imageB64}`,
      prompt: fullPrompt || 'smooth cinematic motion',
      num_frames: duration * 8,
      motion_bucket_id: motion,
      fps: 8,
      aspect_ratio: ratio,
    };

    try {
      const res = await postJSON(url, payload, headers);
      if (res.status === 200 && res.json) {
        const videoUrl = res.json.video_url || res.json.url || res.json.output;
        if (videoUrl) {
          const dest = path.join(CFG.OUT_DIR, `video_${Date.now()}.mp4`);
          await downloadFile(videoUrl, dest);
          return dest;
        }
      }
      log(`Workflow ${wf} → HTTP ${res.status}`, 'WARN');
    } catch (e) { log(`Workflow error: ${e.message}`, 'WARN'); }
  }

  // Fallback: Wan2.2 high performance video space
  log('Falling back to Wan2.2 HuggingFace space...', 'WARN');
  return img2videoHF(imageB64, fullPrompt, motion);
}

async function img2videoHF(imageB64, prompt, motion) {
  const HF = 'https://zerogpu-aoti-wan2-2-fp8da-aoti-faster.hf.space';
  const HF_TOKEN = CFG.HF_KEY || process.env.HF_TOKEN || '';

  const reqStream = (urlStr) => {
    const parsed = new URL(urlStr);
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': HF,
          'Referer': HF + '/',
          'Authorization': 'Bearer ' + HF_TOKEN
        }
      };
      const request = https.get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
          if (body.includes('event: complete') || body.includes('event: error')) {
            resolve(body);
            request.destroy();
          }
        });
        res.on('end', () => {
          resolve(body);
        });
      });
      request.on('error', (e) => reject(e));
      request.setTimeout(180000, () => {
        resolve(body);
        request.destroy();
      });
    });
  };

  try {
    log('Uploading image to Wan2.2 space...');
    const upRes = await postMultipart(HF + '/gradio_api/upload', {}, {
      files: { filename: 'image.jpg', data: Buffer.from(imageB64, 'base64'), mime: 'image/jpeg' }
    }, {
      'Authorization': 'Bearer ' + HF_TOKEN,
      'Origin': HF,
      'Referer': HF + '/'
    });

    const uploaded = upRes.json?.[0] || null;
    if (!uploaded) {
      log('Wan2.2 upload failed: ' + upRes.body.toString().slice(0, 150), 'ERR');
      return null;
    }

    log('Submitting Wan2.2 generation job...');
    const callPayload = {
      data: [
        { path: uploaded, meta: { _type: 'gradio.FileData' } },
        prompt || "make this image come alive, cinematic motion, smooth animation",
        6,
        "Bright tones, overexposed, static, blurred details, worst quality",
        3.5,
        1.0,
        1.0,
        42,
        true
      ]
    };

    const callRes = await postJSON(HF + '/gradio_api/call/generate_video', callPayload, {
      'Authorization': 'Bearer ' + HF_TOKEN,
      'Origin': HF,
      'Referer': HF + '/'
    });

    let eventId;
    try { eventId = callRes.json?.event_id; } catch {}
    if (!eventId) {
      log('Wan2.2 job submission failed: ' + callRes.body.toString().slice(0, 200), 'ERR');
      return null;
    }
    log(`Wan2.2 Job Event: ${eventId}`, 'OK');

    log('Waiting for Wan2.2 generation to finish...');
    const resultText = await reqStream(HF + `/gradio_api/call/generate_video/${eventId}`);
    if (resultText.includes('event: complete')) {
      const lines = resultText.split('\n');
      const compIdx = lines.findIndex(l => l.includes('event: complete'));
      const dataLine = lines.slice(compIdx).find(l => l.startsWith('data:'));
      if (dataLine) {
        const parsed = JSON.parse(dataLine.slice(5));
        const fileOut = parsed?.[0];
        if (fileOut && fileOut.path) {
          const dest = path.join(CFG.OUT_DIR, `video_wan2_${Date.now()}.mp4`);
          await downloadFile(HF + '/gradio_api/file=' + fileOut.path, dest);
          return dest;
        }
      }
    }
    log('Wan2.2 generation failed or timed out', 'ERR');
  } catch (e) { log(`Wan2.2 error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// 3. IMAGE ENHANCEMENT & UPSCALING (enhance)
// ─────────────────────────────────────────────
async function enhanceImage({ imagePath, tool = 'upscale', scale = 2 }) {
  log(`enhance | tool=${tool} | file=${imagePath}`);
  
  const endpoint = CFG.UNWATERMARK + (CFG.FLUX_SCHEMAS[tool] || `/api/imgupscaler/v3/ai-image-${tool}/create-job`);

  try {
    const upRes = await postMultipart(endpoint, {}, {
      file: { filename: path.basename(imagePath), data: imagePath, mime: 'image/jpeg' }
    });
    log(`Upload: HTTP ${upRes.status}`);

    if (upRes.status === 200 && upRes.json) {
      const jobId = upRes.json.job_id || upRes.json.id;
      if (jobId) {
        log(`Enhance Job: ${jobId}`, 'OK');
        const pollEndpoint = `/api/imgupscaler/v3/ai-image-${tool}/get-job/`;
        const resultUrl = await pollJob(CFG.UNWATERMARK, pollEndpoint, jobId);
        if (resultUrl) {
          const dest = path.join(CFG.OUT_DIR, `${tool}_${Date.now()}.png`);
          return downloadFile(resultUrl, dest);
        }
      }
    }
  } catch (e) { log(`Upscaler error: ${e.message}`, 'WARN'); }

  log('imgupscaler failed/blocked -> falling back to CodeFormer upscaler...', 'WARN');
  return upscaleCodeFormer(imagePath, scale);
}

async function pollJob(base, endpoint, jobId, interval = 3000, maxTries = 30) {
  log(`Polling job status...`);
  for (let i = 0; i < maxTries; i++) {
    await sleep(interval);
    try {
      const res = await get(base + endpoint + jobId);
      if (res.status === 200 && res.json) {
        const status = res.json.status || res.json.state;
        const url = res.json.result_url || res.json.url || res.json.download_url;
        log(`Poll: ${status}`);
        if ((status === 'success' || status === 'completed') && url) return url;
        if (status === 'failed') break;
      }
    } catch {}
    process.stdout.write(`  processing: ${i * interval / 1000}s...\r`);
  }
  return null;
}

async function upscaleCodeFormer(imagePath, scale = 2) {
  const BASE = CFG.CODEFORMER;
  log('Calling CodeFormer upscaler fallback...');
  try {
    const upRes = await postMultipart(BASE + '/gradio_api/upload', {}, {
      files: { filename: path.basename(imagePath), data: imagePath, mime: 'image/jpeg' }
    });
    if (!upRes.json || !upRes.json[0]) {
      log('Upload to CodeFormer failed: ' + JSON.stringify(upRes.body.toString()), 'ERR');
      return null;
    }
    const uploadedPath = upRes.json[0];

    const payload = {
      data: [
        { path: uploadedPath, meta: { _type: 'gradio.FileData' } },
        true, // face_align
        true, // background_enhance
        true, // face_upsample
        Math.min(scale, 4), // upscale
        0.5 // codeformer_fidelity
      ]
    };
    const submit = await postJSON(BASE + '/gradio_api/call/inference', payload);
    if (!submit.json || !submit.json.event_id) {
      log('CodeFormer submission failed: ' + JSON.stringify(submit.body.toString()), 'ERR');
      return null;
    }
    const evtId = submit.json.event_id;

    for (let i = 0; i < 40; i++) {
      await sleep(3000);
      const poll = await get(`${BASE}/gradio_api/call/inference/${evtId}`);
      const txt = poll.body.toString();
      if (txt.includes('complete')) {
        const outUrl = txt.match(/data:\s*\[\s*\{\s*"path":\s*"([^"]+)"/);
        if (outUrl && outUrl[1]) {
          const finalUrl = `${BASE}/gradio_api/file=${outUrl[1]}`;
          const dest = path.join(CFG.OUT_DIR, `upscale_cf_${Date.now()}.png`);
          await downloadFile(finalUrl, dest);
          log('Upscale successful -> ' + dest, 'OK');
          return dest;
        }
      }
      if (txt.includes('error')) {
        log('CodeFormer processing error', 'ERR');
        break;
      }
    }
  } catch (e) { log(`CodeFormer error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// 4. VIDEO ENHANCEMENT & UPSCALING (hd-video)
// ─────────────────────────────────────────────
async function enhanceVideo({ videoPath }) {
  log(`hd-video | file=${videoPath}`);

  try {
    const upRes = await postMultipart(
      CFG.IMGUPSCALER + '/api/upscaler/v1/ai-video-enhancer/upload-video',
      {},
      { video: { filename: path.basename(videoPath), data: videoPath, mime: 'video/mp4' } }
    );
    log(`Upload: HTTP ${upRes.status}`);
    if (upRes.status === 200 && upRes.json) {
      const uploadId = upRes.json.job_id || upRes.json.id || upRes.json.file_id;
      log(`Upload ID: ${uploadId}`, 'OK');

      const createRes = await postJSON(
        CFG.IMGUPSCALER + '/api/upscaler/v1/ai-video-enhancer/create-job',
        { job_id: uploadId || '' }
      );
      const jobId = createRes.json?.job_id || createRes.json?.id || uploadId;
      if (jobId) {
        log(`Enhance job: ${jobId}`, 'OK');
        const resultUrl = await pollJob(
          CFG.IMGUPSCALER,
          '/api/upscaler/v1/ai-video-enhancer/get-job/',
          jobId, 5000, 80
        );
        if (resultUrl) {
          const dest = path.join(CFG.OUT_DIR, `hd_video_${Date.now()}.mp4`);
          return downloadFile(resultUrl, dest);
        }
      }
    }
  } catch (e) {
    log(`imgupscaler failed: ${e.message}`, 'WARN');
  }

  log('imgupscaler video enhancer failed -> falling back to HF video upscaler...', 'WARN');
  return upscaleVideoHF(videoPath);
}

async function upscaleVideoHF(videoPath) {
  const HF = 'https://lexiontik-video-upscaler.hf.space';
  
  const reqStream = (urlStr) => {
    const parsed = new URL(urlStr);
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': HF,
          'Referer': HF + '/'
        }
      };
      const request = https.get(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
          if (body.includes('event: complete') || body.includes('event: error')) {
            resolve(body);
            request.destroy();
          }
        });
        res.on('end', () => {
          resolve(body);
        });
      });
      request.on('error', (e) => reject(e));
      request.setTimeout(240000, () => {
        resolve(body);
        request.destroy();
      });
    });
  };

  try {
    log('Uploading video to HF upscaler space...');
    const upRes = await postMultipart(HF + '/gradio_api/upload', {}, {
      files: { filename: path.basename(videoPath), data: fs.readFileSync(videoPath), mime: 'video/mp4' }
    });

    const uploaded = upRes.json?.[0] || null;
    if (!uploaded) {
      log('HF video upload failed: ' + upRes.body.toString().slice(0, 150), 'ERR');
      return null;
    }

    log('Submitting video upscaler job...');
    const callPayload = {
      data: [
        { path: uploaded, meta: { _type: 'gradio.FileData' } },
        "R-ESRGAN AnimeVideo",
        false,
        1.0,
        true,
        192,
        8,
        2.0,
        8
      ]
    };

    const callRes = await postJSON(HF + '/gradio_api/call/start_upscaler', callPayload);
    let eventId;
    try { eventId = callRes.json?.event_id; } catch {}
    if (!eventId) {
      log('Video upscaler job submission failed', 'ERR');
      return null;
    }
    log(`Video upscaler Event: ${eventId}`, 'OK');

    log('Waiting for video upscaling to finish (may take up to 2-3 mins)...');
    const resultText = await reqStream(HF + `/gradio_api/call/start_upscaler/${eventId}`);
    if (resultText.includes('event: complete')) {
      const lines = resultText.split('\n');
      const compIdx = lines.findIndex(l => l.includes('event: complete'));
      const dataLine = lines.slice(compIdx).find(l => l.startsWith('data:'));
      if (dataLine) {
        const parsed = JSON.parse(dataLine.slice(5));
        const fileOut = parsed?.[0];
        if (fileOut && fileOut.path) {
          const dest = path.join(CFG.OUT_DIR, `hd_video_hf_${Date.now()}.mp4`);
          await downloadFile(HF + '/gradio_api/file=' + fileOut.path, dest);
          return dest;
        }
      }
    }
    log('Video upscaling failed or timed out', 'ERR');
  } catch (e) { log(`Video upscaler error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// 5. REMOVE BACKGROUND (rembg)
// ─────────────────────────────────────────────
async function removeBg({ imagePath }) {
  log('rembg | file=' + imagePath);
  const BASE = CFG.REMBG_SPACE;

  try {
    const upRes = await postMultipart(BASE + '/gradio_api/upload', {}, {
      files: { filename: path.basename(imagePath), data: imagePath, mime: 'image/jpeg' }
    });
    if (!upRes.json || !upRes.json[0]) { log('RMBG upload failed', 'ERR'); return null; }
    const uploadedPath = upRes.json[0];

    const callPayload = {
      data: [{ path: uploadedPath, meta: { _type: 'gradio.FileData' }, orig_name: path.basename(imagePath), mime_type: 'image/jpeg' }]
    };
    const callRes = await postJSON(BASE + '/gradio_api/call/image', callPayload);
    let eventId = callRes.json?.event_id;
    if (!eventId) { log('RMBG submission failed', 'ERR'); return null; }

    for (let i = 0; i < 25; i++) {
      await sleep(2000);
      const resultRes = await get(BASE + '/gradio_api/call/image/' + eventId);
      const txt = resultRes.body.toString();
      if (txt.includes('"complete"') || txt.includes('event: complete')) {
        const dataLine = txt.split('\n').find(l => l.startsWith('data:'));
        if (dataLine) {
          const parsed = JSON.parse(dataLine.slice(5));
          const fileOut = Array.isArray(parsed) ? parsed[1] : null;
          const outUrl = fileOut?.url || (fileOut?.path ? BASE + '/gradio_api/file=' + fileOut.path : null);
          if (outUrl) {
            const dest = path.join(CFG.OUT_DIR, `rembg_${Date.now()}.png`);
            return downloadFile(outUrl, dest);
          }
        }
      }
      process.stdout.write(`  rembg processing: ${i * 2}s...\r`);
    }
  } catch (e) { log(`RMBG error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// 6. PHOTO RETOUCH (retouch)
// ─────────────────────────────────────────────
async function retouchPhoto({ imagePath }) {
  log(`retouch | file=${imagePath}`);

  // Strategy 1: ImgLarger
  log('Trying imglarger retouch...');
  try {
    const upRes = await postMultipart(CFG.IMGLARGE_UP, {}, {
      file: { filename: path.basename(imagePath), data: imagePath, mime: 'image/jpeg' }
    });
    if (upRes.json?.code === 200 || upRes.json?.data) {
      const code = upRes.json?.data?.newCode || upRes.json?.newCode;
      if (code) {
        log(`Job code: ${code}`, 'OK');
        const finalUrl = await pollImglarger(code);
        if (finalUrl) {
          const dest = path.join(CFG.OUT_DIR, `retouch_${Date.now()}.jpg`);
          return downloadFile(finalUrl, dest);
        }
      }
    }
  } catch (e) { log(`imglarger retouch failed: ${e.message}`, 'WARN'); }

  // Strategy 2: CodeFormer HF
  log('Falling back to CodeFormer face restoration...', 'WARN');
  return upscaleCodeFormer(imagePath, 1); // 1x scale for restoration only
}

async function pollImglarger(code, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    await sleep(3000);
    try {
      const r = await postJSON(CFG.IMGLARGE_CHK, { newCode: code });
      if (r.json?.data?.status === 'success' || r.json?.data?.downloadUrl) {
        return r.json.data.downloadUrl;
      }
      if (r.json?.data?.status === 'failed') break;
    } catch {}
    process.stdout.write(`  retouch polling: ${i * 3}s...\r`);
  }
  return null;
}

// ─────────────────────────────────────────────
// 7. EDIT BY PROMPT (flux-edit)
// ─────────────────────────────────────────────
async function fluxEdit({ imagePath, prompt }) {
  log(`flux-edit | prompt="${prompt.slice(0, 50)}..."`);
  const imageB64 = fs.readFileSync(imagePath).toString('base64');

  // Strategy 1: Fireworks FLUX Kontext Pro
  try {
    const key = await getKey();
    const headers = fwHeaders(key);
    const payload = { prompt, image: imageB64, response_format: 'b64_json' };

    const submitRes = await postJSON(CFG.FLUX_KONTEXT, payload, headers);
    if (submitRes.status === 412 || submitRes.status === 403) {
      log('Fireworks key suspended → rotating key...', 'WARN');
      await rotateKey();
    } else if (submitRes.status === 200 && submitRes.json) {
      const inferenceId = submitRes.json.id;
      if (!inferenceId) {
        const b64 = submitRes.json?.images?.[0]?.url || submitRes.json?.output || '';
        if (b64) return saveB64(b64, `flux_edit_${Date.now()}.png`);
      } else {
        log(`FLUX Kontext job: ${inferenceId}`, 'OK');
        for (let i = 0; i < 40; i++) {
          await sleep(3000);
          const r = await get(`${CFG.FLUX_RESULT}?inference_id=${inferenceId}`, { Authorization: headers.Authorization });
          if (r.status === 200 && r.body) {
            const res = JSON.parse(r.body.toString());
            if (res.status === 'completed' && res.output) {
              return saveB64(res.output, `flux_edit_${Date.now()}.png`);
            }
            if (res.status === 'failed') break;
          }
          process.stdout.write(`  flux-edit: ${i * 3}s...\r`);
        }
      }
    }
  } catch (e) { log(`FLUX Kontext failed: ${e.message}`, 'WARN'); }

  // Strategy 2: Pollinations image modifier
  log('Falling back to Pollinations...', 'WARN');
  const encodedPrompt = encodeURIComponent(prompt + ', high quality, detailed edit');
  const fallbackUrl = `${CFG.POLLINATIONS}${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
  try {
    const res = await get(fallbackUrl);
    if (res.status === 200 && res.body.length > 1000) {
      return saveB64(res.body.toString('base64'), `flux_pollinations_${Date.now()}.jpg`);
    }
  } catch (e) { log(`Pollinations fallback failed: ${e.message}`, 'WARN'); }

  // Strategy 3: HF InstructPix2Pix
  log('Falling back to HuggingFace InstructPix2Pix...', 'WARN');
  return fluxEditHF(imagePath, prompt);
}

async function fluxEditHF(imagePath, prompt) {
  const BASE = 'https://timbrooks-instruct-pix2pix.hf.space';
  try {
    const upRes = await postMultipart(BASE + '/gradio_api/upload', {}, {
      files: { filename: path.basename(imagePath), data: imagePath, mime: 'image/jpeg' }
    });
    if (!upRes.json?.[0]) return null;
    const uploaded = upRes.json[0];

    const callPayload = {
      data: [
        { path: uploaded, meta: { _type: 'gradio.FileData' } },
        prompt,
        7.5, // image guidance
        7.5, // text guidance
        30,  // steps
        Math.floor(Math.random() * 9999)
      ]
    };
    const callRes = await postJSON(BASE + '/gradio_api/call/generate', callPayload);
    const eventId = callRes.json?.event_id;
    if (!eventId) return null;

    for (let i = 0; i < 30; i++) {
      await sleep(3000);
      const r = await get(BASE + '/gradio_api/call/generate/' + eventId);
      const txt = r.body.toString();
      if (txt.includes('event: complete')) {
        const dataLine = txt.split('\n').find(l => l.startsWith('data:'));
        if (dataLine) {
          const parsed = JSON.parse(dataLine.slice(5));
          const fileOut = parsed?.[0];
          if (fileOut && fileOut.path) {
            const dest = path.join(CFG.OUT_DIR, `flux_p2p_${Date.now()}.png`);
            return downloadFile(BASE + '/gradio_api/file=' + fileOut.path, dest);
          }
        }
      }
      process.stdout.write(`  pix2pix: ${i * 3}s...\r`);
    }
  } catch (e) { log(`InstructPix2Pix error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// 8. UNWATERMARK & OTHER
// ─────────────────────────────────────────────
async function removeWatermark({ imagePath }) {
  log(`unwatermark | file=${imagePath}`);
  const imageB64 = fs.readFileSync(imagePath).toString('base64');
  try {
    const res = await postJSON(`${CFG.UNWATERMARK}/remove`, { image: imageB64 });
    if (res.status === 200 && res.json) {
      const url = res.json.result_url || res.json.url;
      const b64 = res.json.image || res.json.output;
      if (url) {
        const dest = path.join(CFG.OUT_DIR, `unwatermark_${Date.now()}.jpg`);
        return downloadFile(url, dest);
      }
      if (b64) return saveB64(b64, `unwatermark_${Date.now()}.jpg`);
    }
  } catch (e) { log(`Unwatermark failed: ${e.message}`, 'ERR'); }
  return null;
}

async function img2img({ imagePath, prompt, strength = 0.75, steps = 30, style = '' }) {
  const headers = await fwHeaders();
  log(`img2img | strength=${strength} | style=${style}`);

  const imageB64 = fs.readFileSync(imagePath).toString('base64');
  const fullPrompt = (STYLES[style] || '') + prompt;
  const url = `${CFG.FIREWORKS_BASE}/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0`;

  const payload = {
    prompt: fullPrompt,
    negative_prompt: 'blurry, low quality, artifacts, distorted, ugly',
    image: imageB64,
    strength,
    steps,
    cfg_scale: 7.5,
    response_format: 'b64_json',
  };

  try {
    const res = await postJSON(url, payload, headers);
    if (res.status === 200 && res.json && res.json.data) {
      const b64 = res.json.data[0]?.b64_json;
      if (b64) return saveB64(b64, `img2img_${Date.now()}.jpg`);
    }
  } catch (e) { log(`img2img error: ${e.message}`, 'ERR'); }
  return null;
}

// ─────────────────────────────────────────────
// TEMP EMAIL HELPER
// ─────────────────────────────────────────────
async function createEmail() {
  try {
    const res = await get(CFG.TEMP_EMAIL + '/create');
    if (res.status === 200) {
      const d = JSON.parse(res.body.toString());
      const email = d.email || d.address;
      log(`Temp email created: ${email}`, 'OK');
      return email;
    }
  } catch (e) { log(`Email creation error: ${e.message}`, 'ERR'); }
  return null;
}

async function checkInbox(email) {
  try {
    const res = await get(`${CFG.TEMP_EMAIL}/inbox/${email}`);
    if (res.status === 200) {
      const msgs = JSON.parse(res.body.toString());
      log(`Inbox: ${msgs.length} message(s)`, 'OK');
      return msgs;
    }
  } catch (e) { log(`Email check error: ${e.message}`, 'ERR'); }
  return null;
}
loadKeyPool();
ensureOutputDir();

module.exports = {
  txt2img,
  img2video,
  enhanceImage,
  enhanceVideo,
  removeBg,
  retouchPhoto,
  fluxEdit,
  removeWatermark,
  img2img,
  createEmail,
  checkInbox,
  STYLES,
  MODELS
};