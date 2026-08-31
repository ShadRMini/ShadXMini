import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { get, post } from "../lib/api";
import {
  LayoutDashboard, ShoppingCart, Wallet, Users, FolderTree, Package,
  CreditCard, Image as ImageIcon, Megaphone, Share2, Server, Ticket,
  Crown, KeyRound, MessageSquare, Code2, Bell, ShieldCheck, Activity,
  Settings as SettingsIcon, Palette, BarChart3, Database, User as UserIcon,
  Lock, Globe, Languages as LangIcon, PowerOff, LogOut, Menu, X, Moon, Sun,
  CheckCircle2, ArrowRight, ExternalLink, Info
} from "lucide-react";

interface QuickNotification {
  id: number;
  title: string | null;
  content: string;
  targetType: string;
  createdAt: string;
}

const NAV: { to: string; label: string; icon: any; group: string }[] = [
  // Group 1
  { to: "/", label: "عام", icon: LayoutDashboard, group: "لوحة الإدارة" },
  { to: "/maintenance", label: "وضع الصيانة", icon: PowerOff, group: "لوحة الإدارة" },
  { to: "/news", label: "الأخبار", icon: Megaphone, group: "لوحة الإدارة" },
  { to: "/users", label: "إدارة المستخدمين (إضافة/حذف)", icon: Users, group: "لوحة الإدارة" },

  // Group 2
  { to: "/providers", label: "مزود API", icon: Server, group: "إدارة المزودين" },
  { to: "/api-keys", label: "مفتاح API", icon: Code2, group: "إدارة المزودين" },
  { to: "/provider-reports", label: "تقارير المزودين", icon: BarChart3, group: "إدارة المزودين" },

  // Group 3
  { to: "/categories", label: "الأقسام (إضافة/حذف)", icon: FolderTree, group: "الأقسام & المنتجات" },
  { to: "/product-groups", label: "إدارة المجموعات", icon: FolderTree, group: "الأقسام & المنتجات" },
  { to: "/products", label: "المنتجات (إضافة/حذف)", icon: Package, group: "الأقسام & المنتجات" },
  { to: "/banners", label: "البانرات والعروض المميزة", icon: ImageIcon, group: "الأقسام & المنتجات" },
  { to: "/api-products", label: "منتجات عبر API", icon: Server, group: "الأقسام & المنتجات" },
  { to: "/auto-codes", label: "كود", icon: KeyRound, group: "الأقسام & المنتجات" },

  // Group 4
  { to: "/orders", label: "الطلبات", icon: ShoppingCart, group: "الإدارة المالية والتسويق" },
  { to: "/order-messages", label: "قوالب رسائل الطلبات", icon: MessageSquare, group: "الإدارة المالية والتسويق" },
  { to: "/payment-methods", label: "طرق الدفع (إضافة)", icon: CreditCard, group: "الإدارة المالية والتسويق" },
  { to: "/coupons", label: "كوبونات الخصم (إضافة/حذف)", icon: Ticket, group: "الإدارة المالية والتسويق" },
  { to: "/promotions", label: "العروض الترويجية", icon: Megaphone, group: "الإدارة المالية والتسويق" },
  { to: "/vip", label: "عضويات VIP", icon: Crown, group: "الإدارة المالية والتسويق" },
  { to: "/currency", label: "عملة المتجر", icon: Globe, group: "الإدارة المالية والتسويق" },

  // Group 5
  { to: "/settings", label: "الإعدادات العامة", icon: SettingsIcon, group: "إعدادات النظام" },
  { to: "/theme", label: "تخصيص التصميم", icon: Palette, group: "إعدادات النظام" },
  { to: "/product-page-settings", label: "تخصيص صفحة المنتج", icon: Package, group: "إعدادات النظام" },
  { to: "/about-settings", label: "تخصيص صفحة من نحن", icon: Info, group: "إعدادات النظام" },
  { to: "/social-links", label: "الروابط الاجتماعية", icon: Share2, group: "إعدادات النظام" },
  { to: "/notifications", label: "الإشعارات", icon: Bell, group: "إعدادات النظام" },
  { to: "/cache", label: "الذاكرة المؤقتة (مسح الكاش)", icon: Database, group: "إعدادات النظام" },

  // Group 6
  { to: "/activity", label: "سجل النشاط", icon: Activity, group: "الإدارة والصلاحيات" },
  { to: "/reports", label: "التقارير", icon: BarChart3, group: "الإدارة والصلاحيات" },
  { to: "/backup", label: "النسخ الاحتياطي", icon: Database, group: "الإدارة والصلاحيات" },
  { to: "/cron-jobs", label: "المهام المجدولة (Cron)", icon: Activity, group: "الإدارة والصلاحيات" },
  { to: "/permissions", label: "الصلاحيات", icon: Lock, group: "الإدارة والصلاحيات" },
  { to: "/admins", label: "المشرفون (إضافة/حذف)", icon: ShieldCheck, group: "الإدارة والصلاحيات" },
  { to: "/profile", label: "الملف الشخصي", icon: UserIcon, group: "الإدارة والصلاحيات" },
  { to: "/languages", label: "اللغات", icon: LangIcon, group: "الإدارة والصلاحيات" },
  { to: "/2fa", label: "التحقق الثنائي", icon: ShieldCheck, group: "الإدارة والصلاحيات" },
];

export default function Layout({
  children,
  me,
  onLogout,
}: {
  children: React.ReactNode;
  me: any;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("xpay-admin-theme") === "dark");
  const [brandLogo, setBrandLogo] = useState<string>("");
  const [loginTitle, setLoginTitle] = useState("ShadMini");
  const [loginSubtitle, setLoginSubtitle] = useState("لوحة الإدارة الفاخرة");
  const [dashboardWelcome, setDashboardWelcome] = useState("مرحبًا بك في لوحة إدارة ShadMini");
  const [notifications, setNotifications] = useState<QuickNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load public brand settings
  useEffect(() => {
    let active = true;
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    fetch(`${baseUrl}/api/settings/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          const logo = (data?.brandLogoUrl || data?.brand_logo_url || data?.siteLogo || data?.site_logo || "").trim();
          if (logo) setBrandLogo(logo);
          if (data?.adminLoginTitle) setLoginTitle(String(data.adminLoginTitle));
          if (data?.adminLoginSubtitle) setLoginSubtitle(String(data.adminLoginSubtitle));
          if (data?.adminDashboardWelcome) setDashboardWelcome(String(data.adminDashboardWelcome));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Fetch recent notifications for topbar dropdown
  const fetchRecentNotifications = async () => {
    try {
      const data = await get("/admin/notifications");
      if (Array.isArray(data)) {
        setNotifications(data.slice(0, 5));
        setUnreadCount(data.length);
      }
    } catch {
      // ignore in silent polling
    }
  };

  useEffect(() => {
    fetchRecentNotifications();
    const interval = setInterval(fetchRecentNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("admin-dark", darkMode);
    localStorage.setItem("xpay-admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = async () => {
    try {
      await post("/logout");
    } catch {}
    onLogout();
    navigate("/");
  };

  const groups = (NAV || []).reduce<Record<string, typeof NAV>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-screen overflow-hidden bg-[#1A1A1A] text-white" dir="rtl">
      <aside
        className={`fixed lg:static z-40 inset-y-0 right-0 w-72 flex-shrink-0 h-full bg-[#1A1A1A] border-l border-[#C8A45C]/20 transform transition-transform overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt={loginTitle}
                onError={() => setBrandLogo("")}
                className="h-10 max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div>
                <div className="text-xl font-extrabold text-[#FDE68A] tracking-wide">{loginTitle}</div>
                <div className="text-xs text-zinc-400 mt-0.5 font-medium">{loginSubtitle}</div>
              </div>
            )}
          </div>
          <button className="lg:hidden text-zinc-400 hover:text-[#C8A45C] cursor-pointer" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-4">
          {Object.entries(groups || {}).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-bold text-[#C8A45C] px-3 mb-1.5">{group}</div>
              <div className="space-y-0.5">
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === "/"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#C8A45C] text-[#1A1A1A] font-black shadow-md shadow-[#C8A45C]/30"
                          : "text-zinc-300 hover:bg-[#2D2D2D] hover:text-[#FDE68A]"
                      }`
                    }
                  >
                    <it.icon size={18} className="text-[#C8A45C]" />
                    <span>{it.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/70 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="bg-[#1A1A1A] border-b border-[#C8A45C]/20 px-4 lg:px-6 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30 flex-shrink-0">
          <button className="lg:hidden text-[#C8A45C] cursor-pointer" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden lg:block text-sm font-medium text-zinc-300">{dashboardWelcome}</div>
          <div className="flex items-center gap-3">
            
            {/* Bell Notifications Button with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`text-[#C8A45C] hover:text-[#FDE68A] p-2.5 rounded-xl border border-[#C8A45C]/30 transition-all relative flex items-center justify-center cursor-pointer ${
                  showNotifMenu 
                    ? "bg-[#C8A45C]/20 border-[#C8A45C]" 
                    : "bg-[#2D2D2D] hover:bg-[#383838]"
                }`}
                title="مركز الإشعارات والتنبيهات"
                type="button"
              >
                <Bell size={19} className="text-[#C8A45C]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#C8A45C] text-[#1A1A1A] font-black text-[11px] rounded-full flex items-center justify-center ring-2 ring-[#1A1A1A] shadow-xs animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifMenu && (
                <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 bg-[#2D2D2D] text-white rounded-2xl shadow-2xl border border-[#C8A45C]/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="p-4 border-b border-[#C8A45C]/20 flex items-center justify-between bg-[#1A1A1A]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
                        <Bell size={15} />
                      </div>
                      <span className="font-bold text-sm text-[#FDE68A]">مركز الإشعارات</span>
                    </div>
                    <span className="text-xs bg-[#C8A45C]/20 text-[#FDE68A] font-bold px-2 py-0.5 rounded-full border border-[#C8A45C]/35">
                      {unreadCount} إشعار
                    </span>
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/80">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
                        <Bell size={24} className="text-zinc-600 mb-1" />
                        <span>لا توجد إشعارات جديدة حالياً</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotifMenu(false);
                            navigate("/notifications");
                          }}
                          className="p-3.5 hover:bg-[#383838] cursor-pointer transition-colors flex items-start gap-3 text-right"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center shrink-0 text-[#C8A45C] mt-0.5">
                            <Bell size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-[#FDE68A] truncate">
                                {n.title || "إشعار جديد"}
                              </span>
                              <span className="text-[10px] text-zinc-400 shrink-0">
                                {new Date(n.createdAt).toLocaleDateString("ar-EG", {
                                  month: "numeric",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                              {n.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="p-3 bg-[#1A1A1A] border-t border-[#C8A45C]/20">
                    <button
                      onClick={() => {
                        setShowNotifMenu(false);
                        navigate("/notifications");
                      }}
                      className="w-full py-2 px-3 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-[#C8A45C]/20 cursor-pointer"
                    >
                      <span>عرض جميع الإشعارات وإرسال جديد</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setDarkMode((value) => !value)}
              className="text-[#C8A45C] hover:text-[#FDE68A] p-2.5 rounded-xl bg-[#2D2D2D] hover:bg-[#383838] border border-[#C8A45C]/30 transition-colors cursor-pointer"
              title={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              type="button"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="text-sm text-left hidden sm:block">
              <div className="font-bold text-white">{me?.fullName || me?.username}</div>
              <div className="text-xs text-[#C8A45C] font-semibold">{me?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#C8A45C] text-[#1A1A1A] flex items-center justify-center font-bold shadow-sm">
              {(me?.fullName || me?.username || "?").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-rose-400 p-2.5 rounded-xl bg-[#2D2D2D] hover:bg-rose-950/40 border border-[#C8A45C]/20 transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overflow-x-auto min-h-0 bg-[#1A1A1A] text-white">{children}</main>
      </div>
    </div>
  );
}
