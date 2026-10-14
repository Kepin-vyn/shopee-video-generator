"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getToken } from "@/lib/api";
import {
  createBatch,
  uploadImages,
  computeGrouping,
  updateGroups,
  generateBatch,
  getBatchStatus,
  getBatchVideos,
  regenerateVideo,
  batchDownloadUrl,
  videoStreamUrl,
  downloadBatchZip,
  type Group,
  type VideoRecord,
} from "@/lib/api";
import { User, AlertTriangle, X, RotateCcw, Zap, RefreshCw, FolderOpen, ArrowDown, CheckCircle2, Archive, Download } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalFile {
  id: string;
  name: string;
  previewUrl: string;
  rawFile: File;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateBatchPage() {
  const [localFiles, setLocalFiles]   = useState<LocalFile[]>([]);
  const [batchId,    setBatchId]       = useState<string | null>(null);
  const [groups,     setGroups]        = useState<Group[]>([]);
  const [leftover,   setLeftover]      = useState(0);

  const [isUploading,    setIsUploading]    = useState(false);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderDone,     setRenderDone]     = useState(false);
  const [renderFailed,   setRenderFailed]   = useState(false);
  const [renderError,    setRenderError]    = useState("");
  const [videos,         setVideos]         = useState<VideoRecord[]>([]);
  const [dragOver,       setDragOver]       = useState(false);

  // show user email in header after mount (client-only, no SSR)
  const [userEmail, setUserEmail] = useState("");
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.email) setUserEmail(d.email); })
        .catch(() => {});
    }
  }, []);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup object URLs and polling on unmount
  useEffect(() => {
    return () => {
      localFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────

  async function processFiles(rawFiles: File[]) {
    if (rawFiles.length === 0) return;

    const accepted = rawFiles.filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type),
    );
    if (!accepted.length) return;

    const newLocal: LocalFile[] = accepted.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      previewUrl: URL.createObjectURL(f),
      rawFile: f,
    }));

    // Capture current batchId BEFORE setState (closure issue fix)
    const currentBatchId = batchId;

    setLocalFiles((prev) => [...prev, ...newLocal]);
    setRenderDone(false);
    setRenderProgress(0);

    // Upload only the newly added files, passing current batchId explicitly
    await uploadToBackend(accepted, currentBatchId);
  }

  async function uploadToBackend(newRawFiles: File[], existingBatchId: string | null) {
    setIsUploading(true);
    try {
      let bid = existingBatchId;
      if (!bid) {
        const batch = await createBatch("Shopee Affiliate Batch");
        bid = batch.id;
        setBatchId(bid);
        console.log("[Upload] Created batch:", bid);
      }

      const result = await uploadImages(bid, newRawFiles);
      console.log("[Upload] Success:", result.uploaded, "files, total:", result.total_images);

      const grouping = await computeGrouping(bid);
      console.log("[Upload] Grouping:", grouping.complete_videos, "videos,", grouping.leftover_images, "leftover");
      console.log("[Upload] Groups:", grouping.groups.map(g => ({seq: g.video_sequence, ids: g.image_ids})));

      // Sync backend image IDs into localFiles
      // Extract all images from groups in sequence order
      const allBackendImages: Array<{ sequence: number; id: string; filename: string }> = [];
      grouping.groups.forEach((g) => {
        g.images.forEach((img) => {
          allBackendImages.push({
            sequence: img.sequence,
            id: img.id,
            filename: img.original_filename,
          });
        });
      });
      console.log("[Upload] allBackendImages:", allBackendImages.map(a => ({seq: a.sequence, id: a.id.substring(0, 8), name: a.filename})));

      // Update localFiles to use backend IDs using functional state update
      setLocalFiles((prev) => {
        const newLocal = prev.map((lf, idx) => {
          // Match by filename first, then fallback to sequence index
          const backendImg =
            allBackendImages.find((img) => img.filename === lf.name) ??
            allBackendImages[idx];
          if (backendImg) {
            console.log("[Upload] Syncing", lf.name, "->", backendImg.id.substring(0, 8), "(filename match:", !!allBackendImages.find((img) => img.filename === lf.name), ")");
            return { ...lf, id: backendImg.id };
          }
          console.log("[Upload] WARNING: No match for", lf.name, "at index", idx);
          return lf;
        });
        return newLocal;
      });

      setGroups(grouping.groups);
      setLeftover(grouping.leftover_images);
    } catch (e) {
      console.error("[Upload] Error:", e);
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    processFiles(Array.from(e.target.files));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }

  // ── Grouping reorder ───────────────────────────────────────────────────────
  // Move video groups up/down, or swap images within a group

  function moveGroup(index: number, direction: "up" | "down") {
    const next = [...groups];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    // Re-number sequences
    const renumbered = next.map((g, i) => ({ ...g, video_sequence: i + 1 }));
    setGroups(renumbered);
  }

  // Swap image positions within a group (to set product image as first)
  function swapImageInGroup(groupIdx: number, imgPos1: number, imgPos2: number) {
    const next = [...groups];
    const group = next[groupIdx];
    if (!group.image_ids || imgPos1 >= 4 || imgPos2 >= 4) return;
    [group.image_ids[imgPos1], group.image_ids[imgPos2]] = [
      group.image_ids[imgPos2],
      group.image_ids[imgPos1],
    ];
    setGroups(next);
  }

  // Set same position as product (position 0) for all groups
  function setProductPositionForAll(position: number) {
    if (position === 0) return; // already product
    const next = groups.map((group) => {
      const ids = [...group.image_ids];
      if (ids.length === 4 && position < 4) {
        [ids[0], ids[position]] = [ids[position], ids[0]];
      }
      return { ...group, image_ids: ids };
    });
    setGroups(next);
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  const startPolling = useCallback(
    (bid: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getBatchStatus(bid);
          const total  = status.total_videos || 1;
          const done   = status.completed + status.failed;
          setRenderProgress(Math.max(5, Math.round((done / total) * 100)));

          if (["completed", "completed_with_errors", "failed"].includes(status.status)) {
            clearInterval(pollingRef.current!);
            setIsGenerating(false);
            setRenderProgress(100);

            if (status.status === "failed") {
              setRenderFailed(true);
              setRenderError("Rendering gagal. Cek log backend untuk detail.");
            } else {
              setRenderDone(true);
              const vids = await getBatchVideos(bid);
              setVideos(vids);
            }
          }
        } catch {
          // transient network error — keep polling
        }
      }, 1500);
    },
    [],
  );

  async function handleGenerate() {
    if (!batchId || groups.length === 0) return;
    setIsGenerating(true);
    setRenderDone(false);
    setRenderFailed(false);
    setRenderError("");
    setRenderProgress(5);

    try {
      // Save group reordering to backend before starting render
      const groupPayload = groups.map((g) => ({
        video_sequence: g.video_sequence,
        image_ids: g.image_ids,
      }));
      await updateGroups(batchId, groupPayload);
      
      await generateBatch(batchId);
      startPolling(batchId);
    } catch (e: unknown) {
      setIsGenerating(false);
      setRenderFailed(true);
      const msg = e instanceof Error ? e.message : "Generate request failed";
      setRenderError(msg);
      console.error("[Generate] Error:", msg);
    }
  }

  // ── Regenerate single video ────────────────────────────────────────────────

  async function handleRegenerate(videoId: string) {
    try {
      await regenerateVideo(videoId);
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, status: "rendering" } : v)),
      );
      // Poll again if not already polling
      if (batchId && !pollingRef.current) {
        startPolling(batchId);
      }
    } catch (e) {
      console.error("Regenerate failed:", e);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    localFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setLocalFiles([]);
    setBatchId(null);
    setGroups([]);
    setLeftover(0);
    setRenderDone(false);
    setRenderProgress(0);
    setVideos([]);
    if (pollingRef.current) clearInterval(pollingRef.current);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Do NOT block render on authLoading — that causes SSR/hydration mismatch.
  // The redirect to /login happens inside useAuth's useEffect (client-only).

  // Map backend group images back to local preview URLs by position
  function getPreviewUrl(index: number): string {
    return localFiles[index]?.previewUrl ?? "";
  }

  // Map group.image_ids to localFiles indices.
  // Backend assigns sequence 1..N in upload order, and localFiles is appended in the
  // same order — so sequence N maps to localFiles index N-1. This avoids relying on
  // fragile id-sync between local placeholder ids and backend UUIDs.
  function groupToFileIndices(group: Group): number[] {
    // Build a global id → sequence lookup across every group's images
    const idToSeq = new Map<string, number>();
    for (const g of groups) {
      for (const im of g.images ?? []) {
        idToSeq.set(im.id, im.sequence);
      }
    }

    return group.image_ids.map((imgId, pos) => {
      const seq = idToSeq.get(imgId);
      if (seq !== undefined && seq - 1 < localFiles.length) {
        return seq - 1;
      }
      // Fallback 1: direct match against local (possibly synced) ids
      const byId = localFiles.findIndex((f) => f.id === imgId);
      if (byId >= 0) return byId;
      // Fallback 2: positional within the batch
      const globalPos = (group.video_sequence - 1) * 4 + pos;
      return globalPos < localFiles.length ? globalPos : -1;
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border-primary/20 glass-card-hover">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            Batch Video Generator
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload screenshot produk &amp; review secara berurutan. Sistem mengelompokkan &amp; merender video otomatis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground">
            Preset: <span className="font-semibold text-primary">Basic Slide 10s (9:16)</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground">
            Music: <span className="font-semibold text-emerald-500">Auto Shuffle</span>
          </span>
          {userEmail && (
            <span className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
              <User className="w-3 h-3" /> {userEmail}
            </span>
          )}
        </div>
      </div>

      {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
              1
            </span>
            <h3 className="font-semibold text-lg text-foreground">Upload Screenshots</h3>
          </div>
          {localFiles.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Reset Upload
            </button>
          )}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 bg-muted/40 hover:bg-muted"
          }`}
        >
          <label className="flex flex-col items-center cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-3 border border-primary/20">
              <FolderOpen />
            </div>
            <p className="font-medium text-foreground text-base text-center">
              Drag &amp; drop screenshots, atau{" "}
              <span className="text-primary underline">Pilih File</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              PNG · JPG · WEBP &nbsp;|&nbsp; 01.png = produk, 02–04.png = review
            </p>
          </label>

          {isUploading && (
            <p className="text-xs text-primary mt-3 font-medium animate-pulse">
              Uploading to backend…
            </p>
          )}
        </div>

        {/* Uploaded count badge */}
        {localFiles.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {localFiles.length} file dipilih
          </p>
        )}
      </div>

      {/* ── Step 2: Grouping Preview + Reorder ─────────────────────────────── */}
      {groups.length > 0 && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                2
              </span>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Grouping Preview</h3>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary font-bold">{localFiles.length} gambar</span>
                  {" → "}
                  <span className="text-emerald-500 font-bold">{groups.length} video</span>
                  {" (4 gambar / video)"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Global product position selector */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Set Produk:</span>
                <button
                  onClick={() => setProductPositionForAll(0)}
                  className="px-2 py-1 rounded text-xs font-bold bg-primary text-white"
                  title="Position 1 (already product)"
                >
                  Pos 1
                </button>
                <button
                  onClick={() => setProductPositionForAll(1)}
                  className="px-2 py-1 rounded text-xs font-bold bg-muted hover:bg-primary text-muted-foreground hover:text-white transition-colors"
                  title="Set position 2 as product for all videos"
                >
                  Pos 2
                </button>
                <button
                  onClick={() => setProductPositionForAll(2)}
                  className="px-2 py-1 rounded text-xs font-bold bg-muted hover:bg-primary text-muted-foreground hover:text-white transition-colors"
                  title="Set position 3 as product for all videos"
                >
                  Pos 3
                </button>
                <button
                  onClick={() => setProductPositionForAll(3)}
                  className="px-2 py-1 rounded text-xs font-bold bg-muted hover:bg-primary text-muted-foreground hover:text-white transition-colors"
                  title="Set position 4 as product for all videos"
                >
                  Pos 4
                </button>
              </div>

              <button
                disabled={groups.length === 0 || isGenerating}
                onClick={handleGenerate}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary hover:opacity-90 font-semibold text-white disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Videos
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Leftover warning */}
          {leftover > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>
                <span className="font-bold">{leftover} screenshot tersisa</span>{" "}
                tidak genap 4 gambar dan tidak akan dirender.
              </p>
            </div>
          )}

          {/* Group cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((group, gIdx) => {
              const fileIndices = groupToFileIndices(group);
              return (
                <div
                  key={group.video_sequence}
                  className="p-4 rounded-xl bg-muted/60 border border-border hover:border-primary/30 transition-all space-y-3"
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between text-xs border-b border-border pb-2">
                    <span className="font-bold text-muted-foreground">
                      Video #{String(group.video_sequence).padStart(2, "0")}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveGroup(gIdx, "up")}
                        disabled={gIdx === 0}
                        title="Move up"
                        className="w-6 h-6 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 text-muted-foreground flex items-center justify-center transition-colors"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveGroup(gIdx, "down")}
                        disabled={gIdx === groups.length - 1}
                        title="Move down"
                        className="w-6 h-6 rounded bg-muted hover:bg-muted/80 disabled:opacity-30 text-muted-foreground flex items-center justify-center transition-colors"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail row with swap controls */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {fileIndices.map((fileIdx, pos) => {
                      const previewUrl = getPreviewUrl(fileIdx);
                      const isProduct  = pos === 0;
                      return (
                        <div key={pos} className="relative group">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={isProduct ? "Product" : `Review ${pos}`}
                              className={`w-full h-20 object-cover rounded-lg border ${
                                isProduct ? "border-primary" : "border-border"
                              }`}
                            />
                          ) : (
                            <div className="w-full h-20 rounded-lg bg-muted border border-border" />
                          )}
                          <span
                            className={`absolute bottom-1 left-1 text-[9px] px-1 rounded font-bold ${
                              isProduct
                                ? "bg-primary text-white"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {isProduct ? "Prod" : `Rev${pos}`}
                          </span>
                          
                          {/* Swap to product button */}
                          {!isProduct && (
                            <button
                              onClick={() => swapImageInGroup(gIdx, 0, pos)}
                              title="Set as product image"
                              className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                            >
                              <span className="text-white text-xs font-bold bg-primary px-1 py-0.5 rounded">
                                Set Prod
                              </span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Rendering Progress ─────────────────────────────────────────────── */}
      {(isGenerating || (renderProgress > 0 && !renderDone && !renderFailed)) && (
        <div className="glass-card p-6 space-y-4 border-primary/40">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">
              Rendering {groups.length} video…
            </span>
            <span className="font-mono text-primary">{renderProgress}%</span>
          </div>
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border">
            <div
              className="bg-gradient-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${renderProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            FFmpeg worker memproses image → clip → xfade → audio mix. Anda bisa meninggalkan halaman.
          </p>
        </div>
      )}

      {/* ── Render Failed ─────────────────────────────────────────────────── */}
      {renderFailed && (
        <div className="glass-card p-6 space-y-3 border-destructive/40">
          <div className="flex items-center gap-3">
            <X className="w-6 h-6 text-destructive" />
            <div>
              <h3 className="font-bold text-foreground text-lg">Rendering Gagal</h3>
              <p className="text-destructive text-sm mt-0.5">{renderError}</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-muted-foreground space-y-1">
            <p>• Pastikan backend berjalan di port 8000</p>
            <p>• Cek log backend untuk detail error FFmpeg</p>
            <p>• Gambar harus PNG / JPG / WEBP yang valid</p>
          </div>
          <button
            onClick={() => { setRenderFailed(false); setRenderProgress(0); }}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground text-sm transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Coba Lagi
          </button>
        </div>
      )}

      {/* ── Step 3: Results ────────────────────────────────────────────────── */}
      {renderDone && batchId && (
        <div className="glass-card p-6 space-y-6 border-emerald-500/30">
          {/* Results header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-bold text-xl text-foreground">
                  {groups.length} Video Siap!
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Server-side rendering selesai.
                </p>
              </div>
            </div>
            <button
              onClick={() => batchId && downloadBatchZip(batchId)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all flex items-center gap-2"
            >
              <Archive className="w-5 h-5" /> Download All as ZIP
            </button>
          </div>

          {/* Video cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => {
              const gIdx       = video.sequence - 1;
              const previewUrl = getPreviewUrl(gIdx * 4); // product image as cover
              const isFailed   = video.status === "failed";
              const isRendering = video.status === "rendering";

              return (
                <div
                  key={video.id}
                  className={`p-3 rounded-xl border transition-all space-y-3 ${
                    isFailed
                      ? "bg-destructive/10 border-destructive/30"
                      : "bg-muted/50 border-border hover:border-primary/40"
                  }`}
                >
                  {/* Video preview */}
                  <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
                    {video.status === "completed" && video.output_path ? (
                      // Native HTML5 video player with stream URL (token in query param)
                      <video
                        src={videoStreamUrl(video.id)}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                        playsInline
                        poster={previewUrl || undefined}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt="Cover"
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                          />
                        )}
                        <div className="relative z-10 text-center">
                          {isRendering ? (
                            <span className="text-amber-400 text-xs flex items-center gap-1">
                              <Zap className="w-3 h-3 animate-pulse" /> Rendering…
                            </span>
                          ) : isFailed ? (
                            <span className="text-rose-400 text-xs flex items-center gap-1">
                              <X className="w-3 h-3" /> Failed
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">⏳ Pending</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    <span
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded font-mono border ${
                        video.status === "completed"
                          ? "bg-emerald-900/80 text-emerald-400 border-emerald-500/30"
                          : isFailed
                          ? "bg-rose-900/80 text-rose-400 border-rose-500/30"
                          : "bg-amber-900/80 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {video.status === "completed" ? "MP4 ✓" : video.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Card footer */}
                  <div className="flex items-center justify-between text-xs pt-1 gap-1">
                    <span className="font-bold text-muted-foreground truncate">
                      video_{String(video.sequence).padStart(3, "0")}.mp4
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {video.status === "completed" && (
                        <a
                          href={videoStreamUrl(video.id)}
                          download={`video_${String(video.sequence).padStart(3, "0")}.mp4`}
                          title="Download"
                          className="px-2 py-1 rounded bg-primary text-white hover:bg-primary-hover transition-colors"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      )}
                      {(isFailed || video.status === "completed") && (
                        <button
                          onClick={() => handleRegenerate(video.id)}
                          title="Re-render"
                          className="px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {isFailed && video.error_message && (
                    <p className="text-xs text-destructive line-clamp-2">
                      {video.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
