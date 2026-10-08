"use client";

import { useEffect, useState } from "react";
import { listBatches, downloadBatchZip, type Batch } from "@/lib/api";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed:             "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    completed_with_errors: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    processing:            "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
    failed:                "bg-rose-500/10 text-rose-400 border-rose-500/20",
    draft:                 "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return map[status] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export default function HistoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false); // false — no SSR mismatch
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    listBatches()
      .then(setBatches)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Gagal memuat history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 border-indigo-500/20">
        <h2 className="text-2xl font-bold text-white tracking-tight">Batch History</h2>
        <p className="text-slate-400 text-sm mt-1">
          Riwayat pembuatan batch video affiliate milikmu.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="glass-card p-10 text-center text-slate-400 text-sm animate-pulse">
          Memuat history…
        </div>
      )}

      {!loading && batches.length === 0 && !error && (
        <div className="glass-card p-10 text-center text-slate-400 text-sm space-y-2">
          <p className="text-3xl">📭</p>
          <p>
            Belum ada batch. Buat batch pertamamu di halaman{" "}
            <span className="text-indigo-400 font-semibold">Create</span>.
          </p>
        </div>
      )}

      {!loading && batches.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Images</th>
                <th className="px-6 py-4">Videos</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">
                      {b.name ?? "Shopee Batch"}
                    </div>
                    <div className="text-xs font-normal text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">
                      {b.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {new Date(b.created_at).toLocaleString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono">{b.total_images}</td>
                  <td className="px-6 py-4 font-mono text-indigo-400 font-bold">
                    {b.total_videos}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge(b.status)}`}>
                      ● {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {["completed", "completed_with_errors"].includes(b.status) && (
                      <button
                        onClick={() => downloadBatchZip(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors inline-block"
                      >
                        📦 Download ZIP
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
