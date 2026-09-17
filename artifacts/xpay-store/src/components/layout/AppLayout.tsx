import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  Home,
  ShoppingCart,
  Wallet,
  Heart,
  User,
  Plus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import NotificationBellDropdown from "./NotificationBellDropdown";
import Sidebar from "./Sidebar";
import { toast } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const storeSettings = useStoreSettings();
  const [brandLogo, setBrandLogo] = useState<string>("");
  const { user, token } = useAuth();

  const isGuestModeEnabled = Boolean(
    storeSettings.guestPreviewEnabled ?? storeSettings.guest_preview_enabled ?? true
  );
  const isGuest = !user && !token && isGuestModeEnabled;

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isGuest && href !== "/") {
      e.preventDefault();
      try {
        sessionStorage.setItem("redirect_after_login", href);
      } catch {
        // Ignore
      }
      toast.info("يرجى تسجيل الدخول أو إنشاء حساب للاستمرار");
      setLocation("/login");
    }
  };

  useEffect(() => {
    if (storeSettings.brandLogoUrl) {
      setBrandLogo(storeSettings.brandLogoUrl);
    }
  }, [storeSettings.brandLogoUrl]);

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
    { href: "/orders", label: "مشترياتي", icon: ShoppingCart },
    { href: "/deposit", label: "المحفظة", icon: Wallet, isFab: true },
    { href: "/favorites", label: "مفضلتي", icon: Heart },
    { href: "/profile", label: "حسابي", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#1A1A1A)] text-[var(--text-primary,#FFFFFF)] flex transition-colors duration-200" dir="rtl">
      {/* Desktop Sidebar (visible on lg and above screens) */}
      <aside className="hidden lg:block w-72 h-screen sticky top-0 border-l border-[var(--border-color,rgba(200,164,92,0.25))] z-30 shadow-2xl shrink-0 bg-[var(--bg-primary,#1A1A1A)]">
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
          <div className="fixed inset-y-0 right-0 max-w-[300px] w-full bg-[var(--bg-primary,#1A1A1A)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right border-l border-[var(--border-color,rgba(200,164,92,0.25))]">
            <Sidebar brandLogo={brandLogo} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8 transition-colors"
        style={{
          backgroundColor: "var(--theme-background, var(--bg-primary, #1A1A1A))",
          color: "var(--theme-text-primary, #FFFFFF)",
        }}
      >
        {/* Mobile / Top Header Bar */}
        <header 
          className="sticky top-0 z-20 h-[72px] backdrop-blur-md px-4 flex items-center justify-between shadow-md shrink-0 transition-colors"
          style={{
            backgroundColor: "var(--theme-background, #1A1A1A)",
            borderBottom: "1px solid var(--theme-border, rgba(200,164,92,0.3))",
          }}
        >
          <div className="flex items-center gap-3 h-full">
            {/* Hamburger Button */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 rounded-xl transition active:scale-95 cursor-pointer shrink-0"
              style={{
                backgroundColor: "var(--theme-card, var(--bg-card))",
                border: "1px solid var(--theme-border, rgba(200,164,92,0.3))",
                color: "var(--theme-primary, #C8A45C)",
              }}
              aria-label="فتح القائمة الجانبية"
            >
              <Menu size={22} style={{ color: "var(--theme-primary, #C8A45C)" }} />
            </button>

            <Link href="/" className="flex items-center gap-2.5 h-full py-2">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={storeSettings.siteName || "ShadMini"}
                  onError={() => setBrandLogo("")}
                  className="store-brand-logo object-contain rounded-lg transition-all duration-200"
                  style={{
                    height: "var(--theme-logo-size, 80px)",
                    maxHeight: "52px",
                    maxWidth: "220px",
                    width: "auto",
                  }}
                />
              ) : (
                <span 
                  className="text-lg font-black tracking-wide"
                  style={{ color: "var(--theme-accent, #FDE68A)" }}
                >
                  {storeSettings.siteName || "ShadMini"}
                </span>
              )}
            </Link>
          </div>

          {/* Quick Profile / Balance pill / Notification Bell */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBellDropdown />

                <Link href="/deposit">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition shadow-xs"
                    style={{
                      backgroundColor: "var(--theme-card, var(--bg-card))",
                      border: "1px solid var(--theme-border, rgba(200,164,92,0.4))",
                    }}
                  >
                    <span className="text-[11px] font-bold" style={{ color: "var(--theme-text-muted, #9CA3AF)" }}>الرصيد:</span>
                    <span className="text-xs font-black" style={{ color: "var(--theme-accent, #FDE68A)" }}>
                      ${Number(user.balanceUsd || 0).toFixed(2)}
                    </span>
                    <Plus size={13} style={{ color: "var(--theme-primary, #C8A45C)" }} />
                  </div>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <button 
                    className="font-black text-xs px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer transition"
                    style={{
                      backgroundColor: "var(--theme-primary, #C8A45C)",
                      color: "#1A1A1A",
                    }}
                  >
                    {storeSettings.guestPreviewLoginButton || "تسجيل الدخول"}
                  </button>
                </Link>
                <Link href="/register">
                  <button 
                    className="hidden sm:inline-flex font-bold text-xs px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer transition"
                    style={{
                      backgroundColor: "var(--theme-card, #2D2D2D)",
                      border: "1px solid var(--theme-border, rgba(200,164,92,0.4))",
                      color: "var(--theme-accent, #FDE68A)",
                    }}
                  >
                    {storeSettings.guestPreviewRegisterButton || "إنشاء حساب"}
                  </button>
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Content View Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </main>

        {/* Global Store Footer */}
        <footer 
          className="w-full max-w-7xl mx-auto px-4 py-6 border-t text-center text-xs"
          style={{
            borderColor: "var(--theme-border, rgba(200,164,92,0.15))",
            color: "var(--theme-text-muted, #9CA3AF)",
          }}
        >
          <p className="font-medium">
            جميع الحقوق محفوظة © {new Date().getFullYear()} {storeSettings.siteName || "ShadMini"}
          </p>
        </footer>
      </div>

      {/* Bottom Floating Navigation Bar (Mobile / Tablet Only) */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t pb-safe z-40 shadow-lg"
        style={{
          backgroundColor: "var(--theme-background, #1A1A1A)",
          borderColor: "var(--theme-border, rgba(200,164,92,0.3))",
        }}
      >
        <div className="flex items-center justify-around px-2 h-16 max-w-md mx-auto">
          {bottomNavItems.map((item) => {
            const isActive =
              location === item.href || (item.href !== "/" && location.startsWith(item.href));

            if (item.isFab) {
              return (
                <Link key={item.href} href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                  <div className="relative -top-5 flex flex-col items-center justify-center cursor-pointer group">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                        isActive ? "scale-105" : ""
                      }`}
                      style={{
                        backgroundColor: "var(--theme-primary, #C8A45C)",
                        color: "#1A1A1A",
                      }}
                    >
                      <item.icon className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <span 
                      className="text-[10px] mt-1 font-bold"
                      style={{ color: "var(--theme-primary, #C8A45C)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                <div className="flex flex-col items-center justify-center w-14 h-full cursor-pointer group">
                  <div
                    className="p-1.5 rounded-xl transition-all duration-300"
                    style={{
                      backgroundColor: isActive ? "rgba(200, 164, 92, 0.2)" : "transparent",
                      color: isActive ? "var(--theme-primary, #C8A45C)" : "var(--theme-text-muted, #9CA3AF)",
                    }}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span
                    className="text-[10px] mt-0.5 transition-colors"
                    style={{
                      color: isActive ? "var(--theme-primary, #C8A45C)" : "var(--theme-text-muted, #9CA3AF)",
                      fontWeight: isActive ? 800 : 500,
                    }}
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
