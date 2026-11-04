import os
import uuid
import time
import json
import shutil
import cv2
import numpy as np
import queue
import threading
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from sr_engine import SuperResolutionEngine
from face_engine import FaceRestorationEngine
from wink_engine import WinkAestheticEngine
from bg_engine import BackgroundRemovalEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

app = FastAPI(
    title="LUMINA HD // AI Image Enhancer",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded and generated images
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/outputs", StaticFiles(directory=OUTPUTS_DIR), name="outputs")

FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

# Initialize engines
sr_engine = None
face_engine = None
bg_engine = None

@app.on_event("startup")
def startup_event():
    global sr_engine, face_engine, bg_engine
    try:
        sr_engine = SuperResolutionEngine()
    except Exception as e:
        print(f"[!] Warning: Could not initialize SR Engine: {e}")
    try:
        face_engine = FaceRestorationEngine()
    except Exception as e:
        print(f"[!] Warning: Could not initialize Face Engine: {e}")
    try:
        bg_engine = BackgroundRemovalEngine()
    except Exception as e:
        print(f"[!] Warning: Could not initialize BG Engine: {e}")

@app.get("/")
def serve_index():
    index_file = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "LUMINA HD AI Backend running. Frontend dist not built yet."}

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "sr_engine_ready": sr_engine is not None,
        "face_engine_ready": face_engine is not None,
        "bg_engine_ready": bg_engine is not None,
        "hardware": "Intel UHD Graphics (Vulkan) + Multi-Threaded ONNX (CPU)",
        "models": {
            "sr": ["realesr-animevideov3 (Turbo)", "realesrgan-x4plus-anime (Balanced)", "realesrgan-x4plus (Ultra)"],
            "face": "GFPGAN v1.4 + OpenCV YuNet",
            "bg": "Bria RMBG-1.4 ONNX (Auto Background Removal)"
        }
    }

class EnhanceRequest(BaseModel):
    image_id: str
    preset: Optional[str] = "turbo" # turbo, remini, wink, photo4k, anime, cutout, custom
    scale: Optional[int] = 4
    sr_model: Optional[str] = "realesr-animevideov3" # turbo default
    enable_face_restore: Optional[bool] = True
    face_strength: Optional[float] = 1.0
    clarity: Optional[float] = 0.35
    skin_smooth: Optional[float] = 0.2
    contrast: Optional[float] = 0.15
    vibrance: Optional[float] = 0.1
    remove_bg: Optional[bool] = False
    bg_type: Optional[str] = "transparent" # transparent, white, black, color, blur
    bg_color_hex: Optional[str] = "#ffffff"
    export_format: Optional[str] = "png" # png, jpg, webp

class RemoveBgRequest(BaseModel):
    image_id: Optional[str] = None
    filename: Optional[str] = None
    bg_type: Optional[str] = "transparent" # transparent, white, black, color, blur
    color_hex: Optional[str] = "#ffffff"
    export_format: Optional[str] = "png" # png, jpg, webp

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Harap unggah JPG, PNG, atau WebP.")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    img = cv2.imread(filepath)
    if img is None:
        os.remove(filepath)
        raise HTTPException(status_code=400, detail="Gambar tidak valid atau korup.")

    h, w = img.shape[:2]

    # Quick face count check
    face_count = 0
    if face_engine:
        faces = face_engine.detect_faces(img)
        face_count = len(faces) if faces is not None else 0

    return {
        "image_id": file_id,
        "filename": file.filename,
        "url": f"/uploads/{filename}",
        "width": w,
        "height": h,
        "faces_detected": face_count,
        "filesize": os.path.getsize(filepath)
    }

def process_pipeline(req: EnhanceRequest, emit_fn):
    """
    Core enhancement pipeline executing 4 distinct phases with real-time SSE emissions.
    emit_fn(phase_num, phase_percent, phase_status, detail, result=None)
    """
    start_time = time.time()
    
    # Locate original file
    matching_files = [f for f in os.listdir(UPLOADS_DIR) if f.startswith(req.image_id)]
    if not matching_files:
        raise ValueError("Gambar asli tidak ditemukan.")
    
    input_filename = matching_files[0]
    input_path = os.path.join(UPLOADS_DIR, input_filename)
    
    orig_img = cv2.imread(input_path)
    if orig_img is None:
        raise ValueError("Gagal membaca file gambar asli.")
        
    orig_h, orig_w = orig_img.shape[:2]

    # Preset logic & fast defaults
    scale = req.scale or 4
    sr_model = req.sr_model or "realesr-animevideov3"
    enable_face_restore = req.enable_face_restore
    face_strength = req.face_strength if req.face_strength is not None else 1.0
    clarity = req.clarity if req.clarity is not None else 0.35
    skin_smooth = req.skin_smooth if req.skin_smooth is not None else 0.2
    contrast = req.contrast if req.contrast is not None else 0.15
    vibrance = req.vibrance if req.vibrance is not None else 0.1
    remove_bg = False # Upscale pipeline strictly focuses on super-resolution & face enhancement

    if req.preset == "turbo":
        # Ultra-Fast 2-3 seconds: animevideov3 + Face Restore
        sr_model = "realesr-animevideov3"
        enable_face_restore = True
        face_strength = 0.95
        clarity = 0.3
        skin_smooth = 0.2
        contrast = 0.12
        vibrance = 0.12
    elif req.preset == "remini":
        # Remini HD: Deep Face Reconstruction + crisp super resolution
        sr_model = "realesr-animevideov3" # Extremely fast and razor sharp
        enable_face_restore = True
        face_strength = 1.0
        clarity = 0.4
        skin_smooth = 0.15
        contrast = 0.18
        vibrance = 0.15
    elif req.preset == "wink":
        # Wink Idol: Porcelain skin softening + vivid tone pop
        sr_model = "realesr-animevideov3"
        enable_face_restore = True
        face_strength = 0.85
        clarity = 0.3
        skin_smooth = 0.45
        contrast = 0.15
        vibrance = 0.22
    elif req.preset == "photo4k":
        # General landscape & photo upscaler
        sr_model = "realesr-animevideov3" if scale == 4 else "realesrgan-x4plus"
        enable_face_restore = False
        clarity = 0.3
        skin_smooth = 0.0
        contrast = 0.1
        vibrance = 0.05
    elif req.preset == "anime":
        # Anime illustrations
        sr_model = "realesrgan-x4plus-anime"
        enable_face_restore = False
        clarity = 0.2
        skin_smooth = 0.0
        contrast = 0.05
        vibrance = 0.15

    # ==========================================================
    # FASE 1 / 4: Analisis & Deteksi Wajah
    # ==========================================================
    emit_fn(1, 20, "running", "Memeriksa resolusi dan struktur gambar...")
    time.sleep(0.08)
    emit_fn(1, 60, "running", "OpenCV YuNet memindai 5 titik landmark wajah...")
    
    detected_faces = []
    if face_engine:
        faces = face_engine.detect_faces(orig_img)
        if faces is not None:
            detected_faces = faces

    face_count = len(detected_faces)
    face_desc = f"{face_count} wajah terdeteksi!" if face_count > 0 else "Objek umum terdeteksi (tanpa wajah)."
    emit_fn(1, 100, "done", f"Analisis selesai: {orig_w}×{orig_h} px • {face_desc}")

    # ==========================================================
    # FASE 2 / 4: Super-Resolution AI Upscaling
    # ==========================================================
    emit_fn(2, 5, "running", f"Memulai Real-ESRGAN Vulkan ({scale}x)...")
    temp_sr_output = os.path.join(OUTPUTS_DIR, f"temp_sr_{req.image_id}.png")

    def sr_progress_cb(pct):
        emit_fn(2, pct, "running", f"Akselerasi Intel Vulkan GPU memproses piksel ({pct}%)...")

    try:
        sr_engine.upscale(
            input_path=input_path,
            output_path=temp_sr_output,
            scale=scale,
            model_name=sr_model,
            progress_callback=sr_progress_cb
        )
        current_img = cv2.imread(temp_sr_output)
    except Exception as e:
        if os.path.exists(temp_sr_output):
            os.remove(temp_sr_output)
        raise RuntimeError(f"Gagal melakukan Super Resolution: {str(e)}")

    if os.path.exists(temp_sr_output):
        os.remove(temp_sr_output)

    emit_fn(2, 100, "done", f"Super-Resolution {scale}x selesai via GPU Vulkan!")

    # ==========================================================
    # FASE 3 / 4: Rekonstruksi Wajah HD (GFPGAN)
    # ==========================================================
    faces_enhanced = 0
    if enable_face_restore and face_engine is not None:
        emit_fn(3, 10, "running", "Memindai posisi wajah pada hasil upscaled...")
        
        detected_in_sr = face_engine.detect_faces(current_img)
        if detected_in_sr is not None and len(detected_in_sr) > 0:
            total_f = len(detected_in_sr)
            
            def face_progress_cb(pct, current_f, total_f):
                emit_fn(3, pct, "running", f"Merestorasi wajah {current_f}/{total_f}: iris mata, alis, & gigi ({pct}%)...")

            current_img = face_engine.restore_faces(
                current_img,
                face_strength=face_strength,
                progress_callback=face_progress_cb
            )
            faces_enhanced = total_f
            emit_fn(3, 100, "done", f"Restorasi selesai untuk {faces_enhanced} wajah dengan detail HD!")
        else:
            emit_fn(3, 100, "done", "Tidak ada wajah manusia yang perlu direstorasi.")
    else:
        emit_fn(3, 100, "done", "Restorasi wajah dilewati sesuai pengaturan mode.")

    # ==========================================================
    # FASE 4 / 4: Finishing Wink Beauty Glow & Auto Remove BG
    # ==========================================================
    emit_fn(4, 15, "running", "Mengaplikasikan filter kehalusan kulit & contrast...")
    
    def wink_progress_cb(pct):
        target_pct = int(15 + pct * 0.4) if remove_bg else pct
        emit_fn(4, target_pct, "running", f"Menyempurnakan micro-contrast & tone vibrance ({pct}%)...")

    current_img = WinkAestheticEngine.apply_aesthetic_polish(
        current_img,
        clarity=clarity,
        skin_smooth=skin_smooth,
        contrast=contrast,
        vibrance=vibrance,
        progress_callback=wink_progress_cb
    )

    # Background Removal jika diaktifkan
    if remove_bg and bg_engine is not None:
        def bg_cb(pct, status_text):
            emit_fn(4, int(55 + pct * 0.4), "running", f"AI RMBG: {status_text}")
        
        current_img, _ = bg_engine.remove_background(
            current_img,
            bg_type=bg_type,
            color_hex=bg_color_hex,
            progress_callback=bg_cb
        )

    # Save output
    out_ext = req.export_format.lower()
    is_transparent_result = (len(current_img.shape) > 2 and current_img.shape[2] == 4)
    if is_transparent_result:
        out_ext = "png"
    elif out_ext not in ["png", "jpg", "jpeg", "webp"]:
        out_ext = "png"
    if out_ext == "jpeg":
        out_ext = "jpg"

    output_filename = f"enhanced_{req.image_id}_{int(time.time())}.{out_ext}"
    output_path = os.path.join(OUTPUTS_DIR, output_filename)

    if out_ext in ["jpg", "jpeg"]:
        cv2.imwrite(output_path, current_img, [int(cv2.IMWRITE_JPEG_QUALITY), 96])
    elif out_ext == "webp":
        cv2.imwrite(output_path, current_img, [int(cv2.IMWRITE_WEBP_QUALITY), 96])
    else:
        cv2.imwrite(output_path, current_img, [int(cv2.IMWRITE_PNG_COMPRESSION), 3])

    cur_h, cur_w = current_img.shape[:2]
    elapsed = round(time.time() - start_time, 2)

    result_data = {
        "status": "success",
        "output_url": f"/outputs/{output_filename}",
        "original_url": f"/uploads/{input_filename}",
        "filename": output_filename,
        "original_width": orig_w,
        "original_height": orig_h,
        "enhanced_width": cur_w,
        "enhanced_height": cur_h,
        "scale": scale,
        "faces_enhanced": faces_enhanced,
        "bg_removed": remove_bg,
        "bg_type": bg_type if remove_bg else None,
        "is_transparent": is_transparent_result,
        "process_time_seconds": elapsed,
        "filesize": os.path.getsize(output_path)
    }

    emit_fn(4, 100, "done", f"Penyempurnaan selesai dalam {elapsed} detik!", result=result_data)
    return result_data

@app.post("/api/enhance/stream")
async def enhance_image_stream(req: EnhanceRequest):
    """
    Server-Sent Events endpoint streaming phase-by-phase 1-100% progress events.
    """
    event_queue = queue.Queue()

    def emit(phase, percent, status, detail, result=None):
        payload = {
            "phase": phase,
            "percent": percent,
            "status": status,
            "detail": detail,
            "result": result
        }
        event_queue.put(payload)

    def worker():
        try:
            process_pipeline(req, emit)
        except Exception as e:
            event_queue.put({
                "error": True,
                "message": str(e)
            })
        finally:
            event_queue.put(None) # Signal termination

    threading.Thread(target=worker, daemon=True).start()

    def event_generator():
        while True:
            try:
                item = event_queue.get(timeout=60)
            except queue.Empty:
                break
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/remove-bg")
def remove_background_endpoint(req: RemoveBgRequest):
    """
    Dedicated endpoint for instant AI background removal (~1s)
    Can be run directly on an uploaded image or an enhanced output image.
    """
    if bg_engine is None:
        raise HTTPException(status_code=500, detail="Model AI Hapus Background (RMBG-1.4) belum siap.")

    start_time = time.time()
    img_path = None

    if req.filename:
        # Check outputs first, then uploads
        candidate_out = os.path.join(OUTPUTS_DIR, req.filename)
        candidate_up = os.path.join(UPLOADS_DIR, req.filename)
        if os.path.exists(candidate_out):
            img_path = candidate_out
        elif os.path.exists(candidate_up):
            img_path = candidate_up

    if not img_path and req.image_id:
        matching = [f for f in os.listdir(UPLOADS_DIR) if f.startswith(req.image_id)]
        if matching:
            img_path = os.path.join(UPLOADS_DIR, matching[0])

    if not img_path or not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="File gambar tidak ditemukan.")

    # Read image (unchanged to check 3 or 4 channels)
    img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise HTTPException(status_code=400, detail="Gagal membaca gambar.")

    # If already RGBA, drop alpha before re-segmenting
    if len(img.shape) == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    orig_h, orig_w = img.shape[:2]
    bg_type = req.bg_type or "transparent"
    color_hex = req.color_hex or "#ffffff"

    out_img, _ = bg_engine.remove_background(
        img,
        bg_type=bg_type,
        color_hex=color_hex
    )

    is_transparent = (bg_type == "transparent") or (len(out_img.shape) > 2 and out_img.shape[2] == 4)
    if is_transparent:
        out_ext = "png"
    else:
        req_fmt = (req.export_format or "png").lower()
        if req_fmt in ["jpg", "jpeg"]:
            out_ext = "jpg"
        elif req_fmt == "webp":
            out_ext = "webp"
        else:
            out_ext = "png"

    file_prefix = req.image_id or os.path.splitext(os.path.basename(img_path))[0]
    output_filename = f"cutout_{file_prefix}_{int(time.time())}.{out_ext}"
    output_path = os.path.join(OUTPUTS_DIR, output_filename)

    if out_ext == "png":
        cv2.imwrite(output_path, out_img, [int(cv2.IMWRITE_PNG_COMPRESSION), 3])
    elif out_ext == "webp":
        cv2.imwrite(output_path, out_img, [int(cv2.IMWRITE_WEBP_QUALITY), 96])
    else:
        cv2.imwrite(output_path, out_img, [int(cv2.IMWRITE_JPEG_QUALITY), 96])

    elapsed = round(time.time() - start_time, 2)
    normalized_path = os.path.abspath(img_path)
    if normalized_path.startswith(os.path.abspath(UPLOADS_DIR)):
        original_rel = f"/uploads/{os.path.basename(img_path)}"
    else:
        original_rel = f"/outputs/{os.path.basename(img_path)}"

    return {
        "status": "success",
        "output_url": f"/outputs/{output_filename}",
        "original_url": original_rel,
        "filename": output_filename,
        "original_width": orig_w,
        "original_height": orig_h,
        "enhanced_width": orig_w,
        "enhanced_height": orig_h,
        "scale": 1,
        "faces_enhanced": 0,
        "bg_removed": True,
        "bg_type": bg_type,
        "is_transparent": is_transparent,
        "process_time_seconds": elapsed,
        "filesize": os.path.getsize(output_path)
    }

@app.post("/api/enhance")
def enhance_image_sync(req: EnhanceRequest):
    """Synchronous fallback endpoint"""
    def dummy_emit(*args, **kwargs):
        pass
    try:
        return process_pipeline(req, dummy_emit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/{full_path:path}")
async def serve_static_or_spa(full_path: str):
    """
    Catch-all route to serve files directly from frontend/dist (e.g. favicon.svg, icons.svg)
    and fallback to index.html for client-side navigation.
    """
    if os.path.exists(FRONTEND_DIST):
        target = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="File atau halaman tidak ditemukan.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
