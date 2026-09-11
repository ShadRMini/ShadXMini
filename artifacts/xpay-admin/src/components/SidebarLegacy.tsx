import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Wallet, Users, FolderTree, Package,
  CreditCard, Image as ImageIcon, Megaphone, Share2, Server, Ticket,
  Crown, KeyRound, MessageSquare, Code2, Bell, ShieldCheck, BadgeCheck, Activity,
  Settings as SettingsIcon, Palette, BarChart3, Database, User as UserIcon,
  Lock, Globe, Languages as LangIcon, PowerOff, X, Sparkles, RefreshCw, Headphones, LogIn
} from "lucide-react";

export interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  brandLogo: string;
  loginTitle: string;
  loginSubtitle: string;
  onToggleSidebarMode: () => void;
  isToggling?: boolean;
}

// Full legacy nav list from the original Layout.tsx
const LEGACY_NAV: { to: string; label: string; icon: any; group: string }[] = [
  // Group 1
  { to: "/", label: "عام", icon: LayoutDashboard, group: "لوحة الإدارة" },
  { to: "/maintenance", label: "وضع الصيانة", icon: PowerOff, group: "لوحة الإدارة" },
  { to: "/news", label: "الأخبار", icon: Megaphone, group: "لوحة الإدارة" },
  { to: "/users", label: "إدارة المستخدمين (إضافة/حذف)", icon: Users, group: "لوحة الإدارة" },
  { to: "/identity-verifications", label: "طلبات توثيق الهوية", icon: BadgeCheck, group: "لوحة الإدارة" },

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
  { to: "/auth-pages-settings", label: "تخصيص صفحات الدخول والتسجيل", icon: LogIn, group: "إعدادات النظام" },
  { to: "/product-page-settings", label: "تخصيص صفحة المنتج", icon: Package, group: "إعدادات النظام" },
  { to: "/about-settings", label: "تخصيص صفحة من نحن", icon: Activity, group: "إعدادات النظام" },
  { to: "/contact-settings", label: "تخصيص صفحة تواصل معنا", icon: Headphones, group: "إعدادات النظام" },
  { to: "/deposit-settings", label: "تخصيص صفحة شحن الرصيد", icon: Wallet, group: "إعدادات النظام" },
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

export default function SidebarLegacy({
  open,
  setOpen,
  brandLogo,
  loginTitle,
  loginSubtitle,
  onToggleSidebarMode,
  isToggling = false,
}: SidebarProps) {
  const groups = (LEGACY_NAV || []).reduce<Record<string, typeof LEGACY_NAV>>((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  return (
    <aside
      className={`fixed lg:static z-40 inset-y-0 right-0 w-72 flex-shrink-0 h-full bg-[#1A1A1A] border-l border-[#C8A45C]/20 transform transition-transform flex flex-col justify-between ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
      dir="rtl"
    >
      {/* Top Header & Brand */}
      <div className="p-5 border-b border-[#C8A45C]/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={loginTitle}
              onError={() => {}}
              className="h-10 max-w-[140px] object-contain rounded-xl"
            />
          ) : (
            <div>
              <div className="text-xl font-extrabold text-[#FDE68A] tracking-wide">{loginTitle}</div>
              <div className="text-xs text-zinc-400 mt-0.5 font-medium">{loginSubtitle}</div>
            </div>
          )}
        </div>
        <button
          className="lg:hidden text-zinc-400 hover:text-[#C8A45C] cursor-pointer"
          onClick={() => setOpen(false)}
          type="button"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Links (Scrollable) */}
      <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
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

      {/* Bottom Switcher: Switch to New Accordion Sidebar */}
      <div className="p-3 border-t border-[#C8A45C]/20 bg-[#141414] flex-shrink-0">
        <button
          onClick={onToggleSidebarMode}
          disabled={isToggling}
          type="button"
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C8A45C]/25 to-[#C8A45C]/10 hover:from-[#C8A45C]/35 hover:to-[#C8A45C]/20 border border-[#C8A45C]/50 text-[#FDE68A] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-sm"
          title="الانتقال إلى القائمة الجانبية الحديثة المنظمة بنظام الأكورديون"
        >
          {isToggling ? (
            <RefreshCw size={15} className="animate-spin text-[#C8A45C]" />
          ) : (
            <Sparkles size={15} className="text-[#C8A45C]" />
          )}
          <span>{isToggling ? "جاري التبديل..." : "تجربة القائمة الجديدة (Accordion)"}</span>
        </button>
        <div className="text-[10px] text-zinc-400 text-center mt-1.5 font-medium">
          الترتيب الكلاسيكي مفعّل حالياً
        </div>
      </div>
    </aside>
  );
}
