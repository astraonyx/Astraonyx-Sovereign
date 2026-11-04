import os
import cv2
import numpy as np
import onnxruntime as ort
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
RMBG_MODEL_PATH = os.path.join(MODELS_DIR, "rmbg-1.4.onnx")

class BackgroundRemovalEngine:
    def __init__(self, model_path: str = RMBG_MODEL_PATH):
        self.model_path = model_path
        self.session = None
        self._init_session()

    def _init_session(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model RMBG-1.4 tidak ditemukan di: {self.model_path}")

        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.intra_op_num_threads = min(8, os.cpu_count() or 4)

        # Available providers
        available = ort.get_available_providers()
        providers = ["CPUExecutionProvider"]
        if "CUDAExecutionProvider" in available:
            providers.insert(0, "CUDAExecutionProvider")

        self.session = ort.InferenceSession(
            self.model_path,
            sess_options=sess_options,
            providers=providers
        )
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name
        print(f"[OK] BackgroundRemovalEngine initialized successfully with model: {self.model_path}")

    @staticmethod
    def hex_to_bgr(hex_code: str):
        """Convert '#RRGGBB' to (B, G, R) tuple"""
        hex_code = hex_code.lstrip("#")
        if len(hex_code) == 3:
            hex_code = "".join([c * 2 for c in hex_code])
        if len(hex_code) != 6:
            return (255, 255, 255)
        r = int(hex_code[0:2], 16)
        g = int(hex_code[2:4], 16)
        b = int(hex_code[4:6], 16)
        return (b, g, r)

    def generate_mask(self, img_bgr: np.ndarray, progress_callback=None) -> np.ndarray:
        """
        Generate high-resolution alpha mask [0.0 - 1.0] from BGR image.
        """
        orig_h, orig_w = img_bgr.shape[:2]

        if progress_callback:
            progress_callback(25, "Menyiapkan input & normalisasi model RMBG...")

        # Convert to RGB & resize to 1024x1024
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(img_rgb, (1024, 1024), interpolation=cv2.INTER_LINEAR)

        # Normalize with mean [0.5, 0.5, 0.5] and std [1.0, 1.0, 1.0]
        tensor = resized.astype(np.float32) / 255.0
        tensor = (tensor - np.array([0.5, 0.5, 0.5], dtype=np.float32)) / np.array([1.0, 1.0, 1.0], dtype=np.float32)
        tensor = np.transpose(tensor, (2, 0, 1))
        tensor = np.expand_dims(tensor, 0)

        if progress_callback:
            progress_callback(55, "Inferensi AI RMBG-1.4 mengekstrak subjek & rambut...")

        outputs = self.session.run([self.output_name], {self.input_name: tensor})
        pred_mask = outputs[0][0, 0] # (1024, 1024)

        if progress_callback:
            progress_callback(85, "Menghaluskan kontur tepi & anti-aliasing...")

        # Min-max normalization
        min_val = float(pred_mask.min())
        max_val = float(pred_mask.max())
        if max_val - min_val > 1e-6:
            pred_mask = (pred_mask - min_val) / (max_val - min_val)
        else:
            pred_mask = np.zeros_like(pred_mask)

        # Resize mask back to original image size
        mask_full = cv2.resize(pred_mask, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        mask_full = np.clip(mask_full, 0.0, 1.0)
        return mask_full

    def remove_background(
        self,
        img_bgr: np.ndarray,
        bg_type: str = "transparent",
        color_hex: str = "#ffffff",
        progress_callback=None
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Remove background and composite based on bg_type:
        - 'transparent': returns 4-channel BGRA image with transparent background
        - 'white': composites on pure white background (BGR)
        - 'black': composites on pure black background (BGR)
        - 'color': composites on specified hex color (BGR)
        - 'blur': creates DSLR portrait bokeh by heavily blurring original background
        """
        orig_h, orig_w = img_bgr.shape[:2]
        mask = self.generate_mask(img_bgr, progress_callback=progress_callback)

        alpha_3d = np.repeat(mask[:, :, np.newaxis], 3, axis=2)

        if bg_type == "transparent":
            bgra = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2BGRA)
            bgra[:, :, 3] = (mask * 255).astype(np.uint8)
            if progress_callback:
                progress_callback(100, "Background transparan siap!")
            return bgra, mask

        elif bg_type == "blur":
            if progress_callback:
                progress_callback(92, "Menerapkan efek bokeh DSLR pada latar belakang...")
            # Gaussian blur on original background
            ksize = max(31, (min(orig_w, orig_h) // 30) | 1)
            blurred_bg = cv2.GaussianBlur(img_bgr, (ksize, ksize), 0)
            composited = (img_bgr.astype(np.float32) * alpha_3d + blurred_bg.astype(np.float32) * (1.0 - alpha_3d)).astype(np.uint8)
            if progress_callback:
                progress_callback(100, "Latar belakang blur portrait siap!")
            return composited, mask

        else:
            # Solid color background (white, black, or custom hex)
            if bg_type == "white":
                target_bgr = (255, 255, 255)
            elif bg_type == "black":
                target_bgr = (0, 0, 0)
            else:
                target_bgr = self.hex_to_bgr(color_hex)

            if progress_callback:
                progress_callback(92, f"Mengaplikasikan warna latar belakang baru...")

            bg_layer = np.full((orig_h, orig_w, 3), target_bgr, dtype=np.uint8)
            composited = (img_bgr.astype(np.float32) * alpha_3d + bg_layer.astype(np.float32) * (1.0 - alpha_3d)).astype(np.uint8)
            if progress_callback:
                progress_callback(100, "Penggantian warna background selesai!")
            return composited, mask
