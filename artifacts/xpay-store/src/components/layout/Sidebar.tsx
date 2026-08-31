import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  X,
  Home,
  ListOrdered,
  HeadphonesIcon,
  Plus,
  Heart,
  Wallet,
  Info,
  Settings,
  LogOut,
  Crown,
  ChevronLeft,
  Bell,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getStoreThemeMode, toggleStoreThemeMode } from "@/lib/theme";

interface SidebarProps {
  brandLogo?: string;
  onClose?: () => void;
}

export default function Sidebar({ brandLogo, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<"dark" | "light">(() => getStoreThemeMode());

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
    const next = toggleStoreThemeMode();
    setMode(next);
  };

  const isDark = mode === "dark";

  const sidebarLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/loyalty", label: "المستوى", icon: Crown },
    { href: "/favorites", label: "مفضلتي", icon: Heart },
    { href: "/orders", label: "طلباتي", icon: ListOrdered },
    { href: "/deposits", label: "المحفظة وسجل الدفعات", icon: Wallet },
    { href: "/deposit", label: "شحن الرصيد", icon: Plus },
    { href: "/settings", label: "إعدادات الحساب", icon: Settings },
    { href: "/notifications", label: "الإشعارات والتنبيهات", icon: Bell },
    { href: "/support", label: "تواصل معنا (الدعم)", icon: HeadphonesIcon },
    { href: "/about", label: "من نحن", icon: Info },
  ];

  const vipLevel = user?.vipLevel || 1;
  const isVip = vipLevel > 1;
  const vipBadgeName =
    user?.vipBadge?.name || (vipLevel >= 4 ? "SVIP" : vipLevel === 3 ? "VIP3" : vipLevel === 2 ? "VIP2" : "VIP1");

  const displayName = user?.username || "عضو";
  const displayId = user?.displayId || user?.telegramId || "---";

  return (
    <div
      className={`flex flex-col h-full select-none ${
        isDark ? "bg-[#1A1A1A] text-white" : "bg-[#F8F9FA] text-zinc-900"
      }`}
    >
      {/* Header / Brand */}
      <div
        className={`p-5 border-b flex items-center justify-between min-h-[72px] ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <Link href="/" className="flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt="ShadMini"
              className="store-brand-logo object-contain rounded-xl transition-all duration-200"
              style={{
                height: "var(--theme-logo-size, 80px)",
                maxHeight: "56px",
                maxWidth: "200px",
                width: "auto",
              }}
            />
          ) : null}
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-400 hover:text-[#C8A45C] p-1.5 rounded-xl hover:bg-zinc-800/40 transition cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* User Info Card */}
      {user ? (
        <div
          className={`p-4 mx-3 my-3 rounded-2xl border ${
            isDark
              ? "bg-zinc-900/90 border-zinc-800"
              : "bg-white border-zinc-200 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-12 h-12 rounded-2xl object-cover border border-[#C8A45C]/50 shadow-md bg-zinc-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C8A45C] to-[#B8954A] text-[#1A1A1A] font-black flex items-center justify-center text-xl shadow-md">
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
                  className={`text-sm font-bold truncate ${
                    isDark ? "text-white" : "text-zinc-900"
                  }`}
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
              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                <span>المعرف:</span>
                <span className="font-mono text-[#C8A45C] font-semibold">{displayId}</span>
              </div>
            </div>
          </div>

          {/* Quick Balance */}
          <div
            className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
              isDark ? "border-zinc-800/80" : "border-zinc-100"
            }`}
          >
            <span className="text-zinc-400 font-medium">الرصيد المتاح:</span>
            <span className="text-sm font-extrabold text-[#C8A45C]">
              ${Number(user.balanceUsd || 0).toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div
          className={`p-4 mx-3 my-3 rounded-2xl border text-center ${
            isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
          }`}
        >
          <p className="text-xs text-zinc-400 mb-3">سجل الدخول للوصول لكافة الميزات</p>
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <button className="w-full bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-bold text-xs py-2 rounded-xl transition cursor-pointer">
                دخول
              </button>
            </Link>
            <Link href="/register" className="flex-1">
              <button
                className={`w-full font-bold text-xs py-2 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                    : "bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200"
                }`}
              >
                تسجيل
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
            (item.href === "/deposit" && (location === "/deposit" || location.startsWith("/deposit/")));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none ${
                  isActive
                    ? "bg-[#C8A45C] text-[#1A1A1A] font-bold shadow-md shadow-[#C8A45C]/30"
                    : isDark
                    ? "text-zinc-200 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] active:scale-[0.98]"
                    : "text-zinc-700 hover:bg-[#C8A45C]/15 hover:text-[#B8954A] active:scale-[0.98]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={18}
                    className={isActive ? "text-[#1A1A1A]" : "text-[#C8A45C]"}
                  />
                  <span>{item.label}</span>
                </div>
                <ChevronLeft
                  size={16}
                  className={`opacity-40 transition-transform ${
                    isActive ? "opacity-90 -translate-x-1" : ""
                  }`}
                />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Dark / Light Mode Switcher & Theme Control Section */}
      <div
        className={`p-3 border-t ${
          isDark ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <div
          onClick={handleToggleMode}
          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
            isDark
              ? "bg-[#242424] hover:bg-[#2d2d2d] border-zinc-800 hover:border-[#C8A45C]/50"
              : "bg-white hover:bg-zinc-100 border-zinc-200 hover:border-[#C8A45C]/50 shadow-xs"
          }`}
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isDark
                  ? "bg-amber-400/15 text-[#FDE68A]"
                  : "bg-amber-500/15 text-[#B8954A]"
              }`}
            >
              {isDark ? <Moon size={17} className="text-[#C8A45C]" /> : <Sun size={17} className="text-[#B8954A]" />}
            </div>
            <div>
              <div
                className={`text-xs font-bold ${
                  isDark ? "text-zinc-100" : "text-zinc-800"
                }`}
              >
                {isDark ? "الوضع الداكن" : "الوضع الفاتح"}
              </div>
              <div className="text-[10px] text-zinc-400">
                {isDark ? "انقر للتبديل للوضع الفاتح" : "انقر للتبديل للوضع الداكن"}
              </div>
            </div>
          </div>

          {/* Toggle Switch Component */}
          <div
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
              isDark ? "bg-[#C8A45C]" : "bg-zinc-300"
            }`}
          >
            <div
              className={`bg-zinc-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                isDark ? "translate-x-0" : "-translate-x-5 bg-white"
              }`}
            >
              {isDark ? (
                <Moon size={9} className="text-[#FDE68A]" />
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
            onClick={logout}
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
