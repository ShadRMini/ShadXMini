import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  X,
  Home,
  Trophy,
  ShoppingCart,
  HeadphonesIcon,
  Heart,
  CreditCard,
  Wallet,
  Info,
  Settings,
  LogOut,
  Crown,
  ChevronLeft,
  Bell,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { getStoreThemeMode, setStoreThemeMode, toggleStoreThemeMode, applyStoreTheme } from "@/lib/theme";
import { getPublicJson } from "@/lib/public-api";
import { toast } from "sonner";

interface SidebarProps {
  brandLogo?: string;
  onClose?: () => void;
}

export default function Sidebar({ brandLogo, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { user, token, logout } = useAuth();
  const storeSettings = useStoreSettings();
  const [mode, setMode] = useState<"dark" | "light">(() => getStoreThemeMode());

  const isGuestModeEnabled = Boolean(
    storeSettings.guestPreviewEnabled ?? storeSettings.guest_preview_enabled ?? true
  );
  const isGuest = !user && !token && isGuestModeEnabled;

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (isGuest && href !== "/") {
      e.preventDefault();
      if (onClose) onClose();
      try {
        sessionStorage.setItem("redirect_after_login", href);
      } catch {
        // Ignore
      }
      toast.info("يرجى تسجيل الدخول أو إنشاء حساب للاستمرار");
      setLocation("/login");
    } else {
      if (onClose) onClose();
    }
  };

  useEffect(() => {
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: "dark" | "light" }>;
      if (customEvent.detail?.mode) {
        setMode(customEvent.detail.mode);
      } else {
        setMode(getStoreThemeMode());
      }
    };

    window.addEventListener("xpay_theme_mode_changed", handleModeChange);
    window.addEventListener("storage", handleModeChange);
    return () => {
      window.removeEventListener("xpay_theme_mode_changed", handleModeChange);
      window.removeEventListener("storage", handleModeChange);
    };
  }, []);

  const handleToggleMode = () => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setStoreThemeMode(nextMode);
    applyStoreTheme({ mode: nextMode });
    setMode(nextMode);
  };

  const isDark = mode === "dark";

  // Unread notifications count
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await getPublicJson<{ count: number }>("/me/notifications/unread-count");
        setUnreadNotifications(Number(res?.count || 0));
      } catch {
        // Ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const allSidebarLinks = [
    { href: "/", label: "الرئيسية", icon: Home, guestAllowed: true },
    { href: "/loyalty", label: "المستويات", icon: Trophy, guestAllowed: false },
    { href: "/favorites", label: "مفضلتي", icon: Heart, guestAllowed: false },
    { href: "/orders", label: "مشترياتي", icon: ShoppingCart, guestAllowed: false },
    { href: "/deposits", label: "دفعاتي المالية", icon: CreditCard, guestAllowed: false },
    { href: "/deposit", label: "المحفظة", icon: Wallet, guestAllowed: false },
    { href: "/identity-verification", label: "توثيق الهوية", icon: ShieldCheck, guestAllowed: false },
    { href: "/settings", label: "إعدادات الحساب", icon: Settings, guestAllowed: false },
    {
      href: "/notifications",
      label: "الإشعارات والتنبيهات",
      icon: Bell,
      guestAllowed: false,
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
    { href: "/support", label: "تواصل معنا (الدعم)", icon: HeadphonesIcon, guestAllowed: true },
    { href: "/about", label: "من نحن", icon: Info, guestAllowed: true },
  ];

  // For unauthenticated guest preview mode, only show allowed links (Home, Support, About)
  const sidebarLinks = isGuest
    ? allSidebarLinks.filter((link) => link.guestAllowed)
    : allSidebarLinks;

  const vipLevel = user?.vipLevel || 1;
  const isVip = vipLevel > 1;
  const vipBadgeName =
    user?.vipBadge?.name || (vipLevel >= 4 ? "SVIP" : vipLevel === 3 ? "VIP3" : vipLevel === 2 ? "VIP2" : "VIP1");

  const displayName = user?.username || "عضو";
  const displayId = user?.displayId || user?.telegramId || "---";

  return (
    <div
      className="flex flex-col h-full select-none transition-colors"
      style={{
        backgroundColor: "var(--theme-sidebar-bg, var(--theme-background, #1A1A1A))",
        color: "var(--theme-text-primary, #FFFFFF)",
      }}
    >
      {/* Header / Brand */}
      <div
        className={`p-5 border-b flex items-center justify-between min-h-[72px] ${onClose ? "justify-between" : ""}`}
        style={{
          borderColor: "var(--theme-border, rgba(200, 164, 92, 0.2))",
        }}
      >
        {/* Brand Logo & Name - Hidden on mobile (<768px), visible on md/lg and desktop */}
        <Link href="/" className="hidden md:flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={storeSettings.siteName || "ShadMini"}
              className="store-brand-logo object-contain rounded-xl transition-all duration-200"
              style={{
                height: "var(--theme-logo-size, 80px)",
                maxHeight: "56px",
                maxWidth: "200px",
                width: "auto",
              }}
            />
          ) : (
            <span 
              className="text-xl font-black tracking-wide"
              style={{ color: "var(--theme-accent, #FDE68A)" }}
            >
              {storeSettings.siteName || "ShadMini"}
            </span>
          )}
        </Link>
        {onClose && (
          <div className="flex items-center justify-between w-full md:w-auto">
            <span className="text-sm font-bold md:hidden" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>
              القائمة
            </span>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-xl transition cursor-pointer"
              style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
              aria-label="إغلاق القائمة"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {/* User Info Card */}
      {user ? (
        <div
          className="p-4 mx-3 my-3 rounded-2xl border transition-colors shadow-sm"
          style={{
            backgroundColor: "var(--theme-card, #2D2D2D)",
            borderColor: "var(--theme-border, rgba(200, 164, 92, 0.2))",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-12 h-12 rounded-2xl object-cover border shadow-md"
                  style={{ borderColor: "var(--theme-border, rgba(200, 164, 92, 0.4))" }}
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-2xl font-black flex items-center justify-center text-xl shadow-md"
                  style={{
                    backgroundColor: "var(--theme-primary, #C8A45C)",
                    color: "#1A1A1A",
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {isVip && (
                <div className="absolute -top-1 -right-1 bg-amber-400 text-black p-0.5 rounded-full shadow-xs">
                  <Crown size={12} className="fill-black" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold truncate"
                  style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
                >
                  {displayName}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    vipLevel >= 4
                      ? "bg-amber-400 text-zinc-950 shadow-xs"
                      : vipLevel === 3
                      ? "bg-yellow-400 text-zinc-950"
                      : vipLevel === 2
                      ? "bg-blue-400 text-zinc-950"
                      : isDark
                      ? "bg-zinc-700 text-zinc-300"
                      : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {vipBadgeName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>
                <span>المعرف:</span>
                <span className="font-mono font-semibold" style={{ color: "var(--theme-primary, #C8A45C)" }}>
                  {displayId}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Balance */}
          <div
            className="mt-3 pt-3 border-t flex items-center justify-between text-xs"
            style={{ borderColor: "var(--theme-border, rgba(200, 164, 92, 0.15))" }}
          >
            <span className="font-medium" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>الرصيد المتاح:</span>
            <span className="text-sm font-extrabold" style={{ color: "var(--theme-accent, var(--theme-primary, #C8A45C))" }}>
              ${Number(user.balanceUsd || 0).toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="p-4 mx-3 my-3 rounded-2xl border text-center transition-colors shadow-sm"
          style={{
            backgroundColor: "var(--theme-card, #2D2D2D)",
            borderColor: "var(--theme-border, rgba(200, 164, 92, 0.2))",
          }}
        >
          <p className="text-xs mb-3" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>
            سجل الدخول للوصول لكافة الميزات
          </p>
          <div className="flex gap-2">
            <Link href="/login" className="flex-1" onClick={() => onClose && onClose()}>
              <button 
                className="w-full font-bold text-xs py-2 rounded-xl transition cursor-pointer shadow-sm"
                style={{
                  backgroundColor: "var(--theme-primary, #C8A45C)",
                  color: "#1A1A1A",
                }}
              >
                {storeSettings.guestPreviewLoginButton || "تسجيل الدخول"}
              </button>
            </Link>
            <Link href="/register" className="flex-1" onClick={() => onClose && onClose()}>
              <button
                className="w-full font-bold text-xs py-2 rounded-xl border transition cursor-pointer"
                style={{
                  backgroundColor: "var(--theme-background, #1A1A1A)",
                  borderColor: "var(--theme-border, rgba(200, 164, 92, 0.3))",
                  color: "var(--theme-text-primary, #FFFFFF)",
                }}
              >
                {storeSettings.guestPreviewRegisterButton || "إنشاء حساب"}
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {sidebarLinks.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && item.href !== "/deposit" && location.startsWith(item.href + "/")) ||
            (item.href === "/deposit" && (location === "/deposit" || location === "/wallet" || location.startsWith("/deposit/") || location.startsWith("/wallet/")));

          return (
            <Link key={item.href} href={item.href} onClick={(e) => handleLinkClick(e, item.href)}>
              <div
                className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none"
                style={{
                  backgroundColor: isActive ? "var(--theme-primary, #C8A45C)" : "transparent",
                  color: isActive ? "#1A1A1A" : "var(--theme-text-primary, #FFFFFF)",
                  fontWeight: isActive ? 700 : 500,
                  boxShadow: isActive ? "0 4px 12px rgba(200, 164, 92, 0.25)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={18}
                    style={{ color: isActive ? "#1A1A1A" : "var(--theme-primary, #C8A45C)" }}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? "#1A1A1A" : "var(--theme-primary, #C8A45C)",
                        color: isActive ? "var(--theme-accent, #FDE68A)" : "#1A1A1A",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronLeft
                    size={16}
                    className={`transition-transform ${
                      isActive ? "opacity-90 -translate-x-1" : "opacity-40"
                    }`}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Dark / Light Mode Switcher & Theme Control Section */}
      <div
        className="p-3 border-t"
        style={{
          borderColor: "var(--theme-border, rgba(200, 164, 92, 0.2))",
          backgroundColor: "var(--theme-card, rgba(255, 255, 255, 0.03))",
        }}
      >
        <div
          onClick={handleToggleMode}
          className="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none shadow-xs"
          style={{
            backgroundColor: "var(--theme-card, #2D2D2D)",
            borderColor: "var(--theme-border, rgba(200, 164, 92, 0.25))",
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggleMode();
            }
          }}
          aria-label={isDark ? "تبديل إلى الوضع الفاتح" : "تبديل إلى الوضع الداكن"}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(200, 164, 92, 0.15)",
                color: "var(--theme-primary, #C8A45C)",
              }}
            >
              {isDark ? <Moon size={17} style={{ color: "var(--theme-primary, #C8A45C)" }} /> : <Sun size={17} style={{ color: "var(--theme-primary, #C8A45C)" }} />}
            </div>
            <div>
              <div
                className="text-xs font-bold"
                style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
              >
                {isDark ? "الوضع الداكن" : "الوضع الفاتح"}
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--theme-text-muted, #9CA3AF)" }}
              >
                {isDark ? "انقر للتبديل للوضع الفاتح" : "انقر للتبديل للوضع الداكن"}
              </div>
            </div>
          </div>

          {/* Toggle Switch Component */}
          <div
            className="w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300"
            style={{
              backgroundColor: isDark ? "var(--theme-primary, #C8A45C)" : "#D1D5DB",
            }}
          >
            <div
              className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                isDark ? "translate-x-0 bg-zinc-950" : "-translate-x-5 bg-white"
              }`}
            >
              {isDark ? (
                <Moon size={9} style={{ color: "var(--theme-accent, #FDE68A)" }} />
              ) : (
                <Sun size={9} className="text-amber-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Logout */}
      {user && (
        <div
          className={`p-3 border-t ${
            isDark ? "border-zinc-800" : "border-zinc-200"
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-900/30 transition cursor-pointer"
          >
            <LogOut size={17} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  );
}
