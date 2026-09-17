import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { get } from "./lib/api";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { loadAndApplyAdminTheme } from "./lib/theme";
import { Toaster } from "sonner";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Deposits = lazy(() => import("./pages/Deposits"));
const Users = lazy(() => import("./pages/Users"));
const Categories = lazy(() => import("./pages/Categories"));
const ProductGroups = lazy(() => import("./pages/ProductGroups"));
const Products = lazy(() => import("./pages/Products"));
const PaymentMethods = lazy(() => import("./pages/PaymentMethods"));
const Banners = lazy(() => import("./pages/Banners"));
const News = lazy(() => import("./pages/News"));
const SocialLinks = lazy(() => import("./pages/SocialLinks"));
const Providers = lazy(() => import("./pages/Providers"));
const ProviderProducts = lazy(() => import("./pages/ProviderProducts"));
const Coupons = lazy(() => import("./pages/Coupons"));
const VipMemberships = lazy(() => import("./pages/VipMemberships"));
const AutoCodes = lazy(() => import("./pages/AutoCodes"));
const OrderMessages = lazy(() => import("./pages/OrderMessages"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Admins = lazy(() => import("./pages/Admins"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const Settings = lazy(() => import("./pages/Settings"));
const Theme = lazy(() => import("./pages/Theme"));
const Reports = lazy(() => import("./pages/Reports"));
const Backup = lazy(() => import("./pages/Backup"));
const Tickets = lazy(() => import("./pages/Tickets"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const TwoFactor = lazy(() => import("./pages/TwoFactor"));
const Permissions = lazy(() => import("./pages/Permissions"));
const Currencies = lazy(() => import("./pages/Currencies"));
const Languages = lazy(() => import("./pages/Languages"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const ProviderReports = lazy(() => import("./pages/ProviderReports"));
const ApiProducts = lazy(() => import("./pages/ApiProducts"));
const CurrencySettings = lazy(() => import("./pages/CurrencySettings"));
const CacheManagement = lazy(() => import("./pages/CacheManagement"));
const CronJobs = lazy(() => import("./pages/CronJobs"));
const ProductPageSettings = lazy(() => import("./pages/ProductPageSettings"));
const AboutSettings = lazy(() => import("./pages/AboutSettings"));
const ContactSettings = lazy(() => import("./pages/ContactSettings"));
const DepositSettings = lazy(() => import("./pages/DepositSettings"));
const AuthPagesSettings = lazy(() => import("./pages/AuthPagesSettings"));
const IdentityVerifications = lazy(() => import("./pages/IdentityVerifications"));
const InterfaceSwitcher = lazy(() => import("./pages/InterfaceSwitcher"));

function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4" dir="rtl">
      <div className="w-10 h-10 border-3 border-[#C8A45C]/20 border-t-[#C8A45C] rounded-full animate-spin" />
      <p className="text-xs text-zinc-400 font-medium tracking-wide">جاري تحميل الصفحة...</p>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    loadAndApplyAdminTheme();

    const handleThemeStorage = (e: StorageEvent) => {
      if (e.key === "xpay_theme_updated" || e.key === "theme_settings") {
        loadAndApplyAdminTheme();
      }
    };
    const handleCustomTheme = () => {
      loadAndApplyAdminTheme();
    };

    window.addEventListener("storage", handleThemeStorage);
    window.addEventListener("xpay_theme_change", handleCustomTheme);

    return () => {
      window.removeEventListener("storage", handleThemeStorage);
      window.removeEventListener("xpay_theme_change", handleCustomTheme);
    };
  }, []);

  useEffect(() => {
    get("/me")
      .then((u) => {
        if (u && (u.id || u.username)) {
          setMe(u);
          setAuth("in");
        } else {
          setAuth("out");
        }
      })
      .catch(() => setAuth("out"));
  }, []);

  if (auth === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1A1A1A] text-[#C8A45C] gap-3" dir="rtl">
        <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide">جاري تحميل لوحة التحكم...</span>
      </div>
    );
  }

  if (auth === "out") {
    return (
      <ErrorBoundary>
        <Login
          onSuccess={(u) => {
            setMe(u);
            setAuth("in");
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-center" richColors theme="dark" closeButton />
      <Layout
        me={me}
        onLogout={() => {
          setMe(null);
          setAuth("out");
        }}
      >
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/deposits" element={<Deposits />} />
            <Route path="/users" element={<Users />} />
            <Route path="/identity-verifications" element={<IdentityVerifications />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/product-groups" element={<ProductGroups />} />
            <Route path="/products" element={<Products />} />
            <Route path="/payment-methods" element={<PaymentMethods />} />
            <Route path="/admin/payment-methods" element={<Navigate to="/payment-methods" replace />} />
            <Route path="/banners" element={<Banners />} />
            <Route path="/promotions" element={<Navigate to="/banners" replace />} />
            <Route path="/news" element={<News />} />
            <Route path="/social-links" element={<SocialLinks />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/providers/:id/products" element={<ProviderProducts />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/vip" element={<VipMemberships />} />
            <Route path="/auto-codes" element={<AutoCodes />} />
            <Route path="/order-messages" element={<OrderMessages />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/admin/admins" element={<Navigate to="/admins" replace />} />
            <Route path="/activity" element={<ActivityLog />} />
            <Route path="/interface-switcher" element={<InterfaceSwitcher />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/theme" element={<Theme />} />
            <Route path="/auth-pages-settings" element={<AuthPagesSettings />} />
            <Route path="/auth-settings" element={<AuthPagesSettings />} />
            <Route path="/product-page-settings" element={<ProductPageSettings />} />
            <Route path="/about-settings" element={<AboutSettings />} />
            <Route path="/contact-settings" element={<ContactSettings />} />
            <Route path="/deposit-settings" element={<Navigate to="/payment-methods" replace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/support" element={<Tickets />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/profile" element={<Profile me={me} />} />
            <Route path="/2fa" element={<TwoFactor me={me} />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/currency" element={<CurrencySettings />} />
            <Route path="/currencies" element={<Navigate to="/currency" replace />} />
            <Route path="/cron-jobs" element={<CronJobs />} />
            <Route path="/cron" element={<Navigate to="/cron-jobs" replace />} />
            <Route path="/cache" element={<CacheManagement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

