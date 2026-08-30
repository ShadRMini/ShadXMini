import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  Home,
  ListOrdered,
  Plus,
  Heart,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPublicJson } from "@/lib/public-api";
import NotificationBellDropdown from "./NotificationBellDropdown";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string>("");
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-[var(--theme-background,#1A1A1A)] text-[var(--theme-text-primary,#FFFFFF)] flex transition-colors duration-200" dir="rtl">
      {/* Desktop Sidebar (visible on lg and above screens) */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 border-l border-zinc-800/80 dark:border-zinc-800 z-30 shadow-2xl shrink-0 bg-[var(--theme-background,#1A1A1A)]">
        <Sidebar brandLogo={brandLogo} />
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
          <div className="fixed inset-y-0 right-0 max-w-[300px] w-full bg-[var(--theme-background,#1A1A1A)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
            <Sidebar brandLogo={brandLogo} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8 bg-[var(--theme-background,#1A1A1A)]">
        {/* Mobile / Top Header Bar */}
        <header className="sticky top-0 z-20 bg-[var(--theme-background,#1A1A1A)]/95 backdrop-blur-md border-b border-[#C8A45C]/30 px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl text-[#FDE68A] hover:bg-zinc-800/60 border border-[#C8A45C]/30 transition active:scale-95 cursor-pointer"
              aria-label="فتح القائمة الجانبية"
            >
              <Menu size={22} className="text-[#C8A45C]" />
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] text-[#C8A45C] font-black flex items-center justify-center text-sm border border-[#C8A45C]/50 shadow-xs">
                    SM
                  </div>
                  <span className="font-extrabold text-base text-white tracking-wide">
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
                  <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-[#C8A45C]/40 px-3 py-1.5 rounded-full cursor-pointer hover:border-[#C8A45C] hover:bg-zinc-800 transition shadow-xs">
                    <span className="text-[11px] font-bold text-zinc-300">الرصيد:</span>
                    <span className="text-xs font-black text-[#FDE68A]">
                      ${Number(user.balanceUsd || 0).toFixed(2)}
                    </span>
                    <Plus size={13} className="text-[#C8A45C]" />
                  </div>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <button className="bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-black text-xs px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer transition">
                  دخول
                </button>
              </Link>
            )}
          </div>
        </header>

        {/* Content View Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </main>
      </div>

      {/* Bottom Floating Navigation Bar (Mobile / Tablet Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--theme-background,#1A1A1A)]/95 backdrop-blur-xl border-t border-[#C8A45C]/30 pb-safe z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
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
