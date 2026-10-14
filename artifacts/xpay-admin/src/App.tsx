import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { get } from "./lib/api";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { loadAndApplyAdminTheme } from "./lib/theme";
import { Toaster } from "sonner";
import { PermissionsProvider } from "./context/PermissionsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ForbiddenPage from "./pages/ForbiddenPage";

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
      <PermissionsProvider me={me}>
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
              {/* Public routes within admin dashboard */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/profile" element={<Profile me={me} />} />
              <Route path="/403" element={<ForbiddenPage />} />

              {/* Protected routes by Section */}
              <Route path="/orders" element={<ProtectedRoute section="الطلبات"><Orders /></ProtectedRoute>} />
              <Route path="/order-messages" element={<ProtectedRoute section="الطلبات"><OrderMessages /></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute section="الطلبات"><Tickets /></ProtectedRoute>} />
              <Route path="/tickets/:id" element={<ProtectedRoute section="الطلبات"><TicketDetail /></ProtectedRoute>} />
              <Route path="/support" element={<ProtectedRoute section="الطلبات"><Tickets /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute section="الطلبات"><Reports /></ProtectedRoute>} />

              <Route path="/deposits" element={<ProtectedRoute section="الإيداعات"><Deposits /></ProtectedRoute>} />

              <Route path="/users" element={<ProtectedRoute section="المستخدمون"><Users /></ProtectedRoute>} />
              <Route path="/identity-verifications" element={<ProtectedRoute section="المستخدمون"><IdentityVerifications /></ProtectedRoute>} />

              <Route path="/categories" element={<ProtectedRoute section="الأقسام"><Categories /></ProtectedRoute>} />

              <Route path="/product-groups" element={<ProtectedRoute section="المنتجات"><ProductGroups /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute section="المنتجات"><Products /></ProtectedRoute>} />
              <Route path="/auto-codes" element={<ProtectedRoute section="المنتجات"><AutoCodes /></ProtectedRoute>} />

              <Route path="/payment-methods" element={<ProtectedRoute section="طرق الدفع"><PaymentMethods /></ProtectedRoute>} />
              <Route path="/admin/payment-methods" element={<Navigate to="/payment-methods" replace />} />
              <Route path="/deposit-settings" element={<Navigate to="/payment-methods" replace />} />

              <Route path="/banners" element={<ProtectedRoute section="البانرات"><Banners /></ProtectedRoute>} />
              <Route path="/promotions" element={<Navigate to="/banners" replace />} />

              <Route path="/news" element={<ProtectedRoute section="الأخبار"><News /></ProtectedRoute>} />

              <Route path="/providers" element={<ProtectedRoute section="المزودون"><Providers /></ProtectedRoute>} />
              <Route path="/providers/:id/products" element={<ProtectedRoute section="المزودون"><ProviderProducts /></ProtectedRoute>} />
              <Route path="/api-products" element={<ProtectedRoute section="المزودون"><ApiProducts /></ProtectedRoute>} />
              <Route path="/admin/api-products" element={<Navigate to="/api-products" replace />} />
              <Route path="/api-keys" element={<ProtectedRoute section="المزودون"><ApiKeys /></ProtectedRoute>} />
              <Route path="/provider-reports" element={<ProtectedRoute section="المزودون"><ProviderReports /></ProtectedRoute>} />
              <Route path="/admin/provider-reports" element={<Navigate to="/provider-reports" replace />} />

              <Route path="/coupons" element={<ProtectedRoute section="الكوبونات"><Coupons /></ProtectedRoute>} />

              <Route path="/vip" element={<ProtectedRoute section="VIP"><VipMemberships /></ProtectedRoute>} />

              <Route path="/notifications" element={<ProtectedRoute section="الإشعارات"><Notifications /></ProtectedRoute>} />

              <Route path="/admins" element={<ProtectedRoute section="المشرفون"><Admins /></ProtectedRoute>} />
              <Route path="/admin/admins" element={<Navigate to="/admins" replace />} />
              <Route path="/permissions" element={<ProtectedRoute section="المشرفون"><Permissions /></ProtectedRoute>} />

              <Route path="/activity" element={<ProtectedRoute section="سجل النشاط"><ActivityLog /></ProtectedRoute>} />

              <Route path="/backup" element={<ProtectedRoute section="النسخ الاحتياطي"><Backup /></ProtectedRoute>} />

              <Route path="/currency" element={<ProtectedRoute section="الإعدادات"><CurrencySettings /></ProtectedRoute>} />
              <Route path="/currencies" element={<Navigate to="/currency" replace />} />
              <Route path="/languages" element={<ProtectedRoute section="الإعدادات"><Languages /></ProtectedRoute>} />
              <Route path="/admin/languages" element={<Navigate to="/languages" replace />} />
              <Route path="/maintenance" element={<ProtectedRoute section="الإعدادات"><Maintenance /></ProtectedRoute>} />
              <Route path="/admin/maintenance" element={<Navigate to="/maintenance" replace />} />
              <Route path="/cron-jobs" element={<ProtectedRoute section="الإعدادات"><CronJobs /></ProtectedRoute>} />
              <Route path="/cron" element={<Navigate to="/cron-jobs" replace />} />
              <Route path="/cache" element={<ProtectedRoute section="الإعدادات"><CacheManagement /></ProtectedRoute>} />
              <Route path="/interface-switcher" element={<ProtectedRoute section="الإعدادات"><InterfaceSwitcher /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute section="الإعدادات"><Settings /></ProtectedRoute>} />
              <Route path="/theme" element={<ProtectedRoute section="الإعدادات"><Theme /></ProtectedRoute>} />
              <Route path="/auth-pages-settings" element={<Navigate to="/theme?tab=auth" replace />} />
              <Route path="/auth-settings" element={<Navigate to="/theme?tab=auth" replace />} />
              <Route path="/product-page-settings" element={<Navigate to="/theme?tab=product" replace />} />
              <Route path="/about-settings" element={<Navigate to="/theme?tab=about" replace />} />
              <Route path="/contact-settings" element={<Navigate to="/theme?tab=contact" replace />} />
              <Route path="/social-links" element={<ProtectedRoute section="الإعدادات"><SocialLinks /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </PermissionsProvider>
    </ErrorBoundary>
  );
}


