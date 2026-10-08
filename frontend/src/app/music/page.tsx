"use client";

import { useEffect, useState } from "react";

interface MusicTrack {
  id: string;
  filename: string;
  duration: string;
  size: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function MusicLibraryPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([
    { id: "m-1", filename: "trending_upbeat_bgm_01.mp3", duration: "02:30", size: "3.4 MB" },
    { id: "m-2", filename: "aesthetic_lofi_vibe.mp3", duration: "01:45", size: "2.1 MB" },
    { id: "m-3", filename: "shopee_viral_dance.mp3", duration: "02:10", size: "2.9 MB" },
  ]);

  useEffect(() => {
    async function fetchMusic() {
      try {
        const res = await fetch(`${API_BASE_URL}/music`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map((item: any) => ({
              id: item.id,
              filename: item.original_filename,
              duration: item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)}:${Math.floor(item.duration_seconds % 60).toString().padStart(2, '0')}` : "02:00",
              size: "3.0 MB"
            }));
            setTracks(formatted);
          }
        }
      } catch (err) {
        console.warn("Backend API offline, displaying demo music library", err);
      }
    }
    fetchMusic();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/music`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const item = await res.json();
        setTracks((prev) => [
          ...prev,
          {
            id: item.id,
            filename: item.original_filename,
            duration: "02:00",
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }
        ]);
        return;
      }
    } catch (err) {
      console.warn("Backend upload failed, adding to local state preview", err);
    }

    const uploaded = {
      id: `m-${Date.now()}`,
      filename: file.name,
      duration: "02:00",
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    };
    setTracks((prev) => [...prev, uploaded]);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/music/${id}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Backend delete failed", err);
    }
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Music Library</h2>
          <p className="text-slate-400 text-sm mt-1">
            Kelola pustaka musik latar untuk video affiliate. Musik akan dipilih secara <span className="text-emerald-400 font-semibold">Auto Shuffle No-Repeat</span> saat batch rendering.
          </p>
        </div>

        <label className="px-5 py-2.5 rounded-xl bg-gradient-primary hover:opacity-90 font-semibold text-white cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          <input
            type="file"
            accept="audio/mp3, audio/wav, audio/m4a"
            onChange={handleUpload}
            className="hidden"
          />
          🎵 Upload Music (MP3 / WAV)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="p-5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/20">
                  🎶
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm truncate max-w-[180px]">
                    {track.filename}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{track.duration}</span>
                    <span>•</span>
                    <span>{track.size}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1">
                ▶ Preview
              </button>
              <button
                onClick={() => handleDelete(track.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
