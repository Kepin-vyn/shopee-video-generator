"use client";

import { useEffect, useState, useRef } from "react";
import {
  listMusic,
  uploadMusic,
  deleteMusic,
  musicPreviewUrl,
  type MusicTrack,
} from "@/lib/api";

function formatDuration(secs?: number): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicLibraryPage() {
  const [tracks,    setTracks]    = useState<MusicTrack[]>([]);
  const [loading,   setLoading]   = useState(false); // false — no SSR mismatch
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    listMusic()
      .then(setTracks)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat musik"))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setError("");
    try {
      const track = await uploadMusic(file);
      setTracks((prev) => [track, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus track ini?")) return;
    try {
      await deleteMusic(id);
      setTracks((prev) => prev.filter((t) => t.id !== id));
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete gagal");
    }
  }

  function handlePreview(track: MusicTrack) {
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(musicPreviewUrl(track.id));
    audio.play().catch(() => setError("Preview gagal — cek koneksi backend"));
    audio.addEventListener("ended", () => setPlayingId(null));
    audioRef.current = audio;
    setPlayingId(track.id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Music Library</h2>
          <p className="text-slate-400 text-sm mt-1">
            Musik dipilih secara{" "}
            <span className="text-emerald-400 font-semibold">Auto Shuffle No-Repeat</span>{" "}
            saat batch rendering.
          </p>
        </div>

        <label
          className={`px-5 py-2.5 rounded-xl bg-gradient-primary hover:opacity-90 font-semibold text-white cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 ${
            uploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <input
            type="file"
            accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/m4a,audio/x-m4a,audio/mp4"
            onChange={handleUpload}
            className="hidden"
          />
          {uploading ? "⏳ Uploading…" : "🎵 Upload Music"}
        </label>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="glass-card p-10 text-center text-slate-400 text-sm animate-pulse">
          Memuat music library…
        </div>
      )}

      {!loading && tracks.length === 0 && !error && (
        <div className="glass-card p-10 text-center text-slate-400 text-sm space-y-2">
          <p className="text-3xl">🎵</p>
          <p>Belum ada musik. Upload file MP3, WAV, atau M4A untuk mulai.</p>
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((track) => {
            const isPlaying = playingId === track.id;
            return (
              <div
                key={track.id}
                className={`p-5 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                  isPlaying
                    ? "bg-indigo-900/20 border-indigo-500/40"
                    : "bg-slate-900/60 border-white/5 hover:border-indigo-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg border shrink-0 ${
                      isPlaying
                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40 animate-pulse"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    {isPlaying ? "🔊" : "🎶"}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="font-semibold text-white text-sm truncate"
                      title={track.original_filename}
                    >
                      {track.original_filename}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span>{formatDuration(track.duration_seconds)}</span>
                      <span>·</span>
                      <span>{track.mime_type.split("/")[1]?.toUpperCase()}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(track.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => handlePreview(track)}
                    className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                      isPlaying
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {isPlaying ? "⏹ Stop" : "▶ Preview"}
                  </button>
                  <button
                    onClick={() => handleDelete(track.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    🗑 Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
