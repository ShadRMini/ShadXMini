import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export type UserProfile = {
  id: string;
  displayId: string;
  telegramId?: string;
  username: string;
  email?: string;
  balanceUsd: number;
  balanceSyp: number;
  totalSpent?: number;
  role: string;
  vipLevel: number;
  vipBadge?: { label: string; name: string; color: string };
  avatarUrl?: string | null;
  identityMissing?: boolean;
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "xpay_store_auth_token";
const USER_KEY = "xpay_store_auth_user";

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Configure customFetch auth token getter
  useEffect(() => {
    setAuthTokenGetter(() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    });
  }, []);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const baseUrl = apiBaseUrl();
      const headers: Record<string, string> = {
        "Accept": "application/json",
      };

      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const res = await fetch(`${baseUrl}/api/me?_=${Date.now()}`, {
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        }
        return null;
      }

      const data = await res.json();
      if (data && !data.identityMissing && data.id && data.id !== "0") {
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        return data;
      } else {
        // Identity missing
        if (!storedToken) {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
        return null;
      }
    } catch (err) {
      console.error("Failed to refresh user:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await refreshUser();
      if (mounted) setLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error("Storage write error", e);
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      const baseUrl = apiBaseUrl();
      await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error("Storage delete error", e);
    }
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
