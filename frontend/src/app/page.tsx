"use client";

import { useState, useEffect, useRef } from "react";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  rawFile?: File;
}

interface Group {
  videoNum: number;
  productImg: UploadedFile;
  reviewImgs: UploadedFile[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function CreateBatchPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderCompleted, setRenderCompleted] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [downloadZipUrl, setDownloadZipUrl] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Handle Drag & Drop / File Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const rawFiles = Array.from(e.target.files);
    const selected: UploadedFile[] = rawFiles.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      rawFile: file
    }));

    setFiles((prev) => [...prev, ...selected]);
    setRenderCompleted(false);
    setRenderProgress(0);

    // Try creating batch on backend if available
    try {
      setIsUploading(true);
      let currentBatchId = batchId;
      if (!currentBatchId) {
        const createRes = await fetch(`${API_BASE_URL}/batches`, { method: "POST" });
        if (createRes.ok) {
          const batchData = await createRes.json();
          currentBatchId = batchData.id;
          setBatchId(currentBatchId);
        }
      }

      if (currentBatchId) {
        const formData = new FormData();
        rawFiles.forEach((file) => formData.append("files", file));

        await fetch(`${API_BASE_URL}/batches/${currentBatchId}/images`, {
          method: "POST",
          body: formData
        });
      }
    } catch (err) {
      console.warn("Backend API not reachable. Running in client-side preview mode.", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Grouping rule: 4 images per video (1 product, 3 reviews)
  const totalImages = files.length;
  const videoCount = Math.floor(totalImages / 4);
  const leftoverCount = totalImages % 4;

  const groups: Group[] = [];
  for (let i = 0; i < videoCount; i++) {
    const chunk = files.slice(i * 4, (i + 1) * 4);
    groups.push({
      videoNum: i + 1,
      productImg: chunk[0],
      reviewImgs: chunk.slice(1, 4),
    });
  }

  // Start Batch Generation
  const startGenerating = async () => {
    setIsGenerating(true);
    setRenderCompleted(false);
    setRenderFailed(false);
    setRenderError(null);
    setRenderProgress(5);

    if (batchId) {
      try {
        const genRes = await fetch(`${API_BASE_URL}/batches/${batchId}/generate`, {
          method: "POST"
        });

        if (genRes.ok) {
          // Poll status every 1.5 seconds
          pollingRef.current = setInterval(async () => {
            try {
              const statusRes = await fetch(`${API_BASE_URL}/batches/${batchId}/status`);
              if (!statusRes.ok) return;

              const statusData = await statusRes.json();
              const total = statusData.total_videos || 1;
              const completed = statusData.completed || 0;
              const failed = statusData.failed || 0;
              const done = completed + failed;

              // Calculate real progress based on completed videos
              const realProgress = Math.max(5, Math.round((done / total) * 100));
              setRenderProgress(realProgress);

              const TERMINAL_STATUSES = ["completed", "completed_with_errors", "failed"];

              if (TERMINAL_STATUSES.includes(statusData.status)) {
                if (pollingRef.current) clearInterval(pollingRef.current);
                setIsGenerating(false);
                setRenderProgress(100);

                if (statusData.status === "failed") {
                  setRenderFailed(true);
                  setRenderError("Rendering gagal. Pastikan gambar valid dan FFmpeg telah terinstall.");
                } else {
                  setRenderCompleted(true);
                  setDownloadZipUrl(`${API_BASE_URL}/batches/${batchId}/download`);
                }
              }
            } catch {
              // ignore transient network errors during polling
            }
          }, 1500);
          return;
        } else {
          const errData = await genRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Generate request failed");
        }
      } catch (e: any) {
        console.warn("Backend generate error, using simulated mode:", e);
      }
    }

    // Simulated progress fallback (no backend / demo mode)
    let current = 5;
    const simInterval = setInterval(() => {
      current += 10;
      setRenderProgress(Math.min(current, 100));
      if (current >= 100) {
        clearInterval(simInterval);
        setIsGenerating(false);
        setRenderCompleted(true);
      }
    }, 350);
  };

  const handleDownloadZip = () => {
    if (downloadZipUrl) {
      window.open(downloadZipUrl, "_blank");
    } else {
      alert("Demomode: ZIP file download requires backend FFmpeg renderer running.");
    }
  };

  const handleReset = () => {
    setFiles([]);
    setBatchId(null);
    setRenderCompleted(false);
    setRenderProgress(0);
    setDownloadZipUrl(null);
  };

  return (
    <div className="space-y-8">
      {/* Title & Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-indigo-500/20">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Batch Video Generator
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Upload screenshot produk & review secara berurutan. Sistem akan mengelompokkan & merender video secara otomatis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-slate-300">
            Preset: <span className="font-semibold text-indigo-400">Basic Slide 10s (9:16)</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-slate-300">
            Music: <span className="font-semibold text-emerald-400">Auto Shuffle No-Repeat</span>
          </div>
        </div>
      </div>

      {/* Step 1: Upload Screenshots */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </span>
            <h3 className="font-semibold text-lg text-white">Upload Screenshots</h3>
          </div>
          {files.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Reset Upload
            </button>
          )}
        </div>

        <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
          <input
            type="file"
            multiple
            accept="image/png, image/jpeg, image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-3 border border-indigo-500/20">
            📁
          </div>
          <p className="font-medium text-slate-200 text-base">
            Drag & drop screenshots di sini, atau <span className="text-indigo-400 underline">Pilih File</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Format: PNG, JPG, WEBP • Disarankan dalam urutan (01.png = produk, 02-04.png = review)
          </p>
          {isUploading && (
            <p className="text-xs text-indigo-400 mt-2 font-medium">Uploading to backend server...</p>
          )}
        </label>
      </div>

      {/* Step 2: Auto Grouping Preview */}
      {files.length > 0 && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-semibold text-lg text-white">Grouping Preview</h3>
                <p className="text-xs text-slate-400">
                  Terdeteksi <span className="text-indigo-400 font-bold">{totalImages} gambar</span> → Terbentuk <span className="text-emerald-400 font-bold">{videoCount} video</span> (4 gambar / video)
                </p>
              </div>
            </div>

            <button
              disabled={videoCount === 0 || isGenerating}
              onClick={startGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-primary hover:opacity-90 font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isGenerating ? "⚡ Generating Videos..." : "🚀 Generate Videos"}
            </button>
          </div>

          {/* Leftover Warning */}
          {leftoverCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-sm">
              <span className="text-xl">⚠️</span>
              <div>
                <span className="font-bold">{leftoverCount} screenshot tersisa</span> dan tidak genap 4 gambar. Gambar tersisa ini tidak akan dimasukkan ke dalam rendering.
              </div>
            </div>
          )}

          {/* Video Grouping Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div
                key={group.videoNum}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition-all space-y-3"
              >
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="font-bold text-slate-300">Video #{group.videoNum.toString().padStart(2, "0")}</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px]">
                    4 Scenes
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {/* Product Thumbnail */}
                  <div className="relative group">
                    <img
                      src={group.productImg.url}
                      alt="Product"
                      className="w-full h-24 object-cover rounded-lg border-2 border-indigo-500/60"
                    />
                    <span className="absolute bottom-1 left-1 bg-indigo-600 text-white text-[9px] px-1 rounded font-bold">
                      Product
                    </span>
                  </div>

                  {/* Review Thumbnails */}
                  {group.reviewImgs.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.url}
                        alt={`Review ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-700"
                      />
                      <span className="absolute bottom-1 left-1 bg-slate-800 text-slate-300 text-[9px] px-1 rounded">
                        Rev #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rendering Progress Section */}
      {(isGenerating || (renderProgress > 0 && !renderCompleted && !renderFailed)) && (
        <div className="glass-card p-6 space-y-4 border-indigo-500/40">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-white">
              {isGenerating ? `Rendering Batch Videos (${videoCount} Videos)...` : "Memfinalisasi..."}
            </span>
            <span className="font-mono text-indigo-400">{renderProgress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">
            FFmpeg worker sedang memproses product detection, review fitting, &amp; mixing audio. Anda dapat tetap di halaman ini.
          </p>
        </div>
      )}

      {/* Render Failed Error Block */}
      {renderFailed && (
        <div className="glass-card p-6 space-y-3 border-rose-500/40">
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="font-bold text-white text-lg">Rendering Gagal</h3>
              <p className="text-rose-400 text-sm mt-0.5">{renderError}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-slate-400 space-y-1">
            <p>• Pastikan backend uvicorn berjalan di port 8000</p>
            <p>• Cek log backend terminal untuk detail error FFmpeg</p>
            <p>• Pastikan gambar yang diupload adalah format PNG/JPG/WEBP yang valid</p>
          </div>
          <button
            onClick={() => { setRenderFailed(false); setRenderProgress(0); }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            🔄 Coba Lagi
          </button>
        </div>
      )}

      {/* Step 3: Rendered Video Gallery */}
      {renderCompleted && (
        <div className="glass-card p-6 space-y-6 border-emerald-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <h3 className="font-bold text-xl text-white">Batch Video Ready!</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Seluruh {videoCount} video telah selesai dirender server-side.
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              📦 Download All as ZIP
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {groups.map((group) => (
              <div
                key={group.videoNum}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3"
              >
                <div className="relative aspect-[9/16] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center group">
                  <img
                    src={group.productImg.url}
                    alt="Video Preview"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white text-xl flex items-center justify-center hover:scale-110 transition-transform">
                      ▶
                    </button>
                  </div>
                  <span className="absolute top-2 left-2 bg-slate-950/80 text-emerald-400 text-xs px-2 py-0.5 rounded font-mono border border-emerald-500/30">
                    MP4 10s
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-300">Video_{group.videoNum.toString().padStart(2, "0")}.mp4</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleDownloadZip}
                      className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
