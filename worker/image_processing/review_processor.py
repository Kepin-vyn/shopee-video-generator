import numpy as np
from PIL import Image

class ReviewProcessor:
    """
    Processes Images #2, #3, #4 (Shopee Review Screenshots):
    1. Fits screenshot to 1080x1920 without aggressive cropping.
    2. Preserves text, rating, username, and review photos.
    3. Uses adaptive letterbox background color from screenshot edges.
    """
    def __init__(self, target_width: int = 1080, target_height: int = 1920):
        self.target_width = target_width
        self.target_height = target_height

    def process(self, image_path: str, output_path: str) -> dict:
        img = Image.open(image_path).convert("RGB")
        w, h = img.size

        # Extract background color from borders
        np_img = np.array(img)
        edge_pixels = np.vstack([
            np_img[0, :, :],
            np_img[-1, :, :],
            np_img[:, 0, :],
            np_img[:, -1, :]
        ])
        avg_color = tuple(np.median(edge_pixels, axis=0).astype(int))

        # Create canvas
        canvas = Image.new("RGB", (self.target_width, self.target_height), color=avg_color)

        # Fit image onto canvas while preserving aspect ratio
        scale = min(self.target_width / w, self.target_height / h)
        nw, nh = int(w * scale), int(h * scale)
        resized_img = img.resize((nw, nh), Image.Resampling.LANCZOS)

        # Center on canvas
        pos_x = (self.target_width - nw) // 2
        pos_y = (self.target_height - nh) // 2
        canvas.paste(resized_img, (pos_x, pos_y))

        canvas.save(output_path, quality=95)

        return {
            "processed_path": output_path,
            "width": self.target_width,
            "height": self.target_height
        }
