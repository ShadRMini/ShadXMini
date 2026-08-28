import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  Home,
  ListOrdered,
  History,
  HeadphonesIcon,
  Plus,
  Heart,
  Wallet,
  Info,
  User,
  Settings,
  LogOut,
  Shield,
  Crown,
  ChevronLeft,
  Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPublicJson } from "@/lib/public-api";
import AnnouncementBar from "./AnnouncementBar";
import NotificationBellDropdown from "./NotificationBellDropdown";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string>("");
  const { user, logout } = useAuth();

  useEffect(() => {
    let active = true;

    getPublicJson<{
      brandLogoUrl?: string;
      brand_logo_url?: string;
      siteLogo?: string;
      site_logo?: string;
    }>("/settings/public")
      .then((data) => {
        if (active) {
          const logo = (data?.brandLogoUrl || data?.brand_logo_url || data?.siteLogo || data?.site_logo || "").trim();
          if (logo) setBrandLogo(logo);
        }
      })
      .catch(() => {
        // Fallback to app-settings
        getPublicJson<{
          brandLogoUrl?: string;
          brand_logo_url?: string;
          siteLogo?: string;
          site_logo?: string;
        }>("/app-settings")
          .then((data) => {
            if (active) {
              const logo = (data?.brandLogoUrl || data?.brand_logo_url || data?.siteLogo || data?.site_logo || "").trim();
              if (logo) setBrandLogo(logo);
            }
          })
          .catch(() => {});
      });

    return () => {
      active = false;
    };
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [drawerOpen]);

  const bottomNavItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/orders", label: "طلباتي", icon: ListOrdered },
    { href: "/deposit", label: "شحن", icon: Plus, isFab: true },
    { href: "/favorites", label: "مفضلتي", icon: Heart },
    { href: "/profile", label: "حسابي", icon: User },
  ];

  const sidebarLinks = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/notifications", label: "التنبيهات والإشعارات", icon: Bell },
    { href: "/favorites", label: "مفضلتي", icon: Heart },
    { href: "/deposit", label: "إضافة رصيد (شحن)", icon: Plus },
    { href: "/deposits", label: "سجل الدفعات والمحفظة", icon: Wallet },
    { href: "/orders", label: "سجل طلباتي", icon: ListOrdered },
    { href: "/profile", label: "الملف الشخصي", icon: User },
    { href: "/settings", label: "إعدادات الحساب", icon: Settings },
    { href: "/support", label: "تواصل معنا (الدعم)", icon: HeadphonesIcon },
    { href: "/about", label: "من نحن", icon: Info },
  ];

  const vipLevel = user?.vipLevel || 1;
  const isVip = vipLevel > 1;

  const vipBadgeName =
    user?.vipBadge?.name || (vipLevel >= 4 ? "SVIP" : vipLevel === 3 ? "VIP3" : vipLevel === 2 ? "VIP2" : "VIP1");

  const displayName = user?.username || "عضو ShadMini";
  const displayId = user?.displayId || user?.telegramId || "---";

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#1A1A1A] text-white select-none">
      {/* Header / Brand */}
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt="ShadMini"
              onError={() => setBrandLogo("")}
              className="h-10 max-w-[140px] object-contain rounded-xl"
            />
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-[#C8A45C] text-[#1A1A1A] font-black flex items-center justify-center text-lg shadow-md shadow-[#C8A45C]/25">
                SM
              </div>
              <div>
                <div className="text-lg font-black text-[#C8A45C] tracking-wide">ShadMini</div>
              </div>
            </>
          )}
        </Link>
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden text-zinc-400 hover:text-[#C8A45C] p-1.5 rounded-xl hover:bg-zinc-800 transition"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Info Card */}
      {user ? (
        <div className="p-4 mx-3 my-3 rounded-2xl bg-zinc-900/90 border border-zinc-800">
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
                <span className="text-sm font-bold text-white truncate">{displayName}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    vipLevel >= 4
                      ? "bg-amber-400 text-zinc-950 shadow-xs"
                      : vipLevel === 3
                      ? "bg-yellow-400 text-zinc-950"
                      : vipLevel === 2
                      ? "bg-blue-400 text-zinc-950"
                      : "bg-zinc-700 text-zinc-300"
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
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">الرصيد المتاح:</span>
            <span className="text-sm font-extrabold text-[#C8A45C]">
              ${Number(user.balanceUsd || 0).toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 mx-3 my-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center">
          <p className="text-xs text-zinc-400 mb-3">سجل الدخول للوصول لكافة الميزات</p>
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <button className="w-full bg-[#C8A45C] text-[#1A1A1A] font-bold text-xs py-2 rounded-xl">
                دخول
              </button>
            </Link>
            <Link href="/register" className="flex-1">
              <button className="w-full bg-zinc-800 text-white font-bold text-xs py-2 rounded-xl border border-zinc-700">
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
                    : "text-zinc-200 hover:bg-[#C8A45C]/15 hover:text-[#C8A45C] active:scale-[0.98] active:bg-[#C8A45C]/20"
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
                  className={`opacity-40 transition-transform ${isActive ? "opacity-90 -translate-x-1" : ""}`}
                />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      {user && (
        <div className="p-3 border-t border-zinc-800">
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

  return (
    <div className="min-h-screen bg-[#F5F2EB] flex" dir="rtl">
      {/* Desktop Sidebar (visible on lg and above screens) */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 border-l border-zinc-800 z-30 shadow-2xl shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Mobile / Tablet Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sliding Drawer Container (RTL from right) */}
          <div className="fixed inset-y-0 right-0 max-w-[300px] w-full bg-[#1A1A1A] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Mobile / Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#D1D5DB] px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-[#111827] hover:bg-slate-100 border border-slate-200 transition active:scale-95"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu size={22} className="text-[#1A1A1A]" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt="ShadMini"
                  onError={() => setBrandLogo("")}
                  className="h-8 max-w-[120px] object-contain rounded-lg"
                />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-[#C8A45C] font-black flex items-center justify-center text-sm border border-[#C8A45C]/40">
                    SM
                  </div>
                  <span className="font-extrabold text-base text-[#111827] tracking-wide">
                    Shad<span className="text-[#C8A45C]">Mini</span>
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Quick Profile / Balance pill / Notification Bell */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBellDropdown />

                <Link href="/deposit">
                  <div className="flex items-center gap-1.5 bg-[#F5F2EB] border border-[#C8A45C]/40 px-3 py-1.5 rounded-full cursor-pointer hover:border-[#C8A45C] transition">
                    <span className="text-[11px] font-bold text-slate-600">الرصيد:</span>
                    <span className="text-xs font-black text-[#C8A45C]">
                      ${Number(user.balanceUsd || 0).toFixed(2)}
                    </span>
                    <Plus size={13} className="text-[#C8A45C]" />
                  </div>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <button className="bg-[#C8A45C] text-[#1A1A1A] font-bold text-xs px-3.5 py-1.5 rounded-full shadow-xs">
                  دخول
                </button>
              </Link>
            )}
          </div>
        </header>

        {/* Top Announcement / News Bar */}
        <AnnouncementBar />

        {/* Content View Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </main>
      </div>

      {/* Bottom Floating Navigation Bar (Mobile / Tablet Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-[#C8A45C]/30 pb-safe z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const isActive =
              location === item.href || (item.href !== "/" && location.startsWith(item.href));

            if (item.isFab) {
              return (
                <Link key={item.href} href={item.href}>
                  <div className="relative -top-5 flex flex-col items-center justify-center cursor-pointer group">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                        isActive
                          ? "bg-[#C8A45C] text-[#1A1A1A] shadow-[#C8A45C]/50 scale-105"
                          : "bg-[#C8A45C] text-[#1A1A1A] hover:bg-[#B8954A] shadow-[#C8A45C]/30"
                      }`}
                    >
                      <item.icon className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] mt-1 font-bold text-[#C8A45C]">{item.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <div className="flex flex-col items-center justify-center w-14 h-full cursor-pointer group">
                  <div
                    className={`p-1.5 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-[#C8A45C]/20 text-[#C8A45C]" : "text-zinc-400 group-hover:text-[#C8A45C]"
                    }`}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 transition-colors ${
                      isActive ? "text-[#C8A45C] font-extrabold" : "text-zinc-400 font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
