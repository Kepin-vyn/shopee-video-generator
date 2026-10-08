import cv2
import numpy as np
from PIL import Image

class ProductProcessor:
    """
    Processes Image #1 (Shopee Product Screenshot):
    1. Trims top navigation/status bar and bottom action bar if present.
    2. Extracts dominant background color.
    3. Creates a 1080x1920 canvas with the adaptive background color.
    4. Auto-positions product centered with proper padding.
    """
    def __init__(self, target_width: int = 1080, target_height: int = 1920):
        self.target_width = target_width
        self.target_height = target_height

    def process(self, image_path: str, output_path: str) -> dict:
        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        # Heuristic crop of top status/nav bar (~10%) and bottom action bar (~10%) if screenshot is vertical
        if h > w:
            top_crop = int(h * 0.08)
            bottom_crop = int(h * 0.88)
            cropped_img = img.crop((0, top_crop, w, bottom_crop))
        else:
            cropped_img = img

        cw, ch = cropped_img.size

        # Extract dominant background color from edge pixels
        np_crop = np.array(cropped_img)
        edge_pixels = np.vstack([
            np_crop[0, :, :],          # Top row
            np_crop[-1, :, :],         # Bottom row
            np_crop[:, 0, :],          # Left col
            np_crop[:, -1, :]          # Right col
        ])
        avg_color = tuple(np.median(edge_pixels, axis=0).astype(int))

        # Create canvas 1080x1920 filled with adaptive background
        canvas = Image.new("RGB", (self.target_width, self.target_height), color=avg_color)

        # Scale cropped image to fit within canvas with max 90% width and max 70% height
        max_w = int(self.target_width * 0.92)
        max_h = int(self.target_height * 0.75)

        scale = min(max_w / cw, max_h / ch)
        nw, nh = int(cw * scale), int(ch * scale)
        resized_img = cropped_img.resize((nw, nh), Image.Resampling.LANCZOS)

        # Center product on canvas
        pos_x = (self.target_width - nw) // 2
        pos_y = (self.target_height - nh) // 2
        canvas.paste(resized_img, (pos_x, pos_y))

        canvas.save(output_path, quality=95)

        return {
            "processed_path": output_path,
            "width": self.target_width,
            "height": self.target_height,
            "confidence": 0.95
        }
