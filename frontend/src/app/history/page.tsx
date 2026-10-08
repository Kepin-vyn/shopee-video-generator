"use client";

import { useEffect, useState } from "react";

interface BatchHistoryItem {
  id: string;
  name: string;
  date: string;
  totalImages: number;
  totalVideos: number;
  status: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function HistoryPage() {
  const [history, setHistory] = useState<BatchHistoryItem[]>([
    {
      id: "batch-001",
      name: "Shopee Affiliate Batch 001",
      date: "8 Oct 2026, 13:15",
      totalImages: 80,
      totalVideos: 20,
      status: "completed",
    },
    {
      id: "batch-002",
      name: "Fashion Products Batch",
      date: "7 Oct 2026, 16:30",
      totalImages: 60,
      totalVideos: 15,
      status: "completed",
    },
  ]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_BASE_URL}/batches`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const formatted = data.map((item: any) => ({
              id: item.id,
              name: item.name || "Shopee Batch",
              date: new Date(item.created_at).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              }),
              totalImages: item.total_images || 0,
              totalVideos: item.total_videos || 0,
              status: item.status || "completed"
            }));
            setHistory(formatted);
          }
        }
      } catch (err) {
        console.warn("Backend API offline, displaying fallback history", err);
      }
    }
    fetchHistory();
  }, []);

  const handleDownloadZip = (batchId: string) => {
    window.open(`${API_BASE_URL}/batches/${batchId}/download`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-indigo-500/20">
        <h2 className="text-2xl font-bold text-white tracking-tight">Batch History</h2>
        <p className="text-slate-400 text-sm mt-1">
          Daftar riwayat pembuatan batch video affiliate sebelumnya.
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase tracking-wider border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Batch Name & ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Images</th>
              <th className="px-6 py-4">Videos</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.map((item) => (
              <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                <td className="px-6 py-4 font-semibold text-white">
                  {item.name}
                  <div className="text-xs font-normal text-slate-500 font-mono mt-0.5">{item.id}</div>
                </td>
                <td className="px-6 py-4 text-slate-400">{item.date}</td>
                <td className="px-6 py-4 font-mono">{item.totalImages} imgs</td>
                <td className="px-6 py-4 font-mono text-indigo-400 font-bold">{item.totalVideos} vids</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    item.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : item.status === "processing"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    ● {item.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleDownloadZip(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
                  >
                    📦 Download ZIP
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
