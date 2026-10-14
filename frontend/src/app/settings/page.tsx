"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="glass-card p-6 border-primary/20 glass-card-hover">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Settings & Presets</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Konfigurasi default preset video dan opsi render. Workflow standar sudah siap tanpa perlu mengubah pengaturan.
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-3">
          Default Video Preset
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Preset Name</label>
            <input
              type="text"
              disabled
              value="Shopee Affiliate — Basic Slide 10s"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Aspect Ratio & Resolution</label>
            <input
              type="text"
              disabled
              value="9:16 Vertical (1080 × 1920 px)"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Images per Video</label>
            <input
              type="text"
              disabled
              value="4 Images (1 Product + 3 Reviews)"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Video Duration</label>
            <input
              type="text"
              disabled
              value="±10.0 Seconds"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Transition Effect</label>
            <input
              type="text"
              disabled
              value="Horizontal Slide Left"
              className="input-glass"
            />
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-medium">Audio Mode</label>
            <input
              type="text"
              disabled
              value="Shuffle Without Repeat"
              className="input-glass"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
