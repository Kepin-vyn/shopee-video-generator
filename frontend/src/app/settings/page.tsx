"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass-card p-6 border-indigo-500/20">
        <h2 className="text-2xl font-bold text-white tracking-tight">Settings & Presets</h2>
        <p className="text-slate-400 text-sm mt-1">
          Konfigurasi default preset video dan opsi render. Workflow standar sudah siap tanpa perlu mengubah pengaturan.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-3">
          Default Video Preset
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Preset Name</label>
            <input
              type="text"
              disabled
              value="Shopee Affiliate — Basic Slide 10s"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Aspect Ratio & Resolution</label>
            <input
              type="text"
              disabled
              value="9:16 Vertical (1080 × 1920 px)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Images per Video</label>
            <input
              type="text"
              disabled
              value="4 Images (1 Product + 3 Reviews)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Video Duration</label>
            <input
              type="text"
              disabled
              value="±10.0 Seconds"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Transition Effect</label>
            <input
              type="text"
              disabled
              value="Horizontal Slide Left"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-slate-400 font-medium">Audio Mode</label>
            <input
              type="text"
              disabled
              value="Shuffle Without Repeat"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
