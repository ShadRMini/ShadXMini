import { useEffect, useLayoutEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Redirect } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import PageLoading from "@/components/PageLoading";
import { PopupNotification } from "@/components/PopupNotification";
import { loadAndApplyStoreTheme, DEFAULT_STORE_THEME, applyStoreTheme } from "@/lib/theme";
import { getPublicJson } from "@/lib/public-api";
import { setCachedShamCash } from "@/lib/shamcash-cache";
import { Wrench, Construction, Clock, ShieldAlert, Server, MessageCircle } from "lucide-react";

// Lazy-loaded Pages
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const Categories = lazy(() => import("@/pages/categories"));
const ProductGroupProducts = lazy(() => import("@/pages/product-group-products"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const Orders = lazy(() => import("@/pages/orders"));
const OrderDetail = lazy(() => import("@/pages/order-detail"));
const Deposit = lazy(() => import("@/pages/deposit"));
const DepositMethod = lazy(() => import("@/pages/deposit-method"));
const ShamCashInvoiceVerify = lazy(() => import("@/pages/shamcash-invoice-verify"));
const WalletPage = lazy(() => import("@/pages/WalletPage"));
const DepositShamCash = lazy(() => import("@/pages/DepositShamCash"));
const DepositBinancePay = lazy(() => import("@/pages/DepositBinancePay"));
const DepositInvoicePay = lazy(() => import("@/pages/DepositInvoicePay"));
const DepositsList = lazy(() => import("@/pages/deposits"));
const Profile = lazy(() => import("@/pages/profile"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const Favorites = lazy(() => import("@/pages/favorites"));
const About = lazy(() => import("@/pages/about"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const NotificationsPage = lazy(() => import("@/pages/Notifications"));
const LoyaltyLevels = lazy(() => import("@/pages/LoyaltyLevels"));
const IdentityVerification = lazy(() => import("@/pages/IdentityVerification"));

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
        return <Construction className="w-10 h-10 text-[var(--theme-primary)] animate-bounce" />;
      case "Clock":
        return <Clock className="w-10 h-10 text-[var(--theme-primary)] animate-spin" style={{ animationDuration: "6s" }} />;
      case "ShieldAlert":
        return <ShieldAlert className="w-10 h-10 text-[var(--theme-primary)] animate-pulse" />;
      case "Server":
        return <Server className="w-10 h-10 text-[var(--theme-primary)] animate-pulse" />;
      case "Wrench":
      default:
        return <Wrench className="w-10 h-10 text-[var(--theme-primary)] animate-spin" style={{ animationDuration: "8s" }} />;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--theme-background)] text-[var(--theme-text-primary)] flex items-center justify-center p-6 selection:bg-[var(--theme-primary)] selection:text-black" dir="rtl">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 p-8 sm:p-10 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--theme-primary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[var(--theme-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--theme-primary)]/15 border border-[var(--theme-border)] shadow-inner">
          {getIconComponent(settings.maintenanceIcon || "Wrench")}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--theme-primary)] tracking-wide">
          {settings.maintenanceTitle || "الموقع قيد الصيانة المؤقتة"}
        </h1>

        <p className="mt-4 text-sm sm:text-base leading-8 text-[var(--theme-text-muted)]">
          {settings.maintenanceMessage}
        </p>

        {settings.maintenanceEstimatedTime && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--theme-background)] border border-[var(--theme-border)] text-xs sm:text-sm text-[var(--theme-accent)] font-medium shadow-sm">
            <Clock className="w-4 h-4 text-[var(--theme-primary)]" />
            <span>{settings.maintenanceEstimatedTime}</span>
          </div>
        )}

        {settings.maintenanceContactEnabled !== false && settings.maintenanceContactUrl && (
          <div className="mt-8 pt-6 border-t border-[var(--theme-border)]">
            <a
              href={settings.maintenanceContactUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-full bg-[var(--theme-primary)] text-black font-extrabold text-sm sm:text-base shadow-lg hover:opacity-90 transition duration-200"
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
    <Suspense fallback={<PageLoading />}>
      <Switch>
        {/* Auth routes without AppLayout */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Main Store routes with AppLayout and Protection */}
        <Route>
          <AppLayout>
            <Switch>
              <Route path="/" component={() => <ProtectedRoute component={Home} allowGuest={true} />} />
              <Route path="/categories/:id" component={() => <ProtectedRoute component={Categories} />} />
              <Route path="/groups/:id" component={() => <ProtectedRoute component={ProductGroupProducts} />} />
              <Route path="/products/:id" component={() => <ProtectedRoute component={ProductDetail} />} />
              <Route path="/orders" component={() => <ProtectedRoute component={Orders} />} />
              <Route path="/orders/:id" component={() => <ProtectedRoute component={OrderDetail} />} />
              <Route path="/wallet" component={() => <ProtectedRoute component={WalletPage} />} />
              <Route path="/deposit" component={() => <ProtectedRoute component={WalletPage} />} />
              <Route path="/deposit/shamcash" component={() => <ProtectedRoute component={DepositShamCash} />} />
              <Route path="/deposit/binance-pay" component={() => <ProtectedRoute component={DepositBinancePay} />} />
              <Route path="/deposit/pay/:invoiceId" component={() => <ProtectedRoute component={DepositInvoicePay} />} />
              <Route path="/deposit-legacy" component={() => <ProtectedRoute component={Deposit} />} />
              <Route path="/deposit/:method/invoice" component={() => <ProtectedRoute component={ShamCashInvoiceVerify} />} />
              <Route path="/deposit/:method" component={() => <ProtectedRoute component={DepositMethod} />} />
              <Route path="/deposits" component={() => <ProtectedRoute component={DepositsList} />} />
              <Route path="/favorites" component={() => <ProtectedRoute component={Favorites} />} />
              <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
              <Route path="/loyalty" component={() => <ProtectedRoute component={LoyaltyLevels} />} />
              <Route path="/levels" component={() => <ProtectedRoute component={LoyaltyLevels} />} />
              <Route path="/vip" component={() => <ProtectedRoute component={LoyaltyLevels} />} />
              <Route path="/identity-verification" component={() => <ProtectedRoute component={IdentityVerification} />} />
              <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
              <Route path="/profile/edit" component={() => <ProtectedRoute component={SettingsPage} />} />
              <Route path="/support" component={() => <ProtectedRoute component={ContactPage} allowGuest={true} />} />
              <Route path="/contact" component={() => <ProtectedRoute component={ContactPage} allowGuest={true} />} />
              <Route path="/about" component={() => <ProtectedRoute component={About} allowGuest={true} />} />
              <Route path="/currencies" component={() => <Redirect to="/" />} />
              <Route path="/currency" component={() => <Redirect to="/" />} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </Route>
      </Switch>
    </Suspense>
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

    // Preload ShamCash payment method data on startup into cache
    getPublicJson<any[]>("/payment-methods")
      .then((methods) => {
        if (!cancelled && Array.isArray(methods)) {
          const sham = methods.find(
            (m) => m.code === "sham_cash" || m.code === "sham_cash_auto"
          );
          if (sham) {
            setCachedShamCash({
              walletAddress: sham.walletAddress || "",
              qrImageUrl: sham.qrImage || "",
              methodConfig: sham.displayConfig || sham.display_config || null,
              minAmount: sham.minAmount !== undefined && sham.minAmount !== null ? Number(sham.minAmount) || 1 : 1,
              maxAmount: sham.maxAmount !== undefined && sham.maxAmount !== null && Number(sham.maxAmount) > 0 ? Number(sham.maxAmount) : undefined,
            });
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (settings?.maintenanceMode) {
    return <StoreMaintenance settings={settings} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StoreSettingsProvider>
        <CurrencyProvider>
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
        </CurrencyProvider>
      </StoreSettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
