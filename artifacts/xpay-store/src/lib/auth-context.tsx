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
  hasPassword?: boolean;
  identityMissing?: boolean;
  identityVerified?: boolean;
  isVerified?: boolean;
  createdAt?: string;
};

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (updatedUser: UserProfile, newToken?: string) => void;
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
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) return null;
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

  const refreshUser = useCallback(async (signal?: AbortSignal): Promise<UserProfile | null> => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return null;
      }

      const baseUrl = apiBaseUrl();
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Authorization": `Bearer ${storedToken}`,
      };

      const res = await fetch(`${baseUrl}/api/me?_=${Date.now()}`, {
        headers,
        credentials: "include",
        signal,
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("auth");
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
        setUser(null);
        localStorage.removeItem(USER_KEY);
        return null;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return null;
      }
      console.error("Failed to refresh user:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        await refreshUser(controller.signal);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      controller.abort();
    };
  }, [refreshUser]);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      localStorage.setItem("token", newToken);
    } catch (e) {
      console.error("Storage write error", e);
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    // 1. امسح كل شيء محلياً أولاً (قبل أي انتظار) لضمان عدم استرجاع الجلسة
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
      localStorage.removeItem("xpay_auth_token");
      localStorage.removeItem("xpay_auth_user");
      sessionStorage.clear();
    } catch (e) {
      console.error("Storage clear error:", e);
    }

    // 2. حذف الكوكيز
    try {
      if (typeof document !== "undefined") {
        const hostname = window.location.hostname;
        document.cookie.split(";").forEach((c) => {
          const name = c.trim().split("=")[0];
          if (name) {
            document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
            document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/;domain=${hostname}`;
          }
        });
      }
    } catch {}

    // 3. تحديث الحالة فوراً (قبل أي شبكة)
    setToken(null);
    setUser(null);

    // 4. محاولة إبلاغ الخادم مع مهلة قصوى (2 ثانية)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      if (baseUrl) {
        await fetch(`${baseUrl}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn("Logout API error (ignored):", err);
    } finally {
      clearTimeout(timeoutId);
    }

    // 5. إعادة التوجيه بالقوة
    window.location.href = "/";
  }, []);

  const updateUser = useCallback((updatedUser: UserProfile, newToken?: string) => {
    try {
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch (e) {
      console.error("Storage update error", e);
    }
    setUser(updatedUser);
  }, []);

  const isAuthenticated = Boolean(user || token);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout, updateUser, refreshUser }}>
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
