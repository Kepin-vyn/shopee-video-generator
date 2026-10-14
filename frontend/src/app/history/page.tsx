"use client";

import { useEffect, useState } from "react";
import { listBatches, downloadBatchZip, type Batch } from "@/lib/api";
import { AlertTriangle, Download, Inbox } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed:             "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    completed_with_errors: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    processing:            "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
    failed:                "bg-destructive/10 text-destructive border-destructive/20",
    draft:                 "bg-muted text-muted-foreground border-border",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}

export default function HistoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
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
      <div className="glass-card p-6 border-primary/20 glass-card-hover">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Batch History</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Riwayat pembuatan batch video affiliate milikmu.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && (
        <div className="glass-card p-10 text-center text-muted-foreground text-sm animate-pulse">
          Memuat history…
        </div>
      )}

      {!loading && batches.length === 0 && !error && (
        <div className="glass-card p-10 text-center text-muted-foreground text-sm space-y-2">
          <Inbox className="w-12 h-12 mx-auto opacity-50" />
          <p>
            Belum ada batch. Buat batch pertamamu di halaman{" "}
            <span className="text-primary font-semibold">Create</span>.
          </p>
        </div>
      )}

      {!loading && batches.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/80 text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Images</th>
                <th className="px-6 py-4">Videos</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">
                      {b.name ?? "Shopee Batch"}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
                      {b.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(b.created_at).toLocaleString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 font-mono">{b.total_images}</td>
                  <td className="px-6 py-4 font-mono text-primary font-bold">
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
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download ZIP
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
