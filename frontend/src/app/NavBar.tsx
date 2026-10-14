"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getToken, clearToken } from "@/lib/api";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Zap, FolderKanban, Music2, Settings, Moon, Sun } from "lucide-react";

const NAV_LINKS = [
  { href: "/",        label: "Create",        icon: Zap },
  { href: "/history", label: "History",       icon: FolderKanban },
  { href: "/music",   label: "Music",         icon: Music2 },
  { href: "/settings",label: "Settings",      icon: Settings },
];

export default function NavBar() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, [pathname]);

  function handleLogout() {
    clearToken();
    window.location.href = "/login";
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border px-6 py-4">
      {/* suppressHydrationWarning prevents Honey/shopping extensions from causing hydration errors */}
      <div suppressHydrationWarning className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div suppressHydrationWarning className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <div suppressHydrationWarning>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-foreground">
              Shopee<span className="text-gradient ml-1">VideoGen</span>
            </h1>
            <p className="text-xs text-muted-foreground">Batch Affiliate Generator</p>
          </div>
        </Link>

        {/* Nav */}
        {!isAuthPage && (
          <nav className="flex items-center gap-1 bg-muted/70 p-1.5 rounded-xl border border-border">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? "text-white bg-primary/30 border border-primary/40 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Theme toggle & Auth controls */}
        <div suppressHydrationWarning className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="text-xs px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              Logout
            </button>
          ) : (
            !isAuthPage && (
              <Link
                href="/login"
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
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
