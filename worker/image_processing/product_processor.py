"""
ProductProcessor — processes Image #1 in each video group (the Shopee product screenshot).

Pipeline:
  1. Detect the leading black UI chrome (status/nav bars) and the first long black
     band after the content — crop them away so no black bars enter the square.
  2. Extract dominant edge colour of the remaining content for an adaptive background.
  3. Center-crop the content to a 1:1 square.
  4. Resize the square to 720×720 and centre it vertically on a 720×1280 canvas
     padded with the adaptive background colour.
  5. Return a confidence score (heuristic).

Robust to screenshots whose black bars are thicker/thinner than a fixed ratio:
the content band is detected from row brightness instead of hard-coded fractions.
"""
import os
import numpy as np
from PIL import Image


class ProductProcessor:
    TARGET_W = 720
    TARGET_H = 1280

    # A row is treated as "black chrome" when this fraction of its pixels is very dark.
    BLACK_ROW_DARK_FRAC = 0.85
    BLACK_PIXEL_THRESHOLD = 45

    def __init__(self, target_width: int = TARGET_W, target_height: int = TARGET_H):
        self.target_width  = target_width
        self.target_height = target_height

    # ─── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _dominant_edge_color(img_array: np.ndarray, margin: int = 0) -> tuple:
        """Return the median colour of the edge strips, sampled `margin` px inside."""
        h, w, _ = img_array.shape
        if margin <= 0:
            margin = max(6, int(0.03 * min(h, w)))
        margin = min(margin, (min(h, w) - 1) // 2) or 0

        edges = np.vstack([
            img_array[margin,        margin:w - margin, :3],
            img_array[h - 1 - margin, margin:w - margin, :3],
            img_array[margin:h - margin, margin,        :3],
            img_array[margin:h - margin, w - 1 - margin, :3],
        ])
        return tuple(np.median(edges, axis=0).astype(int).tolist())

    @classmethod
    def _content_band(cls, brightness: np.ndarray) -> tuple:
        """
        Find [start, end) rows of the main content band.

        Scans past leading black chrome to the first run of non-black rows that is
        long enough to be real content, then ends at the next long black band
        (internal bar or bottom chrome). Falls back to the full image when no
        meaningful black chrome is present.
        """
        h = brightness.shape[0]
        row_black = (brightness < cls.BLACK_PIXEL_THRESHOLD).mean(axis=1) >= cls.BLACK_ROW_DARK_FRAC
        min_run = max(20, h // 20)

        start = 0
        i = 0
        while i < h:
            if row_black[i]:
                i += 1
                continue
            j = i
            while j < h and not row_black[j]:
                j += 1
            if j - i >= min_run:
                start = i
                break
            i = j

        end = start
        while end < h and not row_black[end]:
            end += 1

        # Sanity: if band is degenerate, use the whole image.
        if end - start < max(40, h // 10):
            return 0, h
        return start, end

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

        # ── 1. Crop away black UI chrome / internal bars ────────────────────
        confidence = 0.70
        if self._is_portrait(w, h):
            brightness = np.array(img.convert("L"), dtype=np.float64)
            top, bottom = self._content_band(brightness)
            cropped = img.crop((0, top, w, bottom))
            if (top, bottom) != (0, h):
                confidence = 0.92
        else:
            # Landscape screenshot — don't crop, just fit
            cropped = img

        cw, ch = cropped.size

        # ── 2. Adaptive background colour from the content edges ────────────
        bg_color = self._dominant_edge_color(np.array(cropped))

        # ── 3. Center-crop to 1:1 square with 2px inset to remove edge artifacts ─
        side = min(cw, ch)
        inset = 2  # Remove 1-2px chrome residue from edges
        side = max(side - inset * 2, 1)
        left = (cw - side) // 2
        top_c = (ch - side) // 2
        square_cropped = cropped.crop((left, top_c, left + side, top_c + side))

        # ── 4. Canvas with adaptive background ──────────────────────────────
        canvas = Image.new("RGB", (self.target_width, self.target_height), color=bg_color)

        # ── 5. Scale square to 90% of canvas width, pad with bg_color ────────
        # 90% of 720 = 648px
        scale_ratio = 0.90
        content_w = int(self.target_width * scale_ratio)
        resized_square = square_cropped.resize(
            (content_w, content_w), Image.Resampling.LANCZOS
        )
        
        # Center pada canvas 720x1280
        paste_x = (self.target_width - content_w) // 2
        paste_y = (self.target_height - content_w) // 2
        canvas.paste(resized_square, (paste_x, paste_y))

        # ── 6. Save ──────────────────────────────────────────────────────────
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        canvas.save(output_path, format="JPEG", quality=95)

        return {
            "processed_path": output_path,
            "width":          self.target_width,
            "height":         self.target_height,
            "confidence":     confidence,
        }
