import cv2
import numpy as np
from typing import Callable, Optional

class WinkAestheticEngine:
    @staticmethod
    def apply_aesthetic_polish(
        img_bgr: np.ndarray,
        clarity: float = 0.3,       # 0.0 - 1.0 (unsharp mask sharpness)
        skin_smooth: float = 0.0,   # 0.0 - 1.0 (bilateral skin tone smoothing)
        contrast: float = 0.15,     # 0.0 - 1.0 (CLAHE micro-contrast)
        vibrance: float = 0.1,      # 0.0 - 1.0 (saturation boost)
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> np.ndarray:
        res = img_bgr.copy()

        if progress_callback:
            progress_callback(10)

        # 1. Skin Softening / Bilateral Filter
        if skin_smooth > 0.0:
            d = int(5 + skin_smooth * 6)
            sigma_color = int(20 + skin_smooth * 40)
            sigma_space = int(20 + skin_smooth * 40)
            smoothed = cv2.bilateralFilter(res, d, sigma_color, sigma_space)
            res = cv2.addWeighted(smoothed, skin_smooth, res, 1.0 - skin_smooth, 0)

        if progress_callback:
            progress_callback(40)

        # 2. Micro-Contrast via CLAHE on Lightness channel
        if contrast > 0.0:
            lab = cv2.cvtColor(res, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clip_limit = 1.0 + (contrast * 2.2)
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge((l, a, b))
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            res = cv2.addWeighted(enhanced, min(1.0, contrast * 1.2), res, 1.0 - min(1.0, contrast * 1.2), 0)

        if progress_callback:
            progress_callback(70)

        # 3. Vibrance / Saturation in HSV space
        if vibrance > 0.0:
            hsv = cv2.cvtColor(res, cv2.COLOR_BGR2HSV).astype(np.float32)
            h, s, v = cv2.split(hsv)
            boost = (1.0 - (s / 255.0)) * vibrance * 50.0
            s = np.clip(s + boost, 0, 255)
            hsv = cv2.merge((h, s, v))
            res = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

        # 4. Smart Unsharp Mask (High-pass sharpening)
        if clarity > 0.0:
            blurred = cv2.GaussianBlur(res, (0, 0), 2.0)
            sharp_amount = clarity * 1.1
            sharpened = cv2.addWeighted(res, 1.0 + sharp_amount, blurred, -sharp_amount, 0)
            res = np.clip(sharpened, 0, 255).astype(np.uint8)

        if progress_callback:
            progress_callback(100)

        return res
