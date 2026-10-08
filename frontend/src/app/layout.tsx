import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopee Affiliate Batch Video Generator",
  description: "Otomatisasi pembuatan video affiliate pendek dari screenshot produk & review Shopee secara batch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen flex flex-col relative overflow-x-hidden">
        <div className="bg-gradient-glow" />

        {/* Header Navigation */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0f19]/80 border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
                  Shopee<span className="text-gradient ml-1">VideoGen</span>
                </h1>
                <p className="text-xs text-slate-400">Batch Affiliate Generator</p>
              </div>
            </Link>

            <nav className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-indigo-600/30 border border-indigo-500/30 shadow-sm transition-all"
              >
                ➕ Create
              </Link>
              <Link
                href="/history"
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                📜 History
              </Link>
              <Link
                href="/music"
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                🎵 Music Library
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                ⚙️ Settings
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                ● System Ready
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          Shopee Affiliate Batch Video Generator v1.0 • Built for High-Volume Creators
        </footer>
      </body>
    </html>
  );
}
