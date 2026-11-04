import os
import cv2
import numpy as np
import onnxruntime as ort
from typing import Callable, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")
GFPGAN_PATH = os.path.join(BASE_DIR, "models", "GFPGANv1.4.onnx")

# Standard 5 landmarks for 512x512 FFHQ aligned face template
FFHQ_TEMPLATE_512 = np.array([
    [192.98138, 239.94708],  # left eye
    [318.90277, 240.20474],  # right eye
    [256.00000, 314.01935],  # nose tip
    [201.26117, 371.41043],  # left mouth
    [313.08905, 371.15118]   # right mouth
], dtype=np.float32)

class FaceRestorationEngine:
    def __init__(self, yunet_path=YUNET_PATH, gfpgan_path=GFPGAN_PATH):
        self.yunet_path = yunet_path
        self.gfpgan_path = gfpgan_path
        self.gfpgan_session = None
        self._init_session()

    def _init_session(self):
        if not os.path.exists(self.gfpgan_path):
            raise FileNotFoundError(f"GFPGAN model not found: {self.gfpgan_path}")
        
        # Optimize ONNX Runtime for all available CPU threads
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        thread_count = os.cpu_count() or 6
        opts.intra_op_num_threads = thread_count
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        
        self.gfpgan_session = ort.InferenceSession(
            self.gfpgan_path,
            sess_options=opts,
            providers=['CPUExecutionProvider']
        )
        self.input_name = self.gfpgan_session.get_inputs()[0].name
        self.output_name = self.gfpgan_session.get_outputs()[0].name

    def detect_faces(self, img_bgr: np.ndarray, score_threshold: float = 0.5):
        h, w = img_bgr.shape[:2]
        detector = cv2.FaceDetectorYN.create(
            self.yunet_path,
            "",
            (w, h),
            score_threshold=score_threshold,
            nms_threshold=0.3,
            top_k=5000
        )
        _, faces = detector.detect(img_bgr)
        return faces

    def create_soft_mask(self, size=(512, 512), border=24):
        mask = np.zeros(size, dtype=np.float32)
        center = (size[0] // 2, size[1] // 2)
        axes = ((size[0] - border * 2) // 2, (size[1] - border * 2) // 2)
        cv2.ellipse(mask, center, axes, 0, 0, 360, 1.0, -1)
        mask = cv2.GaussianBlur(mask, (border * 2 + 1, border * 2 + 1), border / 2)
        return np.clip(mask, 0.0, 1.0)[:, :, np.newaxis]

    def enhance_face_crop(self, face_bgr_512: np.ndarray) -> np.ndarray:
        face_rgb = cv2.cvtColor(face_bgr_512, cv2.COLOR_BGR2RGB)
        face_norm = (face_rgb.astype(np.float32) / 127.5) - 1.0
        blob = np.transpose(face_norm, (2, 0, 1))[np.newaxis, :, :, :].astype(np.float32)
        
        out = self.gfpgan_session.run([self.output_name], {self.input_name: blob})[0]
        
        out = out[0].transpose(1, 2, 0)
        out = (out * 0.5 + 0.5) * 255.0
        out = np.clip(out, 0, 255).astype(np.uint8)
        return cv2.cvtColor(out, cv2.COLOR_RGB2BGR)

    def restore_faces(
        self,
        img_bgr: np.ndarray,
        face_strength: float = 1.0,
        progress_callback: Optional[Callable[[int, int, int], None]] = None
    ) -> np.ndarray:
        """
        Detects, restores, and blends all faces back onto img_bgr.
        progress_callback: (percent, current_face_index, total_faces)
        """
        if face_strength <= 0:
            if progress_callback:
                progress_callback(100, 0, 0)
            return img_bgr
            
        faces = self.detect_faces(img_bgr)
        if faces is None or len(faces) == 0:
            if progress_callback:
                progress_callback(100, 0, 0)
            return img_bgr

        total_faces = len(faces)
        img_out = img_bgr.copy().astype(np.float32)
        soft_mask = self.create_soft_mask(size=(512, 512), border=32)
        h, w = img_bgr.shape[:2]

        for i, face in enumerate(faces):
            landmarks = face[4:14].reshape(5, 2)
            src_pts = np.array([
                landmarks[1], # left eye
                landmarks[0], # right eye
                landmarks[2], # nose tip
                landmarks[4], # left mouth
                landmarks[3]  # right mouth
            ], dtype=np.float32)

            affine_matrix, _ = cv2.estimateAffinePartial2D(src_pts, FFHQ_TEMPLATE_512)
            if affine_matrix is None:
                continue

            face_crop = cv2.warpAffine(img_bgr, affine_matrix, (512, 512), flags=cv2.INTER_LANCZOS4)
            restored_face = self.enhance_face_crop(face_crop)
            
            if face_strength < 1.0:
                restored_face = cv2.addWeighted(
                    restored_face, face_strength,
                    face_crop, 1.0 - face_strength,
                    0
                )

            inv_affine = cv2.invertAffineTransform(affine_matrix)

            warped_face = cv2.warpAffine(
                restored_face.astype(np.float32),
                inv_affine,
                (w, h),
                flags=cv2.INTER_LANCZOS4,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(0, 0, 0)
            )

            warped_mask = cv2.warpAffine(
                soft_mask,
                inv_affine,
                (w, h),
                flags=cv2.INTER_LANCZOS4,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=0
            )[:, :, np.newaxis]

            img_out = img_out * (1.0 - warped_mask) + warped_face * warped_mask

            if progress_callback:
                pct = int(((i + 1) / total_faces) * 100)
                progress_callback(pct, i + 1, total_faces)

        if progress_callback:
            progress_callback(100, total_faces, total_faces)

        return np.clip(img_out, 0, 255).astype(np.uint8)
