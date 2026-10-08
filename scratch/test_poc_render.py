import os
import sys
from PIL import Image, ImageDraw

# Add workspace to sys.path
sys.path.insert(0, r"c:\shopee_video_generator")

from worker.image_processing.product_processor import ProductProcessor
from worker.image_processing.review_processor import ReviewProcessor
from worker.video_rendering.ffmpeg_renderer import FFmpegRenderer

def create_sample_images():
    os.makedirs(r"c:\shopee_video_generator\scratch\test_input", exist_ok=True)
    os.makedirs(r"c:\shopee_video_generator\scratch\test_output", exist_ok=True)

    # 1. Product Image
    img1 = Image.new("RGB", (720, 1280), color="#F8FAFC")
    draw1 = ImageDraw.Draw(img1)
    # Header bar
    draw1.rectangle([0, 0, 720, 100], fill="#EE4D2D") # Shopee Orange
    draw1.text((30, 35), "Shopee Mall", fill="white")
    # Product display
    draw1.rectangle([100, 200, 620, 720], fill="#3B82F6")
    draw1.text((220, 440), "SHOES SNEAKERS", fill="white")
    # Price
    draw1.text((100, 760), "Rp 299.000", fill="#EE4D2D")
    img1_path = r"c:\shopee_video_generator\scratch\test_input\01_product.png"
    img1.save(img1_path)

    # 2. Review 1
    img2 = Image.new("RGB", (720, 1280), color="#FFFFFF")
    draw2 = ImageDraw.Draw(img2)
    draw2.rectangle([20, 50, 700, 400], fill="#F1F5F9")
    draw2.text((40, 80), "User: Budi_Official *****", fill="#0F172A")
    draw2.text((40, 130), "Sepatunya bagus banget, empuk dipakai lari!", fill="#334155")
    draw2.text((40, 180), "Pengiriman super cepat 1 hari sampai.", fill="#334155")
    img2_path = r"c:\shopee_video_generator\scratch\test_input\02_review1.png"
    img2.save(img2_path)

    # 3. Review 2
    img3 = Image.new("RGB", (720, 1280), color="#FFFFFF")
    draw3 = ImageDraw.Draw(img3)
    draw3.rectangle([20, 50, 700, 400], fill="#F1F5F9")
    draw3.text((40, 80), "User: Siti_Ahmad *****", fill="#0F172A")
    draw3.text((40, 130), "Sesuai foto, ukurannya pas di kaki.", fill="#334155")
    draw3.text((40, 180), "Bakal langganan di toko ini.", fill="#334155")
    img3_path = r"c:\shopee_video_generator\scratch\test_input\03_review2.png"
    img3.save(img3_path)

    # 4. Review 3
    img4 = Image.new("RGB", (720, 1280), color="#FFFFFF")
    draw4 = ImageDraw.Draw(img4)
    draw4.rectangle([20, 50, 700, 400], fill="#F1F5F9")
    draw4.text((40, 80), "User: Rian_K *****", fill="#0F172A")
    draw4.text((40, 130), "Top banget kualitas barangnya!", fill="#334155")
    img4_path = r"c:\shopee_video_generator\scratch\test_input\04_review3.png"
    img4.save(img4_path)

    return [img1_path, img2_path, img3_path, img4_path]

def main():
    print("--- 1. Generating Sample Screenshots ---")
    inputs = create_sample_images()

    print("--- 2. Processing Images with ProductProcessor & ReviewProcessor ---")
    prod_proc = ProductProcessor()
    rev_proc = ReviewProcessor()

    p1 = prod_proc.process(inputs[0], r"c:\shopee_video_generator\scratch\test_output\proc_01.png")
    p2 = rev_proc.process(inputs[1], r"c:\shopee_video_generator\scratch\test_output\proc_02.png")
    p3 = rev_proc.process(inputs[2], r"c:\shopee_video_generator\scratch\test_output\proc_03.png")
    p4 = rev_proc.process(inputs[3], r"c:\shopee_video_generator\scratch\test_output\proc_04.png")

    processed_images = [p1["processed_path"], p2["processed_path"], p3["processed_path"], p4["processed_path"]]
    print("Processed images ready:", processed_images)

    print("--- 3. Rendering 9:16 Video with FFmpegRenderer ---")
    renderer = FFmpegRenderer()
    output_mp4 = r"c:\shopee_video_generator\scratch\test_output\test_video_output.mp4"
    success = renderer.render_video(processed_images, output_mp4)

    if success and os.path.exists(output_mp4):
        file_size = os.path.getsize(output_mp4)
        print(f"SUCCESS! Video created at: {output_mp4} ({file_size} bytes)")
    else:
        print("FAILED to create video.")

if __name__ == "__main__":
    main()
