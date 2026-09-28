import { useEffect, useLayoutEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Redirect } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import PageLoading from "@/components/PageLoading";
import { PopupNotification } from "@/components/PopupNotification";
import { loadAndApplyStoreTheme, DEFAULT_STORE_THEME, applyStoreTheme } from "@/lib/theme";
import { getPublicJson } from "@/lib/public-api";
import { apiFetch } from "@/lib/api-client";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { setCachedShamCash } from "@/lib/shamcash-cache";
import { Wrench, Construction, Clock, ShieldAlert, Server, MessageCircle, X, ExternalLink, CheckCircle2, Sparkles } from "lucide-react";

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
  popupImage?: string;
  popupDelaySeconds?: number;
  popupStartDate?: string | null;
  popupEndDate?: string | null;
  popupShowTo?: "all" | "logged_in" | "guest";
  popupShowOnlyOnce?: boolean;
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!settings.popupEnabled) { setOpen(false); return; }
    const msg = (settings as any).popupMessage?.trim();
    if (!msg) { setOpen(false); return; }

    // 1) الاستهداف
    const showTo = (settings as any).popupShowTo ?? "all";
    const isLoggedIn = !!user;
    if (showTo === "logged_in" && !isLoggedIn) { setOpen(false); return; }
    if (showTo === "guest" && isLoggedIn) { setOpen(false); return; }

    // 2) الجدولة
    const now = Date.now();
    const start = (settings as any).popupStartDate;
    if (start && Number.isFinite(new Date(start).getTime()) && now < new Date(start).getTime()) {
      setOpen(false); return;
    }
    const end = (settings as any).popupEndDate;
    if (end && Number.isFinite(new Date(end).getTime()) && now > new Date(end).getTime()) {
      setOpen(false); return;
    }

    // 3) "شوهد سابقاً"
    const userId = user?.id ?? "guest";
    const showOnce = (settings as any).popupShowOnlyOnce !== false;
    const storageKey = `xpay_store_popup_seen_${userId}_${msg.slice(0, 40)}`;
    if (showOnce) {
      try {
        if (localStorage.getItem(storageKey) === "1") { setOpen(false); return; }
      } catch {}
    }

    // 4) التأخير
    const delay = Math.max(0, Math.min(30, Number((settings as any).popupDelaySeconds) || 0));
    if (delay === 0) { setOpen(true); return; }
    const t = setTimeout(() => setOpen(true), delay * 1000);
    return () => clearTimeout(t);
  }, [settings, user]);

  const close = () => {
    const userId = user?.id ?? "guest";
    const msg = (settings as any).popupMessage || "";
    const storageKey = `xpay_store_popup_seen_${userId}_${msg.slice(0, 40)}`;
    try { localStorage.setItem(storageKey, "1"); } catch {}
    setOpen(false);
  };

  if (!open || !settings) return null;
  const msg = (settings as any).popupMessage?.trim();
  if (!msg) return null;
  const imageUrl = (settings as any).popupImage;
  const linkUrl = settings.popupLinkUrl;
  const linkText = settings.popupLinkText;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      dir="rtl"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative"
        style={{
          background: "linear-gradient(135deg, var(--theme-card, #1A1A1A) 0%, var(--theme-background, #0a0a0a) 100%)",
          border: "1.5px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
          boxShadow: "0 25px 60px -15px color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent), 0 0 0 1px color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
        }}
      >
        {/* زر X علوي يسار */}
        <button
          onClick={close}
          className="absolute top-3 left-3 z-10 h-9 w-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            border: "1px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
            color: "var(--theme-primary, #C8A45C)",
          }}
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* الصورة (اختيارية) */}
        {imageUrl && (
          <div className="relative w-full h-44 sm:h-52 bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="eager" />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: "linear-gradient(to bottom, transparent 60%, var(--theme-card, #1A1A1A) 100%)",
            }} />
          </div>
        )}

        {/* المحتوى */}
        <div className={`px-6 sm:px-7 ${imageUrl ? "-mt-8 relative" : "pt-8"} pb-6`}>
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--theme-primary, #C8A45C) 35%, transparent)",
                color: "var(--theme-accent, #FDE68A)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              إعلان
            </span>
          </div>

          {/* فاصل ذهبي علوي */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-px w-8" style={{ background: "linear-gradient(to right, transparent, var(--theme-primary, #C8A45C))" }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--theme-primary, #C8A45C)" }} />
            <div className="h-px w-8" style={{ background: "linear-gradient(to left, transparent, var(--theme-primary, #C8A45C))" }} />
          </div>

          {/* النص */}
          <div
            className="text-base sm:text-lg font-bold leading-relaxed whitespace-pre-line text-center mb-6 px-2"
            style={{ color: "var(--theme-text-primary, #E5E7EB)" }}
          >
            {msg}
          </div>

          {/* زر CTA */}
          {linkUrl && linkText ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              onClick={close}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--theme-accent, #FDE68A) 0%, var(--theme-primary, #C8A45C) 100%)",
                color: "var(--theme-background, #0a0a0a)",
                boxShadow: "0 8px 24px -8px color-mix(in srgb, var(--theme-primary, #C8A45C) 60%, transparent)",
              }}
            >
              <span>{linkText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <button
              onClick={close}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, var(--theme-accent, #FDE68A) 0%, var(--theme-primary, #C8A45C) 100%)",
                color: "var(--theme-background, #0a0a0a)",
                boxShadow: "0 8px 24px -8px color-mix(in srgb, var(--theme-primary, #C8A45C) 60%, transparent)",
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>موافق</span>
            </button>
          )}
        </div>
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
    apiFetch<AppSettings>("/api/app-settings")
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
            <AppDataProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                {settings && <StorePopup settings={settings} />}
                <PopupNotification />
                <Toaster theme="dark" position="top-center" dir="rtl" />
              </TooltipProvider>
            </AppDataProvider>
          </AuthProvider>
        </CurrencyProvider>
      </StoreSettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
