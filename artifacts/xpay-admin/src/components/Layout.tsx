import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { get, post } from "../lib/api";
import {
  LayoutDashboard, ShoppingCart, Wallet, Users, FolderTree, Package,
  CreditCard, Image as ImageIcon, Megaphone, Share2, Server, Ticket,
  Crown, KeyRound, MessageSquare, Code2, Bell, ShieldCheck, Activity,
  Settings as SettingsIcon, Palette, BarChart3, Database, User as UserIcon,
  Lock, Globe, Languages as LangIcon, PowerOff, LogOut, Menu, X, Moon, Sun,
  CheckCircle2, ArrowRight, ExternalLink
} from "lucide-react";

interface QuickNotification {
  id: number;
  title: string | null;
  content: string;
  targetType: string;
  createdAt: string;
}

const NAV: { to: string; label: string; icon: any; group: string }[] = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard, group: "عام" },
  { to: "/orders", label: "الطلبات", icon: ShoppingCart, group: "العمليات" },
  { to: "/deposits", label: "الإيداعات", icon: Wallet, group: "العمليات" },
  { to: "/users", label: "المستخدمون", icon: Users, group: "العمليات" },
  { to: "/tickets", label: "تذاكر الدعم", icon: Ticket, group: "العمليات" },

  { to: "/categories", label: "الأقسام", icon: FolderTree, group: "المتجر" },
  { to: "/product-groups", label: "مجموعات المنتجات", icon: FolderTree, group: "المتجر" },
  { to: "/products", label: "المنتجات", icon: Package, group: "المتجر" },
  { to: "/payment-methods", label: "طرق الدفع", icon: CreditCard, group: "المتجر" },
  { to: "/banners", label: "البانرات", icon: ImageIcon, group: "المتجر" },
  { to: "/news", label: "الأخبار", icon: Megaphone, group: "المتجر" },
  { to: "/social-links", label: "الروابط الاجتماعية", icon: Share2, group: "المتجر" },

  { to: "/providers", label: "المزودون", icon: Server, group: "التكامل" },
  { to: "/auto-codes", label: "الأكواد التلقائية", icon: KeyRound, group: "التكامل" },
  { to: "/order-messages", label: "رسائل الطلبات", icon: MessageSquare, group: "التكامل" },
  { to: "/api-keys", label: "مفاتيح API", icon: Code2, group: "التكامل" },

  { to: "/notifications", label: "الإشعارات والتنبيهات", icon: Bell, group: "التسويق" },
  { to: "/coupons", label: "كوبونات الخصم", icon: Ticket, group: "التسويق" },
  { to: "/vip", label: "عضويات VIP", icon: Crown, group: "التسويق" },

  { to: "/admins", label: "المشرفون", icon: ShieldCheck, group: "النظام" },
  { to: "/permissions", label: "الصلاحيات", icon: Lock, group: "النظام" },
  { to: "/activity", label: "سجل النشاط", icon: Activity, group: "النظام" },
  { to: "/reports", label: "التقارير", icon: BarChart3, group: "النظام" },
  { to: "/backup", label: "النسخ الاحتياطي", icon: Database, group: "النظام" },

  { to: "/settings", label: "الإعدادات العامة", icon: SettingsIcon, group: "الإعدادات" },
  { to: "/theme", label: "تخصيص التصميم", icon: Palette, group: "الإعدادات" },
  { to: "/currencies", label: "العملات", icon: Globe, group: "الإعدادات" },
  { to: "/languages", label: "اللغات", icon: LangIcon, group: "الإعدادات" },
  { to: "/maintenance", label: "وضع الصيانة", icon: PowerOff, group: "الإعدادات" },

  { to: "/profile", label: "الملف الشخصي", icon: UserIcon, group: "حسابي" },
  { to: "/2fa", label: "التحقق الثنائي", icon: ShieldCheck, group: "حسابي" },
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
        if (active) {
          const logo = (data?.brandLogoUrl || data?.brand_logo_url || data?.siteLogo || data?.site_logo || "").trim();
          if (logo) setBrandLogo(logo);
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
    <div className="flex min-h-screen bg-[#F5F2EB]" dir="rtl">
      <aside
        className={`fixed lg:static z-40 inset-y-0 right-0 w-72 bg-[#1A1A1A] border-l border-zinc-800 transform transition-transform overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogo ? (
              <img
                src={brandLogo}
                alt="ShadMini"
                onError={() => setBrandLogo("")}
                className="h-10 max-w-[140px] object-contain rounded-xl"
              />
            ) : (
              <div>
                <div className="text-xl font-extrabold text-[#C8A45C] tracking-wide">ShadMini</div>
                <div className="text-xs text-zinc-400 mt-0.5 font-medium">لوحة الإدارة الفاخرة</div>
              </div>
            )}
          </div>
          <button className="lg:hidden text-zinc-400 hover:text-[#C8A45C]" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 space-y-4">
          {Object.entries(groups || {}).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-semibold text-[#C8A45C]/80 px-3 mb-1.5">{group}</div>
              <div className="space-y-0.5">
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.to === "/"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#C8A45C] text-[#1A1A1A] font-bold shadow-md shadow-[#C8A45C]/30"
                          : "text-[#F9FAFB] hover:bg-[#2A2A2A] hover:text-[#C8A45C]"
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

      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#D1D5DB] px-4 lg:px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
          <button className="lg:hidden text-slate-700" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden lg:block text-sm font-medium text-slate-600">مرحبًا بك في لوحة إدارة XPayStore</div>
          <div className="flex items-center gap-3">
            
            {/* Bell Notifications Button with Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`text-slate-600 hover:text-[#C8A45C] p-2.5 rounded-xl border transition-all relative flex items-center justify-center ${
                  showNotifMenu 
                    ? "bg-[#C8A45C]/15 border-[#C8A45C] text-[#C8A45C]" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                }`}
                title="مركز الإشعارات والتنبيهات"
                type="button"
              >
                <Bell size={19} className={unreadCount > 0 ? "text-[#C8A45C]" : "text-slate-600"} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-gradient-to-r from-amber-500 to-[#C8A45C] text-[#1A1A1A] font-extrabold text-[11px] rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNotifMenu && (
                <div className="absolute left-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 bg-[#1A1A1A] text-white rounded-2xl shadow-2xl border border-[#C8A45C]/30 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
                        <Bell size={15} />
                      </div>
                      <span className="font-bold text-sm text-[#F9FAFB]">مركز الإشعارات</span>
                    </div>
                    <span className="text-xs bg-[#C8A45C]/20 text-[#C8A45C] font-bold px-2 py-0.5 rounded-full border border-[#C8A45C]/30">
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
                          className="p-3.5 hover:bg-zinc-800/80 cursor-pointer transition-colors flex items-start gap-3 text-right"
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-[#C8A45C] mt-0.5">
                            <Bell size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-xs text-[#F9FAFB] truncate">
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
                  <div className="p-3 bg-zinc-900 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        setShowNotifMenu(false);
                        navigate("/notifications");
                      }}
                      className="w-full py-2 px-3 bg-gradient-to-r from-[#C8A45C] to-[#b5924b] text-[#1A1A1A] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-md shadow-[#C8A45C]/20"
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
              className="text-slate-500 hover:text-[#C8A45C] p-2.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
              title={darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
              type="button"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="text-sm text-left hidden sm:block">
              <div className="font-bold text-slate-900">{me?.fullName || me?.username}</div>
              <div className="text-xs text-[#C8A45C] font-semibold">{me?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#C8A45C] text-white flex items-center justify-center font-bold shadow-sm">
              {(me?.fullName || me?.username || "?").charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-rose-600 p-2.5 rounded-xl hover:bg-rose-50 border border-slate-200 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto bg-[#F5F2EB]">{children}</main>
      </div>
    </div>
  );
}
