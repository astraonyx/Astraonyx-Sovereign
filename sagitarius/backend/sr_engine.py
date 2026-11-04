import os
import subprocess
import re
from PIL import Image
from typing import Callable, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_EXE = os.path.join(BASE_DIR, "bin", "realesrgan-ncnn-vulkan.exe")
MODELS_DIR = os.path.join(BASE_DIR, "bin", "models")

class SuperResolutionEngine:
    def __init__(self, exe_path=BIN_EXE, models_dir=MODELS_DIR):
        self.exe_path = exe_path
        self.models_dir = models_dir
        if not os.path.exists(self.exe_path):
            raise FileNotFoundError(f"Real-ESRGAN binary not found at: {self.exe_path}")

    def upscale(
        self,
        input_path: str,
        output_path: str,
        scale: int = 4,
        model_name: str = "realesr-animevideov3",
        tile_size: int = 0,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> str:
        """
        Runs Real-ESRGAN NCNN Vulkan upscale with multi-threading and real-time progress.
        model_name options:
          - 'realesr-animevideov3': Ultra-fast (1.3s), ultra-sharp edges, perfect for Turbo & Remini
          - 'realesrgan-x4plus-anime': Balanced (5s)
          - 'realesrgan-x4plus': Ultra quality photorealistic (heavier)
        """
        scale = max(2, min(4, int(scale)))
        
        # Auto tile size for stable Vulkan memory on integrated GPUs
        if tile_size <= 0:
            try:
                with Image.open(input_path) as im:
                    max_dim = max(im.size)
                    if max_dim > 500:
                        tile_size = 256
            except Exception:
                tile_size = 256

        # Build command with multi-threaded load/proc/save (-j 2:2:2)
        cmd = [
            self.exe_path,
            "-i", os.path.abspath(input_path),
            "-o", os.path.abspath(output_path),
            "-n", model_name,
            "-s", str(scale),
            "-m", os.path.abspath(self.models_dir),
            "-j", "2:2:2"
        ]
        
        if tile_size > 0:
            cmd.extend(["-t", str(tile_size)])
            
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        percent_pattern = re.compile(r"(\d+)[,\.]\d+%")
        
        for line in proc.stdout:
            line = line.strip()
            match = percent_pattern.search(line)
            if match and progress_callback:
                try:
                    pct = int(match.group(1))
                    progress_callback(min(100, max(0, pct)))
                except Exception:
                    pass
                    
        proc.wait()
        
        if proc.returncode != 0:
            raise RuntimeError(f"Real-ESRGAN failed with code {proc.returncode}")
            
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError(f"Real-ESRGAN finished without generating output file: {output_path}")
            
        if progress_callback:
            progress_callback(100)
            
        return output_path
