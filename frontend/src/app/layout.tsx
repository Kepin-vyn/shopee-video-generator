import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import NavBar from "./NavBar";

export const metadata: Metadata = {
  title: "Shopee Affiliate Batch Video Generator",
  description:
    "Otomatisasi pembuatan video affiliate pendek dari screenshot produk & review Shopee secara batch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen flex flex-col relative overflow-x-hidden"
      >
        <div suppressHydrationWarning className="bg-gradient-glow" />

        <NavBar />

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
