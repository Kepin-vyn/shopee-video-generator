import os
import subprocess
import logging
import imageio_ffmpeg

logger = logging.getLogger("ffmpeg_renderer")

class FFmpegRenderer:
    """
    Renders 4 images into a 1080x1920 MP4 video (~10 seconds)
    with Slide Left transitions (zoompan + overlay method) and optional audio.

    Strategy: convert each still image into a timed video clip at constant FPS,
    then concatenate with xfade transitions.
    This avoids the '1/0 frame rate' issue with loop inputs directly in xfade.
    """
    def __init__(self, ffmpeg_bin: str = None):
        if ffmpeg_bin is None:
            try:
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                ffmpeg_bin = "ffmpeg"
        self.ffmpeg_bin = ffmpeg_bin

    def _make_clip(self, img_path: str, clip_path: str, duration: float, fps: int = 25) -> bool:
        """Convert a still image to a constant-fps video clip."""
        n_frames = int(duration * fps)
        cmd = [
            self.ffmpeg_bin, "-y",
            "-loop", "1",
            "-i", img_path,
            "-vf", (
                f"scale=1080:1920:force_original_aspect_ratio=decrease,"
                f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,"
                f"format=yuv420p"
            ),
            "-t", str(duration),
            "-r", str(fps),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-an",
            clip_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"Clip creation failed for {img_path}:\n{result.stderr[-1500:]}")
        return True

    def render_video(
        self,
        image_paths: list[str],
        output_path: str,
        audio_path: str = None,
        duration_per_image: float = 2.5,
        transition_duration: float = 0.5,
        fps: int = 25
    ) -> bool:
        """
        image_paths: list of 4 image file paths (JPEG/PNG/WEBP)
        output_path: path to write final MP4
        audio_path: optional background audio path
        """
        if len(image_paths) != 4:
            raise ValueError(f"FFmpegRenderer requires exactly 4 images, got {len(image_paths)}")

        total_duration = duration_per_image * 4  # 10s
        td = transition_duration

        # Step 1: Convert each still image to a short constant-fps clip
        tmp_dir = os.path.dirname(output_path)
        clip_paths = []
        for i, img in enumerate(image_paths):
            clip_path = os.path.join(tmp_dir, f"_tmp_clip_{i}.mp4")
            self._make_clip(img, clip_path, duration=duration_per_image + td, fps=fps)
            clip_paths.append(clip_path)

        # Step 2: Chain xfade transitions between clips
        # offsets: when each transition begins (in output timeline)
        o1 = duration_per_image - td / 2
        o2 = o1 + duration_per_image - td / 2
        o3 = o2 + duration_per_image - td / 2

        filter_complex = (
            f"[0:v][1:v]xfade=transition=slideleft:duration={td}:offset={o1:.4f}[x1];"
            f"[x1][2:v]xfade=transition=slideleft:duration={td}:offset={o2:.4f}[x2];"
            f"[x2][3:v]xfade=transition=slideleft:duration={td}:offset={o3:.4f}[vout]"
        )

        # Step 3: Compose final video with audio
        cmd = [self.ffmpeg_bin, "-y"]
        for cp in clip_paths:
            cmd.extend(["-i", cp])

        if audio_path and os.path.exists(audio_path):
            cmd.extend(["-i", audio_path])
            audio_idx = len(clip_paths)
            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-map", f"{audio_idx}:a",
                "-t", str(total_duration),
                "-c:v", "libx264",
                "-preset", "fast",
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
                "-preset", "fast",
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                output_path
            ])

        try:
            logger.info(f"Compositing final video: {output_path}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Render complete: {output_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg composite failed:\n{e.stderr[-3000:]}")
            raise RuntimeError(f"FFmpeg rendering failed: {e.stderr[-2000:]}")
        finally:
            # Cleanup temp clips
            for cp in clip_paths:
                if os.path.exists(cp):
                    try:
                        os.remove(cp)
                    except Exception:
                        pass
