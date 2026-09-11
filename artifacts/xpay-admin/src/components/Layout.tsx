import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { get, post, put } from "../lib/api";
import { toast } from "sonner";
import SidebarLegacy from "./SidebarLegacy";
import SidebarNew from "./SidebarNew";
import {
  Bell, LogOut, Menu, X, Moon, Sun, ArrowRight
} from "lucide-react";

interface QuickNotification {
  id: number;
  title: string | null;
  content: string;
  targetType: string;
  createdAt: string;
}

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

  // Sidebar mode state (Legacy vs New Accordion)
  const [useLegacySidebar, setUseLegacySidebar] = useState<boolean>(() => {
    try {
      return localStorage.getItem("admin_use_legacy_sidebar") === "true";
    } catch {
      return false;
    }
  });
  const [isTogglingSidebar, setIsTogglingSidebar] = useState(false);

  // Fetch use_legacy_sidebar setting from API
  useEffect(() => {
    let active = true;
    get<any>("/admin/settings/use-legacy-sidebar")
      .then((res) => {
        if (active && res && res.value !== undefined) {
          const isLegacy = res.value === "true" || res.value === true || res.useLegacy === true;
          setUseLegacySidebar(isLegacy);
          try {
            localStorage.setItem("admin_use_legacy_sidebar", String(isLegacy));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleToggleSidebarMode = async () => {
    const nextMode = !useLegacySidebar;
    setIsTogglingSidebar(true);
    try {
      setUseLegacySidebar(nextMode);
      try {
        localStorage.setItem("admin_use_legacy_sidebar", String(nextMode));
      } catch {}

      await put("/admin/settings/use-legacy-sidebar", {
        value: nextMode ? "true" : "false",
        useLegacy: nextMode,
      });

      toast.success(
        nextMode
          ? "تم التبديل إلى القائمة الجانبية القديمة (Legacy)"
          : "تم تفعيل القائمة الجانبية الجديدة المنظمة (Accordion) بنجاح"
      );
    } catch (err: any) {
      console.error("Failed to toggle sidebar setting:", err);
      toast.error("فشل حفظ إعداد القائمة الجانبية في الخادم");
    } finally {
      setIsTogglingSidebar(false);
    }
  };

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

  return (
    <div className="flex h-screen overflow-hidden bg-[#1A1A1A] text-white" dir="rtl">
      {useLegacySidebar ? (
        <SidebarLegacy
          open={open}
          setOpen={setOpen}
          brandLogo={brandLogo}
          loginTitle={loginTitle}
          loginSubtitle={loginSubtitle}
          onToggleSidebarMode={handleToggleSidebarMode}
          isToggling={isTogglingSidebar}
        />
      ) : (
        <SidebarNew
          open={open}
          setOpen={setOpen}
          brandLogo={brandLogo}
          loginTitle={loginTitle}
          loginSubtitle={loginSubtitle}
          onToggleSidebarMode={handleToggleSidebarMode}
          isToggling={isTogglingSidebar}
        />
      )}

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
