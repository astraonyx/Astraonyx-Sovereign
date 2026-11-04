import os
import sys
import zipfile
import urllib.request
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(BASE_DIR, "bin")
MODELS_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(BIN_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

def download_file(url, target_path, label=""):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1024:
        print(f"[OK] {label or target_path} already exists ({os.path.getsize(target_path)/(1024*1024):.2f} MB). Skipping.")
        return target_path

    print(f"[*] Downloading {label or url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    temp_path = target_path + ".tmp"
    
    with urllib.request.urlopen(req) as resp, open(temp_path, "wb") as out_file:
        total_size = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024 # 1MB
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = downloaded * 100 / total_size
                print(f"\r    {downloaded/(1024*1024):.1f}/{total_size/(1024*1024):.1f} MB ({percent:.1f}%)", end="", flush=True)
            else:
                print(f"\r    {downloaded/(1024*1024):.1f} MB", end="", flush=True)
        print()
    os.replace(temp_path, target_path)
    print(f"[+] Finished {label or target_path}")
    return target_path

def setup_realesrgan():
    zip_path = os.path.join(BIN_DIR, "realesrgan-ncnn-vulkan.zip")
    exe_path = os.path.join(BIN_DIR, "realesrgan-ncnn-vulkan.exe")
    
    if not os.path.exists(exe_path):
        url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip"
        download_file(url, zip_path, "Real-ESRGAN NCNN Vulkan binary package")
        print("[*] Extracting Real-ESRGAN package...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(BIN_DIR)
        print("[+] Extracted Real-ESRGAN successfully.")
        
    # Verify exe
    if os.path.exists(exe_path):
        print(f"[OK] Real-ESRGAN executable verified at: {exe_path}")
    else:
        print("[!] Warning: realesrgan-ncnn-vulkan.exe not found directly in bin, searching subdirectories...")
        for root, dirs, files in os.walk(BIN_DIR):
            for file in files:
                if file.lower() == "realesrgan-ncnn-vulkan.exe":
                    found = os.path.join(root, file)
                    shutil.move(found, exe_path)
                    print(f"[+] Moved {found} to {exe_path}")
                    break

def setup_face_detector():
    yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    yunet_path = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
    download_file(yunet_url, yunet_path, "OpenCV YuNet Face Detector")

def setup_gfpgan():
    gfpgan_url = "https://huggingface.co/Nayefleb/deepfake/resolve/main/GFPGANv1.4.onnx"
    gfpgan_path = os.path.join(MODELS_DIR, "GFPGANv1.4.onnx")
    download_file(gfpgan_url, gfpgan_path, "GFPGAN v1.4 ONNX Face Restoration Model")

def setup_rmbg():
    rmbg_url = "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model.onnx"
    rmbg_path = os.path.join(MODELS_DIR, "rmbg-1.4.onnx")
    download_file(rmbg_url, rmbg_path, "Bria RMBG-1.4 Background Removal Model")

if __name__ == "__main__":
    print("=== DOWNLOADING AI ASSETS & BINARIES ===")
    setup_realesrgan()
    setup_face_detector()
    setup_gfpgan()
    setup_rmbg()
    print("=== ALL ASSETS READY ===")
