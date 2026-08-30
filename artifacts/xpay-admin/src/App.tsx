import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { get } from "./lib/api";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Deposits from "./pages/Deposits";
import Users from "./pages/Users";
import Categories from "./pages/Categories";
import ProductGroups from "./pages/ProductGroups";
import Products from "./pages/Products";
import PaymentMethods from "./pages/PaymentMethods";
import Banners from "./pages/Banners";
import News from "./pages/News";
import SocialLinks from "./pages/SocialLinks";
import Providers from "./pages/Providers";
import ProviderProducts from "./pages/ProviderProducts";
import Coupons from "./pages/Coupons";
import VipMemberships from "./pages/VipMemberships";
import AutoCodes from "./pages/AutoCodes";
import OrderMessages from "./pages/OrderMessages";
import ApiKeys from "./pages/ApiKeys";
import Notifications from "./pages/Notifications";
import Admins from "./pages/Admins";
import ActivityLog from "./pages/ActivityLog";
import Settings from "./pages/Settings";
import Theme from "./pages/Theme";
import Reports from "./pages/Reports";
import Backup from "./pages/Backup";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Profile from "./pages/Profile";
import TwoFactor from "./pages/TwoFactor";
import Permissions from "./pages/Permissions";
import Currencies from "./pages/Currencies";
import Languages from "./pages/Languages";
import Maintenance from "./pages/Maintenance";
import ProviderReports from "./pages/ProviderReports";
import ApiProducts from "./pages/ApiProducts";
import Promotions from "./pages/Promotions";
import CurrencySettings from "./pages/CurrencySettings";
import CacheManagement from "./pages/CacheManagement";
import CronJobs from "./pages/CronJobs";
import { loadAndApplyAdminTheme } from "./lib/theme";

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
      <Layout
        me={me}
        onLogout={() => {
          setMe(null);
          setAuth("out");
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/deposits" element={<Deposits />} />
          <Route path="/users" element={<Users />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/product-groups" element={<ProductGroups />} />
          <Route path="/products" element={<Products />} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/banners" element={<Banners />} />
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/theme" element={<Theme />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/support" element={<Tickets />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/profile" element={<Profile me={me} />} />
          <Route path="/2fa" element={<TwoFactor />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/currencies" element={<Currencies />} />
          <Route path="/languages" element={<Languages />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/provider-reports" element={<ProviderReports />} />
          <Route path="/api-products" element={<ApiProducts />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/currency" element={<CurrencySettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  );
}
