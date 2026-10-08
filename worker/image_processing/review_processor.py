"""
ReviewProcessor — processes Images #2, #3, #4 in each video group (review screenshots).

Strategy: letterbox-fit the screenshot onto a 1080×1920 canvas using the screenshot's
own edge colour as the background. No aggressive cropping — all review content must stay
visible (username, rating, text, photos).
"""
import os
import numpy as np
from PIL import Image


class ReviewProcessor:
    TARGET_W = 1080
    TARGET_H = 1920

    def __init__(self, target_width: int = TARGET_W, target_height: int = TARGET_H):
        self.target_width  = target_width
        self.target_height = target_height

    # ─── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _dominant_edge_color(img_array: np.ndarray) -> tuple:
        edges = np.vstack([
            img_array[0,  :, :3],
            img_array[-1, :, :3],
            img_array[:,  0, :3],
            img_array[:, -1, :3],
        ])
        return tuple(np.median(edges, axis=0).astype(int).tolist())

    # ─── public API ───────────────────────────────────────────────────────────

    def process(self, image_path: str, output_path: str) -> dict:
        """
        Fit a review screenshot onto a 1080×1920 canvas.

        Returns:
            dict with keys: processed_path, width, height
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Input image not found: {image_path}")

        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        # ── Adaptive background ────────────────────────────────────────────
        np_img   = np.array(img)
        bg_color = self._dominant_edge_color(np_img)

        # ── Canvas ────────────────────────────────────────────────────────
        canvas = Image.new("RGB", (self.target_width, self.target_height), color=bg_color)

        # ── Scale to fit (letterbox) ──────────────────────────────────────
        scale = min(self.target_width / w, self.target_height / h)
        nw, nh = int(w * scale), int(h * scale)
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)

        # ── Centre ────────────────────────────────────────────────────────
        pos_x = (self.target_width  - nw) // 2
        pos_y = (self.target_height - nh) // 2
        canvas.paste(resized, (pos_x, pos_y))

        # ── Save ──────────────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        canvas.save(output_path, format="JPEG", quality=95)

        return {
            "processed_path": output_path,
            "width":          self.target_width,
            "height":         self.target_height,
        }
