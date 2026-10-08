import os
import subprocess
import logging
import imageio_ffmpeg

logger = logging.getLogger("ffmpeg_renderer")

class FFmpegRenderer:
    """
    Renders 4 images into a 1080x1920 MP4 video (~10 seconds)
    with Slide Left transitions between scenes and optional background audio.
    """
    def __init__(self, ffmpeg_bin: str = None):
        if ffmpeg_bin is None:
            try:
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                ffmpeg_bin = "ffmpeg"
        self.ffmpeg_bin = ffmpeg_bin

    def render_video(
        self,
        image_paths: list[str],
        output_path: str,
        audio_path: str = None,
        duration_per_image: float = 2.5,
        transition_duration: float = 0.5,
        fps: int = 30
    ) -> bool:
        """
        image_paths: list of 4 image file paths
        output_path: path to write final MP4
        audio_path: optional background audio path
        """
        if len(image_paths) != 4:
            raise ValueError(f"FFmpegRenderer requires exactly 4 images, got {len(image_paths)}")

        # Total duration = 4 * 2.5 = 10s
        total_duration = duration_per_image * 4
        offset1 = duration_per_image - (transition_duration / 2)  # 2.25s
        offset2 = offset1 + duration_per_image - transition_duration  # 4.25s -> simpler: offsets at 2.5, 5.0, 7.5
        
        # Offsets for 2.5s clips: offset=2.5, offset=5.0, offset=7.5
        offset1 = duration_per_image
        offset2 = duration_per_image * 2
        offset3 = duration_per_image * 3

        filter_complex = (
            f"[0:v]setpts=PTS-STARTPTS[v0];"
            f"[1:v]setpts=PTS-STARTPTS[v1];"
            f"[2:v]setpts=PTS-STARTPTS[v2];"
            f"[3:v]setpts=PTS-STARTPTS[v3];"
            f"[v0][v1]xfade=transition=slideleft:duration={transition_duration}:offset={offset1}[x1];"
            f"[x1][2:v]xfade=transition=slideleft:duration={transition_duration}:offset={offset2}[x2];"
            f"[x2][3:v]xfade=transition=slideleft:duration={transition_duration}:offset={offset3}[vout]"
        )

        cmd = [self.ffmpeg_bin, "-y"]
        # Loop each image for full duration (10s) so xfade has sufficient frames
        for img in image_paths:
            cmd.extend(["-framerate", str(fps), "-loop", "1", "-t", str(total_duration + 1.0), "-i", img])

        if audio_path and os.path.exists(audio_path):
            cmd.extend(["-i", audio_path])
            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", "4:a",
                "-t", str(total_duration),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                output_path
            ])
        else:
            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-t", str(total_duration),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                output_path
            ])

        try:
            logger.info(f"Running FFmpeg render: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg error output: {e.stderr}")
            raise RuntimeError(f"FFmpeg rendering failed: {e.stderr}")
