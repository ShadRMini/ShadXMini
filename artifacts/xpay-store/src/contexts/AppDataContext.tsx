import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiFetch, clearApiCache } from "@/lib/api-client";

export interface AppData {
  user: any | null;
  unreadCount: number;
  themeSettings: any | null;
  currencySettings: any | null;
  categories: any[];
  banners: any[];
  news: any[];
  popupSettings: any | null;
  loading: boolean;
  refresh: () => void;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<{
    user: any | null;
    unreadCount: number;
    themeSettings: any | null;
    currencySettings: any | null;
    categories: any[];
    banners: any[];
    news: any[];
    popupSettings: any | null;
    loading: boolean;
  }>({
    user: null,
    unreadCount: 0,
    themeSettings: null,
    currencySettings: null,
    categories: [],
    banners: [],
    news: [],
    popupSettings: null,
    loading: true,
  });

  const load = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("xpay_store_auth_token") || localStorage.getItem("token")
          : null;

      const [user, unreadRes, theme, currency, cats, banners, news, popup] =
        await Promise.all([
          token ? apiFetch("/api/me").catch(() => null) : Promise.resolve(null),
          token
            ? apiFetch("/api/me/notifications/unread-count").catch(() => null)
            : Promise.resolve(null),
          apiFetch("/api/public/theme-settings").catch(() => null),
          apiFetch("/api/public/currency-settings").catch(() => null),
          apiFetch("/api/categories").catch(() => []),
          apiFetch("/api/banners").catch(() => []),
          apiFetch("/api/news").catch(() => []),
          apiFetch("/api/public/popup-settings").catch(() => null),
        ]);

      setData({
        user,
        unreadCount: Number(unreadRes?.count ?? user?.unreadCount ?? 0),
        themeSettings: theme,
        currencySettings: currency,
        categories: Array.isArray(cats) ? cats : [],
        banners: Array.isArray(banners) ? banners : [],
        news: Array.isArray(news) ? news : [],
        popupSettings: popup,
        loading: false,
      });
    } catch {
      setData((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Centralized polling for unread-count every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("xpay_store_auth_token") || localStorage.getItem("token")
          : null;
      if (!token) return;

      const res = await apiFetch("/api/me/notifications/unread-count", {
        skipCache: true,
      }).catch(() => null);

      if (res?.count !== undefined) {
        setData((prev) => ({ ...prev, unreadCount: Number(res.count) }));
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Sync unreadCount manually or when triggered by child components
  const setUnreadCount = useCallback((val: number | ((prev: number) => number)) => {
    setData((prev) => ({
      ...prev,
      unreadCount: typeof val === "function" ? val(prev.unreadCount) : val,
    }));
  }, []);

  // Listen to cross-component sync events
  useEffect(() => {
    const handleAuthChange = () => {
      clearApiCache("/api/me");
      load();
    };

    const handleNotificationsRefresh = async () => {
      const res = await apiFetch("/api/me/notifications/unread-count", {
        skipCache: true,
      }).catch(() => null);
      if (res?.count !== undefined) {
        setData((prev) => ({ ...prev, unreadCount: Number(res.count) }));
      }
    };

    window.addEventListener("xpay_auth_change", handleAuthChange);
    window.addEventListener("xpay_notifications_refresh", handleNotificationsRefresh);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("xpay_auth_change", handleAuthChange);
      window.removeEventListener("xpay_notifications_refresh", handleNotificationsRefresh);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [load]);

  return (
    <AppDataContext.Provider
      value={{
        ...data,
        refresh: load,
        setUnreadCount,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
