import { useEffect, useLayoutEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Categories from "@/pages/categories";
import ProductGroupProducts from "@/pages/product-group-products";
import ProductDetail from "@/pages/product-detail";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Deposit from "@/pages/deposit";
import DepositMethod from "@/pages/deposit-method";
import ShamCashInvoiceVerify from "@/pages/shamcash-invoice-verify";
import DepositsList from "@/pages/deposits";
import Profile from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import Support from "@/pages/support";
import Favorites from "@/pages/favorites";
import About from "@/pages/about";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotificationsPage from "@/pages/Notifications";
import LoyaltyLevels from "@/pages/LoyaltyLevels";
import AppLayout from "@/components/layout/AppLayout";
import { PopupNotification } from "@/components/PopupNotification";
import { loadAndApplyStoreTheme, DEFAULT_STORE_THEME, applyStoreTheme } from "@/lib/theme";
import { Wrench, Construction, Clock, ShieldAlert, Server, MessageCircle } from "lucide-react";

const queryClient = new QueryClient();

type StoreTheme = {
  primary: string;
  accent: string;
  background: string;
  font: string;
  radius: string;
};

type AppSettings = {
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceIcon?: string;
  maintenanceContactEnabled?: boolean;
  maintenanceContactText?: string;
  maintenanceContactUrl?: string;
  maintenanceEstimatedTime?: string;
  popupEnabled: boolean;
  popupMessage: string;
  popupLinkText: string;
  popupLinkUrl: string;
};

function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

function StoreMaintenance({ settings }: { settings: AppSettings }) {
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Construction":
        return <Construction className="w-10 h-10 text-[#C8A45C] animate-bounce" />;
      case "Clock":
        return <Clock className="w-10 h-10 text-[#C8A45C] animate-spin" style={{ animationDuration: "6s" }} />;
      case "ShieldAlert":
        return <ShieldAlert className="w-10 h-10 text-[#C8A45C] animate-pulse" />;
      case "Server":
        return <Server className="w-10 h-10 text-[#C8A45C] animate-pulse" />;
      case "Wrench":
      default:
        return <Wrench className="w-10 h-10 text-[#C8A45C] animate-spin" style={{ animationDuration: "8s" }} />;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#1A1A1A] text-white flex items-center justify-center p-6 selection:bg-[#C8A45C] selection:text-black" dir="rtl">
      <div className="w-full max-w-lg rounded-3xl border border-[#C8A45C]/30 bg-[#242424]/95 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#C8A45C]/15 border border-[#C8A45C]/30 shadow-inner">
          {getIconComponent(settings.maintenanceIcon || "Wrench")}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#C8A45C] tracking-wide">
          {settings.maintenanceTitle || "الموقع قيد الصيانة المؤقتة"}
        </h1>

        <p className="mt-4 text-sm sm:text-base leading-8 text-zinc-300">
          {settings.maintenanceMessage}
        </p>

        {settings.maintenanceEstimatedTime && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#C8A45C]/30 text-xs sm:text-sm text-[#FDE68A] font-medium shadow-sm">
            <Clock className="w-4 h-4 text-[#C8A45C]" />
            <span>{settings.maintenanceEstimatedTime}</span>
          </div>
        )}

        {settings.maintenanceContactEnabled !== false && settings.maintenanceContactUrl && (
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <a
              href={settings.maintenanceContactUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#C8A45C] text-[#1A1A1A] font-extrabold text-sm sm:text-base shadow-lg shadow-[#C8A45C]/20 hover:bg-[#B8954A] transition duration-200"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{settings.maintenanceContactText || "تواصل معنا"}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function StorePopup({ settings }: { settings: AppSettings }) {
  const storageKey = `xpay-popup-seen:${settings.popupMessage}:${settings.popupLinkUrl}`;
  const hasSeenPopup = () => {
    try {
      return sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  };
  const [open, setOpen] = useState(() => settings.popupEnabled && !hasSeenPopup());

  useEffect(() => {
    setOpen(settings.popupEnabled && !hasSeenPopup());
  }, [settings.popupEnabled, storageKey]);

  if (!open || !settings.popupMessage.trim()) return null;

  const close = () => {
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Some Telegram WebViews can block storage; closing should still work.
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-amber-400/70 bg-[#12072b]/95 p-6 text-center shadow-2xl shadow-black/40">
        <div className="border-r-4 border-white pr-4 text-lg font-bold leading-9 text-white whitespace-pre-line">
          {settings.popupMessage}
        </div>
        {settings.popupLinkUrl && settings.popupLinkText && (
          <a
            href={settings.popupLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block text-base font-extrabold text-amber-300 underline underline-offset-4"
          >
            {settings.popupLinkText}
          </a>
        )}
        <button
          onClick={close}
          className="mt-6 w-full rounded-full bg-amber-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-amber-950/30"
        >
          موافق
        </button>
        <button
          onClick={close}
          className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-4xl leading-none text-white shadow-lg shadow-amber-950/30"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth routes without AppLayout */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Main Store routes with AppLayout and Protection */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />
            <Route path="/categories/:id" component={() => <ProtectedRoute component={Categories} />} />
            <Route path="/groups/:id" component={() => <ProtectedRoute component={ProductGroupProducts} />} />
            <Route path="/products/:id" component={() => <ProtectedRoute component={ProductDetail} />} />
            <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
            <Route path="/orders/:id" component={() => <ProtectedRoute component={OrderDetail} />} />
            <Route path="/deposit" component={() => <ProtectedRoute component={Deposit} />} />
            <Route path="/deposit/:method/invoice" component={() => <ProtectedRoute component={ShamCashInvoiceVerify} />} />
            <Route path="/deposit/:method" component={() => <ProtectedRoute component={DepositMethod} />} />
            <Route path="/deposits" component={() => <ProtectedRoute component={DepositsList} />} />
            <Route path="/favorites" component={() => <ProtectedRoute component={Favorites} />} />
            <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
            <Route path="/loyalty" component={() => <ProtectedRoute component={LoyaltyLevels} />} />
            <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
            <Route path="/profile/edit" component={() => <ProtectedRoute component={SettingsPage} />} />
            <Route path="/support" component={() => <ProtectedRoute component={Support} />} />
            <Route path="/about" component={() => <ProtectedRoute component={About} />} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useLayoutEffect(() => {
    const baseUrl = apiBaseUrl();
    loadAndApplyStoreTheme(baseUrl);

    // Real-time synchronization when admin saves theme or switches tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "xpay_theme_updated" || e.key === "theme_settings") {
        console.log("[Storefront] Detected theme change event in storage, reloading theme...");
        loadAndApplyStoreTheme(baseUrl);
      }
    };

    const handleCustomThemeEvent = () => {
      loadAndApplyStoreTheme(baseUrl);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("xpay_theme_change", handleCustomThemeEvent);
    window.addEventListener("focus", handleCustomThemeEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("xpay_theme_change", handleCustomThemeEvent);
      window.removeEventListener("focus", handleCustomThemeEvent);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBaseUrl()}/api/app-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((error) => {
        console.error("App settings load failed:", error);
        if (!cancelled) setSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (settings?.maintenanceMode) {
    return <StoreMaintenance settings={settings} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          {settings && <StorePopup settings={settings} />}
          <PopupNotification />
          <Toaster theme="dark" position="top-center" dir="rtl" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
