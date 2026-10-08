"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getToken, clearToken } from "@/lib/api";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/",        label: "➕ Create"       },
  { href: "/history", label: "📜 History"      },
  { href: "/music",   label: "🎵 Music Library" },
  { href: "/settings",label: "⚙️ Settings"     },
];

export default function NavBar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, [pathname]);

  function handleLogout() {
    clearToken();
    window.location.href = "/login";
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0b0f19]/80 border-b border-white/10 px-6 py-4">
      {/* suppressHydrationWarning prevents Honey/shopping extensions from causing hydration errors */}
      <div suppressHydrationWarning className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div suppressHydrationWarning className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            ⚡
          </div>
          <div suppressHydrationWarning>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">
              Shopee<span className="text-gradient ml-1">VideoGen</span>
            </h1>
            <p className="text-xs text-slate-400">Batch Affiliate Generator</p>
          </div>
        </Link>

        {/* Nav */}
        {!isAuthPage && (
          <nav className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? "text-white bg-indigo-600/30 border border-indigo-500/30 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Auth controls */}
        <div suppressHydrationWarning className="flex items-center gap-3">
          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              Logout
            </button>
          ) : (
            !isAuthPage && (
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
              >
                Login
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
