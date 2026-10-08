"""
ProductProcessor — processes Image #1 in each video group (the Shopee product screenshot).

Pipeline:
  1. Detect and crop top (status/nav bar) and bottom (action bar) UI chrome.
  2. Extract dominant edge colour for adaptive background.
  3. Place the cropped product onto a 1080×1920 canvas with the adaptive colour.
  4. Centre the product with proportional padding.
  5. Return a confidence score (heuristic).
"""
import os
import numpy as np
from PIL import Image


class ProductProcessor:
    TARGET_W = 1080
    TARGET_H = 1920

    # How much to crop from top / bottom as a fraction of image height
    # when the screenshot is taller than it is wide (portrait = phone screenshot)
    TOP_CROP_RATIO    = 0.08   # ~status bar + nav bar
    BOTTOM_CROP_RATIO = 0.10   # ~bottom action bar / home indicator

    # Maximum size the product occupies on the canvas
    MAX_CONTENT_W_RATIO = 0.92
    MAX_CONTENT_H_RATIO = 0.78

    def __init__(self, target_width: int = TARGET_W, target_height: int = TARGET_H):
        self.target_width  = target_width
        self.target_height = target_height

    # ─── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _dominant_edge_color(img_array: np.ndarray) -> tuple:
        """Return the median colour of the 4 edge strips of an image array."""
        edges = np.vstack([
            img_array[0,  :, :3],   # top row
            img_array[-1, :, :3],   # bottom row
            img_array[:,  0, :3],   # left column
            img_array[:, -1, :3],   # right column
        ])
        return tuple(np.median(edges, axis=0).astype(int).tolist())

    @staticmethod
    def _is_portrait(w: int, h: int) -> bool:
        return h > w

    # ─── public API ───────────────────────────────────────────────────────────

    def process(self, image_path: str, output_path: str) -> dict:
        """
        Process one product screenshot.

        Returns:
            dict with keys: processed_path, width, height, confidence
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Input image not found: {image_path}")

        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        # ── 1. UI chrome crop ──────────────────────────────────────────────
        confidence = 0.70
        if self._is_portrait(w, h):
            top_px    = int(h * self.TOP_CROP_RATIO)
            bottom_px = int(h * (1.0 - self.BOTTOM_CROP_RATIO))
            cropped   = img.crop((0, top_px, w, bottom_px))
            confidence = 0.92
        else:
            # Landscape screenshot — don't crop, just fit
            cropped = img

        cw, ch = cropped.size

        # ── 2. Adaptive background colour ─────────────────────────────────
        np_crop  = np.array(cropped)
        bg_color = self._dominant_edge_color(np_crop)

        # ── 3. Canvas ─────────────────────────────────────────────────────
        canvas = Image.new("RGB", (self.target_width, self.target_height), color=bg_color)

        # ── 4. Scale & centre ─────────────────────────────────────────────
        max_w = int(self.target_width  * self.MAX_CONTENT_W_RATIO)
        max_h = int(self.target_height * self.MAX_CONTENT_H_RATIO)
        scale = min(max_w / cw, max_h / ch)
        nw, nh = int(cw * scale), int(ch * scale)

        resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
        pos_x   = (self.target_width  - nw) // 2
        pos_y   = (self.target_height - nh) // 2
        canvas.paste(resized, (pos_x, pos_y))

        # ── 5. Save ───────────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        canvas.save(output_path, format="JPEG", quality=95)

        return {
            "processed_path": output_path,
            "width":          self.target_width,
            "height":         self.target_height,
            "confidence":     confidence,
        }
