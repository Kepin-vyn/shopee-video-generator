"""
FFmpegRenderer — renders 4 processed images into a 1080x1920 MP4 (~10 seconds)
with Slide-Left xfade transitions and optional background audio.

Strategy:
  1. Convert each still image to a timed constant-fps clip (avoids 1/0 frame-rate issue).
  2. Chain xfade slideleft transitions between the 4 clips.
  3. Mix in audio if provided, trimmed to total video duration.
"""
import os
import subprocess
import logging
import imageio_ffmpeg

logger = logging.getLogger("ffmpeg_renderer")


class FFmpegRenderer:
    def __init__(self, ffmpeg_bin: str = None):
        if ffmpeg_bin is None:
            try:
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                ffmpeg_bin = "ffmpeg"
        self.ffmpeg_bin = ffmpeg_bin

    # ─── Internal helpers ────────────────────────────────────────────────────

    def _run(self, cmd: list, context: str = "") -> None:
        """Run an FFmpeg command, raising RuntimeError with stderr on failure."""
        logger.debug("FFmpeg cmd: %s", " ".join(cmd))
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            tail = result.stderr[-2000:]
            raise RuntimeError(f"FFmpeg failed [{context}]:\n{tail}")

    def _make_clip(
        self,
        img_path: str,
        clip_path: str,
        duration: float,
        fps: int = 25,
    ) -> None:
        """
        Convert a still JPEG/PNG/WEBP to a constant-fps H.264 clip.
        The image is scaled to fit 1080×1920 with black padding (no stretching).
        """
        cmd = [
            self.ffmpeg_bin, "-y",
            "-loop", "1",
            "-i", img_path,
            "-vf", (
                "scale=1080:1920:force_original_aspect_ratio=decrease,"
                "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,"
                "format=yuv420p"          # explicit → avoids yuvj420p warning
            ),
            "-t", str(duration),
            "-r", str(fps),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-pix_fmt", "yuv420p",
            "-an",
            clip_path,
        ]
        self._run(cmd, context=f"make_clip({os.path.basename(img_path)})")

    # ─── Public API ──────────────────────────────────────────────────────────

    def render_video(
        self,
        image_paths: list,
        output_path: str,
        audio_path: str = None,
        duration_per_image: float = 2.5,
        transition_duration: float = 0.5,
        fps: int = 25,
    ) -> bool:
        """
        Render 4 images into a single MP4.

        Args:
            image_paths:         Exactly 4 processed image paths.
            output_path:         Destination MP4 path.
            audio_path:          Optional background music path.
            duration_per_image:  Seconds each image is visible (default 2.5 → 10s total).
            transition_duration: xfade duration in seconds (default 0.5).
            fps:                 Output frame rate (default 25).

        Returns:
            True on success, raises RuntimeError on failure.
        """
        if len(image_paths) != 4:
            raise ValueError(
                f"FFmpegRenderer expects exactly 4 images, got {len(image_paths)}"
            )

        total_duration = duration_per_image * 4   # 10s
        td = transition_duration
        tmp_dir = os.path.dirname(output_path)
        os.makedirs(tmp_dir, exist_ok=True)

        clip_paths = []
        try:
            # Step 1 — still images → timed clips
            clip_duration = duration_per_image + td   # slight overlap for smooth xfade
            for i, img in enumerate(image_paths):
                clip_path = os.path.join(tmp_dir, f"_tmp_clip_{i}.mp4")
                self._make_clip(img, clip_path, duration=clip_duration, fps=fps)
                clip_paths.append(clip_path)

            # Step 2 — xfade chain
            # Each transition starts at: (i * duration_per_image) - td/2
            o1 = duration_per_image - td / 2
            o2 = o1 + duration_per_image - td / 2
            o3 = o2 + duration_per_image - td / 2

            filter_complex = (
                f"[0:v][1:v]xfade=transition=slideleft:duration={td}:offset={o1:.4f}[x1];"
                f"[x1][2:v]xfade=transition=slideleft:duration={td}:offset={o2:.4f}[x2];"
                f"[x2][3:v]xfade=transition=slideleft:duration={td}:offset={o3:.4f},"
                f"format=yuv420p[vout]"  # ensure clean pix_fmt after xfade
            )

            # Step 3 — compose final video (with or without audio)
            cmd = [self.ffmpeg_bin, "-y"]
            for cp in clip_paths:
                cmd.extend(["-i", cp])

            use_audio = bool(audio_path and os.path.exists(audio_path))
            if use_audio:
                cmd.extend(["-i", audio_path])
                audio_idx = len(clip_paths)
                cmd.extend([
                    "-filter_complex", filter_complex,
                    "-map", "[vout]",
                    "-map", f"{audio_idx}:a",
                    "-t", str(total_duration),
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-r", str(fps),
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-shortest",
                    output_path,
                ])
            else:
                cmd.extend([
                    "-filter_complex", filter_complex,
                    "-map", "[vout]",
                    "-t", str(total_duration),
                    "-c:v", "libx264",
                    "-preset", "fast",
                    "-crf", "23",
                    "-pix_fmt", "yuv420p",
                    "-r", str(fps),
                    output_path,
                ])

            logger.info("Rendering final video: %s", output_path)
            self._run(cmd, context="compose")
            logger.info(
                "Render complete: %s (%.1f KB)",
                output_path,
                os.path.getsize(output_path) / 1024,
            )
            return True

        finally:
            # Always clean up temp clips
            for cp in clip_paths:
                try:
                    if os.path.exists(cp):
                        os.remove(cp)
                except Exception:
                    pass
