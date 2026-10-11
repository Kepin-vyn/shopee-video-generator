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
    TARGET_W = 720
    TARGET_H = 1280

    def __init__(self, target_width: int = TARGET_W, target_height: int = TARGET_H):
        self.target_width  = target_width
        self.target_height = target_height

    # ─── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _dominant_edge_color(img_array: np.ndarray) -> tuple:
        """Return the median colour of the edge strips (sampling 5px inside to avoid artifacts)."""
        h, w, _ = img_array.shape
        margin = 5
        if h <= margin * 2 or w <= margin * 2:
            margin = 0

        edges = np.vstack([
            img_array[margin,      margin:-margin, :3],
            img_array[-1-margin,   margin:-margin, :3],
            img_array[margin:-margin, margin,      :3],
            img_array[margin:-margin, -1-margin,   :3],
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

        # ── Scale to cover (fill canvas, crop overflow) ───────────────────
        scale = max(self.target_width / w, self.target_height / h)
        nw, nh = int(w * scale), int(h * scale)
        resized = img.resize((nw, nh), Image.Resampling.LANCZOS)

        # ── Centre and crop ───────────────────────────────────────────────
        pos_x = (nw - self.target_width) // 2
        pos_y = (nh - self.target_height) // 2
        cropped = resized.crop((pos_x, pos_y, pos_x + self.target_width, pos_y + self.target_height))
        canvas.paste(cropped, (0, 0))

        # ── Save ──────────────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        canvas.save(output_path, format="JPEG", quality=95)

        return {
            "processed_path": output_path,
            "width":          self.target_width,
            "height":         self.target_height,
        }
