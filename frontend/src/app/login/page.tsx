"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-[80vh] flex items-center justify-center">
      <div suppressHydrationWarning className="w-full max-w-md glass-card p-8 space-y-6">
        <div suppressHydrationWarning className="text-center space-y-2">
          <div suppressHydrationWarning className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-indigo-500/30">
            ⚡
          </div>
          <h1 className="text-2xl font-bold text-white">Login</h1>
          <p className="text-sm text-slate-400">
            Masuk ke Shopee Affiliate Video Generator
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div suppressHydrationWarning>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              placeholder="user@example.com"
            />
          </div>

          <div suppressHydrationWarning>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-primary hover:opacity-90 font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div suppressHydrationWarning className="text-center text-sm text-slate-400">
          Belum punya akun?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
