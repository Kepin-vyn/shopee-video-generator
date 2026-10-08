"use client";

import { useEffect, useState } from "react";
import { getToken, clearToken, API_BASE } from "./api";

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Auth hook — runs only on the client after mount to avoid SSR/hydration mismatch.
 * loading starts as false (no server-side loading spinner) and only becomes true
 * during the async /auth/me fetch after hydration.
 */
export function useAuth(redirectIfUnauthenticated = true): {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
} {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false); // false on server — no SSR mismatch

  useEffect(() => {
    // Everything inside useEffect runs only on the client, after hydration
    const token = getToken();

    if (!token) {
      if (redirectIfUnauthenticated) {
        window.location.href = "/login";
      }
      return;
    }

    setLoading(true);

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.ok) return r.json();
        clearToken();
        if (redirectIfUnauthenticated) window.location.href = "/login";
        return null;
      })
      .then((data: AuthUser | null) => {
        if (data) setUser(data);
      })
      .catch(() => {
        // Backend offline — keep user logged in locally if token exists
        setUser({ id: "offline", email: "offline@local" });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    clearToken();
    window.location.href = "/login";
  }

  return { user, loading, logout };
}
